// Carte d'un étage : rangées de nœuds reliés vers le haut (combat, élite,
// boutique, événement, coffre, feu de camp ; boss en fin de zone).
// Génération déterministe à partir de l'état RNG de la run.

import type { NodeType, RouteDef, RunData } from "../content/runData";
import { chance, nextInt, pick, type RngHolder } from "../engine/rng";

export interface MapNode {
  id: string;
  row: number;
  col: number;
  /** Position horizontale (0..1) pour l'affichage. */
  x: number;
  type: NodeType;
  next: string[];
  done: boolean;
  /** Combats : rencontre tirée à la génération (révélée en touchant le nœud). */
  enemies?: string[];
  hpMul?: number;
  seed?: number;
}

export function weightedPick<T>(h: RngHolder, list: readonly { w: number; v: T }[]): T {
  const total = list.reduce((s, x) => s + x.w, 0);
  let r = (nextInt(h, 0, 1_000_000 - 1) / 1_000_000) * total;
  for (const x of list) {
    r -= x.w;
    if (r < 0) return x.v;
  }
  return list[list.length - 1].v;
}

function rowType(h: RngHolder, rd: RunData, row: number, eliteWeightMul = 1): NodeType {
  if (row === 0) return rd.rules.firstRow;
  const opts = (Object.entries(rd.rules.nodeWeights) as [NodeType, number][])
    .filter(([t, w]) => w > 0 && t !== "boss" && (t !== "elite" || row >= rd.rules.eliteMinRow))
    .map(([t, w]) => ({ w: t === "elite" ? w * eliteWeightMul : w, v: t }));
  return weightedPick(h, opts);
}

/** Relie deux rangées sans croisement marqué ; chaque nœud a au moins une entrée et une sortie. */
function link(h: RngHolder, cur: MapNode[], nxt: MapNode[]): void {
  const n = cur.length;
  const m = nxt.length;
  const target = (i: number) => (n === 1 ? -1 : Math.round((i * (m - 1)) / (n - 1)));
  const incoming = new Set<number>();
  cur.forEach((node, i) => {
    if (n === 1 || m === 1) {
      for (let j = 0; j < m; j++) {
        node.next.push(nxt[j].id);
        incoming.add(j);
      }
      return;
    }
    const j0 = target(i);
    node.next.push(nxt[j0].id);
    incoming.add(j0);
    const room = i === n - 1 || target(i + 1) >= j0 + 1;
    if (j0 + 1 < m && room && chance(h, 0.35)) {
      node.next.push(nxt[j0 + 1].id);
      incoming.add(j0 + 1);
    }
  });
  for (let j = 0; j < m; j++) {
    if (incoming.has(j)) continue;
    const i = Math.round((j * (n - 1)) / Math.max(1, m - 1));
    cur[i].next.push(nxt[j].id);
  }
  for (const node of cur) node.next.sort((a, b) => nxt.findIndex((x) => x.id === a) - nxt.findIndex((x) => x.id === b));
}

export function generateFloor(h: RngHolder, rd: RunData, route: RouteDef, zoneIdx: number, floorIdx: number, eliteWeightMul = 1): MapNode[] {
  const floor = route.floors[floorIdx];
  const last = floorIdx === route.floors.length - 1;
  const rows: MapNode[][] = [];
  const [minN, maxN] = rd.rules.nodesPerRow;
  const make = (row: number, count: number, typeOf: () => NodeType): MapNode[] =>
    Array.from({ length: count }, (_, col) => {
      const jitter = count > 1 ? nextInt(h, -40, 40) / 1000 : 0;
      const node: MapNode = { id: `${zoneIdx}-${floorIdx}-${row}-${col}`, row, col, x: (col + 1) / (count + 1) + jitter, type: typeOf(), next: [], done: false };
      return node;
    });
  for (let r = 0; r < rd.rules.rows; r++) rows.push(make(r, nextInt(h, minN, maxN), () => rowType(h, rd, r, eliteWeightMul)));
  if (last) {
    rows.push(make(rd.rules.rows, 1, () => "campfire"));
    rows.push(make(rd.rules.rows + 1, 1, () => "boss"));
  }
  for (let r = 0; r + 1 < rows.length; r++) link(h, rows[r], rows[r + 1]);
  // rencontres
  for (const node of rows.flat()) {
    if (node.type === "combat" || node.type === "elite") {
      node.enemies = [...(pick(h, node.type === "elite" ? floor.elite : floor.normal) ?? [])];
      node.hpMul = floor.hpMul;
      node.seed = nextInt(h, 0, 2 ** 31 - 1);
    } else if (node.type === "boss") {
      node.enemies = [...route.boss];
      node.hpMul = route.bossHpMul;
      node.seed = nextInt(h, 0, 2 ** 31 - 1);
    }
  }
  return rows.flat();
}

/** Zone finale : un feu de camp, puis le boss final. */
export function generateFinal(h: RngHolder, rd: RunData, zoneIdx: number): MapNode[] {
  const camp: MapNode = { id: `${zoneIdx}-0-0-0`, row: 0, col: 0, x: 0.5, type: "campfire", next: [`${zoneIdx}-0-1-0`], done: false };
  const boss: MapNode = {
    id: `${zoneIdx}-0-1-0`,
    row: 1,
    col: 0,
    x: 0.5,
    type: "boss",
    next: [],
    done: false,
    enemies: [...rd.final.boss],
    hpMul: rd.final.bossHpMul,
    seed: nextInt(h, 0, 2 ** 31 - 1),
  };
  return [camp, boss];
}
