// Public origin of the site, without a trailing slash. Override with
// NEXT_PUBLIC_SITE_URL at build time (see .env.example), e.g. for a custom domain.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://gradlink.divitkej.workers.dev").replace(/\/+$/, "");
