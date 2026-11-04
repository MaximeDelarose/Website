import { describe, it, expect } from 'vitest';
import { defaultSave, sanitize, type SaveData } from '../src/save/schema';
import { PLACES, PLACE_IDS, STAGES, type PlaceId, type Obj } from '../src/domain/places';
import * as L from '../src/domain/logic';
import type { BoardEvent } from '../src/game/merge/types';

const NOW = 1_800_000_000_000;
function game(): { d: SaveData; c: L.Ctx; dia: number[]; hearts: number[] } {
  const d = defaultSave();
  d.story.endingSeen = true; d.fun.free.unlocked = true;
  const dia: number[] = [];
  const hearts: number[] = [];
  const c: L.Ctx = { fun: d.fun, world: d.world, free: true, diamonds: (n) => dia.push(n), hearts: (n) => hearts.push(n) };
  return { d, c, dia, hearts };
}
const rich = (d: SaveData) => { d.world.res = { coins: 99999, flowers: 999, fabric: 999, cocoa: 999 }; };

/** Satisfait un objectif en écrivant l'état réel (compteurs moteur, album, monde…). */
function satisfy(d: SaveData, id: PlaceId, stage: number, o: Obj): void {
  const ps = (d.fun.places[id] ??= { stage, progress: {}, done: false, seen: false, choices: {} });
  switch (o.k) {
    case 'orders': case 'deliver': ps.progress[L.objKey(stage, o)] = o.n; break;
    case 'reach': d.fun.endless2.counters[`maxL:${o.coll}`] = o.l; break;
    case 'discover': for (let i = 0; i < o.n; i++) d.fun.endless2.album.push(o.coll ? `${o.coll}:${i + 1}` : `x:${i + 1}`); break;
    case 'gen': d.fun.endless2.gens[`gen:${o.coll}`] = { level: o.l, xp: 0 }; break;
    case 'rooms': d.world.castle.unlocked = ['bedroom', 'salon', 'garden', 'dressing', 'reception', 'familySalon', 'kid1', 'kid2', 'kid3'].slice(0, o.n) as never; break;
    case 'placed': for (let i = 0; i < o.n; i++) d.world.castle.rooms.salon.items.push({ uid: 1000 + i, id: 'plant-pot', x: 0, y: 0, color: 'peach' }); break;
    case 'bouquets': d.world.extra['garden.bouquetsMade'] = o.n; break;
    case 'chocmade': d.world.choc.made.milk = o.n; break;
    case 'shop': d.world.choc.shopLevel = o.n; break;
    case 'wardrobe': for (let i = 0; i < o.n; i++) d.world.wardrobe.owned.push(['top-tee-pink', 'top-hoodie-cream', 'dr-denim', 'dr-gingham-red', 'jk-denim', 'sh-flats-red', 'ac-scarf', 'ac-hoops', 'top-blouse-silk'][i]); break;
    case 'fans': d.world.fans = o.n; break;
  }
}
/** Fait avancer un lieu jusqu'au bout, en respectant tout. */
function renovateAll(g: ReturnType<typeof game>, id: PlaceId): void {
  rich(g.d);
  for (let s = 0; s < STAGES; s++) {
    for (const r of PLACES[id].reqs) if (r.k === 'place') renovateTo(g, r.id, r.stage); else if (r.k === 'rooms') satisfy(g.d, id, s, { k: 'rooms', n: r.n }); else g.d.world.choc.shopLevel = r.n;
    PLACES[id].stages[s].objs.forEach((o) => satisfy(g.d, id, s, o));
    for (const ch of PLACES[id].choices.filter((x) => x.at === s)) L.choose(g.c, id, ch.id, ch.options[0]);
    rich(g.d);
    const r = L.advanceStage(g.c, id);
    expect(r.ok).toBe(true);
  }
}
function renovateTo(g: ReturnType<typeof game>, id: PlaceId, stage: number): void {
  rich(g.d);
  while (L.stageOf(g.d.fun, id) < stage) {
    const s = L.stageOf(g.d.fun, id);
    for (const r of PLACES[id].reqs) if (r.k === 'place') renovateTo(g, r.id, r.stage); else if (r.k === 'rooms') satisfy(g.d, id, s, { k: 'rooms', n: r.n }); else g.d.world.choc.shopLevel = r.n;
    PLACES[id].stages[s].objs.forEach((o) => satisfy(g.d, id, s, o));
    for (const ch of PLACES[id].choices.filter((x) => x.at === s)) L.choose(g.c, id, ch.id, ch.options[0]);
    rich(g.d);
    expect(L.advanceStage(g.c, id).ok).toBe(true);
  }
}

