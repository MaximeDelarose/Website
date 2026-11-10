/**
 * Écran d'accueil + navigation principale (menu, carte des niveaux, succès).
 */
import { attachResourceInfo } from '../components/resourceInfo';
import { h, tap } from '../dom';
import { ui } from '../ui';
import { icon } from '../icons';
import { save, audio } from '../../core/app';
import { checkAchievements, bark, setBarkSink, stat } from '../../core/progress';
import { drawAugusteFull } from '../../game/art/characters';
import { drawRadiaNow, lookKey, augusteCutout, warmAuguste } from '../../game/art/world/radiaNow';
import { setBackdrop, setDim, themeForChapter } from '../../game/scenes/backdrop';
import { runStory, storyFinished, chessUnlocked } from '../../game/narrative/Story';
import { STORY, CHAPTERS, chapterAt } from '../../data/story';
import { LEVELS } from '../../data/levels';
import { ACHIEVEMENTS } from '../../data/achievements';
import { playLevel } from '../../game/merge/playLevel';
import { ENDLESS_DEF } from '../../game/merge/rules';
import { openAlbum } from './album';
import { openSettings } from './settings';
import { events } from '../../core/app';
import { wallet, fmt } from '../../core/wallet';
import { phoneButton } from '../../events/scheduler';
import { salaryInfo } from '../../game/world/careers';
import { world } from '../../core/world';
import { openShop, shopButton, diamondUrl, energyUrl } from './shop';
import { openEnergyPanel } from '../components/energyPanel';
import { hasPhotos } from '../../core/photos';
import { dailyBadge } from '../../daily';
import { modeButtonLabel, syncFreeMode, shouldAnnounceFree, markFreeAnnounced, isFreeModeUnlocked } from '../../core/freeMode';
import { startDomain } from '../../domain';
import { installButton } from './installHelp';
import { GIFT } from '../../config/gift';

const hasProgress = () => save.data.story.step > 0 || Object.keys(save.data.levels).length > 0;

