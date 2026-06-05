import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { LOCALE_COOKIE_NAME, parseAppLocale } from "@/lib/locale-shared";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ConnectionBanner } from "@/components/connection-banner";
import { NavBar } from "@/components/nav-bar";
import { Providers } from "@/components/providers";
import { resolveSiteUrl } from "@/lib/site-url";
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
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/** Static metadata used by Next for the document head and PWA-like behavior. */
export const metadata: Metadata = {
  metadataBase: resolveSiteUrl(),
  title: "FishList",
  description: "Track and explore fishing spots",
  manifest: "/site.webmanifest",
  /**
   * Explicit favicon/app icon entries help Google and social crawlers.
   * (Google strongly prefers a real `/favicon.ico` at the site root.)
   */
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
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
    { media: "(prefers-color-scheme: dark)", color: "#0f1624" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLocale = parseAppLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);

  return (
    <html
      lang={initialLocale}
      // Some providers (theme/locale) update attributes on the client; suppress warnings for those.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full min-h-dvh antialiased`}
    >
      <body
        className="flex min-h-dvh flex-col font-sans"
        // ThemeProvider toggles classes client-side; avoid noisy hydration warnings.
        suppressHydrationWarning
      >
        <Script
          id="fishlist-hide-landing-session"
          strategy="beforeInteractive"
          src="/fishlist-hide-landing-session.js"
        />
        <Providers initialLocale={initialLocale}>
          {/* h-dvh gives main a real height so flex-1 children (e.g. map) don’t collapse to 0 */}
          <div className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden">
            <NavBar />
            <ConnectionBanner />
            <main className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto pb-[env(safe-area-inset-bottom)]">
              {children}
            </main>
          </div>
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
