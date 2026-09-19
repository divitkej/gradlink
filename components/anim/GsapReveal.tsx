"use client";

import { useRef, type ReactNode, type CSSProperties } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

/**
 * GSAP-powered staggered reveal. Animates its DIRECT children in with a
 * fade + rise on mount. Self-contained (no ScrollTrigger), respects
 * prefers-reduced-motion, and runs before paint so there's no flash.
 */
export default function GsapReveal({
  children,
  style,
  className,
  y = 22,
  stagger = 0.07,
  duration = 0.6,
  delay = 0.05,
  from = "start",
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  y?: number;
  stagger?: number;
  duration?: number;
  delay?: number;
  from?: "start" | "center";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
      const targets = gsap.utils.toArray<HTMLElement>(ref.current.children);
      if (!targets.length) return;
      gsap.from(targets, {
        autoAlpha: 0,
        y,
        duration,
        ease: "power3.out",
        delay,
        stagger: from === "center" ? { each: stagger, from: "center" } : stagger,
      });
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
