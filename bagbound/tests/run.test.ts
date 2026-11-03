import { describe, expect, it } from "vitest";
import { loadContentFromDir, loadRunDataFromDir } from "../src/content/node";
import { ContentError } from "../src/content/loader";
import { loadRunData } from "../src/content/runData";
import { runCombat, type CombatResult } from "../src/engine";
import { autoPlace } from "../src/game/autoplace";
import { Bag } from "../src/game/bag";
import { botRun } from "../src/game/bot";
import { generateFloor } from "../src/game/map";
import * as R from "../src/game/run";

const content = loadContentFromDir();
const rd = loadRunDataFromDir(content);
const CLS = "vagabond";
const FOREST = rd.zones[0].routes[0];

const fakeResult = (outcome: CombatResult["outcome"], hp: number, bag = R.placementsOf({ entries: [] })): CombatResult => ({
  outcome,
  ticks: 10,
  seconds: 1,
  player: { hp, maxHp: 60 },
  enemies: [],
  playerBagAfter: bag,
  itemStats: [],
  hash: "",
  used: { drink: 0, throw: 0 },
  events: [],
  actions: [],
});

describe("carte", () => {
  it("déterministe et bien formée", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const a = generateFloor({ rngState: seed }, rd, FOREST, 0, 0);
      const b = generateFloor({ rngState: seed }, rd, FOREST, 0, 0);
      expect(b).toEqual(a);
      const ids = new Set(a.map((n) => n.id));
      expect(ids.size).toBe(a.length);
      const maxRow = Math.max(...a.map((n) => n.row));
      for (const n of a) {
        if (n.row < maxRow) expect(n.next.length, n.id).toBeGreaterThan(0);
        else expect(n.next).toEqual([]);
        if (n.row > 0) expect(a.some((m) => m.next.includes(n.id)), `${n.id} sans entrée`).toBe(true);
        for (const id of n.next) expect(a.find((m) => m.id === id)!.row).toBe(n.row + 1);
        if (n.row === 0) expect(n.type).toBe(rd.rules.firstRow);
        if (n.type === "elite") expect(n.row).toBeGreaterThanOrEqual(rd.rules.eliteMinRow);
        if (["combat", "elite"].includes(n.type)) expect(n.enemies!.length).toBeGreaterThan(0);
      }
    }
  });

  it("le dernier étage finit par un feu de camp puis le boss", () => {
    const last = FOREST.floors.length - 1;
    const f = generateFloor({ rngState: 3 }, rd, FOREST, 0, last);
    const maxRow = Math.max(...f.map((n) => n.row));
    expect(f.filter((n) => n.row === maxRow).map((n) => n.type)).toEqual(["boss"]);
    expect(f.filter((n) => n.row === maxRow - 1).map((n) => n.type)).toEqual(["campfire"]);
    expect(f.find((n) => n.type === "boss")!.enemies).toEqual(FOREST.boss);
  });
});

