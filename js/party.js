/* =========================================================================
   Party : versus entre amis sur tous les jeux du site (2 à 4 joueurs).

   Un « salon de party » (code de 4 lettres) relie les joueurs via Supabase
   Realtime (canal « pt-CODE », présence + diffusion, aucune table). On reste
   dans le salon en changeant de page : l'appartenance est gardée dans
   sessionStorage et chaque page qui charge ce fichier se reconnecte seule.

   - Le chef du salon (st.leader) détient l'état (scores, manche en cours,
     historique) et le diffuse ; s'il disparaît plus de 8 s, le plus ancien
     joueur présent reprend la main (numéro de version st.v pour départager).
   - Une manche = un mode (js/party-modes.js) + des équipes. Le chef la lance,
     tout le monde part sur la page du jeu (« page.html#party »), le jeu
     s'enregistre (Party.register), on attend tout le monde, 3-2-1, et c'est
     parti. Chaque joueur envoie son score en direct puis son résultat ; le
     chef classe, donne les points et tout le monde revient au salon.
   - Emotes : bouton 😀 (ou touche T) sur toutes les pages de la party.

   Pour brancher un jeu : voir « API côté jeu » plus bas et le README.
   Le déroulé des manches est une « formule » (FLOWS) : choix libre ou
   roulette aujourd'hui ; un plateau façon jeu de société pourra s'y ajouter.
   ========================================================================= */
