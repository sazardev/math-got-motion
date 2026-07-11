import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import yaml from "js-yaml";

import { formulaSchema } from "../src/domain/formula.types";

// Validador standalone: corre en CI (sin levantar Vite) y localmente antes
// de abrir un PR. Usa el mismo schema que la app en runtime, así que un
// archivo que pasa acá pasa también al cargar en el navegador.

const formulasDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/domain/formulas",
);

const files = readdirSync(formulasDir)
  .filter((file) => file.endsWith(".yaml") && !file.startsWith("_"))
  .sort();

let hasErrors = false;

for (const file of files) {
  const expectedId = file.replace(/\.yaml$/, "");
  const raw = readFileSync(path.join(formulasDir, file), "utf8");

  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (error) {
    hasErrors = true;
    console.error(`✗ ${file}`);
    console.error(`  invalid YAML: ${error instanceof Error ? error.message : String(error)}`);
    continue;
  }

  const result = formulaSchema.safeParse(parsed);

  if (!result.success) {
    hasErrors = true;
    console.error(`✗ ${file}`);
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    continue;
  }

  if (result.data.id !== expectedId) {
    hasErrors = true;
    console.error(`✗ ${file}: id "${result.data.id}" must match its filename ("${expectedId}").`);
    continue;
  }

  console.log(`✓ ${file}`);
}

if (hasErrors) {
  console.error("\nFormula validation failed.");
  process.exit(1);
}

console.log(`\nAll ${String(files.length)} formula file(s) are valid.`);
