/**
 * Petites attentions d'Auguste : de temps en temps, un mot doux (« j'espère que tu passes
 * un bon moment… »). Rien à faire, rien à répondre, jamais pendant un moment important.
 */
import { game as getGame } from '../../core/app';
import { augusteSays } from './augusteSays';
import { checkinLine } from '../../data/world/augusteLines';

let started = false;
let last = 0;
let visibleMs = 0;
let nextAt = 4 * 60_000; // premier mot après ~4 minutes de présence
let lastLine = '';

const busy = (): boolean =>
  !!document.querySelector('.modal-backdrop:not(.leaving), .dialog-layer:not(.leaving), .finale-layer, .chapter-card, .chess-view, .kc, .aug-says, .splash, .ev-layer, .ev-notif, .ev-inv-back, .ph-back');

const noMinigame = (): boolean => {
  try {
    const g = getGame();
    return g.scene.getScenes(true).map((s) => s.sys.settings.key).filter((k) => k !== 'backdrop' && k !== 'merge').length === 0;
  } catch { return false; }
};

export function startCheckins(): void {
  if (started) return;
  started = true;
  last = Date.now();
  window.setInterval(() => {
    const now = Date.now();
    const dt = Math.min(10_000, now - last);
    last = now;
    if (document.hidden || busy() || !noMinigame()) return;
    visibleMs += dt;
    if (visibleMs < nextAt) return;
    visibleMs = 0;
    nextAt = 7 * 60_000 + Math.random() * 5 * 60_000; // ensuite toutes les 7 à 12 minutes
    let line = checkinLine(new Date().getHours(), (n) => Math.floor(Math.random() * n));
    if (line === lastLine) line = checkinLine(new Date().getHours(), (n) => Math.floor(Math.random() * n));
    lastLine = line;
    augusteSays(line, 6200);
  }, 5000);
}
