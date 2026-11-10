/**
 * Banques de répliques communes (écrites à la main) : réactions courtes, famille, amitié homme-femme, prénom, demandes de photo, relances.
 * Trois « voix » partagent ces banques (chaleureuse, taquine, posée) ; chaque personnage ajoute ses propres lignes (personas.ts).
 * `{n}` = le prénom de Radia (« Radia »). Aucune demande de photo intime : sourire, yeux, tenue du jour, selfie amusant seulement.
 */
import type { Arch } from './types';

import { PARTNER } from '../../config/gift';
export type Voice = 'warm' | 'play' | 'cool';
export const voiceOf = (a: Arch): Voice => (a === 'gentle' || a === 'shy' || a === 'serious' ? 'warm' : a === 'chill' || a === 'skeptic' ? 'cool' : 'play');
export type VBank = Record<Voice, string[]>;

// ------------------------------------------------------------------ réponses de Radia (le joueur ne tape jamais : il choisit)
export interface ChoiceDef { id: string; text: string; kind: 'banter' | 'share' | 'react' | 'photo' | 'limit' | 'debate' | 'single' }
export const CHOICES: ChoiceDef[] = [
  { id: 'lol', text: 'Mdrrr', kind: 'banter' }, { id: 'jure', text: 'Jure ??', kind: 'banter' }, { id: 'raconte', text: 'Attends, raconte !', kind: 'banter' },
  { id: 'tease', text: 'T\'es grave toi 😂', kind: 'banter' }, { id: 'same', text: 'Ah ouais, moi aussi !', kind: 'banter' }, { id: 'day', text: 'Et toi, ta journée ?', kind: 'banter' },
  { id: 'nul', text: 'Mdr c\'était nul', kind: 'react' }, { id: 'bravo', text: 'Haha pas mal', kind: 'react' }, { id: 'stopname', text: 'Arrête avec mon prénom 😅', kind: 'react' },
  { id: 'kids_all', text: 'Je suis divorcée et j\'ai trois enfants', kind: 'share' }, { id: 'kids_some', text: 'J\'ai des enfants, oui', kind: 'share' }, { id: 'kids_no', text: 'Je préfère ne pas en parler pour l\'instant', kind: 'limit' },
  { id: 'friends_only', text: 'Je cherche surtout des amis ici', kind: 'share' }, { id: 'friends_unsure', text: 'Je ne sais pas trop ce que je cherche', kind: 'share' },
  { id: 'kid_time', text: 'Du temps pour moi ? Presque jamais 😅', kind: 'react' }, { id: 'kid_proud', text: 'Ils sont ma plus belle fierté', kind: 'react' }, { id: 'kid_ok', text: 'Je comprends, merci d\'être honnête', kind: 'react' },
  { id: 'kid_hurt', text: 'Ça me fait un peu de peine, mais ok', kind: 'react' }, { id: 'kid_joke', text: 'T\'inquiète, ils ne mordent presque pas', kind: 'react' },
  { id: 'fr_yes', text: 'Si, je crois à l\'amitié homme-femme', kind: 'debate' }, { id: 'fr_no', text: 'Pas vraiment, mais j\'aimerais essayer', kind: 'debate' },
  { id: 'fr_him', text: 'Et toi, tu y crois ?', kind: 'debate' }, { id: 'fr_joke', text: 'J\'ai déjà assez de copains jaloux 😂', kind: 'debate' },
  { id: 'fr_open', text: 'On verra comment ça se passe', kind: 'debate' }, { id: 'fr_clear', text: 'Je te le dis franchement : amis, c\'est tout', kind: 'limit' },
  { id: 'fr_why', text: 'Pourquoi pas être amis, tout simplement ?', kind: 'debate' },
  { id: 'ph_smile', text: 'Un sourire, tiens', kind: 'photo' }, { id: 'ph_outfit', text: 'Ma tenue du jour', kind: 'photo' }, { id: 'ph_funny', text: 'Une grimace en échange', kind: 'photo' },
  { id: 'ph_later', text: 'Pas ce soir, peut-être plus tard', kind: 'photo' }, { id: 'ph_no', text: 'Non, je préfère ne pas envoyer de photo', kind: 'limit' },
  { id: 'ph_tease', text: 'Mystère ✨', kind: 'photo' }, { id: 'ph_first', text: 'D\'accord si tu envoies le tien d\'abord', kind: 'photo' },
  { id: 'sg_yes', text: 'Oui, on reste en contact', kind: 'single' }, { id: 'sg_complex', text: 'C\'est compliqué', kind: 'single' }, { id: 'sg_none', text: 'Ça ne te regarde pas 😄', kind: 'single' },
  { id: 'sg_single', text: 'Je suis célibataire, oui', kind: 'single' },
  { id: 'sf_ask', text: 'Alors, raconte cette photo !', kind: 'banter' },
];
export const choiceById = (id: string): ChoiceDef | undefined => CHOICES.find((c) => c.id === id);

