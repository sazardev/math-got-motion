import { Link } from "react-router-dom";

import { changelog } from "../../domain/changelog";
import { useSeo } from "../../hooks/useSeo";
import { locales } from "../../i18n/locale";
import { useLocale } from "../../i18n/locale-context";
import "./ChangelogPage.css";

import type { ChangelogChangeType } from "../../domain/changelog.types";
import type { UiStrings } from "../../i18n/ui-strings";

const TYPE_LABEL_KEY: Record<ChangelogChangeType, keyof UiStrings> = {
  added: "changelogAdded",
  changed: "changelogChanged",
  fixed: "changelogFixed",
  removed: "changelogRemoved",
};

export function ChangelogPage() {
  const { locale, strings } = useLocale();

  useSeo({
    locale,
    title: strings.changelogTitle,
    description: strings.changelogDescription,
    path: `/${locale}/changelog`,
    alternates: locales.map((altLocale) => ({
      locale: altLocale,
      path: `/${altLocale}/changelog`,
    })),
  });

  return (
    <section className="changelog" aria-label={strings.changelogTitle}>
      <p className="changelog__title">{strings.changelogTitle}</p>

      <div className="changelog__list">
        {changelog.map((entry) => (
          <article className="changelog__entry" key={entry.version}>
            <p className="changelog__version">
              v{entry.version}
              <span className="changelog__date">{entry.date}</span>
            </p>
            <ul className="changelog__changes">
              {entry.changes.map((change, index) => (
                <li className="changelog__change" key={`${change.type}-${String(index)}`}>
                  <span className="changelog__change-type">
                    {strings[TYPE_LABEL_KEY[change.type]]}
                  </span>
                  <span className="changelog__change-text">{change.text[locale]}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <Link className="changelog__back" to={`/${locale}/`}>
        {strings.backToFormula}
      </Link>
    </section>
  );
}
