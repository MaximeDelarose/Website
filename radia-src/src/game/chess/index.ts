/**
 * Module Échecs de RADIA : partie contre l'IA, problèmes, Mode Reine.
 *
 *   openChess({ tab })   → écran plein cadre ; se résout au retour.
 *   runQueenTutorial()   → présentation + premier puzzle du Mode Reine
 *                          (étape « queen » de l'histoire, chapitre 4).
 */
import '../../ui/styles/chess.css';
import { h, tap } from '../../ui/dom';
import { ui } from '../../ui/ui';
import { canvasUrl } from '../art/kit';
import { medallionCanvas } from '../art/characters';
import { setBarkSink } from '../../core/progress';
import { classicView } from './classic';
import { puzzleView } from './puzzleView';
import { queenPuzzleView, queenRules, queenTabView } from './queenView';
import type { View } from './common';

export type ChessTab = 'ai' | 'puzzles' | 'queen';

const augusteImg = () => canvasUrl('chess:aug', () => medallionCanvas('auguste', { expr: 'smile' }, 120));

export function openChess(opts: { tab?: ChessTab } = {}): Promise<void> {
  return new Promise((resolve) => {
    let view: View | null = null;
    let augSpot: HTMLElement | null = null;
    const body = h('div.chess-body');
    const tabs: [ChessTab, string][] = [['ai', 'Contre l\'IA'], ['puzzles', 'Problèmes'], ['queen', 'Mode Reine']];
    const tabBtns = tabs.map(([k, label]) => h('button', { on: { click: tap(() => show(k)) } }, label));
    const seg = h('div.seg.chess-tabs', ...tabBtns);
    const close = () => {
      view?.destroy();
      setBarkSink(null);
      resolve();
    };
    const screen = h('div.chess-screen.bg-soft', ui.header('Échecs', close), seg, body);

    // Les répliques d'Auguste s'affichent près de son médaillon (ou en haut de l'écran).
    setBarkSink((text) => {
      const anchor = augSpot?.isConnected ? augSpot.getBoundingClientRect() : null;
      ui.bubble(text, anchor ? anchor.left : 16, anchor ? anchor.top - 6 : 140);
    });

    const show = (k: ChessTab) => {
      view?.destroy();
      body.textContent = '';
      tabBtns.forEach((b, i) => b.classList.toggle('on', tabs[i][0] === k));
      augSpot = null;
      view = k === 'ai'
        ? classicView((spot) => { augSpot = spot; spot.append(h('img', { src: augusteImg(), alt: 'Auguste' })); })
        : k === 'puzzles' ? puzzleView() : queenTabView();
      body.append(view.el);
    };

    ui.showScreen(screen);
    show(opts.tab ?? 'ai');
  });
}

export function runQueenTutorial(): Promise<'done' | 'quit'> {
  return new Promise((resolve) => {
    let view: View | null = null;
    let finished = false;
    const end = (v: 'done' | 'quit') => { if (finished) return; finished = true; view?.destroy(); resolve(v); };
    const body = h('div.chess-body');
    const screen = h('div.chess-screen.bg-soft', ui.header('Mode Reine', () => end('quit')), body);
    ui.showScreen(screen);
    body.append(h('div.panel.queen-welcome',
      h('h2', 'Le Mode Reine'),
      queenRules(),
      h('button.btn.wide', { on: { click: tap(() => start()) } }, 'Essayer ♡')));
    const start = () => {
      body.textContent = '';
      view = queenPuzzleView({
        index: 0, tutorial: true,
        onSolved: async () => {
          await ui.modal({ title: 'Bravo ma reine !', body: 'Tu as compris le Mode Reine. Dix autres puzzles t\'attendent dans le menu Échecs.', actions: [{ label: 'Continuer', value: 'ok' }], dismissible: false });
          end('done');
        },
      });
      body.append(view.el);
    };
  });
}
