import { useEffect, useMemo, useState } from "react";

import { findSummary } from "../../domain/formula-index";
import { useLocale } from "../../i18n/locale-context";
import {
  loadChangelogPageChunk,
  loadExportPageChunk,
  loadFormulaHeroChunk,
} from "../../lib/route-loader";
import "./LoadingStage.css";

type Variant = "formula" | "export" | "changelog";

interface LoadingStageProps {
  variant: Variant;
  /** Solo para `formula`/`export`: el skeleton usa sus glifos reales. */
  formulaId?: string | undefined;
  /** true en cuanto el YAML ya está validado (el paso "fórmula"). */
  formulaReady?: boolean;
}

const CHUNKS: Record<Variant, () => Promise<unknown>> = {
  formula: loadFormulaHeroChunk,
  export: loadExportPageChunk,
  changelog: loadChangelogPageChunk,
};

const FALLBACK_GLYPHS = ["∑", "=", "π", "+", "·"];

type StepState = "done" | "active" | "pending";

/**
 * Skeleton de carga con hitos reales, no una animación a ciegas: el índice es
 * síncrono, el YAML llega de `loadFormula`, la tipografía de `document.fonts`
 * y la escena del chunk lazy. Cada fila se enciende cuando su recurso existe.
 *
 * El fondo es una retícula de puntos dibujada en CSS con `--fg`: mantiene el
 * default monocromático plano (SPEC/DESIGN) pero da profundidad al estado que
 * antes era texto suelto sobre negro. Solo se animan `transform`/`opacity`.
 */
export function LoadingStage({ variant, formulaId, formulaReady = true }: LoadingStageProps) {
  const { strings } = useLocale();
  const [fontsReady, setFontsReady] = useState(false);
  const [chunkReady, setChunkReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (!cancelled) setFontsReady(true);
    });
    void CHUNKS[variant]()
      .then(() => {
        if (!cancelled) setChunkReady(true);
      })
      .catch(() => {
        // Si falla, el Suspense que sigue mostrará el error de carga real.
      });
    return () => {
      cancelled = true;
    };
  }, [variant]);

  const steps = useMemo(() => {
    const list: { label: string; done: boolean }[] = [
      { label: strings.loadingStepIndex, done: true },
    ];
    if (variant !== "changelog") {
      list.push({ label: strings.loadingStepFormula, done: formulaReady });
    }
    list.push(
      { label: strings.loadingStepFonts, done: fontsReady },
      { label: strings.loadingStepScene, done: chunkReady },
    );

    const firstPending = list.findIndex((step) => !step.done);
    return list.map((step, index): { label: string; state: StepState } => ({
      label: step.label,
      state: step.done ? "done" : index === firstPending ? "active" : "pending",
    }));
  }, [variant, formulaReady, fontsReady, chunkReady, strings]);

  const current = steps.find((step) => step.state === "active");
  const glyphs: string[] = formulaId
    ? (findSummary(formulaId)
        ?.glyphs.slice(0, 10)
        .map((glyph) => glyph.value) ?? FALLBACK_GLYPHS)
    : FALLBACK_GLYPHS;

  return (
    <div className="loading-stage" role="status" aria-label={strings.loadingFormula}>
      <div className="loading-stage__atlas" aria-hidden="true" />
      <div className="loading-stage__inner">
        <div className="loading-stage__ghost fx-display" aria-hidden="true">
          {glyphs.map((glyph, index) => (
            <span key={index} style={{ animationDelay: `${String(index * 70)}ms` }}>
              {glyph}
            </span>
          ))}
        </div>

        <ol className="loading-stage__steps" aria-hidden="true">
          {steps.map((step, index) => (
            <li key={step.label} data-state={step.state}>
              <span className="loading-stage__num">{String(index + 1).padStart(2, "0")}</span>
              <span className="loading-stage__label">{step.label}</span>
              <span className="loading-stage__mark" />
            </li>
          ))}
        </ol>

        <span className="loading-stage__sr" aria-live="polite">
          {current?.label ?? strings.loadingFormula}
        </span>
      </div>
    </div>
  );
}
