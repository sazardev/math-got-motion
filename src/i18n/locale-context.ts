import { createContext, useContext } from "react";

import type { Locale } from "./locale";
import type { UiStrings } from "./ui-strings";

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  strings: UiStrings;
}

export const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}
