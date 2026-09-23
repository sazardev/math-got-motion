/**
 * Ancla de scroll para rebuilds del timeline de FormulaHero.
 *
 * Cuando cambia el preset tipográfico, el contexto GSAP se revierte (necesario:
 * sin `revertOnUpdate` los ScrollTrigger con pin se acumulan) y el pin-spacer
 * desaparece por un instante. La primera medición del rebuild fuerza layout con
 * el documento encogido, el navegador clampa `scrollY` a 0, y el refresh de
 * ScrollTrigger guarda/restaura ese 0 — la posición de lectura se pierde.
 *
 * El provider deposita la posición intencional acá justo antes de aplicar el
 * cambio; FormulaHero la consume después de reconstruir y la restaura. Si nadie
 * la consume (p. ej. el usuario navega a otra fórmula antes de que carguen los
 * webfonts), se descarta.
 */
let pendingScrollY: number | null = null;

export function stashScrollAnchor(): void {
  pendingScrollY = globalThis.scrollY;
}

export function takeScrollAnchor(): number | null {
  const value = pendingScrollY;
  pendingScrollY = null;
  return value;
}
