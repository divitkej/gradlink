/* ============================================================
   Who has Placement Pro. Plain logic with no browser or server
   dependencies, so the dashboard (lib/billing.ts) and the checkout
   route (lib/server/subscriptions.ts) apply the same rule.
   ============================================================ */

export type PlanId = "free" | "pro";

export interface SubscriptionRow {
  plan: PlanId;
  status: "active" | "past_due" | "canceled" | "incomplete";
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  current_period_end?: string | null;
  updated_at?: string | null;
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
