"use client";

import {
  collection, collectionGroup, doc, documentId, getDoc, getDocs, query, where,
  orderBy, setDoc, updateDoc, limit as fsLimit, type Firestore,
} from "firebase/firestore";
import { firestore } from "./firebase";
import type { AppRole } from "./session";

/* ============================================================
   Event lifecycle — creating events, joining them, and listing
   the ones a given person can see.

   GradLink used to be pinned to a single hardcoded event id. Events
   are now real records owned by the college that created them, and
   students and employers join one with a short code.
   ============================================================ */

export type EventStatus = "draft" | "upcoming" | "live" | "ended";

export interface EventRow {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: EventStatus;
  created_by: string | null;
  /** Denormalised so lists can show the host without a second read. */
  host_org?: string | null;
  join_code?: string | null;
  created_at?: string | null;
}

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  draft: "Draft",
  upcoming: "Upcoming",
  live: "Live now",
  ended: "Ended",
};

function log(scope: string, error: unknown) {
  if (error) console.warn(`[gradlink/events] ${scope}:`, error);
}

/**
 * Join codes get typed by hand off a slide or a poster, so the alphabet omits
 * the characters people confuse: 0/O and 1/I/L.
 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode(length = 6): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

async function uniqueJoinCode(db: Firestore): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const clash = await getDocs(query(collection(db, "events"), where("join_code", "==", code), fsLimit(1)));
    if (clash.empty) return code;
  }
  // Collisions at 31^6 are vanishingly rare; lengthen rather than loop forever.
  return randomCode(8);
}

function toRow(id: string, data: Record<string, unknown> | undefined): EventRow {
  return { ...(data ?? {}), id } as EventRow;
}

/* ---------------- read ---------------- */

export async function getEvent(eventId: string): Promise<EventRow | null> {
  const db = firestore();
  if (!db || !eventId) return null;
  try {
    const snap = await getDoc(doc(db, "events", eventId));
    return snap.exists() ? toRow(snap.id, snap.data()) : null;
  } catch (e) {
    log("getEvent", e);
    return null;
  }
}

/** Every event this college has created, newest first. */
export async function listEventsForManager(managerProfileId: string): Promise<EventRow[]> {
  const db = firestore();
  if (!db || !managerProfileId) return [];
  try {
    const snap = await getDocs(
      query(collection(db, "events"), where("created_by", "==", managerProfileId), orderBy("created_at", "desc"))
    );
    return snap.docs.map((d) => toRow(d.id, d.data()));
  } catch (e) {
    log("listEventsForManager", e);
    return [];
  }
}

/**
 * Every event this person has joined.
 *
 * Registrations live in a subcollection per event, so this is a collection-group
 * query across all of them — which needs the registrations.profile_id
 * collection-group index declared in firestore.indexes.json.
 */
export async function listEventsForProfile(profileId: string): Promise<EventRow[]> {
  const db = firestore();
  if (!db || !profileId) return [];
  try {
    const regs = await getDocs(
      query(collectionGroup(db, "registrations"), where("profile_id", "==", profileId))
    );
    const ids = Array.from(new Set(regs.docs.map((d) => d.get("event_id") as string).filter(Boolean)));
    if (!ids.length) return [];

    const out: EventRow[] = [];
    for (let i = 0; i < ids.length; i += 30) {
      const snap = await getDocs(
        query(collection(db, "events"), where(documentId(), "in", ids.slice(i, i + 30)))
      );
      snap.forEach((d) => out.push(toRow(d.id, d.data())));
    }
    return out.sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));
  } catch (e) {
    log("listEventsForProfile", e);
    return [];
  }
}

/** Everything the signed-in user should see in an event switcher. */
export async function listVisibleEvents(profileId: string, role: AppRole): Promise<EventRow[]> {
  if (role === "event_manager") {
    const [owned, joined] = await Promise.all([
      listEventsForManager(profileId),
      listEventsForProfile(profileId),
    ]);
    const seen = new Set(owned.map((e) => e.id));
    return [...owned, ...joined.filter((e) => !seen.has(e.id))];
  }
  return listEventsForProfile(profileId);
}

