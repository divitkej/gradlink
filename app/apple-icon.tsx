import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon (iOS / Android "add to home screen").
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #071827 0%, #0B1E33 100%)",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="32" y2="32">
              <stop stopColor="#35D3FF" />
              <stop offset="1" stopColor="#00C2A8" />
            </linearGradient>
          </defs>
          <path d="M10 10 L22 22" stroke="url(#g)" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="10" cy="10" r="5" fill="#0B1E33" stroke="url(#g)" strokeWidth="2.6" />
          <circle cx="22" cy="22" r="5" fill="url(#g)" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
