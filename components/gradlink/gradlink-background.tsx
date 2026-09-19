"use client";

import BackgroundPaths from "../anim/BackgroundPaths";

/**
 * GradLinkBackground — ONE continuous fixed atmosphere rendered behind the
 * entire site (mounted once in layout). Every section is transparent so this
 * shows through top-to-bottom, eliminating per-section seams.
 *
 * Layers: deep navy base · central teal glow (slow pulse) · drifting cyan
 * glow · faint data-paths · low-opacity dot grid · edge vignette.
 * CSS-animated for performance; stilled under prefers-reduced-motion (globals.css).
 */
export default function GradLinkBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        overflow: "hidden",
        pointerEvents: "none",
        background:
          "radial-gradient(140% 120% at 50% -10%, #0a1d31 0%, #061320 42%, #040c16 72%, #03080f 100%)",
      }}
    >
      {/* faint dot grid, fades toward edges */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(rgba(53,211,255,0.05) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          opacity: 0.5,
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 35%, black 0%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 70% at 50% 35%, black 0%, transparent 80%)",
        }}
      />

      {/* slow-moving data trails */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.4 }}>
        <BackgroundPaths opacity={1} />
      </div>

      {/* central teal glow — anchored near the top, slow pulse */}
      <div
        style={{
          position: "absolute",
          top: "-8%",
          left: "50%",
          width: "min(1200px, 140vw)",
          height: "min(1100px, 130vw)",
          transform: "translate(-50%, 0)",
          background:
            "radial-gradient(circle, rgba(0,194,168,0.16) 0%, rgba(53,211,255,0.07) 32%, transparent 62%)",
          animation: "heroGlowPulse 10s ease-in-out infinite",
        }}
      />

      {/* drifting secondary glow lower on the page */}
      <div
        style={{
          position: "absolute",
          top: "55%",
          left: "50%",
          width: "min(900px, 110vw)",
          height: "min(900px, 110vw)",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, rgba(53,211,255,0.08) 0%, transparent 60%)",
          animation: "heroDrift 22s ease-in-out infinite",
        }}
      />

      {/* edge vignette to protect text contrast everywhere */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 100% 70% at 50% 40%, transparent 55%, rgba(3,8,15,0.5) 100%)",
        }}
      />
    </div>
  );
}
