/**
 * HeroBackground — the opening screen's atmosphere, and the one place on the
 * site that glows:
 *  - near-black monochrome base
 *  - one soft grey-white glow behind the wordmark (slow pulse)
 *  - faint grid texture and static edge contours
 *  - edge vignette to protect text contrast
 * Decorative only (aria-hidden, pointer-events none). The pulse is stilled
 * under prefers-reduced-motion via globals.css.
 */
export default function HeroBackground() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(130% 100% at 50% 28%, #161616 0%, #0D0D0D 45%, #050505 78%)",
        }}
      />

      <div
        className="grid-texture"
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.35,
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 42%, black 0%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 42%, black 0%, transparent 75%)",
        }}
      />

      {/* The glow */}
      <div
        style={{
          position: "absolute",
          top: "44%",
          left: "50%",
          width: "min(1000px, 125vw)",
          height: "min(1000px, 125vw)",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.015) 50%, transparent 66%)",
          animation: "heroGlowPulse 9s ease-in-out infinite",
        }}
      />

      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        style={{ position: "absolute", inset: 0, opacity: 0.5 }}
      >
        <defs>
          <linearGradient id="hero-contour" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="rgba(255,255,255,0)" />
            <stop offset="0.5" stopColor="rgba(255,255,255,0.14)" />
            <stop offset="1" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <path d="M -60 120 C 220 200, 220 700, -60 820" stroke="url(#hero-contour)" strokeWidth="1" />
        <path d="M -60 40 C 320 160, 320 760, -60 900" stroke="url(#hero-contour)" strokeWidth="1" />
        <path d="M 1500 120 C 1220 200, 1220 700, 1500 820" stroke="url(#hero-contour)" strokeWidth="1" />
        <path d="M 1500 40 C 1120 160, 1120 760, 1500 900" stroke="url(#hero-contour)" strokeWidth="1" />
      </svg>

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 82% 72% at 50% 44%, transparent 42%, rgba(0,0,0,0.55) 78%, #050505 100%)",
        }}
      />
    </div>
  );
}
