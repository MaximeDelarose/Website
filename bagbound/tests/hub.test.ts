import { describe, expect, it } from "vitest";
import { ContentError } from "../src/content/loader";
import { loadContentFromDir, loadRecipesFromDir, loadRunDataFromDir, loadStoryFromDir } from "../src/content/node";
import { loadStory } from "../src/content/story";
import { botRun } from "../src/game/bot";
import * as H from "../src/game/hub";
import * as R from "../src/game/run";

const content = loadContentFromDir();
const rd = loadRunDataFromDir(content);
const recipes = loadRecipesFromDir(content);
const { story, quests } = loadStoryFromDir(content, rd);

const fresh = () => {
  const p = H.newProfile();
  H.refreshQuests(p, quests);
  return p;
};

/** Run terminée fabriquée à la main (journal choisi). */
function fakeRun(log: R.RunEvent[], phase: "dead" | "won" = "dead", killedBy: string[] = ["goblin"]): R.RunState {
  const run = R.newRun(content, rd, "vagabond", 1);
  run.phase = phase;
  run.log = log;
  run.stats.killedByIds = killedBy;
  return run;
}
const win = (enemies: string[], extra: Partial<Extract<R.RunEvent, { type: "combat" }>> = {}): R.RunEvent => ({
  type: "combat", enemies, win: true, elite: false, boss: false, zone: 0, route: "forest", drink: 0, throw: 0, ...extra,
});

describe("histoire et quêtes : données", () => {
  it("story.json et quests.json sont valides", () => {
    expect(quests.length).toBeGreaterThanOrEqual(15);
    expect(story.npcs.length).toBeGreaterThanOrEqual(3);
    expect(story.lore.length).toBeGreaterThanOrEqual(8);
  });

  it("références invalides refusées", () => {
    const badQuests = [{ id: "x", npc: "nobody", title: "X", text: "X", conditions: { questsClaimed: ["q_nope"] }, objective: { type: "killEnemy", enemy: "dragon", count: 1 }, rewards: [{ type: "unlockRoute", route: "volcan" }], done: "…" }];
    try {
      loadStory(JSON.parse(JSON.stringify(story)), badQuests, content, rd);
      expect.unreachable();
    } catch (e) {
      const m = (e as ContentError).issues.join("\n");
      expect(m).toMatch(/PNJ inconnu « nobody »/);
      expect(m).toMatch(/quête inconnue « q_nope »/);
      expect(m).toMatch(/ennemi inconnu « dragon »/);
      expect(m).toMatch(/route inconnue « volcan »/);
      expect(m).toMatch(/route fermée qu'aucune quête n'ouvre/); // la quête du marais a disparu
    }
  });
});

describe("profil et quêtes", () => {
  it("les quêtes sans condition sont actives dès le départ, les autres attendent", () => {
    const p = fresh();
    expect(p.quests.q_first_steps.state).toBe("active");
    expect(p.quests.q_treant).toBeUndefined();
    expect(p.quests.q_warden).toBeUndefined(); // demande une première run
  });

  it("une run fait avancer les quêtes, mourir aussi", () => {
    const p = fresh();
    const s = H.applyRun(p, fakeRun([win(["goblin"]), win(["wolf", "wolf"]), { type: "fuse", result: "oak_sword" }]), quests, story, content, rd);
    expect(p.runs).toBe(1);
    expect(p.deaths).toBe(1);
    expect(p.quests.q_first_steps.progress).toBe(2);
    expect(p.quests.q_deaths.progress).toBe(1);
    expect(s.fresh).toContain("q_warden");
    expect(s.returnText.length).toBeGreaterThan(0);
    H.applyRun(p, fakeRun([win(["slime"])]), quests, story, content, rd);
    expect(p.quests.q_first_steps.state).toBe("done");
  });

  it("rendre une quête applique ses récompenses (objet, route, coffre)", () => {
    const p = fresh();
    expect(H.lockedItems(p, quests)).toContain("lumber_axe");
    p.quests.q_first_steps.state = "done";
    H.claimQuest(p, quests, "q_first_steps");
    expect(H.lockedItems(p, quests)).not.toContain("lumber_axe");
    expect(p.quests.q_treant.state).toBe("active"); // débloquée par la précédente
    expect(H.departure(p, quests, rd).unlockedRoutes).not.toContain("swamp");
    p.quests.q_potions.state = "done";
    H.claimQuest(p, quests, "q_potions");
    expect(H.departure(p, quests, rd).unlockedRoutes).toContain("swamp");
    p.quests.q_gold.state = "done";
    H.claimQuest(p, quests, "q_gold");
    expect(p.chest.slots).toBe(2);
    expect(() => H.claimQuest(p, quests, "q_gold")).toThrow();
  });

  it("boss vaincus, zones atteintes, fragments trouvés", () => {
    const p = fresh();
    const run = fakeRun(
      [win(["forest_warden"], { boss: true }), { type: "zone", zone: 1, route: "mines" }, { type: "lore", id: "wisp_maker" }, { type: "floor", zone: 0, floor: 0, route: "forest", hpLost: 0 }],
      "dead",
      ["rust_colossus"],
    );
    const s = H.applyRun(p, run, quests, story, content, rd);
    expect(p.bossKills.forest_warden).toBe(1);
    expect(p.flags).toContain("reached_depths");
    expect(s.newLore).toEqual(["wisp_maker"]);
    expect(p.quests.q_depths.state).toBe("done");
    expect(p.quests.q_colossus.state).toBe("active"); // ouverte en atteignant les Profondeurs
    expect(s.returnText).toMatch(/Colosse/);
  });
});

