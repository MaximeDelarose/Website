/**
 * Snapchien — contacts (garçons fictifs ADULTES), leurs messages spontanés, légendes de snaps et réponses.
 * Les identifiants sont ceux des profils Tindeur (un même personnage = une seule identité dans tout le téléphone) ; « enzo » n'a pas
 * de profil Tindeur. Personnalités : joker, sport, cool, doux. Tout est humoristique et non explicite.
 */
import type { Look } from '../../../events/tindeur/swipe/types';

export type Style = 'joker' | 'sport' | 'cool' | 'sweet';
export type SceneId = 'mirror' | 'tractor' | 'abs' | 'pose' | 'bath' | 'oops' | 'haircut' | 'sport' | 'funny' | 'selfie';

export interface ChatContact {
  id: string;
  name: string;
  style: Style;
  /** Messages spontanés (au moins 5 par contact : « Tu dors ? », « T'es là ? »…). */
  openers: string[];
  /** Après plusieurs jours sans nouvelles. */
  relances: string[];
  /** Scènes de snaps préférées de ce contact (dans l'ordre de préférence). */
  scenes: SceneId[];
  /** Légende des snaps par scène. */
  captions: Partial<Record<SceneId, string[]>>;
  /** Apparence pour Enzo (les autres sont lus dans les profils Tindeur). */
  look?: Look;
}

