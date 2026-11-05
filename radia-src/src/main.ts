/**
 * Point d'entrée de RADIA.
 * Chargement : sauvegarde → réglages → Phaser (scène de fond) → polices →
 * écran d'accueil. Service worker pour le hors-ligne (build uniquement).
 */
import './ui/styles/base.css';
import './ui/styles/game.css';
import { debugApis } from './core/debug';
import { startUpdateWatch } from './core/updateWatch';
import { startUpdates } from './core/updates';
import { maybeHintMissingPhotos, maybeShowStandaloneWelcome } from './ui/screens/standaloneWelcome';
import { save, setGame, applySettings, audio, events, game as getGame } from './core/app';
import { ACHIEVEMENT_DIAMONDS } from './core/progress';
import { createGame } from './game/GameConfig';
import { setLowFx } from './game/layout';
import { ui } from './ui/ui';
import { h } from './ui/dom';
import { showTitle } from './ui/screens/title';
import { BackdropScene } from './game/scenes/BackdropScene';
import { preloadPhotos } from './core/photos';
import { loadFamily } from './core/family';
import { installNoZoom } from './ui/noZoom';
import { startKidCalls } from './ui/components/kidCalls';
import { startCheckins } from './ui/components/checkins';
import { startGiftBubbles, spawnGiftNow } from './ui/components/giftBubble';
import { startInvitations, offerNow, secretNow, secretAdvance } from './events/scheduler';
import { startDaily } from './daily';
import { warmAuguste } from './game/art/world/radiaNow';

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

/** Nouveautés de la grande mise à jour (une seule fois, pour les parties existantes). */
async function showWhatsNew(): Promise<void> {
  if (save.data.seenUpdates.includes('v2')) return;
  save.data.seenUpdates.push('v2');
  save.save();
  if (!save.hadSave) return;
  const li = (t: string) => h('li', { style: 'margin:4px 0' }, t);
  await ui.modal({
    title: 'Nouveautés ♡',
    body: h('div', { style: 'text-align:left;font-size:15px' },
      h('ul', { style: 'padding-left:18px;margin:6px 0' },
        li('Les générateurs sont sur le plateau : touche-les pour produire des objets (1 ⚡).'),
        li('L\'énergie revient toute seule, et Auguste en offre souvent.'),
        li('Des diamants pour des bonus, des coffres, des objets rares et un sac de rangement.'),
        li('« Notre petit monde » à décorer avec tes cœurs.'),
        li('Et une boutique très spéciale : la carte d\'Auguste…')),
      h('p', { style: 'margin:8px 0 0;text-align:center;font-weight:600' }, '50 diamants offerts pour fêter ça 💎')),
    actions: [{ label: 'Trop bien !', value: 'ok' }],
  });
}

/** Nouveautés v4 : les invitations surprises (une seule fois, pour les parties existantes). */
async function showWhatsNewV4(): Promise<void> {
  if (save.data.seenUpdates.includes('v4')) return;
  save.data.seenUpdates.push('v4');
  save.save();
  if (!save.hadSave) return;
  const li = (t: string) => h('li', { style: 'margin:4px 0' }, t);
  await ui.modal({
    title: 'Ton téléphone sonne… ♡',
    body: h('div', { style: 'text-align:left;font-size:15px' },
      h('ul', { style: 'padding-left:18px;margin:6px 0' },
        li('Des invitations surprises arrivent pendant que tu joues : restaurant, palace, feu d\'artifice, spa, bal…'),
        li('Les enfants te proposent aussi des activités, et ta carrière t\'ouvre des portes.'),
        li('Tu peux dire « J\'arrive ♡ » ou « Plus tard » : rien n\'est jamais perdu.'),
        li('Tes messages, tes photos souvenirs et ton historique sont dans le petit téléphone 📱.')),
      h('p', { style: 'margin:8px 0 0;text-align:center;font-weight:600' }, 'Chaque sortie rapporte pièces, diamants et souvenirs ♡')),
    actions: [{ label: 'J\'ai hâte !', value: 'ok' }],
  });
}

/** Nouveautés v6 : petites améliorations (une seule fois, pour les parties existantes). Sans spoiler : on explique l'usage, pas les surprises. */
async function showWhatsNewV6(): Promise<void> {
  if (save.data.seenUpdates.includes('v6')) return;
  save.data.seenUpdates.push('v6');
  save.save();
  if (!save.hadSave) return;
  const li = (t: string) => h('li', { style: 'margin:4px 0' }, t);
  await ui.modal({
    title: 'Petites améliorations ♡',
    body: h('div', { style: 'text-align:left;font-size:15px' },
      h('ul', { style: 'padding-left:18px;margin:6px 0' },
        li('Maintiens ton doigt sur un compteur (pièces, diamants, énergie, cœurs, tickets) : une petite fiche explique à quoi il sert et comment en gagner.'),
        li('Le plateau est plus fiable : si un geste est interrompu, il se remet tout seul en route.'),
        li('RADIA se met à jour toute seule quand tu reviens dedans, sans toucher à ta partie.'),
        li('Dans Paramètres, « Ressources » te rappelle tout cela.')),
      h('p', { style: 'margin:8px 0 0;text-align:center;font-weight:600' }, 'Rien à faire : ta partie est intacte ♡')),
    actions: [{ label: 'Merci !', value: 'ok' }],
  });
}

