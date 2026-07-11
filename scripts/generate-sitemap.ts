import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadValidFormulas } from "./lib/load-formulas";
import { locales, type Locale } from "../src/i18n/locale";
import { SITE_URL } from "../src/lib/site";

// Genera dist/sitemap.xml y dist/robots.txt en base a las mismas fórmulas
// que carga la app — agregar una fórmula nueva (src/domain/formulas/*.yaml)
// hace que aparezca acá automáticamente, sin tocar este script.

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FORMULAS_DIR = path.join(ROOT, "src/domain/formulas");
const DIST_DIR = path.join(ROOT, "dist");

// Crawlers de IA que el sitio deja pasar explícitamente — la mayoría de
// robots.txt por defecto los bloquea o los ignora; se listan uno por uno
// porque "User-agent: *" no siempre alcanza para que un bot los reconozca
// como autorizados.
const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "anthropic-ai",
  "ClaudeBot",
  "PerplexityBot",
  "Bytespider",
];

interface SitemapUrl {
  /** Ruta canónica de esta URL, ej. "/es/formula/euler-identity". */
  path: string;
  /** Ruta equivalente en cada idioma (incluida esta misma), para hreflang. */
  byLocale: Record<Locale, string>;
}

function buildUrls(): SitemapUrl[] {
  const formulas = loadValidFormulas(FORMULAS_DIR);
  const urls: SitemapUrl[] = [];

  for (const locale of locales) {
    urls.push({
      path: `/${locale}/`,
      byLocale: Object.fromEntries(locales.map((l) => [l, `/${l}/`])) as Record<Locale, string>,
    });
  }

  for (const formula of formulas) {
    const byLocale = Object.fromEntries(
      locales.map((l) => [l, `/${l}/formula/${formula.id}`]),
    ) as Record<Locale, string>;
    for (const locale of locales) {
      urls.push({ path: byLocale[locale], byLocale });
    }
  }

  for (const locale of locales) {
    urls.push({
      path: `/${locale}/changelog`,
      byLocale: Object.fromEntries(locales.map((l) => [l, `/${l}/changelog`])) as Record<
        Locale,
        string
      >,
    });
  }

  return urls;
}

function buildSitemapXml(urls: SitemapUrl[], lastmod: string): string {
  const entries = urls
    .map((url) => {
      const alternates = locales
        .map(
          (locale) =>
            `    <xhtml:link rel="alternate" hreflang="${locale}" href="${SITE_URL}${url.byLocale[locale]}" />`,
        )
        .join("\n");
      const defaultLocale = locales[0];
      const xDefault = defaultLocale
        ? `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${url.byLocale[defaultLocale]}" />`
        : "";

      return [
        "  <url>",
        `    <loc>${SITE_URL}${url.path}</loc>`,
        alternates,
        xDefault,
        `    <lastmod>${lastmod}</lastmod>`,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>
`;
}

function buildRobotsTxt(): string {
  const aiBlocks = AI_CRAWLERS.map((agent) => `User-agent: ${agent}\nAllow: /`).join("\n\n");

  return `User-agent: *
Allow: /

${aiBlocks}

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

function main() {
  const urls = buildUrls();
  const lastmod = new Date().toISOString().slice(0, 10);

  mkdirSync(DIST_DIR, { recursive: true });
  writeFileSync(path.join(DIST_DIR, "sitemap.xml"), buildSitemapXml(urls, lastmod));
  writeFileSync(path.join(DIST_DIR, "robots.txt"), buildRobotsTxt());

  console.log(`Generated dist/sitemap.xml (${String(urls.length)} URLs) and dist/robots.txt`);
}

main();
