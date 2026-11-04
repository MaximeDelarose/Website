/**
 * Partie d'échecs classique « contre Auguste » (règles complètes via chess.js).
 * Le moteur joue pour lui, mais tout est présenté comme une vraie partie
 * contre Auguste : son visage, ses humeurs, son temps de réflexion humain et
 * ses petites piques affectueuses. La dame de Radia porte le visage de Radia.
 */
import { haptic } from '../../core/haptics';
import { Chess } from 'chess.js';
import { h, tap } from '../../ui/dom';
import { icon } from '../../ui/icons';
import { ui } from '../../ui/ui';
import { save, audio } from '../../core/app';
import { bark, checkAchievements } from '../../core/progress';
import type { ChessDifficulty } from '../../save/schema';
import { GridBoard } from './GridBoard';
import { AI_LEVELS, aiMove } from './ai';
import { askPromotion, cellToSq, chessPieces, chessTargets, fitBoard, isDarkSq, needsPromotion, sqToCell, type View } from './common';
import { gameEnd, playUci, toUci, type GameEnd } from './rules';
import type { Side, PieceKind } from './pieces';
import { canvasUrl } from '../art/kit';
import { medallionCanvas } from '../art/characters';
import { radiaFaceCanvas, lookKey } from '../art/world/radiaNow';
import { hasPhotos, photoUrl, photoUrlNow } from '../../core/photos';

/** Petites piques d'Auguste (choisies au hasard, sans répétition immédiate). */
const TAUNTS = {
  start: ['Prête à perdre ?', 'Je te préviens, je suis en forme aujourd\'hui.', 'Allez, montre-moi ce que la reine sait faire.'],
  startBlack: ['Je commence. C\'est de la galanterie, version échecs.', 'Les blancs pour moi, le premier coup aussi. Désolé, pas désolé.'],
  resume: ['Ah, tu reviens ! On reprend là où on s\'était arrêtés.', 'Je n\'ai pas touché au plateau, promis.'],
  augCapture: ['Merci pour le cadeau 😌', 'Celle-là, je la garde en souvenir.', 'Oups… elle était à toi ?', 'Je prends, je prends.', 'Tu me la laissais exprès, non ?'],
  radiaCapture: ['Hé ! Je l\'aimais bien celle-là.', 'Ok… là tu m\'as eu.', 'Tu triches ou quoi ?', 'Eh, doucement !', 'Je l\'avais pas vue venir, celle-là.'],
  augCheck: ['Échec, ma reine 😏', 'Attention à ton roi… je suis tout près.', 'Échec ! Tu fais moins la maligne, hein ?'],
  radiaCheck: ['Doucement avec mon roi…', 'Hé, laisse mon roi tranquille !', 'Ok ok, je me cache.'],
  queenThreat: ['Ta tête est en danger… et ça me fait mal au cœur.', 'Je vise ta dame. Enfin… toi. 😘', 'Joli visage, ta dame. Ce serait dommage de la perdre.'],
  queenTaken: ['J\'ai attrapé ta dame… mais ton cœur, je l\'avais déjà.', 'Je t\'ai capturée. Je ne te rends pas.'],
  radiaTakesQueen: ['Ma dame ! Tu n\'as aucune pitié…', 'Tu as pris ma dame. Je vais m\'en remettre… peut-être.'],
  longThink: ['Tu réfléchis ou tu m\'admires ?', 'Prends ton temps, je ne vais nulle part.', 'Je t\'attends… comme toujours.', 'Tu veux un indice ? Non ? Ok, je me tais.'],
  undo: ['Un retour en arrière ? Pour toi, d\'accord.', 'Je n\'ai rien vu. 🙈'],
  augWin: ['Je t\'aime, mais aux échecs je ne fais pas de cadeau.', 'Revanche ? Je suis sûr que tu la veux.'],
  radiaWin: ['Même dans mon propre jeu, tu trouves le moyen de me battre…', 'Bon. Tu peux arrêter de m\'humilier devant tout le royaume ?'],
  draw: ['Égalité. Comme nous deux : impossible de nous départager.'],
} as const;
type TauntKey = keyof typeof TAUNTS;

/** Temps de réflexion « humain » d'Auguste (ms), selon son humeur. */
const THINK: Record<ChessDifficulty, [number, number]> = { easy: [900, 2300], normal: [1300, 3300], hard: [1700, 4200] };

const crownSvg = (fill: string) => `<svg class="face-crown" viewBox="0 0 40 24" aria-hidden="true"><path d="M3 21 L1 5 L11 13 L20 2 L29 13 L39 5 L37 21 Z" fill="${fill}" stroke="#58433F" stroke-width="2.2" stroke-linejoin="round"/><circle cx="20" cy="15" r="2.6" fill="#FF75A8"/></svg>`;

