/**
 * Écran d'accueil du téléphone du jeu : fond d'écran, heure, date, icônes d'applications avec pastilles, dock.
 * Pure mise en page : l'ouverture des applications est fournie par phone.ts (les applications s'ouvrent PAR-DESSUS le téléphone ;
 * la fermer ramène donc ici). Direction artistique RADIA, aucune icône propriétaire.
 */
import { h } from '../../ui/dom';
import { icon } from '../../ui/icons';
import { wallpaperUrl } from './phoneWallpapers';

export interface HomeApp {
  id: string;
  name: string;
  /** Icône déjà prête (logos des applications) ; sinon `glyph` dans une tuile colorée. */
  icon?: (size: number) => Element;
  glyph?: string;
  tone?: string;
  badge: number | null;
  open: (from: HTMLElement) => void;
}

export interface HomeOptions { grid: HomeApp[]; dock: HomeApp[]; wallpaper: string; onQuit: () => void }

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const timeLabel = (d: Date): string => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
export const dateLabel = (d: Date): string => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;

function tile(a: HomeApp, size: number): Element {
  if (a.icon) return a.icon(size);
  return h('span.phh-tile', { style: `background:${a.tone ?? 'linear-gradient(180deg,#ff9bbf,#e8558f)'}` }, icon(a.glyph ?? 'heart', Math.round(size * 0.55)));
}

function appButton(a: HomeApp, size: number, label: boolean): HTMLElement {
  const b = h('button.phh-app', { 'aria-label': a.badge ? `${a.name} (${a.badge} non lu${a.badge > 1 ? 's' : ''})` : a.name, 'data-app': a.id }, h('span.phh-ic', tile(a, size), a.badge ? h('i.phh-badge', a.badge > 99 ? '99+' : String(a.badge)) : null), label ? h('span.phh-name', a.name) : null);
  b.addEventListener('click', () => {
    b.classList.add('launch'); // petite réaction de l'icône avant l'ouverture
    window.setTimeout(() => { b.classList.remove('launch'); a.open(b); }, 130);
  });
  return b;
}

/** Construit l'écran d'accueil ; `stop()` arrête l'horloge. */
export function buildHome(o: HomeOptions): { el: HTMLElement; stop: () => void } {
  const now = new Date();
  const clock = h('div.phh-time', timeLabel(now));
  const date = h('div.phh-date', dateLabel(now));
  const quit = h('button.phh-quit', { 'aria-label': 'Quitter le téléphone', title: 'Quitter le téléphone', on: { click: () => o.onQuit() } }, icon('close', 18));
  const bar = h('div.phh-indicator', { 'aria-hidden': 'true' });
  // balayer vers le haut depuis la barre du bas quitte le téléphone (en plus du bouton ✕, toujours visible)
  let y0 = 0;
  bar.addEventListener('pointerdown', (e) => { y0 = e.clientY; });
  bar.addEventListener('pointerup', (e) => { if (y0 && y0 - e.clientY > 28) o.onQuit(); y0 = 0; });
  const grid = h('div.phh-grid', ...o.grid.map((a) => appButton(a, 56, true)));
  const dock = h('div.phh-dock', ...o.dock.map((a) => appButton(a, 56, false)));
  const el = h('div.phh', { style: `background-image:url(${wallpaperUrl(o.wallpaper)})` }, h('div.phh-top', h('div', clock, date), quit), grid, h('div.phh-spacer'), dock, bar);
  const t = window.setInterval(() => { const d = new Date(); clock.textContent = timeLabel(d); date.textContent = dateLabel(d); }, 20_000);
  return { el, stop: () => window.clearInterval(t) };
}
