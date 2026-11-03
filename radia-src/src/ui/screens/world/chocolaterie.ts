/** STUB — remplacé par l'implémentation complète du module « chocolaterie ». */
import { ui } from '../../ui';

export function openChocolaterie(): Promise<void> {
  ui.toast({ title: 'Bientôt ♡', sub: 'Cette zone arrive très vite', icon: 'sparkle' });
  return Promise.resolve();
}
