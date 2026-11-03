// Vérifie par simulation (même physique que le jeu) que le but de la tour est atteignable.
// Usage : node tools/grimpe-check.js [--ascii]   (lit js/grimpe-data.js)
const C = require("../js/grimpe-core.js");

function settle(L, p, inp) {
  for (let i = 0; i < 900; i++) {
    C.step(L, p, inp, 1 / 60);
    if (p.won) return true;
    if (p.ground && Math.abs(p.vx) < 1 && p.stun <= 0) return false;
  }
  return false;
}
function check(L, opts) {
  opts = opts || {};
  const charges = opts.charges || [0.06, 0.12, 0.2, 0.28, 0.36, 0.44, 0.52, 0.6, 0.68, 0.76, 0.84, 0.92, 1];
  const seen = new Map(), queue = [];
  const key = (x, y) => Math.round(x / 4) + "," + Math.round(y);
  function add(x, y, from) { const k = key(x, y); if (!seen.has(k)) { seen.set(k, { x, y, from }); queue.push({ x, y }); } }
  const p0 = C.newPlayer(L); add(p0.x, p0.y, null);
  let best = p0.y, won = false, qi = 0;
  while (qi < queue.length && !won) {
    const s = queue[qi++];
    if (s.y < best) best = s.y;
    // marche
    for (const d of [-1, 1]) {
      const p = C.newPlayer(L); p.x = s.x; p.y = s.y;
      for (let i = 0; i < 200; i++) {
        C.step(L, p, { dir: d, jump: false }, 1 / 60);
        if (!p.ground) break;
        if (i % 6 === 0) add(p.x, p.y, s);
      }
    }
    // sauts
    for (const d of [-1, 0, 1]) for (const c of charges) {
      const p = C.newPlayer(L); p.x = s.x; p.y = s.y; p.charge = c * C.P.chargeMax;
      if (settle(L, p, { dir: d, jump: false })) { won = true; break; }
      if (p.ground) add(p.x, p.y, s);
    }
  }
  return { won, best, states: seen.size };
}
module.exports = { check };
if (require.main === module) {
  global.window = {}; require("../js/grimpe-data.js");
  const data = global.window.GRIMPE_LEVEL; const L = C.createLevel(data);
  const t = Date.now(), r = check(L);
  console.log(r.won ? "OK : le but est atteignable" : "ÉCHEC : hauteur max " + Math.round((L.startY - r.best) / 16) + " tuiles", "(" + r.states + " positions, " + (Date.now() - t) + " ms)");
  if (process.argv.includes("--ascii")) console.log(data.rows.join("\n"));
  process.exit(r.won ? 0 : 1);
}
