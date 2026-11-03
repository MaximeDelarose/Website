/**
 * Données des carrières de Radia (fictives) : paliers, objectifs, récompenses,
 * paliers de fans, magazines, ainsi que les contenus des 4 mini-jeux.
 * Tout est volontairement gentil et sans pression.
 */
import type { CareerId, ClothId, FurnitureId, MagazineId, StyleId } from './ids';
import type { Expr } from '../dialogue';

// ------------------------------------------------------------------ récompenses
export interface Reward {
  coins?: number;
  diamonds?: number;
  energy?: number;
  fabric?: number;
  flowers?: number;
  cocoa?: number;
  fans?: number;
  cloth?: ClothId[];
  furniture?: FurnitureId[];
}

/** Libellé court d'une récompense (sans les tenues/meubles, listés à part). */
export const REWARD_LABELS: Record<'coins' | 'diamonds' | 'energy' | 'fabric' | 'flowers' | 'cocoa' | 'fans', string> = {
  coins: 'pièces', diamonds: 'diamants', energy: 'énergie', fabric: 'tissus', flowers: 'fleurs', cocoa: 'cacao', fans: 'fans',
};

// ------------------------------------------------------------------ objectifs
/**
 * Métriques suivies par carrière et par palier (remises à zéro à chaque palier) :
 *  sessions, s60, s75, s90, s100  nombre de séances atteignant ce score
 *  streak                         succès (≥ 60) à la suite
 *  combo                          meilleur combo (chanteuse)
 *  tag:xxx                        séances réussies (≥ 60) portant l'étiquette xxx
 */
export interface Objective { metric: string; need: number; label: string }

export interface TierDef {
  title: string;
  goal: string;
  obj: Objective;
  /** Expérience totale à atteindre (cumulée) pour ce palier. */
  xpNeed: number;
  reward: Reward;
}

export interface CareerDef {
  id: CareerId;
  name: string;
  tagline: string;
  /** Verbe du bouton. */
  session: string;
  color: string;
  color2: string;
  tiers: TierDef[];
}

const T = (title: string, goal: string, metric: string, need: number, label: string, xpNeed: number, reward: Reward): TierDef => ({ title, goal, obj: { metric, need, label }, xpNeed, reward });

