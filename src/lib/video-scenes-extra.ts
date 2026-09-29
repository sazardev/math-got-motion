import {
  TAU,
  bump,
  clamp01,
  drawCaption,
  drawGlyphPose,
  drawLoose,
  easeInOut,
  easeOut,
  fract,
  heroFx,
  heroScale,
  lerp,
  type SceneFactory,
} from "./video-kit";
import {
  DESIGN_SIZE,
  drawFormula,
  fitScale,
  mix,
  rgba,
  seededRandom,
  shiftHue,
  type VideoStyle,
} from "./wallpaper";

/**
 * Escenas de video adicionales (y, en modo imagen, fotos fijas con el slider
 * "Momento"). Como todas las escenas, son funciones puras de la fase del
 * bucle y usan ciclos enteros para cerrar sin salto.
 */

export type ExtraSceneStyle = Extract<
  VideoStyle,
  | "spectrum"
  | "cipher"
  | "typegrid"
  | "burst"
  | "kinetic"
  | "dna"
  | "cube"
  | "radar"
  | "hologram"
  | "sunburst"
  | "bokeh"
  | "pendulum"
  | "atom"
  | "lissajous"
  | "slots"
>;

/** Velo del color de fondo para que la fórmula se lea sobre escenas densas. */
function shade(env: Parameters<SceneFactory>[0], radius: number, strength: number, cy?: number) {
  const { context, palette, width, height } = env;
  const y = cy ?? height / 2;
  const gradient = context.createRadialGradient(width / 2, y, 0, width / 2, y, radius);
  gradient.addColorStop(0, rgba(palette.bg, strength));
  gradient.addColorStop(1, rgba(palette.bg, 0));
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

/**
 * Espectro: columnas de símbolos apilados que suben y bajan como un
 * ecualizador, con su reflejo abajo y la fórmula flotando al frente.
 */
const spectrum: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const columns = Math.max(4, Math.round(options.count) * 8);
  const cell = width / columns;
  const base = height * 0.74;
  const reach = height * 0.55;
  const count = layout.glyphs.length;
  const scale = heroScale(env, 0.6, 0.18);
  const fx = heroFx(env, DESIGN_SIZE * scale);

  return {
    period: 8,
    draw(phase) {
      for (let column = 0; column < columns; column += 1) {
        const level =
          (0.55 + 0.45 * Math.sin(TAU * (2 * phase + column * 0.21))) *
          (0.65 + 0.35 * Math.sin(TAU * (3 * phase + column * 0.37)));
        const rows = Math.max(1, Math.floor((level * reach) / cell));
        for (let row = 0; row < rows; row += 1) {
          const glyph = layout.glyphs[(column + row) % count];
          if (!glyph) continue;
          const top = row === rows - 1;
          const fade = 1 - row / (rows + 2);
          const x = (column + 0.5) * cell;
          drawLoose(
            env,
            glyph.value,
            x,
            base - (row + 0.5) * cell,
            cell * 0.8,
            top ? palette.fg : palette.accent,
            top ? 0.95 : 0.25 + 0.5 * fade,
          );
          if (row < 4) {
            drawLoose(
              env,
              glyph.value,
              x,
              base + (row + 0.5) * cell,
              cell * 0.8,
              palette.accent,
              0.16 * (1 - row / 4),
            );
          }
        }
      }
      shade(env, Math.max(layout.width * scale * 0.6, unit * 0.25), 0.9, height * 0.3);
      drawFormula(context, layout, {
        x: width / 2,
        y: height * 0.3,
        scale,
        color: palette.accent,
        ...fx,
      });
      drawCaption(env, 1);
    },
  };
};

/**
 * Rueda de cifrado: anillos concéntricos de símbolos que giran en sentidos
 * alternos alrededor de la fórmula, como el disco de un criptógrafo.
 */
