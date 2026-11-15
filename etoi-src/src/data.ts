import type { Profile, Me, AppState, Avail, Slot } from './types';

export const INTERESTS = [
  'Cuisine', 'Randonnée', 'Cinéma', 'Lecture', 'Musique live', 'Voyages', 'Yoga', 'Course à pied',
  'Jardinage', 'Photographie', 'Restos & bars', 'Théâtre', 'Vélo', 'Jeux de société', 'Expos', 'Vin & whisky',
];
export const TRAITS = ['Curieux·se', 'Drôle', 'Calme', 'Spontané·e', 'Attentionné·e', 'Casanier·ère', 'Aventurier·ère', 'Pudique'];
export const VALUES = ['Honnêteté', 'Complicité', 'Humour', 'Stabilité', 'Indépendance', 'Tendresse', 'Projets communs', 'Patience'];

export const INTENTIONS: Record<string, string> = {
  serieuse: 'Une relation sérieuse',
  doucement: 'Faire connaissance, sans précipitation',
  reflexion: 'Encore en réflexion',
};
export const AVAIL_LABEL: Record<Avail, string> = {
  soiree: 'En soirée', journee: 'En journée', weekend: 'Le week-end', variable: 'Variable selon les semaines',
};

export const DAYS = [
  ['lun', 'Lun'], ['mar', 'Mar'], ['mer', 'Mer'], ['jeu', 'Jeu'], ['ven', 'Ven'], ['sam', 'Sam'], ['dim', 'Dim'],
] as const;
export const DAY_FULL: Record<string, string> = {
  lun: 'lundi', mar: 'mardi', mer: 'mercredi', jeu: 'jeudi', ven: 'vendredi', sam: 'samedi', dim: 'dimanche',
};
export const PERIODS = [['jour', 'Journée'], ['soir', 'Soirée']] as const;

export function slotLabel(s: Slot) {
  const [d, p] = s.split('-');
  return `${DAY_FULL[d]} ${p === 'soir' ? 'soir' : 'en journée'}`;
}

/** Créneaux par défaut déduits des disponibilités générales (modifiables par la personne). */
export function slotsFromAvail(a: Avail[]): Slot[] {
  const out: Slot[] = [];
  const wk = ['lun', 'mar', 'mer', 'jeu', 'ven'];
  if (a.includes('soiree')) wk.forEach((d) => out.push(`${d}-soir`));
  if (a.includes('journee')) wk.forEach((d) => out.push(`${d}-jour`));
  if (a.includes('weekend')) ['sam', 'dim'].forEach((d) => { out.push(`${d}-jour`); out.push(`${d}-soir`); });
  return out;
}

