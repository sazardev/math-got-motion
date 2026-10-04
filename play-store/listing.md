# Ficha de Google Play — Math Got Motion

Fecha de preparación: 2026-10-04
App ID: `4973291596185758457`

## Estado actual

- **Producción: enviada a revisión** (11 cambios, release `14001 (0.14.1)`). Google tarda
  ~7 días; si aproba y no hay rollout gestionado, se publica solo.
- **Pruebas internas:** activas con `14000 (0.14.0)`, lista "Internal testers".
  Enlace: https://play.google.com/apps/internaltest/4701371698052390233
- App content: las 10 declaraciones completadas ("You're all caught up").
- Clasificación obtenida: ESRB Everyone · PEGI 3 · USK All ages · IARC 3+.
- Público objetivo: 13-15, 16-17, 18+ (sin requisitos de Familias).
- Sin anuncios, sin datos recopilados ni compartidos, sin acceso a cuenta.

## Identidad de la app

| Campo                  | Valor                                                             |
| ---------------------- | ----------------------------------------------------------------- |
| Nombre (≤30)           | Math Got Motion                                                   |
| Package name           | `com.sazardev.math_got_motion`                                    |
| Versión en producción  | 0.14.1 (versionCode 14001)                                        |
| Tipo                   | Aplicación                                                        |
| Precio                 | Gratis                                                            |
| Categoría              | Educación                                                         |
| Email de contacto      | cerberusprogrammer@gmail.com                                      |
| Web                    | http://sazardev.github.io/math-got-motion/                        |
| Política de privacidad | https://sazardev.github.io/math-got-motion/privacy.html?hl=es     |
| Idiomas de la ficha    | es-419 (principal, la única creada), en-US pendiente si se quiere |

> Nota: la URL de privacidad se declaró con `?hl=es` porque el crawler de Play tenía
> cacheado un 404 de `privacy.html` (la página se desplegó después). Ambas devuelven 200;
> cuando quieras dejar la URL limpia, cámbiala y reenvía los cambios.

## Descripción corta (≤80)

298 fórmulas explicadas símbolo a símbolo, con scroll.

## Descripción completa (≤4000)

Math Got Motion convierte 298 fórmulas y teoremas de matemáticas y física en una
experiencia tipográfica: al hacer scroll, cada fórmula se descompone símbolo a símbolo y
cada pieza se explica en lenguaje claro.

Una e por aquí, un π por allá: la identidad de Euler, la segunda ley de Newton o el
teorema de Bayes dejan de ser un bloque opaco y se convierten en una historia que avanza
contigo.

QUÉ ENCONTRARÁS

• 298 fórmulas de física clásica, álgebra, cálculo, geometría, probabilidad, química y
astronomía.
• Scrollytelling: la fórmula se separa, cada símbolo se agranda y aparece su explicación.
• 6 idiomas: español, inglés, portugués, francés, chino y japonés.
• Búsqueda por fórmula, categoría o símbolo.
• Guarda tus fórmulas favoritas.
• Más de 10 temas (mono, gruvbox, nord, tokyo night…), varias tipografías y efectos.
• Exporta la fórmula como póster en 4K, Full HD o tamaño móvil.
• Respeta "reducir movimiento" del sistema.

DISEÑO

Monocromo por defecto, puramente tipográfico, sin ruido. Solo la fórmula, sus símbolos y tú.

SIN DISTRACCIONES

Sin cuentas, sin anuncios, sin analítica. Funciona sin conexión y todo se guarda en tu
dispositivo.

Las matemáticas no son estáticas: están en movimiento. Descompón la fórmula y míralas
cobrar vida.

## Assets (en `play-store/`)

| Asset                | Archivo                                                       | Tamaño             |
| -------------------- | ------------------------------------------------------------- | ------------------ |
| Icono de la app      | `icon-512.png`                                                | 512×512            |
| Gráfico destacado    | `feature-graphic-1024x500.png`                                | 1024×500           |
| Capturas de teléfono | `screenshots/01-home.png` … `08-exportar.png`                 | 1080×1920 (8 uds.) |
| Capturas de tablet   | `screenshots/tablet-01-formula.png`, `tablet-02-explorar.png` | 1200×1920          |

## App content (cuestionario)

- **Acceso a la app:** todas las funciones están disponibles sin inicio de sesión ni
  credenciales.
- **Anuncios:** no contiene anuncios.
- **Seguridad de datos:** no se recopilan ni comparten datos. Todo (favoritos, tema,
  idioma) se guarda localmente en el dispositivo; se elimina al desinstalar.
- **Clasificación de contenido:** app de educación/referencia sin contenido sensible
  (sin violencia, sexo, lenguaje, drogas, apuestas, ni interacción entre usuarios).
  Resultado esperado: "Para todos".
- **Público objetivo:** 13+ (evita el programa Familias y sus requisitos adicionales).
- **App gubernamental / noticias / COVID / financiera / salud:** no.
- **Compras dentro de la app:** no.

## Ficha técnica

- `minSdk 24` (Android 7.0), `targetSdk 36` (requisito vigente de Play).
- ABIs: `arm64-v8a`, `armeabi-v7a`.
- **16 KB page size:** soportado en arm64 (requisito de Play desde nov-2025). Se logra con
  NDK 28 + `src-tauri/.cargo/config.toml`:
  `rustflags = ["-C", "link-arg=-Wl,-z,max-page-size=16384"]`. Sin esto Play rechaza el
  release con "Your app does not support 16 KB memory page sizes".
  armv7 queda en 4 KB, lo cual es válido (el requisito aplica a 64 bits).
- Firma: upload key propia + Play App Signing (Google re-firma).
  - Keystore: `~/keystores/math-got-motion-upload.jks`
  - Credenciales: `~/keystores/math-got-motion-keystore.properties`
  - Alias: `upload`
- El proyecto Android (`src-tauri/gen/android/`) está en `.gitignore`; si se borra,
  hay que volver a ejecutar `pnpm tauri android init` y reaplicar la configuración de
  firma (bloque `signingConfigs` en `app/build.gradle.kts` + `keystore.properties`).

## Build

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export NDK_HOME="$HOME/Android/Sdk/ndk/28.2.13676358"
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
pnpm tauri android build --aab --ci --ignore-version-mismatches -t aarch64 armv7
```

`--ignore-version-mismatches` hace falta porque `tauri` 2.12 (crate) y `@tauri-apps/api`
2.11 (npm) están desalineados; conviene igualar versiones en un PR aparte.

AAB resultante:
`src-tauri/gen/android/app/build/outputs/bundle/universalRelease/app-universal-release.aab`

## Gotchas de Play Console (esta sesión)

- Los diálogos "Save and publish" / "Save" abren una confirmación secondary
  ("Publish change on Google Play?") — si no la confirmas, el cambio **no** se guarda y
  la UI lo aparenta guardado. Pasó con contacto y con la declaración de privacidad.
- El editor de store listing tiene 2 pasos: en el paso 2 hay una **declaración de assets
  IA** (elegimos "Don't label assets": los PNG se generan por código, no son IA).
- Sin declarar el paso 2, la ficha queda como borrador y el release no se puede guardar.
- "Proceed anyway" aparece en errores no bloqueantes (p. ej. native debug symbols).
- La app icon del AAB sigue siendo la de `src-tauri/icons` (colorida); la ficha usa el
  icono monocromo de `play-store/icon-512.png`. Regenerar el lanzador requiere otro
  build con `pnpm tauri icon`.
