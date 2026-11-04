/**
 * RADIA Clips : générateur DÉTERMINISTE de petites vidéos fictives (aucun DOM, aucune vraie vidéo, aucune marque).
 * Un « clip » = un modèle de scène (dessinée en Canvas 2D par scenes.ts) + des variantes tirées d'une graine :
 * légende, hashtags, son visuel, auteur fictif adulte, teinte, durée de boucle, compteurs fictifs, commentaires.
 * Le fil est une suite infinie de blocs mélangés : jamais deux fois le même modèle ni la même scène d'affilée.
 */
import { hash, rng, pick, pickN, shuffle } from '../util';

export type SceneKind = 'show' | 'duo' | 'twirl' | 'cat' | 'bloom' | 'choc' | 'decor' | 'fans' | 'meme' | 'dress' | 'still';
export type Topic = 'carriere' | 'sortie' | 'tenues' | 'chat' | 'fleurs' | 'chocolat' | 'chateau' | 'humour' | 'photo' | 'fans';

/** Paramètres d'une scène (valeurs simples, sérialisables dans la sauvegarde). */
export interface SceneSpec {
  k: SceneKind;
  place?: string;
  pose?: number;
  mode?: string;
  /** Éléments à montrer (fleurs, chocolats, meubles, robes) séparés par des virgules. */
  items?: string;
  catPose?: string;
  line?: string;
  pal?: number;
  /** Identifiant d'une photo de l'album (scène « still »). */
  photo?: string;
  filter?: string;
  frame?: string;
}

export interface ClipTemplate { id: string; topic: Topic; title: string; scene: SceneSpec; tags: string[] }

const T = (id: string, topic: Topic, title: string, scene: SceneSpec, tags: string[]): ClipTemplate => ({ id, topic, title, scene, tags });

