import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon (iOS / Android "add to home screen"): the cap mark, white on black.
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
          background: "#0A0A0A",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32">
          <path d="M16 7.5 L27 12.5 L16 17.5 L5 12.5 Z" fill="#F5F5F5" />
          <path d="M10 15.2 V20 C10 22 13 23.5 16 23.5 C19 23.5 22 22 22 20 V15.2" fill="none" stroke="#F5F5F5" strokeWidth="2.4" />
          <path d="M25 13.5 V21" stroke="#F5F5F5" strokeWidth="2" strokeLinecap="round" />
          <circle cx="25" cy="23" r="2.2" fill="#F5F5F5" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
