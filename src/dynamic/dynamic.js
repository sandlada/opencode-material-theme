/**
 * OpenCodeDynamic: HCT + variant/contrast/oled in, all v2 tokens out.
 *
 * Temporary bridge: MD scheme machinery (md3.js), state-layer math and the
 * role table (migrated from the old default-map.js, now private and frozen)
 * live under src/dynamic/. Nothing here reads an upstream snapshot or the
 * upstream TS schema; token structure comes from ./schema.js
 * (OpenCodeDynamicSchema) only.
 */

import { formatHex } from '@sandlada/mcu-helper';
import { DYNAMIC_SCHEMA_URL, DYNAMIC_STATE_FALLBACKS, DYNAMIC_TOKEN_BY_PATH } from './schema.js';
import { DYNAMIC_REQUIRED_PATHS, HUE_STEPS } from './schema.js';
import {
    CATEGORICAL,
    createScheme as createMdScheme,
    hueDefinition,
    resolveContrast as resolveMdContrast,
    resolveHueRef,
    resolveVariant as resolveMdVariant,
    sourceFromHue as mdSourceFromHue
} from './md3.js';
import {
    DISABLED_BASE_ROLE,
    DISABLED_WASH_OPACITY,
    DISABLED_WASH_ROLE,
    STATE_LAYER_OPACITY,
    computeDisabledColor,
    computeStateColor,
    isDeriveEntry,
    stateLayerRoleFor
} from './state-layer.js';

export { OpenCodeDynamicSchema } from './schema.js';

const same = (role) => Object.freeze({ light: role, dark: role });
const derive = (from, state) => Object.freeze({ derive: { from, state } });

/**
 * Private token -> md.sys.color role table. Formerly DEFAULT_MAPPING;
 * now an internal detail of the Dynamic provider, not a user-editable
 * mapping. Frozen so previews and exports cannot drift from the scheme.
 */
