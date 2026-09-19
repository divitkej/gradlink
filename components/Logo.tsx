export default function Logo({ size = 26 }: { size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      {/* Node/link mark: two nodes connected — students ↔ employers */}
      <svg
        width={size + 6}
        height={size + 6}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="gl-grad" x1="0" y1="0" x2="32" y2="32">
            <stop stopColor="#35D3FF" />
            <stop offset="1" stopColor="#00C2A8" />
          </linearGradient>
        </defs>
        <path
          d="M10 10 L22 22"
          stroke="url(#gl-grad)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="10" cy="10" r="5" fill="#0B1E33" stroke="url(#gl-grad)" strokeWidth="2" />
        <circle cx="22" cy="22" r="5" fill="url(#gl-grad)" />
        <circle cx="10" cy="10" r="1.6" fill="#35D3FF" />
      </svg>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: size,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        <span style={{ color: "var(--text)" }}>Grad</span>
        <span className="text-gradient">Link</span>
      </span>
    </span>
  );
}
