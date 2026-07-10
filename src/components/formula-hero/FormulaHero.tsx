import { useGSAP } from "@gsap/react";
import { useLayoutEffect, useRef, useState } from "react";

import { gsap } from "../../lib/gsap";

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

export function FormulaHero({ formula }: FormulaHeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const formulaRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLSpanElement>());
  const wordRefs = useRef(new Map<string, HTMLSpanElement[]>());
  const layoutRef = useRef<{ formulaRect: DOMRect; nodes: Map<string, NodeLayout> } | null>(null);
  const [ready, setReady] = useState(false);

  // DESIGN.md 4.2 — captura de coordenadas (First) y fijación absoluta (Invert),
  // manteniendo el footprint del contenedor para que no se re-centre al vaciar el flujo.
  useLayoutEffect(() => {
    const formulaEl = formulaRef.current;
    if (!formulaEl) return;

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
  }, [formula]);

  useGSAP(
    () => {
      if (!ready || !layoutRef.current || !heroRef.current) return;

      const reduceMotion = globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const { nodes: layouts, formulaRect } = layoutRef.current;
      const nodeEls = formula.nodes
        .map((n) => nodeRefs.current.get(n.id))
        .filter((el): el is HTMLSpanElement => !!el);

      if (reduceMotion) {
        // El layout estático (sin overlap, sin scroll hijacking) vive en CSS
        // bajo @media (prefers-reduced-motion: reduce); aquí solo limpiamos
        // el transform del FLIP para que los nodos vuelvan a su posición natural.
        gsap.set(nodeEls, { clearProps: "transform" });
        return;
      }

      const centerIndex = (formula.nodes.length - 1) / 2;
      const spreadUnit = Math.max(72, globalThis.innerWidth * 0.055);
      const spreadX = (index: number) => (index - centerIndex) * spreadUnit;

      const tl = gsap.timeline({
        defaults: { duration: 0.9, ease: "power2.out" },
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: () => `+=${String(globalThis.innerHeight * (formula.nodes.length * 1.6 + 1))}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
        },
      });

      // Estado 1 — Despegue: la fórmula entera se separa con un rebote elástico.
      for (const [index, node] of formula.nodes.entries()) {
        const el = nodeRefs.current.get(node.id);
        if (!el) continue;
        tl.to(el, { x: spreadX(index), ease: "elastic.out(1, 0.6)", duration: 1.1 }, 0);
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
          .to(others, { opacity: 0.18, scale: 0.82, duration: 0.6 }, label)
          .to(
            el,
            { x: targetX, y: targetY, scale: 2.4, duration: 0.9, ease: "elastic.out(1, 0.75)" },
            label,
          )
          .to(words, { opacity: 1, y: 0, stagger: 0.035, duration: 0.5 }, `${label}+=0.3`)
          .to(words, { opacity: 0, y: "-40%", stagger: 0.02, duration: 0.35 }, `${label}+=1.15`)
          .to(el, { x: spreadX(index), y: 0, scale: 1, duration: 0.6 }, `${label}+=1.2`)
          .to(others, { opacity: 1, scale: 1, duration: 0.6 }, `${label}+=1.2`);
      }
    },
    { scope: heroRef, dependencies: [ready, formula] },
  );

  return (
    <section ref={heroRef} className="hero" aria-label={formula.title}>
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
            {node.explanation.split(" ").map((word, wordIndex) => (
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

      <p className="hero__hint">Scroll para deconstruir la fórmula</p>
    </section>
  );
}