const DYNAMIC_ROLES = Object.freeze({
    'text.base': same('onSurface'),
    'text.muted': same('onSurfaceVariant'),
    'text.faint': same('outline'),
    'text.action.primary.base': same('onPrimary'),
    'text.action.primary.$hovered': derive('text.action.primary.base', 'hovered'),
    'text.action.primary.$focused': derive('text.action.primary.base', 'focused'),
    'text.action.primary.$pressed': derive('text.action.primary.base', 'pressed'),
    'text.action.primary.$selected': same('onPrimary'),
    'text.action.primary.$disabled': same('outline'),
    'text.action.secondary.base': same('onSecondary'),
    'text.action.secondary.$hovered': derive('text.action.secondary.base', 'hovered'),
    'text.action.secondary.$focused': derive('text.action.secondary.base', 'focused'),
    'text.action.secondary.$pressed': derive('text.action.secondary.base', 'pressed'),
    'text.action.secondary.$selected': same('onSecondaryContainer'),
    'text.action.secondary.$disabled': same('outline'),
    'text.action.destructive.base': same('onError'),
    'text.action.destructive.$hovered': derive('text.action.destructive.base', 'hovered'),
    'text.action.destructive.$focused': derive('text.action.destructive.base', 'focused'),
    'text.action.destructive.$pressed': derive('text.action.destructive.base', 'pressed'),
    'text.action.destructive.$selected': same('onError'),
    'text.action.destructive.$disabled': same('outline'),
    'text.formfield.base': same('onSurface'),
    'text.formfield.$hovered': derive('text.formfield.base', 'hovered'),
    'text.formfield.$focused': derive('text.formfield.base', 'focused'),
    'text.formfield.$pressed': derive('text.formfield.base', 'pressed'),
    'text.formfield.$selected': same('onSecondaryContainer'),
    'text.formfield.$disabled': same('outline'),
    'text.feedback.error.base': same('onErrorContainer'),
    'text.feedback.error.muted': same('onErrorContainer'),
    'text.feedback.warning.base': same('onWarningContainer'),
    'text.feedback.warning.muted': same('onWarningContainer'),
    'text.feedback.success.base': same('onSuccessContainer'),
    'text.feedback.success.muted': same('onSuccessContainer'),
    'text.feedback.info.base': same('onInfoContainer'),
    'text.feedback.info.muted': same('onInfoContainer'),
    'background.base': same('surface'),
    'background.raised.base': same('surfaceContainer'),
    'background.raised.high': same('surfaceContainerLow'),
    'background.raised.max': same('surfaceContainerLowest'),
    'background.action.primary.base': same('primary'),
    'background.action.primary.$hovered': derive('background.action.primary.base', 'hovered'),
    'background.action.primary.$focused': derive('background.action.primary.base', 'focused'),
    'background.action.primary.$pressed': derive('background.action.primary.base', 'pressed'),
    'background.action.primary.$selected': same('primary'),
    'background.action.primary.$disabled': derive('background.action.primary.base', 'disabled'),
    'background.action.secondary.base': same('secondary'),
    'background.action.secondary.$hovered': derive('background.action.secondary.base', 'hovered'),
    'background.action.secondary.$focused': derive('background.action.secondary.base', 'focused'),
    'background.action.secondary.$pressed': derive('background.action.secondary.base', 'pressed'),
    'background.action.secondary.$selected': same('secondaryContainer'),
    'background.action.secondary.$disabled': derive('background.action.secondary.base', 'disabled'),
    'background.action.destructive.base': same('error'),
    'background.action.destructive.$hovered': derive('background.action.destructive.base', 'hovered'),
    'background.action.destructive.$focused': derive('background.action.destructive.base', 'focused'),
    'background.action.destructive.$pressed': derive('background.action.destructive.base', 'pressed'),
    'background.action.destructive.$selected': same('error'),
    'background.action.destructive.$disabled': derive('background.action.destructive.base', 'disabled'),
    'background.formfield.base': same('surfaceContainer'),
    'background.formfield.$hovered': derive('background.formfield.base', 'hovered'),
    'background.formfield.$focused': derive('background.formfield.base', 'focused'),
    'background.formfield.$pressed': derive('background.formfield.base', 'pressed'),
    'background.formfield.$selected': same('secondaryContainer'),
    'background.formfield.$disabled': derive('background.formfield.base', 'disabled'),
    'background.feedback.error.base': same('errorContainer'),
    'background.feedback.warning.base': same('warningContainer'),
    'background.feedback.success.base': same('successContainer'),
    'background.feedback.info.base': same('infoContainer'),
    'border.base': same('outlineVariant'),
    'scrollbar.base': same('outline'),
    'diff.text.added': same('onDiffAddedContainer'),
    'diff.text.removed': same('onDiffRemovedContainer'),
    'diff.text.context': same('onSurfaceVariant'),
    'diff.text.hunkHeader': same('secondary'),
    'diff.background.added': same('diffAddedContainer'),
    'diff.background.removed': same('diffRemovedContainer'),
    'diff.background.context': same('surfaceContainer'),
    'diff.highlight.added': same('onDiffAddedContainer'),
    'diff.highlight.removed': same('onDiffRemovedContainer'),
    'diff.lineNumber.text': same('outline'),
    'diff.lineNumber.background.added': same('diffAddedContainer'),
    'diff.lineNumber.background.removed': same('diffRemovedContainer'),
    'syntax.comment': same('outline'),
    'syntax.keyword': same('secondary'),
    'syntax.function': same('primary'),
    'syntax.variable': same('tertiary'),
    'syntax.string': same('tertiary'),
    'syntax.number': same('onSecondaryContainer'),
    'syntax.type': same('secondary'),
    'syntax.operator': same('onSurfaceVariant'),
    'syntax.punctuation': same('onSurface'),
    'markdown.text': same('onSurface'),
    'markdown.heading': same('primary'),
    'markdown.link': same('secondary'),
    'markdown.linkText': same('tertiary'),
    'markdown.code': same('onSecondaryContainer'),
    'markdown.blockQuote': same('onSurfaceVariant'),
    'markdown.emphasis': same('secondary'),
    'markdown.strong': same('primary'),
    'markdown.horizontalRule': same('outline'),
    'markdown.listItem': same('onSurface'),
    'markdown.listEnumeration': same('secondary'),
    'markdown.image': same('secondary'),
    'markdown.imageText': same('tertiary'),
    'markdown.codeBlock': same('onSurface')
});

