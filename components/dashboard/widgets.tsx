"use client";

import type { ReactNode } from "react";
import { CountUp, AnimatedBar, Reveal } from "@/components/anim/primitives";

export function GlassPanel({ children, style, id }: { children: ReactNode; style?: React.CSSProperties; id?: string }) {
  return (
    <div
      id={id}
      style={{
        background: "var(--glass)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        padding: 22,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function PanelTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{children}</h2>
      {hint && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{hint}</span>}
    </div>
  );
}

export function StatCard({
  label, value, suffix = "", accent = false, delay = 0,
}: { label: string; value: number; suffix?: string; accent?: boolean; delay?: number }) {
  return (
    <Reveal delay={delay}>
      <div
        style={{
          background: accent ? "rgba(255,255,255,0.07)" : "var(--glass)",
          border: `1px solid ${accent ? "rgba(255,255,255,0.22)" : "var(--border)"}`,
          borderRadius: "var(--r-md)",
          padding: "16px 18px",
        }}
      >
        <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: accent ? "var(--accent-2)" : "var(--text)" }}>
          <CountUp to={value} suffix={suffix} />
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 3 }}>{label}</div>
      </div>
    </Reveal>
  );
}

export function CompetencyBar({ label, value, color = "var(--accent)", delay = 0 }: { label: string; value: number; color?: string; delay?: number }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "var(--text-2)" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{value}%</span>
      </div>
      <AnimatedBar value={value} color={color} delay={delay} />
    </div>
  );
}

export function Pipeline({ stages }: { stages: { label: string; count: number; color: string }[] }) {
  const max = Math.max(...stages.map((s) => s.count));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {stages.map((s, i) => (
        <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12.5, color: "var(--text-2)", width: 92 }}>{s.label}</span>
          <div style={{ flex: 1 }}><AnimatedBar value={(s.count / max) * 100} color={s.color} delay={i * 0.08} /></div>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: s.color, width: 34, textAlign: "right" }}>{s.count}</span>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <GlassPanel style={{ textAlign: "center", padding: "56px 28px" }}>
      <div style={{ display: "inline-flex", width: 56, height: 56, borderRadius: "var(--r-lg)", background: "rgba(255,255,255,0.08)", border: "1px solid var(--border-strong)", alignItems: "center", justifyContent: "center", color: "var(--accent)", marginBottom: 18 }}>
        {icon}
      </div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{title}</h2>
      <p style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>{body}</p>
    </GlassPanel>
  );
}