// ------------------------------------------------------------------ réactions courtes (spontanées)
export const REACT: Record<'lol' | 'jure' | 'raconte' | 'tease' | 'same' | 'day', VBank> = {
  lol: { warm: ['Ça me fait plaisir de te faire rire.', 'Ton rire, je l\'imagine, et ça me suffit.', 'Ah, ça me rend heureux que ça te fasse sourire.', 'Merci, j\'avais besoin de ça aujourd\'hui.'],
         play: ['Mdrrrr, je savais que j\'allais te faire craquer.', 'Note : j\'ai fait rire Radia. Journée gagnée.', 'Haha, encore un point pour moi !', 'Là, je suis officiellement le roi de la soirée.'],
         cool: ['Ça fait toujours plaisir.', 'Je prends ça comme un compliment.', 'Content que ça passe.', 'Tu as le rire facile, j\'aime ça.'] },
  jure: { warm: ['Je te le jure, promis.', 'Oui, vraiment, je ne plaisante pas.', 'Parole d\'honneur.', 'Tout à fait, je te le promets.'],
          play: ['Je te jure sur ma vie. Ou presque.', 'Jure, jure, jure ! Sur le tracteur de mon voisin.', 'Je te jure, je te jure, je te jure. T\'as vu comme je suis crédible ?', 'Promis juré, même cracher je peux.'],
          cool: ['Sincèrement, oui.', 'Je ne dis jamais ça pour rien.', 'À peu près. Enfin, oui, jure.', 'Je ne plaisante pas, tu vois.'] },
  raconte: { warm: ['D\'accord, je te raconte, mais promets-moi de ne pas te moquer.', 'Ah, c\'est gentil de demander. Alors voilà.', 'Si tu veux vraiment savoir…', 'Je te le raconte avec plaisir.'],
             play: ['Attends, installe-toi, c\'est un feuilleton.', 'Bon, tu l\'auras voulu. Alors voilà.', 'Ok, ok, je lâche l\'info.', 'Prépare le popcorn, je raconte.'],
             cool: ['Alors, laisse-moi t\'expliquer.', 'Ça va te faire sourire, je crois.', 'Voilà l\'histoire.', 'Bon, je me lance.'] },
  tease: { warm: ['Oh, je prends ça comme un compliment, j\'espère.', 'Ahah, tu as raison, un peu.', 'Je ne m\'en défends même pas.', 'Tu me connais bien déjà.'],
           play: ['Mais t\'es grave toi aussi, on est deux !', 'Je plaide coupable avec honneur.', 'Je suis grave, mais charmant.', 'Je te retourne le compliment, avec des intérêts.'],
           cool: ['Peut-être, peut-être pas.', 'Je prends ça avec le sourire.', 'On m\'a déjà dit ça, souvent.', 'Je ne dirai ni oui ni non.'] },
  same: { warm: ['Ah, toi aussi ? Ça me fait vraiment plaisir.', 'C\'est drôle, on a un point commun alors.', 'Je suis content qu\'on se ressemble sur ça.', 'Ah bah ça, c\'est une bonne nouvelle.'],
          play: ['Ah ouais toi aussi ??? Mais c\'est pas possible !', 'Jure ??? On a un point commun alors, ça se fête.', 'Ah bah on a un point commun, alors !', 'Mais attends, on est faits pour s\'entendre, c\'est ça ?'],
          cool: ['Tiens, intéressant. On a ça en commun.', 'Je m\'en doutais un peu, je crois.', 'Ça te ressemble, je trouve.', 'Alors on s\'entend déjà sur un truc.'] },
  day: { warm: ['Elle a été calme, merci de demander. La tienne ?', 'Plutôt douce. Et la tienne, ça se passe comment ?', 'Pas mal, merci. Et toi, tu as pu te poser ?', 'Tranquille. Raconte-moi la tienne.'],
         play: ['Ma journée ? Un mélange de chaos et de génie.', 'Épique. Je te raconte quand tu veux.', 'Plutôt bien, mais elle serait mieux avec toi dedans.', 'Elle a démarré mal et fini par ton message. Donc bien.'],
         cool: ['Rien d\'extraordinaire, mais agréable. La tienne ?', 'Correcte. J\'ai surtout pensé à nous.', 'Calme. Et toi ?', 'Pas mal du tout, merci. Et toi, vraiment ?'] },
};

// ------------------------------------------------------------------ famille
export const KIDS_SOME: VBank = {
  warm: ['Ah, tu as des enfants ? Merci de me le dire, ça me fait plaisir de mieux te connaître.', 'Des enfants… c\'est une belle part de ta vie, j\'imagine. Merci de me le confier.'],
  play: ['Ah ouais, t\'as des enfants ? Je savais pas du tout ! Raconte, ils sont comment ?', 'Des enfants ? Mais tu me caches des choses, Radia ! Dis-moi tout.'],
  cool: ['Ah, tu as des enfants. Je ne savais pas. Merci de me le dire.', 'D\'accord, des enfants. Ça éclaire un peu ta façon de voir les choses.'] };
export const KIDS_FOLLOW: Record<string, string[]> = {
  interested: ['Ils ont quel âge ? Raconte-moi un peu comment ils sont.', 'Et ils ont hérité de quoi, de toi ? Ton sourire ? Ton humour ?', 'Et avec tout ça, t\'arrives à trouver du temps pour toi ?'],
  surprised: ['Je te laisse me raconter, je veux comprendre comment tu fais.', 'Ça fait beaucoup de choses d\'un coup, mais j\'écoute.', 'Et toi, comment tu vis tout ça au quotidien ?'],
  clumsy: ['Euh, je veux dire… ça doit être fatigant. Enfin beau. Les deux.', 'Je sais pas trop quoi dire, mais je suis content que tu m\'en parles.', 'Moi j\'arrive déjà pas à gérer mon chat mdrrrr. Alors toi, trois…'],
  hesitant: ['J\'ai besoin de réfléchir à ce que ça change pour moi, mais je préfère être honnête.', 'Je vais pas te mentir, je sais pas si je serais prêt pour une relation comme ça. Mais merci de ta franchise.', 'Je préfère te le dire tout de suite plutôt que de te faire perdre du temps.'],
  respectful: ['Merci de ta confiance. Je ne poserai pas de questions que tu ne veux pas.', 'Ça ne change rien à mon respect pour toi. Prends le temps qu\'il faut.', 'Tu peux m\'en parler quand tu en as envie.'],
  funny: ['Et alors, qui est le chef de la maison ? J\'ai un doute.', 'Trois enfants… ça doit faire un sacré orchestre le matin.', 'Moi j\'ai déjà du mal avec un réveil. Toi, t\'en as trois en même temps.'],
  admiring: ['Je trouve ça admirable, sincèrement. Tu es forte.', 'Ça demande une énergie folle. Tu as tout mon respect.', 'Quand tu veux m\'en parler, je suis là.'] };
