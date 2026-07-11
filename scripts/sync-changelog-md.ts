import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import yaml from "js-yaml";

import { changelogSchema } from "../src/domain/changelog.types";

// Genera CHANGELOG.md (en inglés, la convención habitual para changelogs de
// desarrollador) a partir de src/domain/changelog.yaml — la fuente de
// verdad real, bilingüe, que también alimenta /:locale/changelog en la app.
// Correr después de agregar una entrada nueva al YAML.

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const changelogRaw = readFileSync(path.join(ROOT, "src/domain/changelog.yaml"), "utf8");
const changelog = changelogSchema.parse(yaml.load(changelogRaw));

const TYPE_HEADING: Record<string, string> = {
  added: "Added",
  changed: "Changed",
  fixed: "Fixed",
  removed: "Removed",
};

const body = changelog
  .map((entry) => {
    const changesByType = new Map<string, string[]>();
    for (const change of entry.changes) {
      const list = changesByType.get(change.type) ?? [];
      list.push(change.text.en);
      changesByType.set(change.type, list);
    }

    const sections = [...changesByType.entries()]
      .map(([type, texts]) => {
        const heading = TYPE_HEADING[type] ?? type;
        const items = texts.map((text) => `- ${text}`).join("\n");
        return `### ${heading}\n\n${items}`;
      })
      .join("\n\n");

    return `## [${entry.version}] - ${entry.date}\n\n${sections}`;
  })
  .join("\n\n");

const content = `# Changelog

All notable changes to Math Got Motion are documented here, in
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

This file is generated from \`src/domain/changelog.yaml\` — the source of
truth, bilingual, also rendered in-app at \`/:locale/changelog\`. Add new
entries there, then run \`pnpm changelog:sync\`.

${body}
`;

writeFileSync(path.join(ROOT, "CHANGELOG.md"), content);
console.log("Generated CHANGELOG.md from src/domain/changelog.yaml");
