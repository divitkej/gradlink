"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/* ---------- useMounted (hydration-safe client gate) ---------- */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // setTimeout (not rAF) so it still fires in a hidden/background tab —
    // rAF is paused when the tab isn't visible, which would stall mount-gated UI.
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, []);
  return mounted;
}

/* ---------- Reveal (single element) ---------- */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  style,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  style?: React.CSSProperties;
  as?: "div" | "section" | "li";
}) {
  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </MotionTag>
  );
}

/* ---------- RevealGroup + RevealItem (staggered in-view reveal) ---------- */
const revealItem = {
  hidden: (y: number) => ({ opacity: 0, y }),
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export function RevealGroup({
  children,
  stagger = 0.08,
  delay = 0,
  className,
  style,
}: {
  children: ReactNode;
  stagger?: number;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children,
  y = 20,
  className,
  style,
}: {
  children: ReactNode;
  y?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div className={className} style={style} custom={y} variants={revealItem}>
      {children}
    </motion.div>
  );
}

/* ---------- CountUp (animates when in view) ---------- */
export function CountUp({
  to,
  suffix = "",
  prefix = "",
  duration = 1400,
  decimals = 0,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      const id = requestAnimationFrame(() => setVal(to));
      return () => cancelAnimationFrame(id);
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(to * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setVal(to);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration, reduce]);

  const display =
    decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString();

  return (
    <span ref={ref} style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

/* ---------- Animated progress bar (fills in view) ---------- */
export function AnimatedBar({
  value,
  color = "var(--accent)",
  track = "rgba(255,255,255,0.08)",
  height = 8,
  delay = 0,
}: {
  value: number;
  color?: string;
  track?: string;
  height?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  // Watch the track, not the fill: a zero-width fill near the screen edge
  // never counts as in view, so the bar would stay empty on phones.
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  return (
    <div
      ref={ref}
      style={{
        height,
        background: track,
        borderRadius: "var(--r-full)",
        overflow: "hidden",
        // Own layer, so Safari clips the sliding fill to the rounded track.
        transform: "translateZ(0)",
      }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* The fill is sized once and slides in on a transform, so filling the
          bar never re-lays out the page (animating width stuttered on phones). */}
      <motion.div
        initial={{ x: "-101%" }}
        animate={{ x: inView ? "0%" : "-101%" }}
        transition={{ duration: reduce ? 0 : 1.1, ease: EASE, delay: reduce ? 0 : delay }}
        style={{
          height: "100%",
          width: `${value}%`,
          background: color,
          borderRadius: "var(--r-full)",
          transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)",
          willChange: "transform",
        }}
      />
    </div>
  );
}

/* ---------- Section heading block ---------- */
export function SectionHeading({
  badge,
  title,
  subtitle,
  align = "left",
  accent = "var(--accent)",
}: {
  badge: string;
  title: ReactNode;
  subtitle?: string;
  align?: "left" | "center";
  accent?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
      style={{
        textAlign: align,
        maxWidth: align === "center" ? 720 : 760,
        marginLeft: align === "center" ? "auto" : 0,
        marginRight: align === "center" ? "auto" : 0,
      }}
    >
        <motion.span
          custom={12}
          variants={revealItem}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: accent,
            marginBottom: 20,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: accent,
            }}
          />
          {badge}
        </motion.span>
        <motion.h2
          custom={20}
          variants={revealItem}
          style={{
            fontSize: "clamp(28px, 3.6vw, 44px)",
            fontWeight: 700,
            lineHeight: 1.12,
            color: "var(--text)",
            marginBottom: subtitle ? 16 : 0,
          }}
        >
          {title}
        </motion.h2>
      {subtitle && (
          <motion.p
            custom={20}
            variants={revealItem}
            style={{
              fontSize: 17,
              lineHeight: 1.7,
              color: "var(--text-2)",
              maxWidth: 640,
              marginLeft: align === "center" ? "auto" : 0,
              marginRight: align === "center" ? "auto" : 0,
            }}
          >
            {subtitle}
          </motion.p>
      )}
    </motion.div>
  );
}
