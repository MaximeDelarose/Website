// Contenu éditorial d'À DEUX : questionnaire, jeux, rituels. Tout est original.

export type QType = 'cards' | 'multi' | 'dilemma' | 'scale' | 'open'
export type Category = 'A' | 'B' | 'C'

export interface Option {
  id: string
  label: string
  emoji: string
  /** Phrase affichée quand les deux personnes choisissent cette option. */
  shared?: string
}
export interface Question {
  id: string
  cat: Category
  type: QType
  title: string
  hint?: string
  options?: Option[]
  max?: number
  scale?: { left: string; right: string; steps: number }
  optional?: boolean
  /** Peut être marqué « indispensable » par la personne. */
  canBeMust?: boolean
  /** Donnée sensible : facultative, privée, jamais affichée. */
  sensitive?: boolean
  /** Phrase utilisée pour les échelles proches. */
  sharedScale?: string
  diff?: string
}

export const CATEGORIES: Record<Category, { name: string; blurb: string; color: string }> = {
  A: { name: 'Ce que je cherche', blurb: 'Pour commencer du bon côté du chemin.', color: '#F6B7A0' },
  B: { name: 'Ma façon d’aimer', blurb: 'Ta manière d’être proche de quelqu’un.', color: '#F3C1CC' },
  C: { name: 'Mon univers', blurb: 'Ce qui te ressemble au quotidien.', color: '#CDE8DA' },
}

