import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

import { usePreferences } from "../../preferences/preferences-context";

import "./FxLayer.css";

const GRAIN_TILE_PX = 128;
const GRAIN_DISPLAY_PX = 180;

/**
 * Pinta el grano de película en un canvas y lo expone como data-URI: sin
 * assets binarios y con el color de texto del tema activo (blanco en oscuro,
 * negro en claro), para no depender de mix-blend-mode.
 */
function paintGrain(layer: HTMLDivElement) {
  const canvas = document.createElement("canvas");
  canvas.width = GRAIN_TILE_PX;
  canvas.height = GRAIN_TILE_PX;
  const context = canvas.getContext("2d");
  if (!context) return;

  // Sondeo de --fg: se pinta 1px y se lee su RGB, así funciona con cualquier
  // formato de color que use el tema (#fff, #ffffff, rgb(...)).
  const fg =
    globalThis.getComputedStyle(document.documentElement).getPropertyValue("--fg").trim() ||
    "#ffffff";
  context.fillStyle = fg;
  context.fillRect(0, 0, 1, 1);
  const probe = context.getImageData(0, 0, 1, 1).data;
  const red = probe[0] ?? 255;
  const green = probe[1] ?? 255;
  const blue = probe[2] ?? 255;

  context.clearRect(0, 0, GRAIN_TILE_PX, GRAIN_TILE_PX);
  const image = context.createImageData(GRAIN_TILE_PX, GRAIN_TILE_PX);
  for (let index = 0; index < image.data.length; index += 4) {
    image.data[index] = red;
    image.data[index + 1] = green;
    image.data[index + 2] = blue;
    image.data[index + 3] = Math.random() * 90;
  }
  context.putImageData(image, 0, 0);

  layer.style.backgroundImage = `url(${canvas.toDataURL("image/png")})`;
  layer.style.backgroundSize = `${String(GRAIN_DISPLAY_PX)}px ${String(GRAIN_DISPLAY_PX)}px`;
}

/**
 * Capas decorativas de las estéticas opt-in. En `mono` —el default— no monta
 * nada: el DOM de la app queda idéntico al de siempre. Tampoco en el
 * exportador: ahí el preview del wallpaper ya dibuja el efecto dentro del
 * canvas, y una segunda capa encima haría que lo que se ve no sea el PNG.
 */
export function FxLayer() {
  const { fx, theme } = usePreferences();
  const { pathname } = useLocation();
  const grainRef = useRef<HTMLDivElement>(null);
  const onExportPage = pathname.endsWith("/export");

  useEffect(() => {
    const layer = grainRef.current;
    if (!layer) return;
    paintGrain(layer);
  }, [fx, theme, onExportPage]);

  if (fx === "mono" || onExportPage) return null;

  // CRT/VHS/Neon comparten la base de monitor (scanlines, roll, flicker); las
  // estéticas nuevas montan solo lo suyo.
  const monitor = fx === "crt" || fx === "vhs" || fx === "neon";
  const grain = monitor || fx === "film" || fx === "glitch";

  return (
    <div className="fx" aria-hidden="true">
      {monitor && (
        <>
          <div className="fx__scanlines" />
          <div className="fx__roll" />
          <div className="fx__tracking" />
        </>
      )}
      {grain && <div className="fx__grain" ref={grainRef} />}
      {monitor && <div className="fx__flicker" />}
      {fx !== "halftone" && <div className="fx__vignette" />}
      {fx === "crt" && <div className="fx__curvature" />}
      {fx === "neon" && <div className="fx__ambient" />}
      {fx === "film" && <div className="fx__leak" />}
      {fx === "dream" && <div className="fx__haze" />}
      {fx === "halftone" && <div className="fx__halftone" />}
      {fx === "glitch" && (
        <>
          <div className="fx__slices" />
          <div className="fx__scanlines fx__scanlines--thin" />
        </>
      )}
    </div>
  );
}
