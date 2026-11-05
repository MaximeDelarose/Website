/**
 * Règles du dressing (logique pure, sans DOM) : possession, achat, équipement,
 * coiffures, essayage, looks favoris, style dominant. Tout passe par
 * `save.data.world.wardrobe` ; les soldes sont débités via core/world (pièces,
 * tissus) et core/wallet (diamants) et ne deviennent jamais négatifs.
 *
 * Invariants garantis (même après un `sanitizeWorld` d'une sauvegarde abîmée) :
 *  - le look ne contient que des identifiants connus, rangés dans le bon emplacement ;
 *  - un seul élément par emplacement ; `dress` exclut `top` + `bottom` (et inversement) ;
 *  - au plus 3 accessoires distincts, une seule couronne ;
 *  - le look ne porte que des pièces possédées, la coiffure est possédée.
 */
import { save } from '../../core/app';
import { spendMany, canAfford, res } from '../../core/world';
import { wallet } from '../../core/wallet';
import { stat } from '../../core/progress';
import {
  CLOTH_IDS, CLOTH_SLOTS, NECKLACE_ID, DEFAULT_LOOK, HAIR_IDS, STARTER_CLOTHES,
  type ClothId, type ClothSlot, type HairId, type Look, type StyleId,
} from '../../data/world/ids';
import { CLOTHES, ELEGANT_CLOTHES, HAIRS, type ClothDef } from '../../data/world/wardrobe';
import { accGroup } from '../../data/world/ids';

export type PayWith = 'coins' | 'diamonds';
export type FailReason = 'unknown' | 'owned' | 'coins' | 'fabric' | 'diamonds' | 'no-diamond-price' | 'not-owned' | 'bad-slot' | 'empty-name' | 'gift';
export interface Result { ok: boolean; reason?: FailReason }

export const MAX_ACC = 14;
export const FAVORITE_SLOTS = 3;
export const NAME_MAX = 24;

type WardrobeState = ReturnType<typeof state>;
const state = () => save.data.world.wardrobe;

const isCloth = (id: unknown): id is ClothId => typeof id === 'string' && Object.prototype.hasOwnProperty.call(CLOTH_SLOTS, id);
const isHair = (id: unknown): id is HairId => typeof id === 'string' && (HAIR_IDS as readonly string[]).includes(id);
export const slotOf = (id: ClothId): ClothSlot => CLOTH_SLOTS[id];

export const sameLook = (a: Look, b: Look): boolean =>
  a.hair === b.hair && a.top === b.top && a.bottom === b.bottom && a.dress === b.dress && a.jacket === b.jacket &&
  a.shoes === b.shoes && a.bag === b.bag && a.crown === b.crown && a.acc.length === b.acc.length && a.acc.every((x, i) => x === b.acc[i]);

export const cloneLook = (l: Look): Look => ({ ...l, acc: [...l.acc] });

// ------------------------------------------------------------------ validité

/**
 * Rend un look structurellement valide : identifiants connus dans le bon emplacement,
 * robe exclusive, ≤ 3 accessoires distincts. Si `owned` est fourni, retire aussi
 * les pièces non possédées.
 */
export function repairLook(raw: Partial<Look> | null | undefined, owned?: ReadonlySet<string>): Look {
  const ok = (id: unknown, slot: ClothSlot): ClothId | null =>
    isCloth(id) && CLOTH_SLOTS[id] === slot && (!owned || owned.has(id)) ? id : null;
  const r = raw ?? {};
  const hair: HairId = isHair(r.hair) && (!owned || HAIRS[r.hair].starter || owned.has(r.hair)) ? r.hair : DEFAULT_LOOK.hair;
  const l: Look = {
    hair, top: ok(r.top, 'top'), bottom: ok(r.bottom, 'bottom'), dress: ok(r.dress, 'dress'),
    jacket: ok(r.jacket, 'jacket'), shoes: ok(r.shoes, 'shoes'), bag: ok(r.bag, 'bag'), acc: [], crown: ok(r.crown, 'crown'),
  };
  const accs = Array.isArray(r.acc) ? r.acc : [];
  for (const a of accs) {
    const c = ok(a, 'acc');
    if (!c || l.acc.includes(c)) continue;
    const g = accGroup(c);
    if (g) l.acc = l.acc.filter((x) => accGroup(x) !== g); // un seul objet par famille
    l.acc.push(c);
  }
  l.acc = l.acc.slice(-MAX_ACC);
  if (l.dress) { l.top = null; l.bottom = null; }
  return l;
}

