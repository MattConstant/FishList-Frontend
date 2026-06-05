"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useLocale } from "@/contexts/locale-context";
import { getDisplayErrorMessage, verifyEmailToken } from "@/lib/api";

function VerifyEmailContent() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [status, setStatus] = useState<"idle" | "working" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage(t("verifyEmail.missingToken"));
      return;
    }
    let cancelled = false;
    setStatus("working");
    void verifyEmailToken(token)
      .then((res) => {
        if (cancelled) return;
        setStatus("ok");
        setMessage(res.message);
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("error");
        setMessage(getDisplayErrorMessage(err, t("verifyEmail.failed")));
      });
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  return (
    <div className="login-page__backdrop relative flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-white/30 bg-white/90 p-8 shadow-xl backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {t("verifyEmail.title")}
        </h1>
        {status === "working" ? (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">{t("verifyEmail.working")}</p>
        ) : null}
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
        ) : null}
        {status === "error" ? (
          <>
            <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
              {message}
            </p>
            <Link
              href="/login"
              className="mt-6 block text-center text-sm font-medium text-sky-700 hover:underline dark:text-sky-400"
            >
              {t("verifyEmail.goLogin")}
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="login-page__backdrop relative flex flex-1 items-center justify-center px-6 py-16">
          <p className="text-sm text-zinc-500">…</p>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
