/**
 * PLANCHE DE VALIDATION VISUELLE (`?planche`) : Radia et Auguste côte à côte, construits avec les VRAIS composants du jeu
 * (aucune illustration indépendante). Tout est affiché à la même échelle, avec des repères horizontaux du gabarit
 * (menton, épaules, taille, hanches, pieds) pour comparer d'un coup d'œil : taille des têtes, épaules, bras, mains,
 * raccords des cheveux, intégration des accessoires.
 * Les canevas sont exposés dans `window.__board` pour les tests visuels automatiques.
 */
import { h } from '../dom';
import './board.css';
import { DEFAULT_LOOK, type Look } from '../../data/world/ids';
import { avatarCanvas, drawAvatar } from '../../game/art/world/avatar';
import { RIG } from '../../game/art/world/rig';
import { warmAuguste, paintedImageFor, drawPainted } from '../../game/art/world/radiaNow';
import { augusteSprite } from '../../apps/art';

export interface BoardTile { section: string; label: string; canvas: HTMLCanvasElement; look?: Look }
declare global { interface Window { __board?: { tiles: BoardTile[]; W: number; H: number; perfMs: number } } }

const W = 112, H = 280;
const base = (o: Partial<Look> = {}): Look => ({ ...DEFAULT_LOOK, hair: 'hair-wavy', crown: null, acc: [], ...o });
const dpr = (): number => Math.min(3, Math.max(1, Math.round(window.devicePixelRatio || 2)));

/** Repères du gabarit, en unités d'avatar (y). */
const GUIDES: { y: number; name: string }[] = [
  { y: RIG.head.chinY, name: 'menton' }, { y: RIG.shoulder.y, name: 'épaules' }, { y: RIG.waist.y, name: 'taille' }, { y: RIG.hip.y, name: 'hanches' }, { y: RIG.feet.y, name: 'pieds' },
];

function section(): { name: string; items: [string, Look][] }[] {
  const red = base({ top: null, bottom: 'bot-track-red', jacket: 'jk-track-red' });
  return [
    { name: 'Couronnes — même coiffure, même tenue', items: [['Sans couronne', base()], ['Couronne dorée', base({ crown: 'cr-gold' })], ['Couronne de fleurs', base({ crown: 'cr-flowers' })], ['Diadème', base({ crown: 'cr-tiara' })]] },
    { name: 'Coiffures', items: [['Lâchés', base({ hair: 'hair-loose' })], ['Ondulés', base()], ['Queue', base({ hair: 'hair-ponytail' })], ['Chignon', base({ hair: 'hair-bun' })], ['Mi-longs', base({ hair: 'hair-half' })], ['Raie nette', base({ hair: 'hair-sleek-part' })], ['Moyens', base({ hair: 'hair-medium' })], ['Carré', base({ hair: 'hair-bob' })], ['Tresse', base({ hair: 'hair-braid' })], ['Bouclés', base({ hair: 'hair-curly' })], ['Macarons', base({ hair: 'hair-space-buns' })], ['Queue haute', base({ hair: 'hair-high-pony' })]] },
    { name: 'Tenues (mêmes proportions de base)', items: [['Noire illustrée', base()], ['Survêtement rouge', red], ['Casual', base({ top: 'top-tee-white', bottom: 'bot-jeans', bag: null })], ['Robe élégante', base({ top: null, bottom: null, dress: 'dr-satin-champagne', shoes: 'sh-heels', bag: null })], ['Soirée', base({ top: null, bottom: null, dress: 'dr-redcarpet', shoes: 'sh-heels', bag: null, acc: ['ac-pearls'] })], ['Manteau', base({ jacket: 'jk-trench-beige' })], ['Chignon + survêt.', { ...red, hair: 'hair-bun' }], ['Couronne + robe', base({ top: null, bottom: null, dress: 'dr-pink-satin', shoes: 'sh-heels', bag: null, crown: 'cr-gold' })]] },
    { name: 'Accessoires du visage', items: [['Lunettes aviateur', base({ acc: ['gl-aviator'] })], ['Lunettes œil de chat', base({ acc: ['gl-cat-eye'] })], ['Lunettes de soleil', base({ acc: ['ac-sunglasses'] })], ['Créoles', base({ acc: ['ac-hoops'] })], ['Boucles pendantes', base({ acc: ['ea-drop-gold'] })], ['Bandana', base({ acc: ['hd-bandana-pink'] })], ['Béret', base({ acc: ['hd-beret'] })], ['Nœud', base({ acc: ['hd-bow-pink'] })], ['Serre-tête', base({ acc: ['hd-headband-velvet'] })], ['Collier de perles', base({ acc: ['ac-pearls'] })]] },
  ];
}

