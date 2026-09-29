import {
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  Quality,
  WebMOutputFormat,
  canEncodeVideo,
  type OutputFormat,
  type VideoCodec,
} from "mediabunny";

import {
  TAU,
  clamp01,
  lerp,
  fract,
  easeInOut,
  easeOut,
  bump,
  drawGlyphPose,
  drawLoose,
  heroFx,
  heroScale,
  drawCaption,
  type Env,
  type SceneFactory,
} from "./video-kit";
import { extraScenes } from "./video-scenes-extra";
import {
  DESIGN_SIZE,
  applyFx,
  drawBrand,
  drawClassic,
  isExtraStyle,
  isVideoStyle,
  drawFormula,
  drawText,
  fitScale,
  hashString,
  layoutFormula,
  mix,
  rgba,
  seededRandom,
  shiftHue,
  wrapText,
  type WallpaperContext,
  type ClassicStyle,
  type ExtraStyle,
  type VideoStyle,
  type WallpaperOptions,
  type WallpaperRequest,
  type WallpaperSize,
  wallpaperSizes,
  type WallpaperStyle,
} from "./wallpaper";
import { extraComposers } from "./wallpaper-extra";

export {
  defaultVideoOptions,
  videoStyleOptionKeys,
  videoStyles,
  type VideoStyle,
} from "./wallpaper";

import type { Formula } from "../domain/formula.types";
import type { Locale } from "../i18n/locale";
import type { FxPreset } from "../preferences/preferences-context";

/**
 * Exportador de video: fondos animados para usar como wallpaper interactivo.
 * Cada estilo es una función pura de la *fase* del bucle (0 ≤ fase < 1), y
 * todo movimiento usa un número entero de ciclos por vuelta — el último
 * cuadro empalma con el primero sin salto. El video se graba en tiempo real
 * desde un canvas con MediaRecorder, un número entero de vueltas.
 */

/** Mismos ids que las imágenes; el móvil es 9:16 (par, como exige H.264). */
export const videoSizes: readonly WallpaperSize[] = wallpaperSizes.map((size) =>
  size.id === "mobile" ? { ...size, width: 1080, height: 1920 } : size,
);

export const videoDurations: readonly number[] = [10, 20, 30, 60];
export const videoFrameRates: readonly number[] = [30, 60];

export interface VideoRequest {
  formula: Formula;
  locale: Locale;
  style: WallpaperStyle;
  size: WallpaperSize;
  fx: FxPreset;
  context: WallpaperContext;
  options: WallpaperOptions;
  /** Marca "MATH GOT MOTION" en la esquina. */
  brand: boolean;
  /** Título, autor y explicaciones; apagado deja solo el foco central. */
  details: boolean;
}

export interface VideoRenderer {
  /** Segundos que dura una vuelta completa del bucle (ya con la velocidad). */
  period: number;
  /** Dibuja el cuadro de `phase` (0–1) más el efecto activo. */
  draw: (phase: number, fxFrame?: number) => void;
}

/* ------------------------------------------------------------------ */
/* Estilos                                                             */
/* ------------------------------------------------------------------ */

/**
 * Ensamble: los símbolos llegan volando desde todos lados, encajan en la
 * fórmula, respiran y vuelven a salir despedidos en otra dirección.
 */
const assemble: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const count = layout.glyphs.length;
  const scale = heroScale(env, 0.78, 0.5);
  const fx = heroFx(env, DESIGN_SIZE * scale);
  const random = seededRandom(env.seed);
  const scatter = layout.glyphs.map(() => {
    const angle = random() * TAU;
    const distance = unit * (0.45 + random() * 0.5) * options.radius;
    return {
      x: Math.cos(angle) * distance * (width / unit) * 0.8,
      y: Math.sin(angle) * distance,
      rotation: (random() - 0.5) * TAU * 0.8,
      grow: 0.4 + random() * 2.4,
    };
  });
  const stagger = 0.16 / Math.max(1, count);

  return {
    period: 10,
    draw(phase) {
      let presence = 1;
      for (const [index, glyph] of layout.glyphs.entries()) {
        const spot = scatter[index];
        if (!spot) continue;
        const enter = easeInOut(clamp01((phase - 0.02 - stagger * index) / 0.26));
        const leave = easeInOut(clamp01((phase - 0.62 - stagger * index) / 0.22));
        const settled = enter * (1 - leave);
        presence = Math.min(presence, settled);
        const away = 1 - enter - leave;
        const breathe = Math.sin(TAU * (phase * 3 + index * 0.21)) * unit * 0.004 * settled;
        drawGlyphPose(context, layout, glyph, {
          cx: width / 2,
          cy: height / 2,
          scale,
          dx: spot.x * away,
          dy: spot.y * away + breathe,
          rotation: spot.rotation * away,
          grow: lerp(1, spot.grow, Math.abs(away)),
          color: palette.accent,
          alpha: settled ** 0.6,
          ...fx,
        });
      }
      drawCaption(env, clamp01((presence - 0.6) / 0.4));
    },
  };
};

/**
 * Deriva: la fórmula flota, cada símbolo por su cuenta, sobre un polvo de
 * símbolos en varias capas de profundidad que suben a distinta velocidad.
 */
const drift: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const scale = heroScale(env, 0.74, 0.42);
  const fx = heroFx(env, DESIGN_SIZE * scale);
  const random = seededRandom(env.seed);
  const total = Math.max(1, Math.round(options.count)) * 10;
  const margin = unit * 0.2;
  const dust = Array.from({ length: total }, () => {
    const depth = random();
    return {
      glyph: layout.glyphs[Math.floor(random() * layout.glyphs.length)],
      x: random() * width,
      y: random(),
      depth,
      cycles: depth < 0.4 ? 1 : depth < 0.75 ? 2 : 3,
      sway: random(),
      spin: (random() - 0.5) * 0.6,
    };
  });
  const phases = layout.glyphs.map(() => [random(), random(), random()] as const);

  return {
    period: 16,
    draw(phase) {
      for (const speck of dust) {
        if (!speck.glyph) continue;
        const y = height + margin - fract(speck.y + phase * speck.cycles) * (height + margin * 2);
        const x = speck.x + Math.sin(TAU * (phase * speck.cycles + speck.sway)) * unit * 0.02;
        const size = unit * (0.03 + speck.depth * 0.1);
        const fade = Math.sin(Math.PI * clamp01((y + margin) / (height + margin * 2)));
        drawLoose(
          env,
          speck.glyph.value,
          x,
          y,
          size,
          speck.depth > 0.6 ? palette.accent : palette.fg,
          (0.06 + speck.depth * 0.22) * fade,
          speck.spin * Math.sin(TAU * phase * speck.cycles),
        );
      }
      for (const [index, glyph] of layout.glyphs.entries()) {
        const [a = 0, b = 0, c = 0] = phases[index] ?? [];
        drawGlyphPose(context, layout, glyph, {
          cx: width / 2,
          cy: height / 2,
          scale,
          dx: Math.sin(TAU * (phase + a)) * unit * 0.014,
          dy: Math.cos(TAU * (phase * 2 + b)) * unit * 0.018,
          rotation: Math.sin(TAU * (phase + c)) * 0.05,
          grow: 1 + Math.sin(TAU * (phase * 2 + c)) * 0.04,
          color: palette.accent,
          ...fx,
        });
      }
      drawCaption(env, 1);
    },
  };
};

