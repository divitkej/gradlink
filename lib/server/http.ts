import { NotConfiguredError } from "./sql";
import { ConfigError } from "./session";

/** An error whose message is safe to show the user. */
export class HttpError extends Error {
  /** `code` lets the browser react to a specific case, e.g. "unverified". */
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, { ...init, headers: { "Cache-Control": "no-store", ...init?.headers } });
}

/**
 * Cookie-authenticated endpoints must not be callable cross-site. SameSite=Lax
 * already withholds the cookie from cross-site POSTs; this also rejects any
 * request whose Origin is a different site, and requires a JSON body (which a
 * plain HTML form can't send without a CORS preflight).
 */
export function assertSameOrigin(request: Request, { requireJson = true } = {}) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, "Cross-site request refused.");
  if (requireJson && !(request.headers.get("content-type") ?? "").includes("application/json")) {
    throw new HttpError(415, "Expected a JSON request.");
  }
}

/** Uniform error → Response mapping for every route handler. */
export function handleError(scope: string, err: unknown): Response {
  if (err instanceof HttpError) return json({ error: err.message, ...(err.code && { code: err.code }) }, { status: err.status });
  if (err instanceof NotConfiguredError || err instanceof ConfigError) {
    console.error(`[${scope}] not configured:`, err.message);
    return json({ error: "GradLink isn't connected yet. The server is missing its configuration." }, { status: 503 });
  }
  console.error(`[${scope}]`, err);
  return json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
