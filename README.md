# Math Got Motion

Math formulas deconstructed letter by letter, scroll by scroll.

Math Got Motion is a multiplatform app (web, desktop, and mobile via Tauri v2) that
explains theorems and mathematical laws through a radically minimalist, monochrome,
purely typographic scrollytelling experience. Scroll turns into a timeline: each
formula expands, its symbols separate with an elastic bounce, and a short
explanation fades in for the isolated symbol — one at a time.

## Features

- **Scrollytelling, not a slideshow.** Scroll position drives the animation timeline
  directly (GSAP ScrollTrigger, `scrub`), not just triggers `play`/`reverse`.
- **A formula is data, not markup.** Each formula is an AST of typed nodes
  (`variable`, `operator`, `superscript`, …) with a localized explanation per node —
  see [`src/domain/formula.types.ts`](src/domain/formula.types.ts) and
  [`src/domain/formulas/`](src/domain/formulas/). No LaTeX renderer, no
  `dangerouslySetInnerHTML` — React owns the DOM, GSAP owns the transforms.
- **Multiple formulas**, switchable from a typographic menu: Euler's Identity, the
  Pythagorean theorem, the area of a circle, and Newton's second law.
- **Bilingual (ES/EN)**, detected from the browser and toggleable at runtime.
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
   use cases, a worked example — the template's comments explain each one).
   `id` must match the filename exactly.
3. Run `pnpm formulas:validate` (or just `pnpm dev`). It checks the file
   against a [Zod](https://zod.dev) schema
   ([`src/domain/formula.types.ts`](src/domain/formula.types.ts)) and reports
   the exact field and reason if something's missing, too long, or the wrong
   shape — the same check CI runs on every pull request.
4. Done. `src/domain/formulas/index.ts` auto-discovers every `*.yaml` file
   via `import.meta.glob` — no import to add, no array to update. The
   formula index menu groups and sorts it automatically by `category`.

Why YAML instead of a `.ts` module: a formula file only ever describes data
(strings, numbers, lists), so it can't execute code, read the filesystem, or
do anything beyond render text — a required property for accepting formulas
from contributors you don't otherwise trust. The schema also caps every
field's length, since the scrollytelling choreography assumes reasonably
sized content; a malformed or oversized submission fails validation instead
of breaking the pinned-scroll layout at runtime. Requiring `id` to equal the
filename additionally makes duplicate IDs impossible by construction — two
files can't share one name on the same filesystem.

## Stack

- **Core:** [Tauri v2](https://tauri.app) for desktop/mobile packaging.
- **Frontend:** React 19 + TypeScript, Vite.
- **Animation:** [GSAP](https://gsap.com) (`ScrollTrigger`, `@gsap/react`'s `useGSAP`).
- **Fonts:** JetBrains Mono (formulas) and General Sans (copy) — see the note in
  [`src/index.css`](src/index.css) about self-hosting General Sans.

## Development

```bash
pnpm install
pnpm dev              # web dev server (http://localhost:1420)
pnpm tauri:dev         # desktop app, hot-reloading

pnpm typecheck
pnpm lint
pnpm format:check
pnpm build             # production web build
pnpm tauri:build       # desktop installers
```

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
