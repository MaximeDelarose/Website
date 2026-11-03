/**
 * Déroulé de l'histoire : une simple liste d'étapes jouées dans l'ordre.
 * La sauvegarde retient l'index de la prochaine étape (story.step), ce qui
 * permet de reprendre exactement là où on s'était arrêté.
 */
export type StoryStep =
  | { t: 'dialogue'; id: string }
  | { t: 'chapter'; ch: number }
  | { t: 'level'; id: number }
  | { t: 'minigame'; id: 'puzzle' | 'billard' | 'chemin' }
  | { t: 'memory'; id: string }
  | { t: 'queen' }
  | { t: 'unlockChess' }
  | { t: 'final' };

export interface ChapterDef { n: number; title: string; subtitle: string }

export const CHAPTERS: ChapterDef[] = [
  { n: 1, title: 'Une fleur pour toi', subtitle: 'Le jardin' },
  { n: 2, title: 'C\'est cool dans le Nord de Paris bb', subtitle: 'Paris, la nuit' },
  { n: 3, title: 'Les petits souvenirs', subtitle: 'Cinéma, billard et balades' },
  { n: 4, title: 'Ma reine', subtitle: 'Le royaume' },
  { n: 5, title: 'Le monde que j\'ai créé', subtitle: 'Tous nos souvenirs' },
];

const L = (id: number): StoryStep => ({ t: 'level', id });
const D = (id: string): StoryStep => ({ t: 'dialogue', id });
const M = (id: string): StoryStep => ({ t: 'memory', id });

export const STORY: StoryStep[] = [
  D('intro'),
  { t: 'chapter', ch: 1 },
  L(1), D('basket'), L(2), L(3), D('bouquet'), M('flowers'), D('orders'), L(4), D('gifts'), L(5), D('combo'), L(6), D('ch1_end'),

  { t: 'chapter', ch: 2 },
  D('ch2_intro'), M('nord'),
  L(7), L(8), L(9), D('arc_intro'), { t: 'minigame', id: 'puzzle' }, D('arc_done'), M('arc'),
  L(10), L(11), L(12), D('ch2_end'),

  { t: 'chapter', ch: 3 },
  D('ch3_intro'),
  L(13), L(14), D('cinema'), M('cinema'), L(15), L(16),
  D('billard_intro'), { t: 'minigame', id: 'billard' }, D('billard_done'), M('billard'),
  L(17), L(18), D('promenade'), M('promenade'),

  { t: 'chapter', ch: 4 },
  D('ch4_intro'),
  D('pawn'), L(19), L(20), L(21), L(22), D('queen'), { t: 'queen' }, L(23), L(24), D('crown'), M('royaume'), { t: 'unlockChess' },

  { t: 'chapter', ch: 5 },
  D('ch5_intro'),
  L(25), L(26), D('thousand'), L(27), D('chemin_intro'), { t: 'minigame', id: 'chemin' }, D('chemin_done'),
  L(28), L(29), D('last'), L(30),
  { t: 'final' }, M('monde'),
];

/** Chapitre en cours à une étape donnée. */
export function chapterAt(step: number): number {
  let ch = 1;
  for (let i = 0; i <= Math.min(step, STORY.length - 1); i++) {
    const s = STORY[i];
    if (s.t === 'chapter') ch = s.ch;
  }
  return ch;
}

/** Index de l'étape d'un niveau. */
export const levelStep = (id: number) => STORY.findIndex((s) => s.t === 'level' && s.id === id);

/** Identifiant stable d'une étape (sert à retrouver sa place si l'histoire change). */
export function stepKey(s: StoryStep): string {
  switch (s.t) {
    case 'dialogue': case 'memory': return `${s.t}:${s.id}`;
    case 'level': return `level:${s.id}`;
    case 'minigame': return `minigame:${s.id}`;
    case 'chapter': return `chapter:${s.ch}`;
    default: return s.t;
  }
}

/**
 * Retrouve l'index de l'étape sauvegardée : si une mise à jour a inséré ou
 * retiré des étapes, on se recale sur l'identifiant mémorisé.
 */
export function reconcileStep(step: number, key: string | undefined): number {
  if (!key) return Math.min(step, STORY.length);
  if (step < STORY.length && stepKey(STORY[step]) === key) return step;
  const found = STORY.findIndex((s) => stepKey(s) === key);
  return found >= 0 ? found : Math.min(step, STORY.length);
}
