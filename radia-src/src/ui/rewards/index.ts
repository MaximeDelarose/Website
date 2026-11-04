/**
 * Ouverture de cadeaux et de coffres : API réutilisable (voir README.md).
 *
 *   await openGift({ kind: 'chest', rarity: 'epic', title: 'Coffre épique !', rewards: [{ type: 'diamonds', qty: 25 }] });
 *
 * L'attribution passe par un `RewardHost` (par défaut : les fonctions existantes du jeu) et se fait AVANT la mise en
 * scène, une seule fois (clé d'idempotence optionnelle) : fermer ou quitter ne fait jamais perdre une récompense.
 * Ce module n'importe ni DOM ni jeu au chargement : la scène et l'hôte par défaut sont chargés à la demande.
 */
import { grantGift } from './grant';
import { flattenChain, sanitizeSpec } from './logic';
import type { GiftSpec, RewardHost } from './types';
import type { PreparedGift } from './scene';

export type { GiftSpec, GiftKind, GiftRarity, Reward, RewardHost, RewardType, Shown } from './types';
export { lookFor, sanitizeSpec, RARITY_COLOR, augusteNote } from './logic';
export { grantGift } from './grant';

let hostOverride: RewardHost | null = null;
let hostCache: RewardHost | null = null;
/** Remplace l'hôte par défaut (tests, outils). `null` : retour au comportement normal. */
export function setRewardHost(h: RewardHost | null): void { hostOverride = h; }
async function getHost(): Promise<RewardHost> {
  if (hostOverride) return hostOverride;
  hostCache ??= (await import('./host')).defaultHost();
  return hostCache;
}

let tail: Promise<void> = Promise.resolve();
let prepTail: Promise<void> = Promise.resolve();
let pending = 0;
/** Une ouverture est en cours ou en attente. */
export const giftBusy = (): boolean => pending > 0;
/** Résout quand plus aucune ouverture n'est en cours ni en attente (pour ne rien afficher par-dessus). */
export async function whenGiftIdle(): Promise<void> {
  while (pending > 0) await new Promise<void>((r) => setTimeout(r, 120));
}

const hasDom = (): boolean => typeof document !== 'undefined' && !!document.body;

/**
 * Attribue puis met en scène un cadeau (et son `chain`, 3 au plus). Les ouvertures s'enchaînent une à une.
 * La promesse est résolue quand le calque a DISPARU (jamais de rejet). `opts.host` : hôte propre à cet appel ;
 * `opts.actions` : jusqu'à 2 boutons secondaires (« Équiper », « Placer »…) sur le DERNIER cadeau, exécutés après la fermeture.
 */
export async function openGift(spec: GiftSpec, opts: { host?: RewardHost; actions?: { label: string; run: () => void }[] } = {}): Promise<void> {
  pending++;
  try {
    // l'attribution se fait tout de suite mais DANS L'ORDRE des appels (les imports asynchrones ne doivent pas inverser la file)
    const prep = prepTail.then(async () => {
      const clean = sanitizeSpec(spec);
      const host = opts.host ?? (await getHost());
      const prepared: PreparedGift[] = [];
      for (const g of flattenChain(clean)) {
        const r = grantGift(g, host);
        if (r.fresh) prepared.push({ spec: g, shown: r.shown });
      }
      return { host, prepared };
    });
    prepTail = prep.then(() => undefined, () => undefined);
    const { host, prepared } = await prep;
    if (!prepared.length || !hasDom()) return;
    // 2. mise en scène, une à la fois
    const run = tail.catch(() => undefined).then(async () => {
      try { const m = await import('./scene'); await m.playGifts(prepared, host, opts.actions); } catch (e) { console.error('[rewards] scène', e); }
    });
    tail = run;
    await run;
  } catch (e) {
    console.error('[rewards] openGift', e);
  } finally {
    pending--;
  }
}

/** Ferme tout de suite les scènes en cours (démontage). */
export async function closeAllGifts(): Promise<void> {
  if (!hasDom()) return;
  (await import('./scene')).destroyAllScenes();
}
