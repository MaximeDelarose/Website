/**
 * Logique PURE des lieux à rénover (aucun DOM) : état durable (`fun.places`), objectifs, étapes,
 * paiement atomique, récompenses uniques, choix de la joueuse, services réguliers, carte du domaine.
 * L'interface (ui.ts) et le hub ne font que lire / appeler ces fonctions.
 */
import { COLLECTIONS, GENERATORS, genKindOf, itemName, type CollectionId } from '../data/items';
import { CLOTHES } from '../data/world/wardrobe';
import { FURNITURE } from '../data/world/furniture';
import { CHOC_NAMES, FLOWER_NAMES, STARTER_CLOTHES, type ChocId, type ClothId } from '../data/world/ids';
import { unlockedCount, totalPlaced } from '../game/world/castle';
import { addDiamonds } from '../game/economy/economy';
import { isFreeModeUnlocked } from '../core/freeMode';
import type { FunState, PlaceState } from '../save/fun';
import type { SaveData, World } from '../save/schema';
import type { BoardEvent } from '../game/merge/types';
import { PLACES, PLACE_IDS, STAGES, type ChoiceDef, type ChoiceId, type Cost, type Obj, type PlaceDef, type PlaceId, type Req, type Reward, type ServiceOpt } from './places';

/** Contexte : état durable + effets annexes (cœurs, diamants) injectés pour rester testable. */
export interface Ctx {
  fun: FunState;
  world: World;
  /** Mode libre débloqué : condition générale pour démarrer une rénovation. */
  free: boolean;
  diamonds(n: number): void;
  hearts(n: number): void;
}

/** Contexte « réel » construit à partir de la sauvegarde. */
export function ctxOf(d: SaveData): Ctx {
  return {
    fun: d.fun, world: d.world, free: isFreeModeUnlocked(d),
    diamonds: (n) => addDiamonds(d.economy, n),
    hearts: (n) => { if (n > 0) { d.hearts += n; d.heartsTotal += n; } },
  };
}

// ------------------------------------------------------------------ état d'un lieu

const blank = (): PlaceState => ({ stage: 0, progress: {}, done: false, seen: false, choices: {} });

/** Lecture sans écriture (un lieu jamais touché n'occupe aucune place dans la sauvegarde). */
export const placeState = (fun: FunState, id: PlaceId): PlaceState => fun.places[id] ?? blank();
export function ensurePlace(fun: FunState, id: PlaceId): PlaceState {
  const cur = fun.places[id] ?? (fun.places[id] = blank());
  if (cur.done) cur.stage = STAGES;
  cur.stage = Math.max(0, Math.min(STAGES, Math.floor(cur.stage)));
  if (cur.stage >= STAGES) cur.done = true;
  return cur;
}
/** Étape atteinte : 0 (à rénover) … 4 (ouvert). */
export const stageOf = (fun: FunState, id: PlaceId): number => {
  const p = fun.places[id];
  return !p ? 0 : p.done ? STAGES : Math.max(0, Math.min(STAGES, Math.floor(p.stage)));
};
export const isOpen = (fun: FunState, id: PlaceId): boolean => stageOf(fun, id) >= STAGES;

// ------------------------------------------------------------------ prérequis

export function reqMet(c: Ctx, r: Req): boolean {
  if (r.k === 'place') return stageOf(c.fun, r.id) >= r.stage;
  if (r.k === 'rooms') return unlockedCount(c.world) >= r.n;
  return c.world.choc.shopLevel >= r.n;
}

export function reqLabel(r: Req): string {
  if (r.k === 'place') return r.stage >= STAGES ? `Terminer : ${PLACES[r.id].name}` : `${PLACES[r.id].name} : étape ${r.stage} terminée`;
  if (r.k === 'rooms') return `Débloquer ${r.n} pièces du château`;
  return `Boutique de chocolats niveau ${r.n}`;
}

export const unmetReqs = (c: Ctx, def: PlaceDef): Req[] => def.reqs.filter((r) => !reqMet(c, r));

// ------------------------------------------------------------------ objectifs

export interface ObjView { key: string; label: string; have: number; need: number; done: boolean; unit: 'count' | 'level'; coll?: CollectionId }

const plural = (n: number, one: string, many: string): string => `${n} ${n > 1 ? many : one}`;

/** Clé de progression d'un objectif « compté par le crochet » (unique dans l'étape). */
export const objKey = (stage: number, o: Obj): string => `s${stage}.${o.k}${'coll' in o && o.coll ? ':' + o.coll : ''}${o.k === 'reach' || o.k === 'gen' ? o.l : 'n' in o ? o.n : ''}`;

