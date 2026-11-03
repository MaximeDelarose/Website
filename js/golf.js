/* =========================================================================
   Mini-golf — solo (9 trous, entraînement) et en ligne (2 à 4 joueurs)
   -------------------------------------------------------------------------
   Vue du dessus, terrain logique 800 × 500 mis à l'échelle du canevas.
   Tir « lance-pierre » : on tire en arrière depuis n'importe où (souris ou
   doigt), ou au clavier (← → angle, ↑ ↓ puissance, Espace pour tirer).
   Les trous sont des données (HOLES) : un contour (poly), un départ, un
   drapeau, et en option du sable, de l'eau, des blocs, des champignons
   rebondissants (bumpers) et un moulin dont les pales tournent.

   En ligne : Supabase Realtime, salon « golf-room-CODE » (code de 4 lettres,
   lien golf.html#salon=CODE). Chacun joue sa propre balle en même temps ;
   les balles des autres sont des fantômes (position diffusée ~12 fois par
   seconde). Le trou suivant démarre quand tout le monde a fini (ou 60 s après
   le premier arrivé) ; c'est le premier joueur présent de la liste (l'hôte)
   qui décide, et il envoie les scores définitifs du trou (« next »).
   Sauvegardes locales : golf-best-v1 (meilleur parcours), golf-name, golf-sound.
   ========================================================================= */