/** Illustration animée de l'accueil (respiration, cheveux, clignements). */
function titleArt(): { el: HTMLCanvasElement; stop: () => void } {
  const W = 300;
  const H = 340;
  const scale = Math.min(2, window.devicePixelRatio || 1);
  const cv = document.createElement('canvas');
  cv.width = W * scale;
  cv.height = H * scale;
  cv.style.aspectRatio = `${W} / ${H}`;
  const ctx = cv.getContext('2d')!;
  let raf = 0;
  let last = 0;
  let blinkR = 0;
  let blinkA = 0;
  // Chaque pose (clignement × pas de marche) est dessinée une seule fois dans
  // un canvas à part ; l'animation ne fait ensuite que 2 drawImage par image.
  const k = scale * 0.52;
  const cache = new Map<string, HTMLCanvasElement>();
  const sprite = (who: 'radia' | 'auguste', blink: boolean, step: number): HTMLCanvasElement => {
    const key = `${who === 'radia' ? lookKey() : 'a'}:${who}:${blink ? 1 : 0}:${step}`;
    let c = cache.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = Math.ceil(240 * k);
      c.height = Math.ceil(600 * k);
      const g = c.getContext('2d')!;
      g.scale(k, k);
      if (who === 'radia') drawRadiaNow(g, 240, 600, { expr: 'smile', blink, step });
      else drawAugusteFull(g, { expr: 'smile', blink });
      cache.set(key, c);
    }
    return c;
  };
  const STEPS = [-0.35, -0.175, 0, 0.175, 0.35];

  // Avec le lien secret : Auguste en illustration détourée ; Radia aussi quand elle porte la tenue
  // de son illustration (même artiste), sinon elle est dessinée avec sa tenue actuelle (dressing).
  const art: { a: HTMLImageElement | null } = { a: null };
  const waitingPhotos = hasPhotos();
  const born = performance.now();
  if (waitingPhotos) void warmAuguste().then(() => { art.a = augusteCutout(); });
  const drawArt = (s: number, ha: HTMLImageElement) => {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingQuality = 'high';
    const gy = H - 4;
    // ombre au sol douce
    for (const [cx, rx] of [[96, 56], [208, 62]] as const) {
      const g = ctx.createRadialGradient(cx, gy, 2, cx, gy, rx);
      g.addColorStop(0, 'rgba(81,68,109,0.30)');
      g.addColorStop(1, 'rgba(81,68,109,0)');
      ctx.save();
      ctx.translate(0, gy);
      ctx.scale(1, 0.16);
      ctx.translate(0, -gy);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, gy, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const bA = 1 + Math.sin(s * 1.6 + 1) * 0.006;
    const bR = 1 + Math.sin(s * 1.6) * 0.007;
    const hA = 322;
    const hR = 326;
    const rs = sprite('radia', false, 0);
    const wA = (ha.width / ha.height) * hA;
    const wR = (rs.width / rs.height) * hR;
    ctx.drawImage(ha, 212 - wA / 2, gy - hA * bA, wA, hA * bA);
    ctx.drawImage(rs, 92 - wR / 2, gy + 4 - hR * bR, wR, hR * bR);
  };
  const draw = (t: number) => {
    raf = requestAnimationFrame(draw);
    if (t - last < 50) return; // ~20 images/s suffisent
    last = t;
    const s = t / 1000;
    if (art.a) { drawArt(s, art.a); return; }
    // clé présente : on attend un instant l'illustration plutôt que d'afficher le dessin de secours
    if (waitingPhotos && performance.now() - born < 2500) return;
    if (s > blinkR) blinkR = s + 2.5 + Math.random() * 3;
    if (s > blinkA) blinkA = s + 3 + Math.random() * 3;
    const br = blinkR - s < 0.13;
    const ba = blinkA - s < 0.13;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const hh = 600 * 0.52;
    const ww = 240 * 0.52;
    // Auguste (à droite, un peu derrière), respiration
    const bA = 1 + Math.sin(s * 1.6 + 1) * 0.008;
    ctx.drawImage(sprite('auguste', ba, 0), 214 - ww / 2, H - hh * bA, ww, hh * bA);
    // Radia (à gauche, devant) : léger balancement entre 5 poses
    const raw = Math.sin(s * 0.9) * 0.35;
    const step = STEPS.reduce((best, v) => (Math.abs(v - raw) < Math.abs(best - raw) ? v : best), 0);
    const bR = 1 + Math.sin(s * 1.6) * 0.01;
    ctx.drawImage(sprite('radia', br, step), 88 - ww / 2, H - hh * bR, ww, hh * bR);
  };
  raf = requestAnimationFrame(draw);
  return { el: cv, stop: () => cancelAnimationFrame(raf) };
}

