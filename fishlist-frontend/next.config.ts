import type { NextConfig } from "next";

// Avoid `turbopack.root` here - pinning it caused Turbopack HMR panics ("Next.js
// package not found"). Dev uses webpack; use `npm run dev:turbo` after cleaning
// stray parent lockfiles if you want Turbopack.

/** Standard headers for browser-facing security baselines (see OWASP secure headers). */
function securityHeaders(): { key: string; value: string }[] {
  const headers: { key: string; value: string }[] = [
    { key: "X-DNS-Prefetch-Control", value: "on" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value:
        "accelerometer=(), camera=(), microphone=(), geolocation=(self), interest-cohort=(), browsing-topics=()",
    },
  ];

  if (process.env.NODE_ENV === "production") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    });
  }

  return headers;
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(),
      },
    ];
  },
};

export default nextConfig;
