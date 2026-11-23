// Simule des parties complètes entre bots : node tests/quelle-vie.sim.js [parties]
// Vérifie aussi : découverte progressive (aucune carte non débloquée en main),
// cartes 18+ absentes du mode classique, toutes les cartes jouées au moins une fois.
var D = require("../js/qv-data.js"), E = require("../js/qv-engine.js");
var N = +process.argv[2] || 300, fails = 0, bad = 0;
var MODES = [{ mode: "classic", discovery: false }, { mode: "classic", discovery: true }, { mode: "adult", discovery: false }, { mode: "adult", discovery: true }];
var couples = { n: 0, same: 0 }, jobsSeen = {}, played = {}, scenes = {}, statusSeen = {}, progress = {};
MODES.forEach(function (opt) {
  var totals = [], wins = {}, turns = 0, objHit = {}, objAll = {}, reacts = { defend: 0, soft: 0, accept: 0, spite: 0 };
  for (var g = 0; g < N; g++) {
    var n = 2 + (g % 7);
    var players = []; for (var i = 0; i < n; i++) players.push({ id: "p" + i, name: "Bot" + i, bot: true, avatar: { sx: i % 2 ? "f" : "m" } });
    var fmt = ["rapide", "classique", "long"][g % 3];
    var s = E.create(players, 1000 + g, Object.assign({ format: fmt }, opt)), guard = 0;
    if (!opt.discovery) s.order.forEach(function (id) { var h = s.players[id].hand.map(function (x) { return D.byKey[x.k]; }); if (h.length !== 4 && id === s.order[0] || (id !== s.order[0] && h.length !== 3)) { bad++; console.log("ERREUR : main de départ", h.length); } if (!h.some(function (c) { return c.fam === "study"; })) { bad++; console.log("ERREUR : pas de carte Études au départ"); } });
    if (opt.mode === "classic" && s.deck.some(function (c) { return D.byKey[c.k].adult; })) { console.log("ERREUR : carte 18+ en mode classique"); bad++; }
    while (s.phase !== "end" && guard++ < 6000) {
      var stage = opt.discovery ? D.stageForRound(s.round) : 5;
      s.order.forEach(function (id) { s.players[id].hand.forEach(function (h) { if ((D.byKey[h.k].tier || 4) > stage) { bad++; if (bad < 5) console.log("ERREUR : carte non débloquée en main", h.k, "tour", s.round); } }); });
      if (opt.discovery && s.round === 1 && s.phase === "play") { var hp = s.players[s.order[s.turn]]; if (hp.hand.length > 1) { bad++; console.log("ERREUR : plus d'une carte au tour 1"); } }
      if (!opt.discovery && s.phase === "play") { var cp = s.players[s.order[s.turn]]; if (cp.plays === 1 && cp.hand.length > 6) { bad++; if (bad < 8) console.log("ERREUR : main trop grande", cp.hand.length); } }
      s.order.forEach(function (id) { var q = s.players[id]; if (q.zone.filter(function (z) { return z.z === "job"; }).length > 1) { bad++; if (bad < 8) console.log("ERREUR : deux métiers", JSON.stringify(q.zone)); } if (q.job && q.job.k !== "pdg" && D.JOBS[q.job.k].card && !q.zone.some(function (z) { return z.z === "job"; }) && q.job.k !== "bureau") {} });
      var tot = s.deck.length + s.discard.length + (s.pending ? 1 : 0); s.order.forEach(function (id) { tot += s.players[id].hand.length + s.players[id].zone.length; });
      if (s.total0 === undefined) s.total0 = tot; else if (tot !== s.total0) { bad++; if (bad < 8) console.log("ERREUR : cartes perdues ou créées", s.total0, "→", tot, s.events.slice(-2).map(function (e) { return e.t + ":" + e.k; })); s.total0 = tot; }
      var who = s.phase === "react" ? s.pending.to : s.order[s.turn];
      var a = E.botAction(s, who);
      // de temps en temps, l'humain simulé choisit une autre réaction pour tout couvrir
      if (a && a.t === "react" && a.choice === "accept" && g % 3 === 0 && opt.mode === "adult") a.choice = "spite";
      var before = s.evId;
      var r = E.apply(s, a);
      if (!r.ok) { fails++; if (fails < 10) console.log("REFUS", r.err, JSON.stringify(a)); E.apply(s, { t: "react", pid: who, choice: "accept" }); if (s.phase === "play") { var p = s.players[who]; if (p.hand.length) E.apply(s, { t: "rest", pid: who, u: p.hand[0].u }); } }
      else if (a.t === "react") reacts[a.choice]++;
      s.events.forEach(function (e) { if (e.id > before) { if (e.scene) scenes[e.scene] = 1; if (e.t === "status") statusSeen[e.s] = 1; } });
      turns++;
    }
    if (guard >= 6000) { console.log("BLOQUÉ", g); bad++; continue; }
    s.order.forEach(function (id) { var q = s.players[id]; if (q.partner && q.partner.sx) { couples.n++; if (q.partner.sx === q.avatar.sx) couples.same++; } if (q.job) jobsSeen[q.job.k] = (jobsSeen[q.job.k] || 0) + 1; });
    progress[fmt] = progress[fmt] || { n: 0, job: 0, edu: 0, home: 0, love: 0, kids: 0, nojob: 0, edu0: 0, full: 0 };
    s.order.forEach(function (id) { var q = s.players[id], P = progress[fmt]; P.n++; if (q.job || q.retired) P.job++; else P.nojob++; P.edu += q.edu; if (!q.edu) P.edu0++; if (q.housing) P.home++; if (q.partner || q.married) P.love++; if (q.kids.length) P.kids++; if ((q.job || q.retired) && q.housing && (q.partner || q.kids.length)) P.full++; });
    s.order.forEach(function (id) {
      var p = s.players[id];
      p.final.obj.forEach(function (o) { objAll[o.k] = (objAll[o.k] || 0) + 1; if (o.done) objHit[o.k] = (objHit[o.k] || 0) + 1; });
      Object.keys(p.stats.played).forEach(function (k) { played[k] = (played[k] || 0) + p.stats.played[k]; });
      totals.push(p.final.total);
      ["b", "f", "r"].forEach(function (k) { if (p[k] < 0) { bad++; console.log("ERREUR : ressource négative"); } });
    });
    var w = s.players[s.winner];
    var style = w.final.b >= w.final.f && w.final.b >= w.final.r ? "bonheur" : (w.final.f >= w.final.r ? "fortune" : "réputation");
    wins[style] = (wins[style] || 0) + 1;
  }
  totals.sort(function (a, b) { return a - b; });
  console.log("\n== " + opt.mode + (opt.discovery ? " + découverte" : "") + " ==");
  console.log("actions/partie", (turns / N).toFixed(1), "· style du gagnant", JSON.stringify(wins), "· score médian", totals[totals.length >> 1], "max", totals[totals.length - 1]);
  console.log("réactions", JSON.stringify(reacts));
});
console.log("\nProgression en fin de partie (part des joueurs) :");
Object.keys(progress).forEach(function (f) { var P = progress[f], pc = function (v) { return Math.round(100 * v / P.n) + " %"; }; console.log(" ", f, ": métier", pc(P.job), "· sans métier", pc(P.nojob), "· Formation moyenne", (P.edu / P.n).toFixed(1), "· sans formation", pc(P.edu0), "· logement", pc(P.home), "· couple", pc(P.love), "· enfants", pc(P.kids), "· vie complète (métier+logement+famille)", pc(P.full)); });
console.log("\nCouples : " + couples.n + " · de même genre : " + Math.round(100 * couples.same / Math.max(1, couples.n)) + " %");
console.log("Métiers différents exercés en fin de partie : " + Object.keys(jobsSeen).length + " / " + Object.keys(D.JOBS).length);
var never = D.CARDS.filter(function (c) { return c.copies !== 0 && !played[c.key]; }).map(function (c) { return c.key; });
console.log("\ncartes jamais jouées :", never.join(", ") || "aucune");
console.log("scènes déclenchées :", Object.keys(scenes).length, "· états qui ont éclaté/expiré :", Object.keys(statusSeen).join(", "));
console.log("refus", fails, "· erreurs", bad);
process.exit(bad || fails ? 1 : 0);