export const CONTACTS: ChatContact[] = [
  { id: 'dylan', name: 'Dylan', style: 'sport', scenes: ['mirror', 'abs', 'selfie', 'sport'],
    openers: ['Tu dors ?', 'Alors, ta journée ?', 'Je rentre de la salle, et toi ?', 'Tu fais quoi ce soir ?', 'Attends, je t\'envoie un truc.', 'Dis-moi que t\'es pas encore sur ton téléphone à cette heure.'],
    relances: ['Salut, t\'as disparu ou quoi ?', 'Ça fait un moment… tout va bien ?', 'Je pensais à toi en finissant mon entraînement.', 'Hé, on se reparle ?'],
    captions: { mirror: ['Miroir de la salle, comme d\'hab 💪', 'Séance terminée.', 'Pas mal, non ?'], abs: ['Résultat de 3 mois de sérieux.', 'Dis pas que je n\'ai pas prévenu.'], selfie: ['Petit selfie du matin.', 'Après le sport, tout va mieux.'], sport: ['Course du dimanche.', 'Je t\'emmène la prochaine fois ?'] } },
  { id: 'maxime', name: 'Maxime', style: 'cool', scenes: ['pose', 'selfie', 'mirror', 'funny'],
    openers: ['T\'es réveillée ?', 'Hello toi.', 'Je pensais à un truc drôle, je te raconte ?', 'Ça va ou ça va pas ?', 'Tu me manques un peu, c\'est con.', 'Une photo pour égayer ta journée ?'],
    relances: ['Coucou, ça fait un moment. Tu deviens quoi ?', 'Tu m\'as oublié ?', 'Je repasse dire bonjour, discrètement.', 'Ça te dit de rattraper le temps perdu ?'],
    captions: { pose: ['Je prends la pose, tu valides ?', 'Photographe officiel : moi-même.'], selfie: ['Un sourire pour toi.', 'Mon meilleur profil (j\'en ai deux).'], mirror: ['Miroir, miroir…', 'Sans commentaire.'], funny: ['Mon visage quand tu me réponds enfin.', 'Humeur du jour.'] } },
  { id: 'kevin', name: 'Kevin', style: 'joker', scenes: ['tractor', 'funny', 'selfie', 'oops'],
    openers: ['Wsh t\'es où ?', 'Tu veux voir mon nouveau tracteur ?', 'J\'ai une question très sérieuse : t\'as mangé ?', 'Tu fais quoi là ?', 'Attention, snap exceptionnel en approche.', 'T\'as vu la météo ? Moi oui, j\'ai les récoltes.'],
    relances: ['T\'as disparu, j\'ai failli lancer un avis de recherche.', 'Le tracteur t\'attend toujours.', 'Alors ? On se parle plus ?', 'Coucou, c\'est Kevin, celui du tracteur.'],
    captions: { tractor: ['Mon bébé et moi, torse au soleil.', 'Les récoltes attendent, mais toi aussi.', 'Pose près du tracteur, évidemment.'], funny: ['Ma tête quand je réponds à ton snap.', 'Déjà fatigué à 8 h.'], selfie: ['Selfie dans les champs.', 'Je suis photogénique, non ?'], oops: ['Oups, photo envoyée par erreur. Mais bon.'] } },
  { id: 'thomas', name: 'Thomas', style: 'joker', scenes: ['oops', 'funny', 'selfie', 'bath'],
    openers: ['Tu fais quoi là ?', 'Je sais pas pourquoi, j\'ai repensé à toi aujourd\'hui.', 'Je te dérange ?', 'Question idiote : tu préfères les chats ou les chiens ?', 'T\'as 2 minutes ?', 'Je cherchais mon téléphone… il était dans ma main.'],
    relances: ['Je sais pas pourquoi, j\'ai repensé à toi. Tu deviens quoi ?', 'Salut, ça fait un bail.', 'Je te jure que je pensais t\'écrire plus tôt.', 'T\'es encore là ? Moi oui, malheureusement.'],
    captions: { oops: ['Photo prise « par hasard », promis.', 'Je testais mon appareil. Bon, ça marche.'], funny: ['Mon air sérieux (raté).', 'Je réfléchis à ma vie.'], selfie: ['Selfie sans raison.', 'Je ne sais pas faire de selfie, mais voilà.'], bath: ['Je ne sais pas pourquoi je t\'envoie ça.'] } },
  { id: 'nicolas', name: 'Nicolas', style: 'sport', scenes: ['abs', 'mirror', 'sport', 'selfie'],
    openers: ['Bonne nuit ou t\'es encore debout ?', 'Je reviens de la salle, tu fais quoi ?', 'T\'es du matin ou du soir ?', 'Tu te couches tard, toi.', 'Petit message avant de dormir.', 'J\'ai battu mon record aujourd\'hui, je voulais le dire à quelqu\'un.'],
    relances: ['Ça fait longtemps, un petit bonjour ?', 'Je reviens de la salle et je pense à toi.', 'Toujours en vie de ton côté ?', 'On ne s\'est pas parlé depuis… trop longtemps.'],
    captions: { abs: ['Tu voulais voir les résultats ?', 'Mes abdos te saluent.'], mirror: ['Dans le miroir, comme chaque soir.'], sport: ['Footing de la fin de journée.'], selfie: ['Un selfie, un sourire, bonne nuit.'] } },
  { id: 'jordan', name: 'Jordan', style: 'sport', scenes: ['bath', 'selfie', 'mirror', 'funny'],
    openers: ['T\'as disparu ou quoi ?', 'Je m\'ennuie. Occupe-moi.', 'Pas de nouvelles, bonnes nouvelles ?', 'Tu fais quoi de beau ?', 'J\'ai un truc à te montrer.', 'Allô la Terre ?'],
    relances: ['Alors, t\'as disparu ?', 'Hé, tu m\'as oublié dans tes contacts ?', 'Ça fait des jours… un petit signe ?', 'Je passe voir si tu respires encore.'],
    captions: { bath: ['Salle de bain, lumière parfaite, aucun commentaire.', 'Petit moment de détente.'], selfie: ['Coucou depuis chez moi.'], mirror: ['Reflet du jour.'], funny: ['Moi, quand t\'ouvres mon snap.'] } },
  { id: 'alexandre', name: 'Alexandre', style: 'cool', scenes: ['selfie', 'pose', 'funny', 'mirror'],
    openers: ['T\'es occupée ?', 'Une pause café virtuelle, ça te tente ?', 'Bonsoir, tout va bien ?', 'Je tombe sur une photo de toi dans ma tête, bizarre.', 'T\'as le temps pour une petite discussion ?', 'Dis-moi un truc positif.'],
    relances: ['Tu es devenue très mystérieuse.', 'Je repasse, juste pour te saluer.', 'On pourrait reprendre notre conversation ?', 'Ça fait longtemps. Je suis là si tu veux.'],
    captions: { selfie: ['Un petit coucou.', 'Journée tranquille.'], pose: ['Un peu de style, un peu d\'humour.'], funny: ['Mon humeur du moment.'], mirror: ['Sans filtre.'] } },
  { id: 'lucas', name: 'Lucas', style: 'sweet', scenes: ['selfie', 'funny', 'pose', 'sport'],
    openers: ['Je peux t\'envoyer un truc ?', 'Coucou, j\'ai pensé à toi.', 'Je voulais juste savoir si tu allais bien.', 'Tu as mangé ? Je m\'inquiète pour rien.', 'Petit mot du soir, je ne te dérange pas ?', 'Tu me racontes ta journée ?'],
    relances: ['Salut, ça faisait longtemps. Tu vas bien ?', 'Je repense à notre dernière discussion.', 'Un petit coucou, sans pression.', 'Tu me manques un peu, je l\'avoue.'],
    captions: { selfie: ['Un petit selfie, juste pour te dire bonjour.', 'Je souris, regarde.'], funny: ['Je te promets que j\'ai essayé d\'être sérieux.'], pose: ['Ma tentative de photo cool.'], sport: ['Balade du jour.'] } },
  { id: 'enzo', name: 'Enzo', style: 'joker', scenes: ['haircut', 'funny', 'selfie', 'pose'],
    openers: ['T\'es là ?', 'Devine qui a une nouvelle coupe ?', 'Regarde ce que j\'ai fait.', 'T\'as 30 secondes pour un avis capillaire ?', 'Je me sens beau aujourd\'hui, confirme.', 'Tu me dis si ça me va ?'],
    relances: ['T\'es là ? Je teste ma nouvelle coupe sur les gens.', 'Ça fait longtemps, j\'ai changé de tête depuis.', 'Coucou, c\'est Enzo, celui des coupes.', 'Je reviens avec un nouvel avis à demander.'],
    captions: { haircut: ['Ma nouvelle coupe, avis honnête s\'il te plaît.', 'Coiffeur : 10/10. Moi : 11/10.', 'Oui, je suis torse nu. Non, je ne sais pas pourquoi.'], funny: ['Mon avis sur mon avis.'], selfie: ['Selfie du coiffeur.'], pose: ['Pose de coupe.'] },
    look: { skin: '#E8B48A', hair: 'quiff', hairColor: '#3A2A22', beard: 'stubble', outfit: 'tee', top: '#4C7FD0', glasses: 'none', acc: 'none', mood: 'grin', bg: 'shop', bgc: ['#FFE0C9', '#F1A98A'], prop: 'none', brow: 'up' } },
  { id: 'hugo', name: 'Hugo', style: 'sweet', scenes: ['selfie', 'funny', 'pose', 'sport'],
    openers: ['Ça fait longtemps, tu deviens quoi ?', 'Hello, j\'espère que tu passes une belle journée.', 'Je voulais te dire un truc gentil.', 'Je fais une pause, tu fais quoi ?', 'Alors, quoi de neuf ?', 'Un petit coucou avec un sourire.'],
    relances: ['Ça fait longtemps, tu deviens quoi ?', 'Je pensais à toi, ça fait un moment.', 'Un petit signe de vie de ma part.', 'Tu me racontes tes dernières nouvelles ?'],
    captions: { selfie: ['Un sourire du jour.', 'Petit selfie sans prétention.'], funny: ['Moi quand je réfléchis à quoi te dire.'], pose: ['Une pose, une seule.'], sport: ['Petit tour dehors.'] } },
];
export const contactById = (id: string): ChatContact | undefined => CONTACTS.find((c) => c.id === id);

