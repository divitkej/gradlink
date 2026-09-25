"use client";

import { ArrowRight, Check } from "lucide-react";
import { Section } from "./ui/Section";
import { Button } from "./ui/primitives";
import AnimatedTextCycle from "./anim/AnimatedTextCycle";
import ParticleText from "./anim/ParticleText";
import ShaderGlow from "./anim/ShaderGlow";
import BackgroundPaths from "./anim/BackgroundPaths";

const chips = ["Setup in 48 hours", "No contract lock-in", "Dedicated onboarding", "UAE data residency"];

export default function CTASection() {
  return (
    <Section id="cta">
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "var(--r-xl)",
          border: "1px solid var(--border-strong)",
          background: "linear-gradient(160deg, var(--surface) 0%, var(--bg-2) 100%)",
          padding: "clamp(40px, 7vw, 80px) clamp(24px, 5vw, 64px)",
          textAlign: "center",
        }}
      >
        <BackgroundPaths opacity={0.35} />
        <ShaderGlow intensity={0.7} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto" }}>
          {/* Particle headline */}
          <div>
            <div style={{ marginBottom: 8 }}>
              <ParticleText text="GradLink" fontSize={64} height={96} color="#35D3FF" />
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: "clamp(26px, 3.6vw, 42px)", fontWeight: 700, color: "var(--text)", lineHeight: 1.12, marginBottom: 20 }}>
              Your next career fair should do more than fill a hall.
            </h2>
          </div>

          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(17px, 2.2vw, 24px)", fontWeight: 500, color: "var(--text-2)", marginBottom: 22, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, alignItems: "baseline" }}>
              <AnimatedTextCycle phrases={["Prepare students.", "Connect employers.", "Track outcomes.", "Prove placement impact."]} />
            </div>
          </div>

          <div>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--text-2)", maxWidth: 580, margin: "0 auto 32px" }}>
              GradLink gives colleges the system to run better events, support students earlier, help employers follow up
              faster, and measure what happens after the fair.
            </p>
          </div>

          <div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Button href="/sign-up" variant="primary" icon={<ArrowRight size={17} />}>Get Started</Button>
              <Button href="#product" variant="secondary">Explore Platform</Button>
            </div>
          </div>

          <div>
            <div style={{ marginTop: 44, paddingTop: 32, borderTop: "1px solid var(--border)", display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
              {chips.map((c) => (
                <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--text-2)" }}>
                  <Check size={15} color="var(--teal)" strokeWidth={2.4} />
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
