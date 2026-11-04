/**
 * Migration TOLÉRANTE des meubles déjà posés (anciens schémas : tout est un meuble de sol à cases entières) :
 *  - positions existantes conservées quand elles sont valides ;
 *  - un meuble de plafond posé au sol remonte au plafond (même colonne) ; un objet mural (tableau) est reclassé sur le mur ;
 *  - un petit objet (lampe, bougies, vase) posé au sol près d'un support est posé dessus ;
 *  - un objet qui ne trouve plus de place est RANGÉ EN RÉSERVE (jamais détruit) : `owned` ≥ nombre posé ;
 *  - champs inconnus ou invalides (rot, variant, on) nettoyés. Idempotente.
 * Pur : agit sur l'état du monde passé en paramètre.
 */
import type { PlacedItem, World } from '../../../../save/schema';
import { ROOM_IDS, type RoomId } from '../../../../data/world/ids';
import { furnitureOf } from '../../../../data/world/furniture';
import { clean, defaultSpot, layerOf, nearestValid, normRot, rectOfItem, snap, validate, type Candidate } from './placement';
import { geo } from './geometry';

export interface MigrationReport { moved: number; stored: number; reclassed: number; dropped: number }

/** Nombre d'exemplaires posés (toutes pièces) d'un meuble. */
const placed = (w: World, id: string): number => ROOM_IDS.reduce((n, r) => n + w.castle.rooms[r].items.filter((i) => i.id === id).length, 0);

export function migrateCastle(w: World): MigrationReport {
  const rep: MigrationReport = { moved: 0, stored: 0, reclassed: 0, dropped: 0 };
  const c = w.castle;
  const seen = new Set<number>();
  for (const room of ROOM_IDS) {
    const r = c.rooms[room];
    // 1. nettoyage : inconnus et doublons d'uid
    const input: PlacedItem[] = [];
    for (const it of r.items) {
      const def = furnitureOf(it.id);
      if (!def || !(it.uid > 0) || seen.has(it.uid)) { rep.dropped++; continue; }
      seen.add(it.uid);
      const rot = normRot(def, it.rot);
      const clean0: PlacedItem = { uid: it.uid, id: it.id, x: Number.isFinite(it.x) ? it.x : 0, y: Number.isFinite(it.y) ? it.y : 0, color: it.color, flip: it.flip === true };
      if (rot) clean0.rot = rot;
      if (it.variant && def.variants.some((v) => v.id === it.variant)) clean0.variant = it.variant;
      if (it.on !== undefined) clean0.on = it.on;
      input.push(clean0);
    }
    // 2. replacement dans l'ordre : supports d'abord (leurs objets posés ensuite)
    const order = [...input].sort((a, b) => Number(a.on !== undefined) - Number(b.on !== undefined) || a.uid - b.uid);
    const kept: PlacedItem[] = [];
    for (const it of order) {
      const def = furnitureOf(it.id)!;
      if (!def.rooms.includes(room) || !c.unlocked.includes(room)) { rep.stored++; continue; } // pièce interdite / verrouillée : en réserve
      const layer = layerOf(def, it.on);
      let cand: Candidate = { id: it.id, x: it.x, y: it.y, rot: it.rot ?? 0, on: it.on };
      // le plan d'origine ne convient pas à la catégorie : reclassement
      const G = geo(room);
      if (def.place === 'ceiling') cand = { id: it.id, x: it.x, y: 0, rot: 0 };
      else if (def.place === 'wall') cand = { id: it.id, x: it.x, y: 0.5, rot: 0 };
      else if (def.place === 'window') cand = { id: it.id, x: 0, y: 0, rot: 0 };
      else if (def.place === 'surface' && it.on === undefined) {
        // sur le sol : on cherche un support voisin libre (≤ 3 cases) pour le poser dessus
        const best = trySurface(room, kept, it);
        if (best) cand = best;
      } else if (it.on !== undefined) {
        const host = kept.find((k) => k.uid === it.on);
        if (!host) cand = { id: it.id, x: it.x, y: it.y, rot: 0 };
      }
      const L = layerOf(def, cand.on);
      if (L === 'ceiling') cand.y = geoCeilY(G.rows);
      cand.x = clean(snap(cand.x)); cand.y = clean(snap(cand.y));
      const fixed = pickValid(room, kept, cand);
      if (!fixed) { rep.stored++; continue; }
      if (fixed.x !== it.x || fixed.y !== it.y || (fixed.on ?? undefined) !== (it.on ?? undefined) || layer !== L) rep.moved++;
      if (layer !== L || def.place !== 'floor' && def.place !== 'rug' && (it.y !== fixed.y)) rep.reclassed++;
      const out: PlacedItem = { uid: it.uid, id: it.id, x: fixed.x, y: fixed.y, color: it.color, flip: it.flip === true };
      if (fixed.rot) out.rot = fixed.rot;
      if (it.variant) out.variant = it.variant;
      if (fixed.on !== undefined) out.on = fixed.on;
      kept.push(out);
    }
    r.items = kept.sort((a, b) => a.uid - b.uid);
  }
  // possédé ≥ posé : un meuble posé est forcément acheté
  const ids = new Set<string>();
  for (const room of ROOM_IDS) for (const it of c.rooms[room].items) ids.add(it.id);
  for (const id of ids) { const n = placed(w, id); if ((c.owned[id] ?? 0) < n) c.owned[id] = n; }
  // compteur d'uid
  const maxUid = Math.max(0, ...ROOM_IDS.flatMap((r) => c.rooms[r].items.map((i) => i.uid)));
  if (!(c.nextUid > maxUid)) c.nextUid = maxUid + 1;
  return rep;
}

const geoCeilY = (rows: number): number => snap(Math.max(0, rows / 2 - 0.5));

/** Support voisin libre pour un petit objet posé au sol (tolère une table de chevet juste à côté). */
function trySurface(room: RoomId, kept: PlacedItem[], it: PlacedItem): Candidate | null {
  const def = furnitureOf(it.id)!;
  let best: { c: Candidate; d: number } | null = null;
  for (const h of kept) {
    const hd = furnitureOf(h.id);
    if (!hd?.host || h.on !== undefined || !def.onKinds.includes(hd.host.kind)) continue;
    const hr = rectOfItem(h)!;
    const d = Math.hypot(hr.x + hr.w / 2 - it.x - 0.5, hr.y + hr.h / 2 - it.y - 0.5);
    if (d > 2.6) continue;
    for (let y = hr.y; y + 0.8 <= hr.y + hr.h + 1e-6; y += 0.5) for (let x = hr.x; x + 0.8 <= hr.x + hr.w + 1e-6; x += 0.5) {
      const c: Candidate = { id: it.id, x, y, rot: 0, on: h.uid };
      if (validate(room, kept, c).ok && (!best || d < best.d)) best = { c, d };
    }
  }
  return best ? best.c : null;
}

/** La position demandée si elle est valide, sinon la plus proche ; null si la pièce n'a plus de place. */
function pickValid(room: RoomId, kept: PlacedItem[], c: Candidate): Candidate | null {
  if (validate(room, kept, c).ok) return c;
  const near = nearestValid(room, kept, c, [], 3);
  if (near) return near;
  // dernier recours : n'importe quelle place libre de la pièce
  return defaultSpot(room, kept, c.id, c.rot);
}
