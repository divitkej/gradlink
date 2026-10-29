// Public origin of the site, without a trailing slash. Builds that don't set
// NEXT_PUBLIC_SITE_URL (for example Cloudflare's GitHub builds) fall back to the
// custom domain, so share cards and the sitemap never point at localhost.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://gradleap.online").replace(/\/+$/, "");

// Who runs GradLink and how to reach them, shown on the Privacy and Terms
// pages. Swap the email for an address on the custom domain once it exists.
export const OPERATOR = {
  name: "Divit Kejriwal",
  location: "Dubai, United Arab Emirates",
  email: "divitkej@gmail.com",
} as const;
