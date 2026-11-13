// Assemble chaque jeu en un seul fichier JS (js/arcade/<jeu>.js) : une seule URL à versionner (?v=…) pour le cache.
import { build } from "esbuild";

for (const game of ["tetris", "flipper", "breakout"]) {
  await build({
    entryPoints: [`src/${game}/main.ts`],
    bundle: true,
    format: "esm",
    target: "es2020",
    outfile: `../js/arcade/${game}.js`,
    logLevel: "warning",
  });
}
console.log("bundles ok");
