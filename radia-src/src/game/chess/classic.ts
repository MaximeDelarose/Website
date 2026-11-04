/**
 * Partie d'échecs classique « contre Auguste » (règles complètes via chess.js).
 * Le moteur joue pour lui, mais tout est présenté comme une vraie partie
 * contre Auguste : son visage, ses humeurs, son temps de réflexion humain et
 * ses petites réactions affectueuses (lines.ts). La dame de Radia porte le
 * visage de Radia. Aides facultatives : points, pièces menacées, captures,
 * indices progressifs, annulation, tutoriel contextuel.
 */
import { haptic } from '../../core/haptics';
import { Chess } from 'chess.js';
import { h, tap } from '../../ui/dom';
import { icon } from '../../ui/icons';
import { ui } from '../../ui/ui';
import { save, audio } from '../../core/app';
import { checkAchievements } from '../../core/progress';
import type { ChessDifficulty } from '../../save/schema';
import { GridBoard } from './GridBoard';
import { AI_LEVELS, aiMove } from './ai';
import { askPromotion, cellToSq, chessPieces, chessTargets, fitBoard, isDarkSq, needsPromotion, sqToCell, type View } from './common';
import { gameEnd, playUci, toUci, type GameEnd } from './rules';
import type { Side, PieceKind } from './pieces';
import { CHESS_TIPS, CHESS_TIP_ORDER, pickChessLine, type ChessSituation } from './lines';
import { canUndo, capturableSquares, hintFor, threatenedSquares, undoPair, type Hint } from './helps';
import { PIECE_VALUE } from './detente';
import { canvasUrl } from '../art/kit';
import { medallionCanvas } from '../art/characters';
import { radiaFaceCanvas, lookKey } from '../art/world/radiaNow';
import { hasPhotos, photoUrl, photoUrlNow } from '../../core/photos';

/** Temps de réflexion « humain » d'Auguste (ms), selon son humeur. */
const THINK: Record<ChessDifficulty, [number, number]> = { relax: [800, 2000], easy: [900, 2300], normal: [1300, 3300], hard: [1700, 4200] };

const crownSvg = (fill: string) => `<svg class="face-crown" viewBox="0 0 40 24" aria-hidden="true"><path d="M3 21 L1 5 L11 13 L20 2 L29 13 L39 5 L37 21 Z" fill="${fill}" stroke="#58433F" stroke-width="2.2" stroke-linejoin="round"/><circle cx="20" cy="15" r="2.6" fill="#FF75A8"/></svg>`;

const DIFFS: ChessDifficulty[] = ['relax', 'easy', 'normal', 'hard'];
/** Diamants (virtuels, gratuits) gagnés pour une victoire. */
const REWARD: Record<ChessDifficulty, number> = { relax: 3, easy: 4, normal: 8, hard: 15 };

/** Aides actuelles (mémorisées dans la sauvegarde). */
const opts = () => save.data.chess.opts ?? (save.data.chess.opts = { legal: true, threats: true, captures: true, tutorial: true });

/** Bascule d'option avec mémorisation. */
function optToggle(label: string, sub: string, key: 'legal' | 'threats' | 'captures' | 'tutorial', onChange: () => void): HTMLElement {
  const o = opts();
  const t = h(`button.toggle${o[key] ? '.on' : ''}`, { role: 'switch', 'aria-checked': String(o[key]), 'aria-label': label });
  t.addEventListener('click', tap(() => {
    const v = !t.classList.contains('on');
    t.classList.toggle('on', v);
    t.setAttribute('aria-checked', String(v));
    opts()[key] = v;
    save.save();
    onChange();
  }));
  return h('div.setting-row', h('label', label, h('small', sub)), t);
}

