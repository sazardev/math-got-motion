import type { Formula } from "../formula.types";

export const newtonsSecondLaw: Formula = {
  id: "newtons-second-law",
  title: { es: "Segunda Ley de Newton", en: "Newton's Second Law" },
  nodes: [
    {
      id: "f",
      type: "variable",
      value: "F",
      explanation: {
        es: "La fuerza neta que actúa sobre un objeto.",
        en: "The net force acting on an object.",
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
      id: "m",
      type: "variable",
      value: "m",
      explanation: {
        es: "La masa del objeto: cuánta materia contiene.",
        en: "The object's mass: how much matter it contains.",
      },
    },
    {
      id: "a",
      type: "variable",
      value: "a",
      explanation: {
        es: "Multiplicada por la aceleración: el cambio de velocidad en el tiempo.",
        en: "Multiplied by acceleration: the rate of change of velocity over time.",
      },
    },
  ],
  context: {
    author: { es: "Isaac Newton", en: "Isaac Newton" },
    era: {
      es: "Inglaterra, 1642–1727 · publicada en 1687",
      en: "England, 1642–1727 · published in 1687",
    },
    history: {
      es: "Newton la publicó en Philosophiæ Naturalis Principia Mathematica, junto a sus otras dos leyes del movimiento. Es una de las ecuaciones más influyentes de la historia: describe cómo se mueve todo, desde una manzana hasta un planeta.",
      en: "Newton published it in Philosophiæ Naturalis Principia Mathematica, alongside his other two laws of motion. It is one of the most influential equations in history, describing how everything moves — from an apple to a planet.",
    },
  },
};
