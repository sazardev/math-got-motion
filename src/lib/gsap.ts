import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Nota: se evaluó ScrollTrigger.normalizeScroll(true) para suavizar el
// scroll táctil en móvil, pero su proxy de scroll interno queda
// desincronizado cuando el pin se desmonta/remonta con otra altura (al
// cambiar de fórmula), dejando el .hero fuera de pantalla. En su lugar se
// adoptó Lenis (ver src/lib/lenis.ts), que en su modo por defecto no
// reemplaza el scroll con un proxy: sigue llamando a window.scrollTo() de
// forma nativa, solo que suavizado — ScrollTrigger sigue leyendo la
// posición de scroll real en todo momento, así que no reproduce el mismo
// desajuste.

export { gsap } from "gsap";
export { ScrollTrigger } from "gsap/ScrollTrigger";
