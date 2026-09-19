"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  updatePassword,
  signOut as fbSignOut,
  fetchSignInMethodsForEmail,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { firebaseAuth, firestore, isFirebaseConfigured } from "./firebase";

export { isFirebaseConfigured };

export type Role = "student" | "company" | "college";

/** Maps each role to its Firestore collection and the org-name field. */
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

const NOT_CONFIGURED = "GradLink isn't connected yet — add your Firebase keys to .env.local (see README).";

/** Turn a Firebase auth error code into something a human can act on. */
function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists — please sign in instead.";
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/weak-password":
      return "That password is too weak. Use at least 8 characters.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network problem — check your connection and try again.";
    default:
      return (err as { message?: string })?.message ?? "Something went wrong. Please try again.";
  }
}

/**
 * Creates the Firebase Auth user and all of their Firestore documents.
 *
 * The auth uid IS the profile id throughout GradLink — that's what lets the
 * security rules say `request.auth.uid == profileId` without an extra lookup.
 */
export async function signUpUser({
  role, fullName, email, password, organization,
}: SignUpInput): Promise<{ ok: boolean; error?: string; profileId?: string }> {
  const auth = firebaseAuth();
  const db = firestore();
  if (!auth || !db) return { ok: false, error: NOT_CONFIGURED };

  const appRole = role === "college" ? "event_manager" : role;
  const { table, orgColumn } = ROLE_TABLE[role];
  const emailTrimmed = email.trim();
  const emailLower = emailTrimmed.toLowerCase();

  let user: User;
  try {
    const cred = await createUserWithEmailAndPassword(auth, emailTrimmed, password);
    user = cred.user;
  } catch (err) {
    return { ok: false, error: friendlyAuthError(err) };
  }

  const profileId = user.uid;
  const now = new Date().toISOString();

  try {
    await setDoc(doc(db, "profiles", profileId), {
      created_at: now,
      auth_uid: profileId,
      role: appRole,
      full_name: fullName,
      email: emailTrimmed,
      email_lower: emailLower,
      organization,
      avatar_url: null,
    });

    await setDoc(doc(db, table, profileId), {
      created_at: now,
      profile_id: profileId,
      auth_uid: profileId,
      full_name: fullName,
      email: emailTrimmed,
      email_lower: emailLower,
      [orgColumn]: organization,
    });

    // A new account belongs to no event yet. Students and employers join one
    // with the code their college shares; colleges create their own. Signing up
    // no longer drops everyone into a single shared event.
  } catch {
    // The auth account exists but its data didn't land. Say so plainly rather
    // than reporting success against a half-created account.
    return {
      ok: false,
      error: "Your account was created but we couldn't finish setting up your workspace. Please sign in to retry.",
    };
  }

  return { ok: true, profileId };
}

/** Email + password sign-in. */
export async function signIn(email: string, password: string): Promise<{ ok: boolean; error?: string; uid?: string }> {
  const auth = firebaseAuth();
  if (!auth) return { ok: false, error: NOT_CONFIGURED };
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return { ok: true, uid: cred.user.uid };
  } catch (err) {
    return { ok: false, error: friendlyAuthError(err) };
  }
}

/** Send a password-reset email that returns the user to /reset-password. */
export async function sendReset(email: string): Promise<{ ok: boolean; error?: string }> {
  const auth = firebaseAuth();
  if (!auth) return { ok: false, error: NOT_CONFIGURED };
  try {
    await sendPasswordResetEmail(auth, email.trim(), {
      url: typeof window !== "undefined" ? `${window.location.origin}/sign-in` : "https://gradlink-theta.vercel.app/sign-in",
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: friendlyAuthError(err) };
  }
}

/**
 * Validate the `oobCode` from a password-reset email link.
 * Requires the Firebase console's action URL to point at /reset-password.
 */
export async function verifyResetCode(oobCode: string): Promise<{ ok: boolean; email?: string; error?: string }> {
  const auth = firebaseAuth();
  if (!auth) return { ok: false, error: NOT_CONFIGURED };
  try {
    const email = await verifyPasswordResetCode(auth, oobCode);
    return { ok: true, email };
  } catch {
    return { ok: false, error: "This reset link has expired or has already been used. Request a new one from the sign-in page." };
  }
}

/** Complete a password reset using the `oobCode` from the email link. */
export async function confirmReset(oobCode: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const auth = firebaseAuth();
  if (!auth) return { ok: false, error: NOT_CONFIGURED };
  try {
    await confirmPasswordReset(auth, oobCode, password);
    return { ok: true };
  } catch (err) {
    const code = (err as { code?: string })?.code ?? "";
    if (/expired|invalid/i.test(code)) {
      return { ok: false, error: "This reset link has expired. Request a new one from the sign-in page." };
    }
    return { ok: false, error: friendlyAuthError(err) };
  }
}

/** Set a new password for the currently signed-in user. */
export async function setNewPassword(password: string): Promise<{ ok: boolean; error?: string }> {
  const auth = firebaseAuth();
  if (!auth?.currentUser) return { ok: false, error: "Your reset link has expired. Please request a new one." };
  try {
    await updatePassword(auth.currentUser, password);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: friendlyAuthError(err) };
  }
}

export async function signOutUser(): Promise<void> {
  const auth = firebaseAuth();
  if (auth) await fbSignOut(auth);
}

/**
 * Look up a profile document by auth uid, falling back to an email match for
 * accounts whose uid and profile id diverged before the migration.
 */
export async function getProfileForUser(
  uid: string,
  email?: string | null
): Promise<{ profileId: string; role: string; name: string; org: string } | null> {
  const db = firestore();
  if (!db) return null;
  try {
    const direct = await getDoc(doc(db, "profiles", uid));
    if (direct.exists()) {
      const d = direct.data() as Record<string, string | null>;
      return {
        profileId: direct.id,
        role: (d.role as string) ?? "student",
        name: (d.full_name as string) ?? "",
        org: (d.organization as string) ?? "",
      };
    }
    if (email) {
      const snap = await getDocs(
        query(collection(db, "profiles"), where("email_lower", "==", email.trim().toLowerCase()), limit(1))
      );
      if (!snap.empty) {
        const d = snap.docs[0];
        const data = d.data() as Record<string, string | null>;
        return {
          profileId: d.id,
          role: (data.role as string) ?? "student",
          name: (data.full_name as string) ?? "",
          org: (data.organization as string) ?? "",
        };
      }
    }
  } catch {
    /* fall through to null so the caller can show its own error */
  }
  return null;
}

/** Whether an email already has an account (used for friendlier sign-up errors). */
export async function emailExists(email: string): Promise<boolean> {
  const auth = firebaseAuth();
  if (!auth) return false;
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email.trim());
    return methods.length > 0;
  } catch {
    return false;
  }
}
