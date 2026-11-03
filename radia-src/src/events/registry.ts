/** Chargement paresseux des mini-jeux : chaque module exporte par défaut une `Activity`. */
import type { Activity, ActivityId } from './types';

const LOADERS: Record<ActivityId, () => Promise<{ default: Activity }>> = {
  menuPick: () => import('./activities/menuPick'),
  guessMenu: () => import('./activities/guessMenu'),
  photoBooth: () => import('./activities/photoBooth'),
  bouquet: () => import('./activities/bouquet'),
  chocolateBox: () => import('./activities/chocolateBox'),
  decorTable: () => import('./activities/decorTable'),
  shopTry: () => import('./activities/shopTry'),
  rhythmDance: () => import('./activities/rhythmDance'),
  fireworksPhoto: () => import('./activities/fireworksPhoto'),
  spaRelax: () => import('./activities/spaRelax'),
  cinemaQuiz: () => import('./activities/cinemaQuiz'),
  memoryChallenge: () => import('./activities/memoryChallenge'),
  fashionThemes: () => import('./activities/fashionThemes'),
  careerGame: () => import('./activities/careerGame'),
  dressVerdict: () => import('./activities/dressVerdict'),
  photoShoot: () => import('./activities/photoShoot'),
  braceletReveal: () => import('./activities/braceletReveal'),
};

export async function loadActivity(id: ActivityId): Promise<Activity> {
  return (await LOADERS[id]()).default;
}
