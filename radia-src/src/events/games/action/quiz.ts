/** Cinéma : films fictifs, snacks, questions (logique pure). */
export interface Film { id: string; title: string; tag: string; colors: [string, string]; motif: 'heart' | 'tower' | 'flower' | 'star' }
export const FILMS: readonly Film[] = [
  { id: 'nuits-de-velours', title: 'Nuits de Velours', tag: 'Romance à Paris', colors: ['#f5a0bb', '#7a4f8f'], motif: 'tower' },
  { id: 'le-jardin-des-lunes', title: 'Le Jardin des Lunes', tag: 'Conte fleuri', colors: ['#b9a5e8', '#3f4a8a'], motif: 'flower' },
  { id: 'chocolat-et-etoiles', title: 'Chocolat & Étoiles', tag: 'Comédie gourmande', colors: ['#d79a6b', '#58433f'], motif: 'star' },
  { id: 'mon-coeur-en-soie', title: 'Mon Cœur en Soie', tag: 'Drame de mode', colors: ['#ff8fb6', '#e8558f'], motif: 'heart' },
];
export interface Snack { id: string; name: string }
export const SNACKS: readonly Snack[] = [
  { id: 'popcorn', name: 'Pop-corn caramel' }, { id: 'choco', name: 'Chocolat praliné' }, { id: 'soda', name: 'Limonade rose' },
  { id: 'macaron', name: 'Macarons' }, { id: 'icecream', name: 'Glace vanille' }, { id: 'candy', name: 'Bonbons cœurs' },
  { id: 'cotton', name: 'Barbe à papa' }, { id: 'tea', name: 'Thé glacé pêche' },
];
export const MAX_SNACKS = 3;

export interface Question { q: string; choices: [string, string, string, string]; a: number; fun: string }
export const QUESTIONS: readonly Question[] = [
  { q: 'Dans quelle ville se déroule le monde de RADIA ?', choices: ['Paris', 'Rome', 'Tokyo', 'Lisbonne'], a: 0, fun: 'Paris, ville des lumières ♡' },
  { q: 'Quelle fleur ressemble à un petit soleil ?', choices: ['Lavande', 'Tournesol', 'Orchidée', 'Tulipe'], a: 1, fun: 'Le tournesol suit la lumière !' },
  { q: 'Quelle fleur est violette et sent si bon dans les champs ?', choices: ['Marguerite', 'Pivoine', 'Lavande', 'Lys'], a: 2, fun: 'La lavande parfume les armoires.' },
  { q: 'Quel chocolat est le plus clair ?', choices: ['Chocolat noir', 'Chocolat blanc', 'Truffe', 'Praliné'], a: 1, fun: 'Le chocolat blanc ne contient pas de cacao pur.' },
  { q: 'Quelle forme a un chocolat de Saint-Valentin ?', choices: ['Un cœur', 'Un carré gris', 'Un cube', 'Une pyramide'], a: 0, fun: 'Un cœur en chocolat, évidemment.' },
  { q: 'Quelle pièce se porte aux pieds ?', choices: ['Un foulard', 'Un chemisier', 'Des talons', 'Un diadème'], a: 2, fun: 'Les talons ajoutent un petit pas de danse.' },
  { q: 'Que met-on sur la tête d’une reine ?', choices: ['Une couronne', 'Un sac', 'Un gant', 'Une écharpe de pieds'], a: 0, fun: 'Ou un diadème de perles.' },
  { q: 'Quel monument en fer est célèbre à Paris ?', choices: ['Le Colisée', 'La tour Eiffel', 'La Grande Muraille', 'Big Ben'], a: 1, fun: 'Elle scintille chaque soir.' },
  { q: 'Que mange-t-on souvent au petit-déjeuner à Paris ?', choices: ['Un croissant', 'Une pizza entière', 'Des sushis', 'Un burger'], a: 0, fun: 'Un croissant bien beurré, miam.' },
  { q: 'Quel accessoire protège du soleil ?', choices: ['Des lunettes de soleil', 'Des gants de cuisine', 'Un bonnet de bain', 'Des talons'], a: 0, fun: 'Chic et pratique.' },
  { q: 'Que trouve-t-on au centre d’une marguerite ?', choices: ['Un disque jaune', 'Un diamant', 'Une plume', 'Un bonbon'], a: 0, fun: 'Un petit soleil entouré de pétales blancs.' },
  { q: 'Quelle fleur est le symbole des déclarations d’amour ?', choices: ['La rose rouge', 'Le pissenlit', 'Le cactus', 'Le trèfle'], a: 0, fun: 'La rose, reine des bouquets.' },
  { q: 'Que fait-on dans un salon de couture ?', choices: ['On répare des vélos', 'On crée des vêtements', 'On cuit du pain', 'On plante des arbres'], a: 1, fun: 'Du tissu, des ciseaux, de l’imagination !' },
  { q: 'Quel ingrédient donne le chocolat ?', choices: ['Le cacao', 'La menthe', 'Le citron', 'Le riz'], a: 0, fun: 'Les fèves de cacao, bien sûr.' },
  { q: 'Que dit-on pour porter un joli toast ?', choices: ['À la vôtre !', 'Bonne nuit !', 'Au revoir !', 'Attention !'], a: 0, fun: 'Tchin tchin ♡' },
  { q: 'Qu’est-ce qui brille dans le ciel un soir de fête ?', choices: ['Un feu d’artifice', 'Un tapis', 'Un fauteuil', 'Un cadre'], a: 0, fun: 'Boum, des étoiles de toutes les couleurs.' },
  { q: 'Quelle couleur est souvent associée à la romance ?', choices: ['Le rose', 'Le gris souris', 'Le kaki', 'Le marron boue'], a: 0, fun: 'Rose et crème : la palette de RADIA.' },
];

/** Tire n questions distinctes ; mélange aussi l’ordre des réponses (la bonne est suivie). Déterministe pour un rng donné. */
export function drawQuestions(rng: () => number, n = 5, pool: readonly Question[] = QUESTIONS): Question[] {
  const idx = pool.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx.slice(0, Math.min(n, pool.length)).map((i) => shuffleChoices(pool[i], rng));
}
export function shuffleChoices(q: Question, rng: () => number): Question {
  const order = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const choices = order.map((o) => q.choices[o]) as Question['choices'];
  return { ...q, choices, a: order.indexOf(q.a) };
}
/** Score 0..100 : bonne réponse = 20 ; le film ne change rien. */
export const quizScore = (correct: number, total = 5): number => Math.round((correct / total) * 100);
