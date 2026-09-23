/**
 * Produces a shareable copy of the Supabase export.
 *
 * The real export contains live personal data — names, email addresses and
 * private messages belonging to actual people — which has no business sitting
 * in git history, even in a private repo.
 *
 *   migration/.private/data/*.json   real export, git-ignored, used by the import
 *   migration/data/*.json            scrubbed copy, committed
 *
 * Row counts, ids, dates, relationships and every non-personal field are kept
 * exactly as they are, so the committed copy still documents the shape of the
 * data the migration handles.
 *
 * Run:  node migration/scrub-export.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(HERE, ".private", "data");
const OUT = join(HERE, "data");

if (!existsSync(SOURCE)) {
  console.error(
    `\nMissing ${SOURCE}\n\n` +
      `That folder holds the real, unscrubbed export. It is git-ignored, so a\n` +
      `fresh clone won't have it — which is the point. Restore it from your own\n` +
      `backup, or re-run the Supabase export, before scrubbing.\n`
  );
  process.exit(1);
}

/* ---------------- deterministic pseudonyms ---------------- */
/*
 * The same input always maps to the same placeholder, so a student referenced
 * from three different tables stays recognisably one person. The mapping is
 * per-run and never written out, so it can't be reversed from the repo.
 */
const emails = new Map();
const names = new Map();

function fakeEmail(real) {
  if (!real) return real;
  const key = String(real).toLowerCase();
  if (!emails.has(key)) {
    // Keep the domain shape (academic vs company) without the real domain.
    const academic = /\.(ac|edu)\b/.test(key) || key.includes("university");
    emails.set(key, `person${emails.size + 1}@${academic ? "example.edu" : "example.com"}`);
  }
  return emails.get(key);
}

function fakeName(real) {
  if (!real) return real;
  const key = String(real);
  if (!names.has(key)) names.set(key, `Person ${names.size + 1}`);
  return names.get(key);
}

/** Fields that identify a human, or that a human wrote in confidence. */
const REDACT = {
  email: (v) => fakeEmail(v),
  email_lower: (v) => fakeEmail(v),
  full_name: (v) => fakeName(v),
  message: () => "[message redacted]",
  notes: (v) => (v ? "[notes redacted]" : v),
  bio: (v) => (v ? "[bio redacted]" : v),
  // Uploaded files are private documents; keep the fact one existed, drop the link.
  resume_url: (v) => (v ? "[file redacted]" : v),
  portfolio_url: (v) => (v ? "[url redacted]" : v),
  brochure_url: (v) => (v ? "[file redacted]" : v),
  logo_url: (v) => (v ? "[url redacted]" : v),
  linkedin_url: (v) => (v ? "[url redacted]" : v),
  github_url: (v) => (v ? "[url redacted]" : v),
  avatar_url: (v) => (v ? "[url redacted]" : v),
  encrypted_password: () => "[redacted]",
  raw_user_meta_data: () => null,
};

function scrub(value) {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = k in REDACT ? REDACT[k](v) : scrub(v);
    }
    return out;
  }
  return value;
}

mkdirSync(OUT, { recursive: true });

let files = 0;
let rows = 0;
for (const name of readdirSync(SOURCE).filter((f) => f.endsWith(".json"))) {
  const data = JSON.parse(readFileSync(join(SOURCE, name), "utf8"));
  const cleaned = scrub(data);
  writeFileSync(join(OUT, basename(name)), JSON.stringify(cleaned, null, 2) + "\n");
  files++;
  rows += Array.isArray(data) ? data.length : 0;
  console.log(`  ${name}: ${Array.isArray(data) ? data.length : "?"} rows`);
}

console.log(
  `\nScrubbed ${rows} rows across ${files} files ` +
    `(${emails.size} email addresses, ${names.size} names pseudonymised).`
);
console.log(`Real data stayed in ${SOURCE} and is git-ignored.`);
