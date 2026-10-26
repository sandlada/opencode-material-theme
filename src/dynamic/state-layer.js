/**
 * MD3 state-layer derivation for V2 state tokens.
 *
 * Principle: in a hovered/focused/pressed/disabled component, a translucent
 * state-layer sits on top of the component. The perceived color is the
 * state-layer color (at the state opacity) composited over the base color:
 *
 *   result = composite(layerColor @ opacity, baseColor)
 *
 * The layer color follows the base role's paired bg/text counterpart
 * (base `primary` -> layer `onPrimary`, base `onSecondary` -> layer
 * `secondary`, base `onSurface` -> layer `surface`, ...), with special
 * roles falling back to `onSurface`.
 *
 * `disabled` is a special case: its layer is `transparent` (a no-op) and
 * its base is `outline-variant` at 32%, flattened over `surface`.
 * Disabled text is not derived at all — it is the explicit
 * `outline` role.
 *
 * Dependency-free apart from contrast.js color math, so the dev-app can run
 * it in the browser and the generator can reuse it in Bun/Node.
 */

import { composite, parseColor, toHex } from './contrast.js';

/**
 * State-layer opacity per V2 action state. `selected` stays explicit, `drag`
 * has no token, and `disabled` uses the wash below instead of an overlay.
 */
export const STATE_LAYER_OPACITY = Object.freeze({
    hovered: 0.08,
    focused: 0.1,
    pressed: 0.1
});

/** States that resolve via a derive directive (used for the auto option). */
const DERIVED_STATES = Object.freeze(['hovered', 'focused', 'pressed', 'disabled']);

/** Disabled wash: role + opacity, flattened over the `surface` role. */
export const DISABLED_WASH_ROLE = 'outlineVariant';
export const DISABLED_WASH_OPACITY = 0.32;
/** Backdrop the disabled wash is flattened over. */
export const DISABLED_BASE_ROLE = 'surface';

/**
 * Base role -> state-layer role. Symmetric content pairs swap with each
 * other; structural roles (containers, outlines, scrim/shadow) and anything
 * unlisted fall back to `onSurface`.
 */
const STATE_LAYER_PAIRING = Object.freeze({
    primary: 'onPrimary',
    onPrimary: 'primary',
    primaryContainer: 'onPrimaryContainer',
    onPrimaryContainer: 'primaryContainer',
    primaryDim: 'onPrimary',
    primaryFixed: 'onPrimaryFixed',
    primaryFixedDim: 'onPrimaryFixed',
    onPrimaryFixed: 'primaryFixed',
    onPrimaryFixedVariant: 'onPrimaryFixed',
    inversePrimary: 'onSurface',
    surfaceTint: 'onSurface',
    secondary: 'onSecondary',
    onSecondary: 'secondary',
    secondaryContainer: 'onSecondaryContainer',
    onSecondaryContainer: 'secondaryContainer',
    secondaryDim: 'onSecondary',
    secondaryFixed: 'onSecondaryFixed',
    secondaryFixedDim: 'onSecondaryFixed',
    onSecondaryFixed: 'secondaryFixed',
    onSecondaryFixedVariant: 'onSecondaryFixed',
    tertiary: 'onTertiary',
    onTertiary: 'tertiary',
    tertiaryContainer: 'onTertiaryContainer',
    onTertiaryContainer: 'tertiaryContainer',
    tertiaryDim: 'onTertiary',
    tertiaryFixed: 'onTertiaryFixed',
    tertiaryFixedDim: 'onTertiaryFixed',
    onTertiaryFixed: 'tertiaryFixed',
    onTertiaryFixedVariant: 'onTertiaryFixed',
    error: 'onError',
    onError: 'error',
    errorContainer: 'onErrorContainer',
    onErrorContainer: 'errorContainer',
    errorDim: 'onError',
    warning: 'onWarning',
    onWarning: 'warning',
    warningContainer: 'onWarningContainer',
    onWarningContainer: 'warningContainer',
    success: 'onSuccess',
    onSuccess: 'success',
    successContainer: 'onSuccessContainer',
    onSuccessContainer: 'successContainer',
    info: 'onInfo',
    onInfo: 'info',
    infoContainer: 'onInfoContainer',
    onInfoContainer: 'infoContainer',
    diffAdded: 'onDiffAdded',
    onDiffAdded: 'diffAdded',
    diffAddedContainer: 'onDiffAddedContainer',
    onDiffAddedContainer: 'diffAddedContainer',
    diffRemoved: 'onDiffRemoved',
    onDiffRemoved: 'diffRemoved',
    diffRemovedContainer: 'onDiffRemovedContainer',
    onDiffRemovedContainer: 'diffRemovedContainer',
    background: 'onBackground',
    onBackground: 'background',
    surface: 'onSurface',
    onSurface: 'surface',
    surfaceVariant: 'onSurfaceVariant',
    onSurfaceVariant: 'surfaceVariant',
    surfaceDim: 'onSurface',
    surfaceBright: 'onSurface',
    surfaceContainerLowest: 'onSurface',
    surfaceContainerLow: 'onSurface',
    surfaceContainer: 'onSurface',
    surfaceContainerHigh: 'onSurface',
    surfaceContainerHighest: 'onSurface',
    inverseSurface: 'inverseOnSurface',
    inverseOnSurface: 'inverseSurface',
    outline: 'onSurface',
    outlineVariant: 'onSurface',
    scrim: 'onSurface',
    shadow: 'onSurface'
});

