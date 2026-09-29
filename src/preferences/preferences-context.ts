import { createContext, useContext } from "react";

import type { ThemeId } from "./themes";

/** Estéticas visuales opt-in — `mono` es el default monocromático de siempre. */
export const fxPresets = [
  "mono",
  "crt",
  "vhs",
  "neon",
  "film",
  "dream",
  "halftone",
  "glitch",
] as const;
export type FxPreset = (typeof fxPresets)[number];

/** Presets tipográficos — `default` es JetBrains Mono + General Sans. */
export const typePresets = [
  "default",
  "classic",
  "editorial",
  "modern",
  "terminal",
  "elegant",
  "fraunces",
  "code",
  "swiss",
  "futurist",
  "roboto",
  "sourcecode",
  "plex",
  "cascadia",
  "geist",
  "martian",
  "playfair",
  "garamond",
  "lora",
  "crimson",
  "literata",
  "merriweather",
  "baskerville",
  "dmserif",
  "montserrat",
  "poppins",
  "manrope",
  "outfit",
  "sora",
  "bricolage",
  "orbitron",
  "exo",
  "oswald",
  "bebas",
  "pixel",
  "vt323",
  "majormono",
  "caveat",
  "ubuntu",
  "abril",
  "syne",
  "typewriter",
] as const;
export type TypePreset = (typeof typePresets)[number];

/*
 * Los nombres de preset (estética, tipografía y tema) son etiquetas propias
 * (como una marca): no se traducen. Lo que sí se traduce es el rótulo del
 * control ("Efecto", "Fuente", "Tema") — ver UiStrings.
 */
export const fxNames: Record<FxPreset, string> = {
  mono: "Mono",
  crt: "CRT",
  vhs: "VHS",
  neon: "Neon",
  film: "Film",
  dream: "Dream",
  halftone: "Halftone",
  glitch: "Glitch",
};

export const typeNames: Record<TypePreset, string> = {
  default: "Original",
  classic: "Clásico",
  editorial: "Editorial",
  modern: "Moderno",
  terminal: "Terminal",
  elegant: "Elegante",
  fraunces: "Fraunces",
  code: "Código",
  swiss: "Suizo",
  futurist: "Futurista",
  roboto: "Roboto",
  sourcecode: "Source Code",
  plex: "IBM Plex",
  cascadia: "Cascadia",
  geist: "Geist",
  martian: "Martian",
  playfair: "Playfair",
  garamond: "Garamond",
  lora: "Lora",
  crimson: "Crimson",
  literata: "Literata",
  merriweather: "Merriweather",
  baskerville: "Baskerville",
  dmserif: "DM Serif",
  montserrat: "Montserrat",
  poppins: "Poppins",
  manrope: "Manrope",
  outfit: "Outfit",
  sora: "Sora",
  bricolage: "Bricolage",
  orbitron: "Orbitron",
  exo: "Exo 2",
  oswald: "Oswald",
  bebas: "Bebas",
  pixel: "Pixel",
  vt323: "VT323",
  majormono: "Major Mono",
  caveat: "Caveat",
  ubuntu: "Ubuntu",
  abril: "Abril",
  syne: "Syne",
  typewriter: "Typewriter",
};

export interface PreferencesContextValue {
  /** Tema de color global (`data-theme` en <html>) — ver themes.ts. */
  theme: ThemeId;
  fx: FxPreset;
  /** Preset tipográfico aplicado (sus webfonts ya están listos si lo requieren). */
  type: TypePreset;
  /** false mientras cargan los webfonts del preset pedido — ver PreferencesProvider. */
  typeReady: boolean;
  /** Aplica un tema puntual (el picker elige de la lista, no rota). */
  setTheme: (theme: ThemeId) => void;
  /** Aplica una estética puntual (el mini-menú elige de la lista). */
  setFx: (fx: FxPreset) => void;
  /** Pide un preset tipográfico; se aplica cuando sus webfonts están listos. */
  setType: (type: TypePreset) => void;
}

export const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within a PreferencesProvider");
  return ctx;
}