export async function getEventByCode(code: string): Promise<EventRow | null> {
  const db = firestore();
  if (!db || !code.trim()) return null;
  try {
    const snap = await getDocs(
      query(collection(db, "events"), where("join_code", "==", code.trim().toUpperCase()), fsLimit(1))
    );
    return snap.empty ? null : toRow(snap.docs[0].id, snap.docs[0].data());
  } catch (e) {
    log("getEventByCode", e);
    return null;
  }
}

/* ---------------- write ---------------- */

export interface CreateEventInput {
  title: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  status?: EventStatus;
  createdBy: string;
  hostOrg?: string;
}

/** Create an event owned by the calling college. */
export async function createEvent(
  input: CreateEventInput
): Promise<{ ok: boolean; event?: EventRow; error?: string }> {
  const db = firestore();
  if (!db) return { ok: false, error: "GradLink isn't connected yet." };
  if (!input.title.trim()) return { ok: false, error: "Give your event a name." };
  if (!input.createdBy) return { ok: false, error: "We couldn't tell which account is creating this event." };

  try {
    const ref = doc(collection(db, "events"));
    const joinCode = await uniqueJoinCode(db);
    const row: Omit<EventRow, "id"> = {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      location: input.location?.trim() || null,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      status: input.status ?? "upcoming",
      created_by: input.createdBy,
      host_org: input.hostOrg ?? null,
      join_code: joinCode,
      created_at: new Date().toISOString(),
    };
    await setDoc(ref, row);

    // The organiser is registered into their own event so it appears in their
    // event list the same way a joined event does.
    await setDoc(doc(db, "events", ref.id, "registrations", input.createdBy), {
      created_at: new Date().toISOString(),
      event_id: ref.id,
      profile_id: input.createdBy,
      role: "event_manager",
      checked_in: true,
    });

    return { ok: true, event: { ...row, id: ref.id } };
  } catch (e) {
    log("createEvent", e);
    return { ok: false, error: "Couldn't create the event. Please try again." };
  }
}

export async function updateEvent(eventId: string, fields: Partial<Omit<EventRow, "id">>): Promise<boolean> {
  const db = firestore();
  if (!db || !eventId) return false;
  try {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) if (v !== undefined) clean[k] = v;
    await updateDoc(doc(db, "events", eventId), clean);
    return true;
  } catch (e) {
    log("updateEvent", e);
    return false;
  }
}

/** Join an event by its short code. Idempotent — re-joining is a no-op. */
export async function joinEventByCode(
  code: string,
  profileId: string,
  role: AppRole
): Promise<{ ok: boolean; event?: EventRow; error?: string }> {
  const db = firestore();
  if (!db) return { ok: false, error: "GradLink isn't connected yet." };
  if (!code.trim()) return { ok: false, error: "Enter the event code your college gave you." };

  const event = await getEventByCode(code);
  if (!event) return { ok: false, error: "No event matches that code. Check it and try again." };
  if (event.status === "ended") return { ok: false, error: `${event.title} has already finished.` };

  try {
    await setDoc(
      doc(db, "events", event.id, "registrations", profileId),
      {
        created_at: new Date().toISOString(),
        event_id: event.id,
        profile_id: profileId,
        role,
        checked_in: false,
      },
      { merge: true }
    );

    if (role === "student") {
      await setDoc(
        doc(db, "events", event.id, "analytics", profileId),
        {
          event_id: event.id,
          student_id: profileId,
          profile_views: 0,
          company_scans: 0,
          shortlists: 0,
          messages_received: 0,
          resume_score: 0,
          engagement_score: 0,
        },
        { merge: true }
      );
    }
    return { ok: true, event };
  } catch (e) {
    log("joinEventByCode", e);
    return { ok: false, error: "Couldn't join that event. Please try again." };
  }
}
