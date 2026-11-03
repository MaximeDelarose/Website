/**
 * Mode Reine : interface d'un puzzle (règles dans queen.ts).
 */
import { h, tap } from '../../ui/dom';
import { icon } from '../../ui/icons';
import { ui } from '../../ui/ui';
import { save, audio } from '../../core/app';
import { checkAchievements, statMax } from '../../core/progress';
import { GridBoard, type BoardPiece } from './GridBoard';
import { fitBoard, type View } from './common';
import { pieceSvg, PIECE_NAMES } from './pieces';
import {
  QUEEN_PUZZLES, attacked, initialState, legalTargets, parseQueen, playQueen, queenTargets, solveQueen, solved,
  type QueenState,
} from './queen';

const QUEEN_SVG = `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="rq" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#FFC2D8"/><stop offset="1" stop-color="#FF75A8"/></linearGradient></defs>
<g fill="url(#rq)" stroke="#58433F" stroke-width="4.2" stroke-linejoin="round">
<path d="M21 32l12 30 3-38 14 30 14-30 3 38 12-30-8 38H29z"/><path d="M29 70h42l4 10H25z"/><path d="M24 80h52a4 4 0 0 1 4 4v5a3 3 0 0 1-3 3H23a3 3 0 0 1-3-3v-5a4 4 0 0 1 4-4z"/></g>
<g fill="#F3C86B" stroke="#58433F" stroke-width="3"><circle cx="20" cy="27" r="5.5"/><circle cx="35" cy="17" r="5.5"/><circle cx="50" cy="13" r="6.5"/><circle cx="65" cy="17" r="5.5"/><circle cx="80" cy="27" r="5.5"/></g>
<path d="M50 63c-4-3-8-5-8-9a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 4-4 6-8 9z" fill="#FFF4E8" stroke="#58433F" stroke-width="2"/></svg>`;
const HEART_SVG = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 82C30 68 16 56 16 40a17 17 0 0 1 34-6 17 17 0 0 1 34 6c0 16-14 28-34 42z" fill="#FF75A8" stroke="#58433F" stroke-width="5" stroke-linejoin="round"/><path d="M30 36a9 9 0 0 1 9-8" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/></svg>';

export const queenPieceSvg = QUEEN_SVG;

const REASONS: Record<string, string> = {
  attacked: 'Case attaquée ! La Reine ne peut pas finir son coup ici.',
  defended: 'Cette pièce est protégée par une autre : impossible de la prendre.',
  portal: 'Le portail mène à une case dangereuse ou bloquée.',
  unreachable: 'La Reine ne peut pas aller là d\'un seul coup.',
  limit: 'Plus de coups disponibles.',
};

export interface QueenPlayOpts {
  index: number;
  onSolved: (index: number) => void;
  onBack?: () => void;
  tutorial?: boolean;
}

