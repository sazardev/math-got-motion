export type FormulaNodeType =
  "variable" | "operator" | "equals" | "number" | "constant" | "superscript";

export interface FormulaNode {
  /** Stable id — used as React key and as the GSAP ref lookup key. */
  id: string;
  type: FormulaNodeType;
  value: string;
  /** General Sans copy shown while this node is isolated on scroll. */
  explanation: string;
}

export interface Formula {
  id: string;
  title: string;
  nodes: FormulaNode[];
}
