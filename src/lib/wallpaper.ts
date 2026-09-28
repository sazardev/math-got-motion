import { splitWords } from "./text";

import type { Formula } from "../domain/formula.types";
import type { Locale } from "../i18n/locale";
import type { FxPreset } from "../preferences/preferences-context";

/**
 * Exportador de wallpapers en PNG. Renderiza sobre un canvas 2D a resolución
 * completa (no captura el DOM): así el resultado es nítido en 4K, no depende
 * de la ventana, y puede componer estilos que la app no muestra — isométrico,
 * extrusión 3D o patrón repetido — reutilizando la paleta del tema activo, la
 * tipografía de la fórmula y el preset de efectos.
 */

export type WallpaperStyle =
  | "formula"
  | "accent"
  | "inverted"
  | "poster"
  | "swiss"
  | "anatomy"
  | "macro"
  | "aura"
  | "depth"
  | "echo"
  | "orbit"
  | "spiral"
  | "isometric"
  | "pattern";

/** Orden de presentación en el exportador: de lo más sobrio a lo más gráfico. */
export const wallpaperStyles: readonly WallpaperStyle[] = [
  "formula",
  "accent",
  "inverted",
  "poster",
  "swiss",
  "anatomy",
  "macro",
  "aura",
  "depth",
  "echo",
  "orbit",
  "spiral",
  "isometric",
  "pattern",
];
export type WallpaperSizeId = "4k" | "qhd" | "fhd" | "mobile";

export interface WallpaperSize {
  id: WallpaperSizeId;
  width: number;
  height: number;
}

export const wallpaperSizes: readonly [WallpaperSize, WallpaperSize, WallpaperSize, WallpaperSize] =
  [
    { id: "4k", width: 3840, height: 2160 },
    { id: "qhd", width: 2560, height: 1440 },
    { id: "fhd", width: 1920, height: 1080 },
    { id: "mobile", width: 1170, height: 2532 },
  ];

export interface WallpaperPalette {
  bg: string;
  fg: string;
  accent: string;
  accentFg: string;
  scheme: "dark" | "light";
}

export interface WallpaperFonts {
  formula: string;
  mono: string;
  prose: string;
}

export interface WallpaperContext {
  palette: WallpaperPalette;
  fonts: WallpaperFonts;
}

/**
 * Ajustes finos de cada composición. Todos son multiplicadores relativos al
 * look por defecto (1 = el diseño original), así un mismo slider significa lo
 * mismo en cualquier estilo y en cualquier resolución.
 */
export interface WallpaperOptions {
  /** Tamaño de la fórmula (0.4–1.6). */
  scale: number;
  /** Aire horizontal entre repeticiones (0 = pegadas) — isométrico/patrón. */
  spacingX: number;
  /** Aire vertical entre filas (0 = pegadas) — isométrico/patrón. */
  spacingY: number;
  /** Ángulo en grados — patrón (inclinación de las filas) y 3D (giro). */
  rotation: number;
  /** Cantidad de capas de extrusión — 3D. */
  layers: number;
  /** Distancia entre capas de extrusión (multiplicador) — 3D. */
  distance: number;
  /** Apertura de anillos/brazos (multiplicador) — órbita y espiral. */
  radius: number;
  /** Repeticiones: anillos (órbita), ecos (eco) o manchas de luz (aura). */
  count: number;
  /** Índice del símbolo protagonista — macro. */
  focus: number;
}

export type WallpaperOptionKey = keyof WallpaperOptions;

export interface WallpaperOptionSpec {
  key: WallpaperOptionKey;
  min: number;
  max: number;
  step: number;
}

const optionSpecs: Record<WallpaperOptionKey, WallpaperOptionSpec> = {
  scale: { key: "scale", min: 0.4, max: 1.6, step: 0.01 },
  spacingX: { key: "spacingX", min: 0, max: 3, step: 0.01 },
  spacingY: { key: "spacingY", min: 0, max: 3, step: 0.01 },
  rotation: { key: "rotation", min: -60, max: 60, step: 1 },
  layers: { key: "layers", min: 2, max: 40, step: 1 },
  distance: { key: "distance", min: 0.2, max: 3, step: 0.01 },
  radius: { key: "radius", min: 0.3, max: 2, step: 0.01 },
  count: { key: "count", min: 1, max: 16, step: 1 },
  // El máximo real depende de la fórmula (cantidad de nodos): la UI lo
  // recorta y el render lo clampa.
  focus: { key: "focus", min: 0, max: 40, step: 1 },
};

/** Qué ajustes tienen efecto en cada estilo — la UI solo muestra esos. */
export const styleOptionKeys: Record<WallpaperStyle, readonly WallpaperOptionKey[]> = {
  formula: ["scale"],
  accent: ["scale"],
  inverted: ["scale"],
  poster: ["scale"],
  isometric: ["scale", "spacingX", "spacingY"],
  depth: ["scale", "layers", "distance", "rotation"],
  pattern: ["scale", "spacingX", "spacingY", "rotation"],
  swiss: ["scale"],
  anatomy: ["scale", "spacingX"],
  macro: ["focus", "scale", "rotation"],
  aura: ["scale", "count", "rotation"],
  echo: ["scale", "count", "spacingY", "rotation"],
  orbit: ["scale", "radius", "count", "rotation"],
  spiral: ["scale", "radius", "rotation"],
};

export function optionSpec(key: WallpaperOptionKey): WallpaperOptionSpec {
  return optionSpecs[key];
}

/** Valores por defecto de cada estilo: reproducen el diseño original. */
export function defaultWallpaperOptions(style: WallpaperStyle): WallpaperOptions {
  return {
    scale: 1,
    spacingX: 1,
    spacingY: 1,
    rotation: style === "pattern" ? -26 : style === "depth" ? -6 : 0,
    layers: 14,
    distance: 1,
    radius: 1,
    count: style === "echo" ? 6 : style === "orbit" ? 4 : 5,
    focus: 0,
  };
}

export interface WallpaperRequest {
  formula: Formula;
  locale: Locale;
  style: WallpaperStyle;
  size: WallpaperSize;
  fx: FxPreset;
  context: WallpaperContext;
  options?: WallpaperOptions;
}

function optionsFor(request: WallpaperRequest): WallpaperOptions {
  return request.options ?? defaultWallpaperOptions(request.style);
}

/** Tamaño de diseño del layout de glifos; el render escala desde acá. */
const DESIGN_SIZE = 100;

/* ------------------------------------------------------------------ */
/* Color                                                               */
/* ------------------------------------------------------------------ */

/**
 * Acepta #rgb, #rrggbb y rgb()/rgba() — este último es lo que devuelven
 * shiftHue() y mix(). Sin él, rgba() devolvía el color intacto (opaco) y las
 * manchas del aura/ambient tapaban el lienzo entero en vez de difuminarse.
 */
function parseHex(color: string): [number, number, number] | null {
  const functional = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(color.trim());
  if (functional) {
    return [Number(functional[1]), Number(functional[2]), Number(functional[3])];
  }
  const hex = color.trim().replace("#", "");
  if (hex.length === 3) {
    const r = Number.parseInt(hex.charAt(0) + hex.charAt(0), 16);
    const g = Number.parseInt(hex.charAt(1) + hex.charAt(1), 16);
    const b = Number.parseInt(hex.charAt(2) + hex.charAt(2), 16);
    return [r, g, b];
  }
  if (hex.length === 6) {
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    return [r, g, b];
  }
  return null;
}

function rgba(color: string, alpha: number): string {
  const rgb = parseHex(color);
  if (!rgb) return color;
  return `rgba(${String(rgb[0])}, ${String(rgb[1])}, ${String(rgb[2])}, ${String(alpha)})`;
}

function mix(from: string, to: string, amount: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  if (!a || !b) return from;
  const lerp = (x: number, y: number) => Math.round(x + (y - x) * amount);
  return `rgb(${String(lerp(a[0], b[0]))}, ${String(lerp(a[1], b[1]))}, ${String(lerp(a[2], b[2]))})`;
}

