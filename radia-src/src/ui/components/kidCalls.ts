/**
 * Bulles « Maman ! » : pendant qu'elle joue, les enfants appellent de temps en temps.
 * Toucher « je m'en occupe » = un petit câlin de complicité + quelques pièces.
 * Ignorer la bulle ne coûte rien : elle s'en va toute seule.
 * La petite, elle, redemande plus fort si on la fait attendre (mais n'est jamais punie ni grondée).
 * La bulle s'affiche en haut, à droite du bouton pause : elle ne cache jamais le plateau ni les commandes.
 */
import '../styles/kid-calls.css';
import { h, tap } from '../dom';
import { ui } from '../ui';
import { audio, save, game as getGame } from '../../core/app';
import { addRes, world } from '../../core/world';
import { stat } from '../../core/progress';
import { kidName, kidSays, kidGive, kidLouder } from '../../core/family';
import { canvasUrl, makeCanvas } from '../../game/art/kit';
import { drawKid } from '../../game/art/world/kids';
import { addBond } from '../../game/world/family';
import { reactAuguste } from '../../game/world/auguste';
import { CALLS, type CallDef } from '../../data/world/kidCalls';
import type { KidId } from '../../data/world/ids';

/** Visage rond : on repère la silhouette dessinée, puis on recadre sur la tête et les épaules. */
export const faceUrl = (k: KidId): string => canvasUrl(`kidface2:${k}`, () => {
  const big = makeCanvas(300, 500);
  const bg = big.getContext('2d')!;
  drawKid(bg, k, 'idle', big.width, big.height, 0);
  const { data, width, height } = bg.getImageData(0, 0, big.width, big.height);
  let x0 = width, x1 = 0, y0 = height;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; }
  const bw = Math.max(20, x1 - x0);
  const size = Math.round(bw * 1.25);
  const c = makeCanvas(112, 112);
  const g = c.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(big, Math.round((x0 + x1) / 2 - size / 2), Math.max(0, y0 - 6), size, size, 0, 0, c.width, c.height);
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

const LOUD_DEFAULT = ['MAMANNN !!', 'MAMAAAAAAN !!!'];

/** Affiche un appel (visible en test via window.RADIA : `kidCall('cuddle')`). `level` = insistance (0 à 2). */
export function showKidCall(def: CallDef, level = 0): void {
  clearAll();
  const first = def.kids[0];
  let lines = def.lines(kidName, kidSays, pick);
  if (level > 0) {
    const loud = kidLouder(first);
    const pool = loud.length ? loud : LOUD_DEFAULT;
    lines = [{ kid: first, text: pool[Math.min(level - 1, pool.length - 1)] }];
  }
  const av = h('img.kc-av', { alt: '' });
  const who = h('b');
  const say = h('span');
  const actions = h('div.kc-actions');
  const root = h(`div.kc.lvl${level}`, h('div.kc-face', av), h('div.kc-body', who, say, actions));
  el = root;
  ui.root.append(root);
  audio.play(level ? 'pop3' : 'pop2');

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
  const lastAt = level > 0 ? 0 : 2300 * (lines.length - 1);
  later(() => {
    const label = def.escalate ? (kidGive(first) || def.cta) : def.cta;
    const go = h('button.btn.small', { on: { click: tap(() => accept(def, root, who, say, actions, av)) } }, label);
    actions.append(go);
    if (def.escalate) {
      // la petite redemande aussitôt, plus fort ; après deux fois, il n'y a plus que « donner »
      if (level < 2) actions.append(h('button.btn.small.secondary', { on: { click: tap(() => { audio.play('pop3'); showKidCall(def, level + 1); }, { sound: false }) } }, 'Attendre'));
    } else {
      actions.append(h('button.btn.small.secondary', { on: { click: tap(() => close(), { sound: false }) } }, 'Plus tard'));
    }
    root.classList.add('ask');
  }, lastAt + (level > 0 ? 250 : 400));
  // pas de pénalité : la bulle s'efface toute seule (plus lentement quand la petite insiste)
  later(close, lastAt + 400 + (def.escalate && level > 0 ? 20000 : 9000));
}

function accept(def: CallDef, root: HTMLElement, who: HTMLElement, say: HTMLElement, actions: HTMLElement, av: HTMLImageElement): void {
  const w = world();
  for (const k of def.kids) addBond(w, k, 1);
  addRes('coins', def.coins);
  stat('world.family.care');
  save.save();
  audio.play('heart');
  actions.textContent = '';
  root.classList.remove('ask', 'lvl1', 'lvl2');
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
  !!document.querySelector('.modal-backdrop:not(.leaving), .dialog-layer:not(.leaving), .finale-layer, .chapter-card, .chess-view, .kc, .ev-layer, .ev-notif, .ev-inv-back, .ph-back');

/** Le plateau de fusion est affiché et aucun autre mini-jeu n'est en cours. */
function onMergeBoard(): boolean {
  try {
    const g = getGame();
    const merge = g.scene.getScene('merge');
    if (!merge || !merge.sys.isActive()) return false;
    return g.scene.getScenes(true).map((s) => s.sys.settings.key).filter((k) => k !== 'backdrop' && k !== 'merge').length === 0;
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
