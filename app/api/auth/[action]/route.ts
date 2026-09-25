import { handleAuth } from "@/lib/server/auth-api";
import { assertSameOrigin, handleError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Sign-up, sign-in, sign-out, session and password reset — see lib/server/auth-api.ts. */
export async function GET(request: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  try {
    return await handleAuth(action, request);
  } catch (err) {
    return handleError(`auth/${action}`, err);
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  try {
    assertSameOrigin(request);
    return await handleAuth(action, request);
  } catch (err) {
    return handleError(`auth/${action}`, err);
  }
}
