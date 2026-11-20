// Simule des parties complètes entre bots : node tests/quelle-vie.sim.js [parties]
var D = require("../js/qv-data.js"), E = require("../js/qv-engine.js");
var N = +process.argv[2] || 300, totals = {}, wins = {}, turns = 0, plays = {}, objHit = {}, objAll = {}, maxs = [], fails = 0;
for (var g = 0; g < N; g++) {
  var n = 2 + (g % 5);
  var players = []; for (var i = 0; i < n; i++) players.push({ id: "p" + i, name: "Bot" + i, bot: true });
  var s = E.create(players, 1000 + g), guard = 0;
  while (s.phase !== "end" && guard++ < 2000) {
    var who = s.phase === "react" ? s.pending.to : s.order[s.turn];
    var a = E.botAction(s, who);
    var r = E.apply(s, a);
    if (!r.ok) { fails++; console.log("REFUS", r.err, JSON.stringify(a)); E.apply(s, { t: "react", pid: who, choice: "accept" }); if (s.phase === "play") { var p = s.players[who]; E.apply(s, { t: "rest", pid: who, u: p.hand[0].u }); } }
    if (a && a.t === "play") { var k = (s.events.filter(function(e){return e.t==="card"||e.t==="attack";}).slice(-1)[0]||{}).k; }
    turns++;
  }
  if (guard >= 2000) { console.log("BLOQUÉ", g); continue; }
  s.order.forEach(function (id) {
    var p = s.players[id];
    p.final.obj.forEach(function (o) { objAll[o.k] = (objAll[o.k] || 0) + 1; if (o.done) objHit[o.k] = (objHit[o.k] || 0) + 1; });
    Object.keys(p.stats.played).forEach(function (k) { plays[k] = (plays[k] || 0) + p.stats.played[k]; });
    maxs.push(p.final.total);
  });
  var w = s.players[s.winner];
  var style = w.final.b >= w.final.f && w.final.b >= w.final.r ? "bonheur" : (w.final.f >= w.final.r ? "fortune" : "réputation");
  wins[style] = (wins[style] || 0) + 1;
}
maxs.sort(function(a,b){return a-b;});
console.log("parties", N, "actions/partie", (turns / N).toFixed(1), "refus", fails);
console.log("style du gagnant", wins);
console.log("score: min", maxs[0], "médiane", maxs[maxs.length >> 1], "max", maxs[maxs.length - 1]);
console.log("objectifs réussis", Object.keys(objAll).map(function (k) { return k + " " + Math.round(100 * (objHit[k] || 0) / objAll[k]) + "%"; }).join(" · "));
console.log("cartes jouées", JSON.stringify(plays));
