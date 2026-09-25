import type { ReactNode } from "react";

/* ---------- MatteCard (flat surface, border firms up on hover) ---------- */
export default function MatteCard({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`matte-card${className ? ` ${className}` : ""}`}
      style={{
        position: "relative",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
        transition: "border-color 0.2s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
