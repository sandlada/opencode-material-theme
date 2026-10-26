import { checkContrast, failingChecks, formatRatio } from '@dynamic/contrast.js';
import { roleHex, roleLabel, systemRoleGroups } from '@dynamic/md3.js';
import { DYNAMIC_TOKEN_GROUPS } from '@dynamic/schema.js';
import {
    getResolved,
    getScheme,
    state
} from '../state.js';

const GROUP_DEFAULT_OPEN = new Set(['text', 'background']);

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

function tokenDisplay(path, groupId) {
    let display = path;
    if (groupId && groupId !== 'chrome' && path.startsWith(`${groupId}.`)) {
        display = path.slice(groupId.length + 1);
    }
    const parts = display.split('.');
    const leaf = parts.pop() ?? display;
    const prefix = parts.length > 0 ? `${parts.join('.')}.` : '';
    return { display, prefix, leaf, depth: parts.length };
}

function tokenRow(path, groupId = null) {
    const label = path;
    const { prefix, leaf, depth } = tokenDisplay(path, groupId);
    const isBase = leaf === 'base';
    const isState = leaf.startsWith('$');
    return `<div class="token-row${isBase ? ' is-base' : ''}${isState ? ' is-state' : ''}" style="--depth:${depth}" data-search="${escapeHtml(label.toLowerCase())}">
        <code class="token-path" style="padding-left:calc(var(--depth, 0) * 14px)" title="${escapeHtml(label)}"><span class="tok-prefix">${escapeHtml(prefix)}</span><span class="tok-leaf">${escapeHtml(leaf)}</span></code>
        <span class="swatch" data-swatch="${escapeHtml(path)}"></span>
        <code class="token-hex" data-hex="light" data-token-path="${escapeHtml(path)}"></code>
        <code class="token-hex" data-hex="dark" data-token-path="${escapeHtml(path)}"></code>
    </div>`;
}

export function renderControls() {
    const container = document.getElementById('controls');
    if (!container) return;
    const openGroups = new Set(
        [...container.querySelectorAll('details.group[open]')].map((element) => element.dataset.group)
    );
    const search = document.getElementById('token-search')?.value ?? '';

    const groups = DYNAMIC_TOKEN_GROUPS.map((group) => {
        const open = openGroups.size > 0 ? openGroups.has(group.id) : GROUP_DEFAULT_OPEN.has(group.id);
        const rows = group.tokens.map((entry) => tokenRow(entry.path, group.id)).join('');
        return `<details class="group" data-group="${group.id}" ${open ? 'open' : ''}>
            <summary><span>${escapeHtml(group.label)}</span><span class="group-count">${group.tokens.length}</span></summary>
            <div class="group-body">
                <div class="token-table">
                    <div class="token-head"><span>Token</span><span></span><span>Light</span><span>Dark</span></div>
                    ${rows}
                </div>
            </div>
        </details>`;
    }).join('');

    container.innerHTML = `<div class="controls-intro">
            <div>
                <h2>Tokens</h2>
                <p>Derived by <code>OpenCodeDynamic</code> from the variant and HCT source. No manual mapping; tune the scheme above.</p>
            </div>
        </div>
        ${groups}`;

    updateSwatches();
    applyFilter(search);
}

export function updateSwatches() {
    const light = getResolved('light').tokens;
    const dark = getResolved('dark').tokens;
    const modeTokens = getResolved().tokens;
    for (const element of document.querySelectorAll('[data-swatch]')) {
        const path = element.dataset.swatch;
        const color = modeTokens[path];
        element.style.setProperty('--swatch', color ?? 'transparent');
        element.classList.toggle('is-transparent', !color || color === 'transparent');
        element.title = color ?? '—';
    }
    for (const element of document.querySelectorAll('[data-hex]')) {
        const path = element.dataset.tokenPath;
        const hex = element.dataset.hex === 'dark' ? dark[path] : light[path];
        element.textContent = hex ?? '—';
        element.title = hex ?? '';
    }
}

