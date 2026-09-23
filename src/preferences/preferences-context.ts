import { createContext, useContext } from "react";

/** Estéticas visuales opt-in — `mono` es el default monocromático de siempre. */
export const fxPresets = ["mono", "crt", "vhs", "neon"] as const;
export type FxPreset = (typeof fxPresets)[number];

/** Presets tipográficos — `default` es JetBrains Mono + General Sans. */
export const typePresets = ["default", "classic", "editorial", "modern", "terminal"] as const;
export type TypePreset = (typeof typePresets)[number];

export const themes = ["dark", "light"] as const;
export type Theme = (typeof themes)[number];

/*
 * Los nombres de preset son etiquetas propias (como una marca): no se
 * traducen. Lo que sí se traduce es el rótulo del control ("Efecto",
 * "Fuente") — ver UiStrings.fxLabel/typeLabel.
 */
export const fxNames: Record<FxPreset, string> = {
  mono: "Mono",
  crt: "CRT",
  vhs: "VHS",
  neon: "Neon",
};

export const typeNames: Record<TypePreset, string> = {
  default: "Original",
  classic: "Clásico",
  editorial: "Editorial",
  modern: "Moderno",
  terminal: "Terminal",
};

export interface PreferencesContextValue {
  theme: Theme;
  fx: FxPreset;
  /** Preset tipográfico aplicado (sus webfonts ya están listos si lo requieren). */
  type: TypePreset;
  /** false mientras cargan los webfonts del preset pedido — ver PreferencesProvider. */
  typeReady: boolean;
  /** Alterna claro/oscuro. */
  cycleTheme: () => void;
  /** Rota Mono → CRT → VHS → Neon → Mono. */
  cycleFx: () => void;
  /** Rota Original → Clásico → Editorial → Moderno → Terminal → Original. */
  cycleType: () => void;
}

export const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within a PreferencesProvider");
  return ctx;
}
