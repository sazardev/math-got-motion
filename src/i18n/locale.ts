export type Locale = "es" | "en";

export const locales: Locale[] = ["es", "en"];

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function detectInitialLocale(): Locale {
  const [preferred] = globalThis.navigator.languages;
  const lang = (preferred ?? globalThis.navigator.language).slice(0, 2).toLowerCase();
  return isLocale(lang) ? lang : "es";
}
