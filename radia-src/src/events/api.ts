/** Accès à l'état des événements dans la sauvegarde (une seule porte d'entrée). */
import { save } from '../core/app';
import type { EventsState, PhotoRec } from './types';

export const ev = (): EventsState => save.data.events;

export function nextId(prefix: string): string {
  const e = ev();
  e.seq += 1;
  return `${prefix}${Date.now().toString(36)}${e.seq.toString(36)}`;
}

/** Ajoute une photo souvenir (max 80 conservées) et sauvegarde. */
export function addPhotoRec(rec: Omit<PhotoRec, 'id' | 'ts' | 'eventId'> & Partial<Pick<PhotoRec, 'id' | 'ts'>>, eventId: string): PhotoRec {
  const e = ev();
  const full: PhotoRec = { ...rec, id: rec.id ?? nextId('ph'), ts: rec.ts ?? Date.now(), eventId } as PhotoRec;
  e.photos.push(full);
  if (e.photos.length > 80) e.photos.splice(0, e.photos.length - 80);
  save.save();
  return full;
}
