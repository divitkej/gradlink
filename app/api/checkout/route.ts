import Stripe from "stripe";
import { db } from "@/lib/server/sql";
import { serverEnv } from "@/lib/server/env";
import { currentUser } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creates a Stripe Checkout Session for a college upgrading to Placement Pro.
 *
 * The college's profile id rides along in `client_reference_id` and in the
 * subscription metadata, so the webhook knows which `subscriptions` row to
 * write when payment succeeds.
 */
export async function POST(request: Request) {
  const env = serverEnv();
  const secret = env.STRIPE_SECRET_KEY;
  const priceId = env.STRIPE_PRICE_PRO;

  if (!secret || !priceId) {
    return Response.json(
      { error: "Payments aren't configured yet. Add STRIPE_SECRET_KEY and STRIPE_PRICE_PRO." },
      { status: 503 }
    );
  }

  let body: { profileId?: string; email?: string; organization?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { profileId, email, organization } = body;
  if (!profileId) return Response.json({ error: "Missing profile." }, { status: 400 });

  // Only an event manager may buy a college plan, and only for their own
  // account. Both are checked against the signed-in session, so the caller
  // can't buy a plan for someone else's profile by editing the request.
  let profile: { role: string; email: string; organization: string | null } | undefined;
  try {
    const user = await currentUser(request);
    if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });
    if (user.id !== profileId) return Response.json({ error: "You can only upgrade your own account." }, { status: 403 });
    const rows = await db()`select role, email, organization from profiles where id = ${profileId}`;
    profile = rows[0] as typeof profile;
  } catch (err) {
    console.error("[checkout] account check failed:", err);
    return Response.json({ error: "Server isn't configured to verify accounts yet." }, { status: 503 });
  }
  if (!profile) return Response.json({ error: "We couldn't find that account." }, { status: 404 });
  if (profile.role !== "event_manager") {
    return Response.json({ error: "Only a college account can subscribe to Placement Pro." }, { status: 403 });
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const stripe = new Stripe(secret);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: profileId,
      customer_email: email || profile.email || undefined,
      subscription_data: {
        metadata: { profileId, organization: organization ?? profile.organization ?? "" },
      },
      metadata: { profileId },
      success_url: `${origin}/dashboard/event-manager?upgraded=1`,
      cancel_url: `${origin}/pricing?canceled=1`,
      allow_promotion_codes: true,
    });

    if (!session.url) return Response.json({ error: "Stripe didn't return a checkout URL." }, { status: 502 });
    return Response.json({ url: session.url });
  } catch (err) {
    console.error("[checkout]", err);
    return Response.json({ error: "Couldn't start checkout. Please try again." }, { status: 502 });
  }
}
