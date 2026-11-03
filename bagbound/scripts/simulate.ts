// Simulation en masse (headless) pour équilibrer objets et ennemis.
//
//   npm run sim                         -> build de départ contre chaque ennemi
//   npm run sim -- --enemies goblin,wolf --n 2000
//   npm run sim -- --build mon-build.json --policy potion
//
// Options :
//   --n <nombre>        combats par affrontement (défaut 500)
//   --seed <nombre>     première seed (défaut 1)
//   --class <id>        classe du joueur (défaut : la première)
//   --build <fichier>   JSON { "hp": 60, "bag": [Placement…] } à la place du sac de départ
//   --enemies a,b,c     un seul affrontement contre 1 à 3 ennemis (sinon : chaque ennemi seul)
//   --policy none|potion  potion : boit une potion de soin sous 40 % PV (joueur bot)
//   --items             détail par objet du joueur (déclenchements, dégâts, soins…)

import { readFileSync } from "node:fs";
import { loadContentFromDir } from "../src/content/node";
import { runCombat, type CombatResult, type CombatSetup, type Content, type Placement } from "../src/engine";
import { fightWithPotions } from "../src/game/bot";

interface Args {
  n: number;
  seed: number;
  cls?: string;
  build?: string;
  enemies?: string[];
  policy: "none" | "potion";
  items: boolean;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { n: 500, seed: 1, policy: "none", items: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === "--n") (a.n = Number(v)), i++;
    else if (k === "--seed") (a.seed = Number(v)), i++;
    else if (k === "--class") (a.cls = v), i++;
    else if (k === "--build") (a.build = v), i++;
    else if (k === "--enemies") (a.enemies = v.split(",").filter(Boolean)), i++;
    else if (k === "--policy") (a.policy = v as Args["policy"]), i++;
    else if (k === "--items") a.items = true;
    else throw new Error(`Option inconnue : ${k}`);
  }
  return a;
}

function runWithPolicy(content: Content, setup: CombatSetup, policy: Args["policy"]): CombatResult {
  return policy === "potion" ? fightWithPotions(content, setup) : runCombat(content, setup);
}

const pct = (x: number, n: number) => `${((100 * x) / n).toFixed(1)}%`.padStart(7);

function main() {
  const args = parseArgs(process.argv.slice(2));
  const content = loadContentFromDir();
  const cls = args.cls ? content.classes[args.cls] : Object.values(content.classes)[0];
  if (!cls) throw new Error("Classe introuvable");
  let player: { hp: number; bag: Placement[] } = { hp: cls.hp, bag: cls.startingBag };
  if (args.build) player = JSON.parse(readFileSync(args.build, "utf8"));

  const matchups: string[][] = args.enemies ? [args.enemies] : Object.keys(content.enemies).map((id) => [id]);
  console.log(`Joueur : ${args.build ?? cls.name} (${player.hp} PV, ${player.bag.length} objets) · ${args.n} combats par affrontement · politique ${args.policy}\n`);
  console.log(`${"Ennemis".padEnd(28)} ${"Vict.".padStart(7)} ${"Déf.".padStart(7)} ${"Nul".padStart(7)}  ${"Durée".padStart(6)}  PV restants`);

  const t0 = performance.now();
  let total = 0;
  for (const m of matchups) {
    let win = 0, loss = 0, draw = 0, secs = 0, hpLeft = 0;
    const perItem = new Map<string, { n: number; triggers: number; damage: number; heal: number; shield: number }>();
    for (let k = 0; k < args.n; k++) {
      const r = runWithPolicy(content, { seed: args.seed + k, player, enemies: m.map((id) => ({ id })) }, args.policy);
      total++;
      if (r.outcome === "win") win++, (hpLeft += r.player.hp);
      else if (r.outcome === "loss") loss++;
      else draw++;
      secs += r.seconds;
      for (const s of r.itemStats) {
        if (s.owner !== 0) continue;
        const a = perItem.get(s.item) ?? { n: 0, triggers: 0, damage: 0, heal: 0, shield: 0 };
        a.n++, (a.triggers += s.stats.triggers), (a.damage += s.stats.damage), (a.heal += s.stats.heal), (a.shield += s.stats.shield);
        perItem.set(s.item, a);
      }
    }
    const label = m.join(" + ").padEnd(28);
    const hp = win ? (hpLeft / win).toFixed(1) : "-";
    console.log(`${label} ${pct(win, args.n)} ${pct(loss, args.n)} ${pct(draw, args.n)}  ${(secs / args.n).toFixed(1).padStart(5)}s  ${hp}`);
    if (args.items) {
      for (const [id, a] of perItem) {
        const f = (x: number) => (x / args.n).toFixed(1).padStart(6);
        console.log(`    ${id.padEnd(22)} décl.${f(a.triggers)}  dégâts${f(a.damage)}  soin${f(a.heal)}  bouclier${f(a.shield)}`);
      }
    }
  }
  const dt = (performance.now() - t0) / 1000;
  console.log(`\n${total} combats en ${dt.toFixed(2)} s (${Math.round(total / dt)} combats/s)`);
}

main();
