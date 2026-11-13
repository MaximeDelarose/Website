import { test } from "node:test";
import assert from "node:assert/strict";
import { FlipperRules, BALLS_PER_GAME, ROULETTE, MAX_MULT } from "./rules.js";
import { Rng } from "../../shared/rng.js";
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
    assert.equal(r.mult, 2, "les trois lettres montent le multiplicateur");
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
test("multiplicateur : s'applique aux bumpers, plafonné, remis à 1 à la bille perdue", () => {
    const r = new FlipperRules([], ["a"]);
    r.launch();
    for (let i = 0; i < 10; i++)
        r.raiseMult();
    assert.equal(r.mult, MAX_MULT);
    const before = r.score;
    r.bumper();
    assert.equal(r.score - before, 100 * MAX_MULT);
    r.drain();
    assert.equal(r.mult, 1);
});
test("rampe : 1000 par passage, jackpot au troisième", () => {
    const r = new FlipperRules([], []);
    assert.equal(r.ramp(), false);
    assert.equal(r.ramp(), false);
    assert.equal(r.ramp(), true);
    assert.equal(r.score, 3 * 1000 + 5000);
});
test("roulette : tirage déterministe avec la graine, et chaque case est jouable", () => {
    const draw = (seed) => {
        const r = new FlipperRules([], [], new Rng(seed));
        return Array.from({ length: 12 }, () => r.roulette()).join(",");
    };
    assert.equal(draw(3), draw(3));
    assert.equal(ROULETTE.length, 8);
    const r = new FlipperRules([], [], new Rng(1));
    r.ballsLeft = 1;
    for (let i = 0; i < 80; i++)
        r.roulette();
    assert.ok(r.ballsLeft <= BALLS_PER_GAME + 2, "bille bonus plafonnée");
    assert.ok(r.score > 0);
});
test("voies : sortie latérale mieux payée que la voie d'entrée", () => {
    const r = new FlipperRules([], []);
    r.lane("inlane");
    r.lane("outlane");
    assert.equal(r.score, 600);
});
