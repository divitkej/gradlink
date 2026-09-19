import type { ReactNode, CSSProperties } from "react";

export function Section({
  id,
  children,
  style,
}: {
  id?: string;
  children: ReactNode;
  style?: CSSProperties;
  /** Deprecated: sections are now transparent so the global GradLinkBackground
   *  shows through continuously. Kept in the type for call-site compatibility. */
  bg?: string;
}) {
  return (
    <section
      id={id}
      style={{
        padding: "clamp(64px, 9vw, 112px) 24px",
        position: "relative",
        background: "transparent",
        ...style,
      }}
    >
      <div style={{ maxWidth: 1240, margin: "0 auto", position: "relative" }}>{children}</div>
    </section>
  );
}
