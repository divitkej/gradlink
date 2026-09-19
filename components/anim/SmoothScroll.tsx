"use client";

import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "framer-motion";

/**
 * Lenis smooth scroll (root). Disabled to native instant scroll under
 * prefers-reduced-motion. Root mode renders children without an extra
 * wrapper element, so it stays hydration-safe.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <ReactLenis
      root
      options={{
        lerp: reduce ? 1 : 0.09,
        duration: reduce ? 0 : 1.15,
        smoothWheel: !reduce,
      }}
    >
      {children}
    </ReactLenis>
  );
}
