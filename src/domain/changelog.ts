import yaml from "js-yaml";

import { changelogSchema, type Changelog } from "./changelog.types";
import changelogRaw from "./changelog.yaml?raw";

function loadChangelog(): Changelog {
  const result = changelogSchema.safeParse(yaml.load(changelogRaw));

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    const message = `Invalid src/domain/changelog.yaml:\n${issues}`;
    // Igual que domain/formulas/index.ts: romper fuerte en dev, degradar con
    // gracia en producción en vez de tirar abajo el resto del sitio.
    if (import.meta.env.DEV) throw new Error(message);
    console.error(message);
    return [];
  }

  return result.data;
}

export const changelog: Changelog = loadChangelog();
