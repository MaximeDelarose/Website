/**
 * LIEUX À RÉNOVER — données pures (aucun DOM), tout le contenu est ici.
 *
 * Un lieu = 4 étapes de rénovation (stage 0 → 4 : « à rénover », « murs refaits », « aménagé »,
 * « décoré », « ouvert »). Chaque étape a des OBJECTIFS (liés à la fusion et aux activités de MON MONDE),
 * un COÛT en ressources du monde (pièces, fleurs, tissu, cacao), des RÉCOMPENSES réelles (vêtements,
 * meubles, recettes… déjà présents dans le jeu) et parfois un CHOIX de couleur de la joueuse.
 *
 * Choix de conception (réutiliser l'existant, pas de doublons) :
 *  - « Aile du château »  : extension du château (pièces et meubles réels) ; s'ouvre sur le château ;
 *  - « Boutique de fleurs » : prolongement du jardin (bouquets) ; s'ouvre sur le jardin ;
 *  - « Chocolaterie de luxe » : palier de la chocolaterie existante (niveau de boutique, chocolats fabriqués) ;
 *  - « Boutique de vêtements » : prolongement du dressing (pièces possédées) ; s'ouvre sur le dressing ;
 *  - « Le Casino Royal ♛ » s'ouvre sur le casino (module de l'agent G) une fois ouvert ;
 *  - Salon de thé, Hôtel, Restaurant, Spa, Terrasse romantique : nouveaux lieux, avec un petit service régulier.
 *
 * Comptage des objectifs : voir ObjDef (kinds « moteur » alimentés par fun.endless2 et par le crochet de
 * src/domain/hook.ts, kinds « monde » lus directement dans la sauvegarde).
 */
import type { CollectionId } from '../data/items';
import type { ChocId, ClothId, ColorId, FlowerId, FurnitureId, ResKind } from '../data/world/ids';

export const PLACE_IDS = ['tea', 'flowers', 'wing', 'choc', 'boutique', 'hotel', 'restaurant', 'spa', 'terrace', 'casino'] as const;
export type PlaceId = (typeof PLACE_IDS)[number];

export type Cost = Partial<Record<ResKind, number>>;

/** Récompense de fin d'étape (toujours déterministe : aucune dépend du hasard ni du casino). */
export type Reward =
  | { t: 'furn'; id: FurnitureId; n?: number }
  | { t: 'cloth'; id: ClothId }
  | { t: 'res'; res: Cost }
  | { t: 'diamonds'; n: number }
  | { t: 'recipe'; id: ChocId }
  | { t: 'flower'; id: FlowerId };

/**
 * Objectifs.
 *  Moteur : orders (commandes livrées depuis que l'étape est active, crochet), deliver (idem, commandes contenant
 *  la collection), reach (niveau d'objet atteint — compteur `maxL:<coll>` ou album), discover (objets de l'album),
 *  gen (niveau du générateur).
 *  Monde : rooms (pièces du château), placed (meubles posés), bouquets (bouquets composés), chocmade (chocolats
 *  fabriqués), shop (niveau de la boutique de chocolats), wardrobe (vêtements possédés hors départ), fans.
 */
export type Obj =
  | { k: 'orders'; n: number }
  | { k: 'deliver'; coll: CollectionId; n: number }
  | { k: 'reach'; coll: CollectionId; l: number }
  | { k: 'discover'; n: number; coll?: CollectionId }
  | { k: 'gen'; coll: CollectionId; l: number }
  | { k: 'rooms'; n: number }
  | { k: 'placed'; n: number }
  | { k: 'bouquets'; n: number }
  | { k: 'chocmade'; n: number }
  | { k: 'shop'; n: number }
  | { k: 'wardrobe'; n: number }
  | { k: 'fans'; n: number };

export type ChoiceId = 'wall' | 'cloth' | 'accent';
export interface ChoiceDef { id: ChoiceId; /** Étape (index) où le choix est demandé. */ at: number; q: string; options: ColorId[]; def: ColorId }