export function showTitle(): void {
  setBackdrop('title');
  setDim(0);
  const art = titleArt();
  const btn = (label: string, cls: string, fn: () => void, delay: number, extra?: Node) => {
    const b = h(`button.btn.enter${cls}`, { style: `animation-delay:${delay}ms` }, extra ?? null, label);
    b.addEventListener('click', tap(fn));
    return b;
  };
  const progress = hasProgress();
  const menu = h('div.title-menu');
  // Deux grands modes bien visibles : l'histoire en chapitres, et « Mon monde ».
  const mode = (cls: string, ic: string, title: string, sub: string, fn: () => void, delay: number) => {
    const b = h(`button.btn.enter.mode${cls}`, { style: `animation-delay:${delay}ms` },
      h('span.mode-ic', icon(ic, 30)), h('span.mode-tx', h('b', title), h('small', sub)));
    b.addEventListener('click', tap(fn));
    return b;
  };
  // Le mode chapitres ouvre la carte des niveaux : on voit tout de suite où on en est.
  const nextLevel = LEVELS.find((l) => !save.data.levels[l.id]?.done);
  const chapSub = !progress ? 'Fusionne et découvre l\'histoire' : nextLevel ? `Niveau ${nextLevel.id} · Chapitre ${nextLevel.chapter} · ${LEVELS.filter((l) => save.data.levels[l.id]?.done).length}/${LEVELS.length} faits` : 'Tous les niveaux · mode infini';
  // Après les cinq chapitres : « MODE LIBRE » (l'Endless 2.0), définitivement ; les chapitres restent accessibles (« Mes chapitres »).
  startDomain();
  const justUnlocked = syncFreeMode(save.data);
  if (justUnlocked) save.save();
  const lab = modeButtonLabel(save.data, chapSub);
  menu.append(mode(lab.free ? '.free' : '', lab.free ? 'infinity' : 'heart', lab.title, lab.sub, () => void go(() => (lab.free ? endless() : progress ? openMap() : story())), 100));
  const monde = mode('.gold', 'home', 'MON MONDE', 'Château · dressing · jardin · famille', () => void go(async () => { const d = await import('./world/hub'); await d.openWorldHub(); showTitle(); }), 160);
  // bulle de notification : le salaire est prêt, elle peut venir le récupérer
  const bubble = h('span.mode-bubble', icon('star', 14), ' Salaire prêt !');
  monde.append(bubble);
  const refreshBubble = () => { bubble.classList.toggle('on', salaryInfo(world(), Date.now()).ready); if (!monde.isConnected) window.clearInterval(bubbleTimer); };
  const bubbleTimer = window.setInterval(refreshBubble, 20_000);
  refreshBubble();
  menu.append(monde);
  // CASINO : troisième grand accès (rose = histoire, or = Mon monde, violet royal = Casino). Sous-titre et pastille vivants (tickets, cadeau, missions).
  const casino = mode('.casino', 'casino', 'CASINO', 'Tickets · roulette · surprises', () => void go(async () => { await (await import('../../casino')).openCasino(); showTitle(); }), 220);
  const casinoBubble = h('span.mode-bubble.casino-bubble', icon('sparkle', 14), h('span', ' '));
  casino.append(casinoBubble);
  void import('../../casino/store').then((m) => {
    const refresh = () => {
      if (!casino.isConnected) { off(); return; }
      const st = m.casinoStatus();
      const small = casino.querySelector('small');
      if (small) small.textContent = st.isNew ? 'Un cadeau de bienvenue t’attend ♡' : st.chips > 0 ? `${fmt(st.chips)} tickets · roulette · surprises` : 'Tickets · roulette · surprises';
      const note = st.isNew ? 'Bienvenue !' : st.claimable > 0 ? `${st.claimable} à récupérer` : st.refillReady ? 'Recharge offerte !' : st.tasks > 0 ? 'Défis du jour' : '';
      (casinoBubble.lastElementChild as HTMLElement).textContent = ` ${note}`;
      casinoBubble.classList.toggle('on', !!note && st.hasNews);
    };
    const off = m.onCasinoChange(refresh);
    refresh();
  }).catch(() => undefined);
  menu.append(casino);
  // accès secondaires : Échecs, Souvenirs, et Succès en PETITE icône discrète (le trophée n'a pas besoin d'un grand bouton)
  const chessBtn = btn('ÉCHECS', '.lavande', () => void go(chess), 260, chessUnlocked() ? icon('chess', 20) : h('span.lock', icon('lock', 18)));
  if (!chessUnlocked()) chessBtn.classList.add('locked');
  const trophy = btn('', '.secondary.trophy', () => void go(achievements), 340, icon('trophy', 22));
  trophy.setAttribute('aria-label', 'Succès'); trophy.title = 'Succès';
  menu.append(h('div.row', chessBtn, btn('SOUVENIRS', '.secondary', () => void go(() => openAlbum('memories').then(showTitle)), 300, icon('album', 20)), trophy));
  const installBtn = installButton();
  if (installBtn) menu.append(installBtn);
  if (lab.free) menu.append(btn('MES CHAPITRES', '.secondary', () => void go(() => openMap()), 380, icon('heart', 20)));

  // barre du haut : réglages · énergie / diamants · carte d'Auguste
  const gems = h('button.res-chip', { 'aria-label': 'Diamants' }, h('img', { src: diamondUrl(52), alt: '' }), h('span', fmt(wallet.diamonds())), h('span.plus', '+'));
  gems.addEventListener('click', tap(() => void openShop('diamonds').then(() => { (gems.children[1] as HTMLElement).textContent = fmt(wallet.diamonds()); })));
  const nrg = h('button.res-chip', { 'aria-label': 'Énergie' }, h('img', { src: energyUrl(52), alt: '' }), h('span', fmt(wallet.energy())));
  nrg.addEventListener('click', tap(() => void openEnergyPanel(false)));
  attachResourceInfo(gems, 'diamonds'); attachResourceInfo(nrg, 'energy');
  const offEco = events.on('economy', () => { (gems.children[1] as HTMLElement).textContent = fmt(wallet.diamonds()); (nrg.children[1] as HTMLElement).textContent = fmt(wallet.energy()); });
  const topBar = h('div.title-top',
    h('div.title-left', h('button.icon-btn', { 'aria-label': 'Paramètres', on: { click: tap(() => void openSettings()) } }, icon('settings')), phoneButton(), dailyBadge()),
    h('div.res-row', nrg, gems),
    shopButton());

  const scr = h('div.title-screen',
    topBar,
    h('div', h('div.title-logo', 'RADIA ', h('span.heart', '♡')), h('div.title-sub', GIFT.app.subtitle)),
    h('div.title-art', art.el),
    menu);
  ui.showScreen(scr);
  setBarkSink((text) => ui.bubble(text, window.innerWidth * 0.5, window.innerHeight * 0.45, 3000));
  if (shouldAnnounceFree(save.data)) {
    // jamais par-dessus une autre fenêtre (Nouveautés, cadeau du jour…) : on attend qu'elle soit fermée
    let tries = 0;
    const attempt = () => {
      if (!scr.isConnected || tries++ > 40) return;
      if (document.querySelector('.modal-backdrop:not(.leaving), .dy-back')) { window.setTimeout(attempt, 1200); return; }
      void announceFree();
    };
    window.setTimeout(attempt, 900);
  }
  art.el.addEventListener('click', () => { audio.unlock(); audio.playMusic(); stat('augusteTaps'); bark('tapAuguste', true); checkAchievements(); });

  async function go(fn: () => Promise<void> | void) {
    audio.unlock();
    audio.playMusic();
    art.stop();
    offEco();
    setBarkSink(null);
    await fn();
  }
}

