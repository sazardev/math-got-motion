import { Link } from "react-router-dom";

import type { FormulaSummary } from "../../domain/formula-index";
import type { Locale } from "../../i18n/locale";
import "./FormulaCard.css";

interface FormulaCardProps {
  summary: FormulaSummary;
  locale: Locale;
  /** Variante grande (destacada) o compacta (listas/rejillas). */
  size?: "regular" | "large";
}

/** Tarjeta de una fórmula: sus glifos como vista previa, título y categoría. */
export function FormulaCard({ summary, locale, size = "regular" }: FormulaCardProps) {
  return (
    <Link
      to={`/${locale}/formula/${summary.id}`}
      className="formula-card"
      data-size={size}
      lang={locale}
    >
      <span className="formula-card__equation" aria-hidden="true">
        {summary.glyphs.map((glyph, index) => (
          <span key={index} className={`formula-card__glyph formula-card__glyph--${glyph.type}`}>
            {glyph.value}
          </span>
        ))}
      </span>
      <span className="formula-card__title">{summary.title[locale]}</span>
      <span className="formula-card__category">{summary.category[locale]}</span>
    </Link>
  );
}
