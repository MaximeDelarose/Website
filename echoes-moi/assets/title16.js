// Echoes of Aether (Max version) — écran titre « prairie », en 16 px par case.
//
// Tout l'écran est construit en « pixels de jeu » (art px) puis agrandi d'un même facteur entier
// (pixelScale) : décor, personnages, texte et boutons partagent exactement la même grille de pixels.
//   preloadTitle16(scene, base)  charge les images (tuiles et décor Pixel Crawler, héros 16×32)
//   pixelScale(scene)            facteur d'agrandissement entier pour cet écran
//   new Meadow(scene, parent, S) prairie de fond (herbe, clairière, mare, arbres, buissons, fleurs)
//   pixelText(...) / pixelButton(...)  texte et boutons nets sur la grille
//
// Décor et corps des héros : Pixel Crawler (Anokolisa), voir pc/Terms-Anokolisa.txt.

import { render } from './pixelfont.js';

const T = 16;
export const HERO_KEYS = ['augh', 'aka', 'gorak', 'nyra', 'ralya'];
const FRAMES_PER_ROW = 8; // planches héros : 8 images de 64×64 par ligne (voir pc/heroes/*.txt)

export function preloadTitle16(scene, base = 'assets/') {
  const L = scene.load;
  const img = (k, f) => scene.textures.exists(k) || L.image(k, `${base}pc/${f}`);
  img('pc_floors', 'floors.png');
  img('pc_water', 'water.png');
  img('pc_veg', 'vegetation.png');
  img('pc_trees_a', 'trees_a.png');
  img('pc_trees_b', 'trees_b.png');
  img('pc_rocks', 'rocks.png');
  for (const h of HERO_KEYS)
    scene.textures.exists('pch_' + h) || L.spritesheet('pch_' + h, `${base}pc/heroes/${h}.png`, { frameWidth: 64, frameHeight: 64 });
}

