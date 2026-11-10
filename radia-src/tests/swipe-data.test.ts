import { describe, it, expect } from 'vitest';
import { PROFILES, authoredNode as nodeOf, profileById } from '../src/events/tindeur/swipe/data';
import type { Profile } from '../src/events/tindeur/swipe/types';

/** Longueurs (en messages entrants) de tous les chemins ; lève si cycle ou cul-de-sac. */
function paths(p: Profile): number[] {
  const out: number[] = [];
  const walk = (id: string, depth: number, seen: string[]) => {
    const n = nodeOf(p, id);
    if (!n) throw new Error(`${p.id}: nœud inconnu ${id}`);
    if (seen.includes(id)) throw new Error(`${p.id}: cycle sur ${id}`);
    if (!n.ch.length) { if (!n.end) throw new Error(`${p.id}: cul-de-sac ${id}`); out.push(depth + 1); return; }
    for (const c of n.ch) walk(c.to, depth + 1, [...seen, id]);
  };
  walk(p.start, 0, []);
  return out;
}

describe('Tindeur jouable : galerie de profils', () => {
  it('au moins 20 profils masculins fictifs adultes, ids uniques', () => {
    expect(PROFILES.length).toBeGreaterThanOrEqual(20);
    expect(new Set(PROFILES.map((p) => p.id)).size).toBe(PROFILES.length);
    for (const p of PROFILES) { expect(p.age).toBeGreaterThanOrEqual(27); expect(p.name.length).toBeGreaterThan(1); }
  });
  it('les dix profils de la spécification (prénom, âge, bio exacte)', () => {
    const spec: [string, number, string][] = [
      ['kevin', 29, 'J’adore les tracteurs. Je suis célibataire. Mon tracteur s’appelle Josiane.'],
      ['dylan', 32, 'Entrepreneur, sportif, ambitieux.'], ['maxime', 28, 'Je cherche du sérieux.'], ['thomas', 35, 'En couple libre.'],
      ['jordan', 30, 'Je suis différent des autres.'], ['julien', 33, 'Je cherche la femme de ma vie.'],
      ['nicolas', 31, 'Fan de musculation, protéines et développement personnel.'], ['alexandre', 34, 'Amateur de gastronomie.'],
      ['baptiste', 27, 'Je suis quelqu’un de simple.'], ['hugo', 30, 'Je cherche une connexion authentique.'],
    ];
    for (const [id, age, bio] of spec) { const p = profileById(id)!; expect(p, id).toBeTruthy(); expect(p.age).toBe(age); expect(p.bio).toBe(bio); }
  });
  it('apparences toutes différentes (coiffure, peau, tenue, décor)', () => {
    const sig = PROFILES.map((p) => [p.look.hair, p.look.skin, p.look.outfit, p.look.bg, p.look.hairColor, p.look.top].join('|'));
    expect(new Set(sig).size).toBe(PROFILES.length);
    expect(new Set(PROFILES.map((p) => p.look.bg)).size).toBeGreaterThanOrEqual(18);
  });
  it('Maxime : l’accroche demandée et ses trois réponses', () => {
    const m = profileById('maxime')!;
    const s = nodeOf(m, m.start)!;
    expect(s.say[0]).toBe('Salut, tu cherches quoi ici ?');
    expect(s.ch.map((c) => c.t)).toEqual(['Du sérieux, et toi ?', 'Je regarde un peu.', 'Ça dépend, tu proposes quoi ?']);
  });
  it('Thomas : transparent, Radia choisit (fin « pas pour moi » possible)', () => {
    const t = profileById('thomas')!;
    expect(nodeOf(t, t.start)!.say.join(' ')).toMatch(/couple libre/);
    expect(t.nodes.filter((n) => n.end).length).toBeGreaterThanOrEqual(3);
  });
});

describe('Tindeur jouable : arbres de dialogue bien formés', () => {
  for (const p of PROFILES) {
    it(`${p.name} : arbre valide`, () => {
      const ids = p.nodes.map((n) => n.id);
      expect(new Set(ids).size, 'ids uniques').toBe(ids.length);
      expect(nodeOf(p, p.start)).toBeTruthy();
      const reach = new Set<string>();
      const go = (id: string) => { if (reach.has(id)) return; reach.add(id); for (const c of nodeOf(p, id)!.ch) go(c.to); };
      go(p.start);
      expect([...reach].sort(), 'aucun nœud orphelin').toEqual([...ids].sort());
      for (const n of p.nodes) {
        expect(n.say.length, `${n.id} dit quelque chose`).toBeGreaterThan(0);
        for (const t of n.say) expect(t.trim().length).toBeGreaterThan(0);
        for (const c of n.ch) { expect(c.t.trim().length).toBeGreaterThan(0); expect(nodeOf(p, c.to), `${n.id}→${c.to}`).toBeTruthy(); }
        if (n.end) { expect(n.ch.length).toBe(0); expect(n.end.title.trim()).not.toBe(''); expect(n.end.note.trim()).not.toBe(''); }
        else expect(n.ch.length, `${n.id} a au moins 2 réponses`).toBeGreaterThanOrEqual(2);
      }
      const lens = paths(p); // lève en cas de cycle ou de cul-de-sac
      expect(Math.min(...lens), 'au moins 3 messages sur le chemin le plus court').toBeGreaterThanOrEqual(3);
      expect(Math.max(...lens), 'au moins 4 échanges').toBeGreaterThanOrEqual(4);
      expect(p.nodes.filter((n) => n.end).length, 'plusieurs fins').toBeGreaterThanOrEqual(3);
      expect(p.nodes.some((n) => n.ch.some((c) => c.ask)), 'une question possible').toBe(true);
      expect(p.tags.length).toBeGreaterThanOrEqual(3);
      expect(p.like).toBeGreaterThan(0.4);
    });
  }
  it('textes : aucun mot grossier, aucun nom de vraie marque de rencontres', () => {
    const all = PROFILES.flatMap((p) => [p.bio, ...p.nodes.flatMap((n) => [...n.say, ...n.ch.map((c) => c.t), n.end?.note ?? '', n.end?.title ?? ''])]).join(' ').toLowerCase();
    for (const w of ['merde', 'putain', 'salope', 'bite', 'tinder', 'bumble', 'meetic', 'sexe']) expect(all.includes(w), w).toBe(false);
  });
  it('plusieurs profils sympathiques / respectueux (probabilité de match élevée)', () => {
    expect(PROFILES.filter((p) => p.like >= 0.85).length).toBeGreaterThanOrEqual(8);
  });
});
