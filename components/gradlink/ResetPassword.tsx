"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import AuthShell from "./AuthShell";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/primitives";
import PasswordChecklist, { passwordIsStrong } from "./PasswordChecklist";
import { verifyResetCode, confirmReset, setNewPassword } from "@/lib/auth";
import { firebaseAuth } from "@/lib/firebase";

function Field({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <label htmlFor={id} style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-2)" }}>{label}</label>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <span style={{ position: "absolute", left: 14, color: "var(--text-muted)", display: "inline-flex" }}><Lock size={16} /></span>
        <input id={id} type="password" value={value} autoComplete="new-password" placeholder="••••••••" onChange={(e) => onChange(e.target.value)} className="gl-input"
          style={{ width: "100%", height: 46, padding: "0 14px 0 42px", fontSize: 14.5, color: "var(--text)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", outline: "none", transition: "border-color 0.18s, box-shadow 0.18s" }} />
      </div>
    </div>
  );
}

export default function ResetPassword() {
  const router = useRouter();
  const params = useSearchParams();
  const oobCode = params.get("oobCode");

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Firebase sends a one-time `oobCode` in the reset link. Validate it up
      // front so an expired link says so before the user types a new password.
      if (oobCode) {
        const res = await verifyResetCode(oobCode);
        if (cancelled) return;
        if (res.ok) setHasSession(true);
        else setError(res.error ?? null);
        return;
      }
      // No code in the URL — allow an already-signed-in user to change their password.
      if (firebaseAuth()?.currentUser) setHasSession(true);
    })();
    return () => { cancelled = true; };
  }, [oobCode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!passwordIsStrong(pw)) { setError("Please meet all the password requirements."); return; }
    if (pw !== pw2) { setError("The two passwords don't match."); return; }
    setBusy(true);
    const res = oobCode ? await confirmReset(oobCode, pw) : await setNewPassword(pw);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Couldn't update your password. Please try again.");
    } else {
      setDone(true);
      setTimeout(() => router.push("/sign-in"), 2600);
    }
  }

  return (
    <AuthShell backHref="/sign-in" backLabel="Back to sign in">
      <div style={{ width: "100%", maxWidth: 420, background: "var(--glass)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid var(--border-strong)", borderRadius: "var(--r-xl)", boxShadow: "0 30px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(53,211,255,0.08), 0 0 70px rgba(0,194,168,0.12)", padding: "clamp(26px, 4vw, 38px)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}><Logo size={26} /></div>

        {done ? (
          <div style={{ textAlign: "center" }}>
            <CheckCircle2 size={48} color="var(--teal)" style={{ margin: "0 auto 16px" }} />
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Password updated</h1>
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 22, lineHeight: 1.6 }}>You can now sign in with your new password. Taking you there…</p>
            <Button href="/sign-in" variant="primary" icon={<ArrowRight size={16} />}>Go to sign in</Button>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 25, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)", textAlign: "center", marginBottom: 6 }}>Set a new password</h1>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", textAlign: "center", marginBottom: 24 }}>Choose a strong password for your GradLink account.</p>

            {!hasSession && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "var(--amber)", background: "rgba(247,201,72,0.08)", border: "1px solid rgba(247,201,72,0.25)", borderRadius: "var(--r-sm)", padding: "10px 12px", marginBottom: 16 }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Open this page from the reset link we emailed you. If you got here another way, request a new link from sign-in.</span>
              </div>
            )}

            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <Field id="pw" label="New password" value={pw} onChange={setPw} />
                <PasswordChecklist value={pw} />
              </div>
              <Field id="pw2" label="Confirm new password" value={pw2} onChange={setPw2} />

              {error && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "var(--danger)", background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.25)", borderRadius: "var(--r-sm)", padding: "10px 12px" }}>
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{error}</span>
                </div>
              )}

              <Button variant="primary" icon={<ArrowRight size={16} />} ariaLabel="Update password">{busy ? "Updating…" : "Update password"}</Button>
            </form>

            <p style={{ fontSize: 13.5, color: "var(--text-2)", textAlign: "center", marginTop: 18 }}>
              Remembered it? <Link href="/sign-in" className="gl-link" style={{ color: "var(--cyan)", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
            </p>
          </>
        )}

        <style>{`
          .gl-input::placeholder { color: var(--text-muted); opacity: 0.7; }
          .gl-input:focus { border-color: var(--border-strong) !important; box-shadow: 0 0 0 3px rgba(53,211,255,0.12) !important; }
          .gl-link:hover { text-decoration: underline; }
        `}</style>
      </div>
    </AuthShell>
  );
}
