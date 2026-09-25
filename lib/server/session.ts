import { db } from "./sql";
import { serverEnv } from "./env";
import { signToken, verifyToken } from "./crypto";
import type { AppRole } from "../session";

/* ============================================================
   Server-side session: an HttpOnly, HS256-signed cookie.

   The cookie carries the profile id and a session version. Every API
   request re-reads the version (one primary-key lookup), so a password
   reset or sign-out-everywhere takes effect immediately — the same
   guarantee Firebase gave by revoking refresh tokens.
   ============================================================ */

export const SESSION_COOKIE = "gl_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface AuthUser {
  id: string;
  role: AppRole;
  name: string;
  org: string;
  email: string;
  /** When this device signed in (ms since epoch), for recent-login checks. */
  signedInAt: number;
}

interface Claims {
  sub: string;
  sv: number;
  iat: number;
  exp: number;
}

export class ConfigError extends Error {}

function secret(): string {
  const s = serverEnv().AUTH_SECRET;
  if (!s || s.length < 32) throw new ConfigError("AUTH_SECRET is missing or shorter than 32 characters");
  return s;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

function cookieAttrs(request: Request, maxAge: number): string {
  // Secure only over https, so the cookie still works on http://localhost.
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export async function sessionCookie(request: Request, profileId: string, sessionVersion: number): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const token = await signToken({ sub: profileId, sv: sessionVersion, iat, exp: iat + MAX_AGE_SECONDS } satisfies Claims, secret());
  return `${SESSION_COOKIE}=${token}; ${cookieAttrs(request, MAX_AGE_SECONDS)}`;
}

export function clearedSessionCookie(request: Request): string {
  return `${SESSION_COOKIE}=; ${cookieAttrs(request, 0)}`;
}

/** The signed-in user for this request, or null. */
export async function currentUser(request: Request): Promise<AuthUser | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const claims = await verifyToken<Claims>(token, secret());
  if (!claims?.sub) return null;

  const rows = await db()`
    select p.id, p.role, p.full_name, p.organization, p.email, c.session_version
    from profiles p join auth_credentials c on c.profile_id = p.id
    where p.id = ${claims.sub}
  `;
  const r = rows[0];
  if (!r || r.session_version !== claims.sv) return null;
  return {
    id: r.id as string,
    role: r.role as AppRole,
    name: (r.full_name as string) ?? "",
    org: (r.organization as string) ?? "",
    email: r.email as string,
    signedInAt: (claims.iat ?? 0) * 1000,
  };
}
