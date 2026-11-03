// Rangement automatique : pose les objets de la réserve là où ils rentrent,
// les plus chers d'abord. Sert au bouton « Ranger » et au bot de simulation.

import type { Vec } from "../engine/types";
import type { Bag } from "./bag";

export function autoPlace(bag: Bag, filter: (item: string) => boolean = () => true): number {
  const b = bag.bounds();
  const items = bag.content.items;
  const todo = bag
    .stashed()
    .filter((e) => filter(e.item))
    .sort((x, y) => items[y.item].price - items[x.item].price || items[y.item].shape.length - items[x.item].shape.length);
  let placed = 0;
  for (const e of todo) {
    let done = false;
    for (let rot = 0; rot < 4 && !done; rot++) {
      for (let y = b.minY - 2; y <= b.minY + b.h && !done; y++) {
        for (let x = b.minX - 2; x <= b.minX + b.w && !done; x++) {
          const pos: Vec = [x, y];
          if (bag.move(e.uid, pos, rot, e.mirror)) done = true;
        }
      }
    }
    if (done) placed++;
  }
  return placed;
}