function hueToChannel(p: number, q: number, t: number): number {
  let value = t;
  if (value < 0) value += 1;
  if (value > 1) value -= 1;
  if (value < 1 / 6) return p + (q - p) * 6 * value;
  if (value < 1 / 2) return q;
  if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
  return p;
}

/** Rota el tono de un color (para derivar la aberración cromática del acento). */
function shiftHue(color: string, degrees: number): string {
  const rgb = parseHex(color);
  if (!rgb) return color;
  const r = rgb[0] / 255;
  const g = rgb[1] / 255;
  const b = rgb[2] / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return color;

  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue: number;
  if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  hue = (hue / 6 + degrees / 360) % 1;

  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  const outR = Math.round(hueToChannel(p, q, hue + 1 / 3) * 255);
  const outG = Math.round(hueToChannel(p, q, hue) * 255);
  const outB = Math.round(hueToChannel(p, q, hue - 1 / 3) * 255);
  return `rgb(${String(outR)}, ${String(outG)}, ${String(outB)})`;
}

/* ------------------------------------------------------------------ */
/* Contexto (paleta y fuentes del tema/preset activos)                 */
/* ------------------------------------------------------------------ */

/** Lee las variables CSS ya aplicadas: el tema es la fuente de verdad. */
export function readWallpaperContext(): WallpaperContext {
  const styles = globalThis.getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
  const scheme = document.documentElement.dataset["scheme"] === "light" ? "light" : "dark";
  return {
    palette: {
      bg: read("--bg", "#000000"),
      fg: read("--fg", "#ffffff"),
      accent: read("--accent", "#ffffff"),
      accentFg: read("--accent-fg", "#000000"),
      scheme,
    },
    fonts: {
      formula: read("--font-formula", "monospace"),
      mono: read("--font-mono", "monospace"),
      prose: read("--font-prose", "sans-serif"),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Layout de la fórmula                                                */
/* ------------------------------------------------------------------ */

interface Glyph {
  value: string;
  x: number;
  /** Ancho de avance a DESIGN_SIZE. */
  width: number;
  dy: number;
  font: string;
}

interface FormulaLayout {
  glyphs: Glyph[];
  width: number;
  top: number;
  height: number;
}

/**
 * Compone los nodos en una línea con las mismas reglas que FormulaHero.css:
 * operadores/igual con 0.3em de aire a cada lado y superíndices al 55% de
 * tamaño, elevados. El layout se mide una vez a DESIGN_SIZE y el render escala.
 */
function layoutFormula(
  context: CanvasRenderingContext2D,
  formula: Formula,
  family: string,
): FormulaLayout {
  const baseFont = `500 ${String(DESIGN_SIZE)}px ${family}`;
  const superFont = `500 ${String(DESIGN_SIZE * 0.55)}px ${family}`;
  const glyphs: Glyph[] = [];
  let x = 0;

  for (const node of formula.nodes) {
    const superscript = node.type === "superscript";
    const font = superscript ? superFont : baseFont;
    context.font = font;
    if (node.type === "operator" || node.type === "equals") x += DESIGN_SIZE * 0.3;
    const advance = context.measureText(node.value).width;
    glyphs.push({
      value: node.value,
      x,
      width: advance,
      dy: superscript ? -DESIGN_SIZE * 0.35 : 0,
      font,
    });
    x += advance;
    if (node.type === "operator" || node.type === "equals") x += DESIGN_SIZE * 0.3;
  }

  let top = 0;
  let bottom = 0;
  for (const glyph of glyphs) {
    context.font = glyph.font;
    const metrics = context.measureText(glyph.value);
    top = Math.min(top, glyph.dy - (metrics.actualBoundingBoxAscent || DESIGN_SIZE * 0.8));
    bottom = Math.max(bottom, glyph.dy + (metrics.actualBoundingBoxDescent || DESIGN_SIZE * 0.2));
  }

  return { glyphs, width: x, top, height: bottom - top };
}

interface Chroma {
  offset: number;
  colorA: string;
  colorB: string;
  alpha: number;
}

interface DrawOptions {
  x: number;
  y: number;
  scale: number;
  color: string;
  alpha?: number;
  glow?: number;
  chroma?: Chroma;
  /** Grosor del contorno en px de salida: dibuja con strokeText (hueco). */
  outline?: number;
  /** Color por glifo (índice = nodo); si devuelve undefined se usa `color`. */
  glyphColor?: (index: number) => string | undefined;
  /** "left" ancla el borde izquierdo de la fórmula en x (default: centrada). */
  align?: "center" | "left";
}

function drawFormula(
  context: CanvasRenderingContext2D,
  layout: FormulaLayout,
  options: DrawOptions,
): void {
  const { x, y, scale, color, alpha = 1, glow = 0, chroma, outline, glyphColor } = options;
  const baseline = -(layout.top + layout.height / 2);
  const originX = options.align === "left" ? 0 : -layout.width / 2;

  const paint = (fill: string, offsetX: number, paintAlpha: number, perGlyph: boolean) => {
    context.save();
    context.globalAlpha = paintAlpha;
    if (glow > 0) {
      context.shadowColor = fill;
      context.shadowBlur = glow;
    }
    context.translate(x + offsetX, y);
    context.scale(scale, scale);
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    if (outline) {
      context.lineWidth = outline / scale;
      context.lineJoin = "round";
    }
    for (const [index, glyph] of layout.glyphs.entries()) {
      const paintColor = (perGlyph ? glyphColor?.(index) : undefined) ?? fill;
      context.font = glyph.font;
      // originX centra (o alinea a la izquierda) la fórmula en x; el baseline
      // la centra verticalmente usando la caja real medida en layoutFormula.
      const glyphX = glyph.x + originX;
      const glyphY = baseline + glyph.dy;
      if (outline) {
        context.strokeStyle = paintColor;
        context.strokeText(glyph.value, glyphX, glyphY);
      } else {
        context.fillStyle = paintColor;
        context.fillText(glyph.value, glyphX, glyphY);
      }
    }
    context.restore();
  };

  if (chroma) {
    paint(chroma.colorA, -chroma.offset, chroma.alpha, false);
    paint(chroma.colorB, chroma.offset, chroma.alpha, false);
  }
  paint(color, 0, alpha, true);
}

interface TextOptions {
  x: number;
  y: number;
  font: string;
  color: string;
  alpha?: number;
  align?: CanvasTextAlign;
}

function drawText(context: CanvasRenderingContext2D, text: string, options: TextOptions): void {
  const { x, y, font, color, alpha = 1, align = "center" } = options;
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.font = font;
  context.textAlign = align;
  context.textBaseline = "alphabetic";
  context.fillText(text, x, y);
  context.restore();
}

/**
 * Parte un texto en líneas de hasta `maxWidth` px con la fuente ya asignada
 * al contexto. Usa splitWords (Intl.Segmenter) para que zh/ja también corten
 * por palabra; si no entra en `maxLines`, la última línea termina en "…".
 */
function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  locale: Locale,
): string[] {
  const tokens = splitWords(text, locale);
  const joiner = /\s/.test(text) ? " " : "";
  const lines: string[] = [];
  let current = "";
  let index = 0;

  for (; index < tokens.length; index += 1) {
    const token = tokens[index] ?? "";
    const candidate = current ? `${current}${joiner}${token}` : token;
    if (context.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = token;
    if (lines.length === maxLines) break;
  }

  const truncated = lines.length === maxLines;
  if (!truncated && current) lines.push(current);
  if (truncated) {
    let last = lines[maxLines - 1] ?? "";
    while (last.length > 1 && context.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = `${last.trimEnd()}…`;
  }
  return lines;
}

/** Hash FNV-1a: semilla estable por fórmula (cada una tiene su propia aura). */
function hashString(text: string): number {
  let hash = 0x81_1c_9d_c5;
  for (const char of text) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01_00_01_93) >>> 0;
  }
  return hash;
}

/* ------------------------------------------------------------------ */
/* Efectos (mismo lenguaje que FxLayer.css)                            */
/* ------------------------------------------------------------------ */

function glowFor(fx: FxPreset, renderedSize: number, scheme: "dark" | "light"): number {
  if (fx === "neon") return scheme === "dark" ? renderedSize * 0.09 : 0;
  if (fx === "crt") return renderedSize * 0.05;
  if (fx === "vhs") return renderedSize * 0.03;
  if (fx === "film") return renderedSize * 0.04;
  if (fx === "dream") return renderedSize * (scheme === "dark" ? 0.16 : 0.1);
  return 0;
}

function chromaFor(
  fx: FxPreset,
  palette: WallpaperPalette,
  renderedSize: number,
): Chroma | undefined {
  if (fx === "neon" && palette.scheme === "dark") {
    return {
      offset: renderedSize * 0.016,
      colorA: shiftHue(palette.accent, -50),
      colorB: shiftHue(palette.accent, 50),
      alpha: 0.4,
    };
  }
  if (fx === "vhs") {
    return {
      offset: renderedSize * 0.012,
      colorA: rgba(palette.fg, 0.42),
      colorB: rgba(palette.fg, 0.3),
      alpha: 0.9,
    };
  }
  if (fx === "glitch") {
    return {
      offset: renderedSize * 0.022,
      colorA: "rgb(255, 40, 80)",
      colorB: "rgb(0, 230, 255)",
      alpha: palette.scheme === "dark" ? 0.75 : 0.55,
    };
  }
  if (fx === "film") {
    return {
      offset: renderedSize * 0.006,
      colorA: "rgb(255, 120, 60)",
      colorB: "rgb(255, 210, 160)",
      alpha: 0.18,
    };
  }
  return undefined;
}

function drawScanlines(
  context: CanvasRenderingContext2D,
  palette: WallpaperPalette,
  width: number,
  height: number,
): void {
  const gap = Math.max(3, Math.round(height / 540));
  context.save();
  context.fillStyle =
    palette.scheme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.5)";
  for (let y = 0; y < height; y += gap) context.fillRect(0, y, width, 1);
  context.fillStyle = palette.scheme === "dark" ? "rgba(0, 0, 0, 0.16)" : "rgba(0, 0, 0, 0.06)";
  for (let y = 1; y < height; y += gap) context.fillRect(0, y, width, Math.max(1, gap - 1));
  context.restore();
}

/** PRNG determinístico (mulberry32): el grano no "titila" entre re-renders del preview. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d_2b_79_f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function drawGrain(
  context: CanvasRenderingContext2D,
  palette: WallpaperPalette,
  width: number,
  height: number,
  tint?: string,
): void {
  const tile = document.createElement("canvas");
  tile.width = 128;
  tile.height = 128;
  const tileContext = tile.getContext("2d");
  if (!tileContext) return;
  const rgb = parseHex(tint ?? palette.fg) ?? [255, 255, 255];
  const image = tileContext.createImageData(tile.width, tile.height);
  const random = seededRandom(0x6d_67_6d);
  for (let index = 0; index < image.data.length; index += 4) {
    image.data[index] = rgb[0];
    image.data[index + 1] = rgb[1];
    image.data[index + 2] = rgb[2];
    // Disperso (casi la mitad transparente): se lee como grano fílmico y
    // comprime mucho mejor que ruido lleno.
    image.data[index + 3] = random() < 0.45 ? 0 : random() * 80;
  }
  tileContext.putImageData(image, 0, 0);
  const pattern = context.createPattern(tile, "repeat");
  if (!pattern) return;
  // Grano más grueso en resoluciones altas: además de verse más fílmico,
  // reduce la entropía del PNG (un grano por píxel a 4K lo hacía pesar
  // decenas de MB).
  const grainScale = Math.max(1, Math.round(Math.min(width, height) / 720));
  context.save();
  context.globalAlpha = palette.scheme === "dark" ? 0.45 : 0.32;
  context.fillStyle = pattern;
  context.scale(grainScale, grainScale);
  context.fillRect(0, 0, width / grainScale, height / grainScale);
  context.restore();
}

function drawVignette(
  context: CanvasRenderingContext2D,
  palette: WallpaperPalette,
  width: number,
  height: number,
): void {
  const gradient = context.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.34,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.72,
  );
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(
    1,
    palette.scheme === "dark" ? "rgba(0, 0, 0, 0.42)" : "rgba(0, 0, 0, 0.14)",
  );
  context.save();
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.restore();
}

function drawTracking(
  context: CanvasRenderingContext2D,
  palette: WallpaperPalette,
  width: number,
  height: number,
): void {
  context.save();
  context.fillStyle = rgba(palette.fg, 0.06);
  for (const position of [0.18, 0.56, 0.8]) {
    context.fillRect(0, height * position, width, Math.max(2, height * 0.012));
  }
  context.restore();
}

function drawAmbient(
  context: CanvasRenderingContext2D,
  palette: WallpaperPalette,
  width: number,
  height: number,
): void {
  const radius = Math.min(width, height) * 0.45;
  const spots = [
    { x: 0.16, y: 0.2, color: rgba(shiftHue(palette.accent, -70), 0.1) },
    { x: 0.84, y: 0.76, color: rgba(shiftHue(palette.accent, 70), 0.09) },
    { x: 0.5, y: 1.15, color: rgba(palette.accent, 0.09) },
  ];
  context.save();
  for (const spot of spots) {
    const gradient = context.createRadialGradient(
      width * spot.x,
      height * spot.y,
      0,
      width * spot.x,
      height * spot.y,
      radius,
    );
    gradient.addColorStop(0, spot.color);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }
  context.restore();
}

/** Film: fuga de luz cálida desde una esquina, como en un rollo velado. */
function drawLightLeak(
  context: CanvasRenderingContext2D,
  palette: WallpaperPalette,
  width: number,
  height: number,
): void {
  const unit = Math.max(width, height);
  const leaks = [
    { x: 0.94, y: 0.06, r: 0.5, color: "rgba(255, 110, 40, 0.24)" },
    { x: 1.02, y: 0.3, r: 0.32, color: "rgba(255, 60, 60, 0.1)" },
    { x: 0.04, y: 0.98, r: 0.4, color: "rgba(255, 190, 120, 0.1)" },
  ];
  context.save();
  context.globalAlpha = palette.scheme === "dark" ? 1 : 0.75;
  for (const leak of leaks) {
    const gradient = context.createRadialGradient(
      width * leak.x,
      height * leak.y,
      0,
      width * leak.x,
      height * leak.y,
      unit * leak.r,
    );
    gradient.addColorStop(0, leak.color);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }
  context.restore();
}

/** Vignette tintada (cálida para film, luminosa para dream en claro). */
function drawTintedVignette(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
  inner: number,
): void {
  const gradient = context.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * inner,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.72,
  );
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, color);
  context.save();
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.restore();
}

