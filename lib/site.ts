// Public origin of the site, without a trailing slash. Set NEXT_PUBLIC_SITE_URL
// at build time to the Worker's public URL (see .env.example).
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
