/** Scène : puzzle électrique — relier chaque fil à la prise de la même couleur. */
import { h, tap } from '../../../ui/dom';
import { audio } from '../../../core/app';
import { haptic } from '../../../core/haptics';
import { openFrame, confettiBurst } from './frame';
import { generateWires, linkOk, wiresSolved, WIRE_COLORS, WIRE_NAMES } from '../wires';

export function runWires(seed: number): Promise<boolean> {
  const f = openFrame('Puzzle électrique', 'Touche un fil, puis la prise de la même couleur.', 'wr');
  let diff: 1 | 2 | 3 = 1;
  let sel = -1;
  let links: number[] = [];
  let lvl = generateWires(seed, diff);
  let locked = false;
  let nonce = 0;
  const tabs = h('div.pp-tabs');
  const stage = h('div.wr-stage');
  const bulb = h('div.wr-bulb', '💡');
  f.body.append(tabs, bulb, stage);
  const rowH = () => (lvl.n <= 3 ? 84 : lvl.n === 4 ? 72 : 62);

  function renderTabs() {
    tabs.replaceChildren(...([1, 2, 3] as const).map((d) => h(`button.chip.pp-tab${d === diff ? '.on' : ''}`, { on: { click: tap(() => { diff = d; build(); }, { sound: false }) } }, d === 1 ? '3 fils' : d === 2 ? '4 fils' : '5 fils')));
  }
  function draw() {
    stage.replaceChildren();
    const n = lvl.n, H = n * rowH();
    stage.style.height = `${H}px`;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'wr-svg'); svg.setAttribute('viewBox', `0 0 300 ${H}`); svg.setAttribute('preserveAspectRatio', 'none');
    links.forEach((row, i) => {
      if (row < 0) return;
      const y1 = i * rowH() + rowH() / 2, y2 = row * rowH() + rowH() / 2;
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', `M0 ${y1} C 150 ${y1}, 150 ${y2}, 300 ${y2}`);
      p.setAttribute('stroke', WIRE_COLORS[i]); p.setAttribute('class', 'wr-wire');
      svg.append(p);
    });
    stage.append(svg);
    for (let i = 0; i < n; i++) {
      const linked = links[i] >= 0;
      stage.append(h(`button.wr-end.l${sel === i ? '.sel' : ''}${linked ? '.ok' : ''}`, {
        style: `top:${i * rowH()}px;--c:${WIRE_COLORS[i]}`, 'aria-label': `Fil ${WIRE_NAMES[i]}`,
        on: { click: tap(() => { if (locked || linked) return; sel = sel === i ? -1 : i; audio.play('select'); haptic('select'); draw(); }, { sound: false, delay: 120 }) },
      }));
      const rc = lvl.right[i];
      const taken = links.includes(i);
      stage.append(h(`button.wr-end.r${taken ? '.ok' : ''}`, {
        style: `top:${i * rowH()}px;--c:${WIRE_COLORS[rc]}`, 'aria-label': `Prise ${WIRE_NAMES[rc]}`,
        on: { click: tap(() => plug(i), { sound: false, delay: 120 }) },
      }));
    }
  }
  function plug(row: number) {
    if (locked || sel < 0 || links.includes(row)) return;
    if (linkOk(lvl, sel, row)) {
      links[sel] = row; sel = -1;
      audio.play('pop2'); haptic('merge');
      draw();
      if (wiresSolved(lvl, links)) win();
    } else {
      audio.play('invalid'); haptic('error');
      const el = stage.querySelector('.wr-end.l.sel');
      el?.classList.add('shake');
      f.setHint('Pas cette prise-là, essaie la couleur assortie ♡');
      f.later(() => el?.classList.remove('shake'), 400);
    }
  }
  function win() {
    locked = true;
    bulb.classList.add('on');
    audio.play('reward'); haptic('reward');
    f.setHint('Clic ! Le courant est revenu ♡');
    f.later(() => confettiBurst(f.layer), 250);
    f.finish(true, 1700);
  }
  function build() {
    nonce++; locked = false; sel = -1;
    lvl = generateWires(seed + nonce * 53, diff);
    links = Array(lvl.n).fill(-1);
    bulb.classList.remove('on');
    f.setHint('Touche un fil, puis la prise de la même couleur.');
    renderTabs(); draw();
  }
  build();
  return f.result;
}
