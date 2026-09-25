"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Building2, GraduationCap, Briefcase, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import type { ComponentType } from "react";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/primitives";
import PasswordChecklist, { passwordIsStrong } from "./PasswordChecklist";
import { signUpUser, type Role } from "@/lib/auth";
import { setSession, type AppRole } from "@/lib/session";

function roleHome(role: AppRole) {
  return role === "event_manager" ? "/dashboard/event-manager" : `/dashboard/${role}`;
}

const ROLE_CONFIG: Record<Role, {
  badge: string; icon: ComponentType<{ size?: number }>; accent: string;
  orgLabel: string; orgPlaceholder: string; orgIcon: ComponentType<{ size?: number }>;
  emailPlaceholder: string; emailNote: string; subtitle: string; label: string;
}> = {
  student: {
    badge: "Student account", icon: GraduationCap, accent: "var(--accent)",
    orgLabel: "University name", orgPlaceholder: "Abu Dhabi University", orgIcon: GraduationCap,
    emailPlaceholder: "you@university.ac.ae", emailNote: "Please use your university email address.",
    subtitle: "Get fair-ready and tracked from check-in to offer.", label: "student",
  },
  company: {
    badge: "Company account", icon: Building2, accent: "var(--accent-2)",
    orgLabel: "Company name", orgPlaceholder: "Careem", orgIcon: Building2,
    emailPlaceholder: "you@company.com", emailNote: "Please use your company email address.",
    subtitle: "Scan once, shortlist smarter, follow up faster.", label: "company",
  },
  college: {
    badge: "College / Event host", icon: Briefcase, accent: "var(--amber)",
    orgLabel: "Institution / Organization name", orgPlaceholder: "Abu Dhabi University Career Center", orgIcon: Building2,
    emailPlaceholder: "you@institution.ac.ae", emailNote: "Please use your official institution email address.",
    subtitle: "Run events, track engagement, and prove outcomes.", label: "college / event host",
  },
};

function Field({
  id, label, type, placeholder, icon, value, onChange, autoComplete,
}: {
  id: string; label: string; type: string; placeholder: string;
  icon: React.ReactNode; value: string; onChange: (v: string) => void; autoComplete?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <label htmlFor={id} style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-2)" }}>{label}</label>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <span style={{ position: "absolute", left: 14, color: "var(--text-muted)", display: "inline-flex" }}>{icon}</span>
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className="gl-input"
          style={{
            width: "100%", height: 46, padding: "0 14px 0 42px", fontSize: 14.5, color: "var(--text)",
            background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-md)",
            outline: "none", transition: "border-color 0.18s, box-shadow 0.18s",
          }}
        />
      </div>
    </div>
  );
}

export default function SignUpForm({ role }: { role: Role }) {
  const router = useRouter();
  const c = ROLE_CONFIG[role];
  const appRole: AppRole = role === "college" ? "event_manager" : role;
  const BadgeIcon = c.icon;
  const OrgIcon = c.orgIcon;
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [org, setOrg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canSubmit = fullName.trim() && email.trim() && org.trim() && passwordIsStrong(password) && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) {
      setError("Please complete all fields and meet the password requirements.");
      return;
    }
    setSubmitting(true);
    const res = await signUpUser({ role, fullName, email, password, organization: org });
    if (res.ok) {
      // Continue into the user's OWN connected workspace (real profile, empty to start).
      setSession({
        role: appRole,
        profileId: res.profileId!,
        name: fullName,
        org,
        // Brand new account — they pick or create an event next.
        activeEventId: null,
      });
      setDone(true);
      router.push(roleHome(appRole));
    } else {
      setSubmitting(false);
      setError(res.error || "Something went wrong. Please try again.");
    }
  }

  if (done) {
    return (
      <Card>
        <div style={{ textAlign: "center" }}>
          <CheckCircle2 size={48} color="var(--accent-2)" style={{ margin: "0 auto 16px" }} />
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
            You&apos;re in!
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.6 }}>
            Your {c.label} account has been created. Taking you to your dashboard…
          </p>
          <Button href={roleHome(appRole)} variant="primary" icon={<ArrowRight size={16} />}>Go to dashboard</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}><Logo size={24} /></div>

      <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "4px 12px", borderRadius: "var(--r-full)", border: "1px solid var(--border-strong)", background: "rgba(255,255,255,0.08)", margin: "0 auto 14px", color: c.accent, fontSize: 12, fontWeight: 600 }}>
        <BadgeIcon size={14} />
        {c.badge}
      </div>

      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 25, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)", textAlign: "center", marginBottom: 4 }}>
        Create your account
      </h1>
      <p style={{ fontSize: 13.5, color: "var(--text-muted)", textAlign: "center", marginBottom: 24 }}>
        {c.subtitle}
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Field id="name" label="Full name" type="text" placeholder="Your name" icon={<User size={16} />} value={fullName} onChange={setFullName} autoComplete="name" />
        <Field id="org" label={c.orgLabel} type="text" placeholder={c.orgPlaceholder} icon={<OrgIcon size={16} />} value={org} onChange={setOrg} autoComplete="organization" />
        <div>
          <Field id="email" label="Email" type="email" placeholder={c.emailPlaceholder} icon={<Mail size={16} />} value={email} onChange={setEmail} autoComplete="email" />
          <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 7 }}>
            {c.emailNote}
          </p>
        </div>
        <div>
          <Field id="password" label="Password" type="password" placeholder="Create a strong password" icon={<Lock size={16} />} value={password} onChange={setPassword} autoComplete="new-password" />
          <PasswordChecklist value={password} />
        </div>

        {error && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "var(--danger)", background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.25)", borderRadius: "var(--r-sm)", padding: "10px 12px" }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        <Button variant="primary" icon={<ArrowRight size={16} />} ariaLabel="Create account">
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p style={{ fontSize: 13.5, color: "var(--text-2)", textAlign: "center", marginTop: 18 }}>
        Already have an account?{" "}
        <Link href="/sign-in" className="gl-link" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
      </p>

      <style>{`
        .gl-input::placeholder { color: var(--text-muted); opacity: 0.7; }
        .gl-input:focus { border-color: var(--border-strong) !important; box-shadow: 0 0 0 3px rgba(255,255,255,0.12) !important; }
        .gl-link:hover { text-decoration: underline; }
      `}</style>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%", maxWidth: 440,
        background: "var(--glass)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        border: "1px solid var(--border-strong)", borderRadius: "var(--r-xl)",
        boxShadow: "0 30px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)",
        padding: "clamp(26px, 4vw, 38px)", display: "flex", flexDirection: "column",
      }}
    >
      {children}
    </div>
  );
}