/** Dream: bruma del acento alrededor del centro, sobre la composición. */
function drawHaze(
  context: CanvasRenderingContext2D,
  palette: WallpaperPalette,
  width: number,
  height: number,
): void {
  const spots = [
    { x: 0.5, y: 0.46, r: 0.62, alpha: palette.scheme === "dark" ? 0.14 : 0.1 },
    { x: 0.18, y: 0.82, r: 0.4, alpha: 0.08 },
    { x: 0.86, y: 0.16, r: 0.36, alpha: 0.07 },
  ];
  const unit = Math.max(width, height);
  context.save();
  for (const spot of spots) {
    const gradient = context.createRadialGradient(
      width * spot.x,
      height * spot.y,
      0,
      width * spot.x,
      height * spot.y,
      unit * spot.r,
    );
    gradient.addColorStop(0, rgba(palette.accent, spot.alpha));
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }
  context.restore();
}

/**
 * Halftone: trama de puntos de imprenta. El radio crece con la distancia al
 * centro — la imagen se "imprime" más densa hacia los bordes. Un solo path
 * para todos los puntos: miles de arcos, un único fill.
 */
function drawHalftone(
  context: CanvasRenderingContext2D,
  palette: WallpaperPalette,
  width: number,
  height: number,
): void {
  const spacing = Math.max(6, Math.round(Math.min(width, height) / 150));
  const maxDistance = Math.hypot(width / 2, height / 2);
  context.save();
  context.fillStyle = rgba(palette.fg, palette.scheme === "dark" ? 0.2 : 0.26);
  context.beginPath();
  for (let y = spacing / 2; y < height; y += spacing) {
    const rowOffset = Math.round(y / spacing) % 2 === 0 ? 0 : spacing / 2;
    for (let x = spacing / 2 + rowOffset; x < width; x += spacing) {
      const t = Math.hypot(x - width / 2, y - height / 2) / maxDistance;
      const radius = spacing * 0.48 * Math.max(0, (t - 0.25) / 0.75) ** 1.4;
      if (radius < 0.35) continue;
      context.moveTo(x + radius, y);
      context.arc(x, y, radius, 0, Math.PI * 2);
    }
  }
  context.fill();
  context.restore();
}

