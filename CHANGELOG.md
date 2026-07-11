# Changelog

All notable changes to Math Got Motion are documented here, in
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

This file is generated from `src/domain/changelog.yaml` — the source of
truth, bilingual, also rendered in-app at `/:locale/changelog`. Add new
entries there, then run `pnpm changelog:sync`.

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