/** 44 modèles de base (≥ 30 demandés). Les scènes sont animées en boucle de 3 à 6 s. */
export const TEMPLATES: ClipTemplate[] = [
  // carrière
  T('show-catwalk', 'carriere', 'Défilé : les projecteurs', { k: 'show', place: 'stage', mode: 'catwalk' }, ['défilé', 'podium']),
  T('show-lastturn', 'carriere', 'Dernier tour de piste', { k: 'show', place: 'stage', mode: 'catwalk', pal: 1 }, ['défilé', 'dernierlook']),
  T('show-concert', 'carriere', 'Concert : le refrain', { k: 'show', place: 'stage', mode: 'concert' }, ['concert', 'scène']),
  T('show-encore', 'carriere', 'Rappel sous les lumières', { k: 'show', place: 'stage', mode: 'concert', pal: 2 }, ['concert', 'rappel']),
  T('show-curtain', 'carriere', 'Le rideau se lève', { k: 'show', place: 'stage', mode: 'scene' }, ['théâtre', 'scène']),
  T('shoot-trio', 'photo', 'Séance photo : trois poses', { k: 'duo', place: 'studio', pose: 6, mode: 'flash' }, ['shooting', 'studio']),
  T('shoot-solo', 'photo', 'Shooting en solo', { k: 'twirl', place: 'studio', mode: 'flash' }, ['shooting', 'solo']),
  // sorties à deux
  T('duo-rooftop', 'sortie', 'Rooftop au coucher du soleil', { k: 'duo', place: 'rooftop', pose: 8 }, ['rooftop', 'coucherdesoleil']),
  T('duo-fireworks', 'sortie', 'Feu d’artifice à deux', { k: 'duo', place: 'fireworks', pose: 2 }, ['feudartifice', 'nuit']),
  T('duo-dinner', 'sortie', 'Dîner aux chandelles', { k: 'duo', place: 'restaurant', pose: 4 }, ['dîner', 'chandelles']),
  T('duo-palace', 'sortie', 'Escalier du palace', { k: 'duo', place: 'palace', pose: 10 }, ['palace', 'élégance']),
  T('duo-fountain', 'sortie', 'Devant la fontaine', { k: 'duo', place: 'fountain', pose: 7 }, ['fontaine', 'balade']),
  T('duo-ballroom', 'sortie', 'Valse dans la salle de bal', { k: 'duo', place: 'ballroom', pose: 5 }, ['bal', 'valse']),
  T('duo-cinema', 'sortie', 'Soirée cinéma privé', { k: 'duo', place: 'cinema', pose: 4 }, ['cinéma', 'soirée']),
  T('duo-hello', 'sortie', 'Coucou de loin', { k: 'duo', place: 'garden', pose: 3 }, ['coucou', 'jardin']),
  // tenues
  T('twirl-boutique', 'tenues', 'Essayage en boutique', { k: 'twirl', place: 'boutique' }, ['essayage', 'boutique']),
  T('twirl-garden', 'tenues', 'Tourbillon dans le jardin', { k: 'twirl', place: 'garden' }, ['jardin', 'robe']),
  T('twirl-hotel', 'tenues', 'Un tour dans la suite', { k: 'twirl', place: 'hotel' }, ['suite', 'look']),
  T('twirl-pajama', 'tenues', 'Soirée pyjama', { k: 'twirl', place: 'pajama' }, ['pyjama', 'cocooning']),
  T('dress-gala', 'tenues', 'Collection soirée', { k: 'dress', items: 'dr-redcarpet,dr-emerald-evening,dr-royal-gown,dr-satin-champagne', place: 'ballroom' }, ['collection', 'gala']),
  T('dress-sweet', 'tenues', 'Collection douceur', { k: 'dress', items: 'dr-romantic-pink,dr-lavender-tulle,dr-white-gown,dr-flowy-floral', place: 'garden' }, ['collection', 'pastel']),
  T('dress-day', 'tenues', 'Collection de jour', { k: 'dress', items: 'dr-sundress-yellow,dr-gingham-red,dr-sage-linen,dr-striped-navy', place: 'flowerMarket' }, ['lookdujour', 'soleil']),
  // chat
  T('cat-play', 'chat', 'Le chat et la balle', { k: 'cat', place: 'home', catPose: 'play' }, ['chat', 'jeu']),
  T('cat-sleep', 'chat', 'Sieste du chat', { k: 'cat', place: 'pajama', catPose: 'sleep' }, ['chat', 'sieste']),
  T('cat-purr', 'chat', 'Ronron garanti', { k: 'cat', place: 'home', catPose: 'purr' }, ['chat', 'ronron']),
  T('cat-eat', 'chat', 'Gourmand du château', { k: 'cat', place: 'restaurant', catPose: 'eat' }, ['chat', 'gourmand']),
  T('cat-garden', 'chat', 'Étirement au jardin', { k: 'cat', place: 'garden', catPose: 'stretch' }, ['chat', 'jardin']),
  // fleurs
  T('bloom-rose', 'fleurs', 'Une rose éclot', { k: 'bloom', items: 'rose', place: 'garden' }, ['rose', 'éclosion']),
  T('bloom-tulip', 'fleurs', 'Tulipes en accéléré', { k: 'bloom', items: 'tulip,daisy', place: 'flowerMarket' }, ['tulipe', 'timelapse']),
  T('bloom-lavender', 'fleurs', 'Lavande et pivoine', { k: 'bloom', items: 'lavender,peony', place: 'garden' }, ['lavande', 'parfum']),
  T('bloom-magic', 'fleurs', 'La fleur magique', { k: 'bloom', items: 'magic', place: 'garden', pal: 3 }, ['fleurmagique', 'féerie']),
  T('bloom-sun', 'fleurs', 'Tournesols au soleil', { k: 'bloom', items: 'sunflower,lily', place: 'garden', pal: 1 }, ['tournesol', 'été']),
  // chocolat
  T('choc-rain', 'chocolat', 'Pluie de chocolats', { k: 'choc', items: 'milk,dark,praline,truffle' }, ['chocolat', 'gourmandise']),
  T('choc-box', 'chocolat', 'La boîte parfaite', { k: 'choc', items: 'heart,white,hazelnut,royalbox', pal: 1 }, ['chocolaterie', 'coffret']),
  T('choc-heart', 'chocolat', 'Un chocolat en cœur', { k: 'choc', items: 'heart,heart,truffle', pal: 2 }, ['cœur', 'chocolat']),
  // château
  T('decor-salon', 'chateau', 'Un coin salon tout doux', { k: 'decor', items: 'sofa,rug-round,lamp-floor,plant-pot' }, ['château', 'déco']),
  T('decor-chambre', 'chateau', 'La chambre royale', { k: 'decor', items: 'bed-royal,nightstand,lamp-table,vanity', pal: 1 }, ['chambre', 'déco']),
  T('decor-reception', 'chateau', 'Réception de gala', { k: 'decor', items: 'chandelier,red-carpet,banquet-table,flower-vase', pal: 2 }, ['réception', 'château']),
  T('decor-jardin', 'chateau', 'Pergola fleurie', { k: 'decor', items: 'pergola,bench,fountain,flowerbed', pal: 3 }, ['jardin', 'pergola']),
  // fans
  T('fans-count', 'fans', 'Les fans arrivent', { k: 'fans', line: 'Merci à tous ♡' }, ['merci', 'fans']),
  T('fans-hearts', 'fans', 'Pluie de cœurs', { k: 'fans', line: 'Vous êtes adorables', pal: 1 }, ['cœurs', 'merci']),
  // humour
  T('meme-cat', 'humour', 'Auguste contre le chat', { k: 'meme', line: 'Le chat a décidé que le fauteuil est à lui.|Auguste : « On négocie ? »|Le chat : « Non. »' }, ['humour', 'chat']),
  T('meme-ready', 'humour', '5 minutes pour se préparer', { k: 'meme', line: 'Auguste : « Prête dans 5 minutes ? »|Radia : « Bien sûr. »|(Trois tenues plus tard…)', pal: 1 }, ['humour', 'préparatifs']),
  T('meme-budget', 'humour', 'Le budget dressing', { k: 'meme', line: 'Auguste regarde son budget…|Auguste regarde la robe…|Auguste : « Elle te va trop bien. »', pal: 2 }, ['humour', 'budget']),
  T('meme-gps', 'humour', 'Le sens de l’orientation', { k: 'meme', line: 'Auguste : « C’est par là. »|Radia : « Tu es sûr ? »|Auguste : « Non. »', pal: 3 }, ['humour', 'balade']),
];

