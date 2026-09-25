import { ImageResponse } from "next/og";

export const alt = "GradLink · career event intelligence for UAE colleges";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Social share card: monochrome logo tile + wordmark + tagline, matte black.
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
          background: "linear-gradient(180deg, #141414 0%, #0C0C0C 55%, #080808 100%)",
          padding: "82px 92px",
        }}
      >
        {/* logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
          <svg width="112" height="112" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="7" fill="#F5F5F5" />
            <path d="M21.75 11.18 A7.5 7.5 0 1 0 23.5 16 H16" fill="none" stroke="#0A0A0A" strokeWidth="3" />
          </svg>
          <div style={{ display: "flex", fontSize: 100, fontWeight: 600, letterSpacing: "-3px", color: "#F5F5F5" }}>
            GradLink
          </div>
        </div>

        {/* tagline */}
        <div style={{ display: "flex", marginTop: 38, fontSize: 46, fontWeight: 600, color: "#F5F5F5", lineHeight: 1.15 }}>
          Prepare students. Connect employers. Track outcomes.
        </div>

        {/* subline */}
        <div style={{ display: "flex", marginTop: 18, fontSize: 28, color: "#A3A3A3", lineHeight: 1.4 }}>
          From check-in to offer, every interaction becomes career data.
        </div>

        {/* label */}
        <div style={{ display: "flex", marginTop: 46, alignItems: "center" }}>
          <div style={{ display: "flex", padding: "12px 22px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.28)", color: "#D4D4D4", fontSize: 24, fontWeight: 600 }}>
            Career event intelligence · UAE colleges
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