describe("déroulement d'une run", () => {
  it("nouvelle run : sac de départ, PV, or, première rangée accessible", () => {
    const run = R.newRun(content, rd, CLS, 42);
    expect(run.hp).toBe(content.classes[CLS].hp);
    expect(run.gold).toBe(rd.rules.startGold);
    expect(R.placementsOf(run.bag)).toHaveLength(content.classes[CLS].startingBag.length);
    expect(R.reachable(run).every((n) => n.row === 0)).toBe(true);
    const far = run.map.find((n) => n.row === 2)!;
    expect(() => R.enterNode(run, content, rd, far.id)).toThrow(R.RunError);
  });

  it("combat -> butin -> nœud suivant ; PV et sac conservés", () => {
    const run = R.newRun(content, rd, CLS, 7);
    const first = R.reachable(run)[0];
    R.enterNode(run, content, rd, first.id);
    expect(run.phase).toBe("combat");
    const setup = R.combatSetup(run, content);
    expect(setup.player.hp).toBe(run.hp);
    expect(setup.enemies.map((e) => e.id)).toEqual(first.enemies);
    const result = runCombat(content, setup);
    expect(result.outcome).toBe("win");
    const gold0 = run.gold;
    R.finishCombat(run, content, rd, result);
    expect(run.phase).toBe("reward");
    expect(run.hp).toBe(result.player.hp);
    expect(run.gold).toBeGreaterThan(gold0);
    const p = run.pending as Extract<R.Pending, { kind: "reward" }>;
    expect(p.choices).toHaveLength(rd.rules.rewardChoices);
    R.takeReward(run, rd, p.choices[0]);
    expect(run.bag.entries[0]).toEqual({ item: p.choices[0], rot: 0, pos: null });
    expect(run.phase).toBe("map");
    expect(R.reachable(run).map((n) => n.id)).toEqual(first.next);
  });

  it("charges des potions et objets lancés conservés après le combat", () => {
    const run = R.newRun(content, rd, CLS, 7);
    R.enterNode(run, content, rd, R.reachable(run)[0].id);
    const setup = R.combatSetup(run, content);
    const potion = setup.player.bag.findIndex((p) => p.item === "health_potion");
    const result = runCombat(content, { ...setup, actions: [{ tick: 3, type: "drink", combatant: 0, item: `0:${potion}` }] });
    run.bag.entries.push({ item: "antidote", rot: 0, pos: null });
    R.finishCombat(run, content, rd, result);
    expect(run.bag.entries.find((e) => e.item === "health_potion")!.charges).toBe(1);
    expect(run.bag.entries.at(-1)).toEqual({ item: "antidote", rot: 0, pos: null });
  });

  it("défaite : la run s'arrête", () => {
    const run = R.newRun(content, rd, CLS, 7);
    R.enterNode(run, content, rd, R.reachable(run)[0].id);
    R.finishCombat(run, content, rd, fakeResult("loss", 0));
    expect(run.phase).toBe("dead");
    expect(run.stats.killedBy!.length).toBeGreaterThan(0);
    expect(R.reachable(run)).toEqual([]);
  });

  it("boutique : achat, vente, relance, soin", () => {
    const run = R.newRun(content, rd, CLS, 1);
    run.phase = "shop";
    run.pending = { kind: "shop", stock: [{ item: "iron_sword", price: 7, sold: false }, { item: "flame_sword", price: 99, sold: false }], rerolls: 0 };
    run.gold = 20;
    R.buy(run, 0);
    expect(run.gold).toBe(13);
    expect(run.bag.entries[0].item).toBe("iron_sword");
    expect(() => R.buy(run, 0)).toThrow(/vendu/);
    expect(() => R.buy(run, 1)).toThrow(/or/);
    R.sell(run, content, rd, 0);
    expect(run.gold).toBe(13 + R.sellPrice(content, rd, "iron_sword"));
    const c1 = R.rerollCost(run, rd);
    R.reroll(run, content, rd);
    expect(R.rerollCost(run, rd)).toBe(c1 + rd.rules.shop.rerollStep);
    run.hp = 10;
    R.shopHeal(run, rd);
    expect(run.hp).toBe(10 + rd.rules.shop.healAmount);
  });

  it("feu de camp : repos ou entraînement", () => {
    const run = R.newRun(content, rd, CLS, 1);
    run.phase = "campfire";
    run.hp = 10;
    R.campfire(run, rd, "rest");
    expect(run.hp).toBe(10 + Math.round(run.maxHp * rd.rules.campfire.healPct));
    run.phase = "campfire";
    const max = run.maxHp;
    R.campfire(run, rd, "train");
    expect(run.maxHp).toBe(max + rd.rules.campfire.maxHp);
  });

  it("événements : conditions, effets, combat déclenché", () => {
    const run = R.newRun(content, rd, CLS, 1);
    const enter = (id: string) => {
      run.phase = "event";
      run.pending = { kind: "event", id, result: null, messages: [] };
    };
    enter("spring");
    const ev = R.currentEvent(run, rd)!;
    expect(R.choiceAvailable(run, content, ev.choices[1])).toBe(false); // pas de bouteille vide
    run.bag.entries.push({ item: "empty_bottle", rot: 0, pos: null, charges: 0 });
    expect(R.choiceAvailable(run, content, ev.choices[1])).toBe(true);
    R.chooseEvent(run, content, rd, 1);
    expect(run.bag.entries.at(-1)).toMatchObject({ item: "health_potion", charges: 1 });
    R.closeEvent(run, rd);
    expect(run.phase).toBe("map");

    enter("peddler");
    run.gold = 8;
    R.chooseEvent(run, content, rd, 0);
    expect(run.gold).toBe(0);
    expect(rd.loot.forest_elite.map((e) => e.item)).toContain(run.bag.entries[0].item);

    enter("ambush");
    R.chooseEvent(run, content, rd, 0);
    expect(run.phase).toBe("combat");
    expect(R.combatSetup(run, content).enemies.map((e) => e.id)).toEqual(["bandit", "goblin"]);
  });

  it("fin de rangée : étage suivant ; boss vaincu : victoire", () => {
    const run = R.newRun(content, rd, CLS, 5);
    const lastRow = run.map.filter((n) => n.next.length === 0)[0];
    run.current = lastRow.id;
    R.completeNode(run, rd);
    expect(run.floor).toBe(1);
    expect(run.current).toBeNull();
    expect(run.map[0].id.startsWith("0-1-")).toBe(true);

    // boss de la dernière zone, puis zone finale, puis victoire
    run.zone = rd.zones.length - 1;
    run.route = rd.zones[run.zone].routes[0].id;
    run.floor = rd.zones[run.zone].routes[0].floors.length - 1;
    run.map = generateFloor(run, rd, rd.zones[run.zone].routes[0], run.zone, run.floor);
    run.current = run.map.find((n) => n.type === "boss")!.id;
    R.completeNode(run, rd);
    expect(run.zone).toBe(rd.zones.length);
    expect(run.route).toBe("final");
    expect(run.map.map((n) => n.type)).toEqual(["campfire", "boss"]);
    expect(run.map[1].enemies).toEqual(rd.final.boss);
    run.current = run.map[1].id;
    R.completeNode(run, rd);
    expect(run.phase).toBe("won");
    expect(run.log.at(-1)).toMatchObject({ type: "end", won: true });
  });

  it("sauvegarde : aller-retour JSON, sauvegarde abîmée ignorée", () => {
    const run = R.newRun(content, rd, CLS, 9);
    R.enterNode(run, content, rd, R.reachable(run)[0].id);
    const back = R.parseRun(R.serializeRun(run))!;
    expect(back).toEqual(run);
    expect(runCombat(content, R.combatSetup(back, content)).hash).toBe(runCombat(content, R.combatSetup(run, content)).hash);
    expect(R.parseRun("{oups")).toBeNull();
    expect(R.parseRun(JSON.stringify({ v: 1, map: [], bag: { entries: [] } }))).toBeNull();
  });
});

