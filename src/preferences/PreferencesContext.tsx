import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  fxPresets,
  PreferencesContext,
  themes,
  typePresets,
  type FxPreset,
  type PreferencesContextValue,
  type Theme,
  type TypePreset,
} from "./preferences-context";
import { loadTypeFonts } from "../lib/font-loaders";
import { stashScrollAnchor } from "../lib/scroll-anchor";

const STORAGE_KEY = "mgm:preferences";

interface Preferences {
  theme: Theme;
  fx: FxPreset;
  /** Preset tipográfico aplicado — el que `data-type` refleja y consume FormulaHero. */
  type: TypePreset;
  /** Preset pedido por el usuario; puede estar esperando sus webfonts. */
  requestedType: TypePreset;
  /** false mientras los webfonts del preset pedido están en vuelo. */
  typeReady: boolean;
}

interface StoredPreferences {
  theme: Theme;
  fx: FxPreset;
  type: TypePreset;
}

function isTheme(value: unknown): value is Theme {
  return (themes as readonly unknown[]).includes(value);
}

function isFxPreset(value: unknown): value is FxPreset {
  return (fxPresets as readonly unknown[]).includes(value);
}

function isTypePreset(value: unknown): value is TypePreset {
  return (typePresets as readonly unknown[]).includes(value);
}

/** Rota al siguiente elemento de una lista no vacía, volviendo al primero. */
function nextIn<T>(values: readonly [T, ...T[]], current: T): T {
  const index = values.indexOf(current);
  const next = values[(index + 1) % values.length];
  return next ?? values[0];
}

/** Preferencias guardadas, tolerando storage bloqueado o JSON corrupto. */
function readStoredPreferences(): StoredPreferences {
  const defaults: StoredPreferences = { theme: "dark", fx: "mono", type: "default" };

  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return defaults;
    const record = parsed as Record<string, unknown>;
    const theme = record["theme"];
    const fx = record["fx"];
    const type = record["type"];
    return {
      theme: isTheme(theme) ? theme : defaults.theme,
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

  const cycleTheme = useCallback(() => {
    setPrefs((current) => ({ ...current, theme: nextIn(themes, current.theme) }));
  }, []);

  const cycleFx = useCallback(() => {
    setPrefs((current) => {
      const fx = nextIn(fxPresets, current.fx);
      // Neon es un efecto de glow: sobre fondo blanco es inerte. Al elegirlo
      // se acompaña con el cambio a oscuro; después el usuario puede volver
      // a claro a mano (Neon degrada sin glow, ver FxLayer.css).
      const theme: Theme = fx === "neon" && current.theme === "light" ? "dark" : current.theme;
      return { ...current, fx, theme };
    });
  }, []);

  const cycleType = useCallback(() => {
    // Para el caso inmediato (volver a Original) y como red de seguridad del
    // caso async: se ancla la posición de lectura antes de tocar el DOM.
    stashScrollAnchor();
    setPrefs((current) => {
      const requestedType = nextIn(typePresets, current.requestedType);
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
  // rompe el pin de ScrollTrigger (ver PR/notas).
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
  // —incluidos los estilos por preset de index.css y FxLayer.css— pueda
  // reaccionar sin que ningún componente intermedio tenga que re-renderizar.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset["theme"] = prefs.theme;
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
      cycleTheme,
      cycleFx,
      cycleType,
    }),
    [prefs, cycleTheme, cycleFx, cycleType],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
