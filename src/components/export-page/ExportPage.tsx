import { useEffect, useRef, useState } from "react";

import { Combobox, type ComboboxOption } from "./Combobox";
import { useSeo } from "../../hooks/useSeo";
import { locales } from "../../i18n/locale";
import { useLocale } from "../../i18n/locale-context";
import { getLenis, unlockScroll } from "../../lib/lenis";
import { SITE_URL } from "../../lib/site";
import {
  createVideoRenderer,
  isVideoRecordingSupported,
  recordVideo,
  videoDurations,
  videoFrameRates,
  videoSizes,
  type VideoRequest,
} from "../../lib/video-wallpaper";
import {
  defaultWallpaperOptions,
  downloadWallpaper,
  ensureWallpaperFonts,
  optionSpec,
  readWallpaperContext,
  isVideoStyle,
  optionKeysFor,
  wallpaperSizes,
  wallpaperStyles,
  type VideoStyle,
  type WallpaperOptionKey,
  type WallpaperOptions,
  type WallpaperRequest,
  type WallpaperSize,
  type WallpaperSizeId,
  type WallpaperStyle,
} from "../../lib/wallpaper";
import { drawWallpaper, renderWallpaper } from "../../lib/wallpaper-render";
import {
  fxNames,
  fxPresets,
  typeNames,
  typePresets,
  usePreferences,
} from "../../preferences/preferences-context";
import { themes } from "../../preferences/themes";
import "./ExportPage.css";

import type { Formula } from "../../domain/formula.types";
import type { UiStrings } from "../../i18n/ui-strings";

interface ExportPageProps {
  formula: Formula;
}

const CLASSIC_LABEL_KEYS = {
  formula: "exportStyleFormula",
  accent: "exportStyleAccent",
  inverted: "exportStyleInverted",
  poster: "exportStylePoster",
  isometric: "exportStyleIsometric",
  depth: "exportStyleDepth",
  pattern: "exportStylePattern",
  swiss: "exportStyleSwiss",
  anatomy: "exportStyleAnatomy",
  macro: "exportStyleMacro",
  aura: "exportStyleAura",
  echo: "exportStyleEcho",
  orbit: "exportStyleOrbit",
  spiral: "exportStyleSpiral",
  blueprint: "exportStyleBlueprint",
  mosaic: "exportStyleMosaic",
  eclipse: "exportStyleEclipse",
  mirror: "exportStyleMirror",
  stripes: "exportStyleStripes",
  confetti: "exportStyleConfetti",
  waves: "exportStyleWaves",
  neon: "exportStyleNeonSign",
  seal: "exportStyleSeal",
  led: "exportStyleLed",
  gradient: "exportStyleGradient",
  knockout: "exportStyleKnockout",
  cards: "exportStyleCards",
  constellation: "exportStyleConstellation",
} as const;

const VIDEO_STYLE_LABEL_KEYS = {
  assemble: "exportVideoAssemble",
  drift: "exportVideoDrift",
  planetarium: "exportVideoPlanetarium",
  marquee: "exportVideoMarquee",
  rain: "exportVideoRain",
  wave: "exportVideoWave",
  tunnel: "exportVideoTunnel",
  aurora: "exportVideoAurora",
  spotlight: "exportVideoSpotlight",
  carousel: "exportVideoCarousel",
  stroke: "exportVideoStroke",
  vortex: "exportVideoVortex",
  warp: "exportVideoWarp",
  kaleido: "exportVideoKaleido",
  pulse: "exportVideoPulse",
  slice: "exportVideoSlice",
  horizon: "exportVideoHorizon",
  sphere: "exportVideoSphere",
  spectrum: "exportVideoSpectrum",
  cipher: "exportVideoCipher",
  typegrid: "exportVideoTypegrid",
  burst: "exportVideoBurst",
  kinetic: "exportVideoKinetic",
  dna: "exportVideoDna",
  cube: "exportVideoCube",
  radar: "exportVideoRadar",
  hologram: "exportVideoHologram",
  sunburst: "exportVideoSunburst",
  bokeh: "exportVideoBokeh",
  pendulum: "exportVideoPendulum",
  atom: "exportVideoAtom",
  lissajous: "exportVideoLissajous",
  slots: "exportVideoSlots",
} as const satisfies Record<VideoStyle, keyof UiStrings>;

