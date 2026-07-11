import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

import { formulas } from "../../domain/formulas";
import { useSeo } from "../../hooks/useSeo";
import { locales } from "../../i18n/locale";
import { useLocale } from "../../i18n/locale-context";
import { gsap } from "../../lib/gsap";
import { REPO_URL } from "../../lib/site";
import "./HomePage.css";

// Nombres nativos (endónimos) — no se traducen por locale de vista: el
// nombre de un idioma se escribe igual sea cual sea el idioma en el que se
// está leyendo la página.
const LANGUAGE_NAMES: Record<string, string> = {
  es: "Español",
  en: "English",
  pt: "Português",
  fr: "Français",
  zh: "中文",
  ja: "日本語",
};

const FLAGSHIP_ID = "euler-identity";

export function HomePage() {
  const { locale, strings } = useLocale();
  const navigate = useNavigate();

  const teaserFormula = formulas.find((formula) => formula.id === FLAGSHIP_ID) ?? formulas[0];
  const teaserRef = useRef<HTMLDivElement>(null);
  const teaserNodeRefs = useRef(new Map<string, HTMLSpanElement>());

  const categoryCount = new Set(formulas.map((formula) => formula.category[locale])).size;

  const steps = [
    { title: strings.homeStep1Title, text: strings.homeStep1Text },
    { title: strings.homeStep2Title, text: strings.homeStep2Text },
    { title: strings.homeStep3Title, text: strings.homeStep3Text },
    { title: strings.homeStep4Title, text: strings.homeStep4Text },
    { title: strings.homeStep5Title, text: strings.homeStep5Text },
  ];

  const stats = [
    { value: formulas.length, label: strings.homeStatsFormulas },
    { value: categoryCount, label: strings.homeStatsCategories },
    { value: locales.length, label: strings.homeStatsLanguages },
  ];

  useSeo({
    locale,
    title: strings.homeNav,
    description: strings.homeDescription,
    path: `/${locale}/`,
    alternates: locales.map((altLocale) => ({ locale: altLocale, path: `/${altLocale}/` })),
  });

  // Teaser de bienvenida: la fórmula insignia se separa y vuelve a armarse
  // sola, en loop, sin scroll — un adelanto autoplay del mismo lenguaje
  // visual de deconstrucción que ofrece cada fórmula (DESIGN.md "Despegue").
  // Solo transform (x), nunca layout — misma regla que FormulaHero.
  useGSAP(
    () => {
      if (!teaserFormula) return;
      const els = teaserFormula.nodes
        .map((node) => teaserNodeRefs.current.get(node.id))
        .filter((el): el is HTMLSpanElement => !!el);
      if (els.length === 0) return;

      const centerIndex = (els.length - 1) / 2;
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8 });

      for (const [index, el] of els.entries()) {
        const distance = index - centerIndex;
        tl.to(el, { x: distance * 26, duration: 1.1, ease: "elastic.out(1, 0.6)" }, 0);
      }
      tl.to(els, { x: 0, duration: 0.8, ease: "power2.inOut" }, "+=1.1");

      return () => {
        tl.kill();
      };
    },
    { scope: teaserRef, dependencies: [teaserFormula, locale] },
  );

  return (
    <section className="home" aria-label={strings.homeTitle}>
      <div className="home__teaser" ref={teaserRef} aria-hidden="true">
        {teaserFormula?.nodes.map((node) => (
          <span
            key={node.id}
            ref={(el) => {
              if (el) teaserNodeRefs.current.set(node.id, el);
            }}
            className={`home__teaser-node home__teaser-node--${node.type}`}
          >
            {node.value}
          </span>
        ))}
      </div>

      <p className="home__title">{strings.homeTitle}</p>
      <p className="home__tagline">{strings.homeTagline}</p>

      <button
        type="button"
        className="home__enter"
        onClick={() => {
          if (teaserFormula) void navigate(`/${locale}/formula/${teaserFormula.id}`);
        }}
      >
        {strings.homeEnterCta}
      </button>

      <div className="home__stats">
        {stats.map((stat) => (
          <div className="home__stat" key={stat.label}>
            <p className="home__stat-value">{String(stat.value).padStart(2, "0")}</p>
            <p className="home__stat-label">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="home__section">
        <p className="home__section-title">{strings.homeWhatTitle}</p>
        <p className="home__section-text">{strings.homeWhatText}</p>
      </div>

      <div className="home__section">
        <p className="home__section-title">{strings.homeHowTitle}</p>
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
      </div>

      <div className="home__section">
        <p className="home__section-title">{strings.homeLanguagesTitle}</p>
        <p className="home__languages">{locales.map((code) => LANGUAGE_NAMES[code]).join(" · ")}</p>
      </div>

      <div className="home__section">
        <p className="home__section-title">{strings.homeStackTitle}</p>
        <p className="home__section-text">{strings.homeStackText}</p>
      </div>

      <div className="home__section">
        <p className="home__section-title">{strings.homeContributeTitle}</p>
        <p className="home__section-text">{strings.homeContributeText}</p>
        <a className="home__cta" href={REPO_URL} target="_blank" rel="noreferrer">
          {strings.homeContributeCta}
        </a>
      </div>

      <Link className="home__back" to={`/${locale}/changelog`}>
        {strings.changelogNav}
      </Link>
    </section>
  );
}
