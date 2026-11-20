// Simule des parties complètes entre bots : node tests/quelle-vie.sim.js [parties]
// Vérifie aussi : découverte progressive (aucune carte non débloquée en main),
// cartes 18+ absentes du mode classique, toutes les cartes jouées au moins une fois.
var D = require("../js/qv-data.js"), E = require("../js/qv-engine.js");
var N = +process.argv[2] || 300, fails = 0, bad = 0;
var MODES = [{ mode: "classic", discovery: false }, { mode: "classic", discovery: true }, { mode: "adult", discovery: false }, { mode: "adult", discovery: true }];
var played = {}, scenes = {}, statusSeen = {};
MODES.forEach(function (opt) {
  var totals = [], wins = {}, turns = 0, objHit = {}, objAll = {}, reacts = { defend: 0, soft: 0, accept: 0, spite: 0 };
  for (var g = 0; g < N; g++) {
    var n = 2 + (g % 5);
    var players = []; for (var i = 0; i < n; i++) players.push({ id: "p" + i, name: "Bot" + i, bot: true });
    var s = E.create(players, 1000 + g, opt), guard = 0;
    if (opt.mode === "classic" && s.deck.some(function (c) { return D.byKey[c.k].adult; })) { console.log("ERREUR : carte 18+ en mode classique"); bad++; }
    while (s.phase !== "end" && guard++ < 3000) {
      var stage = opt.discovery ? D.stageForRound(s.round) : 5;
      s.order.forEach(function (id) { s.players[id].hand.forEach(function (h) { if ((D.byKey[h.k].tier || 4) > stage) { bad++; if (bad < 5) console.log("ERREUR : carte non débloquée en main", h.k, "tour", s.round); } }); });
      if (opt.discovery && s.round === 1 && s.phase === "play") { var hp = s.players[s.order[s.turn]]; if (hp.hand.length > 1) { bad++; console.log("ERREUR : plus d'une carte au tour 1"); } }
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
    if (guard >= 3000) { console.log("BLOQUÉ", g); bad++; continue; }
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
var never = D.CARDS.filter(function (c) { return !played[c.key]; }).map(function (c) { return c.key; });
console.log("\ncartes jamais jouées :", never.join(", ") || "aucune");
console.log("scènes déclenchées :", Object.keys(scenes).length, "· états qui ont éclaté/expiré :", Object.keys(statusSeen).join(", "));
console.log("refus", fails, "· erreurs", bad);
process.exit(bad || fails ? 1 : 0);
