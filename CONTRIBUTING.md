# Contributing to Math Got Motion

Thanks for considering a contribution. This project is deliberately built so that
adding content — a new formula, a translation, a fix — never requires touching
animation code or understanding the GSAP timeline. Read on for what's expected.

## Ways to contribute

- **A new formula** — the most common contribution. See [Adding a formula](#adding-a-formula)
  below.
- **A missing/incomplete translation** on an existing formula or UI string.
- **A bug report** — open an issue with the steps to reproduce (use the bug report template).
- **Design/animation changes** — anything touching `FormulaHero.tsx`, `HomePage.tsx`,
  or their `.css` files must follow the rules in [`SPEC.md`](SPEC.md) and
  [`DESIGN.md`](DESIGN.md) (see [Animation & design rules](#animation--design-rules)).

If you're unsure whether something is worth a PR, open an issue first — that's fine.

## Adding a formula

1. Copy [`src/domain/formulas/_template.yaml`](src/domain/formulas/_template.yaml) to a
   new kebab-case file under `src/domain/formulas/`, e.g. `quadratic-formula.yaml`.
   The filename (minus `.yaml`) becomes the formula's `id` **and** its URL slug — the
   two must match exactly, or validation fails.
2. Fill in every field: `title`, `category`, the per-symbol `nodes` (each with its own
   short explanation), and `context` (`author`, `era`, `history`, `timeline`, `useCases`,
   a worked `example`). The template's comments explain each field and its purpose.
3. **Translate every text field into all six supported languages**: `es`, `en`, `pt`
   (Brazilian Portuguese), `fr`, `zh` (Simplified Chinese), `ja`. The schema requires
   all six keys on every localized field — a formula with only `es`/`en` filled in will
   fail `pnpm formulas:validate`.
   - **If you can't translate all six yourself**, that's fine — open the PR anyway,
     say so explicitly in the description, and a maintainer will either translate the
     rest or coordinate with someone who can before merging. Don't invent a
     translation you're not confident in (machine-translated text that reads
     unnaturally is worse than an honest gap) — flag it instead.
4. Run `pnpm formulas:validate`. It validates your file against the
   [Zod schema](src/domain/formula.types.ts) and reports the exact field and reason
   if something's missing, too long, or malformed. Fix everything it flags — this is
   the same check CI runs on every pull request, so a red run here means a red PR.
5. Run `pnpm dev` and look at your formula in the browser (`/es/formula/your-id`, and
   ideally at least one other locale) to confirm the scroll choreography looks right —
   nothing overflowing, no text clipped, node explanations reading naturally.
6. Run `pnpm check:all` (typecheck + lint + format + formula validation) before opening
   the PR — see [Checks that must pass](#checks-that-must-pass).

You never need to edit `src/domain/formulas/index.ts`, any route, or the formula menu —
they all auto-discover formulas from the YAML files.

### Why YAML, not code

A formula file only ever describes data (strings, numbers, lists) — it can't execute
code, read the filesystem, or do anything beyond render text. That's what makes it
safe to accept formulas from contributors the maintainers don't otherwise know, in an
external pull request, without a security review of arbitrary code. The schema's
length caps exist for the same reason the YAML format does: they protect the
scrollytelling layout (which assumes reasonably sized content) from a malformed or
oversized submission, by failing validation instead of breaking at runtime.

### Content expectations

- **Historically accurate.** `context.history`, `context.author`, and
  `context.timeline` should reflect real, verifiable history — cite it in the PR
  description if a fact is non-obvious or disputed.
- **A real worked example.** `context.example` should be an actual solved instance of
  the formula, not a restatement of the formula itself.
- **Concise.** Every field has a length cap tied to the scroll choreography (see
  `TEXT_LIMITS` in `src/domain/formula.types.ts`) — validation enforces this, but aim
  for tight, plain language even within the limit.
- **Neutral, encyclopedic tone** — the same register as the existing 38 formulas, not
  marketing copy.

## Animation & design rules

If your change touches `FormulaHero.tsx`, `HomePage.tsx`, or any `.css` under
`src/components/`, it must follow [`SPEC.md`](SPEC.md) and [`DESIGN.md`](DESIGN.md).
The two rules that matter most:

- **Only animate `transform` (`x`, `y`, `scale`, `rotate`) and `opacity`.** Never
  animate `width`, `height`, `margin`, `top`, `left`, or anything else that triggers
  layout — this is a hard performance constraint, not a style preference.
- **Strictly monochrome, purely typographic.** No grays, no shadows, no borders, no
  images/icons/emoji. If something needs a visual marker, build it out of typography
  (weight, spacing, opacity) — see `DESIGN.md` §3.

All GSAP work goes through `@gsap/react`'s `useGSAP` hook with a `scope` — never a
plain `useEffect` — so timelines and ScrollTriggers clean up correctly on unmount.

## Checks that must pass

Run before opening a PR:

```bash
pnpm check:all   # typecheck + lint + format:check + formulas:validate
```

CI runs the same command (plus a separate Rust lint/audit job and the Tauri build
matrix) on every push and pull request — a failing `check:all` locally will fail CI.

There is no test framework configured in this repo yet. Don't add one as part of an
unrelated PR, and don't invent test commands that don't exist.

## Pull requests

Use the PR template — it'll prompt you for the checklist above. Keep PRs focused:
one new formula, one bug fix, or one feature per PR, rather than bundling unrelated
changes. If a PR includes a visual/animation change, include a screenshot or short
screen recording.

## Commit style

There's no enforced commit message convention, but recent history favors short,
imperative, English or Spanish messages describing the _why_ over the _what_
(`git log` for examples). Keep it readable.
