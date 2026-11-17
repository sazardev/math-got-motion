import { Link } from "react-router-dom";

import { useSeo } from "../../hooks/useSeo";
import { locales } from "../../i18n/locale";
import { useLocale } from "../../i18n/locale-context";
import "./GuidePage.css";

/** Guía editorial: uso, atajos, personalización y tecnología, sin imágenes. */
export function GuidePage() {
  const { locale, strings } = useLocale();

  useSeo({
    locale,
    title: strings.guideTitle,
    description: strings.guideDescription,
    path: `/${locale}/guia`,
    alternates: locales.map((altLocale) => ({
      locale: altLocale,
      path: `/${altLocale}/guia`,
    })),
  });

  const cards = [
    { title: strings.guideReadTitle, text: strings.guideReadText },
    { title: strings.guideKeysTitle, text: strings.guideKeysText },
    { title: strings.guideCustomTitle, text: strings.guideCustomText },
    { title: strings.guideExportTitle, text: strings.guideExportText },
    { title: strings.guideCuriousTitle, text: strings.guideCuriousText },
    { title: strings.guideTechTitle, text: strings.guideTechText },
  ];

  return (
    <main className="app-page guide">
      <h1 className="app-page__title fx-display">{strings.guideTitle}</h1>
      <p className="app-page__lead">{strings.guideDescription}</p>

      <div className="guide__grid">
        {cards.map((card, index) => (
          <article className="guide__card" key={card.title}>
            <span className="guide__number" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h2 className="guide__title">{card.title}</h2>
            <p className="guide__text">{card.text}</p>
          </article>
        ))}
      </div>

      <footer className="guide__footer">
        <Link to={`/${locale}/colecciones`}>{strings.homeCollectionsCta} →</Link>
      </footer>
    </main>
  );
}
