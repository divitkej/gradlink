"use client";

import { useEffect, useState, useCallback } from "react";
import { signOut as fbSignOut } from "firebase/auth";
import { firebaseAuth } from "./firebase";

/** App-level role vocabulary used by the event platform. */
export type AppRole = "student" | "company" | "event_manager";

/** The single demo/career-fair event everything is seeded against. */
export const DEMO_EVENT_ID = "e0000000-0000-0000-0000-000000000001";
export const DEMO_EVENT_TITLE = "Abu Dhabi Career Fair 2025";

/** Seeded demo identities — one per role, all connected to Supabase rows. */
export const DEMO_IDENTITIES: Record<
  AppRole,
  { profileId: string; name: string; org: string; subtitle: string }
> = {
  student: {
    profileId: "a0000000-0000-0000-0000-000000000001",
    name: "Sara Al Rashidi",
    org: "Abu Dhabi University",
    subtitle: "Business Administration · Year 3",
  },
  company: {
    profileId: "b0000000-0000-0000-0000-000000000001",
    name: "Careem",
    org: "Careem",
    subtitle: "Recruiting · Booth B12",
  },
  event_manager: {
    profileId: "c0000000-0000-0000-0000-000000000001",
    name: "Aisha Al Marri",
    org: "Abu Dhabi University Career Center",
    subtitle: "Event manager · Live monitor",
  },
};

export const ROLE_LABEL: Record<AppRole, string> = {
  student: "Student",
  company: "Company",
  event_manager: "Event Manager",
};

export interface GLSession {
  role: AppRole;
  profileId: string;
  name: string;
  org: string;
  mode: "demo" | "auth";
}

const KEY = "gradlink.session";
const EVT = "gl-session-change";

export function getSession(): GLSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GLSession) : null;
  } catch {
    return null;
  }
}

export function setSession(s: GLSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event(EVT));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVT));
}

/** Start a demo session for the given role using the seeded persona (Sara / Careem / Aisha). */
export function startDemo(role: AppRole): GLSession {
  const id = DEMO_IDENTITIES[role];
  const s: GLSession = {
    role,
    profileId: id.profileId,
    name: id.name,
    org: id.org,
    mode: "demo",
  };
  setSession(s);
  return s;
}

/**
 * Switch the active role.
 * - Pure demo session (or none) → adopt that role's seeded persona.
 * - Real signed-in session ("auth") → KEEP the person's name/org, only swap the
 *   role and the seeded data profile so their identity follows them across views.
 */
export function switchRole(role: AppRole): GLSession {
  const cur = getSession();
  if (!cur || cur.mode === "demo") return startDemo(role);
  const id = DEMO_IDENTITIES[role];
  const s: GLSession = { role, profileId: id.profileId, name: cur.name, org: cur.org, mode: "auth" };
  setSession(s);
  return s;
}

/** React hook — live session that updates across tabs and within the app. */
export function useSession() {
  const [session, setLocal] = useState<GLSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocal(getSession());
    setReady(true);
    const sync = () => setLocal(getSession());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((s: GLSession) => {
    setSession(s);
    setLocal(s);
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setLocal(null);
    // Drop the Firebase session too, or the user stays authenticated to
    // Firestore and the security rules keep granting them access.
    const auth = firebaseAuth();
    if (auth) fbSignOut(auth).catch(() => {});
  }, []);

  return { session, ready, setSession: update, startDemo: (r: AppRole) => update(startDemo(r)), signOut };
}
