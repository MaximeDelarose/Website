/**
 * Bulles « Maman ! » : pendant qu'elle joue, les enfants appellent de temps en temps.
 * Toucher « je m'en occupe » = un petit câlin de complicité + quelques pièces.
 * Ignorer la bulle ne coûte rien : elle s'en va toute seule.
 */
import '../styles/kid-calls.css';
import { h, tap } from '../dom';
import { ui } from '../ui';
import { audio, save, game as getGame } from '../../core/app';
import { addRes, world } from '../../core/world';
import { stat } from '../../core/progress';
import { kidName, kidSays } from '../../core/family';
import { canvasUrl, makeCanvas } from '../../game/art/kit';
import { drawKid } from '../../game/art/world/kids';
import { addBond } from '../../game/world/family';
import { reactAuguste } from '../../game/world/auguste';
import { CALLS, type CallDef } from '../../data/world/kidCalls';
import type { KidId } from '../../data/world/ids';

const faceUrl = (k: KidId): string => canvasUrl(`kidface:${k}`, () => {
  const big = makeCanvas(300, 500);
  drawKid(big.getContext('2d')!, k, 'wave', big.width, big.height, 0);
  const c = makeCanvas(112, 112);
  const g = c.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  // la tête et les épaules, centrées
  g.drawImage(big, 70 * (big.width / 300), 78 * (big.height / 500), 160 * (big.width / 300), 160 * (big.width / 300), 0, 0, c.width, c.height);
  return c;
});

let el: HTMLElement | null = null;
let timers: number[] = [];
const clearAll = () => { timers.forEach((t) => window.clearTimeout(t)); timers = []; el?.remove(); el = null; };
const later = (fn: () => void, ms: number) => { timers.push(window.setTimeout(fn, ms)); };
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

function close(): void {
  const e = el;
  if (!e) return;
  e.classList.add('out');
  timers.forEach((t) => window.clearTimeout(t));
  timers = [];
  el = null;
  window.setTimeout(() => e.remove(), 300);
}

/** Affiche un appel (visible en test via window.RADIA : `kidCall('tease')`). */
export function showKidCall(def: CallDef): void {
  clearAll();
  const lines = def.lines(kidName, kidSays, pick);
  const av = h('img.kc-av', { alt: '' });
  const who = h('b');
  const say = h('span');
  const actions = h('div.kc-actions');
  const root = h('div.kc', h('div.kc-face', av), h('div.kc-body', who, say, actions));
  el = root;
  ui.root.append(root);
  audio.play('pop2');

  const showLine = (i: number) => {
    const l = lines[i];
    av.src = faceUrl(l.kid);
    who.textContent = kidName(l.kid);
    say.textContent = l.text;
    root.classList.remove('pulse');
    void root.offsetWidth;
    root.classList.add('pulse');
  };
  showLine(0);
  lines.slice(1).forEach((_l, j) => later(() => { showLine(j + 1); audio.play('pop1'); }, 2300 * (j + 1)));
  const lastAt = 2300 * (lines.length - 1);
  later(() => {
    const go = h('button.btn.small', { on: { click: tap(() => accept(def, root, who, say, actions, av)) } }, def.cta);
    const skip = h('button.btn.small.secondary', { on: { click: tap(() => close(), { sound: false }) } }, 'Plus tard');
    actions.append(go, skip);
    root.classList.add('ask');
  }, lastAt + 400);
  later(close, lastAt + 400 + 9000); // pas de pénalité : la bulle s'efface
}

function accept(def: CallDef, root: HTMLElement, who: HTMLElement, say: HTMLElement, actions: HTMLElement, av: HTMLImageElement): void {
  const w = world();
  for (const k of def.kids) addBond(w, k, 1);
  addRes('coins', def.coins);
  stat('world.family.care');
  save.save();
  audio.play('heart');
  actions.textContent = '';
  root.classList.remove('ask');
  root.classList.add('done');
  av.src = faceUrl(def.kids[0]);
  who.textContent = 'Merci maman ♡';
  say.textContent = `${def.done}  +${def.coins} pièces`;
  timers.forEach((t) => window.clearTimeout(t));
  timers = [];
  later(close, 3200);
  window.setTimeout(() => reactAuguste('family', 0.5), 1200);
}

// ------------------------------------------------------------------ planificateur

let started = false;
let playedMs = 0;
let nextAt = 90_000; // première visite après ~1 min 30 de jeu effectif
let lastId = '';

const busy = (): boolean =>
  !!document.querySelector('.modal-backdrop:not(.leaving), .dialog-layer:not(.leaving), .finale-layer, .chapter-card, .chess-view, .kc');

/** Le plateau de fusion est affiché et aucun autre mini-jeu n'est en cours. */
function onMergeBoard(): boolean {
  try {
    const g = getGame();
    const merge = g.scene.getScene('merge');
    if (!merge || !merge.sys.isActive()) return false;
    const others = g.scene.getScenes(true).map((s) => s.sys.settings.key).filter((k) => k !== 'backdrop' && k !== 'merge');
    return others.length === 0;
  } catch { return false; }
}

export function startKidCalls(): void {
  if (started) return;
  started = true;
  let last = Date.now();
  window.setInterval(() => {
    const now = Date.now();
    const dt = Math.min(10_000, now - last);
    last = now;
    if (document.hidden || busy() || !onMergeBoard()) return;
    if ((save.data.stats.merges ?? 0) < 25) return; // laisse d'abord découvrir le jeu
    playedMs += dt;
    if (playedMs < nextAt) return;
    playedMs = 0;
    nextAt = 150_000 + Math.random() * 120_000; // ensuite toutes les 2,5 à 4,5 min de jeu
    const pool = CALLS.filter((c) => c.id !== lastId);
    const def = pick(pool);
    lastId = def.id;
    showKidCall(def);
  }, 5000);
}

export const callIds = (): string[] => CALLS.map((c) => c.id);
export const callById = (id: string): CallDef | undefined => CALLS.find((c) => c.id === id);
