/** STUB — remplacé par l'implémentation complète du module « garden ». */
import { ui } from '../../ui';

export function openGarden(): Promise<void> {
  ui.toast({ title: 'Bientôt ♡', sub: 'Cette zone arrive très vite', icon: 'sparkle' });
  return Promise.resolve();
}
