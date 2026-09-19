"use client";

import { useCallback, useSyncExternalStore } from "react";
import { signOut as fbSignOut } from "firebase/auth";
import { firebaseAuth } from "./firebase";
import { useHydrated } from "./use-hydrated";

/** App-level role vocabulary used across the platform. */
export type AppRole = "student" | "company" | "event_manager";

export const ROLE_LABEL: Record<AppRole, string> = {
  student: "Student",
  company: "Company",
  event_manager: "Event Manager",
};

/**
 * The signed-in user, mirrored into localStorage so the UI can paint
 * immediately instead of waiting on a Firestore read. Firebase Auth remains
 * the source of truth for access — this is a cache, not a credential.
 */
export interface GLSession {
  role: AppRole;
  profileId: string;
  name: string;
  org: string;
  /**
   * Which event the dashboards are currently scoped to. Null until the user
   * has joined or created one — the UI prompts rather than guessing.
   */
  activeEventId: string | null;
}

const KEY = "gradlink.session";
const EVT = "gl-session-change";

/* ------------------------------------------------------------------
   localStorage is an external store, so the session is exposed through
   useSyncExternalStore rather than an effect that copies it into state.

   useSyncExternalStore compares snapshots by reference, so a fresh
   JSON.parse on every read would loop forever. These two module-level
   values memoise the parse against the raw string it came from.
   ------------------------------------------------------------------ */
let cachedRaw: string | null = null;
let cachedSession: GLSession | null = null;

function parse(raw: string | null): GLSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<GLSession>;
    if (!parsed.profileId || !parsed.role) return null;
    // activeEventId was added later; tolerate sessions saved before it existed.
    return { name: "", org: "", activeEventId: null, ...parsed } as GLSession;
  } catch {
    return null;
  }
}

export function getSession(): GLSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSession = parse(raw);
  }
  return cachedSession;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const serverSnapshot = () => null;

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

/** Point the dashboards at a different event. */
export function setActiveEvent(eventId: string | null) {
  const cur = getSession();
  if (!cur || cur.activeEventId === eventId) return;
  setSession({ ...cur, activeEventId: eventId });
}

/** Read the active event outside React. */
export function getActiveEventId(): string | null {
  return getSession()?.activeEventId ?? null;
}

/** Live session, kept in sync across tabs and within the app. */
export function useSession() {
  const session = useSyncExternalStore(subscribe, getSession, serverSnapshot);
  // Guards against redirecting a signed-in user before localStorage is readable.
  const ready = useHydrated();

  const update = useCallback((s: GLSession) => setSession(s), []);
  const selectEvent = useCallback((eventId: string | null) => setActiveEvent(eventId), []);

  const signOut = useCallback(() => {
    clearSession();
    // Drop the Firebase session too, or the user stays authenticated to
    // Firestore and the security rules keep granting them access.
    const auth = firebaseAuth();
    if (auth) fbSignOut(auth).catch(() => {});
  }, []);

  return { session, ready, setSession: update, selectEvent, signOut };
}
