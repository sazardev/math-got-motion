import rawIndex from "virtual:formula-index";

import type { FormulaNodeType, LocalizedText } from "./formula.types";

/** Versión mínima de una fórmula: lo justo para listar, buscar y previsualizar. */
export interface FormulaSummary {
  id: string;
  title: LocalizedText;
  category: LocalizedText;
  glyphs: { type: FormulaNodeType; value: string }[];
}

/**
 * Índice ligero generado en build (scripts/vite-formula-index.ts). Es lo único
 * que carga el arranque: el contenido completo de cada fórmula llega bajo
 * demanda con `loadFormula` (src/domain/formulas).
 */
export const formulaIndex = rawIndex as FormulaSummary[];

const byId = new Map(formulaIndex.map((summary) => [summary.id, summary]));

export function findSummary(id: string | undefined): FormulaSummary | undefined {
  return id ? byId.get(id) : undefined;
}

/**
 * Fórmula anterior/siguiente dentro de la misma categoría (orden alfabético
 * por título en el idioma activo, con vuelta al principio) — lo que recorren
 * el swipe horizontal y las flechas ←/→ en una fórmula.
 */
export function neighborsOf(
  id: string,
  locale: keyof FormulaSummary["title"],
): { prev: FormulaSummary; next: FormulaSummary } | null {
  const current = byId.get(id);
  if (!current) return null;
  const siblings = formulaIndex
    .filter((summary) => summary.category.es === current.category.es)
    .sort((a, b) => a.title[locale].localeCompare(b.title[locale], locale));
  if (siblings.length < 2) return null;
  const index = siblings.findIndex((summary) => summary.id === id);
  const prev = siblings[(index - 1 + siblings.length) % siblings.length];
  const next = siblings[(index + 1) % siblings.length];
  return prev && next ? { prev, next } : null;
}
