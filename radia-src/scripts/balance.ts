import { LEVELS } from '../src/data/levels';
import { createRun } from '../src/game/merge/rules';
import { simulate } from '../src/game/merge/bot';
const N = 24;
for (const l of LEVELS) {
  const taps: number[] = [], acts: number[] = [], rec: number[] = [];
  let fails = 0;
  for (let seed = 1; seed <= N; seed++) {
    const s = createRun(l, 'story', seed * 104729);
    const r = simulate(s, l, 600, l.objectives.some((o) => o.t === 'combo') ? 'fast' : 'human');
    if (!r.won) fails++;
    taps.push(r.taps); acts.push(r.actions); rec.push(r.recoveries);
  }
  const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const p90 = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length * 0.9)];
  console.log(`${l.id}\tpar ${l.par}\ttaps med ${med(taps)} p90 ${p90(taps)}\tactions med ${med(acts)}\trecov ${rec.reduce((a,b)=>a+b,0)}\tfails ${fails}`);
}