export const STATE_LAYER_FALLBACK_ROLE = 'onSurface';

/** Layer role for a base role; unknown roles fall back to `onSurface`. */
export function stateLayerRoleFor(baseRole) {
    return STATE_LAYER_PAIRING[baseRole] ?? STATE_LAYER_FALLBACK_ROLE;
}

/** True when a base role has no explicit pairing and resolves via fallback. */
export function isStateLayerFallback(baseRole) {
    return !Object.hasOwn(STATE_LAYER_PAIRING, baseRole);
}

/** True when a mapping slot/entry is a state-layer derive directive. */
export function isDeriveEntry(value) {
    return !!value && typeof value === 'object' && !!value.derive && typeof value.derive === 'object';
}

/**
 * Token path suffix ($hovered/$focused/$pressed/$disabled) -> state key.
 * Returns null for base paths and for `$selected` (stays explicit).
 */
export function derivedStateOf(path) {
    const match = /\.\$([^.]+)$/.exec(path);
    if (!match) return null;
    return DERIVED_STATES.includes(match[1]) ? match[1] : null;
}

/** `text.action.primary.$hovered` -> `text.action.primary.base`. */
export function basePathOf(path) {
    return path.replace(/\.\$[^.]+$/, '.base');
}

/**
 * Compute the perceived state color: layer color at state opacity over base.
 * @returns {string} opaque `#rrggbb` hex
 */
export function computeStateColor(baseHex, layerHex, opacity) {
    const base = parseColor(baseHex);
    const layer = parseColor(layerHex);
    if (!base || !layer) {
        throw new Error(`cannot compute state color from '${baseHex}' over '${layerHex}'`);
    }
    return toHex(composite({ ...layer, a: opacity }, base));
}

/**
 * Compute the disabled color: an `outline-variant` wash at 32% over
 * `surface`. The state layer itself is transparent (no-op).
 * @returns {string} opaque `#rrggbb` hex
 */
export function computeDisabledColor(backdropHex, washHex, opacity = DISABLED_WASH_OPACITY) {
    const backdrop = parseColor(backdropHex);
    const wash = parseColor(washHex);
    if (!backdrop || !wash) {
        throw new Error(`cannot compute disabled color from '${washHex}' over '${backdropHex}'`);
    }
    return toHex(composite({ ...wash, a: opacity }, backdrop));
}
