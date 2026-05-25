import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { HeroWaterCanvas } from "@/components/home-landing/hero-water-canvas";
import { LandingCoverflow } from "@/components/home-landing/landing-coverflow";
import { LandingReveal } from "@/components/home-landing/landing-reveal";
import { LandingStats } from "@/components/home-landing/landing-stats";
import { label, type LandingLabels } from "@/lib/landing-labels";

const HOME_LANDING_FOOTER_CLASS =
  "border-zinc-200/90 text-zinc-600 [&_a]:text-sky-700 [&_a:hover]:text-sky-900 [&_p]:text-zinc-500 dark:border-white/25 dark:text-zinc-300 dark:[&_a]:text-sky-200 dark:[&_a:hover]:text-white dark:[&_p]:text-zinc-500";

const SOLUTION_FEATURES = [
  {
    titleKey: "home.landing.solutions.col1Title",
    bodyKey: "home.landing.solutions.col1Body",
    image: "/home1.png",
    href: "/map",
  },
  {
    titleKey: "home.landing.solutions.col2Title",
    bodyKey: "home.landing.solutions.col2Body",
    image: "/home2.png",
    href: "/login",
  },
  {
    titleKey: "home.landing.solutions.col3Title",
    bodyKey: "home.landing.solutions.col3Body",
    image: "/home3.png",
    href: "/login",
  },
] as const;

/** Animated headline lines from the hero kicker (Map the water. Log the bite. Share the story.) */
const HERO_LINES = [
  ["Map", "the", "water."],
  ["Log", "the", "bite."],
  ["Share", "the", "story."],
] as const;

const TITLE_ACCENT_PHRASES = [
  "on Ontario water",
  "sur l'eau de l'Ontario",
  "on the water",
  "sur l'eau",
  "not another feed",
  "pas un autre fil",
] as const;

function splitTitleWithAccent(
  labels: LandingLabels,
  leadKey: string,
  accentKey: string,
  fallbackTitleKey: string,
): { lead: string; accent: string } {
  const lead = label(labels, leadKey);
  const accent = label(labels, accentKey);
  if (lead && accent) return { lead, accent };

  const full = label(labels, fallbackTitleKey);
  for (const phrase of TITLE_ACCENT_PHRASES) {
    const idx = full.toLowerCase().lastIndexOf(phrase.toLowerCase());
    if (idx >= 0) {
      return {
        lead: full.slice(0, idx).trim(),
        accent: full.slice(idx).trim(),
      };
    }
  }
  return { lead: full, accent: "" };
}

function FishGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={56}
      height={28}
      viewBox="0 0 120 60"
      fill="none"
      aria-hidden
    >
      <path
        d="M5 30 Q15 8 50 12 Q90 16 105 30 Q90 44 50 48 Q15 52 5 30 Z"
        fill="currentColor"
        opacity={0.35}
      />
      <path d="M105 30 L120 18 L120 42 Z" fill="currentColor" opacity={0.35} />
      <circle cx="92" cy="26" r="2.2" fill="currentColor" opacity={0.5} />
    </svg>
  );
}