/**
 * Planetario: la fórmula al centro y sus símbolos girando en órbitas
 * elípticas inclinadas — los que pasan por delante crecen, los de atrás se
 * apagan.
 */
const planetarium: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const rings = Math.max(1, Math.round(options.count));
  const scale = heroScale(env, 0.4, 0.16);
  const fx = heroFx(env, DESIGN_SIZE * scale);
  const tilt = (options.rotation * Math.PI) / 180;
  const inner = unit * 0.26 * options.radius;
  const outer = Math.hypot(width, height) * 0.5 * Math.max(1, options.radius);
  const gap = Math.max(unit * 0.05, (outer - inner) / rings);
  const flatten = 0.42;
  const count = layout.glyphs.length;
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);

  const place = (ring: number, index: number, phase: number) => {
    const direction = ring % 2 === 0 ? 1 : -1;
    const cycles = 1 + (ring % 3 === 2 ? 1 : 0);
    const angle = TAU * (index / count + ring * 0.137 + direction * cycles * phase);
    const radius = inner + gap * ring;
    const ex = Math.cos(angle) * radius;
    const ey = Math.sin(angle) * radius * flatten;
    return {
      x: width / 2 + ex * cos - ey * sin,
      y: height / 2 + ex * sin + ey * cos,
      depth: Math.sin(angle),
    };
  };

  const drawPass = (front: boolean, phase: number) => {
    for (let ring = 0; ring < rings; ring += 1) {
      const fade = 1 - (ring / (rings + 1)) * 0.55;
      for (const [index, glyph] of layout.glyphs.entries()) {
        const spot = place(ring, index, phase);
        if (spot.depth >= 0 !== front) continue;
        const size = unit * 0.05 * (1 + ring * 0.12) * (0.78 + 0.32 * spot.depth);
        drawLoose(
          env,
          glyph.value,
          spot.x,
          spot.y,
          size,
          ring % 2 === 0 ? palette.accent : palette.fg,
          (0.22 + 0.6 * ((spot.depth + 1) / 2)) * fade,
        );
      }
    }
  };

  return {
    period: 24,
    draw(phase) {
      context.save();
      context.strokeStyle = rgba(palette.fg, 0.1);
      context.lineWidth = Math.max(1, unit * 0.0015);
      for (let ring = 0; ring < rings; ring += 1) {
        const radius = inner + gap * ring;
        context.beginPath();
        context.ellipse(width / 2, height / 2, radius, radius * flatten, tilt, 0, TAU);
        context.stroke();
      }
      context.restore();
      drawPass(false, phase);
      drawFormula(context, layout, {
        x: width / 2,
        y: height / 2,
        scale: scale * (1 + 0.025 * Math.sin(TAU * phase)),
        color: palette.accent,
        ...fx,
      });
      drawPass(true, phase);
    },
  };
};

/**
 * Marquesina: filas de la fórmula que corren en sentidos opuestos, inclinadas;
 * la fila del centro va rellena y las demás huecas, cada vez más tenues.
 */
const marquee: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const scale = heroScale(env, 0.5, 0.11);
  const tile = layout.width * scale + DESIGN_SIZE * scale * 1.4;
  const rowStep = layout.height * scale * (1.05 + options.spacingY * 0.85);
  const half = Math.hypot(width, height) / 2;
  const rows = Math.ceil(half / rowStep);
  const fx = heroFx(env, DESIGN_SIZE * scale);
  const outline = Math.max(1, unit * 0.002);
  const rotation = (options.rotation * Math.PI) / 180;

  return {
    period: 20,
    draw(phase) {
      context.save();
      context.translate(width / 2, height / 2);
      context.rotate(rotation);
      for (let row = -rows; row <= rows; row += 1) {
        const direction = row % 2 === 0 ? 1 : -1;
        const shift = direction * phase * tile;
        const hero = row === 0;
        const fade = 1 / (1 + Math.abs(row) * 0.45);
        const first = Math.floor((-half - shift) / tile) - 1;
        const last = Math.ceil((half - shift) / tile) + 1;
        for (let copy = first; copy <= last; copy += 1) {
          drawFormula(context, layout, {
            x: copy * tile + shift,
            y: row * rowStep,
            scale,
            color: hero ? palette.accent : palette.fg,
            alpha: hero ? 1 : 0.5 * fade,
            ...(hero ? fx : { outline }),
          });
        }
      }
      context.restore();
    },
  };
};

/**
 * Lluvia: columnas de símbolos de la fórmula que caen con estela, y la
 * fórmula que se materializa al centro y se disuelve en el bucle.
 */