const cipher: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const rings = Math.max(2, Math.round(options.count));
  const inner = unit * 0.2;
  const gap = (Math.hypot(width, height) / 2 - inner) / rings;
  const count = layout.glyphs.length;
  const scale = heroScale(env, 0.28, 0.1);
  const fx = heroFx(env, DESIGN_SIZE * scale);

  return {
    period: 30,
    draw(phase) {
      for (let ring = 0; ring < rings; ring += 1) {
        const radius = inner + gap * (ring + 0.5);
        const size = Math.min(gap * 0.6, unit * 0.06) * options.scale;
        const glyphs = Math.max(6, Math.round((TAU * radius) / (size * 1.5)));
        const direction = ring % 2 === 0 ? 1 : -1;
        for (let index = 0; index < glyphs; index += 1) {
          const glyph = layout.glyphs[(index + ring) % count];
          if (!glyph) continue;
          const angle = TAU * (index / glyphs + direction * phase * (1 + (ring % 2)));
          drawLoose(
            env,
            glyph.value,
            width / 2 + Math.cos(angle) * radius,
            height / 2 + Math.sin(angle) * radius,
            size,
            ring % 2 === 0 ? palette.accent : palette.fg,
            0.85 - (ring / rings) * 0.55,
            angle + Math.PI / 2,
          );
        }
        context.save();
        context.strokeStyle = rgba(palette.fg, 0.12);
        context.lineWidth = Math.max(1, unit * 0.0012);
        context.beginPath();
        context.arc(width / 2, height / 2, radius + gap * 0.42, 0, TAU);
        context.stroke();
        context.restore();
      }
      shade(env, Math.max(layout.width * scale * 0.6, inner), 0.9);
      drawFormula(context, layout, {
        x: width / 2,
        y: height / 2,
        scale,
        color: palette.accent,
        ...fx,
      });
    },
  };
};

/**
 * Onda de tipos: una rejilla de símbolos cuyo tamaño ondula desde el centro,
 * como una gota sobre una malla tipográfica.
 */
const typegrid: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const cell = (unit * 0.085) / Math.max(0.4, options.count / 5);
  const columns = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const reach = Math.hypot(width, height) / 2;
  const count = layout.glyphs.length;
  const scale = heroScale(env, 0.5, 0.16);
  const fx = heroFx(env, DESIGN_SIZE * scale);

  return {
    period: 6,
    draw(phase) {
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const glyph = layout.glyphs[(column + row) % count];
          if (!glyph) continue;
          const x = (column + 0.5) * cell;
          const y = (row + 0.5) * cell;
          const distance = Math.hypot(x - width / 2, y - height / 2) / reach;
          const wave = 0.5 + 0.5 * Math.sin(TAU * (distance * 3 - phase));
          drawLoose(
            env,
            glyph.value,
            x,
            y,
            cell * (0.2 + 0.85 * wave),
            wave > 0.72 ? palette.accent : palette.fg,
            0.1 + 0.8 * wave,
          );
        }
      }
      shade(env, Math.max(layout.width * scale * 0.6, unit * 0.2), 0.92);
      drawFormula(context, layout, {
        x: width / 2,
        y: height / 2,
        scale,
        color: palette.accent,
        ...fx,
      });
    },
  };
};

/**
 * Estallido: fuegos artificiales de símbolos que se abren, caen por la
 * gravedad y se apagan, uno tras otro, detrás de la fórmula.
 */
const burst: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const shows = Math.max(1, Math.round(options.count));
  const random = seededRandom(env.seed);
  const sparks = 26;
  const count = layout.glyphs.length;
  const fireworks = Array.from({ length: shows }, (_, index) => ({
    x: width * (0.12 + random() * 0.76),
    y: height * (0.15 + random() * 0.45),
    offset: index / shows,
    hue: (random() - 0.5) * 140,
    parts: Array.from({ length: sparks }, () => ({
      angle: random() * TAU,
      speed: 0.6 + random() * 0.5,
    })),
  }));
  const scale = heroScale(env, 0.5, 0.16);
  const fx = heroFx(env, DESIGN_SIZE * scale);

  return {
    period: 7,
    draw(phase) {
      for (const [index, show] of fireworks.entries()) {
        const t = fract(phase + show.offset);
        const spread = unit * 0.42 * easeOut(t);
        const color = shiftHue(palette.accent, show.hue);
        for (const [part, spark] of show.parts.entries()) {
          const glyph = layout.glyphs[(part + index) % count];
          if (!glyph) continue;
          drawLoose(
            env,
            glyph.value,
            show.x + Math.cos(spark.angle) * spread * spark.speed,
            show.y + Math.sin(spark.angle) * spread * spark.speed + t * t * unit * 0.3,
            unit * 0.05 * (1 - t * 0.7),
            color,
            (1 - t) ** 1.4,
            spark.angle + t * 3,
          );
        }
        if (t < 0.12) {
          context.save();
          context.fillStyle = rgba(color, 0.5 * (1 - t / 0.12));
          context.beginPath();
          context.arc(show.x, show.y, unit * 0.12 * (t / 0.12 + 0.3), 0, TAU);
          context.fill();
          context.restore();
        }
      }
      shade(env, Math.max(layout.width * scale * 0.6, unit * 0.2), 0.8);
      drawFormula(context, layout, {
        x: width / 2,
        y: height / 2,
        scale: scale * (1 + 0.03 * Math.sin(TAU * phase * shows)),
        color: palette.accent,
        ...fx,
      });
      drawCaption(env, 1);
    },
  };
};