/** Vrai si le look respecte toutes les règles (structure et, si fourni, possession). */
export function isValidLook(look: Look, owned?: ReadonlySet<string>): boolean {
  return sameLook(repairLook(look, owned), look);
}

const ownedSet = (w: WardrobeState = state()) => new Set<string>([...w.owned, ...w.hairOwned, ...STARTER_CLOTHES]);

/**
 * Remet l'état du dressing d'aplomb (à appeler à l'ouverture et appelé par chaque
 * action) : identifiants inconnus retirés, pièces de départ possédées, look valide.
 */
export function ensureWardrobe(): void {
  const w = state();
  const free = (Object.keys(CLOTHES) as ClothId[]).filter((id) => CLOTHES[id].free); // options de visage gratuites : toujours possédées
  // « L'Éclat Éternel ♡ » : possédé seulement si la scène du feu d'artifice l'a attribué (jamais par un autre chemin)
  const gifted = save.data.fun?.necklace?.owned === true;
  const owned = [...new Set([...STARTER_CLOTHES, ...free, ...w.owned.filter((id) => isCloth(id) && (id !== NECKLACE_ID || gifted))])];
  w.owned = owned;
  w.hairOwned = [...new Set<string>(['hair-loose', 'hair-wavy', ...w.hairOwned.filter(isHair)])];
  const os = new Set<string>([...owned, ...w.hairOwned]);
  w.look = repairLook(w.look, os);
  if (!Array.isArray(w.looks)) w.looks = [];
  while (w.looks.length < FAVORITE_SLOTS) w.looks.push(null);
  w.looks.length = FAVORITE_SLOTS;
  w.looks = w.looks.map((f, i) => (f && typeof f === 'object' ? { name: cleanName(f.name) ?? `Look ${i + 1}`, look: repairLook(f.look) } : null));
}

// ------------------------------------------------------------------ lecture

export const getLook = (): Look => { ensureWardrobe(); return state().look; };
export const owns = (id: ClothId): boolean => { ensureWardrobe(); return state().owned.includes(id); };
export const ownsHair = (id: HairId): boolean => { ensureWardrobe(); return state().hairOwned.includes(id); };
export const isEquipped = (id: ClothId): boolean => {
  const l = getLook();
  return l[slotOf(id)] === id || (slotOf(id) === 'acc' && l.acc.includes(id));
};

export interface Price { coins: number; fabric: number; diamonds: number }
export function priceOf(id: ClothId): Price {
  const d: ClothDef = CLOTHES[id];
  return { coins: d.coins, fabric: d.fabric ?? 0, diamonds: d.diamonds ?? 0 };
}
export const hairPrice = (id: HairId): number => HAIRS[id].coins;

// ------------------------------------------------------------------ achat

/** Peut-on acheter `id` avec ce moyen de paiement ? (ne débite rien). */
export function canBuy(id: ClothId, payWith: PayWith = 'coins'): Result {
  if (!isCloth(id)) return { ok: false, reason: 'unknown' };
  ensureWardrobe();
  if (state().owned.includes(id)) return { ok: false, reason: 'owned' };
  if (CLOTHES[id].gift || id === NECKLACE_ID) return { ok: false, reason: 'gift' }; // un cadeau ne s'achète jamais
  const p = priceOf(id);
  if (payWith === 'diamonds') {
    if (!p.diamonds) return { ok: false, reason: 'no-diamond-price' };
    return wallet.diamonds() >= p.diamonds ? { ok: true } : { ok: false, reason: 'diamonds' };
  }
  if (res('coins') < p.coins) return { ok: false, reason: 'coins' };
  if (res('fabric') < p.fabric) return { ok: false, reason: 'fabric' };
  return { ok: true };
}

/** Achète une pièce : débit réel des pièces + tissus, ou des diamants. Ne l'équipe pas. */
export function buy(id: ClothId, payWith: PayWith = 'coins'): Result {
  const c = canBuy(id, payWith);
  if (!c.ok) return c;
  const p = priceOf(id);
  if (payWith === 'diamonds') {
    if (!wallet.spendDiamonds(p.diamonds)) return { ok: false, reason: 'diamonds' };
  } else {
    const cost = { coins: p.coins, fabric: p.fabric };
    if (!canAfford(cost) || !spendMany(cost)) return { ok: false, reason: 'coins' };
  }
  state().owned.push(id);
  save.save();
  stat('world.wardrobe.bought');
  return { ok: true };
}

