import type { Locale } from "../i18n/locale";

export type FormulaNodeType =
  "variable" | "operator" | "equals" | "number" | "constant" | "superscript";

export type LocalizedText = Record<Locale, string>;

export interface FormulaNode {
  /** Stable id — used as React key and as the GSAP ref lookup key. */
  id: string;
  type: FormulaNodeType;
  value: string;
  /** General Sans copy shown while this node is isolated on scroll. */
  explanation: LocalizedText;
}

export interface FormulaContext {
  /** Proper name of the person credited with the formula (transliteration varies by locale). */
  author: LocalizedText;
  /** Short place/date line, e.g. "Switzerland, 1707–1783 · published in 1748". */
  era: LocalizedText;
  /** A short paragraph of historical or cultural context, shown at the end of the scroll. */
  history: LocalizedText;
}

export interface Formula {
  id: string;
  title: LocalizedText;
  nodes: FormulaNode[];
  context: FormulaContext;
}
