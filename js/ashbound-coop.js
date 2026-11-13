/* Ashbound Tower — coopération en ligne à 2 joueurs.
   Architecture : l'HÔTE exécute toute la simulation (ennemis, vagues, dégâts, économie) et envoie des instantanés (~12/s).
   L'INVITÉ exécute le même moteur en « mode miroir » : il ne fait que prédire les mouvements et rejouer les effets visuels
   (dégâts neutralisés) ; ses entrées (déplacement, visée, attaque, compétences, constructions) sont envoyées à l'hôte.
   Transport : Supabase Realtime (diffusion par salon, comme le Billard) ; repli BroadcastChannel (même navigateur) pour les tests (?net=bc). */
(function () {
  "use strict";
  window.AshCoop = function (E) {
    var EVENTS = ["join", "welcome", "full", "pick", "start", "snap", "in", "act", "hev", "req", "msg", "leave"];
    var STATES = ["select", "prep", "play", "win", "lose"];
    var ETYPES = Object.keys(E.ENEMY), TTYPES = Object.keys(E.TOWERS);
    var CODE_CH = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    var NET = fresh();

    function fresh() {
      return { mode: "off", code: "", tx: null, id: Math.random().toString(36).slice(2, 9), peer: null, hostId: null, connected: false, myPick: null, peerPick: null, started: false,
        seq: 0, snapAt: 0, inAt: 0, lastSnap: 0, lastIn: 0, emap: {}, joinTry: 0, joinAt: 0, subscribed: false, subAt: 0, err: "" };
    }
    function now() { return performance.now(); }
    function q(x) { return Math.round(x * 100) / 100; }
    function newCode() { var s = ""; for (var i = 0; i < 4; i++) s += CODE_CH.charAt(Math.floor(Math.random() * CODE_CH.length)); return s; }

    // ---------- transport ----------
    function openTransport(code, onEvent, onStatus) {
      var sb = (window.SITE || {}).supabase, forceBc = /[?&]net=bc/.test(location.search);
      if ((forceBc || !(window.supabase && window.supabase.createClient && sb)) && "BroadcastChannel" in window) {
        var bc = new BroadcastChannel("ashbound-room-" + code);
        bc.onmessage = function (m) { if (m.data) onEvent(m.data.ev, m.data.p || {}); };
        setTimeout(function () { onStatus("SUBSCRIBED"); }, 0);
        return { send: function (ev, p) { try { bc.postMessage({ ev: ev, p: p }); } catch (e) {} }, close: function () { try { bc.close(); } catch (e) {} } };
      }
      if (!(window.supabase && window.supabase.createClient && sb)) { setTimeout(function () { onStatus("CHANNEL_ERROR"); }, 0); return null; }
      var cl = window.supabase.createClient(sb.url, sb.key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 40 } } });
      var ch = cl.channel("ashbound-room-" + code, { config: { broadcast: { self: false, ack: false } } });
      EVENTS.forEach(function (ev) { ch.on("broadcast", { event: ev }, function (m) { try { onEvent(ev, m.payload || {}); } catch (err) { if (window.console) console.error(err); } }); });
      ch.subscribe(function (status) { onStatus(status); });
      return { send: function (ev, p) { try { ch.send({ type: "broadcast", event: ev, payload: p }); } catch (e) {} }, close: function () { try { cl.removeChannel(ch); } catch (e) {} } };
    }
    function send(ev, p) { if (!NET.tx) return; p = p || {}; p.from = NET.id; NET.tx.send(ev, p); }

    function open(code) {
      NET.code = code; NET.subAt = now();
      NET.tx = openTransport(code, onEvent, function (st) {
        if (st === "SUBSCRIBED") NET.subscribed = true;
        else if (st === "CHANNEL_ERROR" || st === "TIMED_OUT") drop("Connexion impossible au serveur de jeu. Réessaie dans un moment.");
      });
    }

    // ---------- salon ----------
    function host() { leave(); NET = fresh(); NET.mode = "host"; open(newCode()); E.G.coopMenu = false; }
    function join(code) {
      code = String(code || "").toUpperCase().replace(/[^A-Z]/g, "");
      if (code.length !== 4) { E.toast("Code invalide : 4 lettres", "#ff8a8a"); return; }
      leave(); NET = fresh(); NET.mode = "guest"; NET.joinAt = 0; open(code);
    }
    function leave() {
      if (NET.tx) { send("leave", {}); try { NET.tx.close(); } catch (e) {} }
      NET = fresh();
    }
    function drop(msg) { leave(); E.resetCore(false); if (msg) E.toast(msg, "#ff8a8a"); }

    function pick(id) {
      NET.myPick = id; send("pick", { id: id });
      if (NET.mode === "host") maybeStart();
    }
    function maybeStart() {
      if (NET.mode !== "host" || NET.started || !NET.connected || !NET.myPick || !NET.peerPick) return;
      startGame([NET.myPick, NET.peerPick]);
    }
    function startGame(ids) {
      E.setHeroes(ids, 0, false); NET.started = true; NET.emap = {}; NET.lastIn = now(); NET.snapAt = 0;
      send("start", { h: ids });
    }
    function restart() {
      if (NET.mode !== "host") return;
      var ids = E.G.heroes.map(function (h) { return h.id; }); if (!ids.length) return;
      startGame(ids);
    }

    // ---------- actions locales -> réseau ----------
    function onAction(h, key, aim) {
      if (!NET.started || h !== E.G.hero) return;
      if (NET.mode === "host") send("hev", { i: 0, key: key, a: q(aim.a), d: q(aim.d) });
      else if (key !== "atk") send("act", { key: key, a: q(aim.a), d: q(aim.d) });
    }
    function req(r) { if (NET.mode === "guest" && NET.started) send("req", r); }
    function msg(t) { if (NET.mode === "host" && NET.peer) send("msg", { to: NET.peer, t: t }); }

    // ---------- réception ----------
    function onEvent(ev, p) {
      if (p.from === NET.id) return;
      if (p.to && p.to !== NET.id) return;
      var G = E.G;
      if (NET.mode === "host") {
        if (ev === "join") {
          if (NET.peer && NET.peer !== p.from) { send("full", { to: p.from }); return; }
          var was = NET.connected; NET.peer = p.from; NET.connected = true; NET.lastIn = now();
          send("welcome", { to: p.from, pick: NET.myPick });
          if (!NET.started && !was) E.toast("Ami connecté !", "#9bffd0");
          else { NET.started = true; send("start", { h: G.heroes.map(function (h) { return h.id; }) }); }
        } else if (p.from !== NET.peer) return;
        else if (ev === "pick") { NET.peerPick = p.id; maybeStart(); }
        else if (ev === "in") {
          NET.lastIn = now(); var h1 = G.heroes[1]; if (h1) h1.ctrl = { mx: +p.mx || 0, mz: +p.mz || 0, a: +p.a || 0, d: +p.d || 6, ah: !!p.ah };
        } else if (ev === "act") { var h2 = G.heroes[1]; if (h2) E.doCast(h2, p.key, { a: +p.a || 0, d: +p.d || 5 }, false); }
        else if (ev === "req") {
          if (p.k === "start") E.startSeq();
          else if (p.k === "build") { var sl = E.slots()[p.s]; if (sl && E.TOWERS[p.ty]) E.tryBuild(sl, p.ty, true); }
          else if (p.k === "up") { var s2 = E.slots()[p.s]; if (s2 && s2.tower) E.tryUpgrade(s2.tower, true); }
        } else if (ev === "leave") {
          NET.connected = false; NET.peer = null; NET.peerPick = null;
          if (NET.started && G.heroes.length > 1) { G.heroes.splice(1, 1); E.toast("Ton ami a quitté la partie", "#ffb0dc"); NET.started = true; }
          else E.toast("Ton ami a quitté le salon", "#ffb0dc");
        }
        return;
      }
      // invité
      if (ev === "welcome") { NET.connected = true; NET.hostId = p.from; NET.err = ""; if (p.pick) NET.peerPick = p.pick; if (NET.myPick) send("pick", { id: NET.myPick }); return; }
      if (ev === "full") { drop("Ce salon est déjà complet."); return; }
      if (p.from !== NET.hostId) return;
      if (ev === "pick") NET.peerPick = p.id;
      else if (ev === "start") { E.setHeroes(p.h, 1, true); NET.started = true; NET.emap = {}; NET.seq = 0; NET.lastSnap = now(); }
      else if (ev === "snap") { if (NET.started) apply(p); }
      else if (ev === "hev") {
        var h = G.heroes[p.i]; if (!h || h === G.hero) return;
        if (p.key === "atk") E.replAttack(h, +p.a || 0, +p.d || 6); else E.doCast(h, p.key, { a: +p.a || 0, d: +p.d || 5 }, true);
      } else if (ev === "msg") E.toast(p.t, "#ff8a8a");
      else if (ev === "leave") drop("L'hôte a quitté la partie.");
    }

    // ---------- instantanés ----------
    function encode() {
      var G = E.G, slots = E.slots();
      return { n: ++NET.seq, st: STATES.indexOf(G.state), t: q(G.t), w: G.wave, g: G.gold, xp: G.xp, lv: G.lvl, hp: Math.round(G.heart * 10) / 10, k: G.kills, rem: G.enemies.length + (G.events.length - G.next),
        H: G.heroes.map(function (h) { return [q(h.x), q(h.z), q(h.face), h.moving ? 1 : 0, h.swing > 0 ? 1 : 0, (h.k && h.k.pose) || "", Math.round(h.cd.s1 * 10), Math.round(h.cd.s2 * 10), Math.round(h.cd.ult * 10), h.kit.netOut ? h.kit.netOut(h) : 0, Math.round(h.hp), h.mhp, h.dead ? 1 : 0, Math.round(h.rv * 100)]; }),
        P: G.eprojs.slice(0, 30).map(function (p) { return [q(p.x), q(p.z), q(p.vx), q(p.vz), q(p.life)]; }),
        E: G.enemies.map(function (e) { return [e.id, ETYPES.indexOf(e.k), q(e.d), q(e.lat), q(e.ox), q(e.oz), Math.round(e.hp), Math.round(e.mhp), e.stun > 0 ? 1 : 0, q(e.slowF), e.poison ? 1 : 0]; }),
        T: G.towers.map(function (t) { return [slots.indexOf(t.s), TTYPES.indexOf(t.type), t.tier, Math.round(t.boost * 10)]; }) };
    }
    function apply(s) {
      var G = E.G, slots = E.slots(), LEN = E.LEN();
      if (s.n <= NET.seq) return; NET.seq = s.n; NET.lastSnap = now();
      var prev = G.state; G.state = STATES[s.st] || G.state;
      if (G.state !== prev) { if (G.state === "win") E.play("win", 1); else if (G.state === "lose") E.play("lose", 1); else if (G.state === "play" && prev === "prep") E.play("wave", .8); }
      G.t = s.t; G.gold = s.g; G.kills = s.k; G.rem = s.rem; G.xp = s.xp || 0;
      if (s.lv > G.lvl) { G.lvl = s.lv; G.dmgMul = 1 + .08 * (G.lvl - 1); E.toast("NIVEAU " + G.lvl + " ! PV et dégâts accrus", "#ffe680"); E.play("upgrade", 1); G.heroes.forEach(function (h) { G.fx.push({ k: "ring", x: h.x, z: h.z, r: 2.6, t: 0, dur: .7, col: "#ffe680" }); }); }
      if (s.w !== G.wave) { G.wave = s.w; if (s.w) { E.toast(E.WAVES[s.w - 1][0], E.PINKL); E.play("wave", .7); } }
      if (s.hp < G.heart - 0.01) { G.shake = .3; G.flashHeart = .35; E.play("heart_hit", 1); }
      G.heart = s.hp;
      // héros
      s.H.forEach(function (a, i) {
        var h = G.heroes[i]; if (!h) return;
        var local = h === G.hero;
        ["s1", "s2", "ult"].forEach(function (k, j) { var v = a[6 + j] / 10; if (v > h.cd[k] + .05) h.cd[k] = v; });   // on ne fait que relever la recharge (le lancement local est déjà pris en compte)
        if (local) { if (Math.hypot(a[0] - h.x, a[1] - h.z) > 1.8) { h.x = a[0]; h.z = a[1]; } }
        else { h.netT = { x: a[0], z: a[1] }; if (!h.netInit || Math.hypot(a[0] - h.x, a[1] - h.z) > 3) { h.x = a[0]; h.z = a[1]; h.netInit = true; } h.face = a[2]; h.netMoving = !!a[3]; if (a[5]) h.k.pose = a[5]; }
        if (a[9] && h.kit.netIn) h.kit.netIn(h, a[9]);
        if (a.length > 10) {   // vie, état « à terre », progression de la ranimation
          if (a[10] < h.hp - .5) { h.hflash = .2; G.floats.push({ x: E.sx(h.x), y: E.sy(h.z) - 70, txt: "-" + Math.round(h.hp - a[10]), col: "#ff6a6a", t: 0 }); E.play("hit", .4); if (local) G.shake = Math.max(G.shake, .12); }
          h.hp = a[10]; h.mhp = a[11]; h.rv = a[13] / 100;
          if (a[12] && !h.dead) { h.dead = true; h.dash = null; E.burst(E.sx(h.x), E.sy(h.z) - 30, "#ff6a8a", 18, 150, .8, 5); E.toast((h.kit.short || h.kit.name) + " est à terre !", "#ff8a8a"); }
          else if (!a[12] && h.dead) { h.dead = false; G.fx.push({ k: "ring", x: h.x, z: h.z, r: 2.6, t: 0, dur: .7, col: "#9bffd0" }); E.toast((h.kit.short || h.kit.name) + " est de retour !", "#9bffd0"); E.play("upgrade", .8); }
        }
      });
      G.eprojs = (s.P || []).map(function (a) { return { x: a[0], z: a[1], vx: a[2], vz: a[3], life: a[4], dmg: 0, r: .55 }; });
      // ennemis
      var seen = {};
      s.E.forEach(function (a) {
        var id = a[0], e = NET.emap[id]; seen[id] = 1;
        if (!e) { e = E.mkEnemy(ETYPES[a[1]], id); e.d = a[2]; NET.emap[id] = e; G.enemies.push(e); }
        if (Math.abs(a[2] - e.d) > .6) e.d = a[2]; else e.d += (a[2] - e.d) * .5;
        e.lat = a[3]; e.ox = a[4]; e.oz = a[5];
        if (a[6] < e.hp - .5) { e.flash = .1; e.barT = 0; e.spark = .16; e.sx = (Math.random() - .5) * 14; e.sy = (Math.random() - .5) * 12; }
        e.hp = a[6]; e.mhp = a[7]; e.stun = a[8] ? Math.max(e.stun, .15) : Math.min(e.stun, .05); e.slowF = a[9]; e.slowT = a[9] < 1 ? .3 : 0; e.poison = a[10] ? { dps: 1, t: 1 } : null;
      });
      G.enemies = G.enemies.filter(function (e) {
        if (seen[e.id]) return true;
        if (e.d < LEN - 1.2) { var p = E.ep(e), X = E.sx(p.x), Y = E.sy(p.z) - 20; E.burst(X, Y, "#b278ff", 10 + (e.def.kind === "boss" ? 40 : e.def.kind === "mini" ? 24 : e.def.kind === "elite" ? 12 : 0), 140, .7, 5); E.play("death", .5); }
        delete NET.emap[e.id]; return false;
      });
      // tourelles
      s.T.forEach(function (a) {
        var sl = slots[a[0]]; if (!sl) return; var type = TTYPES[a[1]], t = sl.tower;
        if (!t || t.type !== type) {
          t = { s: sl, tier: a[2], cd: 0, punch: 1, type: type, st: E.tstats(E.TOWERS[type], a[2]), salvo: 0, boost: 1 }; sl.tower = t; G.towers = G.towers.filter(function (o) { return o.s !== sl; }); G.towers.push(t);
          E.play("build", .8); E.burst(E.sx(sl.x), E.sy(sl.z), "#8c85bf", 16, 110, .7, 5);
        } else if (t.tier !== a[2]) { t.tier = a[2]; t.st = E.tstats(E.TOWERS[type], t.tier); t.punch = 1; E.play("upgrade", .8); }
      });
    }

    // ---------- boucle ----------
    function tick(dt) {
      if (NET.mode === "off") return;
      var t = now(), G = E.G;
      if (!NET.subscribed && NET.tx && t - NET.subAt > 10000) { drop("Connexion au serveur de jeu impossible."); return; }
      if (NET.mode === "guest" && NET.subscribed && !NET.connected) {
        if (t - NET.joinAt > 700) { NET.joinAt = t; NET.joinTry++; if (NET.joinTry > 14) { drop("Salon introuvable : vérifie le code."); return; } send("join", {}); }
      }
      if (!NET.started) return;
      if (NET.mode === "host") {
        if (t - NET.snapAt >= 80) { NET.snapAt = t; send("snap", encode()); }
        var h1 = G.heroes[1];
        if (h1) {
          if (h1.ctrl && t - NET.lastIn > 1500) h1.ctrl = null;
          if (t - NET.lastIn > 9000) { G.heroes.splice(1, 1); NET.connected = false; NET.peer = null; E.toast("Ton ami est déconnecté", "#ffb0dc"); }
        }
      } else {
        if (t - NET.inAt >= 80) { NET.inAt = t; var dead = G.hero && G.hero.dead, mv = dead ? { x: 0, z: 0 } : E.moveVec(), a = E.aimAtk(); send("in", { mx: q(mv.x), mz: q(mv.z), a: q(a.a), d: q(a.d), ah: !dead && E.attackHeld() ? 1 : 0 }); }
        if (NET.lastSnap && t - NET.lastSnap > 8000) { drop("Connexion perdue avec l'hôte."); return; }
        G.heroes.forEach(function (h) { if (h !== G.hero && h.netT) { var k = Math.min(1, dt * 12); h.x += (h.netT.x - h.x) * k; h.z += (h.netT.z - h.z) * k; } });   // lissage du partenaire
      }
    }

    function info() {
      var host = NET.mode === "host", both = NET.myPick && NET.peerPick;
      if (host) return { line1: "Salon " + NET.code + (NET.connected ? " · ami connecté ✓" : " · en attente d'un ami…"), line2: NET.connected ? (both ? "Lancement de la partie…" : "Choisissez chacun votre héros : la partie démarre quand vous avez tous les deux choisi.") : "Donne-lui le code, ou envoie le lien (bouton « Copier le lien »)." };
      return { line1: NET.connected ? "Salon " + NET.code + " · connecté à l'hôte ✓" : "Connexion au salon " + NET.code + "…", line2: NET.connected ? (both ? "En attente du lancement par l'hôte…" : "Choisis ton héros : la partie démarre quand vous avez tous les deux choisi.") : "Un instant…" };
    }
    function copyLink() {
      var url = location.origin + location.pathname + "?room=" + NET.code;
      try { if (navigator.share) { navigator.share({ title: "Ashbound Tower — coop", text: "Rejoins ma partie !", url: url }).catch(function () {}); return; } } catch (e) {}
      try { navigator.clipboard.writeText(url).then(function () { E.toast("Lien copié !", "#9bffd0"); }, function () { window.prompt("Copie ce lien :", url); }); } catch (e) { window.prompt("Copie ce lien :", url); }
    }

    return {
      active: function () { return NET.mode !== "off"; }, isHost: function () { return NET.mode === "host"; }, started: function () { return NET.started; },
      code: function () { return NET.code; }, myPick: function () { return NET.myPick; }, peerPick: function () { return NET.peerPick; }, info: info,
      host: host, join: join, leave: leave, pick: pick, req: req, msg: msg, onAction: onAction, tick: tick, restart: restart, copyLink: copyLink,
      debug: function () { return { mode: NET.mode, connected: NET.connected, started: NET.started, seq: NET.seq, peer: NET.peer }; }
    };
  };
})();
