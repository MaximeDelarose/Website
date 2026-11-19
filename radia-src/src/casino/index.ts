/**
 * Casino Royal ♛ — points d'entrée pour le reste du jeu (voir README.md).
 *  - `openCasino()` : ouvre l'écran (promesse résolue à la fermeture) ;
 *  - `grantCoins(n, reason)` : donne des PIÈCES gratuites (récompenses, événements) ;
 *  - `casinoStatus()` : solde et nouveautés (badges).
 * Les jeux se jouent avec les pièces de RADIA (portefeuille unique) ; les écrans sont chargés à la demande.
 */
import './casino.css';
import { dbg } from '../core/debug';
import { cs, hooks, persist, notifyCasino, casinoStatus, grantCoins, onCasinoChange, type CasinoStatus } from './store';
import { balance, creditCoins } from './bank';
import { MISSIONS, DISTINCT_STAT, claimableCount } from './missions';
import { exactRtp, drawReels, evaluate } from './slots';
import { freshShuffledDeck } from './blackjack';
import { seededRng, defaultRng } from './rng';

export { grantCoins, casinoStatus, onCasinoChange };
export type { CasinoStatus };

let opening: Promise<void> | null = null;

/** Ouvre le Casino Royal (écran plein cadre au-dessus du jeu). Résolu quand la joueuse le quitte. */
export function openCasino(): Promise<void> {
  if (opening) return opening;
  opening = import('./ui/app').then((m) => m.runCasino()).catch((e) => { console.error('casino', e); }).finally(() => { opening = null; });
  return opening;
}

dbg('casino', {
  open: () => openCasino(),
  give: (n: number) => grantCoins(n, 'debug'),
  /** Fixe la bourse (pièces du jeu) : outil de test. */
  set: (n: number) => { const s = cs(); const cur = balance(); const want = Math.max(0, Math.floor(n)); if (want > cur) creditCoins(want - cur); else if (want < cur) import('./bank').then((m) => m.debitCoins(cur - want)); s.welcomed = true; persist(); notifyCasino(); return want; },
  state: () => ({ ...cs(), coins: balance(), status: casinoStatus(), claimable: claimableCount(cs()) }),
  /** Un nombre 0..36 impose la prochaine case ; une autre valeur (graine) rend le RNG reproductible. */
  roulette: (x: number) => { if (Number.isInteger(x) && x >= 0 && x <= 36) { hooks.roulette = x; return `prochaine case : ${x}`; } hooks.rng = seededRng(x); return `RNG graine ${x}`; },
  /** Simule n tirages purs (aucune pièce touchée) : { rtp, hit, theorique }. */
  slots: (n = 100000, seed?: number) => {
    const rng = seed === undefined ? defaultRng : seededRng(seed);
    let sum = 0, hit = 0;
    for (let i = 0; i < n; i++) { const m = evaluate(drawReels(rng)).mult; sum += m; if (m > 0) hit++; }
    return { n, rtp: sum / n, hit: hit / n, theorique: exactRtp().rtp };
  },
  /** Fixe la graine de la prochaine donne ; renvoie les 4 premières cartes distribuées. */
  blackjack: (seed: number) => { hooks.deckSeed = seed; const d = freshShuffledDeck(seededRng(seed)).slice(-4).reverse(); return d.map((c) => `${c.rank}/${c.suit}`); },
  /** Rend une mission réclamable. */
  mission: (id: string) => {
    const m = MISSIONS.find((x) => x.id === id); if (!m) return 'mission inconnue';
    const st = cs().stats;
    if (m.stat === DISTINCT_STAT) for (const g of ['roulette', 'slots', 'blackjack']) st[`${g}.parties`] = Math.max(1, st[`${g}.parties`] ?? 0);
    else st[m.stat] = Math.max(m.goal, st[m.stat] ?? 0);
    persist(); notifyCasino(); return `${id} réclamable`;
  },
  reset: () => { const s = cs(); s.welcomed = false; s.stats = {}; s.history = []; s.missions = []; persist(); notifyCasino(); return 'casino remis à zéro'; },
  /** Aperçu de la bannière « grosse victoire » (aucune pièce versée). */
  bigWin: async (n = 1750, jackpot = false) => { const m = await import('./fx'); await m.bigWinBanner(n, jackpot ? 'jackpot' : 'big'); return 'ok'; },
  /** Remet les mini-défis du jour à zéro. */
  resetTasks: () => { const st = cs().stats; for (const k of Object.keys(st)) if (k.startsWith('dq.') || k.startsWith('cap.')) delete st[k]; persist(); notifyCasino(); return 'défis remis à zéro'; },
});
