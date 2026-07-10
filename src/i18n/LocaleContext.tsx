import { useMemo, useState, type ReactNode } from "react";

import { detectInitialLocale, type Locale } from "./locale";
import { LocaleContext, type LocaleContextValue } from "./locale-context";
import { uiStrings } from "./ui-strings";

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => detectInitialLocale());

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, strings: uiStrings[locale] }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
