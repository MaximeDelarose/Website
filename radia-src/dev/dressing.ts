// Banc d'essai du dressing : /dev/dressing.html?rich=1 (pièces, tissus et diamants en abondance)
import '../src/ui/styles/base.css';
import '../src/ui/styles/game.css';
import { save, applySettings } from '../src/core/app';
import { openDressing } from '../src/ui/screens/world/dressing';

save.load();
applySettings();
if (new URLSearchParams(location.search).get('rich')) {
  save.data.world.res.coins = 3000; save.data.world.res.fabric = 60; save.data.economy.diamonds = 200;
}
(window as unknown as { save: unknown }).save = save;
void openDressing().then(() => { document.title = 'closed'; });
(window as unknown as { ready: boolean }).ready = true;
