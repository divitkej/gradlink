"use client";

import { useState } from "react";
import { Section } from "../ui/Section";
import { GlassCard, Badge, Meter } from "../ui/primitives";
import { SectionHeading } from "../anim/primitives";
import SampleDataLabel from "./SampleDataLabel";

const pipeline = [
  { l: "Scanned", v: 180, c: "var(--text-muted)", pct: 100 },
  { l: "Shortlisted", v: 74, c: "var(--accent-2)", pct: 41 },
  { l: "Contacted", v: 48, c: "var(--accent)", pct: 27 },
  { l: "Interview", v: 26, c: "#D4D4D4", pct: 14 },
  { l: "Offer", v: 14, c: "var(--text-2)", pct: 8 },
];

type Stage = "Scanned" | "Shortlisted" | "Contacted" | "Interview";

/**
 * What an employer sees of a candidate: what the student chose to share. No
 * scores, GPA or activity, since colleges want every student considered.
 */
interface Candidate {
  name: string;
  degree: string;
  gradYear: number;
  targetRole: string;
  skills: string[];
  stage: Stage;
}

// Sample students for the preview. The filters below run against these only.
const candidates: Candidate[] = [
  { name: "Sara Al Rashidi", degree: "Business Administration", gradYear: 2027, targetRole: "Business Analyst", skills: ["Excel", "Communication", "SQL"], stage: "Shortlisted" },
  { name: "Mohammed Al Mansoori", degree: "Computer Science", gradYear: 2026, targetRole: "Software Engineer", skills: ["Python", "SQL", "Communication"], stage: "Contacted" },
  { name: "Fatima Khalid", degree: "Marketing", gradYear: 2027, targetRole: "Brand Associate", skills: ["Design", "Communication", "Excel"], stage: "Interview" },
  { name: "Ahmed Nasser", degree: "Finance", gradYear: 2026, targetRole: "Financial Analyst", skills: ["Excel", "SQL"], stage: "Scanned" },
  { name: "Layla Haddad", degree: "Computer Science", gradYear: 2027, targetRole: "Software Engineer", skills: ["Python", "Design"], stage: "Shortlisted" },
  { name: "Omar Farouk", degree: "Engineering", gradYear: 2026, targetRole: "Data Analyst", skills: ["Python", "Excel"], stage: "Scanned" },
  { name: "Aisha Rahman", degree: "Finance", gradYear: 2027, targetRole: "Business Analyst", skills: ["SQL", "Excel", "Communication"], stage: "Interview" },
];

const stageTone: Record<Stage, "teal" | "cyan" | "muted"> = {
  Scanned: "muted",
  Shortlisted: "teal",
  Contacted: "cyan",
  Interview: "muted",
};

interface Filter {
  id: string;
  label: string;
  options: { label: string; test: (c: Candidate) => boolean }[];
}

const oneOf = <T,>(values: T[], pick: (c: Candidate) => T, show: (v: T) => string = String) =>
  values.map((v) => ({ label: show(v), test: (c: Candidate) => pick(c) === v }));

const filters: Filter[] = [
  { id: "degree", label: "Degree", options: oneOf(["Business Administration", "Computer Science", "Engineering", "Finance", "Marketing"], (c) => c.degree) },
  { id: "year", label: "Graduation Year", options: oneOf([2026, 2027], (c) => c.gradYear) },
  { id: "skills", label: "Skills", options: ["Python", "SQL", "Excel", "Design", "Communication"].map((s) => ({ label: s, test: (c: Candidate) => c.skills.includes(s) })) },
  { id: "role", label: "Target Role", options: oneOf(["Business Analyst", "Data Analyst", "Software Engineer", "Financial Analyst", "Brand Associate"], (c) => c.targetRole) },
  { id: "stage", label: "Stage", options: oneOf<Stage>(["Scanned", "Shortlisted", "Contacted", "Interview"], (c) => c.stage) },
];