/** Si Radia répond « du temps pour moi ? presque jamais » / « ils sont ma fierté » : la suite de la conversation. */
export const KIDS_AFTER: Record<'kid_time' | 'kid_proud' | 'kid_joke', VBank> = {
  kid_time: { warm: ['Alors prends-le, ce temps. Tu le mérites. Ce soir, par exemple ?', 'Je comprends. Je suis là quand tu as une petite pause.'],
              play: ['Alors on va te trouver des petits moments à toi. Je m\'en occupe, enfin, je propose des idées.', 'On va devoir corriger ça : une soirée sans aucun enfant, c\'est une obligation légale.'],
              cool: ['Il faudrait peut-être se débrouiller un créneau, non ?', 'Ça se comprend. Mais tu mérites ta respiration, toi aussi.'] },
  kid_proud: { warm: ['Ça se sent quand tu en parles. C\'est beau.', 'Je trouve ça touchant, vraiment. Ils ont de la chance.'],
               play: ['Ils ont de la chance. Et toi aussi, vu la fierté.', 'Je prends note : mission « être cool avec les enfants de Radia ».'],
               cool: ['Ça s\'entend. Merci de me le dire comme ça.', 'C\'est une jolie chose à dire de ses enfants.'] },
  kid_joke: { warm: ['Ahah, bon à savoir ! Merci de me rassurer.', 'Presque pas… c\'est rassurant, merci.'],
              play: ['Presque ? Je vais me préparer psychologiquement alors.', 'Je prends mes gants, alors. Et un casque, au cas où.'],
              cool: ['Bon, c\'est un début. Je vais rester prudent.', 'Merci, je prends note. Le « presque » est suspect, mais passons.'] } };
export const KIDS_REFUSED: VBank = {
  warm: ['Pas de souci du tout. Tu me diras ce que tu veux, quand tu veux.', 'Je comprends. On n\'en parle plus, je ne veux pas te mettre mal à l\'aise.'],
  play: ['Ok ok, on change de sujet, promis. Je range ma curiosité.', 'Aucun souci. Je range mes questions dans un tiroir.'],
  cool: ['Très bien. Je respecte ça.', 'D\'accord. Le sujet est fermé, sans rancune.'] };
export const KIDS_HEURT: VBank = {
  warm: ['Je suis désolé si j\'ai été maladroit. Ce n\'était pas mon intention.', 'Pardon, je ne voulais pas te faire de la peine. Je préférais être sincère.'],
  play: ['Oups, j\'ai fait une gaffe, désolé. Je préfère être franc, mais je ne veux pas te blesser.', 'Pardon Radia, je suis maladroit mais sincère. Tu restes une belle personne.'],
  cool: ['Désolé. Je préfère être honnête que flou, mais je ne veux pas te blesser.', 'Je comprends que ça fasse mal. Ce n\'est pas contre toi.'] };
export const KIDS_THANKS: VBank = {
  warm: ['Merci à toi de me comprendre. Je t\'ai trouvée vraiment sympa dans nos échanges.', 'Merci. Ça compte pour moi.'],
  play: ['Merci de pas me tuer. Je reste ton ami si tu veux.', 'T\'es cool, sérieux. On garde nos petites discussions ?'],
  cool: ['Merci. On peut continuer à discuter tranquillement, si tu veux.', 'Merci pour ta compréhension.'] };
export const KIDS_CALLBACK: VBank = {
  warm: ['Au fait, comment vont les enfants ? Je pensais à eux.', 'J\'ai repensé à ce que tu m\'as dit sur tes enfants. Ils vont bien ?'],
  play: ['Dis-moi, la tribu va bien ? Ça manque de nouvelles, ce côté-là.', 'Comment va la famille de Radia ? Je prends des nouvelles de la tribu.'],
  cool: ['Les enfants, ça va ? Tu m\'en parlais l\'autre jour.', 'Je repensais à ta famille. Tout se passe bien ?'] };

// ------------------------------------------------------------------ amitié homme-femme
/** Question de départ selon sa position (avant le débat). */
export const FRIEND_Q: Record<string, string[]> = {
  believer: ['Si un ami tombait amoureux de toi, tu ferais comment ?', 'C\'est quoi, pour toi, une vraie amitié avec un homme ?'],
  doubter: ['Donc si un mec te plaît vraiment, tu vas quand même le mettre dans la case ami ?', 'Et si ton meilleur pote finit par tomber amoureux de toi ?'],
  honest: ['Je préfère être direct : pour moi, c\'est plus qu\'une amitié ou rien du tout. Ça te dérange ?', 'Attends, mais pourquoi tu vas sur une appli de rencontres pour te faire des potes ?'],
  open: ['Moi je suis ouvert : amis, plus, on verra. T\'es à l\'aise avec ça ?', 'Et toi, tu crois à l\'amitié homme-femme ?'],
  cheeky: ['Mais pourquoi tu vas sur Tindeur pour te faire des potes ? Mdrr, c\'est comme aller au restaurant pour regarder la carte.', 'Ah ouais, j\'ai été friendzoné avant même d\'avoir commencé 😭'],
  debater: ['Si tu crois pas à l\'amitié homme-femme, pourquoi tu cherches des amis ici ?', 'Question piège, mais gentille : l\'amitié, c\'est quoi pour toi, au fond ?'] };
