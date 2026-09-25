"use client";

import { motion } from "framer-motion";
import { Badge } from "../ui/primitives";
import SampleDataLabel from "./SampleDataLabel";

const EASE = [0.22, 1, 0.36, 1] as const;

function Stat({ label, value, suffix = "", accent = false }: { label: string; value: number; suffix?: string; accent?: boolean }) {
  return (
    <div
      style={{
        background: accent ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${accent ? "rgba(255,255,255,0.22)" : "var(--border)"}`,
        borderRadius: "var(--r-md)",
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 19,
          fontWeight: 700,
          color: accent ? "var(--accent-2)" : "var(--text)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}{suffix}
      </div>
      <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Panel({ title, children, badge }: { title: string; children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-md)",
        padding: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          {title}
        </span>
        {badge}
      </div>
      {children}
    </div>
  );
}

export default function HeroDashboard() {
  const schedule = [
    { t: "09:00", l: "Resume Workshop", live: true },
    { t: "10:30", l: "Consulting firm booth opens", live: false },
    { t: "11:00", l: "Mock interview · Fintech firm", live: false },
    { t: "14:00", l: "Startup Networking", live: false },
  ];
  const journey = ["Resume Workshop", "Consulting booth", "Mock Interview", "Follow-up Sent"];
  const readiness = [
    { l: "Communication", v: 54, c: "var(--text-muted)" },
    { l: "Technology", v: 82, c: "var(--accent-2)" },
    { l: "Professionalism", v: 58, c: "var(--text-2)" },
  ];
  const pipeline = [
    { l: "Scanned", v: 180 },
    { l: "Shortlisted", v: 74 },
    { l: "Interviews", v: 26 },
    { l: "Offers", v: 14 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 1, ease: EASE, delay: 0.7 }}
      style={{
        width: "100%",
        maxWidth: 560,
        background: "var(--glass)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid var(--border-strong)",
        borderRadius: "var(--r-xl)",
        padding: 18,
        boxShadow: "0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.1)",
      }}
    >
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
            Campus Career Fair
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
            Sample University
          </div>
        </div>
        <SampleDataLabel />
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
        <Stat label="Readiness Score" value={72} suffix="%" />
        <Stat label="Event Check-ins" value={500} suffix="+" accent />
        <Stat label="Recruiter Scans" value={180} />
        <Stat label="Shortlisted" value={74} accent />
        <Stat label="Interview Invites" value={26} />
        <Stat label="Offers" value={14} accent />
      </div>

      {/* Two-column panels */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <Panel title="Live Schedule" badge={<Badge tone="teal" pulse>Live</Badge>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {schedule.map((s) => (
              <div key={s.t} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
                <span style={{ color: "var(--text-muted)", fontVariantNumeric: "tabular-nums", minWidth: 32 }}>{s.t}</span>
                <span style={{ flex: 1, color: s.live ? "var(--text)" : "var(--text-2)", fontWeight: s.live ? 600 : 400 }}>
                  {s.l}
                </span>
                {s.live && (
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-2)" }} className="pulse-dot" />
                )}
              </div>
            ))}
          </div>
        </Panel>

        {/* QR with scan-line */}
        <Panel title="QR Check-in">
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div
              style={{
                position: "relative",
                width: 56,
                height: 56,
                background: "#0A0A0A",
                borderRadius: 8,
                padding: 5,
                display: "grid",
                gridTemplateColumns: "repeat(6,1fr)",
                gap: 2,
                overflow: "hidden",
                border: "1px solid var(--border-strong)",
              }}
            >
              {Array.from({ length: 36 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    background: [0, 1, 6, 7, 4, 5, 10, 11, 24, 25, 30, 31, 14, 21, 28, 35, 18, 13].includes(i)
                      ? "var(--accent)"
                      : "transparent",
                    borderRadius: 1,
                  }}
                />
              ))}
              <div
                className="scan-line"
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  height: 14,
                  background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.55), transparent)",
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>Sara Al Rashidi</div>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>Checked in · 10:45</div>
            </div>
          </div>
        </Panel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        {/* Matched companies */}
        <Panel title="Matched Companies">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {["Fintech firm", "Consulting firm", "AI startup"].map((c) => (
              <div key={c} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent-2)" }} />
                <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 500 }}>{c}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Readiness breakdown */}
        <Panel title="Readiness Breakdown">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {readiness.map((r) => (
              <div key={r.l}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginBottom: 3 }}>
                  <span style={{ color: "var(--text-2)" }}>{r.l}</span>
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>{r.v}%</span>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${r.v}%`, background: r.c, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Student journey */}
      <Panel title="Student Journey">
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          {journey.map((j, i) => (
            <span key={j} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 500,
                  color: "var(--text)",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "var(--r-full)",
                  padding: "3px 9px",
                }}
              >
                {j}
              </span>
              {i < journey.length - 1 && <span style={{ color: "var(--accent-2)", fontSize: 11 }}>→</span>}
            </span>
          ))}
        </div>
      </Panel>

      {/* Recruiter pipeline */}
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
        {pipeline.map((p) => (
          <div key={p.l} style={{ textAlign: "center", padding: "8px 4px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--accent)" }}>
              {p.v}
            </div>
            <div style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 1 }}>{p.l}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
