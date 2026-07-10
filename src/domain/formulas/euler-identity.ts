import type { Formula } from "../formula.types";

export const eulerIdentity: Formula = {
  id: "euler-identity",
  title: { es: "Identidad de Euler", en: "Euler's Identity" },
  nodes: [
    {
      id: "e",
      type: "variable",
      value: "e",
      explanation: {
        es: "El número de Euler, aproximadamente 2.71828. Base del crecimiento exponencial continuo.",
        en: "Euler's number, approximately 2.71828. The base of continuous exponential growth.",
      },
    },
    {
      id: "i",
      type: "superscript",
      value: "i",
      explanation: {
        es: "La unidad imaginaria: el número tal que i² = −1.",
        en: "The imaginary unit: the number such that i² = −1.",
      },
    },
    {
      id: "pi",
      type: "superscript",
      value: "π",
      explanation: {
        es: "Pi, la razón constante entre la circunferencia de un círculo y su diámetro.",
        en: "Pi, the constant ratio between a circle's circumference and its diameter.",
      },
    },
    {
      id: "plus",
      type: "operator",
      value: "+",
      explanation: {
        es: "Sumado a la unidad.",
        en: "Added to the unit.",
      },
    },
    {
      id: "one",
      type: "number",
      value: "1",
      explanation: {
        es: "La unidad: el primer entero positivo.",
        en: "The unit: the first positive integer.",
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
      id: "zero",
      type: "number",
      value: "0",
      explanation: {
        es: "Cero: el origen, la nada absoluta.",
        en: "Zero: the origin, absolute nothingness.",
      },
    },
  ],
  context: {
    author: { es: "Leonhard Euler", en: "Leonhard Euler" },
    era: {
      es: "Suiza, 1707–1783 · publicada en 1748",
      en: "Switzerland, 1707–1783 · published in 1748",
    },
    history: {
      es: "Euler la presentó en su obra Introductio in analysin infinitorum. La ecuación une, en una sola línea, las cinco constantes más importantes de las matemáticas: 0, 1, e, i y π. El físico Richard Feynman llegó a llamarla 'la fórmula más notable del mundo'.",
      en: "Euler introduced it in his work Introductio in analysin infinitorum. The equation unites, in a single line, mathematics' five most important constants: 0, 1, e, i, and π. Physicist Richard Feynman called it 'the most remarkable formula in the world.'",
    },
  },
};
