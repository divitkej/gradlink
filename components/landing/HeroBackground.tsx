/**
 * HeroBackground — premium product-launch atmosphere:
 *  - deep near-black/navy base
 *  - large soft teal/cyan central glow (slow pulse)
 *  - extremely subtle drifting secondary glow
 *  - tighter "spotlight" behind the central content
 *  - faint contour/path lines near the edges (slow drift)
 *  - edge vignette + faint grid texture
 * All layers are decorative (aria-hidden, pointer-events none), CSS-animated
 * for performance, and auto-stilled under prefers-reduced-motion via globals.css.
 */
export default function HeroBackground() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
      {/* Base near-black navy gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(130% 100% at 50% 28%, #0a1d30 0%, #061320 45%, #03080f 78%, #02060c 100%)",
        }}
      />

      {/* Faint grid texture for depth (very low contrast) */}
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

      {/* Large soft central teal/cyan glow — slow pulse */}
      <div
        style={{
          position: "absolute",
          top: "42%",
          left: "50%",
          width: "min(1100px, 130vw)",
          height: "min(1100px, 130vw)",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, rgba(0,194,168,0.20) 0%, rgba(53,211,255,0.10) 28%, rgba(53,211,255,0.03) 48%, transparent 65%)",
          filter: "blur(8px)",
          animation: "heroGlowPulse 8s ease-in-out infinite",
        }}
      />

      {/* Subtle drifting secondary glow */}
      <div
        style={{
          position: "absolute",
          top: "44%",
          left: "50%",
          width: "min(760px, 90vw)",
          height: "min(760px, 90vw)",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, rgba(53,211,255,0.10) 0%, transparent 60%)",
          animation: "heroDrift 16s ease-in-out infinite",
        }}
      />

      {/* Faint contour lines near the edges (slow vertical drift) */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.5,
          animation: "heroLineDrift 12s ease-in-out infinite",
        }}
      >
        <defs>
          <linearGradient id="hero-contour" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="rgba(53,211,255,0)" />
            <stop offset="0.5" stopColor="rgba(53,211,255,0.16)" />
            <stop offset="1" stopColor="rgba(53,211,255,0)" />
          </linearGradient>
        </defs>
        {/* left-edge contours */}
        <path d="M -60 120 C 220 200, 220 700, -60 820" stroke="url(#hero-contour)" strokeWidth="1" />
        <path d="M -60 40 C 320 160, 320 760, -60 900" stroke="url(#hero-contour)" strokeWidth="1" />
        {/* right-edge contours */}
        <path d="M 1500 120 C 1220 200, 1220 700, 1500 820" stroke="url(#hero-contour)" strokeWidth="1" />
        <path d="M 1500 40 C 1120 160, 1120 760, 1500 900" stroke="url(#hero-contour)" strokeWidth="1" />
      </svg>

      {/* Tight spotlight behind central content — slow opacity pulse */}
      <div
        style={{
          position: "absolute",
          top: "44%",
          left: "50%",
          width: "min(620px, 80vw)",
          height: "min(420px, 60vw)",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(ellipse, rgba(0,194,168,0.16) 0%, rgba(53,211,255,0.06) 40%, transparent 70%)",
          animation: "heroSpotPulse 7s ease-in-out infinite",
        }}
      />

      {/* Edge vignette — darkens corners, protects text contrast */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 82% 72% at 50% 44%, transparent 42%, rgba(2,6,12,0.55) 78%, #02060c 100%)",
        }}
      />
    </div>
  );
}
