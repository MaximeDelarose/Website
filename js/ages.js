/* =========================================================================
   Age of Defense — interface, boucle de jeu, caméra, réseau, menus, sauvegarde.
   Moteur : ages-core.js · données : ages-data.js · dessin : ages-art.js · réseau : kingdice-net.js (KD_NET)
   Rôles : "solo" (tout en local), "host" (fait tourner la simulation pour 2), "guest" (affiche les instantanés).
   ========================================================================= */
(function () {
  "use strict";
  var D = window.AGES_DATA, C = window.AGES_CORE, ART = window.AGES_ART, T = D.T, LINES = D.LINES, AGES = D.AGES;
  var stage = document.querySelector("[data-ages]"); if (!stage) return;
  var canvas = stage.querySelector("canvas"), ctx = canvas.getContext("2d");
  var SAVE_KEY = "ages-save-v1", VERSION = "1.0.0";
  var MODE_NAMES = { solo: "Solo", coop: "Coop en ligne", versus: "Versus en ligne" };
  var TARGET_NAMES = ["Premier", "Dernier", "Fort", "Proche"];

  /* ---------- sauvegarde (étoiles + améliorations hors partie) ---------- */
  var save = (function () {
    var s = null; try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) {}
    s = s || {}; s.stars = s.stars || 0; s.meta = s.meta || {}; s.best = s.best || {}; s.games = s.games || 0; s.total = s.total || 0;
    s.mapId = s.mapId || "vallee"; s.diff = s.diff || "normal"; s.mute = !!s.mute;
    return s;
  })();
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
  function myMeta() { var m = C.defaultMeta(); D.META.forEach(function (u) { m[u.id] = Math.min(u.max, save.meta[u.id] | 0); }); return m; }

  /* ---------- petits outils DOM ---------- */
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmt(n) { n = Math.round(n); return n >= 10000 ? (n / 1000).toFixed(1).replace(".0", "") + "k" : String(n); }

  /* ---------- interface ---------- */
  var ui = {};
  (function buildUI() {
    var top = el("div", "ag-top", "");
    top.innerHTML =
      '<div class="ag-stat ag-lives" title="Vies">❤ <b data-v="lives">20</b></div>' +
      '<div class="ag-stat ag-gold" title="Noisettes">🌰 <b data-v="gold">0</b></div>' +
      '<div class="ag-stat ag-wave" title="Manche">🌊 <b data-v="wave">0</b><small data-v="timer"></small></div>' +
      '<div class="ag-stat ag-age" data-v="age">Préhistoire</div>' +
      '<div class="ag-opp" data-v="opp" hidden></div>' +
      '<div class="ag-spacer"></div>' +
      '<button class="ag-btn" data-act="speed" title="Vitesse">×1</button>' +
      '<button class="ag-btn" data-act="mute" title="Son">🔊</button>' +
      '<button class="ag-btn" data-act="menu" title="Menu">☰</button>';
    var bar = el("div", "ag-bar", "");
    bar.innerHTML =
      '<div class="ag-actions">' +
        '<button class="ag-big ag-wave-btn" data-act="wave">⚔ Lancer la manche <b>1</b></button>' +
        '<button class="ag-big ag-age-btn" data-act="age">🔬 <span data-v="agebtn">Âge suivant</span></button>' +
        '<button class="ag-mini" data-act="auto" title="Manches automatiques">⟳ Auto</button>' +
      '</div>' +
      '<div class="ag-build"><div class="ag-tabs" data-v="tabs"></div><div class="ag-cards" data-v="cards"></div></div>';
    var sel = el("div", "ag-sel", ""); sel.hidden = true;
    var tip = el("div", "ag-tip", ""); tip.hidden = true;
    var toasts = el("div", "ag-toasts", "");
    var overlay = el("div", "game-overlay ag-overlay", ""); overlay.hidden = true;
    stage.appendChild(top); stage.appendChild(tip); stage.appendChild(sel); stage.appendChild(bar); stage.appendChild(toasts); stage.appendChild(overlay);
    ui.top = top; ui.bar = bar; ui.sel = sel; ui.tip = tip; ui.toasts = toasts; ui.overlay = overlay;
    ui.v = {}; [].forEach.call(stage.querySelectorAll("[data-v]"), function (n) { ui.v[n.dataset.v] = n; });
    top.hidden = bar.hidden = true;
  })();
  function toast(msg, cls) {
    var t = el("div", "ag-toast" + (cls ? " " + cls : ""), esc(msg)); ui.toasts.appendChild(t);
    setTimeout(function () { t.classList.add("out"); }, 2100); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2600);
    while (ui.toasts.children.length > 4) ui.toasts.removeChild(ui.toasts.firstChild);
  }

  /* ---------- son (WebAudio minimaliste, volume global géré par GameKit) ---------- */
  var au = { ctx: null, last: {} };
  function audio() {
    if (au.ctx || save.mute) return au.ctx;
    try { au.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    return au.ctx;
  }
  function sfx(kind, vol) {
    if (save.mute) return; var a = audio(); if (!a) return;
    var now = a.currentTime, lastT = au.last[kind] || 0; if (now - lastT < (kind === "shot" ? 0.07 : 0.04)) return; au.last[kind] = now;
    try {
      var g = a.createGain(); g.connect(a.destination); var v = (vol || 1) * 0.12;
      if (kind === "boom" || kind === "die") {
        var len = a.sampleRate * (kind === "boom" ? 0.45 : 0.15), buf = a.createBuffer(1, len, a.sampleRate), ch = buf.getChannelData(0);
        for (var i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
        var s = a.createBufferSource(); s.buffer = buf; var f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = kind === "boom" ? 700 : 1400; s.connect(f); f.connect(g);
        g.gain.value = v * (kind === "boom" ? 2.2 : 0.8); s.start(now); return;
      }
      var o = a.createOscillator(), f0 = { shot: 520, build: 300, level: 440, age: 330, wave: 220, leak: 120, zap: 900, err: 140 }[kind] || 400;
      o.type = kind === "leak" || kind === "err" ? "sawtooth" : kind === "shot" ? "square" : "triangle"; o.frequency.setValueAtTime(f0, now);
      var dur = kind === "age" ? 0.9 : kind === "wave" ? 0.5 : 0.12;
      if (kind === "shot") o.frequency.exponentialRampToValueAtTime(180, now + dur); else if (kind === "build" || kind === "level" || kind === "age") o.frequency.exponentialRampToValueAtTime(f0 * 2.2, now + dur); else o.frequency.exponentialRampToValueAtTime(f0 * 0.6, now + dur);
      g.gain.setValueAtTime(v * (kind === "shot" ? 0.4 : 1), now); g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.connect(g); o.start(now); o.stop(now + dur + 0.02);
    } catch (e) {}
  }

  /* ---------- état de la partie ---------- */
  var G = null, running = false, lastT = 0;
  var dpr = 1, cw = 0, ch = 0;

  function W() { return G.role === "guest" ? G.view : G.sim.worlds[G.mode === "versus" ? G.me : 0]; }
  function simLike() { return G.role === "guest" ? G.stub : G.sim; }
  function ownMap() { return G.map; }

  function startGame(cfg) {
    closeOverlay();
    var map = C.buildMap(cfg.mapId), g = {
      role: cfg.role, mode: cfg.mode, mapId: cfg.mapId, diff: cfg.diff, me: cfg.me || 0, map: map, names: cfg.names || ["Joueur 1", "Joueur 2"], metas: cfg.metas,
      cam: { x: 0, y: 0, z: 1, fit: 1 }, sel: 0, place: null, hover: null, speed: 1, acc: 0, tab: "tir", net: cfg.net || null, snapAcc: 0, sig: "", t: 0, over: false,
      terrain: ART.terrain(map), fx: new ART.Fx(map), seq: 0, lastSnap: performance.now(), occ: null, occDirty: true, hud: {}, prevWave: 0, selSig: "", paused: false, stats: null,
    };
    if (cfg.role === "guest") { g.stub = { map: map, metas: cfg.metas, mode: cfg.mode, worlds: [] }; g.view = C.createView(g.stub); g.view.gold = [D.START_GOLD, D.START_GOLD]; }
    else g.sim = C.createSim({ mode: cfg.mode, mapId: cfg.mapId, diff: cfg.diff, metas: cfg.metas, names: cfg.names, net: cfg.role === "host", seed: (Math.random() * 1e9) | 0 });
    G = g; ui.top.hidden = ui.bar.hidden = false; ui.sel.hidden = true; ui.tip.hidden = true;
    ui.v.opp.hidden = cfg.mode !== "versus";
    ui.v.tabs.innerHTML = ""; G.sig = "";
    fitCamera(true); running = true; lastT = performance.now(); save.mapId = cfg.mapId; persist();
    var wb = ui.bar.querySelector(".ag-wave-btn"); wb.hidden = cfg.mode === "versus";
    ui.bar.querySelector('[data-act="auto"]').hidden = cfg.mode === "versus";
    ui.bar.querySelector('[data-act="speed"]');
    ui.top.querySelector('[data-act="speed"]').hidden = cfg.role === "guest";
    if (cfg.mode === "versus") toast("Chaque joueur défend sa route : envoie des troupes à l'adversaire dans l'onglet ✉", "info");
    else toast("Pose des tourelles au bord de la route, puis lance la manche !", "info");
    requestAnimationFrame(frame);
  }
  function endToMenu() {
    running = false; if (G && G.net) { try { G.net.close(); } catch (e) {} }
    lobbyClose(); G = null; ui.top.hidden = ui.bar.hidden = true; ui.sel.hidden = true; ui.tip.hidden = true; showMenu();
  }

  /* ---------- caméra ---------- */
  function resize() {
    var r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    cw = Math.max(200, r.width); ch = Math.max(200, r.height);
    var land = cw > ch * 1.15 && ch < 640, changed = land !== stage.classList.contains("ag-land");
    stage.classList.toggle("ag-land", land);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
    stage.style.setProperty("--ag-bar-h", (ui.bar.hidden ? 0 : ui.bar.offsetHeight) + "px");
    if (G) fitCamera(changed);
  }
  function viewRect() { // zone libre entre la barre du haut et le bas
    if (stage.classList.contains("ag-land")) {
      var lw = ui.top.hidden ? 0 : ui.top.offsetWidth, rw = ui.bar.hidden ? 0 : ui.bar.offsetWidth;
      return { x: lw, y: 0, w: Math.max(100, cw - lw - rw), h: ch };
    }
    var top = ui.top.hidden ? 0 : ui.top.offsetHeight, bot = ui.bar.hidden ? 0 : ui.bar.offsetHeight;
    return { x: 0, y: top, w: cw, h: Math.max(100, ch - top - bot) };
  }
  function fitCamera(reset) {
    if (!G) return; var r = viewRect(), map = G.map, z = Math.min(r.w / map.w, r.h / map.h) * 0.99;
    var cam = G.cam, was = cam.fit; cam.fit = z;
    if (reset || !cam.init) { cam.z = z; cam.x = r.x + (r.w - map.w * z) / 2; cam.y = r.y + (r.h - map.h * z) / 2; cam.init = true; }
    else { cam.z = Math.max(cam.z * z / (was || z), z * 0.9); clampCam(); }
  }
  function clampCam() {
    var cam = G.cam, map = G.map, r = viewRect(), mw = map.w * cam.z, mh = map.h * cam.z;
    cam.x = mw <= r.w ? r.x + (r.w - mw) / 2 : Math.min(r.x + 40, Math.max(r.x + r.w - mw - 40, cam.x));
    cam.y = mh <= r.h ? r.y + (r.h - mh) / 2 : Math.min(r.y + 40, Math.max(r.y + r.h - mh - 40, cam.y));
  }
  function zoomAt(sx, sy, k) {
    var cam = G.cam, nz = Math.max(cam.fit * 0.9, Math.min(cam.fit * 4, cam.z * k)), wx = (sx - cam.x) / cam.z, wy = (sy - cam.y) / cam.z;
    cam.z = nz; cam.x = sx - wx * nz; cam.y = sy - wy * nz; clampCam();
  }
  function toWorld(sx, sy) { return { x: (sx - G.cam.x) / G.cam.z, y: (sy - G.cam.y) / G.cam.z }; }

  /* ---------- commandes ---------- */
  function doCmd(c) {
    if (!G || G.over) return;
    if (G.role === "guest") { G.net && G.net.send("cmd", { n: ++G.seq, c: c }); return; }
    var err = C.command(G.sim, G.me, c);
    if (err) { toast(err, "bad"); sfx("err"); }
  }
  function placementError(line, tx, ty) {
    var w = W(), L = LINES[line];
    if (G.role === "guest") {
      if (G.occDirty || !G.occ) { G.occ = new Int32Array(G.map.W * G.map.H); w.buildings.forEach(function (b) { for (var y = b.ty; y < b.ty + b.size; y++) for (var x = b.tx; x < b.tx + b.size; x++) G.occ[y * G.map.W + x] = b.id; }); G.occDirty = false; }
      return C.canPlace(G.stub, { age: w.age, occ: G.occ }, line, tx, ty);
    }
    return C.canPlace(G.sim, w, line, tx, ty);
  }
  function costOf(line) { return C.buildCost(simLike(), W(), G.me, line); }
  function buildingAt(wx, wy) {
    var w = W(), best = null, tx = Math.floor(wx / T), ty = Math.floor(wy / T);
    for (var i = 0; i < w.buildings.length; i++) { var b = w.buildings[i]; if (tx >= b.tx && tx < b.tx + b.size && ty >= b.ty && ty < b.ty + b.size) best = b; }
    return best;
  }
  function selected() { if (!G || !G.sel) return null; var w = W(); for (var i = 0; i < w.buildings.length; i++) if (w.buildings[i].id === G.sel) return w.buildings[i]; return null; }

  /* ---------- entrées : souris / tactile ---------- */
  var ptr = { map: {}, n: 0, drag: false, sx: 0, sy: 0, startCam: null, pinch: 0 };
  canvas.addEventListener("pointerdown", function (e) {
    if (!G) return; audio();
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    var r = canvas.getBoundingClientRect(); ptr.map[e.pointerId] = { x: e.clientX - r.left, y: e.clientY - r.top }; ptr.n = Object.keys(ptr.map).length;
    if (ptr.n === 1) { ptr.drag = false; ptr.sx = e.clientX - r.left; ptr.sy = e.clientY - r.top; ptr.startCam = { x: G.cam.x, y: G.cam.y }; ptr.btn = e.button; ptr.shift = e.shiftKey; ptr.type = e.pointerType; }
    if (ptr.n === 2) { ptr.drag = true; ptr.pinch = pinchDist(); }
    updateHover(e);
  });
  function pinchDist() { var k = Object.keys(ptr.map); if (k.length < 2) return 0; var a = ptr.map[k[0]], b = ptr.map[k[1]]; return Math.hypot(a.x - b.x, a.y - b.y); }
  canvas.addEventListener("pointermove", function (e) {
    if (!G) return; var r = canvas.getBoundingClientRect(), p = ptr.map[e.pointerId], x = e.clientX - r.left, y = e.clientY - r.top;
    if (p) { var ox = p.x, oy = p.y; p.x = x; p.y = y;
      if (ptr.n >= 2) { var d = pinchDist(); if (ptr.pinch > 0 && d > 0) { var k = Object.keys(ptr.map), a = ptr.map[k[0]], b = ptr.map[k[1]]; zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / ptr.pinch); } ptr.pinch = d; }
      else if (ptr.n === 1) {
        if (!ptr.drag && Math.hypot(x - ptr.sx, y - ptr.sy) > 10) ptr.drag = true;
        if (ptr.drag && (!G.place || ptr.btn === 1 || ptr.btn === 2)) { G.cam.x += x - ox; G.cam.y += y - oy; clampCam(); }
      } }
    updateHover(e);
  });
  function updateHover(e) { hoverAt(e.clientX, e.clientY, e.pointerType === "touch"); }
  // au doigt, le fantôme est décalé au-dessus du doigt pour rester visible
  function hoverAt(cx, cy, touch) {
    if (!G) return; var r = canvas.getBoundingClientRect(), w = toWorld(cx - r.left, cy - r.top - (touch && G.place ? 76 : 0));
    if (G.place) { var s = LINES[G.place].size || 1; G.hover = { tx: Math.floor(w.x / T - s / 2 + 0.5), ty: Math.floor(w.y / T - s / 2 + 0.5), wx: w.x, wy: w.y }; }
    else G.hover = { wx: w.x, wy: w.y };
  }
  function placeAtHover() {
    var h = G.hover; if (!G.place || !h || h.tx == null) return;
    var err = placementError(G.place, h.tx, h.ty);
    if (err) { toast(err, "bad"); sfx("err"); return; }
    if (W().gold[G.me] < costOf(G.place)) { toast("Pas assez de noisettes", "bad"); sfx("err"); return; }
    doCmd({ c: "build", line: G.place, tx: h.tx, ty: h.ty }); sfx("build");
    if (!ptr.shift) cancelPlace();
  }
  function pointerEnd(e) {
    if (!G) return; var was = ptr.map[e.pointerId]; delete ptr.map[e.pointerId]; var left = Object.keys(ptr.map).length;
    if (ptr.n === 1 && was && e.type === "pointerup") {
      if (G.place && ptr.type === "touch") placeAtHover();
      else if (!ptr.drag && ptr.btn === 2) cancelPlace();
      else if (!ptr.drag && (ptr.btn === 0 || ptr.btn === undefined)) tapAt(was.x, was.y);
    }
    ptr.n = left; if (left < 2) ptr.pinch = 0; if (left === 0) ptr.drag = false;
  }
  canvas.addEventListener("pointerup", pointerEnd); canvas.addEventListener("pointercancel", pointerEnd);
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  canvas.addEventListener("wheel", function (e) { if (!G) return; e.preventDefault(); var r = canvas.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });
  canvas.addEventListener("pointerleave", function () { if (G && G.place && ptr.n === 0) G.hover = null; });

  function tapAt(sx, sy) {
    var w = toWorld(sx, sy);
    if (G.place) {
      var s0 = LINES[G.place].size || 1;
      G.hover = { tx: Math.floor(w.x / T - s0 / 2 + 0.5), ty: Math.floor(w.y / T - s0 / 2 + 0.5), wx: w.x, wy: w.y };
      placeAtHover(); return;
    }
    var b = buildingAt(w.x, w.y), cur = selected();
    if (b) { G.sel = b.id; return; }
    if (cur && b == null) {
      var k = LINES[cur.line].kind;
      if (k === "barracks" || k === "airfield" || k === "heli") {
        var tt = C.tileAt(G.map, Math.floor(w.x / T), Math.floor(w.y / T));
        if (k === "barracks" && tt !== 1) { G.sel = 0; return; }
        doCmd({ c: "rally", id: cur.id, x: w.x, y: w.y }); sfx("build"); return;
      }
    }
    G.sel = 0;
  }
  function cancelPlace() { G.place = null; G.hover = null; ui.tip.hidden = true; G.sig = ""; }
  window.addEventListener("keydown", function (e) {
    if (!G || !ui.overlay.hidden) return;
    var k = e.key;
    if (k === "Escape") { if (G.place) cancelPlace(); else if (G.sel) G.sel = 0; else showPause(); }
    else if (k === " " || k === "Enter") { if (G.mode !== "versus") { doCmd({ c: "wave" }); e.preventDefault(); } }
    else if (k === "u" || k === "U") { var b = selected(); if (b) doCmd({ c: "upgrade", id: b.id }); }
    else if (k === "Delete" || k === "Backspace") { var b2 = selected(); if (b2) { doCmd({ c: "sell", id: b2.id }); G.sel = 0; } }
    else if (k === "a" || k === "A") doCmd({ c: "age" });
    else if (/^[1-9]$/.test(k)) { var items = tabItems(); var it = items[+k - 1]; if (it) pickItem(it); }
  });

  /* ---------- barre de construction ---------- */
  function tabItems() {
    if (G.tab === "envoi") return D.SENDS.map(function (s) { return { send: s }; });
    return D.LINE_ORDER.filter(function (id) { return LINES[id].cat === G.tab; }).map(function (id) { return { line: id }; });
  }
  function pickItem(it) {
    if (it.send) { var s = it.send; if (W().gold[G.me] < s.cost) { toast("Pas assez de noisettes", "bad"); sfx("err"); return; } doCmd({ c: "send", id: s.id }); sfx("wave"); return; }
    var L = LINES[it.line], w = W();
    if (L.minAge > w.age) { toast("Débloqué à l'âge « " + AGES[L.minAge].name + " »", "bad"); return; }
    G.place = it.line; G.sel = 0; G.sig = "";
    ui.tip.hidden = false; ui.tip.innerHTML = "<b>" + esc(L.forms[w.age]) + "</b> — " + esc(L.info) + (L.kind === "mine" || L.kind === "pit" ? " <i>(à poser sur la route)</i>" : "") + ' <button class="ag-x" data-act="cancel">✕</button>';
  }
  function renderBar() {
    var w = W(), tabs = D.CATS.slice(); if (G.mode === "versus") tabs.push({ id: "envoi", name: "Envoyer", ico: "✉️" });
    var items = tabItems(), mask = "";
    items.forEach(function (it) { var c = it.send ? it.send.cost : costOf(it.line), ok = it.send ? true : LINES[it.line].minAge <= w.age; mask += (ok && w.gold[G.me] >= c ? "1" : ok ? "0" : "L"); });
    var sig = G.tab + "|" + w.age + "|" + mask + "|" + (G.place || "") + "|" + tabs.length;
    if (sig === G.sig) return; G.sig = sig;
    ui.v.tabs.innerHTML = tabs.map(function (t) { return '<button class="ag-tab' + (t.id === G.tab ? " on" : "") + '" data-tab="' + t.id + '"><span>' + t.ico + "</span> " + t.name + "</button>"; }).join("");
    ui.v.cards.innerHTML = items.map(function (it, i) {
      if (it.send) { var s = it.send; return '<button class="ag-card' + (mask[i] === "0" ? " poor" : "") + '" data-i="' + i + '"><i class="ag-ico">' + s.ico + '</i><b>' + s.name + " ×" + s.count + '</b><small>🌰' + s.cost + ' · +' + s.inc + '/manche</small></button>'; }
      var L = LINES[it.line], lock = mask[i] === "L";
      return '<button class="ag-card' + (lock ? " lock" : mask[i] === "0" ? " poor" : "") + (G.place === it.line ? " on" : "") + '" data-i="' + i + '"><img class="ag-ico" alt="" src="' + ART.icon(it.line, lock ? 0 : w.age, 44) + '"><b>' + esc(L.name) + '</b><small>' + (lock ? "🔒 " + AGES[L.minAge].name : "🌰" + costOf(it.line)) + "</small></button>";
    }).join("");
  }
  var cdrag = null, suppressClick = false;
  function overHud(x, y) { return [ui.bar, ui.top].some(function (n) { if (n.hidden) return false; var r = n.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }); }
  ui.bar.addEventListener("pointerdown", function (e) {
    var c = e.target.closest(".ag-card[data-i]"); if (!c || !G) return;
    var it = tabItems()[+c.dataset.i]; if (!it || it.send || LINES[it.line].minAge > W().age) return;
    cdrag = { it: it, x: e.clientX, y: e.clientY, on: false, id: e.pointerId };
  });
  document.addEventListener("pointermove", function (e) {
    if (!cdrag || e.pointerId !== cdrag.id || !G) return;
    if (!cdrag.on && Math.hypot(e.clientX - cdrag.x, e.clientY - cdrag.y) > 12) { cdrag.on = true; pickItem(cdrag.it); }
    if (cdrag.on) { hoverAt(e.clientX, e.clientY, e.pointerType === "touch"); e.preventDefault(); }
  });
  function cardDragEnd(e) {
    if (!cdrag || e.pointerId !== cdrag.id) return; var d = cdrag; cdrag = null; if (!d.on || !G) return;
    suppressClick = true; setTimeout(function () { suppressClick = false; }, 60);
    if (e.type === "pointercancel" || overHud(e.clientX, e.clientY)) { cancelPlace(); return; }
    hoverAt(e.clientX, e.clientY, e.pointerType === "touch"); ptr.shift = false; placeAtHover();
  }
  document.addEventListener("pointerup", cardDragEnd); document.addEventListener("pointercancel", cardDragEnd);
  ui.bar.addEventListener("click", function (e) {
    if (suppressClick) return;
    var t = e.target.closest("[data-tab],[data-i],[data-act]"); if (!t || !G) return; audio();
    if (t.dataset.tab) { G.tab = t.dataset.tab; cancelPlace(); G.sig = ""; return; }
    if (t.dataset.i != null) { var it = tabItems()[+t.dataset.i]; if (it) { if (G.place && it.line === G.place) cancelPlace(); else pickItem(it); } return; }
    var a = t.dataset.act;
    if (a === "wave") { doCmd({ c: "wave" }); sfx("wave"); }
    else if (a === "age") { doCmd({ c: "age" }); }
    else if (a === "auto") doCmd({ c: "auto" });
  });
  ui.tip.addEventListener("click", function (e) { if (e.target.dataset.act === "cancel") cancelPlace(); });
  ui.top.addEventListener("click", function (e) {
    var t = e.target.closest("[data-act]"); if (!t || !G) return; audio();
    if (t.dataset.act === "menu") showPause();
    else if (t.dataset.act === "mute") { save.mute = !save.mute; persist(); t.textContent = save.mute ? "🔇" : "🔊"; }
    else if (t.dataset.act === "speed") { G.speed = G.speed === 1 ? 2 : G.speed === 2 ? 3 : 1; t.textContent = "×" + G.speed; }
  });

  /* ---------- panneau du bâtiment sélectionné ---------- */
  function renderSel() {
    var b = selected(), w = W();
    if (!b) { if (!ui.sel.hidden) ui.sel.hidden = true; G.selSig = ""; return; }
    var L = LINES[b.line], sim = simLike(), st = (L.dmg || L.hp) ? C.bstat(sim, w, b) : null, up = C.upgradeCost(sim, w, b);
    var sig = [b.id, b.lvl, w.age, b.mode, up, w.gold[G.me] >= up ? 1 : 0, b.flag, Math.round(b.buff && (b.buff.r + b.buff.d) * 100)].join("|");
    if (sig === G.selSig && !ui.sel.hidden) return; G.selSig = sig; ui.sel.hidden = false;
    var k = L.kind, lines = [];
    if (st) {
      if (k === "barracks") lines.push("PV " + fmt(st.hp) + " · Dégâts " + fmt(st.dmg) + " · " + L.units + " soldats");
      else if (k === "garrison" || k === "airfield" || k === "heli") lines.push("Dégâts " + fmt(st.dmg) + " · Cadence " + st.rate.toFixed(1) + "/s" + (st.range ? " · Portée " + (st.range / T).toFixed(1) : ""));
      else if (k === "pulse") lines.push("Dégâts " + fmt(st.dmg) + " ×" + st.rate.toFixed(1) + "/s + brûlure · Portée " + (st.range / T).toFixed(1));
      else if (k !== "mine" && k !== "pit") lines.push("Dégâts " + fmt(st.dmg) + " · Cadence " + st.rate.toFixed(2) + "/s · Portée " + (st.range / T).toFixed(1));
      else lines.push("Dégâts " + fmt(st.dmg * (k === "mine" ? 1 : 1)));
    }
    if (k === "banner") lines.push("Aura " + ((L.radius + AGES[w.age].rg)).toFixed(1) + " cases · cadence +" + Math.round(L.buffRate[w.age] * (1 + 0.25 * (b.lvl - 1)) * 100) + " % · dégâts +" + Math.round(L.buffDmg[w.age] * (1 + 0.25 * (b.lvl - 1)) * 100) + " %");
    if (b.flag === 1) lines.push("⚠ Aucune rampe d'accès à moins de 7 cases : pose une rampe 🛤 au bord de la route.");
    if (k === "barracks") lines.push("Touche la route pour déplacer le point de ralliement.");
    if (k === "airfield" || k === "heli") lines.push("Touche la carte pour déplacer la zone de patrouille.");
    if (k === "garrison") lines.push("Les tireurs se postent au bord de la route.");
    var canTarget = !!(st && (k === "shoot" || k === "mortar" || k === "pulse" || k === "chain" || k === "garrison" || k === "heli"));
    ui.sel.innerHTML = '<img class="ag-ico" alt="" src="' + ART.icon(b.line, w.age, 44) + '"><div class="ag-sel-body"><b>' + esc(L.forms[w.age]) + ' <em>niv. ' + b.lvl + '</em></b><small>' + lines.join("<br>") + '</small></div><div class="ag-sel-btns">' +
      (b.fixed ? "" : '<button data-a="up"' + (up && w.gold[G.me] >= up ? "" : " disabled") + ">" + (up ? "⬆ " + up + " 🌰" : "Niveau max") + "</button>") +
      (canTarget ? '<button data-a="mode">🎯 ' + TARGET_NAMES[b.mode] + "</button>" : "") +
      '<button data-a="sell">💰 +' + Math.round(b.paid * D.SELL * (b.fixed ? 0.5 : 1)) + '</button><button data-a="close">✕</button></div>';
  }
  ui.sel.addEventListener("click", function (e) {
    var t = e.target.closest("[data-a]"); if (!t || !G) return; var b = selected(); if (!b) return;
    if (t.dataset.a === "up") { doCmd({ c: "upgrade", id: b.id }); sfx("level"); }
    else if (t.dataset.a === "mode") doCmd({ c: "mode", id: b.id });
    else if (t.dataset.a === "sell") { doCmd({ c: "sell", id: b.id }); G.sel = 0; sfx("build"); }
    else if (t.dataset.a === "close") G.sel = 0;
    G.selSig = "";
  });

  /* ---------- HUD ---------- */
  function setV(key, val) { if (G.hud[key] !== val) { G.hud[key] = val; ui.v[key].textContent = val; } }
  function renderHud() {
    var w = W(), me = G.me, sim = simLike();
    setV("lives", w.lives + (w.maxLives ? "/" + w.maxLives : "")); setV("gold", fmt(w.gold[me])); setV("wave", w.wave + "/" + D.WIN_WAVE);
    var timer = "";
    if (G.mode === "versus") { var vt = G.role === "guest" ? w.vsTimer : G.sim.vsTimer; timer = " · " + Math.max(0, Math.ceil(vt)) + " s"; }
    else if (w.nextT >= 0 && !w.active) timer = " · " + Math.ceil(w.nextT) + " s";
    setV("timer", timer);
    setV("age", AGES[w.age].name);
    ui.v.age.style.background = AGES[w.age].col;
    var wb = ui.bar.querySelector(".ag-wave-btn"); if (G.mode !== "versus") { wb.querySelector("b").textContent = w.wave + 1; wb.classList.toggle("busy", !!w.active); wb.hidden = w.wave >= D.WIN_WAVE; }
    var ab = ui.bar.querySelector(".ag-age-btn"), next = AGES[w.age + 1];
    if (next) { var c = C.ageCost(sim, w, me); ab.hidden = false; ab.classList.toggle("poor", w.gold[me] < c); setV("agebtn", next.name + " · " + fmt(c) + " 🌰"); ab.style.setProperty("--age", next.col); } else ab.hidden = true;
    var au2 = ui.bar.querySelector('[data-act="auto"]'); au2.classList.toggle("on", !!w.auto);
    if (G.mode === "versus") {
      var o = G.role === "guest" ? w.opp : (function () { var ow = G.sim.worlds[1 - me]; return [ow.lives, ow.age, ow.wave, ow.queue.length + ow.enemies.length]; })();
      if (o) { var txt = "Adversaire ❤ " + o[0] + " · " + AGES[o[1]].name; if (G.hud.opp !== txt) { G.hud.opp = txt; ui.v.opp.textContent = txt; } }
    }
  }

  /* ---------- boucle ---------- */
  var scene = { t: 0 };
  function frame(now) {
    if (!running || !G) return;
    var dt = Math.min(0.1, (now - lastT) / 1000); lastT = now; scene.t += dt; G.t += dt;
    if (document.hidden) { requestAnimationFrame(frame); return; }
    var w;
    if (G.role === "guest") {
      C.viewStep(G.view, dt); w = G.view;
      for (var i = 0; i < w.fx.length; i++) onFx(w.fx[i], w); w.fx.length = 0;
      if (now - G.lastSnap > 6000 && !G.over) { toast("Connexion perdue…", "bad"); G.lastSnap = now; }
      if (w.over && !G.over) finish(w.over);
    } else if (!G.over && !G.paused) {
      G.acc += dt * G.speed; var n = 0;
      while (G.acc >= 1 / 30 && n < 8) { C.step(G.sim, 1 / 30); G.acc -= 1 / 30; n++; }
      if (G.acc > 0.5) G.acc = 0;
      G.sim.worlds.forEach(function (ww, idx) { var mine = idx === (G.mode === "versus" ? G.me : 0); if (mine) { for (var j = 0; j < ww.fx.length; j++) onFx(ww.fx[j], ww); } ww.fx.length = 0; });
      w = W();
      if (G.role === "host") { G.snapAcc += dt; if (G.snapAcc >= 0.09) { G.snapAcc = 0; G.net && G.net.send("snap", C.snapshot(G.sim, 1)); } }
      if (G.sim.over && !G.over) finish(G.sim.over);
    } else w = W();
    G.fx.update(dt);
    render(w); renderBar(); renderSel(); renderHud();
    requestAnimationFrame(frame);
  }
  function onFx(f, w) {
    G.fx.event(f, w.age);
    switch (f[0]) {
      case "boom": sfx("boom"); break; case "die": sfx("die", 0.7); break; case "muzzle": sfx("shot"); break; case "level": break;
      case "age": sfx("age"); toast("Nouvel âge : " + AGES[w.age].name + " ! Vos défenses évoluent.", "good"); break;
      case "wave": sfx("wave"); if (G.mode === "versus") toast("Manche " + f[3], "info"); break;
      case "clear": toast("Manche " + f[3] + " terminée · prime reçue 🌰", "good"); break;
      case "leak": sfx("leak"); break; case "zap": sfx("zap", 0.6); break; case "sent": toast("Troupes envoyées !", "good"); break;
    }
  }

  /* ---------- rendu ---------- */
  function render(w) {
    var map = G.map, cam = G.cam, t = scene.t;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = "#1c2a1c"; ctx.fillRect(0, 0, cw, ch);
    var sh = G.fx.shake, sx = sh ? (Math.random() - 0.5) * sh : 0, sy = sh ? (Math.random() - 0.5) * sh : 0;
    ctx.save(); ctx.translate(cam.x + sx, cam.y + sy); ctx.scale(cam.z, cam.z);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(G.terrain, 0, 0); ctx.drawImage(G.fx.decal, 0, 0, map.w, map.h); ctx.imageSmoothingEnabled = true;
    drawMarks(map, t);
    G.fx.drawBelow(ctx);
    var i, b, list = w.buildings.slice().sort(function (a, c) { return (a.fixed ? -1 : 0) - (c.fixed ? -1 : 0) || a.y - c.y; });
    for (i = 0; i < list.length; i++) { b = list[i]; ART.drawBuilding(ctx, b, w.age, t, null); }
    // sélection
    var s = selected(); if (s) drawSelection(s, w);
    var us = w.units.slice().sort(function (a, c) { return a.y - c.y; });
    for (i = 0; i < us.length; i++) if (us[i].kind !== "plane" && us[i].kind !== "heli") ART.drawUnit(ctx, us[i], w.age, t);
    var es = w.enemies.slice().sort(function (a, c) { return (a.air ? 1 : 0) - (c.air ? 1 : 0) || a.y - c.y; });
    for (i = 0; i < es.length; i++) ART.drawEnemy(ctx, es[i], t);
    for (i = 0; i < us.length; i++) if (us[i].kind === "plane" || us[i].kind === "heli") ART.drawUnit(ctx, us[i], w.age, t);
    for (i = 0; i < w.projs.length; i++) ART.drawProj(ctx, w.projs[i], t);
    G.fx.drawAbove(ctx);
    if (G.place && G.hover && G.hover.tx != null) drawGhost(w);
    ctx.restore();
    if (w.flash > 0 && w.lives < (w.maxLives || 99)) { var g = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.35, cw / 2, ch / 2, Math.max(cw, ch) * 0.75); g.addColorStop(0, "rgba(255,0,0,0)"); g.addColorStop(1, "rgba(255,30,20," + Math.min(0.45, w.flash) + ")"); ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch); }
  }
  function drawMarks(map, t) {
    var c = ctx;
    map.paths.forEach(function (p) {
      var a = C.pathAt(p, 46, 0), x = a.x, y = a.y, ang = a.a;
      c.save(); c.translate(x, y); c.rotate(ang); c.globalAlpha = 0.6 + 0.3 * Math.sin(t * 4);
      for (var i = 0; i < 3; i++) { var o = i * 9 - 9; c.beginPath(); c.moveTo(o - 5, -9); c.lineTo(o + 5, 0); c.lineTo(o - 5, 9); c.lineTo(o - 2, 0); c.closePath(); c.fillStyle = "#d83a2a"; c.fill(); c.strokeStyle = "#3a0e08"; c.lineWidth = 1.4; c.stroke(); }
      c.restore();
      var e = C.pathAt(p, p.len - 26, 0); c.save(); c.translate(e.x, e.y);
      c.fillStyle = "rgba(50,110,230,.22)"; c.beginPath(); c.arc(0, 0, map.hw * 0.95, 0, Math.PI * 2); c.fill(); c.strokeStyle = "rgba(90,150,255,.7)"; c.lineWidth = 2; c.setLineDash([6, 5]); c.stroke(); c.setLineDash([]);
      c.strokeStyle = "#24160b"; c.lineWidth = 1.6; c.fillStyle = "#6a4a2a"; c.fillRect(-4, -4, 8, 14); c.strokeRect(-4, -4, 8, 14);
      [[0, -16, 13, "#2f5d25"], [-9, -9, 9, "#3f7a30"], [9, -9, 9, "#468a35"], [0, -20, 7, "#5aa045"]].forEach(function (q) { c.beginPath(); c.arc(q[0], q[1], q[2], 0, Math.PI * 2); c.fillStyle = q[3]; c.fill(); c.stroke(); });
      c.beginPath(); c.ellipse(11, 9, 3.4, 4.4, 0, 0, Math.PI * 2); c.fillStyle = "#c98a3a"; c.fill(); c.stroke(); c.fillStyle = "#7a4a1a"; c.fillRect(8.4, 4.8, 5.4, 2.6);
      c.restore();
    });
  }
  function drawSelection(b, w) {
    var c = ctx, L = LINES[b.line], k = L.kind, sim = simLike(), st = (L.range || k === "airfield" || k === "heli") ? C.bstat(sim, w, b) : null;
    c.save(); c.lineWidth = 2;
    var rad = 0;
    if (k === "banner") rad = (L.radius + AGES[w.age].rg) * T; else if (st && st.range) rad = st.range;
    if (rad) { c.beginPath(); c.arc(b.x, b.y, rad, 0, Math.PI * 2); c.fillStyle = "rgba(255,255,255,.08)"; c.fill(); c.strokeStyle = "rgba(255,255,255,.65)"; c.setLineDash([7, 5]); c.stroke(); c.setLineDash([]); }
    if (L.minRange) { c.beginPath(); c.arc(b.x, b.y, L.minRange * T, 0, Math.PI * 2); c.strokeStyle = "rgba(255,120,100,.6)"; c.stroke(); }
    c.strokeStyle = "#ffe36a"; c.strokeRect(b.x - b.size * T / 2 - 2, b.y - b.size * T / 2 - 2, b.size * T + 4, b.size * T + 4);
    if (b.rally && (k === "barracks" || k === "airfield" || k === "heli")) {
      var r = b.rally; c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(r.x, r.y); c.strokeStyle = "rgba(255,227,106,.55)"; c.setLineDash([4, 5]); c.stroke(); c.setLineDash([]);
      c.beginPath(); c.arc(r.x, r.y, k === "airfield" ? L.orbit * T : 16, 0, Math.PI * 2); c.strokeStyle = "#ffe36a"; c.stroke();
      c.fillStyle = "#ffe36a"; c.strokeStyle = "#3a2a08"; c.lineWidth = 1.4; c.fillRect(r.x - 1, r.y - 18, 2.4, 18); c.beginPath(); c.moveTo(r.x + 1.4, r.y - 18); c.lineTo(r.x + 12, r.y - 14); c.lineTo(r.x + 1.4, r.y - 10); c.fill(); c.stroke();
    }
    c.restore();
  }
  function drawGhost(w) {
    var h = G.hover, L = LINES[G.place], c = ctx, err = placementError(G.place, h.tx, h.ty), s = L.size || 1;
    var ok = !err && w.gold[G.me] >= costOf(G.place), x = (h.tx + s / 2) * T, y = (h.ty + s / 2) * T;
    c.save();
    c.fillStyle = ok ? "rgba(90,255,120,.28)" : "rgba(255,70,60,.32)"; c.fillRect(h.tx * T, h.ty * T, s * T, s * T);
    c.strokeStyle = ok ? "#7dff8f" : "#ff6a5a"; c.lineWidth = 2; c.strokeRect(h.tx * T + 1, h.ty * T + 1, s * T - 2, s * T - 2);
    var st = L.range ? C.bstat(simLike(), w, { line: G.place, lvl: 1, owner: G.me, buff: { r: 0, d: 0, g: 0 } }) : null, rad = st ? st.range : L.kind === "banner" ? (L.radius + AGES[w.age].rg) * T : 0;
    if (rad) { c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2); c.fillStyle = "rgba(255,255,255,.07)"; c.fill(); c.strokeStyle = "rgba(255,255,255,.55)"; c.setLineDash([6, 5]); c.stroke(); c.setLineDash([]); }
    c.globalAlpha = 0.8; ART.drawBuilding(c, { line: G.place, x: x, y: y, lvl: 1, ang: -Math.PI / 2, size: s, t: scene.t, firing: 0, rally: null, flag: 0, life: 1 }, w.age, scene.t, null); c.globalAlpha = 1;
    if (err) { c.font = "bold 11px sans-serif"; c.textAlign = "center"; c.fillStyle = "#fff"; c.strokeStyle = "#400"; c.lineWidth = 3; c.strokeText(err, x, y - s * T / 2 - 8); c.fillText(err, x, y - s * T / 2 - 8); }
    c.restore();
  }

  /* ---------- fin de partie ---------- */
  function starsFor(wave, kills, won) { var d = 1; D.DIFFS.forEach(function (x) { if (x.id === G.diff) d = x.stars; }); return Math.max(1, Math.round((wave * 1.0 + kills / 25) * d * (won ? 1.6 : 1))); }
  function finish(over) {
    if (G.over) return; G.over = true;
    var w = W(), won, title, sub;
    if (G.mode === "versus") { won = over.winner === G.me; title = over.winner === -1 ? "Égalité" : won ? "Victoire !" : "Défaite"; sub = won ? "Le front adverse s'est effondré." : "Ta base est tombée."; }
    else { won = !!over.won; title = won ? "Victoire !" : "Défaite"; sub = won ? "Les " + D.WIN_WAVE + " manches sont repoussées." : "La base est tombée à la manche " + w.wave + "."; }
    var kills = G.role === "guest" ? w.kills : w.kills, stars = starsFor(w.wave, kills, won) + (G.mode === "versus" && won ? 8 : 0);
    save.stars += stars; save.games++; save.total += kills; var key = G.mapId + (G.mode === "versus" ? "-vs" : ""); if (!save.best[key] || save.best[key] < w.wave) save.best[key] = w.wave; persist();
    if (G.role === "host") G.net && G.net.send("end", { over: over });
    setTimeout(function () {
      if (!G) return;
      openOverlay('<div class="ag-card-in ag-result ' + (won ? "win" : "lose") + '"><h2>' + title + '</h2><p>' + sub + '</p><div class="ag-res-grid"><div><b>' + w.wave + '</b><small>Manche</small></div><div><b>' + kills + '</b><small>Éliminations</small></div><div><b>' + AGES[w.age].name + '</b><small>Âge</small></div></div><p class="ag-stars">+ ' + stars + ' ⭐ <small>(total ' + save.stars + ')</small></p><div class="ag-row"><button class="btn" data-go="again">' + (G.role === "guest" ? "Menu" : "Rejouer") + '</button><button class="btn btn-ghost" data-go="menu">Menu</button><button class="btn btn-ghost" data-go="meta">⭐ Améliorations</button></div></div>');
    }, 700);
  }

  /* ---------- overlays / menus ---------- */
  function openOverlay(html) { ui.overlay.hidden = false; ui.overlay.innerHTML = '<div class="panel game-card game-card-wide ag-card-wrap">' + html + "</div>"; ui.overlay.scrollTop = 0; }
  function closeOverlay() { ui.overlay.hidden = true; ui.overlay.innerHTML = ""; }
  var menuState = { mode: "solo" };
  function mapPreview(m) {
    var map = C.buildMap(m.id), th = D.THEMES[m.theme], cv = document.createElement("canvas"), s = 3; cv.width = map.W * s; cv.height = map.H * s; var c = cv.getContext("2d");
    c.fillStyle = "rgb(" + th.grass.join(",") + ")"; c.fillRect(0, 0, cv.width, cv.height);
    for (var y = 0; y < map.H; y++) for (var x = 0; x < map.W; x++) { var t = map.tiles[y * map.W + x]; if (t === 1) { c.fillStyle = "rgb(" + th.road.join(",") + ")"; c.fillRect(x * s, y * s, s, s); } else if (t === 2) { c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(x * s, y * s, s, s); } }
    return cv.toDataURL();
  }
  var previews = {};
  function showMenu() {
    var mode = menuState.mode, h = '<div class="ag-hero"><h2>Age of Defense</h2><p>Les écureuils défendent le Grand Chêne de la Préhistoire jusqu\'au Futur : fais évoluer leur technologie, pose tourelles, pièges, casernes et avions sur des routes larges.</p></div>';
    h += '<div class="ag-modes">' + ["solo", "coop", "versus"].map(function (m) { return '<button class="ag-mode' + (m === mode ? " on" : "") + '" data-mode="' + m + '"><b>' + { solo: "🛡 Solo", coop: "🤝 Coop en ligne", versus: "⚔ Versus en ligne" }[m] + "</b><small>" + { solo: "Seul contre les 40 manches", coop: "À deux sur la même carte", versus: "Envoie des troupes à l'autre joueur" }[m] + "</small></button>"; }).join("") + "</div>";
    h += '<div class="ag-maps">' + D.MAPS.map(function (m) { var best = save.best[m.id + (mode === "versus" ? "-vs" : "")]; return '<button class="ag-map' + (m.id === save.mapId ? " on" : "") + '" data-map="' + m.id + '"><img alt="" src="' + (previews[m.id] || (previews[m.id] = mapPreview(m))) + '"><b>' + m.name + "</b><small>" + m.desc + (best ? " · Record : manche " + best : "") + "</small></button>"; }).join("") + "</div>";
    h += '<div class="ag-row ag-diffs">' + D.DIFFS.map(function (d) { return '<button class="chip' + (d.id === save.diff ? " on" : "") + '" data-diff="' + d.id + '" aria-pressed="' + (d.id === save.diff) + '">' + d.name + "</button>"; }).join("") + "</div>";
    if (mode === "solo") h += '<div class="ag-row"><button class="btn ag-go" data-go="solo">▶ Jouer</button></div>';
    else h += '<div class="ag-row"><button class="btn ag-go" data-go="create">➕ Créer un salon</button><span class="ag-join"><input id="ag-code" maxlength="4" placeholder="CODE" autocomplete="off" autocapitalize="characters" spellcheck="false"><button class="btn btn-ghost" data-go="join">Rejoindre</button></span></div>';
    h += '<div class="ag-row ag-foot"><button class="btn btn-ghost btn-small" data-go="meta">⭐ Améliorations <b>' + save.stars + "</b></button><button class=\"btn btn-ghost btn-small\" data-go=\"help\">❓ Comment jouer</button></div>";
    openOverlay(h);
    try { var ci = ui.overlay.querySelector("#ag-code"); var u = new URLSearchParams(location.hash.replace("#", "")); if (ci && u.get("ag")) ci.value = u.get("ag"); } catch (e) {}
  }
  function showPause() {
    if (!G) return;
    var online = G.role !== "solo";
    if (!online && G.mode === "solo") G.paused = true;
    openOverlay('<div class="ag-card-in"><h2>Pause</h2>' + (online ? "<p>La partie continue pendant que tu es dans le menu.</p>" : "") + '<div class="ag-row"><button class="btn" data-go="resume">▶ Reprendre</button><button class="btn btn-ghost" data-go="quit">Quitter la partie</button></div></div>');
  }
  function showHelp() {
    openOverlay('<div class="ag-card-in ag-help"><h2>Comment jouer</h2><ul>' +
      "<li><b>But :</b> empêche les bestioles d'atteindre le Grand Chêne (la sortie bleue). Chacune qui passe te coûte des vies. 40 manches à tenir.</li>" +
      "<li><b>Noisettes 🌰 :</b> tu en gagnes en repoussant les bestioles et à la fin de chaque manche.</li>" +
      "<li><b>Tourelles :</b> pose-les sur l'herbe, au bord de la route. <b>Pièges</b> (mines, fosses) : sur la route elle-même.</li>" +
      "<li><b>Troupes :</b> ce sont des écureuils ! Pose une <b>rampe d'accès</b> au bord de la route, puis une <b>caserne</b> ou des <b>lanciers</b> à moins de 7 cases : les soldats descendent par la rampe et bloquent la route. Touche la route pour déplacer leur point de ralliement. La <b>garnison</b> poste des tireurs au bord de la route.</li>" +
      "<li><b>Air :</b> la piste aérienne (avions) et l'héliport patrouillent autour d'un point que tu choisis.</li>" +
      "<li><b>Technologie :</b> le bouton 🔬 te fait passer à l'âge suivant (Préhistoire → Médiéval → Contemporain → Moderne → Futuriste). <b>Tous tes bâtiments évoluent tout seuls</b> et deviennent bien plus puissants.</li>" +
      "<li><b>Niveaux :</b> touche un bâtiment pour l'améliorer (3 niveaux), changer sa cible ou le vendre. La <b>bannière</b> renforce tout ce qui est proche.</li>" +
      "<li><b>Effets :</b> 🔥 brûlure (brûleur) · 🟢 colle (ralentit fort) · ❄ gel (immobilise) · ⚡ paralysie (choc, fosses) · le givre et les fosses ralentissent aussi.</li>" +
      "<li><b>Coop :</b> deux joueurs sur la même carte, chacune ses noisettes. <b>Versus :</b> chacun sa route ; dépense des noisettes pour envoyer des bestioles chez l'adversaire (ça augmente aussi ton revenu à chaque manche). Le dernier debout gagne.</li>" +
      "<li><b>Étoiles ⭐ :</b> gagnées à chaque partie, elles achètent des améliorations permanentes.</li>" +
      "<li><b>Commandes :</b> glisser = déplacer la carte, molette / pincement = zoom, <kbd>1</kbd>–<kbd>9</kbd> choisir, <kbd>Espace</kbd> lancer la manche, <kbd>U</kbd> améliorer, <kbd>A</kbd> âge suivant, <kbd>Suppr</kbd> vendre, <kbd>Échap</kbd> annuler.</li>" +
      '</ul><div class="ag-row"><button class="btn" data-go="menu">Retour</button></div></div>');
  }
  function showMeta() {
    var h = '<div class="ag-card-in"><h2>Améliorations permanentes</h2><p class="ag-stars">⭐ <b>' + save.stars + '</b> étoiles</p><div class="ag-meta">';
    D.META.forEach(function (u) {
      var lv = Math.min(u.max, save.meta[u.id] | 0), full = lv >= u.max, c = full ? 0 : u.cost[lv], pips = "";
      for (var i = 0; i < u.max; i++) pips += '<i class="' + (i < lv ? "on" : "") + '"></i>';
      h += '<div class="ag-up"><span class="ag-up-ico">' + u.ico + '</span><div><b>' + u.name + '</b><small>' + u.desc + (lv ? " · actuel : " + u.fmt(lv) : "") + '</small><div class="ag-pips">' + pips + '</div></div><button class="btn btn-small" data-buy="' + u.id + '"' + (full || save.stars < c ? " disabled" : "") + ">" + (full ? "Max" : c + " ⭐") + "</button></div>";
    });
    h += '</div><div class="ag-row"><button class="btn" data-go="menu">Retour</button></div></div>';
    openOverlay(h);
  }

  ui.overlay.addEventListener("click", function (e) {
    var t = e.target.closest("[data-mode],[data-map],[data-diff],[data-go],[data-buy]"); if (!t) return; audio();
    if (t.dataset.mode) { menuState.mode = t.dataset.mode; showMenu(); }
    else if (t.dataset.map) { save.mapId = t.dataset.map; persist(); showMenu(); }
    else if (t.dataset.diff) { save.diff = t.dataset.diff; persist(); showMenu(); }
    else if (t.dataset.buy) { var u = D.META.filter(function (x) { return x.id === t.dataset.buy; })[0], lv = save.meta[u.id] | 0; if (lv < u.max && save.stars >= u.cost[lv]) { save.stars -= u.cost[lv]; save.meta[u.id] = lv + 1; persist(); showMeta(); } }
    else {
      var go = t.dataset.go;
      if (go === "solo") startGame({ role: "solo", mode: "solo", mapId: save.mapId, diff: save.diff, metas: [myMeta(), C.defaultMeta()], me: 0 });
      else if (go === "create") openLobby(menuState.mode, null);
      else if (go === "join") { var code = (ui.overlay.querySelector("#ag-code").value || "").toUpperCase().replace(/[^A-Z]/g, ""); if (code.length !== 4) { toast("Le code a 4 lettres", "bad"); return; } openLobby(menuState.mode, code); }
      else if (go === "meta") { if (G) { G.paused = G.mode === "solo"; } showMeta(); }
      else if (go === "help") showHelp();
      else if (go === "menu") { if (G && !G.over) { showPause(); } else if (G) endToMenu(); else showMenu(); }
      else if (go === "resume") { closeOverlay(); if (G) G.paused = false; }
      else if (go === "quit") { if (G && G.role === "host" && G.mode === "versus") { } endToMenu(); }
      else if (go === "again") { if (G && G.role !== "guest" && G.mode === "solo") startGame({ role: "solo", mode: "solo", mapId: G.mapId, diff: G.diff, metas: [myMeta(), C.defaultMeta()], me: 0 }); else endToMenu(); }
      else if (go === "start") startOnline();
      else if (go === "leave") { lobbyClose(); showMenu(); }
      else if (go === "copy") { var link = location.origin + location.pathname + "#ag=" + lobby.code; try { navigator.clipboard.writeText(link); toast("Lien copié", "good"); } catch (er) { toast(link); } }
    }
  });

  /* ---------- en ligne : salon ---------- */
  var lobby = null;
  function newCode() { var a = "ABCDEFGHJKLMNPQRSTUVWXYZ", s = ""; for (var i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
  function lobbyClose() { if (lobby && lobby.net) { try { lobby.net.close(); } catch (e) {} } lobby = null; }
  function openLobby(mode, code) {
    if (!window.KD_NET) { toast("Le réseau n'est pas disponible", "bad"); return; }
    lobbyClose();
    var host = !code, id = "p" + Math.random().toString(36).slice(2, 8);
    lobby = { mode: mode, code: code || newCode(), host: host, id: id, roster: [], status: "…", mapId: save.mapId, diff: save.diff, net: null, started: false };
    var meta = function () { return { id: id, host: host, ts: lobby.ts || (lobby.ts = Date.now()), name: host ? "Hôte" : "Invité", m: myMeta() }; };
    lobby.net = window.KD_NET.open({
      code: "ag-" + lobby.code, id: id, meta: meta,
      events: ["start", "cmd", "snap", "end", "res"],
      onEvent: onNet, onRoster: function (list) { lobby && (lobby.roster = list); onRoster(); }, onStatus: function (s) { if (lobby) { lobby.status = s; renderLobby(); } },
    });
    if (!lobby.net) { toast("Impossible de joindre le serveur", "bad"); lobby = null; return; }
    renderLobby();
  }
  function renderLobby() {
    if (!lobby || lobby.started) return;
    var n = lobby.roster.length, h = '<div class="ag-card-in ag-lobby"><h2>' + MODE_NAMES[lobby.mode] + '</h2><p>Carte : <b>' + esc(D.MAPS.filter(function (m) { return m.id === lobby.mapId; })[0].name) + "</b> · " + (D.DIFFS.filter(function (d) { return d.id === lobby.diff; })[0].name) + "</p>";
    h += '<div class="ag-code">' + lobby.code + '</div><p>' + (lobby.host ? "Donne ce code (ou le lien) à ton partenaire." : "Connexion au salon…") + '</p>';
    h += '<ul class="ag-roster">' + lobby.roster.map(function (r) { return "<li>" + (r.host ? "👑 " : "🙂 ") + esc(r.name) + (r.id === lobby.id ? " (toi)" : "") + "</li>"; }).join("") + "</ul>";
    h += '<div class="ag-row">' + (lobby.host ? '<button class="btn ag-go" data-go="start"' + (n < 2 ? " disabled" : "") + ">▶ Lancer la partie</button><button class=\"btn btn-ghost\" data-go=\"copy\">🔗 Copier le lien</button>" : "<span>En attente de l'hôte…</span>") + '<button class="btn btn-ghost" data-go="leave">Quitter</button></div></div>';
    openOverlay(h);
  }
  function onRoster() {
    if (lobby && !lobby.started) { renderLobby(); return; }
    if (G && G.net && lobby) {
      var hasHost = lobby.roster.some(function (r) { return r.host; }), n = lobby.roster.length;
      if (G.role === "guest" && !hasHost && !G.over) { toast("L'hôte a quitté la partie", "bad"); setTimeout(function () { if (G && !G.over) { G.over = true; openOverlay('<div class="ag-card-in"><h2>L\'hôte est parti</h2><div class="ag-row"><button class="btn" data-go="menu">Menu</button></div></div>'); } }, 600); }
      if (G.role === "host" && n < 2 && !G.over) {
        if (G.mode === "versus") { G.sim.over = { winner: 0 }; toast("L'adversaire a quitté : victoire !", "good"); }
        else toast("Ton partenaire a quitté la partie", "bad");
      }
    }
  }
  function startOnline() {
    if (!lobby || !lobby.host || lobby.roster.length < 2) return;
    var guest = lobby.roster.filter(function (r) { return !r.host; })[0];
    var gm = Object.assign(C.defaultMeta(), guest.m || {}), mine = myMeta(), cfg = { mode: lobby.mode, mapId: lobby.mapId, diff: lobby.diff, metas: [mine, gm], names: ["Hôte", "Invité"] };
    lobby.net.send("start", cfg); lobby.started = true;
    var net = lobby.net; lobby.net = null;
    startGame({ role: "host", mode: cfg.mode, mapId: cfg.mapId, diff: cfg.diff, metas: cfg.metas, names: cfg.names, me: 0, net: net, keepNet: true });
    G.net = net; G.lobbyRef = lobby;
  }
  function onNet(ev, p) {
    if (!lobby && !(G && G.net)) return;
    if (ev === "start" && lobby && !lobby.host && !lobby.started) {
      lobby.started = true; var net = lobby.net;
      startGame({ role: "guest", mode: p.mode, mapId: p.mapId, diff: p.diff, metas: p.metas, names: p.names, me: p.mode === "versus" ? 1 : 1, net: net, keepNet: true });
      G.net = net;
    } else if (ev === "cmd" && G && G.role === "host") {
      var err = C.command(G.sim, 1, p.c); if (err) G.net.send("res", { n: p.n, err: err });
    } else if (ev === "res" && G && G.role === "guest") { toast(p.err, "bad"); sfx("err"); }
    else if (ev === "snap" && G && G.role === "guest") { G.lastSnap = performance.now(); C.applySnapshot(G.view, p); G.occDirty = true; }
    else if (ev === "end" && G && G.role === "guest" && !G.over) { G.view.over = p.over; }
  }

  /* ---------- plein écran ---------- */
  function fsIs() { return !!document.fullscreenElement || stage.classList.contains("is-max"); }
  function fsToggle() {
    if (window.GameKit && GameKit.fullscreen) { GameKit.fullscreen.toggle(stage); return; }
    if (fsIs()) { stage.classList.remove("is-max"); if (document.fullscreenElement) document.exitFullscreen(); }
    else if (stage.requestFullscreen) stage.requestFullscreen().catch(function () { stage.classList.add("is-max"); });
    else stage.classList.add("is-max");
    setTimeout(resize, 100);
  }
  var fsBtn = document.querySelector("[data-game-fullscreen]");
  if (fsBtn) fsBtn.addEventListener("click", fsToggle);
  var fsIn = el("button", "ag-btn", "⛶"); fsIn.title = "Plein écran"; fsIn.addEventListener("click", fsToggle);
  ui.top.insertBefore(fsIn, ui.top.querySelector('[data-act="menu"]'));
  document.addEventListener("fullscreenchange", function () { setTimeout(resize, 80); });

  /* ---------- démarrage ---------- */
  window.addEventListener("resize", resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  document.addEventListener("fullscreenchange", function () { setTimeout(resize, 60); });
  setInterval(function () { if (G) resize(); }, 1500);
  resize();
  ui.top.querySelector('[data-act="mute"]').textContent = save.mute ? "🔇" : "🔊";
  try { var hp = new URLSearchParams(location.hash.replace("#", "")); if (hp.get("ag")) menuState.mode = hp.get("mode") === "versus" ? "versus" : "coop"; } catch (e) {}
  showMenu();
  window.AGES_DEBUG = { G: function () { return G; }, C: C, startGame: startGame, save: save, W: function () { return G && W(); }, doCmd: doCmd };
})();
