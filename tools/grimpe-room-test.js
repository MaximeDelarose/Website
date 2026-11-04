// Teste une salle seule : départ = entrée (colonne `sx`, rangée du sol), but = 'G' posé dans la sortie.
// Usage : node tools/grimpe-room-test.js castle|cave [--map]
const C = require("../js/grimpe-core.js"), { check } = require("./grimpe-check.js"), R = require("./grimpe-rooms.js");
const name = process.argv[2] || "castle", T = (name === "cave" ? R.CAVE : R.CASTLE).slice();
const rows = T.map(r => r.split(""));
const goal = name === "cave" ? [19, 4] : [0, 4];
rows[goal[1]][goal[0]] = "G";
const sx = name === "cave" ? 17 : 2;
const L = C.createLevel({ rows: rows.map(r => r.join("")), startX: sx * 16 + 8, startY: 29 * 16 });
const r = check(L, { maxStates: 300000 });
console.log(r.won ? "OK : sortie atteignable en " + Math.round(r.minTime) + " s" : "ÉCHEC : hauteur max " + Math.round((L.startY - r.best) / 16) + " tuiles, clés " + r.bestMask, "(" + r.states + " positions)");
if (process.argv.includes("--map") && r.dist) {
  const seen = {}; for (const [k] of r.dist) { const [x, y, m] = k.split(","); const tx = Math.floor(x * 4 / 16), ty = Math.floor((+y - 1) / 16); seen[tx + "," + ty] = (seen[tx + "," + ty] | 0) | (1 << m); }
  console.log(rows.map((row, y) => row.map((c, x) => { const f = seen[x + "," + y]; return c === "." && f ? (f & 8 ? "%" : f & 4 ? "+" : f & 2 ? "o" : "*") : c; }).join("")).join("\n"));
  console.log("* = on peut se tenir debout sans clé · o = avec la rouge · + = avec la bleue · % = les deux");
}
