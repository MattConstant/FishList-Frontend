import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { LandingReveal } from "@/components/home-landing/landing-reveal";
import { HOME_PREVIEW_SLIDES } from "@/lib/home-preview-slides";
import { label, type LandingLabels } from "@/lib/landing-labels";
import { trackUsage } from "@/lib/usage-tracking";

const HOME_LANDING_FOOTER_CLASS =
  "border-zinc-200/90 text-zinc-600 [&_a]:text-sky-700 [&_a:hover]:text-sky-900 [&_p]:text-zinc-500 dark:border-white/25 dark:text-zinc-300 dark:[&_a]:text-sky-200 dark:[&_a:hover]:text-white dark:[&_p]:text-zinc-500";

/** Organic corner blobs (HubSpot-grader style) for the dark hero and CTA bands. */
function BlobCluster({ corner }: { corner: "tl" | "br" }) {
  return (
    <svg
      className={`home-landing__blob home-landing__blob--${corner}`}
      width="520"
      height="520"
      viewBox="0 0 520 520"
      fill="none"
      aria-hidden
    >
      {corner === "tl" ? (
        <>
          <path
            d="M118 -60C210 -48 268 22 250 108C234 186 158 218 84 196C6 173 -50 106 -34 24C-20 -46 40 -70 118 -60Z"
            fill="url(#hl-blob-sky)"
          />
          <path
            d="M290 -120C356 -104 392 -40 372 26C354 86 296 112 240 96C180 78 142 22 158 -40C172 -94 232 -134 290 -120Z"
            fill="url(#hl-blob-teal)"
            opacity="0.9"
          />
          <path
            d="M-40 190C20 176 78 212 88 268C97 320 58 366 2 372C-56 378 -108 340 -112 284C-116 232 -96 202 -40 190Z"
            fill="url(#hl-blob-ice)"
            opacity="0.95"
          />
        </>
      ) : (
        <>
          <path
            d="M402 520C310 508 252 438 270 352C286 274 362 242 436 264C514 287 570 354 554 436C540 506 480 530 402 520Z"
            fill="url(#hl-blob-sky)"
          />
          <path
            d="M232 580C166 564 130 500 150 434C168 374 226 348 282 364C342 382 380 438 364 500C350 554 290 594 232 580Z"
            fill="url(#hl-blob-deep)"
            opacity="0.9"
          />
          <path
            d="M560 330C500 344 442 308 432 252C423 200 462 154 518 148C576 142 628 180 632 236C636 288 616 318 560 330Z"
            fill="url(#hl-blob-teal)"
            opacity="0.95"
          />
        </>
      )}
      <defs>
        <linearGradient id="hl-blob-sky" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#7dd3fc" />
        </linearGradient>
        <linearGradient id="hl-blob-teal" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#14b8a6" />
          <stop offset="1" stopColor="#5eead4" />
        </linearGradient>
        <linearGradient id="hl-blob-ice" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#bae6fd" />
          <stop offset="1" stopColor="#e0f2fe" />
        </linearGradient>
        <linearGradient id="hl-blob-deep" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#0369a1" />
          <stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function StarRow({ className }: { className?: string }) {
  return (
    <span className={`home-landing__stars ${className ?? ""}`.trim()} aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.2-5.9 3.2 1.2-6.5L2.5 9.4l6.6-.9z" />
        </svg>
      ))}
    </span>
  );
}

function MapPinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
      <path d="M4 12.5l5.5 5.5L20 6.5" />
    </svg>
  );
}

function SectionHeader({
  title,
  titleAccent,
  lede,
}: {
  title: string;
  titleAccent?: string;
  lede?: string;
}) {
  return (
    <div className="home-landing__section-header">
      <h2 className="home-landing__section-title">
        {title}
        {titleAccent ? (
          <>
            {" "}
            <span className="home-landing__accent">{titleAccent}</span>
          </>
        ) : null}
      </h2>
      {lede ? <p className="home-landing__section-lede">{lede}</p> : null}
    </div>
  );
}

