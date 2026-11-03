/* =========================================================================
   Échecs — interface (plateau, menus, bot, en ligne, pendules, sons)
   -------------------------------------------------------------------------
   Règles et bot : js/chess-core.js (le bot tourne dans un Web Worker).
   En ligne : Supabase Realtime, salon « chess-room-CODE » (code de 4 lettres,
   lien echecs.html#salon=CODE). Chaque joueur vérifie les coups reçus ; un
   état complet (« state ») resynchronise après une coupure ou un rechargement.
   Sauvegardes locales : chess-bot-v1 (partie contre le bot en cours),
   chess-stats-v1 (victoires), chess-theme, chess-sound, chess-name.
   ========================================================================= */
(function () {
  "use strict";
  var C = window.CHESS;
  var root = document.querySelector("[data-chess]");
  if (!C || !root) return;
  var VERSION = "1.0.0";
  var CORE_URL = "js/chess-core.js?v=20261106ch1";

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function load(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function now() { return Date.now(); }

  /* =====================================================================
     PIÈCES — dessinées en SVG (viewBox 45 × 45), injectées en CSS
     ===================================================================== */
  var SHAPES = {
    1: '<circle cx="22.5" cy="12.5" r="5.6"/><path d="M18 20.2h9c.9 0 1.5.7 1.5 1.4s-.6 1.4-1.5 1.4h-9c-.9 0-1.5-.7-1.5-1.4s.6-1.4 1.5-1.4z"/><path d="M15 33.5c.4-5.4 2.7-8.6 4.4-10.5h6.2c1.7 1.9 4 5.1 4.4 10.5z"/>',
    2: '<path d="M13 33.5c0-6.5 3.6-9.6 6.4-12.6-2.6.2-5.4 1.7-7.6 2.2-2 .5-3.6-1.5-2.6-3.6 1.6-3.3 4.4-6.4 6.6-8.8l-.6-4.2 3.6 2.6 1.6-3.2 2.1 3.2c6.7 1.1 10.8 6.6 10.8 13.6 0 4.2-1.2 7.6-1.2 10.8z"/><path class="d" d="M23.5 11.2c4.6 1.6 6.9 6.2 6.9 12.4" fill="none"/><circle class="e" cx="17.6" cy="14.2" r="1.4"/>',
    3: '<circle cx="22.5" cy="7.4" r="2.6"/><path d="M22.5 10c-6.4 3.4-8 9.2-6.4 13.7h12.8c1.6-4.5 0-10.3-6.4-13.7z"/><path class="d" d="M25 13.4l-4.6 5.4" fill="none"/><path d="M15.4 23.7h14.2c.8 0 1.4.6 1.4 1.4v.4c0 .8-.6 1.4-1.4 1.4H15.4c-.8 0-1.4-.6-1.4-1.4v-.4c0-.8.6-1.4 1.4-1.4z"/><path d="M17.4 26.9c-.2 3-1.6 5-3 6.6h16.2c-1.4-1.6-2.8-3.6-3-6.6z"/>',
    4: '<path d="M12 17V9.2h4.2v3.2h3.8V9.2h5v3.2h3.8V9.2H33V17z"/><path d="M14.4 17h16.2l1.4 16.5H13z"/><path class="d" d="M14.6 21h15.8M14.2 29h16.6" fill="none"/>',
    5: '<circle cx="9.2" cy="12" r="2.3"/><circle cx="15.6" cy="9.2" r="2.3"/><circle cx="22.5" cy="8" r="2.3"/><circle cx="29.4" cy="9.2" r="2.3"/><circle cx="35.8" cy="12" r="2.3"/><path d="M11.4 30L9.4 14l5.8 8.2.8-11 4.4 10.6 2.1-11.6 2.1 11.6 4.4-10.6.8 11 5.8-8.2-2 16z"/><path d="M11.4 30h22.2l-1.1 3.5H12.5z"/>',
    6: '<path d="M21 3.6h3v3.2h3.2v3H24v4.4h-3V9.8h-3.2v-3H21z"/><path d="M22.5 14.6c4.4 0 11.5 1.4 12.5 5.8.9 4-1.8 7.4-3 9.6H13c-1.2-2.2-3.9-5.6-3-9.6 1-4.4 8.1-5.8 12.5-5.8z"/><path class="d" d="M22.5 15v14.6M14.6 22.6c5-2 10.8-2 15.8 0" fill="none"/><path d="M13 30h19l-1 3.5H14z"/>'
  };
  var BASE = '<path d="M10.5 39.6h24v-2.8c0-1.5-1.2-2.7-2.7-2.7H13.2c-1.5 0-2.7 1.2-2.7 2.7z"/>';
  var PCOL = { "1": { f: "#fbf1dc", s: "#2b1709", d: "#b98c5c" }, "-1": { f: "#3b2a1f", s: "#100804", d: "#b48a62" } };
  function pieceSVG(t, side) {
    var c = PCOL[side > 0 ? "1" : "-1"];
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="' + c.f + '" stroke="' + c.s + '" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">' +
      '<style>.d{stroke:' + c.d + ';stroke-width:1.3}.e{fill:' + c.s + ';stroke:none}</style>' + SHAPES[t] + BASE + "</g></svg>";
  }
  function pieceURL(t, side) { return 'url("data:image/svg+xml,' + encodeURIComponent(pieceSVG(t, side)) + '")'; }
  (function injectCSS() {
    var css = "";
    for (var t = 1; t <= 6; t++) { css += ".cp-w" + t + "{background-image:" + pieceURL(t, 1) + "}"; css += ".cp-b" + t + "{background-image:" + pieceURL(t, -1) + "}"; }
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  })();
  function pcClass(pc) { return "cp-" + (pc > 0 ? "w" : "b") + Math.abs(pc); }
  function pieceIcon(t, side, cls) { return '<i class="cpi ' + (cls || "") + " " + pcClass(t * side) + '" aria-hidden="true"></i>'; }

  /* =====================================================================
     SONS (WebAudio, rien à télécharger)
     ===================================================================== */
  var soundOn = load("chess-sound", true), AC = null;
  function ac() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
    if (AC && AC.state === "suspended") AC.resume();
    return AC;
  }
  function knock(t0, freq, dur, vol) {
    var a = ac(); if (!a) return;
    var len = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    var src = a.createBufferSource(); src.buffer = buf;
    var f = a.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 1.4;
    var g = a.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(a.destination);
    src.start(a.currentTime + t0);
  }
  function tone(t0, freq, dur, vol, type) {
    var a = ac(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0;
    o.type = type || "triangle"; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function sfx(kind) {
    if (!soundOn) return;
    if (kind === "move") knock(0, 900, 0.07, 0.9);
    else if (kind === "capture") { knock(0, 520, 0.1, 1.2); knock(0.04, 1200, 0.05, 0.5); }
    else if (kind === "castle") { knock(0, 900, 0.06, 0.8); knock(0.09, 800, 0.06, 0.8); }
    else if (kind === "check") { knock(0, 900, 0.06, 0.8); tone(0.02, 880, 0.18, 0.08, "square"); }
    else if (kind === "win") { [523, 659, 784, 1047].forEach(function (f, i) { tone(i * 0.11, f, 0.3, 0.12); }); }
    else if (kind === "lose") { [392, 330, 262].forEach(function (f, i) { tone(i * 0.16, f, 0.35, 0.12); }); }
    else if (kind === "draw") { tone(0, 523, 0.3, 0.1); tone(0.18, 523, 0.3, 0.1); }
    else if (kind === "start") { tone(0, 659, 0.12, 0.08); tone(0.1, 988, 0.2, 0.08); }
    else if (kind === "low") tone(0, 1320, 0.08, 0.06, "square");
    else if (kind === "notify") { tone(0, 784, 0.12, 0.08); tone(0.12, 1047, 0.16, 0.08); }
  }

  /* =====================================================================
     ÉLÉMENTS
     ===================================================================== */
  var boardEl = $("[data-board]", root), wrapEl = $(".chess-board-wrap", root), arrowsEl = $("[data-arrows]", root);
  var promoEl = $("[data-promo]", root), overlay = $("[data-overlay]", root), card = $("[data-card]", root);
  var statusEl = $("[data-status]", root), movesEl = $("[data-moves]", root), actionsEl = $("[data-actions]", root);
  var offerEl = $("[data-offer]", root), roomEl = $("[data-room]", root);
  var bars = { top: $('[data-bar="top"]', root), bottom: $('[data-bar="bottom"]', root) };
  var themes = { foret: "Forêt", bois: "Bois", ardoise: "Ardoise", rose: "Cerisier" };
  var theme = load("chess-theme", "foret"); if (!themes[theme]) theme = "foret";
  root.dataset.boardTheme = theme;
  var myName = String(load("chess-name", "") || "").slice(0, 16);

  var LV_ICON = ["🌰", "🥜", "🐿️", "🦉", "🦊", "🌳"];
  var TCS = [
    { id: "none", label: "Sans limite", tc: null },
    { id: "1+0", label: "1 min", tc: { base: 60000, inc: 0 } },
    { id: "3+2", label: "3 min + 2 s", tc: { base: 180000, inc: 2000 } },
    { id: "5+0", label: "5 min", tc: { base: 300000, inc: 0 } },
    { id: "10+0", label: "10 min", tc: { base: 600000, inc: 0 } },
    { id: "15+10", label: "15 min + 10 s", tc: { base: 900000, inc: 10000 } }
  ];
  function tcById(id) { for (var i = 0; i < TCS.length; i++) if (TCS[i].id === id) return TCS[i]; return TCS[0]; }
  function tcLabel(tc) { if (!tc) return "Sans limite"; for (var i = 1; i < TCS.length; i++) if (TCS[i].tc.base === tc.base && TCS[i].tc.inc === tc.inc) return TCS[i].label; return Math.round(tc.base / 60000) + " min"; }

  /* ---------- cases (créées une fois) ---------- */
  var sqEls = {}, flipped = false;
  for (var r0 = 0; r0 < 8; r0++) for (var f0 = 0; f0 < 8; f0++) {
    var sqi = r0 * 16 + f0, el = document.createElement("div");
    el.className = "sq " + ((r0 + f0) & 1 ? "lt" : "dk");
    el.dataset.sq = sqi;
    boardEl.appendChild(el); sqEls[sqi] = el;
  }
  var pieceLayer = document.createElement("div"); pieceLayer.className = "cp-layer"; boardEl.appendChild(pieceLayer);
  function colRow(sq) { var f = sq & 7, r = sq >> 4; return flipped ? [7 - f, r] : [f, 7 - r]; }
  function placeSquares() {
    Object.keys(sqEls).forEach(function (k) {
      var sq = +k, cr = colRow(sq), el = sqEls[k];
      el.style.left = cr[0] * 12.5 + "%"; el.style.top = cr[1] * 12.5 + "%";
      var html = "";
      if (cr[0] === 0) html += '<span class="co co-r">' + ((sq >> 4) + 1) + "</span>";
      if (cr[1] === 7) html += '<span class="co co-f">' + "abcdefgh".charAt(sq & 7) + "</span>";
      el.innerHTML = html;
    });
  }
  function pieceTransform(sq) { var cr = colRow(sq); return "translate(" + cr[0] * 100 + "%," + cr[1] * 100 + "%)"; }

  /* =====================================================================
     PARTIE
     ===================================================================== */
  var G = null;           // partie en cours
  var view = null;        // null = position actuelle, sinon index dans G.snaps
  var sel = -1, targets = [], drag = null, hint = null, premoveMsg = "";
  var botWorker = null, botId = 0, botBusy = false, hintId = 0;

  function snapOf(p, last) {
    return { b: p.b.slice(), last: last || null, check: C.inCheck(p) ? p.kings[p.side > 0 ? 0 : 1] : -1, side: p.side };
  }
  function newGame(o) {
    var g = {
      mode: o.mode, pos: C.fromFEN(C.START), moves: [], sans: [], snaps: [], result: null,
      level: o.level || 0, human: o.human || 1, tc: o.tc || null, clock: null, turnStart: 0,
      names: o.names || { "1": "Blancs", "-1": "Noirs" }, recorded: false, gid: o.gid || null, ts: o.ts || 0,
      ids: o.ids || null, white: o.white || null, my: o.my == null ? 1 : o.my, offer: null, offerSent: false
    };
    g.legal = C.legalMoves(g.pos);
    g.snaps.push(snapOf(g.pos, null));
    if (g.tc) g.clock = [g.tc.base, g.tc.base];
    g.turnStart = now();
    return g;
  }
  // rejoue une liste de coups UCI dans la partie (sans sons ni animations)
  function replayInto(g, moves) {
    for (var i = 0; i < moves.length; i++) {
      var m = C.findUCI(g.pos, moves[i], g.legal);
      if (!m) break;
      g.sans.push(C.san(g.pos, m, g.legal));
      C.make(g.pos, m); g.moves.push(C.toUCI(m));
      g.snaps.push(snapOf(g.pos, [C.from(m), C.to(m)]));
      g.legal = C.legalMoves(g.pos);
    }
  }
  function sideToMove() { return G ? G.pos.side : 1; }
  function clockRunning() { return G && G.tc && !G.result && G.moves.length >= 1; }
  function remaining(side) {
    if (!G || !G.clock) return 0;
    var i = side > 0 ? 0 : 1, t = G.clock[i];
    if (clockRunning() && G.pos.side === side) t -= now() - G.turnStart;
    return Math.max(0, t);
  }
  // le joueur de cet écran peut-il jouer les pièces de cette couleur ?
  function controls(side) {
    if (!G || G.result || view != null) return false;
    if (G.mode === "bot") return side === G.human && !botBusy;
    if (G.mode === "local") return side === G.pos.side;
    if (G.mode === "online") return side === G.my;
    return false;
  }
  function canMoveNow() { return G && !G.result && view == null && controls(G.pos.side); }

  function commit(m, o) {
    o = o || {};
    var g = G, p = g.pos, side = p.side, fl = C.flag(m);
    var san = C.san(p, m, g.legal);
    // pendule
    if (g.tc && g.clock) {
      if (o.clock) { g.clock = o.clock.slice(); }
      else if (g.moves.length >= 1) {
        var i = side > 0 ? 0 : 1;
        g.clock[i] = Math.max(0, g.clock[i] - (now() - g.turnStart)) + g.tc.inc;
      }
      g.turnStart = now();
    }
    C.make(p, m);
    var uci = C.toUCI(m);
    g.moves.push(uci); g.sans.push(san);
    g.snaps.push(snapOf(p, [C.from(m), C.to(m)]));
    g.legal = C.legalMoves(p);
    g.offer = null; g.offerSent = false;
    sel = -1; targets = []; hint = null; view = null;
    var st = C.status(p);
    sfx(st.over && st.reason === "mat" ? "check" : st.check ? "check" : fl & C.CASTLE ? "castle" : fl & C.CAP ? "capture" : "move");
    if (g.mode === "online" && !o.remote) netSend("mv", { gid: g.gid, n: g.moves.length - 1, uci: uci, clock: g.clock });
    render(o.noAnim ? null : m);
    if (st.over) endGame({ winner: st.winner, reason: st.reason }, { local: true });
    if (g.mode === "bot") { saveBot(); if (!g.result && p.side !== g.human) botMove(); }
  }
  function tryMove(from, to, anim) {
    var cands = G.legal.filter(function (m) { return C.from(m) === from && C.to(m) === to; });
    if (!cands.length) return false;
    if (cands.length > 1) { askPromo(cands, to); return true; }
    commit(cands[0], { noAnim: !anim });
    return true;
  }
  function askPromo(cands, to) {
    var side = G.pos.side;
    promoEl.innerHTML = '<div class="chess-promo-box" role="dialog" aria-label="Promotion"><p>Promotion</p><div>' + [5, 4, 3, 2].map(function (t) {
      return '<button type="button" data-promo-t="' + t + '" aria-label="' + ["", "", "Cavalier", "Fou", "Tour", "Dame"][t] + '">' + pieceIcon(t, side) + "</button>";
    }).join("") + '</div><button type="button" class="chess-promo-x" data-promo-x>Annuler</button></div>';
    promoEl.hidden = false;
    $$("[data-promo-t]", promoEl).forEach(function (b) {
      b.addEventListener("click", function () {
        var t = +b.dataset.promoT, m = cands.filter(function (c) { return C.promo(c) === t; })[0];
        promoEl.hidden = true; if (m && G && !G.result) commit(m, { noAnim: true });
      });
    });
    $("[data-promo-x]", promoEl).addEventListener("click", function () { promoEl.hidden = true; sel = -1; targets = []; lastRenderKey = ""; render(); });
    var first = $("[data-promo-t]", promoEl); if (first) first.focus();
  }

  var REASON = {
    "mat": "Échec et mat", "pat": "Pat", "matériel": "Matériel insuffisant", "50 coups": "Règle des 50 coups",
    "répétition": "Triple répétition", "temps": "Temps écoulé", "abandon": "Abandon", "accord": "Nulle d'un commun accord", "parti": "Adversaire parti"
  };
  function endGame(res, o) {
    if (!G || G.result) return;
    o = o || {};
    G.result = res; botId++; botBusy = false;
    if (G.tc && G.clock && res.reason !== "temps" && G.moves.length >= 1) {
      var i = G.pos.side > 0 ? 0 : 1; G.clock[i] = Math.max(0, G.clock[i] - (now() - G.turnStart));
    }
    var mine = myResult();
    sfx(mine > 0 ? "win" : mine < 0 ? "lose" : res.winner === 0 ? "draw" : "win");
    recordStats();
    if (G.mode === "bot" && !party) saveBot();
    if (party && !party.ended && (G.mode === "bot" || G.mode === "online")) {
      party.ended = true;
      var mr = myResult();
      window.Party.over({ score: mr > 0 ? 2 : mr === 0 ? 1 : 0, done: mr > 0, dead: mr != null && mr < 0 });
    }
    render();
    var g = G;
    setTimeout(function () { if (G === g && G.result && overlay.hidden) showEnd(); }, o.instant ? 0 : 900);
  }
  // +1 j'ai gagné, -1 j'ai perdu, 0 nulle, null (spectateur / même écran)
  function myResult() {
    if (!G || !G.result) return null;
    var w = G.result.winner, me = G.mode === "bot" ? G.human : G.mode === "online" ? G.my : 0;
    if (!me) return null;
    return w === 0 ? 0 : w === me ? 1 : -1;
  }
  function recordStats() {
    if (!G || G.recorded || (G.mode !== "bot" && G.mode !== "online")) return;
    var r = myResult(); if (r == null) return;
    if (G.moves.length < 2 && G.result.reason === "abandon") return;   // abandon immédiat : on ne compte pas
    G.recorded = true;
    var s = load("chess-stats-v1", { lv: {}, on: { w: 0, d: 0, l: 0 } });
    var bucket = G.mode === "bot" ? (s.lv[G.level] = s.lv[G.level] || { w: 0, d: 0, l: 0 }) : (s.on = s.on || { w: 0, d: 0, l: 0 });
    bucket[r > 0 ? "w" : r < 0 ? "l" : "d"]++;
    save("chess-stats-v1", s);
  }
  function stats() { return load("chess-stats-v1", { lv: {}, on: { w: 0, d: 0, l: 0 } }); }
  function resultText() {
    if (!G || !G.result) return "";
    var w = G.result.winner, why = REASON[G.result.reason] || G.result.reason;
    if (w === 0) return "Nulle · " + why;
    return (w > 0 ? "Les Blancs gagnent" : "Les Noirs gagnent") + " · " + why;
  }

  /* ---------- bot ---------- */
  function worker() {
    if (botWorker !== null) return botWorker;
    try {
      botWorker = new Worker(CORE_URL);
      botWorker.onmessage = onBot;
      botWorker.onerror = function () { botWorker = false; };
    } catch (e) { botWorker = false; }
    return botWorker;
  }
  var botJobs = {};
  function ask(level, cb) {
    var id = ++hintId + "-" + Math.random().toString(36).slice(2, 6), moves = G.moves.slice();
    botJobs[id] = cb;
    var w = worker();
    if (w) { try { w.postMessage({ id: id, moves: moves, level: level }); return; } catch (e) {} }
    // sans Worker (page ouverte en file://) : on réfléchit sur le fil principal
    setTimeout(function () {
      var p = C.replay(moves), r = C.think(p, level, moves);
      onBot({ data: { id: id, uci: r.uci } });
    }, 30);
  }
  function onBot(e) {
    var d = e.data || {}, cb = botJobs[d.id];
    delete botJobs[d.id];
    if (cb) cb(d);
  }
  function botMove() {
    if (!G || G.mode !== "bot" || G.result) return;
    var my = ++botId, g = G, t0 = now(), lv = G.level;
    botBusy = true; render();
    ask(lv, function (d) {
      if (my !== botId || G !== g || g.result) return;
      var wait = Math.max(0, (lv <= 2 ? 650 : lv <= 4 ? 450 : 250) - (now() - t0));
      setTimeout(function () {
        if (my !== botId || G !== g || g.result) return;
        botBusy = false;
        var m = d.uci && C.findUCI(g.pos, d.uci, g.legal);
        if (!m) m = g.legal[(Math.random() * g.legal.length) | 0];
        if (m) commit(m, {}); else render();
      }, wait);
    });
  }
  function showHint() {
    if (!canMoveNow()) return;
    var g = G, n = G.moves.length;
    hint = { busy: true }; render();
    ask(5, function (d) {
      if (G !== g || g.moves.length !== n || !d.uci) { hint = null; render(); return; }
      hint = { from: C.sqOf(d.uci.slice(0, 2)), to: C.sqOf(d.uci.slice(2, 4)) };
      render();
    });
  }
  function undo() {
    if (!G || (G.mode !== "bot" && G.mode !== "local") || !G.moves.length) return;
    botId++; botBusy = false;
    var n = 1;
    if (G.mode === "bot") {
      n = G.pos.side === G.human ? 2 : 1;           // annule le coup du bot + le mien
      if (n > G.moves.length) n = G.moves.length;
      if (G.moves.length - n === 0 && G.human < 0) n = G.moves.length - 1; // le bot (blancs) garde son 1er coup
      if (n <= 0) return;
    }
    var moves = G.moves.slice(0, G.moves.length - n);
    var keep = { mode: G.mode, level: G.level, human: G.human, tc: G.tc, names: G.names };
    var clock = G.clock;
    G = newGame(keep); replayInto(G, moves);
    if (clock) G.clock = clock;
    sel = -1; targets = []; hint = null; view = null; promoEl.hidden = true;
    if (G.mode === "bot") { saveBot(); if (G.pos.side !== G.human) botMove(); }
    render();
  }
  function saveBot() {
    if (!G || G.mode !== "bot" || party) return;   // party : on ne touche pas à la partie sauvegardée
    save("chess-bot-v1", { level: G.level, human: G.human, moves: G.moves, over: !!G.result, v: VERSION });
  }
  function botNames(level, human) {
    var L = C.LEVELS[level - 1], n = {};
    n[human] = myName || "Toi";
    n[-human] = LV_ICON[level - 1] + " " + L.name + " · niv. " + level;
    return n;
  }
  function startBot(level, human, moves) {
    leaveOnline(true);
    G = newGame({ mode: "bot", level: level, human: human, names: botNames(level, human) });
    if (moves && moves.length) replayInto(G, moves);
    flipped = human < 0; placeSquares();
    sel = -1; targets = []; hint = null; view = null;
    closeOverlay(); sfx("start");
    var st = C.status(G.pos);
    if (st.over) { G.result = { winner: st.winner, reason: st.reason }; G.recorded = true; }
    saveBot(); render();
    if (!G.result && G.pos.side !== G.human) botMove();
  }
  function startLocal(tc) {
    leaveOnline(true);
    G = newGame({ mode: "local", tc: tc, names: { "1": "Blancs", "-1": "Noirs" } });
    flipped = false; placeSquares();
    sel = -1; targets = []; hint = null; view = null;
    closeOverlay(); sfx("start"); render();
  }

  /* =====================================================================
     RENDU
     ===================================================================== */
  var lastRenderKey = "";
  function shown() { return G ? G.snaps[view == null ? G.snaps.length - 1 : view] : null; }
  function render(animMove) {
    var sn = shown();
    // cases
    Object.keys(sqEls).forEach(function (k) {
      var sq = +k, el = sqEls[k], c = el.classList;
      c.remove("last", "sel", "dot", "ring", "chk", "hint");
      if (!sn) return;
      if (sn.last && (sn.last[0] === sq || sn.last[1] === sq)) c.add("last");
      if (sn.check === sq) c.add("chk");
    });
    if (sn && view == null) {
      if (sel >= 0) sqEls[sel].classList.add("sel");
      targets.forEach(function (t) { sqEls[t].classList.add(sn.b[t] || (G.legal.some(function (m) { return C.to(m) === t && C.from(m) === sel && (C.flag(m) & C.EP); })) ? "ring" : "dot"); });
    }
    // pièces
    var key = sn ? Array.prototype.join.call(sn.b, ",") + "|" + flipped : "";
    if (key !== lastRenderKey || animMove) {
      lastRenderKey = key;
      pieceLayer.innerHTML = "";
      if (sn) {
        for (var s = 0; s < 128; s++) {
          if (s & 0x88) { s += 7; continue; }
          var pc = sn.b[s]; if (!pc) continue;
          var e = document.createElement("div");
          e.className = "cp " + pcClass(pc); e.dataset.sq = s;
          e.style.transform = pieceTransform(s);
          pieceLayer.appendChild(e);
        }
        if (animMove) animate(animMove);
      }
    }
    // flèche d'indice
    var arrows = "";
    if (hint && hint.from != null && view == null) arrows += arrowSVG(hint.from, hint.to, "hint");
    arrowsEl.innerHTML = arrows;
    renderBars(sn); renderSide();
  }
  function animate(m) {
    var list = [[C.from(m), C.to(m)]];
    if (C.flag(m) & C.CASTLE) { var f = C.from(m), t = C.to(m); list.push(t > f ? [f + 3, f + 1] : [f - 4, f - 1]); }
    list.forEach(function (ft) {
      var el = pieceLayer.querySelector('[data-sq="' + ft[1] + '"]');
      if (el && el.animate) { try { el.animate([{ transform: pieceTransform(ft[0]) }, { transform: pieceTransform(ft[1]) }], { duration: 170, easing: "cubic-bezier(.3,.7,.3,1)" }); } catch (e) {} }
    });
  }
  function arrowSVG(a, b, cls) {
    var ca = colRow(a), cb = colRow(b);
    var x1 = ca[0] + 0.5, y1 = ca[1] + 0.5, x2 = cb[0] + 0.5, y2 = cb[1] + 0.5;
    var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / L, uy = dy / L;
    var hx = x2 - ux * 0.32, hy = y2 - uy * 0.32, w = 0.12, hw = 0.3;
    var sx = x1 + ux * 0.2, sy = y1 + uy * 0.2;
    var pts = [[sx - uy * w, sy + ux * w], [hx - uy * w, hy + ux * w], [hx - uy * hw, hy + ux * hw], [x2 - ux * 0.08, y2 - uy * 0.08], [hx + uy * hw, hy - ux * hw], [hx + uy * w, hy - ux * w], [sx + uy * w, sy - ux * w]];
    return '<polygon class="' + cls + '" points="' + pts.map(function (q) { return q[0].toFixed(3) + "," + q[1].toFixed(3); }).join(" ") + '"/>';
  }
  var START_COUNT = [0, 8, 2, 2, 2, 1, 1], VALS = [0, 1, 3, 3, 5, 9, 0];
  function captured(b) {
    var have = { "1": [0, 0, 0, 0, 0, 0, 0], "-1": [0, 0, 0, 0, 0, 0, 0] }, mat = { "1": 0, "-1": 0 };
    for (var s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } var pc = b[s]; if (!pc) continue; var sd = pc > 0 ? "1" : "-1"; have[sd][Math.abs(pc)]++; mat[sd] += VALS[Math.abs(pc)]; }
    return { have: have, mat: mat };
  }
  function fmtClock(ms) {
    var s = Math.ceil(ms / 1000);
    if (ms < 10000) { var t = Math.max(0, ms) / 1000; return "0:0" + t.toFixed(1); }
    var m = Math.floor(s / 60); s = s % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }
  function renderBars(sn) {
    if (!G) { bars.top.innerHTML = ""; bars.bottom.innerHTML = ""; return; }
    var info = captured(sn.b);
    [["top", flipped ? 1 : -1], ["bottom", flipped ? -1 : 1]].forEach(function (pair) {
      var el = bars[pair[0]], side = pair[1], opp = String(-side);
      // pièces adverses prises par ce camp
      var caps = "";
      for (var t = 1; t <= 5; t++) { var n = Math.max(0, START_COUNT[t] - info.have[opp][t]); for (var i = 0; i < n; i++) caps += pieceIcon(t, -side, "cap"); }
      var diff = info.mat[String(side)] - info.mat[opp];
      var turn = !G.result && G.pos.side === side && view == null;
      var name = G.names[String(side)] || (side > 0 ? "Blancs" : "Noirs");
      var thinking = G.mode === "bot" && botBusy && side !== G.human;
      var online = "";
      if (G.mode === "online" && G.ids) {
        var id = side > 0 ? G.white : G.ids.filter(function (x) { return x !== G.white; })[0];
        var here = id === NET.id || NET.roster.some(function (x) { return x.id === id; });
        online = '<span class="cb-dot' + (here ? " on" : "") + '" title="' + (here ? "Connecté" : "Déconnecté") + '"></span>';
      }
      var clock = "";
      if (G.tc) {
        var rem = remaining(side);
        clock = '<span class="cb-clock' + (turn && clockRunning() ? " run" : "") + (rem < 20000 ? " low" : "") + '" data-clock="' + side + '">' + fmtClock(rem) + "</span>";
      }
      el.className = "chess-bar" + (turn ? " turn" : "");
      el.innerHTML = '<span class="cb-swatch ' + (side > 0 ? "w" : "b") + '" aria-hidden="true"></span>' +
        '<span class="cb-name">' + online + esc(name) + (thinking ? ' <em class="cb-think">réfléchit<b>.</b><b>.</b><b>.</b></em>' : "") + "</span>" +
        '<span class="cb-caps">' + caps + (diff > 0 ? '<b class="cb-diff">+' + diff + "</b>" : "") + "</span>" + clock;
    });
  }
  function updateClocks() {
    if (!G || !G.tc) return;
    $$("[data-clock]", root).forEach(function (el) {
      var side = +el.dataset.clock, rem = remaining(side);
      el.textContent = fmtClock(rem);
      el.classList.toggle("low", rem < 20000);
      el.classList.toggle("run", clockRunning() && G.pos.side === side);
    });
  }
  var confirmKey = null, confirmT = 0;
  function needConfirm(k) { if (confirmKey === k && now() - confirmT < 3000) { confirmKey = null; return false; } confirmKey = k; confirmT = now(); renderSide(); setTimeout(function () { if (confirmKey === k) { confirmKey = null; renderSide(); } }, 3100); return true; }
  function btn(act, label, o) {
    o = o || {};
    var conf = confirmKey === act;
    return '<button class="btn btn-small ' + (o.cls || "btn-ghost") + (conf ? " confirm" : "") + '" type="button" data-act="' + act + '"' + (o.disabled ? " disabled" : "") + (o.title ? ' title="' + esc(o.title) + '"' : "") + ">" + (conf ? "Confirmer ?" : label) + "</button>";
  }
  function renderSide() {
    // statut
    var s = "";
    if (!G) s = "Choisis un mode de jeu.";
    else if (G.result) {
      var mr = myResult();
      s = '<strong class="' + (mr > 0 ? "win" : mr < 0 ? "lose" : "") + '">' + (mr > 0 ? "Victoire ! " : mr < 0 ? "Défaite. " : "") + "</strong>" + esc(resultText());
    } else {
      var side = G.pos.side, nm = side > 0 ? "Blancs" : "Noirs", chk = C.inCheck(G.pos);
      if (G.mode === "bot") s = botBusy ? esc(G.names[String(-G.human)].replace(/ · niv\. \d/, "")) + " réfléchit…" : "À toi de jouer" + (chk ? " — <strong>échec !</strong>" : ".");
      else if (G.mode === "local") s = "Aux <strong>" + nm + "</strong> de jouer" + (chk ? " — <strong>échec !</strong>" : ".");
      else if (G.mode === "online") {
        if (!G.my) s = "Tu regardes la partie. Aux " + nm + " de jouer.";
        else if (side === G.my) s = "À toi de jouer" + (chk ? " — <strong>échec !</strong>" : ".");
        else s = "Au tour de <strong>" + esc(G.names[String(side)]) + "</strong>" + (chk ? " (échec)" : "") + "…";
        if (G.my && !opponentHere()) s += '<br><span class="warn">Ton adversaire est déconnecté…</span>';
      }
      if (view != null) s += '<br><span class="muted">Tu regardes le coup ' + view + " / " + (G.snaps.length - 1) + ".</span>";
    }
    if (premoveMsg) s += '<br><span class="muted">' + esc(premoveMsg) + "</span>";
    statusEl.innerHTML = s;

    // salon
    if (roomEl) {
      if (G && G.mode === "online" && NET.code) {
        roomEl.hidden = false;
        roomEl.innerHTML = 'Salon <strong class="chess-code-sm">' + NET.code + '</strong> · ' + esc(tcLabel(G.tc)) + (NET.roster.length > 2 ? " · 👁 " + (NET.roster.length - 2) : "") +
          ' <button class="link-btn" type="button" data-act="copy">Copier le lien</button>';
      } else roomEl.hidden = true;
    }

    // proposition de nulle / revanche
    var off = "";
    if (G && G.mode === "online" && G.my) {
      if (!G.result && G.offer && G.offer !== NET.id) off = '<p>🤝 <strong>' + esc(G.names[String(-G.my)]) + "</strong> propose la nulle.</p>" + '<div class="btn-row">' + btn("draw-yes", "Accepter", { cls: "btn-alt" }) + btn("draw-no", "Refuser") + "</div>";
      else if (!G.result && G.offerSent) off = "<p>Nulle proposée, en attente de réponse…</p>";
      else if (G.result && NET.rematch[otherId()] && !NET.rematch[NET.id]) off = "<p>🔁 <strong>" + esc(G.names[String(-G.my)]) + "</strong> veut une revanche !</p>";
    }
    offerEl.innerHTML = off; offerEl.hidden = !off;

    // coups
    var html = "";
    if (G) {
      var cur = view == null ? G.snaps.length - 1 : view;
      for (var i = 0; i < G.sans.length; i += 2) {
        html += '<li><span class="mn">' + (i / 2 + 1) + ".</span>" +
          '<button type="button" data-ply="' + (i + 1) + '"' + (cur === i + 1 ? ' class="cur"' : "") + ">" + esc(G.sans[i]) + "</button>" +
          (G.sans[i + 1] != null ? '<button type="button" data-ply="' + (i + 2) + '"' + (cur === i + 2 ? ' class="cur"' : "") + ">" + esc(G.sans[i + 1]) + "</button>" : "<span></span>") + "</li>";
      }
      if (G.result) html += '<li class="res">' + (G.result.winner > 0 ? "1-0" : G.result.winner < 0 ? "0-1" : "½-½") + "</li>";
    }
    var keyM = html;
    if (movesEl.dataset.k !== keyM) {
      movesEl.innerHTML = html || '<li class="empty">Aucun coup pour l\'instant.</li>';
      movesEl.dataset.k = keyM;
      var c = $(".cur", movesEl);
      if (view == null) movesEl.scrollTop = movesEl.scrollHeight; else if (c) c.scrollIntoView({ block: "nearest" });
    }

    // actions
    var a = "";
    if (G) {
      if (G.mode === "bot") {
        a += btn("undo", "↶ Annuler", { disabled: !G.moves.length || (G.moves.length === 1 && G.human < 0) });
        a += btn("hint", hint && hint.busy ? "💡 …" : "💡 Indice", { disabled: !canMoveNow() });
        a += btn("flip", "⇅ Retourner");
        a += G.result ? btn("again", "▶ Rejouer", { cls: "btn-alt" }) : btn("resign", "🏳 Abandonner", { disabled: !G.moves.length });
        a += btn("menu", "☰ Menu");
      } else if (G.mode === "local") {
        a += btn("undo", "↶ Annuler", { disabled: !G.moves.length || !!G.result });
        a += btn("flip", "⇅ Retourner");
        if (!G.result) { a += btn("draw-local", "½ Nulle", { disabled: !G.moves.length }); a += btn("resign", "🏳 Abandon", { disabled: !G.moves.length, title: "Le camp qui a le trait abandonne" }); }
        else a += btn("again", "▶ Rejouer", { cls: "btn-alt" });
        a += btn("menu", "☰ Menu");
      } else if (G.mode === "online") {
        if (G.my && !G.result) {
          a += btn("draw", "½ Proposer nulle", { disabled: G.offerSent || G.moves.length < 2 });
          a += btn("resign", "🏳 Abandonner");
        }
        if (G.my && G.result) a += btn("rematch", NET.rematch[NET.id] ? "🔁 En attente…" : "🔁 Revanche", { cls: "btn-alt", disabled: !!NET.rematch[NET.id] || !opponentHere() });
        a += btn("flip", "⇅ Retourner");
        a += btn("leave", "☰ Quitter");
      }
      a += '<span class="chess-nav">' + btn("first", "«", { title: "Début" }) + btn("prev", "‹", { title: "Coup précédent" }) + btn("next", "›", { title: "Coup suivant" }) + btn("last", "»", { title: "Position actuelle" }) + "</span>";
    } else a = btn("menu", "☰ Menu", { cls: "" });
    actionsEl.innerHTML = a;
  }

  actionsEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"); if (!b || b.disabled) return;
    act(b.dataset.act);
  });
  offerEl.addEventListener("click", function (e) { var b = e.target.closest("[data-act]"); if (b) act(b.dataset.act); });
  if (roomEl) roomEl.addEventListener("click", function (e) { var b = e.target.closest("[data-act]"); if (b) act(b.dataset.act); });
  movesEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-ply]"); if (!b || !G) return;
    var p = +b.dataset.ply; setView(p >= G.snaps.length - 1 ? null : p);
  });
  function setView(v) {
    if (!G) return;
    if (v != null) { v = Math.max(0, Math.min(G.snaps.length - 1, v)); if (v === G.snaps.length - 1) v = null; }
    if (v === view) return;
    view = v; sel = -1; targets = [];
    render();
  }
  function act(a) {
    if (a === "flip") { flipped = !flipped; placeSquares(); lastRenderKey = ""; render(); return; }
    if (a === "first") return setView(0);
    if (a === "prev") return setView((view == null ? G.snaps.length - 1 : view) - 1);
    if (a === "next") return setView(view == null ? null : view + 1);
    if (a === "last") return setView(null);
    if (a === "menu") { showMenu(); return; }
    if (a === "copy") { copyLink(); return; }
    if (!G) return;
    if (a === "undo") return undo();
    if (a === "hint") return showHint();
    if (a === "again") {
      if (G.mode === "bot") return startBot(G.level, G.human);
      if (G.mode === "local") return startLocal(G.tc);
    }
    if (a === "resign") {
      if (G.result || needConfirm("resign")) return;
      if (G.mode === "bot") return endGame({ winner: -G.human, reason: "abandon" }, { instant: true });
      if (G.mode === "local") return endGame({ winner: -G.pos.side, reason: "abandon" }, { instant: true });
      if (G.mode === "online" && G.my) { netSend("resign", { gid: G.gid, by: NET.id }); return endGame({ winner: -G.my, reason: "abandon" }, { instant: true }); }
    }
    if (a === "draw-local") { if (G.result || needConfirm("draw-local")) return; return endGame({ winner: 0, reason: "accord" }, { instant: true }); }
    if (a === "draw" && G.mode === "online" && !G.result) {
      if (G.offer && G.offer !== NET.id) return act("draw-yes");
      G.offerSent = true; netSend("offer", { gid: G.gid, by: NET.id }); renderSide(); return;
    }
    if (a === "draw-yes" && G.mode === "online" && !G.result) { netSend("offer-ok", { gid: G.gid, by: NET.id }); return endGame({ winner: 0, reason: "accord" }, { instant: true }); }
    if (a === "draw-no" && G.mode === "online") { G.offer = null; netSend("offer-no", { gid: G.gid, by: NET.id }); renderSide(); return; }
    if (a === "rematch" && G.mode === "online") { NET.rematch[NET.id] = true; netSend("rematch", { gid: G.gid, by: NET.id }); maybeRematch(); renderSide(); return; }
    if (a === "leave") { if (!G.result && G.my && needConfirm("leave")) return; leaveOnline(); showMenu(); return; }
  }

  /* =====================================================================
     SOURIS / DOIGT
     ===================================================================== */
  function sqAt(x, y) {
    var r = boardEl.getBoundingClientRect();
    var c = Math.floor((x - r.left) / r.width * 8), w = Math.floor((y - r.top) / r.height * 8);
    if (c < 0 || c > 7 || w < 0 || w > 7) return -1;
    var f = flipped ? 7 - c : c, rk = flipped ? w : 7 - w;
    return rk * 16 + f;
  }
  function select(sq) {
    sel = sq;
    targets = G.legal.filter(function (m) { return C.from(m) === sq; }).map(C.to).filter(function (t, i, a) { return a.indexOf(t) === i; });
  }
  boardEl.addEventListener("pointerdown", function (e) {
    if (!G || e.button > 0) return;
    ac();
    if (view != null) { setView(null); return; }
    var sq = sqAt(e.clientX, e.clientY); if (sq < 0) return;
    if (!canMoveNow()) { if (G.mode === "online" && G.my && !G.result) { premoveMsg = "Attends ton tour."; renderSide(); setTimeout(function () { premoveMsg = ""; renderSide(); }, 1400); } return; }
    var pc = G.pos.b[sq], mine = pc && (pc > 0) === (G.pos.side > 0);
    if (sel >= 0 && targets.indexOf(sq) >= 0) { tryMove(sel, sq, true); return; }
    if (mine) {
      var was = sel === sq;
      select(sq); hint = null; render();
      var el = pieceLayer.querySelector('[data-sq="' + sq + '"]');
      if (el) {
        drag = { sq: sq, el: el, id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, was: was };
        try { boardEl.setPointerCapture(e.pointerId); } catch (err) {}
      }
      e.preventDefault();
    } else { sel = -1; targets = []; render(); }
  });
  boardEl.addEventListener("pointermove", function (e) {
    if (!drag || drag.id !== e.pointerId) return;
    if (!drag.moved && Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 5) return;
    drag.moved = true;
    var r = boardEl.getBoundingClientRect(), size = r.width / 8;
    drag.el.classList.add("drag");
    drag.el.style.transform = "translate(" + (e.clientX - r.left - size / 2) + "px," + (e.clientY - r.top - size / 2) + "px)";
    var over = sqAt(e.clientX, e.clientY);
    Object.keys(sqEls).forEach(function (k) { sqEls[k].classList.toggle("over", +k === over && targets.indexOf(over) >= 0); });
  });
  function endDrag(e, cancel) {
    if (!drag || drag.id !== e.pointerId) return;
    var d = drag; drag = null;
    Object.keys(sqEls).forEach(function (k) { sqEls[k].classList.remove("over"); });
    if (!d.moved) {
      if (d.was) { sel = -1; targets = []; render(); }
      return;
    }
    d.el.classList.remove("drag");
    var to = cancel ? -1 : sqAt(e.clientX, e.clientY);
    if (to >= 0 && to !== d.sq && targets.indexOf(to) >= 0 && G && canMoveNow()) {
      d.el.style.transform = pieceTransform(to);
      if (tryMove(d.sq, to, false)) return;
    }
    d.el.style.transform = pieceTransform(d.sq);
  }
  boardEl.addEventListener("pointerup", function (e) { endDrag(e, false); });
  boardEl.addEventListener("pointercancel", function (e) { endDrag(e, true); });
  boardEl.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  document.addEventListener("keydown", function (e) {
    if (!G || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || "") || !overlay.hidden) return;
    if (e.key === "ArrowLeft") { act("prev"); e.preventDefault(); }
    else if (e.key === "ArrowRight") { act("next"); e.preventDefault(); }
    else if (e.key === "Home") { act("first"); e.preventDefault(); }
    else if (e.key === "End") { act("last"); e.preventDefault(); }
    else if (e.key === "Escape") { if (sel >= 0) { sel = -1; targets = []; render(); } }
  });

  /* ---------- pendules ---------- */
  var lastLowBeep = 0;
  setInterval(function () {
    if (!G || !G.tc || G.result) return;
    updateClocks();
    if (!clockRunning()) return;
    var side = G.pos.side, rem = remaining(side);
    if (rem < 10000 && rem > 0 && controls(side) && now() - lastLowBeep > 1000 && Math.floor(rem / 1000) !== Math.floor((rem + 100) / 1000)) { lastLowBeep = now(); sfx("low"); }
    if (rem <= 0) {
      var i = side > 0 ? 0 : 1; G.clock[i] = 0;
      // perte au temps, sauf si l'adversaire ne peut plus mater
      var win = C.canMate(G.pos, -side) ? -side : 0;
      endGame({ winner: win, reason: "temps" });
    }
  }, 100);

  /* =====================================================================
     MENUS (carte au-dessus du plateau)
     ===================================================================== */
  var screen = "main", botCfg = load("chess-bot-cfg", { level: 3, color: "w" }), localTc = "none";
  var onlineCfg = load("chess-online-cfg", { tc: "10+0", color: "r" });
  function openOverlay(html, cls) { card.className = "panel game-card chess-card " + (cls || ""); card.innerHTML = html; overlay.hidden = false; }
  function closeOverlay() { overlay.hidden = true; }
  function seg(name, opts, cur) {
    return '<div class="chess-seg" role="radiogroup">' + opts.map(function (o) {
      return '<button type="button" role="radio" aria-checked="' + (o[0] === cur) + '" data-' + name + '="' + o[0] + '"' + (o[0] === cur ? ' class="on"' : "") + ">" + o[1] + "</button>";
    }).join("") + "</div>";
  }
  function showMenu(which) {
    screen = which || "main";
    promoEl.hidden = true;
    var h = "";
    if (screen === "main") {
      var sv = load("chess-bot-v1", null);
      h += '<h2>♞ Échecs</h2><p>Une partie contre un bot de la forêt, en ligne avec un ami grâce à un code, ou à deux sur cet écran.</p>';
      h += '<div class="chess-modes">';
      if (sv && !sv.over && sv.moves && sv.moves.length) h += '<button class="chess-mode resume" type="button" data-go="resume"><span class="cm-ic">▶</span><span><strong>Reprendre</strong><small>' + LV_ICON[sv.level - 1] + " " + esc(C.LEVELS[sv.level - 1].name) + " · coup " + Math.ceil(sv.moves.length / 2) + "</small></span></button>";
      h += '<button class="chess-mode" type="button" data-go="bot"><span class="cm-ic">🤖</span><span><strong>Contre un bot</strong><small>6 niveaux, du Gland au Grand Chêne</small></span></button>';
      h += '<button class="chess-mode" type="button" data-go="online"><span class="cm-ic">🌐</span><span><strong>En ligne</strong><small>Crée un salon et partage le code</small></span></button>';
      h += '<button class="chess-mode" type="button" data-go="local"><span class="cm-ic">👥</span><span><strong>À deux sur cet écran</strong><small>Chacun son tour, pendule en option</small></span></button>';
      h += "</div>";
      h += '<div class="chess-prefs"><label>Plateau ' + '<select data-theme-sel>' + Object.keys(themes).map(function (k) { return '<option value="' + k + '"' + (k === theme ? " selected" : "") + ">" + themes[k] + "</option>"; }).join("") + "</select></label>" +
        '<button type="button" class="link-btn" data-sound>' + (soundOn ? "🔊 Son activé" : "🔇 Son coupé") + "</button>" +
        (G ? '<button type="button" class="link-btn" data-close>Revenir à la partie</button>' : "") + "</div>";
    } else if (screen === "bot") {
      var s = stats();
      h += '<h2>Contre un bot</h2><p class="game-small">Choisis ton adversaire.</p><div class="chess-levels">';
      C.LEVELS.forEach(function (L, i) {
        var st = s.lv[L.id] || { w: 0, d: 0, l: 0 };
        h += '<button type="button" class="chess-level' + (botCfg.level === L.id ? " on" : "") + '" data-level="' + L.id + '" aria-pressed="' + (botCfg.level === L.id) + '">' +
          '<span class="lv-ic">' + LV_ICON[i] + '</span><strong>' + esc(L.name) + "</strong><em>" + esc(L.tag) + "</em><small>" + L.elo + "</small>" +
          (st.w + st.d + st.l ? '<small class="lv-rec">' + st.w + " V · " + st.d + " N · " + st.l + " D</small>" : "") + "</button>";
      });
      h += "</div><p class=\"chess-label\">Tu joues</p>" + seg("color", [["w", pieceIcon(6, 1) + " Blancs"], ["r", "🎲 Au hasard"], ["b", pieceIcon(6, -1) + " Noirs"]], botCfg.color);
      h += '<div class="btn-row center"><button class="btn btn-ghost" type="button" data-go="main">← Retour</button><button class="btn" type="button" data-go="play-bot">▶ Jouer</button></div>';
    } else if (screen === "local") {
      h += '<h2>À deux sur cet écran</h2><p class="game-small">Les Blancs commencent. Le plateau reste dans le même sens (bouton ⇅ pour le retourner).</p><p class="chess-label">Pendule</p>' +
        seg("tc", TCS.map(function (t) { return [t.id, t.label]; }), localTc);
      h += '<div class="btn-row center"><button class="btn btn-ghost" type="button" data-go="main">← Retour</button><button class="btn" type="button" data-go="play-local">▶ Jouer</button></div>';
    } else if (screen === "online") {
      var so = stats().on || { w: 0, d: 0, l: 0 };
      h += "<h2>En ligne</h2>" + (NET.err ? '<p class="chess-err">' + esc(NET.err) + "</p>" : "");
      h += '<label class="chess-field">Ton pseudo <input type="text" maxlength="16" data-name value="' + esc(myName) + '" placeholder="Écureuil" autocomplete="nickname"></label>';
      h += '<div class="chess-online"><div class="chess-box"><h3>Créer un salon</h3><p class="chess-label">Cadence</p>' + seg("otc", TCS.map(function (t) { return [t.id, t.label]; }), onlineCfg.tc) +
        '<p class="chess-label">Tu joues</p>' + seg("ocolor", [["w", "Blancs"], ["r", "🎲 Hasard"], ["b", "Noirs"]], onlineCfg.color) +
        '<button class="btn" type="button" data-go="create">Créer et obtenir un code</button></div>';
      h += '<div class="chess-box"><h3>Rejoindre</h3><p class="game-small">Entre le code de 4 lettres donné par ton ami.</p><div class="submit-row"><input type="text" maxlength="4" data-join-code placeholder="ABCD" autocapitalize="characters" autocomplete="off" spellcheck="false" aria-label="Code du salon"><button class="btn btn-alt" type="button" data-go="join">Rejoindre</button></div></div></div>';
      if (so.w + so.d + so.l) h += '<p class="game-small">En ligne : ' + so.w + " victoire" + (so.w > 1 ? "s" : "") + " · " + so.d + " nulle" + (so.d > 1 ? "s" : "") + " · " + so.l + " défaite" + (so.l > 1 ? "s" : "") + "</p>";
      h += '<div class="btn-row center"><button class="btn btn-ghost" type="button" data-go="main">← Retour</button></div>';
    } else if (screen === "lobby") {
      var link = location.href.split("#")[0] + "#salon=" + NET.code;
      h += "<h2>Salon créé</h2><p>Donne ce code à ton adversaire :</p><p class=\"chess-code\">" + esc(NET.code || "····") + "</p>";
      h += '<div class="btn-row center"><button class="btn btn-alt btn-small" type="button" data-act-copy>📋 Copier le lien</button>' + (navigator.share ? '<button class="btn btn-ghost btn-small" type="button" data-share>Partager…</button>' : "") + "</div>";
      h += '<p class="game-small chess-link">' + esc(link) + "</p>";
      h += '<p class="chess-wait">' + (NET.err ? '<span class="chess-err">' + esc(NET.err) + "</span>" : NET.status === "SUBSCRIBED" ? "⏳ En attente d'un adversaire…" : "Connexion au serveur…") + "</p>";
      h += '<p class="game-small">' + esc(tcLabel(tcById(onlineCfg.tc).tc)) + " · " + (onlineCfg.color === "w" ? "tu as les Blancs" : onlineCfg.color === "b" ? "tu as les Noirs" : "couleurs au hasard") + "</p>";
      h += '<div class="btn-row center"><button class="btn btn-ghost" type="button" data-go="cancel-online">Annuler</button></div>';
    } else if (screen === "joining") {
      h += "<h2>Salon " + esc(NET.code || "") + "</h2>";
      h += '<p class="chess-wait">' + (NET.err ? '<span class="chess-err">' + esc(NET.err) + "</span>" : NET.status === "SUBSCRIBED" ? "⏳ Connecté, en attente de l'hôte…" : "Connexion au salon…") + "</p>";
      if (!myName) h += '<label class="chess-field">Ton pseudo <input type="text" maxlength="16" data-name value="" placeholder="Écureuil" autocomplete="nickname"></label>';
      h += '<div class="btn-row center"><button class="btn btn-ghost" type="button" data-go="cancel-online">Annuler</button></div>';
    }
    openOverlay(h, "chess-card-" + screen);
  }
  function showEnd() {
    if (!G || !G.result) return;
    var mr = myResult(), w = G.result.winner, h = "";
    var title = mr > 0 ? "🎉 Victoire !" : mr < 0 ? "Défaite" : mr === 0 ? "Nulle" : w === 0 ? "Nulle" : w > 0 ? "Les Blancs gagnent" : "Les Noirs gagnent";
    h += '<h2 class="chess-end ' + (mr > 0 ? "win" : mr < 0 ? "lose" : "") + '">' + title + "</h2>";
    h += "<p>" + esc(REASON[G.result.reason] || G.result.reason) + " · " + Math.ceil(G.moves.length / 2) + " coup" + (G.moves.length > 2 ? "s" : "") + "</p>";
    if (G.mode === "bot") {
      var L = C.LEVELS[G.level - 1];
      if (mr > 0 && G.level < 6) h += '<p class="game-small">Bravo ! Prêt pour ' + LV_ICON[G.level] + " " + esc(C.LEVELS[G.level].name) + " ?</p>";
      else h += '<p class="game-small">Contre ' + LV_ICON[G.level - 1] + " " + esc(L.name) + " (" + esc(L.tag) + ")</p>";
      h += '<div class="btn-row center">' + (mr > 0 && G.level < 6 ? '<button class="btn" type="button" data-go="next-level">Niveau suivant →</button>' : "") +
        '<button class="btn ' + (mr > 0 && G.level < 6 ? "btn-alt" : "") + '" type="button" data-go="again">▶ Rejouer</button><button class="btn btn-ghost" type="button" data-close>Revoir la partie</button><button class="btn btn-ghost" type="button" data-go="main">Menu</button></div>';
    } else if (G.mode === "local") {
      h += '<div class="btn-row center"><button class="btn" type="button" data-go="again">▶ Rejouer</button><button class="btn btn-ghost" type="button" data-close>Revoir la partie</button><button class="btn btn-ghost" type="button" data-go="main">Menu</button></div>';
    } else {
      h += '<div class="btn-row center">' + (G.my ? '<button class="btn" type="button" data-go="rematch"' + (NET.rematch[NET.id] || !opponentHere() ? " disabled" : "") + ">" + (NET.rematch[NET.id] ? "🔁 En attente…" : "🔁 Revanche") + "</button>" : "") +
        '<button class="btn btn-ghost" type="button" data-close>Revoir la partie</button><button class="btn btn-ghost" type="button" data-go="leave">Quitter le salon</button></div>';
      if (G.my && NET.rematch[otherId()] && !NET.rematch[NET.id]) h += '<p class="game-small">🔁 Ton adversaire veut une revanche !</p>';
      if (G.my && !opponentHere()) h += '<p class="game-small">Ton adversaire a quitté le salon.</p>';
    }
    screen = "end";
    openOverlay(h, "chess-card-end");
  }

  card.addEventListener("click", function (e) {
    var t = e.target;
    var lv = t.closest("[data-level]");
    if (lv) { botCfg.level = +lv.dataset.level; save("chess-bot-cfg", botCfg); $$("[data-level]", card).forEach(function (b) { b.classList.toggle("on", b === lv); b.setAttribute("aria-pressed", b === lv); }); return; }
    var sg = t.closest("[data-color],[data-tc],[data-otc],[data-ocolor]");
    if (sg) {
      var k = sg.dataset.color != null ? "color" : sg.dataset.tc != null ? "tc" : sg.dataset.otc != null ? "otc" : "ocolor", v = sg.dataset[k];
      if (k === "color") { botCfg.color = v; save("chess-bot-cfg", botCfg); }
      if (k === "tc") localTc = v;
      if (k === "otc") { onlineCfg.tc = v; save("chess-online-cfg", onlineCfg); }
      if (k === "ocolor") { onlineCfg.color = v; save("chess-online-cfg", onlineCfg); }
      $$("[data-" + k + "]", card).forEach(function (b) { var on = b.dataset[k] === v; b.classList.toggle("on", on); b.setAttribute("aria-checked", on); });
      return;
    }
    if (t.closest("[data-close]")) { closeOverlay(); return; }
    if (t.closest("[data-sound]")) { soundOn = !soundOn; save("chess-sound", soundOn); if (soundOn) sfx("move"); showMenu("main"); return; }
    if (t.closest("[data-act-copy]")) { copyLink(); return; }
    if (t.closest("[data-share]")) { try { navigator.share({ title: "Échecs", text: "Viens jouer aux échecs avec moi ! Code : " + NET.code, url: location.href.split("#")[0] + "#salon=" + NET.code }); } catch (err) {} return; }
    var go = t.closest("[data-go]"); if (!go || go.disabled) return;
    var g = go.dataset.go;
    ac();
    if (g === "main" || g === "bot" || g === "local" || g === "online") { if (g === "online") NET.err = ""; showMenu(g); }
    else if (g === "resume") { var sv = load("chess-bot-v1", null); if (sv) startBot(sv.level, sv.human, sv.moves); }
    else if (g === "play-bot") { var hu = botCfg.color === "w" ? 1 : botCfg.color === "b" ? -1 : (Math.random() < 0.5 ? 1 : -1); startBot(botCfg.level, hu); }
    else if (g === "play-local") startLocal(tcById(localTc).tc);
    else if (g === "again") act("again");
    else if (g === "next-level") { botCfg.level = Math.min(6, G.level + 1); save("chess-bot-cfg", botCfg); startBot(botCfg.level, G.human); }
    else if (g === "create") { readName(); netCreate(); }
    else if (g === "join") { readName(); var code = ($("[data-join-code]", card).value || "").toUpperCase().replace(/[^A-Z]/g, ""); if (code.length !== 4) { NET.err = "Le code fait 4 lettres."; showMenu("online"); return; } netJoin(code, false); }
    else if (g === "cancel-online") { leaveOnline(); showMenu("online"); }
    else if (g === "rematch") { act("rematch"); showEnd(); }
    else if (g === "leave") { leaveOnline(); showMenu("main"); }
  });
  card.addEventListener("change", function (e) {
    if (e.target.matches("[data-theme-sel]")) { theme = e.target.value; root.dataset.boardTheme = theme; save("chess-theme", theme); }
  });
  card.addEventListener("input", function (e) {
    if (e.target.matches("[data-join-code]")) e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
    if (e.target.matches("[data-name]")) { readName(); if (NET.ch) trackMe(); }
  });
  card.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.matches("[data-join-code]")) { var b = $('[data-go="join"]', card); if (b) b.click(); }
  });
  function readName() { var i = $("[data-name]", card); if (i) { myName = i.value.trim().slice(0, 16); save("chess-name", myName); } }
  function copyLink() {
    if (!NET.code) return;
    var link = location.href.split("#")[0] + "#salon=" + NET.code;
    var done = function () { premoveMsg = "Lien copié !"; renderSide(); var b = $("[data-act-copy]", card); if (b) b.textContent = "✅ Lien copié"; setTimeout(function () { premoveMsg = ""; renderSide(); }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(done, function () { prompt("Copie ce lien :", link); });
    else prompt("Copie ce lien :", link);
  }

  /* =====================================================================
     EN LIGNE (Supabase Realtime)
     ===================================================================== */
  var CODE_CH = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  var NET = { id: sget("chess-net-id"), client: null, ch: null, code: null, role: null, roster: [], status: "", err: "", rematch: {}, cfg: null };
  if (!NET.id) { NET.id = Math.random().toString(36).slice(2, 10); sset("chess-net-id", NET.id); }
  var EVENTS = ["state", "sync", "mv", "resign", "offer", "offer-ok", "offer-no", "rematch", "bye", "emo"];
  function netSend(ev, payload) { if (NET.ch) { try { NET.ch.send({ type: "broadcast", event: ev, payload: payload }); } catch (e) {} } }
  function sbClient() {
    if (NET.client) return NET.client;
    var c = (window.SITE || {}).supabase;
    if (!window.supabase || !window.supabase.createClient || !c) return null;
    NET.client = window.supabase.createClient(c.url, c.key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 20 } } });
    return NET.client;
  }
  function newCode() { var s = ""; for (var i = 0; i < 4; i++) s += CODE_CH.charAt((Math.random() * CODE_CH.length) | 0); return s; }
  function netCreate() {
    var code = newCode();
    var cfg = { tc: onlineCfg.tc, color: onlineCfg.color };
    sset("chess-host-" + code, JSON.stringify(cfg));
    netJoin(code, true, cfg);
  }
  function netJoin(code, asHost, cfg, restored) {
    var cl = sbClient();
    if (!cl) { NET.err = "Le jeu en ligne est indisponible (connexion au serveur impossible)."; showMenu("online"); return; }
    leaveOnline(true);
    if (G && G.mode === "bot") { botId++; botBusy = false; }
    NET.code = code; NET.role = asHost ? "host" : "guest"; NET.cfg = cfg || null; NET.restored = !!restored; NET.status = "connexion"; NET.err = ""; NET.roster = []; NET.rematch = {}; NET.ts = now();
    var ch = cl.channel("chess-room-" + code, { config: { broadcast: { self: false, ack: false }, presence: { key: NET.id } } });
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
    if (window.Party && window.Party.emoteBridge) window.Party.emoteBridge({ send: function (i, n, c) { netSend("emo", { n: myName || n, i: i, c: c }); } });   // émotes (😀 / T)
    if (history.replaceState && !party) history.replaceState(null, "", "#salon=" + code);
    showMenu(asHost ? "lobby" : "joining");
  }
  function refreshLobby() { if (!overlay.hidden && (screen === "lobby" || screen === "joining")) showMenu(screen); }
  function leaveOnline(silent) {
    if (NET.ch && window.Party && window.Party.emoteBridgeOff) window.Party.emoteBridgeOff();
    if (NET.ch) {
      if (!silent) netSend("bye", { from: NET.id });
      try { NET.ch.untrack(); } catch (e) {}
      try { NET.client.removeChannel(NET.ch); } catch (e) {}
    }
    if (NET.startT) { clearTimeout(NET.startT); NET.startT = 0; }
    NET.ch = null; NET.code = null; NET.role = null; NET.roster = []; NET.rematch = {};
    if (G && G.mode === "online") { G = null; render(); }
    if (location.hash.indexOf("salon=") >= 0 && history.replaceState) history.replaceState(null, "", location.pathname + location.search);
  }
  function trackMe() { if (NET.ch) try { NET.ch.track({ id: NET.id, name: myName || "Écureuil", host: NET.role === "host", ts: NET.ts, v: VERSION }); } catch (e) {} }
  function otherId() { if (!G || !G.ids) return null; return G.ids[0] === NET.id ? G.ids[1] : G.ids[0]; }
  function opponentHere() { var o = otherId(); return !!o && NET.roster.some(function (x) { return x.id === o; }); }
  function onPresence() {
    if (!NET.ch) return;
    var st = NET.ch.presenceState(), list = [];
    Object.keys(st).forEach(function (k) { if (st[k] && st[k][0]) list.push(st[k][0]); });
    list.sort(function (a, b) { return (b.host ? 1 : 0) - (a.host ? 1 : 0) || a.ts - b.ts; });
    var hadOpp = G && G.mode === "online" && opponentHere();
    NET.roster = list;
    // l'hôte lance la partie dès qu'un adversaire arrive
    if (NET.role === "host" && (!G || G.mode !== "online")) {
      var other = list.filter(function (x) { return x.id !== NET.id; })[0];
      // hôte revenu après un rechargement : on attend d'abord que l'adversaire renvoie la partie en cours
      if (other && !NET.startT) NET.startT = setTimeout(function () {
        NET.startT = 0;
        if (!NET.ch || NET.role !== "host" || (G && G.mode === "online")) return;
        var o = NET.roster.filter(function (x) { return x.id !== NET.id; })[0];
        if (o) hostStart(o, false);
      }, NET.restored ? 1800 : 150);
    }
    if (G && G.mode === "online") {
      var nowOpp = opponentHere();
      if (hadOpp && !nowOpp && G.my) sfx("notify");
      if (!hadOpp && nowOpp) netSend("state", stateOf());   // il revient : on le resynchronise
      // les pseudos peuvent changer
      list.forEach(function (x) { if (G.ids && G.ids.indexOf(x.id) >= 0) G.names[String(x.id === G.white ? 1 : -1)] = x.name || "Écureuil"; });
      render();
      if (!overlay.hidden && screen === "end") showEnd();
    }
    refreshLobby();
  }
  function hostStart(other, rematch) {
    var cfg = NET.cfg || { tc: "10+0", color: "r" }, tc = tcById(cfg.tc).tc, white;
    if (rematch && G && G.white) white = G.white === NET.id ? other.id : NET.id;   // revanche : on échange les couleurs
    else white = cfg.color === "w" ? NET.id : cfg.color === "b" ? other.id : (Math.random() < 0.5 ? NET.id : other.id);
    var names = {}; names[NET.id] = myName || "Écureuil"; names[other.id] = other.name || "Écureuil";
    var st = { gid: Math.random().toString(36).slice(2, 10), ts: now(), ids: [NET.id, other.id], white: white, names: names, tc: tc, moves: [], clock: tc ? [tc.base, tc.base] : null, result: null };
    NET.rematch = {};
    adoptState(st);
    netSend("state", st);
  }
  function stateOf() {
    var names = {};
    if (G.ids) { names[G.white] = G.names["1"]; names[G.ids[0] === G.white ? G.ids[1] : G.ids[0]] = G.names["-1"]; }
    var clock = null;
    if (G.clock) { clock = [remaining(1), remaining(-1)]; }
    return { gid: G.gid, ts: G.ts, ids: G.ids, white: G.white, names: names, tc: G.tc, moves: G.moves.slice(), clock: clock, result: G.result };
  }
  function adoptState(st) {
    var my = st.white === NET.id ? 1 : (st.ids || []).indexOf(NET.id) >= 0 ? -1 : 0;
    var blackId = st.ids[0] === st.white ? st.ids[1] : st.ids[0];
    var names = { "1": (st.names && st.names[st.white]) || "Blancs", "-1": (st.names && st.names[blackId]) || "Noirs" };
    var fresh = !G || G.mode !== "online" || G.gid !== st.gid;
    G = newGame({ mode: "online", tc: st.tc, names: names, gid: st.gid, ts: st.ts, ids: st.ids, white: st.white, my: my });
    replayInto(G, st.moves || []);
    if (st.clock) G.clock = st.clock.slice();
    G.turnStart = now();
    if (st.result) { G.result = st.result; G.recorded = true; }
    if (fresh) { flipped = my === -1; placeSquares(); lastRenderKey = ""; sel = -1; targets = []; view = null; NET.rematch = {}; if (!st.result) sfx("start"); }
    closeOverlay();
    render();
  }
  function maybeRematch() {
    if (NET.role !== "host" || !G || !G.result) return;
    var o = otherId();
    if (NET.rematch[NET.id] && NET.rematch[o]) {
      var other = NET.roster.filter(function (x) { return x.id === o; })[0] || { id: o, name: G.names[String(G.white === o ? 1 : -1)] };
      hostStart(other, true);
    }
  }
  function onNet(ev, d) {
    if (ev === "emo") { if (window.Party) window.Party.emoteFrom(d.n, d.i, d.c); return; }
    if (ev === "sync") { if (G && G.mode === "online" && G.gid) netSend("state", stateOf()); return; }
    if (ev === "state") {
      if (!d.gid || !d.ids) return;
      var take = !G || G.mode !== "online" || (G.gid !== d.gid && d.ts >= (G.ts || 0)) ||
        (G.gid === d.gid && ((d.moves || []).length > G.moves.length || (d.result && !G.result)));
      if (take) {
        var sameGame = G && G.mode === "online" && G.gid === d.gid;
        var wasOver = sameGame && G.result;
        adoptState(d);
        if (sameGame && d.result && !wasOver) { G.result = null; G.recorded = false; endGame(d.result, { remote: true }); }
      }
      return;
    }
    if (!G || G.mode !== "online" || d.gid !== G.gid) return;
    if (ev === "mv") {
      if (G.result) return;
      if (d.n === G.moves.length) {
        var m = C.findUCI(G.pos, d.uci, G.legal);
        if (m) commit(m, { remote: true, clock: d.clock });
        else netSend("sync", { from: NET.id });
      } else if (d.n > G.moves.length) netSend("sync", { from: NET.id });
    } else if (ev === "resign") {
      var side = d.by === G.white ? 1 : -1;
      endGame({ winner: -side, reason: "abandon" }, { remote: true });
    } else if (ev === "offer") { G.offer = d.by; sfx("notify"); renderSide(); }
    else if (ev === "offer-ok") { if (G.offerSent) endGame({ winner: 0, reason: "accord" }, { remote: true, instant: true }); }
    else if (ev === "offer-no") { G.offerSent = false; premoveMsg = "Nulle refusée."; renderSide(); setTimeout(function () { premoveMsg = ""; renderSide(); }, 2500); }
    else if (ev === "rematch") { NET.rematch[d.by] = true; sfx("notify"); maybeRematch(); renderSide(); if (!overlay.hidden && card.classList.contains("chess-card-end")) showEnd(); }
    else if (ev === "bye") { /* la présence s'en charge */ }
  }

  /* =====================================================================
     PARTY (versus multi-jeux, js/party.js)
       opts.kind "net" : partie en ligne, salon créé / rejoint tout seul
       opts.kind "bot" : chacun contre le même bot, le premier qui gagne
     Victoire = 2, nulle = 1, défaite = 0. Temps écoulé sans résultat : nulle.
     ===================================================================== */
  var party = null;
  var PT = window.Party && window.Party.pending && window.Party.pending();
  if (PT && PT.mode.game !== "chess") PT = null;
  if (PT) {
    window.Party.register("chess", {
      start: function (ctx) {
        party = { ctx: ctx, ended: false };
        myName = ctx.name;
        if (ctx.opts.kind === "bot") { startBot(ctx.opts.level || 3, 1); return; }
        netJoin(ctx.room, ctx.roomHost, ctx.roomHost ? { tc: ctx.opts.tc || "5+0", color: "r" } : null);
      },
      stop: function () {
        if (!party || party.ended) return null;
        party.ended = true;
        if (G && !G.result) { botId++; botBusy = false; G.result = { winner: 0, reason: "temps" }; G.recorded = true; render(); }
        var mr = myResult();
        return { score: mr == null ? 1 : mr > 0 ? 2 : mr === 0 ? 1 : 0 };
      },
    });
  }

  /* =====================================================================
     DÉMARRAGE
     ===================================================================== */
  var headMenu = document.querySelector("[data-chess-menu]");
  if (headMenu) headMenu.addEventListener("click", function () { showMenu("main"); });
  placeSquares();
  render();
  var hm = PT ? null : /salon=([A-Za-z]{4})/.exec(location.hash);
  if (PT) openOverlay("<h2>Manche de party</h2><p>" + esc(PT.mode.name) + " : la partie démarre toute seule dans un instant.</p>");
  else if (hm) {
    var code = hm[1].toUpperCase(), cfgS = sget("chess-host-" + code), cfg = null;
    try { cfg = cfgS ? JSON.parse(cfgS) : null; } catch (e) { cfg = null; }
    if (cfg) onlineCfg = { tc: cfg.tc, color: cfg.color };
    netJoin(code, !!cfg, cfg, true);
  } else showMenu("main");
  window.addEventListener("hashchange", function () {
    var m = /salon=([A-Za-z]{4})/.exec(location.hash);
    if (m && !party && m[1].toUpperCase() !== NET.code) netJoin(m[1].toUpperCase(), false);
  });
  window.addEventListener("beforeunload", function () { if (NET.ch) try { NET.ch.untrack(); } catch (e) {} });
  if (/[?&]debug/.test(location.search)) window.CHESS_DEBUG = { G: function () { return G; }, NET: NET, C: C, fen: function () { return G && C.toFEN(G.pos); } };
})();
