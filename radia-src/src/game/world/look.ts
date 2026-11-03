import { save } from '../../core/app';
import type { Look } from '../../data/world/ids';

/** Look actuellement porté par Radia. */
export const currentLook = (): Look => save.data.world.wardrobe.look;