const STYLE_LABEL_KEYS = {
  ...CLASSIC_LABEL_KEYS,
  ...VIDEO_STYLE_LABEL_KEYS,
} as const satisfies Record<WallpaperStyle, keyof UiStrings>;

const OPTION_LABEL_KEYS = {
  scale: "exportScale",
  spacingX: "exportSpacingX",
  spacingY: "exportSpacingY",
  rotation: "exportRotation",
  layers: "exportLayers",
  distance: "exportDistance",
  radius: "exportRadius",
  count: "exportCount",
  focus: "exportFocus",
  speed: "exportSpeed",
  moment: "exportMoment",
} as const satisfies Record<WallpaperOptionKey, keyof UiStrings>;

const styles = wallpaperStyles;

type ExportMode = "image" | "video";
type ExportStatus = "idle" | "working" | "done";
type OptionsByStyle = Record<WallpaperStyle, WallpaperOptions>;

function initialOptions(): OptionsByStyle {
  return Object.fromEntries(
    styles.map((item) => [item, defaultWallpaperOptions(item)]),
  ) as OptionsByStyle;
}

function formatOption(key: WallpaperOptionKey, value: number, formula: Formula): string {
  if (key === "rotation") return `${String(Math.round(value))}°`;
  if (key === "layers" || key === "count") return String(Math.round(value));
  if (key === "focus") return formula.nodes[Math.round(value)]?.value ?? "";
  return `${String(Math.round(value * 100))}%`;
}

/**
 * Tamaño en píxeles de un preview: el mismo aspecto que el PNG final, al
 * ancho CSS disponible × devicePixelRatio (nunca más que el PNG real). Como
 * cada composición es proporcional al lienzo, el preview es la misma imagen.
 */
function previewSize(size: WallpaperSize, cssWidth: number): WallpaperSize {
  const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.min(size.width, Math.round(cssWidth * ratio)));
  const height = Math.max(1, Math.round((width * size.height) / size.width));
  return { id: size.id, width, height };
}

/** Observa el ancho CSS de un elemento (para dimensionar su canvas). */
function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  return [ref, width] as const;
}

interface PreviewCanvasProps {
  request: Omit<WallpaperRequest, "context" | "size">;
  size: WallpaperSize;
  cssWidth: number;
  /** Cambia con tema/fuente/efecto: fuerza a releer las variables CSS. */
  appearanceKey: string;
  className?: string;
}

/**
 * Un canvas que redibuja la composición en vivo. El dibujo se difiere a un
 * rAF: PreferencesProvider aplica `data-theme`/`data-type` en su propio
 * efecto, que corre *después* de los efectos de sus hijos — leer las
 * variables CSS en el mismo tick daría la paleta anterior.
 */
function PreviewCanvas({ request, size, cssWidth, appearanceKey, className }: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { formula, locale, style, fx, options, brand, details } = request;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cssWidth <= 0) return;
    let cancelled = false;
    const frame = globalThis.requestAnimationFrame(() => {
      const context = readWallpaperContext();
      void ensureWallpaperFonts(context).then(() => {
        if (cancelled) return;
        const target = previewSize(size, cssWidth);
        if (canvas.width !== target.width) canvas.width = target.width;
        if (canvas.height !== target.height) canvas.height = target.height;
        drawWallpaper(canvas, {
          formula,
          locale,
          style,
          fx,
          context,
          size: target,
          ...(options ? { options } : {}),
          ...(brand === undefined ? {} : { brand }),
          ...(details === undefined ? {} : { details }),
        });
      });
    });
    return () => {
      cancelled = true;
      globalThis.cancelAnimationFrame(frame);
    };
  }, [formula, locale, style, fx, options, brand, details, size, cssWidth, appearanceKey]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ aspectRatio: `${String(size.width)} / ${String(size.height)}` }}
    />
  );
}

