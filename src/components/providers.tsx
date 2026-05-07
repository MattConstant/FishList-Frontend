"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AchievementToastProvider } from "@/contexts/achievement-toast-context";
import { AuthProvider } from "@/contexts/auth-context";
import { LocaleProvider } from "@/contexts/locale-context";

/**
 * Client-side provider stack for global app concerns.
 *
 * Order matters:
 * - OAuth provider must wrap auth flows that use Google Identity.
 * - Theme provider controls `class="dark"` on `<html>` and must wrap UI.
 * - Locale provider drives translated strings and `<html lang>`.
 * - Auth + achievement providers depend on browser storage and API calls.
 */
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
