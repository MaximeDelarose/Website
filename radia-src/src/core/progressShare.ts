/**
 * Progression de jeu PARTAGÉE (avec le consentement distinct « Partager ma progression ») : logique PURE, sans DOM.
 * On n'envoie que des chiffres de progression et des résumés d'activité — jamais de messages, de conversations,
 * de contacts, de position, ni de détail des interactions sociales, et pas un enregistrement des clics.
 *  - `buildSnapshot(save)` : l'état RÉELLEMENT sauvegardé (un niveau en cours n'est jamais « terminé »).
 *  - `diffEvents(prev, next)` : jalons détectés entre deux instantanés, avec des identifiants stables (jamais enregistrés deux fois).
 *  - `counters(save)` + `sessionSummary` : activités d'une session = différences entre le début et maintenant.
 *  - `ModeMeter` : temps ACTIF réparti par mode (échantillonné, jamais en arrière-plan).
 */
import { CHAPTERS, STORY, chapterAt, levelStep } from '../data/story';
import { LEVELS, levelById } from '../data/levels';
import { itemName } from '../data/items';
import { CLOTHES } from '../data/world/wardrobe';
import { FURNITURE } from '../data/world/furniture';
import { ROOM_IDS } from '../data/world/ids';
import { UPGRADES, owns } from '../game/endless/pimbeche';
import { xpView } from '../game/endless/xp';
import { isUnlocked } from '../game/endless/unlocks';
import { objectiveProgress } from '../game/merge/rules';
import type { Objective } from '../game/merge/types';
import type { SaveData } from '../save/schema';

export interface Snap {
  v: 1; at: number;
  story: {
    step: number; chapter: number; chapterTitle: string; chapterSubtitle: string; chaptersTotal: number;
    levelsDone: number; levelsTotal: number; chapterDone: number; chapterTotal: number; chapterPct: number; storyPct: number; finished: boolean;
    current: { id: number; title: string } | null;
    lastDone: { id: number; title: string } | null;
    objective: { label: string; have: number; goal: number } | null;
    /** Faux = aucune partie de ce niveau n'est sauvegardée : la progression de l'objectif n'est pas connue. */
    inRun: boolean;
  };
  xp: { level: number; xp: number; into: number; need: number };
  free: { orders: number; easy: number; mid: number; hard: number; merges: number; combos: number; bestCombo: number; discoveries: number; levelsWon: number; albumTotal: number };
  pimb: { unlocked: boolean; workshop: number; upgrades: string[]; recipes: string[]; soapOrders: number; soapMade: number; loyal: number; collection: number; collectionTotal: number };
  world: {
    rooms: number; roomsTotal: number; furniture: number; furnitureTotal: number; wardrobe: number; wardrobeTotal: number;
    gardenPlots: number; chocRecipes: number; chocShop: number; careers: number; cat: boolean; family: number; pct: number;
  };
}

const num = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) ? n : 0);

function objectiveLabel(o: Objective): string {
  switch (o.t) {
    case 'create': return `Fabriquer ${o.count && o.count > 1 ? `${o.count} × ` : ''}${itemName({ c: o.item[0], l: o.item[1] } as never)}`;
    case 'orders': return `Livrer ${o.count} commande${o.count > 1 ? 's' : ''}`;
    case 'gifts': return 'Ouvrir tous les paquets cadeaux';
    case 'score': return `Atteindre ${o.value} points`;
    case 'merges': return `Réaliser ${o.count} fusions`;
    case 'combo': return `Faire un combo de ${o.value}`;
  }
}

