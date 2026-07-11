import { useMemo, type ReactNode } from "react";

import { LocaleContext, type LocaleContextValue } from "./locale-context";
import { uiStrings } from "./ui-strings";

import type { Locale } from "./locale";

interface LocaleProviderProps {
  /** El locale activo, derivado del segmento `:locale` de la URL — ver App.tsx. */
  locale: Locale;
  /** Cambiar de idioma navega a la misma página bajo el otro prefijo de idioma. */
  onLocaleChange: (locale: Locale) => void;
  children: ReactNode;
}

export function LocaleProvider({ locale, onLocaleChange, children }: LocaleProviderProps) {
  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale: onLocaleChange, strings: uiStrings[locale] }),
    [locale, onLocaleChange],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
