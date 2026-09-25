import { uploadFile } from "@/lib/server/files";
import { currentUser } from "@/lib/server/session";
import { HttpError, assertSameOrigin, handleError, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Multipart upload: fields `folder` and `file`. Returns `{ url }`. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request, { requireJson: false });
    const user = await currentUser(request);
    if (!user) throw new HttpError(401, "Please sign in again.");
    return json(await uploadFile(request, user));
  } catch (err) {
    return handleError("files/upload", err);
  }
}
