import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { loadValidFormulas } from "./lib/load-formulas";
import { locales } from "../src/i18n/locale";

// Después de `vite build`, sirve el bundle localmente y visita cada ruta con
// un Chromium headless para guardar el HTML ya renderizado — así GitHub
// Pages (hosting puramente estático) sirve contenido completo a cualquier
// crawler que no ejecute JavaScript, en vez de un <div id="root"></div>
// vacío. React ya escribe el texto de cada nodo/explicación al montar (GSAP
// solo anima transform/opacity, nunca inyecta texto), así que una foto justo
// después del montaje alcanza para capturar el contenido completo.

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FORMULAS_DIR = path.join(ROOT, "src/domain/formulas");
const DIST_DIR = path.join(ROOT, "dist");
const PORT = 4319;
// Debe coincidir con el `base` que vite.config.ts usó para el build que se
// está pre-renderizando (mismo env var, misma decisión).
const BASE_PREFIX = process.env.GITHUB_PAGES === "true" ? "/math-got-motion" : "";

interface Route {
  routePath: string;
  waitSelector: string;
}

function buildRoutes(): Route[] {
  const formulas = loadValidFormulas(FORMULAS_DIR);
  const routes: Route[] = [];

  for (const locale of locales) {
    routes.push({ routePath: `/${locale}/`, waitSelector: ".home" });
    for (const formula of formulas) {
      routes.push({
        routePath: `/${locale}/formula/${formula.id}`,
        waitSelector: ".hero__formula",
      });
    }
    routes.push({ routePath: `/${locale}/changelog`, waitSelector: ".changelog" });
  }

  return routes;
}

async function waitForServer(url: string, timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    try {
      await fetch(url);
      return;
    } catch {
      if (Date.now() > deadline) throw new Error(`Timed out waiting for ${url}`);
      await new Promise((resolve) => {
        setTimeout(resolve, 300);
      });
    }
  }
}

async function main() {
  const previewProcess = spawn(
    "pnpm",
    ["exec", "vite", "preview", "--port", String(PORT), "--strictPort"],
    {
      cwd: ROOT,
      stdio: "inherit",
    },
  );
  const stopPreview = () => {
    previewProcess.kill();
  };
  process.on("exit", stopPreview);

  try {
    const baseUrl = `http://localhost:${String(PORT)}${BASE_PREFIX}`;
    await waitForServer(`${baseUrl}/`);

    const browser = await chromium.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();
    const routes = buildRoutes();

    for (const route of routes) {
      await page.goto(`${baseUrl}${route.routePath}`, { waitUntil: "networkidle" });
      await page.waitForSelector(route.waitSelector);
      const html = await page.content();

      const outDir = path.join(DIST_DIR, route.routePath.replace(/^\//, ""));
      mkdirSync(outDir, { recursive: true });
      writeFileSync(path.join(outDir, "index.html"), html);
    }

    await browser.close();
    console.log(`Prerendered ${String(routes.length)} route(s).`);

    const shellPath = path.join(DIST_DIR, "index.html");
    if (existsSync(shellPath)) {
      copyFileSync(shellPath, path.join(DIST_DIR, "404.html"));
      console.log("Copied dist/index.html -> dist/404.html (SPA fallback).");
    }
  } finally {
    stopPreview();
  }
}

await main();