export interface StageDef {
  name: string;
  blurb: string;
  objs: Obj[];
  cost: Cost;
  rewards: Reward[];
}

export type Req =
  | { k: 'place'; id: PlaceId; stage: number }
  | { k: 'rooms'; n: number }
  | { k: 'shop'; n: number };

export interface ServiceOpt { id: string; name: string; desc: string; gain: Cost; hearts?: number; line: string }
export interface ServiceDef { title: string; verb: string; cooldownMin: number; options: ServiceOpt[] }

export type LinkTarget = 'castle' | 'garden' | 'choc' | 'dressing' | 'casino';

export interface PlaceDef {
  id: PlaceId;
  name: string;
  /** Nom court (carte). */
  short: string;
  blurb: string;
  /** Couleurs de la carte et de l'enseigne. */
  tone: string;
  accent: string;
  reqs: Req[];
  choices: ChoiceDef[];
  stages: StageDef[];
  service?: ServiceDef;
  /** Activité existante prolongée (bouton « Aller à… » une fois le lieu ouvert, et dès le début si `early`). */
  link?: { to: LinkTarget; label: string; early?: boolean };
  /** Phrase d'Auguste à l'ouverture. */
  openLine: string;
}

// ------------------------------------------------------------------ petits constructeurs

const O = {
  orders: (n: number): Obj => ({ k: 'orders', n }),
  deliver: (coll: CollectionId, n: number): Obj => ({ k: 'deliver', coll, n }),
  reach: (coll: CollectionId, l: number): Obj => ({ k: 'reach', coll, l }),
  discover: (n: number, coll?: CollectionId): Obj => ({ k: 'discover', n, coll }),
  gen: (coll: CollectionId, l: number): Obj => ({ k: 'gen', coll, l }),
  rooms: (n: number): Obj => ({ k: 'rooms', n }),
  placed: (n: number): Obj => ({ k: 'placed', n }),
  bouquets: (n: number): Obj => ({ k: 'bouquets', n }),
  chocmade: (n: number): Obj => ({ k: 'chocmade', n }),
  shop: (n: number): Obj => ({ k: 'shop', n }),
  wardrobe: (n: number): Obj => ({ k: 'wardrobe', n }),
  fans: (n: number): Obj => ({ k: 'fans', n }),
};
const F = (id: FurnitureId, n = 1): Reward => ({ t: 'furn', id, n });
const Cl = (id: ClothId): Reward => ({ t: 'cloth', id });
const S = (name: string, blurb: string, objs: Obj[], cost: Cost, rewards: Reward[]): StageDef => ({ name, blurb, objs, cost, rewards });
const need = (id: PlaceId, stage: number): Req => ({ k: 'place', id, stage });
const CH = (id: ChoiceId, at: number, q: string, def: ColorId, ...options: ColorId[]): ChoiceDef => ({ id, at, q, def, options });

// ------------------------------------------------------------------ les dix lieux

