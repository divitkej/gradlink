"use client";

import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { PLANS, choosePlan, startCheckout, type Plan } from "@/lib/billing";
import { useSession } from "@/lib/session";

/**
 * Asked once of every college, the first time they sign in: Starter or
 * Placement Pro. Picking Pro goes to Stripe Checkout; paid features only
 * switch on once Stripe confirms the payment.
 */
export default function PlanPicker({ onChosen }: { onChosen: () => void }) {
  const { session } = useSession();
  const [busy, setBusy] = useState<Plan["id"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(plan: Plan) {
    if (!session || busy) return;
    setError(null);
    setBusy(plan.id);
    if (!(await choosePlan(plan.id))) {
      setBusy(null);
      setError("Couldn't save your choice. Please try again.");
      return;
    }
    if (plan.id === "free") {
      onChosen();
      return;
    }
    // Redirects to Stripe on success.
    const err = await startCheckout({ profileId: session.profileId, email: "", organization: session.org });
    if (err) {
      setBusy(null);
      setError(`${err} You can carry on with Starter and upgrade later from the pricing page.`);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
          Choose a plan for {session?.org || "your college"}
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.6, maxWidth: 620 }}>
          Students and employers never pay. You can run a full event on Starter and upgrade whenever you need the outcome report and exports.
        </p>
      </div>

      {error && (
        <div role="alert" style={{ fontSize: 13, color: "var(--danger)", background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.25)", borderRadius: "var(--r-sm)", padding: "11px 14px" }}>
          {error}
        </div>
      )}

      <div className="plan-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, alignItems: "start" }}>
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            style={{
              background: "var(--glass)",
              border: `1px solid ${plan.highlight ? "var(--border-strong)" : "var(--border)"}`,
              borderRadius: "var(--r-lg)",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{plan.name}</h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{plan.tagline}</p>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--text)" }}>{plan.price}</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{plan.cadence}</span>
            </div>
            <button
              type="button"
              onClick={() => pick(plan)}
              disabled={busy !== null}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, height: 44,
                borderRadius: "var(--r-md)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14,
                cursor: busy ? "default" : "pointer", opacity: busy && busy !== plan.id ? 0.5 : 1,
                border: plan.highlight ? "none" : "1px solid var(--border)",
                color: plan.highlight ? "#0A0A0A" : "var(--text)",
                background: plan.highlight ? "linear-gradient(100deg, var(--accent), var(--accent-2))" : "rgba(255,255,255,0.04)",
              }}
            >
              {busy === plan.id && <Loader2 size={15} className="gl-spin" />}
              {busy === plan.id ? (plan.id === "pro" ? "Opening checkout…" : "Saving…") : plan.cta}
            </button>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
              {plan.features.map((f) => (
                <li key={f} style={{ display: "flex", gap: 9, fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>
                  <Check size={14} color="var(--accent-2)" style={{ flexShrink: 0, marginTop: 3 }} /> <span>{f}</span>
                </li>
              ))}
              {plan.missing?.map((f) => (
                <li key={f} style={{ display: "flex", gap: 9, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  <X size={14} style={{ flexShrink: 0, marginTop: 3 }} /> <span style={{ textDecoration: "line-through", opacity: 0.75 }}>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <style>{`
        .gl-spin { animation: gl-spin 0.9s linear infinite; }
        @keyframes gl-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .gl-spin { animation: none; } }
        @media (max-width: 720px) { .plan-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
