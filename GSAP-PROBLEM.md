Te recomiendo absolutamente **construir un parser propio** (o implementar un tokenizador ligero en TypeScript) que convierta las fórmulas en un Árbol de Sintaxis Abstracta (AST) nativo.

Inyectar HTML generado por librerías como KaTeX o MathJax es una solución viable para renderizado estático, pero introducira fricciones severas para la visión arquitectónica y el rendimiento que buscas.

Aquí tienes el desglose técnico de por qué esta es la decisión correcta y cómo estructurarlo.

### El problema con KaTeX / MathJax para este caso

1. **DOM Opaco y Profundamente Anidado:** Estas librerías generan cientos de etiquetas `<span>` anidadas con clases CSS complejas para manejar posicionamiento (superíndices, fracciones, integrales). Animar esto carácter por carácter con GSAP requeriría selectores CSS frágiles.
2. **Ruptura del Paradigma:** Inyectar HTML mediante `dangerouslySetInnerHTML` y luego usar `document.querySelectorAll` para que GSAP tome el control rompe el ciclo de vida de React y complica la limpieza de memoria.
3. **Peso Innecesario:** KaTeX incluye reglas de diseño, espaciados y fuentes propias que entrarán en conflicto directo con tu restricción estricta de usar únicamente JetBrains Mono en un entorno de diseño plano.

### La Solución: Parser Propio + AST a React

Al mantener la lógica estructurada de forma nativa en TypeScript, aislas la capa de dominio de la capa de presentación. El flujo técnico sería el siguiente:

#### 1. Definición de la Estructura de Datos (AST)

El parser toma una cadena de texto (ej. una versión simplificada de LaTeX) o una estructura JSON y la convierte en nodos.

```typescript
// Capa de Dominio
type NodeType = "variable" | "operator" | "equals" | "superscript";

interface FormulaNode {
  id: string; // Crucial para React keys y referencias de GSAP
  type: NodeType;
  value: string;
  explanation?: string; // El texto en General Sans que aparecerá al hacer scroll
}

// E = mc^2
const formulaAST: FormulaNode[] = [
  {
    id: "n1",
    type: "variable",
    value: "E",
    explanation: "Energía total del sistema",
  },
  { id: "n2", type: "equals", value: "=", explanation: "es equivalente a" },
  { id: "n3", type: "variable", value: "m", explanation: "la masa" },
  {
    id: "n4",
    type: "variable",
    value: "c",
    explanation: "multiplicada por la velocidad de la luz",
  },
  { id: "n5", type: "superscript", value: "2", explanation: "al cuadrado" },
];
```

#### 2. Renderizado Reactivo y Control Total

Al iterar sobre este AST en React, tienes control absoluto sobre el DOM. Cada nodo es un elemento simple al que le puedes inyectar un `ref`.

```tsx
// Capa de Presentación
const FormulaRenderer = ({ nodes }: { nodes: FormulaNode[] }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useGSAP(
    () => {
      // Aquí GSAP lee directamente nodeRefs.current
      // Configuras el ScrollTrigger y aplicas el efecto bounce
      // separando cada span en el eje X con precisión milimétrica.
    },
    { scope: containerRef },
  );

  return (
    <div ref={containerRef} className="font-jetbrains text-9xl">
      {nodes.map((node, index) => (
        <span
          key={node.id}
          ref={(el) => (nodeRefs.current[index] = el)}
          className="inline-block" // Vital para que GSAP pueda animar transformaciones
        >
          {node.value}
        </span>
      ))}
    </div>
  );
};
```

### Ventajas de este enfoque

- **Cero Layout Thrashing:** Al renderizar estructuras planas con `inline-block`, GSAP solo animará `transform` (`x`, `y`) sobre elementos controlados por React. Garantizas los 60 fps.
- **Sincronización de Explicaciones:** Como la propiedad `explanation` vive en el mismo nodo del AST, puedes orquestar fácilmente que el texto en General Sans aparezca exactamente cuando ese nodo específico termina su animación de _bounce_.
- **Mantenibilidad:** Si decides crear una herramienta CLI o un backend en Go más adelante para pre-procesar teoremas matemáticos pesados y servirlos a la app, el modelo de datos basado en JSON/AST encajará perfectamente.

¿Te gustaría que definamos las reglas del sistema de coordenadas y el comportamiento del layout inicial (flexbox vs absolute) para asegurar que la fórmula se vea perfectamente centrada antes de comenzar la separación al hacer scroll?
