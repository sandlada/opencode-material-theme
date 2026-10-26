/**
 * Variant-aware custom-color scheme for the tokens no standard MD3 role
 * can express (`warning` / `success` / `info` / `diffAdded` / `diffRemoved`).
 *
 * `SemanticScheme` subclasses MCU's `DynamicScheme` and adds one palette
 * per semantic seed. Each palette keeps its semantic hue (the seed hue
 * nudged toward the theme source with MCU `Blend.harmonize`, the same
 * `blend: true` semantics `mcu-helper` custom colors used) while its
 * chroma follows the per-variant grammar of MCU's own secondary
 * palettes, anchored at the seed chroma `C` instead of the source:
 *
 *   monochrome  -> 0                  (grayscale shared ladder)
 *   neutral     -> 8
 *   rainbow     -> 16
 *   tonal-spot  -> 16
 *   expressive  -> 24
 *   vibrant     -> 24
 *   fruit-salad -> 36
 *   content     -> max(C - 32, C * 0.5)
 *   fidelity    -> max(C - 32, C * 0.5)
 *
 * Hue rotation (which MCU applies to expressive/vibrant/fruit-salad
 * accents) is deliberately NOT applied: rotating would collapse the
 * yellow/green/blue/red semantics the groups exist for.
 *
 * Tones are not hand-picked. Each group is evaluated through MCU's own
 * `error` / `onError` / `errorContainer` / `onErrorContainer` Dynamic
 * Colors by constructing the scheme with an `errorPalette` override, so
 * tone functions, contrast curves, tone-delta pairs and the 2021/2025
 * spec dispatch follow `contrastLevel` exactly the way `error` does
 * (including MCU's per-variant spec fallback), with one exception:
 * `diffAdded` / `diffRemoved` containers are brightened past the `error`
 * curve (light container tone 90, dark container tone 40 with tone-90
 * text) and run at a minimum chroma of 48 so the washes stay vivid in
 * low-chroma variants, because the default tone 90/30 washes read too
 * muddy, except at high contrastLevel which keeps the `error` pairing
 * for peak legibility. `createCustomGroups` is
 * the public entry point; `md3.js` flattens its output into the scheme.
 */

import { Blend, DynamicScheme, Hct, TonalPalette, Variant } from '@material/material-color-utilities';
import { MaterialContrastLevel, parseSourceColor } from '@sandlada/mcu-helper';
import { CUSTOM_SEEDS } from './custom-colors.js';

/**
 * Per-variant chroma for a semantic palette, mirroring MCU's secondary
 * palette grammar anchored at the seed chroma.
 */
export function customChromaFor(variant, seedChroma) {
    switch (variant) {
        case Variant.MONOCHROME:
            return 0;
        case Variant.NEUTRAL:
            return 8;
        case Variant.RAINBOW:
            return 16;
        case Variant.TONAL_SPOT:
            return 16;
        case Variant.EXPRESSIVE:
            return 24;
        case Variant.VIBRANT:
            return 24;
        case Variant.FRUIT_SALAD:
            return 36;
        case Variant.CONTENT:
        case Variant.FIDELITY:
            return Math.max(seedChroma - 32, seedChroma * 0.5);
        default:
            throw new Error(`unsupported variant for custom colors: ${variant}`);
    }
}

/**
 * Variant-aware palette for one semantic seed: harmonized seed hue with
 * the variant chroma from {@link customChromaFor}. `chromaFloor` lifts
 * the result (used by the diff groups so added/removed stay vivid even
 * in low-chroma variants); monochrome still resolves to 0 via
 * {@link customChromaFor} unless a floor is passed, so callers that need
 * the grayscale ladder must not pass one.
 */
export function semanticPaletteFor(variant, sourceHct, seed, chromaFloor = 0) {
    const harmonized = Hct.fromInt(Blend.harmonize(parseSourceColor(seed).toInt(), sourceHct.toInt()));
    return TonalPalette.fromHueAndChroma(
        harmonized.hue,
        Math.max(customChromaFor(variant, harmonized.chroma), chromaFloor)
    );
}

const SEED_BY_NAME = new Map(CUSTOM_SEEDS.map((entry) => [entry.name, entry.seed]));

function seedFor(name) {
    const seed = SEED_BY_NAME.get(name);
    if (!seed) throw new Error(`unknown custom color '${name}'`);
    return seed;
}

