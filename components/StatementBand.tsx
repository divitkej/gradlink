"use client";

import ScrollHeading from "./anim/ScrollHeading";

/**
 * A quiet full-bleed band whose headline letters scatter and converge as you
 * scroll into it — a deliberate breathing moment that links the sections
 * around it. Minimal by design.
 */
export default function StatementBand({
  text,
  eyebrow,
}: {
  text: string;
  eyebrow?: string;
}) {
  return (
    <section
      style={{
        padding: "clamp(72px, 12vw, 140px) 24px",
        textAlign: "center",
        position: "relative",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        {eyebrow && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: 24,
            }}
          >
            {eyebrow}
          </div>
        )}
        <ScrollHeading
          text={text}
          style={{
            fontSize: "clamp(28px, 5vw, 60px)",
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: "var(--text)",
          }}
        />
      </div>
    </section>
  );
}
