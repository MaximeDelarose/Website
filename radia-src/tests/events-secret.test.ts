import { describe, it, expect } from 'vitest';
import { verdictFor, VERDICT_NOTE, VERDICT_FIRST, VERDICT_SECOND, specificCompliments, VERDICT_EXTRAS } from '../src/events/dressLines';
import { rollSecretTarget, SECRET_MIN, SECRET_MAX, defaultEvents, sanitizeEvents } from '../src/events/state';
import { DEFAULT_LOOK, CLOTH_IDS, CLOTH_SLOTS, type Look } from '../src/data/world/ids';
import { SECRET_ID } from '../src/events/data/secret';
import { eventById, EVENTS } from '../src/events/data';
import { pickEvent } from '../src/events/manager';
import { mulberry32 } from '../src/game/world/careerGames/rng';

const look = (o: Partial<Look> = {}): Look => ({ ...DEFAULT_LOOK, acc: [], ...o });

describe('10 / 10 : toujours, quelle que soit la tenue', () => {
  it('la note est 10 pour chaque tenue possible (aléatoire, vide, tout équipé)', () => {
    const rnd = mulberry32(3);
    for (let i = 0; i < 300; i++) {
      const pickSlot = (s: string) => { const l = CLOTH_IDS.filter((c) => CLOTH_SLOTS[c] === s); return l[Math.floor(rnd() * l.length)] ?? null; };
      const l = look({ top: rnd() < 0.5 ? pickSlot('top') : null, dress: rnd() < 0.5 ? pickSlot('dress') : null, shoes: pickSlot('shoes'), bag: rnd() < 0.5 ? pickSlot('bag') : null, acc: rnd() < 0.5 ? [pickSlot('acc')!] : [] });
      const v = verdictFor(l, rnd);
      expect(v.note).toBe(10);
      expect(v.lines[0]).toBe(VERDICT_FIRST);
      expect(v.lines[1]).toBe(VERDICT_SECOND);
      expect(v.lines.length).toBeGreaterThanOrEqual(3);
    }
    expect(verdictFor(look({ top: null, bottom: null, shoes: null, bag: null }), () => 0).note).toBe(VERDICT_NOTE);
  });
  it('aucune critique : tous les compliments sont positifs', () => {
    const all = [...VERDICT_EXTRAS, ...specificCompliments(look({ dress: 'dr-denim', shoes: 'sh-heels-red', bag: 'bg-silver', crown: 'cr-gold', acc: ['hd-bow-pink', 'lp-red', 'ea-stars', 'br-promise'] })), VERDICT_FIRST, VERDICT_SECOND];
    for (const t of all) expect(/moche|nul|horrible|dommage|bof|pas terrible|laid/i.test(t)).toBe(false);
  });
});

describe('quête secrète : déclenchement', () => {
  it('le seuil est tiré entre 20 et 30 minutes et varie', () => {
    const vals = new Set<number>();
    for (let i = 0; i <= 50; i++) { const t = rollSecretTarget(i / 50); expect(t).toBeGreaterThanOrEqual(SECRET_MIN); expect(t).toBeLessThanOrEqual(SECRET_MAX); vals.add(t); }
    expect(vals.size).toBeGreaterThan(30);
    expect(rollSecretTarget(0)).toBe(SECRET_MIN);
    expect(rollSecretTarget(1)).toBeLessThanOrEqual(SECRET_MAX);
  });
  it('l\'état par défaut : rien déclenché, 0 ms de jeu actif, seuil valide', () => {
    const s = defaultEvents().secret;
    expect(s.triggered).toBe(false);
    expect(s.activeMs).toBe(0);
    expect(s.target).toBeGreaterThanOrEqual(SECRET_MIN);
  });
  it('la sauvegarde conserve le seuil, le déclenchement et rejette les valeurs absurdes', () => {
    const st = defaultEvents();
    st.secret = { activeMs: 5 * 60_000, target: 25 * 60_000, triggered: true, heard: 2, runId: 'r1' };
    const back = sanitizeEvents(JSON.parse(JSON.stringify(st)));
    expect(back.secret).toEqual(st.secret);
    const bad = sanitizeEvents({ secret: { target: 5, activeMs: -4, triggered: 'oui' } });
    expect(bad.secret.target).toBeGreaterThanOrEqual(SECRET_MIN);
    expect(bad.secret.activeMs).toBe(0);
    expect(bad.secret.triggered).toBe(false);
  });
  it('la quête n\'est jamais tirée au sort comme une invitation ordinaire', () => {
    const st = defaultEvents();
    st.playMs = 500 * 60_000;
    for (let s = 0; s < 200; s++) expect(pickEvent(EVENTS, st, { chapter: 3, chessUnlocked: true, careerCurrent: 'photo', careersTried: ['photo'] }, mulberry32(s))?.id).not.toBe(SECRET_ID);
  });
});

describe('quête « Une soirée avec A ♡ »', () => {
  const q = eventById(SECRET_ID)!;
  it('5 phases claires, étapes dans le bon ordre', () => {
    expect(q.title).toBe('Une soirée avec A ♡');
    expect(q.phases?.length).toBe(5);
    const kinds = q.steps.map((s) => (s.t === 'activity' ? s.id : s.t));
    expect(kinds).toEqual(['dress', 'dressVerdict', 'travel', 'scene', 'menuPick', 'guessMenu', 'scene', 'photoShoot', 'braceletReveal']);
    expect(q.phases!.map((p) => p.from)).toEqual([...q.phases!.map((p) => p.from)].sort((a, b) => a - b));
  });
  it('le bracelet n\'est donné qu\'à la première fois ; les rejeux ne redonnent rien', () => {
    expect(q.reward.cloth).toEqual(['br-promise']);
    expect(q.replayReward).toEqual({});
    expect(q.achievements).toContain('ev_promise');
  });
  it('la devinette de la quête utilise les répliques de la quête', () => {
    const g = q.steps.find((s) => s.t === 'activity' && s.id === 'guessMenu') as { params?: { lines?: string } };
    expect(g.params?.lines).toBe('secret');
  });
});
