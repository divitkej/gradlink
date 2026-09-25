/**
 * GradLinkBackground — ONE continuous fixed backdrop rendered behind the
 * entire site (mounted once in layout). Every section is transparent so this
 * shows through top-to-bottom, eliminating per-section seams.
 *
 * Matte by design: a still monochrome gradient, a very faint grain, and an
 * edge vignette. No glows and no motion.
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
        background: "linear-gradient(180deg, #141414 0%, #0C0C0C 45%, #080808 100%)",
      }}
    >
      <div className="matte-grain" style={{ position: "absolute", inset: 0 }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 100% 70% at 50% 40%, transparent 55%, rgba(0,0,0,0.5) 100%)",
        }}
      />
    </div>
  );
}
