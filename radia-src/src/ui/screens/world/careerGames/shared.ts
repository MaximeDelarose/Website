/** Éléments communs aux 4 mini-jeux de carrière (écran, avatar, résultat). */
import { h, tap } from '../../../dom';
import { ui } from '../../../ui';
import { icon } from '../../../icons';
import { firstTime } from '../../../../core/world';
import { drawAvatar, type AvatarOpts } from '../../../../game/art/world/avatar';
import type { CareerId, Look } from '../../../../data/world/ids';

export interface GameCtx {
  career: CareerId;
  /** Difficulté 1–5 (selon le palier). */
  difficulty: number;
  look: Look;
  owned: string[];
  /** Étiquette demandée par l'objectif en cours (pour proposer le bon thème/pose). */
  wanted: string | null;
}
export interface GameResult { score: number; tags: string[]; combo?: number; lines: string[] }

export interface Shell { screen: HTMLElement; body: HTMLElement; sub: HTMLElement; quit: () => void; onQuit: (fn: () => void) => void }

/** Écran de jeu plein cadre avec en-tête et bouton retour (quitter = sans pénalité). */
export function gameShell(title: string, sub: string, quit: () => void): Shell {
  const subEl = h('p.cg-sub', sub);
  const body = h('div.cg-body');
  let cleanup: () => void = () => undefined;
  const leave = () => { cleanup(); quit(); };
  const screen = h('div.screen.bg-soft.cg-screen', ui.header(title, leave), subEl, body);
  ui.showScreen(screen);
  return { screen, body, sub: subEl, quit: leave, onQuit: (fn) => { cleanup = fn; } };
}

/** Petit conseil affiché une seule fois par jeu. */
export function tip(key: string, title: string, sub: string): void {
  if (firstTime(`tip.career.${key}`)) ui.toast({ title, sub, icon: 'info', ms: 4200 });
}

const DPR = () => Math.min(2, window.devicePixelRatio || 1);

/** Canvas à résolution écran (netteté iPhone). */
export function sizedCanvas(w: number, hgt: number, cls = ''): { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const cv = document.createElement('canvas');
  if (cls) cv.className = cls;
  const d = DPR();
  cv.width = Math.round(w * d); cv.height = Math.round(hgt * d);
  cv.style.width = `${w}px`; cv.style.height = `${hgt}px`;
  const ctx = cv.getContext('2d')!;
  ctx.scale(d, d);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  return { cv, ctx };
}

export function avatarInto(ctx: CanvasRenderingContext2D, look: Look, w: number, hgt: number, opts?: AvatarOpts, x = 0, y = 0): void {
  ctx.save(); ctx.translate(x, y); drawAvatar(ctx, look, w, hgt, opts); ctx.restore();
}

/** Étoiles 0–3 en texte (visuel simple). */
export const stars = (n: number): HTMLElement => h('span.cg-stars', ...[0, 1, 2].map((i) => h(`i${i < n ? '.on' : ''}`, icon('star', 22))));

export const wait = (ms: number): Promise<void> => new Promise((r) => window.setTimeout(r, ms));

export function bigButton(label: string, fn: () => void, cls = ''): HTMLButtonElement {
  const b = h(`button.btn.wide${cls ? '.' + cls : ''}`, label);
  b.addEventListener('click', tap(fn));
  return b;
}

/** Largeur disponible pour un canvas de jeu (écran moins gouttières). */
export const stageWidth = (): number => Math.max(260, Math.min(440, (ui.root.clientWidth || 393) - 32));
