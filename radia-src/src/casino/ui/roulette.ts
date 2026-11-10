/** Scène Roulette : tapis tactile (plusieurs mises), roue + bille animées, résultat, historique. */
import { h } from '../../ui/dom';
import { audio } from '../../core/app';
import { haptic } from '../../core/haptics';
import { fmt } from '../../core/wallet';
import { chipUrl } from '../../game/art/casino';
import { bigWinBanner, bounce, celebrate, centerOf, levelFor, shake, soft } from '../fx';
import { cs, hooks, notifyCasino, persist } from '../store';
import { LIMITS, recordRound } from '../chips';
import { balance, creditCoins as credit, debitCoins as debit, maxBet } from '../bank';
import { BetBook, CHIP_VALUES, GROUP_SIZES, colorOf, covered, payoutRatio, settle, spin, type Bet, type Color } from '../roulette';
import { defaultRng } from '../rng';
import { RouletteWheel } from './rouletteWheel';
import { lowFunds } from './lobby';
import type { Scene, Shell } from './shell';

const KEEP = 10;
const readRecent = (): number[] => { const st = cs().stats; const out: number[] = []; for (let i = 0; i < KEEP; i++) { const v = st[`roulette.n${i}`]; if (v) out.push(v - 1); } return out; };
const pushRecent = (n: number): void => { const st = cs().stats; for (let i = KEEP - 1; i > 0; i--) { const v = st[`roulette.n${i - 1}`]; if (v) st[`roulette.n${i}`] = v; else delete st[`roulette.n${i}`]; } st['roulette.n0'] = n + 1; };

const COLOR_NAME: Record<Color, string> = { red: 'Rouge', black: 'Noir', green: 'Vert' };

export function helpRoulette(): HTMLElement {
  const pc = (k: number) => `${((k / 37) * 100).toFixed(1).replace('.', ',')} %`;
  const rows: [string, string, string][] = [
    ['Rouge ou Noir', `18/37 (${pc(18)})`, '1 pour 1'], ['Pair ou Impair', `18/37 (${pc(18)})`, '1 pour 1'], ['Un numéro', `1/37 (${pc(1)})`, '35 pour 1'],
    ...GROUP_SIZES.map((k): [string, string, string] => [`Groupe de ${k} numéros`, `${k}/37 (${pc(k)})`, `${36 / k - 1} pour 1`]),
  ];
  return h('div',
    h('p', 'La roue européenne a 37 cases : de 1 à 36 (18 rouges, 18 noires) et le 0 vert.'),
    h('p', 'Pose des tickets sur le tapis : plusieurs mises en même temps sont possibles. Appuie sur « Lancer » quand tu es prête : la case gagnante est tirée au hasard à cet instant, puis la bille ne fait que la rejoindre.'),
    h('table.cz-table', h('thead', h('tr', h('th', 'Mise'), h('th', 'Chance'), h('th', 'Gain'))), h('tbody', ...rows.map((r) => h('tr', ...r.map((c) => h('td', c)))))),
    h('p', 'Le 0 fait perdre Rouge, Noir, Pair et Impair. Le gain « 1 pour 1 » rend ta mise en plus : 10 tickets gagnants deviennent 20.'),
    h('p', 'Pour miser sur plusieurs numéros : active « Plusieurs numéros », touche 2, 3, 4 ou 6 cases, puis valide le groupe.'),
    h('p', `Mises : de ${LIMITS.roulette.min}  par lancer en tout (jusqu'à la moitié de ta bourse). Retour théorique : 36/37, soit environ 97,3 %.`));
}

