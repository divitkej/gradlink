"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * AnimatedTextCycle — adapted from 21st.dev (thimows/animated-text-cycle).
 * Cycles through phrases with a soft vertical blur-fade.
 */
export default function AnimatedTextCycle({
  phrases,
  interval = 2200,
  className,
  color = "var(--accent)",
}: {
  phrases: string[];
  interval?: number;
  className?: string;
  color?: string;
}) {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % phrases.length), interval);
    return () => clearInterval(id);
  }, [phrases.length, interval, reduce]);

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        position: "relative",
        color,
        fontWeight: 700,
      }}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0, y: "0.4em", filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: "-0.4em", filter: "blur(6px)" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ whiteSpace: "nowrap" }}
        >
          {phrases[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