function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function setPath(target, path, value) {
    const keys = path.split('.');
    let node = target;
    for (let index = 0; index < keys.length - 1; index += 1) {
        const key = keys[index];
        if (!isPlainObject(node[key])) node[key] = {};
        node = node[key];
    }
    node[keys[keys.length - 1]] = value;
}

export function getPath(target, path) {
    return path.split('.').reduce((node, key) => (isPlainObject(node) ? node[key] : undefined), target);
}

function mergeTheme(base = {}, override = {}) {
    const result = { ...base };
    for (const [key, value] of Object.entries(override)) {
        if (isPlainObject(value) && isPlainObject(result[key])) {
            result[key] = mergeTheme(result[key], value);
        } else {
            result[key] = value;
        }
    }
    return result;
}

function equalValue(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
}

function diffTree(light = {}, dark = {}) {
    const result = {};
    for (const [key, value] of Object.entries(dark)) {
        if (isPlainObject(value) && isPlainObject(light?.[key])) {
            const nested = diffTree(light[key], value);
            if (Object.keys(nested).length > 0) result[key] = nested;
        } else if (!equalValue(value, light?.[key])) {
            result[key] = structuredClone(value);
        }
    }
    return result;
}

function flattenTokens(tree, prefix = '') {
    const result = {};
    if (!isPlainObject(tree)) return result;
    for (const [key, value] of Object.entries(tree)) {
        if (key === 'hue' || key === 'categorical' || key === '@dialog') continue;
        const path = prefix ? `${prefix}.${key}` : key;
        if (isPlainObject(value)) {
            Object.assign(result, flattenTokens(value, path));
        } else {
            result[path] = value;
        }
    }
    return result;
}

export function resolveRole(scheme, mode, role, path = '') {
    if (role === 'transparent' || role === 'none') return 'transparent';
    const value = scheme?.[mode]?.[role];
    if (value === undefined) {
        throw new Error(`role '${role}' is not available in ${mode} scheme${path ? ` for ${path}` : ''}`);
    }
    return formatHex(value);
}

export function resolveDerived(mapping, scheme, mode, deriveDirective, path = '') {
    const { from, state } = deriveDirective ?? {};
    if (typeof from !== 'string') {
        throw new Error(`invalid derive directive for ${path || 'unknown token'}: ${JSON.stringify(deriveDirective)}`);
    }
    if (!DYNAMIC_TOKEN_BY_PATH.has(from)) {
        throw new Error(`derive base '${from}' is not a known token (for ${path})`);
    }
    const baseEntry = mapping?.[from];
    const baseRole = typeof baseEntry === 'string' ? baseEntry : baseEntry?.[mode];
    if (typeof baseRole !== 'string' || baseRole === 'inherit') {
        throw new Error(`derive base '${from}' has no ${mode} role (for ${path})`);
    }
    if (baseRole === 'transparent' || baseRole === 'none') return 'transparent';
    const baseHex = resolveRole(scheme, mode, baseRole, from);
    if (baseHex === 'transparent') return 'transparent';
    if (state === 'disabled') {
        const washHex = resolveRole(scheme, mode, DISABLED_WASH_ROLE, `${path || from} (wash)`);
        const backdropHex = resolveRole(scheme, mode, DISABLED_BASE_ROLE, `${path || from} (backdrop)`);
        return computeDisabledColor(backdropHex, washHex, DISABLED_WASH_OPACITY);
    }
    const opacity = STATE_LAYER_OPACITY[state];
    if (opacity === undefined) {
        throw new Error(`invalid derive directive for ${path || 'unknown token'}: ${JSON.stringify(deriveDirective)}`);
    }
    const layerRole = stateLayerRoleFor(baseRole);
    const layerHex = resolveRole(scheme, mode, layerRole, `${path || from} (layer)`);
    return computeStateColor(baseHex, layerHex, opacity);
}