interface VideoPreviewCanvasProps {
  request: Omit<VideoRequest, "context" | "size">;
  size: WallpaperSize;
  cssWidth: number;
  appearanceKey: string;
  className?: string;
  /** Tope de cuadros por segundo del preview (las miniaturas van más bajo). */
  fps?: number;
}

/**
 * Preview animado: el mismo renderer que graba el video, corriendo en bucle.
 * La fase se acumula en un ref, así cambiar un slider o el tema no reinicia
 * la animación. Se pausa fuera de pantalla y, con prefers-reduced-motion,
 * queda en un cuadro fijo.
 */
function VideoPreviewCanvas({
  request,
  size,
  cssWidth,
  appearanceKey,
  className,
  fps = 30,
}: VideoPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(0);
  const visibleRef = useRef(true);
  const { formula, locale, style, fx, options, brand, details } = request;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry?.isIntersecting ?? true;
    });
    observer.observe(canvas);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cssWidth <= 0) return;
    let cancelled = false;
    let loop = 0;
    const reduced = globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = globalThis.requestAnimationFrame(() => {
      const context = readWallpaperContext();
      void ensureWallpaperFonts(context).then(() => {
        if (cancelled) return;
        const target = previewSize(size, cssWidth);
        if (canvas.width !== target.width) canvas.width = target.width;
        if (canvas.height !== target.height) canvas.height = target.height;
        const renderer = createVideoRenderer(canvas, {
          formula,
          locale,
          style,
          fx,
          options,
          brand,
          details,
          context,
          size: target,
        });
        if (reduced) {
          renderer.draw(0.4);
          return;
        }
        let last = performance.now();
        let lastDraw = Number.NEGATIVE_INFINITY;
        const tick = (now: number) => {
          loop = globalThis.requestAnimationFrame(tick);
          const delta = Math.min(100, now - last);
          last = now;
          if (!visibleRef.current) return;
          phaseRef.current = (phaseRef.current + delta / 1000 / renderer.period) % 1;
          if (now - lastDraw < 1000 / fps - 4) return;
          lastDraw = now;
          renderer.draw(phaseRef.current, Math.floor(now / 90));
        };
        loop = globalThis.requestAnimationFrame(tick);
      });
    });
    return () => {
      cancelled = true;
      globalThis.cancelAnimationFrame(frame);
      globalThis.cancelAnimationFrame(loop);
    };
  }, [formula, locale, style, fx, options, brand, details, size, cssWidth, appearanceKey, fps]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ aspectRatio: `${String(size.width)} / ${String(size.height)}` }}
    />
  );
}

/**
 * Exportador de wallpapers como página propia: un preview grande en vivo del
 * estilo elegido, una galería con todos los estilos renderizados a la vez
 * (para compararlos sin descargar), efecto/tema/fuente a mano, y ajustes
 * finos por estilo — tamaño, espaciado, rotación, capas, radio, símbolo
 * protagonista. El PNG final se genera aparte a resolución completa (ver
 * src/lib/wallpaper.ts).
 */
