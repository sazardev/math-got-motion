import React from "react";
import ReactDOM from "react-dom/client";

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

const rootElement = document.querySelector("#root");

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
