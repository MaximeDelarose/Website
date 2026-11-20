/* =========================================================================
   QUELLE VIE ! — transport réseau
   Supabase Realtime (diffusion + présence), la même config que les autres jeux
   du site (SITE.supabase) : aucune table, aucune clé secrète.
   Avec ?net=local : les onglets d'un même navigateur se parlent par
   BroadcastChannel (pour tester seul).
   QV_NET.open({ code, id, meta(), onEvent(ev, payload), onRoster(list), onStatus(s) })
     → { send(ev, payload), track(meta), close() } ou null si aucun serveur
   ========================================================================= */
(function (root) {
  "use strict";
  var EVENTS = ["hello", "intent", "state", "priv", "sync", "bye", "kick", "emote", "ready"];

  function localChannel(name, cfg) {
    var bc = new BroadcastChannel("qv-local-" + name), key = cfg.config.presence.key;
    var handlers = [], presenceCbs = [], peers = {}, seen = {}, meta = null, timer = null;
    function post(m) { try { bc.postMessage(m); } catch (e) {} }
    function announce() { if (meta) post({ t: "pres", key: key, meta: meta }); }
    function sync() { presenceCbs.forEach(function (cb) { cb(); }); }
    bc.onmessage = function (ev) {
      var m = ev.data;
      if (m.t === "pres") { peers[m.key] = m.meta; seen[m.key] = Date.now(); sync(); }
      else if (m.t === "who") announce();
      else if (m.t === "bye") { delete peers[m.key]; sync(); }
      else if (m.t === "ev") handlers.forEach(function (h) { if (h.event === m.event) h.cb({ payload: JSON.parse(JSON.stringify(m.payload)) }); });
    };
    root.addEventListener("pagehide", function () { post({ t: "bye", key: key }); });
    return {
      on: function (type, filter, cb) { if (type === "presence") presenceCbs.push(cb); else handlers.push({ event: filter.event, cb: cb }); return this; },
      subscribe: function (cb) {
        setTimeout(function () { cb("SUBSCRIBED"); post({ t: "who" }); }, 30);
        timer = setInterval(function () {
          announce();
          var now = Date.now(), ch = false;
          Object.keys(seen).forEach(function (k) { if (now - seen[k] > 5000 && peers[k]) { delete peers[k]; ch = true; } });
          if (ch) sync();
        }, 1500);
        return this;
      },
      send: function (m) { post({ t: "ev", event: m.event, payload: m.payload }); },
      track: function (mt) { meta = mt; announce(); sync(); },
      untrack: function () { meta = null; post({ t: "bye", key: key }); },
      presenceState: function () { var o = {}; Object.keys(peers).forEach(function (k) { o[k] = [peers[k]]; }); if (meta) o[key] = [meta]; return o; },
      close: function () { clearInterval(timer); post({ t: "bye", key: key }); bc.close(); },
    };
  }
  var localClient = { channel: localChannel, removeChannel: function (ch) { ch.close(); } };

  var sb = null;
  function isLocal() { return /[?&]net=local/.test(location.search) && !!root.BroadcastChannel; }
  function client() {
    if (isLocal()) return localClient;
    if (sb) return sb;
    var c = (root.SITE || {}).supabase;
    if (!root.supabase || !root.supabase.createClient || !c) return null;
    sb = root.supabase.createClient(c.url, c.key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 20 } } });
    return sb;
  }

  function open(o) {
    var cl = client();
    if (!cl) return null;
    var ch = cl.channel("qv-room-" + o.code, { config: { broadcast: { self: false, ack: false }, presence: { key: o.id } } });
    function roster() {
      var st = ch.presenceState(), list = [];
      Object.keys(st).forEach(function (k) { if (st[k] && st[k][0]) list.push(st[k][0]); });
      return list;
    }
    ch.on("presence", { event: "sync" }, function () { o.onRoster(roster()); });
    EVENTS.forEach(function (ev) { ch.on("broadcast", { event: ev }, function (msg) { o.onEvent(ev, msg.payload); }); });
    ch.subscribe(function (status) {
      if (status === "SUBSCRIBED") { try { ch.track(o.meta()); } catch (e) {} }
      o.onStatus(status);
    });
    return {
      send: function (ev, payload) { try { ch.send({ type: "broadcast", event: ev, payload: payload }); } catch (e) {} },
      track: function (meta) { try { ch.track(meta); } catch (e) {} },
      close: function () { try { ch.untrack(); } catch (e) {} try { cl.removeChannel(ch); } catch (e) {} },
    };
  }

  root.QV_NET = { open: open, isLocal: isLocal, available: function () { return !!client(); } };
})(window);
