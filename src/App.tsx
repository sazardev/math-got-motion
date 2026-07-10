import { useEffect, useState } from "react";

import { FormulaHero } from "./components/formula-hero/FormulaHero";
import { eulerIdentity } from "./domain/formulas/euler-identity";

type Theme = "dark" | "light";

function App() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    document.documentElement.dataset["theme"] = theme;
  }, [theme]);

  return (
    <>
      <button
        type="button"
        className="theme-toggle"
        onClick={() => {
          setTheme((t) => (t === "dark" ? "light" : "dark"));
        }}
      >
        {theme === "dark" ? "Claro" : "Oscuro"}
      </button>
      <FormulaHero formula={eulerIdentity} />
    </>
  );
}

export default App;
