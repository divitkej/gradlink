import { db } from "@/lib/server/sql";
import { handleError, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/**
 * Liveness check for deploys: the Worker answers and can query Neon.
 * Returns no data and needs no sign-in. The deploy workflow polls it.
 */
export async function GET() {
  try {
    await db()`select 1`;
    return json({ ok: true, database: "connected" });
  } catch (err) {
    return handleError("health", err);
  }
}