/** Pièce offerte (jamais en vente) ? */
export const isGift = (id: ClothId): boolean => !!CLOTHES[id]?.gift;

/**
 * Reçoit un cadeau (ex. le bracelet d'Auguste) : l'ajoute aux pièces possédées, sans rien débiter ni l'équiper.
 * Idempotent. Refuse tout ce qui n'est pas un cadeau (pas de contournement de la boutique).
 */
export function grantGift(id: ClothId): Result & { added?: boolean } {
  if (!isCloth(id)) return { ok: false, reason: 'unknown' };
  if (!CLOTHES[id].gift || id === NECKLACE_ID) return { ok: false, reason: 'unknown' }; // le collier légendaire n'a qu'une porte : la fin de la scène (src/events/necklace/grant.ts)
  ensureWardrobe();
  if (state().owned.includes(id)) return { ok: true, added: false };
  state().owned.push(id);
  save.save();
  return { ok: true, added: true };
}

export function canBuyHair(id: HairId, payWith: PayWith = 'coins'): Result {
  if (!isHair(id)) return { ok: false, reason: 'unknown' };
  ensureWardrobe();
  if (state().hairOwned.includes(id)) return { ok: false, reason: 'owned' };
  // les coiffures s'achètent toujours en pièces
  void payWith;
  return res('coins') >= hairPrice(id) ? { ok: true } : { ok: false, reason: 'coins' };
}

export function buyHair(id: HairId): Result {
  const c = canBuyHair(id);
  if (!c.ok) return c;
  if (!spendMany({ coins: hairPrice(id) })) return { ok: false, reason: 'coins' };
  state().hairOwned.push(id);
  save.save();
  stat('world.wardrobe.bought');
  return { ok: true };
}

// ------------------------------------------------------------------ équipement

/** Applique une pièce à un look (règles d'emplacement), sans vérifier la possession. */
export function applyItem(look: Look, id: ClothId): Look {
  const l = cloneLook(look);
  const slot = slotOf(id);
  switch (slot) {
    case 'top': l.top = id; l.dress = null; break;
    case 'bottom': l.bottom = id; l.dress = null; break;
    case 'dress': l.dress = id; l.top = null; l.bottom = null; break;
    case 'acc':
      if (!l.acc.includes(id)) {
        const g = accGroup(id);
        if (g) l.acc = l.acc.filter((x) => accGroup(x) !== g); // remplace l'objet de la même famille
        l.acc.push(id);
      }
      l.acc = l.acc.slice(-MAX_ACC);
      break;
    default: l[slot] = id; break;
  }
  return l;
}

export function removeItem(look: Look, id: ClothId): Look {
  const l = cloneLook(look);
  const slot = slotOf(id);
  if (slot === 'acc') l.acc = l.acc.filter((a) => a !== id);
  else if ((l as unknown as Record<string, unknown>)[slot] === id) (l as unknown as Record<string, unknown>)[slot] = null;
  return l;
}

/** Essayage : look obtenu en portant `id` (ou la coiffure), sans rien posséder ni modifier. */
export function previewLook(base: Look, id: ClothId | HairId): Look {
  if (isHair(id)) return { ...cloneLook(base), hair: id };
  if (!isCloth(id)) return cloneLook(base);
  return repairLook(applyItem(base, id));
}

export function equip(id: ClothId): Result {
  if (!isCloth(id)) return { ok: false, reason: 'unknown' };
  ensureWardrobe();
  if (!state().owned.includes(id)) return { ok: false, reason: 'not-owned' };
  const before = state().look;
  state().look = repairLook(applyItem(before, id), ownedSet());
  save.save();
  if (!sameLook(before, state().look)) stat('world.wardrobe.equipped');
  return { ok: true };
}

export function unequip(id: ClothId): Result {
  if (!isCloth(id)) return { ok: false, reason: 'unknown' };
  ensureWardrobe();
  state().look = repairLook(removeItem(state().look, id), ownedSet());
  save.save();
  return { ok: true };
}

