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
 * Composiciones estáticas adicionales del exportador de imágenes. Cada una es
 * un `Composer`: recibe el contexto ya con el fondo pintado y el layout de la
 * fórmula medido, y dibuja; el marco (marca, efecto) lo pone drawComposed.
 */

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

/** Halo del color de fondo detrás de la fórmula: la separa de lo que pasa detrás. */
function drawShade(
  context: CanvasRenderingContext2D,
  kit: Kit,
  radius: number,
  strength: number,
  cy = kit.height / 2,
): void {
  const gradient = context.createRadialGradient(kit.width / 2, cy, 0, kit.width / 2, cy, radius);
  gradient.addColorStop(0, rgba(kit.palette.bg, strength));
  gradient.addColorStop(1, rgba(kit.palette.bg, 0));
  context.save();
  context.fillStyle = gradient;
  context.fillRect(0, 0, kit.width, kit.height);
  context.restore();
}

/** Texto centrado con baseline medio y un cuerpo de letra arbitrario. */
function drawMiddle(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
  alpha = 1,
  rotation = 0,
): void {
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.font = font;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.translate(x, y);
  context.rotate(rotation);
  context.fillText(text, 0, 0);
  context.restore();
}

/**
 * Plano: papel cuadriculado de ingeniería, la fórmula en contorno con cotas
 * numeradas bajo cada símbolo y un cajetín con los datos.
 */
const blueprint: Composer = (context, request, layout) => {
  const kit = kitFor(request);
  const { width, height, unit, palette, fonts, options } = kit;
  const { formula, locale } = request;
  const cell = unit * 0.04 * Math.max(0.3, options.spacingX);

  context.save();
  context.lineWidth = 1;
  for (const [step, alpha] of [
    [cell, 0.07],
    [cell * 5, 0.16],
  ] as const) {
    context.strokeStyle = rgba(palette.fg, alpha);
    context.beginPath();
    for (let x = (width / 2) % step; x < width; x += step) {
      context.moveTo(Math.round(x) + 0.5, 0);
      context.lineTo(Math.round(x) + 0.5, height);
    }
    for (let y = (height / 2) % step; y < height; y += step) {
      context.moveTo(0, Math.round(y) + 0.5);
      context.lineTo(width, Math.round(y) + 0.5);
    }
    context.stroke();
  }
  context.restore();

  const scale = fitScale(layout, width * 0.72, height * 0.3) * options.scale;
  drawFormula(context, layout, {
    x: width / 2,
    y: height / 2,
    scale,
    color: palette.accent,
    outline: Math.max(2, unit * 0.003),
  });

  const half = (layout.height * scale) / 2;
  const dimensionY = height / 2 + half + unit * 0.07;
  const tick = unit * 0.012;
  context.save();
  context.strokeStyle = rgba(palette.fg, 0.55);
  context.lineWidth = Math.max(1, unit * 0.0016);
  for (const [index, glyph] of layout.glyphs.entries()) {
    const left = width / 2 + (glyph.x - layout.width / 2) * scale;
    const right = left + glyph.width * scale;
    context.globalAlpha = 0.25;
    context.beginPath();
    context.moveTo(left, height / 2 + half);
    context.lineTo(left, dimensionY + tick);
    context.moveTo(right, height / 2 + half);
    context.lineTo(right, dimensionY + tick);
    context.stroke();
    context.globalAlpha = 0.8;
    context.beginPath();
    context.moveTo(left, dimensionY);
    context.lineTo(right, dimensionY);
    context.moveTo(left, dimensionY - tick);
    context.lineTo(left, dimensionY + tick);
    context.moveTo(right, dimensionY - tick);
    context.lineTo(right, dimensionY + tick);
    context.stroke();
    drawMiddle(
      context,
      String(index + 1).padStart(2, "0"),
      (left + right) / 2,
      dimensionY + unit * 0.03,
      `500 ${String(Math.round(unit * 0.014))}px ${fonts.mono}`,
      palette.fg,
      0.7,
    );
  }
  context.restore();

  const mono = `500 ${String(Math.round(unit * 0.014))}px ${fonts.mono}`;
  drawText(context, formula.title[locale].toUpperCase(), {
    x: unit * 0.05,
    y: height - unit * 0.075,
    font: mono,
    color: palette.fg,
    alpha: 0.75,
    align: "left",
  });
  drawText(context, `${formula.context.author[locale]} · ${formula.context.era[locale]}`, {
    x: unit * 0.05,
    y: height - unit * 0.05,
    font: mono,
    color: palette.fg,
    alpha: 0.45,
    align: "left",
  });
  context.save();
  context.strokeStyle = palette.accent;
  context.lineWidth = Math.max(1, unit * 0.002);
  for (const [cx, cy, dx, dy] of [
    [unit * 0.04, unit * 0.04, 1, 1],
    [width - unit * 0.04, unit * 0.04, -1, 1],
  ] as const) {
    context.beginPath();
    context.moveTo(cx, cy + dy * unit * 0.03);
    context.lineTo(cx, cy);
    context.lineTo(cx + dx * unit * 0.03, cy);
    context.stroke();
  }
  context.restore();
};

