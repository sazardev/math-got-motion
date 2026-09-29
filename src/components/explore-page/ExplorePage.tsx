import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { formulaIndex } from "../../domain/formula-index";
import { useSeo } from "../../hooks/useSeo";
import { locales } from "../../i18n/locale";
import { useLocale } from "../../i18n/locale-context";
import { searchFormulas } from "../../lib/search";
import { FormulaCard } from "../formula-card/FormulaCard";
import "./ExplorePage.css";

const PAGE_SIZE = 48;

export function ExplorePage() {
  const { locale, strings } = useLocale();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const category = params.get("c");
  const inputRef = useRef<HTMLInputElement>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);

  useSeo({
    locale,
    title: strings.navExplore,
    description: strings.homeDescription,
    path: `/${locale}/explore`,
    alternates: locales.map((altLocale) => ({
      locale: altLocale,
      path: `/${altLocale}/explore`,
    })),
  });

  // Categorías por cantidad de fórmulas; la clave estable es el nombre en `es`.
  const categories = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const summary of formulaIndex) {
      const entry = counts.get(summary.category.es);
      if (entry) entry.count += 1;
      else counts.set(summary.category.es, { label: summary.category[locale], count: 1 });
    }
    return [...counts.entries()]
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, locale));
  }, [locale]);

  const results = useMemo(
    () => searchFormulas(formulaIndex, locale, query, category),
    [locale, query, category],
  );

  // "/" o ⌘K llegan con ?focus=1; en táctil no se abre el teclado por sí solo.
  useEffect(() => {
    const wantsFocus = params.get("focus") === "1";
    const finePointer = globalThis.matchMedia("(pointer: fine)").matches;
    if (wantsFocus || finePointer) inputRef.current?.focus();
    // Solo al montar: escribir no debe volver a robar el foco.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (next: { q?: string; c?: string | null }) => {
    const merged = new URLSearchParams(params);
    merged.delete("focus");
    if (next.q !== undefined) {
      if (next.q) merged.set("q", next.q);
      else merged.delete("q");
    }
    if (next.c !== undefined) {
      if (next.c) merged.set("c", next.c);
      else merged.delete("c");
    }
    setParams(merged, { replace: true });
    setLimit(PAGE_SIZE);
  };

  const shown = results.slice(0, limit);

  return (
    <main className="app-page explore">
      <h1 className="app-page__title fx-display">{strings.navExplore}</h1>

      <input
        ref={inputRef}
        type="search"
        className="explore__search"
        value={query}
        placeholder={strings.exploreSearchLabel}
        aria-label={strings.exploreSearchLabel}
        enterKeyHint="search"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        onChange={(event) => {
          update({ q: event.target.value });
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          document.querySelector<HTMLElement>(".explore .formula-card")?.click();
        }}
      />

      <div className="explore__chips" role="group" aria-label={strings.homeCategoriesTitle}>
        <button
          type="button"
          className="explore__chip"
          aria-pressed={category === null}
          onClick={() => {
            update({ c: null });
          }}
        >
          {strings.exploreAll}
        </button>
        {categories.map((item) => (
          <button
            key={item.key}
            type="button"
            className="explore__chip"
            aria-pressed={category === item.key}
            onClick={() => {
              update({ c: category === item.key ? null : item.key });
            }}
          >
            {item.label} <span className="explore__chip-count">{item.count}</span>
          </button>
        ))}
      </div>

      <p className="explore__count" aria-live="polite">
        {results.length} {strings.exploreCountSuffix}
      </p>

      {results.length === 0 ? (
        <p className="app-empty">{strings.noResults}</p>
      ) : (
        <div className="app-grid">
          {shown.map((summary) => (
            <FormulaCard key={summary.id} summary={summary} locale={locale} />
          ))}
        </div>
      )}

      {shown.length < results.length && (
        <button
          type="button"
          className="explore__more"
          onClick={() => {
            setLimit((current) => current + PAGE_SIZE);
          }}
        >
          {strings.exploreShowMore}
        </button>
      )}
    </main>
  );
}
