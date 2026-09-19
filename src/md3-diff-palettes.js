/**
 * Fixed-seed harmonized red/green tone ladders for Git diff keys.
 *
 * Exception to the "only symbolic M3 roles" rule in `md3-mapping.js`:
 * the 8 diff keys listed in {@link DIFF_PALETTE_SLOTS} do not come from
 * the `DynamicScheme` role maps. They come from two `mcu-helper`
 * custom-color groups (fixed seed hex + `blend: true`, i.e. MCU
 * `Blend.harmonize` toward each theme's source, then
 * `TonalPalette.fromHueAndChroma`). Fixed seeds keep Git added/removed
 * semantics stable (green hue ~148 / red hue ~25, 120+ degrees apart so
 * `Blend.harmonize` can never collapse them); harmonizing keeps them
 * Material-You-consistent with the theme instead of fully global.
 *
 * Slot convention follows M3 custom colors: `color` (tone 40 light /
 * 80 dark) for text, `onColorContainer` (tone 10 / 90) for inline
 * highlight on top of the wash, `colorContainer` (tone 90 / 30) for the
 * wash backgrounds. Tones are fixed by `mcu-helper` and do NOT shift
 * with `contrastLevel` (documented, v1 behavior); the generation-time
 * guard still enforces the text/muted/wash floors for every file.
 *
 * OLED rule: the 4 wash backgrounds (`*Bg`) resolve to pitch black
 * (`md3DiffBgOledDark`) in the dark half of `*-oled.json` files; text
 * and highlight keep their dark palette tones (readable on black).
 * Non-diff washes stay neutral containers (see `md3-mapping.js`).
 *
 * Note: Monochrome themes also get the colorful diff ladders (Git
 * semantics win over gray aesthetics there).
 */

/** Green seed for added lines (lowercase `#rrggbb` per generator constraint). */
export const DIFF_ADDED_SEED = '#1b8737';

/** Red seed for removed lines (lowercase `#rrggbb` per generator constraint). */
export const DIFF_REMOVED_SEED = '#ba1a1a';

/** `customColors` payload passed to every `createTheme` call. */
export const DIFF_CUSTOM_COLORS = Object.freeze([
    { name: 'diffAdded', value: DIFF_ADDED_SEED, blend: true },
    { name: 'diffRemoved', value: DIFF_REMOVED_SEED, blend: true }
]);

/**
 * TUI key -> custom-color group + slot.
 * `diffAddedLineNumberBg` mirrors `diffAddedBg` (same defs);
 * `diffRemovedLineNumberBg` mirrors `diffRemovedBg`.
 */
export const DIFF_PALETTE_SLOTS = Object.freeze({
    diffAdded: { group: 'diffAdded', slot: 'color' },
    diffRemoved: { group: 'diffRemoved', slot: 'color' },
    diffHighlightAdded: { group: 'diffAdded', slot: 'onColorContainer' },
    diffHighlightRemoved: { group: 'diffRemoved', slot: 'onColorContainer' },
    diffAddedBg: { group: 'diffAdded', slot: 'colorContainer' },
    diffRemovedBg: { group: 'diffRemoved', slot: 'colorContainer' },
    diffAddedLineNumberBg: { group: 'diffAdded', slot: 'colorContainer' },
    diffRemovedLineNumberBg: { group: 'diffRemoved', slot: 'colorContainer' }
});

/** The 8 TUI keys driven by the diff palettes (50 - 8 = 42 via mapping). */
export const DIFF_PALETTE_KEYS = Object.freeze(Object.keys(DIFF_PALETTE_SLOTS));

/** Wash-background TUI keys (resolve to pitch black in OLED dark halves). */
export const DIFF_WASH_BG_KEYS = Object.freeze([
    'diffAddedBg',
    'diffRemovedBg',
    'diffAddedLineNumberBg',
    'diffRemovedLineNumberBg'
]);

/** Defs key for the OLED dark diff wash background (pitch black). */
export const DIFF_OLED_BG_DEF = 'md3DiffBgOledDark';

/** Static hex for the OLED dark diff wash background. */
export const DIFF_OLED_BG_HEX = '#000000';

/**
 * Custom-color group + slot + mode -> defs key
 * (e.g. `diffAdded`+`colorContainer`+light -> `md3DiffAddedContainerLight`).
 * Mirrors the `md3{Role}{Light|Dark}` defs convention.
 */
export function toDiffDefKey(group, slot, mode) {
    const base = `md3${group[0].toUpperCase()}${group.slice(1)}`;
    const mid = slot === 'color'
        ? ''
        : slot === 'colorContainer'
            ? 'Container'
            : slot === 'onColorContainer'
                ? 'OnContainer'
                : null;
    if (mid === null) throw new Error(`unknown diff palette slot '${slot}'`);
    if (mode !== 'light' && mode !== 'dark') throw new Error(`unknown mode '${mode}'`);
    return mode === 'light' ? `${base}${mid}Light` : `${base}${mid}Dark`;
}