/** Mosaico: cada símbolo en su baldosa, alternando relleno y hueco como un tablero. */
const mosaic: Composer = (context, request, layout) => {
  const { width, height, unit, palette, fonts, options } = kitFor(request);
  const total = layout.glyphs.length;
  const columns = clamp(Math.round(options.count), 1, Math.max(1, total));
  const rows = Math.ceil(total / columns);
  const gap = unit * 0.012 * options.spacingX;
  const cell = Math.min((width * 0.9) / columns, (height * 0.9) / rows) * options.scale;
  const gridWidth = columns * cell;
  const gridHeight = rows * cell;
  const left = (width - gridWidth) / 2;
  const top = (height - gridHeight) / 2;

  for (const [index, glyph] of layout.glyphs.entries()) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = left + column * cell;
    const y = top + row * cell;
    const filled = (column + row) % 2 === 0;
    context.fillStyle = filled ? palette.accent : rgba(palette.fg, 0.07);
    context.fillRect(x + gap / 2, y + gap / 2, cell - gap, cell - gap);
    const fit = Math.min(cell * 0.56, (cell * 0.72 * DESIGN_SIZE) / Math.max(1, glyph.width));
    drawMiddle(
      context,
      glyph.value,
      x + cell / 2,
      y + cell / 2,
      `500 ${String(Math.round(fit))}px ${fonts.formula}`,
      filled ? palette.accentFg : palette.accent,
    );
    drawText(context, String(index + 1).padStart(2, "0"), {
      x: x + cell * 0.1,
      y: y + cell * 0.16,
      font: `500 ${String(Math.round(cell * 0.07))}px ${fonts.mono}`,
      color: filled ? palette.accentFg : palette.fg,
      alpha: 0.6,
      align: "left",
    });
  }
};

/** Eclipse: un disco oscuro con corona y anillos, y la fórmula cruzándolo. */
const eclipse: Composer = (context, request, layout) => {
  const kit = kitFor(request);
  const { width, height, unit, palette, options } = kit;
  const radius = unit * 0.3 * options.radius;

  const corona = context.createRadialGradient(
    width / 2,
    height / 2,
    radius * 0.9,
    width / 2,
    height / 2,
    radius * 2.4,
  );
  corona.addColorStop(0, rgba(palette.accent, 0.55));
  corona.addColorStop(0.35, rgba(palette.accent, 0.14));
  corona.addColorStop(1, rgba(palette.accent, 0));
  context.fillStyle = corona;
  context.fillRect(0, 0, width, height);

  context.save();
  context.strokeStyle = palette.accent;
  for (const [factor, alpha] of [
    [1.25, 0.35],
    [1.55, 0.2],
    [1.95, 0.1],
  ] as const) {
    context.globalAlpha = alpha;
    context.lineWidth = Math.max(1, unit * 0.002);
    context.beginPath();
    context.arc(width / 2, height / 2, radius * factor, 0, TAU);
    context.stroke();
  }
  context.restore();

  context.save();
  context.fillStyle = palette.bg;
  context.shadowColor = palette.accent;
  context.shadowBlur = unit * 0.05;
  context.beginPath();
  context.arc(width / 2, height / 2, radius, 0, TAU);
  context.fill();
  context.restore();
  context.save();
  context.strokeStyle = palette.accent;
  context.lineWidth = Math.max(2, unit * 0.004);
  context.beginPath();
  context.arc(width / 2, height / 2, radius, 0, TAU);
  context.stroke();
  context.restore();

  const scale = fitScale(layout, radius * 1.7, radius * 0.6) * options.scale;
  drawFormula(context, layout, {
    x: width / 2,
    y: height / 2,
    scale,
    color: palette.fg,
    ...heroFx(request, DESIGN_SIZE * scale),
  });
};

