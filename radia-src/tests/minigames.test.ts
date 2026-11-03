import { describe, it, expect } from 'vitest';
import { shuffle, swap, isSolved, minSwaps, correctCount, puzzleStars } from '../src/game/minigames/logic/puzzle';
import {
  makePathLevels, isConnected, applySolution, rotate, pullLever, pathAtoB, rotMask, N, E, S, W, PATH_SPECS,
} from '../src/game/minigames/logic/path';
import {
  makeWorld, shoot, step, settle, kineticEnergy, moving, CHALLENGES, BALL_R, TABLE_W, TABLE_H, MAX_SPEED, respawnCue, cue,
} from '../src/game/minigames/logic/billiard';

describe('puzzle', () => {
  it('le mélange n\'est jamais résolu et reste une permutation', () => {
    for (let seed = 1; seed < 300; seed++) {
      const p = shuffle(9, seed);
      expect(isSolved(p)).toBe(false);
      expect(correctCount(p)).toBeLessThanOrEqual(1);
      expect([...p].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    }
  });
  it('échanger selon les cycles résout en minSwaps coups', () => {
    const p = shuffle(9, 42);
    const best = minSwaps(p);
    let n = 0;
    for (let i = 0; i < 9; i++) {
      while (p[i] !== i) { const j = p.indexOf(i); expect(swap(p, i, j)).toBe(true); n++; }
    }
    expect(isSolved(p)).toBe(true);
    expect(n).toBe(best);
    expect(puzzleStars(n, best)).toBe(3);
  });
  it('les pièces bien placées sont verrouillées', () => {
    const p = [0, 2, 1];
    expect(swap(p, 0, 1)).toBe(false);
    expect(swap(p, 1, 1)).toBe(false);
    expect(swap(p, 1, 2)).toBe(true);
  });
});

describe('chemin des deux cœurs', () => {
  it('rotation des ouvertures', () => {
    expect(rotMask(N | S, 1)).toBe(E | W);
    expect(rotMask(N | E, 1)).toBe(E | S);
    expect(rotMask(N | E, 4)).toBe(N | E);
    expect(rotMask(W | N, 1)).toBe(N | E);
  });
  it('au moins 4 niveaux, mélangés (non reliés au départ) et solubles', () => {
    const levels = makePathLevels();
    expect(levels.length).toBeGreaterThanOrEqual(4);
    levels.forEach((lv, k) => {
      expect(isConnected(lv), `niveau ${k} déjà relié`).toBe(false);
      applySolution(lv);
      expect(isConnected(lv), `niveau ${k} insoluble`).toBe(true);
      expect(pathAtoB(lv)!.length).toBe(PATH_SPECS[k].path.length);
    });
  });
  it('résoluble par des touchers (rotations + leviers), difficulté croissante', () => {
    const levels = makePathLevels();
    let prevTaps = 0;
    levels.forEach((lv, k) => {
      let taps = 0;
      lv.tiles.forEach((t, i) => { if (t.lever !== undefined) { pullLever(lv, i); taps++; } });
      for (const [x, y] of PATH_SPECS[k].path.slice(1, -1)) {
        const i = y * lv.w + x;
        let guard = 0;
        while (rotMask(lv.tiles[i].base, lv.tiles[i].rot) !== lv.tiles[i].base && guard++ < 4) { expect(rotate(lv, i)).toBe(true); taps++; }
      }
      expect(isConnected(lv)).toBe(true);
      expect(taps).toBeGreaterThan(0);
      if (k > 0) expect(PATH_SPECS[k].path.length).toBeGreaterThanOrEqual(PATH_SPECS[k - 1].path.length);
      prevTaps = taps;
    });
    expect(prevTaps).toBeGreaterThan(0);
  });
  it('les ronces bloquent la connexion et ne tournent pas', () => {
    const lv = makePathLevels()[2];
    applySolution(lv);
    const lv2 = makePathLevels()[2];
    lv2.tiles.forEach((t, i) => { t.rot = lv2.solution[i]; });
    expect(isConnected(lv2)).toBe(false);
    const g = lv2.tiles.findIndex((t) => t.bramble !== undefined);
    expect(rotate(lv2, g)).toBe(false);
    expect(isConnected(lv)).toBe(true);
  });
});

describe('billard', () => {
  const total = (w: ReturnType<typeof makeWorld>) => w.balls.reduce((a, b) => ({ x: a.x + b.vx, y: a.y + b.vy }), { x: 0, y: 0 });

  it('l\'énergie ne fait que diminuer et les billes s\'arrêtent', () => {
    const w = makeWorld(CHALLENGES[2].balls);
    shoot(w, 0.1, -1, 1);
    let e = kineticEnergy(w);
    for (let i = 0; i < 120 * 20 && moving(w); i++) {
      step(w);
      const e2 = kineticEnergy(w);
      expect(e2).toBeLessThanOrEqual(e + 1e-6);
      e = e2;
    }
    expect(moving(w)).toBe(false);
  });

  it('pas d\'effet tunnel à pleine puissance (aucune bille ne sort sans poche)', () => {
    for (let a = 0; a < 64; a++) {
      const w = makeWorld([{ id: 0, kind: 'cue', x: 150, y: 260 }, { id: 1, kind: 'heart', x: 150, y: 150 }]);
      w.events = [];
      shoot(w, Math.cos(a / 10), Math.sin(a / 10), 1);
      settle(w);
      for (const b of w.balls) {
        if (b.pocketed) continue;
        expect(b.x).toBeGreaterThanOrEqual(BALL_R - 0.01);
        expect(b.x).toBeLessThanOrEqual(TABLE_W - BALL_R + 0.01);
        expect(b.y).toBeGreaterThanOrEqual(BALL_R - 0.01);
        expect(b.y).toBeLessThanOrEqual(TABLE_H - BALL_R + 0.01);
      }
      // ne traverse pas l'autre bille : choc enregistré si visée directe
    }
    const w = makeWorld([{ id: 0, kind: 'cue', x: 150, y: 400 }, { id: 1, kind: 'heart', x: 150, y: 300 }]);
    shoot(w, 0, -1, 1);
    for (let i = 0; i < 30; i++) step(w);
    expect(w.events.some((e) => e.t === 'hit')).toBe(true);
    expect(MAX_SPEED).toBeGreaterThan(0);
  });

  it('un choc conserve (à peu près) la quantité de mouvement', () => {
    const w = makeWorld([{ id: 0, kind: 'cue', x: 150, y: 300 }, { id: 1, kind: 'heart', x: 155, y: 270 }]);
    shoot(w, 0.1, -1, 0.5);
    const p0 = total(w);
    // un seul pas où le choc a lieu, sans frottement significatif
    let p1 = p0;
    for (let i = 0; i < 20; i++) {
      step(w);
      if (w.events.some((e) => e.t === 'hit')) { p1 = total(w); break; }
    }
    expect(w.events.some((e) => e.t === 'hit')).toBe(true);
    expect(Math.abs(p1.x - p0.x)).toBeLessThan(Math.hypot(p0.x, p0.y) * 0.05);
    expect(Math.abs(p1.y - p0.y)).toBeLessThan(Math.hypot(p0.x, p0.y) * 0.05);
  });

  it('défi 1 réalisable : tir droit sur la bille cœur → empochée', () => {
    const w = makeWorld(CHALLENGES[0].balls);
    shoot(w, -75, -210, 0.75);
    settle(w);
    expect(w.balls.find((b) => b.id === 1)!.pocketed || w.balls.find((b) => b.id === 2)!.pocketed).toBe(true);
  });

  it('chaque défi est réussissable par une recherche de tirs', () => {
    CHALLENGES.forEach((ch, k) => {
      // recherche gloutonne : à chaque coup, le meilleur angle/puissance
      let w = makeWorld(ch.balls);
      let shots = 0;
      const max = ch.maxShots ?? 5;
      const potted = (x: typeof w) => x.balls.filter((b) => b.kind === ch.need.kind && b.pocketed).length;
      while (potted(w) < ch.need.count && shots < max) {
        let best: typeof w | null = null;
        let bestScore = -1;
        for (let a = 0; a < 180; a++) {
          for (const p of [0.45, 0.7, 0.95]) {
            const t = JSON.parse(JSON.stringify(w)) as typeof w;
            const ang = (a / 180) * Math.PI * 2;
            shoot(t, Math.cos(ang), Math.sin(ang), p);
            settle(t);
            respawnCue(t);
            const sc = potted(t) * 10 - (cue(t).pocketed ? 1 : 0);
            if (sc > bestScore) { bestScore = sc; best = t; }
          }
        }
        w = best!;
        shots++;
      }
      expect(potted(w), `défi ${k}`).toBeGreaterThanOrEqual(ch.need.count);
    });
  }, 60_000);
});
