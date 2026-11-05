import { save } from '../../core/app';
import type { Look } from '../../data/world/ids';
import type { FaceCustom } from '../../data/world/face';
import { setFaceCustom } from '../art/characters';

/** Look actuellement porté par Radia. */
export const currentLook = (): Look => save.data.world.wardrobe.look;

/** Visage personnalisé actuel (sauvegarde). */
export const currentFace = (): FaceCustom => save.data.world.wardrobe.face;
/** Applique le visage de la sauvegarde aux dessins (au démarrage, après une modification, après un import). */
export function applySavedFace(): void { setFaceCustom(save.data.world.wardrobe.face); }
