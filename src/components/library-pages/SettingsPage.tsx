import { Link } from "react-router-dom";

import { useLocale } from "../../i18n/locale-context";
import { REPO_URL } from "../../lib/site";
import {
  FxPicker,
  LocalePicker,
  ThemePicker,
  TypePicker,
} from "../preference-pickers/PreferencePickers";
import "./SettingsPage.css";

/** Ajustes: apariencia, idioma y enlaces — un solo lugar en vez de botones flotantes. */
export function SettingsPage() {
  const { locale, strings } = useLocale();

  const rows = [
    { label: strings.themeLabel, control: <ThemePicker /> },
    { label: strings.typeLabel, control: <TypePicker /> },
    { label: strings.fxLabel, control: <FxPicker /> },
    { label: strings.homeLanguagesTitle, control: <LocalePicker /> },
  ];

  return (
    <main className="app-page settings">
      <h1 className="app-page__title fx-display">{strings.settingsTitle}</h1>

      <h2 className="app-section-title">{strings.settingsAppearance}</h2>
      <ul className="settings__list">
        {rows.map((row) => (
          <li key={row.label} className="settings__row">
            <span className="settings__label">{row.label}</span>
            {row.control}
          </li>
        ))}
      </ul>

      <ul className="settings__list settings__list--links">
        <li>
          <Link className="settings__link" to={`/${locale}/changelog`}>
            {strings.changelogNav}
          </Link>
        </li>
        <li>
          <a className="settings__link" href={REPO_URL} target="_blank" rel="noreferrer">
            {strings.homeContributeCta}
          </a>
        </li>
      </ul>
    </main>
  );
}
