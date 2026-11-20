/* =========================================================================
   QUELLE VIE ! — moteur de règles (aucun affichage, aucun réseau)
   Il fait autorité : seul l'hôte l'exécute, les autres envoient des intentions.
   QV_ENGINE.create(players, seed)         → état complet
   QV_ENGINE.apply(state, action)          → { ok, err }   (modifie l'état)
   QV_ENGINE.publicState(state)            → copie sans les mains ni les objectifs
   QV_ENGINE.privateFor(state, id)         → { hand, obj }
   QV_ENGINE.botAction(state, id)          → action conseillée (bots, pilote auto)
   QV_ENGINE.canPlay(state, id, card, target) → "" si jouable, sinon la raison
   ========================================================================= */
(function (root) {
  "use strict";
  var D = root.QV_DATA || (typeof require !== "undefined" ? require("./qv-data.js") : null);
  var CARDS = D.byKey;

  // ---------- hasard reproductible (l'état complet garde la graine) ----------
  function rand(s) {
    var t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function pick(s, arr) { return arr[Math.floor(rand(s) * arr.length)]; }
  function shuffle(s, arr) { for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(rand(s) * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // ---------- création ----------
  function create(list, seed) {
    var s = {
      v: 1, gid: (seed >>> 0) || 1, seq: 0, rng: (seed >>> 0) || 1, phase: "play", round: 1, turn: 0,
      order: [], players: {}, deck: [], discard: [], nextU: 1, pending: null,
      events: [], evId: 0, seasonDeck: [], season: null, winner: null,
    };
    s.maxRounds = D.ROUNDS[Math.max(2, Math.min(6, list.length))];
    list.forEach(function (p) {
      s.order.push(p.id);
      s.players[p.id] = {
        id: p.id, name: String(p.name || "Joueur").slice(0, 16), avatar: p.avatar || null, bot: !!p.bot,
        hand: [], obj: [], b: 3, f: 3, r: 1,
        job: null, diploma: 0, partner: null, married: false, kids: [], garde: false, kidsAway: false,
        housing: 0, items: [], scandal: 0, startup: 0, strike: 0, rebound: false, plays: 0,
        stats: { sab: 0, hits: 0, played: {} }, life: [], mood: "happy",
      };
    });
    shuffle(s, s.order);
    D.CARDS.forEach(function (c) { for (var i = 0; i < (c.copies || 1); i++) s.deck.push({ u: s.nextU++, k: c.key }); });
    shuffle(s, s.deck);
    s.seasonDeck = shuffle(s, D.EVENTS.map(function (e) { return e.key; }));
    var objs = shuffle(s, D.OBJECTIVES.map(function (o) { return o.key; }));
    s.order.forEach(function (id, i) {
      var p = s.players[id];
      p.obj = [objs[(i * 2) % objs.length], objs[(i * 2 + 1) % objs.length]];
      for (var n = 0; n < D.HAND_SIZE; n++) draw(s, p);
      life(s, p, "Naît, grandit, et finit par quitter l'école avec 3 euros en poche.", "neutral");
    });
    beginTurn(s);
    return s;
  }

  function age(s) { return D.START_AGE + (s.round - 1) * D.AGE_STEP; }
  function cur(s) { return s.players[s.order[s.turn]]; }
  function emit(s, ev) { ev.id = ++s.evId; s.events.push(ev); if (s.events.length > 40) s.events.shift(); return ev; }
  function life(s, p, text, tone) { p.life.push({ age: age(s), text: text, tone: tone || "good" }); }
  function fill(text, p, extra) {
    return String(text || "")
      .replace("{partner}", (extra && extra.partner) || (p.partner ? p.partner.name : "l'ex"))
      .replace("{kid}", (extra && extra.kid) || "un bébé")
      .replace("{amount}", (extra && extra.amount) || "");
  }

  function draw(s, p) {
    if (!s.deck.length) {
      if (!s.discard.length) return false;
      s.deck = shuffle(s, s.discard); s.discard = [];
    }
    p.hand.push(s.deck.pop());
    return true;
  }

  // ---------- conditions ----------
  function jobDef(p) { return p.job ? D.JOBS[p.job.k] : null; }
  function salary(p) {
    var j = jobDef(p); if (!j) return 0;
    return j.salary + (p.job.lv - 1) + (j.perRep ? Math.floor(p.r / j.perRep) : 0);
  }
  function jobTitle(p) { var j = jobDef(p); return j ? j.titles[Math.min(p.job.lv, j.titles.length) - 1] : "Sans emploi"; }
  function check(p, req) {
    if (!req) return "";
    if (req.noJob && p.job) return "Tu as déjà un métier";
    if (req.notJob && p.job && p.job.k === req.notJob) return "Tu fais déjà ce métier";
    if (req.hasJob && !p.job) return "Il faut un métier";
    if (req.job && (!p.job || p.job.k !== req.job)) return "Il faut ce métier";
    if (req.promotable) {
      if (!p.job || p.job.k === "startup") return "Il faut un métier";
      if (p.job.lv >= jobDef(p).titles.length) return "Déjà au sommet";
    }
    if (req.diploma && p.diploma < req.diploma) return "Il faut un diplôme";
    if (req.minR && p.r < req.minR) return "Pas assez de réputation";
    if (req.minF && p.f < req.minF) return "Pas assez de fortune";
    if (req.minB && p.b < req.minB) return "Pas assez de bonheur";
    if (req.single && p.partner) return "Tu es déjà en couple";
    if (req.partner && !p.partner) return "Il faut un·e partenaire";
    if (req.notMarried && p.married) return "Déjà marié·e";
    if (req.married && !p.married) return "Il faut être marié·e";
    if (req.housing && p.housing < req.housing) return "Il faut un logement";
    if (req.maxHousing !== undefined && p.housing > req.maxHousing) return "Tu as déjà mieux";
    if (req.notItem && p.items.indexOf(req.notItem) >= 0) return "Tu l'as déjà";
    if (req.item && p.items.indexOf(req.item) < 0) return "Il te manque l'objet";
    if (req.kids && p.kids.length < req.kids) return "Pas assez d'enfants";
    return "";
  }
  function affordable(p, cost) {
    if (!cost) return true;
    return (p.b >= (cost.b || 0)) && (p.f >= (cost.f || 0)) && (p.r >= (cost.r || 0));
  }
  function pay(p, cost) { if (!cost) return; p.b -= cost.b || 0; p.f -= cost.f || 0; p.r -= cost.r || 0; }
  function costText(cost) {
    var t = []; if (!cost) return "";
    if (cost.f) t.push(cost.f + " fortune"); if (cost.b) t.push(cost.b + " bonheur"); if (cost.r) t.push(cost.r + " réputation");
    return t.join(", ");
  }

  function canPlay(s, id, k, target) {
    var p = s.players[id], c = CARDS[k];
    if (!p || !c) return "Carte inconnue";
    if (c.reaction) return "Se joue quand on t'attaque";
    var why = check(p, c.req); if (why) return why;
    if (!affordable(p, c.cost)) return "Il faut " + costText(c.cost);
    if (c.target === "opponent") {
      var ts = s.order.filter(function (o) { return o !== id && !check(s.players[o], c.treq); });
      if (!ts.length) return "Aucune cible possible";
      if (target !== undefined && target !== null && ts.indexOf(target) < 0) return "Cible impossible";
    }
    return "";
  }
  function validTargets(s, id, k) {
    var c = CARDS[k];
    return s.order.filter(function (o) { return o !== id && !check(s.players[o], c.treq); });
  }

  // ---------- effets ----------
  function addRes(s, p, d, notes) {
    ["b", "f", "r"].forEach(function (k) {
      var v = d[k] || 0; if (!v) return;
      var before = p[k]; p[k] = Math.max(0, p[k] + v);
      if (notes && p[k] !== before) notes.push({ p: p.id, k: k, v: p[k] - before });
    });
  }
  function seedFor(s) { return Math.floor(rand(s) * 1e9); }

  function run(s, p, fx, ctx) {
    (fx || []).forEach(function (o) { op(s, p, o, ctx); });
  }
  function op(s, p, o, ctx) {
    var n = ctx.notes, who = o.who === "attacker" ? s.players[ctx.attacker] : p;
    switch (o.op) {
      case "res": addRes(s, who, o, n); break;
      case "job":
        p.job = { k: o.job, lv: 1 }; p.startup = 0; break;
      case "jobUp": if (p.job) p.job.lv++; break;
      case "jobDown":
        if (p.job && p.job.lv > 1) p.job.lv--; else addRes(s, p, { r: -1 }, n);
        break;
      case "loseJob": p.job = null; p.startup = 0; break;
      case "diploma": p.diploma++; break;
      case "partner":
        p.partner = { name: pick(s, D.NAMES.partner), seed: seedFor(s) }; ctx.partner = p.partner.name; break;
      case "marry": p.married = true; break;
      case "divorce":
        ctx.partner = p.partner ? p.partner.name : "l'ex";
        ctx.exSeed = p.partner ? p.partner.seed : 1;
        p.partner = null; p.married = false;
        if (p.kids.length) { p.garde = true; ctx.garde = true; ctx.kids = p.kids.map(function (k) { return k.seed; }); }
        if (o.soft) { addRes(s, p, { b: -1 }, n); }
        else {
          addRes(s, p, { b: -3, f: -Math.ceil(p.f / 2) }, n);
          if (p.items.indexOf("toaster") < 0) p.items.push("toaster");
        }
        break;
      case "kid":
        var kname = pick(s, D.NAMES.kid);
        p.kids.push({ name: kname, seed: seedFor(s) }); ctx.kid = kname; break;
      case "item": if (p.items.indexOf(o.item) < 0) p.items.push(o.item); break;
      case "housing": p.housing = Math.max(p.housing, o.level); break;
      case "startup": p.job = { k: "startup", lv: 1 }; p.startup = 2; break;
      case "lottery":
        var amount = pick(s, [1, 1, 1, 2, 2, 3, 4, 7]);
        addRes(s, p, { f: amount }, n); ctx.amount = amount; break;
      case "clearScandal": p.scandal = 0; break;
      case "scandal": p.scandal = Math.max(p.scandal, o.turns); break;
      case "taxThird": addRes(s, p, { f: -Math.min(p.f, Math.max(2, Math.floor(p.f / 3))) }, n); break;
      case "ifPartner": if (p.partner) run(s, p, o.fx, ctx); break;
      case "ifKids": if (p.kids.length) run(s, p, o.fx, ctx); break;
      case "ifHousing": if (p.housing >= o.level) run(s, p, o.fx, ctx); break;
      case "crisis":
        s.order.forEach(function (id) { addRes(s, s.players[id], { f: -3 }, n); });
        var minF = Math.min.apply(null, s.order.map(function (id) { return s.players[id].f; }));
        ctx.poor = s.order.filter(function (id) { return s.players[id].f === minF; });
        ctx.poor.forEach(function (id) { addRes(s, s.players[id], { b: 3 }, n); });
        break;
      case "karaoke":
        s.order.forEach(function (id) { addRes(s, s.players[id], { b: 1 }, n); });
        var maxR = Math.max.apply(null, s.order.map(function (id) { return s.players[id].r; }));
        var top = s.order.filter(function (id) { return s.players[id].r === maxR; });
        ctx.singer = pick(s, top);
        addRes(s, s.players[ctx.singer], { r: -2 }, n);
        break;
      case "strike":
        s.order.forEach(function (id) {
          var q = s.players[id]; q.strike = 1;
          if (!q.job) addRes(s, q, { b: 2 }, n);
        });
        break;
      case "each": s.order.forEach(function (id) { run(s, s.players[id], o.fx, ctx); }); break;
      case "eachIf":
        s.order.forEach(function (id) {
          var q = s.players[id];
          if (!check(q, o.cond)) run(s, q, o.fx, ctx); else if (o.else) run(s, q, o.else, ctx);
        });
        break;
    }
  }

  function mood(p, m) { p.mood = m; }

  // ---------- tours ----------
  function beginTurn(s) {
    var p = cur(s), notes = [], info = [];
    p.plays = 1 + (p.rebound ? 1 : 0);
    if (p.rebound) info.push("Rebond : 2 cartes ce tour-ci");
    p.rebound = false;
    var pay_ = salary(p);
    if (p.strike > 0) { p.strike = 0; if (p.job) info.push("Grève : pas de salaire"); }
    else if (pay_) addRes(s, p, { f: pay_ }, notes);
    if (p.kids.length) {
      if (p.garde) p.kidsAway = !p.kidsAway;
      var home = p.kidsAway ? 0 : p.kids.length;
      if (home) { addRes(s, p, { b: home, f: -home }, notes); }
      else info.push("Les enfants sont chez l'autre parent");
    }
    if (p.scandal > 0) { p.scandal--; addRes(s, p, { r: -1 }, notes); info.push("Scandale : −1 réputation"); }
    var startupEv = null;
    if (p.startup > 0) {
      p.startup--;
      if (p.startup === 0) {
        if (rand(s) < 0.6) {
          p.job = { k: "pdg", lv: 1 }; addRes(s, p, { r: 4, f: 3 }, notes); mood(p, "smug");
          life(s, p, "Sa start-up devient une licorne. Il·elle dit « disruptif » à chaque phrase.", "good");
          startupEv = { t: "card", k: "startup", p: p.id, outcome: "win", scene: "startupWin", text: p.name + " lève 40 millions : sa start-up devient une licorne !" };
        } else {
          p.job = null; addRes(s, p, { r: -1, b: -1 }, notes); mood(p, "sad");
          life(s, p, "Faillite de la start-up. Il reste 2 000 paires de chaussettes en stock.", "bad");
          startupEv = { t: "card", k: "startup", p: p.id, outcome: "fail", scene: "startupFail", text: p.name + " fait faillite. Les chaussettes connectées n'ont pas pris." };
        }
      }
    }
    draw(s, p);
    while (p.hand.length < 4 && draw(s, p)) {}
    emit(s, { t: "turn", p: p.id, notes: notes, info: info, round: s.round });
    if (startupEv) { startupEv.notes = notes; emit(s, startupEv); }
  }

  function seasonCheck(s) {
    if (s.round > 1 && s.round % 2 === 1 && s.seasonDeck.length) {
      var k = s.seasonDeck.shift(), e = D.EVENTS.filter(function (x) { return x.key === k; })[0];
      var ctx = { notes: [] };
      run(s, null, e.fx, ctx);
      s.season = k;
      emit(s, { t: "season", k: k, notes: ctx.notes, text: e.name + " : " + e.text });
    }
  }

  function endTurn(s) {
    s.turn++;
    if (s.turn >= s.order.length) {
      s.turn = 0; s.round++;
      if (s.round > s.maxRounds) return finish(s);
      seasonCheck(s);
    }
    beginTurn(s);
  }
  function afterAction(s) {
    var p = cur(s);
    if (s.phase === "end") return;
    if (p.plays <= 0) endTurn(s);
  }

  // ---------- score ----------
  function objDone(s, p, key) {
    var o = D.OBJECTIVES.filter(function (x) { return x.key === key; })[0]; if (!o) return false;
    var c = o.check;
    if (c.kids && p.kids.length < c.kids) return false;
    if (c.jobTop && !(p.job && (p.job.k === "pdg" || p.job.lv >= 3))) return false;
    if (c.housing && p.housing < c.housing) return false;
    if (c.minR && p.r < c.minR) return false;
    if (c.minF && p.f < c.minF) return false;
    if (c.minB && p.b < c.minB) return false;
    if (c.sabotages && p.stats.sab < c.sabotages) return false;
    if (c.hits && p.stats.hits < c.hits) return false;
    if (c.married && !p.married) return false;
    if (c.item && p.items.indexOf(c.item) < 0) return false;
    if (c.played) for (var k in c.played) if ((p.stats.played[k] || 0) < c.played[k]) return false;
    return true;
  }
  function score(s, p) {
    var objs = p.obj.map(function (k) {
      var o = D.OBJECTIVES.filter(function (x) { return x.key === k; })[0];
      var done = objDone(s, p, k);
      return { k: k, name: o.name, text: o.text, pts: o.pts, done: done };
    });
    var bonus = objs.reduce(function (a, o) { return a + (o.done ? o.pts : 0); }, 0);
    var trophies = [];
    D.TROPHIES.forEach(function (t) {
      var top = Math.max.apply(null, s.order.map(function (id) { return s.players[id][t.k]; }));
      if (top > 0 && p[t.k] === top) trophies.push({ k: t.k, name: t.name, pts: t.pts });
    });
    var tb = trophies.reduce(function (a, t) { return a + t.pts; }, 0);
    return { b: p.b, f: p.f, r: p.r, obj: objs, bonus: bonus, trophies: trophies, tb: tb, total: p.b + p.f + p.r + bonus + tb };
  }
  function finish(s) {
    s.phase = "end"; s.round = s.maxRounds; s.pending = null;
    var best = -1;
    s.order.forEach(function (id) {
      var p = s.players[id]; p.final = score(s, p);
      if (p.final.total > best) best = p.final.total;
    });
    s.winners = s.order.filter(function (id) { return s.players[id].final.total === best; });
    s.winner = s.winners[0];
    emit(s, { t: "end", winners: s.winners });
  }

  // ---------- résolution d'une carte ----------
  function resolveSelf(s, p, c, u) {
    var ctx = { notes: [], attacker: p.id };
    run(s, p, c.fx, ctx);
    p.stats.played[c.key] = (p.stats.played[c.key] || 0) + 1;
    if (c.target === "all") life(s, p, c.life, "neutral");
    else if (c.key !== "startup" || true) life(s, p, fill(c.life, p, ctx), "good");
    if (c.fam === "love" || c.fam === "family" || c.fam === "leisure") mood(p, "happy");
    if (c.key === "promotion" || c.key === "voiture") mood(p, "smug");
    var ev = { t: "card", k: c.key, p: p.id, outcome: "self", scene: c.scene || null, notes: ctx.notes, data: {} };
    if (ctx.partner) ev.data.partner = ctx.partner;
    if (ctx.kid) ev.data.kid = ctx.kid;
    if (ctx.amount) ev.data.amount = ctx.amount;
    if (ctx.singer) ev.data.singer = ctx.singer;
    if (ctx.poor) ev.data.poor = ctx.poor;
    ev.text = p.name + " joue « " + c.name + " »" + (ctx.amount ? " et gagne " + ctx.amount + " !" : ".");
    if (ctx.singer) ev.text = p.name + " organise un karaoké. " + s.players[ctx.singer].name + " chante « Je te survivrai »… faux.";
    emit(s, ev);
  }

  function hit(s, att, tgt, c, mode) {
    // mode : "full" | "soft" | "reflected"
    var ctx = { notes: [], attacker: att.id };
    var hadKids = tgt.kids.length > 0, partnerSeed = tgt.partner ? tgt.partner.seed : 0, partnerName = tgt.partner ? tgt.partner.name : "";
    if (mode === "soft") run(s, tgt, c.soft.fx, ctx);
    else run(s, tgt, c.fx, ctx);
    tgt.stats.hits += mode === "soft" ? 0 : 1;
    att.stats.played[c.key] = (att.stats.played[c.key] || 0) + 1;
    att.stats.sab++;
    mood(tgt, mode === "soft" ? "worried" : "sad");
    mood(att, "smug");
    var ev = {
      t: "card", k: c.key, p: att.id, to: tgt.id, outcome: mode, notes: ctx.notes,
      scene: mode === "soft" ? null : c.scene, data: { partner: partnerName, exSeed: partnerSeed },
    };
    if (c.key === "divorce" && hadKids && mode !== "soft") ev.data.garde = true;
    if (c.key === "divorce" && hadKids) ev.data.kids = (ctx.kids || []);
    ev.text = mode === "soft"
      ? tgt.name + " limite les dégâts : " + c.soft.label.toLowerCase() + "."
      : att.name + " joue « " + c.name + " » sur " + tgt.name + (mode === "reflected" ? " (retour à l'envoyeur !)" : "") + ".";
    life(s, tgt, mode === "soft" ? fill(c.name + " évité·e de justesse : " + c.soft.label.toLowerCase() + ".", tgt) : fill(c.life, tgt, { partner: partnerName }), mode === "soft" ? "neutral" : "bad");
    return ev;
  }

  // ---------- actions ----------
  function apply(s, a) {
    try { return doApply(s, a); } catch (e) { return { ok: false, err: "Erreur : " + (e && e.message) }; }
  }
  function doApply(s, a) {
    if (!a || !s.players[a.pid]) return { ok: false, err: "Joueur inconnu" };
    if (s.phase === "end") return { ok: false, err: "Partie terminée" };
    var p = s.players[a.pid];
    var r = { ok: true };
    if (a.t === "play" || a.t === "rest") {
      if (s.phase !== "play") return { ok: false, err: "Attends la réaction" };
      if (cur(s).id !== p.id) return { ok: false, err: "Ce n'est pas ton tour" };
      if (p.plays <= 0) return { ok: false, err: "Plus d'action" };
      var idx = -1; p.hand.forEach(function (h, i) { if (h.u === a.u) idx = i; });
      if (idx < 0) return { ok: false, err: "Carte absente" };
      var card = p.hand[idx], c = CARDS[card.k];
      if (a.t === "rest") {
        p.hand.splice(idx, 1); s.discard.push(card); p.plays--;
        var notes = []; addRes(s, p, { b: 1 }, notes); mood(p, "happy");
        emit(s, { t: "rest", p: p.id, k: c.key, notes: notes, text: p.name + " souffle un coup (défausse « " + c.name + " », +1 bonheur)." });
        s.seq++; afterAction(s); return r;
      }
      var why = canPlay(s, p.id, card.k, a.target);
      if (why) return { ok: false, err: why };
      if (c.target === "opponent" && (a.target === undefined || a.target === null)) return { ok: false, err: "Choisis une cible" };
      p.hand.splice(idx, 1); s.discard.push(card); p.plays--;
      pay(p, c.cost);
      if (c.target === "opponent") {
        var t = s.players[a.target];
        s.phase = "react";
        s.pending = { k: c.key, from: p.id, to: t.id, since: Date.now() };
        emit(s, { t: "attack", k: c.key, p: p.id, to: t.id, text: p.name + " joue « " + c.name + " » sur " + t.name + " !" });
        s.seq++; return r;
      }
      resolveSelf(s, p, c, card.u);
      s.seq++; afterAction(s); return r;
    }
    if (a.t === "react") {
      if (s.phase !== "react" || !s.pending || s.pending.to !== p.id) return { ok: false, err: "Rien à contrer" };
      var pd = s.pending, att = s.players[pd.from], ac = CARDS[pd.k], ev;
      if (a.choice === "defend") {
        var di = -1; p.hand.forEach(function (h, i) { if (h.u === a.u) di = i; });
        if (di < 0) return { ok: false, err: "Carte absente" };
        var dk = p.hand[di].k, dc = CARDS[dk];
        if ((ac.counters || []).indexOf(dk) < 0) return { ok: false, err: "Cette carte ne contre pas « " + ac.name + " »" };
        s.discard.push(p.hand.splice(di, 1)[0]);
        p.stats.played[dk] = (p.stats.played[dk] || 0) + 1;
        var ctx = { notes: [], attacker: att.id };
        if (dc.reflect) {
          if (!check(att, ac.treq)) {
            ev = hit(s, p, att, ac, "reflected");
            ev.p = p.id; ev.to = att.id; ev.by = dk;
            ev.text = p.name + " renvoie « " + ac.name + " » à l'envoyeur : " + att.name + " se le prend en pleine figure !";
            emit(s, { t: "block", k: dk, p: p.id, to: att.id, against: ac.key, reflect: true, text: "Retour à l'envoyeur !", scene: "renvoi" });
            emit(s, ev);
          } else {
            addRes(s, att, { r: -1 }, ctx.notes); mood(att, "worried"); mood(p, "smug");
            emit(s, { t: "block", k: dk, p: p.id, to: att.id, against: ac.key, reflect: true, notes: ctx.notes, scene: "renvoi", text: p.name + " renvoie la carte, mais elle ne touche pas " + att.name + ". L'arroseur se ridiculise : −1 réputation." });
          }
        } else {
          run(s, p, dc.onDefend, ctx); mood(p, "smug"); mood(att, "worried");
          life(s, p, "Évite « " + ac.name + " » grâce à « " + dc.name + " ».", "good");
          emit(s, { t: "block", k: dk, p: p.id, to: att.id, against: ac.key, notes: ctx.notes, scene: "block", text: p.name + " contre « " + ac.name + " » avec « " + dc.name + " » !" });
        }
      } else if (a.choice === "soft") {
        if (!ac.soft || !affordable(p, ac.soft.cost)) return { ok: false, err: "Tu ne peux pas payer" };
        pay(p, ac.soft.cost);
        ev = hit(s, att, p, ac, "soft"); ev.cost = ac.soft.cost; emit(s, ev);
      } else {
        ev = hit(s, att, p, ac, "full");
        var bctx = { notes: ev.notes, attacker: att.id };
        if (ac.bounce) run(s, p, ac.bounce.fx, bctx);
        draw(s, p); p.rebound = true;
        ev.bounce = ac.bounce ? ac.bounce.label : "";
        emit(s, ev);
        if (ev.data.garde) emit(s, { t: "card", k: "garde", p: p.id, outcome: "full", scene: "garde", data: { kids: ev.data.kids, exSeed: ev.data.exSeed, partner: ev.data.partner }, text: "Garde alternée : une semaine sur deux, " + p.name + " vit seul·e avec le hamster." });
      }
      s.pending = null; s.phase = "play";
      s.seq++; afterAction(s); return r;
    }
    return { ok: false, err: "Action inconnue" };
  }

  // ---------- vues ----------
  function publicState(s) {
    var o = clone(s);
    delete o.rng; delete o.seasonDeck;
    o.deck = s.deck.length; o.discard = s.discard.length;
    o.order.forEach(function (id) {
      var p = o.players[id];
      p.handCount = p.hand.length; p.hand = [];
      if (s.phase !== "end") p.obj = [];
      p.salary = salary(s.players[id]); p.title = jobTitle(s.players[id]);
    });
    o.age = age(s);
    return o;
  }
  function privateFor(s, id) {
    var p = s.players[id]; if (!p) return null;
    return { seq: s.seq, hand: clone(p.hand), obj: p.obj.map(function (k) { var d = score(s, p).obj.filter(function (x) { return x.k === k; })[0]; return d; }) };
  }

  // ---------- IA (bots et pilote automatique) ----------
  function evalFor(s, id) {
    var p = s.players[id], left = Math.max(0, s.maxRounds - s.round);
    var sc = score(s, p).total;
    var future = salary(p) * left * 0.8 + p.kids.length * left * 0.3 + (p.startup ? 7 : 0) + p.diploma * (p.job ? 0.5 : 2);
    future += (p.partner ? 1.5 : 0) + (p.housing === 1 ? 1 : 0);
    if (p.scandal) future -= p.scandal;
    // objectifs en cours : un peu de valeur pour s'en approcher
    p.obj.forEach(function (k) {
      if (objDone(s, p, k)) return;
      var o = D.OBJECTIVES.filter(function (x) { return x.key === k; })[0], c = o.check, fr = 0;
      if (c.minB) fr = p.b / c.minB; else if (c.minF) fr = p.f / c.minF; else if (c.minR) fr = p.r / c.minR;
      else if (c.kids) fr = p.kids.length / c.kids; else if (c.housing) fr = p.housing / c.housing;
      else if (c.married) fr = p.married ? 1 : (p.partner ? 0.5 : 0); else if (c.sabotages) fr = p.stats.sab / c.sabotages;
      else if (c.jobTop) fr = p.job ? (p.job.k === "startup" ? 0.6 : p.job.lv / 3) : 0;
      else if (c.played) fr = (p.stats.played.voyage || 0) / 2; else if (c.item) fr = p.items.indexOf(c.item) >= 0 ? 1 : 0;
      future += Math.min(0.9, fr) * o.pts * 0.6;
    });
    var rivals = s.order.filter(function (o) { return o !== id; }).map(function (o) { var q = s.players[o]; return score(s, q).total + salary(q) * left * 0.8; });
    var rival = rivals.length ? Math.max.apply(null, rivals) : 0;
    return sc + future - rival * 0.35;
  }
  function botAction(s, id) {
    var p = s.players[id];
    if (s.phase === "react" && s.pending && s.pending.to === id) return botReact(s, id);
    if (s.phase !== "play" || cur(s).id !== id) return null;
    var best = null, bestV = -1e9;
    p.hand.forEach(function (h) {
      var c = CARDS[h.k];
      var targets = c.target === "opponent" ? validTargets(s, id, h.k) : [null];
      targets.forEach(function (t) {
        if (canPlay(s, id, h.k, t)) return;
        var sim = clone(s); sim.events = [];
        var res = doApply(sim, { t: "play", pid: id, u: h.u, target: t });
        if (!res.ok) return;
        if (sim.phase === "react" && sim.pending) doApply(sim, { t: "react", pid: sim.pending.to, choice: "accept" });
        var v = evalFor(sim, id) + (Math.random() * 0.6);
        if (c.key === "grattage") v -= 0; // pas de triche : la valeur dépend du tirage, on l'accepte
        if (v > bestV) { bestV = v; best = { t: "play", pid: id, u: h.u, target: t }; }
      });
    });
    // se reposer : défausse la carte la moins utile
    var worst = null, worstV = 1e9;
    p.hand.forEach(function (h) {
      var c = CARDS[h.k], v = c.reaction ? 3 : (canPlay(s, id, h.k) ? 0 : 2);
      if (v < worstV) { worstV = v; worst = h; }
    });
    var restV = (function () { var sim = clone(s); doApply(sim, { t: "rest", pid: id, u: worst.u }); return evalFor(sim, id); })();
    if (!best || restV > bestV + 0.3) return { t: "rest", pid: id, u: worst.u };
    return best;
  }
  function botReact(s, id) {
    var p = s.players[id], pd = s.pending, ac = CARDS[pd.k];
    var counters = p.hand.filter(function (h) { return (ac.counters || []).indexOf(h.k) >= 0; });
    var specific = counters.filter(function (h) { return h.k !== "renvoi"; })[0];
    if (specific) return { t: "react", pid: id, choice: "defend", u: specific.u };
    if (counters.length) return { t: "react", pid: id, choice: "defend", u: counters[0].u };
    var opts = [{ choice: "accept" }];
    if (ac.soft && affordable(p, ac.soft.cost)) opts.push({ choice: "soft" });
    var best = opts[0], bestV = -1e9;
    opts.forEach(function (o) {
      var sim = clone(s); doApply(sim, { t: "react", pid: id, choice: o.choice });
      var v = evalFor(sim, id) + (o.choice === "accept" ? 2.5 : 0);
      if (v > bestV) { bestV = v; best = o; }
    });
    return { t: "react", pid: id, choice: best.choice };
  }

  // texte des notes (+2 bonheur…) pour l'interface
  var RES_NAMES = { b: "bonheur", f: "fortune", r: "réputation" };

  root.QV_ENGINE = {
    create: create, apply: apply, publicState: publicState, privateFor: privateFor,
    botAction: botAction, canPlay: canPlay, validTargets: validTargets, score: score,
    salary: salary, jobTitle: jobTitle, check: check, affordable: affordable, costText: costText,
    RES_NAMES: RES_NAMES,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = root.QV_ENGINE;
})(typeof window !== "undefined" ? window : globalThis);
