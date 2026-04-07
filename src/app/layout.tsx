import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NavBar } from "@/components/nav-bar";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FishList",
  description: "Track and explore fishing spots",
  icons: {
    icon: "/ChatGPT%20Image%20Mar%2031%2C%202026%2C%2010_26_18%20PM.png",
    shortcut: "/ChatGPT%20Image%20Mar%2031%2C%202026%2C%2010_26_18%20PM.png",
    apple: "/ChatGPT%20Image%20Mar%2031%2C%202026%2C%2010_26_18%20PM.png",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full min-h-dvh antialiased`}
    >
      <body className="flex min-h-dvh flex-col font-sans">
        <Providers>
          {/* h-dvh gives main a real height so flex-1 children (e.g. map) don’t collapse to 0 */}
          <div className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden">
            <NavBar />
            <main className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto pb-[env(safe-area-inset-bottom)]">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
