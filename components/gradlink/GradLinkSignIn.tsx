"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import AuthShell from "./AuthShell";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/primitives";
import { signIn, sendReset, getProfileForUser } from "@/lib/auth";
import { detectIdentityByEmail, ensureProfile } from "@/lib/db";
import { setSession } from "@/lib/session";

function roleHome(role: "student" | "company" | "event_manager") {
  return role === "event_manager" ? "/dashboard/event-manager" : `/dashboard/${role}`;
}

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
          id={id} type={type} placeholder={placeholder} value={value} autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)} className="gl-input"
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

export default function GradLinkSignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetBusy, setResetBusy] = useState(false);

  async function handleForgot() {
    setError(null);
    setResetMsg(null);
    if (!email.trim()) {
      setError('Enter your email above first, then tap "Forgot password?".');
      return;
    }
    setResetBusy(true);
    const res = await sendReset(email);
    setResetBusy(false);
    if (!res.ok) setError(res.error ?? "Couldn't send the reset email.");
    else setResetMsg(`We've sent a password reset link to ${email.trim()}. Check your inbox.`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    const res = await signIn(email, password);
    if (!res.ok || !res.uid) {
      setBusy(false);
      setError(res.error ?? "Incorrect email or password.");
      return;
    }

    // The auth uid is the profile id, so this is normally a single direct read.
    const profile = await getProfileForUser(res.uid, email);
    if (profile) {
      setSession({
        role: profile.role as "student" | "company" | "event_manager",
        profileId: profile.profileId,
        name: profile.name || email.split("@")[0],
        org: profile.org,
        activeEventId: null,
      });
      setBusy(false);
      router.push(roleHome(profile.role as "student" | "company" | "event_manager"));
      return;
    }

    // Fallback for older accounts whose profile was never linked: find them by
    // their role document, backfilling a profile if one is genuinely missing.
    const identity = await detectIdentityByEmail(email);
    if (!identity) {
      setBusy(false);
      setError("We couldn't find a GradLink profile for this account. Please sign up first.");
      return;
    }
    const profileId =
      identity.profileId ??
      (await ensureProfile({ email, role: identity.role, name: identity.name, org: identity.org }));
    if (!profileId) {
      setBusy(false);
      setError("Couldn't load your profile. Please try again.");
      return;
    }
    setSession({
      role: identity.role,
      profileId,
      name: identity.name || email.split("@")[0],
      org: identity.org,
      activeEventId: null,
    });
    setBusy(false);
    router.push(roleHome(identity.role));
  }

  return (
    <AuthShell>
      <div
        style={{
          width: "100%", maxWidth: 420,
          background: "var(--glass)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          border: "1px solid var(--border-strong)", borderRadius: "var(--r-xl)",
          boxShadow: "0 30px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(53,211,255,0.08), 0 0 70px rgba(0,194,168,0.12)",
          padding: "clamp(26px, 4vw, 38px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}><Logo size={26} /></div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)", textAlign: "center", marginBottom: 6 }}>
          Welcome back
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", textAlign: "center", marginBottom: 26 }}>
          Sign in to your career command center.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field id="email" label="Email" type="email" placeholder="you@university.ac.ae" icon={<Mail size={16} />} value={email} onChange={setEmail} autoComplete="email" />
          <Field id="password" label="Password" type="password" placeholder="••••••••" icon={<Lock size={16} />} value={password} onChange={setPassword} autoComplete="current-password" />

          <div style={{ textAlign: "right", marginTop: -4 }}>
            <button type="button" onClick={handleForgot} className="gl-link" style={{ fontSize: 12.5, color: "var(--text-muted)", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
              {resetBusy ? "Sending…" : "Forgot password?"}
            </button>
          </div>

          {resetMsg && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "var(--teal)", background: "rgba(0,194,168,0.08)", border: "1px solid rgba(0,194,168,0.25)", borderRadius: "var(--r-sm)", padding: "10px 12px" }}>
              <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{resetMsg}</span>
            </div>
          )}

          {error && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "var(--danger)", background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.25)", borderRadius: "var(--r-sm)", padding: "10px 12px" }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <Button variant="primary" icon={<ArrowRight size={16} />} ariaLabel="Sign in">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p style={{ fontSize: 12, lineHeight: 1.6, color: "var(--text-muted)", textAlign: "center", marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
          Companies: use your <span style={{ color: "var(--text-2)" }}>company email</span>. Students: use your{" "}
          <span style={{ color: "var(--text-2)" }}>university email</span>.
        </p>

        <p style={{ fontSize: 13.5, color: "var(--text-2)", textAlign: "center", marginTop: 16 }}>
          New to GradLink?{" "}
          <Link href="/sign-up" className="gl-link" style={{ color: "var(--cyan)", fontWeight: 600, textDecoration: "none" }}>Create an account</Link>
        </p>

        <style>{`
          .gl-input::placeholder { color: var(--text-muted); opacity: 0.7; }
          .gl-input:focus { border-color: var(--border-strong) !important; box-shadow: 0 0 0 3px rgba(53,211,255,0.12) !important; }
          .gl-link:hover { color: var(--cyan) !important; text-decoration: underline; }
        `}</style>
      </div>
    </AuthShell>
  );
}
