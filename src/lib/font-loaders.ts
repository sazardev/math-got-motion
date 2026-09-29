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
  elegant: async () => {
    await Promise.all([
      import("@fontsource/cormorant-garamond/400.css"),
      import("@fontsource/cormorant-garamond/500.css"),
      import("@fontsource/cormorant-garamond/600.css"),
      import("@fontsource/cormorant-garamond/700.css"),
      import("@fontsource/cormorant-garamond/400-italic.css"),
      import("@fontsource/dm-mono/400.css"),
      import("@fontsource/dm-mono/500.css"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Cormorant Garamond"'),
      document.fonts.load('1em "DM Mono"'),
      document.fonts.load('1em "STIX Two Math"'),
    ]);
  },
  fraunces: async () => {
    await Promise.all([
      import("@fontsource-variable/fraunces"),
      import("@fontsource/dm-mono/400.css"),
      import("@fontsource/dm-mono/500.css"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Fraunces Variable"'),
      document.fonts.load('1em "DM Mono"'),
      document.fonts.load('1em "STIX Two Math"'),
    ]);
  },
  code: async () => {
    await Promise.all([
      import("@fontsource-variable/fira-code"),
      import("@fontsource-variable/inter"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Fira Code Variable"'),
      document.fonts.load('1em "Inter Variable"'),
    ]);
  },
  swiss: async () => {
    await Promise.all([
      import("@fontsource-variable/inter"),
      import("@fontsource/dm-mono/400.css"),
      import("@fontsource/dm-mono/500.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Inter Variable"'),
      document.fonts.load('1em "DM Mono"'),
    ]);
  },
  futurist: async () => {
    await Promise.all([
      import("@fontsource-variable/unbounded"),
      import("@fontsource-variable/inter"),
      import("@fontsource-variable/space-grotesk"),
      import("@fontsource/dm-mono/400.css"),
      import("@fontsource/dm-mono/500.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Unbounded Variable"'),
      document.fonts.load('1em "Space Grotesk Variable"'),
      document.fonts.load('1em "DM Mono"'),
    ]);
  },
  roboto: async () => {
    await Promise.all([
      import("@fontsource-variable/roboto-mono"),
      import("@fontsource-variable/roboto"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Roboto Mono Variable"'),
      document.fonts.load('1em "Roboto Variable"'),
    ]);
  },
  sourcecode: async () => {
    await Promise.all([
      import("@fontsource-variable/source-code-pro"),
      import("@fontsource-variable/source-sans-3"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Source Code Pro Variable"'),
      document.fonts.load('1em "Source Sans 3 Variable"'),
    ]);
  },
  plex: async () => {
    await Promise.all([
      import("@fontsource/ibm-plex-mono/400.css"),
      import("@fontsource/ibm-plex-mono/500.css"),
      import("@fontsource/ibm-plex-mono/700.css"),
      import("@fontsource/ibm-plex-sans/400.css"),
      import("@fontsource/ibm-plex-sans/500.css"),
      import("@fontsource/ibm-plex-sans/700.css"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "IBM Plex Mono"'),
      document.fonts.load('1em "IBM Plex Sans"'),
    ]);
  },
  cascadia: async () => {
    await Promise.all([
      import("@fontsource/cascadia-code/400.css"),
      import("@fontsource/cascadia-code/500.css"),
      import("@fontsource/cascadia-code/700.css"),
      import("@fontsource-variable/inter"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Cascadia Code"'),
      document.fonts.load('1em "Inter Variable"'),
    ]);
  },
  geist: async () => {
    await Promise.all([
      import("@fontsource-variable/geist"),
      import("@fontsource-variable/geist-mono"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Geist Mono Variable"'),
      document.fonts.load('1em "Geist Variable"'),
    ]);
  },
  martian: async () => {
    await Promise.all([
      import("@fontsource-variable/martian-mono"),
      import("@fontsource-variable/inter"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Martian Mono Variable"'),
      document.fonts.load('1em "Inter Variable"'),
    ]);
  },
  playfair: async () => {
    await Promise.all([
      import("@fontsource-variable/playfair-display"),
      import("@fontsource/dm-mono/400.css"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Playfair Display Variable"'),
      document.fonts.load('1em "DM Mono"'),
    ]);
  },
  garamond: async () => {
    await Promise.all([
      import("@fontsource-variable/eb-garamond"),
      import("@fontsource/dm-mono/400.css"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "EB Garamond Variable"'),
      document.fonts.load('1em "DM Mono"'),
    ]);
  },
  lora: async () => {
    await Promise.all([
      import("@fontsource-variable/lora"),
      import("@fontsource/dm-mono/400.css"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Lora Variable"'),
      document.fonts.load('1em "DM Mono"'),
    ]);
  },
  crimson: async () => {
    await Promise.all([
      import("@fontsource-variable/crimson-pro"),
      import("@fontsource/dm-mono/400.css"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Crimson Pro Variable"'),
      document.fonts.load('1em "DM Mono"'),
    ]);
  },
  literata: async () => {
    await Promise.all([
      import("@fontsource-variable/literata"),
      import("@fontsource/dm-mono/400.css"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Literata Variable"'),
      document.fonts.load('1em "DM Mono"'),
    ]);
  },
  merriweather: async () => {
    await Promise.all([
      import("@fontsource/merriweather/400.css"),
      import("@fontsource/merriweather/700.css"),
      import("@fontsource/dm-mono/400.css"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Merriweather"'),
      document.fonts.load('1em "DM Mono"'),
    ]);
  },
  baskerville: async () => {
    await Promise.all([
      import("@fontsource/libre-baskerville/400.css"),
      import("@fontsource/libre-baskerville/700.css"),
      import("@fontsource/dm-mono/400.css"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Libre Baskerville"'),
      document.fonts.load('1em "DM Mono"'),
    ]);
  },
  dmserif: async () => {
    await Promise.all([
      import("@fontsource/dm-serif-display/400.css"),
      import("@fontsource/dm-mono/400.css"),
      import("@fontsource-variable/inter"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "DM Serif Display"'),
      document.fonts.load('1em "DM Mono"'),
      document.fonts.load('1em "Inter Variable"'),
    ]);
  },
  montserrat: async () => {
    await Promise.all([
      import("@fontsource-variable/montserrat"),
      import("@fontsource/dm-mono/400.css"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Montserrat Variable"'),
      document.fonts.load('1em "Inter Variable"'),
      document.fonts.load('1em "DM Mono"'),
    ]);
  },
  poppins: async () => {
    await Promise.all([
      import("@fontsource/poppins/400.css"),
      import("@fontsource/poppins/500.css"),
      import("@fontsource/poppins/700.css"),
      import("@fontsource/dm-mono/400.css"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Poppins"'),
      document.fonts.load('1em "Inter Variable"'),
      document.fonts.load('1em "DM Mono"'),
    ]);
  },
  manrope: async () => {
    await Promise.all([
      import("@fontsource-variable/manrope"),
      import("@fontsource/dm-mono/400.css"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Manrope Variable"'),
      document.fonts.load('1em "DM Mono"'),
    ]);
  },
  outfit: async () => {
    await Promise.all([
      import("@fontsource-variable/outfit"),
      import("@fontsource/dm-mono/400.css"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Outfit Variable"'),
      document.fonts.load('1em "Inter Variable"'),
      document.fonts.load('1em "DM Mono"'),
    ]);
  },
  sora: async () => {
    await Promise.all([
      import("@fontsource-variable/sora"),
      import("@fontsource/dm-mono/400.css"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Sora Variable"'),
      document.fonts.load('1em "Inter Variable"'),
      document.fonts.load('1em "DM Mono"'),
    ]);
  },
  bricolage: async () => {
    await Promise.all([
      import("@fontsource-variable/bricolage-grotesque"),
      import("@fontsource/dm-mono/400.css"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Bricolage Grotesque Variable"'),
      document.fonts.load('1em "Inter Variable"'),
      document.fonts.load('1em "DM Mono"'),
    ]);
  },
  orbitron: async () => {
    await Promise.all([
      import("@fontsource-variable/orbitron"),
      import("@fontsource-variable/inter"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Orbitron Variable"'),
      document.fonts.load('1em "Inter Variable"'),
    ]);
  },
  exo: async () => {
    await Promise.all([
      import("@fontsource-variable/exo-2"),
      import("@fontsource/dm-mono/400.css"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Exo 2 Variable"'),
      document.fonts.load('1em "Inter Variable"'),
      document.fonts.load('1em "DM Mono"'),
    ]);
  },
  oswald: async () => {
    await Promise.all([
      import("@fontsource-variable/oswald"),
      import("@fontsource-variable/inter"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Oswald Variable"'),
      document.fonts.load('1em "Inter Variable"'),
    ]);
  },
  bebas: async () => {
    await Promise.all([
      import("@fontsource/bebas-neue/400.css"),
      import("@fontsource-variable/inter"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Bebas Neue"'),
      document.fonts.load('1em "Inter Variable"'),
    ]);
  },
  pixel: async () => {
    await Promise.all([
      import("@fontsource/press-start-2p/400.css"),
      import("@fontsource-variable/inter"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Press Start 2P"'),
      document.fonts.load('1em "Inter Variable"'),
    ]);
  },
  vt323: async () => {
    await Promise.all([
      import("@fontsource/vt323/400.css"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await document.fonts.load('1em "VT323"');
  },
  majormono: async () => {
    await Promise.all([
      import("@fontsource/major-mono-display/400.css"),
      import("@fontsource-variable/inter"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Major Mono Display"'),
      document.fonts.load('1em "Inter Variable"'),
    ]);
  },
  caveat: async () => {
    await Promise.all([
      import("@fontsource-variable/caveat"),
      import("@fontsource/dm-mono/400.css"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Caveat Variable"'),
      document.fonts.load('1em "DM Mono"'),
    ]);
  },
  ubuntu: async () => {
    await Promise.all([
      import("@fontsource/ubuntu-mono/400.css"),
      import("@fontsource/ubuntu-mono/700.css"),
      import("@fontsource/ubuntu/400.css"),
      import("@fontsource/ubuntu/500.css"),
      import("@fontsource/ubuntu/700.css"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Ubuntu Mono"'),
      document.fonts.load('1em "Ubuntu"'),
    ]);
  },
  abril: async () => {
    await Promise.all([
      import("@fontsource/abril-fatface/400.css"),
      import("@fontsource-variable/inter"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Abril Fatface"'),
      document.fonts.load('1em "DM Mono"'),
      document.fonts.load('1em "Inter Variable"'),
    ]);
  },
  syne: async () => {
    await Promise.all([
      import("@fontsource-variable/syne"),
      import("@fontsource-variable/inter"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await Promise.all([
      document.fonts.load('1em "Syne Variable"'),
      document.fonts.load('1em "Inter Variable"'),
    ]);
  },
  typewriter: async () => {
    await Promise.all([
      import("@fontsource/special-elite/400.css"),
      import("@fontsource/stix-two-math/400.css"),
    ]);
    await document.fonts.load('1em "Special Elite"');
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
