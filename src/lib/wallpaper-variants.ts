import {
  DESIGN_SIZE,
  drawFormula,
  drawText,
  fitScale,
  hashString,
  heroFx,
  mix,
  optionsFor,
  rgba,
  seededRandom,
  shiftHue,
  type Composer,
  type ExtraStyle,
  type WallpaperRequest,
} from "./wallpaper";

/**
 * Segundo lote de variantes del exportador. Son composiciones estáticas como
 * las de wallpaper-extra.ts, pero aisladas en su propio módulo para que el
 * archivo base no siga creciendo. Todo se dibuja con la paleta del tema activo
 * y con medidas relativas al lienzo: la misma imagen a preview que a 4K.
 */

type VariantStyle = Extract<
  ExtraStyle,
  | "prism"
  | "halftone"
  | "staircase"
  | "rings"
  | "matrix"
  | "cells"
  | "bigtype"
  | "wavefield"
  | "checker"
  | "orbitdots"
  | "textwall"
  | "spectrumbars"
  | "focusring"
  | "diagonal"
  | "bloom"
  | "frame"
>;

const TAU = Math.PI * 2;
const RAD = Math.PI / 180;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

interface Kit {
  width: number;
  height: number;
  unit: number;
  palette: WallpaperRequest["context"]["palette"];
  fonts: WallpaperRequest["context"]["fonts"];
  options: ReturnType<typeof optionsFor>;
}

function kitFor(request: WallpaperRequest): Kit {
  const { width, height } = request.size;
  return {
    width,
    height,
    unit: Math.min(width, height),
    palette: request.context.palette,
    fonts: request.context.fonts,
    options: optionsFor(request),
  };
}

/** Fórmula en una posición concreta; la usan prisma y escalera. */
function formulaAt(
  context: CanvasRenderingContext2D,
  request: WallpaperRequest,
  layout: Parameters<Composer>[2],
  kit: Kit,
  x: number,
  y: number,
  color: string,
  size = 1,
  alpha = 1,
): void {
  const scale = fitScale(layout, kit.width * 0.74, kit.height * 0.3) * kit.options.scale * size;
  drawFormula(context, layout, {
    x,
    y,
    scale,
    color,
    alpha,
    ...heroFx(request, DESIGN_SIZE * scale),
  });
}

function mainFormula(
  context: CanvasRenderingContext2D,
  request: WallpaperRequest,
  layout: Parameters<Composer>[2],
  kit: Kit,
  color: string,
  widthFactor = 0.74,
): void {
  const scale = fitScale(layout, kit.width * widthFactor, kit.height * 0.3) * kit.options.scale;
  drawFormula(context, layout, {
    x: kit.width / 2,
    y: kit.height / 2,
    scale,
    color,
    ...heroFx(request, DESIGN_SIZE * scale),
  });
}

function drawMiddle(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
  alpha = 1,
): void {
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.font = font;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, x, y);
  context.restore();
}

function drawShade(context: CanvasRenderingContext2D, kit: Kit, radius: number): void {
  const gradient = context.createRadialGradient(
    kit.width / 2,
    kit.height / 2,
    0,
    kit.width / 2,
    kit.height / 2,
    radius,
  );
  gradient.addColorStop(0, rgba(kit.palette.bg, 0.9));
  gradient.addColorStop(1, rgba(kit.palette.bg, 0));
  context.fillStyle = gradient;
  context.fillRect(0, 0, kit.width, kit.height);
}

/** Prisma: tres copias desplazadas en acento, texto y mezcla de ambos. */
const prism: Composer = (context, request, layout) => {
  const kit = kitFor(request);
  const offset = kit.unit * 0.018 * kit.options.spacingX;
  const colors = [kit.palette.accent, kit.palette.fg, mix(kit.palette.accent, kit.palette.fg, 0.5)];
  for (const [index, color] of colors.entries()) {
    formulaAt(
      context,
      request,
      layout,
      kit,
      kit.width / 2 + (index - 1) * offset,
      kit.height / 2 + (index - 1) * offset * 0.45,
      color,
      1,
      index === 1 ? 1 : 0.5,
    );
  }
};

/** Trama: puntos cuya densidad decae desde el centro. */
const halftone: Composer = (context, request, layout) => {
  const kit = kitFor(request);
  const step = kit.unit * 0.02 * Math.max(0.4, kit.options.spacingX);
  const density = Math.max(1, kit.options.count);
  context.save();
  context.fillStyle = rgba(kit.palette.accent, 0.45);
  for (let y = (kit.height / 2) % step; y < kit.height; y += step) {
    for (let x = (kit.width / 2) % step; x < kit.width; x += step) {
      const distance = clamp(
        Math.hypot(x - kit.width / 2, y - kit.height / 2) / (kit.unit * 0.6),
        0,
        1,
      );
      const radius = Math.max(0.5, step * 0.3 * (1 - distance) * (density / 5));
      context.beginPath();
      context.arc(x, y, radius, 0, TAU);
      context.fill();
    }
  }
  context.restore();
  mainFormula(context, request, layout, kit, kit.palette.fg);
};