export class SemanticScheme extends DynamicScheme {
    constructor({ source, variant, contrastLevel, isDark, errorPalette }) {
        super({
            sourceColorHct: typeof source === 'string' ? parseSourceColor(source) : source,
            variant,
            contrastLevel,
            isDark,
            specVersion: '2025',
            platform: 'phone',
            ...(errorPalette === undefined ? {} : { errorPalette })
        });
    }

    /** Variant-aware palette for a seed hex (harmonized hue + variant chroma). */
    semanticPalette(seed, chromaFloor = 0) {
        return semanticPaletteFor(this.variant, this.sourceColorHct, seed, chromaFloor);
    }

    warningPalette() {
        return this.semanticPalette(seedFor('warning'));
    }

    successPalette() {
        return this.semanticPalette(seedFor('success'));
    }

    infoPalette() {
        return this.semanticPalette(seedFor('info'));
    }

    diffAddedPalette() {
        return this.semanticPalette(seedFor('diffAdded'));
    }

    diffRemovedPalette() {
        return this.semanticPalette(seedFor('diffRemoved'));
    }
}

function groupTones(scheme) {
    return {
        color: scheme.error,
        onColor: scheme.onError,
        colorContainer: scheme.errorContainer,
        onColorContainer: scheme.onErrorContainer
    };
}

/**
 * Brightened container tones for the two diff groups (the only groups
 * whose wash backgrounds double as large area fills).
 *
 * Light lifts the wash to tone 90 (tone 95 reads translucent but is too
 * washed out, and pale red is gamut-capped in sRGB so depth has to come
 * from the tone) while keeping the `error`-curve text
 * (`onErrorContainer`): darker text on a lighter wash raises contrast.
 * Dark lifts the wash from tone 30 to tone 40, which forces the text up
 * to tone 90 to hold the 4.5 text floor (same light text on a lighter
 * wash would drop below it). Tone 40 is the brightest dark wash that
 * still pairs with a palette tone at >= 4.5.
 *
 * High contrast keeps the `error`-curve pairing instead: there the text
 * already sits near the extreme, so any brighter wash would collapse the
 * pair (verified: monochrome/high/light drops to 1.13). At high
 * contrastLevel peak legibility wins over the wash aesthetic.
 */
function diffGroupTones(lightScheme, darkScheme, palette) {
    return {
        light: {
            color: lightScheme.error,
            onColor: lightScheme.onError,
            colorContainer: palette.tone(90),
            onColorContainer: lightScheme.onErrorContainer
        },
        dark: {
            color: darkScheme.error,
            onColor: darkScheme.onError,
            colorContainer: palette.tone(40),
            onColorContainer: palette.tone(90)
        }
    };
}

/** Custom-color groups with brightened diff washes (see {@link diffGroupTones}). */
const DIFF_GROUP_NAMES = Object.freeze(['diffAdded', 'diffRemoved']);

/**
 * Minimum palette chroma for the diff groups. The variant grammar goes
 * as low as 8-24 (neutral/expressive), which renders Git added/removed
 * as muddy gray-green/brown. The floor keeps them vivid in every
 * non-monochrome variant; monochrome still forces 0 (grayscale ladder).
 */
const DIFF_CHROMA_FLOOR = 48;

/**
 * Build the five custom-color groups (mcu-helper-shaped, ARGB ints).
 * Each group runs through the `error` Dynamic Colors on its own
 * variant-aware palette, so tones and contrast behavior track the
 * theme's variant and contrast level.
 */
export function createCustomGroups({ variant, source, contrastLevel }) {
    return CUSTOM_SEEDS.map(({ name, seed }) => {
        const probe = new SemanticScheme({ source, variant, contrastLevel, isDark: false });
        const palette = DIFF_GROUP_NAMES.includes(name)
            ? probe.semanticPalette(seed, variant === Variant.MONOCHROME ? 0 : DIFF_CHROMA_FLOOR)
            : probe.semanticPalette(seed);
        const light = new SemanticScheme({ source, variant, contrastLevel, isDark: false, errorPalette: palette });
        const dark = new SemanticScheme({ source, variant, contrastLevel, isDark: true, errorPalette: palette });
        if (DIFF_GROUP_NAMES.includes(name) && contrastLevel !== MaterialContrastLevel.High) {
            const tones = diffGroupTones(light, dark, palette);
            return { name, palette, light: tones.light, dark: tones.dark };
        }
        return { name, palette, light: groupTones(light), dark: groupTones(dark) };
    });
}
