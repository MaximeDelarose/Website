/**
 * Casino Royal ♛ — points d'entrée pour le reste du jeu (voir README.md).
 *  - `openCasino()` : ouvre l'écran (promesse résolue à la fermeture) ;
 *  - `grantChips(n, reason)` : donne des jetons gratuits (récompenses, événements) ;
 *  - `casinoStatus()` : solde et nouveautés (badges).
 * Jetons fictifs et gratuits ; les écrans sont chargés à la demande.
 */
import './casino.css';
import { dbg } from '../core/debug';
import { cs, hooks, persist, notifyCasino, casinoStatus, grantChips, onCasinoChange, type CasinoStatus } from './store';
import { setBring, total } from './chips';
import { MISSIONS, DISTINCT_STAT, claimableCount } from './missions';
import { exactRtp, drawReels, evaluate } from './slots';
import { freshShuffledDeck } from './blackjack';
import { seededRng, defaultRng } from './rng';

export { grantChips, casinoStatus, onCasinoChange };
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
  give: (n: number) => grantChips(n, 'debug'),
  set: (n: number) => { const s = cs(); s.bring = 0; s.chips = Math.max(0, Math.floor(n)); s.welcomed = true; persist(); notifyCasino(); return total(s); },
  state: () => ({ ...cs(), total: total(cs()), status: casinoStatus(), claimable: claimableCount(cs()) }),
  /** Un nombre 0..36 impose la prochaine case ; une autre valeur (graine) rend le RNG reproductible. */
  roulette: (x: number) => { if (Number.isInteger(x) && x >= 0 && x <= 36) { hooks.roulette = x; return `prochaine case : ${x}`; } hooks.rng = seededRng(x); return `RNG graine ${x}`; },
  /** Simule n tirages purs (aucun jeton touché) : { rtp, hit, theorique }. */
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
  reset: () => { const s = cs(); s.chips = 0; s.bring = 0; s.welcomed = false; s.refillTs = 0; s.stats = {}; s.history = []; s.missions = []; persist(); notifyCasino(); return 'casino remis à zéro'; },
  take: (n: number) => setBring(cs(), n),
});