export function classicView(onAugusteSpot: (el: HTMLElement) => void): View {
  const el = h('div.chess-view.classic');
  let destroyFn: (() => void) | null = null;

  const showSetup = () => {
    destroyFn?.();
    destroyFn = null;
    el.textContent = '';
    // « Détente ♡ » par défaut (y compris pour les anciennes sauvegardes)
    let diff: ChessDifficulty = save.data.chess.pref ?? 'relax';
    let color: 'w' | 'b' | 'r' = 'w';
    const seg = <T extends string>(opts: [T, string][], cur: T, set: (v: T) => void, cls = '') => {
      const wrap = h(`div.seg${cls}`);
      const btns = opts.map(([v, label]) => h('button', { class: v === cur ? 'on' : '', on: { click: tap(() => { set(v); btns.forEach((b, i) => b.classList.toggle('on', opts[i][0] === v)); desc.textContent = AI_LEVELS[diff].desc; }) } }, label));
      wrap.append(...btns);
      return wrap;
    };
    const desc = h('p.muted.center.setup-desc', AI_LEVELS[diff].desc);
    const w = save.data.chess.wins;
    el.append(h('div.panel.chess-setup',
      h('h2', 'Une partie contre Auguste'),
      h('div.setup-row', h('label', 'Son humeur'), seg(DIFFS.map((d) => [d, AI_LEVELS[d].label] as [ChessDifficulty, string]), diff, (v) => { diff = v; }, '.wrap')),
      desc,
      h('div.setup-row', h('label', 'Tes pièces'), seg([['w', 'Blancs'], ['b', 'Noirs'], ['r', 'Hasard']] as ['w' | 'b' | 'r', string][], color, (v) => { color = v; })),
      h('div.setup-aids',
        h('small.muted', 'Aides (modifiables en jeu) · pas de limite de temps'),
        optToggle('Points des coups', 'Où la pièce peut aller', 'legal', () => {}),
        optToggle('Pièces menacées', 'Un liseré doux prévient', 'threats', () => {}),
        optToggle('Captures possibles', 'Un anneau sur les prises', 'captures', () => {}),
        optToggle('Petit tutoriel', 'Des bulles courtes, une fois', 'tutorial', () => {}),
      ),
      h('button.btn.wide', { on: { click: tap(() => {
        const c: Side = color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : color;
        save.data.chess.pref = diff;
        save.data.chess.game = { pgn: '', difficulty: diff, color: c };
        save.save();
        startGame();
      }) } }, icon('play', 20), 'Commencer'),
      h('div.chess-stats',
        h('span.chip', `Victoires · Détente ${w.relax} · Détendu ${w.easy} · Concentré ${w.normal} · Sérieux ${w.hard}`),
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
    const startFen = chess.getHeaders().FEN || new Chess().fen();
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

    // ---- répliques d'Auguste (rares, jamais deux fois de suite les mêmes)
    let lastTaunt = 0;
    const say = (k: ChessSituation, chance = 1, force = false) => {
      const now = Date.now();
      if (!force && (now - lastTaunt < 6500 || Math.random() > chance)) return;
      lastTaunt = now;
      const r = aug.getBoundingClientRect();
      ui.bubble(pickChessLine(k), Math.max(8, r.left), r.top - 8, 3600);
      audio.play('pickup');
    };
    let idleTimer: number | undefined;
    const armIdle = () => {
      window.clearTimeout(idleTimer);
      if (over) return;
      idleTimer = window.setTimeout(() => { if (alive && !over && chess.turn() === player) say('longThink', 1, true); }, 40_000);
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
      showDots: () => opts().legal,
      onMove: (from, to) => void playerMove(from, to),
      onInvalid: (from, to) => { if (chess.get(cellToSq(to))?.color !== player) { audio.play('invalid'); board.shake(from); } },
    });
    holder.append(board.el);
    const unfit = fitBoard(holder, board.el);

    // ---- indice (progressif : thème → pièce → coup)
    let hintCache: { fen: string; move: Hint['move']; level: number } | null = null;
    let hintNow: Hint | null = null;
    const clearHint = () => { hintNow = null; };
    const giveHint = () => {
      if (over || thinking || chess.turn() !== player) return;
      const fen = chess.fen();
      const level = (hintCache && hintCache.fen === fen ? Math.min(3, hintCache.level + 1) : 1) as 1 | 2 | 3;
      const hnt = hintFor(chess, level, Math.random, hintCache && hintCache.fen === fen ? hintCache.move : undefined);
      if (!hnt) return;
      hintCache = { fen, move: hnt.move, level };
      hintNow = hnt;
      audio.play('pickup');
      dismissTip();
      if (level === 1) say('hintUsed', 0.45, true);
      render();
    };
    const hintBtn = h('button.btn.small.secondary', { on: { click: tap(() => giveHint()) } }, icon('hint', 18), 'Indice');
    const undoBtn = h('button.btn.small.secondary', { on: { click: tap(() => undo()) } }, icon('undo', 18), 'Annuler');
    const menuBtn = h('button.btn.small.secondary', { on: { click: tap(() => openMenu()) } }, icon('settings', 18), 'Aides');
    const bar = h('div.chess-actions', hintBtn, undoBtn, menuBtn);
    const whoEl = h('div.chess-who', `Auguste · ${AI_LEVELS[diff].label}`);
    const tipBox = h('div.chess-tip');
    tipBox.hidden = true;
    const grow = h('div.grow', whoEl, status, tipBox);
    el.append(h('div.chess-top', aug, grow), moves, holder, bar);
    onAugusteSpot(aug);
    aug.append(avatar);

    // ---- tutoriel contextuel : une bulle par notion, une seule fois, passable
    let tipTimer: number | undefined;
    const dismissTip = () => {
      window.clearTimeout(tipTimer);
      if (tipBox.hidden) return;
      tipBox.hidden = true;
      whoEl.hidden = false;
      status.hidden = false;
    };
    const tip = (key: string) => {
      if (!opts().tutorial || over) return;
      const seen = (save.data.chess.tut ??= []);
      if (seen.includes(key) || !tipBox.hidden || !CHESS_TIPS[key]) return;
      seen.push(key);
      save.save();
      tipBox.textContent = '';
      tipBox.append(
        h('span.tip-text', CHESS_TIPS[key]),
        h('button.tip-skip', { 'aria-label': 'Passer le tutoriel', on: { click: tap((e: Event) => { e.stopPropagation(); opts().tutorial = false; save.save(); dismissTip(); }) } }, 'Passer'),
      );
      tipBox.onclick = () => dismissTip();
      whoEl.hidden = true;
      status.hidden = true;
      tipBox.hidden = false;
      window.clearTimeout(tipTimer);
      tipTimer = window.setTimeout(dismissTip, 11_000);
    };
    /** Quelle notion proposer maintenant ? (tour de la joueuse) */
    const tipFor = () => {
      if (!opts().tutorial || chess.turn() !== player || over) return;
      const ms = chess.moves({ verbose: true });
      const want: Record<string, boolean> = {
        move: chess.history().length <= 1,
        capture: ms.some((m) => m.captured),
        check: chess.inCheck(),
        threat: threatenedSquares(chess, player).length > 0,
        castle: ms.some((m) => m.isKingsideCastle() || m.isQueensideCastle()),
        promotion: ms.some((m) => m.promotion),
        enpassant: ms.some((m) => m.isEnPassant()),
      };
      const seen = save.data.chess.tut ?? [];
      const k = CHESS_TIP_ORDER.find((x) => want[x] && !seen.includes(x));
      if (k) tip(k);
    };

    const marksNow = (): [number, string][] => {
      const marks: [number, string][] = [];
      if (lastMove) marks.push([lastMove[0], 'gb-last'], [lastMove[1], 'gb-last']);
      if (chess.inCheck()) {
        const k = chess.board().flat().find((p) => p && p.type === 'k' && p.color === chess.turn());
        if (k) marks.push([sqToCell(k.square), 'gb-check']);
      }
      if (!over && chess.turn() === player && !thinking) {
        if (opts().threats) for (const sq of threatenedSquares(chess, player)) marks.push([sqToCell(sq), 'gb-threat']);
        if (opts().captures) for (const sq of capturableSquares(chess, player)) marks.push([sqToCell(sq), 'gb-capring']);
        if (hintNow) {
          if (hintNow.from) marks.push([sqToCell(hintNow.from), 'gb-hint']);
          if (hintNow.to) marks.push([sqToCell(hintNow.to), 'gb-hint']);
        }
      }
      return marks;
    };

    const render = () => {
      board.setPieces(chessPieces(chess, face), lastMove);
      board.setMarks(marksNow());
      board.el.classList.toggle('calm', !!save.data.settings.reducedMotion || save.data.settings.effects === 'reduced');
      const sans = chess.history();
      moves.textContent = '';
      if (!sans.length) moves.append(h('span.muted', 'Aucun coup pour l\'instant'));
      for (let i = 0; i < sans.length; i += 2) {
        moves.append(h('span.mv', h('b', `${i / 2 + 1}.`), ` ${sans[i]}${sans[i + 1] ? ' ' + sans[i + 1] : ''}`));
      }
      moves.scrollLeft = moves.scrollWidth;
      undoBtn.toggleAttribute('disabled', thinking || over || !canUndo(chess, player));
      hintBtn.toggleAttribute('disabled', thinking || over || chess.turn() !== player);
      if (over) return;
      if (hintNow) {
        status.textContent = hintNow.text;
        status.classList.add('hint');
      } else {
        status.classList.remove('hint');
        status.textContent = thinking ? 'Auguste réfléchit' : chess.turn() === player ? (chess.inCheck() ? 'Échec ! À toi de jouer' : 'À toi de jouer') : '…';
      }
      status.classList.toggle('thinking', thinking);
    };

    const persist = () => {
      if (save.data.chess.game) { save.data.chess.game.pgn = chess.pgn(); save.save(); }
    };

    /** Une pièce d'Auguste de valeur ≥ 3 vient-elle d'être laissée à Radia sans protection ? */
    const augHung = () => chess.moves({ verbose: true }).some((m) => m.captured && PIECE_VALUE[m.captured] >= 3 && !chess.isAttacked(m.to, augColor));

    const afterMove = (m: { captured?: string; promotion?: string; san: string; piece: string }, byAug: boolean, hadThreat = false) => {
      const captured = m.captured;
      if (chess.isCheckmate()) { audio.play('victory'); haptic('chessMate'); }
      else if (chess.inCheck()) { audio.play('check'); haptic('chessCheck'); }
      else { audio.play(captured ? 'capture' : 'move'); if (captured) haptic('chessCapture'); else if (!byAug) haptic('chessMove'); }
      clearHint();
      persist();
      render();
      const end = gameEnd(chess);
      if (end) { window.setTimeout(() => finish(end), 650); return; }
      if (byAug) {
        if (captured === 'q') say('queenTaken', 1, true);
        else if (chess.inCheck()) say('augCheck', 0.7);
        else if (herQueenThreatened()) say('queenThreat', 0.55);
        else if (captured) say('augCapture', 0.45);
        else if (diff === 'relax' && augHung()) say('augMistake', 0.35);
        armIdle();
        window.setTimeout(() => { if (alive) tipFor(); }, 500);
      } else {
        window.clearTimeout(idleTimer);
        dismissTip();
        const n = chess.history().length;
        if (captured === 'q') say('radiaTakesQueen', 1, true);
        else if (chess.inCheck()) say('radiaCheck', 0.6);
        else if (m.promotion) say('radiaPromo', 0.8);
        else if (m.san.startsWith('O-O')) say('radiaCastle', 0.55);
        else if (captured) say('radiaCapture', 0.5);
        else if (hadThreat && threatenedSquares(chess, player).length === 0) say('goodDefense', 0.35);
        else if (n <= 3) say('opening', 0.5);
      }
      if (chess.turn() !== player) void aiTurn();
    };

    const playerMove = async (from: number, to: number) => {
      let promo: string | undefined;
      if (needsPromotion(chess, from, to)) { board.locked = true; promo = await askPromotion(player); board.locked = false; }
      const hadThreat = threatenedSquares(chess, player).length > 0;
      const m = playUci(chess, cellToSq(from) + cellToSq(to) + (promo ?? ''));
      if (!m) { audio.play('invalid'); render(); return; }
      lastMove = [from, to];
      afterMove(m, false, hadThreat);
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
      const uci = await aiMove(startFen, chess.history({ verbose: true }).map(toUci), chess.fen(), diff);
      const left = think - (performance.now() - t0);
      if (left > 0) await new Promise((r) => window.setTimeout(r, left));
      if (!alive || my !== token || over) return;
      thinking = false;
      board.locked = false;
      const m = uci ? playUci(chess, uci) : null;
      if (m) lastMove = [sqToCell(m.from), sqToCell(m.to)];
      afterMove(m ?? { san: '', piece: '' }, true);
    };

    /** Annule le dernier coup de la joueuse ET la réponse d'Auguste (autant de fois qu'elle veut). */
    const undo = () => {
      if (thinking || over || !undoPair(chess, player)) return;
      const hs = chess.history({ verbose: true });
      lastMove = hs.length ? [sqToCell(hs[hs.length - 1].from), sqToCell(hs[hs.length - 1].to)] : undefined;
      token++;
      clearHint();
      hintCache = null;
      board.select(null);
      audio.play('move');
      persist();
      render();
      say('undo', 0.6);
    };

    let recorded = false;
    const record = (end: GameEnd) => {
      if (recorded) return;
      recorded = true;
      const c = save.data.chess;
      if (end.kind === 'draw') c.draws++;
      else if (end.winner === player) { c.wins[diff]++; save.data.economy.diamonds += REWARD[diff]; }
      else c.losses++;
      c.game = null;
      save.save();
      checkAchievements();
    };

    const finish = async (end: GameEnd, resign = false) => {
      if (over) return;
      over = true;
      board.locked = true;
      clearHint();
      dismissTip();
      record(end);
      render();
      const win = end.kind === 'mate' && end.winner === player;
      const title = end.kind === 'draw' ? 'Partie nulle' : win ? 'Échec et mat !' : resign ? 'Partie abandonnée' : 'Échec et mat…';
      const text = end.kind === 'draw' ? `Nulle par ${end.reason}. Personne ne perd, tout le monde s'aime.` : win ? `Tu as battu Auguste${diff === 'relax' ? '' : ` (${AI_LEVELS[diff].label.toLowerCase()})`}. Quelle reine !` : resign ? 'Auguste fait semblant de ne pas être fier. Il l\'est.' : 'Auguste a gagné cette fois… Revanche ?';
      status.textContent = title;
      window.clearTimeout(idleTimer);
      if (win) { audio.play('victory'); say('radiaWin', 1, true); } else if (end.kind === 'mate') say('augWin', 1, true); else say('draw', 1, true);
      const v = await ui.modal({ title, body: text, actions: [{ label: 'Rejouer', value: 'again' }, { label: 'Voir le plateau', value: 'view', style: 'secondary' }] });
      if (!alive) return;
      if (v === 'again') { save.data.chess.game = { pgn: '', difficulty: diff, color: player }; save.save(); startGame(); }
      else {
        bar.textContent = '';
        bar.append(h('button.btn.small', { on: { click: tap(() => showSetup()) } }, icon('refresh', 18), 'Nouvelle partie'));
      }
    };

    /** Panneau « Aides » : options mémorisées + nouvelle partie / abandon. */
    const openMenu = async () => {
      const body = h('div.chess-menu',
        optToggle('Points des coups', 'Où la pièce peut aller', 'legal', () => board.refreshSelection()),
        optToggle('Pièces menacées', 'Un liseré doux prévient', 'threats', () => render()),
        optToggle('Captures possibles', 'Un anneau sur les prises', 'captures', () => render()),
        optToggle('Petit tutoriel', 'Des bulles courtes, une fois', 'tutorial', () => { if (!opts().tutorial) dismissTip(); }),
      );
      const v = await ui.modal({ title: 'Aides', body, actions: [
        { label: 'Fermer', value: 'close' },
        { label: 'Nouvelle partie', value: 'new', style: 'secondary' },
        ...(over ? [] : [{ label: 'Abandonner', value: 'resign', style: 'secondary' as const }]),
      ] });
      if (!alive) return;
      if (v === 'new') {
        if (!over && chess.history().length && !(await ui.confirm('Nouvelle partie ?', 'La partie en cours sera abandonnée.', 'Oui', 'Non'))) return;
        if (!over && chess.history().length) record({ kind: 'mate', winner: augColor });
        save.data.chess.game = null; save.save(); showSetup();
      } else if (v === 'resign') {
        if (over) return;
        if (!(await ui.confirm('Abandonner ?', 'Auguste ne le dira à personne. Enfin… presque.', 'Abandonner', 'Continuer'))) return;
        void finish({ kind: 'mate', winner: augColor }, true);
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
        window.setTimeout(() => { if (alive) tipFor(); }, 900);
      }, 700);
      if (chess.turn() !== player) void aiTurn(); else armIdle();
    }
    destroyFn = () => { alive = false; token++; unfit(); board.dispose(); window.clearTimeout(idleTimer); window.clearTimeout(tipTimer); };
  };

  if (save.data.chess.game) startGame(); else showSetup();
  return { el, destroy: () => { destroyFn?.(); } };
}
