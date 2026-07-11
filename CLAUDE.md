# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Math Got Motion: a multiplatform app (web, desktop, mobile via Tauri v2) that explains
mathematical theorems through a monochrome, purely typographic scrollytelling experience.
Scroll acts as a timeline: a formula's symbols separate one at a time, each isolated symbol
gets a typographic explanation, and an epilogue reveals the formula's history, timeline,
real-world use cases, and a worked example. See `SPEC.md` and `DESIGN.md` for the full
product/design-system rules — read them before changing animation or visual behavior.

On the web (GitHub Pages), it's also an SEO-first, per-formula-shareable site: every formula
has its own indexable, prerendered URL. See "Routing & URLs" and "SEO & prerendering" below
before changing anything route- or head-tag-related.

## Commands

```bash
pnpm dev                    # Vite dev server (http://localhost:1420)
pnpm tauri:dev              # Desktop app, hot-reloading

pnpm typecheck              # tsc --noEmit
pnpm lint                   # ESLint over src/**/*.{ts,tsx} and scripts/**/*.{ts,tsx}
pnpm lint:fix
pnpm format                 # Prettier --write
pnpm format:check
pnpm formulas:validate      # Validate every formula YAML file against the Zod schema
pnpm check:all              # typecheck + lint + format:check + formulas:validate — run before committing
pnpm check:everything       # check:all + rust:check

pnpm build                  # tsc && vite build (client-only SPA bundle)
pnpm generate-og            # Render dist/og/{formula-id}-{locale}.png (Open Graph images)
pnpm generate-sitemap       # Write dist/sitemap.xml + dist/robots.txt
pnpm prerender              # Snapshot every route to static dist/**/index.html (needs a prior `pnpm build`)
pnpm build:web              # build + generate-og + generate-sitemap + prerender, in order — what CI/deploy runs
pnpm changelog:sync         # Regenerate CHANGELOG.md from src/domain/changelog.yaml
pnpm tauri:build            # Desktop installers

pnpm rust:check             # rust:fmt:check + rust:clippy + rust:audit + rust:deny
```

There is no test framework configured yet (no `test` script, no Vitest/Jest). Don't invent
test commands or assume tests exist.

CI (`.github/workflows/ci.yml`) runs `typecheck`, `lint`, `format:check`, and
`formulas:validate` on every push/PR, plus a separate Rust lint/audit job and a Tauri build
matrix (Linux/Windows/macOS). A broken formula file fails CI the same way a lint error does.
`.github/workflows/deploy-pages.yml` installs a Playwright Chromium and runs `pnpm build:web`
(not plain `pnpm build`) before uploading to GitHub Pages — skipping straight to `pnpm build`
there would ship a site with no sitemap, no OG images, and no prerendered content.

## Architecture

### Domain layer: formulas are data, not code

A formula is fully described by the `Formula` type/schema in `src/domain/formula.types.ts`,
defined with **Zod** (not just TypeScript interfaces) so shape and content are validated at
runtime, not only at compile time. Every text field has a length cap tied to the scroll
choreography (see below) — content that's too long fails validation before it can break the
pinned-scroll layout.

Each formula lives in its own **YAML** file under `src/domain/formulas/*.yaml` — deliberately
data-only, not a `.ts` module, so a formula file can never execute code. This matters because
formulas are meant to be easy (and safe) for anyone to contribute, including via external PRs.
Two invariants are enforced by `src/domain/formulas/index.ts` at load time:

- `id` must equal the filename (minus `.yaml`) — this makes duplicate IDs impossible by
  construction, since two files can't share a name in one directory. It's also the URL slug
  (`/:locale/formula/:id`) and the OG image filename (`{id}-{locale}.png`).
- The parsed YAML must satisfy `formulaSchema`.

`index.ts` auto-discovers every `*.yaml` file via `import.meta.glob(["./*.yaml",
"!./_template.yaml"], { eager: true, query: "?raw", import: "default" })`, parses each with
`js-yaml`, and validates with the schema — **adding a formula never requires editing
`index.ts`** or any registry/array. `_template.yaml` (prefix `_`) is excluded from discovery
and is the commented, copy-paste starting point for a new formula.

In dev, an invalid formula file throws immediately with the file name and the exact failing
field. In production it logs to `console.error` and skips the bad file instead of crashing the
whole app. `scripts/validate-formulas.ts` (run via `pnpm formulas:validate`, powered by `tsx`)
runs the same schema check standalone for CI, without booting Vite — it, `generate-og-images.tsx`,
and `generate-sitemap.ts` all load formulas the same way via `scripts/lib/load-formulas.ts`
(`loadFormulaFiles`/`loadValidFormulas`), so there's exactly one place that reads+parses+
validates formula YAML from Node.

