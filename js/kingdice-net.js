/* =========================================================================
   King Dice — transport réseau
   KD_NET.open({ code, id, meta(), events:[...], onEvent(ev, payload), onRoster(list), onStatus(status) })
     → { send(ev, payload), track(meta), close() }   (ou null si aucun serveur n'est joignable)

   Par défaut : Supabase Realtime (diffusion + présence, même config que Dice et Merger :
   SITE.supabase). Aucune table, aucune clé secrète, aucun compte.
   Avec ?net=local dans l'adresse : deux onglets du même navigateur se parlent par
   BroadcastChannel (pratique pour tester seul, sans serveur).
   ========================================================================= */
(function (root) {
  "use strict";

  var NS = "kd-room-";

  // petit remplaçant local de l'API de salon Supabase (diffusion + présence) basé sur BroadcastChannel
  function localChannel(name, cfg) {
    var bc = new BroadcastChannel("kd-local-" + name), key = cfg.config.presence.key;
    var handlers = [], presenceCbs = [], peers = {}, meta = null, subCb = null, timer = null;
    function post(m) { try { bc.postMessage(m); } catch (e) {} }
    function announce() { if (meta) post({ t: "pres", key: key, meta: meta }); }
    function sync() { presenceCbs.forEach(function (cb) { cb(); }); }
    bc.onmessage = function (ev) {
      var m = ev.data;
      if (m.t === "pres") { peers[m.key] = m.meta; sync(); }
      else if (m.t === "who") announce();
      else if (m.t === "bye") { delete peers[m.key]; sync(); }
      else if (m.t === "ev") handlers.forEach(function (h) { if (h.event === m.event) h.cb({ payload: JSON.parse(JSON.stringify(m.payload)) }); });
    };
    root.addEventListener("pagehide", function () { post({ t: "bye", key: key }); });
    return {
      on: function (type, filter, cb) { if (type === "presence") presenceCbs.push(cb); else handlers.push({ event: filter.event, cb: cb }); return this; },
      subscribe: function (cb) { subCb = cb; setTimeout(function () { cb("SUBSCRIBED"); post({ t: "who" }); }, 30); timer = setInterval(announce, 1500); return this; },
      send: function (m) { post({ t: "ev", event: m.event, payload: m.payload }); },
      track: function (mt) { meta = mt; announce(); sync(); },
      untrack: function () { meta = null; post({ t: "bye", key: key }); },
      presenceState: function () { var o = {}; Object.keys(peers).forEach(function (k) { o[k] = [peers[k]]; }); if (meta) o[key] = [meta]; return o; },
      close: function () { clearInterval(timer); post({ t: "bye", key: key }); bc.close(); },
    };
  }
  var localClient = { channel: localChannel, removeChannel: function (ch) { ch.close(); } };

  var sb = null;
  function client() {
    if (/[?&]net=local/.test(location.search) && root.BroadcastChannel) return localClient;
    if (sb) return sb;
    var c = (root.SITE || {}).supabase;
    if (!root.supabase || !root.supabase.createClient || !c) return null;
    sb = root.supabase.createClient(c.url, c.key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 30 } } });
    return sb;
  }

  function open(o) {
    var cl = client();
    if (!cl) return null;
    var ch = cl.channel(NS + o.code, { config: { broadcast: { self: false, ack: false }, presence: { key: o.id } } });
    function roster() {
      var st = ch.presenceState(), list = [];
      Object.keys(st).forEach(function (k) { if (st[k] && st[k][0]) list.push(st[k][0]); });
      list.sort(function (a, b) { return (b.host ? 1 : 0) - (a.host ? 1 : 0) || a.ts - b.ts; });
      return list;
    }
    ch.on("presence", { event: "sync" }, function () { o.onRoster(roster()); });
    o.events.forEach(function (ev) { ch.on("broadcast", { event: ev }, function (msg) { o.onEvent(ev, msg.payload); }); });
    ch.subscribe(function (status) {
      if (status === "SUBSCRIBED") ch.track(o.meta());
      o.onStatus(status);
    });
    return {
      send: function (ev, payload) { try { ch.send({ type: "broadcast", event: ev, payload: payload }); } catch (e) {} },
      track: function (meta) { try { ch.track(meta); } catch (e) {} },
      close: function () { try { ch.untrack(); } catch (e) {} try { cl.removeChannel(ch); } catch (e) {} },
    };
  }

  root.KD_NET = { open: open };
})(window);
