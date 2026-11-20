import { describe, it, expect, beforeEach, vi } from 'vitest';
import { save } from '../src/core/app';
import { defaultSave } from '../src/save/schema';
import { defaultFun } from '../src/save/fun';
import { welcome, WELCOME_COINS } from '../src/casino/chips';
import {
  ACHIEVEMENT_COINS, DAILY_CAPS, DAILY_TASKS, DAILY_TASKS_TOTAL, ENDLESS_STAGE_COINS, allow, awardAchievement, claimTask, claimableTasks, dayNum,
  earnedToday, endlessCoinsFor, markTask, remainingToday, sourceOf, taskClaimed, taskDone,
} from '../src/casino/rewards';
import { grantCoins } from '../src/casino/store';
import { noteSecondaryEvent } from '../src/casino/endlessHook';
import { SEC_DEFS, onEngineEvent, syncSecondary, secDef } from '../src/game/endless/secondary';
import { ACHIEVEMENTS } from '../src/data/achievements';
import { applyLot } from '../src/wheel/logic';
import { LOTS } from '../src/wheel/table';
import { seededRng } from '../src/casino/rng';

vi.mock('../src/audio/AudioManager', () => ({ AudioManager: class {}, audio: { play() {}, setSettings() {} } }));
vi.stubGlobal('window', globalThis);

const fresh = () => defaultFun().casino;
const D1 = new Date(2026, 10, 4, 10), D2 = new Date(2026, 10, 5, 10);

beforeEach(() => { save.data = defaultSave(); });

describe('gains gratuits en pièces : sources et plafonds', () => {
  it('cadeau d\'ouverture gratuit, une seule fois', () => {
    const s = fresh();
    expect(welcome(s)).toBe(WELCOME_COINS); expect(welcome(s)).toBe(0);
  });
  it('les sources ouvertes sont plafonnées par jour et le plafond repart le lendemain', () => {
    const s = fresh(); const cap = DAILY_CAPS.endless!;
    expect(allow(s, 'endless', cap - 100, D1)).toBe(cap - 100);
    expect(allow(s, 'endless', 300, D1)).toBe(100);
    expect(allow(s, 'endless', 50, D1)).toBe(0);
    expect(earnedToday(s, 'endless', D1)).toBe(cap);
    expect(remainingToday(s, 'endless', D1)).toBe(0);
    expect(allow(s, 'endless', 50, D2)).toBe(50);
    expect(remainingToday(s, 'daily', D1)).toBe(Infinity); // cadeaux quotidiens et roue : déjà limités à un par jour
  });
  it('jamais négatif, valeurs folles ignorées', () => {
    const s = fresh();
    for (const n of [-5, NaN, Infinity, 0, 0.4]) expect(allow(s, 'event', n)).toBe(0);
  });
  it('raisons libres → sources (la roue, le cadeau du jour, inconnu = événement plafonné)', () => {
    expect(sourceOf('roue du jour')).toBe('wheel'); expect(sourceOf('wheel')).toBe('wheel'); expect(sourceOf('daily')).toBe('daily');
    expect(sourceOf('truc')).toBe('event'); expect(sourceOf('')).toBe('event');
  });
  it('grantCoins (jeu réel) crédite le portefeuille unique, par les sources et les plafonds', () => {
    const c0 = save.data.world.res.coins; const cap = DAILY_CAPS.event!;
    expect(grantCoins(cap - 100, 'event')).toBe(cap - 100);
    expect(grantCoins(500, 'event')).toBe(100); // plafond du jour
    expect(grantCoins(250, 'daily')).toBe(250);
    expect(save.data.world.res.coins).toBe(c0 + cap + 250);
  });
  it('numéro de jour local', () => { expect(dayNum(D1)).toBe(20261104); });
});