/**
 * Glitch: franjas horizontales del propio lienzo corridas de lado (drawImage
 * del canvas sobre sí mismo) y un par de bandas de color. Semilla fija por
 * tamaño: el mismo corte en preview y en el PNG final.
 */
function drawGlitch(
  context: CanvasRenderingContext2D,
  palette: WallpaperPalette,
  width: number,
  height: number,
): void {
  const random = seededRandom(0x91_17_c4);
  const canvas = context.canvas;
  context.save();
  for (let band = 0; band < 14; band += 1) {
    const y = Math.round(random() * height);
    const bandHeight = Math.max(2, Math.round(height * (0.004 + random() * 0.03)));
    const shift = Math.round((random() - 0.5) * width * 0.07);
    context.drawImage(canvas, 0, y, width, bandHeight, shift, y, width, bandHeight);
  }
  for (let band = 0; band < 3; band += 1) {
    const y = random() * height;
    context.fillStyle = band % 2 === 0 ? "rgba(255, 40, 80, 0.08)" : "rgba(0, 230, 255, 0.08)";
    context.fillRect(0, y, width, Math.max(2, height * (0.006 + random() * 0.012)));
  }
  context.restore();
  drawScanlines(context, palette, width, height);
}

function applyFx(
  context: CanvasRenderingContext2D,
  fx: FxPreset,
  palette: WallpaperPalette,
  width: number,
  height: number,
): void {
  if (fx === "mono") return;
  if (fx === "crt" || fx === "vhs") {
    drawScanlines(context, palette, width, height);
  }
  if (fx === "vhs") {
    drawTracking(context, palette, width, height);
    drawGrain(context, palette, width, height);
  }
  if (fx === "crt") {
    drawGrain(context, palette, width, height);
  }
  if (fx === "neon" && palette.scheme === "dark") {
    drawAmbient(context, palette, width, height);
  }
  if (fx === "film") {
    drawLightLeak(context, palette, width, height);
    drawGrain(context, palette, width, height, mix(palette.fg, "#ffb070", 0.35));
    drawTintedVignette(
      context,
      width,
      height,
      palette.scheme === "dark" ? "rgba(30, 12, 0, 0.5)" : "rgba(90, 45, 10, 0.18)",
      0.3,
    );
    return;
  }
  if (fx === "dream") {
    drawHaze(context, palette, width, height);
    drawTintedVignette(
      context,
      width,
      height,
      palette.scheme === "dark" ? "rgba(0, 0, 0, 0.26)" : "rgba(255, 255, 255, 0.45)",
      0.4,
    );
    return;
  }
  if (fx === "halftone") {
    drawHalftone(context, palette, width, height);
    return;
  }
  if (fx === "glitch") {
    drawGlitch(context, palette, width, height);
    drawGrain(context, palette, width, height);
  }
  drawVignette(context, palette, width, height);
}

/* ------------------------------------------------------------------ */
/* Composiciones                                                       */
/* ------------------------------------------------------------------ */

function fitScale(layout: FormulaLayout, maxWidth: number, maxHeight: number): number {
  return Math.min(maxWidth / layout.width, maxHeight / layout.height);
}

function drawFormulaComposition(
  context: CanvasRenderingContext2D,
  request: WallpaperRequest,
  layout: FormulaLayout,
): void {
  const { width, height } = request.size;
  const { palette } = request.context;
  const scale = fitScale(layout, width * 0.78, height * 0.5) * optionsFor(request).scale;
  const renderedSize = DESIGN_SIZE * scale;
  const chroma = chromaFor(request.fx, palette, renderedSize);

  drawFormula(context, layout, {
    x: width / 2,
    y: height / 2,
    scale,
    color: palette.accent,
    glow: glowFor(request.fx, renderedSize, palette.scheme),
    ...(chroma ? { chroma } : {}),
  });
}

function drawPosterComposition(
  context: CanvasRenderingContext2D,
  request: WallpaperRequest,
  layout: FormulaLayout,
): void {
  const { width, height } = request.size;
  const { palette, fonts } = request.context;
  const { formula, locale } = request;
  const unit = Math.min(width, height);
  const scale = fitScale(layout, width * 0.66, height * 0.34) * optionsFor(request).scale;
  const renderedSize = DESIGN_SIZE * scale;
  const chroma = chromaFor(request.fx, palette, renderedSize);
  const formulaY = height * 0.44;
  const textWidth = width * 0.84;

  drawText(context, formula.category[locale].toUpperCase(), {
    x: width / 2,
    y: height * 0.16,
    font: `500 ${String(Math.round(unit * 0.014))}px ${fonts.mono}`,
    color: palette.fg,
    alpha: 0.55,
  });

  drawFormula(context, layout, {
    x: width / 2,
    y: formulaY,
    scale,
    color: palette.accent,
    glow: glowFor(request.fx, renderedSize, palette.scheme),
    ...(chroma ? { chroma } : {}),
  });

  // Tamaños relativos al lado corto y texto partido en líneas: antes el
  // título iba en una sola línea a 4.2% del alto, y en el formato móvil
  // (angosto y alto) se salía por los costados.
  const titleSize = unit * 0.042;
  const titleFont = `700 ${String(Math.round(titleSize))}px ${fonts.prose}`;
  context.save();
  context.font = titleFont;
  const titleLines = wrapText(context, formula.title[locale], textWidth, 2, locale);
  context.restore();
  let cursor = Math.max(height * 0.66, formulaY + (layout.height * scale) / 2 + titleSize * 1.6);
  for (const line of titleLines) {
    drawText(context, line, { x: width / 2, y: cursor, font: titleFont, color: palette.fg });
    cursor += titleSize * 1.15;
  }

  const metaSize = unit * 0.018;
  const metaFont = `500 ${String(Math.round(metaSize))}px ${fonts.mono}`;
  context.save();
  context.font = metaFont;
  const metaLines = wrapText(
    context,
    `${formula.context.author[locale]} · ${formula.context.era[locale]}`,
    textWidth,
    2,
    locale,
  );
  context.restore();
  cursor += metaSize * 0.9;
  for (const line of metaLines) {
    drawText(context, line, {
      x: width / 2,
      y: cursor,
      font: metaFont,
      color: palette.fg,
      alpha: 0.7,
    });
    cursor += metaSize * 1.5;
  }
}

