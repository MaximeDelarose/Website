/**
 * Mini-jeux : « Les souvenirs mélangés », « Le billard des cœurs »,
 * « Le chemin des deux cœurs ».
 * runMinigame(id) lance la scène Phaser au-dessus du décor + la surcouche HTML,
 * et se résout en 'done' (terminé puis « Continuer ») ou 'quit'.
 */
import '../../ui/styles/minigames.css';
import type Phaser from 'phaser';
import { game, audio } from '../../core/app';
import { addHearts, markMinigame, checkAchievements } from '../../core/progress';
import { ui } from '../../ui/ui';
import { h, tap } from '../../ui/dom';
import { icon } from '../../ui/icons';
import type { BackdropScene } from '../scenes/BackdropScene';
import type { Theme } from '../art/scenes';
import { PuzzleScene } from './PuzzleScene';
import { BilliardScene } from './BilliardScene';
import { PathScene } from './PathScene';

export type MinigameId = 'puzzle' | 'billard' | 'chemin';

/** Ce que la scène peut demander à la surcouche HTML. */
export interface MinigameHost {
  /** Texte d'aide / progression en bas de l'écran (HTML simple autorisé). */
  setHud(html: string): void;
  /** Petit bandeau animé au centre (« Bien joué ! »). */
  banner(text: string, soft?: boolean): void;
  /** Le mini-jeu est terminé. stars ∈ 1..3. */
  complete(result: { score: number; stars: number; summary: string }): void;
  /** Hauteur occupée par la surcouche en haut et en bas (px CSS), pour la mise en page. */
  readonly topSpace: number;
  readonly bottomSpace: number;
}

interface Def {
  key: string;
  cls: new () => Phaser.Scene;
  title: string;
  subtitle: string;
  theme: Theme;
  firstReward: number;
}

const DEFS: Record<MinigameId, Def> = {
  puzzle: { key: 'mg-puzzle', cls: PuzzleScene, title: 'Les souvenirs mélangés', subtitle: 'Échange les morceaux pour reconstituer le souvenir', theme: 'paris', firstReward: 20 },
  billard: { key: 'mg-billard', cls: BilliardScene, title: 'Le billard des cœurs', subtitle: 'Tire vers l\'arrière, vise, relâche', theme: 'souvenirs', firstReward: 25 },
  chemin: { key: 'mg-chemin', cls: PathScene, title: 'Le chemin des deux cœurs', subtitle: 'Tourne les dalles pour réunir les deux cœurs', theme: 'monde', firstReward: 30 },
};

export const REPLAY_REWARD = 3;

let running = false;

export function runMinigame(id: MinigameId): Promise<'done' | 'quit'> {
  if (running) return Promise.resolve('quit');
  running = true;
  const def = DEFS[id];
  const g = game();
  const backdrop = g.scene.getScene('backdrop') as BackdropScene | null;
  const prevTheme = backdrop?.theme;
  backdrop?.setTheme(def.theme);

  return new Promise((resolve) => {
    let finished = false;
    const hud = h('div.mg-hud');
    const overlay = h('div.mg-overlay.passthrough',
      h('div.mg-top',
        h('button.icon-btn', { 'aria-label': 'Quitter', on: { click: tap(() => void askQuit()) } }, icon('close')),
        h('div.mg-title', h('b', def.title), h('small', def.subtitle)),
        h('div', { style: 'width:46px' }),
      ),
      hud,
    );
    ui.root.append(overlay);

    const end = (v: 'done' | 'quit') => {
      if (finished) return;
      finished = true;
      if (g.scene.isActive(def.key) || g.scene.isPaused(def.key)) g.scene.stop(def.key);
      overlay.classList.add('leaving');
      window.setTimeout(() => overlay.remove(), 260);
      if (prevTheme && v === 'quit') backdrop?.setTheme(prevTheme);
      running = false;
      resolve(v);
    };

    const askQuit = async () => {
      if (finished) return;
      g.scene.pause(def.key);
      const ok = await ui.confirm('Quitter le mini-jeu ?', 'Ta progression dans ce mini-jeu sera perdue.', 'Quitter', 'Continuer à jouer');
      if (ok) end('quit');
      else if (!finished) g.scene.resume(def.key);
    };

    const host: MinigameHost = {
      setHud(html: string) {
        hud.innerHTML = html;
        hud.classList.remove('bump');
        void hud.offsetWidth;
        hud.classList.add('bump');
        window.setTimeout(() => hud.classList.remove('bump'), 260);
      },
      banner(text: string, soft = false) {
        const b = h(`div.mg-banner.passthrough${soft ? '.soft' : ''}`, text);
        ui.root.append(b);
        window.setTimeout(() => b.remove(), 1700);
      },
      async complete(r) {
        if (finished) return;
        const first = markMinigame(id, r.score);
        const gain = first ? def.firstReward : REPLAY_REWARD;
        addHearts(gain);
        checkAchievements();
        audio.play('reward');
        const stars = Math.max(1, Math.min(3, r.stars));
        const body = h('div.mg-result',
          h('div.stars', ...[0, 1, 2].map((i) => h(i < stars ? 'span' : 'span.off', '★'))),
          h('p', r.summary),
          h('div.gain', icon('heart'), `+${gain} cœurs`),
        );
        await ui.modal({ title: 'Bravo !', body, actions: [{ label: 'Continuer', value: 'ok' }], dismissible: false });
        end('done');
      },
      get topSpace() { return overlay.querySelector('.mg-top')!.getBoundingClientRect().bottom + 8; },
      get bottomSpace() { return window.innerHeight - hud.getBoundingClientRect().top + 10; },
    };

    if (!g.scene.getScene(def.key)) g.scene.add(def.key, def.cls, false);
    g.scene.run(def.key, { host });
    g.scene.bringToTop(def.key);
  });
}
