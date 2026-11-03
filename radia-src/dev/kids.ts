import { drawKid, type KidPose } from '../src/game/art/world/kids';
import { KID_IDS } from '../src/data/world/ids';
const out = document.getElementById('out')!;
const poses: KidPose[] = ['idle', 'wave', 'happy', 'play', 'think'];
const tt = Number(new URLSearchParams(location.search).get('t') ?? 0.8);
for (const kid of KID_IDS) {
  const r = document.createElement('div'); r.className = 'row'; out.append(r);
  for (const p of poses) {
    const c = document.createElement('canvas'); c.width = 400; c.height = 560; c.style.width = '200px'; c.style.height = '280px';
    const x = c.getContext('2d')!; x.scale(2, 2); drawKid(x, kid, p, 200, 280, tt); r.append(c);
  }
}
(window as unknown as { done: boolean }).done = true;