/** Espejo: la fórmula sobre un piso pulido, con su reflejo que se desvanece. */
const mirror: Composer = (context, request, layout) => {
  const { width, height, unit, palette, options } = kitFor(request);
  const scale = fitScale(layout, width * 0.7, height * 0.22) * options.scale;
  const size = layout.height * scale;
  const y = height * 0.4;
  const floor = y + size / 2 + unit * 0.012;
  const fx = heroFx(request, DESIGN_SIZE * scale);

  context.save();
  context.translate(0, 2 * floor);
  context.scale(1, -1);
  drawFormula(context, layout, { x: width / 2, y, scale, color: palette.accent, alpha: 0.5 });
  context.restore();

  const fade = context.createLinearGradient(
    0,
    floor,
    0,
    floor + size * (0.9 + options.spacingY * 0.8),
  );
  fade.addColorStop(0, rgba(palette.bg, 0.1));
  fade.addColorStop(1, rgba(palette.bg, 1));
  context.fillStyle = fade;
  context.fillRect(0, floor, width, height - floor);

  context.save();
  context.strokeStyle = rgba(palette.fg, 0.35);
  context.lineWidth = Math.max(1, unit * 0.0015);
  context.beginPath();
  context.moveTo(width * 0.1, floor);
  context.lineTo(width * 0.9, floor);
  context.stroke();
  context.restore();

  drawFormula(context, layout, { x: width / 2, y, scale, color: palette.accent, ...fx });
};

/** Franjas: bandas alternadas donde la fórmula cambia de color al cruzar cada una. */
const stripes: Composer = (context, request, layout) => {
  const { width, height, palette, options } = kitFor(request);
  const bands = Math.max(2, Math.round(options.count) * 2);
  const angle = options.rotation * RAD;
  const reach = Math.hypot(width, height);
  const bandHeight = reach / bands;
  const scale = fitScale(layout, width * 0.8, height * 0.4) * options.scale;
  const fx = heroFx(request, DESIGN_SIZE * scale);

  context.save();
  context.translate(width / 2, height / 2);
  context.rotate(angle);
  context.fillStyle = palette.accent;
  for (let band = 0; band < bands; band += 2) {
    context.fillRect(-reach, -reach / 2 + band * bandHeight, reach * 2, bandHeight + 1);
  }
  context.restore();

  // Segunda pasada con clip por banda: el color de la fórmula invierte el del fondo.
  for (let band = 0; band < bands; band += 1) {
    const filled = band % 2 === 0;
    context.save();
    context.translate(width / 2, height / 2);
    context.rotate(angle);
    context.beginPath();
    context.rect(-reach, -reach / 2 + band * bandHeight, reach * 2, bandHeight + 1);
    context.clip();
    context.rotate(-angle);
    context.translate(-width / 2, -height / 2);
    drawFormula(context, layout, {
      x: width / 2,
      y: height / 2,
      scale,
      color: filled ? palette.bg : palette.accent,
      ...(filled ? {} : fx),
    });
    context.restore();
  }
};

