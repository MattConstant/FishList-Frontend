"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import { getDisplayErrorMessage } from "@/lib/api";
import { tryMapUsernameHttpError, validateUsernameClient } from "@/lib/username-policy";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

export default function RegisterPage() {
  const { user, signUpWithPassword } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const u = username.trim();
    const clientIssue = validateUsernameClient(u);
    if (clientIssue === "reserved") {
      setError(t("validation.usernameReserved"));
      return;
    }
    if (clientIssue === "inappropriate") {
      setError(t("validation.usernameInappropriate"));
      return;
    }
    if (password.length < 8) {
      setError(t("register.passwordTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("register.mismatch"));
      return;
    }
    setPending(true);
    try {
      await signUpWithPassword(u, password);
      router.push("/profile");
    } catch (err) {
      const mapped = tryMapUsernameHttpError(err, t);
      setError(
        mapped ??
          (err instanceof Error
            ? err.message
            : getDisplayErrorMessage(err, "Could not create account.")),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="login-page__backdrop relative flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-white/30 bg-white/90 p-8 shadow-xl backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {t("register.title")}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t("register.desc")}</p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label
              htmlFor="register-username"
              className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              {t("login.username")}
            </label>
            <input
              id="register-username"
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
              htmlFor="register-password"
              className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              {t("login.password")}
            </label>
            <input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClassName}
              disabled={pending}
            />
          </div>
          <div>
            <label
              htmlFor="register-confirm"
              className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              {t("register.confirmPassword")}
            </label>
            <input
              id="register-confirm"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClassName}
              disabled={pending}
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-sky-700 disabled:opacity-60 dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            {t("register.submit")}
          </button>
        </form>

        {pending ? (
          <p className="mt-4 text-center text-sm text-zinc-500">{t("login.pending")}</p>
        ) : null}
        {error ? (
          <p className="mt-4 text-center text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <Link
            href="/login"
            className="font-medium text-sky-700 hover:underline dark:text-sky-400"
          >
            {t("register.linkLogin")}
          </Link>
        </p>
        <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/" className="font-medium text-sky-700 hover:underline dark:text-sky-400">
            {t("login.backHome")}
          </Link>
        </p>
      </div>
    </div>
  );
}
