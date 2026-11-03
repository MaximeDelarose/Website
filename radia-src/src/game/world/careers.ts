/**
 * Logique PURE des carrières de Radia (aucun DOM, aucun accès à la sauvegarde
 * globale : tout passe par un objet `World`). Séances, expérience, objectifs,
 * paliers, récompenses, fans et magazines.
 *
 * Les effets qui sortent du `World` (diamants, énergie, fans à ajouter via
 * `addFans`) sont renvoyés à l'appelant, qui les applique avec les API du jeu.
 */
import { CAREER_IDS, FAN_TIERS, MAGAZINE_IDS, type CareerId, type ClothId, type MagazineId } from '../../data/world/ids';
import { CAREERS, FAN_TIER_DEFS, MAGAZINES, type FanTierDef, type Objective, type Reward, type TierDef } from '../../data/world/careers';
import { CLOTHES } from '../../data/world/wardrobe';
import type { World } from '../../save/schema';

export const MAX_LEVEL = 5;
export const SUCCESS_SCORE = 60;

// ------------------------------------------------------------------ état
export interface CareerProgress { level: number; xp: number; best: number }

export const isCareer = (id: unknown): id is CareerId => typeof id === 'string' && (CAREER_IDS as readonly string[]).includes(id);

/** Progression d'une carrière (créée si besoin). */
export function progressOf(w: World, id: CareerId): CareerProgress {
  let p = w.careers.progress[id];
  if (!p) { p = { level: 0, xp: 0, best: 0 }; w.careers.progress[id] = p; }
  p.level = Math.max(0, Math.min(MAX_LEVEL, Math.floor(p.level)));
  return p;
}
export const levelOf = (w: World, id: CareerId): number => progressOf(w, id).level;

/** Difficulté du prochain mini-jeu : 1 (débutante) à 5. */
export const difficultyFor = (level: number): number => Math.max(1, Math.min(5, Math.floor(level) + 1));

/** Change de carrière SANS toucher à la progression d'aucune carrière. */
export function setCurrent(w: World, id: CareerId): boolean {
  if (!isCareer(id)) return false;
  w.careers.current = id;
  return true;
}
export const currentCareer = (w: World): CareerId | null => (isCareer(w.careers.current) ? w.careers.current : null);

// ------------------------------------------------------------------ formules
/** Expérience gagnée pour un score 0–100 (toujours un petit peu, jamais punitif). */
export const xpGain = (score: number, difficulty: number): number =>
  Math.round(clamp(score, 0, 100) * 0.55 + 6 + difficulty * 2);

const FAN_BASE = [9, 26, 100, 500, 3500, 26000];
/**
 * Fans gagnés lors d'une séance (popularité FICTIVE du jeu) : dépend du score
 * (courbe douce) et du palier atteint de la carrière.
 */
export function fansForSession(score: number, level: number): number {
  const s = clamp(score, 0, 100) / 100;
  if (s <= 0) return 0;
  const base = FAN_BASE[Math.max(0, Math.min(MAX_LEVEL, Math.floor(level)))];
  const bonus = s >= 0.9 ? 1.3 : s >= 0.75 ? 1.12 : 1;
  return Math.max(1, Math.round(base * Math.pow(s, 1.5) * bonus));
}

export const fansTierOf = (n: number): number => FAN_TIERS.reduce((t, v, i) => (n >= v ? i : t), -1);

function clamp(v: number, a: number, b: number): number { return Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : a; }

// ------------------------------------------------------------------ objectifs
const key = (id: CareerId, metric: string) => `career.${id}.p.${metric}`;
const prefix = (id: CareerId) => `career.${id}.p.`;
const val = (w: World, id: CareerId, metric: string): number => w.extra[key(id, metric)] ?? 0;

export const tierDef = (id: CareerId, level: number): TierDef | null => CAREERS[id].tiers[level] ?? null;

export interface ObjectiveView {
  career: CareerId; level: number; tier: TierDef | null;
  have: number; need: number; label: string; objectiveDone: boolean;
  xpHave: number; xpNeed: number; xpDone: boolean; ready: boolean; maxed: boolean;
}

/** Progression vers le palier suivant. */
export function objectiveProgress(w: World, id: CareerId): ObjectiveView {
  const p = progressOf(w, id);
  const tier = tierDef(id, p.level);
  if (!tier) return { career: id, level: p.level, tier: null, have: 0, need: 0, label: '', objectiveDone: true, xpHave: p.xp, xpNeed: p.xp, xpDone: true, ready: false, maxed: true };
  const have = Math.min(tier.obj.need, val(w, id, tier.obj.metric));
  const objectiveDone = have >= tier.obj.need;
  const xpDone = p.xp >= tier.xpNeed;
  return { career: id, level: p.level, tier, have, need: tier.obj.need, label: tier.obj.label, objectiveDone, xpHave: Math.min(p.xp, tier.xpNeed), xpNeed: tier.xpNeed, xpDone, ready: objectiveDone && xpDone, maxed: false };
}

