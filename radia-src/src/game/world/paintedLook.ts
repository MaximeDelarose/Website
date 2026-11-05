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

/** Couche de tête peinte à utiliser avec n'importe quelle tenue. */
export type PaintedHeadKind = 'head' | 'face';
const FACE_MAKEUP = new Set(['lips', 'eyes', 'mouth', 'liner', 'shadow']);
/**
 * Tête peinte (même artiste qu'Auguste) sur le corps dessiné, quelle que soit la tenue :
 * - cheveux longs (lâchés / ondulés) et aucun foulard / accessoire de cheveux → tête complète peinte ;
 * - autre coiffure ou accessoire de cheveux → visage peint seul, la coiffure dessinée autour ;
 * - visage personnalisé ou maquillage du dressing (lèvres, yeux, liner, fard) → null : dessin (il suit ces réglages).
 * La COURONNE ne change JAMAIS le mode (ni donc l'échelle ou le style de la tête) : c'est un calque posé sur le sommet du crâne.
 * Lunettes et boucles d'oreilles non plus : ce sont des calques ancrés sur le visage.
 */
export function paintedHeadKind(l: Look, faceIsDefault: boolean, groupOf: (id: string) => string | null): PaintedHeadKind | null {
  if (!faceIsDefault) return null;
  if (l.acc.some((a) => FACE_MAKEUP.has(groupOf(a) ?? ''))) return null;
  const long = l.hair === 'hair-loose' || l.hair === 'hair-wavy';
  const headAcc = l.acc.some((a) => groupOf(a) === 'head');
  return long && !headAcc ? 'head' : 'face';
}
