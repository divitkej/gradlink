"use client";

import { doc, getDoc } from "firebase/firestore";
import { firestore } from "./firebase";

/* ============================================================
   GradLink billing — colleges pay, companies and students are free.

   The free tier runs one real event end to end. The paid tier unlocks
   what a placement office needs after the fair: the outcome report,
   exports, unlimited events and year-over-year comparison.

   Entitlement lives in `subscriptions/{profileId}` (keyed by the event
   manager's profile id, which is also their auth uid). That document is
   written ONLY by the Stripe webhook through the Admin SDK — clients can
   read it but never write it, so a plan cannot be forged from the browser.
   ============================================================ */

export type PlanId = "free" | "pro";

export interface Plan {
  id: PlanId;
  name: string;
  /** Shown on the pricing page. Edit these to your real pricing. */
  price: string;
  cadence: string;
  tagline: string;
  features: string[];
  /** Features listed but deliberately not included, shown struck through. */
  missing?: string[];
  cta: string;
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Starter",
    price: "Free",
    cadence: "forever",
    tagline: "Run a real career fair, end to end.",
    features: [
      "One live event",
      "Student & employer registration",
      "QR check-in and booth scanning",
      "Live scan monitor",
      "Readiness dashboard",
      "Two-way messaging",
    ],
    missing: ["Post-event outcome report", "Data exports", "Unlimited events"],
    cta: "Start free",
  },
  {
    id: "pro",
    name: "Placement Pro",
    price: "AED 3,600",
    cadence: "per campus / year",
    tagline: "Prove the outcome, not just the attendance.",
    features: [
      "Everything in Starter",
      "Unlimited events",
      "Post-event outcome report",
      "CSV exports of students, employers & shortlists",
      "Year-over-year comparison",
      "Employer engagement league table",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    highlight: true,
  },
];

export const PRO_FEATURES_BLURB =
  "The outcome report turns your fair into something you can put in front of a dean: who attended, who engaged, which employers pulled the most interest, and how many students were shortlisted.";

export interface SubscriptionRow {
  plan: PlanId;
  status: "active" | "past_due" | "canceled" | "incomplete";
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  current_period_end?: string | null;
  updated_at?: string | null;
}

export const FREE_SUBSCRIPTION: SubscriptionRow = { plan: "free", status: "active" };

/** Read a college's subscription. Falls back to the free plan on any error. */
export async function getSubscription(profileId: string): Promise<SubscriptionRow> {
  const db = firestore();
  if (!db || !profileId) return FREE_SUBSCRIPTION;
  try {
    const snap = await getDoc(doc(db, "subscriptions", profileId));
    if (!snap.exists()) return FREE_SUBSCRIPTION;
    return { ...FREE_SUBSCRIPTION, ...(snap.data() as SubscriptionRow) };
  } catch {
    return FREE_SUBSCRIPTION;
  }
}

/**
 * Whether a subscription currently grants paid features.
 * An expired period counts as lapsed even if Stripe hasn't sent the
 * cancellation webhook yet.
 */
export function isPro(sub: SubscriptionRow | null | undefined): boolean {
  if (!sub) return false;
  if (sub.plan !== "pro") return false;
  if (sub.status !== "active" && sub.status !== "past_due") return false;
  if (sub.current_period_end) {
    const end = Date.parse(sub.current_period_end);
    if (Number.isFinite(end) && end < Date.now()) return false;
  }
  return true;
}

/** Kick off Stripe Checkout. Returns an error string, or redirects the browser. */
export async function startCheckout(input: {
  profileId: string;
  email: string;
  organization: string;
}): Promise<string | null> {
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) return data.error ?? "Couldn't start checkout. Please try again.";
    window.location.assign(data.url);
    return null;
  } catch {
    return "Couldn't reach the payment service. Check your connection and try again.";
  }
}
