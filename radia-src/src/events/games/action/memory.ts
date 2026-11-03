/** Défi mémoire : paires et séquence (logique pure). */
export const SYMBOLS = ['rose', 'tulip', 'peony', 'daisy', 'heart', 'truffle', 'dress', 'heel', 'bag', 'shades', 'crown', 'lipstick'] as const;
export type Symbol_ = (typeof SYMBOLS)[number];

export interface GridSpec { rows: number; cols: number; pairs: number }
export const gridFor = (level: number): GridSpec => (level >= 3 ? { rows: 5, cols: 4, pairs: 10 } : { rows: 4, cols: 4, pairs: 8 });

/** Paquet mélangé (déterministe pour un rng) : chaque symbole en double. */
export function buildDeck(rng: () => number, pairs: number): Symbol_[] {
  const pool = [...SYMBOLS];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const chosen = pool.slice(0, pairs);
  const deck = [...chosen, ...chosen];
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  return deck;
}

/** Étoiles selon les coups (une paire retournée = un coup) et le temps. */
export function pairStars(moves: number, pairs: number, seconds: number): 1 | 2 | 3 {
  const par = pairs * 1.7;
  if (moves <= par && seconds <= pairs * 11) return 3;
  if (moves <= pairs * 2.6 || seconds <= pairs * 9) return 2;
  return 1;
}
export function seqStars(retries: number): 1 | 2 | 3 { return retries === 0 ? 3 : retries <= 2 ? 2 : 1; }
export function finalStars(a: number, b: number): 1 | 2 | 3 { return Math.max(1, Math.min(3, Math.round((a + b) / 2))) as 1 | 2 | 3; }
export const starScore = (stars: number): number => (stars >= 3 ? 100 : stars === 2 ? 75 : 50);

/** Séquence de pastilles (0..3) : longueur par manche, jamais plus de 2 identiques à la suite. */
export function sequence(rng: () => number, length: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < length; i++) {
    let v = Math.floor(rng() * 4);
    if (i >= 2 && out[i - 1] === v && out[i - 2] === v) v = (v + 1) % 4;
    out.push(v);
  }
  return out;
}
export const roundLengths = (level: number): number[] => (level >= 3 ? [3, 4, 5, 6] : level === 2 ? [3, 4, 5] : [2, 3, 4]);
/** Vérifie la saisie : 'ok' (correct, incomplet), 'done', 'wrong'. */
export function checkInput(seq: readonly number[], input: readonly number[]): 'ok' | 'done' | 'wrong' {
  for (let i = 0; i < input.length; i++) if (input[i] !== seq[i]) return 'wrong';
  return input.length === seq.length ? 'done' : 'ok';
}
