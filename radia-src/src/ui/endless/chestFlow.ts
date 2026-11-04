/** Ouverture d'un coffre : animation par rareté, contenu posé sur le plateau ou crédité. */
import { h } from '../dom';
import { wallet } from '../../core/wallet';
import { save } from '../../core/app';
import { openChest, pendingChests, chestOdds } from '../../game/endless';
import * as R from '../../game/merge/rules';
import type { BoardEvent, Loot } from '../../game/merge/types';
import type { Rarity } from '../../data/items';
import { itemImageUrl } from '../../game/merge/textures';
import { groupLoot, LOOT_FLY } from './logic';
import { clothName, furnitureName, settleLoot } from './host';
import { openSheet } from './sheet';
import type { EndlessEnv } from './hud';
import { openGift } from '../rewards';
import { endlessChestSpec } from '../rewards/endless';
import type { GiftRarity } from '../rewards/types';

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/** Tableau des probabilités publiées (couleurs de rareté). */
export function oddsTable(): HTMLElement {
  const o = chestOdds();
  return h('div.en-odds',
    ...o.rows.map((r) => h('div.en-odds-row', h('i.en-dot', { style: `background:${r.color}` }), h('span', r.name), h('b', `${String(r.pct).replace('.', ',')} %`))),
    h('p.muted.en-odds-note', o.text));
}

export function openOddsSheet(): void {
  openSheet({ title: 'Probabilités des coffres', sub: 'Publiées telles quelles · aucun achat requis', body: h('div', oddsTable(), h('p.muted.en-odds-note', 'Les coffres se gagnent en jouant : jauge de trésor, drops, niveaux maximum.')) });
}

/** Ouvre UN coffre en attente. Renvoie faux s'il n'y en a pas. `force` : rareté imposée (mode développeur, visuel seulement). */
export async function openChestFlow(env: EndlessEnv, force?: Rarity): Promise<boolean> {
  const fun = save.data.fun;
  const res = openChest(fun);
  if (!res) return false;
  const rarity = force ?? res.rarity;
  const state = env.state();
  const placed = R.placeLoot(state, res.loot);
  const out = settleLoot(placed.loot);
  env.persist();

  // mise en scène : couche récompense unique au premier plan (le butin est déjà versé, rien n'est ajouté)
  const left = pendingChests(fun);
  const pick = { more: false };
  const spec = endlessChestSpec({
    rarity: rarity as GiftRarity,
    loot: placed.loot,
    cloth: out.cloth,
    furniture: out.furniture,
    dupCoins: out.dupCoins,
    itemIcon: (l) => ((l.kind === 'rareItem' || l.kind === 'star') && l.item ? itemImageUrl(l.item as never, 64) : undefined),
    names: { cloth: clothName, furniture: furnitureName },
  });
  await openGift(spec, left > 0 ? { actions: [{ label: `Ouvrir le suivant (${left})`, run: () => { pick.more = true; } }] } : {});

  // objets posés sur le plateau + monnaies qui rejoignent les compteurs
  afterOpen(env, placed.events, placed.loot, out.cloth, out.furniture);
  if (pick.more) {
    await sleep(500);
    await openChestFlow(env);
  }
  return true;
}

/** Après la fermeture : événements sur le plateau, envols de monnaies, inventaire. */
function afterOpen(env: EndlessEnv, events: BoardEvent[], loot: Loot[], cloth: string[], furniture: string[]): void {
  const sc = env.scene();
  if (events.length) env.push(events);
  for (const l of events) if (l.t === 'spawn') sc?.dropFx(l.at, 'rare');
  let k = 0;
  for (const l of groupLoot(loot)) {
    const fly = LOOT_FLY[l.kind];
    if (!fly || !sc) continue;
    const to = env.anchor(fly === 'diamond' ? 'diamonds' : fly === 'energy' ? 'energy' : fly === 'heart' ? 'hearts' : fly === 'chest' ? 'chest' : 'coins');
    window.setTimeout(() => sc.flyTo(fly, 14 + (k % 3), to, () => env.refreshRes()), 120 * k++);
  }
  wallet.notify();
  env.inventoryToast(cloth, furniture);
  env.refresh();
}