/** Réponses de Radia pendant le débat → ce qu'il dit, selon sa position (une position = un angle d'argument). */
export const FRIEND_ROUND: Record<string, Record<'fr_yes' | 'fr_no' | 'fr_him' | 'fr_joke' | 'fr_open' | 'fr_why', string[]>> = {
  believer: { fr_yes: ['On est d\'accord alors ! Les vraies amitiés se construisent sur la confiance, pas sur le jeu de la séduction.'], fr_no: ['Je comprends le doute. Mais je pense que ça vaut le coup d\'essayer, justement.'], fr_him: ['Moi oui. Mes meilleurs souvenirs, je les dois à des amies. Après, ça demande de la clarté.'], fr_joke: ['Haha, les copains jaloux, c\'est le piège. Moi je suis un ami cool, enfin je crois.'], fr_open: ['Bonne attitude. On pose des règles simples et on voit ce qui arrive.'], fr_why: ['Exactement, c\'est ça que je dis. Pourquoi pas ?'] },
  doubter: { fr_yes: ['Tu y crois vraiment ? Alors convaincs-moi : une amitié sans arrière-pensée, ça existe où ?'], fr_no: ['Là, on se rejoint. Mais alors pourquoi tu dis chercher des amis ? C\'est un test ?'], fr_him: ['Moi, je suis resté sceptique. Dans mon expérience, il y en a toujours un qui développe quelque chose à un moment.'], fr_joke: ['Mdr, voilà, tu me confirmes mon doute : les copains jaloux, ça existe.'], fr_open: ['« On verra » c\'est une réponse honnête. J\'aime bien.'], fr_why: ['Parce que j\'ai peur de me faire du mal à moitié. C\'est con, mais voilà.'] },
  honest: { fr_yes: ['Ok, je respecte. Mais je préfère te dire que moi, je ne suis pas là pour ça. Voilà.'], fr_no: ['Alors on est assez d\'accord : l\'amitié n\'est pas évidente. Moi, je préfère jouer cartes sur table.'], fr_him: ['Moi, pas vraiment : je préfère être honnête plutôt que de me raconter des histoires.'], fr_joke: ['Mdrr, d\'accord, tu esquives avec humour. Mais je note.'], fr_open: ['« On verra », ça me va, tant que c\'est clair entre nous deux.'], fr_why: ['Parce que moi, je ne saurais pas faire. Mais je ne te juge pas.'] },
  open: { fr_yes: ['Super ! Alors on peut déjà être amis, et voir le reste après.'], fr_no: ['Pas grave. Un pas après l\'autre.'], fr_him: ['Moi je suis ouvert à tout, sans pression.'], fr_joke: ['Haha, on va les rendre jaloux alors !'], fr_open: ['Parfait. Je n\'attends rien, j\'accueille.'], fr_why: ['Rien ne l\'empêche. J\'adhère.'] },
  cheeky: { fr_yes: ['Alors tu me présenteras tes copines pour tester la théorie.'], fr_no: ['Ah, tu admets enfin ! Mdrr. T\'es honnête, j\'aime ça.'], fr_him: ['Ma théorie : ça marche, jusqu\'au jour où on se met à t\'envoyer des mémés d\'amour.'], fr_joke: ['Jaloux, moi ? Jamais. Disons… un peu.'], fr_open: ['« On verra » : c\'est le début de toutes les histoires.'], fr_why: ['Parce que c\'est bien plus drôle d\'être friendzoné avec style.'] },
  debater: { fr_yes: ['Alors défends-moi cette thèse : qu\'est-ce qui distingue l\'amitié d\'un flirt sans suite ?'], fr_no: ['Tu es honnête, ça me plaît. Alors on est d\'accord sur la difficulté.'], fr_him: ['Je suis partagé. Je crois qu\'on peut, mais qu\'il faut une vraie volonté des deux côtés.'], fr_joke: ['Un argument d\'autorité en emojis. Je note.'], fr_open: ['La plus intelligente des positions : ne pas trancher à l\'avance.'], fr_why: ['Ça, c\'est un vrai argument. Tu marques un point.'] } };
export const FRIEND_CLOSE: Record<string, string[]> = {
  believer: ['En tout cas, je suis content qu\'on en parle. On avance au rythme que tu veux.', 'Je suis partant pour l\'amitié, pour de vrai.'],
  doubter: ['Je reste sceptique, mais tu m\'as fait réfléchir. On continue ?', 'Je te propose un essai : on verra bien qui a raison.'],
  honest: ['Bon. Je préfère t\'être sincère : je reste, mais sans promettre de rester « juste ami » pour toujours.', 'On continue à discuter, mais je préfère que tu saches où je me situe.'],
  open: ['Du coup, on avance tranquillement, sans pression. Ça me va.', 'Ok, amis d\'abord. Et la vie fera le reste.'],
  cheeky: ['Bon, ok, je te mets dans la catégorie « amie en test ». Période d\'essai : un mois.', 'D\'accord, je prends. Mais je garde le droit de plaisanter sur le sujet.'],
  debater: ['Matière à réflexion, tu m\'as bien embêté. J\'aime ça.', 'On rouvrira le débat un autre jour, avec un café.'] };
