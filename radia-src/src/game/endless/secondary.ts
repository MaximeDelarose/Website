/**
 * Événements secondaires (2 actifs au plus), pilotés par les données : ils progressent grâce aux
 * mêmes fusions / commandes / découvertes que le reste du jeu. Pas de date limite, pas de connexion
 * quotidienne, aucune récompense perdue (chaque palier est versé dès qu'il est atteint).
 */
import { isUnlocked as isUnlockedColl } from './unlocks';
import type { CollectionId } from '../../data/items';
import type { FunState } from '../../save/fun';
import type { BoardEvent, Loot } from '../merge/types';

export interface SecStage { goal: number; reward: Loot[] }
export interface SecDef {
  id: string;
  name: string;
  blurb: string;
  /** Nom d'icône suggéré pour l'interface (clé de src/ui/icons ou texture). */
  icon: string;
  color: string;
  /** Collection à débloquer pour que l'événement soit proposé (null = toujours). */
  needs: CollectionId | null;
  /** Texte de l'objectif (« Fusionne N fleurs »), `{n}` = objectif du palier. */
  goalText: string;
  stages: SecStage[];
  /** Combien d'avancement un événement du moteur apporte (0 = rien). */
  advance(ev: BoardEvent): number;
}

const L = (kind: Loot['kind'], n: number, rarity?: Loot['rarity'], seed?: number): Loot => ({ kind, n, rarity, seed });

export const SEC_DEFS: SecDef[] = [
  {
    id: 'flowerFest', name: 'Festival des fleurs', blurb: 'Les fleurs de tout le royaume se réunissent pour fêter le printemps.', icon: 'flower', color: '#FF75A8',
    needs: 'flowers', goalText: 'Fusionne {n} fleurs',
    stages: [
      { goal: 30, reward: [L('coins', 60), L('flowers', 8)] },
      { goal: 68, reward: [L('coins', 120), L('deco', 1, 'uncommon', 11)] },
      { goal: 120, reward: [L('coins', 220), L('accessory', 1, 'rare', 12), L('chest', 1)] },
    ],
    advance: (e) => (e.t === 'merge' && (e.result.c === 'flowers' || e.result.c === 'rare') && e.result.l >= 2 ? 1 : 0),
  },
  {
    id: 'chocoCollection', name: 'Collection de chocolats', blurb: 'Le chocolatier prépare une collection spéciale. Il manque juste… tes chocolats.', icon: 'heart', color: '#9A5B3A',
    needs: 'choc', goalText: 'Crée {n} chocolats (niveau 3 et +) ou livre-en',
    stages: [
      { goal: 22, reward: [L('coins', 80), L('cocoa', 10)] },
      { goal: 52, reward: [L('coins', 160), L('bag', 1, 'rare', 21)] },
      { goal: 90, reward: [L('coins', 300), L('deco', 1, 'epic', 22), L('chest', 1)] },
    ],
    advance: (e) => (e.t === 'merge' && e.result.c === 'choc' && e.result.l >= 3 ? 1 : e.t === 'deliver' ? (e.items ?? []).filter((r) => r.c === 'choc').length * 2 : 0),
  },
  {
    id: 'souvenirAlbum', name: 'Album de souvenirs', blurb: 'Chaque nouvel objet découvert ajoute un souvenir à l\'album.', icon: 'album', color: '#B9A5E8',
    needs: 'paris', goalText: 'Découvre {n} nouveaux objets',
    stages: [
      { goal: 6, reward: [L('coins', 50), L('energy', 10)] },
      { goal: 14, reward: [L('coins', 110), L('fragment', 2, 'uncommon')] },
      { goal: 24, reward: [L('coins', 220), L('accessory', 1, 'rare', 33), L('ticket', 2)] },
    ],
    advance: (e) => (e.t === 'discover' && e.isNew ? 1 : 0),
  },
  {
    id: 'castlePuzzle', name: 'Puzzle du château', blurb: 'Des pièces de puzzle se cachent dans les fusions royales. Reconstitue le château !', icon: 'castle', color: '#F3C86B',
    needs: 'chess', goalText: 'Trouve {n} pièces de puzzle (objets royaux niveau 3 et +)',
    stages: [
      { goal: 18, reward: [L('coins', 90), L('deco', 1, 'uncommon', 41)] },
      { goal: 42, reward: [L('coins', 180), L('deco', 1, 'rare', 42)] },
      { goal: 75, reward: [L('coins', 350), L('deco', 1, 'epic', 43), L('chest', 1)] },
    ],
    advance: (e) => (e.t === 'merge' && (e.result.c === 'chess' || e.result.c === 'castle') && e.result.l >= 3 ? 1 : 0),
  },
  {
    id: 'jewelCollection', name: 'Collection de bijoux', blurb: 'Le joaillier du royaume cherche de belles pièces pour sa vitrine.', icon: 'gem', color: '#7FD6E8',
    needs: 'jewel', goalText: 'Crée {n} bijoux (niveau 3 et +)',
    stages: [
      { goal: 15, reward: [L('coins', 100), L('accessory', 1, 'uncommon', 51)] },
      { goal: 38, reward: [L('coins', 200), L('accessory', 1, 'rare', 52)] },
      { goal: 68, reward: [L('coins', 400), L('accessory', 1, 'epic', 53), L('diamonds', 5), L('chest', 1)] },
    ],
    advance: (e) => (e.t === 'merge' && e.result.c === 'jewel' && e.result.l >= 3 ? 1 : 0),
  },
  {
    id: 'mergeChallenges', name: 'Défis de fusion', blurb: 'Enchaîne les fusions et les combos pour relever les défis.', icon: 'bolt', color: '#E8558F',
    needs: null, goalText: 'Fais {n} combos (×3 et plus)',
    stages: [
      { goal: 6, reward: [L('coins', 40), L('energy', 8)] },
      { goal: 15, reward: [L('coins', 90), L('wand', 1)] },
      { goal: 30, reward: [L('coins', 180), L('chest', 1), L('wind', 1)] },
    ],
    advance: (e) => (e.t === 'comboTier' && e.tier === 0 ? 1 : 0),
  },
];

