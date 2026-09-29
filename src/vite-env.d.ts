/// <reference types="vite/client" />

declare module "virtual:formula-index" {
  import type { FormulaSummary } from "./domain/formula-index";

  const index: FormulaSummary[];
  export default index;
}
