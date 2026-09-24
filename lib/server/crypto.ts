
/* ============================================================
   Password hashing and token signing on WebCrypto only.

   Everything here runs natively in the Workers runtime — no Node crypto,
   no WASM, no native addons.

   PBKDF2-SHA256 at 100,000 iterations is the most the Workers runtime
   allows and costs roughly 15 ms of CPU. That only happens on sign-up,
   sign-in and password reset, which the Free plan's per-isolate CPU
   flexibility absorbs; bcrypt/scrypt in JavaScript would cost 5–10× more
   and fail the 10 ms limit outright. The iteration count is stored in each
   hash, so it can be raised later without invalidating existing passwords.
   ============================================================ */

const ITERATIONS = 100_000;
const enc = new TextEncoder();

function toB64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Constant-time comparison, so response timing can't leak a matching prefix. */
function equal(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

/** Format: `pbkdf2_sha256$<iterations>$<salt>$<hash>` (base64url). */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2_sha256$${ITERATIONS}$${toB64url(salt)}$${toB64url(hash)}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [scheme, iter, salt, hash] = stored.split("$");
  const iterations = Number(iter);
  if (scheme !== "pbkdf2_sha256" || !Number.isInteger(iterations) || !salt || !hash) return false;
  const actual = await pbkdf2(password, fromB64url(salt), iterations);
  return equal(actual, fromB64url(hash));
}

/** URL-safe random token, e.g. for password-reset links. */
export function randomToken(bytes = 32): string {
  return toB64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256(input: string): Promise<string> {
  return toB64url(await crypto.subtle.digest("SHA-256", enc.encode(input)));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

/** Compact HS256 JWT. Claims are validated by the caller. */
export async function signToken(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = toB64url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = toB64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(`${header}.${body}`));
  return `${header}.${body}.${toB64url(sig)}`;
}

export async function verifyToken<T>(token: string, secret: string): Promise<T | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  try {
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromB64url(sig), enc.encode(`${header}.${body}`));
    if (!ok) return null;
    const claims = JSON.parse(new TextDecoder().decode(fromB64url(body))) as T & { exp?: number };
    if (typeof claims.exp === "number" && claims.exp * 1000 < Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}