/** Confeti: una lluvia de símbolos de todos los tamaños y la fórmula al frente. */
const confetti: Composer = (context, request, layout) => {
  const kit = kitFor(request);
  const { width, height, unit, palette, fonts, options } = kit;
  const random = seededRandom(hashString(request.formula.id));
  const total = Math.max(1, Math.round(options.count)) * 28;
  const tilt = options.rotation * RAD;
  const pieces = Array.from({ length: total }, () => ({
    glyph: layout.glyphs[Math.floor(random() * layout.glyphs.length)],
    x: random() * width,
    y: random() * height,
    size: unit * (0.03 + random() ** 2.2 * 0.34),
    angle: tilt + (random() - 0.5) * 1.2,
    tone: random(),
  })).sort((a, b) => b.size - a.size);

  for (const piece of pieces) {
    if (!piece.glyph) continue;
    drawMiddle(
      context,
      piece.glyph.value,
      piece.x,
      piece.y,
      `500 ${String(Math.round(piece.size))}px ${fonts.formula}`,
      piece.tone > 0.55 ? palette.accent : palette.fg,
      0.05 + (1 - piece.size / (unit * 0.37)) * 0.3,
      piece.angle,
    );
  }
  const scale = fitScale(layout, width * 0.62, height * 0.2) * options.scale;
  drawShade(context, kit, Math.max(layout.width * scale * 0.62, unit * 0.25), 0.9);
  drawFormula(context, layout, {
    x: width / 2,
    y: height / 2,
    scale,
    color: palette.accent,
    ...heroFx(request, DESIGN_SIZE * scale),
  });
};

/** Ondas: decenas de líneas ondulantes que se degradan del texto al acento. */
const waves: Composer = (context, request, layout) => {
  const kit = kitFor(request);
  const { width, height, unit, palette, options } = kit;
  const lines = Math.max(2, Math.round(options.count)) * 6;
  const amplitude = unit * 0.05 * options.radius;

  context.save();
  context.translate(width / 2, height / 2);
  context.rotate(options.rotation * RAD);
  context.translate(-width / 2, -height / 2);
  context.lineWidth = Math.max(1.5, unit * 0.0025);
  context.lineJoin = "round";
  const span = Math.hypot(width, height);
  const left = (width - span) / 2;
  const top = (height - span) / 2;
  for (let index = 0; index < lines; index += 1) {
    const t = index / (lines - 1);
    const base = top + t * span;
    const strength = 0.4 + 0.6 * Math.sin(Math.PI * t);
    context.strokeStyle = mix(palette.fg, palette.accent, t);
    context.globalAlpha = 0.25 + 0.5 * strength;
    context.beginPath();
    for (let x = 0; x <= span; x += span / 160) {
      const u = x / span;
      const y =
        base +
        amplitude * strength * Math.sin(u * TAU * 2.2 + index * 0.35 - TAU * 2 * options.moment) +
        amplitude * 0.4 * Math.sin(u * TAU * 5 + index * 0.8 + TAU * options.moment);
      if (x === 0) context.moveTo(left + x, y);
      else context.lineTo(left + x, y);
    }
    context.stroke();
  }
  context.restore();

  const scale = fitScale(layout, width * 0.66, height * 0.2) * options.scale;
  drawShade(context, kit, Math.max(layout.width * scale * 0.65, unit * 0.28), 0.95);
  drawFormula(context, layout, {
    x: width / 2,
    y: height / 2,
    scale,
    color: palette.accent,
    ...heroFx(request, DESIGN_SIZE * scale),
  });
};

/** Letrero: tubos de neón — contorno con varias capas de brillo y un núcleo blanco. */
const neon: Composer = (context, request, layout) => {
  const { width, height, unit, palette, options } = kitFor(request);
  const scale = fitScale(layout, width * 0.76, height * 0.34) * options.scale;
  const glow = unit * 0.05 * options.radius;
  const halo = context.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    Math.max(layout.width * scale * 0.7, unit * 0.3),
  );
  halo.addColorStop(0, rgba(palette.accent, 0.16));
  halo.addColorStop(1, rgba(palette.accent, 0));
  context.fillStyle = halo;
  context.fillRect(0, 0, width, height);

  const pass = (thickness: number, color: string, alpha: number, blur: number) => {
    drawFormula(context, layout, {
      x: width / 2,
      y: height / 2,
      scale,
      color,
      alpha,
      outline: thickness,
      glow: blur,
    });
  };
  pass(unit * 0.022, palette.accent, 0.2, glow * 1.6);
  pass(unit * 0.009, palette.accent, 0.7, glow);
  pass(unit * 0.0035, palette.fg, 1, glow * 0.4);
};