export const CAREERS: Record<CareerId, CareerDef> = {
  photo: {
    id: 'photo', name: 'Modèle photo', tagline: 'Pose, souris, et capture la lumière.', session: 'Séance photo', color: '#F5B5C8', color2: '#E8558F',
    tiers: [
      T('Première séance', 'Réussir 3 séances avec un score ≥ 60', 's60', 3, 'séances ≥ 60', 60, { coins: 100, energy: 10 }),
      T('Visage de la campagne', 'Réussir 3 séances avec un score ≥ 75', 's75', 3, 'séances ≥ 75', 160, { coins: 150, fabric: 4, cloth: ['ac-sunglasses'] }),
      T('Pose élégante', 'Réussir 2 séances avec une pose de style Chic', 'tag:chic', 2, 'séances Chic ≥ 60', 300, { coins: 250, diamonds: 5, fans: 30, furniture: ['mirror-standing'] }),
      T('Muse du photographe', 'Enchaîner 4 succès à la suite', 'streak', 4, 'succès à la suite', 480, { coins: 300, fabric: 6, cloth: ['jk-blazer-cream'], furniture: ['easel'] }),
      T('Couverture de rêve', 'Réussir 2 séances avec un score ≥ 90', 's90', 2, 'séances ≥ 90', 700, { coins: 500, diamonds: 15, fans: 200, cloth: ['cr-flowers'] }),
    ],
  },
  model: {
    id: 'model', name: 'Mannequin', tagline: 'Compose la tenue, défile sur le podium.', session: 'Défilé', color: '#B9A5E8', color2: '#7A66B8',
    tiers: [
      T('Premier défilé', 'Réussir 3 défilés avec un score ≥ 60', 's60', 3, 'défilés ≥ 60', 60, { coins: 100, fabric: 3 }),
      T('Style Chic', 'Présenter 2 tenues de style Chic', 'tag:chic', 2, 'tenues Chic ≥ 60', 160, { coins: 150, cloth: ['bot-trousers-chic'] }),
      T('Sans faute', 'Réussir 3 défilés avec un score ≥ 75', 's75', 3, 'défilés ≥ 75', 300, { coins: 300, diamonds: 5, fans: 40, furniture: ['clothes-rack'] }),
      T('Tenue de gala', 'Présenter 2 tenues de style Royal', 'tag:royal', 2, 'tenues Royal ≥ 60', 480, { coins: 350, fabric: 8, cloth: ['bg-mini-gold'] }),
      T('Reine des podiums', 'Réussir 3 défilés avec un score ≥ 90', 's90', 3, 'défilés ≥ 90', 700, { coins: 500, diamonds: 20, fans: 250, cloth: ['dr-royal-gown'] }),
    ],
  },
  actress: {
    id: 'actress', name: 'Actrice', tagline: 'Trouve l\'émotion juste, la caméra t\'adore.', session: 'Tournage', color: '#FFC0A3', color2: '#E08A5E',
    tiers: [
      T('Le casting', 'Réussir 3 scènes avec un score ≥ 60', 's60', 3, 'scènes ≥ 60', 60, { coins: 100, energy: 10 }),
      T('Première réplique', 'Enchaîner 2 succès à la suite', 'streak', 2, 'succès à la suite', 160, { coins: 150, cloth: ['ac-scarf'] }),
      T('Rôle principal', 'Réussir 3 scènes avec un score ≥ 75', 's75', 3, 'scènes ≥ 75', 300, { coins: 250, diamonds: 5, cloth: ['top-cardigan-lavender'], furniture: ['candles'] }),
      T('Le tournage', 'Réussir 2 scènes avec un score ≥ 90', 's90', 2, 'scènes ≥ 90', 480, { coins: 300, fans: 80, cloth: ['dr-flowy-floral'] }),
      T('La grande première', 'Jouer 2 scènes parfaites (100)', 's100', 2, 'scènes parfaites', 700, { coins: 500, diamonds: 20, fans: 250, cloth: ['dr-redcarpet'] }),
    ],
  },
  singer: {
    id: 'singer', name: 'Chanteuse', tagline: 'Répète, monte sur scène, chante pour tes fans.', session: 'Concert', color: '#FFD98A', color2: '#D9A43C',
    tiers: [
      T('La répétition', 'Réussir 3 concerts avec un score ≥ 60', 's60', 3, 'concerts ≥ 60', 60, { coins: 100, energy: 10 }),
      T('Premier concert', 'Atteindre un combo de 12 notes', 'combo', 12, 'meilleur combo', 160, { coins: 150, cloth: ['ac-hoops'] }),
      T('Tenue de scène', 'Réussir 3 concerts avec un score ≥ 75', 's75', 3, 'concerts ≥ 75', 300, { coins: 250, diamonds: 5, fabric: 4, cloth: ['jk-leather-black'] }),
      T('Les fans chantent', 'Réussir « Reine de la nuit » (≥ 60)', 'tag:song3', 1, 'chanson 3 réussie', 480, { coins: 350, fans: 80, cloth: ['sh-heels'] }),
      T('La tournée', 'Réussir « Paris Lumières » (≥ 75)', 'tag:song4s', 1, 'chanson 4 ≥ 75', 700, { coins: 500, diamonds: 20, fans: 250, cloth: ['dr-stage-sequin'], furniture: ['chandelier'] }),
    ],
  },
};

// ------------------------------------------------------------------ fans
export interface FanTierDef { n: number; title: string; reward: Reward; magazine?: MagazineId; event?: string; note: string }
export const FAN_TIER_DEFS: FanTierDef[] = [
  { n: 10, title: 'Premiers admirateurs', note: 'Un petit club de fans naît.', reward: { coins: 60, cloth: ['top-tee-pink'] } },
  { n: 100, title: 'Le fan-club', note: 'Un tableau pour ton château.', reward: { coins: 120, furniture: ['painting'] } },
  { n: 1000, title: 'On parle de toi', note: 'Les passants te reconnaissent.', reward: { coins: 200, diamonds: 8, cloth: ['sh-heels'] } },
  { n: 10000, title: 'Idole de Paris', note: 'Une robe de scène t\'attend.', reward: { coins: 300, fabric: 6, cloth: ['dr-stage-sequin'] } },
  { n: 100000, title: 'Star du royaume', note: 'Le tapis rouge est déroulé.', reward: { coins: 600, diamonds: 20, cloth: ['cr-tiara'], furniture: ['red-carpet'] }, event: 'Soirée de gala' },
  { n: 1000000, title: 'Légende', note: 'Un million de cœurs (fictifs).', reward: { coins: 1500, diamonds: 50, cloth: ['cr-gold', 'dr-redcarpet'], furniture: ['chandelier'] }, magazine: 'star-royaume', event: 'Grande soirée du royaume' },
];