const DYNAMIC_TOKEN_PATH_LIST = [...DYNAMIC_TOKEN_BY_PATH.keys()];

function buildTokenTree(scheme, mode) {
    const tree = {};
    for (const path of DYNAMIC_TOKEN_PATH_LIST) {
        const entry = DYNAMIC_ROLES[path];
        if (entry === undefined || entry === null) {
            if (DYNAMIC_REQUIRED_PATHS.includes(path)) {
                throw new Error(`missing required dynamic role for ${path}`);
            }
            continue;
        }
        if (isDeriveEntry(entry)) {
            setPath(tree, path, resolveDerived(DYNAMIC_ROLES, scheme, mode, entry.derive, path));
            continue;
        }
        const role = typeof entry === 'string' ? entry : entry[mode];
        if (role === undefined || role === null || role === 'inherit') {
            if (DYNAMIC_REQUIRED_PATHS.includes(path)) {
                throw new Error(`missing required ${mode} dynamic role for ${path}`);
            }
            continue;
        }
        if (isDeriveEntry(role)) {
            setPath(tree, path, resolveDerived(DYNAMIC_ROLES, scheme, mode, role.derive, path));
            continue;
        }
        setPath(tree, path, resolveRole(scheme, mode, role, path));
    }
    return tree;
}

function applyFallbacks(tokens) {
    for (const [target, source] of DYNAMIC_STATE_FALLBACKS) {
        if (tokens[target] === undefined && tokens[source] !== undefined) {
            tokens[target] = tokens[source];
        }
    }
}

function resolveHueAliases(hue) {
    const result = { ...hue };
    for (const [name, value] of Object.entries(hue)) {
        if (typeof value !== 'string' || !value.startsWith('$hue.')) continue;
        const target = value.slice('$hue.'.length);
        if (isPlainObject(hue[target])) result[name] = hue[target];
    }
    return result;
}

/**
 * Create the provider: HCT/variant/contrast/oled in, full document out.
 * `hue/chroma/tone` and `source` are mutually exclusive; `source` wins.
 */
export function createOpenCodeDynamic(options = {}) {
    const variant = resolveMdVariant(options.variant ?? 'content');
    const contrast = resolveMdContrast(options.contrast ?? 'default');
    const oled = Boolean(options.oled);
    const source = options.source ?? mdSourceFromHue(options.hue ?? 120, options.chroma ?? 75, options.tone ?? 50);
    const scheme = createMdScheme({ variant: variant.id, source, contrast: contrast.id, oled });

    const lightTokens = buildTokenTree(scheme, 'light');
    const darkTokens = buildTokenTree(scheme, 'dark');
    const base = { categorical: [...CATEGORICAL], ...lightTokens };
    const light = { hue: hueDefinition(scheme.palettes, 'light') };
    const dark = { hue: hueDefinition(scheme.palettes, 'dark'), ...diffTree(lightTokens, darkTokens) };
    const document = { $schema: DYNAMIC_SCHEMA_URL, base, light, dark };

    return {
        variant: variant.id,
        contrast: contrast.id,
        oled,
        sourceHex: source,
        scheme,
        document
    };
}

