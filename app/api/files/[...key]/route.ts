import { serveFile } from "@/lib/server/files";
import { currentUser } from "@/lib/server/session";
import { handleError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Download an uploaded file. Signed-in users only, as storage.rules required. */
export async function GET(request: Request, ctx: { params: Promise<{ key: string[] }> }) {
  try {
    const user = await currentUser(request);
    if (!user) return new Response("Sign in to view this file.", { status: 401 });
    const { key } = await ctx.params;
    return await serveFile(key.map(decodeURIComponent).join("/"));
  } catch (err) {
    return handleError("files/get", err);
  }
}
