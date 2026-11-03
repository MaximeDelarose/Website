/**
 * Sauvegarde automatique locale (localStorage) avec copie de secours.
 * - écriture regroupée (anti-rafale) + écriture immédiate quand Safari passe
 *   en arrière-plan ;
 * - lecture validée (schema.ts) ; sauvegarde illisible → copie de secours,
 *   sinon on garde la donnée abîmée de côté et on demande quoi faire.
 */
import { defaultSave, migrate, type SaveData } from './schema';

const KEY = 'radia-save-v1';
const BACKUP = 'radia-save-v1-backup';
const BROKEN = 'radia-save-broken';

export type LoadStatus = 'new' | 'ok' | 'backup' | 'corrupt' | 'unavailable' | 'too-new';

function storage(): Storage | null {
  try {
    const s = window.localStorage;
    const k = '__radia_test__';
    s.setItem(k, '1');
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}

export class SaveManager {
  data: SaveData = defaultSave();
  status: LoadStatus = 'new';
  /** Vrai si une sauvegarde existait au lancement. */
  hadSave = false;
  private store = storage();
  private timer: number | undefined;
  private lastBackup = 0;
  private listeners = new Set<() => void>();

  load(): LoadStatus {
    if (!this.store) {
      this.status = 'unavailable';
      return this.status;
    }
    const raw = this.store.getItem(KEY);
    if (raw === null) {
      this.status = 'new';
      return this.status;
    }
    this.hadSave = true;
    const parsed = this.parse(raw);
    if (parsed) {
      const m = migrate(parsed);
      this.data = m.data;
      this.status = m.tooNew ? 'too-new' : 'ok';
      return this.status;
    }
    // Sauvegarde principale illisible : on essaie la copie de secours.
    const bak = this.store.getItem(BACKUP);
    const bakParsed = bak ? this.parse(bak) : null;
    try { this.store.setItem(BROKEN, raw); } catch { /* plein : tant pis */ }
    if (bakParsed) {
      this.data = migrate(bakParsed).data;
      this.status = 'backup';
      this.writeNow();
      return this.status;
    }
    this.status = 'corrupt';
    return this.status;
  }

  private parse(raw: string): unknown {
    try {
      const v = JSON.parse(raw);
      return v && typeof v === 'object' ? v : null;
    } catch {
      return null;
    }
  }

  /** Réinitialise (après confirmation). La donnée abîmée éventuelle reste dans BROKEN. */
  reset(): void {
    const keepSettings = this.data.settings;
    this.data = defaultSave();
    this.data.settings = keepSettings;
    this.status = 'new';
    this.writeNow();
    this.emit();
  }

  /** Demande une écriture (regroupée sur 400 ms). */
  save(): void {
    this.emit();
    if (this.timer !== undefined) return;
    this.timer = window.setTimeout(() => this.writeNow(), 400);
  }

  writeNow(): void {
    if (this.timer !== undefined) { clearTimeout(this.timer); this.timer = undefined; }
    if (!this.store) return;
    this.data.updatedAt = Date.now();
    try {
      const json = JSON.stringify(this.data);
      const now = Date.now();
      if (now - this.lastBackup > 20_000) {
        const prev = this.store.getItem(KEY);
        if (prev && this.parse(prev)) this.store.setItem(BACKUP, prev);
        this.lastBackup = now;
      }
      this.store.setItem(KEY, json);
    } catch (e) {
      console.warn('[save] écriture impossible', e);
    }
  }

  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() { for (const fn of this.listeners) fn(); }

  /** Demande au navigateur de ne pas effacer les données (sans garantie sur Safari). */
  async requestPersistence(): Promise<void> {
    try { await navigator.storage?.persist?.(); } catch { /* ignoré */ }
  }

  exportString(): string { return JSON.stringify(this.data); }
}
