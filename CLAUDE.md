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
- `/:locale/` → `HomePage` — the app's entrance/landing: an autoplay GSAP teaser (the flagship
  formula's symbols separate and reassemble in a loop, no scroll — same visual language as
  `FormulaHero`'s "Despegue" state, just not scroll-scrubbed), live counts (formula/category/
  language totals, read from `formulas`/`locales` at render time, not hardcoded), the scroll
  choreography explained step by step, and a "how to contribute" CTA linking to `REPO_URL`
  (`src/lib/site.ts`). An "Explorar fórmulas"-style button jumps straight into the flagship
  formula's hero. This used to redirect straight into the default formula's hero; formulas now
  only live at their own `/formula/:id` URL.
- `/:locale/formula/:formulaId` → that formula's hero.
- `/:locale/formula/:formulaId/export` → `ExportPage`, the wallpaper exporter for that formula
  (not prerendered or in the sitemap; its canonical points at the formula page).
- `/:locale/changelog` → `ChangelogPage`.
- `*` → `NotFoundPage` (also rendered in place, not via redirect, for a formula id that
  doesn't exist within an otherwise-valid locale).

`src/App.tsx` is the whole route tree: `LocaleLayout` resolves the `:locale` param (redirecting
to a detected locale if it's missing/invalid) and renders `LocaleProvider` + the persistent
chrome (`FormulaMenu`, the effect/font/theme/locale mini-menus from
`src/components/preference-pickers/PreferencePickers.tsx`, and export/home/changelog nav)
around an `<Outlet />`. Each picker's button shows only the active value ("Mono", "Nord",
"ES") — no "Label:" prefix — and opens a `ControlMenu` list to choose directly
(`setFx`/`setType`/`setTheme`/`setLocale`; there are no cycle-through setters anymore).
`PreferencesProvider` (`src/preferences/PreferencesContext.tsx`) wraps the tree and owns
`theme`/`fx`/`type`, so the chrome reads them from context instead of props. `LocaleProvider`
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
  - **Long formulas auto-fit**: before the FLIP measure, the layout effect shrinks the
    formula's font-size (a few passes) until it fits `FORMULA_MAX_WIDTH` of the viewport,
    minus the section rail's footprint. The isolation zoom divides by that `fitRatio` and is
    capped per node (`ISOLATE_MAX_WIDTH`/`ISOLATE_MAX_HEIGHT`) so no symbol leaves the screen.
  - **Crisp zoom**: formula nodes are deliberately _not_ given `will-change`, and their tweens
    use `force3D: false` — with a compositor layer the glyph is rasterized once at scale 1 and
    then stretched (pixelated). Don't add them back to `willChangeTargets`.
  - **Scroll length**: `SCROLL_PER_UNIT` viewports per timeline unit, and every panel's
    stagger is capped (`cappedStagger`, `PANEL_MAX_STAGGER_SPREAD`) — a 150-word history used
    to add 10+ screens of scroll on its own. Eases are `power*.inOut`, not elastic: under
    scrub an elastic re-bounces every time the user stops or reverses.
  - **Text never leaves the screen**: explanations are anchored at the _bottom_
    (`--hero-bottom-safe`) and grow upward; each isolated node is centered in the free area
    between the chrome and the top of _its own_ explanation (`isolationArea`), scale capped to
    fit. The epilogue (`.hero__context`) spans from `--context-top` (set in the layout effect,
    just under the shrunk formula, whose scale also adapts to viewport height) down to the safe
    bottom; the stage takes the rest, and `fitStagePanels` scales any panel that doesn't fit
    (down to `PANEL_MIN_FIT`). Whatever still overflows **rolls** upward during that panel's
    hold (`panelRoll`, `data-rolling` masks the stage edges) with an extra stop at the end of
    the roll. Close actions live in the safe bottom strip, where the progress counter was. On
    short landscape screens the epilogue switches to author/era left, stage right.
  - **Stops, snap & keyboard**: rail targets + roll ends form the list of "stops". When Lenis
    goes idle (`SNAP_IDLE_MS`), a directional snap settles on the next stop ahead (≤
    `SNAP_AHEAD` viewports) or the nearest (≤ `SNAP_NEAREST`); ↓/PageDown/Space and
    ↑/PageUp/Shift+Space step between stops (using `lenis.targetScroll`, so repeated presses
    chain). Both are skipped while `html.is-scroll-locked` (formula index open).
  - **Scroll locks** (`src/lib/lenis.ts`): `lockScroll(reason)`/`unlockScroll(reason)` —
    Lenis only resumes when no lock is left. Don't call `lenis.stop()/start()` directly; the
    formula index and the hero's pin rebuild used to unlock each other.
  - **Section rail** (`.hero__rail`, left side, hidden ≤900px): Formula → Symbols (each
    node glyph) → History → Timeline → Use cases → Example. `useGSAP` builds `railTargets`
    (active-from time + jump-to time, taken from timeline labels) and exposes `jumpRef`;
    clicking maps the target time to the ScrollTrigger range and glides there via Lenis.
    The active item is toggled via `data-active` on refs from `onUpdate` — no React state,
    so scrolling never re-renders the component.
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
- **Strictly monochrome by default**: pure black/white only (`--bg`/`--fg` CSS variables,
  toggled via `data-theme` on `<html>`), no grays, no shadows, no borders/dividing lines, no
  images, icons, or emoji. If something needs a visual marker, it's built typographically
  (numbers, spacing, weight/opacity contrast) — not a drawn shape. This is the `mono` +
  `default` preset; the opt-in presets below are the only documented exception.
- **Opt-in presets** (`src/preferences/`): `data-fx`
  (`mono`/`crt`/`vhs`/`neon`/`film`/`dream`/`halftone`/`glitch`), `data-type`
  (`default`/`classic`/`editorial`/`modern`/`terminal`/`elegant`/`fraunces`/`code`/`swiss`/
  `futurist`) and `data-theme`
  (theme catalog in `themes.ts`) are set on `<html>` by `PreferencesProvider` and persisted
  in `localStorage` (`mgm:preferences`); `data-scheme` is derived from the theme. `FxLayer`
  (`src/components/fx/`) mounts decorative fixed layers only for non-`mono` presets (CRT/VHS/
  Neon share the "monitor" base of scanlines/roll/flicker; the newer presets mount only their
  own layers) and never on the export route, where the wallpaper preview already draws the
  effect inside its canvas — a second overlay would make the preview differ from the PNG; they
  animate `transform`/`opacity` only (no `mix-blend-mode`, no per-frame `filter`) and are
  disabled under `prefers-reduced-motion`; flicker stays under 3 Hz (WCAG 2.3.1). `neon`
  forces a dark theme when selected from a light one (and is inert on light). Font preset
  webfonts load on demand via `loadTypeFonts()` (`src/lib/font-loaders.ts`) — the default
  preset downloads zero fonts. `PreferencesProvider` delays applying `data-type` until the
  preset's webfonts are ready, which is exactly the signal `FormulaHero` uses (`typeReady`)
  to re-measure its FLIP layout instead of calibrating against stale glyphs.
- **Themes & accent**: `src/index.css` holds every palette under `[data-theme="..."]` —
  deliberately _not_ `:root[data-theme]`, so any element can carry its own palette (the
  exporter's theme swatches do exactly that; a base `[data-theme]` rule re-derives `--accent`
  inside the element, and `mono-dark` has an explicit rule for the same reason). CSS is the
  single source of truth; `themes.ts` only holds id/name/scheme. It also defines
  `--accent`/`--accent-fg`; `--accent: var(--fg)` in `:root` keeps mono themes identical to
  the old black/white look. Component CSS should paint hero/display elements with
  `var(--accent)`, never a literal color. All the preference pickers share `ControlMenu`
  (`src/components/control-menu/`), an inverted popover (`--fg` background, `--bg` text)
  that closes on Escape/outside click — no borders or shadows, per DESIGN.md.
- **Wallpaper export** (`src/lib/wallpaper.ts`): offscreen canvas 2D (no DOM capture),
  sizes 4K/QHD/FHD/mobile, fourteen styles listed in `wallpaperStyles` (formula, accent,
  inverted, poster, swiss,
  anatomy, macro, aura, depth, echo, orbit, spiral, isometric, pattern — the newer ones use
  the formula's data beyond its glyphs: per-node explanations, first timeline year, history).
  Colors go through `parseHex`, which accepts `rgb()` too: `shiftHue`/`mix` return that
  format, and `rgba()` used to hand it back opaque. It reads
  `--bg`/`--fg`/`--accent`/`--font-*` from computed styles and re-applies the active fx
  (scanlines, grain, tracking, glow, hue-shifted chroma) on top, so themes/fonts/effects
  stay in sync by construction. The grain tile is drawn scaled (`grainScale`) to keep the
  PNG from ballooning at 4K (and seeded, so live previews don't flicker). `WallpaperOptions`
  (scale, spacingX/Y, rotation, layers, distance, radius, count, focus — multipliers where
  1 = the original look, except the integer ones; `styleOptionKeys` says which apply to each
  style) tune each composition. `ExportPage` also has effect/theme/font pickers that set the
  _global_ preferences (the same ones the chrome uses).
  `drawWallpaper` is synchronous (fonts awaited up front via `ensureWallpaperFonts`) so
  `ExportPage` (`src/components/export-page/`) can redraw a live preview plus an all-styles
  gallery on every slider change; since every measure is proportional to the canvas, a
  low-res preview is the same image as the full-size PNG. Previews defer drawing to a rAF
  because `PreferencesProvider` applies `data-theme`/`data-type` in an effect that runs
  _after_ its children's effects.
- **Pinned-timeline rebuilds**: `FormulaHero`'s `useGSAP` must pass `revertOnUpdate: true`.
  Without it, dependency changes (resize, `layoutVersion` bump, font change) _stack_ pinned
  ScrollTriggers — two pins fight over `.hero`, the pin-spacer collapses, and the formula
  ends up at `translate(0, ~20000px)` with a 900px document. That was a pre-existing bug
  (resize broke the pin in production) fixed alongside the typography presets. Related: a
  rebuild reverts the pin, the forced layout of the re-measure clamps `scrollY` to 0, so
  `scroll-anchor.ts` stashes the reading position before the change and `FormulaHero`
  consumes it after `ScrollTrigger.refresh()`, in the same tick (no visible jump).
- Fonts: `--font-formula` for the hero formula, `--font-mono` for mono UI chrome,
  `--font-prose` for prose (`src/index.css` defines all three per `data-type` preset) —
  never hardcode a family stack in component CSS. `classic` self-hosts Latin Modern
  (`src/assets/fonts/latin-modern/`, GUST license included); every other preset pulls
  `@fontsource` packages through dynamic imports so Vite code-splits their CSS. Fraunces,
  Cormorant and Unbounded have no Greek subset, so their stacks fall back to STIX Two Math /
  Inter for π/θ/λ — keep a Greek-capable family second in any new formula stack.
  CJK prose falls back to system serif by design (no CJK webfonts are bundled).

- **No LaTeX renderer** (KaTeX/MathJax): formulas are a custom AST of typed nodes
  (`FormulaNode`), each rendered as an independent element React owns and GSAP animates via
  refs. This was a deliberate architecture decision (see `GSAP-PROBLEM.md`) to avoid deeply
  nested, animation-hostile markup and to keep the explanation text co-located with its symbol
  in the same data node.
- Fonts: JetBrains Mono for formulas/mono UI chrome, General Sans for prose (see the
  self-hosting note in `src/index.css`). Superseded by the `--font-formula`/`--font-mono`/
  `--font-prose` roles above.

### i18n

`src/i18n/` — `Locale` is `"es" | "en" | "pt" | "fr" | "zh" | "ja"` (`zh` = Simplified Chinese,
`pt` = Brazilian Portuguese). The locale for a given page comes from its `:locale` URL segment
(see "Routing & URLs"), not from browser detection alone — `detectInitialLocale()` is only used
to pick where `/` redirects to. All user-facing strings go through `ui-strings.ts` (`UiStrings`
type); all formula content is `LocalizedText` — an object requiring **all 6** locale keys,
enforced by the Zod schema itself (`pnpm formulas:validate` fails if any is missing), not just
by convention. Adding a 7th locale means: extend `locales` in `locale.ts`, add the key to
`localizedText()` in `formula.types.ts` and to `changelog.types.ts`'s inline schema, translate
`ui-strings.ts` and `changelog.yaml` by hand, then re-translate all 38 formula YAML files
(this was parallelized across 6 agents, one per batch of files, last time).

Chinese/Japanese have no spaces between words, so the per-word GSAP stagger reveal in
`FormulaHero.tsx` doesn't use plain `.split(" ")` — it uses `splitWords()` in `src/lib/text.ts`
(`Intl.Segmenter`-based, locale-aware) instead, which produces correct word boundaries for CJK
while reproducing the exact same output as `.split(" ")` for space-delimited languages. Any new
text-splitting logic in this component should go through that helper, not a raw `.split(" ")`.

OG image generation (`scripts/generate-og-images.tsx`) needs a CJK-capable fallback font for
the same reason it already needed latin-ext/greek fallbacks for π/Ĥ/ψ: satori has no OS font
fallback like a real browser. `@fontsource/noto-sans-sc` and `@fontsource/noto-sans-jp` are
loaded as further entries in the same font-family stack.

### Branding & sharing

`public/logo.svg` is the wordmark (Euler's identity motif, "e^iπ", next to the "Math Got
Motion" name) used in `README.md`; `public/favicon.svg` is the same "π" mark alone, for the
browser tab. `public/og-image.png` is the site-wide default share preview, generated once via
the same satori pipeline as the per-formula cards (not regenerated on every build — it's a
committed static asset, unlike `dist/og/*.png`).

The share button in `FormulaHero.tsx` doesn't just copy a link: it first tries to fetch that
formula's own OG PNG (relative to `import.meta.env.BASE_URL`, not `SITE_URL` — this must stay
same-origin so it also works against a local `vite preview`) and, if `navigator.canShare`
reports file support, shares it via the Web Share API alongside the title/text/url. If file
sharing isn't supported but the image fetch succeeded, it downloads the PNG directly instead.
Only if neither the image nor `navigator.share` are available does it fall back to copying the
URL to the clipboard. The image only exists as a build artifact, so this degrades gracefully
(no image, no crash) when testing against `pnpm dev` rather than a full `pnpm build:web`.

### Node scripts vs. the app's TypeScript project

`src/` is typechecked/linted against the root `tsconfig.json`. `scripts/**` (plain Node/`tsx`
CLI tools — validate, prerender, OG/sitemap generation) is a separate project,
`tsconfig.node.json` (also covers `vite.config.ts`), with its own `jsx`/`target` settings since
`generate-og-images.tsx` needs real JSX for `satori`. `pnpm typecheck` only checks the root
config's `src/` — `scripts/` type-safety comes from `pnpm lint`, whose ESLint `projectService`
does type-aware checking against whichever tsconfig actually covers the file. Scripts get a
dedicated ESLint override (`eslint.config.js`) allowing `console.log`/`process.exit`, which are
normal there and not app-code smells.
