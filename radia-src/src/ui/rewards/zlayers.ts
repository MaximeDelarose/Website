/**
 * TABLE DES COUCHES (royaume des z-index). Source unique documentée ; le test `stacking-css.test.ts` vérifie que la couche récompense
 * dépasse TOUT z-index déclaré dans les feuilles CSS et les styles en ligne du code. Voir README.md (« Architecture d'empilement »).
 *
 *   #app (position fixed, contexte d'empilement)  ─┬─ #game (Phaser, canvas)
 *                                                   └─ #ui  z 10 : écrans, modales, téléphone, casino, sheets… (z 30–400 DANS #ui)
 *   #reward-overlay (enfant direct de <body>, hors #app) z 5000 : cadeaux, particules, envols, bandeau des compteurs
 *   barre « mise à jour disponible » (updateWatch) z 2000 : reste sous la couche récompense
 */
export const Z = {
  /** Plateau Phaser et fonds. */
  game: 0,
  /** Calque d'interface #ui dans #app. */
  ui: 10,
  /** Plus haut z-index interne à #ui toléré (écrans, modales 90–140, casino 120/310, ancien calque récompense 400). */
  uiMax: 1000,
  /** Barre « mise à jour » (hors #ui, directement sur <body>). */
  updateBar: 2000,
  /** Couche globale récompense (RewardOverlay) : la plus haute du jeu. */
  reward: 5000,
} as const;

/** Sélecteurs des éléments masqués (sans être détruits) pendant une ouverture de cadeau. */
export const SUSPEND_SELECTORS = ['.modal-backdrop', '.toasts', '.bubble', '.gift-bub', '.gb-reward', '.gb-spark', '.aug-says', '.ev-notif'] as const;