/** Vue d'un puzzle (réutilisée par le tutoriel de l'histoire). */
export function queenPuzzleView(o: QueenPlayOpts): View {
  const p = QUEEN_PUZZLES[o.index];
  const lv = parseQueen(p);
  let st: QueenState = initialState(p, lv);
  let showAttacks = true;
  let done = false;
  let busy = false;
  let step = 0;
  let hintCell: number | null = null;

  const el = h('div.chess-view.queen');
  const msg = h('div.chess-status');
  const counter = h('span.chip');
  const heartsChip = h('span.chip');
  const holder = h('div.board-holder');
  const shieldBtn = h('button.btn.small.gold.shield-btn', { on: { click: tap(() => toggleShield()) } }, '🛡 Bouclier');
  const attackBtn = h('button.btn.small.secondary', { 'aria-label': 'Voir les cases attaquées', title: 'Cases attaquées', on: { click: tap(() => { showAttacks = !showAttacks; say(showAttacks ? 'Cases attaquées affichées (hachures rouges).' : 'Cases attaquées masquées.', 'hint'); render(); }) } }, icon('eye', 18));

  const board = new GridBoard({
    w: lv.w, h: lv.h,
    dark: (c) => ((c % lv.w) + Math.floor(c / lv.w)) % 2 === 1,
    canSelect: (c) => !done && !busy && c === st.pos && st.moves < p.limit,
    targets: () => legalTargets(lv, st, p.limit),
    onMove: (_f, t) => move(t),
    onInvalid: (_f, t) => {
      if (!queenTargets(lv, st).includes(t)) { if (t !== st.pos) say(REASONS.unreachable, 'bad'); return; }
      const r = playQueen(lv, st, t, p.limit);
      if (!r.ok) { audio.play('invalid'); board.shake(st.pos); say(REASONS[r.reason], 'bad'); }
    },
  });
  holder.append(board.el);
  const unfit = fitBoard(holder, board.el, lv.w / lv.h);

  const say = (t: string, cls = '') => { msg.textContent = t; msg.className = `chess-status ${cls}`; };

  const decor = () => {
    const items: [number, string, string?][] = [];
    for (const c of lv.walls) items.push([c, 'q-wall']);
    for (const c of lv.gates) items.push([c, st.gatesOpen ? 'q-gate open' : 'q-gate']);
    for (const c of lv.plates) items.push([c, st.gatesOpen ? 'q-plate on' : 'q-plate']);
    const seen = new Map<number, number>();
    let n = 0;
    for (const [a, b] of lv.portals) {
      if (!seen.has(a) && !seen.has(b)) { n++; seen.set(a, n); seen.set(b, n); }
      items.push([a, `q-portal p${seen.get(a)}`]);
    }
    board.setDecor(items);
  };

  const pieces = (): BoardPiece[] => {
    const out: BoardPiece[] = [];
    lv.pieceList.forEach((c, k) => { if (!(st.captured & (1 << k))) out.push({ cell: c, kind: 'e' + lv.pieces.get(c), html: pieceSvg('b', lv.pieces.get(c)!) }); });
    lv.hearts.forEach((c, k) => { if (st.hearts & (1 << k)) out.push({ cell: c, kind: 'heart', html: HEART_SVG }); });
    out.push({ cell: st.pos, kind: 'queen', html: QUEEN_SVG });
    return out;
  };

  const render = (hint?: [number, number]) => {
    decor();
    board.setPieces(pieces(), hint);
    const marks: [number, string][] = [];
    if (showAttacks) for (const c of attacked(lv, st)) if (!lv.walls.has(c)) marks.push([c, 'q-attacked']);
    if (hintCell !== null) marks.push([hintCell, 'q-hint']);
    board.setMarks(marks);
    counter.textContent = `Coups : ${st.moves} / ${p.limit}`;
    const left = lv.hearts.filter((_, k) => st.hearts & (1 << k)).length;
    heartsChip.textContent = `♥ ${lv.hearts.length - left} / ${lv.hearts.length}`;
    shieldBtn.style.display = p.shield ? '' : 'none';
    shieldBtn.classList.toggle('armed', st.shield === 2);
    shieldBtn.toggleAttribute('disabled', st.shield === 0 || done);
    shieldBtn.textContent = st.shield === 2 ? '🛡 Bouclier activé' : st.shield === 0 ? '🛡 Bouclier utilisé' : '🛡 Bouclier';
    attackBtn.classList.toggle('on', showAttacks);
  };

  const toggleShield = () => {
    if (done || st.shield === 0) return;
    st = { ...st, shield: st.shield === 2 ? 1 : 2 };
    audio.play(st.shield === 2 ? 'sparkle' : 'button');
    say(st.shield === 2 ? 'Bouclier activé : ton prochain coup peut finir sur une case attaquée.' : 'Bouclier rangé.', 'hint');
    board.select(null);
    render();
  };

  const move = (to: number) => {
    const from = st.pos;
    const r = playQueen(lv, st, to, p.limit);
    if (!r.ok) { say(REASONS[r.reason], 'bad'); return; }
    st = r.state;
    hintCell = null;
    audio.play(r.captured !== undefined ? 'capture' : 'move');
    render([from, r.path[0]]);
    if (r.teleported !== undefined) {
      busy = true;
      window.setTimeout(() => { audio.play('whoosh'); render([r.path[0], r.teleported!]); busy = false; }, 280);
    }
    if (r.heart !== undefined) window.setTimeout(() => audio.play('heart'), 180);
    if (r.opened) { window.setTimeout(() => audio.play('chest'), 200); say('Les grilles s\'ouvrent !', 'good'); }
    else if (r.usedShield) say('Le Bouclier t\'a protégée.', 'good');
    else if (r.captured !== undefined) say(`${PIECE_NAMES[lv.pieces.get(r.captured)!]} capturé${['r', 'q'].includes(lv.pieces.get(r.captured)!) ? 'e' : ''} !`, 'good');
    if (solved(st)) { void win(); return; }
    if (o.tutorial && p.steps) { step = Math.min(p.steps.length - 1, step + 1); say(p.steps[step], 'hint'); }
    else if (!r.opened && !r.usedShield && r.captured === undefined) say(r.heart !== undefined ? 'Un cœur de plus ♡' : '');
    if (st.moves >= p.limit) say('Plus de coups… Recommence, ma reine !', 'bad');
    else if (!legalTargets(lv, st, p.limit).length && st.shield !== 1) say('La Reine est coincée… Recommence !', 'bad');
  };

  const win = async () => {
    done = true;
    audio.play('victory');
    say('Tous les cœurs sont à toi !', 'good');
    const first = !save.data.chess.queen.includes(p.id);
    if (first) { save.data.chess.queen.push(p.id); save.save(); }
    statMax('queenPuzzlesTotal', QUEEN_PUZZLES.length);
    checkAchievements();
    window.setTimeout(() => { if (el.isConnected) o.onSolved(o.index); }, 700);
  };

  const reset = () => {
    st = initialState(p, lv);
    done = false; busy = false; step = 0; hintCell = null;
    board.select(null);
    say(o.tutorial && p.steps ? p.steps[0] : p.hint, 'hint');
    render();
  };

  const hint = () => {
    if (done) return;
    const r = solveQueen(p, p.limit - st.moves, st);
    if (!r || !r.line.length) { say('Pas de solution depuis ici… Recommence !', 'bad'); return; }
    hintCell = r.line[0].to;
    say(r.line[0].shield ? 'Active ton Bouclier, puis vise la case qui brille.' : 'Essaie la case qui brille ✨', 'hint');
    render();
  };

  el.append(
    h('div.puzzle-head',
      o.onBack ? h('button.icon-btn', { 'aria-label': 'Retour', on: { click: tap(() => o.onBack!()) } }, icon('back')) : null,
      h('div.grow', h('div.chess-who', `${o.index + 1}. ${p.title}`), h('div.row.chips', counter, heartsChip))),
    msg, holder,
    h('div.chess-actions', shieldBtn, attackBtn,
      h('button.btn.small.secondary', { on: { click: tap(() => hint()) } }, icon('hint', 18), 'Indice'),
      h('button.btn.small.secondary', { 'aria-label': 'Recommencer', on: { click: tap(() => reset()) } }, icon('refresh', 18))),
  );
  reset();
  return { el, destroy: unfit };
}

