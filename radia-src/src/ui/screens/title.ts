/**
 * Écran d'accueil + navigation principale (menu, carte des niveaux, succès).
 */
import { h, tap } from '../dom';
import { ui } from '../ui';
import { icon } from '../icons';
import { save, audio } from '../../core/app';
import { checkAchievements, bark, setBarkSink, stat } from '../../core/progress';
import { drawAugusteFull, drawRadiaFull } from '../../game/art/characters';
import { setBackdrop, setDim, themeForChapter } from '../../game/scenes/backdrop';
import { runStory, storyFinished, chessUnlocked } from '../../game/narrative/Story';
import { STORY, CHAPTERS, chapterAt } from '../../data/story';
import { LEVELS } from '../../data/levels';
import { ACHIEVEMENTS } from '../../data/achievements';
import { playLevel } from '../../game/merge/playLevel';
import { ENDLESS_DEF } from '../../game/merge/rules';
import { openAlbum } from './album';
import { openSettings } from './settings';
import { currentOutfit } from '../components/Dialogue';

const hasProgress = () => save.data.story.step > 0 || Object.keys(save.data.levels).length > 0;

/** Illustration animée de l'accueil (respiration, cheveux, clignements). */
function titleArt(): { el: HTMLCanvasElement; stop: () => void } {
  const W = 300;
  const H = 340;
  const scale = Math.min(3, window.devicePixelRatio || 1);
  const cv = document.createElement('canvas');
  cv.width = W * scale;
  cv.height = H * scale;
  cv.style.aspectRatio = `${W} / ${H}`;
  const ctx = cv.getContext('2d')!;
  let raf = 0;
  let last = 0;
  let blinkR = 0;
  let blinkA = 0;
  const outfit = currentOutfit();
  const draw = (t: number) => {
    raf = requestAnimationFrame(draw);
    if (t - last < 50) return; // ~20 images/s suffisent
    last = t;
    const s = t / 1000;
    if (s > blinkR) blinkR = s + 2.5 + Math.random() * 3;
    if (s > blinkA) blinkA = s + 3 + Math.random() * 3;
    const br = blinkR - s < 0.13;
    const ba = blinkA - s < 0.13;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // Auguste (à droite, un peu derrière)
    ctx.save();
    const bA = Math.sin(s * 1.6 + 1) * 0.008;
    ctx.translate(150, H);
    ctx.scale(0.5, 0.5 * (1 + bA));
    ctx.translate(0, -600);
    drawAugusteFull(ctx, { expr: 'smile', blink: ba });
    ctx.restore();
    // Radia (à gauche, devant)
    ctx.save();
    const bR = Math.sin(s * 1.6) * 0.01;
    ctx.translate(30, H);
    ctx.scale(0.52, 0.52 * (1 + bR));
    ctx.translate(0, -600);
    drawRadiaFull(ctx, { expr: 'smile', blink: br, outfit, step: Math.sin(s * 0.9) * 0.35 });
    ctx.restore();
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
  if (progress) {
    const label = storyFinished() ? 'CONTINUER · Mode infini' : 'CONTINUER';
    menu.append(btn(label, '', () => void go(() => (storyFinished() ? endless() : story())), 100));
  }
  menu.append(btn('JOUER', progress ? '.secondary' : '', () => void go(() => (progress ? openMap() : story())), 160));
  const chessBtn = btn('ÉCHECS', '.lavande', () => void go(chess), 220, chessUnlocked() ? icon('chess', 20) : h('span.lock', icon('lock', 18)));
  if (!chessUnlocked()) chessBtn.classList.add('locked');
  menu.append(h('div.row', chessBtn, btn('SOUVENIRS', '.gold', () => void go(() => openAlbum('memories').then(showTitle)), 260, icon('album', 20))));
  menu.append(h('div.row',
    btn('SUCCÈS', '.secondary', () => void go(achievements), 300, icon('trophy', 20)),
    btn('PARAMÈTRES', '.secondary', () => void openSettings(), 340, icon('settings', 20))));

  const scr = h('div.title-screen',
    h('div', h('div.title-logo', 'RADIA ', h('span.heart', '♡')), h('div.title-sub', 'Un petit monde, rien que pour toi.')),
    h('div.title-art', art.el),
    menu);
  ui.showScreen(scr);
  setBarkSink((text) => ui.bubble(text, window.innerWidth * 0.5, window.innerHeight * 0.45, 3000));
  art.el.addEventListener('click', () => { audio.unlock(); audio.playMusic(); stat('augusteTaps'); bark('tapAuguste', true); checkAchievements(); });

  async function go(fn: () => Promise<void> | void) {
    audio.unlock();
    audio.playMusic();
    art.stop();
    setBarkSink(null);
    await fn();
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
    const b = h('button.btn.wide.gold', { style: 'margin-bottom:10px' }, icon('infinity', 20), `Mode infini · record ${save.data.endless.best}`);
    b.addEventListener('click', tap(() => void endless()));
    const e = h('button.btn.wide.secondary', { style: 'margin-bottom:14px' }, icon('heart', 20), 'Revoir la fin');
    e.addEventListener('click', tap(async () => { const f = await import('../../game/narrative/finale'); ui.closeScreen(); await f.runFinale(true); openMap(); }));
    body.append(b, e);
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
