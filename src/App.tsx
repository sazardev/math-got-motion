import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";

import { AppShell } from "./components/app-shell/AppShell";
import { ExplorePage } from "./components/explore-page/ExplorePage";
import { FxLayer } from "./components/fx/FxLayer";
import { HomePage } from "./components/home-page/HomePage";
import { SavedPage } from "./components/library-pages/SavedPage";
import { SettingsPage } from "./components/library-pages/SettingsPage";
import { NotFoundPage } from "./components/not-found/NotFoundPage";
import { useFormula } from "./hooks/useFormula";
import { detectInitialLocale, isLocale, type Locale } from "./i18n/locale";
import { useLocale } from "./i18n/locale-context";
import { LocaleProvider } from "./i18n/LocaleContext";
import { destroyLenis, initLenis } from "./lib/lenis";
import { markRecent } from "./lib/library";
import { PreferencesProvider } from "./preferences/PreferencesContext";

// Las rutas pesadas (hero con GSAP, exportador de wallpapers/video, changelog)
// son chunks aparte: Home y Explorar arrancan sin descargarlas.
const FormulaHero = lazy(() =>
  import("./components/formula-hero/FormulaHero").then((m) => ({ default: m.FormulaHero })),
);
const ExportPage = lazy(() =>
  import("./components/export-page/ExportPage").then((m) => ({ default: m.ExportPage })),
);
const ChangelogPage = lazy(() =>
  import("./components/changelog-page/ChangelogPage").then((m) => ({ default: m.ChangelogPage })),
);

/** Pantalla mínima mientras llega el chunk de la fórmula (unos KB, casi instantáneo). */
function FormulaLoading() {
  const { strings } = useLocale();
  return (
    <p className="app-loading" role="status">
      {strings.loadingFormula}
    </p>
  );
}

/** El contenido de "/:locale/formula/:formulaId" — la fórmula activa, o un id inexistente. */
function FormulaRouteContent() {
  const { locale } = useLocale();
  const { formulaId } = useParams<{ formulaId: string }>();
  const state = useFormula(formulaId);

  useEffect(() => {
    if (state.status === "ready") markRecent(state.formula.id);
  }, [state]);

  if (state.status === "loading") return <FormulaLoading />;
  if (state.status === "missing") return <NotFoundPage locale={locale} />;

  return (
    <Suspense fallback={<FormulaLoading />}>
      <FormulaHero key={state.formula.id} formula={state.formula} />
    </Suspense>
  );
}

/** "/:locale/formula/:formulaId/export" — el exportador de wallpapers de esa fórmula. */
function ExportRouteContent() {
  const { locale } = useLocale();
  const { formulaId } = useParams<{ formulaId: string }>();
  const state = useFormula(formulaId);

  if (state.status === "loading") return <FormulaLoading />;
  if (state.status === "missing") return <NotFoundPage locale={locale} />;

  return (
    <Suspense fallback={<FormulaLoading />}>
      <ExportPage key={state.formula.id} formula={state.formula} />
    </Suspense>
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
      <AppShell />
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
        <Route path="explore" element={<ExplorePage />} />
        <Route path="saved" element={<SavedPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="formula/:formulaId" element={<FormulaRouteContent />} />
        <Route path="formula/:formulaId/export" element={<ExportRouteContent />} />
        <Route
          path="changelog"
          element={
            <Suspense fallback={<FormulaLoading />}>
              <ChangelogPage />
            </Suspense>
          }
        />
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
