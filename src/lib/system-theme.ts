import { themes, type ThemeId } from "../preferences/themes";

interface SystemThemeInfo {
  name: string;
  mode: string;
  bg: string;
  fg: string;
  accent: string;
}

export interface SystemThemeResult {
  theme: ThemeId;
  scheme: "dark" | "light";
}

function channels(hex: string): [number, number, number] | null {
  const value = hex.trim().replace("#", "");
  if (value.length !== 6) return null;
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  if ([red, green, blue].some((channel) => Number.isNaN(channel))) return null;
  return [red, green, blue];
}

function distance(a: string, b: string): number {
  const first = channels(a);
  const second = channels(b);
  if (!first || !second) return Number.POSITIVE_INFINITY;
  return (first[0] - second[0]) ** 2 + (first[1] - second[1]) ** 2 + (first[2] - second[2]) ** 2;
}

/** Busca el tema de la app más parecido al tema real de Omarchy. */
function nearestTheme(info: SystemThemeInfo): ThemeId {
  const slug = info.name.replaceAll("_", "-").toLowerCase();
  const exact = themes.find((theme) => theme.id === slug);
  if (exact) return exact.id;

  let best: ThemeId = info.mode === "light" ? "mono-light" : "mono-dark";
  let bestDistance = Number.POSITIVE_INFINITY;

  // Los colores canónicos viven solo en CSS. Se montan todas las paletas de
  // una vez y se leen en una sola pasada: mutar data-theme y medir en cada
  // iteración obligaría al navegador a recalcular estilos 109 veces en el
  // arranque (un long task innecesario, peor aún en móvil).
  const probes = themes.map((theme) => {
    const element = document.createElement("div");
    element.dataset["theme"] = theme.id;
    return { id: theme.id, element };
  });
  const fragment = document.createDocumentFragment();
  for (const probe of probes) fragment.append(probe.element);
  document.documentElement.append(fragment);
  for (const probe of probes) {
    const style = globalThis.getComputedStyle(probe.element);
    const metric =
      distance(info.accent, style.getPropertyValue("--accent")) +
      distance(info.bg, style.getPropertyValue("--bg"));
    if (metric < bestDistance) {
      bestDistance = metric;
      best = probe.id;
    }
  }
  for (const probe of probes) probe.element.remove();
  return best;
}

/**
 * Detecta el tema del sistema. En Tauri sobre Omarchy lee el `colors.toml`
 * real a través del backend; en la web (o fuera de Omarchy) cae al esquema
 * claro/oscuro del SO. Nunca sobrescribe una elección explícita del usuario.
 */
export async function detectSystemTheme(): Promise<SystemThemeResult> {
  if ("__TAURI_INTERNALS__" in globalThis) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const info = await invoke<SystemThemeInfo | null>("detect_system_theme");
      if (info)
        return { theme: nearestTheme(info), scheme: info.mode === "light" ? "light" : "dark" };
    } catch {
      // App vieja sin el comando, o Tauri no disponible: sigue el esquema del SO.
    }
  }

  const light = globalThis.matchMedia("(prefers-color-scheme: light)").matches;
  return { theme: light ? "mono-light" : "mono-dark", scheme: light ? "light" : "dark" };
}
