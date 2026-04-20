"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { HomePreviewCarousel } from "@/components/home-preview-carousel";
import { LandingImagePlaceholder } from "@/components/landing-image-placeholder";
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
    <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
      <div className={`space-y-3 ${reverse ? "md:order-2" : ""}`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400">
          {eyebrow}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </h2>
        <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">{body}</p>
      </div>
      <div
        className={`flex justify-center ${reverse ? "md:order-1 md:justify-start" : "md:justify-end"}`}
      >
        {children}
      </div>
    </div>
  );
}

export default function HomeLandingPage() {
  const { t } = useLocale();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Hero — solid background, no gradients */}
      <section className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-col items-center gap-10 md:flex-row md:items-start md:justify-between md:gap-12">
            <div className="max-w-xl space-y-4 text-center md:text-left">
              <p className="text-sm font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">
                {t("home.welcome")}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
                {t("home.heroTitle")}
              </h1>
              <p className="text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
                {t("home.heroBody")}
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2 md:justify-start">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                >
                  {t("home.getStarted")}
                </Link>
                <Link
                  href="/map"
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  {t("home.openMap")}
                </Link>
              </div>
            </div>
            <div className="shrink-0">
              <Image
                src="/ChatGPT%20Image%20Mar%2031%2C%202026%2C%2010_26_18%20PM.png"
                alt={t("home.landing.logoAlt")}
                width={200}
                height={200}
                className="h-36 w-36 rounded-2xl object-contain sm:h-44 sm:w-44"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl space-y-20 px-4 py-16 sm:px-6 sm:py-20">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t("home.landing.featuresTitle")}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
            {t("home.landing.featuresSubtitle")}
          </p>
        </div>

        <SectionBlock
          eyebrow={t("home.landing.map.eyebrow")}
          title={t("home.landing.map.title")}
          body={t("home.landing.map.body")}
        >
          <LandingImagePlaceholder
            label={t("home.landing.map.placeholderLabel")}
            caption={t("home.landing.placeholderCaption")}
          />
        </SectionBlock>

        <SectionBlock
          eyebrow={t("home.landing.catch.eyebrow")}
          title={t("home.landing.catch.title")}
          body={t("home.landing.catch.body")}
          reverse
        >
          <LandingImagePlaceholder
            label={t("home.landing.catch.placeholderLabel")}
            caption={t("home.landing.placeholderCaption")}
          />
        </SectionBlock>

        <SectionBlock
          eyebrow={t("home.landing.social.eyebrow")}
          title={t("home.landing.social.title")}
          body={t("home.landing.social.body")}
        >
          <LandingImagePlaceholder
            label={t("home.landing.social.placeholderLabel")}
            caption={t("home.landing.placeholderCaption")}
          />
        </SectionBlock>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400">
              {t("home.landing.feed.eyebrow")}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {t("home.landing.feed.title")}
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
              {t("home.landing.feed.body")}
            </p>
          </div>
          <HomePreviewCarousel />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400">
            {t("about.kicker")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t("about.title")}
          </h2>
          <div className="mt-6 space-y-4 text-left text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            <p>{t("about.p1")}</p>
            <p>{t("about.p2")}</p>
            <p>{t("about.p3")}</p>
          </div>
        </div>

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
