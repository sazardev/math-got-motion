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
const loaders = import.meta.glob<string>(["./*.yaml", "!./_template.yaml"], {
  query: "?raw",
  import: "default",
});

const cache = new Map<string, Promise<Formula | null>>();

/**
 * Carga y valida UNA fórmula (su YAML es un chunk aparte, no viaja en el
 * bundle inicial). Devuelve `null` si no existe o es inválida — en dev una
 * fórmula inválida rompe fuerte; en producción se degrada a "no encontrada".
 */
export function loadFormula(id: string): Promise<Formula | null> {
  const cached = cache.get(id);
  if (cached) return cached;

  const loader = loaders[`./${id}.yaml`];
  const pending = loader
    ? loader().then((raw) => {
        const result = formulaSchema.safeParse(yaml.load(raw));
        if (result.success && result.data.id === id) return result.data;

        const message = `${id}.yaml is invalid or its id does not match its filename.`;
        if (import.meta.env.DEV) throw new Error(message);
        console.error(message);
        return null;
      })
    : Promise.resolve(null);

  cache.set(id, pending);
  return pending;
}
