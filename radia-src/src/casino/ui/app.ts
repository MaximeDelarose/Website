/** Orchestre le casino : carte d'Auguste → salon → jeux / missions. Chargé à la demande par `openCasino()`. */
import { welcome, returnBring } from '../chips';
import { markTask } from '../tickets';
import { cs, notifyCasino, persist } from '../store';
import { createShell } from './shell';
import { cardScene, lobbyScene, missionsScene } from './lobby';
import { privilegesScene } from './privileges';
import { rouletteScene } from './roulette';
import { slotsScene } from './slots';
import { blackjackScene } from './blackjack';
import { warmAuguste } from '../../game/art/world/radiaNow';

export function runCasino(): Promise<void> {
  return new Promise((resolve) => {
    const s = cs();
    const welcomed = welcome(s) > 0;
    s.stats.visites = (s.stats.visites ?? 0) + 1;
    markTask(s, 'visit'); // mini-défi du jour « passer au salon » (sans hasard)
    returnBring(s); // d'éventuels tickets restés sur la table (fermeture brutale) reviennent en poche
    persist(); notifyCasino();
    void warmAuguste();
    const sh = createShell(() => resolve());
    const lobby = (): void => sh.show(lobbyScene(sh, {
      onBack: () => sh.exit(),
      go: (g) => {
        const back = () => lobby();
        if (g === 'wheel') { void import('../../wheel').then((m) => m.openWheel()).then(back, back); return; }
        if (g === 'daily') { void import('../../daily/ui').then((m) => m.openDaily()).then(back, back); return; }
        const ctx = { onBack: back, goCard: () => card(false) };
        if (g === 'roulette') sh.show(rouletteScene(sh, ctx));
        else if (g === 'slots') sh.show(slotsScene(sh, ctx));
        else if (g === 'blackjack') sh.show(blackjackScene(sh, ctx));
        else if (g === 'missions') sh.show(missionsScene({ onBack: back }));
        else card(false);
      },
    }));
    const card = (first: boolean): void => sh.show(cardScene(sh, { welcomed: first && welcomed, onEnter: lobby, onBack: first ? () => sh.exit() : lobby, onPrivileges: () => sh.show(privilegesScene(sh, { onBack: () => card(false) })) }));
    card(true);
  });
}
