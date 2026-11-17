import { test } from "node:test";
import assert from "node:assert/strict";
import { ACTIONS, UNITS, actionsAt, applyAction, blocked, buy, endDay, newState, openMail, tierOf, actionById, State } from "../src/sim";
import { call, reply, unread } from "../src/people";

function fresh(seed = 42): State { const s = newState(); s.seed = seed; return s; }
function playDay(s: State, plan: string[]): void {
  for (const id of plan) {
    const a = actionById(id);
    if ((a.when && !a.when(s)) || blocked(s, a)) continue;
    applyAction(s, id);
  }
  endDay(s);
}

test("une journée compte 8 unités et se referme", () => {
  const s = fresh();
  applyAction(s, "work"); applyAction(s, "work"); applyAction(s, "cook"); applyAction(s, "eat");
  assert.equal(s.units, 1);
  assert.equal(blocked(s, actionById("draw")), "units");
  const o = applyAction(s, "read");
  assert.equal(o.dayOver, true);
  endDay(s);
  assert.equal(s.day, 1);
  assert.equal(s.units, UNITS);
  assert.equal(s.log.length, 1);
});

test("hystérésis des paliers", () => {
  assert.equal(tierOf(61, 2), 2);
  assert.equal(tierOf(64, 2), 3);
  assert.equal(tierOf(58, 3), 3);
  assert.equal(tierOf(56, 3), 2);
  assert.equal(tierOf(5, 4), 0);
});

test("travailler sans arrêt rapporte de l'argent mais pèse, sans jamais bloquer le jeu", () => {
  const s = fresh();
  for (let d = 0; d < 12; d++) playDay(s, ["work", "work", "work", "work"]);
  assert.ok(s.money > 1500, "argent " + s.money);
  assert.ok(s.tier <= 1, "humeur basse attendue, palier " + s.tier);
  assert.ok(s.mood >= 8);
  // Même au plus bas, des gestes doux restent toujours possibles.
  assert.ok(ACTIONS.some((a) => !a.effort && a.cost > 0 && !blocked(s, a)));
});

test("on remonte toujours depuis le plus bas", () => {
  const s = fresh();
  for (let d = 0; d < 12; d++) playDay(s, ["work", "work", "work", "work"]);
  for (let d = 0; d < 8; d++) playDay(s, ["shower", "tea", "eat", "window", "read", "water", "rest", "nap"]);
  assert.ok(s.tier >= 2, "palier " + s.tier + " humeur " + s.mood);
});

test("une vie variée va bien sans être parfaite, et aucune routine ne plafonne trivialement", () => {
  const s = fresh();
  for (let d = 0; d < 16; d++) playDay(s, ["work", "cook", "eat", "shower", d % 2 ? "read" : "draw", "tidy"]);
  assert.ok(s.tier >= 3, "palier " + s.tier + " humeur " + s.mood);
  assert.ok(s.money > 0, "argent " + s.money);
  const lazy = fresh();
  for (let d = 0; d < 16; d++) playDay(lazy, ["play", "play", "play", "play", "play", "play", "play", "play"]);
  assert.ok(lazy.mood < s.mood, "répéter une seule chose ne vaut pas une vie variée");
});

test("unités lourdes : les efforts attendent, les gestes doux passent", () => {
  const s = fresh();
  s.mood = 10; s.tier = 0;
  endDay(s);
  assert.equal(s.heavy, 2);
  s.units = 2;
  assert.equal(blocked(s, actionById("work")), "heavy");
  assert.equal(blocked(s, actionById("read")), null);
  applyAction(s, "read");
  assert.equal(s.heavy, 1);
});

test("les menus suivent l'état de l'appartement", () => {
  const s = fresh();
  s.apt.dishes = 0; s.apt.mug = false;
  assert.ok(!actionsAt(s, "counter").some((a) => a.id === "dishes"));
  applyAction(s, "tea");
  assert.ok(actionsAt(s, "counter").some((a) => a.id === "dishes"));
});

test("les proches écrivent, et le silence laisse une trace", () => {
  const s = fresh(7);
  const bonds = () => s.people.lou.bond + s.people.sam.bond + s.people.ines.bond;
  const start = bonds();
  for (let d = 0; d < 20; d++) playDay(s, ["read"]);
  assert.ok(s.inbox.length > 3, "messages reçus : " + s.inbox.length);
  assert.ok(bonds() < start, "les liens s'étiolent quand on ne répond jamais");
  assert.ok(s.events.length >= 0);
});

test("répondre et appeler nourrit les liens ; une invitation acceptée ouvre une sortie ou une visite", () => {
  const s = fresh(7);
  let opened = 0;
  for (let d = 0; d < 30; d++) {
    for (const m of s.inbox.filter((x) => x.answer < 0)) {
      const out = reply(s, m.id, m.replies.findIndex((r) => r.fit === 2));
      assert.ok(out && out.echo === "good");
      if (m.kind === "out") { assert.ok(s.invites[m.from] >= s.day); opened++; }
      if (m.kind === "visit" && out.visit) { assert.ok(s.visit); opened++; }
    }
    if (s.visit) { s.visit.arrived = true; applyAction(s, "vTalk"); applyAction(s, "vSit"); assert.equal(s.visit.done, 2); }
    if (d % 5 === 0) assert.ok(call(s, "lou"));
    playDay(s, ["work", "cook", "eat"]);
  }
  assert.equal(unread(s) <= 2, true);
  assert.ok(s.people.lou.bond > 70, "lien avec Lou " + s.people.lou.bond);
  assert.ok(opened > 0, "au moins une invitation");
});

test("météo, loyer, courrier et colis", () => {
  const s = fresh(3);
  const seen = new Set<string>();
  let rent = 0;
  for (let d = 0; d < 40; d++) {
    if (d === 1) assert.ok(buy(s, "frame"));
    playDay(s, ["work", "work", "cook", "eat"]);
    seen.add(s.weather);
    if (s.events.includes("rent") || s.events.includes("tight")) rent++;
    if (s.mail.length) openMail(s);
    if (s.parcels.length) applyAction(s, "parcel");
  }
  assert.ok(seen.size >= 4, "météos vues : " + [...seen].join(","));
  assert.equal(rent, 10);
  assert.ok(s.decor.includes("frame"));
  assert.equal(s.parcels.length, 0);
});

test("sans argent on ne peut pas sortir au restaurant, mais le parc reste ouvert", () => {
  const s = fresh();
  s.money = 3; s.weather = "sun";
  assert.equal(blocked(s, actionById("resto")), "money");
  assert.equal(blocked(s, actionById("park")), null);
  applyAction(s, "park");
  assert.equal(s.memories.length, 1);
});
