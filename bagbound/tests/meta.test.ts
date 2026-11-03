import { describe, expect, it } from "vitest";
import { loadContentFromDir, loadMetaFromDir, loadRunDataFromDir, loadStoryFromDir } from "../src/content/node";
import { createCombat, runCombat, stepCombat } from "../src/engine";
import { Bag } from "../src/game/bag";
import * as H from "../src/game/hub";
import * as R from "../src/game/run";

const content = loadContentFromDir();
const rd = loadRunDataFromDir(content);
const meta = loadMetaFromDir(content);
const { quests, story } = loadStoryFromDir(content, rd);

describe("classes", () => {
  it("4 classes, sacs de départ valides, une mécanique innée chacune (sauf le Vagabond)", () => {
    expect(Object.keys(content.classes)).toEqual(["vagabond", "smith", "apothecary", "ranger"]);
    for (const c of Object.values(content.classes)) {
      const run = R.newRun(content, rd, c.id, 1);
      expect(run.hp).toBe(c.hp);
      expect(run.bag.cells).toHaveLength(c.bagCells.length);
      expect(R.placementsOf(run.bag)).toHaveLength(c.startingBag.length);
    }
    expect(content.classes.smith.innate).toEqual(["forge_heart"]);
  });

  it("l'objet inné agit en combat sans occuper le sac ni en sortir", () => {
    const run = R.newRun(content, rd, "apothecary", 1);
    R.enterNode(run, content, rd, R.reachable(run)[0].id);
    const setup = R.combatSetup(run, content);
    expect(setup.player.innate).toEqual(["steady_hands"]);
    const st = createCombat(content, { ...setup, player: { ...setup.player, hp: 20, maxHp: 50 }, actions: [{ tick: 1, type: "drink", combatant: 0, item: "0:0" }] }, { record: true });
    stepCombat(st);
    // potion : +15, mains sûres : +6
    expect(st.combatants[0].hp).toBe(41);
    const innate = st.combatants[0].items.find((i) => i.ref === "innate")!;
    expect(innate.neighbors).toEqual([]);
    while (!st.outcome) stepCombat(st);
    const r = runCombat(content, setup);
    expect(r.playerBagAfter.some((p) => p.item === "steady_hands")).toBe(false);
  });
});

describe("difficulté", () => {
  it("les paliers renforcent les ennemis (PV et dégâts) et posent des malédictions", () => {
    const p = H.newProfile();
    p.bestTier = 5;
    const o4 = H.departure(p, quests, rd, meta, { tier: 4 });
    expect(o4.tier).toBe(4);
    expect(o4.curses).toEqual(["cursed_weight", "cursed_thorn"]);
    const run = R.newRun(content, rd, "vagabond", 2, o4);
    const placed = run.bag.entries.filter((e) => e.pos).map((e) => e.item);
    expect(placed).toEqual(expect.arrayContaining(["cursed_weight", "cursed_thorn"]));
    R.enterNode(run, content, rd, R.reachable(run)[0].id);
    const s = R.combatSetup(run, content);
    expect(s.enemies[0].hpMul).toBeCloseTo(meta.tiers[4].enemyHpMul);
    expect(s.enemies[0].damageMul).toBe(meta.tiers[4].enemyDamageMul);
    const st = createCombat(content, s);
    const base = content.enemies[s.enemies[0].id!].hp;
    expect(st.combatants[1].maxHp).toBe(Math.round(base * meta.tiers[4].enemyHpMul));
    expect(st.combatants[1].damageMul).toBe(meta.tiers[4].enemyDamageMul);
  });

  it("le multiplicateur de dégâts s'applique aux coups directs", () => {
    const enemy = { hp: 1000, bag: [{ item: "rusty_dagger", pos: [0, 0] as [number, number] }] };
    const hit = (mul: number) => {
      const st = createCombat(content, { seed: 1, player: { hp: 100, bag: [] }, enemies: [{ ...enemy, damageMul: mul }] });
      while (st.tick < 15) stepCombat(st);
      return 100 - st.combatants[0].hp;
    };
    expect(hit(1)).toBe(2);
    expect(hit(2)).toBe(4);
  });

  it("un objet maudit ne quitte pas le sac et ne se vend pas", () => {
    const run = R.newRun(content, rd, "vagabond", 2, { curses: ["cursed_weight"] });
    const cls = content.classes.vagabond;
    const bag = Bag.fromJSON(content, cls.bagCells, run.bag, cls.maxBag);
    const curse = bag.entries.find((e) => e.item === "cursed_weight")!;
    expect(curse.pos).not.toBeNull();
    expect(bag.stash(curse.uid)).toBe(false);
    run.phase = "shop";
    run.pending = { kind: "shop", stock: [], rerolls: 0 };
    expect(() => R.sell(run, content, rd, run.bag.entries.findIndex((e) => e.item === "cursed_weight"))).toThrow(/maudit/);
  });

  it("les paliers s'ouvrent un par un, en gagnant", () => {
    const p = H.newProfile();
    expect(H.availableTiers(p, meta).map((t) => t.id)).toEqual([0]);
    const run = R.newRun(content, rd, "vagabond", 1);
    run.phase = "won";
    run.log = [{ type: "end", won: true, zone: 2, route: "final" }];
    const s = H.applyRun(p, run, quests, story, content, rd, meta);
    expect(s.tierUnlocked).toBe(1);
    expect(H.availableTiers(p, meta).map((t) => t.id)).toEqual([0, 1]);
  });
});

