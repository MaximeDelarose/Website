/** Écran de la roue de cadeaux quotidienne : grande roue pastel, Radia appuie sur « Tourner », probabilités transparentes. */
import { h } from '../ui/dom';
import { audio, reducedFx } from '../core/app';
import { haptic } from '../core/haptics';
import { giftWheelCanvas } from '../game/art/casino';
import { radiaBustCanvas } from '../game/art/world/radiaNow';
import { RARITY_COLOR, revealItem, sparkleBurst, confetti, type Rarity } from '../ui/fx/sparkle';
import { LOTS, probOf, lotById, type LotDef } from './table';
import { nextWheelIn, spinToday, wheelReady, wheelState } from './store';
import type { Granted } from './logic';

const RARITY: Record<string, Rarity> = { coins100: 'common', coins300: 'uncommon', energy3: 'common', diamonds2: 'uncommon', diamonds6: 'rare', chips200: 'uncommon', chips600: 'rare', fashion: 'epic', deco: 'rare', fragment: 'rare' };
const pct = (x: number): string => `${(x * 100).toFixed(1).replace('.', ',')} %`;
const wait = (ms: number): Promise<void> => new Promise((r) => window.setTimeout(r, ms));
/** « 5 h 12 min » / « 12 min » / « moins d'une minute ». */
const left = (ms: number): string => { const m = Math.ceil(ms / 60000); const hh = Math.floor(m / 60); return hh > 0 ? `${hh} h ${String(m % 60).padStart(2, '0')} min` : m > 0 ? `${m} min` : 'moins d\'une minute'; };
let openNow: Promise<void> | null = null;

/** Table de vitesse lisse : accélère vite, puis ralentit longuement (intégrale normalisée). */
function easeTable(): (p: number) => number {
  const N = 240; const cum = [0];
  for (let i = 1; i <= N; i++) { const p = i / N; cum.push(cum[i - 1] + (1 - p) ** 2.4 * (1 - Math.exp(-p * 18))); }
  const tot = cum[N];
  return (p) => { const x = Math.min(1, Math.max(0, p)) * N; const i = Math.min(N - 1, Math.floor(x)); return (cum[i] + (cum[i + 1] - cum[i]) * (x - i)) / tot; };
}

