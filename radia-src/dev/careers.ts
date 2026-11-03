/**
 * Page de prévisualisation du module « carrières ».
 *   ?m=icons      icônes des 4 carrières
 *   ?m=mags       planche des 5 couvertures
 *   ?m=decors     décors de jeu
 *   ?m=career|fans|photo|model|actress|singer   écrans réels (sauvegarde amorcée, ?seed=…)
 */
import '@fontsource/fredoka/latin-400.css';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import '@fontsource/dancing-script/latin-700.css';
import '../src/ui/styles/base.css';
import '../src/ui/styles/game.css';
import { paint } from '../src/game/art/kit';
import { drawMagazine, drawCareerIcon, drawPhotoDecor, drawRunway, drawConcertStage } from '../src/game/art/world/careers';
import { CAREER_IDS, MAGAZINE_IDS } from '../src/data/world/ids';
import { save } from '../src/core/app';
import { defaultWorld } from '../src/save/schema';

const out = document.getElementById('out')!;
const q = new URLSearchParams(location.search);
const mode = q.get('m') ?? 'icons';
const row = () => { const d = document.createElement('div'); d.className = 'row'; out.append(d); return d; };
await document.fonts.load('700 20px Fredoka');
await document.fonts.load('700 20px "Dancing Script"');

/** Amorce la sauvegarde (v3) selon ?seed=fresh|mid|rich. */
export function seedSave(kind: string): void {
  const w = defaultWorld();
  const d = save.data;
  if (kind === 'mid' || kind === 'rich') {
    w.careers.current = 'photo';
    w.careers.progress = { photo: { level: 2, xp: 190, best: 84 }, model: { level: 1, xp: 80, best: 71 }, singer: { level: 3, xp: 400, best: 88 } };
    w.fans = 640; w.fansTierSeen = 1; w.magazines = ['radia-mag', 'radia-show'];
    w.res.coins = 900; w.res.fabric = 30;
    w.wardrobe.owned.push('top-blouse-silk', 'jk-blazer-cream', 'sh-heels', 'dr-flowy-floral', 'dr-royal-gown', 'cr-gold', 'ac-pearls', 'bot-trousers-chic', 'dr-stage-sequin', 'cr-flowers', 'ac-hoops');
  }
  if (kind === 'rich') {
    w.fans = 98_000; w.fansTierSeen = 3;
    w.careers.progress = { photo: { level: 5, xp: 900, best: 99 }, model: { level: 3, xp: 400, best: 90 }, actress: { level: 3, xp: 400, best: 92 }, singer: { level: 4, xp: 600, best: 95 } };
    w.magazines = ['radia-mag', 'queen-paris', 'radia-show', 'radia-fashion'];
  }
  if (kind === 'near') {
    // une séance suffit pour passer le palier 1 de Modèle photo ET franchir 100 fans (et débloquer RADIA Magazine)
    w.careers.current = 'photo';
    w.careers.progress = { photo: { level: 0, xp: 30, best: 60 } };
    w.extra['career.photo.p.s60'] = 2;
    w.fans = 96; w.fansTierSeen = 0;
  }
  d.world = w;
  d.economy.diamonds = 60;
}

if (mode === 'icons') {
  for (const sz of [160, 96, 48]) { const r = row(); for (const id of CAREER_IDS) r.append(paint(sz, sz, 2, (c) => drawCareerIcon(c, id, sz))); }
} else if (mode === 'mags') {
  const r = row();
  for (const id of MAGAZINE_IDS) { const cv = document.createElement('canvas'); cv.width = 600; cv.height = 800; cv.style.width = '300px'; cv.style.height = '400px'; drawMagazine(cv.getContext('2d')!, id, 600, 800); r.append(cv); }
} else if (mode === 'decors') {
  const r = row();
  for (const id of ['garden', 'city', 'stage', 'palace']) r.append(paint(240, 320, 1, (c) => drawPhotoDecor(c, id, 240, 320, 0.4)));
  r.append(paint(240, 320, 1, (c) => drawRunway(c, 240, 320, 0.7)), paint(240, 320, 1, (c) => drawConcertStage(c, 240, 320, 0.7, 0.5)));
} else {
  seedSave(q.get('seed') ?? 'mid');
  document.getElementById('app')!.style.display = 'block';
  document.documentElement.classList.add('app');
  const root = document.getElementById('app')!;
  root.style.cssText = 'position:fixed;inset:0';
  const { openCareer } = await import('../src/ui/screens/world/career');
  const { openFans } = await import('../src/ui/screens/world/fans');
  (window as unknown as Record<string, unknown>).__open = { openCareer, openFans };
  if (mode === 'career') void openCareer();
  else if (mode === 'fans') void openFans();
}
(window as unknown as { done: boolean }).done = true;
