# DESIGN & ARCHITECTURE: Math Got Motion

## 1. Filosofía del Sistema (El Manifiesto)

La interfaz es un lienzo de verdad matemática. Todo elemento que no sirva directamente a la explicación del teorema es ruido visual y debe ser eliminado. El diseño se basa en la sustracción: no hay decoraciones, solo tipografía, contraste y movimiento. La elegancia nace de la precisión milimétrica del código y la fluidez de los 60 fps.

## 2. Tipografía y Escala

- **Variable Font Principal:** General Sans (Pesos: Regular para lectura, Semibold para énfasis).
- **Variable Font Matemática:** JetBrains Mono (o alternativa monoespaciada sin ligaduras que distorsionen el AST).
- **Escala de Lectura (Rem):** La fórmula en su estado de reposo (Hero) debe ocupar un mínimo del 15vw o 6rem, dominando el centro de la pantalla. El texto explicativo debe contrastar dramáticamente en tamaño (ej. 1.25rem).

## 3. Reglas Estrictas de la Interfaz (Qué SÍ y Qué NO)

### Lo que SÍ (Obligatorio)

- **Fondo:** `#000000` (Negro puro) o `#FFFFFF` (Blanco puro), con soporte para alternar el tema.
- **Texto:** `#FFFFFF` sobre fondo negro, o `#000000` sobre fondo blanco. Cero matices de gris.
- **Anti-aliasing:** Subpixel antialiasing activado a nivel de OS en Tauri.
- **Animación vinculada (Scrollytelling):** El progreso de la animación está 100% amarrado al scroll del usuario (`scrub: true` en GSAP).

### Lo que NO (Prohibido)

- **Cero sombras:** Ni `box-shadow`, ni `text-shadow`. El diseño es estrictamente plano (Flat).
- **Cero bordes o líneas divisorias:** El espacio en blanco (negative space) y la escala tipográfica definen las secciones.
- **Cero imágenes, íconos o emojis:** Si un concepto necesita ilustración, se dibuja programáticamente animando caracteres (ASCII art de alta resolución) o usando signos de puntuación de General Sans.
- **Cero scroll horizontal libre:** El único scroll permitido es vertical, y sirve como línea de tiempo.

## 4. Sistema de Layout y Coordenadas (El Núcleo Técnico)

Para lograr el efecto de una fórmula que se lee con _kerning_ perfecto pero que se puede separar y animar libremente a 60 fps, se utilizará el patrón **FLIP (First, Last, Invert, Play) manual**.

### 4.1. Layout Inicial (Macro - Flexbox)

- La pantalla actúa como un `100vh` con `display: flex; justify-content: center; align-items: center;`.
- La fórmula completa se renderiza inicialmente utilizando el flujo natural del navegador (`inline-block` dentro del flex container) para que el motor de renderizado de texto maneje el espaciado correcto entre variables y operadores.

### 4.2. Transición a Control Absoluto (Micro - Absolute)

El DOM no puede animar eficientemente elementos en flujo. El proceso de inicialización (Mounting) es:

1. **Renderizado en Reposo:** React renderiza la fórmula en el centro con `inline-block`.
2. **Captura de Coordenadas:** Un `useLayoutEffect` itera sobre el array de referencias (`refs`) de cada carácter y ejecuta `getBoundingClientRect()` para obtener sus posiciones X e Y exactas respecto al viewport.
3. **Fijación Absoluta:** Se inyectan estilos en línea para fijar el `width` y `height` de cada nodo, y se cambia su posición a `position: absolute`, aplicándoles el `top` y `left` calculados.
4. **Resultado:** Visualmente nada cambia, la fórmula sigue centrada. Pero técnicamente, la fórmula ahora está "flotando" fuera del documento.

### 4.3. Animación y Eje Z

- **Traslación:** GSAP ahora es libre de modificar `transform: translate3d(x, y, 0)` sin causar _layout thrashing_.
- **Planos (Z-Index):** La fórmula siempre opera en el plano frontal (`z-index: 10`). Las explicaciones tipográficas en General Sans emergen en el plano posterior (`z-index: 5`) o viceversa, gestionadas mediante opacidad.

## 5. Coreografía de la Interacción

1. **Estado 0 (Hero):** Fórmula intacta, centrada, gran formato.
2. **Estado 1 (Despegue):** Al primer movimiento del scroll, la fórmula colapsa o se expande (según el teorema). Los caracteres utilizan un _easing_ elástico (`elastic.out(1, 0.75)`) para transmitir masa y cinemática en el movimiento físico.
3. **Estado 2 (Aislamiento):** El nodo de interés (ej. la variable principal) permanece en el centro visual. Los demás nodos se desplazan hacia la periferia (fuera de foco mediante posición u opacidad).
4. **Estado 3 (Resolución):** El texto de General Sans entra en escena para explicar el nodo aislado, utilizando un _stagger_ para aparecer palabra por palabra.

## 6. Presets opt-in (excepción documentada)

Las reglas de las secciones 2 y 3 describen el estado **default** de la app y no cambian:
sin preset, la interfaz es blanco y negro puro, plana y sin decoración. Sobre ese default,
el usuario puede activar explícitamente presets desde los controles (persistidos en
`localStorage` bajo `mgm:preferences`):

- **`data-fx`** — estética: `mono` (default), `crt`, `vhs`, `neon`. CRT y VHS se mantienen
  monocromáticos (scanlines, grano, tracking, glow blanco); solo `neon` usa color
  (aberración cromática derivada del acento del tema + glow) y fuerza un tema oscuro al
  activarse.
- **`data-type`** — tipografía: `default` (JetBrains Mono + General Sans), `classic`
  (Latin Modern), `editorial` (STIX Two), `modern` (IBM Plex Mono + Space Grotesk) y
  `terminal` (Space Mono). Los webfonts se cargan on-demand; el default no descarga nada.
- **`data-theme`** — tema de color global: `mono-dark` (default), `mono-light`, `gruvbox`,
  `gruvbox-light`, `nord`, `ayu`, `ayu-mirage`, `ayu-light`, `osaka`, `tokyo-night`,
  `catppuccin`. Cada paleta define `--bg`, `--fg`, `--accent` y `--accent-fg`; el acento
  pinta la fórmula, la selección y los CTAs. `data-scheme` (derivado) resuelve claro/oscuro.
  En los temas mono el acento apunta al propio `--fg`, así el default queda idéntico.

Límites que los presets **no** pueden romper:

- Las capas de efectos (`src/components/fx/FxLayer.tsx`) solo animan `transform`/`opacity`
  (keyframes de CSS incluidos), nunca `filter`/`box-shadow` por frame ni `mix-blend-mode`.
- `prefers-reduced-motion` apaga las capas animadas (flicker, roll, tracking, grano).
- El parpadeo es lento y de amplitud mínima (WCAG 2.3.1: < 3 flashes/segundo).
- El DOM y el CSS del preset `mono` + `default` no cambian: cero capas, cero fuentes extra.
