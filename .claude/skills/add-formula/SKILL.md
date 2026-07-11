---
name: add-formula
description: Add a new mathematical formula/theorem to Math Got Motion. Use when asked to "add a formula", "add a theorem", "add [name] to the app", or when creating/editing files under src/domain/formulas/*.yaml.
---

# Adding a formula to Math Got Motion

A formula is a **data-only YAML file** under `src/domain/formulas/`, validated at
build/runtime against a Zod schema in `src/domain/formula.types.ts`. There is no
formula-specific code to write — no route, no registry entry, no component.
`src/domain/formulas/index.ts` auto-discovers every `*.yaml` file via
`import.meta.glob`.

## Steps

1. **Copy the template**: `src/domain/formulas/_template.yaml` → a new kebab-case
   file, e.g. `src/domain/formulas/bayes-theorem.yaml`. The filename (minus `.yaml`)
   becomes `id` — they must match exactly, or validation fails. This is also the
   URL slug (`/:locale/formula/:id`) and the OG image filename.
2. **Fill every field**, translated into all six locales — `es`, `en`, `pt`
   (Brazilian Portuguese), `fr`, `zh` (Simplified Chinese), `ja`. Every localized
   field is an object requiring all six keys; the schema rejects a file missing
   even one.
   - `title`, `category`, `context.author` — max 60 chars each. Reuse an existing
     formula's `category` text exactly (e.g. "Álgebra"/"Algebra") so formulas group
     together in the menu instead of splintering into near-duplicate categories.
   - `nodes[].value` — max 8 chars (the rendered symbol itself, e.g. `x`, `sin`,
     `∇`). `type` is one of `variable`, `operator`, `equals`, `number`, `constant`,
     `superscript`. One node per visible symbol/character, in reading order.
   - `nodes[].explanation` — max 220 chars, what that one symbol means.
   - `context.era` — max 120 chars (e.g. "Suiza, 1707–1783 · publicada en 1748").
   - `context.history` — max 900 chars, a paragraph of real historical/cultural
     context.
   - `context.timeline` — 1 to 10 chronological entries, each `year` (string) +
     `label` (max 320 chars).
   - `context.useCases` — 1 to 6 entries, each `title` (max 60 chars) + `description`
     (max 320 chars) — real domains where the formula is used today.
   - `context.example` — a `title` (max 60 chars) plus 1 to 14 `lines` (max 120
     chars each), a genuine worked numeric example revealed line by line, not a
     restatement of the formula.
   - Formulas have 1 to 16 nodes total.
3. **Validate**: `pnpm formulas:validate`. Fix everything it reports — exact field,
   exact reason. This is the same check CI runs on every PR.
4. **Look at it**: `pnpm dev`, then open `/es/formula/<id>` (and at least one other
   locale) in a browser. Confirm nothing overflows, no explanation text is clipped,
   and the node breakdown reads naturally when isolated one at a time.
5. **Run the full check before finishing**: `pnpm check:all` (typecheck + lint +
   format:check + formulas:validate).

Never edit `src/domain/formulas/index.ts`, any route file, or the formula menu —
they all read from the YAML files automatically, including the home page's live
formula/category/language stats.

## If translating all six languages isn't feasible in one pass

Fill in `es`/`en` (or whatever you're confident in) completely and correctly first.
For the rest, either:

- Translate them yourself if you have reasonable confidence in the language, or
- Leave the PR/commit message with an explicit note on which locales are
  machine-translated-only or still missing, so a human reviewer knows to check
  before merging. Don't silently ship a translation you can't vouch for.

If asked to add **many** formulas at once, translate/author them in parallel
batches (one agent per batch of files) rather than serially — this is how the
existing 38-formula, 6-language corpus was built. Always re-run
`pnpm formulas:validate` after merging batches; a common failure mode is an
unquoted colon inside a YAML scalar (e.g. `es: Result: 42`) breaking the YAML
parse — quote the string if that happens.

## Content expectations

- Historically accurate — this app treats formula history as real content, not
  flavor text.
- Neutral, encyclopedic tone, matching the existing 38 formulas — not marketing copy.
- Concise even within the length caps; the scroll choreography's timing is derived
  from content length (word/item counts), so padding content to the character limit
  makes the scroll feel slower, not more informative.

## Full contribution rules

See [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) at the repo root for the complete
contribution guide (PR expectations, animation/design rules for anything beyond
formula content, commit style).
