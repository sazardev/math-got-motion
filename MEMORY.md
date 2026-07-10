# MEMORY.md - Math Got Motion

## Sesion: Fundacion del Proyecto (2026-07-10)

### Estado Actual: Fundacion completa y verificada

---

## Lo que se hizo

### 1. Entorno y herramientas instaladas

- **Rust** instalado (v1.97.0 stable)
- **Node.js** v22.23.1, **pnpm** v11.3.0
- **Herramientas Rust globales** instaladas via `cargo install`:
  - `cargo-audit` v0.22.2 - auditoria de seguridad
  - `cargo-deny` v0.20.2 - licencias, bans, fuentes
  - `cargo-outdated` v0.19.0 - dependencias desactualizadas
  - `cargo-udeps` v0.1.61 - dependencias no usadas
- **Dependencias del sistema** (CachyOS/Arch):
  - `webkit2gtk-4.1`, `gtk3`, `libappindicator-gtk3`, `librsvg`, `patchelf`

### 2. ESLint 9 (Flat Config) - `eslint.config.js`

- `typescript-eslint` strict + stylistic con type-checking
- Plugins: react, react-hooks, react-refresh, import, jsx-a11y, unicorn, promise
- Reglas estrictas:
  - `no-explicit-any`, `no-non-null-assertion`, `consistent-type-imports/exports`
  - `naming-convention`, `no-floating-promises`, `no-misused-promises`
  - `await-thenable`, `return-await`, `no-unnecessary-condition`
  - Import order con alphabetize y newlines-between
  - `import/no-cycle` para detectar dependencias circulares
  - Unicorn recommended + filename-case
  - Promise catch-or-return, no-return-wrap
- Integrado con Prettier via `eslint-config-prettier`

### 3. Prettier - `.prettierrc`

- semi, doubleQuote, trailingComma: all, printWidth: 100, endOfLine: lf

### 4. TypeScript - `tsconfig.json` endurecido al maximo

- `strict: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`
- `noImplicitOverride: true`
- `noImplicitReturns: true`
- `noPropertyAccessFromIndexSignature: true`
- `verbatimModuleSyntax: true`
- `forceConsistentCasingInFileNames: true`
- `allowUnreachableCode: false`
- `allowUnusedLabels: false`
- Target: ES2022

### 5. Vite - `vite.config.ts`

- `vite-plugin-checker`: type-check + ESLint en tiempo real durante dev
- `vite-plugin-inspect`: inspeccion de plugins y modulos
- `rollup-plugin-visualizer`: analisis de bundle (stats.html)
- Alias `@/` -> `src/`
- Manual chunks: vendor (react, react-dom), tauri (@tauri-apps/api)
- Build target: es2022, chunkSizeWarningLimit: 600

### 6. Husky + lint-staged

- `.husky/pre-commit`: ejecuta `lint-staged`
- `.husky/commit-msg`: ejecuta `commitlint`
- `.lintstagedrc.js`:
  - TS/TSX/JS/JSX: eslint --fix + prettier --write
  - JSON/YAML/CSS/HTML/MD: prettier --write
  - RS: rustfmt

### 7. Commitlint - `commitlint.config.js`

- Basado en `@commitlint/config-conventional`
- Tipos: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
- Header max 100 chars

### 8. Rust - `src-tauri/Cargo.toml`

- **Lints en Cargo.toml**:
  - `[lints.rust]`: unsafe_code = forbid, unused_variables/imports/dead_code = warn
  - `[lints.clippy]`: all + pedantic + nursery + perf + correctness activados
  - unwrap_used/expect_used = allow (por el template de Tauri)
  - module_name_repetitions, must_use_candidate, missing_panics_doc/errors_doc = allow
- **Profile release**: opt-level 3, lto fat, codegen-units 1, strip, panic abort
- **Dependencias agregadas**: log, env_logger, thiserror, anyhow
- **`rustfmt.toml`**: max_width 100, tab_spaces 4, use_field_init_shorthand, reorder_imports
- **`deny.toml`**: licencias permitidas (incluye Apache-2.0 WITH LLVM-exception), advisories ignorados para GTK3 transitivos de Tauri

### 9. VS Code - `.vscode/settings.json`

- Format on save con Prettier
- ESLint auto-fix on save
- Organize imports on save
- Rulers en columna 100
- rust-analyzer con clippy check
- Extensiones recomendadas ampliadas: ESLint, Prettier, EditorConfig, Error Lens, Pretty TS Errors, Path Intellisense, Code Spell Checker

### 10. GitHub Actions CI/CD - `.github/workflows/ci.yml`

- **frontend-check**: typecheck + lint + format:check
- **rust-check**: fmt --check + clippy + audit
- **build**: frontend build
- **tauri-build**: matrix (ubuntu, windows, macos) con tauri build
- Concurrency: cancela builds anteriores en la misma rama

### 11. Multiplatform

- Scripts para Android: `tauri:dev:android`, `tauri:build:android`
- Scripts para iOS: `tauri:dev:ios`, `tauri:build:ios`
- .gitignore actualizado para Android (.gradle, *.apk, _.aab) e iOS (_.xcodeproj, *.ipa, DerivedData)