export const FRIEND_CLEAR: VBank = {
  warm: ['Merci pour ta franchise. Ça me va, je reste comme ami.', 'Je respecte ça complètement. Je suis content qu\'on se parle quand même.'],
  play: ['Ok, c\'est clair ! Mon rôle de bon pote commence maintenant.', 'Reçu cinq sur cinq. On est amis, je range mes blagues romantiques. Enfin, pas toutes.'],
  cool: ['C\'est clair. Je ne vais pas insister.', 'D\'accord. Merci d\'être directe, ça simplifie les choses.'] };
export const FRIEND_STEPBACK: string[] = ['Honnêtement, ce n\'est pas ce que je cherche. Je préfère me retirer pour ne pas te faire perdre ton temps. Prends soin de toi, Radia.', 'Je préfère être clair : je cherche autre chose. Je te souhaite le meilleur, vraiment.'];
export const FRIEND_CALLBACK: VBank = {
  warm: ['Tu te souviens de notre discussion sur l\'amitié ? Elle continue de trotter dans ma tête.', 'Je repensais à ce qu\'on disait des amitiés. J\'ai peut-être évolué sur la question.'],
  play: ['Alors, toujours dans la case « ami » ? Je demande pour une enquête sérieuse.', 'Mise à jour sur le dossier « amitié homme-femme » : je suis toujours partant. Et toi ?'],
  cool: ['On avait parlé d\'amitié. Je continue d\'y réfléchir.', 'Ton avis sur l\'amitié m\'est resté. Tu y crois toujours ?'] };

// ------------------------------------------------------------------ prénom (jamais dans chaque message)
export const NAME_LINES: Record<'light' | 'tease' | 'flirt', string[]> = {
  light: ['Ah ouais {n}, toi aussi ?? Mdrrrr', 'Attends {n}, t\'es sérieuse là ?', 'Bon {n}, tu m\'impressionnes.', 'Dis donc {n}, tu m\'as bien eu.', 'Alors {n}, on se dit tout ?'],
  tease: ['Allô allô, je passe à la {n} 📻', 'Radio {n}, vous êtes sur la fréquence de l\'amour.', 'J\'ai capté pourquoi tu t\'appelles {n}, tu rayonnes mdrr', '{n}, {n}, {n}… ça sonne bien, c\'est dangereux.', 'Ici {n} FM, on diffuse de la bonne humeur toute la journée.'],
  flirt: ['Bon {n}, ton prénom va finir dans mes chansons d\'amour à ce rythme.', '{n}… je crois que je commence à bien aimer ce prénom.', 'Je prononce « {n} » et ça me fait sourire. C\'est mauvais signe.', 'Tu sais que ton prénom est dangereux ? Il donne envie de répondre.'] };
export const NAME_REACT: Record<'nul' | 'bravo' | 'stopname', VBank> = {
  nul: { warm: ['Je sais, je sais. Je ferai mieux la prochaine fois, promis.', 'Ahah, tu as raison, c\'était maladroit. Mais sincère.'],
         play: ['Nul ? C\'est un art, ça demande du talent. Je retire rien.', 'Je savais qu\'elle allait être nulle, mais je me suis lancé quand même. Respect pour moi.', 'Merci pour ton honnêteté. Mon ego a pris une petite blessure, mais il survivra.'],
         cool: ['Elle était nulle, oui. J\'ai l\'élégance de le reconnaître.', 'Je prends. Je m\'améliorerai, je suis perfectible.'] },
  bravo: { warm: ['Merci, ça me fait chaud au cœur.', 'Oh, merci. Je n\'osais pas y croire.'],
           play: ['Elle a marché ?! Je note, c\'est dans la boîte à outils.', 'Alors là, j\'ai gagné ma journée.'],
           cool: ['Merci, je tenterai d\'en faire d\'autres.', 'Ah, ça passe. Parfait.'] },
  stopname: { warm: ['Pardon, je me calme avec ton prénom. Promis.', 'D\'accord, je te laisse tranquille avec ça.'],
              play: ['Bon, bon, je range ma radio. Je reprends un ton normal.', 'Message reçu : plus de blagues sur Radia. Je suis capable de me retenir. Un peu.'],
              cool: ['D\'accord, je lève le pied.', 'Compris. Je ne le ferai plus tout de suite.'] } };
/** Rattrapage quand Radia se moque gentiment d'une blague nulle (utilisé avec `jokes[].recover`). */
export const JOKE_LEAD: string[] = ['Bon, j\'ai une blague.', 'Attends, j\'ai un truc très drôle, enfin je crois.', 'Écoute celle-là, elle est sérieuse.'];

// ------------------------------------------------------------------ amoureux / statut
export const SINGLE_ASK: VBank = {
  warm: ['Je peux te poser une question un peu personnelle ? Tu es célibataire en ce moment ?', 'Je n\'ai pas envie d\'être indiscret, mais est-ce que quelqu\'un compte dans ta vie en ce moment ?'],
  play: ['Question de curiosité, hein : t\'es célibataire ou pas ?', 'Bon, il faut que je sache : y a quelqu\'un dans ta vie ou je peux tenter ma chance ?'],
  cool: ['Tu es célibataire, au fait ?', 'Petite question directe : tu es libre en ce moment ?'] };
