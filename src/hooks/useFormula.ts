import { useEffect, useState } from "react";

import { loadFormula } from "../domain/formulas";

import type { Formula } from "../domain/formula.types";

export type FormulaState =
  { status: "loading" } | { status: "ready"; formula: Formula } | { status: "missing" };

/** Carga bajo demanda la fórmula completa (su YAML es un chunk aparte). */
export function useFormula(id: string | undefined): FormulaState {
  const [state, setState] = useState<{ id: string | undefined; result: FormulaState }>({
    id,
    result: { status: "loading" },
  });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void loadFormula(id).then((formula) => {
      if (cancelled) return;
      setState({
        id,
        result: formula ? { status: "ready", formula } : { status: "missing" },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Mientras `id` cambió y el resultado aún es del anterior, se reporta "loading".
  if (!id) return { status: "missing" };
  return state.id === id ? state.result : { status: "loading" };
}
