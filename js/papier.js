/* =========================================================================
   Papier · salle de test
   Base d'un RPG en papier : décor origami en 2.5D (caméra fixe), personnage en papier découpé
   qui se retourne comme une feuille, combats au tour par tour avec commandes d'action,
   garde et contre. Pas d'histoire : uniquement le gameplay et une salle de test.
   ========================================================================= */
import * as THREE from "./vendor/three-0.160.0.module.min.js";

const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const now = () => performance.now();
const TAU = Math.PI * 2;
// direction artistique : "pixel" (sprites d'Écureuil Survivor) ou "papier" (découpage vectoriel)
const DA = (() => { const q = /[?&]da=(pixel|papier)/.exec(location.search); let v = q && q[1]; try { if (v) localStorage.setItem("papier-da", v); v = v || localStorage.getItem("papier-da"); } catch (e) {} return v === "papier" ? "papier" : "pixel"; })();
const PIX = DA === "pixel" && !!(window.ES_DATA && window.ES_ART);
if (PIX) document.body.classList.add("pixel");
const LH = 180;   // hauteur de rendu en mode pixel

/* =====================================================================
   Réglages de la salle de test
   ===================================================================== */
const OPT = { slow: false, auto: false, god: false, windows: false, hpBars: true };
const SLOW = () => (OPT.slow ? 2 : 1);

/* =====================================================================
   Rendu
   ===================================================================== */
const renderer = new THREE.WebGLRenderer({ antialias: !PIX });
renderer.setPixelRatio(PIX ? 1 : Math.min(2, devicePixelRatio || 1));
renderer.shadowMap.enabled = !PIX;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
$("#app").appendChild(renderer.domElement);
const ov = $("#ov"), oc = ov.getContext("2d");
const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 200);
let VW = 1, VH = 1, DPR = 1;
function resize() {
  VW = innerWidth; VH = innerHeight; DPR = Math.min(2, devicePixelRatio || 1);
  camera.aspect = VW / VH; camera.fov = VW / VH < 1.5 ? 36 : 30; camera.updateProjectionMatrix();
  if (PIX) {   // petite image agrandie sans lissage : de vrais pixels
    const lw = Math.round((LH * VW) / VH); renderer.setSize(lw, LH, false);
    renderer.domElement.style.width = "100%"; renderer.domElement.style.height = "100%"; renderer.domElement.style.imageRendering = "pixelated";
    DPR = lw / VW; ov.width = lw; ov.height = LH; ov.style.imageRendering = "pixelated";
  } else { renderer.setSize(VW, VH); ov.width = VW * DPR; ov.height = VH * DPR; }
}
addEventListener("resize", resize); resize();

