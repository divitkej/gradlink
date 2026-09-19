"use client";

import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";
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
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </MotionTag>
  );
}

/* ---------- Stagger container + item ---------- */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export function Stagger({
  children,
  className,
  style,
  amount = 0.2,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  amount?: number;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div variants={staggerItem} className={className} style={style}>
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
  color = "var(--cyan)",
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
  return (
    <div
      style={{
        height,
        background: track,
        borderRadius: "var(--r-full)",
        overflow: "hidden",
      }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${value}%` }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{ duration: reduce ? 0 : 1.1, ease: EASE, delay: reduce ? 0 : delay }}
        style={{
          height: "100%",
          background: color,
          borderRadius: "var(--r-full)",
          boxShadow: `0 0 12px ${color}`,
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
  accent = "var(--cyan)",
}: {
  badge: string;
  title: ReactNode;
  subtitle?: string;
  align?: "left" | "center";
  accent?: string;
}) {
  return (
    <div
      style={{
        textAlign: align,
        maxWidth: align === "center" ? 720 : 760,
        marginLeft: align === "center" ? "auto" : 0,
        marginRight: align === "center" ? "auto" : 0,
      }}
    >
      <Reveal>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: accent,
            background: "rgba(53,211,255,0.08)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--r-full)",
            padding: "5px 14px",
            marginBottom: 20,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: accent,
              boxShadow: `0 0 8px ${accent}`,
            }}
          />
          {badge}
        </span>
      </Reveal>
      <Reveal delay={0.08}>
        <h2
          style={{
            fontSize: "clamp(28px, 3.6vw, 44px)",
            fontWeight: 700,
            lineHeight: 1.12,
            color: "var(--text)",
            marginBottom: subtitle ? 16 : 0,
          }}
        >
          {title}
        </h2>
      </Reveal>
      {subtitle && (
        <Reveal delay={0.16}>
          <p
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
          </p>
        </Reveal>
      )}
    </div>
  );
}
