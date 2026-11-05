/**
 * Messages — textes des conversations du téléphone du jeu (tout est fictif et interne au jeu).
 * Auguste : beaucoup de petits échanges banals, drôles et spontanés ; les grandes déclarations restent rares ; « galbi » presque jamais.
 * Les enfants ne sont jamais nommés ici (leurs prénoms viennent des données chiffrées) ; la plus jeune écrit par petits vocaux fictifs
 * « avec l'aide d'un adulte ».
 */
export type ContactId = 'auguste' | 'maman' | 'kid1' | 'kid2' | 'kid3' | 'agency';
export const CONTACT_IDS: readonly ContactId[] = ['auguste', 'maman', 'kid1', 'kid2', 'kid3', 'agency'];
export const isContactId = (v: unknown): v is ContactId => typeof v === 'string' && (CONTACT_IDS as readonly string[]).includes(v);
export type KidStyle = 'big' | 'mid' | 'small';

export interface Line { text: string; /** thème : sert à éviter deux fois le même d'affilée */ cat: string }
const L = (cat: string, ...texts: string[]): Line[] => texts.map((text) => ({ text, cat }));

/** Messages spontanés d'Auguste (≥ 40). */
export const AUGUSTE_SPONTANEOUS: readonly Line[] = [
  ...L('banal', 'Coucou toi, ta journée se passe bien ?', 'Tu fais quoi de beau ?', 'J\'ai oublié mes clés. Encore. Ne le répète à personne.', 'Il fait un temps parfait pour ne rien faire.', 'Tu as mangé ? Dis-moi que oui.', 'Je viens de croiser un chien avec un manteau. Il avait plus de style que moi.', 'Café numéro trois. On ne juge pas.', 'Question sérieuse : tu préfères les crêpes ou les gaufres ?', 'J\'ai croisé quelqu\'un qui t\'a trouvée très gentille la dernière fois. Je confirme.', 'Il y a un oiseau qui me regarde bizarrement depuis ce matin.'),
  ...L('fun', 'Je viens de penser à un truc qui m\'a fait sourire.', 'J\'ai essayé de cuisiner. Les voisins ont une opinion.', 'Je te jure que le GPS m\'a envoyé dans un champ. Un champ !', 'Si tu voyais ma tête devant ce menu, tu rirais.', 'J\'ai gagné contre moi-même au baby-foot. Je suis imbattable.', 'On m\'a dit que j\'avais l\'air fatigué. C\'est juste ma tête normale.', 'Je cherche mes lunettes depuis dix minutes. Elles étaient sur mon nez.', 'Ce soir : pyjama, plaid, et zéro décision.'),
  ...L('tender', 'Tu me racontes ta journée quand t\'as deux minutes ?', 'Je pense à toi. Voilà, c\'est dit.', 'Prends soin de toi, d\'accord ?', 'Je t\'embrasse. Bonne fin de journée.', 'T\'as le droit de faire une pause, tu sais.', 'Ça me fait plaisir de te savoir là.', 'J\'espère que quelqu\'un t\'a fait sourire aujourd\'hui. Sinon c\'est moi.'),
  ...L('proud', 'Bsahték, t\'as géré aujourd\'hui !', 'Je suis fier de toi, vraiment.', 'Tu m\'impressionnes, tu sais.', 'Bravo pour tout à l\'heure. Tu as été top.', 'Franchement, quelle énergie. Je suis admiratif.'),
  ...L('plan', 'J\'ai trouvé un endroit où j\'aimerais bien t\'emmener.', 'Tu es libre un de ces soirs ? J\'ai une idée.', 'J\'ai une petite surprise pour toi ♡', 'Et si on sortait un peu, rien que nous deux ?', 'Je réfléchis à un petit week-end. Tu serais partante ?'),
  ...L('care', 'Tu as bien dormi ?', 'N\'oublie pas de boire de l\'eau.', 'Si c\'est une journée compliquée, je suis là.', 'Tu m\'appelles si tu veux parler ?', 'Mets un pull, il fait frais dehors.'),
  ...L('galbi', 'Galbi, tu me manques un peu. Juste un peu.'),
];