/** Niveau le plus haut atteint dans une collection (compteur du moteur ou album). */
export function bestLevel(fun: FunState, coll: CollectionId): number {
  let best = fun.endless2.counters[`maxL:${coll}`] ?? 0;
  const p = `${coll}:`;
  for (const k of fun.endless2.album) if (k.startsWith(p)) best = Math.max(best, Number(k.slice(p.length)) || 0);
  return Math.floor(best);
}
export const discoveredIn = (fun: FunState, coll?: CollectionId): number =>
  coll ? fun.endless2.album.filter((k) => k.startsWith(`${coll}:`)).length : fun.endless2.album.length;
const ownedPieces = (w: World): number => w.wardrobe.owned.filter((id) => !(STARTER_CLOTHES as readonly string[]).includes(id) && !CLOTHES[id as ClothId]?.free).length;
const chocMade = (w: World): number => Object.values(w.choc.made).reduce((a, b) => a + Math.max(0, b || 0), 0);

export function objView(c: Ctx, id: PlaceId, stage: number, o: Obj): ObjView {
  const key = objKey(stage, o);
  const counted = (): number => Math.max(0, Math.floor(placeState(c.fun, id).progress[key] ?? 0));
  const mk = (label: string, have: number, need: number, unit: 'count' | 'level' = 'count', coll?: CollectionId): ObjView =>
    ({ key, label, have: Math.min(have, need), need, done: have >= need, unit, coll });
  switch (o.k) {
    case 'orders': return mk(`Livrer ${plural(o.n, 'commande', 'commandes')}`, counted(), o.n);
    case 'deliver': return mk(`Livrer ${plural(o.n, 'commande', 'commandes')} de la collection ${COLLECTIONS[o.coll].name}`, counted(), o.n, 'count', o.coll);
    case 'reach': return mk(`Obtenir « ${itemName({ c: o.coll, l: o.l })} » (collection ${COLLECTIONS[o.coll].name})`, bestLevel(c.fun, o.coll), o.l, 'level', o.coll);
    case 'discover': return mk(o.coll ? `Découvrir ${plural(o.n, 'objet', 'objets')} de la collection ${COLLECTIONS[o.coll].name}` : `Découvrir ${plural(o.n, 'objet', 'objets')} dans l'album`, discoveredIn(c.fun, o.coll), o.n, 'count', o.coll);
    case 'gen': return mk(`Améliorer « ${GENERATORS[genKindOf(o.coll)].name} » au niveau ${o.l}`, c.fun.endless2.gens[`gen:${o.coll}`]?.level ?? 1, o.l, 'level', o.coll);
    case 'rooms': return mk(`Débloquer ${o.n} pièces du château`, unlockedCount(c.world), o.n);
    case 'placed': return mk(`Placer ${plural(o.n, 'meuble', 'meubles')} dans le château`, Math.max(totalPlaced(c.world), Math.floor(c.world.extra['dev.placed'] ?? 0)), o.n);
    case 'bouquets': return mk(`Composer ${plural(o.n, 'bouquet', 'bouquets')} au jardin`, Math.floor(c.world.extra['garden.bouquetsMade'] ?? 0), o.n);
    case 'chocmade': return mk(`Fabriquer ${plural(o.n, 'chocolat', 'chocolats')}`, chocMade(c.world), o.n);
    case 'shop': return mk(`Chocolaterie : boutique niveau ${o.n}`, c.world.choc.shopLevel, o.n, 'level');
    case 'wardrobe': return mk(`Posséder ${plural(o.n, 'nouveau vêtement', 'nouveaux vêtements')} au dressing`, ownedPieces(c.world), o.n);
    case 'fans': return mk(`Avoir ${o.n.toLocaleString('fr-FR')} fans`, Math.floor(c.world.fans), o.n);
  }
}

// ------------------------------------------------------------------ vue d'une étape

export type PlaceStatus = 'locked' | 'available' | 'renovating' | 'open';

export interface StageView {
  id: PlaceId;
  def: PlaceDef;
  /** Étape atteinte (0..4). */
  stage: number;
  status: PlaceStatus;
  /** Étape en cours de rénovation (null si ouvert). */
  current: { index: number; name: string; blurb: string; cost: Cost; rewards: Reward[] } | null;
  objs: ObjView[];
  objsDone: boolean;
  /** Choix à faire avant d'installer cette étape. */
  choices: ChoiceDef[];
  choicesMissing: ChoiceDef[];
  afford: boolean;
  missing: Cost;
  unmet: Req[];
  /** Tout est prêt : on peut rénover maintenant. */
  ready: boolean;
}