/**
 * Cinético: tipografía a pantalla completa — cada símbolo golpea la pantalla
 * en su turno, alternando color, y al final aparece la fórmula entera.
 */
const kinetic: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette } = env;
  const count = layout.glyphs.length;
  const segment = 0.6 / Math.max(1, count);
  const scale = heroScale(env, 0.78, 0.4);
  const fx = heroFx(env, DESIGN_SIZE * scale);

  return {
    period: 10,
    draw(phase) {
      if (phase < 0.6) {
        const index = Math.min(count - 1, Math.floor(phase / segment));
        const local = (phase - index * segment) / segment;
        const glyph = layout.glyphs[index];
        const inverted = index % 2 === 0;
        context.fillStyle = inverted ? palette.accent : palette.bg;
        context.fillRect(0, 0, width, height);
        if (glyph) {
          const fit = Math.min(
            (height * 1.15 * DESIGN_SIZE) / 100,
            (width * 0.9 * DESIGN_SIZE) / Math.max(1, glyph.width),
          );
          drawLoose(
            env,
            glyph.value,
            width / 2,
            height / 2,
            fit * (0.8 + 0.25 * easeOut(clamp01(local * 3))),
            inverted ? palette.bg : palette.accent,
            clamp01(local * 8) * (1 - clamp01((local - 0.9) / 0.1)),
          );
        }
        return;
      }
      const reveal = easeInOut(clamp01((phase - 0.62) / 0.14));
      const leave = easeInOut(clamp01((phase - 0.9) / 0.09));
      drawFormula(context, layout, {
        x: width / 2,
        y: height / 2,
        scale: scale * (0.85 + 0.15 * reveal),
        color: palette.accent,
        alpha: reveal * (1 - leave),
        ...fx,
      });
      drawCaption(env, reveal * (1 - leave));
      void unit;
    },
  };
};

/**
 * Doble hélice: dos cadenas de símbolos que se enroscan en 3D con peldaños
 * entre ellas, cruzando la pantalla por detrás de la fórmula.
 */
const dna: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const points = Math.max(1, Math.round(options.count)) * 6;
  const amplitude = unit * 0.2 * options.radius;
  const tilt = (options.rotation * Math.PI) / 180;
  const count = layout.glyphs.length;
  const scale = heroScale(env, 0.5, 0.16);
  const fx = heroFx(env, DESIGN_SIZE * scale);
  const place = (index: number, strand: number, phase: number) => {
    const t = index / (points - 1);
    const angle = TAU * (t * 2.5 - phase) + strand * Math.PI;
    const along = (t * 1.2 - 0.1) * Math.hypot(width, height);
    const across = Math.sin(angle) * amplitude;
    const offsetX = along - Math.hypot(width, height) / 2;
    return {
      x: width / 2 + offsetX * Math.cos(tilt) - across * Math.sin(tilt),
      y: height / 2 + offsetX * Math.sin(tilt) + across * Math.cos(tilt),
      depth: Math.cos(angle),
    };
  };

  return {
    period: 12,
    draw(phase) {
      context.save();
      context.lineWidth = Math.max(1, unit * 0.0016);
      for (let index = 0; index < points; index += 2) {
        const a = place(index, 0, phase);
        const b = place(index, 1, phase);
        context.strokeStyle = palette.fg;
        context.globalAlpha = 0.12 + 0.16 * ((a.depth + 1) / 2);
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      }
      context.restore();
      const drawStrand = (strand: number, back: boolean) => {
        for (let index = 0; index < points; index += 1) {
          const spot = place(index, strand, phase);
          if (spot.depth < 0 !== back) continue;
          const glyph = layout.glyphs[(index + strand * 3) % count];
          if (!glyph) continue;
          const near = (spot.depth + 1) / 2;
          drawLoose(
            env,
            glyph.value,
            spot.x,
            spot.y,
            unit * 0.05 * (0.6 + 0.7 * near),
            strand === 0 ? palette.accent : palette.fg,
            0.2 + 0.8 * near,
          );
        }
      };
      drawStrand(0, true);
      drawStrand(1, true);
      shade(env, Math.max(layout.width * scale * 0.6, unit * 0.2), 0.85);
      drawFormula(context, layout, {
        x: width / 2,
        y: height / 2,
        scale,
        color: palette.accent,
        ...fx,
      });
      drawStrand(0, false);
      drawStrand(1, false);
    },
  };
};

