import { describe, it, expect } from 'vitest';
import { defaultFun, sanitizeFun } from '../src/save/fun';
import { TINDEUR, advanceStreak, choose, hasPending, markShown, newMem, resetTindeur, setInstalled, shouldTrigger, TEXTS } from '../src/events/tindeur/logic';

const T = 1_700_000_000_000;
const play = (t: ReturnType<typeof defaultFun>['tindeur'], mem: ReturnType<typeof newMem>, ms: number, engaged = true, step = 4000) => {
  for (let x = 0; x < ms; x += step) advanceStreak(t, mem, step, engaged);
};

describe('Tindeur : déclenchement', () => {
  it('textes exacts', () => {
    expect(TEXTS.matches).toBe('Vous avez 2 500 matchs !');
    expect(TEXTS.newMatch).toBe('Vous avez un nouveau match. Souhaitez-vous lui répondre ?');
    expect(TEXTS.question).toBe('Que souhaites-tu faire de Tindeur ?');
    expect(TEXTS.uninstall).toBe('Désinstaller l’appli');
    expect(TEXTS.keep).toBe('Garder l’application, au cas où je trouve mieux et pour continuer à parler à des gars');
  });
  it('seuil : pas avant 15 min consécutives, oui après', () => {
    const t = defaultFun().tindeur; const m = newMem();
    play(t, m, 14 * 60_000 + 40_000);
    expect(shouldTrigger(t, true)).toBe(false);
    play(t, m, 30_000);
    expect(t.streakMs).toBeGreaterThanOrEqual(TINDEUR.needMs);
    expect(shouldTrigger(t, true)).toBe(true);
    expect(shouldTrigger(t, false)).toBe(false); // il faut un moment sûr
  });
  it('une courte pause (< 90 s) ne remet pas à zéro ; une longue pause (≥ 90 s : inactif / onglet caché) oui', () => {
    const t = defaultFun().tindeur; const m = newMem();
    play(t, m, 10 * 60_000);
    const before = t.streakMs;
    play(t, m, 60_000, false); // 60 s d'inactivité
    expect(t.streakMs).toBe(before);
    play(t, m, 20_000); // retour : l'écart repart de zéro
    play(t, m, 80_000, false);
    expect(t.streakMs).toBeGreaterThan(before);
    play(t, m, 100_000, false); // longue pause
    expect(t.streakMs).toBe(0);
    play(t, m, 12 * 60_000);
    expect(shouldTrigger(t, true)).toBe(false); // 12 + 12 min séparées ne font pas 15 consécutives
  });
  it('se déclenche UNE seule fois', () => {
    const t = defaultFun().tindeur; const m = newMem();
    play(t, m, 16 * 60_000);
    expect(shouldTrigger(t, true)).toBe(true);
    markShown(t, T);
    expect(shouldTrigger(t, true)).toBe(false);
    play(t, m, 60 * 60_000);
    expect(shouldTrigger(t, true)).toBe(false);
    expect(t.shown).toBe(true);
  });
  it('icône avec pastille tant qu’aucun choix n’est fait', () => {
    const t = defaultFun().tindeur;
    expect(hasPending(t)).toBe(false);
    markShown(t, T);
    expect(hasPending(t)).toBe(true);
    choose(t, 'keep', T);
    expect(hasPending(t)).toBe(false);
  });
});

describe('Tindeur : choix persistants et réglages', () => {
  const roundtrip = (f: ReturnType<typeof defaultFun>) => sanitizeFun(JSON.parse(JSON.stringify(f))).tindeur;
  it('garder : l’icône reste, le choix est sauvegardé', () => {
    const f = defaultFun(); choose(f.tindeur, 'keep', T);
    const b = roundtrip(f);
    expect(b.choice).toBe('keep'); expect(b.installed).toBe(true); expect(b.shown).toBe(true);
  });
  it('désinstaller : l’icône disparaît, plus aucune notification, sauvegardé', () => {
    const f = defaultFun(); const m = newMem();
    choose(f.tindeur, 'uninstall', T);
    const b = roundtrip(f);
    expect(b.choice).toBe('uninstall'); expect(b.installed).toBe(false);
    play(b, m, 60 * 60_000);
    expect(shouldTrigger(b, true)).toBe(false);
    expect(hasPending(b)).toBe(false);
  });
  it('même sans passer par la scène, une désinstallation ne se re-déclenche jamais', () => {
    const t = defaultFun().tindeur; const m = newMem();
    setInstalled(t, false, T);
    play(t, m, 30 * 60_000);
    expect(shouldTrigger(t, true)).toBe(false);
  });
  it('réglages du téléphone : réinstaller / désinstaller à volonté, sans relancer la scène', () => {
    const t = defaultFun().tindeur;
    choose(t, 'uninstall', T);
    setInstalled(t, true, T + 1);
    expect(t.installed).toBe(true); expect(t.choice).toBe('keep'); expect(shouldTrigger(t, true)).toBe(false);
    setInstalled(t, false, T + 2);
    expect(t.installed).toBe(false); expect(t.choice).toBe('uninstall');
    expect(roundtrip({ ...defaultFun(), tindeur: t }).installed).toBe(false);
  });
  it('reset (dev) remet tout à zéro', () => {
    const t = defaultFun().tindeur; choose(t, 'uninstall', T); t.streakMs = 5;
    resetTindeur(t);
    expect(t).toEqual(defaultFun().tindeur);
  });
  it('ne touche jamais autre chose que fun.tindeur (aucun lien avec l’affection d’Auguste)', () => {
    const f = defaultFun(); const snap = JSON.stringify({ ...f, tindeur: 0 });
    choose(f.tindeur, 'uninstall', T); setInstalled(f.tindeur, true, T);
    expect(JSON.stringify({ ...f, tindeur: 0 })).toBe(snap);
  });
});
