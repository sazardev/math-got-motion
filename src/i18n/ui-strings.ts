import type { Locale } from "./locale";

export interface UiStrings {
  scrollHint: string;
  themeToLight: string;
  themeToDark: string;
  menuTitle: string;
  closeMenu: string;
  searchPlaceholder: string;
  noResults: string;
  backToFormula: string;
  historyTitle: string;
  timelineTitle: string;
  useCasesTitle: string;
  exampleTitle: string;
}

export const uiStrings: Record<Locale, UiStrings> = {
  es: {
    scrollHint: "Scroll para deconstruir la fórmula",
    themeToLight: "Claro",
    themeToDark: "Oscuro",
    menuTitle: "Fórmulas",
    closeMenu: "Cerrar",
    searchPlaceholder: "Buscar fórmula…",
    noResults: "Sin resultados",
    backToFormula: "Volver a la fórmula",
    historyTitle: "Historia",
    timelineTitle: "Línea de tiempo",
    useCasesTitle: "Dónde se usa hoy",
    exampleTitle: "Ejemplo resuelto",
  },
  en: {
    scrollHint: "Scroll to deconstruct the formula",
    themeToLight: "Light",
    themeToDark: "Dark",
    menuTitle: "Formulas",
    closeMenu: "Close",
    searchPlaceholder: "Search formulas…",
    noResults: "No results",
    backToFormula: "Back to the formula",
    historyTitle: "History",
    timelineTitle: "Timeline",
    useCasesTitle: "Where it's used today",
    exampleTitle: "Worked example",
  },
};
