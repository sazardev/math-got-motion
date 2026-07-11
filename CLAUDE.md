# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Math Got Motion: a multiplatform app (web, desktop, mobile via Tauri v2) that explains
mathematical theorems through a monochrome, purely typographic scrollytelling experience.
Scroll acts as a timeline: a formula's symbols separate one at a time, each isolated symbol
gets a typographic explanation, and an epilogue reveals the formula's history, timeline,
real-world use cases, and a worked example. See `SPEC.md` and `DESIGN.md` for the full
product/design-system rules — read them before changing animation or visual behavior.

## Commands

```bash
pnpm dev                    # Vite dev server (http://localhost:1420)
pnpm tauri:dev              # Desktop app, hot-reloading

pnpm typecheck              # tsc --noEmit
pnpm lint                   # ESLint over src/**/*.{ts,tsx} and scripts/**/*.ts
pnpm lint:fix
pnpm format                 # Prettier --write
pnpm format:check
pnpm formulas:validate      # Validate every formula YAML file against the Zod schema
pnpm check:all              # typecheck + lint + format:check + formulas:validate — run before committing
pnpm check:everything       # check:all + rust:check

pnpm build                  # tsc && vite build
pnpm tauri:build            # Desktop installers

pnpm rust:check             # rust:fmt:check + rust:clippy + rust:audit + rust:deny
```

There is no test framework configured yet (no `test` script, no Vitest/Jest). Don't invent
test commands or assume tests exist.

CI (`.github/workflows/ci.yml`) runs `typecheck`, `lint`, `format:check`, and
`formulas:validate` on every push/PR, plus a separate Rust lint/audit job and a Tauri build
matrix (Linux/Windows/macOS). A broken formula file fails CI the same way a lint error does.

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
  construction, since two files can't share a name in one directory.
- The parsed YAML must satisfy `formulaSchema`.

`index.ts` auto-discovers every `*.yaml` file via `import.meta.glob(["./*.yaml",
"!./_template.yaml"], { eager: true, query: "?raw", import: "default" })`, parses each with
`js-yaml`, and validates with the schema — **adding a formula never requires editing
`index.ts`** or any registry/array. `_template.yaml` (prefix `_`) is excluded from discovery
and is the commented, copy-paste starting point for a new formula.

In dev, an invalid formula file throws immediately with the file name and the exact failing
field. In production it logs to `console.error` and skips the bad file instead of crashing the
whole app. `scripts/validate-formulas.ts` (run via `pnpm formulas:validate`, powered by `tsx`)
runs the same schema check standalone for CI, without booting Vite.

When adding or changing a formula, prefer editing/copying the YAML template over touching
`formula.types.ts` — only change the schema when the _shape_ of formula content needs to
change, since every existing YAML file must keep validating against it.

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
     in sequence — History → Timeline → Use cases → Worked example — each with its own
     stagger-in/hold/stagger-out choreography before the next panel begins.
  - Panel timing is **computed from content length**, not hardcoded: `panelInDuration` and
    `panelOutDuration` account for GSAP's `stagger` extending a tween's effective duration
    (a common source of bugs — the out-animation duration must add the stagger spread, or
    the next panel starts before the previous one finishes fading, causing visible overlap).
  - Layout re-measures on resize/orientation change (`layoutVersion` state) by first clearing
    any GSAP-applied inline transform (`clearProps: "all"`) before re-measuring.
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

`src/i18n/` — `Locale` is `"es" | "en"`, detected from the browser and toggleable at runtime
via `LocaleContext`/`useLocale()`. All user-facing strings go through `ui-strings.ts`
(`UiStrings` type); all formula content is bilingual `{ es, en }` (`LocalizedText`) enforced by
the Zod schema itself, not just by convention.
