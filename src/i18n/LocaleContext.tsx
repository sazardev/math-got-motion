import { useEffect, useMemo, useState, type ReactNode } from "react";

import { loadStrings } from "./load-strings";
import { LocaleContext, type LocaleContextValue } from "./locale-context";

import type { Locale } from "./locale";
import type { UiStrings } from "./ui-strings";

interface LocaleProviderProps {
  /** El locale activo, derivado del segmento `:locale` de la URL — ver App.tsx. */
  locale: Locale;
  /** Cambiar de idioma navega a la misma página bajo el otro prefijo de idioma. */
  onLocaleChange: (locale: Locale) => void;
  children: ReactNode;
}

export function LocaleProvider({ locale, onLocaleChange, children }: LocaleProviderProps) {
  // Al cambiar de idioma se conserva el anterior hasta que llega el chunk del
  // nuevo: la UI nunca queda en blanco entre idiomas.
  const [loaded, setLoaded] = useState<{ locale: Locale; strings: UiStrings } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadStrings(locale).then((strings) => {
      if (!cancelled) setLoaded({ locale, strings });
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const value = useMemo<LocaleContextValue | null>(
    () =>
      loaded ? { locale: loaded.locale, setLocale: onLocaleChange, strings: loaded.strings } : null,
    [loaded, onLocaleChange],
  );

  if (!value) return null;
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