/* ---------- textures de papier ---------- */
function canvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
function seeded(s) { return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
// grain de papier neutre (multiplié par la couleur des matériaux)
const GRAIN = (() => {
  const c = canvas(256, 256), g = c.getContext("2d"), R = seeded(3);
  g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { const v = 220 + Math.floor(R() * 35); g.fillStyle = `rgba(${v},${v - 4},${v - 12},.5)`; g.fillRect(R() * 256, R() * 256, 1 + R() * 2, 1 + R() * 2); }
  g.strokeStyle = "rgba(170,150,120,.10)"; g.lineWidth = 1;
  for (let i = 0; i < 70; i++) { const x = R() * 256, y = R() * 256, a = R() * TAU, l = 6 + R() * 18; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
})();
function paperMat(color, rep = 1, extra = {}) {
  const map = GRAIN.clone(); map.repeat.set(rep, rep); map.needsUpdate = true;
  return new THREE.MeshLambertMaterial(Object.assign({ color, map, flatShading: true }, extra));
}
// sol de la salle de test : kraft quadrillé avec repères au ruban
function floorTexture() {
  const c = canvas(1024, 512), g = c.getContext("2d"), R = seeded(9);
  g.fillStyle = "#e3cfa6"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 6000; i++) { const v = R(); g.fillStyle = v < 0.5 ? "rgba(160,120,70,.10)" : "rgba(255,245,220,.18)"; g.fillRect(R() * 1024, R() * 512, 2, 2); }
  g.strokeStyle = "rgba(120,90,50,.18)"; g.lineWidth = 2;
  for (let x = 0; x <= 1024; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
  for (let y = 0; y <= 512; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
  // ruban adhésif : croix de repère et ligne centrale
  g.fillStyle = "rgba(246,195,67,.75)";
  for (const x of [192, 512, 832]) { g.save(); g.translate(x, 256); g.rotate(0.785); g.fillRect(-38, -8, 76, 16); g.rotate(1.571); g.fillRect(-38, -8, 76, 16); g.restore(); }
  g.fillStyle = "rgba(224,80,58,.55)"; g.fillRect(0, 444, 1024, 10);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function textTexture(lines, w, h, bg, fg, size) {
  const c = canvas(w, h), g = c.getContext("2d");
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.font = `900 ${size}px Nunito, system-ui, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.15));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------- géométries origami (facettes nettes) ---------- */
function foldedPlane(w, d, sx, sz, amp, seed) {
  const g = new THREE.PlaneGeometry(w, d, sx, sz); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, R = seeded(seed || 1);
  for (let i = 0; i < p.count; i++) p.setY(i, (R() - 0.5) * amp);
  const n = g.toNonIndexed(); n.computeVertexNormals(); return n;
}
// mur en accordéon (plis alternés)
function accordion(w, h, folds, depth) {
  const pos = [], uv = [];
  for (let i = 0; i < folds; i++) {
    const x0 = -w / 2 + (w / folds) * i, x1 = x0 + w / folds, z0 = i % 2 ? depth : 0, z1 = i % 2 ? 0 : depth;
    pos.push(x0, 0, z0, x1, 0, z1, x1, h, z1, x0, 0, z0, x1, h, z1, x0, h, z0);
    const u0 = i / folds, u1 = (i + 1) / folds; uv.push(u0, 0, u1, 0, u1, 1, u0, 0, u1, 1, u0, 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
}
function origamiTree(col, s) {
  const grp = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * s, 0.13 * s, 0.7 * s, 5), paperMat(0x9a6a40)); trunk.position.y = 0.35 * s; grp.add(trunk);
  [[1.0, 1.1, 0.75], [0.8, 0.95, 1.35], [0.55, 0.8, 1.9]].forEach(([r, h, y], i) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(r * s, h * s, 6, 1), paperMat(i % 2 ? col : new THREE.Color(col).offsetHSL(0, 0, 0.06)));
    c.position.y = y * s; c.rotation.y = i * 0.5; grp.add(c);
  });
  grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return grp;
}
function origamiRock(col, s) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), paperMat(col)); m.scale.y = 0.6; m.castShadow = m.receiveShadow = true; return m; }

/* =====================================================================
   Personnages en papier découpé : dessin vectoriel lisse + bord blanc de découpe
   ===================================================================== */
const INK = "#3a2618";
function ell(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); }
function fillStroke(g, fill, w = 5) { g.fillStyle = fill; g.fill(); g.lineWidth = w; g.strokeStyle = INK; g.stroke(); }
// bord de papier : silhouette agrandie en blanc, avec un léger liseré gris
function cutout(draw, W = 256, H = 256, rim = 7) {
  const art = canvas(W, H), ag = art.getContext("2d"); ag.lineJoin = ag.lineCap = "round"; draw(ag);
  const sil = canvas(W, H), sg = sil.getContext("2d"); sg.drawImage(art, 0, 0); sg.globalCompositeOperation = "source-in"; sg.fillStyle = "#fff"; sg.fillRect(0, 0, W, H);
  const edge = canvas(W, H), eg = edge.getContext("2d"); eg.drawImage(sil, 0, 0); eg.globalCompositeOperation = "source-in"; eg.fillStyle = "#cfc4b0"; eg.fillRect(0, 0, W, H);
  const out = canvas(W, H), o = out.getContext("2d");
  for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; o.drawImage(edge, Math.cos(a) * (rim + 1.5), Math.sin(a) * (rim + 1.5)); }
  for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; o.drawImage(sil, Math.cos(a) * rim, Math.sin(a) * rim); }
  o.drawImage(art, 0, 0);
  const t = new THREE.CanvasTexture(out); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

// --- le héros : un écureuil en papier, écharpe de feuille (dessiné tourné vers la droite) ---
function drawHero(g, view) {
  const O = "#e8873a", OL = "#f6b066", C = "#fdf3de";
  if (view !== "back") {
    // queue derrière
    g.beginPath(); g.moveTo(112, 196); g.bezierCurveTo(52, 212, 22, 140, 50, 92); g.bezierCurveTo(70, 56, 122, 58, 118, 98); g.bezierCurveTo(114, 122, 92, 132, 104, 160); g.bezierCurveTo(110, 176, 118, 186, 112, 196); g.closePath(); fillStroke(g, O);
    g.beginPath(); g.moveTo(98, 182); g.bezierCurveTo(62, 186, 46, 140, 64, 106); g.bezierCurveTo(76, 86, 100, 86, 102, 104); g.bezierCurveTo(92, 124, 84, 150, 98, 182); g.closePath(); g.fillStyle = OL; g.fill();
  }
  ell(g, 120, 238, 17, 8); fillStroke(g, "#8a5a3b", 4); ell(g, 154, 238, 17, 8); fillStroke(g, "#8a5a3b", 4);
  ell(g, 138, 192, 36, 44); fillStroke(g, O);
  if (view !== "back") { ell(g, 152, 200, 19, 30); g.fillStyle = C; g.fill(); }
  // écharpe de feuille
  g.beginPath(); g.moveTo(108, 154); g.quadraticCurveTo(140, 172, 176, 152); g.lineTo(178, 166); g.quadraticCurveTo(140, 186, 106, 168); g.closePath(); fillStroke(g, "#5aa05a", 4);
  g.beginPath(); g.moveTo(118, 168); g.quadraticCurveTo(100, 196, 92, 204); g.quadraticCurveTo(112, 198, 128, 172); g.closePath(); fillStroke(g, "#4a8a4a", 4);
  // tête
  ell(g, 146, 124, 38, 33); fillStroke(g, O);
  g.beginPath(); g.moveTo(118, 100); g.lineTo(122, 64); g.lineTo(146, 94); g.closePath(); fillStroke(g, O, 4.5);
  g.beginPath(); g.moveTo(124, 94); g.lineTo(125, 76); g.lineTo(137, 92); g.closePath(); g.fillStyle = "#f29a85"; g.fill();
  if (view === "back") {
    g.beginPath(); g.moveTo(146, 96); g.lineTo(162, 62); g.lineTo(170, 102); g.closePath(); fillStroke(g, O, 4.5);
    // la queue passe devant quand on le voit de dos
    g.beginPath(); g.moveTo(132, 214); g.bezierCurveTo(92, 222, 70, 168, 96, 130); g.bezierCurveTo(112, 108, 150, 116, 146, 146); g.bezierCurveTo(140, 168, 124, 176, 132, 214); g.closePath(); fillStroke(g, O);
    g.beginPath(); g.moveTo(124, 200); g.bezierCurveTo(100, 200, 88, 168, 104, 146); g.bezierCurveTo(116, 134, 134, 138, 134, 152); g.bezierCurveTo(124, 170, 118, 182, 124, 200); g.closePath(); g.fillStyle = OL; g.fill();
    return;
  }
  ell(g, 174, 136, 18, 13); g.fillStyle = C; g.fill();
  ell(g, 160, 120, 5.5, 9); g.fillStyle = INK; g.fill(); ell(g, 162, 116, 2, 2.6); g.fillStyle = "#fff"; g.fill();
  ell(g, 189, 131, 5, 4); g.fillStyle = INK; g.fill();
  ell(g, 160, 142, 7, 4); g.fillStyle = "rgba(242,120,110,.55)"; g.fill();
  g.beginPath(); g.moveTo(176, 144); g.quadraticCurveTo(182, 149, 188, 143); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
  ell(g, 164, 196, 9, 13, -0.5); fillStroke(g, O, 4);
}
function drawMallet(g) {
  g.save(); g.translate(128, 128);
  g.beginPath(); g.roundRect(-7, -10, 14, 96, 6); fillStroke(g, "#a06a3e", 4);
  g.beginPath(); g.roundRect(-40, -62, 80, 52, 12); fillStroke(g, "#d9b27a", 5);
  g.fillStyle = "#b8864e"; g.fillRect(-26, -60, 8, 48); g.fillRect(18, -60, 8, 48);
  g.restore();
}
// --- ennemis (dessinés tournés vers la gauche) ---
function drawBoulette(g, f) {
  const R = seeded(42), pts = [];
  for (let i = 0; i < 15; i++) { const a = (i / 15) * TAU, r = 58 + R() * 12; pts.push([128 + Math.cos(a) * r, 160 + Math.sin(a) * r * 0.92]); }
  ell(g, 104, 236, 16, 8); fillStroke(g, "#6b5a4a", 4); ell(g, 152, 236, 16, 8); fillStroke(g, "#6b5a4a", 4);
  g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); fillStroke(g, "#f1ece1");
  // plis du papier froissé
  for (let i = 0; i < 15; i += 2) { g.beginPath(); g.moveTo(128 + (R() - 0.5) * 30, 160 + (R() - 0.5) * 30); g.lineTo(pts[i][0], pts[i][1]); g.lineTo(pts[(i + 1) % 15][0], pts[(i + 1) % 15][1]); g.closePath(); g.fillStyle = i % 4 ? "rgba(190,175,150,.35)" : "rgba(255,255,255,.6)"; g.fill(); }
  g.lineWidth = 2.5; g.strokeStyle = "rgba(120,100,80,.5)"; for (let i = 1; i < 15; i += 3) { g.beginPath(); g.moveTo(128, 162); g.lineTo(pts[i][0], pts[i][1]); g.stroke(); }
  ell(g, 104, 150, 12, 15); fillStroke(g, "#fff", 4); ell(g, 140, 150, 12, 15); fillStroke(g, "#fff", 4);
  ell(g, 100, 154, 5, 7); g.fillStyle = INK; g.fill(); ell(g, 136, 154, 5, 7); g.fill();
  g.lineWidth = 6; g.strokeStyle = INK; g.beginPath(); g.moveTo(88, 128); g.lineTo(114, 138); g.moveTo(156, 128); g.lineTo(130, 138); g.stroke();
  g.beginPath(); g.moveTo(108, 186); g.quadraticCurveTo(122, 178, 136, 186); g.lineWidth = 4; g.stroke();
}
function drawCocotte(g, f) {
  // oiseau en origami : triangles bleus, aile haute ou basse
  const B = "#8ec5e8", BD = "#5a9ac8";
  g.beginPath(); g.moveTo(70, 150); g.lineTo(196, 128); g.lineTo(150, 196); g.closePath(); fillStroke(g, B);
  g.beginPath(); g.moveTo(150, 196); g.lineTo(196, 128); g.lineTo(214, 176); g.closePath(); fillStroke(g, BD);
  g.beginPath(); g.moveTo(70, 150); g.lineTo(48, 120); g.lineTo(96, 130); g.closePath(); fillStroke(g, B);
  g.beginPath(); g.moveTo(48, 120); g.lineTo(22, 132); g.lineTo(60, 136); g.closePath(); fillStroke(g, "#f6a03a", 4);
  ell(g, 66, 126, 4.5, 5.5); g.fillStyle = INK; g.fill();
  if (f === 0) { g.beginPath(); g.moveTo(112, 146); g.lineTo(150, 50); g.lineTo(170, 138); g.closePath(); fillStroke(g, "#b4dcf4"); g.beginPath(); g.moveTo(130, 140); g.lineTo(150, 50); g.lineWidth = 3; g.stroke(); }
  else { g.beginPath(); g.moveTo(112, 150); g.lineTo(160, 236); g.lineTo(172, 146); g.closePath(); fillStroke(g, "#b4dcf4"); g.beginPath(); g.moveTo(140, 152); g.lineTo(160, 236); g.lineWidth = 3; g.stroke(); }
}
function drawPiquant(g) {
  const G = "#7fb05a";
  ell(g, 100, 236, 15, 7); fillStroke(g, "#6b4430", 4); ell(g, 156, 236, 15, 7); fillStroke(g, "#6b4430", 4);
  // piquants pliés
  for (let i = 0; i < 7; i++) { const a = Math.PI + 0.25 + i * 0.42, x = 132 + Math.cos(a) * 66, y = 196 + Math.sin(a) * 70; g.beginPath(); g.moveTo(132 + Math.cos(a - 0.22) * 56, 196 + Math.sin(a - 0.22) * 58); g.lineTo(132 + Math.cos(a) * 102, 196 + Math.sin(a) * 104); g.lineTo(132 + Math.cos(a + 0.22) * 56, 196 + Math.sin(a + 0.22) * 58); g.closePath(); fillStroke(g, i % 2 ? "#f6d36b" : "#f0bf3a", 4); }
  g.beginPath(); g.ellipse(132, 200, 70, 62, 0, Math.PI, 0); g.lineTo(202, 228); g.lineTo(62, 228); g.closePath(); fillStroke(g, G);
  ell(g, 92, 196, 32, 26); g.fillStyle = "#e9f4d8"; g.fill();
  ell(g, 84, 186, 6, 9); g.fillStyle = INK; g.fill(); ell(g, 108, 186, 6, 9); g.fill();
  ell(g, 68, 202, 6, 5); g.fill();
}
function drawCarton(g) {
  ell(g, 100, 238, 15, 7); fillStroke(g, "#5a4030", 4); ell(g, 156, 238, 15, 7); fillStroke(g, "#5a4030", 4);
  g.beginPath(); g.moveTo(60, 100); g.lineTo(196, 100); g.lineTo(196, 232); g.lineTo(60, 232); g.closePath(); fillStroke(g, "#c9a070");
  g.beginPath(); g.moveTo(60, 100); g.lineTo(40, 66); g.lineTo(118, 70); g.lineTo(128, 100); g.closePath(); fillStroke(g, "#d9b685", 4);
  g.beginPath(); g.moveTo(196, 100); g.lineTo(214, 62); g.lineTo(138, 70); g.lineTo(128, 100); g.closePath(); fillStroke(g, "#b8905e", 4);
  g.fillStyle = "rgba(255,240,200,.65)"; g.fillRect(118, 102, 22, 128);
  g.fillStyle = "rgba(90,60,30,.25)"; g.fillRect(64, 104, 10, 124);
  ell(g, 92, 150, 11, 14); g.fillStyle = INK; g.fill(); ell(g, 160, 150, 11, 14); g.fill();
  ell(g, 95, 146, 3.5, 4.5); g.fillStyle = "#fff"; g.fill(); ell(g, 163, 146, 3.5, 4.5); g.fill();
  g.lineWidth = 5; g.strokeStyle = INK; g.beginPath(); g.moveTo(106, 192); g.lineTo(150, 192); g.stroke();
  g.beginPath(); g.roundRect(18, 140, 44, 64, 10); fillStroke(g, "#a8b0b8", 4); g.fillStyle = "#e0503a"; g.fillRect(34, 150, 12, 44);
}

const ENEMIES = {
  boulette: { name: "Boulette", hp: 2, atk: 1, def: 0, xp: 2, draw: drawBoulette, h: 1.25, atkType: "charge", desc: "Une boule de papier froissé, très en colère." },
  cocotte: { name: "Cocotte", hp: 2, atk: 1, def: 0, xp: 3, draw: drawCocotte, frames: 2, h: 1.3, fly: true, atkType: "dive", desc: "Vole : le maillet ne l'atteint pas, mais le saut si." },
  piquant: { name: "Piquant", hp: 3, atk: 1, def: 0, xp: 3, draw: drawPiquant, h: 1.25, spiky: true, atkType: "roll", desc: "Piquants : ne saute pas dessus, utilise le maillet." },
  carton: { name: "Carton", hp: 4, atk: 2, def: 1, xp: 5, draw: drawCarton, h: 1.4, atkType: "slam", desc: "Défense 1 : le saut fait 0 dégât, le maillet chargé passe." }
};

/* ---------- la carte de papier : recto, retournement, marche ---------- */
const TEXCACHE = {};
function tex(key, fn) { return TEXCACHE[key] || (TEXCACHE[key] = cutout(fn)); }
class PaperChar {
  constructor(textures, height, nat = 1, width = height) {
    this.root = new THREE.Group();          // position au sol
    this.body = new THREE.Group();          // sautillement, écrasement
    this.card = new THREE.Group();          // retournement (axe vertical)
    this.root.add(this.body); this.body.add(this.card);
    this.textures = textures; this.nat = nat; this.h = height;
    this.mat = new THREE.MeshBasicMaterial({ map: textures.front[0], transparent: true, alphaTest: 0.35, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), this.mat);
    this.mesh.position.y = height / 2 - (PIX ? 0 : height * 0.03); this.w = width;
    this.card.add(this.mesh);
    // ombre ronde au sol, comme dans un livre animé
    this.shadow = PIX ? new THREE.Mesh(new THREE.PlaneGeometry(width * 0.8, width * 0.3), new THREE.MeshBasicMaterial({ map: PXSHADOW, transparent: true, opacity: 0.3, depthWrite: false }))
      : new THREE.Mesh(new THREE.CircleGeometry(height * 0.28, 24), new THREE.MeshBasicMaterial({ color: 0x3a2618, transparent: true, opacity: 0.22, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = 0.012; this.root.add(this.shadow);
    this.face = nat; this.rot = 0; this.rotTo = 0; this.t = Math.random() * 10; this.lift = 0; this.squash = 0; this.view = "front"; this.frame = 0; this.tint = 1;
  }
  setFace(dir) { if (!dir || dir === this.face) return; this.face = dir; this.rotTo = dir === this.nat ? 0 : Math.PI; }
  setView(v) { if (this.textures.back && v !== this.view) { this.view = v; } }
  update(dt, moving, speed = 1) {
    this.t += dt;
    // retournement de feuille : rapide, avec un léger rebond
    const d = this.rotTo - this.rot; this.rot += d * Math.min(1, dt * 16);
    if (Math.abs(d) < 0.002) this.rot = this.rotTo;
    this.card.rotation.y = this.rot;
    const edge = Math.abs(Math.cos(this.rot));
    this.mat.color.setScalar((0.72 + 0.28 * edge) * this.tint);
    let tx = this.view === "back" && this.textures.back ? this.textures.back : this.textures.front, fi = this.frame;
    if (this.textures.walk && moving) { tx = this.textures.walk; fi = this.t * 9 * speed; }
    else if (this.textures.idle && !moving) { tx = this.textures.idle; fi = this.t * 2.4; }
    const fr = tx[Math.floor(fi) % tx.length]; if (this.mat.map !== fr) { this.mat.map = fr; this.mat.needsUpdate = true; }
    // marche en papier : petits bonds, balancement
    let bob = 0, sway = 0, sq = 0;
    if (moving) { const ph = this.t * 11 * speed; bob = Math.abs(Math.sin(ph)) * 0.12 * (PIX ? this.h : 1); sway = PIX ? 0 : Math.sin(ph) * 0.07; sq = -Math.abs(Math.cos(ph)) * 0.05; }
    else { sq = Math.sin(this.t * 3) * 0.02; }
    this.squash += (sq - this.squash) * Math.min(1, dt * 14);
    this.body.position.y = bob + this.lift;
    this.body.rotation.z = sway * (this.face === this.nat ? 1 : -1);
    this.body.scale.set(1 - this.squash * 0.6, 1 + this.squash, 1);
    const hgt = Math.max(0, this.body.position.y);
    this.shadow.scale.setScalar(clamp(1 - hgt * 0.25, 0.4, 1)); this.shadow.material.opacity = clamp((PIX ? 0.34 : 0.24) - hgt * 0.05, 0.06, 0.34);
  }
  pop(amount = 0.25) { this.squash = -amount; }
}
/* ---------- mode pixel : sprites d'Écureuil Survivor (même fabrication que dans Survivor, contour d'un pixel) ---------- */
const OUTC = "#2b1709";
function pxMk(rows, pal) {
  let w = 0; rows.forEach((r) => (w = Math.max(w, r.length)));
  const h = rows.length, Wc = w + 2, Hc = h + 2, filled = new Uint8Array(Wc * Hc), dark = {};
  Object.keys(pal).forEach((k) => { const c = pal[k]; if (typeof c === "string" && c.length === 7) { const r = parseInt(c.substr(1, 2), 16), g = parseInt(c.substr(3, 2), 16), b = parseInt(c.substr(5, 2), 16); if (0.3 * r + 0.59 * g + 0.11 * b < 34) dark[k] = 1; } });
  const c = canvas(Wc, Hc), g = c.getContext("2d");
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const ch = rows[y][x]; if (ch && pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x + 1, y + 1, 1, 1); filled[(y + 1) * Wc + x + 1] = dark[ch] ? 2 : 1; } }
  g.fillStyle = OUTC;
  for (let y = 0; y < Hc; y++) for (let x = 0; x < Wc; x++) {
    if (filled[y * Wc + x]) continue;
    if ((x > 0 && filled[y * Wc + x - 1] === 1) || (x < Wc - 1 && filled[y * Wc + x + 1] === 1) || (y > 0 && filled[(y - 1) * Wc + x] === 1) || (y < Hc - 1 && filled[(y + 1) * Wc + x] === 1)) g.fillRect(x, y, 1, 1);
  }
  return c;
}
function epx(rows) {
  const H2 = rows.length; let W2 = 0; rows.forEach((r) => (W2 = Math.max(W2, r.length)));
  const at = (x, y) => (x < 0 || y < 0 || x >= W2 || y >= H2 ? null : rows[y][x] || "."), out = [];
  for (let y = 0; y < H2; y++) { let r1 = "", r2 = ""; for (let x = 0; x < W2; x++) { const P0 = at(x, y), A = at(x, y - 1), Bq = at(x + 1, y), C = at(x - 1, y), Dq = at(x, y + 1); let e1 = P0, e2 = P0, e3 = P0, e4 = P0;
    if (A !== null && C !== null && C === A && C !== Dq && A !== Bq) e1 = A; if (A !== null && Bq !== null && A === Bq && A !== C && Bq !== Dq) e2 = Bq;
    if (Dq !== null && C !== null && Dq === C && Dq !== Bq && C !== A) e3 = C; if (Bq !== null && Dq !== null && Bq === Dq && Bq !== A && Dq !== C) e4 = Dq; r1 += e1 + e2; r2 += e3 + e4; } out.push(r1, r2); }
  return out;
}
const PX_EXTRA = {
  tree: { pal: { g: "#3f6b3a", G: "#5b8a4a", l: "#9cc56b", b: "#6b4430", B: "#8a5a3b" }, frames: [["......gggg......", "....ggGGGGgg....", "...gGGlGGGGGg...", "..gGGllGGGGGGg..", ".gGGGlGGGGGGGGg.", ".gGGGGGGGGlGGGg.", "gGGlGGGGGllGGGGg", "gGGGGGGGGGGGGGGg", "gGGGGGGlGGGGGGgg", ".gGGGGGGGGGGGgg.", ".ggGGGGGGGGGggg.", "..gggGGGGGgggg..", "....gggbBggg....", "......bBb.......", "......bBb.......", ".....bbBbb......"]] },
  pine: { pal: { g: "#1f3a2b", G: "#2f5a3a", l: "#4f8a40", b: "#4a3020", B: "#6b4430" }, frames: [[".......g........", "......gGg.......", ".....gGlGg......", "....gGGGGGg.....", ".....gGlGg......", "....gGGGGGGg....", "...gGGlGGGGGg...", "....gGGGGGGg....", "...gGGGGGlGGg...", "..gGGlGGGGGGGg..", ".gGGGGGGGGlGGGg.", "..ggGGGGGGGGgg..", "....ggggbgggg...", ".......bB.......", ".......bB.......", "......bbBb......"]] }
};
const PXC = {};
function pxSprite(name, times = 0) {
  const key = name + "@" + times; if (PXC[key]) return PXC[key];
  let def = PX_EXTRA[name] || ES_DATA.SPRITES[name];
  if (times) def = { pal: def.pal, frames: def.frames.map((f) => { for (let i = 0; i < times; i++) f = epx(f); return f; }) };
  let d = def; try { d = ES_ART.upgrade(name, def) || def; } catch (e) {}
  const mkT = (rows) => { const c = pxMk(rows, d.pal), t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; t.pw = c.width; t.ph = c.height; return t; };
  const o = { frames: d.frames.map(mkT) }; if (d.idle) o.idle = d.idle.map(mkT);
  o.pw = o.frames[0].pw; o.ph = o.frames[0].ph; return (PXC[key] = o);
}
// unités du monde par pixel de sprite : 1 pixel de sprite = 1 pixel de l'image (à la profondeur des personnages)
const KPX = (dist) => (2 * dist * Math.tan((30 * Math.PI) / 360)) / LH;
const K_WORLD = KPX(13.98), K_BATTLE = KPX(12.52);
const PXSHADOW = (() => { const c = canvas(16, 6), g = c.getContext("2d"); g.fillStyle = "#2b1709"; g.fillRect(3, 0, 10, 6); g.fillRect(1, 1, 14, 4); g.fillRect(0, 2, 16, 2); const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; })();
const PX_ENEMY = { boulette: ["beetle", "Scarabée", "Un scarabée bagarreur."], cocotte: ["wasp", "Guêpe", "Vole : le maillet ne l'atteint pas, mais le saut si."], piquant: ["hedgehog", "Hérisson", "Piquants : ne saute pas dessus, utilise le maillet."], carton: ["turtle", "Tortue", "Carapace (défense 1) : le saut fait 0 dégât, le maillet chargé passe."] };
function makeChar(kind, k) {
  if (!PIX) return kind === "hero" ? new PaperChar(heroTextures(), 1.55, 1) : new PaperChar(enemyTextures(kind), ENEMIES[kind].h, -1);
  const sp = pxSprite(kind === "hero" ? "sq_noisette" : PX_ENEMY[kind][0]);
  const tx = { front: [sp.frames[0]], walk: sp.frames, idle: sp.idle || null };
  if (kind !== "hero") { tx.walk = null; tx.idle = null; tx.front = sp.frames; }
  return new PaperChar(tx, sp.ph * k, 1, sp.pw * k);
}
if (PIX) Object.keys(PX_ENEMY).forEach((id) => { ENEMIES[id].name = PX_ENEMY[id][1]; ENEMIES[id].desc = PX_ENEMY[id][2]; });
function pxBillboard(name, k, times = 0) {
  const sp = pxSprite(name, times), m = new THREE.Mesh(new THREE.PlaneGeometry(sp.pw * k, sp.ph * k), new THREE.MeshBasicMaterial({ map: sp.frames[0], transparent: true, alphaTest: 0.5 }));
  m.geometry.translate(0, (sp.ph * k) / 2, 0); return m;
}
function pxTexture(c) { const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; return t; }
const FONT3 = { "0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111", "4": "101101111001001", "5": "111100111001111", "6": "111100111101111", "7": "111001001001001", "8": "111101111101111", "9": "111101111001111",
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111", F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111", M: "101111111101101",
  N: "110101101101101", O: "010101101101010", P: "110101110100100", Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010", U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010", Z: "111001010100111",
  ":": "000010000010000", ".": "000000000000010", "-": "000000111000000", "+": "000010111010000", "!": "010010010000010", "?": "111001011000010", "'": "010010000000000", ",": "000000000010100", " ": "000000000000000" };
// texte pixel (police 3 × 5 de Survivor) avec contour, sur un contexte 2D
function pxText(g, str, x, y, col, sc = 1, align = "c", outline = OUTC) {
  str = String(str).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const w = (str.length * 4 - 1) * sc, x0 = Math.round(align === "c" ? x - w / 2 : align === "r" ? x - w : x), y0 = Math.round(y);
  const pass = (c, ox, oy) => { g.fillStyle = c; for (let i = 0; i < str.length; i++) { const gl = FONT3[str[i]] || FONT3[" "]; for (let j = 0; j < 15; j++) if (gl[j] === "1") g.fillRect(x0 + ox + (i * 4 + (j % 3)) * sc, y0 + oy + Math.floor(j / 3) * sc, sc, sc); } };
  if (outline) [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [-1, 1], [1, -1], [-1, -1]].forEach((o) => pass(outline, o[0] * sc, o[1] * sc));
  pass(col, 0, 0);
}
function heroTextures() { return { front: [tex("hero", (g) => drawHero(g, "front"))], back: [tex("heroB", (g) => drawHero(g, "back"))] }; }
function enemyTextures(id) { const E = ENEMIES[id]; const n = E.frames || 1, a = []; for (let i = 0; i < n; i++) a.push(tex(id + i, (g) => E.draw(g, i))); return { front: a }; }
function makeMallet(k) {
  if (PIX) {
    const sp = pxSprite("hammer"), m = new THREE.Mesh(new THREE.PlaneGeometry(sp.pw * k, sp.ph * k), new THREE.MeshBasicMaterial({ map: sp.frames[0], transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
    const pivot = new THREE.Group(); m.position.set(0, sp.ph * k * 0.4, 0.01); pivot.add(m); pivot.visible = false; return pivot;
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: tex("mallet", drawMallet), transparent: true, alphaTest: 0.35, side: THREE.DoubleSide }));
  const pivot = new THREE.Group(); m.position.set(0, 0.32, 0.01); pivot.add(m); pivot.visible = false; return pivot;
}

/* =====================================================================
   Lumières communes
   ===================================================================== */
function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xfff6e6, 0xb89a74, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 1.35); sun.position.set(-6, 14, 10); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 12, bottom: -12, near: 1, far: 50 }); sun.shadow.bias = -0.0005; sun.shadow.radius = 4;
  scene.add(sun); return sun;
}

/* =====================================================================
   La salle de test (décor 2.5D)
   ===================================================================== */
const ROOM = { x0: -12, x1: 12, z0: -2.6, z1: 3.2 };
const world = new THREE.Scene(); world.background = new THREE.Color(0xe9dcc3);
addLights(world);
const HEALBLOCK = { mesh: null, bump: 0 };
const solids = [];   // obstacles ronds : {x, z, r, top (hauteur sur laquelle on peut monter, ou Infinity)}
(PIX ? buildRoomPixel : buildRoom)();
function buildRoomPixel() {
  world.background = new THREE.Color(0x9fd8e8);
  // sol : le sol dithered de Survivor (morceaux de 4 × 4 tuiles), herbe + allée de terre
  const GRASS = { base: "#7fa95a", patch: "#76a052" }, DIRT = { base: "#c9a070", patch: "#b98f60" }, TW = 52, TH = 14;
  const getG = (a, b) => (b >= 6 && b <= 8 ? DIRT : GRASS);
  const gc = canvas(TW * 16, TH * 16), gg = gc.getContext("2d");
  for (let cy = 0; cy < Math.ceil(TH / 4); cy++) for (let cx = 0; cx < TW / 4; cx++) gg.drawImage(ES_ART.groundChunk(cx, cy, getG), cx * 64, cy * 64);
  const Rr = seeded(5), FL = ["#fdf3de", "#f2b05e", "#c8553d", "#f6d36b"];
  for (let i = 0; i < 900; i++) { const x = Math.floor(Rr() * gc.width), y = Math.floor(Rr() * gc.height), ty = Math.floor(y / 16); if (ty >= 6 && ty <= 8) { if (Rr() < 0.3) { gg.fillStyle = "#8a6a48"; gg.fillRect(x, y, 2, 1); } continue; }
    if (Rr() < 0.18) { gg.fillStyle = OUTC; gg.fillRect(x - 1, y - 1, 3, 3); gg.fillStyle = FL[Math.floor(Rr() * 4)]; gg.fillRect(x, y, 1, 1); } else { gg.fillStyle = "#5b8a4a"; gg.fillRect(x, y, 1, 2); gg.fillRect(x + 1, y + 1, 1, 1); } }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(34, 9), new THREE.MeshBasicMaterial({ map: pxTexture(gc) })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 0.3); world.add(floor);
  const lipC = canvas(64, 4), lg = lipC.getContext("2d"); lg.fillStyle = "#6b4430"; lg.fillRect(0, 0, 64, 4); lg.fillStyle = "#8a5a3b"; lg.fillRect(0, 0, 64, 1); lg.fillStyle = OUTC; for (let x = 0; x < 64; x += 8) lg.fillRect(x, 1, 1, 3);
  const lt = pxTexture(lipC); lt.wrapS = THREE.RepeatWrapping; lt.repeat.set(12, 1);
  const lip = new THREE.Mesh(new THREE.PlaneGeometry(34, 0.5), new THREE.MeshBasicMaterial({ map: lt })); lip.position.set(0, -0.25, 4.8); world.add(lip);
  // toile de fond peinte en pixels : ciel, collines, forêt
  const bw = 768, bh = 160, bc = canvas(bw, bh), bg = bc.getContext("2d");
  const sky = ["#cfeef2", "#bfe6ee", "#afdeea", "#9fd8e8"]; for (let y = 0; y < bh; y++) { const i = Math.min(3, Math.floor((y / bh) * 5)); bg.fillStyle = sky[3 - i]; bg.fillRect(0, y, bw, 1); if (y % 6 === 0 && i < 3) { bg.fillStyle = sky[2 - i]; for (let x = (y / 6) % 2; x < bw; x += 2) bg.fillRect(x, y, 1, 1); } }
  bg.fillStyle = "#86b56c"; for (let x = 0; x < bw; x++) { const h = 70 + Math.round(Math.sin(x * 0.012) * 10 + Math.sin(x * 0.041) * 4); bg.fillRect(x, h, 1, bh - h); }
  bg.fillStyle = "#5b8a4a"; for (let x = 0; x < bw; x++) { const h = 96 + Math.round(Math.sin(x * 0.02 + 2) * 6); bg.fillRect(x, h, 1, bh - h); }
  for (let x = -10; x < bw + 20; x += 15) { const img = pxSprite((x / 15) % 3 ? "pine" : "tree", 0).frames[0].image; bg.drawImage(img, x + ((x * 7) % 7), bh - img.height + 2 + ((x * 3) % 5)); }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(40, (40 * bh) / bw), new THREE.MeshBasicMaterial({ map: pxTexture(bc) })); back.position.set(0, (40 * bh) / bw / 2 - 0.4, -4.4); world.add(back);
  // panneau en bois, texte pixel
  const sc = canvas(64, 15), sg = sc.getContext("2d"); sg.fillStyle = OUTC; sg.fillRect(0, 0, 64, 13); sg.fillStyle = "#d39a52"; sg.fillRect(1, 1, 62, 11); sg.fillStyle = "#b07a4f"; sg.fillRect(1, 6, 62, 1); sg.fillStyle = OUTC; sg.fillRect(30, 13, 4, 2);
  pxText(sg, "SALLE DE TEST", 32, 4, "#fdf3de", 1, "c");
  const k1 = KPX(13.98 + 3.6), sign = new THREE.Mesh(new THREE.PlaneGeometry(64 * k1, 15 * k1), new THREE.MeshBasicMaterial({ map: pxTexture(sc), transparent: true, alphaTest: 0.5 })); sign.geometry.translate(0, (15 * k1) / 2, 0); sign.position.set(1.6, 0, -3.6); world.add(sign);
  // arbres et rochers : billboards de sprites
  [[-10.5, -3.2, "tree"], [-7.8, -3.4, "pine"], [7.5, -3.3, "tree"], [10.6, -3.1, "pine"], [-3.2, -3.5, "pine"]].forEach(([x, z, n]) => { const b = pxBillboard(n, KPX(13.98 + 3.3), 1); b.position.set(x, 0, z); world.add(b); solids.push({ x, z, r: 0.8, top: Infinity }); });
  [[-5.6, -2.9], [5.2, 2.9], [11.2, 2.4]].forEach(([x, z]) => { const b = pxBillboard("boulder", KPX(14), 0); b.position.set(x, 0, z); world.add(b); solids.push({ x, z, r: 0.55, top: Infinity }); });
  // caisse (plateforme) et bloc de soin en pixels
  const crate = canvas(32, 32), cg = crate.getContext("2d"); cg.fillStyle = OUTC; cg.fillRect(0, 0, 32, 32); cg.fillStyle = "#a06a3e"; cg.fillRect(2, 2, 28, 28); cg.fillStyle = "#c4895a"; for (let y = 3; y < 30; y += 7) cg.fillRect(3, y, 26, 5); cg.fillStyle = "#7a4528"; cg.fillRect(2, 2, 28, 2); cg.fillRect(2, 28, 28, 2); cg.fillStyle = OUTC; for (let i = 3; i < 29; i++) { cg.fillRect(i, i, 2, 1); }
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 1.6), new THREE.MeshLambertMaterial({ map: pxTexture(crate) })); box.position.set(4.2, 0.5, -1); world.add(box);
  solids.push({ x: 4.2, z: -1, r: 0.95, top: 1, box: 0.8 });
  const hc = canvas(16, 16), hg = hc.getContext("2d"); hg.fillStyle = OUTC; hg.fillRect(0, 0, 16, 16); hg.fillStyle = "#f2c230"; hg.fillRect(1, 1, 14, 14); hg.fillStyle = "#f6d36b"; hg.fillRect(1, 1, 14, 2); hg.fillStyle = "#c8962a"; hg.fillRect(1, 13, 14, 2);
  ["..rr.rr..", ".rRrrrrr.", ".rrrrrrr.", "..rrrrr..", "...rrr...", "....r...."].forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== ".") { hg.fillStyle = ch === "R" ? "#ff9aa0" : "#e0283a"; hg.fillRect(x + 3, y + 5, 1, 1); } }));
  const hm = new THREE.MeshLambertMaterial({ map: pxTexture(hc) });
  HEALBLOCK.mesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), hm); HEALBLOCK.mesh.position.set(-2, 2.65, 0.4); world.add(HEALBLOCK.mesh);
  const hs = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.3), new THREE.MeshBasicMaterial({ map: PXSHADOW, transparent: true, opacity: 0.25, depthWrite: false })); hs.rotation.x = -Math.PI / 2; hs.position.set(-2, 0.013, 0.4); world.add(hs);
}
function buildRoom() {
  const floor = new THREE.Mesh(foldedPlane(34, 9, 34, 9, 0.05, 4), new THREE.MeshLambertMaterial({ map: floorTexture(), flatShading: true }));
  floor.position.set(0, 0, 0.3); floor.receiveShadow = true; world.add(floor);
  // bord avant du sol : une bande de carton
  const lip = new THREE.Mesh(new THREE.BoxGeometry(34, 0.5, 0.3), paperMat(0xb8905e, 4)); lip.position.set(0, -0.2, 4.9); world.add(lip);
  // mur du fond en accordéon (papier millimétré bleuté)
  const wall = new THREE.Mesh(accordion(40, 7, 40, 0.35), paperMat(0xdfe8ef, 3)); wall.position.set(0, -0.05, -4.2); wall.receiveShadow = true; world.add(wall);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.3), new THREE.MeshLambertMaterial({ map: textTexture(["SALLE DE TEST"], 512, 144, "#fffaf0", "#3a2618", 76) }));
  sign.position.set(0, 3.2, -3.75); sign.rotation.z = -0.03; world.add(sign);
  // arbres, rochers, boîtes : décor plié
  [[-10.5, -3.2, 1.2, 0x6fae5a], [-7.8, -3.4, 0.9, 0x5a9a4a], [7.5, -3.3, 1.1, 0x6fae5a], [10.6, -3.1, 1.3, 0x5a9a4a], [-3.2, -3.5, 0.7, 0x86c06a]].forEach(([x, z, s, c]) => {
    const t = origamiTree(c, s); t.position.set(x, 0, z); t.rotation.y = rnd(0, 1); world.add(t); solids.push({ x, z, r: 0.7 * s, top: Infinity });
  });
  [[-5.6, -2.9, 0.45, 0x9aa4ae], [5.2, 2.9, 0.38, 0xa8b0b8], [11.2, 2.4, 0.5, 0x8a949e]].forEach(([x, z, s, c]) => { const r = origamiRock(c, s); r.position.set(x, s * 0.35, z); world.add(r); solids.push({ x, z, r: s * 0.95, top: Infinity }); });
  // un bloc pour monter dessus (plateforme)
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 1.6), paperMat(0xe8a24a, 1)); box.position.set(4.2, 0.5, -1); box.castShadow = box.receiveShadow = true; world.add(box);
  solids.push({ x: 4.2, z: -1, r: 0.95, top: 1, box: 0.8 });
  // bloc de soin flottant : on le frappe en sautant dessous
  const healTex = textTexture(["♥"], 128, 128, "#fffaf0", "#e0503a", 96);
  HEALBLOCK.mesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), [paperMat(0xf6c343), paperMat(0xf6c343), paperMat(0xf6c343), paperMat(0xf6c343), new THREE.MeshLambertMaterial({ map: healTex }), paperMat(0xf6c343)]);
  HEALBLOCK.mesh.position.set(-2, 2.65, 0.4); HEALBLOCK.mesh.rotation.y = 0.5; HEALBLOCK.mesh.castShadow = true; world.add(HEALBLOCK.mesh);
  const hs = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), new THREE.MeshBasicMaterial({ color: 0x3a2618, transparent: true, opacity: 0.12, depthWrite: false })); hs.rotation.x = -Math.PI / 2; hs.position.set(-2, 0.013, 0.4); world.add(hs);
}

/* =====================================================================
   État du joueur
   ===================================================================== */
const ST = { hp: 10, hpMax: 10, fp: 5, fpMax: 5, xp: 0, items: { baie: 3, ether: 2, bombe: 1 } };
const ITEMS = {
  baie: { name: "Baie", icon: "🍓", desc: "Rend 5 PV.", use: (h) => heal(5, 0) },
  ether: { name: "Feuille d'éther", icon: "🍃", desc: "Rend 5 PF.", use: () => heal(0, 5) },
  bombe: { name: "Bombe origami", icon: "💣", desc: "3 dégâts à tous les ennemis (ignore la défense).", use: null }
};
function heal(hp, fp) { ST.hp = Math.min(ST.hpMax, ST.hp + hp); ST.fp = Math.min(ST.fpMax, ST.fp + fp); hud(); }

const hero = makeChar("hero", K_WORLD);
const mallet = makeMallet(K_WORLD); hero.body.add(mallet);
world.add(hero.root);
const P = { x: -8, z: 0.4, y: 0, vy: 0, ground: true, swing: 0, swingHit: false, inv: 0, base: 0 };
hero.root.position.set(P.x, 0, P.z);

/* ---------- ennemis de la salle ---------- */
const WE = [];
function spawnEnemy(id, n, x, z) {
  const c = makeChar(id, K_WORLD);
  const e = { id, group: Array.from({ length: n || 1 }, () => id), c, x: x ?? rnd(-2, 10), z: z ?? rnd(-1.8, 2.6), y: ENEMIES[id].fly ? 1.1 : 0, vx: 0, vz: 0, t: 0, st: "wander", wt: 0, alert: 0, stun: 0 };
  c.root.position.set(e.x, e.y, e.z); world.add(c.root); WE.push(e); return e;
}
function removeEnemy(e) { world.remove(e.c.root); const i = WE.indexOf(e); if (i >= 0) WE.splice(i, 1); }
function resetRoom() { WE.slice().forEach(removeEnemy); spawnEnemy("boulette", 1, 2, 1.2); spawnEnemy("cocotte", 1, 6.5, 0.2); spawnEnemy("piquant", 1, 9.5, 1.8); P.x = -8; P.z = 0.4; P.y = 0; }

/* =====================================================================
   Entrées : clavier, joystick tactile, boutons A/B
   ===================================================================== */
const held = {}, listeners = [], relListeners = [];
const KMAP = { ArrowUp: "up", KeyW: "up", KeyZ: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", KeyQ: "left", ArrowRight: "right", KeyD: "right",
  Space: "a", Enter: "a", KeyJ: "a", KeyX: "b", KeyK: "b", ShiftLeft: "b", Backspace: "b", Escape: "menu", KeyT: "test" };
function press(k) { const t = now(); for (let i = listeners.length - 1; i >= 0; i--) if (listeners[i](k, t) === true) return; }
function release(k) { relListeners.slice().forEach((f) => f(k, now())); }
function onKey(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; }
function onRelease(fn) { relListeners.push(fn); return () => { const i = relListeners.indexOf(fn); if (i >= 0) relListeners.splice(i, 1); }; }
addEventListener("keydown", (e) => { const k = KMAP[e.code]; if (!k) return; e.preventDefault(); if (e.repeat) return; held[k] = true; audio(); press(k); });
addEventListener("keyup", (e) => { const k = KMAP[e.code]; if (!k) return; held[k] = false; release(k); });
const isTouch = "ontouchstart" in window || (navigator.maxTouchPoints > 0 && matchMedia("(pointer: coarse)").matches);
if (isTouch) $("#touch").hidden = false;
document.querySelectorAll("#touch .ab button").forEach((b) => {
  const k = b.dataset.k;
  b.addEventListener("pointerdown", (e) => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (er) {} b.classList.add("on"); held[k] = true; audio(); press(k); });
  const up = () => { if (!held[k]) return; b.classList.remove("on"); held[k] = false; release(k); };
  b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up); b.addEventListener("lostpointercapture", up);
});
const STICK = { x: 0, y: 0, on: false };
(() => {
  const el = $("#stick"), base = el.querySelector(".base"), knob = el.querySelector(".knob"), R0 = 52;
  let id = null, cx = 0, cy = 0;
  const setDir = (k, v) => { if (!!held[k] === v) return; held[k] = v; if (v) press(k); else release(k); };
  function upd(px, py) {
    let dx = px - cx, dy = py - cy; const d = Math.hypot(dx, dy); if (d > R0) { dx *= R0 / d; dy *= R0 / d; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; STICK.x = dx / R0; STICK.y = dy / R0;
    const ax = Math.abs(STICK.x), ay = Math.abs(STICK.y);
    setDir("left", STICK.x < -0.5 && ax > ay); setDir("right", STICK.x > 0.5 && ax > ay); setDir("up", STICK.y < -0.5 && ay >= ax); setDir("down", STICK.y > 0.5 && ay >= ax);
  }
  el.addEventListener("pointerdown", (e) => { e.preventDefault(); audio(); if (id !== null) return; id = e.pointerId; try { el.setPointerCapture(id); } catch (er) {} const r = el.getBoundingClientRect(); cx = e.clientX; cy = e.clientY; base.style.left = cx - r.left + "px"; base.style.top = cy - r.top + "px"; el.classList.add("on"); STICK.on = true; upd(cx, cy); });
  el.addEventListener("pointermove", (e) => { if (e.pointerId === id) upd(e.clientX, e.clientY); });
  const end = (e) => { if (e.pointerId !== id) return; id = null; STICK.on = false; STICK.x = STICK.y = 0; knob.style.transform = ""; el.classList.remove("on"); base.style.left = base.style.top = ""; ["left", "right", "up", "down"].forEach((k) => setDir(k, false)); };
  el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end); el.addEventListener("lostpointercapture", end);
})();
const KA = isTouch ? "<kbd>A</kbd>" : "<kbd class=k>Espace</kbd>", KB = isTouch ? "<kbd class=b>B</kbd>" : "<kbd class=k>X</kbd>";

/* ---------- petits sons de papier ---------- */
let AC = null;
function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === "suspended") AC.resume(); return AC; }
function tone(f, d, type = "triangle", vol = 0.06, slide = 0) {
  const a = AC; if (!a) return; const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.02);
}
function rustle(d = 0.08, vol = 0.06, hp = 2500) {
  const a = AC; if (!a) return; const n = Math.floor(a.sampleRate * d), b = a.createBuffer(1, n, a.sampleRate), ch = b.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp; s.buffer = b; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(a.destination); s.start();
}
const SFX = {
  flip: () => rustle(0.05, 0.04, 3500), jump: () => tone(420, 0.14, "square", 0.04, 1.8), land: () => rustle(0.06, 0.05, 1200),
  hit: () => { rustle(0.12, 0.12, 600); tone(180, 0.12, "square", 0.05, 0.5); }, nice: () => { tone(880, 0.06, "square", 0.04); setTimeout(() => tone(1320, 0.1, "square", 0.04), 60); },
  miss: () => tone(200, 0.15, "sawtooth", 0.035, 0.6), guard: () => { tone(560, 0.08, "triangle", 0.08); rustle(0.05, 0.05, 3000); },
  contre: () => { tone(1100, 0.05, "square", 0.05); setTimeout(() => tone(1650, 0.12, "square", 0.05), 50); }, hurt: () => tone(300, 0.2, "sawtooth", 0.05, 0.4),
  move: () => tone(700, 0.03, "square", 0.025), ok: () => { tone(900, 0.05, "square", 0.035); setTimeout(() => tone(1350, 0.06, "square", 0.035), 45); }, back: () => tone(500, 0.06, "square", 0.03, 0.7),
  charge: (p) => tone(300 + p * 600, 0.03, "square", 0.02), win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.12, "square", 0.045), i * 110)), heal: () => [660, 880, 1100].forEach((f, i) => setTimeout(() => tone(f, 0.1, "triangle", 0.05), i * 70))
};

/* =====================================================================
   Temps : attentes, interpolations, animations scriptées
   ===================================================================== */
const runs = [];
function run(ms, fn, ease) { ms *= SLOW(); return new Promise((res) => runs.push({ t0: now(), ms: Math.max(1, ms), fn, ease: ease || ((t) => t), res })); }
const wait = (ms) => run(ms, () => {});
const EASE = { io: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2), out: (t) => 1 - (1 - t) * (1 - t), in: (t) => t * t };
function tween(o, to, ms, ease = EASE.io) { const from = {}; for (const k in to) from[k] = o[k]; return run(ms, (p) => { for (const k in to) o[k] = from[k] + (to[k] - from[k]) * p; }, ease); }
function stepRuns() {
  const t = now();
  for (let i = runs.length - 1; i >= 0; i--) { const r = runs[i], p = clamp((t - r.t0) / r.ms, 0, 1); r.fn(r.ease(p), p); if (p >= 1) { runs.splice(i, 1); r.res(); } }
}

/* =====================================================================
   Interface : HUD, conseils, menus de cartes, panneaux
   ===================================================================== */
let uiBusy = 0, mode = "world";
function hud() {
  $("#hud").innerHTML = `<div class="sheet"><span class="hp"><small>PV</small>♥ ${Math.max(0, ST.hp)}/${ST.hpMax}</span><span class="fp"><small>PF</small>✿ ${ST.fp}/${ST.fpMax}</span><span class="xp"><small>XP</small>${ST.xp}</span></div>`;
}
function tip(html) { const el = $("#tip"); if (!html) { el.hidden = true; return; } if (el.innerHTML !== html) el.innerHTML = html; el.className = "sheet"; el.hidden = false; }
function cmdHint(html) { const el = $("#cmd"); if (!html) { el.hidden = true; return; } el.innerHTML = html; el.className = "sheet"; el.hidden = false; }
// menu de cartes (horizontal) ou de liste ; renvoie l'index choisi ou -1
function choose(opts, o = {}) {
  uiBusy++;
  const el = $("#menu"); let sel = o.start || 0;
  while (opts[sel] && opts[sel].off && sel < opts.length - 1) sel++;
  const list = !!o.list;
  function draw() {
    el.className = list ? "list" : "";
    el.innerHTML = opts.map((op, i) => `<div class="card sheet${i === sel ? " sel" : ""}${op.off ? " off" : ""}" data-i="${i}"><span class="ic">${op.icon || ""}</span>${op.label}${op.sub ? `<small>${op.sub}</small>` : ""}</div>`).join("") +
      (list && opts[sel] && opts[sel].desc ? `<div class="desc sheet">${opts[sel].desc}</div>` : "");
    place();
  }
  function place() {
    const r = el.getBoundingClientRect(), a = o.at ? o.at() : { x: VW / 2, y: VH / 2 };
    const minTop = VH < 460 ? 108 : 120; el.style.left = clamp(a.x - r.width / 2, 8, VW - r.width - 8) + "px"; el.style.top = clamp(a.y - r.height, minTop, VH - r.height - 8) + "px";
  }
  el.hidden = false; draw();
  if (!list && opts[sel] && opts[sel].desc) cmdHint(opts[sel].desc);
  return new Promise((res) => {
    const done = (v) => { off(); el.hidden = true; el.onclick = null; cmdHint(""); uiBusy--; res(v); };
    const step = (d) => { let n = sel; do { n = (n + d + opts.length) % opts.length; } while (opts[n].off && n !== sel); sel = n; SFX.move(); draw(); if (!list) cmdHint(opts[sel].desc || ""); };
    const off = onKey((k) => {
      if ((!list && k === "left") || (list && k === "up")) step(-1);
      else if ((!list && k === "right") || (list && k === "down")) step(1);
      else if (k === "a") { if (!opts[sel].off) { SFX.ok(); done(sel); } else SFX.miss(); }
      else if (k === "b" || k === "menu") { if (!o.noBack) { SFX.back(); done(-1); } }
      return true;
    });
    el.onclick = (e) => { const c = e.target.closest(".card"); if (!c) return; const i = +c.dataset.i; if (opts[i].off) { SFX.miss(); return; } if (i === sel || isTouch) { SFX.ok(); done(i); } else { sel = i; draw(); } };
  });
}
function panel(html, handlers = {}, o = {}) {
  uiBusy++;
  const el = $("#panel"); el.innerHTML = `<div class="sheet">${html}</div>`; el.hidden = false;
  return new Promise((res) => {
    let sel = 0;
    const btns = () => [...el.querySelectorAll("[data-act]")];
    const mark = () => btns().forEach((b, i) => b.classList.toggle("sel", i === sel));
    const close = (v) => { off(); el.hidden = true; el.onclick = null; uiBusy--; res(v); };
    const act = (b) => { SFX.ok(); const a = b.dataset.act; if (handlers[a]) { const r = handlers[a](b); if (r !== undefined) close(r); } else close(a); };
    const off = onKey((k) => {
      const bs = btns();
      if (k === "left" || k === "up") { sel = (sel - 1 + bs.length) % bs.length; mark(); }
      else if (k === "right" || k === "down") { sel = (sel + 1) % bs.length; mark(); }
      else if (k === "a" && bs[sel]) act(bs[sel]);
      else if ((k === "b" || k === "menu" || k === "test") && o.back) close(o.back);
      return true;
    });
    el.onclick = (e) => { const b = e.target.closest("[data-act]"); if (b) act(b); };
    el.refresh = (h) => { el.querySelector(".sheet").innerHTML = h; mark(); };
    mark();
  });
}
// projection 3D -> écran
const V3 = new THREE.Vector3();
function toScreen(x, y, z, cam = camera) { V3.set(x, y, z).project(cam); return { x: (V3.x * 0.5 + 0.5) * VW, y: (-V3.y * 0.5 + 0.5) * VH, z: V3.z }; }

/* =====================================================================
   Exploration de la salle
   ===================================================================== */
const camLook = new THREE.Vector3();
let camX = -6;
function updateCameraWorld(dt) {
  camX += (clamp(P.x, -6, 6) - camX) * Math.min(1, dt * 3);
  camera.position.set(camX, 5.6, 13.2); camLook.set(camX, 1.0, 0); camera.lookAt(camLook);
}
function groundAt(x, z) {   // hauteur du sol (bloc-plateforme)
  let h = 0;
  for (const s of solids) if (s.box && Math.abs(x - s.x) < s.box && Math.abs(z - s.z) < s.box) h = Math.max(h, s.top);
  return h;
}
function blocked(x, z, y) {
  if (x < ROOM.x0 || x > ROOM.x1 || z < ROOM.z0 || z > ROOM.z1) return true;
  for (const s of solids) {
    if (s.box) { if (Math.abs(x - s.x) < s.box + 0.2 && Math.abs(z - s.z) < s.box + 0.2 && y < s.top - 0.05) return true; }
    else if (Math.hypot(x - s.x, z - s.z) < s.r + 0.25) return true;
  }
  return false;
}
let firstVisit = true;
function updateWorld(dt) {
  const busy = uiBusy > 0;
  let dx = 0, dz = 0, mag = 1;
  if (!busy) {
    if (STICK.on && Math.hypot(STICK.x, STICK.y) > 0.18) { dx = STICK.x; dz = STICK.y; mag = clamp(Math.hypot(dx, dz) * 1.15, 0.35, 1); }
    else { if (held.left) dx--; if (held.right) dx++; if (held.up) dz--; if (held.down) dz++; }
  }
  const moving = !!(dx || dz);
  if (moving) {
    const l = Math.hypot(dx, dz); dx /= l; dz /= l;
    const sp = 5.2 * mag * dt, nx = P.x + dx * sp, nz = P.z + dz * sp;
    if (!blocked(nx, P.z, P.y)) P.x = nx; if (!blocked(P.x, nz, P.y)) P.z = nz;
    if (Math.abs(dx) > 0.3) { const f = dx > 0 ? 1 : -1; if (f !== hero.face) SFX.flip(); hero.setFace(f); }
    hero.setView(dz < -0.6 && Math.abs(dx) < 0.5 ? "back" : dz > 0.3 || Math.abs(dx) > 0.3 ? "front" : hero.view);
  }
  // saut et gravité
  const gnd = groundAt(P.x, P.z);
  if (!P.ground || P.y > gnd) { P.vy -= 30 * dt; P.y += P.vy * dt; }
  if (P.y <= gnd) { if (!P.ground) { SFX.land(); hero.pop(0.22); } P.y = gnd; P.vy = 0; P.ground = true; } else P.ground = false;
  // bloc de soin : on le frappe par en dessous
  const hb = HEALBLOCK.mesh;
  if (P.vy > 0 && Math.abs(P.x - hb.position.x) < 0.6 && Math.abs(P.z - hb.position.z) < 0.6 && P.y + hero.h * 0.93 > hb.position.y - 0.45) {
    P.vy = -2; HEALBLOCK.bump = 1; ST.hp = ST.hpMax; ST.fp = ST.fpMax; hud(); SFX.heal(); floatText(hb.position.x, hb.position.y + 0.9, hb.position.z, "PV et PF au max !", "#e0503a");
  }
  HEALBLOCK.bump = Math.max(0, HEALBLOCK.bump - dt * 5); hb.position.y = 2.65 + Math.sin(HEALBLOCK.bump * Math.PI) * 0.25; hb.rotation.y += dt * 0.6;
  // coup de maillet
  if (P.swing > 0) {
    P.swing -= dt; const p = 1 - P.swing / 0.32;
    mallet.visible = true; mallet.position.set(0.35 * hero.face * (hero.h / 1.55), 0.7 * (hero.h / 1.55), 0.02); mallet.rotation.z = (hero.face > 0 ? -1 : 1) * lerp(-0.9, 1.9, EASE.out(p));
    if (!P.swingHit && p > 0.45) {
      P.swingHit = true;
      for (const e of WE) if (Math.abs(e.x - (P.x + hero.face * 0.9)) < 0.85 && Math.abs(e.z - P.z) < 0.7 && !ENEMIES[e.id].fly) { startFight(e, "maillet"); break; }
    }
  } else mallet.visible = false;
  if (P.inv > 0) P.inv -= dt;
  hero.root.position.set(P.x, 0, P.z); hero.lift = P.y; hero.update(dt, moving && P.ground, mag);
  hero.root.visible = !(P.inv > 0 && Math.floor(P.inv * 12) % 2);
  // ennemis
  for (const e of WE.slice()) {
    const E = ENEMIES[e.id], d = Math.hypot(P.x - e.x, P.z - e.z);
    e.t += dt; if (e.stun > 0) e.stun -= dt;
    let sp = 0;
    if (!busy && e.stun <= 0) {
      if (e.st !== "chase" && d < 4.2 && P.inv <= 0) { e.st = "chase"; e.alert = 0.45; }
      if (e.st === "chase" && (d > 7 || P.inv > 0)) e.st = "wander";
      if (e.alert > 0) e.alert -= dt;
      else if (e.st === "chase") { sp = 2.6; e.vx = (P.x - e.x) / d; e.vz = (P.z - e.z) / d; }
      else { e.wt -= dt; if (e.wt <= 0) { e.wt = rnd(1, 2.5); const a = rnd(0, TAU); e.vx = Math.cos(a); e.vz = Math.sin(a) * 0.6; if (Math.random() < 0.3) e.vx = e.vz = 0; } sp = 1.1; }
      const nx = e.x + e.vx * sp * dt, nz = e.z + e.vz * sp * dt;
      if (!blocked(nx, e.z, 0)) e.x = nx; else e.wt = 0; if (!blocked(e.x, nz, 0)) e.z = nz; else e.wt = 0;
      if (Math.abs(e.vx) > 0.2 && sp) e.c.setFace(e.vx > 0 ? 1 : -1);
    }
    const ey = E.fly ? 1.1 + Math.sin(e.t * 3) * 0.15 : 0;
    e.c.root.position.set(e.x, 0, e.z); e.c.lift = ey; e.c.frame = E.frames ? e.t * 6 : 0; e.c.update(dt, sp > 0 && !E.fly, sp > 2 ? 1.4 : 0.8);
    e.c.root.visible = !(e.stun > 0 && Math.floor(e.stun * 10) % 2);
    if (busy || mode !== "world" || e.stun > 0) continue;
    // saut sur la tête : premier coup (sauf piquants)
    const top = ey + e.c.h * 0.8;
    if (P.vy < 0 && d < 0.75 && P.y > top - 0.35 && P.y < top + 0.6) {
      if (E.spiky) { P.vy = 8; P.inv = 1; ST.hp = Math.max(1, ST.hp - 1); hud(); SFX.hurt(); floatText(P.x, P.y + 1.8, P.z, "Aïe ! Piquants", "#e0503a"); startFight(e, null); }
      else { P.vy = 9; startFight(e, "saut"); }
      break;
    }
    if (d < 0.7 && Math.abs(P.y - ey) < 1 && P.inv <= 0) { startFight(e, e.st === "chase" && e.alert <= 0 && Math.sign(e.x - P.x) !== hero.face ? "ennemi" : null); break; }
  }
  // conseil contextuel
  if (!busy) tip(firstVisit ? `${isTouch ? "Joystick" : "<kbd class=k>←↑→↓</kbd>"} marcher · ${KA} sauter · ${KB} maillet · <kbd class=k>T</kbd> salle de test` : "");
}
onKey((k) => {
  if (mode !== "world" || uiBusy) return false;
  if (k === "a" && P.ground) { P.vy = 10.5; P.ground = false; SFX.jump(); hero.pop(-0.18); firstVisit = false; return true; }
  if (k === "b" && P.swing <= 0) { P.swing = 0.32; P.swingHit = false; rustle(0.08, 0.06, 1500); firstVisit = false; return true; }
  if (k === "test" || k === "menu") { testPanel(); return true; }
  return false;
});
$("#btn-test").addEventListener("click", () => { if (mode === "world" && !uiBusy) testPanel(); });

/* ---------- textes flottants (monde et combat) ---------- */
const floats = [];
function floatText(x, y, z, txt, col = "#3a2618", big = false) { floats.push({ x, y, z, txt, col, t: 0, big }); }
function damageStar(x, y, z, n) { floats.push({ x, y, z, txt: String(n), star: true, t: 0 }); }

/* =====================================================================
   Combat
   ===================================================================== */
const arena = new THREE.Scene(); arena.background = new THREE.Color(0x4a2a24);
addLights(arena);
(PIX ? buildStagePixel : buildStage)();
function buildStagePixel() {
  arena.background = new THREE.Color(0x1f3a2b);
  // plancher de rondins
  const fc = canvas(480, 160), fg = fc.getContext("2d");
  for (let r = 0; r < 16; r++) { fg.fillStyle = OUTC; fg.fillRect(0, r * 10, 480, 10); fg.fillStyle = r % 2 ? "#a06a3e" : "#8a5a3b"; fg.fillRect(0, r * 10 + 1, 480, 9); fg.fillStyle = "#c9a070"; fg.fillRect(0, r * 10 + 1, 480, 1); fg.fillStyle = "#6b4430"; for (let x = (r * 37) % 60; x < 480; x += 60) fg.fillRect(x, r * 10 + 1, 2, 9); }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 6), new THREE.MeshBasicMaterial({ map: pxTexture(fc) })); floor.rotation.x = -Math.PI / 2; floor.position.set(0.6, 0, 0.6); arena.add(floor);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(18, 0.7), new THREE.MeshBasicMaterial({ color: 0x5a3820 })); front.position.set(0.6, -0.35, 3.6); arena.add(front);
  // toile de fond peinte : ciel, collines, arbres, rideaux de feuillage
  const bw = 480, bh = 210, c = canvas(bw, bh), g = c.getContext("2d");
  const sky = ["#d8f0d0", "#c4ead8", "#b0e0e2", "#9fd8e8"]; for (let y = 0; y < bh; y++) { const i = Math.min(3, Math.floor((y / bh) * 4)); g.fillStyle = sky[3 - i]; g.fillRect(0, y, bw, 1); }
  g.fillStyle = "#5b8a4a"; for (let x = 0; x < bw; x++) { const h = 130 + Math.round(Math.sin(x * 0.02) * 9 + Math.sin(x * 0.07) * 3); g.fillRect(x, h, 1, bh - h); }
  for (let x = -6; x < bw + 20; x += 30) { const img = pxSprite((x / 30) % 2 ? "pine" : "tree", 1).frames[0].image; g.drawImage(img, x + ((x * 7) % 11), bh - img.height + 2 + ((x * 3) % 6)); }
  g.fillStyle = "#7fa95a"; g.fillRect(0, bh - 8, bw, 8);
  const curtain = (x0, dir) => { for (let k = 0; k < 7; k++) { const cx = x0 + dir * k * 9; g.fillStyle = OUTC; g.fillRect(cx - 1, 0, 11, bh - 30 - k * 16); g.fillStyle = k % 2 ? "#3f6b3a" : "#5b8a4a"; g.fillRect(cx, 0, 9, bh - 32 - k * 16); g.fillStyle = "#9cc56b"; for (let j = 8; j < bh - 40 - k * 16; j += 16) g.fillRect(cx + 2 + (j % 3), j, 4, 3); } };
  curtain(0, 1); curtain(bw - 10, -1); curtain(72, 1); curtain(bw - 82, -1);
  const vt = 34; g.fillStyle = OUTC; g.fillRect(0, 0, bw, vt + 2); g.fillStyle = "#3f6b3a"; g.fillRect(0, 0, bw, vt);
  for (let x = 0; x < bw; x += 16) { g.fillStyle = OUTC; g.beginPath(); g.moveTo(x, vt); g.lineTo(x + 16, vt); g.lineTo(x + 8, vt + 10); g.fill(); g.fillStyle = x % 32 ? "#5b8a4a" : "#9cc56b"; g.beginPath(); g.moveTo(x + 2, vt); g.lineTo(x + 14, vt); g.lineTo(x + 8, vt + 7); g.fill(); }
  const k = KPX(12.52 + 3.6), back = new THREE.Mesh(new THREE.PlaneGeometry(bw * k, bh * k), new THREE.MeshBasicMaterial({ map: pxTexture(c) }));
  back.position.set(0.6, (bh * k) / 2 - 0.05, -3.6); arena.add(back);
}
function buildStage() {
  // scène de théâtre en papier
  const floor = new THREE.Mesh(foldedPlane(18, 6, 18, 6, 0.04, 7), paperMat(0xc98a52, 3)); floor.position.set(0, 0, 0.6); floor.receiveShadow = true; arena.add(floor);
  for (let i = 0; i < 9; i++) { const plank = new THREE.Mesh(new THREE.BoxGeometry(18, 0.02, 0.04), paperMat(0x9a6038)); plank.position.set(0, 0.03, -2.2 + i * 0.66); arena.add(plank); }
  const front = new THREE.Mesh(new THREE.BoxGeometry(18, 0.7, 0.4), paperMat(0x8a4a2a, 3)); front.position.set(0, -0.32, 3.7); arena.add(front);
  // toile de fond : collines pliées
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(26, 12), new THREE.MeshBasicMaterial({ color: 0xbfe2f2, map: GRAIN })); sky.position.set(0, 4, -4.4); arena.add(sky);
  const hills = new THREE.Mesh(accordion(22, 2.4, 11, 0.5), paperMat(0x7fb05a, 2)); hills.position.set(0, 0, -3.9); arena.add(hills);
  [[-6, -3.4, 1.1], [-2.5, -3.6, 0.8], [3.4, -3.5, 1], [7, -3.3, 1.2]].forEach(([x, z, s]) => { const t = origamiTree(0x5a9a4a, s); t.position.set(x, 0, z); arena.add(t); });
  // rideaux en accordéon
  for (const sx of [-1, 1]) {
    const cur = new THREE.Mesh(accordion(3, 7, 9, 0.3), paperMat(0xc8402e, 2)); cur.position.set(0.6 + sx * 6.1, -0.3, 2.8); cur.rotation.y = sx * -0.15; cur.castShadow = true; arena.add(cur);
  }
  const top = new THREE.Mesh(accordion(16, 1.2, 26, 0.22), paperMat(0xa8302a, 2)); top.position.set(0, 4.25, 3); arena.add(top);
  const spot = new THREE.SpotLight(0xfff0cc, 30, 30, 0.55, 0.6); spot.position.set(0, 10, 8); spot.target.position.set(0, 0, 0); arena.add(spot, spot.target);
}
const bHero = makeChar("hero", K_BATTLE), bMallet = makeMallet(K_BATTLE); bHero.body.add(bMallet); arena.add(bHero.root);
const HX = -3.2, EX = [0.5, 1.85, 3.2, 4.4];
let B = null;
const RATE = ["Bien !", "Super !", "Génial !", "Incroyable !"];

function wipe(dir) { const el = $("#wipe"); el.style.transition = "transform .35s cubic-bezier(.6,0,.4,1)"; el.style.transform = dir ? "translateX(0)" : "translateX(105%)"; return wait(360 / SLOW()).then(() => { if (!dir) { el.style.transition = "none"; el.style.transform = "translateX(-105%)"; } }); }

async function startFight(e, first) {
  if (mode !== "world") return;
  mode = "trans"; tip(""); uiBusy++;
  SFX.hit(); await wipe(true);
  const res = await battle(e.group, first);
  if (res === "win") removeEnemy(e); else { e.stun = 2; P.inv = 2; }
  await wipe(false); mode = "world"; uiBusy--;
}
function mkFoe(id, i) {
  const E = ENEMIES[id], c = makeChar(id, K_BATTLE); c.setFace(-1); c.rot = c.rotTo;
  const f = { id, E, c, name: E.name, hp: E.hp, max: E.hp, atk: E.atk, def: E.def, fly: !!E.fly, spiky: !!E.spiky, slot: i, x: EX[i], y: E.fly ? 1.5 : 0, hx: EX[i], hy: E.fly ? 1.5 : 0, z: 0.2, rot: 0, alive: true, flash: 0, stun: 0 };
  c.root.position.set(f.x, 0, f.z); arena.add(c.root); return f;
}
async function battle(group, first) {
  B = { foes: group.map((id, i) => mkFoe(id, i)), h: { x: HX, y: 0, z: 0.2, rot: 0, guard: false }, cursor: null, prompt: null, done: null };
  mode = "battle"; bHero.setFace(1); bHero.face = 1; bHero.rot = bHero.rotTo = 0;
  await wipe(false);
  if (first === "saut" || first === "maillet") { floatText(0, 3.2, 0, "Premier coup !", "#f6c343", true); await wait(450); const f = alive()[0]; await (first === "saut" ? jumpOn(f, true) : malletOn(f, true)); }
  if (first === "ennemi") { floatText(0, 3.2, 0, "Embuscade !", "#e0503a", true); await wait(500); await enemyPhase(); }
  while (!(await over())) {
    B.h.guard = false;
    const r = await heroTurn(); if (r === "flee") { B.done = "flee"; break; }
    if (await over()) break;
    await enemyPhase();
  }
  const res = B.done;
  if (res === "win") {
    const xp = B.foes.reduce((a, f) => a + f.E.xp, 0); ST.xp += xp; hud();
    SFX.win(); floatText(HX, 2.6, 0.2, "Victoire !", "#f6c343", true); await tween(B.h, { y: 0.9 }, 220, EASE.out); await tween(B.h, { y: 0 }, 220, EASE.in); await wait(700);
    await panel(`<h2>Victoire !</h2><p>+${xp} XP</p><div class="row"><button class="btn main" data-act="ok">Continuer</button></div>`, {}, { back: "ok" });
  } else if (res === "lose") {
    floatText(HX, 2.6, 0.2, "K.-O.", "#e0503a", true); await wait(900);
    await panel(`<h2>K.-O.</h2><p>Dans la salle de test, on se relève toujours : PV et PF restaurés.</p><div class="row"><button class="btn main" data-act="ok">Recommencer</button></div>`, {}, { back: "ok" });
    ST.hp = ST.hpMax; ST.fp = ST.fpMax; hud();
  }
  await wipe(true);
  mode = "trans"; B.foes.forEach((f) => arena.remove(f.c.root)); B = null; cmdHint("");
  return res;
}
const alive = () => (B ? B.foes.filter((f) => f.alive) : []);
async function over() { if (!alive().length) { B.done = "win"; return true; } if (ST.hp <= 0) { B.done = "lose"; return true; } return false; }

/* ---------- tour du héros ---------- */
function heroAnchor() { const s = toScreen(B.h.x, 2.2, B.h.z); return { x: s.x + 40, y: s.y }; }
async function heroTurn() {
  while (true) {
    const ground = alive().filter((f) => !f.fly);
    const top = [
      { label: "Saut", icon: "👟", desc: "Saute sur un ennemi. " + KA + " juste avant d'atterrir : tu rebondis pour un 2e coup." },
      { label: "Maillet", icon: "🔨", desc: "Frappe l'ennemi au sol le plus proche. Maintiens " + KA + ", relâche quand les 4 lumières sont allumées.", off: !ground.length },
      { label: "Spécial", icon: "✿", sub: ST.fp + " PF", desc: "Techniques qui coûtent des PF." },
      { label: "Objets", icon: "🎒", desc: "Baies, éther, bombes.", off: !Object.values(ST.items).some((n) => n > 0) },
      { label: "Tactique", icon: "⚑", desc: "Se défendre ou fuir." }
    ];
    const c = await choose(top, { at: heroAnchor, noBack: true, start: B.last || 0 }); B.last = c;
    if (c === 0) { const t = await pickTarget(alive(), (f) => (f.spiky ? " ⚠ piquants !" : "")); if (!t) continue; await jumpOn(t); return; }
    if (c === 1) { await malletOn(ground.sort((a, b) => a.slot - b.slot)[0]); return; }
    if (c === 2) {
      const sp = [
        { label: "Saut puissant", icon: "💥", sub: "2 PF", desc: "Un seul saut très fort : 3 dégâts si la commande est réussie.", off: ST.fp < 2 },
        { label: "Maillet tourbillon", icon: "🌀", sub: "3 PF", desc: "Frappe tous les ennemis au sol. Maintiens puis relâche " + KA + ".", off: ST.fp < 3 || !ground.length }
      ];
      const s = await choose(sp, { at: heroAnchor, list: true }); if (s < 0) continue;
      if (s === 0) { const t = await pickTarget(alive(), (f) => (f.spiky ? " ⚠ piquants !" : "")); if (!t) continue; ST.fp -= 2; hud(); await jumpOn(t, false, true); return; }
      ST.fp -= 3; hud(); await spinMallet(); return;
    }
    if (c === 3) {
      const ids = Object.keys(ITEMS).filter((k) => ST.items[k] > 0);
      const s = await choose(ids.map((k) => ({ label: ITEMS[k].name, icon: ITEMS[k].icon, sub: "x" + ST.items[k], desc: ITEMS[k].desc })), { at: heroAnchor, list: true });
      if (s < 0) continue;
      const id = ids[s]; ST.items[id]--;
      if (id === "bombe") { bHero.pop(-0.2); await wait(250); for (const f of alive()) { hitFoe(f, 3, true); } await wait(500); }
      else { ITEMS[id].use(); SFX.heal(); floatText(B.h.x, 2.4, 0.2, id === "baie" ? "+5 PV" : "+5 PF", id === "baie" ? "#e0503a" : "#4a8ad0"); await wait(600); }
      hud(); return;
    }
    if (c === 4) {
      const s = await choose([{ label: "Se défendre", icon: "🛡", desc: "+1 défense jusqu'à ton prochain tour." }, { label: "Fuir", icon: "💨", desc: "Martèle " + KA + " pour t'enfuir." }], { at: heroAnchor, list: true });
      if (s < 0) continue;
      if (s === 0) { B.h.guard = true; floatText(B.h.x, 2.4, 0.2, "En garde", "#4a8ad0"); SFX.guard(); await wait(500); return; }
      const g = await cmdMash(1500, "Martèle " + KA + " pour fuir !");
      if (g >= 0.55) { floatText(B.h.x, 2.4, 0.2, "Fuite !", "#3a2618"); bHero.setFace(-1); await tween(B.h, { x: -9 }, 500, EASE.in); return "flee"; }
      floatText(B.h.x, 2.4, 0.2, "Raté…", "#e0503a"); SFX.miss(); await wait(400); return;
    }
  }
}
function pickTarget(list, note) {
  uiBusy++; let i = 0;
  const lab = () => cmdHint(`Cible : <b>${list[i].name}</b> · ${list[i].hp}/${list[i].max} PV${note ? note(list[i]) : ""}`);
  B.cursor = list[0]; lab();
  return new Promise((res) => {
    const done = (v) => { off(); B.cursor = null; cmdHint(""); uiBusy--; res(v); };
    const off = onKey((k) => {
      if (k === "left" || k === "up") { i = (i - 1 + list.length) % list.length; B.cursor = list[i]; SFX.move(); lab(); }
      else if (k === "right" || k === "down") { i = (i + 1) % list.length; B.cursor = list[i]; SFX.move(); lab(); }
      else if (k === "a") { SFX.ok(); done(list[i]); }
      else if (k === "b" || k === "menu") { SFX.back(); done(null); }
      return true;
    });
  });
}
function rate(i, f) { floatText(f.x, foeTop(f) + 0.6, f.z, RATE[Math.min(i, RATE.length - 1)], "#f6c343"); SFX.nice(); }
const foeTop = (f) => f.y + f.c.h * 0.85;
function hitFoe(f, dmg, pierce) {
  const d = pierce ? dmg : Math.max(0, dmg - f.def);
  f.hp = Math.max(0, f.hp - d); f.flash = 0.25; f.c.pop(0.3); damageStar(f.x, foeTop(f) + 0.3, f.z, d);
  if (d > 0) SFX.hit(); else tone(220, 0.08, "square", 0.04);
  if (f.hp <= 0 && f.alive) { f.alive = false; run(500, (p) => { f.c.root.scale.setScalar(1 - p); f.c.card.rotation.z = p * 2.5; }).then(() => (f.c.root.visible = false)); }
  return d;
}
function hurtHero(dmg, res) {
  let d = Math.max(0, dmg - (B.h.guard ? 1 : 0) - (res === "garde" ? 1 : 0));
  if (res === "contre") d = 0;
  if (OPT.god) d = 0;
  ST.hp = Math.max(0, ST.hp - d); hud();
  if (res === "contre") { SFX.contre(); floatText(B.h.x, 2.5, 0.2, "Contre !", "#5aa05a", true); }
  else if (res === "garde") { SFX.guard(); floatText(B.h.x, 2.5, 0.2, "Garde !", "#4a8ad0"); }
  if (res !== "contre") { if (d > 0) SFX.hurt(); damageStar(B.h.x, 2.1, 0.2, d); bHero.pop(0.3); }
  return d;
}
// saut en arc parabolique jusqu'au sommet de la cible
async function arcTo(o, x, y, ms, h) { const x0 = o.x, y0 = o.y; await run(ms, (p) => { o.x = lerp(x0, x, p); o.y = lerp(y0, y, p) + Math.sin(p * Math.PI) * h; }); }
async function jumpOn(f, free, power) {
  bHero.setFace(1); SFX.jump(); bHero.pop(-0.2);
  const top = foeTop(f);
  const cmd = free ? Promise.resolve(false) : cmdTimed(560, f, "Appuie sur " + KA + " juste avant d'atterrir !");
  await arcTo(B.h, f.x - 0.1, top, 560, 2.4);
  const ok = await cmd;
  if (f.spiky) { SFX.hurt(); floatText(f.x, top + 1, f.z, "Aïe, des piquants !", "#e0503a"); hurtHero(1, ""); await arcTo(B.h, HX, 0, 600, 1.4); return; }
  bHero.pop(0.3);
  if (power) { hitFoe(f, ok ? 3 : 1); if (ok) rate(1, f); else SFX.miss(); }
  else {
    hitFoe(f, 1);
    if (ok && f.alive) {
      rate(0, f);
      const c2 = cmdTimed(480, f, "Encore " + KA + " !");
      await arcTo(B.h, f.x - 0.1, top, 480, 1.6); const ok2 = await c2; bHero.pop(0.3);
      hitFoe(f, 1); if (ok2) rate(1, f);
    } else if (!ok && !free) SFX.miss();
  }
  await arcTo(B.h, HX, 0, 560, 1.6); bHero.pop(0.2);
}
async function walkTo(x) { const x0 = B.h.x; bHero.setFace(x > x0 ? 1 : -1); B.walking = true; await run(Math.abs(x - x0) * 170 + 60, (p) => (B.h.x = lerp(x0, x, p))); B.walking = false; bHero.setFace(1); }
function malletPose(a) { bMallet.visible = true; bMallet.position.set(0.35 * (bHero.h / 1.55), 0.7 * (bHero.h / 1.55), 0.02); bMallet.rotation.z = -a; }
async function malletOn(f, free) {
  await walkTo(f.x - 1.15);
  let ok = false;
  if (!free) ok = await cmdHold("Maintiens " + KA + ", relâche quand les 4 lumières brillent !", (p) => malletPose(lerp(-0.4, -1.3, clamp(p, 0, 1))));
  await run(110, (p) => malletPose(lerp(-1.3, 1.9, p)));
  hitFoe(f, ok ? 2 : 1); if (ok) rate(0, f); else if (!free) SFX.miss();
  await wait(250); bMallet.visible = false; await walkTo(HX);
}
async function spinMallet() {
  const ok = await cmdHold("Maintiens " + KA + ", relâche au maximum !", (p) => { malletPose(lerp(-0.4, -1.3, clamp(p, 0, 1))); bHero.card.rotation.y = p * 0.6; });
  B.spin = true;
  await run(500, (p) => { bHero.rot = p * TAU * 2; bHero.card.rotation.y = bHero.rot; malletPose(1.2); });
  bHero.rot = bHero.rotTo = 0; B.spin = false;
  for (const f of alive().filter((f) => !f.fly)) hitFoe(f, ok ? 2 : 1);
  if (ok) floatText(1.5, 3, 0.2, "Super !", "#f6c343"); else SFX.miss();
  await wait(300); bMallet.visible = false;
}

/* ---------- commandes d'action ---------- */
// appuyer au bon moment : un anneau se referme sur la cible
function cmdTimed(dur, f, label) {
  dur *= SLOW();
  const t0 = now(), tEnd = t0 + dur, win = 140 * SLOW();
  let res = null;
  B.prompt = { kind: "timed", t0, tEnd, f, win };
  cmdHint(label);
  return new Promise((done) => {
    const off = onKey((k, t) => { if (k !== "a" || res !== null) return k === "a"; res = t >= tEnd - win && t <= tEnd + 60 * SLOW(); B.prompt.res = res; return true; });
    setTimeout(() => { off(); if (OPT.auto) res = true; B.prompt = null; cmdHint(""); done(!!res); }, dur + 70 * SLOW());
  });
}
// maintenir A : 4 lumières s'allument, relâcher quand la 4e brille
function cmdHold(label, onP) {
  const step = 260 * SLOW(), tol = 330 * SLOW();
  cmdHint(label); B.prompt = { kind: "hold", p: 0, start: 0 };
  return new Promise((done) => {
    let started = 0, fin = false; const t00 = now();
    const end = (ok) => { if (fin) return; fin = true; off(); offR(); B.prompt = null; cmdHint(""); done(OPT.auto || ok); };
    const off = onKey((k, t) => { if (k === "a" && !started) started = t; return k === "a"; });
    const offR = onRelease((k, t) => { if (k === "a" && started) { const p = (t - started) / (step * 4); end(p >= 0.97 && t - started <= step * 4 + tol); } });
    (function tick() {
      if (fin) return;
      if (!started && held.a) started = now();
      if (OPT.auto && !started) started = now();
      if (started) { const e = now() - started, p = e / (step * 4); B.prompt.p = p; B.prompt.start = started; onP && onP(p); if (Math.floor(p * 4) !== B.prompt.lit && p < 1.01) { B.prompt.lit = Math.floor(p * 4); SFX.charge(p); } if (OPT.auto && p >= 1) { end(true); return; } if (e > step * 4 + tol) { B.prompt.over = true; end(false); return; } }
      else if (now() - t00 > 4000) { end(false); return; }
      requestAnimationFrame(tick);
    })();
  });
}
function cmdMash(dur, label) {
  dur *= SLOW(); let g = 0, last = now(); const t0 = last;
  cmdHint(label); B.prompt = { kind: "mash", g: 0, t0, dur };
  return new Promise((done) => {
    const off = onKey((k) => { if (k === "a") { g = Math.min(1, g + 0.1); tone(400 + g * 600, 0.03, "square", 0.02); return true; } return false; });
    (function tick() { const t = now(); g = Math.max(0, g - ((t - last) / 1000) * 0.3); last = t; if (OPT.auto) g = 1; B.prompt.g = g; if (t - t0 >= dur) { off(); B.prompt = null; cmdHint(""); done(g); return; } requestAnimationFrame(tick); })();
  });
}

/* ---------- garde (A) et contre (B) au moment de l'impact ---------- */
let DEF = null;
onKey((k, t) => { if (!DEF || (k !== "a" && k !== "b")) return false; if (DEF.first === null) { DEF.first = { k, t }; } return true; });
function openDef(tImpact) { DEF = { t: tImpact, first: null }; B.alertT = tImpact; }
async function closeDef() {
  await wait(50);
  const d = DEF; DEF = null; B.alertT = 0; if (!d) return "";
  if (OPT.auto) return Math.random() < 0.5 ? "garde" : "contre";
  if (!d.first) return "";
  const dt = d.first.t - d.t, gw = 170 * SLOW(), cw = 80 * SLOW();
  if (d.first.k === "b" && dt >= -cw && dt <= 50) return "contre";
  if (d.first.k === "a" && dt >= -gw && dt <= 50) return "garde";
  return "";   // trop tôt : seul le premier appui compte
}
async function enemyPhase() {
  for (const f of B.foes) {
    if (!f.alive || ST.hp <= 0) continue;
    if (f.stun > 0) { f.stun--; continue; }
    await foeAttack(f); await wait(160);
  }
}
async function foeAttack(f) {
  const type = f.E.atkType, h = B.h;
  if (B.foes.indexOf(f) === 0 && !B.tipDone) { B.tipDone = true; cmdHint(KA + " juste avant le choc : garde · " + KB + " pile au dernier moment : contre"); }
  let res;
  if (type === "dive") {
    await tween(f, { y: f.y + 1 }, 300, EASE.out); f.c.pop(-0.2); await wait(150);
    const ms = 380 * SLOW(); openDef(now() + ms);
    await tween(f, { x: h.x + 0.9, y: 0.6 }, 380, EASE.in);
  } else if (type === "slam") {
    await walkFoe(f, h.x + 1.3); await tween(f, { y: 0.9 }, 280, EASE.out); await wait(120);
    const ms = 200 * SLOW(); openDef(now() + ms); await tween(f, { y: 0 }, 200, EASE.in);
  } else if (type === "roll") {
    f.c.pop(0.2); await wait(260);
    const ms = 480 * SLOW(); openDef(now() + ms);
    await run(480, (p) => { f.x = lerp(f.hx, h.x + 0.9, EASE.in(p)); f.c.card.rotation.z = p * TAU * 1.5; });
    f.c.card.rotation.z = 0;
  } else {
    await run(320, (p) => (f.x = f.hx + Math.sin(p * Math.PI) * 0.35)); f.c.pop(0.25); await wait(120);
    const ms = 400 * SLOW(); openDef(now() + ms);
    await tween(f, { x: h.x + 0.9 }, 400, EASE.in);
  }
  res = await closeDef();
  cmdHint("");
  hurtHero(f.atk, res);
  if (res === "contre") { hitFoe(f, 1, true); f.c.setFace(1); }
  else { bHero.root.position.x -= 0.2; }
  await Promise.all([tween(f, { x: f.hx, y: f.hy }, res === "contre" ? 300 : 420, EASE.out)]);
  f.c.setFace(-1);
}
async function walkFoe(f, x) { f.walking = true; await tween(f, { x }, Math.abs(f.x - x) * 160, EASE.io); f.walking = false; }

/* ---------- mise à jour et dessin du combat ---------- */
function updateBattle(dt) {
  camera.position.set(0.6, 3.1, 12.4); camLook.set(0.6, 1.35, 0); camera.lookAt(camLook);
  bHero.root.position.set(B.h.x, 0, B.h.z); bHero.lift = B.h.y; if (!B.spin) bHero.update(dt, !!B.walking, 1); else bHero.update(dt, false);
  for (const f of B.foes) {
    f.c.root.position.set(f.x, 0, f.z); f.c.lift = f.y + (f.fly && f.alive ? Math.sin(f.c.t * 3) * 0.12 : 0);
    f.c.frame = f.E.frames ? f.c.t * 6 : 0; f.flash = Math.max(0, f.flash - dt);
    f.c.tint = f.flash > 0 && Math.floor(f.flash * 30) % 2 ? 1.6 : 1;
    f.c.update(dt, !!f.walking, 1);
  }
}
function drawOverlay(dt) {
  oc.setTransform(DPR, 0, 0, DPR, 0, 0); oc.clearRect(0, 0, VW, VH);
  oc.lineJoin = oc.lineCap = "round";
  if (mode === "world") {
    for (const e of WE) if (e.alert > 0) { const s = toScreen(e.x, e.c.lift + e.c.h + 0.4, e.z); bubble(s.x, s.y, "!", "#e0503a"); }
  }
  if (B && mode === "battle") {
    // PV des ennemis (option)
    if (OPT.hpBars) for (const f of B.foes) if (f.alive) { const s = toScreen(f.x, -0.1, f.z), w = 46; oc.fillStyle = "#fff"; roundRect(s.x - w / 2 - 3, s.y + 4, w + 6, 12, 6); oc.fill(); oc.fillStyle = "#e9dcc3"; roundRect(s.x - w / 2, s.y + 7, w, 6, 3); oc.fill(); oc.fillStyle = f.hp / f.max > 0.35 ? "#5aa05a" : "#e0503a"; roundRect(s.x - w / 2, s.y + 7, w * f.hp / f.max, 6, 3); oc.fill(); }
    if (B.cursor) { const f = B.cursor, s = toScreen(f.x, foeTop(f) + 0.75, f.z), b = Math.sin(now() / 120) * 5; paperArrow(s.x, s.y + b); }
    const p = B.prompt;
    if (p && p.kind === "timed") {
      const s = toScreen(p.f.x, foeTop(p.f) + 0.1, p.f.z), left = Math.max(0, (p.tEnd - now()) / (p.tEnd - p.t0)), r = 14 + left * 60;
      oc.lineWidth = 7; oc.strokeStyle = "#fff"; oc.beginPath(); oc.arc(s.x, s.y, r, 0, TAU); oc.stroke();
      oc.lineWidth = 4; oc.strokeStyle = p.res === true ? "#5aa05a" : p.res === false ? "#e0503a" : "#f6c343"; oc.beginPath(); oc.arc(s.x, s.y, r, 0, TAU); oc.stroke();
      if (OPT.windows) { oc.lineWidth = 2; oc.strokeStyle = "rgba(90,160,90,.8)"; const rw = 14 + (p.win / (p.tEnd - p.t0)) * 60; oc.beginPath(); oc.arc(s.x, s.y, rw, 0, TAU); oc.stroke(); }
      btnGlyph(s.x + 40, s.y - 40, "A");
    } else if (p && p.kind === "hold") {
      const s = toScreen(B.h.x, 2.6, B.h.z), lit = clamp(Math.floor(p.p * 4), 0, 4);
      for (let i = 0; i < 4; i++) { const x = s.x - 45 + i * 30, on = i < lit, last = i === 3 && lit >= 4; oc.fillStyle = "#fff"; star(x, s.y, 14, 6); oc.fill(); oc.fillStyle = last ? (Math.floor(now() / 70) % 2 ? "#fff6c0" : "#f6c343") : on ? "#f6c343" : "#d8cbb4"; star(x, s.y, 11, 4.6); oc.fill(); }
      btnGlyph(s.x + 85, s.y, "A");
    } else if (p && p.kind === "mash") {
      const s = toScreen(B.h.x, 2.6, B.h.z), w = 120;
      oc.fillStyle = "#fff"; roundRect(s.x - w / 2 - 4, s.y - 10, w + 8, 20, 10); oc.fill(); oc.fillStyle = "#e9dcc3"; roundRect(s.x - w / 2, s.y - 6, w, 12, 6); oc.fill();
      oc.fillStyle = p.g >= 0.55 ? "#5aa05a" : "#e0503a"; roundRect(s.x - w / 2, s.y - 6, w * p.g, 12, 6); oc.fill();
      btnGlyph(s.x + w / 2 + 26, s.y - (Math.floor(now() / 80) % 2) * 4, "A");
    }
    if (B.alertT && (OPT.windows || isTouch && false)) { const lt = B.alertT - now(); if (lt < 260 && lt > -40) bubble(toScreen(B.h.x, 2.3, 0.2).x, toScreen(B.h.x, 2.3, 0.2).y, "!", "#e0503a"); }
  }
  // textes flottants et étoiles de dégâts
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i]; f.t += dt; if (f.t > 1.1) { floats.splice(i, 1); continue; }
    const s = toScreen(f.x, f.y, f.z), rise = Math.min(1, f.t * 4) * 18, pop = f.t < 0.12 ? 1 + (0.12 - f.t) * 4 : 1;
    oc.save(); oc.translate(s.x, s.y - rise); oc.scale(pop, pop); oc.globalAlpha = f.t > 0.85 ? (1.1 - f.t) * 4 : 1;
    if (PIX) {   // chiffres et mots en police pixel de Survivor, sur l'image basse résolution
      oc.restore(); oc.save(); oc.setTransform(1, 0, 0, 1, 0, 0); oc.globalAlpha = f.t > 0.85 ? (1.1 - f.t) * 4 : 1;
      const X = s.x * DPR, Y = (s.y - rise) * DPR;
      if (f.star) { oc.fillStyle = OUTC; oc.beginPath(); oc.arc(Math.round(X), Math.round(Y), 9, 0, TAU); oc.fill(); oc.fillStyle = f.txt === "0" ? "#8a929a" : "#e8873a"; oc.beginPath(); oc.arc(Math.round(X), Math.round(Y), 8, 0, TAU); oc.fill(); pxText(oc, f.txt, X + 1, Y - 5, "#fdf3de", 2, "c"); }
      else pxText(oc, f.txt, X, Y - 4, f.col, f.big || pop > 1.05 ? 2 : 1, "c");
      oc.restore(); continue;
    }
    if (f.star) {
      oc.fillStyle = "#fff"; star(0, 0, 30, 15); oc.fill(); oc.fillStyle = f.txt === "0" ? "#a8a0a0" : "#f6c343"; star(0, 0, 25, 12.5); oc.fill();
      oc.fillStyle = "#3a2618"; oc.font = "900 24px Nunito, sans-serif"; oc.textAlign = "center"; oc.textBaseline = "middle"; oc.fillText(f.txt, 0, 2);
    } else {
      oc.font = `900 ${f.big ? 30 : 21}px Nunito, sans-serif`; oc.textAlign = "center"; oc.textBaseline = "middle";
      oc.lineWidth = 8; oc.strokeStyle = "#fff"; oc.strokeText(f.txt, 0, 0); oc.fillStyle = f.col; oc.fillText(f.txt, 0, 0);
    }
    oc.restore();
  }
}
function roundRect(x, y, w, h, r) { oc.beginPath(); oc.roundRect(x, y, Math.max(0, w), h, Math.min(r, Math.max(0, w) / 2)); }
function star(x, y, R, r) { oc.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r : R; oc.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } oc.closePath(); }
function bubble(x, y, t, col) { if (PIX) { oc.save(); oc.setTransform(1, 0, 0, 1, 0, 0); pxText(oc, t, x * DPR, y * DPR - 8, "#f6d36b", 2, "c"); oc.restore(); return; } oc.fillStyle = "#fff"; oc.beginPath(); oc.arc(x, y, 15, 0, TAU); oc.fill(); oc.fillStyle = col; oc.font = "900 22px Nunito, sans-serif"; oc.textAlign = "center"; oc.textBaseline = "middle"; oc.fillText(t, x, y + 1); }
function paperArrow(x, y) { oc.fillStyle = "#fff"; oc.beginPath(); oc.moveTo(x - 16, y - 18); oc.lineTo(x + 16, y - 18); oc.lineTo(x, y + 4); oc.closePath(); oc.fill(); oc.fillStyle = "#e0503a"; oc.beginPath(); oc.moveTo(x - 11, y - 15); oc.lineTo(x + 11, y - 15); oc.lineTo(x, y - 1); oc.closePath(); oc.fill(); }
function btnGlyph(x, y, L) { if (PIX) { oc.save(); oc.setTransform(1, 0, 0, 1, 0, 0); const X = Math.round(x * DPR), Y = Math.round(y * DPR); oc.fillStyle = OUTC; oc.beginPath(); oc.arc(X, Y, 7, 0, TAU); oc.fill(); oc.fillStyle = L === "A" ? "#e8873a" : "#9cc56b"; oc.beginPath(); oc.arc(X, Y - (Math.floor(now() / 160) % 2), 6, 0, TAU); oc.fill(); pxText(oc, L, X + 1, Y - 3, OUTC, 1, "c", null); oc.restore(); return; } oc.fillStyle = "#fff"; oc.beginPath(); oc.arc(x, y, 17, 0, TAU); oc.fill(); oc.fillStyle = L === "A" ? "#e0503a" : "#5aa05a"; oc.beginPath(); oc.arc(x, y, 13.5, 0, TAU); oc.fill(); oc.fillStyle = "#fff"; oc.font = "900 17px Nunito, sans-serif"; oc.textAlign = "center"; oc.textBaseline = "middle"; oc.fillText(L, x, y + 1); }

/* =====================================================================
   Salle de test : apparitions, combats directs, réglages
   ===================================================================== */
let spawnN = 1;
async function testPanel() {
  const body = () => `<h2>🧪 Salle de test</h2>
    <h3>Faire apparaître dans la salle</h3>
    <div class="row">${[1, 2, 3].map((n) => `<button class="btn ${n === spawnN ? "on" : ""}" data-act="n" data-n="${n}">Groupe de ${n}</button>`).join("")}</div>
    <div class="row" style="margin-top:8px">${Object.keys(ENEMIES).map((id) => `<button class="btn" data-act="spawn" data-id="${id}">+ ${ENEMIES[id].name}</button>`).join("")}</div>
    <h3>Combat direct</h3>
    <div class="row">${Object.keys(ENEMIES).map((id) => `<button class="btn" data-act="fight" data-id="${id}">⚔ ${ENEMIES[id].name}</button>`).join("")}<button class="btn" data-act="fight" data-id="mix">⚔ Mélange</button></div>
    <h3>Réglages</h3>
    <div class="row">
      <button class="btn ${OPT.auto ? "on" : ""}" data-act="opt" data-k="auto">Commandes auto</button>
      <button class="btn ${OPT.god ? "on" : ""}" data-act="opt" data-k="god">Invincible</button>
      <button class="btn ${OPT.slow ? "on" : ""}" data-act="opt" data-k="slow">Ralenti ×2</button>
      <button class="btn ${OPT.windows ? "on" : ""}" data-act="opt" data-k="windows">Voir les fenêtres de timing</button>
      <button class="btn ${OPT.hpBars ? "on" : ""}" data-act="opt" data-k="hpBars">PV des ennemis</button>
    </div>
    <h3>Direction artistique</h3>
    <div class="row"><button class="btn ${PIX ? "on" : ""}" data-act="da" data-v="pixel">Pixel (Survivor)</button><button class="btn ${PIX ? "" : "on"}" data-act="da" data-v="papier">Papier découpé</button></div>
    <h3>Joueur</h3>
    <div class="row"><button class="btn" data-act="heal">Soigner (PV, PF, objets)</button><button class="btn" data-act="reset">Réinitialiser la salle</button></div>
    <p class="keys"><b>Exploration</b> : ${isTouch ? "joystick" : "flèches / ZQSD"} pour marcher, ${KA} sauter (sur la tête d'un ennemi = premier coup), ${KB} maillet (premier coup aussi), saute sous le bloc ♥ pour te soigner.<br>
    <b>Combat</b> : ${KA} juste avant le choc = garde (−1 dégât), ${KB} pile au dernier moment = contre (0 dégât, l'ennemi est touché). Seul le premier appui compte.</p>
    <div class="row"><button class="btn main" data-act="close">Fermer</button></div>`;
  const el = $("#panel");
  const r = await panel(body(), {
    n: (b) => { spawnN = +b.dataset.n; el.refresh(body()); },
    spawn: (b) => { spawnEnemy(b.dataset.id, spawnN, clamp(P.x + rnd(3, 5), -10, 10.5), rnd(-1.5, 2.5)); return "close"; },
    fight: (b) => "fight:" + b.dataset.id,
    opt: (b) => { OPT[b.dataset.k] = !OPT[b.dataset.k]; el.refresh(body()); },
    heal: () => { ST.hp = ST.hpMax; ST.fp = ST.fpMax; ST.items = { baie: 3, ether: 2, bombe: 1 }; hud(); SFX.heal(); el.refresh(body()); },
    reset: () => { resetRoom(); return "close"; },
    da: (b) => { if ((b.dataset.v === "pixel") === PIX) return; try { localStorage.setItem("papier-da", b.dataset.v); } catch (e) {} location.href = location.pathname + "?da=" + b.dataset.v; },
    close: () => "close"
  }, { back: "close" });
  if (r && r.startsWith("fight:")) {
    const id = r.slice(6), grp = id === "mix" ? ["boulette", "cocotte", "piquant", "carton"].slice(0, Math.max(2, spawnN + 1)) : Array.from({ length: spawnN }, () => id);
    const e = spawnEnemy(grp[0], 1, P.x + 2, P.z); e.group = grp; startFight(e, null);
  }
}

/* =====================================================================
   Boucle
   ===================================================================== */
hud(); $("#hud").hidden = false; $("#btn-test").hidden = false;
resetRoom();
let last = now();
function frame() {
  const t = now(), dt = Math.min(0.05, (t - last) / 1000) / SLOW(); last = t;
  stepRuns();
  if (mode === "world" || (mode === "trans" && !B)) { updateWorld(dt); updateCameraWorld(dt); renderer.render(world, camera); }
  else if (B) { updateBattle(dt); renderer.render(arena, camera); }
  drawOverlay(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__PAP = { PIX, get B() { return B; }, get mode() { return mode; }, get DEF() { return DEF; }, ST, P, OPT, WE, spawnEnemy, startFight };
