"use client";

import { motion } from "framer-motion";

/**
 * A quiet full-bleed band: a deliberate breathing moment that links the
 * sections around it. The headline rises in word by word, once, when it
 * scrolls into view.
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
        <motion.h2
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
          style={{
            fontSize: "clamp(28px, 5vw, 60px)",
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: "var(--text)",
          }}
        >
          {text.split(" ").map((word, i) => (
            <span key={i}>
              {i > 0 && " "}
              <motion.span
                style={{ display: "inline-block" }}
                variants={{
                  hidden: { opacity: 0, y: 28 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
                }}
              >
                {word}
              </motion.span>
            </span>
          ))}
        </motion.h2>
      </div>
    </section>
  );
}
