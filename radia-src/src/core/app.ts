/**
 * Contexte global de l'application : sauvegarde, audio, bus d'événements,
 * instance Phaser. (Singletons simples : un seul jeu par page.)
 */
import type Phaser from 'phaser';
import { SaveManager } from '../save/SaveManager';
import { audio } from '../audio/AudioManager';
import { Emitter } from '../utils/events';
import type { ItemRef } from '../data/items';
import type { AchievementDef } from '../data/achievements';

export type AppEvents = {
  layout: { w: number; h: number };
  hearts: number;
  boosters: void;
  achievement: AchievementDef;
  memory: string;
  discover: ItemRef;
  settings: void;
};

export const save = new SaveManager();
export const events = new Emitter<AppEvents>();
export { audio };

let _game: Phaser.Game | null = null;
export const setGame = (g: Phaser.Game) => { _game = g; };
export function game(): Phaser.Game {
  if (!_game) throw new Error('Phaser pas encore démarré');
  return _game;
}

/** Applique les réglages (audio, animations) depuis la sauvegarde. */
export function applySettings(): void {
  const s = save.data.settings;
  audio.setSettings(s);
  document.documentElement.classList.toggle('reduced-motion', s.reducedMotion);
  events.emit('settings', undefined);
}

export const reducedFx = () => save.data.settings.effects === 'reduced' || save.data.settings.reducedMotion;