/** Style de thème que l'objectif en cours demande (pour que les propositions le contiennent). */
export function wantedTag(w: World, id: CareerId): string | null {
  const t = tierDef(id, progressOf(w, id).level);
  if (!t || !t.obj.metric.startsWith('tag:')) return null;
  return t.obj.metric.slice(4);
}

export interface SessionInput {
  score: number;
  /** Étiquettes de la séance (comptées pour « tag:xxx » si score ≥ 60). */
  tags?: string[];
  /** Meilleur combo de la séance (chanteuse). */
  combo?: number;
}

function bumpMetric(w: World, id: CareerId, metric: string, n = 1): void { w.extra[key(id, metric)] = val(w, id, metric) + n; }

export interface Outside { diamonds: number; energy: number; fans: number }
export interface GrantedItems { cloth: ClothId[]; dupCoins: number; furniture: string[] }

export interface SessionOutcome {
  career: CareerId;
  score: number;
  difficulty: number;
  level: number;
  xp: number;
  xpTotal: number;
  best: boolean;
  fans: number;
  levelUp: { from: number; to: number; tier: TierDef; reward: Reward; granted: GrantedItems } | null;
  /** Effets hors `World` à appliquer par l'appelant (diamants, énergie, fans). */
  outside: Outside;
  coins: number;
  newMagazines: MagazineId[];
}

/**
 * Enregistre une séance terminée : expérience, compteurs d'objectifs, passage
 * de palier (au plus un par séance), récompenses, magazines débloqués.
 * Les fans de la séance (+ ceux de la récompense) sont dans `outside.fans` :
 * l'appelant les ajoute via `addFans`.
 */
export function recordSession(w: World, id: CareerId, input: SessionInput): SessionOutcome {
  const p = progressOf(w, id);
  const score = Math.round(clamp(input.score, 0, 100));
  const level = p.level;
  const difficulty = difficultyFor(level);
  const xp = xpGain(score, difficulty);
  p.xp += xp;
  const best = score > p.best;
  if (best) p.best = score;

  // compteurs d'objectifs
  bumpMetric(w, id, 'sessions');
  for (const [m, t] of [['s60', 60], ['s75', 75], ['s90', 90], ['s100', 100]] as const) if (score >= t) bumpMetric(w, id, m);
  w.extra[key(id, 'streak')] = score >= SUCCESS_SCORE ? val(w, id, 'streak') + 1 : 0;
  if (score >= SUCCESS_SCORE) for (const t of new Set(input.tags ?? [])) bumpMetric(w, id, `tag:${t}`);
  if (input.combo && input.combo > val(w, id, 'combo')) w.extra[key(id, 'combo')] = Math.floor(input.combo);
  w.extra[`career.${id}.sessions`] = (w.extra[`career.${id}.sessions`] ?? 0) + 1;

  const fans0 = fansForSession(score, level);
  const outside: Outside = { diamonds: 0, energy: 0, fans: fans0 };
  const sessCoins = Math.round(25 + score * 2.4 + difficulty * 20 + level * 20); // un vrai métier : ça rapporte
  w.res.coins = Math.min(999_999_999, w.res.coins + sessCoins);
  let coins = sessCoins;

  let levelUp: SessionOutcome['levelUp'] = null;
  const view = objectiveProgress(w, id);
  if (view.tier && view.ready) {
    p.level = level + 1;
    for (const k of Object.keys(w.extra)) if (k.startsWith(prefix(id))) delete w.extra[k];
    const g = applyReward(w, view.tier.reward);
    outside.diamonds += g.outside.diamonds;
    outside.energy += g.outside.energy;
    outside.fans += g.outside.fans;
    coins += view.tier.reward.coins ?? 0;
    levelUp = { from: level, to: level + 1, tier: view.tier, reward: view.tier.reward, granted: g.items };
  }
  const newMagazines = syncMagazines(w);
  return { career: id, score, difficulty, level: p.level, xp, xpTotal: p.xp, best, fans: outside.fans, levelUp, outside, coins, newMagazines };
}

// ------------------------------------------------------------------ récompenses
/**
 * Applique la partie « World » d'une récompense (pièces, matériaux, tenues,
 * meubles) et renvoie ce qui doit être appliqué ailleurs (diamants, énergie, fans).
 * Une tenue déjà possédée est remplacée par la moitié de son prix en pièces.
 */
