/**
 * Step 1 of the Supabase -> Firebase migration.
 *
 * Pulls every public table out of Supabase into migration/data/*.json so the
 * import step has a stable, offline source of truth. Uses the anon key, which
 * is sufficient because every table still has permissive RLS.
 *
 * Run:  node migration/export-supabase.mjs
 *
 * Note: auth.users is NOT anon-readable and is exported separately into
 * migration/.private/auth-users.json (see migration/README.md).
 */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "data");

/** Minimal .env.local reader so this runs without extra deps. */
function loadEnv() {
  const path = join(HERE, "..", ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const TABLES = [
  "profiles",
  "students",
  "companies",
  "colleges",
  "events",
  "event_registrations",
  "qr_codes",
  "scans",
  "shortlists",
  "messages",
  "student_event_analytics",
  "checklist_items",
  "checklist_progress",
  "orders",
];

const supabase = createClient(url, key);
mkdirSync(OUT, { recursive: true });

let failed = 0;
for (const table of TABLES) {
  // Page through in case a table ever outgrows the default 1000-row cap.
  const rows = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + PAGE - 1);
    if (error) {
      console.error(`  ${table}: FAILED — ${error.message}`);
      failed++;
      break;
    }
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  writeFileSync(join(OUT, `${table}.json`), JSON.stringify(rows, null, 2));
  console.log(`  ${table}: ${rows.length} rows`);
}

console.log(failed ? `\nDone with ${failed} failure(s).` : "\nExport complete.");
process.exit(failed ? 1 : 0);
