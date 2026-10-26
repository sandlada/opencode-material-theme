import { checkContrast, failingChecks } from '@dynamic/contrast.js';
import {
    resolveDynamicDocument,
    validateDynamicDocument
} from '@dynamic/dynamic.js';
import { getDocument, getThemeName } from '../state.js';

export function themeJson() {
    return `${JSON.stringify(getDocument(), null, 2)}\n`;
}

export function validateExport() {
    let document;
    try {
        document = getDocument();
    } catch (error) {
        return { valid: false, errors: [error.message], warnings: [] };
    }
    const validation = validateDynamicDocument(document);
    const warnings = [];
    try {
        for (const mode of ['light', 'dark']) {
            const resolved = resolveDynamicDocument(document, mode);
            for (const check of failingChecks(checkContrast(resolved.tokens))) {
                warnings.push(`${mode}: ${check.label} ${check.ratio.toFixed(2)} < ${check.floor}`);
            }
        }
    } catch (error) {
        return { valid: false, errors: [...validation.errors, error.message], warnings };
    }
    return { valid: validation.valid, errors: validation.errors, warnings };
}

function downloadText(filename, text, type = 'application/json') {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
}

export function downloadTheme() {
    downloadText(`${getThemeName()}.json`, themeJson());
}

export async function copyTheme() {
    await copyText(themeJson());
}
