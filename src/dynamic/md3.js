/**
 * Material Design 3 bridge for OpenCode v2 themes.
 *
 * Wraps @sandlada/mcu-helper so the dev-app, the schema generator and any
 * future V2 theme generator share the same scheme/palette/naming logic.
 */

import { Hct } from '@material/material-color-utilities';
import {
    MaterialContrastLevel,
    MaterialVariant,
    createTheme,
    formatHex
} from '@sandlada/mcu-helper';
import { flattenCustomColors } from './custom-colors.js';
import { createCustomGroups } from './custom-scheme.js';

export const MODES = Object.freeze(['light', 'dark']);

/** Spec is fixed: the V2 pipeline always generates the 2025 token set. */
export const SPEC_VERSION = '2025';

export const VARIANTS = Object.freeze([
    { id: 'monochrome', label: 'Monochrome', slug: 'monochrome', value: MaterialVariant.Monochrome },
    { id: 'neutral', label: 'Neutral', slug: 'neutral', value: MaterialVariant.Neutral },
    { id: 'tonal-spot', label: 'Tonal Spot', slug: 'tonal-spot', value: MaterialVariant.TonalSpot },
    { id: 'vibrant', label: 'Vibrant', slug: 'vibrant', value: MaterialVariant.Vibrant },
    { id: 'expressive', label: 'Expressive', slug: 'expressive', value: MaterialVariant.Expressive },
    { id: 'fidelity', label: 'Fidelity', slug: 'fidelity', value: MaterialVariant.Fidelity },
    { id: 'content', label: 'Content', slug: 'content', value: MaterialVariant.Content },
    { id: 'rainbow', label: 'Rainbow', slug: 'rainbow', value: MaterialVariant.Rainbow },
    { id: 'fruit-salad', label: 'Fruit Salad', slug: 'fruit-salad', value: MaterialVariant.FruitSalad }
]);

export const CONTRASTS = Object.freeze([
    { id: 'default', label: 'Default', slug: '', level: MaterialContrastLevel.Default, textFloor: 4.5 },
    { id: 'high', label: 'High', slug: '-high', level: MaterialContrastLevel.High, textFloor: 4.5 },
    { id: 'reduced', label: 'Reduced', slug: '-reduced', level: MaterialContrastLevel.Reduced, textFloor: 3.0 }
]);

const ROLE_GROUPS = Object.freeze([
    {
        id: 'primary',
        label: 'Primary',
        roles: [
            'primary',
            'onPrimary',
            'primaryContainer',
            'onPrimaryContainer',
            'primaryDim',
            'primaryFixed',
            'primaryFixedDim',
            'onPrimaryFixed',
            'onPrimaryFixedVariant',
            'inversePrimary',
            'surfaceTint'
        ]
    },
    {
        id: 'secondary',
        label: 'Secondary',
        roles: [
            'secondary',
            'onSecondary',
            'secondaryContainer',
            'onSecondaryContainer',
            'secondaryDim',
            'secondaryFixed',
            'secondaryFixedDim',
            'onSecondaryFixed',
            'onSecondaryFixedVariant'
        ]
    },
    {
        id: 'tertiary',
        label: 'Tertiary',
        roles: [
            'tertiary',
            'onTertiary',
            'tertiaryContainer',
            'onTertiaryContainer',
            'tertiaryDim',
            'tertiaryFixed',
            'tertiaryFixedDim',
            'onTertiaryFixed',
            'onTertiaryFixedVariant'
        ]
    },
    {
        id: 'error',
        label: 'Error',
        roles: ['error', 'onError', 'errorContainer', 'onErrorContainer', 'errorDim']
    },
    {
        id: 'warning',
        label: 'Warning',
        roles: ['warning', 'onWarning', 'warningContainer', 'onWarningContainer']
    },
    {
        id: 'success',
        label: 'Success',
        roles: ['success', 'onSuccess', 'successContainer', 'onSuccessContainer']
    },
    {
        id: 'info',
        label: 'Info',
        roles: ['info', 'onInfo', 'infoContainer', 'onInfoContainer']
    },
    {
        id: 'diff-added',
        label: 'Diff added',
        roles: ['diffAdded', 'onDiffAdded', 'diffAddedContainer', 'onDiffAddedContainer']
    },
    {
        id: 'diff-removed',
        label: 'Diff removed',
        roles: ['diffRemoved', 'onDiffRemoved', 'diffRemovedContainer', 'onDiffRemovedContainer']
    },
    {
        id: 'surface',
        label: 'Surface',
        roles: [
            'background',
            'onBackground',
            'surface',
            'onSurface',
            'surfaceVariant',
            'onSurfaceVariant',
            'surfaceDim',
            'surfaceBright',
            'surfaceContainerLowest',
            'surfaceContainerLow',
            'surfaceContainer',
            'surfaceContainerHigh',
            'surfaceContainerHighest',
            'inverseSurface',
            'inverseOnSurface',
            'outline',
            'outlineVariant',
            'scrim',
            'shadow'
        ]
    }
]);

