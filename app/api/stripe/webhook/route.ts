import Stripe from "stripe";
import { planFor, saveSubscription } from "@/lib/server/subscriptions";
import { serverEnv } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook — the ONLY writer of the `subscriptions` table.
 *
 * The signature check is what makes this trustworthy: without it anyone could
 * POST here and grant themselves a paid plan. Never skip it, and never derive
 * entitlement from anything the browser sends.
 *
 * Point Stripe at:  https://<your-domain>/api/stripe/webhook
 * Events:           checkout.session.completed,
 *                   customer.subscription.updated,
 *                   customer.subscription.deleted
 */
export async function POST(request: Request) {
  const env = serverEnv();
  const secret = env.STRIPE_SECRET_KEY;
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) {
    return Response.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing signature." }, { status: 400 });

  // Must be the raw body — parsing it first would break signature verification.
  const raw = await request.text();
  const stripe = new Stripe(secret);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, signature, webhookSecret);
  } catch (err) {
    console.warn("[stripe/webhook] bad signature:", err);
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  const iso = (unixSeconds: number | null | undefined) =>
    typeof unixSeconds === "number" ? new Date(unixSeconds * 1000).toISOString() : null;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const profileId = session.client_reference_id ?? session.metadata?.profileId;
        if (!profileId) {
          console.warn("[stripe/webhook] completed session with no profileId", session.id);
          break;
        }
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (!subId) {
          console.warn("[stripe/webhook] completed session with no subscription", session.id);
          break;
        }
        // Re-read the subscription so the plan and period end come from its
        // current state. A delivery retried after the subscription was
        // cancelled must not switch Pro back on.
        const sub = await stripe.subscriptions.retrieve(subId);
        await saveSubscription(profileId, subId, {
          ...planFor(sub.status),
          stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
          current_period_end: iso(sub.items.data[0]?.current_period_end),
        });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const profileId = sub.metadata?.profileId;
        if (!profileId) break;
        await saveSubscription(profileId, sub.id, {
          ...planFor(sub.status),
          current_period_end: iso(sub.items.data[0]?.current_period_end),
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const profileId = sub.metadata?.profileId;
        if (!profileId) break;
        // Ignored if the college has since moved to another subscription.
        await saveSubscription(profileId, sub.id, {
          plan: "free",
          status: "canceled",
          current_period_end: null,
        });
        break;
      }

      default:
        // Unhandled event types are fine — acknowledge so Stripe stops retrying.
        break;
    }
  } catch (err) {
    // Return 500 so Stripe retries rather than silently dropping a paid upgrade.
    console.error("[stripe/webhook] handler failed:", err);
    return Response.json({ error: "Handler failed." }, { status: 500 });
  }

  return Response.json({ received: true });
}
