/**
 * Dumps GradLink's live Firestore data into the table-shaped JSON that
 * import-neon.mjs reads. Only needed if GradLink has been running on Firebase
 * since the June 2026 Supabase export — otherwise skip straight to the import.
 *
 * Prerequisites:
 *   npm i --no-save firebase-admin          (no longer a project dependency)
 *   migration/.private/service-account.json (Firebase console → Project settings
 *                                            → Service accounts → Generate new private key)
 *
 * Run:
 *   node migration/export-firestore.mjs
 *   npm run db:import -- --from=migration/.private/firestore-export
 *
 * Output goes to migration/.private/firestore-export/ (git-ignored): it holds
 * real names, emails and messages.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PRIVATE = join(HERE, ".private");
const OUT = join(PRIVATE, "firestore-export");
const keyPath = join(PRIVATE, "service-account.json");

if (!existsSync(keyPath)) {
  console.error(`\nMissing ${keyPath}\nFirebase console → Project settings → Service accounts → Generate new private key.\n`);
  process.exit(1);
}

let admin;
try {
  admin = { app: await import("firebase-admin/app"), firestore: await import("firebase-admin/firestore") };
} catch {
  console.error("\nfirebase-admin isn't installed. Run:  npm i --no-save firebase-admin\n");
  process.exit(1);
}

const app = admin.app.initializeApp({ credential: admin.app.cert(JSON.parse(readFileSync(keyPath, "utf8"))) });
const db = admin.firestore.getFirestore(app);

/** Firestore Timestamps (if any crept in) become ISO strings, like every other date. */
function plain(value) {
  if (value && typeof value.toDate === "function") return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(plain);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v)]));
  return value;
}

async function all(path) {
  const snap = await db.collection(path).get();
  return snap.docs.map((d) => ({ ...plain(d.data()), id: d.id }));
}

const out = {};
out.profiles = await all("profiles");
out.students = await all("students");
out.companies = await all("companies");
out.colleges = await all("colleges");
out.events = await all("events");
out.messages = await all("messages");
out.checklist_items = await all("checklist_items");
out.orders = await all("orders");
out.subscriptions = (await all("subscriptions")).map((s) => ({ ...s, profile_id: s.id }));

// Rows keyed by a natural key in Firestore (e.g. `company__student`) get a
// fresh id in Postgres; their unique constraints keep re-imports idempotent.
const noId = ({ id: _id, ...rest }) => rest;
out.checklist_progress = (await all("checklist_progress")).map(noId);

out.event_registrations = [];
out.scans = [];
out.shortlists = [];
out.student_event_analytics = [];
for (const e of out.events) {
  const base = `events/${e.id}`;
  for (const r of await all(`${base}/registrations`)) out.event_registrations.push({ ...noId(r), event_id: e.id, profile_id: r.profile_id ?? r.id });
  for (const s of await all(`${base}/scans`)) out.scans.push({ ...s, event_id: e.id });
  for (const s of await all(`${base}/shortlists`)) out.shortlists.push({ ...noId(s), event_id: e.id });
  for (const a of await all(`${base}/analytics`)) out.student_event_analytics.push({ ...noId(a), event_id: e.id, student_id: a.student_id ?? a.id });
}

mkdirSync(OUT, { recursive: true });
for (const [name, rows] of Object.entries(out)) {
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify(rows, null, 2));
  console.log(`   ${name.padEnd(24)} ${rows.length}`);
}
console.log(`\nWritten to ${OUT}\nNext:  npm run db:import -- --from=${OUT}`);
process.exit(0);
