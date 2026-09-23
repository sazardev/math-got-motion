# AGENTS.md

Math Got Motion: a multiplatform (web/desktop/mobile, Tauri v2) app that explains math
theorems via monochrome, purely typographic scrollytelling — scroll scrubs a GSAP timeline
that separates a formula's symbols and explains each one. On the web it's an SEO-first,
per-formula-shareable static site on GitHub Pages.

Read `SPEC.md` and `DESIGN.md` before touching animation/visual behavior. `CLAUDE.md` is a
longer, well-maintained companion to this file.

## Commands

```bash
pnpm dev                    # Vite dev server, port 1420 (strictPort) — localhost:1420
pnpm typecheck              # tsc --noEmit over src/ only
pnpm lint                   # ESLint over src/** and scripts/** (type-aware via projectService)
pnpm format:check
pnpm formulas:validate      # Validate every formula YAML against the Zod schema (standalone, no Vite)
pnpm check:all              # typecheck + lint + format:check + formulas:validate — run before committing
pnpm rust:check             # fmt:check + clippy(-D warnings) + audit + deny (in src-tauri)
pnpm build:web              # build + generate-og + generate-sitemap + prerender — what Pages deploy runs
pnpm changelog:sync         # Regenerate CHANGELOG.md from src/domain/changelog.yaml
pnpm build                  # tsc && vite build — NOT sufficient for a Pages deploy
```

- **No test framework exists** — no `test` script, no Vitest/Jest. Don't invent test commands.
- Git hooks (husky): pre-commit runs lint-staged (eslint/prettier/rustfmt); commit-msg runs
  commitlint with conventional commits. Keep commit subjects under 100 chars, lowercase.
- Branch gotcha: the deploy workflow triggers on **`master`** (the default branch); CI runs on
  `master` and `develop`.

## GitHub Pages deploy

- `deploy-pages.yml` sets `GITHUB_PAGES=true`, which switches Vite's `base` from `/` to
  `/math-got-motion/` (see `vite.config.ts`). All URLs in the app flow through
  `import.meta.env.BASE_URL`, never a hardcoded path.
- Deploy runs `pnpm build:web` (prerenders every route to static HTML via headless Playwright
  Chromium) — plain `pnpm build` would ship an empty SPA shell with no sitemap/OG/prerender.
- `src/lib/site.ts`'s `SITE_URL` is the only hardcoded deployed origin. GitHub Pages has no
  `Cache-Control`/`_headers` support; no HTTP cache tuning exists.

## Formulas are data, not code

- Each formula is a YAML file in `src/domain/formulas/*.yaml`, validated at load time by a
  **Zod** schema (`src/domain/formula.types.ts`). Auto-discovered via `import.meta.glob` —
  adding a formula never requires editing a registry. `_template.yaml` is the commented
  starting point and is excluded from discovery.
- `id` must equal the filename minus `.yaml`; it's the URL slug and the OG image filename.
- Content is `LocalizedText`: **all 6 locales** (`es` `en` `pt` `fr` `zh` `ja`) are required,
  enforced by the schema. Change the schema only if the _shape_ of formula content changes.
- `scripts/lib/load-formulas.ts` is the single Node-side reader used by all scripts.

## Architecture rules (from SPEC/DESIGN — violations are real bugs)

- **GSAP: only animate `transform` and `opacity`** — never layout-triggering properties.
  Use `@gsap/react`'s `useGSAP` with a `scope`, never a plain `useEffect`. Import
  `gsap`/`ScrollTrigger` from `src/lib/gsap.ts` (plugin registered once), not `"gsap"`.
  In `FormulaHero`, `useGSAP` **must** pass `revertOnUpdate: true`: with `dependencies` and
  without it, GSAP accumulates the pinned timeline/ScrollTrigger on every rebuild (resize,
  font change) and the formula ends up off-screen.
- **Strictly monochrome by default**, now with opt-in presets: `data-fx`
  (`mono`/`crt`/`vhs`/`neon`) and `data-type` (`default`/`classic`/`editorial`/`modern`/
  `terminal`) live on `<html>`, managed by `src/preferences/` and persisted in
  `localStorage` (`mgm:preferences`). `mono` + `default` is the flat black/white look of
  DESIGN.md; only the explicit non-default presets may use grays/glow/color. Effect layers
  (`src/components/fx/FxLayer.tsx`) follow the same transform/opacity-only rule (CSS
  keyframes included), never `mix-blend-mode`, and respect `prefers-reduced-motion`.
- **Typography roles**: use `--font-formula` / `--font-mono` / `--font-prose` in CSS, never
  hardcoded family stacks. New webfonts load on demand through `src/lib/font-loaders.ts`
  (dynamic imports) — the default preset must stay at zero extra font downloads. After a
  typography rebuild, `takeScrollAnchor()` (`src/lib/scroll-anchor.ts`) restores the reading
  position.
- **No LaTeX renderer** (KaTeX/MathJax): formulas are a custom `FormulaNode` AST rendered as
  React elements GSAP animates via refs (see `GSAP-PROBLEM.md`).
- CJK languages have no word spaces, so text splitting must use `splitWords()` from
  `src/lib/text.ts` (`Intl.Segmenter`-based), not `.split(" ")`.
- i18n strings live in `src/i18n/ui-strings.ts`; the page locale always comes from the
  `:locale` URL segment (locale-prefixed routes are required for hreflang/sitemap).
- Changelog: `src/domain/changelog.yaml` is the source of truth; regenerate `CHANGELOG.md`
  with `pnpm changelog:sync`, never hand-edit it.
- Strict TS config: `verbatimModuleSyntax` (use `import type`), `exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess`, `noUnusedLocals/Parameters`.

## Project layout quirks

- Two TS projects: root `tsconfig.json` covers `src/`; `tsconfig.node.json` covers
  `scripts/**` and `vite.config.ts` (JSX for satori). `pnpm typecheck` only checks `src/` —
  scripts get type safety via `pnpm lint`. `scripts/**` has a dedicated ESLint override
  allowing `console.log`/`process.exit`.
- `scripts/generate-og-images.tsx` renders OG PNGs with satori, which has no OS font
  fallback — the font stack must include latin-ext/greek (π/Ĥ/ψ) and CJK
  (`@fontsource/noto-sans-sc`, `@fontsource/noto-sans-jp`) subsets.
- `src-tauri/` is the Rust shell. `cargo clippy` runs with `-D warnings`; keep it clean.
- `pnpm-workspace.yaml` is empty (`packages: ["*"]`) — effectively a single package.

## Skills

`.agents/skills/` holds the project-relevant skills (GSAP suite, add-formula, frontend-design,
accessibility, seo, tauri-v2, vite). Load `add-formula` when writing formula YAML and
`gsap-*` when doing animation work.