/** Sello: una insignia circular con el título girando en el borde y la fórmula al centro. */
const seal: Composer = (context, request, layout) => {
  const { width, height, unit, palette, fonts, options } = kitFor(request);
  const { formula, locale } = request;
  const radius = unit * 0.38 * options.radius;
  const size = Math.round(unit * 0.026);
  const font = `500 ${String(size)}px ${fonts.mono}`;
  const text =
    `${formula.title[locale]} · ${formula.context.author[locale]} · ${formula.context.era[locale]} · `.toUpperCase();

  context.save();
  context.font = font;
  const chars = Array.from(
    new Intl.Segmenter(locale, { granularity: "grapheme" }).segment(text),
    (part) => part.segment,
  );
  const widths = chars.map((char) => context.measureText(char).width);
  const unitWidth = widths.reduce((sum, value) => sum + value, 0);
  const circumference = TAU * radius;
  const repeats = Math.max(1, Math.floor(circumference / unitWidth));
  const spacing = (circumference - repeats * unitWidth) / (repeats * chars.length);
  let travelled = 0;
  for (let repeat = 0; repeat < repeats; repeat += 1) {
    for (const [index, char] of chars.entries()) {
      const advance = widths[index] ?? 0;
      const angle =
        options.rotation * RAD - Math.PI / 2 + ((travelled + advance / 2) / circumference) * TAU;
      context.save();
      context.translate(
        width / 2 + Math.cos(angle) * radius,
        height / 2 + Math.sin(angle) * radius,
      );
      context.rotate(angle + Math.PI / 2);
      context.fillStyle = palette.fg;
      context.globalAlpha = 0.85;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(char, 0, 0);
      context.restore();
      travelled += advance + spacing;
    }
  }
  context.restore();

  context.save();
  context.strokeStyle = palette.accent;
  for (const [factor, weight] of [
    [1.09, 0.004],
    [0.9, 0.0025],
    [0.87, 0.0012],
  ] as const) {
    context.lineWidth = Math.max(1, unit * weight);
    context.beginPath();
    context.arc(width / 2, height / 2, radius * factor, 0, TAU);
    context.stroke();
  }
  context.restore();

  const scale = fitScale(layout, radius * 1.45, radius * 0.5) * options.scale;
  drawFormula(context, layout, {
    x: width / 2,
    y: height / 2,
    scale,
    color: palette.accent,
    ...heroFx(request, DESIGN_SIZE * scale),
  });
};

/** Matriz LED: la fórmula hecha de puntos luminosos sobre una rejilla apagada. */
const led: Composer = (context, request, layout) => {
  const { width, height, unit, palette, options } = kitFor(request);
  const cell = unit / (40 + Math.max(1, Math.round(options.count)) * 12);
  const columns = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const sample = document.createElement("canvas");
  sample.width = columns;
  sample.height = rows;
  const sampleContext = sample.getContext("2d", { willReadFrequently: true });
  if (!sampleContext) return;
  sampleContext.textAlign = "center";
  sampleContext.textBaseline = "alphabetic";
  drawFormula(sampleContext, layout, {
    x: columns / 2,
    y: rows / 2,
    scale: fitScale(layout, columns * 0.8, rows * 0.4) * options.scale,
    color: "#ffffff",
  });
  const pixels = sampleContext.getImageData(0, 0, columns, rows).data;

  context.fillStyle = rgba(palette.fg, 0.07);
  context.beginPath();
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = (column + 0.5) * cell;
      const y = (row + 0.5) * cell;
      context.moveTo(x + cell * 0.16, y);
      context.arc(x, y, cell * 0.16, 0, TAU);
    }
  }
  context.fill();

  context.save();
  context.fillStyle = palette.accent;
  context.shadowColor = palette.accent;
  context.shadowBlur = cell * 1.2;
  context.beginPath();
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const alpha = (pixels[(row * columns + column) * 4 + 3] ?? 0) / 255;
      if (alpha < 0.12) continue;
      const x = (column + 0.5) * cell;
      const y = (row + 0.5) * cell;
      const dot = cell * (0.16 + 0.3 * alpha);
      context.moveTo(x + dot, y);
      context.arc(x, y, dot, 0, TAU);
    }
  }
  context.fill();
  context.restore();
};