/** V2 hue scale names -> MD3 tonal palette names. */
const HUE_PALETTES = Object.freeze({
    gray: 'neutralPalette',
    red: 'errorPalette',
    blue: 'primaryPalette',
    purple: 'tertiaryPalette',
    green: 'secondaryPalette'
});

/** V2 hue step -> MD3 tone, anchored at the main 200 tone for each mode. */
const HUE_TONES = Object.freeze({
    light: Object.freeze({ 100: 20, 200: 40, 300: 50, 400: 60, 500: 70, 600: 80, 700: 85, 800: 90, 900: 95 }),
    dark: Object.freeze({ 100: 90, 200: 80, 300: 70, 400: 60, 500: 50, 600: 40, 700: 30, 800: 20, 900: 10 })
});

export const HUE_SCALE_NAMES = Object.freeze(Object.keys(HUE_PALETTES));

export const CATEGORICAL = Object.freeze(['blue', 'purple', 'green', 'red']);

export const HUE_ALIASES = Object.freeze({
    accent: '$hue.purple',
    interactive: '$hue.blue',
    neutral: '$hue.gray'
});

export function resolveVariant(id) {
    const normalized = String(id)
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .toLowerCase()
        .replace(/\s+/g, '-');
    const variant = VARIANTS.find(
        (entry) =>
            entry.id === normalized ||
            entry.slug === normalized ||
            entry.label.toLowerCase().replace(/\s+/g, '-') === normalized
    );
    if (!variant) {
        throw new Error(`unknown variant '${id}' (expected ${VARIANTS.map((entry) => entry.id).join('|')})`);
    }
    return variant;
}

export function resolveContrast(id) {
    const normalized = String(id).toLowerCase();
    const contrast = CONTRASTS.find((entry) => entry.id === normalized);
    if (!contrast) {
        throw new Error(`unknown contrast '${id}' (expected ${CONTRASTS.map((entry) => entry.id).join('|')})`);
    }
    return contrast;
}

/**
 * @param {{
 *   variant: string,
 *   source: string,
 *   contrast?: string,
 *   oled?: boolean
 * }} options
 */
export function createScheme(options) {
    if (!options?.source) throw new Error('createScheme requires a source color');
    const variant = resolveVariant(options.variant);
    const contrast = resolveContrast(options.contrast ?? 'default');
    const theme = createTheme({
        variant: variant.value,
        contrastLevel: contrast.level,
        specVersion: SPEC_VERSION,
        platform: 'phone',
        oled: Boolean(options.oled)
    })(options.source);
    theme.customColors = createCustomGroups({
        variant: variant.value,
        source: options.source,
        contrastLevel: contrast.level
    });
    return flattenCustomColors(theme);
}

