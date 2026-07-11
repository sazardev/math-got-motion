import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import { formulaSchema, type Formula } from "../../src/domain/formula.types";

export type FormulaLoadResult =
  { success: true; formula: Formula } | { success: false; message: string };

export interface FormulaLoadEntry {
  file: string;
  result: FormulaLoadResult;
}

/**
 * Lee, parsea y valida cada `*.yaml` en `formulasDir` (menos los prefijados
 * con "_", ej. `_template.yaml`) — la misma lógica que usa
 * `src/domain/formulas/index.ts` en el navegador, pero desde Node puro (sin
 * `import.meta.glob`), para que scripts de build (validate, sitemap, OG
 * images) no la dupliquen cada uno por su lado.
 */
export function loadFormulaFiles(formulasDir: string): FormulaLoadEntry[] {
  const files = readdirSync(formulasDir)
    .filter((file) => file.endsWith(".yaml") && !file.startsWith("_"))
    .sort();

  return files.map((file): FormulaLoadEntry => {
    const expectedId = file.replace(/\.yaml$/, "");
    const raw = readFileSync(path.join(formulasDir, file), "utf8");

    let parsed: unknown;
    try {
      parsed = yaml.load(raw);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return { file, result: { success: false, message: `invalid YAML: ${reason}` } };
    }

    const validation = formulaSchema.safeParse(parsed);
    if (!validation.success) {
      const issues = validation.error.issues
        .map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("\n");
      return { file, result: { success: false, message: issues } };
    }

    if (validation.data.id !== expectedId) {
      return {
        file,
        result: {
          success: false,
          message: `id "${validation.data.id}" must match its filename ("${expectedId}").`,
        },
      };
    }

    return { file, result: { success: true, formula: validation.data } };
  });
}

/**
 * Igual que `loadFormulaFiles`, pero devuelve directamente los `Formula`
 * válidos y revienta si alguno falló — para scripts (sitemap, OG images)
 * que asumen que `pnpm formulas:validate` ya corrió en CI y no tiene
 * sentido seguir generando salida a partir de datos rotos.
 */
export function loadValidFormulas(formulasDir: string): Formula[] {
  const entries = loadFormulaFiles(formulasDir);
  const failed = entries.filter(
    (entry): entry is { file: string; result: { success: false; message: string } } =>
      !entry.result.success,
  );

  if (failed.length > 0) {
    const details = failed.map((entry) => `${entry.file}:\n${entry.result.message}`).join("\n\n");
    throw new Error(
      `Invalid formula file(s) — run "pnpm formulas:validate" for details:\n\n${details}`,
    );
  }

  return entries
    .filter(
      (entry): entry is { file: string; result: { success: true; formula: Formula } } =>
        entry.result.success,
    )
    .map((entry) => entry.result.formula);
}
