/**
 * Generate hardcoded MD3 OpenCode TUI theme JSONs from a source color.
 *
 * One run emits two dual-appearance files (plain + OLED). OpenCode itself
 * switches light/dark, so every `theme.*` key is a `{ dark, light }`
 * object of plain static values; the TUI cannot use `light-dark()` CSS.
 * OLED pitch-black only affects the dark scheme (the light half of an
 * OLED file matches the plain file by construction).
 *
 * Filenames are kebab-case (`:` is illegal on Windows filenames and the
 * theme's visible name equals the filename stem):
 *   `md3-{variant}-{#hex}[-oled][-high|-reduced].json`
 * e.g. `md3-expressive-#068f12-oled.json`
 *
 * Must run with Bun (`bun scripts/generate-md3-tokens.mjs ...`):
 * plain Node cannot resolve `@material/material-color-utilities`
 * extensionless ESM imports.
 *
 * Usage:
 *   bun scripts/generate-md3-tokens.mjs --variant Expressive --source '#068f12' --out ./themes [--contrast default|high|reduced] [--spec 2025|2021]
 *   bun scripts/generate-md3-tokens.mjs --variant Expressive --hue 120 --chroma 75 --tone 50 --out ./themes [...]
 * (--hue derives the source via HCT and names the file by hue number,
 * e.g. `md3-expressive-120.json`; monochrome only uses hue 0.)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Hct } from '@material/material-color-utilities';
import { calculateContrastRatio, createTheme, formatHex, MaterialContrastLevel, MaterialVariant } from '@sandlada/mcu-helper';
import { TUI_TOKEN_KEYS } from '../src/tui-schema.js';
import { resolveMapping } from '../src/md3-mapping.js';

const VARIANTS = Object.freeze({
    Monochrome: MaterialVariant.Monochrome,
    Neutral: MaterialVariant.Neutral,
    TonalSpot: MaterialVariant.TonalSpot,
    Vibrant: MaterialVariant.Vibrant,
    Expressive: MaterialVariant.Expressive,
    Fidelity: MaterialVariant.Fidelity,
    Content: MaterialVariant.Content,
    Rainbow: MaterialVariant.Rainbow,
    FruitSalad: MaterialVariant.FruitSalad
});

/** PascalCase variant -> kebab-case filename segment. */
const VARIANT_SLUGS = Object.freeze({
    Monochrome: 'monochrome',
    Neutral: 'neutral',
    TonalSpot: 'tonal-spot',
    Vibrant: 'vibrant',
    Expressive: 'expressive',
    Fidelity: 'fidelity',
    Content: 'content',
    Rainbow: 'rainbow',
    FruitSalad: 'fruit-salad'
});

// Suffix '' = default contrast (no suffix in the theme name).
const CONTRASTS = Object.freeze({
    default: { level: MaterialContrastLevel.Default, slug: '', group: 'default', textFloor: 4.5 },
    // Reduced is a soft low-contrast aesthetic by design: WCAG large-text
    // floor (3.0) instead of body-text floor (4.5).
    reduced: { level: MaterialContrastLevel.Reduced, slug: '-reduced', group: 'reduced', textFloor: 3.0 },
    high: { level: MaterialContrastLevel.High, slug: '-high', group: 'high', textFloor: 4.5 }
});

/** Files per run: plain dual-appearance + OLED dual-appearance. */
const FILES = Object.freeze([
    { oled: false, tag: '' },
    { oled: true, tag: '-oled' }
]);

function fail(message) {
    console.error(`error: ${message}`);
    process.exit(1);
}

