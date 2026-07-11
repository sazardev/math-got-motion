/**
 * URL pública del sitio desplegado (GitHub Pages), sin barra final.
 * Única fuente de verdad para el hook de SEO cliente
 * (src/hooks/useSeo.ts) y los scripts de build (sitemap, OG images) —
 * evita que la URL quede hardcodeada en más de un lugar.
 */
export const SITE_URL = "https://sazardev.github.io/math-got-motion";

/** Repositorio del código fuente — fuente de verdad para el CTA de "cómo contribuir". */
export const REPO_URL = "https://github.com/sazardev/math-got-motion";