export const QUESTIONS: Question[] = [
  // ---------- A : ce que je cherche ----------
  {
    id: 'intent', cat: 'A', type: 'cards', canBeMust: true,
    title: 'Qu’est-ce que tu cherches, au fond ?',
    options: [
      { id: 'serious', label: 'Une relation sérieuse', emoji: '', shared: 'Vous cherchez tous les deux une relation qui compte.' },
      { id: 'marriage', label: 'Une relation qui mène au mariage', emoji: '', shared: 'Vous envisagez tous les deux le mariage.' },
      { id: 'values', label: 'Une rencontre fondée sur des valeurs communes', emoji: '', shared: 'Les valeurs communes comptent pour vous deux.' },
      { id: 'slow', label: 'Prendre mon temps, voir où ça mène', emoji: '', shared: 'Vous préférez tous les deux laisser les choses grandir.' },
      { id: 'discover', label: 'Rencontrer sans pression', emoji: '', shared: 'Vous voulez tous les deux rencontrer sans pression.' },
    ],
    diff: 'Vous n’abordez pas la rencontre tout à fait pareil : un beau sujet de départ.',
  },
  {
    id: 'place', cat: 'A', type: 'scale',
    title: 'Quelle place occupe le couple dans ta vie ?',
    hint: 'Il n’y a pas de bonne réponse.',
    scale: { left: 'Un bonus précieux', right: 'Le centre de ma vie', steps: 5 },
    sharedScale: 'Le couple a une place comparable dans vos vies.',
    diff: 'Le couple n’a pas la même place dans vos vies : à explorer avec curiosité.',
  },
  {
    id: 'pace', cat: 'A', type: 'cards',
    title: 'À quel rythme aimes-tu découvrir quelqu’un ?',
    options: [
      { id: 'daily', label: 'On se parle un peu chaque jour', emoji: '', shared: 'Vous aimez tous les deux découvrir quelqu’un régulièrement.' },
      { id: 'waves', label: 'Par vagues, selon l’envie', emoji: '', shared: 'Vous avancez tous les deux par vagues, sans pression.' },
      { id: 'slowburn', label: 'Doucement, sans me presser', emoji: '', shared: 'Vous aimez tous les deux prendre le temps.' },
    ],
    diff: 'Vos rythmes de découverte diffèrent : peut-être un sujet à découvrir ensemble.',
  },
  {
    id: 'projects', cat: 'A', type: 'multi', max: 3,
    title: 'Quels projets comptent pour toi ?',
    hint: 'Jusqu’à 3.',
    options: [
      { id: 'travel', label: 'Voyager', emoji: '', shared: 'Voyager fait partie de vos projets.' },
      { id: 'home', label: 'Un chez-moi', emoji: '', shared: 'Un chez-soi chaleureux compte pour vous deux.' },
      { id: 'career', label: 'Ma carrière', emoji: '', shared: 'Vous avez tous les deux des ambitions professionnelles.' },
      { id: 'creative', label: 'Créer quelque chose', emoji: '', shared: 'Vous avez tous les deux envie de créer.' },
      { id: 'family', label: 'Fonder une famille', emoji: '', shared: 'Fonder une famille compte pour vous deux.' },
      { id: 'learn', label: 'Apprendre encore', emoji: '', shared: 'Apprendre encore vous anime tous les deux.' },
    ],
    diff: 'Vos projets prennent des chemins différents : il y a de quoi se raconter.',
  },
  {
    id: 'kids', cat: 'A', type: 'cards', canBeMust: true,
    title: 'Souhaites-tu des enfants ?',
    options: [
      { id: 'yes', label: 'Oui, c’est important', emoji: '', shared: 'Vous partagez le même regard sur les enfants.' },
      { id: 'maybe', label: 'Peut-être, je ne sais pas', emoji: '', shared: 'Vous êtes tous les deux ouverts sur la question des enfants.' },
      { id: 'no', label: 'Non', emoji: '', shared: 'Vous partagez le même regard sur les enfants.' },
    ],
    diff: 'Vous n’avez pas la même vision des enfants : un sujet important à aborder avec douceur.',
  },
  {
    id: 'differences', optional: true, cat: 'A', type: 'multi', max: 3,
    title: 'Quelles différences es-tu prêt·e à accepter ?',
    hint: 'Ce qui ne te dérange pas chez quelqu’un. Jusqu’à 3.',
    options: [
      { id: 'rhythm', label: 'Un autre rythme de vie', emoji: '' },
      { id: 'tastes', label: 'Des goûts très différents', emoji: '' },
      { id: 'beliefs', label: 'Des convictions différentes', emoji: '' },
      { id: 'social', label: 'Plus ou moins sociable', emoji: '' },
      { id: 'money', label: 'Un rapport différent à l’argent', emoji: '' },
      { id: 'distance', label: 'Un peu de distance', emoji: '' },
    ],
    diff: 'Vous acceptez des différences qui ne sont pas les mêmes.',
  },
  {
    id: 'faithpref', cat: 'A', type: 'cards', optional: true, canBeMust: true, sensitive: true,
    title: 'Souhaites-tu rencontrer quelqu’un qui partage ta foi ou tes convictions ?',
    hint: 'Facultatif et privé. Jamais affiché sur ton profil ; ce choix n’est utilisé que pour te proposer des rencontres, avec ton accord.',
    options: [
      { id: 'yes', label: 'Oui, c’est important pour moi', emoji: '', shared: 'Vous souhaitez tous les deux partager vos convictions.' },
      { id: 'open', label: 'Je préfère, sans que ce soit indispensable', emoji: '', shared: 'Vous êtes tous les deux attentifs aux convictions de l’autre.' },
      { id: 'any', label: 'Peu importe', emoji: '', shared: 'Les convictions ne sont pas un critère pour vous deux.' },
    ],
    diff: 'Vous n’abordez pas la question des convictions de la même façon : un sujet à aborder avec respect.',
  },
  {
    id: 'faith', cat: 'A', type: 'cards', optional: true, sensitive: true,
    title: 'Quelles sont tes convictions ?',
    hint: 'Facultatif, privé et sans présupposé : nous ne déduisons rien de tes pratiques. Tu peux passer.',
    options: [
      { id: 'islam', label: 'Islam', emoji: '', shared: 'Vous partagez la même foi.' },
      { id: 'christian', label: 'Christianisme', emoji: '', shared: 'Vous partagez la même foi.' },
      { id: 'jewish', label: 'Judaïsme', emoji: '', shared: 'Vous partagez la même foi.' },
      { id: 'other', label: 'Une autre foi ou spiritualité', emoji: '', shared: 'Vous partagez une même sensibilité spirituelle.' },
      { id: 'none', label: 'Aucune religion', emoji: '', shared: 'Vous partagez le même regard sur la religion.' },
      { id: 'private', label: 'Je préfère ne pas le dire', emoji: '' },
    ],
  },
  // ---------- B : ma façon d'aimer ----------
  {
    id: 'affection', cat: 'B', type: 'multi', max: 2,
    title: 'Comment montres-tu ton affection ?',
    hint: 'Jusqu’à 2.',
    options: [
      { id: 'words', label: 'Les mots', emoji: '', shared: 'Vous montrez tous les deux votre affection avec des mots.' },
      { id: 'time', label: 'Du temps ensemble', emoji: '', shared: 'Vous donnez tous les deux du temps pour dire « je tiens à toi ».' },
      { id: 'touch', label: 'Le contact', emoji: '', shared: 'Le contact et la tendresse comptent pour vous deux.' },
      { id: 'acts', label: 'Des gestes utiles', emoji: '', shared: 'Vous aimez tous les deux aimer par des gestes concrets.' },
      { id: 'gifts', label: 'Des petites surprises', emoji: '', shared: 'Vous aimez tous les deux les petites surprises.' },
    ],
    diff: 'Vous montrez votre affection de manières différentes : deux langages à apprendre.',
  },
  {
    id: 'conflict', cat: 'B', type: 'dilemma',
    title: 'Face à un désaccord, tu as plutôt envie de…',
    options: [
      { id: 'talk', label: 'En parler tout de suite', emoji: '', shared: 'Face à un désaccord, vous préférez tous les deux en parler vite.' },
      { id: 'think', label: 'Prendre du recul d’abord', emoji: '', shared: 'Face à un désaccord, vous aimez tous les deux réfléchir d’abord.' },
    ],
    diff: 'Vous gérez les désaccords différemment : l’un parle, l’autre respire. À découvrir.',
  },
  {
    id: 'communication', cat: 'B', type: 'scale',
    title: 'Quelle importance accordes-tu à la communication ?',
    scale: { left: 'Je suis du genre discret·e', right: 'C’est essentiel pour moi', steps: 5 },
    sharedScale: 'La communication est importante pour vous deux.',
    diff: 'La communication n’a pas la même importance pour vous : un sujet à poser tranquillement.',
  },
  {
    id: 'talkorthink', cat: 'B', type: 'dilemma',
    title: 'Quand quelque chose te préoccupe…',
    options: [
      { id: 'now', label: 'Je parle immédiatement', emoji: '', shared: 'Vous partagez ce qui vous préoccupe sans attendre.' },
      { id: 'later', label: 'Je réfléchis, puis je parle', emoji: '', shared: 'Vous aimez tous les deux réfléchir avant d’en parler.' },
    ],
    diff: 'Vous n’avez pas le même tempo pour confier ce qui vous préoccupe.',
  },
  {
    id: 'considered', cat: 'B', type: 'multi', max: 2,
    title: 'Qu’est-ce qui te fait te sentir considéré·e ?',
    hint: 'Jusqu’à 2.',
    options: [
      { id: 'listen', label: 'Être vraiment écouté·e', emoji: '', shared: 'Être écouté·e compte énormément pour vous deux.' },
      { id: 'remember', label: 'Qu’on se souvienne des détails', emoji: '', shared: 'Les petits détails retenus comptent pour vous deux.' },
      { id: 'initiative', label: 'Qu’on prenne des initiatives', emoji: '', shared: 'Vous aimez tous les deux que l’autre prenne des initiatives.' },
      { id: 'space', label: 'Qu’on respecte mon espace', emoji: '', shared: 'Le respect de l’espace de chacun compte pour vous deux.' },
    ],
    diff: 'Vous ne vous sentez pas considéré·e de la même façon : de quoi apprendre l’un de l’autre.',
  },
  {
    id: 'attentions', optional: true, cat: 'B', type: 'cards',
    title: 'Quelle petite attention te touche le plus ?',
    options: [
      { id: 'msg', label: 'Un message sans raison', emoji: '', shared: 'Un petit message sans raison fait fondre vos deux cœurs.' },
      { id: 'coffee', label: 'Mon café préparé', emoji: '', shared: 'Les attentions du quotidien vous touchent tous les deux.' },
      { id: 'playlist', label: 'Une chanson partagée', emoji: '', shared: 'Une chanson partagée vous touche tous les deux.' },
      { id: 'surprise', label: 'Une sortie surprise', emoji: '', shared: 'Une sortie surprise vous enchante tous les deux.' },
    ],
    diff: 'Vos petites attentions favorites ne sont pas les mêmes : deux surprises à inventer.',
  },
  // ---------- C : mon univers ----------
  {
    id: 'evening', cat: 'C', type: 'cards',
    title: 'Ta soirée idéale ressemble à…',
    options: [
      { id: 'cosy', label: 'Plaid, film et plat maison', emoji: '', shared: 'Votre soirée idéale est cosy et sans chichis.' },
      { id: 'out', label: 'Une sortie qui bouge', emoji: '', shared: 'Vous aimez tous les deux les soirées qui bougent.' },
      { id: 'friends', label: 'Une grande table entre ami·es', emoji: '', shared: 'Une grande table entre ami·es vous plaît à tous les deux.' },
      { id: 'walk', label: 'Une balade au coucher du soleil', emoji: '', shared: 'Une balade au coucher du soleil, ça vous parle à tous les deux.' },
    ],
    diff: 'Vos soirées idéales ne se ressemblent pas : peut-être un bon prétexte pour en inventer une.',
  },
  {
    id: 'spontaneity', cat: 'C', type: 'scale',
    title: 'Ton rapport à la spontanéité ?',
    scale: { left: 'J’aime planifier', right: 'J’aime l’improvisation', steps: 5 },
    sharedScale: 'Vous aimez tous les deux les relations spontanées.',
    diff: 'L’un planifie plus que l’autre : de quoi se compléter, ou se taquiner.',
  },
  {
    id: 'humor', optional: true, cat: 'C', type: 'multi', max: 2,
    title: 'Ton humour, plutôt…',
    hint: 'Jusqu’à 2.',
    options: [
      { id: 'absurd', label: 'Absurde', emoji: '', shared: 'Vous avez tous les deux un humour absurde.' },
      { id: 'dry', label: 'Pince-sans-rire', emoji: '', shared: 'Vous partagez un humour pince-sans-rire.' },
      { id: 'tease', label: 'Taquin', emoji: '', shared: 'Vous aimez tous les deux vous taquiner.' },
      { id: 'tender', label: 'Tendre', emoji: '', shared: 'Vous avez tous les deux un humour tendre.' },
      { id: 'selfmock', label: 'Autodérision', emoji: '', shared: 'L’autodérision est votre point commun.' },
    ],
    diff: 'Vos humours ne sont pas les mêmes : on verra si ça fait des étincelles.',
  },
  {
    id: 'passions', cat: 'C', type: 'multi', max: 3,
    title: 'Tes passions',
    hint: 'Jusqu’à 3.',
    options: [
      { id: 'music', label: 'Musique', emoji: '', shared: 'La musique vous passionne tous les deux.' },
      { id: 'cook', label: 'Cuisine', emoji: '', shared: 'Vous aimez tous les deux cuisiner.' },
      { id: 'sport', label: 'Sport', emoji: '', shared: 'Le sport fait partie de vos deux vies.' },
      { id: 'games', label: 'Jeux', emoji: '', shared: 'Vous aimez tous les deux jouer.' },
      { id: 'nature', label: 'Nature', emoji: '', shared: 'La nature vous ressource tous les deux.' },
      { id: 'cinema', label: 'Cinéma & séries', emoji: '', shared: 'Le cinéma vous rassemble.' },
      { id: 'art', label: 'Arts', emoji: '', shared: 'L’art vous rassemble.' },
      { id: 'books', label: 'Lecture', emoji: '', shared: 'Vous aimez tous les deux lire.' },
    ],
    diff: 'Vos passions sont différentes : chacun a de quoi faire découvrir quelque chose.',
  },
  {
    id: 'habits', cat: 'C', type: 'dilemma',
    title: 'Tes habitudes, plutôt…',
    options: [
      { id: 'early', label: 'Matin & lumière', emoji: '', shared: 'Vous êtes tous les deux du matin.' },
      { id: 'night', label: 'Soir & calme', emoji: '', shared: 'Vous êtes tous les deux du soir.' },
    ],
    diff: 'Vous avez des habitudes différentes : peut-être un sujet à découvrir.',
  },
  {
    id: 'rhythm', cat: 'C', type: 'scale',
    title: 'Ton rythme de vie ?',
    scale: { left: 'Calme et posé', right: 'Intense et rempli', steps: 5 },
    sharedScale: 'Vos rythmes de vie se ressemblent.',
    diff: 'Vos rythmes de vie diffèrent : l’un plus calme, l’autre plus rempli.',
  },
  {
    id: 'pleasures', optional: true, cat: 'C', type: 'cards',
    title: 'Ton petit plaisir irremplaçable ?',
    options: [
      { id: 'bakery', label: 'Une viennoiserie chaude', emoji: '', shared: 'Une viennoiserie chaude vous rend heureux tous les deux.' },
      { id: 'bath', label: 'Un long moment au calme', emoji: '', shared: 'Un long moment au calme est votre plaisir à tous les deux.' },
      { id: 'vinyl', label: 'Mettre un disque et danser seul·e', emoji: '', shared: 'Danser seul·e dans le salon, vous connaissez tous les deux.' },
      { id: 'market', label: 'Flâner dans un marché', emoji: '', shared: 'Flâner dans un marché, vous adorez tous les deux.' },
    ],
    diff: 'Vos petits plaisirs sont différents : deux manières de se faire du bien.',
  },
  {
    id: 'discovery', cat: 'C', type: 'open', optional: true,
    title: 'Un endroit, une activité ou un plat que tu rêves de découvrir ?',
    hint: 'Facultatif. Tu peux passer.',
  },
]

