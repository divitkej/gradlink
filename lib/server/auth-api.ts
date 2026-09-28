import { db } from "./sql";
import { serverEnv } from "./env";
import { hashPassword, verifyPassword, randomToken, sha256 } from "./crypto";
import { currentUser, sessionCookie, clearedSessionCookie } from "./session";
import { HttpError, json } from "./http";
import { emailEnabled, sendEmail } from "./mail";
import { LIMITS, assertUnderLimit, recordHit, takeHit } from "./rate-limit";
import type { AppRole } from "../session";

/* ============================================================
   /api/auth/* — replaces Firebase Auth (email + password).

   Same user flows as before: sign up, sign in, sign out, forgot
   password → emailed link → /reset-password, and change password
   while signed in. Error messages match the ones lib/auth.ts used
   to derive from Firebase error codes.

   Email confirmation: whenever the server can send email, a new
   account gets a link to /verify-email and cannot sign in until it
   is opened. Without an email provider, accounts are confirmed on
   creation so sign-up keeps working.
   ============================================================ */

type Body = Record<string, unknown>;
type SignUpRole = "student" | "company" | "college";

const MAX_FAILED_ATTEMPTS = 10;
const LOCK_MINUTES = 15;
const RESET_TTL_MINUTES = 60;
const RESETS_PER_HOUR = 3;
const VERIFY_TTL_HOURS = 24;
const VERIFY_EMAILS_PER_HOUR = 3;
/** Password changes without a reset link need a recent sign-in, as Firebase required. */
const RECENT_LOGIN_MS = 15 * 60 * 1000;

const MSG = {
  badLogin: "Incorrect email or password.",
  locked: "Too many attempts. Please wait a moment and try again.",
  exists: "An account with this email already exists. Please sign in instead.",
  badEmail: "That email address doesn't look right.",
  weak: "That password is too weak. Use at least 8 characters.",
  noPassword:
    "Your account moved to GradLink's new sign-in system and needs a new password. Tap \"Forgot password?\" to set one.",
  expired: "This reset link has expired or has already been used. Request a new one from the sign-in page.",
  verifyExpired: "This confirmation link has expired or has already been used. Sign in to get a new one.",
};

const str = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validPassword(pw: unknown): pw is string {
  return typeof pw === "string" && pw.length >= 8 && pw.length <= 256;
}

/**
 * A throwaway hash checked when the email has no account (or no password), so
 * a failed sign-in costs the same time either way and response timing can't be
 * used to find out which emails have GradLink accounts.
 */
let dummyHash: Promise<string> | null = null;
async function burnHashTime(password: string) {
  dummyHash ??= hashPassword(randomToken());
  await verifyPassword(password, await dummyHash);
}

function withCookie(body: unknown, cookie: string, status = 200): Response {
  return json(body, { status, headers: { "Set-Cookie": cookie } });
}

