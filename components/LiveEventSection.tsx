"use client";

import { Check } from "lucide-react";
import { Section } from "./ui/Section";
import { GlassCard, Badge } from "./ui/primitives";
import { SectionHeading, Reveal } from "./anim/primitives";

const passport = [
  { l: "Resume Workshop", t: "09:15", done: true },
  { l: "Mock Interview — Careem", t: "10:00", done: true },
  { l: "Careem Booth", t: "10:45", done: true },
  { l: "PwC Booth", t: "11:30", done: true },
  { l: "Follow-up Sent", t: "12:10", done: true },
  { l: "Startup Networking", t: "14:00", done: false },
];

const leaderboard = [
  { r: 1, n: "Sara Al Rashidi", s: 92 },
  { r: 2, n: "Mohammed Al Mansoori", s: 88 },
  { r: 3, n: "Fatima Khalid", s: 84 },
  { r: 4, n: "Ahmed Nasser", s: 81 },
  { r: 5, n: "Aisha Al Zaabi", s: 77 },
];

const scans = [
  { s: "Sara Al Rashidi", c: "Careem", t: "10:45", status: "Shortlisted" },
  { s: "M. Al Mansoori", c: "PwC UAE", t: "11:02", status: "Scanned" },
  { s: "Fatima Khalid", c: "G42", t: "11:18", status: "Shortlisted" },
  { s: "Ahmed Nasser", c: "Careem", t: "11:34", status: "Scanned" },
];

export default function LiveEventSection() {
  return (
    <Section id="live" bg="var(--bg-2)">
      <SectionHeading
        badge="Live Event Mode"
        title="Make every interaction trackable."
        subtitle="Every check-in, scan, session, waitlist, and recruiter conversation becomes structured career data."
      />

      <div className="live-grid" style={{ display: "grid", gridTemplateColumns: "5fr 4fr", gap: 32, marginTop: 56, alignItems: "start" }}>
        {/* Passport journey */}
        <Reveal>
          <GlassCard padding={28}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
                Sara&apos;s Digital Passport
              </span>
              <Badge tone="amber" pulse>Live</Badge>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {passport.map((p, i) => (
                <div key={p.l} style={{ display: "flex", gap: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: p.done ? "linear-gradient(135deg, var(--cyan), var(--teal))" : "var(--surface-elev)", border: p.done ? "none" : "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: p.done ? "0 0 12px rgba(0,194,168,0.4)" : "none" }}>
                      {p.done ? <Check size={13} color="#021016" strokeWidth={3} /> : <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-muted)" }} />}
                    </div>
                    {i < passport.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 26, background: p.done ? "linear-gradient(var(--teal), var(--border))" : "var(--border)" }} />}
                  </div>
                  <div style={{ paddingBottom: i < passport.length - 1 ? 18 : 0 }}>
                    <div style={{ fontSize: 14, fontWeight: p.done ? 600 : 400, color: p.done ? "var(--text)" : "var(--text-2)" }}>{p.l}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 1 }}>{p.done ? p.t : "Upcoming"}</div>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ marginTop: 22, paddingTop: 20, borderTop: "1px solid var(--border)", fontSize: 13.5, lineHeight: 1.7, color: "var(--text-2)" }}>
              A student attends a resume workshop, completes a mock interview, checks into Careem, visits PwC, and sends a
              follow-up. <strong style={{ color: "var(--text)" }}>GradLink turns each action into a signal.</strong>
            </p>
          </GlassCard>
        </Reveal>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Leaderboard */}
          <Reveal delay={0.1}>
            <GlassCard padding={0} style={{ overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>Engagement Leaderboard</span>
                <Badge tone="teal" pulse>Live</Badge>
              </div>
              {leaderboard.map((s) => (
                <div key={s.r} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderBottom: "1px solid var(--border)", background: s.r === 1 ? "rgba(0,194,168,0.06)" : "transparent" }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, color: s.r === 1 ? "var(--teal)" : "var(--text-muted)", width: 16 }}>{s.r}</span>
                  <span style={{ flex: 1, fontSize: 13, color: "var(--text)" }}>{s.n}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: s.r === 1 ? "var(--teal)" : "var(--text-2)" }}>{s.s}</span>
                </div>
              ))}
            </GlassCard>
          </Reveal>

          {/* Scan feed */}
          <Reveal delay={0.18}>
            <GlassCard padding={0} style={{ overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>Recent Recruiter Scans</span>
              </div>
              {scans.map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", borderBottom: i < scans.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>{row.s}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{row.c} · {row.t}</div>
                  </div>
                  <Badge tone={row.status === "Shortlisted" ? "teal" : "muted"}>{row.status}</Badge>
                </div>
              ))}
            </GlassCard>
          </Reveal>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) { .live-grid { grid-template-columns: 1fr !important; gap: 24px !important; } }
      `}</style>
    </Section>
  );
}
