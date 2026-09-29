import type { FormulaSummary } from "../domain/formula-index";
import type { Locale } from "../i18n/locale";

const DIACRITICS_PATTERN = new RegExp(String.raw`[̀-ͯ]`, "gu");

export function normalize(value: string): string {
  return value.normalize("NFD").replaceAll(DIACRITICS_PATTERN, "").toLowerCase().trim();
}

interface Indexed {
  summary: FormulaSummary;
  title: string;
  category: string;
  glyphs: string;
}

const cache = new Map<Locale, Indexed[]>();

function indexFor(list: FormulaSummary[], locale: Locale): Indexed[] {
  const cached = cache.get(locale);
  if (cached?.length === list.length) return cached;
  const built = list.map((summary) => ({
    summary,
    title: normalize(summary.title[locale]),
    category: normalize(summary.category[locale]),
    glyphs: normalize(summary.glyphs.map((glyph) => glyph.value).join("")),
  }));
  cache.set(locale, built);
  return built;
}

/**
 * Búsqueda instantánea sobre el índice ligero: cada palabra de la consulta
 * debe aparecer en título, categoría o símbolos. Puntúa título > categoría >
 * símbolos, y prefijo de título > coincidencia interna.
 */
export function searchFormulas(
  list: FormulaSummary[],
  locale: Locale,
  query: string,
  category: string | null,
): FormulaSummary[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const scored: { summary: FormulaSummary; score: number; title: string }[] = [];

  for (const item of indexFor(list, locale)) {
    if (category && item.summary.category.es !== category) continue;
    let score = 0;
    let matches = true;
    for (const word of words) {
      if (item.title.startsWith(word)) score += 4;
      else if (item.title.includes(` ${word}`)) score += 3;
      else if (item.title.includes(word)) score += 2;
      else if (item.category.includes(word)) score += 1;
      else if (item.glyphs.includes(word)) score += 0.5;
      else {
        matches = false;
        break;
      }
    }
    if (matches) scored.push({ summary: item.summary, score, title: item.title });
  }

  scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, locale));
  return scored.map((entry) => entry.summary);
}
