/*
 * Iconos mínimos de la barra de navegación: trazo fino con currentColor,
 * sin relleno — la única excepción a "cero íconos" (ver DESIGN.md §3).
 */
const common = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function HomeIcon() {
  return (
    <svg aria-hidden="true" {...common}>
      <path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg aria-hidden="true" {...common}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

export function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg aria-hidden="true" {...common} fill={filled ? "currentColor" : "none"}>
      <path d="M6.5 4h11v16.5L12 16.5l-5.5 4z" />
    </svg>
  );
}

export function SlidersIcon() {
  return (
    <svg aria-hidden="true" {...common}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </svg>
  );
}
