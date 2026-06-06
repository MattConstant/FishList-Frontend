"use client";

import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { getDisplayErrorMessage } from "@/lib/api";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

export default function LoginPage() {
  const { user, signInWithGoogle, signInWithPassword } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const hasGoogleClientId =
    typeof process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID === "string" &&
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.length > 0;

  if (user) {
    return (
      <div className="login-page__backdrop relative flex flex-1 items-center justify-center px-6 py-16">
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

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      await signInWithPassword(username, password);
      router.push("/profile");
    } catch (err) {
      setError(getDisplayErrorMessage(err, "Could not authenticate."));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="login-page__backdrop relative flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-white/30 bg-white/90 p-8 shadow-xl backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {t("login.title.login")}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t("login.desc")}</p>

        <form className="mt-8 space-y-4" onSubmit={handlePasswordSubmit} noValidate>
          <div>
            <label
              htmlFor="login-username"
              className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              {t("login.username")}
            </label>
            <input
              id="login-username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClassName}
              disabled={pending}
            />
          </div>
          <div>
            <label
              htmlFor="login-password"
              className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              {t("login.password")}
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClassName}
              disabled={pending}
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-sky-700 disabled:opacity-60 dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            {t("login.submitPassword")}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <Link
            href="/register"
            className="font-medium text-sky-700 hover:underline dark:text-sky-400"
          >
            {t("login.linkRegister")}
          </Link>
        </p>

        <div className="mt-8 flex flex-col items-stretch gap-4">
          {hasGoogleClientId ? (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-zinc-200 dark:border-zinc-600" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white/90 px-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:bg-zinc-900/90 dark:text-zinc-400">
                    {t("login.orGoogle")}
                  </span>
                </div>
              </div>
              <div
                className={`flex flex-col items-center ${pending ? "pointer-events-none opacity-60" : ""}`}
              >
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
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-amber-800 dark:text-amber-200" role="alert">
              {t("login.missingClientId")}
            </p>
          )}

          {pending ? (
            <p className="text-center text-sm text-zinc-500">{t("login.pending")}</p>
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
