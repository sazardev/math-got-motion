import { findSummary, type FormulaSummary } from "./formula-index";

import type { LocalizedText } from "./formula.types";

/**
 * Rutas guiadas de aprendizaje. No son fórmulas nuevas: son recorridos
 * editoriales sobre el catálogo existente. Cada lista se resuelve contra el
 * índice en build/runtime, así un id mal escrito simplemente no aparece (nunca
 * rompe la página) y el orden de la ruta es el orden de lectura.
 */
interface CollectionSeed {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  /** Glifo tipográfico que identifica la ruta — no es un icono ni una imagen. */
  glyph: string;
  formulaIds: readonly string[];
}

export interface Collection extends CollectionSeed {
  formulas: FormulaSummary[];
}

const seeds: readonly CollectionSeed[] = [
  {
    id: "esenciales",
    glyph: "π",
    name: {
      es: "Los esenciales",
      en: "The essentials",
      pt: "Essenciais",
      fr: "L'essentiel",
      zh: "必修公式",
      ja: "定番",
    },
    description: {
      es: "Ocho fórmulas que conviene reconocer de un vistazo.",
      en: "Eight formulas worth recognizing at a glance.",
      pt: "Oito fórmulas que vale reconhecer de relance.",
      fr: "Huit formules qu'il faut savoir reconnaître d'un coup d'œil.",
      zh: "八条一眼就应认出的公式。",
      ja: "ひと目で認識したい八つの公式。",
    },
    formulaIds: [
      "euler-identity",
      "pythagorean-theorem",
      "quadratic-formula",
      "pythagorean-identity",
      "golden-ratio",
      "fibonacci-sequence",
      "bayes-theorem",
      "normal-distribution",
    ],
  },
  {
    id: "calculo",
    glyph: "∫",
    name: {
      es: "Cálculo",
      en: "Calculus",
      pt: "Cálculo",
      fr: "Analyse",
      zh: "微积分",
      ja: "微積分",
    },
    description: {
      es: "De la pendiente instantánea a la serie que lo resume todo.",
      en: "From the instantaneous slope to the series that sums it all up.",
      pt: "Da inclinação instantânea à série que resume tudo.",
      fr: "De la pente instantanée à la série qui résume tout.",
      zh: "从瞬时斜率到概括一切的级数。",
      ja: "瞬間の傾きから、すべてを要約する級数へ。",
    },
    formulaIds: [
      "derivative-definition",
      "fundamental-theorem-of-calculus",
      "chain-rule",
      "product-rule",
      "integration-by-parts",
      "taylor-series",
      "fourier-series",
      "simpsons-rule",
      "lhopitals-rule",
    ],
  },
  {
    id: "fisica-clasica",
    glyph: "F",
    name: {
      es: "Física clásica",
      en: "Classical physics",
      pt: "Física clássica",
      fr: "Physique classique",
      zh: "经典物理",
      ja: "古典物理",
    },
    description: {
      es: "Las leyes que mueven desde una pelota hasta un planeta.",
      en: "The laws that move everything from a ball to a planet.",
      pt: "As leis que movem desde uma bola até um planeta.",
      fr: "Les lois qui font bouger une balle comme une planète.",
      zh: "从一只球到一颗行星的运动定律。",
      ja: "ボールから惑星までを動かす法則。",
    },
    formulaIds: [
      "newtons-second-law",
      "newtons-law-of-gravitation",
      "mass-energy-equivalence",
      "momentum",
      "kinetic-energy",
      "work-energy-theorem",
      "harmonic-oscillator",
      "projectile-range",
      "torque",
    ],
  },
  {
    id: "cosmos",
    glyph: "∞",
    name: {
      es: "Relatividad y cosmos",
      en: "Relativity & cosmos",
      pt: "Relatividade e cosmos",
      fr: "Relativité et cosmos",
      zh: "相对论与宇宙",
      ja: "相対論と宇宙",
    },
    description: {
      es: "Cuando el tiempo se estira y las órbitas deciden.",
      en: "When time stretches and orbits make the call.",
      pt: "Quando o tempo se estica e as órbitas decidem.",
      fr: "Quand le temps s'étire et que les orbites décident.",
      zh: "当时光被拉长，轨道来决定结局。",
      ja: "時間が伸び、軌道が決めるとき。",
    },
    formulaIds: [
      "time-dilation",
      "schwarzschild-radius",
      "twin-paradox-proper-time",
      "vis-viva-equation",
      "chandrasekhar-limit",
      "roche-limit",
      "redshift",
      "hubbles-law",
      "keplers-third-law",
    ],
  },
  {
    id: "datos",
    glyph: "σ",
    name: {
      es: "Datos e incertidumbre",
      en: "Data & uncertainty",
      pt: "Dados e incerteza",
      fr: "Données et incertitude",
      zh: "数据与不确定性",
      ja: "データと不確実性",
    },
    description: {
      es: "Cómo razonar cuando no lo sabes todo.",
      en: "How to reason when you don't know everything.",
      pt: "Como raciocinar quando não se sabe tudo.",
      fr: "Comment raisonner quand on ne sait pas tout.",
      zh: "当你并非全知时，如何推理。",
      ja: "すべてを知らないときの考え方。",
    },
    formulaIds: [
      "bayes-theorem",
      "shannon-entropy",
      "markov-chain",
      "standard-deviation",
      "normal-distribution",
      "binomial-distribution",
      "monty-hall-problem",
      "kolmogorov-complexity",
      "correlation-coefficient",
    ],
  },
  {
    id: "materia",
    glyph: "φ",
    name: {
      es: "Materia y energía",
      en: "Matter & energy",
      pt: "Matéria e energia",
      fr: "Matière et énergie",
      zh: "物质与能量",
      ja: "物質とエネルギー",
    },
    description: {
      es: "Del gas ideal al motor que nunca llega a ser perfecto.",
      en: "From the ideal gas to the engine that is never quite perfect.",
      pt: "Do gás ideal ao motor que nunca é perfeito.",
      fr: "Du gaz parfait au moteur qui n'est jamais tout à fait parfait.",
      zh: "从理想气体到永远无法完美的热机。",
      ja: "理想気体から、決して完璧にならない熱機関へ。",
    },
    formulaIds: [
      "ideal-gas-law",
      "boyles-law",
      "henderson-hasselbalch",
      "molarity",
      "ph-scale",
      "arrhenius-equation",
      "gibbs-free-energy",
      "van-der-waals-equation",
      "carnot-efficiency",
    ],
  },
];

export const collections: readonly Collection[] = seeds.map((seed) => ({
  ...seed,
  formulas: seed.formulaIds
    .map((id) => findSummary(id))
    .filter((summary): summary is FormulaSummary => summary !== undefined),
}));

export function findCollection(id: string | undefined): Collection | undefined {
  return id ? collections.find((collection) => collection.id === id) : undefined;
}
