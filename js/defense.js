/* =========================================================================
   Écureuil Défense — interface : rendu, commandes, menus, sauvegarde
   Données : js/defense-data.js · moteur : js/defense-core.js
   Sprites des bestioles : js/game-data.js (Écureuil Survivor)
   ========================================================================= */
(function () {
  "use strict";
  var VERSION = "0.2.0";
  var stage = document.querySelector("[data-defense]");
  if (!stage || !window.TD_DATA || !window.TD_CORE || !window.ES_DATA) return;
  var D = window.TD_DATA, K = window.TD_CORE, ES = window.ES_DATA, T = D.TOWERS, CFG = D.CFG;
  var $ = function (s) { return stage.querySelector(s); };
  var canvas = $("canvas"), ctx = canvas.getContext("2d");
  var overlay = $("[data-overlay]"), card = $("[data-card]"), hud = $("[data-hud]");
  var shop = $("[data-shop]"), shopGrid = $("[data-shopgrid]"), shopInfo = $("[data-shopinfo]"), upg = $("[data-upg]"), abil = $("[data-abil]");
  var livesEl = $("[data-lives]"), cashEl = $("[data-cash]"), roundEl = $("[data-round]"), goBtnEl = $("[data-go]"), autoEl = $("[data-auto]");
  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* =====================================================================
     Sauvegarde (localStorage)
     ===================================================================== */
  var SAVE_KEY = "td-save-v1";
  var S = { map: "clairiere", mode: "normal", medals: {}, best: {}, mute: false, games: 0, wins: 0 };
  try {
    var raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (raw && typeof raw === "object") Object.keys(raw).forEach(function (k) { if (k in S) S[k] = raw[k]; });
  } catch (e) {}
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }

  /* =====================================================================
     Sprites (contour sombre automatique, comme le Survivor)
     ===================================================================== */
  var OUT = "#2b1709";
  function sprite(rows, pal) {
    var h = rows.length, w = 0, x, y;
    rows.forEach(function (row) { w = Math.max(w, row.length); });
    var W = w + 2, H = h + 2, filled = new Uint8Array(W * H);
    var c = document.createElement("canvas"); c.width = W; c.height = H;
    var g = c.getContext("2d");
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var ch = rows[y][x];
      if (ch && pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x + 1, y + 1, 1, 1); filled[(y + 1) * W + x + 1] = 1; }
    }
    g.fillStyle = OUT;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      if (filled[y * W + x]) continue;
      if ((x > 0 && filled[y * W + x - 1]) || (x < W - 1 && filled[y * W + x + 1]) ||
          (y > 0 && filled[(y - 1) * W + x]) || (y < H - 1 && filled[(y + 1) * W + x])) g.fillRect(x, y, 1, 1);
    }
    function variant(flip, white) {
      var v = document.createElement("canvas"); v.width = W; v.height = H;
      var vg = v.getContext("2d");
      if (flip) { vg.translate(W, 0); vg.scale(-1, 1); }
      vg.drawImage(c, 0, 0);
      if (white) { vg.setTransform(1, 0, 0, 1, 0, 0); vg.globalCompositeOperation = "source-in"; vg.fillStyle = "#fff"; vg.fillRect(0, 0, W, H); }
      return v;
    }
    return { c: c, f: variant(true), wc: variant(false, true), w: W, h: H };
  }
  var SPR = {};
  Object.keys(ES.SPRITES).forEach(function (k) { var d = ES.SPRITES[k]; SPR[k] = d.frames.map(function (f) { return sprite(f, d.pal); }); });
  var SQ = {};
  D.TOWER_ORDER.forEach(function (k) { SQ[k] = ES.SPRITES.sq_noisette.frames.map(function (f) { return sprite(f, T[k].fur); }); });
  var urlCache = {};
  function sqUrl(k) { return towerIcon(k); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n) { n = Math.floor(n); return n >= 100000 ? Math.round(n / 1000) + " k" : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f"); }

  /* =====================================================================
     Sons (synthèse, aucun fichier)
     ===================================================================== */
  var actx = null, sndLast = {};
  function sfx(freq, dur, type, vol, slide) {
    if (S.mute) return;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      var o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
      o.type = type || "square"; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
      g.gain.setValueAtTime(vol || 0.04, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  function arp(notes, step, type, vol) { notes.forEach(function (f, i) { setTimeout(function () { sfx(f, 0.12, type || "square", vol || 0.04); }, i * step); }); }
  function thr(key, ms, fn) { var n = performance.now(); if (n - (sndLast[key] || 0) < ms) return; sndLast[key] = n; fn(); }
  var SND = {
    place: function () { arp([392, 523], 50, "square", 0.04); },
    upgrade: function (t) { arp([523, 659, 784 + t * 60], 55, "triangle", 0.05); },
    sell: function () { arp([660, 440], 60, "square", 0.035); },
    shot: function () { thr("shot", 70, function () { sfx(700 + Math.random() * 200, 0.03, "square", 0.012, 0.6); }); },
    kill: function () { thr("kill", 45, function () { sfx(300 + Math.random() * 300, 0.05, "square", 0.018, 0.5); }); },
    boom: function () { thr("boom", 90, function () { sfx(110, 0.2, "triangle", 0.06, 0.4); }); },
    zap: function () { thr("zap", 80, function () { sfx(1300, 0.06, "sawtooth", 0.018, 0.4); }); },
    leak: function () { thr("leak", 120, function () { sfx(160, 0.25, "sawtooth", 0.05, 0.5); }); },
    round: function () { arp([440, 554, 659], 80, "triangle", 0.04); },
    boss: function () { arp([220, 196, 175, 147], 140, "sawtooth", 0.05); },
    win: function () { arp([523, 659, 784, 1047, 1319], 90, "triangle", 0.06); },
    over: function () { arp([392, 330, 262, 196], 160, "triangle", 0.06); },
    coin: function () { thr("coin", 60, function () { arp([988, 1319], 40, "square", 0.025); }); },
    no: function () { sfx(180, 0.08, "square", 0.03); },
    click: function () { sfx(660, 0.04, "square", 0.025); },
    power: function () { arp([330, 494, 659, 988], 50, "sawtooth", 0.04); },
  };

  /* =====================================================================
     État
     ===================================================================== */
  var W = null;                 // monde en cours
  var state = "menu", paused = false, speed = 1;
  var sel = null, placing = null, ghost = null, hoverType = null, vfx = [], shakeA = 0;
  var view = { scale: 1, ox: 0, oy: 0 };
  var bgCache = {};

  /* ---------- disposition : boutique à droite (écran large) ou en bas (écran haut) ---------- */
  var TOP_H = 40;
  function wideMode() { var cw = stage.clientWidth, ch = stage.clientHeight; return cw / ch > 1.15 || cw > 900; }
  function layout() {
    var cw = stage.clientWidth, ch = stage.clientHeight, wide = wideMode();
    stage.classList.toggle("td-wide", wide); stage.classList.toggle("td-tall", !wide);
    var sw = 0, sh = 0, top = 0;
    // écran haut : la carte prend toute la largeur, la boutique / les améliorations prennent tout le reste en bas
    if (!wide) stage.style.setProperty("--td-bottom", Math.max(190, Math.floor(ch - TOP_H - (cw - 8) * CFG.H / CFG.W - 8)) + "px");
    if (state === "play") { top = TOP_H; if (wide) sw = shop.offsetWidth; else sh = shop.offsetHeight; }
    var fw = cw - sw, fh = ch - sh - top, pad = 4;
    view.scale = Math.min((fw - pad * 2) / CFG.W, (fh - pad * 2) / CFG.H);
    view.ox = (fw - CFG.W * view.scale) / 2; view.oy = top + (fh - CFG.H * view.scale) / 2;
    view.fw = fw; view.fh = fh; view.top = top; view.sh = sh; view.sw = sw;
    stage.style.setProperty("--td-field-w", fw + "px");
    stage.style.setProperty("--td-shop-h", sh + "px");
  }
  function resize() {
    var dpr = window.devicePixelRatio || 1, cw = stage.clientWidth, ch = stage.clientHeight;
    canvas.width = Math.max(1, Math.round(cw * dpr)); canvas.height = Math.max(1, Math.round(ch * dpr));
    canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
    layout();
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);

  /* =====================================================================
     Décor de la carte (pré-rendu)
     ===================================================================== */
  var STYLE = {
    dirt: { g1: "#5b8a4a", g2: "#4f7d44", g3: "#6e9d5a", p: "#c9a36a", pe: "#8a6a3b", pd: "#b38c56" },
    moss: { g1: "#4f7d44", g2: "#436f3b", g3: "#5f8f4f", p: "#b8a77a", pe: "#6b5a3a", pd: "#a3925f" },
    swamp: { g1: "#4a6a3a", g2: "#3f5d33", g3: "#5a7a44", p: "#8a7a5a", pe: "#4a3a2a", pd: "#7a6a4a" },
  };
  function seeded(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return function () { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; }; }
  function bakeMap(map) {
    if (bgCache[map.id]) return bgCache[map.id];
    var c = document.createElement("canvas"); c.width = CFG.W; c.height = CFG.H;
    var g = c.getContext("2d"), st = STYLE[map.style] || STYLE.dirt, R = seeded(map.id);
    g.imageSmoothingEnabled = false;
    g.fillStyle = st.g1; g.fillRect(0, 0, CFG.W, CFG.H);
    for (var i = 0; i < 900; i++) { g.fillStyle = R() < 0.5 ? st.g2 : st.g3; g.fillRect((R() * CFG.W) | 0, (R() * CFG.H) | 0, 2, 1 + ((R() * 2) | 0)); }
    for (i = 0; i < 40; i++) { var fx = (R() * CFG.W) | 0, fy = (R() * CFG.H) | 0; g.fillStyle = ["#f6d36b", "#f29a85", "#e6f6fa", "#c9b3ff"][(R() * 4) | 0]; g.fillRect(fx, fy, 1, 1); g.fillStyle = st.g3; g.fillRect(fx, fy + 1, 1, 1); }
    // eau
    map.water.forEach(function (poly) {
      g.beginPath(); poly.forEach(function (p, j) { if (j) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.closePath();
      g.fillStyle = "#2a5a7a"; g.fill(); g.lineWidth = 3; g.strokeStyle = "#7a9a6a"; g.stroke();
      g.save(); g.clip(); g.fillStyle = "#3a7aa0"; g.fill();
      for (var k = 0; k < 30; k++) { g.fillStyle = "rgba(230,246,250,.35)"; g.fillRect((R() * CFG.W) | 0, (R() * CFG.H) | 0, 4, 1); }
      g.restore();
    });
    // chemins
    function stroke(pts, wdt, col) {
      g.beginPath(); pts.forEach(function (p, j) { if (j) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
      g.lineWidth = wdt; g.strokeStyle = col; g.lineJoin = "round"; g.lineCap = "round"; g.stroke();
    }
    map.paths.forEach(function (p) { stroke(p, CFG.pathW + 4, st.pe); });
    map.paths.forEach(function (p) { stroke(p, CFG.pathW, st.p); });
    map.paths.forEach(function (p) { stroke(p, 2, st.pd); });
    for (i = 0; i < 260; i++) {
      var pp = map.paths[i % map.paths.length], pb = K.buildPath(pp), q = K.pathPos(pb, R() * pb.len);
      g.fillStyle = R() < 0.5 ? st.pd : st.pe; g.fillRect((q.x + (R() - 0.5) * 14) | 0, (q.y + (R() - 0.5) * 14) | 0, 1, 1);
    }
    // rochers et arbres
    map.rocks.forEach(function (r) {
      g.fillStyle = "#4a4540"; g.beginPath(); g.ellipse(r[0], r[1] + 2, r[2], r[2] * 0.8, 0, 0, 7); g.fill();
      g.fillStyle = "#8a857e"; g.beginPath(); g.ellipse(r[0], r[1], r[2] - 1, r[2] * 0.75, 0, 0, 7); g.fill();
      g.fillStyle = "#b8b2a8"; g.fillRect(r[0] - r[2] * 0.4, r[1] - r[2] * 0.4, r[2] * 0.5, 2);
    });
    map.trees.forEach(function (t) {
      g.fillStyle = "rgba(20,30,15,.35)"; g.beginPath(); g.ellipse(t[0], t[1] + 8, 13, 5, 0, 0, 7); g.fill();
      g.fillStyle = "#6b4430"; g.fillRect(t[0] - 2, t[1], 4, 8);
      [["#2f4f2a", 0, -2, 12], ["#3f6b3a", -2, -4, 10], ["#5b8a4a", -3, -6, 6]].forEach(function (l) { g.fillStyle = l[0]; g.beginPath(); g.arc(t[0] + l[1], t[1] + l[2] - 4, l[3], 0, 7); g.fill(); });
    });
    // réserve de noisettes au bout de chaque chemin, terrier au départ
    map.paths.forEach(function (p) {
      var e = p[p.length - 1], b = p[0];
      var ex = Math.max(10, Math.min(CFG.W - 10, e[0])), ey = Math.max(12, Math.min(CFG.H - 6, e[1]));
      var bs = SPR.basket[0]; g.drawImage(bs.c, Math.round(ex - bs.w / 2), Math.round(ey - bs.h / 2));
      var bx = Math.max(8, Math.min(CFG.W - 8, b[0])), by = Math.max(8, Math.min(CFG.H - 8, b[1]));
      g.fillStyle = "#2b1709"; g.beginPath(); g.ellipse(bx, by, 8, 5, 0, 0, 7); g.fill();
    });
    return (bgCache[map.id] = c);
  }
  function mapThumb(id) {
    var key = "t" + id; if (urlCache[key]) return urlCache[key];
    return (urlCache[key] = bakeMap(K.mapById(id)).toDataURL());
  }

  /* =====================================================================
     Rendu
     ===================================================================== */
  function font(sz, w) { ctx.font = (w || 900) + " " + sz + "px Nunito, system-ui, sans-serif"; }
  function text(str, x, y, color, align, sz) {
    font(sz || 6); ctx.textAlign = align || "left"; ctx.textBaseline = "middle";
    ctx.lineWidth = Math.max(1.4, (sz || 6) / 3.2); ctx.strokeStyle = OUT; ctx.lineJoin = "round"; ctx.strokeText(str, x, y);
    ctx.fillStyle = color || "#fdf3de"; ctx.fillText(str, x, y);
  }
  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
  function circle(x, y, r, fill, stroke, lw) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lw || 1; ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function drawSpr(s, x, y, flip, white) { ctx.drawImage(white ? s.wc : (flip ? s.f : s.c), Math.round(x), Math.round(y)); }

  function render() {
    var dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#1f3a2b"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    if (!W) { drawMenuBg(dpr); return; }
    var s = view.scale * dpr, sx = 0, sy = 0;
    if (shakeA > 0.3 && !REDUCED) { sx = (Math.random() - 0.5) * shakeA * 2; sy = (Math.random() - 0.5) * shakeA * 2; }
    ctx.setTransform(s, 0, 0, s, (view.ox + sx * view.scale) * dpr, (view.oy + sy * view.scale) * dpr);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, CFG.W, CFG.H); ctx.clip();
    ctx.drawImage(bakeMap(W.map), 0, 0);
    // portée de la tour choisie
    if (sel && W.towers.indexOf(sel) >= 0 && sel.st.range < 5000) {
      circle(sel.x, sel.y, sel.st.range, "rgba(253,243,222,.13)", "rgba(253,243,222,.6)", 1);
    }
    if (sel && sel.st && sel.st.cmdR) circle(sel.x, sel.y, sel.st.cmdR, null, "rgba(246,211,107,.5)", 0.8);
    // tours
    var drawList = W.towers.map(function (t) { return { y: t.y, f: function () { drawTower(t); } }; });
    W.enemies.forEach(function (e) { drawList.push({ y: e.y, f: function () { drawEnemy(e); } }); });
    drawList.sort(function (a, b) { return a.y - b.y; }).forEach(function (o) { o.f(); });
    W.projs.forEach(drawProj);
    drawVfx();
    // fantôme de placement
    if (placing && ghost) {
      var err = K.placeError(W, placing, ghost.x, ghost.y), afford = W.cash >= K.towerCost(W, placing);
      var ok = !err && afford, rg = T[placing].base.range;
      if (rg < 5000) circle(ghost.x, ghost.y, rg, ok ? "rgba(253,243,222,.15)" : "rgba(200,85,61,.22)", ok ? "rgba(253,243,222,.7)" : "rgba(242,154,133,.8)", 1);
      circle(ghost.x, ghost.y, CFG.towerR, ok ? "rgba(156,208,106,.35)" : "rgba(200,85,61,.45)");
      ctx.globalAlpha = 0.9; ctx.save(); ctx.translate(ghost.x, ghost.y); ctx.scale(1.2, 1.2); art(ctx, placing, [0, 0, 0], 0, 0, -0.5, W.t, false); ctx.restore(); ctx.globalAlpha = 1;
      if (err || !afford) text(err || "Pas assez de noisettes", ghost.x, ghost.y - 18, "#f29a85", "center", 6);
    }
    ctx.restore();
    // bandeau en haut du terrain
    if (W.running && W.round % 10 === 0) {
      var b = W.enemies.filter(function (e) { return e.d.boss; })[0];
      if (b) {
        rect(CFG.W / 2 - 80, 4, 160, 9, OUT); rect(CFG.W / 2 - 79, 5, 158 * Math.max(0, b.hp / b.max), 7, "#c8553d");
        text(b.d.name.toUpperCase() + " · " + fmt(b.hp), CFG.W / 2, 8.5, "#fdf3de", "center", 5.5);
      }
    }
    if (paused && state === "play") { ctx.fillStyle = "rgba(20,12,6,.35)"; ctx.fillRect(0, 0, CFG.W, CFG.H); }
  }
  var menuT = 0;
  function drawMenuBg(dpr) {
    menuT += 1 / 60;
    var cw = canvas.width, ch = canvas.height, sc = Math.max(2, Math.round(Math.min(cw, ch) / 200));
    var bg = bakeMap(K.mapById(S.map));
    var s = Math.max(cw / CFG.W, ch / CFG.H);
    ctx.globalAlpha = 0.55; ctx.drawImage(bg, (cw - CFG.W * s) / 2, (ch - CFG.H * s) / 2, CFG.W * s, CFG.H * s); ctx.globalAlpha = 1;
    ctx.save(); ctx.setTransform(sc, 0, 0, sc, 0, 0);
    D.TOWER_ORDER.forEach(function (k, i) { art(ctx, k, [0, 0, 0], (cw / sc) * (i + 0.5) / D.TOWER_ORDER.length, ch / sc - 8, Math.sin(menuT + i), menuT + i, false); });
    ctx.restore();
  }

  /* =====================================================================
     Apparence des tours : chaque tour a sa silhouette, qui change avec les améliorations
     (dessin en pixels, pieds de la tour en x, y ; ang = direction de la cible)
     ===================================================================== */
  var BASE = { noisette: "#c98d4a", braise: "#6a2a1a", rafale: "#3f8f8a", givre: "#bfe8ff", eclair: "#8a857e", guetteur: "#6b5a3a", chene: "#2f4f2a", pepite: "#e0a82a" };
  function R(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function El(g, x, y, rx, ry, c) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, 7); g.fill(); }
  function Poly(g, pts, c, out) { g.beginPath(); pts.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.closePath(); if (out) { g.lineWidth = 2; g.strokeStyle = OUT; g.lineJoin = "round"; g.stroke(); } g.fillStyle = c; g.fill(); }
  function barrel(g, len, wid, col, hi, off) {
    R(g, -1, off - wid / 2 - 1, len + 2, wid + 2, OUT);
    R(g, 0, off - wid / 2, len, wid, col);
    R(g, 0, off - wid / 2, len, Math.max(1, wid / 3), hi);
  }
  var ART = {
    noisette: function (g, tr, x, y, ang, t, fire) {
      var flip = Math.cos(ang) < 0, fr = SQ.noisette[fire ? 1 : Math.floor(t * 2) % 2], d = flip ? -1 : 1;
      if (tr[2] >= 3) { R(g, x - 7, y - 9, 14, 6, tr[2] >= 5 ? "#5a2a6a" : "#2f4f2a"); R(g, x - 6, y - 8, 12, 4, tr[2] >= 5 ? "#8a4aa8" : "#5b8a4a"); } // cape
      g.drawImage(flip ? fr.f : fr.c, Math.round(x - fr.w / 2), Math.round(y - fr.h + 3));
      var hx = x + d * 6, hy = y - 7;
      // fronde (Y)
      R(g, hx - 0.5, hy - 1, 1, 5, "#6b4430"); R(g, hx - 2, hy - 3, 1, 3, "#6b4430"); R(g, hx + 1, hy - 3, 1, 3, "#6b4430");
      if (tr[1] >= 3) { R(g, x - 5, y - 7, 10, 1.5, "#4a2a10"); R(g, x - 3, y - 7, 1, 1, "#f6d36b"); R(g, x + 1, y - 7, 1, 1, "#f6d36b"); } // cartouchière
      if (tr[1] >= 5) { R(g, hx + d * 1 - 2, hy - 1, 5, 4, "#3a3a44"); R(g, hx + d * 3 - 1, hy, 3, 1, "#8a857e"); R(g, hx + d * 3 - 1, hy + 2, 3, 1, "#8a857e"); }
      if (tr[0] >= 3) { var r = 1.5 + tr[0] * 0.6; El(g, x - d * 2, y - 16 - r, r + 1, r + 1, OUT); El(g, x - d * 2, y - 16 - r, r, r, tr[0] >= 5 ? "#8a857e" : "#b07a4f"); R(g, x - d * 2 - r / 2, y - 17 - r * 1.5, r / 2, r / 2, tr[0] >= 5 ? "#b8b2a8" : "#d39a52"); }
      if (tr[2] >= 4) { R(g, x + d * 3 - 1, y - 13, 3, 2, "#2b1709"); R(g, x + d * 3, y - 13, 1, 1, "#9fd8ff"); } // lunette
    },
    braise: function (g, tr, x, y, ang, t, fire) {
      var volc = tr[0] >= 3, n = tr[1] >= 5 ? 3 : tr[1] >= 3 ? 2 : 1;
      R(g, x - 7, y - 7, 14, 5, OUT); R(g, x - 6, y - 6, 12, 3, "#8a5a3b");
      g.save(); g.translate(x, y - 8); g.rotate(ang);
      var len = 10 + tr[2] * 1.4 - (fire ? 2 : 0), wid = 4.5 + tr[0] * 0.5;
      for (var i = 0; i < n; i++) {
        var off = (i - (n - 1) / 2) * (wid + 0.5);
        barrel(g, len, wid, volc ? "#5a2010" : "#3a3a44", volc ? "#c8553d" : "#6a6a7a", off);
        R(g, len - 2, off - wid / 2, 2, wid, volc ? "#ff8a2a" : "#5a5a66");
        if (tr[2] >= 3) R(g, len * 0.5, off - wid / 2 - 1, 1.5, wid + 2, "#f6d36b");
      }
      if (fire) { El(g, len + 3, 0, 3, 3, "#fff3b0"); El(g, len + 5, 0, 2, 2, "#ff8a2a"); }
      g.restore();
      [-5, 5].forEach(function (dx) { El(g, x + dx, y - 2, 3.5, 3.5, OUT); El(g, x + dx, y - 2, 2.5, 2.5, "#6b4430"); R(g, x + dx - 0.5, y - 2.5, 1, 1, "#d39a52"); });
      if (volc) R(g, x - 1, y - 11 + Math.sin(t * 9), 1, 1, "#ffd34a");
    },
    rafale: function (g, tr, x, y, ang, t, fire, main, top) {
      var col = tr[1] >= 1 ? "#ff8a4a" : tr[2] >= 1 ? "#bfe8ff" : "#f0fffb", edge = tr[1] >= 1 ? "#c8453d" : tr[2] >= 1 ? "#5fa3c9" : "#3f8f8a";
      R(g, x - 6, y - 9, 12, 9, OUT); R(g, x - 5, y - 8, 10, 8, "#d8c8a0"); R(g, x - 5, y - 8, 10, 2, "#b8a888"); R(g, x - 1.5, y - 5, 3, 5, "#6b4430");
      Poly(g, [[x - 7, y - 9], [x, y - 14], [x + 7, y - 9]], "#3f8f8a", true);
      var n = 4 + (tr[0] >= 3 ? 2 : 0) + (tr[2] >= 2 ? 2 : 0), L = 9 + top * 0.6, hx = x, hy = y - 15, rot = t * (2 + top * 0.8) + (fire ? 0.3 : 0);
      for (var i = 0; i < n; i++) {
        g.save(); g.translate(hx, hy); g.rotate(rot + i / n * Math.PI * 2);
        R(g, 0, -1.5, L + 1, 3, OUT); R(g, 1, -1, L - 1, 2, edge); R(g, 3, -1, L - 4, 3.5, col);
        g.restore();
      }
      El(g, hx, hy, 2.5, 2.5, OUT); El(g, hx, hy, 1.5, 1.5, "#f6d36b");
      if (tr[1] >= 4) { g.globalAlpha = 0.35 + 0.2 * Math.sin(t * 8); El(g, hx, hy, L + 2, L + 2, "#ff8a2a"); g.globalAlpha = 1; }
    },
    givre: function (g, tr, x, y, ang, t, fire, main, top) {
      El(g, x, y - 1, 8, 3.5, OUT); El(g, x, y - 1.5, 7, 2.8, "#e6f6fa");
      var bob = Math.sin(t * 2) * 1, h = 11 + top * 1.3, w = 4.5 + top * 0.45, cy = y - 5 + bob, deep = tr[0] >= 3;
      var c1 = deep ? "#2a5a7a" : "#5fa3c9", c2 = deep ? "#5fa3c9" : "#9fd8ff", c3 = "#e6f6fa";
      Poly(g, [[x, cy - h], [x + w, cy - h * 0.45], [x, cy], [x - w, cy - h * 0.45]], c2, true);
      Poly(g, [[x, cy - h], [x, cy], [x - w, cy - h * 0.45]], c3);
      Poly(g, [[x, cy - h * 0.7], [x + w * 0.5, cy - h * 0.45], [x, cy - h * 0.2]], c1);
      if (tr[0] >= 4) { Poly(g, [[x - w - 1, cy - h * 0.3], [x - w - 5, cy - h * 0.5], [x - w, cy - h * 0.55]], c2, true); Poly(g, [[x + w + 1, cy - h * 0.3], [x + w + 5, cy - h * 0.5], [x + w, cy - h * 0.55]], c2, true); }
      if (tr[1] >= 3) for (var i = 0; i < 3; i++) { var a = t * 2 + i * 2.1; Poly(g, [[x + Math.cos(a) * 10, cy - h / 2 + Math.sin(a) * 4 - 3], [x + Math.cos(a) * 10 + 2, cy - h / 2 + Math.sin(a) * 4], [x + Math.cos(a) * 10, cy - h / 2 + Math.sin(a) * 4 + 3], [x + Math.cos(a) * 10 - 2, cy - h / 2 + Math.sin(a) * 4]], "#bfe8ff", true); }
      if (tr[2] >= 3) for (var j = 0; j < 8; j++) { var b = -t * 1.5 + j / 8 * Math.PI * 2; R(g, x + Math.cos(b) * 12, y - 3 + Math.sin(b) * 4, 1.5, 1.5, "#ffffff"); }
      if (fire) { g.globalAlpha = 0.5; El(g, x, cy - h / 2, w + 4, h / 2 + 3, "#ffffff"); g.globalAlpha = 1; }
    },
    eclair: function (g, tr, x, y, ang, t, fire, main, top) {
      R(g, x - 6, y - 5, 12, 5, OUT); R(g, x - 5, y - 4, 10, 4, "#8a857e"); R(g, x - 5, y - 4, 10, 1, "#b8b2a8");
      var n = 4 + Math.min(4, tr[0]), cy = y - 5;
      R(g, x - 1, cy - n * 2.2 - 3, 2, n * 2.2 + 3, "#6a6a7a");
      for (var i = 0; i < n; i++) { var wv = 7 - i * 0.4; R(g, x - wv / 2 - 0.5, cy - (i + 1) * 2.2 - 0.5, wv + 1, 2.2, OUT); R(g, x - wv / 2, cy - (i + 1) * 2.2, wv, 1.4, i % 2 ? "#c8783a" : "#e0a060"); }
      var oy = cy - n * 2.2 - 5, r = 2.6 + tr[1] * 0.45, plasma = tr[1] >= 3, pul = 0.5 + 0.5 * Math.sin(t * 7);
      g.globalAlpha = 0.25 + 0.25 * pul + (fire ? 0.4 : 0); El(g, x, oy, r + 3, r + 3, plasma ? "#c9b3ff" : "#ffe46b"); g.globalAlpha = 1;
      El(g, x, oy, r + 1, r + 1, OUT); El(g, x, oy, r, r, plasma ? "#9a7ae0" : "#f6d36b"); R(g, x - r / 2, oy - r / 2, r / 2, r / 2, "#ffffff");
      if (tr[2] >= 3) { [-1, 1].forEach(function (s) { R(g, x + s * 5 - 0.5, cy - n * 1.5, 1, n * 1.5, "#6a6a7a"); El(g, x + s * 5, cy - n * 1.5 - 1, 1.5, 1.5, "#9fd8ff"); }); }
      if (fire || Math.random() < 0.04) { g.strokeStyle = "#fff8c0"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, oy); g.lineTo(x + (Math.random() - 0.5) * 10, oy - 3 - Math.random() * 5); g.stroke(); }
    },
    guetteur: function (g, tr, x, y, ang, t, fire) {
      R(g, x - 7, y - 15, 2, 15, OUT); R(g, x + 5, y - 15, 2, 15, OUT); R(g, x - 6.5, y - 15, 1, 15, "#8a5a3b"); R(g, x + 5.5, y - 15, 1, 15, "#8a5a3b");
      g.strokeStyle = "#6b4430"; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 6, y - 2); g.lineTo(x + 6, y - 12); g.moveTo(x + 6, y - 2); g.lineTo(x - 6, y - 12); g.stroke();
      R(g, x - 9, y - 17, 18, 4, OUT); R(g, x - 8, y - 16.5, 16, 2.5, "#b07a4f");
      if (tr[2] >= 3) { R(g, x - 8, y - 30, 1, 14, "#4a2a10"); Poly(g, [[x - 7, y - 30], [x - 1 + Math.sin(t * 5), y - 28], [x - 7, y - 26]], tr[2] >= 5 ? "#f6d36b" : "#c8553d"); }
      // hibou
      var hy = y - 21; El(g, x, hy, 5, 5.5, OUT); El(g, x, hy, 4, 4.5, "#8a6a4a"); El(g, x, hy + 1, 2.8, 3, "#d8c8a0");
      R(g, x - 4, hy - 6, 2, 2, "#8a6a4a"); R(g, x + 2, hy - 6, 2, 2, "#8a6a4a");
      R(g, x - 2.5, hy - 2, 2, 2, "#f6d36b"); R(g, x + 0.5, hy - 2, 2, 2, "#f6d36b"); R(g, x - 2, hy - 1.5, 1, 1, OUT); R(g, x + 1, hy - 1.5, 1, 1, OUT);
      R(g, x - 0.5, hy, 1, 1.5, "#e8873a");
      g.save(); g.translate(x, hy + 2); g.rotate(ang);
      var len = 11 + tr[0] * 1.2 - (fire ? 1.5 : 0), wid = 1.6 + tr[0] * 0.3;
      barrel(g, len, wid, "#3a2a1a", "#6b5a3a", 0);
      if (tr[1] >= 3) barrel(g, len - 1, wid, "#3a2a1a", "#6b5a3a", wid + 1.2);
      R(g, 3, -wid / 2 - 2.5, 4, 1.5, "#2b1709");
      if (fire) El(g, len + 2, 0, 2.5, 2, "#fff3b0");
      g.restore();
    },
    chene: function (g, tr, x, y, ang, t, fire, main, top) {
      if (tr[2] >= 1) { var nn = 6 + tr[2] * 2; for (var i = 0; i < nn; i++) { var a = i / nn * Math.PI * 2, rx = x + Math.cos(a) * 9, ry = y - 1 + Math.sin(a) * 3.5; Poly(g, [[rx - 1.5, ry + 1], [rx, ry - 2 - tr[2] * 0.5], [rx + 1.5, ry + 1]], tr[2] >= 3 ? "#6a2a4a" : "#4a6a2a"); } }
      R(g, x - 2.5, y - 10, 5, 10, OUT); R(g, x - 1.5, y - 10, 3, 10, "#6b4430"); R(g, x - 4, y - 2, 8, 2, "#6b4430");
      var s = 8 + top * 0.7, cy = y - 13 - s * 0.4, sway = Math.sin(t * 1.5) * 0.6;
      El(g, x + sway, cy + 1, s + 1, s * 0.8 + 1, OUT);
      El(g, x + sway, cy + 1, s, s * 0.8, "#2f4f2a"); El(g, x - 2 + sway, cy - 1, s * 0.75, s * 0.6, "#3f6b3a"); El(g, x - 3 + sway, cy - 3, s * 0.4, s * 0.3, "#5b8a4a");
      if (tr[0] >= 3) for (var j = 0; j < 4 + tr[0]; j++) { var b = j * 1.7; R(g, x + Math.cos(b) * s * 0.7, cy + Math.sin(b) * s * 0.5, 1.5, 1.5, (Math.sin(t * 3 + j) > 0) ? "#f6d36b" : "#e0a82a"); }
      if (tr[1] >= 1) { R(g, x - 1.5, y - 7, 1, 1, "#f6d36b"); R(g, x + 0.5, y - 7, 1, 1, "#f6d36b"); }
      if (tr[1] >= 3) for (var k = 0; k < 3; k++) { var c = t * 1.3 + k * 2.1; g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6 + k); R(g, x + Math.cos(c) * (s + 3), cy + Math.sin(c) * (s * 0.6), 1.5, 1.5, "#fff3b0"); g.globalAlpha = 1; }
    },
    pepite: function (g, tr, x, y, ang, t, fire, main, top) {
      if (tr[1] >= 3) { R(g, x + 5, y - 7, 7, 7, OUT); R(g, x + 6, y - 6, 5, 5, "#8a857e"); El(g, x + 8.5, y - 3.5, 1.2, 1.2, "#f6d36b"); }
      R(g, x - 8, y - 11, 14, 11, OUT); R(g, x - 7, y - 10, 12, 10, "#c98d4a");
      for (var i = 0; i < 3; i++) R(g, x - 7, y - 8 + i * 3, 12, 0.7, "#8a5a3b");
      R(g, x - 3, y - 6, 4, 6, "#4a2a10");
      Poly(g, [[x - 10, y - 10], [x - 1, y - 18 - top * 0.4], [x + 8, y - 10]], tr[0] >= 3 ? "#f6d36b" : "#8a3a2a", true);
      if (tr[2] >= 3) { for (var j = 0; j < 4; j++) R(g, x - 6 + j * 3, y - 11, 3, 2, j % 2 ? "#fdf3de" : "#c8453d"); }
      var n = 2 + tr[0];
      for (var k = 0; k < n; k++) { var px = x - 8 + (k % 4) * 3, py = y - 1 - Math.floor(k / 4) * 2; El(g, px, py, 1.8, 1.6, OUT); El(g, px, py, 1.2, 1.1, k % 3 ? "#ffd34a" : "#f6d36b"); }
    },
  };
  function art(g, type, tiers, x, y, ang, t, fire) {
    var top = Math.max(tiers[0], tiers[1], tiers[2]);
    El(g, x, y + 1, 10, 4, "rgba(20,30,15,.35)");
    El(g, x, y, 9, 3.8, OUT); El(g, x, y - 0.5, 8, 3, top >= 5 ? "#f6d36b" : BASE[type]);
    ART[type](g, tiers, x, y, ang, t, fire, tiers.indexOf(top), top);
  }
  // icône d'une tour (boutique, améliorations) : même dessin, en image
  function towerIcon(type, tiers) {
    tiers = tiers || [0, 0, 0];
    var key = "ic" + type + tiers.join("");
    if (urlCache[key]) return urlCache[key];
    var c = document.createElement("canvas"); c.width = 34; c.height = 38;
    var g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    art(g, type, tiers, 17, 33, -0.45, 0.3, false);
    return (urlCache[key] = c.toDataURL());
  }
  function drawTower(t) {
    var s = t.st;
    if (t.buffT > 0) { ctx.globalAlpha = 0.4 + 0.3 * Math.sin(W.t * 12); circle(t.x, t.y - 6, 13, null, "#f6d36b", 1.5); ctx.globalAlpha = 1; }
    var fire = s.rate && t.cd > s.rate - 0.12;
    ctx.save(); ctx.translate(t.x, t.y); ctx.scale(1.2, 1.2);
    art(ctx, t.type, t.tiers, 0, 0, t.ang, W.t + t.id * 0.37, fire);
    ctx.restore();
    for (var p = 0; p < 3; p++) for (var i = 0; i < t.tiers[p]; i++) rect(t.x - 7 + p * 5, t.y + 5 - i * 1.4, 4, 1, ["#f2b05e", "#9cd06a", "#9fd8ff"][p]);
    if (t === sel) { ctx.globalAlpha = 0.6 + 0.3 * Math.sin(W.t * 6); ctx.beginPath(); ctx.ellipse(t.x, t.y, 12, 5, 0, 0, 7); ctx.lineWidth = 1.2; ctx.strokeStyle = "#f6d36b"; ctx.stroke(); ctx.globalAlpha = 1; }
    if (s.ability && t.acd <= 0 && W.running) { circle(t.x + 8, t.y - 18, 2.5, "#f6d36b", OUT, 1); }
  }

  function drawEnemy(e) {
    var key = e.d.sprite || e.type, frs = SPR[key] || SPR.slug, fr = frs[Math.floor(e.t * 5) % frs.length];
    var sc = e.d.boss ? 1.4 : (e.d.scale || 1), flip = e.dx < 0;
    var y = e.y + 3;
    if (e.d.hop) y -= Math.max(0, Math.sin(e.t * 7)) * 3;
    if (e.d.fly) y -= 4 + Math.sin(e.t * 4) * 1.5;
    ctx.fillStyle = "rgba(20,30,15,.3)"; ctx.beginPath(); ctx.ellipse(e.x, e.y + 3, fr.w * sc * 0.35, 2, 0, 0, 7); ctx.fill();
    var vis = !e.camo || e.revealed;
    ctx.save();
    if (!vis) ctx.globalAlpha = 0.45;
    ctx.translate(e.x, y);
    var sq = e.flash > 0 ? 0.12 : 0;
    ctx.scale(sc * (1 + sq), sc * (1 - sq));
    drawSpr(fr, -fr.w / 2, -fr.h, flip, e.flash > 0);
    ctx.restore();
    var top = y - fr.h * sc;
    if (e.camo) { ctx.globalAlpha = 0.8; rect(e.x - 4, top - 2, 1, 1, "#c9b3ff"); rect(e.x + 3, top - 2, 1, 1, "#c9b3ff"); ctx.globalAlpha = 1; }
    if (e.freezeT > 0) { ctx.globalAlpha = 0.5; rect(e.x - fr.w * sc / 2, top, fr.w * sc, fr.h * sc, "#bfe8ff"); ctx.globalAlpha = 1; }
    else if (e.slow > 0 || e.aSlow > 0) rect(e.x - 1, top - 1, 2, 2, "#9fd8ff");
    if (e.stunT > 0) { var a = W.t * 8; rect(e.x + Math.cos(a) * 5, top - 2 + Math.sin(a) * 1.5, 1.5, 1.5, "#f6d36b"); rect(e.x - Math.cos(a) * 5, top - 2 - Math.sin(a) * 1.5, 1.5, 1.5, "#f6d36b"); }
    if (e.burnT > 0 && Math.random() < 0.3) vfx.push({ k: "ember", x: e.x + (Math.random() - 0.5) * 6, y: top + 3, t: 0, life: 0.4 });
    if (e.d.armor) rect(e.x - 5, top - 1, 2, 2, "#b8b2a8");
    if (e.d.big || e.d.boss || e.hp < e.max) {
      var bw = e.d.boss ? 24 : e.d.big ? 16 : 10, f = Math.max(0, e.hp / e.max);
      if (e.d.boss || e.d.big || f < 0.999) { rect(e.x - bw / 2, top - 4, bw, 2, OUT); rect(e.x - bw / 2, top - 4, bw * f, 2, e.d.boss ? "#c8553d" : "#9cd06a"); }
    }
  }

  var PCOL = { noisette: "#d39a52", braise: "#ff7a2a", rafale: "#e0fff8", givre: "#bfe8ff", eclair: "#ffe46b", guetteur: "#e8e0d0", chene: "#9cd06a", pepite: "#ffd34a", shard: "#e6f6fa" };
  function drawProj(p) {
    var col = PCOL[p.type] || "#fdf3de", r = 1.3 + p.size * 1.3;
    var vx = p.vx, vy = p.vy, l = Math.hypot(vx, vy) || 1;
    ctx.strokeStyle = col; ctx.globalAlpha = 0.45; ctx.lineWidth = r; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - vx / l * (4 + r * 2), p.y - vy / l * (4 + r * 2)); ctx.stroke(); ctx.globalAlpha = 1;
    if (p.type === "noisette" && p.size > 0) { circle(p.x, p.y, r + 0.5, OUT); circle(p.x, p.y, r, "#b07a4f"); rect(p.x - r / 2, p.y - r / 2, r / 2, r / 2, "#d39a52"); return; }
    circle(p.x, p.y, r + 0.6, OUT); circle(p.x, p.y, r, col);
  }

  /* ---------- effets visuels ---------- */
  function pushV(v) { if (vfx.length < 500) { v.t = 0; vfx.push(v); } }
  function jag(pts) {
    var out = [];
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], n = 4;
      for (var j = 0; j <= n; j++) { var f = j / n, k = j === 0 || j === n ? 0 : (Math.random() - 0.5) * 6; out.push([a[0] + (b[0] - a[0]) * f + k, a[1] + (b[1] - a[1]) * f + k]); }
    }
    return out;
  }
  function polyline(pts) { ctx.beginPath(); pts.forEach(function (q, i) { if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.stroke(); }
  function drawVfx() {
    vfx.forEach(function (v) {
      var f = v.t / v.life, a = 1 - f;
      if (v.k === "boom") { ctx.globalAlpha = a * 0.8; circle(v.x, v.y, v.r * (0.4 + 0.6 * f), v.col || "rgba(255,160,60,.55)", "#fff3b0", 1.2); }
      else if (v.k === "ring") { ctx.globalAlpha = a * 0.8; circle(v.x, v.y, v.r * (0.2 + 0.8 * f), null, v.col, 2); }
      else if (v.k === "bolt") { ctx.globalAlpha = a; ctx.lineWidth = 2.2; ctx.strokeStyle = v.col || "#ffe46b"; polyline(v.pts); ctx.lineWidth = 0.8; ctx.strokeStyle = "#fff"; polyline(v.pts); }
      else if (v.k === "line") { ctx.globalAlpha = a; ctx.lineWidth = 1.2; ctx.strokeStyle = v.col; polyline(v.pts); }
      else if (v.k === "spark") { ctx.globalAlpha = a; rect(v.x + v.vx * v.t, v.y + v.vy * v.t + 20 * v.t * v.t, 1.5, 1.5, v.col); }
      else if (v.k === "ember") { ctx.globalAlpha = a; rect(v.x, v.y - v.t * 14, 1.2, 1.2, v.t < 0.2 ? "#fff3b0" : "#ff7a2a"); }
      else if (v.k === "num") { ctx.globalAlpha = Math.min(1, a * 2); text(v.s, v.x, v.y - v.t * 16, v.col, "center", v.sz || 6); }
      else if (v.k === "flash") { ctx.globalAlpha = a * 0.35; rect(0, 0, CFG.W, CFG.H, v.col); }
      else if (v.k === "meteor") {
        var fy = v.y - 200 * (1 - Math.min(1, f * 3));
        if (f < 0.33) { ctx.globalAlpha = 1; circle(v.x + (1 - f * 3) * 60, fy, 7, "#ff8a2a", "#fff3b0", 2); }
        else { ctx.globalAlpha = a; circle(v.x, v.y, 40 * (f - 0.33) * 1.6 + 5, "rgba(255,140,40,.6)", "#fff3b0", 2); }
      }
      ctx.globalAlpha = 1;
    });
  }
  function updVfx(dt) {
    for (var i = vfx.length - 1; i >= 0; i--) { vfx[i].t += dt; if (vfx[i].t >= vfx[i].life) vfx.splice(i, 1); }
    if (shakeA > 0) shakeA = Math.max(0, shakeA - dt * 6);
  }
  function sparks(x, y, n, cols) {
    if (vfx.length > 420) return;
    for (var i = 0; i < n; i++) { var a = Math.random() * Math.PI * 2, s = 20 + Math.random() * 40; pushV({ k: "spark", x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 15, col: cols[i % cols.length], life: 0.35 + Math.random() * 0.25 }); }
  }
  function handleEvents() {
    var evs = W.ev; W.ev = [];
    evs.forEach(function (e) {
      switch (e.k) {
        case "shot": SND.shot(); break;
        case "kill": SND.kill(); sparks(e.x, e.y - 3, e.big ? 14 : 4, e.boss ? ["#f6d36b", "#c8553d", "#fdf3de"] : ["#fdf3de", "#9cd06a", "#c98d4a"]); if (e.boss) { shakeA = 4; SND.win(); } break;
        case "boom": pushV({ k: "boom", x: e.x, y: e.y, r: e.r, life: 0.28 }); SND.boom(); if (e.r > 24) shakeA = Math.max(shakeA, 1); break;
        case "pulse": pushV({ k: "ring", x: e.x, y: e.y, r: e.r, col: "#bfe8ff", life: 0.4 }); break;
        case "ring": pushV({ k: "ring", x: e.x, y: e.y, r: e.r, col: "#ff8a2a", life: 0.35 }); SND.boom(); break;
        case "thorns": pushV({ k: "ring", x: e.x, y: e.y, r: e.r, col: "rgba(156,208,106,.7)", life: 0.3 }); break;
        case "bolt": pushV({ k: "bolt", pts: jag(e.pts), life: 0.16 }); SND.zap(); break;
        case "snipe": pushV({ k: "line", pts: e.pts, col: "#fdf3de", life: 0.12 }); SND.shot(); break;
        case "crit": pushV({ k: "num", s: "CRIT", x: e.x, y: e.y - 10, col: "#f6d36b", life: 0.5, sz: 5 }); break;
        case "block": pushV({ k: "num", s: "⛨", x: e.x, y: e.y - 8, col: "#b8b2a8", life: 0.4, sz: 6 }); break;
        case "coin": pushV({ k: "num", s: "+" + fmt(e.v), x: e.x, y: e.y - 14, col: "#ffd34a", life: 1.1, sz: 7 }); SND.coin(); break;
        case "leak": SND.leak(); pushV({ k: "flash", col: "#c8553d", life: 0.25 }); break;
        case "place": sparks(e.x, e.y, 8, ["#fdf3de", "#9cd06a"]); SND.place(); break;
        case "upgrade": sparks(e.x, e.y - 6, 14, ["#f6d36b", "#fdf3de"]); SND.upgrade(e.tier); break;
        case "sell": pushV({ k: "num", s: "+" + fmt(e.v), x: e.x, y: e.y - 10, col: "#ffd34a", life: 1, sz: 7 }); SND.sell(); break;
        case "round": SND.round(); if (e.boss) { banner("Manche " + e.r + " · BOSS !"); SND.boss(); } else banner("Manche " + e.r); break;
        case "roundEnd": pushV({ k: "num", s: "Manche terminée · +" + fmt(e.v), x: CFG.W / 2, y: CFG.H / 2, col: "#ffd34a", life: 1.6, sz: 9 }); break;
        case "charge": pushV({ k: "num", s: "CHARGE !", x: e.x, y: e.y - 20, col: "#f29a85", life: 0.8, sz: 6 }); shakeA = Math.max(shakeA, 1.5); break;
        case "swarm": pushV({ k: "num", s: "Essaim !", x: e.x, y: e.y - 20, col: "#f6d36b", life: 0.8, sz: 6 }); break;
        case "heal": pushV({ k: "ring", x: e.x, y: e.y, r: 90, col: "#9cd06a", life: 0.6 }); break;
        case "rooted": pushV({ k: "num", s: "Racines !", x: e.x, y: e.y - 14, col: "#b07a4f", life: 0.8, sz: 5 }); break;
        case "meteor": pushV({ k: "meteor", x: e.x, y: e.y, life: 0.9 }); setTimeout(function () { shakeA = 5; SND.boom(); }, 300); break;
        case "storm": pushV({ k: "flash", col: "#d0c0ff", life: 0.4 }); W.enemies.slice(0, 30).forEach(function (en) { pushV({ k: "bolt", pts: jag([[en.x + 10, -5], [en.x, en.y - 3]]), col: "#d0c0ff", life: 0.3 }); }); shakeA = 3; SND.power(); break;
        case "flash": pushV({ k: "flash", col: e.col, life: 0.5 }); SND.power(); break;
        case "boss": break;
        case "win": onWin(); break;
        case "lose": onLose(); break;
      }
    });
  }
  function banner(s) {
    var b = $("[data-banner]"); if (!b) return;
    b.textContent = s; b.hidden = false; b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
    clearTimeout(banner.t); banner.t = setTimeout(function () { b.hidden = true; }, 2600);
  }

  /* =====================================================================
     Boucle
     ===================================================================== */
  var last = 0;
  function frame(now) {
    var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    try {
      if (W && state === "play" && !paused) {
        var steps = Math.ceil(speed * dt / (1 / 60));
        for (var i = 0; i < steps && !W.over; i++) K.step(W, speed * dt / steps);
        handleEvents();
      }
      updVfx(dt);
      render();
      if (W && state === "play") updateSide();
    } catch (err) { showError(err); }
    requestAnimationFrame(frame);
  }

  /* =====================================================================
     Interface : barre du haut, boutique, panneau d'améliorations, pouvoirs
     ===================================================================== */
  var TNAME = { first: "Premier", last: "Dernier", strong: "Le plus fort", close: "Le plus proche" };
  var PATHCOL = ["#f2b05e", "#9cd06a", "#9fd8ff"];
  function costTxt(c) { return c === Infinity ? "—" : fmt(c); }
  function showUI(on) {
    hud.hidden = !on; shop.hidden = !on; abil.hidden = !on;
    if (!on) upg.hidden = true;
    stage.classList.toggle("td-playing", !!on);
  }
  // boutique
  var shopSig = "";
  function buildShop() {
    var h = "";
    D.TOWER_ORDER.forEach(function (k, i) {
      var c = K.towerCost(W, k);
      h += '<button type="button" class="td-buy" data-t="' + k + '" aria-label="' + esc(T[k].name + ", " + c + " noisettes") + '">' +
        '<img src="' + towerIcon(k) + '" alt="" draggable="false"><span>' + esc(T[k].name) + "</span><b>🌰 " + fmt(c) + "</b><kbd>" + (i + 1) + "</kbd></button>";
    });
    shopGrid.innerHTML = h; shopSig = "";
  }
  function renderShop() {
    var aff = D.TOWER_ORDER.map(function (k) { return W.cash >= K.towerCost(W, k) ? 1 : 0; }).join("");
    var info = placing || hoverType || "";
    var sig = aff + "|" + placing + "|" + info;
    if (sig === shopSig) return; shopSig = sig;
    shopGrid.querySelectorAll("[data-t]").forEach(function (b, i) {
      var k = b.getAttribute("data-t");
      b.classList.toggle("poor", aff[i] === "0"); b.classList.toggle("on", placing === k);
    });
    shopInfo.innerHTML = info ? "<strong>" + esc(T[info].name) + "</strong> · " + esc(T[info].role) + "<br>" + esc(T[info].desc) +
      (placing ? '<br><em>' + (touchUI ? "Glisse-la sur le terrain, ou touche l'endroit voulu." : "Clique sur le terrain pour la poser · Échap pour annuler") + "</em>" : "")
      : (touchUI ? "Glisse une tour sur le terrain. Touche une tour posée pour l'améliorer." : "Glisse une tour sur le terrain (ou clique puis clique). Clique sur une tour posée pour l'améliorer.");
  }
  // panneau d'améliorations
  var upgSig = "";
  function renderUpg() {
    var t = sel && W.towers.indexOf(sel) >= 0 ? sel : null; if (!t) sel = null;
    stage.classList.toggle("td-selected", !!t);
    if (!t) { if (!upg.hidden) { upg.hidden = true; upgSig = ""; } return; }
    var aff = [0, 1, 2].map(function (p) { return W.cash >= K.upCost(W, t, p) ? 1 : 0; }).join("");
    var side = t.x > CFG.W / 2 ? "left" : "right";
    var sig = [t.id, t.tiers.join(""), aff, t.target, K.sellValue(W, t), side, t.buffed].join("|");
    upg.hidden = false;
    upg.classList.toggle("td-left", side === "left"); upg.classList.toggle("td-right", side === "right");
    if (sig === upgSig) { var kk = upg.querySelector("[data-kills]"); if (kk) kk.textContent = fmt(t.kills) + " vaincues"; return; }
    upgSig = sig;
    var d = T[t.type], s = t.st, h = "";
    h += '<div class="tu-head"><img src="' + towerIcon(t.type, t.tiers) + '" alt=""><div><strong>' + esc(d.name) + "</strong><span>" + esc(d.role) + "</span><span data-kills>" + fmt(t.kills) + " vaincues</span></div>" +
      '<button class="tu-x" type="button" data-act="desel" aria-label="Fermer">✕</button></div>';
    if (s.kind !== "aura" && s.kind !== "farm" && s.kind !== "pulse" && s.kind !== "ring")
      h += '<div class="tu-target"><button type="button" data-act="tprev" aria-label="Cible précédente">◀</button><span>🎯 ' + TNAME[t.target] + '</span><button type="button" data-act="tnext" aria-label="Cible suivante">▶</button></div>';
    d.paths.forEach(function (p, pi) {
      var tier = t.tiers[pi], lim = K.pathLimit(t, pi), next = p.up[tier];
      var pips = ""; for (var i = 0; i < 5; i++) pips += '<i class="' + (i < tier ? "on" : i >= lim ? "lock" : "") + '"></i>';
      var cur = tier ? p.up[tier - 1].n : "Aucune";
      h += '<div class="tu-path" style="--pc:' + PATHCOL[pi] + '"><div class="tu-cur"><small>' + esc(p.name) + '</small><strong>' + esc(cur) + '</strong><span class="tu-pips">' + pips + "</span></div>";
      if (!next) h += '<div class="tu-next max"><strong>Voie terminée</strong><span>★ Niveau max</span></div>';
      else if (tier >= lim) h += '<div class="tu-next lock" title="2 voies au maximum, et une seule au-delà du niveau 2"><strong>Voie bloquée</strong><span>' + esc(next.n) + "</span></div>";
      else {
        var c = K.upCost(W, t, pi), can = W.cash >= c, nt = t.tiers.slice(); nt[pi]++;
        h += '<button type="button" class="tu-next ' + (can ? "ok" : "poor") + '" data-act="up" data-p="' + pi + '" title="' + esc(next.d) + '"><img src="' + towerIcon(t.type, nt) + '" alt=""><span class="tu-txt"><strong>' + esc(next.n) + '</strong><small>' + esc(next.d) + '</small></span><b>🌰 ' + costTxt(c) + "</b></button>";
      }
      h += "</div>";
    });
    var extra = s.income ? "+" + fmt(s.income) + " / manche" : t.buffed ? "🌳 Boostée" : "";
    h += '<div class="tu-foot"><span>' + extra + '</span><button type="button" class="tu-sell" data-act="sell">Vendre 🌰 ' + costTxt(K.sellValue(W, t)) + "</button></div>";
    upg.innerHTML = h;
  }
  // pouvoirs (en bas à gauche du terrain)
  var abilSig = "";
  function renderAbil() {
    var list = W.towers.filter(function (t) { return t.st.ability; });
    var sig = list.map(function (t) { return t.id + t.st.ability.id; }).join(",");
    if (sig !== abilSig) {
      abilSig = sig;
      abil.innerHTML = list.map(function (t) { return '<button type="button" class="td-ab" data-act="ability" data-id="' + t.id + '" title="' + esc(t.st.ability.name + " (" + T[t.type].name + ")") + '"><img src="' + towerIcon(t.type, t.tiers) + '" alt=""><span>' + esc(t.st.ability.name) + "</span></button>"; }).join("");
    }
    abil.querySelectorAll(".td-ab").forEach(function (b) {
      var t = W.towers.filter(function (o) { return o.id === +b.getAttribute("data-id"); })[0]; if (!t) return;
      var f = t.st.ability.cd ? Math.max(0, t.acd) / t.st.ability.cd : 0;
      b.style.setProperty("--cd", (f * 100).toFixed(1) + "%");
      b.classList.toggle("ready", f <= 0 && W.running);
    });
  }
  function renderTop() {
    livesEl.textContent = fmt(W.lives); cashEl.textContent = fmt(W.cash);
    roundEl.textContent = Math.max(1, W.round) + (W.freeplay ? "" : " / " + W.mode.rounds);
    var st = W.running ? "run" + speed : W.won && !W.freeplay ? "won" : "idle";
    if (goBtnEl.getAttribute("data-state") !== st) {
      goBtnEl.setAttribute("data-state", st);
      goBtnEl.innerHTML = W.running ? (speed === 1 ? "⏵⏵" : "⏵⏵<small>×" + speed + "</small>") : "▶";
      goBtnEl.setAttribute("aria-label", W.running ? "Accélérer (vitesse ×" + speed + ")" : "Lancer la manche " + (W.round + 1));
      goBtnEl.title = W.running ? "Vitesse ×" + speed + " (clic pour changer)" : "Lancer la manche " + (W.round + 1);
    }
    autoEl.setAttribute("aria-pressed", W.auto ? "true" : "false");
  }
  function updateUI(force) {
    if (force) { shopSig = upgSig = ""; }
    renderTop(); renderShop(); renderUpg(); renderAbil();
  }
  var updateSide = updateUI;

  function act(b) {
    var a = b.getAttribute("data-act");
    if (a === "desel") sel = null;
    if (a === "up" && sel) { if (!K.upgrade(W, sel, +b.getAttribute("data-p"))) SND.no(); handleEvents(); }
    if (a === "sell" && sel) { K.sell(W, sel); sel = null; handleEvents(); }
    if (a === "tnext" && sel) K.cycleTarget(sel);
    if (a === "tprev" && sel) { K.cycleTarget(sel); K.cycleTarget(sel); K.cycleTarget(sel); }
    if (a === "ability") { var id = +b.getAttribute("data-id"), tw = W.towers.filter(function (o) { return o.id === id; })[0]; if (tw && K.useAbility(W, tw)) handleEvents(); else SND.no(); }
    updateUI(true);
  }
  [upg, abil].forEach(function (el) { el.addEventListener("click", function (ev) { var b = ev.target.closest("[data-act]"); if (b && W) act(b); }); });
  goBtnEl.addEventListener("click", function () { goBtn(); updateUI(true); });
  autoEl.addEventListener("click", function () { if (W) { W.auto = !W.auto; updateUI(true); } });
  function goBtn() {
    if (!W || W.over) return;
    if (W.won && !W.freeplay) return;
    if (!W.running) { K.startRound(W); handleEvents(); }
    else speed = speed === 1 ? 2 : speed === 2 ? 3 : 1;
  }

  /* =====================================================================
     Pose des tours : glisser depuis la boutique (comme on le ferait avec une carte),
     ou toucher une tour puis toucher le terrain
     ===================================================================== */
  var touchUI = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  var drag = null, down = null;
  function toLogical(cx, cy) {
    var r = canvas.getBoundingClientRect();
    return { x: (cx - r.left - view.ox) / view.scale, y: (cy - r.top - view.oy) / view.scale };
  }
  function overField(cx, cy) {
    var r = canvas.getBoundingClientRect(), x = cx - r.left, y = cy - r.top;
    if (x < 0 || y < view.top || x > view.fw || y > view.top + view.fh) return false;
    var u = upg.hidden ? null : upg.getBoundingClientRect();
    if (u && cx >= u.left && cx <= u.right && cy >= u.top && cy <= u.bottom) return false;
    return true;
  }
  function setGhost(cx, cy, lift) {
    if (!overField(cx, cy)) { ghost = null; return; }
    var p = toLogical(cx, cy);
    ghost = { x: Math.round(p.x), y: Math.round(p.y - (lift ? 30 / view.scale : 0)) };
  }
  function tryPlace(keep) {
    if (!placing || !ghost) return false;
    var err = K.placeError(W, placing, ghost.x, ghost.y);
    if (err || W.cash < K.towerCost(W, placing)) { SND.no(); return false; }
    var t = K.place(W, placing, ghost.x, ghost.y); handleEvents();
    if (!keep) { placing = null; ghost = null; sel = t; }
    return true;
  }
  shopGrid.addEventListener("pointerdown", function (e) {
    var b = e.target.closest("[data-t]"); if (!b || !W || state !== "play") return;
    e.preventDefault();
    var k = b.getAttribute("data-t");
    drag = { type: k, id: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false, touch: e.pointerType !== "mouse", was: placing === k };
    placing = k; sel = null; ghost = null; hoverType = k;
    updateUI(true);
  });
  window.addEventListener("pointermove", function (e) {
    if (drag && e.pointerId === drag.id) {
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 8) drag.moved = true;
      if (drag.moved) setGhost(e.clientX, e.clientY, drag.touch);
    }
  });
  function endDrag(e, cancel) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag; drag = null;
    if (d.moved) {
      if (!cancel && ghost && tryPlace(e.shiftKey)) {}
      else { placing = null; ghost = null; }
    } else if (d.was) { placing = null; ghost = null; }   // re-toucher la même tour annule
    hoverType = null;
    updateUI(true);
  }
  window.addEventListener("pointerup", function (e) { endDrag(e, false); });
  window.addEventListener("pointercancel", function (e) { endDrag(e, true); });
  shopGrid.addEventListener("mouseover", function (ev) { var b = ev.target.closest("[data-t]"); hoverType = b ? b.getAttribute("data-t") : null; });
  shopGrid.addEventListener("mouseleave", function () { hoverType = null; });

  function towerAt(x, y) {
    var best = null, bd = 13 * 13;
    W.towers.forEach(function (t) { var d = (t.x - x) * (t.x - x) + (t.y - 7 - y) * (t.y - 7 - y); if (d < bd) { bd = d; best = t; } });
    return best;
  }
  canvas.addEventListener("pointerdown", function (e) {
    if (!W || state !== "play" || drag) return;
    down = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
    if (placing) setGhost(e.clientX, e.clientY, false);
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!W || state !== "play" || drag) return;
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) down.moved = true;
    if (placing && (e.pointerType === "mouse" || down)) setGhost(e.clientX, e.clientY, e.pointerType !== "mouse" && down && down.moved);
  });
  canvas.addEventListener("pointerup", function (e) {
    if (!W || state !== "play" || !down || drag) return;
    down = null;
    if (placing) { if (!tryPlace(e.shiftKey) && e.pointerType !== "mouse") {} updateUI(true); return; }
    var p = toLogical(e.clientX, e.clientY), tw = towerAt(p.x, p.y);
    sel = tw || null;
    if (tw) SND.click();
    updateUI(true);
  });
  canvas.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse" && placing && !drag) ghost = null; });
  canvas.addEventListener("contextmenu", function (e) { if (placing || sel) { e.preventDefault(); placing = null; sel = null; ghost = null; updateUI(true); } });

  document.addEventListener("keydown", function (e) {
    if (!W || state !== "play") return;
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    var k = e.key;
    if (k === " ") { e.preventDefault(); goBtn(); updateUI(true); }
    else if (k === "Escape") { if (placing || sel) { placing = null; sel = null; ghost = null; updateUI(true); } else togglePause(); }
    else if (/^[1-8]$/.test(k)) { placing = D.TOWER_ORDER[+k - 1]; sel = null; updateUI(true); }
    else if (sel && (k === "a" || k === "q" || k === ",")) { K.upgrade(W, sel, 0); handleEvents(); updateUI(true); }
    else if (sel && (k === "z" || k === "w" || k === ";" || k === ".")) { K.upgrade(W, sel, 1); handleEvents(); updateUI(true); }
    else if (sel && (k === "e" || k === ":" || k === "/")) { K.upgrade(W, sel, 2); handleEvents(); updateUI(true); }
    else if (sel && k === "Tab") { e.preventDefault(); K.cycleTarget(sel); updateUI(true); }
    else if (sel && (k === "Delete" || k === "Backspace")) { K.sell(W, sel); sel = null; handleEvents(); updateUI(true); }
    else if (k === "p") togglePause();
  });

  /* =====================================================================
     HUD (pause, son)
     ===================================================================== */
  function syncHud() {
    var m = $("[data-mute]"); if (m) m.textContent = S.mute ? "🔇" : "🔊";
    var p = $("[data-pause]"); if (p) p.textContent = paused ? "▶" : "⏸";
  }
  function togglePause() {
    if (state !== "play") return;
    paused = !paused; syncHud();
    if (paused) showPause(); else hideOverlay();
  }
  $("[data-mute]").addEventListener("click", function () { S.mute = !S.mute; save(); syncHud(); });
  $("[data-pause]").addEventListener("click", togglePause);

  /* =====================================================================
     Menus
     ===================================================================== */
  function hideOverlay() { overlay.hidden = true; }
  function showCard(html, cls) { overlay.hidden = false; card.className = "panel game-card " + (cls || ""); card.innerHTML = html; overlay.scrollTop = 0; }
  function medalHtml(mapId) {
    return D.MODES.map(function (m) { var on = S.medals[mapId] && S.medals[mapId][m.id]; return '<i class="td-medal td-m-' + m.id + (on ? " on" : "") + '" title="' + esc(m.name) + (on ? " : réussi" : "") + '"></i>'; }).join("");
  }
  function showMenu() {
    state = "menu"; W = null; sel = null; placing = null; paused = false; showUI(false); resize();
    var h = '<div class="screen-head"><h2>Écureuil Défense</h2><p class="game-small">Pose tes tours le long du chemin, améliore-les sur 3 voies et protège ta réserve de noisettes.</p></div>';
    h += '<h3 class="pick-title">Carte</h3><div class="td-maps">';
    D.MAPS.forEach(function (m) {
      var best = S.best[m.id + "_" + S.mode] || 0;
      h += '<button type="button" class="td-map' + (S.map === m.id ? " on" : "") + '" data-map="' + m.id + '"><img src="' + mapThumb(m.id) + '" alt=""><span><strong>' + esc(m.name) + "</strong><em>" + esc(m.level) + "</em></span>" +
        '<span class="td-medals">' + medalHtml(m.id) + "</span>" + (best ? '<small>Record : manche ' + best + "</small>" : "") + "</button>";
    });
    h += '</div><h3 class="pick-title">Difficulté</h3><div class="td-modes">';
    D.MODES.forEach(function (m) {
      h += '<button type="button" class="td-mode' + (S.mode === m.id ? " on" : "") + '" data-mode="' + m.id + '"><strong>' + esc(m.name) + "</strong><span>" + esc(m.desc) + "</span><span>❤ " + m.lives + " · 🌰 " + m.cash + "</span></button>";
    });
    h += '</div><div class="btn-row center"><button class="btn" type="button" data-start>▶ Jouer</button><button class="btn btn-ghost" type="button" data-help>Les tours</button></div>';
    h += '<p class="game-version">Version ' + VERSION + "</p>";
    showCard(h, "game-card-wide td-menu");
    card.querySelectorAll("[data-map]").forEach(function (b) { b.addEventListener("click", function () { S.map = b.getAttribute("data-map"); save(); showMenu(); }); });
    card.querySelectorAll("[data-mode]").forEach(function (b) { b.addEventListener("click", function () { S.mode = b.getAttribute("data-mode"); save(); showMenu(); }); });
    card.querySelector("[data-start]").addEventListener("click", startGame);
    card.querySelector("[data-help]").addEventListener("click", showTowers);
  }
  function showTowers() {
    var h = '<div class="screen-head"><h2>Les tours</h2><p class="game-small">Chaque tour a 3 voies de 5 améliorations. Tu peux en suivre 2 sur une même tour, et une seule peut dépasser le niveau 2 (par exemple 5-2-0 ou 0-3-2).</p></div><div class="td-codex">';
    D.TOWER_ORDER.forEach(function (k) {
      var d = T[k];
      h += '<details class="td-cx"><summary><img src="' + sqUrl(k) + '" alt=""><span><strong>' + esc(d.name) + "</strong> · " + esc(d.role) + " · 🌰 " + d.cost + "<br><small>" + esc(d.desc) + "</small></span></summary>";
      d.paths.forEach(function (p, pi) {
        h += '<div class="td-cxpath td-p' + pi + '"><b>' + esc(p.name) + "</b><ol>";
        p.up.forEach(function (u) { h += "<li><strong>" + esc(u.n) + "</strong> (" + fmt(u.c) + ") : " + esc(u.d) + "</li>"; });
        h += "</ol></div>";
      });
      h += "</details>";
    });
    h += '</div><div class="btn-row center"><button class="btn" type="button" data-back>Retour</button></div>';
    showCard(h, "game-card-wide");
    card.querySelector("[data-back]").addEventListener("click", function () { if (state === "play") showPause(); else showMenu(); });
  }
  function showPause() {
    var h = "<h2>Pause</h2><p>Manche " + W.round + " · " + esc(W.map.name) + " · " + esc(W.mode.name) + "</p>" +
      '<div class="btn-row center"><button class="btn" type="button" data-resume>▶ Reprendre</button><button class="btn btn-ghost" type="button" data-help>Les tours</button></div>' +
      '<div class="btn-row center"><button class="btn btn-ghost btn-small" type="button" data-restart>Recommencer</button><button class="btn btn-ghost btn-small" type="button" data-quit>Menu</button></div>' +
      '<p class="game-small">Glisse une tour de la boutique vers le terrain pour la poser. Raccourcis : Espace = lancer / accélérer · 1-8 = tours · A Z E = améliorer les voies · Tab = cible · Suppr = vendre · Échap = annuler · Maj + clic = poser plusieurs tours.</p>';
    showCard(h, "game-card-pause");
    card.querySelector("[data-resume]").addEventListener("click", function () { paused = false; syncHud(); hideOverlay(); });
    card.querySelector("[data-help]").addEventListener("click", showTowers);
    card.querySelector("[data-restart]").addEventListener("click", function () { if (confirm("Recommencer la partie ?")) startGame(); });
    card.querySelector("[data-quit]").addEventListener("click", function () { if (confirm("Quitter la partie ?")) showMenu(); });
  }
  function startGame() {
    W = K.createWorld({ map: S.map, mode: S.mode, seed: (Math.random() * 1e9) | 0 });
    state = "play"; paused = false; speed = 1; sel = null; placing = null; vfx = []; shopSig = upgSig = abilSig = "";
    S.games++; save();
    hideOverlay(); showUI(true);
    buildShop(); syncHud(); resize(); updateSide(true);
    banner(W.map.name + " · " + W.mode.name);
  }
  function record() {
    var key = W.map.id + "_" + W.mode.id;
    if (W.round > (S.best[key] || 0)) S.best[key] = W.round;
    save();
  }
  function onWin() {
    record();
    S.medals[W.map.id] = S.medals[W.map.id] || {};
    var first = !S.medals[W.map.id][W.mode.id];
    S.medals[W.map.id][W.mode.id] = true; S.wins++; save();
    SND.win(); paused = true; syncHud();
    var h = "<h2>Victoire !</h2><p>" + esc(W.map.name) + " · " + esc(W.mode.name) + " : les " + W.mode.rounds + " manches sont passées, la réserve est sauve.</p>" +
      (first ? '<p class="td-gain">🏅 Nouvelle médaille !</p>' : "") +
      '<ul class="over-stats"><li><span>Vies</span><strong>' + W.lives + "</strong></li><li><span>Bestioles</span><strong>" + fmt(W.kills) + "</strong></li><li><span>Tours</span><strong>" + W.towers.length + "</strong></li></ul>" +
      '<div class="btn-row center"><button class="btn" type="button" data-free>Continuer en mode libre</button><button class="btn btn-ghost" type="button" data-menu>Menu</button></div>';
    showCard(h, "game-card-over");
    card.querySelector("[data-free]").addEventListener("click", function () { W.freeplay = true; paused = false; syncHud(); hideOverlay(); updateSide(true); });
    card.querySelector("[data-menu]").addEventListener("click", showMenu);
  }
  function onLose() {
    record(); SND.over(); state = "over";
    var h = "<h2>La réserve est pillée !</h2><p>" + esc(W.map.name) + " · " + esc(W.mode.name) + " : tu as tenu jusqu'à la manche <strong>" + W.round + "</strong>.</p>" +
      '<ul class="over-stats"><li><span>Manche</span><strong>' + W.round + "</strong></li><li><span>Bestioles</span><strong>" + fmt(W.kills) + "</strong></li><li><span>Record</span><strong>" + (S.best[W.map.id + "_" + W.mode.id] || 0) + "</strong></li></ul>" +
      '<div class="btn-row center"><button class="btn" type="button" data-again>Rejouer</button><button class="btn btn-ghost" type="button" data-menu>Menu</button></div>';
    showCard(h, "game-card-over");
    card.querySelector("[data-again]").addEventListener("click", startGame);
    card.querySelector("[data-menu]").addEventListener("click", showMenu);
  }

  /* =====================================================================
     Plein écran
     ===================================================================== */
  function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement) || stage.classList.contains("is-max"); }
  function syncFull() { var b = document.querySelector("[data-game-fullscreen]"); if (b) b.textContent = isFull() ? "✕ Quitter le plein écran" : "⛶ Plein écran"; stage.classList.toggle("is-full", isFull()); document.documentElement.classList.toggle("es-max", stage.classList.contains("is-max")); resize(); }
  function enterFull() {
    var fallback = function () { stage.classList.add("is-max"); syncFull(); };
    var req = stage.requestFullscreen || stage.webkitRequestFullscreen;
    if (req) { try { var pr = req.call(stage); if (pr && pr.catch) pr.catch(fallback); } catch (e) { fallback(); } } else fallback();
  }
  function exitFull() {
    stage.classList.remove("is-max");
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
    syncFull();
  }
  document.addEventListener("fullscreenchange", syncFull);
  document.addEventListener("webkitfullscreenchange", syncFull);
  var fsBtn = document.querySelector("[data-game-fullscreen]");
  if (fsBtn) fsBtn.addEventListener("click", function () { if (isFull()) exitFull(); else enterFull(); });
  $("[data-exit-max]").addEventListener("click", exitFull);
  $("[data-fs-exit]").addEventListener("click", exitFull);

  function showError(err) {
    if (showError.done) return; showError.done = true;
    if (window.console) console.error(err);
    overlay.hidden = false;
    card.innerHTML = "<h2>Oups</h2><p>Le jeu a rencontré une erreur. Recharge la page.</p><p class=\"game-small\">" + esc(err && err.message || err) + "</p>";
  }
  // pause automatique quand on quitte l'onglet
  document.addEventListener("visibilitychange", function () { if (document.hidden && state === "play" && !paused && W && W.running) togglePause(); });

  if (/[?&]debug\b/.test(location.search)) window.TD_DEBUG = { get W() { return W; }, view: view, get S() { return S; }, cash: function (v) { W.cash += v; }, setSpeed: function (v) { speed = v; } };

  showMenu();
  syncHud(); resize();
  requestAnimationFrame(frame);
})();
