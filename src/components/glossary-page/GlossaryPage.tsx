import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { formulaIndex, type FormulaSummary } from "../../domain/formula-index";
import { useSeo } from "../../hooks/useSeo";
import { locales } from "../../i18n/locale";
import { useLocale } from "../../i18n/locale-context";
import "./GlossaryPage.css";

interface SymbolEntry {
  value: string;
  types: string[];
  count: number;
  examples: FormulaSummary[];
}

/** Índice de símbolos derivado del catálogo: ninguna entrada se escribe a mano. */
function buildEntries(): SymbolEntry[] {
  const bySymbol = new Map<string, SymbolEntry>();

  for (const summary of formulaIndex) {
    const seen = new Set<string>();
    for (const glyph of summary.glyphs) {
      const value = glyph.value.trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);

      const existing = bySymbol.get(value);
      if (existing) {
        existing.count += 1;
        if (!existing.types.includes(glyph.type)) existing.types.push(glyph.type);
        if (existing.examples.length < 3) existing.examples.push(summary);
        continue;
      }
      bySymbol.set(value, {
        value,
        types: [glyph.type],
        count: 1,
        examples: [summary],
      });
    }
  }

  return [...bySymbol.values()].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export function GlossaryPage() {
  const { locale, strings } = useLocale();
  const [query, setQuery] = useState("");
  const entries = useMemo(() => buildEntries(), []);

  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return entries;
    return entries.filter(
      (entry) =>
        entry.value.toLocaleLowerCase().includes(needle) ||
        entry.types.some((type) => type.toLocaleLowerCase().includes(needle)),
    );
  }, [entries, query]);

  useSeo({
    locale,
    title: strings.glossaryTitle,
    description: strings.glossaryDescription,
    path: `/${locale}/glosario`,
    alternates: locales.map((altLocale) => ({
      locale: altLocale,
      path: `/${altLocale}/glosario`,
    })),
  });

  return (
    <main className="app-page glossary">
      <h1 className="app-page__title fx-display">{strings.glossaryTitle}</h1>
      <p className="app-page__lead">{strings.glossaryDescription}</p>

      <div className="glossary__field">
        <input
          type="search"
          className="glossary__search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          placeholder={strings.glossarySearchLabel}
          aria-label={strings.glossarySearchLabel}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <p className="glossary__count" aria-live="polite">
        {String(results.length)} {strings.glossaryCountSuffix}
      </p>

      <div className="glossary__grid">
        {results.map((entry) => (
          <article className="glossary__entry" key={entry.value}>
            <span className="glossary__symbol fx-display" aria-hidden="true">
              {entry.value}
            </span>
            <div className="glossary__meta">
              <span className="glossary__types">{entry.types.join(" · ")}</span>
              <span className="glossary__uses">
                {String(entry.count)} {strings.collectionsCountSuffix}
              </span>
              <span className="glossary__examples-label">{strings.glossaryExamples}</span>
              <div className="glossary__examples">
                {entry.examples.map((summary) => (
                  <Link key={summary.id} to={`/${locale}/formula/${summary.id}`}>
                    {summary.title[locale]}
                  </Link>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
