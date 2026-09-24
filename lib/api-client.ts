"use client";

/* ============================================================
   Browser → Worker transport.

   lib/db.ts, lib/events.ts and lib/billing.ts used to call Firestore
   directly from the browser. They now call the Worker, which talks to
   Neon. The session is an HttpOnly cookie, so nothing here handles a
   token — `credentials: "same-origin"` is all it takes.
   ============================================================ */

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: body === undefined || body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    ...init,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    // The server session is gone (expired, signed out elsewhere, or a profile
    // cached from before the move to Neon). Drop the local copy so the
    // dashboards send the user to sign in instead of showing empty data.
    import("./session").then((m) => m.clearSession());
  }
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`);
  return data;
}

/** Call a data operation in lib/server/rpc.ts by name. */
export async function rpc<T>(op: string, ...args: unknown[]): Promise<T> {
  const { data } = await api<{ data: T }>("/api/rpc", { op, args });
  return data;
}