export const REGIONS = [
  'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Bretagne', 'Centre-Val de Loire', 'Corse',
  'Grand Est', 'Hauts-de-France', 'Île-de-France', 'Normandie', 'Nouvelle-Aquitaine', 'Occitanie',
  'Pays de la Loire', 'Provence-Alpes-Côte d’Azur', 'Outre-mer', 'Hors de France',
]

export const GENDERS = [
  { id: 'woman', label: 'Une femme' },
  { id: 'man', label: 'Un homme' },
  { id: 'nonbinary', label: 'Une personne non-binaire' },
] as const

// ---------- Le Miroir ----------
export interface MirrorQ { id: string; q: string; options: { id: string; label: string; emoji: string }[]; follow: string }
export const MIRROR: MirrorQ[] = [
  { id: 'm1', q: 'Qu’est-ce qui te fait te sentir aimé·e ?', follow: 'Quel est le dernier moment où tu t’es senti·e comme ça ?', options: [
    { id: 'a', label: 'Qu’on me regarde vraiment quand je parle', emoji: '' },
    { id: 'b', label: 'Un geste inattendu', emoji: '' },
    { id: 'c', label: 'Passer du temps sans rien faire de spécial', emoji: '' },
    { id: 'd', label: 'Qu’on me dise les choses', emoji: '' } ] },
  { id: 'm2', q: 'Un dimanche parfait, c’est…', follow: 'Et si tu devais l’organiser pour deux, tu changerais quoi ?', options: [
    { id: 'a', label: 'Une grasse matinée puis un bon repas', emoji: '' },
    { id: 'b', label: 'Une aventure à l’extérieur', emoji: '' },
    { id: 'c', label: 'Un projet créatif', emoji: '' },
    { id: 'd', label: 'Des proches autour d’une table', emoji: '' } ] },
  { id: 'm3', q: 'Ce que j’aimerais qu’on me demande plus souvent…', follow: 'Pourquoi cette question te ferait plaisir ?', options: [
    { id: 'a', label: 'De quoi j’ai besoin', emoji: '' },
    { id: 'b', label: 'Ce qui me rend fier·ère', emoji: '' },
    { id: 'c', label: 'Ce qui me fait rire', emoji: '' },
    { id: 'd', label: 'Ce dont je rêve', emoji: '' } ] },
  { id: 'm4', q: 'Dans une relation, la confiance se construit surtout avec…', follow: 'Y a-t-il un petit geste qui, pour toi, compte beaucoup ?', options: [
    { id: 'a', label: 'La régularité', emoji: '' },
    { id: 'b', label: 'L’honnêteté, même difficile', emoji: '' },
    { id: 'c', label: 'Le temps', emoji: '' },
    { id: 'd', label: 'La liberté laissée', emoji: '' } ] },
]

