/**
 * Logique pure du chat (aucun DOM) : adoption gratuite, nom, interactions,
 * friandises, accessoires. Rien ne baisse avec l'absence : seules les
 * friandises se regagnent lentement avec le temps.
 */
import type { World } from '../../save/schema';
import { CAT_ITEM_IDS, type CatItemId } from '../../data/world/ids';
import { CAT_ACTIONS, CAT_BOND_LEVELS, CAT_ITEMS, CAT_TREAT_MAX, CAT_TREAT_REGEN_MS, type CatKind } from '../../data/world/family';

export const CAT_NAME_MAX = 20;

export type NameCheck = { ok: true; name: string } | { ok: false; reason: string };

/** Nom valide : espaces de bord retirés, 1 à 20 caractères. */
export function validateCatName(s: string): NameCheck {
  const name = (typeof s === 'string' ? s : '').replace(/\s+/g, ' ').trim();
  if (!name) return { ok: false, reason: 'Il faut au moins une lettre pour lui donner un nom.' };
  if ([...name].length > CAT_NAME_MAX) return { ok: false, reason: `Un nom de ${CAT_NAME_MAX} lettres au maximum.` };
  return { ok: true, name };
}

export const catAdopted = (w: World): boolean => w.cat.adopted;

/** Adoption gratuite. Refuse un nom invalide ; sans effet si déjà adopté. */
export function adoptCat(w: World, rawName: string, now: number): NameCheck {
  const v = validateCatName(rawName);
  if (!v.ok) return v;
  if (w.cat.adopted) return { ok: false, reason: 'Le chat est déjà adopté.' };
  w.cat.adopted = true;
  w.cat.name = v.name;
  w.cat.lastSeen = now;
  return v;
}

/** Renommage possible à tout moment une fois adopté. */
export function setCatName(w: World, rawName: string): NameCheck {
  const v = validateCatName(rawName);
  if (!v.ok) return v;
  if (!w.cat.adopted) return { ok: false, reason: 'Adopte d\'abord le chat.' };
  w.cat.name = v.name;
  w.cat.counters.renamed = (w.cat.counters.renamed ?? 0) + 1;
  return v;
}

/** Niveau d'affection (0..6) et progression vers le suivant (0..1). */
export function catBondLevel(bond: number): { level: number; next: number | null; frac: number } {
  let level = 0;
  for (let i = 0; i < CAT_BOND_LEVELS.length; i++) if (bond >= CAT_BOND_LEVELS[i]) level = i;
  const max = CAT_BOND_LEVELS.length - 1;
  if (level >= max) return { level, next: null, frac: 1 };
  const a = CAT_BOND_LEVELS[level];
  const b = CAT_BOND_LEVELS[level + 1];
  return { level, next: b, frac: (bond - a) / (b - a) };
}

/**
 * Régénération douce des friandises : +1 toutes les 20 min jusqu'à 5.
 * Ne retire jamais rien. Renvoie le nombre de friandises gagnées.
 */
export function refreshTreats(w: World, now: number): number {
  const c = w.cat;
  if (!c.adopted) return 0;
  if (c.treats >= CAT_TREAT_MAX || !c.lastSeen || now < c.lastSeen) {
    c.lastSeen = now;
    return 0;
  }
  const n = Math.min(CAT_TREAT_MAX - c.treats, Math.floor((now - c.lastSeen) / CAT_TREAT_REGEN_MS));
  if (n > 0) {
    c.treats += n;
    c.lastSeen += n * CAT_TREAT_REGEN_MS;
    if (c.treats >= CAT_TREAT_MAX) c.lastSeen = now;
  }
  return n;
}

/** Millisecondes avant la prochaine friandise offerte par le temps (0 si pleine). */
export function nextTreatIn(w: World, now: number): number {
  if (w.cat.treats >= CAT_TREAT_MAX) return 0;
  return Math.max(0, CAT_TREAT_REGEN_MS - (now - w.cat.lastSeen));
}

export type CatPose = 'sit' | 'sleep' | 'walk' | 'play' | 'purr' | 'eat' | 'stretch';
export const POSE_OF: Record<CatKind, CatPose> = { pet: 'purr', treat: 'eat', play: 'play', sleep: 'sleep', walk: 'walk', sit: 'sit', purr: 'purr' };

