import { describe, it, expect } from 'vitest';
import { defaultSave, type SaveData } from '../src/save/schema';
import { hubStatus, markDressingSeen, ensureDressingBaseline, affordableRoom, newWardrobeItems, DRESS_SEEN_KEY, type HubId } from '../src/ui/screens/world/hub/state';
import { FAN_TIERS, ROOM_IDS } from '../src/data/world/ids';
import { FLOWERS } from '../src/data/world/garden';
import { salaryAmount } from '../src/game/world/careers';

const NOW = 1_800_000_000_000;
const fresh = (): SaveData => defaultSave();
const st = (d: SaveData, now = NOW) => hubStatus(d, now);
const IDS: HubId[] = ['castle', 'dressing', 'garden', 'choc', 'family', 'cat', 'career', 'fans'];
/** Une partie « calme » : rien à signaler nulle part. */
function calm(): SaveData {
  const d = fresh();
  const w = d.world;
  w.res.coins = 0;
  ensureDressingBaseline(w);
  w.family.kids.kid1.bond = 99; w.family.kids.kid2.bond = 99; w.family.kids.kid3.bond = 99; // complicité au maximum
  w.garden.plots = [null, null, null, null];
  return d;
}

describe('hubStatus : forme générale', () => {
  it('chaque carte a un titre et un sous-texte français non vides', () => {
    const s = st(fresh());
    for (const k of IDS) { expect(s[k].title.length).toBeGreaterThan(2); expect(s[k].sub.length).toBeGreaterThan(2); }
  });
  it('partie neuve : libellés par défaut et progression réelle du château', () => {
    const s = st(fresh());
    expect(s.castle.title).toBe('Le château de Radia ♡');
    expect(s.castle.sub).toBe('3 pièces sur 9 débloquées');
    expect(s.dressing).toEqual({ title: 'Mon dressing', sub: 'Crée ton prochain look' });
    expect(s.cat.badge).toBe('new');
    expect(s.cat.sub).toBe('Adopte ton compagnon');
    expect(s.career.sub).toBe('Choisis ta voie');
    expect(s.fans.sub).toBe('0 fan');
  });
  it('aucun prénom d\'enfant ni lien de photo dans les textes', () => {
    const d = fresh();
    d.world.cat.adopted = true; d.world.cat.name = 'Neige';
    d.world.res.coins = 5000; d.world.res.flowers = 20; d.world.res.cocoa = 50;
    const dump = JSON.stringify(st(d));
    expect(dump).not.toMatch(/qegA2s1K0wrsiykgFs8COZXQMfs7HggX/);
    expect(dump).not.toMatch(/kid\d/);
  });
  it('ne modifie jamais la sauvegarde', () => {
    const d = fresh();
    const before = JSON.stringify(d.world);
    st(d); st(d, NOW + 9e6);
    expect(JSON.stringify(d.world)).toBe(before);
  });
});

describe('château', () => {
  it('compte les pièces réellement débloquées', () => {
    const d = fresh();
    d.world.castle.unlocked = [...ROOM_IDS];
    expect(st(d).castle.sub).toBe('9 pièces sur 9 débloquées');
    d.world.castle.unlocked = ['bedroom'];
    expect(st(d).castle.sub).toBe('1 pièce sur 9 débloquée');
  });
  it('« Nouvelle pièce disponible » seulement si les pièces suffisent', () => {
    const d = fresh();
    d.world.res.coins = 149;
    expect(st(d).castle.badge).toBeUndefined();
    expect(st(d).castle.hint).toBeUndefined();
    expect(affordableRoom(d.world)).toBeNull();
    d.world.res.coins = 150;
    expect(st(d).castle.badge).toBe('new');
    expect(st(d).castle.hint).toMatch(/^Nouvelle pièce disponible/);
    expect(affordableRoom(d.world)).toBe('kid1');
  });
  it('plus rien quand tout est débloqué, même riche', () => {
    const d = fresh();
    d.world.castle.unlocked = [...ROOM_IDS]; d.world.res.coins = 99999;
    expect(st(d).castle.badge).toBeUndefined();
  });
});

