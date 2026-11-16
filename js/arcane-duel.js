/* =========================================================================
   Arcane Tactics — Défis & duels (ChallengeManager, DuelInstanceManager, BotLoadoutGenerator,
   ArenaManager) — branchés sur le moteur par EXT, sans le modifier en profondeur.

   • Le duel est un vrai combat du moteur (mêmes règles, mêmes stats, mêmes sorts) dans une arène
     dédiée (thème « arene »), sans placement, avec deux héros face à face.
   • Adversaire = l'autre joueur connecté (cmd duel_req / duel_accept) ou un bot (cmd duel_bot) qui
     utilise la même IA tactique que les monstres (A.AI.botStep).
   • Aucun objet n'est jamais perdu ou gagné : récompenses = XP, or, jeton de défi, statistiques.
   • Déconnexion en plein duel = victoire par forfait pour l'adversaire.
   • « Serveur autoritaire » : ici c'est le navigateur hôte de la partie (pas de serveur dédié).
   ========================================================================= */
(function (root) {
  "use strict";
  var A = root.AT_CORE; if (!A || !A.EXT) return;
  var I = A.I, EXT = A.EXT, BOT_PI = 9;

  var DIFFS = [
    { id: "apprenti", name: "Apprenti", dl: -2, rar: [0, 0, 1], slots: 0.6, pts: 0.55, mul: 0.5, tok: 0 },
    { id: "duelliste", name: "Duelliste", dl: 0, rar: [0, 1, 1, 2], slots: 0.8, pts: 0.8, mul: 1, tok: 0.5 },
    { id: "maitre", name: "Maître", dl: 2, rar: [1, 2, 2, 3], slots: 1, pts: 0.95, mul: 1.6, tok: 1 },
    { id: "legende", name: "Légende", dl: 4, rar: [2, 3, 3, 4], slots: 1, pts: 1, mul: 2.4, tok: 1 }
  ];
  var BOT_NAMES = ["Kaël", "Mirelle", "Torvald", "Isha", "Brannoc", "Zéphyra", "Orsin", "Lyra", "Dagan", "Nyx", "Varek", "Selene"];
  var HIST_MAX = 20;

  function pl(w, i) { return w.players[i] || null; }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function busy(w) { return w.mode !== "explore" || !!w.combat || !!w.trade || !!(w.duel && w.duel.st && w.duel.st !== "done"); }

  /* ---------- BotLoadoutGenerator : classe, niveau, caractéristiques et équipement crédibles ---------- */
  function makeBot(playerLevel, diffIx, cls) {
    var D = DIFFS[Math.max(0, Math.min(DIFFS.length - 1, diffIx | 0))];
    cls = cls && A.CLASSES[cls] ? cls : pick(Object.keys(A.CLASSES));
    var L = Math.max(1, Math.min(100, playerLevel + D.dl));
    var p = A.newProfile(cls, pick(BOT_NAMES)); p.level = L; p.pts = 0;
    var el = A.ELEMENTS[A.CLASSES[cls].el].stat, pts = Math.round(5 * (L - 1) * D.pts);
    var spread = [[el, 0.55], ["vit", 0.25], [pick(["sag", "agi", "cha"]), 0.2]];
    spread.forEach(function (s) { p.base[s[0]] = (p.base[s[0]] || 0) + Math.round(pts * s[1]); });
    A.SLOTS.forEach(function (sl) {
      if (Math.random() > D.slots) return;
      var it = A.makeItem(p, Math.max(1, L), pick(D.rar), sl); p.equip[sl] = it;
    });
    p.bot = { diff: D.id, name: p.name };
    return p;
  }

  /* ---------- unité-héros du moteur (copie fidèle de ce que startCombat fait pour un joueur) ---------- */
  function heroUnit(c, pi, profile, name, side, cell, isBot) {
    var s = A.heroStats(profile);
    return { id: c.uid++, side: side, pi: pi, cls: profile.cls, name: name, lvl: profile.level, x: cell[0], y: cell[1], hp: s.hp, maxHp: s.hp,
      pa: s.pa, pm: s.pm, maxPa: s.pa, maxPm: s.pm, po: s.po, res: s.res, ini: s.ini, crit: s.crit, heal: s.heal, pow: 0, elem: s.elem, dom: s.dom,
      powers: s.powers, shield: [], status: [], cds: {}, used: {}, usedT: {}, alive: true, face: side ? -1 : 1, ult: profile.level >= A.ULT_LEVEL,
      ai: !!isBot, bot: !!isBot, hero: true, gear: A.gearOf(profile), role: isBot ? "hero" : undefined };
  }

  /* ---------- DuelInstanceManager ---------- */
  function startDuel(w, a, opp) {
    var P = pl(w, a); if (!P) return false;
    var oppProfile, oppName, oppPi, isBot = !!opp.bot;
    if (isBot) { oppProfile = opp.bot; oppName = oppProfile.name; oppPi = BOT_PI; }
    else { if (!pl(w, opp.pi)) return false; oppProfile = pl(w, opp.pi).profile; oppName = pl(w, opp.pi).name; oppPi = opp.pi; }
    I.startCombat(w, { id: 0, mobs: [] }, { duel: true, name: "Arène des Ombres", idx: 0, boss: false });
    var c = w.combat;
    c.arena = I.genArena("arene", Math.floor(Math.random() * 1e9), 2);
    c.units = []; c.uid = 1; c.stats = {}; c.tele = []; c.objects = []; c.hazards = [];
    var ca = c.arena.heroCells[Math.floor(c.arena.heroCells.length / 2)], cb = c.arena.mobCells[Math.floor(c.arena.mobCells.length / 2)];
    c.units.push(heroUnit(c, a, P.profile, P.name, 0, ca, false));
    c.units.push(heroUnit(c, oppPi, oppProfile, oppName, 1, cb, isBot));
    c.stats[a] = { dmg: 0, heal: 0, kills: 0 }; c.stats[oppPi] = { dmg: 0, heal: 0, kills: 0 };
    c.duel = { a: a, b: oppPi, bot: isBot, diff: opp.diff, startRound: 0 };
    var d = w.duel = w.duel || {};
    d.st = "fight"; d.from = a; d.to = oppPi; d.bot = isBot ? { cls: oppProfile.cls, lvl: oppProfile.level, name: oppName, diff: opp.diff } : null;
    w.duelResult = null;
    I.beginFight(w);
    return true;
  }

  function rewards(w, winnerPi, loserLevel, diffMul, tokChance, isBot) {
    var base = 40 + 12 * loserLevel;
    return { xp: Math.round(base * diffMul * (isBot ? 0.8 : 1)), gold: Math.round((25 + 6 * loserLevel) * diffMul), token: Math.random() < tokChance ? 1 : 0 };
  }
  function record(p, entry) { p.duels = p.duels || []; p.duels.unshift(entry); p.duels.length = Math.min(p.duels.length, HIST_MAX); p.duelWins = (p.duelWins || 0) + (entry.win ? 1 : 0); p.duelLosses = (p.duelLosses || 0) + (entry.win ? 0 : 1); p.rev++; }

  // fin de duel : appelé par le moteur (finishCombat) ou par un forfait
  function finish(w, winnerSide, why) {
    var c = w.combat; if (!c || !c.duel || c.duel.done) return;
    var d = c.duel; d.done = true;
    var U = c.units, ua = U.filter(function (u) { return u.pi === d.a; })[0], ub = U.filter(function (u) { return u.pi === d.b; })[0];
    var D = d.bot ? DIFFS.filter(function (x) { return x.id === d.diff; })[0] || DIFFS[1] : { mul: 1.2, tok: 1 };
    var res = { id: Date.now(), winner: winnerSide, why: why || "", turns: c.round, bot: d.bot, diff: d.diff, players: [] };
    [[ua, d.a], [ub, d.b]].forEach(function (pr, s) {
      var u = pr[0], pi = pr[1], st = c.stats[pi] || { dmg: 0, heal: 0 }, won = winnerSide === s, human = !!pl(w, pi) && !(d.bot && s === 1);
      var row = { name: u ? u.name : "?", cls: u ? u.cls : null, lvl: u ? u.lvl : 0, won: won, dmg: st.dmg, heal: st.heal, hp: u && u.alive ? u.hp : 0, maxHp: u ? u.maxHp : 0, human: human, pi: pi };
      if (human) {
        var P = pl(w, pi), foeLvl = (s === 0 ? ub : ua) ? (s === 0 ? ub : ua).lvl : P.profile.level;
        var R = rewards(w, pi, foeLvl, D.mul, D.tok, d.bot);
        if (!won) { R.xp = Math.round(R.xp * 0.25); R.gold = Math.round(R.gold * 0.2); R.token = 0; }
        row.rewards = R; P.profile.gold += R.gold; P.profile.tokens = (P.profile.tokens || 0) + R.token;
        record(P.profile, { t: Date.now(), vs: s === 0 ? (ub && ub.name) : (ua && ua.name), vsCls: s === 0 ? (ub && ub.cls) : (ua && ua.cls), win: won, bot: !!d.bot, diff: d.diff || null, dmg: st.dmg, turns: c.round, forfeit: why === "forfait" });
        I.giveXp(w, pi, R.xp, null);
      }
      res.players.push(row);
    });
    I.ev(w, { k: winnerSide === 0 || !d.bot ? "victory" : "defeat" });
    w.duelResult = res; w.duel = { st: "done" };
    I.ev(w, { k: "duelend", res: res });
    w.combat = null; w.mode = "explore";
    w.players.forEach(function (p) { if (p) p.ready = false; });
    w.rev++;
  }
  EXT.onFinish = (function (prev) { return function (w, won) { var c = w.combat; if (c && c.room && c.room.duel) finish(w, won ? 0 : 1, ""); else if (prev) prev(w, won); }; })(EXT.onFinish);

  // un joueur part : forfait
  var prevRemove = EXT.onRemove;
  EXT.onRemove = function (w, i) {
    var c = w.combat;
    if (c && c.duel && !c.duel.done && (c.duel.a === i || c.duel.b === i)) {
      var loserSide = c.duel.a === i ? 0 : 1;
      c.units.forEach(function (u) { if (u.pi === i) { u.alive = false; u.hp = 0; } });
      if (c.duel.bot && loserSide === 1) { /* impossible */ } else finish(w, 1 - loserSide, "forfait");
    } else if (w.duel && (w.duel.st === "req") && (w.duel.from === i || w.duel.to === i)) { w.duel = { st: "done" }; I.ev(w, { k: "duel", st: "cancel", why: "déconnexion" }); }
    if (prevRemove) prevRemove(w, i);
  };

  // anti-blocage : au-delà du tour 10, les duellistes s'épuisent (dégâts subis croissants) ; tour 30 = décision aux PV
  var prevTurn = EXT.onTurnStart;
  EXT.onTurnStart = function (w, u) {
    if (prevTurn) prevTurn(w, u);
    var c = w.combat; if (!c || !c.duel || c.duel.done || !u.alive || !u.hero) return;
    if (c.round > 30) {
      var ua = c.units.filter(function (x) { return x.side === 0 && x.hero; })[0], ub = c.units.filter(function (x) { return x.side === 1 && x.hero; })[0];
      var ra = ua.hp / ua.maxHp, rb = ub.hp / ub.maxHp; (ra >= rb ? ub : ua).alive = false; (ra >= rb ? ub : ua).hp = 0; finish(w, ra >= rb ? 0 : 1, "temps"); return;
    }
    if (c.round > 10) { var n = c.round - 10; I.applyStatus(w, u, { k: "vuln", v: 6 * n, turns: 2, name: "Épuisement", by: u.id }); }
  };

  /* ---------- ChallengeManager ---------- */
  var CMD = {
    duel_req: function (w, pi, c) {
      var to = c.to | 0; if (busy(w) || to === pi || !pl(w, to) || !pl(w, pi)) return false;
      w.duel = { st: "req", from: pi, to: to }; I.ev(w, { k: "duel", st: "req", a: pi, b: to }); w.rev++; return true;
    },
    duel_accept: function (w, pi) {
      var d = w.duel; if (!d || d.st !== "req" || d.to !== pi || w.mode !== "explore" || w.combat || w.trade) return false;
      return startDuel(w, d.from, { pi: d.to });
    },
    duel_refuse: function (w, pi) { var d = w.duel; if (!d || d.st !== "req" || (d.to !== pi && d.from !== pi)) return false; w.duel = { st: "done" }; I.ev(w, { k: "duel", st: "cancel", why: d.to === pi ? "refus" : "annulé", pi: pi }); w.rev++; return true; },
    duel_bot: function (w, pi, c) {
      if (busy(w) || !pl(w, pi) || w.zone !== "village") return false;
      var diff = Math.max(0, Math.min(DIFFS.length - 1, c.diff | 0));
      var bot = makeBot(pl(w, pi).profile.level, diff, c.cls);
      return startDuel(w, pi, { bot: bot, diff: DIFFS[diff].id });
    },
    duel_quit: function (w, pi) { // abandon volontaire
      var c = w.combat; if (!c || !c.duel || c.duel.done || (c.duel.a !== pi && c.duel.b !== pi)) return false;
      finish(w, c.duel.a === pi ? 1 : 0, "forfait"); return true;
    }
  };
  Object.keys(CMD).forEach(function (k) { EXT.cmds[k] = CMD[k]; });
  // pendant un duel, plus d'échange possible et le bouton « fuir » du moteur est inactif (cb.room truthy)

  A.DUEL = { DIFFS: DIFFS, makeBot: makeBot, startDuel: startDuel, finish: finish, HIST_MAX: HIST_MAX };
})(typeof window !== "undefined" ? window : globalThis);
