import type { Locale } from "./locale";
import type { UiStrings } from "./ui-strings";

/*
 * Cada idioma es un chunk aparte: solo se descarga el del idioma activo (~25 KB)
 * en vez de los seis juntos.
 */
const loaders: Record<Locale, () => Promise<{ strings: UiStrings }>> = {
  es: () => import("./strings/es"),
  en: () => import("./strings/en"),
  pt: () => import("./strings/pt"),
  fr: () => import("./strings/fr"),
  zh: () => import("./strings/zh"),
  ja: () => import("./strings/ja"),
};

const cache = new Map<Locale, Promise<UiStrings>>();

export function loadStrings(locale: Locale): Promise<UiStrings> {
  const cached = cache.get(locale);
  if (cached) return cached;
  const pending = loaders[locale]().then((loadedModule) => loadedModule.strings);
  cache.set(locale, pending);
  return pending;
}
