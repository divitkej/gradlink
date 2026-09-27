"use client";

import { api, ApiError } from "./api-client";
import type { AppRole } from "./session";

/* ============================================================
   Authentication — email + password, handled by the Worker
   (/api/auth/* → lib/server/auth-api.ts) against Neon.

   Replaces Firebase Auth. The signed-in state is an HttpOnly session
   cookie the browser can't read or forge; lib/session.ts keeps a
   localStorage copy of the profile purely so the UI paints instantly.
   ============================================================ */

export type Role = "student" | "company" | "college";

/** Maps each role to its table and the org-name column. */
export const ROLE_TABLE: Record<Role, { table: string; orgColumn: string }> = {
  student: { table: "students", orgColumn: "university" },
  company: { table: "companies", orgColumn: "company" },
  college: { table: "colleges", orgColumn: "institution" },
};

export interface SignUpInput {
  role: Role;
  fullName: string;
  email: string;
  password: string;
  /** University (students), company (companies), or institution (colleges). */
  organization: string;
}

export interface SignedInProfile {
  profileId: string;
  role: AppRole;
  name: string;
  org: string;
}

/** The server's messages are written for people; network failures aren't. */
function friendlyError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Network problem. Check your connection and try again.";
}

/**
 * Creates the account, its profile and its role row in one transaction.
 * When the server can send email, the account must be confirmed first:
 * `verify` is true and `sent` says whether the link went out. Otherwise the
 * user is signed in straight away and `profileId` is set. The profile id is
 * the account id throughout GradLink.
 */
export async function signUpUser(
  input: SignUpInput
): Promise<{ ok: boolean; error?: string; profileId?: string; verify?: boolean; sent?: boolean }> {
  try {
    const res = await api<{ profile?: SignedInProfile; verify?: boolean; sent?: boolean }>("/api/auth/sign-up", input);
    if (res.verify) return { ok: true, verify: true, sent: res.sent };
    return { ok: true, profileId: res.profile!.profileId };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
}

/** Opens the link from the confirmation email. Signs this device in. */
export async function verifyEmail(token: string): Promise<{ ok: boolean; error?: string; profile?: SignedInProfile }> {
  try {
    const res = await api<{ profile: SignedInProfile }>("/api/auth/verify-email", { token });
    return { ok: true, profile: res.profile };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
}

/** Emails a fresh confirmation link to an account that hasn't confirmed yet. */
export async function resendVerification(email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await api("/api/auth/resend-verification", { email: email.trim() });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
}

/**
 * Email + password sign-in. Returns the profile, so no second lookup is needed.
 * `unverified` means the password was right but the email isn't confirmed yet.
 */
export async function signIn(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string; uid?: string; profile?: SignedInProfile; unverified?: boolean }> {
  try {
    const res = await api<{ profile: SignedInProfile }>("/api/auth/sign-in", { email: email.trim(), password });
    return { ok: true, uid: res.profile.profileId, profile: res.profile };
  } catch (err) {
    return { ok: false, error: friendlyError(err), unverified: err instanceof ApiError && err.code === "unverified" };
  }
}

/** Email a password-reset link that opens /reset-password. */
export async function sendReset(email: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await api("/api/auth/reset-request", { email: email.trim() });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
}

/** Validate the `token` from a password-reset email link. */
export async function verifyResetCode(token: string): Promise<{ ok: boolean; email?: string; error?: string }> {
  try {
    const res = await api<{ email: string }>("/api/auth/reset-verify", { token });
    return { ok: true, email: res.email };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
}

/** Complete a password reset using the `token` from the email link. */
export async function confirmReset(token: string, password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await api("/api/auth/reset-confirm", { token, password });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
}

/** Set a new password for the currently signed-in user. */
export async function setNewPassword(password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await api("/api/auth/change-password", { password });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
}

export async function signOutUser(): Promise<void> {
  await api("/api/auth/sign-out", {}).catch(() => {});
}

/** The account behind the current session cookie, or null when signed out. */
export async function getCurrentUser(): Promise<(SignedInProfile & { email: string }) | null> {
  try {
    const res = await api<{ user: (SignedInProfile & { email: string }) | null }>("/api/auth/session");
    return res.user;
  } catch {
    return null;
  }
}
