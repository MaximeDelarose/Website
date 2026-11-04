// Vérifie par simulation (même physique que le jeu) que le but de la tour est atteignable
// et calcule la durée MINIMALE d'une montée parfaite (Dijkstra sur les positions d'arrêt).
// Usage : node tools/grimpe-check.js [--ascii] [--min-time=secondes]   (lit js/grimpe-data.js)
const C = require("../js/grimpe-core.js");

const CHARGES = [0.06, 0.12, 0.2, 0.28, 0.36, 0.44, 0.52, 0.6, 0.68, 0.76, 0.84, 0.92, 1];

// laisse retomber le joueur : renvoie { won, frames } et laisse p posé (ou perdu)
function settle(L, p, inp) {
  for (let i = 0; i < 900; i++) {
    C.step(L, p, inp, 1 / 60);
    if (p.won) return { won: true, frames: i + 1 };
    if (p.ground && Math.abs(p.vx) < 1 && p.stun <= 0) return { won: false, frames: i + 1 };
  }
  return { won: false, frames: 900 };
}

// tas binaire minimal (priorité = coût)
function Heap() { this.a = []; }
Heap.prototype.push = function (c, v) {
  const a = this.a; a.push([c, v]); let i = a.length - 1;
  while (i > 0) { const j = (i - 1) >> 1; if (a[j][0] <= a[i][0]) break; [a[i], a[j]] = [a[j], a[i]]; i = j; }
};
Heap.prototype.pop = function () {
  const a = this.a, top = a[0], last = a.pop();
  if (a.length) {
    a[0] = last; let i = 0;
    for (;;) {
      let l = 2 * i + 1, r = l + 1, m = i;
      if (l < a.length && a[l][0] < a[m][0]) m = l;
      if (r < a.length && a[r][0] < a[m][0]) m = r;
      if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m;
    }
  }
  return top;
};
Heap.prototype.size = function () { return this.a.length; };

// Dijkstra : coût = secondes (charge + vol, ou marche). Se termine dès que le but est atteint.
function check(L, opts) {
  opts = opts || {};
  const charges = opts.charges || CHARGES;
  const dist = new Map(), heap = new Heap();
  const key = (x, y) => Math.round(x / 4) + "," + Math.round(y);
  let best = L.startY, won = false, wonTime = Infinity;
  function add(x, y, t) { const k = key(x, y), d = dist.get(k); if (d === undefined || t < d) { dist.set(k, t); heap.push(t, { x, y, t, k }); } }
  add(C.newPlayer(L).x, C.newPlayer(L).y, 0);
  while (heap.size()) {
    const [t, s] = heap.pop();
    if (t > dist.get(s.k)) continue;
    if (won && t >= wonTime) break;
    if (dist.size > (opts.maxStates || 150000)) return { won: false, best, states: dist.size, minTime: null, tooBig: true };
    if (s.y < best) best = s.y;
    for (const d of [-1, 1]) {                                  // marche
      const p = C.newPlayer(L); p.x = s.x; p.y = s.y;
      for (let i = 0; i < 200; i++) {
        C.step(L, p, { dir: d, jump: false }, 1 / 60);
        if (!p.ground) break;
        if (i % 6 === 0) add(p.x, p.y, t + (i + 1) / 60);
      }
    }
    for (const d of [-1, 0, 1]) for (const c of charges) {      // sauts
      const p = C.newPlayer(L); p.x = s.x; p.y = s.y; p.charge = c * C.P.chargeMax;
      const r = settle(L, p, { dir: d, jump: false });
      const cost = t + c * C.P.chargeMax + r.frames / 60 + 0.1;  // + 0.1 s pour viser
      if (r.won) { won = true; if (cost < wonTime) wonTime = cost; }
      else if (p.ground) add(p.x, p.y, cost);
    }
  }
  return { won, best, states: dist.size, minTime: won ? wonTime : null };
}
module.exports = { check, settle, CHARGES };
if (require.main === module) {
  global.window = {}; require("../js/grimpe-data.js");
  const data = global.window.GRIMPE_LEVEL; const L = C.createLevel(data);
  const t = Date.now(), r = check(L);
  const mm = r.minTime ? Math.floor(r.minTime / 60) + " min " + Math.round(r.minTime % 60) + " s" : "-";
  console.log(r.won ? "OK : le but est atteignable" : "ÉCHEC : hauteur max " + Math.round((L.startY - r.best) / 16) + " tuiles",
    "(" + L.screens + " écrans, " + r.states + " positions, " + (Date.now() - t) + " ms)");
  if (r.won) console.log("Montée parfaite (sans aucune erreur) : " + mm);
  if (process.argv.includes("--ascii")) console.log(data.rows.join("\n"));
  const mt = process.argv.find(a => a.indexOf("--min-time=") === 0);
  if (mt && (!r.won || r.minTime < parseFloat(mt.slice(11)))) { console.log("ÉCHEC : montée parfaite trop courte"); process.exit(1); }
  process.exit(r.won ? 0 : 1);
}
