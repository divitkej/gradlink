import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;

// Gives `next dev` the same bindings and secrets as the deployed Worker:
// the UPLOADS KV namespace (simulated locally) and the values in .dev.vars.
initOpenNextCloudflareForDev();
