import Lenis from "lenis";

import { gsap, ScrollTrigger } from "./gsap";

let lenisInstance: Lenis | null = null;
let rafCallback: ((time: number) => void) | null = null;

/**
 * Instancia única de Lenis para toda la vida de la app (no atada al montaje
 * de FormulaHero — ver el comentario en FormulaHero.tsx sobre por qué el
 * ciclo de vida de Lenis debe ser independiente del pin que se reconstruye
 * en cada cambio de fórmula). Se omite por completo si el usuario prefiere
 * menos movimiento: no tiene sentido crearla y destruirla.
 */
export function initLenis(): Lenis | null {
  if (lenisInstance) return lenisInstance;
  if (globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;

  const lenis = new Lenis({ autoRaf: false });
  lenis.on("scroll", () => {
    ScrollTrigger.update();
  });

  rafCallback = (time: number) => {
    lenis.raf(time * 1000);
  };
  gsap.ticker.add(rafCallback);
  gsap.ticker.lagSmoothing(0);

  ScrollTrigger.addEventListener("refresh", () => {
    lenisInstance?.resize();
  });

  lenisInstance = lenis;
  return lenis;
}

export function getLenis(): Lenis | null {
  return lenisInstance;
}

export function destroyLenis(): void {
  if (!lenisInstance || !rafCallback) return;
  gsap.ticker.remove(rafCallback);
  lenisInstance.destroy();
  lenisInstance = null;
  rafCallback = null;
  gsap.ticker.lagSmoothing(500, 33);
}
