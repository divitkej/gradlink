"use client";

import { CalendarX, EyeOff, FileX2 } from "lucide-react";
import { Section } from "../ui/Section";
import MatteCard from "./MatteCard";
import { SectionHeading } from "../anim/primitives";

const problems = [
  {
    icon: CalendarX,
    title: "Students arrive unprepared",
    body: "Before the event, students often lack resume feedback, mock interviews, company research, and a clear event plan.",
    tag: "No readiness data",
  },
  {
    icon: EyeOff,
    title: "Engagement is invisible",
    body: "During the event, booth visits, recruiter conversations, workshops, and waitlists are hard to track.",
    tag: "No interaction data",
  },
  {
    icon: FileX2,
    title: "Follow-ups disappear",
    body: "After the event, shortlists, messages, applications, interviews, and offers scatter across spreadsheets and inboxes.",
    tag: "No outcome data",
  },
];

export default function ProblemSection() {
  return (
    <Section id="problem">
      <SectionHeading
        badge="The Problem"
        accent="var(--text-2)"
        title={
          <>
            Career fairs should not disappear into{" "}
            <span className="text-gradient">spreadsheets.</span>
          </>
        }
        subtitle="Colleges know who attended. They rarely know who prepared, who met recruiters, who followed up, who got shortlisted, and who converted into interviews or offers."
      />

      <div
        className="problem-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 22,
          marginTop: 56,
        }}
      >
        {problems.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.title}>
              <MatteCard style={{ padding: 28, height: "100%" }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: "var(--r-md)",
                    background: "rgba(255,255,255,0.10)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 20,
                  }}
                >
                  <Icon size={22} color="var(--text-muted)" strokeWidth={1.6} />
                </div>
                <h3 style={{ fontSize: 19, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>{p.title}</h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "var(--text-2)", marginBottom: 22 }}>{p.body}</p>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.22)",
                    borderRadius: "var(--r-full)",
                    padding: "4px 11px",
                  }}
                >
                  {p.tag}
                </span>
              </MatteCard>
            </div>
          );
        })}
      </div>

      <style>{`
        @media (max-width: 900px) { .problem-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </Section>
  );
}
