"use client";

import { Meter } from "@/components/ui/primitives";
import { ROI_POINTS_PER_PART, type RoiScore as Roi } from "@/lib/report";

/**
 * The Event ROI score with the five parts it is made of, so a college can see
 * what moved it and what to work on next time (see ROI_PARTS in lib/report.ts).
 */
export default function RoiScore({ roi }: { roi: Roi }) {
  return (
    <div className="roi" style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 18, alignItems: "start", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "14px 16px", marginBottom: 14 }}>
      <div>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 5 }}>Event ROI score</div>
        {roi.score === null ? (
          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>Shows once students register.</div>
        ) : (
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>
            <span style={{ fontSize: 34 }}>{roi.score.toFixed(1)}</span>
            <span style={{ fontSize: 15, color: "var(--text-muted)" }}>/10</span>
          </div>
        )}
        <p style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.5, marginTop: 8 }}>
          Five parts, {ROI_POINTS_PER_PART} points each, earned in proportion to each target.
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {roi.parts.map((p) => (
          <div key={p.key} title={`Share that ${p.about}`}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5, marginBottom: 4 }}>
              <span style={{ color: "var(--text-2)" }}>{p.label}</span>
              <span style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                {Math.round(p.rate)}% of {p.target}% target · <strong style={{ color: "var(--text)" }}>{p.points.toFixed(1)}</strong>/{ROI_POINTS_PER_PART}
              </span>
            </div>
            <Meter value={Math.min(100, (p.rate / p.target) * 100)} height={6} tone={p.rate >= p.target ? "var(--accent-2)" : "var(--accent)"} />
          </div>
        ))}
      </div>
      <style>{`@media (max-width: 640px) { .roi { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
