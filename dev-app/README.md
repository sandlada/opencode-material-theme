# OpenCode v2 Theme Lab

A local Vite app for exploring **native OpenCode TUI v2 themes** built from
Material Design 3 system colors.

It generates an MD3 scheme (variant + source + contrast + OLED; spec is always
2025), lets you
map every v2 theme token to an `md.sys.color.*` role, previews the result in an
OpenCode TUI v2 mock, and exports a valid v2 theme JSON or mapping.

This is a development tool. It is not part of the published npm package.

## Requirements

The shared theme core imports the repo's existing MD3 dependencies, so install
them from the repository root first:

```sh
npm install
npm --prefix dev-app install
```

## Run

```sh
npm run dev:app
# or
npm --prefix dev-app run dev
```

Then open the printed Vite URL (normally `http://127.0.0.1:5173/`).

Build the static app with:

```sh
npm run build:app
```

## Modules

### 1. Dynamic core (`../src/dynamic/`)

- `schema.js` — `OpenCodeDynamicSchema`: self-owned v2 token tree (104
  leaves), required/optional flags and CSS variable names. No upstream
  snapshot, no fetch.
- `dynamic.js` — `OpenCodeDynamic`: HCT + variant/contrast/OLED in, full
  document out. The token → `md.sys.color` role table is private and
  frozen; state layers derive per mode at build time.
- `md3.js` — `variant + hue/source + contrast + OLED` → MD3 scheme (spec
  fixed at 2025), palettes, `md.sys.color.*` groups, nine-step hue scales
  and naming.
- `custom-colors.js` — dedicated `warning` / `success` / `info` /
  `diffAdded` / `diffRemoved` seeds and flattened role names (20 roles).
- `custom-scheme.js` — `SemanticScheme extends DynamicScheme`:
  variant-aware palettes (harmonized seed hue + secondary-grammar chroma)
  evaluated through MCU's own `error` Dynamic Colors, so tones follow
  contrast curves.
- `state-layer.js` — hover 8% / focus 10% / pressed 10% derivation plus the
  disabled `outline-variant` 32% wash.
- `contrast.js` — WCAG checks for text, muted, feedback, diff, action and
  form-field pairs.

### 2. Dev app (`dev-app/`)

- Vite + vanilla HTML/JS/CSS; no framework.
- Left: OpenCode TUI v2 mock (tabs, transcript, markdown, syntax, diff,
  sidebar, composer, dialogs, toasts, action states).
- Right: MD3 generator, system color palette, contrast report and the
  read-only derived token table (Light/Dark hex per leaf).
- **State explorer** (`states.html`, linked from the lab's top bar):
  every stateful Dynamic token family with its resolved base / hover /
  focus / pressed / selected / disabled values for the current scheme
  and mode — what the preview's state simulation renders — plus the
  stateless tokens (`border`, `scrollbar`, `diff`, `syntax`,
  `markdown`, text/background singletons) with their resolved value.

### 3. Theme generators (`../scripts/`)

- `generate-dynamic-theme.mjs` — one theme from `OpenCodeDynamic`.
- `check-dynamic.mjs` — full-matrix validation + contrast report
  (648 combos, fails closed on invalid documents).

```sh
# one theme
bun scripts/generate-dynamic-theme.mjs --variant content --hue 120 --out ./test-theme.json

# full-matrix validation
bun scripts/check-dynamic.mjs
```

## Preview controls

- **Mode** — dark / light. Both mapping columns remain visible.
- **Tabs** — horizontal / vertical.
- **Indicators** — status glyphs / numbers.
- **State** — default, hover, focus, pressed, selected, disabled for the
  action demo and form field.
- **Sidebar / Dialog / Token labels** — preview surfaces and debug labels.
- **Filter** — search token paths (`⌘K` / `Ctrl+K` focuses it).

## Export

- **Download JSON** — native v2 document. `base` holds the light token tree,
  `light` holds its hue scale, `dark` holds its hue scale plus token overrides
  that differ from light. `@dialog` is emitted only for added overrides.
- **Copy JSON** — same document to the clipboard.
- **Copy mapping** — `{ tokens, "@dialog" }` role mapping for the batch
  generator or future code generation.

The default filename is `md3-{variant}-{hue|#hex}[-oled][-high|-reduced]-v2.json`.
The `-v2` suffix avoids clobbering the existing v1 files.

## Notes and limitations

- **V2-only.** The app does not load or edit v1 `{ defs, theme }` files.
- **MD system colors only.** Selects use `md.sys.color.*` roles (reference
  `*PaletteKeyColor` tokens are excluded). `transparent` and `-- inherit --`
  are structural exceptions required by the v2 schema.
- **No tab-specific tokens.** Upstream v2 still has no dedicated tab strip /
  tab title tokens; the mock uses `background.raised.*`,
  `background.action.primary.selected`, `text.*`, `hue.accent`,
  `hue.interactive` and `text.feedback.error`, matching the TUI source.
- **Approximate mock.** The layout and token usage follow the v2 TUI source
  and docs, but this is HTML/CSS, not a terminal cell renderer.
- **Hue scales** are generated from MD3 tonal palettes (nine tones per named
  hue) and are intentionally not editable via the MD selectors.
- The exported document is validated by the app and can be checked with the
  official `@opencode/theme/tui` parser:

  ```js
  import { parseThemeDocument, resolveThemeDocument } from '@opencode/theme/tui'
  const doc = parseThemeDocument(JSON.parse(json), 'my-theme')
  resolveThemeDocument(doc, 'dark')
  ```
