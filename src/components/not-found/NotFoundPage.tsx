import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { loadStrings } from "../../i18n/load-strings";
import { detectInitialLocale, type Locale } from "../../i18n/locale";
import "./NotFoundPage.css";

import type { UiStrings } from "../../i18n/ui-strings";

interface NotFoundPageProps {
  /**
   * Se usa tanto fuera de LocaleProvider (ruta `*` de nivel superior, sin
   * locale en la URL) como dentro (id de fórmula inexistente dentro de un
   * locale válido) — por eso no depende de useLocale() y en su lugar acepta
   * el locale ya resuelto, o lo detecta él mismo si no se lo pasan.
   */
  locale?: Locale;
}

export function NotFoundPage({ locale = detectInitialLocale() }: NotFoundPageProps) {
  const [strings, setStrings] = useState<UiStrings | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadStrings(locale).then((loaded) => {
      if (!cancelled) setStrings(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  if (!strings) return null;

  return (
    <section className="not-found" aria-label={strings.notFoundTitle}>
      <p className="not-found__code fx-display">{strings.notFoundTitle}</p>
      <p className="not-found__description">{strings.notFoundDescription}</p>
      <Link className="not-found__link" to={`/${locale}/`}>
        {strings.notFoundBackLink}
      </Link>
    </section>
  );
}
