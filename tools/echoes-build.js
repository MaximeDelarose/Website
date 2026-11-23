#!/usr/bin/env node
// Construit le script servi aux joueurs d'Echoes of Aether (Max version).
//
//   node tools/echoes-build.js
//
// Source lisible : echoes-moi/assets/game.js (+ perf.js, baked.js, baked/manifest.js qu'il importe).
// Sortie : echoes-moi/assets/game.min.js, minifié (≈2× plus petit, analysé plus vite par le téléphone).
// C'est game.min.js que charge echoes-moi/index.html : relancer ce script après chaque modification.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'echoes-moi', 'assets');
const OUT = path.join(DIR, 'game.min.js');

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
console.log(`game.min.js : ${kb(OUT)} Ko (source game.js : ${kb(path.join(DIR, 'game.js'))} Ko)`);
