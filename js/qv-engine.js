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
  function stageOf(s) { return s.discovery ? D.stageForRound(s.round) : 5; }
  function create(list, seed, opts) {
    opts = opts || {};
    var s = {
      v: 1, gid: (seed >>> 0) || 1, seq: 0, rng: (seed >>> 0) || 1, phase: "play", round: 1, turn: 0,
      order: [], players: {}, deck: [], discard: [], nextU: 1, pending: null,
      events: [], evId: 0, seasonDeck: [], season: null, winner: null,
    };
    s.mode = opts.mode === "adult" ? "adult" : "classic";
    s.discovery = !!opts.discovery;
    s.format = D.FORMATS[opts.format] ? opts.format : "classique";
    var F = D.FORMATS[s.format];
    s.maxRounds = F.rounds; s.every = F.every; s.dry = F.dry;
    s.stage = stageOf(s);
    s.discard = [];
    list.forEach(function (p) {
      s.order.push(p.id);
      s.players[p.id] = {
        id: p.id, name: String(p.name || "Joueur").slice(0, 16), avatar: p.avatar || null, bot: !!p.bot,
        hand: [], obj: [], b: 3, f: 3, r: 1,
        job: null, edu: 0, studies: [], zone: [], engaged: false, dry: 0, dryJob: 0, pension: 0, skip: 0, partner: null, married: false, kids: [], garde: false, kidsAway: false,
        housing: 0, items: [], scandal: 0, startup: 0, strike: 0, rebound: false, plays: 0, st: {}, retired: false,
        stats: { sab: 0, hits: 0, played: {} }, life: [], mood: "happy", log: [], got: [],
      };
    });
    shuffle(s, s.order);
    D.CARDS.forEach(function (c) {
      if (c.adult && s.mode !== "adult") return;
      var n = (c.copies === 0 ? 0 : (c.copies || 1)) + (list.length >= 4 ? (c.per4 || 0) : 0);
      for (var i = 0; i < n; i++) s.deck.push({ u: s.nextU++, k: c.key });
    });
    shuffle(s, s.deck);
    s.seasonDeck = shuffle(s, D.EVENTS.filter(function (e) { return !e.adult || s.mode === "adult"; }).map(function (e) { return e.key; }));
    var objs = shuffle(s, D.OBJECTIVES.map(function (o) { return o.key; }));
    s.order.forEach(function (id, i) {
      var p = s.players[id];
      p.obj = [objs[(i * 2) % objs.length], objs[(i * 2 + 1) % objs.length]];
      // distribution équilibrée : une carte Études, un métier accessible, une carte au hasard
      if (!s.discovery) {
        drawWhere(s, p, function (c) { return c.fam === "study" && !check(p, c.req, s); });
        drawWhere(s, p, function (c) { var j = jobOfCard(c); return j && !j.study && !j.minR && (j.edu || 0) <= 1; });
        while (p.hand.length < D.HAND_SIZE && draw(s, p)) {}
      }
      life(s, p, "Naît, grandit, et finit par quitter l'école avec 3 euros en poche.", "neutral");
    });
    if (s.discovery) emit(s, { t: "stage", stage: 1, title: D.STAGES[1].title, text: D.STAGES[1].text });
    beginTurn(s);
    return s;
  }

  function age(s) { var n = Math.max(2, s.maxRounds || 12); return Math.round(D.AGE_FROM + (Math.min(s.round, n) - 1) * (D.AGE_TO - D.AGE_FROM) / (n - 1)); }
  function cur(s) { return s.players[s.order[s.turn]]; }
  function emit(s, ev) {
    ev.id = ++s.evId; ev.round = s.round;
    // conséquences lisibles (hors ressources) : différence avec la photo prise avant l'action
    if (!ev.changes && s._snap && !s._snapUsed && (ev.t === "card" || ev.t === "block" || ev.t === "season" || ev.t === "status")) { ev.changes = diffAll(s, s._snap); s._snapUsed = true; }
    s.events.push(ev); if (s.events.length > 40) s.events.shift(); return ev;
  }
  // ---------- conséquences en toutes lettres ----------
  function snap(p) {
    return { job: p.job ? { k: p.job.k, lv: p.job.lv } : null, title: jobTitle(p), pay: baseSalary(p), retired: p.retired, edu: p.edu, engaged: p.engaged, partner: p.partner ? p.partner.name : null, married: p.married,
      kids: p.kids.map(function (k) { return k.name; }), garde: p.garde, housing: p.housing, items: p.items.slice(), st: Object.keys(p.st || {}), scandal: p.scandal };
  }
  function snapAll(s) { var o = {}; s.order.forEach(function (id) { o[id] = snap(s.players[id]); }); return o; }
  function diffAll(s, before) {
    var out = [];
    s.order.forEach(function (id) {
      var b = before[id], a = snap(s.players[id]), t = [];
      if (!b) return;
      var payTxt = function (v) { return v ? " · salaire " + v + " € par tour" : ""; };
      if (!b.job && a.job) t.push("Nouveau métier : " + a.title + payTxt(a.pay));
      else if (b.job && !a.job) t.push(a.retired ? "Part à la retraite · pension " + (s.players[id].pension || 0) + " € par tour" : "Perd son métier : " + b.title + " (−" + b.pay + " € par tour)" + (a.edu ? " · garde sa Formation " + a.edu : ""));
      else if (b.job && a.job && b.job.k !== a.job.k) t.push("Change de métier : " + a.title + payTxt(a.pay));
      else if (b.job && a.job && a.job.lv > b.job.lv) t.push("Promotion : " + a.title + payTxt(a.pay));
      else if (b.job && a.job && a.job.lv < b.job.lv) t.push("Rétrogradé·e : " + a.title + payTxt(a.pay));
      else if (b.job && a.job && a.pay > b.pay) t.push("Salaire : " + b.pay + " → " + a.pay + " € par tour");
      if (a.edu > b.edu) t.push("Formation : niveau " + a.edu + unlockedJobs(b.edu, a.edu)); else if (a.edu < b.edu) t.push("Formation retirée : niveau " + a.edu);
      if (!b.engaged && a.engaged && !a.married) t.push("Fiancé·e à " + a.partner);
      if (!b.partner && a.partner) t.push("En couple avec " + a.partner);
      else if (b.partner && !a.partner) t.push(b.married ? "Divorcé·e de " + b.partner : "Rupture avec " + b.partner);
      else if (b.partner && a.partner && b.partner !== a.partner) t.push("Nouveau couple avec " + a.partner);
      if (!b.married && a.married) t.push("Marié·e avec " + a.partner);
      if (a.kids.length > b.kids.length) t.push("Bébé : " + a.kids[a.kids.length - 1]);
      if (!b.garde && a.garde) t.push("Garde alternée des enfants");
      if (a.housing > b.housing) t.push("Emménage : " + D.HOUSING[a.housing]);
      else if (a.housing < b.housing) t.push("Logement perdu : retour à « " + D.HOUSING[a.housing] + " »");
      a.items.forEach(function (k) { if (b.items.indexOf(k) < 0) t.push("Gagne : " + D.ITEMS[k].name); });
      b.items.forEach(function (k) { if (a.items.indexOf(k) < 0) t.push("Perd : " + D.ITEMS[k].name); });
      a.st.forEach(function (k) { if (b.st.indexOf(k) < 0 && D.STATUSES[k]) t.push("Nouvel état : " + D.STATUSES[k].label); });
      b.st.forEach(function (k) { if (a.st.indexOf(k) < 0 && D.STATUSES[k]) t.push("Fini : " + D.STATUSES[k].label); });
      if (!b.scandal && a.scandal) t.push("Scandale en cours");
      if (t.length) out.push({ p: id, t: t });
    });
    return out;
  }
  function life(s, p, text, tone) { p.life.push({ age: age(s), text: text, tone: tone || "good" }); }
  function fill(text, p, extra) {
    return String(text || "")
      .replace("{partner}", (extra && extra.partner) || (p.partner ? p.partner.name : "l'ex"))
      .replace("{kid}", (extra && extra.kid) || "un bébé")
      .replace("{amount}", (extra && extra.amount) || "");
  }

  // pioche : seulement les cartes déjà débloquées (découverte progressive, imposée par le moteur)
  function tierOf(k) { return (CARDS[k] && CARDS[k].tier) || 4; }
  function gotCard(s, p, card) {
    var c = CARDS[card.k];
    if (c && c.fam === "study") p.dry = 0;
    if (c && jobOfCard(c) && !check(p, c.req, s)) p.dryJob = 0;
    if (c && c.fam === "home") p.dryHome = 0;
    if (c && (c.key === "foudre" || c.key === "plancoloc" || c.key === "mariageraison" || c.key === "sugar")) p.dryLove = 0;
    p.hand.push({ u: card.u, k: card.k });
  }
  function reshuffle(s) {
    if (!s.discard.length) return false;
    s.deck = shuffle(s, s.deck.concat(s.discard.map(function (d) { return { u: d.u, k: d.k }; }))); s.discard = [];
    return true;
  }
  function draw(s, p) {
    var stage = stageOf(s);
    for (var pass = 0; pass < 2; pass++) {
      for (var i = s.deck.length - 1; i >= 0; i--) if (tierOf(s.deck[i].k) <= stage) { gotCard(s, p, s.deck.splice(i, 1)[0]); return true; }
      if (!reshuffle(s)) return false;
    }
    return false;
  }
  // pioche ciblée (distribution de départ, coup de pouce quand le hasard est trop cruel)
  function drawWhere(s, p, pred) {
    var stage = stageOf(s);
    for (var i = s.deck.length - 1; i >= 0; i--) { var c = CARDS[s.deck[i].k]; if (c && tierOf(c.key) <= stage && pred(c)) { gotCard(s, p, s.deck.splice(i, 1)[0]); return true; } }
    return draw(s, p);
  }
  function toDiscard(s, card, how, by) { if (card) s.discard.push({ u: card.u, k: card.k, how: how || "used", by: by || null }); }
  // ---------- zones permanentes du plateau (parcours, métier, amour, famille, logement, objets) ----------
  function zoneOf(c) {
    if (!c) return null;
    if (c.fam === "study") return "studies";
    var ops = (c.fx || []).map(function (f) { return f.op; });
    if (ops.indexOf("job") >= 0 || ops.indexOf("startup") >= 0) return "job";
    if (ops.indexOf("partner") >= 0 || ops.indexOf("marry") >= 0 || ops.indexOf("vegas") >= 0 || ops.indexOf("engage") >= 0) return "love";
    if (ops.indexOf("kid") >= 0) return "family";
    if (ops.indexOf("housing") >= 0) return "home";
    if (ops.indexOf("item") >= 0) return "items";
    return null;
  }
  function dropZone(s, p, z, pred) {
    p.zone = (p.zone || []).filter(function (e) { if (e.z === z && (!pred || pred(e))) { toDiscard(s, e, "lost", p.id); return false; } return true; });
  }
  function jobOfCard(c) { var f = (c && c.fx || []).filter(function (x) { return x.op === "job"; })[0]; return f ? D.JOBS[f.job] : null; }
  function jobKeyOfCard(c) { var f = (c && c.fx || []).filter(function (x) { return x.op === "job"; })[0]; return f ? f.job : null; }
  // un métier est-il accessible avec cette formation ? "" si oui, sinon la raison
  function qualifies(p, key, s) {
    var J = D.JOBS[key]; if (!J) return "Métier inconnu";
    if (J.study && (p.studies || []).indexOf(J.study) < 0) return "Nécessite le " + (CARDS[J.study] ? CARDS[J.study].name : J.study);
    if (J.edu && (p.edu || 0) < J.edu) return "Nécessite Formation " + J.edu + " — tu as " + (p.edu || 0);
    if (J.minR && p.r < J.minR) return "Nécessite " + J.minR + " Réputation — tu en as " + p.r;
    return "";
  }
  // le meilleur métier accessible (Entretien d'embauche, Reconversion) ; la carte est prise dans la pioche ou la défausse
  function bestJob(s, p, other, take) {
    var keys = Object.keys(D.JOBS).filter(function (k) { var J = D.JOBS[k]; return J.card && CARDS[J.card] && !qualifies(p, k, s) && !(other && p.job && p.job.k === k) && k !== "influence"; });
    if (!keys.length) return null;
    keys.sort(function (a, b) { return jobPay(D.JOBS[b]) - jobPay(D.JOBS[a]); });
    var key = keys[0], card = null;
    if (take) {
      var ck = D.JOBS[key].card;
      for (var i = s.deck.length - 1; i >= 0; i--) if (s.deck[i].k === ck) { card = s.deck.splice(i, 1)[0]; break; }
      if (!card) for (var j = s.discard.length - 1; j >= 0; j--) if (s.discard[j].k === ck) { card = s.discard.splice(j, 1)[0]; break; }
    }
    return { key: key, card: card };
  }
  function jobBonus(key) {
    var c = CARDS[D.JOBS[key].card], o = {};
    (c && c.fx || []).forEach(function (f) { if (f.op === "res" && !f.who) ["b", "f", "r"].forEach(function (k) { if (f[k]) o[k] = (o[k] || 0) + f[k]; }); });
    return o;
  }
  function jobPay(J, lv) { return J ? J.salary + (lv || 1) - 1 : 0; }
  function unlockedJobs(a, b) {
    var t = Object.keys(D.JOBS).filter(function (k) { var J = D.JOBS[k]; return J.card && !J.study && J.edu > a && J.edu <= b; }).map(function (k) { return D.JOBS[k].titles[0]; });
    return t.length ? " · débloque : " + t.join(", ") : "";
  }

  // ---------- conditions ----------
  function jobDef(p) { return p.job ? D.JOBS[p.job.k] : null; }
  function salary(p) {
    var j = jobDef(p); if (!j) return p.retired ? (p.pension || 0) : 0;
    var v = j.salary + (p.job.lv - 1) + (p.job.raise || 0) + (j.perRep ? Math.floor(p.r / j.perRep) : 0);
    if (p.st && p.st.chompartiel) return 0;
    if (p.st && p.st.burnout) v = Math.floor(v / 2);
    return v;
  }
  function baseSalary(p) { var j = jobDef(p); return j ? j.salary + (p.job.lv - 1) + (p.job.raise || 0) + (j.perRep ? Math.floor(p.r / j.perRep) : 0) : 0; }
  function jobTitle(p) { var j = jobDef(p); return j ? j.titles[Math.min(p.job.lv, j.titles.length) - 1] : "Sans emploi"; }
  function check(p, req, s) {
    if (!req) return "";
    if (req.noStatus) for (var i = 0; i < req.noStatus.length; i++) if (p.st && p.st[req.noStatus[i]]) return "Impossible pour l'instant : " + D.STATUSES[req.noStatus[i]].label.toLowerCase();
    if (req.status && !(p.st && p.st[req.status])) return "Il faut : " + D.STATUSES[req.status].label.toLowerCase();
    if (req.minAge && s && age(s) < req.minAge) return "Il faut avoir " + req.minAge + " ans";
    if (req.hits && p.stats.hits < req.hits) return "Il faut avoir encaissé une catastrophe";
    if (req.minHand && Math.max(p.hand.length, p.handCount || 0) < req.minHand) return "Sa main est vide";
    if (req.qualify) {
      if (p.job && p.job.k === req.qualify) return "Tu fais déjà ce métier";
      var qw = qualifies(p, req.qualify, s); if (qw) return qw;
      if (p.job && jobPay(D.JOBS[req.qualify], 1) <= baseSalary(p)) return "Ton métier paie déjà autant (Reconversion ou Démission pour changer)";
    }
    if (req.minEdu && (p.edu || 0) < req.minEdu) return "Nécessite Formation " + req.minEdu + " — tu as " + (p.edu || 0);
    if (req.maxEdu !== undefined && (p.edu || 0) > req.maxEdu) return req.maxEdu === 0 ? "Tu as déjà le bac" : "Trop facile pour ta Formation (" + p.edu + ")";
    if (req.notStudy && (p.studies || []).indexOf(req.notStudy) >= 0) return "Déjà obtenu";
    if (req.maxRaise && p.job && (p.job.raise || 0) >= req.maxRaise) return "Déjà augmenté·e 2 fois";
    if (req.minSalary && baseSalary(p) < req.minSalary) return "Nécessite un salaire de " + req.minSalary + " — tu gagnes " + baseSalary(p);
    if (req.reconv) {
      if (!p.job && !(p.st && p.st.chomage)) return "Il faut un métier (ou être au chômage)";
      if (!bestJob(s, p, true)) return "Aucun autre métier accessible avec ta Formation";
    }
    if (req.notEngaged && p.engaged) return "Déjà fiancé·e";
    if (req.noJob && p.job) return "Tu as déjà un métier";
    if (req.notJob && p.job && p.job.k === req.notJob) return "Tu fais déjà ce métier";
    if (req.hasJob && !p.job) return "Il faut un métier";
    if (req.job && (!p.job || p.job.k !== req.job)) return "Il faut ce métier";
    if (req.promotable) {
      if (!p.job || p.job.k === "startup") return "Il faut un métier";
      if (p.job.lv >= jobDef(p).titles.length) return "Déjà au sommet";
    }
    if (req.diploma && (p.edu || 0) < req.diploma) return "Nécessite Formation " + req.diploma;
    if (req.minR && p.r < req.minR) return "Nécessite " + req.minR + " Réputation — tu en as " + p.r;
    if (req.minF && p.f < req.minF) return "Nécessite " + req.minF + " Fortune — tu en as " + p.f;
    if (req.minB && p.b < req.minB) return "Nécessite " + req.minB + " Bonheur — tu en as " + p.b;
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
  // un paiement est toujours signalé (notes), pour que l'écran l'anime
  function pay(p, cost, notes) {
    if (!cost) return;
    ["b", "f", "r"].forEach(function (k) { if (cost[k]) { p[k] -= cost[k]; if (notes) notes.push({ p: p.id, k: k, v: -cost[k], cost: true }); } });
  }
  function costText(cost) {
    var t = []; if (!cost) return "";
    if (cost.f) t.push(cost.f + " fortune"); if (cost.b) t.push(cost.b + " bonheur"); if (cost.r) t.push(cost.r + " réputation");
    return t.join(", ");
  }

  function canPlay(s, id, k, target) { return canPlayCard(s, id, CARDS[k], target); }
  function canPlayCard(s, id, c, target) {
    var p = s.players[id];
    if (!p || !c) return "Carte inconnue";
    if (c.reaction && !c.alsoPlay) return "Se joue quand on t'attaque";
    if ((c.tier || 4) > stageOf(s)) return "Pas encore débloquée";
    if (c.need === "saboteur" && !s.order.some(function (o) { return o !== id && s.players[o].stats.sab > 0; })) return "Personne n'a encore saboté";
    var why = check(p, c.req, s); if (why) return why;
    if (!affordable(p, c.cost)) {
      var miss = ["f", "b", "r"].filter(function (k) { return c.cost[k] && p[k] < c.cost[k]; })[0];
      return "Coûte " + c.cost[miss] + " " + { f: "Fortune", b: "Bonheur", r: "Réputation" }[miss] + " — tu en as " + p[miss];
    }
    if (c.target === "opponent") {
      var ts = s.order.filter(function (o) { return o !== id && !check(s.players[o], c.treq, s); });
      if (!ts.length) return "Aucune cible possible";
      if (target !== undefined && target !== null && ts.indexOf(target) < 0) return "Cible impossible";
    }
    return "";
  }
  function validTargets(s, id, k) {
    var c = CARDS[k];
    return s.order.filter(function (o) { return o !== id && !check(s.players[o], c.treq, s); });
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
        dropZone(s, p, "job"); p.job = { k: o.job, lv: 1 }; p.startup = 0; p.retired = false; p.pension = 0; delete p.st.chomage; ctx.hired = o.job; break;
      case "edu":
        var before_ = p.edu || 0; p.edu = Math.min(D.EDU_MAX, before_ + (o.n || 1));
        if (o.study && p.studies.indexOf(o.study) < 0) p.studies.push(o.study);
        if (o.fake) p.fakeEdu = (p.fakeEdu || 0) + (p.edu - before_);
        ctx.edu = { from: before_, to: p.edu }; break;
      case "hireBest":
        var bj = bestJob(s, p, false, true);
        if (bj) {
          dropZone(s, p, "job");
          p.job = { k: bj.key, lv: 1 }; p.startup = 0; p.retired = false; p.pension = 0; delete p.st.chomage; ctx.hired = bj.key;
          if (bj.card) p.zone.push({ u: bj.card.u, k: bj.card.k, z: "job" });
          addRes(s, p, jobBonus(bj.key), n);
        }
        break;
      case "reconvert":
        var cur_ = p.job ? p.job.k : null, rj = bestJob(s, p, true, true);
        if (rj) {
          dropZone(s, p, "job");
          p.job = { k: rj.key, lv: 1 }; p.startup = 0; delete p.st.chomage; ctx.hired = rj.key; ctx.from = cur_;
          if (rj.card) p.zone.push({ u: rj.card.u, k: rj.card.k, z: "job" });
        }
        break;
      case "jobOffer":
        // une offre d'emploi accessible arrive dans la main (cherchée dans la pioche)
        for (var oi = s.deck.length - 1; oi >= 0; oi--) { var oc = CARDS[s.deck[oi].k], jk = jobKeyOfCard(oc); if (jk && tierOf(oc.key) <= stageOf(s) && !qualifies(p, jk, s) && (!p.job || jobPay(D.JOBS[jk]) > baseSalary(p))) { gotCard(s, p, s.deck.splice(oi, 1)[0]); ctx.offer = oc.key; break; } }
        break;
      case "raise": if (p.job) p.job.raise = (p.job.raise || 0) + 1; break;
      case "engage": p.engaged = true; break;
      case "ifEngaged": if (p.engaged) { ctx.combo = o.combo; run(s, p, o.fx, ctx); } break;
      case "ifStatus": if (p.st[o.s]) { ctx.combo = o.combo; run(s, p, o.fx, ctx); } else if (o.else) run(s, p, o.else, ctx); break;
      case "audit":
        if (p.st.fakeDip || p.st.liar) {
          ctx.combo = "Contrôle + " + (p.st.fakeDip ? "diplôme douteux" : "CV bidon") + " : SCANDALE !"; ctx.scene = "demasque"; ctx.busted = true;
          if (p.st.fakeDip) { p.edu = Math.max(0, p.edu - Math.max(2, p.fakeEdu || 2)); p.fakeEdu = 0; dropZone(s, p, "studies", function (e) { return e.k === "fauxdiplome"; }); }
          delete p.st.fakeDip; delete p.st.liar;
          if (p.job) { dropZone(s, p, "job"); p.job = null; }
          addRes(s, p, { r: -4 }, n); p.scandal = Math.max(p.scandal, 2);
        } else addRes(s, p, { f: -1, b: -1 }, n);
        break;
      case "burnoutHit":
        if (rand(s) < 0.5 || !p.job) { p.skipNow = true; ctx.text = "{name} est en arrêt maladie : tour passé."; }
        else { dropZone(s, p, "job"); p.job = null; p.st.chomage = 2; ctx.text = "{name} craque et démissionne : fin du métier (les diplômes restent)."; }
        break;
      case "jobUp":
        if (p.st.fakeDip && rand(s) < 0.5) {
          // quelqu'un vérifie le diplôme…
          delete p.st.fakeDip; dropZone(s, p, "job"); p.job = null; p.edu = Math.max(0, p.edu - Math.max(2, p.fakeEdu || 2)); p.fakeEdu = 0;
          dropZone(s, p, "studies", function (e) { return e.k === "fauxdiplome"; }); ctx.combo = "Promotion + diplôme douteux : vérifié !";
          addRes(s, p, { r: -3 }, n); ctx.scene = "demasque"; ctx.busted = true;
          life(s, p, "Promotion annulée : le service RH a vérifié le diplôme. Licencié·e sur-le-champ.", "bad");
        } else if (p.job) p.job.lv++;
        break;
      case "jobDown":
        if (p.job && p.job.lv > 1) p.job.lv--; else addRes(s, p, { r: -1 }, n);
        break;
      case "loseJob": if (p.job) dropZone(s, p, "job"); p.job = null; p.startup = 0; break;
      case "diploma": p.edu = Math.min(D.EDU_MAX, (p.edu || 0) + 1); break;
      case "partner":
        p.partner = { name: pick(s, D.NAMES.partner), seed: seedFor(s) }; if (o.look) p.partner.look = o.look; ctx.partner = p.partner.name; break;
      case "vegas":
        if (!p.partner) { p.partner = { name: pick(s, D.NAMES.partner), seed: seedFor(s) }; ctx.stranger = true; }
        ctx.partner = p.partner.name; p.married = true; break;
      case "breakup":
        if (!p.partner) break;
        ctx.partner = p.partner.name; ctx.exSeed = p.partner.seed;
        p.partner = null; p.married = false; p.engaged = false; dropZone(s, p, "love");
        if (p.st.doublevie) delete p.st.doublevie;
        if (p.kids.length) { p.garde = true; ctx.garde = true; ctx.kids = p.kids.map(function (k) { return k.seed; }); }
        break;
      case "status": p.st[o.s] = Math.max(p.st[o.s] || 0, o.n || 1); break;
      case "unstatus": delete p.st[o.s]; break;
      case "chance":
        if (rand(s) < o.p) { ctx.lucky = true; run(s, p, o.fx, ctx); } else { ctx.lucky = false; run(s, p, o.else, ctx); }
        break;
      case "scene": ctx.scene = o.id; break;
      case "steal":
        var att = s.players[ctx.attacker], took = Math.min(p.f, o.f);
        addRes(s, p, { f: -took }, n); if (att && att !== p) addRes(s, att, { f: Math.min(took, o.give) }, n); break;
      case "give":
        var att2 = s.players[ctx.attacker], gv = Math.min(p.f, o.f);
        addRes(s, p, { f: -gv }, n); if (att2 && att2 !== p) addRes(s, att2, { f: gv }, n); break;
      case "stealCard":
        var att3 = s.players[ctx.attacker];
        if (p.hand.length && att3 && att3 !== p) { var ci = Math.floor(rand(s) * p.hand.length); att3.hand.push(p.hand.splice(ci, 1)[0]); ctx.stole = true; }
        break;
      case "housingDown": p.housing = Math.max(0, p.housing - 1); var hz = p.zone.filter(function (e) { return e.z === "home"; }).pop(); if (hz) dropZone(s, p, "home", function (e) { return e === hz; }); break;
      case "housingMin": p.housing = Math.max(p.housing, o.level); break;
      case "noSalary": p.strike = 1; break;
      case "retire": p.pension = Math.max(1, Math.floor(baseSalary(p) / 2)); if (p.job) dropZone(s, p, "job"); p.job = null; p.startup = 0; p.retired = true; delete p.st.burnout; break;
      case "rebound": p.rebound = true; break;
      case "clearBad":
        p.scandal = 0;
        Object.keys(p.st).forEach(function (k) { if (D.STATUSES[k] && D.STATUSES[k].bad) delete p.st[k]; });
        break;
      case "ifMarried": if (p.married) run(s, p, o.fx, ctx); else if (o.else) run(s, p, o.else, ctx); break;
      case "ifJob": if (p.job) run(s, p, o.fx, ctx); else if (o.else) run(s, p, o.else, ctx); break;
      case "duel":
        var a4 = s.players[ctx.attacker], win = a4.r > p.r ? a4 : p, lose = win === p ? a4 : p;
        addRes(s, win, { f: 4 }, n); addRes(s, lose, { f: -4, r: -1 }, n);
        ctx.winner = win.id; mood(win, "smug"); mood(lose, "sad");
        break;
      case "karma":
        var others = s.order.filter(function (id) { return id !== p.id; });
        var maxS = Math.max.apply(null, others.map(function (id) { return s.players[id].stats.sab; }));
        ctx.victims = others.filter(function (id) { return maxS > 0 && s.players[id].stats.sab === maxS; });
        ctx.victims.forEach(function (id) { addRes(s, s.players[id], { r: -3, b: -2 }, n); mood(s.players[id], "shocked"); });
        break;
      case "karmaInf":
        var guilty = s.order.filter(function (id) { var q = s.players[id]; return q.st.doublevie || q.stats.sab >= 2; });
        guilty.forEach(function (id) { addRes(s, s.players[id], { r: -2, b: -2 }, n); mood(s.players[id], "shocked"); });
        var rest = s.order.filter(function (id) { return guilty.indexOf(id) < 0; });
        if (rest.length) {
          var minS = Math.min.apply(null, rest.map(function (id) { return s.players[id].stats.sab; }));
          ctx.saints = rest.filter(function (id) { return s.players[id].stats.sab === minS; });
          ctx.saints.forEach(function (id) { addRes(s, s.players[id], { b: 3 }, n); });
        }
        ctx.victims = guilty;
        break;
      case "panne":
        s.order.forEach(function (id) {
          var q = s.players[id];
          if (q.hand.length) { s.discard.push(q.hand.splice(Math.floor(rand(s) * q.hand.length), 1)[0]); draw(s, q); }
          addRes(s, q, { b: 1 }, n);
          if (q.job && q.job.k === "influence") addRes(s, q, { r: -2 }, n);
        });
        break;
      case "marry": p.married = true; break;
      case "divorce":
        ctx.partner = p.partner ? p.partner.name : "l'ex";
        ctx.exSeed = p.partner ? p.partner.seed : 1;
        p.partner = null; p.married = false; p.engaged = false; delete p.st.doublevie; dropZone(s, p, "love");
        if (p.kids.length) { p.garde = true; ctx.garde = true; ctx.kids = p.kids.map(function (k) { return k.seed; }); }
        if (o.soft) { addRes(s, p, { b: -1 }, n); }
        else {
          addRes(s, p, { b: -3, f: -Math.ceil(p.f / 2) }, n);
          if (p.items.indexOf("toaster") < 0) p.items.push("toaster");
        }
        break;
      case "kid":
        var kname = pick(s, D.NAMES.kid);
        p.kids.push({ name: kname, seed: seedFor(s), adopted: !!o.adopted }); ctx.kid = kname; break;
      case "item": if (p.items.indexOf(o.item) < 0) p.items.push(o.item); break;
      case "housing": if (o.level > p.housing) dropZone(s, p, "home"); p.housing = Math.max(p.housing, o.level); break;
      case "startup": dropZone(s, p, "job"); p.job = { k: "startup", lv: 1 }; p.startup = 2; break;
      case "lottery":
        var amount = pick(s, [1, 1, 1, 2, 2, 3, 4, 7]);
        addRes(s, p, { f: amount }, n); ctx.amount = amount; break;
      case "clearScandal": p.scandal = 0; break;
      case "scandal": p.scandal = Math.max(p.scandal, o.turns); break;
      case "taxThird": addRes(s, p, { f: -Math.min(p.f, Math.max(2, Math.floor(p.f / 3))) }, n); break;
      case "ifPartner": if (p.partner) run(s, p, o.fx, ctx); else if (o.else) run(s, p, o.else, ctx); break;
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
          if (!check(q, o.cond, s)) run(s, q, o.fx, ctx); else if (o.else) run(s, q, o.else, ctx);
        });
        break;
    }
  }

  function mood(p, m) { p.mood = m; }

  // ---------- tours ----------
  function beginTurn(s) {
    var p = cur(s), notes = [], info = [];
    s.phase = "play";
    p.plays = 1 + (p.rebound ? 1 : 0);
    if (p.rebound) info.push("Rebond : 2 cartes ce tour-ci");
    var rebound = p.rebound;
    p.rebound = false;
    var J = jobDef(p);
    var pay_ = salary(p);
    if (p.strike > 0) { p.strike = 0; if (p.job) info.push("Grève : pas de salaire"); }
    else if (pay_) addRes(s, p, { f: pay_ }, notes);
    else if (p.job && p.st.chompartiel) info.push("Chômage partiel : pas de salaire");
    if (p.job && p.st.burnout && pay_) info.push("Burn-out : salaire réduit de moitié");
    if (J && J.perTurn) addRes(s, p, J.perTurn, notes);
    if (p.kids.length) {
      if (p.garde) p.kidsAway = !p.kidsAway;
      var home = p.kidsAway ? 0 : p.kids.length;
      if (home) { addRes(s, p, { b: home, f: -home }, notes); }
      else info.push("Les enfants sont chez l'autre parent");
    }
    if (p.scandal > 0) { p.scandal--; addRes(s, p, { r: -1 }, notes); info.push("Scandale : −1 réputation"); }
    p.items.forEach(function (k) { var it = D.ITEMS[k]; if (it && it.income) addRes(s, p, it.income, notes); });
    var stEvents = [];
    Object.keys(p.st).forEach(function (k) {
      var def = D.STATUSES[k]; if (!def) { delete p.st[k]; return; }
      var sctx = { notes: notes, attacker: p.id };
      if (def.tick) run(s, p, def.tick, sctx);
      var pr = def.risk ? (def.risk.risky && J && J.risky ? def.risk.risky : def.risk.p) : 0;
      if (def.risk && rand(s) < pr) {
        delete p.st[k];
        var rctx = { notes: [], attacker: p.id };
        var before = snapAll(s);
        run(s, p, def.risk.fx, rctx); mood(p, "shocked");
        rctx.changes = diffAll(s, before);
        life(s, p, rctx.text ? rctx.text.replace("{name} ", "") : def.risk.life, "bad");
        stEvents.push({ t: "status", s: k, p: p.id, scene: def.risk.scene, notes: rctx.notes, changes: rctx.changes, data: { exSeed: rctx.exSeed, partner: rctx.partner }, text: (rctx.text || def.risk.text).replace("{name}", p.name) });
        return;
      }
      if (def.perm) return;
      p.st[k]--;
      if (p.st[k] <= 0) {
        delete p.st[k];
        var ectx = { notes: [], attacker: p.id };
        if (def.onEnd) run(s, p, def.onEnd, ectx);
        if (def.endText) stEvents.push({ t: "status", s: k, p: p.id, end: true, notes: ectx.notes, text: def.endText.replace("{name}", p.name) });
      }
    });
    var startupEv = null;
    if (p.startup > 0) {
      p.startup--;
      if (p.startup === 0) {
        if (rand(s) < 0.6) {
          p.job = { k: "pdg", lv: 1 }; addRes(s, p, { r: 4, f: 3 }, notes); mood(p, "smug");
          life(s, p, "Sa start-up devient une licorne. Il·elle dit « disruptif » à chaque phrase.", "good");
          startupEv = { t: "card", k: "startup", p: p.id, outcome: "win", scene: "startupWin", text: p.name + " lève 40 millions : sa start-up devient une licorne !" };
        } else {
          dropZone(s, p, "job"); p.job = null; addRes(s, p, { r: -1, b: -1 }, notes); mood(p, "sad");
          life(s, p, "Faillite de la start-up. Il reste 2 000 paires de chaussettes en stock.", "bad");
          startupEv = { t: "card", k: "startup", p: p.id, outcome: "fail", scene: "startupFail", text: p.name + " fait faillite. Les chaussettes connectées n'ont pas pris." };
        }
      }
    }
    // compteurs « pas de chance » (aides : pioche coup de pouce, autoformation)
    p.dry = (p.dry || 0) + 1;
    if (p.job || p.retired) p.dryJob = 0; else p.dryJob = (p.dryJob || 0) + 1;
    p.dryHome = p.housing ? 0 : (p.dryHome || 0) + 1;
    p.dryLove = p.partner || p.married ? 0 : (p.dryLove || 0) + 1;
    var skip = !!p.skipNow; p.skipNow = false;
    if (skip) {
      p.plays = 0;
      emit(s, { t: "turn", p: p.id, notes: notes, info: info.concat(["Arrêt maladie : tour passé"]), round: s.round, skip: true });
      stEvents.forEach(function (e) { emit(s, e); });
      return endTurn(s);
    }
    // 1. on remplace les cartes utilisées hors de son tour (réactions, vols) pour garder une main cohérente
    var base = s.discovery && stageOf(s) < 5 ? Math.max(0, D.STAGES[stageOf(s)].hand - 1) : D.HAND_SIZE, guard = 0;
    while (p.hand.length < base && guard++ < 10 && draw(s, p)) {}
    // 2. la pioche du tour : la pioche, ou la dernière carte défaussée (à jouer tout de suite)
    var extra = rebound ? 1 : 0;
    for (var e = 0; e < extra; e++) draw(s, p);
    if (takeable(s, p)) { s.phase = "draw"; info.push("Pioche… ou prends la défausse"); }
    else drawTurn(s, p);
    emit(s, { t: "turn", p: p.id, notes: notes, info: info, round: s.round, phase: s.phase });
    if (startupEv) { startupEv.notes = notes; emit(s, startupEv); }
    stEvents.forEach(function (e) { emit(s, e); });
  }
  // la carte de la pioche du tour, avec un coup de pouce quand le hasard est trop cruel
  function drawTurn(s, p) {
    if (p.hand.length > D.HAND_SIZE + (p.plays > 1 ? 1 : 0)) return false; // main déjà pleine (carte volée, offre d'emploi…)
    var studyNeed = p.dry > s.dry + 1 && p.edu < 3 && !p.hand.some(function (h) { return CARDS[h.k].fam === "study"; });
    var jobNeed = !p.job && !p.retired && p.dryJob > s.dry && !p.hand.some(function (h) { var c = CARDS[h.k]; return jobOfCard(c) && !check(p, c.req, s); });
    if (jobNeed) return drawWhere(s, p, function (c) { return (jobOfCard(c) && !check(p, c.req, s)) || c.key === "entretien"; });
    if (studyNeed) return drawWhere(s, p, function (c) { return c.fam === "study" && c.copies !== 0 && !check(p, c.req, s); });
    // la vie personnelle aussi : un logement, une rencontre, quand le hasard s'acharne
    var late = s.round > s.maxRounds / 3;
    if (late && !p.housing && p.dryHome > s.dry + 3 && !p.hand.some(function (h) { return CARDS[h.k].fam === "home"; })) return drawWhere(s, p, function (c) { return c.key === "appart" || c.key === "maison"; });
    if (late && !p.partner && p.dryLove > s.dry + 4 && !p.hand.some(function (h) { return CARDS[h.k].key === "foudre"; })) return drawWhere(s, p, function (c) { return c.key === "foudre"; });
    return draw(s, p);
  }
  // la défausse se reprend seulement si un AUTRE joueur l'a défaussée volontairement, et si elle est jouable
  function takeable(s, p) {
    var top = s.discard[s.discard.length - 1];
    if (!top || top.how !== "rest" || top.by === p.id) return false;
    var c = CARDS[top.k]; if (!c || (c.reaction && !c.alsoPlay) || tierOf(c.key) > stageOf(s)) return false;
    return !canPlayCard(s, p.id, c, null, true);
  }
  // l'autoformation de secours : pas de carte Études depuis plusieurs tours, formation de base seulement
  function canSecours(s, p) {
    if (!p || (p.edu || 0) >= 2 || p.dry < s.dry) return false;
    return !p.hand.some(function (h) { var c = CARDS[h.k]; return c.fam === "study" && !check(p, c.req, s); });
  }

  function seasonCheck(s) {
    if (s.round > 1 && (s.round - 1) % (s.every || 2) === 0 && s.seasonDeck.length) {
      var k = s.seasonDeck.shift(), e = D.EVENTS.filter(function (x) { return x.key === k; })[0];
      var ctx = { notes: [] };
      s._snap = snapAll(s); s._snapUsed = false;
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
      var prev = s.stage; s.stage = stageOf(s);
      if (s.discovery && s.stage > prev) emit(s, { t: "stage", stage: s.stage, title: D.STAGES[s.stage].title, text: D.STAGES[s.stage].text });
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
    if (c.minEdu && (p.edu || 0) < c.minEdu) return false;
    if (c.minSalary && baseSalary(p) < c.minSalary) return false;
    if (c.item && p.items.indexOf(c.item) < 0) return false;
    if (c.played) for (var k in c.played) if ((p.stats.played[k] || 0) < c.played[k]) return false;
    if (c.anyOf && !c.anyOf.some(function (a) { return (a.item && p.items.indexOf(a.item) >= 0) || (a.status && p.st[a.status]); })) return false;
    if (c.clean && (p.scandal || Object.keys(p.st).some(function (k) { return D.STATUSES[k] && D.STATUSES[k].bad; }))) return false;
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
      var top = Math.max.apply(null, s.order.map(function (id) { return s.players[id][t.k] || 0; }));
      if (top > 0 && p[t.k] === top) trophies.push({ k: t.k, name: t.name, pts: t.pts });
    });
    var tb = trophies.reduce(function (a, t) { return a + t.pts; }, 0);
    if ((p.job || p.retired) && p.housing >= 1 && (p.partner || p.kids.length)) { trophies.push({ k: "life", name: D.LIFE_BONUS.name, pts: D.LIFE_BONUS.pts }); tb += D.LIFE_BONUS.pts; }
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
  function resolveSelf(s, p, c, card, paid) {
    var ctx = { notes: (paid || []).slice(), attacker: p.id, card: card };
    var z = zoneOf(c);
    run(s, p, c.fx, ctx);
    // la carte rejoint la bonne zone de la vie du joueur (si son effet tient), sinon la défausse
    var kept = z && (z !== "job" || (p.job && (p.job.k === jobKeyOfCard(c) || (c.key === "startup" && p.job.k === "startup"))));
    if (kept) p.zone.push({ u: card.u, k: c.key, z: z }); else toDiscard(s, card, "used", p.id);
    p.stats.played[c.key] = (p.stats.played[c.key] || 0) + 1;
    p.log.push({ k: c.key, r: s.round });
    if (c.target === "all") life(s, p, c.life, "neutral");
    else if (c.key !== "startup" || true) life(s, p, fill(c.life, p, ctx), "good");
    if (c.fam === "love" || c.fam === "family" || c.fam === "leisure") mood(p, "happy");
    if (c.key === "promotion" || c.key === "voiture") mood(p, "smug");
    var ev = { t: "card", k: c.key, p: p.id, outcome: "self", scene: ctx.scene || c.scene || null, notes: ctx.notes, data: {}, zone: kept ? z : null };
    if (ctx.combo) ev.combo = ctx.combo;
    if (ctx.edu) ev.data.edu = ctx.edu;
    if (ctx.hired) ev.data.hired = ctx.hired;
    if (ctx.offer) ev.data.offer = ctx.offer;
    if (ctx.lucky !== undefined) ev.data.lucky = ctx.lucky;
    if (ctx.victims) ev.data.victims = ctx.victims;
    if (ctx.saints) ev.data.saints = ctx.saints;
    if (ctx.stranger) ev.data.stranger = true;
    if (ctx.busted) { ev.data.busted = true; mood(p, "shocked"); }
    if (ctx.garde) ev.data.kids = ctx.kids;
    if (ctx.partner) ev.data.partner = ctx.partner;
    if (ctx.kid) ev.data.kid = ctx.kid;
    if (ctx.amount) ev.data.amount = ctx.amount;
    if (ctx.singer) ev.data.singer = ctx.singer;
    if (ctx.poor) ev.data.poor = ctx.poor;
    ev.text = p.name + " joue « " + c.name + " »" + (ctx.amount ? " et gagne " + ctx.amount + " !" : ".");
    if (ctx.victims && c.key === "karma") ev.text = p.name + " invoque le karma : " + (ctx.victims.map(function (id) { return s.players[id].name; }).join(", ") || "personne") + " paie ses sabotages.";
    if (ctx.busted) ev.text = p.name + " voulait une promotion… mais les RH ont vérifié le diplôme.";
    if (ctx.lucky === true && c.key !== "after") ev.text = p.name + " joue « " + c.name + " » : coup de chance !";
    if (ctx.lucky === false && c.key !== "after") ev.text = p.name + " joue « " + c.name + " » : raté !";
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
    att.log.push({ k: c.key, r: s.round, to: tgt.id, out: mode });
    tgt.got.push({ k: c.key, r: s.round, from: att.id, out: mode });
    att.stats.sab++;
    mood(tgt, mode === "soft" ? "worried" : "sad");
    mood(att, "smug");
    if (ctx.combo) ctx.notes.combo = ctx.combo;
    var ev = {
      t: "card", k: c.key, p: att.id, to: tgt.id, outcome: mode, notes: ctx.notes, combo: ctx.combo || undefined,
      scene: mode === "soft" ? null : (ctx.scene || c.scene), data: { partner: partnerName, exSeed: partnerSeed },
    };
    if (ctx.garde && hadKids && mode !== "soft") { ev.data.garde = true; ev.data.kids = ctx.kids || []; }
    if (ctx.winner) ev.data.winner = ctx.winner;
    if (ctx.lucky !== undefined) ev.data.lucky = ctx.lucky;
    if (ctx.stole) ev.data.stole = true;
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
    s._snap = snapAll(s); s._snapUsed = false;
    var turnActs = ["play", "rest", "draw", "take", "study"];
    if (turnActs.indexOf(a.t) >= 0 && s.gate) return { ok: false, err: "Attends que tout le monde ait vu la scène" };
    if (turnActs.indexOf(a.t) >= 0 && cur(s).id !== p.id) return { ok: false, err: "Ce n'est pas ton tour" };
    // ---- pioche du tour ----
    if (a.t === "draw") {
      if (s.phase !== "draw") return { ok: false, err: "Tu as déjà pioché" };
      drawTurn(s, p); s.phase = "play";
      emit(s, { t: "drew", p: p.id, text: p.name + " pioche une carte." });
      s.seq++; return r;
    }
    if (a.t === "take") {
      if (s.phase !== "draw" || !takeable(s, p)) return { ok: false, err: "Impossible de prendre la défausse" };
      var top = s.discard[s.discard.length - 1], tc = CARDS[top.k];
      var whyT = canPlayCard(s, p.id, tc, a.target);
      if (whyT) return { ok: false, err: whyT };
      if (tc.target === "opponent" && (a.target === undefined || a.target === null)) return { ok: false, err: "Choisis une cible" };
      s.discard.pop(); s.phase = "play";
      emit(s, { t: "took", p: p.id, k: tc.key, text: p.name + " reprend « " + tc.name + " » dans la défausse et la joue !" });
      return playCard(s, p, { u: top.u, k: top.k }, tc, a.target);
    }
    if (a.t === "play" || a.t === "rest" || a.t === "study") {
      if (s.phase === "draw") return { ok: false, err: "Pioche d'abord une carte" };
      if (s.phase !== "play") return { ok: false, err: "Attends la réaction" };
      if (p.plays <= 0) return { ok: false, err: "Plus d'action" };
      var idx = -1; p.hand.forEach(function (h, i) { if (h.u === a.u) idx = i; });
      if (idx < 0) return { ok: false, err: "Carte absente" };
      var card = p.hand[idx], c = CARDS[card.k];
      if (a.t === "rest") {
        p.hand.splice(idx, 1); toDiscard(s, card, "rest", p.id); p.plays--;
        emit(s, { t: "rest", p: p.id, k: c.key, notes: [], text: p.name + " défausse « " + c.name + " »." });
        s.seq++; afterAction(s); return r;
      }
      if (a.t === "study") {
        if (!canSecours(s, p)) return { ok: false, err: "L'autoformation n'est possible qu'après " + s.dry + " tours sans carte Études (Formation 2 maximum)" };
        p.hand.splice(idx, 1); toDiscard(s, card, "rest", p.id); p.plays--; p.dry = 0;
        var sc = CARDS.autoformation, sctx = { notes: [], attacker: p.id };
        run(s, p, sc.fx, sctx);
        life(s, p, sc.life, "good"); mood(p, "happy");
        emit(s, { t: "card", k: "autoformation", p: p.id, outcome: "self", scene: null, notes: sctx.notes, data: { edu: sctx.edu, sacrificed: c.key }, text: p.name + " sacrifie son tour pour apprendre à la bibliothèque (+1 Formation)." });
        s.seq++; afterAction(s); return r;
      }
      var why = canPlay(s, p.id, card.k, a.target);
      if (why) return { ok: false, err: why };
      if (c.target === "opponent" && (a.target === undefined || a.target === null)) return { ok: false, err: "Choisis une cible" };
      p.hand.splice(idx, 1);
      return playCard(s, p, card, c, a.target);
    }
    if (a.t === "react") {
      if (s.phase !== "react" || !s.pending || s.pending.to !== p.id) return { ok: false, err: "Rien à contrer" };
      var pd = s.pending, att = s.players[pd.from], ac = CARDS[pd.k], ev;
      var atkCard = pd.card || { u: 0, k: pd.k };
      if (a.choice === "defend") {
        var di = -1; p.hand.forEach(function (h, i) { if (h.u === a.u) di = i; });
        if (di < 0) return { ok: false, err: "Carte absente" };
        var dk = p.hand[di].k, dc = CARDS[dk];
        if ((ac.counters || []).indexOf(dk) < 0) return { ok: false, err: "Cette carte ne contre pas « " + ac.name + " »" };
        toDiscard(s, p.hand.splice(di, 1)[0], "used", p.id);
        p.stats.played[dk] = (p.stats.played[dk] || 0) + 1;
        p.log.push({ k: dk, r: s.round, to: att.id, out: "defend", against: ac.key });
        att.log.push({ k: ac.key, r: s.round, to: p.id, out: "blocked" });
        var ctx = { notes: [], attacker: att.id };
        if (dc.reflect) {
          if (!check(att, ac.treq, s)) {
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
      } else if (a.choice === "spite") {
        if (s.mode !== "adult") return { ok: false, err: "Réservé au mode 18+" };
        ev = hit(s, att, p, ac, "full");
        addRes(s, att, { r: -3 }, ev.notes); mood(att, "shocked");
        ev.spite = true;
        ev.text += " " + p.name + " balance un dossier sur " + att.name + " : −3 réputation pour lui·elle aussi.";
        emit(s, ev);
        if (ev.data.garde) emit(s, { t: "card", k: "garde", p: p.id, outcome: "full", scene: "garde", data: { kids: ev.data.kids, exSeed: ev.data.exSeed, partner: ev.data.partner }, text: "Garde alternée pour " + p.name + "." });
      } else if (a.choice === "soft") {
        if (!ac.soft || !affordable(p, ac.soft.cost)) return { ok: false, err: "Tu ne peux pas payer" };
        var spent = [];
        pay(p, ac.soft.cost, spent);
        ev = hit(s, att, p, ac, "soft"); ev.notes = spent.concat(ev.notes || []); ev.cost = ac.soft.cost; emit(s, ev);
      } else {
        ev = hit(s, att, p, ac, "full");
        var bctx = { notes: ev.notes, attacker: att.id };
        if (ac.bounce) run(s, p, ac.bounce.fx, bctx);
        p.rebound = true;
        ev.bounce = ac.bounce ? ac.bounce.label : "";
        emit(s, ev);
        if (ev.data.garde) emit(s, { t: "card", k: "garde", p: p.id, outcome: "full", scene: "garde", data: { kids: ev.data.kids, exSeed: ev.data.exSeed, partner: ev.data.partner }, text: "Garde alternée : une semaine sur deux, " + p.name + " vit seul·e avec le hamster." });
      }
      toDiscard(s, atkCard, "used", att.id);
      s.pending = null; s.phase = "play";
      s.seq++; afterAction(s); return r;
    }
    return { ok: false, err: "Action inconnue" };
  }
  // une carte quitte la main (ou la défausse) et se résout
  function playCard(s, p, card, c, target) {
    p.plays--;
    var paid = [];
    pay(p, c.cost, paid);
    if (c.target === "opponent") {
      var t = s.players[target];
      s.phase = "react";
      s.pending = { k: c.key, from: p.id, to: t.id, since: Date.now(), card: { u: card.u, k: card.k } };
      emit(s, { t: "attack", k: c.key, p: p.id, to: t.id, notes: paid, text: p.name + " joue « " + c.name + " » sur " + t.name + " !" });
      s.seq++; return { ok: true };
    }
    resolveSelf(s, p, c, card, paid);
    s.seq++; afterAction(s); return { ok: true };
  }

  // ---------- vues ----------
  function publicState(s) {
    var o = clone(s);
    delete o.rng; delete o.seasonDeck; delete o._snap; delete o._snapUsed;
    o.deck = s.deck.length; o.discard = s.discard.length; o.discardTop = s.discard.length ? s.discard[s.discard.length - 1].k : null;
    var top = s.discard[s.discard.length - 1];
    o.discardInfo = top ? { k: top.k, how: top.how, by: top.by } : null;
    o.discardList = s.discard.slice(-10).reverse().map(function (d) { return { k: d.k, how: d.how, by: d.by }; });
    o.canTake = s.phase === "draw" ? takeable(s, cur(s)) : false;
    if (o.pending) delete o.pending.card;
    o.order.forEach(function (id) {
      var p = o.players[id];
      p.handCount = p.hand.length; p.hand = [];
      if (s.phase !== "end") p.obj = [];
      p.salary = salary(s.players[id]); p.title = jobTitle(s.players[id]); p.secours = canSecours(s, s.players[id]);
    });
    o.age = age(s);
    o.stage = stageOf(s);
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
    var future = salary(p) * left * 0.8 + p.kids.length * left * 0.3 + (p.startup ? 7 : 0) + (p.edu || 0) * Math.min(2.2, left * 0.25) * (p.job ? 0.5 : 1);
    if (!p.job && !p.retired) { var bj = bestJob(s, p, false, false); if (bj) future += jobPay(D.JOBS[bj.key]) * left * 0.3; }
    future += (p.partner ? 1.5 : 0) + (p.housing === 1 ? 1 : 0);
    if (!((p.job || p.retired) && p.housing >= 1 && (p.partner || p.kids.length))) future += ((p.job || p.retired ? 1 : 0) + (p.housing ? 1 : 0) + (p.partner || p.kids.length ? 1 : 0)) * 1.2;
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
    if (s.gate) return null;
    var p = s.players[id];
    if (s.phase === "react" && s.pending && s.pending.to === id) return botReact(s, id);
    if (cur(s).id !== id) return null;
    if (s.phase === "draw") {
      var top = s.discard[s.discard.length - 1], tc = top && CARDS[top.k], tb = null, tv = evalFor(s, id) + 1.2;
      if (tc && takeable(s, s.players[id])) (tc.target === "opponent" ? validTargets(s, id, tc.key) : [null]).forEach(function (t) {
        var sim = clone(s); sim.events = [];
        var rr = doApply(sim, { t: "take", pid: id, target: t }); if (!rr.ok) return;
        if (sim.phase === "react" && sim.pending) doApply(sim, { t: "react", pid: sim.pending.to, choice: "accept" });
        var v = evalFor(sim, id); if (v > tv) { tv = v; tb = { t: "take", pid: id, target: t }; }
      });
      return tb || { t: "draw", pid: id };
    }
    if (s.phase !== "play") return null;
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
    if (canSecours(s, p)) {
      var stV = (function () { var sim = clone(s); doApply(sim, { t: "study", pid: id, u: worst.u }); return evalFor(sim, id); })();
      if (stV > Math.max(bestV, restV) - 0.2) return { t: "study", pid: id, u: worst.u };
    }
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

  // ancienne sauvegarde (avant la Formation) : on la complète pour pouvoir la reprendre
  function migrate(s) {
    if (!s || s.format) return s;
    s.format = "rapide"; s.every = 2; s.dry = 2;
    s.discard = (s.discard || []).map(function (d) { return d.how ? d : { u: d.u, k: d.k, how: "used", by: null }; });
    s.order.forEach(function (id) {
      var p = s.players[id];
      p.edu = Math.min(D.EDU_MAX, (p.diploma || 0) * 2); delete p.diploma;
      p.studies = p.studies || []; p.zone = p.zone || []; p.engaged = !!p.engaged; p.dry = p.dry || 0; p.dryJob = p.dryJob || 0; p.pension = p.pension || 0;
      if (p.job && !D.JOBS[p.job.k]) p.job = null;
    });
    return s;
  }
  root.QV_ENGINE = {
    create: create, migrate: migrate, apply: apply, publicState: publicState, privateFor: privateFor,
    botAction: botAction, canPlay: canPlay, validTargets: validTargets, score: score,
    salary: salary, baseSalary: baseSalary, jobTitle: jobTitle, qualifies: qualifies, jobPay: jobPay, zoneOf: zoneOf, age: age, check: check, affordable: affordable, costText: costText,
    RES_NAMES: RES_NAMES,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = root.QV_ENGINE;
})(typeof window !== "undefined" ? window : globalThis);
