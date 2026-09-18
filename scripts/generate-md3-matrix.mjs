/**
 * Batch driver: generate the full hue-sweep theme matrix in one run.
 *
 * - 9 variants x 12 hues (0-330 step 30), except Monochrome which only
 *   takes hue 0 (hue-independent grays): 97 combos x (plain + oled).
 * - Sources come from fixed HCT chroma/tone (defaults: C75 T50).
 * - Delegates to generate-md3-tokens.mjs per combo (fail fast: the
 *   single-run contrast guard aborts the matrix on unreadable output).
 *
 * Must run with Bun (see generate-md3-tokens.mjs).
 *
 * Usage:
 *   bun scripts/generate-md3-matrix.mjs --out ./tui [--chroma 75] [--tone 50] [--contrast default] [--spec 2025]
 */
import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const VARIANTS = Object.freeze([
    'Monochrome',
    'Neutral',
    'TonalSpot',
    'Vibrant',
    'Expressive',
    'Fidelity',
    'Content',
    'Rainbow',
    'FruitSalad'
]);

const HUES = Object.freeze([0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]);

function fail(message) {
    console.error(`error: ${message}`);
    process.exit(1);
}

function parseArgs(argv) {
    const args = { chroma: '75', tone: '50', contrast: 'default', spec: '2025' };
    for (let i = 0; i < argv.length; i += 1) {
        const flag = argv[i];
        const value = argv[i + 1];
        if (value === undefined || value.startsWith('--')) fail(`missing value for ${flag}`);
        if (flag === '--out') args.out = value;
        else if (flag === '--chroma') args.chroma = value;
        else if (flag === '--tone') args.tone = value;
        else if (flag === '--contrast') args.contrast = value;
        else if (flag === '--spec') args.spec = value;
        else fail(`unknown flag ${flag}`);
        i += 1;
    }
    if (!args.out) fail('--out is required');
    return args;
}

const args = parseArgs(process.argv.slice(2));
const single = join(dirname(fileURLToPath(import.meta.url)), 'generate-md3-tokens.mjs');

let combos = 0;
for (const variant of VARIANTS) {
    const hues = variant === 'Monochrome' ? [0] : HUES;
    for (const hue of hues) {
        combos += 1;
        const result = spawnSync(process.execPath, [
            single,
            '--variant', variant,
            '--hue', String(hue),
            '--chroma', args.chroma,
            '--tone', args.tone,
            '--out', args.out,
            '--contrast', args.contrast,
            '--spec', args.spec
        ], { stdio: 'inherit' });
        if (result.status !== 0) fail(`matrix aborted at variant=${variant} hue=${hue} (exit ${result.status})`);
    }
}

const files = (await readdir(args.out)).filter((f) => f.endsWith('.json'));
console.log(`matrix done: ${combos} combos, ${files.length} files in ${args.out}`);
if (files.length !== combos * 2) fail(`expected ${combos * 2} files, found ${files.length}`);
