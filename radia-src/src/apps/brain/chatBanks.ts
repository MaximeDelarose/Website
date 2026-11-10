/**
 * Répliques par INTENTION pour les messages libres. Trois voix (chaleureuse / taquine / posée) ; `{kw}` = un mot de Radia repris tel quel,
 * `{age}` / `{name}` / `{km}` = données du personnage. Toujours courtes (une bulle) : le moteur en enchaîne parfois deux ou trois.
 */
import type { VBank } from './banks';

const V = (warm: string[], play: string[], cool: string[]): VBank => ({ warm, play, cool });

export const GREET: VBank = V(
  ['Salut Radia ! Ça me fait plaisir de te lire 😊', 'Coucou ! Ça me fait plaisir de te voir ici 😅', 'Hello ! Comment tu vas ?'],
  ['Salut salut 👋 Tu tombes bien, je m\'ennuyais.', 'Hey ! Je commençais à croire que tu m\'avais oublié 😏', 'Coucou toi ! Ça va ou ça va pas ?'],
  ['Salut. Content de te lire.', 'Hello, ça va ?', 'Hey. Tu tombes bien.'],
);
export const HOW_ANSWER: VBank = V(
  ['Ça va bien, merci de demander. Et toi, vraiment ?', 'Plutôt bien ! Une journée calme. Et toi ?', 'Ça va, merci. J\'espère que toi aussi.'],
  ['Ça va nickel maintenant que tu m\'écris 😄 Et toi ?', 'Au top ! Enfin, ça va. Enfin… ça dépend du moment. Toi ?', 'Mieux que hier, moins bien que demain. Et toi ?'],
  ['Ça va, merci. Et toi ?', 'Correct. Rien de fou. Toi ?', 'Bien. La tienne se passe comment ?'],
);
export const DOING_ANSWER: VBank = V(
  ['Je me détends un peu, je pensais justement à toi. Et toi ?', 'Pas grand-chose, je profite du calme. Toi ?', 'Je discute avec toi, c\'est déjà bien. Et toi ?'],
  ['Là ? Je te réponds, je suis très occupé 😎 Et toi ?', 'Rien de glorieux. J\'ai fait semblant de ranger. Et toi ?', 'Je procrastine avec élégance. Toi ?'],
  ['Pas grand-chose. Et toi, tu fais quoi ?', 'Je me repose. Toi ?', 'Un peu de tout. Rien d\'important. Et toi ?'],
);
export const THANKS_REPLY: VBank = V(
  ['Avec plaisir, vraiment ♡', 'Mais de rien, c\'est naturel.', 'Ça me fait plaisir.'],
  ['De rien, je suis un homme de service 😄', 'Pas de quoi ! Tu me paieras en sourires.', 'Avec plaisir, et j\'accepte les croissants 🥐'],
  ['De rien.', 'Aucun souci.', 'Avec plaisir.'],
);
export const LAUGH_REPLY: VBank = V(
  ['Ton rire me fait plaisir, même écrit.', 'J\'adore te faire rire. Ça me fait sourire.', 'Ça fait du bien de rire un peu, non ?'],
  ['Mdrrr, je savais que j\'étais drôle. Note pour moi : en refaire.', 'Haha, j\'ai marqué un point. Continue à rire, c\'est bon pour moi.', 'Je prends ça comme une standing ovation 👏'],
  ['Content que ça te fasse rire.', 'Haha, ça fait plaisir.', 'Tant mieux, c\'est le but.'],
);
export const SURE_REPLY: VBank = V(
  ['Oui, vraiment, je ne plaisante pas. Je suis sincère là-dessus.', 'Je te promets, c\'est vrai. Je ne dirais pas ça pour rien.', 'Oui oui, c\'est vrai. Pourquoi, ça t\'étonne ?'],
  ['Sérieux ! Sur ma vie. Enfin, presque.', 'Totalement sérieux. Regarde mon visage… ah non, tu le vois pas 😅', 'Je te jure ! Sur le tracteur de mon voisin.'],
  ['Oui, sérieusement.', 'Oui. Je ne plaisante pas là-dessus.', 'Tout à fait vrai.'],
);
export const WHY_REPLY: VBank = V(
  ['Bonne question. Je crois que c\'est ma façon de voir les choses.', 'Parce que ça me touche, simplement. Je ne sais pas l\'expliquer mieux.', 'Pourquoi ? Franchement, parce que ça me ressemble.'],
  ['Pourquoi ? Parce que je suis comme ça et qu\'on m\'a jamais prévenu du contraire 😄', 'Bonne question ! Je te réponds quand j\'ai trouvé. Dans deux ou trois ans.', 'Parce que c\'est la vie, ma pauvre Lucette.'],
  ['Parce que c\'est comme ça que je le vois.', 'Pas de raison profonde. Une préférence.', 'Question légitime. Réponse courte : instinct.'],
);
export const COMPLIMENT_REPLY: VBank = V(
  ['Oh… merci, ça me touche vraiment. Tu es adorable.', 'C\'est gentil, ça me fait rougir. Toi aussi, tu as quelque chose de spécial.', 'Merci Radia ♡ Ce genre de mot, ça fait du bien.'],
  ['Arrête, tu vas me faire rougir 🙈 Bon, continue un peu.', 'Je note : Radia me trouve génial. Je vais l\'encadrer.', 'Mais c\'est qu\'elle est directe ! J\'aime ça 😏'],
  ['Merci, c\'est gentil.', 'Ça me fait plaisir à entendre.', 'Merci. Venant de toi, ça compte.'],
);
export const FLIRT_REPLY: VBank = V(
  ['Tu me fais rougir… je suis un peu timide, tu sais.', 'Ça me touche. J\'avoue que j\'ai souri comme un idiot devant mon écran.', 'Tu as des mots doux, toi. Continue, je n\'ai rien contre.'],
  ['Ah mais on flirte, là ? J\'adore, continue 😏', 'Radia, tu veux ma perte ? Continue, c\'est agréable.', 'Si c\'est un jeu, j\'ai déjà perdu. Mais je joue encore.'],
  ['Je prends ça comme un beau compliment.', 'Intéressant. Et agréable à lire.', 'Ça me plaît, je ne le cache pas.'],
);
export const MISS_REPLY: VBank = V(
  ['Toi aussi tu me manques un peu… je l\'avoue.', 'Ça me touche de lire ça. Moi aussi, j\'ai pensé à toi.', 'Merci de me le dire. C\'est réciproque, vraiment.'],
  ['Tu me manques aussi, mais discrètement hein 😏', 'Moi aussi j\'ai pensé à toi. Deux fois. Trois, peut-être.', 'Ah ben voilà, ma journée est faite.'],
  ['Moi aussi, un peu. J\'avoue.', 'C\'est réciproque.', 'Ça me fait plaisir. Merci.'],
);
export const SAD_REPLY: VBank = V(
  ['Oh… je suis désolé que ça ne va pas. Tu veux m\'en parler ? Je t\'écoute sans te juger.', 'Ça arrive à tout le monde, tu sais. Prends soin de toi, je suis là.', 'Je suis là si tu as besoin de parler. Pas besoin de tout expliquer.'],
  ['Hé… ça va pas ? Raconte, je suis nul pour consoler mais je sais écouter.', 'Courage, hein. Si tu veux, je peux te raconter une blague nulle pour détendre l\'ambiance.', 'Mince. Viens, on respire. Tu veux en parler ou plutôt t\'évader ?'],
  ['Ça n\'a pas l\'air d\'aller. Dis-moi ce qui se passe, si tu veux.', 'Je suis là. Prends ton temps.', 'D\'accord. Je t\'écoute.'],
);
export const BUSY_REPLY: VBank = V(
  ['Pas de souci du tout, prends ton temps. Je serai là quand tu reviens ♡', 'Bien sûr, occupe-toi de ce que tu as à faire. On se reparle ensuite.', 'Pas de problème, à tout à l\'heure alors !'],
  ['Ok ok, je ne bouge pas. Je tiens la boutique 😎', 'Pas de souci ! Reviens quand tu veux, je reste là, à regarder le plafond.', 'À tout à l\'heure ! Je vais faire semblant d\'avoir une vie en attendant.'],
  ['D\'accord, à plus tard.', 'Aucun problème. À tout à l\'heure.', 'Ok. Reviens quand tu peux.'],
);
export const BYE_REPLY: VBank = V(
  ['À bientôt Radia, prends soin de toi ♡', 'Merci pour cette discussion. À très vite, j\'espère.', 'À la prochaine, avec plaisir. Fais attention à toi.'],
  ['Bisous, et reviens vite ou je m\'invente des problèmes 😄', 'Ok, ciao ! Mais tu m\'écris demain hein.', 'À plus ! Garde un peu de place pour moi dans ta journée.'],
  ['À plus tard.', 'À bientôt.', 'Prends soin de toi.'],
);
export const NIGHT_REPLY: VBank = V(
  ['Bonne nuit Radia, fais de beaux rêves ♡', 'Dors bien, tu l\'as mérité. À demain.', 'Bonne nuit. Que la nuit soit douce.'],
  ['Bonne nuit ! Fais de beaux rêves… avec moi dedans si possible 😏', 'Dodo ! Et si tu rêves de moi, c\'est ok, je suis flexible.', 'Bonne nuit toi. À demain pour la suite des aventures.'],
  ['Bonne nuit.', 'Dors bien. À demain.', 'Repose-toi bien.'],
);
export const AGREE_REPLY: VBank = V(
  ['Ah, on se comprend alors. Ça me fait plaisir.', 'Content que tu sois d\'accord, vraiment.', 'On est sur la même longueur d\'onde.'],
  ['Ah ben voilà, on est d\'accord ! Date à marquer.', 'On s\'entend déjà sur un truc, c\'est un début.', 'Excellent. On a le même cerveau, je crois.'],
  ['Parfait.', 'Alors on est d\'accord.', 'Bien. Ça me va.'],
);
export const DISAGREE_REPLY: VBank = V(
  ['D\'accord, je respecte ça. On n\'a pas à tout partager.', 'Ok, pas de souci. J\'aimerais comprendre pourquoi, si tu veux m\'expliquer.', 'Compris. Je ne vais pas insister.'],
  ['Ah ! On n\'est pas d\'accord. Ça promet des discussions passionnantes 😄', 'Mais attends, tu me fais l\'affront ! Je rigole. Explique-moi.', 'Désaccord noté. Je plaide ma cause quand tu veux.'],
  ['D\'accord. Chacun voit les choses comme il veut.', 'Pas d\'accord, donc. Pourquoi pas.', 'Je note.'],
);
export const MAYBE_REPLY: VBank = V(
  ['Pas de pression, on verra. Prends ton temps.', 'C\'est honnête. Réfléchis tranquillement.', 'D\'accord, on y reviendra quand tu le sentiras.'],
  ['Le grand « peut-être » ! La réponse des gens qui savent 😄', 'Peut-être… j\'aime ce mot. Il laisse de la place aux surprises.', 'Ok, je prends le « peut-être ». C\'est mieux qu\'un non.'],
  ['D\'accord. Peut-être, donc.', 'On verra.', 'Pas de souci.'],
);
export const RUDE_REPLY: VBank = V(
  ['Aïe… ça me fait un peu mal, je ne m\'y attendais pas. Si j\'ai dit quelque chose de mal, dis-le-moi.', 'Je ne veux pas me disputer avec toi. Tu veux qu\'on en parle calmement ?', 'D\'accord… ça me blesse un peu, mais je préfère qu\'on reste respectueux tous les deux.'],
  ['Outch, direct dans l\'ego 😅 Je suis sensible, tu sais.', 'Ok, prise de bec détectée. Je lève le drapeau blanc, mais je garde mon honneur.', 'Aïe. Je vais pleurer dans un coin, puis je reviens avec une blague.'],
  ['Je préfère qu\'on reste courtois.', 'D\'accord. Si j\'ai déplu, dis-moi pourquoi.', 'Entendu. Gardons le respect.'],
);
export const STOP_REPLY: string[] = ['D\'accord, je comprends et je respecte ça. Je ne t\'écrirai plus. Prends soin de toi.', 'Entendu Radia. Pardon si j\'ai été maladroit. Je te laisse tranquille. Prends soin de toi.', 'Ok. Je respecte ton choix, sans rancune. Bonne continuation à toi.'];
export const SEXUAL_REPLY: VBank = V(
  ['Oh là, doucement. On se connaît à peine et j\'aime les choses simples et respectueuses. On peut parler d\'autre chose ?', 'Je ne suis pas à l\'aise avec ça. Parlons plutôt de nous, de nos goûts, de la vie…', 'Ce n\'est pas ce que je cherche. J\'ai envie de te connaître vraiment, pas plus.'],
  ['Oula, on freine ! 😅 Moi je suis plutôt romantique, café et balade. Changeons de sujet ?', 'Haha non non non, pas comme ça. Je reste dans le charme léger, merci.', 'Tu es directe, toi ! Mais je préfère qu\'on reste léger et sympa.'],
  ['Je préfère éviter ce sujet. Parlons d\'autre chose.', 'Pas à l\'aise avec ça. Changeons de sujet.', 'Non, on reste respectueux. Autre chose ?'],
);
export const COUPLED_REPLY: VBank = V(
  ['Ah. Merci de me le dire honnêtement. Je respecte ça, et je ne veux pas me mettre au milieu de quoi que ce soit.', 'D\'accord, j\'apprécie ta franchise. Je reste ton ami si tu veux, mais rien de plus.', 'Ça change les choses, et c\'est bien de me le dire. Je préfère être clair.'],
  ['Ah. Ok, je me range sur le côté. Restons sympas, alors.', 'Hmm, ça change la donne. On reste amis, si tu veux 😄', 'Merci de l\'honnêteté. Je ne fais jamais le troisième larron.'],
  ['Compris. Merci de me l\'avoir dit.', 'D\'accord. Restons-en là, alors.', 'Je respecte ça.'],
);
export const ASK_PHOTO_REPLY: VBank = V(
  ['Une photo de moi ? Euh… si tu veux. Mais je suis très ordinaire, sans filtre.', 'Tu veux me voir ? Ça me gêne un peu, mais ça me fait plaisir. Je vais voir ce que je peux t\'envoyer.', 'D\'accord, je te prépare ça. Tu me diras ce que tu en penses ?'],
  ['Une photo de moi ? Évidemment ! Laisse-moi me recoiffer… ah non, même résultat 😂', 'Tu veux ma bouille ? Je te l\'envoie, mais tu devras me donner la tienne après.', 'Oh, tu veux me voir ? Ça se mérite. Je te prépare une pose magnifique.'],
  ['Une photo ? Pourquoi pas. Je t\'en envoie une bientôt.', 'D\'accord, je regarde ce que j\'ai.', 'Je t\'envoie quelque chose tout à l\'heure.'],
);
export const SNAP_ASKED_REPLY = ['Oui, j\'ai Snapchien ! Je t\'ajoute là-bas dès que tu veux. C\'est plus pratique pour envoyer des snaps.', 'Bien sûr que j\'ai Snapchien. Ajoute-moi, j\'arrive !'];
export const SNAP_NONE_REPLY: VBank = V(
  ['Je n\'ai pas Snapchien pour l\'instant. On peut rester ici, ça me va très bien.', 'Pas de Snapchien chez moi, je préfère te parler ici, tranquillement.', 'Je ne l\'ai pas, mais je suis très bien ici avec toi.'],
  ['Snapchien ? Je suis resté à l\'ère des SMS, pardon 😅 Restons ici.', 'Pas de compte ! Mais je vais y réfléchir, juste pour toi.', 'J\'y suis pas, mais je peux m\'y mettre si tu insistes gentiment.'],
  ['Je ne l\'ai pas. On reste ici.', 'Pas de Snapchien pour moi.', 'Restons ici, c\'est très bien.'],
);