### 12. Scripts npm completos

```
pnpm dev                    # Vite dev server
pnpm build                  # tsc + vite build
pnpm build:release          # build en modo produccion
pnpm preview                # vite preview
pnpm lint                   # ESLint src
pnpm lint:fix               # ESLint --fix
pnpm format                 # Prettier --write
pnpm format:check           # Prettier --check
pnpm typecheck              # tsc --noEmit
pnpm check:all              # typecheck + lint + format:check
pnpm analyze                # Bundle visualizer
pnpm rust:fmt               # cargo fmt
pnpm rust:fmt:check         # cargo fmt --check
pnpm rust:clippy            # cargo clippy -D warnings
pnpm rust:clippy:fix        # cargo clippy --fix
pnpm rust:audit             # cargo audit
pnpm rust:deny              # cargo deny check
pnpm rust:outdated          # cargo outdated
pnpm rust:udeps             # cargo udeps
pnpm rust:check             # fmt:check + clippy + audit + deny
pnpm check:everything       # check:all + rust:check
```

### 13. Otros archivos

- `.editorconfig`: estandar de indentacion (2 spaces frontend, 4 spaces Rust)
- `.npmrc`: shamefully-hoist, auto-install-peers
- `.gitignore`: expandido para Tauri, Android, iOS, coverage, env files, OS files
- `src-tauri/src/main.rs`: inicializa env_logger
- `src/App.tsx` y `src/main.tsx`: corregidos para pasar lint estricto

---

## Lo que falta / proximos pasos

### Prioridad Alta

- [ ] **Inicializar Android**: `pnpm tauri android init` - genera la estructura Android en `src-tauri/gen/android/`
- [ ] **Inicializar iOS**: `pnpm tauri ios init` - genera la estructura iOS en `src-tauri/gen/apple/`
- [ ] **Configurar Android SDK/NDK**: instalar Android Studio, configurar `ANDROID_HOME`, `NDK_HOME`, Java JDK
- [ ] **Configurar targets Rust para mobile**:
  ```
  rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
  rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios
  ```
- [ ] **Router**: instalar y configurar `@tanstack/react-router` o `react-router-dom`
- [ ] **State management**: decidir entre Zustand, Jotai, o React Context + useReducer
- [ ] **Testing framework frontend**: Vitest + React Testing Library + MSW para mocks
- [ ] **Testing framework Rust**: assertions con `pretty_assertions`, mocking con `mockall`
- [ ] **Error boundaries**: componentes React ErrorBoundary para manejo de errores en UI
- [ ] **Logging estructurado**: configurar `log` + `env_logger` con niveles por modulo en Rust

### Prioridad Media

- [ ] **i18n**: sistema de internacionalizacion (react-i18next o similar)
- [ ] **Tema oscuro/claro**: sistema de temas con CSS variables o Tailwind
- [ ] **Tailwind CSS** o alternativa: evaluar si se usa para el proyecto
- [ ] **Storybook**: para documentar y probar componentes UI en aislamiento
- [ ] **Playwright/E2E tests**: testing end-to-end para la app Tauri
- [ ] **Auto-actualizacion**: configurar `tauri-plugin-updater` para desktop
- [ ] **Deep linking**: configurar scheme personalizado para la app
- [ ] **Splash screen**: pantalla de carga al iniciar la app
- [ ] **Window management**: configuracion avanzada de ventanas (tamano minimo, sin frame, etc.)
- [ ] **Tray icon**: icono en bandeja del sistema si es necesario

### Prioridad Baja

- [ ] **Bundle analyzer automatizado**: script que genere reporte de tamano en CI
- [ ] **Performance budgets**: limites de tamano de bundle en CI
- [ ] **Sentry o similar**: monitoreo de errores en produccion
- [ ] **Telemetria**: si se necesita analytics
- [ ] **Accessibility audit**: axe-core integrado en tests
- [ ] **PWA support**: si se quiere version web como PWA
- [ ] **Cargo workspace**: si el backend Rust crece, separar en crates

---

## Notas tecnicas

- **OS de desarrollo**: CachyOS (Arch Linux) - los comandos de instalacion de dependencias del sistema usan `pacman`
- **ESLint 9** (no 10): la version 10 de ESLint rompia compatibilidad con eslint-plugin-react y unicorn. Se fijo en v9.39.4
- **eslint-plugin-unicorn v56**: la v71 requeria ESLint 10. Se uso v56 compatible con ESLint 9
- **GTK3 unmaintained**: los advisories de cargo-audit sobre GTK3 son de dependencias transitivas de Tauri v2. Se ignoran en `deny.toml` y `cargo-audit`. Esto se resolvera cuando Tauri migre a GTK4
- **cargo-audit** puede tardar en la primera ejecucion porque clona el advisory-db de GitHub
- **`pnpm check:everything`** es el comando maestro para verificar todo antes de push
- **Commit inicial** ya hecho: `89d940c` - "chore: initial commit"
