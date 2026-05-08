import type { MetadataRoute } from "next";

function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (!raw) return "http://localhost:3000";
  return raw.startsWith("http") ? raw : `https://${raw}`;
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep API routes out of the index.
      disallow: ["/api/"],
    },
    sitemap: `${siteUrl().replace(/\/$/, "")}/sitemap.xml`,
  };
}

