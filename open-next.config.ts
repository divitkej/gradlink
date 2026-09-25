import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

/**
 * GradLink uses no ISR/revalidation — prerendered pages are served as-is and
 * all live data comes from /api/*. The static-assets cache serves those pages
 * straight from Workers static assets, so no R2 bucket or Durable Object is
 * needed (keeping the deployment on the Free plan), and cache interception
 * answers them without booting the Next.js server, which keeps per-request
 * CPU well under the Free plan's limit.
 */
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
