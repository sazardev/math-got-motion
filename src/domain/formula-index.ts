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
