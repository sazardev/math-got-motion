import { useLocale } from "../../i18n/locale-context";
import { usePreferences } from "../../preferences/preferences-context";
import { themes } from "../../preferences/themes";
import { ControlMenu } from "../control-menu/ControlMenu";

/**
 * Selector de tema global. Los temas son nombres propios (no se traducen);
 * el rótulo del control sí.
 */
export function ThemePicker() {
  const { strings } = useLocale();
  const { theme, setTheme } = usePreferences();

  const activeName = themes.find((item) => item.id === theme)?.name ?? theme;

  return (
    <ControlMenu label={strings.themeLabel} value={activeName}>
      {(close) => (
        <div className="control-menu__options">
          {themes.map((item) => (
            <button
              key={item.id}
              type="button"
              className="control-menu__option"
              aria-pressed={item.id === theme}
              onClick={() => {
                setTheme(item.id);
                close();
              }}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
    </ControlMenu>
  );
}