/** `Hct.from(hue, chroma, tone)` -> `#rrggbb`. */
export function sourceFromHue(hue, chroma = 75, tone = 50) {
    const value = Number(hue);
    if (!Number.isFinite(value) || value < 0 || value > 360) {
        throw new Error(`hue must be 0-360, got '${hue}'`);
    }
    return formatHex(Hct.from(value, Number(chroma), Number(tone)).toInt());
}

/** `md.sys.color.primaryContainer` -> `md.sys.color.primary-container`. */
export function roleLabel(role) {
    return `md.sys.color.${role.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`;
}

/** `primaryContainer` -> `primary-container`. */
export function roleKebab(role) {
    return role.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

export function roleFamily(role) {
    for (const group of ROLE_GROUPS) {
        if (group.roles.includes(role)) return group.label;
    }
    return 'Other';
}

export function roleHex(scheme, mode, role) {
    if (role === 'transparent') return 'transparent';
    const value = scheme?.[mode]?.[role];
    return value === undefined ? null : formatHex(value);
}

/**
 * All selectable md.sys.color roles, grouped for <optgroup>.
 * Reference palette key colors are not md.sys.color roles and are excluded.
 */
export function systemRoleGroups(scheme) {
    if (!scheme?.light) throw new Error('systemRoleGroups requires a generated scheme');
    const available = new Set(
        Object.keys(scheme.light).filter((role) => !role.endsWith('PaletteKeyColor'))
    );
    const groups = [];
    const grouped = new Set();
    for (const group of ROLE_GROUPS) {
        const roles = group.roles.filter((role) => available.has(role));
        if (roles.length === 0) continue;
        for (const role of roles) grouped.add(role);
        groups.push({ id: group.id, label: group.label, roles });
    }
    const other = [...available].filter((role) => !grouped.has(role)).sort();
    if (other.length > 0) {
        groups.push({ id: 'other', label: 'Other', roles: other });
    }
    return groups;
}

export function systemRoleOptions(scheme, mode) {
    return systemRoleGroups(scheme).flatMap((group) =>
        group.roles.map((role) => ({
            role,
            family: group.label,
            label: roleLabel(role),
            hex: roleHex(scheme, mode, role)
        }))
    );
}

export function hueScales(palettes, mode) {
    const tones = HUE_TONES[mode];
    if (!tones) throw new Error(`unknown mode '${mode}'`);
    const scales = {};
    for (const [name, paletteName] of Object.entries(HUE_PALETTES)) {
        const palette = palettes?.[paletteName];
        if (!palette) continue;
        scales[name] = Object.fromEntries(
            Object.entries(tones).map(([step, tone]) => [Number(step), formatHex(palette.tone(tone))])
        );
    }
    return scales;
}

/** Full V2 `hue` object for one mode (scales + required aliases). */
export function hueDefinition(palettes, mode) {
    return {
        ...hueScales(palettes, mode),
        ...HUE_ALIASES
    };
}

/** Resolve `$hue.accent.200` to a literal color. */
export function resolveHueRef(hue, value) {
    const match = /^\$hue\.([^.]+)(?:\.(100|200|300|400|500|600|700|800|900))?$/.exec(value);
    if (!match) return null;
    const [, name, step] = match;
    const scale = hue?.[name];
    if (!scale) return null;
    if (step) return scale[Number(step)] ?? null;
    return scale;
}

/**
 * md3-{variant}-{hue|#hex}[-oled][-high|-reduced][suffix]
 * The suffix is separate so the dev-app can add `-v2` without changing
 * the existing contract.
 */
export function themeSlug({ variant, hue, source, contrast = 'default', oled = false, suffix = '' }) {
    const variantEntry = resolveVariant(variant);
    const contrastEntry = resolveContrast(contrast);
    const sourcePart = hue === undefined || hue === null ? source : String(hue);
    if (!sourcePart) throw new Error('themeSlug requires hue or source');
    return `md3-${variantEntry.slug}-${sourcePart}${oled ? '-oled' : ''}${contrastEntry.slug}${suffix}`;
}