/** Degradado: un fondo de color continuo en tonos del acento con la fórmula limpia encima. */
const gradient: Composer = (context, request, layout) => {
  const { width, height, unit, palette, options } = kitFor(request);
  const angle = (options.rotation - 35) * RAD;
  const reach = Math.hypot(width, height) / 2;
  const fill = context.createLinearGradient(
    width / 2 - Math.cos(angle) * reach,
    height / 2 - Math.sin(angle) * reach,
    width / 2 + Math.cos(angle) * reach,
    height / 2 + Math.sin(angle) * reach,
  );
  fill.addColorStop(0, mix(palette.bg, shiftHue(palette.accent, -50), 0.75));
  fill.addColorStop(0.5, mix(palette.bg, palette.accent, 0.35));
  fill.addColorStop(1, mix(palette.bg, shiftHue(palette.accent, 60), 0.85));
  context.fillStyle = fill;
  context.fillRect(0, 0, width, height);

  const scale = fitScale(layout, width * 0.7, height * 0.3) * options.scale;
  drawFormula(context, layout, {
    x: width / 2,
    y: height / 2,
    scale,
    color: palette.fg,
    ...heroFx(request, DESIGN_SIZE * scale),
  });
  drawText(context, request.formula.title[request.locale].toUpperCase(), {
    x: width / 2,
    y: height / 2 + (layout.height * scale) / 2 + unit * 0.08,
    font: `500 ${String(Math.round(unit * 0.016))}px ${request.context.fonts.mono}`,
    color: palette.fg,
    alpha: 0.7,
  });
};

/** Recorte: una losa de color con la fórmula gigante vaciada, que deja ver una trama detrás. */
const knockout: Composer = (context, request, layout) => {
  const { width, height, unit, palette, options } = kitFor(request);
  context.save();
  context.strokeStyle = rgba(palette.fg, 0.55);
  context.lineWidth = Math.max(2, unit * 0.004);
  const step = unit * 0.025;
  context.beginPath();
  for (let offset = -height; offset < width; offset += step) {
    context.moveTo(offset, height);
    context.lineTo(offset + height, 0);
  }
  context.stroke();
  context.restore();

  const slab = document.createElement("canvas");
  slab.width = width;
  slab.height = height;
  const slabContext = slab.getContext("2d");
  if (!slabContext) return;
  slabContext.fillStyle = palette.accent;
  slabContext.fillRect(0, 0, width, height);
  slabContext.globalCompositeOperation = "destination-out";
  slabContext.textAlign = "center";
  slabContext.textBaseline = "alphabetic";
  drawFormula(slabContext, layout, {
    x: width / 2,
    y: height / 2,
    scale: fitScale(layout, width * 0.94, height * 0.7) * options.scale,
    color: "#000000",
  });
  context.drawImage(slab, 0, 0);
};

/** Fichas: cada símbolo en una ficha numerada con su tipo, como una tabla de elementos. */
const cards: Composer = (context, request, layout) => {
  const { width, height, unit, palette, fonts, options } = kitFor(request);
  const total = layout.glyphs.length;
  const rows = total > 8 ? 2 : 1;
  const perRow = Math.ceil(total / rows);
  const gap = unit * 0.02 * options.spacingX;
  const tile =
    Math.min(
      (width * 0.88 - gap * (perRow - 1)) / perRow,
      (height * 0.5 - gap * (rows - 1)) / rows,
      unit * 0.34,
    ) * options.scale;
  const gridHeight = rows * tile + (rows - 1) * gap;
  const top = (height - gridHeight) / 2 - unit * 0.03;

  for (const [index, glyph] of layout.glyphs.entries()) {
    const row = Math.floor(index / perRow);
    const inRow = row === rows - 1 ? total - row * perRow : perRow;
    const rowWidth = inRow * tile + (inRow - 1) * gap;
    const x = (width - rowWidth) / 2 + (index - row * perRow) * (tile + gap);
    const y = top + row * (tile + gap);
    context.fillStyle = rgba(palette.accent, 0.14);
    context.fillRect(x, y, tile, tile);
    context.fillStyle = palette.accent;
    context.fillRect(x, y, tile, Math.max(2, tile * 0.03));
    const fit = Math.min(tile * 0.5, (tile * 0.7 * DESIGN_SIZE) / Math.max(1, glyph.width));
    drawMiddle(
      context,
      glyph.value,
      x + tile / 2,
      y + tile * 0.52,
      `500 ${String(Math.round(fit))}px ${fonts.formula}`,
      palette.accent,
    );
    const small = `500 ${String(Math.round(tile * 0.075))}px ${fonts.mono}`;
    drawText(context, String(index + 1).padStart(2, "0"), {
      x: x + tile * 0.08,
      y: y + tile * 0.17,
      font: small,
      color: palette.fg,
      alpha: 0.7,
      align: "left",
    });
    drawText(context, (request.formula.nodes[index]?.type ?? "").toUpperCase(), {
      x: x + tile * 0.08,
      y: y + tile * 0.93,
      font: small,
      color: palette.fg,
      alpha: 0.5,
      align: "left",
    });
  }
  drawText(context, request.formula.title[request.locale].toUpperCase(), {
    x: width / 2,
    y: top + gridHeight + unit * 0.08,
    font: `500 ${String(Math.round(unit * 0.018))}px ${fonts.mono}`,
    color: palette.fg,
    alpha: 0.65,
  });
};

