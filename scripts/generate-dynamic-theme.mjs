#!/usr/bin/env node
/**
 * Generate a native v2 theme JSON from OpenCodeDynamic.
 *
 *   bun scripts/generate-dynamic-theme.mjs --variant content --hue 120 --out ./test-theme.json
 *   bun scripts/generate-dynamic-theme.mjs --variant expressive --source '#068f12' --contrast high --oled --out ./out.json
 *
 * HCT input: --hue (0-360) with --chroma/--tone, or --source hex (wins).
 * No upstream schema, no mapping file: roles are internal to the Dynamic
 * provider (src/dynamic/). Fails closed on validation errors.
 */
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createOpenCodeDynamic, validateDynamicDocument } from '../src/dynamic/dynamic.js';

function usage() {
    console.log(`Usage: bun scripts/generate-dynamic-theme.mjs [options]

Options:
  --variant <id>   content|expressive|vibrant|fidelity|tonal-spot|neutral|monochrome|rainbow|fruit-salad (default: content)
  --hue <0-360>    HCT hue (default: 120, ignored when --source is set)
  --chroma <n>     HCT chroma (default: 75)
  --tone <n>       HCT tone (default: 50)
  --source <hex>   Explicit source color, e.g. '#068f12' (overrides --hue)
  --contrast <id>  default|high|reduced (default: default)
  --oled            Enable OLED dark
  --out <path>     Output file (default: ./test-theme.json)
  --help           Show this message`);
}

function fail(message) {
    console.error(`error: ${message}`);
    process.exit(1);
}

function parseArgs(argv) {
    const args = { variant: 'content', chroma: 75, tone: 50, contrast: 'default', oled: false, out: './test-theme.json' };
    for (let i = 0; i < argv.length; i += 1) {
        const flag = argv[i];
        if (flag === '--help' || flag === '-h') {
            usage();
            process.exit(0);
        }
        if (flag === '--oled') {
            args.oled = true;
            continue;
        }
        if (['--variant', '--hue', '--chroma', '--tone', '--source', '--contrast', '--out'].includes(flag)) {
            const value = argv[i + 1];
            if (value === undefined || (value.startsWith('--') && flag !== '--out')) fail(`missing value for ${flag}`);
            args[flag.slice(2)] = value;
            i += 1;
            continue;
        }
        fail(`unknown flag '${flag}'`);
    }
    if (args.hue !== undefined) args.hue = Number(args.hue);
    args.chroma = Number(args.chroma);
    args.tone = Number(args.tone);
    return args;
}

const args = parseArgs(process.argv.slice(2));
const { document, sourceHex, variant, contrast, oled } = createOpenCodeDynamic({
    variant: args.variant,
    hue: args.hue,
    chroma: args.chroma,
    tone: args.tone,
    source: args.source,
    contrast: args.contrast,
    oled: args.oled
});
const validation = validateDynamicDocument(document);
if (!validation.valid) fail(`invalid dynamic document:\n${validation.errors.join('\n')}`);
const out = resolve(process.cwd(), args.out);
await writeFile(out, `${JSON.stringify(document, null, 2)}\n`);
console.log(`wrote ${out} (${variant}/${sourceHex}/${contrast}${oled ? '/oled' : ''})`);