function drawIsometricComposition(
  context: CanvasRenderingContext2D,
  request: WallpaperRequest,
  layout: FormulaLayout,
): void {
  const { width, height } = request.size;
  const { palette } = request.context;
  const options = optionsFor(request);
  // Cuerpo de letra fijo relativo al alto del lienzo (≈78px en 4K), con
  // tope de ancho: antes la escala salía del ancho de la fórmula y una larga
  // (adición de senos, Haversine) quedaba ilegible de tan chica.
  const scale =
    Math.min((height * 0.036) / DESIGN_SIZE, (width * 0.45) / layout.width) * options.scale;
  const renderedSize = DESIGN_SIZE * scale;
  const glow = glowFor(request.fx, renderedSize, palette.scheme) * 0.4;
  // El paso de la grilla parte de la caja real de la fórmula (no solo del
  // cuerpo de letra): con spacing 0 las repeticiones quedan pegadas sin
  // encimarse, aunque la fórmula sea larga.
  const cellX = layout.width * scale + renderedSize * 1.4 * options.spacingX;
  const cellY = layout.height * scale + renderedSize * 2.6 * options.spacingY;
  // Inversa de la base 2:1: un punto de pantalla (X, Y) viene de
  // x = X/2 + Y, y = Y - X/2 — con |X| ≤ w/2 y |Y| ≤ h/2 alcanza con cubrir
  // w/4 + h/2 en cada eje (más una celda de margen).
  const span = width / 4 + height / 2;
  const columns = Math.ceil(span / cellX) + 1;
  const rows = Math.ceil(span / cellY) + 1;

  context.save();
  context.translate(width / 2, height / 2);
  // Base isométrica 2:1 (la misma que usa el pixel-art isométrico clásico).
  context.transform(1, 0.5, -1, 0.5, 0, 0);
  for (let row = -rows; row <= rows; row += 1) {
    for (let column = -columns; column <= columns; column += 1) {
      const accent = (((row + column) % 4) + 4) % 4 === 0;
      drawFormula(context, layout, {
        x: column * cellX,
        y: row * cellY,
        scale,
        color: accent ? palette.accent : palette.fg,
        alpha: accent ? 0.28 : 0.14,
        glow,
      });
    }
  }
  context.restore();
}

function drawDepthComposition(
  context: CanvasRenderingContext2D,
  request: WallpaperRequest,
  layout: FormulaLayout,
): void {
  const { width, height } = request.size;
  const { palette } = request.context;
  const options = optionsFor(request);
  const scale = fitScale(layout, width * 0.6, height * 0.4) * options.scale;
  const renderedSize = DESIGN_SIZE * scale;
  const depth = Math.round(options.layers);
  // La profundidad total (capas × paso) se conserva al cambiar la cantidad de
  // capas: más capas = extrusión más suave, no más larga.
  const step = ((renderedSize * 0.035 * 14) / depth) * options.distance;
  const chroma = chromaFor(request.fx, palette, renderedSize);

  context.save();
  context.translate(width / 2, height / 2);
  context.rotate((options.rotation * Math.PI) / 180);
  for (let layer = depth; layer >= 1; layer -= 1) {
    const amount = 1 - layer / depth;
    drawFormula(context, layout, {
      x: layer * step,
      y: layer * step,
      scale,
      color: mix(palette.bg, palette.accent, 0.2 + 0.6 * amount),
    });
  }
  drawFormula(context, layout, {
    x: 0,
    y: 0,
    scale,
    color: palette.accent,
    glow: glowFor(request.fx, renderedSize, palette.scheme),
    ...(chroma ? { chroma } : {}),
  });
  context.restore();
}

function drawPatternComposition(
  context: CanvasRenderingContext2D,
  request: WallpaperRequest,
  layout: FormulaLayout,
): void {
  const { width, height } = request.size;
  const { palette } = request.context;
  const options = optionsFor(request);
  const scale = fitScale(layout, width * 0.3, height * 0.16) * options.scale;
  const formulaWidth = layout.width * scale;
  const formulaHeight = layout.height * scale;
  // spacing 1 reproduce el paso original (1.45× ancho, 2.3× alto); 0 deja
  // las fórmulas tocándose.
  const stepX = formulaWidth * (1 + 0.45 * options.spacingX);
  const stepY = formulaHeight * (1 + 1.3 * options.spacingY);
  // Diagonal del lienzo: cubre cualquier rotación sin esquinas vacías.
  const span = Math.hypot(width, height) * 0.6 + stepX;
  const rows = Math.ceil(span / stepY);
  const columns = Math.ceil(span / stepX);

  context.save();
  context.translate(width / 2, height / 2);
  context.rotate((options.rotation * Math.PI) / 180);
  for (let row = -rows; row <= rows; row += 1) {
    const offset = row % 2 === 0 ? 0 : stepX / 2;
    const accentRow = row % 3 === 0;
    const rowScale = accentRow ? scale : scale * 0.72;
    for (let column = -columns; column <= columns; column += 1) {
      drawFormula(context, layout, {
        x: column * stepX + offset,
        y: row * stepY,
        scale: rowScale,
        color: accentRow ? palette.accent : palette.fg,
        alpha: accentRow ? 0.16 : 0.1,
      });
    }
  }
  context.restore();

  // El patrón solo no tiene foco: un latido de glow en el centro le da
  // profundidad sin romper la repetición (mismo recurso que el fx neon).
  if (request.fx !== "mono") {
    const gradient = context.createRadialGradient(
      width / 2,
      height / 2,
      0,
      width / 2,
      height / 2,
      Math.min(width, height) * 0.5,
    );
    gradient.addColorStop(0, rgba(palette.accent, 0.1));
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.save();
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.restore();
  }
}

/**
 * Acento / Invertido: la fórmula sola, enorme, sobre un bloque de color
 * pleno. Acento pinta el fondo con el color primario del tema y la fórmula
 * con su contraste (--accent-fg); Invertido usa el color de texto como fondo
 * y el fondo como tinta. Simple y de alto contraste por construcción: cada
 * tema ya define esos pares para ser legibles.
 */
function drawSolidComposition(
  context: CanvasRenderingContext2D,
  request: WallpaperRequest,
  layout: FormulaLayout,
  background: string,
  ink: string,
): void {
  const { width, height } = request.size;
  const { palette, fonts } = request.context;
  const { formula, locale } = request;
  const unit = Math.min(width, height);
  context.save();
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  context.restore();

  const scale = fitScale(layout, width * 0.8, height * 0.44) * optionsFor(request).scale;
  const renderedSize = DESIGN_SIZE * scale;
  const chroma = chromaFor(request.fx, palette, renderedSize);
  drawFormula(context, layout, {
    x: width / 2,
    y: height / 2,
    scale,
    color: ink,
    glow: glowFor(request.fx, renderedSize, palette.scheme) * 0.5,
    ...(chroma ? { chroma: { ...chroma, alpha: chroma.alpha * 0.6 } } : {}),
  });

  const margin = unit * 0.07;
  const captionFont = `500 ${String(Math.round(unit * 0.014))}px ${fonts.mono}`;
  drawText(context, formula.title[locale].toUpperCase(), {
    x: margin,
    y: height - margin,
    font: captionFont,
    color: ink,
    alpha: 0.7,
    align: "left",
  });
  drawText(context, formula.context.author[locale].toUpperCase(), {
    x: width - margin,
    y: height - margin,
    font: captionFont,
    color: ink,
    alpha: 0.7,
    align: "right",
  });
}

/** Efectos de la fórmula protagonista (glow + chroma) para un cuerpo de letra dado. */
function heroFx(
  request: WallpaperRequest,
  renderedSize: number,
): Pick<DrawOptions, "glow" | "chroma"> {
  const { palette } = request.context;
  const chroma = chromaFor(request.fx, palette, renderedSize);
  return {
    glow: glowFor(request.fx, renderedSize, palette.scheme),
    ...(chroma ? { chroma } : {}),
  };
}

/**
 * Suizo: póster tipográfico internacional. El primer año de la línea de
 * tiempo en gigante, recortado contra el borde; la fórmula alineada a la
 * izquierda y una columna de texto (título, autor, historia) a la derecha.
 */