describe('dressing', () => {
  it('rien de nouveau avant la première ouverture (pas de baseline)', () => {
    const d = fresh();
    d.world.wardrobe.owned.push('bg-silver');
    expect(newWardrobeItems(d.world)).toEqual([]);
    expect(st(d).dressing.badge).toBeUndefined();
  });
  it('« Nouveau sac débloqué ! » seulement pour un sac non vu', () => {
    const d = fresh();
    ensureDressingBaseline(d.world);
    expect(d.world.extra[DRESS_SEEN_KEY]).toBe(d.world.wardrobe.owned.length);
    expect(st(d).dressing.sub).toBe('Crée ton prochain look');
    d.world.wardrobe.owned.push('bg-silver');
    expect(st(d).dressing).toMatchObject({ sub: 'Nouveau sac débloqué !', badge: 'new' });
    markDressingSeen(d.world);
    expect(st(d).dressing.badge).toBeUndefined();
  });
  it('le message suit le type de pièce reçue', () => {
    const d = fresh(); ensureDressingBaseline(d.world);
    d.world.wardrobe.owned.push('dr-royal-gown');
    expect(st(d).dressing.sub).toBe('Nouvelle robe débloquée !');
    markDressingSeen(d.world); d.world.wardrobe.owned.push('sh-heels');
    expect(st(d).dressing.sub).toBe('Nouvelles chaussures débloquées !');
    markDressingSeen(d.world); d.world.wardrobe.owned.push('ac-pearls');
    expect(st(d).dressing.sub).toBe('Nouvel accessoire débloqué !');
    markDressingSeen(d.world); d.world.wardrobe.owned.push('jk-denim');
    expect(st(d).dressing.sub).toBe('Nouveau vêtement débloqué !');
  });
  it('les options de visage gratuites ne comptent pas comme nouveautés', () => {
    const d = fresh(); ensureDressingBaseline(d.world);
    d.world.wardrobe.owned.push('ey-green');
    expect(st(d).dressing.badge).toBeUndefined();
  });
  it('la baseline existante n\'est pas écrasée', () => {
    const d = fresh(); d.world.extra[DRESS_SEEN_KEY] = 2;
    ensureDressingBaseline(d.world);
    expect(d.world.extra[DRESS_SEEN_KEY]).toBe(2);
    expect(newWardrobeItems(d.world).length).toBe(d.world.wardrobe.owned.length - 2);
  });
});

describe('jardin', () => {
  it('« prête » seulement quand une fleur a fini de pousser', () => {
    const d = calm();
    d.world.garden.plots[0] = { flower: 'daisy', plantedAt: NOW - 5000, stage: 0 };
    expect(st(d).garden.sub).toBe('Tes fleurs poussent');
    expect(st(d).garden.badge).toBeUndefined();
    expect(st(d).garden.hint).toMatch(/^Prochaine floraison dans /);
    d.world.garden.plots[0] = { flower: 'daisy', plantedAt: NOW - FLOWERS.daisy.growMs - 1, stage: 0 };
    expect(st(d).garden).toMatchObject({ sub: 'Une fleur est prête !', badge: 'reward' });
    d.world.garden.plots[1] = { flower: 'rose', plantedAt: NOW - FLOWERS.rose.growMs, stage: 0 };
    expect(st(d).garden.sub).toBe('2 fleurs sont prêtes !');
  });
  it('« Compose ton premier bouquet » : fleurs récoltées et jamais de bouquet', () => {
    const d = calm();
    d.world.garden.harvested = { rose: 2 };
    expect(st(d).garden.sub).not.toMatch(/bouquet/);
    d.world.garden.harvested = { rose: 2, daisy: 1 };
    expect(st(d).garden).toMatchObject({ sub: 'Compose ton premier bouquet', badge: 'quest' });
    d.world.extra['garden.bouquetsMade'] = 1;
    expect(st(d).garden.sub).not.toMatch(/bouquet/);
  });
  it('« Plante de nouvelles fleurs » : parcelle libre et de quoi planter', () => {
    const d = calm();
    d.world.res.flowers = 0;
    expect(st(d).garden.sub).toBe('Fais fleurir ton royaume');
    d.world.res.flowers = 1;
    expect(st(d).garden).toMatchObject({ sub: 'Plante de nouvelles fleurs', badge: 'quest' });
  });
  it('ne montre plus « 8/8 parcelles »', () => {
    const d = calm();
    expect(JSON.stringify(st(d).garden)).not.toMatch(/parcelles/);
  });
});