describe('lieux : statut et prérequis', () => {
  it('avant le mode libre, tout est verrouillé et rien ne se rénove', () => {
    const g = game(); g.c.free = false; rich(g.d);
    expect(L.stageView(g.c, 'tea').status).toBe('locked');
    PLACES.tea.stages[0].objs.forEach((o) => satisfy(g.d, 'tea', 0, o));
    L.choose(g.c, 'tea', 'wall', 'rose');
    expect(L.advanceStage(g.c, 'tea')).toEqual({ ok: false, reason: 'free' });
    expect(L.noteDelivery(g.c, [{ c: 'flowers' }])).toEqual([]);
  });
  it('mode libre : salon de thé et boutique de fleurs sont disponibles ; les autres verrouillés', () => {
    const g = game();
    const st = Object.fromEntries(PLACE_IDS.map((id) => [id, L.stageView(g.c, id).status]));
    expect(st.tea).toBe('available');
    expect(st.flowers).toBe('available');
    expect(st.restaurant).toBe('locked');
    expect(st.casino).toBe('locked');
    expect(st.choc).toBe('locked');
  });
  it('le Casino Royal exige l\'hôtel ET la terrasse ouverts', () => {
    const g = game();
    renovateTo(g, 'hotel', STAGES);
    expect(L.stageView(g.c, 'casino').status).toBe('locked');
    renovateTo(g, 'terrace', STAGES);
    expect(L.stageView(g.c, 'casino').status).toBe('available');
  });
});

describe('rénovation : étapes, objectifs, coûts', () => {
  it('chaque lieu a 4 étapes et passe de 0 à 4 (ouvert)', () => {
    for (const id of PLACE_IDS) {
      const g = game();
      expect(PLACES[id].stages.length).toBe(STAGES);
      renovateAll(g, id);
      expect(L.stageOf(g.d.fun, id)).toBe(STAGES);
      expect(L.stageView(g.c, id).status).toBe('open');
      expect(g.d.fun.places[id].done).toBe(true);
    }
  });
  it('objectifs non atteints : refus, rien n\'est dépensé ni donné', () => {
    const g = game(); rich(g.d);
    L.choose(g.c, 'tea', 'wall', 'rose');
    const before = JSON.stringify([g.d.world, g.d.fun.places]);
    expect(L.advanceStage(g.c, 'tea')).toEqual({ ok: false, reason: 'objectives' });
    expect(JSON.stringify([g.d.world, g.d.fun.places])).toBe(before);
  });
  it('choix manquant : refus ; une fois choisi, accepté et persisté', () => {
    const g = game(); rich(g.d);
    PLACES.tea.stages[0].objs.forEach((o) => satisfy(g.d, 'tea', 0, o));
    expect(L.advanceStage(g.c, 'tea')).toEqual({ ok: false, reason: 'choice' });
    expect(L.choose(g.c, 'tea', 'wall', 'sage')).toBe(true);
    expect(L.choose(g.c, 'tea', 'wall', 'noir')).toBe(false); // option hors liste
    expect(L.advanceStage(g.c, 'tea').ok).toBe(true);
    const back = sanitize(JSON.parse(JSON.stringify(g.d)));
    expect(back.fun.places.tea.choices.wall).toBe('sage');
    expect(back.fun.places.tea.stage).toBe(1);
  });
  it('coût atomique : une ressource manque ⇒ rien n\'est prélevé', () => {
    const g = game();
    PLACES.tea.stages[0].objs.forEach((o) => satisfy(g.d, 'tea', 0, o));
    L.choose(g.c, 'tea', 'wall', 'cream');
    g.d.world.res = { coins: 5000, flowers: 3, fabric: 0, cocoa: 0 }; // il manque 1 fleur (4 requises)
    const r = L.advanceStage(g.c, 'tea');
    expect(r).toEqual({ ok: false, reason: 'cost' });
    expect(g.d.world.res).toEqual({ coins: 5000, flowers: 3, fabric: 0, cocoa: 0 });
    expect(L.stageOf(g.d.fun, 'tea')).toBe(0);
    g.d.world.res.flowers = 4;
    const ok = L.advanceStage(g.c, 'tea');
    expect(ok.ok).toBe(true);
    expect(g.d.world.res.coins).toBe(5000 - 120);
    expect(g.d.world.res.flowers).toBe(0);
  });
  it('prérequis non remplis : refus', () => {
    const g = game(); rich(g.d);
    PLACES.restaurant.stages[0].objs.forEach((o) => satisfy(g.d, 'restaurant', 0, o));
    L.choose(g.c, 'restaurant', 'wall', 'peach');
    expect(L.advanceStage(g.c, 'restaurant')).toEqual({ ok: false, reason: 'locked' });
  });
  it('lieu ouvert : on ne peut plus avancer', () => {
    const g = game(); renovateAll(g, 'tea');
    expect(L.advanceStage(g.c, 'tea')).toEqual({ ok: false, reason: 'done' });
  });
});

