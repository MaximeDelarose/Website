import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Génère le service worker après la build : il connaît la liste exacte des
 * fichiers produits (noms avec empreinte), ce qui permet de tout mettre en
 * cache au premier lancement et de jouer hors ligne ensuite.
 */
function serviceWorker(): Plugin {
  let outDir = '';
  return {
    name: 'radia-sw',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    closeBundle() {
      const files: string[] = [];
      const walk = (d: string) => {
        for (const f of readdirSync(d)) {
          const p = join(d, f);
          if (statSync(p).isDirectory()) walk(p);
          else files.push(relative(outDir, p).split('\\').join('/'));
        }
      };
      walk(outDir);
      // .woff (ancien format) inutile : Safari utilise les .woff2
      const precache = files.filter((f) => f !== 'sw.js' && !f.endsWith('.map') && !f.endsWith('.woff'));
      const version = Date.now().toString(36);
      const src = readFileSync(join(__dirname, 'src/sw-template.js'), 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(precache));
      writeFileSync(join(outDir, 'sw.js'), src);
    },
  };
}

export default defineConfig({
  base: './',
  build: {
    outDir: '../radia',
    emptyOutDir: true,
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
  worker: { format: 'es' },
  plugins: [serviceWorker()],
  server: { host: true },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