function drawSwissComposition(
  context: CanvasRenderingContext2D,
  request: WallpaperRequest,
  layout: FormulaLayout,
): void {
  const { width, height } = request.size;
  const { palette, fonts } = request.context;
  const { formula, locale } = request;
  const options = optionsFor(request);
  const portrait = height > width;
  const unit = Math.min(width, height);
  const margin = unit * 0.07;
  const year = formula.context.timeline[0]?.year ?? formula.context.era[locale];

  const yearSize = height * (portrait ? 0.16 : 0.32);
  context.save();
  context.font = `800 ${String(Math.round(yearSize))}px ${fonts.prose}`;
  const yearWidth = context.measureText(year).width;
  context.restore();
  const yearScale = Math.min(1, (width * (portrait ? 1.05 : 0.72)) / Math.max(1, yearWidth));
  drawText(context, year, {
    x: margin * 0.6,
    y: margin + yearSize * yearScale * 0.72,
    font: `800 ${String(Math.round(yearSize * yearScale))}px ${fonts.prose}`,
    color: palette.accent,
    align: "left",
  });

  const scale =
    fitScale(layout, width * (portrait ? 0.86 : 0.6), height * (portrait ? 0.1 : 0.17)) *
    options.scale;
  const formulaY = height * (portrait ? 0.46 : 0.66);
  drawFormula(context, layout, {
    x: margin,
    y: formulaY,
    scale,
    color: palette.fg,
    align: "left",
    ...heroFx(request, DESIGN_SIZE * scale),
  });

  const columnX = portrait ? margin : width * 0.7;
  const columnWidth = portrait ? width - margin * 2 : width * 0.3 - margin;
  let cursor = portrait ? formulaY + layout.height * scale + unit * 0.08 : margin * 1.3;

  const titleSize = unit * 0.036;
  context.save();
  context.font = `700 ${String(Math.round(titleSize))}px ${fonts.prose}`;
  const titleLines = wrapText(context, formula.title[locale], columnWidth, 3, locale);
  context.restore();
  for (const line of titleLines) {
    cursor += titleSize * 1.1;
    drawText(context, line, {
      x: columnX,
      y: cursor,
      font: `700 ${String(Math.round(titleSize))}px ${fonts.prose}`,
      color: palette.fg,
      align: "left",
    });
  }

  const metaSize = unit * 0.015;
  cursor += metaSize * 2.6;
  drawText(context, formula.context.author[locale].toUpperCase(), {
    x: columnX,
    y: cursor,
    font: `500 ${String(Math.round(metaSize))}px ${fonts.mono}`,
    color: palette.accent,
    align: "left",
  });

  const bodySize = unit * 0.017;
  const bodyFont = `400 ${String(Math.round(bodySize))}px ${fonts.prose}`;
  const bodyBottom = portrait ? height - margin * 1.6 : height * 0.56;
  cursor += bodySize * 2;
  const maxLines = Math.max(1, Math.floor((bodyBottom - cursor) / (bodySize * 1.45)));
  context.save();
  context.font = bodyFont;
  const bodyLines = wrapText(
    context,
    formula.context.history[locale],
    columnWidth,
    maxLines,
    locale,
  );
  context.restore();
  for (const line of bodyLines) {
    cursor += bodySize * 1.45;
    drawText(context, line, {
      x: columnX,
      y: cursor,
      font: bodyFont,
      color: palette.fg,
      alpha: 0.72,
      align: "left",
    });
  }

  const footerFont = `500 ${String(Math.round(unit * 0.012))}px ${fonts.mono}`;
  drawText(context, formula.category[locale].toUpperCase(), {
    x: margin,
    y: height - margin * 0.7,
    font: footerFont,
    color: palette.fg,
    alpha: 0.5,
    align: "left",
  });
  drawText(context, "MATH GOT MOTION", {
    x: width - margin,
    y: height - margin * 0.7,
    font: footerFont,
    color: palette.fg,
    alpha: 0.5,
    align: "right",
  });
}

/**
 * Anatomía: la fórmula despiezada (con aire entre símbolos, como en el
 * "despegue" de la app), cada símbolo numerado, y una leyenda que explica
 * cada número — la lámina de un manual de ciencia.
 */
function drawAnatomyComposition(
  context: CanvasRenderingContext2D,
  request: WallpaperRequest,
  layout: FormulaLayout,
): void {
  const { width, height } = request.size;
  const { palette, fonts } = request.context;
  const { formula, locale } = request;
  const options = optionsFor(request);
  const portrait = height > width;
  const unit = Math.min(width, height);
  const margin = unit * 0.07;
  const count = layout.glyphs.length;

  const spread = DESIGN_SIZE * 0.55 * options.spacingX;
  const spreadLayout: FormulaLayout = {
    ...layout,
    glyphs: layout.glyphs.map((glyph, index) => ({ ...glyph, x: glyph.x + index * spread })),
    width: layout.width + Math.max(0, count - 1) * spread,
  };
  const scale =
    fitScale(spreadLayout, width * 0.84, height * (portrait ? 0.1 : 0.2)) * options.scale;
  const centerY = height * (portrait ? 0.28 : 0.34);
  drawFormula(context, spreadLayout, {
    x: width / 2,
    y: centerY,
    scale,
    color: palette.accent,
    ...heroFx(request, DESIGN_SIZE * scale),
  });

  // Número de cada símbolo, arriba de su glifo.
  const indexSize = unit * 0.016;
  const indexFont = `500 ${String(Math.round(indexSize))}px ${fonts.mono}`;
  const formulaTop = centerY - (spreadLayout.height * scale) / 2;
  for (const [index, glyph] of spreadLayout.glyphs.entries()) {
    const glyphCenter = width / 2 + (glyph.x + glyph.width / 2 - spreadLayout.width / 2) * scale;
    drawText(context, String(index + 1).padStart(2, "0"), {
      x: glyphCenter,
      y: formulaTop - indexSize * 1.2,
      font: indexFont,
      color: palette.fg,
      alpha: 0.6,
    });
  }

  drawText(context, formula.title[locale].toUpperCase(), {
    x: margin,
    y: margin,
    font: `500 ${String(Math.round(unit * 0.014))}px ${fonts.mono}`,
    color: palette.fg,
    alpha: 0.55,
    align: "left",
  });

  // Leyenda en columnas: el tamaño de letra se ajusta a la cantidad de nodos.
  const columns = portrait ? (count > 6 ? 2 : 1) : count <= 4 ? 2 : count <= 9 ? 3 : 4;
  const rows = Math.ceil(count / columns);
  const gutter = unit * 0.04;
  const top = centerY + (spreadLayout.height * scale) / 2 + unit * 0.09;
  const bottom = height - margin;
  const columnWidth = (width - margin * 2 - gutter * (columns - 1)) / columns;
  const entryHeight = (bottom - top) / rows;
  const textSize = Math.min(unit * 0.016, entryHeight / 4.4);
  const lineHeight = textSize * 1.4;
  const maxLines = Math.max(
    1,
    Math.min(4, Math.floor((entryHeight - textSize * 2.4) / lineHeight)),
  );
  const textFont = `400 ${String(Math.round(textSize))}px ${fonts.prose}`;

  for (const [index, node] of formula.nodes.entries()) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = margin + column * (columnWidth + gutter);
    const y = top + row * entryHeight;
    drawText(context, `${String(index + 1).padStart(2, "0")}  ${node.value}`, {
      x,
      y: y + textSize,
      font: `600 ${String(Math.round(textSize * 1.15))}px ${fonts.mono}`,
      color: palette.accent,
      align: "left",
    });
    context.save();
    context.font = textFont;
    const lines = wrapText(context, node.explanation[locale], columnWidth, maxLines, locale);
    context.restore();
    for (const [lineIndex, line] of lines.entries()) {
      drawText(context, line, {
        x,
        y: y + textSize * 2.3 + lineIndex * lineHeight,
        font: textFont,
        color: palette.fg,
        alpha: 0.72,
        align: "left",
      });
    }
  }
}

/**
 * Macro: un solo símbolo en tamaño monumental, recortado contra el borde, con
 * la fórmula completa chica abajo (el símbolo resaltado) y su explicación.
 */