function tile(label: string, draw: (w: number, h: number) => HTMLCanvasElement, guides: HTMLElement[]): HTMLElement {
  const d = dpr();
  const c = draw(Math.round(W * d), Math.round(H * d));
  c.style.width = `${W}px`; c.style.height = `${H}px`;
  const lines = GUIDES.map((g) => h('i.bd-guide', { style: `top:${((g.y / 600) * H).toFixed(1)}px`, title: g.name }));
  guides.push(...lines);
  return h('figure.bd-tile', h('div.bd-box', c, ...lines), h('figcaption', label));
}

/** Temps moyen (ms) d'un dessin d'avatar NON mis en cache (look différent à chaque fois), à la taille d'un iPhone (≈ 224 × 560 px). */
function measurePerf(n = 36): number {
  const hairs = ['hair-loose', 'hair-wavy', 'hair-bun', 'hair-ponytail', 'hair-bob', 'hair-braid'] as const;
  const outs: Partial<Look>[] = [{}, { top: 'top-tee-white', bottom: 'bot-jeans' }, { top: null, bottom: null, dress: 'dr-pink-satin' }, { jacket: 'jk-trench-beige' }, { top: null, bottom: 'bot-track-red', jacket: 'jk-track-red' }, { top: null, bottom: null, dress: 'dr-redcarpet' }];
  const c = document.createElement('canvas'); c.width = 224; c.height = 560; const g = c.getContext('2d')!;
  const t0 = performance.now();
  for (let i = 0; i < n; i++) { g.clearRect(0, 0, 224, 560); if (i % 6 === 5) g.getImageData(0, 0, 1, 1); drawAvatar(g, base({ ...outs[i % outs.length], hair: hairs[i % hairs.length], crown: i % 3 === 0 ? 'cr-gold' : null }), 224, 560, { expr: 'smile' }); }
  g.getImageData(0, 0, 1, 1); // force le vrai rendu (le navigateur le diffère tant qu'aucun pixel n'est lu)
  return (performance.now() - t0) / n;
}

/** Ouvre la planche (plein écran). Les images peintes sont attendues avant de dessiner. */
export async function openBoard(): Promise<void> {
  await warmAuguste();
  const tiles: BoardTile[] = [];
  const guides: HTMLElement[] = [];
  // les rendus sont mis en cache par le jeu (même canevas pour un même look) : chaque case en reçoit une COPIE, sinon le navigateur déplace le canevas d'une case à l'autre
  const mk = (sec: string, label: string, src: HTMLCanvasElement, look?: Look) => {
    const canvas = document.createElement('canvas'); canvas.width = src.width; canvas.height = src.height; canvas.getContext('2d')!.drawImage(src, 0, 0);
    tiles.push({ section: sec, label, canvas, look }); return canvas;
  };
  const ref = base();
  const painted = paintedImageFor(ref);
  const secs: HTMLElement[] = [];
  // référence : Auguste, Radia peinte (tenue illustrée), Radia dessinée avec la même tenue
  const paintedCanvas = (w: number, hh: number): HTMLCanvasElement => { const c = document.createElement('canvas'); c.width = w; c.height = hh; if (painted) drawPainted(c.getContext('2d')!, painted, w, hh); return mk('Référence', 'Radia peinte', c); };
  secs.push(h('section.bd-sec', h('h2', 'Référence : Auguste · Radia peinte · Radia dessinée (même tenue)'), h('div.bd-row',
    tile('Auguste', (w, hh) => mk('Référence', 'Auguste', augusteSprite(w, hh)), guides),
    tile(painted ? 'Radia peinte' : 'Radia peinte (indisponible sans le lien secret)', paintedCanvas, guides),
    tile('Radia dessinée + tête peinte', (w, hh) => mk('Référence', 'Radia dessinée', avatarCanvas(ref, w, hh, { expr: 'smile' }), ref), guides))));
  for (const s of section()) {
    secs.push(h('section.bd-sec', h('h2', s.name), h('div.bd-row',
      tile('Auguste (réf.)', (w, hh) => mk(s.name, 'Auguste', augusteSprite(w, hh)), guides),
      ...s.items.map(([label, look]) => tile(label, (w, hh) => mk(s.name, label, avatarCanvas(look, w, hh, { expr: 'smile' }), look), guides)))));
  }
  let on = true;
  const tog = h('button.btn.small', { on: { click: () => { on = !on; root.classList.toggle('noguides', !on); tog.textContent = on ? 'Masquer les repères' : 'Afficher les repères'; } } }, 'Masquer les repères');
  const close = h('button.btn.small.secondary', { on: { click: () => { root.remove(); delete window.__board; } } }, 'Fermer');
  const root = h('div.bd-root', h('header', h('b', 'Planche de validation ♡'), h('small', 'Vrais composants du jeu · même échelle · repères : menton, épaules, taille, hanches, pieds'), h('div.bd-act', tog, close)), ...secs);
  document.body.append(root);
  const perfMs = measurePerf();
  window.__board = { tiles, W, H, perfMs };
  root.querySelector('header small')!.append(` · dessin d'un avatar : ${perfMs.toFixed(1)} ms`);
}