/** Fiche d'Auguste (fan n° 1) et ses répliques de fiche (en plus de celles d'auguste.ts). */
export const AUGUSTE_FICHE = {
  name: 'Auguste ♡',
  title: 'Fan n° 1 depuis le premier jour.',
  text: 'Son plus grand fan, même avant que le monde découvre son talent.',
  lines: [
    'Je tiens le registre officiel : fan n° 1, matricule 0001.',
    'Même avec un million de fans, personne ne crie aussi fort que moi. Presque.',
    'J\'ai gardé tous tes tickets de concert. Même ceux que tu n\'as pas encore donnés.',
  ],
};

// ------------------------------------------------------------------ magazines
export interface MagUnlock { careers?: { id: CareerId; level: number }[]; anyLevel?: number; fansTier?: number }
export interface MagazineDef {
  id: MagazineId;
  name: string;
  /** Texte de la condition (affiché verrouillé). */
  how: string;
  unlock: MagUnlock;
  bg: [string, string];
  accent: string;
  ink: string;
  slogan: string;
  heads: string[];
  issue: string;
}
export const MAGAZINES: Record<MagazineId, MagazineDef> = {
  'radia-mag': {
    id: 'radia-mag', name: 'RADIA', how: 'Atteindre le palier 1 d\'une carrière', unlock: { anyLevel: 1 },
    bg: ['#FFE4EE', '#F5B5C8'], accent: '#E8558F', ink: '#51446D', slogan: 'Le magazine du royaume', issue: 'N° 1',
    heads: ['Radia, la nouvelle étoile', 'Ses secrets de style', 'Le château dévoilé'],
  },
  'queen-paris': {
    id: 'queen-paris', name: 'Queen of Paris', how: 'Modèle photo palier 3, ou 1 000 fans', unlock: { careers: [{ id: 'photo', level: 3 }], fansTier: 2 },
    bg: ['#51446D', '#8E7BC4'], accent: '#F3C86B', ink: '#FFF4E8', slogan: 'Paris à ses pieds', issue: 'Édition prestige',
    heads: ['Paris sous le charme', 'Dans l\'objectif de la reine', 'Nuits dorées'],
  },
  'radia-show': {
    id: 'radia-show', name: 'The Radia Show', how: 'Actrice ou Chanteuse palier 3', unlock: { careers: [{ id: 'actress', level: 3 }, { id: 'singer', level: 3 }] },
    bg: ['#FFD98A', '#FFC0A3'], accent: '#C4407A', ink: '#58433F', slogan: 'Lumière, caméra, Radia !', issue: 'Spécial télé',
    heads: ['L\'émission de l\'année', 'Applaudissements !', 'Coulisses du plateau'],
  },
  'radia-fashion': {
    id: 'radia-fashion', name: 'Radia Fashion', how: 'Mannequin palier 3', unlock: { careers: [{ id: 'model', level: 3 }] },
    bg: ['#FFF4E8', '#CDBDF0'], accent: '#7A66B8', ink: '#3B3152', slogan: 'Le style, c\'est elle', issue: 'Collection',
    heads: ['Tendances de la saison', 'Cinq tenues, un seul sourire', 'Défilé de rêve'],
  },
  'star-royaume': {
    id: 'star-royaume', name: 'Star du Royaume', how: '100 000 fans, ou une carrière au palier 5', unlock: { anyLevel: 5, fansTier: 4 },
    bg: ['#3B3152', '#E8558F'], accent: '#F3C86B', ink: '#FFF9EE', slogan: 'La couronne lui va si bien', issue: 'Numéro collector',
    heads: ['Couronnée !', 'Une légende (fictive) est née', 'Tout le royaume chante'],
  },
};

