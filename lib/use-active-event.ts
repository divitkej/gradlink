"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "./session";
import { listVisibleEvents, type EventRow } from "./events";

/**
 * Resolves which event the dashboards are scoped to.
 *
 * Order of preference:
 *   1. the event the user explicitly selected (stored on the session)
 *   2. their only event, or the most recent one, if they haven't chosen
 *   3. none — the caller shows a "create or join an event" prompt
 *
 * `status === "none"` is a first-class state, not an error: a brand new
 * account genuinely belongs to no event until they create or join one.
 */
export type ActiveEventStatus = "loading" | "ready" | "none";

export interface ActiveEvent {
  status: ActiveEventStatus;
  /** Null whenever status isn't "ready". */
  eventId: string | null;
  event: EventRow | null;
  /** Everything the user could switch to. */
  events: EventRow[];
  selectEvent: (eventId: string) => void;
  refresh: () => void;
}

export function useActiveEvent(): ActiveEvent {
  const { session, ready, selectEvent } = useSession();
  // null means "not fetched yet", which is distinct from "fetched, and empty".
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [nonce, setNonce] = useState(0);

  const profileId = session?.profileId;
  const role = session?.role;
  const chosenId = session?.activeEventId ?? null;

  useEffect(() => {
    if (!ready || !profileId || !role) return;
    let cancelled = false;
    (async () => {
      const list = await listVisibleEvents(profileId, role);
      if (cancelled) return;
      setEvents(list);
      // Fall back to the newest event if nothing is chosen, or if the chosen
      // one has since been deleted or left.
      const chosenIsValid = chosenId && list.some((e) => e.id === chosenId);
      if (list.length && !chosenIsValid) selectEvent(list[0].id);
    })();
    return () => { cancelled = true; };
  }, [ready, profileId, role, chosenId, nonce, selectEvent]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  // Derived rather than stored, so there's no state to keep in sync.
  const status: ActiveEventStatus = !ready || !profileId
    ? "loading"
    : events === null
      ? "loading"
      : events.length === 0
        ? "none"
        : "ready";

  const list = events ?? [];
  const resolvedId = status === "ready" ? (chosenId ?? list[0]?.id ?? null) : null;

  return {
    status,
    eventId: resolvedId,
    event: list.find((e) => e.id === resolvedId) ?? null,
    events: list,
    selectEvent,
    refresh,
  };
}