(function () {
  "use strict";
  var LIB = "js/vendor/supabase-2.45.4.min.js";
  var SKEY = "party-v1", PKEY = "party-profile";
  var CODE_CH = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  var COLORS = ["#e8873a", "#5b8a4a", "#2f7f7a", "#c8553d", "#7a5ea8", "#d4a017", "#3d7cc9", "#c75b9b"];
  var AVATARS = ["🐿️", "🦊", "🦉", "🦔", "🐰", "🐸", "🐻", "🦝", "🐭", "🐼"];
  var EMOTES = [
    { e: "👍", t: "GG !" }, { e: "😂", t: "Mdr" }, { e: "😮", t: "Waouh" }, { e: "😡", t: "Grr…" },
    { e: "😢", t: "Snif" }, { e: "🔥", t: "En feu !" }, { e: "🤝", t: "Bien joué" }, { e: "🆘", t: "À l'aide !" },
    { e: "⏳", t: "Attendez-moi" }, { e: "🚀", t: "On y va !" }, { e: "🙈", t: "Oups" }, { e: "🐿️", t: "Couic !" },
  ];
  var LEADER_GRACE = 8000;      // absence du chef avant reprise
  var LOAD_WAIT = 25000;        // attente max des joueurs avant de lancer quand même
  var COUNTDOWN = 3;

  var MODES = function () { return window.PARTY_MODES || []; };
  function modeById(id) { return MODES().filter(function (m) { return m.id === id; })[0] || null; }
  function gameById(id) { return (window.PARTY_GAMES || []).filter(function (g) { return g.id === id; })[0] || null; }
  function pageOf(mode) { var g = mode && gameById(mode.game); return g ? g.page : ""; }
  function here() { return (location.pathname.split("/").pop() || "index.html").toLowerCase(); }
  function now() { return Date.now(); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function rid(n) { var s = ""; while (s.length < n) s += Math.random().toString(36).slice(2); return s.slice(0, n); }
  function ss(k, v) { try { if (v === undefined) return JSON.parse(sessionStorage.getItem(k) || "null"); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function ls(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function hash4(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } var o = ""; for (var j = 0; j < 4; j++) { o += CODE_CH[(h >>> 0) % CODE_CH.length]; h = Math.imul(h ^ (h >>> 13), 2654435761); } return o; }
  function fmtTime(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }

  /* ---------- profil (pseudo, couleur, avatar) ---------- */
  // Sans pseudo choisi, le nom suit l'avatar et la couleur : « Écureuil roux », « Grenouille verte »…
  var AV_NAMES = [["Écureuil", 0], ["Renard", 0], ["Hibou", 0], ["Hérisson", 0], ["Lapin", 0], ["Grenouille", 1], ["Ours", 0], ["Raton laveur", 0], ["Souris", 1], ["Panda", 0]];
  var COL_NAMES = [["roux", "rousse"], ["vert", "verte"], ["jade", "jade"], ["rouge", "rouge"], ["violet", "violette"], ["doré", "dorée"], ["bleu", "bleue"], ["rose", "rose"]];
  function autoName(av, color) {
    var a = AV_NAMES[AVATARS.indexOf(av)] || AV_NAMES[0], c = COL_NAMES[COLORS.indexOf(color)] || COL_NAMES[0];
    return a[0] + " " + c[a[1]];
  }
  function profile() {
    var p = ls(PKEY) || {}, changed = false;
    if (!p.color) { p.color = COLORS[Math.floor(Math.random() * COLORS.length)]; changed = true; }
    if (!p.av) { p.av = AVATARS[Math.floor(Math.random() * AVATARS.length)]; changed = true; }
    if (p.name && p.auto === undefined && /^Écureuil( \d{1,2})?$/.test(p.name)) { p.auto = true; changed = true; } // anciens noms automatiques
    if (!p.name && !p.auto) {
      var n = ""; try { n = (window.SiteAuth && SiteAuth.profile && SiteAuth.profile.pseudo) || localStorage.getItem("merger-name") || ""; } catch (e) {}
      if (n) p.name = String(n).slice(0, 16); else p.auto = true;
      changed = true;
    }
    if (p.auto) p.name = autoName(p.av, p.color);
    if (changed) ls(PKEY, p);
    return p;
  }

  var listeners = {};
  var P = window.Party = {
    COLORS: COLORS, AVATARS: AVATARS, EMOTES: EMOTES,
    code: null, me: null, st: null, roster: [], live: {}, status: "off",
    inGame: false,     // page de jeu ouverte pour une manche (#party)
    adapter: null, run: null,
    on: function (ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return fn; },
    off: function (ev, fn) { listeners[ev] = (listeners[ev] || []).filter(function (f) { return f !== fn; }); },
    modeById: modeById, gameById: gameById, fmtTime: fmtTime,
  };
  function emit(ev, d) { (listeners[ev] || []).slice().forEach(function (fn) { try { fn(d); } catch (e) { if (window.console) console.error(e); } }); }

  /* ---------- session ---------- */
  var sess = ss(SKEY);
  function saveSess() { if (P.code) ss(SKEY, { code: P.code, me: P.me, st: P.st }); }
  P.profile = profile;
  P.autoName = autoName;
  P.setProfile = function (p) {
    var cur = profile();
    if (p.color) cur.color = p.color;
    if (p.av) cur.av = p.av;
    if (p.name !== undefined) {   // pseudo vide = nom automatique
      var nm = String(p.name || "").replace(/\s+/g, " ").trim().slice(0, 16);
      if (nm) { cur.name = nm; cur.auto = false; } else cur.auto = true;
    }
    if (cur.auto) cur.name = autoName(cur.av, cur.color);
    ls(PKEY, cur);
    if (P.me) { P.me.n = cur.name; P.me.c = cur.color; P.me.a = cur.av; saveSess(); track(); }
    emit("profile", cur);
  };

  /* ---------- connexion Realtime ---------- */
  var client = null, ch = null, libP = null, hiTimer = null, leaderGoneAt = 0;
  function loadLib() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    if (libP) return libP;
    libP = new Promise(function (ok, ko) { var s = document.createElement("script"); s.src = LIB; s.onload = ok; s.onerror = function () { libP = null; ko(new Error("lib")); }; document.head.appendChild(s); });
    return libP;
  }
  function getClient() {
    if (client) return Promise.resolve(client);
    var c = (window.SITE || {}).supabase;
    if (!c || !c.url) return Promise.reject(new Error("not_configured"));
    return loadLib().then(function () {
      client = client || window.supabase.createClient(c.url, c.key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 20 } } });
      return client;
    });
  }
  function send(ev, d) { if (ch && P.status === "on") { try { ch.send({ type: "broadcast", event: ev, payload: d }); } catch (e) {} } }
  P.send = send;

  function connect() {
    if (!P.code) return;
    setStatus("connexion");
    getClient().then(function (cl) {
      if (ch) { try { cl.removeChannel(ch); } catch (e) {} }
      var c = ch = cl.channel("pt-" + P.code, { config: { broadcast: { self: false, ack: false }, presence: { key: P.me.id } } });
      c.on("presence", { event: "sync" }, onPresence);
      ["st", "hi", "sc", "res", "emo", "g"].forEach(function (ev) { c.on("broadcast", { event: ev }, function (m) { if (c === ch) onMsg(ev, m.payload || {}); }); });
      c.subscribe(function (s) {
        if (c !== ch) return;
        if (s === "SUBSCRIBED") {
          setStatus("on"); track(); send("hi", { id: P.me.id, v: P.st ? P.st.v : -1 });
          clearTimeout(hiTimer);
          hiTimer = setTimeout(function () {
            if (!P.st) { P.st = newState(); commit(); }          // salon vide : je l'ouvre
            else if (isLeader()) broadcast();
          }, 1800);
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
          setStatus("erreur");
          setTimeout(function () { if (c === ch && P.code) connect(); }, 3000);
        }
      });
    }).catch(function () { setStatus("indisponible"); });
  }
  function setStatus(s) { P.status = s; emit("status", s); }
  var lastTrack = "";
  function track() {
    if (!ch || P.status !== "on") return;
    var d = { id: P.me.id, n: P.me.n, c: P.me.c, a: P.me.a, ts: P.me.ts, pg: here(), ld: P.loadedMatch || "" };
    var k = JSON.stringify(d); if (k === lastTrack) return; lastTrack = k;
    try { ch.track(d); } catch (e) {}
  }
  function onPresence() {
    var stt = ch.presenceState(), list = [];
    Object.keys(stt).forEach(function (k) { if (stt[k] && stt[k][0]) list.push(stt[k][0]); });
    list.sort(function (a, b) { return a.ts - b.ts || (a.id < b.id ? -1 : 1); });
    P.roster = list;
    if (isLeader()) {
      // garde la liste des membres (même absents) pour les scores
      var changed = false;
      list.forEach(function (x) {
        var m = P.st.members[x.id];
        if (!m || m.n !== x.n || m.c !== x.c || m.a !== x.a) { P.st.members[x.id] = { n: x.n, c: x.c, a: x.a, ts: x.ts }; if (P.st.pts[x.id] == null) P.st.pts[x.id] = 0; changed = true; }
      });
      if (changed) commit();
      leaderTick();
    }
    emit("roster", list);
  }
  P.present = function (id) { return isBot(id) || P.roster.some(function (x) { return x.id === id; }); };
  function isBot(id) { return !!(P.st && P.st.members[id] && P.st.members[id].bot); }
  P.isBot = isBot;

  /* ---------- bots ----------
     Un bot est un membre de la party simulé par le chef : son score suit le
     profil « bot » du mode (js/party-modes.js), avec un peu de hasard. Il peut
     être éliminé, finir une course, et faire pleuvoir des écureuils. */
  var BOT_LV = [null, { n: "facile", k: 0.6 }, { n: "moyen", k: 1 }, { n: "fort", k: 1.5 }];
  var BOT_NAMES = ["Robo-Noisette", "Bip-Gland", "Tic-Tac", "Mécanoix", "Boulon", "Clic-Clac"];
  P.BOT_LV = BOT_LV;
  P.addBot = function (lv) {
    lv = Math.max(1, Math.min(3, lv | 0 || 2));
    return P.mutate(function (s) {
      var used = Object.keys(s.members).map(function (k) { return s.members[k].n; });
      var name = BOT_NAMES.filter(function (n) { return !used.some(function (u) { return u.indexOf(n) === 0; }); })[0] || "Bot";
      var id = "bot-" + rid(5);
      s.members[id] = { n: name + " (" + BOT_LV[lv].n + ")", c: COLORS[(Object.keys(s.members).length * 3 + 1) % COLORS.length], a: "🤖", ts: now(), bot: lv };
      s.pts[id] = 0;
    });
  };
  P.removeBot = function (id) { return P.mutate(function (s) { if (s.members[id] && s.members[id].bot) { delete s.members[id]; delete s.pts[id]; } }); };
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function botPlan(mode, lv) {
    var k = (BOT_LV[lv] || BOT_LV[2]).k, b = mode.bot || {}, pl = { k: k, noise: rnd(0.85, 1.15) };
    if (b.death) pl.death = Math.round(rnd(b.death[0], b.death[1]) * (0.7 + 0.3 * k));
    if (b.finish) pl.finish = Math.round(rnd(b.finish[0], b.finish[1]) / (0.7 + 0.3 * k));
    return pl;
  }
  function botTick(m, mode) {
    var el = (now() - m.goAt) / 1000 - COUNTDOWN, dur = mode.dur || 300, b = mode.bot;
    if (el < 0 || !b || !m.bots) return;
    if (now() - (P._bt || 0) < 900) return;
    P._bt = now();
    participants(m).forEach(function (id) {
      var pl = m.bots[id]; if (!pl || m.res[id]) return;
      var tt = Math.min(el, dur), cv = b.curve || 1.05;
      var sc = Math.round((b.rate || 0) * pl.k * pl.noise * Math.pow(tt, cv) / Math.pow(dur, cv - 1));
      var r = null;
      if (pl.death && el >= pl.death) r = { s: sc, al: false, t: pl.death };
      else if (pl.finish && el >= pl.finish) r = { s: b.winScore != null ? b.winScore : sc, al: true, dn: true, t: pl.finish };
      else if (m.status === "stop" || el >= dur) r = { s: sc, al: true, t: Math.round(el) };
      if (r) {
        takeResult(id, m.id, r);
        if (Math.random() < 0.5) { var ei = r.dn ? 0 : r.al ? 6 : 4; send("emo", { id: id, i: ei }); showEmote(id, ei); }
        return;
      }
      P.live[id] = { s: sc, al: true, at: now() };
      send("sc", { id: id, m: m.id, s: sc, al: true });
      if (b.rain && Math.random() < 0.07 * pl.k) {
        var team = m.teams.filter(function (t) { return t.indexOf(id) >= 0; })[0] || [id];
        var opp = participants(m).filter(function (x) { return team.indexOf(x) < 0 && !isBot(x); });
        if (opp.length) deliverGame("rain", { n: 2 + Math.floor(Math.random() * 3 * pl.k), from: id }, opp, id);
      }
    });
    emit("live", P.live); hudScores();
  }
  function deliverGame(ev, d, to, from) {
    send("g", { ev: ev, d: d, to: to || null, from: from });
    if (!to || to.indexOf(P.me.id) >= 0) (gameHandlers[ev] || []).forEach(function (fn) { try { fn(d, from); } catch (e) {} });
  }

  /* ---------- état partagé ---------- */
  function newState() {
    var m = {}; m[P.me.id] = { n: P.me.n, c: P.me.c, a: P.me.a, ts: P.me.ts };
    var pts = {}; pts[P.me.id] = 0;
    return { v: 1, leader: P.me.id, goal: 5, scoring: "winner", flow: "free", members: m, pts: pts, round: 0, hist: [], match: null, champ: null };
  }
  function isLeader() { return !!(P.st && P.me && P.st.leader === P.me.id); }
  P.isLeader = isLeader;
  function broadcast() { if (P.st) send("st", P.st); }
  // Manche lancée avec un mode qui n'existe plus (liste des jeux modifiée) : on l'oublie.
  function cleanState(st) { if (st && st.match && !modeById(st.match.mode)) st.match = null; return st; }
  function commit() { P.st.v++; saveSess(); broadcast(); emit("state", P.st); afterState(); }
  P.mutate = function (fn) { if (!isLeader()) return false; fn(P.st); commit(); return true; };

  function onMsg(ev, d) {
    if (ev === "st") {
      var cur = P.st;
      if (!cur || d.v > cur.v || (d.v === cur.v && d.leader !== cur.leader && d.leader < cur.leader)) {
        P.st = cleanState(d); saveSess(); emit("state", d); afterState();
      } else if (isLeader() && d.v < cur.v) broadcast();
    } else if (ev === "hi") {
      if (isLeader()) { clearTimeout(P._hiT); P._hiT = setTimeout(broadcast, 150); }
    } else if (ev === "sc") {
      if (!P.st || !P.st.match || d.m !== P.st.match.id) return;
      P.live[d.id] = { s: d.s, al: d.al, x: d.x || "", at: now() };
      emit("live", P.live); hudScores();
    } else if (ev === "res") {
      if (isLeader()) takeResult(d.id, d.m, d.r);
    } else if (ev === "emo") {
      showEmote(d.id, d.i);
    } else if (ev === "g") {
      if (d.to && d.to.indexOf(P.me.id) < 0) return;
      (gameHandlers[d.ev] || []).forEach(function (fn) { try { fn(d.d, d.from); } catch (e) {} });
    }
  }

  // reprise du rôle de chef si celui-ci a disparu
  setInterval(function () {
    if (!P.st || P.status !== "on") return;
    if (isLeader()) { leaderTick(); return; }
    if (P.present(P.st.leader)) { leaderGoneAt = 0; return; }
    if (!leaderGoneAt) { leaderGoneAt = now(); return; }
    if (now() - leaderGoneAt < LEADER_GRACE) return;
    var first = P.roster[0];
    if (first && first.id === P.me.id) { P.st.leader = P.me.id; leaderGoneAt = 0; commit(); }
  }, 1000);

  /* ---------- créer / rejoindre / quitter ---------- */
  function begin(code) {
    var pr = profile();
    P.code = code;
    P.me = { id: rid(8), n: pr.name, c: pr.color, a: pr.av, ts: now() };
    P.st = null; P.live = {};
    saveSess(); connect();
  }
  P.create = function () {
    var code = ""; for (var i = 0; i < 4; i++) code += CODE_CH[Math.floor(Math.random() * CODE_CH.length)];
    begin(code); P.st = newState(); commit(); return code;
  };
  P.join = function (code) {
    code = String(code || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
    if (code.length !== 4) return false;
    if (P.code === code) return true;
    if (P.code) P.leave(true);
    begin(code); return true;
  };
  P.leave = function (silent) {
    if (ch && client) { try { ch.untrack(); } catch (e) {} try { client.removeChannel(ch); } catch (e) {} }
    ch = null; P.code = null; P.me = null; P.st = null; P.roster = []; P.live = {};
    ss(SKEY, null); setStatus("off");
    if (!silent) { emit("state", null); emit("roster", []); }
  };
  P.inviteLink = function () { return location.origin + location.pathname.replace(/[^/]*$/, "") + "jeux.html#p=" + P.code; };

  /* ---------- équipes et formats ---------- */
  // format : "ffa" (chacun pour soi) ou une liste de tailles d'équipes « 2-2 », « 1-2 », « 1-3 »
  P.formatsFor = function (n) {
    var f = [{ id: "ffa", name: n === 2 ? "1 contre 1" : "Chacun pour soi (" + Array(n + 1).join("1").split("").join("v") + ")" }];
    if (n === 3) f.push({ id: "1-2", name: "1 contre 2" });
    if (n === 4) { f.push({ id: "2-2", name: "2 contre 2" }); f.push({ id: "1-3", name: "1 contre 3" }); }
    return f;
  };
  P.makeTeams = function (ids, format, shuffle) {
    ids = ids.slice();
    if (shuffle) for (var i = ids.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = ids[i]; ids[i] = ids[j]; ids[j] = t; }
    if (format === "ffa" || !format) return ids.map(function (x) { return [x]; });
    var sizes = format.split("-").map(Number), out = [], k = 0;
    sizes.forEach(function (s) { out.push(ids.slice(k, k + s)); k += s; });
    return out.filter(function (t) { return t.length; });
  };
  P.formatOf = function (teams) { return teams.every(function (t) { return t.length === 1; }) ? "ffa" : teams.map(function (t) { return t.length; }).join("-"); };
  // un mode accepte-t-il ces équipes ?
  P.modeFits = function (mode, teams) {
    var n = teams.reduce(function (a, t) { return a + t.length; }, 0), f = P.formatOf(teams);
    if (n < (mode.min || 2) || n > (mode.max || 4)) return false;
    var bots = teams.some(function (t) { return t.some(isBot); });
    if (bots && (!mode.bot || mode.room)) return false;
    if (!teams.some(function (t) { return t.some(function (id) { return !isBot(id); }); })) return false;
    if (mode.formats && mode.formats.indexOf(f) < 0 && !(f !== "ffa" && mode.formats.indexOf("teams") >= 0)) return false;
    return true;
  };

  /* ---------- manches (côté chef) ---------- */
  P.launch = function (modeId, teams) {
    var mode = modeById(modeId); if (!mode || !isLeader()) return false;
    return P.mutate(function (s) {
      s.match = { id: rid(6), mode: modeId, teams: teams, seed: (Math.random() * 1e9) | 0, at: now(), status: "launch", res: {}, goAt: 0, bots: {} };
      participants(s.match).forEach(function (id) { if (isBot(id)) s.match.bots[id] = botPlan(mode, s.members[id].bot); });
      s.champ = null;
    });
  };
  P.cancelMatch = function () { return P.mutate(function (s) { if (s.match && s.match.status !== "done") s.match = null; }); };
  function participants(m) { return [].concat.apply([], m.teams); }
  P.participants = function () { return P.st && P.st.match ? participants(P.st.match) : []; };

  function leaderTick() {
    var s = P.st, m = s && s.match; if (!m || !isLeader()) return;
    var mode = modeById(m.mode); if (!mode) return;
    var ids = participants(m), t = now();
    if (m.status === "launch") {
      var humans = ids.filter(function (id) { return !isBot(id); });
      var loaded = humans.filter(function (id) { return P.roster.some(function (x) { return x.id === id && x.ld === m.id; }); });
      if (loaded.length === humans.length || (t - m.at > LOAD_WAIT && loaded.length)) P.mutate(function (s2) { s2.match.status = "play"; s2.match.goAt = now(); });
      else if (t - m.at > LOAD_WAIT * 2) P.mutate(function (s2) { s2.match = null; });   // personne n'a chargé
      return;
    }
    if (m.status === "play" || m.status === "stop") {
      botTick(m, mode);
      if (P.st.match !== m || m.status === "done") return;
      var dur = (mode.dur || 300) * 1000;
      if (m.status === "stop" && t - m.stopAt > 9000) finalize();
      else if (t - m.goAt > dur + (COUNTDOWN + 25) * 1000) finalize();
    }
  }
  function takeResult(id, mid, r) {
    var m = P.st && P.st.match; if (!m || m.id !== mid || m.status === "done" || m.res[id]) return;
    if (participants(m).indexOf(id) < 0) return;
    P.mutate(function (s) { s.match.res[id] = r; });
    checkEnd();
  }
  function checkEnd() {
    var m = P.st.match, mode = modeById(m.mode), ids = participants(m);
    if (ids.every(function (id) { return m.res[id]; })) { finalize(); return; }
    if (mode.end === "last" && m.status === "play" && m.teams.length > 1) {
      var aliveTeams = m.teams.filter(function (t) { return t.some(function (id) { var r = m.res[id]; return !r || r.al; }); });
      if (aliveTeams.length <= 1) P.mutate(function (s) { s.match.status = "stop"; s.match.stopAt = now(); });
    }
    if (mode.end === "first" && m.status === "play" && ids.some(function (id) { return m.res[id] && m.res[id].dn; })) {
      P.mutate(function (s) { s.match.status = "stop"; s.match.stopAt = now(); });
    }
  }
  function resultOf(m, id) { var r = m.res[id]; if (r) return r; var l = P.live[id]; return { s: l ? l.s : 0, al: false, t: 0, dn: false, miss: true }; }
  // classement : renvoie [{ ids, s, al, t, dn, place }]
  P.rank = function (m) {
    var mode = modeById(m.mode), how = mode.rank || "score";
    var rows = m.teams.map(function (ids) {
      var rs = ids.map(function (id) { return resultOf(m, id); });
      var avg = rs.reduce(function (a, r) { return a + (+r.s || 0); }, 0) / rs.length;
      var row = { ids: ids, s: Math.round(avg), al: rs.some(function (r) { return r.al; }), t: 0, dn: rs.some(function (r) { return r.dn; }) };
      if (how === "survive") row.t = Math.max.apply(null, rs.map(function (r) { return r.al ? 1e9 : (r.t || 0); }));
      if (how === "race") row.t = Math.min.apply(null, rs.map(function (r) { return r.dn ? r.t : 1e9; }));
      if (how === "last") row.s = Math.max.apply(null, rs.map(function (r) { return +r.s || 0; }));
      return row;
    });
    function cmp(a, b) {
      if (how === "survive") return (b.al - a.al) || (b.t - a.t) || (a.al && mode.tieAlive ? 0 : b.s - a.s);
      if (how === "race") return (b.dn - a.dn) || (a.t - b.t) || (b.s - a.s);
      if (mode.lowWins) return a.s - b.s;
      return b.s - a.s;
    }
    rows.sort(cmp);
    rows.forEach(function (r, i) { r.place = i && cmp(rows[i - 1], r) === 0 ? rows[i - 1].place : i + 1; });
    return rows;
  };
  function finalize() {
    var m = P.st.match; if (!m || m.status === "done") return;
    var mode = modeById(m.mode), rows = P.rank(m), n = rows.length, gain = {};
    rows.forEach(function (r) {
      var g = P.st.scoring === "podium" ? Math.max(0, n - r.place) : (r.place === 1 ? 1 : 0);
      r.ids.forEach(function (id) { gain[id] = g; });
    });
    P.mutate(function (s) {
      var mm = s.match;
      mm.status = "done"; mm.rows = rows; mm.gain = gain; mm.endAt = now();
      Object.keys(gain).forEach(function (id) { s.pts[id] = (s.pts[id] || 0) + gain[id]; });
      s.round++;
      s.hist.unshift({ mode: mm.mode, rows: rows.map(function (r) { return { ids: r.ids, s: r.s, place: r.place, al: r.al, dn: r.dn, t: r.t }; }), gain: gain, at: mm.endAt });
      s.hist = s.hist.slice(0, 30);
      var champs = Object.keys(s.pts).filter(function (id) { return s.pts[id] >= s.goal; });
      if (champs.length) { var top = Math.max.apply(null, champs.map(function (id) { return s.pts[id]; })); s.champ = champs.filter(function (id) { return s.pts[id] === top; }); }
    });
  }
  P.setRules = function (o) { return P.mutate(function (s) { Object.keys(o).forEach(function (k) { s[k] = o[k]; }); }); };
  P.resetScores = function () { return P.mutate(function (s) { Object.keys(s.pts).forEach(function (k) { s.pts[k] = 0; }); s.round = 0; s.hist = []; s.champ = null; s.match = null; }); };
  P.kick = function (id) { return P.mutate(function (s) { delete s.members[id]; delete s.pts[id]; }); };
  P.giveLead = function (id) { return P.mutate(function (s) { s.leader = id; }); };

  /* ---------- réactions à l'état (tous) ---------- */
  var navTo = null;
  function afterState() {
    var m = P.st && P.st.match;
    if (m && P._mid !== m.id) { P._mid = m.id; P.live = {}; }
    var mine = m && participants(m).indexOf(P.me.id) >= 0;
    var mode = m && modeById(m.mode);
    if (m && mine && mode && (m.status === "launch" || m.status === "play")) {
      var pg = pageOf(mode).toLowerCase();
      if (!(P.inGame && here() === pg) && navTo !== m.id && ss("party-nav") !== m.id) {
        navTo = m.id;
        emit("launching", m);
        setTimeout(function () { ss("party-nav", m.id); location.href = pg + "#party"; }, P.inGame ? 300 : 1600);
      }
    }
    if (P.inGame) gameState();
  }

  /* =====================================================================
     API côté jeu
       Party.register(gameId, { start(ctx), stop(why) })
         start : lance une partie selon ctx.mode / ctx.opts (graine ctx.seed)
         stop  : le temps est écoulé (ou la manche est arrêtée) : finir tout de
                 suite ; peut renvoyer { score } (sinon dernier Party.score)
       Party.score(n, texte?)   score en direct
       Party.over({ score, dead, done, alive })  fin de partie pour ce joueur
         dead : éliminé (modes « dernier debout ») ; done : parcours fini (course) ;
         sans dead : fin sans élimination (nulle, adversaire parti…)
       Party.pending()  → { mode, opts, seed } avant même le départ (ou null)
       Party.sendGame(ev, data, to?) / Party.onGame(ev, fn) : messages libres
         entre joueurs de la manche (ex. Merger envoie des écureuils aux autres)
     ===================================================================== */
  var gameHandlers = {};
  P.onGame = function (ev, fn) { (gameHandlers[ev] = gameHandlers[ev] || []).push(fn); };
  P.sendGame = function (ev, d, to) { send("g", { ev: ev, d: d, to: to || null, from: P.me && P.me.id }); };
  P.pending = function () {
    if (!P.inGame || !P.st || !P.st.match) return null;
    var m = P.st.match, mode = modeById(m.mode);
    if (!mode || pageOf(mode).toLowerCase() !== here() || m.status === "done") return null;
    return { mode: mode, opts: mode.opts || {}, seed: m.seed, id: m.id };
  };
  P.register = function (gameId, ad) {
    if (!P.inGame) return false;
    ad.gameId = gameId; P.adapter = ad;
    gameState();
    return true;
  };
  P.score = function (s, txt) {
    var r = P.run; if (!r || r.final) return;
    r.cur = Math.max(0, Math.round(+s || 0)); r.txt = txt || "";
    var shown = r.mode.retry ? Math.max(r.best, r.cur) : r.cur;
    P.live[P.me.id] = { s: shown, al: !r.dead, x: r.txt, at: now() };
    if (now() - (r.sent || 0) > 700) { r.sent = now(); send("sc", { id: P.me.id, m: r.id, s: shown, al: !r.dead, x: r.txt }); hudScores(); }
  };
  P.over = function (o) {
    var r = P.run; if (!r || r.final) return;
    o = o || {};
    if (o.score != null) P.score(o.score);
    var t = (now() - r.t0) / 1000;
    if (r.forced) { submit({ al: !r.dead, dn: !!o.done }); return; }
    if (o.done) { submit({ al: true, dn: true, t: t }); return; }
    if (o.alive || !o.dead) { submit({ al: true, t: t }); return; }   // fin sans élimination (nulle, adversaire parti…)
    // éliminé
    if (r.mode.retry && r.left() > 8) {
      r.best = Math.max(r.best, r.cur); r.tries++;
      banner("Raté ! On recommence, ton meilleur score est gardé", 2200);
      setTimeout(function () { if (P.run === r && !r.final) { r.cur = 0; try { P.adapter.start(r.ctx); } catch (e) {} } }, 2200);
      return;
    }
    r.dead = true;
    submit({ al: false, t: t });
  };
  P.elapsed = function () { return P.run ? (now() - P.run.t0) / 1000 : 0; };
  P.timeLeft = function () { return P.run ? P.run.left() : 0; };

  function submit(o) {
    var r = P.run; if (!r || r.final) return;
    r.final = true;
    var score = r.mode.retry ? Math.max(r.best, r.cur) : r.cur;
    r.res = { s: score, al: o.al !== false && !r.dead, t: o.t != null ? Math.round(o.t * 10) / 10 : Math.round((now() - r.t0) / 100) / 10, dn: !!o.dn };
    P.live[P.me.id] = { s: score, al: r.res.al, x: r.txt, at: now() };
    send("sc", { id: P.me.id, m: r.id, s: score, al: r.res.al, x: r.txt });
    pushRes();
    hud();
  }
  function pushRes() {
    var r = P.run; if (!r || !r.res) return;
    var m = P.st && P.st.match;
    if (!m || m.id !== r.id || m.res[P.me.id] || m.status === "done") return;
    if (isLeader()) takeResult(P.me.id, r.id, r.res); else send("res", { id: P.me.id, m: r.id, r: r.res });
    clearTimeout(r.retryT); r.retryT = setTimeout(pushRes, 2500);
  }

  function ctxFor(m, mode) {
    var ids = participants(m), me = P.me.id;
    var team = m.teams.filter(function (t) { return t.indexOf(me) >= 0; })[0] || [me];
    var group = mode.room === "team" ? team : ids;
    var gi = mode.room === "team" ? m.teams.indexOf(team) : 0;
    return {
      mode: mode, opts: mode.opts || {}, seed: m.seed, match: m.id,
      me: me, name: P.me.n,
      players: ids.map(function (id) { var mb = P.st.members[id] || {}; return { id: id, name: mb.n || "?", color: mb.c, av: mb.a, team: m.teams.findIndex(function (t) { return t.indexOf(id) >= 0; }) }; }),
      team: team, mates: team.filter(function (x) { return x !== me; }),
      opponents: ids.filter(function (x) { return team.indexOf(x) < 0; }),
      room: hash4(P.code + m.id + gi), roomHost: group[0] === me, roomSize: group.length, roomIds: group,
      present: function (id) { return P.present(id); },
    };
  }

  /* ---------- déroulé sur la page du jeu ---------- */
  function gameState() {
    var m = P.st && P.st.match;
    var mode = m && modeById(m.mode);
    var mine = m && participants(m).indexOf(P.me.id) >= 0;
    if (!m || !mine || !mode || pageOf(mode).toLowerCase() !== here()) {
      if (P.run && !P.run.final && m == null) { /* manche annulée */ P.run.final = true; try { P.adapter && P.adapter.stop("cancel"); } catch (e) {} }
      if (!P.st) return;
      if (m && m.status === "done" && P.run && P.run.id === m.id) { results(m); return; }
      card('<p class="pt-kicker">Party ' + esc(P.code) + '</p><h2>Pas de manche en cours ici</h2><p>Retourne au salon pour choisir la suite.</p>' + backBtn());
      return;
    }
    if (P.adapter && P.loadedMatch !== m.id) { P.loadedMatch = m.id; track(); }
    if (m.status === "launch") {
      var ids = participants(m);
      var ok = ids.filter(function (id) { return isBot(id) || P.roster.some(function (x) { return x.id === id && x.ld === m.id; }); }).length;
      card('<p class="pt-kicker">Manche ' + (P.st.round + 1) + ' · ' + esc(gameById(mode.game).name) + '</p><h2>' + esc(mode.name) + '</h2><p>' + esc(mode.desc) + '</p>' +
        teamsHtml(m) + '<p class="pt-wait">' + (P.adapter ? "En attente des joueurs… " + ok + "/" + ids.length : "Chargement du jeu…") + '</p>');
      return;
    }
    if ((m.status === "play" || m.status === "stop") && !P.run && P.adapter) startRun(m, mode);
    if (m.status === "stop" && P.run && !P.run.final) finishLocal("stop");
    if (m.status === "done") { if (P.run && !P.run.final) finishLocal("stop"); results(m); }
  }
  function startRun(m, mode) {
    var r = P.run = { id: m.id, mode: mode, cur: 0, best: 0, tries: 0, t0: 0, dead: false, final: false, res: null, txt: "" };
    r.ctx = ctxFor(m, mode);
    r.left = function () { return r.t0 ? (mode.dur || 0) - (now() - r.t0) / 1000 : (mode.dur || 0); };
    var late = m.goAt && now() - m.goAt > 15000;   // page rechargée en cours de manche
    var n = late ? 0 : COUNTDOWN;
    var stage = document.querySelector("[data-game], [data-merger], [data-dice], [data-kingdice], [data-defense], [data-idle], canvas");
    if (stage && stage.scrollIntoView) try { stage.scrollIntoView({ block: "start", behavior: "smooth" }); } catch (e) {}
    function tick() {
      if (n > 0) { card('<div class="pt-count">' + n + '</div><p class="pt-sub">' + esc(mode.name) + '</p>' + (mode.tip ? '<p class="pt-tip">' + esc(mode.tip) + '</p>' : ""), true); n--; setTimeout(tick, 1000); return; }
      closeCard();
      banner("C'est parti !", 1100);
      r.t0 = now();
      try { P.adapter.start(r.ctx); } catch (e) { if (window.console) console.error(e); }
      P.score(0);
      r.timer = setInterval(function () {
        if (r.final) { clearInterval(r.timer); hud(); return; }
        if (mode.dur && r.left() <= 0) finishLocal("time");
        hud();
      }, 250);
      hud();
    }
    tick();
  }
  function finishLocal(why) {
    var r = P.run; if (!r || r.final) return;
    r.forced = why;
    var out = null;
    try { out = P.adapter && P.adapter.stop ? P.adapter.stop(why) : null; } catch (e) {}
    if (out && out.score != null) P.score(out.score);
    if (!r.final) submit({ al: !r.dead, dn: !!(out && out.done) });
    banner(why === "time" ? "Temps écoulé !" : "Fin de la manche !", 1800);
  }

  /* =====================================================================
     Interface commune (calque, bandeau, HUD, émotes)
     ===================================================================== */
  var ui = {};
  function el(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; (parent || document.body).appendChild(e); return e; }
  function ensureUi() {
    if (ui.root) return;
    ui.root = el("div", "pt-root");
    ui.feed = el("div", "pt-feed", ui.root);
    if (P.inGame) {
      ui.hud = el("div", "pt-hud", ui.root); ui.hud.hidden = true;
      ui.board = el("div", "pt-board", ui.root); ui.board.hidden = true;
      ui.banner = el("div", "pt-banner", ui.root); ui.banner.hidden = true;
      ui.ov = el("div", "pt-overlay", ui.root); ui.ov.hidden = true;
      ui.card = el("div", "pt-card", ui.ov);
      ui.card.addEventListener("click", function (e) {
        var a = e.target.closest("[data-pt]"); if (!a) return;
        if (a.dataset.pt === "back") location.href = "jeux.html#versus";
        if (a.dataset.pt === "stay") { closeCard(); clearTimeout(ui.autoBack); }
      });
      ui.board.addEventListener("click", function () { ui.board.classList.toggle("is-min"); });
    }
    // émotes
    ui.emoBtn = el("button", "pt-emo-btn", ui.root);
    ui.emoBtn.type = "button"; ui.emoBtn.textContent = "😀"; ui.emoBtn.title = "Émotes (T)"; ui.emoBtn.setAttribute("aria-label", "Envoyer une émote (touche T)");
    ui.wheel = el("div", "pt-wheel", ui.root); ui.wheel.hidden = true;
    ui.wheel.innerHTML = EMOTES.map(function (x, i) { return '<button type="button" data-emo="' + i + '"><span>' + x.e + '</span><small>' + (i < 10 ? '<b>' + ((i + 1) % 10) + '</b> ' : "") + esc(x.t) + '</small></button>'; }).join("");
    ui.emoBtn.addEventListener("click", function () { toggleWheel(); });
    ui.wheel.addEventListener("click", function (e) { var b = e.target.closest("[data-emo]"); if (b) { P.emote(+b.dataset.emo); toggleWheel(false); } });
    document.addEventListener("keydown", function (e) {
      var tg = e.target && e.target.tagName;
      if (tg === "INPUT" || tg === "TEXTAREA" || tg === "SELECT" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (!P.code && !bridge) return;
      if (!ui.wheel.hidden) {
        var k = e.key;
        if (/^[0-9]$/.test(k)) { P.emote(k === "0" ? 9 : +k - 1); toggleWheel(false); e.preventDefault(); e.stopPropagation(); return; }
        if (k === "Escape" || k === "t" || k === "T") { toggleWheel(false); e.preventDefault(); e.stopPropagation(); return; }
      } else if (e.key === "t" || e.key === "T") { toggleWheel(true); e.preventDefault(); e.stopPropagation(); }
    }, true);
  }
  function toggleWheel(on) { ui.wheel.hidden = on == null ? !ui.wheel.hidden : !on; ui.emoBtn.classList.toggle("is-on", !ui.wheel.hidden); }
  var lastEmo = 0;
  P.emote = function (i) {
    if (!EMOTES[i] || now() - lastEmo < 1200) return;
    if (P.me && P.code) { lastEmo = now(); send("emo", { id: P.me.id, i: i }); showEmote(P.me.id, i); return; }
    if (bridge) { lastEmo = now(); var pr = profile(); try { bridge.send(i, pr.name, pr.color); } catch (e) {} showEmoteRaw({ n: pr.name, c: pr.color }, i); }
  };
  /* Émotes dans les salons en ligne propres aux jeux (hors party) :
       Party.emoteBridge({ send: function (i, name, color) { ...diffuser dans le salon du jeu... } })
       Party.emoteFrom(name, i, color)  à la réception
       Party.emoteBridgeOff()           en quittant le salon */
  var bridge = null;
  P.emoteBridge = function (o) {
    if (P.code && P.inGame) return false;   // la party s'en occupe déjà
    bridge = o; ensureUi(); ui.emoBtn.hidden = false; return true;
  };
  P.emoteBridgeOff = function () {
    bridge = null;
    if (ui.emoBtn && !P.code) { ui.emoBtn.hidden = true; toggleWheel(false); }
  };
  // raccourci pour un canal Supabase Realtime (à appeler avant ch.subscribe)
  P.emoteChannel = function (ch, nameFn) {
    if (!ch || (P.code && P.inGame)) return;
    try { ch.on("broadcast", { event: "emo" }, function (m) { var d = m.payload || {}; P.emoteFrom(d.n, d.i, d.c); }); } catch (e) { return; }
    P.emoteBridge({ ch: ch, send: function (i, n, c) { try { ch.send({ type: "broadcast", event: "emo", payload: { n: (nameFn && nameFn()) || n, i: i, c: c } }); } catch (e) {} } });
  };
  P.emoteChannelOff = function (ch) { if (bridge && (!ch || bridge.ch === ch)) P.emoteBridgeOff(); };
  P.emoteFrom = function (name, i, color) { if (EMOTES[i]) showEmoteRaw({ n: String(name || "?").slice(0, 16), c: /^#[0-9a-f]{6}$/i.test(color || "") ? color : "#888" }, i); };
  function memberOf(id) { var m = P.st && P.st.members[id]; if (m) return m; var x = P.roster.filter(function (r) { return r.id === id; })[0]; return x ? { n: x.n, c: x.c, a: x.a } : { n: "?", c: "#888", a: "🐿️" }; }
  P.memberOf = memberOf;
  function showEmote(id, i) {
    var x = EMOTES[i]; if (!x) return;
    emit("emote", { id: id, i: i, e: x.e, t: x.t });
    showEmoteRaw(memberOf(id), i);
  }
  function showEmoteRaw(m, i) {
    var x = EMOTES[i]; if (!x || !ui.feed) return;
    var b = el("div", "pt-emo", ui.feed);
    b.style.setProperty("--pc", m.c || "#888");
    b.innerHTML = '<span class="pt-emo-e">' + x.e + '</span><span><b>' + esc(m.n) + '</b> ' + esc(x.t) + '</span>';
    setTimeout(function () { b.classList.add("is-out"); }, 3200);
    setTimeout(function () { b.remove(); }, 3700);
    while (ui.feed.children.length > 4) ui.feed.firstChild.remove();
  }

  function card(html, plain) {
    ensureUi(); if (!ui.ov) return;
    ui.card.innerHTML = html; ui.card.classList.toggle("is-plain", !!plain); ui.ov.hidden = false;
  }
  function closeCard() { if (ui.ov) ui.ov.hidden = true; }
  function banner(t, ms) {
    ensureUi(); if (!ui.banner) return;
    ui.banner.textContent = t; ui.banner.hidden = false; ui.banner.classList.remove("is-pop"); void ui.banner.offsetWidth; ui.banner.classList.add("is-pop");
    clearTimeout(ui.banT); ui.banT = setTimeout(function () { ui.banner.hidden = true; }, ms || 1500);
  }
  P.banner = banner;
  function backBtn() { return '<div class="pt-actions"><button class="btn" type="button" data-pt="back">Retour au salon</button></div>'; }
  function teamsHtml(m) {
    return '<div class="pt-teams">' + m.teams.map(function (t, i) {
      return (i ? '<span class="pt-vs">VS</span>' : "") + '<span class="pt-team">' + t.map(function (id) { var mb = memberOf(id); return '<span class="pt-chip" style="--pc:' + esc(mb.c) + '">' + esc(mb.a) + " " + esc(mb.n) + "</span>"; }).join("") + "</span>";
    }).join("") + "</div>";
  }
  P.teamsHtml = teamsHtml;
  P.scoreText = function (mode, s, row) {
    if (row && mode.rank === "race" && row.dn) return fmtTime(row.t) + (mode.unit ? "" : "");
    if (row && mode.rank === "survive" && row.al) return "en vie · " + (s || 0) + (mode.unit ? " " + mode.unit : "");
    return (s || 0).toLocaleString("fr-FR") + (mode.unit ? " " + mode.unit : "");
  };
  function hud() {
    var r = P.run; if (!ui.hud || !r) return;
    ui.hud.hidden = false; ui.board.hidden = false;
    var left = r.left();
    ui.hud.innerHTML = '<span class="pt-hud-mode">' + esc(r.mode.name) + '</span>' +
      (r.mode.dur ? '<span class="pt-hud-time' + (left < 15 && !r.final ? " is-low" : "") + '">⏱ ' + fmtTime(left) + "</span>" : "") +
      (r.final ? '<span class="pt-hud-wait">' + (r.dead ? "Éliminé · " : "Terminé · ") + "en attente des autres…</span>" : "");
    hudScores();
  }
  function hudScores() {
    var m = P.st && P.st.match; if (!ui.board || !m || !P.run) return;
    var mode = modeById(m.mode);
    var rows = m.teams.map(function (t, i) {
      return '<div class="pt-brow-team">' + (m.teams.length > 1 && t.length > 1 ? '<i>Équipe ' + (i + 1) + '</i>' : "") + t.map(function (id) {
        var mb = memberOf(id), l = P.live[id] || {}, done = m.res[id];
        var dead = (done && !done.al) || l.al === false;
        return '<div class="pt-brow' + (id === P.me.id ? " is-me" : "") + (dead ? " is-dead" : "") + '" style="--pc:' + esc(mb.c) + '"><span>' + esc(mb.a) + " " + esc(mb.n) + '</span><b>' + (dead && mode.rank === "survive" ? "☠ " : "") + (l.s || 0).toLocaleString("fr-FR") + "</b></div>";
      }).join("") + "</div>";
    });
    ui.board.innerHTML = rows.join("");
  }
  function results(m) {
    if (ui.shown === m.id + m.status) return;
    ui.shown = m.id + m.status;
    if (P.run && P.run.timer) clearInterval(P.run.timer);
    if (ui.hud) ui.hud.hidden = true;
    var mode = modeById(m.mode), s = P.st;
    var rows = (m.rows || []).map(function (r) {
      var gain = m.gain[r.ids[0]] || 0;
      return '<li class="pt-rrow place-' + r.place + '"><span class="pt-place">' + (["🥇", "🥈", "🥉"][r.place - 1] || r.place + "ᵉ") + '</span><span class="pt-who">' +
        r.ids.map(function (id) { var mb = memberOf(id); return '<span class="pt-chip" style="--pc:' + esc(mb.c) + '">' + esc(mb.a) + " " + esc(mb.n) + "</span>"; }).join("") +
        '</span><span class="pt-sc">' + esc(P.scoreText(mode, r.s, r)) + '</span><span class="pt-gain">' + (gain ? "+" + gain : "") + "</span></li>";
    }).join("");
    var champ = s.champ ? '<p class="pt-champ">🏆 ' + s.champ.map(function (id) { return esc(memberOf(id).n); }).join(" & ") + " remporte la party !</p>" : "";
    card('<p class="pt-kicker">Manche ' + s.round + " · " + esc(mode.name) + '</p><h2>Résultats</h2><ol class="pt-results">' + rows + "</ol>" + champ +
      '<div class="pt-actions"><button class="btn" type="button" data-pt="back">Retour au salon</button><button class="btn btn-ghost" type="button" data-pt="stay">Voir le jeu</button></div><p class="pt-sub">Retour automatique dans 15 s</p>');
    clearTimeout(ui.autoBack);
    ui.autoBack = setTimeout(function () { location.href = "jeux.html#versus"; }, 15000);
  }

  /* ---------- démarrage ---------- */
  function boot() {
    var isHub = !!document.querySelector("[data-vs-app]");
    P.inGame = /^#party/.test(location.hash) && !!(sess && sess.code);
    if (sess && sess.code && (isHub || P.inGame)) {
      P.code = sess.code; P.me = sess.me; P.st = cleanState(sess.st);
      var pr = profile(); P.me.n = pr.name; P.me.c = pr.color; P.me.a = pr.av;
      if (P.inGame) document.documentElement.classList.add("party-game");
      if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
    } else if (isHub) {
      if (document.body) ensureUi(); else document.addEventListener("DOMContentLoaded", ensureUi);
    }
    function start() {
      ensureUi(); connect();
      if (P.inGame) {
        try { history.replaceState(null, "", location.pathname + location.search + "#party"); } catch (e) {}
        gameState();
      }
    }
  }
  P.ensureUi = ensureUi;
  P.connectNow = function () { ensureUi(); };
  boot();
})();