(function () {
  "use strict";
  var root = document.querySelector("[data-golf]");
  if (!root) return;
  var VERSION = "1.0.0";

  function $(s, r) { return (r || document).querySelector(s); }
  function load(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function now() { return Date.now(); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* =====================================================================
     RÉGLAGES
     ===================================================================== */
  var WW = 800, WH = 500;          // terrain logique
  var R = 6;                       // rayon de la balle
  var CUP_R = 11;                  // rayon du trou
  var VMAX = 560;                  // vitesse max d'un tir (px/s)
  var DEC = 170, DEC_SAND = 720;   // décélération herbe / sable (px/s²)
  var REST = 0.84;                 // rebond sur un mur
  var SINK_V = 300;                // vitesse max pour tomber dans le trou
  var MAX_STROKES = 8;             // au-delà, la balle est ramassée
  var STEP = 1 / 240;
  var COLORS = ["#ffffff", "#f6c445", "#6fd3c6", "#f28b8b"];
  var NAMES_SCORE = { "-3": "Albatros !", "-2": "Eagle !", "-1": "Birdie !", "0": "Par", "1": "Bogey", "2": "Double bogey" };

  /* =====================================================================
     TROUS
       poly   : contour du terrain (sens quelconque)
       blocks : [x1,y1,x2,y2] murs pleins, sand / water : [x1,y1,x2,y2]
       bumpers: [x,y,rayon]   mill : { x, y, len, speed (rad/s) }
     ===================================================================== */
  function rect(x1, y1, x2, y2) { return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]; }
  var HOLES = [
    { name: "Premier coup", par: 2, poly: rect(70, 190, 730, 310), tee: [130, 250], cup: [670, 250] },
    { name: "Le coude", par: 3, poly: [[90, 90], [600, 90], [600, 410], [480, 410], [480, 210], [90, 210]], tee: [150, 150], cup: [540, 360] },
    { name: "Les dunes", par: 3, poly: rect(70, 140, 730, 360), tee: [130, 250], cup: [670, 250], sand: [[300, 140, 380, 290], [430, 210, 510, 360]] },
    { name: "Le lac", par: 3, poly: rect(70, 130, 730, 370), tee: [130, 250], cup: [670, 250], water: [[330, 130, 470, 300]] },
    { name: "Les champignons", par: 3, poly: rect(70, 100, 730, 400), tee: [130, 250], cup: [680, 250], bumpers: [[330, 190, 24], [330, 310, 24], [480, 250, 24], [600, 160, 18], [600, 340, 18]] },
    { name: "Zigzag", par: 4, poly: rect(70, 100, 730, 400), tee: [130, 160], cup: [650, 340], blocks: [[250, 100, 275, 300], [460, 200, 485, 400]] },
    { name: "Le moulin", par: 3, poly: rect(70, 170, 730, 330), tee: [130, 250], cup: [670, 250], mill: { x: 400, y: 250, len: 72, speed: 1.3 } },
    { name: "Le grand huit", par: 4, poly: [[80, 80], [520, 80], [520, 200], [720, 200], [720, 420], [280, 420], [280, 300], [80, 300]], tee: [130, 130], cup: [670, 370], sand: [[330, 215, 430, 290]] },
    { name: "La grande finale", par: 4, poly: rect(60, 90, 740, 410), tee: [110, 250], cup: [690, 250], water: [[300, 90, 360, 270], [460, 230, 520, 410]], sand: [[570, 170, 630, 330]], bumpers: [[410, 160, 16], [410, 340, 16]] },
  ];
  HOLES.forEach(function (h) {
    var segs = [], p = h.poly;
    for (var i = 0; i < p.length; i++) { var a = p[i], b = p[(i + 1) % p.length]; segs.push([a[0], a[1], b[0], b[1]]); }
    (h.blocks || []).forEach(function (r) { segs.push([r[0], r[1], r[2], r[1]], [r[2], r[1], r[2], r[3]], [r[2], r[3], r[0], r[3]], [r[0], r[3], r[0], r[1]]); });
    h.segs = segs;
  });
  function inPoly(poly, x, y) {
    var c = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function inRects(list, x, y) {
    if (!list) return false;
    for (var i = 0; i < list.length; i++) { var r = list[i]; if (x > r[0] && x < r[2] && y > r[1] && y < r[3]) return true; }
    return false;
  }
  function millAngle(h) { return (now() / 1000) * h.mill.speed; }

  /* =====================================================================
     SONS (WebAudio)
     ===================================================================== */
  var soundOn = load("golf-sound", true), AC = null;
  function ac() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
    if (AC && AC.state === "suspended") AC.resume();
    return AC;
  }
  function tone(t0, freq, dur, vol, type, slide) {
    var a = ac(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0;
    o.type = type || "triangle"; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function sfx(n, k) {
    if (!soundOn) return;
    if (n === "hit") { tone(0, 220 + 260 * (k || 0.5), 0.09, 0.22, "square", 90); }
    else if (n === "wall") { tone(0, 160 + 200 * (k || 0.3), 0.05, 0.1 * clamp(k || 0.3, 0.3, 1), "triangle"); }
    else if (n === "bump") { tone(0, 420, 0.12, 0.18, "sine", 760); }
    else if (n === "sink") { tone(0, 520, 0.12, 0.2); tone(0.1, 660, 0.12, 0.2); tone(0.2, 880, 0.22, 0.2); }
    else if (n === "splash") { tone(0, 300, 0.3, 0.2, "sawtooth", 70); }
    else if (n === "notify") { tone(0, 600, 0.1, 0.12); tone(0.1, 800, 0.12, 0.12); }
  }

  /* =====================================================================
     ÉTAT
     ===================================================================== */
  var NAME = String(load("golf-name", "") || "").slice(0, 16);
  var NET = { id: sget("golf-net-id"), client: null, ch: null, code: null, role: null, roster: [], status: "", err: "", ts: 0, lastPos: 0 };
  if (!NET.id) { NET.id = Math.random().toString(36).slice(2, 10); sset("golf-net-id", NET.id); }
  var ME = NET.id;
  var G = null;           // partie en cours (voir newGame)
  var screen = "main";
  var best = load("golf-best-v1", null);   // { total, par }

  var stage = $("[data-stage]", root), canvas = $("[data-canvas]", root), cx = canvas.getContext("2d");
  var overlay = $("[data-overlay]", root), cardEl = $("[data-card]", root);
  var hudHole = $("[data-hud-hole]", root), hudStrokes = $("[data-hud-strokes]", root), hudBoard = $("[data-hud-board]", root);
  var hudPower = $("[data-power]", root), hudMsg = $("[data-msg]", root), hudBar = $("[data-hud]", root);
  var cw = 0, ch = 0, dpr = 1, sc = 1, ox = 0, oy = 0;

  function newGame(o) {
    var g = {
      mode: o.mode, gid: o.gid || "", order: o.order, hi: 0,
      players: o.players, scores: {}, doneAll: {}, others: {},
      phase: "aim", strokes: 0, ball: { x: 0, y: 0, vx: 0, vy: 0 }, rest: { x: 0, y: 0 },
      sinkT: 0, sinkFrom: null, ang: 0, pow: 0.55, kbd: false, drag: null,
      firstDoneAt: 0, nextAt: 0, over: false, msg: "", msgT: 0, fx: [], lastSend: 0,
    };
    g.players.forEach(function (p) { g.scores[p.id] = []; });
    return g;
  }
  function curHole() { return HOLES[G.order[G.hi]]; }
  function playerIndex(id) { for (var i = 0; i < G.players.length; i++) if (G.players[i].id === id) return i; return -1; }
  function loadHole() {
    var h = curHole();
    G.strokes = 0; G.phase = "aim"; G.sinkT = 0; G.drag = null; G.nextAt = 0; G.fx = [];
    G.firstDoneAt = Object.keys(G.doneAll[G.hi] || {}).length ? now() : 0;
    G.ball = { x: h.tee[0], y: h.tee[1], vx: 0, vy: 0 };
    G.rest = { x: h.tee[0], y: h.tee[1] };
    G.ang = Math.atan2(h.cup[1] - h.tee[1], h.cup[0] - h.tee[0]);
    G.others = {};
    G.players.forEach(function (p) { if (p.id !== ME) G.others[p.id] = { x: h.tee[0], y: h.tee[1], tx: h.tee[0], ty: h.tee[1], s: 0, done: false, holed: false }; });
    setMsg(G.mode === "practice" ? "" : "Trou " + (G.hi + 1) + " · " + h.name, 2200);
    fitView();
    hudUpdate(true);
    if (G.mode === "online") netSend("pos", { gid: G.gid, h: G.hi, id: ME, x: h.tee[0], y: h.tee[1], s: 0 });
  }
  function setMsg(t, ms) { if (!G) return; G.msg = t; G.msgT = now() + (ms || 2000); }

  /* =====================================================================
     PHYSIQUE
     ===================================================================== */
  function stepBall(dt) {
    var b = G.ball, h = curHole(), hit = 0, bump = 0, i;
    var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (sp > 0) {
      var dec = inRects(h.sand, b.x, b.y) ? DEC_SAND : DEC;
      var ns = Math.max(0, sp - dec * dt) * (1 - 0.25 * dt);
      b.vx *= ns / sp; b.vy *= ns / sp; sp = ns;
      if (sp < 9) { b.vx = 0; b.vy = 0; sp = 0; }
    }
    // gravité douce vers le trou quand la balle roule lentement dessus
    var cdx = h.cup[0] - b.x, cdy = h.cup[1] - b.y, cd = Math.sqrt(cdx * cdx + cdy * cdy);
    if (cd < CUP_R * 2 && sp < 160 && sp > 0) { b.vx += cdx / (cd || 1) * 520 * dt; b.vy += cdy / (cd || 1) * 520 * dt; }
    b.x += b.vx * dt; b.y += b.vy * dt;

    var segs = h.segs;
    if (h.mill) {
      var a = millAngle(h), ca = Math.cos(a) * h.mill.len, sa = Math.sin(a) * h.mill.len;
      segs = segs.concat([[h.mill.x - ca, h.mill.y - sa, h.mill.x + ca, h.mill.y + sa]]);
      bump = Math.max(bump, circle(b, h.mill.x, h.mill.y, 9, 0.6));
    }
    for (i = 0; i < segs.length; i++) {
      var s = segs[i], dx = s[2] - s[0], dy = s[3] - s[1], l2 = dx * dx + dy * dy;
      var t = clamp(((b.x - s[0]) * dx + (b.y - s[1]) * dy) / l2, 0, 1);
      var px = s[0] + t * dx, py = s[1] + t * dy, ex = b.x - px, ey = b.y - py, d2 = ex * ex + ey * ey;
      if (d2 < R * R) {
        var d = Math.sqrt(d2) || 0.0001, nx = ex / d, ny = ey / d;
        b.x = px + nx * R; b.y = py + ny * R;
        var vn = b.vx * nx + b.vy * ny;
        if (vn < 0) { b.vx -= (1 + REST) * vn * nx; b.vy -= (1 + REST) * vn * ny; hit = Math.max(hit, -vn); }
      }
    }
    if (h.bumpers) for (i = 0; i < h.bumpers.length; i++) bump = Math.max(bump, circle(b, h.bumpers[i][0], h.bumpers[i][1], h.bumpers[i][2], 1.08, i));
    if (hit > 40) sfx("wall", hit / VMAX);
    if (bump > 40) sfx("bump");

    // trou
    cdx = h.cup[0] - b.x; cdy = h.cup[1] - b.y;
    sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (Math.sqrt(cdx * cdx + cdy * cdy) < CUP_R && sp < SINK_V) {
      G.phase = "sink"; G.sinkT = 0; G.sinkFrom = { x: b.x, y: b.y }; b.vx = b.vy = 0;
      sfx("sink");
      return;
    }
    // eau
    if (inRects(h.water, b.x, b.y)) {
      G.fx.push({ k: "splash", x: b.x, y: b.y, t: 0 });
      sfx("splash");
      G.strokes++;
      b.x = G.rest.x; b.y = G.rest.y; b.vx = b.vy = 0;
      setMsg("Plouf ! +1 coup", 1800);
      if (G.strokes >= MAX_STROKES) { finishHole(false); return; }
      toAim();
      return;
    }
    // sécurité : balle sortie du terrain
    if (!inPoly(h.poly, b.x, b.y)) { b.x = G.rest.x; b.y = G.rest.y; b.vx = b.vy = 0; toAim(); return; }
    if (b.vx === 0 && b.vy === 0) {
      if (G.strokes >= MAX_STROKES) finishHole(false); else toAim();
    }
  }
  function circle(b, cxx, cyy, r, e, idx) {
    var dx = b.x - cxx, dy = b.y - cyy, d = Math.sqrt(dx * dx + dy * dy), m = r + R;
    if (d >= m) return 0;
    d = d || 0.0001;
    var nx = dx / d, ny = dy / d;
    b.x = cxx + nx * m; b.y = cyy + ny * m;
    var vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
      if (idx != null) G.fx.push({ k: "bump", i: idx, t: 0 });
      return -vn;
    }
    return 0;
  }
  function toAim() {
    G.phase = "aim"; G.rest = { x: G.ball.x, y: G.ball.y };
    var h = curHole();
    if (!G.kbd) G.ang = Math.atan2(h.cup[1] - G.ball.y, h.cup[0] - G.ball.x);
    if (G.mode === "online") sendPos(true);
  }
  function shoot(ang, pow) {
    if (!G || G.phase !== "aim" || !overlay.hidden) return;
    pow = clamp(pow, 0.04, 1);
    G.strokes++;
    G.rest = { x: G.ball.x, y: G.ball.y };
    G.ball.vx = Math.cos(ang) * pow * VMAX; G.ball.vy = Math.sin(ang) * pow * VMAX;
    G.phase = "roll"; G.drag = null;
    sfx("hit", pow);
    hudUpdate(true);
    if (G.mode === "online") sendPos(true);
  }
  function sendPos(force) {
    if (!G || G.mode !== "online") return;
    var t = now();
    if (!force && t - G.lastSend < 80) return;
    G.lastSend = t;
    netSend("pos", { gid: G.gid, h: G.hi, id: ME, x: Math.round(G.ball.x * 10) / 10, y: Math.round(G.ball.y * 10) / 10, s: G.strokes, f: G.phase === "sink" ? 1 : 0 });
  }

  /* =====================================================================
     FIN DE TROU / PARTIE
     ===================================================================== */
  function verdict(s, par, holed) {
    if (!holed) return "Balle ramassée";
    if (s === 1) return "Trou en un ! 🎉";
    var d = s - par;
    return NAMES_SCORE[String(d)] || ("+" + d);
  }
  function finishHole(holed) {
    if (!G || G.phase === "done") return;
    var s = holed ? G.strokes : MAX_STROKES;
    G.phase = "done";
    G.scores[ME][G.hi] = s;
    if (G.mode === "online") {
      markDone(ME, s, holed, G.hi);
      netSend("done", { gid: G.gid, h: G.hi, id: ME, s: s, c: holed ? 1 : 0 });
      setMsg(verdict(s, curHole().par, holed) + " · on attend les autres…", 60000);
      hudUpdate(true);
      return;
    }
    hudUpdate(true);
    setTimeout(function () { if (G && G.phase === "done") showHoleCard(s, holed); }, holed ? 450 : 200);
  }
  function totalOf(id, upto) {
    var a = G.scores[id] || [], t = 0;
    for (var i = 0; i < a.length && (upto == null || i < upto); i++) if (a[i] != null) t += a[i];
    return t;
  }
  function parOf(upto) { var t = 0; for (var i = 0; i < G.order.length && (upto == null || i < upto); i++) t += HOLES[G.order[i]].par; return t; }

  /* ---------- solo : enchaîner les trous ---------- */
  function soloNext() {
    if (G.mode === "practice") { startPractice(G.order[0]); return; }
    if (G.hi + 1 >= G.order.length) { showSoloEnd(); return; }
    G.hi++; loadHole(); closeCard();
  }

  /* =====================================================================
     RENDU
     ===================================================================== */
  function resize() {
    var r = stage.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    cw = Math.max(200, r.width); ch = Math.max(200, r.height);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
    fitView();
  }
  // cadre la vue sur le trou en cours (contour + marge)
  function fitView() {
    var x1 = 0, y1 = 0, x2 = WW, y2 = WH;
    if (G) {
      var p = curHole().poly; x1 = y1 = 1e9; x2 = y2 = -1e9;
      for (var i = 0; i < p.length; i++) { x1 = Math.min(x1, p[i][0]); x2 = Math.max(x2, p[i][0]); y1 = Math.min(y1, p[i][1]); y2 = Math.max(y2, p[i][1]); }
      x1 -= 34; x2 += 34; y1 -= 56; y2 += 34;
    }
    sc = Math.min(cw / (x2 - x1), ch / (y2 - y1));
    ox = (cw - (x2 - x1) * sc) / 2 - x1 * sc; oy = (ch - (y2 - y1) * sc) / 2 - y1 * sc;
  }
  function toWorld(ev) {
    var r = canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left - ox) / sc, y: (ev.clientY - r.top - oy) / sc };
  }
  function polyPath(p) { cx.beginPath(); cx.moveTo(p[0][0], p[0][1]); for (var i = 1; i < p.length; i++) cx.lineTo(p[i][0], p[i][1]); cx.closePath(); }

  function drawBall(x, y, color, scale, alpha, label) {
    cx.save(); cx.globalAlpha = alpha == null ? 1 : alpha;
    cx.fillStyle = "rgba(0,0,0,.28)"; cx.beginPath(); cx.ellipse(x + 2, y + 3, R * scale, R * scale * 0.7, 0, 0, 6.3); cx.fill();
    cx.fillStyle = color; cx.strokeStyle = "#1a1208"; cx.lineWidth = 1.5;
    cx.beginPath(); cx.arc(x, y, R * scale, 0, 6.3); cx.fill(); cx.stroke();
    cx.fillStyle = "rgba(255,255,255,.7)"; cx.beginPath(); cx.arc(x - 2 * scale, y - 2 * scale, 1.8 * scale, 0, 6.3); cx.fill();
    if (label) {
      cx.font = "bold 12px Nunito, sans-serif"; cx.textAlign = "center"; cx.lineWidth = 3; cx.strokeStyle = "rgba(20,12,4,.85)"; cx.fillStyle = "#fdf3de";
      cx.strokeText(label, x, y - 12); cx.fillText(label, x, y - 12);
    }
    cx.restore();
  }

  function draw(t) {
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.fillStyle = "#1f3a2b"; cx.fillRect(0, 0, cw, ch);
    if (!G) { drawIdle(t); return; }
    var h = curHole(), i, k;
    cx.save(); cx.translate(ox, oy); cx.scale(sc, sc);
    // ombre + herbe
    cx.save(); cx.translate(0, 8); polyPath(h.poly); cx.fillStyle = "rgba(0,0,0,.3)"; cx.fill(); cx.restore();
    polyPath(h.poly); cx.fillStyle = "#5fae4f"; cx.fill();
    cx.save(); polyPath(h.poly); cx.clip();
    cx.fillStyle = "rgba(255,255,255,.06)";
    for (i = 0; i < WW; i += 80) cx.fillRect(i, 0, 40, WH);
    // sable
    (h.sand || []).forEach(function (r) {
      cx.fillStyle = "#e6cd8c"; cx.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
      cx.fillStyle = "rgba(150,110,50,.35)";
      for (var x = r[0] + 6; x < r[2]; x += 14) for (var y = r[1] + 6 + ((x / 14) % 2) * 7; y < r[3]; y += 14) cx.fillRect(x, y, 2, 2);
    });
    // eau
    (h.water || []).forEach(function (r) {
      cx.fillStyle = "#3f95cf"; cx.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
      cx.strokeStyle = "rgba(255,255,255,.45)"; cx.lineWidth = 2;
      for (var y = r[1] + 12; y < r[3]; y += 22) {
        cx.beginPath();
        for (var x = r[0]; x <= r[2]; x += 6) { var yy = y + Math.sin(x * 0.12 + t / 420 + y) * 2.5; if (x === r[0]) cx.moveTo(x, yy); else cx.lineTo(x, yy); }
        cx.stroke();
      }
    });
    cx.restore();
    // blocs
    (h.blocks || []).forEach(function (r) {
      cx.fillStyle = "#8a5a2b"; cx.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
      cx.fillStyle = "#b5793a"; cx.fillRect(r[0] + 3, r[1] + 3, r[2] - r[0] - 6, r[3] - r[1] - 6);
      cx.strokeStyle = "#2b1709"; cx.lineWidth = 2; cx.strokeRect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
    });
    // murs du contour
    cx.lineJoin = "round"; polyPath(h.poly);
    cx.strokeStyle = "#2b1709"; cx.lineWidth = 12; cx.stroke();
    cx.strokeStyle = "#8a5a2b"; cx.lineWidth = 9; cx.stroke();
    cx.strokeStyle = "#c28a4a"; cx.lineWidth = 3; cx.stroke();
    // champignons
    (h.bumpers || []).forEach(function (b, idx) {
      var pop = 0;
      for (k = 0; k < G.fx.length; k++) if (G.fx[k].k === "bump" && G.fx[k].i === idx) pop = Math.max(pop, 1 - G.fx[k].t / 0.18);
      var rr = b[2] * (1 + pop * 0.14);
      cx.fillStyle = "rgba(0,0,0,.25)"; cx.beginPath(); cx.ellipse(b[0] + 3, b[1] + 5, rr, rr * 0.85, 0, 0, 6.3); cx.fill();
      cx.fillStyle = "#d9433a"; cx.strokeStyle = "#2b1709"; cx.lineWidth = 3; cx.beginPath(); cx.arc(b[0], b[1], rr, 0, 6.3); cx.fill(); cx.stroke();
      cx.fillStyle = "#fdf3de";
      [[-0.4, -0.35, 0.22], [0.35, -0.2, 0.18], [-0.05, 0.4, 0.2], [0.1, -0.05, 0.12]].forEach(function (d) { cx.beginPath(); cx.arc(b[0] + d[0] * rr, b[1] + d[1] * rr, d[2] * rr, 0, 6.3); cx.fill(); });
    });
    // départ et trou
    cx.fillStyle = "rgba(0,0,0,.18)"; cx.beginPath(); cx.arc(h.tee[0], h.tee[1], 14, 0, 6.3); cx.fill();
    cx.fillStyle = "#12100b"; cx.strokeStyle = "#2b1709"; cx.lineWidth = 2; cx.beginPath(); cx.arc(h.cup[0], h.cup[1], CUP_R, 0, 6.3); cx.fill(); cx.stroke();
    // moulin
    if (h.mill) {
      var a = millAngle(h), ca = Math.cos(a) * h.mill.len, sa = Math.sin(a) * h.mill.len;
      cx.lineCap = "round";
      cx.strokeStyle = "rgba(0,0,0,.28)"; cx.lineWidth = 9; cx.beginPath(); cx.moveTo(h.mill.x - ca + 3, h.mill.y - sa + 5); cx.lineTo(h.mill.x + ca + 3, h.mill.y + sa + 5); cx.stroke();
      cx.strokeStyle = "#2b1709"; cx.lineWidth = 9; cx.beginPath(); cx.moveTo(h.mill.x - ca, h.mill.y - sa); cx.lineTo(h.mill.x + ca, h.mill.y + sa); cx.stroke();
      cx.strokeStyle = "#fdf3de"; cx.lineWidth = 5; cx.beginPath(); cx.moveTo(h.mill.x - ca, h.mill.y - sa); cx.lineTo(h.mill.x + ca, h.mill.y + sa); cx.stroke();
      cx.strokeStyle = "#d9433a"; cx.lineWidth = 5; cx.beginPath(); cx.moveTo(h.mill.x + ca * 0.62, h.mill.y + sa * 0.62); cx.lineTo(h.mill.x + ca, h.mill.y + sa); cx.moveTo(h.mill.x - ca * 0.62, h.mill.y - sa * 0.62); cx.lineTo(h.mill.x - ca, h.mill.y - sa); cx.stroke();
      cx.lineCap = "butt";
      cx.fillStyle = "#8a5a2b"; cx.strokeStyle = "#2b1709"; cx.lineWidth = 2.5; cx.beginPath(); cx.arc(h.mill.x, h.mill.y, 9, 0, 6.3); cx.fill(); cx.stroke();
    }
    // drapeau
    cx.strokeStyle = "#fdf3de"; cx.lineWidth = 2.5; cx.beginPath(); cx.moveTo(h.cup[0], h.cup[1]); cx.lineTo(h.cup[0], h.cup[1] - 34); cx.stroke();
    cx.fillStyle = "#f6c445"; cx.strokeStyle = "#2b1709"; cx.lineWidth = 1.5;
    var wv = Math.sin(t / 260) * 2;
    cx.beginPath(); cx.moveTo(h.cup[0], h.cup[1] - 34); cx.lineTo(h.cup[0] + 17, h.cup[1] - 29 + wv); cx.lineTo(h.cup[0], h.cup[1] - 22); cx.closePath(); cx.fill(); cx.stroke();

    // balles des autres (fantômes)
    G.players.forEach(function (p, idx) {
      if (p.id === ME) return;
      var o = G.others[p.id]; if (!o || o.holed) return;
      drawBall(o.x, o.y, COLORS[idx % COLORS.length], 1, 0.62, p.name);
    });
    // ma balle
    var myCol = COLORS[Math.max(0, playerIndex(ME)) % COLORS.length];
    if (G.phase === "sink") {
      var u = clamp(G.sinkT / 0.35, 0, 1);
      drawBall(G.sinkFrom.x + (h.cup[0] - G.sinkFrom.x) * u, G.sinkFrom.y + (h.cup[1] - G.sinkFrom.y) * u, myCol, 1 - u * 0.8);
    } else if (G.phase === "aim" || G.phase === "roll") drawBall(G.ball.x, G.ball.y, myCol, 1);
    // éclaboussures
    G.fx.forEach(function (f) {
      if (f.k !== "splash") return;
      var u = f.t / 0.6; cx.strokeStyle = "rgba(255,255,255," + (1 - u) + ")"; cx.lineWidth = 3;
      cx.beginPath(); cx.arc(f.x, f.y, 6 + u * 24, 0, 6.3); cx.stroke();
    });
    // visée
    if (G.phase === "aim" && overlay.hidden) {
      var ang = G.ang, pw = G.pow;
      if (G.drag) {
        var ddx = G.drag.sx - G.drag.cx, ddy = G.drag.sy - G.drag.cy, dl = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dl > 14) { ang = Math.atan2(ddy, ddx); pw = clamp((dl - 10) / 150, 0.04, 1); G.dragOK = true; } else G.dragOK = false;
      } else G.dragOK = true;
      if (G.dragOK && (G.drag || G.kbd)) {
        var len = 30 + pw * 150, ux = Math.cos(ang), uy = Math.sin(ang);
        cx.strokeStyle = "rgba(20,12,4,.55)"; cx.lineWidth = 6; cx.setLineDash([2, 12]); cx.lineCap = "round";
        cx.beginPath(); cx.moveTo(G.ball.x + ux * 12, G.ball.y + uy * 12); cx.lineTo(G.ball.x + ux * len, G.ball.y + uy * len); cx.stroke();
        cx.strokeStyle = "hsl(" + Math.round(120 - 120 * pw) + ",85%,62%)"; cx.lineWidth = 3.5;
        cx.beginPath(); cx.moveTo(G.ball.x + ux * 12, G.ball.y + uy * 12); cx.lineTo(G.ball.x + ux * len, G.ball.y + uy * len); cx.stroke();
        cx.setLineDash([]);
        cx.fillStyle = cx.strokeStyle; cx.beginPath();
        cx.moveTo(G.ball.x + ux * (len + 10), G.ball.y + uy * (len + 10)); cx.lineTo(G.ball.x + ux * len - uy * 6, G.ball.y + uy * len + ux * 6); cx.lineTo(G.ball.x + ux * len + uy * 6, G.ball.y + uy * len - ux * 6); cx.closePath(); cx.fill();
        cx.lineCap = "butt";
        G.shownAng = ang; G.shownPow = pw;
        hudPower.style.width = Math.round(pw * 100) + "%";
        hudPower.style.background = "hsl(" + Math.round(120 - 120 * pw) + ",75%,52%)";
      } else if (!G.drag) { hudPower.style.width = Math.round(G.pow * 100) + "%"; }
      if (!G.drag && !G.kbd) { cx.fillStyle = "rgba(255,255,255,.9)"; cx.beginPath(); cx.arc(G.ball.x, G.ball.y - 18 + Math.sin(t / 240) * 2, 3, 0, 6.3); cx.fill(); }
    }
    cx.restore();
    // message central
    if (G.msg && now() < G.msgT) {
      cx.font = "800 " + Math.round(clamp(cw / 22, 15, 26)) + "px Nunito, sans-serif"; cx.textAlign = "center";
      cx.lineWidth = 5; cx.strokeStyle = "#2b1709"; cx.fillStyle = "#fdf3de";
      var my = ch - 22;
      cx.strokeText(G.msg, cw / 2, my); cx.fillText(G.msg, cw / 2, my);
    }
  }
  function drawIdle(t) {
    cx.save(); cx.translate(ox, oy); cx.scale(sc, sc);
    var h = HOLES[3];
    polyPath(h.poly); cx.fillStyle = "#5fae4f"; cx.fill();
    cx.strokeStyle = "#8a5a2b"; cx.lineWidth = 9; cx.stroke();
    cx.restore();
  }

  /* =====================================================================
     BOUCLE
     ===================================================================== */
  var lastT = 0, acc = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (ts - lastT) / 1000 || 0); lastT = ts;
    if (G) {
      acc += dt;
      while (acc >= STEP) {
        acc -= STEP;
        if (G.phase === "roll") stepBall(STEP);
        else if (G.phase === "sink") { G.sinkT += STEP; if (G.sinkT >= 0.35) { finishHole(true); } }
      }
      if (G.phase === "roll" && G.mode === "online") sendPos(false);
      G.fx = G.fx.filter(function (f) { f.t += dt; return f.t < (f.k === "splash" ? 0.6 : 0.18); });
      if (G.mode === "online") {
        Object.keys(G.others).forEach(function (id) { var o = G.others[id]; var k = Math.min(1, dt * 14); o.x += (o.tx - o.x) * k; o.y += (o.ty - o.y) * k; });
        leaderTick();
      }
      if (ts - (frame.hud || 0) > 200) { frame.hud = ts; hudUpdate(false); }
    }
    draw(ts);
  }

  /* =====================================================================
     SAISIE
     ===================================================================== */
  canvas.addEventListener("pointerdown", function (ev) {
    if (!G || G.phase !== "aim" || !overlay.hidden) return;
    ac();
    var p = toWorld(ev);
    G.drag = { sx: p.x, sy: p.y, cx: p.x, cy: p.y, id: ev.pointerId };
    G.kbd = false;
    try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
    ev.preventDefault();
  });
  canvas.addEventListener("pointermove", function (ev) {
    if (!G || !G.drag || G.drag.id !== ev.pointerId) return;
    var p = toWorld(ev); G.drag.cx = p.x; G.drag.cy = p.y;
  });
  function endDrag(ev, fire) {
    if (!G || !G.drag || G.drag.id !== ev.pointerId) return;
    var d = G.drag; G.drag = null;
    if (!fire) return;
    var dx = d.sx - d.cx, dy = d.sy - d.cy, l = Math.sqrt(dx * dx + dy * dy);
    if (l > 14) shoot(Math.atan2(dy, dx), clamp((l - 10) / 150, 0.04, 1));
  }
  canvas.addEventListener("pointerup", function (ev) { endDrag(ev, true); });
  canvas.addEventListener("pointercancel", function (ev) { endDrag(ev, false); });
  document.addEventListener("keydown", function (ev) {
    if (!G || G.phase !== "aim" || !overlay.hidden) return;
    var tg = ev.target && ev.target.tagName;
    if (tg === "INPUT" || tg === "TEXTAREA" || tg === "BUTTON" || tg === "SELECT") return;
    var k = ev.key, used = true, fine = ev.shiftKey ? 0.2 : 1;
    if (k === "ArrowLeft") G.ang -= 0.035 * fine;
    else if (k === "ArrowRight") G.ang += 0.035 * fine;
    else if (k === "ArrowUp") G.pow = clamp(G.pow + 0.03, 0.04, 1);
    else if (k === "ArrowDown") G.pow = clamp(G.pow - 0.03, 0.04, 1);
    else if (k === " " || k === "Enter") { if (G.kbd) shoot(G.ang, G.pow); }
    else used = false;
    if (used) { G.kbd = true; ev.preventDefault(); ac(); }
  });
  window.addEventListener("resize", resize);

  /* =====================================================================
     HUD
     ===================================================================== */
  function hudUpdate(force) {
    if (!G) { hudBar.hidden = true; fitView(); return; }
    hudBar.hidden = false;
    var h = curHole();
    hudHole.textContent = G.mode === "practice" ? "Entraînement · " + h.name : "Trou " + (G.hi + 1) + "/" + G.order.length + " · " + h.name;
    hudStrokes.textContent = "Par " + h.par + " · Coups " + G.strokes;
    if (G.mode === "online") {
      var rows = G.players.map(function (p, i) {
        var tot = totalOf(p.id, G.hi), o = G.others[p.id], live = p.id === ME ? G.strokes : (o ? o.s : 0);
        var dn = (G.doneAll[G.hi] || {})[p.id];
        return '<li><i style="background:' + COLORS[i % COLORS.length] + '"></i><b>' + esc(p.name) + (p.id === ME ? " (toi)" : "") + "</b><span>" + (dn ? "✔ " + dn.s : (live ? live + "…" : "·")) + " · " + (tot + (dn ? dn.s : 0)) + "</span></li>";
      }).join("");
      if (hudBoard.dataset.k !== rows) { hudBoard.dataset.k = rows; hudBoard.innerHTML = rows; }
      hudBoard.hidden = false;
    } else hudBoard.hidden = true;
  }

  /* =====================================================================
     ÉCRANS (overlay)
     ===================================================================== */
  function showCard(html, cls) { cardEl.className = "panel game-card golf-card" + (cls ? " " + cls : ""); cardEl.innerHTML = html; overlay.hidden = false; }
  function closeCard() { overlay.hidden = true; screen = ""; }
  function nameField() { return '<label class="golf-field">Ton pseudo <input type="text" maxlength="16" data-name value="' + esc(NAME) + '" placeholder="Écureuil" autocomplete="nickname"></label>'; }
  function readName() { var i = $("[data-name]", cardEl); if (i) { NAME = i.value.trim().slice(0, 16); save("golf-name", NAME); } }
  function myName() { return NAME || "Écureuil"; }

  function showMenu(which) {
    screen = which || "main";
    if (screen === "main") {
      showCard('<h2>⛳ Mini-golf</h2>' +
        '<p>9 trous dans la forêt : sable, eau, champignons rebondissants et un moulin qui ne perd pas le nord. Moins tu tapes, mieux c\'est.</p>' +
        (best ? '<p class="golf-best">Meilleur parcours : <strong>' + best.total + "</strong> coups (" + diffStr(best.total - best.par) + ")</p>" : "") +
        '<div class="golf-stack">' +
        '<button class="btn" type="button" data-act="solo">▶ Parcours solo · 9 trous</button>' +
        '<button class="btn btn-alt" type="button" data-act="online">🌐 Jouer en ligne (2 à 4)</button>' +
        '<button class="btn btn-ghost" type="button" data-act="practice">🎯 S\'entraîner sur un trou</button>' +
        "</div>" +
        '<p class="game-small"><label><input type="checkbox" data-sound ' + (soundOn ? "checked" : "") + "> Sons</label></p>");
    } else if (screen === "practice") {
      showCard('<h2>🎯 Entraînement</h2><p>Choisis un trou, rejoue-le autant que tu veux.</p><div class="golf-picks">' +
        HOLES.map(function (h, i) { return '<button class="btn btn-ghost btn-small" type="button" data-act="p1" data-h="' + i + '"><b>' + (i + 1) + "</b> " + esc(h.name) + " <small>Par " + h.par + "</small></button>"; }).join("") +
        '</div><button class="btn btn-small" type="button" data-act="menu">← Retour</button>');
    } else if (screen === "online") {
      showCard('<h2>🌐 En ligne</h2>' +
        '<p>Chacun joue sa balle en même temps, les autres apparaissent en fantômes. Le plus petit score gagne.</p>' + nameField() +
        (NET.err ? '<p class="golf-err">' + esc(NET.err) + "</p>" : "") +
        '<div class="golf-stack"><button class="btn" type="button" data-act="create">✨ Créer un salon</button>' +
        '<div class="golf-join"><input type="text" maxlength="4" data-code placeholder="CODE" autocapitalize="characters" autocomplete="off" spellcheck="false"><button class="btn btn-alt" type="button" data-act="join">Rejoindre</button></div></div>' +
        '<button class="btn btn-small btn-ghost" type="button" data-act="menu">← Retour</button>');
    } else if (screen === "lobby" || screen === "joining") {
      var host = NET.role === "host", n = NET.roster.length;
      var rows = NET.roster.map(function (x, i) { return '<li><i style="background:' + COLORS[i % COLORS.length] + '"></i>' + esc(x.name || "Écureuil") + (x.host ? " 👑" : "") + (x.id === NET.id ? " (toi)" : "") + (i >= 4 ? " · spectateur" : "") + "</li>"; }).join("");
      var link = location.href.split("#")[0] + "#salon=" + (NET.code || "");
      showCard('<h2>Salon <span class="golf-code">' + esc(NET.code || "") + "</span></h2>" +
        (NET.status && NET.status !== "SUBSCRIBED" ? "<p>Connexion au salon…</p>" : "") +
        (NET.err ? '<p class="golf-err">' + esc(NET.err) + "</p>" : "") +
        '<p class="game-small">Envoie le code (ou ce lien) à tes amis : <code>' + esc(link) + "</code></p>" +
        '<ul class="golf-roster">' + (rows || "<li>…</li>") + "</ul>" +
        (G && G.mode === "online" && !G.over ? '<p class="game-small">Une partie est en cours.</p>' : "") +
        (NET.busy ? '<p class="game-small">Une partie est déjà en cours, tu joueras la prochaine.</p>' : "") +
        '<div class="btn-row center">' +
        (host ? '<button class="btn" type="button" data-act="start"' + (n < 2 ? " disabled" : "") + ">▶ Lancer la partie" + (n < 2 ? " (il faut être 2)" : "") + "</button>" : '<span class="waiting">En attente de l\'hôte…</span>') +
        '<button class="btn btn-alt btn-small" type="button" data-act="copy">📋 Copier le lien</button>' +
        '<button class="btn btn-ghost btn-small" type="button" data-act="leave">Quitter</button></div>', "golf-card-lobby");
    }
  }
  function diffStr(d) { return d === 0 ? "Par" : d > 0 ? "+" + d : String(d); }

  function showHoleCard(s, holed) {
    var h = curHole(), last = G.mode !== "practice" && G.hi + 1 >= G.order.length;
    var total = totalOf(ME), parSoFar = parOf(G.hi + 1);
    showCard('<h2>' + esc(verdict(s, h.par, holed)) + "</h2>" +
      "<p><strong>" + s + "</strong> coup" + (s > 1 ? "s" : "") + " au trou " + (G.mode === "practice" ? "" : (G.hi + 1) + " ") + "« " + esc(h.name) + " » · Par " + h.par + "</p>" +
      (G.mode === "practice" ? "" : "<p>Total : <strong>" + total + "</strong> (" + diffStr(total - parSoFar) + ")</p>") +
      '<div class="btn-row center">' +
      '<button class="btn" type="button" data-act="next">' + (G.mode === "practice" ? "↻ Rejouer ce trou" : last ? "🏁 Voir le score" : "Trou suivant ▶") + "</button>" +
      (G.mode === "practice" ? '<button class="btn btn-ghost btn-small" type="button" data-act="menu">Menu</button>' : "") + "</div>");
    screen = "hole";
  }
  function scoreTable(ids) {
    var head = "<tr><th></th>" + G.order.map(function (hi, i) { return "<th>" + (i + 1) + "</th>"; }).join("") + "<th>Total</th></tr>";
    var par = "<tr class='par'><th>Par</th>" + G.order.map(function (hi) { return "<td>" + HOLES[hi].par + "</td>"; }).join("") + "<td>" + parOf() + "</td></tr>";
    var rows = ids.map(function (p) {
      var i = playerIndex(p.id);
      return "<tr><th><i style='background:" + COLORS[i % COLORS.length] + "'></i>" + esc(p.name) + "</th>" + G.order.map(function (hi, j) {
        var s = G.scores[p.id][j], d = s == null ? "" : s - HOLES[hi].par;
        return "<td" + (s != null ? " class='" + (d < 0 ? "good" : d > 0 ? "bad" : "") + "'" : "") + ">" + (s == null ? "–" : s) + "</td>";
      }).join("") + "<td><b>" + totalOf(p.id) + "</b></td></tr>";
    }).join("");
    return '<div class="golf-table"><table>' + head + par + rows + "</table></div>";
  }
  function showSoloEnd() {
    var total = totalOf(ME), par = parOf(), rec = !best || total < best.total;
    if (rec) { best = { total: total, par: par }; save("golf-best-v1", best); }
    G.over = true; G.phase = "over";
    showCard("<h2>🏁 Parcours terminé !</h2><p><strong>" + total + "</strong> coups · " + diffStr(total - par) + (rec ? " · <strong>Nouveau record !</strong> 🏆" : (best ? " · record : " + best.total : "")) + "</p>" +
      scoreTable(G.players) +
      '<div class="btn-row center"><button class="btn" type="button" data-act="solo">↻ Rejouer</button><button class="btn btn-ghost btn-small" type="button" data-act="menu">Menu</button></div>', "golf-card-wide");
    screen = "end";
  }
  function showOnlineEnd() {
    var ranked = G.players.slice().sort(function (a, b) { return totalOf(a.id) - totalOf(b.id); });
    var topT = totalOf(ranked[0].id), winners = ranked.filter(function (p) { return totalOf(p.id) === topT; });
    var iWon = winners.some(function (p) { return p.id === ME; });
    var host = isLeader();
    showCard("<h2>" + (winners.length > 1 ? "Égalité !" : "🏆 " + esc(winners[0].name) + " gagne !") + "</h2>" +
      "<p>" + (iWon ? "Bravo, " + (winners.length > 1 ? "vous êtes à égalité" : "c'est toi") + " ! " : "") + "Meilleur score : <strong>" + topT + "</strong> (" + diffStr(topT - parOf()) + ")</p>" +
      scoreTable(ranked) +
      '<div class="btn-row center">' +
      (host ? '<button class="btn" type="button" data-act="rematch">↻ Revanche</button>' : '<span class="waiting">L\'hôte peut lancer une revanche…</span>') +
      '<button class="btn btn-ghost btn-small" type="button" data-act="leave">Quitter le salon</button></div>', "golf-card-wide");
    screen = "end";
    sfx("notify");
  }

  /* ---------- lancement ---------- */
  function startSolo() {
    leaveOnline(true);
    G = newGame({ mode: "solo", order: HOLES.map(function (h, i) { return i; }), players: [{ id: ME, name: "Toi" }] });
    loadHole(); closeCard();
  }
  function startPractice(i) {
    leaveOnline(true);
    G = newGame({ mode: "practice", order: [i], players: [{ id: ME, name: "Toi" }] });
    loadHole(); closeCard();
  }

  cardEl.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-act]"); if (!b || b.disabled) return;
    var a = b.dataset.act; ac();
    if (a === "menu") { readName(); if (G && G.mode !== "online") G = null; leaveOnline(); showMenu("main"); }
    else if (a === "solo") startSolo();
    else if (a === "practice") showMenu("practice");
    else if (a === "p1") startPractice(Number(b.dataset.h));
    else if (a === "online") showMenu("online");
    else if (a === "next") soloNext();
    else if (a === "create") { readName(); netCreate(); }
    else if (a === "join") {
      readName();
      var c = (($("[data-code]", cardEl) || {}).value || "").trim().toUpperCase();
      if (!/^[A-Z]{4}$/.test(c)) { NET.err = "Le code a 4 lettres."; showMenu("online"); return; }
      netJoin(c, false);
    }
    else if (a === "start") hostStart();
    else if (a === "rematch") hostStart();
    else if (a === "copy") copyLink(b);
    else if (a === "leave") { leaveOnline(); G = null; showMenu("main"); }
  });
  cardEl.addEventListener("change", function (ev) {
    if (ev.target.matches("[data-sound]")) { soundOn = ev.target.checked; save("golf-sound", soundOn); }
    if (ev.target.matches("[data-name]")) { readName(); if (NET.ch) trackMe(); }
  });
  cardEl.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" && ev.target.matches("[data-code]")) { var b = $('[data-act="join"]', cardEl); if (b) b.click(); }
  });
  function copyLink(btn) {
    if (!NET.code) return;
    var link = location.href.split("#")[0] + "#salon=" + NET.code;
    var done = function () { if (btn) btn.textContent = "✅ Lien copié"; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(done, function () { prompt("Copie ce lien :", link); });
    else prompt("Copie ce lien :", link);
  }

  /* =====================================================================
     EN LIGNE (Supabase Realtime)
     ===================================================================== */
  var CODE_CH = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  var EVENTS = ["start", "pos", "done", "next", "sync", "state"];
  function netSend(ev, payload) { if (NET.ch) { try { NET.ch.send({ type: "broadcast", event: ev, payload: payload }); } catch (e) {} } }
  function sbClient() {
    if (NET.client) return NET.client;
    var c = (window.SITE || {}).supabase;
    if (!window.supabase || !window.supabase.createClient || !c) return null;
    NET.client = window.supabase.createClient(c.url, c.key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 20 } } });
    return NET.client;
  }
  function newCode() { var s = ""; for (var i = 0; i < 4; i++) s += CODE_CH.charAt((Math.random() * CODE_CH.length) | 0); return s; }
  function netCreate() { var code = newCode(); sset("golf-host-" + code, "1"); netJoin(code, true, false); }
  function netJoin(code, asHost, restored) {
    var cl = sbClient();
    if (!cl) { NET.err = "Le jeu en ligne est indisponible (connexion au serveur impossible)."; showMenu("online"); return; }
    leaveOnline(true);
    if (G && G.mode !== "online") G = null;
    NET.code = code; NET.role = asHost ? "host" : "guest"; NET.status = "connexion"; NET.err = ""; NET.roster = []; NET.ts = now(); NET.busy = false;
    var ch = cl.channel("golf-room-" + code, { config: { broadcast: { self: false, ack: false }, presence: { key: NET.id } } });
    ch.on("presence", { event: "sync" }, onPresence);
    EVENTS.forEach(function (ev) { ch.on("broadcast", { event: ev }, function (msg) { try { onNet(ev, msg.payload || {}); } catch (err) { if (window.console) console.error(err); } }); });
    ch.subscribe(function (status) {
      if (NET.ch !== ch) return;
      NET.status = status;
      if (status === "SUBSCRIBED") { trackMe(); netSend("sync", { from: NET.id }); }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") NET.err = "Connexion impossible au salon. Vérifie ta connexion et réessaie.";
      refreshLobby();
    });
    NET.ch = ch;
    if (history.replaceState) history.replaceState(null, "", "#salon=" + code);
    showMenu("lobby");
  }
  function refreshLobby() { if (!overlay.hidden && (screen === "lobby" || screen === "joining")) showMenu(screen); }
  function leaveOnline(silent) {
    if (NET.ch) {
      try { NET.ch.untrack(); } catch (e) {}
      try { NET.client.removeChannel(NET.ch); } catch (e) {}
    }
    NET.ch = null; NET.code = null; NET.role = null; NET.roster = [];
    if (G && G.mode === "online") { G = null; hudUpdate(true); }
    if (!silent && location.hash.indexOf("salon=") >= 0 && history.replaceState) history.replaceState(null, "", location.pathname + location.search);
  }
  function trackMe() { if (NET.ch) try { NET.ch.track({ id: NET.id, name: myName(), host: NET.role === "host", ts: NET.ts, v: VERSION }); } catch (e) {} }
  function present(id) { return id === ME || NET.roster.some(function (x) { return x.id === id; }); }
  function isLeader() {
    if (!G || G.mode !== "online") return false;
    for (var i = 0; i < G.players.length; i++) if (present(G.players[i].id)) return G.players[i].id === ME;
    return false;
  }
  function onPresence() {
    if (!NET.ch) return;
    var st = NET.ch.presenceState(), list = [];
    Object.keys(st).forEach(function (k) { if (st[k] && st[k][0]) list.push(st[k][0]); });
    list.sort(function (a, b) { return (b.host ? 1 : 0) - (a.host ? 1 : 0) || a.ts - b.ts; });
    NET.roster = list;
    if (G && G.mode === "online") {
      list.forEach(function (x) { var i = playerIndex(x.id); if (i >= 0) G.players[i].name = x.name || G.players[i].name; });
      if (G.players.every(function (p) { return p.id === ME || !present(p.id); }) && !G.over) setMsg("Les autres joueurs sont partis.", 4000);
    }
    refreshLobby();
  }

  function hostStart() {
    if (!NET.ch || (NET.role !== "host" && !isLeader())) return;
    var players = NET.roster.slice(0, 4).map(function (x) { return { id: x.id, name: x.name || "Écureuil" }; });
    if (players.length < 2) return;
    var d = { gid: Math.random().toString(36).slice(2, 10), players: players, order: HOLES.map(function (h, i) { return i; }), ts: now() };
    adoptStart(d);
    netSend("start", d);
  }
  function adoptStart(d) {
    if (!d.players.some(function (p) { return p.id === ME; })) { NET.busy = true; G = null; showMenu("lobby"); return; }
    NET.busy = false;
    G = newGame({ mode: "online", gid: d.gid, order: d.order, players: d.players.map(function (p) { return { id: p.id, name: p.name }; }) });
    loadHole(); closeCard();
  }
  function markDone(id, s, holed, h) {
    if (!G.doneAll[h]) G.doneAll[h] = {};
    G.doneAll[h][id] = { s: s, c: holed };
    if (h !== G.hi) return;
    if (!G.firstDoneAt) G.firstDoneAt = now();
    G.scores[id][h] = s;
    if (id !== ME && G.others[id]) { G.others[id].done = true; G.others[id].holed = !!holed; G.others[id].s = s; }
  }
  function allDone() {
    var dn = G.doneAll[G.hi] || {};
    return G.players.every(function (p) { return dn[p.id] || !present(p.id); });
  }
  function leaderTick() {
    if (G.over || !G.firstDoneAt || !isLeader()) return;
    var t = now();
    if (!G.nextAt) {
      if (allDone()) G.nextAt = t + 2600;
      else if (t - G.firstDoneAt > 60000) G.nextAt = t;
    }
    if (G.nextAt && t >= G.nextAt) advance();
  }
  function advance() {
    var h = curHole(), dn = G.doneAll[G.hi] || {}, fin = {};
    G.players.forEach(function (p) {
      if (dn[p.id]) fin[p.id] = dn[p.id].s;
      else { var o = G.others[p.id]; fin[p.id] = Math.min(MAX_STROKES, Math.max(h.par + 3, (o && o.s) || 0)); }
    });
    var d = { gid: G.gid, h: G.hi + 1, fin: fin };
    netSend("next", d);
    applyNext(d);
  }
  function applyNext(d) {
    if (!G || G.mode !== "online" || d.gid !== G.gid || d.h <= G.hi) return;
    Object.keys(d.fin || {}).forEach(function (id) { if (G.scores[id]) G.scores[id][G.hi] = d.fin[id]; });
    if (G.phase !== "done" && !G.scores[ME][G.hi]) G.scores[ME][G.hi] = (d.fin || {})[ME];
    if (d.h >= G.order.length) {
      G.over = true; G.phase = "over"; G.nextAt = 0; hudUpdate(true);
      showOnlineEnd();
      return;
    }
    G.hi = d.h; loadHole();
  }
  function onNet(ev, d) {
    if (ev === "sync") {
      if (G && G.mode === "online" && isLeader()) netSend("state", { gid: G.gid, hi: G.hi, over: G.over, players: G.players, order: G.order, scores: G.scores, to: d.from });
      return;
    }
    if (ev === "start") {
      if (!d.gid || !d.players) return;
      if (!G || G.gid !== d.gid) adoptStart(d);
      return;
    }
    if (ev === "state") {
      if (d.to !== ME || !d.gid || !d.players || (G && G.gid === d.gid)) return;
      if (!d.players.some(function (p) { return p.id === ME; })) { NET.busy = true; refreshLobby(); return; }
      G = newGame({ mode: "online", gid: d.gid, order: d.order, players: d.players });
      Object.keys(d.scores || {}).forEach(function (id) { if (G.scores[id]) G.scores[id] = d.scores[id]; });
      G.hi = d.hi; G.over = !!d.over;
      if (G.over) { G.phase = "over"; showOnlineEnd(); } else { loadHole(); closeCard(); }
      return;
    }
    if (!G || G.mode !== "online" || d.gid !== G.gid) return;
    if (ev === "pos") {
      if (d.h !== G.hi || d.id === ME) return;
      var o = G.others[d.id]; if (!o) return;
      o.tx = d.x; o.ty = d.y; o.s = d.s;
      if (d.f) o.holed = true;
      if (Math.abs(o.x - d.x) + Math.abs(o.y - d.y) > 400) { o.x = d.x; o.y = d.y; }
    } else if (ev === "done") {
      if (d.id === ME || !G.scores[d.id]) return;
      markDone(d.id, d.s, !!d.c, d.h);
      if (d.h === G.hi && G.phase !== "done") setMsg(nameOf(d.id) + " a fini le trou", 2200);
    } else if (ev === "next") applyNext(d);
  }
  function nameOf(id) { var i = playerIndex(id); return i >= 0 ? G.players[i].name : "Un joueur"; }

  /* =====================================================================
     DÉMARRAGE
     ===================================================================== */
  resize();
  requestAnimationFrame(frame);
  var hm = /salon=([A-Za-z]{4})/.exec(location.hash);
  if (hm) {
    var code = hm[1].toUpperCase();
    if (!$("[data-name]", cardEl)) { /* pseudo mémorisé, on rejoint directement */ }
    netJoin(code, sget("golf-host-" + code) === "1", true);
  } else showMenu("main");
  var headMenu = $("[data-golf-menu]");
  if (headMenu) headMenu.addEventListener("click", function () {
    if (G && G.mode === "online") { screen = "lobby"; showCard('<h2>Pause</h2><p>La partie en ligne continue pour les autres.</p><div class="btn-row center"><button class="btn" type="button" data-act="resume">Reprendre</button><button class="btn btn-ghost btn-small" type="button" data-act="leave">Quitter le salon</button></div>'); }
    else { if (G) G.drag = null; showMenu("main"); }
  });
  cardEl.addEventListener("click", function (ev) { if (ev.target.closest('[data-act="resume"]')) closeCard(); });
  window.addEventListener("hashchange", function () {
    var m = /salon=([A-Za-z]{4})/.exec(location.hash);
    if (m && m[1].toUpperCase() !== NET.code) netJoin(m[1].toUpperCase(), false);
  });
  window.addEventListener("beforeunload", function () { if (NET.ch) try { NET.ch.untrack(); } catch (e) {} });
  if (/[?&]debug/.test(location.search)) window.GOLF_DEBUG = { G: function () { return G; }, NET: NET, HOLES: HOLES, shoot: shoot, load: function (i) { G.hi = i; loadHole(); closeCard(); }, inPoly: inPoly, inRects: inRects, step: function (n) { for (var i = 0; i < n; i++) if (G.phase === "roll") stepBall(STEP); } };
})();
