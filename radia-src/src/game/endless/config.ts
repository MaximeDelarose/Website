/**
 * ENDLESS 2.0 — UN SEUL FICHIER D'ÉQUILIBRAGE.
 *
 * Tout ce qui se règle (énergie, probabilités, récompenses, coûts, seuils) est ici ; la logique
 * (rules.ts, src/game/endless/*) ne contient aucun nombre « magique » d'équilibrage.
 *
 * Les durées visées (`targets`) sont des HYPOTHÈSES de conception : elles sont MESURÉES (en
 * actions / énergie, pas en secondes) par tests/endless-sim.test.ts, qui affiche un rapport.
 * Rien ici ne les garantit.
 */
import type { CollectionId, Rarity } from '../../data/items';

export const ENDLESS_CFG = {
  // ------------------------------------------------------------------ énergie
  energy: {
    /** Coût d'un toucher de générateur. */
    tapCost: 1,
    /** Un toucher sur N est gratuit (en plus de la chance par niveau de générateur). */
    freeTapEvery: 14,
    /** « Plancher » : sous ce niveau d'énergie, la recharge naturelle est accélérée (jamais de blocage long). */
    floorLevel: 6,
    /** Une énergie toutes les 25 s sous le plancher (0 → 6 en 2 min 30). Au-dessus : REGEN_MS (45 s). */
    floorRegenMs: 25_000,
    /** Énergie offerte par livraison selon le palier de commande. */
    deliverEnergy: { easy: 3, mid: 5, hard: 8 },
  },

  // ------------------------------------------------------------------ déblocage des collections
  /**
   * Déblocage progressif : « points de palier » = commandes livrées (cumul permanent)
   * + `chainBonus` × chaînes d'album complétées. Dès que le seuil est atteint, la collection
   * et son générateur apparaissent.
   */
  unlock: {
    at: { flowers: 0, love: 0, paris: 5, chess: 12, rare: 20, choc: 30, jewel: 42, cloth: 56, perfume: 72, acc: 92, castle: 115 } as Record<CollectionId, number>,
    chainBonus: 3,
    /** Générateurs posés en même temps sur le plateau (les plus anciens se « reposent » au-delà). */
    maxBoardGens: 6,
  },

  // ------------------------------------------------------------------ générateurs
  gens: {
    /** Niveau maximal d'un générateur. */
    maxLevel: 6,
    /**
     * Poids de génération par niveau de générateur (index 0 = niveau 1 du générateur) puis par
     * niveau d'objet produit (index 0 = objet niveau 1). Normalisés à l'usage.
     */
    tables: [
      [70, 30],
      [55, 33, 12],
      [40, 35, 18, 7],
      [28, 32, 24, 12, 4],
      [18, 28, 27, 17, 8, 2],
      [12, 22, 27, 20, 12, 5, 2],
    ] as number[][],
    /** Chance de produire DEUX objets d'un coup (si une case est libre). */
    doubleChance: [0, 0.04, 0.08, 0.12, 0.16, 0.2],
    /** Chance qu'un toucher soit gratuit (pas d'énergie dépensée). */
    freeChance: [0, 0, 0.02, 0.04, 0.06, 0.08],
    /** Chance d'obtenir une Étoile filante / un Coffret surprise au lieu d'un objet. */
    starChance: [0.006, 0.008, 0.01, 0.012, 0.015, 0.018],
    boxChance: [0, 0.006, 0.01, 0.014, 0.018, 0.022],
    /** Coût d'amélioration (niveau n → n+1) : pièces + matériau lié à la collection. */
    costCoins: [120, 340, 800, 1600, 3000],
    costMat: [0, 5, 10, 18, 28],
    /** XP de maîtrise : +1 par toucher, +1 par fusion de la collection ; rang = floor(sqrt(xp / xpPerRank)). */
    xpPerTap: 1,
    xpPerMerge: 1,
    xpPerRank: 25,
    maxRank: 5,
    /** Rabais par rang de maîtrise sur le coût d'amélioration (max 30 %). */
    rankDiscount: 0.06,
  },

  // ------------------------------------------------------------------ commandes
  orders: {
    /** Emplacements : 0 facile, 1 moyenne, 2 difficile. */
    tiers: ['easy', 'mid', 'hard'] as const,
    /** Budget visé en TOUCHERS de générateur (estimation, voir orders.ts) par palier : [min, max] par commande. */
    budget: { easy: [8, 18], mid: [22, 40], hard: [44, 80] } as Record<'easy' | 'mid' | 'hard', [number, number]>,
    /** Nombre d'objets maximum par palier. */
    maxItems: { easy: 1, mid: 2, hard: 2 } as Record<'easy' | 'mid' | 'hard', number>,
    /** Démarrage en douceur : les budgets sont multipliés par `rampMin` + (1 - rampMin) × commandes livrées / rampOrders (plafonné à 1). */
    rampMin: 0.3,
    rampOrders: 10,
    /** Chance qu'un objet de commande reprenne une collection déjà demandée par une autre commande visible. */
    sharedCollChance: 0.5,
    /** Une commande n'est jamais jugée « atteignable » si elle dépasse ce nombre de touchers estimés. */
    reachableMaxTaps: 150,
    /** Rendement moyen d'un toucher mal optimisé (1 = fusions parfaites). */
    inefficiency: 1.2,
    /** Récompenses : cœurs / pièces par toucher estimé, multiplicateur par palier. */
    heartsPerTap: 0.8,
    coinsPerTap: 2.4,
    tierMult: { easy: 1, mid: 1.15, hard: 1.4 } as Record<'easy' | 'mid' | 'hard', number>,
    /** Matériau (fleurs / tissu / cacao) offert par palier quand la collection en donne. */
    matN: { easy: 2, mid: 3, hard: 5 } as Record<'easy' | 'mid' | 'hard', number>,
    /** Points de jauge de trésor offerts par la livraison. */
    treasure: { easy: 1, mid: 2, hard: 4 } as Record<'easy' | 'mid' | 'hard', number>,
    /** Remplacements gratuits : +1 toutes les `replaceActiveMs` de jeu actif ou toutes les `replaceEveryOrders` livraisons. */
    replaceActiveMs: 8 * 60_000,
    replaceEveryOrders: 6,
    replaceMax: 3,
    /** Pause maxi comptée comme « jeu actif » entre deux actions (anti-AFK). */
    activeGapMs: 10_000,
  },

  // ------------------------------------------------------------------ jauge de trésor
  treasure: {
    /** Points nécessaires pour un coffre : ≈ 1 coffre par 30 fusions ordinaires (mesuré par la simulation). */
    goal: 52,
    /** Points par fusion selon le niveau de l'objet créé (index = niveau ; plus pour les hauts niveaux). */
    pointsByLevel: [0, 0, 0.9, 1.1, 1.3, 1.8, 2.4, 3.2, 4.2, 5.2, 6.5],
    /** Bonus : fusion au niveau maximum, combos. */
    maxMergeBonus: 8,
    comboBonus: 0.5,
    /** Raretés des coffres (poids ; publiés tels quels via chestOdds()). */
    odds: { common: 55, uncommon: 28, rare: 12, epic: 4.2, legendary: 0.8 } as Record<Rarity, number>,
    /** Garantie : au plus N coffres consécutifs sans rare+ / sans épique+. */
    pityRare: 8,
    pityEpic: 30,
    /** Coffres en attente maximum (au-delà, les points continuent mais les coffres s'accumulent quand même : jamais perdus). */
    pendingSoftCap: 20,
  },

  // ------------------------------------------------------------------ drops à la fusion
  drops: {
    /** Chance de drop par fusion selon le niveau de l'objet créé (index = niveau). */
    chanceByLevel: [0, 0, 0.03, 0.05, 0.07, 0.1, 0.14, 0.2, 0.26, 0.3, 0.34],
    /** Nombre minimal de fusions entre deux drops visibles + case libres requises pour poser un objet sur le plateau. */
    minMergesBetween: 2,
    minFreeCellsForItem: 5,
    /** Poids du type de drop. */
    kindWeights: { coins: 34, diamonds: 4, energy: 18, chest: 4, fragment: 12, bag: 3, accessory: 5, deco: 5, rareItem: 9, ticket: 6 } as Record<string, number>,
    /** Raretés d'un drop : poids de base (les hauts niveaux glissent vers le haut). */
    rarityWeights: { common: 60, uncommon: 25, rare: 11, epic: 3.4, legendary: 0.6 } as Record<Rarity, number>,
    /** Décalage de rareté par niveau (poids multipliés par (1 + shift × (niveau-2)) pour rare+ ). */
    levelShift: 0.12,
    /** Montants par rareté (pièces / énergie / diamants / tickets). */
    coins: { common: 6, uncommon: 12, rare: 24, epic: 50, legendary: 120 } as Record<Rarity, number>,
    energy: { common: 2, uncommon: 4, rare: 7, epic: 12, legendary: 25 } as Record<Rarity, number>,
    diamonds: { common: 1, uncommon: 1, rare: 2, epic: 4, legendary: 10 } as Record<Rarity, number>,
    /** Fragments de vêtement nécessaires pour obtenir un vêtement entier. */
    fragmentsPerCloth: 5,
    /** Fusion au niveau maximum : pièces + coffre de points + drop garanti rare+. */
    maxMergeCoins: 40,
  },

  // ------------------------------------------------------------------ combos
  combo: {
    /** Multiplicateur de score : 1 + step × (combo - 1), plafonné à multMax. */
    multMax: 3,
    multStep: 0.25,
    /** Paliers : valeur du combo, énergie, cœurs (+ star / wand historiques à 5 / 8). */
    tiers: [
      { at: 3, energy: 1, hearts: 0 },
      { at: 5, energy: 2, hearts: 0, reward: 'star' },
      { at: 8, energy: 3, hearts: 0, reward: 'wand' },
      { at: 12, energy: 4, hearts: 15, reward: 'hearts' },
      { at: 16, energy: 6, hearts: 25, reward: 'hearts' },
    ] as { at: number; energy: number; hearts: number; reward?: 'star' | 'wand' | 'hearts' }[],
    /** Retombée : après `cap`, la fusion suivante repart de `fallTo`. */
    cap: 16,
    fallTo: 5,
    /** Anti-exploitation : au plus N récompenses de palier par minute de jeu (le reste s'affiche mais ne donne rien). */
    maxRewardsPerMin: 5,
    /** Plafond d'énergie gagnée par combos et par minute. */
    maxEnergyPerMin: 8,
  },

  // ------------------------------------------------------------------ album
  album: {
    /** Récompense de nouveauté : pièces = niveau × coinsPerLevel ; énergie dès le niveau 3. */
    coinsPerLevel: 4,
    energyFromLevel: 3,
    energy: 2,
    /** Complétion d'une chaîne (toute une collection découverte). */
    chainCoins: 150,
    chainEnergy: 20,
    chainDiamonds: 5,
    /** Paliers du nombre total d'objets découverts. */
    milestones: [10, 25, 45, 70, 100] as number[],
    milestoneCoins: [40, 80, 150, 260, 450],
  },

  // ------------------------------------------------------------------ secours anti-blocage
  rescue: {
    /** Quand le plateau est bloqué (plein, aucune fusion, aucune livraison) : une Étoile filante remplace l'objet le moins précieux. */
    enabled: true,
  },

  // ------------------------------------------------------------------ durées visées (HYPOTHÈSES à mesurer)
  targets: {
    firstRewardMin: 1,
    shortOrderMin: [2, 4] as [number, number],
    secondaryProgressMin: [5, 8] as [number, number],
    majorRewardMin: [10, 15] as [number, number],
    /** Rythme supposé d'un joueur normal pour convertir actions → minutes (hypothèse). */
    assumedActionsPerMin: 12,
  },
} as const;

export type EndlessCfg = typeof ENDLESS_CFG;
