import {
    createOpenCodeDynamic,
    resolveDynamicDocument
} from '@dynamic/dynamic.js';
import {
    CONTRASTS,
    VARIANTS,
    sourceFromHue
} from '@dynamic/md3.js';
import { DYNAMIC_TOKEN_GROUPS } from '@dynamic/schema.js';
import { showToast } from './ui/toast.js';

const HUE_OPTIONS = Array.from({ length: 12 }, (_, index) => index * 30);
const STATE_COLUMNS = Object.freeze([
    { key: 'base', label: 'Base', pct: '' },
    { key: '$hovered', label: 'Hover', pct: '8%' },
    { key: '$focused', label: 'Focus', pct: '10%' },
    { key: '$pressed', label: 'Pressed', pct: '10%' },
    { key: '$selected', label: 'Selected', pct: 'explicit' },
    { key: '$disabled', label: 'Disabled', pct: 'wash 32%' }
]);

const state = {
    variant: 'content',
    hue: 120,
    chroma: 75,
    tone: 50,
    contrast: 'default',
    oled: false,
    mode: 'light'
};

function esc(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

/**
 * Group stateful token paths by family: `text.action.primary.$hovered`
 * and `text.action.primary.base` both belong to `text.action.primary`.
 * Families without any `$state` are not stateful and are skipped.
 */
function statefulFamilies(groupId) {
    const group = DYNAMIC_TOKEN_GROUPS.find((entry) => entry.id === groupId);
    if (!group) return [];
    const families = new Map();
    for (const { path } of group.tokens) {
        const match = /^(.*)\.(base|\$[^.]+)$/.exec(path);
        if (!match) continue;
        const [, family, leaf] = match;
        if (!families.has(family)) families.set(family, {});
        families.get(family)[leaf] = path;
    }
    return [...families.entries()]
        .filter(([, leaves]) => Object.keys(leaves).some((leaf) => leaf.startsWith('$')))
        .map(([family, leaves]) => ({ family, leaves }));
}

function swatchCell(hex) {
    if (hex === null || hex === undefined) return '<span class="st-missing">—</span>';
    return `<span class="st-cell"><span class="st-swatch" style="background:${esc(hex)}"></span><code class="st-hex">${esc(hex)}</code></span>`;
}

/**
 * Tokens without states (`border`, `scrollbar`, `diff`, `syntax`,
 * `markdown`, plus stateless text/background leaves): one resolved value
 * for the current mode.
 */
function statelessSection(tokens) {
    const families = new Set(
        ['text', 'background'].flatMap((id) => statefulFamilies(id).map((entry) => entry.family))
    );
    /** A singleton has no `$state` and is not the base of a stateful family. */
    const isSingleton = (path) => {
        if (/\$[^.]+$/.test(path)) return false;
        const base = path.replace(/\.base$/, '');
        if (families.has(base)) return false;
        return ![...families].some((family) => path.startsWith(`${family}.`));
    };
    const sections = DYNAMIC_TOKEN_GROUPS.map((group) => ({
        title: group.label,
        paths: group.tokens.map((entry) => entry.path).filter(
            (path) => group.id !== 'text' && group.id !== 'background' ? true : isSingleton(path)
        )
    })).filter((section) => section.paths.length > 0);
    return sections
        .map(({ title, paths }) => {
            const rows = paths
                .map((path) => `<tr><td><code>${esc(path)}</code></td><td>${swatchCell(tokens[path])}</td></tr>`)
                .join('');
            return `<section class="states-group"><h2>${esc(title)} <span class="group-count">${paths.length}</span></h2>`
                + `<div class="table-scroll"><table class="states-table"><thead><tr><th>Token</th><th>Base · ${esc(state.mode)}</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
        })
        .join('');
}

function renderMatrix() {
    const host = document.getElementById('states-matrix');
    if (!host) return;
    const { document: themeDoc } = createOpenCodeDynamic({
        variant: state.variant,
        hue: state.hue,
        chroma: state.chroma,
        tone: state.tone,
        contrast: state.contrast,
        oled: state.oled
    });
    const { tokens } = resolveDynamicDocument(themeDoc, state.mode);

    host.innerHTML = ['text', 'background']
        .map((groupId) => {
            const families = statefulFamilies(groupId);
            if (families.length === 0) return '';
            const rows = families
                .map(({ family, leaves }) => {
                    const cells = STATE_COLUMNS.map(({ key }) => {
                        const path = leaves[key];
                        return `<td>${swatchCell(path ? tokens[path] : null)}</td>`;
                    }).join('');
                    return `<tr><td><code>${esc(family)}</code></td>${cells}</tr>`;
                })
                .join('');
            const head = STATE_COLUMNS.map(
                ({ label, pct }) => `<th>${label}${pct ? ` · ${pct}` : ''}</th>`
            ).join('');
            const title = groupId === 'text' ? 'Text' : 'Background';
            return `<section class="states-group"><h2>${esc(title)} <span class="group-count">${families.length}</span></h2>`
                + `<div class="table-scroll"><table class="states-table"><thead><tr><th>Token family</th>${head}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
        })
        .join('') + statelessSection(tokens);
}

function render() {
    try {
        renderMatrix();
        const source = sourceFromHue(state.hue, state.chroma, state.tone);
        const label = document.getElementById('st-source-label');
        if (label) label.textContent = source;
        const swatch = document.getElementById('st-source-swatch');
        if (swatch) swatch.style.background = source;
    } catch (error) {
        showToast(error instanceof Error ? error.message : String(error), 'error');
    }
}

function option(value, label) {
    return `<option value="${value}">${label}</option>`;
}

function init() {
    const byId = (id) => document.getElementById(id);
    byId('st-variant').innerHTML = VARIANTS.map((entry) => option(entry.id, entry.label)).join('');
    byId('st-contrast').innerHTML = CONTRASTS.map((entry) => option(entry.id, entry.label)).join('');
    byId('st-hue').innerHTML = HUE_OPTIONS.map((hue) => option(String(hue), String(hue))).join('');

    byId('st-variant').value = state.variant;
    byId('st-hue').value = String(state.hue);
    byId('st-chroma').value = state.chroma;
    byId('st-tone').value = state.tone;
    byId('st-contrast').value = state.contrast;
    byId('st-mode').value = state.mode;
    byId('st-oled').checked = state.oled;

    const set = (patch) => {
        Object.assign(state, patch);
        render();
    };
    byId('st-variant').addEventListener('change', (event) => set({ variant: event.target.value }));
    byId('st-hue').addEventListener('change', (event) => set({ hue: Number(event.target.value) }));
    byId('st-chroma').addEventListener('change', (event) => set({ chroma: Number(event.target.value) }));
    byId('st-tone').addEventListener('change', (event) => set({ tone: Number(event.target.value) }));
    byId('st-contrast').addEventListener('change', (event) => set({ contrast: event.target.value }));
    byId('st-mode').addEventListener('change', (event) => set({ mode: event.target.value }));
    byId('st-oled').addEventListener('change', (event) => set({ oled: event.target.checked }));

    render();
    document.body.classList.add('is-ready');
}

init();
