"use client";

import { Section } from "./ui/Section";
import { GlassCard } from "./ui/primitives";
import { SectionHeading, AnimatedBar, CountUp, Reveal } from "./anim/primitives";
import HoverExpandStats, { type StatPanel } from "./anim/HoverExpandStats";

const outcomePanels: StatPanel[] = [
  {
    value: "500",
    label: "Registered",
    depth: "Every student who signed up for Career Fair 2025 — the top of the funnel GradLink measures end to end.",
    sub: [
      { k: "Programmes", v: "9" },
      { k: "Year groups", v: "3 & 4" },
    ],
  },
  {
    value: "312",
    label: "Resume Prep",
    depth: "Students who completed resume prep before the fair — the readiness layer recruiters never used to see.",
    sub: [
      { k: "Avg resume score", v: "78%" },
      { k: "Workshops run", v: "6" },
    ],
  },
  {
    value: "180",
    label: "Recruiter Scans",
    depth: "QR scans captured at booths across 28 employers — each one a tracked, follow-up-able signal.",
    sub: [
      { k: "Companies", v: "28" },
      { k: "Avg / company", v: "6.4" },
    ],
  },
  {
    value: "74",
    label: "Shortlisted",
    depth: "Candidates recruiters moved into their pipeline — visible to the career centre in real time.",
    sub: [
      { k: "Conversion", v: "41%" },
      { k: "Top employer", v: "Careem" },
    ],
  },
  {
    value: "26",
    label: "Interview Invites",
    depth: "Interview invitations sent through GradLink's CRM after the fair closed — follow-ups that used to vanish.",
    sub: [
      { k: "From scans", v: "14%" },
      { k: "Avg response", v: "1.8 days" },
    ],
  },
  {
    value: "14",
    label: "Confirmed Offers",
    depth: "Offers traced directly back to the fair — the outcome a headcount could never prove.",
    sub: [
      { k: "Placement rate", v: "4.6%" },
      { k: "Event ROI", v: "8.4/10" },
    ],
  },
];

const funnel = [
  { l: "Registered", v: 500, pct: 100, c: "var(--cyan)" },
  { l: "Resume Prep", v: 312, pct: 62, c: "var(--cyan)" },
  { l: "Attended Fair", v: 284, pct: 57, c: "#2BB8E8" },
  { l: "Recruiter Scans", v: 180, pct: 36, c: "var(--teal)" },
  { l: "Shortlisted", v: 74, pct: 15, c: "var(--teal)" },
  { l: "Interview Invites", v: 26, pct: 5, c: "var(--amber)" },
  { l: "Confirmed Offers", v: 14, pct: 3, c: "var(--amber)" },
];

const companies = [
  { c: "Careem", scans: 42, short: 18, intv: 6 },
  { c: "PwC UAE", scans: 38, short: 12, intv: 5 },
  { c: "G42", scans: 31, short: 14, intv: 4 },
  { c: "ADNOC", scans: 27, short: 9, intv: 6 },
  { c: "Mubadala", scans: 22, short: 8, intv: 3 },
];

const activity = [
  { l: "Workshop", h: 62 },
  { l: "Mock Int.", h: 45 },
  { l: "Booth", h: 80 },
  { l: "Session", h: 55 },
  { l: "Network", h: 38 },
  { l: "1:1 Chat", h: 30 },
];

export default function AnalyticsSection() {
  return (
    <Section id="analytics">
      <SectionHeading
        badge="Analytics"
        title="Give colleges proof, not guesses."
        subtitle="Move beyond headcounts. Track the full pipeline from registration to offer."
      />

      <div className="analytics-grid" style={{ display: "grid", gridTemplateColumns: "5fr 4fr", gap: 32, marginTop: 56, alignItems: "start" }}>
        {/* Funnel */}
        <Reveal>
          <GlassCard padding={28}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 22 }}>
              Career Fair 2025 — Outcome Funnel
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {funnel.map((f, i) => (
                <div key={f.l}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: "var(--text-2)" }}>{f.l}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", fontFamily: "var(--font-display)" }}>
                      <CountUp to={f.v} />
                    </span>
                  </div>
                  <AnimatedBar value={f.pct} color={f.c} delay={i * 0.07} />
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 24 }}>
              {[
                { l: "Event ROI Score", v: "8.4", suf: "/10", c: "var(--teal)" },
                { l: "Avg Readiness", v: "72", suf: "%", c: "var(--cyan)" },
                { l: "Placement Rate", v: "4.6", suf: "%", c: "var(--amber)" },
              ].map((s) => (
                <div key={s.l} style={{ textAlign: "center", padding: "14px 8px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: s.c }}>{s.v}<span style={{ fontSize: 13 }}>{s.suf}</span></div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 3 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </Reveal>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Company table */}
          <Reveal delay={0.1}>
            <GlassCard padding={0} style={{ overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>Company Engagement</div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>Career Fair 2025 · 28 companies</div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 320 }}>
                  <thead>
                    <tr>
                      {["Company", "Scans", "Short.", "Intv."].map((h, i) => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: i === 0 ? "left" : "right", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((row) => (
                      <tr key={row.c}>
                        <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{row.c}</td>
                        <td style={{ padding: "10px 16px", fontSize: 13, color: "var(--text-2)", textAlign: "right" }}>{row.scans}</td>
                        <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "var(--teal)", textAlign: "right" }}>{row.short}</td>
                        <td style={{ padding: "10px 16px", fontSize: 13, color: "var(--text-2)", textAlign: "right" }}>{row.intv}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </Reveal>

          {/* Activity chart */}
          <Reveal delay={0.18}>
            <GlassCard padding={20}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)", marginBottom: 18 }}>Student Activity Breakdown</div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 96 }}>
                {activity.map((b, i) => (
                  <div key={b.l} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ width: "100%", height: 80, display: "flex", alignItems: "flex-end" }}>
                      <div
                        className="bar"
                        style={{
                          width: "100%",
                          height: `${b.h}%`,
                          background: "linear-gradient(180deg, var(--cyan), var(--teal))",
                          borderRadius: "4px 4px 0 0",
                          boxShadow: "0 0 12px rgba(53,211,255,0.25)",
                          animation: `growBar 0.9s ${i * 0.08}s ease both`,
                          transformOrigin: "bottom",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 9.5, color: "var(--text-muted)" }}>{b.l}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </Reveal>
        </div>
      </div>

      {/* Interactive outcomes — hover any metric for the breakdown */}
      <Reveal delay={0.1}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 16,
            margin: "64px 0 20px",
            flexWrap: "wrap",
          }}
        >
          <h3 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>
            The numbers behind one fair.
          </h3>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Hover any metric for the breakdown →
          </span>
        </div>
        <HoverExpandStats panels={outcomePanels} />
      </Reveal>

      <style>{`
        @keyframes growBar { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        @media (max-width: 900px) { .analytics-grid { grid-template-columns: 1fr !important; gap: 24px !important; } }
      `}</style>
    </Section>
  );
}
