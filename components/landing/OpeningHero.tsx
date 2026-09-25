"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import ShaderBackground from "../ui/shader-background";
import { useMounted } from "../anim/primitives";
import HeroBackground from "./HeroBackground";
import ParticleText from "../anim/ParticleText";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function OpeningHero() {
  const reduce = useReducedMotion();
  const mounted = useMounted();

  // Intro choreography (slower):
  //   1. particles converge into "GradLink"            (phase: "intro")
  //   2. dissolve into the solid wordmark, SAME size    (phase: "solid")
  //   3. tagline appears, then the plasma background    (after solid)
  const [phase, setPhase] = useState<"intro" | "solid">("intro");
  const [bgOn, setBgOn] = useState(false);

  // Word size shared by particles + solid text so the morph has no size jump.
  const [wordSize, setWordSize] = useState(84);
  useEffect(() => {
    const calc = () =>
      setWordSize(Math.max(46, Math.min(96, Math.round(window.innerWidth * 0.17))));
    const id = setTimeout(calc, 0);
    window.addEventListener("resize", calc);
    return () => {
      clearTimeout(id);
      window.removeEventListener("resize", calc);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (reduce) {
      const id = requestAnimationFrame(() => {
        setPhase("solid");
        setBgOn(true);
      });
      return () => cancelAnimationFrame(id);
    }
    const tSolid = setTimeout(() => setPhase("solid"), 3600); // particles → solid
    const tBg = setTimeout(() => setBgOn(true), 4400); // then background
    return () => {
      clearTimeout(tSolid);
      clearTimeout(tBg);
    };
  }, [mounted, reduce]);

  const boxH = Math.round(wordSize * 1.5);

  return (
    <section
      id="top"
      style={{
        position: "relative",
        height: "100svh",
        minHeight: 560,
        width: "100%",
        overflow: "hidden",
        background: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Hero background stack — bottom-masked to dissolve into the global bg. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          maskImage: "linear-gradient(to bottom, black 78%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 78%, transparent 100%)",
        }}
      >
        <HeroBackground />
        {bgOn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2.2, ease: EASE }}
            style={{ position: "absolute", inset: 0 }}
          >
            <ShaderBackground />
          </motion.div>
        )}
      </div>

      {/* Legibility overlay */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 85% 75% at 50% 46%, transparent 40%, rgba(0,0,0,0.5) 78%, rgba(0,0,0,0.35) 100%)",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: "0 24px",
        }}
      >
        {/* Wordmark: particles and solid text share wordSize → seamless dissolve */}
        <div style={{ position: "relative", width: "min(640px, 92vw)", height: boxH, marginBottom: 30 }}>
          {mounted && !reduce && (
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: phase === "solid" ? 0 : 1 }}
              transition={{ duration: 1.2, ease: EASE }}
              style={{ position: "absolute", inset: 0 }}
            >
              <ParticleText
                text="GradLink"
                fontSize={wordSize}
                height={boxH}
                color="#FFFFFF"
                lerp={0.05}
                frames={300}
              />
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "solid" ? 1 : 0 }}
            transition={{ duration: 1.2, ease: EASE }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: wordSize,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ color: "var(--text)" }}>Grad</span>
              <span className="text-gradient">Link</span>
            </span>
          </motion.div>
        </div>

        {/* Tagline — two lines, appears after the wordmark solidifies */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: phase === "solid" ? 1 : 0, y: phase === "solid" ? 0 : 12 }}
          transition={{ duration: 0.9, ease: EASE, delay: reduce ? 0 : 0.55 }}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(16px, 2.3vw, 23px)",
            fontWeight: 500,
            letterSpacing: "0.01em",
            color: "var(--text)",
            lineHeight: 1.55,
          }}
        >
          <div style={{ color: "#FFFFFF", fontWeight: 700, textShadow: "0 1px 12px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9)" }}>Prepare students. Connect employers.</div>
          <div style={{ marginTop: 4 }}>
            <span style={{ color: "#FFFFFF", fontWeight: 700, textShadow: "0 1px 12px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9)" }}>Track outcomes.</span>
          </div>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.a
        href="#hero"
        aria-label="Scroll to explore"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: reduce ? 0 : 4.8 }}
        style={{
          position: "absolute",
          bottom: 32,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          color: "var(--text-2)",
          textDecoration: "none",
        }}
      >
        <span style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>Scroll</span>
        <motion.span
          animate={reduce ? {} : { y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ display: "inline-flex" }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 3v11M4 9l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.span>
      </motion.a>
    </section>
  );
}