export const PLACES: Record<PlaceId, PlaceDef> = {
  tea: {
    id: 'tea', name: 'Salon de thé', short: 'Salon de thé', tone: '#F5B5C8', accent: '#E8558F', reqs: [],
    blurb: 'Un petit salon de thé à la parisienne, avec des nappes en dentelle et des porcelaines fines.',
    openLine: 'Un salon de thé rien que pour nous, ma reine. Je réserve la table près de la fenêtre.',
    choices: [
      CH('wall', 0, 'Quelle couleur pour les murs ?', 'cream', 'rose', 'cream', 'lavender', 'sage'),
      CH('cloth', 2, 'Quelle nappe pour les tables ?', 'rose', 'rose', 'lavender', 'white', 'sky'),
    ],
    stages: [
      S('Murs repeints', 'On gratte, on ponce, on peint : le salon retrouve de belles couleurs.', [O.orders(3)], { coins: 120, flowers: 4 }, [F('lamp-table', 1)]),
      S('Tables et fauteuils', 'Des tables rondes, des fauteuils moelleux, un comptoir pour les gâteaux.', [O.deliver('flowers', 2), O.reach('flowers', 4)], { coins: 200, fabric: 4 }, [F('armchair', 2), F('coffee-table', 2)]),
      S('Nappes et fleurs', 'Dentelle, petits vases et chandelles : il ne manque plus que les clientes.', [O.reach('love', 4), O.bouquets(1)], { coins: 280, flowers: 8, cocoa: 4 }, [F('flower-vase', 2), F('candles', 2), Cl('dr-sundress-yellow')]),
      S('Ouverture du salon', 'Le ruban est coupé : le salon de thé ouvre ses portes !', [O.orders(8)], { coins: 380, cocoa: 8 }, [Cl('dr-lavender-tulle'), F('fountain', 1)]),
    ],
    service: {
      title: 'Le service du jour', verb: 'Servir', cooldownMin: 20,
      options: [
        { id: 'roses', name: 'Thé des roses', desc: 'Un thé parfumé, des pétales et un sourire.', gain: { coins: 40, flowers: 2 }, line: 'Le thé des roses sent comme ton jardin. Merci d\'être là.' },
        { id: 'parisien', name: 'Goûter parisien', desc: 'Éclairs, macarons et petits rubans.', gain: { coins: 55, fabric: 1 }, line: 'Un macaron pour toi, un pour moi… enfin, deux pour toi.' },
        { id: 'chaud', name: 'Chocolat chaud', desc: 'Épais, fumant, à partager.', gain: { coins: 30, cocoa: 3 }, hearts: 2, line: 'Il reste de la crème sur ton nez. Ne bouge pas.' },
      ],
    },
  },

  flowers: {
    id: 'flowers', name: 'Boutique de fleurs', short: 'Fleurs', tone: '#B5CDB0', accent: '#4E9A62', reqs: [],
    blurb: 'Une jolie boutique au bout du jardin : seaux de fleurs, rubans et bouquets sur mesure.',
    openLine: 'Chaque bouquet de cette boutique porte un peu de toi. Je les achète tous.',
    link: { to: 'garden', label: 'Aller au jardin' },
    choices: [CH('accent', 2, 'Quelle couleur pour l\'auvent ?', 'rose', 'rose', 'sage', 'lavender', 'sky')],
    stages: [
      S('Vitrine nettoyée', 'Les vitres brillent, le comptoir est ciré : on y voit enfin clair.', [O.orders(4)], { coins: 140, flowers: 6 }, [F('plant-pot', 2)]),
      S('Présentoirs', 'Des seaux, des étagères, des rubans : la boutique prend vie.', [O.bouquets(2), O.discover(4, 'flowers')], { coins: 240, flowers: 10 }, [F('flower-vase', 2), F('bench', 1)]),
      S('Pots et guirlandes', 'Des plantes partout, des guirlandes de fleurs séchées, un auvent coloré.', [O.deliver('flowers', 4), O.reach('rare', 2)], { coins: 320, flowers: 16 }, [Cl('cr-flowers'), F('flowerbed', 2)]),
      S('Grande ouverture', 'La boutique de fleurs ouvre ! Et une variété rare pousse enfin au jardin.', [O.reach('flowers', 7), O.reach('rare', 4)], { coins: 420, flowers: 24 }, [F('pergola', 1), { t: 'flower', id: 'magic' }]),
    ],
    service: {
      title: 'La vitrine du jour', verb: 'Composer', cooldownMin: 20,
      options: [
        { id: 'printemps', name: 'Bouquet de printemps', desc: 'Tulipes, pâquerettes et brins de lavande.', gain: { coins: 35, flowers: 3 }, line: 'Printemps toute l\'année, tant que tu es là.' },
        { id: 'romance', name: 'Bouquet romantique', desc: 'Roses rouges et pivoines tendres.', gain: { coins: 55 }, hearts: 2, line: 'Je sais déjà pour qui sera celui-là.' },
        { id: 'couronne', name: 'Couronne de fleurs', desc: 'Pour les cheveux, pour la fête.', gain: { coins: 25, flowers: 5 }, line: 'Reste immobile… voilà. Une vraie reine du printemps.' },
      ],
    },
  },

  wing: {
    id: 'wing', name: 'Aile du château', short: 'Aile du château', tone: '#CDBDF0', accent: '#8E7BC4', reqs: [{ k: 'rooms', n: 4 }],
    blurb: 'Une nouvelle aile s\'ajoute au château : hall, escalier d\'honneur et grande galerie.',
    openLine: 'Une aile entière pour recevoir. Il faudra bien un bal pour l\'inaugurer.',
    link: { to: 'castle', label: 'Entrer dans le château' },
    choices: [
      CH('wall', 0, 'Quelle couleur pour les murs de la galerie ?', 'lavender', 'lavender', 'rose', 'cream', 'sky'),
      CH('accent', 2, 'Quelle couleur pour les tentures ?', 'violet', 'violet', 'rose', 'gold', 'sage'),
    ],
    stages: [
      S('Gros œuvre', 'Murs porteurs, planchers, escalier : l\'aile sort de terre.', [O.placed(6)], { coins: 300, flowers: 5 }, [F('rug-rect', 1)]),
      S('Hall et galerie', 'Un grand hall, des tableaux, un lustre : on commence à rêver.', [O.rooms(6), O.reach('chess', 4)], { coins: 480, fabric: 6 }, [F('chandelier', 1), F('painting', 2)]),
      S('Boiseries et lustres', 'Boiseries sculptées, miroirs dorés et tentures de velours.', [O.orders(12), O.placed(14)], { coins: 640, flowers: 8, fabric: 8 }, [F('red-carpet', 1), F('mirror-standing', 2)]),
      S('Aile inaugurée', 'L\'aile est prête : cheminée, grande table et robe de bal.', [O.reach('chess', 6), O.fans(100)], { coins: 850, fabric: 12 }, [F('banquet-table', 1), F('fireplace', 1), Cl('dr-royal-gown')]),
    ],
    service: {
      title: 'La petite réception', verb: 'Recevoir', cooldownMin: 30,
      options: [
        { id: 'the', name: 'Thé dansant', desc: 'Quelques invités, un violon, une valse.', gain: { coins: 60, fabric: 1 }, line: 'Une valse ? Je promets de ne pas marcher sur tes pieds.' },
        { id: 'expo', name: 'Exposition de tableaux', desc: 'Les murs de l\'aile s\'habillent de couleurs.', gain: { coins: 80 }, hearts: 2, line: 'Ce tableau, c\'est toi. Je l\'ai reconnu tout de suite.' },
      ],
    },
  },

  choc: {
    id: 'choc', name: 'Chocolaterie de luxe', short: 'Chocolaterie de luxe', tone: '#D9B49A', accent: '#6B3E2E', reqs: [need('tea', 2), { k: 'shop', n: 2 }],
    blurb: 'Le palier supérieur de ta chocolaterie : comptoir de marbre, vitrines dorées et fontaine de chocolat.',
    openLine: 'Chocolaterie de luxe… mes préférées sont toujours les premières à disparaître.',
    link: { to: 'choc', label: 'Aller à la chocolaterie', early: true },
    choices: [CH('accent', 2, 'Quelle couleur pour les vitrines ?', 'brown', 'brown', 'noir', 'rose', 'gold')],
    stages: [
      S('Atelier assaini', 'Carrelage, plans de travail, bonne odeur de cacao : l\'atelier est prêt.', [O.shop(2), O.chocmade(6)], { coins: 260, cocoa: 10 }, [F('choco-display', 1)]),
      S('Comptoir de marbre', 'Un grand comptoir, des chaises hautes et des bonbonnières.', [O.deliver('choc', 2)], { coins: 420, cocoa: 16 }, [F('candles', 3), F('armchair', 1)]),
      S('Vitrines et fontaine', 'Les vitrines dorées accueillent les plus belles créations.', [O.reach('choc', 4), O.discover(4, 'choc')], { coins: 560, cocoa: 24, flowers: 6 }, [F('chandelier', 1), Cl('ac-choker')]),
      S('Chocolaterie royale', 'Ouverture ! La recette du Coffret royal est enfin à toi.', [O.reach('choc', 6), O.deliver('choc', 5)], { coins: 760, cocoa: 34 }, [{ t: 'recipe', id: 'royalbox' }, Cl('dr-satin-champagne'), { t: 'diamonds', n: 5 }]),
    ],
    service: {
      title: 'La dégustation', verb: 'Déguster', cooldownMin: 25,
      options: [
        { id: 'noir', name: 'Plateau de chocolats noirs', desc: 'Intensité et élégance.', gain: { coins: 60, cocoa: 4 }, line: 'Noir, 70 %. Comme mes intentions envers toi : sérieuses et gourmandes.' },
        { id: 'lait', name: 'Pralinés au lait', desc: 'Doux, fondants, croquants.', gain: { coins: 45, cocoa: 6 }, hearts: 2, line: 'Celui-ci, je le garde pour la fin. Celui-là aussi.' },
      ],
    },
  },

  boutique: {
    id: 'boutique', name: 'Boutique de vêtements', short: 'Boutique de mode', tone: '#B9A5E8', accent: '#8E7BC4', reqs: [need('flowers', 2)],
    blurb: 'Une boutique de mode au rez-de-chaussée du domaine : portants, cabines, miroirs et enseigne dorée.',
    openLine: 'Ta propre boutique de mode. Je veux être ton premier client, et ton plus fidèle.',
    link: { to: 'dressing', label: 'Aller au dressing' },
    choices: [
      CH('wall', 0, 'Quelle couleur pour les murs ?', 'cream', 'cream', 'rose', 'lavender', 'white'),
      CH('accent', 2, 'Quelle couleur pour l\'enseigne ?', 'gold', 'gold', 'rose', 'violet', 'noir'),
    ],
    stages: [
      S('Murs et miroirs', 'Un grand miroir, une peinture claire : la boutique respire.', [O.wardrobe(2), O.orders(5)], { coins: 200, fabric: 6 }, [F('mirror-standing', 1)]),
      S('Portants et présentoirs', 'Des portants alignés, un présentoir à chaussures : la collection s\'expose.', [O.deliver('paris', 3), O.reach('paris', 4)], { coins: 320, fabric: 10 }, [F('clothes-rack', 1), F('shoe-stand', 1)]),
      S('Cabines et enseigne', 'Rideaux de velours, cabines d\'essayage et enseigne lumineuse.', [O.wardrobe(6), O.discover(5, 'paris')], { coins: 450, fabric: 16 }, [F('accessory-stand', 1), Cl('sh-heels-gold')]),
      S('Boutique ouverte', 'La boutique de mode ouvre sa vitrine, avec une pièce rien que pour toi.', [O.deliver('cloth', 2), O.reach('cloth', 3)], { coins: 620, fabric: 22 }, [Cl('dr-emerald-evening'), Cl('bg-pearl-clutch')]),
    ],
    service: {
      title: 'La vitrine du moment', verb: 'Habiller', cooldownMin: 25,
      options: [
        { id: 'chic', name: 'Vitrine chic', desc: 'Tailleurs, soie et perles.', gain: { coins: 65, fabric: 2 }, line: 'Chic à pleurer. Et encore, tu n\'as rien mis toi-même.' },
        { id: 'casual', name: 'Vitrine décontractée', desc: 'Denim, sweats et baskets.', gain: { coins: 50, fabric: 3 }, hearts: 2, line: 'Le sweat noir est toujours en vitrine. Question de principe.' },
      ],
    },
  },

  hotel: {
    id: 'hotel', name: 'Hôtel', short: 'Hôtel', tone: '#A9D4F5', accent: '#5AA9FF', reqs: [need('wing', 2)],
    blurb: 'Un petit hôtel de charme : hall, suites et conciergerie, pour accueillir les invités du royaume.',
    openLine: 'Un hôtel de charme. Il y a une suite avec vue sur le jardin, elle est pour nous.',
    choices: [
      CH('wall', 0, 'Quelle couleur pour le hall ?', 'cream', 'cream', 'sky', 'rose', 'beige'),
      CH('accent', 2, 'Quelle couleur pour les suites ?', 'sky', 'sky', 'lavender', 'peach', 'sage'),
    ],
    stages: [
      S('Hall d\'accueil', 'Un comptoir de réception, des lampadaires et un grand tapis.', [O.orders(8)], { coins: 400, fabric: 6 }, [F('lamp-floor', 2)]),
      S('Les chambres', 'Chaque chambre reçoit un lit, un tapis, une table de chevet.', [O.rooms(6), O.discover(25)], { coins: 560, fabric: 10, flowers: 8 }, [F('nightstand', 2), F('rug-round', 2)]),
      S('Suites et conciergerie', 'Coiffeuse, miroirs et cloche dorée : le service est irréprochable.', [O.deliver('jewel', 2), O.reach('jewel', 3)], { coins: 720, fabric: 14, flowers: 10 }, [F('vanity', 1), F('sofa', 1)]),
      S('Hôtel ouvert', 'L\'hôtel accueille ses premiers hôtes. Le lit royal est installé.', [O.orders(30), O.discover(40)], { coins: 900, fabric: 18, cocoa: 10 }, [F('bed-royal', 1), Cl('dr-nightgown-silk')]),
    ],
    service: {
      title: 'La conciergerie', verb: 'Accueillir', cooldownMin: 30,
      options: [
        { id: 'weekend', name: 'Week-end de charme', desc: 'Deux invités, deux nuits, un joli pourboire.', gain: { coins: 90, fabric: 1 }, line: 'Pour les clients, tout est parfait. Pour moi, c\'est surtout toi.' },
        { id: 'noces', name: 'Suite des amoureux', desc: 'Pétales de roses et champagne sans alcool.', gain: { coins: 70, flowers: 4 }, hearts: 3, line: 'La suite des amoureux est réservée. Pas de nom sur la fiche.' },
      ],
    },
  },

  restaurant: {
    id: 'restaurant', name: 'Restaurant', short: 'Restaurant', tone: '#FFC0A3', accent: '#E8674F', reqs: [need('tea', 4)],
    blurb: 'Un restaurant intime : cuisine ouverte, nappes blanches et menu du jour qu\'Auguste choisit pour toi.',
    openLine: 'Table pour deux. Le menu, je l\'ai déjà choisi : tu me connais.',
    choices: [
      CH('wall', 0, 'Quelle couleur pour la salle ?', 'peach', 'peach', 'cream', 'rose', 'sage'),
      CH('cloth', 2, 'Quelle nappe pour les tables ?', 'white', 'white', 'rose', 'lavender', 'noir'),
    ],
    stages: [
      S('Cuisine ouverte', 'Fourneaux, plans de travail et casseroles : la cuisine reprend vie.', [O.orders(8), O.reach('love', 5)], { coins: 420, cocoa: 12 }, [F('coffee-table', 2)]),
      S('Salle et tables', 'Tables, chaises, une grande banquette : la salle est prête à accueillir.', [O.deliver('love', 3)], { coins: 560, fabric: 8 }, [F('banquet-table', 1), F('bench', 1)]),
      S('Menu et lumières', 'Un menu manuscrit, des bougies et un beau lustre.', [O.chocmade(12), O.reach('rare', 3)], { coins: 700, cocoa: 20, flowers: 10 }, [F('chandelier', 1), F('candles', 3)]),
      S('Service du soir', 'Le restaurant ouvre : première soirée, première addition… gratuite.', [O.orders(24), O.discover(30)], { coins: 860, cocoa: 26 }, [Cl('dr-little-black'), Cl('ac-pendant')]),
    ],
    service: {
      title: 'Le menu du jour', verb: 'Choisir', cooldownMin: 25,
      options: [
        { id: 'entree', name: 'Menu découverte', desc: 'Trois petits plats, trois surprises.', gain: { coins: 70, cocoa: 3 }, line: 'Un menu découverte, parce que je te redécouvre chaque jour.' },
        { id: 'plat', name: 'Plat du chef', desc: 'Simple, généreux, fait maison.', gain: { coins: 60, flowers: 2, cocoa: 2 }, hearts: 2, line: 'Je n\'ai pas cuisiné, mais j\'ai choisi la bougie. C\'est important.' },
      ],
    },
  },

  spa: {
    id: 'spa', name: 'Spa', short: 'Spa', tone: '#A9D4F5', accent: '#7FD6E8', reqs: [need('hotel', 2)],
    blurb: 'Un spa tout en douceur : bassin chaud, cabines de soin et parfums de fleurs.',
    openLine: 'Un spa pour la reine. Moi, je garde les serviettes bien chaudes.',
    choices: [CH('accent', 2, 'Quelle ambiance pour les bassins ?', 'sky', 'sky', 'sage', 'lavender', 'peach')],
    stages: [
      S('Bassins nettoyés', 'On vide, on frotte, on rince : les bassins retrouvent leur éclat.', [O.deliver('rare', 2), O.orders(12)], { coins: 520, flowers: 12 }, [F('plant-pot', 2)]),
      S('Cabines de soin', 'Des cabines tout en bois clair, des serviettes et de l\'huile parfumée.', [O.reach('jewel', 4), O.discover(35)], { coins: 680, fabric: 10, flowers: 10 }, [F('armchair', 1), F('rug-round', 1)]),
      S('Ambiance et parfums', 'Bougies, parfums et lumière douce : l\'ambiance se met en place.', [O.deliver('perfume', 2), O.reach('perfume', 3)], { coins: 860, flowers: 16, cocoa: 8 }, [F('candles', 4), Cl('dr-bathrobe')]),
      S('Le spa est ouvert', 'Les portes du spa s\'ouvrent sur un grand soupir de bien-être.', [O.reach('perfume', 5), O.orders(45)], { coins: 1000, fabric: 14, flowers: 20 }, [F('fountain', 1), Cl('dr-pajama-pink')]),
    ],
    service: {
      title: 'Le soin du jour', verb: 'Se détendre', cooldownMin: 30,
      options: [
        { id: 'massage', name: 'Massage aux huiles', desc: 'Vanille, fleur d\'oranger, silence.', gain: { coins: 80, flowers: 3 }, hearts: 2, line: 'Ferme les yeux. Je m\'occupe de tout, même du temps.' },
        { id: 'bain', name: 'Bain de pétales', desc: 'Eau chaude, pétales, mousse légère.', gain: { coins: 65, flowers: 5 }, line: 'Il y a des pétales jusque dans mes poches. Je ne regrette rien.' },
      ],
    },
  },

  terrace: {
    id: 'terrace', name: 'Terrasse romantique', short: 'Terrasse romantique', tone: '#F5B5C8', accent: '#E8558F', reqs: [need('restaurant', 2)],
    blurb: 'Une terrasse suspendue sous les étoiles : treille fleurie, guirlandes de lumière et une table pour deux.',
    openLine: 'Sous les étoiles, avec toi. Il n\'y a que ça qui compte, ma reine.',
    choices: [
      CH('cloth', 2, 'Quelle nappe pour la table ?', 'rose', 'rose', 'white', 'lavender', 'gold'),
      CH('accent', 2, 'Quelle couleur pour les guirlandes ?', 'gold', 'gold', 'rose', 'sky', 'peach'),
    ],
    stages: [
      S('Dalles et balustrade', 'Dalles de pierre, balustrade blanche : la terrasse prend forme.', [O.orders(12)], { coins: 560, flowers: 8 }, [F('bench', 1)]),
      S('Treille et lumières', 'Une treille fleurie, des lampadaires, un ciel qui s\'illumine.', [O.bouquets(5), O.discover(20, 'flowers')], { coins: 720, flowers: 14 }, [F('lamp-floor', 2), F('flowerbed', 2)]),
      S('Une table pour deux', 'Nappe, bougies et deux fauteuils face aux étoiles.', [O.reach('love', 7), O.gen('love', 2)], { coins: 880, flowers: 12, cocoa: 14 }, [F('flower-vase', 3), F('mirror-standing', 1)]),
      S('Dîner sous les étoiles', 'La terrasse ouvre pour un dîner que personne n\'oubliera.', [O.orders(40), O.reach('rare', 5)], { coins: 1100, flowers: 20, cocoa: 16 }, [Cl('dr-romantic-pink'), Cl('cr-tiara')]),
    ],
    service: {
      title: 'Le dîner romantique', verb: 'Dîner', cooldownMin: 45,
      options: [
        { id: 'etoiles', name: 'Dîner aux chandelles', desc: 'Deux couverts, une bougie, tout un ciel.', gain: { coins: 100, flowers: 3 }, hearts: 4, line: 'Regarde, la plus brillante nous suit. Elle est un peu jalouse.' },
        { id: 'danse', name: 'Danse sur la terrasse', desc: 'Une chanson lente et tes mains dans les miennes.', gain: { coins: 70, cocoa: 3 }, hearts: 5, line: 'Je ne sais pas danser. Je sais juste être près de toi.' },
      ],
    },
  },

  casino: {
    id: 'casino', name: 'Le Casino Royal ♛', short: 'Casino Royal ♛', tone: '#F3C86B', accent: '#B5862C', reqs: [need('hotel', 4), need('terrace', 4)],
    blurb: 'Le joyau du domaine : un casino de rêve, tapis rouge, lustres de cristal… avec des jetons gratuits, pour jouer en douceur.',
    openLine: 'Le Casino Royal est à toi. Des jetons pour rire, rien que pour s\'amuser, ma reine.',
    link: { to: 'casino', label: 'Entrer au Casino Royal' },
    choices: [
      CH('wall', 0, 'Quelle couleur pour le grand salon ?', 'noir', 'noir', 'violet', 'rose', 'sage'),
      CH('accent', 2, 'Quelle couleur pour le tapis de jeu ?', 'sage', 'sage', 'rose', 'violet', 'sky'),
    ],
    stages: [
      S('Le grand hall', 'Un vaste hall, un tapis rouge, un escalier de marbre.', [O.orders(20), O.fans(100)], { coins: 1000, fabric: 12 }, [F('red-carpet', 1)]),
      S('Salles de jeu', 'Tables de jeu, roulette et salons privés : la salle est prête.', [O.reach('jewel', 5), O.deliver('jewel', 4)], { coins: 1300, fabric: 14, flowers: 12 }, [F('chandelier', 2), F('banquet-table', 1)]),
      S('Lustres et velours', 'Lustres de cristal, rideaux de velours et dorures partout.', [O.deliver('acc', 2), O.reach('acc', 3)], { coins: 1600, fabric: 18, cocoa: 12 }, [F('fireplace', 1), Cl('jk-blazer-cream')]),
      S('Soirée d\'ouverture', 'Les portes du Casino Royal s\'ouvrent sur un tapis rouge.', [O.orders(60), O.reach('castle', 3)], { coins: 2000, fabric: 20, flowers: 16, cocoa: 14 }, [Cl('dr-redcarpet'), Cl('cr-gold'), { t: 'diamonds', n: 10 }]),
    ],
    service: {
      title: 'La soirée', verb: 'Choisir', cooldownMin: 40,
      options: [
        { id: 'galerie', name: 'Visite de la galerie', desc: 'Admire les lustres et les tableaux.', gain: { coins: 120 }, hearts: 3, line: 'Il paraît que la maison ne gagne jamais. Tant mieux : ici, c\'est toi qui reçois.' },
      ],
    },
  },
};

export const placeList = (): PlaceDef[] => PLACE_IDS.map((id) => PLACES[id]);
export const isPlaceId = (s: string): s is PlaceId => (PLACE_IDS as readonly string[]).includes(s);
export const STAGES = 4;
