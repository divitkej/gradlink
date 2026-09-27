import Stripe from "stripe";
import { db } from "@/lib/server/sql";
import { serverEnv } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook — the ONLY writer of the `subscriptions` table, and the
 * only place an Event Pass is created.
 *
 * The signature check is what makes this trustworthy: without it anyone could
 * POST here and grant themselves a paid plan. Never skip it, and never derive
 * entitlement from anything the browser sends.
 *
 * Point Stripe at:  https://<your-domain>/api/stripe/webhook
 * Events:           checkout.session.completed,
 *                   checkout.session.async_payment_succeeded,
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

  /** Upsert only the fields given, like the old Firestore `set(..., { merge: true })`. */
  async function writeSubscription(profileId: string, data: Record<string, string | null>) {
    const cols = Object.keys(data);
    await db().query(
      `insert into subscriptions (profile_id, ${cols.join(", ")}, updated_at)
       values ($1, ${cols.map((_, i) => `$${i + 2}`).join(", ")}, now())
       on conflict (profile_id) do update set ${cols.map((c) => `${c} = excluded.${c}`).join(", ")}, updated_at = now()`,
      [profileId, ...cols.map((c) => data[c])],
    );
  }

  /**
   * Term, campus count and founding flag, from the metadata the checkout
   * route set. Older subscriptions carry none of it and keep their values.
   */
  function planDetails(meta: Stripe.Metadata | null | undefined): Record<string, string> {
    const out: Record<string, string> = {};
    if (!meta) return out;
    if (meta.term === "annual" || meta.term === "two_year" || meta.term === "three_year") out.term = meta.term;
    const campuses = Number(meta.campuses);
    if (Number.isInteger(campuses) && campuses >= 1) out.campuses = String(campuses);
    if (meta.founding === "1" || meta.founding === "0") out.founding = meta.founding === "1" ? "true" : "false";
    return out;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        const profileId = session.client_reference_id ?? session.metadata?.profileId;
        if (!profileId) {
          console.warn("[stripe/webhook] completed session with no profileId", session.id);
          break;
        }

        // A one-off Event Pass. Only recorded once the money has arrived;
        // delayed payment methods arrive later as async_payment_succeeded.
        if (session.mode === "payment") {
          if (session.metadata?.kind !== "event_pass" || session.payment_status !== "paid") break;
          await db()`
            insert into event_passes (profile_id, stripe_session_id, amount_minor, currency)
            values (${profileId}, ${session.id}, ${session.amount_total ?? 0}, ${session.currency ?? ""})
            on conflict (stripe_session_id) do nothing
          `;
          break;
        }
        if (event.type !== "checkout.session.completed") break;

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
          ...planDetails(session.metadata),
        });

        // Event Passes whose price came off this checkout can't be credited again.
        const credited = (session.metadata?.creditedPasses ?? "").split(",").filter(Boolean);
        if (credited.length) {
          await db()`
            update event_passes set credited_at = now()
            where profile_id = ${profileId} and id = any(${credited}::text[]) and credited_at is null
          `;
        }
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
          ...planDetails(sub.metadata),
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
