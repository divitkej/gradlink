import { currentUser } from "@/lib/server/session";
import { HttpError, assertSameOrigin, handleError, json } from "@/lib/server/http";
import { decideCollegeDomain, listCollegeDomains, requireAdmin } from "@/lib/server/college-domains";

export const dynamic = "force-dynamic";

/** Owner only: every college domain request, pending first. */
export async function GET(request: Request) {
  try {
    requireAdmin(await currentUser(request));
    return json({ domains: await listCollegeDomains() });
  } catch (err) {
    return handleError("admin/college-domains", err);
  }
}

/** Owner only. Body: `{ domain, action: "approve" | "reject", approveAs? }`. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    requireAdmin(await currentUser(request));
    const body = (await request.json().catch(() => null)) as { domain?: unknown; action?: unknown; approveAs?: unknown } | null;
    const domain = typeof body?.domain === "string" ? body.domain : "";
    const action = body?.action;
    if (!domain || (action !== "approve" && action !== "reject")) throw new HttpError(400, "Choose approve or reject.");
    const approveAs = typeof body?.approveAs === "string" && body.approveAs.trim() ? body.approveAs : undefined;
    await decideCollegeDomain(domain, action, approveAs);
    return json({ domains: await listCollegeDomains() });
  } catch (err) {
    return handleError("admin/college-domains", err);
  }
}