export function buildSnapshot(d: SaveData, now: number = Date.now()): Snap {
  const step = Math.max(0, Math.min(d.story.step, STORY.length));
  const done = (id: number): boolean => !!d.levels[String(id)]?.done;
  const finished = step >= STORY.length || d.story.endingSeen;
  // niveau actuel = prochain niveau de l'histoire à partir de l'étape sauvegardée
  let cur: { id: number; title: string } | null = null;
  for (let i = step; i < STORY.length && !cur; i++) { const s = STORY[i]; if (s.t === 'level') cur = { id: s.id, title: levelById(s.id)?.title ?? `Niveau ${s.id}` }; }
  const chapter = chapterAt(Math.min(step, STORY.length - 1));
  const chDef = CHAPTERS.find((c) => c.n === chapter) ?? CHAPTERS[0];
  const chLevels = LEVELS.filter((l) => l.chapter === chapter);
  const chapterDone = chLevels.filter((l) => done(l.id)).length;
  const levelsDone = LEVELS.filter((l) => done(l.id)).length;
  let last: { id: number; title: string } | null = null;
  for (const l of LEVELS) if (done(l.id) && (!last || levelStep(l.id) > levelStep(last.id))) last = { id: l.id, title: l.title };
  // objectif en cours : seulement si une partie de CE niveau est réellement sauvegardée
  let objective: Snap['story']['objective'] = null; let inRun = false;
  const run = d.run;
  const def = cur ? levelById(cur.id) : undefined;
  if (run && run.mode === 'story' && def && run.levelId === def.id && !run.won) {
    inRun = true;
    const pending = def.objectives.map((o) => ({ o, p: objectiveProgress(run, o) })).find((x) => x.p.cur < x.p.max) ?? { o: def.objectives[0], p: objectiveProgress(run, def.objectives[0]) };
    if (pending.o) objective = { label: objectiveLabel(pending.o), have: pending.p.cur, goal: pending.p.max };
  } else if (def && def.objectives[0]) {
    objective = { label: objectiveLabel(def.objectives[0]), have: 0, goal: objectiveProgress({ created: {}, ordersDone: 0, cells: [], score: 0, merges: 0, bestCombo: 0 } as never, def.objectives[0]).max };
  }
  const f = d.fun; const c = f.endless2.counters; const st = d.stats;
  const xv = xpView(f);
  const album = f.endless2.album;
  const soapAlbum = album.filter((k) => k.startsWith('soap:')).length;
  const ownedFurn = Object.values(d.world.castle.owned).filter((n) => n > 0).length;
  const wardrobe = d.world.wardrobe.owned.length;
  const wardrobeTotal = Object.values(CLOTHES).filter((x) => !x.gift && !x.free).length;
  const furnTotal = Object.keys(FURNITURE).length;
  const rooms = d.world.castle.unlocked.length;
  // pourcentage de MON MONDE : seulement sur des objectifs finis réellement définis (pièces, tenues, meubles)
  const pct = Math.round(((rooms / ROOM_IDS.length) + (Math.min(wardrobe, wardrobeTotal) / wardrobeTotal) + (Math.min(ownedFurn, furnTotal) / furnTotal)) / 3 * 100);
  return {
    v: 1, at: now,
    story: {
      step, chapter, chapterTitle: chDef.title, chapterSubtitle: chDef.subtitle, chaptersTotal: CHAPTERS.length,
      levelsDone, levelsTotal: LEVELS.length, chapterDone, chapterTotal: chLevels.length,
      chapterPct: chLevels.length ? Math.round(chapterDone / chLevels.length * 100) : 0, storyPct: Math.round(levelsDone / LEVELS.length * 100),
      finished, current: finished ? null : cur, lastDone: last, objective, inRun,
    },
    xp: { level: xv.level, xp: xv.xp, into: xv.into, need: xv.need },
    free: {
      orders: num(c.orders), easy: num(c['orders:easy']), mid: num(c['orders:mid']), hard: num(c['orders:hard']),
      merges: num(st.merges), combos: num(st.combos), bestCombo: num(st.bestCombo), discoveries: d.discovered.length + album.length,
      levelsWon: num(st.levelsWon), albumTotal: 0,
    },
    pimb: {
      unlocked: isUnlocked(f, 'soap'), workshop: isUnlocked(f, 'soap') ? 1 + UPGRADES.filter((u) => u.kind === 'atelier' && owns(f, u.id)).length : 0,
      upgrades: UPGRADES.filter((u) => owns(f, u.id)).map((u) => u.id), recipes: UPGRADES.filter((u) => u.kind === 'recette' && owns(f, u.id)).map((u) => u.id),
      soapOrders: num(c.soapOrders), soapMade: num(c.soapMade), loyal: Object.values(f.customers).filter((x) => x.seenLevel >= 1).length,
      collection: soapAlbum, collectionTotal: 8,
    },
    world: {
      rooms, roomsTotal: ROOM_IDS.length, furniture: ownedFurn, furnitureTotal: furnTotal, wardrobe, wardrobeTotal,
      gardenPlots: d.world.garden.plotCount, chocRecipes: d.world.choc.recipes.length, chocShop: d.world.choc.shopLevel,
      careers: Object.keys(d.world.careers.progress).length, cat: d.world.cat.adopted,
      family: Object.values(d.world.family.kids).filter((k) => k.bond > 0).length, pct,
    },
  };
}