// ---------- La Boussole ----------
export interface CompassScenario { id: string; title: string; text: string; ways: { id: string; label: string; why: string; angle: number }[] }
// angle : 0 = nord (en parler), 90 = est (s'adapter), 180 = sud (recul), 270 = ouest (compromis)
export const COMPASS: CompassScenario[] = [
  { id: 'c1', title: 'La soirée prévue', text: 'Vous aviez prévu une soirée ensemble, mais l’un de vous est épuisé.', ways: [
    { id: 'n', angle: 0, label: 'Je le dis franchement et on décide à deux', why: 'La clarté évite les malentendus.' },
    { id: 'e', angle: 90, label: 'Je m’adapte à l’énergie de l’autre', why: 'Le bien-être de l’autre passe avant le plan.' },
    { id: 's', angle: 180, label: 'Je propose de reporter et je prends soin de moi', why: 'Se reposer permet d’être présent·e ensuite.' },
    { id: 'w', angle: 270, label: 'Je propose une version plus douce de la soirée', why: 'Garder l’envie d’être ensemble sans forcer.' } ] },
  { id: 'c2', title: 'Le message sans réponse', text: 'Votre message est resté sans réponse depuis la veille.', ways: [
    { id: 'n', angle: 0, label: 'J’envoie un petit mot pour prendre des nouvelles', why: 'Briser le silence simplement.' },
    { id: 'e', angle: 90, label: 'Je me dis que l’autre a sa vie et je continue la mienne', why: 'La confiance laisse de l’air.' },
    { id: 's', angle: 180, label: 'J’attends d’avoir le cœur tranquille avant de répondre à mon tour', why: 'Ne pas agir sous le coup de l’inquiétude.' },
    { id: 'w', angle: 270, label: 'On en reparle la prochaine fois : comment aimez-vous communiquer ?', why: 'Poser le cadre ensemble, sans reproche.' } ] },
  { id: 'c3', title: 'Le week-end divisé', text: 'L’un rêve d’un week-end en pleine nature, l’autre d’une ville animée.', ways: [
    { id: 'n', angle: 0, label: 'Je défends mon idée avec enthousiasme', why: 'Donner envie par la passion.' },
    { id: 'e', angle: 90, label: 'Je laisse l’autre choisir cette fois', why: 'Offrir un moment qui lui ressemble.' },
    { id: 's', angle: 180, label: 'Chacun garde un petit moment à soi', why: 'S’autoriser des envies séparées.' },
    { id: 'w', angle: 270, label: 'Je cherche un lieu qui mélange les deux', why: 'Inventer une troisième option.' } ] },
  { id: 'c4', title: 'Le sujet délicat', text: 'Un sujet sensible revient sur la table pendant le dîner.', ways: [
    { id: 'n', angle: 0, label: 'On en parle maintenant, ouvertement', why: 'Mieux vaut ne pas laisser d’épine.' },
    { id: 'e', angle: 90, label: 'J’écoute d’abord, sans me défendre', why: 'Comprendre avant de répondre.' },
    { id: 's', angle: 180, label: 'Je demande qu’on y revienne quand on sera posés', why: 'Choisir le bon moment.' },
    { id: 'w', angle: 270, label: 'On reformule chacun ce que l’autre vient de dire', why: 'S’assurer de bien se comprendre.' } ] },
  { id: 'c5', title: 'La bonne nouvelle', text: 'Quelque chose de très heureux t’arrive. Avec qui as-tu envie de le vivre ?', ways: [
    { id: 'n', angle: 0, label: 'Je l’annonce tout de suite à mon partenaire', why: 'Partager vite fait vivre la joie.' },
    { id: 'e', angle: 90, label: 'Je prépare une petite mise en scène', why: 'Offrir un beau moment.' },
    { id: 's', angle: 180, label: 'Je savoure d’abord seul·e un instant', why: 'Laisser la joie atterrir.' },
    { id: 'w', angle: 270, label: 'On fête ça avec nos proches ensemble', why: 'Partager la joie en grand.' } ] },
]

