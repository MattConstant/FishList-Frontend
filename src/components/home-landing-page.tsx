"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { HomePreviewCarousel } from "@/components/home-preview-carousel";
import { useLocale } from "@/contexts/locale-context";

function SectionBlock({
  eyebrow,
  title,
  body,
  children,
  reverse,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14 lg:gap-x-20 xl:gap-x-24 2xl:gap-x-28">
      <div className={`space-y-3 ${reverse ? "md:order-2" : ""}`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400">
          {eyebrow}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 lg:text-3xl dark:text-zinc-50">
          {title}
        </h2>
        <p className="max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400 lg:text-lg">
          {body}
        </p>
      </div>
      <div
        className={`flex justify-center ${reverse ? "md:order-1 md:justify-start" : "md:justify-end"} lg:justify-center`}
      >
        <div className="w-full max-w-xl lg:max-w-none">{children}</div>
      </div>
    </div>
  );
}

export default function HomeLandingPage() {
  const { t } = useLocale();

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Hero: phone/tablet = one card; lg+ = open layout, full width */}
      <div className="mx-auto w-full max-w-6xl px-4 pt-10 pb-4 sm:px-6 sm:pt-14 sm:pb-6 lg:max-w-[min(96rem,calc(100%-3rem))] lg:px-10 xl:px-14 2xl:max-w-[min(112rem,calc(100%-4rem))] 2xl:px-16 lg:pt-16">
        <div
          className={[
            "relative isolate overflow-hidden",
            "max-lg:rounded-[1.75rem] max-lg:border max-lg:border-zinc-200/90 max-lg:bg-gradient-to-br max-lg:from-white max-lg:via-sky-50/40 max-lg:to-zinc-100/90 max-lg:shadow-[0_24px_60px_-14px_rgba(15,23,42,0.14)] max-lg:ring-1 max-lg:ring-white/70",
            "dark:max-lg:border-zinc-800 dark:max-lg:from-zinc-900 dark:max-lg:via-sky-950/30 dark:max-lg:to-zinc-950 dark:max-lg:shadow-[0_28px_70px_-18px_rgba(0,0,0,0.55)] dark:max-lg:ring-zinc-800/90",
            "lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none lg:ring-0",
          ].join(" ")}
        >
          <div
            className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl dark:bg-sky-500/15 max-lg:block lg:hidden"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-indigo-400/15 blur-3xl dark:bg-indigo-500/10 max-lg:block lg:hidden"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute right-0 top-1/2 hidden h-[120%] w-[55%] max-w-3xl -translate-y-1/2 rounded-full bg-gradient-to-bl from-sky-400/12 via-transparent to-indigo-400/10 blur-3xl dark:from-sky-500/10 dark:to-indigo-500/5 lg:block"
            aria-hidden
          />
          <div className="relative grid items-center gap-10 px-5 py-8 sm:gap-12 sm:px-8 sm:py-10 lg:grid-cols-12 lg:gap-12 lg:px-0 lg:py-4 xl:gap-16">
            <div className="flex flex-col justify-center space-y-5 text-center lg:col-span-5 lg:max-w-xl lg:text-left xl:max-w-2xl">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:items-start lg:justify-start">
                <Image
                  src="/ChatGPT%20Image%20Mar%2031%2C%202026%2C%2010_26_18%20PM.png"
                  alt={t("home.landing.logoAlt")}
                  width={192}
                  height={192}
                  className="h-20 w-20 shrink-0 rounded-2xl object-contain shadow-md ring-2 ring-white dark:ring-zinc-800 sm:h-24 sm:w-24 lg:h-28 lg:w-28"
                  priority
                />
              </div>
              <h1 className="text-balance text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl lg:text-5xl lg:leading-[1.06] xl:text-[3.15rem] dark:text-zinc-50">
                {t("home.heroTitle")}
              </h1>
              <p className="mx-auto max-w-lg text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-400 lg:mx-0 lg:max-w-none lg:text-xl">
                {t("home.heroBody")}
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-1 lg:justify-start">
                <Link
                  href="/login"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-sky-900/15 transition hover:bg-sky-700 dark:shadow-sky-950/40"
                >
                  {t("home.getStarted")}
                </Link>
                <Link
                  href="/map"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-300/90 bg-white/90 px-5 py-3 text-sm font-semibold text-zinc-800 shadow-sm backdrop-blur-sm transition hover:bg-white dark:border-zinc-600 dark:bg-zinc-900/80 dark:text-zinc-100 dark:hover:bg-zinc-800 lg:bg-white/80"
                >
                  {t("home.openMap")}
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7 lg:min-w-0">
              <div
                className={[
                  "relative",
                  "max-lg:overflow-hidden max-lg:rounded-2xl max-lg:border max-lg:border-white/90 max-lg:bg-white/90 max-lg:p-4 max-lg:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85)] max-lg:backdrop-blur-md",
                  "dark:max-lg:border-zinc-700/95 dark:max-lg:bg-zinc-900/80 dark:max-lg:shadow-none sm:max-lg:p-5",
                  "lg:border-l lg:border-zinc-200/80 lg:pl-10 xl:pl-14",
                  "dark:lg:border-zinc-800/90",
                ].join(" ")}
              >
                <div
                  className="absolute -inset-px rounded-2xl bg-gradient-to-br from-sky-500/25 via-sky-400/5 to-indigo-500/20 opacity-80 blur-2xl dark:from-sky-500/20 dark:opacity-60 max-lg:block lg:hidden"
                  aria-hidden
                />
                <div className="relative space-y-2 border-b border-zinc-200/80 pb-4 dark:border-zinc-700/80 max-lg:border-b sm:space-y-2.5 sm:pb-5 lg:space-y-3 lg:border-0 lg:pb-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                    {t("home.landing.feed.eyebrow")}
                  </p>
                  <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl lg:text-2xl">
                    {t("home.landing.feed.title")}
                  </h2>
                  <p className="max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 lg:text-base">
                    {t("home.landing.feed.body")}
                  </p>
                </div>
                <div className="max-lg:pt-1 lg:pt-6">
                  <HomePreviewCarousel variant="hero" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="mx-auto w-full max-w-6xl space-y-20 px-4 py-14 sm:px-6 sm:py-20 lg:max-w-[min(96rem,calc(100%-3rem))] lg:px-10 xl:max-w-[min(112rem,calc(100%-4rem))] xl:px-14 2xl:px-16">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 lg:text-3xl dark:text-zinc-50">
            {t("home.landing.featuresTitle")}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400 lg:max-w-3xl lg:text-lg">
            {t("home.landing.featuresSubtitle")}
          </p>
        </div>

        <SectionBlock
          eyebrow={t("home.landing.map.eyebrow")}
          title={t("home.landing.map.title")}
          body={t("home.landing.map.body")}
        >
          <figure className="w-full max-w-xl lg:max-w-none">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-700">
              <Image
                src="/home1.png"
                alt={t("home.landing.map.placeholderLabel")}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <figcaption className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-500">
              {t("home.landing.placeholderCaption")}
            </figcaption>
          </figure>
        </SectionBlock>

        <SectionBlock
          eyebrow={t("home.landing.catch.eyebrow")}
          title={t("home.landing.catch.title")}
          body={t("home.landing.catch.body")}
          reverse
        >
          <figure className="w-full max-w-xl lg:max-w-none">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-700">
              <Image
                src="/home2.png"
                alt={t("home.landing.catch.placeholderLabel")}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <figcaption className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-500">
              {t("home.landing.placeholderCaption")}
            </figcaption>
          </figure>
        </SectionBlock>

        <SectionBlock
          eyebrow={t("home.landing.social.eyebrow")}
          title={t("home.landing.social.title")}
          body={t("home.landing.social.body")}
        >
          <figure className="w-full max-w-xl lg:max-w-none">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-700">
              <Image
                src="/home3.png"
                alt={t("home.landing.social.placeholderLabel")}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <figcaption className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-500">
              {t("home.landing.placeholderCaption")}
            </figcaption>
          </figure>
        </SectionBlock>

        <div className="flex flex-wrap justify-center gap-3 pb-4">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            {t("home.getStarted")}
          </Link>
          <Link
            href="/map"
            className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            {t("home.openMap")}
          </Link>
        </div>
      </section>
    </div>
  );
}
