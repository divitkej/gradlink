"use client";

import { Check, Clock, Sparkles } from "lucide-react";
import { Section } from "../ui/Section";
import { GlassCard, Meter } from "../ui/primitives";
import { SectionHeading } from "../anim/primitives";
import SampleDataLabel from "./SampleDataLabel";

const competencies = [
  { l: "Communication", v: 54, c: "var(--text-muted)" },
  { l: "Technology", v: 82, c: "var(--accent-2)" },
  { l: "Professionalism", v: 58, c: "var(--text-2)" },
  { l: "Teamwork", v: 76, c: "var(--accent)" },
  { l: "Critical Thinking", v: 63, c: "var(--accent)" },
  { l: "Leadership", v: 45, c: "var(--text-muted)" },
];

const actions = [
  { l: "Mock Interview", s: "Pending" },
  { l: "Resume Workshop", s: "Recommended" },
  { l: "Add 3 Projects", s: "Pending" },
  { l: "Attend Company Session", s: "Recommended" },
  { l: "LinkedIn Profile", s: "Complete" },
];

function Ring({ v, label }: { v: number; label: string }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width={80} height={80} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={40} cy={40} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={7} />
        <circle
          cx={40} cy={40} r={r} fill="none" stroke="var(--accent)" strokeWidth={7} strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (v / 100) * c}
        />
        <text x={40} y={40} transform="rotate(90 40 40)" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--text)", fontSize: 16, fontWeight: 700, fontFamily: "var(--font-display)" }}>{v}%</text>
      </svg>
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
    </div>
  );
}

export default function ReadinessSection() {
  return (
    <Section id="readiness">
      <div className="readiness-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "start" }}>
        <div>
          <SectionHeading
            badge="Student Readiness"
            title="Know who is ready before recruiters arrive."
            subtitle="GradLink helps career centers identify which students need support before they walk into the fair."
          />
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 40 }}>
              {competencies.map((c) => (
                <div key={c.l}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13.5, color: "var(--text-2)" }}>{c.l}</span>
                    <span style={{ fontSize: 13.5, color: "var(--text)", fontWeight: 600 }}>{c.v}%</span>
                  </div>
                  <Meter value={c.v} tone={c.c} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Student card */}
        <div>
          <GlassCard padding={28} style={{ border: "1px solid var(--border-strong)", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, paddingBottom: 20, borderBottom: "1px solid var(--border)", marginBottom: 22 }}>
              <div style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontWeight: 700, fontFamily: "var(--font-display)", fontSize: 17 }}>SA</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Sara Al Rashidi</div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Business Administration · Year 3 · Sample University</div>
              </div>
              <div style={{ marginLeft: "auto", alignSelf: "flex-start" }}><SampleDataLabel /></div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, padding: "18px 12px", background: "rgba(255,255,255,0.02)", borderRadius: "var(--r-md)", marginBottom: 22 }}>
              <Ring v={62} label="Career Readiness" />
              <Ring v={78} label="Resume Score" />
              <Ring v={84} label="Profile Complete" />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {actions.map((a) => {
                const done = a.s === "Complete";
                const pending = a.s === "Pending";
                const color = done ? "var(--accent-2)" : pending ? "var(--text-2)" : "var(--accent)";
                return (
                  <div key={a.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
                    <span style={{ fontSize: 13.5, color: "var(--text-2)" }}>{a.l}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color }}>
                      {done ? <Check size={13} /> : <Clock size={12} />}
                      {a.s}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: "var(--r-md)" }}>
              <Sparkles size={17} color="var(--accent-2)" />
              <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                Complete 3 more items to unlock <strong style={{ color: "var(--accent-2)" }}>Fair-Ready</strong> badge
              </span>
            </div>
          </GlassCard>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) { .readiness-grid { grid-template-columns: minmax(0, 1fr) !important; gap: 40px !important; } }
      `}</style>
    </Section>
  );
}
