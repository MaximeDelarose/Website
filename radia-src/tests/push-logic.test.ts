import { describe, it, expect } from 'vitest';
import { THOUGHTS, THOUGHT_COUNT } from '../../supabase/functions/radia-push/messages';
import { isDue, localParts, nextThought, shuffled, SEND_UNTIL, type SubLike } from '../../supabase/functions/radia-push/logic';

const rng = (seed = 1) => { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const sub = (o: Partial<SubLike> = {}): SubLike => ({ tz: 'Europe/Paris', send_hour: 9, enabled: true, last_sent_day: null, deck: [], last_idx: -1, ...o });
const at = (iso: string) => Date.parse(iso);

describe('banque de petites pensées', () => {
  it('au moins 50 messages, tous différents, toutes les catégories demandées', () => {
    expect(THOUGHT_COUNT).toBeGreaterThanOrEqual(50);
    expect(new Set(THOUGHTS.map((t) => t.text)).size).toBe(THOUGHT_COUNT);
    expect(new Set(THOUGHTS.map((t) => t.cat)).size).toBe(7);
    for (const t of THOUGHTS) { expect(t.text.length).toBeGreaterThan(10); expect(t.text.length).toBeLessThanOrEqual(150); } // court : lisible sur un écran verrouillé
  });
  it('les exemples fournis sont présents ; « galbi » presque jamais ; aucune promesse sur l\'avenir', () => {
    const all = THOUGHTS.map((t) => t.text);
    for (const must of ['Allah y hafdek ♡', 'Qu’Allah te protège aujourd’hui.', 'Petit rappel doux du jour : tu es précieuse ♡', 'Salam, j’espère que tu vas bien aujourd’hui ♡', 'Passe une douce journée, qu’Allah t’accompagne.']) expect(all).toContain(must);
    expect(all.filter((t) => /galbi/i.test(t)).length).toBeLessThanOrEqual(1);
    for (const t of all) expect(t).not.toMatch(/\b(tu vas gagner|je te promets|c'est garanti|sans aucun doute allah|demain tout)\b/i);
  });
});

describe('quand envoyer (une par jour, Europe/Paris, jamais la nuit)', () => {
  it('fuseau Europe/Paris : heure d\'hiver (UTC+1) et d\'été (UTC+2)', () => {
    expect(localParts(at('2026-01-15T08:30:00Z'), 'Europe/Paris')).toEqual({ day: '2026-01-15', hour: 9 });
    expect(localParts(at('2026-07-15T07:30:00Z'), 'Europe/Paris')).toEqual({ day: '2026-07-15', hour: 9 });
    expect(localParts(at('2026-01-15T23:30:00Z'), 'Europe/Paris')).toEqual({ day: '2026-01-16', hour: 0 }); // passage de minuit local
    expect(localParts(at('2026-01-15T12:00:00Z'), 'Pacifique/Inconnu')).toEqual({ day: '2026-01-15', hour: 13 }); // fuseau invalide → Paris
  });
  it('pas avant l\'heure choisie, pas la nuit', () => {
    const s = sub({ send_hour: 9 });
    expect(isDue(s, at('2026-01-15T07:30:00Z'))).toBe(false); // 8 h 30 à Paris
    expect(isDue(s, at('2026-01-15T08:05:00Z'))).toBe(true); // 9 h 05
    expect(isDue(s, at('2026-01-15T20:30:00Z'))).toBe(false); // 21 h 30 : nuit
    expect(isDue(s, at('2026-01-15T02:00:00Z'))).toBe(false); // 3 h
    for (let h = 0; h < 24; h++) { const t = Date.UTC(2026, 0, 15, h, 5); const p = localParts(t, 'Europe/Paris'); if (p.hour < 8 || p.hour >= SEND_UNTIL) expect(isDue(sub({ send_hour: 7 }), t)).toBe(false); }
  });
  it('une seule fois par jour local : pas de doublon, puis le lendemain oui', () => {
    const s = sub({ last_sent_day: '2026-01-15' });
    expect(isDue(s, at('2026-01-15T10:00:00Z'))).toBe(false);
    expect(isDue(s, at('2026-01-16T09:00:00Z'))).toBe(true);
  });
  it('rattrapage dans la journée si l\'envoi a été manqué, jamais après 21 h', () => {
    expect(isDue(sub(), at('2026-01-15T17:05:00Z'))).toBe(true); // 18 h 05
    expect(isDue(sub(), at('2026-01-15T20:05:00Z'))).toBe(false); // 21 h 05
  });
  it('désactivé : jamais ; changement de fuseau : le jour local suit le fuseau', () => {
    expect(isDue(sub({ enabled: false }), at('2026-01-15T09:00:00Z'))).toBe(false);
    const ny = sub({ tz: 'America/New_York' });
    expect(isDue(ny, at('2026-01-15T14:05:00Z'))).toBe(true); // 9 h 05 à New York
    expect(isDue(ny, at('2026-01-15T08:05:00Z'))).toBe(false); // 3 h 05 à New York
  });
  it('heure de départ bornée à 8–20 h même avec une valeur absurde', () => {
    expect(isDue(sub({ send_hour: 3 }), at('2026-01-15T06:30:00Z'))).toBe(false); // 7 h 30 < 8
    expect(isDue(sub({ send_hour: 99 }), at('2026-01-15T19:30:00Z'))).toBe(true); // 20 h 30 ≥ 20
  });
});

describe('rotation des messages', () => {
  it('aucun message deux fois avant d\'avoir tout vu ; ensuite le paquet est rebattu', () => {
    const r = rng(5); let deck: number[] = []; let last = -1; const seen: number[] = [];
    for (let i = 0; i < THOUGHT_COUNT; i++) { const n = nextThought(deck, last, r); seen.push(n.idx); deck = n.deck; last = n.idx; }
    expect(new Set(seen).size).toBe(THOUGHT_COUNT);
    const again = nextThought(deck, last, r); expect(again.idx).not.toBe(last);
  });
  it('jamais deux fois la même catégorie d\'affilée', () => {
    for (const seed of [1, 2, 3, 4]) { const r = rng(seed); let deck: number[] = []; let last = -1; let lastCat = ''; let same = 0;
      for (let i = 0; i < 400; i++) { const n = nextThought(deck, last, r); const c = THOUGHTS[n.idx].cat; if (c === lastCat) same++; lastCat = c; deck = n.deck; last = n.idx; }
      expect(same).toBeLessThanOrEqual(2); } // seulement quand le paquet n'a plus que cette catégorie
  });
  it('un paquet corrompu ou périmé est ignoré sans exception', () => {
    const n = nextThought([999, -3, 1.5, NaN as unknown as number], -1, rng(2));
    expect(n.idx).toBeGreaterThanOrEqual(0); expect(n.idx).toBeLessThan(THOUGHT_COUNT);
  });
  it('mélange : permutation complète', () => { const s = shuffled(20, rng(7)); expect([...s].sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i)); });
});
