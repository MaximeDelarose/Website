/* =========================================================================
   BILLARD (8-ball, vue de dessus) — v1.0.0
   - Physique maison à pas fixe (billes, bandes, 6 poches), sans trigonométrie
     dans la simulation (résultats identiques d'un navigateur à l'autre).
   - À deux sur le même écran, ou en ligne : salon à code de 4 lettres
     (Supabase Realtime, canal « billard-room-CODE », lien billard.html#salon=CODE).
     Celui qui tire fait foi : il envoie son tir (chacun le rejoue pour
     l'animation), puis l'état final de la table, que tout le monde adopte.
   Réglages de la physique en haut de fichier (FC, FK, E_BALL, E_CUSH…).
   ========================================================================= */
(function () {
  "use strict";
  var VERSION = "1.0.0";

  /* ---------- table et physique ---------- */
  var W = 1000, H = 500, R = 12, FRAME = 40;
  var DT = 1 / 480;                      // pas de simulation
  var FC = 260, FK = 0.45;               // frottement : constant (u/s²) + proportionnel (1/s)
  var VMIN = 8;                          // en dessous, la bille s'arrête
  var E_BALL = 0.95, E_CUSH = 0.78;      // rebonds bille/bille, bille/bande
  var VMAX = 2200;
  var HEAD_X = W * 0.25;                 // ligne de départ de la blanche
  var APEX = { x: W * 0.72, y: H / 2 };  // pointe du triangle
  var POCKETS = [
    { x: -6, y: -6, r: 28 }, { x: W / 2, y: -10, r: 26 }, { x: W + 6, y: -6, r: 28 },
    { x: -6, y: H + 6, r: 28 }, { x: W / 2, y: H + 10, r: 26 }, { x: W + 6, y: H + 6, r: 28 }
  ];
  var COLORS = ["#f4f1e8", "#f2c21b", "#1f4fd1", "#d62b2b", "#6b2fa3", "#f27a14", "#1c8c3e", "#7b1f26", "#141414"];
  function colorOf(n) { return COLORS[n > 8 ? n - 8 : n]; }
  function groupOf(n) { return n === 8 ? 2 : n < 8 ? 0 : 1; }   // 0 pleines, 1 rayées, 2 noire

  /* ---------- petits outils ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function lget(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function lset(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function now() { return Date.now(); }
  function rnd(n) { return Math.floor(Math.random() * n); }

  var root = $("[data-pool]");
  if (!root) return;
  var stage = $("[data-stage]", root), canvas = $("[data-canvas]", root), ctx = canvas.getContext("2d");
  var overlay = $("[data-overlay]", root), card = $("[data-card]", root);
  var elPlayers = $("[data-players]", root), elStatus = $("[data-status]", root), elPot = $("[data-pot]", root);
  var elShoot = $("[data-shoot]", root), elPower = $("[data-power]", root), elPowerOut = $("[data-power-out]", root);
  var elActions = $("[data-actions]", root), elSide = $(".pool-side", root);

  /* ---------- état ---------- */
  var myName = String(lget("billard-name", "") || "").slice(0, 16);
  var G = null;                          // partie en cours (voir newGame)
  var NET = { id: sget("billard-net-id"), client: null, ch: null, code: null, role: null, roster: [], status: "", err: "", rematch: {}, cfg: null };
  if (!NET.id) { NET.id = Math.random().toString(36).slice(2, 10); sset("billard-net-id", NET.id); }
  var screen = "home";
  var aim = { x: 1, y: 0 };              // direction de visée (vecteur unitaire)
  var power = 55;
  var run = null;                        // tir en cours : { acc, track, mine, pending, doneAt }
  var remoteAim = null;                  // visée de l'adversaire (reçue)
  var dragCue = false, lastAimSent = 0, lastAimKey = "";
  var rot = false, scale = 1, CW = 0, CH = 0;

  /* =====================================================================
     PARTIE
     ===================================================================== */
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function rackBalls() {
    var solids = shuffle([1, 2, 3, 4, 5, 6, 7]), stripes = shuffle([9, 10, 11, 12, 13, 14, 15]);
    var slot = new Array(15);
    slot[4] = 8;                                   // la noire au centre
    slot[10] = solids.pop(); slot[14] = stripes.pop();   // coins du fond : une pleine, une rayée
    if (Math.random() < 0.5) { var t = slot[10]; slot[10] = slot[14]; slot[14] = t; }
    var rest = shuffle(solids.concat(stripes));
    for (var i = 0; i < 15; i++) if (slot[i] == null) slot[i] = rest.pop();
    var B = [{ x: HEAD_X, y: H / 2, vx: 0, vy: 0, in: true }], k = 0, dx = R * 1.7320508 + 0.3;
    for (var row = 0; row < 5; row++) for (var j = 0; j <= row; j++) {
      B[slot[k]] = { x: APEX.x + row * dx, y: H / 2 + (j - row / 2) * (2 * R + 0.3), vx: 0, vy: 0, in: true };
      k++;
    }
    return B;
  }
  function newGame(names, ids, breaker, local) {
    return { gid: Math.random().toString(36).slice(2, 10), ids: ids || null, names: names, local: !!local, balls: rackBalls(),
      turn: breaker, breaker: breaker, groups: [null, null], hand: true, bd: false, over: null, msg: "", n: 0 };
  }
  function myIdx() {
    if (!G) return -1;
    if (G.local) return G.turn;
    return G.ids ? G.ids.indexOf(NET.id) : -1;
  }
  function isMyTurn() { return !!G && !G.over && !run && myIdx() === G.turn; }
  function ballsLeft(grp) { var c = 0; for (var i = 1; i < 16; i++) if (G.balls[i].in && groupOf(i) === grp) c++; return c; }
  function validSpot(x, y, ignore) {
    if (x < R || x > W - R || y < R || y > H - R) return false;
    if (!G.bd && x > HEAD_X) return false;
    for (var i = 1; i < 16; i++) { var b = G.balls[i]; if (!b.in || i === ignore) continue; var dx = b.x - x, dy = b.y - y; if (dx * dx + dy * dy < (2 * R + 0.5) * (2 * R + 0.5)) return false; }
    return true;
  }
  function freeSpot(x0, y0, ignore) {
    if (validSpot(x0, y0, ignore)) return { x: x0, y: y0 };
    for (var r = 6; r < 700; r += 6) for (var a = 0; a < 24; a++) {
      var x = x0 + r * Math.cos(a * 0.2618), y = y0 + r * Math.sin(a * 0.2618);
      if (validSpot(x, y, ignore)) return { x: x, y: y };
    }
    return { x: x0, y: y0 };
  }
  function lookAtRack() { var c = G.balls[0], dx = APEX.x - c.x, dy = APEX.y - c.y, l = Math.sqrt(dx * dx + dy * dy) || 1; aim.x = dx / l; aim.y = dy / l; }

  /* =====================================================================
     SIMULATION (pas fixe, déterministe : pas de sin/cos)
     ===================================================================== */
  function newTrack() { return { first: -1, rail: false, pk: [], snd: [] }; }
  function nearPocket(b, extra) {
    for (var i = 0; i < 6; i++) { var p = POCKETS[i], dx = b.x - p.x, dy = b.y - p.y; if (dx * dx + dy * dy < (p.r + extra) * (p.r + extra)) return i; }
    return -1;
  }
  function step(T) {
    var B = G.balls, i, j, b, sp;
    for (i = 0; i < 16; i++) {
      b = B[i];
      if (!b.in || (b.vx === 0 && b.vy === 0)) continue;
      b.x += b.vx * DT; b.y += b.vy * DT;
      sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      var ns = sp - (FC + FK * sp) * DT;
      if (ns < VMIN) { b.vx = 0; b.vy = 0; } else { var f = ns / sp; b.vx *= f; b.vy *= f; }
      // poches
      if (nearPocket(b, 0) >= 0) { b.in = false; b.vx = 0; b.vy = 0; T.pk.push(i); T.snd.push(["pocket", sp]); continue; }
      // bandes (sauf devant une poche)
      if (nearPocket(b, 2) < 0) {
        var hit = 0;
        if (b.x < R) { b.x = R; if (b.vx < 0) { b.vx = -b.vx * E_CUSH; b.vy *= 0.985; hit = 1; } }
        else if (b.x > W - R) { b.x = W - R; if (b.vx > 0) { b.vx = -b.vx * E_CUSH; b.vy *= 0.985; hit = 1; } }
        if (b.y < R) { b.y = R; if (b.vy < 0) { b.vy = -b.vy * E_CUSH; b.vx *= 0.985; hit = 1; } }
        else if (b.y > H - R) { b.y = H - R; if (b.vy > 0) { b.vy = -b.vy * E_CUSH; b.vx *= 0.985; hit = 1; } }
        if (hit) { if (T.first >= 0) T.rail = true; T.snd.push(["rail", sp]); }
      }
    }
    for (i = 0; i < 16; i++) {
      var a = B[i]; if (!a.in) continue;
      for (j = i + 1; j < 16; j++) {
        b = B[j]; if (!b.in) continue;
        if (a.vx === 0 && a.vy === 0 && b.vx === 0 && b.vy === 0) continue;
        var dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
        if (d2 >= 4 * R * R || d2 === 0) continue;
        var d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = (2 * R - d) / 2;
        a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
        var rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (rel > 0) {
          var jm = (1 + E_BALL) / 2 * rel;
          a.vx -= jm * nx; a.vy -= jm * ny; b.vx += jm * nx; b.vy += jm * ny;
          if (T.first < 0 && (i === 0 || j === 0)) T.first = i === 0 ? j : i;
          T.snd.push(["ball", rel]);
        }
      }
    }
  }
  function moving() { for (var i = 0; i < 16; i++) { var b = G.balls[i]; if (b.in && (b.vx !== 0 || b.vy !== 0)) return true; } return false; }

  /* tir : le tireur (ou un spectateur qui rejoue) lance la simulation */
  function launch(cx, cy, dx, dy, speed, mine) {
    var c = G.balls[0];
    c.in = true; c.x = cx; c.y = cy; c.vx = dx * speed; c.vy = dy * speed;
    var pre = {};
    if (mine) pre = { left: G.turn >= 0 ? ballsLeft(G.groups[G.turn]) : 0 };
    run = { acc: 0, track: newTrack(), mine: mine, pending: null, doneAt: 0, pre: pre, asked: false };
    remoteAim = null;
    sfx("cue", speed / VMAX);
    render();
  }
  function shoot() {
    if (!isMyTurn()) return;
    var c = G.balls[0], speed = Math.min(VMAX, 120 + 2080 * Math.pow(power / 100, 1.4));
    var msg = { gid: G.gid, n: G.n, cx: round2(c.x), cy: round2(c.y), dx: aim.x, dy: aim.y, v: speed };
    if (G.hand) G.hand = false;
    if (!G.local) netSend("shot", msg);
    launch(msg.cx, msg.cy, aim.x, aim.y, speed, true);
  }
  function round2(v) { return Math.round(v * 100) / 100; }

  /* règles : appelé par le tireur quand tout est arrêté */
  function evaluate(T, preLeft) {
    var me = G.turn, opp = 1 - me, pk = T.pk, nm = G.names, msg = "";
    var scratch = pk.indexOf(0) >= 0, foul = false, why = "";
    var pots = pk.filter(function (n) { return n !== 0; });
    var myGroup = G.groups[me];
    if (scratch) { foul = true; why = "blanche empochée"; }
    else if (T.first < 0) { foul = true; why = "aucune bille touchée"; }
    else {
      var fg = groupOf(T.first);
      if (myGroup == null) { if (fg === 2) { foul = true; why = "la noire touchée en premier"; } }
      else if (preLeft > 0 ? fg !== myGroup : fg !== 2) { foul = true; why = "mauvaise bille touchée en premier"; }
      if (!foul && G.bd && pots.length === 0 && !T.rail) { foul = true; why = "aucune bille n'a touché une bande"; }
    }
    var wasBreak = !G.bd;
    // la noire
    if (pots.indexOf(8) >= 0) {
      if (wasBreak) {                              // noire empochée à la casse : remise sur la mouche
        var s = freeSpot(APEX.x, APEX.y, 8); var b8 = G.balls[8]; b8.in = true; b8.x = s.x; b8.y = s.y; b8.vx = b8.vy = 0;
        pots = pots.filter(function (n) { return n !== 8; });
      } else {
        var win = !foul && myGroup != null && preLeft === 0;
        G.over = { w: win ? me : opp, why: win ? nm[me] + " empoche la noire" : foul && myGroup != null && preLeft === 0 ? nm[me] + " empoche la noire sur une faute (" + why + ")" : nm[me] + " empoche la noire trop tôt" };
        G.msg = G.over.why + " — victoire de " + nm[G.over.w] + " !";
        finishBalls(scratch);
        return;
      }
    }
    // choix des groupes (table ouverte)
    if (myGroup == null && G.bd && !foul && pots.length) {
      var g0 = groupOf(pots[0]);
      G.groups[me] = g0; G.groups[opp] = 1 - g0; myGroup = g0;
      msg = nm[me] + " joue les " + (g0 === 0 ? "pleines" : "rayées") + ". ";
    }
    var good = pots.some(function (n) { return myGroup == null ? true : groupOf(n) === myGroup; });
    G.bd = true;
    if (foul) { msg += "Faute : " + why + ". " + nm[opp] + " a la blanche en main."; G.turn = opp; G.hand = true; }
    else if (good) { msg += nm[me] + " empoche et rejoue."; G.hand = false; }
    else { msg += pots.length ? nm[me] + " n'a pas empoché ses billes. À " + nm[opp] + "." : "Rien d'empoché. À " + nm[opp] + "."; G.turn = opp; G.hand = false; }
    G.msg = msg;
    finishBalls(scratch);
  }
  function finishBalls(scratch) {
    var c = G.balls[0];
    if (scratch || !c.in) { c.in = true; var s = freeSpot(HEAD_X, H / 2, 0); c.x = s.x; c.y = s.y; c.vx = c.vy = 0; }
    G.n++;
    afterState();
  }
  function afterState() {
    run = null;
    if (G.hand) { var c = G.balls[0]; if (!validSpot(c.x, c.y, 0)) { var s = freeSpot(c.x, c.y, 0); c.x = s.x; c.y = s.y; } }
    if (!G.over && myIdx() === G.turn) lookAtRack();
    render();
    if (G.over) showEnd();
  }

  /* =====================================================================
     SÉRIALISATION / RÉSEAU
     ===================================================================== */
  function pack() {
    return { gid: G.gid, ids: G.ids, names: G.names, turn: G.turn, breaker: G.breaker, groups: G.groups, hand: G.hand, bd: G.bd, over: G.over, msg: G.msg, n: G.n,
      b: G.balls.map(function (b) { return [round2(b.x), round2(b.y), b.in ? 1 : 0]; }) };
  }
  function adopt(st) {
    var fresh = !G || G.gid !== st.gid;
    G = { gid: st.gid, ids: st.ids, names: st.names, local: false, balls: st.b.map(function (a) { return { x: a[0], y: a[1], vx: 0, vy: 0, in: !!a[2] }; }),
      turn: st.turn, breaker: st.breaker, groups: st.groups, hand: st.hand, bd: st.bd, over: st.over, msg: st.msg, n: st.n };
    run = null; remoteAim = null;
    if (fresh) { overlay.hidden = true; screen = "game"; }
    if (myIdx() === G.turn) lookAtRack();
    render();
    if (G.over) showEnd(); else if (fresh || screen === "end") { overlay.hidden = true; screen = "game"; }
  }
  var EVENTS = ["state", "sync", "shot", "settle", "aim", "rematch"];
  function netSend(ev, payload) { if (NET.ch) { try { NET.ch.send({ type: "broadcast", event: ev, payload: payload }); } catch (e) {} } }
  function sbClient() {
    if (NET.client) return NET.client;
    var c = (window.SITE || {}).supabase;
    if (!window.supabase || !window.supabase.createClient || !c) return null;
    NET.client = window.supabase.createClient(c.url, c.key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 20 } } });
    return NET.client;
  }
  var CODE_CH = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  function newCode() { var s = ""; for (var i = 0; i < 4; i++) s += CODE_CH.charAt(rnd(CODE_CH.length)); return s; }
  function netJoin(code, asHost) {
    var cl = sbClient();
    if (!cl) { NET.err = "Le jeu en ligne est indisponible (connexion au serveur impossible)."; showMenu("home"); return; }
    leaveOnline();
    G = null; run = null;
    NET.code = code; NET.role = asHost ? "host" : "guest"; NET.status = "connexion"; NET.err = ""; NET.roster = []; NET.rematch = {}; NET.ts = now();
    var ch = cl.channel("billard-room-" + code, { config: { broadcast: { self: false, ack: false }, presence: { key: NET.id } } });
    ch.on("presence", { event: "sync" }, onPresence);
    EVENTS.forEach(function (ev) { ch.on("broadcast", { event: ev }, function (m) { try { onNet(ev, m.payload || {}); } catch (err) { if (window.console) console.error(err); } }); });
    ch.subscribe(function (status) {
      if (NET.ch !== ch) return;
      NET.status = status;
      if (status === "SUBSCRIBED") { try { ch.track({ id: NET.id, name: myName || "Écureuil", host: NET.role === "host", ts: NET.ts }); } catch (e) {} netSend("sync", { from: NET.id }); }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") NET.err = "Connexion impossible au salon. Vérifie ta connexion et réessaie.";
      if (!overlay.hidden && (screen === "lobby" || screen === "joining")) showMenu(screen);
    });
    NET.ch = ch;
    if (history.replaceState) history.replaceState(null, "", "#salon=" + code);
    render();
    showMenu(asHost ? "lobby" : "joining");
  }
  function leaveOnline() {
    if (NET.ch) {
      try { NET.ch.untrack(); } catch (e) {}
      try { NET.client.removeChannel(NET.ch); } catch (e) {}
    }
    NET.ch = null; NET.code = null; NET.role = null; NET.roster = []; NET.rematch = {};
    if (location.hash.indexOf("salon=") >= 0 && history.replaceState) history.replaceState(null, "", location.pathname + location.search);
  }
  function onPresence() {
    if (!NET.ch) return;
    var st = NET.ch.presenceState(), list = [];
    Object.keys(st).forEach(function (k) { if (st[k] && st[k][0]) list.push(st[k][0]); });
    list.sort(function (a, b) { return (b.host ? 1 : 0) - (a.host ? 1 : 0) || a.ts - b.ts; });
    NET.roster = list;
    if (NET.role === "host" && !G) {
      var other = list.filter(function (x) { return x.id !== NET.id; })[0];
      if (other) hostStart(other, 0);
    }
    if (G && G.ids) list.forEach(function (x) { var i = G.ids.indexOf(x.id); if (i >= 0 && x.name) G.names[i] = x.name; });
    render();
    if (!overlay.hidden && (screen === "lobby" || screen === "joining")) showMenu(screen);
  }
  function opponentHere() {
    if (!G || !G.ids) return false;
    var o = G.ids[0] === NET.id ? G.ids[1] : G.ids[0];
    return NET.roster.some(function (x) { return x.id === o; });
  }
  function hostStart(other, breaker) {
    var names = [myName || "Écureuil", other.name || "Écureuil"];
    G = newGame(names, [NET.id, other.id], breaker, false);
    NET.rematch = {};
    run = null;
    lookAtRack();
    overlay.hidden = true; screen = "game";
    render();
    netSend("state", pack());
  }
  function onNet(ev, p) {
    if (ev === "sync") {
      if (p.from !== NET.id && G && !run && myIdx() >= 0) netSend("state", pack());
      return;
    }
    if (ev === "state") {
      if (!p.gid) return;
      if (G && G.gid === p.gid && run) run.pending = p;
      else if (!G || G.gid !== p.gid || p.n >= G.n) adopt(p);
      return;
    }
    if (ev === "shot") {
      if (!G || G.gid !== p.gid || run || p.n !== G.n) return;
      if (G.ids && G.ids[G.turn] === NET.id) return;   // c'est moi qui tire
      G.hand = false;
      launch(p.cx, p.cy, p.dx, p.dy, p.v, false);
      return;
    }
    if (ev === "settle") {
      if (!G || G.gid !== p.gid || p.n <= G.n) return;
      if (run) run.pending = p; else adopt(p);
      return;
    }
    if (ev === "aim") {
      if (!G || G.gid !== p.gid || run || G.ids[G.turn] === NET.id) return;
      remoteAim = { x: p.dx, y: p.dy, cx: p.cx, cy: p.cy, p: p.p, t: now() };
      return;
    }
    if (ev === "rematch") {
      NET.rematch[p.from] = true;
      if (NET.role === "host" && G && G.ids && NET.rematch[G.ids[0]] && NET.rematch[G.ids[1]]) {
        var o = NET.roster.filter(function (x) { return x.id !== NET.id; })[0];
        if (o) hostStart(o, 1 - G.breaker);
      } else if (!overlay.hidden && screen === "end") showEnd();
    }
  }

  /* =====================================================================
     BOUCLE, DESSIN
     ===================================================================== */
  var last = 0, audioCtx = null, soundOn = lget("billard-sound", "1") !== "0";
  function frame(t) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
    if (G && run) {
      run.acc += dt;
      var guard = 0;
      while (run.acc >= DT && guard++ < 40) {
        run.acc -= DT; step(run.track);
        if (!moving()) break;
      }
      var sn = run.track.snd, k = 0; run.track.snd = [];
      for (var i = 0; i < sn.length && k < 5; i++) { sfx(sn[i][0], Math.min(1, sn[i][1] / 900)); k++; }
      if (!moving()) endRun();
    }
    if (G && !run && !G.local && !isMyTurn() && remoteAim && now() - remoteAim.t > 4000) remoteAim = null;
    draw();
    // un spectateur qui a fini de rejouer le tir et qui n'a pas reçu l'état final le redemande
    if (run && !run.mine && run.doneAt && !run.asked && now() - run.doneAt > 2500) { run.asked = true; netSend("sync", { from: NET.id, ask: 1 }); }
  }
  function endRun() {
    var r = run;
    if (r.mine) {
      r.done = true;
      for (var i = 0; i < 16; i++) { var b = G.balls[i]; b.vx = b.vy = 0; }
      evaluate(r.track, r.pre.left);
      if (!G.local) netSend("settle", pack());
      return;
    }
    for (var j = 0; j < 16; j++) { G.balls[j].vx = G.balls[j].vy = 0; }
    if (r.pending) { var p = r.pending; run = null; adopt(p); return; }
    if (!r.doneAt) r.doneAt = now();
    // on attend le résultat officiel
    run.waiting = true;
    stepWait();
  }
  function stepWait() { /* l'état final arrive par « settle » ; sinon on redemande (voir frame) */ }

  /* --- rendu de la table --- */
  function layout() {
    var wrapW = Math.max(240, (isFull() && !(window.innerWidth < 760 && window.innerHeight > window.innerWidth * 1.1)) ? window.innerWidth - 270 : (stage.clientWidth || root.clientWidth)), vh = window.innerHeight || 700;
    rot = window.innerWidth < 760 && window.innerHeight > window.innerWidth * 1.1;
    var lw = W + 2 * FRAME, lh = H + 2 * FRAME;
    var aw = rot ? lh : lw, ah = rot ? lw : lh;
    var full = isFull();
    if (full) vh = window.innerHeight;
    var sideH = full && rot ? (elSide.offsetHeight || 230) : 0;
    var maxH = Math.max(200, vh - (full ? (rot ? sideH + 14 : 16) : (rot ? 150 : 190)));
    var cssW = Math.min(wrapW, aw * (maxH / ah), 1200);
    var cssH = cssW * ah / aw;
    var dpr = Math.min(2.5, window.devicePixelRatio || 1);
    var key = Math.round(cssW) + "x" + Math.round(cssH) + "@" + dpr + (rot ? "r" : "");
    if (key !== layout.key) {
      layout.key = key;
      canvas.style.width = Math.round(cssW) + "px"; canvas.style.height = Math.round(cssH) + "px";
      canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    }
    CW = aw; CH = ah; scale = canvas.width / aw;
  }
  function setTransform() {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (rot) { ctx.translate(H + 2 * FRAME, 0); ctx.rotate(Math.PI / 2); }
    ctx.translate(FRAME, FRAME);
  }
  function toWorld(ev) {
    var r = canvas.getBoundingClientRect(), sx = (ev.clientX - r.left) / r.width * CW, sy = (ev.clientY - r.top) / r.height * CH;
    return rot ? { x: sy - FRAME, y: H + FRAME - sx } : { x: sx - FRAME, y: sy - FRAME };
  }
  function drawTable() {
    var g = ctx;
    // cadre en bois
    var gr = g.createLinearGradient(-FRAME, -FRAME, W + FRAME, H + FRAME);
    gr.addColorStop(0, "#6b4426"); gr.addColorStop(0.5, "#54331b"); gr.addColorStop(1, "#6b4426");
    g.fillStyle = gr; g.fillRect(-FRAME, -FRAME, W + 2 * FRAME, H + 2 * FRAME);
    g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 3; g.strokeRect(-FRAME + 1.5, -FRAME + 1.5, W + 2 * FRAME - 3, H + 2 * FRAME - 3);
    // repères (losanges)
    g.fillStyle = "#e9d8a6";
    for (var i = 1; i < 8; i++) { if (i === 4) continue; var x = W / 8 * i; dia(x, -FRAME / 2); dia(x, H + FRAME / 2); }
    for (var j = 1; j < 4; j++) { if (j === 2) continue; var y = H / 4 * j; dia(-FRAME / 2, y); dia(W + FRAME / 2, y); }
    // tapis
    var cl = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.6);
    cl.addColorStop(0, "#23894f"); cl.addColorStop(1, "#176a3b");
    g.fillStyle = "#0f4a28"; g.fillRect(-8, -8, W + 16, H + 16);
    g.fillStyle = cl; g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(0,0,0,.28)"; g.lineWidth = 6; g.strokeRect(0, 0, W, H);
    // ligne de départ et mouche
    g.strokeStyle = "rgba(255,255,255,.16)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(HEAD_X, 0); g.lineTo(HEAD_X, H); g.stroke();
    g.fillStyle = "rgba(255,255,255,.22)"; g.beginPath(); g.arc(APEX.x, APEX.y, 2.5, 0, 6.2832); g.fill();
    // poches
    for (var p = 0; p < 6; p++) {
      var pk = POCKETS[p];
      g.fillStyle = "#6b4426"; g.beginPath(); g.arc(pk.x, pk.y, pk.r + 5, 0, 6.2832); g.fill();
      g.fillStyle = "#050505"; g.beginPath(); g.arc(pk.x, pk.y, pk.r - 1, 0, 6.2832); g.fill();
    }
  }
  function dia(x, y) { ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 3, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 3, y); ctx.fill(); }
  function drawBall(n, x, y, alpha) {
    var g = ctx, col = colorOf(n);
    g.save(); g.globalAlpha = alpha == null ? 1 : alpha;
    g.fillStyle = "rgba(0,0,0,.3)"; g.beginPath(); g.arc(x + 2.5, y + 3, R, 0, 6.2832); g.fill();
    g.beginPath(); g.arc(x, y, R, 0, 6.2832); g.clip();
    g.fillStyle = n > 8 || n === 0 ? "#f4f1e8" : col; g.fillRect(x - R, y - R, 2 * R, 2 * R);
    if (n > 8) { g.fillStyle = col; g.fillRect(x - R, y - R * 0.55, 2 * R, R * 1.1); }
    if (n > 0) {
      g.fillStyle = "#f4f1e8"; g.beginPath(); g.arc(x, y, R * 0.5, 0, 6.2832); g.fill();
      g.fillStyle = "#111"; g.font = "800 " + (R * 0.72) + "px Nunito, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(String(n), x, y + 0.6);
    }
    var sh = g.createRadialGradient(x - R * 0.4, y - R * 0.45, 1, x, y, R * 1.1);
    sh.addColorStop(0, "rgba(255,255,255,.65)"); sh.addColorStop(0.3, "rgba(255,255,255,0)"); sh.addColorStop(1, "rgba(0,0,0,.38)");
    g.fillStyle = sh; g.fillRect(x - R, y - R, 2 * R, 2 * R);
    g.restore();
    g.save(); g.globalAlpha = alpha == null ? 1 : alpha; g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 0.8; g.beginPath(); g.arc(x, y, R, 0, 6.2832); g.stroke(); g.restore();
  }
  // guide de visée : jusqu'au premier contact
  function ray(c, dx, dy) {
    var best = { t: 1e9, ball: -1 }, i;
    if (dx > 1e-9) best.t = Math.min(best.t, (W - R - c.x) / dx); else if (dx < -1e-9) best.t = Math.min(best.t, (R - c.x) / dx);
    var ty = 1e9;
    if (dy > 1e-9) ty = (H - R - c.y) / dy; else if (dy < -1e-9) ty = (R - c.y) / dy;
    if (ty < best.t) best.t = ty;
    for (i = 1; i < 16; i++) {
      var b = G.balls[i]; if (!b.in) continue;
      var px = c.x - b.x, py = c.y - b.y, bb = dx * px + dy * py, cc = px * px + py * py - 4 * R * R, disc = bb * bb - cc;
      if (disc < 0) continue;
      var t = -bb - Math.sqrt(disc);
      if (t > 0 && t < best.t) { best.t = t; best.ball = i; }
    }
    return best;
  }
  function drawAim(c, dx, dy, pw, mine) {
    var g = ctx, h = ray(c, dx, dy), ex = c.x + dx * h.t, ey = c.y + dy * h.t;
    g.save();
    g.setLineDash([6, 6]); g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(c.x + dx * R, c.y + dy * R); g.lineTo(ex, ey); g.stroke(); g.setLineDash([]);
    g.strokeStyle = "rgba(255,255,255,.85)"; g.beginPath(); g.arc(ex, ey, R, 0, 6.2832); g.stroke();
    if (h.ball > 0) {
      var b = G.balls[h.ball], nx = b.x - ex, ny = b.y - ey, l = Math.sqrt(nx * nx + ny * ny) || 1; nx /= l; ny /= l;
      g.strokeStyle = "rgba(255,230,120,.9)"; g.lineWidth = 2; g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(b.x + nx * 60, b.y + ny * 60); g.stroke();
      var dot = dx * nx + dy * ny, tx = dx - dot * nx, ty2 = dy - dot * ny, tl = Math.sqrt(tx * tx + ty2 * ty2);
      if (tl > 0.02) { g.strokeStyle = "rgba(255,255,255,.4)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ex, ey); g.lineTo(ex + tx / tl * 40, ey + ty2 / tl * 40); g.stroke(); }
    }
    // queue
    var pull = 14 + pw / 100 * 70, sx = c.x - dx * (R + pull), sy = c.y - dy * (R + pull), len = 380;
    var ex2 = sx - dx * len, ey2 = sy - dy * len;
    var cg = g.createLinearGradient(sx, sy, ex2, ey2);
    cg.addColorStop(0, "#e9d4a0"); cg.addColorStop(0.55, "#b9854a"); cg.addColorStop(0.56, "#2a2018"); cg.addColorStop(1, "#1b1510");
    g.strokeStyle = "rgba(0,0,0,.28)"; g.lineWidth = 6; g.lineCap = "round"; g.beginPath(); g.moveTo(sx + 3, sy + 4); g.lineTo(ex2 + 3, ey2 + 4); g.stroke();
    g.strokeStyle = cg; g.lineWidth = 5.5; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex2, ey2); g.stroke();
    g.strokeStyle = "#78b7e8"; g.lineWidth = 5.5; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - dx * 5, sy - dy * 5); g.stroke();
    g.restore();
  }
  function draw() {
    if (!canvas.width) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#1b1410"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    setTransform();
    drawTable();
    if (!G) return;
    var i, b;
    for (i = 1; i < 16; i++) { b = G.balls[i]; if (b.in) drawBall(i, b.x, b.y); }
    var c = G.balls[0];
    if (c.in) drawBall(0, c.x, c.y);
    if (!run && !G.over) {
      if (isMyTurn()) {
        drawAim(c, aim.x, aim.y, power, true);
        if (G.hand) { ctx.save(); ctx.strokeStyle = "rgba(255,230,120,.9)"; ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.x, c.y, R + 5, 0, 6.2832); ctx.stroke(); ctx.restore(); }
        sendAim(c);
      } else if (remoteAim && !G.local) {
        drawAim({ x: remoteAim.cx, y: remoteAim.cy }, remoteAim.x, remoteAim.y, remoteAim.p, false);
      }
    }
  }
  function sendAim(c) {
    if (!G || G.local || !NET.ch) return;
    var key = aim.x.toFixed(3) + aim.y.toFixed(3) + c.x.toFixed(0) + c.y.toFixed(0) + power;
    if (key === lastAimKey || now() - lastAimSent < 90) return;
    lastAimKey = key; lastAimSent = now();
    netSend("aim", { gid: G.gid, dx: round2(aim.x * 1000) / 1000, dy: round2(aim.y * 1000) / 1000, cx: round2(c.x), cy: round2(c.y), p: power });
  }

  /* =====================================================================
     ENTRÉES
     ===================================================================== */
  function setAimTo(pt) {
    var c = G.balls[0], dx = pt.x - c.x, dy = pt.y - c.y, l = Math.sqrt(dx * dx + dy * dy);
    if (l < 6) return;
    aim.x = dx / l; aim.y = dy / l;
  }
  canvas.addEventListener("pointerdown", function (ev) {
    if (!isMyTurn()) return;
    audioInit();
    var pt = toWorld(ev), c = G.balls[0];
    if (G.hand && Math.pow(pt.x - c.x, 2) + Math.pow(pt.y - c.y, 2) < 9 * R * R) { dragCue = true; stage.classList.add("hand"); }
    else setAimTo(pt);
    try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
    ev.preventDefault();
  });
  canvas.addEventListener("pointermove", function (ev) {
    if (!isMyTurn()) return;
    if (ev.pointerType !== "mouse" && ev.buttons === 0) return;
    var pt = toWorld(ev);
    if (dragCue) {
      var c = G.balls[0], x = Math.max(R, Math.min(G.bd ? W - R : HEAD_X, pt.x)), y = Math.max(R, Math.min(H - R, pt.y));
      if (validSpot(x, y, 0)) { c.x = x; c.y = y; }
      else if (validSpot(x, c.y, 0)) c.x = x;
      else if (validSpot(c.x, y, 0)) c.y = y;
    } else setAimTo(pt);
  });
  function endDrag() { dragCue = false; stage.classList.remove("hand"); }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  function fine(dir) {
    var a = dir * 0.0035, cs = Math.cos(a), sn = Math.sin(a), x = aim.x * cs - aim.y * sn, y = aim.x * sn + aim.y * cs;
    aim.x = x; aim.y = y;
  }
  var fineT = 0;
  root.addEventListener("pointerdown", function (ev) {
    var b = ev.target.closest && ev.target.closest("[data-fine]");
    if (!b || !isMyTurn()) return;
    var d = Number(b.dataset.fine);
    fine(d * 3); clearInterval(fineT);
    var t0 = now();
    fineT = setInterval(function () { fine(d * (now() - t0 > 600 ? 2 : 0.6)); }, 40);
  });
  window.addEventListener("pointerup", function () { clearInterval(fineT); });
  elPower.addEventListener("input", function () { power = Number(elPower.value); elPowerOut.textContent = power; });
  $("[data-shot]", root).addEventListener("click", function () { audioInit(); shoot(); });
  document.addEventListener("keydown", function (ev) {
    if (ev.target && /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName) && ev.target.type !== "range") return;
    if (!overlay.hidden || !isMyTurn()) return;
    if (ev.key === "ArrowLeft") { fine(-4); ev.preventDefault(); }
    else if (ev.key === "ArrowRight") { fine(4); ev.preventDefault(); }
    else if (ev.key === "ArrowUp" || ev.key === "ArrowDown") { power = Math.max(3, Math.min(100, power + (ev.key === "ArrowUp" ? 4 : -4))); elPower.value = power; elPowerOut.textContent = power; ev.preventDefault(); }
    else if (ev.key === " " || ev.key === "Enter") { if (ev.target && ev.target.tagName === "BUTTON") return; shoot(); ev.preventDefault(); }
  });

  /* =====================================================================
     SONS (WebAudio, générés)
     ===================================================================== */
  function audioInit() { if (audioCtx || !soundOn) return; try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} if (audioCtx && audioCtx.state === "suspended") audioCtx.resume(); }
  function sfx(kind, vol) {
    if (!soundOn || !audioCtx) return;
    try {
      var a = audioCtx, t = a.currentTime, o = a.createOscillator(), g = a.createGain();
      vol = Math.max(0.05, Math.min(1, vol || 0.4));
      var f = kind === "ball" ? 1300 : kind === "rail" ? 220 : kind === "pocket" ? 160 : 520, d = kind === "pocket" ? 0.22 : kind === "rail" ? 0.1 : 0.05;
      o.type = kind === "rail" || kind === "pocket" ? "sine" : "triangle";
      o.frequency.setValueAtTime(f * (0.9 + Math.random() * 0.2), t);
      if (kind === "pocket") o.frequency.exponentialRampToValueAtTime(70, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35 * vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.02);
    } catch (e) {}
  }

  /* =====================================================================
     INTERFACE (panneau, menus)
     ===================================================================== */
  function miniBall(n, gone) {
    var c = colorOf(n);
    return '<i class="pool-mini' + (n > 8 ? " stripe" : "") + (gone ? " gone" : "") + '" style="background:' + c + ';--c:' + c + (n === 8 ? ";color:#fff" : "") + '"><span>' + n + "</span></i>";
  }
  function render() {
    elPlayers.innerHTML = ""; elPot.innerHTML = "";
    if (!G) {
      elStatus.textContent = NET.code ? "En attente d'un adversaire dans le salon " + NET.code + "…" : "Lance une partie depuis le menu.";
      elShoot.hidden = true; renderActions(); return;
    }
    var me = myIdx(), html = "";
    for (var p = 0; p < 2; p++) {
      var grp = G.groups[p], tray = "";
      if (grp == null) tray = '<small>Groupe : table ouverte</small>';
      else {
        var from = grp === 0 ? 1 : 9;
        for (var n = from; n < from + 7; n++) tray += miniBall(n, !G.balls[n].in);
        if (ballsLeft(grp) === 0) tray += miniBall(8, !G.balls[8].in);
      }
      var away = !G.local && G.ids && p !== me && !opponentHere();
      html += '<div class="pool-player' + (G.turn === p && !G.over ? " turn" : "") + (away ? " out" : "") + '"><div class="pool-pname"><span>' + esc(G.names[p] || "Joueur") + (p === me && !G.local ? " (toi)" : "") + '</span><small>' + (G.turn === p && !G.over ? "à jouer" : "") + (away ? "parti" : "") + '</small></div><div class="pool-tray">' + tray + "</div></div>";
    }
    elPlayers.innerHTML = html;
    if (G.groups[0] == null) {
      var gone = ""; for (var q = 1; q < 16; q++) if (!G.balls[q].in && q !== 8) gone += miniBall(q, false);
      elPot.innerHTML = gone;
    }
    var st;
    if (G.over) st = G.msg;
    else if (run) st = "Les billes roulent…";
    else if (isMyTurn()) st = (G.msg ? G.msg + " " : "") + (G.hand ? (G.bd ? (G.local ? G.names[G.turn] + " a" : "Tu as") + " la blanche en main : glisse-la où tu veux, puis vise." : (G.local ? G.names[G.turn] + " casse" : "Casse") + " : place la blanche derrière la ligne, puis vise.") : G.local ? "À " + G.names[G.turn] + " : vise et tire." : "À toi de jouer : vise et tire.");
    else if (G.local) st = G.msg || "";
    else if (me < 0) st = "Tu regardes la partie. " + (G.msg || "");
    else st = (G.msg ? G.msg + " " : "") + "C'est à " + (G.names[G.turn] || "ton adversaire") + " de jouer…";
    elStatus.textContent = st;
    elShoot.hidden = !isMyTurn();
    renderActions();
    if (isFull()) layout();
  }
  function renderActions() {
    var h = '<button class="btn btn-ghost btn-small" type="button" data-act="menu">☰ Menu</button>';
    h += '<button class="btn btn-ghost btn-small" type="button" data-act="sound">' + (soundOn ? "🔊" : "🔇") + "</button>";
    if (G && !G.over && !G.local && myIdx() >= 0) h += '<button class="btn btn-ghost btn-small" type="button" data-act="resign">🏳️ Abandonner</button>';
    h += '<button class="btn btn-ghost btn-small" type="button" data-act="full">' + (isFull() ? "⛶ Quitter le plein écran" : "⛶ Plein écran") + "</button>";
    elActions.innerHTML = h;
  }
  root.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest("[data-act]"); if (!b || !root.contains(b)) return;
    handleAct(b.dataset.act, b);
  });
  $("[data-pool-menu]").addEventListener("click", function () { audioInit(); showMenu(G ? "pause" : "home"); });
  function readName() { var i = $("[data-name]", card); if (i) { myName = i.value.trim().slice(0, 16); lset("billard-name", myName); } }
  function handleAct(a, el) {
    audioInit();
    if (a === "sound") { soundOn = !soundOn; lset("billard-sound", soundOn ? "1" : "0"); if (soundOn) audioInit(); renderActions(); return; }
    if (a === "full") { toggleFull(); return; }
    if (a === "menu") { showMenu(G ? "pause" : "home"); return; }
    if (a === "close") { overlay.hidden = true; screen = "game"; return; }
    if (a === "resign") {
      if (!G || G.over || !confirm("Abandonner la partie ?")) return;
      var me = myIdx(); G.over = { w: 1 - me, why: G.names[me] + " abandonne" }; G.msg = G.over.why + " — victoire de " + G.names[1 - me] + " !"; G.n++;
      run = null; netSend("settle", pack()); render(); showEnd(); return;
    }
    if (a === "local") {
      readName();
      var n1 = myName || "Joueur 1";
      leaveOnline(); G = newGame([n1, "Joueur 2"], null, 0, true); run = null; lookAtRack();
      overlay.hidden = true; screen = "game"; render(); return;
    }
    if (a === "create") { readName(); netJoin(newCode(), true); return; }
    if (a === "join") {
      readName();
      var inp = $("[data-code]", card), code = (inp ? inp.value : "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
      if (code.length < 4) { NET.err = "Le code a 4 lettres."; showMenu("home"); return; }
      netJoin(code, false); return;
    }
    if (a === "copy") { copyLink(el); return; }
    if (a === "leave") { leaveOnline(); G = null; run = null; render(); showMenu("home"); return; }
    if (a === "again") {
      if (!G) return;
      if (G.local) { var nm = G.names.slice(); G = newGame(nm, null, 1 - G.breaker, true); run = null; lookAtRack(); overlay.hidden = true; screen = "game"; render(); return; }
      NET.rematch[NET.id] = true; netSend("rematch", { from: NET.id });
      if (NET.role === "host" && G.ids && NET.rematch[G.ids[0]] && NET.rematch[G.ids[1]]) {
        var o = NET.roster.filter(function (x) { return x.id !== NET.id; })[0]; if (o) hostStart(o, 1 - G.breaker);
      } else showEnd();
      return;
    }
  }
  /* plein écran : API Fullscreen, ou repli CSS (iPhone) */
  function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement) || root.classList.contains("is-max"); }
  function syncFull() {
    var f = isFull();
    root.classList.toggle("is-full", f);
    document.documentElement.classList.toggle("pool-noscroll", f);
    layout(); renderActions(); layout();
    setTimeout(layout, 150);
  }
  function toggleFull() {
    if (isFull()) {
      root.classList.remove("is-max");
      var ex = document.exitFullscreen || document.webkitExitFullscreen;
      if (document.fullscreenElement || document.webkitFullscreenElement) { try { var r = ex.call(document); if (r && r.catch) r.catch(function () {}); } catch (e) {} }
      try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
      syncFull(); return;
    }
    var req = root.requestFullscreen || root.webkitRequestFullscreen;
    if (req) {
      var pr; try { pr = req.call(root); } catch (e) { pr = null; }
      var fallback = function () { root.classList.add("is-max"); syncFull(); };
      if (pr && pr.then) pr.then(function () { try { if (screen.orientation && screen.orientation.lock && window.innerWidth > window.innerHeight * 0.7) screen.orientation.lock("landscape").catch(function () {}); } catch (e) {} syncFull(); }, fallback);
      else fallback();
    } else { root.classList.add("is-max"); syncFull(); }
  }
  document.addEventListener("fullscreenchange", syncFull);
  document.addEventListener("webkitfullscreenchange", syncFull);
  function copyLink() {
    if (!NET.code) return;
    var link = location.href.split("#")[0] + "#salon=" + NET.code;
    var done = function () { var b = $("[data-act=copy]", card); if (b) b.textContent = "✅ Lien copié"; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(done, function () { prompt("Copie ce lien :", link); });
    else prompt("Copie ce lien :", link);
  }
  function show(html, wide) { card.innerHTML = html; overlay.hidden = false; }
  function nameField() { return '<label class="pool-field">Ton pseudo <input type="text" maxlength="16" data-name value="' + esc(myName) + '" placeholder="Écureuil" autocomplete="nickname"></label>'; }
  function showMenu(which) {
    screen = which;
    var h;
    if (which === "home") {
      var hashCode = (location.hash.match(/salon=([A-Za-z]{4})/) || [])[1] || "";
      h = "<h2>🎱 Billard</h2><p>Billard américain 8-ball. Défie un ami en ligne, ou jouez à deux sur le même écran.</p>" + nameField();
      if (NET.err) h += '<p class="pool-err">' + esc(NET.err) + "</p>";
      h += '<div class="pool-menu-btns"><button class="btn" type="button" data-act="create">🌐 Créer un salon en ligne</button>' +
        '<label class="pool-field">Rejoindre un salon <input class="code" type="text" maxlength="4" data-code value="' + esc(hashCode.toUpperCase()) + '" placeholder="ABCD" autocomplete="off" autocapitalize="characters"></label>' +
        '<button class="btn" type="button" data-act="join">➡️ Rejoindre</button>' +
        '<button class="btn btn-ghost" type="button" data-act="local">👥 À deux sur cet écran</button></div>';
      NET.err = "";
    } else if (which === "lobby") {
      h = "<h2>Salon en ligne</h2><p>Envoie ce code à ton adversaire :</p><div class=\"pool-code\">" + esc(NET.code || "") + "</div>";
      if (NET.err) h += '<p class="pool-err">' + esc(NET.err) + "</p>";
      else h += "<p>" + (NET.status === "SUBSCRIBED" ? "En attente d'un adversaire…" : "Connexion au salon…") + "</p>";
      h += '<div class="pool-row"><button class="btn" type="button" data-act="copy">📋 Copier le lien</button><button class="btn btn-ghost" type="button" data-act="leave">Annuler</button></div>';
    } else if (which === "joining") {
      h = "<h2>Salon " + esc(NET.code || "") + "</h2>";
      if (NET.err) h += '<p class="pool-err">' + esc(NET.err) + "</p>";
      else h += "<p>" + (NET.status === "SUBSCRIBED" ? (NET.roster.length > 1 ? "Salon trouvé, la partie arrive…" : "Salon vide : l'hôte n'est pas là. Vérifie le code.") : "Connexion au salon…") + "</p>";
      h += '<div class="pool-row"><button class="btn btn-ghost" type="button" data-act="leave">Annuler</button></div>';
    } else {
      h = "<h2>Menu</h2>";
      if (NET.code) h += "<p>Salon en ligne <strong>" + esc(NET.code) + '</strong></p><div class="pool-row"><button class="btn btn-ghost btn-small" type="button" data-act="copy">📋 Copier le lien</button></div>';
      h += '<div class="pool-menu-btns"><button class="btn" type="button" data-act="close">▶ Reprendre</button><button class="btn btn-ghost" type="button" data-act="leave">Quitter la partie</button></div>';
    }
    show(h);
    var first = card.querySelector("input"); if (first && which === "home" && !first.value) { /* pas de focus auto sur mobile */ }
  }
  function showEnd() {
    screen = "end";
    var me = myIdx(), w = G.over.w, title = G.local ? "🏆 " + esc(G.names[w]) + " gagne !" : me < 0 ? "🏆 " + esc(G.names[w]) + " gagne" : w === me ? "🏆 Victoire !" : "Défaite";
    var h = "<h2>" + title + "</h2><p>" + esc(G.msg) + "</p>";
    var wants = !G.local && G.ids && NET.rematch[NET.id];
    h += '<div class="pool-row">' + (me >= 0 ? '<button class="btn" type="button" data-act="again"' + (wants ? " disabled" : "") + ">" + (wants ? "Revanche demandée…" : "🔁 Revanche") + "</button>" : "") +
      '<button class="btn btn-ghost" type="button" data-act="close">Voir la table</button><button class="btn btn-ghost" type="button" data-act="leave">Quitter</button></div>';
    if (!G.local && G.ids && me >= 0) { var o = G.ids[0] === NET.id ? G.ids[1] : G.ids[0]; if (NET.rematch[o]) h += "<p class=\"game-small\">Ton adversaire veut une revanche.</p>"; }
    show(h);
  }

  /* =====================================================================
     DÉMARRAGE
     ===================================================================== */
  window.addEventListener("resize", function () { layout(); });
  window.addEventListener("orientationchange", function () { setTimeout(layout, 120); });
  layout();
  elPowerOut.textContent = power; elPower.value = power;
  render();
  showMenu("home");
  requestAnimationFrame(frame);
  if (window.BILLARD_DEBUG === undefined && /[?&]debug\b/.test(location.search)) window.BILLARD_DEBUG = { get G() { return G; }, step: step, newTrack: newTrack, evaluate: evaluate, newGame: newGame, shoot: shoot, setG: function (g) { G = g; }, aim: aim };
})();
