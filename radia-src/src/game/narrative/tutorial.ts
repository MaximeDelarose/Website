/**
 * Tutoriel interactif du niveau 1 : une main montre quoi glisser, Auguste
 * explique ; chaque étape attend la vraie fusion de la joueuse.
 */
import { game } from '../../core/app';
import { MergeScene } from '../merge/MergeScene';
import { idx } from '../merge/rules';
import { h } from '../../ui/dom';
import { ui } from '../../ui/ui';
import { heartPath, paint } from '../art/kit';
import type { LevelDef } from '../merge/types';

const handUrl = () => paint(46, 46, 2, (c) => {
  // petite main stylisée (doigt pointé) en forme de cœur rose
  heartPath(c, 23, 25, 34);
  c.fillStyle = '#FF75A8';
  c.fill();
  c.lineWidth = 2.5;
  c.strokeStyle = '#FFFFFF';
  c.stroke();
}).toDataURL();

export function runTutorial(_def: LevelDef): { stop: () => void } {
  let stopped = false;
  const hand = h('img.tuto-hand', { src: handUrl(), alt: '' });
  const tip = h('div.mh-info', { style: 'bottom:auto;top:46%;z-index:31' });
  let anim: Animation | null = null;
  const steps: [number, number, string][] = [
    [idx(1, 3), idx(2, 3), 'Fais glisser une graine sur une graine identique 🌱'],
    [idx(3, 3), idx(4, 3), 'Bravo ! Encore une fois avec les deux autres graines.'],
    [idx(2, 3), idx(4, 3), 'Deux pousses identiques… fusionne-les aussi !'],
  ];
  const scene = () => { try { return game().scene.getScene(MergeScene.KEY) as MergeScene; } catch { return null; } };

  const show = (k: number) => {
    const sc = scene();
    if (!sc || !sc.sys.isActive() || !sc.state) { window.setTimeout(() => show(k), 200); return; }
    if (stopped) return;
    const [a, b, text] = steps[k];
    const pa = sc.cellCenter(a);
    const pb = sc.cellCenter(b);
    tip.textContent = text;
    if (!tip.isConnected) ui.root.append(tip);
    if (!hand.isConnected) ui.root.append(hand);
    tip.style.top = `${pa.y + sc.cellSize * 0.9}px`;
    anim?.cancel();
    anim = hand.animate([
      { transform: `translate(${pa.x - 10}px, ${pa.y - 6}px) scale(1)`, opacity: 0 },
      { transform: `translate(${pa.x - 10}px, ${pa.y - 6}px) scale(0.9)`, opacity: 1, offset: 0.15 },
      { transform: `translate(${pb.x - 10}px, ${pb.y - 6}px) scale(0.9)`, opacity: 1, offset: 0.7 },
      { transform: `translate(${pb.x - 10}px, ${pb.y - 6}px) scale(1.1)`, opacity: 0 },
    ], { duration: 1700, iterations: Infinity, easing: 'ease-in-out' });
  };

  let shown = -1;
  const poll = window.setInterval(() => {
    const sc = scene();
    if (stopped || !sc?.state) return;
    const k = sc.state.merges;
    if (k >= steps.length || sc.state.won) { stop(); return; }
    if (k !== shown) { shown = k; show(k); }
  }, 250);

  function stop() {
    stopped = true;
    window.clearInterval(poll);
    anim?.cancel();
    hand.remove();
    tip.remove();
  }
  return { stop };
}
