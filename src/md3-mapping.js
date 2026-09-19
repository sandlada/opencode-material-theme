/**
 * M3 -> OpenCode TUI key mapping (source of truth, v1).
 *
 * Maps 42 of the 50 {@link TUI_TOKEN_KEYS} to one Material Design 3
 * dynamic-color role (camelCase, as returned by
 * `createTheme(opts)(source)` `light`/`dark` maps). The other 8 keys
 * (Git diff red/green) live in `src/md3-diff-palettes.js` and resolve to
 * fixed-seed harmonized custom-color ladders instead of scheme roles.
 *
 * Rules followed:
 * - Only symbolic M3 roles, never hand-picked hex. Hues follow the source
 *   color by design (there is no guaranteed amber/green/cyan in M3).
 *   The diff palettes are the single exception (fixed seeds + harmonize,
 *   documented in `src/md3-diff-palettes.js`).
 * - Refs may repeat across keys (same idiom as upstream `ayu.json`,
 *   e.g. `diffLineNumber: diffContext`).
 * - `*Container`/`on*Container` pair roles flip readability across modes,
 *   contrasts AND variants (verified by probing: high contrast turns every
 *   `on*Container` into a background-matching extreme, `tertiaryContainer`
 *   is light-in-dark for some variants and dark-in-dark for others,
 *   monochrome inverts the primary pair). Therefore pair-dependent keys
 *   never live in the base map. Use {@link resolveMapping} to get the
 *   42-entry map for one (mode, contrast group, variant) combination.
 *
 * @typedef {Record<string, string>} M3ToTuiMapping TUI key -> M3 role
 * @typedef {'light' | 'dark'} Appearance
 * @typedef {'default' | 'reduced' | 'high'} ContrastGroup
 */

/** Contrast- and appearance-neutral entries (36 keys). */
export const M3_TO_TUI_BASE = Object.freeze({
    // Semantic (4 of 7)
    primary: 'primary',
    secondary: 'secondary',
    accent: 'tertiary',
    error: 'error',
    // Text + surfaces (8)
    text: 'onSurface',
    textMuted: 'onSurfaceVariant',
    background: 'surface',
    backgroundPanel: 'surfaceContainer',
    backgroundElement: 'surfaceContainerHigh',
    border: 'outlineVariant',
    borderActive: 'outline',
    borderSubtle: 'surfaceContainerHighest',
    // Diff (4 of 12; added/removed text, washes and highlights live in
    // src/md3-diff-palettes.js as fixed-seed harmonized ladders)
    diffContext: 'onSurfaceVariant',
    diffHunkHeader: 'secondary',
    diffContextBg: 'surfaceContainer',
    diffLineNumber: 'outline',
    // Markdown (13 of 14)
    markdownText: 'onSurface',
    markdownHeading: 'primary',
    markdownLink: 'secondary',
    markdownLinkText: 'tertiary',
    markdownBlockQuote: 'onSurfaceVariant',
    markdownEmph: 'secondary',
    markdownStrong: 'primary',
    markdownHorizontalRule: 'outline',
    markdownListItem: 'onSurface',
    markdownListEnumeration: 'secondary',
    markdownImage: 'secondary',
    markdownImageText: 'tertiary',
    markdownCodeBlock: 'onSurface',
    // Syntax (7 of 9)
    syntaxComment: 'outline',
    syntaxKeyword: 'secondary',
    syntaxFunction: 'primary',
    syntaxVariable: 'tertiary',
    syntaxNumber: 'onSecondaryContainer',
    syntaxType: 'secondary',
    syntaxOperator: 'onSurfaceVariant',
    syntaxPunctuation: 'onSurface'
});

/**
 * Standard-contrast entries shared by both modes. `on*Container` roles
 * are only safe at default/reduced contrast; high contrast needs
 * HIGH_OVERRIDES.
 */
export const STD_OVERRIDES = Object.freeze({
    warning: 'onErrorContainer',
    info: 'onSecondaryContainer',
    markdownCode: 'onSecondaryContainer',
    syntaxNumber: 'onSecondaryContainer'
});

/**
 * Standard-contrast light-only entries.
 */
export const LIGHT_STD_OVERRIDES = Object.freeze({
    success: 'tertiary',
    syntaxString: 'tertiary'
});

/**
 * Standard-contrast dark-only entries.
 */
export const DARK_STD_OVERRIDES = Object.freeze({
    success: 'tertiary',
    syntaxString: 'tertiary'
});

/**
 * Reduced-only entries (both modes). Reduced softens `outline` below the
 * muted floor, so the three outline-only text keys step up to
 * `onSurfaceVariant`. Borders keep `outline` (decorative, unchecked).
 */
export const REDUCED_OVERRIDES = Object.freeze({
    syntaxComment: 'onSurfaceVariant',
    diffLineNumber: 'onSurfaceVariant',
    markdownHorizontalRule: 'onSurfaceVariant'
});

/**
 * Monochrome-only entries (both modes). The monochrome scheme inverts the
 * primary pair (`onPrimaryContainer` matches the background in both modes).
 */
export const MONOCHROME_OVERRIDES = Object.freeze({
    syntaxType: 'secondary'
});

/**
 * High-contrast entries (both modes). High contrast inverts the pair
 * roles: every `on*Container` matches the background, while `*Container`
 * fills become mid-tone and text-safe. Diff keys are palette-driven (see
 * `src/md3-diff-palettes.js`) and unaffected by these overrides.
 */
export const HIGH_OVERRIDES = Object.freeze({
    warning: 'errorContainer',
    success: 'tertiaryContainer',
    info: 'secondary',
    markdownCode: 'secondary',
    syntaxString: 'primaryContainer',
    syntaxNumber: 'secondary',
    syntaxType: 'primary'
});

/**
 * @param {Appearance} mode
 * @param {ContrastGroup} contrastGroup
 * @param {string} variantName PascalCase MCU variant name (`Monochrome`, …)
 * @returns {M3ToTuiMapping} 42-entry map for one combination (the 8 diff
 * palette keys in `src/md3-diff-palettes.js` are resolved separately)
 */
export function resolveMapping(mode, contrastGroup, variantName) {
    const mono = variantName === 'Monochrome' ? MONOCHROME_OVERRIDES : {};
    if (contrastGroup === 'high') return Object.freeze({ ...M3_TO_TUI_BASE, ...HIGH_OVERRIDES, ...mono });
    const modeOverrides = mode === 'light' ? LIGHT_STD_OVERRIDES : DARK_STD_OVERRIDES;
    if (contrastGroup === 'reduced') {
        return Object.freeze({ ...M3_TO_TUI_BASE, ...STD_OVERRIDES, ...modeOverrides, ...REDUCED_OVERRIDES, ...mono });
    }
    return Object.freeze({ ...M3_TO_TUI_BASE, ...STD_OVERRIDES, ...modeOverrides, ...mono });
}
