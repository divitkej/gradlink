"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import AnimatedTextCycle from "../anim/AnimatedTextCycle";
import Magnetic from "../anim/Magnetic";
import HeroDashboard from "./HeroDashboard";
import { Button, Badge } from "../ui/primitives";

const EASE = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE, delay: 0.25 + i * 0.12 },
  }),
};

export default function HeroSection() {
  return (
    <section
      id="hero"
      style={{
        position: "relative",
        paddingTop: 120,
        paddingBottom: 96,
        paddingLeft: 24,
        paddingRight: 24,
        overflow: "hidden",
        background: "transparent",
      }}
    >
      <div
        className="hero-grid"
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          position: "relative",
          display: "grid",
          gridTemplateColumns: "1.05fr 1fr",
          gap: 56,
          alignItems: "center",
        }}
      >
        {/* Left copy */}
        <div>
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
            <Badge tone="cyan" pulse>Career Event Intelligence · UAE</Badge>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            style={{
              fontSize: "clamp(34px, 5vw, 60px)",
              fontWeight: 700,
              lineHeight: 1.06,
              color: "var(--text)",
              margin: "22px 0 18px",
              maxWidth: 620,
            }}
          >
            Career fairs are broken{" "}
            <span className="text-gradient">after check-in.</span>
          </motion.h1>

          {/* Animated cycle line */}
          <motion.div
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(18px, 2.4vw, 26px)",
              fontWeight: 500,
              color: "var(--text-2)",
              marginBottom: 22,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            <span>GradLink helps colleges</span>
            <AnimatedTextCycle
              phrases={["Prepare students.", "Connect employers.", "Track outcomes.", "Prove career impact."]}
            />
          </motion.div>

          <motion.p
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            style={{ fontSize: 17, lineHeight: 1.7, color: "var(--text-2)", maxWidth: 480, marginBottom: 14 }}
          >
            GradLink turns campus career fairs, workshops, recruiter scans, and follow-ups into measurable
            placement outcomes.
          </motion.p>

          <motion.p
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 460, marginBottom: 30, fontStyle: "italic" }}
          >
            From check-in to offer, every student interaction becomes useful career data.
          </motion.p>

          <motion.div
            custom={5}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
          >
            <Magnetic>
              <Button href="/sign-up" variant="primary" icon={<ArrowRight size={17} />}>
                Get Started
              </Button>
            </Magnetic>
            <Magnetic>
              <Button href="#product" variant="secondary">Explore Platform</Button>
            </Magnetic>
          </motion.div>

        </div>

        {/* Right dashboard */}
        <div style={{ position: "relative", display: "flex", justifyContent: "flex-end" }} className="hero-dash-wrap">
          <div style={{ position: "relative" }}>
            <HeroDashboard />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
          .hero-dash-wrap { justify-content: center !important; }
        }
      `}</style>
    </section>
  );
}