export interface InteractResult {
  ok: boolean;
  reason?: 'notAdopted' | 'cooldown' | 'noTreats';
  kind: CatKind;
  pose?: CatPose;
  bond?: number;
  coins?: number;
  hearts?: number;
  treatsGiven?: number;
  levelUp?: boolean;
  /** Ms avant que l'action soit de nouveau disponible (si cooldown). */
  wait?: number;
}

/**
 * Interaction avec le chat. `rng` ∈ [0,1) rend les petits bonus testables.
 * Les cœurs ne sont pas ajoutés ici (module de progression) : ils sont renvoyés.
 */
export function interact(w: World, kind: CatKind, now: number, rng: () => number = Math.random): InteractResult {
  const c = w.cat;
  if (!c.adopted) return { ok: false, reason: 'notAdopted', kind };
  refreshTreats(w, now);
  const def = CAT_ACTIONS[kind];
  const cdKey = `cd.${kind}`;
  const last = c.counters[cdKey] ?? 0;
  if (now >= last && now - last < def.cooldown) return { ok: false, reason: 'cooldown', kind, wait: def.cooldown - (now - last) };
  if (kind === 'treat' && c.treats < 1) return { ok: false, reason: 'noTreats', kind };

  const before = catBondLevel(c.bond).level;
  c.counters[cdKey] = now;
  const n = (c.counters[`n.${kind}`] = (c.counters[`n.${kind}`] ?? 0) + 1);
  let coins = 0;
  let hearts = 0;
  let treatsGiven = 0;
  if (kind === 'treat') c.treats -= 1;
  if (kind === 'pet' && n % 4 === 0) hearts = 1;
  if (kind === 'treat') hearts = 1;
  if (kind === 'play') coins = 3 + Math.floor(rng() * 6);
  if (kind === 'walk') coins = 2 + Math.floor(rng() * 5);
  if (kind === 'purr' && n % 3 === 0) hearts = 1;
  if (kind === 'sleep' && n % 5 === 0) { treatsGiven = 1; }
  if ((kind === 'play' || kind === 'purr') && rng() < 0.12) treatsGiven = 1;
  if (treatsGiven && c.treats < CAT_TREAT_MAX + 3) c.treats += treatsGiven;
  else treatsGiven = 0;
  if (coins) w.res.coins = Math.min(999_999_999, w.res.coins + coins);
  c.bond += def.bond;
  c.lastSeen = c.lastSeen || now;
  const after = catBondLevel(c.bond).level;
  return { ok: true, kind, pose: POSE_OF[kind], bond: def.bond, coins, hearts, treatsGiven, levelUp: after > before };
}

// ------------------------------------------------------------------ accessoires
export const ownsCatItem = (w: World, id: CatItemId): boolean => w.cat.items.includes(id);

export type BuyResult = { ok: true } | { ok: false; reason: 'notAdopted' | 'unknown' | 'owned' | 'coins' };

/** Achat en pièces ; débite vraiment, jamais de solde négatif. L'objet est équipé aussitôt. */
export function buyCatItem(w: World, id: string): BuyResult {
  if (!w.cat.adopted) return { ok: false, reason: 'notAdopted' };
  if (!(CAT_ITEM_IDS as readonly string[]).includes(id)) return { ok: false, reason: 'unknown' };
  const item = id as CatItemId;
  if (ownsCatItem(w, item)) return { ok: false, reason: 'owned' };
  const price = CAT_ITEMS[item].price;
  if (w.res.coins < price) return { ok: false, reason: 'coins' };
  w.res.coins -= price;
  w.cat.items.push(item);
  equipCatItem(w, item);
  return { ok: true };
}

/** Équipe (ou retire si déjà équipé) un accessoire possédé. Renvoie l'état équipé. */
export function equipCatItem(w: World, id: CatItemId): boolean {
  if (!ownsCatItem(w, id)) return false;
  const slot = CAT_ITEMS[id].slot;
  if (slot === 'toy') return true; // le jouet est simplement visible quand il est possédé
  const cur = w.cat.equipped[slot];
  w.cat.equipped[slot] = cur === id ? null : id;
  return w.cat.equipped[slot] === id;
}
