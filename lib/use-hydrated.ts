"use client";

import { useSyncExternalStore } from "react";

/** No external source to watch — this value flips exactly once, at hydration. */
const noop = () => () => {};

/**
 * False during SSR and the hydration pass, true from the first client render on.
 *
 * Lets a component read browser-only values (localStorage, window.location)
 * without an effect, and without a hydration mismatch.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false
  );
}
