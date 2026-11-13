import { test } from "node:test";
import assert from "node:assert/strict";
import { BALL_R, BASE_PADDLE_W, BreakoutWorld, FIELD_H, FIELD_W, PADDLE_H, PADDLE_Y, brickRect, speedFor } from "./world.js";
import { MAX_LEVELS, START_LIVES } from "./rules.js";
const mk = (rows) => ({ name: "t", rows });
const LEVELS = (first) => Array.from({ length: MAX_LEVELS }, (_, i) => mk(i === 0 ? first : ["1........."]));
const free = (x, y, vx, vy) => ({ x, y, vx, vy, stuck: false, stuckDx: 0 });
const run = (w, n) => {
    const out = [];
    for (let i = 0; i < n; i++)
        out.push(...w.step());
    return out;
};
test("la balle rebondit sur le mur gauche à vitesse constante", () => {
    const w = new BreakoutWorld(LEVELS(["1........."]), 1, 0);
    w.balls = [free(20, 300, -w.speed * 0.8, -w.speed * 0.6)];
    run(w, 6);
    assert.ok(w.balls[0].vx > 0, "elle repart vers la droite");
    assert.ok(Math.abs(Math.hypot(w.balls[0].vx, w.balls[0].vy) - w.speed) < 1e-6, "vitesse constante");
});
test("raquette : l'angle dépend du point d'impact", () => {
    const hit = (offset) => {
        const w = new BreakoutWorld(LEVELS(["1........."]), 1, 0);
        w.balls = [free(w.paddleX + offset, PADDLE_Y - PADDLE_H / 2 - BALL_R - 4, 0, 5)];
        run(w, 3);
        return w.balls[0];
    };
    const center = hit(0);
    const right = hit(BASE_PADDLE_W / 2 - 4);
    const left = hit(-(BASE_PADDLE_W / 2 - 4));
    assert.ok(center.vy < 0 && Math.abs(center.vx) < 0.2 * Math.abs(center.vy), "au centre : presque vertical");
    assert.ok(right.vx > 2, "bord droit : part vers la droite");
    assert.ok(left.vx < -2, "bord gauche : part vers la gauche");
});
test("une brique touchée est détruite et rapporte des points", () => {
    const w = new BreakoutWorld(LEVELS(["....1....."]), 1, 0);
    const r = brickRect(0, 4);
    w.balls = [free(r.x, r.y + 40, 0, -6)];
    const events = run(w, 20);
    assert.equal(w.rules.score, 10 + 100, "10 points + bonus de niveau (c'était la dernière brique)");
    assert.ok(events.some((e) => e.type === "brick" && e.destroyed));
    assert.ok(events.some((e) => e.type === "levelClear"));
});
test("brique indestructible : rebond sans dégât", () => {
    const w = new BreakoutWorld(LEVELS(["....X....1"]), 1, 0);
    const r = brickRect(0, 4);
    w.balls = [free(r.x, r.y + 40, 0, -6)];
    const events = run(w, 12);
    assert.equal(w.rules.score, 0);
    assert.ok(events.some((e) => e.type === "brick" && e.indestructible));
    assert.ok(w.balls[0].vy > 0, "la balle repart vers le bas");
});
test("balle perdue : une vie en moins et une nouvelle balle collée", () => {
    const w = new BreakoutWorld(LEVELS(["1........."]), 1, 0);
    w.balls = [free(20, FIELD_H + 40, 0, 6)];
    const events = run(w, 3);
    assert.equal(w.rules.lives, START_LIVES - 1);
    assert.ok(events.some((e) => e.type === "lifeLost"));
    assert.equal(w.balls.length, 1);
    assert.equal(w.balls[0].stuck, true);
});
test("lancer : la balle collée part vers le haut", () => {
    const w = new BreakoutWorld(LEVELS(["1........."]), 1, 0);
    w.fire();
    run(w, 2);
    assert.equal(w.balls[0].stuck, false);
    assert.ok(w.balls[0].vy < 0);
});
test("laser : détruit une brique en ligne", () => {
    const w = new BreakoutWorld(LEVELS(["....1....."]), 1, 0);
    w.timers.laser = 100;
    w.balls[0].stuck = false;
    w.balls[0].vy = 0;
    w.balls[0].vx = 0;
    w.balls[0].y = 400;
    const r = brickRect(0, 4);
    w.moveTo(r.x + (w.paddleW / 2 - 8)); // le laser gauche part pile sous la brique
    run(w, 12);
    w.fire();
    const events = run(w, 80);
    assert.ok(events.some((e) => e.type === "levelClear" || (e.type === "brick" && e.destroyed)));
});
test("bonus collant : la balle reste sur la raquette puis part au tir", () => {
    const w = new BreakoutWorld(LEVELS(["1........."]), 1, 0);
    w.timers.sticky = 500;
    w.balls = [free(w.paddleX + 10, PADDLE_Y - PADDLE_H / 2 - BALL_R - 3, 1, 5)];
    run(w, 3);
    assert.equal(w.balls[0].stuck, true);
    w.fire();
    run(w, 2);
    assert.equal(w.balls[0].stuck, false);
});
test("vitesse : croît avec le niveau et reste plafonnée", () => {
    assert.ok(speedFor(2) > speedFor(1));
    assert.ok(speedFor(99) <= 10);
});
test("déterminisme : même graine et mêmes entrées, même partie", () => {
    const play = (seed) => {
        const w = new BreakoutWorld(LEVELS(["1111111111", "2222222222"]), seed, 0.5);
        const log = [];
        w.fire();
        for (let i = 0; i < 600; i++) {
            w.moveTo(FIELD_W / 2 + Math.sin(i / 20) * 150);
            for (const e of w.step())
                log.push(e.type);
        }
        return `${w.rules.score}|${w.rules.lives}|${log.join(",")}`;
    };
    assert.equal(play(7), play(7));
});