/** Constelación: los símbolos como estrellas unidas por líneas sobre un cielo de puntos. */
const constellation: Composer = (context, request, layout) => {
  const { width, height, unit, palette, fonts, options } = kitFor(request);
  const random = seededRandom(hashString(request.formula.id));
  const dust = Array.from({ length: Math.max(1, Math.round(options.count)) * 40 }, () => ({
    x: random() * width,
    y: random() * height,
    size: unit * (0.0008 + random() * 0.003),
    alpha: 0.2 + random() * 0.7,
  }));

  context.save();
  context.strokeStyle = palette.fg;
  context.lineWidth = Math.max(1, unit * 0.0012);
  const near = unit * 0.11;
  for (const [index, star] of dust.entries()) {
    for (const other of dust.slice(index + 1, index + 12)) {
      const distance = Math.hypot(star.x - other.x, star.y - other.y);
      if (distance > near) continue;
      context.globalAlpha = 0.14 * (1 - distance / near);
      context.beginPath();
      context.moveTo(star.x, star.y);
      context.lineTo(other.x, other.y);
      context.stroke();
    }
  }
  context.fillStyle = palette.fg;
  for (const star of dust) {
    context.globalAlpha = star.alpha;
    context.beginPath();
    context.arc(star.x, star.y, star.size, 0, TAU);
    context.fill();
  }
  context.restore();

  const total = layout.glyphs.length;
  const spread = unit * 0.18 * options.radius;
  const points = layout.glyphs.map((_, index) => ({
    x: width * (0.14 + (0.72 * index) / Math.max(1, total - 1)),
    y: height * 0.42 + (random() - 0.5) * 2 * spread,
  }));
  context.save();
  context.strokeStyle = palette.accent;
  context.globalAlpha = 0.55;
  context.lineWidth = Math.max(1.5, unit * 0.002);
  context.beginPath();
  for (const [index, point] of points.entries()) {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  }
  context.stroke();
  context.restore();

  for (const [index, glyph] of layout.glyphs.entries()) {
    const point = points[index];
    if (!point) continue;
    context.save();
    context.shadowColor = palette.accent;
    context.shadowBlur = unit * 0.03;
    drawMiddle(
      context,
      glyph.value,
      point.x,
      point.y,
      `500 ${String(Math.round(unit * 0.09 * options.scale))}px ${fonts.formula}`,
      palette.accent,
    );
    context.restore();
  }
  const scale = fitScale(layout, width * 0.4, height * 0.08) * options.scale;
  drawFormula(context, layout, {
    x: width / 2,
    y: height * 0.82,
    scale,
    color: palette.fg,
    alpha: 0.85,
  });
};

export const extraComposers: Record<ExtraStyle, Composer> = {
  blueprint,
  mosaic,
  eclipse,
  mirror,
  stripes,
  confetti,
  waves,
  neon,
  seal,
  led,
  gradient,
  knockout,
  cards,
  constellation,
};
