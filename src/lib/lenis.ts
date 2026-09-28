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

  // lerp algo más bajo que el default (0.1) y rueda levemente amortiguada:
  // el pin de FormulaHero convierte cada notch en animación, y con el
  // default un giro rápido de rueda "saltaba" varios pasos de golpe.
  const lenis = new Lenis({
    autoRaf: false,
    lerp: 0.085,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.3,
  });
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

/*
 * Bloqueos de scroll con motivo. Antes cada componente llamaba a
 * lenis.stop()/start() por su cuenta, y el primero en reanudar le soltaba el
 * scroll al otro: abrir el índice de fórmulas mientras el hero reconstruía su
 * pin (o al revés) dejaba la página moviéndose detrás del overlay. Ahora Lenis
 * solo se reanuda cuando no queda ningún bloqueo activo.
 */
const scrollLocks = new Set<string>();

export function lockScroll(reason: string): void {
  scrollLocks.add(reason);
  lenisInstance?.stop();
}

export function unlockScroll(reason: string): void {
  scrollLocks.delete(reason);
  if (scrollLocks.size === 0) lenisInstance?.start();
}

export function destroyLenis(): void {
  if (!lenisInstance || !rafCallback) return;
  gsap.ticker.remove(rafCallback);
  lenisInstance.destroy();
  lenisInstance = null;
  rafCallback = null;
  gsap.ticker.lagSmoothing(500, 33);
}
