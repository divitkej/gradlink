import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Signed-in areas, API routes and one-off links are not for search results.
      // No trailing slash, so each rule also covers the bare route (e.g. /dashboard).
      disallow: ["/dashboard", "/api", "/scan", "/events", "/reset-password"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
