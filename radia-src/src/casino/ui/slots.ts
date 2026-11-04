/** Scène Machine à sous RADIA ♡ : rouleaux, mise, multi-tirage (1/5/10) arrêtable, récapitulatif. */
import { h } from '../../ui/dom';
import { audio } from '../../core/app';
import { haptic } from '../../core/haptics';
import { fmt } from '../../core/wallet';
import { slotSymbolUrl } from '../../game/art/casino';
import { bigWinBanner, bounce, celebrate, centerOf, levelFor, shake, soft, wait } from '../fx';
import { cs, hooks, notifyCasino, persist } from '../store';
import { LIMITS, credit, debit, recordRound } from '../chips';
import { SlotsRun, exactRtp, pPair, pTriple, symDef, type SpinResult } from '../slots';
import { BET_STEPS, DRAW_COUNTS, MAX_MULTI, SYMBOLS, type SymId } from '../slotsTable';
import { defaultRng } from '../rng';
import { Reels } from './slotsReels';
import { lowFunds } from './lobby';
import type { Scene, Shell } from './shell';

const pct = (x: number, d = 2) => `${(x * 100).toFixed(d).replace('.', ',')} %`;

export function helpSlots(): HTMLElement {
  const r = exactRtp();
  return h('div',
    h('p', 'Trois rouleaux, une ligne de gain au centre. Chaque rouleau tire un symbole au hasard, indépendamment des autres, avec les poids ci-dessous.'),
    h('table.cz-table', h('thead', h('tr', h('th', 'Symbole'), h('th', 'Poids'), h('th', '3 identiques'), h('th', 'Chance'))),
      h('tbody', ...SYMBOLS.map((s) => h('tr', h('td', h('img.cz-tsym', { src: slotSymbolUrl(s.id, 28), alt: '' }), ' ', s.name), h('td', `${s.weight} %`), h('td', `× ${s.triple}`), h('td', pct(pTriple(s), 3)))))),
    h('p', 'Deux symboles seulement :'),
    h('table.cz-table', h('tbody', ...SYMBOLS.filter((s) => s.pair > 0).map((s) => h('tr', h('td', h('img.cz-tsym', { src: slotSymbolUrl(s.id, 28), alt: '' }), ` Exactement 2 ${s.name}s`), h('td', `× ${s.pair}`), h('td', pct(pPair(s)))))) ),
    h('p', `Le gain est un multiple de ta mise (rendue comprise). Retour théorique : ${pct(r.rtp, 1)} sur le long terme ; chance de gagner à chaque tirage : ${pct(r.hit, 1)}.`),
    h('p', `Multi-tirage (1, 5 ou 10) : exactement les mêmes règles et les mêmes probabilités que le tirage simple. Tu vois la mise totale avant de commencer, chaque tirage débite sa mise, tu peux ARRÊTER entre deux tirages (la suite n'est pas débitée), et la série s'arrête toute seule après ${MAX_MULTI} tirages maximum avec un récapitulatif.`),
    h('p', `Mise par tirage : de ${LIMITS.slots.min} à ${fmt(LIMITS.slots.max)} tickets (mise totale de la série comprise).`));
}

function flashCol(el: HTMLElement): void { if (!soft() && el.isConnected) el.animate([{ opacity: 0.95, transform: 'scale(.7)' }, { opacity: 0, transform: 'scale(1.25)' }], { duration: 460, easing: 'ease-out' }); }

