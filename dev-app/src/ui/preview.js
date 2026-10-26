import { cssVarFor, dialogCssVarFor, DYNAMIC_TOKEN_PATHS } from '@dynamic/schema.js';
import { getResolved, getThemeName, state } from '../state.js';

const terminal = () => document.getElementById('terminal');

const STATE_SUFFIX = Object.freeze({
    default: 'base',
    hover: '$hovered',
    focus: '$focused',
    pressed: '$pressed',
    selected: '$selected',
    disabled: '$disabled'
});

function setVars(element, tokens, dialogTokens, hue) {
    for (const path of DYNAMIC_TOKEN_PATHS) {
        element.style.setProperty(cssVarFor(path), tokens[path] ?? 'transparent');
        element.style.setProperty(dialogCssVarFor(path), dialogTokens[path] ?? tokens[path] ?? 'transparent');
    }
    for (const [name, scale] of Object.entries(hue ?? {})) {
        if (!scale || typeof scale !== 'object') continue;
        for (const [step, color] of Object.entries(scale)) {
            element.style.setProperty(`--hue-${name}-${step}`, color);
        }
    }
}

function applyDemoState(tokens) {
    const suffix = STATE_SUFFIX[state.preview.state] ?? 'base';
    for (const variant of ['primary', 'secondary', 'destructive']) {
        const element = document.querySelector(`.demo-${variant}`);
        if (!element) continue;
        element.style.background = tokens[`background.action.${variant}.${suffix}`] ?? 'transparent';
        element.style.color = tokens[`text.action.${variant}.${suffix}`] ?? 'inherit';
        element.style.borderColor = tokens['border.base'] ?? 'transparent';
    }
    const field = document.querySelector('.demo-field');
    if (field) {
        field.style.background = tokens[`background.formfield.${suffix}`] ?? 'transparent';
        field.style.color = tokens[`text.formfield.${suffix}`] ?? 'inherit';
        field.style.borderColor = tokens['border.base'] ?? 'transparent';
    }
}

export function applyPreview() {
    const element = terminal();
    if (!element) return;
    const { tokens, dialogTokens, hue, categorical } = getResolved();
    setVars(element, tokens, dialogTokens, hue);
    (categorical ?? []).forEach((name, index) => {
        const scale = hue?.[name];
        const color = scale && typeof scale === 'object' ? scale[200] : null;
        element.style.setProperty(`--categorical-${index}`, color ?? tokens['text.base'] ?? 'currentColor');
    });

    element.dataset.mode = state.preview.mode;
    element.dataset.tabsLayout = state.preview.tabsLayout;
    element.dataset.indicators = state.preview.indicators;
    element.dataset.sidebar = String(state.preview.sidebar);
    element.dataset.state = state.preview.state;
    element.dataset.debug = String(state.preview.debugLabels);

    const dialog = document.querySelector('.dialog-backdrop');
    if (dialog) dialog.hidden = !state.preview.dialog;

    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        const disabled = state.preview.tabsLayout === 'vertical';
        sidebarToggle.disabled = disabled;
        sidebarToggle.closest('label')?.classList.toggle('is-disabled', disabled);
    }

    const modeLabel = document.getElementById('terminal-mode-label');
    if (modeLabel) modeLabel.textContent = state.preview.mode;
    const stateLabel = document.getElementById('demo-state-label');
    if (stateLabel) stateLabel.textContent = state.preview.state;

    for (const label of document.querySelectorAll('[data-theme-name]')) {
        label.textContent = getThemeName();
    }
    for (const element of document.querySelectorAll('[data-token-value]')) {
        element.textContent = tokens[element.dataset.tokenValue] ?? '—';
    }
    for (const element of document.querySelectorAll('[data-token-role]')) {
        element.textContent = 'dynamic';
    }

    applyDemoState(tokens);
}
