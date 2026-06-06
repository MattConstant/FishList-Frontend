import type { MetadataRoute } from "next";
import { resolveSiteOrigin } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const base = resolveSiteOrigin();

  // Keep this list tight so Google focuses sitelinks on core pages.
  const staticRoutes = ["/map", "/about", "/register", "/login"];

  return staticRoutes.map((pathname) => ({
    url: new URL(pathname, `${base}/`).toString(),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));
}

