"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useLocale } from "@/contexts/locale-context";
import { getDisplayErrorMessage, verifyEmailToken } from "@/lib/api";

function VerifyEmailShell({
  status,
  message,
  title,
  workingLabel,
  goLoginLabel,
}: {
  status: "working" | "ok" | "error";
  message: string;
  title: string;
  workingLabel: string;
  goLoginLabel: string;
}) {
  return (
    <div className="login-page__backdrop relative flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-white/30 bg-white/90 p-8 shadow-xl backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{title}</h1>
        {status === "working" ? (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">{workingLabel}</p>
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
              {goLoginLabel}
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
              {goLoginLabel}
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}

function VerifyEmailWithToken({ token }: { token: string }) {
  const { t } = useLocale();
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
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
    <VerifyEmailShell
      status={status}
      message={message}
      title={t("verifyEmail.title")}
      workingLabel={t("verifyEmail.working")}
      goLoginLabel={t("verifyEmail.goLogin")}
    />
  );
}

function VerifyEmailContent() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  if (!token) {
    return (
      <VerifyEmailShell
        status="error"
        message={t("verifyEmail.missingToken")}
        title={t("verifyEmail.title")}
        workingLabel={t("verifyEmail.working")}
        goLoginLabel={t("verifyEmail.goLogin")}
      />
    );
  }

  return <VerifyEmailWithToken token={token} />;
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
