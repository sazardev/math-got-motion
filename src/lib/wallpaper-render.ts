import { createVideoRenderer } from "./video-wallpaper";
import {
  canvasToBlob,
  drawComposed,
  ensureWallpaperFonts,
  isExtraStyle,
  isVideoStyle,
  optionsFor,
  type WallpaperRequest,
} from "./wallpaper";
import { extraComposers } from "./wallpaper-extra";

/**
 * Punto de entrada del exportador de imágenes: despacha cada estilo a su
 * dibujante. Los clásicos viven en wallpaper.ts, los extra en
 * wallpaper-extra.ts y las escenas de video se exportan como una foto fija
 * (el cuadro que elige el slider "Momento").
 */
export function drawWallpaper(canvas: HTMLCanvasElement, request: WallpaperRequest): void {
  const { style } = request;
  if (isVideoStyle(style)) {
    const options = optionsFor(request);
    createVideoRenderer(canvas, {
      formula: request.formula,
      locale: request.locale,
      style,
      size: request.size,
      fx: request.fx,
      context: request.context,
      options,
      brand: request.brand !== false,
      details: request.details !== false,
    }).draw(options.moment, 0);
    return;
  }
  drawComposed(canvas, request, isExtraStyle(style) ? extraComposers[style] : undefined);
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