// ---------- Le Pont ----------
export const BRIDGE_SEGMENTS = 4

// ---------- Notre moment (rituel quotidien) ----------
export interface Moment {
  id: string
  kind: 'question' | 'dilemma' | 'story' | 'coop' | 'voice' | 'discover'
  title: string
  prompt: string
  options?: string[]
}
export const MOMENTS: Moment[] = [
  { id: 'mo1', kind: 'question', title: 'Une question inattendue', prompt: 'Si tu pouvais maîtriser instantanément une compétence inutile mais joyeuse, laquelle choisirais-tu ?' },
  { id: 'mo2', kind: 'dilemma', title: 'Un dilemme amusant', prompt: 'Tu préfères…', options: ['Dîner tous les soirs au petit-déjeuner', 'Prendre le petit-déjeuner tous les soirs en pyjama de fête'] },
  { id: 'mo3', kind: 'story', title: 'Une anecdote à partager', prompt: 'Raconte un souvenir d’enfance qui te fait encore sourire.' },
  { id: 'mo4', kind: 'coop', title: 'Un petit défi à deux', prompt: 'Chacun écrit trois mots. Essayez d’inventer une mini-histoire avec les six mots.' },
  { id: 'mo5', kind: 'voice', title: 'Un message vocal', prompt: 'Enregistre quelques secondes : raconte-moi ta journée en une phrase.' },
  { id: 'mo6', kind: 'discover', title: 'Une activité de découverte', prompt: 'Cherche une chanson que l’autre ne connaît sûrement pas, et dis pourquoi elle compte.' },
  { id: 'mo7', kind: 'question', title: 'Une question inattendue', prompt: 'Quelle est ta plus grande petite fierté de cette semaine ?' },
  { id: 'mo8', kind: 'dilemma', title: 'Un dilemme amusant', prompt: 'Tu préfères…', options: ['Pouvoir parler aux animaux', 'Pouvoir te souvenir de tous tes rêves'] },
]

export const INTRIGUING = [
  'Quelle est la dernière chose qui t’a fait rire à voix haute ?',
  'Si on te donnait une journée sans obligations, par quoi commencerais-tu ?',
  'Quel petit détail du quotidien te rend heureux·se sans que personne ne le sache ?',
]
export const ICEBREAKERS = [
  'Quel est ton plus beau souvenir de vacances ?',
  'Qu’est-ce qui te donne de l’énergie en ce moment ?',
  'Quelle chanson te rend de bonne humeur à coup sûr ?',
  'Qu’est-ce que tu aimerais apprendre cette année ?',
]

export function answerLabel(q: Question, a: { v: string | string[] | number | null } | undefined): string {
  if (!a || a.v == null || a.v === '') return 'Passée'
  if (q.type === 'scale') return `${q.scale!.left} ← ${a.v}/${q.scale!.steps} → ${q.scale!.right}`
  if (q.type === 'open') return String(a.v)
  const ids = Array.isArray(a.v) ? a.v : [String(a.v)]
  return ids.map((id) => q.options?.find((o) => o.id === id)).filter(Boolean).map((o) => o!.label).join(' · ') || 'Passée'
}
