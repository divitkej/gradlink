"use client";

import { ClipboardCheck, Radio, MessageSquareReply, TrendingUp } from "lucide-react";
import { Section } from "../ui/Section";
import { MatteCard } from "../ui/primitives";
import { SectionHeading } from "../anim/primitives";

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
        subtitle="GradLink connects preparation, live engagement, follow-up, and outcome reporting in one continuous loop."
      />

      <div style={{ position: "relative", marginTop: 64 }}>
        {/* Glowing connection line (desktop) */}
        <div
          className="journey-line"
          aria-hidden
          style={{
            position: "absolute",
            top: 38,
            left: "12.5%",
            right: "12.5%",
            height: 2,
            background: "linear-gradient(90deg, transparent, var(--accent), var(--accent-2), transparent)",
            opacity: 0.5,
          }}
        />
        <div
          className="journey-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, position: "relative" }}
        >
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.n}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  {/* Node */}
                  <div
                    style={{
                      width: 76,
                      height: 76,
                      borderRadius: "50%",
                      background: "var(--surface)",
                      border: "1px solid var(--border-strong)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 22,
                      boxShadow: "0 0 0 6px rgba(255,255,255,0.05)",
                      position: "relative",
                    }}
                  >
                    <Icon size={26} color="var(--accent)" strokeWidth={1.5} />
                    <span
                      style={{
                        position: "absolute",
                        top: -8,
                        right: -8,
                        fontFamily: "var(--font-display)",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--accent-2)",
                        background: "var(--bg)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--r-full)",
                        padding: "2px 8px",
                      }}
                    >
                      {s.n}
                    </span>
                  </div>
                  <MatteCard style={{ padding: 22, width: "100%" }}>
                    <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>{s.phase}</h3>
                    <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--text-2)" }}>{s.body}</p>
                  </MatteCard>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .journey-grid { grid-template-columns: 1fr 1fr !important; gap: 32px 20px !important; }
          .journey-line { display: none !important; }
        }
        @media (max-width: 560px) { .journey-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </Section>
  );
}
