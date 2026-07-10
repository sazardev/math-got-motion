import type { Formula } from "../formula.types";

export const eulerIdentity: Formula = {
  id: "euler-identity",
  title: "Identidad de Euler",
  nodes: [
    {
      id: "e",
      type: "variable",
      value: "e",
      explanation:
        "El número de Euler, aproximadamente 2.71828. Base del crecimiento exponencial continuo.",
    },
    {
      id: "i",
      type: "superscript",
      value: "i",
      explanation: "La unidad imaginaria: el número tal que i² = −1.",
    },
    {
      id: "pi",
      type: "superscript",
      value: "π",
      explanation: "Pi, la razón constante entre la circunferencia de un círculo y su diámetro.",
    },
    {
      id: "plus",
      type: "operator",
      value: "+",
      explanation: "Sumado a la unidad.",
    },
    {
      id: "one",
      type: "number",
      value: "1",
      explanation: "La unidad: el primer entero positivo.",
    },
    {
      id: "equals",
      type: "equals",
      value: "=",
      explanation: "Es exactamente igual a.",
    },
    {
      id: "zero",
      type: "number",
      value: "0",
      explanation: "Cero: el origen, la nada absoluta.",
    },
  ],
};
