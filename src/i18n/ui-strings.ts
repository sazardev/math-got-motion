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
  share: string;
  linkCopied: string;
  changelogNav: string;
  changelogTitle: string;
  changelogDescription: string;
  changelogAdded: string;
  changelogChanged: string;
  changelogFixed: string;
  changelogRemoved: string;
  notFoundTitle: string;
  notFoundDescription: string;
  notFoundBackLink: string;
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
    share: "Compartir",
    linkCopied: "Enlace copiado",
    changelogNav: "Novedades",
    changelogTitle: "Novedades",
    changelogDescription: "Qué cambió en Math Got Motion, versión por versión.",
    changelogAdded: "Agregado",
    changelogChanged: "Cambiado",
    changelogFixed: "Arreglado",
    changelogRemoved: "Quitado",
    notFoundTitle: "404",
    notFoundDescription: "No encontramos esta página.",
    notFoundBackLink: "Volver al inicio",
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
    share: "Share",
    linkCopied: "Link copied",
    changelogNav: "Changelog",
    changelogTitle: "Changelog",
    changelogDescription: "What changed in Math Got Motion, version by version.",
    changelogAdded: "Added",
    changelogChanged: "Changed",
    changelogFixed: "Fixed",
    changelogRemoved: "Removed",
    notFoundTitle: "404",
    notFoundDescription: "We couldn't find this page.",
    notFoundBackLink: "Back to home",
  },
};
