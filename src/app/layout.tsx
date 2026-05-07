import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ConnectionBanner } from "@/components/connection-banner";
import { NavBar } from "@/components/nav-bar";
import { Providers } from "@/components/providers";
import "./globals.css";

/**
 * Global app shell for all routes.
 *
 * This file is server-rendered by default (no `"use client"`), but it can safely include
 * client providers by wrapping `children` with the `Providers` client component.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Canonical site URL for Open Graph / Twitter image resolution (set in production). */
function metadataBaseUrl(): URL {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (raw) {
    try {
      return new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    } catch {
      // fall through to localhost
    }
  }
  return new URL("http://localhost:3000");
}

/** Static metadata used by Next for the document head and PWA-like behavior. */
export const metadata: Metadata = {
  metadataBase: metadataBaseUrl(),
  title: "FishList",
  description: "Track and explore fishing spots",
  /** Same asset as `src/app/icon.png` - explicit entries help search/social crawlers. */
  icons: {
    icon: [{ url: "/fishlist-logo.png", type: "image/png" }],
    apple: [{ url: "/fishlist-logo.png" }],
  },
  openGraph: {
    title: "FishList",
    description: "Track and explore fishing spots",
    type: "website",
    images: [{ url: "/fishlist-logo.png", alt: "FishList" }],
  },
  twitter: {
    card: "summary",
    title: "FishList",
    description: "Track and explore fishing spots",
    images: ["/fishlist-logo.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FishList",
  },
  formatDetection: {
    telephone: false,
  },
};

/** iOS notch / home indicator + correct scaling; viewportFit=cover enables env(safe-area-inset-*). */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#131a2a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // Some providers (theme/locale) update attributes on the client; suppress warnings for those.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full min-h-dvh antialiased`}
    >
      <body
        className="flex min-h-dvh flex-col font-sans"
        // ThemeProvider toggles classes client-side; avoid noisy hydration warnings.
        suppressHydrationWarning
      >
        <Providers>
          {/* h-dvh gives main a real height so flex-1 children (e.g. map) don’t collapse to 0 */}
          <div className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden">
            <NavBar />
            <ConnectionBanner />
            <main className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto pb-[env(safe-area-inset-bottom)]">
              {children}
            </main>
          </div>
        </Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
