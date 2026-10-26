/**
 * OpenCodeDynamicSchema: self-owned v2 token schema.
 *
 * Replaces the upstream-derived model (src/theme/tokens.js +
 * schema-snapshot.json + sync-v2-schema.mjs). All literals below are owned
 * by this repo: no fetch, no snapshot, no TypeScript/Effect parsing.
 * The emitted document shape stays native v2
 * ({ $schema, base, light: { hue }, dark: { hue, ...diff } }) so OpenCode
 * still accepts it; only the schema source changes, not the file contract.
 */

export const DYNAMIC_SCHEMA_ID = 'opencode-dynamic/v1';
export const DYNAMIC_SCHEMA_URL = 'https://opencode.ai/theme.json';

export const HUE_STEPS = Object.freeze([100, 200, 300, 400, 500, 600, 700, 800, 900]);
export const ACTION_VARIANTS = Object.freeze(['primary', 'secondary', 'destructive']);
/** UI/state order; `$selected` stays explicit, `$disabled` uses the wash. */
export const ACTION_STATES = Object.freeze(['hovered', 'focused', 'pressed', 'selected', 'disabled']);
export const FEEDBACK_KINDS = Object.freeze(['error', 'warning', 'success', 'info']);
export const SYNTAX_TOKENS = Object.freeze([
    'comment',
    'keyword',
    'function',
    'variable',
    'string',
    'number',
    'type',
    'operator',
    'punctuation'
]);
export const MARKDOWN_TOKENS = Object.freeze([
    'text',
    'heading',
    'link',
    'linkText',
    'code',
    'blockQuote',
    'emphasis',
    'strong',
    'horizontalRule',
    'listItem',
    'listEnumeration',
    'image',
    'imageText',
    'codeBlock'
]);

export const DIFF_PATHS = Object.freeze([
    'diff.text.added',
    'diff.text.removed',
    'diff.text.context',
    'diff.text.hunkHeader',
    'diff.background.added',
    'diff.background.removed',
    'diff.background.context',
    'diff.highlight.added',
    'diff.highlight.removed',
    'diff.lineNumber.text',
    'diff.lineNumber.background.added',
    'diff.lineNumber.background.removed'
]);

export const CATEGORICAL = Object.freeze(['blue', 'purple', 'green', 'red']);

export function cssVarFor(path, options = {}) {
    const name = path
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[.$@]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
    return `--${options.dialog ? 'dialog-' : ''}${name}`;
}

export function dialogCssVarFor(path) {
    return cssVarFor(path, { dialog: true });
}

function token(path, options = {}) {
    return Object.freeze({
        path,
        group: options.group ?? path.split('.')[0],
        label: options.label ?? path,
        required: options.required ?? true,
        cssVar: cssVarFor(path)
    });
}

function actionTokens(prefix, group) {
    const entries = [];
    for (const variant of ACTION_VARIANTS) {
        entries.push(token(`${prefix}.${variant}.base`, { group }));
        for (const state of ACTION_STATES) {
            entries.push(token(`${prefix}.${variant}.$${state}`, { group, required: false }));
        }
    }
    return entries;
}

function formfieldTokens(prefix, group) {
    const entries = [token(`${prefix}.base`, { group })];
    for (const state of ACTION_STATES) {
        entries.push(token(`${prefix}.$${state}`, { group, required: false }));
    }
    return entries;
}

function buildGroups() {
    const text = [
        token('text.base', { group: 'text' }),
        token('text.muted', { group: 'text' }),
        token('text.faint', { group: 'text', required: false }),
        ...actionTokens('text.action', 'text'),
        ...formfieldTokens('text.formfield', 'text')
    ];
    for (const kind of FEEDBACK_KINDS) {
        text.push(token(`text.feedback.${kind}.base`, { group: 'text' }));
        text.push(token(`text.feedback.${kind}.muted`, { group: 'text', required: false }));
    }

    const background = [
        token('background.base', { group: 'background' }),
        token('background.raised.base', { group: 'background' }),
        token('background.raised.high', { group: 'background' }),
        token('background.raised.max', { group: 'background' }),
        ...actionTokens('background.action', 'background'),
        ...formfieldTokens('background.formfield', 'background')
    ];
    for (const kind of FEEDBACK_KINDS) {
        background.push(token(`background.feedback.${kind}.base`, { group: 'background' }));
    }

    const chrome = [
        token('border.base', { group: 'chrome' }),
        token('scrollbar.base', { group: 'chrome' })
    ];

    const diff = DIFF_PATHS.map((path) => token(path, { group: 'diff' }));
    const syntax = SYNTAX_TOKENS.map((name) => token(`syntax.${name}`, { group: 'syntax' }));
    const markdown = MARKDOWN_TOKENS.map((name) => token(`markdown.${name}`, { group: 'markdown' }));

    return Object.freeze([
        { id: 'text', label: 'Text', tokens: Object.freeze(text) },
        { id: 'background', label: 'Background', tokens: Object.freeze(background) },
        { id: 'chrome', label: 'Border & scrollbar', tokens: Object.freeze(chrome) },
        { id: 'diff', label: 'Diff', tokens: Object.freeze(diff) },
        { id: 'syntax', label: 'Syntax', tokens: Object.freeze(syntax) },
        { id: 'markdown', label: 'Markdown', tokens: Object.freeze(markdown) }
    ]);
}

