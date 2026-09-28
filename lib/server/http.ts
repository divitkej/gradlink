import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NotConfiguredError, db } from "./sql";
import { ConfigError } from "./session";

/** An error whose message is safe to show the user. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
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
  if (err instanceof HttpError) return json({ error: err.message }, { status: err.status });
  if (err instanceof NotConfiguredError || err instanceof ConfigError) {
    console.error(`[${scope}] not configured:`, err.message);
    return json({ error: "GradLink isn't connected yet — the server is missing its configuration." }, { status: 503 });
  }
  console.error(`[${scope}]`, err);
  recordError(scope, err);
  return json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

/**
 * Keep a copy of an unexpected error for the owner dashboard. Runs after the
 * response is sent and can never fail the request it is reporting on.
 */
function recordError(scope: string, err: unknown) {
  try {
    const message = (err instanceof Error ? err.message : String(err)).slice(0, 1000);
    const write = db()`insert into app_errors (scope, message) values (${scope.slice(0, 100)}, ${message})`.then(
      () => undefined,
      () => undefined,
    );
    try {
      getCloudflareContext().ctx.waitUntil(write);
    } catch {
      /* not on Workers (next dev): the promise still runs */
    }
  } catch {
    /* database not configured */
  }
}
