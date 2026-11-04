/** Outils de test (mode `?debug` uniquement) : chaque module y enregistre son petit tableau de bord sous `window.RADIA.<nom>`. */
const store: Record<string, unknown> = {};
const on = (): boolean => typeof location !== 'undefined' && /[?&]debug\b/.test(location.search);
export function dbg(name: string, api: unknown): void {
  if (!on()) return;
  store[name] = api;
  const w = window as unknown as { RADIA?: Record<string, unknown> };
  if (w.RADIA) w.RADIA[name] = api;
}
export const debugApis = (): Record<string, unknown> => store;
