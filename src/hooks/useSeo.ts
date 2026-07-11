import { useEffect } from "react";

import { SITE_URL } from "../lib/site";

import type { Locale } from "../i18n/locale";

export interface SeoAlternate {
  locale: Locale;
  /** Ruta de la versión en este idioma, con locale incluido, ej. "/en/formula/euler-identity". */
  path: string;
}

export interface SeoOptions {
  locale: Locale;
  title: string;
  description: string;
  /** Ruta canónica de esta página, con locale incluido y sin dominio, ej. "/es/formula/euler-identity". */
  path: string;
  /** URL absoluta de la imagen de vista previa (Open Graph/Twitter). */
  image?: string;
  /** Versiones en otros idiomas de esta misma página, para <link rel="alternate" hreflang>. */
  alternates?: SeoAlternate[];
  jsonLd?: Record<string, unknown>;
}

const MANAGED_ATTR = "data-seo-managed";

/**
 * Setea document.title/lang y sobreescribe (no duplica) los <meta>/<link> de
 * SEO del <head> — funciona tanto sobre los tags estáticos de index.html
 * como sobre los que dejó una navegación anterior. Corre en el cliente, pero
 * como el paso de prerender (scripts/prerender.ts) saca una foto del DOM
 * después del montaje, lo que este hook escribe termina horneado en el HTML
 * estático que reciben los crawlers — no hace falta un sistema de SSR aparte.
 */
export function useSeo({
  locale,
  title,
  description,
  path,
  image,
  alternates,
  jsonLd,
}: SeoOptions) {
  useEffect(() => {
    document.title = `${title} — Math Got Motion`;
    document.documentElement.lang = locale;

    const canonical = `${SITE_URL}${path}`;
    const created: HTMLElement[] = [];

    const upsert = (selector: string, build: () => HTMLElement) => {
      for (const existing of document.head.querySelectorAll(selector)) existing.remove();
      const el = build();
      el.setAttribute(MANAGED_ATTR, "true");
      document.head.append(el);
      created.push(el);
    };

    const upsertMeta = (attr: "name" | "property", key: string, content: string) => {
      upsert(`meta[${attr}="${key}"]`, () => {
        const el = document.createElement("meta");
        el.setAttribute(attr, key);
        el.setAttribute("content", content);
        return el;
      });
    };

    const upsertLink = (rel: string, href: string, extraAttr?: [string, string]) => {
      const selector = extraAttr
        ? `link[rel="${rel}"][${extraAttr[0]}="${extraAttr[1]}"]`
        : `link[rel="${rel}"]`;
      upsert(selector, () => {
        const el = document.createElement("link");
        el.setAttribute("rel", rel);
        el.setAttribute("href", href);
        if (extraAttr) el.setAttribute(...extraAttr);
        return el;
      });
    };

    upsertMeta("name", "description", description);
    upsertLink("canonical", canonical);

    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    if (image) upsertMeta("property", "og:image", image);

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    if (image) upsertMeta("name", "twitter:image", image);

    for (const alternate of alternates ?? []) {
      upsertLink("alternate", `${SITE_URL}${alternate.path}`, ["hreflang", alternate.locale]);
    }
    // x-default: a qué versión mandar a un crawler/usuario cuyo idioma no matchea ninguna alternate.
    const defaultAlternate = (alternates ?? []).find((alternate) => alternate.locale === "es");
    if (defaultAlternate) {
      upsertLink("alternate", `${SITE_URL}${defaultAlternate.path}`, ["hreflang", "x-default"]);
    }

    if (jsonLd) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(jsonLd);
      script.setAttribute(MANAGED_ATTR, "true");
      document.head.append(script);
      created.push(script);
    }

    return () => {
      for (const el of created) el.remove();
    };
  }, [locale, title, description, path, image, alternates, jsonLd]);
}
