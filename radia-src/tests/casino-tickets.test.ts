import { describe, it, expect, beforeEach, vi } from 'vitest';
import { save } from '../src/core/app';
import { defaultSave } from '../src/save/schema';
import { defaultFun } from '../src/save/fun';
import { welcome, WELCOME_CHIPS, CHIP_CAP, grant } from '../src/casino/chips';
import {
  ACHIEVEMENT_TICKETS, DAILY_CAPS, DAILY_TASKS, DAILY_TASKS_TOTAL, ENDLESS_STAGE_TICKETS, awardAchievement, claimTask, claimableTasks, dayNum,
  earn, earnedToday, endlessTicketsFor, markTask, remainingToday, sourceOf, taskClaimed, taskDone, ticketsLabel,
} from '../src/casino/tickets';
import { grantChips } from '../src/casino/store';
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

describe('tickets : sources et plafonds', () => {
  it('allocation d\'ouverture gratuite, une seule fois', () => {
    const s = fresh();
    expect(welcome(s)).toBe(WELCOME_CHIPS); expect(welcome(s)).toBe(0);
  });
  it('les sources ouvertes sont plafonnées par jour et le plafond repart le lendemain', () => {
    const s = fresh();
    expect(earn(s, 'endless', 300, D1)).toBe(300);
    expect(earn(s, 'endless', 300, D1)).toBe(100); // 400 au total
    expect(earn(s, 'endless', 50, D1)).toBe(0);
    expect(earnedToday(s, 'endless', D1)).toBe(DAILY_CAPS.endless);
    expect(remainingToday(s, 'endless', D1)).toBe(0);
    expect(earn(s, 'endless', 50, D2)).toBe(50);
    expect(remainingToday(s, 'daily', D1)).toBe(Infinity); // cadeaux quotidiens et roue : déjà limités à un par jour
    expect(s.chips).toBe(300 + 100 + 50);
  });
  it('jamais négatif, valeurs folles ignorées, jamais au-delà du plafond de solde', () => {
    const s = fresh();
    for (const n of [-5, NaN, Infinity, 0, 0.4]) expect(earn(s, 'event', n)).toBe(0);
    expect(s.chips).toBe(0);
    s.chips = CHIP_CAP - 10;
    expect(grant(s, 1e12)).toBe(10);
    expect(s.chips).toBe(CHIP_CAP);
  });
  it('raisons libres → sources (la roue, le cadeau du jour, inconnu = événement plafonné)', () => {
    expect(sourceOf('roue du jour')).toBe('wheel'); expect(sourceOf('wheel')).toBe('wheel'); expect(sourceOf('daily')).toBe('daily');
    expect(sourceOf('truc')).toBe('event'); expect(sourceOf('')).toBe('event');
  });
  it('grantChips (jeu réel) passe par les sources et les plafonds', () => {
    expect(grantChips(500, 'event')).toBe(500);
    expect(grantChips(500, 'event')).toBe(100); // plafond 600
    expect(grantChips(250, 'daily')).toBe(250);
    expect(save.data.fun.casino.chips).toBe(850);
  });
  it('libellé : singulier / pluriel', () => { expect(ticketsLabel(1)).toBe('1 ticket'); expect(ticketsLabel(250)).toMatch(/250 tickets/); });
  it('numéro de jour local', () => { expect(dayNum(D1)).toBe(20261104); });
});