/** Annonce élégante, une seule fois : « L'aventure continue ♡ ». Rien n'est réinitialisé. */
async function announceFree(): Promise<void> {
  if (!shouldAnnounceFree(save.data)) return;
  markFreeAnnounced(save.data);
  save.save();
  const body = h('div.free-note', h('p', 'Les cinq chapitres sont derrière nous… mais pas notre histoire.'), h('p', 'Le MODE LIBRE t\'attend : fusionne sans fin, livre des commandes et fais grandir ton domaine, lieu après lieu. Tout ce que tu as gagné reste à toi.'));
  const v = await ui.modal({ title: 'L\'aventure continue ♡', body, actions: [{ label: 'Découvrir le domaine', value: 'map', style: 'gold' }, { label: 'Plus tard', value: 'later', style: 'secondary' }] });
  if (v === 'map') {
    const m = await import('../../domain');
    ui.closeScreen();
    await m.openDomainMap();
    showTitle();
  }
}

async function story(): Promise<void> {
  ui.closeScreen();
  await runStory();
  showTitle();
}

async function endless(): Promise<void> {
  ui.closeScreen();
  await playLevel(ENDLESS_DEF, 'endless');
  showTitle();
}

async function chess(): Promise<void> {
  if (!chessUnlocked()) {
    ui.toast({ title: 'Le royaume est encore fermé', sub: 'Termine le chapitre 4 pour débloquer les échecs ♛', icon: 'lock' });
    showTitle();
    return;
  }
  const c = await import('../../game/chess/index');
  setBackdrop('royaume');
  await c.openChess();
  showTitle();
}

