// Public origin of the site, without a trailing slash. Builds that don't set
// NEXT_PUBLIC_SITE_URL (for example Cloudflare's GitHub builds) fall back to the
// live workers.dev address, so share cards and the sitemap never point at
// localhost. Change the fallback when the custom domain goes live.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://gradlink.divitkej.workers.dev").replace(/\/+$/, "");

// Who runs GradLink and how to reach them, shown on the Privacy and Terms
// pages. Swap the email for an address on the custom domain once it exists.
export const OPERATOR = {
  name: "Divit Kejriwal",
  location: "Dubai, United Arab Emirates",
  email: "divitkej@gmail.com",
} as const;