export const SINGLE_REACT: Record<'sg_yes' | 'sg_complex' | 'sg_none' | 'sg_single', VBank> = {
  sg_yes: { warm: ['D\'accord. Merci pour ta franchise. Je ne veux pas me mettre au milieu de quelque chose.', 'Je vois. Je respecte ça, vraiment.'],
            play: ['Ok, donc il y a un gardien de phare en travaux. Noté.', 'Je vois, la concurrence existe. Je m\'adapte.'],
            cool: ['D\'accord. Je préfère savoir.', 'Bien noté. Merci pour ta franchise.'] },
  sg_complex: { warm: ['C\'est souvent comme ça, la vie. Prends le temps qu\'il faut.', 'Je comprends. Je suis là, sans pression.'],
                play: ['« Compliqué » : le statut officiel de tous les gens fascinants.', 'Ok, je range mes grands sabots. Mais je reste curieux.'],
                cool: ['Ça se comprend. Je n\'insiste pas.', 'D\'accord. C\'est ton histoire, tu me la dis quand tu veux.'] },
  sg_none: { warm: ['Tu as raison, pardon. Je n\'aurais pas dû.', 'Ça ne me regarde pas, c\'est vrai. Désolé si j\'ai été trop direct.'],
             play: ['Ahah, touché. Je range ma curiosité.', 'Ok, ok, secret défense. Compris.'],
             cool: ['Fair enough. Je retire ma question.', 'C\'est ton droit. On passe à autre chose.'] },
  sg_single: { warm: ['Merci de me le dire. Ça me fait plaisir de mieux te connaître.', 'D\'accord. Je prends ça comme une confiance.'],
               play: ['Ah ! Ça change tout. Enfin non. Mais ça me fait sourire.', 'Note pour moi-même : conserver ce numéro. Enfin, cette conversation.'],
               cool: ['Bien. Je note, sans en faire un drame.', 'D\'accord, merci.'] } };
/** Hugo (et lui seul) : il pense à Auguste. */
export const HUGO_AUGUSTE: string[] = ['Ouais t\'es toujours en contact avec l\'autre ?', `Je te demande ça comme ça, hein : l'autre, là, ${PARTNER}… vous vous parlez encore ?`];
export const HUGO_AUGUSTE_REACT: Record<string, string[]> = {
  sg_yes: ['Ah, d\'accord. Ça me fait un petit pincement, mais je respecte. Vraiment.', 'Je comprends. Vous avez une histoire, c\'est normal.'],
  sg_complex: ['C\'est compliqué… je vois. Merci de ta franchise. Je reste là, sans rien attendre.', 'D\'accord. Je ne veux pas me mêler de ça.'],
  sg_none: ['Tu as raison. Je n\'aurais pas dû. Je me suis laissé emporter par la curiosité.', 'Pardon. C\'était pas mon rôle de demander.'],
  sg_single: ['Ah, d\'accord. Ça me rassure un peu, et ça me fait réfléchir.', 'Merci de me le dire. Ça me fait plaisir, je ne vais pas te mentir.'] };

// ------------------------------------------------------------------ photos (demandes, réactions)
/** Demandes de selfie selon l'audace (0 : il n'en demande jamais le premier). Aucune demande intime : sourire, yeux, tenue, selfie. */
export const PHOTO_ASK: Record<1 | 2 | 3, string[]> = {
  1: ['Si un jour tu veux envoyer un petit snap, je serai content de voir ton sourire.', 'Tu me montres ta tenue du jour ? Sans pression.', 'Un petit selfie, si tu en as envie, bien sûr.'],
  2: ['Allez, envoie ta tête, je veux voir ton sourire mdrr', 'T\'as disparu ou quoi ? Fais voir ta bouille.', 'Tu me montres ta tenue du jour ?', 'J\'aimerais bien voir tes beaux yeux aujourd\'hui.', 'J\'ai envoyé ma tête, c\'est ton tour maintenant.'],
  3: ['Allez, envoie ta tête, je veux voir ton sourire mdrr', 'J\'ai envoyé ma tête, c\'est ton tour maintenant.', 'Même pas un petit snap pour moi ?', 'Tu me montres ta tenue du jour ?', 'Fais pas ta mystérieuse, une petite photo de ton sourire ?'] };
export const PHOTO_RELANCE: VBank = {
  warm: ['Je te redemande une seule fois, gentiment : un petit snap, si ça te dit ? Sinon, aucun souci.', 'Pas de pression, mais si l\'envie te prend, mon snap t\'attend.'],
  play: ['Tu fais la mystérieuse Radia 😭 Bon, c\'est ta dernière chance, après j\'arrête.', 'Bon, j\'attends toujours mon fameux snap moi. Mais pas de stress, hein.', 'Même pas un petit signe ? Bon, je te laisse tranquille après ça, promis.'],
  cool: ['Je te relance une fois, c\'est tout : un petit snap quand tu veux.', 'Je ne veux pas insister, juste te dire que ça me ferait plaisir.'] };
export const PHOTO_FIRST: VBank = {
  warm: ['Tu as raison, juste. Tiens, voilà le mien. À toi quand tu le sens.', 'Équitable. Voilà, je te l\'envoie.'],
  play: ['Équitable ! Voilà ma tête, soigneusement décoiffée.', 'Ok ok, voilà, t\'as gagné, je passe en premier.'],
  cool: ['C\'est juste. Je t\'envoie le mien.', 'D\'accord, je commence.'] };
export const PHOTO_LATER: VBank = {
  warm: ['Bien sûr, quand tu veux. Pas de souci.', 'Aucun problème, prends ton temps.'],
  play: ['Ok, je garde mon snap en attente. Je suis patient comme un tracteur.', 'Pas de souci, je ne suis pas pressé. Enfin, un peu.'],
  cool: ['Ça marche. On verra une autre fois.', 'D\'accord, sans souci.'] };
