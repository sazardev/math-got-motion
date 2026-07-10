import type { Formula } from "../../domain/formula.types";
import type { Locale } from "../../i18n/locale";
import "./FormulaMenu.css";

interface FormulaMenuProps {
  formulas: Formula[];
  activeId: string;
  locale: Locale;
  label: string;
  onSelect: (id: string) => void;
}

export function FormulaMenu({ formulas, activeId, locale, label, onSelect }: FormulaMenuProps) {
  return (
    <nav className="formula-menu" aria-label={label}>
      {formulas.map((formula) => (
        <button
          key={formula.id}
          type="button"
          className="formula-menu__item"
          aria-current={formula.id === activeId}
          onClick={() => {
            onSelect(formula.id);
          }}
        >
          {formula.title[locale]}
        </button>
      ))}
    </nav>
  );
}
