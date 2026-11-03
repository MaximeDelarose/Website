// Banc d'essai des mini-jeux : /dev/minigames.html?g=puzzle|billard|chemin
import '../src/ui/styles/base.css';
import { createGame } from '../src/game/GameConfig';
import { setGame, audio, save } from '../src/core/app';
import { runMinigame, type MinigameId } from '../src/game/minigames';

save.load();
const g = createGame();
setGame(g);
window.addEventListener('pointerdown', () => audio.unlock(), { once: true });
const id = (new URLSearchParams(location.search).get('g') ?? 'puzzle') as MinigameId;
const w = window as unknown as { mgResult?: string; mgReady?: boolean; game: unknown };
w.game = g;
const start = () => {
  if (!g.scene.getScene('backdrop')?.sys.isActive()) { setTimeout(start, 50); return; }
  w.mgReady = true;
  void runMinigame(id).then((r) => { w.mgResult = r; document.title = 'result:' + r; });
};
start();
import * as bil from '../src/game/minigames/logic/billiard';
(window as unknown as { __bil: unknown }).__bil = bil;
