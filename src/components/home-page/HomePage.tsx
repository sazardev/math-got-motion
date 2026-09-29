import { useGSAP } from "@gsap/react";
import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";

import { findSummary, formulaIndex, type FormulaSummary } from "../../domain/formula-index";
import { useSeo } from "../../hooks/useSeo";
import { locales } from "../../i18n/locale";
import { useLocale } from "../../i18n/locale-context";
import { gsap } from "../../lib/gsap";
import { useLibrary } from "../../lib/library";
import { REPO_URL } from "../../lib/site";
import { FormulaCard } from "../formula-card/FormulaCard";
import "./HomePage.css";

const FLAGSHIP_ID = "euler-identity";

// Una probada representativa del catálogo — reconocibles y de dominios
// distintos. El resto se descubre en Explorar.
const FEATURED_IDS = [
  "pythagorean-theorem",
  "mass-energy-equivalence",
  "quadratic-formula",
  "schrodinger-equation",
  "golden-ratio",
  "newton-second-law",
];

const CATEGORY_PREVIEW = 8;

/** Fórmula del día: determinista por fecha, igual para todos ese día. */
function formulaOfTheDay(): FormulaSummary | undefined {
  const day = Math.floor(Date.now() / 86_400_000);
  return formulaIndex[day % formulaIndex.length];
}

export function HomePage() {
  const { locale, strings } = useLocale();
  const { recent } = useLibrary();

  const homeRef = useRef<HTMLElement>(null);
  const teaserRef = useRef<HTMLDivElement>(null);
  const teaserNodeRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const flagship = findSummary(FLAGSHIP_ID) ?? formulaIndex[0];
  const continueWith = findSummary(recent[0]);
  const daily = formulaOfTheDay();
  const recentList = recent
    .slice(1, 5)
    .map((id) => findSummary(id))
    .filter((summary): summary is FormulaSummary => !!summary);
  const featured = FEATURED_IDS.map((id) => findSummary(id)).filter(
    (summary): summary is FormulaSummary => !!summary,
  );

  const categories = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const summary of formulaIndex) {
      const entry = counts.get(summary.category.es);
      if (entry) entry.count += 1;
      else counts.set(summary.category.es, { label: summary.category[locale], count: 1 });
    }
    return [...counts.entries()]
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => b.count - a.count)
      .slice(0, CATEGORY_PREVIEW);
  }, [locale]);

  const steps = [
    { title: strings.homeStep1Title, text: strings.homeStep1Text },
    { title: strings.homeStep2Title, text: strings.homeStep2Text },
    { title: strings.homeStep3Title, text: strings.homeStep3Text },
    { title: strings.homeStep4Title, text: strings.homeStep4Text },
    { title: strings.homeStep5Title, text: strings.homeStep5Text },
  ];

  useSeo({
    locale,
    title: strings.homeNav,
    description: strings.homeDescription,
    path: `/${locale}/`,
    alternates: locales.map((altLocale) => ({ locale: altLocale, path: `/${altLocale}/` })),
  });

  useGSAP(
    () => {
      const els = teaserNodeRefs.current.filter((el): el is HTMLSpanElement => !!el);
      if (els.length === 0) return;

      const reduced = globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.fromTo(
        teaserRef.current,
        { opacity: 0, scale: 0.85 },
        { opacity: 1, scale: 1, duration: reduced ? 0.2 : 0.7, ease: "power3.out" },
      );
      if (reduced) return;

      // Loop autoplay del teaser — separación + convergencia, sin scroll
      // (DESIGN.md "Despegue"). Solo transform, y solo mientras se ve.
      const centerIndex = (els.length - 1) / 2;
      const spread = Math.min(38, 220 / els.length);
      const loop = gsap.timeline({ repeat: -1, repeatDelay: 0.7, delay: 0.8 });
      for (const [index, el] of els.entries()) {
        loop.to(
          el,
          { x: (index - centerIndex) * spread, scale: 1.08, duration: 1.1, ease: "power3.inOut" },
          0,
        );
      }
      loop.to(els, { x: 0, scale: 1, duration: 0.8, ease: "power2.inOut" }, "+=1.2");
    },
    { scope: homeRef, dependencies: [flagship?.id] },
  );

  return (
    <main className="app-page home" ref={homeRef} aria-label={strings.homeTitle}>
      <section className="home__hero">
        <div className="home__teaser fx-display" ref={teaserRef} aria-hidden="true">
          {flagship?.glyphs.map((glyph, index) => (
            <span
              key={index}
              ref={(el) => {
                teaserNodeRefs.current[index] = el;
              }}
              className={`home__teaser-node home__teaser-node--${glyph.type}`}
            >
              {glyph.value}
            </span>
          ))}
        </div>
        <h1 className="home__tagline">{strings.homeTagline}</h1>
        <Link className="home__search" to={`/${locale}/explore?focus=1`}>
          <span>{strings.exploreSearchLabel}</span>
          <kbd>/</kbd>
        </Link>
      </section>

      <div className="home__highlights">
        {continueWith && (
          <div className="home__highlight">
            <h2 className="app-section-title">{strings.homeContinue}</h2>
            <FormulaCard summary={continueWith} locale={locale} size="large" />
          </div>
        )}
        {daily && daily.id !== continueWith?.id && (
          <div className="home__highlight">
            <h2 className="app-section-title">{strings.homeDaily}</h2>
            <FormulaCard summary={daily} locale={locale} size="large" />
          </div>
        )}
      </div>

      {recentList.length > 0 && (
        <section>
          <h2 className="app-section-title">{strings.recentTitle}</h2>
          <div className="app-grid">
            {recentList.map((summary) => (
              <FormulaCard key={summary.id} summary={summary} locale={locale} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="app-section-title">{strings.homeCategoriesTitle}</h2>
        <div className="home__categories">
          {categories.map((category) => (
            <Link
              key={category.key}
              className="home__category"
              to={`/${locale}/explore?c=${encodeURIComponent(category.key)}`}
            >
              {category.label} <span>{category.count}</span>
            </Link>
          ))}
          <Link className="home__category home__category--all" to={`/${locale}/explore`}>
            {strings.homeSeeAll} →
          </Link>
        </div>
      </section>

      <section>
        <h2 className="app-section-title">{strings.homeFeaturedTitle}</h2>
        <div className="app-grid">
          {featured.map((summary) => (
            <FormulaCard key={summary.id} summary={summary} locale={locale} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="app-section-title">{strings.homeHowTitle}</h2>
        <ol className="home__steps">
          {steps.map((step, index) => (
            <li className="home__step" key={step.title}>
              <span className="home__step-number">{String(index + 1).padStart(2, "0")}</span>
              <span className="home__step-body">
                <span className="home__step-title">{step.title}</span>
                <span className="home__step-text">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="home__footer">
        <p className="home__footer-text">
          {strings.homeContributeText} {strings.homeStackText}
        </p>
        <a className="home__cta" href={REPO_URL} target="_blank" rel="noreferrer">
          {strings.homeContributeCta}
        </a>
      </footer>
    </main>
  );
}
