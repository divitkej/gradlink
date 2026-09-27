import { db } from "./sql";
import { sha256 } from "./crypto";
import { HttpError } from "./http";

/* ============================================================
   Per-IP rate limits for the auth endpoints.

   A Cloudflare WAF rule can't be attached to a workers.dev hostname,
   and the Workers Free plan has no cron or Durable Objects, so the
   counters live in Postgres: one fixed-window row per (bucket, IP).
   IPs are stored only as SHA-256 hashes.

   Limits are generous on purpose: at a careers fair hundreds of
   students can share one campus Wi-Fi address.
   ============================================================ */

export interface Limit {
  bucket: string;
  max: number;
  windowSeconds: number;
}

export const LIMITS = {
  /** Wrong passwords from one IP, across all accounts. Correct sign-ins don't count. */
  signInFailures: { bucket: "sign-in-fail", max: 30, windowSeconds: 15 * 60 },
  signUp: { bucket: "sign-up", max: 50, windowSeconds: 60 * 60 },
  /** Each request can send an email, which the mail provider meters. */
  resetRequest: { bucket: "reset-request", max: 10, windowSeconds: 60 * 60 },
  resetToken: { bucket: "reset-token", max: 30, windowSeconds: 15 * 60 },
} satisfies Record<string, Limit>;

const TOO_MANY = "Too many attempts from this network. Please wait a few minutes and try again.";

/** Cloudflare sets cf-connecting-ip itself and overwrites any value a client sends. */
function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown"
  );
}

async function keyFor(request: Request, limit: Limit) {
  const windowMs = limit.windowSeconds * 1000;
  return {
    ip: await sha256(clientIp(request)),
    windowStart: new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString(),
  };
}

/**
 * The table comes from db/schema.sql. Until `npm run db:migrate` has created
 * it, limits are skipped (and logged) rather than blocking every sign-in.
 */
function missingTable(err: unknown) {
  if ((err as { code?: string }).code !== "42P01") return false;
  console.error("[rate-limit] rate_limits table is missing; run npm run db:migrate");
  return true;
}

/** Counts this request and throws 429 once the IP is over the limit. */
export async function takeHit(request: Request, limit: Limit): Promise<void> {
  if ((await recordHit(request, limit)) > limit.max) throw new HttpError(429, TOO_MANY);
}

/** Throws 429 if the IP is already over the limit, without counting this request. */
export async function assertUnderLimit(request: Request, limit: Limit): Promise<void> {
  const { ip, windowStart } = await keyFor(request, limit);
  try {
    const rows = await db()`
      select hits from rate_limits where bucket = ${limit.bucket} and ip_hash = ${ip} and window_start = ${windowStart}
    `;
    if (((rows[0]?.hits as number) ?? 0) >= limit.max) throw new HttpError(429, TOO_MANY);
  } catch (err) {
    if (!missingTable(err)) throw err;
  }
}

/** Counts this request and returns the IP's total for the current window. */
export async function recordHit(request: Request, limit: Limit): Promise<number> {
  const { ip, windowStart } = await keyFor(request, limit);
  const sql = db();
  try {
    const rows = await sql`
      insert into rate_limits (bucket, ip_hash, window_start, hits) values (${limit.bucket}, ${ip}, ${windowStart}, 1)
      on conflict (bucket, ip_hash, window_start) do update set hits = rate_limits.hits + 1
      returning hits
    `;
    // No cron on the Free plan, so expired windows are swept now and then.
    if (Math.random() < 0.02) await sql`delete from rate_limits where window_start < now() - interval '1 day'`;
    return rows[0].hits as number;
  } catch (err) {
    if (missingTable(err)) return 0;
    throw err;
  }
}