export const PROFILES: Profile[] = [
  {
    id: 'camille', name: 'Camille', age: 34, gender: 'femme', zone: 'Lyon 3e', km: 6, hue: 28, likesYou: true,
    bio: 'Graphiste le jour, grande lectrice la nuit. J\'aime les dîners qui s\'étirent, les playlists soignées et les gens qui rient sans se retenir.',
    seeking: 'Quelqu\'un de curieux, avec qui parler est facile. Pas pressée, mais pas là pour faire semblant.',
    interests: ['Lecture', 'Cuisine', 'Expos', 'Musique live', 'Vin & whisky'], intention: 'doucement', avail: ['soiree', 'weekend'],
    slots: ['mar-soir', 'jeu-soir', 'sam-soir', 'dim-jour'],
    replies: ['Bonsoir ! Contente que ça soit réciproque.', 'Ha, bonne question. Je dirais : une table au fond, une bougie, et personne pour regarder l\'heure.', 'Jeudi soir me va très bien. Un endroit calme ?'],
  },
  {
    id: 'julien', name: 'Julien', age: 38, gender: 'homme', zone: 'Villeurbanne', km: 9, hue: 18, likesYou: true,
    bio: 'Menuisier, cuisinier du dimanche, mauvais perdant aux jeux de société. Papa solo depuis trois ans, j\'ai envie de légèreté.',
    seeking: 'Une personne sincère, avec de l\'humour et une vraie vie à côté.',
    interests: ['Cuisine', 'Randonnée', 'Jeux de société', 'Vélo'], intention: 'serieuse', avail: ['soiree', 'variable'],
    slots: ['mar-soir', 'jeu-soir', 'ven-soir', 'sam-soir'],
    replies: ['Salut ! Ravi de faire ta connaissance.', 'Une soirée idéale ? Un plat qui mijote, un bon vinyle, et une conversation qui dérive.', 'Vendredi soir, ça te dirait ?'],
  },
  {
    id: 'sarah', name: 'Sarah', age: 31, gender: 'femme', zone: 'Lyon 7e', km: 4, hue: 340, likesYou: false,
    bio: 'Infirmière, horaires décalés, énergie à revendre. Je cours le matin, je rattrape le sommeil en rêvant de voyages.',
    seeking: 'Quelqu\'un de patient et enthousiaste, qui comprend que les plans changent.',
    interests: ['Course à pied', 'Voyages', 'Yoga', 'Cinéma'], intention: 'doucement', avail: ['journee', 'variable'],
    slots: ['lun-jour', 'mer-jour', 'ven-jour', 'dim-jour'],
    replies: ['Coucou !', 'Je dirais : improviser. Les meilleures soirées ne se planifient pas.', 'Un mercredi en journée, c\'est possible pour moi.'],
  },
  {
    id: 'thomas', name: 'Thomas', age: 41, gender: 'homme', zone: 'Lyon 6e', km: 7, hue: 36, likesYou: false,
    bio: 'Architecte, photographe amateur. Je chasse la lumière de fin de journée et les bonnes adresses sans prétention.',
    seeking: 'Une relation posée, faite de petites attentions plutôt que de grands discours.',
    interests: ['Photographie', 'Expos', 'Restos & bars', 'Lecture', 'Voyages'], intention: 'serieuse', avail: ['soiree', 'weekend'],
    slots: ['jeu-soir', 'sam-soir', 'dim-jour'],
    replies: ['Bonsoir, merci pour ton message.', 'Un dîner improvisé, sans hésiter.', 'Samedi soir ?'],
  },
  {
    id: 'ines', name: 'Inès', age: 36, gender: 'femme', zone: 'Caluire', km: 11, hue: 8, likesYou: true,
    bio: 'Prof de lettres, théâtre le mardi, thé trop chaud tout le reste du temps. Maman de deux petits tornades.',
    seeking: 'Un homme ou une femme avec de la conversation, et des silences confortables.',
    interests: ['Théâtre', 'Lecture', 'Jardinage', 'Musique live'], intention: 'reflexion', avail: ['soiree'],
    slots: ['mer-soir', 'jeu-soir', 'ven-soir'],
    replies: ['Bonsoir, avec plaisir.', 'Ce qui me fait rire à tous les coups : les fous rires nerveux au théâtre.', 'Mercredi soir ou jeudi soir, comme tu veux.'],
  },
  {
    id: 'marc', name: 'Marc', age: 44, gender: 'homme', zone: 'Lyon 2e', km: 5, hue: 24, likesYou: false,
    bio: 'Chef de projet, passionné de montagne et de jazz. Je sais écouter, et je fais un excellent risotto.',
    seeking: 'Complicité, tendresse et un peu d\'aventure, à un rythme qui nous ressemble.',
    interests: ['Randonnée', 'Musique live', 'Cuisine', 'Vin & whisky'], intention: 'doucement', avail: ['weekend', 'variable'],
    slots: ['sam-jour', 'sam-soir', 'dim-jour'],
    replies: ['Salut !', 'Une sortie organisée, mais avec la possibilité de tout changer.', 'Samedi, en journée ou en soirée.'],
  },
  {
    id: 'nora', name: 'Nora', age: 29, gender: 'femme', zone: 'Lyon 1er', km: 3, hue: 352, likesYou: false,
    bio: 'Illustratrice, plantes vertes en pagaille et playlist de chansons tristes pour danser.',
    seeking: 'Quelqu\'un de doux et de drôle. Les gens qui osent dire « je ne sais pas encore » me touchent.',
    interests: ['Expos', 'Jardinage', 'Musique live', 'Cinéma', 'Photographie'], intention: 'reflexion', avail: ['soiree', 'journee'],
    slots: ['lun-soir', 'mar-soir', 'jeu-soir', 'ven-jour'],
    replies: ['Hello !', 'Ma soirée idéale : un film en noir et blanc, puis un long détour pour rentrer.', 'Lundi soir peut-être ?'],
  },
  {
    id: 'antoine', name: 'Antoine', age: 36, gender: 'homme', zone: 'Oullins', km: 12, hue: 30, likesYou: true,
    bio: 'Kiné, coureur du dimanche, cuisinier approximatif mais enthousiaste. Je cherche à rire de nouveau, simplement.',
    seeking: 'Une personne bienveillante, avec qui construire quelque chose de calme et de solide.',
    interests: ['Course à pied', 'Cuisine', 'Vélo', 'Randonnée', 'Cinéma'], intention: 'serieuse', avail: ['soiree', 'weekend'],
    slots: ['mar-soir', 'mer-soir', 'sam-soir', 'dim-soir'],
    replies: ['Bonsoir !', 'Ce qui me fait rire : mes propres fiascos culinaires.', 'Mardi soir, ça marche pour moi.'],
  },
];

