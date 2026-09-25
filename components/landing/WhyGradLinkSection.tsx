"use client";

import { Layers, QrCode, GraduationCap, BarChart3, Send, CalendarRange } from "lucide-react";
import { Section } from "../ui/Section";
import { MatteCard } from "../ui/primitives";
import { SectionHeading } from "../anim/primitives";

const reasons = [
  { icon: Layers, title: "Built for the full event lifecycle", body: "Before, during, after, and between events · not just registration." },
  { icon: QrCode, title: "Turns QR scans into outcomes", body: "Every scan can become a follow-up, shortlist, interview, or offer." },
  { icon: GraduationCap, title: "Prepares students before recruiters arrive", body: "Readiness scores, resume checks, mock interviews, and personalized event plans." },
  { icon: BarChart3, title: "Gives colleges real analytics", body: "Track engagement, company activity, interviews, offers, and placement impact." },
  { icon: Send, title: "Helps employers follow up faster", body: "Candidate filters, notes, shortlists, pipeline stages, and bulk messages." },
  { icon: CalendarRange, title: "Useful all year round", body: "Workshops, alumni mentoring, internships, employer relations, and outcome reporting." },
];

export default function WhyGradLinkSection() {
  return (
    <Section id="why" bg="var(--bg-2)">
      <SectionHeading
        badge="Why GradLink"
        title="Why choose GradLink for your next campus career fair?"
        subtitle="Because a career fair should produce more than attendance numbers. It should produce preparation, engagement, follow-ups, and measurable outcomes."
      />

      <div
        className="why-grid"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginTop: 56 }}
      >
        {reasons.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.title}>
              <MatteCard style={{ padding: 26, height: "100%" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "var(--r-md)",
                    background: "linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.10))",
                    border: "1px solid var(--border-strong)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 18,
                  }}
                >
                  <Icon size={21} color="var(--accent)" strokeWidth={1.6} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 600, color: "var(--text)", marginBottom: 9, lineHeight: 1.3 }}>
                  {r.title}
                </h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-2)" }}>{r.body}</p>
              </MatteCard>
            </div>
          );
        })}
      </div>

      <style>{`
        @media (max-width: 980px) { .why-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 640px) { .why-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </Section>
  );
}
