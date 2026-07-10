import { useEffect, useState } from "react";

import { FormulaHero } from "./components/formula-hero/FormulaHero";
import { FormulaMenu } from "./components/formula-menu/FormulaMenu";
import { formulas } from "./domain/formulas";
import { useLocale } from "./i18n/locale-context";
import { LocaleProvider } from "./i18n/LocaleContext";

type Theme = "dark" | "light";

function AppContent() {
  const { locale, setLocale, strings } = useLocale();
  const [theme, setTheme] = useState<Theme>("dark");
  const [activeId, setActiveId] = useState(formulas[0]?.id ?? "");

  useEffect(() => {
    document.documentElement.dataset["theme"] = theme;
  }, [theme]);

  const activeFormula = formulas.find((formula) => formula.id === activeId) ?? formulas[0];
  if (!activeFormula) return null;

  return (
    <>
      <FormulaMenu
        formulas={formulas}
        activeId={activeFormula.id}
        locale={locale}
        label={strings.menuTitle}
        onSelect={setActiveId}
      />

      <div className="controls">
        <button
          type="button"
          className="control-button"
          onClick={() => {
            setTheme((t) => (t === "dark" ? "light" : "dark"));
          }}
        >
          {theme === "dark" ? strings.themeToLight : strings.themeToDark}
        </button>
        <button
          type="button"
          className="control-button"
          onClick={() => {
            setLocale(locale === "es" ? "en" : "es");
          }}
        >
          {locale === "es" ? "EN" : "ES"}
        </button>
      </div>

      <FormulaHero key={activeFormula.id} formula={activeFormula} />
    </>
  );
}

function App() {
  return (
    <LocaleProvider>
      <AppContent />
    </LocaleProvider>
  );
}

export default App;
