"use client";

import { Layers, QrCode, GraduationCap, BarChart3, Send, CalendarRange } from "lucide-react";
import { Section } from "../ui/Section";
import { SectionHeading, RevealGroup, RevealItem } from "../anim/primitives";

const reasons = [
  { icon: Layers, title: "Built for the full event lifecycle", body: "Before, during, after, and between events · not just registration." },
  { icon: QrCode, title: "Turns QR scans into outcomes", body: "Every scan can become a follow-up, shortlist, interview, or offer." },
  { icon: GraduationCap, title: "Prepares students before recruiters arrive", body: "Readiness scores, resume checks, mock interviews, and personalized event plans." },
  { icon: BarChart3, title: "Gives colleges real analytics", body: "Track engagement, company activity, interviews, offers, and placement impact." },
  { icon: Send, title: "Helps employers follow up faster", body: "Candidate filters, notes, shortlists, pipeline stages, and bulk messages." },
  { icon: CalendarRange, title: "Useful all year round", body: "Workshops, alumni mentoring, internships, employer relations, and outcome reporting." },
];

export default function WhyGradLeapSection() {
  return (
    <Section id="why">
      <SectionHeading
        badge="Why GradLeap"
        title="Why choose GradLeap for your next campus career fair?"
        subtitle="Because a career fair should produce more than attendance numbers. It should produce preparation, engagement, follow-ups, and measurable outcomes."
      />

      <RevealGroup
        className="why-grid"
        stagger={0.08}
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "48px 40px", marginTop: 56 }}
      >
        {reasons.map((r) => {
          const Icon = r.icon;
          return (
            <RevealItem key={r.title} style={{ borderTop: "1px solid var(--border-strong)", paddingTop: 24 }}>
              <Icon size={22} color="var(--accent)" strokeWidth={1.6} style={{ marginBottom: 16 }} />
              <h3 style={{ fontSize: 17, fontWeight: 600, color: "var(--text)", marginBottom: 9, lineHeight: 1.3 }}>
                {r.title}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-2)" }}>{r.body}</p>
            </RevealItem>
          );
        })}
      </RevealGroup>

      <style>{`
        @media (max-width: 980px) { .why-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 640px) { .why-grid { grid-template-columns: 1fr !important; gap: 36px !important; } }
      `}</style>
    </Section>
  );
}
