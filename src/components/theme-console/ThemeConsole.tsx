import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useLocale } from "../../i18n/locale-context";
import { lockScroll, unlockScroll } from "../../lib/lenis";
import { usePreferences } from "../../preferences/preferences-context";
import { themeMeta, themes } from "../../preferences/themes";
import "./ThemeConsole.css";

/*
 * Consola de tema: el botón del appbar no despliega otra lista — abre un modal
 * de estética TUI (marco de cajas dibujado con caracteres, prompt ">" y lista
 * navegable con el teclado) donde se filtra y se elige entre todos los temas.
 * Recorrer la lista con ↑↓ aplica el tema en vivo, así se ve el fondo cambiar
 * antes de confirmar. Enter o un clic confirman; Escape y el fondo descartan
 * y devuelven el tema con el que se abrió.
 */

/** Ancho del recuadro en celdas de carácter: marco y contenido cuadran por `ch`. */
const COLS = 44;

/** Los silabarios CJK ocupan dos celdas en una fuente monoespaciada. */
const wideGlyph = /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/u;

/** Ancho en celdas: así el rótulo traducido no desalinea la esquina derecha. */
function cellWidth(text: string): number {
  let width = 0;
  for (const char of text) width += wideGlyph.test(char) ? 2 : 1;
  return width;
}

/** Minúsculas sin acentos: "Ósaka" se encuentra escribiendo "osaka". */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function topFrame(label: string): string {
  return `╭─ ${label} ${"─".repeat(Math.max(1, COLS - 5 - cellWidth(label)))}╮`;
}

function ruleFrame(left: string, right: string): string {
  return `${left}${"─".repeat(COLS - 2)}${right}`;
}

