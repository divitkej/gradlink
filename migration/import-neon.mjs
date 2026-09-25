/**
 * Loads GradLink's exported data into Neon.
 *
 * Source (first match wins):
 *   --from=<dir>                  e.g. the output of export-firestore.mjs
 *   migration/.private/data/      the real Supabase export (git-ignored)
 *   migration/data/               the pseudonymised copy committed to git
 *
 * Run (after `npm run db:migrate`):
 *   npm run db:import -- --dry-run          # report only, write nothing
 *   npm run db:import
 *   npm run db:import -- --from=migration/.private/firestore-export
 *   npm run db:import -- --files            # also copy stored files into Workers KV
 *
 * Idempotent: every insert is `on conflict do nothing`, so re-running is safe
 * and never overwrites rows that already exist in Neon.
 *
 * Ids are kept verbatim (see db/schema.sql), so QR codes and links survive.
 */
import { readFileSync, existsSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { Pool } from "@neondatabase/serverless";
import { requireDatabaseUrl, ROOT } from "../scripts/load-env.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REAL_DATA = join(HERE, ".private", "data");
const fromArg = process.argv.find((a) => a.startsWith("--from="))?.slice("--from=".length);
const DATA = fromArg ? resolve(fromArg) : existsSync(REAL_DATA) ? REAL_DATA : join(HERE, "data");
const DRY = process.argv.includes("--dry-run");
const DO_FILES = process.argv.includes("--files");

const table = (name) => {
  const path = join(DATA, `${name}.json`);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : [];
};
const lower = (s) => (s ?? "").trim().toLowerCase();

console.log(`Source: ${DATA}${DRY ? "  (DRY RUN — nothing will be written)" : ""}`);
if (DATA === join(HERE, "data")) {
  // Importing placeholders would silently create fake accounts, so say so loudly.
  console.log(
    "\n  WARNING: this is the SCRUBBED copy. Names, emails and message bodies are\n" +
      "  placeholders. Restore your private export to migration/.private/data/, or\n" +
      "  pass --from=<dir>, if that is not what you want.",
  );
}

/* ---------------- load + shape ---------------- */
const profiles = table("profiles");
const profileIds = new Set(profiles.map((p) => p.id));
const firstManager = profiles.find((p) => p.role === "event_manager")?.id ?? null;
const ref = (id) => (id && profileIds.has(id) ? id : null);

const rows = {};
const skipped = [];
const skip = (what, why) => skipped.push(`${what}: ${why}`);

rows.profiles = profiles.map((p) => ({
  id: p.id,
  created_at: p.created_at ?? new Date().toISOString(),
  role: p.role,
  full_name: p.full_name ?? "",
  email: p.email ?? "",
  organization: p.organization ?? null,
  avatar_url: p.avatar_url ?? null,
}));

/*
 * Every profile with an email gets a sign-in identity, but no password.
 * Supabase stored bcrypt and Firebase stores its own scrypt variant; checking
 * either inside a Worker would blow the Free plan's CPU limit on every sign-in,
 * so imported users set a new password once with "Forgot password".
 */
const seenEmail = new Set();
rows.auth_credentials = [];
for (const p of profiles) {
  const e = lower(p.email);
  if (!e) { skip(`login ${p.id}`, "profile has no email"); continue; }
  if (seenEmail.has(e)) { skip(`login ${e}`, "duplicate email — an earlier profile already claimed it"); continue; }
  seenEmail.add(e);
  rows.auth_credentials.push({ profile_id: p.id, email_lower: e, password_hash: null });
}

/** Role rows are keyed by profile id, as they were in Firestore. */
const roleRow = (r) => ({
  id: r.profile_id ?? r.id,
  created_at: r.created_at ?? new Date().toISOString(),
  profile_id: ref(r.profile_id),
  full_name: r.full_name ?? "",
  email: r.email ?? "",
});
const json = (v) => {
  if (v == null) return null;
  if (typeof v !== "string") return JSON.stringify(v);
  try { JSON.parse(v); return v; } catch { return JSON.stringify(v); }
};

rows.students = table("students").map((s) => ({
  ...roleRow(s),
  university: s.university ?? null, degree: s.degree ?? null, graduation_year: s.graduation_year ?? null,
  skills: s.skills ?? [], resume_url: s.resume_url ?? null, portfolio_url: s.portfolio_url ?? null,
  linkedin_url: s.linkedin_url ?? null, github_url: s.github_url ?? null, bio: s.bio ?? null,
  resume_score: s.resume_score ?? null, ai_feedback: json(s.ai_feedback),
}));
rows.companies = table("companies").map((c) => ({
  ...roleRow(c),
  company: c.company ?? null, company_name: c.company_name ?? null, sector: c.sector ?? null,
  industry: c.industry ?? null, website: c.website ?? null, description: c.description ?? null,
  logo_url: c.logo_url ?? null, hiring_roles: c.hiring_roles ?? [], booth_number: c.booth_number ?? null,
  skills_wanted: c.skills_wanted ?? [], brochure_url: c.brochure_url ?? null,
}));
rows.colleges = table("colleges").map((c) => ({ ...roleRow(c), institution: c.institution ?? null }));
for (const c of rows.colleges.concat(rows.students, rows.companies)) {
  if (!c.profile_id) console.log(`   note: ${c.email || c.id} has no profile — kept under its own id, with no login`);
}

/**
 * Events from the Supabase export predate join codes. This derives the same
 * code the Firestore import did, so codes already handed out keep working.
 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const codeFor = (seed) => {
  let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[h % CODE_ALPHABET.length];
    h = Math.floor(h / CODE_ALPHABET.length) + 7919;
  }
  return out;
};
rows.events = table("events").map((e) => {
  const owner = ref(e.created_by) ?? firstManager;
  return {
    id: e.id,
    created_at: e.created_at ?? new Date().toISOString(),
    title: e.title ?? "Untitled event",
    description: e.description ?? null,
    location: e.location ?? null,
    start_date: e.start_date || null,
    end_date: e.end_date || null,
    status: e.status ?? "upcoming",
    created_by: owner,
    host_org: e.host_org ?? profiles.find((p) => p.id === owner)?.organization ?? null,
    join_code: e.join_code ?? codeFor(e.id),
  };
});
const eventIds = new Set(rows.events.map((e) => e.id));
const ev = (id) => (id && eventIds.has(id) ? id : null);

/** Optional `id`: exports from Firestore have none for rows keyed by a natural key. */
const withId = (r, obj) => (r.id ? { id: r.id, ...obj } : obj);

rows.event_registrations = table("event_registrations").flatMap((r) => {
  if (!ev(r.event_id) || !ref(r.profile_id)) return skip(`registration ${r.id ?? r.profile_id}`, "event or profile missing"), [];
  return [withId(r, { created_at: r.created_at ?? new Date().toISOString(), event_id: r.event_id, profile_id: r.profile_id, role: r.role, checked_in: r.checked_in ?? false })];
});
rows.scans = table("scans").flatMap((s) => {
  if (!ev(s.event_id)) return skip(`scan ${s.id}`, "event missing"), [];
  return [withId(s, {
    created_at: s.created_at, event_id: s.event_id, scanner_profile_id: ref(s.scanner_profile_id),
    scanned_profile_id: ref(s.scanned_profile_id), scanner_role: s.scanner_role ?? null,
    scanned_role: s.scanned_role ?? null, scan_context: s.scan_context ?? "qr", notes: s.notes ?? null,
  })];
});
rows.shortlists = table("shortlists").flatMap((s) => {
  if (!ev(s.event_id) || !ref(s.company_id) || !ref(s.student_id)) return skip(`shortlist ${s.id ?? ""}`, "event, company or student missing"), [];
  return [withId(s, { created_at: s.created_at, event_id: s.event_id, company_id: s.company_id, student_id: s.student_id, status: s.status, notes: s.notes ?? null })];
});
rows.student_event_analytics = table("student_event_analytics").flatMap((a) => {
  if (!ev(a.event_id) || !ref(a.student_id)) return skip(`analytics ${a.id ?? a.student_id}`, "event or student missing"), [];
  return [withId(a, {
    event_id: a.event_id, student_id: a.student_id, profile_views: a.profile_views ?? 0,
    company_scans: a.company_scans ?? 0, shortlists: a.shortlists ?? 0, messages_received: a.messages_received ?? 0,
    resume_score: a.resume_score ?? 0, engagement_score: a.engagement_score ?? 0,
  })];
});
rows.messages = table("messages").map((m) => withId(m, {
  created_at: m.created_at, event_id: ev(m.event_id), sender_profile_id: ref(m.sender_profile_id),
  receiver_profile_id: ref(m.receiver_profile_id), message: m.message ?? "", read_at: m.read_at ?? null,
}));
rows.checklist_items = table("checklist_items").map((i) => withId(i, {
  event_id: ev(i.event_id), role: i.role, title: i.title, description: i.description ?? null,
  phase: i.phase, order_index: i.order_index ?? 0,
}));
const itemIds = new Set(rows.checklist_items.map((i) => i.id));
rows.checklist_progress = table("checklist_progress").flatMap((p) => {
  if (!itemIds.has(p.checklist_item_id) || !ref(p.profile_id)) return skip(`checklist progress ${p.id ?? ""}`, "item or profile missing"), [];
  return [withId(p, { checklist_item_id: p.checklist_item_id, profile_id: p.profile_id, completed: p.completed ?? false, completed_at: p.completed_at ?? null })];
});
rows.qr_codes = table("qr_codes").map((q) => withId(q, {
  created_at: q.created_at, owner_profile_id: ref(q.owner_profile_id), owner_role: q.owner_role ?? null,
  event_id: ev(q.event_id), qr_type: q.qr_type ?? null, qr_payload: q.qr_payload ?? null,
}));
rows.subscriptions = table("subscriptions").flatMap((s) => {
  const id = s.profile_id ?? s.id;
  if (!ref(id)) return skip(`subscription ${id}`, "profile missing"), [];
  return [{
    profile_id: id, plan: s.plan ?? "free", status: s.status ?? "active",
    stripe_customer_id: s.stripe_customer_id ?? null, stripe_subscription_id: s.stripe_subscription_id ?? null,
    current_period_end: s.current_period_end ?? null, updated_at: s.updated_at ?? new Date().toISOString(),
  }];
});
rows.orders = table("orders").map(({ id, created_at, profile_id, ...details }) =>
  withId({ id }, { created_at: created_at ?? new Date().toISOString(), profile_id: ref(profile_id), details: JSON.stringify(details) }));

/* ---------------- write ---------------- */
// Parents before children, so foreign keys are satisfied.
const ORDER = [
  "profiles", "auth_credentials", "students", "companies", "colleges", "events", "event_registrations",
  "scans", "shortlists", "student_event_analytics", "messages", "checklist_items", "checklist_progress",
  "qr_codes", "subscriptions", "orders",
];

const pool = DRY ? null : new Pool({ connectionString: requireDatabaseUrl() });
const client = pool ? await pool.connect() : null;

try {
  await client?.query("begin");
  for (const name of ORDER) {
    let inserted = 0;
    for (const r of rows[name]) {
      if (!client) continue;
      const cols = Object.keys(r);
      const res = await client.query(
        `insert into ${name} (${cols.join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")}) on conflict do nothing`,
        cols.map((c) => r[c]),
      );
      inserted += res.rowCount ?? 0;
    }
    console.log(`   ${name.padEnd(24)} ${String(rows[name].length).padStart(4)} rows${DRY ? "" : `, ${inserted} new`}`);
  }
  await client?.query("commit");
} catch (err) {
  await client?.query("rollback");
  console.error("\nImport failed and was rolled back:", err.message);
  process.exitCode = 1;
}

skipped.forEach((s) => console.log(`   skipped ${s}`));
for (const e of rows.events) console.log(`   event "${e.title}" -> join code ${e.join_code}`);
console.log(`   ${rows.auth_credentials.length} logins created without a password — each user sets one via "Forgot password".`);

/* ---------------- files → Workers KV ---------------- */
/*
 * Résumés/brochures/logos still hosted on Supabase or Firebase Storage are
 * copied into the UPLOADS KV namespace, and their URLs repointed, so nothing
 * breaks when those projects are deleted. Needs `npx wrangler login` and
 * APP_URL (the deployed Worker's origin) in .dev.vars.
 */
if (DO_FILES && !process.exitCode) {
  console.log("\nFiles");
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  const external = (u) => typeof u === "string" && /\/storage\/v1\/object\/public\/|firebasestorage\.googleapis\.com|storage\.googleapis\.com/.test(u);
  const jobs = [];
  for (const [tbl, field, folder] of [
    ["students", "resume_url", "resumes"], ["students", "portfolio_url", "resumes"],
    ["companies", "brochure_url", "brochures"], ["companies", "logo_url", "logos"],
  ]) {
    for (const r of rows[tbl]) if (external(r[field])) jobs.push({ tbl, field, folder, id: r.id, url: r[field] });
  }
  if (!jobs.length) console.log("   nothing to copy");
  else if (!appUrl || appUrl.includes("localhost")) console.log("   set APP_URL to the deployed Worker URL in .dev.vars first");
  else {
    const tmp = mkdtempSync(join(tmpdir(), "gradlink-files-"));
    try {
      for (const job of jobs) {
        try {
          const res = await fetch(job.url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const name = decodeURIComponent(new URL(job.url).pathname.split("/").pop() ?? "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
          const key = `${job.folder}/${job.id}-${Date.now()}-${name}`;
          const meta = { contentType: res.headers.get("content-type") ?? "application/octet-stream", name, owner: job.id };
          const file = join(tmp, "blob");
          writeFileSync(file, Buffer.from(await res.arrayBuffer()));
          if (!DRY) {
            execFileSync("npx", ["wrangler", "kv", "key", "put", key, "--path", file, "--binding", "UPLOADS", "--remote", "--metadata", JSON.stringify(meta)], { cwd: ROOT, stdio: "inherit" });
            const newUrl = `${appUrl}/api/files/${key.split("/").map(encodeURIComponent).join("/")}`;
            await pool.query(`update ${job.tbl} set ${job.field} = $1 where id = $2`, [newUrl, job.id]);
          }
          console.log(`   copied ${job.url} -> ${key}`);
        } catch (err) {
          console.log(`   ! failed ${job.url}: ${err.message}`);
        }
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
}

client?.release();
await pool?.end();
console.log(DRY ? "\nDry run complete." : process.exitCode ? "" : "\nImport complete.");