export function rouletteScene(sh: Shell, o: { onBack(): void; goCard(): void }): Scene {
  const wheel = new RouletteWheel();
  const cap = () => maxBet();
  const book = new BetBook(cap());
  let chip = 10, group = false, spinning = false, last: Bet[] = [];
  const sel = new Set<number>();
  const cells = new Map<string, HTMLElement>();
  
  const mk = (key: string, label: string, cls: string, spec: Pick<Bet, 'kind' | 'nums'>, aria: string) => {
    const c = h(`button.rl-cell.${cls}`, { 'aria-label': aria, 'data-k': key }, h('span', label), h('i.rl-mark'));
    (c as HTMLElement & { spec?: unknown }).spec = spec;
    c.addEventListener('click', () => tapCell(spec, c));
    cells.set(key, c);
    return c;
  };
  const zero = mk('n0', '0', 'green', { kind: 'num', nums: [0] }, 'Numéro 0');
  zero.classList.add('rl-zero');
  const nums = Array.from({ length: 36 }, (_, i) => mk(`n${i + 1}`, String(i + 1), colorOf(i + 1), { kind: 'num', nums: [i + 1] }, `Numéro ${i + 1}`));
  const outside = [mk('red', 'Rouge', 'red', { kind: 'red' }, 'Rouge'), mk('black', 'Noir', 'black', { kind: 'black' }, 'Noir'), mk('even', 'Pair', 'outs', { kind: 'even' }, 'Pair'), mk('odd', 'Impair', 'outs', { kind: 'odd' }, 'Impair')];

  const totalEl = h('b', '0');
  const hint = h('p.rl-hint', '');
  const strip = h('div.rl-strip');
  const chipRow = h('div.rl-chips', ...CHIP_VALUES.map((v) => {
    const b = h('button.rl-chip', { 'aria-label': `Mise de ${v}`, 'data-v': String(v) }, h('img', { src: chipUrl(v, 52), alt: '', draggable: false }));
    b.addEventListener('click', () => { chip = v; audio.play('select'); haptic('select'); refresh(); });
    return b;
  }));
  const undo = h('button.cz-mini', { 'aria-label': 'Annuler la dernière mise' }, '↶ Annuler');
  const redo = h('button.cz-mini', { 'aria-label': 'Refaire' }, '↷ Refaire');
  const clr = h('button.cz-mini', { 'aria-label': 'Tout effacer' }, 'Effacer');
  const again = h('button.cz-mini', { 'aria-label': 'Reprendre la mise précédente' }, 'Même mise');
  const grpBtn = h('button.cz-mini.rl-grp', { 'aria-pressed': 'false' }, '▦ Plusieurs n°');
  const grpOk = h('button.btn.small.lavande.rl-grpok', 'Valider le groupe') as HTMLButtonElement;
  const go = h('button.btn.gold.wide.rl-go') as HTMLButtonElement;
  const resultBox = h('div.rl-result');
  const low = h('div.rl-lowbox');

  undo.addEventListener('click', () => { book.undo(); audio.play('select'); haptic('select'); refresh(); });
  redo.addEventListener('click', () => { book.redo(); audio.play('select'); haptic('select'); refresh(); });
  clr.addEventListener('click', () => { book.clear(); audio.play('select'); refresh(); });
  again.addEventListener('click', () => { book.cap = cap(); if (!last.length || !book.load(last)) { shake(again); haptic('error'); } else { audio.play('chip'); haptic('bet'); } refresh(); });
  grpBtn.addEventListener('click', () => { group = !group; sel.clear(); audio.play('select'); refresh(); });
  grpOk.addEventListener('click', () => {
    const arr = [...sel].sort((a, b) => a - b);
    if (!(GROUP_SIZES as readonly number[]).includes(arr.length)) { shake(grpOk); return; }
    if (book.place({ kind: 'nums', nums: arr }, chip)) { audio.play('chip'); haptic('bet'); sel.clear(); refresh(); } else { shake(grpOk); haptic('error'); audio.play('invalid'); }
  });
  go.addEventListener('click', () => void launch());

  function tapCell(spec: Pick<Bet, 'kind' | 'nums'>, c: HTMLElement): void {
    if (spinning) return;
    book.cap = cap();
    if (group && spec.kind === 'num') {
      const n = spec.nums![0];
      if (sel.has(n)) sel.delete(n); else if (sel.size < 6) sel.add(n); else { shake(c); haptic('error'); return; }
      audio.play('select'); haptic('select'); refresh(); return;
    }
    if (!book.place(spec, chip)) { shake(c); haptic('error'); audio.play('invalid'); hint.textContent = book.total() + chip > cap() ? 'Plus assez de pièces pour ce ticket.' : 'Mise impossible.'; window.setTimeout(() => { if (!group) hint.textContent = ''; }, 2200); return; }
    audio.play('chip', 0.9 + Math.random() * 0.25); haptic('bet'); bounce(c.querySelector('.rl-mark') ?? c, 1.25);
    refresh();
  }

  function refresh(): void {
    book.cap = cap();
    const total = book.total();
    totalEl.textContent = fmt(total);
    for (const [key, c] of cells) {
      const spec = (c as HTMLElement & { spec: Pick<Bet, 'kind' | 'nums'> }).spec;
      const amt = book.amountOn(spec);
      const m = c.querySelector('.rl-mark') as HTMLElement;
      m.textContent = amt ? fmt(amt) : '';
      c.classList.toggle('has', amt > 0);
      c.classList.toggle('sel', key.startsWith('n') && sel.has(Number(key.slice(1))));
    }
    // groupes déjà posés : petit repère sur chacun de leurs numéros
    for (const c of cells.values()) c.classList.remove('grp');
    for (const b of book.bets) if (b.kind === 'nums') for (const n of covered(b)) cells.get(`n${n}`)?.classList.add('grp');
    chipRow.querySelectorAll<HTMLElement>('.rl-chip').forEach((b) => { const v = Number(b.dataset.v); b.classList.toggle('on', v === chip); (b as HTMLButtonElement).disabled = total + v > cap() && v !== chip; b.classList.toggle('dim', total + v > cap()); });
    (undo as HTMLButtonElement).disabled = !book.canUndo(); (redo as HTMLButtonElement).disabled = !book.canRedo();
    (clr as HTMLButtonElement).disabled = total === 0; (again as HTMLButtonElement).disabled = last.length === 0;
    grpBtn.setAttribute('aria-pressed', String(group)); grpBtn.classList.toggle('on', group);
    grpOk.style.display = group ? '' : 'none';
    grpOk.disabled = !(GROUP_SIZES as readonly number[]).includes(sel.size);
    grpOk.textContent = sel.size ? `Valider le groupe (${sel.size})` : 'Choisis 2, 3, 4 ou 6 numéros';
    const poor = balance() < LIMITS.roulette.min;
    low.replaceChildren(poor ? lowFunds(LIMITS.roulette.min, o.goCard) : '');
    go.disabled = total < LIMITS.roulette.min || spinning;
    go.textContent = total < LIMITS.roulette.min ? `Mise minimum : ${LIMITS.roulette.min}` : `Lancer la bille · ${fmt(total)} ♡`;
    if (group) hint.textContent = sel.size ? `${sel.size} numéro${sel.size > 1 ? 's' : ''} choisi${sel.size > 1 ? 's' : ''}. Gain : ${GROUP_SIZES.includes(sel.size as never) ? `${36 / sel.size - 1} pour 1` : 'choisis 2, 3, 4 ou 6'}` : 'Touche 2, 3, 4 ou 6 numéros.';
    else hint.textContent = '';
    sh.setShown(sh.shown); drawStrip();
  }

  function drawStrip(): void {
    const r = readRecent();
    strip.replaceChildren(h('span.rl-slab', 'Derniers'), ...(r.length ? r.map((n, i) => h(`i.rl-ball.${colorOf(n)}${i === 0 ? '.new' : ''}`, String(n))) : [h('span.rl-none', '—')]));
  }

  async function launch(): Promise<void> {
    if (spinning) return;
    const stake = book.total();
    if (stake < LIMITS.roulette.min || stake > cap()) { shake(go); haptic('error'); audio.play('invalid'); return; }
    if (!debit(stake)) return; // débit validé AVANT la manche
    spinning = true; el.classList.add('spinning'); resultBox.replaceChildren(); resultBox.classList.remove('show');
    persist(); void sh.sync(false);
    // le numéro est tiré UNE fois, ici ; l'animation ne fait que s'y conformer
    const n = hooks.roulette ?? spin(hooks.rng ?? defaultRng);
    hooks.roulette = null;
    const bets = book.bets.map((b) => ({ ...b, nums: b.nums ? [...b.nums] : undefined }));
    sum.replaceChildren(...bets.map((b) => h('span', betTextShort(b), ' ', h('b', fmt(b.amount)))));
    const res = settle(bets, n);
    credit(res.returned);
    recordRound(cs(), 'roulette', stake, res.returned, Date.now());
    pushRecent(n); persist(); notifyCasino();
    last = bets;
    audio.play('windup'); haptic('select');
    status.textContent = 'Rien ne va plus…';
    await wheel.spinTo(n, {
      tick: () => audio.play('rouletteTick', 0.9 + Math.random() * 0.2),
      drop: () => { audio.play('ballDrop'); haptic('rouletteStop'); },
      settle: () => haptic('rouletteStop'),
    }, soft());
    if (!sh.alive()) return;
    await showResult(res.number, res.color, res.stake, res.returned, res.lines);
  }

  async function showResult(n: number, color: Color, stake: number, returned: number, lines: ReturnType<typeof settle>['lines']): Promise<void> {
    const net = returned - stake;
    status.textContent = '';
    const badge = h(`div.rl-bigball.${color}`, String(n));
    const parts = [COLOR_NAME[color], ...(n > 0 ? [n % 2 ? 'Impair' : 'Pair'] : [])];
    const winners = lines.filter((l) => l.won);
    resultBox.replaceChildren(
      badge, h('div.rl-rtxt', h('b', `${n} · ${parts.join(' · ')}`),
        h(`div.rl-net.${net > 0 ? 'win' : net === 0 ? 'even' : 'lose'}`, net > 0 ? `+${fmt(net)} tickets !` : net === 0 ? 'Mise rendue' : `−${fmt(-net)} ticket${-net > 1 ? 's' : ''}`),
        h('small', winners.length ? `Gagné : ${winners.map((l) => betText(l.bet)).join(', ')}` : 'Aucune mise gagnante cette fois, merci d\'avoir joué ♡')),
      h('div.rl-after', h('button.btn.gold', { on: { click: () => newRound(true) } }, 'Même mise'), h('button.btn.secondary', { on: { click: () => newRound(false) } }, 'Nouvelle mise')));
    resultBox.classList.add('show');
    bounce(badge, 1.3);
    drawStrip();
    spinning = false; refresh(); // les boutons « Même mise / Nouvelle mise » répondent tout de suite
    if (returned > 0) {
      const lv = levelFor(returned, stake) ?? (net >= 0 ? 'small' : null);
      const at = centerOf(badge);
      if (net > 0 && lv) celebrate(lv, at);
      if (net > 0 && (lv === 'big' || lv === 'jackpot')) await bigWinBanner(net, lv);
      await sh.fly(at, Math.min(10, 2 + Math.ceil((returned / stake) * 1.2)), 25);
    } else { audio.play('invalid'); }
    if (sh.alive()) await sh.sync(true);
  }

  function newRound(same: boolean): void {
    if (spinning) return;
    audio.play('button');
    void sh.sync(false);
    el.classList.remove('spinning'); resultBox.classList.remove('show'); wheel.clearBall();
    book.clear(); book.cap = cap();
    if (same) { if (!book.load(last)) { /* trop cher : on repart vide */ } }
    refresh();
  }

  const status = h('p.rl-status', '');
  const sum = h('div.rl-sum');
  const el = h('div.rl',
    h('div.rl-top', strip, grpBtn),
    h('div.rl-wheelbox', wheel.canvas, status),
    sum,
    resultBox,
    h('div.rl-board',
      zero, h('div.rl-nums', ...nums), h('div.rl-out', ...outside)),
    hint,
    h('div.rl-ctrl', chipRow, h('div.rl-btnrow', undo, redo, clr, again), grpOk, low, h('div.rl-gorow', h('div.rl-tot', 'Mise totale', totalEl), go)));
  refresh();
  return {
    el, title: 'Roulette', onBack: o.onBack, help: helpRoulette, busy: () => spinning, dispose: () => wheel.destroy(),
  };
}

function betTextShort(b: Bet): string { return b.kind === 'num' ? `N° ${b.nums![0]}` : b.kind === 'nums' ? `Groupe ${covered(b).join('-')}` : b.kind === 'red' ? 'Rouge' : b.kind === 'black' ? 'Noir' : b.kind === 'even' ? 'Pair' : 'Impair'; }

function betText(b: Bet): string {
  return b.kind === 'num' ? `n° ${b.nums![0]} (35 pour 1)` : b.kind === 'nums' ? `groupe ${covered(b).join('-')} (${payoutRatio(b)} pour 1)` : b.kind === 'red' ? 'Rouge' : b.kind === 'black' ? 'Noir' : b.kind === 'even' ? 'Pair' : 'Impair';
}