describe('pièces du casino : jamais achetables avec de l\'argent réel', () => {
  // sources du casino et de la roue lues en texte brut
  const raw = import.meta.glob('../src/{casino,wheel}/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const files = Object.keys(raw);
  const readFileSync = (f: string, _e?: string): string => raw[f];
  it('sources chargées', () => { expect(files.length).toBeGreaterThan(20); });
  it('aucun fichier du casino ou de la roue ne débite diamants ou énergie ; les pièces ne se dépensent que par les mises et les privilèges', () => {
    for (const f of files) {
      const t = readFileSync(f, 'utf8');
      expect(t, f).not.toMatch(/spendDiamonds|spendEnergy|wallet\.(spend|buy)|\.economy\.diamonds\s*-=/);
      if (!f.endsWith('casino/privileges.ts')) expect(t, f).not.toMatch(/res\.coins\s*-=/);
    }
  });
  it('aucune mention d\'argent réel, d\'achat ou de paiement dans les textes', () => {
    for (const f of files) {
      const t = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');
      expect(t, f).not.toMatch(/€|euros?\b|\bdollars?\b|acheter|payer|boutique|carte bancaire|in-app/i);
    }
  });
  it('plus aucun ticket dans le casino ni dans la roue (code et textes)', () => {
    for (const f of files) {
      const t = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');
      expect(t, f).not.toMatch(/ticket|exchange|bring|refill/i);
    }
  });
  it('les lots de la roue : plus aucun ticket, pièces dorées comme icône', () => {
    for (const l of LOTS) { expect(l.kind, l.id).not.toBe('chips' as never); expect(l.name.toLowerCase(), l.id).not.toMatch(/ticket/); expect(l.emoji, l.id).not.toBe('🪙'); }
    const calls: number[] = [];
    const ctx = { addCoins: (n: number) => calls.push(n), giveDiamonds() {}, giveEnergy() {}, ownsCloth: () => false, giveCloth() {}, ownsDeco: () => false, giveDeco() {}, addFragment() {} };
    for (const l of LOTS.filter((x) => x.kind === 'coins')) { const g = applyLot(l, ctx, seededRng(1)); expect(g.text).toMatch(/pièces/); }
    expect(calls).toEqual([100, 300, 600]);
  });
});

describe('mini-défis du jour (sans hasard)', () => {
  it('total des défis sous le plafond « challenge »', () => { expect(DAILY_TASKS_TOTAL).toBeLessThanOrEqual(DAILY_CAPS.challenge!); });
  it('accomplir puis réclamer : une seule fois par jour', () => {
    const s = fresh();
    expect(claimTask(s, 'visit', D1)).toBe(0); // pas encore accompli
    markTask(s, 'visit', D1); markTask(s, 'visit', D1);
    expect(taskDone(s, 'visit', D1)).toBe(true); expect(claimableTasks(s, D1)).toBe(1);
    expect(claimTask(s, 'visit', D1)).toBe(40);
    expect(claimTask(s, 'visit', D1)).toBe(0);
    expect(taskClaimed(s, 'visit', D1)).toBe(true);
  });
  it('le lendemain tout repart (et on peut en refaire autant)', () => {
    const s = fresh();
    let sum = 0;
    for (const t of DAILY_TASKS) { markTask(s, t.id, D1); sum += claimTask(s, t.id, D1); }
    expect(sum).toBe(DAILY_TASKS_TOTAL);
    expect(taskDone(s, 'visit', D2)).toBe(false);
    for (const t of DAILY_TASKS) { markTask(s, t.id, D2); sum += claimTask(s, t.id, D2); }
    expect(sum).toBe(DAILY_TASKS_TOTAL * 2);
  });
  it('un défi réclamé hors jour courant ne donne rien (état d\'un autre jour)', () => {
    const s = fresh(); markTask(s, 'rules', D1);
    expect(claimTask(s, 'rules', D2)).toBe(0);
  });
});

describe('succès : récompense unique en pièces, conditions inchangées', () => {
  it('awardAchievement verse une seule fois par succès', () => {
    const s = fresh();
    expect(awardAchievement(s, 'first_spark')).toBe(ACHIEVEMENT_COINS);
    expect(awardAchievement(s, 'first_spark')).toBe(0);
    expect(awardAchievement(s, 'combo_queen')).toBe(ACHIEVEMENT_COINS);
    expect(awardAchievement(undefined, 'x')).toBe(0);
  });
  it('le crochet de `check` verse au déblocage et jamais deux fois, sans changer le résultat', () => {
    const a = ACHIEVEMENTS.find((x) => x.id === 'first_spark')!;
    const sd = defaultSave(); const c0 = sd.world.res.coins;
    expect(a.check(sd)).toBe(false); expect(sd.world.res.coins).toBe(c0);
    sd.stats.merges = 1;
    expect(a.check(sd)).toBe(true); expect(sd.world.res.coins).toBe(c0 + ACHIEVEMENT_COINS);
    expect(a.check(sd)).toBe(true); expect(sd.world.res.coins).toBe(c0 + ACHIEVEMENT_COINS); // rejoué : pas de double comptage
  });
  it('un jeu de sauvegarde sans `fun` ne fait pas planter la vérification', () => {
    const a = ACHIEVEMENTS.find((x) => x.id === 'first_spark')!;
    const sd = defaultSave(); sd.stats.merges = 3; (sd as { fun?: unknown }).fun = undefined;
    expect(() => a.check(sd)).not.toThrow();
  });
});

describe('Endless → pièces : paliers sans double comptage', () => {
  it('endlessCoinsFor : simule exactement les paliers franchis', () => {
    const goals = [6, 15, 30];
    expect(endlessCoinsFor({ id: 'x', progress: 0, goal: 6, stage: 0 }, goals, 1)).toEqual({ stages: 0, coins: 0 });
    expect(endlessCoinsFor({ id: 'x', progress: 5, goal: 6, stage: 0 }, goals, 1)).toEqual({ stages: 1, coins: ENDLESS_STAGE_COINS[0] });
    expect(endlessCoinsFor({ id: 'x', progress: 29, goal: 30, stage: 2 }, goals, 5)).toEqual({ stages: 1, coins: ENDLESS_STAGE_COINS[2] }); // défi terminé : une seule fois
    expect(endlessCoinsFor({ id: 'x', progress: 0, goal: 6, stage: 0 }, goals, 100).stages).toBe(3);
    expect(endlessCoinsFor({ id: 'x', progress: 0, goal: 6, stage: 0 }, goals, 0)).toEqual({ stages: 0, coins: 0 });
    expect(endlessCoinsFor({ id: 'x', progress: 0, goal: 6, stage: 0 }, [], 3).coins).toBe(0);
  });
  it('concordance avec le vrai moteur (onEngineEvent) sur une partie simulée', () => {
    const fun = defaultFun();
    fun.endless2.sec = [{ id: 'mergeChallenges', progress: 0, goal: secDef('mergeChallenges')!.stages[0].goal, stage: 0 }];
    const d = secDef('mergeChallenges')!;
    const goals = d.stages.map((s) => s.goal);
    let expectedStages = 0, got = 0;
    for (let i = 0; i < 80; i++) {
      const ev = { t: 'comboTier', tier: 0 } as never;
      const sec = fun.endless2.sec.find((s) => s.id === 'mergeChallenges');
      if (!sec) break;
      const inc = d.advance(ev);
      got += endlessCoinsFor(sec, goals, inc).stages;
      const out = onEngineEvent(fun, ev);
      expectedStages += out.filter((e) => e.t === 'secondary' && e.done).length;
    }
    expect(got).toBe(expectedStages);
    expect(got).toBeGreaterThanOrEqual(3);
  });
  it('noteSecondaryEvent : un même événement n\'est compté qu\'une fois, source plafonnée', () => {
    syncSecondary(save.data.fun); const c0 = save.data.world.res.coins;
    save.data.fun.endless2.sec = [{ id: 'mergeChallenges', progress: 5, goal: 6, stage: 0 }];
    const ev = { t: 'comboTier', tier: 0 };
    const goals = secDef('mergeChallenges')!.stages.map((s) => s.goal);
    expect(noteSecondaryEvent('mergeChallenges', goals, 1, ev)).toBe(ENDLESS_STAGE_COINS[0]);
    expect(noteSecondaryEvent('mergeChallenges', goals, 1, ev)).toBe(0); // rejoué
    expect(noteSecondaryEvent('mergeChallenges', goals, 0, { t: 'x' })).toBe(0);
    expect(noteSecondaryEvent('inconnu', goals, 1, { t: 'y' })).toBe(0);
    // plafond du jour
    let total = ENDLESS_STAGE_COINS[0];
    for (let i = 0; i < 40; i++) { save.data.fun.endless2.sec = [{ id: 'mergeChallenges', progress: 5, goal: 6, stage: 0 }]; total += noteSecondaryEvent('mergeChallenges', goals, 1, { t: 'z', i }); }
    expect(total).toBe(DAILY_CAPS.endless);
    expect(save.data.world.res.coins).toBe(c0 + DAILY_CAPS.endless!); // versées dans le portefeuille unique
  });
  it('toutes les définitions d\'événements restent branchables', () => { expect(SEC_DEFS.length).toBeGreaterThanOrEqual(6); });
});
