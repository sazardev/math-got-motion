/**
 * Carga de los chunks pesados en un único lugar. `App.tsx` los usa para
 * `React.lazy` y el resto de la app los reutiliza para precargar por intención
 * (hover/foco) o en idle. Como es el mismo `import()` dinámico, Vite sirve el
 * mismo archivo: precargar no duplica ninguna descarga.
 */

export function loadFormulaHeroChunk() {
  return import("../components/formula-hero/FormulaHero");
}

export function loadExportPageChunk() {
  return import("../components/export-page/ExportPage");
}

export function loadChangelogPageChunk() {
  return import("../components/changelog-page/ChangelogPage");
}

export function loadCollectionsPageChunk() {
  return import("../components/collections-page/CollectionsPage");
}

export function loadGlossaryPageChunk() {
  return import("../components/glossary-page/GlossaryPage");
}

export function loadGuidePageChunk() {
  return import("../components/guide-page/GuidePage");
}

/** Dispara la descarga sin esperarla (los módulos se cachean solos). */
export function prefetchChunk(loader: () => Promise<unknown>): void {
  void loader().catch(() => {
    // La navegación real volverá a intentarlo y mostrará el error correspondiente.
  });
}
