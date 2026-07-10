import type { Formula } from "../formula.types";

export const pythagoreanTheorem: Formula = {
  id: "pythagorean-theorem",
  title: { es: "Teorema de Pitágoras", en: "Pythagorean Theorem" },
  nodes: [
    {
      id: "a",
      type: "variable",
      value: "a",
      explanation: {
        es: "El cateto a: uno de los dos lados que forman el ángulo recto.",
        en: "Leg a: one of the two sides that form the right angle.",
      },
    },
    {
      id: "a-sq",
      type: "superscript",
      value: "2",
      explanation: {
        es: "Elevado al cuadrado: multiplicado por sí mismo.",
        en: "Squared: multiplied by itself.",
      },
    },
    {
      id: "plus",
      type: "operator",
      value: "+",
      explanation: {
        es: "Sumado al cuadrado del otro cateto.",
        en: "Added to the square of the other leg.",
      },
    },
    {
      id: "b",
      type: "variable",
      value: "b",
      explanation: {
        es: "El cateto b: el segundo lado que forma el ángulo recto.",
        en: "Leg b: the second side that forms the right angle.",
      },
    },
    {
      id: "b-sq",
      type: "superscript",
      value: "2",
      explanation: {
        es: "También elevado al cuadrado.",
        en: "Also squared.",
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
      id: "c",
      type: "variable",
      value: "c",
      explanation: {
        es: "La hipotenusa: el lado opuesto al ángulo recto, siempre el más largo.",
        en: "The hypotenuse: the side opposite the right angle, always the longest.",
      },
    },
    {
      id: "c-sq",
      type: "superscript",
      value: "2",
      explanation: {
        es: "También elevada al cuadrado.",
        en: "Also squared.",
      },
    },
  ],
  context: {
    author: { es: "Pitágoras de Samos", en: "Pythagoras of Samos" },
    era: {
      es: "Samos, Grecia, c. 570–495 a.C.",
      en: "Samos, Greece, c. 570–495 BC",
    },
    history: {
      es: "Babilonios y egipcios ya usaban esta relación en la práctica siglos antes, pero se atribuye a Pitágoras y su escuela la primera demostración formal. Sigue siendo uno de los resultados más antiguos y más citados de toda la geometría.",
      en: "Babylonians and Egyptians had already used this relationship in practice centuries earlier, but the first formal proof is attributed to Pythagoras and his school. It remains one of the oldest and most cited results in all of geometry.",
    },
  },
};