function SolutionPackageCard({
  title,
  body,
  imageSrc,
  href,
  exploreLabel,
  learnMoreLabel,
}: {
  title: string;
  body: string;
  imageSrc: string;
  href: string;
  exploreLabel: string;
  learnMoreLabel: string;
}) {
  return (
    <article className="home-landing__package-card">
      <div className="home-landing__package-media">
        <Image src={imageSrc} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
      </div>
      <div className="flex flex-1 flex-col p-5 pt-4">
        <h3 className="home-landing__package-title">{title}</h3>
        <p className="home-landing__package-body">{body}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href={href} className="home-landing__package-cta">
            {exploreLabel}
          </Link>
          <Link href={href} className="home-landing__package-link">
            {learnMoreLabel}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

function TestimonialCard({ quote, name, role }: { quote: string; name: string; role: string }) {
  return (
    <blockquote className="home-landing__quote-card">
      <p className="flex-1 text-sm leading-relaxed">{quote}</p>
      <footer className="home-landing__quote-footer">
        <div className="home-landing__quote-avatar" aria-hidden>
          {name.slice(0, 1)}
        </div>
        <div>
          <cite className="not-italic text-sm font-semibold">{name}</cite>
          <p className="text-xs opacity-70">{role}</p>
        </div>
      </footer>
    </blockquote>
  );
}

function SectionHeader({
  eyebrow,
  title,
  titleAccent,
  lede,
}: {
  eyebrow: string;
  title: string;
  titleAccent?: string;
  lede?: string;
}) {
  return (
    <div className="home-landing__section-header">
      <div>
        <span className="home-landing__section-eyebrow">{eyebrow}</span>
        <h2 className="home-landing__section-title">
          {title}
          {titleAccent ? (
            <>
              {" "}
              <span className="home-landing__accent">{titleAccent}</span>
            </>
          ) : null}
        </h2>
      </div>
      {lede ? <p className="home-landing__section-lede">{lede}</p> : null}
    </div>
  );
}

type Props = {
  labels: LandingLabels;
  /** @deprecated Coverflow is built-in; slot kept for backwards compatibility. */
  carouselSlot?: ReactNode;
};

/** Marketing landing markup (server-renderable for fast LCP on `/`). */
export function HomeLandingContent({ labels }: Props) {
  const exploreLabel = label(labels, "home.landing.solutions.explore");
  const learnMoreLabel = label(labels, "home.landing.solutions.learnMore");
  const sectionPill = label(labels, "home.landing.section.pill");
  const featuresTitle = splitTitleWithAccent(
    labels,
    "home.landing.features.titleLead",
    "home.landing.features.titleAccent",
    "home.landing.bento.featuresTitle",
  );
  const whyFishListTitle = splitTitleWithAccent(
    labels,
    "home.landing.section.titleLead",
    "home.landing.section.titleAccent",
    "home.landing.section.title",
  );
  const testimonialsTitle = splitTitleWithAccent(
    labels,
    "home.landing.testimonials.titleLead",
    "home.landing.testimonials.titleAccent",
    "home.landing.testimonials.title",
  );

  let wordDelay = 0.15;
  const heroWords = HERO_LINES.map((line, lineIdx) => (
    <span
      key={`line-${lineIdx}`}
      className={`home-landing__hero-line${lineIdx === 1 ? " home-landing__hero-line--nowrap" : ""}`}
    >
      {line.map((word, wordIdx) => {
        const isAccent = word === "bite.";
        const delay = wordDelay;
        wordDelay += 0.08;
        return (
          <span
            key={`${lineIdx}-${word}`}
            className={`home-landing__hero-word${isAccent ? " home-landing__hero-word--accent" : ""}`}
            style={{ animationDelay: `${delay}s` }}
          >
            {word}
            {wordIdx < line.length - 1 ? "\u00a0" : null}
          </span>
        );
      })}
    </span>
  ));

  return (
    <div className="home-landing">
      <section className="home-landing__hero">
        <HeroWaterCanvas />
        <div className="home-landing__hero-decor home-landing__hero-decor--fish-1 text-sky-500">
          <FishGlyph />
        </div>
        <div className="home-landing__hero-decor home-landing__hero-decor--fish-2 text-sky-700">
          <FishGlyph />
        </div>
        <div className="home-landing__hero-decor home-landing__hero-decor--fish-3 text-sky-500">
          <FishGlyph />
        </div>

        <div className="home-landing__hero-inner">
          <div>
            <h1 className="home-landing__hero-title">{heroWords}</h1>

            <p className="home-landing__hero-sub">{label(labels, "home.landing.bento.subhead")}</p>
          </div>

          <div>
            <div className="home-landing__hero-cta">
              <Link href="/login" className="home-landing__btn-primary">
                {label(labels, "home.getStarted")}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
              <Link href="/map" className="home-landing__btn-secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12Z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                {label(labels, "home.openMap")}
              </Link>
            </div>
            <p className="home-landing__hero-foot">{label(labels, "home.landing.heroCtaHint")}</p>
          </div>
        </div>
      </section>

      <LandingStats />

      <section className="home-landing__section">
        <LandingReveal>
          <SectionHeader
            eyebrow={label(labels, "home.landing.features.pill")}
            title={featuresTitle.lead}
            titleAccent={featuresTitle.accent || undefined}
            lede={label(labels, "home.landing.features.lede")}
          />
        </LandingReveal>
        <div className="home-landing__package-grid">
          {SOLUTION_FEATURES.map((feature, i) => (
            <LandingReveal key={feature.titleKey} delay={i * 80} className="home-landing__package-reveal">
              <SolutionPackageCard
                title={label(labels, feature.titleKey)}
                body={label(labels, feature.bodyKey)}
                imageSrc={feature.image}
                href={feature.href}
                exploreLabel={exploreLabel}
                learnMoreLabel={learnMoreLabel}
              />
            </LandingReveal>
          ))}
        </div>
      </section>

      <section className="home-landing__section home-landing__section--carousel">
        <LandingReveal>
          <SectionHeader
            eyebrow={sectionPill}
            title={whyFishListTitle.lead}
            titleAccent={whyFishListTitle.accent || undefined}
            lede={label(labels, "home.landing.carousel.lede")}
          />
        </LandingReveal>
        <LandingReveal delay={120}>
          <LandingCoverflow />
        </LandingReveal>
      </section>

      <section className="home-landing__section">
        <LandingReveal>
          <SectionHeader
            eyebrow={label(labels, "home.landing.testimonials.pill")}
            title={testimonialsTitle.lead}
            titleAccent={testimonialsTitle.accent || undefined}
          />
        </LandingReveal>
        <div className="home-landing__quotes-grid">
          <LandingReveal delay={0}>
            <TestimonialCard
              quote={label(labels, "home.landing.quote1")}
              name={label(labels, "home.landing.quote1By")}
              role={label(labels, "home.landing.quote1Role")}
            />
          </LandingReveal>
          <LandingReveal delay={80}>
            <TestimonialCard
              quote={label(labels, "home.landing.quote2")}
              name={label(labels, "home.landing.quote2By")}
              role={label(labels, "home.landing.quote2Role")}
            />
          </LandingReveal>
          <LandingReveal delay={160}>
            <TestimonialCard
              quote={label(labels, "home.landing.quote3")}
              name={label(labels, "home.landing.quote3By")}
              role={label(labels, "home.landing.quote3Role")}
            />
          </LandingReveal>
        </div>
      </section>

      <section className="home-landing__section">
        <LandingReveal>
          <div className="home-landing__cta-band">
            <h2 className="home-landing__cta-title">{label(labels, "home.landing.ctaTitle")}</h2>
            <p className="home-landing__cta-body">{label(labels, "home.landing.ctaBody")}</p>
            <div className="home-landing__cta-actions">
              <Link href="/login" className="home-landing__cta-btn home-landing__cta-btn--primary">
                {label(labels, "home.getStarted")}
              </Link>
              <Link href="/map" className="home-landing__cta-btn home-landing__cta-btn--secondary">
                {label(labels, "home.openMap")}
              </Link>
            </div>
          </div>
        </LandingReveal>
      </section>

      <div className="home-landing__footer-wrap">
        <SiteFooter className={HOME_LANDING_FOOTER_CLASS} />
      </div>
    </div>
  );
}