export const canPay = (w: World, cost: Cost): boolean => (Object.entries(cost) as [keyof World['res'], number][]).every(([k, n]) => w.res[k] >= n);
export function missingCost(w: World, cost: Cost): Cost {
  const m: Cost = {};
  for (const [k, n] of Object.entries(cost) as [keyof World['res'], number][]) if (w.res[k] < n) m[k] = n - w.res[k];
  return m;
}

export function stageView(c: Ctx, id: PlaceId): StageView {
  const def = PLACES[id];
  const stage = stageOf(c.fun, id);
  const unmet = unmetReqs(c, def);
  const open = stage >= STAGES;
  const cur = open ? null : def.stages[stage];
  const objs = cur ? cur.objs.map((o) => objView(c, id, stage, o)) : [];
  const choices = open ? [] : def.choices.filter((ch) => ch.at === stage);
  const ps = placeState(c.fun, id);
  const choicesMissing = choices.filter((ch) => !ps.choices[ch.id]);
  const objsDone = objs.every((o) => o.done);
  const cost = cur?.cost ?? {};
  const afford = canPay(c.world, cost);
  const locked = !open && (!c.free || unmet.length > 0);
  const status: PlaceStatus = open ? 'open' : locked ? 'locked' : stage === 0 ? 'available' : 'renovating';
  return {
    id, def, stage, status,
    current: cur ? { index: stage, name: cur.name, blurb: cur.blurb, cost: cur.cost, rewards: cur.rewards } : null,
    objs, objsDone, choices, choicesMissing, afford, missing: missingCost(c.world, cost), unmet,
    ready: !open && !locked && objsDone && afford && choicesMissing.length === 0,
  };
}

// ------------------------------------------------------------------ choix de la joueuse

export function choose(c: Ctx, id: PlaceId, choice: ChoiceId, option: string): boolean {
  const def = PLACES[id].choices.find((x) => x.id === choice);
  if (!def || !(def.options as readonly string[]).includes(option)) return false;
  ensurePlace(c.fun, id).choices[choice] = option;
  return true;
}
/** Couleurs choisies, avec les valeurs par défaut du lieu pour ce qui n'est pas encore choisi. */
export function colorsOf(fun: FunState, id: PlaceId): Record<ChoiceId, string> {
  const ps = placeState(fun, id);
  const out: Record<ChoiceId, string> = { wall: '', cloth: '', accent: '' };
  for (const ch of PLACES[id].choices) out[ch.id] = ps.choices[ch.id] ?? '';
  return out;
}

// ------------------------------------------------------------------ crochet moteur : commandes livrées

/**
 * Une commande vient d'être livrée (items = objets livrés). Fait avancer les objectifs « compteur » de l'étape
 * EN COURS de chaque lieu actif : `orders` (+1 par commande) et `deliver` (+1 par commande contenant la collection).
 * Renvoie les lieux dont la progression a changé. Idempotence : l'appelant ne transmet chaque livraison qu'une fois.
 */
export function noteDelivery(c: Ctx, items: { c: string }[]): PlaceId[] {
  if (!c.free) return [];
  const colls = new Set(items.map((i) => i.c));
  const changed: PlaceId[] = [];
  for (const id of PLACE_IDS) {
    const def = PLACES[id];
    const stage = stageOf(c.fun, id);
    if (stage >= STAGES || unmetReqs(c, def).length) continue;
    let touched = false;
    for (const o of def.stages[stage].objs) {
      if (o.k !== 'orders' && !(o.k === 'deliver' && colls.has(o.coll))) continue;
      const ps = ensurePlace(c.fun, id);
      const key = objKey(stage, o);
      const have = ps.progress[key] ?? 0;
      if (have < o.n) { ps.progress[key] = have + 1; touched = true; }
    }
    if (touched) changed.push(id);
  }
  return changed;
}

const seenEvents = new WeakSet<object>();
/** Compte les livraisons d'un lot d'événements du moteur (chaque événement une seule fois, même rejoué). */
export function noteBoardEvents(c: Ctx, events: readonly BoardEvent[]): PlaceId[] {
  const changed = new Set<PlaceId>();
  for (const e of events) {
    if (e.t !== 'deliver' || seenEvents.has(e)) continue;
    seenEvents.add(e);
    for (const id of noteDelivery(c, e.items ?? [])) changed.add(id);
  }
  return [...changed];
}