// ---------------------------------------------------------------- bibliothèques de textes (français, positifs)
const CAPTIONS: Record<Topic, string[]> = {
  carriere: ['Les projecteurs, les sourires, et un cœur qui bat fort ♡', 'Une soirée qui restera dans les souvenirs.', 'Merci d’être venus, vous êtes magiques.', 'On respire, on sourit, on y va !', 'Les coulisses sentent déjà la victoire.', 'Chaque pas compte, même sur un podium.'],
  sortie: ['À deux, tout est plus joli.', 'Un petit moment rien qu’à nous.', 'La plus belle vue, c’est celle-là.', 'Souvenir du soir, gardé précieusement ♡', 'Ce genre de soirée qu’on voudrait refaire demain.', 'Pas besoin de grand-chose quand on rit ensemble.'],
  tenues: ['Nouveau look, nouvelle humeur !', 'Je tourne, je tourne… vous aimez ?', 'Le secret : un peu de paillettes.', 'Elle m’a fait de l’œil dès la vitrine.', 'Les tenues, c’est comme les chansons : à chacune son moment.', 'Quel look choisir ? Dites-moi tout ♡'],
  chat: ['Le vrai patron de la maison.', 'Il dit qu’il ne dort pas. Il dort.', 'Ronron niveau maximum.', 'Chat : 1. Humains : 0.', 'Regardez cette moustache en pleine forme !', 'Le château a un nouveau maître.'],
  fleurs: ['Les fleurs du jardin ont du caractère.', 'On les arrose, elles nous remercient.', 'Un petit miracle, pétale après pétale.', 'Ça sent bon jusqu’à la fenêtre.', 'Le jardin fait son show.', 'Prête pour le bouquet de la semaine.'],
  chocolat: ['Dégustation ouverte, tout est permis.', 'Fondant à l’extérieur, tendre à l’intérieur.', 'La chocolaterie royale ne chôme pas.', 'Un chocolat pour chaque humeur.', 'On goûte « pour vérifier ». Encore.', 'Le coffret de la semaine est prêt !'],
  chateau: ['Petit tour du propriétaire.', 'On a changé deux coussins, tout est différent.', 'Chaque pièce raconte quelque chose.', 'Un coin tout doux pour finir la journée.', 'Le château se met sur son 31.', 'Déco du jour : plus de lumière, plus de cœur.'],
  humour: ['Toute ressemblance avec un adulte réel est fortuite.', 'Je ne dis rien, mais je pense fort.', 'Ça commence toujours bien…', 'La vie de couple en 15 secondes.', 'Vous aussi ? Dites-moi que oui.', 'Épisode 12 : on ne change rien.'],
  photo: ['Flash, sourire, et c’est dans la boîte !', 'Trois poses, une seule réussie. Laquelle ?', 'Le photographe a dit : « Encore un ! »', 'Souvenir pris sur le vif.', 'Mon cadre préféré du moment.', 'Un petit clic, un grand sourire.'],
  fans: ['Merci pour tout cet amour ♡', 'Vous êtes de plus en plus nombreux, je suis émue.', 'Une pluie de cœurs rien que pour vous.', 'Votre gentillesse fait ma journée.', 'On fête ça comme il se doit !'],
};
const TAGS_GENERAL = ['radia', 'romantique', 'pourvous', 'bonnehumeur', 'douceur', 'souvenir', 'cœur', 'féerie', 'pastel', 'ensemble', 'magie', 'tendresse'];
export const SOUNDS = ['Boucle Pétale', 'Valse du matin', 'Cœur de velours', 'Pas de velours', 'Lumière douce', 'Rooftop rose', 'Piano de minuit', 'Ukulélé citron', 'Clair de plume', 'Étoile filante', 'Tempo caramel', 'Brise de jardin', 'Souvenirs d’été', 'Chuchotis sucrés'];
/** Créateurs fictifs ADULTES (pseudonymes imaginaires). */
export const AUTHORS: { handle: string; name: string; hue: number }[] = [
  { handle: 'lila.petale', name: 'Lila', hue: 330 }, { handle: 'maison.nour', name: 'Nour', hue: 20 }, { handle: 'chef.ambre', name: 'Ambre', hue: 40 },
  { handle: 'theo.coulisses', name: 'Théo', hue: 210 }, { handle: 'jardin.camille', name: 'Camille', hue: 130 }, { handle: 'studio.iris', name: 'Iris', hue: 280 },
  { handle: 'mira.danse', name: 'Mira', hue: 350 }, { handle: 'chaton.club', name: 'Le Club du Chat', hue: 30 }, { handle: 'gaspard.humour', name: 'Gaspard', hue: 190 },
  { handle: 'rose.atelier', name: 'Rose', hue: 340 }, { handle: 'cacao.lou', name: 'Lou', hue: 25 }, { handle: 'victor.deco', name: 'Victor', hue: 160 },
  { handle: 'zoe.paillettes', name: 'Zoé', hue: 300 }, { handle: 'nina.scene', name: 'Nina', hue: 255 },
];

