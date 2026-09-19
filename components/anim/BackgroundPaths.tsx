"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import { useMounted } from "./primitives";

/**
 * BackgroundPaths — adapted from 21st.dev (kokonutd/background-paths).
 * Flowing data-paths that suggest movement:
 * students → workshops → booths → employers → interviews → analytics.
 */
export default function BackgroundPaths({
  opacity = 0.5,
  color = "rgba(53,211,255,0.35)",
}: {
  opacity?: number;
  color?: string;
}) {
  const reduce = useReducedMotion();
  const mounted = useMounted();
  const animate = mounted && !reduce;

  const paths = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => {
      const y = 80 + i * 48;
      const sway = 40 + (i % 5) * 18;
      const d = `M -100 ${y} C 300 ${y - sway}, 600 ${y + sway}, 900 ${y - sway / 2} S 1500 ${y + sway}, 1700 ${y}`;
      return { d, i };
    });
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        opacity,
        pointerEvents: "none",
        maskImage: "radial-gradient(ellipse 80% 80% at 50% 40%, black 40%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 40%, black 40%, transparent 100%)",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1600 800"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        {paths.map(({ d, i }) => (
          <g key={i}>
            <path d={d} stroke={color} strokeWidth={1} strokeOpacity={0.4} fill="none" />
            {animate && (
              <motion.circle
                r={2.4}
                fill="var(--cyan)"
                initial={{ offsetDistance: "0%" }}
                animate={{ offsetDistance: "100%" }}
                transition={{
                  duration: 9 + (i % 6),
                  repeat: Infinity,
                  ease: "linear",
                  delay: i * 0.6,
                }}
                style={{
                  offsetPath: `path('${d}')`,
                  filter: "drop-shadow(0 0 6px var(--cyan))",
                } as React.CSSProperties}
              />
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