describe("méta-progression", () => {
  it("éclats : combats, élites, boss, étages, victoire, multipliés par le palier", () => {
    const run = R.newRun(content, rd, "vagabond", 1);
    run.log = [
      { type: "combat", enemies: ["goblin"], win: true, elite: false, boss: false, zone: 0, route: "forest", drink: 0, throw: 0 },
      { type: "combat", enemies: ["treant"], win: true, elite: true, boss: false, zone: 0, route: "forest", drink: 0, throw: 0 },
      { type: "combat", enemies: ["forest_warden"], win: true, elite: false, boss: true, zone: 0, route: "forest", drink: 0, throw: 0 },
      { type: "floor", zone: 0, floor: 0, route: "forest", hpLost: 3 },
    ];
    run.phase = "dead";
    expect(H.shardsFor(run, meta)).toBe(3 + 4 + 12 + 2);
    run.tier = 2;
    expect(H.shardsFor(run, meta)).toBe(Math.round(21 * 1.5));
  });

  it("améliorations : prix, prérequis, niveaux, effets au départ", () => {
    const p = H.newProfile();
    p.shards = 1000;
    const haggler = meta.upgrades.find((u) => u.id === "haggler")!;
    expect(H.canBuy(p, haggler)).toBe(false); // demande « Bourse cousue »
    H.buyUpgrade(p, meta, "purse");
    H.buyUpgrade(p, meta, "purse");
    H.buyUpgrade(p, meta, "haggler");
    H.buyUpgrade(p, meta, "hide");
    H.buyUpgrade(p, meta, "pocket");
    H.buyUpgrade(p, meta, "belt");
    expect(p.shards).toBe(1000 - 15 - 25 - 35 - 20 - 40 - 35);
    expect(p.chest.slots).toBe(2);
    const o = H.departure(p, quests, rd, meta);
    expect(o.startGold).toBe(10);
    expect(o.maxHpBonus).toBe(5);
    expect(o.mods!.shopDiscount).toBeCloseTo(0.1);
    expect(o.startItems).toContain("health_potion");
    const run = R.newRun(content, rd, "vagabond", 4, o);
    expect(run.maxHp).toBe(65);
    expect(run.gold).toBe(rd.rules.startGold + 10);
    for (let i = 0; i < 2; i++) H.buyUpgrade(p, meta, "hide");
    expect(() => H.buyUpgrade(p, meta, "hide")).toThrow(); // déjà au max (3 niveaux)
  });

  it("acheter une classe la rend jouable", () => {
    const p = H.newProfile();
    p.shards = 50;
    H.buyUpgrade(p, meta, "class_smith");
    expect(p.classes).toContain("smith");
    expect(H.departure(p, quests, rd, meta, { cls: "smith" })).toBeDefined();
    expect(p.lastClass).toBe("smith");
    expect(H.departure(p, quests, rd, meta, { cls: "ranger" }) && p.lastClass).toBe("vagabond"); // pas débloquée
  });

  it("un ancien profil (sans méta-progression) est complété au chargement", () => {
    const old = { v: 1, runs: 4, deaths: 4, wins: 0, flags: [], lore: [], quests: {}, unlockedItems: [], routes: [], chest: { slots: 1, items: [] }, startItems: [], startGold: 0, seenDialogues: [], bossKills: {}, last: null };
    const p = H.parseProfile(JSON.stringify(old))!;
    expect(p.runs).toBe(4);
    expect(p.shards).toBe(0);
    expect(p.classes).toEqual(["vagabond"]);
    expect(p.bestTier).toBe(-1);
  });

  it("modificateurs de run : boutique moins chère, relance gratuite, butin en plus, feu de camp", () => {
    const run = R.newRun(content, rd, "vagabond", 4, { mods: { shopDiscount: 0.2, freeRerolls: 1, rewardChoicesBonus: 1, campfireHealMul: 1.5 } });
    run.phase = "shop";
    run.pending = { kind: "shop", stock: [], rerolls: 0 };
    expect(R.rerollCost(run, rd)).toBe(0);
    run.gold = 0;
    R.reroll(run, content, rd);
    expect(R.rerollCost(run, rd)).toBe(rd.rules.shop.reroll);
    const sp = run.pending as Extract<R.Pending, { kind: "shop" }>;
    for (const s of sp.stock) expect(s.price).toBe(Math.max(1, Math.round(content.items[s.item].price * 0.8)));
    expect(R.campfireHeal(run, rd)).toBe(Math.round(run.maxHp * rd.rules.campfire.healPct * 1.5));
    run.phase = "map";
    run.pending = null;
    R.enterNode(run, content, rd, R.reachable(run)[0].id);
    R.finishCombat(run, content, rd, runCombat(content, R.combatSetup(run, content)));
    expect((run.pending as unknown as Extract<R.Pending, { kind: "reward" }>).choices).toHaveLength(rd.rules.rewardChoices + 1);
  });
});