const COMMENTS_BY_TOPIC: Record<Topic, string[]> = {
  carriere: ['Quelle présence sur scène !', 'Standing ovation depuis mon canapé 👏', 'Les lumières sont magnifiques.', 'On veut le rappel !', 'Cette démarche… je prends des notes.', 'La classe absolue.', 'Je fais exprès de remettre en boucle.'],
  sortie: ['Quel joli couple ♡', 'Cette lumière est un rêve.', 'Je veux la même soirée !', 'Vous avez l’air tellement bien ensemble.', 'Le décor est sublime.', 'Ça donne envie de réserver une table.', 'Les plus beaux sourires du fil.'],
  tenues: ['Cette tenue, un coup de cœur !', 'Je veux la même, tout de suite.', 'Tu devrais ouvrir ta boutique.', 'La robe qui tourne… parfait.', 'Le choix est impossible, les trois !', 'Quelle élégance.', 'Les couleurs sont superbes.'],
  chat: ['Ce chat est une star.', 'Je fonds. Littéralement.', 'Il a tout compris à la vie.', 'Un câlin virtuel pour lui !', 'Le ronron, je l’entends d’ici.', 'Roi du château, évidemment.', 'Trop mignon, je regarde en boucle.'],
  fleurs: ['Les couleurs sont magnifiques !', 'Ça donne envie de jardiner.', 'Cette fleur est un petit miracle.', 'Je sens presque le parfum.', 'Quel talent de jardinière.', 'Le bouquet de demain, je le veux.', 'Tellement apaisant.'],
  chocolat: ['J’ai faim maintenant, merci.', 'Dégustation à distance : validée.', 'Le dernier est pour moi ?', 'Ça a l’air fondant à souhait.', 'La boîte est magnifique.', 'Je prends le truffé.', 'Toi, tu sais faire plaisir.'],
  chateau: ['Quelle belle décoration !', 'Ce salon est parfait.', 'Je veux emménager.', 'Les lumières font tout.', 'Un vrai petit palais.', 'Super idée de disposition.', 'Le tapis rond, grand classique.'],
  humour: ['Je suis morte de rire 😂', 'Auguste, courage.', 'Tellement vrai.', 'Mon couple en une vidéo.', 'La chute est parfaite.', 'Ça m’a fait ma journée.', 'On veut la suite !'],
  photo: ['Superbe cadrage !', 'La pose du milieu, sans hésiter.', 'Le flash fait tout.', 'Quelle belle lumière.', 'Vous êtes photogéniques tous les deux.', 'Un souvenir qui vaut de l’or.', 'Je mets en fond d’écran.'],
  fans: ['On t’adore !', 'Bravo pour tout ce chemin.', 'Merci à toi pour ces jolies vidéos.', 'Les cœurs arrivent par milliers ♡', 'Tu le mérites tellement.', 'Continue, c’est magnifique.', 'Une pluie d’amour pour toi.'],
};
export const COMMENTS_GENERAL = ['Magnifique ♡', 'J’adore cette ambiance.', 'Tellement doux.', 'Je regarde ça en boucle.', 'Bravo, c’est superbe !', 'Ça met de bonne humeur.', 'Quelle jolie vidéo.', 'Merci pour ce moment !', 'Vous êtes adorables.', 'Mon coup de cœur du jour.', 'On en veut d’autres !', 'Ça fait du bien de voir ça.', 'Trop beau pour être vrai.', 'La musique est parfaite avec.', 'J’ai le sourire jusqu’aux oreilles.', 'Partagé à toute ma famille imaginaire 😄', 'Cinq étoiles.', 'Je tombe amoureuse de ce fil.'];
const COMMENT_AUTHORS = ['lila.petale', 'maison.nour', 'theo.coulisses', 'jardin.camille', 'studio.iris', 'mira.danse', 'gaspard.humour', 'rose.atelier', 'cacao.lou', 'victor.deco', 'zoe.paillettes', 'nina.scene', 'sam.promenade', 'clara.lune', 'hugo.cuisine', 'julie.ciel', 'leo.vinyle', 'manon.thé', 'adam.bricole', 'eve.ruban'];

