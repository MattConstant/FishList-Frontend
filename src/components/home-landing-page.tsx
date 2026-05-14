"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { HomePreviewCarousel } from "@/components/home-preview-carousel";
import { useLocale } from "@/contexts/locale-context";

const FLOATING_SHADOW =
  "shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] dark:shadow-[0_24px_48px_-14px_rgb(0_0_0/0.55)]";

/** Decorative mock UI cards around the hero (lg+); sit on the page, not inside a white shell */
function FloatingCards() {
  return (
    <div
      className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block"
      aria-hidden
    >
      <div
        className={`absolute left-[3%] top-[10%] w-[13.5rem] -rotate-6 rounded-2xl border border-zinc-100 bg-white p-3 ${FLOATING_SHADOW} dark:border-white/10 dark:bg-zinc-950/80 dark:backdrop-blur-md`}
      >
        <div className="relative mb-2 aspect-[4/3] w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900">
          <Image src="/example1.webp" alt="" fill className="object-cover" sizes="200px" />
        </div>
        <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">@brookie_mike</p>
        <p className="text-[11px] text-zinc-500">Brook trout · Nipigon</p>
        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rose-500">
          <span aria-hidden>♥</span> 28
        </div>
      </div>

      <div
        className={`absolute right-[4%] top-[8%] w-[12rem] rotate-[7deg] rounded-2xl border border-zinc-100 bg-white p-4 ${FLOATING_SHADOW} dark:border-white/10 dark:bg-zinc-950/80 dark:backdrop-blur-md`}
      >
        <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">Trip</p>
        <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-white">Saturday dawn patrol</p>
        <p className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          5:30 AM · Lake access
        </p>
      </div>

      <div
        className={`absolute bottom-[12%] left-[5%] w-[14rem] rotate-[3deg] rounded-2xl border border-zinc-100 bg-white p-4 ${FLOATING_SHADOW} dark:border-white/10 dark:bg-zinc-950/80 dark:backdrop-blur-md`}
      >
        <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">Hotspots</p>
        <div className="mt-3 space-y-2">
          <div>
            <div className="flex justify-between text-[11px] text-zinc-600 dark:text-zinc-300">
              <span>Walleye</span>
              <span>82%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
              <div className="h-full w-[82%] rounded-full bg-sky-500" />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[11px] text-zinc-600 dark:text-zinc-300">
              <span>Steelhead</span>
              <span>64%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
              <div className="h-full w-[64%] rounded-full bg-amber-500" />
            </div>
          </div>
        </div>
      </div>

      <div
        className={`absolute bottom-[10%] right-[4%] w-[12rem] -rotate-[5deg] rounded-2xl border border-zinc-100 bg-white p-4 ${FLOATING_SHADOW} dark:border-white/10 dark:bg-zinc-950/80 dark:backdrop-blur-md`}
      >
        <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">Layers</p>
        <div className="mt-3 flex justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 dark:bg-sky-900/60">
            <svg className="h-6 w-6 text-sky-700 dark:text-sky-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/50">
            <svg className="h-6 w-6 text-emerald-700 dark:text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-900/50">
            <svg className="h-6 w-6 text-violet-700 dark:text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
        <p className="mt-3 text-center text-[10px] text-zinc-500">Map · Stocking · Friends</p>
      </div>
    </div>
  );
}

function SolutionIcon({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-inner dark:bg-amber-900/40 dark:text-amber-200">
      {children}
    </div>
  );
}

function TestimonialCard({
  quote,
  name,
  role,
}: {
  quote: string;
  name: string;
  role: string;
}) {
  return (
    <blockquote className="flex h-full flex-col rounded-3xl border border-zinc-100 bg-white p-6 shadow-[0_12px_40px_-18px_rgba(0,0,0,0.15)] dark:border-white/[0.08] dark:bg-zinc-950/55 dark:shadow-xl dark:shadow-black/40 dark:backdrop-blur-md">
      <p className="flex-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">{quote}</p>
      <footer className="mt-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-600 text-xs font-bold text-white">
          {name.slice(0, 1)}
        </div>
        <div>
          <cite className="not-italic text-sm font-semibold text-zinc-900 dark:text-white">{name}</cite>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{role}</p>
        </div>
      </footer>
    </blockquote>
  );
}

