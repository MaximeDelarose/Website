/**
 * Progression : statistiques, objets découverts, cœurs, souvenirs, succès,
 * répliques contextuelles d'Auguste. Toute récompense passe par ici, avec des
 * gardes pour qu'elle ne puisse jamais être obtenue deux fois par erreur.
 */
import { save, events } from './app';
import { ACHIEVEMENTS, type AchievementDef } from '../data/achievements';
import { itemKey, itemName, type ItemRef } from '../data/items';
import { BARKS, BARK_COOLDOWN, type BarkTrigger } from '../data/dialogue';
import { memoryById } from '../data/memories';

export function stat(key: string, n = 1): void {
  save.data.stats[key] = (save.data.stats[key] ?? 0) + n;
  save.save();
}

export function statMax(key: string, v: number): void {
  if ((save.data.stats[key] ?? 0) < v) { save.data.stats[key] = v; save.save(); }
}

/** Marque un objet comme découvert. Renvoie vrai s'il est nouveau. */
export function discover(r: ItemRef): boolean {
  const k = itemKey(r);
  if (save.data.discovered.includes(k)) return false;
  save.data.discovered.push(k);
  save.save();
  events.emit('discover', r);
  return true;
}

export function addHearts(n: number): void {
  if (n <= 0) return;
  save.data.hearts += n;
  save.data.heartsTotal += n;
  save.save();
  events.emit('hearts', save.data.hearts);
}

export function spendHearts(n: number): boolean {
  if (save.data.hearts < n) return false;
  save.data.hearts -= n;
  save.save();
  events.emit('hearts', save.data.hearts);
  return true;
}

/** Débloque un souvenir (une seule fois). Renvoie vrai s'il est nouveau. */
export function unlockMemory(id: string): boolean {
  if (!memoryById(id) || save.data.memories.includes(id)) return false;
  save.data.memories.push(id);
  save.save();
  events.emit('memory', id);
  return true;
}

export function markMinigame(id: string, score = 0): boolean {
  const cur = save.data.minigames[id];
  const first = !cur?.done;
  save.data.minigames[id] = { done: true, best: Math.max(cur?.best ?? 0, score) };
  if (first) { save.data.economy.diamonds += 10; events.emit('economy', undefined); }
  save.save();
  return first;
}

/** Vérifie tous les succès ; renvoie ceux qui viennent d'être débloqués. */
/** Diamants offerts pour chaque succès. */
export const ACHIEVEMENT_DIAMONDS = 10;

export function checkAchievements(): AchievementDef[] {
  const fresh: AchievementDef[] = [];
  for (const a of ACHIEVEMENTS) {
    if (save.data.achievements[a.id]) continue;
    let ok = false;
    try { ok = a.check(save.data); } catch { ok = false; }
    if (ok) {
      save.data.achievements[a.id] = Date.now();
      save.data.economy.diamonds += ACHIEVEMENT_DIAMONDS;
      fresh.push(a);
    }
  }
  if (fresh.length) {
    save.save();
    for (const a of fresh) events.emit('achievement', a);
  }
  return fresh;
}

// ------------------------------------------------------------ répliques

const lastBark: Partial<Record<BarkTrigger, number>> = {};
const lastLine = new Map<BarkTrigger, number>();
type BarkSink = (text: string) => void;
let sink: BarkSink | null = null;

/** L'écran actif (HUD) indique où afficher les bulles d'Auguste. */
export function setBarkSink(fn: BarkSink | null): void { sink = fn; }

/** Fait parler Auguste si le déclencheur n'est pas en temps de recharge. */
export function bark(trigger: BarkTrigger, force = false): boolean {
  const now = Date.now();
  if (!force && now - (lastBark[trigger] ?? 0) < BARK_COOLDOWN[trigger]) return false;
  if (!sink) return false;
  const lines = BARKS[trigger];
  // évite de répéter la même phrase deux fois de suite
  let i = Math.floor(Math.random() * lines.length);
  if (lines.length > 1 && i === lastLine.get(trigger)) i = (i + 1) % lines.length;
  lastLine.set(trigger, i);
  lastBark[trigger] = now;
  sink(lines[i]);
  return true;
}

export const describeItem = (r: ItemRef) => itemName(r);
