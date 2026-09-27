import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content Security Policy without nonces (see the Next.js CSP guide), so pages
 * stay statically rendered. Scripts, styles, fonts and API calls are all
 * same-origin; images may be https because company logos are external URLs.
 * Dev adds 'unsafe-eval' and websockets for React debugging and hot reload.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The QR scanner needs the camera; nothing else needs device access.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    root: __dirname,
  },
  async headers() {
    // Uploaded files set their own headers in lib/server/files.ts: a page CSP
    // on a PDF response can stop the browser's built-in PDF viewer.
    return [{ source: "/:path((?!api/files/).*)", headers: securityHeaders }];
  },
};

export default nextConfig;

// Gives `next dev` the same bindings and secrets as the deployed Worker:
// the UPLOADS KV namespace (simulated locally) and the values in .dev.vars.
initOpenNextCloudflareForDev();
