/**
 * GABARIT UNIQUE de Radia (« rig »).
 *
 * Toutes les proportions et tous les points d'ancrage du personnage sont définis ICI, une seule fois.
 * Aucun composant (tête, cheveux, bras, mains, vêtements, accessoires, écrans) n'a ses propres chiffres :
 * ils lisent ce fichier. Les vêtements s'adaptent au gabarit, pas l'inverse.
 *
 * Repère : « avatar » = boîte 240 × 600, axe de symétrie x = 120, pieds en bas (y ≈ 585).
 * Référence : l'illustration peinte de Radia (même artiste qu'Auguste), mesurée à 952 px de haut :
 *   visage 106 px de large · main ≈ 33 × 48 px · pantalon 201–207 px · sweat 314–320 px.
 */

/** Échelle commune « pixel d'illustration → unité d'avatar » (la même pour Auguste et Radia). */
export const PAINT_SCALE = (0.97 * 600) / 1018; // ≈ 0,5714
/** Sol de l'illustration dans la boîte avatar (6 unités au-dessus du bas). */
export const PAINT_GROUND_Y = 594;

export const RIG = {
  box: { w: 240, h: 600 },
  cx: 120,

  /** ----- TÊTE : une SEULE échelle, quel que soit la coiffure, la couronne ou le mode (peint / dessiné). */
  head: {
    /** Menton (unité avatar) : pivot de l'échelle de tête, le cou ne bouge jamais. */
    chinY: 166.6,
    /** Remontée de toute la tête (unité avatar) : le menton se pose AU-DESSUS du col, ce qui laisse voir un vrai cou (sinon la tête semble posée sur le vêtement). */
    lift: 9,
    /** Échelle de toute la tête (crâne, visage, cheveux, accessoires) : fait coïncider le visage avec l'illustration (60,6 u de large). */
    scale: PAINT_SCALE / 0.708,
    /** Position du crâne dessiné (vectoriel) avant échelle : centre (HEAD_X, HEAD_Y) et échelle d'origine du dessin de visage. */
    vector: { x: 120, y: 100, k: 0.56, skullTopLocal: -118 },
  },

  /** ----- COUCHES PEINTES (illustration) : correspondance pixel d'illustration → avatar AVANT l'échelle de tête. */
  painted: {
    /** Pixel d'illustration (176 ; 118) = milieu des yeux  ↔  (120 ; 105) = milieu des yeux du dessin. */
    eyeX: 176, eyeY: 118, avX: 120, avY: 105,
    /** Échelle des calques peints avant l'échelle de tête. */
    k: 0.708,
    /** Sommet du crâne dans l'illustration (px), mesuré par ajustement d'une ellipse sur le contour des cheveux. */
    skullTopPx: -6,
    /** Largeur du visage peint à hauteur des yeux (px). */
    faceWidthPx: 106,
  },

  /** ----- CORPS */
  neck: { y: 168 },
  /** Articulation de l'épaule : sur la ligne d'épaule du torse (le dôme de l'épaule la prolonge), PAS au niveau de l'aisselle. */
  shoulder: { y: 190, dx: 52 }, // épaule : (cx ± 52 ; 190)
  waist: { y: 288 },
  hip: { y: 352 }, // ligne de coupe historique des vêtements
  feet: { y: 585 },

  /** Bras : épaisseur de l'épaule au poignet. */
  arm: { w0: 28, w1: 17.5 },
  /**
   * Pose IDLE par défaut : vivante et un peu asymétrique, jamais les bras ballants.
   * Côté gauche de l'image : main posée sur la hanche (coude écarté). Côté droit : avant-bras plié, main qui repose près du sac / de la cuisse.
   * (x1, y1) = poignet ; (cx, cy) = point de contrôle du coude ; x en écart à l'axe.
   */
  pose: {
    left: { x1: -50, y1: 310, cx: -106, cy: 254 },
    right: { x1: 64, y1: 334, cx: 94, cy: 264 },
  },
  /** Ancienne pose au repos (bras le long du corps, symétrique) : gardée pour les écrans qui la demandent. */
  poseRest: {
    left: { x1: -60, y1: 352, cx: -86, cy: 268 },
    right: { x1: 60, y1: 352, cx: 86, cy: 268 },
  },
  /** Main : taille mesurée sur l'illustration (≈ 19 × 28 u visibles) ; `reach` = distance poignet → centre de la main (la manche en recouvre le haut). */
  hand: { r: 9.8, reach: 11 },
} as const;

/** Échelle effective d'un calque peint (illustration → avatar), tête comprise. */
export const paintedScale = (): number => RIG.painted.k * RIG.head.scale;

/** Largeur du visage (unité avatar) : doit rester IDENTIQUE dans tous les modes. */
export const faceWidthUnits = (): number => RIG.painted.faceWidthPx * paintedScale();

/** Pixel d'illustration → unité d'avatar, dans le repère de la tête (avant l'échelle de tête). */
export function paintedToHead(px: number, py: number): [number, number] {
  const P = RIG.painted;
  return [P.avX + (px - P.eyeX) * P.k, P.avY + (py - P.eyeY) * P.k];
}

/**
 * Sommet du crâne (y, unité avatar avant l'échelle de tête), selon le type de tête :
 * 'painted' = crâne peint complet ; 'vector' = crâne dessiné (coiffures dessinées).
 * TOUTES les couronnes se posent par rapport à ce point (jamais par rapport aux dimensions d'une image).
 */
export function skullTopY(kind: 'painted' | 'vector'): number {
  if (kind === 'painted') return paintedToHead(0, RIG.painted.skullTopPx)[1];
  const v = RIG.head.vector;
  return v.y + v.skullTopLocal * v.k;
}

/** Décalage vertical (unité avatar) à appliquer à une couronne dessinée pour le crâne vectoriel, afin qu'elle se pose sur le crâne `kind`. */
export const crownDy = (kind: 'painted' | 'vector'): number => skullTopY(kind) - skullTopY('vector');

/** Matrice de la tête : réduit TOUT le bloc tête autour du menton puis le remonte de `lift` (le cou et le corps ne bougent pas). */
export function applyHeadScale(ctx: CanvasRenderingContext2D): void {
  const { cx, head } = RIG;
  ctx.translate(0, -head.lift); // la tête repose sur un cou visible
  ctx.translate(cx, head.chinY); ctx.scale(head.scale, head.scale); ctx.translate(-cx, -head.chinY);
}
