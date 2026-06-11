"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale } from "@/contexts/locale-context";
import { forgotPassword, getDisplayErrorMessage } from "@/lib/api";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

export default function ForgotPasswordPage() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setPending(true);
    try {
      const res = await forgotPassword(email);
      setMessage(res.message);
    } catch (err) {
      setError(getDisplayErrorMessage(err, t("login.forgotPasswordFailed")));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="login-page__backdrop relative flex flex-1 items-center justify-center px-6 py-16">
      <div className="login-page__card w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {t("login.forgotPasswordTitle")}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {t("login.forgotPasswordDesc")}
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label
              htmlFor="forgot-email"
              className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              {t("login.resendEmailLabel")}
            </label>
            <input
              id="forgot-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClassName}
              disabled={pending}
              required
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-sky-700 disabled:opacity-60 dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            {pending ? t("login.forgotPasswordSending") : t("login.forgotPasswordSubmit")}
          </button>
        </form>

        {message ? (
          <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <Link
            href="/login"
            className="font-medium text-sky-700 hover:underline dark:text-sky-400"
          >
            {t("login.backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
