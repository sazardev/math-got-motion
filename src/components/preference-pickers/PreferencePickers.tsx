import { locales, type Locale } from "../../i18n/locale";
import { useLocale } from "../../i18n/locale-context";
import {
  fxNames,
  fxPresets,
  typeNames,
  typePresets,
  usePreferences,
} from "../../preferences/preferences-context";
import { ControlMenu } from "../control-menu/ControlMenu";

/*
 * Mini-menús del chrome: cada botón muestra solo el valor activo ("Mono",
 * "Nord", "ES") y al hacer click despliega la lista para elegir directo, en
 * vez de rotar a ciegas preset por preset. El tema no está acá: se elige en
 * la consola TUI del appbar (ThemeConsole), que además filtra. Los nombres de
 * preset son propios (no se traducen); los rótulos de cada panel sí.
 */

/** Nombre de cada idioma en su propio idioma: así se reconoce sin importar el activo. */
const localeNames: Record<Locale, string> = {
  es: "Español",
  en: "English",
  pt: "Português",
  fr: "Français",
  zh: "中文",
  ja: "日本語",
};

export function FxPicker() {
  const { strings } = useLocale();
  const { fx, setFx } = usePreferences();

  return (
    <ControlMenu label={strings.fxLabel} value={fxNames[fx]}>
      {(close) => (
        <div className="control-menu__options">
          {fxPresets.map((item) => (
            <button
              key={item}
              type="button"
              className="control-menu__option"
              aria-pressed={item === fx}
              onClick={() => {
                setFx(item);
                close();
              }}
            >
              {fxNames[item]}
            </button>
          ))}
        </div>
      )}
    </ControlMenu>
  );
}

export function TypePicker() {
  const { strings } = useLocale();
  const { type, setType } = usePreferences();

  return (
    <ControlMenu label={strings.typeLabel} value={typeNames[type]}>
      {(close) => (
        <div className="control-menu__options">
          {typePresets.map((item) => (
            <button
              key={item}
              type="button"
              className="control-menu__option"
              aria-pressed={item === type}
              onClick={() => {
                // Re-pedir el preset activo no hace nada útil y dejaría un
                // ancla de scroll huérfana (ver setType).
                if (item !== type) setType(item);
                close();
              }}
            >
              {typeNames[item]}
            </button>
          ))}
        </div>
      )}
    </ControlMenu>
  );
}

export function LocalePicker() {
  const { locale, setLocale, strings } = useLocale();

  return (
    <ControlMenu label={strings.languageLabel} value={locale.toUpperCase()}>
      {(close) => (
        <div className="control-menu__options">
          {locales.map((code) => (
            <button
              key={code}
              type="button"
              className="control-menu__option"
              aria-pressed={code === locale}
              lang={code}
              onClick={() => {
                setLocale(code);
                close();
              }}
            >
              {localeNames[code]}
            </button>
          ))}
        </div>
      )}
    </ControlMenu>
  );
}