export interface FakeComment { by: string; text: string }
export interface Clip {
  id: string; tpl: string; topic: Topic; by: string; name: string; hue: number;
  title: string; caption: string; tags: string[]; sound: string; scene: SceneSpec; dur: number;
  likes: number; comments: number; mine?: boolean; at?: number;
}

/** Commentaires fictifs (déterministes) pour un clip : 3 à 6, positifs ou drôles, adaptés au sujet. */
export function commentsFor(clipId: string, topic: Topic, n?: number): FakeComment[] {
  const r = rng(hash('cm' + clipId));
  const count = n ?? 3 + Math.floor(r() * 4);
  const pool = [...COMMENTS_BY_TOPIC[topic], ...COMMENTS_BY_TOPIC[topic], ...COMMENTS_GENERAL];
  const texts = pickN(Array.from(new Set(pool)), count, r);
  const by = pickN(COMMENT_AUTHORS, count, r);
  return texts.map((text, i) => ({ by: by[i], text }));
}

// ---------------------------------------------------------------- fil infini
/** Range une liste pour qu'aucune scène ne se répète deux fois d'affilée (glouton, déterministe). */
export function arrange(list: ClipTemplate[], prev: ClipTemplate | null): ClipTemplate[] {
  const left = list.slice();
  const out: ClipTemplate[] = [];
  let last = prev;
  while (left.length) {
    const count = new Map<string, number>();
    for (const t of left) count.set(t.scene.k, (count.get(t.scene.k) ?? 0) + 1);
    // on prend d'abord dans la scène la plus fréquente restante (hors scène précédente) : jamais de répétition tant que c'est faisable
    let best = -1, bestN = -1;
    left.forEach((t, i) => {
      if (last && (t.scene.k === last.scene.k || t.id === last.id)) return;
      const n = count.get(t.scene.k) ?? 0;
      if (n > bestN) { best = i; bestN = n; }
    });
    if (best < 0) best = 0;
    const [t] = left.splice(best, 1);
    out.push(t); last = t;
  }
  return out;
}
const blockCache = new Map<string, ClipTemplate[]>();
/** Bloc `b` du fil de graine `seed` : tous les modèles une fois, mélangés et rangés ; le raccord avec le bloc précédent est garanti. */
export function block(seed: number, b: number): ClipTemplate[] {
  const key = `${seed}:${b}`;
  const hit = blockCache.get(key);
  if (hit) return hit;
  const prev = b > 0 ? block(seed, b - 1) : null;
  const out = arrange(shuffle(TEMPLATES, rng(hash(`blk${seed}.${b}`))), prev ? prev[prev.length - 1] : null);
  if (blockCache.size > 40) blockCache.delete(blockCache.keys().next().value as string);
  blockCache.set(key, out);
  return out;
}
export const templateAt = (seed: number, n: number): ClipTemplate => block(seed, Math.floor(n / TEMPLATES.length))[n % TEMPLATES.length];

