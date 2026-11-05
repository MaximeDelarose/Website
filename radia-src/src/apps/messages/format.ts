/** Messages — libellés d'horodatage façon iMessage (fonctions pures, testées). */
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const p2 = (n: number): string => String(n).padStart(2, '0');
export const hhmm = (ms: number): string => { const d = new Date(ms); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
const dayStart = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const daysAgo = (ms: number, now: number): number => Math.round((dayStart(now) - dayStart(ms)) / 86_400_000);

/** Séparateur au-dessus d'un groupe de messages : « Aujourd'hui 14:32 », « Hier 21:10 », « mardi 08:15 », « 3 novembre 08:15 ». */
export function separatorLabel(ms: number, now: number): string {
  const d = new Date(ms); const n = daysAgo(ms, now);
  if (n <= 0) return `Aujourd'hui ${hhmm(ms)}`;
  if (n === 1) return `Hier ${hhmm(ms)}`;
  if (n < 7) return `${DAYS[d.getDay()]} ${hhmm(ms)}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${hhmm(ms)}`;
}
/** Heure dans la liste des conversations : heure si aujourd'hui, « Hier », jour de la semaine, sinon date courte. */
export function listTime(ms: number, now: number): string {
  if (!ms) return '';
  const d = new Date(ms); const n = daysAgo(ms, now);
  if (n <= 0) return hhmm(ms);
  if (n === 1) return 'Hier';
  if (n < 7) return DAYS[d.getDay()];
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)}`;
}
/** Un séparateur d'heure s'affiche entre deux messages éloignés de plus de 30 minutes ou de jours différents. */
export const needSeparator = (prev: number | null, cur: number): boolean => prev === null || cur - prev > 30 * 60_000 || dayStart(cur) !== dayStart(prev);
