/** Orchestre le casino : carte d'Auguste → salon → jeux / missions. Chargé à la demande par `openCasino()`. */
import { welcome } from '../chips';
import { markTask } from '../rewards';
import { addRes } from '../../core/world';
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
    const gift = welcome(s); // cadeau d'ouverture (première visite) : des pièces, versées une seule fois
    if (gift > 0) addRes('coins', gift);
    const welcomed = gift > 0;
    s.stats.visites = (s.stats.visites ?? 0) + 1;
    markTask(s, 'visit'); // mini-défi du jour « passer au salon » (sans hasard)
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