export function slotsScene(sh: Shell, o: { onBack(): void; goCard(): void }): Scene {
  const reels = new Reels();
  let bi = 0, count = 1, running = false, run: SlotsRun | null = null;
  const cap = () => Math.min(cs().bring, LIMITS.slots.max);
  const bets = BET_STEPS;
  const betEl = h('b.sl-bet', String(bets[bi]));
  const totEl = h('span.sl-tot');
  const winEl = h('div.sl-win', 'Touche « Tourner » pour lancer les rouleaux ♡');
  const low = h('div.sl-low');
  const minus = h('button.cz-mini.big', { 'aria-label': 'Mise plus petite' }, '−') as HTMLButtonElement;
  const plus = h('button.cz-mini.big', { 'aria-label': 'Mise plus grande' }, '+') as HTMLButtonElement;
  const seg = h('div.sl-seg', { role: 'group', 'aria-label': 'Nombre de tirages' }, ...DRAW_COUNTS.map((n) => h('button.sl-segb', { 'data-n': String(n), 'aria-label': `${n} tirage${n > 1 ? 's' : ''}` }, `×${n}`)));
  const go = h('button.btn.gold.wide.sl-go') as HTMLButtonElement;
  const stopBtn = h('button.btn.secondary.wide.sl-stop', 'Arrêter après ce tirage') as HTMLButtonElement;
  stopBtn.style.display = 'none';

  const bet = () => bets[bi];
  const total = () => bet() * count;

  minus.addEventListener('click', () => { if (running) return; bi = Math.max(0, bi - 1); audio.play('chip'); haptic('bet'); refresh(); });
  plus.addEventListener('click', () => { if (running) return; bi = Math.min(bets.length - 1, bi + 1); audio.play('chip'); haptic('bet'); refresh(); });
  seg.querySelectorAll<HTMLElement>('.sl-segb').forEach((b) => b.addEventListener('click', () => { if (running) return; count = Number(b.dataset.n); audio.play('select'); haptic('select'); refresh(); }));
  go.addEventListener('click', () => void start());
  stopBtn.addEventListener('click', () => { run?.stop(); stopBtn.disabled = true; stopBtn.textContent = 'Arrêt demandé…'; audio.play('select'); });

  function refresh(): void {
    betEl.textContent = fmt(bet());
    totEl.textContent = count > 1 ? `Mise totale : ${fmt(total())} (${count} × ${fmt(bet())})` : `Mise : ${fmt(bet())}`;
    const ok = total() <= cap() && total() >= LIMITS.slots.min;
    seg.querySelectorAll<HTMLElement>('.sl-segb').forEach((b) => { const n = Number(b.dataset.n); b.classList.toggle('on', n === count); b.classList.toggle('dim', bet() * n > cap()); });
    minus.disabled = running || bi === 0; plus.disabled = running || bi === bets.length - 1;
    go.disabled = running || !ok;
    go.textContent = running ? '…' : ok ? (count === 1 ? `Tourner · ${fmt(total())} ♡` : `Lancer la série ×${count} · ${fmt(total())} ♡`) : total() > LIMITS.slots.max ? `Maximum : ${fmt(LIMITS.slots.max)}` : 'Pas assez de tickets';
    low.replaceChildren(cs().bring < LIMITS.slots.min ? lowFunds(LIMITS.slots.min, o.goCard) : '');
  }

  async function start(): Promise<void> {
    if (running) return;
    const ledger = { balance: () => cs().bring, debit: (n: number) => debit(cs(), n), credit: (n: number) => credit(cs(), n) };
    run = new SlotsRun(ledger, bet(), count);
    if (!run.canStart()) { shake(go); haptic('error'); audio.play('invalid'); return; }
    running = true; refresh();
    stopBtn.style.display = count > 1 ? '' : 'none'; stopBtn.disabled = false;
    el.classList.add('running');
    let n = 0;
    while (sh.alive()) {
      const rng = hooks.rng ?? defaultRng;
      const r = run.next(rng); // débit AVANT, tirage, crédit du gain : une seule fonction pure pour tout
      if (!r) break;
      n++;
      recordRound(cs(), 'slots', r.bet, r.win, Date.now());
      persist(); notifyCasino();
      sh.setShown(cs().bring - r.win);
      stopBtn.textContent = count > 1 ? `Arrêter après ce tirage (${n}/${count})` : '';
      winEl.textContent = count > 1 ? `Tirage ${n} sur ${count}…` : 'Les rouleaux tournent…';
      winEl.className = 'sl-win';
      audio.play('windup'); haptic('select');
      await reels.spinTo(r.reels, { onStop: (i) => { audio.play('reelStop', 0.9 + i * 0.12); haptic('reelStop'); flashCol(wins[i]); } }, soft());
      if (!sh.alive()) return;
      await reveal(r);
      if (!run.done) await wait(soft() ? 250 : 650);
    }
    if (!sh.alive()) return;
    const sum = run.summary();
    running = false; el.classList.remove('running'); stopBtn.style.display = 'none';
    await sh.sync(true);
    refresh();
    if (count > 1 && sum.played > 0) await recap(sum);
    run = null;
  }

  async function reveal(r: SpinResult): Promise<void> {
    if (r.win <= 0) {
      winEl.textContent = 'Pas cette fois… ♡'; winEl.className = 'sl-win lose';
      await sh.sync(false);
      return;
    }
    const def = r.sym ? symDef(r.sym) : null;
    const cols = r.kind === 'triple' ? [0, 1, 2] : [0, 1, 2].filter((i) => r.reels[i] === r.sym);
    reels.setWin(cols);
    winEl.textContent = `${r.kind === 'triple' ? `3 × ${def!.name}` : `2 × ${def!.name}`} · +${fmt(r.win)} tickets${r.win > r.bet ? ' !' : ' (mise rendue)'}`;
    winEl.className = 'sl-win win';
    const at = centerOf(reels.canvas);
    const lv = levelFor(r.win, r.bet) ?? 'small';
    if (r.win > r.bet) celebrate(lv, at); else { audio.play('chipWin'); haptic('chipWin'); }
    bounce(winEl, 1.18);
    if (r.win > r.bet && (lv === 'big' || lv === 'jackpot')) await bigWinBanner(r.win - r.bet, lv);
    await sh.fly(at, Math.min(10, 2 + Math.ceil(Math.log2(Math.max(1, r.win / r.bet)) * 2)), 25);
    await sh.sync(true);
  }

  function recap(sum: ReturnType<SlotsRun['summary']>): Promise<void> {
    return new Promise((resolve) => {
      const rows = sum.spins.map((s, i) => h(`div.sl-rrow${s.win > 0 ? '.w' : ''}`,
        h('span.sl-rn', String(i + 1)), h('span.sl-rimgs', ...s.reels.map((id) => h('img', { src: slotSymbolUrl(id, 30), alt: id }))),
        h('span.sl-rg', s.win > 0 ? `+${fmt(s.win)}` : '0')));
      const net = sum.net;
      const close = () => { bd.classList.add('leaving'); window.setTimeout(() => bd.remove(), 180); resolve(); };
      const again = h('button.btn.gold', { on: { click: () => { close(); void start(); } } }, `Refaire ×${count}`) as HTMLButtonElement;
      again.disabled = total() > cap();
      const card = h('div.cz-helpcard.sl-recap', { role: 'dialog', 'aria-modal': 'true' },
        h('h2', sum.stoppedEarly ? `Série arrêtée (${sum.played}/${sum.planned})` : 'Récapitulatif de la série'),
        h('div.sl-rlist', ...rows),
        h('div.sl-rtot', h('div', 'Mises : ', h('b', fmt(sum.staked))), h('div', 'Gains : ', h('b', fmt(sum.won))),
          h(`div.sl-rnet.${net > 0 ? 'win' : net < 0 ? 'lose' : ''}`, net >= 0 ? `Bilan : +${fmt(net)} tickets` : `Bilan : −${fmt(-net)} tickets`), h('div', 'Solde à la table : ', h('b', fmt(sum.balance)))),
        h('div.actions.row', again, h('button.btn.secondary', { on: { click: close } }, 'Fermer')));
      const bd = h('div.cz-helpback', card);
      sh.root.append(bd);
      audio.play('page');
    });
  }

  const wins: HTMLElement[] = [0, 1, 2].map(() => h('i.sl-flash'));
  const pay = h('div.sl-pay', ...SYMBOLS.map((s) => h('div.sl-payc', h('img', { src: slotSymbolUrl(s.id as SymId, 40), alt: s.name }), h('b', `×${s.triple}`))));
  const el = h('div.sl',
    h('div.sl-cabinet',
      h('div.sl-marquee', h('span.sl-bulbs'), h('b', 'RADIA ♡ SLOTS'), h('span.sl-bulbs')),
      h('div.sl-window', reels.canvas, h('div.sl-flashes', ...wins), h('span.sl-arrow.l', '▶'), h('span.sl-arrow.r', '◀')),
      winEl),
    h('div.sl-paywrap', h('small', '3 identiques (2 cœurs ×2, 2 fleurs ×1 aussi)'), pay),
    h('div.sl-ctrl',
      h('div.sl-betrow', minus, h('div.sl-betbox', h('small', 'Mise par tirage'), betEl), plus),
      seg, h('div.sl-totline', totEl), low, go, stopBtn));
  reels.show(['heart', 'crown', 'diamond']);
  refresh();
  return { el, title: 'Machine à sous', onBack: o.onBack, help: helpSlots, busy: () => running, dispose: () => { reels.destroy(); run?.stop(); } };
}
