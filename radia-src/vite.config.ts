import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, relative, resolve } from 'node:path';
import { resolveGift, giftErrors } from './src/config/resolve';

/** Identifiant RÉEL de cette build : date (base 36) + commit Git court ; le même partout (application, version.json, service worker). */
const BUILD_TIME = Date.now();
function gitShort(): string { try { return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return 'local'; } }
const BUILD_ID = `${BUILD_TIME.toString(36)}-${gitShort()}`;
/** Nombre de builds dont on garde les fichiers à empreinte sur le serveur : une session restée ouverte sur l'avant-dernière version
 *  peut ainsi encore charger ses fichiers tardifs (sinon : mélange de versions / écran figé après un déploiement). */
const KEEP_BUILDS = 4;

/** Cadeau compilé : GIFT=<id> (défaut « radia ») → src/config/gifts/<id>.json. Une build = UN cadeau (aucune donnée d'un autre cadeau n'y entre). */
const GIFT_ID = process.env.GIFT || 'radia';
const GIFT_FILE = resolve(__dirname, `src/config/gifts/${GIFT_ID}.json`);
if (!/^[a-z0-9-]+$/.test(GIFT_ID) || !existsSync(GIFT_FILE)) throw new Error(`[radia] configuration introuvable : src/config/gifts/${GIFT_ID}.json`);
const GIFT_RAW: unknown = JSON.parse(readFileSync(GIFT_FILE, 'utf8'));
const blocking = giftErrors(GIFT_RAW);
if (blocking.length) throw new Error(`[radia] configuration « ${GIFT_ID} » incomplète :\n - ${blocking.join('\n - ')}`);
const GIFT = resolveGift(GIFT_RAW).config;

/** Manifeste PWA et en-tête HTML produits depuis la configuration (nom, couleurs, identifiant) : rien n'est écrit en dur dans les fichiers. */
function giftPwa(): Plugin {
  return {
    name: 'radia-gift-pwa',
    transformIndexHtml(html) {
      const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      return html
        .replace(/<html lang="[^"]*"/, `<html lang="${esc(GIFT.app.lang)}"`)
        .replace(/<title>[^<]*<\/title>/, `<title>${esc(GIFT.app.title)}</title>`)
        .replace(/(<meta name="theme-color" content=")[^"]*"/, `$1${GIFT.app.themeColor}"`)
        .replace(/(<meta name="apple-mobile-web-app-title" content=")[^"]*"/, `$1${esc(GIFT.app.shortName)}"`)
        .replace(/(<meta name="description" content=")[^"]*"/, `$1${esc(GIFT.app.description)}"`);
    },
    generateBundle() {
      const icon = (n: number, extra: Record<string, string> = {}) => ({ src: `assets/icons/icon-${n === 0 ? 'maskable-512' : n}.png`, sizes: n === 0 ? '512x512' : `${n}x${n}`, type: 'image/png', ...extra });
      const manifest = {
        id: GIFT.pwa.id, name: GIFT.app.title, short_name: GIFT.app.shortName, description: GIFT.app.description, lang: GIFT.app.lang,
        start_url: './', scope: './', display: GIFT.pwa.display, orientation: GIFT.pwa.orientation,
        background_color: GIFT.app.backgroundColor, theme_color: GIFT.app.themeColor,
        icons: [icon(192), icon(512), icon(0, { purpose: 'maskable' })],
      };
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: JSON.stringify(manifest, null, 2) + '\n' });
    },
  };
}

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
      const precache = files.filter((f) => f !== 'sw.js' && f !== '_headers' && f !== 'robots.txt' && f !== 'version.json' && f !== 'builds.json' && !f.endsWith('.map') && !f.endsWith('.woff') && (!hashed(f) || emitted.has(f)));
      const version = BUILD_ID;
      const src = readFileSync(join(__dirname, 'src/sw-template.js'), 'utf8')
        .replace('__VERSION__', version)
        .replace('__CACHE_PREFIX__', GIFT.pwa.cachePrefix)
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
    // Projet indépendant : la build va dans ./dist (à déposer sur l'hébergeur dédié). RADIA_OUT=… pour un autre dossier (ex. l'ancien dossier du site).
    outDir: process.env.RADIA_OUT || 'dist',
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
  resolve: { alias: { '@gift-config': GIFT_FILE } },
  define: { __GIFT_ID__: JSON.stringify(GIFT.id), __BUILD_ID__: JSON.stringify(BUILD_ID), __BUILD_TIME__: String(BUILD_TIME) },
  worker: { format: 'es' },
  plugins: [giftPwa(), serviceWorker()],
  server: { host: true },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
