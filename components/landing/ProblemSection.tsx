"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Section } from "../ui/Section";
import { SectionHeading } from "../anim/primitives";

const EASE = [0.22, 1, 0.36, 1] as const;

const stages = [
  {
    phase: "Before the fair",
    title: "Students arrive unprepared",
    body: "Career centres cannot see who prepared.",
    missing: ["Resume feedback", "Mock interviews", "Company research", "An event plan"],
    verdict: "No readiness data",
  },
  {
    phase: "During the fair",
    title: "Engagement is invisible",
    body: "What happens at the booths goes unrecorded.",
    missing: ["Booth visits", "Recruiter conversations", "Workshops", "Waitlists"],
    verdict: "No engagement data",
  },
  {
    phase: "After the fair",
    title: "Follow-ups disappear",
    body: "Next steps scatter across spreadsheets and inboxes.",
    missing: ["Shortlists", "Messages", "Applications", "Interviews and offers"],
    verdict: "No outcome data",
  },
];

/*
 * Each stage plays once: the rule draws, the things that should happen appear
 * one by one, each gets struck through, then the verdict lands. On wide
 * screens the three stages sit side by side and play in turn; on phones each
 * starts when it scrolls into view, so none plays off screen.
 */
function Stage({ stage, index, offset }: { stage: (typeof stages)[number]; index: number; offset: number }) {
  const t = (s: number) => ({ duration: 0.5, ease: EASE, delay: offset + s });
  const listStart = 0.55;
  const strikeStart = listStart + stage.missing.length * 0.12 + 0.35;
  const verdictAt = strikeStart + stage.missing.length * 0.1 + 0.35;

  return (
    <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.5 }}>
      <motion.div
        aria-hidden
        variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.7, ease: EASE, delay: offset } } }}
        style={{ height: 1, background: "var(--border-strong)", transformOrigin: "left center", marginBottom: 24 }}
      />
      <motion.div
        variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: t(0.15) } }}
        style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 14 }}
      >
        <span style={{ color: "var(--text-2)", marginRight: 10 }}>{`0${index + 1}`}</span>
        {stage.phase}
      </motion.div>
      <motion.h3
        variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: t(0.25) } }}
        style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.25, color: "var(--text)", marginBottom: 8 }}
      >
        {stage.title}
      </motion.h3>
      <motion.p
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: t(0.35) } }}
        style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--text-2)", marginBottom: 22 }}
      >
        {stage.body}
      </motion.p>

      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {stage.missing.map((item, i) => (
          <motion.li
            key={item}
            variants={{
              hidden: { opacity: 0, x: -8 },
              show: {
                opacity: [0, 1, 1, 0.5],
                x: 0,
                transition: {
                  duration: strikeStart + i * 0.1 + 0.4 - (listStart + i * 0.12),
                  times: [0, 0.15, 0.85, 1],
                  delay: offset + listStart + i * 0.12,
                  x: { duration: 0.4, ease: EASE, delay: offset + listStart + i * 0.12 },
                },
              },
            }}
            style={{ fontSize: 15, color: "var(--text)", width: "fit-content", position: "relative" }}
          >
            {item}
            <motion.span
              aria-hidden
              variants={{
                hidden: { scaleX: 0 },
                show: { scaleX: 1, transition: { duration: 0.35, ease: "easeOut", delay: offset + strikeStart + i * 0.1 } },
              }}
              style={{
                position: "absolute",
                left: -2,
                right: -2,
                top: "54%",
                height: 1.5,
                background: "var(--danger)",
                transformOrigin: "left center",
              }}
            />
          </motion.li>
        ))}
      </ul>

      <motion.div
        variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: t(verdictAt) } }}
        style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 600, color: "var(--text)" }}
      >
        <X size={17} color="var(--danger)" strokeWidth={2.4} aria-hidden />
        {stage.verdict}
      </motion.div>
    </motion.div>
  );
}

export default function ProblemSection() {
  // Side by side, the stages play in turn; stacked on phones, each starts on its own.
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 901px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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
          gap: 48,
          marginTop: 56,
        }}
      >
        {stages.map((s, i) => (
          <Stage key={s.phase} stage={s} index={i} offset={wide ? i * 1.4 : 0} />
        ))}
      </div>

      <style>{`
        @media (max-width: 900px) { .problem-grid { grid-template-columns: 1fr !important; gap: 56px !important; } }
      `}</style>
    </Section>
  );
}
