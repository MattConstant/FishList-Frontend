import type { MetadataRoute } from "next";

function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (!raw) return "http://localhost:3000";
  return raw.startsWith("http") ? raw : `https://${raw}`;
}

function url(pathname: string): string {
  const base = siteUrl().replace(/\/$/, "");
  return `${base}${pathname.startsWith("/") ? "" : "/"}${pathname}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Keep this list tight so Google focuses sitelinks on core pages.
  const staticRoutes = ["/map", "/about", "/register", "/login"];

  return staticRoutes.map((pathname) => ({
    url: url(pathname),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));
}

