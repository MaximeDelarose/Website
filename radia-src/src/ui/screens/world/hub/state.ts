/**
 * État vivant du hub « Mon monde » : fonctions PURES (aucun DOM), déduites de la vraie sauvegarde.
 * Chaque message correspond à une fonctionnalité qui existe (rien d'inventé) et n'apparaît que
 * dans l'état réel correspondant. Aucun prénom d'enfant : libellés neutres.
 */
import type { SaveData, World } from '../../../../save/schema';
import { ROOM_IDS, ROOM_NAMES, CHOC_IDS, FAN_TIERS, CAREER_IDS, CLOTH_SLOTS, type CareerId, type RoomId, type ChocId } from '../../../../data/world/ids';
import { ROOMS } from '../../../../data/world/rooms';
import { CLOTHES } from '../../../../data/world/wardrobe';
import { FLOWERS, BOUQUET_MIN } from '../../../../data/world/garden';
import { CHOCS, BOX_SIZE } from '../../../../data/world/chocolate';
import { CAT_ITEMS } from '../../../../data/world/family';
import { CAT_ITEM_IDS } from '../../../../data/world/ids';
import { isReady, remainingMs } from '../../../../game/world/garden';
import { salaryInfo } from '../../../../game/world/careers';
import { CAREERS } from '../../../../data/world/careers';
import { kidBondLevel } from '../../../../game/world/family';
import { KID_BOND_MAX } from '../../../../data/world/family';
import { KID_IDS } from '../../../../data/world/ids';

export type HubId = 'castle' | 'dressing' | 'garden' | 'choc' | 'family' | 'cat' | 'career' | 'fans';
export type HubBadge = 'new' | 'quest' | 'reward' | 'gift' | 'salary';
export interface HubCard { title: string; sub: string; badge?: HubBadge; hint?: string }
export type HubStatus = Record<HubId, HubCard>;

/** Clé (World.extra) : nombre de pièces du dressing déjà « vues » (préfixe hub.). */
export const DRESS_SEEN_KEY = 'hub.dressSeen';

export const BADGE_LABEL: Record<HubBadge, string> = { new: 'Nouveau', quest: 'À faire', reward: 'Récompense', gift: 'Cadeau', salary: 'Salaire prêt !' };