// ------------------------------------------------------------------ réponses de Radia
export interface ReplyChoice { id: string; text: string; /** réservé aux scènes « torse nu » */ bare?: boolean }
export const REPLIES: ReplyChoice[] = [
  { id: 'tshirt', text: 'Mdr t\'as pas de t-shirt ?', bare: true },
  { id: 'dors', text: 'Tu dors jamais toi ?' },
  { id: 'pourquoi', text: 'Mais pourquoi tu m\'envoies ça ?' },
  { id: 'carrement', text: 'Ah ouais carrément.' },
  { id: 'quoi', text: 'Tu voulais me montrer quoi exactement ?' },
  { id: 'dormir', text: 'Je vais dormir là.' },
  { id: 'nuit', text: 'Bonne nuit !' },
  { id: 'vu', text: 'Vu.' },
];
/** Scènes « torse nu » (illustrations humoristiques, non explicites). */
export const BARE_SCENES: SceneId[] = ['mirror', 'tractor', 'abs', 'pose', 'bath', 'oops', 'haircut'];

/** Réponse du contact à un choix de Radia : 3 variantes par style. */
export const ANSWERS: Record<Style, Record<string, string[]>> = {
  joker: {
    tshirt: ['Il était en lessive, c\'est la vie.', 'Le t-shirt est une construction sociale.', 'Je l\'ai prêté à un ami. Ou perdu. Les deux.'],
    dors: ['Dormir, c\'est pour ceux qui n\'ont pas de snaps à envoyer.', 'Je dors en conduisant le tracteur, c\'est efficace.', 'J\'ai dormi 4 minutes hier, un record.'],
    pourquoi: ['Pour égayer ta journée, évidemment.', 'Je voulais ton avis de professionnelle.', 'Aucune raison. C\'est ça qui est beau.'],
    carrement: ['Je sais, je sais, tu me remercieras plus tard.', 'Merci, je note : « carrément ».', 'Ça, c\'est le meilleur compliment du mois.'],
    quoi: ['Ma bonne humeur, principalement.', 'Mon style. Et accessoirement mes abdos.', 'Je ne sais pas, j\'ai appuyé sur envoyer.'],
    dormir: ['Allez, bonne nuit, fais de beaux rêves où je suis drôle.', 'Dors bien, je veille sur tes notifications.', 'OK, je te laisse. Mais je repasserai.'],
    nuit: ['Bonne nuit ! Rêve de tracteurs.', 'Bonne nuit, ma reine des réponses courtes.', 'Dors bien, à demain pour de nouvelles aventures.'],
    vu: ['« Vu ». Direct. Impitoyable. J\'adore.', 'Un « vu » ? Je vais le faire encadrer.', 'Je prends ça pour un compliment.'],
  },
  sport: {
    tshirt: ['Trop chaud à la salle, il a fondu.', 'Il est au sec-linge, avec mon honneur.', 'Je m\'économise le linge, c\'est écolo.'],
    dors: ['Le sommeil, c\'est pour la récupération. Je récupère en m\'entraînant.', 'Je dors 6 h, le reste, c\'est du sport.', 'Je dors quand je veux, surtout après le shaker.'],
    pourquoi: ['Pour te motiver.', 'Je voulais ton avis sur ma progression.', 'Tu m\'as demandé des nouvelles, voilà des nouvelles.'],
    carrement: ['Merci, ça fait plaisir.', 'Tu as l\'œil, toi.', 'Je prends. Je prends tout.'],
    quoi: ['Mes progrès, rien de plus.', 'Le résultat de la discipline.', 'Que je pense à toi, entre deux séries.'],
    dormir: ['Dors bien, il faut récupérer.', 'Bonne nuit, moi je termine mes étirements.', 'OK, à demain pour la suite.'],
    nuit: ['Bonne nuit, repose-toi bien.', 'Bonne nuit, et pense à t\'hydrater.', 'Dors bien, demain on recommence.'],
    vu: ['Vu ? Ça veut dire que ça te plaît.', 'Un vu, ça se mérite.', 'Je vais prendre ça comme un encouragement.'],
  },
  cool: {
    tshirt: ['Je suis en mode détente, c\'est tout.', 'Il fait chaud chez moi. Voilà.', 'Je préfère ne pas commenter.'],
    dors: ['Je suis un oiseau de nuit, que veux-tu.', 'Le sommeil, ça se rattrape.', 'Je dors vite. C\'est un talent.'],
    pourquoi: ['Comme ça, pour le plaisir.', 'J\'avais envie de te voir sourire.', 'Une photo vaut mille mots.'],
    carrement: ['J\'avoue, merci.', 'Content que ça te plaise.', 'Tu as bon goût.'],
    quoi: ['Rien de particulier, juste moi.', 'Un instant de ma journée.', 'Un petit moment partagé.'],
    dormir: ['Bonne nuit alors, à bientôt.', 'Dors bien, on se parle demain.', 'OK, je te laisse tranquille.'],
    nuit: ['Bonne nuit, belle étoile.', 'Bonne nuit, fais de beaux rêves.', 'Bonne nuit, à demain.'],
    vu: ['Vu, reçu, noté.', 'Ça me va très bien comme réponse.', 'Un vu, c\'est déjà une victoire.'],
  },
  sweet: {
    tshirt: ['Ahah, oui, j\'avoue, c\'était pas prévu.', 'Je suis un peu gêné maintenant…', 'Oups, je n\'avais pas fait attention !'],
    dors: ['Je m\'endors en pensant à des choses agréables.', 'Je dors peu quand j\'ai envie de discuter.', 'Un peu trop peu, tu as raison.'],
    pourquoi: ['Je voulais te faire sourire.', 'Parce que ça me faisait plaisir.', 'Je ne sais pas, une envie gentille.'],
    carrement: ['Merci, ça me touche.', 'Ah, ça me fait plaisir à lire.', 'Tu es gentille.'],
    quoi: ['Juste un petit bonjour en image.', 'Un moment de ma journée avec toi.', 'Moi, tout simplement.'],
    dormir: ['Dors bien alors, à demain.', 'Fais de beaux rêves.', 'Repose-toi bien, je t\'embrasse… virtuellement.'],
    nuit: ['Bonne nuit, fais de beaux rêves ♡', 'Bonne nuit, à demain.', 'Dors bien, prends soin de toi.'],
    vu: ['Vu ? Je l\'espère bien, ahah.', 'Merci d\'avoir regardé.', 'Ça me fait déjà plaisir.'],
  },
};
/** Réaction aux snaps de Radia (réciproque) : le contact répond par un snap + une phrase. */
export const SNAP_BACK: Record<Style, string[]> = {
  joker: ['Ah mais tu me réponds avec un snap, je suis honoré !', 'Réponse en image reçue. Je la garde pour la postérité.', 'Mon snap préféré de la semaine.'],
  sport: ['Snap reçu, merci !', 'Belle photo, bien joué.', 'Tu gères. Voilà ma réponse en image.'],
  cool: ['Joli. Voilà le mien.', 'Merci pour ce snap, je souris.', 'Snap pour snap, c\'est équitable.'],
  sweet: ['Merci pour ton snap, ça me fait plaisir ♡', 'Ton snap m\'a fait sourire, voilà le mien.', 'Oh, merci d\'avoir pensé à moi !'],
};
