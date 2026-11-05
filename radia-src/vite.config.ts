import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, relative } from 'node:path';

/** Identifiant RÉEL de cette build : date (base 36) + commit Git court ; le même partout (application, version.json, service worker). */
const BUILD_TIME = Date.now();
function gitShort(): string { try { return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return 'local'; } }
const BUILD_ID = `${BUILD_TIME.toString(36)}-${gitShort()}`;
/** Nombre de builds dont on garde les fichiers à empreinte sur le serveur : une session restée ouverte sur l'avant-dernière version
 *  peut ainsi encore charger ses fichiers tardifs (sinon : mélange de versions / écran figé après un déploiement). */
const KEEP_BUILDS = 4;

/**
 * Génère le service worker après la build : il connaît la liste exacte des
 * fichiers produits (noms avec empreinte), ce qui permet de tout mettre en
 * cache au premier lancement et de jouer hors ligne ensuite.
 */
function serviceWorker(): Plugin {
  let outDir = '';
  let emitted = new Set<string>();
  return {
    name: 'radia-sw',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    writeBundle(_o, bundle) { emitted = new Set(Object.keys(bundle)); },
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
      // fichiers à empreinte : seuls ceux de CETTE build (les anciens restent sur le serveur mais ne sont pas mis en cache)
      // les fichiers privés (assets/p/) n'ont jamais d'empreinte : « char-radia-nc.bin » ressemblait à « nom-XXXXXXXX.bin » et était supprimé
      const hashed = (f: string) => f.startsWith('assets/') && !f.startsWith('assets/p/') && /-[A-Za-z0-9_-]{8}\.[a-z0-9]+$/.test(f);
      const precache = files.filter((f) => f !== 'sw.js' && f !== 'version.json' && f !== 'builds.json' && !f.endsWith('.map') && !f.endsWith('.woff') && (!hashed(f) || emitted.has(f)));
      const version = BUILD_ID;
      const src = readFileSync(join(__dirname, 'src/sw-template.js'), 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(precache));
      writeFileSync(join(outDir, 'sw.js'), src);
      // version.json : toujours relu sur le réseau (jamais en cache) pour savoir si une version plus récente existe
      writeFileSync(join(outDir, 'version.json'), JSON.stringify({ version: BUILD_ID, built: BUILD_TIME }) + '\n');
      // historique des builds : on conserve les fichiers des KEEP_BUILDS dernières, on supprime les plus anciens
      const histPath = join(outDir, 'builds.json');
      let hist: { id: string; files: string[] }[] = [];
      try { if (existsSync(histPath)) hist = JSON.parse(readFileSync(histPath, 'utf8')); } catch { hist = []; }
      hist = hist.filter((b) => b.id !== BUILD_ID);
      hist.push({ id: BUILD_ID, files: precache.filter((f) => hashed(f)) });
      hist = hist.slice(-KEEP_BUILDS);
      const keep = new Set(hist.flatMap((b) => b.files));
      for (const f of files) {
        if (hashed(f) && !keep.has(f)) { try { unlinkSync(join(outDir, f)); } catch { /* déjà absent */ } }
      }
      writeFileSync(histPath, JSON.stringify(hist) + '\n');
    },
  };
}

export default defineConfig({
  base: './',
  build: {
    outDir: '../radia-52c8654e04',
    // on ne vide PAS le dossier : les anciens fichiers à empreinte restent disponibles (voir KEEP_BUILDS)
    emptyOutDir: false,
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID), __BUILD_TIME__: String(BUILD_TIME) },
  worker: { format: 'es' },
  plugins: [serviceWorker()],
  server: { host: true },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