/** Origin for emailed links. */
function appBase(request: Request): string {
  return serverEnv().APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Creates a confirmation link for this account and emails it. */
async function sendVerification(request: Request, profileId: string, email: string, name: string): Promise<boolean> {
  const token = randomToken();
  await db()`
    insert into email_verification_tokens (token_hash, profile_id, expires_at)
    values (${await sha256(token)}, ${profileId}, now() + make_interval(hours => ${VERIFY_TTL_HOURS}))
  `;
  const link = `${appBase(request)}/verify-email?token=${encodeURIComponent(token)}`;
  const hi = name ? `Hi ${name},` : "Hi,";
  return sendEmail({
    to: email,
    subject: "Confirm your GradLink email",
    text: `${hi}\n\nConfirm your email to finish creating your GradLink account:\n${link}\n\nThis link expires in ${VERIFY_TTL_HOURS} hours. If you didn't sign up for GradLink, you can ignore this email.`,
    html: `<p>${escapeHtml(hi)}</p><p>Confirm your email to finish creating your GradLink account.</p><p><a href="${link}">Confirm my email</a></p><p>This link expires in ${VERIFY_TTL_HOURS} hours. If you didn't sign up for GradLink, you can ignore this email.</p>`,
  });
}

/* ---------------- sign up ---------------- */
async function signUp(request: Request, body: Body): Promise<Response> {
  await takeHit(request, LIMITS.signUp);
  const role = body.role as SignUpRole;
  const fullName = str(body.fullName, 200);
  const email = str(body.email, 320);
  const organization = str(body.organization, 300);
  const emailLower = email.toLowerCase();

  if (!["student", "company", "college"].includes(role)) throw new HttpError(400, "Choose an account type.");
  if (!fullName) throw new HttpError(400, "Enter your full name.");
  if (!validEmail(email)) throw new HttpError(400, MSG.badEmail);
  if (!validPassword(body.password)) throw new HttpError(400, MSG.weak);

  const sql = db();
  const taken = await sql`select 1 from auth_credentials where email_lower = ${emailLower}`;
  if (taken.length) throw new HttpError(409, MSG.exists);

  const appRole: AppRole = role === "college" ? "event_manager" : role;
  const id = crypto.randomUUID();
  const hash = await hashPassword(body.password);

  // Role rows are keyed by the profile id, exactly as the Firestore docs were.
  const roleRow =
    role === "student"
      ? sql`insert into students (id, profile_id, full_name, email, university) values (${id}, ${id}, ${fullName}, ${email}, ${organization})`
      : role === "company"
        ? sql`insert into companies (id, profile_id, full_name, email, company) values (${id}, ${id}, ${fullName}, ${email}, ${organization})`
        : sql`insert into colleges (id, profile_id, full_name, email, institution) values (${id}, ${id}, ${fullName}, ${email}, ${organization})`;

  // No email provider means no way to confirm, so the account starts confirmed.
  const confirmNow = !emailEnabled();

  try {
    // One transaction, so a failure can no longer leave a half-created account.
    await sql.transaction([
      sql`insert into profiles (id, role, full_name, email, organization) values (${id}, ${appRole}, ${fullName}, ${email}, ${organization})`,
      sql`insert into auth_credentials (profile_id, email_lower, password_hash, email_verified_at)
          values (${id}, ${emailLower}, ${hash}, ${confirmNow ? new Date().toISOString() : null})`,
      roleRow,
    ]);
  } catch (err) {
    if ((err as { code?: string }).code === "23505") throw new HttpError(409, MSG.exists);
    throw err;
  }

  if (!confirmNow) {
    // Not signed in yet: the emailed link does that. If sending failed, the
    // account still exists and the page offers "Resend".
    const sent = await sendVerification(request, id, email, fullName);
    return json({ ok: true, verify: true, sent, email });
  }

  const profile = { profileId: id, role: appRole, name: fullName, org: organization };
  return withCookie({ ok: true, profile }, await sessionCookie(request, id, 1));
}

/* ---------------- email confirmation ---------------- */
async function verifyEmail(request: Request, body: Body): Promise<Response> {
  await takeHit(request, LIMITS.resetToken);
  const token = str(body.token, 200);
  if (!token) throw new HttpError(400, MSG.verifyExpired);
  const sql = db();

  // Consume the token atomically, so a link can't be used twice in parallel.
  const used = await sql`
    update email_verification_tokens set used_at = now()
    where token_hash = ${await sha256(token)} and used_at is null and expires_at > now()
    returning profile_id
  `;
  const profileId = used[0]?.profile_id as string | undefined;
  if (!profileId) throw new HttpError(400, MSG.verifyExpired);

  const [rows] = await sql.transaction([
    sql`update auth_credentials c set email_verified_at = coalesce(c.email_verified_at, now()), updated_at = now()
        from profiles p where p.id = c.profile_id and c.profile_id = ${profileId}
        returning c.session_version, p.role, p.full_name, p.organization`,
    // Any other link still sitting in the inbox stops working.
    sql`update email_verification_tokens set used_at = now() where profile_id = ${profileId} and used_at is null`,
  ]);
  const r = rows[0];
  if (!r) throw new HttpError(400, MSG.verifyExpired);

  // Opening the link proves the inbox, so it also signs this device in.
  const profile = { profileId, role: r.role as AppRole, name: (r.full_name as string) ?? "", org: (r.organization as string) ?? "" };
  return withCookie({ ok: true, profile }, await sessionCookie(request, profileId, r.session_version as number));
}

async function resendVerification(request: Request, body: Body): Promise<Response> {
  await takeHit(request, LIMITS.resetRequest);
  const emailLower = str(body.email, 320).toLowerCase();
  if (!validEmail(emailLower)) throw new HttpError(400, MSG.badEmail);
  if (!emailEnabled()) return json({ ok: true });

  const rows = await db()`
    select c.profile_id, p.email, p.full_name,
      (select count(*)::int from email_verification_tokens t
        where t.profile_id = c.profile_id and t.created_at > now() - interval '1 hour') as recent
    from auth_credentials c join profiles p on p.id = c.profile_id
    where c.email_lower = ${emailLower} and c.email_verified_at is null
  `;
  const r = rows[0];
  // Unknown, already confirmed and over-limit emails get the same answer as success.
  if (r && (r.recent as number) < VERIFY_EMAILS_PER_HOUR) {
    const sent = await sendVerification(request, r.profile_id as string, r.email as string, (r.full_name as string) ?? "");
    if (!sent) throw new HttpError(502, "Couldn't send the confirmation email. Please try again.");
  }
  return json({ ok: true });
}

/* ---------------- sign in ---------------- */
async function signIn(request: Request, body: Body): Promise<Response> {
  const emailLower = str(body.email, 320).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  if (!emailLower || !password) throw new HttpError(400, "Enter your email and password.");
  await assertUnderLimit(request, LIMITS.signInFailures);

  const sql = db();
  const rows = await sql`
    select c.profile_id, c.password_hash, c.session_version, c.failed_attempts, c.locked_until,
           c.email_verified_at, p.role, p.full_name, p.organization, p.email
    from auth_credentials c join profiles p on p.id = c.profile_id
    where c.email_lower = ${emailLower}
  `;
  const r = rows[0];
  if (!r) {
    await burnHashTime(password);
    await recordHit(request, LIMITS.signInFailures);
    throw new HttpError(401, MSG.badLogin);
  }
  if (r.locked_until && new Date(r.locked_until as string).getTime() > Date.now()) throw new HttpError(429, MSG.locked);
  if (!r.password_hash) {
    await recordHit(request, LIMITS.signInFailures);
    throw new HttpError(401, MSG.noPassword);
  }

  const ok = await verifyPassword(password, r.password_hash as string);
  if (!ok) {
    await recordHit(request, LIMITS.signInFailures);
    await sql`
      update auth_credentials set
        failed_attempts = case when failed_attempts + 1 >= ${MAX_FAILED_ATTEMPTS} then 0 else failed_attempts + 1 end,
        locked_until    = case when failed_attempts + 1 >= ${MAX_FAILED_ATTEMPTS}
                               then now() + make_interval(mins => ${LOCK_MINUTES}) else locked_until end
      where profile_id = ${r.profile_id}
    `;
    throw new HttpError(401, MSG.badLogin);
  }
  if ((r.failed_attempts as number) > 0 || r.locked_until) {
    await sql`update auth_credentials set failed_attempts = 0, locked_until = null where profile_id = ${r.profile_id}`;
  }
  // Checked only after a correct password, so it never reveals whether an email has an account.
  if (!r.email_verified_at && emailEnabled()) {
    throw new HttpError(
      403,
      `Confirm your email first. We sent a link to ${r.email as string}. Check your inbox and spam folder.`,
      "unverified",
    );
  }

  const profile = {
    profileId: r.profile_id as string,
    role: r.role as AppRole,
    name: (r.full_name as string) ?? "",
    org: (r.organization as string) ?? "",
  };
  return withCookie({ ok: true, profile }, await sessionCookie(request, profile.profileId, r.session_version as number));
}

/* ---------------- session ---------------- */
async function session(request: Request): Promise<Response> {
  const user = await currentUser(request);
  if (!user) return json({ user: null });
  return json({ user: { profileId: user.id, role: user.role, name: user.name, org: user.org, email: user.email } });
}

function signOut(request: Request): Response {
  return withCookie({ ok: true }, clearedSessionCookie(request));
}

/* ---------------- password reset ---------------- */
async function requestReset(request: Request, body: Body): Promise<Response> {
  const emailLower = str(body.email, 320).toLowerCase();
  if (!validEmail(emailLower)) throw new HttpError(400, MSG.badEmail);
  await takeHit(request, LIMITS.resetRequest);
  // Checked before the account lookup, so the answer never depends on whether the email exists.
  if (!emailEnabled()) throw new HttpError(503, "Password reset email isn't set up yet. Please contact your GradLink administrator.");

  const sql = db();
  const rows = await sql`
    select c.profile_id, p.email,
      (select count(*)::int from password_reset_tokens t
        where t.profile_id = c.profile_id and t.created_at > now() - interval '1 hour') as recent
    from auth_credentials c join profiles p on p.id = c.profile_id
    where c.email_lower = ${emailLower}
  `;
  const r = rows[0];
  // Unknown emails and over-limit requests get the same response as success.
  if (r && (r.recent as number) < RESETS_PER_HOUR) {
    const token = randomToken();
    await sql`
      insert into password_reset_tokens (token_hash, profile_id, expires_at)
      values (${await sha256(token)}, ${r.profile_id}, now() + make_interval(mins => ${RESET_TTL_MINUTES}))
    `;
    const link = `${appBase(request)}/reset-password?token=${encodeURIComponent(token)}`;
    const sent = await sendEmail({
      to: r.email as string,
      subject: "Reset your GradLink password",
      text: `Someone asked to reset the password for your GradLink account.\n\nSet a new password: ${link}\n\nThis link expires in ${RESET_TTL_MINUTES} minutes. If you didn't ask for this, you can ignore this email.`,
      html: `<p>Someone asked to reset the password for your GradLink account.</p><p><a href="${link}">Set a new password</a></p><p>This link expires in ${RESET_TTL_MINUTES} minutes. If you didn't ask for this, you can ignore this email.</p>`,
    });
    if (!sent) throw new HttpError(502, "Couldn't send the reset email. Please try again.");
  }
  return json({ ok: true });
}

async function verifyReset(request: Request, body: Body): Promise<Response> {
  const token = str(body.token, 200);
  if (!token) throw new HttpError(400, MSG.expired);
  await takeHit(request, LIMITS.resetToken);
  const rows = await db()`
    select p.email from password_reset_tokens t join profiles p on p.id = t.profile_id
    where t.token_hash = ${await sha256(token)} and t.used_at is null and t.expires_at > now()
  `;
  if (!rows[0]) throw new HttpError(400, MSG.expired);
  return json({ ok: true, email: rows[0].email });
}

async function confirmReset(request: Request, body: Body): Promise<Response> {
  const token = str(body.token, 200);
  if (!validPassword(body.password)) throw new HttpError(400, MSG.weak);
  await takeHit(request, LIMITS.resetToken);
  const sql = db();

  // Consume the token atomically first, so a link can't be used twice in parallel.
  const used = await sql`
    update password_reset_tokens set used_at = now()
    where token_hash = ${await sha256(token)} and used_at is null and expires_at > now()
    returning profile_id
  `;
  const profileId = used[0]?.profile_id as string | undefined;
  if (!profileId) throw new HttpError(400, "This reset link has expired. Request a new one from the sign-in page.");

  const hash = await hashPassword(body.password);
  await sql.transaction([
    // Bumping the session version signs out every other device.
    // The reset link arrived by email, so it also confirms the address.
    sql`update auth_credentials set password_hash = ${hash}, session_version = session_version + 1,
          failed_attempts = 0, locked_until = null, email_verified_at = coalesce(email_verified_at, now()), updated_at = now()
        where profile_id = ${profileId}`,
    sql`update password_reset_tokens set used_at = now() where profile_id = ${profileId} and used_at is null`,
    sql`update email_verification_tokens set used_at = now() where profile_id = ${profileId} and used_at is null`,
  ]);
  return json({ ok: true });
}

async function changePassword(request: Request, body: Body): Promise<Response> {
  const user = await currentUser(request);
  if (!user) throw new HttpError(401, "Your reset link has expired. Please request a new one.");
  if (Date.now() - user.signedInAt > RECENT_LOGIN_MS) {
    throw new HttpError(401, "For your security, sign in again before changing your password.");
  }
  if (!validPassword(body.password)) throw new HttpError(400, MSG.weak);

  const hash = await hashPassword(body.password);
  const rows = await db()`
    update auth_credentials set password_hash = ${hash}, session_version = session_version + 1, updated_at = now()
    where profile_id = ${user.id} returning session_version
  `;
  // Other devices are signed out; this one gets a fresh cookie.
  return withCookie({ ok: true }, await sessionCookie(request, user.id, rows[0].session_version as number));
}

/* ---------------- router ---------------- */
export async function handleAuth(action: string, request: Request): Promise<Response> {
  if (request.method === "GET" && action === "session") return session(request);
  if (request.method !== "POST") throw new HttpError(405, "Method not allowed.");

  const body = ((await request.json().catch(() => ({}))) ?? {}) as Body;
  switch (action) {
    case "sign-up": return signUp(request, body);
    case "sign-in": return signIn(request, body);
    case "sign-out": return signOut(request);
    case "verify-email": return verifyEmail(request, body);
    case "resend-verification": return resendVerification(request, body);
    case "reset-request": return requestReset(request, body);
    case "reset-verify": return verifyReset(request, body);
    case "reset-confirm": return confirmReset(request, body);
    case "change-password": return changePassword(request, body);
    default: throw new HttpError(404, "Not found.");
  }
}
