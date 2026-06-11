"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useLocale } from "@/contexts/locale-context";
import { getDisplayErrorMessage, resetPassword } from "@/lib/api";

const inputClassName =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

function ResetPasswordContent() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setStatus("error");
      setMessage(t("login.resetPasswordMissingToken"));
      return;
    }
    if (password.length < 8) {
      setStatus("error");
      setMessage(t("register.passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setStatus("error");
      setMessage(t("register.mismatch"));
      return;
    }
    setPending(true);
    setStatus("idle");
    try {
      const res = await resetPassword(token, password);
      setStatus("ok");
      setMessage(res.message);
    } catch (err) {
      setStatus("error");
      setMessage(getDisplayErrorMessage(err, t("login.resetPasswordFailed")));
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <div className="login-page__backdrop relative flex flex-1 items-center justify-center px-6 py-16">
        <div className="login-page__card w-full max-w-md p-8">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {t("login.resetPasswordTitle")}
          </h1>
          <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {t("login.resetPasswordMissingToken")}
          </p>
          <Link
            href="/forgot-password"
            className="mt-6 block text-center text-sm font-medium text-sky-700 hover:underline dark:text-sky-400"
          >
            {t("login.forgotPasswordTitle")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page__backdrop relative flex flex-1 items-center justify-center px-6 py-16">
      <div className="login-page__card w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {t("login.resetPasswordTitle")}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {t("login.resetPasswordDesc")}
        </p>

        {status === "ok" ? (
          <>
            <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400" role="status">
              {message}
            </p>
            <Link
              href="/login"
              className="mt-6 block text-center text-sm font-medium text-sky-700 hover:underline dark:text-sky-400"
            >
              {t("verifyEmail.goLogin")}
            </Link>
          </>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label
                htmlFor="reset-password"
                className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
              >
                {t("login.newPassword")}
              </label>
              <input
                id="reset-password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClassName}
                disabled={pending}
                required
              />
            </div>
            <div>
              <label
                htmlFor="reset-confirm"
                className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
              >
                {t("register.confirmPassword")}
              </label>
              <input
                id="reset-confirm"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
              {pending ? t("login.resetPasswordSaving") : t("login.resetPasswordSubmit")}
            </button>
            {status === "error" && message ? (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {message}
              </p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="login-page__backdrop relative flex flex-1 items-center justify-center px-6 py-16">
          <p className="text-sm text-zinc-500">…</p>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
