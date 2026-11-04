/**
 * Attribution des récompenses : logique PURE (via un `RewardHost`), atomique et idempotente.
 *  - la clé d'idempotence est marquée (et écrite) AVANT tout versement ;
 *  - les objets déjà possédés sont convertis en pièces, comme ailleurs dans le jeu ;
 *  - une récompense `granted` (déjà versée par l'appelant) n'est qu'affichée.
 */
import type { GiftSpec, GrantResult, Reward, RewardHost, Shown } from './types';
import { genericLabel, mergeRewards } from './logic';

/** Clés utilisées pendant cette session (double filet si l'hôte ne persiste pas). */
const seenKeys = new Set<string>();
export const resetGrantMemory = (): void => { seenKeys.clear(); };

function resolveOne(r: Reward, host: RewardHost): Shown {
  const name = r.label ?? host.nameOf(r.type, r.id ?? '') ?? genericLabel(r);
  return { ...r, name };
}

/** Attribue un cadeau (UNE fois) et renvoie ce qu'il faut montrer. Ne lève jamais d'exception. */
export function grantGift(spec: GiftSpec, host: RewardHost): GrantResult {
  if (spec.key) {
    if (seenKeys.has(spec.key)) return { fresh: false, shown: [] };
    let first = false;
    try { first = host.once(spec.key); } catch { first = false; }
    seenKeys.add(spec.key);
    if (!first) return { fresh: false, shown: [] };
  }
  const shown: Shown[] = [];
  let backCoins = 0;
  for (const r of mergeRewards(spec.rewards)) {
    const s = resolveOne(r, host);
    try {
      if (r.granted) { shown.push(s); continue; }
      const n = Math.max(0, Math.floor(r.qty));
      switch (r.type) {
        case 'coins': host.addRes('coins', n); break;
        case 'res': host.addRes(r.id === 'flowers' || r.id === 'fabric' || r.id === 'cocoa' ? r.id : 'coins', n); break;
        case 'diamonds': host.giveDiamonds(n); break;
        case 'energy': host.giveEnergy(n); break;
        case 'tickets': host.giveTickets(n); break;
        case 'hearts': host.addHearts(n); break;
        case 'chest': host.addChest(n); break;
        case 'item': if (r.id === 'wand' || r.id === 'wind') host.giveBooster(r.id, n); break;
        case 'bouquet': if (r.id) host.addBouquet(r.id, n); break;
        case 'cloth':
          if (!r.id) break;
          if (host.ownsCloth(r.id)) { const b = host.clothBack(r.id); if (b !== null) { backCoins += b; shown.push({ ...s, type: 'coins', id: undefined, qty: b, icon: undefined, dup: { from: s.name }, name: 'pièces' }); continue; } break; }
          host.giveCloth(r.id); break;
        case 'furniture':
          if (!r.id) break;
          if (host.ownsFurniture(r.id)) { const b = host.furnitureBack(r.id); if (b !== null) { backCoins += b; shown.push({ ...s, type: 'coins', id: undefined, qty: b, icon: undefined, dup: { from: s.name }, name: 'pièces' }); continue; } break; }
          host.giveFurniture(r.id); break;
        case 'memory':
          if (!r.id) break;
          if (!host.unlockMemory(r.id)) { backCoins += 50; shown.push({ ...s, type: 'coins', id: undefined, qty: 50, icon: undefined, dup: { from: s.name }, name: 'pièces' }); continue; }
          break;
      }
    } catch (e) { console.error('[rewards] attribution', r.type, e); }
    shown.push(s);
  }
  if (backCoins > 0) { try { host.addRes('coins', backCoins); } catch (e) { console.error('[rewards] compensation', e); } }
  try { host.persist(); } catch (e) { console.error('[rewards] sauvegarde', e); }
  return { fresh: true, shown };
}