// ------------------------------------------------------------------ jalons (idempotents)
export interface ProgressEvent { id: string; at: number; kind: 'chapter_start' | 'level_done' | 'chapter_unlocked' | 'chapter_done' | 'narrative' | 'xp_level' | 'pimb_unlock' | 'pimb_upgrade'; label: string }

/** Jalons détectés entre deux instantanés. Identifiants stables : un renvoi ne crée jamais de doublon (le serveur ignore un identifiant déjà connu). */
export function diffEvents(prev: Snap | null, next: Snap, d: SaveData): ProgressEvent[] {
  if (!prev) return []; // premier instantané : on ne reconstitue rien
  const out: ProgressEvent[] = [];
  const at = next.at;
  if (next.story.levelsDone > prev.story.levelsDone) {
    for (const l of LEVELS) {
      const nowDone = !!d.levels[String(l.id)]?.done;
      if (nowDone && levelStep(l.id) > (prev.story.lastDone ? levelStep(prev.story.lastDone.id) : -1)) out.push({ id: `lvl:${l.id}`, at, kind: 'level_done', label: `Niveau ${l.id} terminé — ${l.title}` });
    }
  }
  if (next.story.chapter > prev.story.chapter) {
    for (let ch = prev.story.chapter + 1; ch <= next.story.chapter; ch++) {
      const def = CHAPTERS.find((c) => c.n === ch);
      out.push({ id: `chu:${ch}`, at, kind: 'chapter_unlocked', label: `Chapitre ${ch} débloqué — ${def?.title ?? ''}` });
      out.push({ id: `chs:${ch}`, at, kind: 'chapter_start', label: `Chapitre ${ch} commencé` });
      if (ch - 1 >= 1) out.push({ id: `chd:${ch - 1}`, at, kind: 'chapter_done', label: `Chapitre ${ch - 1} terminé` });
    }
  }
  if (!prev.story.finished && next.story.finished) out.push({ id: 'chd:final', at, kind: 'chapter_done', label: 'Histoire terminée' });
  const dm = d.memories.length + d.photos.length;
  void dm;
  if (next.xp.level > prev.xp.level) out.push({ id: `xp:${next.xp.level}`, at, kind: 'xp_level', label: `Niveau de Radia ${next.xp.level}` });
  if (!prev.pimb.unlocked && next.pimb.unlocked) out.push({ id: 'pimb:open', at, kind: 'pimb_unlock', label: 'Atelier PIMBÊCHE débloqué' });
  for (const u of next.pimb.upgrades) if (!prev.pimb.upgrades.includes(u)) out.push({ id: `pimb:${u}`, at, kind: 'pimb_upgrade', label: `Amélioration PIMBÊCHE : ${UPGRADES.find((x) => x.id === u)?.name ?? u}` });
  return out;
}

