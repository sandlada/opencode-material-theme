#!/usr/bin/env node
/**
 * Full-matrix smoke test for OpenCodeDynamic (replaces check-v2-model.mjs).
 *
 * 9 variants x 12 hues x 3 contrasts x plain/oled, both modes: validates
 * every document against OpenCodeDynamicSchema and runs the WCAG contrast
 * matrix. Validation errors fail closed; contrast misses are reported as
 * warnings (same policy as the old chain).
 */
import { checkContrast, failingChecks } from '../src/dynamic/contrast.js';
import {
    DYNAMIC_TOKEN_PATHS,
    OpenCodeDynamicSchema
} from '../src/dynamic/schema.js';
import {
    createOpenCodeDynamic,
    resolveDynamicDocument,
    validateDynamicDocument
} from '../src/dynamic/dynamic.js';

const VARIANTS = ['monochrome', 'neutral', 'tonal-spot', 'vibrant', 'expressive', 'fidelity', 'content', 'rainbow', 'fruit-salad'];
const HUES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const CONTRASTS = ['default', 'high', 'reduced'];

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

assert(DYNAMIC_TOKEN_PATHS.length === 104, `dynamic schema must carry 104 tokens, got ${DYNAMIC_TOKEN_PATHS.length}`);
assert(OpenCodeDynamicSchema.paths.length === 104, 'schema paths must match token paths');

let combos = 0;
let invalid = 0;
const warnings = [];
const reducedWarnings = [];
for (const variant of VARIANTS) {
    for (const hue of HUES) {
        for (const contrast of CONTRASTS) {
            for (const oled of [false, true]) {
                combos += 1;
                const label = `${variant}/${hue}/${contrast}${oled ? '/oled' : ''}`;
                let doc;
                try {
                    ({ document: doc } = createOpenCodeDynamic({ variant, hue, contrast, oled }));
                } catch (error) {
                    invalid += 1;
                    console.error(`INVALID ${label}: ${error instanceof Error ? error.message : String(error)}`);
                    continue;
                }
                const validation = validateDynamicDocument(doc);
                if (!validation.valid) {
                    invalid += 1;
                    console.error(`INVALID ${label}:\n${validation.errors.slice(0, 5).join('\n')}`);
                    continue;
                }
                // Reduced contrastLevel intentionally lowers contrast (text floor
                // 3.0 by design); track it separately as informational.
                const sink = contrast === 'reduced' ? reducedWarnings : warnings;
                for (const mode of ['light', 'dark']) {
                    const { tokens } = resolveDynamicDocument(doc, mode);
                    for (const check of failingChecks(checkContrast(tokens))) {
                        sink.push(`${label}/${mode}: ${check.label} = ${check.foreground} on ${check.background} (${check.ratio.toFixed(2)} < ${check.floor})`);
                    }
                }
            }
        }
    }
}

console.log(`combos: ${combos} (variants x hues x contrasts x plain/oled), invalid: ${invalid}`);
console.log(`contrast warnings (default/high): ${warnings.length}`);
for (const warning of warnings.slice(0, 40)) console.log(`  ${warning}`);
if (warnings.length > 40) console.log(`  ... and ${warnings.length - 40} more`);
console.log(`contrast warnings (reduced, informational): ${reducedWarnings.length}`);
if (invalid > 0) {
    console.error(`check-dynamic FAILED with ${invalid} invalid document(s)`);
    process.exit(1);
}
console.log('ok');
