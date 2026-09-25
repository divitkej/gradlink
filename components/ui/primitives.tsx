"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

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
    transition: "transform 0.18s ease, background 0.2s ease",
    border: "1px solid transparent",
    whiteSpace: "nowrap",
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      color: "#0A0A0A",
      background: "var(--accent)",
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

  // Matte hover: a flat tone shift, no glow.
  const hoverBg =
    variant === "primary" ? "#FFFFFF" : variant === "secondary" ? "var(--surface-elev)" : "transparent";

  const style = { ...base, ...variants[variant] };
  const Comp = href ? motion.a : motion.button;

  return (
    <Comp
      href={href}
      onClick={onClick}
      aria-label={ariaLabel}
      className={className}
      style={style}
      whileHover={{ y: -1, background: hoverBg }}
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

/* ---------- Meter (static progress bar) ---------- */
export function Meter({
  value,
  tone = "var(--accent)",
  height = 8,
}: {
  value: number;
  tone?: string;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      style={{ height, background: "rgba(255,255,255,0.08)", borderRadius: "var(--r-full)", overflow: "hidden" }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: tone,
          borderRadius: "var(--r-full)",
          transition: "width 0.9s cubic-bezier(0.22,1,0.36,1)",
        }}
      />
    </div>
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
    cyan: { fg: "var(--accent)", bg: "rgba(255,255,255,0.10)", bd: "rgba(255,255,255,0.28)" },
    teal: { fg: "var(--accent-2)", bg: "rgba(255,255,255,0.10)", bd: "rgba(255,255,255,0.28)" },
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
          }}
        />
      )}
      {children}
    </span>
  );
}