export function ThemeConsole() {
  const { strings } = useLocale();
  const { theme, setTheme } = usePreferences();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  /** Tema con el que se abrió el modal: Escape y el fondo lo restauran. */
  const openedWith = useRef(theme);
  const listId = useId();

  const matches = useMemo(() => {
    const needle = normalize(query.trim());
    return needle ? themes.filter((item) => normalize(item.name).includes(needle)) : themes;
  }, [query]);

  const activeName = themeMeta(theme).name;
  const activeOptionId = matches[cursor] === undefined ? undefined : `${listId}-${String(cursor)}`;

  const openConsole = () => {
    openedWith.current = theme;
    setCursor(
      Math.max(
        0,
        themes.findIndex((item) => item.id === theme),
      ),
    );
    setQuery("");
    setOpen(true);
  };

  const closeConsole = useCallback(
    (revert: boolean) => {
      if (revert) setTheme(openedWith.current);
      setOpen(false);
      triggerRef.current?.focus();
    },
    [setTheme],
  );

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    lockScroll("theme-console");
    return () => {
      unlockScroll("theme-console");
    };
  }, [open]);

  // La opción resaltada se mantiene visible al recorrer la lista con el teclado.
  useEffect(() => {
    if (!open) return;
    listRef.current?.children[cursor]?.scrollIntoView({ block: "nearest" });
  }, [open, cursor]);

  // Clic afuera del recuadro = descartar, igual que Escape.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && panelRef.current?.contains(event.target)) return;
      closeConsole(true);
    };
    globalThis.addEventListener("pointerdown", handlePointerDown);
    return () => {
      globalThis.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open, closeConsole]);

  const highlight = useCallback(
    (index: number) => {
      const bounded = Math.min(Math.max(index, 0), matches.length - 1);
      setCursor(bounded);
      // Vista previa en vivo: el tema elegido se aplica al pasar por encima.
      const target = matches[bounded];
      if (target && target.id !== theme) setTheme(target.id);
    },
    [matches, theme, setTheme],
  );

  /*
   * Todo el teclado del modal se atiende a nivel documento: el foco vive en el
   * filtro (o en el cierre) y Escape, ↑↓, Inicio/Fin, Enter y Tab funcionan
   * desde cualquiera de los dos.
   */
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "Escape": {
          event.preventDefault();
          closeConsole(true);
          break;
        }
        case "ArrowDown": {
          event.preventDefault();
          highlight(cursor + 1);
          break;
        }
        case "ArrowUp": {
          event.preventDefault();
          highlight(cursor - 1);
          break;
        }
        case "Home": {
          event.preventDefault();
          highlight(0);
          break;
        }
        case "End": {
          event.preventDefault();
          highlight(matches.length - 1);
          break;
        }
        case "Enter": {
          // Enter sobre el botón de cierre debe cerrar, no confirmar el tema.
          if (document.activeElement !== inputRef.current) break;
          event.preventDefault();
          const target = matches[cursor];
          if (target) setTheme(target.id);
          closeConsole(false);
          break;
        }
        case "Tab": {
          // Foco atrapado en el modal: alterna entre el filtro y el cierre.
          event.preventDefault();
          const active = document.activeElement;
          const index = active === inputRef.current ? 0 : active === closeRef.current ? 1 : -1;
          const focusables = [inputRef.current, closeRef.current];
          focusables[(index + 1) % focusables.length]?.focus();
          break;
        }
        default: {
          break;
        }
      }
    };
    globalThis.addEventListener("keydown", handleKeyDown);
    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, cursor, matches, theme, highlight, closeConsole, setTheme]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="control-button console-trigger"
        title={strings.themeLabel}
        aria-label={`${strings.themeLabel}: ${activeName}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (open) closeConsole(false);
          else openConsole();
        }}
      >
        <span className="console-trigger__prompt" aria-hidden="true">
          &gt;
        </span>
        <span className="console-trigger__value">{activeName}</span>
      </button>

      {open &&
        createPortal(
          <>
            <div className="console__backdrop" />
            <div
              ref={panelRef}
              className="console"
              role="dialog"
              aria-modal="true"
              aria-label={strings.themeLabel}
              data-lenis-prevent
            >
              <pre className="console__frame" aria-hidden="true">
                {topFrame(strings.themeLabel)}
              </pre>

              <div className="console__body">
                <span className="console__rail" aria-hidden="true">
                  │
                </span>

                <div className="console__content">
                  <div className="console__filter">
                    <span className="console__prompt" aria-hidden="true">
                      &gt;
                    </span>
                    <input
                      ref={inputRef}
                      className="console__input"
                      type="text"
                      role="combobox"
                      aria-expanded="true"
                      aria-controls={listId}
                      aria-activedescendant={activeOptionId}
                      aria-label={strings.themeFilterLabel}
                      placeholder={strings.themeFilterLabel}
                      value={query}
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setCursor(0);
                      }}
                    />
                    <span className="console__count" aria-hidden="true">
                      {matches.length}/{themes.length}
                    </span>
                    <button
                      ref={closeRef}
                      type="button"
                      className="console__close"
                      aria-label={strings.closeMenu}
                      onClick={() => {
                        closeConsole(false);
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>

                <span className="console__rail" aria-hidden="true">
                  │
                </span>
              </div>

              <pre className="console__frame" aria-hidden="true">
                {ruleFrame("├", "┤")}
              </pre>

              <div className="console__body">
                <span className="console__rail" aria-hidden="true">
                  │
                </span>

                <div className="console__content">
                  {matches.length === 0 ? (
                    <p className="console__empty">{strings.noResults}</p>
                  ) : (
                    <ul
                      ref={listRef}
                      id={listId}
                      className="console__list"
                      role="listbox"
                      aria-label={strings.themeLabel}
                    >
                      {matches.map((item, index) => (
                        <li
                          key={item.id}
                          id={`${listId}-${String(index)}`}
                          role="option"
                          aria-selected={item.id === theme}
                          data-active={index === cursor}
                          className="console__option"
                          onPointerEnter={() => {
                            setCursor(index);
                          }}
                          onClick={() => {
                            setTheme(item.id);
                            closeConsole(false);
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter") return;
                            setTheme(item.id);
                            closeConsole(false);
                          }}
                        >
                          <span className="console__marker" aria-hidden="true">
                            {item.id === theme ? "●" : "○"}
                          </span>
                          {item.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <span className="console__rail" aria-hidden="true">
                  │
                </span>
              </div>

              <pre className="console__frame" aria-hidden="true">
                {ruleFrame("├", "┤")}
              </pre>

              <div className="console__body">
                <span className="console__rail" aria-hidden="true">
                  │
                </span>

                <div className="console__content">
                  <p className="console__hints">{strings.themeConsoleHints}</p>
                </div>

                <span className="console__rail" aria-hidden="true">
                  │
                </span>
              </div>

              <pre className="console__frame" aria-hidden="true">
                {ruleFrame("╰", "╯")}
              </pre>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
