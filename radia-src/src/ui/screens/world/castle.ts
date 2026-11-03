/** STUB — remplacé par l'implémentation complète du module « castle ». */
import { ui } from '../../ui';

export function openCastle(_room?: import('../../../data/world/ids').RoomId): Promise<void> {
  ui.toast({ title: 'Bientôt ♡', sub: 'Cette zone arrive très vite', icon: 'sparkle' });
  return Promise.resolve();
}
