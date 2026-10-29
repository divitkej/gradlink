"use client";

import { motion } from "framer-motion";
import { ClipboardCheck, Radio, MessageSquareReply, TrendingUp } from "lucide-react";
import { Section } from "../ui/Section";
import { SectionHeading, RevealGroup, RevealItem } from "../anim/primitives";

const steps = [
  {
    n: "01",
    icon: ClipboardCheck,
    phase: "Prepare",
    body: "Profiles, resumes, readiness scores, workshops, mock interviews, and company matching.",
  },
  {
    n: "02",
    icon: Radio,
    phase: "Engage",
    body: "QR scans, booth check-ins, live sessions, waitlists, 1:1 recruiter slots, and digital passports.",
  },
  {
    n: "03",
    icon: MessageSquareReply,
    phase: "Follow up",
    body: "Shortlists, messages, applications, interview bookings, candidate notes, and pipeline tracking.",
  },
  {
    n: "04",
    icon: TrendingUp,
    phase: "Prove impact",
    body: "Outcome analytics, employer engagement, interview tracking, offer reports, and placement insights.",
  },
];

export default function ProductJourneySection() {
  return (
    <Section id="journey">
      <SectionHeading
        badge="How It Works"
        align="center"
        title="One platform for the complete career journey."
        subtitle="GradLeap connects preparation, live engagement, follow-up, and outcome reporting in one continuous loop."
      />

      <RevealGroup stagger={0.18} style={{ position: "relative", marginTop: 64 }}>
        {/* Connection line (desktop), drawn left to right as the steps appear */}
        <motion.div
          className="journey-line"
          aria-hidden
          variants={{
            hidden: { scaleX: 0 },
            show: { scaleX: 1, transition: { duration: 1.4, ease: [0.22, 1, 0.36, 1] } },
          }}
          style={{
            transformOrigin: "left center",
            position: "absolute",
            top: 5,
            left: "12.5%",
            right: "12.5%",
            height: 1,
            background: "var(--border-strong)",
          }}
        />
        <div
          className="journey-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 28, position: "relative" }}
        >
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <RevealItem key={s.n}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  {/* Dot on the line */}
                  <span
                    aria-hidden
                    style={{ width: 11, height: 11, borderRadius: "50%", background: "var(--accent)", marginBottom: 26 }}
                  />
                  <Icon size={24} color="var(--accent)" strokeWidth={1.5} style={{ marginBottom: 16 }} />
                  <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", color: "var(--text-muted)", marginBottom: 8 }}>{s.n}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>{s.phase}</h3>
                  <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--text-2)", maxWidth: 260 }}>{s.body}</p>
                </div>
              </RevealItem>
            );
          })}
        </div>
      </RevealGroup>

      <style>{`
        @media (max-width: 980px) {
          .journey-grid { grid-template-columns: 1fr 1fr !important; gap: 48px 24px !important; }
          .journey-line { display: none !important; }
        }
        @media (max-width: 560px) { .journey-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </Section>
  );
}
