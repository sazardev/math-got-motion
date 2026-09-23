import { useEffect, useRef } from "react";

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
 * Capas decorativas de las estéticas opt-in (CRT/VHS/Neon). En `mono` —el
 * default— no monta nada: el DOM de la app queda idéntico al de siempre.
 */
export function FxLayer() {
  const { fx, theme } = usePreferences();
  const grainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = grainRef.current;
    if (!layer) return;
    paintGrain(layer);
  }, [fx, theme]);

  if (fx === "mono") return null;

  return (
    <div className="fx" aria-hidden="true">
      <div className="fx__scanlines" />
      <div className="fx__roll" />
      <div className="fx__tracking" />
      <div className="fx__grain" ref={grainRef} />
      <div className="fx__flicker" />
      <div className="fx__vignette" />
      {fx === "crt" && <div className="fx__curvature" />}
      {fx === "neon" && <div className="fx__ambient" />}
    </div>
  );
}