describe('chocolaterie', () => {
  it('« Crée ton premier chocolat » : jamais fabriqué ET ingrédients suffisants', () => {
    const d = calm();
    expect(st(d).choc.sub).toBe('Prépare tes créations');
    d.world.res.cocoa = 4;
    expect(st(d).choc).toMatchObject({ sub: 'Crée ton premier chocolat', badge: 'quest' });
    d.world.choc.collection = ['milk'];
    expect(st(d).choc.sub).toBe('Une fournée à préparer');
    expect(st(d).choc.badge).toBeUndefined();
  });
  it('recette à acheter : pièces et niveau de boutique suffisants', () => {
    const d = calm();
    d.world.res.coins = 119;
    expect(st(d).choc.badge).toBeUndefined();
    d.world.res.coins = 120;
    expect(st(d).choc).toMatchObject({ sub: 'Une nouvelle recette est disponible', badge: 'new' });
  });
  it('coffret à composer : au moins 4 chocolats en réserve', () => {
    const d = calm();
    d.world.choc.collection = ['milk'];
    d.world.extra['choc.stock.milk'] = 3;
    expect(st(d).choc.sub).not.toMatch(/coffret/);
    d.world.extra['choc.stock.dark'] = 1;
    expect(st(d).choc.sub).toBe('Un coffret à composer');
  });
});

describe('famille', () => {
  it('visite possible puis plus après une visite récente', () => {
    const d = fresh();
    expect(st(d).family).toMatchObject({ sub: 'Un moment en famille t\'attend', badge: 'quest' });
    for (const k of ['kid1', 'kid2', 'kid3']) d.world.extra[`family.visit.${k}`] = NOW - 60_000;
    expect(st(d).family.badge).toBeUndefined();
    expect(st(d).family.sub).toBe('Partage de jolis moments');
    expect(st(d, NOW + 6 * 60_000).family.badge).toBe('quest');
  });
  it('complicité maximale : pas d\'invitation à visiter', () => {
    expect(st(calm()).family.sub).toBe('Partage de jolis moments');
  });
  it('scène du jardin : après un bouquet, tant qu\'elle n\'est pas vue', () => {
    const d = calm();
    d.world.garden.bouquets = { 'daisy+rose+tulip': 1 };
    expect(st(d).family).toMatchObject({ sub: 'Une nouvelle scène t\'attend', badge: 'new' });
    d.world.flags['scene.family.garden'] = true;
    expect(st(d).family.badge).toBeUndefined();
  });
});

describe('chat', () => {
  it('non adopté : invitation à adopter', () => {
    expect(st(fresh()).cat).toMatchObject({ title: 'Mon chat', sub: 'Adopte ton compagnon', badge: 'new' });
  });
  it('adopté : le nom sauvegardé, aucune invitation à adopter', () => {
    const d = calm(); d.world.cat.adopted = true; d.world.cat.name = 'Praline';
    expect(st(d).cat).toEqual({ title: 'Mon chat', sub: 'Praline' });
  });
  it('un cadeau abordable est signalé, sinon rien', () => {
    const d = calm(); d.world.cat.adopted = true; d.world.cat.name = 'Praline';
    d.world.res.coins = 39;
    expect(st(d).cat.badge).toBeUndefined();
    d.world.res.coins = 40;
    expect(st(d).cat).toMatchObject({ sub: 'Un cadeau pour ton chat', badge: 'new' });
    d.world.cat.items = ['cushion', 'toy-ball', 'collar-bell', 'basket'];
    expect(st(d).cat.badge).toBeUndefined();
  });
});

