/**
 * Les incidents du château — données (textes, poids, coûts, options). Tout est réglable ici.
 * Règles produit : toujours une solution GRATUITE, jamais de punition, jamais d'obligation répétitive.
 */
export type SceneId = 'plumbing' | 'wires' | 'watering' | 'delivery' | 'catTidy' | 'rareFlower' | 'chocOrder' | 'newShop';
export type OptKind = 'pay' | 'game' | 'free' | 'bonus' | 'defer' | 'open';
export interface IncidentOpt { id: string; kind: OptKind; label: string; sub?: string }

export interface IncidentDef {
  id: string;
  /** Poids du tirage. */
  weight: number;
  scene: SceneId;
  /** Nom d'icône (src/ui/icons). */
  icon: string;
  title: string;
  /** Texte de la notification. */
  notif: string;
  /** Réplique d'Auguste dans le panneau. */
  auguste: string;
  /** Texte de fin (récompense / soulagement). */
  doneLine: string;
  /** Coût de la solution payante (pièces) — 0 = pas de solution payante. */
  baseCost: number;
  /** Plafond absolu du coût (jamais dépassé). */
  capCost: number;
  /** Temps de jeu ACTIF après le report avant que le coût monte au plafond (ms) ; 0 = pas d'escalade. */
  escalateMs: number;
  /** Pièce(s) concernée(s) par l'effet visuel (choisie par la graine). */
  rooms?: ('bedroom' | 'salon')[];
  /** Condition d'apparition (contexte du monde). */
  needs?: 'cat' | 'garden';
  options: IncidentOpt[];
}

export const MIN = 60_000;

export const INCIDENTS: IncidentDef[] = [
  {
    id: 'leak', weight: 3, scene: 'plumbing', icon: 'drop', title: 'Fuite d’eau',
    notif: 'Oups ! Une fuite d’eau vient d’apparaître dans le château !',
    auguste: 'Bon… je crois qu’on va devoir appeler un plombier.',
    doneLine: 'Plus une goutte ! Le château est tout sec ♡',
    baseCost: 100, capCost: 140, escalateMs: 3 * MIN, rooms: ['bedroom', 'salon'],
    options: [
      { id: 'pay', kind: 'pay', label: 'Réparer tout de suite' },
      { id: 'game', kind: 'game', label: 'Mini-jeu de plomberie', sub: 'Gratuit' },
      { id: 'defer', kind: 'defer', label: 'Reporter' },
    ],
  },
  {
    id: 'blackout', weight: 2.2, scene: 'wires', icon: 'bolt', title: 'Panne de courant',
    notif: 'Clac ! Une pièce du château n’a plus de lumière…',
    auguste: 'Ça vient des fusibles, galbi. Un électricien, ou on s’y met ensemble ?',
    doneLine: 'La lumière est revenue, tout brille de nouveau ♡',
    baseCost: 80, capCost: 80, escalateMs: 0, rooms: ['bedroom', 'salon'],
    options: [
      { id: 'pay', kind: 'pay', label: 'Appeler l’électricien' },
      { id: 'game', kind: 'game', label: 'Puzzle électrique', sub: 'Gratuit' },
      { id: 'defer', kind: 'defer', label: 'Plus tard' },
    ],
  },
  {
    id: 'garden', weight: 3, scene: 'watering', icon: 'flower', title: 'Jardin à entretenir',
    notif: 'Le jardin a un peu soif… une petite attention ?',
    auguste: 'Les fleurs te font les yeux doux, ma reine. Un peu d’eau ?',
    doneLine: 'Le jardin sourit de toutes ses fleurs ♡',
    baseCost: 0, capCost: 0, escalateMs: 0, needs: 'garden',
    options: [
      { id: 'free', kind: 'free', label: 'Arroser', sub: 'Gratuit · glisse le doigt' },
      { id: 'game', kind: 'game', label: 'Chasse aux mauvaises herbes', sub: 'Gratuit' },
      { id: 'bonus', kind: 'bonus', label: 'Utiliser un bonus' },
      { id: 'defer', kind: 'defer', label: 'Plus tard' },
    ],
  },
  {
    id: 'parcel', weight: 3, scene: 'delivery', icon: 'gift', title: 'Livraison surprise',
    notif: 'Toc toc ! Un colis vient d’arriver au château.',
    auguste: 'Je n’ai rien commandé… enfin, presque rien. Tu l’ouvres ?',
    doneLine: 'Quelle belle surprise ! Elle est ajoutée à tes affaires ♡',
    baseCost: 0, capCost: 0, escalateMs: 0,
    options: [
      { id: 'open', kind: 'open', label: 'Ouvrir le colis' },
      { id: 'defer', kind: 'defer', label: 'Plus tard' },
    ],
  },
  {
    id: 'catMess', weight: 2, scene: 'catTidy', icon: 'heart', title: 'Le chat a fait une bêtise',
    notif: 'Miaou ? Le chat a fait une petite bêtise dans le salon…',
    auguste: 'Je jure que ce n’est pas moi. Il y a des preuves, mais il a l’air tellement fier.',
    doneLine: 'Tout est rangé, et le chat ronronne ♡',
    baseCost: 0, capCost: 0, escalateMs: 0, needs: 'cat',
    options: [
      { id: 'game', kind: 'game', label: 'Ranger ensemble', sub: 'Glisse les objets à leur place' },
      { id: 'defer', kind: 'defer', label: 'Plus tard' },
    ],
  },
  {
    id: 'rareFlower', weight: 1.4, scene: 'rareFlower', icon: 'sparkle', title: 'Une fleur rare',
    notif: 'Une fleur rare vient d’apparaître dans le jardin !',
    auguste: 'Regarde, elle brille. Elle n’était pas là ce matin…',
    doneLine: 'La fleur rare est ajoutée à ta collection ♡',
    baseCost: 0, capCost: 0, escalateMs: 0, needs: 'garden',
    options: [
      { id: 'open', kind: 'open', label: 'La découvrir' },
      { id: 'defer', kind: 'defer', label: 'Plus tard' },
    ],
  },
  {
    id: 'chocOrder', weight: 1.4, scene: 'chocOrder', icon: 'basket', title: 'Commande spéciale',
    notif: 'Une grosse commande de chocolats vient d’arriver !',
    auguste: 'Une commande spéciale ! Elle ne presse pas du tout : elle t’attend le temps qu’il faut.',
    doneLine: 'Commande livrée ! Les chocolatiers te remercient ♡',
    baseCost: 0, capCost: 0, escalateMs: 0,
    options: [
      { id: 'open', kind: 'open', label: 'Voir la commande' },
      { id: 'defer', kind: 'defer', label: 'Plus tard' },
    ],
  },
  {
    id: 'newShop', weight: 1, scene: 'newShop', icon: 'star', title: 'Nouvelle boutique',
    notif: 'Une nouvelle boutique vient d’ouvrir près du château !',
    auguste: 'Elle propose des tenues, des accessoires et de la déco. Allons voir ?',
    doneLine: 'Un petit lot d’ouverture est dans tes affaires ♡',
    baseCost: 0, capCost: 0, escalateMs: 0,
    options: [
      { id: 'open', kind: 'open', label: 'Entrer dans la boutique' },
      { id: 'defer', kind: 'defer', label: 'Plus tard' },
    ],
  },
];

export const incidentById = (id: string): IncidentDef | undefined => INCIDENTS.find((d) => d.id === id);
