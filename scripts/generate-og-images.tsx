import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Resvg } from "@resvg/resvg-js";
import React from "react";
import satori from "satori";

import { loadValidFormulas } from "./lib/load-formulas";
import { locales, type Locale } from "../src/i18n/locale";

import type { Formula } from "../src/domain/formula.types";

// Genera una imagen de vista previa (Open Graph/Twitter) por fórmula x
// idioma: el mismo diseño monocromático y tipográfico del hero (la
// ecuación en JetBrains Mono como elemento gigante), así que compartir
// "Identidad de Euler" y "Segunda Ley de Newton" se ve reconociblemente
// distinto en cada preview, no una imagen genérica repetida.

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FORMULAS_DIR = path.join(ROOT, "src/domain/formulas");
const OUT_DIR = path.join(ROOT, "dist/og");
const FONT_DIR = path.join(ROOT, "node_modules/@fontsource/jetbrains-mono/files");

// Las fórmulas usan letras griegas (π, θ, λ, μ, ρ, σ, φ, ψ, ζ, Δ, Σ) y
// caracteres latinos extendidos (Ĥ, ħ) además de latín básico — @fontsource
// reparte esos rangos en subsets .woff separados, así que hay que cargar
// los tres y encadenarlos como fallback de font-family, o esos glifos
// aparecen como tofu boxes en vez del símbolo real.
const FONT_SUBSETS = ["latin", "latin-ext", "greek"] as const;
const fontFamilyStack = FONT_SUBSETS.map((subset) => `JetBrains Mono ${subset}`).join(", ");

const fonts = FONT_SUBSETS.flatMap((subset) => [
  {
    name: `JetBrains Mono ${subset}`,
    data: readFileSync(path.join(FONT_DIR, `jetbrains-mono-${subset}-400-normal.woff`)),
    weight: 400 as const,
    style: "normal" as const,
  },
  {
    name: `JetBrains Mono ${subset}`,
    data: readFileSync(path.join(FONT_DIR, `jetbrains-mono-${subset}-700-normal.woff`)),
    weight: 700 as const,
    style: "normal" as const,
  },
]);

function equationFontSize(equation: string): number {
  if (equation.length > 24) return 64;
  if (equation.length > 16) return 84;
  if (equation.length > 10) return 104;
  return 130;
}

async function renderOgSvg(formula: Formula, locale: Locale): Promise<string> {
  const plainEquation = formula.nodes.map((node) => node.value).join("");

  return satori(
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "28px",
        background: "#000000",
        color: "#ffffff",
        fontFamily: fontFamilyStack,
        padding: "80px",
      }}
    >
      <div
        style={{
          fontSize: "28px",
          letterSpacing: "4px",
          textTransform: "uppercase",
          opacity: 0.55,
        }}
      >
        {formula.category[locale]}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-end",
          fontSize: `${String(equationFontSize(plainEquation))}px`,
          fontWeight: 700,
        }}
      >
        {formula.nodes.map((node, index) => (
          <span
            key={node.id}
            style={
              node.type === "superscript"
                ? { fontSize: "0.55em", alignSelf: "flex-start", marginLeft: "4px" }
                : { marginLeft: index === 0 ? "0" : "16px" }
            }
          >
            {node.value}
          </span>
        ))}
      </div>
      <div style={{ fontSize: "40px", opacity: 0.85, textAlign: "center" }}>
        {formula.title[locale]}
      </div>
    </div>,
    { width: 1200, height: 630, fonts },
  );
}

async function main() {
  const formulas = loadValidFormulas(FORMULAS_DIR);
  mkdirSync(OUT_DIR, { recursive: true });

  let count = 0;
  for (const formula of formulas) {
    for (const locale of locales) {
      const svg = await renderOgSvg(formula, locale);
      const png = new Resvg(svg).render().asPng();
      writeFileSync(path.join(OUT_DIR, `${formula.id}-${locale}.png`), png);
      count += 1;
    }
  }

  console.log(`Generated ${String(count)} OG image(s) in dist/og/`);
}

await main();
