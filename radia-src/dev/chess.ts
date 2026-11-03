import '../src/ui/styles/base.css';
import { save } from '../src/core/app';
import { openChess, runQueenTutorial } from '../src/game/chess';
const q = new URLSearchParams(location.search);
save.load();
import { QUEEN_PUZZLES } from '../src/game/chess/queen';
if (q.has('reset')) { save.data.chess.game = null; save.data.chess.queen = []; save.data.chess.puzzles = []; }
if (q.has('unlock')) save.data.chess.queen = QUEEN_PUZZLES.map((p) => p.id);
const loop = async () => {
  if (q.has('tut')) { const r = await runQueenTutorial(); console.log('tutorial', r); }
  await openChess({ tab: (q.get('tab') as 'ai' | 'puzzles' | 'queen') ?? 'ai' });
  console.log('closed');
};
void loop();
(window as unknown as { done: boolean }).done = true;
