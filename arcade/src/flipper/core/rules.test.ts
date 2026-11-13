import { test } from "node:test";
import assert from "node:assert/strict";
import { FlipperRules, BALLS_PER_GAME } from "./rules.js";

test("banque de cibles : compléter la banque donne le bonus et une bille", () => {
  const r = new FlipperRules(["a", "b", "c"], []);
  r.launch();
  assert.equal(r.target("a"), false);
  assert.equal(r.target("a"), false, "une cible ne compte qu'une fois");
  assert.equal(r.target("b"), false);
  assert.equal(r.target("c"), true, "banque complète");
  assert.equal(r.score, 50 * 3 + 1000);
});

test("rollovers : allumer toutes les lettres donne un bonus", () => {
  const r = new FlipperRules([], ["1", "2"]);
  r.launch();
  r.rollover("1");
  r.rollover("1");
  r.rollover("2");
  assert.equal(r.score, 200 * 2 + 1000);
});

test("trois billes puis fin de partie", () => {
  const r = new FlipperRules([], []);
  for (let i = 0; i < BALLS_PER_GAME; i++) {
    r.launch();
    r.drain();
  }
  assert.equal(r.ballsLeft, 0);
  assert.equal(r.over, true);
  const events = r.flush();
  assert.equal(events.at(-1)?.type, "gameover");
});

test("bonus de fin de bille : 50 par bumper touché pendant la bille", () => {
  const r = new FlipperRules([], []);
  r.launch();
  r.bumper();
  r.bumper();
  const bonus = r.drain();
  assert.equal(bonus, 100);
  assert.equal(r.score, 2 * 100 + 100, "deux bumpers (200) + bonus (100)");
});

test("drain sans bille en jeu ne compte pas deux fois", () => {
  const r = new FlipperRules([], []);
  r.launch();
  r.drain();
  assert.equal(r.drain(), 0);
  assert.equal(r.ballsLeft, BALLS_PER_GAME - 1);
});
