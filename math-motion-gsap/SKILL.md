---
name: math-motion-gsap
description: Reglas estrictas de rendimiento y arquitectura para animar React con GSAP 3 en el proyecto Math Got Motion.
---

# Math Got Motion: GSAP Animation Guidelines

Cuando escribas código de animación para este proyecto, debes seguir estrictamente estas reglas para garantizar 60 fps fluidos en Tauri/Móvil.

## 1. Integración con React

- DEBES usar el hook `@gsap/react` (`useGSAP`) para todas las animaciones.
- NUNCA uses `useEffect` plano para instanciar timelines de GSAP.
- Pasa un objeto `scope` (referencia de React) al hook `useGSAP` para aislar los selectores al componente actual.

## 2. Reglas de Rendimiento (Cero Layout Thrashing)

- SOLO TIENES PERMITIDO animar propiedades de composición: `x`, `y`, `scale`, `rotation` y `opacity`.
- ESTÁ ESTRICTAMENTE PROHIBIDO animar propiedades que causen repaints del DOM: `width`, `height`, `top`, `left`, `margin`, `padding`.
- Los caracteres individuales que se separan de la fórmula DEBEN estar envueltos en elementos con `display: inline-block` o `position: absolute` para que GSAP pueda transformarlos sin afectar el flujo del documento.

## 3. Limpieza de Memoria (Cleanup)

- El uso de `useGSAP` maneja el cleanup automáticamente, pero si creas instancias de `ScrollTrigger` fuera de este scope, DEBES matarlas (`.kill()`) cuando el componente se desmonte.

## 4. Estilo de Animación

- Utiliza easings elásticos o personalizados (`elastic.out(1, 0.75)`) para el efecto "bounce" de las letras.
- Usa la propiedad `stagger` de GSAP en lugar de múltiples animaciones separadas cuando animes la aparición de los textos explicativos.