// ------------------------------------------------------------------ récompenses

export interface Granted { t: Reward['t']; id: string; name: string; n: number; dup?: boolean; coins?: number }

const dupCoins = (id: ClothId): number => Math.max(20, Math.round((CLOTHES[id]?.coins ?? 80) * 0.25));

export function describeReward(r: Reward): string {
  switch (r.t) {
    case 'furn': return `${FURNITURE[r.id].name}${(r.n ?? 1) > 1 ? ` ×${r.n}` : ''}`;
    case 'cloth': return CLOTHES[r.id].name;
    case 'res': return Object.entries(r.res).map(([k, n]) => `${n} ${k}`).join(' + ');
    case 'diamonds': return `${r.n} diamants`;
    case 'recipe': return `Recette : ${chocName(r.id)}`;
    case 'flower': return `Fleur : ${FLOWER_NAMES[r.id]}`;
  }
}
const chocName = (id: ChocId): string => CHOC_NAMES[id];

/** Verse une récompense. Un vêtement déjà possédé donne des pièces de compensation (jamais de perte). */
function grantOne(c: Ctx, r: Reward): Granted {
  const w = c.world;
  switch (r.t) {
    case 'furn': {
      const n = r.n ?? 1;
      w.castle.owned[r.id] = Math.max(0, Math.floor(w.castle.owned[r.id] ?? 0)) + n;
      return { t: 'furn', id: r.id, name: FURNITURE[r.id].name, n };
    }
    case 'cloth': {
      if (w.wardrobe.owned.includes(r.id)) {
        const coins = dupCoins(r.id);
        w.res.coins += coins;
        return { t: 'cloth', id: r.id, name: CLOTHES[r.id].name, n: 1, dup: true, coins };
      }
      w.wardrobe.owned.push(r.id);
      return { t: 'cloth', id: r.id, name: CLOTHES[r.id].name, n: 1 };
    }
    case 'res': {
      for (const [k, n] of Object.entries(r.res) as [keyof World['res'], number][]) w.res[k] += n;
      return { t: 'res', id: 'res', name: describeReward(r), n: 1 };
    }
    case 'diamonds': c.diamonds(r.n); return { t: 'diamonds', id: 'diamonds', name: `${r.n} diamants`, n: r.n };
    case 'recipe': {
      const dup = w.choc.recipes.includes(r.id);
      if (!dup) w.choc.recipes.push(r.id);
      return { t: 'recipe', id: r.id, name: `Recette : ${chocName(r.id)}`, n: 1, dup };
    }
    case 'flower': {
      const dup = w.garden.unlocked.includes(r.id);
      if (!dup) w.garden.unlocked.push(r.id);
      return { t: 'flower', id: r.id, name: `Fleur : ${FLOWER_NAMES[r.id]}`, n: 1, dup };
    }
  }
}

// ------------------------------------------------------------------ rénovation

export type AdvanceFail = 'free' | 'locked' | 'done' | 'objectives' | 'choice' | 'cost';
export type AdvanceResult =
  | { ok: true; id: PlaceId; stage: number; opened: boolean; paid: Cost; granted: Granted[] }
  | { ok: false; reason: AdvanceFail };

/**
 * Installe l'étape en cours. TOUT OU RIEN : si une condition manque (mode libre, prérequis, objectifs, choix, coût),
 * rien n'est dépensé ni donné. Le coût est prélevé une seule fois et les récompenses sont marquées (`rw.<étape>`)
 * pour qu'aucun double versement ne soit possible, même en cas de rappel.
 */
export function advanceStage(c: Ctx, id: PlaceId): AdvanceResult {
  const v = stageView(c, id);
  if (v.status === 'open') return { ok: false, reason: 'done' };
  if (!c.free) return { ok: false, reason: 'free' };
  if (v.unmet.length) return { ok: false, reason: 'locked' };
  if (!v.objsDone) return { ok: false, reason: 'objectives' };
  if (v.choicesMissing.length) return { ok: false, reason: 'choice' };
  if (!v.afford || !v.current) return { ok: false, reason: 'cost' };
  const ps = ensurePlace(c.fun, id);
  const idx = v.current.index;
  const cost = v.current.cost;
  for (const [k, n] of Object.entries(cost) as [keyof World['res'], number][]) c.world.res[k] -= n;
  const marker = `rw.${idx}`;
  const granted: Granted[] = [];
  if (!ps.progress[marker]) {
    ps.progress[marker] = 1;
    for (const r of v.current.rewards) granted.push(grantOne(c, r));
  }
  ps.stage = idx + 1;
  ps.done = ps.stage >= STAGES;
  ps.seen = true;
  return { ok: true, id, stage: ps.stage, opened: ps.done, paid: { ...cost }, granted };
}