// ------------------------------------------------------------------ mini-jeu : photo
export interface PoseDef { id: string; name: string; style: StyleId; arms: 'down' | 'wave' | 'heart' | 'open'; step: number; expr: Expr }
export const POSES: PoseDef[] = [
  { id: 'sweet', name: 'Douceur', style: 'romantic', arms: 'down', step: 0, expr: 'smile' },
  { id: 'wave', name: 'Coucou', style: 'casual', arms: 'wave', step: 0, expr: 'laugh' },
  { id: 'heart', name: 'Cœur', style: 'romantic', arms: 'heart', step: 0, expr: 'love' },
  { id: 'open', name: 'Grand large', style: 'stage', arms: 'open', step: 0, expr: 'smile' },
  { id: 'walk', name: 'Démarche', style: 'chic', arms: 'down', step: 1, expr: 'neutral' },
  { id: 'tease', name: 'Regard malicieux', style: 'chic', arms: 'down', step: -1, expr: 'tease' },
];
export interface DecorDef { id: string; name: string; styles: StyleId[] }
export const PHOTO_DECORS: DecorDef[] = [
  { id: 'garden', name: 'Jardin fleuri', styles: ['romantic', 'casual'] },
  { id: 'city', name: 'Rue de Paris', styles: ['chic', 'casual'] },
  { id: 'stage', name: 'Scène lumineuse', styles: ['stage', 'royal'] },
  { id: 'palace', name: 'Salon du palais', styles: ['royal', 'chic', 'romantic'] },
];

