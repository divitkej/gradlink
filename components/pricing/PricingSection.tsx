"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PlanCard from "./PlanCard";
import { PRO_FEATURES, getBillingState, getFoundingOpen, startCheckout, type BillingState } from "@/lib/billing";
import {
  FOUNDING_LIMIT, PASS_CREDIT_DAYS, PRICES_AED, TRIAL_REPORT_DAYS, formatAed,
  type CheckoutPlan,
} from "@/lib/pricing";
import { useSession } from "@/lib/session";

type Action = "trial" | CheckoutPlan;

export default function PricingSection() {
  const { session, ready } = useSession();
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [founding, setFounding] = useState(false);
  const [billing, setBilling] = useState<BillingState | null>(null);

  const isManager = session?.role === "event_manager";

  useEffect(() => {
    let cancelled = false;
    getFoundingOpen().then((open) => { if (!cancelled) setFounding(open); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready || !isManager) return;
    let cancelled = false;
    getBillingState().then((state) => { if (!cancelled) setBilling(state); });
    return () => { cancelled = true; };
  }, [ready, isManager]);

  const annual = founding ? PRICES_AED.annualFounding : PRICES_AED.annualList;
  const twoYear = founding ? PRICES_AED.twoYearFounding : PRICES_AED.twoYear;
  const threeYear = founding ? PRICES_AED.threeYearFounding : PRICES_AED.threeYear;
  const subscribed = billing?.subscribed ?? false;
  const creditAed = billing ? Math.floor(billing.passCreditMinor / 100) : 0;

  async function onCta(action: Action) {
    setError(null);
    if (!ready) return;
    if (!session) {
      window.location.assign("/sign-up/college");
      return;
    }
    if (!isManager) {
      setError("GradLink plans are for colleges. Sign in with your college account to continue.");
      return;
    }
    if (action === "trial") {
      window.location.assign("/dashboard/events");
      return;
    }
    setBusy(action);
    const err = await startCheckout(action);
    if (err) {
      setError(err);
      setBusy(null);
    }
  }

  const creditNote = creditAed > 0
    ? `${formatAed(creditAed)} from your Event Passes comes off your first payment.`
    : undefined;

  return (
    <section style={{ position: "relative", zIndex: 1, padding: "clamp(90px, 12vh, 140px) 16px 100px", maxWidth: 1140, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 52 }}>
        <div style={{ display: "inline-flex", alignItems: "center", padding: "4px 12px", borderRadius: "var(--r-sm)", border: "1px solid var(--border-strong)", background: "rgba(255,255,255,0.08)", color: "var(--accent)", fontSize: 12, fontWeight: 600, marginBottom: 18 }}>
          Pricing
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(30px, 5vw, 48px)", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text)", marginBottom: 14, lineHeight: 1.1 }}>
          Free for students and employers.
          <br />
          Colleges pay for outcomes.
        </h1>
        <p style={{ fontSize: "clamp(14.5px, 2vw, 16.5px)", color: "var(--text-2)", maxWidth: 580, margin: "0 auto", lineHeight: 1.65 }}>
          Your first event is free with every feature switched on. After that, pay for one event at a time or subscribe for the year.
        </p>
      </div>

      {error && (
        <div role="alert" style={{ maxWidth: 520, margin: "0 auto 24px", fontSize: 13, color: "var(--danger)", background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.25)", borderRadius: "var(--r-sm)", padding: "11px 14px", textAlign: "center" }}>
          {error}
        </div>
      )}

      <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, alignItems: "stretch" }}>
        <PlanCard
          name="Trial Event"
          tagline="Run your first career fair with every feature switched on."
          price="Free"
          cadence="first event, no card"
          features={[
            "One event with every Placement Pro feature",
            "Student and employer registration",
            "QR check-in and booth scanning",
            "Live scan monitor and two-way messaging",
            `Full outcome report open for ${TRIAL_REPORT_DAYS} days after the event`,
          ]}
          cta={billing?.trialUsed ? "Go to your events" : "Start your free event"}
          onCta={() => onCta("trial")}
        />
        <PlanCard
          name="Event Pass"
          tagline="For colleges that run one fair a year."
          price={formatAed(PRICES_AED.eventPass)}
          cadence="per event"
          note={`The full ${formatAed(PRICES_AED.eventPass)} comes off Placement Pro if you subscribe within ${PASS_CREDIT_DAYS} days.`}
          features={[
            "One more event with every paid feature",
            "Full outcome report and CSV export for that event, kept for good",
            billing && billing.unusedPasses > 0
              ? `You have ${billing.unusedPasses} unused ${billing.unusedPasses === 1 ? "pass" : "passes"}`
              : "Spent when you create the event",
          ]}
          cta={subscribed ? "Included in your plan" : "Buy an Event Pass"}
          disabled={subscribed}
          busy={busy === "event_pass"}
          onCta={() => onCta("event_pass")}
        />
        <PlanCard
          name="Placement Pro"
          tagline="Every fair you run this year, with the outcome report for each."
          price={formatAed(annual)}
          listPrice={founding ? formatAed(PRICES_AED.annualList) : undefined}
          cadence="per campus / year"
          note={creditNote ?? (founding
            ? `Founding price for the first ${FOUNDING_LIMIT} colleges, on every plan below too. It stays at ${formatAed(PRICES_AED.annualFounding)} for as long as you renew.`
            : undefined)}
          features={PRO_FEATURES}
          cta={subscribed ? "You have Placement Pro" : "Subscribe yearly"}
          disabled={subscribed}
          busy={busy === "annual"}
          highlight
          badge="Recommended"
          onCta={() => onCta("annual")}
        />
      </div>

      <div style={{ textAlign: "center", margin: "72px 0 32px" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(22px, 3.4vw, 30px)", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text)", marginBottom: 10 }}>
          Commit for longer, pay less
        </h2>
        <p style={{ fontSize: 14.5, color: "var(--text-2)", maxWidth: 540, margin: "0 auto", lineHeight: 1.6 }}>
          Pay upfront and lock your price. Always cheaper than paying year by year{founding ? ", founding price included" : ""}.
        </p>
      </div>

      <div className="pricing-grid pricing-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, alignItems: "stretch", maxWidth: 760, margin: "0 auto" }}>
        <PlanCard
          name="Two years"
          tagline="Placement Pro for two years, paid once."
          price={formatAed(twoYear)}
          listPrice={founding ? formatAed(PRICES_AED.twoYear) : undefined}
          cadence="every 2 years"
          note={`${formatAed(annual * 2 - twoYear)} less than paying yearly.`}
          features={["Everything in Placement Pro", "Price locked for two years", "Guided setup for your first event"]}
          cta={subscribed ? "You have Placement Pro" : "Pay for two years"}
          disabled={subscribed}
          busy={busy === "two_year"}
          onCta={() => onCta("two_year")}
        />
        <PlanCard
          name="Three years"
          tagline="Placement Pro for three years, paid once."
          price={formatAed(threeYear)}
          listPrice={founding ? formatAed(PRICES_AED.threeYear) : undefined}
          cadence="every 3 years"
          note={`${formatAed(annual * 3 - threeYear)} less than paying yearly.`}
          features={[
            "Everything in Placement Pro",
            "Price locked for three years",
            "Guided setup for your first event",
            "Early access to new features",
          ]}
          cta={subscribed ? "You have Placement Pro" : "Pay for three years"}
          disabled={subscribed}
          busy={busy === "three_year"}
          onCta={() => onCta("three_year")}
        />
      </div>

      <p style={{ textAlign: "center", fontSize: 13.5, color: "var(--text-muted)", marginTop: 40, lineHeight: 1.6 }}>
        Prices are in UAE dirhams. Students and employers never pay to use GradLink.{" "}
        <Link href="/sign-up" className="gl-link" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
          Create a free account
        </Link>
        .
      </p>

      <style>{`
        .gl-spin { animation: gl-spin 0.9s linear infinite; }
        @keyframes gl-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) { .gl-spin { animation: none; } }
        .gl-link:hover { text-decoration: underline; }
        @media (max-width: 960px) { .pricing-grid:not(.pricing-grid-2) { grid-template-columns: 1fr !important; max-width: 520px; margin: 0 auto; } }
        @media (max-width: 700px) { .pricing-grid-2 { grid-template-columns: 1fr !important; max-width: 520px !important; } }
      `}</style>
    </section>
  );
}
