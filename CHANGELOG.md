# Changelog

All notable changes to Math Got Motion are documented here, in
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

This file is generated from `src/domain/changelog.yaml` — the source of
truth, bilingual, also rendered in-app at `/:locale/changelog`. Add new
entries there, then run `pnpm changelog:sync`.

## [0.13.0] - 2026-09-28

### Added

- New Video mode in the exporter: every style has an animated twin in a seamless loop, with theme, font, effect, size, duration and FPS.
- 61 wallpaper styles (43 new: Blueprint, Mosaic, Eclipse, Seal, LED matrix, Constellation, Hyperspace, Sphere…) and a Moment slider to pick the frame.
- When exporting you can show or hide the app name and, in video, the formula's title and details to keep only the central focus.
- 49 new themes and 32 new fonts (One Dark, GitHub, Monokai, Synthwave, Playfair, Geist, Pixel, Caveat…) plus ultrawide, tablet, 16:10 laptop and square sizes.

### Changed

- The exporter is more compact: format, style, effect, theme and font are searchable menus, and the all-styles previews expand on demand.

## [0.12.0] - 2026-09-28

### Added

- Two new wallpaper styles: Accent (primary-color background, formula in its contrast color) and Inverted (text-color background) — simple and high-contrast.
- Scroll with stops: when you let go it settles on the next symbol or panel; arrow keys, Page Down, and Space advance one step at a time.

### Fixed

- No text is left off-screen: explanations, history, timeline, and examples fit the real height, and whatever doesn't fit scrolls so it can be read in full.
- With the formula index open, the wheel moved the formula behind it instead of the list; the list now scrolls on its own and supports the keyboard (arrows and Enter).
- The epilogue panel labels (History, Timeline, Use cases, Example) never appeared; they now enter and leave with their panel.

## [0.11.0] - 2026-09-28

### Added

- Seven new wallpaper styles: Swiss, Anatomy, Macro, Aura, Echo, Orbit, and Spiral — each uses the formula differently, with its symbols, history, and explanations.
- Four new effects (Film, Dream, Halftone, and Glitch), 13 new themes (Rosé Pine, Dracula, Solarized, Kanagawa, Paper & Ink, Sakura…), and five new fonts.

### Changed

- The exporter lets you pick effect, theme (with real color swatches), and font without leaving the preview, which now looks exactly like the final PNG.

### Fixed

- Neon's colored glows in wallpapers were painted opaque instead of fading out.

## [0.10.0] - 2026-09-28

### Added

- The wallpaper exporter is now its own page: a live preview, all five styles side by side, and per-style controls — size, spacing, rotation, and 3D layers and depth.
- A section index on the left of every formula: one click jumps to the formula, any symbol, the history, timeline, use cases, or worked example.

### Changed

- Cleaner controls: each shows only its value ("Mono", "Nord", "EN") and opens a mini menu to pick directly instead of cycling option by option.
- Shorter, smoother scroll: long panels no longer stretch the journey, and elastic bounces were replaced with smooth transitions.

### Fixed

- Long formulas overflowed the screen; they now scale down to fit whole. The isolated symbol stays crisp at any zoom instead of pixelating.

## [0.9.0] - 2026-09-23

### Added

- Global color themes — Gruvbox, Nord, Ayu, Osaka, Tokyo Night, Catppuccin, and more — selectable from the controls and persisted. Monochrome stays the default.
- PNG wallpaper exporter at 4K, QHD, Full HD, and mobile, with five styles (formula, poster, isometric, 3D, and pattern) using the active theme, typography, and effect.

### Changed

- The light/dark toggle is replaced by the theme picker; Mono Dark and Mono Light keep the classic black-and-white look.

## [0.8.0] - 2026-09-22

### Added

- Opt-in looks — CRT, VHS, and Neon — with scanlines, grain, tracking, and glow, switchable from the controls; classic monochrome stays the default.
- Typography presets — Classic (Latin Modern), Editorial (STIX Two), Modern (Space Grotesk + IBM Plex Mono), and Terminal (Space Mono) — with lazy-loaded webfonts.

### Fixed

- Resizing or switching type stacked pinned ScrollTriggers and left the formula off-screen; the timeline now rebuilds cleanly and keeps the reading position.

## [0.7.0] - 2026-07-11

### Added

- A brand new home page, with Euler's Identity assembling itself, live stats, how the app works, and how to contribute.
- A contribution guide (CONTRIBUTING.md), pull request/issue templates, and a Claude Code skill for adding formulas step by step.

### Changed

- Scroll now has real inertia (Lenis) for a more natural, fluid feel, and respects the OS's "reduce motion" setting with a calmer version of the same animation.

## [0.6.0] - 2026-07-11

### Added

- Four new languages — Portuguese, French, Chinese, and Japanese — added alongside Spanish and English across all 38 formulas and the whole interface.
- A logo — Euler's Identity motif (e^iπ) as the brand mark — and a dedicated site-wide preview image.

### Changed

- Sharing now attaches the formula's image (or downloads it, on browsers that can't attach files) instead of just the link.

### Fixed

- The "back" and "share" buttons could get clipped off-screen at certain window heights — they now always fit within the viewport.

## [0.5.0] - 2026-07-10

### Added

- Every formula now has its own URL and can be shared directly (with its own preview image).
- A changelog page (this one).
- Aggressive SEO — sitemap, robots.txt, structured data, and prerendered pages for search engines and AI.

### Changed

- Language and the active formula now live in the URL, not just in memory.

## [0.4.0] - 2026-07-10

### Added

- 34 new formulas (38 total), each with history, a timeline, real-world use cases, and a worked example.
- A searchable formula index grouped by category.

### Changed

- Formulas moved from code modules to schema-validated YAML files — anyone can safely contribute one.

## [0.3.0] - 2026-07-10

### Added

- Automatic deployment to GitHub Pages.

## [0.2.0] - 2026-07-10

### Added

- A menu to switch between multiple formulas.
- Bilingual support, Spanish and English.
- Responsive layout for narrow screens and landscape orientation.

## [0.1.0] - 2026-07-10

### Added

- First proof of concept — Euler's Identity deconstructed via scroll.
