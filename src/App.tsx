import { useEffect, useState } from "react";
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import { ChangelogPage } from "./components/changelog-page/ChangelogPage";
import { FormulaHero } from "./components/formula-hero/FormulaHero";
import { FormulaMenu } from "./components/formula-menu/FormulaMenu";
import { HomePage } from "./components/home-page/HomePage";
import { NotFoundPage } from "./components/not-found/NotFoundPage";
import { formulas } from "./domain/formulas";
import { detectInitialLocale, isLocale, locales, type Locale } from "./i18n/locale";
import { useLocale } from "./i18n/locale-context";
import { LocaleProvider } from "./i18n/LocaleContext";
import { destroyLenis, initLenis } from "./lib/lenis";

type Theme = "dark" | "light";

interface ThemeControlProps {
  theme: Theme;
  onToggleTheme: () => void;
}

/** El contenido de "/:locale/formula/:formulaId" — la fórmula activa, o un id inexistente. */
function FormulaRouteContent() {
  const { locale } = useLocale();
  const { formulaId } = useParams<{ formulaId: string }>();
  const activeFormula = formulas.find((formula) => formula.id === formulaId);

  if (!activeFormula) return <NotFoundPage locale={locale} />;

  return <FormulaHero key={activeFormula.id} formula={activeFormula} />;
}

/** Menú + controles de tema/idioma, persistentes entre fórmula/changelog dentro de un mismo locale. */
function LocaleChrome({ theme, onToggleTheme }: ThemeControlProps) {
  const { locale, setLocale, strings } = useLocale();
  const navigate = useNavigate();
  const { formulaId } = useParams<{ formulaId: string }>();
  const activeId = formulaId ?? formulas[0]?.id ?? "";

  return (
    <>
      <FormulaMenu
        formulas={formulas}
        activeId={activeId}
        locale={locale}
        strings={strings}
        onSelect={(id) => {
          void navigate(`/${locale}/formula/${id}`);
        }}
      />

      <div className="controls">
        <button type="button" className="control-button" onClick={onToggleTheme}>
          {theme === "dark" ? strings.themeToLight : strings.themeToDark}
        </button>
        <div className="control-locales">
          {locales.map((code) => (
            <button
              key={code}
              type="button"
              className="control-button control-button--locale"
              aria-current={code === locale}
              onClick={() => {
                setLocale(code);
              }}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="control-button"
          onClick={() => {
            void navigate(`/${locale}/`);
          }}
        >
          {strings.homeNav}
        </button>
        <button
          type="button"
          className="control-button"
          onClick={() => {
            void navigate(`/${locale}/changelog`);
          }}
        >
          {strings.changelogNav}
        </button>
      </div>

      <Outlet />
    </>
  );
}

/** Resuelve `:locale` de la URL a un Locale válido y controla la navegación al cambiar de idioma. */
function LocaleLayout({ theme, onToggleTheme }: ThemeControlProps) {
  const { locale: rawLocale } = useParams<{ locale: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  if (!rawLocale || !isLocale(rawLocale)) {
    return <Navigate to={`/${detectInitialLocale()}/`} replace />;
  }

  const handleLocaleChange = (nextLocale: Locale) => {
    if (nextLocale === rawLocale) return;
    // Conserva el resto de la ruta (/formula/x, /changelog) al cambiar de idioma.
    void navigate(`/${nextLocale}${location.pathname.slice(rawLocale.length + 1)}`);
  };

  return (
    <LocaleProvider locale={rawLocale} onLocaleChange={handleLocaleChange}>
      <LocaleChrome theme={theme} onToggleTheme={onToggleTheme} />
    </LocaleProvider>
  );
}

function AppRoutes() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    document.documentElement.dataset["theme"] = theme;
  }, [theme]);

  // Instancia única para toda la vida de la app — independiente de la
  // fórmula activa, ver src/lib/lenis.ts.
  useEffect(() => {
    initLenis();
    return destroyLenis;
  }, []);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to={`/${detectInitialLocale()}/`} replace />} />
      <Route path=":locale" element={<LocaleLayout theme={theme} onToggleTheme={toggleTheme} />}>
        <Route index element={<HomePage />} />
        <Route path="formula/:formulaId" element={<FormulaRouteContent />} />
        <Route path="changelog" element={<ChangelogPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function App() {
  return <AppRoutes />;
}

export default App;