export default function EmployerCRMSection() {
  // Chosen option index per filter id, and which filter's options are open.
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [open, setOpen] = useState<string | null>(null);

  const shown = candidates.filter((c) => filters.every((f) => chosen[f.id] === undefined || f.options[chosen[f.id]].test(c)));
  const anyChosen = Object.keys(chosen).length > 0;
  const openFilter = filters.find((f) => f.id === open);

  function pick(filterId: string, index: number | null) {
    setChosen((prev) => {
      const next = { ...prev };
      if (index === null) delete next[filterId];
      else next[filterId] = index;
      return next;
    });
    setOpen(null);
  }

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
                    <div style={{ flex: 1 }}><Meter value={p.pct} tone={p.c} /></div>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: p.c, width: 28, textAlign: "right" }}>{p.v}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Filters: work on the sample students in the list */}
          <div>
            <GlassCard padding={22}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Filter candidates by:</span>
                {anyChosen && (
                  <button type="button" className="crm-clear" onClick={() => { setChosen({}); setOpen(null); }}>
                    Clear filters
                  </button>
                )}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {filters.map((f) => {
                  const active = chosen[f.id] !== undefined;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      className={`crm-chip${active || open === f.id ? " is-on" : ""}`}
                      aria-expanded={open === f.id}
                      aria-controls="crm-filter-options"
                      onClick={() => setOpen(open === f.id ? null : f.id)}
                    >
                      {active ? `${f.label}: ${f.options[chosen[f.id]].label}` : f.label}
                    </button>
                  );
                })}
              </div>
              {openFilter && (
                <div id="crm-filter-options" role="group" aria-label={openFilter.label} style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button type="button" className={`crm-opt${chosen[openFilter.id] === undefined ? " is-on" : ""}`} aria-pressed={chosen[openFilter.id] === undefined} onClick={() => pick(openFilter.id, null)}>
                    Any
                  </button>
                  {openFilter.options.map((o, i) => (
                    <button key={o.label} type="button" className={`crm-opt${chosen[openFilter.id] === i ? " is-on" : ""}`} aria-pressed={chosen[openFilter.id] === i} onClick={() => pick(openFilter.id, i)}>
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>
        </div>

        {/* Candidate list */}
        <div>
          <GlassCard padding={0} style={{ overflow: "hidden", border: "1px solid var(--border-strong)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Scanned Candidates</div>
                <div aria-live="polite" style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                  {`Showing ${shown.length} of ${candidates.length} sample students · Fintech firm`}
                </div>
              </div>
              <SampleDataLabel />
            </div>
            {shown.length === 0 && (
              <div style={{ padding: "28px 20px", fontSize: 13, color: "var(--text-2)" }}>
                No sample students match these filters.{" "}
                <button type="button" className="crm-clear" onClick={() => { setChosen({}); setOpen(null); }}>Clear filters</button>
              </div>
            )}
            {shown.map((c) => (
              <div key={c.name} style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 11, alignItems: "center", minWidth: 0 }}>
                    <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.10)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-display)" }}>
                      {c.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{c.name}</div>
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{`${c.degree} · Class of ${c.gradYear}`}</div>
                    </div>
                  </div>
                  <Badge tone={stageTone[c.stage]}>{c.stage}</Badge>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", columnGap: 16, rowGap: 4, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Looking for <strong style={{ color: "var(--text)" }}>{c.targetRole}</strong></span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Skills <strong style={{ color: "var(--text)" }}>{c.skills.join(", ")}</strong></span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{`Skills: ${c.skills.join(", ")}`}</div>
              </div>
            ))}
            <div style={{ padding: "14px 20px", fontSize: 11.5, color: "var(--text-muted)" }}>
              From each card a recruiter can shortlist, add a note, send a follow-up or invite to interview.
            </div>
          </GlassCard>
        </div>
      </div>

      <style>{`
        .crm-chip, .crm-opt {
          font: inherit; font-size: 12px; color: var(--text-2); cursor: pointer;
          background: rgba(255,255,255,0.06); border: 1px solid var(--border); border-radius: var(--r-sm);
          padding: 6px 12px; transition: color 0.15s, border-color 0.15s, background 0.15s;
        }
        .crm-chip:hover, .crm-opt:hover { color: var(--text); border-color: var(--border-strong); }
        .crm-chip.is-on, .crm-opt.is-on { color: var(--text); background: rgba(255,255,255,0.12); border-color: var(--border-strong); }
        .crm-clear {
          font: inherit; font-size: 12px; color: var(--text); background: none; border: none; padding: 0;
          cursor: pointer; text-decoration: underline; text-underline-offset: 3px;
        }
        @media (max-width: 900px) { .crm-grid { grid-template-columns: 1fr !important; gap: 24px !important; } }
      `}</style>
    </Section>
  );
}
