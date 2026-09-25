import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { serverEnv } from "./env";

/**
 * Neon over HTTP.
 *
 * Each query is a single stateless HTTPS request, which is what Workers want:
 * no socket held open between requests, nothing to pool, and Neon's compute is
 * free to scale to zero as soon as traffic stops (important on the Free plan's
 * compute-hour budget).
 */
let cached: { url: string; sql: NeonQueryFunction<false, false> } | null = null;

export class NotConfiguredError extends Error {}

export function db(): NeonQueryFunction<false, false> {
  const url = serverEnv().DATABASE_URL;
  if (!url) throw new NotConfiguredError("DATABASE_URL is not set");
  if (!cached || cached.url !== url) cached = { url, sql: neon(url) };
  return cached.sql;
}

export type Row = Record<string, unknown>;
