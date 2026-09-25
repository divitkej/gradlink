import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon (iOS / Android "add to home screen"): the G mark, white on black.
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
          <path d="M21.75 11.18 A7.5 7.5 0 1 0 23.5 16 H16" fill="none" stroke="#F5F5F5" strokeWidth="3" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