export const ICEBREAKERS = [
  'À quoi ressemble ta soirée idéale ?',
  'Tu préfères un dîner improvisé ou une sortie organisée ?',
  'Qu\'est-ce qui te fait rire à tous les coups ?',
  'Quel est le dernier endroit qui t\'a vraiment dépaysé ?',
];

export const DEMO_ME: Me = {
  name: 'Alex', birth: '1988-04-12', gender: 'homme', city: 'Lyon', kids: '2', kidsAges: ['6-10'], situation: 'Parent solo, garde principale',
  time: 'Quelques soirées par semaine', intention: 'doucement', avail: ['soiree', 'weekend'],
  interests: ['Cuisine', 'Cinéma', 'Randonnée', 'Musique live'], traits: ['Curieux·se', 'Drôle'], values: ['Honnêteté', 'Complicité'],
  phrase: 'Je cuisine mieux que je ne danse, mais je danse quand même.', meet: 'tous', ageMin: 28, ageMax: 48, maxKm: 20,
};

export const EMPTY_ME: Me = {
  name: '', birth: '', gender: '', city: '', kids: '', kidsAges: [], situation: '', time: '', intention: 'doucement',
  avail: [], interests: [], traits: [], values: [], phrase: '', meet: 'tous', ageMin: 25, ageMax: 50, maxKm: 25,
};

export function initialState(): AppState {
  return {
    stage: 'welcome', me: { ...EMPTY_ME }, slots: [], liked: [], passed: [], matches: [], blocked: [], reported: [],
    chats: {}, unread: {}, tonight: { on: false, until: 0 },
    settings: { readReceipts: true, showDistance: true, hideFromTonight: false, notifications: false },
  };
}

export const ageFromBirth = (b: string) => {
  if (!b) return 0;
  const d = new Date(b); if (isNaN(+d)) return 0;
  const n = new Date(); let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return a;
};

// --- Compatibilité explicable : on liste les critères réellement remplis, sans pourcentage inventé ---
export interface Reason { key: string; label: string }
export function reasons(me: Me, mySlots: Slot[], p: Profile): Reason[] {
  const r: Reason[] = [];
  if (p.intention === me.intention) r.push({ key: 'int', label: 'Même intention' });
  const common = p.avail.filter((a) => me.avail.includes(a) && a !== 'variable');
  if (common.length) r.push({ key: 'av', label: common.includes('soiree') ? 'Soirées en commun' : common.includes('weekend') ? 'Week-ends en commun' : 'Journées en commun' });
  const ci = p.interests.filter((i) => me.interests.includes(i));
  if (ci.length) r.push({ key: 'ci', label: ci.length === 1 ? `Passion commune : ${ci[0]}` : `${ci.length} passions communes` });
  if (p.km <= me.maxKm) r.push({ key: 'km', label: `À environ ${p.km} km` });
  if (commonSlots(mySlots, p).length) r.push({ key: 'sl', label: 'Créneaux compatibles' });
  return r;
}
export const commonSlots = (mine: Slot[], p: Profile) => p.slots.filter((s) => mine.includes(s));

export function eligible(me: Me, p: Profile): boolean {
  if (p.age < me.ageMin || p.age > me.ageMax) return false;
  if (p.km > me.maxKm) return false;
  if (me.meet === 'femmes' && p.gender !== 'femme') return false;
  if (me.meet === 'hommes' && p.gender !== 'homme') return false;
  return true;
}
