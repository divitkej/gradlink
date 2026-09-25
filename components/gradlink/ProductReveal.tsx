"use client";

import { ProductFrame } from "./ProductFrame";
import { Badge } from "../ui/primitives";

function Stat({ label, value, suffix = "", accent = false }: { label: string; value: number; suffix?: string; accent?: boolean }) {
  return (
    <div
      style={{
        background: accent ? "rgba(0,194,168,0.08)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${accent ? "rgba(0,194,168,0.22)" : "var(--border)"}`,
        borderRadius: "var(--r-md)",
        padding: "12px 14px",
      }}
    >
      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: accent ? "var(--teal)" : "var(--text)", letterSpacing: "-0.02em" }}>
        {value}{suffix}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: 16 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

const funnel = [
  { l: "Registered", v: 100, c: "var(--cyan)" },
  { l: "Recruiter Scans", v: 36, c: "var(--teal)" },
  { l: "Shortlisted", v: 15, c: "var(--teal)" },
  { l: "Interviews", v: 5, c: "var(--amber)" },
  { l: "Offers", v: 3, c: "var(--amber)" },
];

export default function ProductReveal() {
  return (
    <ProductFrame
      titleComponent={
        <>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px, 3.6vw, 44px)", fontWeight: 700, lineHeight: 1.12, color: "var(--text)", letterSpacing: "-0.02em", marginBottom: 14 }}>
            From check-in to offer, every interaction becomes a{" "}
            <span className="text-gradient">signal.</span>
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--text-2)", maxWidth: 640, margin: "0 auto" }}>
            GradLink connects readiness, live event engagement, recruiter scans, and follow-up outcomes in one command center.
          </p>
        </>
      }
    >
      {/* Wide dark command-center dashboard */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>GradLink — Career Fair 2025</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Abu Dhabi University · 18 Feb 2025</div>
          </div>
          <Badge tone="amber" pulse>Live Now</Badge>
        </div>

        <div className="reveal-stats" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
          <Stat label="Readiness Score" value={72} suffix="%" />
          <Stat label="Event Check-ins" value={500} suffix="+" accent />
          <Stat label="Recruiter Scans" value={180} />
          <Stat label="Shortlisted" value={74} accent />
          <Stat label="Interview Invites" value={26} />
          <Stat label="Offers" value={14} accent />
        </div>

        <div className="reveal-grid" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1.1fr", gap: 12 }}>
          <Panel title="Live Schedule">
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {[["09:00", "Resume Workshop", true], ["10:30", "PwC Booth Opens", false], ["11:00", "Mock Interview — Careem", false], ["14:00", "Startup Networking", false]].map(([t, l, live]) => (
                <div key={t as string} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                  <span style={{ color: "var(--text-muted)", minWidth: 36 }}>{t}</span>
                  <span style={{ flex: 1, color: live ? "var(--text)" : "var(--text-2)", fontWeight: live ? 600 : 400 }}>{l}</span>
                  {live && <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--teal)", boxShadow: "0 0 6px var(--teal)" }} />}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="QR Check-in">
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
              <div style={{ position: "relative", width: 56, height: 56, background: "#02101a", borderRadius: 8, padding: 5, display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 2, overflow: "hidden", border: "1px solid var(--border-strong)" }}>
                {Array.from({ length: 36 }).map((_, i) => (
                  <div key={i} style={{ background: [0, 1, 6, 7, 4, 5, 10, 24, 25, 30, 14, 21, 28, 35, 18, 13].includes(i) ? "var(--cyan)" : "transparent", borderRadius: 1 }} />
                ))}
                <div className="scan-line" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 14, background: "linear-gradient(180deg, transparent, rgba(53,211,255,0.55), transparent)" }} />
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)" }}>Sara Al Rashidi</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Checked in · 10:45</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
              {["Workshop", "PwC Booth", "Mock", "Follow-up"].map((j, i) => (
                <span key={j} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 10.5, color: "var(--text)", background: "rgba(53,211,255,0.08)", border: "1px solid rgba(53,211,255,0.2)", borderRadius: "var(--r-full)", padding: "3px 8px" }}>{j}</span>
                  {i < 3 && <span style={{ color: "var(--teal)", fontSize: 11 }}>→</span>}
                </span>
              ))}
            </div>
          </Panel>

          <Panel title="Outcome Funnel">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {funnel.map((f) => (
                <div key={f.l}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: "var(--text-2)" }}>{f.l}</span>
                  </div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${f.v}%`, background: f.c, borderRadius: 3, boxShadow: `0 0 8px ${f.c}` }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <style>{`
        @media (max-width: 800px) {
          .reveal-stats { grid-template-columns: repeat(3, 1fr) !important; }
          .reveal-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </ProductFrame>
  );
}