/** « 2 h 10 » / « 35 min » : délai réel avant le prochain salaire. */
export const waitLabel = (ms: number): string => { const m = Math.max(1, Math.ceil(ms / 60_000)); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`; };

const nf = (n: number): string => Math.floor(Math.max(0, n)).toLocaleString('fr-FR');

// ------------------------------------------------------------------ château

export const unlockedRooms = (w: World): number => ROOM_IDS.filter((r) => w.castle.unlocked.includes(r)).length;

/** Première pièce verrouillée que les pièces gagnées permettent d'acheter MAINTENANT (même règle que unlockRoom). */
export function affordableRoom(w: World): RoomId | null {
  for (const r of ROOM_IDS) if (!w.castle.unlocked.includes(r) && w.res.coins >= ROOMS[r].cost) return r;
  return null;
}

function castleCard(w: World): HubCard {
  const n = unlockedRooms(w);
  const sub = `${n} ${n >= 2 ? 'pièces' : 'pièce'} sur ${ROOM_IDS.length} ${n >= 2 ? 'débloquées' : 'débloquée'}`;
  const room = affordableRoom(w);
  if (room) return { title: 'Le château de Radia ♡', sub, badge: 'new', hint: `Nouvelle pièce disponible : ${ROOM_NAMES[room]} (${nf(ROOMS[room].cost)} pièces)` };
  return { title: 'Le château de Radia ♡', sub };
}

// ------------------------------------------------------------------ dressing

/** Pièces possédées depuis la dernière visite du dressing (hors options de visage offertes). */
export function newWardrobeItems(w: World): string[] {
  const seen = w.extra[DRESS_SEEN_KEY];
  if (typeof seen !== 'number' || !Number.isFinite(seen)) return [];
  return w.wardrobe.owned.slice(Math.max(0, Math.floor(seen))).filter((id) => {
    const def = (CLOTHES as Record<string, { free?: boolean } | undefined>)[id];
    return !!def && !def.free;
  });
}

function dressingCard(w: World): HubCard {
  const title = 'Mon dressing';
  const fresh = newWardrobeItems(w);
  if (fresh.length) {
    const slots = new Set(fresh.map((id) => (CLOTH_SLOTS as Record<string, string>)[id]));
    const sub = slots.has('bag') ? 'Nouveau sac débloqué !'
      : slots.has('dress') ? 'Nouvelle robe débloquée !'
        : slots.has('shoes') ? 'Nouvelles chaussures débloquées !'
          : slots.has('acc') || slots.has('crown') ? 'Nouvel accessoire débloqué !'
            : 'Nouveau vêtement débloqué !';
    return { title, sub, badge: 'new', hint: fresh.length >= 2 ? `${fresh.length} nouveautés à essayer` : 'À essayer sans attendre' };
  }
  return { title, sub: 'Crée ton prochain look' };
}

/** Marque tout le dressing comme vu (à appeler au retour du dressing, et à la première ouverture du hub). */
export function markDressingSeen(w: World): void { w.extra[DRESS_SEEN_KEY] = w.wardrobe.owned.length; }
export function ensureDressingBaseline(w: World): void { if (typeof w.extra[DRESS_SEEN_KEY] !== 'number') markDressingSeen(w); }

// ------------------------------------------------------------------ jardin

export const gardenStock = (w: World): number => Object.values(w.garden.harvested).reduce((a, b) => a + Math.max(0, b || 0), 0);
export const readyPlots = (w: World, now: number): number => w.garden.plots.filter((p) => isReady(p, now)).length;

function canPlantSomething(w: World): boolean {
  return w.garden.unlocked.some((id) => {
    const def = (FLOWERS as Record<string, { cost: Record<string, number> } | undefined>)[id];
    if (!def) return false;
    return (Object.entries(def.cost) as [keyof World['res'], number][]).every(([k, n]) => w.res[k] >= n);
  });
}

function minutesLabel(ms: number): string {
  const s = Math.ceil(ms / 1000);
  if (s <= 60) return 'moins d\'une minute';
  return `${Math.ceil(s / 60)} min`;
}

function gardenCard(w: World, now: number): HubCard {
  const title = 'Mon jardin';
  const ready = readyPlots(w, now);
  if (ready > 0) return { title, sub: ready === 1 ? 'Une fleur est prête !' : `${ready} fleurs sont prêtes !`, badge: 'reward', hint: 'À récolter' };
  const made = w.extra['garden.bouquetsMade'] ?? 0;
  if (made === 0 && gardenStock(w) >= BOUQUET_MIN) return { title, sub: 'Compose ton premier bouquet', badge: 'quest', hint: `${nf(gardenStock(w))} fleurs récoltées t'attendent` };
  const growing = w.garden.plots.filter((p) => p && p.flower && !isReady(p, now));
  if (growing.length > 0) {
    const next = Math.min(...growing.map((p) => remainingMs(p, now)));
    return { title, sub: 'Tes fleurs poussent', hint: `Prochaine floraison dans ${minutesLabel(next)}` };
  }
  const hasEmpty = w.garden.plots.slice(0, w.garden.plotCount).some((p) => !p || !p.flower);
  if (hasEmpty && canPlantSomething(w)) return { title, sub: 'Plante de nouvelles fleurs', badge: 'quest', hint: 'Une parcelle t\'attend' };
  return { title, sub: 'Fais fleurir ton royaume' };
}

// ------------------------------------------------------------------ chocolaterie

const cookable = (w: World, id: ChocId): boolean =>
  w.choc.recipes.includes(id) && (Object.entries(CHOCS[id].cost) as [keyof World['res'], number][]).every(([k, n]) => w.res[k] >= n);
const anyCookable = (w: World): boolean => CHOC_IDS.some((id) => cookable(w, id));
const chocStock = (w: World): number => CHOC_IDS.reduce((s, id) => s + Math.max(0, w.extra[`choc.stock.${id}`] ?? 0), 0);
const buyableRecipe = (w: World): ChocId | null =>
  CHOC_IDS.find((id) => !w.choc.recipes.includes(id) && w.choc.shopLevel >= CHOCS[id].unlockLevel && w.res.coins >= CHOCS[id].unlockCoins) ?? null;

function chocCard(w: World): HubCard {
  const title = 'Chocolaterie';
  if (w.choc.collection.length === 0 && anyCookable(w)) return { title, sub: 'Crée ton premier chocolat', badge: 'quest', hint: 'Tu as de quoi préparer une fournée' };
  if (buyableRecipe(w)) return { title, sub: 'Une nouvelle recette est disponible', badge: 'new', hint: 'Elle t\'attend à la boutique' };
  if (chocStock(w) >= BOX_SIZE) return { title, sub: 'Un coffret à composer', badge: 'quest', hint: `${nf(chocStock(w))} chocolats en réserve` };
  if (anyCookable(w)) return { title, sub: 'Une fournée à préparer' };
  return { title, sub: 'Prépare tes créations' };
}

// ------------------------------------------------------------------ famille

const VISIT_WAIT_MS = 5 * 60_000;