export function renderPalette() {
    const container = document.getElementById('palette');
    if (!container) return;
    const wasOpen = container.querySelector('details')?.open ?? false;
    const scheme = getScheme();
    const mode = state.preview.mode;
    const groups = systemRoleGroups(scheme);
    const count = groups.reduce((total, group) => total + group.roles.length, 0);
    const body = groups
        .map(
            (group) => `<section class="palette-group">
                <h3>${escapeHtml(group.label)}</h3>
                <div class="palette-grid">${group.roles
                    .map((role) => {
                        const hex = roleHex(scheme, mode, role);
                        return `<button type="button" class="palette-role" data-copy-role="${escapeHtml(role)}" title="${escapeHtml(roleLabel(role))}">
                            <span class="palette-swatch" style="background:${escapeHtml(hex ?? 'transparent')}"></span>
                            <span><code>${escapeHtml(roleLabel(role).replace('md.sys.color.', ''))}</code><small>${escapeHtml(hex ?? '—')}</small></span>
                        </button>`;
                    })
                    .join('')}</div>
            </section>`
        )
        .join('');
    container.innerHTML = `<details class="group palette-group-wrap" ${wasOpen ? 'open' : ''}>
        <summary><span>MD system colors</span><span class="group-count">${count}</span></summary>
        <div class="group-body">
            <p class="hint">Click a role to copy its <code>md.sys.color.*</code> name. Showing the ${mode} scheme.</p>
            ${body}
        </div>
    </details>`;
}

export function renderContrast() {
    const container = document.getElementById('contrast-panel');
    if (!container) return;
    const wasOpen = container.querySelector('details')?.open ?? false;
    const failures = [];
    let total = 0;
    for (const mode of ['light', 'dark']) {
        const { tokens } = getResolved(mode);
        const checks = checkContrast(tokens);
        total += checks.length;
        for (const check of failingChecks(checks)) failures.push({ ...check, mode });
    }
    const body = failures.length
        ? failures
              .map(
                  (check) => `<div class="contrast-row is-fail">
                      <span class="contrast-label">${check.mode} · ${escapeHtml(check.label)}</span>
                      <span class="contrast-ratio">${formatRatio(check.ratio)} / ${check.floor.toFixed(1)}</span>
                  </div>`
              )
              .join('')
        : `<div class="contrast-ok">All ${total} contrast checks pass in both modes.</div>`;
    container.innerHTML = `<details class="group contrast-wrap" ${failures.length || wasOpen ? 'open' : ''}>
        <summary><span>Contrast</span><span class="group-count ${failures.length ? 'is-warning' : ''}">${failures.length ? `${failures.length} warning${failures.length === 1 ? '' : 's'}` : 'pass'}</span></summary>
        <div class="group-body">
            <p class="hint">WCAG AA: body 4.5, muted/wash 3.0. Both modes; disabled states are exempt.</p>
            ${body}
        </div>
    </details>`;
}

export function applyFilter(rawQuery) {
    const query = rawQuery.trim().toLowerCase();
    let openGroups = new Set();
    if (query) {
        for (const row of document.querySelectorAll('.token-row')) {
            const match = (row.dataset.search ?? '').includes(query);
            row.hidden = !match;
            if (match) openGroups.add(row.closest('details.group')?.dataset.group);
        }
        for (const group of document.querySelectorAll('details.group')) {
            if (!group.dataset.group) continue;
            group.hidden = !openGroups.has(group.dataset.group);
            if (openGroups.has(group.dataset.group)) group.open = true;
        }
    } else {
        for (const row of document.querySelectorAll('.token-row')) row.hidden = false;
        for (const group of document.querySelectorAll('details.group')) group.hidden = false;
    }
}

export function bindControls() {
    const controls = document.getElementById('controls');
    if (!controls) return;

    controls.addEventListener('click', (event) => {
        const copyRole = event.target.closest('[data-copy-role]');
        if (copyRole) {
            const role = copyRole.dataset.copyRole;
            navigator.clipboard?.writeText(roleLabel(role)).then(() => {
                copyRole.classList.add('is-copied');
                setTimeout(() => copyRole.classList.remove('is-copied'), 900);
            });
        }
    });

    const search = document.getElementById('token-search');
    search?.addEventListener('input', () => applyFilter(search.value));
}
