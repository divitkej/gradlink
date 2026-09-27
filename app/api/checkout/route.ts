import Stripe from "stripe";
import { db } from "@/lib/server/sql";
import { serverEnv } from "@/lib/server/env";
import { currentUser } from "@/lib/server/session";
import { ACTIVE_SUB_SQL, creditablePasses, foundingOpen } from "@/lib/server/billing";
import { MAX_CAMPUSES, isCheckoutPlan, type CheckoutPlan } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creates a Stripe Checkout Session for a college buying an Event Pass or
 * Placement Pro (annual, two-year or three-year, annual with extra campuses).
 *
 * The buyer is always the signed-in college, never an id from the request.
 * Their profile id rides along in `client_reference_id` and metadata, so the
 * webhook knows which account to credit when payment succeeds.
 *
 * Pricing rules applied here:
 *   * annual uses the founding price while founding campuses remain;
 *   * Event Passes bought in the last 60 days come off the first Placement
 *     Pro payment as a one-time Stripe coupon.
 */
export async function POST(request: Request) {
  const env = serverEnv();
  const secret = env.STRIPE_SECRET_KEY;
  if (!secret) {
    return Response.json({ error: "Payments aren't configured yet." }, { status: 503 });
  }

  let body: { plan?: unknown; campuses?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const plan: CheckoutPlan = isCheckoutPlan(body.plan) ? body.plan : "annual";
  const campuses = typeof body.campuses === "number" && Number.isInteger(body.campuses) ? body.campuses : 1;
  if (campuses < 1 || campuses > MAX_CAMPUSES) {
    return Response.json({ error: `Checkout covers 1 to ${MAX_CAMPUSES} campuses.` }, { status: 400 });
  }
  if (campuses > 1 && plan !== "annual") {
    return Response.json({ error: "Multi-campus plans are billed yearly." }, { status: 400 });
  }

  // Only an event manager may buy a college plan, and only for their own account.
  let user: Awaited<ReturnType<typeof currentUser>>;
  let subscribed = false;
  try {
    user = await currentUser(request);
    if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });
    const rows = await db().query(`select ${ACTIVE_SUB_SQL} as subscribed`, [user.id]);
    subscribed = Boolean(rows[0]?.subscribed);
  } catch (err) {
    console.error("[checkout] account check failed:", err);
    return Response.json({ error: "Server isn't configured to verify accounts yet." }, { status: 503 });
  }
  if (user.role !== "event_manager") {
    return Response.json({ error: "Only a college account can buy a GradLink plan." }, { status: 403 });
  }
  if (subscribed) {
    return Response.json(
      { error: plan === "event_pass" ? "Placement Pro already covers unlimited events." : "You already have Placement Pro." },
      { status: 409 },
    );
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const stripe = new Stripe(secret);
  const profileId = user.id;

  try {
    if (plan === "event_pass") {
      const priceId = env.STRIPE_PRICE_EVENT_PASS;
      if (!priceId) return Response.json({ error: "Event Passes aren't configured yet." }, { status: 503 });
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: profileId,
        customer_email: user.email || undefined,
        metadata: { profileId, kind: "event_pass" },
        success_url: `${origin}/dashboard/events?pass=1`,
        cancel_url: `${origin}/pricing?canceled=1`,
        allow_promotion_codes: true,
      });
      if (!session.url) return Response.json({ error: "Stripe didn't return a checkout URL." }, { status: 502 });
      return Response.json({ url: session.url });
    }

    const founding = plan === "annual" && (await foundingOpen());
    const mainPrice =
      plan === "annual" ? (founding ? env.STRIPE_PRICE_PRO_FOUNDING : env.STRIPE_PRICE_PRO)
      : plan === "two_year" ? env.STRIPE_PRICE_PRO_2Y
      : env.STRIPE_PRICE_PRO_3Y;
    const campusPrice = env.STRIPE_PRICE_EXTRA_CAMPUS;
    if (!mainPrice || (campuses > 1 && !campusPrice)) {
      return Response.json({ error: "This plan isn't configured yet." }, { status: 503 });
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [{ price: mainPrice, quantity: 1 }];
    if (campuses > 1) lineItems.push({ price: campusPrice, quantity: campuses - 1 });

    // Event Pass credit, capped at the first payment so it never goes negative.
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    const credit = await creditablePasses(profileId);
    if (credit.amountMinor > 0) {
      const prices = await Promise.all(lineItems.map((li) => stripe.prices.retrieve(li.price as string)));
      const currency = prices[0].currency;
      const firstPayment = prices.reduce((sum, p, idx) => sum + (p.unit_amount ?? 0) * (lineItems[idx].quantity ?? 1), 0);
      const amountOff = Math.min(credit.amountMinor, firstPayment);
      if (credit.currency === currency && amountOff > 0) {
        const coupon = await stripe.coupons.create({
          amount_off: amountOff,
          currency,
          duration: "once",
          max_redemptions: 1,
          name: "Event Pass credit",
          metadata: { profileId },
        });
        discounts = [{ coupon: coupon.id }];
      }
    }

    const meta = {
      profileId,
      term: plan,
      campuses: String(campuses),
      founding: founding ? "1" : "0",
    };
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: lineItems,
      client_reference_id: profileId,
      customer_email: user.email || undefined,
      subscription_data: { metadata: { ...meta, organization: user.org ?? "" } },
      // Pass ids are only needed once, to mark the credit as used.
      metadata: { ...meta, creditedPasses: discounts ? credit.ids.join(",") : "" },
      success_url: `${origin}/dashboard/event-manager?upgraded=1`,
      cancel_url: `${origin}/pricing?canceled=1`,
      // Stripe allows either a set discount or customer-entered codes, not both.
      ...(discounts ? { discounts } : { allow_promotion_codes: true }),
    });

    if (!session.url) return Response.json({ error: "Stripe didn't return a checkout URL." }, { status: 502 });
    return Response.json({ url: session.url });
  } catch (err) {
    console.error("[checkout]", err);
    return Response.json({ error: "Couldn't start checkout. Please try again." }, { status: 502 });
  }
}
