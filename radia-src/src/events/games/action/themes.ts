/** Séance mode : notation des thèmes et prêts temporaires (logique pure, données seulement). */
import { CLOTHES } from '../../../data/world/wardrobe';
import type { ClothId, Look, StyleId } from '../../../data/world/ids';

export const THEME_NAMES: Record<StyleId, string> = { casual: 'Casual', chic: 'Chic', romantic: 'Romantique', royal: 'Royal', stage: 'Scène' };
export const THEME_HINTS: Record<StyleId, string> = {
  casual: 'Détendue et confortable, pour une balade en ville.',
  chic: 'Élégante et nette, pour un rendez-vous à Paris.',
  romantic: 'Douce et poétique, pour un dîner aux chandelles.',
  royal: 'Digne d’un palais, avec de la noblesse.',
  stage: 'Brillante, prête pour les projecteurs.',
};
export const DEFAULT_THEMES: StyleId[] = ['chic', 'romantic', 'casual'];

const ADJ: Partial<Record<StyleId, StyleId[]>> = { chic: ['royal', 'stage'], romantic: ['royal'], royal: ['chic', 'romantic', 'stage'], stage: ['chic', 'royal'] };

/** Crédit d’une pièce pour un thème : 1 si elle porte le style, 0,4 si style voisin, 0 sinon. */
export function pieceCredit(id: ClothId, theme: StyleId): number {
  const st = CLOTHES[id].styles;
  if (st.includes(theme)) return 1;
  return st.some((s) => ADJ[theme]?.includes(s)) ? 0.4 : 0;
}

/** Pièces comptées (poids). Robe = haut + bas. */
export function pieces(look: Look): Array<{ id: ClothId; w: number }> {
  const out: Array<{ id: ClothId; w: number }> = [];
  if (look.dress) out.push({ id: look.dress, w: 4 });
  else { if (look.top) out.push({ id: look.top, w: 2 }); if (look.bottom) out.push({ id: look.bottom, w: 2 }); }
  if (look.jacket) out.push({ id: look.jacket, w: 1 });
  if (look.shoes) out.push({ id: look.shoes, w: 1.5 });
  if (look.bag) out.push({ id: look.bag, w: 1 });
  if (look.crown) out.push({ id: look.crown, w: 1 });
  for (const a of look.acc.slice(0, 2)) out.push({ id: a, w: 0.6 });
  return out;
}

/**
 * Score 0..100 d’un look pour un thème. Dénominateur : le « noyau » attendu (4 pour la tenue de base, 1,5 chaussures,
 * 1 sac) ; une pièce hors thème dilue, une pièce manquante ne rapporte rien, les extras dans le thème aident (plafonné à 100).
 */
export function scoreLook(look: Look, theme: StyleId): number {
  const ps = pieces(look);
  if (!ps.length) return 0;
  const core = 4 + 1.5 + 1;
  let got = 0; let wasted = 0;
  for (const p of ps) { const c = pieceCredit(p.id, theme); got += c * p.w; wasted += (1 - c) * p.w * 0.25; }
  return Math.max(0, Math.min(100, Math.round(((got - wasted) / core) * 100)));
}

export const verdict = (score: number): string => (score >= 85 ? 'Sublime !' : score >= 65 ? 'Très réussi' : score >= 40 ? 'Joli début' : 'Une idée originale');

const LOAN_SLOTS = ['dress', 'top', 'bottom', 'shoes', 'bag', 'jacket'] as const;
/**
 * Prêts temporaires : pour un thème, complète jusqu’à `min` pièces par emplacement clé avec des pièces du catalogue
 * non possédées portant ce style. Jamais ajoutés à l’inventaire.
 */
export function loanersFor(theme: StyleId, owned: ReadonlySet<string>, min = 2): ClothId[] {
  const out: ClothId[] = [];
  const all = Object.values(CLOTHES);
  for (const slot of LOAN_SLOTS) {
    const have = all.filter((c) => c.slot === slot && owned.has(c.id) && c.styles.includes(theme)).length;
    let need = min - have;
    if (need <= 0) continue;
    const cands = all.filter((c) => c.slot === slot && !owned.has(c.id) && c.styles[0] === theme).concat(all.filter((c) => c.slot === slot && !owned.has(c.id) && c.styles.includes(theme) && c.styles[0] !== theme));
    for (const c of cands) { if (need <= 0) break; out.push(c.id); need--; }
  }
  return out;
}
