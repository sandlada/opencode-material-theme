#!/usr/bin/env node
/**
 * Install the MD3 OpenCode TUI themes into an OpenCode themes directory.
 *
 * Zero runtime dependencies (node:fs/path/os only) so it works straight
 * from `npx -p @sandlada/opencode-material-theme opencode-md3-themes`.
 *
 * Usage:
 *   opencode-md3-themes [install] [--dir <path>] [--variant a,b] [--hue 0,30] [--oled plain|oled|both] [--dry-run]
 *   opencode-md3-themes list [--variant a,b] [--hue 0,30] [--oled plain|oled|both]
 *
 * Target directory: --dir, else $XDG_CONFIG_HOME/opencode/themes,
 * else ~/.config/opencode/themes (also on Windows).
 */
import { cp, mkdir, readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const PACKAGE_DIR = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = join(PACKAGE_DIR, '..', 'tui');

function fail(message) {
    console.error(`error: ${message}`);
    process.exit(1);
}

function splitList(value, flag) {
    return value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).length > 0
        ? value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
        : fail(`${flag} must not be empty`);
}

function parseArgs(argv) {
    const args = { command: 'install', oled: 'both', dryRun: false };
    const positional = [];
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (token === '--dir') args.dir = argv[++i] ?? fail('missing value for --dir');
        else if (token === '--variant') args.variants = splitList(argv[++i] ?? fail('missing value for --variant'), '--variant');
        else if (token === '--hue') args.hues = splitList(argv[++i] ?? fail('missing value for --hue'), '--hue');
        else if (token === '--oled') {
            const value = (argv[++i] ?? fail('missing value for --oled')).toLowerCase();
            if (!['plain', 'oled', 'both'].includes(value)) fail("--oled must be plain|oled|both");
            args.oled = value;
        }
        else if (token === '--dry-run') args.dryRun = true;
        else if (token === '--help' || token === '-h') args.command = 'help';
        else if (token.startsWith('--')) fail(`unknown flag ${token}`);
        else positional.push(token);
    }
    if (positional.length > 1) fail(`unexpected arguments: ${positional.join(' ')}`);
    if (positional.length === 1) {
        if (!['install', 'list'].includes(positional[0])) fail(`unknown command '${positional[0]}' (expected install|list)`);
        args.command = positional[0];
    }
    return args;
}

function targetDir(override) {
    if (override) return override;
    const xdg = process.env.XDG_CONFIG_HOME;
    if (xdg) return join(xdg, 'opencode', 'themes');
    return join(homedir(), '.config', 'opencode', 'themes');
}

/**
 * Parse `md3-{variant}-{hue}[-oled][-high|-reduced].json` into segments.
 * Returns null for foreign files (left untouched, never deleted).
 */
function parseThemeFile(file) {
    const match = /^md3-([a-z-]+)-(\d+|#[0-9a-f]{6})(-oled)?(-(high|reduced))?\.json$/.exec(file);
    if (!match) return null;
    return { variant: match[1], hue: match[2], oled: match[3] === '-oled' };
}

function matchesFilters(parsed, args) {
    if (args.variants && !args.variants.includes(parsed.variant)) return false;
    if (args.hues && !args.hues.includes(parsed.hue)) return false;
    if (args.oled === 'plain' && parsed.oled) return false;
    if (args.oled === 'oled' && !parsed.oled) return false;
    return true;
}

function printHelp() {
    console.log(`opencode-md3-themes: install Material Design 3 themes for the OpenCode TUI

Usage:
  opencode-md3-themes [install] [--dir <path>] [--variant a,b] [--hue 0,30] [--oled plain|oled|both] [--dry-run]
  opencode-md3-themes list [--variant a,b] [--hue 0,30] [--oled plain|oled|both]

One-click full install (194 themes):
  npx -y -p @sandlada/opencode-material-theme opencode-md3-themes install

Subset example (expressive greens, plain only):
  opencode-md3-themes install --variant expressive --hue 120,150 --oled plain

Then pick a theme in OpenCode with /theme.`);
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.command === 'help') {
        printHelp();
        return;
    }
    let entries;
    try {
        entries = (await readdir(SOURCE_DIR)).filter((f) => f.endsWith('.json')).sort();
    } catch {
        fail(`bundled themes not found at ${SOURCE_DIR}`);
    }
    const ours = [];
    for (const file of entries) {
        const parsed = parseThemeFile(file);
        if (parsed && matchesFilters(parsed, args)) ours.push({ file, ...parsed });
    }
    if (args.command === 'list') {
        for (const { file } of ours) console.log(file.slice(0, -'.json'.length));
        console.log(`${ours.length} theme(s)`);
        return;
    }
    const dir = targetDir(args.dir);
    if (args.dryRun) {
        console.log(`would install ${ours.length} theme(s) to ${dir}`);
        return;
    }
    await mkdir(dir, { recursive: true });
    let copied = 0;
    let identical = 0;
    for (const { file } of ours) {
        const from = join(SOURCE_DIR, file);
        const to = join(dir, file);
        let same = false;
        try {
            const [a, b] = await Promise.all([readFile(from), readFile(to)]);
            same = a.equals(b);
        } catch {
            same = false; // missing target: copy below
        }
        if (same) {
            identical += 1;
        } else {
            await cp(from, to);
            copied += 1;
        }
    }
    console.log(`installed ${copied} theme(s) to ${dir} (${identical} already up to date)`);
    console.log('Pick one in OpenCode with /theme.');
}

await main();
