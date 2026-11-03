import { game } from '../../core/app';
import { BackdropScene } from './BackdropScene';
import type { Theme } from '../art/scenes';

export function backdrop(): BackdropScene | null {
  try { return game().scene.getScene(BackdropScene.KEY) as BackdropScene; } catch { return null; }
}

export function setBackdrop(theme: Theme): void {
  const b = backdrop();
  if (b && b.sys.isActive()) b.setTheme(theme);
  else if (b) b.events.once('create', () => b.setTheme(theme));
}

export function setDim(alpha: number, ms = 400): void { backdrop()?.setDim(alpha, ms); }

export const themeForChapter = (ch: number): Theme => (['garden', 'garden', 'paris', 'souvenirs', 'royaume', 'monde'] as Theme[])[ch] ?? 'garden';
