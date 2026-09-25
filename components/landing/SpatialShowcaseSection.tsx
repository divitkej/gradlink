"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UserCircle, Gauge, Radio, Database, Check } from "lucide-react";
import { Section } from "../ui/Section";
import { SectionHeading } from "../anim/primitives";
import { Badge } from "../ui/primitives";

const EASE = [0.22, 1, 0.36, 1] as const;

const modules = [
  {
    icon: UserCircle,
    name: "Student Career Profile",
    desc: "A verified career identity for every student.",
    bullets: ["Resume, skills, projects, links", "Career goals and target roles", "Event history and company connections"],
    mini: "profile",
  },
  {
    icon: Gauge,
    name: "Career Readiness Hub",
    desc: "A preparation engine before students meet recruiters.",
    bullets: ["Resume score and readiness score", "Mock interviews and workshops", "Personalized action plan"],
    mini: "readiness",
  },
  {
    icon: Radio,
    name: "Live Event Mode",
    desc: "A real-time layer for career fairs and campus events.",
    bullets: ["QR scans and check-ins", "Booth queues and session tracking", "Digital event passport"],
    mini: "live",
  },
  {
    icon: Database,
    name: "Employer CRM + College Analytics",
    desc: "A follow-up and reporting system after the event.",
    bullets: ["Candidate pipeline and notes", "Employer engagement tracking", "Interviews, offers, outcome reports"],
    mini: "crm",
  },
];

