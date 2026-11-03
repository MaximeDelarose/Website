// Génère la tour de Grimpe-Chêne : plateformes en zigzag + obstacles, validée par simulation.
// Usage : node tools/grimpe-gen.js [nbEcrans=11]   → écrit js/grimpe-data.js
const fs = require("fs"), C = require("../js/grimpe-core.js"), { check } = require("./grimpe-check.js");
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function landsOn(g, from, to, wind, opt2) {
  const L = C.createLevel({ rows: g.map(r => r.join("")), wind: wind || {} });
  for (let x = from.c0 * C.TS + 6; x <= (from.c1 + 1) * C.TS - 6; x += 4) for (const d of [-1, 0, 1]) {
    let run = 0;
    for (let ci = 0; ci <= 24; ci++) {
      const p = C.newPlayer(L); p.x = x; p.y = from.row * C.TS; p.charge = Math.max(0.06, ci / 24) * C.P.chargeMax;
      for (let i = 0; i < 400; i++) {
        C.step(L, p, { dir: d, jump: false }, 1 / 60);
        if (p.ground && Math.abs(p.vx) < 1 && p.stun <= 0) break;
      }
      const ok = p.ground && Math.abs(p.y - to.row * C.TS) < 0.5 && p.x > to.c0 * C.TS + 3 && p.x < (to.c1 + 1) * C.TS - 3;
      run = ok ? run + 1 : 0;
      if (run >= (opt2 && opt2.run || 3)) return true;
    }
  }
  return false;
}
function gen(seed, S, opt) {
  opt = opt || {};
  const rnd = mulberry32(seed), H = S * C.SROWS, W = C.COLS;
  const g = []; for (let y = 0; y < H; y++) { const r = Array(W).fill("."); r[0] = "#"; r[W - 1] = "#"; g.push(r); }
  for (let x = 0; x < W; x++) { g[H - 2][x] = "#"; g[H - 1][x] = "#"; }
  const wind = {}; if (opt.wind) for (let s2 = 1; s2 < Math.min(3, S); s2++) wind[s2] = (s2 % 2 ? 1 : -1) * opt.wind;
  let tries = 0; const top = 6; let cur = { row: H - 2, c0: 1, c1: W - 2 }; const plats = [cur];
  const climb = H - 2 - top;
  while (cur.row - 3 > top) {
    const alt = (H - 2 - cur.row) / climb;
    const dy = alt < 0.1 ? 3 : (rnd() < 0.35 + alt * 0.5 ? 4 : 3);
    const w = Math.max(3, Math.round(6 - 3 * alt + (rnd() < 0.3 ? 1 : 0) - (rnd() < 0.2 ? 1 : 0)));
    const gapMax = dy === 4 ? 2 : 3, gapMin = 1;
    let a = 1, b = w;
    for (let t = 0; t < 40; t++) {
      a = 2 + Math.floor(rnd() * (W - 4 - w + 1)); b = a + w - 1;
      const gap = Math.max(0, a - cur.c1 - 1, cur.c0 - b - 1);
      if (gap >= gapMin && gap <= gapMax) break;
    }
    const row = cur.row - dy;
    const ice = alt > 0.3 && rnd() < 0.15 + 0.35 * alt;
    const cloud = !ice && alt > 0.75 && rnd() < 0.5;
    const ch = cloud ? "=" : ice ? "I" : "#";
    const saved = g[row].slice();
    for (let x = a; x <= b; x++) g[row][x] = ch;
    const nxt = { row, c0: a, c1: b };
    if (!landsOn(g, cur, nxt, wind)) { g[row] = saved; tries++; if (tries > 400) throw new Error("bloqué"); continue; }
    // surplomb au-dessus de la plateforme précédente, côté opposé à la suivante (gardé s'il ne casse rien)
    if (alt > 0.2 && rnd() < opt.overhang && cur.row < H - 2) {
      const toRight = (a + b) / 2 > (cur.c0 + cur.c1) / 2, ow = 2 + (rnd() < 0.4 ? 1 : 0), oy = cur.row - 4;
      const x0 = toRight ? cur.c0 : cur.c1 - ow + 1, backup = g[oy].slice();
      for (let x = x0; x < x0 + ow; x++) if (g[oy][x] === ".") g[oy][x] = "#";
      if (!landsOn(g, cur, nxt, wind)) g[oy] = backup;
    }
    tries = 0;
    cur = { row, c0: a, c1: b }; plats.push(cur);
  }
  // plateforme finale et but
  const fr = Math.max(4, cur.row - 3);
  let placed = false;
  for (let fc0 = 2; fc0 <= 12 && !placed; fc0++) {
    const fc1 = fc0 + 5, saved = g[fr].slice();
    for (let x = fc0; x <= fc1; x++) g[fr][x] = "#";
    if (landsOn(g, cur, { row: fr, c0: fc0, c1: fc1 }, wind)) { g[fr - 1][fc0 + 2] = "G"; placed = true; } else g[fr] = saved;
  }
  if (!placed) throw new Error("pas de plateforme finale");
  return { name: "Grimpe-Chêne", seed, screens: S, rows: g.map(r => r.join("")), wind, startX: 10 * C.TS, startY: (H - 2) * C.TS };
}
module.exports = { gen };
if (require.main === module) {
  const S = parseInt(process.argv[2], 10) || 11;
  for (let seed = 1; seed < 400; seed++) {
    let data; try { data = gen(seed, S, { overhang: 0.35, wind: 38 }); } catch (e) { console.log('seed', seed, e.message); continue; }
    const L = C.createLevel(data), r = check(L);
    process.stdout.write("seed " + seed + " : " + (r.won ? "OK" : "haut " + Math.round((L.startY - r.best) / 16) + "/" + (L.h - 8)) + "\n");
    if (r.won) {
      fs.writeFileSync(__dirname + "/../js/grimpe-data.js", "/* Tour générée par tools/grimpe-gen.js (graine " + seed + "), validée par tools/grimpe-check.js */\nwindow.GRIMPE_LEVEL = " + JSON.stringify({ name: data.name, seed, wind: data.wind, startX: data.startX, startY: data.startY, rows: data.rows }, null, 1).replace(/\n\s+"([#.=GI]{20})"/g, '\n "$1"') + ";\n");
      console.log("écrit js/grimpe-data.js"); break;
    }
  }
}
