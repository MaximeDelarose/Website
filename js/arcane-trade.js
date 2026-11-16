/* =========================================================================
   Arcane Tactics — TradeManager (échange sécurisé entre deux joueurs)
   Branché sur le moteur via EXT.cmds : le moteur (hôte de la partie) reste seul juge.
   État synchronisé : w.trade = { id, st: "req"|"open", from, to, offer: [{items:[uid], gold, mats:{}}, {...}], ready: [b, b], ok: [b, b] }
   Règles : aucun échange en combat/duel · objets verrouillés ou liés refusés · l'offre est revalidée
   (propriété, quantités, or, capacité du sac) au moment du transfert · tout changement d'offre annule
   les « Prêt » et les validations · déconnexion ou annulation = rien n'est perdu (rien n'a bougé).
   ========================================================================= */
(function (root) {
  "use strict";
  var A = root.AT_CORE; if (!A || !A.EXT) return;
  var I = A.I, EXT = A.EXT;

  var MATS = {
    soie: { name: "Soie de nuit", ico: "🕸", col: "#d9e6ff", value: 6 },
    croc: { name: "Croc de chat masqué", ico: "🦷", col: "#f4efe6", value: 9 },
    eclat: { name: "Éclat de colosse", ico: "💠", col: "#7ff6ff", value: 7 },
    essence: { name: "Essence spectrale", ico: "👻", col: "#c77dff", value: 8 },
    cendre: { name: "Cendre ancienne", ico: "🌫", col: "#b9b2c9", value: 4 },
    coeur: { name: "Cœur de la Reine", ico: "❤", col: "#ff5a6a", value: 40 }
  };
  var DROPS = { araignee: ["soie", 0.7], araignelet: ["soie", 0.25], tisseur: ["soie", 0.6], chatmasque: ["croc", 0.65], colosse: ["eclat", 0.6], spectre: ["essence", 0.6], siphonneur: ["essence", 0.5], traqueur: ["eclat", 0.35], reinetisse: ["coeur", 1] };
  var MAX_GOLD_OFFER = 1e9;

  function pl(w, i) { return w.players[i] || null; }
  function other(t, i) { return i === t.from ? t.to : t.from; }
  function side(t, i) { return i === t.from ? 0 : 1; }
  function busy(w) { return w.mode !== "explore" || !!w.combat || !!(w.duel && w.duel.st); }
  function cancel(w, why, who) {
    if (!w.trade) return;
    A.I.ev(w, { k: "trade", st: "cancel", why: why || "", pi: who == null ? -1 : who, a: w.trade.from, b: w.trade.to });
    w.trade = null; w.rev++;
  }
  function tradable(it) { return !!it && !it.lock && !it.bound; }
  function reset(t) { t.ready = [false, false]; t.ok = [false, false]; }

  // offre normalisée et filtrée contre le profil du joueur (jamais confiance au message reçu)
  function clean(p, o) {
    var out = { items: [], gold: 0, mats: {} };
    o = o || {};
    (Array.isArray(o.items) ? o.items : []).slice(0, A.BAG_MAX).forEach(function (uid) {
      uid = uid | 0; if (out.items.indexOf(uid) >= 0) return;
      var ix = bagIx(p, uid); if (ix >= 0 && tradable(p.bag[ix])) out.items.push(uid);
    });
    out.gold = Math.max(0, Math.min(p.gold, Math.min(MAX_GOLD_OFFER, Math.floor(+o.gold) || 0)));
    var m = o.mats || {}; Object.keys(m).forEach(function (k) { if (!MATS[k]) return; var n = Math.max(0, Math.min((p.mats || {})[k] || 0, Math.floor(+m[k]) || 0)); if (n) out.mats[k] = n; });
    return out;
  }
  function bagIx(p, uid) { for (var i = 0; i < p.bag.length; i++) if (p.bag[i].uid === uid) return i; return -1; }

  // vérifie qu'un transfert est possible ; renvoie null si oui, sinon la raison
  function check(w, t) {
    var P = [pl(w, t.from), pl(w, t.to)]; if (!P[0] || !P[1]) return "Joueur absent";
    for (var s = 0; s < 2; s++) {
      var p = P[s].profile, o = t.offer[s], c = clean(p, o);
      if (c.items.length !== o.items.length || c.gold !== o.gold || Object.keys(c.mats).length !== Object.keys(o.mats).length) return "L'offre n'est plus valide";
      for (var k in o.mats) if (c.mats[k] !== o.mats[k]) return "L'offre n'est plus valide";
    }
    for (var q = 0; q < 2; q++) {
      var after = P[q].profile.bag.length - t.offer[q].items.length + t.offer[1 - q].items.length;
      if (after > A.BAG_MAX) return (P[q].name || "Un joueur") + " n'a pas assez de place dans son sac";
    }
    return null;
  }
  function execute(w, t) {
    var P = [pl(w, t.from), pl(w, t.to)], moved = [[], []];
    for (var s = 0; s < 2; s++) { // sort les objets des deux sacs
      var p = P[s].profile; t.offer[s].items.forEach(function (uid) { var ix = bagIx(p, uid); moved[s].push(p.bag.splice(ix, 1)[0]); });
      p.gold -= t.offer[s].gold; p.mats = p.mats || {};
      for (var k in t.offer[s].mats) { p.mats[k] -= t.offer[s].mats[k]; if (p.mats[k] <= 0) delete p.mats[k]; }
    }
    for (var r = 0; r < 2; r++) { // ... puis les dépose chez l'autre
      var p2 = P[r].profile, from = moved[1 - r]; p2.mats = p2.mats || {};
      from.forEach(function (it) { it.uid = p2.uid++; delete it.lock; p2.bag.push(it); });
      p2.gold += t.offer[1 - r].gold;
      for (var k2 in t.offer[1 - r].mats) p2.mats[k2] = (p2.mats[k2] || 0) + t.offer[1 - r].mats[k2];
      p2.rev++;
    }
  }

  var CMD = {
    trade_req: function (w, pi, c) {
      var to = c.to | 0; if (w.trade || busy(w) || to === pi || !pl(w, to) || !pl(w, pi)) return false;
      w.trade = { id: Date.now() % 1e9, st: "req", from: pi, to: to, offer: [{ items: [], gold: 0, mats: {} }, { items: [], gold: 0, mats: {} }], ready: [false, false], ok: [false, false] };
      I.ev(w, { k: "trade", st: "req", a: pi, b: to }); w.rev++; return true;
    },
    trade_accept: function (w, pi) {
      var t = w.trade; if (!t || t.st !== "req" || t.to !== pi || busy(w)) return false;
      t.st = "open"; I.ev(w, { k: "trade", st: "open", a: t.from, b: t.to }); w.rev++; return true;
    },
    trade_refuse: function (w, pi) { var t = w.trade; if (!t || t.st !== "req" || t.to !== pi) return false; cancel(w, "refus", pi); return true; },
    trade_cancel: function (w, pi) { var t = w.trade; if (!t || (t.from !== pi && t.to !== pi)) return false; cancel(w, "annulé", pi); return true; },
    trade_offer: function (w, pi, c) {
      var t = w.trade; if (!t || t.st !== "open" || (t.from !== pi && t.to !== pi)) return false;
      if (busy(w)) { cancel(w, "combat"); return false; }
      var s = side(t, pi); t.offer[s] = clean(pl(w, pi).profile, c); reset(t); w.rev++; return true;
    },
    trade_ready: function (w, pi, c) {
      var t = w.trade; if (!t || t.st !== "open" || (t.from !== pi && t.to !== pi)) return false;
      var s = side(t, pi); t.ready[s] = c.v === false ? false : true; if (!t.ready[s]) t.ok[s] = false; w.rev++; return true;
    },
    trade_confirm: function (w, pi) {
      var t = w.trade; if (!t || t.st !== "open" || (t.from !== pi && t.to !== pi)) return false;
      if (busy(w)) { cancel(w, "combat"); return false; }
      if (!t.ready[0] || !t.ready[1]) return false;
      t.ok[side(t, pi)] = true;
      if (t.ok[0] && t.ok[1]) {
        var why = check(w, t);
        if (why) { I.ev(w, { k: "msg", pi: -1, text: why }); reset(t); w.rev++; return false; }
        execute(w, t);
        I.ev(w, { k: "trade", st: "done", a: t.from, b: t.to, give: [t.offer[0].items.length, t.offer[0].gold], get: [t.offer[1].items.length, t.offer[1].gold] });
        w.trade = null;
      }
      w.rev++; return true;
    }
  };
  Object.keys(CMD).forEach(function (k) { EXT.cmds[k] = CMD[k]; });

  var prevCombat = EXT.onCombat, prevRemove = EXT.onRemove, prevLoot = EXT.onLoot;
  EXT.onCombat = function (w, c, pk, room) { if (w.trade) cancel(w, "combat"); if (prevCombat) prevCombat(w, c, pk, room); };
  EXT.onRemove = function (w, i) { if (w.trade && (w.trade.from === i || w.trade.to === i)) cancel(w, "déconnexion", i); if (prevRemove) prevRemove(w, i); };
  // matériaux : butin des nouvelles créatures
  EXT.onLoot = function (w, i, p, res, defeated) {
    var got = {}; p.mats = p.mats || {};
    (defeated || []).forEach(function (d) { var D = DROPS[d.type]; if (D && Math.random() < D[1] * (d.affix ? 1.5 : 1)) { var n = d.boss ? 3 : d.affix ? 2 : 1; got[D[0]] = (got[D[0]] || 0) + n; } });
    Object.keys(got).forEach(function (k) { p.mats[k] = (p.mats[k] || 0) + got[k]; });
    res.mats = got;
    if (prevLoot) prevLoot(w, i, p, res, defeated);
  };

  A.TRADE = { MATS: MATS, DROPS: DROPS, check: check, clean: clean, cancel: cancel, tradable: tradable };
})(typeof window !== "undefined" ? window : globalThis);