/** Nouveautés v3 : le château de Radia (une seule fois, pour les parties existantes). */
async function showWhatsNewV3(): Promise<void> {
  if (save.data.seenUpdates.includes('v3')) return;
  save.data.seenUpdates.push('v3');
  save.save();
  if (!save.hadSave) return;
  const li = (t: string) => h('li', { style: 'margin:4px 0' }, t);
  await ui.modal({
    title: 'Le château de Radia ♡',
    body: h('div', { style: 'text-align:left;font-size:15px' },
      h('ul', { style: 'padding-left:18px;margin:6px 0' },
        li('Ton château à décorer pièce par pièce, avec des couleurs au choix.'),
        li('Le dressing : vêtements, coiffures, couronnes, 3 looks favoris.'),
        li('Un chat à adopter (tu choisis son prénom), un jardin de fleurs, une chocolaterie.'),
        li('Les jeux en famille, quatre carrières, des fans et des couvertures de magazine.'),
        li('Tout se trouve dans MON MONDE. Les pièces et matériaux se gagnent en fusionnant !')),
      h('p', { style: 'margin:8px 0 0;text-align:center;font-weight:600' }, '60 pièces offertes pour commencer ♡')),
    actions: [{ label: 'Découvrir', value: 'ok' }],
  });
}

async function boot(): Promise<void> {
  progress(0.1);
  save.load();
  setLowFx(save.data.settings.effects === 'reduced');
  applySettings();
  void save.requestPersistence();
  void loadFamily();
  installNoZoom();
  startKidCalls();
  startCheckins();
  startInvitations();
  startGiftBubbles();
  startDaily();
  void warmAuguste();
  preloadPhotos(['face-radia', 'face-auguste', 'char-radia', 'char-radia-nc', 'char-auguste', 'bust-radia', 'bust-radia-nc', 'bust-auguste', 'head-auguste', 'head-new']);
  progress(0.3);

  // Écriture immédiate quand Safari passe en arrière-plan ou se ferme.
  document.addEventListener('visibilitychange', () => { if (document.hidden) save.writeNow(); });
  window.addEventListener('pagehide', () => save.writeNow());

  // Premier toucher : déverrouillage audio (exigence iOS).
  const unlock = () => { audio.unlock(); };
  window.addEventListener('pointerdown', unlock, { once: true, passive: true });

  // Succès : notification + diamants offerts
  events.on('achievement', (a) => {
    audio.play('achievement');
    ui.toast({ title: `Succès : ${a.name}`, sub: `${a.desc} · +${ACHIEVEMENT_DIAMONDS} 💎`, icon: 'trophy', ms: 3600 });
    events.emit('economy', undefined);
  });

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
  await maybeShowStandaloneWelcome();
  await maybeHintMissingPhotos();
  await showWhatsNew();
  await showWhatsNewV3();
  await showWhatsNewV4();
  await showWhatsNewV6();

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => undefined);
  }
  // vérification des mises à jour (lancement, retour au premier plan, retour du réseau, toutes les 10 min)
  if (import.meta.env.PROD) startUpdates(() => save.writeNow());
}

// application installée sur l'écran d'accueil (iOS : navigator.standalone) : voir base.css
try { if ((navigator as { standalone?: boolean }).standalone === true) document.documentElement.classList.add('standalone'); } catch { /* ignore */ }
window.addEventListener('error', (e) => console.error('[radia]', e.error ?? e.message));
boot().catch((e) => {
  console.error(e);
  hideSplash();
  ui.root.append(h('div.modal-backdrop', h('div.modal.panel', h('h2', 'Oups…'), h('p', 'Le jeu n\'a pas pu démarrer. Recharge la page pour réessayer.'), h('button.btn', { on: { click: () => location.reload() } }, 'Recharger'))));
});

startUpdateWatch();

// Accès debug en développement : window.RADIA
if (new URLSearchParams(location.search).has('debug')) { void import('./casino'); void import('./wheel'); }
if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) {
  (window as unknown as Record<string, unknown>).RADIA = { ...debugApis(), save, audio, game: () => getGame(), activity: async (id: string, params?: Record<string, unknown>, data?: Record<string, unknown>) => (await import('./events/harness')).runActivityStandalone(id as never, params, data), invite: (id?: string) => offerNow(id), gift: () => spawnGiftNow(), secretCall: () => secretNow(), secretAdvance: (m: number) => secretAdvance(m), phone: async () => (await import('./events/ui/phone')).openPhone(), kidCall: async (id: string) => { const m = await import('./ui/components/kidCalls'); const c = m.callById(id); if (c) m.showKidCall(c); } };
}
