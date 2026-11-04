/**
 * RewardOverlay : couche globale montée directement sur <body> (HORS de #app/#ui, qui créent des contextes d'empilement),
 * au z-index le plus haut du jeu (voir zlayers.ts). Elle contient la scène (`.rw-root`), ses particules (canvas), les objets qui
 * volent, le bandeau des compteurs, ET les paillettes partagées tant qu'elle est ouverte : rien ne peut passer derrière une modale.
 * Elle est retirée dès qu'il n'y a plus de scène (aucun calque résiduel).
 */
import { SUSPEND_SELECTORS } from './zlayers';
import { createSuspender, type ElLike, type FocusLike } from './suspend';

export const LAYER_ID = 'reward-overlay';

let layerEl: HTMLElement | null = null;

/** La couche existe et contient une scène. */
export const rewardOpen = (): boolean => typeof document !== 'undefined' && !!layerEl && layerEl.isConnected && !!layerEl.querySelector('.rw-root');

function ensureLayer(): HTMLElement {
  if (layerEl && layerEl.isConnected) return layerEl;
  layerEl = document.createElement('div');
  layerEl.id = LAYER_ID;
  document.body.append(layerEl);
  return layerEl;
}

/** Où monter un effet (paillettes, objets qui volent) pour qu'il soit visible : dans la couche récompense si elle est ouverte. */
export function fxMount(fallback: HTMLElement | null): HTMLElement {
  if (rewardOpen()) return layerEl!;
  return fallback ?? document.body;
}

/** Monte un nœud dans la couche (créée au besoin). */
export function mountInLayer(node: HTMLElement): void { ensureLayer().append(node); }

/** Retire la couche si elle ne contient plus de scène (et vide ses restes : paillettes). */
export function pruneLayer(): void {
  if (!layerEl) return;
  if (layerEl.querySelector('.rw-root')) return;
  layerEl.remove();
  layerEl = null;
}

const domEnv = () => ({
  hideable: () => Array.from(document.querySelectorAll<HTMLElement>(SUSPEND_SELECTORS.join(','))).filter((e) => !layerEl?.contains(e)) as unknown as ElLike[],
  app: () => document.getElementById('app') as unknown as ElLike | null,
  setOpen: (on: boolean) => document.documentElement.classList.toggle('rw-open', on),
  active: () => {
    const a = document.activeElement as HTMLElement | null;
    return a && a !== document.body ? (a as unknown as FocusLike) : null;
  },
});

let suspender: ReturnType<typeof createSuspender> | null = null;
let watcher: MutationObserver | null = null;

/** Pendant la suspension, une fenêtre/bulle qui apparaît dans #ui est masquée à son tour (restituée à la fin). */
function startWatch(): void {
  if (watcher || typeof MutationObserver === 'undefined') return;
  const ui = document.getElementById('ui');
  if (!ui) return;
  const sel = SUSPEND_SELECTORS.join(',');
  watcher = new MutationObserver((muts) => {
    for (const m of muts) m.addedNodes.forEach((n) => {
      if (!(n instanceof HTMLElement)) return;
      if (n.matches(sel)) suspender?.add(n as unknown as ElLike);
      n.querySelectorAll<HTMLElement>(sel).forEach((e) => suspender?.add(e as unknown as ElLike));
    });
  });
  watcher.observe(ui, { childList: true, subtree: true });
}
function stopWatch(): void { watcher?.disconnect(); watcher = null; }

/**
 * Suspend l'interface en dessous ; renvoie la fonction de restitution. La restitution est différée de 80 ms : deux scènes qui
 * s'enchaînent gardent l'interface masquée (pas de scintillement), puis tout est remis comme avant.
 */
export function holdInterface(): () => void {
  suspender ??= createSuspender(domEnv());
  suspender.acquire();
  startWatch();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    window.setTimeout(() => { suspender?.release(); if (!suspender?.depth()) stopWatch(); pruneLayer(); }, 80);
  };
}
