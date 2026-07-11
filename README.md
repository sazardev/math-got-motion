<img src="public/logo.svg" alt="Math Got Motion" height="80" />

Math formulas deconstructed letter by letter, scroll by scroll.

Math Got Motion is a multiplatform app (web, desktop, and mobile via Tauri v2) that
explains theorems and mathematical laws through a radically minimalist, monochrome,
purely typographic scrollytelling experience. Scroll turns into a timeline: each
formula expands, its symbols separate with an elastic bounce, and a short
explanation fades in for the isolated symbol — one at a time. An epilogue then
reveals the formula's history, timeline, real-world use cases, and a worked example.

**Live site:** https://sazardev.github.io/math-got-motion

## Features

- **A real home, not just a redirect.** `/:locale/` is a landing page with an
  autoplaying preview of Euler's Identity assembling itself, live stats (formula/
  category/language counts, read at render time — never hardcoded), a step-by-step
  explanation of how the scroll choreography works, and a "how to contribute" CTA.
- **Scrollytelling, not a slideshow.** Scroll position drives the animation timeline
  directly (GSAP ScrollTrigger, `scrub`), not just triggers `play`/`reverse`. A real
  inertia scroll ([Lenis](https://lenis.darkroom.engineering)) sits underneath for a
  more natural feel, and `prefers-reduced-motion` gets a calmer version of the same
  timeline instead of no motion at all.
- **A formula is data, not markup.** Each formula is an AST of typed nodes
  (`variable`, `operator`, `superscript`, …) with a localized explanation per node —
  see [`src/domain/formula.types.ts`](src/domain/formula.types.ts) and
  [`src/domain/formulas/`](src/domain/formulas/). No LaTeX renderer, no
  `dangerouslySetInnerHTML` — React owns the DOM, GSAP owns the transforms.
- **38 formulas** across math, physics, statistics, and more — switchable from a
  searchable, category-grouped menu that scales to any number of formulas.
- **Six languages** (Spanish, English, Portuguese, French, Chinese, Japanese),
  locale-prefixed URLs, and per-formula, per-locale SEO: canonical URLs, hreflang
  alternates, Open Graph/Twitter cards with an auto-generated preview image, and a
  prerendered static HTML snapshot of every route for crawlers that don't run JS.
- **Light/dark theme**, strictly black-on-white or white-on-black — no grays.
- **60fps-first:** only `transform`/`opacity` are ever animated; a manual FLIP pass
  (`getBoundingClientRect` → `position: absolute`) takes each character out of
  document flow once, so GSAP never touches layout-triggering properties.

See [`SPEC.md`](SPEC.md) and [`DESIGN.md`](DESIGN.md) for the full product and
design-system rules this project follows.

## Adding a formula

Each formula is a **data-only YAML file** — not code — so anyone can safely
contribute one, including in an external pull request, without ever gaining
the ability to run JavaScript inside the app:

1. Copy [`src/domain/formulas/_template.yaml`](src/domain/formulas/_template.yaml)
   to a new kebab-case file, e.g. `quadratic-formula.yaml`.
2. Fill in its fields (title, category, per-symbol nodes, history, timeline,
   use cases, a worked example) **for all six languages** (`es`, `en`, `pt`,
   `fr`, `zh`, `ja`) — the template's comments explain each field. `id` must
   match the filename exactly.
3. Run `pnpm formulas:validate` (or just `pnpm dev`). It checks the file
   against a [Zod](https://zod.dev) schema
   ([`src/domain/formula.types.ts`](src/domain/formula.types.ts)) and reports
   the exact field and reason if something's missing, too long, or the wrong
   shape — the same check CI runs on every pull request.
4. Done. `src/domain/formulas/index.ts` auto-discovers every `*.yaml` file
   via `import.meta.glob` — no import to add, no array to update. The
   formula index menu, sitemap, OG image generation, and home page's stats
   all pick it up automatically.

Why YAML instead of a `.ts` module: a formula file only ever describes data
(strings, numbers, lists), so it can't execute code, read the filesystem, or
do anything beyond render text — a required property for accepting formulas
from contributors you don't otherwise trust. The schema also caps every
field's length, since the scrollytelling choreography assumes reasonably
sized content; a malformed or oversized submission fails validation instead
of breaking the pinned-scroll layout at runtime. Requiring `id` to equal the
filename additionally makes duplicate IDs impossible by construction — two
files can't share one name on the same filesystem.

If you can't translate all six languages yourself, open the pull request
anyway and say so — see [`CONTRIBUTING.md`](CONTRIBUTING.md) for the exact
expectations and what happens with partial translations.

## Contributing

Bug reports, new formulas, translations, and design/animation improvements
are all welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full guide:
what's expected in a pull request, the checks that must pass locally before
you open one, and the animation/design rules (`SPEC.md`/`DESIGN.md`) that
apply to any visual change.

## Stack

- **Core:** [Tauri v2](https://tauri.app) for desktop/mobile packaging.
- **Frontend:** React 19 + TypeScript, Vite, `react-router-dom`.
- **Animation:** [GSAP](https://gsap.com) (`ScrollTrigger`, `@gsap/react`'s `useGSAP`)
  plus [Lenis](https://lenis.darkroom.engineering) for inertia scrolling.
- **Data:** [Zod](https://zod.dev)-validated YAML formula files, parsed with `js-yaml`.
- **Fonts:** JetBrains Mono (formulas) and General Sans (copy) — see the note in
  [`src/index.css`](src/index.css) about self-hosting General Sans.

## Development

```bash
pnpm install
pnpm dev                    # web dev server (http://localhost:1420)
pnpm tauri:dev              # desktop app, hot-reloading

pnpm typecheck              # tsc --noEmit
pnpm lint                   # ESLint
pnpm format                 # Prettier --write
pnpm formulas:validate      # validate every formula YAML against the Zod schema
pnpm check:all              # typecheck + lint + format:check + formulas:validate — run before every PR

pnpm build                  # production web build (client-only SPA bundle)
pnpm build:web              # build + OG images + sitemap + prerender — what CI/deploy runs
pnpm tauri:build            # desktop installers
```

There is no test framework configured yet — don't invent test commands or assume
tests exist. See [`CLAUDE.md`](CLAUDE.md) for the full architecture writeup (routing,
SEO/prerendering pipeline, i18n, the FLIP/GSAP animation system, and more).

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