export function ExportPage({ formula }: ExportPageProps) {
  const { locale, strings } = useLocale();
  const { fx, theme, type, setFx, setTheme, setType } = usePreferences();
  const [mode, setMode] = useState<ExportMode>("image");
  const [style, setStyle] = useState<WallpaperStyle>("formula");
  const [sizeId, setSizeId] = useState<WallpaperSizeId>("4k");
  const [optionsByStyle, setOptionsByStyle] = useState<OptionsByStyle>(initialOptions);
  const [brand, setBrand] = useState(true);
  const [details, setDetails] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [duration, setDuration] = useState(20);
  const [fps, setFps] = useState(30);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<ExportStatus>("idle");
  const abortRef = useRef<AbortController | null>(null);
  const [stageRef, stageWidth] = useElementWidth<HTMLDivElement>();
  const [galleryRef, galleryWidth] = useElementWidth<HTMLDivElement>();

  const isVideo = mode === "video";
  const sizes: readonly WallpaperSize[] = isVideo ? videoSizes : wallpaperSizes;
  const size = sizes.find((item) => item.id === sizeId) ?? wallpaperSizes[0];
  const options = optionsByStyle[style];
  const optionKeys = optionKeysFor(style, isVideo);
  const activeStyleLabel = strings[STYLE_LABEL_KEYS[style]];
  const defaultOptions = () => defaultWallpaperOptions(style);
  const videoSupported = isVideoRecordingSupported();
  const appearanceKey = `${theme}|${type}|${fx}`;
  const modeOptions: ComboboxOption[] = [
    { id: "image", label: strings.exportModeImage },
    { id: "video", label: strings.exportModeVideo },
  ];
  const styleOptions: ComboboxOption[] = styles.map((item) => ({
    id: item,
    label: strings[STYLE_LABEL_KEYS[item]],
  }));
  const fxOptions: ComboboxOption[] = fxPresets.map((item) => ({ id: item, label: fxNames[item] }));
  const themeOptions: ComboboxOption[] = themes.map((item) => ({
    id: item.id,
    label: item.name,
    theme: item.id,
  }));
  const sizeNames: Partial<Record<WallpaperSizeId, string>> = {
    laptop: strings.exportSizeLaptop,
    ultrawide: strings.exportSizeUltrawide,
    superwide: strings.exportSizeSuperwide,
    cinema: strings.exportSizeCinema,
    tablet: strings.exportSizeTablet,
    tabletPro: strings.exportSizeTabletPro,
    tabletPortrait: strings.exportSizeTabletPortrait,
    square: strings.exportSizeSquare,
    mobile: strings.exportSizeMobile,
  };
  const sizeLabel = (item: WallpaperSize) => {
    const dims = `${String(item.width)} × ${String(item.height)}`;
    const name = sizeNames[item.id];
    return name ? `${name} · ${dims}` : dims;
  };
  const sizeOptions: ComboboxOption[] = sizes.map((item) => ({
    id: item.id,
    label: sizeLabel(item),
  }));
  const durationOptions: ComboboxOption[] = videoDurations.map((item) => ({
    id: String(item),
    label: `${String(item)} s`,
  }));
  const fpsOptions: ComboboxOption[] = videoFrameRates.map((item) => ({
    id: String(item),
    label: String(item),
  }));
  const typeOptions: ComboboxOption[] = typePresets.map((item) => ({
    id: item,
    label: typeNames[item],
  }));
  const formulaPath = (forLocale: typeof locale) => `/${forLocale}/formula/${formula.id}`;

  useSeo({
    locale,
    title: `${strings.exportLabel} · ${formula.title[locale]}`,
    description: strings.exportDescription,
    // Canónica = la fórmula: esta página es una herramienta, no contenido
    // indexable aparte.
    path: formulaPath(locale),
    image: `${SITE_URL}/og/${formula.id}-${locale}.png`,
    alternates: locales.map((altLocale) => ({ locale: altLocale, path: formulaPath(altLocale) })),
  });

  // Página de flujo normal: arranca arriba y con Lenis activo (FormulaHero lo
  // detiene mientras reconstruye su pin; acá no hay pin que esperar).
  useEffect(() => {
    globalThis.scrollTo(0, 0);
    getLenis()?.resize();
    unlockScroll("hero-rebuild");
  }, []);

  // El preview en portrait (móvil) no puede ocupar todo el ancho: se limita
  // por alto para que entre en pantalla junto a los ajustes.
  const maxStageHeight = Math.max(240, globalThis.innerHeight * 0.44);
  const stageCssWidth = Math.min(stageWidth, (maxStageHeight * size.width) / size.height);
  // Galería: los cinco estilos en fila en desktop; en pantallas angostas se
  // parte en columnas (el ancho de cada canvas sale de la misma cuenta).
  const thumbGap = 16;
  const thumbColumns =
    galleryWidth < 560 ? 2 : galleryWidth < 900 ? 3 : galleryWidth < 1200 ? 4 : 6;
  const thumbCssWidth = Math.max(0, (galleryWidth - thumbGap * (thumbColumns - 1)) / thumbColumns);

  const setOption = (key: WallpaperOptionKey, value: number) => {
    setOptionsByStyle((current) => ({
      ...current,
      [style]: { ...current[style], [key]: value },
    }));
  };

  const resetOptions = () => {
    setOptionsByStyle((current) => ({ ...current, [style]: defaultOptions() }));
  };

  const handleRecord = async () => {
    if (status === "working") return;
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress(0);
    setStatus("working");
    try {
      const context = readWallpaperContext();
      await ensureWallpaperFonts(context);
      const video = await recordVideo(
        { formula, locale, style, size, fx, options, context, brand, details },
        { fps, seconds: duration, signal: controller.signal, onProgress: setProgress },
      );
      downloadWallpaper(
        video.blob,
        `mgm-${formula.id}-${style}-${String(size.width)}x${String(size.height)}.${video.extension}`,
      );
      setStatus("done");
      globalThis.setTimeout(() => {
        setStatus("idle");
      }, 2000);
    } catch {
      // Cancelado por el usuario o el navegador no pudo grabar: sin descarga.
      setStatus("idle");
    } finally {
      abortRef.current = null;
    }
  };

  // Cerrar la página o cambiar de fórmula a mitad de una grabación la cancela.
  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const handleExport = async () => {
    if (status === "working") return;
    setStatus("working");
    try {
      const blob = await renderWallpaper({
        formula,
        locale,
        style,
        size,
        fx,
        options,
        brand,
        details,
        context: readWallpaperContext(),
      });
      downloadWallpaper(
        blob,
        `mgm-${formula.id}-${style}-${String(size.width)}x${String(size.height)}.png`,
      );
      setStatus("done");
      globalThis.setTimeout(() => {
        setStatus("idle");
      }, 2000);
    } catch {
      // Canvas sin contexto 2D o toBlob fallido: se vuelve a idle sin
      // descarga; el usuario puede reintentar.
      setStatus("idle");
    }
  };

  return (
    <main className="export" aria-label={strings.exportLabel}>
      <header className="export__header">
        <p className="export__eyebrow">{strings.exportLabel}</p>
        <h1 className="export__title">{formula.title[locale]}</h1>
      </header>

      <div className="export__bar">
        <Combobox
          label={strings.exportModeLabel}
          value={mode}
          options={modeOptions}
          onChange={(id) => {
            if (status !== "working") setMode(id === "video" ? "video" : "image");
          }}
          searchPlaceholder={strings.exportFilterPlaceholder}
          emptyLabel={strings.exportNoMatches}
        />
        <Combobox
          label={strings.exportStyleLabel}
          value={style}
          options={styleOptions}
          onChange={(id) => {
            const next = styles.find((item) => item === id);
            if (next) setStyle(next);
          }}
          searchPlaceholder={strings.exportFilterPlaceholder}
          emptyLabel={strings.exportNoMatches}
        />
        {/* Apariencia: los mismos presets globales del chrome, a mano acá para
            ver el wallpaper con cada efecto/tema/fuente sin salir del preview. */}
        <Combobox
          label={strings.fxLabel}
          value={fx}
          options={fxOptions}
          onChange={(id) => {
            const next = fxPresets.find((item) => item === id);
            if (next) setFx(next);
          }}
          searchPlaceholder={strings.exportFilterPlaceholder}
          emptyLabel={strings.exportNoMatches}
        />
        <Combobox
          label={strings.themeLabel}
          value={theme}
          options={themeOptions}
          onChange={(id) => {
            const next = themes.find((item) => item.id === id);
            if (next) setTheme(next.id);
          }}
          searchPlaceholder={strings.exportFilterPlaceholder}
          emptyLabel={strings.exportNoMatches}
        />
        <Combobox
          label={strings.typeLabel}
          value={type}
          options={typeOptions}
          onChange={(id) => {
            const next = typePresets.find((item) => item === id);
            if (next && next !== type) setType(next);
          }}
          searchPlaceholder={strings.exportFilterPlaceholder}
          emptyLabel={strings.exportNoMatches}
        />
        <Combobox
          label={strings.exportSizeLabel}
          value={size.id}
          options={sizeOptions}
          onChange={(id) => {
            const next = sizes.find((item) => item.id === id);
            if (next) setSizeId(next.id);
          }}
          searchPlaceholder={strings.exportFilterPlaceholder}
          emptyLabel={strings.exportNoMatches}
        />
        {isVideo ? (
          <>
            <Combobox
              label={strings.exportDurationLabel}
              value={String(duration)}
              options={durationOptions}
              onChange={(id) => {
                setDuration(Number(id));
              }}
              searchPlaceholder={strings.exportFilterPlaceholder}
              emptyLabel={strings.exportNoMatches}
            />
            <Combobox
              label="FPS"
              value={String(fps)}
              options={fpsOptions}
              onChange={(id) => {
                setFps(Number(id));
              }}
              searchPlaceholder={strings.exportFilterPlaceholder}
              emptyLabel={strings.exportNoMatches}
            />
          </>
        ) : null}
        <div className="export__toggles">
          <button
            type="button"
            className="export__chip"
            aria-pressed={brand}
            onClick={() => {
              setBrand((current) => !current);
            }}
          >
            {strings.exportBrand}
          </button>
          {isVideo || isVideoStyle(style) ? (
            <button
              type="button"
              className="export__chip"
              aria-pressed={details}
              onClick={() => {
                setDetails((current) => !current);
              }}
            >
              {strings.exportDetails}
            </button>
          ) : null}
        </div>
      </div>

      <div className="export__stage" ref={stageRef}>
        {/* Marcas de registro tipográficas (DESIGN.md: nada de bordes):
            delimitan el lienzo aunque su fondo sea el mismo que el de la página. */}
        <div className="export__frame" style={{ width: `${String(stageCssWidth)}px` }}>
          {isVideo ? (
            <VideoPreviewCanvas
              className="export__canvas"
              request={{ formula, locale, style, fx, options, brand, details }}
              size={size}
              cssWidth={stageCssWidth}
              appearanceKey={appearanceKey}
            />
          ) : (
            <PreviewCanvas
              className="export__canvas"
              request={{ formula, locale, style, fx, options, brand, details }}
              size={size}
              cssWidth={stageCssWidth}
              appearanceKey={appearanceKey}
            />
          )}
          <span className="export__mark export__mark--tl" aria-hidden="true">
            +
          </span>
          <span className="export__mark export__mark--tr" aria-hidden="true">
            +
          </span>
          <span className="export__mark export__mark--bl" aria-hidden="true">
            +
          </span>
          <span className="export__mark export__mark--br" aria-hidden="true">
            +
          </span>
        </div>
        <p className="export__meta">
          {activeStyleLabel} · {size.width} × {size.height}
          {isVideo ? ` · ${strings.exportLoop}` : ""}
        </p>
      </div>

      {/* Ajustes del estilo: barra centrada bajo el preview, como los
          parámetros de un editor de video. */}
      <section className="export__adjust" aria-label={strings.exportAdjustLabel}>
        <div className="export__adjust-head">
          <p className="export__group-label">{strings.exportAdjustLabel}</p>
          <button type="button" className="export__reset" onClick={resetOptions}>
            {strings.exportReset}
          </button>
        </div>
        <div className="export__sliders">
          {optionKeys.map((key) => {
            const baseSpec = optionSpec(key);
            // El símbolo protagonista solo puede elegir entre los nodos que existen.
            const spec =
              key === "focus"
                ? { ...baseSpec, max: Math.max(0, formula.nodes.length - 1) }
                : baseSpec;
            const id = `export-${key}`;
            return (
              <div className="export__slider" key={key}>
                <label className="export__slider-label" htmlFor={id}>
                  <span>{strings[OPTION_LABEL_KEYS[key]]}</span>
                  <span className="export__slider-value">
                    {formatOption(key, options[key], formula)}
                  </span>
                </label>
                <input
                  id={id}
                  type="range"
                  min={spec.min}
                  max={spec.max}
                  step={spec.step}
                  value={Math.min(options[key], spec.max)}
                  onChange={(event) => {
                    setOption(key, Number(event.target.value));
                  }}
                  onDoubleClick={() => {
                    setOption(key, defaultOptions()[key]);
                  }}
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="export__gallery-wrap" ref={galleryRef}>
        <button
          type="button"
          className="export__reset export__toggle-all"
          aria-expanded={showAll}
          onClick={() => {
            setShowAll((current) => !current);
          }}
        >
          {showAll ? strings.exportHideAll : strings.exportPreviewAll}
        </button>
        {showAll ? (
          <div
            className="export__gallery"
            aria-label={strings.exportStyleLabel}
            style={{
              gridTemplateColumns: `repeat(${String(thumbColumns)}, minmax(0, 1fr))`,
              gap: `${String(thumbGap)}px`,
            }}
          >
            {styles.map((item) => {
              const thumbRequest = {
                formula,
                locale,
                style: item,
                fx,
                options: optionsByStyle[item],
                brand,
                details,
              };
              return (
                <button
                  key={item}
                  type="button"
                  className="export__thumb"
                  aria-pressed={item === style}
                  onClick={() => {
                    setStyle(item);
                  }}
                >
                  <span className="export__thumb-frame">
                    {isVideo ? (
                      <VideoPreviewCanvas
                        className="export__thumb-canvas"
                        request={thumbRequest}
                        size={size}
                        cssWidth={thumbCssWidth}
                        appearanceKey={appearanceKey}
                        fps={20}
                      />
                    ) : (
                      <PreviewCanvas
                        className="export__thumb-canvas"
                        request={thumbRequest}
                        size={size}
                        cssWidth={thumbCssWidth}
                        appearanceKey={appearanceKey}
                      />
                    )}
                  </span>
                  <span className="export__thumb-label">{strings[STYLE_LABEL_KEYS[item]]}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      <div className="export__dock">
        {isVideo && status === "working" ? (
          <button
            type="button"
            className="export__cancel"
            onClick={() => {
              abortRef.current?.abort();
            }}
          >
            {strings.exportCancel}
          </button>
        ) : null}
        <button
          type="button"
          className="export__download"
          disabled={status === "working" || (isVideo && !videoSupported)}
          onClick={() => {
            void (isVideo ? handleRecord() : handleExport());
          }}
        >
          {status === "working"
            ? isVideo
              ? `${strings.exportRecording} ${String(Math.round(progress * 100))}%`
              : strings.exportWorking
            : status === "done"
              ? strings.exportDone
              : isVideo
                ? videoSupported
                  ? strings.exportRecord
                  : strings.exportVideoUnsupported
                : strings.exportDownload}
        </button>
      </div>
    </main>
  );
}
