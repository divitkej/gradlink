"use client";

import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";

function Char({
  char,
  dist,
  progress,
}: {
  char: string;
  dist: number;
  progress: MotionValue<number>;
}) {
  const isSpace = char === " ";
  // At progress 0 letters are scattered; they converge as the heading enters view.
  const x = useTransform(progress, [0, 0.6], [dist * 36, 0]);
  const rotateX = useTransform(progress, [0, 0.6], [dist * 40, 0]);
  const y = useTransform(progress, [0, 0.6], [Math.abs(dist) * 14, 0]);
  const opacity = useTransform(progress, [0, 0.35], [0, 1]);

  return (
    <motion.span
      className="inline-block"
      style={{ x, y, rotateX, opacity, width: isSpace ? "0.4em" : undefined }}
    >
      {isSpace ? " " : char}
    </motion.span>
  );
}

/**
 * ScrollHeading — letters start scattered and converge into place driven by
 * scroll progress (adapted from Skiper31 ScrollAnimation). Hydration-safe:
 * at scroll progress 0 the computed transforms are identical on server and
 * first client render. Reduced motion is handled globally by MotionConfig.
 */
export default function ScrollHeading({
  text,
  className,
  style,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "start 0.4"],
  });
  const total = Array.from(text).length;
  const center = (total - 1) / 2;
  const words = text.split(" ");

  // Keep a global character index across all words so the converge effect
  // stays symmetric, while wrapping each word in a nowrap group so words
  // never split across lines.
  let idx = 0;

  return (
    <h2 ref={ref} className={className} style={{ perspective: 700, ...style }}>
      {words.map((word, wi) => {
        const wordEl = (
          <span key={`w${wi}`} style={{ display: "inline-block", whiteSpace: "nowrap" }}>
            {Array.from(word).map((c) => {
              const i = idx++;
              return <Char key={i} char={c} dist={i - center} progress={scrollYProgress} />;
            })}
          </span>
        );
        idx++; // account for the space that split() removed
        return wi < words.length - 1
          ? [wordEl, <span key={`s${wi}`}> </span>]
          : wordEl;
      })}
    </h2>
  );
}
