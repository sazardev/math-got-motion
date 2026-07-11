import { useGSAP } from "@gsap/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useLocale } from "../../i18n/locale-context";
import { gsap, ScrollTrigger } from "../../lib/gsap";

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
const PANEL_HOLD = 0.9;
const PANEL_OUT_DURATION = 0.4;

const CONTEXT_BACK_GAP = 0.5;
const CONTEXT_BACK_DURATION = 0.5;

const CONTEXT_AUTHOR_KEY = "context-author";
const CONTEXT_HISTORY_KEY = "context-history";

/** Duración de la entrada con stagger de un panel, según su cantidad de ítems. */
function panelInDuration(itemCount: number) {
  return PANEL_IN_DURATION + PANEL_ITEM_STAGGER * Math.max(0, itemCount - 1);
}

/** Duración de la salida con stagger de un panel — el stagger de salida usa la mitad. */
function panelOutDuration(itemCount: number) {
  return PANEL_OUT_DURATION + (PANEL_ITEM_STAGGER / 2) * Math.max(0, itemCount - 1);
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

function scrollToTop() {
  globalThis.scrollTo({ top: 0, behavior: "smooth" });
}

export function FormulaHero({ formula }: FormulaHeroProps) {
  const { locale, strings } = useLocale();
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
  const progressRef = useRef<HTMLParagraphElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const layoutRef = useRef<{ formulaRect: DOMRect; nodes: Map<string, NodeLayout> } | null>(null);
  const [ready, setReady] = useState(false);
  // Se incrementa en resize/cambio de orientación para forzar una nueva
  // medición FLIP y reconstruir el timeline de GSAP con las dimensiones actuales.
  const [layoutVersion, setLayoutVersion] = useState(0);

  const total = formula.nodes.length;
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

  // DESIGN.md 4.2 — captura de coordenadas (First) y fijación absoluta (Invert),
  // manteniendo el footprint del contenedor para que no se re-centre al vaciar el flujo.
  // Se repite en cada resize/rotación (layoutVersion), por lo que primero hay que
  // soltar las medidas fijas anteriores para que el navegador vuelva a fluir el
  // contenido al tamaño de viewport actual antes de volver a medir.
  useLayoutEffect(() => {
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

    layoutRef.current = { formulaRect, nodes: nodeLayouts };
    setReady(true);
  }, [formula, layoutVersion]);

  useGSAP(
    () => {
      if (!ready || !layoutRef.current || !heroRef.current) return;

      const { nodes: layouts, formulaRect } = layoutRef.current;
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
      const availableHalfWidth = (globalThis.innerWidth * 0.86) / 2;
      const naturalHalfWidth = formulaRect.width / 2;
      const availableHalfSpread = Math.max(0, availableHalfWidth - naturalHalfWidth);
      const spreadUnit =
        centerIndex > 0
          ? Math.min(availableHalfSpread / centerIndex, globalThis.innerWidth * 0.09)
          : 0;
      const spreadX = (index: number) => (index - centerIndex) * spreadUnit;

      const viewportMin = Math.min(globalThis.innerWidth, globalThis.innerHeight);
      const isolateScale = Math.min(2.4, Math.max(1.4, viewportMin / 320));

      // El epílogo se arma como una secuencia de bloques cuya duración depende
      // del contenido real de cada fórmula (cantidad de palabras/eventos/casos/
      // líneas), calculada por adelantado para poder dimensionar el scroll total.
      const historyWordCount = (wordRefs.current.get(CONTEXT_HISTORY_KEY) ?? []).length;
      const timelineCount = formula.context.timeline.length;
      const useCasesCount = formula.context.useCases.length;
      const exampleCount = formula.context.example.lines.length;

      const headerEnd =
        CONTEXT_AUTHOR_DELAY + CONTEXT_AUTHOR_DURATION + CONTEXT_ERA_DELAY + CONTEXT_ERA_DURATION;

      const historyStart = headerEnd + PANEL_GAP_BEFORE;
      const historyHoldEnd = historyStart + panelInDuration(historyWordCount) + PANEL_HOLD;
      const historyOutEnd = historyHoldEnd + panelOutDuration(historyWordCount);

      const timelineStart = historyOutEnd + PANEL_GAP_BEFORE;
      const timelineHoldEnd = timelineStart + panelInDuration(timelineCount) + PANEL_HOLD;
      const timelineOutEnd = timelineHoldEnd + panelOutDuration(timelineCount);

      const useCasesStart = timelineOutEnd + PANEL_GAP_BEFORE;
      const useCasesHoldEnd = useCasesStart + panelInDuration(useCasesCount) + PANEL_HOLD;
      const useCasesOutEnd = useCasesHoldEnd + panelOutDuration(useCasesCount);

      const exampleStart = useCasesOutEnd + PANEL_GAP_BEFORE;
      const exampleHoldEnd = exampleStart + panelInDuration(exampleCount) + PANEL_HOLD;

      const backStart = exampleHoldEnd + CONTEXT_BACK_GAP;
      const epilogueDuration = backStart + CONTEXT_BACK_DURATION;

      const totalDuration = INTRO_DURATION + total * SEGMENT_DURATION + epilogueDuration;

      const tl = gsap.timeline({
        defaults: { duration: 0.9, ease: "power2.out" },
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: () => `+=${String(globalThis.innerHeight * totalDuration * 0.85)}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
        },
      });

      // El hint ya cumplió su función en cuanto el usuario empieza a scrollear;
      // se retira para no competir por espacio con las explicaciones, sobre
      // todo en pantallas angostas donde el texto envuelve a más líneas.
      tl.to(hintRef.current, { opacity: 0, duration: 0.4 }, 0);

      // Estado 1 — Despegue: la fórmula entera se separa con un rebote elástico.
      for (const [index, node] of formula.nodes.entries()) {
        const el = nodeRefs.current.get(node.id);
        if (!el) continue;
        tl.to(el, { x: spreadX(index), ease: "elastic.out(1, 0.6)", duration: INTRO_DURATION }, 0);
      }

      // Estado 2/3 — Aislamiento de cada nodo + resolución tipográfica, uno a la vez.
      for (const [index, node] of formula.nodes.entries()) {
        const el = nodeRefs.current.get(node.id);
        const layout = layouts.get(node.id);
        if (!el || !layout) continue;

        const others = nodeEls.filter((candidate) => candidate !== el);
        const words = wordRefs.current.get(node.id) ?? [];

        // targetLeft/Top son coordenadas de viewport; layout.left/top están
        // expresadas en el espacio local de formulaRef, así que hay que restar
        // su offset (formulaRect) antes de derivar el delta de transform.
        const targetLeft = globalThis.innerWidth / 2 - layout.width / 2 - formulaRect.left;
        const targetTop = globalThis.innerHeight / 2 - layout.height / 2 - formulaRect.top;
        const targetX = targetLeft - layout.left;
        const targetY = targetTop - layout.top;

        const label = `node-${String(index)}`;
        tl.addLabel(label)
          .to(others, { opacity: 0.22, scale: 0.82, duration: ISOLATE_DIM_DURATION }, label)
          .to(
            el,
            {
              x: targetX,
              y: targetY,
              scale: isolateScale,
              duration: ISOLATE_MOVE_DURATION,
              ease: "elastic.out(1, 0.75)",
            },
            label,
          )
          .to(
            words,
            { opacity: 1, y: 0, stagger: 0.035, duration: WORDS_IN_DURATION },
            `${label}+=${String(WORDS_IN_DELAY)}`,
          )
          .to(
            words,
            { opacity: 0, y: "-40%", stagger: 0.02, duration: WORDS_OUT_DURATION },
            `${label}+=${String(WORDS_OUT_DELAY)}`,
          )
          .to(
            el,
            { x: spreadX(index), y: 0, scale: 1, duration: RESET_DURATION },
            `${label}+=${String(RESET_DELAY)}`,
          )
          .to(
            others,
            { opacity: 1, scale: 1, duration: RESET_DURATION },
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
      const shrinkY = -globalThis.innerHeight * 0.24;
      const at = (offset: number) => `${contextLabel}+=${String(offset)}`;

      tl.addLabel(contextLabel)
        .to(
          nodeEls,
          {
            y: shrinkY,
            scale: 0.6,
            opacity: 0.55,
            stagger: 0.02,
            duration: CONTEXT_SHRINK_DURATION,
            ease: "elastic.out(1, 0.65)",
          },
          contextLabel,
        )
        .to(
          authorWords,
          {
            opacity: 1,
            y: 0,
            stagger: 0.04,
            duration: CONTEXT_AUTHOR_DURATION,
            ease: "back.out(1.7)",
          },
          at(CONTEXT_AUTHOR_DELAY),
        )
        .to(
          eraRef.current,
          { opacity: 1, y: 0, duration: CONTEXT_ERA_DURATION },
          at(CONTEXT_AUTHOR_DELAY + CONTEXT_AUTHOR_DURATION + CONTEXT_ERA_DELAY),
        );

      // Panel 1 — Historia: el mismo idioma tipográfico palabra a palabra que
      // ya usan las explicaciones de cada nodo.
      tl.to(
        historyWords,
        { opacity: 1, y: 0, stagger: PANEL_ITEM_STAGGER, duration: PANEL_IN_DURATION },
        at(historyStart),
      ).to(
        historyWords,
        { opacity: 0, y: "-30%", stagger: PANEL_ITEM_STAGGER * 0.5, duration: PANEL_OUT_DURATION },
        at(historyHoldEnd),
      );

      // Panel 2 — Línea de tiempo: un riel vertical se dibuja (scaleY) mientras
      // cada hito entra deslizándose desde la izquierda.
      tl.to(
        timelineRailRef.current,
        { scaleY: 1, duration: panelInDuration(timelineCount) },
        at(timelineStart),
      )
        .to(
          timelineRows,
          {
            opacity: 1,
            x: 0,
            stagger: PANEL_ITEM_STAGGER,
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
            stagger: PANEL_ITEM_STAGGER * 0.5,
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
          stagger: PANEL_ITEM_STAGGER,
          duration: PANEL_IN_DURATION,
          ease: "back.out(1.6)",
        },
        at(useCasesStart),
      ).to(
        useCaseEls,
        { opacity: 0, y: "-18%", stagger: PANEL_ITEM_STAGGER * 0.5, duration: PANEL_OUT_DURATION },
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
          stagger: PANEL_ITEM_STAGGER,
          duration: PANEL_IN_DURATION,
          ease: "power2.out",
        },
        at(exampleStart),
      );

      tl.to(backLinkRef.current, { opacity: 0.7, duration: CONTEXT_BACK_DURATION }, at(backStart));

      tl.eventCallback("onUpdate", () => {
        const el = progressRef.current;
        if (!el) return;
        const time = tl.time();
        const index =
          time <= INTRO_DURATION
            ? 0
            : Math.min(total - 1, Math.floor((time - INTRO_DURATION) / SEGMENT_DURATION));
        el.textContent = formatProgress(index);
      });

      // Al cambiar de fórmula, el pin-spacer anterior puede seguir
      // desmontándose justo cuando este ScrollTrigger calcula su "end" por
      // primera vez, dejándolo con un rango de pin nulo. Un refresh diferido
      // recalcula todo contra el DOM ya asentado. setTimeout (no rAF): un
      // rAF puede no dispararse nunca si la pestaña no está visible/activa.
      globalThis.setTimeout(() => {
        ScrollTrigger.refresh();
      }, 0);
    },
    { scope: heroRef, dependencies: [ready, formula, layoutVersion] },
  );

  return (
    <section ref={heroRef} className="hero" aria-label={formula.title[locale]}>
      <div ref={formulaRef} className="hero__formula" aria-hidden="true">
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

      <div className="hero__explanations">
        {formula.nodes.map((node) => (
          <p key={node.id} className="explanation">
            {node.explanation[locale].split(" ").map((word, wordIndex) => (
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
        <p className="context__author">
          {formula.context.author[locale].split(" ").map((word, wordIndex) => (
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

        <div className="context__stage">
          <div className="stage__panel">
            <p className="stage__label">{strings.historyTitle}</p>
            <p className="stage__text">
              {formula.context.history[locale].split(" ").map((word, wordIndex) => (
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

          <div className="stage__panel">
            <p className="stage__label">{strings.timelineTitle}</p>
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

          <div className="stage__panel">
            <p className="stage__label">{strings.useCasesTitle}</p>
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

          <div className="stage__panel">
            <p className="stage__label">{strings.exampleTitle}</p>
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

        <button type="button" className="context__back" ref={backLinkRef} onClick={scrollToTop}>
          {strings.backToFormula}
        </button>
      </div>

      <p className="hero__progress" ref={progressRef} aria-hidden="true">
        {formatProgress(0)}
      </p>
      <p className="hero__hint" ref={hintRef}>
        {strings.scrollHint}
      </p>
    </section>
  );
}