export const secDef = (id: string): SecDef | undefined => SEC_DEFS.find((d) => d.id === id);
export const SEC_MAX_ACTIVE = 2;

const eligible = (fun: FunState, d: SecDef) => d.needs === null || isUnlockedColl(fun, d.needs);

/** Garde au plus 2 événements actifs, retire les inconnus, complète selon les collections débloquées. */
export function syncSecondary(fun: FunState, avoid?: string): void {
  const e = fun.endless2;
  e.sec = e.sec.filter((s) => !!secDef(s.id)).slice(0, SEC_MAX_ACTIVE);
  for (const s of e.sec) {
    const d = secDef(s.id)!;
    s.stage = Math.min(s.stage, d.stages.length - 1);
    s.goal = d.stages[s.stage].goal;
  }
  while (e.sec.length < SEC_MAX_ACTIVE) {
    const cand = SEC_DEFS.filter((d) => eligible(fun, d) && !e.sec.some((s) => s.id === d.id))
      .sort((a, b) => (e.secDone[a.id] ?? 0) - (e.secDone[b.id] ?? 0) || SEC_DEFS.indexOf(a) - SEC_DEFS.indexOf(b));
    const pick = cand.find((d) => d.id !== avoid) ?? cand[0];
    if (!pick) break;
    e.sec.push({ id: pick.id, progress: 0, goal: pick.stages[0].goal, stage: 0 });
  }
}

/** Vue pour l'interface. */
export interface SecView { id: string; name: string; blurb: string; icon: string; color: string; progress: number; goal: number; stage: number; stages: number; text: string; nextReward: Loot[] }
export function secondaryView(fun: FunState): SecView[] {
  syncSecondary(fun);
  return fun.endless2.sec.map((s) => {
    const d = secDef(s.id)!;
    return { id: d.id, name: d.name, blurb: d.blurb, icon: d.icon, color: d.color, progress: s.progress, goal: s.goal, stage: s.stage, stages: d.stages.length, text: d.goalText.replace('{n}', String(s.goal)), nextReward: d.stages[s.stage].reward };
  });
}

/**
 * Fait progresser les événements actifs d'après UN événement du moteur. Renvoie les événements
 * `secondary` à émettre (progression, palier atteint avec sa récompense). `settle` règle les récompenses
 * gérées par le moteur (coffres, tickets, fragments).
 */
export function onEngineEvent(fun: FunState, ev: BoardEvent, settle: (l: Loot[]) => Loot[] = (l) => l): BoardEvent[] {
  const out: BoardEvent[] = [];
  const e = fun.endless2;
  let finishedId: string | undefined;
  for (const s of [...e.sec]) {
    const d = secDef(s.id);
    if (!d) continue;
    const inc = d.advance(ev);
    if (inc <= 0) continue;
    s.progress += inc;
    while (s.progress >= s.goal) {
      const st = d.stages[s.stage];
      s.progress -= s.goal;
      const reward = settle(st.reward.map((x) => ({ ...x })));
      const last = s.stage >= d.stages.length - 1;
      out.push({ t: 'secondary', id: s.id, progress: s.goal, goal: s.goal, done: true, stage: s.stage, reward, ...(last ? { final: true } : {}) });
      if (last) { e.secDone[s.id] = (e.secDone[s.id] ?? 0) + 1; e.sec = e.sec.filter((x) => x !== s); finishedId = s.id; s.progress = 0; break; }
      s.stage++;
      s.goal = d.stages[s.stage].goal;
    }
    if (!finishedId || finishedId !== s.id) out.push({ t: 'secondary', id: s.id, progress: s.progress, goal: s.goal, done: false, stage: s.stage });
  }
  if (finishedId) syncSecondary(fun, finishedId);
  return out;
}