/** Réponses d'Auguste selon ce que Radia écrit (intention détectée par mots-clés ; sinon « generic »). */
export type Intent = 'thanks' | 'love' | 'day' | 'tired' | 'question' | 'laugh' | 'plan' | 'goodnight' | 'hello' | 'generic';
export const AUGUSTE_REPLIES: Record<Intent, readonly string[]> = {
  thanks: ['Avec plaisir !', 'De rien, c\'est naturel.', 'Toujours là pour ça.', 'Pas de quoi, vraiment.'],
  love: ['Moi aussi. Et pas qu\'un peu.', 'Tu viens de me faire sourire comme un idiot.', 'C\'est réciproque, et de très loin.', 'Je rougis, là. Je te jure.'],
  day: ['Raconte-moi tout, je suis tout ouïe.', 'Ça se passe plutôt bien ici, merci de demander. Et toi, vraiment ?', 'Bonne journée alors. Et si ça se complique, tu me dis.', 'Ah ! Et tu as fait quoi de bien dedans ?'],
  tired: ['Alors repos. Interdiction de te sentir coupable.', 'Pause, thé, plaid. C\'est un ordre doux.', 'Tu en fais déjà énormément. Souffle un peu.', 'Je m\'occupe du reste, promis. Dors si tu peux.'],
  question: ['Bonne question. Je dirais oui, mais je réfléchis encore.', 'Hmm. Laisse-moi deviner : tu connais déjà la réponse ?', 'Je pense que oui. Mais tu me connais, je dis ça à tout.', 'Là, tu me poses une colle.'],
  laugh: ['Haha, j\'adore ton rire (même écrit).', 'Mdr. Tu vois, on se comprend.', 'Je savais que ça te ferait rire.', 'Voilà, objectif atteint : sourire.'],
  plan: ['Ça me plaît beaucoup, ça.', 'Dis-moi quand, je m\'organise.', 'Bonne idée. Tu choisis, je suis partant.', 'Je note ça dans un coin de ma tête, et de mon cœur.'],
  goodnight: ['Bonne nuit. Fais de beaux rêves.', 'À demain alors. Dors bien.', 'Bonne nuit toi. Je t\'embrasse.', 'Dors bien, tu l\'as mérité.'],
  hello: ['Coucou toi !', 'Salut, ça fait plaisir de te lire.', 'Hello ! Tu tombes bien.', 'Eh, toi ! Ça va ?'],
  generic: ['Je vois. Dis-m\'en plus ?', 'Ah oui ? Ça m\'intéresse.', 'Bsahték.', 'Je note. Et sinon, la forme ?', 'Mm, je comprends.', 'Haha, tu m\'étonneras toujours.', 'D\'accord. Je suis avec toi.'],
};
/** Mots-clés (minuscules, sans accents) → intention. Le premier groupe qui correspond l'emporte. */
export const INTENT_RULES: readonly [Intent, RegExp][] = [
  ['goodnight', /\b(bonne nuit|je vais dormir|dodo|a demain)\b/],
  ['thanks', /\b(merci|thanks|bsahtek|choukran|shukran)\b/],
  ['love', /\b(je t'?aime|tu me manques|bisou|ti amo|je pense a toi|mon coeur|♥|❤|😘|😍)/],
  ['tired', /\b(fatigue|epuis|crev|dur|dodo|sommeil|stress)/],
  ['plan', /\b(on sort|sortir|ce soir|week-?end|restau|cine|balade|rendez-?vous|une idee)\b/],
  ['laugh', /\b(mdr|haha|ptdr|lol|hihi)|😂|🤣/],
  ['day', /\b(journee|ca va|comment vas|quoi de neuf|et toi)\b/],
  ['hello', /^(coucou|salut|hello|hey|bonjour|bonsoir|slt)\b/],
  ['question', /\?/],
];

/** Maman : messages spontanés + réponses. */
export const MAMAN_SPONTANEOUS: readonly Line[] = [
  ...L('maman', 'Coucou ma fille, tu vas bien ?', 'N\'oublie pas de m\'appeler quand tu peux.', 'Tu manges bien ? Tu as l\'air fatiguée sur les photos.', 'J\'ai fait un gâteau. Il en restera pour toi, peut-être.', 'Les petits te font un gros bisou. Ou c\'est moi qui le fais pour eux.', 'Je pense à toi. Voilà. C\'est tout.', 'Tu viens me voir bientôt ? La maison est trop calme.', 'Il fait froid ici, couvre-toi bien là-bas.', 'J\'ai retrouvé une vieille photo de toi. Tu étais adorable.', 'Dis à Auguste de bien s\'occuper de toi.'),
];
export const MAMAN_REPLIES: readonly string[] = ['Ça me fait plaisir de te lire, ma chérie.', 'D\'accord, ma fille. Prends soin de toi.', 'Je t\'embrasse fort.', 'Ah ! Raconte-moi ça au téléphone un de ces jours.', 'Tu me rassures. Merci de m\'écrire.', 'Je suis là, tu sais.'];

/** Enfants : un petit message de temps en temps (style selon l'âge ; la plus jeune « avec l'aide d'un adulte »). */
export const KID_SPONTANEOUS: Record<KidStyle, readonly Line[]> = {
  big: L('kid', 'Maman, regarde ce que j\'ai fait !', 'On mange quoi ce soir ?', 'Je peux inviter quelqu\'un samedi ?', 'J\'ai fini mon exposé. Enfin !', 'Tu rentres à quelle heure ?', 'Il y a un truc rigolo dans ma chambre, je te montre plus tard.'),
  mid: L('kid', 'Maman, tu me manques un peu aujourd\'hui.', 'J\'ai dessiné un chat qui fait du vélo. Tu veux voir ?', 'On peut faire des crêpes ?', 'J\'ai gagné à notre jeu !', 'Tu viens me chercher bientôt ?', 'J\'ai trouvé un caillou en forme de cœur.'),
  small: L('kid', '🎙 Petit vocal (envoyé avec l\'aide d\'un adulte) : « Bisou maman ! »', '🎙 Petit vocal (avec l\'aide d\'un adulte) : « J\'ai fait un dessin ! »', '🎙 Petit vocal (avec l\'aide d\'un adulte) : « Tu viens bientôt ? »', 'Un adulte écrit pour moi : j\'ai mangé tous mes légumes !', '🎙 Petit vocal (avec l\'aide d\'un adulte) : « Je t\'aime, maman. »'),
};
export const KID_REPLIES: Record<KidStyle, readonly string[]> = {
  big: ['Ok maman !', 'Trop bien.', 'Merci maman ♡', 'Ça marche !'],
  mid: ['Bisou maman !', 'Youpi !', 'Je t\'aime ♡', 'D\'accord !'],
  small: ['🎙 Petit vocal (avec l\'aide d\'un adulte) : « Bisou ! »', '🎙 Petit vocal (avec l\'aide d\'un adulte) : « Oui maman ! »', 'Un adulte écrit pour moi : merci maman ♡'],
};

/** Studio Lumière (agence) : informatif, jamais envahissant. */
export const AGENCY_SPONTANEOUS: readonly Line[] = L('agency', 'Studio Lumière : une belle opportunité vous attend, passez nous voir quand vous voulez.', 'Studio Lumière : merci pour votre dernier travail, l\'équipe vous félicite.', 'Studio Lumière : nous préparons de nouvelles séances, restez joignable.');
export const AGENCY_REPLIES: readonly string[] = ['Studio Lumière : bien reçu, merci.', 'Studio Lumière : nous revenons vers vous très vite.'];

export const REACTIONS = [
  { id: 'heart', emoji: '❤️', label: 'Cœur' },
  { id: 'laugh', emoji: '😂', label: 'Rire' },
  { id: 'like', emoji: '👍', label: 'J\'aime' },
  { id: 'wow', emoji: '😮', label: 'Surprise' },
  { id: 'sad', emoji: '😢', label: 'Tristesse' },
  { id: 'what', emoji: '❓', label: 'Point d\'interrogation' },
] as const;
export type ReactionId = (typeof REACTIONS)[number]['id'];
export const isReaction = (v: unknown): v is ReactionId => REACTIONS.some((r) => r.id === v);
