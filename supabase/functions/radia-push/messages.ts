/**
 * RADIA ♡ — banque des petites pensées quotidiennes (≥ 50). Ton : doux, naturel, sincère ; jamais de promesse sur l'avenir ni de
 * garantie d'une intervention divine (des vœux et des douas, pas des certitudes). Expressions arabes / darija courtes et correctes.
 * « galbi » n'apparaît presque jamais. Les catégories servent à alterner naturellement (jamais deux fois la même d'affilée).
 */
export type Cat = 'doua' | 'jour' | 'courage' | 'tendresse' | 'romantique' | 'drole' | 'douceur';
export interface Thought { text: string; cat: Cat; /** Titre de la notification (par défaut « RADIA ♡ »). */ title?: string }
const T = (cat: Cat, ...texts: string[]): Thought[] => texts.map((text) => ({ text, cat }));

export const THOUGHTS: readonly Thought[] = [
  // douas et protection
  ...T('doua', 'Rabbi yahfdek ♡ Qu’Allah te protège et garde ton joli sourire.', 'Qu’Allah veille sur toi aujourd’hui.', 'Allah y hafdek ♡', 'Qu’Allah te protège aujourd’hui.', 'Qu’Allah mette de la douceur dans ta journée.', 'Qu’Allah apaise ton cœur, facilite tes projets et t’apporte du bonheur.', 'Qu’Allah t’apporte la paix et le sourire aujourd’hui.', 'Rabbi yfarhek ♡ Qu’Allah remplisse ton cœur de joie et de belles nouvelles.', 'Tu mérites de vivre de belles choses. Qu’Allah t’ouvre les portes du bien.'),
  // bonne journée
  ...T('jour', 'Sabah el kheir ♡ Qu’Allah veille sur toi aujourd’hui et t’accorde une belle journée.', 'Je te souhaite une belle journée ♡', 'Passe une douce journée, qu’Allah t’accompagne.', 'Salam, j’espère que tu vas bien aujourd’hui ♡', 'Bismillah pour cette nouvelle journée. J’espère qu’elle t’apportera de belles surprises ♡', 'Que cette journée t’apporte de la sérénité, des sourires et de bonnes nouvelles. Inchallah ♡', 'Je te souhaite une belle journée, qu’Allah soit à tes côtés.', 'Une nouvelle journée commence : prends-la à ton rythme.', 'Un petit coucou pour te souhaiter une journée toute en douceur.'),
  // encouragements
  ...T('courage', 'Allah ysehel 3lik ♡ Que tout se passe facilement pour toi aujourd’hui.', 'Rabbi yqawwik ♡ Qu’Allah te donne de la force pour tout ce que tu entreprends.', 'Tu avances à ton rythme, et c’est très bien comme ça.', 'Un pas après l’autre : tu fais déjà beaucoup.', 'Bsahtek pour tout ce que tu as accompli. Tu peux être fière de toi.', 'Si la journée est lourde, fais une pause. Tu as le droit.', 'Tu es plus forte que tu ne le crois ♡'),
  // tendresse
  ...T('tendresse', 'Je pense à toi, prends soin de toi aujourd’hui.', 'Petit rappel doux du jour : tu es précieuse ♡', 'Un petit coucou pour te rappeler que je te souhaite toujours le meilleur.', 'Prends soin de toi, et pense à boire un peu d’eau ♡', 'Ce matin, je te souhaite simplement d’être heureuse. Allah yahfdek ♡', 'Tu comptes beaucoup, tu sais.', 'Je te souhaite un moment rien qu’à toi aujourd’hui.', 'Merci d’être qui tu es ♡'),
  // petites attentions romantiques
  ...T('romantique', 'J’espère que ta journée sera aussi douce que ton sourire. Prends soin de toi ♡', 'Même les journées ordinaires méritent une petite dose d’amour. Belle journée à toi ♡', 'Une petite pensée pour toi, rien que pour toi ♡', 'Ton sourire est ma plus belle pensée du jour.', 'Galbi te souhaite une journée lumineuse ♡', 'Je t’embrasse, et je te souhaite une journée comme tu l’aimes.', 'Si tu lis ceci, sache que quelqu’un pense à toi avec le sourire.'),
  // amusant
  ...T('drole', 'Petit rappel du jour : tu as le droit de t’offrir un goûter. C’est presque médical.', 'Si quelqu’un te dit que tu ne peux pas faire une pause, c’est faux.', 'Annonce météo : grand soleil de gentillesse sur toute la journée.', 'Information importante : aujourd’hui, tu peux être légèrement adorable.', 'Une journée sans petit rire est une journée incomplète. Je compte sur toi.', 'Rappel officiel : les câlins, les gaufres et les siestes sont recommandés.'),
  // motivation douce
  ...T('douceur', 'Une petite chose à la fois, et ça ira très bien.', 'Respire doucement : tu fais de ton mieux, c’est déjà beaucoup.', 'Choisis une toute petite joie pour aujourd’hui, et savoure-la.', 'Ce que tu fais compte, même quand personne ne le voit.', 'Aujourd’hui, avance sans te presser. Qu’Allah t’accompagne.', 'Chaque petit effort est un pas dans la bonne direction.', 'Inchallah, de bonnes choses viendront. En attendant, sois douce avec toi-même.'),
  // --- pensées personnelles AJOUTÉES À LA FIN (les indices des anciennes pensées ne changent jamais : les « paquets » en cours restent valides).
  // Textes EXACTS fournis par Auguste (signes « + » et cœurs compris) : ne pas les reformuler. Longs : l'aperçu de la notification est raccourci
  // par le service worker, le texte intégral est conservé dans « Petites pensées ♡ ».
  { cat: 'tendresse', title: 'Pense à toi ♡', text: 'Radia ♡ Je veux que tu penses un peu + à toi, que tu te choisisses + souvent et que tu n’oublies jamais à quel point tu es précieuse. Prends soin de toi, tu le mérites. ❤️' },
  { cat: 'tendresse', title: 'Une mère extraordinaire ♡', text: 'Radia, tu as une magnifique famille et tu es une mère extraordinaire. Je suis sûr que tes enfants s’en rendent compte, ou qu’ils le comprendront encore davantage en grandissant. N’en doute jamais. ❤️' },
  { cat: 'doua', title: 'Une journée remplie de baraka ♡', text: 'Qu’Allah mette de la baraka dans ta journée, apaise ton cœur et t’apporte de belles choses. Prends soin de toi ♡' },
  { cat: 'courage', title: 'Je suis là pour toi ♡', text: 'Si un jour tu as un coup de mou ou simplement besoin de parler, appelle-moi. Je serai toujours heureux de t’écouter, sans jamais te juger. Même tes petits défauts font partie de la personne que tu es, et c’est aussi ce qui te rend unique. ❤️' },
  { cat: 'romantique', title: 'Reconnaissant de t’avoir rencontrée ♡', text: 'Je ne remercierai jamais assez Dieu de t’avoir mise sur mon chemin. Tu as cette façon de faire rayonner les gens qui t’entourent, parfois même sans t’en rendre compte. Et je voulais simplement que tu le saches. ❤️' },
  { cat: 'courage', title: 'Tu peux compter sur moi ♡', text: 'N’oublie jamais qu’au moindre problème, tu peux compter sur moi. Je ferai toujours de mon mieux pour t’aider, te soutenir et trouver des solutions à tes côtés. Tu n’as pas besoin de tout porter toute seule. ♡' },
];

/** Nombre de pensées avant l'ajout des six pensées personnelles (indices 0 … 52 inchangés). */
export const ORIGINAL_COUNT = THOUGHTS.length - 6;

export const THOUGHT_COUNT = THOUGHTS.length;
