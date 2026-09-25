import { serverEnv, type KVLike } from "./env";
import { HttpError } from "./http";
import type { AuthUser } from "./session";

/* ============================================================
   Résumés, brochures and logos — Firebase Storage → Workers KV.

   KV is part of the Workers Free plan with no extra product to enable
   (1 GB stored, 1,000 writes/day, 100,000 reads/day), which is ample
   for occasional uploads of files under 10 MB. The rules match
   storage.rules: only signed-in users can read, only the owner can
   upload, and keys are `{folder}/{profileId}-{timestamp}-{name}`.
   ============================================================ */

const FOLDERS = ["resumes", "brochures", "logos", "avatars"];
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Files are served from GradLink's own origin, so anything that a browser
 * could execute (HTML, SVG, …) must never be served inline. Only these types
 * are; everything else downloads as an opaque attachment.
 */
const INLINE_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"];

interface FileMeta {
  contentType: string;
  name: string;
  owner: string;
}

function bucket(): KVLike {
  const kv = serverEnv().UPLOADS;
  if (!kv) throw new HttpError(503, "File uploads aren't configured yet.");
  return kv;
}

export async function uploadFile(request: Request, user: AuthUser): Promise<{ url: string }> {
  const form = await request.formData().catch(() => null);
  const folder = form?.get("folder");
  const file = form?.get("file");
  if (typeof folder !== "string" || !FOLDERS.includes(folder)) throw new HttpError(400, "Unknown upload folder.");
  if (!file || typeof file === "string") throw new HttpError(400, "Choose a file to upload.");
  if (file.size > MAX_BYTES) throw new HttpError(413, "That file is over 10 MB.");

  const safe = (file.name || "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
  const key = `${folder}/${user.id}-${Date.now()}-${safe}`;
  const meta: FileMeta = { contentType: file.type || "application/octet-stream", name: safe, owner: user.id };
  await bucket().put(key, await file.arrayBuffer(), { metadata: meta });

  const base = serverEnv().APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;
  return { url: `${base}/api/files/${key.split("/").map(encodeURIComponent).join("/")}` };
}

export async function serveFile(key: string): Promise<Response> {
  const { value, metadata } = await bucket().getWithMetadata<FileMeta>(key, "stream");
  if (!value) return new Response("Not found", { status: 404 });

  const type = metadata?.contentType ?? "application/octet-stream";
  const inline = INLINE_TYPES.includes(type);
  const name = (metadata?.name ?? "file").replace(/"/g, "");
  return new Response(value, {
    headers: {
      "Content-Type": inline ? type : "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name}"`,
      "X-Content-Type-Options": "nosniff",
      // Signed-in users only, so browsers may cache it but shared caches must not.
      "Cache-Control": "private, max-age=3600",
    },
  });
}