export function applyReward(w: World, r: Reward): { outside: Outside; items: GrantedItems } {
  const add = (k: 'coins' | 'fabric' | 'flowers' | 'cocoa', n: number | undefined) => { if (n && n > 0) w.res[k] = Math.min(999_999_999, w.res[k] + Math.floor(n)); };
  add('coins', r.coins); add('fabric', r.fabric); add('flowers', r.flowers); add('cocoa', r.cocoa);
  const items: GrantedItems = { cloth: [], dupCoins: 0, furniture: [] };
  for (const c of r.cloth ?? []) {
    if (w.wardrobe.owned.includes(c)) {
      const back = Math.floor((CLOTHES[c]?.coins ?? 0) / 2);
      w.res.coins = Math.min(999_999_999, w.res.coins + back);
      items.dupCoins += back;
    } else {
      w.wardrobe.owned.push(c);
      items.cloth.push(c);
    }
  }
  for (const f of r.furniture ?? []) {
    w.castle.owned[f] = (w.castle.owned[f] ?? 0) + 1;
    items.furniture.push(f);
  }
  return { outside: { diamonds: Math.max(0, r.diamonds ?? 0), energy: Math.max(0, r.energy ?? 0), fans: Math.max(0, r.fans ?? 0) }, items };
}

// ------------------------------------------------------------------ paliers de fans
export interface FanTierClaim { tier: number; def: FanTierDef; outside: Outside; items: GrantedItems }

/**
 * Récompense (une seule fois chacun) les paliers de fans atteints mais pas encore
 * vus (`fansTierSeen`). À appeler après `addFans`. Idempotent.
 */
export function claimFanTiers(w: World): FanTierClaim[] {
  const out: FanTierClaim[] = [];
  const reached = fansTierOf(w.fans);
  for (let t = w.fansTierSeen + 1; t <= reached && t < FAN_TIER_DEFS.length; t++) {
    const def = FAN_TIER_DEFS[t];
    const g = applyReward(w, def.reward);
    if (def.magazine && !w.magazines.includes(def.magazine)) w.magazines.push(def.magazine);
    out.push({ tier: t, def, outside: g.outside, items: g.items });
  }
  if (reached > w.fansTierSeen) w.fansTierSeen = reached;
  return out;
}

// ------------------------------------------------------------------ magazines
export function magazineUnlocked(w: World, id: MagazineId): boolean {
  const u = MAGAZINES[id].unlock;
  if (u.anyLevel !== undefined && CAREER_IDS.some((c) => levelOf(w, c) >= u.anyLevel!)) return true;
  if (u.careers?.some((c) => levelOf(w, c.id) >= c.level)) return true;
  if (u.fansTier !== undefined && fansTierOf(w.fans) >= u.fansTier) return true;
  return false;
}

/** Ajoute à `w.magazines` les couvertures désormais débloquées et les renvoie. */
export function syncMagazines(w: World): MagazineId[] {
  const fresh: MagazineId[] = [];
  for (const id of MAGAZINE_IDS) {
    if (!w.magazines.includes(id) && magazineUnlocked(w, id)) { w.magazines.push(id); fresh.push(id); }
  }
  return fresh;
}

export const ownedMagazinesOf = (w: World): MagazineId[] => MAGAZINE_IDS.filter((id) => w.magazines.includes(id));

/** Résumé : niveau total des carrières (pour l'écran d'accueil). */
export const totalLevels = (w: World): number => CAREER_IDS.reduce((a, c) => a + levelOf(w, c), 0);

export type { Objective };

// ------------------------------------------------------------------ salaire
export const SALARY_COOLDOWN_MS = 4 * 3600_000;
const SALARY_KEY = 'career.salary.ts';

export interface SalaryInfo { ready: boolean; amount: number; nextInMs: number }

/** Salaire à toucher : une base, plus un bonus par palier de carrière et par tranche de fans. */
export function salaryAmount(w: World): number {
  return 60 + totalLevels(w) * 55 + Math.min(300, Math.floor(w.fans / 40));
}

export function salaryInfo(w: World, now: number): SalaryInfo {
  const last = w.extra[SALARY_KEY] ?? 0;
  const wait = last > now ? SALARY_COOLDOWN_MS : Math.max(0, last + SALARY_COOLDOWN_MS - now);
  return { ready: wait === 0, amount: salaryAmount(w), nextInMs: wait };
}

/** Touche le salaire s'il est prêt ; renvoie le montant versé (0 sinon). */
export function claimSalary(w: World, now: number): number {
  const info = salaryInfo(w, now);
  if (!info.ready) return 0;
  w.extra[SALARY_KEY] = now;
  w.res.coins = Math.min(999_999_999, w.res.coins + info.amount);
  return info.amount;
}
