"use client";

import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { getDisplayErrorMessage } from "@/lib/api";

export default function LoginPage() {
  const { user, signInWithGoogle } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const hasGoogleClientId =
    typeof process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID === "string" &&
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.length > 0;

  if (user) {
    return (
      <div
        className="relative flex flex-1 items-center justify-center px-6 py-16"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.6), rgba(15,23,42,0.6)), url('/Quetico_NorthernLights-scaled.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="w-full max-w-md rounded-2xl border border-white/30 bg-white/90 p-8 shadow-xl backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
          <p className="text-center text-zinc-600 dark:text-zinc-400">
            {t("login.signedInAs", { username: user.username })}
          </p>
          <Link
            href="/profile"
            className="mt-6 block text-center text-sm font-medium text-sky-700 underline-offset-4 hover:underline dark:text-sky-400"
          >
            {t("login.goProfile")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex flex-1 items-center justify-center px-6 py-16"
      style={{
        backgroundImage:
          "linear-gradient(rgba(15,23,42,0.6), rgba(15,23,42,0.6)), url('/Quetico_NorthernLights-scaled.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/30 bg-white/90 p-8 shadow-xl backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {t("login.title.login")}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {t("login.desc")}
        </p>

        <div className="mt-8 flex flex-col items-center gap-4">
          {!hasGoogleClientId ? (
            <p className="text-center text-sm text-amber-800 dark:text-amber-200" role="alert">
              {t("login.missingClientId")}
            </p>
          ) : (
            <GoogleLogin
              onSuccess={async (credentialResponse: CredentialResponse) => {
                const cred = credentialResponse.credential;
                if (!cred) {
                  setError(t("login.error.noCredential"));
                  return;
                }
                setError("");
                setPending(true);
                try {
                  await signInWithGoogle(cred);
                  router.push("/profile");
                } catch (err) {
                  setError(getDisplayErrorMessage(err, "Could not authenticate."));
                } finally {
                  setPending(false);
                }
              }}
              onError={() => setError(t("login.error.google"))}
              useOneTap={false}
              theme="outline"
              size="large"
              text="continue_with"
              shape="rectangular"
              width={320}
            />
          )}
          {pending ? (
            <p className="text-sm text-zinc-500">{t("login.pending")}</p>
          ) : null}
          {error ? (
            <p className="text-center text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <Link
            href="/"
            className="font-medium text-sky-700 hover:underline dark:text-sky-400"
          >
            {t("login.backHome")}
          </Link>
        </p>
      </div>
    </div>
  );
}
