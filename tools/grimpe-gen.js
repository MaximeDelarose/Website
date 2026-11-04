// Génère la tour de Grimpe-Chêne : 7 zones (racines → sommet doré), chacune avec son propre
// rythme (largeur des plateformes, écarts, glace, branches, nuages, vent, surplombs).
// Chaque saut est validé par simulation avec une marge de charge, puis la tour entière est
// re-vérifiée par tools/grimpe-check.js (atteignable + durée minimale d'une montée parfaite).
// Usage : node tools/grimpe-gen.js [nbEcrans=48] [dureeMiniSecondes=300]   → écrit js/grimpe-data.js
const fs = require("fs"), C = require("../js/grimpe-core.js"), { check } = require("./grimpe-check.js");
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// a0..a1 : tranche d'altitude (0 = pied de l'arbre, 1 = sommet)
// w : largeur [min,max] · p4/p5 : probabilité d'un étage de 4 / 5 tuiles · gap : écart horizontal max
// ice/branch/cloud : probabilité du type de plateforme · over : surplomb · wind : force (alterne par écran)
const ZONES = [
  { id: "racines",  name: "Les Racines",       a0: 0.00, a1: 0.07, w: [6, 7], p4: 0.0,  p5: 0,    gap: 3, ice: 0,    branch: 0,    cloud: 0,   over: 0,    wind: 0 },
  { id: "tronc",    name: "Le Tronc",          a0: 0.07, a1: 0.24, w: [4, 6], p4: 0.35, p5: 0,    gap: 3, ice: 0,    branch: 0.1,  cloud: 0,   over: 0.45, wind: 0 },
  { id: "canopee",  name: "La Canopée",        a0: 0.24, a1: 0.42, w: [3, 5], p4: 0.5,  p5: 0,    gap: 3, ice: 0,    branch: 0.55, cloud: 0,   over: 0.35, wind: 0 },
  { id: "orage",    name: "Le Nid d'Orage",    a0: 0.42, a1: 0.58, w: [3, 4], p4: 0.6,  p5: 0.05, gap: 3, ice: 0.05, branch: 0.3,  cloud: 0,   over: 0.45, wind: 44 },
  { id: "glace",    name: "Les Cimes Glacées", a0: 0.58, a1: 0.76, w: [4, 8], p4: 0.55, p5: 0.1,  gap: 3, ice: 0.7,  branch: 0,    cloud: 0,   over: 0.5,  wind: 0 },
  { id: "nuages",   name: "La Mer de Nuages",  a0: 0.76, a1: 0.92, w: [3, 4], p4: 0.65, p5: 0.1,  gap: 3, ice: 0.1,  branch: 0,    cloud: 0.8, over: 0.3,  wind: 36 },
  { id: "sommet",   name: "Le Sommet Doré",    a0: 0.92, a1: 1.01, w: [2, 3], p4: 0.7,  p5: 0.2,  gap: 3, ice: 0.25, branch: 0,    cloud: 0.4, over: 0.4,  wind: 52 },
];
function zoneAt(a) { for (const z of ZONES) if (a < z.a1) return z; return ZONES[ZONES.length - 1]; }

function landsOn(g, from, to, wind, opt2) {
  const L = C.createLevel({ rows: g.map(r => r.join("")), wind: wind || {} });
  for (let x = from.c0 * C.TS + 6; x <= (from.c1 + 1) * C.TS - 6; x += 6) for (const d of [-1, 0, 1]) {
    let run = 0;
    for (let ci = 0; ci <= 24; ci++) {
      const p = C.newPlayer(L); p.x = x; p.y = from.row * C.TS; p.charge = Math.max(0.06, ci / 24) * C.P.chargeMax;
      for (let i = 0; i < 400; i++) {
        C.step(L, p, { dir: d, jump: false }, 1 / 60);
        if (p.ground && Math.abs(p.vx) < 1 && p.stun <= 0) break;
      }
      const ok = p.ground && Math.abs(p.y - to.row * C.TS) < 0.5 && p.x > to.c0 * C.TS + 3 && p.x < (to.c1 + 1) * C.TS - 3;
      run = ok ? run + 1 : 0;
      if (run >= (opt2 && opt2.run || 2)) return true;
    }
  }
  return false;
}

