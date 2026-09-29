import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./index.css";

// La altura de la página depende del pin-spacer que ScrollTrigger crea en
// tiempo de ejecución; la restauración nativa de scroll del navegador puede
// saltar a una posición vieja antes de que ese spacer exista, dejando la
// fórmula fuera de pantalla. Cada formula-hero arranca su propio timeline,
// así que no hay nada útil que restaurar entre recargas.
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
globalThis.scrollTo(0, 0);

// PWA: caché offline para la web instalada. Fuera de Tauri (que ya empaqueta
// todo) y solo en producción, para no interferir con el HMR de Vite.
if (
  import.meta.env.PROD &&
  "serviceWorker" in navigator &&
  !("__TAURI_INTERNALS__" in globalThis)
) {
  globalThis.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}

const rootElement = document.querySelector("#root");

if (rootElement) {
  // BASE_URL ya refleja el `base` de vite.config.ts ("/math-got-motion/" en
  // GitHub Pages, "/" en Tauri/local) — sin la barra final, que BrowserRouter
  // no espera en su `basename`.
  const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  );
}
