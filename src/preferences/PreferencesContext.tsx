import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  fxPresets,
  PreferencesContext,
  typePresets,
  type FxPreset,
  type PreferencesContextValue,
  type TypePreset,
} from "./preferences-context";
import { isThemeId, themeMeta, type ThemeId } from "./themes";
import { loadTypeFonts } from "../lib/font-loaders";
import { stashScrollAnchor } from "../lib/scroll-anchor";

const STORAGE_KEY = "mgm:preferences";

interface Preferences {
  theme: ThemeId;
  fx: FxPreset;
  /** Preset tipográfico aplicado — el que `data-type` refleja y consume FormulaHero. */
  type: TypePreset;
  /** Preset pedido por el usuario; puede estar esperando sus webfonts. */
  requestedType: TypePreset;
  /** false mientras los webfonts del preset pedido están en vuelo. */
  typeReady: boolean;
}

interface StoredPreferences {
  theme: ThemeId;
  fx: FxPreset;
  type: TypePreset;
}

function isFxPreset(value: unknown): value is FxPreset {
  return (fxPresets as readonly unknown[]).includes(value);
}

function isTypePreset(value: unknown): value is TypePreset {
  return (typePresets as readonly unknown[]).includes(value);
}

/**
 * Migra los ids viejos del toggle claro/oscuro (`dark`/`light`) a los temas
 * actuales, y valida contra el catálogo. Así una preferencia guardada antes
 * del sistema de temas no se descarta.
 */
function toThemeId(value: unknown): ThemeId | null {
  if (value === "dark") return "mono-dark";
  if (value === "light") return "mono-light";
  return isThemeId(value) ? value : null;
}

/** Preferencias guardadas, tolerando storage bloqueado o JSON corrupto. */
function readStoredPreferences(): StoredPreferences {
  const defaults: StoredPreferences = { theme: "mono-dark", fx: "mono", type: "default" };

  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return defaults;
    const record = parsed as Record<string, unknown>;
    const theme = toThemeId(record["theme"]);
    const fx = record["fx"];
    const type = record["type"];
    return {
      theme: theme ?? defaults.theme,
      fx: isFxPreset(fx) ? fx : defaults.fx,
      type: isTypePreset(type) ? type : defaults.type,
    };
  } catch {
    // Storage no disponible (modo privado, cuota, JSON roto) — se usan los
    // defaults y la sesión sigue en memoria.
    return defaults;
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(() => {
    const stored = readStoredPreferences();
    return {
      theme: stored.theme,
      fx: stored.fx,
      // Un preset guardado que necesita webfonts arranca en `default` hasta
      // que terminen de cargar: así la primera medición FLIP nunca queda
      // calibrada contra glifos viejos.
      type: "default",
      requestedType: stored.type,
      typeReady: stored.type === "default",
    };
  });

  const setTheme = useCallback((theme: ThemeId) => {
    setPrefs((current) => ({ ...current, theme }));
  }, []);

  const setFx = useCallback((fx: FxPreset) => {
    setPrefs((current) => {
      // Neon es un efecto de glow: sobre fondo claro es inerte. Al elegirlo se
      // salta a un tema oscuro (el mono, que es el default de siempre); si el
      // tema ya es oscuro se respeta. Después el usuario puede elegir a mano
      // cualquier tema claro y Neon degrada sin glow (ver FxLayer.css).
      const theme: ThemeId =
        fx === "neon" && themeMeta(current.theme).scheme === "light" ? "mono-dark" : current.theme;
      return { ...current, fx, theme };
    });
  }, []);

  const setType = useCallback((requestedType: TypePreset) => {
    // El Original se aplica en este mismo commit (sin webfonts que esperar),
    // así que la posición de lectura se guarda ya para restaurarla tras el
    // rebuild del timeline — ver src/lib/scroll-anchor.ts.
    if (requestedType === "default") stashScrollAnchor();
    setPrefs((current) => {
      if (requestedType === current.requestedType) return current;
      // Volver al Original no descarga nada: se aplica al toque. Un preset con
      // webfonts espera a que carguen (typeReady=false) para que el cambio de
      // familia y la re-medición de FormulaHero ocurran en el mismo commit.
      const immediate = requestedType === "default";
      return {
        ...current,
        requestedType,
        type: immediate ? requestedType : current.type,
        typeReady: immediate,
      };
    });
  }, []);

  // Carga perezosa de webfonts: cuando termina (o falla, y el stack cae a su
  // fallback), recién ahí se aplica el preset pedido. Sin listener global de
  // FontFaceSet: un rebuild disparado por `loadingdone` durante el arranque
  // rompe el pin de ScrollTrigger.
  useEffect(() => {
    if (prefs.typeReady) return;
    const pending = prefs.requestedType;
    let cancelled = false;
    void loadTypeFonts(pending).then(() => {
      if (cancelled) return;
      // Momento exacto en que se aplica el preset: la posición acá es la que
      // hay que devolver después del rebuild.
      stashScrollAnchor();
      setPrefs((current) =>
        current.requestedType === pending
          ? { ...current, type: pending, typeReady: true }
          : current,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [prefs.requestedType, prefs.typeReady]);

  // Los atributos viven en <html> (igual que data-theme) para que todo el CSS
  // —paletas, estilos por preset, capas de fx— pueda reaccionar sin que ningún
  // componente intermedio tenga que re-renderizar. `data-scheme` se deriva del
  // tema y es lo que consultan FxLayer.css y `color-scheme`.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset["theme"] = prefs.theme;
    root.dataset["scheme"] = themeMeta(prefs.theme).scheme;
    root.dataset["fx"] = prefs.fx;
    root.dataset["type"] = prefs.type;

    try {
      // Se persiste el preset pedido, no el aplicado: al recargar se retoma la
      // intención del usuario y los webfonts se cargan de nuevo.
      const stored: StoredPreferences = {
        theme: prefs.theme,
        fx: prefs.fx,
        type: prefs.requestedType,
      };
      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Sin persistencia — la preferencia igual se aplica en esta sesión.
    }
  }, [prefs.theme, prefs.fx, prefs.type, prefs.requestedType]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      theme: prefs.theme,
      fx: prefs.fx,
      type: prefs.type,
      typeReady: prefs.typeReady,
      setTheme,
      setFx,
      setType,
    }),
    [prefs, setTheme, setFx, setType],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
