"use client";

import Link from "next/link";
import { GraduationCap, Building2, Briefcase, ArrowRight } from "lucide-react";
import Logo from "@/components/Logo";

const roles = [
  {
    href: "/sign-up/student",
    icon: GraduationCap,
    title: "I'm a student",
    line: "Show up ready. Leave with offers.",
    accent: "var(--accent)",
    soft: "rgba(255,255,255,0.10)",
    bd: "rgba(255,255,255,0.30)",
  },
  {
    href: "/sign-up/company",
    icon: Building2,
    title: "I'm a company",
    line: "Scan once. Shortlist smarter.",
    accent: "var(--accent-2)",
    soft: "rgba(255,255,255,0.10)",
    bd: "rgba(255,255,255,0.30)",
  },
  {
    href: "/sign-up/college",
    icon: Briefcase,
    title: "College / Event host",
    line: "Run the event. Prove the impact.",
    accent: "var(--amber)",
    soft: "rgba(247,201,72,0.10)",
    bd: "rgba(247,201,72,0.30)",
  },
];

export default function RoleSelect() {
  return (
    <div style={{ width: "100%", maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
        <Logo size={26} />
      </div>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(26px, 4vw, 38px)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "var(--text)",
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        Join GradLink
      </h1>
      <p style={{ fontSize: 15, color: "var(--text-muted)", textAlign: "center", marginBottom: 36 }}>
        Tell us who you are and we&apos;ll tailor the rest.
      </p>

      <div className="role-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {roles.map((r) => {
          const Icon = r.icon;
          return (
            <Link
              key={r.href}
              href={r.href}
              className="role-card"
              style={{
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                padding: 28,
                borderRadius: "var(--r-xl)",
                background: "var(--glass)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
                border: "1px solid var(--border)",
                transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "var(--r-md)",
                  background: r.soft,
                  border: `1px solid ${r.bd}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={26} color={r.accent} strokeWidth={1.6} />
              </div>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
                  {r.title}
                </h2>
                <p style={{ fontSize: 14.5, color: "var(--text-2)", lineHeight: 1.55 }}>{r.line}</p>
              </div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: "auto", fontSize: 14, fontWeight: 600, color: r.accent }}>
                Continue <ArrowRight size={16} />
              </span>
            </Link>
          );
        })}
      </div>

      <p style={{ fontSize: 13.5, color: "var(--text-2)", textAlign: "center", marginTop: 28 }}>
        Already have an account?{" "}
        <Link href="/sign-in" className="gl-link" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
          Sign in
        </Link>
      </p>

      <style>{`
        .role-card:hover { transform: translateY(-4px); border-color: var(--border-strong) !important; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
        .gl-link:hover { text-decoration: underline; }
        @media (max-width: 860px) { .role-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
