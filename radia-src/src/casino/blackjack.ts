/**
 * Blackjack simplifié : règles PURES. Un paquet de 52 cartes mélangé honnêtement (Fisher–Yates) à chaque donne.
 * Tirer / Rester / Doubler ; l'As vaut 1 ou 11 ; le croupier tire jusqu'à 17 (il reste sur tous les 17) ;
 * blackjack naturel payé 3:2 ; égalité (push) : la mise est rendue ; pas de cartes truquées.
 */
import { shuffle, type Rng } from './rng';

export interface Card { /** 1 = As, 11 = Valet, 12 = Dame, 13 = Roi */ rank: number; /** 0 ♥, 1 ♦, 2 ♠, 3 ♣ */ suit: number }
export const SUITS = ['♥', '♦', '♠', '♣'] as const;
export const RANK_LABEL = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'V', 'D', 'R'] as const;
export const DEALER_STANDS_ON = 17;

export const newDeck = (): Card[] => {
  const d: Card[] = [];
  for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) d.push({ rank: r, suit: s });
  return d;
};
export const freshShuffledDeck = (rng: Rng): Card[] => shuffle(newDeck(), rng);

export const cardPoints = (c: Card): number => (c.rank === 1 ? 11 : Math.min(10, c.rank));

/** Valeur d'une main : les As valent 11 tant que ça ne fait pas dépasser 21 (sinon 1). `soft` : un As compte pour 11. */
export function handValue(cards: readonly Card[]): { total: number; soft: boolean } {
  let total = cards.reduce((a, c) => a + cardPoints(c), 0);
  let aces = cards.filter((c) => c.rank === 1).length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
}
export const isBlackjack = (cards: readonly Card[]): boolean => cards.length === 2 && handValue(cards).total === 21;
export const isBust = (cards: readonly Card[]): boolean => handValue(cards).total > 21;

export type Outcome = 'blackjack' | 'win' | 'lose' | 'push' | 'bust';
export type Phase = 'player' | 'done';

export interface Round { deck: Card[]; player: Card[]; dealer: Card[]; bet: number; doubled: boolean; phase: Phase; outcome: Outcome | null }

/** Mise réellement engagée (doublée si on a doublé). */
export const stakeOf = (r: Round): number => r.bet * (r.doubled ? 2 : 1);

/** Gain total RENDU pour une issue : 3:2 pour un blackjack, 1:1 pour une victoire, la mise pour un push. */
export function returnedFor(outcome: Outcome, stake: number): number {
  switch (outcome) {
    case 'blackjack': return stake + Math.floor((stake * 3) / 2);
    case 'win': return stake * 2;
    case 'push': return stake;
    default: return 0;
  }
}
export const returned = (r: Round): number => (r.outcome ? returnedFor(r.outcome, stakeOf(r)) : 0);

/** Donne : joueuse, croupier, joueuse, croupier (la 2e carte du croupier reste cachée côté interface). */
export function startRound(deck: Card[], bet: number): Round {
  const d = deck.slice();
  const draw = (): Card => d.pop()!;
  const p1 = draw(); const d1 = draw(); const p2 = draw(); const d2 = draw();
  const r: Round = { deck: d, player: [p1, p2], dealer: [d1, d2], bet, doubled: false, phase: 'player', outcome: null };
  const pBJ = isBlackjack(r.player);
  const dBJ = isBlackjack(r.dealer);
  if (pBJ || dBJ) { r.phase = 'done'; r.outcome = pBJ && dBJ ? 'push' : pBJ ? 'blackjack' : 'lose'; }
  return r;
}

export const canHit = (r: Round): boolean => r.phase === 'player';
/** Doubler : seulement sur les deux premières cartes, une seule fois. (Le solde est vérifié par l'appelant.) */
export const canDouble = (r: Round): boolean => r.phase === 'player' && r.player.length === 2 && !r.doubled;

/** Tire une carte pour la joueuse ; elle perd immédiatement si elle dépasse 21. */
export function hit(r: Round): Card | null {
  if (!canHit(r)) return null;
  const c = r.deck.pop()!;
  r.player.push(c);
  const v = handValue(r.player).total;
  if (v > 21) { r.phase = 'done'; r.outcome = 'bust'; }
  else if (v === 21) return c; // l'interface peut enchaîner sur « rester »
  return c;
}

/** Le croupier tire tant qu'il a moins de 17. Renvoie les cartes tirées (dans l'ordre). */
export function dealerPlay(r: Round): Card[] {
  const drawn: Card[] = [];
  while (handValue(r.dealer).total < DEALER_STANDS_ON) { const c = r.deck.pop()!; r.dealer.push(c); drawn.push(c); }
  return drawn;
}

/** Issue d'une main terminée sans naturel ni dépassement. */
export function compare(player: readonly Card[], dealer: readonly Card[]): Outcome {
  const p = handValue(player).total;
  const d = handValue(dealer).total;
  if (d > 21) return 'win';
  if (p > d) return 'win';
  if (p < d) return 'lose';
  return 'push';
}

/** Rester : le croupier joue, puis la main est réglée. */
export function stand(r: Round): Card[] {
  if (r.phase !== 'player') return [];
  const drawn = dealerPlay(r);
  r.outcome = compare(r.player, r.dealer);
  r.phase = 'done';
  return drawn;
}

/** Doubler : mise doublée, UNE carte, puis on reste. Renvoie la carte et les cartes du croupier. */
export function doubleDown(r: Round): { card: Card; dealerCards: Card[] } | null {
  if (!canDouble(r)) return null;
  r.doubled = true;
  const card = r.deck.pop()!;
  r.player.push(card);
  if (handValue(r.player).total > 21) { r.phase = 'done'; r.outcome = 'bust'; return { card, dealerCards: [] }; }
  return { card, dealerCards: stand(r) };
}