/** Escalera: la misma fórmula retrocediendo en diagonal. */
const staircase: Composer = (context, request, layout) => {
  const kit = kitFor(request);
  const count = Math.max(2, Math.round(kit.options.count));
  const gap = kit.unit * 0.05 * kit.options.spacingY;
  for (let index = count - 1; index >= 0; index -= 1) {
    formulaAt(
      context,
      request,
      layout,
      kit,
      kit.width / 2 + index * gap * 0.6,
      kit.height / 2 + index * gap,
      index === 0 ? kit.palette.fg : kit.palette.accent,
      1 - index * 0.07,
      index === 0 ? 1 : 0.3,
    );
  }
};

/** Anillos: circunferencias finas concéntricas alrededor de la fórmula. */
const rings: Composer = (context, request, layout) => {
  const kit = kitFor(request);
  const count = Math.max(1, Math.round(kit.options.count));
  context.save();
  context.strokeStyle = kit.palette.accent;
  context.lineWidth = Math.max(1, kit.unit * 0.0015);
  for (let index = 1; index <= count; index += 1) {
    const radius = kit.unit * 0.06 * kit.options.radius * index;
    context.globalAlpha = 0.45 * (1 - index / (count + 1));
    context.beginPath();
    context.arc(kit.width / 2, kit.height / 2, radius, 0, TAU);
    context.stroke();
  }
  context.restore();
  mainFormula(context, request, layout, kit, kit.palette.fg);
};

/** Matriz: columnas de glifos del propio AST, con ritmo determinista. */
const matrix: Composer = (context, request, layout) => {
  const kit = kitFor(request);
  const random = seededRandom(hashString(request.formula.id));
  const glyphs = layout.glyphs.map((glyph) => glyph.value);
  const columns = Math.max(3, Math.round(kit.options.count * 3));
  const columnWidth = kit.width / columns;
  const rowHeight = kit.unit * 0.03;
  const font = `500 ${String(Math.round(kit.unit * 0.018))}px ${kit.fonts.formula}`;

  for (let column = 0; column < columns; column += 1) {
    for (let y = 0; y < kit.height; y += rowHeight) {
      const glyph = glyphs[Math.floor(random() * glyphs.length)];
      if (glyph) {
        drawMiddle(
          context,
          glyph,
          (column + 0.5) * columnWidth,
          y,
          font,
          kit.palette.accent,
          0.08 + random() * 0.22,
        );
      }
    }
  }
  drawShade(context, kit, kit.unit * 0.44);
  mainFormula(context, request, layout, kit, kit.palette.fg);
};

/** Celdas: cada símbolo en su propia casilla, como un tablero de tipos. */
const cells: Composer = (context, request, layout) => {
  const kit = kitFor(request);
  const total = layout.glyphs.length;
  const columns = Math.ceil(Math.sqrt(total));
  const rows = Math.ceil(total / columns);
  const gap = kit.unit * 0.01 * kit.options.spacingX;
  const cellSize =
    Math.min((kit.width * 0.8) / columns, (kit.height * 0.7) / rows) * kit.options.scale;
  const gridWidth = columns * cellSize + (columns - 1) * gap;
  const gridHeight = rows * cellSize + (rows - 1) * gap;
  const startX = (kit.width - gridWidth) / 2;
  const startY = (kit.height - gridHeight) / 2;

  for (const [index, glyph] of layout.glyphs.entries()) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    drawMiddle(
      context,
      glyph.value,
      startX + column * (cellSize + gap) + cellSize / 2,
      startY + row * (cellSize + gap) + cellSize / 2,
      `500 ${String(Math.round(cellSize * 0.7))}px ${kit.fonts.formula}`,
      index === Math.round(kit.options.focus) ? kit.palette.accent : kit.palette.fg,
      0.85,
    );
  }
};

/** Tipografía gigante: un glifo de fondo con la fórmula completa encima. */
const bigtype: Composer = (context, request, layout) => {
  const kit = kitFor(request);
  const index = clamp(Math.round(kit.options.focus), 0, layout.glyphs.length - 1);
  const glyph = layout.glyphs[index]?.value ?? "π";
  context.save();
  context.translate(kit.width / 2, kit.height / 2);
  context.rotate(kit.options.rotation * RAD);
  drawMiddle(
    context,
    glyph,
    0,
    0,
    `500 ${String(Math.round(kit.unit * 0.72))}px ${kit.fonts.formula}`,
    kit.palette.accent,
    0.12,
  );
  context.restore();
  mainFormula(context, request, layout, kit, kit.palette.fg, 0.6);
};