/**
 * Cubo: la fórmula en cada cara de un cubo que gira en 3D, con aristas
 * marcadas; las caras traseras se ven espejadas y tenues.
 */
const cube: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const half = unit * 0.25 * options.scale;
  const tilt = (options.rotation * Math.PI) / 180;
  const faceScale = fitScale(layout, 1.7, 0.7);
  const outline = Math.max(1.5, unit * 0.003);
  const normals: [number, number, number][] = [
    [0, 0, 1],
    [0, 0, -1],
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
  ];
  const axes: [[number, number, number], [number, number, number]][] = [
    [
      [1, 0, 0],
      [0, 1, 0],
    ],
    [
      [-1, 0, 0],
      [0, 1, 0],
    ],
    [
      [0, 0, -1],
      [0, 1, 0],
    ],
    [
      [0, 0, 1],
      [0, 1, 0],
    ],
    [
      [1, 0, 0],
      [0, 0, -1],
    ],
    [
      [1, 0, 0],
      [0, 0, 1],
    ],
  ];

  return {
    period: 16,
    draw(phase) {
      const yaw = TAU * phase;
      const pitch = tilt + 0.35 * Math.sin(TAU * phase);
      const rotate = (v: [number, number, number]): [number, number, number] => {
        const x1 = v[0] * Math.cos(yaw) + v[2] * Math.sin(yaw);
        const z1 = -v[0] * Math.sin(yaw) + v[2] * Math.cos(yaw);
        const y2 = v[1] * Math.cos(pitch) - z1 * Math.sin(pitch);
        const z2 = v[1] * Math.sin(pitch) + z1 * Math.cos(pitch);
        return [x1, y2, z2];
      };
      const faces = normals
        .map((normal, index) => {
          const n = rotate(normal);
          const [uAxis, vAxis] = axes[index] ?? [
            [1, 0, 0],
            [0, 1, 0],
          ];
          return { n, u: rotate(uAxis), v: rotate(vAxis) };
        })
        .sort((a, b) => a.n[2] - b.n[2]);
      for (const face of faces) {
        const front = face.n[2] > 0;
        context.save();
        context.translate(width / 2 + face.n[0] * half, height / 2 + face.n[1] * half);
        context.transform(
          face.u[0] * half,
          face.u[1] * half,
          face.v[0] * half,
          face.v[1] * half,
          0,
          0,
        );
        context.fillStyle = rgba(palette.accent, front ? 0.14 : 0.05);
        context.fillRect(-1, -1, 2, 2);
        context.strokeStyle = palette.accent;
        context.globalAlpha = front ? 1 : 0.35;
        context.lineWidth = outline / half;
        context.strokeRect(-1, -1, 2, 2);
        context.globalAlpha = 1;
        drawFormula(context, layout, {
          x: 0,
          y: 0,
          scale: faceScale,
          color: front ? palette.fg : palette.accent,
          alpha: front ? 0.55 + 0.45 * face.n[2] : 0.25,
        });
        context.restore();
      }
    },
  };
};

/**
 * Radar: un barrido gira sobre círculos concéntricos y los símbolos se
 * encienden al pasar el haz, dejando una estela que se apaga.
 */
