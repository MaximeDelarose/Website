/** Accès à la sauvegarde pour Clips et Snap (`save.data.fun.apps.clips` / `.snap`), sanitisés une fois par objet. */
import { save, reducedFx } from '../core/app';
import { ev } from '../events/api';
import type { PhotoRec } from '../events/types';
import { sanitizeInPlace as sanClips, stateBytes, MAX_MINE, type ClipsState } from './clips/model';
import { sanitizeInPlace as sanSnap, type SnapState } from './snap/model';
import type { CatOpts } from '../game/art/world/cat';
import { sanitizeBrain } from './brain/memory';
import type { BrainState } from './brain/types';

const seen = new WeakSet<object>();
export function clipsState(): ClipsState {
  const raw = save.data.fun.apps.clips;
  if (!seen.has(raw)) { sanClips(raw); seen.add(raw); }
  return raw as unknown as ClipsState;
}
export function snapState(): SnapState {
  const raw = save.data.fun.apps.snap;
  if (!seen.has(raw)) { sanSnap(raw); seen.add(raw); }
  return raw as unknown as SnapState;
}
/** Mémoire de conversation des personnages (Tindeur ET Snapchien : un seul cerveau, une seule mémoire par personnage). */
export function brainState(): BrainState {
  const raw = save.data.fun.apps.brain as Record<string, unknown>;
  if (!seen.has(raw)) { const clean = sanitizeBrain(raw); for (const k of Object.keys(raw)) delete raw[k]; Object.assign(raw, clean); seen.add(raw); }
  return raw as unknown as BrainState;
}
/** Sauvegarde, en gardant les deux modules très en dessous de 400 Ko. */
export function persist(): void {
  const c = clipsState();
  while (stateBytes(c) > 300_000 && c.mine.length > 20) c.mine.splice(0, Math.max(1, MAX_MINE >> 4));
  save.save();
}
export const photoById = (id: string): PhotoRec | undefined => ev().photos.find((p) => p.id === id);
export const catAdopted = (): boolean => save.data.world.cat.adopted;
export const catName = (): string => save.data.world.cat.name || 'le chat';
export function catOpts(): CatOpts { const e = save.data.world.cat.equipped; return { collar: e.collar, bed: e.bed }; }
export const worldFans = (): number => save.data.world.fans;
export const reduced = (): boolean => reducedFx();
export function removeAlbumPhotos(ids: string[]): void {
  if (!ids.length) return;
  const e = ev();
  e.photos = e.photos.filter((p) => !(ids.includes(p.id) && p.eventId === 'snap'));
}