/** Campo de ondas: filas de glifos siguiendo senos desfasados. */
const wavefield: Composer = (context, request, layout) => {
  const kit = kitFor(request);
  const rows = Math.max(1, Math.round(kit.options.count));
  const amplitude = kit.unit * 0.06 * kit.options.radius;
  const step = kit.unit * 0.04;
  const glyphs = layout.glyphs.map((glyph) => glyph.value);
  const font = `500 ${String(Math.round(kit.unit * 0.022))}px ${kit.fonts.formula}`;

  for (let row = 0; row < rows; row += 1) {
    for (let x = 0; x < kit.width; x += step) {
      const y =
        kit.height / 2 +
        Math.sin((x / kit.width) * TAU * (row + 1) + row) * amplitude * (1 - row / (rows * 2));
      drawMiddle(context, glyphs[row % glyphs.length] ?? "·", x, y, font, kit.palette.accent, 0.18);
    }
  }
  drawShade(context, kit, kit.unit * 0.42);
  mainFormula(context, request, layout, kit, kit.palette.fg);
};

/** Tablero: celdas claras y oscuras sin bordes, solo bloques de color. */
const checker: Composer = (context, request, layout) => {
  const kit = kitFor(request);
  const cell = kit.unit * 0.06 * Math.max(0.4, kit.options.spacingX);
  for (let row = 0; row * cell < kit.height; row += 1) {
    for (let column = 0; column * cell < kit.width; column += 1) {
      if ((row + column) % 2 !== 0) continue;
      context.fillStyle = rgba(kit.palette.accent, 0.12);
      context.fillRect(column * cell, row * cell, cell, cell);
    }
  }
  drawShade(context, kit, kit.unit * 0.5);
  mainFormula(context, request, layout, kit, kit.palette.fg);
};

/** Órbitas punteadas: puntos distribuidos en anillos concéntricos. */
const orbitdots: Composer = (context, request, layout) => {
  const kit = kitFor(request);
  const ringsCount = Math.max(1, Math.round(kit.options.count));
  context.save();
  context.fillStyle = kit.palette.accent;
  for (let ring = 1; ring <= ringsCount; ring += 1) {
    const radius = kit.unit * 0.07 * kit.options.radius * ring;
    const dots = 8 + ring * 4;
    for (let dot = 0; dot < dots; dot += 1) {
      const angle = (dot / dots) * TAU + ring * 0.3;
      context.globalAlpha = 0.5 * (1 - ring / (ringsCount + 2));
      context.beginPath();
      context.arc(
        kit.width / 2 + Math.cos(angle) * radius,
        kit.height / 2 + Math.sin(angle) * radius,
        Math.max(1, kit.unit * 0.004),
        0,
        TAU,
      );
      context.fill();
    }
  }
  context.restore();
  mainFormula(context, request, layout, kit, kit.palette.fg);
};

/** Muro de texto: el título repetido en diagonal como textura tipográfica. */
const textwall: Composer = (context, request, layout) => {
  const kit = kitFor(request);
  const text = request.formula.title[request.locale].toUpperCase();
  const stepX = kit.unit * 0.12 * Math.max(0.3, kit.options.spacingX);
  const stepY = kit.unit * 0.1 * Math.max(0.3, kit.options.spacingY);
  context.save();
  context.translate(kit.width / 2, kit.height / 2);
  context.rotate((kit.options.rotation - 20) * RAD);
  for (let y = -kit.height; y < kit.height; y += stepY) {
    for (let x = -kit.width; x < kit.width; x += stepX) {
      drawText(context, text, {
        x,
        y,
        font: `500 ${String(Math.round(kit.unit * 0.025))}px ${kit.fonts.mono}`,
        color: kit.palette.fg,
        alpha: 0.07,
      });
    }
  }
  context.restore();
  drawShade(context, kit, kit.unit * 0.46);
  mainFormula(context, request, layout, kit, kit.palette.accent);
};

/** Barras de espectro: franjas de matices del acento, de sobrias a brillantes. */
const spectrumbars: Composer = (context, request, layout) => {
  const kit = kitFor(request);
  const bars = Math.max(2, Math.round(kit.options.count));
  const barHeight = (kit.height * 0.7) / bars;
  for (let index = 0; index < bars; index += 1) {
    context.fillStyle = mix(
      kit.palette.bg,
      shiftHue(kit.palette.accent, (index / bars) * 60 - 30),
      0.32,
    );
    context.fillRect(0, kit.height * 0.15 + index * barHeight, kit.width, barHeight);
  }
  drawShade(context, kit, kit.unit * 0.5);
  mainFormula(context, request, layout, kit, kit.palette.fg);
};