// Animation de repos (face) d'un héros 16×32
export function heroIdleAnim(scene, hero) {
  const h = HERO_KEYS.includes(hero) ? hero : 'augh';
  const key = `pch_${h}_idle_down`;
  if (!scene.anims.exists(key))
    scene.anims.create({ key, frames: scene.anims.generateFrameNumbers('pch_' + h, { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
  return { key, texture: 'pch_' + h };
}

export function pixelScale(scene) {
  return Math.max(2, Math.round(scene.scale.height / 200));
}

// --- générateur pseudo-aléatoire stable (même prairie à chaque fois) ---
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Rectangles [x, y, w, h] dans les planches Pixel Crawler
const R = {
  grass: [[16, 160], [32, 160], [48, 160]],
  dirt: [[176, 160], [192, 160], [208, 160]],
  water: [[16, 96], [32, 96], [48, 96]],
  ringClearing: [0, 0], // anneau d'herbe 5×5 tuiles (trou = clairière)
  ringPond: [0, 80], // variante pour la mare
  bushes: [[2, 5, 29, 27], [198, 6, 35, 33], [2, 99, 43, 43]],
  flowers: [53, 69, 86, 100, 117, 133].flatMap((x) => [373, 389, 405, 421].map((y) => [x, y, 8, 8])),
  tufts: [[6, 150, 5, 8], [21, 150, 8, 6], [36, 149, 10, 9], [51, 150, 9, 6], [5, 165, 7, 9], [21, 164, 7, 10], [67, 164, 11, 8]],
  ferns: [[80, 147, 31, 25], [112, 166, 32, 26]],
  mushrooms: [[20, 288, 9, 16], [36, 288, 11, 14], [3, 290, 9, 11]],
  treesA: [[0, 0, 52, 96], [52, 0, 52, 96], [0, 96, 52, 96], [52, 96, 52, 96]],
  pines: [[4, 4, 37, 76], [52, 4, 37, 76], [4, 84, 37, 76], [52, 84, 37, 76]],
  rocks: [[35, 19, 26, 27], [65, 19, 14, 11], [48, 51, 15, 10]],
};
// Croix 5×5 (les 4 coins de l'anneau sont vides)
const CROSS = (i, j) => !((i === 0 || i === 4) && (j === 0 || j === 4));

export class Meadow {
  /** Prairie de fond : une image (canevas en art px) agrandie ×S, + props animés éventuels. */
  constructor(scene, parent, S, opts = {}) {
    this.scene = scene;
    this.S = S;
    const W = (this.W = Math.ceil(scene.scale.width / S) + 1);
    const H = (this.H = Math.ceil(scene.scale.height / S) + 1);
    const key = '__title_meadow';
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const tex = scene.textures.createCanvas(key, W, H);
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = false;
    const src = (k) => scene.textures.get(k).getSourceImage();
    const floors = src('pc_floors'), water = src('pc_water'), veg = src('pc_veg');
    const rnd = rng(opts.seed ?? 20261124);
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const tile = (img, [sx, sy], x, y) => ctx.drawImage(img, sx, sy, T, T, x, y, T, T);
    const part = (img, [sx, sy, w, h], x, y) => ctx.drawImage(img, sx, sy, w, h, Math.round(x), Math.round(y), w, h);

    // herbe partout
    for (let y = 0; y < H; y += T) for (let x = 0; x < W; x += T) tile(floors, pick(R.grass), x, y);

    // clairière de terre (où se tient le héros) et mare : matière de base en croix + anneau d'herbe
    const cell = (v) => Math.round(v / T) * T;
    this.clearing = { x: cell(opts.heroX ?? W * 0.68) - 2.5 * T, y: cell(opts.heroY ?? H * 0.56) - 2.5 * T };
    this.pond = { x: cell(W * 0.5) - 2.5 * T, y: cell(H - 5.5 * T) };
    const patch = (at, base, ring) => {
      for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) if (CROSS(i, j)) tile(base.img, pick(base.tiles), at.x + i * T, at.y + j * T);
      ctx.drawImage(floors, ring[0], ring[1], 5 * T, 5 * T, at.x, at.y, 5 * T, 5 * T);
    };
    patch(this.clearing, { img: floors, tiles: R.dirt }, R.ringClearing);
    patch(this.pond, { img: water, tiles: R.water }, R.ringPond);

    // petit décor au sol (hors clairière / mare / colonne des boutons)
    const free = (x, y, m = 6) =>
      !(x > this.clearing.x - m && x < this.clearing.x + 5 * T + m && y > this.clearing.y - m && y < this.clearing.y + 5 * T + m) &&
      !(x > this.pond.x - m && x < this.pond.x + 5 * T + m && y > this.pond.y - m && y < this.pond.y + 5 * T + m);
    for (let n = 0; n < (W * H) / 2200; n++) {
      const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H);
      if (free(x, y) && !(opts.menuW && x < opts.menuW)) part(veg, pick(rnd() < 0.35 ? R.tufts : R.flowers), x, y);
    }

    // éléments debout, triés par leur pied (y) : arbres en lisière haute et à droite, buissons, rochers
    const items = [];
    const add = (img, r, x, y) => items.push({ img, r, x, y });
    const ta = src('pc_trees_a'), tb = src('pc_trees_b'), rocks = src('pc_rocks');
    // lisière d'arbres en haut, à droite de la colonne du menu (feuillages entiers visibles)
    for (let x = (opts.menuW ?? 0) + 24; x < W + 20; x += 28 + Math.floor(rnd() * 16)) {
      const pine = rnd() < 0.4;
      add(pine ? tb : ta, pick(pine ? R.pines : R.treesA), x, (pine ? 70 : 88) + Math.floor(rnd() * 10) - 40);
    }
    for (let y = 60; y < H + 40; y += 30 + Math.floor(rnd() * 20)) add(rnd() < 0.5 ? tb : ta, pick(rnd() < 0.5 ? R.pines : R.treesA), W - 6 - Math.floor(rnd() * 10), y);
    for (let n = 0; n < 5; n++) {
      const x = Math.floor(W * (0.45 + rnd() * 0.4)), y = Math.floor(H * (0.3 + rnd() * 0.7));
      if (free(x, y, 18)) add(veg, pick(R.bushes), x, y);
    }
    for (let n = 0; n < 3; n++) {
      const x = Math.floor(W * (0.4 + rnd() * 0.5)), y = Math.floor(H * (0.35 + rnd() * 0.6));
      if (free(x, y, 14)) add(rnd() < 0.5 ? rocks : veg, rnd() < 0.5 ? pick(R.rocks) : pick(R.mushrooms), x, y);
    }
    add(veg, R.ferns[0], this.pond.x + 6, this.pond.y + 18);
    add(veg, R.ferns[1], this.pond.x + 66, this.pond.y + 30);
    items.sort((a, b) => a.y - b.y);
    for (const it of items) {
      // ombre douce au pied
      ctx.fillStyle = 'rgba(16,36,10,0.35)';
      ctx.fillRect(Math.round(it.x - it.r[2] * 0.3), Math.round(it.y - 2), Math.round(it.r[2] * 0.6), 3);
      part(it.img, it.r, it.x - it.r[2] / 2, it.y - it.r[3]);
    }
    tex.refresh();
    this.image = scene.add.image(0, 0, key).setOrigin(0).setScale(S);
    parent.add(this.image);
    this.heroAt = { x: this.clearing.x + 2.5 * T, y: this.clearing.y + 3 * T };
  }
  tick() {}
  destroy() {
    this.image?.destroy();
  }
}

// --- texte net sur la grille : police bitmap (pixelfont.js), contour d'1 px, position entière ---
// o : { color, outline (null = sans), scale (1 ou 2), align: left|center|right, valign: top|middle }
let TXT = 0;
export function pixelText(scene, x, y, str, o = {}) {
  const img = scene.add.image(0, 0, '__DEFAULT').setOrigin(0);
  img._px = { x, y, o, str: String(str) };
  drawText(scene, img);
  img.once('destroy', () => scene.textures.exists(img._pxKey) && scene.textures.remove(img._pxKey));
  return img;
}

export function setPixelText(img, str) {
  img._px.str = String(str);
  drawText(img.scene, img);
}

function drawText(scene, img) {
  const { x, y, o, str } = img._px;
  const c = render(str, { color: o.color ?? '#fff6dc', outline: o.outline === undefined ? '#1a1424' : o.outline, scale: o.scale ?? 1 });
  const key = img._pxKey || `__ptxt${++TXT}`;
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, c);
  img._pxKey = key;
  img.setTexture(key);
  const ax = o.align === 'center' ? Math.round(x - c.width / 2) : o.align === 'right' ? Math.round(x - c.width) : Math.round(x);
  const ay = o.valign === 'middle' ? Math.round(y - c.height / 2) : Math.round(y);
  img.setPosition(ax, ay);
}

// --- bouton pixel : panneau bois sombre à bord clair, survol / appui, texte net ---
const PAL = {
  face: 0x2b2238, faceHi: 0x3a3050, edge: 0x0e0b16, light: 0x57586f, gold: 0xf2c43e, goldDark: 0xc4861e,
};

export function pixelButton(scene, x, y, w, h, label, onClick, o = {}) {
  const c = scene.add.container(Math.round(x), Math.round(y));
  const g = scene.add.graphics();
  const draw = (state) => {
    g.clear();
    const face = o.primary ? (state ? 0x3f6f3a : 0x2f5a2f) : state ? PAL.faceHi : PAL.face;
    const rim = o.primary ? PAL.gold : PAL.light;
    g.fillStyle(PAL.edge).fillRect(1, 0, w - 2, h).fillRect(0, 1, w, h - 2); // contour, coins arrondis
    g.fillStyle(rim).fillRect(1, 1, w - 2, h - 2);
    g.fillStyle(face).fillRect(2, 2, w - 4, h - 4);
    g.fillStyle(0x000000, 0.25).fillRect(2, h - 3 - (state === 2 ? 0 : 1), w - 4, 1); // ombre basse
  };
  draw(0);
  c.add(g);
  const lbl = pixelText(scene, w / 2, o.sub ? h / 2 - 6 : h / 2, label, {
    color: o.primary ? '#fff6dc' : '#e8eaf2',
    align: 'center',
    valign: 'middle',
  });
  c.add(lbl);
  if (o.sub) c.add(pixelText(scene, w / 2, h / 2 + 6, o.sub, { color: '#c8e27a', align: 'center', valign: 'middle' }));
  const hit = scene.add.zone(0, 0, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
  hit.on('pointerover', () => draw(1)).on('pointerout', () => draw(0)).on('pointerdown', () => draw(2));
  hit.on('pointerup', () => {
    draw(1);
    onClick && onClick();
  });
  c.add(hit);
  c.w = w;
  c.h = h;
  return c;
}