export function showWheel(): Promise<void> {
  if (openNow) return openNow;
  openNow = new Promise<void>((resolve) => {
    const soft = reducedFx();
    const step = 360 / LOTS.length;
    let busy = false, closed = false, ang = 0, timer = 0;
    const wheelCv = giftWheelCanvas(150, LOTS.map((l) => ({ color: l.color, emoji: l.emoji, short: l.short })));
    wheelCv.className = 'wh-wheel'; wheelCv.setAttribute('role', 'img'); wheelCv.setAttribute('aria-label', 'Roue de cadeaux');
    const pointer = h('div.wh-pointer', h('i'));
    const status = h('p.wh-status');
    const gotBox = h('div.wh-got');
    const probBox = h('div.wh-probs');
    const bubble = h('div.wh-bubble', 'C\'est parti !');
    const radia = h('div.wh-radia', radiaBustCanvas('smile', 200), bubble);
    const goBtn = h('button.btn.gold.wh-go', 'Tourner ♡') as HTMLButtonElement;
    const probBtn = h('button.wh-probbtn', 'Probabilités');
    const closeBtn = h('button.wh-x', { 'aria-label': 'Fermer' }, '✕');
    const lastLine = h('p.wh-last');
    const root = h('div.wh-root', h('div.wh-head', closeBtn, h('h1', 'La roue du jour ♡'), probBtn),
      h('div.wh-body', h('div.wh-stage', h('div.wh-halo'), wheelCv, pointer), status, gotBox, probBox, lastLine,
        h('div.wh-actions', radia, goBtn)));
    document.getElementById('ui')?.append(root) ?? document.body.append(root);

    const paintProbs = () => {
      probBox.replaceChildren(h('p.wh-ptitle', 'Chaque tirage offre toujours un cadeau. Voici ta chance pour chaque lot :'),
        ...LOTS.map((l) => h('div.wh-prow', h('span.wh-pe', l.emoji), h('span.wh-pn', l.name), h('b', pct(probOf(l))))),
        h('p.wh-psmall', 'Un seul tirage gratuit par jour, sans achat. Un objet déjà possédé est remplacé par des pièces.'));
    };
    paintProbs();
    probBox.style.display = 'none';
    probBtn.addEventListener('click', () => { const on = probBox.style.display === 'none'; probBox.style.display = on ? '' : 'none'; probBtn.classList.toggle('on', on); audio.play('select'); if (on) probBox.scrollIntoView({ block: 'nearest', behavior: soft ? 'auto' : 'smooth' }); });

    const refresh = () => {
      const ready = wheelReady();
      goBtn.disabled = busy || !ready;
      goBtn.textContent = ready ? 'Tourner ♡' : 'Déjà tourné aujourd\'hui';
      root.classList.toggle('done', !ready);
      status.textContent = busy ? '' : ready ? 'Ton tirage gratuit du jour t\'attend !' : `Prochain tirage disponible dans ${left(nextWheelIn())}`;
      const l: LotDef | undefined = wheelState().last ? lotById(wheelState().last) : undefined;
      lastLine.textContent = !ready && l && gotBox.childElementCount === 0 ? `Cadeau d'aujourd'hui : ${l.name}` : '';
    };
    refresh();
    timer = window.setInterval(() => { if (!busy) refresh(); }, 1000);

    const close = () => {
      if (closed || busy) return;
      closed = true; window.clearInterval(timer);
      root.classList.add('leaving'); window.setTimeout(() => root.remove(), 220);
      openNow = null; resolve();
    };
    closeBtn.addEventListener('click', () => { audio.play('button'); close(); });

    const setAngle = (a: number) => { ang = a; wheelCv.style.transform = `rotate(${a}deg)`; };
    const flick = () => { if (!soft) pointer.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-22deg)' }, { transform: 'rotate(0)' }], { duration: 130, easing: 'ease-out' }); };

    async function spin(): Promise<void> {
      if (busy || !wheelReady()) return;
      busy = true; goBtn.disabled = true; gotBox.replaceChildren(); gotBox.classList.remove('show'); lastLine.textContent = '';
      // Radia appuie sur le bouton
      audio.play('button'); haptic('select');
      radia.classList.add('press'); goBtn.classList.add('pressed'); bubble.classList.add('show');
      await wait(soft ? 100 : 420);
      goBtn.classList.remove('pressed'); bubble.classList.remove('show'); radia.classList.remove('press');
      // le cadeau est tiré ET versé avant l'animation (claim atomique d'abord)
      const out = spinToday();
      if (!out) { busy = false; refresh(); return; }
      status.textContent = 'La roue tourne…';
      const i = LOTS.findIndex((l) => l.id === out.lot.id);
      const jitter = (Math.random() - 0.5) * step * 0.6;
      const turns = soft ? 2 : 5 + Math.floor(Math.random() * 2);
      const start = ((ang % 360) + 360) % 360;
      const target = (((360 - i * step + jitter) % 360) + 360) % 360;
      const dist = turns * 360 + ((((target - start) % 360) + 360) % 360);
      const T = soft ? 1700 : 5200;
      const e = easeTable();
      audio.play('windup');
      let lastSlice = -1, t0 = 0;
      await new Promise<void>((done) => {
        const frame = (now: number) => {
          if (!t0) t0 = now;
          const p = Math.min(1, (now - t0) / T);
          setAngle(start + dist * e(p));
          const slice = Math.floor((((start + dist * e(p)) + step / 2) % 360) / step);
          if (slice !== lastSlice) { lastSlice = slice; if (!soft) { audio.play('wheelTick'); flick(); if (p > 0.8) haptic('select'); } }
          if (p < 1) requestAnimationFrame(frame); else done();
        };
        requestAnimationFrame(frame);
      });
      setAngle(((start + dist) % 360));
      await reveal(out.granted);
      busy = false; refresh();
    }

    async function reveal(g: Granted): Promise<void> {
      const rarity = RARITY[g.lot.id] ?? 'rare';
      const ico = h('div.wh-gico', { style: `--rc:${RARITY_COLOR[rarity]}` }, g.lot.emoji);
      gotBox.replaceChildren(h('small', g.duplicate ? 'Déjà dans ta collection !' : 'Ton cadeau du jour'), ico, h('b', g.duplicate ? g.text : `Tu as gagné : ${g.text} ♡`));
      gotBox.classList.add('show');
      audio.play(rarity === 'epic' || rarity === 'rare' ? 'popRare' : 'reward'); audio.play('sparkle');
      haptic('wheelWin'); haptic('daily');
      void revealItem(ico, { rarity });
      const r = ico.getBoundingClientRect();
      if (rarity === 'epic' || rarity === 'rare') window.setTimeout(() => { sparkleBurst(r.left + r.width / 2, r.top + r.height / 2, { rarity, count: 16 }); confetti(r.left + r.width / 2, r.top); }, 350);
      status.textContent = '';
      await wait(soft ? 200 : 900);
    }

    goBtn.addEventListener('click', () => void spin());
  });
  return openNow;
}
