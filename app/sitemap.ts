import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Public pages only. Signed-in and per-event pages are excluded (see robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number }[] = [
    { path: "", priority: 1 },
    { path: "/pricing", priority: 0.8 },
    { path: "/sign-up", priority: 0.6 },
    { path: "/sign-up/student", priority: 0.5 },
    { path: "/sign-up/company", priority: 0.5 },
    { path: "/sign-up/college", priority: 0.5 },
    { path: "/sign-in", priority: 0.3 },
  ];
  return pages.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: p.priority,
  }));
}
