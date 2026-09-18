/**
 * M3 -> OpenCode TUI key mapping (source of truth, v1).
 *
 * Maps each of the 50 {@link TUI_TOKEN_KEYS} to one Material Design 3
 * dynamic-color role (camelCase, as returned by
 * `createTheme(opts)(source)` `light`/`dark` maps).
 *
 * Rules followed:
 * - Only symbolic M3 roles, never hand-picked hex. Hues follow the source
 *   color by design (there is no guaranteed amber/green/cyan in M3).
 * - Refs may repeat across keys (same idiom as upstream `ayu.json`,
 *   e.g. `diffLineNumber: diffContext`).
 * - `*Container`/`on*Container` pair roles flip readability across modes
 *   AND contrasts (verified by probing: high contrast turns every
 *   `on*Container` into a background-matching extreme, `tertiaryContainer`
 *   is light-in-dark for some variants and dark-in-dark for others).
 *   Therefore the 13 pair-dependent keys never live in the base map.
 *   Use {@link resolveMapping} to get the full 50-entry map for one
 *   (mode, contrast group) combination.
 *
 * @typedef {Record<string, string>} M3ToTuiMapping TUI key -> M3 role
 * @typedef {'light' | 'dark'} Appearance
 * @typedef {'default' | 'reduced' | 'high'} ContrastGroup
 */

/** Contrast- and appearance-neutral entries (37 keys). */
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
    // Diff (6 of 12)
    diffAdded: 'tertiary',
    diffRemoved: 'error',
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
    // Syntax (6 of 9)
    syntaxComment: 'outline',
    syntaxKeyword: 'secondary',
    syntaxFunction: 'primary',
    syntaxVariable: 'tertiary',
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
    syntaxNumber: 'onSecondaryContainer',
    diffHighlightRemoved: 'onErrorContainer'
});

/**
 * Standard-contrast light-only entries. `errorContainer` is too saturated
 * as a light wash, so removed-line washes fall back to a neutral container
 * (readable, untinted — documented compromise).
 */
export const LIGHT_STD_OVERRIDES = Object.freeze({
    success: 'tertiary',
    syntaxString: 'tertiary',
    syntaxType: 'onPrimaryContainer',
    diffHighlightAdded: 'tertiary',
    diffAddedBg: 'tertiaryContainer',
    diffAddedLineNumberBg: 'tertiaryContainer',
    diffRemovedBg: 'surfaceContainerHighest',
    diffRemovedLineNumberBg: 'surfaceContainerHighest'
});

/**
 * Standard-contrast dark-only entries. Container pair roles are
 * variant roulette in dark schemes (e.g. `tertiaryContainer` is near-white
 * for Expressive-dark but near-black for FruitSalad-dark), so dark text
 * keys stay on the structurally safe roles and the added wash is neutral.
 * The removed wash keeps its red tint (guard-verified per run).
 */
export const DARK_STD_OVERRIDES = Object.freeze({
    success: 'tertiary',
    syntaxString: 'tertiary',
    syntaxType: 'secondary',
    diffHighlightAdded: 'tertiary',
    diffAddedBg: 'surfaceContainerHighest',
    diffAddedLineNumberBg: 'surfaceContainerHighest',
    diffRemovedBg: 'errorContainer',
    diffRemovedLineNumberBg: 'errorContainer'
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
 * High-contrast entries (both modes). High contrast inverts the pair
 * roles: every `on*Container` matches the background, while `*Container`
 * fills become mid-tone and text-safe. Tinted washes cannot survive this,
 * so all four tinted washes fall back to a neutral container.
 */
export const HIGH_OVERRIDES = Object.freeze({
    warning: 'errorContainer',
    success: 'tertiaryContainer',
    info: 'secondary',
    markdownCode: 'secondary',
    syntaxString: 'primaryContainer',
    syntaxNumber: 'secondary',
    syntaxType: 'primary',
    diffHighlightAdded: 'tertiaryContainer',
    diffHighlightRemoved: 'errorContainer',
    diffAddedBg: 'surfaceContainerHigh',
    diffAddedLineNumberBg: 'surfaceContainerHigh',
    diffRemovedBg: 'surfaceContainerHigh',
    diffRemovedLineNumberBg: 'surfaceContainerHigh'
});

/**
 * @param {Appearance} mode
 * @param {ContrastGroup} contrastGroup
 * @returns {M3ToTuiMapping} full 50-entry map for one combination
 */
export function resolveMapping(mode, contrastGroup) {
    if (contrastGroup === 'high') return Object.freeze({ ...M3_TO_TUI_BASE, ...HIGH_OVERRIDES });
    const modeOverrides = mode === 'light' ? LIGHT_STD_OVERRIDES : DARK_STD_OVERRIDES;
    if (contrastGroup === 'reduced') {
        return Object.freeze({ ...M3_TO_TUI_BASE, ...STD_OVERRIDES, ...modeOverrides, ...REDUCED_OVERRIDES });
    }
    return Object.freeze({ ...M3_TO_TUI_BASE, ...STD_OVERRIDES, ...modeOverrides });
}
