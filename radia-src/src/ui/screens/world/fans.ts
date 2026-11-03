/** STUB — remplacé par l'implémentation complète du module « fans ». */
import { ui } from '../../ui';

export function openFans(): Promise<void> {
  ui.toast({ title: 'Bientôt ♡', sub: 'Cette zone arrive très vite', icon: 'sparkle' });
  return Promise.resolve();
}
