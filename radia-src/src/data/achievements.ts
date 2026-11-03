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
  // ---- le château de Radia
  { id: 'w_home', name: 'Comme chez soi', desc: 'Placer un premier meuble dans le château.', icon: 'home', check: (s) => stat(s, 'world.castle.placed') >= 1 },
  { id: 'w_decorator', name: 'Décoratrice', desc: 'Placer 15 meubles.', icon: 'home', check: (s) => stat(s, 'world.castle.placed') >= 15 },
  { id: 'w_palace', name: 'Tout le château', desc: 'Débloquer toutes les pièces du château.', icon: 'crown', check: (s) => s.world.castle.unlocked.length >= 9 },
  { id: 'w_fashion', name: 'Fashionista', desc: 'Acheter 5 vêtements.', icon: 'sparkle', check: (s) => stat(s, 'world.wardrobe.bought') >= 5 },
  { id: 'w_look', name: 'Mon style', desc: 'Sauvegarder un look favori.', icon: 'star', check: (s) => stat(s, 'world.wardrobe.looksSaved') >= 1 },
  { id: 'w_cat', name: 'Trois dans le château', desc: 'Adopter un chat et lui donner un prénom.', icon: 'smile', check: (s) => s.world.cat.adopted && s.world.cat.name.length > 0 },
  { id: 'w_family', name: 'Une équipe formidable', desc: 'Jouer 4 fois aux jeux en famille.', icon: 'heart', check: (s) => stat(s, 'world.family.game') >= 4 },
  { id: 'w_bouquet', name: 'Un bouquet pour ma reine', desc: 'Composer un premier bouquet.', icon: 'flower', check: (s) => stat(s, 'world.garden.bouquet') >= 1 },
  { id: 'w_chocolates', name: 'Chocolatière', desc: 'Découvrir les 8 chocolats.', icon: 'gift', check: (s) => s.world.choc.collection.length >= 8 },
  { id: 'w_career', name: 'Sous les projecteurs', desc: 'Atteindre le palier 5 d\'une carrière.', icon: 'star', check: (s) => Object.values(s.world.careers.progress).some((p) => p.level >= 5) },
  { id: 'w_fans', name: 'Mille admirateurs', desc: 'Atteindre 1 000 fans.', icon: 'trophy', check: (s) => s.world.fans >= 1000 },
  // ---- invitations surprises
  { id: 'ev_first', name: 'Première invitation', desc: 'Terminer ta première sortie surprise.', icon: 'mail', check: (s) => Object.keys(s.events.done).length >= 1 },
  { id: 'ev_know', name: 'Tu me connais par cœur', desc: 'Deviner les trois plats d\'Auguste au restaurant.', icon: 'heart', check: (s) => (s.events.counters['restaurant.perfect'] ?? 0) >= 1 },
  { id: 'ev_two_plates', name: 'Deux assiettes, un seul cœur', desc: 'Deviner le menu d\'Auguste trois fois.', icon: 'heart', check: (s) => (s.events.counters['restaurant.perfect'] ?? 0) >= 3 },
  { id: 'ev_palace', name: 'Une soirée de reine', desc: 'Passer la soirée au palace.', icon: 'crown', check: (s) => (s.events.done['r-palace']?.count ?? 0) >= 1 },
  { id: 'ev_ball', name: 'Une valse pour deux', desc: 'Danser au bal romantique.', icon: 'sparkle', check: (s) => (s.events.done['r-ball']?.count ?? 0) >= 1 },
  { id: 'ev_golden', name: 'Journée surprise', desc: 'Ouvrir une enveloppe dorée.', icon: 'gift', check: (s) => (s.events.done['g-day']?.count ?? 0) >= 1 },
  { id: 'ev_family', name: 'Une maman en or', desc: 'Terminer 3 activités avec les enfants.', icon: 'heart', check: (s) => (s.stats['events.family'] ?? 0) >= 3 },
  { id: 'ev_photos', name: 'Album de souvenirs', desc: 'Garder 10 photos souvenirs.', icon: 'camera', check: (s) => s.events.photos.length >= 10 },
  { id: 'ev_promise', name: 'Une promesse qui brille ♡', desc: 'Recevoir le bracelet d\'Auguste.', icon: 'sparkle', check: (s) => s.world.wardrobe.owned.includes('br-promise') },
  { id: 'ev_ten', name: 'Une vie bien remplie', desc: 'Terminer 10 invitations.', icon: 'star', check: (s) => (s.stats['events.done'] ?? 0) >= 10 },
  { id: 'w_covers', name: 'À la une !', desc: 'Collectionner les 5 couvertures de magazine.', icon: 'album', check: (s) => s.world.magazines.length >= 5 },
];
