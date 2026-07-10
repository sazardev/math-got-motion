# SPEC: Math Got Motion

## 1. Visión General

Math Got Motion es una aplicación multiplataforma (Web, Android, iOS, Windows, Linux, macOS) desarrollada en Tauri. Su objetivo es explicar teoremas, leyes y conceptos matemáticos a través de un diseño radicalmente minimalista, monocromático (blanco y negro) y puramente tipográfico. La experiencia de usuario se basa en animaciones fluidas a 60 fps vinculadas al scroll, donde las fórmulas se deconstruyen visualmente para explicar su anatomía.

## 2. Reglas de Diseño (Design Constraints)

- **Paleta de Color:** Estrictamente blanco y negro (sin escalas de grises).
- **Tipografía Protagonista:** - Texto General: General Sans (pesos variables para jerarquía).
  - Fórmulas/Matemáticas: JetBrains Mono / Latin Modern Math.
- **Prohibiciones Visuales:** Cero imágenes, cero íconos, cero emojis, cero sombras, cero bordes.
- **Escala:** Uso de letras y símbolos matemáticos gigantes (hero text) como elementos estructurales de la interfaz.

## 3. Arquitectura del Sistema y Presentación

El proyecto aplicará principios de Clean Architecture para desacoplar completamente la definición del teorema matemático de su renderizado interactivo.

### 3.1. Stack Tecnológico Definido

- **Core:** Tauri v2 (Gestión de ventanas y sistema operativo).
- **Frontend:** React 18+ con TypeScript.
- **Motor de Animación:** GSAP (ScrollTrigger para el scrollytelling, y manipulación directa de nodos para las transiciones).

### 3.2. Gestión del DOM y Rendimiento (Reglas Estrictas)

Para mantener 60 fps fluidos al separar fórmulas complejas a tamaño gigante:

1. **Propiedades Permitidas para Animación:** GSAP solo debe animar `transform` (`x`, `y`, `scale`) y `opacity`. Queda estrictamente prohibido animar propiedades que disparen repaints en el layout (como `width`, `height`, `margin`, `top`, `left`).
2. **Aislamiento de Nodos:** Cada carácter o símbolo matemático se renderizará como un elemento en bloque independiente (`inline-block` o `absolute`) generado a partir del estado de React, sobre el cual GSAP tomará el control visual mediante referencias (`useRef`).
3. **Gestión del Ciclo de Vida:** Se utilizará el hook `@gsap/react` (`useGSAP`) para asegurar la limpieza de los timelines y ScrollTriggers al desmontar componentes, evitando fugas de memoria (memory leaks) en la navegación entre distintos teoremas.

### 3.3. Flujo de Datos y Representación

La lógica no interactúa directamente con GSAP. El flujo es unidireccional:

1. **Capa de Dominio (AST):** La fórmula se define como un Árbol de Sintaxis Abstracta (AST) o una estructura de nodos jerárquicos (ej. `Node(type: "variable", value: "x")`).
2. **Capa de Presentación (React):** React mapea este AST y renderiza la estructura HTML utilizando JetBrains Mono / General Sans, asignando un `ref` único a cada fragmento lógico de la fórmula.
3. **Capa de Animación (GSAP):** Una vez montado el DOM, un orquestador de GSAP lee los `refs`, calcula las posiciones iniciales y finales, y construye el `Timeline` maestro vinculado al `ScrollTrigger`.

## 4. Diseño y Coreografía Visual

- **El Efecto "Bounce" y Separación:** Cuando el usuario hace scroll, la fórmula original colapsada debe expandirse. GSAP aplicará funciones de easing personalizadas (ej. `CustomEase` o `elastic.out(1, 0.5)`) en el eje X/Y para lograr el movimiento elegante e impactante, respetando el diseño plano y monocromático.
- **Aparición de la Explicación:** El texto descriptivo en General Sans utilizará un efecto de máscara o _fade-in_ tipográfico con retraso (stagger), anclado al símbolo que se acaba de separar.

## 4. Comportamientos de Interacción (Presentational Layer)

- **Hero View:** Al entrar a un teorema, la fórmula ocupa el 100% del viewport.
- **Scroll Hijacking / Scrollytelling:** El scroll del usuario no mueve la página hacia abajo inicialmente, sino que actúa como un control de tiempo (timeline) para la animación.
- **Deconstrucción:** Al scrollear, la fórmula se expande. Los símbolos se separan con un efecto _bounce_ sutil y elegante. El texto de General Sans aparece de forma fluida (fade-in tipográfico) para explicar el símbolo aislado.

## 5. Fases de Desarrollo

1. **Prueba de Concepto (PoC) de Renderizado:** Construir una sola vista con una fórmula compleja (ej. Teorema de Pitágoras o Identidad de Euler). Evaluar si el DOM soporta la animación letra por letra a 60 fps en móvil, o si se requiere un canvas.
2. **Setup de Tauri + Frontend:** Configuración de los pipelines para compilación en Desktop y Mobile (Tauri v2).
3. **Implementación de la Arquitectura de Datos:** Crear los parsers que traducen la lógica matemática a los nodos visuales.
4. **Pulido de Animaciones:** Ajuste de curvas de interpolación (easing) para asegurar la sensación de elegancia y movimiento orgánico.

## 6. Métricas de Éxito

- **Rendimiento:** 60 fps sostenidos durante el scroll en dispositivos móviles de gama media.
- **Claridad:** El usuario comprende el concepto matemático basándose únicamente en el ritmo de la animación y el texto.
