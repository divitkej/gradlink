/**
 * Creates (or resets) the four test accounts used for the Phase 1 test pass.
 *
 *   SEED_PASSWORD='...' npm run db:seed-test-users
 *   SEED_PASSWORD='...' npm run db:seed-test-users -- --print   # print the SQL only
 *
 * The password is never stored in the repo: pass it in SEED_PASSWORD.
 *
 * Accounts are written the way sign-up writes them (lib/server/auth-api.ts):
 * a profiles row, an auth_credentials row with the same PBKDF2 hash format as
 * lib/server/crypto.ts, and the role row. They start with the email confirmed,
 * so sign-in works even when account email is turned on.
 *
 * Running it again is safe: an existing account keeps its id, role and data,
 * and only gets the password reset, the lockout cleared and the email
 * confirmed. Sign-up's email-domain rules are skipped on purpose, because
 * example.com addresses are refused there.
 *
 * Admin rights come from the ADMIN_EMAILS Worker secret, not from the
 * database. The admin account is a college (event_manager) account so it can
 * open the dashboards; add its email to ADMIN_EMAILS to open /admin.
 *
 * Remove these accounts before the public launch (docs/checklists/launch.md).
 */
import { pbkdf2Sync, randomBytes, randomUUID } from "node:crypto";
import { requireDatabaseUrl } from "./load-env.mjs";

export const TEST_USERS = [
  { label: "admin", email: "admin1@example.com", role: "event_manager", table: "colleges", name: "Test Admin", org: "GradLink Admin" },
  { label: "student", email: "student1@example.com", role: "student", table: "students", name: "Test Student", org: "GradLink Test University" },
  { label: "college", email: "college1@example.com", role: "event_manager", table: "colleges", name: "Test College", org: "GradLink Test College" },
  { label: "employer", email: "employer1@example.com", role: "company", table: "companies", name: "Test Employer", org: "GradLink Test Company" },
];

const ORG_COLUMN = { students: "university", companies: "company", colleges: "institution" };

/** Same format and cost as hashPassword() in lib/server/crypto.ts. */
export function hashPassword(password) {
  const b64url = (buf) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const iterations = 100_000;
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256");
  return `pbkdf2_sha256$${iterations}$${b64url(salt)}$${b64url(hash)}`;
}

const lit = (v) => (v === null ? "null" : `'${String(v).replace(/'/g, "''")}'`);

/** One idempotent block per user: insert if new, otherwise reset the password. */
export function userSql(u, passwordHash) {
  const id = randomUUID();
  const email = u.email;
  const emailLower = email.toLowerCase();
  const orgCol = ORG_COLUMN[u.table];
  return `
-- ${u.label}: ${email}
with existing as (select profile_id from auth_credentials where email_lower = ${lit(emailLower)}),
new_profile as (
  insert into profiles (id, role, full_name, email, organization)
  select ${lit(id)}, ${lit(u.role)}, ${lit(u.name)}, ${lit(email)}, ${lit(u.org)}
  where not exists (select 1 from existing)
  returning id
),
new_role as (
  insert into ${u.table} (id, profile_id, full_name, email, ${orgCol})
  select id, id, ${lit(u.name)}, ${lit(email)}, ${lit(u.org)} from new_profile
  returning id
)
insert into auth_credentials (profile_id, email_lower, password_hash, email_verified_at)
select id, ${lit(emailLower)}, ${lit(passwordHash)}, now() from new_profile
on conflict (email_lower) do nothing;

update auth_credentials set
  password_hash = ${lit(passwordHash)},
  failed_attempts = 0,
  locked_until = null,
  email_verified_at = coalesce(email_verified_at, now()),
  updated_at = now()
where email_lower = ${lit(emailLower)};
`;
}

export function seedSql(password) {
  return ["begin;", ...TEST_USERS.map((u) => userSql(u, hashPassword(password))), "commit;"].join("\n");
}

async function main() {
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 8 || password.length > 256) {
    console.error("Set SEED_PASSWORD to the test password (8 to 256 characters, the same rule as sign-up).");
    process.exit(1);
  }
  const sql = seedSql(password);
  if (process.argv.includes("--print")) {
    console.log(sql);
    return;
  }

  const { Pool } = await import("@neondatabase/serverless");
  const pool = new Pool({ connectionString: requireDatabaseUrl() });
  try {
    await pool.query(sql);
    const { rows } = await pool.query(
      `select p.email, p.role, c.email_verified_at is not null as confirmed
       from auth_credentials c join profiles p on p.id = c.profile_id
       where c.email_lower = any($1) order by p.email`,
      [TEST_USERS.map((u) => u.email.toLowerCase())],
    );
    for (const r of rows) console.log(`${r.email.padEnd(24)} ${r.role.padEnd(14)} ${r.confirmed ? "confirmed" : "NOT confirmed"}`);
    console.log(`\n${rows.length} of ${TEST_USERS.length} test accounts ready.`);
  } catch (err) {
    console.error("Seeding failed:", err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
