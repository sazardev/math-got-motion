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

export type WallpaperStyle = "formula" | "poster" | "isometric" | "depth" | "pattern";
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

export interface WallpaperRequest {
  formula: Formula;
  locale: Locale;
  style: WallpaperStyle;
  size: WallpaperSize;
  fx: FxPreset;
  context: WallpaperContext;
}

/** Tamaño de diseño del layout de glifos; el render escala desde acá. */
const DESIGN_SIZE = 100;

/* ------------------------------------------------------------------ */
/* Color                                                               */
/* ------------------------------------------------------------------ */

function parseHex(color: string): [number, number, number] | null {
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
    glyphs.push({ value: node.value, x, dy: superscript ? -DESIGN_SIZE * 0.35 : 0, font });
    x += context.measureText(node.value).width;
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
}

function drawFormula(
  context: CanvasRenderingContext2D,
  layout: FormulaLayout,
  options: DrawOptions,
): void {
  const { x, y, scale, color, alpha = 1, glow = 0, chroma } = options;
  const baseline = -(layout.top + layout.height / 2);

  const paint = (fill: string, offsetX: number, paintAlpha: number) => {
    context.save();
    context.globalAlpha = paintAlpha;
    context.fillStyle = fill;
    if (glow > 0) {
      context.shadowColor = fill;
      context.shadowBlur = glow;
    }
    context.translate(x + offsetX, y);
    context.scale(scale, scale);
    context.textAlign = "left";
    for (const glyph of layout.glyphs) {
      context.font = glyph.font;
      // -layout.width/2 centra la fórmula en (x, y); el baseline la centra
      // verticalmente usando la caja real medida en layoutFormula.
      context.fillText(glyph.value, glyph.x - layout.width / 2, baseline + glyph.dy);
    }
    context.restore();
  };

  if (chroma) {
    paint(chroma.colorA, -chroma.offset, chroma.alpha);
    paint(chroma.colorB, chroma.offset, chroma.alpha);
  }
  paint(color, 0, alpha);
}

interface TextOptions {
  x: number;
  y: number;
  font: string;
  color: string;
  alpha?: number;
}

function drawText(context: CanvasRenderingContext2D, text: string, options: TextOptions): void {
  const { x, y, font, color, alpha = 1 } = options;
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.font = font;
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.fillText(text, x, y);
  context.restore();
}

/* ------------------------------------------------------------------ */
/* Efectos (mismo lenguaje que FxLayer.css)                            */
/* ------------------------------------------------------------------ */