const radar: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const radius = unit * 0.44;
  const random = seededRandom(env.seed);
  const blips = Array.from({ length: Math.max(1, Math.round(options.count)) * 4 }, (_, index) => ({
    glyph: layout.glyphs[index % layout.glyphs.length],
    angle: random() * TAU,
    distance: 0.35 + random() * 0.6,
  }));
  const scale = heroScale(env, 0.22, 0.08);
  const fx = heroFx(env, DESIGN_SIZE * scale);

  return {
    period: 8,
    draw(phase) {
      const sweep = TAU * phase;
      context.save();
      context.translate(width / 2, height / 2);
      context.strokeStyle = palette.accent;
      context.lineWidth = Math.max(1, unit * 0.0015);
      for (const factor of [0.25, 0.5, 0.75, 1]) {
        context.globalAlpha = 0.18;
        context.beginPath();
        context.arc(0, 0, radius * factor, 0, TAU);
        context.stroke();
      }
      context.globalAlpha = 0.14;
      context.beginPath();
      context.moveTo(-radius, 0);
      context.lineTo(radius, 0);
      context.moveTo(0, -radius);
      context.lineTo(0, radius);
      context.stroke();
      for (let step = 0; step < 48; step += 1) {
        const back = (step / 48) * 1.3;
        context.globalAlpha = 0.32 * (1 - step / 48) ** 2;
        context.fillStyle = palette.accent;
        context.beginPath();
        context.moveTo(0, 0);
        context.arc(0, 0, radius, sweep - back - 0.03, sweep - back);
        context.closePath();
        context.fill();
      }
      context.globalAlpha = 0.9;
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(Math.cos(sweep) * radius, Math.sin(sweep) * radius);
      context.stroke();
      context.restore();
      for (const blip of blips) {
        if (!blip.glyph) continue;
        const behind = fract((sweep - blip.angle) / TAU);
        drawLoose(
          env,
          blip.glyph.value,
          width / 2 + Math.cos(blip.angle) * radius * blip.distance,
          height / 2 + Math.sin(blip.angle) * radius * blip.distance,
          unit * 0.05,
          palette.fg,
          0.08 + 0.92 * (1 - behind) ** 3,
        );
      }
      shade(env, unit * 0.16, 0.9);
      drawFormula(context, layout, {
        x: width / 2,
        y: height / 2,
        scale,
        color: palette.accent,
        ...fx,
      });
      drawCaption(env, 1);
    },
  };
};

/**
 * Holograma: la fórmula proyectada con líneas de escaneo, un haz que la
 * recorre, separación de color intermitente y anillos en la base.
 */
const hologram: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const scale = heroScale(env, 0.72, 0.3);
  const size = layout.height * scale;
  const cy = height * 0.44;
  const gap = Math.max(3, unit * 0.008);
  const left = shiftHue(palette.accent, -60);
  const right = shiftHue(palette.accent, 60);
  void options;

  return {
    period: 6,
    draw(phase) {
      const glitch = Math.max(0, Math.sin(TAU * phase * 3)) ** 12;
      const flicker = 0.85 + 0.15 * Math.sin(TAU * phase * 7);
      const split = unit * (0.003 + 0.02 * glitch);
      for (const [color, dx, alpha] of [
        [left, -split, 0.6],
        [right, split, 0.6],
        [palette.accent, 0, flicker],
      ] as const) {
        drawFormula(context, layout, {
          x: width / 2 + dx + glitch * unit * 0.01,
          y: cy,
          scale,
          color,
          alpha,
          ...(dx === 0 ? { glow: unit * 0.03 } : {}),
        });
      }
      context.save();
      context.fillStyle = palette.bg;
      context.globalAlpha = 0.55;
      const offset = fract(phase * 4) * gap * 2;
      for (let y = cy - size; y < cy + size; y += gap * 2) {
        context.fillRect(0, y + offset, width, gap);
      }
      const beamY = cy - size + fract(phase * 2) * size * 2;
      const beam = context.createLinearGradient(0, beamY - size * 0.25, 0, beamY + size * 0.25);
      beam.addColorStop(0, rgba(palette.fg, 0));
      beam.addColorStop(0.5, rgba(palette.fg, 0.4));
      beam.addColorStop(1, rgba(palette.fg, 0));
      context.globalAlpha = 1;
      context.fillStyle = beam;
      context.fillRect(width * 0.1, beamY - size * 0.25, width * 0.8, size * 0.5);
      context.restore();
      context.save();
      context.strokeStyle = palette.accent;
      const baseY = cy + size * 1.4;
      for (let ring = 0; ring < 4; ring += 1) {
        const t = fract(phase * 2 + ring / 4);
        context.globalAlpha = (1 - t) * 0.6;
        context.lineWidth = Math.max(1, unit * 0.003);
        context.beginPath();
        context.ellipse(
          width / 2,
          baseY,
          unit * (0.1 + 0.5 * t),
          unit * (0.02 + 0.09 * t),
          0,
          0,
          TAU,
        );
        context.stroke();
      }
      context.restore();
      drawCaption(env, 1);
    },
  };
};

