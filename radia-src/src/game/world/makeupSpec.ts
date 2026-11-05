import type { FaceCustom } from '../../data/world/face';
import { defaultFace } from '../../data/world/face';
import { LIP_COLOR, SHADOW_COLOR } from '../../data/world/ids';

/**
 * MAQUILLAGE = surcouche légère posée sur la tête de Radia. Jamais un remplacement de tête : la structure du visage reste celle de l'illustration.
 * Fonction PURE (sans DOM, testée) : à partir du look (objets de maquillage portés) et du réglage « Personnaliser Radia », elle dit ce qu'il faut ajouter.
 * Le réglage d'origine (aucun maquillage ajouté) ne produit AUCUNE surcouche : la tête reste exactement l'illustration.
 */
export interface MakeupSpec {
  /** Eye-liner appuyé (trait plus marqué) ; sinon le tracé de l'illustration est conservé. */
  linerBold: boolean;
  /** Fard à paupières (couleur) ou null. */
  shadow: string | null;
  /** Blush ajouté (couleur + opacité 0…0.6) ou null. */
  blush: { color: string; alpha: number } | null;
  /** Rouge à lèvres / gloss (couleur, brillance seule si `gloss`) ou null. */
  lip: { color: string; gloss: boolean } | null;
}

export const NO_MAKEUP: MakeupSpec = { linerBold: false, shadow: null, blush: null, lip: null };

export function makeupSpec(acc: readonly string[], face: FaceCustom): MakeupSpec {
  const base = defaultFace();
  const find = (pre: string): string | undefined => acc.find((a) => a.startsWith(pre));
  const lp = find('lp-'), es = find('es-'), el = find('el-');
  const mk = face.makeup;
  // eye-liner : objet porté d'abord, sinon réglage de l'espace « Personnaliser » ; seul « appuyé » ajoute quelque chose
  const linerBold = el === 'el-bold' || (!el && mk.liner === 'bold');
  const shadow = es ? SHADOW_COLOR[es] ?? null : mk.shadow || null;
  // blush : seulement la part ajoutée au blush d'origine (l'illustration a déjà ses joues)
  const extra = Math.max(0, mk.blush - base.makeup.blush);
  const blush = extra > 0.02 ? { color: mk.blushColor, alpha: Math.min(0.6, 0.12 + extra * 0.55) } : null;
  let lip: MakeupSpec['lip'] = null;
  if (lp) lip = { color: LIP_COLOR[lp] ?? base.mouth.lip, gloss: lp === 'lp-gloss' };
  else if (mk.lipstick && face.mouth.lip.toLowerCase() !== base.mouth.lip.toLowerCase()) lip = { color: face.mouth.lip, gloss: false };
  return { linerBold, shadow, blush, lip };
}
export const hasMakeup = (m: MakeupSpec): boolean => m.linerBold || !!m.shadow || !!m.blush || !!m.lip;
