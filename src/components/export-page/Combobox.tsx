import { useEffect, useId, useMemo, useRef, useState } from "react";

export interface ComboboxOption {
  id: string;
  label: string;
  /** Id de tema: la opción se pinta con la paleta real de ese tema. */
  theme?: string;
}

interface ComboboxProps {
  label: string;
  value: string;
  options: readonly ComboboxOption[];
  onChange: (id: string) => void;
  searchPlaceholder: string;
  emptyLabel: string;
}

/** Minúsculas sin acentos: "Órbita" se encuentra escribiendo "orbita". */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Selector desplegable con búsqueda: el botón muestra solo el valor actual;
 * al abrirlo aparece un campo para escribir (autocompletar) y la lista
 * filtrada, navegable con ↑ ↓ Enter y cerrable con Escape. La lista se
 * despliega en el flujo (no flota), así el panel de ajustes nunca la recorta.
 */
export function Combobox({
  label,
  value,
  options,
  onChange,
  searchPlaceholder,
  emptyLabel,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const current = options.find((option) => option.id === value);
  const matches = useMemo(() => {
    const needle = normalize(query.trim());
    return needle ? options.filter((option) => normalize(option.label).includes(needle)) : options;
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const choose = (option: ComboboxOption | undefined) => {
    if (!option) return;
    onChange(option.id);
    close();
  };

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      close();
    };
    globalThis.addEventListener("pointerdown", handlePointerDown);
    return () => {
      globalThis.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  // Mantiene visible la opción resaltada al moverse con el teclado.
  useEffect(() => {
    listRef.current?.children[cursor]?.scrollIntoView({ block: "nearest" });
  }, [cursor, open]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        setCursor((index) => Math.min(matches.length - 1, index + 1));
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        setCursor((index) => Math.max(0, index - 1));
        break;
      }
      case "Enter": {
        event.preventDefault();
        choose(matches[cursor]);
        break;
      }
      case "Escape": {
        event.preventDefault();
        close();
        break;
      }
      default: {
        break;
      }
    }
  };

  return (
    <div className="combobox" ref={rootRef}>
      <p className="export__group-label">{label}</p>
      <button
        type="button"
        className="combobox__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => {
          if (open) {
            close();
          } else {
            setCursor(
              Math.max(
                0,
                options.findIndex((option) => option.id === value),
              ),
            );
            setOpen(true);
          }
        }}
      >
        <span>{current?.label ?? value}</span>
        <span aria-hidden="true" className="combobox__caret">
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div className="combobox__panel">
          <input
            ref={inputRef}
            className="combobox__input"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-label={label}
            placeholder={searchPlaceholder}
            value={query}
            autoComplete="off"
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <ul
            ref={listRef}
            id={listId}
            className="combobox__list"
            role="listbox"
            data-lenis-prevent
          >
            {matches.map((option, index) => (
              <li
                key={option.id}
                role="option"
                aria-selected={option.id === value}
                data-active={index === cursor}
                className="combobox__option"
                onPointerEnter={() => {
                  setCursor(index);
                }}
                tabIndex={-1}
                onClick={() => {
                  choose(option);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") choose(option);
                }}
              >
                {option.theme ? (
                  <span className="combobox__swatch" data-theme={option.theme} aria-hidden="true">
                    π
                  </span>
                ) : null}
                {option.label}
              </li>
            ))}
            {matches.length === 0 && <li className="combobox__empty">{emptyLabel}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
