"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { useMounted } from "../anim/primitives";

/* ---------- Button ---------- */
export function Button({
  children,
  variant = "primary",
  href,
  onClick,
  ariaLabel,
  className,
  icon,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  href?: string;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
  icon?: ReactNode;
}) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: "var(--font-display)",
    fontSize: 15,
    fontWeight: 600,
    height: 48,
    padding: "0 26px",
    borderRadius: "var(--r-md)",
    cursor: "pointer",
    textDecoration: "none",
    transition: "transform 0.18s ease, box-shadow 0.25s ease, background 0.2s ease",
    border: "1px solid transparent",
    whiteSpace: "nowrap",
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      color: "#021016",
      background: "linear-gradient(100deg, var(--cyan), var(--teal))",
      boxShadow: "0 0 0 1px rgba(53,211,255,0.4), 0 8px 30px rgba(0,194,168,0.32)",
    },
    secondary: {
      color: "var(--text)",
      background: "var(--glass)",
      borderColor: "var(--border)",
      backdropFilter: "blur(10px)",
    },
    ghost: {
      color: "var(--text-2)",
      background: "transparent",
    },
  };

  const hoverGlow =
    variant === "primary"
      ? "0 0 0 1px rgba(53,211,255,0.6), 0 12px 44px rgba(0,194,168,0.5)"
      : variant === "secondary"
      ? "0 0 0 1px var(--border-strong), 0 10px 32px rgba(53,211,255,0.18)"
      : "none";

  const style = { ...base, ...variants[variant] };
  const Comp = href ? motion.a : motion.button;

  return (
    <Comp
      href={href}
      onClick={onClick}
      aria-label={ariaLabel}
      className={className}
      style={style}
      whileHover={{ y: -2, boxShadow: hoverGlow }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
    >
      {children}
      {icon}
    </Comp>
  );
}

/* ---------- GlassCard ---------- */
export function GlassCard({
  children,
  className,
  style,
  padding = 24,
  elevated = false,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  padding?: number;
  elevated?: boolean;
}) {
  return (
    <div
      className={className}
      style={{
        background: elevated ? "var(--surface-elev)" : "var(--glass)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ---------- SpotlightCard (cursor-aware glow + lift) ---------- */
export function SpotlightCard({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const mounted = useMounted();
  const animate = mounted && !reduce;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--mx", `${e.clientX - r.left}px`);
    ref.current.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      className={className}
      style={{
        position: "relative",
        background: "var(--glass)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
        transition: "border-color 0.25s ease",
        ...style,
      }}
      whileHover={animate ? { y: -4, borderColor: "var(--border-strong)" } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
    >
      {animate && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(420px circle at var(--mx, 50%) var(--my, 0%), rgba(53,211,255,0.10), transparent 60%)",
          }}
        />
      )}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </motion.div>
  );
}

/* ---------- Badge ---------- */
export function Badge({
  children,
  tone = "cyan",
  pulse = false,
}: {
  children: ReactNode;
  tone?: "cyan" | "teal" | "amber" | "muted";
  pulse?: boolean;
}) {
  const tones: Record<string, { fg: string; bg: string; bd: string }> = {
    cyan: { fg: "var(--cyan)", bg: "rgba(53,211,255,0.10)", bd: "rgba(53,211,255,0.28)" },
    teal: { fg: "var(--teal)", bg: "rgba(0,194,168,0.10)", bd: "rgba(0,194,168,0.28)" },
    amber: { fg: "var(--amber)", bg: "rgba(247,201,72,0.10)", bd: "rgba(247,201,72,0.30)" },
    muted: { fg: "var(--text-2)", bg: "rgba(255,255,255,0.05)", bd: "var(--border)" },
  };
  const t = tones[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        fontWeight: 600,
        color: t.fg,
        background: t.bg,
        border: `1px solid ${t.bd}`,
        borderRadius: "var(--r-full)",
        padding: "3px 10px",
        whiteSpace: "nowrap",
      }}
    >
      {pulse && (
        <span
          className="pulse-dot"
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: t.fg,
            boxShadow: `0 0 8px ${t.fg}`,
          }}
        />
      )}
      {children}
    </span>
  );
}