const rain: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const size = unit * 0.03 * (1 / Math.sqrt(options.scale));
  const columns = Math.floor(width / size);
  const rowsTotal = Math.ceil(height / size);
  const density = clamp01(0.2 + Math.max(1, Math.round(options.count)) * 0.09);
  const random = seededRandom(env.seed);
  const drops = Array.from({ length: columns }, (_, column) => ({
    column,
    active: random() < density,
    cycles: 1 + Math.floor(random() * 3),
    start: random(),
    length: 8 + Math.floor(random() * 14),
    offset: Math.floor(random() * 97),
  })).filter((drop) => drop.active);
  const scale = heroScale(env, 0.7, 0.22);
  const fx = heroFx(env, DESIGN_SIZE * scale);
  const count = layout.glyphs.length;

  return {
    period: 12,
    draw(phase) {
      context.save();
      context.font = `500 ${String(Math.round(size))}px ${env.fonts.formula}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      for (const drop of drops) {
        const head = fract(drop.start + phase * drop.cycles) * (rowsTotal + drop.length);
        for (let step = 0; step < drop.length; step += 1) {
          const row = Math.floor(head) - step;
          if (row < 0 || row >= rowsTotal) continue;
          const glyph = layout.glyphs[(row + drop.offset) % count];
          if (!glyph) continue;
          context.globalAlpha = step === 0 ? 0.95 : (1 - step / drop.length) ** 1.6 * 0.55;
          context.fillStyle = step === 0 ? palette.fg : palette.accent;
          context.fillText(glyph.value, (drop.column + 0.5) * size, (row + 0.5) * size);
        }
      }
      context.restore();

      const appear = bump(phase) ** 0.7;
      const shade = context.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.max(layout.width * scale * 0.65, unit * 0.2),
      );
      shade.addColorStop(0, rgba(palette.bg, 0.92 * appear));
      shade.addColorStop(1, rgba(palette.bg, 0));
      context.fillStyle = shade;
      context.fillRect(0, 0, width, height);
      drawFormula(context, layout, {
        x: width / 2,
        y: height / 2,
        scale,
        color: palette.accent,
        alpha: appear,
        ...fx,
      });
    },
  };
};

/**
 * Ola: una onda viaja por la fórmula — cada símbolo sube, baja, crece y se
 * inclina con su fase — y copias huecas la siguen en filas.
 */
const wave: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const rows = Math.max(1, Math.round(options.count));
  const scale = heroScale(env, 0.76, 0.16);
  const fx = heroFx(env, DESIGN_SIZE * scale);
  const step = layout.height * scale * 1.35;
  const amplitude = layout.height * scale * 0.5;
  const rotation = (options.rotation * Math.PI) / 180;
  const count = layout.glyphs.length;
  const outline = Math.max(1, unit * 0.002);
  const middle = (rows - 1) / 2;

  return {
    period: 8,
    draw(phase) {
      context.save();
      context.translate(width / 2, height / 2);
      context.rotate(rotation);
      const order = Array.from({ length: rows }, (_, row) => row).sort(
        (a, b) => Math.abs(b - middle) - Math.abs(a - middle),
      );
      for (const row of order) {
        const hero = Math.abs(row - middle) < 0.51;
        const fade = 1 / (1 + Math.abs(row - middle) * 0.5);
        for (const [index, glyph] of layout.glyphs.entries()) {
          const angle = TAU * (phase - (index / count) * 1.2 - row * 0.09);
          drawGlyphPose(context, layout, glyph, {
            cx: 0,
            cy: (row - middle) * step,
            scale,
            dy: Math.sin(angle) * amplitude,
            rotation: Math.cos(angle) * 0.1,
            grow: 1 + Math.cos(angle) * 0.16,
            color: hero ? palette.accent : palette.fg,
            alpha: hero ? 1 : 0.55 * fade,
            ...(hero ? fx : { outline }),
          });
        }
      }
      context.restore();
      drawCaption(env, 1);
    },
  };
};

/**
 * Túnel: copias de la fórmula que crecen desde el fondo hasta desbordar la
 * pantalla, girando apenas; siempre hay una nítida al pasar por el centro.
 */
const tunnel: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const layers = Math.max(2, Math.round(options.count));
  const smallest = fitScale(layout, width * 0.05, height * 0.03);
  const largest = fitScale(layout, width * 2.4, height * 1.3);
  const growth = (largest / smallest) ** (1 / layers);
  const twist = (options.rotation * Math.PI) / 180;
  const focus = options.scale;
  const outline = Math.max(1, unit * 0.0025);

  return {
    period: 12,
    draw(phase) {
      for (let layer = layers - 1; layer >= 0; layer -= 1) {
        const progress = (layer + phase) / layers;
        const scale = smallest * growth ** (layer + phase) * focus;
        const envelope = Math.sin(Math.PI * progress) ** 1.2;
        const sweet = Math.exp(-(((progress - 0.55) / 0.13) ** 2));
        const rotation = progress * twist;
        context.save();
        context.translate(width / 2, height / 2);
        context.rotate(rotation);
        drawFormula(context, layout, {
          x: 0,
          y: 0,
          scale,
          color: mix(palette.fg, palette.accent, progress),
          alpha: envelope * 0.85,
          outline,
        });
        if (sweet > 0.02) {
          drawFormula(context, layout, {
            x: 0,
            y: 0,
            scale,
            color: palette.accent,
            alpha: sweet * envelope,
            ...heroFx(env, DESIGN_SIZE * scale),
          });
        }
        context.restore();
      }
    },
  };
};

/**
 * Aurora: manchas de luz del acento (y sus tonos vecinos) que recorren la
 * pantalla en curvas cerradas, con destellos que titilan y la fórmula
 * respirando encima.
 */
const aurora: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const blobs = Math.max(1, Math.round(options.count));
  const random = seededRandom(env.seed);
  const tinted = shiftHue(palette.accent, 90) !== palette.accent;
  const alpha = (palette.scheme === "dark" ? 0.34 : 0.26) * (tinted ? 1 : 0.5);
  const lights = Array.from({ length: blobs }, (_, index) => ({
    cyclesX: 1 + Math.floor(random() * 2),
    cyclesY: 1 + Math.floor(random() * 2),
    phaseX: random(),
    phaseY: random(),
    radius: unit * (0.35 + random() * 0.3),
    hue: blobs === 1 ? 0 : (index / (blobs - 1) - 0.5) * 110,
  }));
  const sparks = Array.from({ length: 70 }, () => ({
    x: random() * width,
    y: random() * height,
    size: unit * (0.001 + random() * 0.003),
    phase: random(),
    cycles: 1 + Math.floor(random() * 3),
  }));
  const scale = heroScale(env, 0.62, 0.26);
  const fx = heroFx(env, DESIGN_SIZE * scale);

  return {
    period: 20,
    draw(phase) {
      for (const light of lights) {
        const x = width * (0.5 + 0.34 * Math.sin(TAU * (light.cyclesX * phase + light.phaseX)));
        const y = height * (0.5 + 0.32 * Math.sin(TAU * (light.cyclesY * phase + light.phaseY)));
        const radius = light.radius * (1 + 0.15 * Math.sin(TAU * (phase + light.phaseX)));
        const color = shiftHue(palette.accent, light.hue);
        const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, rgba(color, alpha));
        gradient.addColorStop(0.55, rgba(color, alpha * 0.35));
        gradient.addColorStop(1, rgba(color, 0));
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
      }
      context.save();
      context.fillStyle = palette.fg;
      for (const spark of sparks) {
        const twinkle = Math.sin(Math.PI * fract(spark.cycles * phase + spark.phase)) ** 6;
        context.globalAlpha = 0.85 * twinkle;
        context.beginPath();
        context.arc(spark.x, spark.y, spark.size, 0, TAU);
        context.fill();
      }
      context.restore();
      drawFormula(context, layout, {
        x: width / 2,
        y: height / 2,
        scale: scale * (1 + 0.02 * Math.sin(TAU * phase)),
        color: palette.fg,
        ...fx,
        glow: Math.max(fx.glow, DESIGN_SIZE * scale * (0.05 + 0.02 * Math.sin(TAU * phase))),
      });
      drawCaption(env, 1);
    },
  };
};

/**
 * Foco: recorre la fórmula símbolo por símbolo. El de turno se ilumina arriba,
 * aparece gigante al centro y su explicación se lee debajo.
 */
const spotlight: SceneFactory = (env) => {
  const { context, layout, request, width, height, unit, palette, fonts } = env;
  const { formula, locale } = request;
  const count = formula.nodes.length;
  const scale = heroScale(env, 0.8, 0.13);
  const fx = heroFx(env, DESIGN_SIZE * scale);
  const textSize = Math.round(unit * 0.026);
  const textFont = `500 ${String(textSize)}px ${fonts.prose}`;
  const textWidth = Math.min(width * 0.84, unit * 1.05);

  context.save();
  context.font = textFont;
  const explanations = formula.nodes.map((node) =>
    wrapText(context, node.explanation[locale], textWidth, 5, locale),
  );
  context.restore();

  return {
    period: count * 3.4,
    draw(phase) {
      const position = phase * count;
      const current = Math.min(count - 1, Math.floor(position));
      const local = position - current;
      const enter = easeInOut(clamp01(local / 0.16));
      const leave = easeInOut(clamp01((local - 0.84) / 0.16));
      const presence = enter * (1 - leave);

      for (const [index, glyph] of layout.glyphs.entries()) {
        const active = index === current;
        drawGlyphPose(context, layout, glyph, {
          cx: width / 2,
          cy: height * 0.2,
          scale,
          grow: active ? 1 + 0.22 * presence : 1,
          color: active ? palette.accent : palette.fg,
          alpha: active ? 0.4 + 0.6 * presence : 0.22,
          ...(active ? fx : {}),
        });
      }

      const glyph = layout.glyphs[current];
      if (glyph) {
        const giant = Math.min(unit * 0.4, (width * 0.6 * DESIGN_SIZE) / Math.max(1, glyph.width));
        drawLoose(
          env,
          glyph.value,
          width / 2,
          height * 0.46,
          giant * (0.8 + 0.2 * easeOut(presence)),
          palette.accent,
          presence,
        );
      }

      const lines = request.details ? (explanations[current] ?? []) : [];
      const textAlpha = clamp01((presence - 0.3) / 0.7);
      for (const [lineIndex, line] of lines.entries()) {
        drawText(context, line, {
          x: width / 2,
          y: height * 0.68 + lineIndex * textSize * 1.45,
          font: textFont,
          color: palette.fg,
          alpha: 0.85 * textAlpha,
        });
      }
      if (request.details) {
        drawText(
          context,
          `${String(current + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}`,
          {
            x: width / 2,
            y: height - unit * 0.09,
            font: `500 ${String(Math.round(unit * 0.016))}px ${fonts.mono}`,
            color: palette.fg,
            alpha: 0.55,
          },
        );
      }
    },
  };
};

/**
 * Carrusel: tres anillos de tarjetas con la fórmula girando sobre un eje
 * vertical, en sentidos opuestos; las de atrás se ven espejadas y tenues.
 */
const carousel: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const cards = Math.max(3, Math.round(options.count));
  const scale = fitScale(layout, width * 0.36, height * 0.12) * options.scale;
  const radius = Math.min(width * 0.34, unit * 0.62) * options.radius;
  const step = layout.height * scale * 1.55;
  const fx = heroFx(env, DESIGN_SIZE * scale);
  const outline = Math.max(1, unit * 0.002);

  return {
    period: 14,
    draw(phase) {
      const items: { row: number; angle: number; depth: number }[] = [];
      for (const row of [-1, 0, 1]) {
        for (let card = 0; card < cards; card += 1) {
          const angle = TAU * (card / cards + (row === 0 ? 1 : -1) * phase + row * 0.11);
          items.push({ row, angle, depth: Math.cos(angle) });
        }
      }
      items.sort((a, b) => a.depth - b.depth);
      for (const item of items) {
        if (Math.abs(item.depth) < 0.03) continue;
        const front = item.depth > 0;
        const perspective = 0.62 + 0.38 * ((item.depth + 1) / 2);
        const hero = item.row === 0;
        context.save();
        context.translate(width / 2 + Math.sin(item.angle) * radius, height / 2 + item.row * step);
        context.scale(item.depth, 1);
        drawFormula(context, layout, {
          x: 0,
          y: 0,
          scale: scale * perspective,
          color: hero ? palette.accent : palette.fg,
          alpha: (front ? 0.35 + 0.65 * item.depth : 0.08 + 0.12 * -item.depth) * (hero ? 1 : 0.7),
          ...(hero && front ? fx : { outline }),
        });
        context.restore();
      }
    },
  };
};

/**
 * Trazo: cada símbolo se dibuja a pluma, contorno primero; luego se rellena,
 * se sostiene y se desvanece para volver a empezar.
 */
const stroke: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette } = env;
  const count = layout.glyphs.length;
  const scale = heroScale(env, 0.8, 0.5);
  const fx = heroFx(env, DESIGN_SIZE * scale);
  const outline = Math.max(2, unit * 0.004);
  const stagger = 0.3 / Math.max(1, count);

  return {
    period: 10,
    draw(phase) {
      const fill = easeInOut(clamp01((phase - 0.5) / 0.16));
      const fade = 1 - easeInOut(clamp01((phase - 0.84) / 0.14));
      for (const [index, glyph] of layout.glyphs.entries()) {
        const reveal = easeInOut(clamp01((phase - 0.04 - stagger * index) / 0.3));
        drawGlyphPose(context, layout, glyph, {
          cx: width / 2,
          cy: height / 2,
          scale,
          color: palette.accent,
          alpha: fade * (1 - fill * 0.55),
          outline,
          reveal,
        });
        drawGlyphPose(context, layout, glyph, {
          cx: width / 2,
          cy: height / 2,
          scale,
          color: palette.accent,
          alpha: fill * fade,
          ...fx,
        });
      }
      drawCaption(env, fill * fade);
    },
  };
};

/**
 * Vórtice: brazos de símbolos que nacen en el centro, se abren en espiral y
 * se pierden en los bordes, con la fórmula latiendo en el ojo.
 */
const vortex: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const arms = Math.max(1, Math.round(options.count));
  const perArm = 22;
  const reach = Math.hypot(width, height) / 2;
  const turns = 1.2 * options.radius;
  const offset = (options.rotation * Math.PI) / 180;
  const scale = heroScale(env, 0.36, 0.14);
  const fx = heroFx(env, DESIGN_SIZE * scale);
  const count = layout.glyphs.length;

  return {
    period: 18,
    draw(phase) {
      for (let arm = 0; arm < arms; arm += 1) {
        for (let index = 0; index < perArm; index += 1) {
          const glyph = layout.glyphs[(index + arm) % count];
          if (!glyph) continue;
          const progress = fract(index / perArm + phase);
          const angle = offset + (arm / arms) * TAU + progress * turns * TAU + phase * TAU;
          const radius = reach * progress ** 1.25;
          drawLoose(
            env,
            glyph.value,
            width / 2 + Math.cos(angle) * radius,
            height / 2 + Math.sin(angle) * radius,
            unit * (0.02 + 0.075 * progress),
            arm % 2 === 0 ? palette.accent : palette.fg,
            Math.sin(Math.PI * progress) ** 0.8 * 0.85,
            angle + Math.PI / 2,
          );
        }
      }
      const shade = context.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.max(layout.width * scale * 0.6, unit * 0.18),
      );
      shade.addColorStop(0, rgba(palette.bg, 0.9));
      shade.addColorStop(1, rgba(palette.bg, 0));
      context.fillStyle = shade;
      context.fillRect(0, 0, width, height);
      drawFormula(context, layout, {
        x: width / 2,
        y: height / 2,
        scale: scale * (1 + 0.04 * Math.sin(TAU * phase * 2)),
        color: palette.accent,
        ...fx,
      });
      drawCaption(env, 1);
    },
  };
};

/**
 * Hiperespacio: salto a velocidad luz — estelas radiales y símbolos que
 * vuelan hacia la cámara mientras la fórmula vibra al centro.
 */
const warp: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const random = seededRandom(env.seed);
  const total = Math.max(1, Math.round(options.count)) * 45;
  const reach = Math.hypot(width, height) / 2;
  const stars = Array.from({ length: total }, () => ({
    angle: random() * TAU,
    start: random(),
    cycles: 1 + Math.floor(random() * 2),
    glyph: random() < 0.3 ? layout.glyphs[Math.floor(random() * layout.glyphs.length)] : undefined,
  }));
  const scale = heroScale(env, 0.6, 0.2);
  const fx = heroFx(env, DESIGN_SIZE * scale);

  return {
    period: 6,
    draw(phase) {
      context.save();
      context.lineCap = "round";
      context.strokeStyle = palette.fg;
      for (const star of stars) {
        const t = fract(star.start + phase * star.cycles);
        const visible = clamp01(t * 5) * (1 - clamp01((t - 0.93) / 0.07));
        const cos = Math.cos(star.angle);
        const sin = Math.sin(star.angle);
        const radius = reach * t ** 2.2;
        const x = width / 2 + cos * radius;
        const y = height / 2 + sin * radius;
        if (star.glyph) {
          drawLoose(
            env,
            star.glyph.value,
            x,
            y,
            unit * (0.01 + 0.1 * t ** 1.5),
            palette.accent,
            visible * 0.8,
            star.angle,
          );
          continue;
        }
        const tail = reach * Math.max(0, t - 0.08) ** 2.2;
        context.globalAlpha = visible * 0.7;
        context.lineWidth = Math.max(1, unit * 0.0022 * (0.4 + t * 2));
        context.beginPath();
        context.moveTo(width / 2 + cos * tail, height / 2 + sin * tail);
        context.lineTo(x, y);
        context.stroke();
      }
      context.restore();
      const shade = context.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.max(layout.width * scale * 0.6, unit * 0.2),
      );
      shade.addColorStop(0, rgba(palette.bg, 0.85));
      shade.addColorStop(1, rgba(palette.bg, 0));
      context.fillStyle = shade;
      context.fillRect(0, 0, width, height);
      drawFormula(context, layout, {
        x: width / 2 + Math.sin(TAU * phase * 12) * unit * 0.0015,
        y: height / 2 + Math.cos(TAU * phase * 15) * unit * 0.0015,
        scale: scale * (1 + 0.03 * Math.sin(TAU * phase * 2)),
        color: palette.accent,
        ...fx,
      });
      drawCaption(env, 1);
    },
  };
};

/**
 * Caleidoscopio: anillos de la fórmula repetidos en simetría radial, girando
 * en sentidos opuestos y respirando.
 */
const kaleido: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const segments = Math.max(3, Math.round(options.count));
  const scale = heroScale(env, 0.26, 0.09);
  const centerScale = heroScale(env, 0.34, 0.12);
  const fx = heroFx(env, DESIGN_SIZE * centerScale);
  const outline = Math.max(1, unit * 0.002);

  return {
    period: 20,
    draw(phase) {
      const breathe = 1 + 0.08 * Math.sin(TAU * phase);
      for (const ring of [1, 0]) {
        const direction = ring === 0 ? 1 : -1;
        const radius = unit * (0.27 + ring * 0.25) * options.radius * breathe;
        for (let segment = 0; segment < segments; segment += 1) {
          context.save();
          context.translate(width / 2, height / 2);
          context.rotate((segment / segments + (direction * phase) / segments) * TAU);
          if (ring === 1 && segment % 2 === 1) context.scale(1, -1);
          drawFormula(context, layout, {
            x: 0,
            y: -radius,
            scale: scale * (ring === 0 ? 1 : 0.8),
            color: ring === 0 ? palette.accent : palette.fg,
            alpha: ring === 0 ? 0.9 : 0.55,
            ...(ring === 0 ? {} : { outline }),
          });
          context.restore();
        }
      }
      const shade = context.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.max(layout.width * centerScale * 0.6, unit * 0.16),
      );
      shade.addColorStop(0, rgba(palette.bg, 0.92));
      shade.addColorStop(1, rgba(palette.bg, 0));
      context.fillStyle = shade;
      context.fillRect(0, 0, width, height);
      drawFormula(context, layout, {
        x: width / 2,
        y: height / 2,
        scale: centerScale,
        color: palette.accent,
        ...fx,
      });
      drawCaption(env, 1);
    },
  };
};

/**
 * Pulso: la fórmula late dos veces por vuelta; cada latido lanza ondas
 * expansivas y ecos huecos de la fórmula que se agrandan hasta desvanecerse.
 */
const pulse: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const waves = Math.max(1, Math.round(options.count));
  const scale = heroScale(env, 0.6, 0.2);
  const reach = Math.hypot(width, height) / 2;
  const outline = Math.max(1, unit * 0.002);

  return {
    period: 5,
    draw(phase) {
      for (let wave = 0; wave < waves; wave += 1) {
        const t = fract(phase * 2 + wave / waves);
        const fade = (1 - t) ** 1.5;
        context.save();
        context.strokeStyle = palette.accent;
        context.globalAlpha = fade * 0.55;
        context.lineWidth = Math.max(1, unit * 0.005 * (1 - t));
        context.beginPath();
        context.arc(width / 2, height / 2, reach * easeOut(t), 0, TAU);
        context.stroke();
        context.restore();
        drawFormula(context, layout, {
          x: width / 2,
          y: height / 2,
          scale: scale * (1 + 1.6 * easeOut(t)),
          color: wave % 2 === 0 ? palette.fg : palette.accent,
          alpha: fade * 0.45,
          outline,
        });
      }
      const kick = Math.exp(-7 * fract(phase * 2));
      const size = scale * (1 + 0.07 * kick);
      const fx = heroFx(env, DESIGN_SIZE * size);
      drawFormula(context, layout, {
        x: width / 2,
        y: height / 2,
        scale: size,
        color: palette.accent,
        ...fx,
        glow: Math.max(fx.glow, DESIGN_SIZE * size * 0.08 * kick),
      });
      drawCaption(env, 1);
    },
  };
};

/**
 * Cortes: la fórmula partida en franjas horizontales que se desplazan a
 * ráfagas con separación de color, como una señal que se rompe.
 */
const slice: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const bands = Math.max(2, Math.round(options.count) * 2);
  const scale = heroScale(env, 0.78, 0.5);
  const fx = heroFx(env, DESIGN_SIZE * scale);
  const random = seededRandom(env.seed);
  const tall = layout.height * scale * 1.15;
  const top = height / 2 - tall / 2;
  const bandHeight = tall / bands;
  const left = shiftHue(palette.accent, -70);
  const right = shiftHue(palette.accent, 70);
  const cuts = Array.from({ length: bands }, () => ({
    cycles: 1 + Math.floor(random() * 3),
    phase: random(),
    reach: (0.3 + random() * 0.7) * unit * 0.14,
  }));

  return {
    period: 8,
    draw(phase) {
      for (const [band, cut] of cuts.entries()) {
        const burst = Math.sin(TAU * (cut.cycles * phase + cut.phase)) ** 7;
        const shift = burst * cut.reach;
        const split = Math.abs(burst) * unit * 0.012;
        context.save();
        context.beginPath();
        context.rect(0, top + band * bandHeight, width, bandHeight + 1);
        context.clip();
        for (const [color, dx, alpha] of [
          [left, shift - split, 0.7],
          [right, shift + split, 0.7],
          [palette.accent, shift, 1],
        ] as const) {
          if (alpha < 1 && Math.abs(burst) < 0.02) continue;
          drawFormula(context, layout, {
            x: width / 2 + dx,
            y: height / 2,
            scale,
            color,
            alpha,
            ...(alpha === 1 ? fx : {}),
          });
        }
        context.restore();
      }
      drawCaption(env, 1);
    },
  };
};

/**
 * Horizonte: un atardecer de rejilla en perspectiva que avanza hacia la
 * cámara; la fórmula flota sobre el sol y se refleja en el suelo.
 */
const horizon: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const lines = Math.max(3, Math.round(options.count));
  const line = height * 0.6;
  const formulaY = height * 0.32;
  const scale = heroScale(env, 0.66, 0.16);
  const fx = heroFx(env, DESIGN_SIZE * scale);
  const sunRadius = unit * 0.2;
  const sunY = line - unit * 0.02;

  return {
    period: 6,
    draw(phase) {
      const glow = context.createRadialGradient(width / 2, sunY, 0, width / 2, sunY, unit * 0.75);
      glow.addColorStop(0, rgba(palette.accent, 0.4));
      glow.addColorStop(1, rgba(palette.accent, 0));
      context.fillStyle = glow;
      context.fillRect(0, 0, width, line);

      context.save();
      context.beginPath();
      context.rect(0, 0, width, line);
      context.clip();
      context.fillStyle = rgba(palette.accent, 0.85);
      context.beginPath();
      context.arc(width / 2, sunY, sunRadius, 0, TAU);
      context.fill();
      context.fillStyle = palette.bg;
      for (let stripe = 0; stripe < 6; stripe += 1) {
        const t = fract(stripe / 6 + phase);
        const y = sunY - sunRadius * 0.1 + t * sunRadius * 1.1;
        context.fillRect(
          width / 2 - sunRadius,
          y,
          sunRadius * 2,
          sunRadius * 0.02 + t * sunRadius * 0.11,
        );
      }
      context.restore();

      const floor = context.createLinearGradient(0, line, 0, height);
      floor.addColorStop(0, rgba(palette.accent, 0.22));
      floor.addColorStop(1, rgba(palette.bg, 0));
      context.fillStyle = floor;
      context.fillRect(0, line, width, height - line);

      context.save();
      context.strokeStyle = palette.accent;
      for (let row = 0; row < lines; row += 1) {
        const t = fract(row / lines + phase / lines);
        const y = line + (height - line) * t ** 2.4;
        context.globalAlpha = 0.15 + 0.6 * t;
        context.lineWidth = Math.max(1, unit * 0.0012 + t * unit * 0.003);
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }
      context.globalAlpha = 0.35;
      context.lineWidth = Math.max(1, unit * 0.002);
      for (let column = -8; column <= 8; column += 1) {
        context.beginPath();
        context.moveTo(width / 2, line);
        context.lineTo(width / 2 + column * width * 0.16, height);
        context.stroke();
      }
      context.restore();

      const bob = Math.sin(TAU * phase) * unit * 0.008;
      context.save();
      context.translate(0, 2 * line);
      context.scale(1, -1);
      drawFormula(context, layout, {
        x: width / 2,
        y: formulaY + bob,
        scale,
        color: palette.accent,
        alpha: 0.16,
      });
      context.restore();
      drawFormula(context, layout, {
        x: width / 2,
        y: formulaY + bob,
        scale,
        color: palette.fg,
        ...fx,
      });
      drawCaption(env, 1);
    },
  };
};

/**
 * Esfera: los símbolos de la fórmula repartidos sobre una esfera que gira en
 * 3D — los del frente crecen y brillan, los de atrás se apagan.
 */
const sphere: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const points = Math.max(1, Math.round(options.count)) * 10;
  const tilt = (options.rotation * Math.PI) / 180;
  const radius = unit * 0.36 * options.radius;
  const scale = heroScale(env, 0.32, 0.12);
  const fx = heroFx(env, DESIGN_SIZE * scale);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const count = layout.glyphs.length;
  const base = Array.from({ length: points }, (_, index) => {
    const y = 1 - (2 * (index + 0.5)) / points;
    const ring = Math.sqrt(1 - y * y);
    const theta = index * golden;
    return { x: Math.cos(theta) * ring, y, z: Math.sin(theta) * ring, index };
  });

  const project = (phase: number) =>
    base
      .map((point) => {
        const spin = TAU * phase;
        const x1 = point.x * Math.cos(spin) + point.z * Math.sin(spin);
        const z1 = -point.x * Math.sin(spin) + point.z * Math.cos(spin);
        const y2 = point.y * Math.cos(tilt) - z1 * Math.sin(tilt);
        const z2 = point.y * Math.sin(tilt) + z1 * Math.cos(tilt);
        return { x: x1, y: y2, z: z2, index: point.index };
      })
      .sort((a, b) => a.z - b.z);

  const drawPoint = (point: { x: number; y: number; z: number; index: number }) => {
    const glyph = layout.glyphs[point.index % count];
    if (!glyph) return;
    const near = (point.z + 1) / 2;
    drawLoose(
      env,
      glyph.value,
      width / 2 + point.x * radius,
      height / 2 + point.y * radius,
      unit * 0.045 * (0.55 + 0.65 * near),
      near > 0.6 ? palette.accent : palette.fg,
      0.08 + 0.85 * near ** 1.6,
    );
  };

  return {
    period: 24,
    draw(phase) {
      const ordered = project(phase);
      for (const point of ordered) if (point.z < 0) drawPoint(point);
      const shade = context.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.max(layout.width * scale * 0.6, unit * 0.16),
      );
      shade.addColorStop(0, rgba(palette.bg, 0.8));
      shade.addColorStop(1, rgba(palette.bg, 0));
      context.fillStyle = shade;
      context.fillRect(0, 0, width, height);
      drawFormula(context, layout, {
        x: width / 2,
        y: height / 2,
        scale: scale * (1 + 0.03 * Math.sin(TAU * phase * 2)),
        color: palette.accent,
        ...fx,
      });
      for (const point of ordered) if (point.z >= 0) drawPoint(point);
      drawCaption(env, 1);
    },
  };
};

/* ------------------------------------------------------------------ */
/* Versión animada de los estilos de imagen                            */
/* ------------------------------------------------------------------ */

type Animator = (options: WallpaperOptions, phase: number, nodes: number) => WallpaperOptions;

const swing = (phase: number, cycles = 1, offset = 0) => Math.sin(TAU * (cycles * phase + offset));
const breathe = (options: WallpaperOptions, phase: number, amount = 0.05): WallpaperOptions => ({
  ...options,
  scale: options.scale * (1 + amount * swing(phase)),
});
/** Una vuelta completa (entera) del ángulo por bucle. */
const spin = (options: WallpaperOptions, phase: number): WallpaperOptions => ({
  ...options,
  rotation: options.rotation + 360 * phase,
});

/**
 * Cada estilo de imagen tiene su gemelo animado: la misma composición, con sus
 * ajustes moviéndose en ciclos enteros del bucle (respirar, girar, separar,
 * recorrer los símbolos…). Así imagen y video son exactamente el mismo estilo.
 */
const animators: Record<ClassicStyle | ExtraStyle, Animator> = {
  formula: (o, p) => breathe(o, p),
  accent: (o, p) => breathe(o, p),
  inverted: (o, p) => breathe(o, p),
  poster: (o, p) => breathe(o, p, 0.04),
  swiss: (o, p) => breathe(o, p, 0.04),
  anatomy: (o, p) => ({
    ...breathe(o, p, 0.03),
    spacingX: o.spacingX * (1 + 0.5 * (0.5 - 0.5 * Math.cos(TAU * p))),
  }),
  macro: (o, p, n) => ({
    ...breathe(o, p, 0.04),
    focus: Math.min(n - 1, Math.floor(p * n)),
    rotation: o.rotation + 8 * swing(p),
  }),
  aura: (o, p) => spin(o, p),
  depth: (o, p) => ({
    ...o,
    rotation: o.rotation + 14 * swing(p),
    distance: o.distance * (1 + 0.3 * swing(p, 2)),
  }),
  echo: (o, p) => ({
    ...o,
    rotation: o.rotation + 4 * swing(p),
    spacingY: o.spacingY * (1 + 0.35 * swing(p)),
  }),
  orbit: (o, p) => spin(o, p),
  spiral: (o, p) => spin(o, p),
  isometric: (o, p) => ({
    ...o,
    spacingX: o.spacingX * (1 + 0.3 * swing(p)),
    spacingY: o.spacingY * (1 + 0.3 * swing(p, 1, 0.25)),
  }),
  pattern: (o, p) => ({
    ...o,
    rotation: o.rotation + 10 * swing(p),
    spacingX: o.spacingX * (1 + 0.25 * swing(p, 1, 0.25)),
    spacingY: o.spacingY * (1 + 0.25 * swing(p)),
  }),
  blueprint: (o, p) => ({
    ...breathe(o, p, 0.03),
    spacingX: o.spacingX * (1 + 0.3 * swing(p)),
  }),
  mosaic: (o, p) => ({
    ...breathe(o, p, 0.03),
    spacingX: o.spacingX * (1 + 0.9 * (0.5 - 0.5 * Math.cos(TAU * p))),
  }),
  eclipse: (o, p) => ({ ...breathe(o, p, 0.03), radius: o.radius * (1 + 0.12 * swing(p)) }),
  mirror: (o, p) => ({
    ...breathe(o, p, 0.03),
    spacingY: o.spacingY * (1 + 0.4 * swing(p)),
  }),
  stripes: (o, p) => spin(o, p),
  confetti: (o, p) => spin(o, p),
  waves: (o, p) => ({
    ...o,
    moment: p,
    rotation: o.rotation + 6 * swing(p),
    radius: o.radius * (1 + 0.4 * swing(p, 2)),
  }),
  neon: (o, p) => ({ ...o, radius: o.radius * (1 + 0.35 * swing(p, 3)) }),
  seal: (o, p) => spin(o, p),
  led: (o, p) => breathe(o, p, 0.04),
  gradient: (o, p) => spin(o, p),
  knockout: (o, p) => breathe(o, p, 0.07),
  cards: (o, p) => ({
    ...breathe(o, p, 0.03),
    spacingX: o.spacingX * (1 + 0.5 * swing(p)),
  }),
  constellation: (o, p) => ({ ...o, radius: o.radius * (1 + 0.3 * swing(p)) }),
};

/** Vuelta base (s) de los estilos de imagen animados; los que giran entero van más lento. */
const ANIMATED_PERIODS: Partial<Record<ClassicStyle | ExtraStyle, number>> = {
  aura: 24,
  orbit: 24,
  spiral: 24,
  stripes: 24,
  confetti: 24,
  seal: 30,
  gradient: 24,
  macro: 18,
  waves: 8,
  neon: 6,
};

function animated(style: ClassicStyle | ExtraStyle): SceneFactory {
  return (env) => {
    const { context, layout, request, options } = env;
    const count = layout.glyphs.length;
    const animate = animators[style];
    const composer = isExtraStyle(style)
      ? extraComposers[style]
      : (target: CanvasRenderingContext2D, frame: WallpaperRequest, measured: typeof layout) => {
          drawClassic(target, frame, measured);
        };
    const base: WallpaperRequest = {
      formula: request.formula,
      locale: request.locale,
      style,
      size: request.size,
      fx: request.fx,
      context: request.context,
    };
    return {
      period: ANIMATED_PERIODS[style] ?? 12,
      draw(phase) {
        composer(context, { ...base, options: animate(options, phase, count) }, layout);
      },
    };
  };
}

const scenes: Record<VideoStyle, SceneFactory> = {
  assemble,
  drift,
  planetarium,
  marquee,
  rain,
  wave,
  tunnel,
  aurora,
  spotlight,
  carousel,
  stroke,
  vortex,
  warp,
  kaleido,
  pulse,
  slice,
  horizon,
  sphere,
  ...extraScenes,
};

/* ------------------------------------------------------------------ */
/* Renderer                                                            */
/* ------------------------------------------------------------------ */

/**
 * Prepara el layout y la escena una sola vez (medir texto por cuadro sería
 * carísimo) y devuelve un dibujador de cuadros. `canvas` ya debe tener el
 * tamaño de `request.size`.
 */
export function createVideoRenderer(
  canvas: HTMLCanvasElement,
  request: VideoRequest,
): VideoRenderer {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("2D canvas context is not available");
  const { width, height } = request.size;
  const { palette, fonts } = request.context;
  context.textAlign = "center";
  context.textBaseline = "alphabetic";

  const env: Env = {
    context,
    request,
    layout: layoutFormula(context, request.formula, fonts.formula),
    width,
    height,
    unit: Math.min(width, height),
    palette,
    fonts,
    options: request.options,
    seed: hashString(request.formula.id),
  };
  const scene = (isVideoStyle(request.style) ? scenes[request.style] : animated(request.style))(
    env,
  );

  return {
    period: scene.period / Math.max(0.05, request.options.speed),
    draw(phase, fxFrame = 0) {
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.globalAlpha = 1;
      context.fillStyle = palette.bg;
      context.fillRect(0, 0, width, height);
      context.textAlign = "center";
      context.textBaseline = "alphabetic";
      scene.draw(fract(phase));
      if (request.brand) drawBrand(context, palette, fonts, width, height);
      applyFx(context, request.fx, palette, width, height, fxFrame);
      context.restore();
    },
  };
}

/* ------------------------------------------------------------------ */
/* Grabación                                                           */
/* ------------------------------------------------------------------ */

interface VideoFormat {
  mimeType: string;
  extension: "mp4" | "webm";
}

const VIDEO_FORMATS: readonly VideoFormat[] = [
  { mimeType: "video/mp4;codecs=avc1.640028", extension: "mp4" },
  { mimeType: "video/mp4;codecs=avc1", extension: "mp4" },
  { mimeType: "video/webm;codecs=vp9", extension: "webm" },
  { mimeType: "video/webm;codecs=vp8", extension: "webm" },
  { mimeType: "video/webm", extension: "webm" },
];

function pickVideoFormat(): VideoFormat | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return VIDEO_FORMATS.find((format) => MediaRecorder.isTypeSupported(format.mimeType));
}

/** MP4 (H.264) si el navegador lo graba; si no, WebM. */
export function isVideoRecordingSupported(): boolean {
  return (
    typeof VideoEncoder !== "undefined" ||
    (pickVideoFormat() !== undefined &&
      typeof HTMLCanvasElement.prototype.captureStream === "function")
  );
}

export interface RecordOptions {
  fps: number;
  /** Duración objetivo: se redondea a un número entero de vueltas del bucle. */
  seconds: number;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}

export interface RecordedVideo {
  blob: Blob;
  extension: "mp4" | "webm";
  /** Duración real, en segundos (vueltas enteras). */
  seconds: number;
}

/**
 * Graba la escena en tiempo real desde un canvas fuera de pantalla. El reloj
 * manda: si la máquina no alcanza los fps pedidos se pierden cuadros, pero
 * el bucle sigue cerrando exacto en `seconds`.
 */
function recordRealtime(request: VideoRequest, options: RecordOptions): Promise<RecordedVideo> {
  return new Promise((resolve, reject) => {
    const format = pickVideoFormat();
    const canvas = document.createElement("canvas");
    if (!format || typeof canvas.captureStream !== "function") {
      reject(new Error("Video recording is not supported"));
      return;
    }
    canvas.width = request.size.width;
    canvas.height = request.size.height;
    const renderer = createVideoRenderer(canvas, request);
    const loops = Math.max(1, Math.round(options.seconds / renderer.period));
    const total = loops * renderer.period;
    const interval = 1000 / options.fps;
    const bitrate = Math.min(
      60_000_000,
      Math.max(4_000_000, request.size.width * request.size.height * options.fps * 0.12),
    );

    renderer.draw(0, 0);
    const stream = canvas.captureStream(options.fps);
    const recorder = new MediaRecorder(stream, {
      mimeType: format.mimeType,
      videoBitsPerSecond: bitrate,
    });
    const chunks: Blob[] = [];
    let cancelled = false;
    let frame = 0;
    let started = -1;
    let lastDraw = Number.NEGATIVE_INFINITY;

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });
    recorder.addEventListener("error", () => {
      globalThis.cancelAnimationFrame(frame);
      reject(new Error("MediaRecorder failed"));
    });
    recorder.addEventListener("stop", () => {
      globalThis.cancelAnimationFrame(frame);
      for (const track of stream.getTracks()) track.stop();
      if (cancelled) {
        reject(new DOMException("Recording cancelled", "AbortError"));
        return;
      }
      resolve({
        blob: new Blob(chunks, { type: format.mimeType }),
        extension: format.extension,
        seconds: total,
      });
    });

    const tick = (now: number) => {
      if (options.signal?.aborted) {
        cancelled = true;
        recorder.stop();
        return;
      }
      if (started < 0) started = now;
      const elapsed = (now - started) / 1000;
      if (elapsed >= total) {
        // Último cuadro = fase 0: empalma con el primero.
        renderer.draw(0, 0);
        options.onProgress?.(1);
        globalThis.setTimeout(() => {
          recorder.stop();
        }, interval * 1.5);
        return;
      }
      if (now - lastDraw >= interval - 3) {
        lastDraw = now;
        renderer.draw(fract(elapsed / renderer.period), Math.floor(elapsed * 12));
        options.onProgress?.(elapsed / total);
      }
      frame = globalThis.requestAnimationFrame(tick);
    };

    recorder.start(1000);
    frame = globalThis.requestAnimationFrame(tick);
  });
}

/* ------------------------------------------------------------------ */
/* Codificación cuadro a cuadro (WebCodecs)                            */
/* ------------------------------------------------------------------ */

interface Encoding {
  format: OutputFormat;
  codec: VideoCodec;
  extension: "mp4" | "webm";
  mimeType: string;
}

/** Primer códec que el navegador sabe codificar a este tamaño: MP4 (H.264…) y, si no, WebM. */
async function pickEncoding(width: number, height: number, fps: number): Promise<Encoding | null> {
  if (typeof VideoEncoder === "undefined") return null;
  const check = { width, height, frameRate: fps, quality: new Quality("very-high") };
  const candidates: { format: OutputFormat; codecs: VideoCodec[]; extension: "mp4" | "webm" }[] = [
    { format: new Mp4OutputFormat(), codecs: ["avc", "hevc", "av1", "vp9"], extension: "mp4" },
    { format: new WebMOutputFormat(), codecs: ["vp9", "av1", "vp8"], extension: "webm" },
  ];
  for (const candidate of candidates) {
    const supported = candidate.format.getSupportedVideoCodecs();
    for (const codec of candidate.codecs) {
      if (supported.includes(codec) && (await canEncodeVideo(codec, check))) {
        return {
          format: candidate.format,
          codec,
          extension: candidate.extension,
          mimeType: candidate.format.mimeType,
        };
      }
    }
  }
  return null;
}

const yieldToBrowser = () =>
  new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, 0);
  });

/**
 * Renderiza y codifica cada cuadro en su instante exacto, sin depender del
 * reloj: si la máquina tarda 200 ms en dibujar un cuadro de 4K, el video
 * igual sale a los fps pedidos, perfectamente fluido (solo tarda más en
 * generarse). Es lo que evita los saltos de la grabación en tiempo real.
 */
async function encodeFrames(
  request: VideoRequest,
  options: RecordOptions,
  encoding: Encoding,
): Promise<RecordedVideo> {
  const canvas = document.createElement("canvas");
  canvas.width = request.size.width;
  canvas.height = request.size.height;
  const renderer = createVideoRenderer(canvas, request);
  const loops = Math.max(1, Math.round(options.seconds / renderer.period));
  const frames = Math.max(1, Math.round(loops * renderer.period * options.fps));

  const target = new BufferTarget();
  const output = new Output({ format: encoding.format, target });
  const source = new CanvasSource(canvas, {
    codec: encoding.codec,
    quality: new Quality("very-high"),
    keyFrameInterval: 2,
  });
  output.addVideoTrack(source, { frameRate: options.fps });
  await output.start();

  let lastYield = performance.now();
  for (let index = 0; index < frames; index += 1) {
    if (options.signal?.aborted) {
      await output.cancel();
      throw new DOMException("Recording cancelled", "AbortError");
    }
    // Fase exacta del cuadro: el siguiente al último sería el primero.
    renderer.draw(((index / frames) * loops) % 1, Math.floor((index / options.fps) * 12));
    await source.add(index / options.fps, 1 / options.fps);
    options.onProgress?.(index / frames);
    if (performance.now() - lastYield > 40) {
      await yieldToBrowser();
      lastYield = performance.now();
    }
  }
  await output.finalize();
  options.onProgress?.(1);

  return {
    blob: new Blob([target.buffer ?? new ArrayBuffer(0)], { type: encoding.mimeType }),
    extension: encoding.extension,
    seconds: frames / options.fps,
  };
}

/**
 * Genera el video: codificación cuadro a cuadro con WebCodecs cuando el
 * navegador puede; si no, cae a la grabación en tiempo real con MediaRecorder.
 */
export async function recordVideo(
  request: VideoRequest,
  options: RecordOptions,
): Promise<RecordedVideo> {
  const encoding = await pickEncoding(request.size.width, request.size.height, options.fps);
  if (encoding) return encodeFrames(request, options, encoding);
  return recordRealtime(request, options);
}
