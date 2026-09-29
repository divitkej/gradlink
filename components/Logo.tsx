export default function Logo({ size = 26 }: { size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      {/* Monochrome mark: a graduation cap whose tassel ends in a dot (a connection point), on a light tile. */}
      <svg
        width={size + 6}
        height={size + 6}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
        style={{ flexShrink: 0 }}
      >
        <rect width="32" height="32" rx="7" fill="#F5F5F5" />
        <path d="M16 7.5 L27 12.5 L16 17.5 L5 12.5 Z" fill="#0A0A0A" />
        <path d="M10 15.2 V20 C10 22 13 23.5 16 23.5 C19 23.5 22 22 22 20 V15.2" fill="none" stroke="#0A0A0A" strokeWidth="2.4" />
        <path d="M25 13.5 V21" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" />
        <circle cx="25" cy="23" r="2.2" fill="#0A0A0A" />
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