/** Règles affichées (écran d'introduction et bouton « Règles »). */
export function queenRules(): HTMLElement {
  return h('div.queen-rules',
    h('p', h('b', 'Radia est la Reine. '), 'Elle se déplace comme une dame aux échecs : en ligne droite ou en diagonale, aussi loin qu\'elle veut.'),
    h('ul',
      h('li', '♥ Ramasse tous les cœurs (en terminant un coup dessus) avant la fin des coups.'),
      h('li', '⚔ Les pièces ennemies ne bougent pas, mais elles surveillent : jamais de fin de coup sur une case attaquée (en rouge).'),
      h('li', '👑 Une pièce seule peut être prise. Si une autre la protège, c\'est interdit.'),
      h('li', '🛡 Bouclier (certains puzzles) : une fois, ton prochain coup peut finir sur une case attaquée.'),
      h('li', '🌀 Portail : finis un coup dessus pour réapparaître sur son jumeau.'),
      h('li', '✨ Dalle dorée : finis un coup dessus pour ouvrir les grilles.'),
    ));
}

/** Onglet « Mode Reine » : liste des puzzles + jeu. */
export function queenTabView(): View {
  const el = h('div.chess-view.queen-tab');
  let current: View | null = null;
  statMax('queenPuzzlesTotal', QUEEN_PUZZLES.length);

  const list = () => {
    current?.destroy(); current = null;
    el.textContent = '';
    const solvedIds = save.data.chess.queen;
    const unlocked = (i: number) => i === 0 || solvedIds.includes(QUEEN_PUZZLES[i - 1].id) || solvedIds.includes(QUEEN_PUZZLES[i].id);
    el.append(
      h('div.queen-intro.panel', h('span.queen-mini', { html: QUEEN_SVG }), h('div', h('b', 'Mode Reine'), h('p.muted', `${solvedIds.length} / ${QUEEN_PUZZLES.length} puzzles résolus`)),
        h('button.btn.small.secondary', { on: { click: tap(() => void ui.modal({ title: 'Les règles du Mode Reine', body: queenRules(), actions: [{ label: 'Compris !', value: 'ok' }] })) } }, icon('info', 18), 'Règles')),
      h('div.puzzle-grid', ...QUEEN_PUZZLES.map((q, i) => {
        const ok = unlocked(i);
        return h(`button.puzzle-card${solvedIds.includes(q.id) ? '.done' : ''}${ok ? '' : '.locked'}`, { on: { click: tap(() => { if (ok) play(i); else ui.toast({ title: 'Puzzle verrouillé', sub: 'Résous d\'abord le précédent.', icon: 'lock' }); }) } },
          h('span.pc-num', String(i + 1)), h('span.pc-title', q.title),
          h('span.pc-goal', ok ? `${q.limit} coups${q.shield ? ' · 🛡' : ''}` : '🔒'),
          solvedIds.includes(q.id) ? h('span.pc-check', icon('check', 16)) : null);
      })),
    );
  };

  const play = (i: number) => {
    current?.destroy();
    el.textContent = '';
    current = queenPuzzleView({
      index: i,
      onBack: list,
      onSolved: async (k) => {
        const next = k + 1 < QUEEN_PUZZLES.length;
        const v = await ui.modal({ title: 'Bravo ma reine !', body: next ? 'Le royaume t\'appartient un peu plus.' : 'Tu as résolu tous les puzzles du Mode Reine. Quelle reine !', actions: [...(next ? [{ label: 'Puzzle suivant', value: 'next' }] : []), { label: 'Liste', value: 'list', style: 'secondary' as const }] });
        if (!el.isConnected) return;
        if (v === 'next') play(k + 1); else list();
      },
    });
    el.append(current.el);
  };

  list();
  return { el, destroy: () => current?.destroy() };
}