/** Jalons narratifs : souvenirs et photos réellement ajoutés à la sauvegarde (récompenses de l'histoire). */
export function narrativeEvents(prev: { memories: number; photos: number } | null, d: SaveData, at: number): ProgressEvent[] {
  if (!prev) return [];
  const out: ProgressEvent[] = [];
  if (d.memories.length > prev.memories) for (const m of d.memories.slice(prev.memories)) out.push({ id: `mem:${m}`, at, kind: 'narrative', label: `Souvenir débloqué : ${m}` });
  if (d.photos.length > prev.photos) for (const p of d.photos.slice(prev.photos)) out.push({ id: `pho:${p}`, at, kind: 'narrative', label: `Photo débloquée : ${p}` });
  return out;
}

// ------------------------------------------------------------------ résumé de session
export type Counters = Record<string, number>;
/** Compteurs cumulés servant à calculer ce qui s'est passé PENDANT une session (fin − début). */
export function counters(d: SaveData): Counters {
  const f = d.fun; const c = f.endless2.counters; const st = d.stats;
  return {
    orders: num(c.orders), merges: num(st.merges), levels: LEVELS.filter((l) => d.levels[String(l.id)]?.done).length, soap: num(c.soapMade),
    soapOrders: num(c.soapOrders), furniture: Object.values(d.world.castle.owned).reduce((a, b) => a + (b > 0 ? 1 : 0), 0), clothes: d.world.wardrobe.owned.length,
    discoveries: d.discovered.length + f.endless2.album.length, xp: num(c.xp), combos: num(st.combos), upgrades: UPGRADES.filter((u) => owns(f, u.id)).length,
  };
}
export interface SessionSummary { base: Counters; now: Counters; start: { chapter: number; level: number | null }; end: { chapter: number; level: number | null } }
export const lvlOf = (s: Snap): number | null => s.story.current?.id ?? null;
export function sessionSummary(base: Counters, now: Counters, startSnap: Snap, nowSnap: Snap): SessionSummary {
  return { base, now, start: { chapter: startSnap.story.chapter, level: lvlOf(startSnap) }, end: { chapter: nowSnap.story.chapter, level: lvlOf(nowSnap) } };
}

// ------------------------------------------------------------------ temps actif par mode
export const MODES = ['chapters', 'endless', 'world', 'dressing', 'pimbeche', 'casino', 'chess', 'events', 'other'] as const;
export type Mode = (typeof MODES)[number];
export class ModeMeter {
  private secs: Partial<Record<Mode, number>> = {};
  private seen = new Set<Mode>();
  /** `activeS` = secondes ACTIVES écoulées depuis l'échantillon précédent (0 si en arrière-plan / inactive : rien n'est compté). */
  sample(mode: Mode, activeS: number): void { if (activeS > 0) { this.secs[mode] = (this.secs[mode] ?? 0) + activeS; } this.seen.add(mode); }
  /** Secondes à envoyer et à remettre à zéro. */
  drain(): Partial<Record<Mode, number>> { const o = { ...this.secs }; this.secs = {}; return o; }
  giveBack(m: Partial<Record<Mode, number>>): void { for (const [k, v] of Object.entries(m)) this.secs[k as Mode] = (this.secs[k as Mode] ?? 0) + (v ?? 0); }
  /** Modes visités pendant la session (pour compter les sessions par mode). */
  visited(): Mode[] { return [...this.seen]; }
}

/** Mode de jeu affiché, d'après la présence d'éléments de l'écran (aucun suivi des clics). L'ordre = priorité (l'élément le plus « par-dessus » d'abord). */
export function detectMode(has: (selector: string) => boolean): Mode {
  if (has('.cz-root')) return 'casino';
  if (has('.en-pimb')) return 'pimbeche';
  if (has('.chess-screen')) return 'chess';
  if (has('.merge-hud.endless')) return 'endless';
  if (has('.merge-hud')) return 'chapters';
  if (has('.dr2-stage, .dr-stage')) return 'dressing';
  if (has('.cs-screen, .gd-stage, .cat-screen, .hub-stage, .ch-body, .fam-stage, .fn-body, .dc2-error, .career-screen')) return 'world';
  if (has('.fam-scene, .ev-root, .ev-screen')) return 'events';
  return 'other';
}
