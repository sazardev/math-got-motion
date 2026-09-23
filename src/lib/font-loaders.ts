import type { TypePreset } from "../preferences/preferences-context";

type FontLoader = () => Promise<unknown>;

/*
 * Cada preset carga sus webfonts on-demand (import dinámico → Vite code-splitea
 * el CSS de @fontsource). El preset `default` no importa nada: el primer render
 * sigue siendo JetBrains Mono + General Sans y no se descarga una fuente de más.
 * Después del import se fuerza la descarga con document.fonts.load(), así el
 * evento `loadingdone` de FontFaceSet llega en un momento predecible y
 * FormulaHero puede re-medir el FLIP.
 */
const loaders: Record<TypePreset, FontLoader | null> = {
  default: null,
  classic: async () => {
    await Promise.all([
      document.fonts.load('1em "Latin Modern Math"'),
      document.fonts.load('1em "Latin Modern Roman"'),
    ]);
  },
  editorial: async () => {
    await Promise.all([
      import("@fontsource/stix-two-text/400.css"),
      import("@fontsource/stix-two-text/600.css"),
      import("@fontsource/stix-two-text/700.css"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "STIX Two Text"'),
      document.fonts.load('1em "STIX Two Math"'),
    ]);
  },
  modern: async () => {
    await Promise.all([
      import("@fontsource-variable/space-grotesk"),
      import("@fontsource/ibm-plex-mono/400.css"),
      import("@fontsource/ibm-plex-mono/500.css"),
      import("@fontsource/ibm-plex-mono/700.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "IBM Plex Mono"'),
      document.fonts.load('1em "Space Grotesk Variable"'),
    ]);
  },
  terminal: async () => {
    await Promise.all([
      import("@fontsource/space-mono/400.css"),
      import("@fontsource/space-mono/700.css"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Space Mono"'),
      document.fonts.load('1em "STIX Two Math"'),
    ]);
  },
};

const requested = new Set<TypePreset>();

/** Idempotente por preset; nunca rechaza (sin red se usa el fallback del stack). */
export async function loadTypeFonts(type: TypePreset): Promise<void> {
  const loader = loaders[type];
  if (!loader || requested.has(type)) return;
  requested.add(type);
  try {
    await loader();
  } catch {
    // Import o descarga fallida — el stack de fuentes resuelve con lo que haya.
  }
}
