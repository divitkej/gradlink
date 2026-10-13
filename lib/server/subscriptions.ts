import { db, type Row } from "./sql";
import { isPro, type SubscriptionRow } from "../entitlement";

/* ============================================================
   The `subscriptions` table, written only by the Stripe webhook
   (app/api/stripe/webhook) and read by checkout before it starts.
   ============================================================ */

/**
 * What a Stripe subscription status means for the college's plan.
 * `past_due` keeps Pro while Stripe retries the card, the grace period
 * `isPro` allows; `trialing` counts as active. Anything else is free.
 */
export function planFor(stripeStatus: string): { plan: "pro" | "free"; status: string } {
  if (stripeStatus === "active" || stripeStatus === "trialing") return { plan: "pro", status: "active" };
  if (stripeStatus === "past_due") return { plan: "pro", status: "past_due" };
  return { plan: "free", status: stripeStatus };
}

/** Whether this college already has a Placement Pro subscription in force. */
export async function hasActivePro(profileId: string): Promise<boolean> {
  const rows = await db()`select plan, status, current_period_end from subscriptions where profile_id = ${profileId}`;
  return isPro(rows[0] as SubscriptionRow | undefined);
}

/**
 * Writes what Stripe says about one subscription onto the college's row.
 *
 * Stripe can deliver events late, twice or out of order, and a college can end
 * up with an old subscription and a new one. So an event is applied only when
 * it is about the subscription already on file, the row has none yet, or it
 * grants Pro (a new subscription taking over). An event that would downgrade
 * the college because of some other, older subscription is ignored.
 * Returns whether the row was written.
 */
export async function saveSubscription(
  profileId: string,
  subscriptionId: string,
  data: { plan: "pro" | "free"; status: string } & Record<string, string | null>,
): Promise<boolean> {
  const fields: Row = { ...data, stripe_subscription_id: subscriptionId };
  const cols = Object.keys(fields);
  const rows = await db().query(
    `insert into subscriptions (profile_id, ${cols.join(", ")}, updated_at)
     values ($1, ${cols.map((_, i) => `$${i + 2}`).join(", ")}, now())
     on conflict (profile_id) do update set ${cols.map((c) => `${c} = excluded.${c}`).join(", ")}, updated_at = now()
     where subscriptions.stripe_subscription_id is null
        or subscriptions.stripe_subscription_id = excluded.stripe_subscription_id
        or excluded.plan = 'pro'
     returning profile_id`,
    [profileId, ...cols.map((c) => fields[c])],
  );
  return rows.length > 0;
}
