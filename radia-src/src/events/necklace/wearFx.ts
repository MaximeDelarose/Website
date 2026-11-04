/** Effet d'apparition du collier à l'équipement : étincelles, tintement cristallin, retour tactile doux. */
import { audio } from '../../core/app';
import { haptic } from '../../core/haptics';
import { sparkleBurst } from '../../ui/fx/sparkle';

/** `p` = position du diamant en pixels de la fenêtre ; effets visuels allégés si les animations sont réduites (sparkleBurst le gère). */
export function necklaceFx(p: { x: number; y: number }): void {
  audio.play('crystalSoft');
  haptic('reward');
  sparkleBurst(p.x, p.y, { rarity: 'legendary', count: 20 });
  window.setTimeout(() => audio.play('sparkle'), 160);
}
