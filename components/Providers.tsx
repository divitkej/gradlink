"use client";

import { MotionConfig } from "framer-motion";
import SmoothScroll from "./anim/SmoothScroll";
import ScrollSync from "./anim/ScrollSync";

/**
 * - MotionConfig reducedMotion="user": Framer respects prefers-reduced-motion
 *   globally (skips transform/layout animations) WITHOUT per-component `initial`
 *   branching that would break SSR hydration.
 * - SmoothScroll: Lenis-powered smooth scrolling (auto-disabled for reduced motion).
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <SmoothScroll>
        <ScrollSync />
        {children}
      </SmoothScroll>
    </MotionConfig>
  );
}