/** Même règle que recordVisit : une visite rapporte de la complicité si 5 min ont passé. */
export function visitAvailable(w: World, now: number): boolean {
  return KID_IDS.some((k) => {
    const st = w.family.kids[k];
    if (!st) return false;
    if (kidBondLevel(st.bond).level >= KID_BOND_MAX) return false;
    const last = w.extra[`family.visit.${k}`] ?? 0;
    return !(now >= last && now - last < VISIT_WAIT_MS);
  });
}

function familyCard(w: World, now: number): HubCard {
  const title = 'Ma famille';
  const bouquets = Object.values(w.garden.bouquets).reduce((a, b) => a + b, 0);
  if (bouquets >= 1 && !w.flags['scene.family.garden']) return { title, sub: 'Une nouvelle scène t\'attend', badge: 'new', hint: 'Un moment dans le jardin' };
  if (visitAvailable(w, now)) return { title, sub: 'Un moment en famille t\'attend', badge: 'quest', hint: 'Visite une chambre ou joue ensemble' };
  return { title, sub: 'Partage de jolis moments' };
}

// ------------------------------------------------------------------ chat

const catGift = (w: World): boolean =>
  CAT_ITEM_IDS.some((id) => !w.cat.items.includes(id) && w.res.coins >= CAT_ITEMS[id].price);

function catCard(w: World): HubCard {
  const title = 'Mon chat';
  if (!w.cat.adopted) return { title, sub: 'Adopte ton compagnon', badge: 'new', hint: 'L\'adoption est gratuite' };
  const name = w.cat.name.trim() || 'Ton compagnon';
  if (catGift(w)) return { title, sub: 'Un cadeau pour ton chat', badge: 'new', hint: name };
  return { title, sub: name };
}

// ------------------------------------------------------------------ carrière

const SESSION_NEXT: Record<CareerId, string> = { photo: 'Prochain shooting', model: 'Prochain défilé', actress: 'Prochain tournage', singer: 'Prochain concert' };

function careerCard(w: World, now: number): HubCard {
  const title = 'Ma carrière';
  const cur = (CAREER_IDS as readonly string[]).includes(w.careers.current ?? '') ? (w.careers.current as CareerId) : null;
  if (!cur) return { title, sub: 'Choisis ta voie', badge: 'new', hint: 'Photo, mannequinat, cinéma ou chant' };
  // copie légère : salaryInfo crée des entrées de progression vides, la sauvegarde ne doit pas bouger
  const sal = salaryInfo({ ...w, careers: { ...w.careers, progress: { ...w.careers.progress } } }, now);
  if (sal.ready) return { title, sub: 'Salaire à toucher', badge: 'salary', hint: `${nf(sal.amount)} pièces t'attendent` };
  // le salaire revient avec le TEMPS (pas après une mission) : on l'indique tel quel, sans faux délai
  const level = Math.max(0, Math.floor(w.careers.progress[cur]?.level ?? 0));
  return { title, sub: `Prochain salaire dans ${waitLabel(sal.nextInMs)}`, hint: `${SESSION_NEXT[cur]}${CAREERS[cur].tiers[level]?.goal ? ' · ' + CAREERS[cur].tiers[level].goal : ''}` };
}

// ------------------------------------------------------------------ fans

export const fansTierOf = (n: number): number => FAN_TIERS.reduce((t, v, i) => (n >= v ? i : t), -1);

function fansCard(w: World): HubCard {
  const title = 'Mes fans';
  const fans = Math.max(0, Math.floor(w.fans || 0));
  const sub = `${nf(fans)} ${fans >= 2 ? 'fans' : 'fan'}`;
  const next = FAN_TIERS.find((v) => fans < v);
  const nextHint = next ? `Prochain palier : ${nf(next)} fans` : undefined;
  if (fansTierOf(fans) > w.fansTierSeen) return { title, sub, badge: 'reward', hint: 'Palier atteint : une récompense t\'attend' };
  return { title, sub, hint: nextHint };
}

// ------------------------------------------------------------------ point d'entrée

export function hubStatus(data: Pick<SaveData, 'world'>, now: number): HubStatus {
  const w = data.world;
  return {
    castle: castleCard(w),
    dressing: dressingCard(w),
    garden: gardenCard(w, now),
    choc: chocCard(w),
    family: familyCard(w, now),
    cat: catCard(w),
    career: careerCard(w, now),
    fans: fansCard(w),
  };
}

/** Empreinte courte (détecte un changement visible sans tout redessiner). */
export const statusKey = (s: HubStatus): string => (Object.keys(s) as HubId[]).map((k) => `${s[k].sub}|${s[k].badge ?? ''}|${s[k].hint ?? ''}`).join('§');

