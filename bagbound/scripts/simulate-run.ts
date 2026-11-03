// Runs complètes jouées par le bot (src/game/bot.ts), pour équilibrer.
//
//   npm run sim:run -- --n 300                  vagabond, palier 0, tout débloqué
//   npm run sim:run -- --class ranger --tier 2  une classe, un palier
//   npm run sim:run -- --locked                 comme un nouveau joueur (forêt seule, objets de quêtes fermés)
//   npm run sim:run -- --upgrades               toutes les améliorations du campement achetées
//   npm run sim:run -- --matrix --n 150         tableau classes × paliers (taux de victoire)

import { loadContentFromDir, loadMetaFromDir, loadRecipesFromDir, loadRunDataFromDir, loadStoryFromDir } from "../src/content/node";
import { botRun } from "../src/game/bot";
import * as H from "../src/game/hub";

const args = process.argv.slice(2);
const val = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const n = Number(val("--n")) || 200;
const content = loadContentFromDir();
const rd = loadRunDataFromDir(content);
const meta = loadMetaFromDir(content);
const { quests } = loadStoryFromDir(content, rd);
const recipes = args.includes("--no-fusion") ? [] : loadRecipesFromDir(content);

/** Profil synthétique : tout débloqué (sauf --locked), améliorations au max avec --upgrades. */
function profileFor(): H.Profile {
  const p = H.newProfile();
  p.bestTier = meta.tiers.length - 1;
  p.classes = Object.keys(content.classes);
  if (!args.includes("--locked")) {
    p.routes = rd.zones.flatMap((z) => z.routes.map((r) => r.id));
    p.unlockedItems = quests.flatMap((q) => q.rewards.flatMap((r) => (r.type === "unlockItem" ? [r.item] : [])));
  }
  if (args.includes("--upgrades")) for (const u of meta.upgrades) p.upgrades[u.id] = u.costs.length;
  return p;
}

function batch(cls: string, tier: number, count: number) {
  let wins = 0;
  let shards = 0;
  const deaths = new Map<string, number>();
  for (let i = 1; i <= count; i++) {
    const p = profileFor();
    const opts = H.departure(p, quests, rd, meta, { cls, tier });
    const { run } = botRun(content, rd, cls, i * 7919 + tier, recipes, opts);
    if (run.phase === "won") wins++;
    else {
      const k = run.zone >= rd.zones.length ? "boss final" : `${run.route} étage ${run.floor + 1}`;
      deaths.set(k, (deaths.get(k) ?? 0) + 1);
    }
    shards += H.shardsFor(run, meta);
  }
  return { wins, shards: shards / count, deaths };
}

const pct = (x: number, t: number) => `${((100 * x) / t).toFixed(1)} %`;
const t0 = performance.now();
if (args.includes("--matrix")) {
  const classes = Object.keys(content.classes);
  console.log(`Victoires du bot (${n} runs par case${args.includes("--upgrades") ? ", améliorations au max" : ""})\n`);
  console.log(["palier".padEnd(18), ...classes.map((c) => content.classes[c].name.padStart(12))].join(""));
  for (const t of meta.tiers) {
    const row = classes.map((c) => pct(batch(c, t.id, n).wins, n).padStart(12));
    console.log([`${t.id} ${t.name}`.padEnd(18), ...row].join(""));
  }
} else {
  const cls = val("--class") ?? "vagabond";
  const tier = Number(val("--tier") ?? 0);
  const r = batch(cls, tier, n);
  console.log(`${n} runs du bot · ${content.classes[cls].name} · palier ${tier} · victoires ${pct(r.wins, n)} · ${r.shards.toFixed(1)} éclats par run`);
  console.log("Morts :", [...r.deaths].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v, n)}`).join(" · "));
}
console.log(`${((performance.now() - t0) / 1000).toFixed(1)} s`);