function resolveValue(value, rawTokens, hue, stack) {
    if (typeof value !== 'string') return value;
    if (value.startsWith('$hue.')) {
        const resolved = resolveHueRef(hue, value);
        return resolved === null ? null : resolved;
    }
    if (value.startsWith('$')) {
        const path = value.slice(1);
        if (stack.includes(path)) {
            throw new Error(`circular theme reference: ${[...stack, path].join(' -> ')}`);
        }
        const next = rawTokens[path];
        if (next === undefined) return null;
        return resolveValue(next, rawTokens, hue, [...stack, path]);
    }
    return value;
}

export function resolveDynamicDocument(doc, mode) {
    if (mode !== 'light' && mode !== 'dark') throw new Error(`unknown mode '${mode}'`);
    const merged = mergeTheme(doc.base, doc[mode] ?? {});
    const rawTokens = flattenTokens(merged);
    const hue = resolveHueAliases(merged.hue ?? {});
    const tokens = {};
    for (const path of Object.keys(rawTokens)) {
        tokens[path] = resolveValue(rawTokens[path], rawTokens, hue, []);
    }
    applyFallbacks(tokens);
    return { tokens, hue, categorical: merged.categorical ?? [] };
}

function isColorValue(value) {
    return (
        typeof value === 'string' &&
        (value === 'transparent' || value === 'none' || /^#([0-9a-f]{3,8})$/i.test(value) || value.startsWith('$'))
    );
}

function walkLeaves(tree, prefix, visit) {
    if (!isPlainObject(tree)) return;
    for (const [key, value] of Object.entries(tree)) {
        if (key === 'hue' || key === 'categorical' || key === '@dialog') continue;
        const path = prefix ? `${prefix}.${key}` : key;
        if (isPlainObject(value)) {
            walkLeaves(value, path, visit);
        } else {
            visit(path, value);
        }
    }
}

export function validateDynamicDocument(doc) {
    const errors = [];
    if (!isPlainObject(doc?.base)) {
        errors.push('missing base object');
        return { valid: false, errors };
    }
    for (const path of DYNAMIC_REQUIRED_PATHS) {
        if (getPath(doc.base, path) === undefined) errors.push(`missing required base token: ${path}`);
    }
    walkLeaves(doc.base, '', (path, value) => {
        if (!isColorValue(value)) errors.push(`invalid color at ${path}: ${JSON.stringify(value)}`);
        if (!DYNAMIC_TOKEN_BY_PATH.has(path)) errors.push(`unknown token: ${path}`);
    });
    for (const mode of ['light', 'dark']) {
        const modeDoc = doc[mode];
        if (!isPlainObject(modeDoc)) continue;
        if (!isPlainObject(modeDoc.hue)) {
            errors.push(`missing ${mode}.hue`);
            continue;
        }
        for (const alias of ['accent', 'interactive', 'neutral']) {
            const value = modeDoc.hue[alias];
            if (typeof value !== 'string' || !value.startsWith('$hue.')) {
                errors.push(`missing or invalid ${mode}.hue.${alias}`);
                continue;
            }
            const target = value.slice('$hue.'.length);
            if (!isPlainObject(modeDoc.hue[target])) errors.push(`${mode}.hue.${alias} points to missing hue '${target}'`);
        }
        for (const [name, scale] of Object.entries(modeDoc.hue)) {
            if (typeof scale === 'string') continue;
            if (!isPlainObject(scale)) {
                errors.push(`invalid ${mode}.hue.${name}`);
                continue;
            }
            for (const step of HUE_STEPS) {
                if (!isColorValue(scale[step])) errors.push(`missing or invalid ${mode}.hue.${name}.${step}`);
            }
        }
        walkLeaves(modeDoc, '', (path, value) => {
            if (!isColorValue(value)) errors.push(`invalid ${mode} color at ${path}: ${JSON.stringify(value)}`);
            if (!DYNAMIC_TOKEN_BY_PATH.has(path)) errors.push(`unknown ${mode} token: ${path}`);
        });
    }
    return { valid: errors.length === 0, errors };
}
