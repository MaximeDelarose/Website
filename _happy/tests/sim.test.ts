import { test } from "node:test";
import assert from "node:assert/strict";
import { ACTIONS, UNITS, actionsAt, applyAction, blocked, endDay, newState, tierOf, actionById, State } from "../src/sim";

function playDay(s: State, plan: string[]): void {
  for (const id of plan) {
    const a = actionById(id);
    if ((a.when && !a.when(s)) || blocked(s, a)) continue;
    applyAction(s, id);
  }
  endDay(s);
}

test("une journée compte 8 unités et se referme", () => {
  const s = newState();
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
  const s = newState();
  for (let d = 0; d < 12; d++) playDay(s, ["work", "work", "work", "work"]);
  assert.ok(s.money > 1500);
  assert.ok(s.tier <= 1, "humeur basse attendue, palier " + s.tier);
  assert.ok(s.mood >= 8);
  // Même au plus bas, des gestes doux restent toujours possibles.
  assert.ok(ACTIONS.some((a) => !a.effort && a.cost > 0 && !blocked(s, a)));
});

test("on remonte toujours depuis le plus bas", () => {
  const s = newState();
  for (let d = 0; d < 12; d++) playDay(s, ["work", "work", "work", "work"]);
  for (let d = 0; d < 8; d++) playDay(s, ["shower", "tea", "eat", "window", "read", "water", "rest", "nap"]);
  assert.ok(s.tier >= 2, "palier " + s.tier + " humeur " + s.mood);
});

test("une vie variée va bien sans être parfaite, et aucune routine ne plafonne trivialement", () => {
  const s = newState();
  for (let d = 0; d < 16; d++) playDay(s, ["work", "cook", "eat", "shower", d % 2 ? "read" : "draw", "tidy"]);
  assert.ok(s.tier >= 3, "palier " + s.tier);
  assert.ok(s.money > 500);
  const lazy = newState();
  for (let d = 0; d < 16; d++) playDay(lazy, ["play", "play", "play", "play", "play", "play", "play", "play"]);
  assert.ok(lazy.mood < s.mood, "répéter une seule chose ne vaut pas une vie variée");
});

test("unités lourdes : les efforts attendent, les gestes doux passent", () => {
  const s = newState();
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
  const s = newState();
  s.apt.dishes = 0; s.apt.mug = false;
  assert.ok(!actionsAt(s, "counter").some((a) => a.id === "dishes"));
  applyAction(s, "tea");
  assert.ok(actionsAt(s, "counter").some((a) => a.id === "dishes"));
});
