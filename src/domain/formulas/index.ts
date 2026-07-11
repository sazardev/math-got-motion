import yaml from "js-yaml";

import { formulaSchema, type Formula } from "../formula.types";

/**
 * Cada fórmula vive en su propio archivo `*.yaml` en esta carpeta — datos
 * puros, no código. A diferencia de un módulo `.ts`, un archivo YAML nunca
 * puede ejecutar nada: es seguro aceptarlo de cualquier contribuidor externo
 * sin darle la capacidad de correr JavaScript arbitrario en la app.
 *
 * Este glob los autodescubre — agregar una fórmula nueva NO requiere editar
 * este archivo: copiá `_template.yaml` con un nombre nuevo, completá sus
 * campos, y validá con `pnpm formulas:validate` (lo mismo que corre CI).
 *
 * `_template.yaml` (prefijo "_") queda excluido a propósito: es una guía,
 * no una fórmula real.
 */
const rawFiles = import.meta.glob<string>(["./*.yaml", "!./_template.yaml"], {
  eager: true,
  query: "?raw",
  import: "default",
});

function idFromPath(path: string): string {
  return path.replace(/^.*\//, "").replace(/\.yaml$/, "");
}

function loadFormulas(): Formula[] {
  const loaded: Formula[] = [];
  const errors: string[] = [];

  for (const [path, raw] of Object.entries(rawFiles)) {
    const expectedId = idFromPath(path);
    const result = formulaSchema.safeParse(yaml.load(raw));

    if (!result.success) {
      const issues = result.error.issues
        .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("\n");
      errors.push(`${expectedId}.yaml is invalid:\n${issues}`);
      continue;
    }

    if (result.data.id !== expectedId) {
      errors.push(
        `${expectedId}.yaml: id "${result.data.id}" must match its filename ("${expectedId}").`,
      );
      continue;
    }

    loaded.push(result.data);
  }

  if (errors.length > 0) {
    const message = `Invalid formula file(s) in src/domain/formulas/:\n\n${errors.join("\n\n")}`;
    // En dev, romper fuerte y rápido. En producción, degradar con gracia:
    // el resto del sitio no debería caerse porque una fórmula esté mal.
    if (import.meta.env.DEV) throw new Error(message);
    console.error(message);
  }

  return loaded;
}

export const formulas: Formula[] = loadFormulas();
