"use client";

import Link from "next/link";
import Image from "next/image";
import { useLocale } from "@/contexts/locale-context";

export default function AboutPage() {
  const { t } = useLocale();
  return (
    <div
      className="relative flex w-full min-h-full flex-col px-4 py-10 sm:px-6 sm:py-16"
      style={{
        backgroundImage:
          "linear-gradient(rgba(15,23,42,0.58), rgba(15,23,42,0.72)), url('/Quetico_NorthernLights-scaled.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "scroll",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(56,189,248,0.24),transparent_35%),radial-gradient(circle_at_80%_84%,rgba(34,197,94,0.16),transparent_35%)]" />

      <article className="relative z-10 mx-auto w-full max-w-4xl rounded-3xl border border-white/40 bg-white/88 p-6 shadow-2xl backdrop-blur md:p-10 dark:border-zinc-700 dark:bg-zinc-900/88">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700 dark:border-sky-700/70 dark:bg-sky-900/30 dark:text-sky-300">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M10 2a.75.75 0 01.706.497l1.23 3.445 3.664.13a.75.75 0 01.427 1.338l-2.88 2.203 1.008 3.524a.75.75 0 01-1.144.829L10 12.6l-3.011 1.366a.75.75 0 01-1.144-.829l1.008-3.524-2.88-2.203a.75.75 0 01.427-1.337l3.664-.131 1.23-3.445A.75.75 0 0110 2z" />
          </svg>
          {t("about.kicker")}
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl dark:text-zinc-50">
          {t("about.title")}
        </h1>
        <div className="mt-4">
          <Image
            src="/ChatGPT%20Image%20Mar%2031%2C%202026%2C%2010_26_18%20PM.png"
            alt="FishList logo"
            width={88}
            height={88}
            className="rounded-xl"
            priority
          />
        </div>

        <div className="mt-6 space-y-5 text-zinc-700 dark:text-zinc-300">
          <p className="text-sm leading-7 md:text-base">{t("about.p1")}</p>
          <p className="text-sm leading-7 md:text-base">{t("about.p2")}</p>
          <p className="text-sm leading-7 md:text-base">{t("about.p3")}</p>
        </div>

        <section className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-700">
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-sky-600 dark:text-sky-400">
              <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.145c.182-.1.42-.244.697-.424a16.293 16.293 0 002.278-1.885C15.57 14.587 18 11.512 18 8A8 8 0 002 8c0 3.512 2.43 6.587 4.41 8.468a16.293 16.293 0 002.278 1.885 10.41 10.41 0 00.978.569l.018.008.006.003zM10 11a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            {t("about.card.local.title")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
            {t("about.card.local.body")}
          </p>

          <h2 className="mt-5 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-rose-500 dark:text-rose-400">
              <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 015.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
            </svg>
            {t("about.card.memories.title")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
            {t("about.card.memories.body")}
          </p>

          <h2 className="mt-5 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-emerald-600 dark:text-emerald-400">
              <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm3.707 7.707a1 1 0 00-1.414-1.414L9 11.586 7.707 10.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {t("about.card.feed.title")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
            {t("about.card.feed.body")}
          </p>
        </section>

        <section className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-700">
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-violet-600 dark:text-violet-400">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.84 8.84 0 01-3.796-.83L2 17l1.07-3.21A6.718 6.718 0 012 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9a1 1 0 100-2 1 1 0 000 2zm3 0a1 1 0 100-2 1 1 0 000 2zm4-1a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
            </svg>
            {t("about.community.title")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
            {t("about.community.geohub")}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="https://discord.gg/your-server-invite"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              title={t("about.community.discord.placeholder")}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="mr-1.5 h-4 w-4">
                <path d="M16.942 5.556A13.545 13.545 0 0013.61 4.5l-.16.321a12.07 12.07 0 00-3.45 0l-.16-.321a13.56 13.56 0 00-3.332 1.056C4.4 8.415 3.83 11.2 4.115 13.946a13.65 13.65 0 004.089 2.053l.331-.563a8.907 8.907 0 01-1.287-.612l.274-.2c2.48 1.16 5.168 1.16 7.618 0l.276.2c-.407.24-.838.444-1.289.612l.33.563a13.64 13.64 0 004.09-2.053c.334-3.195-.57-5.954-1.605-8.39zM8.678 12.27c-.747 0-1.36-.67-1.36-1.49 0-.82.6-1.49 1.36-1.49.768 0 1.37.677 1.36 1.49 0 .82-.6 1.49-1.36 1.49zm2.645 0c-.747 0-1.36-.67-1.36-1.49 0-.82.6-1.49 1.36-1.49.768 0 1.37.677 1.36 1.49 0 .82-.6 1.49-1.36 1.49z" />
              </svg>
              {t("about.community.discord")}
            </a>
            <a
              href="https://your-donation-page.example.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              title={t("about.community.donate.placeholder")}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="mr-1.5 h-4 w-4">
                <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 015.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
              </svg>
              {t("about.community.donate")}
            </a>
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/map"
            className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            {t("about.cta.map")}
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            {t("about.cta.home")}
          </Link>
        </div>
      </article>
    </div>
  );
}
