import { checkContrast, failingChecks } from '@dynamic/contrast.js';
import { DYNAMIC_SCHEMA_ID, DYNAMIC_TOKEN_PATHS } from '@dynamic/schema.js';
import {
    GENERATOR_OPTIONS,
    getResolved,
    getSourceHex,
    getThemeName,
    setGenerator,
    setPreview,
    setThemeName,
    state,
    subscribe
} from './state.js';
import { bindControls, renderContrast, renderControls, renderPalette, updateSwatches } from './ui/controls.js';
import { applyPreview } from './ui/preview.js';
import { copyTheme, downloadTheme, validateExport } from './ui/export.js';
import { showToast } from './ui/toast.js';

const HUE_OPTIONS = Array.from({ length: 12 }, (_, index) => index * 30);

function option(value, label) {
    return `<option value="${value}">${label}</option>`;
}

function fillSelect(element, entries) {
    if (!element) return;
    element.innerHTML = entries.map((entry) => option(entry.value, entry.label)).join('');
}

function fillStaticSelects() {
    fillSelect(
        document.getElementById('variant'),
        GENERATOR_OPTIONS.variants.map((variant) => ({ value: variant.id, label: variant.label }))
    );
    fillSelect(
        document.getElementById('contrast'),
        GENERATOR_OPTIONS.contrasts.map((contrast) => ({ value: contrast.id, label: contrast.label }))
    );
    fillSelect(
        document.getElementById('hue'),
        HUE_OPTIONS.map((hue) => ({ value: String(hue), label: String(hue) }))
    );
}

function setSourceMode(mode) {
    if (mode === 'hex') {
        const source = getSourceHex();
        setGenerator({ source });
        return;
    }
    setGenerator({ source: null });
}

function syncSourceInputs() {
    const isHex = Boolean(state.generator.source);
    document.getElementById('source-mode-hue')?.classList.toggle('is-active', !isHex);
    document.getElementById('source-mode-hex')?.classList.toggle('is-active', isHex);
    const hueFields = document.getElementById('hue-fields');
    const hexFields = document.getElementById('hex-fields');
    if (hueFields) hueFields.hidden = isHex;
    if (hexFields) hexFields.hidden = !isHex;

    const source = getSourceHex();
    const color = document.getElementById('source-color');
    const hex = document.getElementById('source-hex');
    if (color && document.activeElement !== color) color.value = source;
    if (hex && document.activeElement !== hex) hex.value = source;
}

function syncGeneratorInputs() {
    const variant = document.getElementById('variant');
    const hue = document.getElementById('hue');
    const contrast = document.getElementById('contrast');
    const oled = document.getElementById('oled');
    const chroma = document.getElementById('chroma');
    const tone = document.getElementById('tone');
    if (variant) variant.value = state.generator.variant;
    if (hue) {
        const value = String(state.generator.hue);
        if (![...hue.options].some((entry) => entry.value === value)) {
            hue.append(new Option(value, value));
        }
        hue.value = value;
    }
    if (contrast) contrast.value = state.generator.contrast;
    if (oled) oled.checked = state.generator.oled;
    if (chroma) chroma.value = state.generator.chroma;
    if (tone) tone.value = state.generator.tone;
    syncSourceInputs();

    const name = document.getElementById('theme-name');
    if (name && document.activeElement !== name) name.value = getThemeName();
}

function updateStatus() {
    const source = getSourceHex();
    let totalChecks = 0;
    let failingCount = 0;
    for (const mode of ['light', 'dark']) {
        const { tokens } = getResolved(mode);
        const checks = checkContrast(tokens);
        totalChecks += checks.length;
        failingCount += failingChecks(checks).length;
    }
    const name = document.getElementById('theme-name');
    if (name && document.activeElement !== name) name.value = getThemeName();
    const file = document.getElementById('theme-file');
    if (file) file.textContent = `${getThemeName()}.json`;
    const sourceLabel = document.getElementById('source-label');
    if (sourceLabel) sourceLabel.textContent = source;
    const sourceSwatch = document.getElementById('source-swatch');
    if (sourceSwatch) sourceSwatch.style.background = source;
    const tokenCount = document.getElementById('token-count');
    if (tokenCount) tokenCount.textContent = `${DYNAMIC_TOKEN_PATHS.length} tokens`;
    const schema = document.getElementById('schema-status');
    if (schema) {
        schema.textContent = `schema ${DYNAMIC_SCHEMA_ID}`;
    }
    const contrast = document.getElementById('contrast-status');
    if (contrast) {
        contrast.textContent =
            failingCount === 0
                ? `contrast pass · ${totalChecks}`
                : `${failingCount} contrast warning${failingCount === 1 ? '' : 's'}`;
        contrast.classList.toggle('is-warning', failingCount > 0);
    }
}

let lastGeneratorKey = '';
let lastMode = '';

