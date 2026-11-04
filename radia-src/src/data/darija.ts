/**
 * Glossaire des expressions arabes / darija algérienne employées par Auguste.
 * Règle d'or : le français domine ; une expression bien placée, jamais dans chaque
 * réplique (cible globale ≈ 1 réplique sur 3 en contexte de réaction, 20–45 % des
 * banques). Aucune expression religieuse pour se moquer ; « galbi » reste RARE.
 */
export interface DarijaExpr {
  id: string;
  /** Forme écrite dans le jeu. */
  text: string;
  /** Sens en français. */
  meaning: string;
  /** Contexte conseillé. */
  context: string;
  /** Fréquence cible : part des répliques de réaction qui la contiennent. */
  freq: 'courante' | 'occasionnelle' | 'rare';
}

export const DARIJA: DarijaExpr[] = [
  { id: 'bsahtek', text: 'Bsahték', meaning: 'félicitations, « bien mérité, profite »', context: 'gain, récompense, tenue débloquée', freq: 'courante' },
  { id: 'mashallah', text: 'Mashallah', meaning: 'admiration, « quelle merveille »', context: 'belle fusion, tenue, grosse réussite, compliment', freq: 'courante' },
  { id: 'sahha', text: 'Sahha', meaning: 'bravo / santé', context: 'fusion réussie, pièces, petite victoire', freq: 'courante' },
  { id: 'yalatif', text: 'Ya latif', meaning: 'surprise, « oh là là ! »', context: 'coup de chance, imprévu, jackpot', freq: 'occasionnelle' },
  { id: 'wallah', text: 'Wallah', meaning: '« je te jure »', context: 'insistance sincère, étonnement', freq: 'occasionnelle' },
  { id: 'yarouhi', text: 'Ya rouhi', meaning: 'mon âme', context: 'moment tendre, romantique', freq: 'occasionnelle' },
  { id: 'yaaini', text: 'Ya aïni', meaning: 'mes yeux, tendresse', context: 'moment tendre', freq: 'rare' },
  { id: 'qalbi', text: 'Qalbi', meaning: 'mon cœur', context: 'moment tendre, rare', freq: 'rare' },
  { id: 'twahechtek', text: 'Twahechtek', meaning: 'tu m\'as manqué', context: 'retrouvailles, retour dans le jeu', freq: 'occasionnelle' },
  { id: 'rabi', text: 'Rabi yahfdek', meaning: 'que Dieu te protège', context: 'tendresse sincère, rare, jamais moqueur', freq: 'rare' },
  { id: 'galbi', text: 'Galbi', meaning: 'mon cœur (variante)', context: 'tendresse, RARE (plafond mécanique 1/10)', freq: 'rare' },
  { id: 'inchallah', text: 'inchallah', meaning: 'si Dieu le veut', context: 'souhait pour demain, sincère, rare', freq: 'rare' },
];

/** Détecte toute expression arabe / darija (y compris galbi). */
export const DARIJA_RE = /\b(bsah[tté]+k|bsahtek|mashallah|sahha|saha\b|ya latif|wallah|ya rouhi|ya a[iï]ni|qalbi|galbi|twahechtek|rabi yahfdek|inchallah|yalla|habibi)/i;
export const hasDarija = (s: string): boolean => DARIJA_RE.test(s);
