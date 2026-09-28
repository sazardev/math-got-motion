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
import { ExportPage } from "./components/export-page/ExportPage";
import { FormulaHero } from "./components/formula-hero/FormulaHero";
import { FormulaMenu } from "./components/formula-menu/FormulaMenu";
import { FxLayer } from "./components/fx/FxLayer";
import { HomePage } from "./components/home-page/HomePage";
import { NotFoundPage } from "./components/not-found/NotFoundPage";
import {
  FxPicker,
  LocalePicker,
  ThemePicker,
  TypePicker,
} from "./components/preference-pickers/PreferencePickers";
import { formulas } from "./domain/formulas";
import { detectInitialLocale, isLocale, type Locale } from "./i18n/locale";
import { useLocale } from "./i18n/locale-context";
import { LocaleProvider } from "./i18n/LocaleContext";
import { destroyLenis, initLenis } from "./lib/lenis";
import { PreferencesProvider } from "./preferences/PreferencesContext";

/** El contenido de "/:locale/formula/:formulaId" — la fórmula activa, o un id inexistente. */
function FormulaRouteContent() {
  const { locale } = useLocale();
  const { formulaId } = useParams<{ formulaId: string }>();
  const activeFormula = formulas.find((formula) => formula.id === formulaId);

  if (!activeFormula) return <NotFoundPage locale={locale} />;

  return <FormulaHero key={activeFormula.id} formula={activeFormula} />;
}

/** "/:locale/formula/:formulaId/export" — el exportador de wallpapers de esa fórmula. */
function ExportRouteContent() {
  const { locale } = useLocale();
  const { formulaId } = useParams<{ formulaId: string }>();
  const activeFormula = formulas.find((formula) => formula.id === formulaId);

  if (!activeFormula) return <NotFoundPage locale={locale} />;

  return <ExportPage key={activeFormula.id} formula={activeFormula} />;
}

/**
 * Menú + controles persistentes entre páginas de un mismo locale. Los
 * controles de preferencia muestran solo el valor activo y abren un
 * mini-menú (ver PreferencePickers); a la derecha, la navegación.
 */
function LocaleChrome() {
  const { locale, strings } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const { formulaId } = useParams<{ formulaId: string }>();
  const activeId = formulaId ?? formulas[0]?.id ?? "";
  const onExportPage = location.pathname.endsWith("/export");
  // El exportador solo tiene sentido con una fórmula activa (no en home ni
  // changelog), así que el acceso aparece únicamente en esas rutas.
  const formulaPath =
    formulaId && formulas.some((formula) => formula.id === formulaId)
      ? `/${locale}/formula/${formulaId}`
      : null;

  return (
    <>
      <FormulaMenu
        formulas={formulas}
        activeId={activeId}
        locale={locale}
        strings={strings}
        onSelect={(id) => {
          // Desde el exportador se cambia de fórmula sin salir de él.
          void navigate(`/${locale}/formula/${id}${onExportPage ? "/export" : ""}`);
        }}
      />

      <nav className="controls" aria-label={strings.settingsLabel}>
        <div className="controls__group">
          <FxPicker />
          <TypePicker />
          <ThemePicker />
          <LocalePicker />
        </div>
        <div className="controls__group">
          {formulaPath && (
            <button
              type="button"
              className="control-button"
              aria-current={onExportPage ? "page" : undefined}
              onClick={() => {
                void navigate(onExportPage ? formulaPath : `${formulaPath}/export`);
              }}
            >
              {onExportPage ? strings.formulaNav : strings.exportLabel}
            </button>
          )}
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
      </nav>

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
        <Route path="formula/:formulaId/export" element={<ExportRouteContent />} />
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
