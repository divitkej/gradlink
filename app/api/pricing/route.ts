import { foundingOpen } from "@/lib/server/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public pricing state for the /pricing page, which signed-out visitors see
 * too. Only says whether the founding price is still open; nothing per account.
 */
export async function GET() {
  try {
    return Response.json({ foundingOpen: await foundingOpen() });
  } catch (err) {
    console.error("[pricing]", err);
    return Response.json({ error: "Pricing is unavailable right now." }, { status: 503 });
  }
}
