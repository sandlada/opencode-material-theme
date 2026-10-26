#!/usr/bin/env node
/**
 * Watch the repo's test-theme.json and auto-sync it to the OpenCode
 * themes directory. You still reopen opencode manually to pick it up
 * (v2 does not hot-reload theme file contents while running).
 *
 * Zero runtime dependencies (node:fs/path/os only).
 *
 * Usage:
 *   bun scripts/watch-test-theme.mjs [--dir <path>] [--once] [--debounce <ms>]
 *   bun scripts/watch-test-theme.mjs --help
 *
 * Target directory: --dir, else $XDG_CONFIG_HOME/opencode/themes,
 * else ~/.config/opencode/themes (also on Windows).
 */
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'test-theme.json');
const DEST_NAME = 'test-theme.json';

function fail(message) {
    console.error(`error: ${message}`);
    process.exit(1);
}

function targetDir(override) {
    if (override) return resolve(override);
    const xdg = process.env.XDG_CONFIG_HOME;
    if (xdg) return join(xdg, 'opencode', 'themes');
    return join(homedir(), '.config', 'opencode', 'themes');
}

function parseArgs(argv) {
    const args = { dir: null, once: false, debounce: 200 };
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (token === '--dir') args.dir = argv[++i] ?? fail('missing value for --dir');
        else if (token === '--once') args.once = true;
        else if (token === '--debounce') {
            const value = Number(argv[++i] ?? fail('missing value for --debounce'));
            if (!Number.isFinite(value) || value < 0) fail('--debounce must be a number >= 0');
            args.debounce = value;
        }
        else if (token === '--help' || token === '-h') args.help = true;
        else if (token.startsWith('--')) fail(`unknown flag ${token}`);
        else fail(`unexpected argument '${token}'`);
    }
    return args;
}

function timestamp() {
    return new Date().toTimeString().slice(0, 8);
}

async function sync(source, dest, reason) {
    let from;
    try {
        from = await readFile(source);
    } catch {
        console.error(`[${timestamp()}] source not found: ${source} (${reason})`);
        return false;
    }
    let to = null;
    try {
        to = await readFile(dest);
    } catch {
        to = null; // missing target: copy below
    }
    if (to !== null && from.equals(to)) {
        console.log(`[${timestamp()}] already up to date: ${dest} (${reason})`);
        return true;
    }
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(source, dest);
    console.log(`[${timestamp()}] synced ${basename(source)} -> ${dest} (${from.length} bytes, ${reason})`);
    return true;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        console.log('Usage: bun scripts/watch-test-theme.mjs [--dir <path>] [--once] [--debounce <ms>]');
        console.log('');
        console.log('Watches ./test-theme.json and copies it to the OpenCode themes directory.');
        console.log('Reopen opencode manually after each sync to preview.');
        return;
    }
    const dir = targetDir(args.dir);
    const dest = join(dir, DEST_NAME);

    await sync(SOURCE, dest, 'init');
    if (args.once) return;

    console.log(`Watching ${SOURCE}`);
    console.log(`Target ${dest}`);
    console.log('Edit test-theme.json, then reopen opencode to preview. Ctrl+C to stop.');

    let timer = null;
    const schedule = (reason) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            sync(SOURCE, dest, reason).catch((error) => {
                console.error(`[${timestamp()}] sync failed: ${error instanceof Error ? error.message : String(error)}`);
            });
        }, args.debounce);
    };

    // Watch the parent dir (not the file itself) so atomic saves
    // (temp file + rename, as VS Code/Vim do) are not missed.
    const watcher = watch(ROOT, { persistent: true }, (_event, filename) => {
        if (filename !== DEST_NAME) return;
        schedule('change');
    });
    watcher.on('error', (error) => {
        console.error(`watch failed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    });
    process.on('SIGINT', () => {
        watcher.close();
        process.exit(0);
    });
}

await main();