function drawMacroComposition(
  context: CanvasRenderingContext2D,
  request: WallpaperRequest,
  layout: FormulaLayout,
): void {
  const { width, height } = request.size;
  const { palette, fonts } = request.context;
  const { formula, locale } = request;
  const options = optionsFor(request);
  const portrait = height > width;
  const unit = Math.min(width, height);
  const margin = unit * 0.07;
  const focus = Math.min(Math.max(0, Math.round(options.focus)), layout.glyphs.length - 1);
  const glyph = layout.glyphs[focus];
  const node = formula.nodes[focus];
  if (!glyph || !node) return;

  const giantFont = `500 ${String(DESIGN_SIZE)}px ${request.context.fonts.formula}`;
  context.save();
  context.font = giantFont;
  const metrics = context.measureText(glyph.value);
  context.restore();
  const ascent = metrics.actualBoundingBoxAscent || DESIGN_SIZE * 0.75;
  const descent = metrics.actualBoundingBoxDescent || 0;
  const glyphHeight = ascent + descent;
  const giantScale =
    Math.min(
      (height * (portrait ? 0.62 : 1.02)) / glyphHeight,
      (width * (portrait ? 1.1 : 0.9)) / Math.max(1, metrics.width),
    ) * options.scale;
  const renderedSize = DESIGN_SIZE * giantScale;
  const fx = heroFx(request, renderedSize * 0.4);

  context.save();
  context.translate(width * (portrait ? 0.56 : 0.64), height * (portrait ? 0.4 : 0.54));
  context.rotate((options.rotation * Math.PI) / 180);
  context.scale(giantScale, giantScale);
  context.font = giantFont;
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  const baselineY = (ascent - descent) / 2;
  const paintGiant = (color: string, offset: number, alpha: number) => {
    context.globalAlpha = alpha;
    context.fillStyle = color;
    context.fillText(glyph.value, offset / giantScale, baselineY);
  };
  if (fx.chroma) {
    paintGiant(fx.chroma.colorA, -fx.chroma.offset, fx.chroma.alpha);
    paintGiant(fx.chroma.colorB, fx.chroma.offset, fx.chroma.alpha);
  }
  if (fx.glow) {
    context.shadowColor = palette.accent;
    context.shadowBlur = fx.glow;
  }
  paintGiant(palette.accent, 0, 1);
  context.restore();

  // Bloque inferior izquierdo: número, explicación y la fórmula completa.
  const smallScale = fitScale(layout, width * (portrait ? 0.8 : 0.34), height * 0.06);
  const formulaY = height - margin - (layout.height * smallScale) / 2;
  drawFormula(context, layout, {
    x: margin,
    y: formulaY,
    scale: smallScale,
    color: palette.fg,
    alpha: 1,
    align: "left",
    glyphColor: (index) => (index === focus ? palette.accent : rgba(palette.fg, 0.45)),
  });

  const textSize = unit * 0.02;
  const textFont = `400 ${String(Math.round(textSize))}px ${fonts.prose}`;
  context.save();
  context.font = textFont;
  const lines = wrapText(
    context,
    node.explanation[locale],
    width * (portrait ? 0.84 : 0.34),
    4,
    locale,
  );
  context.restore();
  let cursor = formulaY - (layout.height * smallScale) / 2 - unit * 0.035;
  for (const line of [...lines].reverse()) {
    drawText(context, line, {
      x: margin,
      y: cursor,
      font: textFont,
      color: palette.fg,
      alpha: 0.82,
      align: "left",
    });
    cursor -= textSize * 1.45;
  }
  drawText(
    context,
    `${String(focus + 1).padStart(2, "0")} / ${String(layout.glyphs.length).padStart(2, "0")}`,
    {
      x: margin,
      y: cursor - textSize * 0.6,
      font: `500 ${String(Math.round(unit * 0.015))}px ${fonts.mono}`,
      color: palette.accent,
      align: "left",
    },
  );

  drawText(context, formula.title[locale].toUpperCase(), {
    x: margin,
    y: margin,
    font: `500 ${String(Math.round(unit * 0.014))}px ${fonts.mono}`,
    color: palette.fg,
    alpha: 0.55,
    align: "left",
  });
}

/**
 * Aura: manchas de luz difusas derivadas del acento (tonos vecinos en la
 * rueda de color) detrás de la fórmula. La semilla sale del id de la
 * fórmula: cada una tiene su propia aura, estable entre renders.
 */
function drawAuraComposition(
  context: CanvasRenderingContext2D,
  request: WallpaperRequest,
  layout: FormulaLayout,
): void {
  const { width, height } = request.size;
  const { palette, fonts } = request.context;
  const { formula, locale } = request;
  const options = optionsFor(request);
  const unit = Math.min(width, height);
  const blobs = Math.max(1, Math.round(options.count));
  const random = seededRandom(hashString(formula.id));
  const rotation = (options.rotation * Math.PI) / 180;
  // En temas mono el acento es el propio --fg (sin tono): las manchas serían
  // gris puro y le quitarían contraste a la fórmula, así que van más tenues.
  const tinted = shiftHue(palette.accent, 90) !== palette.accent;
  const alpha = (palette.scheme === "dark" ? 0.3 : 0.22) * (tinted ? 1 : 0.45);

  context.save();
  for (let index = 0; index < blobs; index += 1) {
    const angle = rotation + (index / blobs) * Math.PI * 2 + random() * 0.8;
    const distance = unit * (0.12 + random() * 0.38);
    const x = width / 2 + Math.cos(angle) * distance * (width / unit) * 0.7;
    const y = height / 2 + Math.sin(angle) * distance;
    // Radios moderados y tonos vecinos (±45°): varias manchas sumadas no
    // deben tapar el fondo entero, que es lo que le da profundidad al aura.
    const radius = unit * (0.3 + random() * 0.32);
    const hue = blobs === 1 ? 0 : (index / (blobs - 1) - 0.5) * 90;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, rgba(shiftHue(palette.accent, hue), alpha));
    gradient.addColorStop(0.55, rgba(shiftHue(palette.accent, hue), alpha * 0.35));
    gradient.addColorStop(1, rgba(shiftHue(palette.accent, hue), 0));
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }
  context.restore();

  const scale = fitScale(layout, width * 0.62, height * 0.26) * options.scale;
  const renderedSize = DESIGN_SIZE * scale;
  const fx = heroFx(request, renderedSize);
  drawFormula(context, layout, {
    x: width / 2,
    y: height / 2,
    scale,
    color: palette.fg,
    ...fx,
    glow: Math.max(fx.glow ?? 0, renderedSize * 0.05),
  });

  drawText(context, formula.title[locale].toUpperCase(), {
    x: width / 2,
    y: height / 2 + (layout.height * scale) / 2 + unit * 0.07,
    font: `500 ${String(Math.round(unit * 0.015))}px ${fonts.mono}`,
    color: palette.fg,
    alpha: 0.6,
  });
}

/**
 * Eco: la fórmula rellena en el centro y copias huecas (solo contorno)
 * alejándose arriba y abajo, cada vez más tenues — como ondas de sonido.
 */
function drawEchoComposition(
  context: CanvasRenderingContext2D,
  request: WallpaperRequest,
  layout: FormulaLayout,
): void {
  const { width, height } = request.size;
  const { palette } = request.context;
  const options = optionsFor(request);
  const unit = Math.min(width, height);
  const copies = Math.max(1, Math.round(options.count));
  const scale = fitScale(layout, width * 0.72, height * 0.18) * options.scale;
  const step = layout.height * scale * (0.45 + 0.75 * options.spacingY);
  const outline = Math.max(1, unit * 0.0022);

  context.save();
  context.translate(width / 2, height / 2);
  context.rotate((options.rotation * Math.PI) / 180);
  for (let copy = copies; copy >= 1; copy -= 1) {
    const fade = 1 - copy / (copies + 1);
    for (const direction of [-1, 1]) {
      drawFormula(context, layout, {
        x: 0,
        y: direction * copy * step,
        scale,
        color: copy % 2 === 0 ? palette.fg : palette.accent,
        alpha: 0.12 + 0.55 * fade,
        outline,
      });
    }
  }
  drawFormula(context, layout, {
    x: 0,
    y: 0,
    scale,
    color: palette.accent,
    ...heroFx(request, DESIGN_SIZE * scale),
  });
  context.restore();
}

