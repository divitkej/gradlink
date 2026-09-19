/**
 * Step 2 of the Supabase -> Firebase migration.
 *
 * Reads migration/data/*.json (from export-supabase.mjs) and writes it into
 * Firestore + Firebase Auth using the Admin SDK.
 *
 * Prerequisites:
 *   1. A Firebase project with Firestore and Authentication (Email/Password) enabled.
 *   2. A service account key saved to migration/.private/service-account.json
 *      (Firebase console -> Project settings -> Service accounts -> Generate new private key).
 *
 * Run:  node migration/import-firestore.mjs
 *       node migration/import-firestore.mjs --dry-run      # report only, write nothing
 *       node migration/import-firestore.mjs --storage      # also copy Storage files across
 *
 * The script is idempotent: documents are written with deterministic ids and
 * merge:true, and existing auth users are skipped, so re-running is safe.
 *
 * Central invariant: a user's Auth uid IS their profile id.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, "data");
const PRIVATE = join(HERE, ".private");

const DRY = process.argv.includes("--dry-run");
const DO_STORAGE = process.argv.includes("--storage");

function readJson(path, fallback) {
  if (!existsSync(path)) {
    if (fallback !== undefined) return fallback;
    console.error(`Missing required file: ${path}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

const table = (name) => readJson(join(DATA, `${name}.json`), []);

/* ---------------- init ---------------- */
const keyPath = join(PRIVATE, "service-account.json");
if (!existsSync(keyPath)) {
  console.error(
    `\nMissing ${keyPath}\n\n` +
      `Firebase console -> Project settings -> Service accounts -> Generate new private key,\n` +
      `then save the downloaded JSON to that path.\n`
  );
  process.exit(1);
}
const serviceAccount = readJson(keyPath);
const app = initializeApp({
  credential: cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.firebasestorage.app`,
});
const db = getFirestore(app);
const auth = getAuth(app);

console.log(`Project: ${serviceAccount.project_id}${DRY ? "  (DRY RUN — nothing will be written)" : ""}\n`);

/* ---------------- load ---------------- */
const profiles = table("profiles");
const students = table("students");
const companies = table("companies");
const colleges = table("colleges");
const events = table("events");
const registrations = table("event_registrations");
const scans = table("scans");
const shortlists = table("shortlists");
const messages = table("messages");
const analytics = table("student_event_analytics");
const checklistItems = table("checklist_items");
const checklistProgress = table("checklist_progress");
const orders = table("orders");
const authUsers = readJson(join(PRIVATE, "auth-users.json"), []);

const lower = (s) => (s ?? "").trim().toLowerCase();

/* ---------------- 1. Auth users ---------------- */
/*
 * Every profile gets a Firebase Auth account whose uid equals the profile id.
 * Where we have the original bcrypt hash, the password carries over untouched.
 * Where we don't (accounts created while Supabase auth was failing), the
 * account is created without a password so the user can use "Forgot password"
 * — previously those accounts could not sign in at all.
 */
const hashByEmail = new Map(authUsers.map((u) => [lower(u.email), u]));

const seenEmail = new Set();
const toImport = [];
const skipped = [];

for (const p of profiles) {
  const email = lower(p.email);
  if (!email) {
    skipped.push({ id: p.id, why: "no email" });
    continue;
  }
  if (seenEmail.has(email)) {
    skipped.push({ id: p.id, email, why: "duplicate email — an earlier profile already claimed it" });
    continue;
  }
  seenEmail.add(email);

  const src = hashByEmail.get(email);
  const record = {
    uid: p.id,
    email,
    emailVerified: Boolean(src?.email_confirmed_at),
    displayName: p.full_name || undefined,
    metadata: p.created_at ? { creationTime: new Date(p.created_at).toUTCString() } : undefined,
  };
  if (src?.encrypted_password) {
    record.passwordHash = Buffer.from(src.encrypted_password, "utf8");
  }
  toImport.push(record);
}

const withPassword = toImport.filter((u) => u.passwordHash).length;
console.log("1. Auth users");
console.log(`   ${toImport.length} to import — ${withPassword} keep their password, ${toImport.length - withPassword} must use "Forgot password"`);
skipped.forEach((s) => console.log(`   skipped ${s.email ?? s.id}: ${s.why}`));

if (!DRY && toImport.length) {
  // Supabase stores bcrypt ($2a$). Firebase verifies it natively via BCRYPT.
  const res = await auth.importUsers(toImport, { hash: { algorithm: "BCRYPT" } });
  console.log(`   imported ${res.successCount}, failed ${res.failureCount}`);
  res.errors.forEach((e) => {
    const u = toImport[e.index];
    // "uid already exists" just means the script has been run before.
    console.log(`   ! ${u?.email}: ${e.error.message}`);
  });
}

/* ---------------- 2. Firestore documents ---------------- */
let writes = 0;
let batch = db.batch();
let pending = 0;

async function set(ref, data) {
  writes++;
  if (DRY) return;
  batch.set(ref, data, { merge: true });
  if (++pending >= 400) {
    await batch.commit();
    batch = db.batch();
    pending = 0;
  }
}
async function flush() {
  if (!DRY && pending) await batch.commit();
  batch = db.batch();
  pending = 0;
}

/** Drop undefined and Postgres nulls we don't want to persist as fields. */
function doc(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out;
}

console.log("\n2. Firestore documents");

// profiles
for (const p of profiles) {
  await set(db.doc(`profiles/${p.id}`), doc({
    created_at: p.created_at,
    auth_uid: p.id,
    role: p.role,
    full_name: p.full_name,
    email: p.email,
    email_lower: lower(p.email),
    organization: p.organization ?? null,
    avatar_url: p.avatar_url ?? null,
  }));
}
console.log(`   profiles: ${profiles.length}`);

/** Role rows are keyed by profile id; orphans (no profile) keep their own id. */
function roleDocId(r, label) {
  if (r.profile_id) return r.profile_id;
  console.log(`   ! ${label} ${r.email} has no profile_id — keyed by its own id, no auth account`);
  return r.id;
}

for (const s of students) {
  await set(db.doc(`students/${roleDocId(s, "student")}`), doc({
    created_at: s.created_at,
    profile_id: s.profile_id,
    full_name: s.full_name,
    email: s.email,
    email_lower: lower(s.email),
    university: s.university ?? null,
    degree: s.degree ?? null,
    graduation_year: s.graduation_year ?? null,
    skills: s.skills ?? [],
    resume_url: s.resume_url ?? null,
    portfolio_url: s.portfolio_url ?? null,
    linkedin_url: s.linkedin_url ?? null,
    github_url: s.github_url ?? null,
    bio: s.bio ?? null,
    resume_score: s.resume_score ?? null,
    ai_feedback: s.ai_feedback ?? null,
  }));
}
console.log(`   students: ${students.length}`);

for (const c of companies) {
  await set(db.doc(`companies/${roleDocId(c, "company")}`), doc({
    created_at: c.created_at,
    profile_id: c.profile_id,
    full_name: c.full_name,
    email: c.email,
    email_lower: lower(c.email),
    company: c.company ?? null,
    company_name: c.company_name ?? null,
    sector: c.sector ?? null,
    industry: c.industry ?? null,
    website: c.website ?? null,
    description: c.description ?? null,
    logo_url: c.logo_url ?? null,
    hiring_roles: c.hiring_roles ?? [],
    booth_number: c.booth_number ?? null,
    skills_wanted: c.skills_wanted ?? [],
    brochure_url: c.brochure_url ?? null,
  }));
}
console.log(`   companies: ${companies.length}`);

for (const c of colleges) {
  await set(db.doc(`colleges/${roleDocId(c, "college")}`), doc({
    created_at: c.created_at,
    profile_id: c.profile_id,
    full_name: c.full_name,
    email: c.email,
    email_lower: lower(c.email),
    institution: c.institution ?? null,
  }));
}
console.log(`   colleges: ${colleges.length}`);

/**
 * Events predate the join-code model, so give each imported one a code and an
 * owner. Without a code nobody can join it; without an owner it never appears
 * in a college's "my events" list.
 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const codeFor = (seed) => {
  // Derived from the event id so re-running the import is idempotent.
  let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[h % CODE_ALPHABET.length];
    h = Math.floor(h / CODE_ALPHABET.length) + 7919;
  }
  return out;
};

// Fall back to the first event manager so legacy events have an owner.
const firstManager = profiles.find((p) => p.role === "event_manager")?.id ?? null;

for (const e of events) {
  const owner = e.created_by ?? firstManager;
  await set(db.doc(`events/${e.id}`), doc({
    created_at: e.created_at,
    title: e.title,
    description: e.description ?? null,
    location: e.location ?? null,
    start_date: e.start_date ?? null,
    end_date: e.end_date ?? null,
    status: e.status,
    created_by: owner,
    host_org: profiles.find((p) => p.id === owner)?.organization ?? null,
    join_code: codeFor(e.id),
  }));
  console.log(`   event "${e.title}" -> join code ${codeFor(e.id)}`);
}
console.log(`   events: ${events.length}`);

for (const r of registrations) {
  await set(db.doc(`events/${r.event_id}/registrations/${r.profile_id}`), doc({
    created_at: r.created_at,
    event_id: r.event_id,
    profile_id: r.profile_id,
    role: r.role,
    checked_in: r.checked_in ?? false,
  }));
}
console.log(`   registrations: ${registrations.length}`);

for (const s of scans) {
  await set(db.doc(`events/${s.event_id}/scans/${s.id}`), doc({
    created_at: s.created_at,
    event_id: s.event_id,
    scanner_profile_id: s.scanner_profile_id,
    scanned_profile_id: s.scanned_profile_id,
    scanner_role: s.scanner_role,
    scanned_role: s.scanned_role,
    scan_context: s.scan_context ?? "qr",
    notes: s.notes ?? null,
  }));
}
console.log(`   scans: ${scans.length}`);

for (const s of shortlists) {
  await set(db.doc(`events/${s.event_id}/shortlists/${s.company_id}__${s.student_id}`), doc({
    created_at: s.created_at,
    event_id: s.event_id,
    company_id: s.company_id,
    student_id: s.student_id,
    status: s.status,
    notes: s.notes ?? null,
  }));
}
console.log(`   shortlists: ${shortlists.length}`);

for (const a of analytics) {
  await set(db.doc(`events/${a.event_id}/analytics/${a.student_id}`), doc({
    event_id: a.event_id,
    student_id: a.student_id,
    profile_views: a.profile_views ?? 0,
    company_scans: a.company_scans ?? 0,
    shortlists: a.shortlists ?? 0,
    messages_received: a.messages_received ?? 0,
    resume_score: a.resume_score ?? 0,
    engagement_score: a.engagement_score ?? 0,
  }));
}
console.log(`   analytics: ${analytics.length}`);

for (const m of messages) {
  await set(db.doc(`messages/${m.id}`), doc({
    created_at: m.created_at,
    event_id: m.event_id,
    sender_profile_id: m.sender_profile_id,
    receiver_profile_id: m.receiver_profile_id,
    // Firestore can't OR across two fields; this array powers the inbox query
    // and the security rule that limits reads to the two participants.
    participants: [m.sender_profile_id, m.receiver_profile_id].filter(Boolean),
    message: m.message,
    read_at: m.read_at ?? null,
  }));
}
console.log(`   messages: ${messages.length}`);

for (const i of checklistItems) {
  await set(db.doc(`checklist_items/${i.id}`), doc({
    event_id: i.event_id,
    role: i.role,
    title: i.title,
    description: i.description ?? null,
    phase: i.phase,
    order_index: i.order_index,
  }));
}
console.log(`   checklist_items: ${checklistItems.length}`);

for (const p of checklistProgress) {
  await set(db.doc(`checklist_progress/${p.profile_id}__${p.checklist_item_id}`), doc({
    checklist_item_id: p.checklist_item_id,
    profile_id: p.profile_id,
    completed: p.completed ?? false,
    completed_at: p.completed_at ?? null,
  }));
}
console.log(`   checklist_progress: ${checklistProgress.length}`);

for (const o of orders) {
  await set(db.doc(`orders/${o.id}`), doc(o));
}
console.log(`   orders: ${orders.length}`);

await flush();
console.log(`   -> ${writes} documents ${DRY ? "would be written" : "written"}`);

/* ---------------- 3. Storage files ---------------- */
/*
 * Résumés and brochures still live on Supabase Storage. Copy them into the
 * Firebase bucket and repoint the document URLs, otherwise every uploaded file
 * dies the moment the Supabase project is deleted.
 */
if (DO_STORAGE) {
  console.log("\n3. Storage files");
  const bucket = getStorage(app).bucket();
  const jobs = [];

  const collect = (rows, collectionName, field) => {
    for (const r of rows) {
      const url = r[field];
      if (typeof url === "string" && url.includes("/storage/v1/object/public/")) {
        jobs.push({ url, docPath: `${collectionName}/${r.profile_id ?? r.id}`, field });
      }
    }
  };
  collect(students, "students", "resume_url");
  collect(students, "students", "portfolio_url");
  collect(companies, "companies", "brochure_url");
  collect(companies, "companies", "logo_url");

  if (!jobs.length) console.log("   nothing to copy");

  for (const job of jobs) {
    // .../object/public/uploads/resumes/<file>  ->  resumes/<file>
    const path = decodeURIComponent(job.url.split("/storage/v1/object/public/uploads/")[1] ?? "");
    if (!path) {
      console.log(`   ! could not parse path from ${job.url}`);
      continue;
    }
    try {
      const res = await fetch(job.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (!DRY) {
        const file = bucket.file(path);
        await file.save(buf, {
          contentType: res.headers.get("content-type") ?? "application/octet-stream",
        });
        await file.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURI(path)}`;
        await db.doc(job.docPath).set({ [job.field]: publicUrl }, { merge: true });
      }
      console.log(`   copied ${path} (${(buf.length / 1024).toFixed(0)} KB)`);
    } catch (err) {
      console.log(`   ! failed ${path}: ${err.message}`);
    }
  }
} else {
  console.log("\n3. Storage files — skipped (pass --storage to copy résumés/brochures across)");
}

console.log(DRY ? "\nDry run complete." : "\nImport complete.");
process.exit(0);
