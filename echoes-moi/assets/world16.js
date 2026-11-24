// Echoes of Aether (Max version) — carte de surface dessinée à la main, façon RPG 16 bits.
//
// Trois villages reliés par des routes bordées de forêt, avec des rebords qu'on ne franchit
// qu'en sautant vers le bas (raccourcis de retour) et un donjon par route :
//
//   Village d'Aelor ─ Route 1 (Prairies, Bois de la Lisière) ─ Cité d'Orée
//        │              └ Cercle de l'Antre : l'Antre oublié
//   Cité d'Orée ─ Route 2 (Forêt mystérieuse) ─ pont du ravin ─ Hameau des Ruines
//                   └ Pied des Cimes : le Sanctuaire des Cimes
//   Hameau des Ruines ─ nord : Bosquet corrompu (Nid des Ombres)
//                     └ sud  : Ruines anciennes (Temple Fracturé)
//
// Tout est en cases de 32 unités (96 × 71 pour la surface). La carte est construite par des
// formes simples (rectangles, ellipses, tracés) plutôt que par du bruit : chaque passage est voulu.
// buildOverworld() rend les mêmes données que l'ancien générateur pour la surface, plus
// `ledge` (rebords), `kind` (sol par case), `town` (cases de village) et les positions des
// rencontres, portails, entrées de donjon et objectifs de quête.

export const W = 96;
export const H = 71; // lignes 0..70 ; à partir de 71 : salles de donjon
export const KINDS = ['prairie', 'foret', 'givre', 'ruines', 'ombre', 'cite'];

// codes de case
const FOREST = 0,
  GRASS = 1,
  TALL = 2,
  PATH = 3,
  STONE = 4,
  WATER = 5,
  LEDGE = 6,
  ROCK = 7;

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296);
}
const hash = (x, y, k = 0) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453;
  return n - Math.floor(n);
};
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax,
    dy = by - ay,
    t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function lineDist(px, py, pts) {
  let d = 1e9;
  for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, segDist(px, py, ...pts[i], ...pts[i + 1]));
  return d;
}

// ---------------------------------------------------------------- plan
// Zones nommées (affichées en entrant) : la première qui contient la case l'emporte.
export const ZONES = [
  { name: `Village d'Aelor`, x0: 38, y0: 44, x1: 59, y1: 66, kind: 'prairie', tint: 16765040, lvl: `1+` },
  { name: `Cité d'Orée`, x0: 1, y0: 1, x1: 31, y1: 22, kind: 'cite', tint: 16751312, lvl: `—` },
  { name: `Hameau des Ruines`, x0: 74, y0: 26, x1: 95, y1: 47, kind: 'ruines', tint: 14205088, lvl: `—` },
  { name: `Cercle de l'Antre`, x0: 26, y0: 20, x1: 47, y1: 28, kind: 'ruines', tint: 10465535, lvl: `3+` },
  { name: `Pied des Cimes`, x0: 53, y0: 0, x1: 66, y1: 11, kind: 'givre', tint: 10465535, lvl: `5+` },
  { name: `Route 2 · Forêt mystérieuse`, x0: 31, y0: 0, x1: 66, y1: 20, kind: 'foret', tint: 5234848, lvl: `2+` },
  { name: `Route 2 · Forêt mystérieuse`, x0: 55, y0: 20, x1: 67, y1: 40, kind: 'foret', tint: 5234848, lvl: `2+` },
  { name: `Bois de la Lisière`, x0: 1, y0: 22, x1: 19, y1: 47, kind: 'foret', tint: 5234848, lvl: `1+` },
  { name: `Bosquet corrompu`, x0: 74, y0: 0, x1: 96, y1: 26, kind: 'ombre', tint: 13660384, lvl: `3+` },
  { name: `Ruines anciennes`, x0: 74, y0: 47, x1: 96, y1: 71, kind: 'ruines', tint: 14205088, lvl: `2+` },
  { name: `Route 1 · Prairies d'Aelor`, x0: 0, y0: 0, x1: 96, y1: 72, kind: 'prairie', tint: 13627072, lvl: `1+` },
];
export const DEFAULT_ZONE = `Route 1 · Prairies d'Aelor`;
export const zoneAt = (x, y) => ZONES.find((z) => x >= z.x0 && x < z.x1 && y >= z.y0 && y < z.y1) ?? ZONES[ZONES.length - 1];

