/**
 * Applies db/schema.sql to the Neon database in DATABASE_URL.
 *
 *   npm run db:migrate
 *
 * The schema is idempotent (`if not exists` throughout), so this is safe to
 * re-run. Uses the Neon driver's WebSocket Pool because the schema is a
 * multi-statement script; the app itself only ever uses the HTTP driver.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "@neondatabase/serverless";
import { ROOT, requireDatabaseUrl } from "./load-env.mjs";

const pool = new Pool({ connectionString: requireDatabaseUrl() });
const schema = readFileSync(join(ROOT, "db", "schema.sql"), "utf8");

try {
  await pool.query(schema);
  const { rows } = await pool.query(
    "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
  );
  console.log(`Schema applied. ${rows.length} tables: ${rows.map((r) => r.table_name).join(", ")}`);
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
