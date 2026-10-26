#!/usr/bin/env node
/**
 * Batch driver: generate the full dynamic theme matrix in one run.
 *
 * Default: 9 variants x 12 hues (0-330 step 30), except Monochrome which
 * only takes hue 0: 97 combos x (plain + oled) = 194 files, default
 * contrast only. Mirrors the deprecated-theme/ scale.
 *
 *   bun scripts/generate-dynamic-matrix.mjs --out ./src/themes
 *   bun scripts/generate-dynamic-matrix.mjs --out ./src/themes --contrasts all   # 648 files
 *
 * Fails closed: any invalid document aborts the run with non-zero exit.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createOpenCodeDynamic, validateDynamicDocument } from '../src/dynamic/dynamic.js';
import { themeSlug } from '../src/dynamic/md3.js';

const VARIANTS = Object.freeze([
    'monochrome',
    'neutral',
    'tonal-spot',
    'vibrant',
    'expressive',
    'fidelity',
    'content',
    'rainbow',
    'fruit-salad'
]);
const HUES = Object.freeze([0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]);

function fail(message) {
    console.error(`error: ${message}`);
    process.exit(1);
}

function parseArgs(argv) {
    const args = { out: './src/themes', chroma: 75, tone: 50, contrasts: ['default'] };
    for (let i = 0; i < argv.length; i += 1) {
        const flag = argv[i];
        if (flag === '--help' || flag === '-h') {
            console.log(`Usage: bun scripts/generate-dynamic-matrix.mjs [options]\n\nOptions:\n  --out <dir>        Output directory (default: ./src/themes)\n  --chroma <n>       HCT chroma (default: 75)\n  --tone <n>         HCT tone (default: 50)\n  --contrast <id>    default|high|reduced (default: default)\n  --contrasts <list> comma list or 'all' (overrides --contrast)\n  --help             Show this message`);
            process.exit(0);
        }
        if (flag === '--out' || flag === '--chroma' || flag === '--tone' || flag === '--contrast' || flag === '--contrasts') {
            const value = argv[i + 1];
            if (value === undefined || value.startsWith('--')) fail(`missing value for ${flag}`);
            args[flag.slice(2)] = value;
            i += 1;
            continue;
        }
        fail(`unknown flag '${flag}'`);
    }
    args.chroma = Number(args.chroma);
    args.tone = Number(args.tone);
    if (typeof args.contrasts === 'string') {
        args.contrasts = args.contrasts === 'all' ? ['default', 'high', 'reduced'] : args.contrasts.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (args.contrast) {
        args.contrasts = [args.contrast];
    }
    if (args.contrasts.length === 0) fail('empty contrasts list');
    return args;
}

const args = parseArgs(process.argv.slice(2));
const outDir = resolve(process.cwd(), args.out);
await mkdir(outDir, { recursive: true });

let combos = 0;
for (const variant of VARIANTS) {
    const hues = variant === 'monochrome' ? [0] : HUES;
    for (const hue of hues) {
        for (const contrast of args.contrasts) {
            for (const oled of [false, true]) {
                combos += 1;
                const { document } = createOpenCodeDynamic({ variant, hue, chroma: args.chroma, tone: args.tone, contrast, oled });
                const validation = validateDynamicDocument(document);
                if (!validation.valid) fail(`invalid ${variant}/${hue}/${contrast}${oled ? '/oled' : ''}:\n${validation.errors.slice(0, 5).join('\n')}`);
                const name = `${themeSlug({ variant, hue, contrast, oled })}.json`;
                await writeFile(join(outDir, name), `${JSON.stringify(document, null, 2)}\n`);
            }
        }
    }
}

console.log(`matrix done: ${combos} combos, ${combos} files in ${outDir}`);
