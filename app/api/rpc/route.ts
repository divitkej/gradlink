import { ops } from "@/lib/server/rpc";
import { currentUser } from "@/lib/server/session";
import { HttpError, assertSameOrigin, handleError, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Data API used by lib/db.ts, lib/events.ts and lib/billing.ts.
 * Body: `{ op: "getScans", args: [...] }` → `{ data }` or `{ error }`.
 */
export async function POST(request: Request) {
  let op = "";
  try {
    assertSameOrigin(request);
    const body = (await request.json().catch(() => null)) as { op?: unknown; args?: unknown } | null;
    op = typeof body?.op === "string" ? body.op : "";
    if (!Object.hasOwn(ops, op)) throw new HttpError(404, "Unknown operation.");

    // Every operation requires a signed-in account, as every Firestore rule did.
    const user = await currentUser(request);
    if (!user) throw new HttpError(401, "Please sign in again.");

    const data = await ops[op](user, Array.isArray(body?.args) ? body.args : []);
    return json({ data });
  } catch (err) {
    return handleError(`rpc/${op || "?"}`, err);
  }
}
