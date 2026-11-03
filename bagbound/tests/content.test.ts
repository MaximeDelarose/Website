import { describe, expect, it } from "vitest";
import { ContentError, loadContent } from "../src/content/loader";
import { loadContentFromDir } from "../src/content/node";
import { runCombat } from "../src/engine";
import { BASE_ITEMS, TAGS, TEST_RULES } from "./helpers";

const load = (items: object[], enemies: object[] = [], classes: object[] = []) =>
  loadContent({ rules: TEST_RULES, tags: TAGS, items: [...BASE_ITEMS, ...items], enemies, classes });

const issues = (fn: () => unknown): string[] => {
  try {
    fn();
  } catch (e) {
    if (e instanceof ContentError) return e.issues;
    throw e;
  }
  return [];
};

describe("contenu /data", () => {
  it("les JSON du jeu sont valides et cohérents", () => {
    const c = loadContentFromDir();
    expect(Object.keys(c.items).length).toBeGreaterThan(20);
    expect(Object.keys(c.enemies).length).toBeGreaterThan(5);
    expect(c.classes.vagabond).toBeDefined();
  });

  it("chaque ennemi peut être combattu par le sac de départ", () => {
    const c = loadContentFromDir();
    const v = c.classes.vagabond;
    for (const id of Object.keys(c.enemies)) {
      const r = runCombat(c, { seed: 1, player: { hp: v.hp, bag: v.startingBag }, enemies: [{ id }] });
      expect(["win", "loss", "draw"]).toContain(r.outcome);
      expect(r.seconds).toBeLessThanOrEqual(c.rules.maxDuration);
    }
  });

  it("valeurs par défaut posées par le schéma", () => {
    const c = load([]);
    const dummy = c.items.dummy;
    expect(dummy.cooldown).toBeNull();
    expect(dummy.effects).toEqual([]);
    expect(dummy.rarity).toBe("common");
    expect(dummy.charges).toBeNull();
  });
});

describe("contenu invalide refusé", () => {
  it("tag inconnu", () => {
    expect(issues(() => load([{ id: "x", name: "X", shape: [[0, 0]], tags: ["Banane"] }])).join()).toMatch(/tag inconnu/);
  });

  it("effet inconnu ou incomplet", () => {
    expect(issues(() => load([{ id: "x", name: "X", shape: [[0, 0]], cooldown: 1, effects: [{ type: "laser", value: 1 }] }])).join()).toMatch(/effet inconnu/);
    expect(issues(() => load([{ id: "x", name: "X", shape: [[0, 0]], cooldown: 1, effects: [{ type: "damage" }] }])).join()).toMatch(/demande « value »/);
  });

  it("cible incompatible", () => {
    expect(issues(() => load([{ id: "x", name: "X", shape: [[0, 0]], cooldown: 1, effects: [{ type: "damage", value: 1, target: "adjacent" }] }])).join()).toMatch(/ne convient pas/);
  });

  it("déclencheur inconnu, onEmpty vers un objet inconnu", () => {
    const pb = issues(() =>
      load([{ id: "x", name: "X", shape: [[0, 0]], charges: 1, manual: true, triggers: [{ type: "onDance" }], onEmpty: { transformInto: "nope" } }]),
    ).join();
    expect(pb).toMatch(/déclencheur inconnu/);
    expect(pb).toMatch(/onEmpty vers un objet inconnu/);
  });

  it("effets sans moyen de se déclencher", () => {
    expect(issues(() => load([{ id: "x", name: "X", shape: [[0, 0]], effects: [{ type: "heal", value: 1 }] }])).join()).toMatch(/ni cooldown/);
  });

  it("champ inconnu (faute de frappe)", () => {
    expect(issues(() => load([{ id: "x", name: "X", shape: [[0, 0]], cooldwn: 2 }])).join()).toMatch(/cooldwn|Unrecognized/);
  });

  it("sac ennemi : chevauchement et objet inconnu", () => {
    const pb = issues(() =>
      load([], [{ id: "e", name: "E", hp: 10, bag: [{ item: "sword3", pos: [0, 0] }, { item: "punch", pos: [0, 2] }, { item: "ghost", pos: [5, 5] }] }]),
    ).join();
    expect(pb).toMatch(/chevauche/);
    expect(pb).toMatch(/objet inconnu « ghost »/);
  });

  it("sac de départ qui sort de la forme du sac", () => {
    const pb = issues(() =>
      load([], [], [{ id: "k", name: "K", hp: 10, bagCells: [[0, 0], [0, 1]], startingBag: [{ item: "sword3", pos: [0, 0] }] }]),
    ).join();
    expect(pb).toMatch(/sort du sac/);
  });

  it("id en double", () => {
    expect(issues(() => load([{ id: "punch", name: "Bis", shape: [[0, 0]] }])).join()).toMatch(/double/);
  });
});
