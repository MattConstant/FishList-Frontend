"use client";

import Link from "next/link";
import Image from "next/image";
import { SiteFooter } from "@/components/site-footer";
import { useLocale } from "@/contexts/locale-context";

/**
 * Temporary contest page (runs until August 1st) linked from the About page.
 * Remove this route (and the contest locale files + About banner) once the contest ends.
 */
export default function ContestPage() {
  const { t } = useLocale();

  const steps = [
    { title: t("contest.how.step1.title"), body: t("contest.how.step1.body") },
    { title: t("contest.how.step2.title"), body: t("contest.how.step2.body") },
    { title: t("contest.how.step3.title"), body: t("contest.how.step3.body") },
  ];

  const terms = [
    t("contest.terms.item1"),
    t("contest.terms.item2"),
    t("contest.terms.item3"),
    t("contest.terms.item4"),
    t("contest.terms.item5"),
    t("contest.terms.item6"),
  ];

  return (
    // shrink-0 stops the app shell's flex column from squashing this page to viewport
    // height (the overflow-hidden hero would collapse first); main scrolls it instead.
    <div className="flex w-full min-h-full shrink-0 flex-col bg-white dark:bg-zinc-950">
      {/* Full-width hero band */}
      <section className="relative w-full overflow-hidden bg-gradient-to-br from-sky-600 via-sky-700 to-emerald-700 text-white">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(251,191,36,0.35),transparent_45%),radial-gradient(circle_at_10%_90%,rgba(255,255,255,0.12),transparent_40%)]"
          aria-hidden
        />
        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-10 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between md:py-20">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/95 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-950 shadow-sm">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path
                  fillRule="evenodd"
                  d="M5 2a1 1 0 011 1v1h1a3 3 0 013 3v1h2V7a3 3 0 013-3h1V3a1 1 0 112 0v1a3 3 0 01-3 3h-1v1a5.002 5.002 0 01-4 4.9V14h2a1 1 0 110 2h-2v1a1 1 0 11-2 0v-1H6a1 1 0 110-2h2v-3.1A5.002 5.002 0 014 8V7H3a3 3 0 01-3-3V3a1 1 0 112 0v1a1 1 0 001 1h1V3a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              {t("contest.badge")}
            </span>
            <h1 className="mt-5 max-w-3xl text-4xl font-extrabold tracking-tight md:text-5xl">
              {t("contest.title")}
            </h1>
            <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold backdrop-blur-sm md:text-base">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path
                  fillRule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clipRule="evenodd"
                />
              </svg>
              {t("contest.dates")}
            </p>
            <p className="mt-6 max-w-2xl text-base leading-8 text-sky-50 md:text-lg">
              {t("contest.lead")}
            </p>
          </div>
          <Image
            src="/contestbanner.png"
            alt="FishList fishing contest poster: register online, win $100, ends August 1st"
            width={576}
            height={1024}
            priority
            className="w-56 shrink-0 rotate-2 rounded-2xl shadow-2xl ring-4 ring-white/25 md:w-64"
          />
        </div>
      </section>

      {/* Prize */}
      <section className="mx-auto w-full max-w-5xl px-4 pt-10 sm:px-6 md:pt-14">
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-amber-300/70 bg-gradient-to-br from-amber-50 to-orange-50 p-6 sm:flex-row sm:items-center dark:border-amber-500/30 dark:from-amber-950/40 dark:to-orange-950/30">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-amber-950 shadow-md">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
              <path d="M9.375 3a1.875 1.875 0 000 3.75h1.875v4.5H3.375A1.875 1.875 0 011.5 9.375v-.75c0-1.036.84-1.875 1.875-1.875h3.193A3.375 3.375 0 0112 2.753a3.375 3.375 0 015.432 3.997h3.943c1.035 0 1.875.84 1.875 1.875v.75c0 1.036-.84 1.875-1.875 1.875H12.75v-4.5h1.875a1.875 1.875 0 10-1.875-1.875V6.75h-1.5V4.875C11.25 3.839 10.41 3 9.375 3zM11.25 12.75H3v6.75a2.25 2.25 0 002.25 2.25h6v-9zM12.75 12.75v9h6.75a2.25 2.25 0 002.25-2.25v-6.75h-9z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-amber-900 dark:text-amber-200">
              {t("contest.prize.title")}
            </h2>
            <p className="mt-1 text-base leading-7 text-amber-800/90 dark:text-amber-100/80">
              {t("contest.prize.body")}
            </p>
          </div>
        </div>
      </section>

      {/* How to enter */}
      <section className="mx-auto w-full max-w-5xl px-4 pt-12 sm:px-6 md:pt-16">
        <h2 className="text-2xl font-bold text-zinc-900 md:text-3xl dark:text-zinc-50">
          {t("contest.how.title")}
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-600 text-base font-bold text-white shadow-sm">
                {i + 1}
              </span>
              <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Terms */}
      <section className="mx-auto w-full max-w-5xl px-4 pt-12 sm:px-6 md:pt-16">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 md:p-8 dark:border-zinc-700 dark:bg-zinc-900/60">
          <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5 text-sky-600 dark:text-sky-400"
            >
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                clipRule="evenodd"
              />
            </svg>
            {t("contest.terms.title")}
          </h2>
          <ul className="mt-4 space-y-3">
            {terms.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm leading-7 text-zinc-700 md:text-base dark:text-zinc-300"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="mt-1.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                {item}
              </li>
            ))}
          </ul>
          <a
            href="https://discord.gg/NckGwqp4G"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M16.942 5.556A13.545 13.545 0 0013.61 4.5l-.16.321a12.07 12.07 0 00-3.45 0l-.16-.321a13.56 13.56 0 00-3.332 1.056C4.4 8.415 3.83 11.2 4.115 13.946a13.65 13.65 0 004.089 2.053l.331-.563a8.907 8.907 0 01-1.287-.612l.274-.2c2.48 1.16 5.168 1.16 7.618 0l.276.2c-.407.24-.838.444-1.289.612l.33.563a13.64 13.64 0 004.09-2.053c.334-3.195-.57-5.954-1.605-8.39zM8.678 12.27c-.747 0-1.36-.67-1.36-1.49 0-.82.6-1.49 1.36-1.49.768 0 1.37.677 1.36 1.49 0 .82-.6 1.49-1.36 1.49zm2.645 0c-.747 0-1.36-.67-1.36-1.49 0-.82.6-1.49 1.36-1.49.768 0 1.37.677 1.36 1.49 0 .82-.6 1.49-1.36 1.49z" />
            </svg>
            {t("contest.discord.cta")}
          </a>
        </div>
      </section>

      {/* Login / entry CTA */}
      <section className="mx-auto w-full max-w-5xl px-4 pt-12 sm:px-6 md:pt-16">
        <div className="rounded-2xl bg-gradient-to-r from-sky-600 to-emerald-600 p-6 text-white md:p-10">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold md:text-2xl">{t("contest.cta.title")}</h2>
              <p className="mt-2 max-w-xl text-sm leading-7 text-sky-50 md:text-base">
                {t("contest.cta.body")}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-sky-700 shadow-md transition hover:bg-sky-50"
              >
                {t("contest.cta.home")}
              </Link>
              <Link
                href="/map"
                className="inline-flex items-center justify-center rounded-xl border border-white/60 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {t("contest.cta.map")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Back link + brand mark */}
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-10 sm:px-6">
        <Link
          href="/about"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 transition hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          {t("contest.backToAbout")}
        </Link>
        <Image
          src="/logo.png"
          alt="FishList logo"
          width={44}
          height={44}
          className="rounded-lg"
        />
      </div>

      <div className="mx-auto mt-12 w-full max-w-5xl px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-6">
        <SiteFooter />
      </div>
    </div>
  );
}
