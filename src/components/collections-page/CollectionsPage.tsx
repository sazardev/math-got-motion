import { Link } from "react-router-dom";

import { collections } from "../../domain/collections";
import { useSeo } from "../../hooks/useSeo";
import { locales } from "../../i18n/locale";
import { useLocale } from "../../i18n/locale-context";
import { FormulaCard } from "../formula-card/FormulaCard";
import "./CollectionsPage.css";

/** Recorridos editoriales sobre el catálogo: el mismo índice, otro orden de lectura. */
export function CollectionsPage() {
  const { locale, strings } = useLocale();

  useSeo({
    locale,
    title: strings.collectionsTitle,
    description: strings.collectionsDescription,
    path: `/${locale}/colecciones`,
    alternates: locales.map((altLocale) => ({
      locale: altLocale,
      path: `/${altLocale}/colecciones`,
    })),
  });

  return (
    <main className="app-page collections">
      <h1 className="app-page__title fx-display">{strings.collectionsTitle}</h1>
      <p className="app-page__lead">{strings.collectionsDescription}</p>

      <nav className="collections__index" aria-label={strings.collectionsTitle}>
        {collections.map((collection) => (
          <a key={collection.id} href={`#${collection.id}`}>
            <span aria-hidden="true">{collection.glyph}</span>
            {collection.name[locale]}
          </a>
        ))}
      </nav>

      {collections.map((collection, index) => (
        <section className="collection" id={collection.id} key={collection.id}>
          <header className="collection__header">
            <span className="collection__number" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="collection__glyph fx-display" aria-hidden="true">
              {collection.glyph}
            </span>
            <div className="collection__body">
              <h2 className="collection__title">{collection.name[locale]}</h2>
              <p className="collection__description">{collection.description[locale]}</p>
              <p className="collection__count">
                {String(collection.formulas.length)} {strings.collectionsCountSuffix}
              </p>
            </div>
          </header>
          <div className="app-grid">
            {collection.formulas.map((summary) => (
              <FormulaCard key={summary.id} summary={summary} locale={locale} />
            ))}
          </div>
        </section>
      ))}

      <footer className="collections__footer">
        <Link to={`/${locale}/glosario`}>{strings.homeGlossaryCta} →</Link>
      </footer>
    </main>
  );
}
