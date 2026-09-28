import { useGSAP } from "@gsap/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useSeo } from "../../hooks/useSeo";
import { locales } from "../../i18n/locale";
import { useLocale } from "../../i18n/locale-context";
import { gsap, ScrollTrigger } from "../../lib/gsap";
import { getLenis, lockScroll, unlockScroll } from "../../lib/lenis";
import { takeScrollAnchor } from "../../lib/scroll-anchor";
import { SITE_URL } from "../../lib/site";
import { splitWords } from "../../lib/text";
import { usePreferences } from "../../preferences/preferences-context";

import type { Formula } from "../../domain/formula.types";
import "./FormulaHero.css";

interface NodeLayout {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface FormulaHeroProps {
  formula: Formula;
}

type RailSectionId = "formula" | "symbols" | "history" | "timeline" | "usecases" | "example";

/** Un destino del riel: desde qué tiempo cuenta como activo y a qué tiempo salta. */
interface RailTarget {
  id: string;
  start: number;
  target: number;
}

const DESCRIPTION_MAX_LENGTH = 155;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

// Duraciones (en "tiempo" de timeline, no segundos reales — el scrub las
// reparte sobre el rango de scroll) que arman cada bloque de aislamiento.
const ISOLATE_DIM_DURATION = 0.6;
const ISOLATE_MOVE_DURATION = 0.9;
const WORDS_IN_DELAY = 0.3;
const WORDS_IN_DURATION = 0.5;
const WORDS_OUT_DELAY = 1.15;
const WORDS_OUT_DURATION = 0.35;
const RESET_DELAY = 1.2;
const RESET_DURATION = 0.6;
const SEGMENT_DURATION = RESET_DELAY + RESET_DURATION;
const INTRO_DURATION = 1.1;

// Estado 4 — Epílogo: la fórmula se encoge (sin desaparecer) a un sello que
// queda como encabezado permanente junto a autor y época. Debajo, un
// "escenario" central va revelando cuatro paneles — historia, línea de
// tiempo, casos de uso y un ejemplo resuelto — uno a la vez, con la misma
// coreografía in/hold/out que ya usan los nodos de la fórmula.
const CONTEXT_SHRINK_DURATION = 1;
const CONTEXT_AUTHOR_DELAY = 0.45;
const CONTEXT_AUTHOR_DURATION = 0.6;
const CONTEXT_ERA_DELAY = 0.35;
const CONTEXT_ERA_DURATION = 0.5;

// Cada panel del "stage" corre su propia mini-coreografía: entra con stagger,
// se sostiene en pantalla, y sale antes de que entre el siguiente. La
// duración de entrada/salida escala con la cantidad de ítems del panel
// (palabras, eventos, casos o líneas) para que el ritmo se sienta parejo sea
// cual sea el contenido de cada fórmula.
const PANEL_GAP_BEFORE = 0.35;
const PANEL_IN_DURATION = 0.6;
const PANEL_ITEM_STAGGER = 0.14;
const PANEL_HOLD = 0.7;
const PANEL_OUT_DURATION = 0.4;

const CONTEXT_BACK_GAP = 0.5;
const CONTEXT_BACK_DURATION = 0.5;

// Tope del stagger total de un panel: la historia puede tener 150 palabras, y
// con un stagger fijo por palabra su sola entrada ocupaba más de diez
// pantallas de scroll. Con el tope, un panel largo entra igual de rápido que
// uno corto (sus ítems simplemente se escalonan más apretado).
const PANEL_MAX_STAGGER_SPREAD = 1;
// Lo mismo para las palabras de la explicación de cada nodo: tienen que
// terminar de entrar antes de que empiece su salida (WORDS_OUT_DELAY).
const WORDS_IN_MAX_SPREAD = 0.4;
const WORDS_OUT_MAX_SPREAD = 0.2;

// Pantallas de scroll por unidad de timeline. Antes 0.75: con los staggers
// sin tope, recorrer una fórmula tomaba decenas de pantallas.
const SCROLL_PER_UNIT = 0.55;

// Ancho máximo de la fórmula en reposo (fracción del viewport). Por debajo
// del 100% a propósito: el despegue necesita aire para separar los nodos.
const FORMULA_MAX_WIDTH = 0.72;
// Tamaño máximo del nodo aislado, como fracción del viewport — el zoom se
// ajusta por nodo para que ni "sin" ni "∑" se salgan de pantalla.
const ISOLATE_MAX_WIDTH = 0.7;
const ISOLATE_MAX_HEIGHT = 0.5;

// Epílogo: la fórmula sube y se encoge a un sello. El desplazamiento se
// calcula para que el sello nunca quede debajo del chrome fijo de arriba.
const SHRINK_SCALE = 0.6;
// Alto máximo del sello (fracción del viewport): en pantallas bajas la
// fórmula se encoge más para dejarle el espacio al contenido.
const SHRINK_MAX_HEIGHT = 0.13;
const SHRINK_TARGET_CENTER = 0.26;
// Franja superior reservada al chrome (menú + controles).
const CHROME_TOP = 72;
// Tope de achique de un panel del epílogo que no entra en el stage: por
// debajo de esto el texto dejaría de leerse cómodo. Lo que igual sobra se
// desplaza hacia arriba durante el hold del panel (ver panelRoll).
const PANEL_MIN_FIT = 0.8;
// Tiempo de timeline extra por viewport de contenido a desplazar.
const PANEL_ROLL_PER_VIEWPORT = 2.4;

// Snap: al soltar el scroll cerca de un momento clave (un símbolo aislado,
// un panel completo), se asienta ahí. Fracciones de alto de viewport.
const SNAP_IDLE_MS = 140;
const SNAP_AHEAD = 0.6;
const SNAP_NEAREST = 0.25;

const CONTEXT_AUTHOR_KEY = "context-author";
const CONTEXT_HISTORY_KEY = "context-history";

/** Stagger por ítem que respeta un tope de dispersión total. */
function cappedStagger(count: number, base: number, maxSpread: number) {
  return count > 1 ? Math.min(base, maxSpread / (count - 1)) : base;
}

/** Duración de la entrada con stagger de un panel, según su cantidad de ítems. */
function panelInDuration(itemCount: number, stagger: number = PANEL_ITEM_STAGGER) {
  return PANEL_IN_DURATION + stagger * Math.max(0, itemCount - 1);
}

/** Duración de la salida con stagger de un panel — el stagger de salida usa la mitad. */
function panelOutDuration(itemCount: number, stagger: number = PANEL_ITEM_STAGGER) {
  return PANEL_OUT_DURATION + (stagger / 2) * Math.max(0, itemCount - 1);
}

/** Recupera, en orden, los elementos 0..count-1 de un Map indexado por posición. */
function orderedFromMap<T>(map: Map<number, T>, count: number): T[] {
  const result: T[] = [];
  for (let index = 0; index < count; index += 1) {
    const el = map.get(index);
    if (el) result.push(el);
  }
  return result;
}

/** Scroll suave a una posición absoluta, vía Lenis si está activo. */
function smoothScrollTo(top: number) {
  const lenis = getLenis();
  if (lenis) {
    lenis.scrollTo(top, { duration: 1.2 });
    return;
  }
  const reduced = globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
  globalThis.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
}

/**
 * Espacio horizontal (px, de cada lado) que ocupa el riel de secciones, o 0
 * si está oculto (pantallas angostas). Incluye sus rótulos aunque estén en
 * opacity 0: así la fórmula nunca queda debajo del riel, ni al desplegarse.
 */
function railReserve(rail: HTMLElement | null): number {
  if (!rail || globalThis.getComputedStyle(rail).display === "none") return 0;
  return rail.getBoundingClientRect().right + 16;
}

/**
 * Cada panel del epílogo se mide contra el alto real del stage; si no entra
 * (historia larga, línea de tiempo con muchos hitos, pantalla baja), se
 * achica con un scale estático — nunca queda texto por debajo de la
 * pantalla. El scale vive en el panel, que GSAP no anima (solo a sus hijos).
 */
function fitStagePanels(stage: HTMLElement | null, panels: (HTMLElement | null)[]): number[] {
  if (!stage) return [];
  const measure = (visible: number) =>
    panels.map((panel) => {
      if (!panel) return 0;
      panel.style.transform = "";
      const natural = panel.offsetHeight;
      const fit = natural > visible && visible > 0 ? visible / natural : 1;
      const scale = Math.max(PANEL_MIN_FIT, fit);
      if (scale < 1) panel.style.transform = `scale(${String(scale)})`;
      return Math.max(0, natural * scale - visible);
    });

  stage.dataset["rolling"] = "false";
  const overflow = measure(stage.clientHeight);
  if (!overflow.some((px) => px > 0)) return overflow;

  // Algún panel se va a desplazar: el stage pasa a recortar con bordes
  // desvanecidos, y el área realmente legible es menor (padding superior +
  // fade inferior). Se vuelve a medir contra esa área, o el último ítem
  // quedaría a medio desvanecer al terminar el desplazamiento.
  stage.dataset["rolling"] = "true";
  const styles = globalThis.getComputedStyle(stage);
  const padTop = Number.parseFloat(styles.paddingTop) || 0;
  const fadeBottom = Number.parseFloat(styles.getPropertyValue("--stage-fade")) || 0;
  // +16px de respiro: el último ítem termina claramente fuera del fade aunque
  // el layout final difiera unos px de esta medición (fuentes, redondeos).
  return measure(stage.clientHeight - padTop - fadeBottom - 16);
}

function scrollToTop() {
  smoothScrollTo(0);
}

export function FormulaHero({ formula }: FormulaHeroProps) {
  const { locale, strings } = useLocale();
  const { type, typeReady } = usePreferences();

  const pathFor = (forLocale: typeof locale) => `/${forLocale}/formula/${formula.id}`;
  const description = truncate(formula.context.history[locale], DESCRIPTION_MAX_LENGTH);

  useSeo({
    locale,
    title: formula.title[locale],
    description,
    path: pathFor(locale),
    image: `${SITE_URL}/og/${formula.id}-${locale}.png`,
    alternates: locales.map((altLocale) => ({ locale: altLocale, path: pathFor(altLocale) })),
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: formula.title[locale],
      description,
      inLanguage: locale,
      author: { "@type": "Person", name: formula.context.author[locale] },
    },
  });
  const heroRef = useRef<HTMLElement>(null);
  const formulaRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLSpanElement>());
  const wordRefs = useRef(new Map<string, HTMLSpanElement[]>());
  const eraRef = useRef<HTMLParagraphElement>(null);
  const timelineRailRef = useRef<HTMLDivElement>(null);
  const timelineRowRefs = useRef(new Map<number, HTMLDivElement>());
  const useCaseRefs = useRef(new Map<number, HTMLDivElement>());
  const exampleTitleRef = useRef<HTMLParagraphElement>(null);
  const exampleLineRefs = useRef(new Map<number, HTMLParagraphElement>());
  const backLinkRef = useRef<HTMLButtonElement>(null);
  const shareLinkRef = useRef<HTMLButtonElement>(null);
  const progressRef = useRef<HTMLParagraphElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const layoutRef = useRef<{
    formulaRect: DOMRect;
    nodes: Map<string, NodeLayout>;
    /** Factor (≤ 1) con el que el auto-ajuste achicó la fórmula. */
    fitRatio: number;
    /** Desplazamiento vertical (px) de la fórmula al encogerse en el epílogo. */
    shrinkY: number;
    /** Escala del sello del epílogo (≤ SHRINK_SCALE). */
    shrinkScale: number;
    /** Px que sobran de cada panel del epílogo aun achicado (0 = entra entero). */
    panelOverflow: number[];
  } | null>(null);
  const explanationRefs = useRef(new Map<string, HTMLParagraphElement>());
  const explanationsRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stageLabelRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const railRefs = useRef(new Map<string, HTMLElement>());
  const railNavRef = useRef<HTMLElement>(null);
  // Lo setea el timeline al construirse: traduce un destino del riel a su
  // posición de scroll actual (cambia en cada rebuild/resize).
  const jumpRef = useRef<((id: string) => void) | null>(null);
  const [ready, setReady] = useState(false);
  // Se incrementa en resize/cambio de orientación para forzar una nueva
  // medición FLIP y reconstruir el timeline de GSAP con las dimensiones actuales.
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");

  const total = formula.nodes.length;
  const railSections: { id: RailSectionId; label: string }[] = [
    { id: "formula", label: strings.sectionFormula },
    { id: "symbols", label: strings.sectionSymbols },
    { id: "history", label: strings.historyTitle },
    { id: "timeline", label: strings.timelineTitle },
    { id: "usecases", label: strings.useCasesTitle },
    { id: "example", label: strings.exampleTitle },
  ];
  const formatProgress = (index: number) =>
    `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;

  useEffect(() => {
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
    const handleResize = () => {
      globalThis.clearTimeout(timeoutId);
      timeoutId = globalThis.setTimeout(() => {
        setLayoutVersion((v) => v + 1);
      }, 200);
    };
    globalThis.addEventListener("resize", handleResize);
    globalThis.addEventListener("orientationchange", handleResize);
    return () => {
      globalThis.clearTimeout(timeoutId);
      globalThis.removeEventListener("resize", handleResize);
      globalThis.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  // Al cambiar de fórmula, Lenis no debe seguir animando hacia un scroll
  // objetivo calculado contra la altura de pin anterior mientras el DOM
  // todavía se está reconstruyendo — se detiene y se vuelve al tope con
  // scroll nativo (no lenis.scrollTo, cuyo estado interno no es confiable
  // en este momento). Se reanuda más abajo, después de que ScrollTrigger.
  // refresh() asiente la nueva altura de pin (ver el setTimeout en useGSAP).
  useLayoutEffect(() => {
    // Una ancla pendiente de un cambio de tipografía no debe sobrevivir a la
    // navegación hacia otra fórmula.
    takeScrollAnchor();
    lockScroll("hero-rebuild");
    globalThis.scrollTo(0, 0);
  }, [formula.id]);

  // DESIGN.md 4.2 — captura de coordenadas (First) y fijación absoluta (Invert),
  // manteniendo el footprint del contenedor para que no se re-centre al vaciar el flujo.
  // Se repite en cada resize/rotación (layoutVersion), por lo que primero hay que
  // soltar las medidas fijas anteriores para que el navegador vuelva a fluir el
  // contenido al tamaño de viewport actual antes de volver a medir.
  // También depende de `type`: un preset tipográfico distinto cambia las
  // métricas de los glifos. `typeReady` garantiza que se mide recién cuando los
  // webfonts del preset están listos (o su fallback resolvió) — sin esto, el
  // FLIP quedaría calibrado contra glifos viejos.
  useLayoutEffect(() => {
    if (!typeReady) return;
    const formulaEl = formulaRef.current;
    if (!formulaEl) return;

    // clearProps:"all" también suelta cualquier transform que GSAP haya
    // dejado aplicado de un timeline anterior (crítico en un re-layout por
    // resize: si no se limpia, la medición siguiente parte de una posición
    // ya desplazada y la fórmula termina fuera de pantalla).
    gsap.set(formulaEl, { clearProps: "all" });
    for (const node of formula.nodes) {
      const el = nodeRefs.current.get(node.id);
      if (el) gsap.set(el, { clearProps: "all" });
    }

    // Fórmulas largas (Haversine, adición de senos…) desbordaban con el
    // tamaño de letra fijo. Se mide el ancho natural y, si excede el
    // presupuesto, se achica el cuerpo de letra en la misma proporción —
    // antes de la medición FLIP, así todo lo demás parte del tamaño final.
    const maxWidth = Math.min(
      globalThis.innerWidth * FORMULA_MAX_WIDTH,
      globalThis.innerWidth - 2 * railReserve(railNavRef.current),
    );
    // El ancho no escala perfectamente lineal con el cuerpo de letra (el
    // hinting y el redondeo de subpíxeles pesan más en tamaños chicos), así
    // que se corrige en un par de pasadas hasta entrar en el presupuesto.
    const baseSize = Number.parseFloat(globalThis.getComputedStyle(formulaEl).fontSize);
    let fitRatio = 1;
    for (let pass = 0; pass < 3; pass += 1) {
      const width = formulaEl.getBoundingClientRect().width;
      if (width <= maxWidth) break;
      fitRatio *= maxWidth / width;
      formulaEl.style.fontSize = `${String(baseSize * fitRatio)}px`;
    }

    const formulaRect = formulaEl.getBoundingClientRect();
    const nodeLayouts = new Map<string, NodeLayout>();

    for (const node of formula.nodes) {
      const el = nodeRefs.current.get(node.id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      nodeLayouts.set(node.id, {
        left: rect.left - formulaRect.left,
        top: rect.top - formulaRect.top,
        width: rect.width,
        height: rect.height,
      });
    }

    formulaEl.style.width = `${String(formulaRect.width)}px`;
    formulaEl.style.height = `${String(formulaRect.height)}px`;

    for (const [id, layout] of nodeLayouts) {
      const el = nodeRefs.current.get(id);
      if (!el) continue;
      el.style.position = "absolute";
      el.style.left = `${String(layout.left)}px`;
      el.style.top = `${String(layout.top)}px`;
      el.style.width = `${String(layout.width)}px`;
      el.style.height = `${String(layout.height)}px`;
      el.style.margin = "0";
    }

    // Epílogo: la fórmula encogida queda centrada cerca del 26% del alto,
    // pero nunca debajo del chrome; el contexto arranca justo debajo de ella
    // y ocupa exactamente lo que queda hasta el borde inferior seguro.
    const viewportHeight = globalThis.innerHeight;
    const shrinkScale = Math.max(
      0.3,
      Math.min(SHRINK_SCALE, (viewportHeight * SHRINK_MAX_HEIGHT) / formulaRect.height),
    );
    const shrunkHalf = (formulaRect.height * shrinkScale) / 2;
    const currentCenter = formulaRect.top + formulaRect.height / 2;
    const shrunkCenter = Math.max(
      viewportHeight * SHRINK_TARGET_CENTER,
      Math.max(CHROME_TOP, viewportHeight * 0.08) + shrunkHalf,
    );
    const shrinkY = shrunkCenter - currentCenter;
    const contextTop = shrunkCenter + shrunkHalf + Math.max(16, viewportHeight * 0.03);
    heroRef.current?.style.setProperty("--context-top", `${String(contextTop)}px`);
    const panelOverflow = fitStagePanels(stageRef.current, panelRefs.current);

    layoutRef.current = {
      formulaRect,
      nodes: nodeLayouts,
      fitRatio,
      shrinkY,
      shrinkScale,
      panelOverflow,
    };
    setReady(true);
  }, [formula, layoutVersion, locale, type, typeReady]);

  useGSAP(
    () => {
      if (!ready || !layoutRef.current || !heroRef.current) return;

      const {
        nodes: layouts,
        formulaRect,
        fitRatio,
        shrinkY,
        shrinkScale,
        panelOverflow,
      } = layoutRef.current;
      // Duración del desplazamiento de un panel que no entra (0 si entra).
      const panelRoll = (index: number) =>
        ((panelOverflow[index] ?? 0) / globalThis.innerHeight) * PANEL_ROLL_PER_VIEWPORT;
      const nodeEls = formula.nodes
        .map((n) => nodeRefs.current.get(n.id))
        .filter((el): el is HTMLSpanElement => !!el);

      // La separación y el zoom de aislamiento se derivan del viewport actual
      // (no de constantes fijas) para que ningún nodo termine fuera de
      // pantalla en un teléfono angosto, en landscape corto, o en un
      // viewport cuadrado — sea cual sea la orientación o el dispositivo.
      // El ancho natural de la fórmula (antes de separarse) ya ocupa la mitad
      // de ese ancho a cada lado del centro, así que hay que descontarlo del
      // presupuesto disponible: el ancho final = natural + 2 * centerIndex * spreadUnit.
      const centerIndex = (formula.nodes.length - 1) / 2;
      const availableHalfWidth = Math.min(
        (globalThis.innerWidth * 0.86) / 2,
        globalThis.innerWidth / 2 - railReserve(railNavRef.current),
      );
      const naturalHalfWidth = formulaRect.width / 2;
      const availableHalfSpread = Math.max(0, availableHalfWidth - naturalHalfWidth);
      const spreadUnit =
        centerIndex > 0
          ? Math.min(availableHalfSpread / centerIndex, globalThis.innerWidth * 0.09)
          : 0;
      const spreadX = (index: number) => (index - centerIndex) * spreadUnit;

      const viewportMin = Math.min(globalThis.innerWidth, globalThis.innerHeight);
      const baseIsolateScale = Math.min(2.4, Math.max(1.4, viewportMin / 320));
      // Zoom por nodo: una fórmula achicada por el auto-ajuste recupera el
      // tamaño de aislamiento de siempre (÷ fitRatio), pero ningún nodo
      // aislado puede exceder el viewport — ni "sin" ni "∑".
      const heroTop = heroRef.current.getBoundingClientRect().top;
      const explanationAnchor =
        (explanationsRef.current?.getBoundingClientRect().bottom ?? globalThis.innerHeight) -
        heroTop;
      const isolationArea = (nodeId: string) => {
        const textHeight = explanationRefs.current.get(nodeId)?.offsetHeight ?? 0;
        const top = Math.max(CHROME_TOP, globalThis.innerHeight * 0.1);
        const bottom =
          explanationAnchor - textHeight - Math.max(16, globalThis.innerHeight * 0.035);
        const height = Math.max(40, bottom - top);
        return { center: top + height / 2, height };
      };
      const isolateScaleFor = (nodeLayout: NodeLayout) =>
        Math.max(
          1,
          Math.min(
            baseIsolateScale / fitRatio,
            (globalThis.innerWidth * ISOLATE_MAX_WIDTH) / nodeLayout.width,
            (globalThis.innerHeight * ISOLATE_MAX_HEIGHT) / nodeLayout.height,
          ),
        );

      // "Para todos" incluye a quienes le pidieron a su sistema operativo
      // menos movimiento: el scroll sigue controlando el mismo timeline
      // (historia → línea de tiempo → casos → ejemplo no se vuelve
      // estático), pero sin rebotes elásticos y con un stagger casi plano.
      const prefersReducedMotion = globalThis.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      // Eases suaves (inOut) en vez de elásticos: con el scroll haciendo de
      // cabezal, un rebote elástico se "re-rebota" cada vez que el usuario
      // frena o retrocede, y eso se sentía tosco. El carácter se conserva con
      // un back.out leve solo donde entra contenido nuevo.
      const introEase = prefersReducedMotion ? "power1.out" : "power3.inOut";
      const isolateMoveEase = prefersReducedMotion ? "power1.out" : "power3.inOut";
      const shrinkEase = prefersReducedMotion ? "power1.out" : "power3.inOut";
      const authorEase = prefersReducedMotion ? "power1.out" : "back.out(1.3)";
      const useCaseEase = prefersReducedMotion ? "power1.out" : "back.out(1.2)";
      const baseWordInStagger = prefersReducedMotion ? 0.01 : 0.035;
      const baseWordOutStagger = prefersReducedMotion ? 0.005 : 0.02;
      const baseItemStagger = prefersReducedMotion ? 0.03 : PANEL_ITEM_STAGGER;
      // Lenis ya suaviza el scroll: sumarle un scrub largo encima hacía que
      // la animación llegara tarde respecto del gesto. Un scrub corto basta.
      const scrubValue = prefersReducedMotion ? true : getLenis() ? 0.25 : 0.45;
      const panelStagger = (count: number) =>
        cappedStagger(count, baseItemStagger, PANEL_MAX_STAGGER_SPREAD);

      // El epílogo se arma como una secuencia de bloques cuya duración depende
      // del contenido real de cada fórmula (cantidad de palabras/eventos/casos/
      // líneas), calculada por adelantado para poder dimensionar el scroll total.
      const historyWordCount = (wordRefs.current.get(CONTEXT_HISTORY_KEY) ?? []).length;
      const timelineCount = formula.context.timeline.length;
      const useCasesCount = formula.context.useCases.length;
      const exampleCount = formula.context.example.lines.length;
      const historyStagger = panelStagger(historyWordCount);
      const timelineStagger = panelStagger(timelineCount);
      const useCasesStagger = panelStagger(useCasesCount);
      const exampleStagger = panelStagger(exampleCount);

      const headerEnd =
        CONTEXT_AUTHOR_DELAY + CONTEXT_AUTHOR_DURATION + CONTEXT_ERA_DELAY + CONTEXT_ERA_DURATION;

      const historyStart = headerEnd + PANEL_GAP_BEFORE;
      const historyHoldEnd =
        historyStart +
        panelInDuration(historyWordCount, historyStagger) +
        PANEL_HOLD +
        panelRoll(0);
      const historyOutEnd = historyHoldEnd + panelOutDuration(historyWordCount, historyStagger);

      const timelineStart = historyOutEnd + PANEL_GAP_BEFORE;
      const timelineHoldEnd =
        timelineStart + panelInDuration(timelineCount, timelineStagger) + PANEL_HOLD + panelRoll(1);
      const timelineOutEnd = timelineHoldEnd + panelOutDuration(timelineCount, timelineStagger);

      const useCasesStart = timelineOutEnd + PANEL_GAP_BEFORE;
      const useCasesHoldEnd =
        useCasesStart + panelInDuration(useCasesCount, useCasesStagger) + PANEL_HOLD + panelRoll(2);
      const useCasesOutEnd = useCasesHoldEnd + panelOutDuration(useCasesCount, useCasesStagger);

      const exampleStart = useCasesOutEnd + PANEL_GAP_BEFORE;
      const exampleHoldEnd =
        exampleStart + panelInDuration(exampleCount, exampleStagger) + PANEL_HOLD + panelRoll(3);

      const backStart = exampleHoldEnd + CONTEXT_BACK_GAP;
      const epilogueDuration = backStart + CONTEXT_BACK_DURATION;

      const totalDuration = INTRO_DURATION + total * SEGMENT_DURATION + epilogueDuration;

      // Los nodos de la fórmula quedan fuera a propósito: con will-change el
      // navegador rasteriza el texto una vez a escala 1 y después solo estira
      // ese bitmap — el zoom de aislamiento se veía pixelado. Sin él (y con
      // force3D: false en sus tweens) el glifo se repinta vectorial a la
      // escala real en cada frame, nítido a cualquier zoom.
      const willChangeTargets = [
        ...[...wordRefs.current.values()].flat(),
        eraRef.current,
        timelineRailRef.current,
        ...orderedFromMap(timelineRowRefs.current, timelineCount),
        ...orderedFromMap(useCaseRefs.current, useCasesCount),
        exampleTitleRef.current,
        ...orderedFromMap(exampleLineRefs.current, exampleCount),
      ].filter((el): el is HTMLElement => !!el);

      const tl = gsap.timeline({
        defaults: { duration: 0.9, ease: "power2.out" },
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: () => `+=${String(globalThis.innerHeight * totalDuration * SCROLL_PER_UNIT)}`,
          scrub: scrubValue,
          pin: true,
          anticipatePin: 1,
          onEnter: () => {
            gsap.set(willChangeTargets, { willChange: "transform, opacity" });
          },
          onEnterBack: () => {
            gsap.set(willChangeTargets, { willChange: "transform, opacity" });
          },
          onLeave: () => {
            gsap.set(willChangeTargets, { willChange: "auto" });
          },
          onLeaveBack: () => {
            gsap.set(willChangeTargets, { willChange: "auto" });
          },
        },
      });

      // El hint ya cumplió su función en cuanto el usuario empieza a scrollear;
      // se retira para no competir por espacio con las explicaciones, sobre
      // todo en pantallas angostas donde el texto envuelve a más líneas.
      tl.to(hintRef.current, { opacity: 0, duration: 0.4 }, 0);
      // El contador ocupa el lugar del hint en cuanto este se retira.
      tl.to(progressRef.current, { opacity: 0.6, duration: 0.4 }, 0.3);

      // Estado 1 — Despegue: la fórmula entera se separa con un rebote elástico.
      for (const [index, node] of formula.nodes.entries()) {
        const el = nodeRefs.current.get(node.id);
        if (!el) continue;
        tl.to(
          el,
          { x: spreadX(index), ease: introEase, duration: INTRO_DURATION, force3D: false },
          0,
        );
      }

      // Estado 2/3 — Aislamiento de cada nodo + resolución tipográfica, uno a la vez.
      for (const [index, node] of formula.nodes.entries()) {
        const el = nodeRefs.current.get(node.id);
        const layout = layouts.get(node.id);
        if (!el || !layout) continue;

        const others = nodeEls.filter((candidate) => candidate !== el);
        const words = wordRefs.current.get(node.id) ?? [];
        const wordInStagger = cappedStagger(words.length, baseWordInStagger, WORDS_IN_MAX_SPREAD);
        const wordOutStagger = cappedStagger(
          words.length,
          baseWordOutStagger,
          WORDS_OUT_MAX_SPREAD,
        );

        // targetLeft/Top son coordenadas de viewport; layout.left/top están
        // expresadas en el espacio local de formulaRef, así que hay que restar
        // su offset (formulaRect) antes de derivar el delta de transform.
        //
        // En vertical, el nodo aislado se centra en el espacio libre entre el
        // chrome de arriba y el borde superior de SU explicación (que crece
        // hacia arriba desde el borde inferior seguro): así el símbolo y su
        // texto nunca se pisan, sea cual sea el largo de la explicación.
        const area = isolationArea(node.id);
        const nodeScale = Math.max(
          0.9,
          Math.min(isolateScaleFor(layout), (area.height * 0.9) / layout.height),
        );
        const targetLeft = globalThis.innerWidth / 2 - layout.width / 2 - formulaRect.left;
        const targetTop = area.center - layout.height / 2 - formulaRect.top;
        const targetX = targetLeft - layout.left;
        const targetY = targetTop - layout.top;

        const label = `node-${String(index)}`;
        tl.addLabel(label)
          .to(
            others,
            { opacity: 0.22, scale: 0.82, duration: ISOLATE_DIM_DURATION, force3D: false },
            label,
          )
          .to(
            el,
            {
              x: targetX,
              y: targetY,
              scale: nodeScale,
              duration: ISOLATE_MOVE_DURATION,
              ease: isolateMoveEase,
              force3D: false,
            },
            label,
          )
          .to(
            words,
            { opacity: 1, y: 0, stagger: wordInStagger, duration: WORDS_IN_DURATION },
            `${label}+=${String(WORDS_IN_DELAY)}`,
          )
          .to(
            words,
            { opacity: 0, y: "-40%", stagger: wordOutStagger, duration: WORDS_OUT_DURATION },
            `${label}+=${String(WORDS_OUT_DELAY)}`,
          )
          .to(
            el,
            {
              x: spreadX(index),
              y: 0,
              scale: 1,
              duration: RESET_DURATION,
              ease: "power2.inOut",
              force3D: false,
            },
            `${label}+=${String(RESET_DELAY)}`,
          )
          .to(
            others,
            { opacity: 1, scale: 1, duration: RESET_DURATION, force3D: false },
            `${label}+=${String(RESET_DELAY)}`,
          );
      }

      // Estado 4 — Epílogo: la fórmula se encoge a un pequeño sello que sigue
      // vivo (rebote elástico) y queda como encabezado permanente junto a
      // autor y época. Debajo, un "stage" central revela cuatro paneles —
      // historia, línea de tiempo, casos de uso y un ejemplo resuelto — uno a
      // la vez: cada uno entra con stagger, se sostiene, y sale antes de que
      // entre el siguiente (el mismo lenguaje in/hold/out del aislamiento de
      // nodos, aplicado ahora a bloques de contenido en vez de a un símbolo).
      const contextLabel = "context";
      const authorWords = wordRefs.current.get(CONTEXT_AUTHOR_KEY) ?? [];
      const historyWords = wordRefs.current.get(CONTEXT_HISTORY_KEY) ?? [];
      const timelineRows = orderedFromMap(timelineRowRefs.current, timelineCount);
      const useCaseEls = orderedFromMap(useCaseRefs.current, useCasesCount);
      const exampleLines = orderedFromMap(exampleLineRefs.current, exampleCount);
      const at = (offset: number) => `${contextLabel}+=${String(offset)}`;
      const [historyLabel, timelineLabel, useCasesLabel, exampleLabel] = stageLabelRefs.current;
      // El rótulo de cada panel ("Historia", "Línea de tiempo"…) entra con su
      // panel y sale con él — antes nacía en opacity 0 y nunca se mostraba.
      const labelIn = (label: HTMLElement | null | undefined, start: number) => {
        if (label) tl.to(label, { opacity: 1, y: 0, duration: PANEL_IN_DURATION }, at(start));
      };
      const labelOut = (label: HTMLElement | null | undefined, start: number) => {
        if (label) {
          tl.to(label, { opacity: 0, y: "-40%", duration: PANEL_OUT_DURATION }, at(start));
        }
      };

      tl.addLabel(contextLabel)
        .to(
          nodeEls,
          {
            y: shrinkY,
            scale: shrinkScale,
            opacity: 0.55,
            stagger: 0.02,
            duration: CONTEXT_SHRINK_DURATION,
            ease: shrinkEase,
            force3D: false,
          },
          contextLabel,
        )
        .to(
          authorWords,
          {
            opacity: 1,
            y: 0,
            stagger: baseWordInStagger,
            duration: CONTEXT_AUTHOR_DURATION,
            ease: authorEase,
          },
          at(CONTEXT_AUTHOR_DELAY),
        )
        .to(
          eraRef.current,
          { opacity: 1, y: 0, duration: CONTEXT_ERA_DURATION },
          at(CONTEXT_AUTHOR_DELAY + CONTEXT_AUTHOR_DURATION + CONTEXT_ERA_DELAY),
        );

      // Paneles que no entran ni achicados: su contenido sube (como créditos)
      // durante el hold, a velocidad constante, y se lee completo.
      // Cada desplazamiento suma una parada al final: el snap y el teclado
      // pasan también por "el panel ya se leyó entero", no solo por su entrada.
      const rollStops: number[] = [];
      const rollPanel = (index: number, start: number) => {
        const panel = panelRefs.current[index];
        const px = panelOverflow[index] ?? 0;
        if (!panel || px <= 0) return;
        rollStops.push(
          (tl.labels[contextLabel] ?? 0) + start + PANEL_HOLD * 0.35 + panelRoll(index),
        );
        tl.fromTo(
          panel,
          { y: 0 },
          { y: -px, ease: "none", duration: panelRoll(index), force3D: false },
          at(start + PANEL_HOLD * 0.35),
        );
      };
      rollPanel(0, historyStart + panelInDuration(historyWordCount, historyStagger));
      rollPanel(1, timelineStart + panelInDuration(timelineCount, timelineStagger));
      rollPanel(2, useCasesStart + panelInDuration(useCasesCount, useCasesStagger));
      rollPanel(3, exampleStart + panelInDuration(exampleCount, exampleStagger));

      labelIn(historyLabel, historyStart);
      labelOut(historyLabel, historyHoldEnd);
      labelIn(timelineLabel, timelineStart);
      labelOut(timelineLabel, timelineHoldEnd);
      labelIn(useCasesLabel, useCasesStart);
      labelOut(useCasesLabel, useCasesHoldEnd);
      labelIn(exampleLabel, exampleStart);

      // Panel 1 — Historia: el mismo idioma tipográfico palabra a palabra que
      // ya usan las explicaciones de cada nodo.
      tl.to(
        historyWords,
        { opacity: 1, y: 0, stagger: historyStagger, duration: PANEL_IN_DURATION },
        at(historyStart),
      ).to(
        historyWords,
        { opacity: 0, y: "-30%", stagger: historyStagger * 0.5, duration: PANEL_OUT_DURATION },
        at(historyHoldEnd),
      );

      // Panel 2 — Línea de tiempo: un riel vertical se dibuja (scaleY) mientras
      // cada hito entra deslizándose desde la izquierda.
      tl.to(
        timelineRailRef.current,
        { scaleY: 1, duration: panelInDuration(timelineCount, timelineStagger) },
        at(timelineStart),
      )
        .to(
          timelineRows,
          {
            opacity: 1,
            x: 0,
            stagger: timelineStagger,
            duration: PANEL_IN_DURATION,
            ease: "power2.out",
          },
          at(timelineStart),
        )
        .to(
          timelineRows,
          {
            opacity: 0,
            x: "16%",
            stagger: timelineStagger * 0.5,
            duration: PANEL_OUT_DURATION,
          },
          at(timelineHoldEnd),
        )
        .to(
          timelineRailRef.current,
          { opacity: 0, duration: PANEL_OUT_DURATION },
          at(timelineHoldEnd),
        );

      // Panel 3 — Casos de uso: las tarjetas caen y se enderezan con rebote,
      // como si se repartieran una a una.
      tl.to(
        useCaseEls,
        {
          opacity: 1,
          y: 0,
          rotate: 0,
          stagger: useCasesStagger,
          duration: PANEL_IN_DURATION,
          ease: useCaseEase,
        },
        at(useCasesStart),
      ).to(
        useCaseEls,
        { opacity: 0, y: "-18%", stagger: useCasesStagger * 0.5, duration: PANEL_OUT_DURATION },
        at(useCasesHoldEnd),
      );

      // Panel 4 — Ejemplo resuelto: líneas monoespaciadas revelándose como en
      // una terminal. Es el último panel: no sale, queda como cierre.
      tl.to(
        exampleTitleRef.current,
        { opacity: 1, y: 0, duration: PANEL_IN_DURATION },
        at(exampleStart),
      ).to(
        exampleLines,
        {
          opacity: 1,
          x: 0,
          stagger: exampleStagger,
          duration: PANEL_IN_DURATION,
          ease: "power2.out",
        },
        at(exampleStart),
      );

      tl.to(
        [backLinkRef.current, shareLinkRef.current],
        { opacity: 0.7, duration: CONTEXT_BACK_DURATION },
        at(backStart),
      ).to(progressRef.current, { opacity: 0, duration: CONTEXT_BACK_DURATION }, at(backStart));

      // Riel de secciones: cada destino sabe desde qué tiempo cuenta como
      // activo y a qué tiempo saltar — el momento en que su contenido ya
      // terminó de entrar, no el primer frame (que estaría vacío).
      const contextTime = tl.labels[contextLabel] ?? 0;
      const nodeTargets: RailTarget[] = formula.nodes.map((_, index) => {
        const start = tl.labels[`node-${String(index)}`] ?? 0;
        return { id: `node-${String(index)}`, start, target: start + ISOLATE_MOVE_DURATION };
      });
      const railTargets: RailTarget[] = [
        { id: "formula", start: 0, target: 0 },
        ...nodeTargets,
        {
          id: "history",
          start: contextTime,
          target: contextTime + historyStart + panelInDuration(historyWordCount, historyStagger),
        },
        {
          id: "timeline",
          start: contextTime + historyOutEnd,
          target: contextTime + timelineStart + panelInDuration(timelineCount, timelineStagger),
        },
        {
          id: "usecases",
          start: contextTime + timelineOutEnd,
          target: contextTime + useCasesStart + panelInDuration(useCasesCount, useCasesStagger),
        },
        { id: "example", start: contextTime + useCasesOutEnd, target: tl.duration() },
      ];

      jumpRef.current = (id: string) => {
        const st = tl.scrollTrigger;
        const destination = railTargets.find((item) => item.id === id);
        if (!st || !destination) return;
        const progress = tl.duration() > 0 ? destination.target / tl.duration() : 0;
        smoothScrollTo(st.start + progress * (st.end - st.start));
      };

      // Momentos clave del recorrido, en posición de scroll. Se recalculan en
      // cada uso: un refresh de ScrollTrigger mueve start/end.
      const stopTimes = [
        ...new Set([...railTargets.map((item) => item.target), ...rollStops]),
      ].sort((a, b) => a - b);
      const stopPositions = () => {
        const st = tl.scrollTrigger;
        if (!st || tl.duration() <= 0) return [];
        return stopTimes.map((time) => st.start + (time / tl.duration()) * (st.end - st.start));
      };

      // Teclado: ↓/PageDown/Espacio avanzan al siguiente momento clave, ↑/
      // PageUp/Shift+Espacio vuelven — un paso claro por tecla, en vez del
      // salto de 40px del scroll nativo que no se corresponde con nada.
      const lenis = getLenis();
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
        if (document.documentElement.classList.contains("is-scroll-locked")) return;
        const target = event.target;
        if (target instanceof HTMLElement) {
          if (
            target.isContentEditable ||
            ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
          ) {
            return;
          }
          if (event.key === " " && ["BUTTON", "A"].includes(target.tagName)) return;
        }
        const forward =
          event.key === "ArrowDown" ||
          event.key === "PageDown" ||
          (event.key === " " && !event.shiftKey);
        const backward =
          event.key === "ArrowUp" ||
          event.key === "PageUp" ||
          (event.key === " " && event.shiftKey);
        if (!forward && !backward) return;
        const st = tl.scrollTrigger;
        // targetScroll: pulsaciones seguidas encadenan pasos aunque el scroll
        // anterior todavía esté animando.
        const y = lenis?.targetScroll ?? globalThis.scrollY;
        if (!st || y > st.end + 2) return;
        const positions = stopPositions();
        const next = forward
          ? positions.find((position) => position > y + 4)
          : [...positions].reverse().find((position) => position < y - 4);
        if (next === undefined) return;
        event.preventDefault();
        smoothScrollTo(next);
      };
      globalThis.addEventListener("keydown", handleKeyDown);

      // Snap direccional: cuando el scroll se detiene, si hay un momento
      // clave cerca en la dirección en que se venía moviendo, se asienta ahí;
      // si no, solo se corrige hacia el más cercano cuando está muy cerca.
      // Así cada gesto termina en un estado legible (un símbolo aislado con
      // su texto, un panel completo) y nunca a mitad de una transición.
      let idleTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
      let snapping = false;
      const releaseSnap = () => {
        snapping = false;
      };
      const handleLenisScroll = () => {
        globalThis.clearTimeout(idleTimer);
        if (snapping || !lenis) return;
        const direction = lenis.direction;
        idleTimer = globalThis.setTimeout(() => {
          const st = tl.scrollTrigger;
          if (!st || lenis.isStopped) return;
          const y = lenis.scroll;
          if (y < st.start - 1 || y > st.end + 1) return;
          const positions = stopPositions();
          const viewport = globalThis.innerHeight;
          const ahead =
            direction > 0
              ? positions.find((position) => position >= y)
              : [...positions].reverse().find((position) => position <= y);
          let nearest: number | undefined;
          for (const position of positions) {
            if (nearest === undefined || Math.abs(position - y) < Math.abs(nearest - y)) {
              nearest = position;
            }
          }
          const candidate =
            ahead !== undefined && Math.abs(ahead - y) <= viewport * SNAP_AHEAD
              ? ahead
              : nearest !== undefined && Math.abs(nearest - y) <= viewport * SNAP_NEAREST
                ? nearest
                : undefined;
          if (candidate === undefined || Math.abs(candidate - y) < 2) return;
          snapping = true;
          // Respaldo: si el usuario retoma el scroll, Lenis cancela el
          // scrollTo y onComplete no llega.
          globalThis.setTimeout(releaseSnap, 900);
          lenis.scrollTo(candidate, {
            duration: 0.65,
            easing: (t: number) => 1 - (1 - t) ** 3,
            onComplete: releaseSnap,
          });
        }, SNAP_IDLE_MS);
      };
      const offLenisScroll = lenis?.on("scroll", handleLenisScroll);

      let activeRailId = "";
      const setRailActive = (id: string) => {
        if (id === activeRailId) return;
        activeRailId = id;
        const symbolsActive = id.startsWith("node-");
        for (const [key, el] of railRefs.current) {
          const active = key === id || (key === "symbols" && symbolsActive);
          el.dataset["active"] = String(active);
        }
      };

      tl.eventCallback("onUpdate", () => {
        const time = tl.time();
        const el = progressRef.current;
        if (el) {
          const index =
            time <= INTRO_DURATION
              ? 0
              : Math.min(total - 1, Math.floor((time - INTRO_DURATION) / SEGMENT_DURATION));
          el.textContent = formatProgress(index);
        }
        let current = "formula";
        for (const item of railTargets) {
          if (time >= item.start) current = item.id;
        }
        setRailActive(current);
      });
      setRailActive("formula");

      // Rebuild por cambio de tipografía: la reversión del pin encogió el
      // documento, el FORCE-layout de la medición clampó el scroll a 0, y el
      // spacing del pin recién queda aplicado con un refresh. Acá se refresca
      // sincrónico (la carrera que obliga al setTimeout de abajo es la del pin
      // anterior al cambiar de FÓRMULA, no este caso) y se restaura la
      // posición de lectura en el mismo tick, sin frame visible — ver
      // src/lib/scroll-anchor.ts.
      const anchor = takeScrollAnchor();
      if (anchor !== null) {
        ScrollTrigger.refresh();
        globalThis.scrollTo(0, anchor);
        ScrollTrigger.update();
      }

      // Al cambiar de fórmula, el pin-spacer anterior puede seguir
      // desmontándose justo cuando este ScrollTrigger calcula su "end" por
      // primera vez, dejándolo con un rango de pin nulo. Un refresh diferido
      // recalcula todo contra el DOM ya asentado. setTimeout (no rAF): un
      // rAF puede no dispararse nunca si la pestaña no está visible/activa.
      globalThis.setTimeout(() => {
        ScrollTrigger.refresh();
        // Lenis debe re-medir contra la altura de pin ya asentada por el
        // refresh de arriba (no antes), o cachea la altura de la fórmula
        // anterior y el scroll queda mal calibrado — el mismo tipo de bug
        // que hizo descartar normalizeScroll().
        getLenis()?.resize();
        unlockScroll("hero-rebuild");
      }, 0);

      return () => {
        globalThis.removeEventListener("keydown", handleKeyDown);
        globalThis.clearTimeout(idleTimer);
        offLenisScroll?.();
      };
    },
    // `revertOnUpdate` es imprescindible: sin él, useGSAP acumula el timeline
    // y el ScrollTrigger con pin de cada re-ejecución (resize, cambio de
    // preset tipográfico) y dos pins peleando por el mismo .hero colapsan el
    // pin-spacer — la fórmula queda fuera de pantalla.
    {
      scope: heroRef,
      dependencies: [ready, formula, layoutVersion, locale, type],
      revertOnUpdate: true,
    },
  );

  const handleShare = async () => {
    const title = formula.title[locale];
    const text = formula.context.history[locale].slice(0, 140);
    const url = globalThis.location.href;

    // La misma tarjeta que genera scripts/generate-og-images.tsx para Open
    // Graph — reusarla acá hace que "compartir" adjunte una imagen prolija
    // de la fórmula en vez de solo un link pelado. Ruta relativa al origen
    // actual (no SITE_URL, que es fijo a producción): así funciona igual en
    // dev/preview local que en el sitio publicado. Solo existe como
    // artefacto de build (dist/og/), así que en `pnpm dev` el fetch 404 y
    // se sigue sin imagen.
    let file: File | undefined;
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const response = await fetch(`${base}/og/${formula.id}-${locale}.png`);
      if (response.ok) {
        const blob = await response.blob();
        file = new File([blob], `${formula.id}-${locale}.png`, { type: "image/png" });
      }
    } catch {
      // Sin conexión a la imagen (ej. en dev) — se sigue sin ella.
    }

    if (file && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ title, text, url, files: [file] });
      } catch {
        // El usuario canceló el share sheet nativo — no es un error a reportar.
      }
      return;
    }

    if (file) {
      const objectUrl = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(objectUrl);
    }

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // El usuario canceló el share sheet nativo — no es un error a reportar.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      globalThis.setTimeout(() => {
        setShareState("idle");
      }, 2000);
    } catch {
      // Sin Web Share API ni Clipboard API (ej. contexto no seguro) no hay
      // fallback razonable más allá de dejar que el usuario copie la URL a mano.
    }
  };

  return (
    <section ref={heroRef} className="hero" aria-label={formula.title[locale]}>
      <div ref={formulaRef} className="hero__formula fx-display" aria-hidden="true">
        {formula.nodes.map((node) => (
          <span
            key={node.id}
            ref={(el) => {
              if (el) nodeRefs.current.set(node.id, el);
            }}
            className={`node node--${node.type}`}
          >
            {node.value}
          </span>
        ))}
      </div>

      <div className="hero__explanations" ref={explanationsRef}>
        {formula.nodes.map((node) => (
          <p
            key={node.id}
            className="explanation"
            ref={(el) => {
              if (el) explanationRefs.current.set(node.id, el);
            }}
          >
            {splitWords(node.explanation[locale], locale).map((word, wordIndex) => (
              <span className="word" key={wordIndex}>
                <span
                  className="word__inner"
                  ref={(el) => {
                    if (!el) return;
                    const words = wordRefs.current.get(node.id) ?? [];
                    words[wordIndex] = el;
                    wordRefs.current.set(node.id, words);
                  }}
                >
                  {word}
                </span>
              </span>
            ))}
          </p>
        ))}
      </div>

      <div className="hero__context">
        <p className="context__author fx-display">
          {splitWords(formula.context.author[locale], locale).map((word, wordIndex) => (
            <span className="word" key={wordIndex}>
              <span
                className="word__inner"
                ref={(el) => {
                  if (!el) return;
                  const words = wordRefs.current.get(CONTEXT_AUTHOR_KEY) ?? [];
                  words[wordIndex] = el;
                  wordRefs.current.set(CONTEXT_AUTHOR_KEY, words);
                }}
              >
                {word}
              </span>
            </span>
          ))}
        </p>

        <p className="context__era" ref={eraRef}>
          {formula.context.era[locale]}
        </p>

        <div className="context__stage" ref={stageRef}>
          <div
            className="stage__panel"
            ref={(el) => {
              panelRefs.current[0] = el;
            }}
          >
            <p
              className="stage__label"
              ref={(el) => {
                stageLabelRefs.current[0] = el;
              }}
            >
              {strings.historyTitle}
            </p>
            <p className="stage__text">
              {splitWords(formula.context.history[locale], locale).map((word, wordIndex) => (
                <span className="word" key={wordIndex}>
                  <span
                    className="word__inner"
                    ref={(el) => {
                      if (!el) return;
                      const words = wordRefs.current.get(CONTEXT_HISTORY_KEY) ?? [];
                      words[wordIndex] = el;
                      wordRefs.current.set(CONTEXT_HISTORY_KEY, words);
                    }}
                  >
                    {word}
                  </span>
                </span>
              ))}
            </p>
          </div>

          <div
            className="stage__panel"
            ref={(el) => {
              panelRefs.current[1] = el;
            }}
          >
            <p
              className="stage__label"
              ref={(el) => {
                stageLabelRefs.current[1] = el;
              }}
            >
              {strings.timelineTitle}
            </p>
            <div className="timeline">
              <div className="timeline__rail" ref={timelineRailRef} />
              {formula.context.timeline.map((event, index) => (
                <div
                  className="timeline__row"
                  key={`${event.year}-${String(index)}`}
                  ref={(el) => {
                    if (el) timelineRowRefs.current.set(index, el);
                  }}
                >
                  <span className="timeline__year">{event.year}</span>
                  <span className="timeline__text">{event.label[locale]}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="stage__panel"
            ref={(el) => {
              panelRefs.current[2] = el;
            }}
          >
            <p
              className="stage__label"
              ref={(el) => {
                stageLabelRefs.current[2] = el;
              }}
            >
              {strings.useCasesTitle}
            </p>
            <div className="usecases">
              {formula.context.useCases.map((useCase, index) => (
                <div
                  className="usecase"
                  key={`${useCase.title[locale]}-${String(index)}`}
                  ref={(el) => {
                    if (el) useCaseRefs.current.set(index, el);
                  }}
                >
                  <p className="usecase__title">{useCase.title[locale]}</p>
                  <p className="usecase__desc">{useCase.description[locale]}</p>
                </div>
              ))}
            </div>
          </div>

          <div
            className="stage__panel"
            ref={(el) => {
              panelRefs.current[3] = el;
            }}
          >
            <p
              className="stage__label"
              ref={(el) => {
                stageLabelRefs.current[3] = el;
              }}
            >
              {strings.exampleTitle}
            </p>
            <p className="example__title" ref={exampleTitleRef}>
              {formula.context.example.title[locale]}
            </p>
            <div className="example">
              {formula.context.example.lines.map((line, index) => (
                <p
                  className="example__line"
                  key={`${line[locale]}-${String(index)}`}
                  ref={(el) => {
                    if (el) exampleLineRefs.current.set(index, el);
                  }}
                >
                  {line[locale]}
                  {index === formula.context.example.lines.length - 1 && (
                    <span className="example__cursor" aria-hidden="true">
                      _
                    </span>
                  )}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="context__actions">
          <button type="button" className="context__back" ref={backLinkRef} onClick={scrollToTop}>
            {strings.backToFormula}
          </button>
          <button
            type="button"
            className="context__back"
            ref={shareLinkRef}
            onClick={() => {
              void handleShare();
            }}
          >
            {shareState === "copied" ? strings.linkCopied : strings.share}
          </button>
        </div>
      </div>

      <nav className="hero__rail" ref={railNavRef} aria-label={strings.sectionsLabel}>
        <ol className="rail">
          {railSections.map((section, sectionIndex) => (
            <li className="rail__item" key={section.id}>
              <button
                type="button"
                className="rail__link"
                data-active={section.id === "formula"}
                ref={(el) => {
                  if (el) railRefs.current.set(section.id, el);
                }}
                onClick={() => {
                  jumpRef.current?.(section.id === "symbols" ? "node-0" : section.id);
                }}
              >
                <span className="rail__index">{String(sectionIndex + 1).padStart(2, "0")}</span>
                <span className="rail__label">{section.label}</span>
              </button>
              {section.id === "symbols" && (
                <span className="rail__glyphs">
                  {formula.nodes.map((node, index) => (
                    <button
                      type="button"
                      key={node.id}
                      className="rail__glyph"
                      data-active="false"
                      aria-label={`${strings.sectionSymbols} ${String(index + 1)}: ${node.value}`}
                      ref={(el) => {
                        if (el) railRefs.current.set(`node-${String(index)}`, el);
                      }}
                      onClick={() => {
                        jumpRef.current?.(`node-${String(index)}`);
                      }}
                    >
                      {node.value}
                    </button>
                  ))}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <p className="hero__progress" ref={progressRef} aria-hidden="true">
        {formatProgress(0)}
      </p>
      <p className="hero__hint" ref={hintRef}>
        {strings.scrollHint}
      </p>
    </section>
  );
}
