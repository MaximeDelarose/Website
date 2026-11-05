import { describe, it, expect } from 'vitest';
import { eligible, canOfferBig, offerInvite, recordDone, pickEvent, type Progress } from '../src/events/manager';
import { defaultEvents } from '../src/events/state';
import { EVENTS, eventById } from '../src/events/data';
import { FAMILY_RELATIVES } from '../src/events/data/family';
import { ACTIVITY_IDS, PLACE_IDS, type EventDef, type StepCond } from '../src/events/types';
import { stepAllowed } from '../src/events/steps';
import { PICK_PRESETS, pickPreset } from '../src/events/games/family/picks';
import { CLOTH_SLOTS, FURNITURE_IDS } from '../src/data/world/ids';
import { mulberry32 } from '../src/game/world/careerGames/rng';

// aucun prénom protégé en clair : vérification par empreintes (aucun prénom n'est écrit dans le dépôt)
const fnv = (w: string): number => { let x = 2166136261; for (let i = 0; i < w.length; i++) { x ^= w.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; } return x >>> 0; };
const PROTECTED = new Set<number>([3946716181, 2134510645, 4286642214, 2941064473]);
const noProtectedName = (text: string): void => { for (const w of new Set(text.toLowerCase().match(/[a-zà-ÿ]+/g) ?? [])) expect(PROTECTED.has(fnv(w)), 'un prénom protégé apparaît dans le texte').toBe(false); };

const PR: Progress = { chapter: 2, chessUnlocked: true, careerCurrent: null, careersTried: [] };
const MIN = 60_000;
const byId = (id: string): EventDef => eventById(id)!;

