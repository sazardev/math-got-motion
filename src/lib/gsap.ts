import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Nota: se evaluó ScrollTrigger.normalizeScroll(true) para suavizar el
// scroll táctil en móvil, pero su proxy de scroll interno queda
// desincronizado cuando el pin se desmonta/remonta con otra altura (al
// cambiar de fórmula), dejando el .hero fuera de pantalla. Se prefiere
// scroll nativo, que ya funciona de forma fiable con pin + scrub.

export { gsap } from "gsap";
export { ScrollTrigger } from "gsap/ScrollTrigger";
