import { useGSAP } from "@gsap/react";
import { useEffect, useRef, useState } from "react";

import { gsap } from "../../lib/gsap";

import type { Formula } from "../../domain/formula.types";
import type { Locale } from "../../i18n/locale";
import type { UiStrings } from "../../i18n/ui-strings";
import "./FormulaMenu.css";

interface FormulaMenuProps {
  formulas: Formula[];
  activeId: string;
  locale: Locale;
  strings: Pick<UiStrings, "menuTitle" | "closeMenu" | "searchPlaceholder" | "noResults">;
  onSelect: (id: string) => void;
}

interface FormulaGroup {
  category: string;
  items: Formula[];
}

// Rango Unicode de marcas diacríticas combinantes (U+0300–U+036F), para que la
// búsqueda ignore acentos ("area" encuentra "Área").
const DIACRITICS_PATTERN = new RegExp(String.raw`[\u0300-\u036f]`, "gu");

function normalize(value: string) {
  return value.normalize("NFD").replaceAll(DIACRITICS_PATTERN, "").toLowerCase();
}

// Agrupa por categoría (orden alfabético en el locale activo) y ordena cada
// grupo por título — esto es lo que permite que el índice siga siendo
// navegable aunque N crezca a decenas de fórmulas: nunca depende del orden
// de inserción en el array de datos.
function groupFormulas(list: Formula[], locale: Locale): FormulaGroup[] {
  const groups = new Map<string, Formula[]>();
  for (const formula of list) {
    const key = formula.category[locale];
    const items = groups.get(key) ?? [];
    items.push(formula);
    groups.set(key, items);
  }

  const sortedKeys = [...groups.keys()].sort((a, b) => a.localeCompare(b, locale));
  return sortedKeys.map((category) => {
    const items = [...(groups.get(category) ?? [])].sort((a, b) =>
      a.title[locale].localeCompare(b.title[locale], locale),
    );
    return { category, items };
  });
}

export function FormulaMenu({ formulas, activeId, locale, strings, onSelect }: FormulaMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const filtered = query.trim()
    ? formulas.filter((formula) => normalize(formula.title[locale]).includes(normalize(query)))
    : formulas;
  const groups = groupFormulas(filtered, locale);
  const countLabel = String(formulas.length).padStart(2, "0");

  useGSAP(
    () => {
      if (!backdropRef.current || !panelRef.current) return;

      const groupEls = gsap.utils.toArray<HTMLElement>(
        ".formula-index__group",
        containerRef.current,
      );
      const tl = gsap
        .timeline({ paused: true })
        .to(backdropRef.current, { opacity: 1, duration: 0.25 }, 0)
        .fromTo(panelRef.current, { opacity: 0, y: "-2%" }, { opacity: 1, y: 0, duration: 0.35 }, 0)
        .fromTo(
          groupEls,
          { opacity: 0, y: "6%" },
          { opacity: 1, y: 0, stagger: 0.06, duration: 0.4, ease: "power2.out" },
          0.1,
        );
      tlRef.current = tl;
    },
    { scope: containerRef, dependencies: [locale] },
  );

  const openIndex = () => {
    setQuery("");
    setIsOpen(true);
    tlRef.current?.play();
    inputRef.current?.focus();
  };

  const closeIndex = () => {
    setIsOpen(false);
    tlRef.current?.reverse();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeIndex();
    };
    globalThis.addEventListener("keydown", handleKeyDown);
    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const numberOf = new Map(
    groups.flatMap((group) => group.items).map((formula, index) => [formula.id, index + 1]),
  );

  return (
    <div ref={containerRef} className="formula-menu">
      <button
        type="button"
        className="formula-menu__trigger"
        aria-expanded={isOpen}
        onClick={() => {
          if (isOpen) closeIndex();
          else openIndex();
        }}
      >
        {isOpen ? strings.closeMenu : `${strings.menuTitle} — ${countLabel}`}
      </button>

      <div className="formula-index" data-open={isOpen} aria-hidden={!isOpen}>
        <button
          ref={backdropRef}
          type="button"
          className="formula-index__backdrop"
          tabIndex={-1}
          aria-label={strings.closeMenu}
          onClick={closeIndex}
        />

        <div
          ref={panelRef}
          className="formula-index__panel"
          role="dialog"
          aria-modal="true"
          aria-label={strings.menuTitle}
        >
          <input
            ref={inputRef}
            type="text"
            className="formula-index__search"
            placeholder={strings.searchPlaceholder}
            value={query}
            tabIndex={isOpen ? 0 : -1}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />

          <div className="formula-index__list">
            {groups.length === 0 && <p className="formula-index__empty">{strings.noResults}</p>}

            {groups.map((group) => (
              <div className="formula-index__group" key={group.category}>
                <p className="formula-index__category">{group.category}</p>
                <div className="formula-index__items">
                  {group.items.map((formula) => (
                    <button
                      key={formula.id}
                      type="button"
                      className="formula-index__item"
                      aria-current={formula.id === activeId}
                      tabIndex={isOpen ? 0 : -1}
                      onClick={() => {
                        onSelect(formula.id);
                        closeIndex();
                      }}
                    >
                      <span className="formula-index__number">
                        {String(numberOf.get(formula.id) ?? 0).padStart(2, "0")}
                      </span>
                      <span className="formula-index__title">{formula.title[locale]}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