function MiniProfile() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontWeight: 700, fontFamily: "var(--font-display)" }}>SA</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Sara Al Rashidi</div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Business Admin · Year 3</div>
        </div>
        <div style={{ marginLeft: "auto" }}><Badge tone="teal">Fair-Ready</Badge></div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["React", "Excel", "Public Speaking", "Marketing", "SQL"].map((s) => (
          <span key={s} style={{ fontSize: 11, color: "var(--text-2)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-full)", padding: "3px 10px" }}>{s}</span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {["Resume ✓", "Portfolio ✓", "LinkedIn ✓"].map((l) => (
          <span key={l} style={{ flex: 1, fontSize: 11, textAlign: "center", color: "var(--accent-2)", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "var(--r-sm)", padding: "6px 4px" }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

function Ring({ v, label }: { v: number; label: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={68} height={68} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={34} cy={34} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
        <circle
          cx={34} cy={34} r={r} fill="none" stroke="var(--accent)" strokeWidth={6} strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (v / 100) * c}
        />
        <text x={34} y={34} transform="rotate(90 34 34)" textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--text)", fontSize: 13, fontWeight: 700 }}>{v}%</text>
      </svg>
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
    </div>
  );
}

function MiniReadiness() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-around" }}>
        <Ring v={62} label="Readiness" />
        <Ring v={78} label="Resume" />
        <Ring v={84} label="Profile" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[["Mock Interview", "Pending"], ["Resume Workshop", "Recommended"], ["Add 3 Projects", "Pending"]].map(([l, s]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "7px 10px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
            <span style={{ color: "var(--text-2)" }}>{l}</span>
            <span style={{ color: s === "Pending" ? "var(--text-2)" : "var(--accent)", fontWeight: 600 }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniLive() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ position: "relative", width: 54, height: 54, background: "#0A0A0A", borderRadius: 8, padding: 5, display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 2, overflow: "hidden", border: "1px solid var(--border-strong)" }}>
          {Array.from({ length: 36 }).map((_, i) => (
            <div key={i} style={{ background: [0,1,6,7,4,5,10,24,25,30,14,21,28,35,18,13].includes(i) ? "var(--accent)" : "transparent", borderRadius: 1 }} />
          ))}
          <div className="scan-line" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 14, background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.5), transparent)" }} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Event Passport</div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>4 of 6 stops complete</div>
        </div>
        <div style={{ marginLeft: "auto" }}><Badge tone="muted" pulse>Live</Badge></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[["09:00", "Resume Workshop", true], ["10:30", "PwC Booth", true], ["11:00", "Mock Interview", false]].map(([t, l, done]) => (
          <div key={t as string} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span style={{ color: "var(--text-muted)", minWidth: 34 }}>{t}</span>
            <span style={{ flex: 1, color: done ? "var(--text)" : "var(--text-2)" }}>{l}</span>
            {done ? <Check size={14} color="var(--accent-2)" /> : <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--border)" }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniCRM() {
  const rows = [["Sara Al Rashidi", "Shortlisted", "var(--accent-2)"], ["M. Al Mansoori", "Contacted", "var(--accent)"], ["Fatima Khalid", "Interview", "var(--text-2)"]];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map(([n, s, c]) => (
        <div key={n} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, padding: "9px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
          <span style={{ color: "var(--text)", fontWeight: 500 }}>{n}</span>
          <span style={{ color: c, fontWeight: 600, fontSize: 11 }}>{s}</span>
        </div>
      ))}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginTop: 4 }}>
        {[["Scanned", 180], ["Short", 74], ["Intvw", 26], ["Offers", 14]].map(([l, v]) => (
          <div key={l as string} style={{ textAlign: "center", padding: "8px 2px", background: "rgba(255,255,255,0.06)", borderRadius: "var(--r-sm)", border: "1px solid var(--border)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--accent)" }}>{v}</div>
            <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const minis: Record<string, React.ReactNode> = {
  profile: <MiniProfile />,
  readiness: <MiniReadiness />,
  live: <MiniLive />,
  crm: <MiniCRM />,
};

export default function SpatialShowcaseSection() {
  const [active, setActive] = useState(0);
  const m = modules[active];
  const Icon = m.icon;

  return (
    <Section id="product" bg="var(--bg-2)">
      <SectionHeading
        badge="Product"
        title="A career operating system, not another event form."
        subtitle="Four connected modules that help colleges manage the full student-to-employer journey."
      />

      <div
        className="showcase-grid"
        style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 32, marginTop: 56, alignItems: "stretch" }}
      >
        {/* Tab list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {modules.map((mod, i) => {
            const MIcon = mod.icon;
            const isActive = i === active;
            return (
              <button
                key={mod.name}
                onClick={() => setActive(i)}
                aria-pressed={isActive}
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  background: isActive ? "var(--surface-elev)" : "var(--glass)",
                  border: `1px solid ${isActive ? "var(--border-strong)" : "var(--border)"}`,
                  borderRadius: "var(--r-lg)",
                  padding: 20,
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  transition: "all 0.25s ease",
                  boxShadow: isActive ? "none" : "none",
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    flexShrink: 0,
                    borderRadius: "var(--r-md)",
                    background: isActive ? "linear-gradient(135deg, var(--accent), var(--accent-2))" : "rgba(255,255,255,0.04)",
                    border: isActive ? "none" : "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MIcon size={20} color={isActive ? "#0A0A0A" : "var(--text-2)"} strokeWidth={1.7} />
                </div>
                <div>
                  <div style={{ fontSize: 15.5, fontWeight: 600, color: isActive ? "var(--text)" : "var(--text-2)", marginBottom: 3 }}>
                    {mod.name}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{mod.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active display */}
        <div style={{ perspective: 1200 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, rotateY: -8, y: 16 }}
              animate={{ opacity: 1, rotateY: 0, y: 0 }}
              exit={{ opacity: 0, rotateY: 8, y: -16 }}
              transition={{ duration: 0.5, ease: EASE }}
              style={{
                height: "100%",
                background: "var(--glass)",
                backdropFilter: "blur(16px)",
                border: "1px solid var(--border-strong)",
                borderRadius: "var(--r-xl)",
                padding: 28,
                boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: "var(--r-md)", background: "linear-gradient(135deg, var(--accent), var(--accent-2))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={20} color="#0A0A0A" strokeWidth={1.7} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>{m.name}</h3>
              </div>

              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 9, marginBottom: 24 }}>
                {m.bullets.map((b) => (
                  <li key={b} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14, color: "var(--text-2)" }}>
                    <Check size={15} color="var(--accent-2)" strokeWidth={2.2} />
                    {b}
                  </li>
                ))}
              </ul>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
                {minis[m.mini]}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        @media (max-width: 920px) { .showcase-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </Section>
  );
}
