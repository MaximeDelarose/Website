/**
 * Registre des applications du téléphone du jeu (hors Tindeur, qui a son propre branchement).
 * Chaque module (RADIA Clips, RADIA Snap…) s'enregistre depuis src/apps/index.ts ; phone.ts les affiche
 * dans la bande d'applications et les ouvre au toucher.
 */
export interface PhoneApp {
  id: string;
  name: string;
  /** Icône carrée (élément DOM) de la taille demandée. */
  icon: (size: number) => HTMLElement;
  /** Ouvre l'application en plein écran (le téléphone se ferme avant). */
  open: () => void | Promise<void>;
  /** Pastille de notification (nombre ou texte), ou null. */
  badge?: () => number | string | null;
  /** Masquée si faux (ex. verrouillée). */
  visible?: () => boolean;
}

const apps: PhoneApp[] = [];
export function registerPhoneApp(app: PhoneApp): void {
  const i = apps.findIndex((a) => a.id === app.id);
  if (i >= 0) apps[i] = app; else apps.push(app);
}
export const phoneApps = (): PhoneApp[] => apps.filter((a) => (a.visible ? a.visible() : true));
