// Assemble le jeu en un seul fichier (../happy-daily/game.js). `--test` construit aussi les tests de simulation.
import { build } from "esbuild";
await build({ entryPoints: ["src/main.ts"], bundle: true, format: "esm", target: "es2020", minify: true,
  outfile: "../happy-daily/game.js", logLevel: "warning" });
if (process.argv.includes("--test")) {
  await build({ entryPoints: ["tests/sim.test.ts"], bundle: true, format: "esm", platform: "node",
    outfile: ".build/sim.test.js", logLevel: "warning" });
}
console.log("happy-daily ok");
