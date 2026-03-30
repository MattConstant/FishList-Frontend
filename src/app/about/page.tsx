"use client";

import Link from "next/link";
import { useLocale } from "@/contexts/locale-context";

export default function AboutPage() {
  const { t } = useLocale();
  return (
    <div
      className="relative flex flex-1 items-center justify-center px-6 py-16"
      style={{
        backgroundImage:
          "linear-gradient(rgba(15,23,42,0.62), rgba(15,23,42,0.62)), url('/Quetico_NorthernLights-scaled.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <article className="w-full max-w-4xl rounded-2xl border border-white/30 bg-white/90 p-8 shadow-xl backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
        <p className="text-sm font-medium uppercase tracking-wide text-sky-600 dark:text-sky-400">
          {t("about.kicker")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t("about.title")}
        </h1>

        <div className="mt-6 space-y-4 text-zinc-700 dark:text-zinc-300">
          <p>
            {t("about.p1")}
          </p>
          <p>
            {t("about.p2")}
          </p>
          <p>
            {t("about.p3")}
          </p>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/70">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {t("about.card.local.title")}
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {t("about.card.local.body")}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/70">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {t("about.card.memories.title")}
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {t("about.card.memories.body")}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/70">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {t("about.card.feed.title")}
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {t("about.card.feed.body")}
            </p>
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
            className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            {t("about.cta.home")}
          </Link>
        </div>
      </article>
    </div>
  );
}
