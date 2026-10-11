"use client";

import { useSearchParams } from "next/navigation";

/**
 * Stripe Checkout returns here with ?upgraded=1 (app/api/checkout). The plan
 * itself is written by the Stripe webhook, which can land a moment after the
 * redirect, so this confirms the checkout without claiming Pro is already on.
 */
export default function UpgradedNotice() {
  if (useSearchParams().get("upgraded") !== "1") return null;
  return (
    <div role="status" style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--text)", padding: "12px 14px", marginBottom: 20, border: "1px solid var(--border-strong)", borderRadius: "var(--r-md)", background: "rgba(255,255,255,0.03)" }}>
      Thanks, your Placement Pro checkout is complete. Pro features switch on as soon as Stripe confirms the payment, which can take a minute. Reload this page if the outcome report is still locked.
    </div>
  );
}
