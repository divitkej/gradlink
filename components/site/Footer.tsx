import Logo from "../Logo";

// Every link goes to a page or home-page section that exists today.
// Planned links that have no destination yet are tracked in
// docs/checklists/features-to-build.md instead of shipping as dead links.
const columns: Record<string, { label: string; href: string }[]> = {
  Product: [
    { label: "How it works", href: "/#journey" },
    { label: "Platform", href: "/#product" },
    { label: "Live events", href: "/#live" },
    { label: "Pricing", href: "/pricing" },
  ],
  Students: [
    { label: "Career readiness", href: "/#readiness" },
    { label: "Create a student account", href: "/sign-up/student" },
  ],
  Employers: [
    { label: "Employer tools", href: "/#employers" },
    { label: "Create a company account", href: "/sign-up/company" },
  ],
  Colleges: [
    { label: "Outcome analytics", href: "/#analytics" },
    { label: "Create a college account", href: "/sign-up/college" },
    { label: "Sign in", href: "/sign-in" },
  ],
};

export default function Footer() {
  return (
    <footer style={{ background: "transparent", borderTop: "1px solid var(--border)", padding: "64px 24px 36px" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr repeat(4, 1fr)", gap: 40, marginBottom: 48 }}>
          <div>
            <div style={{ marginBottom: 16 }}><Logo size={22} /></div>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-muted)", maxWidth: 260 }}>
              Prepare students. Connect employers. Track outcomes.
            </p>
          </div>

          {Object.entries(columns).map(([title, links]) => (
            <div key={title}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 600, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>{title}</div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="footer-link" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", transition: "color 0.18s" }}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>© {new Date().getFullYear()} GradLink Technologies LLC. All rights reserved. UAE.</span>
        </div>
      </div>

      <style>{`
        .footer-link:hover { color: var(--text) !important; }
        @media (max-width: 900px) { .footer-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 520px) { .footer-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </footer>
  );
}
