/** Petit badge discret de l'écran titre : visible seulement quand le cadeau du jour attend. */
import { h, tap } from '../ui/dom';
import { icon } from '../ui/icons';
import { canClaimToday, onDailyChange } from './state';

export function dailyBadge(): HTMLElement {
  const b = h('button.dy-badge', { 'aria-label': 'Cadeau du jour', title: 'Cadeau du jour' }, icon('gift', 22), h('i.dy-dot'));
  b.addEventListener('click', tap(() => { void import('./ui').then((m) => m.openDaily()); }));
  const refresh = () => { b.classList.toggle('on', canClaimToday()); };
  const off = onDailyChange(() => { if (!b.isConnected) off(); else refresh(); });
  const timer = window.setInterval(() => { if (!b.isConnected) { window.clearInterval(timer); off(); return; } refresh(); }, 30_000);
  refresh();
  return b;
}
