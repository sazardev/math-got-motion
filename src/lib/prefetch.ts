import { neighborsOf } from "../domain/formula-index";
import { loadFormula } from "../domain/formulas";

import type { Locale } from "../i18n/locale";

/*
 * Precarga de datos en dos niveles:
 *
 *  1. Por intención (hover/foco en una tarjeta): la fórmula elegida suele
 *     descargarse antes de que termine el clic, así que el hero no muestra
 *     skeleton. `loadFormula` ya cachea el Promise: llamarlo dos veces no
 *     duplica la petición.
 *  2. En idle, apenas entra una fórmula: sus vecinas de categoría. El swipe y
 *     las flechas ←/→ son el recorrido normal y deben sentirse instantáneos.
 *
 * Nada de esto descarga el catálogo completo: solo lo que el usuario señaló o
 * lo que va a recorrer con probabilidad alta.
 */

type IdleCallback = (deadline: { didTimeout: boolean; timeRemaining(): number }) => void;

interface IdleCapableWindow {
  requestIdleCallback?: (callback: IdleCallback, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
}

/** Programa trabajo en idle con fallback para Safari/Firefox y Tauri. */
function whenIdle(task: () => void, timeout = 1200): () => void {
  const win = globalThis as unknown as IdleCapableWindow;
  if (typeof win.requestIdleCallback === "function") {
    const handle = win.requestIdleCallback(
      () => {
        task();
      },
      { timeout },
    );
    return () => win.cancelIdleCallback?.(handle);
  }
  const handle = globalThis.setTimeout(task, 120);
  return () => {
    globalThis.clearTimeout(handle);
  };
}

interface NetworkCapabilities {
  connection?: {
    saveData?: boolean;
    effectiveType?: string;
  };
}

/** En datos medidos (modo ahorro o 2G) no gastamos red en precarga. */
function mayPrefetch(): boolean {
  const connection = (globalThis.navigator as unknown as NetworkCapabilities).connection;
  if (!connection) return true;
  return connection.saveData !== true && !(connection.effectiveType ?? "").includes("2g");
}

/** Precarga el YAML de una fórmula. Silencioso: la carga real ya reporta errores. */
export function prefetchFormula(id: string): void {
  if (!mayPrefetch()) return;
  void loadFormula(id).catch(() => {
    // La navegación real reintentará y decidirá si es "no encontrada".
  });
}

/** Precarga las dos fórmulas vecinas cuando el navegador esté desocupado. */
export function prefetchNeighbors(id: string, locale: Locale): () => void {
  return whenIdle(() => {
    const neighbors = neighborsOf(id, locale);
    if (!neighbors) return;
    prefetchFormula(neighbors.prev.id);
    prefetchFormula(neighbors.next.id);
  });
}
