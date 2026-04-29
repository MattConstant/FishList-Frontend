"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AchievementToastProvider } from "@/contexts/achievement-toast-context";
import { AuthProvider } from "@/contexts/auth-context";
import { LocaleProvider } from "@/contexts/locale-context";

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <LocaleProvider>
          <AuthProvider>
            <AchievementToastProvider>{children}</AchievementToastProvider>
          </AuthProvider>
        </LocaleProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