export const PHOTO_REFUSED: VBank = {
  warm: ['Je comprends tout à fait. Merci de me le dire clairement. Je ne te le redemanderai plus.', 'C\'est tout à fait ton droit. Je ne le redemanderai pas, promis.'],
  play: ['Reçu, c\'est noté. Plus de demande de ma part, jamais. On discute, c\'est le plus important.', 'Ok, aucun souci. Fin de la mission « selfie ». On continue de parler.'],
  cool: ['C\'est clair. Je ne te le redemanderai pas.', 'Respecté. Le sujet est clos.'] };
export const PHOTO_TEASE: VBank = {
  warm: ['Mystérieuse, j\'aime bien. Je me contente de tes mots alors.', 'D\'accord, je garde ma curiosité au chaud.'],
  play: ['Ah ! Le suspense. Je vais me forger une image mentale de toi. Elle sera sûrement fausse.', 'Mystère, mystère… Ok, je suis un bon joueur.'],
  cool: ['Ça me va. J\'aime bien les mystères.', 'D\'accord, on laisse planer.'] };
/** Réactions à la photo de Radia (selon ce qu'elle a envoyé) : complimenter ce qui est VRAIMENT dans le snap. */
export const PHOTO_GOT: Record<'ph_smile' | 'ph_outfit' | 'ph_funny', VBank> = {
  ph_smile: { warm: ['Ton sourire est vraiment beau. Merci de me l\'avoir montré.', 'Quel joli sourire. Ça me fait plaisir, sincèrement.'],
              play: ['Mais ce sourire !! Je suis officiellement conquis.', 'OK, j\'ai oublié ce que j\'allais dire. À cause de ce sourire.'],
              cool: ['Joli sourire. Merci pour ce snap.', 'Ce sourire te va très bien.'] },
  ph_outfit: { warm: ['Ta tenue est très élégante, tu as bon goût.', 'Elle te va à merveille, vraiment.'],
               play: ['Mais quelle tenue ! Les couleurs, la classe, tout y est.', 'T\'es sur un podium là. Je donne 10/10 à la tenue.'],
               cool: ['Belle tenue, elle te ressemble.', 'Bon goût. Les couleurs sont bien choisies.'] },
  ph_funny: { warm: ['Ahah, cette grimace est adorable. Merci de me faire sourire.', 'Tu me fais rire, c\'est super mignon.'],
              play: ['MDRRR cette grimace !! Je l\'encadre.', 'Ok, tu viens de gagner le concours de la meilleure tête.'],
              cool: ['Haha, j\'adore le côté décalé.', 'Sympa, tu ne te prends pas au sérieux. J\'aime.'] } };
/** Quand il envoie un snap : phrase d'accompagnement (en plus de la légende) selon le contexte. */
export const SNAP_WITH: string[] = ['Tu dors ?', 'Tu fais quoi de beau ?', 'Je t\'envoie une photo, à ton tour ?', 'Petit snap du jour.', 'Dis-moi ce que tu en penses.'];
/** Radia demande des nouvelles d'un snap qu'il a envoyé ; il répond selon la scène. */
export const SNAP_ASK_TEXT: Record<string, string> = {
  abs: 'Alors, cette séance de sport ?', mirror: 'Alors, cette séance ? Raconte !', sport: 'Alors, ce sport, ça s\'est passé comment ?', tractor: 'Et ce tracteur, il tient la route ?',
  haircut: 'Elle te va bien, cette coupe. Tu l\'as faite où ?', car: 'Tu allais où en voiture ?', resto: 'C\'était bon, ce resto ?', outfit: 'Elle est pour quelle occasion, cette tenue ?', pet: 'Il s\'appelle comment, ton petit compagnon ?',
  selfie: 'Alors, cette journée ?', pose: 'Tu prenais la pose pour qui ?', funny: 'C\'était quoi, cette tête ?', bath: 'Tu fais quoi, là ?', oops: 'C\'est un accident, cette photo ?' };