/** Dibuja un glifo suelto rotado sobre un punto (órbita/espiral). */
function drawGlyphAt(
  context: CanvasRenderingContext2D,
  glyph: Glyph,
  x: number,
  y: number,
  angle: number,
  scale: number,
  color: string,
  alpha: number,
): void {
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.translate(x, y);
  context.rotate(angle);
  context.scale(scale, scale);
  context.font = glyph.font;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(glyph.value, 0, glyph.dy);
  context.restore();
}

/**
 * Órbita: la fórmula al centro y sus símbolos girando en anillos
 * concéntricos, cada anillo más grande y tenue — como un sistema planetario.
 */
function drawOrbitComposition(
  context: CanvasRenderingContext2D,
  request: WallpaperRequest,
  layout: FormulaLayout,
): void {
  const { width, height } = request.size;
  const { palette } = request.context;
  const options = optionsFor(request);
  const unit = Math.min(width, height);
  const rings = Math.max(1, Math.round(options.count));
  const cx = width / 2;
  const cy = height / 2;
  const inner = unit * 0.24 * options.radius;
  const outer = Math.hypot(width, height) / 2;
  const ringGap = Math.max(unit * 0.04, (outer - inner) / rings);
  const rotation = (options.rotation * Math.PI) / 180;

  for (let ring = 0; ring < rings; ring += 1) {
    const radius = inner + ring * ringGap + ringGap * 0.35;
    const glyphScale = (Math.min(radius * 0.09, ringGap * 0.42) / DESIGN_SIZE) * options.scale;
    const gap = DESIGN_SIZE * 0.45;
    const sequenceWidth =
      layout.glyphs.reduce((sum, glyph) => sum + glyph.width + gap, 0) * glyphScale;
    const circumference = Math.PI * 2 * radius;
    const repeats = Math.max(1, Math.floor(circumference / sequenceWidth));
    const stretch = circumference / (repeats * sequenceWidth);
    const color = ring % 2 === 0 ? palette.accent : palette.fg;
    const alpha = 0.7 - (0.5 * ring) / Math.max(1, rings - 1 || 1);
    let angle = rotation + ring * 0.9;

    for (let repeat = 0; repeat < repeats; repeat += 1) {
      for (const glyph of layout.glyphs) {
        const advance = ((glyph.width + gap) * glyphScale * stretch) / radius;
        const center = angle + advance / 2;
        drawGlyphAt(
          context,
          glyph,
          cx + Math.cos(center) * radius,
          cy + Math.sin(center) * radius,
          center + Math.PI / 2,
          glyphScale,
          color,
          alpha,
        );
        angle += advance;
      }
    }
  }

  const scale = fitScale(layout, inner * 1.5, inner * 0.5) * options.scale;
  drawFormula(context, layout, {
    x: cx,
    y: cy,
    scale,
    color: palette.accent,
    ...heroFx(request, DESIGN_SIZE * scale),
  });
}

/**
 * Espiral: los símbolos de la fórmula, uno tras otro, recorriendo una
 * espiral logarítmica (la de la concha del nautilus) que crece desde el
 * centro hasta salirse del lienzo.
 */
function drawSpiralComposition(
  context: CanvasRenderingContext2D,
  request: WallpaperRequest,
  layout: FormulaLayout,
): void {
  const { width, height } = request.size;
  const { palette } = request.context;
  const options = optionsFor(request);
  const unit = Math.min(width, height);
  const cx = width / 2;
  const cy = height / 2;
  const growth = 0.085 * options.radius;
  const sizeFactor = 0.2 * options.scale;
  const start = unit * 0.03;
  const limit = Math.hypot(width, height) / 2 + unit * 0.1;
  const gap = DESIGN_SIZE * 0.3;
  const count = layout.glyphs.length;
  let theta = 0;
  let index = 0;

  while (index < 6000) {
    const radius = start * Math.exp(growth * theta);
    if (radius > limit) break;
    const glyph = layout.glyphs[index % count];
    if (!glyph) break;
    const glyphScale = (radius * sizeFactor) / DESIGN_SIZE;
    // El avance angular es constante por glifo: el ancho crece con el radio.
    const advance = ((glyph.width + gap) * sizeFactor) / DESIGN_SIZE;
    const center = theta + advance / 2 + (options.rotation * Math.PI) / 180;
    const progress = radius / limit;
    const lap = Math.floor(index / count);
    drawGlyphAt(
      context,
      glyph,
      cx + Math.cos(center) * radius,
      cy + Math.sin(center) * radius,
      center + Math.PI / 2,
      glyphScale,
      lap % 2 === 0 ? palette.accent : palette.fg,
      Math.max(0.12, 0.95 - progress * 0.75),
    );
    theta += advance;
    index += 1;
  }
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("canvas.toBlob() returned null"));
    }, "image/png");
  });
}

/**
 * Espera a que las fuentes del preset estén listas para rasterizar. Las del
 * preset activo ya cargaron para la app (typeReady), pero una exportación
 * puede pedirse en el primer frame: esperar acá evita dibujar con la fuente
 * de fallback.
 */
export async function ensureWallpaperFonts(context: WallpaperContext): Promise<void> {
  await document.fonts.ready;
  try {
    await document.fonts.load(`500 ${String(DESIGN_SIZE)}px ${context.fonts.formula}`);
    await document.fonts.load(`700 ${String(DESIGN_SIZE)}px ${context.fonts.prose}`);
    await document.fonts.load(`800 ${String(DESIGN_SIZE)}px ${context.fonts.prose}`);
    await document.fonts.load(`500 ${String(DESIGN_SIZE)}px ${context.fonts.mono}`);
  } catch {
    // Stack inválido para document.fonts: se usa el fallback del navegador.
  }
}

/**
 * Dibuja la composición completa sobre `canvas`, que ya debe tener el
 * tamaño de `request.size`. Es sincrónico (las fuentes se esperan antes con
 * ensureWallpaperFonts) para que el preview en vivo pueda redibujar en cada
 * frame de un slider. Como todas las medidas son proporcionales al lienzo, un
 * preview a menor resolución es la misma imagen que el PNG final, reducida.
 */
export function drawWallpaper(canvas: HTMLCanvasElement, request: WallpaperRequest): void {
  const { width, height } = request.size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("2D canvas context is not available");

  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = request.context.palette.bg;
  context.fillRect(0, 0, width, height);
  context.textAlign = "center";
  context.textBaseline = "alphabetic";

  const layout = layoutFormula(context, request.formula, request.context.fonts.formula);

  switch (request.style) {
    case "formula": {
      drawFormulaComposition(context, request, layout);
      break;
    }
    case "poster": {
      drawPosterComposition(context, request, layout);
      break;
    }
    case "isometric": {
      drawIsometricComposition(context, request, layout);
      break;
    }
    case "depth": {
      drawDepthComposition(context, request, layout);
      break;
    }
    case "pattern": {
      drawPatternComposition(context, request, layout);
      break;
    }
    case "accent": {
      const { palette } = request.context;
      drawSolidComposition(context, request, layout, palette.accent, palette.accentFg);
      break;
    }
    case "inverted": {
      const { palette } = request.context;
      drawSolidComposition(context, request, layout, palette.fg, palette.bg);
      break;
    }
    case "swiss": {
      drawSwissComposition(context, request, layout);
      break;
    }
    case "anatomy": {
      drawAnatomyComposition(context, request, layout);
      break;
    }
    case "macro": {
      drawMacroComposition(context, request, layout);
      break;
    }
    case "aura": {
      drawAuraComposition(context, request, layout);
      break;
    }
    case "echo": {
      drawEchoComposition(context, request, layout);
      break;
    }
    case "orbit": {
      drawOrbitComposition(context, request, layout);
      break;
    }
    case "spiral": {
      drawSpiralComposition(context, request, layout);
      break;
    }
  }

  applyFx(context, request.fx, request.context.palette, width, height);
  context.restore();
}

/** Genera el PNG a resolución completa. */
export async function renderWallpaper(request: WallpaperRequest): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = request.size.width;
  canvas.height = request.size.height;
  await ensureWallpaperFonts(request.context);
  drawWallpaper(canvas, request);
  return canvasToBlob(canvas);
}

export function downloadWallpaper(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
