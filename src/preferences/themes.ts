/**
 * Catálogo de temas de color. Los valores de cada paleta viven en
 * `src/index.css` (`[data-theme="..."]`) — el CSS es la fuente de verdad
 * porque los componentes ya consumen `--bg`/`--fg`/`--accent`, y el exportador
 * de wallpapers lee las variables computadas en runtime. Acá solo vive la
 * metadata que la UI necesita: id, nombre visible y esquema claro/oscuro.
 */

export const themeIds = [
  "mono-dark",
  "mono-light",
  "gruvbox",
  "gruvbox-light",
  "nord",
  "ayu",
  "ayu-mirage",
  "ayu-light",
  "osaka",
  "tokyo-night",
  "catppuccin",
  "rose-pine",
  "rose-pine-dawn",
  "dracula",
  "solarized-dark",
  "solarized-light",
  "everforest",
  "kanagawa",
  "midnight",
  "vaporwave",
  "phosphor",
  "paper",
  "sakura",
  "matcha",
] as const;

export type ThemeId = (typeof themeIds)[number];

export type ColorScheme = "dark" | "light";

export interface ThemeMeta {
  id: ThemeId;
  /** Nombre propio (no se traduce): el tema es una marca, como los presets. */
  name: string;
  scheme: ColorScheme;
}

export const themes: readonly ThemeMeta[] = [
  { id: "mono-dark", name: "Mono Dark", scheme: "dark" },
  { id: "mono-light", name: "Mono Light", scheme: "light" },
  { id: "gruvbox", name: "Gruvbox", scheme: "dark" },
  { id: "gruvbox-light", name: "Gruvbox Light", scheme: "light" },
  { id: "nord", name: "Nord", scheme: "dark" },
  { id: "ayu", name: "Ayu Dark", scheme: "dark" },
  { id: "ayu-mirage", name: "Ayu Mirage", scheme: "dark" },
  { id: "ayu-light", name: "Ayu Light", scheme: "light" },
  { id: "osaka", name: "Osaka", scheme: "dark" },
  { id: "tokyo-night", name: "Tokyo Night", scheme: "dark" },
  { id: "catppuccin", name: "Catppuccin", scheme: "dark" },
  { id: "rose-pine", name: "Rosé Pine", scheme: "dark" },
  { id: "rose-pine-dawn", name: "Rosé Pine Dawn", scheme: "light" },
  { id: "dracula", name: "Dracula", scheme: "dark" },
  { id: "solarized-dark", name: "Solarized Dark", scheme: "dark" },
  { id: "solarized-light", name: "Solarized Light", scheme: "light" },
  { id: "everforest", name: "Everforest", scheme: "dark" },
  { id: "kanagawa", name: "Kanagawa", scheme: "dark" },
  { id: "midnight", name: "Midnight Gold", scheme: "dark" },
  { id: "vaporwave", name: "Vaporwave", scheme: "dark" },
  { id: "phosphor", name: "Phosphor", scheme: "dark" },
  { id: "paper", name: "Paper & Ink", scheme: "light" },
  { id: "sakura", name: "Sakura", scheme: "light" },
  { id: "matcha", name: "Matcha", scheme: "light" },
];

const byId = new Map<ThemeId, ThemeMeta>(themes.map((theme) => [theme.id, theme]));

export function themeMeta(id: ThemeId): ThemeMeta {
  // El mapa se construye desde `themes`, así que todo ThemeId tiene entrada.
  return byId.get(id) ?? { id: "mono-dark", name: "Mono Dark", scheme: "dark" };
}

export function isThemeId(value: unknown): value is ThemeId {
  return (themeIds as readonly unknown[]).includes(value);
}