/**
 * Rayos: un sol de rayos alternados que gira lento tras una franja central
 * con la fórmula — un cartel retro de alto contraste.
 */
const sunburst: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const wedges = Math.max(4, Math.round(options.count) * 8);
  const reach = Math.hypot(width, height);
  const spin = (options.rotation * Math.PI) / 180;
  const scale = heroScale(env, 0.62, 0.2);
  const band = layout.height * scale * 1.9;
  const fx = heroFx(env, DESIGN_SIZE * scale);

  return {
    period: 10,
    draw(phase) {
      const step = TAU / wedges;
      context.save();
      context.translate(width / 2, height / 2);
      context.fillStyle = rgba(palette.accent, 0.9);
      for (let wedge = 0; wedge < wedges; wedge += 2) {
        const start = spin + wedge * step + phase * 2 * step;
        context.beginPath();
        context.moveTo(0, 0);
        context.arc(0, 0, reach, start, start + step);
        context.closePath();
        context.fill();
      }
      context.restore();
      context.fillStyle = palette.bg;
      context.fillRect(0, height / 2 - band / 2, width, band);
      context.fillStyle = palette.accent;
      const rule = Math.max(2, unit * 0.006);
      context.fillRect(0, height / 2 - band / 2, width, rule);
      context.fillRect(0, height / 2 + band / 2 - rule, width, rule);
      drawFormula(context, layout, {
        x: width / 2,
        y: height / 2,
        scale: scale * (1 + 0.02 * Math.sin(TAU * phase)),
        color: palette.accent,
        ...fx,
      });
    },
  };
};

/**
 * Bokeh: círculos de luz desenfocados que suben a distintas velocidades,
 * en tonos vecinos del acento, y la fórmula nítida al frente.
 */
const bokeh: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const random = seededRandom(env.seed);
  const total = Math.max(1, Math.round(options.count)) * 9;
  const orbs = Array.from({ length: total }, () => ({
    x: random() * width,
    y: random(),
    radius: unit * (0.04 + random() ** 2 * 0.18),
    cycles: 1 + Math.floor(random() * 2),
    hue: (random() - 0.5) * 120,
    sway: random(),
    alpha: 0.12 + random() * 0.3,
  }));
  const scale = heroScale(env, 0.62, 0.26);
  const fx = heroFx(env, DESIGN_SIZE * scale);
  const tinted = shiftHue(palette.accent, 90) !== palette.accent;

  return {
    period: 20,
    draw(phase) {
      for (const orb of orbs) {
        const y = height * (1.2 - fract(orb.y + phase * orb.cycles) * 1.4);
        const x = orb.x + Math.sin(TAU * (phase * orb.cycles + orb.sway)) * unit * 0.03;
        const color = shiftHue(palette.accent, orb.hue);
        const gradient = context.createRadialGradient(x, y, orb.radius * 0.6, x, y, orb.radius);
        const alpha = orb.alpha * (tinted ? 1 : 0.6);
        gradient.addColorStop(0, rgba(color, alpha * 0.55));
        gradient.addColorStop(0.85, rgba(color, alpha));
        gradient.addColorStop(1, rgba(color, 0));
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(x, y, orb.radius, 0, TAU);
        context.fill();
      }
      drawFormula(context, layout, {
        x: width / 2,
        y: height / 2,
        scale,
        color: palette.fg,
        ...fx,
      });
      drawCaption(env, 1);
    },
  };
};

