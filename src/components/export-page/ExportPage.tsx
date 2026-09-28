import { useEffect, useRef, useState } from "react";

import { useSeo } from "../../hooks/useSeo";
import { locales } from "../../i18n/locale";
import { useLocale } from "../../i18n/locale-context";
import { getLenis, unlockScroll } from "../../lib/lenis";
import { SITE_URL } from "../../lib/site";
import {
  defaultWallpaperOptions,
  downloadWallpaper,
  drawWallpaper,
  ensureWallpaperFonts,
  optionSpec,
  readWallpaperContext,
  renderWallpaper,
  styleOptionKeys,
  wallpaperSizes,
  wallpaperStyles,
  type WallpaperOptionKey,
  type WallpaperOptions,
  type WallpaperRequest,
  type WallpaperSize,
  type WallpaperSizeId,
  type WallpaperStyle,
} from "../../lib/wallpaper";
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

const STYLE_LABEL_KEYS = {
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
} as const satisfies Record<WallpaperOptionKey, keyof UiStrings>;

const styles = wallpaperStyles;

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
  const { formula, locale, style, fx, options } = request;

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
        });
      });
    });
    return () => {
      cancelled = true;
      globalThis.cancelAnimationFrame(frame);
    };
  }, [formula, locale, style, fx, options, size, cssWidth, appearanceKey]);

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
  const [style, setStyle] = useState<WallpaperStyle>("formula");
  const [sizeId, setSizeId] = useState<WallpaperSizeId>("4k");
  const [optionsByStyle, setOptionsByStyle] = useState<OptionsByStyle>(initialOptions);
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [stageRef, stageWidth] = useElementWidth<HTMLDivElement>();
  const [galleryRef, galleryWidth] = useElementWidth<HTMLDivElement>();

  const size = wallpaperSizes.find((item) => item.id === sizeId) ?? wallpaperSizes[0];
  const options = optionsByStyle[style];
  const appearanceKey = `${theme}|${type}|${fx}`;
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
  const maxStageHeight = Math.max(240, globalThis.innerHeight * 0.66);
  const stageCssWidth = Math.min(stageWidth, (maxStageHeight * size.width) / size.height);
  // Galería: los cinco estilos en fila en desktop; en pantallas angostas se
  // parte en columnas (el ancho de cada canvas sale de la misma cuenta).
  const thumbGap = 16;
  const thumbColumns =
    galleryWidth < 560 ? 2 : galleryWidth < 900 ? 3 : galleryWidth < 1200 ? 4 : 6;
  const thumbCssWidth = Math.max(0, (galleryWidth - thumbGap * (thumbColumns - 1)) / thumbColumns);

  const setOption = (key: WallpaperOptionKey, value: number) => {
    setOptionsByStyle((current) => ({ ...current, [style]: { ...current[style], [key]: value } }));
  };

  const resetOptions = () => {
    setOptionsByStyle((current) => ({ ...current, [style]: defaultWallpaperOptions(style) }));
  };

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

      <div className="export__layout">
        <div className="export__stage" ref={stageRef}>
          {/* Marcas de registro tipográficas (DESIGN.md: nada de bordes):
              delimitan el lienzo aunque su fondo sea el mismo que el de la página. */}
          <div className="export__frame" style={{ width: `${String(stageCssWidth)}px` }}>
            <PreviewCanvas
              className="export__canvas"
              request={{ formula, locale, style, fx, options }}
              size={size}
              cssWidth={stageCssWidth}
              appearanceKey={appearanceKey}
            />
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
            {strings[STYLE_LABEL_KEYS[style]]} · {size.width} × {size.height}
          </p>
        </div>

        {/* data-lenis-prevent: el panel scrollea por dentro si no entra en
            pantalla, y Lenis no debe secuestrarle la rueda. */}
        <aside className="export__settings" data-lenis-prevent>
          <section className="export__group">
            <p className="export__group-label">{strings.exportStyleLabel}</p>
            <div className="export__chips">
              {styles.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="export__chip"
                  aria-pressed={item === style}
                  onClick={() => {
                    setStyle(item);
                  }}
                >
                  {strings[STYLE_LABEL_KEYS[item]]}
                </button>
              ))}
            </div>
          </section>

          {/* Apariencia: los mismos presets globales del chrome, a mano acá para
              ver el wallpaper con cada efecto/tema/fuente sin salir del preview. */}
          <section className="export__group">
            <p className="export__group-label">{strings.fxLabel}</p>
            <div className="export__chips">
              {fxPresets.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="export__chip"
                  aria-pressed={item === fx}
                  onClick={() => {
                    setFx(item);
                  }}
                >
                  {fxNames[item]}
                </button>
              ))}
            </div>
          </section>

          <section className="export__group">
            <p className="export__group-label">{strings.themeLabel}</p>
            <div className="export__swatches">
              {themes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  // La muestra lleva su propia paleta: [data-theme] redefine
                  // --bg/--fg/--accent solo dentro del botón (ver index.css).
                  data-theme={item.id}
                  className="export__swatch"
                  aria-pressed={item.id === theme}
                  onClick={() => {
                    setTheme(item.id);
                  }}
                >
                  <span className="export__swatch-accent" aria-hidden="true">
                    π
                  </span>
                  {item.name}
                </button>
              ))}
            </div>
          </section>

          <section className="export__group">
            <p className="export__group-label">{strings.typeLabel}</p>
            <div className="export__chips">
              {typePresets.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="export__chip"
                  aria-pressed={item === type}
                  onClick={() => {
                    if (item !== type) setType(item);
                  }}
                >
                  {typeNames[item]}
                </button>
              ))}
            </div>
          </section>

          <section className="export__group">
            <p className="export__group-label">{strings.exportSizeLabel}</p>
            <div className="export__chips">
              {wallpaperSizes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="export__chip"
                  aria-pressed={item.id === sizeId}
                  onClick={() => {
                    setSizeId(item.id);
                  }}
                >
                  {item.id === "mobile"
                    ? strings.exportSizeMobile
                    : `${String(item.width)} × ${String(item.height)}`}
                </button>
              ))}
            </div>
          </section>

          <section className="export__group">
            <div className="export__group-head">
              <p className="export__group-label">{strings.exportAdjustLabel}</p>
              <button type="button" className="export__reset" onClick={resetOptions}>
                {strings.exportReset}
              </button>
            </div>
            {styleOptionKeys[style].map((key) => {
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
                      setOption(key, defaultWallpaperOptions(style)[key]);
                    }}
                  />
                </div>
              );
            })}
          </section>

          <button
            type="button"
            className="export__download"
            disabled={status === "working"}
            onClick={() => {
              void handleExport();
            }}
          >
            {status === "working"
              ? strings.exportWorking
              : status === "done"
                ? strings.exportDone
                : strings.exportDownload}
          </button>
          <p className="export__hint">{strings.exportAppearanceHint}</p>
        </aside>
      </div>

      <section
        className="export__gallery"
        ref={galleryRef}
        aria-label={strings.exportStyleLabel}
        style={{
          gridTemplateColumns: `repeat(${String(thumbColumns)}, minmax(0, 1fr))`,
          gap: `${String(thumbGap)}px`,
        }}
      >
        {styles.map((item) => (
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
              <PreviewCanvas
                className="export__thumb-canvas"
                request={{ formula, locale, style: item, fx, options: optionsByStyle[item] }}
                size={size}
                cssWidth={thumbCssWidth}
                appearanceKey={appearanceKey}
              />
            </span>
            <span className="export__thumb-label">{strings[STYLE_LABEL_KEYS[item]]}</span>
          </button>
        ))}
      </section>
    </main>
  );
}
