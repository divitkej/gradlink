"use client";

import { rpc } from "./api-client";
import type { AppRole } from "./session";

/* ============================================================
   Event lifecycle — creating events, joining them, and listing
   the ones a given person can see.

   GradLink used to be pinned to a single hardcoded event id. Events
   are now real records owned by the college that created them, and
   students and employers join one with a short code.

   Each function calls the Worker (lib/server/rpc.ts), which runs
   against Neon. Join codes are generated there, so uniqueness is
   enforced by the database rather than a read-then-write.
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

/* ---------------- read ---------------- */

export async function getEvent(eventId: string): Promise<EventRow | null> {
  if (!eventId) return null;
  try {
    return await rpc<EventRow | null>("getEvent", eventId);
  } catch (e) {
    log("getEvent", e);
    return null;
  }
}

/** Every event this college has created, newest first. */
export async function listEventsForManager(managerProfileId: string): Promise<EventRow[]> {
  if (!managerProfileId) return [];
  try {
    return await rpc<EventRow[]>("listEventsForManager", managerProfileId);
  } catch (e) {
    log("listEventsForManager", e);
    return [];
  }
}

/** Every event this person has joined, most recent start date first. */
export async function listEventsForProfile(profileId: string): Promise<EventRow[]> {
  if (!profileId) return [];
  try {
    return await rpc<EventRow[]>("listEventsForProfile", profileId);
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
  if (!code.trim()) return null;
  try {
    return await rpc<EventRow | null>("getEventByCode", code);
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
  if (!input.title.trim()) return { ok: false, error: "Give your event a name." };
  if (!input.createdBy) return { ok: false, error: "We couldn't tell which account is creating this event." };
  try {
    return await rpc<{ ok: boolean; event?: EventRow; error?: string }>("createEvent", input);
  } catch (e) {
    log("createEvent", e);
    return { ok: false, error: "Couldn't create the event. Please try again." };
  }
}

export async function updateEvent(eventId: string, fields: Partial<Omit<EventRow, "id">>): Promise<boolean> {
  if (!eventId) return false;
  try {
    return await rpc<boolean>("updateEvent", eventId, fields);
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
  if (!code.trim()) return { ok: false, error: "Enter the event code your college gave you." };
  try {
    // The server registers the account under its real role; `role` is kept
    // in the signature so callers didn't have to change.
    return await rpc<{ ok: boolean; event?: EventRow; error?: string }>("joinEventByCode", code, profileId, role);
  } catch (e) {
    log("joinEventByCode", e);
    return { ok: false, error: "Couldn't join that event. Please try again." };
  }
}