function achievements(): void {
  const got = save.data.achievements;
  const n = ACHIEVEMENTS.filter((a) => got[a.id]).length;
  const list = h('div.screen-body',
    h('p.center.muted', { style: 'margin:0 0 10px' }, `${n}/${ACHIEVEMENTS.length} succès`),
    ...ACHIEVEMENTS.map((a) => h(`div.ach${got[a.id] ? '' : '.locked'}`,
      h('span.ic', icon(got[a.id] ? a.icon : 'lock', 22)),
      h('div', h('b', a.name), h('small', a.desc)))));
  ui.showScreen(h('div.bg-soft', ui.header('Succès', showTitle), list));
}

/** Carte des chapitres et niveaux (rejouer, reprendre, mode infini, mini-jeux). */
export function openMap(): void {
  const step = save.data.story.step;
  const curLevel = STORY.slice(step).find((s) => s.t === 'level');
  const currentId = curLevel && curLevel.t === 'level' ? curLevel.id : -1;
  setBackdrop(themeForChapter(chapterAt(Math.min(step, STORY.length - 1))));
  const body = h('div.screen-body');
  if (!storyFinished()) {
    const b = h('button.btn.wide', { style: 'margin-bottom:14px' }, icon('play', 20), currentId > 0 ? `Continuer l'histoire · niveau ${currentId}` : 'Continuer l\'histoire');
    b.addEventListener('click', tap(() => void story()));
    body.append(b);
  } else {
    // en mode libre, l'entrée « Mode infini » est le grand bouton MODE LIBRE de l'écran titre : pas de doublon ici
    const b = h('button.btn.wide.gold', { style: 'margin-bottom:10px' }, icon('infinity', 20), `Mode infini · record ${save.data.endless.best}`);
    b.addEventListener('click', tap(() => void endless()));
    const e = h('button.btn.wide.secondary', { style: 'margin-bottom:14px' }, icon('heart', 20), 'Revoir la fin');
    e.addEventListener('click', tap(async () => { const f = await import('../../game/narrative/finale'); ui.closeScreen(); await f.runFinale(true); openMap(); }));
    if (isFreeModeUnlocked(save.data)) body.append(e); else body.append(b, e);
  }
  for (const ch of CHAPTERS) {
    const levels = LEVELS.filter((l) => l.chapter === ch.n);
    const grid = h('div.map-levels');
    for (const l of levels) {
      const rec = save.data.levels[l.id];
      const isCur = l.id === currentId && !storyFinished();
      const cls = rec?.done ? '' : isCur ? '.current' : '.locked';
      const b = h(`button.lvl${cls}`, { 'aria-label': `Niveau ${l.id}` }, String(l.id), h('span.st', rec?.done ? '★'.repeat(rec.stars) + '☆'.repeat(3 - rec.stars) : ''));
      b.addEventListener('click', tap(async () => {
        if (isCur) { await story(); return; }
        if (!rec?.done) { ui.toast({ title: 'Pas encore…', sub: 'Avance dans l\'histoire pour débloquer ce niveau', icon: 'lock' }); return; }
        ui.closeScreen();
        await playLevel(l, 'story', { replay: true });
        openMap();
      }));
      grid.append(b);
    }
    body.append(h('div.map-chapter', h('header', h('b', `${ch.n}. ${ch.title}`), h('small', ch.subtitle)), grid));
  }
  // mini-jeux terminés : rejouables
  const done = (['puzzle', 'billard', 'chemin'] as const).filter((id) => save.data.minigames[id]?.done);
  if (done.length) {
    const names = { puzzle: 'Les souvenirs mélangés', billard: 'Le billard des cœurs', chemin: 'Le chemin des deux cœurs' };
    body.append(h('div.map-chapter', h('header', h('b', 'Mini-jeux')),
      h('div.col', ...done.map((id) => {
        const b = h('button.btn.secondary.wide', names[id]);
        b.addEventListener('click', tap(async () => { const m = await import('../../game/minigames/index'); ui.closeScreen(); await m.runMinigame(id); openMap(); }));
        return b;
      }))));
  }
  ui.showScreen(h('div.bg-soft', ui.header('Jouer', showTitle), body));
}
