"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, Loader2, ArrowRight } from "lucide-react";
import { PLANS, startCheckout, type Plan } from "@/lib/billing";
import { useSession } from "@/lib/session";

export default function PricingSection() {
  const { session, ready } = useSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isManager = session?.role === "event_manager";

  async function onCta(plan: Plan) {
    setError(null);
    if (plan.id === "free") return;

    if (!ready) return;
    if (!session) {
      window.location.assign("/sign-up/college");
      return;
    }
    if (!isManager) {
      setError("Placement Pro is a college plan. Sign in with your college account to upgrade.");
      return;
    }
    setBusy(plan.id);
    const err = await startCheckout({ profileId: session.profileId, email: "", organization: session.org });
    if (err) {
      setError(err);
      setBusy(null);
    }
  }

  return (
    <section style={{ position: "relative", zIndex: 1, padding: "clamp(90px, 12vh, 140px) 24px 100px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 52 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "4px 12px", borderRadius: "var(--r-full)", border: "1px solid var(--border-strong)", background: "rgba(53,211,255,0.08)", color: "var(--cyan)", fontSize: 12, fontWeight: 600, marginBottom: 18 }}>
          Pricing
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(30px, 5vw, 48px)", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text)", marginBottom: 14, lineHeight: 1.1 }}>
          Free for students and employers.
          <br />
          Colleges pay for outcomes.
        </h1>
        <p style={{ fontSize: "clamp(14.5px, 2vw, 16.5px)", color: "var(--text-2)", maxWidth: 560, margin: "0 auto", lineHeight: 1.65 }}>
          Run your whole career fair on the free plan. Upgrade when you need to prove what it achieved.
        </p>
      </div>

      {error && (
        <div style={{ maxWidth: 520, margin: "0 auto 24px", fontSize: 13, color: "var(--danger)", background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.25)", borderRadius: "var(--r-sm)", padding: "11px 14px", textAlign: "center" }}>
          {error}
        </div>
      )}

      <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, alignItems: "start" }}>
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            style={{
              position: "relative",
              background: "var(--glass)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: plan.highlight ? "1px solid var(--border-strong)" : "1px solid var(--border)",
              borderRadius: "var(--r-xl)",
              padding: "clamp(24px, 3.5vw, 34px)",
              boxShadow: plan.highlight
                ? "0 30px 90px rgba(0,0,0,0.5), 0 0 0 1px rgba(53,211,255,0.10), 0 0 70px rgba(0,194,168,0.14)"
                : "0 20px 60px rgba(0,0,0,0.35)",
            }}
          >
            {plan.highlight && (
              <div style={{ position: "absolute", top: -11, left: "clamp(24px, 3.5vw, 34px)", display: "inline-flex", alignItems: "center", padding: "3px 11px", borderRadius: "var(--r-full)", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", color: "#021016", background: "linear-gradient(100deg, var(--cyan), var(--teal))" }}>
                Most popular
              </div>
            )}

            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{plan.name}</h2>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.55 }}>{plan.tagline}</p>

            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 24 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4vw, 36px)", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em" }}>{plan.price}</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{plan.cadence}</span>
            </div>

            <button
              onClick={() => onCta(plan)}
              disabled={busy === plan.id}
              style={{
                width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                height: 46, borderRadius: "var(--r-md)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14.5,
                marginBottom: 24, cursor: busy === plan.id ? "default" : "pointer",
                border: plan.highlight ? "none" : "1px solid var(--border)",
                color: plan.highlight ? "#021016" : "var(--text)",
                background: plan.highlight ? "linear-gradient(100deg, var(--cyan), var(--teal))" : "rgba(255,255,255,0.04)",
                opacity: busy === plan.id ? 0.7 : 1,
              }}
            >
              {busy === plan.id ? <Loader2 size={15} className="gl-spin" /> : null}
              {busy === plan.id ? "Opening checkout…" : plan.cta}
              {busy !== plan.id && plan.highlight ? <ArrowRight size={15} /> : null}
            </button>

            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 11 }}>
              {plan.features.map((f) => (
                <li key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.5 }}>
                  <Check size={15} color="var(--teal)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{f}</span>
                </li>
              ))}
              {plan.missing?.map((f) => (
                <li key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  <X size={15} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ textDecoration: "line-through", opacity: 0.75 }}>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p style={{ textAlign: "center", fontSize: 13.5, color: "var(--text-muted)", marginTop: 36, lineHeight: 1.6 }}>
        Students and employers never pay to use GradLink.{" "}
        <Link href="/sign-up" className="gl-link" style={{ color: "var(--cyan)", fontWeight: 600, textDecoration: "none" }}>
          Create a free account
        </Link>
        .
      </p>

      <style>{`
        .gl-spin { animation: gl-spin 0.9s linear infinite; }
        @keyframes gl-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .gl-spin { animation: none; } }
        .gl-link:hover { text-decoration: underline; }
        @media (max-width: 780px) { .pricing-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}
