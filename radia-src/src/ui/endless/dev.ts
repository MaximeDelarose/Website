/** Mode développeur (?debug uniquement, jamais visible pour Radia) : window.RADIA.endless.* */
import { dbg } from '../../core/debug';
import { save } from '../../core/app';
import { wallet } from '../../core/wallet';
import { addRes } from '../../core/world';
import { addTreasure, giveChest, isAuto, pendingChests, secondaryView, treasureView, bump, albumProgress, activeColls } from '../../game/endless';
import { ENDLESS_CFG } from '../../game/endless/config';
import * as R from '../../game/merge/rules';
import type { BoardEvent, LevelDef, Loot, LootKind, RunState } from '../../game/merge/types';
import type { ItemColl, Rarity } from '../../data/items';
import type { MergeScene } from '../../game/merge/MergeScene';
import type { EndlessHud } from './hud';

export interface DevCtx {
  hud: EndlessHud;
  getState: () => RunState;
  getScene: () => MergeScene | null;
  def: LevelDef;
  push: (ev: BoardEvent[]) => void;
  onEvents: (ev: BoardEvent[]) => void;
  restart: () => void;
}

const AMOUNT: Partial<Record<LootKind, number>> = { coins: 60, diamonds: 2, energy: 5, hearts: 10, flowers: 4, fabric: 4, cocoa: 4, chest: 1, ticket: 1, fragment: 1, cloth: 1, bag: 1, accessory: 1, deco: 1 };

export function installEndlessDebug(c: DevCtx): void {
  const fun = () => save.data.fun;
  dbg('endless', {
    addCoins: (n = 1000) => { addRes('coins', n); c.hud.refresh(); },
    addRes: (k: 'coins' | 'flowers' | 'fabric' | 'cocoa', n = 100) => { addRes(k, n); c.hud.refresh(); },
    giveEnergy: (n = 50) => wallet.giveEnergy(n),
    spawn: (coll: ItemColl, level: number) => c.push(R.placeItem(c.getState(), c.def, { c: coll, l: level })),
    gen: (kind: number) => c.push(R.placeItem(c.getState(), c.def, { c: 'gen', l: kind })),
    fillGauge: () => {
      const won = addTreasure(fun(), ENDLESS_CFG.treasure.goal);
      if (won > 0) bump(fun(), 'chestsEarned', won);
      c.hud.refresh();
      return treasureView(fun());
    },
    /** Ouvre un coffre (en donne un s'il n'y en a pas). Rend la main tout de suite : l'animation attend un toucher. */
    openChest: (rarity?: Rarity) => {
      if (pendingChests(fun()) <= 0) giveChest(fun(), 1);
      void c.hud.openChest(rarity);
      return true;
    },
    drop: (kind: LootKind = 'coins', rarity: Rarity = 'rare', n?: number) => {
      const loot: Loot = { kind, n: n ?? AMOUNT[kind] ?? 1, rarity, seed: Date.now() % 9973 };
      c.onEvents([{ t: 'drop', at: 14, loot, rarity, auto: isAuto(kind) }]);
    },
    unlockAll: () => { fun().endless2.counters.orders = Math.max(fun().endless2.counters.orders ?? 0, 999); c.restart(); },
    setProgress: (n: number) => { fun().endless2.counters.orders = n; c.restart(); },
    state: () => {
      const st = c.getState();
      const f = fun();
      return {
        score: st.score, taps: st.taps, ordersDone: st.ordersDone,
        orders: st.orders.map((o) => (o ? { id: o.id, tier: o.tier, items: o.items, reward: o.reward } : null)),
        cells: st.cells.map((x, i) => (x.item ? { i, c: x.item.c, l: x.item.l } : null)).filter(Boolean),
        energy: wallet.energy(), diamonds: wallet.diamonds(), hearts: save.data.hearts, world: { ...save.data.world.res },
        treasure: treasureView(f), replaces: R.replacesLeft(), counters: { ...f.endless2.counters },
        album: albumProgress(f).found, gens: { ...f.endless2.gens }, tickets: f.endless2.tickets, fragments: { ...f.endless2.fragments },
        clothOwned: save.data.world.wardrobe.owned.length, furnitureOwned: Object.keys(save.data.world.castle.owned).length,
        active: activeColls(f), runSaved: !!save.data.endless.run,
      };
    },
    sec: () => secondaryView(fun()),
    completeOrder: (slot: number) => c.getScene()?.rushOrder(slot),
    combo: (n = 5) => c.getScene()?.comboFx(n, Math.min(3, 1 + 0.25 * (n - 1))),
    cellXY: (i: number) => c.getScene()?.cellCenter(i) ?? null,
    cellSize: () => c.getScene()?.cellSize ?? 0,
    idle: () => c.getScene()?.isIdle() ?? true,
  });
}