export const DYNAMIC_TOKEN_GROUPS = buildGroups();

export const DYNAMIC_TOKEN_PATHS = Object.freeze(
    DYNAMIC_TOKEN_GROUPS.flatMap((group) => group.tokens.map((entry) => entry.path))
);

export const DYNAMIC_TOKEN_BY_PATH = new Map(
    DYNAMIC_TOKEN_GROUPS.flatMap((group) => group.tokens.map((entry) => [entry.path, entry]))
);

if (DYNAMIC_TOKEN_BY_PATH.size !== DYNAMIC_TOKEN_PATHS.length) {
    throw new Error('duplicate token path in OpenCodeDynamicSchema');
}

export const DYNAMIC_REQUIRED_PATHS = Object.freeze(
    DYNAMIC_TOKEN_GROUPS.flatMap((group) => group.tokens.filter((entry) => entry.required).map((entry) => entry.path))
);

export const DYNAMIC_OPTIONAL_PATHS = Object.freeze(
    DYNAMIC_TOKEN_GROUPS.flatMap((group) => group.tokens.filter((entry) => !entry.required).map((entry) => entry.path))
);

export const DYNAMIC_STATE_ORDER = ACTION_STATES;

/** Every base token can be overridden inside `@dialog`. */
export function isDynamicToken(path) {
    return DYNAMIC_TOKEN_BY_PATH.has(path);
}

export function isDynamicRequired(path) {
    return DYNAMIC_REQUIRED_PATHS.includes(path);
}

/** Optional-state fallback: `$hovered/$focused/...` falls back to `.base`. */
export const DYNAMIC_STATE_FALLBACKS = Object.freeze([
    ...['primary', 'secondary', 'destructive'].flatMap((variant) =>
        ACTION_STATES.map((state) => [`text.action.${variant}.$${state}`, `text.action.${variant}.base`])
    ),
    ...ACTION_STATES.map((state) => [`text.formfield.$${state}`, 'text.formfield.base']),
    ...['primary', 'secondary', 'destructive'].flatMap((variant) =>
        ACTION_STATES.map((state) => [`background.action.${variant}.$${state}`, `background.action.${variant}.base`])
    ),
    ...ACTION_STATES.map((state) => [`background.formfield.$${state}`, 'background.formfield.base']),
    ['text.faint', 'text.muted'],
    ...FEEDBACK_KINDS.map((kind) => [`text.feedback.${kind}.muted`, `text.feedback.${kind}.base`])
]);

/**
 * The schema object itself: id, owned literals, groups and paths.
 * Consumers validate documents against `DYNAMIC_TOKEN_BY_PATH` and
 * `DYNAMIC_REQUIRED_PATHS`, never against an upstream snapshot.
 */
export const OpenCodeDynamicSchema = Object.freeze({
    id: DYNAMIC_SCHEMA_ID,
    url: DYNAMIC_SCHEMA_URL,
    hueSteps: HUE_STEPS,
    actionVariants: ACTION_VARIANTS,
    actionStates: ACTION_STATES,
    feedbackKinds: FEEDBACK_KINDS,
    syntaxTokens: SYNTAX_TOKENS,
    markdownTokens: MARKDOWN_TOKENS,
    groups: DYNAMIC_TOKEN_GROUPS,
    paths: DYNAMIC_TOKEN_PATHS,
    required: DYNAMIC_REQUIRED_PATHS,
    optional: DYNAMIC_OPTIONAL_PATHS
});
