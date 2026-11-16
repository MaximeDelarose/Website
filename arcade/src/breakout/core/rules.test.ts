import { test } from "node:test";
import assert from "node:assert/strict";
import { BreakoutRules, parseLevel, MAX_LEVELS, START_LIVES, type LevelData } from "./rules.js";
import { Rng } from "../../shared/rng.js";

const SIMPLE: LevelData = { name: "t", rows: ["12X.......", ".........."] };
const LEVELS: LevelData[] = Array.from({ length: MAX_LEVELS }, (_, i) => ({ name: `n${i}`, rows: ["1...", "...."] }));

test("parseLevel : chaque caractère donne la bonne brique", () => {
  const bricks = parseLevel(SIMPLE);
  assert.equal(bricks.length, 3);
  assert.deepEqual(bricks.find((b) => b.col === 0)?.hits, 1);
  assert.deepEqual(bricks.find((b) => b.col === 1)?.hits, 2);
  assert.equal(bricks.find((b) => b.col === 2)?.indestructible, true);
});

test("brique à 2 coups : un coup ne rapporte rien, le second rapporte 20", () => {
  const r = new BreakoutRules([SIMPLE, ...LEVELS.slice(1)], new Rng(1), 0);
  assert.equal(r.hit(0, 1), false);
  assert.equal(r.score, 0);
  assert.equal(r.hit(0, 1), true);
  assert.equal(r.score, 20);
});

test("indestructible : aucun effet", () => {
  const r = new BreakoutRules([SIMPLE], new Rng(1), 0);
  assert.equal(r.hit(0, 2), false);
  assert.equal(r.score, 0);
  assert.equal(r.remaining, 2);
});

test("niveau terminé : bonus et passage au niveau suivant", () => {
  const r = new BreakoutRules(LEVELS, new Rng(1), 0);
  r.hit(0, 0);
  assert.equal(r.level, 2);
  assert.equal(r.score, 10 + 100);
  assert.equal(r.bricks.length, 1);
});

test("trois vies puis fin de partie", () => {
  const r = new BreakoutRules(LEVELS, new Rng(1), 0);
  for (let i = 0; i < START_LIVES; i++) r.loseLife();
  assert.equal(r.lives, 0);
  assert.equal(r.over, true);
  assert.equal(r.flush().at(-1)?.type, "gameover");
});

test("dix niveaux puis victoire", () => {
  const r = new BreakoutRules(LEVELS, new Rng(1), 0);
  for (let i = 0; i < MAX_LEVELS; i++) r.hit(0, 0); // chaque niveau n'a qu'une brique
  assert.equal(r.won, true);
  assert.equal(r.over, true);
  assert.equal(r.flush().at(-1)?.type, "win");
});

test("tirage des bonus : même graine, mêmes bonus", () => {
  const drops = (seed: number) => {
    const r = new BreakoutRules(LEVELS, new Rng(seed), 1);
    const out: string[] = [];
    for (let i = 0; i < 4; i++) {
      r.bricks = parseLevel(LEVELS[0]);
      r.hit(0, 0);
      out.push(...r.flush().filter((e) => e.type === "drop").map((e) => (e as { power: string }).power));
    }
    return out.join(",");
  };
  assert.equal(drops(5), drops(5));
});
