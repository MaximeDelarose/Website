import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { COMBO_HOLD_MS, __setClock, comboNote, comboTick, currentRecap, endComboNow, isBoardBusy, isComboBusy, onBoardBusyChange, onComboEnd, resetComboState, setDragging } from '../src/game/fx/comboState';
import { comboIntensity, comboParticleBonus, comboPopLabel } from '../src/game/fx/feel';
import { NotifyCore, type NotifyItem } from '../src/ui/notify/core';

let t = 0;
beforeEach(() => { vi.useFakeTimers(); t = 1_000_000; __setClock(() => t); resetComboState(); });
afterEach(() => { resetComboState(); __setClock(null); vi.useRealTimers(); });
const advance = (ms: number): void => { t += ms; vi.advanceTimersByTime(ms); };

describe('indicateur de combo : libellés', () => {
  it('« Combo x3 ! », « Combo x5 ! », « Super combo x10 ! » (+ total de points de la chaîne)', () => {
    expect(comboPopLabel(3)).toBe('Combo x3 !');
    expect(comboPopLabel(5)).toBe('Combo x5 !');
    expect(comboPopLabel(10)).toBe('Super combo x10 !');
    expect(comboPopLabel(5, 120)).toBe('Combo x5 ! · +120');
    expect(comboPopLabel(7)).toBe('Combo x7 !');
    expect(comboPopLabel(8)).toBe('Super combo x8 !');
  });
  it('les effets montent avec le combo sans jamais devenir envahissants (particules +50 % au plus)', () => {
    expect([1, 2, 4, 5, 7, 8, 11, 12, 30].map(comboIntensity)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
    for (let v = 1; v < 40; v++) { expect(comboParticleBonus(v)).toBeGreaterThanOrEqual(1); expect(comboParticleBonus(v)).toBeLessThanOrEqual(1.5); }
    expect(comboParticleBonus(15)).toBeGreaterThan(comboParticleBonus(3));
  });
});

describe('état de combo : occupé pendant la chaîne, résumé UNE seule fois à la fin', () => {
  it('une fusion isolée n\'occupe rien ; à partir du combo 2, le plateau est « occupé » jusqu\'à COMBO_HOLD_MS après la dernière fusion', () => {
    comboTick(1, 10); expect(isComboBusy()).toBe(false);
    comboTick(2, 10); expect(isComboBusy()).toBe(true);
    advance(COMBO_HOLD_MS - 100); expect(isComboBusy()).toBe(true);
    comboTick(3, 10); advance(COMBO_HOLD_MS - 100); expect(isComboBusy()).toBe(true); // la chaîne prolonge l'attente
    advance(200); expect(isComboBusy()).toBe(false);
  });
  it('quinze fusions rapides : UN seul résumé (points additionnés, meilleur combo, annonces uniques)', () => {
    const ends: unknown[] = []; onComboEnd((r) => ends.push(r));
    for (let i = 1; i <= 15; i++) { comboTick(i, 10 * i); advance(250); }
    comboNote('+1 Baguette magique'); comboNote('+1 Baguette magique'); comboNote('+5 ⚡');
    expect(currentRecap().points).toBe(1200); // 10 × (1+…+15)
    advance(COMBO_HOLD_MS + 100);
    expect(ends).toHaveLength(1);
    expect(ends[0]).toEqual({ merges: 15, points: 1200, best: 15, notes: ['+1 Baguette magique', '+5 ⚡'] });
    advance(5000); expect(ends).toHaveLength(1); // pas de second résumé
  });
  it('3, 5, 10 et 15 fusions : à chaque fois un seul résumé, et l\'état est propre ensuite', () => {
    for (const n of [3, 5, 10, 15]) {
      const ends: { best: number }[] = []; const off = onComboEnd((r) => ends.push(r));
      for (let i = 1; i <= n; i++) { comboTick(i, 5); advance(200); }
      advance(COMBO_HOLD_MS + 100);
      expect(ends.map((e) => e.best)).toEqual([n]);
      expect(isBoardBusy()).toBe(false); expect(currentRecap()).toEqual({ merges: 0, points: 0, best: 0, notes: [] });
      off();
    }
  });
  it('un glissement d\'objet occupe aussi le plateau ; notifié aux abonnés', () => {
    const seen: boolean[] = []; onBoardBusyChange(() => seen.push(isBoardBusy()));
    setDragging(true); expect(isBoardBusy()).toBe(true);
    setDragging(true); // idempotent : pas de second signal
    setDragging(false); expect(isBoardBusy()).toBe(false);
    expect(seen).toEqual([true, false]);
  });
  it('quitter le plateau (endComboNow) termine le combo tout de suite, sans fuite', () => {
    const ends: unknown[] = []; onComboEnd((r) => ends.push(r));
    comboTick(2, 5); comboTick(3, 5); endComboNow();
    expect(isComboBusy()).toBe(false); expect(ends).toHaveLength(1);
  });
});

describe('gestionnaire de notices : rien pendant un combo, tout reprend ensuite', () => {
  const mkCore = () => {
    const timers: { fn: () => void; at: number }[] = [];
    const core = new NotifyCore({ now: () => t, blocked: () => isBoardBusy(), setTimer: (fn, ms) => { const h = { fn, at: t + ms }; timers.push(h); return h; }, clearTimer: (h) => { const i = timers.indexOf(h as never); if (i >= 0) timers.splice(i, 1); }, gapMs: 0 });
    const run = (ms: number): void => { const end = t + ms; while (t < end) { t += 60; for (const h of [...timers]) if (h.at <= t) { timers.splice(timers.indexOf(h), 1); h.fn(); } } };
    return { core, run };
  };
  const item = (key: string, channel: NotifyItem['channel'], ttl: number, shown: string[]): NotifyItem => ({ key, channel, prio: 3, ttl, ms: 800, show: () => { shown.push(key); return () => undefined; } });
  it('aucune notice (toast, pastille, Auguste) ne s\'affiche pendant le combo ; celles qui comptent passent après, sans doublon', () => {
    const { core, run } = mkCore(); const shown: string[] = [];
    comboTick(2, 5); comboTick(3, 5);
    expect(core.push(item('t1', 'toast', 8000, shown))).toBe('queued');
    expect(core.push(item('aug', 'narrative', 8000, shown))).toBe('queued');
    expect(core.push(item('aug', 'narrative', 8000, shown))).toBe('merged'); // pas de doublon
    run(1000); expect(shown).toEqual([]);
    t += COMBO_HOLD_MS; vi.advanceTimersByTime(COMBO_HOLD_MS + 100);
    run(1500); expect(shown.sort()).toEqual(['aug', 't1']);
  });
  it('une pastille secondaire qui se périme pendant le combo n\'apparaît pas après coup (information périmée)', () => {
    const { core, run } = mkCore(); const shown: string[] = [];
    comboTick(2, 5); core.push(item('p', 'ambient', 1000, shown));
    t += COMBO_HOLD_MS; vi.advanceTimersByTime(COMBO_HOLD_MS + 100); run(1500);
    expect(shown).toEqual([]);
  });
});