// ------------------------------------------------------------------ services (une fois le lieu ouvert)

const svcKey = 'svc.at';
export function serviceWaitMs(c: Ctx, id: PlaceId, now: number): number {
  const svc = PLACES[id].service;
  if (!svc || !isOpen(c.fun, id)) return Infinity;
  const last = placeState(c.fun, id).progress[svcKey] ?? 0;
  if (now < last) return svc.cooldownMin * 60_000; // horloge reculée : on repart de zéro, jamais de blocage infini
  return Math.max(0, last + svc.cooldownMin * 60_000 - now);
}
export const serviceReady = (c: Ctx, id: PlaceId, now: number): boolean => serviceWaitMs(c, id, now) === 0;

export type ServiceResult = { ok: true; opt: ServiceOpt; gain: Cost; hearts: number } | { ok: false; reason: 'closed' | 'wait' | 'unknown' };
export function claimService(c: Ctx, id: PlaceId, optId: string, now: number): ServiceResult {
  const svc = PLACES[id].service;
  if (!svc || !isOpen(c.fun, id)) return { ok: false, reason: 'closed' };
  const opt = svc.options.find((o) => o.id === optId);
  if (!opt) return { ok: false, reason: 'unknown' };
  if (!serviceReady(c, id, now)) return { ok: false, reason: 'wait' };
  const ps = ensurePlace(c.fun, id);
  ps.progress[svcKey] = now;
  ps.progress['svc.n'] = (ps.progress['svc.n'] ?? 0) + 1;
  for (const [k, n] of Object.entries(opt.gain) as [keyof World['res'], number][]) c.world.res[k] += n;
  const hearts = opt.hearts ?? 0;
  if (hearts) c.hearts(hearts);
  return { ok: true, opt, gain: { ...opt.gain }, hearts };
}

// ------------------------------------------------------------------ carte du domaine

export type NodeBadge = 'new' | 'quest' | 'reward';
export interface MapNode {
  id: PlaceId;
  name: string;
  status: PlaceStatus;
  stage: number;
  /** Texte d'état court affiché sous la vignette. */
  sub: string;
  badge?: NodeBadge;
  /** Prochain objectif en une ligne (ou raison du verrou). */
  hint: string;
}

const STAGE_LABEL = ['À rénover', 'Murs refaits', 'Aménagé', 'Presque prêt', 'Ouvert'];

export function mapNodes(c: Ctx, now: number): MapNode[] {
  return PLACE_IDS.map((id) => {
    const v = stageView(c, id);
    const ps = placeState(c.fun, id);
    let badge: NodeBadge | undefined;
    let sub = '';
    let hint = '';
    if (v.status === 'open') {
      sub = 'Ouvert ♡';
      if (serviceReady(c, id, now) && v.def.service) { badge = 'reward'; hint = `${v.def.service.title} : à toi de jouer`; } else hint = v.def.link ? v.def.link.label : 'Ouvert';
    } else if (v.status === 'locked') {
      sub = 'Verrouillé';
      hint = !c.free ? 'Disponible avec le Mode libre' : reqLabel(v.unmet[0]);
    } else {
      sub = v.status === 'available' ? 'À rénover' : `Étape ${v.stage}/${STAGES} · ${STAGE_LABEL[v.stage]}`;
      if (v.ready) { badge = 'quest'; hint = `Prêt : ${v.current!.name}`; }
      else {
        const todo = v.objs.find((o) => !o.done);
        hint = todo ? `${todo.label} (${todo.have}/${todo.need})` : v.choicesMissing.length ? 'Choisis le style' : 'Il manque des ressources';
        if (v.status === 'available' && !ps.seen) badge = 'new';
      }
    }
    return { id, name: v.def.short, status: v.status, stage: v.stage, sub, badge, hint };
  });
}

