import type { Locale } from "./locale";

export interface UiStrings {
  scrollHint: string;
  themeToLight: string;
  themeToDark: string;
  menuTitle: string;
  backToFormula: string;
}

export const uiStrings: Record<Locale, UiStrings> = {
  es: {
    scrollHint: "Scroll para deconstruir la fórmula",
    themeToLight: "Claro",
    themeToDark: "Oscuro",
    menuTitle: "Fórmulas",
    backToFormula: "Volver a la fórmula",
  },
  en: {
    scrollHint: "Scroll to deconstruct the formula",
    themeToLight: "Light",
    themeToDark: "Dark",
    menuTitle: "Formulas",
    backToFormula: "Back to the formula",
  },
};
