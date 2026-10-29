"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ClipboardCheck, Radio, MessageSquareReply, TrendingUp } from "lucide-react";
import { Section } from "../ui/Section";
import { SectionHeading } from "../anim/primitives";

const EASE = [0.22, 1, 0.36, 1] as const;

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

const DOT = 11;

/* Hollow until the line reaches it, then filled. */
function Dot({ on, delay = 0, innerRef }: { on: boolean; delay?: number; innerRef?: React.Ref<HTMLSpanElement> }) {
  return (
    <motion.span
      ref={innerRef}
      aria-hidden
      initial={false}
      animate={
        on
          ? { backgroundColor: "rgba(245,245,245,1)", borderColor: "rgba(245,245,245,1)", scale: [1, 1.35, 1] }
          : { backgroundColor: "rgba(245,245,245,0)", borderColor: "rgba(255,255,255,0.28)", scale: 1 }
      }
      transition={{ duration: 0.4, ease: "easeOut", delay: on ? delay : 0 }}
      style={{ display: "block", width: DOT, height: DOT, borderRadius: "50%", border: "1.5px solid", flexShrink: 0, position: "relative", zIndex: 1 }}
    />
  );
}

function StepText({ s, align }: { s: (typeof steps)[number]; align: "center" | "left" }) {
  const Icon = s.icon;
  return (
    <>
      <Icon size={24} color="var(--accent)" strokeWidth={1.5} style={{ marginBottom: 16 }} />
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.14em", color: "var(--text-muted)", marginBottom: 8 }}>{s.n}</div>
      <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>{s.phase}</h3>
      <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--text-2)", maxWidth: align === "center" ? 260 : 420 }}>{s.body}</p>
    </>
  );
}

/*
 * Wide screens: the steps sit in a row. When the row comes into view the line
 * travels left to right at a steady pace and each dot fills as the line
 * reaches it, with its step fading in alongside.
 */
const LINE_TIME = 1.8;

function JourneyRow() {
  const [shown, setShown] = useState(false);
  return (
    <motion.div
      onViewportEnter={() => setShown(true)}
      viewport={{ once: true, margin: "-120px" }}
      style={{ position: "relative", marginTop: 64 }}
    >
      {/* Faint track, then the line that draws over it */}
      <div aria-hidden style={{ position: "absolute", top: DOT / 2, left: "12.5%", right: "12.5%", height: 1, background: "var(--border)" }} />
      <motion.div
        aria-hidden
        initial={{ scaleX: 0 }}
        animate={{ scaleX: shown ? 1 : 0 }}
        transition={{ duration: LINE_TIME, ease: "linear" }}
        style={{ position: "absolute", top: DOT / 2, left: "12.5%", right: "12.5%", height: 1, background: "var(--accent)", transformOrigin: "left center" }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 28, position: "relative" }}>
        {steps.map((s, i) => {
          const at = (i / (steps.length - 1)) * LINE_TIME;
          return (
            <div key={s.n} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{ marginBottom: 26 }}>
                <Dot on={shown} delay={at} />
              </div>
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                transition={{ duration: 0.6, ease: EASE, delay: shown ? at + 0.1 : 0 }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
              >
                <StepText s={s} align="center" />
              </motion.div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/*
 * Phones and tablets: the steps stack down a line on the left. The line draws
 * down as you scroll, its tip held at 65% of the screen height, and each dot
 * fills the moment the tip reaches it. Scrolling back up retracts it.
 */
function JourneyColumn() {
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const dots = useRef<(HTMLSpanElement | null)[]>([]);
  const [geo, setGeo] = useState({ length: 0, stops: [] as number[] });
  const [reached, setReached] = useState(0);

  // Measure where each dot sits along the line.
  useLayoutEffect(() => {
    const measure = () => {
      const base = wrap.current?.getBoundingClientRect().top ?? 0;
      const tops = dots.current.map((d) => (d ? d.getBoundingClientRect().top - base : 0));
      const length = tops[tops.length - 1] - tops[0];
      setGeo({ length, stops: tops.map((t) => (length > 0 ? (t - tops[0]) / length : 0)) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({ target: track, offset: ["start 65%", "end 65%"] });
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const n = p <= 0 ? 0 : geo.stops.filter((f) => f <= p + 0.001).length;
    setReached((prev) => (prev === n ? prev : n));
  });

  return (
    <div ref={wrap} style={{ position: "relative", marginTop: 56 }}>
      <div
        ref={track}
        aria-hidden
        style={{ position: "absolute", left: DOT / 2 - 0.5, top: DOT / 2, height: geo.length, width: 1, background: "var(--border)" }}
      >
        <motion.div style={{ position: "absolute", inset: 0, background: "var(--accent)", transformOrigin: "top center", scaleY: scrollYProgress }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
        {steps.map((s, i) => (
          <div key={s.n} style={{ display: "grid", gridTemplateColumns: `${DOT}px 1fr`, columnGap: 22, alignItems: "start" }}>
            <Dot on={reached > i} innerRef={(el) => { dots.current[i] = el; }} />
            <motion.div
              initial={{ opacity: 0.35 }}
              animate={{ opacity: reached > i ? 1 : 0.35 }}
              transition={{ duration: 0.4 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginTop: -6 }}
            >
              <StepText s={s} align="left" />
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProductJourneySection() {
  // Row on wide screens, a column down a left-hand line below 981px.
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 981px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <Section id="journey">
      <SectionHeading
        badge="How It Works"
        align="center"
        title="One platform for the complete career journey."
        subtitle="GradLeap connects preparation, live engagement, follow-up, and outcome reporting in one continuous loop."
      />
      {wide ? <JourneyRow /> : <JourneyColumn />}
    </Section>
  );
}
