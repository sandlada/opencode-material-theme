import {
    createOpenCodeDynamic,
    resolveDynamicDocument
} from '@dynamic/dynamic.js';
import {
    CONTRASTS,
    VARIANTS,
    sourceFromHue,
    themeSlug
} from '@dynamic/md3.js';

const listeners = new Set();

/**
 * Dynamic-only generator state. There is no token mapping anymore: roles
 * are internal to OpenCodeDynamic, so the lab controls variant / HCT
 * source / contrast / OLED and previews the derived document.
 */
export const state = {
    generator: {
        variant: 'content',
        hue: 120,
        chroma: 75,
        tone: 50,
        source: null,
        contrast: 'default',
        oled: false
    },
    preview: {
        mode: 'light',
        tabsLayout: 'horizontal',
        indicators: 'status',
        sidebar: true,
        dialog: false,
        state: 'default',
        debugLabels: false
    },
    themeName: '',
    themeNameEdited: false
};

let cachedKey = '';
let cachedDynamic = null;

export const GENERATOR_OPTIONS = Object.freeze({
    variants: VARIANTS,
    contrasts: CONTRASTS
});

export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function notify() {
    for (const listener of listeners) listener();
}

export function getSourceHex() {
    if (state.generator.source) return state.generator.source;
    return sourceFromHue(state.generator.hue, state.generator.chroma, state.generator.tone);
}

export function getDynamic() {
    const key = JSON.stringify(state.generator);
    if (key !== cachedKey) {
        cachedKey = key;
        cachedDynamic = createOpenCodeDynamic({
            variant: state.generator.variant,
            source: getSourceHex(),
            contrast: state.generator.contrast,
            oled: state.generator.oled
        });
    }
    return cachedDynamic;
}

export function getScheme() {
    return getDynamic().scheme;
}

export function getThemeName() {
    if (state.themeNameEdited && state.themeName.trim()) return state.themeName.trim();
    return themeSlug({
        variant: state.generator.variant,
        hue: state.generator.source ? undefined : state.generator.hue,
        source: state.generator.source ?? undefined,
        contrast: state.generator.contrast,
        oled: state.generator.oled,
        suffix: '-v2'
    });
}

export function getDocument() {
    return getDynamic().document;
}

export function getResolved(mode = state.preview.mode) {
    const resolved = resolveDynamicDocument(getDocument(), mode);
    return { ...resolved, dialogTokens: {} };
}

export function setGenerator(patch) {
    Object.assign(state.generator, patch);
    if (!state.themeNameEdited) state.themeName = getThemeName();
    notify();
}

export function setPreview(patch) {
    Object.assign(state.preview, patch);
    notify();
}

export function setThemeName(name) {
    const trimmed = name.trim();
    state.themeName = name;
    state.themeNameEdited = false;
    const computed = getThemeName();
    state.themeNameEdited = trimmed !== '' && trimmed !== computed;
    notify();
}

export function syncThemeName() {
    if (!state.themeNameEdited) state.themeName = getThemeName();
}
