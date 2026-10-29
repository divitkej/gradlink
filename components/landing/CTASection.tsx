"use client";

import { ArrowRight, Check } from "lucide-react";
import { Section } from "../ui/Section";
import { Button } from "../ui/primitives";
import AnimatedTextCycle from "../anim/AnimatedTextCycle";
import { RevealGroup, RevealItem } from "../anim/primitives";

const chips = ["Setup in 48 hours", "No contract lock-in", "Dedicated onboarding", "Free for students and employers"];

export default function CTASection() {
  return (
    <Section id="cta">
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "clamp(24px, 5vw, 48px) 0",
          textAlign: "center",
        }}
      >

        <RevealGroup stagger={0.1} style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto" }}>
          <RevealItem>
            <h2 style={{ fontSize: "clamp(26px, 3.6vw, 42px)", fontWeight: 700, color: "var(--text)", lineHeight: 1.12, marginBottom: 20 }}>
              Your next career fair should do more than fill a hall.
            </h2>
          </RevealItem>

          <RevealItem>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(17px, 2.2vw, 24px)", fontWeight: 500, color: "var(--text-2)", marginBottom: 22, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, alignItems: "baseline" }}>
              <AnimatedTextCycle phrases={["Prepare students.", "Connect employers.", "Track outcomes.", "Prove placement impact."]} />
            </div>
          </RevealItem>

          <RevealItem>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--text-2)", maxWidth: 580, margin: "0 auto 32px" }}>
              GradLeap gives colleges the system to run better events, support students earlier, help employers follow up
              faster, and measure what happens after the fair.
            </p>
          </RevealItem>

          <RevealItem>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Button href="/sign-up" variant="primary" icon={<ArrowRight size={17} />}>Get Started</Button>
              <Button href="#product" variant="secondary">Explore Platform</Button>
            </div>
          </RevealItem>

          <RevealItem>
            <div style={{ marginTop: 44, paddingTop: 32, borderTop: "1px solid var(--border)", display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
              {chips.map((c) => (
                <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--text-2)" }}>
                  <Check size={15} color="var(--accent-2)" strokeWidth={2.4} />
                  {c}
                </span>
              ))}
            </div>
          </RevealItem>
        </RevealGroup>
      </div>
    </Section>
  );
}
