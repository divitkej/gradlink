"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import AuthShell from "./AuthShell";
import Logo from "@/components/Logo";
import { verifyEmail } from "@/lib/auth";
import { setSession, type AppRole } from "@/lib/session";

function roleHome(role: AppRole) {
  return role === "event_manager" ? "/dashboard/event-manager" : `/dashboard/${role}`;
}

/** Landing page for the link in the "Confirm your GradLink email" message. */
export default function VerifyEmail() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [state, setState] = useState<"working" | "done" | "error">(token ? "working" : "error");
  const [error, setError] = useState<string | null>(token ? null : "This link is missing its code. Open it again from the email, or sign in to get a new one.");
  // Links are single-use, so the request must run exactly once even when
  // React runs effects twice in development.
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    (async () => {
      const res = await verifyEmail(token);
      if (!res.ok || !res.profile) {
        setError(res.error ?? "This confirmation link didn't work. Sign in to get a new one.");
        setState("error");
        return;
      }
      const p = res.profile;
      setSession({ role: p.role, profileId: p.profileId, name: p.name, org: p.org, activeEventId: null });
      setState("done");
      setTimeout(() => router.push(roleHome(p.role)), 1600);
    })();
  }, [token, router]);

  return (
    <AuthShell backHref="/sign-in" backLabel="Back to sign in">
      <div style={{ width: "100%", maxWidth: 420, background: "var(--glass)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid var(--border-strong)", borderRadius: "var(--r-xl)", boxShadow: "0 30px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)", padding: "clamp(26px, 4vw, 38px)", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}><Logo size={26} /></div>

        {state === "working" && (
          <>
            <Loader2 size={40} color="var(--text-2)" className="gl-spin" style={{ margin: "0 auto 16px" }} />
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--text)" }}>Confirming your email</h1>
          </>
        )}

        {state === "done" && (
          <>
            <CheckCircle2 size={48} color="var(--accent-2)" style={{ margin: "0 auto 16px" }} />
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Email confirmed</h1>
            <p role="status" style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>Your account is ready. Taking you to your dashboard.</p>
          </>
        )}

        {state === "error" && (
          <>
            <AlertCircle size={44} color="var(--danger)" style={{ margin: "0 auto 16px" }} />
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Link not valid</h1>
            <p role="alert" style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 20 }}>{error}</p>
            <Link href="/sign-in" className="gl-link" style={{ fontSize: 14, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>Go to sign in</Link>
          </>
        )}

        <style>{`
          .gl-link:hover { text-decoration: underline; }
          .gl-spin { animation: gl-spin 0.9s linear infinite; }
          @keyframes gl-spin { to { transform: rotate(360deg); } }
          @media (prefers-reduced-motion: reduce) { .gl-spin { animation: none; } }
        `}</style>
      </div>
    </AuthShell>
  );
}