describe('récompenses : uniques, réelles, sans double versement', () => {
  it('meubles et vêtements sont versés une fois ; un vêtement déjà possédé donne des pièces', () => {
    const g = game(); rich(g.d);
    g.d.world.wardrobe.owned.push('dr-sundress-yellow');
    renovateTo(g, 'tea', 3);
    const coinsBefore = g.d.world.res.coins;
    expect(g.d.world.castle.owned['armchair']).toBe(2);
    expect(g.d.world.castle.owned['flower-vase']).toBe(2);
    // stage 2 (nappes et fleurs) : le vêtement est un doublon ⇒ compensation pièces, pas de 2e exemplaire
    expect(g.d.world.wardrobe.owned.filter((x) => x === 'dr-sundress-yellow').length).toBe(1);
    expect(coinsBefore).toBeGreaterThan(0);
  });
  it('rappeler l\'avancement ne reverse pas les récompenses de l\'étape déjà payée', () => {
    const g = game(); rich(g.d);
    PLACES.tea.stages[0].objs.forEach((o) => satisfy(g.d, 'tea', 0, o));
    L.choose(g.c, 'tea', 'wall', 'cream');
    const first = L.advanceStage(g.c, 'tea');
    expect(first.ok && first.granted.length).toBe(1);
    expect(g.d.world.castle.owned['lamp-table']).toBe(1);
    // on simule une relance de l'étape 0 (sauvegarde bidouillée) : marqueur rw.0 présent ⇒ pas de nouveau meuble
    g.d.fun.places.tea.stage = 0; g.d.fun.places.tea.done = false;
    const again = L.advanceStage(g.c, 'tea');
    expect(again.ok && again.granted.length).toBe(0);
    expect(g.d.world.castle.owned['lamp-table']).toBe(1);
  });
  it('récompenses spéciales : recette du Coffret royal, fleur de lune, diamants', () => {
    const g = game();
    renovateAll(g, 'flowers');
    expect(g.d.world.garden.unlocked).toContain('magic');
    renovateAll(g, 'choc');
    expect(g.d.world.choc.recipes).toContain('royalbox');
    expect(g.dia.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(5);
  });
});

describe('objectifs : comptage', () => {
  const deliver = (colls: string[]): BoardEvent => ({ t: 'deliver', slot: 0, cells: [], hearts: 1, points: 1, items: colls.map((c) => ({ c: c as never, l: 2 })) });
  it('orders / deliver comptent depuis que l\'étape est active, plafonnés à l\'objectif', () => {
    const g = game();
    const ev = [deliver(['flowers']), deliver(['love'])];
    expect(L.noteBoardEvents(g.c, ev)).toContain('tea');
    expect(g.d.fun.places.tea.progress[L.objKey(0, { k: 'orders', n: 3 })]).toBe(2);
    // même événement rejoué : aucun double comptage
    L.noteBoardEvents(g.c, ev);
    expect(g.d.fun.places.tea.progress[L.objKey(0, { k: 'orders', n: 3 })]).toBe(2);
    for (let i = 0; i < 10; i++) L.noteBoardEvents(g.c, [deliver(['flowers'])]);
    expect(g.d.fun.places.tea.progress[L.objKey(0, { k: 'orders', n: 3 })]).toBe(3);
  });
  it('un lieu verrouillé (prérequis) ne compte pas ; deliver ne compte que la collection demandée', () => {
    const g = game();
    L.noteBoardEvents(g.c, [deliver(['choc'])]);
    expect(g.d.fun.places.restaurant).toBeUndefined();
    // salon de thé étape 2 : livrer fleurs
    renovateTo(g, 'tea', 1);
    L.noteBoardEvents(g.c, [deliver(['love']), deliver(['flowers'])]);
    expect(g.d.fun.places.tea.progress[L.objKey(1, { k: 'deliver', coll: 'flowers', n: 2 })]).toBe(1);
  });
  it('reach lit le compteur du moteur ou l\'album ; discover compte l\'album', () => {
    const g = game();
    const v = (o: Obj) => L.objView(g.c, 'tea', 1, o);
    expect(v({ k: 'reach', coll: 'flowers', l: 4 }).have).toBe(0);
    g.d.fun.endless2.counters['maxL:flowers'] = 3;
    expect(v({ k: 'reach', coll: 'flowers', l: 4 })).toMatchObject({ have: 3, need: 4, done: false });
    g.d.fun.endless2.album.push('flowers:5');
    expect(v({ k: 'reach', coll: 'flowers', l: 4 }).done).toBe(true);
    g.d.fun.endless2.album.push('choc:1', 'choc:2');
    expect(v({ k: 'discover', coll: 'choc', n: 2 }).done).toBe(true);
    expect(v({ k: 'discover', n: 3 }).have).toBe(3);
  });
  it('objectifs « monde » : pièces, meubles posés, bouquets, chocolats, vêtements possédés', () => {
    const g = game();
    const v = (o: Obj) => L.objView(g.c, 'wing', 0, o);
    expect(v({ k: 'rooms', n: 4 }).have).toBe(3);
    g.d.world.castle.unlocked.push('dressing');
    expect(v({ k: 'rooms', n: 4 }).done).toBe(true);
    g.d.world.extra['garden.bouquetsMade'] = 2;
    expect(v({ k: 'bouquets', n: 2 }).done).toBe(true);
    g.d.world.choc.made = { milk: 4, dark: 3 };
    expect(v({ k: 'chocmade', n: 7 }).done).toBe(true);
    expect(v({ k: 'wardrobe', n: 1 }).have).toBe(0); // les pièces de départ ne comptent pas
    g.d.world.wardrobe.owned.push('dr-denim');
    expect(v({ k: 'wardrobe', n: 1 }).done).toBe(true);
  });
  it('les libellés sont en français et lisibles', () => {
    const g = game();
    for (const id of PLACE_IDS) PLACES[id].stages.forEach((st, i) => st.objs.forEach((o) => {
      const t = L.objView(g.c, id, i, o).label;
      expect(t.length).toBeGreaterThan(8);
      expect(t).not.toMatch(/undefined|NaN|\[object/);
    }));
  });
});

describe('services réguliers', () => {
  it('fermé tant que le lieu n\'est pas ouvert ; délai respecté ; gain unique par délai', () => {
    const g = game();
    expect(L.claimService(g.c, 'tea', 'roses', NOW)).toEqual({ ok: false, reason: 'closed' });
    renovateAll(g, 'tea');
    g.d.world.res = { coins: 0, flowers: 0, fabric: 0, cocoa: 0 };
    const r = L.claimService(g.c, 'tea', 'roses', NOW);
    expect(r.ok).toBe(true);
    expect(g.d.world.res.coins).toBe(40);
    expect(g.d.world.res.flowers).toBe(2);
    expect(L.claimService(g.c, 'tea', 'roses', NOW + 1000)).toEqual({ ok: false, reason: 'wait' });
    expect(g.d.world.res.coins).toBe(40);
    expect(L.serviceReady(g.c, 'tea', NOW + 20 * 60_000)).toBe(true);
    const h = L.claimService(g.c, 'tea', 'chaud', NOW + 20 * 60_000);
    expect(h.ok && h.hearts).toBe(2);
    expect(g.hearts).toEqual([2]);
    expect(L.claimService(g.c, 'tea', 'nope', NOW + 99 * 60_000)).toEqual({ ok: false, reason: 'unknown' });
  });
  it('horloge reculée : pas de blocage infini', () => {
    const g = game(); renovateAll(g, 'tea');
    L.claimService(g.c, 'tea', 'roses', NOW);
    expect(L.serviceWaitMs(g.c, 'tea', NOW - 5 * 86_400_000)).toBeLessThanOrEqual(20 * 60_000);
  });
});

describe('carte du domaine', () => {
  it('états réels : verrouillé, à rénover (nouveau), prêt, ouvert, service à récupérer', () => {
    const g = game();
    let nodes = L.mapNodes(g.c, NOW);
    expect(nodes).toHaveLength(PLACE_IDS.length);
    expect(nodes.find((n) => n.id === 'tea')).toMatchObject({ status: 'available', badge: 'new' });
    expect(nodes.find((n) => n.id === 'casino')).toMatchObject({ status: 'locked' });
    expect(nodes.find((n) => n.id === 'casino')!.badge).toBeUndefined();
    // vu ⇒ plus « nouveau »
    L.markSeen(g.d.fun, 'tea');
    expect(L.mapNodes(g.c, NOW).find((n) => n.id === 'tea')!.badge).toBeUndefined();
    // prêt à rénover
    rich(g.d);
    PLACES.tea.stages[0].objs.forEach((o) => satisfy(g.d, 'tea', 0, o));
    L.choose(g.c, 'tea', 'wall', 'cream');
    expect(L.mapNodes(g.c, NOW).find((n) => n.id === 'tea')!.badge).toBe('quest');
    // ouvert + service prêt ⇒ récompense
    renovateAll(g, 'tea');
    nodes = L.mapNodes(g.c, NOW);
    expect(nodes.find((n) => n.id === 'tea')).toMatchObject({ status: 'open', badge: 'reward' });
    L.claimService(g.c, 'tea', 'roses', NOW);
    expect(L.mapNodes(g.c, NOW + 1000).find((n) => n.id === 'tea')!.badge).toBeUndefined();
  });
  it('avant le mode libre : tout est verrouillé avec la raison, aucun badge', () => {
    const g = game(); g.c.free = false;
    const nodes = L.mapNodes(g.c, NOW);
    expect(nodes.every((n) => n.status === 'locked' && !n.badge)).toBe(true);
    expect(nodes[0].hint).toMatch(/Mode libre/);
  });
  it('résumé du hub : jamais de badge inventé', () => {
    const g = game(); L.markSeen(g.d.fun, 'tea'); L.markSeen(g.d.fun, 'flowers');
    const s = L.domainSummary(g.c, NOW);
    expect(s).toMatchObject({ open: 0, ready: 0, services: 0, fresh: 0, total: 10 });
  });
});

describe('sauvegarde', () => {
  it('lire un lieu n\'écrit rien ; une sauvegarde absurde est nettoyée sans exception', () => {
    const g = game();
    L.stageView(g.c, 'tea'); L.mapNodes(g.c, NOW);
    expect(Object.keys(g.d.fun.places)).toHaveLength(0);
    const s = sanitize({ fun: { places: { tea: { stage: 99, done: 'x', progress: { a: 'b', c: 3 }, choices: { wall: 5 } }, '': 3, zzz: null } } });
    expect(s.fun.places.tea.stage).toBeLessThanOrEqual(99);
    expect(L.stageOf(s.fun, 'tea')).toBeLessThanOrEqual(STAGES);
    expect(s.fun.places.tea.progress).toEqual({ c: 3 });
    expect(s.fun.places.tea.choices).toEqual({});
  });
});