// ------------------------------------------------------------------ questions de Radia sur lui
export const Q_AGE: VBank = V(
  ['J\'ai {age} ans. Et toi, tu n\'as pas à me le dire, bien sûr.', '{age} ans. Je m\'en sors honorablement, je crois.', '{age} ans, et je me sens de mieux en mieux.'],
  ['{age} ans, âge de la maturité et de la sieste 😎', '{age} ans. Pas mal, hein ? Je prends du galon.', 'J\'ai {age} ans, mais mentalement j\'en ai neuf. Ça compense.'],
  ['{age} ans.', 'J\'ai {age} ans.', '{age}. Et toi ?'],
);
export const Q_WHERE: VBank = V(
  ['Je suis à {km} km de toi, pas très loin. Et toi, tu es bien installée ?', 'Pas très loin d\'ici, à {km} km. Tu aimes ton coin ?', 'Je suis dans la région, à {km} km. Et toi, tu aimes où tu vis ?'],
  ['À {km} km de toi, soit à portée de balade 😏', 'Pas loin ! {km} km, ça se fait en un café.', 'Je suis à {km} km. Tu vois, la distance n\'est pas un problème.'],
  ['À environ {km} km de toi.', 'Pas très loin : {km} km.', 'Dans la même région, à {km} km.'],
);
export const Q_NAME: VBank = V(
  ['Moi c\'est {name}. Enchanté, Radia.', '{name}. Un prénom simple, mais sincère.', 'Je m\'appelle {name}. Et toi, c\'est Radia, c\'est joli.'],
  ['{name} ! Retiens-le bien, je serai célèbre.', 'Moi, c\'est {name}. Pas de surnom ridicule, merci.', '{name}, pour te servir 😄'],
  ['{name}.', 'Je m\'appelle {name}.', '{name}, enchanté.'],
);
export const Q_SINGLE_REPLY: VBank = V(
  ['Je suis célibataire, sinon je ne serais pas là à discuter avec toi. Et toi ?', 'Célibataire, oui. Je cherche quelque chose de sincère.', 'Oui, célibataire. Je ne joue pas à ces jeux-là.'],
  ['Célibataire ! Libre comme un tracteur sans clé 😄 Et toi ?', 'Totalement célibataire. Dispo pour discuter, rire, et plus si affinités 😏', 'Célibataire, ça fait deux ans. Une vraie légende.'],
  ['Célibataire.', 'Oui, célibataire.', 'Oui, seul. Et toi ?'],
);
export const Q_MEET_YOUNG: VBank = V(
  ['J\'aimerais bien, mais on se connaît encore peu. Prenons le temps de discuter, tu veux ?', 'Ça me ferait plaisir un jour. Mais je préfère qu\'on se connaisse un peu mieux d\'abord.', 'C\'est gentil d\'y penser. Laissons-nous un peu de temps, ça me convient mieux.'],
  ['Ah ! Tu vas vite, toi 😏 Un peu de patience, on apprend à se connaître d\'abord.', 'Un rendez-vous ? Déjà ? Je suis flatté mais j\'ai besoin de quelques messages en plus.', 'Doucement, cow-girl ! Dans quelques jours, peut-être.'],
  ['Pas tout de suite. Apprenons d\'abord à nous connaître.', 'Pourquoi pas plus tard.', 'Laissons du temps au temps.'],
);
export const Q_MEET_READY: VBank = V(
  ['Avec grand plaisir. {date}', 'Oui, j\'en serais très heureux. {date}', 'Ça me ferait vraiment plaisir. {date}'],
  ['Carrément ! {date}', 'Dis oui, vite, avant que je change d\'avis ! {date}', 'Je dis oui avant même que tu finisses ta phrase. {date}'],
  ['Pourquoi pas. {date}', 'D\'accord, je suis partant. {date}', 'Ça me va. {date}'],
);
export const Q_KIDS_REPLY: VBank = V(
  ['Les enfants, j\'aime beaucoup, oui. Pas pour tout de suite, mais plus tard ça me plairait. Et toi ?', 'Oui, j\'aime les enfants. C\'est une belle chose, je trouve.', 'J\'adore les enfants, vraiment. Et toi, ils sont comment, les tiens ?'],
  ['Les enfants ? Je suis très fort pour faire rire les petits, mauvais pour les calmer 😄', 'Oui, j\'aime les enfants. Ils disent la vérité, eux, c\'est cool.', 'Je suis un oncle/ami cool, ça compte ? Toi, c\'est quoi ton avis ?'],
  ['Oui, j\'aime les enfants. C\'est une bonne chose.', 'Sans doute, un jour.', 'J\'aime bien. Et toi ?'],
);
export const Q_PET: VBank = V(
  ['J\'adore les animaux, c\'est une belle compagnie. Et toi, tu en as ?', 'Les animaux sont très doux. Je rêve d\'un chien un jour. Et toi ?', 'Oui, j\'aime beaucoup les animaux. Tu as un favori ?'],
  ['Les animaux, c\'est mieux que les humains. Sans offense 😄 Tu en as un, toi ?', 'Je kiffe les chats : indépendants, comme moi. Toi ?', 'Je prends tous les animaux. Surtout si ça mord pas.'],
  ['J\'aime bien les animaux. Et toi ?', 'Oui. Un chien, plutôt.', 'Ça me plaît.'],
);
export const Q_WEATHER: VBank = V(
  ['Le temps influence tellement l\'humeur, je trouve. Chez toi, c\'est comment ?', 'J\'aime les journées calmes, qu\'il pleuve ou pas. Et toi ?'],
  ['Le temps ? Ah, on parle météo, c\'est que ça devient sérieux 😄', 'Parler météo, c\'est le début d\'une grande histoire d\'amour.'],
  ['Le temps est ce qu\'il est. Toi, tu préfères quoi ?', 'Ça varie. Et chez toi ?'],
);
export const Q_SLEEP: VBank = V(
  ['Prends bien soin de ton sommeil, c\'est précieux. Tu dors bien en général ?', 'Le repos, c\'est essentiel. Moi aussi, je dors trop peu parfois.'],
  ['Le sommeil, mon sport préféré ! Dormir, c\'est ma discipline.', 'Moi, je suis un champion de la sieste. Médaille d\'or.'],
  ['Le sommeil est important. Tu dors assez ?', 'Bien dormir, c\'est la base.'],
);
export const Q_SPORT: VBank = V(
  ['Bouger fait du bien à la tête aussi. Tu pratiques quelque chose ?', 'J\'aime marcher, surtout. Et toi, quel sport te plaît ?'],
  ['Le sport ? Je suis incollable sur la théorie. La pratique, moins 😄', 'Courir, c\'est bien. Surtout dans un sens où il y a un croissant.'],
  ['Je fais un peu de sport. Et toi ?', 'Je bouge quand je peux.'],
);
export const Q_FOOD: VBank = V(
  ['J\'aime bien cuisiner des choses simples. Et toi, c\'est quoi ton plat réconfort ?', 'Un bon repas, ça arrange tout. Tu cuisines ?'],
  ['Manger ? Mon deuxième sport après la sieste 😋 Ton plat préféré ?', 'Ah, tu me parles de nourriture ? Dis-moi tout, je suis déjà affamé.'],
  ['J\'aime bien manger. Et toi, c\'est quoi ton plat préféré ?', 'Je mange de tout. Toi ?'],
);
export const Q_WORK: VBank = V(
  ['Le travail peut être fatigant. Tu fais quoi toi, comme métier ?', 'Je comprends. Les journées de boulot, c\'est parfois long.'],
  ['Le boulot, c\'est la vie. Enfin, c\'est ce qu\'on dit. Moi j\'y crois moyen 😄', 'Ah, parler boulot… tu veux vraiment ruiner l\'ambiance ?'],
  ['Le travail, c\'est important mais pas tout. Toi, tu fais quoi ?', 'Je comprends. Ça arrive.'],
);
export const Q_FAMILY: VBank = V(
  ['La famille, c\'est précieux. Tu es proche de la tienne ?', 'J\'aime bien parler famille. Tu as des frères et sœurs ?'],
  ['La famille, c\'est le bazar ordonné. Comme chez moi.', 'Ah, la famille. Une source infinie d\'anecdotes.'],
  ['La famille compte pour moi. Et pour toi ?', 'J\'en ai une petite. Et toi ?'],
);
export const Q_MUSIC: VBank = V(
  ['La musique me détend beaucoup. Tu écoutes quoi en ce moment ?', 'J\'aime des choses assez douces. Et toi ?'],
  ['La musique ! Ma playlist est un mélange étrange. Et la tienne ?', 'Je chante faux mais avec conviction.'],
  ['J\'écoute de tout. Toi ?', 'Un peu de tout, selon l\'humeur.'],
);
export const Q_MOVIE: VBank = V(
  ['J\'aime les histoires, au cinéma comme dans les livres. Tu en as une préférée ?', 'Les films qui touchent, ce sont mes préférés. Et toi ?'],
  ['Films, séries… je suis un expert en canapé. Tu me conseilles quoi ?', 'Je regarde trop de séries. C\'est ma façon de socialiser.'],
  ['J\'aime les bons films. Tu me conseilles quelque chose ?', 'Un peu de tout. Toi ?'],
);

export const NOTHING_REPLY: VBank = V(
  ['Les journées tranquilles ont du bon, tu sais. Parfois c\'est ce qu\'il faut.', 'Ce n\'est pas grave d\'avoir des jours sans rien. Moi aussi, ça m\'arrive.', 'Un peu de calme, ça fait du bien. Profite.'],
  ['Rien de spécial ? Alors on va rendre ça spécial, là 😄', 'Ah, la routine ! La seule chose qui ne nous trahit jamais.', 'Bon, on va pimenter ça : raconte-moi un truc bizarre qui t\'est arrivé cette semaine.'],
  ['D\'accord. Les jours calmes, ça arrive.', 'Pas grand-chose, donc. Ça va.', 'Compris. Rien d\'urgent.'],
);
