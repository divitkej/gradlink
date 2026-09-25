import type { ReactNode } from "react";

/**
 * ProductFrame · centred title above a framed product card.
 * Transparent (shares the global GradLinkBackground).
 */
export function ProductFrame({
  titleComponent,
  children,
}: {
  titleComponent: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        position: "relative",
        padding: "40px 20px 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ maxWidth: 900, textAlign: "center", marginBottom: 28 }}>{titleComponent}</div>

      <div style={{ width: "100%", maxWidth: 1100 }}>
        <div
          style={{
            borderRadius: "var(--r-xl)",
            border: "1px solid var(--border-strong)",
            background: "linear-gradient(160deg, rgba(30,30,30,0.82), rgba(22,22,22,0.72))",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            boxShadow:
              "0 40px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.12)",
            padding: "clamp(16px, 2.4vw, 28px)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
