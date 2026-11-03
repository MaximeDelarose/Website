// Runs complètes jouées par le bot (src/game/bot.ts), pour équilibrer.
//   npm run sim:run -- --n 300

import { loadContentFromDir, loadRunDataFromDir } from "../src/content/node";
import { botRun } from "../src/game/bot";

const args = process.argv.slice(2);
const n = Number(args[args.indexOf("--n") + 1]) || 200;
const content = loadContentFromDir();
const rd = loadRunDataFromDir(content);
const cls = Object.keys(content.classes)[0];
let wins = 0;
const floors = new Map<string, number>();
const killers = new Map<string, number>();
let gold = 0;
let combats = 0;
const t0 = performance.now();
for (let i = 1; i <= n; i++) {
  const { run } = botRun(content, rd, cls, i);
  if (run.phase === "won") wins++;
  else {
    const k = `zone ${run.zone + 1} étage ${run.floor + 1}`;
    floors.set(k, (floors.get(k) ?? 0) + 1);
    const by = (run.stats.killedBy ?? ["?"]).join(" + ");
    killers.set(by, (killers.get(by) ?? 0) + 1);
  }
  gold += run.stats.goldEarned;
  combats += run.stats.combats;
}
const pct = (x: number) => `${((100 * x) / n).toFixed(1)} %`;
console.log(`${n} runs du bot · victoires ${pct(wins)} · ${(combats / n).toFixed(1)} combats et ${(gold / n).toFixed(0)} or par run`);
console.log("Morts par étage :", [...floors].map(([k, v]) => `${k} ${pct(v)}`).join(" · "));
console.log("Tué par :", [...killers].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${pct(v)}`).join(" · "));
console.log(`${((performance.now() - t0) / 1000).toFixed(1)} s`);
