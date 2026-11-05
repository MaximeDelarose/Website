import type { Look } from '../../data/world/ids';

/** Illustrations peintes de Radia (pack chiffré) : même artiste qu'Auguste. */
export type PaintedId = 'char-radia' | 'char-radia-nc';

/**
 * La tenue correspond-elle à l'illustration peinte ? Laquelle (avec / sans couronne dorée) ?
 * Sweat noir, pantalon large noir, baskets blanches, sac bandoulière noir, cheveux longs (lâchés ou ondulés),
 * aucun autre accessoire, visage non personnalisé. Sinon : dessin du dressing, qui suit chaque choix.
 */
export function paintedLookId(l: Look, faceIsDefault: boolean): PaintedId | null {
  if (!faceIsDefault) return null;
  if (l.top !== 'top-hoodie-black' || l.bottom !== 'bot-wide-black' || l.dress || l.jacket || l.shoes !== 'sh-sneakers-white' || l.bag !== 'bg-crossbody-black') return null;
  if (l.hair !== 'hair-loose' && l.hair !== 'hair-wavy') return null;
  if (l.acc.length) return null;
  if (l.crown && l.crown !== 'cr-gold') return null;
  return l.crown === 'cr-gold' ? 'char-radia' : 'char-radia-nc';
}
