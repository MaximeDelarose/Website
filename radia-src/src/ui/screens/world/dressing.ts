/** STUB — remplacé par l'implémentation complète du module « dressing ». */
import { ui } from '../../ui';

export function openDressing(): Promise<void> {
  ui.toast({ title: 'Bientôt ♡', sub: 'Cette zone arrive très vite', icon: 'sparkle' });
  return Promise.resolve();
}
