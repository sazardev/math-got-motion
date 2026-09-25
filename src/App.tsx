import { useEffect } from "react";
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
import { ExportPanel } from "./components/export-panel/ExportPanel";
import { FormulaHero } from "./components/formula-hero/FormulaHero";
import { FormulaMenu } from "./components/formula-menu/FormulaMenu";
import { FxLayer } from "./components/fx/FxLayer";
import { HomePage } from "./components/home-page/HomePage";
import { NotFoundPage } from "./components/not-found/NotFoundPage";
import { ThemePicker } from "./components/theme-picker/ThemePicker";
import { formulas } from "./domain/formulas";
import { detectInitialLocale, isLocale, locales, type Locale } from "./i18n/locale";
import { useLocale } from "./i18n/locale-context";
import { LocaleProvider } from "./i18n/LocaleContext";
import { destroyLenis, initLenis } from "./lib/lenis";
import { fxNames, typeNames, usePreferences } from "./preferences/preferences-context";
import { PreferencesProvider } from "./preferences/PreferencesContext";

/** El contenido de "/:locale/formula/:formulaId" — la fórmula activa, o un id inexistente. */
function FormulaRouteContent() {
  const { locale } = useLocale();
  const { formulaId } = useParams<{ formulaId: string }>();
  const activeFormula = formulas.find((formula) => formula.id === formulaId);

  if (!activeFormula) return <NotFoundPage locale={locale} />;

  return <FormulaHero key={activeFormula.id} formula={activeFormula} />;
}

/** Menú + controles de tema/estética/tipografía/export/idioma, persistentes entre fórmula/changelog dentro de un mismo locale. */
function LocaleChrome() {
  const { locale, setLocale, strings } = useLocale();
  const { fx, type, cycleFx, cycleType } = usePreferences();
  const navigate = useNavigate();
  const { formulaId } = useParams<{ formulaId: string }>();
  const activeId = formulaId ?? formulas[0]?.id ?? "";
  // El exportador solo tiene sentido con una fórmula activa (no en home ni
  // changelog), así que se monta únicamente en esa ruta.
  const exportFormula = formulaId
    ? formulas.find((formula) => formula.id === formulaId)
    : undefined;

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
        <button
          type="button"
          className="control-button"
          title={strings.fxLabel}
          aria-label={`${strings.fxLabel}: ${fxNames[fx]}`}
          onClick={cycleFx}
        >
          {strings.fxLabel}: {fxNames[fx]}
        </button>
        <button
          type="button"
          className="control-button"
          title={strings.typeLabel}
          aria-label={`${strings.typeLabel}: ${typeNames[type]}`}
          onClick={cycleType}
        >
          {strings.typeLabel}: {typeNames[type]}
        </button>
        <ThemePicker />
        {exportFormula && <ExportPanel formula={exportFormula} />}
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
function LocaleLayout() {
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
      <LocaleChrome />
    </LocaleProvider>
  );
}

function AppRoutes() {
  // Instancia única para toda la vida de la app — independiente de la
  // fórmula activa, ver src/lib/lenis.ts.
  useEffect(() => {
    initLenis();
    return destroyLenis;
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Navigate to={`/${detectInitialLocale()}/`} replace />} />
      <Route path=":locale" element={<LocaleLayout />}>
        <Route index element={<HomePage />} />
        <Route path="formula/:formulaId" element={<FormulaRouteContent />} />
        <Route path="changelog" element={<ChangelogPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function App() {
  return (
    <PreferencesProvider>
      <AppRoutes />
      <FxLayer />
    </PreferencesProvider>
  );
}

export default App;
