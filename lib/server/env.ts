import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Minimal Workers KV surface used for uploads. Declared here rather than
 * pulling in @cloudflare/workers-types for three methods.
 */
export interface KVLike {
  get(key: string, type: "stream"): Promise<ReadableStream | null>;
  getWithMetadata<M>(key: string, type: "stream"): Promise<{ value: ReadableStream | null; metadata: M | null }>;
  put(key: string, value: ArrayBuffer | ReadableStream, options?: { metadata?: unknown }): Promise<void>;
}

/**
 * Server configuration. Strings come from `wrangler.jsonc` vars and Wrangler
 * secrets in production, and from `.dev.vars` locally. Nothing here is ever
 * sent to the browser.
 */
export interface ServerEnv {
  /** Neon pooled connection string. Secret. */
  DATABASE_URL?: string;
  /** Signs session cookies. 32+ random bytes. Secret. */
  AUTH_SECRET?: string;
  /** Public origin used in emailed links, e.g. https://gradlink.example.workers.dev */
  APP_URL?: string;
  /** Optional: Resend API key for password-reset email. Secret. */
  RESEND_API_KEY?: string;
  /** Optional: sender address for password-reset email. */
  EMAIL_FROM?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_PRO?: string;
  /** Workers KV namespace holding résumés, brochures and logos. */
  UPLOADS?: KVLike;
}

/**
 * Bindings (KV) only exist on the Cloudflare context; plain strings are also
 * mirrored onto process.env. Reading both keeps `next dev` (which loads
 * `.dev.vars` through initOpenNextCloudflareForDev) and production identical.
 */
export function serverEnv(): ServerEnv {
  let cf: Record<string, unknown> = {};
  try {
    cf = getCloudflareContext().env as unknown as Record<string, unknown>;
  } catch {
    /* outside a request (e.g. during `next build`) — process.env only */
  }
  return { ...(process.env as Record<string, unknown>), ...cf } as ServerEnv;
}
