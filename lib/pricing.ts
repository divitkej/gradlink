/* ============================================================
   GradLink pricing rules, shared by the pricing page, the checkout
   route, the Stripe webhook and the event-creation check.

   The AED amounts here are what the pricing page shows. What a college
   is actually charged is the matching Stripe Price (see
   `npm run stripe:setup`), so change both together.
   ============================================================ */

/** Paid things a college can buy at /api/checkout. */
export type CheckoutPlan = "event_pass" | "annual" | "two_year" | "three_year";

/** Billing terms of Placement Pro, as stored in `subscriptions.term`. */
export type ProTerm = Exclude<CheckoutPlan, "event_pass">;

/**
 * Two and three years are always cheaper than paying yearly: at least 15% and
 * 20% off the yearly price in effect. Founding colleges get the discount on
 * top of the founding price, so a longer term is never the worse deal.
 */
export const PRICES_AED = {
  eventPass: 1900,
  annualList: 4800,
  annualFounding: 3600,
  twoYear: 8160,
  twoYearFounding: 6120,
  threeYear: 11500,
  threeYearFounding: 8640,
} as const;

/** The founding price is open until this many colleges have taken it, on any term. */
export const FOUNDING_LIMIT = 10;

/** A trial event's paid features stay open this many days after it ends. */
export const TRIAL_REPORT_DAYS = 14;

/**
 * A trial event whose dates keep moving can't stay open forever: its end is
 * counted as no later than this many days after it was created.
 */
export const TRIAL_MAX_EVENT_DAYS = 180;

/** Event Passes bought within this many days count toward Placement Pro. */
export const PASS_CREDIT_DAYS = 60;

export function isCheckoutPlan(v: unknown): v is CheckoutPlan {
  return v === "event_pass" || v === "annual" || v === "two_year" || v === "three_year";
}

/** "AED 3,600" */
export function formatAed(amount: number): string {
  return `AED ${amount.toLocaleString("en-US")}`;
}