/**
 * Ola de péndulos: una fila de péndulos con un símbolo en cada extremo, cada
 * uno con una oscilación más que el anterior — se desfasan y vuelven a
 * alinearse al cerrar el bucle.
 */
const pendulum: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const total = Math.max(3, Math.round(options.count) * 3);
  const length = height * 0.62;
  const anchorY = height * 0.08;
  const count = layout.glyphs.length;
  const scale = heroScale(env, 0.5, 0.16);

  return {
    period: 14,
    draw(phase) {
      context.save();
      context.strokeStyle = palette.fg;
      context.lineWidth = Math.max(1, unit * 0.0015);
      for (let index = 0; index < total; index += 1) {
        const anchorX = width * (0.08 + (0.84 * index) / (total - 1));
        const angle = 0.55 * Math.cos(TAU * (6 + index) * phase);
        const x = anchorX + Math.sin(angle) * length;
        const y = anchorY + Math.cos(angle) * length;
        context.globalAlpha = 0.25;
        context.beginPath();
        context.moveTo(anchorX, anchorY);
        context.lineTo(x, y);
        context.stroke();
        const glyph = layout.glyphs[index % count];
        if (glyph) {
          drawLoose(
            env,
            glyph.value,
            x,
            y,
            unit * 0.07,
            index % 2 === 0 ? palette.accent : palette.fg,
            0.95,
            angle,
          );
        }
      }
      context.restore();
      drawFormula(context, layout, {
        x: width / 2,
        y: height * 0.36,
        scale,
        color: palette.fg,
        alpha: 0.35,
      });
      drawCaption(env, 1);
    },
  };
};

/**
 * Átomo: la fórmula como núcleo y tres órbitas elípticas cruzadas con
 * símbolos-electrón que dejan una estela breve.
 */
const atom: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const radius = unit * 0.42 * options.radius;
  const count = layout.glyphs.length;
  const scale = heroScale(env, 0.3, 0.1);
  const fx = heroFx(env, DESIGN_SIZE * scale);
  const electrons = 3;

  return {
    period: 12,
    draw(phase) {
      for (const [orbit, tilt] of [0, Math.PI / 3, (2 * Math.PI) / 3].entries()) {
        context.save();
        context.translate(width / 2, height / 2);
        context.rotate(tilt);
        context.strokeStyle = palette.accent;
        context.globalAlpha = 0.25;
        context.lineWidth = Math.max(1, unit * 0.0018);
        context.beginPath();
        context.ellipse(0, 0, radius, radius * 0.36, 0, 0, TAU);
        context.stroke();
        context.restore();
        const direction = orbit % 2 === 0 ? 1 : -1;
        for (let electron = 0; electron < electrons; electron += 1) {
          const glyph = layout.glyphs[(electron + orbit * 2) % count];
          if (!glyph) continue;
          for (let trail = 0; trail < 5; trail += 1) {
            const angle =
              TAU * (electron / electrons + direction * (phase * (orbit + 1) - trail * 0.012));
            const ex = Math.cos(angle) * radius;
            const ey = Math.sin(angle) * radius * 0.36;
            drawLoose(
              env,
              glyph.value,
              width / 2 + ex * Math.cos(tilt) - ey * Math.sin(tilt),
              height / 2 + ex * Math.sin(tilt) + ey * Math.cos(tilt),
              unit * 0.05 * (1 - trail * 0.12),
              trail === 0 ? palette.fg : palette.accent,
              trail === 0 ? 1 : 0.35 * (1 - trail / 5),
            );
          }
        }
      }
      shade(env, Math.max(layout.width * scale * 0.6, unit * 0.16), 0.9);
      drawFormula(context, layout, {
        x: width / 2,
        y: height / 2,
        scale: scale * (1 + 0.04 * Math.sin(TAU * phase * 2)),
        color: palette.accent,
        ...fx,
      });
    },
  };
};

/**
 * Lissajous: una cabeza de símbolos recorre una curva de Lissajous dejando
 * una cola que se encoge y se apaga, con la curva completa de fondo.
 */