function TestimonialCard({ quote, name, role }: { quote: string; name: string; role: string }) {
  return (
    <blockquote className="home-landing__quote-card">
      <StarRow className="home-landing__quote-stars" />
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

type Props = {
  labels: LandingLabels;
};

/** Marketing landing markup (server-renderable for fast LCP on `/`). */
export function HomeLandingContent({ labels }: Props) {
  const problems = [
    label(labels, "home.landing.problem.item1"),
    label(labels, "home.landing.problem.item2"),
    label(labels, "home.landing.problem.item3"),
  ];
  const mapPoints = [
    label(labels, "home.landing.map.point1"),
    label(labels, "home.landing.map.point2"),
    label(labels, "home.landing.map.point3"),
  ];
  const steps = [
    {
      title: label(labels, "home.landing.steps.s1Title"),
      body: label(labels, "home.landing.steps.s1Body"),
    },
    {
      title: label(labels, "home.landing.steps.s2Title"),
      body: label(labels, "home.landing.steps.s2Body"),
    },
    {
      title: label(labels, "home.landing.steps.s3Title"),
      body: label(labels, "home.landing.steps.s3Body"),
    },
  ];

  return (
    <div className="home-landing">
      {/* ── Hero: problem-led headline + one bright CTA, everything above the fold ── */}
      <section className="home-landing__hero">
        <BlobCluster corner="tl" />
        <BlobCluster corner="br" />

        <div className="home-landing__hero-inner">
          <h1 className="home-landing__hero-title">
            {label(labels, "home.landing.heroTitleLead")}{" "}
            <span className="home-landing__hero-accent">
              {label(labels, "home.landing.heroTitleAccent")}
            </span>
          </h1>

          <p className="home-landing__hero-sub">{label(labels, "home.landing.heroSub")}</p>

          <div className="home-landing__hero-cta">
            <Link
              href="/map"
              className="home-landing__btn-cta"
              onClick={() => trackUsage("landing_map_cta", "hero")}
            >
              <MapPinIcon />
              {label(labels, "home.landing.heroCta")}
            </Link>
            <p className="home-landing__hero-hint">{label(labels, "home.landing.heroHint")}</p>
          </div>

          <p className="home-landing__hero-secondary">
            {label(labels, "home.landing.heroSecondaryQ")}{" "}
            <Link href="/login" onClick={() => trackUsage("landing_signup_cta", "hero")}>
              {label(labels, "home.landing.heroSecondaryLink")}
            </Link>
          </p>
        </div>
      </section>

      {/* ── Problem: talk about the reader's Saturday, not the product ── */}
      <section className="home-landing__section">
        <LandingReveal>
          <SectionHeader
            title={label(labels, "home.landing.problem.titleLead")}
            titleAccent={label(labels, "home.landing.problem.titleAccent")}
          />
        </LandingReveal>
        <div className="home-landing__problem-grid">
          {problems.map((text, i) => (
            <LandingReveal key={text} delay={i * 90}>
              <div className={`home-landing__problem-card home-landing__problem-card--${i + 1}`}>
                <span className="home-landing__problem-mark" aria-hidden>
                  &ldquo;
                </span>
                <p>{text}</p>
              </div>
            </LandingReveal>
          ))}
        </div>
        <LandingReveal delay={200}>
          <p className="home-landing__problem-pivot">{label(labels, "home.landing.problem.pivot")}</p>
        </LandingReveal>
      </section>

      {/* ── Product proof: the actual map ── */}
      <section className="home-landing__section home-landing__section--map">
        <div className="home-landing__map-grid">
          <LandingReveal>
            <div className="home-landing__map-copy">
              <SectionHeader
                title={label(labels, "home.landing.map.titleLead")}
                titleAccent={label(labels, "home.landing.map.titleAccent")}
              />
              <ul className="home-landing__map-points">
                {mapPoints.map((point) => (
                  <li key={point}>
                    <span className="home-landing__map-check" aria-hidden>
                      <CheckIcon />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
              <Link
                href="/map"
                className="home-landing__btn-cta home-landing__btn-cta--sm"
                onClick={() => trackUsage("landing_map_cta", "map_section")}
              >
                <MapPinIcon />
                {label(labels, "home.landing.map.cta")}
              </Link>
            </div>
          </LandingReveal>
          <LandingReveal delay={120}>
            <Link
              href="/map"
              className="home-landing__map-shot"
              onClick={() => trackUsage("landing_map_cta", "map_screenshot")}
            >
              <Image
                src="/home1.png"
                alt={label(labels, "home.landing.map.imageAlt")}
                width={819}
                height={546}
                sizes="(max-width: 900px) 100vw, 50vw"
              />
            </Link>
          </LandingReveal>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="home-landing__section">
        <LandingReveal>
          <SectionHeader title={label(labels, "home.landing.steps.title")} />
        </LandingReveal>
        <div className="home-landing__steps-grid">
          {steps.map((step, i) => (
            <LandingReveal key={step.title} delay={i * 90}>
              <div className="home-landing__step">
                <span className="home-landing__step-num" aria-hidden>
                  0{i + 1}
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </LandingReveal>
          ))}
        </div>
      </section>

      {/* ── Social proof: real catch photos, scrapbook style ── */}
      <section className="home-landing__section">
        <LandingReveal>
          <SectionHeader
            title={label(labels, "home.landing.catches.titleLead")}
            titleAccent={label(labels, "home.landing.catches.titleAccent")}
            lede={label(labels, "home.landing.catches.lede")}
          />
        </LandingReveal>
        <div className="home-landing__catch-grid">
          {HOME_PREVIEW_SLIDES.map((slide, i) => (
            <LandingReveal key={slide.imageSrc} delay={(i % 3) * 90}>
              <figure className="home-landing__polaroid">
                <div className="home-landing__polaroid-photo">
                  <Image
                    src={slide.imageSrc}
                    alt={`${slide.species}, ${slide.location}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 360px"
                  />
                </div>
                <figcaption className="home-landing__polaroid-caption">
                  <span className="home-landing__polaroid-species">{slide.species}</span>
                  <span className="home-landing__polaroid-meta">
                    @{slide.username} · {slide.location}
                  </span>
                  <span className="home-landing__polaroid-engage" aria-hidden>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 21s-7.5-4.9-9.7-9.1C.6 8.6 2.6 5 6.2 5c2.1 0 3.6 1.1 4.5 2.6h2.6C14.2 6.1 15.7 5 17.8 5c3.6 0 5.6 3.6 3.9 6.9C19.5 16.1 12 21 12 21Z" />
                    </svg>
                    {slide.likes}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a8 8 0 0 1-8 8H4l2.3-2.9A8 8 0 1 1 21 12Z" />
                    </svg>
                    {slide.comments}
                  </span>
                </figcaption>
              </figure>
            </LandingReveal>
          ))}
        </div>
      </section>

      {/* ── Testimonials with star ratings ── */}
      <section className="home-landing__section">
        <LandingReveal>
          <SectionHeader
            title={label(labels, "home.landing.testimonials.titleLead")}
            titleAccent={label(labels, "home.landing.testimonials.titleAccent")}
          />
        </LandingReveal>
        <div className="home-landing__quotes-grid">
          {([1, 2, 3] as const).map((n, i) => (
            <LandingReveal key={n} delay={i * 80}>
              <TestimonialCard
                quote={label(labels, `home.landing.quote${n}`)}
                name={label(labels, `home.landing.quote${n}By`)}
                role={label(labels, `home.landing.quote${n}Role`)}
              />
            </LandingReveal>
          ))}
        </div>
      </section>

      {/* ── Free means free ── */}
      <section className="home-landing__section">
        <LandingReveal>
          <div className="home-landing__free">
            <h2 className="home-landing__free-title">{label(labels, "home.landing.free.title")}</h2>
            <p className="home-landing__free-body">{label(labels, "home.landing.free.body")}</p>
            <Link
              href="/map"
              className="home-landing__free-link"
              onClick={() => trackUsage("landing_map_cta", "free_section")}
            >
              {label(labels, "home.landing.free.cta")}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </LandingReveal>
      </section>

      {/* ── Final CTA band ── */}
      <section className="home-landing__section">
        <LandingReveal>
          <div className="home-landing__cta-band">
            <BlobCluster corner="tl" />
            <BlobCluster corner="br" />
            <div className="home-landing__cta-inner">
              <h2 className="home-landing__cta-title">{label(labels, "home.landing.cta.title")}</h2>
              <p className="home-landing__cta-body">{label(labels, "home.landing.cta.body")}</p>
              <div className="home-landing__cta-actions">
                <Link
                  href="/map"
                  className="home-landing__btn-cta"
                  onClick={() => trackUsage("landing_map_cta", "footer")}
                >
                  <MapPinIcon />
                  {label(labels, "home.landing.cta.primary")}
                </Link>
                <Link
                  href="/login"
                  className="home-landing__btn-ghost"
                  onClick={() => trackUsage("landing_signup_cta", "footer")}
                >
                  {label(labels, "home.landing.cta.secondary")}
                </Link>
              </div>
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
