/**
 * Point d'entrée de RADIA.
 * Chargement : sauvegarde → réglages → Phaser (scène de fond) → polices →
 * écran d'accueil. Service worker pour le hors-ligne (build uniquement).
 */
import './ui/styles/base.css';
import './ui/styles/game.css';
import { save, setGame, applySettings, audio, game as getGame } from './core/app';
import { createGame } from './game/GameConfig';
import { setLowFx } from './game/layout';
import { ui } from './ui/ui';
import { h } from './ui/dom';
import { showTitle } from './ui/screens/title';
import { BackdropScene } from './game/scenes/BackdropScene';
import { preloadPhotos } from './core/photos';

const progress = (p: number) => {
  const bar = document.getElementById('splash-progress');
  if (bar) bar.style.width = `${Math.round(p * 100)}%`;
};

function hideSplash(): void {
  const s = document.getElementById('splash');
  if (!s) return;
  s.classList.add('hidden');
  window.setTimeout(() => s.remove(), 700);
}

async function handleSaveProblems(): Promise<void> {
  if (save.status === 'backup') {
    ui.toast({ title: 'Sauvegarde récupérée', sub: 'La copie de secours a été utilisée ♡', icon: 'check', ms: 4000 });
  } else if (save.status === 'corrupt') {
    const v = await ui.modal({
      title: 'Sauvegarde illisible',
      body: 'La sauvegarde de ce navigateur est abîmée et aucune copie de secours n\'est utilisable. Une copie de la donnée abîmée a été gardée de côté.',
      actions: [{ label: 'Recommencer une partie', value: 'reset' }],
      dismissible: false,
    });
    if (v === 'reset') save.reset();
  } else if (save.status === 'unavailable') {
    ui.toast({ title: 'Sauvegarde indisponible', sub: 'Navigation privée ? La progression ne sera pas gardée.', icon: 'info', ms: 5000 });
  } else if (save.status === 'too-new') {
    ui.toast({ title: 'Sauvegarde plus récente', sub: 'Elle a été chargée au mieux.', icon: 'info', ms: 4000 });
  }
}

async function boot(): Promise<void> {
  progress(0.1);
  save.load();
  setLowFx(save.data.settings.effects === 'reduced');
  applySettings();
  void save.requestPersistence();
  preloadPhotos(['face-radia', 'face-auguste']);
  progress(0.3);

  // Écriture immédiate quand Safari passe en arrière-plan ou se ferme.
  document.addEventListener('visibilitychange', () => { if (document.hidden) save.writeNow(); });
  window.addEventListener('pagehide', () => save.writeNow());

  // Premier toucher : déverrouillage audio (exigence iOS).
  const unlock = () => { audio.unlock(); };
  window.addEventListener('pointerdown', unlock, { once: true, passive: true });

  const game = createGame();
  setGame(game);
  await new Promise<void>((resolve) => {
    const check = () => {
      const sc = game.scene.getScene(BackdropScene.KEY);
      if (sc && sc.sys.isActive()) resolve();
      else window.setTimeout(check, 30);
    };
    check();
  });
  progress(0.7);
  try {
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);
    await Promise.all([document.fonts.load('600 18px Fredoka'), document.fonts.load('700 32px "Dancing Script"')]);
  } catch { /* polices système en secours */ }
  progress(1);
  await new Promise((r) => setTimeout(r, 250));
  hideSplash();
  showTitle();
  await handleSaveProblems();

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  }
}

window.addEventListener('error', (e) => console.error('[radia]', e.error ?? e.message));
boot().catch((e) => {
  console.error(e);
  hideSplash();
  ui.root.append(h('div.modal-backdrop', h('div.modal.panel', h('h2', 'Oups…'), h('p', 'Le jeu n\'a pas pu démarrer. Recharge la page pour réessayer.'), h('button.btn', { on: { click: () => location.reload() } }, 'Recharger'))));
});

// Accès debug en développement : window.RADIA
if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) {
  (window as unknown as Record<string, unknown>).RADIA = { save, audio, game: () => getGame() };
}
