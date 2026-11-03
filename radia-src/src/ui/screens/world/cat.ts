/** STUB — remplacé par l'implémentation complète du module « cat ». */
import { ui } from '../../ui';

export function openCat(): Promise<void> {
  ui.toast({ title: 'Bientôt ♡', sub: 'Cette zone arrive très vite', icon: 'sparkle' });
  return Promise.resolve();
}