/** Change de coiffure ; une coiffure non possédée est d'abord achetée (en pièces). */
export function setHair(id: HairId): Result & { bought?: boolean } {
  if (!isHair(id)) return { ok: false, reason: 'unknown' };
  ensureWardrobe();
  let bought = false;
  if (!state().hairOwned.includes(id)) {
    const r = buyHair(id);
    if (!r.ok) return r;
    bought = true;
  }
  if (state().look.hair !== id) {
    state().look = { ...state().look, hair: id };
    save.save();
    stat('world.wardrobe.hairChanged');
  }
  return { ok: true, bought };
}

// ------------------------------------------------------------------ looks favoris

/** Nom nettoyé (1–24 caractères) ou null s'il est vide. */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const s = raw.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX).trim();
  return s.length ? s : null;
}

const okSlot = (slot: number) => Number.isInteger(slot) && slot >= 0 && slot < FAVORITE_SLOTS;

export function saveLook(slot: number, name?: string): Result {
  if (!okSlot(slot)) return { ok: false, reason: 'bad-slot' };
  ensureWardrobe();
  const w = state();
  const nm = cleanName(name) ?? w.looks[slot]?.name ?? `Look ${slot + 1}`;
  w.looks[slot] = { name: nm, look: cloneLook(w.look) };
  save.save();
  stat('world.wardrobe.looksSaved');
  return { ok: true };
}

export function equipFavorite(slot: number): Result {
  if (!okSlot(slot)) return { ok: false, reason: 'bad-slot' };
  ensureWardrobe();
  const f = state().looks[slot];
  if (!f) return { ok: false, reason: 'empty-name' };
  state().look = repairLook(f.look, ownedSet(state()));
  save.save();
  stat('world.wardrobe.equipped');
  return { ok: true };
}

/**
 * « Tenue illustrée » : remet en un geste la tenue de l'illustration peinte de Radia (sweat noir, pantalon large,
 * baskets blanches, sac bandoulière, cheveux longs ; couronne dorée si elle est possédée). Uniquement des pièces possédées
 * (celles de départ) : rien n'est acheté ni retiré de la garde-robe.
 */
export function equipIllustrated(): Result {
  ensureWardrobe();
  const w = state();
  const owned = ownedSet(w);
  const hair = w.look.hair === 'hair-loose' || w.look.hair === 'hair-wavy' ? w.look.hair : 'hair-wavy';
  const crown = owned.has('cr-gold') ? 'cr-gold' : null;
  w.look = repairLook({ hair, top: 'top-hoodie-black', bottom: 'bot-wide-black', dress: null, jacket: null, shoes: 'sh-sneakers-white', bag: 'bg-crossbody-black', acc: [], crown }, owned);
  save.save();
  stat('world.wardrobe.equipped');
  return { ok: true };
}

export function renameFavorite(slot: number, name: string): Result {
  if (!okSlot(slot)) return { ok: false, reason: 'bad-slot' };
  ensureWardrobe();
  const f = state().looks[slot];
  const nm = cleanName(name);
  if (!f) return { ok: false, reason: 'empty-name' };
  if (!nm) return { ok: false, reason: 'empty-name' };
  f.name = nm;
  save.save();
  return { ok: true };
}

export const favorites = () => { ensureWardrobe(); return state().looks; };

// ------------------------------------------------------------------ style

/** Pièces portées (identifiants), robe comprise. */
export function wornIds(look: Look): ClothId[] {
  return [look.top, look.bottom, look.dress, look.jacket, look.shoes, look.bag, ...look.acc, look.crown].filter((x): x is ClothId => !!x);
}

const STYLE_ORDER: StyleId[] = ['royal', 'stage', 'chic', 'romantic', 'casual'];

/** Style dominant d'un look (égalité : le plus « habillé » l'emporte). Casual si rien n'est porté. */
export function styleOf(look: Look): StyleId {
  const score: Record<StyleId, number> = { casual: 0, chic: 0, romantic: 0, royal: 0, stage: 0 };
  for (const id of wornIds(look)) {
    const w = slotOf(id) === 'dress' ? 2 : 1;
    for (const s of CLOTHES[id].styles) score[s] += w;
  }
  let best: StyleId = 'casual';
  let bv = -1;
  for (const s of STYLE_ORDER) if (score[s] > bv) { best = s; bv = score[s]; }
  return best;
}

/** Tenue particulièrement élégante (au moins une pièce de ELEGANT_CLOTHES, ou couronne + robe). */
export function isElegant(look: Look): boolean {
  return wornIds(look).some((id) => ELEGANT_CLOTHES.includes(id)) || (!!look.dress && !!look.crown);
}

export { CLOTH_IDS };
