import { useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";

import { BookmarkIcon, HomeIcon, SearchIcon, SlidersIcon } from "./icons";
import { findSummary } from "../../domain/formula-index";
import { useLocale } from "../../i18n/locale-context";
import { toggleSaved, useLibrary } from "../../lib/library";
import {
  FxPicker,
  LocalePicker,
  ThemePicker,
  TypePicker,
} from "../preference-pickers/PreferencePickers";
import "./AppShell.css";

/**
 * Cromo persistente de la app. Móvil: barra de pestañas inferior. Tablet y
 * escritorio: barra superior. En una fórmula (ruta "inmersiva") el lienzo
 * ocupa toda la pantalla y el cromo se reduce a volver / guardar / exportar.
 */
export function AppShell() {
  const { locale, strings } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const { formulaId } = useParams<{ formulaId: string }>();
  const { saved } = useLibrary();

  const summary = findSummary(formulaId);
  const immersive = summary !== undefined;
  const onExport = location.pathname.endsWith("/export");
  const isSaved = summary ? saved.includes(summary.id) : false;
  const base = `/${locale}`;

  // Atajos: "/" o Ctrl/⌘+K llevan a la búsqueda desde cualquier pantalla.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.matches("input, textarea, select, [contenteditable]");
      const isShortcut =
        (event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing);
      if (!isShortcut) return;
      event.preventDefault();
      void navigate(`${base}/explore?focus=1`);
    };
    globalThis.addEventListener("keydown", handleKeyDown);
    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, [base, navigate]);

  return (
    <div className="app-shell" data-immersive={immersive}>
      <header className="app-bar">
        {summary ? (
          <>
            <button
              type="button"
              className="app-bar__back"
              onClick={() => {
                void navigate(onExport ? `${base}/formula/${summary.id}` : `${base}/explore`);
              }}
            >
              ‹ {onExport ? summary.title[locale] : strings.navExplore}
            </button>
            <div className="app-bar__actions">
              <button
                type="button"
                className="control-button app-bar__save"
                aria-pressed={isSaved}
                onClick={() => {
                  toggleSaved(summary.id);
                }}
              >
                <BookmarkIcon filled={isSaved} />
                <span>{isSaved ? strings.unsaveFormula : strings.saveFormula}</span>
              </button>
              <button
                type="button"
                className="control-button"
                aria-current={onExport ? "page" : undefined}
                onClick={() => {
                  void navigate(
                    onExport
                      ? `${base}/formula/${summary.id}`
                      : `${base}/formula/${summary.id}/export`,
                  );
                }}
              >
                {onExport ? strings.formulaNav : strings.exportLabel}
              </button>
              <div className="app-bar__prefs" aria-label={strings.settingsLabel}>
                <FxPicker />
                <TypePicker />
                <ThemePicker />
                <LocalePicker />
              </div>
            </div>
          </>
        ) : (
          <NavLink to={`${base}/`} end className="app-bar__brand fx-display">
            π<span>Math Got Motion</span>
          </NavLink>
        )}
      </header>

      <nav className="tab-bar" aria-label={strings.menuTitle}>
        <NavLink to={`${base}/`} end className="tab-bar__item">
          <HomeIcon />
          <span>{strings.homeNav}</span>
        </NavLink>
        <NavLink to={`${base}/explore`} className="tab-bar__item">
          <SearchIcon />
          <span>{strings.navExplore}</span>
        </NavLink>
        <NavLink to={`${base}/saved`} className="tab-bar__item">
          <BookmarkIcon />
          <span>{strings.navSaved}</span>
        </NavLink>
        <NavLink to={`${base}/settings`} className="tab-bar__item">
          <SlidersIcon />
          <span>{strings.navSettings}</span>
        </NavLink>
      </nav>

      <Outlet />
    </div>
  );
}