describe('carrière', () => {
  it('sous-texte selon la carrière en cours', () => {
    const d = calm();
    d.world.extra['career.salary.ts'] = NOW;
    const subs: Record<string, string> = { photo: 'Prochain shooting', model: 'Prochain défilé', actress: 'Prochain tournage', singer: 'Prochain concert' };
    for (const [id, txt] of Object.entries(subs)) {
      d.world.careers.current = id;
      expect(st(d).career.sub).toMatch(/^Prochain salaire dans /); // ligne principale : le vrai délai du salaire
      expect(st(d).career.hint).toContain(txt); // la prochaine activité reste indiquée en dessous
      expect(st(d).career.badge).toBeUndefined();
    }
  });
  it('salaire prêt : récompense, sinon rien', () => {
    const d = calm(); d.world.careers.current = 'photo';
    expect(st(d).career).toMatchObject({ sub: 'Salaire à toucher', badge: 'salary' });
    d.world.extra['career.salary.ts'] = NOW - 1000;
    expect(st(d).career.badge).toBeUndefined();
    expect(st(d, NOW + 4 * 3600_000).career.badge).toBe('salary');
  });
  it('salaire pas prêt : le VRAI délai restant est affiché (jamais un faux délai)', () => {
    const d = calm(); d.world.careers.current = 'photo';
    d.world.extra['career.salary.ts'] = NOW - 1000; // touché il y a 1 s ; cooldown réel = 4 h
    expect(st(d).career.sub).toBe('Prochain salaire dans 4 h 00');
    expect(st(d, NOW + 3 * 3600_000 + 30 * 60_000).career.sub).toBe('Prochain salaire dans 30 min');
  });
  it('salaire prêt : le montant du badge est le montant réel calculé par le jeu', () => {
    const d = calm(); d.world.careers.current = 'photo';
    const amount = salaryAmount(d.world);
    expect(st(d).career.hint).toBe(`${amount.toLocaleString('fr-FR')} pièces t'attendent`);
  });
  it('aucune carrière : « Choisis ta voie », même si le salaire serait prêt', () => {
    const d = calm();
    expect(st(d).career).toMatchObject({ sub: 'Choisis ta voie', badge: 'new' });
  });
  it('une carrière inconnue dans la sauvegarde ne casse rien', () => {
    const d = calm(); d.world.careers.current = 'inconnue';
    expect(st(d).career.sub).toBe('Choisis ta voie');
  });
  it('ne crée pas d\'entrée de progression', () => {
    const d = calm(); d.world.careers.current = 'singer'; delete d.world.careers.progress.singer;
    st(d);
    expect(d.world.careers.progress.singer).toBeUndefined();
  });
});

describe('fans', () => {
  it('affiche la vraie valeur sauvegardée', () => {
    const d = calm(); d.world.fans = 33; d.world.fansTierSeen = 0;
    expect(st(d).fans.sub).toBe('33 fans');
    expect(st(d).fans.hint).toBe('Prochain palier : 100 fans');
    expect(st(d).fans.badge).toBeUndefined();
    d.world.fans = 1; expect(st(d).fans.sub).toBe('1 fan');
    d.world.fans = 12345; d.world.fansTierSeen = 2;
    expect(st(d).fans.sub).toMatch(/^12\s345 fans$/);
  });
  it('récompense seulement si un palier atteint n\'a pas été vu', () => {
    const d = calm(); d.world.fans = FAN_TIERS[0]; d.world.fansTierSeen = -1;
    expect(st(d).fans.badge).toBe('reward');
    d.world.fansTierSeen = 0;
    expect(st(d).fans.badge).toBeUndefined();
    d.world.fans = FAN_TIERS[1] - 1;
    expect(st(d).fans.badge).toBeUndefined();
    d.world.fans = FAN_TIERS[1];
    expect(st(d).fans.badge).toBe('reward');
  });
  it('au dernier palier : pas de « prochain palier »', () => {
    const d = calm(); d.world.fans = FAN_TIERS[FAN_TIERS.length - 1]; d.world.fansTierSeen = FAN_TIERS.length - 1;
    expect(st(d).fans.hint).toBeUndefined();
  });
});

describe('isolation des messages', () => {
  it('une partie calme ne signale rien', () => {
    const s = st(calm());
    for (const k of IDS) if (k !== 'cat' && k !== 'career') expect(s[k].badge, k).toBeUndefined();
  });
  it('un changement dans un domaine ne touche pas les autres cartes', () => {
    const base = st(calm());
    const d = calm(); d.world.garden.plots[0] = { flower: 'daisy', plantedAt: 0, stage: 3 };
    const s = st(d);
    for (const k of IDS) if (k !== 'garden') expect(s[k], k).toEqual(base[k]);
    expect(s.garden).not.toEqual(base.garden);
  });
});