describe("PNJ", () => {
  it("priorité : quête à rendre > dialogue > nouvelle quête > bavardage", () => {
    const p = fresh();
    const t1 = H.talk(p, story, quests, "orme");
    expect(t1.kind).toBe("dialogue");
    H.markTalked(p, t1);
    const t2 = H.talk(p, story, quests, "orme");
    expect(t2).toMatchObject({ kind: "offer", quest: { id: "q_first_steps" } });
    H.markTalked(p, t2);
    expect(H.talk(p, story, quests, "orme").kind).toBe("idle");
    expect(H.hasNews(p, story, quests, "orme")).toBe(false);
    p.quests.q_first_steps.state = "done";
    expect(H.talk(p, story, quests, "orme")).toMatchObject({ kind: "claim" });
  });

  it("les PNJ arrivent au fil des runs", () => {
    const p = fresh();
    expect(H.visibleNpcs(p, story).map((n) => n.id)).toEqual(["orme"]);
    p.runs = 2;
    expect(H.visibleNpcs(p, story).map((n) => n.id).sort()).toEqual(["orme", "pip", "ysolde"]);
  });
});

describe("coffre et départ", () => {
  it("le coffre garde des objets d'une run à l'autre", () => {
    const p = fresh();
    expect(H.depositChest(p, "iron_sword")).toBe(true);
    expect(H.depositChest(p, "torch")).toBe(false); // 1 seule place
    p.startItems.push("healing_herb");
    const opts = H.departure(p, quests, rd);
    expect(p.chest.items).toEqual([]);
    const run = R.newRun(content, rd, "vagabond", 3, opts);
    expect(run.bag.entries.filter((e) => e.pos === null).map((e) => e.item)).toEqual(["healing_herb", "iron_sword"]);
  });

  it("objets verrouillés : jamais en boutique", () => {
    const shop = rd.loot[rd.zones[0].routes[0].shopTable].map((e) => e.item);
    const run = R.newRun(content, rd, "vagabond", 3, { lockedItems: shop.filter((i) => i !== "health_potion") });
    run.phase = "map";
    const node = run.map.find((n) => n.row === 0)!;
    node.type = "shop";
    R.enterNode(run, content, rd, node.id);
    const p = run.pending as Extract<R.Pending, { kind: "shop" }>;
    expect(p.stock.map((s) => s.item)).toEqual(["health_potion"]);
  });

  it("plusieurs routes ouvertes : on choisit", () => {
    const run = R.newRun(content, rd, "vagabond", 3, { unlockedRoutes: ["forest", "swamp", "mines"] });
    expect(run.phase).toBe("route");
    expect(() => R.chooseRoute(run, rd, "mines")).toThrow();
    R.chooseRoute(run, rd, "swamp");
    expect(run.phase).toBe("map");
    expect(R.currentRoute(run, rd)!.name).toBe("Marais Putride");
    expect(run.map.some((n) => n.enemies?.some((e) => ["bog_toad", "leech_swarm", "mosquito_cloud", "mire_witch", "slime"].includes(e)))).toBe(true);
  });
});

describe("bout en bout", () => {
  it("cinq runs du bot font vivre le profil, qui se sauvegarde en JSON", () => {
    const p = fresh();
    for (let i = 1; i <= 5; i++) {
      const { run } = botRun(content, rd, "vagabond", 100 + i, recipes, H.departure(p, quests, rd));
      H.applyRun(p, run, quests, story, content, rd);
      for (const q of quests) if (p.quests[q.id]?.state === "done") H.claimQuest(p, quests, q.id);
    }
    expect(p.runs).toBe(5);
    expect(H.hubLevel(p)).toBeGreaterThan(0);
    expect(H.parseProfile(JSON.stringify(p))).toEqual(p);
    expect(H.parseProfile("{")).toBeNull();
  });
});
