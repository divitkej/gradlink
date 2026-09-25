"use client";

import { Section } from "../ui/Section";
import { GlassCard, Badge, Meter } from "../ui/primitives";
import { SectionHeading } from "../anim/primitives";
import SampleDataLabel from "./SampleDataLabel";

const filters = ["Degree", "Graduation Year", "GPA", "Skills", "Readiness Score", "Resume Score", "Event Activity", "Stage"];

const pipeline = [
  { l: "Scanned", v: 180, c: "var(--text-muted)", pct: 100 },
  { l: "Shortlisted", v: 74, c: "var(--accent-2)", pct: 41 },
  { l: "Contacted", v: 48, c: "var(--accent)", pct: 27 },
  { l: "Interview", v: 26, c: "#D4D4D4", pct: 14 },
  { l: "Offer", v: 14, c: "var(--text-2)", pct: 8 },
];

const candidates = [
  { n: "Sara Al Rashidi", d: "Business Admin · Year 3", r: 92, res: 88, s: "Shortlisted", tone: "teal" as const },
  { n: "Mohammed Al Mansoori", d: "Computer Science · Year 4", r: 85, res: 91, s: "Contacted", tone: "cyan" as const },
  { n: "Fatima Khalid", d: "Marketing · Year 3", r: 78, res: 82, s: "Interview", tone: "muted" as const },
  { n: "Ahmed Nasser", d: "Finance · Year 4", r: 71, res: 75, s: "Scanned", tone: "muted" as const },
];

const actions = ["Shortlist", "Add Note", "Send Follow-up", "Invite to Interview"];

export default function EmployerCRMSection() {
  return (
    <Section id="employers" bg="var(--bg-2)">
      <SectionHeading
        badge="Employer CRM"
        title="Turn recruiter scans into real follow-ups."
        subtitle="Recruiters get a structured workspace to filter candidates, manage pipelines, add notes, and send follow-ups."
      />

      <div className="crm-grid" style={{ display: "grid", gridTemplateColumns: "4fr 5fr", gap: 32, marginTop: 56, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Pipeline */}
          <div>
            <GlassCard padding={26}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                  Fintech firm · Candidate pipeline
                </span>
                <SampleDataLabel />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {pipeline.map((p) => (
                  <div key={p.l} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 12.5, color: "var(--text-2)", width: 80 }}>{p.l}</span>
                    <div style={{ flex: 1 }}><Meter value={p.pct} color={p.c} /></div>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: p.c, width: 28, textAlign: "right" }}>{p.v}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Filters */}
          <div>
            <GlassCard padding={22}>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 12 }}>Filter candidates by:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {filters.map((f) => (
                  <span key={f} style={{ fontSize: 12, color: "var(--text-2)", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", borderRadius: "var(--r-full)", padding: "5px 12px", cursor: "pointer", transition: "all 0.18s" }} className="filter-chip">{f}</span>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Candidate list */}
        <div>
          <GlassCard padding={0} style={{ overflow: "hidden", border: "1px solid var(--border-strong)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Scanned Candidates</div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>42 students · Fintech firm</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", background: "rgba(255,255,255,0.08)", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "6px 12px", cursor: "pointer" }}>Export CSV</span>
            </div>
            {candidates.map((c, i) => (
              <div key={c.n} className="cand-row" style={{ padding: "16px 20px", borderBottom: i < candidates.length - 1 ? "1px solid var(--border)" : "none", transition: "background 0.18s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.10)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-display)" }}>
                      {c.n.split(" ").map((x) => x[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{c.n}</div>
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{c.d}</div>
                    </div>
                  </div>
                  <Badge tone={c.tone}>{c.s}</Badge>
                </div>
                <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Readiness <strong style={{ color: "var(--text)" }}>{c.r}%</strong></span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Resume <strong style={{ color: "var(--text)" }}>{c.res}%</strong></span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {actions.map((a) => (
                    <button key={a} className="cand-action" style={{ fontSize: 11, fontWeight: 600, color: a === "Shortlist" ? "var(--accent-2)" : "var(--text-2)", background: a === "Shortlist" ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)", border: `1px solid ${a === "Shortlist" ? "rgba(255,255,255,0.25)" : "var(--border)"}`, borderRadius: "var(--r-sm)", padding: "6px 11px", cursor: "pointer", transition: "all 0.18s" }}>{a}</button>
                  ))}
                </div>
              </div>
            ))}
          </GlassCard>
        </div>
      </div>

      <style>{`
        .filter-chip:hover { color: var(--accent) !important; border-color: var(--border-strong) !important; }
        .cand-row:hover { background: rgba(255,255,255,0.02); }
        .cand-action:hover { border-color: var(--border-strong) !important; color: var(--text) !important; }
        @media (max-width: 900px) { .crm-grid { grid-template-columns: 1fr !important; gap: 24px !important; } }
      `}</style>
    </Section>
  );
}
