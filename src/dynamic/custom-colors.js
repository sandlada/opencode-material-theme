/**
 * Dedicated MD3 custom colors for tokens the standard scheme cannot express.
 *
 * Upstream OpenCode TUI v2 has `warning` / `success` / `info` feedback kinds
 * and `diff-added` / `diff-removed` accents with no `md.sys.color.*`
 * counterpart, so each gets an M3-style custom-color group shaped exactly
 * like `error`: four roles per group (`color`, `onColor`, `colorContainer`,
 * `onColorContainer`), flattened into the scheme as
 * `<name>`, `on<Name>`, `<name>Container`, `on<Name>Container`
 * (e.g. `warning`, `onWarning`, `warningContainer`, `onWarningContainer`).
 *
 * Seeds below are fixed semantic hues (yellow / green / blue / green /
 * red). The per-theme values are built by `src/dynamic/custom-scheme.js`:
 * each seed hue is nudged toward the theme source with MCU
 * `Blend.harmonize`, the palette chroma follows the theme variant, and
 * tones run through MCU's own `error` Dynamic Colors, so contrast-level
 * curves apply exactly as they do for `error`.
 */

/** Yellow seed for warning (lowercase `#rrggbb` per generator constraint). */
export const WARNING_SEED = '#ffd600';

/** Green seed for success. */
export const SUCCESS_SEED = '#1b8737';

/** Blue seed for info. */
export const INFO_SEED = '#1a73e8';

/** Green seed for added diff lines. */
export const DIFF_ADDED_SEED = '#1b8737';

/** Red seed for removed diff lines. */
export const DIFF_REMOVED_SEED = '#ba1a1a';

/** Semantic seeds in scheme order (hues only; chroma/tones come from the variant). */
export const CUSTOM_SEEDS = Object.freeze([
    { name: 'warning', seed: WARNING_SEED },
    { name: 'success', seed: SUCCESS_SEED },
    { name: 'info', seed: INFO_SEED },
    { name: 'diffAdded', seed: DIFF_ADDED_SEED },
    { name: 'diffRemoved', seed: DIFF_REMOVED_SEED }
]);

/** Custom-color group names in scheme order. */
export const CUSTOM_COLOR_NAMES = Object.freeze(CUSTOM_SEEDS.map((entry) => entry.name));

function capitalize(name) {
    return name[0].toUpperCase() + name.slice(1);
}

/**
 * Group name -> the four flattened scheme roles.
 * `warning` -> `['warning', 'onWarning', 'warningContainer', 'onWarningContainer']`.
 */
export function customColorRoles(name) {
    const base = capitalize(name);
    return [name, `on${base}`, `${name}Container`, `on${base}Container`];
}

/** All 20 flattened custom roles (5 groups x 4 roles). */
export const CUSTOM_COLOR_ROLES = Object.freeze(CUSTOM_COLOR_NAMES.flatMap(customColorRoles));

/**
 * Merge `mcu-helper` custom-color groups into the light/dark role maps so
 * the rest of the theme core (`resolveRole`, `systemRoleGroups`,
 * state-layer pairing) treats them like any other `md.sys.color` role.
 *
 * @param {{ light: Record<string, number>, dark: Record<string, number>, customColors?: Array }} theme
 * @returns the same theme object with flattened roles added to light/dark
 */
export function flattenCustomColors(theme) {
    for (const group of theme?.customColors ?? []) {
        const [color, onColor, container, onContainer] = customColorRoles(group.name);
        if (theme.light) {
            theme.light[color] = group.light.color;
            theme.light[onColor] = group.light.onColor;
            theme.light[container] = group.light.colorContainer;
            theme.light[onContainer] = group.light.onColorContainer;
        }
        if (theme.dark) {
            theme.dark[color] = group.dark.color;
            theme.dark[onColor] = group.dark.onColor;
            theme.dark[container] = group.dark.colorContainer;
            theme.dark[onContainer] = group.dark.onColorContainer;
        }
    }
    return theme;
}
