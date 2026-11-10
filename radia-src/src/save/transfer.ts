/**
 * Transfert de la partie entre deux « stockages » : sur iPhone, Safari et l'application ajoutée à l'écran d'accueil ont chacun leur
 * propre mémoire (sauvegarde ET clé des photos). Ce module fabrique / lit un code à copier-coller « RADIA1:… » qui contient la
 * sauvegarde complète et, si elle existe, la clé des photos. Logique pure (testée) ; l'écriture est faite par `applyTransfer`.
 * Rien n'est jamais effacé : l'ancienne sauvegarde est conservée dans `radia-save-before-import` avant tout remplacement.
 */
import { migrate, SAVE_VERSION } from './schema';

import { lsKey } from '../config/gift';
export const TRANSFER_PREFIX = 'RADIA1:';
export const KEY_RE = /^[A-Za-z0-9_-]{20,}$/;
export const PHOTO_KEY_LS = lsKey('radia-k');
export const SAVE_LS = lsKey('radia-save-v1');
export const BEFORE_IMPORT_LS = lsKey('radia-save-before-import');

export interface TransferPayload { v: 1; at: number; save: Record<string, unknown>; key?: string }
export type Decoded = { ok: true; payload: TransferPayload; summary: string } | { ok: false; reason: string };

const toB64Url = (bytes: Uint8Array): string => {
  let bin = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode(...bytes.subarray(i, i + CH));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64Url = (s: string): Uint8Array => {
  const b = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

export function encodeTransfer(save: object, key: string | null, now = Date.now()): string {
  const payload: TransferPayload = { v: 1, at: now, save: save as Record<string, unknown>, ...(key && KEY_RE.test(key) ? { key } : {}) };
  return TRANSFER_PREFIX + toB64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

/** Lit un code collé (espaces et retours à la ligne tolérés). Ne modifie rien. */
export function decodeTransfer(code: string): Decoded {
  const clean = (code ?? '').replace(/\s+/g, '');
  if (!clean.startsWith(TRANSFER_PREFIX)) return { ok: false, reason: 'Ce code ne ressemble pas à une sauvegarde RADIA.' };
  let obj: unknown;
  try { obj = JSON.parse(new TextDecoder().decode(fromB64Url(clean.slice(TRANSFER_PREFIX.length)))); } catch { return { ok: false, reason: 'Le code est incomplet ou abîmé (copie-le en entier).' }; }
  if (!obj || typeof obj !== 'object') return { ok: false, reason: 'Le code est vide.' };
  const p = obj as Partial<TransferPayload>;
  if (p.v !== 1 || !p.save || typeof p.save !== 'object') return { ok: false, reason: 'Format de sauvegarde inconnu.' };
  const m = migrate(p.save);
  if (m.tooNew) return { ok: false, reason: 'Cette sauvegarde vient d\'une version plus récente du jeu : mets d\'abord RADIA à jour.' };
  const key = typeof p.key === 'string' && KEY_RE.test(p.key) ? p.key : undefined;
  const d = m.data as unknown as { hearts?: number; story?: { step?: number } };
  const summary = `Sauvegarde du ${new Date(typeof p.at === 'number' ? p.at : 0).toLocaleDateString('fr-FR')} · histoire étape ${d.story?.step ?? 0}${key ? ' · photos incluses' : ''}`;
  return { ok: true, payload: { v: 1, at: typeof p.at === 'number' ? p.at : 0, save: p.save, ...(key ? { key } : {}) }, summary };
}

/** Écrit la sauvegarde importée (après confirmation) ; garde l'ancienne dans BEFORE_IMPORT_LS. Renvoie false si le stockage refuse. */
export function applyTransfer(p: TransferPayload, store: Pick<Storage, 'getItem' | 'setItem'> = localStorage): boolean {
  try {
    const prev = store.getItem(SAVE_LS);
    if (prev) store.setItem(BEFORE_IMPORT_LS, prev);
    store.setItem(SAVE_LS, JSON.stringify(migrate(p.save).data));
    if (p.key) store.setItem(PHOTO_KEY_LS, p.key);
    return true;
  } catch { return false; }
}

/** Reprend UNIQUEMENT la clé des photos (la partie de ce RADIA n'est pas touchée). Renvoie false s'il n'y a pas de clé dans le code ou si le stockage refuse. */
export function applyKeyOnly(p: TransferPayload, store: Pick<Storage, 'getItem' | 'setItem'> = localStorage): boolean {
  if (!p.key) return false;
  try { store.setItem(PHOTO_KEY_LS, p.key); return true; } catch { return false; }
}

export { SAVE_VERSION };