function glowFor(fx: FxPreset, renderedSize: number, scheme: "dark" | "light"): number {
  if (fx === "neon") return scheme === "dark" ? renderedSize * 0.09 : 0;
  if (fx === "crt") return renderedSize * 0.05;
  if (fx === "vhs") return renderedSize * 0.03;
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

function drawGrain(
  context: CanvasRenderingContext2D,
  palette: WallpaperPalette,
  width: number,
  height: number,
): void {
  const tile = document.createElement("canvas");
  tile.width = 128;
  tile.height = 128;
  const tileContext = tile.getContext("2d");
  if (!tileContext) return;
  const rgb = parseHex(palette.fg) ?? [255, 255, 255];
  const image = tileContext.createImageData(tile.width, tile.height);
  for (let index = 0; index < image.data.length; index += 4) {
    image.data[index] = rgb[0];
    image.data[index + 1] = rgb[1];
    image.data[index + 2] = rgb[2];
    // Disperso (casi la mitad transparente): se lee como grano fílmico y
    // comprime mucho mejor que ruido lleno.
    image.data[index + 3] = Math.random() < 0.45 ? 0 : Math.random() * 80;
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
  const scale = fitScale(layout, width * 0.78, height * 0.5);
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
  const scale = fitScale(layout, width * 0.66, height * 0.34);
  const renderedSize = DESIGN_SIZE * scale;
  const chroma = chromaFor(request.fx, palette, renderedSize);

  drawText(context, formula.category[locale].toUpperCase(), {
    x: width / 2,
    y: height * 0.16,
    font: `500 ${String(Math.round(height * 0.014))}px ${fonts.mono}`,
    color: palette.fg,
    alpha: 0.55,
  });

  drawFormula(context, layout, {
    x: width / 2,
    y: height * 0.44,
    scale,
    color: palette.accent,
    glow: glowFor(request.fx, renderedSize, palette.scheme),
    ...(chroma ? { chroma } : {}),
  });

  drawText(context, formula.title[locale], {
    x: width / 2,
    y: height * 0.66,
    font: `700 ${String(Math.round(height * 0.042))}px ${fonts.prose}`,
    color: palette.fg,
  });

  drawText(context, `${formula.context.author[locale]} · ${formula.context.era[locale]}`, {
    x: width / 2,
    y: height * 0.72,
    font: `500 ${String(Math.round(height * 0.018))}px ${fonts.mono}`,
    color: palette.fg,
    alpha: 0.7,
  });
}

function drawIsometricComposition(
  context: CanvasRenderingContext2D,
  request: WallpaperRequest,
  layout: FormulaLayout,
): void {
  const { width, height } = request.size;
  const { palette } = request.context;
  const scale = fitScale(layout, width * 0.16, height * 0.16) * 0.7;
  const renderedSize = DESIGN_SIZE * scale;
  const glow = glowFor(request.fx, renderedSize, palette.scheme) * 0.4;
  const cell = renderedSize * 4.2;
  const span = Math.max(width, height) * 2.2;
  let index = 0;

  context.save();
  context.translate(width / 2, height / 2);
  // Base isométrica 2:1 (la misma que usa el pixel-art isométrico clásico).
  context.transform(1, 0.5, -1, 0.5, 0, 0);
  for (let gridY = -span; gridY <= span; gridY += cell) {
    for (let gridX = -span; gridX <= span; gridX += cell) {
      index += 1;
      const accent = index % 4 === 0;
      drawFormula(context, layout, {
        x: gridX,
        y: gridY,
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
  const scale = fitScale(layout, width * 0.6, height * 0.4);
  const renderedSize = DESIGN_SIZE * scale;
  const depth = 14;
  const step = renderedSize * 0.035;
  const chroma = chromaFor(request.fx, palette, renderedSize);

  context.save();
  context.translate(width / 2, height / 2);
  context.rotate(-0.1);
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
  const scale = fitScale(layout, width * 0.3, height * 0.16);
  const stepX = layout.width * scale * 1.45;
  const stepY = layout.height * scale * 2.3;
  const span = Math.max(width, height) * 1.6;
  let row = 0;

  context.save();
  context.translate(width / 2, height / 2);
  context.rotate(-Math.PI / 7);
  for (let y = -span; y <= span; y += stepY) {
    const offset = row % 2 === 0 ? 0 : stepX / 2;
    const accentRow = row % 3 === 0;
    const rowScale = accentRow ? scale : scale * 0.72;
    for (let x = -span; x <= span; x += stepX) {
      drawFormula(context, layout, {
        x: x + offset,
        y,
        scale: rowScale,
        color: accentRow ? palette.accent : palette.fg,
        alpha: accentRow ? 0.16 : 0.1,
      });
    }
    row += 1;
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

/** Genera el PNG a resolución completa. */
export async function renderWallpaper(request: WallpaperRequest): Promise<Blob> {
  const { width, height } = request.size;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("2D canvas context is not available");

  // Las fuentes del preset activo ya cargaron para la app (typeReady), pero
  // una exportación puede pedirse en el primer frame: esperar acá evita
  // rasterizar con la fuente de fallback.
  await document.fonts.ready;
  try {
    await document.fonts.load(`500 ${String(DESIGN_SIZE)}px ${request.context.fonts.formula}`);
    await document.fonts.load(`700 ${String(DESIGN_SIZE)}px ${request.context.fonts.prose}`);
  } catch {
    // Stack inválido para document.fonts: se usa el fallback del navegador.
  }

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
  }

  applyFx(context, request.fx, request.context.palette, width, height);

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