/** Foco central: un símbolo protagonista y los demás orbitando a su alrededor. */
const focusring: Composer = (context, request, layout) => {
  const kit = kitFor(request);
  const focus = clamp(Math.round(kit.options.focus), 0, layout.glyphs.length - 1);
  const highlighted = layout.glyphs[focus];
  const radius = kit.unit * 0.28 * kit.options.radius;
  if (highlighted) {
    drawMiddle(
      context,
      highlighted.value,
      kit.width / 2,
      kit.height / 2,
      `500 ${String(Math.round(kit.unit * 0.46))}px ${kit.fonts.formula}`,
      kit.palette.accent,
      0.12,
    );
  }
  for (const [index, glyph] of layout.glyphs.entries()) {
    if (index === focus) continue;
    const angle = (index / layout.glyphs.length) * TAU;
    drawMiddle(
      context,
      glyph.value,
      kit.width / 2 + Math.cos(angle) * radius,
      kit.height / 2 + Math.sin(angle) * radius,
      `500 ${String(Math.round(kit.unit * 0.06))}px ${kit.fonts.formula}`,
      kit.palette.fg,
      0.7,
    );
  }
  mainFormula(context, request, layout, kit, kit.palette.fg, 0.5);
};

/** Diagonal: bandas de texto inclinadas con la fórmula limpia encima. */
const diagonal: Composer = (context, request, layout) => {
  const kit = kitFor(request);
  const text = request.formula.title[request.locale].toUpperCase();
  const step = kit.unit * 0.16 * Math.max(0.4, kit.options.spacingX);
  context.save();
  context.translate(kit.width / 2, kit.height / 2);
  context.rotate((kit.options.rotation - 20) * RAD);
  for (let index = -6; index <= 6; index += 1) {
    drawText(context, text, {
      x: index * step,
      y: 0,
      font: `500 ${String(Math.round(kit.unit * 0.035))}px ${kit.fonts.mono}`,
      color: kit.palette.accent,
      alpha: 0.12,
    });
  }
  context.restore();
  drawShade(context, kit, kit.unit * 0.48);
  mainFormula(context, request, layout, kit, kit.palette.fg);
};

/** Destello: rayos finos desde el centro, como una exposición radial. */
const bloom: Composer = (context, request, layout) => {
  const kit = kitFor(request);
  const rays = Math.max(6, Math.round(kit.options.count) * 10);
  const inner = kit.unit * 0.12 * kit.options.radius;
  const outer = kit.unit * 0.52 * kit.options.radius;
  context.save();
  context.strokeStyle = kit.palette.accent;
  context.lineWidth = Math.max(1, kit.unit * 0.0012);
  for (let index = 0; index < rays; index += 1) {
    const angle = (index / rays) * TAU;
    context.globalAlpha = 0.08 + (index % 3) * 0.05;
    context.beginPath();
    context.moveTo(
      kit.width / 2 + Math.cos(angle) * inner,
      kit.height / 2 + Math.sin(angle) * inner,
    );
    context.lineTo(
      kit.width / 2 + Math.cos(angle) * outer,
      kit.height / 2 + Math.sin(angle) * outer,
    );
    context.stroke();
  }
  context.restore();
  mainFormula(context, request, layout, kit, kit.palette.fg);
};

/** Marco tipográfico: marcas de esquina en vez de bordes, con la fórmula centro. */
const frame: Composer = (context, request, layout) => {
  const kit = kitFor(request);
  const inset = kit.unit * 0.08 * Math.max(0.4, kit.options.spacingX);
  const length = kit.unit * 0.07;
  context.save();
  context.strokeStyle = kit.palette.accent;
  context.lineWidth = Math.max(2, kit.unit * 0.002);
  for (const [x, y, dx, dy] of [
    [inset, inset, 1, 1],
    [kit.width - inset, inset, -1, 1],
    [inset, kit.height - inset, 1, -1],
    [kit.width - inset, kit.height - inset, -1, -1],
  ] as const) {
    context.beginPath();
    context.moveTo(x + dx * length, y);
    context.lineTo(x, y);
    context.lineTo(x, y + dy * length);
    context.stroke();
  }
  context.restore();
  mainFormula(context, request, layout, kit, kit.palette.fg);
};

export const variantComposers: Record<VariantStyle, Composer> = {
  prism,
  halftone,
  staircase,
  rings,
  matrix,
  cells,
  bigtype,
  wavefield,
  checker,
  orbitdots,
  textwall,
  spectrumbars,
  focusring,
  diagonal,
  bloom,
  frame,
};
