import {
  DESIGN_SIZE,
  chromaFor,
  drawText,
  fitScale,
  glowFor,
  type Chroma,
  type FormulaLayout,
  type Glyph,
  type WallpaperFonts,
  type WallpaperOptions,
  type WallpaperPalette,
} from "./wallpaper";

import type { VideoRequest } from "./video-wallpaper";

/**
 * Herramientas compartidas por las escenas de video: el entorno de dibujo,
 * las funciones de tiempo (fase 0–1 de un bucle) y los dibujantes de glifos.
 */

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

export const TAU = Math.PI * 2;

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
export const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;
export const fract = (value: number) => value - Math.floor(value);
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOut = (t: number) => 1 - (1 - t) ** 3;
/** 0 en los extremos de la vuelta, 1 en el medio: para fundidos que cierran el bucle. */
export const bump = (phase: number) => 0.5 - 0.5 * Math.cos(TAU * phase);

export interface Env {
  context: CanvasRenderingContext2D;
  request: VideoRequest;
  layout: FormulaLayout;
  width: number;
  height: number;
  unit: number;
  palette: WallpaperPalette;
  fonts: WallpaperFonts;
  options: WallpaperOptions;
  seed: number;
}

export interface Scene {
  /** Duración base de una vuelta, en segundos, antes de aplicar la velocidad. */
  period: number;
  draw: (phase: number) => void;
}

export type SceneFactory = (env: Env) => Scene;

export interface Pose {
  cx: number;
  cy: number;
  scale: number;
  dx?: number;
  dy?: number;
  rotation?: number;
  grow?: number;
  color: string;
  alpha?: number;
  glow?: number;
  outline?: number;
  chroma?: Chroma;
  /** 0–1: dibuja solo ese tramo del contorno (requiere `outline`). */
  reveal?: number;
}

/**
 * Dibuja un glifo de la fórmula en su lugar de la composición centrada en
 * (cx, cy), con un desplazamiento/rotación/crecimiento propios. Pivota sobre
 * el centro vertical de la fórmula, igual que drawFormula.
 */
export function drawGlyphPose(
  context: CanvasRenderingContext2D,
  layout: FormulaLayout,
  glyph: Glyph | undefined,
  pose: Pose,
): void {
  const { cx, cy, scale, dx = 0, dy = 0, rotation = 0, grow = 1, color, alpha = 1 } = pose;
  const { glow = 0, outline, chroma, reveal } = pose;
  if (!glyph || alpha <= 0.003) return;
  if (reveal !== undefined && reveal <= 0) return;
  const baseline = -(layout.top + layout.height / 2);
  const centerX = (glyph.x + glyph.width / 2 - layout.width / 2) * scale;

  const paint = (fill: string, offsetX: number, paintAlpha: number) => {
    const size = scale * grow;
    context.save();
    context.globalAlpha = Math.min(1, paintAlpha);
    if (glow > 0) {
      context.shadowColor = fill;
      context.shadowBlur = glow;
    }
    context.translate(cx + centerX + dx + offsetX, cy + dy);
    context.rotate(rotation);
    context.scale(size, size);
    context.font = glyph.font;
    context.textAlign = "center";
    context.textBaseline = "alphabetic";
    const y = baseline + glyph.dy;
    if (outline) {
      context.lineWidth = outline / size;
      context.lineJoin = "round";
      context.strokeStyle = fill;
      if (reveal !== undefined && reveal < 1) {
        const length = DESIGN_SIZE * 9;
        context.setLineDash([length, length * 1000]);
        context.lineDashOffset = length * (1 - reveal);
      }
      context.strokeText(glyph.value, 0, y);
    } else {
      context.fillStyle = fill;
      context.fillText(glyph.value, 0, y);
    }
    context.restore();
  };

  if (chroma) {
    paint(chroma.colorA, -chroma.offset, chroma.alpha * alpha);
    paint(chroma.colorB, chroma.offset, chroma.alpha * alpha);
  }
  paint(color, 0, alpha);
}

/** Símbolo suelto (partículas, lluvia, gigante) con un cuerpo de letra arbitrario. */
export function drawLoose(
  env: Env,
  value: string,
  x: number,
  y: number,
  size: number,
  color: string,
  alpha: number,
  rotation = 0,
): void {
  if (alpha <= 0.003) return;
  const { context } = env;
  context.save();
  context.globalAlpha = Math.min(1, alpha);
  context.fillStyle = color;
  context.font = `500 ${String(Math.round(size))}px ${env.fonts.formula}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  if (rotation === 0) {
    context.fillText(value, x, y);
  } else {
    context.translate(x, y);
    context.rotate(rotation);
    context.fillText(value, 0, 0);
  }
  context.restore();
}

export function heroFx(env: Env, renderedSize: number): { glow: number; chroma?: Chroma } {
  const { fx } = env.request;
  const chroma = chromaFor(fx, env.palette, renderedSize);
  return {
    glow: glowFor(fx, renderedSize, env.palette.scheme),
    ...(chroma ? { chroma } : {}),
  };
}

export function heroScale(env: Env, widthFraction: number, heightFraction: number): number {
  return (
    fitScale(env.layout, env.width * widthFraction, env.height * heightFraction) * env.options.scale
  );
}

/** Título + autor al pie: da contexto sin competir con la fórmula. */
export function drawCaption(env: Env, alpha: number): void {
  if (alpha <= 0.01 || !env.request.details) return;
  const { context, request, palette, fonts, width, height, unit } = env;
  const { formula, locale } = request;
  drawText(context, formula.title[locale].toUpperCase(), {
    x: width / 2,
    y: height - unit * 0.09,
    font: `500 ${String(Math.round(unit * 0.016))}px ${fonts.mono}`,
    color: palette.fg,
    alpha: 0.6 * alpha,
  });
  drawText(context, `${formula.context.author[locale]} · ${formula.context.era[locale]}`, {
    x: width / 2,
    y: height - unit * 0.06,
    font: `500 ${String(Math.round(unit * 0.012))}px ${fonts.mono}`,
    color: palette.fg,
    alpha: 0.4 * alpha,
  });
}
