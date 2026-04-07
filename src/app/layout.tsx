import type { Metadata } from "next";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Providers>
          <NavBar />
          <main className="flex flex-1 flex-col">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
