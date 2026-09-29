import { useSyncExternalStore } from "react";

/**
 * Biblioteca personal del usuario: fórmulas guardadas y recientes. Vive en
 * localStorage (`mgm:library`) y se expone como store externo para que cada
 * pantalla se actualice sin un provider más en el árbol.
 */
interface Library {
  saved: string[];
  recent: string[];
}

const STORAGE_KEY = "mgm:library";
const RECENT_LIMIT = 12;
const EMPTY: Library = { saved: [], recent: [] };

function read(): Library {
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Library>;
    const ids = (value: unknown) =>
      Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
    return { saved: ids(parsed.saved), recent: ids(parsed.recent) };
  } catch {
    return EMPTY;
  }
}

let snapshot: Library = read();
const listeners = new Set<() => void>();

function commit(next: Library) {
  snapshot = next;
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Almacenamiento no disponible (modo privado): la sesión sigue en memoria.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function toggleSaved(id: string) {
  const saved = snapshot.saved.includes(id)
    ? snapshot.saved.filter((item) => item !== id)
    : [id, ...snapshot.saved];
  commit({ ...snapshot, saved });
}

export function markRecent(id: string) {
  if (snapshot.recent[0] === id) return;
  commit({
    ...snapshot,
    recent: [id, ...snapshot.recent.filter((item) => item !== id)].slice(0, RECENT_LIMIT),
  });
}

export function useLibrary(): Library {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => EMPTY,
  );
}
