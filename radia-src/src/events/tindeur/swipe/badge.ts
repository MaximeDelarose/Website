/** Pastille de l'icône : nombre de messages non lus, lu directement dans la sauvegarde (sans charger les profils). */
import { save } from '../../../core/app';

export function rawUnread(): number {
  try {
    const convos = (save.data.fun.apps.swipe as { convos?: Record<string, { unread?: unknown; status?: unknown }> }).convos;
    if (!convos || typeof convos !== 'object') return 0;
    return Object.values(convos).filter((c) => c && c.unread === true && c.status !== 'stopped').length;
  } catch { return 0; }
}
