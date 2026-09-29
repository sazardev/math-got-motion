import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import type { Plugin } from "vite";

const VIRTUAL_ID = "virtual:formula-index";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

interface RawFormula {
  id?: unknown;
  title?: unknown;
  category?: unknown;
  nodes?: { type?: unknown; value?: unknown }[];
}

/**
 * Módulo virtual `virtual:formula-index`: un índice ligero (id, título,
 * categoría y glifos por fórmula) generado en build a partir de los YAML.
 * La app arranca solo con esto; el contenido completo de cada fórmula se
 * carga bajo demanda (ver src/domain/formulas/index.ts). La validación
 * estricta sigue en `formulas:validate` y al cargar cada fórmula.
 */
export function formulaIndexPlugin(formulasDir: string): Plugin {
  return {
    name: "formula-index",
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      return null;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;

      const entries = readdirSync(formulasDir)
        .filter((file) => file.endsWith(".yaml") && !file.startsWith("_"))
        .sort()
        .flatMap((file) => {
          const fullPath = path.join(formulasDir, file);
          this.addWatchFile(fullPath);
          const data = yaml.load(readFileSync(fullPath, "utf8")) as RawFormula | undefined;
          const expectedId = file.replace(/\.yaml$/, "");
          if (data?.id !== expectedId || !data.title || !data.category || !data.nodes) {
            this.warn(`${file}: omitted from the formula index (invalid or id/filename mismatch).`);
            return [];
          }
          return [
            {
              id: expectedId,
              title: data.title,
              category: data.category,
              glyphs: data.nodes.map((node) => ({ type: node.type, value: node.value })),
            },
          ];
        });

      return `export default ${JSON.stringify(entries)};`;
    },
  };
}
