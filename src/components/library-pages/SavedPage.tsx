import { findSummary, type FormulaSummary } from "../../domain/formula-index";
import { useLocale } from "../../i18n/locale-context";
import { useLibrary } from "../../lib/library";
import { FormulaCard } from "../formula-card/FormulaCard";

function resolve(ids: string[]): FormulaSummary[] {
  return ids.map((id) => findSummary(id)).filter((summary): summary is FormulaSummary => !!summary);
}

/** Fórmulas guardadas y recientes — todo local, sin cuenta. */
export function SavedPage() {
  const { locale, strings } = useLocale();
  const { saved, recent } = useLibrary();
  const savedList = resolve(saved);
  const recentList = resolve(recent);

  return (
    <main className="app-page">
      <h1 className="app-page__title fx-display">{strings.savedTitle}</h1>

      {savedList.length === 0 ? (
        <p className="app-empty">{strings.savedEmpty}</p>
      ) : (
        <div className="app-grid">
          {savedList.map((summary) => (
            <FormulaCard key={summary.id} summary={summary} locale={locale} />
          ))}
        </div>
      )}

      <h2 className="app-section-title">{strings.recentTitle}</h2>
      {recentList.length === 0 ? (
        <p className="app-empty">{strings.recentEmpty}</p>
      ) : (
        <div className="app-grid">
          {recentList.map((summary) => (
            <FormulaCard key={summary.id} summary={summary} locale={locale} />
          ))}
        </div>
      )}
    </main>
  );
}
