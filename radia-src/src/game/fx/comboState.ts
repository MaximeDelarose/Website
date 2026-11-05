/**
 * État partagé des COMBOS (logique pure, sans DOM, testée dans tests/combo-state.test.ts).
 *
 * Un combo est « actif » tant que la dernière fusion de la chaîne date de moins de `COMBO_HOLD_MS`. Pendant ce temps (et pendant un glissement
 * d'objet) l'interface ne doit RIEN faire apparaître : ni notice, ni message d'Auguste, ni invitation, ni coffre qui s'ouvre. Les gains et les
 * petites annonces sont mis de côté puis résumés UNE seule fois quand le combo se termine.
 */
export const COMBO_HOLD_MS = 3000; // = COMBO_WINDOW_MS du moteur : le combo est actif tant que la fusion suivante PEUT encore le prolonger

export interface ComboRecap { merges: number; points: number; best: number; notes: string[] }
type Timer = ReturnType<typeof setTimeout>;

let until = 0;
let dragging = false;
let timer: Timer | null = null;
let recap: ComboRecap = { merges: 0, points: 0, best: 0, notes: [] };
const endListeners = new Set<(r: ComboRecap) => void>();
const changeListeners = new Set<() => void>();
let nowFn: () => number = () => Date.now();

/** Tests : horloge injectable. */
export function __setClock(f: (() => number) | null): void { nowFn = f ?? (() => Date.now()); }

/** Une fusion de la chaîne vient d'avoir lieu (`value` = compteur de combo, `points` = points de cette fusion). */
export function comboTick(value: number, points = 0): void {
  const now = nowFn();
  if (value >= 2) {
    until = now + COMBO_HOLD_MS;
    arm();
  }
  recap.merges += 1; recap.points += Math.max(0, points); recap.best = Math.max(recap.best, value);
  changeListeners.forEach((f) => f());
}

/** Annonce secondaire (« +1 Baguette magique »…) à résumer à la fin du combo. */
export function comboNote(text: string): void { if (text && !recap.notes.includes(text)) recap.notes.push(text); }

export function isComboBusy(now = nowFn()): boolean { return now < until; }
export function setDragging(on: boolean): void { if (dragging === on) return; dragging = on; changeListeners.forEach((f) => f()); }
export const isDragging = (): boolean => dragging;
/** Vrai tant qu'il ne faut rien faire apparaître : combo actif OU objet en cours de glissement. */
export function isBoardBusy(now = nowFn()): boolean { return dragging || isComboBusy(now); }

/** Résumé en cours (copie). */
export function currentRecap(): ComboRecap { return { ...recap, notes: [...recap.notes] }; }

/** Appelé UNE fois quand le combo se termine (avec son résumé) ; renvoie la fonction qui se désabonne. */
export function onComboEnd(f: (r: ComboRecap) => void): () => void { endListeners.add(f); return () => endListeners.delete(f); }
/** Appelé à chaque changement d'état (tick, glissement, fin). */
export function onBoardBusyChange(f: () => void): () => void { changeListeners.add(f); return () => changeListeners.delete(f); }

function arm(): void {
  if (timer) clearTimeout(timer);
  const left = Math.max(0, until - nowFn());
  timer = setTimeout(() => { timer = null; if (nowFn() >= until) finish(); else arm(); }, left + 20);
}

function finish(): void {
  const r = recap; recap = { merges: 0, points: 0, best: 0, notes: [] };
  until = 0;
  changeListeners.forEach((f) => f());
  if (r.best >= 2) endListeners.forEach((f) => { try { f(r); } catch { /* un abonné défaillant ne bloque pas les autres */ } });
}

/** Tests / changement d'écran : tout remettre à zéro sans émettre de résumé. */
export function resetComboState(): void { if (timer) clearTimeout(timer); timer = null; until = 0; dragging = false; recap = { merges: 0, points: 0, best: 0, notes: [] }; endListeners.clear(); changeListeners.clear(); }
/** Termine tout de suite le combo en cours (la fin de partie, la fermeture du plateau). */
export function endComboNow(): void { if (timer) clearTimeout(timer); timer = null; if (until) finish(); }