export interface DomainSummary { open: number; total: number; ready: number; services: number; fresh: number; nextHint: string }
export function domainSummary(c: Ctx, now: number): DomainSummary {
  const nodes = mapNodes(c, now);
  const open = nodes.filter((n) => n.status === 'open').length;
  const ready = nodes.filter((n) => n.badge === 'quest').length;
  const services = nodes.filter((n) => n.badge === 'reward').length;
  const fresh = nodes.filter((n) => n.badge === 'new').length;
  const focus = nodes.find((n) => n.badge === 'quest') ?? nodes.find((n) => n.badge === 'reward') ?? nodes.find((n) => n.status === 'renovating') ?? nodes.find((n) => n.status === 'available');
  return { open, total: nodes.length, ready, services, fresh, nextHint: focus ? `${focus.name} : ${focus.hint}` : '' };
}

export function markSeen(fun: FunState, id: PlaceId): void {
  const ps = ensurePlace(fun, id);
  ps.seen = true;
}

// ------------------------------------------------------------------ outils de test (mode ?debug) : étapes sans objectifs ni coûts

/** Termine l'étape en cours sans objectifs ni coût (récompenses versées une seule fois). */
export function devCompleteStage(c: Ctx, id: PlaceId): Granted[] {
  const stage = stageOf(c.fun, id);
  if (stage >= STAGES) return [];
  const ps = ensurePlace(c.fun, id);
  const granted: Granted[] = [];
  for (const ch of PLACES[id].choices) if (ch.at === stage && !ps.choices[ch.id]) ps.choices[ch.id] = ch.def;
  if (!ps.progress[`rw.${stage}`]) { ps.progress[`rw.${stage}`] = 1; for (const r of PLACES[id].stages[stage].rewards) granted.push(grantOne(c, r)); }
  ps.stage = stage + 1;
  ps.done = ps.stage >= STAGES;
  return granted;
}
/** Ouvre un lieu et, avant, les lieux dont il dépend. */
export function devOpenPlace(c: Ctx, id: PlaceId): void {
  for (const r of PLACES[id].reqs) if (r.k === 'place') while (stageOf(c.fun, r.id) < r.stage) devCompleteStage(c, r.id);
  while (stageOf(c.fun, id) < STAGES) devCompleteStage(c, id);
}

/** Test (?debug) : remplit les objectifs de l'étape en cours (écrit les compteurs réels : progression, album, monde). */
export function devSatisfy(c: Ctx, id: PlaceId): void {
  const stage = stageOf(c.fun, id);
  if (stage >= STAGES) return;
  const ps = ensurePlace(c.fun, id);
  const e = c.fun.endless2;
  for (const o of PLACES[id].stages[stage].objs) {
    switch (o.k) {
      case 'orders': case 'deliver': ps.progress[objKey(stage, o)] = o.n; break;
      case 'reach': e.counters[`maxL:${o.coll}`] = Math.max(e.counters[`maxL:${o.coll}`] ?? 0, o.l); break;
      case 'discover': { let n = discoveredIn(c.fun, o.coll); for (let l = 1; n < o.n; l++) { const k = `${o.coll ?? 'flowers'}:${l}`; if (!e.album.includes(k)) { e.album.push(k); n++; } if (l > 400) break; } break; }
      case 'gen': e.gens[`gen:${o.coll}`] = { level: Math.max(o.l, e.gens[`gen:${o.coll}`]?.level ?? 1), xp: e.gens[`gen:${o.coll}`]?.xp ?? 0 }; break;
      case 'rooms': for (const r of ['dressing', 'reception', 'familySalon', 'kid1', 'kid2', 'kid3'] as const) if (unlockedCount(c.world) < o.n && !c.world.castle.unlocked.includes(r)) c.world.castle.unlocked.push(r); break;
      case 'placed': c.world.extra['dev.placed'] = o.n; break;
      case 'bouquets': c.world.extra['garden.bouquetsMade'] = Math.max(o.n, c.world.extra['garden.bouquetsMade'] ?? 0); break;
      case 'chocmade': c.world.choc.made.milk = Math.max(o.n, c.world.choc.made.milk ?? 0); break;
      case 'shop': c.world.choc.shopLevel = Math.max(o.n, c.world.choc.shopLevel); break;
      case 'wardrobe': for (const w of ['top-tee-pink', 'top-hoodie-cream', 'dr-denim', 'dr-gingham-red', 'jk-denim', 'sh-flats-red', 'ac-scarf', 'ac-hoops', 'top-blouse-silk']) if (ownedPieces(c.world) < o.n && !c.world.wardrobe.owned.includes(w)) c.world.wardrobe.owned.push(w); break;
      case 'fans': c.world.fans = Math.max(o.n, c.world.fans); break;
    }
  }
}
