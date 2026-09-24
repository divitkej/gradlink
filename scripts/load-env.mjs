/**
 * Loads KEY=value pairs from .dev.vars (the Worker's local secrets file) into
 * process.env for the Node scripts. Values already in the environment win, so
 * `DATABASE_URL=... npm run db:migrate` also works.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function loadDevVars() {
  const path = join(ROOT, ".dev.vars");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

export function requireDatabaseUrl() {
  loadDevVars();
  const url = process.env.DATABASE_URL;
  if (!url || url.startsWith("<")) {
    console.error(
      "\nDATABASE_URL is not set.\n\n" +
        "Copy .dev.vars.example to .dev.vars and paste your Neon connection string\n" +
        "(Neon console → your project → Connect), or pass it inline:\n" +
        "  DATABASE_URL='postgresql://…' npm run db:migrate\n",
    );
    process.exit(1);
  }
  return url;
}
