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
    var ETYPES = Object.keys(E.ENEMY), TTYPES = Object.keys(E.TOWERS), SPECS = ["", "solar", "constrictor", "spore"], WK = ["zone", "pool", "link", "breach"];
    var CODE_CH = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    var NET = fresh();

    function fresh() {
      return { mode: "off", code: "", tx: null, id: Math.random().toString(36).slice(2, 9), peer: null, hostId: null, connected: false, myPick: null, peerPick: null, started: false,
        seq: 0, snapAt: 0, inAt: 0, lastInT: 0, joinedAt: 0, sig: "", sigAt: 0, lastAct: 0, lastInSent: "", lastSnap: 0, lastIn: 0, emap: {}, joinTry: 0, joinAt: 0, subscribed: false, subAt: 0, err: "" };
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
          var was = NET.connected; NET.peer = p.from; NET.connected = true; NET.lastIn = now(); NET.joinedAt = NET.lastIn;
          send("welcome", { to: p.from, pick: NET.myPick });
          if (!NET.started && !was) E.toast("Ami connecté !", "#9bffd0");
          else { NET.started = true; send("start", { h: G.heroes.map(function (h) { return h.id; }) }); }
        } else if (p.from !== NET.peer) return;
        else if (ev === "pick") { NET.peerPick = p.id; maybeStart(); }
        else if (ev === "in") {
          NET.lastIn = now(); if (+p.mx || +p.mz || +p.ah) NET.lastAct = NET.lastIn; var h1 = G.heroes[1]; if (h1) h1.ctrl = { mx: +p.mx || 0, mz: +p.mz || 0, a: +p.a || 0, d: +p.d || 6, ah: !!p.ah };
        } else if (ev === "act") { NET.lastAct = now(); var h2 = G.heroes[1]; if (h2) E.doCast(h2, p.key, { a: +p.a || 0, d: +p.d || 5 }, false); }
        else if (ev === "req") {
          NET.lastAct = now();
          if (p.k === "start") E.startSeq();
          else if (p.k === "build") { var sl = E.slots()[p.s]; if (sl && E.TOWERS[p.ty]) E.tryBuild(sl, p.ty, true); }
          else if (p.k === "pick") E.applyPick(G.heroes[1], p.id, true);
          else if (p.k === "sell") { var s3 = E.slots()[p.s]; if (s3 && s3.tower) E.trySell(s3.tower, true); }
          else if (p.k === "trap") E.trapBuild(+p.d || 0);
          else if (p.k === "tup") E.trapUp(+p.id, p.sp || null);
          else if (p.k === "tsell") E.trapSell(+p.id);
          else if (p.k === "tres") E.trapReseed(+p.id);
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
      return { n: ++NET.seq, st: STATES.indexOf(G.state), t: q(G.t), w: G.wave, g: G.gold, xp: G.xp, lv: G.lvl, hp: Math.round(G.heart * 10) / 10, k: G.kills, rem: G.enemies.length + (G.events.length - G.next), sq: G.seq, ct: Math.round(G.corrT * 100),
        H: G.heroes.map(function (h) { return [q(h.x), q(h.z), q(h.face), h.moving ? 1 : 0, h.swing > 0 ? 1 : 0, (h.k && h.k.pose) || "", Math.round(h.cd.s1 * 10), Math.round(h.cd.s2 * 10), Math.round(h.cd.ult * 10), h.kit.netOut ? h.kit.netOut(h) : 0, Math.round(h.hp), h.mhp, h.dead ? 1 : 0, Math.round(h.rv * 100), h.pend, h.picks]; }),
        O: (NET.seq % 3 === 0 || NET.seq < 3) ? G.orbs.slice(0, 50).map(function (o) { return [Math.round(o.x * 10), Math.round(o.z * 10), Math.round(o.v), Math.round(o.t)]; }) : undefined,
        P: G.eprojs.slice(0, 30).map(function (p) { return [q(p.x), q(p.z), q(p.vx), q(p.vz), q(p.life)]; }),
        E: G.enemies.map(function (e) {
          var ex = Math.abs(e.ox) + Math.abs(e.oz) > .02, sl = e.slowF < 1, a = [e.id, ETYPES.indexOf(e.k), Math.round(e.d * 10), Math.round(e.lat * 100), Math.round(e.hp), Math.round(e.mhp), (e.stun > 0 ? 1 : 0) | (e.poison ? 2 : 0) | (ex ? 4 : 0) | (sl ? 8 : 0)];
          if (ex) a.push(Math.round(e.ox * 100), Math.round(e.oz * 100)); if (sl) a.push(Math.round(e.slowF * 100)); return a;
        }),
        Z: G.warns.slice(0, 24).map(function (w) { var sp = w.kind === "link" && w.src && !w.src.dead ? E.ep(w.src) : null; return [w.id, Math.round(w.x * 10), Math.round(w.z * 10), Math.round((w.r || 2) * 10), Math.round(w.t * 10), Math.round(w.dur * 10), WK.indexOf(w.kind), w.done ? 1 : 0, sp ? Math.round(sp.x * 10) : 0, sp ? Math.round(sp.z * 10) : 0, Math.round((w.life || 0) * 10)]; }),
        D: G.tdolls.slice(0, 40).map(function (d) { return [d.id, Math.round(d.x * 10), Math.round(d.z * 10)]; }),
        };
    }
    // listes lentes (tours, pièges) : envoyées seulement si leur signature change, plus un rappel complet toutes les 1,5 s
    function slowLists(snap) {
      var G = E.G, slots = E.slots(), T = G.towers.map(function (t) { return [slots.indexOf(t.s), TTYPES.indexOf(t.type), t.tier, t.boost > 1.01 ? 1 : 0, t.jam > 0 ? 1 : 0]; }), R = G.traps.map(function (r) { return [r.id, Math.round(r.d * 10), SPECS.indexOf(r.spec || ""), r.tier, r.wilted ? 1 : 0, r.n, Math.max(0, r.ch)]; });
      var sig = JSON.stringify([T, R]), tt = now(); if (sig !== NET.sig || tt - NET.sigAt > 1500) { NET.sig = sig; NET.sigAt = tt; snap.T = T; snap.R = R; } return snap;
    }
    function apply(s) {
      var G = E.G, slots = E.slots(), LEN = E.LEN();
      if (s.n <= NET.seq) return; NET.seq = s.n; NET.lastSnap = now();
      var prev = G.state; G.state = STATES[s.st] || G.state;
      if (G.state !== prev) { if (G.state === "win") E.play("win", 1); else if (G.state === "lose") E.play("lose", 1); else if (G.state === "play" && prev === "prep") E.play("wave", .8); }
      if (s.sq && s.sq !== G.seq) { G.seq = s.sq; if (G.seq >= 2) { G.trans = 6.5; G.tint = .45; G.tintT = 2.5; E.play("boss", .8, .7); E.toast("Séquence 1 terminée — le monde s'éveille", "#d8b4ff"); } }
      G.corrT = (s.ct || 0) / 100;
      G.t = s.t; G.gold = s.g; G.kills = s.k; G.rem = s.rem; G.xp = s.xp || 0;
      if (s.lv > G.lvl) { G.lvl = s.lv; G.lvlFlash = 1; G.dmgMul = 1 + .08 * (G.lvl - 1); E.toast("NIVEAU " + G.lvl + " ! PV et dégâts accrus", "#ffe680"); E.play("upgrade", 1); G.heroes.forEach(function (h) { G.fx.push({ k: "ring", x: h.x, z: h.z, r: 2.6, t: 0, dur: .7, col: "#ffe680" }); }); }
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
          if (a[15]) { h.pend = a[14]; if (JSON.stringify(a[15]) !== JSON.stringify(h.picks)) { h.picks = a[15]; E.recompute(h); h.mhp = a[11]; } }
          if (a[12] && !h.dead) { h.dead = true; h.dash = null; E.burst(E.sx(h.x), E.sy(h.z) - 30, "#ff6a8a", 18, 150, .8, 5); E.toast((h.kit.short || h.kit.name) + " est à terre !", "#ff8a8a"); }
          else if (!a[12] && h.dead) { h.dead = false; G.fx.push({ k: "ring", x: h.x, z: h.z, r: 2.6, t: 0, dur: .7, col: "#9bffd0" }); E.toast((h.kit.short || h.kit.name) + " est de retour !", "#9bffd0"); E.play("upgrade", .8); }
        }
      });
      if (s.O) G.orbs = s.O.map(function (a) { return { x: a[0] / 10, z: a[1] / 10, v: a[2], t: a[3] }; });
      G.eprojs = (s.P || []).map(function (a) { return { x: a[0], z: a[1], vx: a[2], vz: a[3], life: a[4], dmg: 0, r: .55 }; });
      // ennemis
      var seen = {};
      s.E.forEach(function (a) {
        var id = a[0], e = NET.emap[id]; seen[id] = 1;
        var dd = a[2] / 10; if (!e) { e = E.mkEnemy(ETYPES[a[1]], id); e.d = dd; NET.emap[id] = e; G.enemies.push(e); }
        if (Math.abs(dd - e.d) > .6) e.d = dd; else e.d += (dd - e.d) * .5;
        var fl = a[6], i = 7; e.lat = a[3] / 100; if (fl & 4) { e.ox = a[i++] / 100; e.oz = a[i++] / 100; } else { e.ox = 0; e.oz = 0; } var sf = fl & 8 ? a[i++] / 100 : 1;
        if (a[4] < e.hp - .5) { e.flash = .1; e.barT = 0; e.spark = .16; e.sx = (Math.random() - .5) * 14; e.sy = (Math.random() - .5) * 12; }
        e.hp = a[4]; e.mhp = a[5]; e.stun = fl & 1 ? Math.max(e.stun, .15) : Math.min(e.stun, .05); e.slowF = sf; e.slowT = sf < 1 ? .3 : 0; e.poison = fl & 2 ? { dps: 1, t: 1 } : null;
      });
      G.enemies = G.enemies.filter(function (e) {
        if (seen[e.id]) return true;
        if (e.d < LEN - 1.2) { var p = E.ep(e), X = E.sx(p.x), Y = E.sy(p.z) - 20; E.burst(X, Y, e.def.col || "#b278ff", 10 + (e.def.kind === "boss" ? 40 : e.def.kind === "mini" ? 24 : e.def.kind === "elite" ? 12 : 0), 140, .7, 5); E.play(e.def.gel ? "splat" : "death", .5); }
        delete NET.emap[e.id]; return false;
      });
      // tourelles
      G.warns = (s.Z || []).map(function (a) { return { id: a[0], x: a[1] / 10, z: a[2] / 10, r: a[3] / 10, t: a[4] / 10, dur: a[5] / 10, kind: WK[a[6]], done: !!a[7], sx: a[8] / 10, sz: a[9] / 10, hasSrc: !!(a[8] || a[9]), life: a[10] / 10 }; });
      var dset = {}; (s.D || []).forEach(function (a) { dset[a[0]] = 1; var o = null; G.tdolls.forEach(function (d) { if (d.id === a[0]) o = d; }); if (!o) { o = { id: a[0], x: a[1] / 10, z: a[2] / 10 }; G.tdolls.push(o); } else { o.x += (a[1] / 10 - o.x) * .6; o.z += (a[2] / 10 - o.z) * .6; } });
      G.tdolls = G.tdolls.filter(function (d) { if (dset[d.id]) return true; G.fx.push({ k: "ring", x: d.x, z: d.z, r: 1.5, t: 0, dur: .35, col: "#8fff9a" }); E.burst(E.sx(d.x), E.sy(d.z) - 14, "#8fff9a", 8, 120, .5, 4); return false; });
      var rset = {}; if (s.R) { s.R.forEach(function (a) {
        rset[a[0]] = 1; var r = null; G.traps.forEach(function (o) { if (o.id === a[0]) r = o; });
        if (!r) { var q = E.pos({ d: a[1] / 10, lat: 0, ox: 0, oz: 0 }); r = { id: a[0], d: a[1] / 10, x: q.x, z: q.z, spec: null, tier: 0, cd: 0, ch: 6, wilted: false, pop: 1, n: a[5], spent: 0 }; G.traps.push(r); E.play("build", .7); }
        var sp = SPECS[a[2]] || null; r.spec = sp || null; r.tier = a[3]; r.wilted = !!a[4]; r.ch = a[6];
        if (r.n !== a[5]) { r.n = a[5]; r.pop = 1; E.trapFx(r, E.trapStats(r)); }
      }); G.traps = G.traps.filter(function (o) { return rset[o.id]; }); if (G.selT && !rset[G.selT.id]) G.selT = null; }
      if (s.T) { var tset = {}; s.T.forEach(function (a) { tset[a[0]] = 1; });
      slots.forEach(function (sl, i) { if (sl.tower && !tset[i]) { sl.tower = null; G.towers = G.towers.filter(function (o) { return o.s !== sl; }); if (G.sel && G.sel.s === sl) G.sel = null; } });
      s.T.forEach(function (a) {
        var sl = slots[a[0]]; if (!sl) return; var type = TTYPES[a[1]], t = sl.tower;
        if (!t || t.type !== type) {
          t = { s: sl, tier: a[2], cd: 0, punch: 1, type: type, st: E.tstats(E.TOWERS[type], a[2]), salvo: 0, boost: 1 }; sl.tower = t; G.towers = G.towers.filter(function (o) { return o.s !== sl; }); G.towers.push(t);
          E.play("build", .8); E.burst(E.sx(sl.x), E.sy(sl.z), "#8c85bf", 16, 110, .7, 5);
        } else if (t.tier !== a[2]) { t.tier = a[2]; t.st = E.tstats(E.TOWERS[type], t.tier); t.punch = 1; E.play("upgrade", .8); }
        t.boost = a[3] ? 1.2 : 1; t.jam = a[4] ? 1 : 0;
      }); }
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
        var ne = G.enemies.length, gap = 80 + Math.max(0, Math.min(70, (ne - 40) * 1.2));   // cadence adaptative : 12 instantanés/s, jusqu'à ~7/s avec beaucoup d'ennemis
        if (t - NET.snapAt >= gap) { NET.snapAt = t; send("snap", slowLists(encode())); }
        var h1 = G.heroes[1];
        if (h1) {
          if (h1.ctrl && t - NET.lastIn > 1500) h1.ctrl = null;
          if (t - NET.lastIn > 9000) { G.heroes.splice(1, 1); NET.connected = false; NET.peer = null; E.toast("Ton ami est déconnecté", "#ffb0dc"); }
        }
      } else {
        if (t - NET.inAt >= 80) {   // entrées : envoyées seulement si elles changent (ou toutes les 300 ms comme signal de présence)
          NET.inAt = t; var dead = G.hero && G.hero.dead, mv = dead ? { x: 0, z: 0 } : E.moveVec(), a = E.aimAtk(), msg = { mx: q(mv.x), mz: q(mv.z), a: q(a.a), d: q(a.d), ah: !dead && E.attackHeld() ? 1 : 0 }, key = JSON.stringify(msg);
          if (key !== NET.lastInSent || t - NET.lastInT > 300) { NET.lastInSent = key; NET.lastInT = t; send("in", msg); }
        }
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
      // joueurs réellement actifs : l'hôte compte toujours ; l'invité compte s'il est connecté, a un héros et a agi (déplacement, attaque, sort, construction) dans les 45 dernières secondes
      players: function () { var n = 1; if (NET.mode === "host" && NET.connected && E.G.heroes.length > 1 && now() - Math.max(NET.lastAct, NET.joinedAt || 0) < 45000) n++; return n; },
      stats: function () { return { snapGap: NET.snapAt }; },
      code: function () { return NET.code; }, myPick: function () { return NET.myPick; }, peerPick: function () { return NET.peerPick; }, info: info,
      host: host, join: join, leave: leave, pick: pick, req: req, msg: msg, onAction: onAction, tick: tick, restart: restart, copyLink: copyLink,
      debug: function () { return { mode: NET.mode, connected: NET.connected, started: NET.started, seq: NET.seq, peer: NET.peer }; }
    };
  };
})();