// Rivière (nord → sud), entre la route 2 et le hameau
const RIVER = [
  [69, -1],
  [68.5, 8],
  [70, 18],
  [69.5, 26],
  [68.5, 34.5],
  [69.5, 44],
  [71, 54],
  [72, 62],
  [73, 72],
];

// Entrées de donjon, portails, rencontres, objectifs : lus par game.js
export const DUNGEONS = {
  bergerie: { x: 36, y: 21 }, // l'Antre oublié, au fond du Cercle de l'Antre (route 1)
  cimes: { x: 60, y: 3 }, // Sanctuaire des Cimes, au pied des montagnes (route 2)
  temple: { x: 86, y: 52 }, // Temple Fracturé, dans les Ruines anciennes
  nid: { x: 88, y: 6 }, // Nid des Ombres, au fond du Bosquet corrompu
};
export const PORTALS = {
  // portail d'Aelor : pas de portail visible au village, mais on peut toujours y revenir par les autres
  aelor: { x: 48, y: 56, name: `Village d'Aelor`, region: `Village d'Aelor`, hidden: true },
  cite: { x: 16, y: 8, name: `Zaap de la Cité d'Orée`, region: `Cité marchande d'Orée` },
  foret: { x: 41, y: 9, name: `Portail de la Forêt`, region: `Route 2 · Forêt mystérieuse` },
  sanctuaire: { x: 56, y: 8, name: `Portail des Cimes`, region: `Pied des Cimes` },
  ruines: { x: 85, y: 34, name: `Portail du Hameau`, region: `Hameau des Ruines` },
  bosquet: { x: 80, y: 15, name: `Portail du Bosquet`, region: `Bosquet corrompu` },
};
export const ENCOUNTERS = {
  // route 1
  m1: [44, 39],
  m2: [52, 41],
  m3: [9, 44],
  m4: [36, 35],
  m5: [9, 41],
  m6: [26, 35],
  f1: [12, 30], // le slaad furieux (quête 3), au Bois de la Lisière
  // route 2
  f2: [39, 6],
  f3: [50, 15],
  f4: [36, 13],
  g1: [59, 22], // gardiens des cristaux du ravin
  g2: [61, 28],
  g3: [58, 33],
  // est
  r1: [80, 57],
  r2: [90, 62],
  c1: [80, 13],
  c2: [89, 10],
};
export const QUESTS = { q1: [46, 39], q3: [12, 30] };
export const CRYSTALS = [
  [57, 24],
  [62, 27],
  [57, 31],
];
export const BARRICADES = [
  [14, 45],
  [8, 31],
  [40, 16],
];
export const BRIDGE_SIGN = [63, 32];

