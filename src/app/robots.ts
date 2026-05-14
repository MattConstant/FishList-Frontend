import type { MetadataRoute } from "next";
import { resolveSiteOrigin } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep API routes out of the index.
      disallow: ["/api/"],
    },
    sitemap: `${resolveSiteOrigin()}/sitemap.xml`,
  };
}