function parseArgs(argv) {
    const args = { contrast: 'default', spec: '2025', chroma: '75', tone: '50' };
    for (let i = 0; i < argv.length; i += 1) {
        const flag = argv[i];
        const value = argv[i + 1];
        if (value === undefined || value.startsWith('--')) fail(`missing value for ${flag}`);
        if (flag === '--variant') args.variant = value;
        else if (flag === '--source') args.source = value;
        else if (flag === '--hue') args.hue = value;
        else if (flag === '--chroma') args.chroma = value;
        else if (flag === '--tone') args.tone = value;
        else if (flag === '--out') args.out = value;
        else if (flag === '--contrast') args.contrast = value;
        else if (flag === '--spec') args.spec = value;
        else fail(`unknown flag ${flag}`);
        i += 1;
    }
    if (!args.variant) fail('--variant is required');
    if (!args.out) fail('--out is required');
    if (!(args.variant in VARIANTS)) fail(`unknown variant '${args.variant}' (expected ${Object.keys(VARIANTS).join('|')})`);
    if (args.source !== undefined && args.hue !== undefined) fail('--source and --hue are mutually exclusive');
    if (args.source === undefined && args.hue === undefined) fail('one of --source or --hue is required');
    if (args.source !== undefined && !/^#[0-9a-f]{6}$/.test(args.source)) {
        fail(`--source must be lowercase '#rrggbb', got '${args.source}'`);
    }
    if (args.hue !== undefined) {
        args.hue = Number(args.hue);
        args.chroma = Number(args.chroma);
        args.tone = Number(args.tone);
        if (!Number.isInteger(args.hue) || args.hue < 0 || args.hue > 360) fail(`--hue must be an integer 0-360, got '${args.hue}'`);
        if (!(args.chroma >= 0 && args.chroma <= 150)) fail(`--chroma must be 0-150, got '${args.chroma}'`);
        if (!(args.tone >= 0 && args.tone <= 100)) fail(`--tone must be 0-100, got '${args.tone}'`);
        // Fixed-C/T hue source; HCT clamps out-of-gamut hues deterministically.
        args.source = formatHex(Hct.from(args.hue, args.chroma, args.tone).toInt());
    }
    if (!(args.contrast in CONTRASTS)) fail(`unknown contrast '${args.contrast}' (expected default|high|reduced)`);
    if (args.spec !== '2025' && args.spec !== '2021') fail(`unknown spec '${args.spec}' (expected 2025|2021)`);
    return args;
}

/** M3 camelCase role + mode -> defs key (`primary`+light -> `md3PrimaryLight`). */
function toDefKey(role, mode) {
    const capitalized = `md3${role[0].toUpperCase()}${role.slice(1)}`;
    return mode === 'light' ? `${capitalized}Light` : `${capitalized}Dark`;
}

/**
 * Build one dual-appearance theme file object.
 * Values are `{ dark, light }` objects of `defs` refs (static hex in defs).
 */
function buildThemeFile(scheme, lightMapping, darkMapping) {
    const defs = {};
    for (const [mode, mapping] of [['light', lightMapping], ['dark', darkMapping]]) {
        const appearance = scheme[mode];
        for (const role of new Set(Object.values(mapping))) {
            if (!(role in appearance)) fail(`mapping role '${role}' missing from generated ${mode} scheme`);
            defs[toDefKey(role, mode)] = formatHex(appearance[role]);
        }
    }
    const theme = {};
    for (const key of TUI_TOKEN_KEYS) {
        theme[key] = { dark: toDefKey(darkMapping[key], 'dark'), light: toDefKey(lightMapping[key], 'light') };
    }
    return { $schema: 'https://opencode.ai/theme.json', defs, theme };
}

// WCAG-grounded generation-time readability tiers (fail closed: a new
// variant/source that violates these errors out instead of shipping an
// unreadable theme).
const TEXT_KEYS = Object.freeze([
    'primary', 'secondary', 'accent', 'error', 'warning', 'success', 'info',
    'text', 'markdownText', 'markdownHeading', 'markdownLink', 'markdownLinkText',
    'markdownCode', 'markdownListItem', 'markdownListEnumeration', 'markdownImage',
    'markdownImageText', 'markdownCodeBlock', 'markdownStrong', 'markdownEmph',
    'syntaxKeyword', 'syntaxFunction', 'syntaxVariable', 'syntaxString',
    'syntaxNumber', 'syntaxType', 'syntaxPunctuation', 'diffAdded', 'diffRemoved',
    'diffHunkHeader'
]);
const MUTED_KEYS = Object.freeze([
    'textMuted', 'syntaxComment', 'markdownBlockQuote', 'syntaxOperator',
    'diffContext', 'diffLineNumber', 'markdownHorizontalRule'
]);
const WASH_PAIRS = Object.freeze([
    ['diffAdded', 'diffAddedBg'],
    ['diffRemoved', 'diffRemovedBg'],
    ['diffContext', 'diffContextBg']
]);