function gen(seed, S) {
  const rnd = mulberry32(seed), H = S * C.SROWS, W = C.COLS, pick = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const g = []; for (let y = 0; y < H; y++) { const r = Array(W).fill("."); r[0] = "#"; r[W - 1] = "#"; g.push(r); }
  for (let x = 0; x < W; x++) { g[H - 2][x] = "#"; g[H - 1][x] = "#"; }
  const top = 6, climb = H - 2 - top;
  const altOfRow = row => Math.max(0, Math.min(1, (H - 2 - row) / climb));
  // vent : par écran (0 = écran du haut), signe alterné d'un écran à l'autre
  const wind = {};
  for (let s = 0; s < S; s++) {
    const z = zoneAt(altOfRow(s * C.SROWS + C.SROWS / 2));
    if (z.wind) wind[s] = (s % 2 ? 1 : -1) * z.wind;
  }
  let tries = 0, cur = { row: H - 2, c0: 1, c1: W - 2 };
  while (cur.row - 3 > top) {
    const alt = altOfRow(cur.row), z = zoneAt(alt);
    let dy = 3; const r4 = rnd(); if (r4 < z.p4) dy = 4; if (z.p5 && rnd() < z.p5) dy = 5;
    if (dy === 5 && cur.row - 5 <= top + 3) dy = 4;
    const w = Math.max(2, pick(z.w[0], z.w[1]));
    const gapMax = dy === 5 ? 1 : dy === 4 ? Math.min(2, z.gap) : z.gap, gapMin = (z.id === "racines") ? 1 : (rnd() < 0.5 ? 0 : 1);
    let a = 1, b = w;
    for (let t = 0; t < 60; t++) {
      a = (z.id === "tronc" && rnd() < 0.3) ? (rnd() < 0.5 ? 1 : W - 1 - w) : 2 + Math.floor(rnd() * (W - 4 - w + 1));
      a = Math.max(1, Math.min(W - 1 - w, a)); b = a + w - 1;
      const gap = Math.max(0, a - cur.c1 - 1, cur.c0 - b - 1);
      if (gap >= gapMin && gap <= gapMax) break;
    }
    const row = cur.row - dy;
    const rr = rnd();
    const ice = rr < z.ice, cloud = !ice && rnd() < z.cloud, branch = !ice && !cloud && rnd() < z.branch;
    const ch = cloud || branch ? "=" : ice ? "I" : "#";
    if (ice) { b = Math.min(W - 2, a + pick(5, 8)); a = Math.max(1, Math.min(a, b - 5)); }
    const saved = g[row].slice();
    for (let x = a; x <= b; x++) g[row][x] = ch;
    const nxt = { row, c0: a, c1: b };
    if (!landsOn(g, cur, nxt, wind)) { g[row] = saved; tries++; if (tries > 600) throw new Error("bloqué à l'altitude " + alt.toFixed(2)); continue; }
    // surplomb au-dessus de la plateforme précédente, côté opposé à la suivante (gardé s'il ne casse rien)
    if (alt > 0.05 && rnd() < z.over && cur.row < H - 2) {
      const toRight = (a + b) / 2 > (cur.c0 + cur.c1) / 2, ow = 2 + (rnd() < 0.4 ? 1 : 0) + (z.id === "glace" && rnd() < 0.4 ? 1 : 0), oy = cur.row - 4;
      const x0 = toRight ? cur.c0 : cur.c1 - ow + 1, backup = g[oy].slice();
      for (let x = Math.max(1, x0); x < x0 + ow && x < W - 1; x++) if (g[oy][x] === ".") g[oy][x] = "#";
      if (!landsOn(g, cur, nxt, wind)) g[oy] = backup;
    }
    tries = 0; cur = { row, c0: a, c1: b };
  }
  // plateforme finale et but (on essaie plusieurs hauteurs, largeurs et positions)
  let placed = false;
  for (const dyf of [3, 4, 2]) for (const wf of [6, 8]) for (let fc0 = 1; fc0 <= W - 1 - wf && !placed; fc0++) {
    const fr = Math.max(4, cur.row - dyf), fc1 = fc0 + wf - 1, saved = g[fr].slice();
    for (let x = fc0; x <= fc1; x++) g[fr][x] = "#";
    if (landsOn(g, cur, { row: fr, c0: fc0, c1: fc1 }, wind)) { g[fr - 1][fc0 + (wf >> 1) - 1] = "G"; placed = true; } else g[fr] = saved;
  }
  if (!placed) throw new Error("pas de plateforme finale");
  return { name: "Grimpe-Chêne", seed, screens: S, rows: g.map(r => r.join("")), wind, startX: 10 * C.TS, startY: (H - 2) * C.TS };
}
module.exports = { gen, ZONES, zoneAt };
if (require.main === module) {
  const S = parseInt(process.argv[2], 10) || 48, MIN = parseFloat(process.argv[3]) || 300;
  let bestSeed = null;
  for (let seed = 1; seed < 300; seed++) {
    let data; try { data = gen(seed, S); } catch (e) { console.log("graine", seed, e.message); continue; }
    const L = C.createLevel(data), r = check(L);
    process.stdout.write("graine " + seed + " : " + (r.tooBig ? "trop de positions (glace ?)" : r.won ? "atteignable, montée parfaite " + Math.round(r.minTime) + " s" : "haut " + Math.round((L.startY - r.best) / 16) + "/" + (L.h - 8)) + "\n");
    if (r.won && r.minTime >= MIN) {
      const zones = ZONES.map(z => ({ id: z.id, name: z.name, a0: z.a0, a1: Math.min(1, z.a1) }));
      fs.writeFileSync(__dirname + "/../js/grimpe-data.js", "/* Tour générée par tools/grimpe-gen.js (graine " + seed + "), validée par tools/grimpe-check.js : montée parfaite " + Math.round(r.minTime) + " s */\nwindow.GRIMPE_LEVEL = " +
        JSON.stringify({ name: data.name, seed, zones, wind: data.wind, startX: data.startX, startY: data.startY, rows: data.rows }, null, 1).replace(/\n\s+"([#.=GI]{20})"/g, '\n "$1"') + ";\n");
      console.log("écrit js/grimpe-data.js"); bestSeed = seed; break;
    }
  }
  if (!bestSeed) { console.log("aucune graine ne donne une montée parfaite de " + MIN + " s : augmente le nombre d'écrans"); process.exit(1); }
}