const DIFFS: ChessDifficulty[] = ['easy', 'normal', 'hard'];

export function classicView(onAugusteSpot: (el: HTMLElement) => void): View {
  const el = h('div.chess-view.classic');
  let destroyFn: (() => void) | null = null;

  const showSetup = () => {
    destroyFn?.();
    destroyFn = null;
    el.textContent = '';
    let diff: ChessDifficulty = 'normal';
    let color: 'w' | 'b' | 'r' = 'w';
    const seg = <T extends string>(opts: [T, string][], cur: T, set: (v: T) => void) => {
      const wrap = h('div.seg');
      const btns = opts.map(([v, label]) => h('button', { class: v === cur ? 'on' : '', on: { click: tap(() => { set(v); btns.forEach((b, i) => b.classList.toggle('on', opts[i][0] === v)); desc.textContent = AI_LEVELS[diff].desc; }) } }, label));
      wrap.append(...btns);
      return wrap;
    };
    const desc = h('p.muted.center.setup-desc', AI_LEVELS[diff].desc);
    const w = save.data.chess.wins;
    el.append(h('div.panel.chess-setup',
      h('h2', 'Une partie contre Auguste'),
      h('div.setup-row', h('label', 'Son humeur'), seg(DIFFS.map((d) => [d, AI_LEVELS[d].label] as [ChessDifficulty, string]), diff, (v) => { diff = v; })),
      desc,
      h('div.setup-row', h('label', 'Tes pièces'), seg([['w', 'Blancs'], ['b', 'Noirs'], ['r', 'Hasard']] as ['w' | 'b' | 'r', string][], color, (v) => { color = v; })),
      h('button.btn.wide', { on: { click: tap(() => {
        const c: Side = color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : color;
        save.data.chess.game = { pgn: '', difficulty: diff, color: c };
        save.save();
        startGame();
      }) } }, icon('play', 20), 'Commencer'),
      h('div.chess-stats',
        h('span.chip', `Victoires · Détendu ${w.easy} · Concentré ${w.normal} · Sérieux ${w.hard}`),
        h('span.chip', `Nulles ${save.data.chess.draws} · Défaites ${save.data.chess.losses}`)),
    ));
  };

  const startGame = () => {
    const g = save.data.chess.game;
    if (!g) return showSetup();
    el.textContent = '';
    const chess = new Chess();
    if (g.pgn) {
      try { chess.loadPgn(g.pgn); } catch { chess.reset(); }
    }
    const player: Side = g.color;
    const diff = g.difficulty;
    let token = 0;
    let thinking = false;
    let over = false;
    let alive = true;
    let lastMove: [number, number] | undefined;
    const hist = chess.history({ verbose: true });
    if (hist.length) { const m = hist[hist.length - 1]; lastMove = [sqToCell(m.from), sqToCell(m.to)]; }

    const augColor: Side = player === 'w' ? 'b' : 'w';
    // ---- visages : la dame de Radia = Radia ; le roi d'Auguste = Auguste
    const herFace = () => (hasPhotos() && photoUrlNow('face-radia')) || canvasUrl(`face:radia:${lookKey()}`, () => radiaFaceCanvas('smile', 200));
    const hisFace = () => (hasPhotos() && photoUrlNow('head-new')) || canvasUrl('med:auguste:smile', () => medallionCanvas('auguste', { expr: 'smile' }, 160));
    const face = (color: Side, type: PieceKind): string | null => {
      if (color === player && type === 'q') return `<div class="face-piece her"><img src="${herFace()}" alt="" draggable="false">${crownSvg('#F3C86B')}</div>`;
      if (color === augColor && type === 'k') return `<div class="face-piece his"><img src="${hisFace()}" alt="" draggable="false">${crownSvg('#B9A5E8')}</div>`;
      return null;
    };
    if (hasPhotos()) {
      void Promise.all([photoUrl('head-new'), photoUrl('face-radia')]).then(() => { if (alive) { board.setPieces([], undefined); render(); avatar.src = hisFace(); } });
    }

    // ---- répliques d'Auguste
    let lastTaunt = 0;
    const lastLine: Partial<Record<TauntKey, number>> = {};
    const say = (k: TauntKey, chance = 1, force = false) => {
      const now = Date.now();
      if (!force && (now - lastTaunt < 6500 || Math.random() > chance)) return;
      const lines = TAUNTS[k];
      let i = Math.floor(Math.random() * lines.length);
      if (lines.length > 1 && i === lastLine[k]) i = (i + 1) % lines.length;
      lastLine[k] = i;
      lastTaunt = now;
      const r = aug.getBoundingClientRect();
      ui.bubble(lines[i], Math.max(8, r.left), r.top - 8, 3600);
      audio.play('pickup');
    };
    let idleTimer: number | undefined;
    const armIdle = () => {
      window.clearTimeout(idleTimer);
      if (over) return;
      idleTimer = window.setTimeout(() => { if (alive && !over && chess.turn() === player) say('longThink', 1, true); }, 28_000);
    };
    const herQueenThreatened = () => chess.board().flat().some((p) => p && p.type === 'q' && p.color === player && chess.isAttacked(p.square, augColor));

    const status = h('div.chess-status');
    const avatar = h('img', { src: hisFace(), alt: 'Auguste' });
    const aug = h('div.chess-aug');
    const moves = h('div.chess-moves');
    const holder = h('div.board-holder');
    const board = new GridBoard({
      w: 8, h: 8, flip: player === 'b', coords: true, dark: isDarkSq,
      canSelect: (cell) => !over && !thinking && chess.turn() === player && chess.get(cellToSq(cell))?.color === player,
      targets: (cell) => chessTargets(chess, cell),
      onMove: (from, to) => void playerMove(from, to),
      onInvalid: (from, to) => { if (chess.get(cellToSq(to))?.color !== player) { audio.play('invalid'); board.shake(from); } },
    });
    holder.append(board.el);
    const unfit = fitBoard(holder, board.el);
    const undoBtn = h('button.btn.small.secondary', { on: { click: tap(() => undo()) } }, icon('undo', 18), 'Annuler');
    const bar = h('div.chess-actions',
      undoBtn,
      h('button.btn.small.secondary', { on: { click: tap(async () => {
        if (!over && chess.history().length && !(await ui.confirm('Nouvelle partie ?', 'La partie en cours sera abandonnée.', 'Oui', 'Non'))) return;
        if (!over && chess.history().length) record({ kind: 'mate', winner: player === 'w' ? 'b' : 'w' }, true);
        save.data.chess.game = null; save.save(); showSetup();
      }) } }, icon('refresh', 18), 'Nouvelle'),
      h('button.btn.small.secondary', { on: { click: tap(async () => {
        if (over) return;
        if (!(await ui.confirm('Abandonner ?', 'Auguste ne le dira à personne. Enfin… presque.', 'Abandonner', 'Continuer'))) return;
        finish({ kind: 'mate', winner: player === 'w' ? 'b' : 'w' }, true);
      }) } }, icon('flag', 18), 'Abandon'),
    );
    el.append(
      h('div.chess-top', aug, h('div.grow', h('div.chess-who', `Auguste · ${AI_LEVELS[diff].label}`), status)),
      moves, holder, bar,
    );
    onAugusteSpot(aug);
    aug.append(avatar);

    const render = () => {
      board.setPieces(chessPieces(chess, face), lastMove);
      const marks: [number, string][] = [];
      if (lastMove) marks.push([lastMove[0], 'gb-last'], [lastMove[1], 'gb-last']);
      if (chess.inCheck()) {
        const k = chess.board().flat().find((p) => p && p.type === 'k' && p.color === chess.turn());
        if (k) marks.push([sqToCell(k.square), 'gb-check']);
      }
      board.setMarks(marks);
      const sans = chess.history();
      moves.textContent = '';
      if (!sans.length) moves.append(h('span.muted', 'Aucun coup pour l\'instant'));
      for (let i = 0; i < sans.length; i += 2) {
        moves.append(h('span.mv', h('b', `${i / 2 + 1}.`), ` ${sans[i]}${sans[i + 1] ? ' ' + sans[i + 1] : ''}`));
      }
      moves.scrollLeft = moves.scrollWidth;
      undoBtn.toggleAttribute('disabled', thinking || chess.history().length < (player === 'w' ? 1 : 2));
      if (over) return;
      status.textContent = thinking ? 'Auguste réfléchit' : chess.turn() === player ? (chess.inCheck() ? 'Échec ! À toi de jouer' : 'À toi de jouer') : '…';
      status.classList.toggle('thinking', thinking);
    };

    const persist = () => {
      if (save.data.chess.game) { save.data.chess.game.pgn = chess.pgn(); save.save(); }
    };

    const afterMove = (captured: string | undefined, byAug: boolean) => {
      if (chess.isCheckmate()) { audio.play('victory'); haptic('chessMate'); }
      else if (chess.inCheck()) { audio.play('check'); haptic('chessCheck'); }
      else { audio.play(captured ? 'capture' : 'move'); if (captured) haptic('chessCapture'); else if (!byAug) haptic('chessMove'); }
      persist();
      render();
      const end = gameEnd(chess);
      if (end) { window.setTimeout(() => finish(end), 650); return; }
      if (byAug) {
        if (captured === 'q') say('queenTaken', 1, true);
        else if (chess.inCheck()) say('augCheck', 0.8);
        else if (herQueenThreatened()) say('queenThreat', 0.7);
        else if (captured) say('augCapture', 0.55);
        armIdle();
      } else {
        window.clearTimeout(idleTimer);
        if (captured === 'q') say('radiaTakesQueen', 1, true);
        else if (chess.inCheck()) say('radiaCheck', 0.7);
        else if (captured) say('radiaCapture', 0.5);
      }
      if (chess.turn() !== player) void aiTurn();
    };

    const playerMove = async (from: number, to: number) => {
      let promo: string | undefined;
      if (needsPromotion(chess, from, to)) { board.locked = true; promo = await askPromotion(player); board.locked = false; }
      const m = playUci(chess, cellToSq(from) + cellToSq(to) + (promo ?? ''));
      if (!m) { audio.play('invalid'); render(); return; }
      lastMove = [from, to];
      afterMove(m.captured, false);
    };

    const aiTurn = async () => {
      thinking = true;
      board.locked = true;
      render();
      const my = ++token;
      // Auguste « réfléchit » comme un humain : plus vite s'il n'a qu'un coup possible.
      const [a, b] = THINK[diff];
      const forced = chess.moves().length <= 1;
      const think = forced ? 700 : a + Math.random() * (b - a);
      const t0 = performance.now();
      const uci = await aiMove(new Chess().fen(), chess.history({ verbose: true }).map(toUci), chess.fen(), diff);
      const left = think - (performance.now() - t0);
      if (left > 0) await new Promise((r) => window.setTimeout(r, left));
      if (!alive || my !== token || over) return;
      thinking = false;
      board.locked = false;
      const m = uci ? playUci(chess, uci) : null;
      if (m) lastMove = [sqToCell(m.from), sqToCell(m.to)];
      afterMove(m?.captured, true);
    };

    const undo = () => {
      if (thinking || over) return;
      const n = chess.turn() === player ? 2 : 1;
      if (chess.history().length < n) return;
      for (let i = 0; i < n; i++) chess.undo();
      const hs = chess.history({ verbose: true });
      lastMove = hs.length ? [sqToCell(hs[hs.length - 1].from), sqToCell(hs[hs.length - 1].to)] : undefined;
      token++;
      audio.play('move');
      persist();
      render();
      say('undo', 0.8);
    };

    let recorded = false;
    const record = (end: GameEnd, resign = false) => {
      if (recorded) return;
      recorded = true;
      const c = save.data.chess;
      if (end.kind === 'draw') c.draws++;
      else if (end.winner === player) { c.wins[diff]++; save.data.economy.diamonds += diff === 'hard' ? 15 : diff === 'normal' ? 8 : 4; }
      else c.losses++;
      c.game = null;
      save.save();
      checkAchievements();
      void resign;
    };

    const finish = async (end: GameEnd, resign = false) => {
      if (over) return;
      over = true;
      board.locked = true;
      record(end, resign);
      render();
      const win = end.kind === 'mate' && end.winner === player;
      const title = end.kind === 'draw' ? 'Partie nulle' : win ? 'Échec et mat !' : resign ? 'Partie abandonnée' : 'Échec et mat…';
      const text = end.kind === 'draw' ? `Nulle par ${end.reason}. Personne ne perd, tout le monde s'aime.` : win ? `Tu as battu Auguste (${AI_LEVELS[diff].label.toLowerCase()}). Quelle reine !` : resign ? 'Auguste fait semblant de ne pas être fier. Il l\'est.' : 'Auguste a gagné cette fois… Revanche ?';
      status.textContent = title;
      window.clearTimeout(idleTimer);
      if (win) { audio.play('victory'); say('radiaWin', 1, true); } else if (end.kind === 'mate') say('augWin', 1, true); else say('draw', 1, true);
      void bark;
      const v = await ui.modal({ title, body: text, actions: [{ label: 'Rejouer', value: 'again' }, { label: 'Voir le plateau', value: 'view', style: 'secondary' }] });
      if (!alive) return;
      if (v === 'again') { save.data.chess.game = { pgn: '', difficulty: diff, color: player }; save.save(); startGame(); }
      else {
        bar.textContent = '';
        bar.append(h('button.btn.small', { on: { click: tap(() => showSetup()) } }, icon('refresh', 18), 'Nouvelle partie'));
      }
    };

    render();
    const end0 = gameEnd(chess);
    if (end0) void finish(end0);
    else {
      window.setTimeout(() => {
        if (!alive || over) return;
        if (chess.history().length) say('resume', 1, true);
        else say(player === 'b' ? 'startBlack' : 'start', 1, true);
      }, 700);
      if (chess.turn() !== player) void aiTurn(); else armIdle();
    }
    destroyFn = () => { alive = false; token++; unfit(); board.dispose(); window.clearTimeout(idleTimer); };
  };

  if (save.data.chess.game) startGame(); else showSetup();
  return { el, destroy: () => { destroyFn?.(); } };
}
