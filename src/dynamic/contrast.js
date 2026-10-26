/**
 * WCAG contrast helpers for the V2 theme lab.
 *
 * Kept dependency-free so the dev-app can run it in the browser and the
 * generator can reuse it in Bun/Node.
 */

function clampByte(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Parse #rgb, #rgba, #rrggbb, #rrggbbaa or transparent.
 * @returns {{ r: number, g: number, b: number, a: number } | null}
 */
export function parseColor(value) {
    if (typeof value !== 'string') return null;
    if (value === 'transparent' || value === 'none') return null;
    const match = /^#([0-9a-f]{3,8})$/i.exec(value.trim());
    if (!match) return null;
    let hex = match[1];
    if (hex.length === 3 || hex.length === 4) {
        hex = [...hex].map((char) => char + char).join('');
    }
    if (hex.length !== 6 && hex.length !== 8) return null;
    return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
    };
}

export function toHex({ r, g, b, a = 1 }) {
    const byte = (value) => clampByte(value).toString(16).padStart(2, '0');
    return `#${byte(r)}${byte(g)}${byte(b)}${a < 1 ? byte(a * 255) : ''}`;
}

/** Alpha-composite foreground over an opaque background. */
export function composite(foreground, background) {
    if (!foreground) return background;
    if (!background || foreground.a >= 1) return foreground;
    const alpha = foreground.a;
    return {
        r: foreground.r * alpha + background.r * (1 - alpha),
        g: foreground.g * alpha + background.g * (1 - alpha),
        b: foreground.b * alpha + background.b * (1 - alpha),
        a: 1
    };
}

function linearize(channel) {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color) {
    if (!color) return null;
    return 0.2126 * linearize(color.r) + 0.7152 * linearize(color.g) + 0.0722 * linearize(color.b);
}

export function contrastRatio(foreground, background) {
    const fg = typeof foreground === 'string' ? parseColor(foreground) : foreground;
    const bg = typeof background === 'string' ? parseColor(background) : background;
    if (!fg || !bg) return null;
    const solidFg = composite(fg, bg);
    const fgLum = relativeLuminance(solidFg);
    const bgLum = relativeLuminance(bg);
    if (fgLum === null || bgLum === null) return null;
    const lighter = Math.max(fgLum, bgLum);
    const darker = Math.min(fgLum, bgLum);
    return (lighter + 0.05) / (darker + 0.05);
}

export function formatRatio(ratio) {
    return ratio === null ? 'n/a' : ratio.toFixed(2);
}

const TEXT_FLOOR = 4.5;
const MUTED_FLOOR = 3.0;

const TEXT_ON_SURFACES = Object.freeze([
    ['text.base', 'background.base'],
    ['text.base', 'background.raised.base'],
    ['text.base', 'background.raised.high'],
    ['text.base', 'background.raised.max'],
    ['text.muted', 'background.base'],
    ['text.muted', 'background.raised.base'],
    ['text.muted', 'background.raised.high'],
    ['text.muted', 'background.raised.max']
]);

const MUTED_ON_SURFACES = Object.freeze([
    ['text.faint', 'background.base'],
    ['text.faint', 'background.raised.base']
]);

const DIFF_CHECKS = Object.freeze([
    ['diff.text.added', 'diff.background.added', TEXT_FLOOR],
    ['diff.text.removed', 'diff.background.removed', TEXT_FLOOR],
    ['diff.text.context', 'diff.background.context', MUTED_FLOOR],
    ['diff.highlight.added', 'diff.background.added', MUTED_FLOOR],
    ['diff.highlight.removed', 'diff.background.removed', MUTED_FLOOR]
]);

const FEEDBACK_KINDS = Object.freeze(['error', 'warning', 'success', 'info']);

const ACTION_VARIANTS = Object.freeze(['primary', 'secondary', 'destructive']);
const ACTION_STATES = Object.freeze([
    ['base', 'base'],
    ['$hovered', '$hovered'],
    ['$focused', '$focused'],
    ['$pressed', '$pressed'],
    ['$selected', '$selected'],
    ['$disabled', '$disabled']
]);

const FORMFIELD_STATES = Object.freeze([
    ['base', 'base'],
    ['$hovered', '$hovered'],
    ['$focused', '$focused'],
    ['$pressed', '$pressed'],
    ['$selected', '$selected'],
    ['$disabled', '$disabled']
]);

function result(label, foreground, background, ratio, floor, group, exempt = false) {
    return {
        label,
        foreground,
        background,
        ratio,
        floor,
        exempt,
        pass: exempt || (ratio !== null && ratio >= floor),
        group
    };
}

/**
 * Run the theme-lab contrast matrix against a flat token map.
 * @param {Record<string, string>} tokens
 */
export function checkContrast(tokens) {
    const checks = [];
    const add = (fgPath, bgPath, floor, group, exempt = false) => {
        const foreground = tokens[fgPath];
        const background = tokens[bgPath];
        if (!foreground || !background) return;
        const ratio = contrastRatio(foreground, background);
        if (ratio === null) return;
        checks.push(result(`${fgPath} on ${bgPath}`, foreground, background, ratio, floor, group, exempt));
    };

    for (const [fg, bg] of TEXT_ON_SURFACES) add(fg, bg, TEXT_FLOOR, 'Text');
    for (const [fg, bg] of MUTED_ON_SURFACES) add(fg, bg, MUTED_FLOOR, 'Text');
    for (const [fg, bg, floor] of DIFF_CHECKS) add(fg, bg, floor, 'Diff');

    for (const kind of FEEDBACK_KINDS) {
        add(`text.feedback.${kind}.base`, `background.feedback.${kind}.base`, TEXT_FLOOR, 'Feedback');
    }

    for (const variant of ACTION_VARIANTS) {
        for (const [textState, bgState] of ACTION_STATES) {
            add(
                `text.action.${variant}.${textState}`,
                `background.action.${variant}.${bgState}`,
                textState === '$disabled' ? 0 : TEXT_FLOOR,
                'Actions',
                textState === '$disabled'
            );
        }
    }

    for (const [textState, bgState] of FORMFIELD_STATES) {
        add(
            `text.formfield.${textState}`,
            `background.formfield.${bgState}`,
            textState === '$disabled' ? 0 : TEXT_FLOOR,
            'Form fields',
            textState === '$disabled'
        );
    }

    return checks;
}

export function failingChecks(checks) {
    return checks.filter((check) => !check.exempt && !check.pass);
}
