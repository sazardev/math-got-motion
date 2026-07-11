import { z } from "zod";

// Límites de tamaño: no son arbitrarios — protegen la coreografía de scroll
// (SPEC.md §4), que asume contenido de tamaño razonable para calcular
// duraciones de timeline y layout en viewport. Un archivo de fórmula
// contribuido por cualquiera nunca puede desbordar estos límites porque el
// schema los rechaza antes de llegar a React/GSAP.
const TEXT_LIMITS = {
  short: 60, // título, categoría, autor
  era: 120,
  node: 8, // valor de un símbolo renderizado (ej. "x", "sen", "log")
  explanation: 220,
  long: 320, // descripciones de timeline/casos de uso
  history: 900,
  exampleLine: 120,
} as const;

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function localizedText(max: number) {
  return z.object({
    es: z.string().trim().min(1).max(max),
    en: z.string().trim().min(1).max(max),
  });
}

// Cualquier `localizedText(max)` infiere a esta misma forma
// `{ es: string; en: string }`, sin importar qué `max` se le pase.
export type LocalizedText = z.infer<ReturnType<typeof localizedText>>;

export const formulaNodeTypeSchema = z.enum([
  "variable",
  "operator",
  "equals",
  "number",
  "constant",
  "superscript",
]);
export type FormulaNodeType = z.infer<typeof formulaNodeTypeSchema>;

const formulaNodeSchema = z.object({
  /** Id estable dentro de la fórmula — se usa como React key y ref de GSAP. */
  id: z.string().regex(KEBAB_CASE, "must be kebab-case (lowercase, numbers, hyphens)"),
  type: formulaNodeTypeSchema,
  value: z.string().trim().min(1).max(TEXT_LIMITS.node),
  /** Copy en General Sans mostrado mientras este nodo está aislado en el scroll. */
  explanation: localizedText(TEXT_LIMITS.explanation),
});
export type FormulaNode = z.infer<typeof formulaNodeSchema>;

const timelineEventSchema = z.object({
  /** Etiqueta corta de fecha/año, ej. "1748" o "c. 300 a.C." */
  year: z.string().trim().min(1).max(24),
  label: localizedText(TEXT_LIMITS.long),
});
export type TimelineEvent = z.infer<typeof timelineEventSchema>;

const useCaseSchema = z.object({
  title: localizedText(TEXT_LIMITS.short),
  description: localizedText(TEXT_LIMITS.long),
});
export type UseCase = z.infer<typeof useCaseSchema>;

const workedExampleSchema = z.object({
  title: localizedText(TEXT_LIMITS.short),
  /** Líneas de un ejemplo numérico resuelto, en monoespaciado, reveladas una a una. */
  lines: z.array(localizedText(TEXT_LIMITS.exampleLine)).min(1).max(14),
});
export type WorkedExample = z.infer<typeof workedExampleSchema>;

const formulaContextSchema = z.object({
  /** Nombre de la persona acreditada (la transliteración varía por locale). */
  author: localizedText(TEXT_LIMITS.short),
  /** Línea corta de lugar/fecha, ej. "Switzerland, 1707–1783 · published in 1748". */
  era: localizedText(TEXT_LIMITS.era),
  /** Párrafo de contexto histórico o cultural, mostrado al final del scroll. */
  history: localizedText(TEXT_LIMITS.history),
  /** Hitos desde el origen hasta el uso moderno, como riel de timeline. */
  timeline: z.array(timelineEventSchema).min(1).max(10),
  /** Dominios reales donde se aplica la fórmula hoy. */
  useCases: z.array(useCaseSchema).min(1).max(6),
  /** Un único ejemplo numérico resuelto, revelado línea por línea. */
  example: workedExampleSchema,
});
export type FormulaContext = z.infer<typeof formulaContextSchema>;

export const formulaSchema = z.object({
  /** Único en todo el proyecto — debe coincidir con el nombre del archivo (sin extensión). */
  id: z.string().regex(KEBAB_CASE, "must be kebab-case (lowercase, numbers, hyphens)"),
  title: localizedText(TEXT_LIMITS.short),
  /** Grupo temático usado para organizar el índice de fórmulas (ej. "Geometría"). */
  category: localizedText(TEXT_LIMITS.short),
  nodes: z.array(formulaNodeSchema).min(1).max(16),
  context: formulaContextSchema,
});
export type Formula = z.infer<typeof formulaSchema>;