// ------------------------------------------------------------------ mini-jeu : actrice
export interface Take { expr: Expr; text: string; q: 0 | 1 | 2 }
export interface Beat { cue: string; takes: Take[] }
export interface SceneDef { id: string; title: string; synopsis: string; level: number; beats: Beat[] }
const K = (expr: Expr, text: string, q: 0 | 1 | 2): Take => ({ expr, text, q });
export const SCENES: SceneDef[] = [
  {
    id: 'casting', title: 'Le casting', synopsis: 'Tu passes ton premier essai devant la réalisatrice.', level: 1,
    beats: [
      { cue: '« Bonjour ! Vous êtes prête ? »', takes: [K('smile', 'Bonjour, oui, avec plaisir !', 2), K('shy', 'Euh… je crois que oui…', 1), K('sad', 'Pas vraiment…', 0), K('surprise', 'Déjà ?!', 0)] },
      { cue: '« Jouez la joie d\'une bonne nouvelle. »', takes: [K('laugh', 'J\'ai réussi ! J\'ai réussi !', 2), K('smile', 'Oh, c\'est chouette.', 1), K('neutral', 'D\'accord.', 0), K('sad', 'Ah… bon.', 0)] },
      { cue: '« Maintenant, une grande surprise. »', takes: [K('surprise', 'Quoi ?! Mais… c\'est incroyable !', 2), K('laugh', 'Ha ha ha !', 1), K('neutral', 'Tiens.', 0), K('tease', 'Je m\'en doutais.', 0)] },
      { cue: '« Et un peu de tristesse, doucement. »', takes: [K('sad', 'Il est parti… sans un mot.', 2), K('shy', 'Je… je ne sais plus.', 1), K('laugh', 'Tant pis, ha ha !', 0), K('love', 'Je l\'aime tant.', 0)] },
      { cue: '« Pour finir : un sourire plein d\'amour. »', takes: [K('love', 'Je suis tellement heureuse que tu sois là.', 2), K('smile', 'Merci d\'être venu.', 1), K('tease', 'Pas mal, hein ?', 0), K('surprise', 'Oh !', 0)] },
    ],
  },
  {
    id: 'cafe', title: 'Le café de la rue', synopsis: 'Une comédie romantique : une rencontre inattendue.', level: 1,
    beats: [
      { cue: 'Il renverse son café juste devant toi.', takes: [K('surprise', 'Oh là là !', 2), K('sad', 'Ma robe…', 1), K('laugh', 'Quelle entrée !', 1), K('neutral', 'Mmh.', 0)] },
      { cue: '« Pardon ! Je suis vraiment désolé… »', takes: [K('smile', 'Ce n\'est rien, vraiment.', 2), K('tease', 'Vous le faites exprès ?', 1), K('sad', 'C\'est ma journée…', 0), K('surprise', 'Quoi ?!', 0)] },
      { cue: 'Il propose de te payer un autre café.', takes: [K('shy', 'Oh… avec plaisir.', 2), K('smile', 'Pourquoi pas.', 1), K('laugh', 'Haha, jamais !', 0), K('neutral', 'Non.', 0)] },
      { cue: 'Il te fait un compliment sincère.', takes: [K('shy', 'Vous… vous êtes gentil.', 2), K('love', 'C\'est adorable.', 1), K('tease', 'Je sais.', 0), K('sad', 'Arrêtez…', 0)] },
      { cue: 'Il te dit au revoir. Tu souris en secret.', takes: [K('love', 'À très bientôt, j\'espère.', 2), K('smile', 'Au revoir !', 1), K('sad', 'Déjà…', 0), K('surprise', 'Hein ?', 0)] },
    ],
  },
  {
    id: 'theatre', title: 'Soir de théâtre', synopsis: 'Un drame doux : la dernière représentation.', level: 2,
    beats: [
      { cue: 'Le rideau se lève sur une salle silencieuse.', takes: [K('shy', 'Tant de monde…', 2), K('smile', 'Bonsoir.', 1), K('laugh', 'Quel public !', 0), K('tease', 'À moi de jouer.', 1)] },
      { cue: 'Ton personnage apprend une trahison.', takes: [K('sad', 'Toi aussi ?', 2), K('surprise', 'Non… pas toi.', 1), K('laugh', 'Quelle blague !', 0), K('love', 'Je te pardonne.', 0)] },
      { cue: 'Un secret est enfin révélé.', takes: [K('surprise', 'Tout ce temps…', 2), K('sad', 'Je comprends.', 1), K('tease', 'Je le savais.', 0), K('smile', 'Tant mieux.', 0)] },
      { cue: 'La réconciliation approche.', takes: [K('love', 'Reste. Je t\'en prie.', 2), K('shy', 'Je ne sais pas…', 1), K('neutral', 'Fais comme tu veux.', 0), K('laugh', 'Ha !', 0)] },
      { cue: 'Dernière réplique, sous les projecteurs.', takes: [K('smile', 'Et la vie continue, plus belle.', 2), K('love', 'Je t\'aime, simplement.', 1), K('sad', 'Adieu.', 0), K('surprise', 'Déjà fini ?', 0)] },
    ],
  },
  {
    id: 'detective', title: 'Le mystère du manoir', synopsis: 'Une enquête rigolote avec un coupable… très maladroit.', level: 3,
    beats: [
      { cue: 'Tu découvres une empreinte de bottes dans le salon.', takes: [K('surprise', 'Tiens, tiens…', 1), K('tease', 'Un indice !', 2), K('sad', 'Quel désordre.', 0), K('laugh', 'Des bottes !', 0)] },
      { cue: 'Le majordome se met à bégayer.', takes: [K('tease', 'Vous cachez quelque chose.', 2), K('smile', 'Détendez-vous.', 1), K('sad', 'Pauvre homme.', 0), K('love', 'Adorable.', 0)] },
      { cue: 'La lumière s\'éteint d\'un coup.', takes: [K('surprise', 'Qui est là ?!', 2), K('shy', 'J\'ai peur du noir…', 1), K('laugh', 'Ha ha, bien joué.', 0), K('neutral', 'Panne de courant.', 0)] },
      { cue: 'Le coupable tombe dans le filet des rideaux.', takes: [K('laugh', 'Affaire résolue !', 2), K('tease', 'Je l\'avais dit.', 1), K('sad', 'Quelle pitié.', 0), K('shy', 'Oups.', 0)] },
      { cue: 'Le manoir applaudit. Tu salues.', takes: [K('smile', 'Merci, merci.', 2), K('shy', 'Oh, c\'est trop…', 1), K('sad', 'Déjà fini.', 0), K('neutral', 'Voilà.', 0)] },
    ],
  },
  {
    id: 'premiere', title: 'La grande première', synopsis: 'Le film sort ce soir. Tout se joue sur le tapis rouge.', level: 4,
    beats: [
      { cue: 'Les flashs crépitent à ton arrivée.', takes: [K('smile', 'Merci d\'être venus !', 2), K('surprise', 'Tant de monde !', 1), K('shy', 'Je rêve…', 1), K('sad', 'Trop de bruit…', 0)] },
      { cue: 'Un journaliste te demande ton secret.', takes: [K('tease', 'Un peu de travail… et beaucoup de cœur.', 2), K('laugh', 'Un bon café !', 1), K('neutral', 'Pas de secret.', 0), K('sad', 'Je ne sais pas.', 0)] },
      { cue: 'Tu repères quelqu\'un qui t\'a toujours soutenue.', takes: [K('love', 'Tu es venu.', 2), K('surprise', 'Toi ici ?!', 1), K('tease', 'En retard, comme d\'habitude.', 1), K('sad', 'Enfin.', 0)] },
      { cue: 'Le film commence. Ta scène préférée arrive.', takes: [K('shy', 'Je n\'ose pas regarder…', 2), K('laugh', 'Regardez, regardez !', 1), K('neutral', 'Voilà ma scène.', 0), K('sad', 'Je me trouve nulle.', 0)] },
      { cue: 'Standing ovation, tout le monde se lève.', takes: [K('laugh', 'Merci du fond du cœur !', 2), K('love', 'Je vous aime tous.', 1), K('surprise', 'C\'est pour moi ?!', 1), K('neutral', 'Merci.', 0)] },
    ],
  },
];

