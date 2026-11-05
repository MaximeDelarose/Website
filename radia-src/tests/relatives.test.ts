import { describe, it, expect } from 'vitest';
import { REL_IDS, RELATIVES, SLOTS, TONES, availability, askCare, confirmLater, BANNED_REPLY, PLAN_B, CARE_OUTCOME_TEXT, isRelId, type RelId, type SlotId } from '../src/data/family/relatives';

// aucun prénom protégé en clair : vérification par empreintes (aucun prénom n'est écrit dans le dépôt)
const fnv = (w: string): number => { let x = 2166136261; for (let i = 0; i < w.length; i++) { x ^= w.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; } return x >>> 0; };
const PROTECTED = new Set<number>([3946716181, 2134510645, 4286642214, 2941064473]);
const noProtectedName = (text: string): void => { for (const w of new Set(text.toLowerCase().match(/[a-zà-ÿ]+/g) ?? [])) expect(PROTECTED.has(fnv(w)), 'un prénom protégé apparaît dans le texte').toBe(false); };

const rng = (): (() => number) => { let s = 7; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

describe('Famille & proches : données', () => {
  it('quatre proches fictifs, libellés neutres (aucun prénom d\'enfant ni de proche réel)', () => {
    expect(REL_IDS).toEqual(['maman', 'tante', 'soeur', 'amie']);
    noProtectedName(JSON.stringify(RELATIVES));
    for (const id of REL_IDS) { expect(RELATIVES[id].label.length).toBeGreaterThan(2); expect(RELATIVES[id].hello.length).toBeGreaterThanOrEqual(3); expect(isRelId(id)).toBe(true); }
    expect(isRelId('kid1')).toBe(false);
  });
  it('disponibilité déterministe : même créneau + même graine = même résultat', () => {
    for (const r of REL_IDS) for (const s of SLOTS) expect(availability(r, s.id, 'x')).toBe(availability(r, s.id, 'x'));
  });
  it('jamais d\'impasse : pour tout créneau et toute graine, au moins un proche est libre ou « peut-être »', () => {
    for (let i = 0; i < 400; i++) for (const s of SLOTS) {
      const seed = `run${i}`;
      expect(REL_IDS.some((r) => availability(r, s.id as SlotId, seed) !== 'busy'), `${seed} ${s.id}`).toBe(true);
    }
  });
  it('la disponibilité est variée (libre / peut-être / occupée apparaissent toutes)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) for (const r of REL_IDS) seen.add(availability(r, 'tonight', `s${i}`));
    expect(seen).toEqual(new Set(['free', 'maybe', 'busy']));
  });
});

describe('Famille & proches : demander de l\'aide', () => {
  it('un « non » propose toujours une alternative (autre proche ou autre créneau)', () => {
    let nos = 0;
    for (let i = 0; i < 300; i++) for (const r of REL_IDS) for (const s of SLOTS) {
      const a = askCare(r as RelId, s.id as SlotId, 'sweet', `n${i}`, rng());
      if (a.state === 'no') { nos++; expect(a.suggest?.rel || a.suggest?.slot, `${r} ${s.id} n${i}`).toBeTruthy(); }
    }
    expect(nos).toBeGreaterThan(20);
  });
  it('aucune réponse ne culpabilise ni ne presse (mots interdits)', () => {
    for (let i = 0; i < 200; i++) for (const r of REL_IDS) for (const t of TONES) for (const s of SLOTS) {
      const a = askCare(r as RelId, s.id as SlotId, t.id, `b${i}`, rng());
      expect(a.text).not.toMatch(BANNED_REPLY);
    }
    for (const t of TONES) expect(t.text).not.toMatch(BANNED_REPLY);
  });
  it('trois tons de message, tous bienveillants ; le ton ne change jamais la réponse', () => {
    expect(TONES.map((t) => t.id)).toEqual(['sweet', 'direct', 'funny']);
    for (const r of REL_IDS) for (const s of SLOTS) {
      const states = TONES.map((t) => askCare(r as RelId, s.id as SlotId, t.id, 'same', rng()).state);
      expect(new Set(states).size).toBe(1);
    }
  });
  it('confirmation d\'un « peut-être » : déterministe', () => { expect(confirmLater('maman', 'tonight', 'q')).toBe(confirmLater('maman', 'tonight', 'q')); });
  it('plan B : report, autre proche, autre créneau, sortie en famille ; chaque issue a un texte rassurant', () => {
    expect(PLAN_B.map((p) => p.id)).toEqual(['other-rel', 'other-slot', 'family', 'postpone']);
    for (const t of Object.values(CARE_OUTCOME_TEXT)) { expect(t).not.toMatch(BANNED_REPLY); expect(t.length).toBeGreaterThan(20); }
  });
});
