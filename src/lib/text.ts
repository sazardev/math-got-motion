import type { Locale } from "../i18n/locale";

/**
 * Divide un texto en "palabras" para el stagger de GSAP (ver FormulaHero.tsx).
 * Un `.split(" ")` simple funciona para idiomas separados por espacios, pero
 * el chino y el japonés no usan espacios entre palabras — una oración entera
 * colapsaría en un solo token y el efecto de aparición palabra por palabra
 * desaparecería. `Intl.Segmenter` (nativo, sin dependencia nueva) segmenta
 * por idioma correctamente en ambos casos.
 *
 * Se recorren TODOS los segmentos (no solo los `isWordLike`) y cada
 * segmento que no es una palabra (puntuación, espacio) se pega al final del
 * anterior — así "world." sigue siendo un único token animado, igual que
 * con `.split(" ")` hoy, en vez de separar la palabra de su punto.
 */
export function splitWords(text: string, locale: Locale): string[] {
  if (typeof Intl.Segmenter !== "function") return text.split(" ");

  const segmenter = new Intl.Segmenter(locale, { granularity: "word" });
  const words: string[] = [];

  for (const { segment, isWordLike } of segmenter.segment(text)) {
    const last = words.at(-1);
    if (isWordLike || last === undefined) {
      words.push(segment);
    } else {
      words[words.length - 1] = last + segment;
    }
  }

  return words.map((word) => word.trimEnd()).filter((word) => word.length > 0);
}
