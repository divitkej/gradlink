import Logo from "../Logo";

const columns = {
  Platform: ["Career Profiles", "Events Hub", "Readiness Hub", "Employer CRM", "Analytics"],
  Students: ["Build Your Profile", "Career Readiness", "Find Events", "Mock Interviews", "Job Board"],
  Employers: ["Post Roles", "Manage Candidates", "Book Fair Booth", "Campus Partnerships", "Talent Pipeline"],
  Colleges: ["Career Centre Dashboard", "Outcome Reporting", "Workshop Tools", "Alumni Network", "Pricing"],
};

export default function Footer() {
  return (
    <footer style={{ background: "transparent", borderTop: "1px solid var(--border)", padding: "64px 24px 36px" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr repeat(4, 1fr)", gap: 40, marginBottom: 48 }}>
          <div>
            <div style={{ marginBottom: 16 }}><Logo size={22} /></div>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-muted)", maxWidth: 260, marginBottom: 22 }}>
              Prepare students. Connect employers. Track outcomes.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              {["LinkedIn", "Twitter", "Instagram"].map((s) => (
                <a key={s} href="#" className="footer-social" style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", textDecoration: "none", padding: "6px 12px", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", transition: "all 0.18s" }}>{s}</a>
              ))}
            </div>
          </div>

          {Object.entries(columns).map(([title, links]) => (
            <div key={title}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 600, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>{title}</div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {links.map((l) => (
                  <li key={l}>
                    <a href="#" className="footer-link" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none", transition: "color 0.18s" }}>{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>© 2025 GradLink Technologies LLC. All rights reserved. UAE.</span>
          <div style={{ display: "flex", gap: 20 }}>
            {["Privacy Policy", "Terms of Service", "Contact"].map((l) => (
              <a key={l} href="#" className="footer-link" style={{ fontSize: 12, color: "var(--text-muted)", textDecoration: "none", transition: "color 0.18s" }}>{l}</a>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .footer-link:hover { color: var(--text) !important; }
        .footer-social:hover { color: var(--text) !important; border-color: var(--border-strong) !important; }
        @media (max-width: 900px) { .footer-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 520px) { .footer-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </footer>
  );
}
