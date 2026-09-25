export default function Logo({ size = 26 }: { size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      {/* Monochrome mark: a geometric G on a light tile. */}
      <svg
        width={size + 6}
        height={size + 6}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
        style={{ flexShrink: 0 }}
      >
        <rect width="32" height="32" rx="7" fill="#F5F5F5" />
        <path
          d="M21.75 11.18 A7.5 7.5 0 1 0 23.5 16 H16"
          stroke="#0A0A0A"
          strokeWidth="3"
        />
      </svg>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: size,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          color: "var(--text)",
        }}
      >
        GradLink
      </span>
    </span>
  );
}
