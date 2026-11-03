/**
 * Succès : chacun a une condition mesurable, vérifiée sur la sauvegarde.
 * (`check` reçoit la sauvegarde et renvoie vrai quand le succès est mérité.)
 */
import type { SaveData } from '../save/schema';
import { LEVELS } from './levels';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: string; // nom d'icône (ui/icons.ts)
  check: (s: SaveData) => boolean;
}

const stat = (s: SaveData, k: string) => s.stats[k] ?? 0;
const has = (s: SaveData, key: string) => s.discovered.includes(key);
const chapterDone = (s: SaveData, ch: number) =>
  LEVELS.filter((l) => l.chapter === ch).every((l) => s.levels[l.id]?.done);
const threeStars = (s: SaveData) => Object.values(s.levels).filter((l) => l.stars >= 3).length;
const totalStars = (s: SaveData) => Object.values(s.levels).reduce((a, l) => a + l.stars, 0);

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_spark', name: 'Première étincelle', desc: 'Réussir ta toute première fusion.', icon: 'sparkle', check: (s) => stat(s, 'merges') >= 1 },
  { id: 'flower_for_radia', name: 'Une fleur pour Radia', desc: 'Créer ton premier Bouquet.', icon: 'flower', check: (s) => has(s, 'flowers:5') },
  { id: 'combo_queen', name: 'Reine des combos', desc: 'Réussir un combo ×5.', icon: 'bolt', check: (s) => stat(s, 'bestCombo') >= 5 },
  { id: 'five_perfect', name: 'Cinq fusions parfaites', desc: 'Terminer 5 niveaux avec 3 étoiles.', icon: 'star', check: (s) => threeStars(s) >= 5 },
  { id: 'nord_paris', name: 'Le Nord de Paris bb', desc: 'Terminer le chapitre 2.', icon: 'arc', check: (s) => chapterDone(s, 2) },
  { id: 'first_crown', name: 'Ma première couronne', desc: 'Créer une Couronne.', icon: 'crown', check: (s) => has(s, 'chess:6') },
  { id: 'queen_right', name: 'La reine a toujours raison', desc: 'Résoudre tous les puzzles du Mode Reine.', icon: 'queen', check: (s) => stat(s, 'queenPuzzlesTotal') > 0 && s.chess.queen.length >= stat(s, 'queenPuzzlesTotal') },
  { id: 'checkmate', name: 'Échec et mat !', desc: 'Battre Auguste aux échecs.', icon: 'chess', check: (s) => s.chess.wins.easy + s.chess.wins.normal + s.chess.wins.hard >= 1 },
  { id: 'memory_collector', name: 'Collectionneuse de souvenirs', desc: 'Débloquer les 8 souvenirs.', icon: 'album', check: (s) => s.memories.length >= 8 },
  { id: 'precious_heart', name: 'Le cœur précieux', desc: 'Créer un Cœur précieux.', icon: 'heart', check: (s) => has(s, 'love:9') },
  { id: 'world_for_you', name: 'Un monde pour toi', desc: 'Découvrir la fin de l\'histoire.', icon: 'globe', check: (s) => s.story.endingSeen },
  { id: 'story_continues', name: 'Notre histoire continue', desc: 'Réussir un défi du mode infini.', icon: 'infinity', check: (s) => s.endless.challenges >= 1 },
  { id: 'gardener', name: 'Jardinière en chef', desc: 'Découvrir les 10 objets de la collection Fleurs.', icon: 'flower', check: (s) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].every((l) => has(s, `flowers:${l}`)) },
  { id: 'champion', name: 'Petite championne', desc: 'Terminer les 3 mini-jeux.', icon: 'cup', check: (s) => ['puzzle', 'billard', 'chemin'].every((k) => s.minigames[k]?.done) },
  { id: 'starry', name: 'Pluie d\'étoiles', desc: 'Obtenir 60 étoiles dans les niveaux.', icon: 'star', check: (s) => totalStars(s) >= 60 },
  { id: 'tactician', name: 'Mat en beauté', desc: 'Résoudre tous les problèmes d\'échecs.', icon: 'chess', check: (s) => stat(s, 'chessPuzzlesTotal') > 0 && s.chess.puzzles.length >= stat(s, 'chessPuzzlesTotal') },
  { id: 'teaser', name: 'Arrête de m\'embêter', desc: 'Taquiner Auguste 10 fois.', icon: 'smile', check: (s) => stat(s, 'augusteTaps') >= 10 },
];