export const SNAP_ANSWER: Record<string, string[]> = {
  abs: ['Séance jambes puis abdos : j\'ai pleuré, mais dans le bon sens. Je me sens vivant.', 'Ça s\'est bien passé ! J\'ai battu mon record, mon corps hurle mais mon ego sourit.'],
  mirror: ['Dans le miroir de la salle, j\'ai vu un homme fatigué mais heureux. C\'est moi.', 'Séance dure. Mais le miroir m\'a dit « beau boulot ». Je l\'ai cru.'],
  sport: ['Très bien, j\'ai tenu la distance. Un peu raide aujourd\'hui, mais c\'est bon signe.', 'Un bon footing, 7 km. Je te jure que j\'ai failli m\'arrêter à 3.'],
  tractor: ['Elle a démarré du premier coup, je te jure. Un miracle de Josiane.', 'Elle tient bien. Un peu d\'huile, un peu d\'amour, et ça roule.'],
  haircut: ['Je l\'ai faite hier. Le coiffeur voulait que je ressemble à un acteur. Résultat : un acteur qui a dormi sur la route.', 'Chez un pote. Je lui ai laissé carte blanche. Ce n\'était pas ma meilleure idée, mais ça passe.'],
  car: ['Je rentrais du boulot, j\'ai pris la photo à un feu rouge. Prudent, hein.', 'Je partais chez des amis, la route était belle, je voulais te la montrer.'],
  resto: ['C\'était excellent. Le dessert surtout, j\'ai pris deux fois. Je ne regrette rien.', 'Un petit resto de quartier. Le serveur m\'a donné un conseil, c\'était une bonne idée.'],
  outfit: ['Pour un dîner. Je voulais ton avis, finalement. Tu valides ?', 'Pour une soirée avec des amis. J\'ai hésité trois fois, j\'ai gardé celle-ci.'],
  pet: ['Il s\'appelle Biscotte. Il mérite tous les câlins du monde et il le sait.', 'Mon petit chef de maison. Il dort 20 h par jour, je suis jaloux de son planning.'],
  selfie: ['Ma journée ? Plutôt bien. La photo, c\'est juste parce que j\'étais de bonne humeur.', 'Un selfie sans raison. Parfois, il faut juste se faire plaisir.'],
  pose: ['Je prenais la pose pour moi-même, c\'est un exercice de confiance. Je te le promets.', 'Pour personne. Pour tout le monde. Pour toi, peut-être.'],
  funny: ['Ma tête quand j\'ai vu ton nom s\'afficher. Je suis ridicule, je sais.', 'Je faisais le malin. J\'ai échoué, mais avec panache.'],
  bath: ['Un moment de détente. Rien de spécial, je te jure.', 'Juste un petit moment tranquille. Une pause, quoi.'],
  oops: ['Photo prise « par hasard ». Et oui, j\'ai pensé à te l\'envoyer quand même.', 'Un accident heureux. Je suis maladroit, tu le sais déjà.'] };
export const PHOTO_COMPLIMENT_CALLBACK: string[] = ['Au fait, ta photo de l\'autre jour, je l\'ai trouvée vraiment belle.', 'Je repensais à ton snap de l\'autre jour, il m\'a fait sourire.'];

// ------------------------------------------------------------------ relances, éloignement, flammes
export const RELANCE: VBank = {
  warm: ['Coucou, ça fait quelques jours. J\'espère que tout va bien pour toi.', 'Je pensais à toi. Pas de pression pour répondre, je voulais juste savoir comment tu vas.'],
  play: ['T\'as disparu ou quoi ? J\'ai failli lancer un avis de recherche.', 'Oh, y a quelqu\'un ? Je repasse voir si la fréquence est revenue 📻', 'Radia ? Tu t\'es perdue dans une réunion de famille ?'],
  cool: ['Ça fait un moment. Je repasse dire bonjour, discrètement.', 'Hello, tu deviens quoi ? Je suis là si tu as envie de reprendre la discussion.'] };
export const FADE: VBank = {
  warm: ['Je sens qu\'on ne se répond plus vraiment, et ce n\'est pas grave. Je te souhaite le meilleur, sincèrement.', 'Je vais te laisser tranquille. Si un jour tu as envie de reparler, la porte reste ouverte.'],
  play: ['Bon, je crois que le signal s\'éloigne. Je coupe la radio. Prends soin de toi, Radia.', 'Je me retire en douceur. Merci pour les bons moments, c\'était sympa.'],
  cool: ['Je crois que chacun reprend son chemin. Je te souhaite bonne continuation.', 'On dirait que ça ne prend pas. Pas de souci, je te laisse. Prends soin de toi.'] };
export const COMEBACK: string[] = ['Ça fait plaisir de te revoir ici !', 'Tiens, quelqu\'un est revenu. Ça me fait sourire.'];
export const FLAME_NUDGE: VBank = {
  warm: ['Notre flamme 🔥 est toujours là, si tu as un petit moment pour un snap. Sans pression.', 'Je pense à notre petite flamme 🔥. Elle ne t\'en veut pas si tu es occupée.'],
  play: ['Notre flamme 🔥 va s\'éteindre si on ne fait rien. Un petit snap pour la sauver ?', 'Alerte flamme 🔥 : un snap et on la garde en vie. Mais pas de pression, hein.'],
  cool: ['Une petite flamme 🔥 à entretenir ? Un snap quand tu peux.', 'On a une série en cours. Un petit snap et elle continue.'] };
export const SMALLTALK: Record<'warm' | 'play' | 'cool', string[]> = {
  warm: ['Coucou, j\'espère que ta journée se passe bien.', 'Un petit mot pour te dire que je pense à toi. Rien de spécial.', 'Salut. Je me demandais comment tu allais.', 'J\'ai une petite pause, je te dis bonjour.'],
  play: ['Alors, quoi de beau ?', 'Hé, t\'es là ? J\'ai une question idiote à te poser.', 'Je m\'ennuie un peu. Occupe-moi, s\'il te plaît.', 'Dis-moi un truc drôle, j\'en ai besoin.'],
  cool: ['Bonsoir. Journée tranquille de ton côté ?', 'Hello. Un truc à raconter aujourd\'hui ?', 'J\'ai pensé à toi en faisant autre chose. Ça arrive.', 'Un petit coucou, sans arrière-pensée. Enfin presque.'] };
export const ASK_KIDS_OPEN: VBank = {
  warm: ['J\'ai envie de mieux te connaître : tu as des enfants, ou tu n\'en as pas ? Tu n\'es pas obligée de répondre.', 'Dis-moi, quelle place ta famille a dans ta vie ?'],
  play: ['Bon, il me faut des infos : t\'as des enfants, un chat, des projets de vie ? Je fais mon enquête.', 'Dis, c\'est quoi ton plus grand projet de vie à toi ?'],
  cool: ['Tu as une famille, des enfants ? Je me demande dans quelle vie tu évolues.', 'Question large : ta vie, elle ressemble à quoi en ce moment ?'] };
