/* =========================================================================
   Écureuil Défense — interface : rendu, commandes, menus, sauvegarde
   Données : js/defense-data.js · moteur : js/defense-core.js
   Sprites des bestioles : js/game-data.js (Écureuil Survivor)
   ========================================================================= */
(function () {
  "use strict";
  var VERSION = "0.1.0";
  var stage = document.querySelector("[data-defense]");
  if (!stage || !window.TD_DATA || !window.TD_CORE || !window.ES_DATA) return;
  var D = window.TD_DATA, K = window.TD_CORE, ES = window.ES_DATA, T = D.TOWERS, CFG = D.CFG;
  var $ = function (s) { return stage.querySelector(s); };
  var canvas = $("canvas"), ctx = canvas.getContext("2d");
  var overlay = $("[data-overlay]"), card = $("[data-card]"), hud = $("[data-hud]"), side = $("[data-side]");
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
  function sqUrl(k) { return urlCache[k] || (urlCache[k] = SQ[k][0].c.toDataURL()); }
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

  /* ---------- disposition : terrain + panneau (à droite si large, en bas si haut) ---------- */
  function layout() {
    var cw = stage.clientWidth, ch = stage.clientHeight;
    var wide = cw / ch > 1.15 || cw > 900;
    stage.classList.toggle("td-wide", wide); stage.classList.toggle("td-tall", !wide);
    var sw = 0, sh = 0;
    if (state === "play") { if (wide) sw = side.offsetWidth; else sh = side.offsetHeight; }
    var fw = cw - sw, fh = ch - sh, pad = 4;
    view.scale = Math.min((fw - pad * 2) / CFG.W, (fh - pad * 2) / CFG.H);
    view.ox = (fw - CFG.W * view.scale) / 2; view.oy = (fh - CFG.H * view.scale) / 2;
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
      ctx.globalAlpha = 0.85; var sq = SQ[placing][0]; drawSpr(sq, ghost.x - sq.w / 2, ghost.y - sq.h + 4, false); ctx.globalAlpha = 1;
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
    var sq = SQ[D.TOWER_ORDER[Math.floor(menuT / 2) % D.TOWER_ORDER.length]][Math.floor(menuT * 4) % 2];
    ctx.drawImage(sq.c, cw / 2 - sq.w * sc / 2, ch - sq.h * sc - 10 * sc, sq.w * sc, sq.h * sc);
  }

  function drawTower(t) {
    var s = t.st, d = T[t.type], top = Math.max(t.tiers[0], t.tiers[1], t.tiers[2]);
    // socle
    ctx.fillStyle = "rgba(20,30,15,.35)"; ctx.beginPath(); ctx.ellipse(t.x, t.y + 2, 9, 4, 0, 0, 7); ctx.fill();
    var ring = top >= 5 ? "#f6d36b" : top >= 3 ? "#fdf3de" : d.color;
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(t.x, t.y + 1, 8, 3.6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = ring; ctx.beginPath(); ctx.ellipse(t.x, t.y + 0.5, 7, 2.8, 0, 0, 7); ctx.fill();
    if (t.buffT > 0) { ctx.globalAlpha = 0.4 + 0.3 * Math.sin(W.t * 12); circle(t.x, t.y - 4, 11, null, "#f6d36b", 1.5); ctx.globalAlpha = 1; }
    var shooting = s.rate && t.cd > s.rate - 0.12;
    var fr = SQ[t.type][shooting ? 1 : Math.floor((W.t + t.id * 0.37) * 2) % 2];
    var flip = Math.cos(t.ang) < 0;
    drawSpr(fr, t.x - fr.w / 2, t.y - fr.h + 3 - (shooting ? 1 : 0), flip);
    // couronne / chapeau selon le niveau
    if (top >= 3) {
      var hx = t.x + (flip ? 2 : -2), hy = t.y - fr.h + 1;
      if (top >= 5) { rect(hx - 3, hy - 3, 7, 2, "#f6d36b"); rect(hx - 3, hy - 5, 1, 2, "#f6d36b"); rect(hx, hy - 6, 1, 3, "#f6d36b"); rect(hx + 3, hy - 5, 1, 2, "#f6d36b"); rect(hx, hy - 4, 1, 1, "#c8553d"); }
      else { rect(hx - 3, hy - 2, 7, 2, d.color); rect(hx - 2, hy - 4, 5, 2, d.color); }
    }
    // niveaux des 3 voies
    for (var p = 0; p < 3; p++) for (var i = 0; i < t.tiers[p]; i++) rect(t.x - 6 + p * 5, t.y + 5 - i * 1.4, 3, 1, ["#f2b05e", "#9cd06a", "#9fd8ff"][p]);
    if (t === sel) { ctx.globalAlpha = 0.7 + 0.3 * Math.sin(W.t * 6); circle(t.x, t.y - 3, 11, null, "#f6d36b", 1); ctx.globalAlpha = 1; }
    if (s.ability && t.acd <= 0 && W.running) { rect(t.x + 6, t.y - 16, 3, 3, "#f6d36b"); }
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
     Panneau latéral (boutique, améliorations, pouvoirs)
     ===================================================================== */
  var sideSig = "";
  var TNAME = { first: "Premier", last: "Dernier", strong: "Fort", close: "Proche" };
  function costTxt(c) { return c === Infinity ? "—" : "🌰 " + fmt(c); }
  function towerHtml(t) {
    var d = T[t.type], s = t.st, h = "";
    h += '<div class="td-selhead"><img src="' + sqUrl(t.type) + '" alt=""><div><strong>' + esc(d.name) + "</strong><span>" + esc(d.role) + " · " + fmt(t.kills) + " vaincues</span></div>" +
      '<button class="td-x" type="button" data-act="desel" aria-label="Fermer">✕</button></div>';
    h += '<div class="td-paths">';
    d.paths.forEach(function (p, pi) {
      var tier = t.tiers[pi], lim = K.pathLimit(t, pi), next = p.up[tier];
      var pips = ""; for (var i = 0; i < 5; i++) pips += '<i class="' + (i < tier ? "on" : i >= lim ? "lock" : "") + '"></i>';
      h += '<div class="td-path td-p' + pi + '"><div class="td-pathname">' + esc(p.name) + '<span class="td-pips">' + pips + "</span></div>";
      if (!next) h += '<div class="td-up done">Voie terminée ★</div>';
      else if (tier >= lim) h += '<div class="td-up locked"><strong>' + esc(next.n) + "</strong><span>Voie bloquée : 2 voies au maximum, et une seule au-delà du niveau 2.</span></div>";
      else {
        var c = K.upCost(W, t, pi), can = W.cash >= c;
        h += '<button type="button" class="td-up' + (can ? "" : " poor") + '" data-act="up" data-p="' + pi + '"><strong>' + esc(next.n) + '</strong><span>' + esc(next.d) + '</span><b>' + costTxt(c) + "</b></button>";
      }
      h += "</div>";
    });
    h += "</div>";
    h += '<div class="td-selfoot">';
    if (s.kind !== "aura" && s.kind !== "farm" && s.kind !== "pulse" && s.kind !== "ring") h += '<button type="button" class="btn btn-ghost btn-small" data-act="target">🎯 ' + TNAME[t.target] + "</button>";
    h += '<button type="button" class="btn btn-small" data-act="sell">Vendre ' + costTxt(K.sellValue(W, t)) + "</button></div>";
    if (s.income) h += '<p class="td-note">Rapporte ' + fmt(s.income) + " noisettes par manche.</p>";
    if (t.buffed) h += '<p class="td-note">🌳 Boostée par une tour de soutien.</p>';
    return h;
  }
  function shopHtml() {
    var h = '<div class="td-shop">';
    D.TOWER_ORDER.forEach(function (k, i) {
      var c = K.towerCost(W, k), can = W.cash >= c;
      h += '<button type="button" class="td-buy' + (can ? "" : " poor") + (placing === k ? " on" : "") + '" data-act="buy" data-t="' + k + '" title="' + esc(T[k].name + " — " + T[k].desc) + '">' +
        '<img src="' + sqUrl(k) + '" alt=""><span>' + esc(T[k].name) + "</span><b>" + fmt(c) + "</b><kbd>" + (i + 1) + "</kbd></button>";
    });
    h += "</div>";
    var info = placing || hoverType;
    if (info) h += '<p class="td-info"><strong>' + esc(T[info].name) + "</strong> · " + esc(T[info].role) + "<br>" + esc(T[info].desc) + (placing ? "<br><em>Touche le terrain pour la poser · Échap pour annuler</em>" : "") + "</p>";
    else h += '<p class="td-info">Choisis une tour puis pose-la à côté du chemin. Touche une tour posée pour l\'améliorer.</p>';
    return h;
  }
  function abilitiesHtml() {
    var list = W.towers.filter(function (t) { return t.st.ability; });
    if (!list.length) return "";
    var h = '<div class="td-abil">';
    list.forEach(function (t) {
      var a = t.st.ability, cd = Math.max(0, t.acd), ready = cd <= 0 && W.running;
      h += '<button type="button" class="td-ab' + (ready ? " ready" : "") + '" data-act="ability" data-id="' + t.id + '" title="' + esc(a.name) + '"><img src="' + sqUrl(t.type) + '" alt=""><span>' + esc(a.name) + "</span>" +
        (cd > 0 ? "<b>" + Math.ceil(cd) + " s</b>" : !W.running ? "<b>—</b>" : "<b>Prêt</b>") + "</button>";
    });
    return h + "</div>";
  }
  function updateSide(force) {
    var t = sel && W.towers.indexOf(sel) >= 0 ? sel : null; if (!t) sel = null;
    var aff = D.TOWER_ORDER.map(function (k) { return W.cash >= K.towerCost(W, k) ? 1 : 0; }).join("");
    var upA = t ? [0, 1, 2].map(function (p) { return W.cash >= K.upCost(W, t, p) ? 1 : 0; }).join("") + t.tiers.join("") + t.target + K.sellValue(W, t) : "";
    var ab = W.towers.filter(function (o) { return o.st.ability; }).map(function (o) { return o.id + ":" + Math.ceil(Math.max(0, o.acd)); }).join(",");
    var sig = [t ? t.id : 0, aff, upA, placing, hoverType, ab, W.running, speed, W.auto, W.won, W.towers.length].join("|");
    var top = $("[data-top]");
    if (top) {
      top.querySelector("[data-cash]").textContent = fmt(W.cash);
      top.querySelector("[data-lives]").textContent = fmt(W.lives);
      top.querySelector("[data-round]").textContent = Math.max(1, W.round) + (W.freeplay ? "" : " / " + W.mode.rounds);
    }
    if (sig === sideSig && !force) return;
    sideSig = sig;
    var go = $("[data-go]");
    if (go) {
      go.textContent = W.running ? (speed === 1 ? "▶ Vitesse ×1" : "⏩ Vitesse ×" + speed) : W.won && !W.freeplay ? "Victoire !" : "▶ Manche " + (W.round + 1);
      go.classList.toggle("btn-alt", !W.running);
      go.setAttribute("aria-label", W.running ? "Changer la vitesse" : "Lancer la manche");
    }
    var auto = $("[data-auto]"); if (auto) auto.setAttribute("aria-pressed", W.auto ? "true" : "false");
    var body = $("[data-body]");
    body.innerHTML = abilitiesHtml() + (t ? towerHtml(t) : shopHtml());
  }
  side.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-act]"); if (!b || !W) return;
    var act = b.getAttribute("data-act");
    if (act === "buy") { var k = b.getAttribute("data-t"); placing = placing === k ? null : k; sel = null; ghost = null; SND.place(); }
    if (act === "desel") sel = null;
    if (act === "up" && sel) { if (!K.upgrade(W, sel, +b.getAttribute("data-p"))) SND.no(); handleEvents(); }
    if (act === "sell" && sel) { K.sell(W, sel); sel = null; handleEvents(); }
    if (act === "target" && sel) { K.cycleTarget(sel); }
    if (act === "ability") { var id = +b.getAttribute("data-id"), tw = W.towers.filter(function (o) { return o.id === id; })[0]; if (tw && K.useAbility(W, tw)) handleEvents(); else SND.no(); }
    if (act === "go") goBtn();
    if (act === "auto") { W.auto = !W.auto; }
    updateSide(true);
  });
  side.addEventListener("mouseover", function (ev) {
    var b = ev.target.closest("[data-act=buy]"); var k = b ? b.getAttribute("data-t") : null;
    if (k !== hoverType) { hoverType = k; }
  });
  side.addEventListener("mouseleave", function () { hoverType = null; });
  function goBtn() {
    if (!W || W.over) return;
    if (W.won && !W.freeplay) return;
    if (!W.running) { K.startRound(W); handleEvents(); }
    else speed = speed === 1 ? 2 : speed === 2 ? 3 : 1;
  }

  /* =====================================================================
     Commandes sur le terrain
     ===================================================================== */
  function toLogical(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left - view.ox) / view.scale, y: (e.clientY - r.top - view.oy) / view.scale };
  }
  function towerAt(x, y) {
    var best = null, bd = (CFG.towerR + 4) * (CFG.towerR + 4);
    W.towers.forEach(function (t) { var d = (t.x - x) * (t.x - x) + (t.y - 4 - y) * (t.y - 4 - y); if (d < bd) { bd = d; best = t; } });
    return best;
  }
  var down = null;
  canvas.addEventListener("pointerdown", function (e) {
    if (!W || state !== "play") return;
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    var p = toLogical(e);
    down = { x: p.x, y: p.y, id: e.pointerId, type: e.pointerType };
    if (placing) ghost = { x: Math.round(p.x), y: Math.round(p.y) };
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!W || state !== "play") return;
    var p = toLogical(e);
    if (down && Math.hypot(p.x - down.x, p.y - down.y) > 5) down.moved = true;
    // au doigt : la tour glisse un peu au-dessus du doigt pour rester visible
    if (placing && (e.pointerType === "mouse" || down)) ghost = { x: Math.round(p.x), y: Math.round(p.y) + (e.pointerType !== "mouse" && down && down.moved ? -16 : 0) };
  });
  canvas.addEventListener("pointerup", function (e) {
    if (!W || state !== "play" || !down) return;
    var p = toLogical(e); down = null;
    if (placing) {
      var gx = ghost ? ghost.x : Math.round(p.x), gy = ghost ? ghost.y : Math.round(p.y);
      var err = K.placeError(W, placing, gx, gy);
      if (!err && W.cash >= K.towerCost(W, placing)) {
        var t = K.place(W, placing, gx, gy); handleEvents();
        if (!e.shiftKey) { placing = null; sel = t; }
      } else { SND.no(); if (e.pointerType !== "mouse") return; }
      if (e.pointerType !== "mouse") ghost = null;
      updateSide(true);
      return;
    }
    var tw = towerAt(p.x, p.y);
    sel = tw || null;
    if (tw) SND.place();
    updateSide(true);
  });
  canvas.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse" && placing) ghost = null; });
  canvas.addEventListener("contextmenu", function (e) { if (placing || sel) { e.preventDefault(); placing = null; sel = null; ghost = null; updateSide(true); } });

  document.addEventListener("keydown", function (e) {
    if (!W || state !== "play") return;
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    var k = e.key;
    if (k === " ") { e.preventDefault(); goBtn(); updateSide(true); }
    else if (k === "Escape") { if (placing || sel) { placing = null; sel = null; ghost = null; updateSide(true); } else togglePause(); }
    else if (/^[1-8]$/.test(k)) { placing = D.TOWER_ORDER[+k - 1]; sel = null; updateSide(true); }
    else if (sel && (k === "a" || k === "q" || k === ",")) { K.upgrade(W, sel, 0); handleEvents(); updateSide(true); }
    else if (sel && (k === "z" || k === "w" || k === ";" || k === ".")) { K.upgrade(W, sel, 1); handleEvents(); updateSide(true); }
    else if (sel && (k === "e" || k === ":" || k === "/")) { K.upgrade(W, sel, 2); handleEvents(); updateSide(true); }
    else if (sel && k === "Tab") { e.preventDefault(); K.cycleTarget(sel); updateSide(true); }
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
    state = "menu"; W = null; sel = null; placing = null; paused = false; hud.hidden = true; side.hidden = true; stage.classList.remove("td-playing"); resize();
    var h = '<div class="screen-head"><h2>Écureuil Défense</h2><p class="game-small">Pose des écureuils le long du chemin, améliore-les sur 3 voies et protège ta réserve de noisettes.</p></div>';
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
      '<p class="game-small">Raccourcis : Espace = lancer / accélérer · 1-8 = tours · A Z E = améliorer les voies · Tab = cible · Échap = annuler. Maj + clic pour poser plusieurs tours.</p>';
    showCard(h, "game-card-pause");
    card.querySelector("[data-resume]").addEventListener("click", function () { paused = false; syncHud(); hideOverlay(); });
    card.querySelector("[data-help]").addEventListener("click", showTowers);
    card.querySelector("[data-restart]").addEventListener("click", function () { if (confirm("Recommencer la partie ?")) startGame(); });
    card.querySelector("[data-quit]").addEventListener("click", function () { if (confirm("Quitter la partie ?")) showMenu(); });
  }
  function startGame() {
    W = K.createWorld({ map: S.map, mode: S.mode, seed: (Math.random() * 1e9) | 0 });
    state = "play"; paused = false; speed = 1; sel = null; placing = null; vfx = []; sideSig = "";
    S.games++; save();
    hideOverlay(); hud.hidden = false; side.hidden = false; stage.classList.add("td-playing");
    syncHud(); resize(); updateSide(true);
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
    SND.win(); paused = true; hud.hidden = true; syncHud();
    var h = "<h2>Victoire !</h2><p>" + esc(W.map.name) + " · " + esc(W.mode.name) + " : les " + W.mode.rounds + " manches sont passées, la réserve est sauve.</p>" +
      (first ? '<p class="td-gain">🏅 Nouvelle médaille !</p>' : "") +
      '<ul class="over-stats"><li><span>Vies</span><strong>' + W.lives + "</strong></li><li><span>Bestioles</span><strong>" + fmt(W.kills) + "</strong></li><li><span>Tours</span><strong>" + W.towers.length + "</strong></li></ul>" +
      '<div class="btn-row center"><button class="btn" type="button" data-free>Continuer en mode libre</button><button class="btn btn-ghost" type="button" data-menu>Menu</button></div>';
    showCard(h, "game-card-over");
    card.querySelector("[data-free]").addEventListener("click", function () { W.freeplay = true; paused = false; hud.hidden = false; syncHud(); hideOverlay(); updateSide(true); });
    card.querySelector("[data-menu]").addEventListener("click", showMenu);
  }
  function onLose() {
    record(); SND.over(); state = "over"; hud.hidden = true;
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
