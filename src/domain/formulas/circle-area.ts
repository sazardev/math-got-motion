import type { Formula } from "../formula.types";

export const circleArea: Formula = {
  id: "circle-area",
  title: { es: "Área del Círculo", en: "Area of a Circle" },
  nodes: [
    {
      id: "area",
      type: "variable",
      value: "A",
      explanation: {
        es: "El área: la superficie total que ocupa el círculo.",
        en: "The area: the total surface the circle occupies.",
      },
    },
    {
      id: "equals",
      type: "equals",
      value: "=",
      explanation: {
        es: "Es exactamente igual a.",
        en: "Is exactly equal to.",
      },
    },
    {
      id: "pi",
      type: "constant",
      value: "π",
      explanation: {
        es: "Pi, la razón constante entre la circunferencia de un círculo y su diámetro.",
        en: "Pi, the constant ratio between a circle's circumference and its diameter.",
      },
    },
    {
      id: "r",
      type: "variable",
      value: "r",
      explanation: {
        es: "El radio: la distancia entre el centro del círculo y su borde.",
        en: "The radius: the distance from the circle's center to its edge.",
      },
    },
    {
      id: "r-sq",
      type: "superscript",
      value: "2",
      explanation: {
        es: "Elevado al cuadrado: multiplicado por sí mismo.",
        en: "Squared: multiplied by itself.",
      },
    },
  ],
  context: {
    author: { es: "Arquímedes de Siracusa", en: "Archimedes of Syracuse" },
    era: {
      es: "Siracusa, Sicilia, c. 287–212 a.C.",
      en: "Syracuse, Sicily, c. 287–212 BC",
    },
    history: {
      es: "En su tratado Sobre la medida del círculo, Arquímedes demostró esta fórmula con el método de exhausción, aproximando el círculo con polígonos de cada vez más lados. Sentó las bases de lo que siglos después sería el cálculo integral.",
      en: "In his treatise Measurement of a Circle, Archimedes proved this formula using the method of exhaustion, approximating the circle with polygons of ever more sides. It laid groundwork for what would, centuries later, become integral calculus.",
    },
  },
};