/**
 * Fail closed when any mapped foreground is unreadable on its background.
 * Roles are scheme-dependent, so this must run per generated appearance.
 */
function guardContrast(appearance, mapping, label, textFloor) {
    const violations = [];
    const check = (fgKey, bgArgb, floor, tier) => {
        const ratio = calculateContrastRatio(appearance[mapping[fgKey]], bgArgb);
        if (ratio < floor) {
            violations.push(`${tier} ${fgKey}=${formatHex(appearance[mapping[fgKey]])} on ${formatHex(bgArgb)} ratio ${ratio.toFixed(2)} < ${floor}`);
        }
    };
    const surface = appearance[mapping.background];
    for (const key of TEXT_KEYS) check(key, surface, textFloor, 'text');
    for (const key of MUTED_KEYS) check(key, surface, 3.0, 'muted');
    for (const [fg, bg] of WASH_PAIRS) check(fg, appearance[mapping[bg]], 3.0, `wash(${bg})`);
    if (violations.length > 0) {
        fail(`unreadable ${label} mapping (override in src/md3-mapping.js):\n  ${violations.join('\n  ')}`);
    }
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const contrast = CONTRASTS[args.contrast];
    // Each resolved (mode, contrast group) mapping must cover the schema
    // exactly: no missing key, no extra key.
    for (const mode of ['light', 'dark']) {
        const mapped = Object.keys(resolveMapping(mode, contrast.group, args.variant));
        const missing = TUI_TOKEN_KEYS.filter((k) => !mapped.includes(k));
        const extra = mapped.filter((k) => !TUI_TOKEN_KEYS.includes(k));
        if (missing.length > 0 || extra.length > 0) {
            fail(`${mode} mapping/schema drift (missing: ${missing.join(',') || 'none'}; extra: ${extra.join(',') || 'none'})`);
        }
    }

    const slug = args.hue === undefined
        ? `md3-${VARIANT_SLUGS[args.variant]}-${args.source}`
        : `md3-${VARIANT_SLUGS[args.variant]}-${args.hue}`;
    if (args.hue !== undefined) console.log(`hue ${args.hue} (C${args.chroma} T${args.tone}) -> source ${args.source}`);
    await mkdir(args.out, { recursive: true });
    // One createTheme call per oled flag (OLED only changes the dark scheme).
    const schemes = {
        false: createTheme({
            variant: VARIANTS[args.variant],
            contrastLevel: contrast.level,
            specVersion: args.spec,
            platform: 'phone',
            oled: false
        })(args.source),
        true: createTheme({
            variant: VARIANTS[args.variant],
            contrastLevel: contrast.level,
            specVersion: args.spec,
            platform: 'phone',
            oled: true
        })(args.source)
    };
    for (const file of FILES) {
        const name = `${slug}${file.tag}${contrast.slug}`;
        const lightMapping = resolveMapping('light', contrast.group, args.variant);
        const darkMapping = resolveMapping('dark', contrast.group, args.variant);
        const scheme = schemes[String(file.oled)];
        guardContrast(scheme.light, lightMapping, `${name} (light${file.oled ? ', oled' : ''})`, contrast.textFloor);
        guardContrast(scheme.dark, darkMapping, `${name} (dark${file.oled ? ', oled' : ''})`, contrast.textFloor);
        const outFile = join(args.out, `${name}.json`);
        await writeFile(outFile, `${JSON.stringify(buildThemeFile(scheme, lightMapping, darkMapping), null, 2)}\n`, 'utf8');
        console.log(`wrote ${outFile}`);
    }
}

await main();
