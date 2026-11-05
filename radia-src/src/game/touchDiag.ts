/**
 * Diagnostic tactile (Paramètres → « Diagnostic tactile ») : faits objectifs sur l'état du plateau, utilisables même quand il ne répond plus.
 * Aucune donnée personnelle (ni sauvegarde, ni clé, ni adresse).
 */
import { game as getGame } from '../core/app';
import { hygiene } from './pointerHygiene';

const OVERLAYS = '.modal-backdrop:not(.leaving), #reward-overlay .rw-root, .ev-layer, .inc-layer, .dm-reveal, .dialog-layer:not(.leaving)';
const errors: string[] = [];
export function noteInteractionError(msg: string): void { errors.push(`${new Date().toLocaleTimeString('fr-FR')} ${msg.slice(0, 120)}`); while (errors.length > 3) errors.shift(); }
if (typeof window !== 'undefined') window.addEventListener('error', (e) => noteInteractionError(e.message));

interface SceneLike { sys: { isActive(): boolean; settings: { visible: boolean } }; state?: unknown; locked?: Set<number>; drag?: unknown; selected?: number; cellCenter?(i: number): { x: number; y: number }; input: { enabled: boolean } }

export function touchDiagnostics(): [string, string][] {
  const rows: [string, string][] = [];
  let g: ReturnType<typeof getGame> | null = null;
  try { g = getGame(); } catch { /* pas de jeu */ }
  if (!g) return [['Jeu', 'non démarré']];
  const sc = g.scene.getScene('merge') as unknown as SceneLike | null;
  const inBoard = !!sc && sc.sys.isActive();
  rows.push(['Plateau affiché', inBoard ? 'oui' : 'non (scène inactive, en pause ou masquée)']);
  rows.push(['Scène en pause', g.scene.isPaused('merge') ? 'OUI' : 'non']);
  rows.push(['Jeu en pause (Phaser)', g.isPaused ? 'OUI' : 'non']);
  if (sc) {
    rows.push(['Plateau interactif', sc.input.enabled && inBoard ? 'oui' : 'NON']);
    rows.push(['Geste en cours', sc.drag ? 'oui' : 'non']);
    rows.push(['Cases verrouillées par une animation', String(sc.locked?.size ?? 0)]);
    rows.push(['Objet sélectionné', sc.selected != null && sc.selected >= 0 ? `case ${sc.selected}` : 'aucun']);
  }
  const ps = (g.input as unknown as { pointers?: { active: boolean; isDown: boolean; identifier: number }[] }).pointers ?? [];
  const act = ps.map((p, i) => ({ p, i })).filter(({ p, i }) => i >= 1 && p.active);
  rows.push(['Doigts « actifs » côté jeu', `${act.length} / ${Math.max(0, ps.length - 1)}${act.length >= ps.length - 1 && ps.length > 1 ? ' — TOUS occupés : la grille ne recevrait plus rien' : ''}`]);
  rows.push(['Dernier nettoyage automatique', hygiene()?.lastReason() || 'aucun']);
  const ov = Array.from(document.querySelectorAll(OVERLAYS)).map((e) => (e.className || e.id || e.tagName).toString().split(' ')[0]);
  rows.push(['Calques ouverts', ov.length ? ov.slice(0, 4).join(', ') : 'aucun']);
  if (sc?.cellCenter && sc.state) {
    try {
      const cv = g.canvas; const r = cv.getBoundingClientRect(); const k = r.width / g.scale.width; const c = sc.cellCenter(12);
      const el = document.elementFromPoint(r.left + c.x * k, r.top + c.y * k);
      rows.push(['Élément touché au centre du plateau', el === cv ? 'le plateau (normal)' : el ? `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}` : 'rien']);
    } catch { /* ignore */ }
  }
  rows.push(['Dernière erreur', errors.length ? errors[errors.length - 1] : 'aucune']);
  return rows;
}

/** Libère les doigts coincés et le geste en cours (ne supprime aucun objet, ne consomme rien, ne touche pas à la sauvegarde). */
export function unblockBoard(): number { return hygiene()?.releaseAll('déblocage manuel') ?? 0; }