describe("rangement automatique et bot", () => {
  it("autoPlace remplit le sac sans chevauchement", () => {
    const cls = content.classes[CLS];
    const bag = new Bag(content, cls.bagCells);
    for (const id of ["iron_sword", "wooden_shield", "healing_herb", "banana", "torch", "gear"]) bag.add(id);
    const n = autoPlace(bag);
    expect(n).toBeGreaterThanOrEqual(4);
    expect(bag.isValid()).toBe(true);
  });

  it("une run complète du bot se termine et est reproductible", () => {
    const a = botRun(content, rd, CLS, 11);
    const b = botRun(content, rd, CLS, 11);
    expect(["dead", "won"]).toContain(a.run.phase);
    expect(b.run).toEqual(a.run);
    expect(a.run.stats.combats).toBeGreaterThan(0);
  });
});

describe("données de run", () => {
  it("références invalides refusées", () => {
    const raw = (name: string) => JSON.parse(JSON.stringify(require(`../data/${name}.json`)));
    const zones = raw("zones");
    zones.zones[0].routes[0].shopTable = "nope";
    zones.zones[0].routes[0].boss = ["ghost"];
    const events = raw("events");
    events[0].choices[0].effects.push({ type: "addItem", item: "licorne" });
    try {
      loadRunData({ rules: raw("run"), zones, loot: raw("loot"), events }, content);
      expect.unreachable();
    } catch (e) {
      const msg = (e as ContentError).issues.join("\n");
      expect(msg).toMatch(/table de butin inconnue « nope »/);
      expect(msg).toMatch(/ennemi inconnu « ghost »/);
      expect(msg).toMatch(/objet inconnu « licorne »/);
    }
  });
});
