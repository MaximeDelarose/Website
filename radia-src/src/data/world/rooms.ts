/**
 * Pièces du château : nom, grille de placement, prix de déblocage, options de
 * murs / sols / rideaux (palette de ids.ts).
 */
import { ROOM_IDS, ROOM_NAMES, PALETTE, type ColorId, type KidId, type RoomId } from './ids';
import { kidRoomName } from '../../core/family';

export interface RoomDef {
  id: RoomId;
  /** Prix de déblocage en pièces (0 = offerte). */
  cost: number;
  cols: number;
  rows: number;
  /** Libellé du « rideau » (jardin : guirlandes). */
  curtainLabel: string;
  wallLabel: string;
  floorLabel: string;
  blurb: string;
}

const R = (id: RoomId, cost: number, rows: number, blurb: string, extra: Partial<RoomDef> = {}): RoomDef =>
  ({ id, cost, cols: 8, rows, curtainLabel: 'Rideaux', wallLabel: 'Murs', floorLabel: 'Sol', blurb, ...extra });

export const ROOMS: Record<RoomId, RoomDef> = {
  bedroom: R('bedroom', 0, 7, 'Ton refuge, doux comme un nuage.'),
  salon: R('salon', 0, 7, 'Pour recevoir en toute élégance.'),
  dressing: R('dressing', 200, 6, 'Tenues, bijoux et chaussures.'),
  reception: R('reception', 400, 7, 'Des soirées dignes d\'une reine.'),
  garden: R('garden', 0, 7, 'Fleurs, fontaine et ciel ouvert.', { curtainLabel: 'Guirlandes', wallLabel: 'Haies', floorLabel: 'Allées' }),
  familySalon: R('familySalon', 300, 7, 'Le cœur chaleureux de la maison.'),
  kid1: R('kid1', 150, 6, 'Une chambre toute douce.'),
  kid2: R('kid2', 150, 6, 'Une chambre pleine de couleurs.'),
  kid3: R('kid3', 150, 6, 'Une chambre pleine de vie.'),
};

export const isKidRoom = (r: RoomId): r is KidId => r === 'kid1' || r === 'kid2' || r === 'kid3';
export const roomName = (r: RoomId): string => (isKidRoom(r) ? kidRoomName(r) : ROOM_NAMES[r]);
export const FREE_ROOMS: RoomId[] = ROOM_IDS.filter((r) => ROOMS[r].cost === 0);
export const FAMILY_ROOMS: RoomId[] = ['familySalon', 'kid1', 'kid2', 'kid3'];

const ids = (...x: ColorId[]) => x;
/** Options de couleur (identifiants de PALETTE). */
export const WALL_OPTIONS: ColorId[] = PALETTE.map((p) => p.id);
export const FLOOR_OPTIONS: ColorId[] = ids('cream', 'beige', 'brown', 'white', 'rose', 'lavender', 'sage', 'noir', 'gold', 'peach');
export const CURTAIN_OPTIONS: ColorId[] = PALETTE.map((p) => p.id);
/** Toutes les variantes de décoration proposées (murs + sols + rideaux). */
export const DECOR_VARIANT_COUNT = WALL_OPTIONS.length + FLOOR_OPTIONS.length + CURTAIN_OPTIONS.length;

export type ColorTarget = 'wall' | 'floor' | 'curtain';
export const optionsFor = (t: ColorTarget): ColorId[] => (t === 'wall' ? WALL_OPTIONS : t === 'floor' ? FLOOR_OPTIONS : CURTAIN_OPTIONS);
