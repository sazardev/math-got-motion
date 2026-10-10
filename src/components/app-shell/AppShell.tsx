import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";

import { BookmarkIcon, HomeIcon, SearchIcon, SlidersIcon } from "./icons";
import { findSummary, neighborsOf } from "../../domain/formula-index";
import { useLocale } from "../../i18n/locale-context";
import { toggleSaved, useLibrary } from "../../lib/library";
import { FxPicker, LocalePicker, TypePicker } from "../preference-pickers/PreferencePickers";
import { ThemeConsole } from "../theme-console/ThemeConsole";
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

  // Swipe horizontal y ←/→ recorren las fórmulas de la misma categoría. El
  // scroll vertical es la línea de tiempo, así que el eje horizontal está libre.
  const neighbors = summary && !onExport ? neighborsOf(summary.id, locale) : null;
  useEffect(() => {
    if (!neighbors) return;
    const go = (target: { id: string }) => {
      // replace: recorrer la categoría no apila historial (Volver sale de la serie).
      void navigate(`${base}/formula/${target.id}`, { replace: true });
    };
    const isTyping = (target: EventTarget | null) =>
      (target as HTMLElement | null)?.closest("input, textarea, select, [data-lenis-prevent]") !==
      null;

    let start: { x: number; y: number } | null = null;
    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      start =
        event.touches.length === 1 && touch && !isTyping(event.target)
          ? { x: touch.clientX, y: touch.clientY }
          : null;
    };
    const handleTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!start || !touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      start = null;
      if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 2) return;
      go(dx < 0 ? neighbors.next : neighbors.prev);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      if (event.key === "ArrowRight") go(neighbors.next);
      else if (event.key === "ArrowLeft") go(neighbors.prev);
    };

    globalThis.addEventListener("touchstart", handleTouchStart, { passive: true });
    globalThis.addEventListener("touchend", handleTouchEnd, { passive: true });
    globalThis.addEventListener("keydown", handleKey);
    return () => {
      globalThis.removeEventListener("touchstart", handleTouchStart);
      globalThis.removeEventListener("touchend", handleTouchEnd);
      globalThis.removeEventListener("keydown", handleKey);
    };
  }, [neighbors, base, navigate]);

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
                if (onExport) {
                  void navigate(`${base}/formula/${summary.id}`);
                } else if (location.key === "default") {
                  // Entrada directa por URL: no hay historial propio al que volver.
                  void navigate(`${base}/explore`);
                } else {
                  // Vuelve a donde vino (Explorar con sus filtros, Guardadas, Inicio…).
                  void navigate(-1);
                }
              }}
            >
              ‹ {onExport ? summary.title[locale] : strings.navExplore}
            </button>
            <div className="app-bar__actions">
              {!onExport && (
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
              )}
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
              <ThemeConsole />
              <div className="app-bar__prefs" aria-label={strings.settingsLabel}>
                <FxPicker />
                <TypePicker />
                <LocalePicker />
              </div>
            </div>
          </>
        ) : (
          <>
            <NavLink to={`${base}/`} end className="app-bar__brand fx-display">
              π<span>Math Got Motion</span>
            </NavLink>
            <div className="app-bar__actions">
              {!location.pathname.endsWith("/explore") && (
                <Link
                  className="app-bar__search"
                  to={`${base}/explore?focus=1`}
                  aria-label={strings.navExplore}
                >
                  <SearchIcon />
                </Link>
              )}
              <ThemeConsole />
            </div>
          </>
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
