import { useState } from "react";

import { useLocale } from "../../i18n/locale-context";
import {
  downloadWallpaper,
  readWallpaperContext,
  renderWallpaper,
  wallpaperSizes,
  type WallpaperSizeId,
  type WallpaperStyle,
} from "../../lib/wallpaper";
import { usePreferences } from "../../preferences/preferences-context";
import { ControlMenu } from "../control-menu/ControlMenu";

import type { Formula } from "../../domain/formula.types";
import type { UiStrings } from "../../i18n/ui-strings";

interface ExportPanelProps {
  /** Solo se monta en rutas de fórmula: el export necesita una fórmula activa. */
  formula: Formula;
}

const STYLE_LABEL_KEYS = {
  formula: "exportStyleFormula",
  poster: "exportStylePoster",
  isometric: "exportStyleIsometric",
  depth: "exportStyleDepth",
  pattern: "exportStylePattern",
} as const satisfies Record<WallpaperStyle, keyof UiStrings>;

type ExportStatus = "idle" | "working" | "done";

/**
 * Exporta la fórmula activa como wallpaper PNG de alta resolución, con el
 * tema, la tipografía y el efecto que el usuario está viendo. El render corre
 * en un canvas offscreen (ver src/lib/wallpaper.ts), no captura el DOM.
 */
export function ExportPanel({ formula }: ExportPanelProps) {
  const { locale, strings } = useLocale();
  const { fx } = usePreferences();
  const [style, setStyle] = useState<WallpaperStyle>("formula");
  const [sizeId, setSizeId] = useState<WallpaperSizeId>("4k");
  const [status, setStatus] = useState<ExportStatus>("idle");

  const size = wallpaperSizes.find((item) => item.id === sizeId) ?? wallpaperSizes[0];

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
    <ControlMenu label={strings.exportLabel} value={strings[STYLE_LABEL_KEYS[style]]}>
      {() => (
        <>
          <p className="control-menu__group-label">{strings.exportStyleLabel}</p>
          <div className="control-menu__options">
            {(Object.keys(STYLE_LABEL_KEYS) as WallpaperStyle[]).map((item) => (
              <button
                key={item}
                type="button"
                className="control-menu__option"
                aria-pressed={item === style}
                onClick={() => {
                  setStyle(item);
                }}
              >
                {strings[STYLE_LABEL_KEYS[item]]}
              </button>
            ))}
          </div>

          <p className="control-menu__group-label">{strings.exportSizeLabel}</p>
          <div className="control-menu__row">
            {wallpaperSizes.map((item) => (
              <button
                key={item.id}
                type="button"
                className="control-menu__option"
                aria-pressed={item.id === sizeId}
                onClick={() => {
                  setSizeId(item.id);
                }}
              >
                {item.id === "mobile"
                  ? `${strings.exportSizeMobile} · ${String(item.width)} × ${String(item.height)}`
                  : `${String(item.width)} × ${String(item.height)}`}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="control-menu__action"
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
        </>
      )}
    </ControlMenu>
  );
}
