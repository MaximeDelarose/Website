/** Interface d'« Harmonie » : 5 manches pour décorer une chambre miniature. */
import { h, tap } from '../../../dom';
import { audio } from '../../../../core/app';
import { harmonyDone, harmonyStars, harmonyTheme, harmonyTotal, newHarmony, submitRound, SLOTS, HARMONY_ROUNDS, HARMONY_MAX_ROUND, type Picks, type Slot } from '../../../../game/world/familyGames/harmony';
import { mulberry32 } from '../../../../game/world/familyGames/rng';
import { PALETTE, type ColorId, type KidId } from '../../../../data/world/ids';
import { drawMiniRoom } from './art';
import { finishGame, gameShell } from './common';
import { texScale } from '../../../../game/art/kit';

const SLOT_NAME: Record<Slot, string> = { wall: 'Mur', floor: 'Sol', curtain: 'Rideau' };
const colorName = (id: ColorId) => PALETTE.find((p) => p.id === id)?.name ?? id;

export function playHarmony(kid: KidId): Promise<void> {
  return new Promise((resolve) => {
    let alive = true;
    let raf = 0;
    const exit = () => { alive = false; cancelAnimationFrame(raf); resolve(); };

    const start = async (): Promise<void> => {
      const s = newHarmony(mulberry32Seeded());
      const { info, stage } = gameShell('harmony', kid, exit);
      const picks: Partial<Picks> = {};
      let active: Slot = 'wall';
      let locked = false;
      const round = h('div.hm-round');
      const theme = h('div.hm-theme');
      info.append(round);
      const cv = h('canvas.hm-room');
      const slotBtns = new Map<Slot, HTMLButtonElement>();
      const slotRow = h('div.hm-slots');
      for (const sl of SLOTS) {
        const b = h('button.hm-slot', { on: { click: tap(() => { if (!locked) { active = sl; refresh(); } }, { sound: false }) } }, h('i.hm-dot'), h('span', SLOT_NAME[sl])) as HTMLButtonElement;
        slotBtns.set(sl, b); slotRow.append(b);
      }
      const sw = h('div.hm-swatches');
      const swBtns = new Map<ColorId, HTMLButtonElement>();
      for (const p of PALETTE) {
        const b = h('button.hm-sw', { 'aria-label': p.name, on: { click: tap(() => choose(p.id), { sound: false, delay: 100 }) } }, h('i', { style: `background:${p.color}` }), h('small', p.name)) as HTMLButtonElement;
        swBtns.set(p.id, b); sw.append(b);
      }
      const feedback = h('div.hm-feedback');
      const go = h('button.btn.wide.hm-go', { on: { click: tap(() => void validate()) } }, 'Valider') as HTMLButtonElement;
      stage.append(theme, h('div.hm-roomwrap', cv), slotRow, sw, feedback, go);

      const refresh = () => {
        const th = harmonyTheme(s);
        round.textContent = `Manche ${Math.min(s.round + 1, HARMONY_ROUNDS)}/${HARMONY_ROUNDS} · Points : ${harmonyTotal(s)}`;
        theme.replaceChildren(h('b', th.name), h('small', ` — ${th.hint}`));
        for (const sl of SLOTS) {
          const b = slotBtns.get(sl)!;
          b.classList.toggle('on', sl === active);
          (b.querySelector('.hm-dot') as HTMLElement).style.background = picks[sl] ? PALETTE.find((p) => p.id === picks[sl])!.color : 'transparent';
        }
        for (const [id, b] of swBtns) b.classList.toggle('on', picks[active] === id);
        go.disabled = !(picks.wall && picks.floor && picks.curtain) || locked;
        go.classList.toggle('locked', go.disabled);
      };

      function choose(id: ColorId): void {
        if (locked) return;
        picks[active] = id;
        audio.play('pop1');
        const next = SLOTS.find((x) => !picks[x]);
        if (next) active = next;
        refresh();
      }

      async function validate(): Promise<void> {
        if (locked || !(picks.wall && picks.floor && picks.curtain)) return;
        const th = harmonyTheme(s);
        const r = submitRound(s, picks as Picks)!;
        locked = true;
        audio.play(r.total >= 7 ? 'reward' : r.total >= 4 ? 'pop2' : 'pop3');
        const tips = SLOTS.filter((sl) => r.parts[sl] < 3).map((sl) => `${SLOT_NAME[sl]} : ${th[sl].best.map(colorName).join(' ou ')}`);
        feedback.replaceChildren(
          h('div.hm-score', h('b', `${r.total}/${HARMONY_MAX_ROUND}`), r.total >= 8 ? ' Parfait !' : r.total >= 5 ? ' Joli accord !' : ' Presque…'),
          h('div.hm-parts', ...SLOTS.map((sl) => h(`span.chip.hm-part${r.parts[sl] === 3 ? '.top' : ''}`, `${SLOT_NAME[sl]} ${r.parts[sl]}/3`))),
          tips.length ? h('small.hm-tip', `Idée : ${tips.join(' · ')}`) : h('small.hm-tip', 'Toutes les couleurs sont idéales !'),
        );
        go.textContent = harmonyDone(s) ? 'Terminer' : 'Manche suivante';
        go.disabled = false; go.classList.remove('locked');
        go.onclick = tap(() => void next());
        draw();
      }

      async function next(): Promise<void> {
        if (harmonyDone(s)) {
          cancelAnimationFrame(raf);
          const total = harmonyTotal(s);
          const out = await finishGame({ game: 'harmony', who: kid, score: total, stars: harmonyStars(total) });
          if (!alive) return;
          if (out === 'again') void start(); else exit();
          return;
        }
        for (const sl of SLOTS) delete picks[sl];
        active = 'wall'; locked = false; feedback.replaceChildren();
        go.textContent = 'Valider'; go.onclick = tap(() => void validate());
        refresh(); draw();
      }

      const col = (sl: Slot): string => PALETTE.find((p) => p.id === picks[sl])?.color ?? ({ wall: '#EDE3D6', floor: '#D9CBB8', curtain: '#E6DDF0' })[sl];
      const draw = (t = 0) => {
        const r = cv.getBoundingClientRect();
        if (!r.width) return;
        const dpr = Math.min(2, texScale());
        const w = Math.round(r.width); const hh = Math.round(r.height);
        if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = hh * dpr; }
        const x = cv.getContext('2d')!;
        x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, hh);
        drawMiniRoom(x, w, hh, col('wall'), col('floor'), col('curtain'), t / 1000);
      };
      let last = 0;
      const loop = (t: number) => { if (!alive) return; raf = requestAnimationFrame(loop); if (t - last < 66) return; last = t; draw(t); };
      raf = requestAnimationFrame(loop);
      refresh();
    };
    void start();
  });
}

function mulberry32Seeded() { return mulberry32((Date.now() ^ 0x85ebca6b) >>> 0); }
