import { ImageResponse } from "next/og";

export const alt = "GradLink — career event intelligence for UAE colleges";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded social share card: GradLink node-link logo + wordmark + tagline.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "linear-gradient(135deg, #050B14 0%, #071827 55%, #0B1E33 100%)",
          padding: "82px 92px",
          position: "relative",
        }}
      >
        {/* top accent bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 7, display: "flex", background: "linear-gradient(90deg, #35D3FF, #00C2A8)" }} />
        {/* soft glow */}
        <div style={{ position: "absolute", top: -160, right: -120, width: 540, height: 540, borderRadius: 9999, display: "flex", background: "radial-gradient(closest-side, rgba(0,194,168,0.22), rgba(0,194,168,0))" }} />

        {/* logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
          <svg width="112" height="112" viewBox="0 0 32 32">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="32" y2="32">
                <stop stopColor="#35D3FF" />
                <stop offset="1" stopColor="#00C2A8" />
              </linearGradient>
            </defs>
            <path d="M10 10 L22 22" stroke="url(#g)" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="10" cy="10" r="5" fill="#0B1E33" stroke="url(#g)" strokeWidth="2.4" />
            <circle cx="22" cy="22" r="5" fill="url(#g)" />
          </svg>
          <div style={{ display: "flex", fontSize: 100, fontWeight: 700, letterSpacing: "-3px" }}>
            <span style={{ color: "#F5F8FF" }}>Grad</span>
            <span style={{ color: "#35D3FF" }}>Link</span>
          </div>
        </div>

        {/* tagline */}
        <div style={{ display: "flex", marginTop: 38, fontSize: 46, fontWeight: 600, color: "#EAF2FB", lineHeight: 1.15 }}>
          Prepare students. Connect employers. Track outcomes.
        </div>

        {/* subline */}
        <div style={{ display: "flex", marginTop: 18, fontSize: 28, color: "#9FB3C8", lineHeight: 1.4 }}>
          From check-in to offer, every interaction becomes career data.
        </div>

        {/* chip */}
        <div style={{ display: "flex", marginTop: 46, alignItems: "center" }}>
          <div style={{ display: "flex", padding: "12px 22px", borderRadius: 9999, border: "1px solid rgba(53,211,255,0.45)", color: "#35D3FF", fontSize: 24, fontWeight: 600 }}>
            Career event intelligence · UAE colleges
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
