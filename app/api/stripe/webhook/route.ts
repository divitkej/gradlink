import Stripe from "stripe";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook — the ONLY writer of `subscriptions/*`.
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
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
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

  const db = adminDb();
  if (!db) return Response.json({ error: "Server not configured." }, { status: 503 });

  const iso = (unixSeconds: number | null | undefined) =>
    typeof unixSeconds === "number" ? new Date(unixSeconds * 1000).toISOString() : null;

  async function writeSubscription(profileId: string, data: Record<string, unknown>) {
    await db!.doc(`subscriptions/${profileId}`).set(
      { ...data, updated_at: new Date().toISOString() },
      { merge: true }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const profileId = session.client_reference_id ?? session.metadata?.profileId;
        if (!profileId) {
          console.warn("[stripe/webhook] completed session with no profileId", session.id);
          break;
        }
        // Re-read the subscription so the stored period end is authoritative
        // rather than inferred from the checkout session.
        let periodEnd: string | null = null;
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          periodEnd = iso(sub.items.data[0]?.current_period_end);
        }
        await writeSubscription(profileId, {
          plan: "pro",
          status: "active",
          stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
          stripe_subscription_id: subId ?? null,
          current_period_end: periodEnd,
        });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const profileId = sub.metadata?.profileId;
        if (!profileId) break;
        const active = sub.status === "active" || sub.status === "trialing";
        await writeSubscription(profileId, {
          plan: active ? "pro" : "free",
          status: sub.status === "trialing" ? "active" : (sub.status as string),
          stripe_subscription_id: sub.id,
          current_period_end: iso(sub.items.data[0]?.current_period_end),
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const profileId = sub.metadata?.profileId;
        if (!profileId) break;
        await writeSubscription(profileId, {
          plan: "free",
          status: "canceled",
          stripe_subscription_id: null,
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
