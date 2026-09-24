"use client";

import { useCallback, useEffect, useState } from "react";
import { getUnreadMessageCount } from "./db";

/** Broadcast that the user has read messages, so badges refresh immediately. */
const MSG_READ_EVT = "gl-messages-read";

export function notifyMessagesRead() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(MSG_READ_EVT));
}

const POLL_MS = 60_000;

/**
 * Live unread-message count for the given profile.
 * Refreshes on mount, on window focus, when messages are marked read
 * (via `notifyMessagesRead`), and on a light interval so new incoming
 * messages surface without a full reload.
 *
 * The interval skips hidden tabs: every poll is a database query, and a
 * background tab polling around the clock would stop Neon from ever scaling
 * to zero — burning the Free plan's compute hours for nobody.
 */
export function useUnreadMessages(profileId: string | null | undefined) {
  const [fetched, setFetched] = useState(0);

  const refresh = useCallback(async () => {
    if (!profileId) return;
    setFetched(await getUnreadMessageCount(profileId));
  }, [profileId]);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    const run = async () => {
      const n = await getUnreadMessageCount(profileId);
      if (!cancelled) setFetched(n);
    };
    run();

    const onFocus = () => run();
    window.addEventListener(MSG_READ_EVT, run);
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") run();
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.removeEventListener(MSG_READ_EVT, run);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [profileId]);

  // Signed out, or no profile yet: there is nothing unread by definition.
  return { count: profileId ? fetched : 0, refresh };
}
