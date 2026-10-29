import { serverEnv, type KVLike } from "./env";
import { db } from "./sql";
import { HttpError } from "./http";
import type { AuthUser } from "./session";

/* ============================================================
   Résumés, brochures and logos, stored in Workers KV.

   KV is part of the Workers Free plan with no extra product to enable
   (1 GB stored, 1,000 writes/day, 100,000 reads/day), which is ample
   for occasional uploads of files under 10 MB. Only the owner can
   upload, and keys are `{folder}/{profileId}-{timestamp}-{name}`.
   A file can be read by its owner and by people at the same event as
   the owner, except a résumé, which fellow students don't get.
   ============================================================ */

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * File types each folder accepts, by extension. The stored content type comes
 * from this table, never from the browser, so a renamed HTML or SVG file can't
 * be uploaded as something the browser would run.
 */
const TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};
const IMAGES = ["png", "jpg", "jpeg", "webp", "gif"];
const FOLDERS: Record<string, string[]> = {
  resumes: ["pdf", "doc", "docx"],
  brochures: ["pdf"],
  logos: IMAGES,
  avatars: IMAGES,
};

/**
 * Files are served from GradLeap's own origin, so anything that a browser
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
  if (typeof folder !== "string" || !Object.hasOwn(FOLDERS, folder)) throw new HttpError(400, "Unknown upload folder.");
  if (!file || typeof file === "string") throw new HttpError(400, "Choose a file to upload.");
  if (file.size > MAX_BYTES) throw new HttpError(413, "That file is over 10 MB.");
  if (file.size === 0) throw new HttpError(400, "That file is empty.");

  const safe = (file.name || "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
  const ext = safe.includes(".") ? safe.split(".").pop()!.toLowerCase() : "";
  if (!FOLDERS[folder].includes(ext)) {
    throw new HttpError(415, `That file type isn't supported here. Use ${FOLDERS[folder].map((e) => `.${e}`).join(", ")}.`);
  }
  const key = `${folder}/${user.id}-${Date.now()}-${safe}`;
  const meta: FileMeta = { contentType: TYPES[ext], name: safe, owner: user.id };
  await bucket().put(key, await file.arrayBuffer(), { metadata: meta });

  const base = serverEnv().APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;
  return { url: `${base}/api/files/${key.split("/").map(encodeURIComponent).join("/")}` };
}

/** Whether `viewer` and `owner` are at the same event (as its owner, or registered for it). */
async function sharesEvent(viewer: string, owner: string): Promise<boolean> {
  const rows = await db()`
    select 1 from events e
    where (e.created_by = ${owner} or exists (select 1 from event_registrations t where t.event_id = e.id and t.profile_id = ${owner}))
      and (e.created_by = ${viewer} or exists (select 1 from event_registrations me where me.event_id = e.id and me.profile_id = ${viewer}))
    limit 1
  `;
  return rows.length > 0;
}

export async function serveFile(key: string, user: AuthUser): Promise<Response> {
  const { value, metadata } = await bucket().getWithMetadata<FileMeta>(key, "stream");
  if (!value) return new Response("Not found", { status: 404 });
  const owner = metadata?.owner;
  if (owner !== user.id) {
    // Same answer as a missing file, so keys can't be probed.
    const allowed = !!owner && !(key.startsWith("resumes/") && user.role === "student") && (await sharesEvent(user.id, owner));
    if (!allowed) {
      await value.cancel();
      return new Response("Not found", { status: 404 });
    }
  }

  const type = metadata?.contentType ?? "application/octet-stream";
  const inline = INLINE_TYPES.includes(type);
  const name = (metadata?.name ?? "file").replace(/"/g, "");
  return new Response(value, {
    headers: {
      "Content-Type": inline ? type : "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name}"`,
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      // Signed-in users only, so browsers may cache it but shared caches must not.
      "Cache-Control": "private, max-age=3600",
    },
  });
}
