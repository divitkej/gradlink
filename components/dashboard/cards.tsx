"use client";

import type { ReactNode } from "react";
import { Loader2, AlertCircle } from "lucide-react";

/* Reusable dashboard / scan primitives — all on the GradLink dark theme. */

export function SectionCard({
  title,
  hint,
  right,
  children,
  accent = "var(--border)",
  style,
}: {
  title?: string;
  hint?: string;
  right?: ReactNode;
  children: ReactNode;
  accent?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "var(--glass)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${accent}`,
        borderRadius: "var(--r-lg)",
        padding: 22,
        ...style,
      }}
    >
      {(title || right) && (
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            {title && (
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{title}</h2>
            )}
            {hint && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{hint}</span>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatTile({
  label,
  value,
  suffix = "",
  accent = false,
  tone,
}: {
  label: string;
  value: ReactNode;
  suffix?: string;
  accent?: boolean;
  tone?: string;
}) {
  const color = tone ?? (accent ? "var(--accent-2)" : "var(--text)");
  return (
    <div
      style={{
        background: accent ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${accent ? "rgba(255,255,255,0.22)" : "var(--border)"}`,
        borderRadius: "var(--r-md)",
        padding: "14px 16px",
      }}
    >
      <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color }}>
        {value}
        {suffix}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>{label}</div>
    </div>
  );
}

export function FlagPill({ label, tone = "cyan", icon }: { label: string; tone?: "cyan" | "teal" | "amber" | "danger" | "muted"; icon?: ReactNode }) {
  const map: Record<string, { fg: string; bg: string; bd: string }> = {
    cyan: { fg: "var(--accent)", bg: "rgba(255,255,255,0.10)", bd: "rgba(255,255,255,0.28)" },
    teal: { fg: "var(--accent-2)", bg: "rgba(255,255,255,0.10)", bd: "rgba(255,255,255,0.28)" },
    amber: { fg: "var(--amber)", bg: "rgba(247,201,72,0.10)", bd: "rgba(247,201,72,0.30)" },
    danger: { fg: "var(--danger)", bg: "rgba(255,107,107,0.10)", bd: "rgba(255,107,107,0.28)" },
    muted: { fg: "var(--text-2)", bg: "rgba(255,255,255,0.05)", bd: "var(--border)" },
  };
  const t = map[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        color: t.fg,
        background: t.bg,
        border: `1px solid ${t.bd}`,
        borderRadius: "var(--r-full)",
        padding: "5px 11px",
      }}
    >
      {icon}
      {label}
    </span>
  );
}

export function ScoreRing({ score, size = 96, tone = "var(--accent)", label }: { score: number; size?: number; tone?: string; label?: string }) {
  const r = size / 2 - 7;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={7} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)", filter: `drop-shadow(0 0 6px ${tone})` }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: size * 0.28, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{Math.round(score)}</span>
        {label && <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{label}</span>}
      </div>
    </div>
  );
}

export function MeterBar({ value, tone = "var(--accent)" }: { value: number; tone?: string }) {
  return (
    <div style={{ height: 7, borderRadius: 6, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, value))}%`, background: tone, borderRadius: 6, transition: "width 0.9s cubic-bezier(0.22,1,0.36,1)" }} />
    </div>
  );
}

export function Avatar({ name, size = 44, tone = "var(--accent)" }: { name: string; size?: number; tone?: string }) {
  const initials = name.split(" ").map((x) => x[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.12)",
        border: "1px solid var(--border-strong)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.36,
        fontWeight: 700,
        color: tone,
        fontFamily: "var(--font-display)",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

export function TagRow({ items, tone = "cyan" }: { items: string[]; tone?: "cyan" | "teal" | "amber" }) {
  const colors: Record<string, string> = { cyan: "rgba(255,255,255,0.06)", teal: "rgba(255,255,255,0.06)", amber: "rgba(247,201,72,0.06)" };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map((s) => (
        <span key={s} style={{ fontSize: 12.5, color: "var(--text-2)", background: colors[tone], border: "1px solid var(--border)", borderRadius: "var(--r-full)", padding: "5px 12px" }}>
          {s}
        </span>
      ))}
    </div>
  );
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "56px 24px", color: "var(--text-muted)" }}>
      <Loader2 size={18} className="gl-spin" />
      <span style={{ fontSize: 14 }}>{label}</span>
      <style>{`.gl-spin{animation:glspin 0.9s linear infinite}@keyframes glspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export function ErrorBlock({ title = "Couldn't load this", body }: { title?: string; body?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "48px 24px", textAlign: "center" }}>
      <AlertCircle size={26} color="var(--danger)" />
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{title}</h3>
      {body && <p style={{ fontSize: 13.5, color: "var(--text-muted)", maxWidth: 360 }}>{body}</p>}
    </div>
  );
}