export const genId = (seed: number, n: number): string => `g${(seed >>> 0).toString(36)}.${n}`;
export function parseGenId(id: string): { seed: number; n: number } | null {
  const m = /^g([0-9a-z]+)\.(\d{1,6})$/.exec(id);
  return m ? { seed: parseInt(m[1], 36) >>> 0, n: +m[2] } : null;
}

/** Clip n° `n` du fil de graine `seed` (toujours identique pour les mêmes arguments). */
export function genClip(seed: number, n: number): Clip {
  const t = templateAt(seed, n);
  const id = genId(seed, n);
  const r = rng(hash(`${id}|${t.id}`));
  const au = pick(AUTHORS, r);
  const tags = ['radia', ...t.tags, ...pickN(TAGS_GENERAL.filter((x) => !t.tags.includes(x) && x !== 'radia'), 2, r)].slice(0, 5);
  const scene: SceneSpec = { ...t.scene, pal: t.scene.pal ?? Math.floor(r() * 4) };
  return {
    id, tpl: t.id, topic: t.topic, by: au.handle, name: au.name, hue: au.hue, title: t.title,
    caption: pick(CAPTIONS[t.topic], r), tags, sound: pick(SOUNDS, r), scene,
    dur: Math.round((3 + r() * 3) * 2) / 2, likes: 40 + Math.floor(r() * r() * 52000), comments: 2 + Math.floor(r() * r() * 380),
  };
}

/** Palette de la scène (4 variantes de teinte). */
export const PALETTES: [string, string, string][] = [['#ffd7e6', '#ff9cc2', '#b07cff'], ['#ffe8c2', '#ffb27a', '#ff6f9f'], ['#d9ecff', '#8fb6f0', '#7c5cc4'], ['#e0f6dd', '#8fd6a6', '#f3c86b']];

export const FEED_CAPTIONS = CAPTIONS;
export const SCENE_KINDS: SceneKind[] = ['show', 'duo', 'twirl', 'cat', 'bloom', 'choc', 'decor', 'fans', 'meme', 'dress', 'still'];
