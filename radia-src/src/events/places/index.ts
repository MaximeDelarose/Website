/**
 * Décors des lieux d'événements : dessin vectoriel pastel (repère logique 393 × 500).
 * La partie statique est rendue une fois dans un canvas hors écran ; seule la couche animée
 * (flammes, lueurs, étoiles, feux d'artifice…) est redessinée à chaque appel.
 */
import type { PlaceId } from '../types';
import { PLACE_IDS } from '../types';
import { makeCanvas } from '../../game/art/kit';
import { W, H, type PlaceDef } from './common';
import { restaurant, palace, ballroom, hotel } from './romantic';
import { fireworks, rooftop, cinema, stage } from './night';
import { fountain } from './fountain';
import { flowerMarket, garden, boutique, studio, home, pajama, spa } from './day';

export const PLACE_NAMES: Record<PlaceId, string> = {
  restaurant: 'Restaurant aux chandelles',
  palace: 'Palace parisien',
  fireworks: "Terrasse du feu d'artifice",
  spa: 'Spa & jacuzzi',
  hotel: 'Suite d’hôtel',
  cinema: 'Cinéma privé',
  flowerMarket: 'Marché aux fleurs',
  rooftop: 'Rooftop au coucher du soleil',
  ballroom: 'Salle de bal',
  garden: 'Jardin en fête',
  pajama: 'Soirée pyjama',
  boutique: 'Boutique de luxe',
  stage: 'Scène',
  studio: 'Studio photo',
  home: 'À la maison',
  fountain: 'Devant la fontaine',
};

const DEFS: Record<PlaceId, PlaceDef> = {
  restaurant, palace, fireworks, spa, hotel, cinema, flowerMarket, rooftop, ballroom, garden, pajama, boutique, stage, studio, home, fountain,
};

const cache = new Map<string, HTMLCanvasElement>();

/** Couche statique en cache (pixels w × h). */
function staticLayer(id: PlaceId, w: number, h: number): HTMLCanvasElement {
  const key = `${id}|${Math.round(w)}x${Math.round(h)}`;
  let c = cache.get(key);
  if (!c) {
    c = makeCanvas(w, h);
    const g = c.getContext('2d')!;
    applyFrame(g, w, h);
    g.lineJoin = 'round'; g.lineCap = 'round';
    DEFS[id].bg(g);
    g.restore();
    if (cache.size >= 16) cache.delete(cache.keys().next().value as string);
    cache.set(key, c);
  }
  return c;
}

/** Repère logique 393 × 500 couvrant tout le rectangle (centré, rogné). */
function applyFrame(g: CanvasRenderingContext2D, w: number, h: number): void {
  const k = Math.max(w / W, h / H);
  g.save();
  g.translate((w - W * k) / 2, (h - H * k) / 2);
  g.scale(k, k);
  g.beginPath(); g.rect(0, 0, W, H); g.clip();
}

/** Dessine le décor `id` dans [0,w]×[0,h] ; `t` (secondes) anime la couche vivante. */
export function drawPlace(ctx: CanvasRenderingContext2D, id: PlaceId, w: number, h: number, t = 0): void {
  const def = DEFS[id] ?? DEFS.home;
  const sw = Math.round(w * (ctx.getTransform().a || 1)), sh = Math.round(h * (ctx.getTransform().d || 1));
  ctx.drawImage(staticLayer(DEFS[id] ? id : 'home', sw, sh), 0, 0, w, h);
  if (def.fx) {
    ctx.save();
    const k = Math.max(w / W, h / H);
    ctx.translate((w - W * k) / 2, (h - H * k) / 2);
    ctx.scale(k, k);
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    def.fx(ctx, t);
    ctx.restore();
  }
}

export { PLACE_IDS };
