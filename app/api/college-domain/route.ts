import { currentUser } from "@/lib/server/session";
import { HttpError, handleError, json } from "@/lib/server/http";
import { domainStatusFor } from "@/lib/server/college-domains";

export const dynamic = "force-dynamic";

/** A college account's student domain and its approval, for the notice on its dashboard. */
export async function GET(request: Request) {
  try {
    const user = await currentUser(request);
    if (!user) throw new HttpError(401, "Please sign in again.");
    if (user.role !== "event_manager") return json({ registration: null });
    return json({ registration: await domainStatusFor(user.id) });
  } catch (err) {
    return handleError("college-domain", err);
  }
}
