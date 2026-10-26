import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const devApp = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
    root: devApp,
    server: {
        fs: {
            allow: [repoRoot]
        }
    },
    resolve: {
        alias: {
            '@dynamic': fileURLToPath(new URL('../src/dynamic', import.meta.url))
        }
    },
    optimizeDeps: {
        include: ['@sandlada/mcu-helper', '@material/material-color-utilities']
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: fileURLToPath(new URL('index.html', import.meta.url)),
                states: fileURLToPath(new URL('states.html', import.meta.url))
            }
        }
    }
});