describe('tickets : jamais achetables, ni convertibles', () => {
  // sources du casino et de la roue lues en texte brut
  const raw = import.meta.glob('../src/{casino,wheel}/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const files = Object.keys(raw);
  const readFileSync = (f: string, _e?: string): string => raw[f];
  it('sources chargées', () => { expect(files.length).toBeGreaterThan(20); });
  it('aucun fichier du casino ou de la roue ne débite pièces, diamants ou énergie', () => {
    for (const f of files) {
      const t = readFileSync(f, 'utf8');
      expect(t, f).not.toMatch(/spendRes|spendMany|spendDiamonds|spendEnergy|wallet\.(spend|buy)|\.economy\.diamonds\s*-=|res\.coins\s*-=/);
    }
  });
  it('aucune mention d\'argent réel, d\'achat ou de conversion dans les textes', () => {
    for (const f of files) {
      const t = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');
      expect(t, f).not.toMatch(/€|euros?\b|\bdollars?\b|acheter|achat de tickets|payer|boutique|carte bancaire|in-app/i);
    }
  });
  it('l\'UI parle de « tickets » (plus de « jetons »)', () => {
    for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(/jeton/i);
  });
  it('les lots de la roue donnent des tickets gratuits, jamais en échange de quoi que ce soit', () => {
    const calls: number[] = [];
    const ctx = { addCoins() {}, giveDiamonds() {}, giveEnergy() {}, grantChips: (n: number) => calls.push(n), ownsCloth: () => false, giveCloth() {}, ownsDeco: () => false, giveDeco() {}, addFragment() {} };
    for (const l of LOTS.filter((x) => x.kind === 'chips')) { const g = applyLot(l, ctx, seededRng(1)); expect(g.text).toMatch(/tickets du Casino Royal/); }
    expect(calls).toEqual([200, 600]);
  });
});

describe('mini-défis du jour (sans hasard)', () => {
  it('total des défis sous le plafond « challenge »', () => { expect(DAILY_TASKS_TOTAL).toBeLessThanOrEqual(DAILY_CAPS.challenge!); });
  it('accomplir puis réclamer : une seule fois par jour', () => {
    const s = fresh();
    expect(claimTask(s, 'visit', D1)).toBe(0); // pas encore accompli
    markTask(s, 'visit', D1); markTask(s, 'visit', D1);
    expect(taskDone(s, 'visit', D1)).toBe(true); expect(claimableTasks(s, D1)).toBe(1);
    expect(claimTask(s, 'visit', D1)).toBe(30);
    expect(claimTask(s, 'visit', D1)).toBe(0);
    expect(taskClaimed(s, 'visit', D1)).toBe(true); expect(s.chips).toBe(30);
  });
  it('le lendemain tout repart (et on peut en refaire autant)', () => {
    const s = fresh();
    for (const t of DAILY_TASKS) { markTask(s, t.id, D1); claimTask(s, t.id, D1); }
    expect(s.chips).toBe(DAILY_TASKS_TOTAL);
    expect(taskDone(s, 'visit', D2)).toBe(false);
    for (const t of DAILY_TASKS) { markTask(s, t.id, D2); claimTask(s, t.id, D2); }
    expect(s.chips).toBe(DAILY_TASKS_TOTAL * 2);
  });
  it('un défi réclamé hors jour courant ne donne rien (état d\'un autre jour)', () => {
    const s = fresh(); markTask(s, 'rules', D1);
    expect(claimTask(s, 'rules', D2)).toBe(0);
  });
});

describe('succès : récompense unique en tickets, conditions inchangées', () => {
  it('awardAchievement verse une seule fois par succès', () => {
    const s = fresh();
    expect(awardAchievement(s, 'first_spark')).toBe(ACHIEVEMENT_TICKETS);
    expect(awardAchievement(s, 'first_spark')).toBe(0);
    expect(awardAchievement(s, 'combo_queen')).toBe(ACHIEVEMENT_TICKETS);
    expect(awardAchievement(undefined, 'x')).toBe(0);
  });
  it('le crochet de `check` verse au déblocage et jamais deux fois, sans changer le résultat', () => {
    const a = ACHIEVEMENTS.find((x) => x.id === 'first_spark')!;
    const sd = defaultSave();
    expect(a.check(sd)).toBe(false); expect(sd.fun.casino.chips).toBe(0);
    sd.stats.merges = 1;
    expect(a.check(sd)).toBe(true); expect(sd.fun.casino.chips).toBe(ACHIEVEMENT_TICKETS);
    expect(a.check(sd)).toBe(true); expect(sd.fun.casino.chips).toBe(ACHIEVEMENT_TICKETS); // rejoué : pas de double comptage
  });
  it('un jeu de sauvegarde sans `fun` ne fait pas planter la vérification', () => {
    const a = ACHIEVEMENTS.find((x) => x.id === 'first_spark')!;
    const sd = defaultSave(); sd.stats.merges = 3; (sd as { fun?: unknown }).fun = undefined;
    expect(() => a.check(sd)).not.toThrow();
  });
});

describe('Endless → tickets : paliers sans double comptage', () => {
  it('endlessTicketsFor : simule exactement les paliers franchis', () => {
    const goals = [6, 15, 30];
    expect(endlessTicketsFor({ id: 'x', progress: 0, goal: 6, stage: 0 }, goals, 1)).toEqual({ stages: 0, tickets: 0 });
    expect(endlessTicketsFor({ id: 'x', progress: 5, goal: 6, stage: 0 }, goals, 1)).toEqual({ stages: 1, tickets: ENDLESS_STAGE_TICKETS[0] });
    expect(endlessTicketsFor({ id: 'x', progress: 29, goal: 30, stage: 2 }, goals, 5)).toEqual({ stages: 1, tickets: ENDLESS_STAGE_TICKETS[2] }); // défi terminé : une seule fois
    expect(endlessTicketsFor({ id: 'x', progress: 0, goal: 6, stage: 0 }, goals, 100).stages).toBe(3);
    expect(endlessTicketsFor({ id: 'x', progress: 0, goal: 6, stage: 0 }, goals, 0)).toEqual({ stages: 0, tickets: 0 });
    expect(endlessTicketsFor({ id: 'x', progress: 0, goal: 6, stage: 0 }, [], 3).tickets).toBe(0);
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
      got += endlessTicketsFor(sec, goals, inc).stages;
      const out = onEngineEvent(fun, ev);
      expectedStages += out.filter((e) => e.t === 'secondary' && e.done).length;
    }
    expect(got).toBe(expectedStages);
    expect(got).toBeGreaterThanOrEqual(3);
  });
  it('noteSecondaryEvent : un même événement n\'est compté qu\'une fois, source plafonnée', () => {
    syncSecondary(save.data.fun);
    save.data.fun.endless2.sec = [{ id: 'mergeChallenges', progress: 5, goal: 6, stage: 0 }];
    const ev = { t: 'comboTier', tier: 0 };
    const goals = secDef('mergeChallenges')!.stages.map((s) => s.goal);
    expect(noteSecondaryEvent('mergeChallenges', goals, 1, ev)).toBe(ENDLESS_STAGE_TICKETS[0]);
    expect(noteSecondaryEvent('mergeChallenges', goals, 1, ev)).toBe(0); // rejoué
    expect(noteSecondaryEvent('mergeChallenges', goals, 0, { t: 'x' })).toBe(0);
    expect(noteSecondaryEvent('inconnu', goals, 1, { t: 'y' })).toBe(0);
    // plafond du jour
    let total = ENDLESS_STAGE_TICKETS[0];
    for (let i = 0; i < 40; i++) { save.data.fun.endless2.sec = [{ id: 'mergeChallenges', progress: 5, goal: 6, stage: 0 }]; total += noteSecondaryEvent('mergeChallenges', goals, 1, { t: 'z', i }); }
    expect(total).toBe(DAILY_CAPS.endless);
    expect(save.data.fun.casino.chips).toBe(DAILY_CAPS.endless);
  });
  it('toutes les définitions d\'événements restent branchables', () => { expect(SEC_DEFS.length).toBeGreaterThanOrEqual(6); });
});