const lissajous: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette, options } = env;
  const a = Math.max(1, Math.round(options.count));
  const b = a + 1;
  const ax = width * 0.4 * options.radius;
  const ay = height * 0.36 * options.radius;
  const count = layout.glyphs.length;
  const scale = heroScale(env, 0.3, 0.1);
  const fx = heroFx(env, DESIGN_SIZE * scale);
  const at = (t: number) => ({
    x: width / 2 + ax * Math.sin(TAU * (a * t) + Math.PI / 2),
    y: height / 2 + ay * Math.sin(TAU * (b * t)),
  });

  return {
    period: 14,
    draw(phase) {
      context.save();
      context.strokeStyle = palette.fg;
      context.globalAlpha = 0.12;
      context.lineWidth = Math.max(1, unit * 0.002);
      context.beginPath();
      for (let step = 0; step <= 400; step += 1) {
        const point = at(step / 400);
        if (step === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      }
      context.stroke();
      context.restore();
      const tail = 70;
      for (let step = tail; step >= 0; step -= 1) {
        const point = at(phase - step * 0.0045);
        const glyph = layout.glyphs[step % count];
        if (!glyph) continue;
        const life = 1 - step / tail;
        drawLoose(
          env,
          glyph.value,
          point.x,
          point.y,
          unit * (0.02 + 0.06 * life),
          step === 0 ? palette.fg : palette.accent,
          step === 0 ? 1 : 0.7 * life ** 1.6,
        );
      }
      shade(env, Math.max(layout.width * scale * 0.6, unit * 0.16), 0.85);
      drawFormula(context, layout, {
        x: width / 2,
        y: height / 2,
        scale,
        color: palette.accent,
        ...fx,
      });
    },
  };
};

/**
 * Tragamonedas: un carrete por símbolo gira y frena uno tras otro hasta
 * formar la fórmula, la sostiene un momento y vuelve a girar.
 */
const slots: SceneFactory = (env) => {
  const { context, layout, width, height, unit, palette } = env;
  const count = layout.glyphs.length;
  const random = seededRandom(env.seed);
  const strip = Math.max(8, count + 3);
  const scale = heroScale(env, 0.78, 0.2);
  const cell = layout.height * scale * 1.45;
  const values = layout.glyphs.map((glyph, index) => {
    const others = layout.glyphs.filter((_, other) => other !== index);
    return Array.from({ length: strip }, (_, position) =>
      position === 0
        ? glyph.value
        : (others[Math.floor(random() * others.length)]?.value ?? glyph.value),
    );
  });

  return {
    period: 10,
    draw(phase) {
      context.save();
      context.beginPath();
      context.rect(0, height / 2 - cell * 1.5, width, cell * 3);
      context.clip();
      for (const [index, glyph] of layout.glyphs.entries()) {
        const stop = 0.32 + (0.3 * index) / Math.max(1, count);
        const spin = strip * 2;
        let position: number;
        if (phase < stop) position = spin * (1 - easeOut(phase / stop));
        else if (phase < 0.86) position = 0;
        else position = -spin * easeInOut((phase - 0.86) / 0.14);
        const whole = Math.floor(position);
        const fraction = position - whole;
        const reel = values[index] ?? [];
        for (let row = -2; row <= 2; row += 1) {
          const value = reel[(((whole + row) % strip) + strip) % strip] ?? glyph.value;
          const offset = (row - fraction) * cell;
          const distance = Math.abs(offset) / cell;
          drawGlyphPose(
            context,
            layout,
            { ...glyph, value },
            {
              cx: width / 2,
              cy: height / 2,
              scale,
              dy: offset,
              color: distance < 0.5 ? palette.accent : palette.fg,
              alpha: clamp01(1.15 - distance * 0.75),
            },
          );
        }
      }
      context.restore();
      const settled =
        easeInOut(clamp01((phase - 0.62) / 0.1)) * (1 - clamp01((phase - 0.86) / 0.06));
      drawCaption(env, settled);
      void unit;
      void lerp;
      void bump;
      void mix;
    },
  };
};

export const extraScenes: Record<ExtraSceneStyle, SceneFactory> = {
  spectrum,
  cipher,
  typegrid,
  burst,
  kinetic,
  dna,
  cube,
  radar,
  hologram,
  sunburst,
  bokeh,
  pendulum,
  atom,
  lissajous,
  slots,
};
