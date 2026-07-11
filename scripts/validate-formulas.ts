import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadFormulaFiles } from "./lib/load-formulas";

// Validador standalone: corre en CI (sin levantar Vite) y localmente antes
// de abrir un PR. Usa el mismo schema que la app en runtime, así que un
// archivo que pasa acá pasa también al cargar en el navegador.

const formulasDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/domain/formulas",
);

const entries = loadFormulaFiles(formulasDir);
let hasErrors = false;

for (const entry of entries) {
  if (entry.result.success) {
    console.log(`✓ ${entry.file}`);
    continue;
  }

  hasErrors = true;
  console.error(`✗ ${entry.file}`);
  console.error(`  ${entry.result.message}`);
}

if (hasErrors) {
  console.error("\nFormula validation failed.");
  process.exit(1);
}

console.log(`\nAll ${String(entries.length)} formula file(s) are valid.`);
