import { useGSAP } from "@gsap/react";
import { useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

import { formulas } from "../../domain/formulas";
import { useSeo } from "../../hooks/useSeo";
import { locales } from "../../i18n/locale";
import { useLocale } from "../../i18n/locale-context";
import { gsap, ScrollTrigger } from "../../lib/gsap";
import { REPO_URL } from "../../lib/site";
import "./HomePage.css";

import type { Formula } from "../../domain/formula.types";

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

// Una probada representativa del catálogo — reconocibles, de dominios
// distintos (matemática pura, física, estadística) — no la lista completa,
// que ya vive en el menú de fórmulas persistente.
const FEATURED_IDS = [
  "euler-identity",
  "pythagorean-theorem",
  "mass-energy-equivalence",
  "quadratic-formula",
  "schrodinger-equation",
  "golden-ratio",
];

function FormulaGlyphs({ formula }: { formula: Formula }) {
  return (
    <span className="home__featured-equation fx-display" aria-hidden="true">
      {formula.nodes.map((node) => (
        <span key={node.id} className={`home__featured-node home__featured-node--${node.type}`}>
          {node.value}
        </span>
      ))}
    </span>
  );
}

export function HomePage() {
  const { locale, strings } = useLocale();
  const navigate = useNavigate();

  const homeRef = useRef<HTMLElement>(null);
  const teaserRef = useRef<HTMLDivElement>(null);
  const teaserNodeRefs = useRef(new Map<string, HTMLSpanElement>());
  const statValueRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  const teaserFormula = formulas.find((formula) => formula.id === FLAGSHIP_ID) ?? formulas[0];
  const featuredFormulas = FEATURED_IDS.map((id) => formulas.find((formula) => formula.id === id))
    .filter((formula): formula is Formula => !!formula)
    .filter((formula) => formula.id !== teaserFormula?.id);

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

  useGSAP(
    () => {
      // Entrada: el teaser y el título/CTA aparecen con un golpe de escala,
      // no un simple fade — es lo primero que ve cualquiera que entra al sitio.
      const intro = gsap.timeline();
      intro
        .fromTo(
          teaserRef.current,
          { opacity: 0, scale: 0.75 },
          { opacity: 1, scale: 1, duration: 0.9, ease: "elastic.out(1, 0.6)" },
        )
        .fromTo(
          ".home__title, .home__tagline",
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: "power2.out" },
          "-=0.4",
        )
        .fromTo(
          ".home__enter",
          { opacity: 0, scale: 0.85 },
          { opacity: 0.92, scale: 1, duration: 0.5, ease: "back.out(2.2)" },
          "-=0.3",
        );

      // Loop autoplay del teaser — separación elástica + convergencia, sin
      // scroll (DESIGN.md "Despegue"), más un bamboleo continuo por símbolo
      // para que nunca se sienta estático entre ciclos. Solo transform.
      if (teaserFormula) {
        const els = teaserFormula.nodes
          .map((node) => teaserNodeRefs.current.get(node.id))
          .filter((el): el is HTMLSpanElement => !!el);

        if (els.length > 0) {
          const centerIndex = (els.length - 1) / 2;
          const loop = gsap.timeline({ repeat: -1, repeatDelay: 0.7, delay: 0.9 });
          for (const [index, el] of els.entries()) {
            const distance = index - centerIndex;
            loop.to(
              el,
              { x: distance * 38, scale: 1.08, duration: 1.15, ease: "elastic.out(1, 0.55)" },
              0,
            );
          }
          loop.to(els, { x: 0, scale: 1, duration: 0.8, ease: "power2.inOut" }, "+=1.2");

          for (const [index, el] of els.entries()) {
            gsap.to(el, {
              y: -6,
              duration: 1.6 + (index % 3) * 0.25,
              yoyo: true,
              repeat: -1,
              ease: "sine.inOut",
              delay: index * 0.08,
            });
          }
        }
      }

      // CTA con un pulso lento y sutil para atraer el ojo sin ser molesto.
      gsap.to(".home__enter", {
        scale: 1.045,
        duration: 1.5,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        delay: 1.6,
      });

      // Revelado por scroll: todo bloque marcado "home__reveal" entra con un
      // golpe de opacidad+traslación (y stagger interno donde aplica) al
      // acercarse al viewport, y se retrae si el usuario vuelve hacia
      // arriba — la página entera se siente viva al recorrerla, no solo el
      // primer tramo.
      const revealBlocks = gsap.utils.toArray<HTMLElement>(".home__reveal", homeRef.current);
      for (const block of revealBlocks) {
        const children = block.querySelectorAll(".home__reveal-item");
        const targets = children.length > 0 ? children : block;
        gsap.set(targets, { opacity: 0, y: 32 });

        ScrollTrigger.create({
          trigger: block,
          start: "top 85%",
          onEnter: () => {
            gsap.to(targets, {
              opacity: 1,
              y: 0,
              duration: 0.7,
              stagger: 0.1,
              ease: "back.out(1.6)",
            });
          },
          onLeaveBack: () => {
            gsap.to(targets, { opacity: 0, y: 32, duration: 0.35, stagger: 0.04 });
          },
        });
      }

      // Los números de las estadísticas cuentan hacia arriba con un golpe de
      // escala en vez de simplemente aparecer — el mismo lenguaje "escala
      // gigante" de SPEC.md aplicado a un contador, no solo a símbolos.
      ScrollTrigger.create({
        trigger: ".home__stats",
        start: "top 85%",
        once: true,
        onEnter: () => {
          for (const [index, stat] of stats.entries()) {
            const el = statValueRefs.current[index];
            if (!el) continue;
            gsap.fromTo(el, { scale: 0.6 }, { scale: 1, duration: 0.6, ease: "back.out(2.2)" });
            const counter = { value: 0 };
            gsap.to(counter, {
              value: stat.value,
              duration: 1.1,
              ease: "power2.out",
              onUpdate: () => {
                el.textContent = String(Math.round(counter.value)).padStart(2, "0");
              },
            });
          }
        },
      });
    },
    { scope: homeRef, dependencies: [teaserFormula, locale] },
  );

  return (
    <section className="home" ref={homeRef} aria-label={strings.homeTitle}>
      <div className="home__teaser fx-display" ref={teaserRef} aria-hidden="true">
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

      <p className="home__title fx-display">{strings.homeTitle}</p>
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

      <div className="home__featured home__reveal">
        <p className="home__section-title">{strings.homeFeaturedTitle}</p>
        <div className="home__featured-grid">
          {featuredFormulas.map((formula) => (
            <button
              key={formula.id}
              type="button"
              className="home__featured-card home__reveal-item"
              onClick={() => {
                void navigate(`/${locale}/formula/${formula.id}`);
              }}
            >
              <FormulaGlyphs formula={formula} />
              <span className="home__featured-title">{formula.title[locale]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="home__stats home__reveal">
        {stats.map((stat, index) => (
          <div className="home__stat home__reveal-item" key={stat.label}>
            <p
              className="home__stat-value"
              ref={(el) => {
                statValueRefs.current[index] = el;
              }}
            >
              {String(stat.value).padStart(2, "0")}
            </p>
            <p className="home__stat-label">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="home__section home__reveal">
        <p className="home__section-title">{strings.homeWhatTitle}</p>
        <p className="home__section-text">{strings.homeWhatText}</p>
      </div>

      <div className="home__section home__reveal">
        <p className="home__section-title">{strings.homeHowTitle}</p>
        <ol className="home__steps">
          {steps.map((step, index) => (
            <li className="home__step home__reveal-item" key={step.title}>
              <span className="home__step-number">{String(index + 1).padStart(2, "0")}</span>
              <span className="home__step-body">
                <span className="home__step-title">{step.title}</span>
                <span className="home__step-text">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="home__section home__reveal">
        <p className="home__section-title">{strings.homeLanguagesTitle}</p>
        <p className="home__languages">{locales.map((code) => LANGUAGE_NAMES[code]).join(" · ")}</p>
      </div>

      <footer className="home__footer">
        <p className="home__footer-text">
          {strings.homeContributeText} {strings.homeStackText}
        </p>
        <div className="home__footer-links">
          <a className="home__cta" href={REPO_URL} target="_blank" rel="noreferrer">
            {strings.homeContributeCta}
          </a>
          <Link className="home__back" to={`/${locale}/changelog`}>
            {strings.changelogNav}
          </Link>
        </div>
      </footer>
    </section>
  );
}
