"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

export type StatPanel = {
  value: string;
  label: string;
  depth: string;
  sub: { k: string; v: string }[];
};

/**
 * HoverExpandStats — a row of statistic panels where the active panel expands
 * to reveal depth (breakdown), the rest collapse to slim spines.
 * Adapted from Skiper52 HoverExpand_001 (hover/click to expand). No images —
 * the expanded surface reveals data depth instead.
 * Hydration-safe: `initial` widths/styles are constant; layout settles via
 * `animate` (client-only). Mobile: row scrolls horizontally, no overflow break.
 */
export default function HoverExpandStats({ panels }: { panels: StatPanel[] }) {
  const [active, setActive] = useState(0);

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        width: "100%",
        overflowX: "auto",
        paddingBottom: 4,
      }}
      className="hes-row"
    >
      {panels.map((p, i) => {
        const isActive = active === i;
        return (
          <motion.div
            key={p.label}
            onMouseEnter={() => setActive(i)}
            onClick={() => setActive(i)}
            initial={{ flexBasis: "5.5rem" }}
            animate={{ flexBasis: isActive ? "26rem" : "5.5rem" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "relative",
              flexShrink: 0,
              height: "20rem",
              minWidth: "5.5rem",
              cursor: "pointer",
              overflow: "hidden",
              borderRadius: "var(--r-lg)",
              border: `1px solid ${isActive ? "var(--border-strong)" : "var(--border)"}`,
              background: isActive
                ? "linear-gradient(160deg, var(--surface-elev), var(--surface))"
                : "var(--glass)",
              boxShadow: isActive ? "none" : "none",
              transition: "border-color 0.3s ease, box-shadow 0.3s ease",
            }}
          >

            {/* Collapsed spine: vertical label + value */}
            {!isActive && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "18px 0",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "var(--accent)",
                  }}
                >
                  {p.value}
                </span>
                <span
                  style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                    fontSize: 12,
                    letterSpacing: "0.08em",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                  }}
                >
                  {p.label}
                </span>
              </div>
            )}

            {/* Expanded content */}
            <AnimatePresence>
              {isActive && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, delay: 0.12 }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: 26,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 52,
                        fontWeight: 700,
                        color: "var(--text)",
                        letterSpacing: "-0.03em",
                        lineHeight: 1,
                      }}
                    >
                      {p.value}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--accent)",
                        marginTop: 8,
                      }}
                    >
                      {p.label}
                    </div>
                    <p
                      style={{
                        fontSize: 14,
                        lineHeight: 1.65,
                        color: "var(--text-2)",
                        marginTop: 14,
                        maxWidth: "22rem",
                      }}
                    >
                      {p.depth}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                      borderTop: "1px solid var(--border)",
                      paddingTop: 16,
                    }}
                  >
                    {p.sub.map((s) => (
                      <div key={s.k}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.k}</div>
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 16,
                            fontWeight: 700,
                            color: "var(--accent-2)",
                            marginTop: 2,
                          }}
                        >
                          {s.v}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
      <style>{`.hes-row::-webkit-scrollbar { height: 6px; }`}</style>
    </div>
  );
}
