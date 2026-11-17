import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";

import { AppShell } from "./components/app-shell/AppShell";
import { ExplorePage } from "./components/explore-page/ExplorePage";
import { FxLayer } from "./components/fx/FxLayer";
import { HomePage } from "./components/home-page/HomePage";
import { SavedPage } from "./components/library-pages/SavedPage";
import { SettingsPage } from "./components/library-pages/SettingsPage";
import { LoadingStage } from "./components/loading/LoadingStage";
import { NotFoundPage } from "./components/not-found/NotFoundPage";
import { useFormula } from "./hooks/useFormula";
import { detectInitialLocale, isLocale, type Locale } from "./i18n/locale";
import { useLocale } from "./i18n/locale-context";
import { LocaleProvider } from "./i18n/LocaleContext";
import { destroyLenis, initLenis } from "./lib/lenis";
import { markRecent } from "./lib/library";
import { prefetchNeighbors } from "./lib/prefetch";
import {
  loadChangelogPageChunk,
  loadCollectionsPageChunk,
  loadExportPageChunk,
  loadFormulaHeroChunk,
  loadGlossaryPageChunk,
  loadGuidePageChunk,
} from "./lib/route-loader";
import { PreferencesProvider } from "./preferences/PreferencesContext";

// Las rutas pesadas (hero con GSAP, exportador de wallpapers/video, changelog)
// son chunks aparte: Home y Explorar arrancan sin descargarlas.
const FormulaHero = lazy(() => loadFormulaHeroChunk().then((m) => ({ default: m.FormulaHero })));
const ExportPage = lazy(() => loadExportPageChunk().then((m) => ({ default: m.ExportPage })));
const ChangelogPage = lazy(() =>
  loadChangelogPageChunk().then((m) => ({ default: m.ChangelogPage })),
);
const CollectionsPage = lazy(() =>
  loadCollectionsPageChunk().then((m) => ({ default: m.CollectionsPage })),
);
const GlossaryPage = lazy(() => loadGlossaryPageChunk().then((m) => ({ default: m.GlossaryPage })));
const GuidePage = lazy(() => loadGuidePageChunk().then((m) => ({ default: m.GuidePage })));

/** El contenido de "/:locale/formula/:formulaId" — la fórmula activa, o un id inexistente. */
function FormulaRouteContent() {
  const { locale } = useLocale();
  const { formulaId } = useParams<{ formulaId: string }>();
  const state = useFormula(formulaId);

  useEffect(() => {
    if (state.status !== "ready") return;
    markRecent(state.formula.id);
    // Swipe/flechas recorren la categoría: las vecinas se descargan en idle
    // para que el cambio de fórmula no tenga que esperar al YAML.
    return prefetchNeighbors(state.formula.id, locale);
  }, [state, locale]);

  if (state.status === "loading") {
    return <LoadingStage variant="formula" formulaId={formulaId} formulaReady={false} />;
  }
  if (state.status === "missing") return <NotFoundPage locale={locale} />;

  return (
    <Suspense fallback={<LoadingStage variant="formula" formulaId={formulaId} formulaReady />}>
      <FormulaHero key={state.formula.id} formula={state.formula} />
    </Suspense>
  );
}

/** "/:locale/formula/:formulaId/export" — el exportador de wallpapers de esa fórmula. */
function ExportRouteContent() {
  const { locale } = useLocale();
  const { formulaId } = useParams<{ formulaId: string }>();
  const state = useFormula(formulaId);

  if (state.status === "loading") {
    return <LoadingStage variant="export" formulaId={formulaId} formulaReady={false} />;
  }
  if (state.status === "missing") return <NotFoundPage locale={locale} />;

  return (
    <Suspense fallback={<LoadingStage variant="export" formulaId={formulaId} formulaReady />}>
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
        <Route
          path="colecciones"
          element={
            <Suspense fallback={<LoadingStage variant="light" />}>
              <CollectionsPage />
            </Suspense>
          }
        />
        <Route
          path="glosario"
          element={
            <Suspense fallback={<LoadingStage variant="light" />}>
              <GlossaryPage />
            </Suspense>
          }
        />
        <Route
          path="guia"
          element={
            <Suspense fallback={<LoadingStage variant="light" />}>
              <GuidePage />
            </Suspense>
          }
        />
        <Route path="formula" element={<Navigate to="../explore" replace />} />
        <Route path="saved" element={<SavedPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="formula/:formulaId" element={<FormulaRouteContent />} />
        <Route path="formula/:formulaId/export" element={<ExportRouteContent />} />
        <Route
          path="changelog"
          element={
            <Suspense fallback={<LoadingStage variant="changelog" />}>
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