describe('événements de famille : A (chez maman), B (aéroport), B2 (retrouvailles), C (sortie avec Auguste)', () => {
  it('les quatre événements existent, avec des identifiants uniques', () => {
    expect(FAMILY_RELATIVES.map((e) => e.id)).toEqual(['fm-mom-visit', 'fm-airport', 'fm-airport-return', 'fm-auguste-out']);
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(EVENTS.length);
  });
  it('étapes valides : lieux et activités connus, récompenses existantes', () => {
    for (const e of FAMILY_RELATIVES) {
      for (const s of e.steps) {
        if (s.t === 'activity') expect((ACTIVITY_IDS as readonly string[]).includes(s.id), `${e.id} ${s.id}`).toBe(true);
        if (s.t === 'travel' || s.t === 'photo') expect((PLACE_IDS as readonly string[]).includes(s.place), `${e.id} ${s.place}`).toBe(true);
      }
      for (const c of e.reward.cloth ?? []) expect(c in CLOTH_SLOTS, `${e.id} ${c}`).toBe(true);
      for (const f of e.reward.furniture ?? []) expect((FURNITURE_IDS as readonly string[]).includes(f), `${e.id} ${f}`).toBe(true);
      expect(e.memoryTitle.length).toBeGreaterThan(3);
    }
    expect(PLACE_IDS).toContain('momHome'); expect(PLACE_IDS).toContain('airport');
  });
  it('les proches parlent avec leur étiquette neutre ; aucun prénom d\'enfant ni de proche réel', () => {
    const txt = JSON.stringify(FAMILY_RELATIVES);
    noProtectedName(txt);
    const speakers = new Set<string>(); for (const e of FAMILY_RELATIVES) for (const s of e.steps) if (s.t === 'scene') for (const l of s.lines) speakers.add(l.who);
    expect(speakers.has('maman')).toBe(true);
  });
  it('C : chaque issue de l\'organisation (organisé, sortie en famille, report) a sa suite, et toutes terminent bien', () => {
    const c = byId('fm-auguste-out');
    const conds = c.steps.map((s) => ('onlyIf' in s ? s.onlyIf : undefined)).filter(Boolean) as StepCond[];
    const outcomes = new Set(conds.flatMap((x) => x.in as string[]));
    expect(outcomes).toEqual(new Set(['arranged', 'family', 'postponed']));
    for (const k of ['arranged', 'family', 'postponed']) {
      const played = c.steps.filter((s) => !('onlyIf' in s && s.onlyIf) || stepAllowed(s.onlyIf!, { arrangeCare: { outcome: k } }));
      expect(played.length, k).toBeGreaterThanOrEqual(3);
      expect(played.some((s) => s.t === 'activity' && s.id === 'arrangeCare')).toBe(true);
    }
    // les enfants ne sont présents que dans la sortie en famille
    for (const s of c.steps) if (s.t === 'photo' && s.withKids) expect(s.onlyIf?.in).toEqual(['family']);
  });
  it('stepAllowed : étape ignorée si l\'activité n\'a pas été jouée ou si le résultat diffère', () => {
    const cond: StepCond = { activity: 'arrangeCare', field: 'outcome', in: ['arranged'] };
    expect(stepAllowed(cond, {})).toBe(false);
    expect(stepAllowed(cond, { arrangeCare: { outcome: 'family' } })).toBe(false);
    expect(stepAllowed(cond, { arrangeCare: { outcome: 'arranged' } })).toBe(true);
  });
  it('B2 (retrouvailles) : seulement après B ET après un délai de jeu actif ; pas avant', () => {
    const st = defaultEvents(); st.playMs = 60 * MIN;
    const b2 = byId('fm-airport-return');
    expect(eligible(b2, st, PR)).toBe(false); // B pas encore fait
    recordDone(st, 'fm-airport', 90, 0); // fait à playMs = 60 min
    expect(eligible(b2, st, PR)).toBe(false); // trop tôt (délai 22 min)
    st.playMs += 10 * MIN; expect(eligible(b2, st, PR)).toBe(false);
    st.playMs += 13 * MIN; expect(eligible(b2, st, PR)).toBe(true); // 23 min après
    recordDone(st, 'fm-airport-return', 90, 0);
    expect(eligible(b2, st, PR)).toBe(false); // une seule fois
  });
  it('B (aéroport) et B2 sont des histoires uniques ; A et C peuvent revenir', () => {
    expect(byId('fm-airport').repeatable).toBe(false);
    expect(byId('fm-airport-return').repeatable).toBe(false);
    expect(byId('fm-mom-visit').repeatable).toBe(true);
    expect(byId('fm-auguste-out').repeatable).toBe(true);
  });
  it('les retrouvailles sont favorisées dès qu\'elles sont possibles (poids élevé)', () => {
    const st = defaultEvents(); st.playMs = 200 * MIN; recordDone(st, 'fm-airport', 90, 0); st.playMs += 30 * MIN;
    expect(canOfferBig(st)).toBe(true);
    let hits = 0; const rng = mulberry32(5);
    for (let i = 0; i < 400; i++) if (pickEvent(EVENTS, st, PR, rng)?.id === 'fm-airport-return') hits++;
    expect(hits).toBeGreaterThan(30);
  });
  it('jamais deux fois la même invitation de suite, et une invitation en attente n\'est pas redoublée', () => {
    const st = defaultEvents(); st.playMs = 100 * MIN;
    const a = byId('fm-mom-visit'); offerInvite(st, a, 0, 'r1');
    expect(eligible(a, st, PR)).toBe(false);
  });
});

describe('choix en famille', () => {
  it('trois préréglages (goûter, voyage, retrouvailles), tous avec maman, chaque choix a une réaction', () => {
    expect(Object.keys(PICK_PRESETS).sort()).toEqual(['farewell', 'tea', 'welcome']);
    for (const p of Object.values(PICK_PRESETS)) {
      expect(p.rel).toBe('maman');
      for (const st of p.steps) { expect(st.options.length).toBeGreaterThanOrEqual(st.count + 1); for (const o of st.options) { expect(o.react.length).toBeGreaterThan(10); expect(o.label.length).toBeGreaterThan(1); } }
    }
    expect(pickPreset('inconnu').id).toBe('tea');
  });
  it('identifiants d\'options uniques dans chaque étape', () => {
    for (const p of Object.values(PICK_PRESETS)) for (const st of p.steps) { const ids = st.options.map((o) => o.id); expect(new Set(ids).size).toBe(ids.length); }
  });
});