// ---------------------------------------------------------------- construction
export function buildOverworld() {
  const cell = new Uint8Array(W * H); // FOREST partout au départ
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? FOREST : cell[y * W + x]);
  const set = (x, y, v) => x >= 1 && y >= 1 && x < W - 1 && y < H - 1 && (cell[y * W + x] = v);
  const rect = (x0, y0, x1, y1, v = GRASS) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, v);
  };
  const ellipse = (cx, cy, rx, ry, v = GRASS, wob = 0.04) => {
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++)
      for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        const k = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
        if (k < 1 + (hash(x, y, 3) - 0.5) * wob * 2) set(x, y, v);
      }
  };
  const band = (pts, r, v = GRASS, only) => {
    let x0 = 1e9,
      y0 = 1e9,
      x1 = -1e9,
      y1 = -1e9;
    for (const [x, y] of pts) ((x0 = Math.min(x0, x)), (y0 = Math.min(y0, y)), (x1 = Math.max(x1, x)), (y1 = Math.max(y1, y)));
    for (let y = Math.floor(y0 - r - 1); y <= y1 + r + 1; y++)
      for (let x = Math.floor(x0 - r - 1); x <= x1 + r + 1; x++)
        if (lineDist(x + 0.5, y + 0.5, pts) < r && (!only || only(at(x, y)))) set(x, y, v);
  };
  // hautes herbes en carrés nets, comme dans les RPG 16 bits
  const tallPatch = (cx, cy, rx, ry) => rect(Math.round(cx - rx), Math.round(cy - ry), Math.round(cx + rx) - 1, Math.round(cy + ry) - 1, TALL);
  const onlyOpen = (c) => c === GRASS || c === TALL;

  // --- Village d'Aelor : quatre maisons et la route 1 au nord, rien d'autre
  rect(39, 48, 57, 64);
  rect(46, 44, 50, 47); // sortie nord vers la route 1
  // --- Route 1 : couloir nord, voie basse, voie haute, Bois de la Lisière
  rect(40, 35, 54, 43); // couloir nord (depuis Aelor)
  rect(19, 34, 54, 37); // voie basse
  rect(19, 29, 54, 32); // voie haute
  rect(45, 33, 54, 33); // passage entre les deux voies (à l'est)
  tallPatch(44, 40, 3.2, 2.2);
  tallPatch(52, 40, 2.2, 2.6);
  tallPatch(30, 36, 5, 1.6);
  tallPatch(22, 36, 3, 1.4);
  tallPatch(40, 30, 3.5, 1.3);
  rect(4, 23, 17, 46); // Bois de la Lisière
  rect(17, 29, 19, 32); // jonction voie haute ↔ bois
  rect(5, 34, 11, 36, FOREST); // bosquets qui font serpenter le bois
  rect(11, 40, 17, 42, FOREST);
  rect(4, 27, 6, 28, FOREST);
  tallPatch(13, 27, 3, 1.6);
  tallPatch(8, 44, 3.5, 1.5);
  tallPatch(14, 37, 2.5, 1.5);
  // Cercle de l'Antre (accès par une porte depuis la voie haute)
  rect(28, 21, 44, 27);
  // --- Cité d'Orée (nord-ouest)
  rect(3, 2, 30, 20);
  rect(11, 21, 18, 22); // porte sud
  rect(31, 9, 32, 14); // porte est
  // --- Route 2 : Forêt mystérieuse
  band(
    [
      [31, 11.5],
      [37, 12],
      [40, 7],
      [46, 5],
      [52, 7],
      [55, 12],
      [59, 15],
    ],
    3.3,
  );
  ellipse(45, 15.5, 6.5, 2.6); // clairière aux hautes herbes
  ellipse(60, 6, 5.5, 4.2); // pied des Cimes
  band(
    [
      [59, 14],
      [60.5, 20],
      [58, 25],
      [60, 30],
      [61, 34],
    ],
    3.2,
  );
  rect(57, 32, 66, 37); // abords du pont
  tallPatch(45, 16, 4.5, 1.6);
  tallPatch(38, 13, 2.2, 1.6);
  tallPatch(60, 26, 2, 2.4);
  // --- Est : hameau, bosquet, ruines
  rect(64, 33, 76, 36); // le pont et ses deux rives
  rect(77, 28, 93, 45); // Hameau des Ruines
  rect(83, 22, 87, 27); // vers le nord
  rect(83, 46, 87, 49); // vers le sud
  rect(71, 38, 76, 42); // quai du port, au bord de la rivière
  ellipse(84, 14, 9.5, 9.5); // Bosquet corrompu
  ellipse(90, 6, 4.5, 4);
  ellipse(85, 58, 9.5, 9.5); // Ruines anciennes
  tallPatch(80, 18, 3, 2);
  tallPatch(89, 61, 3, 2);

  // --- Rivière et lac
  const water = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const r = 2.1 + (hash(x, y, 9) - 0.5) * 0.35;
      if (lineDist(x + 0.5, y + 0.5, RIVER) < r) water[y * W + x] = 1;
    }
  // la rivière déborde un peu sur les abords du pont et le quai : on garde la forêt ailleurs
  for (let i = 0; i < W * H; i++) water[i] && (cell[i] = WATER);

  // --- Rebords (on saute vers le bas, on ne remonte pas)
  const ledges = [];
  const ledge = (x0, x1, y) => {
    for (let x = x0; x <= x1; x++) (set(x, y, LEDGE), ledges.push([x, y]));
  };
  ledge(19, 44, 33); // voie haute → voie basse

  // --- Chemins de terre et places de pierre
  const paths = [
    [
      [48.5, 64],
      [48.5, 44],
      [48, 40],
      [47, 36],
      [47, 31],
      [36, 31],
      [24, 30.5],
      [16, 31],
      [12, 28],
      [14, 24],
      [14.5, 21],
      [15, 16],
    ],
    [
      [42.5, 53.5],
      [54.5, 53.5],
    ],
    [
      [42.5, 61.5],
      [54.5, 61.5],
    ],
    [
      [78, 40.5],
      [72, 40.5],
    ],
    [
      [36, 30],
      [36, 23],
    ],
    [
      [30, 11.5],
      [20, 11.5],
    ],
    [
      [32, 11.5],
      [37, 12],
      [40, 8],
      [46, 6],
      [52, 7.5],
      [55, 12],
      [59, 15],
      [60.5, 20],
      [58.5, 25],
      [60, 30],
      [62, 34.5],
      [64, 34.5],
    ],
    [
      [55.5, 10],
      [59, 7],
      [60, 5],
    ],
    [
      [74, 34.5],
      [80, 34.5],
      [85, 36],
      [85, 26],
      [84, 18],
      [86, 10],
      [88, 8],
    ],
    [
      [85, 36],
      [85, 47],
      [85, 54],
      [86, 53],
    ],
  ];
  const pathM = new Uint8Array(W * H);
  for (const p of paths) {
    let x0 = 1e9,
      y0 = 1e9,
      x1 = -1e9,
      y1 = -1e9;
    for (const [x, y] of p) ((x0 = Math.min(x0, x)), (y0 = Math.min(y0, y)), (x1 = Math.max(x1, x)), (y1 = Math.max(y1, y)));
    for (let y = Math.max(0, Math.floor(y0 - 2)); y <= Math.min(H - 1, y1 + 2); y++)
      for (let x = Math.max(0, Math.floor(x0 - 2)); x <= Math.min(W - 1, x1 + 2); x++)
        if (lineDist(x + 0.5, y + 0.5, p) < 0.75) pathM[y * W + x] = 1;
  }
  const stoneM = new Uint8Array(W * H);
  const plaza = (cx, cy, r) => {
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++)
      for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++)
        if (x >= 0 && y >= 0 && x < W && y < H && Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < r + (hash(x, y, 6) - 0.5) * 0.8)
          stoneM[y * W + x] = 1;
  };
  plaza(16.5, 12, 5.6); // grand-place d'Orée
  for (let x = 4; x <= 29; x++) for (const y of [11, 12]) stoneM[y * W + x] = 1; // rue d'Orée
  for (let y = 3; y <= 20; y++) for (const x of [15, 16, 17]) stoneM[y * W + x] = 1;
  plaza(85.5, 36.5, 4.2); // place du hameau
  plaza(36.5, 24.5, 3); // parvis de l'Antre
  plaza(60.5, 5.5, 2.6); // parvis des Cimes
  plaza(86, 55, 3.4); // parvis du temple

  // --- Sol par case (zones) et cases de village
  const kind = new Uint8Array(W * H),
    town = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const z = zoneAt(x, y);
      kind[y * W + x] = KINDS.indexOf(z.kind);
      if (/^(Village|Cité|Hameau)/.test(z.name)) town[y * W + x] = 1;
    }

  // --- Sommets (calques du terrain à coins)
  const VW = W + 1,
    VH = 72;
  const verts = { dark: new Uint8Array(VW * VH), path: new Uint8Array(VW * VH), stone: new Uint8Array(VW * VH), water: new Uint8Array(VW * VH) };
  for (let vy = 0; vy < VH; vy++)
    for (let vx = 0; vx < VW; vx++) {
      if (vy >= 71) continue;
      const around = [
        [vx - 1, vy - 1],
        [vx, vy - 1],
        [vx - 1, vy],
        [vx, vy],
      ];
      const cnt = (f) => around.reduce((s, [x, y]) => s + (f(x, y) ? 1 : 0), 0);
      const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
      const v = vy * VW + vx;
      // eau : sommet couvert si les 4 cases sont de l'eau (bords de la carte : eau prolongée)
      verts.water[v] = cnt((x, y) => (inb(x, y) ? water[y * W + x] : inb(Math.min(W - 1, Math.max(0, x)), Math.min(H - 1, Math.max(0, y))) && water[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))])) === 4 ? 1 : 0;
      verts.dark[v] = 0; // la forêt est dessinée par le jeu (rangées d'arbres), pas de sol sombre
      verts.path[v] = !verts.water[v] && cnt((x, y) => inb(x, y) && pathM[y * W + x] && !water[y * W + x]) >= 2 ? 1 : 0;
      verts.stone[v] = !verts.water[v] && cnt((x, y) => inb(x, y) && stoneM[y * W + x] && !water[y * W + x]) >= 2 ? 1 : 0;
    }
  const vcount = (layer, x, y) => layer[y * VW + x] + layer[y * VW + x + 1] + layer[(y + 1) * VW + x] + layer[(y + 1) * VW + x + 1];

  // --- Cases bloquées
  const blocked = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const c = cell[y * W + x];
      if (c === FOREST || c === ROCK || c === LEDGE || water[y * W + x] || x === 0 || y === 0 || x === W - 1 || y === H - 1)
        blocked[y * W + x] = 1;
    }
  const ledgeM = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) cell[y * W + x] === LEDGE && (ledgeM[y * W + x] = 1);

  // --- Objets
  const objs = [];
  const used = new Uint8Array(W * H); // cases déjà décorées / à garder libres
  const keep = (x, y, r = 0) => {
    for (let j = y - r; j <= y + r; j++) for (let i = x - r; i <= x + r; i++) i >= 0 && j >= 0 && i < W && j < H && (used[j * W + i] = 1);
  };
  const put = (key, x, y, block, extra = {}) => {
    objs.push({ key, x: x * 32 + 16, y: (y + 1) * 32, block, ...extra });
    if (block)
      for (const [a, b, c, d] of block)
        for (let j = y + b; j <= y + d; j++) for (let i = x + a; i <= x + c; i++) i >= 0 && j >= 0 && i < W && j < H && (blocked[j * W + i] = 1);
    keep(x, y);
  };
  const one = [[0, 0, 0, 0]];

  // Maisons du pack (4 × 3 cases) : (gauche, bas) de l'emprise, porte sur la 2e case du bas
  const house = (k, L, B) => {
    objs.push({ key: k, x: (L + 2) * 32, y: (B + 1) * 32, block: [[0, -2, 3, 0]] });
    for (let j = B - 2; j <= B; j++) for (let i = L; i <= L + 3; i++) (blocked[j * W + i] = 1), (used[j * W + i] = 1);
    keep(L + 1, B + 1, 0);
  };
  const flowers = (x0, y0, x1, y1, k = `flowers`) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) objs.push({ key: k, x: x * 32 + 16, y: (y + 1) * 32 - 2, flat: true }), keep(x, y);
  };
  const sign = (x, y) => put(`n_sign`, x, y, one);

  // Aelor : quatre maisons, des parterres, un panneau
  house(`n_house_a`, 41, 52);
  house(`n_house_c`, 52, 52);
  house(`n_house_b`, 41, 60);
  house(`n_house_d`, 52, 60);
  flowers(39, 50, 39, 52);
  flowers(57, 50, 57, 52, `n_flower2`);
  flowers(39, 58, 39, 60, `n_flower2`);
  flowers(57, 58, 57, 60);
  sign(51, 46);
  keep(48, 57, 2);

  // Cité d'Orée : la place du marché
  for (const L of [4, 9, 20, 25]) house(L % 2 ? `n_house_b` : `n_house_a`, L, 5);
  for (const L of [4, 9, 20, 25]) house(L % 2 ? `n_house_d` : `n_house_c`, L, 19);
  for (const [x, y] of [
    [11, 9],
    [21, 9],
    [11, 15],
    [21, 15],
  ])
    (put(`stall`, x, y, [[-1, 0, 1, 0]]), keep(x, y + 1, 1));
  (put(`fountain`, 16, 13, [[-1, -1, 1, 0]]), keep(16, 13, 2));
  flowers(3, 9, 3, 10);
  flowers(3, 13, 3, 14, `n_flower2`);
  sign(19, 22);

  // Cercle de l'Antre : pierres levées autour de l'entrée
  for (const [x, y] of [
    [29, 22],
    [29, 26],
    [32, 21],
    [40, 21],
    [43, 22],
    [43, 26],
    [31, 27],
    [41, 27],
  ])
    put(`standing_stone`, x, y, one);
  keep(36, 21, 2);
  keep(36, 26, 2);

  // Pied des Cimes : rochers et cristaux
  for (const [k, x, y] of [
    [`rock_big`, 55, 4],
    [`rock_big`, 64, 7],
    [`rock_big`, 57, 9],
    [`crystal_blue`, 63, 3],
    [`crystal_blue`, 56, 6],
    [`rock_small`, 62, 9],
    [`pillar`, 58, 3],
    [`pillar`, 62, 3],
  ])
    put(k, x, y, one);
  keep(60, 3, 2);

  // Hameau des Ruines : quatre maisons dans les ruines
  house(`n_house_c`, 78, 31);
  house(`n_house_a`, 89, 31);
  house(`n_house_d`, 78, 44);
  house(`n_house_b`, 89, 44);
  put(`arch`, 76, 35, [
    [-1, 0, -1, 0],
    [1, 0, 1, 0],
  ]);
  keep(76, 34, 1);
  for (const [k, x, y] of [
    [`pillar`, 82, 35],
    [`pillar`, 89, 35],
    [`pillar`, 82, 39],
    [`pillar`, 89, 39],
    [`ruin_wall`, 80, 38],
    [`ruin_wall`, 93, 38],
  ])
    put(k, x, y, k === `ruin_wall` ? [[-1, 0, 0, 0]] : one);
  sign(88, 27);
  sign(88, 47);
  keep(85, 36, 2);

  // Bosquet corrompu et Ruines anciennes
  for (const [x, y] of [
    [77, 9],
    [84, 6],
    [92, 14],
    [78, 19],
    [89, 18],
    [93, 4],
  ])
    put(`crystal_purple`, x, y, one);
  for (const [k, x, y] of [
    [`pillar`, 82, 53],
    [`pillar`, 90, 53],
    [`ruin_wall`, 79, 60],
    [`ruin_wall`, 92, 58],
    [`pillar`, 81, 64],
    [`pillar`, 91, 65],
    [`crystal_blue`, 78, 55],
    [`crystal_blue`, 93, 62],
    [`arch`, 85, 48],
  ])
    put(k, x, y, k === `arch` ? [[-1, 0, -1, 0], [1, 0, 1, 0]] : k === `ruin_wall` ? [[-1, 0, 0, 0]] : one);
  keep(86, 52, 2);

  // Rebords
  for (const [x, y] of ledges) objs.push({ key: `ledge`, x: x * 32 + 16, y: (y + 1) * 32, ledge: true });
  for (const [x, y] of ledges) keep(x, y);

  // Points d'intérêt gardés libres
  for (const p of Object.values(PORTALS)) keep(p.x, p.y, 2);
  for (const p of Object.values(DUNGEONS)) keep(p.x, p.y, 2);
  for (const [x, y] of Object.values(ENCOUNTERS)) keep(x, y, 2);
  for (const [x, y] of CRYSTALS) keep(x, y, 1);
  keep(...BRIDGE_SIGN, 1);

  // Forêt : le jeu la dessine en rangées d'arbres régulières (cases `forest`)
  const forest = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) forest[i] = cell[i] === FOREST && !water[i] ? 1 : 0;

  // Hautes herbes : une tuile pleine par case
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (cell[i] === TALL && !blocked[i] && !used[i]) objs.push({ key: `tallgrass_tile`, x: x * 32 + 16, y: (y + 1) * 32 });
    }

  // --- Pont du ravin (route 2 → hameau), à reconstruire
  const bridges = [],
    bridgeCells = [];
  for (const y of [34, 35])
    for (let x = 62; x <= 76; x++)
      if (vcount(verts.water, x, y) > 0) (bridges.push({ x, y, horiz: true }), bridgeCells.push([x, y]), (blocked[y * W + x] = 0));
  const bridgeBlock = { x: 64, y: 34, cells: bridgeCells };

  // --- Porte de l'Antre (s'ouvre avec la quête 4)
  const gate = { x: 36, y: 28, cells: [] };
  for (let x = 34; x <= 38; x++) (gate.cells.push([x, 28]), (blocked[28 * W + x] = 0), (cell[28 * W + x] = GRASS));

  // --- Coffres, herbe de lune
  const chests = [
    { id: `ch1`, x: 5, y: 31, tier: 2, gold: 35, items: [`potion`, `petit_boots_common`] },
    { id: `ch2`, x: 35, y: 9, tier: 2, gold: 60, items: [`@weapon_r`] },
    { id: `ch3`, x: 79, y: 63, tier: 2, gold: 70, items: [`belier_ring_rare`] },
    { id: `ch4`, x: 92, y: 8, tier: 3, gold: 120, items: [`mystique_boots_legendary`, `potion`] },
    { id: `ch5`, x: 5, y: 45, tier: 1, gold: 25, items: [`potion`, `petit_ring_common`] },
    { id: `ch6`, x: 20, y: 36, tier: 1, gold: 40, items: [`petit_cape_common`] },
  ];
  for (const c of chests) blocked[c.y * W + c.x] = 1;
  const herb = { x: 6, y: 24 };

  // --- PNJ
  const npcs = [
    { id: `elder`, kind: `elder`, x: 44, y: 54, name: `Ancienne Mira` },
    { id: `villager`, kind: `villager`, x: 55, y: 54, name: `Lina` },
    { id: `tuto_bouger`, kind: `villager`, x: 44, y: 62, name: `Tom` },
    { id: `tuto_sorts`, kind: `villager`, x: 55, y: 62, name: `Iris` },
    { id: `bazar`, kind: `merchant`, x: 11, y: 10, name: `Zélie du Bazar` },
    { id: `odon`, kind: `merchant`, x: 21, y: 10, name: `Maître Odon, grand marchand` },
    { id: `maelys`, kind: `villager`, x: 11, y: 16, name: `Maëlys la forgeronne` },
    { id: `gedeon`, kind: `villager`, x: 21, y: 16, name: `Gédéon l'herboriste` },
    { id: `heraut`, kind: `villager`, x: 19, y: 13, name: `Héraut de la Cité` },
    { id: `poisson`, kind: `merchant`, x: 25, y: 16, name: `Ondin le poissonnier` },
    { id: `garde_route1`, kind: `guard`, x: 18, y: 22, name: `Garde de la porte sud` },
    { id: `hameau`, kind: `elder`, x: 84, y: 38, name: `Doyen Aubrac` },
    { id: `archeo`, kind: `villager`, x: 91, y: 40, name: `Sélène l'archéologue` },
  ];

  // --- Port de Garance : ponton sur la rivière, à l'ouest du Hameau des Ruines
  const harbor = { dx: 70, dy: 40, bx: 68, by: 40 };
  {
    let n = 70;
    for (let x = 78; x >= 60; x--)
      if (vcount(verts.water, x, 40) >= 2) {
        n = x;
        break;
      }
    // ponton (4 planches) de n-1 à n+2 : deux au-dessus de l'eau, deux sur la rive ; bateau à n-2
    harbor.dx = n - 1;
    harbor.bx = n - 2;
    for (let x = n - 1; x <= n + 2; x++) blocked[40 * W + x] = 0;
    for (let y = 38; y <= 42; y++) for (let x = n + 1; x <= 76; x++) water[y * W + x] || (blocked[y * W + x] = 0);
    npcs.push({ id: `port`, kind: `merchant`, x: n + 3, y: 38, name: `Maître de Port Garance` });
  }
  for (const p of npcs) blocked[p.y * W + p.x] = 1;

  const landmarks = [];

  return {
    cell,
    kind,
    town,
    verts,
    blocked,
    ledge: ledgeM,
    objs,
    bridges,
    bridgeBlock,
    gate,
    chests,
    herb,
    npcs,
    harbor,
    landmarks,
    decks: [],
    spawn: { x: 1552, y: 1840 },
    forest,
    zones: ZONES.map(({ name, x0, y0, x1, y1 }) => ({ name, x0, y0, x1, y1 })),
  };
}

// Aperçu texte (débogage) : node -e "import('./world16.js').then(m=>console.log(m.ascii()))"
export function ascii() {
  const m = buildOverworld();
  const ch = ['T', '.', ',', '=', 's', '~', 'L', '^'];
  let s = '';
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      s += m.verts.water[y * 97 + x] && m.cell[i] === 5 ? '~' : m.blocked[i] && m.cell[i] !== 0 ? '#' : ch[m.cell[i]];
    }
    s += '\n';
  }
  return s;
}

// Carte construite une seule fois et partagée (le jeu la lit à plusieurs endroits).
let cached = null;
export const world16 = () => (cached ??= buildOverworld());