// ------------------------------------------------------------------ mini-jeu : chanteuse
export interface SongDef {
  id: number; name: string; bpm: number; bars: number; lanes: 3 | 4;
  /** Motifs d'une mesure en croches (8 pas) : numéro de piste ou -1. */
  motifs: number[][];
  /** Notes de la gamme (Hz) par piste. */
  notes: number[];
  fall: number;
}
const P5 = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25]; // do ré mi sol la do
export const SONGS: SongDef[] = [
  { id: 1, name: 'Petit cœur', bpm: 84, bars: 9, lanes: 3, fall: 1.7, notes: [P5[0], P5[2], P5[3]], motifs: [[0, -1, -1, -1, 1, -1, -1, -1], [2, -1, -1, -1, 1, -1, -1, -1], [0, -1, 1, -1, 2, -1, -1, -1], [1, -1, -1, -1, 0, -1, 2, -1]] },
  { id: 2, name: 'Sous les étoiles', bpm: 96, bars: 11, lanes: 3, fall: 1.55, notes: [P5[1], P5[3], P5[4]], motifs: [[0, -1, 1, -1, 2, -1, 1, -1], [2, -1, 1, 1, 0, -1, -1, -1], [0, 0, -1, 1, -1, 2, -1, -1], [1, -1, 2, -1, 1, -1, 0, -1]] },
  { id: 3, name: 'Reine de la nuit', bpm: 108, bars: 12, lanes: 4, fall: 1.4, notes: [P5[0], P5[2], P5[3], P5[5]], motifs: [[0, -1, 1, -1, 2, -1, 3, -1], [3, -1, 2, 2, 1, -1, 0, -1], [0, 1, -1, 2, 3, -1, 2, -1], [1, -1, 3, -1, 0, 2, -1, -1], [0, -1, 0, 3, -1, 3, 1, -1]] },
  { id: 4, name: 'Paris Lumières', bpm: 120, bars: 14, lanes: 4, fall: 1.25, notes: [P5[1], P5[3], P5[4], P5[5] * 1.122], motifs: [[0, 1, 2, 3, 2, 1, 0, -1], [3, -1, 2, 1, -1, 0, 1, 2], [0, 2, -1, 3, 1, -1, 2, 0], [1, 1, 3, -1, 2, 0, -1, 3], [0, -1, 3, 3, 1, 2, -1, 0]] },
];

// ------------------------------------------------------------------ mini-jeu : mannequin
export const THEME_HINTS: Record<StyleId, string> = {
  casual: 'Décontracté : tee-shirt, jean, baskets.',
  chic: 'Élégant : chemisier, blazer, escarpins.',
  romantic: 'Doux : rose, fleurs, perles, robe fluide.',
  royal: 'Majestueux : robe de gala, couronne, perles.',
  stage: 'Pailletes et lumières : robe de scène, veste noire.',
};

// ------------------------------------------------------------------ libellés
/** Noms français des meubles offerts (le catalogue complet est géré par le module « château »). */
export const FURN_NAMES: Record<string, string> = {
  painting: 'Tableau', 'red-carpet': 'Tapis rouge', chandelier: 'Lustre', 'mirror-standing': 'Miroir sur pied',
  easel: 'Chevalet', candles: 'Bougies', 'clothes-rack': 'Portant à vêtements',
};
export const EXPR_LABELS: Record<Expr, string> = {
  neutral: 'Neutre', smile: 'Sourire', laugh: 'Rire', surprise: 'Surprise', sad: 'Tristesse', love: 'Amour', tease: 'Malice', shy: 'Timidité',
};
