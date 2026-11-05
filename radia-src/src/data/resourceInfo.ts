/**
 * Fiches d'information des ressources (appui long sur un compteur). UNE seule source de vérité, tenue à jour avec l'économie réelle :
 * ne lister dans `ways` que des moyens de gagner qui EXISTENT dans le jeu (vérifiés dans le code), jamais une fonction à venir.
 * Pour ajouter une méthode d'obtention : ajouter une ligne ici (le test `resource-info.test.ts` garde la cohérence).
 */
export type ResInfoId = 'coins' | 'diamonds' | 'energy' | 'hearts' | 'tickets' | 'flowers' | 'fabric' | 'cocoa';

export interface ResInfo {
  id: ResInfoId;
  name: string;
  /** À quoi ça sert (court). */
  use: string;
  /** Comment en obtenir (moyens réellement disponibles). */
  ways: readonly string[];
  /** Précision éventuelle (rappel de règles : gratuit, fictif…). */
  note?: string;
}

export const RES_INFO: Record<ResInfoId, ResInfo> = {
  coins: {
    id: 'coins', name: 'Pièces',
    use: 'Pour acheter des tenues, des meubles et faire grandir ton petit monde.',
    ways: ['Livrer des commandes dans le mode infini', 'Récupérer ton salaire de carrière', 'Ouvrir des coffres et des cadeaux', 'La roue du jour et les cadeaux quotidiens', 'Terminer des événements et des défis'],
  },
  diamonds: {
    id: 'diamonds', name: 'Diamants',
    use: 'Pour certains achats spéciaux : la boutique, une recharge d\'énergie complète, accélérer une pousse ou une commande.',
    ways: ['En jouant : commandes, coffres et trouvailles', 'Le cadeau quotidien (certains jours)', 'La roue du jour', 'Les événements et les carrières'],
    note: 'Les packs de la boutique sont une simulation : aucun vrai paiement, jamais.',
  },
  energy: {
    id: 'energy', name: 'Énergie',
    use: 'Chaque toucher d\'un générateur en consomme une.',
    ways: ['Elle revient toute seule avec le temps', 'La recharge gratuite d\'Auguste', 'Livrer des commandes', 'Coffres, trouvailles et cadeaux', 'Une recharge complète contre des diamants'],
    note: 'Jamais de longue attente : elle revient vite quand elle est presque vide.',
  },
  hearts: {
    id: 'hearts', name: 'Cœurs',
    use: 'Pour décorer et embellir votre petit monde.',
    ways: ['Livrer des commandes', 'Les mini-jeux et les activités de la maison', 'Les coffres et les récompenses'],
  },
  tickets: {
    id: 'tickets', name: 'Tickets du Casino Royal',
    use: 'Pour jouer aux jeux du Casino Royal, en douceur et pour rire.',
    ways: ['Le cadeau quotidien (jour des tickets)', 'La roue du jour', 'Les missions et défis du casino', 'Quelques événements du mode infini'],
    note: 'Gratuits : on ne peut ni les acheter ni les échanger.',
  },
  flowers: { id: 'flowers', name: 'Fleurs', use: 'Une matière pour le jardin, les événements du château et certaines améliorations.', ways: ['Livrer des commandes', 'Coffres et trouvailles du mode infini'] },
  fabric: { id: 'fabric', name: 'Tissu', use: 'Une matière pour la mode et les améliorations de ton univers.', ways: ['Livrer des commandes', 'Coffres et trouvailles du mode infini'] },
  cocoa: { id: 'cocoa', name: 'Cacao', use: 'Une matière pour la chocolaterie et certaines améliorations.', ways: ['Livrer des commandes', 'Coffres et trouvailles du mode infini'] },
};

export const RES_ORDER: readonly ResInfoId[] = ['coins', 'diamonds', 'energy', 'hearts', 'tickets', 'flowers', 'fabric', 'cocoa'];
