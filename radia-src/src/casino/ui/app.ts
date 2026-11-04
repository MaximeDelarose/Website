/** Orchestre le casino : carte d'Auguste → salon → jeux / missions. Chargé à la demande par `openCasino()`. */
import { welcome, returnBring } from '../chips';
import { cs, notifyCasino, persist } from '../store';
import { createShell } from './shell';
import { cardScene, lobbyScene, missionsScene } from './lobby';
import { rouletteScene } from './roulette';
import { slotsScene } from './slots';
import { blackjackScene } from './blackjack';
import { warmAuguste } from '../../game/art/world/radiaNow';

export function runCasino(): Promise<void> {
  return new Promise((resolve) => {
    const s = cs();
    const welcomed = welcome(s) > 0;
    s.stats.visites = (s.stats.visites ?? 0) + 1;
    returnBring(s); // d'éventuels jetons restés sur la table (fermeture brutale) reviennent en poche
    persist(); notifyCasino();
    void warmAuguste();
    const sh = createShell(() => resolve());
    const lobby = (): void => sh.show(lobbyScene(sh, {
      onBack: () => sh.exit(),
      go: (g) => {
        const back = () => lobby();
        const ctx = { onBack: back, goCard: () => card(false) };
        if (g === 'roulette') sh.show(rouletteScene(sh, ctx));
        else if (g === 'slots') sh.show(slotsScene(sh, ctx));
        else if (g === 'blackjack') sh.show(blackjackScene(sh, ctx));
        else if (g === 'missions') sh.show(missionsScene({ onBack: back }));
        else card(false);
      },
    }));
    const card = (first: boolean): void => sh.show(cardScene(sh, { welcomed: first && welcomed, onEnter: lobby, onBack: first ? () => sh.exit() : lobby }));
    card(true);
  });
}
