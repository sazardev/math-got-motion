use serde::Serialize;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {name}! You've been greeted from Rust!")
}

/// Paleta del tema que el sistema está usando ahora mismo. Se expone al
/// frontend para que la app pueda arrancar con el mismo look que Omarchy.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemTheme {
    name: String,
    mode: String,
    bg: String,
    fg: String,
    accent: String,
}

fn toml_value(source: &str, key: &str) -> Option<String> {
    let prefix = format!("{key} =");
    source.lines().find_map(|line| {
        line.trim()
            .strip_prefix(&prefix)
            .map(|value| value.trim().trim_matches('"').trim().to_owned())
            .filter(|value| !value.is_empty())
    })
}

/// Lee `~/.local/state/omarchy/current/theme.name` y su `colors.toml`.
/// Devuelve `None` fuera de Omarchy o si el estado aún no existe.
#[tauri::command]
fn detect_system_theme() -> Option<SystemTheme> {
    let session = std::env::var("DESKTOP_SESSION").unwrap_or_default();
    let omarchy_path = std::env::var("OMARCHY_PATH").unwrap_or_default();
    if !session.eq_ignore_ascii_case("omarchy") && omarchy_path.is_empty() {
        return None;
    }

    let home = std::env::var("HOME").ok()?;
    let state_dir = std::path::Path::new(&home).join(".local/state/omarchy/current");
    let name = std::fs::read_to_string(state_dir.join("theme.name"))
        .ok()?
        .trim()
        .to_owned();
    let colors = std::fs::read_to_string(state_dir.join("theme/colors.toml")).ok()?;

    Some(SystemTheme {
        name,
        mode: toml_value(&colors, "mode")?,
        bg: toml_value(&colors, "background")?,
        fg: toml_value(&colors, "foreground")?,
        accent: toml_value(&colors, "accent")?,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, detect_system_theme])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::toml_value;

    #[test]
    fn parses_omarchy_colors() {
        let source =
            "# Jade Crane Dark\nmode = \"dark\"\nbackground = \"#0b1d17\"\naccent = \"#5fb58a\"\n";
        assert_eq!(toml_value(source, "mode").as_deref(), Some("dark"));
        assert_eq!(toml_value(source, "background").as_deref(), Some("#0b1d17"));
        assert_eq!(toml_value(source, "accent").as_deref(), Some("#5fb58a"));
        assert_eq!(toml_value(source, "missing"), None);
    }
}
