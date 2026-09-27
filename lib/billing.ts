"use client";

import { rpc } from "./api-client";
import type { CheckoutPlan } from "./pricing";

/* ============================================================
   GradLink billing: colleges pay, companies and students are free.

   Plans, cheapest first (prices and rules live in lib/pricing.ts):
     * Trial Event: a college's first event has every paid feature,
       and the outcome report stays open 14 days after it ends.
     * Event Pass: one more event with the paid features, paid once.
       Passes bought in the last 60 days come off Placement Pro.
     * Placement Pro: unlimited events, the full outcome report and
       CSV exports. Yearly, two-year or three-year, with a founding
       price for the first colleges on every term.

   Entitlement lives in the `subscriptions` and `event_passes` tables,
   written ONLY by the Stripe webhook (app/api/stripe/webhook). The data
   API exposes them read-only to their owner, so a plan cannot be forged
   from the browser.
   ============================================================ */

/** Shown on the paid plan cards and in the report upsell. */
export const PRO_FEATURES = [
  "Unlimited events",
  "Full post-event outcome report",
  "CSV exports of students, employers and shortlists",
  "Priority support",
];

export const PRO_FEATURES_BLURB =
  "The outcome report turns your fair into something you can put in front of a dean: who attended, who engaged, which employers pulled the most interest, and how many students were shortlisted.";

export interface BillingState {
  subscribed: boolean;
  trialUsed: boolean;
  unusedPasses: number;
  /** Event Pass money, in fils, that would come off a Placement Pro checkout now. */
  passCreditMinor: number;
}

/** Trial, pass and credit state for the signed-in college. Null on any error. */
export async function getBillingState(): Promise<BillingState | null> {
  try {
    return await rpc<BillingState>("getBillingState");
  } catch {
    return null;
  }
}

export interface EventAccess {
  full: boolean;
  reason: "subscription" | "pass" | "trial" | "none";
  trialEndsAt: string | null;
}

/** Whether one of the signed-in college's events has the paid features. Locked on any error. */
export async function getEventAccess(eventId: string): Promise<EventAccess> {
  const locked: EventAccess = { full: false, reason: "none", trialEndsAt: null };
  if (!eventId) return locked;
  try {
    return await rpc<EventAccess>("getEventAccess", eventId);
  } catch {
    return locked;
  }
}

/** Whether the founding price is still open. Defaults to closed if unknown. */
export async function getFoundingOpen(): Promise<boolean> {
  try {
    const res = await fetch("/api/pricing", { cache: "no-store" });
    const data = (await res.json()) as { foundingOpen?: boolean };
    return data.foundingOpen === true;
  } catch {
    return false;
  }
}

/** Kick off Stripe Checkout. Returns an error string, or redirects the browser. */
export async function startCheckout(plan: CheckoutPlan): Promise<string | null> {
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) return data.error ?? "Couldn't start checkout. Please try again.";
    window.location.assign(data.url);
    return null;
  } catch {
    return "Couldn't reach the payment service. Check your connection and try again.";
  }
}