When adding or changing a formula, prefer editing/copying the YAML template over touching
`formula.types.ts` — only change the schema when the _shape_ of formula content needs to
change, since every existing YAML file must keep validating against it.

### Routing & URLs

`react-router-dom` (`BrowserRouter`, `basename` from `import.meta.env.BASE_URL`). Every URL is
locale-prefixed — this is required for the hreflang/sitemap setup below, not a style choice:

- `/` → replaces itself with `/${detectInitialLocale()}/` (browser-language redirect).
- `/:locale/` → the default formula's hero (same look as visiting its own `/formula/:id`).
- `/:locale/formula/:formulaId` → that formula's hero.
- `/:locale/changelog` → `ChangelogPage`.
- `*` → `NotFoundPage` (also rendered in place, not via redirect, for a formula id that
  doesn't exist within an otherwise-valid locale).

`src/App.tsx` is the whole route tree: `LocaleLayout` resolves the `:locale` param (redirecting
to a detected locale if it's missing/invalid) and renders `LocaleProvider` + the persistent
chrome (`FormulaMenu`, theme/locale/changelog buttons) around an `<Outlet />`. `LocaleProvider`
(`src/i18n/LocaleContext.tsx`) no longer owns `locale` as internal state — it's now a controlled
component fed by the route param, with `onLocaleChange` wired to `navigate(...)` so switching
language changes the URL (preserving whatever formula/page you're on) instead of only updating
in-memory state. Selecting a formula in `FormulaMenu` likewise navigates rather than calling
`setState`.

### SEO & prerendering

The site is a client-rendered SPA, but GitHub Pages is static hosting with no server — so
crawlers/AI scrapers that don't execute JS would otherwise see an empty `<div id="root">`.
Two pieces solve this together, both driven by real formula data (nothing hand-authored per
page):

- **`src/hooks/useSeo.ts`**: a small custom hook (no `react-helmet`-style dependency) called
  from `FormulaHero.tsx` and `ChangelogPage.tsx`. It sets `document.title`/`lang` and
  upserts (never duplicates) `<meta>`/`<link>`/JSON-LD tags in `<head>` — canonical URL,
  `hreflang` alternates to the sibling-locale page (plus `x-default`), Open Graph/Twitter tags
  pointing at that formula's own OG image, and a `schema.org/Article` JSON-LD block.
- **`scripts/prerender.ts`** (`pnpm prerender`, needs `pnpm build` first): serves the built
  `dist/` via `vite preview`, visits every route with headless Playwright Chromium, and writes
  the resulting `page.content()` to `dist/<route>/index.html`. Because `useSeo` runs on mount
  and only _then_ does the snapshot happen, whatever it wrote to `<head>` ends up baked into
  the static HTML too — there's no separate SSR/head system to keep in sync. `dist/index.html`
  is also copied to `dist/404.html` as an SPA-shell fallback for any URL that isn't one of the
  prerendered ones.
- **`scripts/generate-og-images.tsx`** (`pnpm generate-og`): renders a 1200×630 PNG per
  formula×locale with `satori` + `@resvg/resvg-js` — the formula's own nodes as a giant
  JetBrains Mono equation (loads the `latin`/`latin-ext`/`greek` font subsets specifically,
  since formulas use π/θ/λ/Ĥ/etc. that plain `latin` doesn't cover), so sharing Euler's
  Identity and sharing Newton's Second Law produce visibly different preview cards.
- **`scripts/generate-sitemap.ts`** (`pnpm generate-sitemap`): writes `dist/sitemap.xml` (every
  route, with hreflang alternates) and `dist/robots.txt` (`Allow: /` for `User-agent: *` plus
  explicit `Allow: /` blocks for named AI crawlers — GPTBot, ClaudeBot, PerplexityBot, etc. —
  since most sites block these by default and this one deliberately doesn't).

`src/lib/site.ts` exports `SITE_URL`, the one place the deployed origin is hardcoded; everything
above builds absolute URLs from it rather than each hardcoding the domain separately.

GitHub Pages has no custom `Cache-Control`/`_headers` support (unlike Netlify/Vercel) — "cached
for crawlers" here means prerendered static content, not HTTP cache tuning, which isn't
available on this host.

### Changelog

`src/domain/changelog.yaml` is the source of truth (bilingual, Zod-validated by
`src/domain/changelog.types.ts`, loaded via `src/domain/changelog.ts`), rendered in-app at
`ChangelogPage`. `CHANGELOG.md` at the repo root is a generated, English-only mirror for
developers — run `pnpm changelog:sync` after adding an entry to the YAML; don't hand-edit
`CHANGELOG.md` directly, it'll just get overwritten.

### Presentation layer: FLIP + GSAP ScrollTrigger

- `src/lib/gsap.ts` registers the `ScrollTrigger` plugin once; import `gsap`/`ScrollTrigger`
  from here, not directly from `"gsap"`.
- `src/components/formula-hero/FormulaHero.tsx` is the core scrollytelling component. It:
  1. Renders the formula's nodes in normal document flow (so the browser handles kerning),
  2. Captures each node's on-screen rect with `getBoundingClientRect` in a `useLayoutEffect`
     (the "First" + "Invert" of a manual FLIP — see `DESIGN.md` §4), fixing each node to
     `position: absolute` with inline `top`/`left`/`width`/`height` so nothing shifts visually
     but GSAP is now free to animate `transform` without triggering layout,
  3. Builds one GSAP timeline per formula inside `useGSAP` (scope: the hero section), pinned
     and `scrub`-linked to `ScrollTrigger`, that: spreads the nodes apart, isolates each node
     one at a time (dim the others, scale up the isolated one, fade its explanation
     in/out), then shrinks the formula into a header and reveals four **epilogue panels**
     in sequence — History → Timeline → Use cases → Worked example → Share/back links —
     each with its own stagger-in/hold/stagger-out choreography before the next panel begins.
  - Panel timing is **computed from content length**, not hardcoded: `panelInDuration` and
    `panelOutDuration` account for GSAP's `stagger` extending a tween's effective duration
    (a common source of bugs — the out-animation duration must add the stagger spread, or
    the next panel starts before the previous one finishes fading, causing visible overlap).
  - Layout re-measures on resize/orientation change (`layoutVersion` state) by first clearing
    any GSAP-applied inline transform (`clearProps: "all"`) before re-measuring.
  - The **share button** uses `navigator.share` when available, falling back to
    `navigator.clipboard.writeText` on the current canonical URL with a brief "copied"
    confirmation — no third-party share widget.
- `src/components/formula-menu/FormulaMenu.tsx` is a searchable formula index, not a list that
  grows unboundedly: a small fixed trigger button opens a full-screen overlay that groups
  formulas by `category` (alphabetically), filters live by title as you type (accent-
  insensitive), and scrolls internally — this is what lets the formula count scale.

### Rules that apply project-wide (from `SPEC.md` / `DESIGN.md`)

- **Only animate `transform` (`x`, `y`, `scale`, `rotate`) and `opacity`** with GSAP. Never
  animate `width`, `height`, `margin`, `top`, `left`, or anything else that triggers layout —
  this is the reason the FLIP pattern above exists at all.
  - Everything animation-related must use `@gsap/react`'s `useGSAP` hook with a `scope`, never
    a plain `useEffect` — this is what handles ScrollTrigger/timeline cleanup on unmount.
- **Strictly monochrome**: pure black/white only (`--bg`/`--fg` CSS variables, toggled via
  `data-theme` on `<html>`), no grays, no shadows, no borders/dividing lines, no images, icons,
  or emoji. If something needs a visual marker, it's built typographically (numbers, spacing,
  weight/opacity contrast) — not a drawn shape.
- **No LaTeX renderer** (KaTeX/MathJax): formulas are a custom AST of typed nodes
  (`FormulaNode`), each rendered as an independent element React owns and GSAP animates via
  refs. This was a deliberate architecture decision (see `GSAP-PROBLEM.md`) to avoid deeply
  nested, animation-hostile markup and to keep the explanation text co-located with its symbol
  in the same data node.
- Fonts: JetBrains Mono for formulas/mono UI chrome, General Sans for prose (see the
  self-hosting note in `src/index.css`).

### i18n

`src/i18n/` — `Locale` is `"es" | "en"`. The locale for a given page comes from its `:locale`
URL segment (see "Routing & URLs"), not from browser detection alone — `detectInitialLocale()`
is only used to pick where `/` redirects to. All user-facing strings go through `ui-strings.ts`
(`UiStrings` type); all formula content is bilingual `{ es, en }` (`LocalizedText`) enforced by
the Zod schema itself, not just by convention.

### Node scripts vs. the app's TypeScript project

`src/` is typechecked/linted against the root `tsconfig.json`. `scripts/**` (plain Node/`tsx`
CLI tools — validate, prerender, OG/sitemap generation) is a separate project,
`tsconfig.node.json` (also covers `vite.config.ts`), with its own `jsx`/`target` settings since
`generate-og-images.tsx` needs real JSX for `satori`. `pnpm typecheck` only checks the root
config's `src/` — `scripts/` type-safety comes from `pnpm lint`, whose ESLint `projectService`
does type-aware checking against whichever tsconfig actually covers the file. Scripts get a
dedicated ESLint override (`eslint.config.js`) allowing `console.log`/`process.exit`, which are
normal there and not app-code smells.
