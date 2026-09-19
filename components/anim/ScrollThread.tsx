"use client";

import { motion, useScroll } from "framer-motion";

/**
 * ScrollThread — a brand-colored "data line" that draws itself down the page
 * as you scroll, visually linking every section into one continuous journey.
 * Adapted from 21st/Skiper scroll-stroke patterns. Fixed, behind content,
 * pointer-events none. pathLength is driven directly by whole-page scroll
 * progress — Lenis already smooths the scroll, so no spring is needed (and
 * it avoids a perpetual rAF loop).
 */
export default function ScrollThread() {
  const { scrollYProgress: pathLength } = useScroll();

  return (
    <div
      aria-hidden
      className="scroll-thread"
      style={{
        position: "fixed",
        top: 0,
        bottom: 0,
        left: 0,
        width: 72,
        zIndex: 2,
        pointerEvents: "none",
        opacity: 0.7,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 72 1000"
        preserveAspectRatio="none"
        fill="none"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="thread-grad" x1="0" y1="0" x2="0" y2="1000" gradientUnits="userSpaceOnUse">
            <stop stopColor="#35D3FF" />
            <stop offset="0.5" stopColor="#00C2A8" />
            <stop offset="1" stopColor="#35D3FF" />
          </linearGradient>
        </defs>
        {/* faint static rail */}
        <path
          d="M 30 0 C 56 120, 8 240, 34 360 S 64 600, 28 720 S 10 900, 38 1000"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.8"
          vectorEffect="non-scaling-stroke"
        />
        {/* drawing thread */}
        <motion.path
          d="M 30 0 C 56 120, 8 240, 34 360 S 64 600, 28 720 S 10 900, 38 1000"
          stroke="url(#thread-grad)"
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
          style={{ pathLength, filter: "drop-shadow(0 0 5px rgba(53,211,255,0.6))" }}
        />
      </svg>
      <style>{`@media (max-width: 820px) { .scroll-thread { display: none; } }`}</style>
    </div>
  );
}
