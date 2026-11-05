import swSource from '../src/sw-template.js?raw';
import { describe, it, expect } from 'vitest';
import { THOUGHTS, THOUGHT_COUNT, ORIGINAL_COUNT } from '../../supabase/functions/radia-push/messages';
import { isDue, localParts, nextThought, shuffled, withNewThoughts, SEND_UNTIL, type SubLike } from '../../supabase/functions/radia-push/logic';

const rng = (seed = 1) => { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const sub = (o: Partial<SubLike> = {}): SubLike => ({ tz: 'Europe/Paris', send_hour: 9, enabled: true, last_sent_day: null, deck: [], last_idx: -1, ...o });
const at = (iso: string) => Date.parse(iso);

describe('banque de petites pensées', () => {
  it('au moins 50 messages, tous différents, toutes les catégories demandées', () => {
    expect(THOUGHT_COUNT).toBeGreaterThanOrEqual(50);
    expect(new Set(THOUGHTS.map((t) => t.text)).size).toBe(THOUGHT_COUNT);
    expect(new Set(THOUGHTS.map((t) => t.cat)).size).toBe(7);
    expect(THOUGHT_COUNT).toBe(ORIGINAL_COUNT + 6);
    for (const t of THOUGHTS.slice(0, ORIGINAL_COUNT)) { expect(t.text.length).toBeGreaterThan(10); expect(t.text.length).toBeLessThanOrEqual(150); } // anciennes pensées : courtes, lisibles sur un écran verrouillé
    for (const t of THOUGHTS) expect(t.text.length).toBeLessThanOrEqual(400); // les pensées personnelles sont plus longues : aperçu raccourci par le service worker, texte intégral dans l'app (limite d'une charge Web Push : 4 Ko)
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

const NEW_SIX = [
  'Radia ♡ Je veux que tu penses un peu + à toi, que tu te choisisses + souvent et que tu n’oublies jamais à quel point tu es précieuse. Prends soin de toi, tu le mérites. ❤️',
  'Radia, tu as une magnifique famille et tu es une mère extraordinaire. Je suis sûr que tes enfants s’en rendent compte, ou qu’ils le comprendront encore davantage en grandissant. N’en doute jamais. ❤️',
  'Qu’Allah mette de la baraka dans ta journée, apaise ton cœur et t’apporte de belles choses. Prends soin de toi ♡',
  'Si un jour tu as un coup de mou ou simplement besoin de parler, appelle-moi. Je serai toujours heureux de t’écouter, sans jamais te juger. Même tes petits défauts font partie de la personne que tu es, et c’est aussi ce qui te rend unique. ❤️',
  'Je ne remercierai jamais assez Dieu de t’avoir mise sur mon chemin. Tu as cette façon de faire rayonner les gens qui t’entourent, parfois même sans t’en rendre compte. Et je voulais simplement que tu le saches. ❤️',
  'N’oublie jamais qu’au moindre problème, tu peux compter sur moi. Je ferai toujours de mon mieux pour t’aider, te soutenir et trouver des solutions à tes côtés. Tu n’as pas besoin de tout porter toute seule. ♡',
];
const fnv = (t: string): number => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

describe('six nouvelles pensées personnelles', () => {
  it('textes EXACTEMENT ceux fournis (signes « + », cœurs, apostrophes), ajoutés à la FIN sans toucher aux anciennes', () => {
    expect(THOUGHTS.slice(ORIGINAL_COUNT).map((t) => t.text)).toEqual(NEW_SIX);
    expect(ORIGINAL_COUNT).toBe(53);
    expect(THOUGHTS.slice(ORIGINAL_COUNT).map((t) => t.title)).toEqual(['Pense à toi ♡', 'Une mère extraordinaire ♡', 'Une journée remplie de baraka ♡', 'Je suis là pour toi ♡', 'Reconnaissant de t’avoir rencontrée ♡', 'Tu peux compter sur moi ♡']);
    // empreinte des 53 anciennes pensées : si l'une est modifiée, ce test le dit
    expect(fnv(THOUGHTS.slice(0, ORIGINAL_COUNT).map((t) => t.text).join('\n'))).toBe(1182912106);
  });
  it('un paquet déjà commencé (sans marqueur, créé avant l\'ajout) reçoit les six nouvelles dans les jours qui viennent, sans doublon', () => {
    const old = Array.from({ length: 30 }, (_, i) => i + 10); // 30 pensées restantes du paquet en cours
    const d = withNewThoughts(old, rng(3));
    for (let i = ORIGINAL_COUNT; i < THOUGHT_COUNT; i++) expect(d.filter((x) => x === i).length).toBe(1);
    expect(d.length).toBe(36);
    // un paquet déjà marqué n'est pas modifié (pas de nouvel ajout à chaque envoi)
    expect(withNewThoughts([...d, -THOUGHT_COUNT], rng(4)).length).toBe(36);
  });
  it('parcours complet : les six nouvelles sortent avant tout nouveau cycle, jamais deux jours de suite la même, jamais deux fois dans un cycle', () => {
    const r = rng(11); let deck: number[] = Array.from({ length: 40 }, (_, i) => i); let last = -1; const seen: number[] = [];
    for (let i = 0; i < 46; i++) { const n = nextThought(deck, last, r); expect(n.idx).not.toBe(last); seen.push(n.idx); deck = n.deck; last = n.idx; }
    expect(new Set(seen).size).toBe(46);
    for (let i = ORIGINAL_COUNT; i < THOUGHT_COUNT; i++) expect(seen).toContain(i);
  });
});

// ---- aperçu de notification (service worker) : fonction extraite du vrai fichier
describe('aperçu de la notification (service worker)', () => {
  const src: string = swSource;
  const part = src.slice(src.indexOf('//#preview-start'), src.indexOf('//#preview-end'));
  const previewOf = new Function(`${part}; return previewOf;`)() as (t: string) => string;
  it('les anciennes pensées courtes restent intactes', () => {
    for (const t of THOUGHTS.slice(0, ORIGINAL_COUNT)) expect(previewOf(t.text)).toBe(t.text);
  });
  it('les pensées longues : début lisible, coupé à un mot, terminé par « … », jamais plus de 125 caractères', () => {
    for (const t of THOUGHTS.slice(ORIGINAL_COUNT)) {
      const p = previewOf(t.text);
      if (t.text.length > 130) { expect(p.endsWith(' …')).toBe(true); expect(p.length).toBeLessThanOrEqual(125); expect(t.text.startsWith(p.slice(0, -2).trimEnd())).toBe(true); }
      else expect(p).toBe(t.text);
    }
  });
  it('le service worker range le texte INTÉGRAL (pas l\'aperçu) pour « Petites pensées ♡ »', () => {
    expect(src).toMatch(/JSON\.stringify\(\{ at, text: full,/);
    expect(src).toMatch(/body,\s*\n\s*icon:/);
  });
});