export default function HomeLandingPage() {
  const { t } = useLocale();

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-zinc-100 text-zinc-900 dark:bg-transparent dark:text-zinc-100">
      {/* Hero: full-width strip on the page (no nested “app shell” card) */}
      <section className="home-landing-dot-bg relative w-full px-4 pb-24 pt-10 sm:pb-28 sm:pt-14">
        <div className="relative mx-auto min-h-[400px] w-full max-w-7xl px-3 sm:min-h-[440px] sm:px-4 lg:min-h-[500px] lg:px-8">
          <FloatingCards />
          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-8 flex justify-center">
              <Image
                src="/fishlist-logo.png"
                alt={t("home.landing.logoAlt")}
                width={96}
                height={96}
                className="h-20 w-20 object-contain sm:h-24 sm:w-24"
                priority
              />
            </div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-300">
              {t("home.landing.heroKicker")}
            </p>
            <h1 className="text-balance text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl lg:text-[3.25rem] dark:text-white">
              <span className="block">{t("home.landing.bento.headlineLead")}</span>
              <span className="mt-1 block text-zinc-500 dark:text-zinc-400">
                {t("home.landing.bento.headlineAccent")}
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-zinc-600 dark:text-zinc-300">
              {t("home.landing.bento.subhead")}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-sky-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/25 transition hover:bg-sky-500 dark:shadow-sky-950/40"
              >
                {t("home.getStarted")}
              </Link>
              <Link
                href="/map"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-zinc-300/90 bg-white px-8 py-3.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-white/15 dark:bg-white/[0.07] dark:text-zinc-100 dark:shadow-none dark:backdrop-blur-sm dark:hover:bg-white/[0.12]"
              >
                {t("home.openMap")}
              </Link>
            </div>
            <p className="mx-auto mt-8 max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {t("home.landing.heroCtaHint")}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-3 pb-20 pt-2 sm:px-4 lg:px-8 lg:pb-24 lg:pt-4">
        {/* --- Solutions grid - map, catches, social, MNRF stocking, provincial locations, camps, achievements --- */}
        <section className="mx-auto mt-16 max-w-6xl px-2 text-center">
          <span className="inline-flex rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 shadow-sm dark:border-white/10 dark:bg-zinc-950/45 dark:text-zinc-400 dark:shadow-none dark:backdrop-blur-sm">
            {t("home.landing.solutions.pill")}
          </span>
          <h2 className="mt-6 text-balance text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            {t("home.landing.solutions.title")}
          </h2>
          <div className="mt-12 grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-3xl border border-zinc-100 bg-white p-7 text-center shadow-lg shadow-zinc-900/5 dark:border-white/[0.08] dark:bg-zinc-950/50 dark:shadow-xl dark:shadow-black/35 dark:backdrop-blur-md">
              <SolutionIcon>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </SolutionIcon>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{t("home.landing.solutions.col1")}</p>
            </div>
            <div className="rounded-3xl border border-zinc-100 bg-white p-7 text-center shadow-lg shadow-zinc-900/5 dark:border-white/[0.08] dark:bg-zinc-950/50 dark:shadow-xl dark:shadow-black/35 dark:backdrop-blur-md">
              <SolutionIcon>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </SolutionIcon>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{t("home.landing.solutions.col2")}</p>
            </div>
            <div className="rounded-3xl border border-zinc-100 bg-white p-7 text-center shadow-lg shadow-zinc-900/5 dark:border-white/[0.08] dark:bg-zinc-950/50 dark:shadow-xl dark:shadow-black/35 dark:backdrop-blur-md">
              <SolutionIcon>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </SolutionIcon>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{t("home.landing.solutions.col3")}</p>
            </div>
            <div className="rounded-3xl border border-zinc-100 bg-white p-7 text-center shadow-lg shadow-zinc-900/5 dark:border-white/[0.08] dark:bg-zinc-950/50 dark:shadow-xl dark:shadow-black/35 dark:backdrop-blur-md">
              <SolutionIcon>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </SolutionIcon>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{t("home.landing.solutions.col4")}</p>
            </div>
            <div className="rounded-3xl border border-zinc-100 bg-white p-7 text-center shadow-lg shadow-zinc-900/5 dark:border-white/[0.08] dark:bg-zinc-950/50 dark:shadow-xl dark:shadow-black/35 dark:backdrop-blur-md">
              <SolutionIcon>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </SolutionIcon>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{t("home.landing.solutions.col5")}</p>
            </div>
            <div className="rounded-3xl border border-zinc-100 bg-white p-7 text-center shadow-lg shadow-zinc-900/5 dark:border-white/[0.08] dark:bg-zinc-950/50 dark:shadow-xl dark:shadow-black/35 dark:backdrop-blur-md">
              <SolutionIcon>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </SolutionIcon>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{t("home.landing.solutions.col6")}</p>
            </div>
            <div className="flex justify-center md:col-span-2 lg:col-span-3">
              <div className="w-full max-w-md rounded-3xl border border-zinc-100 bg-white p-7 text-center shadow-lg shadow-zinc-900/5 dark:border-white/[0.08] dark:bg-zinc-950/50 dark:shadow-xl dark:shadow-black/35 dark:backdrop-blur-md lg:max-w-sm">
                <SolutionIcon>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </SolutionIcon>
                <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{t("home.landing.solutions.col7")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* --- Feed preview - text + carousel side by side on large screens --- */}
        <section className="mt-20 sm:mt-24" aria-labelledby="landing-feed-heading">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 lg:grid-cols-2 lg:items-center lg:gap-10 xl:gap-14">
            <div className="text-center lg:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-300">
                {t("home.landing.feed.eyebrow")}
              </p>
              <h2
                id="landing-feed-heading"
                className="mt-3 text-balance text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-white"
              >
                {t("home.landing.mockup.title")}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-zinc-600 dark:text-zinc-300">
                {t("home.landing.mockup.subtitle")}
              </p>
              <p className="mt-5 text-base leading-relaxed text-zinc-600 dark:text-zinc-300/90">
                {t("home.landing.feed.body")}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-zinc-500 dark:text-zinc-500/90">
                {t("home.landing.feed.carouselCaption")}
              </p>
            </div>
            <div className="flex w-full justify-center lg:justify-end">
              <div className="w-full max-w-[min(100%,22rem)] min-[480px]:max-w-[min(100%,24rem)] sm:max-w-[min(100%,26rem)] md:max-w-[min(100%,28rem)]">
                <HomePreviewCarousel variant="hero" align="center" richFooter />
              </div>
            </div>
          </div>
        </section>

        {/* --- Features bento grid --- */}
        <section className="mt-20 border-t border-zinc-200/90 px-0 py-12 dark:border-white/[0.06] sm:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-white/10 dark:bg-zinc-950/45 dark:text-zinc-400 dark:backdrop-blur-sm">
              {t("home.landing.bento.featuresPill")}
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
              {t("home.landing.bento.featuresTitle")}
            </h2>
            <p className="mt-4 text-lg text-zinc-500 dark:text-zinc-400">{t("home.landing.bento.featuresSub")}</p>
          </div>
          <div className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-2">
            <article className="group overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-md transition hover:shadow-lg dark:border-white/[0.08] dark:bg-zinc-950/50 dark:shadow-lg dark:shadow-black/30 dark:backdrop-blur-md dark:hover:border-white/[0.12]">
              <div className="relative aspect-[16/11] w-full bg-zinc-100 dark:bg-zinc-900">
                <Image
                  src="/home1.png"
                  alt={t("home.landing.map.placeholderLabel")}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.02]"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div className="p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
                  {t("home.landing.map.eyebrow")}
                </p>
                <h3 className="mt-2 text-xl font-bold text-zinc-900 dark:text-white">{t("home.landing.map.title")}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{t("home.landing.map.body")}</p>
              </div>
            </article>
            <article className="group overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-md transition hover:shadow-lg dark:border-white/[0.08] dark:bg-zinc-950/50 dark:shadow-lg dark:shadow-black/30 dark:backdrop-blur-md dark:hover:border-white/[0.12]">
              <div className="relative aspect-[16/11] w-full bg-zinc-100 dark:bg-zinc-900">
                <Image
                  src="/home2.png"
                  alt={t("home.landing.catch.placeholderLabel")}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.02]"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div className="p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
                  {t("home.landing.catch.eyebrow")}
                </p>
                <h3 className="mt-2 text-xl font-bold text-zinc-900 dark:text-white">{t("home.landing.catch.title")}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{t("home.landing.catch.body")}</p>
              </div>
            </article>
            <article className="group overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-md transition hover:shadow-lg md:col-span-2 dark:border-white/[0.08] dark:bg-zinc-950/50 dark:shadow-lg dark:shadow-black/30 dark:backdrop-blur-md dark:hover:border-white/[0.12] lg:col-span-1">
              <div className="relative aspect-[16/11] w-full bg-zinc-100 lg:aspect-auto lg:min-h-[200px] dark:bg-zinc-900">
                <Image
                  src="/home3.png"
                  alt={t("home.landing.social.placeholderLabel")}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.02] lg:object-center"
                  sizes="(max-width: 1024px) 100vw, 33vw"
                />
              </div>
              <div className="p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
                  {t("home.landing.social.eyebrow")}
                </p>
                <h3 className="mt-2 text-xl font-bold text-zinc-900 dark:text-white">{t("home.landing.social.title")}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{t("home.landing.social.body")}</p>
              </div>
            </article>
            <article className="flex flex-col justify-center rounded-3xl border border-sky-500/20 bg-gradient-to-br from-sky-600 to-indigo-700 p-8 text-white shadow-lg shadow-indigo-950/30 md:col-span-2 lg:col-span-1 dark:border-sky-400/15 dark:from-sky-700 dark:to-indigo-950 dark:shadow-xl dark:shadow-black/40">
              <p className="text-xs font-bold uppercase tracking-widest text-sky-100/90">FishList</p>
              <h3 className="mt-3 text-2xl font-bold leading-snug">{t("home.landing.featuresTitle")}</h3>
              <p className="mt-4 text-sm leading-relaxed text-sky-50/95">{t("home.landing.featuresSubtitle")}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2 sm:justify-start">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                  {t("nav.map")}
                </span>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                  {t("map.layers.stocking")}
                </span>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                  {t("home.title")}
                </span>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                  {t("nav.friends")}
                </span>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                  {t("achievements.section.title")}
                </span>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                  {t("home.landing.bento.chipCamp")}
                </span>
              </div>
            </article>
          </div>
        </section>

        {/* --- Testimonials --- */}
        <section className="mt-20">
          <div className="text-center">
            <span className="inline-flex rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 shadow-sm dark:border-white/10 dark:bg-zinc-950/45 dark:text-zinc-400 dark:shadow-none dark:backdrop-blur-sm">
              {t("home.landing.testimonials.pill")}
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {t("home.landing.testimonials.title")}
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <TestimonialCard quote={t("home.landing.quote1")} name={t("home.landing.quote1By")} role={t("home.landing.quote1Role")} />
            <TestimonialCard quote={t("home.landing.quote2")} name={t("home.landing.quote2By")} role={t("home.landing.quote2Role")} />
            <TestimonialCard quote={t("home.landing.quote3")} name={t("home.landing.quote3By")} role={t("home.landing.quote3Role")} />
          </div>
        </section>

        {/* --- Final CTA --- */}
        <section className="mt-20 border-t border-zinc-200/90 px-4 py-14 text-center dark:border-white/[0.06] sm:px-6">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">{t("home.landing.ctaTitle")}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-300/90">{t("home.landing.ctaBody")}</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-sky-600 px-10 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/20 transition hover:bg-sky-500 dark:shadow-sky-950/40"
            >
              {t("home.getStarted")}
            </Link>
            <Link
              href="/map"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-zinc-300 bg-white px-10 py-3.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-white/15 dark:bg-white/[0.07] dark:text-zinc-100 dark:shadow-none dark:backdrop-blur-sm dark:hover:bg-white/[0.12]"
            >
              {t("home.openMap")}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
