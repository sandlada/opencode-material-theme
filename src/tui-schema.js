/**
 * OpenCode TUI theme token schema (source of truth).
 *
 * The 50 `theme.*` keys every theme JSON must fill, extracted from the
 * upstream `ayu.json` reference:
 * https://github.com/anomalyco/opencode/blob/dev/packages/tui/src/theme/assets/ayu.json
 *
 * Each file is dual-appearance: OpenCode itself switches light/dark, so
 * every key takes a `{ dark, light }` object whose values are plain hex
 * strings, ANSI ints, `defs` refs, or `none`. Our generator emits
 * `defs` refs (`md3{Role}Light` / `md3{Role}Dark` + static `#rrggbb`).
 * OLED vs non-OLED are separate files; there is no `light-dark()` CSS.
 *
 * @typedef {string} TuiTokenKey one of the 50 keys in {@link TUI_TOKEN_KEYS}
 */

/** Semantic UI roles (7). */
export const TUI_SEMANTIC_KEYS = Object.freeze([
    'primary',
    'secondary',
    'accent',
    'error',
    'warning',
    'success',
    'info'
]);

/** Text and surface roles (8). */
export const TUI_SURFACE_KEYS = Object.freeze([
    'text',
    'textMuted',
    'background',
    'backgroundPanel',
    'backgroundElement',
    'border',
    'borderActive',
    'borderSubtle'
]);

/** Diff roles (12). */
export const TUI_DIFF_KEYS = Object.freeze([
    'diffAdded',
    'diffRemoved',
    'diffContext',
    'diffHunkHeader',
    'diffHighlightAdded',
    'diffHighlightRemoved',
    'diffAddedBg',
    'diffRemovedBg',
    'diffContextBg',
    'diffLineNumber',
    'diffAddedLineNumberBg',
    'diffRemovedLineNumberBg'
]);

/** Markdown roles (14). */
export const TUI_MARKDOWN_KEYS = Object.freeze([
    'markdownText',
    'markdownHeading',
    'markdownLink',
    'markdownLinkText',
    'markdownCode',
    'markdownBlockQuote',
    'markdownEmph',
    'markdownStrong',
    'markdownHorizontalRule',
    'markdownListItem',
    'markdownListEnumeration',
    'markdownImage',
    'markdownImageText',
    'markdownCodeBlock'
]);

/** Syntax roles (9). */
export const TUI_SYNTAX_KEYS = Object.freeze([
    'syntaxComment',
    'syntaxKeyword',
    'syntaxFunction',
    'syntaxVariable',
    'syntaxString',
    'syntaxNumber',
    'syntaxType',
    'syntaxOperator',
    'syntaxPunctuation'
]);

/** All 50 TUI token keys, in schema order. */
export const TUI_TOKEN_KEYS = Object.freeze([
    ...TUI_SEMANTIC_KEYS,
    ...TUI_SURFACE_KEYS,
    ...TUI_DIFF_KEYS,
    ...TUI_MARKDOWN_KEYS,
    ...TUI_SYNTAX_KEYS
]);

/** @param {string} key @returns {key is TuiTokenKey} */
export function isTuiTokenKey(key) {
    return TUI_TOKEN_KEYS.includes(key);
}