function onStateChange() {
    const generatorKey = JSON.stringify(state.generator);
    const mode = state.preview.mode;
    const generatorChanged = generatorKey !== lastGeneratorKey;
    const modeChanged = mode !== lastMode;
    lastGeneratorKey = generatorKey;
    lastMode = mode;

    try {
        if (generatorChanged) {
            syncGeneratorInputs();
            renderControls();
        }
        if (generatorChanged || modeChanged) {
            renderPalette();
        }
        applyPreview();
        updateSwatches();
        renderContrast();
        updateStatus();
    } catch (error) {
        showToast(error instanceof Error ? error.message : String(error), 'error');
    }
}

function bindGenerator() {
    document.getElementById('variant')?.addEventListener('change', (event) => {
        setGenerator({ variant: event.target.value });
    });
    document.getElementById('hue')?.addEventListener('change', (event) => {
        setGenerator({ hue: Number(event.target.value), source: null });
    });
    document.getElementById('contrast')?.addEventListener('change', (event) => {
        setGenerator({ contrast: event.target.value });
    });
    document.getElementById('oled')?.addEventListener('change', (event) => {
        setGenerator({ oled: event.target.checked });
    });
    document.getElementById('chroma')?.addEventListener('change', (event) => {
        setGenerator({ chroma: Number(event.target.value) });
    });
    document.getElementById('tone')?.addEventListener('change', (event) => {
        setGenerator({ tone: Number(event.target.value) });
    });
    document.getElementById('source-mode-hue')?.addEventListener('click', () => setSourceMode('hue'));
    document.getElementById('source-mode-hex')?.addEventListener('click', () => setSourceMode('hex'));
    document.getElementById('source-color')?.addEventListener('input', (event) => {
        setGenerator({ source: event.target.value });
    });
    document.getElementById('source-hex')?.addEventListener('input', (event) => {
        const value = event.target.value.trim().toLowerCase();
        const valid = /^#[0-9a-f]{6}$/.test(value);
        event.target.classList.toggle('is-invalid', !valid && value.length > 0);
        if (valid) setGenerator({ source: value });
    });
    document.getElementById('theme-name')?.addEventListener('input', (event) => {
        setThemeName(event.target.value);
    });
    document.getElementById('theme-name')?.addEventListener('blur', (event) => {
        if (!event.target.value.trim()) setThemeName('');
    });
}

function bindPreview() {
    document.getElementById('preview-mode')?.addEventListener('change', (event) => {
        setPreview({ mode: event.target.value });
    });
    document.getElementById('tabs-layout')?.addEventListener('change', (event) => {
        setPreview({ tabsLayout: event.target.value });
    });
    document.getElementById('indicators')?.addEventListener('change', (event) => {
        setPreview({ indicators: event.target.value });
    });
    document.getElementById('sidebar-toggle')?.addEventListener('change', (event) => {
        setPreview({ sidebar: event.target.checked });
    });
    document.getElementById('state-select')?.addEventListener('change', (event) => {
        setPreview({ state: event.target.value });
    });
    document.getElementById('dialog-toggle')?.addEventListener('change', (event) => {
        setPreview({ dialog: event.target.checked });
    });
    document.getElementById('debug-toggle')?.addEventListener('change', (event) => {
        setPreview({ debugLabels: event.target.checked });
    });
}

function reportValidation() {
    const validation = validateExport();
    if (!validation.valid) {
        showToast(`Invalid theme: ${validation.errors[0]}`, 'error');
        return false;
    }
    if (validation.warnings.length > 0) {
        showToast(`Exported with ${validation.warnings.length} contrast warning${validation.warnings.length === 1 ? '' : 's'}`, 'warning');
    }
    return true;
}

function bindExport() {
    document.getElementById('copy-json')?.addEventListener('click', async () => {
        if (!reportValidation()) return;
        await copyTheme();
        showToast('Theme JSON copied', 'success');
    });
    document.getElementById('download-json')?.addEventListener('click', () => {
        if (!reportValidation()) return;
        downloadTheme();
        showToast('Theme JSON downloaded', 'success');
    });
    document.getElementById('validate')?.addEventListener('click', () => {
        const validation = validateExport();
        if (!validation.valid) showToast(`Invalid: ${validation.errors[0]}`, 'error');
        else if (validation.warnings.length > 0) showToast(`${validation.warnings.length} contrast warning${validation.warnings.length === 1 ? '' : 's'}`, 'warning');
        else showToast('Theme is valid and contrast checks pass', 'success');
    });
}

function init() {
    fillStaticSelects();
    document.getElementById('theme-name').value = getThemeName();
    bindGenerator();
    bindPreview();
    bindExport();
    bindControls();
    subscribe(onStateChange);
    onStateChange();
    document.body.classList.add('is-ready');
    document.addEventListener('keydown', (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            document.getElementById('token-search')?.focus();
        }
    });
}

init();
