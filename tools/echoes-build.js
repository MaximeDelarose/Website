#!/usr/bin/env node
// Construit le script servi aux joueurs d'Echoes of Aether (Max version).
//
//   node tools/echoes-build.js
//
// Source lisible : echoes-moi/assets/game.js (+ perf.js, baked.js, baked/manifest.js qu'il importe).
// Sortie : echoes-moi/assets/game.min.js, minifié (≈2× plus petit, analysé plus vite par le téléphone).
// C'est game.min.js que charge echoes-moi/index.html : relancer ce script après chaque modification.
//
// Chaque construction incrémente le numéro de build (echoes-moi/version.json), affiché sur l'écran
// titre du jeu et sur la page echoes.html : on voit tout de suite si on joue à la dernière version.
// Le build renouvelle aussi le cache du service worker et l'adresse du script (?b=N), pour que
// les téléphones récupèrent la nouvelle version.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'echoes-moi', 'assets');
const OUT = path.join(DIR, 'game.min.js');
const GAME = path.join(ROOT, 'echoes-moi');

// --- numéro de build ---
const vfile = path.join(GAME, 'version.json');
const prev = fs.existsSync(vfile) ? JSON.parse(fs.readFileSync(vfile, 'utf8')) : { build: 0 };
// date à l'heure française, quel que soit le fuseau de la machine qui construit
const parts = Object.fromEntries(
  new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    .formatToParts(new Date())
    .map((p) => [p.type, p.value]),
);
const version = { build: prev.build + 1, date: `${parts.day}/${parts.month}/${parts.year} ${parts.hour}h${parts.minute}` };
fs.writeFileSync(vfile, JSON.stringify(version, null, 2) + '\n');
fs.writeFileSync(
  path.join(DIR, 'version.js'),
  `// Généré par tools/echoes-build.js — ne pas modifier à la main.\nexport const VERSION = ${JSON.stringify(version)};\n`,
);
// cache du service worker et adresse du script : changent à chaque build
const sw = path.join(GAME, 'sw.js');
fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace(/const CACHE = '[^']*';/, `const CACHE = 'echoes-moi-b${version.build}';`));
const html = path.join(GAME, 'index.html');
fs.writeFileSync(html, fs.readFileSync(html, 'utf8').replace(/assets\/game\.min\.js(\?b=\d+)?/, `assets/game.min.js?b=${version.build}`));

execFileSync(
  'npx',
  [
    '--yes',
    'esbuild@0.24.0',
    path.join(DIR, 'game.js'),
    '--bundle',
    '--minify',
    '--format=esm',
    '--target=es2020',
    // Module de la coop en ligne, chargé seulement quand on l'utilise.
    '--external:./bundler-yPNtbWdW.js',
    '--log-level=error',
    `--outfile=${OUT}`,
  ],
  { stdio: 'inherit', cwd: ROOT },
);

const kb = (f) => (fs.statSync(f).size / 1024).toFixed(0);
console.log(`Max version build ${version.build} (${version.date}) — game.min.js : ${kb(OUT)} Ko (source game.js : ${kb(path.join(DIR, 'game.js'))} Ko)`);
