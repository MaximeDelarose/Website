/* =========================================================================
   Le Grand Chêne — idle / incrémental maison
   Un chêne au milieu : on tape dessus pour récolter des glands 🌰, des
   habitants de la forêt récoltent tout seuls, et à côté : jardin (fleurs en
   pot), ferme (cultures → nourriture) et bétail (marchandises + bonus).
   Prestiges : Replanter (graines 🌱) puis Saisons (essence 🍃).
   Contenu : js/idle-data.js. Sauvegarde : localStorage « idle-chene-v1 ».
   ?debug dans l'URL expose window.IDLE_DEBUG.
   ========================================================================= */
(function () {
  "use strict";

  var VERSION = "0.1.0";
  var SAVE_KEY = "idle-chene-v1";
  var D = window.IDLE_DATA;
  var root = document.querySelector("[data-idle]");
  if (!root || !D) return;

  function $(s, el) { return (el || root).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || root).querySelectorAll(s)); }

  /* =====================================================================
     formats
     ===================================================================== */
  var SUF = ["", " K", " M", " B", " T", " Qa", " Qi", " Sx", " Sp", " Oc", " No", " Dc"];
  function fmt(n, dec) {
    if (n !== n) return "0";
    if (!isFinite(n)) return "∞";
    if (n < 0) return "-" + fmt(-n, dec);
    if (n < 1000) {
      if (dec && n < 100 && n % 1 > 0.0001) return n.toFixed(n < 10 ? 2 : 1).replace(".", ",").replace(/,?0+$/, "");
      return String(Math.floor(n));
    }
    var e = Math.floor(Math.log10(n) / 3);
    if (e < SUF.length) {
      var v = n / Math.pow(1000, e);
      var t = v < 10 ? (Math.floor(v * 100) / 100).toFixed(2) : v < 100 ? (Math.floor(v * 10) / 10).toFixed(1) : String(Math.floor(v));
      return t.replace(".", ",") + SUF[e];
    }
    return n.toExponential(2).replace(".", ",").replace("e+", "e");
  }
  function pct(x) { return fmt(x * 100, true) + " %"; }
  function fmtTime(s) {
    s = Math.max(0, Math.ceil(s));
    if (s < 60) return s + " s";
    if (s < 3600) return Math.floor(s / 60) + " min" + (s % 60 ? " " + (s % 60) + " s" : "");
    if (s < 86400) return Math.floor(s / 3600) + " h" + (Math.floor(s / 60) % 60 ? " " + (Math.floor(s / 60) % 60) + " min" : "");
    return Math.floor(s / 86400) + " j" + (Math.floor(s / 3600) % 24 ? " " + Math.floor(s / 3600) % 24 + " h" : "");
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* =====================================================================
     état
     ===================================================================== */
  var NP = D.PRODUCERS.length;
  function zeros(n) { var a = []; for (var i = 0; i < n; i++) a.push(0); return a; }
  function newPot() { return { f: null, g: 0, need: 0, wc: 0, wat: 0 }; }
  function newField() { return { c: null, g: 0, need: 0, last: null }; }
  function fresh() {
    return {
      v: 1, created: Date.now(), last: Date.now(),
      acorns: 0, runTotal: 0, seasonTotal: 0, lifeTotal: 0, runTime: 0, time: 0,
      prod: zeros(NP), lv: {}, upg: {},
      seeds: 0, seedsEarned: 0, seedsSeason: 0, seedsLife: 0, replants: 0, roots: {},
      essence: 0, essenceTotal: 0, seasons: 0, season: 0, perks: {},
      petals: 0, petalsLife: 0, pots: [newPot(), newPot()],
      garden: { pot: 0, fert: 0, polli: 0, sel: "paquerette" },
      flowersHarvested: 0, moon: 0,
      fields: [newField(), newField(), newField()],
      farm: { field: 0, silo: 0, fert: 0, speed: 0, scare: 0, sel: "ble" },
      food: 0, foodLife: 0, cropsHarvested: 0,
      animals: {}, goods: {}, ranch: { stable: 0, cart: 0 }, fed: 1,
      buffs: {}, unl: { forest: true, ach: true, opts: true },
      stats: { clicks: 0, runClicks: 0, autoClicks: 0, crits: 0, golden: 0, bestCombo: 0, sold: 0, bestCps: 0, maxOffline: 0 },
      ach: {},
      opts: { autoBuy: true, autoUpg: true, autoReplant: false, arPct: 100, buyAmt: 1, fx: true, nums: true, autoSell: true },
      goldenNext: 60, tab: "forest"
    };
  }
  function merge(def, sv) {
    if (sv === undefined || sv === null) return def;
    if (typeof def === "number") return (typeof sv === "number" && isFinite(sv)) ? sv : def;
    if (def === null) return sv;
    if (typeof def !== typeof sv) return def;
    if (Array.isArray(def)) return Array.isArray(sv) ? sv : def;
    if (typeof def === "object") {
      var o = {}, k;
      for (k in def) o[k] = merge(def[k], sv[k]);
      for (k in sv) if (!(k in def)) o[k] = sv[k];
      return o;
    }
    return sv;
  }
  var S = fresh();

  function L(id) { return S.lv[id] || 0; }
  function R(id) { return S.roots[id] || 0; }
  function PK(id) { return S.perks[id] || 0; }
  function buff(id) { return (S.buffs[id] || 0) > 0; }
  function season() { return D.SEASONS[S.season].id; }
  function lvCost(def, lvl) { return Math.ceil(def.cost * Math.pow(def.growth, lvl)); }
  function maxed(def, lvl) { return def.max > 0 && lvl >= def.max; }

  /* =====================================================================
     améliorations uniques (générées)
     ===================================================================== */
  var UPG = [], UPG_BY = {};
  D.PRODUCERS.forEach(function (p, i) {
    D.PROD_UPG.forEach(function (u, j) {
      UPG.push({ id: "p" + i + "_" + j, icon: p.icon, name: p.name + " · " + u.name, desc: "Production des " + p.name.toLowerCase() + " ×2.",
        cost: p.cost * u.cost, eff: "prod", i: i, req: function () { return S.prod[i] >= u.at; } });
    });
  });
  D.CLICK_UPG.forEach(function (u, j) {
    UPG.push({ id: "c" + j, icon: "👆", name: u.name, desc: "Clic ×2.", cost: u.cost, eff: "click",
      req: function () { return S.stats.clicks >= u.clicks; } });
  });
  D.SAP_UPG.forEach(function (u, j) {
    UPG.push({ id: "s" + j, icon: "💧", name: u.name, desc: "Chaque clic rapporte +1 % de ta production par seconde.", cost: u.cost, eff: "sap",
      req: function () { return S.runTotal >= u.at; } });
  });
  D.GLOBAL_UPG.forEach(function (u, j) {
    UPG.push({ id: "g" + j, icon: "🌍", name: u.name, desc: "Toute la production ×1,5.", cost: u.at * 3, eff: "all",
      req: function () { return S.runTotal >= u.at; } });
  });
  D.GOLD_UPG.forEach(function (u, j) {
    UPG.push({ id: "o" + j, icon: "🌟", name: u.name, desc: "Glands dorés 15 % plus fréquents et effets +10 %.", cost: u.cost, eff: "gold",
      req: function () { return S.runTotal >= u.at; } });
  });
  UPG.forEach(function (u) { UPG_BY[u.id] = u; });

  /* =====================================================================
     succès (chacun : +2 % à tout)
     ===================================================================== */
  var ACH = [];
  function ach(id, icon, name, desc, test) { ACH.push({ id: id, icon: icon, name: name, desc: desc, test: test }); }
  [[1, "Premier gland", "Clique sur le chêne."], [100, "Doigts agiles", "100 clics."], [1000, "Tapoteur", "1 000 clics."],
   [10000, "Pic humain", "10 000 clics."], [100000, "Tempête de clics", "100 000 clics."]].forEach(function (a, i) {
    ach("click" + i, "👆", a[1], a[2], function () { return S.stats.clicks >= a[0]; });
  });
  [[1e3, "Poignée de glands"], [1e6, "Sac de glands"], [1e9, "Grenier débordant"], [1e12, "Montagne de glands"],
   [1e15, "Océan de glands"], [1e18, "Planète gland"], [1e21, "Galaxie de glands"]].forEach(function (a, i) {
    ach("life" + i, "🌰", a[1], "Récolte " + fmt(a[0]) + " glands au total.", function () { return S.lifeTotal >= a[0]; });
  });
  [[10, "Ça pousse"], [1000, "Petite entreprise"], [1e6, "Industrie forestière"], [1e9, "Empire du chêne"]].forEach(function (a, i) {
    ach("cps" + i, "📈", a[1], "Atteins " + fmt(a[0]) + " glands par seconde.", function () { return S.stats.bestCps >= a[0]; });
  });
  [[10, "Voisinage"], [50, "Hameau"], [100, "Village"], [250, "Ville des bois"], [500, "Métropole sylvestre"], [1000, "Peuple du chêne"]].forEach(function (a, i) {
    ach("own" + i, "🏡", a[1], "Possède " + a[0] + " habitants en même temps.", function () { return totalOwned() >= a[0]; });
  });
  ach("allprod", "🌲", "Toute la forêt", "Possède au moins un de chaque habitant.", function () { return S.prod.every(function (n) { return n > 0; }); });
  ach("combo0", "🥁", "En rythme", "Remplis ta barre de combo.", function () { return S.stats.bestCombo >= 25; });
  ach("combo1", "🎶", "Transe", "Atteins un combo de 100.", function () { return S.stats.bestCombo >= 100; });
  ach("crit0", "💥", "Coup de maître", "Fais 100 clics critiques.", function () { return S.stats.crits >= 100; });
  ach("auto0", "🐦", "Toc toc toc", "Le pic tape 10 000 fois.", function () { return S.stats.autoClicks >= 10000; });
  [[1, "Éclat d'or"], [10, "Chercheur d'or"], [50, "Ruée vers l'or"]].forEach(function (a, i) {
    ach("gold" + i, "🌟", a[1], "Attrape " + a[0] + " gland" + (a[0] > 1 ? "s" : "") + " doré" + (a[0] > 1 ? "s" : "") + ".", function () { return S.stats.golden >= a[0]; });
  });
  [[1, "Nouveau départ"], [10, "Jardinier du temps"], [50, "Cycle éternel"]].forEach(function (a, i) {
    ach("rep" + i, "🌱", a[1], "Replante " + a[0] + " fois.", function () { return S.replants >= a[0]; });
  });
  [[100, "Sac de graines"], [1000, "Banque de graines"]].forEach(function (a, i) {
    ach("seed" + i, "🌰", a[1], "Gagne " + a[0] + " graines au total.", function () { return S.seedsLife >= a[0]; });
  });
  [[1, "Le vent tourne"], [4, "Une année complète"], [12, "Trois ans de chêne"]].forEach(function (a, i) {
    ach("sea" + i, "🍂", a[1], "Change " + a[0] + " fois de saison.", function () { return S.seasons >= a[0]; });
  });
  [[1, "Main verte"], [25, "Bouquet"], [100, "Herbier complet"]].forEach(function (a, i) {
    ach("flo" + i, "🌸", a[1], "Cueille " + a[0] + " fleur" + (a[0] > 1 ? "s" : "") + ".", function () { return S.flowersHarvested >= a[0]; });
  });
  ach("moon", "🌙", "Clair de lune", "Cueille une fleur de lune.", function () { return S.moon >= 1; });
  [[1, "Première moisson"], [50, "Paysan"], [250, "Grand fermier"]].forEach(function (a, i) {
    ach("crop" + i, "🌾", a[1], "Récolte " + a[0] + " culture" + (a[0] > 1 ? "s" : "") + ".", function () { return S.cropsHarvested >= a[0]; });
  });
  ach("zoo", "🐮", "Arche des bois", "Possède un animal de chaque sorte.", function () { return D.ANIMALS.every(function (a) { return (S.animals[a.id] || 0) > 0; }); });
  ach("herd", "🐑", "Grand troupeau", "Possède 20 animaux.", function () { return totalAnimals(true) >= 20; });
  ach("sold", "🛒", "Jour de marché", "Vends 100 marchandises.", function () { return S.stats.sold >= 100; });
  ach("away", "😴", "Bon retour !", "Reviens après au moins une heure d'absence.", function () { return S.stats.maxOffline >= 3600; });

  function achCount() { var n = 0; for (var k in S.ach) if (S.ach[k]) n++; return n; }
  function totalOwned() { var n = 0; for (var i = 0; i < NP; i++) n += S.prod[i]; return n; }
  function totalAnimals(withHives) {
    var n = 0;
    D.ANIMALS.forEach(function (a) { if (withHives || !a.petals) n += S.animals[a.id] || 0; });
    return n;
  }

  /* =====================================================================
     calculs
     ===================================================================== */
  var C = {};
  function milestones(n) { var c = 0; for (var i = 0; i < D.MILESTONES.length; i++) if (n >= D.MILESTONES[i]) c++; if (n > 1000) c += Math.floor((n - 1000) / 100); return c; }
  function calc() {
    var se = season();
    var perm = (1 + D.SEED_BONUS * S.seedsSeason) * (1 + D.ESSENCE_BONUS * S.essenceTotal) * (1 + 0.02 * achCount());
    if (se === "hiver") perm *= 1.25;
    var aProd = 1, aClick = 1, aCrit = 0, aGarden = 1;
    D.ANIMALS.forEach(function (a) {
      var n = S.animals[a.id] || 0, f = a.eat > 0 ? S.fed : 1, v = a.val * n * f;
      if (a.bonus === "prod") aProd += v; else if (a.bonus === "click") aClick += v; else if (a.bonus === "crit") aCrit += v; else if (a.bonus === "garden") aGarden += v;
    });
    C.herbier = Math.min(2, 0.01 * Math.floor(S.flowersHarvested / 5));
    var prodMult = perm * Math.pow(1.5, R("seve")) * (1 + C.herbier) * (1 + 0.1 * S.moon) * aProd;
    if (se === "ete") prodMult *= 2;
    var upP = zeros(NP), upClick = 0, upSap = 0, upAll = 0, upGold = 0;
    for (var id in S.upg) {
      var u = UPG_BY[id]; if (!u || !S.upg[id]) continue;
      if (u.eff === "prod") upP[u.i]++; else if (u.eff === "click") upClick++; else if (u.eff === "sap") upSap++; else if (u.eff === "all") upAll++; else if (u.eff === "gold") upGold++;
    }
    prodMult *= Math.pow(1.5, upAll);
    var temp = 1;
    if (buff("frenzy")) temp *= 7;
    if (buff("tulip")) temp *= 1.5;
    C.each = [];
    var raw = 0;
    for (var i = 0; i < NP; i++) {
      var one = D.PRODUCERS[i].cps * Math.pow(2, milestones(S.prod[i]) + upP[i]) * prodMult;
      C.each[i] = { one: one * temp, total: one * temp * S.prod[i] };
      raw += one * S.prod[i];
    }
    C.prodMult = prodMult; C.temp = temp;
    C.cpsBase = raw; C.cps = raw * temp;
    var click = (1 + L("stick")) * Math.pow(2, upClick + R("poigne")) * perm * aClick * Math.pow(3, PK("double"));
    if (se === "automne") click *= 3;
    if (buff("daisy")) click *= 2;
    if (buff("fever")) click *= 77;
    C.clickCps = 0.01 * (L("sap") + upSap);
    C.clickFlat = click;
    C.click = click + C.cps * C.clickCps;
    C.critChance = Math.min(0.6, 0.05 + 0.02 * L("crit") + aCrit + (buff("rose") ? 0.15 : 0));
    C.critMult = 10 * (buff("rose") ? 2 : 1);
    C.comboMax = 25 + 10 * L("rhythm");
    C.comboStep = 0.03;
    C.autoRate = 0.5 * L("auto");
    C.autoPow = 0.2 + 0.05 * L("beak");
    C.gardenSpeed = (1 + 0.15 * S.garden.fert) * (1 + 0.1 * R("pouce")) * aGarden * (se === "printemps" ? 2 : 1);
    C.farmSpeed = (1 + 0.2 * S.farm.speed) * (1 + 0.1 * R("pouce")) * (se === "printemps" ? 2 : 1);
    C.goodsMult = se === "hiver" ? 2 : 1;
    C.eatMult = 1 - 0.25 * PK("berger");
    C.goldenFreq = Math.pow(0.85, upGold + PK("golden")) * (se === "automne" ? 0.5 : 1);
    C.goldenPow = 1 + 0.1 * upGold + 0.15 * PK("golden");
    C.offCap = 7200 * (1 + R("sommeil"));
    C.offEff = Math.min(1, (0.5 + 0.1 * R("sommeil")) * (se === "hiver" ? 2 : 1));
    C.pots = 2 + S.garden.pot + R("pot");
    C.fields = 3 + S.farm.field;
    C.foodCap = D.FOOD_CAP * Math.pow(2, S.farm.silo);
    C.stable = 4 + 4 * S.ranch.stable;
    C.polli = 1 + 0.2 * S.garden.polli;
    C.perm = perm;
    while (S.pots.length < C.pots) S.pots.push(newPot());
    while (S.fields.length < C.fields) S.fields.push(newField());
    if (C.cps > S.stats.bestCps) S.stats.bestCps = C.cps;
  }

  /* =====================================================================
     économie
     ===================================================================== */
  var CAP = 1e300;
  function earn(x) {
    if (!(x > 0)) return;
    if (!isFinite(x)) x = CAP;
    S.acorns = Math.min(CAP, S.acorns + x); S.runTotal = Math.min(CAP, S.runTotal + x);
    S.seasonTotal = Math.min(CAP, S.seasonTotal + x); S.lifeTotal = Math.min(CAP, S.lifeTotal + x);
  }
  function spend(x) { if (S.acorns + 1e-9 < x) return false; S.acorns = Math.max(0, S.acorns - x); return true; }
  function prodCost(i, k) {
    var p = D.PRODUCERS[i], g = D.COST_GROWTH, base = p.cost * Math.pow(g, S.prod[i]);
    return base * (Math.pow(g, k) - 1) / (g - 1);
  }
  function prodMaxBuy(i) {
    var p = D.PRODUCERS[i], g = D.COST_GROWTH, base = p.cost * Math.pow(g, S.prod[i]);
    return Math.max(0, Math.floor(Math.log(S.acorns * (g - 1) / base + 1) / Math.log(g)));
  }
  function buyProd(i, amt) {
    var k = amt === "max" ? prodMaxBuy(i) : amt;
    if (k < 1) k = 1;
    var c = prodCost(i, k);
    if (!spend(c)) return false;
    S.prod[i] += k;
    treeDirty = true;
    return true;
  }
  function buyLevel(id) {
    var def = D.LEVELED.filter(function (d) { return d.id === id; })[0];
    var lvl = L(id);
    if (!def || maxed(def, lvl)) return;
    if (!spend(lvCost(def, lvl))) return;
    S.lv[id] = lvl + 1;
  }
  function upgVisible(u) { return !S.upg[u.id] && u.req(); }
  function buyUpg(id) {
    var u = UPG_BY[id];
    if (!u || S.upg[id] || !u.req()) return;
    if (!spend(u.cost)) return;
    S.upg[id] = 1;
  }
  function flowerCost(f) { return Math.max(f.min, Math.ceil(C.cpsBase * f.cps)); }
  function cropCost(c) { return Math.max(c.min, Math.ceil(C.cpsBase * c.cps)); }
  function goodValue(id) { return Math.max(D.GOODS[id].sell, C.cpsBase * D.GOODS[id].sell); }
  function animalCost(a) { return Math.ceil(a.cost * Math.pow(a.growth, S.animals[a.id] || 0)); }

  /* ---------- prestige 1 : replanter ---------- */
  function seedsFor(a) { return Math.floor(Math.pow(a / D.SEED_DIV, D.SEED_POW) + 1e-9); }
  function seedGain() { return Math.max(0, seedsFor(S.seasonTotal) - S.seedsEarned); }
  function nextSeedAt() { var n = S.seedsEarned + seedGain() + 1; return Math.pow(n, 1 / D.SEED_POW) * D.SEED_DIV - S.seasonTotal; }
  function resetRun() {
    var res = R("reserve");
    S.acorns = res > 0 ? 1000 * Math.pow(10, res - 1) : 0;
    S.runTotal = 0; S.runTime = 0; S.stats.runClicks = 0;
    S.prod = zeros(NP); S.upg = {};
    if (!R("memoire")) S.lv = {};
    if (R("pivert")) S.lv.auto = Math.min(20, Math.max(L("auto"), 2 * R("pivert")));
    combo = 0; treeDirty = true;
    tabKeys = {};
  }
  function replant(auto) {
    var g = seedGain();
    if (g < 1) return;
    S.seeds += g; S.seedsEarned += g; S.seedsSeason += g; S.seedsLife += g; S.replants++;
    resetRun();
    toast("🌱 Replanté !", "+" + fmt(g) + " graine" + (g > 1 ? "s" : "") + (auto ? " (auto)" : ""));
    save();
  }
  /* ---------- prestige 2 : saisons ---------- */
  function essenceGain() {
    var s = S.seedsSeason + seedGain();
    return s >= D.SEASON_NEED ? Math.floor(Math.sqrt(s / D.SEASON_NEED)) : 0;
  }
  function changeSeason() {
    var g = essenceGain();
    if (g < 1) return;
    S.essence += g; S.essenceTotal += g; S.seasons++;
    S.season = (S.season + 1) % 4;
    S.seedsLife += seedGain();
    var germ = 10 * PK("germ");
    S.seeds = germ; S.seedsEarned = 0; S.seedsSeason = germ; S.seasonTotal = 0;
    if (!PK("memroots")) S.roots = {};
    resetRun();
    var se = D.SEASONS[S.season];
    toast(se.icon + " " + se.name, "+" + g + " essence 🍃 · " + se.desc);
    save();
  }

  /* =====================================================================
     jardin / ferme / bétail
     ===================================================================== */
  function flowerUnlocked(f) { return !f.need || (f.need === "replant" ? S.replants > 0 || S.seasons > 0 : S.seasons > 0); }
  function plantPot(i) {
    var pot = S.pots[i], f = D.FLOWERS.filter(function (x) { return x.id === S.garden.sel; })[0];
    if (!pot || pot.f || !f || !flowerUnlocked(f)) return false;
    if (!spend(flowerCost(f))) return false;
    pot.f = f.id; pot.g = 0; pot.need = f.grow; pot.wc = 0; pot.wat = 0;
    return true;
  }
  function harvestPot(i) {
    var pot = S.pots[i];
    if (!pot || !pot.f || pot.g < pot.need) return false;
    var f = D.FLOWERS.filter(function (x) { return x.id === pot.f; })[0];
    pot.f = null; pot.g = 0; pot.need = 0;
    S.petals += f.petals; S.petalsLife += f.petals; S.flowersHarvested++;
    var p = C.polli, msg = f.effect;
    if (f.id === "paquerette") addBuff("daisy", 120 * p);
    else if (f.id === "tulipe") addBuff("tulip", 600 * p);
    else if (f.id === "tournesol") { var g = C.cpsBase * f.gain; earn(g); msg = "+" + fmt(g) + " 🌰"; }
    else if (f.id === "rose") addBuff("rose", 1200 * p);
    else if (f.id === "lotus") { var s = Math.max(1, Math.floor(0.03 * seedsFor(S.seasonTotal))); S.seeds += s; S.seedsSeason += s; S.seedsLife += s; msg = "+" + fmt(s) + " graines 🌱"; }
    else if (f.id === "lune") { S.moon++; msg = "Production +10 % pour toujours (×" + S.moon + ")"; }
    toast(f.icon + " " + f.name + " cueillie", msg + " · +" + f.petals + " 🌸");
    return true;
  }
  function waterPot(i) {
    var pot = S.pots[i];
    if (!pot || !pot.f || pot.g >= pot.need || pot.wc > 0 || (pot.wat || 0) >= 0.5) return false;
    pot.g = Math.min(pot.need, pot.g + Math.max(1, pot.need * 0.02));
    pot.wat = (pot.wat || 0) + 0.02;
    pot.wc = 8;
    return true;
  }
  function potAction(i) {
    var pot = S.pots[i];
    if (!pot) return;
    if (!pot.f) plantPot(i);
    else if (pot.g >= pot.need) { harvestPot(i); plantPot(i); }
    else waterPot(i);
  }
  function addBuff(id, dur) {
    var max = dur * 3;
    S.buffs[id] = Math.min(max, (S.buffs[id] || 0) + dur);
  }
  function cropDef(id) { return D.CROPS.filter(function (c) { return c.id === id; })[0]; }
  function plantField(i, id) {
    var fl = S.fields[i], c = cropDef(id || S.farm.sel);
    if (!fl || fl.c || !c) return false;
    if (!spend(cropCost(c))) return false;
    fl.c = c.id; fl.g = 0; fl.need = c.grow; fl.last = c.id;
    return true;
  }
  function harvestField(i, quiet) {
    var fl = S.fields[i];
    if (!fl || !fl.c || fl.g < fl.need) return false;
    var c = cropDef(fl.c);
    var food = c.food * (1 + 0.25 * S.farm.fert);
    var before = S.food;
    S.food = Math.min(C.foodCap, S.food + food);
    S.foodLife += food; S.cropsHarvested++;
    var over = fl.g - fl.need;
    fl.c = null; fl.g = 0; fl.need = 0;
    if (!quiet && S.food - before < food - 0.01) toast("🏚️ Grenier plein", "Achète un grenier plus grand ou du bétail.");
    return over;
  }
  function fieldAction(i) {
    var fl = S.fields[i];
    if (!fl) return;
    if (!fl.c) plantField(i);
    else if (fl.g >= fl.need) { harvestField(i); plantField(i); }
  }
  function buyAnimal(id) {
    var a = D.ANIMALS.filter(function (x) { return x.id === id; })[0];
    if (!a) return;
    var n = S.animals[a.id] || 0;
    if (a.petals) {
      if (n >= a.max) return;
      var pc = animalCost(a);
      if (S.petals < pc) return;
      S.petals -= pc;
    } else {
      if (totalAnimals(false) >= C.stable) { toast("🛖 Étable pleine", "Agrandis l'étable pour accueillir plus d'animaux."); return; }
      if (!spend(animalCost(a))) return;
    }
    S.animals[a.id] = n + 1;
  }
  function sellGood(id) {
    var n = Math.floor(S.goods[id] || 0);
    if (n < 1) return 0;
    var v = n * goodValue(id);
    S.goods[id] -= n; S.stats.sold += n;
    earn(v);
    return v;
  }
  function sellAll(quiet) {
    var t = 0;
    for (var id in D.GOODS) t += sellGood(id);
    if (!quiet && t > 0) toast("🛒 Marché", "+" + fmt(t) + " 🌰");
    return t;
  }
  function shopLevel(store, def) {
    var lvl = store[def.id] || 0;
    if (maxed(def, lvl)) return false;
    return lvl;
  }

  /* simulation des à-côtés (aussi utilisée hors ligne) */
  function side(dt) {
    var i;
    for (i = 0; i < S.pots.length; i++) {
      var pot = S.pots[i];
      if (pot.wc > 0) pot.wc = Math.max(0, pot.wc - dt);
      if (pot.f && pot.g < pot.need) pot.g = Math.min(pot.need, pot.g + dt * C.gardenSpeed);
    }
    for (i = 0; i < S.fields.length; i++) {
      var fl = S.fields[i];
      if (fl.c && fl.g < fl.need) fl.g += dt * C.farmSpeed;
      var guard = 0;
      while (S.farm.scare && fl.c && fl.g >= fl.need && guard++ < 50) {
        var crop = fl.c, over = harvestField(i, true);
        if (!plantField(i, crop)) break;
        fl.g = Math.min(over, fl.need);
      }
    }
    // bétail
    var need = 0;
    D.ANIMALS.forEach(function (a) { need += (S.animals[a.id] || 0) * a.eat / 60 * C.eatMult * dt; });
    var f = 1;
    if (need > 0) {
      if (S.food >= need) S.food -= need;
      else { f = S.food / need; S.food = 0; }
    }
    S.fed += (f - S.fed) * Math.min(1, dt / 8);
    D.ANIMALS.forEach(function (a) {
      var n = S.animals[a.id] || 0;
      if (!n) return;
      var ff = a.eat > 0 ? f : 1;
      S.goods[a.good] = (S.goods[a.good] || 0) + n * a.rate / 60 * ff * C.goodsMult * dt;
    });
    if (S.ranch.cart && S.opts.autoSell) sellAll(true);
  }

  /* =====================================================================
     boucle de jeu
     ===================================================================== */
  var combo = 0, lastClick = 0, autoAcc = 0, autoT = 0, achT = 0, saveT = 0, peckT = 0, shake = 0;
  var treeDirty = true, golden = null;
  function tick(dt) {
    S.time += dt; S.runTime += dt;
    for (var b in S.buffs) { S.buffs[b] -= dt; if (S.buffs[b] <= 0) delete S.buffs[b]; }
    calc();
    earn(C.cps * dt);
    // clics auto
    if (C.autoRate > 0) {
      autoAcc += C.autoRate * dt;
      var n = Math.floor(autoAcc);
      if (n > 0) {
        autoAcc -= n;
        earn(n * C.click * C.autoPow);
        S.stats.autoClicks += n;
        peckT = 0.09;
        if (S.opts.fx && Math.random() < 0.35) leaf(null, null, 1);
      }
    }
    if (performance.now() - lastClick > 900 && combo > 0) combo = Math.max(0, combo - dt * 18);
    side(dt);
    // gland doré
    if (!golden && !document.hidden) {
      S.goldenNext -= dt;
      if (S.goldenNext <= 0) spawnGolden();
    }
    // automatisations
    autoT += dt;
    if (autoT >= 0.25) { automate(autoT); autoT = 0; }
    achT += dt;
    if (achT >= 1) { achT = 0; checkAch(); checkUnlocks(); }
    saveT += dt;
    if (saveT >= 15) { saveT = 0; save(); }
  }
  var autoBudget = 0;
  function automate(dt) {
    var ab = R("autobuy");
    if (ab && S.opts.autoBuy) {
      autoBudget = Math.min(40, autoBudget + dt * [0, 2, 6, 25][ab]);
      while (autoBudget >= 1) {
        var best = -1, bc = Infinity;
        for (var i = 0; i < NP; i++) {
          if (!prodVisible(i)) continue;
          var c = prodCost(i, 1);
          if (c < bc) { bc = c; best = i; }
        }
        if (best < 0 || bc > S.acorns) break;
        buyProd(best, 1);
        autoBudget -= 1;
      }
    }
    if (R("autoupg") && S.opts.autoUpg) {
      UPG.filter(upgVisible).sort(function (a, b) { return a.cost - b.cost; }).forEach(function (u) {
        if (u.cost <= S.acorns) buyUpg(u.id);
      });
    }
    if (PK("autoreplant") && S.opts.autoReplant && S.runTime > 10) {
      var g = seedGain();
      if (g >= Math.max(1, S.seedsSeason * S.opts.arPct / 100)) replant(true);
    }
  }
  function prodVisible(i) {
    return i === 0 || S.prod[i] > 0 || S.prod[i - 1] > 0 || S.runTotal >= D.PRODUCERS[i].cost * 0.4;
  }

  /* ---------- clic du joueur ---------- */
  function playerClick(x, y) {
    lastClick = performance.now();
    combo = Math.min(C.comboMax, combo + 1);
    if (combo > S.stats.bestCombo) S.stats.bestCombo = Math.floor(combo);
    var crit = Math.random() < C.critChance;
    var v = C.click * (1 + C.comboStep * Math.floor(combo)) * (crit ? C.critMult : 1);
    earn(v);
    S.stats.clicks++; S.stats.runClicks++;
    if (crit) S.stats.crits++;
    shake = Math.min(1, shake + 0.55);
    if (S.opts.nums) floatText(x, y, "+" + fmt(v, true), crit);
    if (S.opts.fx) { leaf(x, y, crit ? 6 : 3); acornPop(x, y); }
  }

  /* ---------- gland doré ---------- */
  var goldLayer = $("[data-golden-layer]");
  function spawnGolden() {
    var el = document.createElement("button");
    el.type = "button";
    el.className = "idle-golden";
    el.setAttribute("aria-label", "Gland doré ! Clique vite");
    el.textContent = "🌰";
    goldLayer.appendChild(el);
    golden = { el: el, t: 0, life: D.GOLDEN.life * C.goldenPow, x: 0.12 + Math.random() * 0.76, ph: Math.random() * 6 };
    el.addEventListener("pointerdown", function (e) { e.preventDefault(); e.stopPropagation(); catchGolden(); });
    el.addEventListener("click", function (e) { e.stopPropagation(); });
  }
  function endGolden() {
    if (!golden) return;
    golden.el.remove();
    golden = null;
    S.goldenNext = (D.GOLDEN.min + Math.random() * (D.GOLDEN.max - D.GOLDEN.min)) * C.goldenFreq;
  }
  function catchGolden() {
    if (!golden) return;
    var r = Math.random(), p = C.goldenPow;
    S.stats.golden++;
    if (r < 0.45) { addBuff("frenzy", 60 * p); toast("🌟 Frénésie dorée !", "Production ×7 pendant " + fmtTime(60 * p) + "."); }
    else if (r < 0.9) {
      var g = (Math.max(C.cps * 60, Math.min(S.acorns * 0.15, C.cps * 900)) + 13) * p;
      earn(g); toast("🌟 Pluie de glands !", "+" + fmt(g) + " 🌰");
    } else { addBuff("fever", 12 * p); toast("🌟 Fièvre du clic !", "Clic ×77 pendant " + fmtTime(12 * p) + ". Tape vite !"); }
    endGolden();
  }

  /* =====================================================================
     hors ligne
     ===================================================================== */
  function offline(sec) {
    if (sec < 5) return;
    sec = Math.min(sec, 86400 * 14);
    for (var b in S.buffs) { S.buffs[b] -= sec; if (S.buffs[b] <= 0) delete S.buffs[b]; }
    calc();
    var acorns0 = S.acorns, food0 = S.food, goods0 = {}, flowers = 0, crops0 = S.cropsHarvested;
    for (var gk in D.GOODS) goods0[gk] = S.goods[gk] || 0;
    var prodSec = Math.min(sec, C.offCap);
    earn((C.cpsBase + C.autoRate * C.autoPow * (C.clickFlat + C.cpsBase * C.clickCps)) * prodSec * C.offEff);
    var readyBefore = S.pots.filter(function (p) { return p.f && p.g >= p.need; }).length;
    var n = Math.min(2000, Math.ceil(sec / 30)), step = sec / n;
    for (var i = 0; i < n; i++) side(step);
    flowers = S.pots.filter(function (p) { return p.f && p.g >= p.need; }).length - readyBefore;
    if (sec > S.stats.maxOffline) S.stats.maxOffline = sec;
    if (sec < 60) return;
    var lines = ["<li>🌰 <b>+" + fmt(S.acorns - acorns0) + "</b> glands" + (sec > C.offCap ? " (limite de " + fmtTime(C.offCap) + " atteinte)" : "") + " · efficacité " + Math.round(C.offEff * 100) + " %</li>"];
    if (flowers > 0) lines.push("<li>🌸 " + flowers + " fleur" + (flowers > 1 ? "s" : "") + " prête" + (flowers > 1 ? "s" : "") + " à cueillir</li>");
    if (S.cropsHarvested > crops0) lines.push("<li>🌾 " + (S.cropsHarvested - crops0) + " récoltes faites par l'épouvantail</li>");
    if (S.food !== food0) lines.push("<li>🥫 Nourriture : " + fmt(food0) + " → " + fmt(S.food) + "</li>");
    var gl = [];
    for (gk in D.GOODS) { var d = (S.goods[gk] || 0) - goods0[gk]; if (d >= 1) gl.push(D.GOODS[gk].icon + " +" + fmt(d)); }
    if (gl.length) lines.push("<li>" + gl.join(" · ") + "</li>");
    modal("Bon retour !", "<p>Tu étais absent·e " + fmtTime(sec) + ". Pendant ce temps :</p><ul class=\"idle-list\">" + lines.join("") + "</ul>", [{ label: "Super !", cls: "btn-alt" }]);
  }

  /* =====================================================================
     sauvegarde
     ===================================================================== */
  function save() {
    S.last = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {}
  }
  function loadFrom(obj) {
    S = merge(fresh(), obj);
    if (S.prod.length < NP) S.prod = S.prod.concat(zeros(NP - S.prod.length));
    S.season = ((S.season | 0) % 4 + 4) % 4;
    tabKeys = {};
    treeDirty = true;
  }
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) {}
    if (!raw) return false;
    try { loadFrom(JSON.parse(raw)); return true; } catch (e) { return false; }
  }
  function exportSave() {
    save();
    try { return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); } catch (e) { return ""; }
  }
  function importSave(txt) {
    try {
      var obj = JSON.parse(decodeURIComponent(escape(atob(txt.trim()))));
      if (!obj || typeof obj !== "object" || !("acorns" in obj)) throw new Error("bad");
      loadFrom(obj); calc(); save();
      toast("💾 Sauvegarde importée", "Bon jeu !");
      return true;
    } catch (e) { toast("⚠️ Import impossible", "Le texte collé n'est pas une sauvegarde valide."); return false; }
  }

  /* =====================================================================
     succès / déblocages
     ===================================================================== */
  function checkAch() {
    ACH.forEach(function (a) {
      if (!S.ach[a.id] && a.test()) { S.ach[a.id] = 1; toast("🏆 " + a.name, a.desc + " (+2 % à tout)"); }
    });
  }
  var TABS = [
    { id: "forest",  icon: "🐿️", name: "Forêt" },
    { id: "upg",     icon: "⬆️", name: "Améliorations", test: function () { return S.runTotal >= 100 || S.lifeTotal >= 500; }, hint: "Récolte 100 glands." },
    { id: "garden",  icon: "🌸", name: "Jardin", test: function () { return S.lifeTotal >= 300; }, hint: "Récolte 300 glands au total." },
    { id: "farm",    icon: "🌾", name: "Ferme", test: function () { return S.lifeTotal >= 2e4; }, hint: "Récolte 20 K glands au total." },
    { id: "ranch",   icon: "🐄", name: "Bétail", test: function () { return S.foodLife >= 20; }, hint: "Produis 20 de nourriture à la ferme." },
    { id: "roots",   icon: "🌱", name: "Racines", test: function () { return S.seasonTotal >= D.SEED_DIV * 0.5 || S.seedsLife > 0 || S.seasons > 0; }, hint: "Récolte 500 K glands." },
    { id: "seasons", icon: "🍂", name: "Saisons", test: function () { return S.seedsSeason >= D.SEASON_NEED / 2 || S.seasons > 0; }, hint: "Gagne " + D.SEASON_NEED / 2 + " graines dans la saison." },
    { id: "ach",     icon: "🏆", name: "Succès" },
    { id: "opts",    icon: "⚙️", name: "Options" }
  ];
  function checkUnlocks() {
    TABS.forEach(function (t) {
      if (!S.unl[t.id] && (!t.test || t.test())) {
        S.unl[t.id] = true;
        if (t.test) toast(t.icon + " " + t.name + " débloqué !", "Un nouvel onglet est disponible.");
        tabsDirty = true;
      }
    });
  }

  /* =====================================================================
     interface : toasts et fenêtres
     ===================================================================== */
  var toasts = document.createElement("div");
  toasts.className = "idle-toasts";
  toasts.setAttribute("aria-live", "polite");
  document.body.appendChild(toasts);
  function toast(title, text) {
    var t = document.createElement("div");
    t.className = "idle-toast";
    t.innerHTML = "<strong>" + esc(title) + "</strong>" + (text ? "<span>" + esc(text) + "</span>" : "");
    toasts.appendChild(t);
    while (toasts.children.length > 4) toasts.firstChild.remove();
    setTimeout(function () { t.classList.add("out"); setTimeout(function () { t.remove(); }, 500); }, 3600);
  }
  function modal(title, html, buttons) {
    var ov = document.createElement("div");
    ov.className = "idle-modal";
    ov.innerHTML = '<div class="panel idle-modal-card" role="dialog" aria-modal="true"><h2></h2><div class="idle-modal-body"></div><div class="btn-row center"></div></div>';
    $("h2", ov).textContent = title;
    $(".idle-modal-body", ov).innerHTML = html;
    var row = $(".btn-row", ov);
    function close() { ov.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(e) { if (e.key === "Escape") close(); }
    (buttons || [{ label: "Fermer" }]).forEach(function (b) {
      var el = document.createElement("button");
      el.type = "button"; el.className = "btn btn-small " + (b.cls || "btn-ghost"); el.textContent = b.label;
      el.addEventListener("click", function () { if (!b.fn || b.fn(ov) !== false) close(); });
      row.appendChild(el);
    });
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(ov);
    var first = $(".btn", ov); if (first) first.focus();
    return ov;
  }

  /* =====================================================================
     interface : listes (construites une fois, mises à jour ensuite)
     ===================================================================== */
  var tabsEl = $("[data-tabs]"), bodyEl = $("[data-body]");
  var tabKeys = {}, tabsDirty = true, panes = {};
  function setText(el, v) { v = v == null ? "" : String(v); if (el._v !== v) { el._v = v; el.textContent = v; } }
  function setHTML(el, v) { v = v == null ? "" : String(v); if (el._h !== v) { el._h = v; el.innerHTML = v; } }
  function itemKey(it) { return it.k + "/" + (it.type || "c") + (it.pct != null ? "%" : "") + (it.chips ? it.chips.length : ""); }
  function buildItem(it) {
    var el;
    if (it.type === "chips") {
      el = document.createElement("div"); el.className = "ib-chips";
      it.chips.forEach(function () { var b = document.createElement("button"); b.type = "button"; b.className = "ib-chip"; el.appendChild(b); });
    } else if (it.type === "text") {
      el = document.createElement("div"); el.className = "ib-text";
    } else {
      el = document.createElement("button"); el.type = "button";
      el.innerHTML = '<span class="ib-icon"></span><span class="ib-main"><span class="ib-title"></span><span class="ib-desc"></span></span><span class="ib-side"><span class="ib-badge"></span><span class="ib-cost"></span></span>' + (it.pct != null ? '<span class="ib-bar"><i></i></span>' : "");
      el._p = { icon: $(".ib-icon", el), title: $(".ib-title", el), desc: $(".ib-desc", el), badge: $(".ib-badge", el), cost: $(".ib-cost", el), bar: $(".ib-bar i", el) };
    }
    return el;
  }
  function updItem(el, it) {
    if (it.type === "chips") {
      it.chips.forEach(function (c, i) {
        var b = el.children[i];
        setText(b, c.label);
        var cls = "ib-chip" + (c.on ? " on" : "") + (c.off ? " off" : "");
        if (b.className !== cls) b.className = cls;
        if (b.dataset.act !== (c.act || "")) b.dataset.act = c.act || "";
        if (c.title && b.title !== c.title) b.title = c.title;
      });
    } else if (it.type === "text") {
      setHTML(el, it.text);
    } else {
      var p = el._p;
      setText(p.icon, it.icon); setText(p.title, it.title); setText(p.desc, it.desc);
      setText(p.badge, it.badge); setText(p.cost, it.cost);
      var cls = "ib-card st-" + (it.st || "ok") + (it.big ? " big" : "");
      if (el.className !== cls) el.className = cls;
      if (el.dataset.act !== (it.act || "")) el.dataset.act = it.act || "";
      el.setAttribute("aria-disabled", it.st === "no" || it.st === "done" ? "true" : "false");
      if (p.bar) { var w = Math.max(0, Math.min(100, it.pct)).toFixed(1) + "%"; if (p.bar.style.width !== w) p.bar.style.width = w; }
    }
  }
  function sync(pane, sections) {
    var key = sections.map(function (s) { return s.id + ":" + s.items.map(itemKey).join(","); }).join("|");
    if (tabKeys[pane.dataset.pane] !== key) {
      tabKeys[pane.dataset.pane] = key;
      pane.innerHTML = "";
      sections.forEach(function (s) {
        var sec = document.createElement("section"); sec.className = "ib-sec";
        if (s.title != null) { var h = document.createElement("h3"); h.className = "ib-h"; sec.appendChild(h); sec._h = h; }
        if (s.note != null) { var n = document.createElement("p"); n.className = "ib-note"; sec.appendChild(n); sec._n = n; }
        var list = document.createElement("div"); list.className = "ib-list" + (s.grid ? " grid" : ""); sec.appendChild(list);
        sec._items = s.items.map(function (it) { var el = buildItem(it); list.appendChild(el); return el; });
        pane.appendChild(sec);
      });
    }
    var secs = pane.children;
    sections.forEach(function (s, i) {
      var sec = secs[i];
      if (sec._h) setText(sec._h, s.title);
      if (sec._n) setHTML(sec._n, s.note);
      s.items.forEach(function (it, j) { updItem(sec._items[j], it); });
    });
  }
  function st(can) { return can ? "ok" : "no"; }
  function costTxt(c, cur) { return fmt(c) + " " + (cur || "🌰"); }

  /* ---------- onglet Forêt ---------- */
  function paneForest() {
    var amt = S.opts.buyAmt;
    var chips = [1, 10, 100, "max"].map(function (a) { return { label: a === "max" ? "Max" : "×" + a, act: "amt:" + a, on: amt === a }; });
    if (R("autobuy")) chips.push({ label: "🤖 Auto " + (S.opts.autoBuy ? "ON" : "OFF"), act: "toggle:autoBuy", on: S.opts.autoBuy });
    var click = D.LEVELED.map(function (d) {
      var lvl = L(d.id), mx = maxed(d, lvl), c = lvCost(d, lvl), cur;
      if (d.id === "stick") cur = "Clic de base : " + (1 + lvl);
      else if (d.id === "sap") cur = "Actuel : +" + Math.round(C.clickCps * 100) + " % de prod. par clic (" + fmt(C.cps * C.clickCps, true) + ")";
      else if (d.id === "crit") cur = "Critique : " + pct(C.critChance) + " · ×" + C.critMult;
      else if (d.id === "rhythm") cur = "Combo max : " + C.comboMax + " (×" + fmt(1 + C.comboStep * C.comboMax, true) + ")";
      else if (d.id === "auto") cur = "Actuel : " + fmt(C.autoRate, true) + " clic/s";
      else cur = "Clics auto : " + Math.round(C.autoPow * 100) + " % du clic (" + fmt(C.click * C.autoPow, true) + ")";
      return { k: "lv-" + d.id, icon: d.icon, title: d.name, desc: d.desc + " " + cur, badge: d.max ? lvl + "/" + d.max : "niv. " + lvl,
        cost: mx ? "MAX" : costTxt(c), st: mx ? "done" : st(S.acorns >= c), act: "lv:" + d.id };
    });
    var prods = [], shownNext = false;
    D.PRODUCERS.forEach(function (p, i) {
      if (prodVisible(i)) {
        var k = amt === "max" ? Math.max(1, prodMaxBuy(i)) : amt, c = prodCost(i, k), n = S.prod[i];
        var nextMs = D.MILESTONES.filter(function (m) { return m > n; })[0];
        var share = C.cps > 0 ? C.each[i].total / C.cps : 0;
        prods.push({ k: "p" + i, icon: p.icon, title: p.name, badge: String(n), act: "prod:" + i,
          desc: "+" + fmt(C.each[i].one, true) + "/s chacun" + (n ? " · total " + fmt(C.each[i].total, true) + "/s (" + Math.round(share * 100) + " %)" : " · " + p.desc) + (nextMs ? " · ×2 à " + nextMs : ""),
          cost: costTxt(c) + (k > 1 ? " (×" + k + ")" : ""), st: st(S.acorns >= c) });
      } else if (!shownNext) {
        shownNext = true;
        prods.push({ k: "p" + i + "-lock", icon: "❔", title: "???", desc: "Un nouvel habitant attend dans les bois…", badge: "", cost: costTxt(p.cost), st: "no", act: "" });
      }
    });
    return [
      { id: "click", title: "Ta cueillette", note: "Ton clic vaut <b>" + fmt(C.click, true) + "</b> 🌰 (combo et critiques en plus). Le pic tapeur, lui, n'a ni combo ni critique.", items: click },
      { id: "prod", title: "Habitants de la forêt", note: "Production totale : <b>" + fmt(C.cps, true) + "</b> 🌰/s" + (C.temp > 1 ? " (bonus temporaire ×" + fmt(C.temp, true) + ")" : ""), items: [{ k: "amt", type: "chips", chips: chips }].concat(prods) }
    ];
  }
  /* ---------- onglet Améliorations ---------- */
  function paneUpg() {
    var list = UPG.filter(upgVisible).sort(function (a, b) { return a.cost - b.cost; });
    var bought = 0; for (var k in S.upg) if (S.upg[k]) bought++;
    var items = list.map(function (u) { return { k: u.id, icon: u.icon, title: u.name, desc: u.desc, badge: "", cost: costTxt(u.cost), st: st(S.acorns >= u.cost), act: "upg:" + u.id }; });
    if (!items.length) items.push({ k: "none", type: "text", text: "<p>Aucune amélioration disponible pour l'instant. Achète des habitants, clique et récolte pour en débloquer.</p>" });
    var autoChip = R("autoupg") ? [{ k: "autoupg", type: "chips", chips: [{ label: "📜 Achat auto " + (S.opts.autoUpg ? "ON" : "OFF"), act: "toggle:autoUpg", on: S.opts.autoUpg }] }] : [];
    return [
      { id: "upg", title: "Améliorations uniques", note: bought + " achetée" + (bought > 1 ? "s" : "") + " dans cette partie. Elles repartent à zéro quand tu replantes.", items: autoChip.concat(items) }
    ];
  }
  /* ---------- onglet Jardin ---------- */
  function paneGarden() {
    var sel = D.FLOWERS.filter(function (f) { return f.id === S.garden.sel; })[0] || D.FLOWERS[0];
    var chips = D.FLOWERS.filter(flowerUnlocked).map(function (f) { return { label: f.icon + " " + f.name, act: "seed:" + f.id, on: f.id === sel.id }; });
    var lockedF = D.FLOWERS.filter(function (f) { return !flowerUnlocked(f); });
    var info = "<p><b>" + sel.icon + " " + sel.name + "</b> · pousse en " + fmtTime(sel.grow / C.gardenSpeed) + " · coûte " + fmt(flowerCost(sel)) + " 🌰 · +" + sel.petals + " 🌸<br>" + sel.effect + "</p>";
    if (lockedF.length) info += "<p class=\"ib-small\">" + lockedF.map(function (f) { return "🔒 " + f.name + (f.need === "replant" ? " : replante une fois" : " : change de saison une fois"); }).join(" · ") + "</p>";
    var pots = S.pots.slice(0, C.pots).map(function (pot, i) {
      if (!pot.f) {
        var c = flowerCost(sel);
        return { k: "pot" + i, icon: "🪴", title: "Pot " + (i + 1) + " — vide", desc: "Touche pour planter : " + sel.icon + " " + sel.name, badge: "", cost: costTxt(c), st: st(S.acorns >= c), act: "pot:" + i, pct: 0 };
      }
      var f = D.FLOWERS.filter(function (x) { return x.id === pot.f; })[0];
      var ready = pot.g >= pot.need, p = pot.g / pot.need * 100;
      if (ready) return { k: "pot" + i, icon: f.icon, title: f.name + " prête !", desc: "Touche pour cueillir (et replanter " + sel.name + ") : " + f.effect, badge: "✿", cost: "+" + f.petals + " 🌸", st: "ready", act: "pot:" + i, pct: 100 };
      return { k: "pot" + i, icon: p < 50 ? "🌱" : "🌿", title: f.name + " · " + Math.floor(p) + " %", desc: "Prête dans " + fmtTime((pot.need - pot.g) / C.gardenSpeed) + ((pot.wat || 0) >= 0.5 ? " · assez arrosée" : pot.wc > 0 ? " · arrosée 💧 (" + Math.ceil(pot.wc) + " s)" : " · touche pour arroser 💧"), badge: "", cost: "", st: "grow", act: "pot:" + i, pct: p };
    });
    var anyReady = S.pots.some(function (p) { return p.f && p.g >= p.need; }), anyEmpty = S.pots.slice(0, C.pots).some(function (p) { return !p.f; });
    if (anyReady || anyEmpty) pots.push({ k: "potall", icon: "🧺", title: "Tout cueillir et replanter", desc: "Cueille les fleurs prêtes et plante " + sel.name + " dans les pots vides.", badge: "", cost: "", st: "ok", act: "pots:all" });
    var shop = D.GARDEN_SHOP.map(function (d) {
      var lvl = S.garden[d.id] || 0, mx = maxed(d, lvl), c = lvCost(d, lvl);
      return { k: "gs-" + d.id, icon: d.icon, title: d.name, desc: d.desc, badge: lvl + "/" + d.max, cost: mx ? "MAX" : costTxt(c, "🌸"), st: mx ? "done" : st(S.petals >= c), act: "gshop:" + d.id };
    });
    return [
      { id: "seeds", title: "Graines de fleurs", note: null, items: [{ k: "fl", type: "chips", chips: chips }, { k: "flinfo", type: "text", text: info }] },
      { id: "pots", title: "Tes pots (" + C.pots + ")", note: "Vitesse de pousse ×" + fmt(C.gardenSpeed, true) + (season() === "printemps" ? " (printemps !)" : "") + ". Arroser fait gagner 2 % de pousse (toutes les 8 s par pot, jusqu'à la moitié du temps).", items: pots, grid: true },
      { id: "gshop", title: "Boutique du jardin · " + fmt(S.petals) + " 🌸", note: "Herbier : " + S.flowersHarvested + " fleurs cueillies → production +" + Math.round(C.herbier * 100) + " % (1 % toutes les 5 fleurs, 200 % max)." + (S.moon ? " Fleurs de lune : +" + S.moon * 10 + " %." : ""), items: shop }
    ];
  }
  /* ---------- onglet Ferme ---------- */
  function paneFarm() {
    var sel = cropDef(S.farm.sel) || D.CROPS[0];
    var chips = D.CROPS.map(function (c) { return { label: c.icon + " " + c.name, act: "crop:" + c.id, on: c.id === sel.id }; });
    var food = sel.food * (1 + 0.25 * S.farm.fert);
    var info = "<p><b>" + sel.icon + " " + sel.name + "</b> · pousse en " + fmtTime(sel.grow / C.farmSpeed) + " · coûte " + fmt(cropCost(sel)) + " 🌰 · donne " + fmt(food, true) + " 🥫</p>";
    var fields = S.fields.slice(0, C.fields).map(function (fl, i) {
      if (!fl.c) { var c = cropCost(sel); return { k: "f" + i, icon: "🟫", title: "Parcelle " + (i + 1) + " — libre", desc: "Touche pour semer : " + sel.icon + " " + sel.name, badge: "", cost: costTxt(c), st: st(S.acorns >= c), act: "field:" + i, pct: 0 }; }
      var cd = cropDef(fl.c), ready = fl.g >= fl.need, p = Math.min(100, fl.g / fl.need * 100);
      if (ready) return { k: "f" + i, icon: cd.icon, title: cd.name + " mûr !", desc: "Touche pour récolter (et ressemer " + sel.name + ").", badge: "✔", cost: "+" + fmt(cd.food * (1 + 0.25 * S.farm.fert), true) + " 🥫", st: "ready", act: "field:" + i, pct: 100 };
      return { k: "f" + i, icon: p < 50 ? "🌱" : "🌿", title: cd.name + " · " + Math.floor(p) + " %", desc: "Prêt dans " + fmtTime((fl.need - fl.g) / C.farmSpeed), badge: "", cost: "", st: "grow", act: "", pct: p };
    });
    var any = S.fields.slice(0, C.fields).some(function (f) { return !f.c || f.g >= f.need; });
    if (any) fields.push({ k: "fall", icon: "🧑‍🌾", title: "Tout récolter et semer", desc: "Récolte ce qui est mûr et sème " + sel.name + " partout.", badge: "", cost: "", st: "ok", act: "fields:all" });
    var shop = D.FARM_SHOP.map(function (d) {
      var lvl = S.farm[d.id] || 0, mx = maxed(d, lvl), c = lvCost(d, lvl);
      return { k: "fs-" + d.id, icon: d.icon, title: d.name, desc: d.desc, badge: d.max > 1 ? lvl + "/" + d.max : (lvl ? "✔" : ""), cost: mx ? (d.max > 1 ? "MAX" : "Acheté") : costTxt(c), st: mx ? "done" : st(S.acorns >= c), act: "fshop:" + d.id };
    });
    return [
      { id: "crops", title: "Semences", note: null, items: [{ k: "cr", type: "chips", chips: chips }, { k: "crinfo", type: "text", text: info }] },
      { id: "fields", title: "Parcelles (" + C.fields + ")", note: "Grenier : <b>" + fmt(S.food, true) + " / " + fmt(C.foodCap) + "</b> 🥫 · vitesse ×" + fmt(C.farmSpeed, true) + (S.farm.scare ? " · 🎎 l'épouvantail s'occupe de tout" : ""), items: fields, grid: true },
      { id: "fshop", title: "Matériel de ferme", note: null, items: shop }
    ];
  }
  /* ---------- onglet Bétail ---------- */
  function paneRanch() {
    var eat = 0;
    D.ANIMALS.forEach(function (a) { eat += (S.animals[a.id] || 0) * a.eat * C.eatMult; });
    var used = totalAnimals(false);
    var animals = D.ANIMALS.map(function (a) {
      var n = S.animals[a.id] || 0, c = animalCost(a), cur = a.petals ? "🌸" : "🌰";
      var can = a.petals ? (n < a.max && S.petals >= c) : (used < C.stable && S.acorns >= c);
      var full = a.petals ? n >= a.max : false;
      var g = D.GOODS[a.good];
      return { k: "a-" + a.id, icon: a.icon, title: a.name, badge: String(n), act: "animal:" + a.id,
        desc: (a.eat ? "Mange " + fmt(a.eat * C.eatMult, true) + " 🥫/min · " : "Butine les fleurs · ") + g.icon + " " + fmt(a.rate * C.goodsMult, true) + "/min · " + a.bonusTxt + (n ? " (total +" + Math.round(a.val * n * (a.eat ? S.fed : 1) * 100) + " %)" : ""),
        cost: full ? "MAX" : costTxt(c, cur), st: full ? "done" : st(can) };
    });
    var goods = [], total = 0;
    for (var id in D.GOODS) {
      var g = D.GOODS[id], n = Math.floor(S.goods[id] || 0);
      if (!n && !(S.goods[id] > 0)) continue;
      var v = n * goodValue(id); total += v;
      goods.push({ k: "g-" + id, icon: g.icon, title: g.name, desc: "1 = " + fmt(goodValue(id), true) + " 🌰 (" + g.sell + " s de production)", badge: String(n), cost: n ? "+" + costTxt(v) : "—", st: st(n > 0), act: "sell:" + id });
    }
    if (goods.length) goods.push({ k: "g-all", icon: "🛒", title: "Tout vendre", desc: S.ranch.cart ? "La charrette vend automatiquement (" + (S.opts.autoSell ? "ON" : "OFF") + ")." : "Vends toutes tes marchandises au marché.", badge: "", cost: total ? "+" + costTxt(total) : "", st: st(total > 0), act: "sell:all" });
    else goods.push({ k: "g-none", type: "text", text: "<p>Pas encore de marchandises. Les animaux nourris produisent œufs, laine, lait…</p>" });
    var shop = D.RANCH_SHOP.map(function (d) {
      var lvl = S.ranch[d.id] || 0, mx = maxed(d, lvl), c = lvCost(d, lvl);
      return { k: "rs-" + d.id, icon: d.icon, title: d.name, desc: d.desc, badge: d.max > 1 ? lvl + "/" + d.max : (lvl ? "✔" : ""), cost: mx ? (d.max > 1 ? "MAX" : "Acheté") : costTxt(c), st: mx ? "done" : st(S.acorns >= c), act: "rshop:" + d.id };
    });
    if (S.ranch.cart) shop.push({ k: "rs-autosell", type: "chips", chips: [{ label: "🛒 Vente auto " + (S.opts.autoSell ? "ON" : "OFF"), act: "toggle:autoSell", on: S.opts.autoSell }] });
    var fedTxt = eat > 0 ? (S.fed > 0.98 ? "bien nourri 😊" : S.fed > 0.5 ? "a un peu faim 😐" : "a faim ! 😟") : "—";
    return [
      { id: "status", title: "Le troupeau", note: "Nourriture : <b>" + fmt(S.food, true) + "</b> 🥫 · consommation " + fmt(eat, true) + "/min · nourri à <b>" + Math.round(S.fed * 100) + " %</b> (" + fedTxt + ") · places " + used + "/" + C.stable + (season() === "hiver" ? " · ❄️ production ×2" : ""), items: animals },
      { id: "goods", title: "Marché", note: "Le prix suit ta production : vends quand tu produis beaucoup !", items: goods },
      { id: "rshop", title: "Bâtiments", note: null, items: shop }
    ];
  }
  /* ---------- onglet Racines (prestige 1) ---------- */
  function paneRoots() {
    var g = seedGain();
    var big = { k: "replant", icon: "🌱", title: "Replanter le chêne", big: true,
      desc: "Glands, habitants, améliorations et « Ta cueillette » repartent à zéro. Jardin, ferme, bétail et succès restent.",
      badge: "+" + fmt(g) + " 🌱", cost: g < 1 ? "Encore " + fmt(nextSeedAt()) + " 🌰" : "Prochaine : " + fmt(nextSeedAt()) + " 🌰", st: st(g >= 1), act: "replant" };
    var roots = D.ROOTS.map(function (d) {
      var lvl = R(d.id), mx = maxed(d, lvl), c = lvCost(d, lvl);
      return { k: "r-" + d.id, icon: d.icon, title: d.name, desc: d.desc, badge: d.max ? lvl + "/" + d.max : "niv. " + lvl, cost: mx ? "MAX" : costTxt(c, "🌱"), st: mx ? "done" : st(S.seeds >= c), act: "root:" + d.id };
    });
    return [
      { id: "rep", title: "Replanter", note: "Graines gagnées cette saison : <b>" + fmt(S.seedsSeason) + "</b> → <b>+" + pct(D.SEED_BONUS * S.seedsSeason) + "</b> à tout (même dépensées). Les graines totales de la saison valent (glands de la saison ÷ " + fmt(D.SEED_DIV) + ")<sup>" + String(D.SEED_POW).replace(".", ",") + "</sup>, soit 10 graines à " + fmt(Math.pow(10, 1 / D.SEED_POW) * D.SEED_DIV) + " glands.", items: [big] },
      { id: "roots", title: "Racines · " + fmt(S.seeds) + " 🌱 à dépenser", note: null, items: roots }
    ];
  }
  /* ---------- onglet Saisons (prestige 2) ---------- */
  function paneSeasons() {
    var g = essenceGain(), cur = D.SEASONS[S.season], nx = D.SEASONS[(S.season + 1) % 4];
    var big = { k: "season", icon: nx.icon, title: { printemps: "Passer au printemps", ete: "Passer à l'été", automne: "Passer à l'automne", hiver: "Passer à l'hiver" }[nx.id], big: true,
      desc: "Remet aussi à zéro les graines et les racines. Ensuite : " + nx.desc,
      badge: "+" + g + " 🍃", cost: g < 1 ? "Il faut " + D.SEASON_NEED + " graines" : "", st: st(g >= 1), act: "season" };
    var list = D.SEASONS.map(function (s, i) { return (i === S.season ? "<b>" : "") + s.icon + " " + s.name + " : " + s.desc + (i === S.season ? "</b> ← maintenant" : ""); }).join("<br>");
    var perks = D.PERKS.map(function (d) {
      var lvl = PK(d.id), mx = maxed(d, lvl), c = lvCost(d, lvl);
      return { k: "k-" + d.id, icon: d.icon, title: d.name, desc: d.desc, badge: d.max ? lvl + "/" + d.max : "niv. " + lvl, cost: mx ? "MAX" : costTxt(c, "🍃"), st: mx ? "done" : st(S.essence >= c), act: "perk:" + d.id };
    });
    var items = [];
    if (PK("autoreplant")) {
      items.push({ k: "ar", type: "chips", chips: [{ label: "🔁 Replantation auto " + (S.opts.autoReplant ? "ON" : "OFF"), act: "toggle:autoReplant", on: S.opts.autoReplant }]
        .concat([10, 25, 50, 100, 200].map(function (p) { return { label: "gain ≥ " + p + " %", act: "arpct:" + p, on: S.opts.arPct === p, title: "Replante quand le gain atteint " + p + " % des graines de la saison" }; })) });
    }
    return [
      { id: "now", title: cur.icon + " " + cur.name, note: "Essence gagnée : <b>" + S.essenceTotal + "</b> → production et clic <b>×" + fmt(1 + D.ESSENCE_BONUS * S.essenceTotal, true) + "</b>. Essence = √(graines de la saison ÷ " + D.SEASON_NEED + ").", items: [{ k: "slist", type: "text", text: "<p>" + list + "</p>" }, big] },
      { id: "perks", title: "Dons des saisons · " + S.essence + " 🍃", note: null, items: items.concat(perks) }
    ];
  }
  /* ---------- onglet Succès ---------- */
  function paneAch() {
    var n = achCount();
    return [{ id: "ach", title: n + " / " + ACH.length + " succès", note: "Chaque succès donne <b>+2 %</b> à tout (actuellement +" + n * 2 + " %).", grid: true,
      items: ACH.map(function (a) { var ok = !!S.ach[a.id]; return { k: a.id, icon: ok ? a.icon : "🔒", title: a.name, desc: a.desc, badge: ok ? "✔" : "", cost: "", st: ok ? "got" : "no", act: "" }; }) }];
  }
  /* ---------- onglet Options ---------- */
  function paneOpts() {
    var s = S.stats;
    var stats = [
      ["Temps de jeu", fmtTime(S.time)], ["Partie en cours", fmtTime(S.runTime)],
      ["Glands récoltés (total)", fmt(S.lifeTotal)], ["Glands cette partie", fmt(S.runTotal)],
      ["Clics à la main", fmt(s.clicks)], ["Clics du pic", fmt(s.autoClicks)], ["Critiques", fmt(s.crits)], ["Meilleur combo", s.bestCombo],
      ["Glands dorés", s.golden], ["Replantations", S.replants], ["Saisons", S.seasons], ["Graines (total)", fmt(S.seedsLife)],
      ["Fleurs cueillies", S.flowersHarvested], ["Récoltes", S.cropsHarvested], ["Marchandises vendues", fmt(s.sold)],
      ["Multiplicateur permanent", "×" + fmt(C.perm, true)], ["Hors ligne", fmtTime(C.offCap) + " max · " + Math.round(C.offEff * 100) + " %"]
    ].map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + r[1] + "</dd>"; }).join("");
    return [
      { id: "o", title: "Options", note: null, items: [
        { k: "ochips", type: "chips", chips: [
          { label: "✨ Effets " + (S.opts.fx ? "ON" : "OFF"), act: "toggle:fx", on: S.opts.fx },
          { label: "🔢 Nombres flottants " + (S.opts.nums ? "ON" : "OFF"), act: "toggle:nums", on: S.opts.nums }] },
        { k: "osave", icon: "💾", title: "Sauvegarder maintenant", desc: "Le jeu sauvegarde aussi tout seul toutes les 15 s (dans ce navigateur).", badge: "", cost: "", st: "ok", act: "save" },
        { k: "oexp", icon: "📤", title: "Exporter la sauvegarde", desc: "Copie un texte pour la garder ou changer d'appareil.", badge: "", cost: "", st: "ok", act: "export" },
        { k: "oimp", icon: "📥", title: "Importer une sauvegarde", desc: "Colle le texte exporté.", badge: "", cost: "", st: "ok", act: "import" },
        { k: "orst", icon: "🗑️", title: "Tout effacer", desc: "Recommence de zéro (définitif).", badge: "", cost: "", st: "danger", act: "reset" }
      ] },
      { id: "st", title: "Statistiques", note: null, items: [{ k: "stats", type: "text", text: "<dl class=\"idle-stats\">" + stats + "</dl><p class=\"ib-small\">Le Grand Chêne v" + VERSION + "</p>" }] }
    ];
  }
  var PANES = { forest: paneForest, upg: paneUpg, garden: paneGarden, farm: paneFarm, ranch: paneRanch, roots: paneRoots, seasons: paneSeasons, ach: paneAch, opts: paneOpts };

  function tabAlert(id) {
    if (id === "garden") return S.pots.some(function (p) { return p.f && p.g >= p.need; });
    if (id === "farm") return !S.farm.scare && S.fields.some(function (f) { return f.c && f.g >= f.need; });
    if (id === "upg") return UPG.some(function (u) { return upgVisible(u) && u.cost <= S.acorns; });
    if (id === "roots") return seedGain() >= Math.max(1, S.seedsSeason);
    if (id === "seasons") return essenceGain() >= 1;
    return false;
  }
  function renderTabs() {
    if (tabsDirty) {
      tabsDirty = false;
      tabsEl.innerHTML = "";
      TABS.forEach(function (t) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "idle-tab"; b.dataset.tab = t.id;
        b.setAttribute("role", "tab");
        b.innerHTML = '<span class="ti">' + (S.unl[t.id] ? t.icon : "🔒") + '</span><span class="tn">' + esc(S.unl[t.id] ? t.name : "???") + "</span><i class=\"dot\"></i>";
        if (!S.unl[t.id]) { b.classList.add("lock"); b.title = t.hint || ""; }
        tabsEl.appendChild(b);
      });
    }
    $$(".idle-tab", tabsEl).forEach(function (b) {
      var on = b.dataset.tab === S.tab;
      b.classList.toggle("on", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
      b.classList.toggle("alert", !!S.unl[b.dataset.tab] && !on && tabAlert(b.dataset.tab));
    });
  }
  function renderPane() {
    if (!S.unl[S.tab]) S.tab = "forest";
    Object.keys(panes).forEach(function (k) { panes[k].hidden = k !== S.tab; });
    if (!panes[S.tab]) {
      var p = document.createElement("div"); p.className = "idle-pane"; p.dataset.pane = S.tab;
      bodyEl.appendChild(p); panes[S.tab] = p;
    }
    sync(panes[S.tab], PANES[S.tab]());
  }

  /* ---------- actions ---------- */
  function act(a) {
    var i = a.indexOf(":"), t = i < 0 ? a : a.slice(0, i), v = i < 0 ? "" : a.slice(i + 1);
    switch (t) {
      case "amt": S.opts.buyAmt = v === "max" ? "max" : +v; break;
      case "prod": buyProd(+v, S.opts.buyAmt); break;
      case "lv": buyLevel(v); break;
      case "upg": buyUpg(v); break;
      case "seed": S.garden.sel = v; break;
      case "pot": potAction(+v); break;
      case "pots":
        S.pots.slice(0, C.pots).forEach(function (p, j) { if (p.f && p.g >= p.need) harvestPot(j); });
        S.pots.slice(0, C.pots).forEach(function (p, j) { if (!p.f) plantPot(j); });
        break;
      case "gshop": {
        var gd = D.GARDEN_SHOP.filter(function (d) { return d.id === v; })[0], gl = S.garden[v] || 0;
        if (gd && !maxed(gd, gl) && S.petals >= lvCost(gd, gl)) { S.petals -= lvCost(gd, gl); S.garden[v] = gl + 1; }
        break;
      }
      case "crop": S.farm.sel = v; break;
      case "field": fieldAction(+v); break;
      case "fields": S.fields.slice(0, C.fields).forEach(function (f, j) { if (f.c && f.g >= f.need) harvestField(j); if (!f.c) plantField(j); }); break;
      case "fshop": {
        var fd = D.FARM_SHOP.filter(function (d) { return d.id === v; })[0], fv = S.farm[v] || 0;
        if (fd && !maxed(fd, fv) && spend(lvCost(fd, fv))) S.farm[v] = fv + 1;
        break;
      }
      case "animal": buyAnimal(v); break;
      case "sell": if (v === "all") sellAll(); else { var got = sellGood(v); if (got) toast("🛒 Vendu", "+" + fmt(got) + " 🌰"); } break;
      case "rshop": {
        var rd = D.RANCH_SHOP.filter(function (d) { return d.id === v; })[0], rv = S.ranch[v] || 0;
        if (rd && !maxed(rd, rv) && spend(lvCost(rd, rv))) S.ranch[v] = rv + 1;
        break;
      }
      case "replant":
        if (seedGain() < 1) break;
        modal("Replanter le chêne ?", "<p>Tu gagnes <b>+" + fmt(seedGain()) + " graines 🌱</b> (+" + pct(D.SEED_BONUS * seedGain()) + " à tout).</p><p>Glands, habitants, améliorations" + (R("memoire") ? "" : " et « Ta cueillette »") + " repartent à zéro. Le jardin, la ferme, le bétail et les succès restent.</p>",
          [{ label: "🌱 Replanter", cls: "btn-alt", fn: function () { replant(false); } }, { label: "Annuler" }]);
        break;
      case "root": {
        var dd = D.ROOTS.filter(function (d) { return d.id === v; })[0], rl = R(v);
        if (dd && !maxed(dd, rl) && S.seeds >= lvCost(dd, rl)) {
          S.seeds -= lvCost(dd, rl); S.roots[v] = rl + 1;
          if (v === "pivert") S.lv.auto = Math.min(20, Math.max(L("auto"), 2 * R("pivert")));
        }
        break;
      }
      case "season":
        if (essenceGain() < 1) break;
        modal("Changer de saison ?", "<p>Tu gagnes <b>+" + essenceGain() + " essence 🍃</b> (+" + Math.round(D.ESSENCE_BONUS * essenceGain() * 100) + " % à tout, pour toujours).</p><p>Tes graines" + (PK("memroots") ? "" : ", tes racines") + " et toute la partie repartent à zéro (les graines en attente sont comptées). Jardin, ferme, bétail, succès et dons restent.</p>",
          [{ label: "🍂 Changer de saison", cls: "btn-alt", fn: changeSeason }, { label: "Annuler" }]);
        break;
      case "perk": {
        var pd = D.PERKS.filter(function (d) { return d.id === v; })[0], pl = PK(v);
        if (pd && !maxed(pd, pl) && S.essence >= lvCost(pd, pl)) { S.essence -= lvCost(pd, pl); S.perks[v] = pl + 1; }
        break;
      }
      case "arpct": S.opts.arPct = +v; break;
      case "toggle": S.opts[v] = !S.opts[v]; break;
      case "save": save(); toast("💾 Sauvegardé", "Dans ce navigateur."); break;
      case "export": {
        var txt = exportSave();
        var ov = modal("Exporter", '<p>Garde ce texte précieusement :</p><textarea class="idle-ta" readonly></textarea>',
          [{ label: "📋 Copier", cls: "btn-alt", fn: function (o) { var ta = $(".idle-ta", o); ta.select(); try { navigator.clipboard.writeText(txt); } catch (e) { document.execCommand("copy"); } toast("📋 Copié", ""); return false; } }, { label: "Fermer" }]);
        $(".idle-ta", ov).value = txt;
        break;
      }
      case "import":
        modal("Importer", '<p>Colle ta sauvegarde exportée (elle remplace la partie en cours) :</p><textarea class="idle-ta"></textarea>',
          [{ label: "📥 Importer", cls: "btn-alt", fn: function (o) { return importSave($(".idle-ta", o).value); } }, { label: "Annuler" }]);
        break;
      case "reset":
        modal("Tout effacer ?", "<p>Toute ta progression sera perdue. Pense à exporter ta sauvegarde avant.</p>",
          [{ label: "🗑️ Oui, tout effacer", cls: "", fn: function () { S = fresh(); tabKeys = {}; tabsDirty = true; calc(); save(); toast("🌰 Nouvelle partie", "Bonne cueillette !"); } }, { label: "Annuler" }]);
        break;
    }
    calc();
    render();
  }

  bodyEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]");
    if (!b || !bodyEl.contains(b) || !b.dataset.act) return;
    act(b.dataset.act);
  });
  tabsEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-tab]");
    if (!b) return;
    var t = TABS.filter(function (x) { return x.id === b.dataset.tab; })[0];
    if (!S.unl[t.id]) { toast("🔒 Pas encore", t.hint || ""); return; }
    S.tab = t.id;
    render();
  });

  /* ---------- haut de l'écran ---------- */
  var R_ = {};
  $$("[data-r]").forEach(function (el) { R_[el.dataset.r] = el; });
  var buffsEl = $("[data-buffs]");
  function renderTop() {
    setText(R_.acorns, fmt(S.acorns));
    setText(R_.cps, fmt(C.cps, true));
    setText(R_.click, fmt(C.click, true));
    var mult = 1 + C.comboStep * Math.floor(combo);
    setText(R_.combo, "Combo " + Math.floor(combo) + " · ×" + fmt(mult, true));
    R_.combobar.style.width = (combo / C.comboMax * 100).toFixed(1) + "%";
    R_.combowrap.classList.toggle("hot", combo >= C.comboMax - 0.01 && combo > 0);
    var mini = [];
    if (S.unl.roots) mini.push("🌱 " + fmt(S.seeds));
    if (S.essenceTotal) mini.push("🍃 " + fmt(S.essence));
    if (S.unl.garden) mini.push("🌸 " + fmt(S.petals));
    if (S.unl.farm) mini.push("🥫 " + fmt(S.food));
    setText(R_.mini, mini.join("   "));
    var se = D.SEASONS[S.season];
    setText(R_.season, se.icon + " " + se.name);
    var bl = [];
    for (var b in S.buffs) { var d = D.BUFFS[b]; if (d) bl.push('<span class="idle-buff">' + d.icon + " " + esc(d.name) + " · " + fmtTime(S.buffs[b]) + "</span>"); }
    setHTML(buffsEl, bl.join(""));
  }
  function render() { renderTop(); renderTabs(); renderPane(); }

  /* =====================================================================
     le chêne (canvas pixel)
     ===================================================================== */
  var treeBox = $("[data-tree]"), cv = $("canvas", treeBox), cx = cv.getContext("2d");
  var VW = 128, VH = 132, GROUND = 118;
  var trunkBuf = document.createElement("canvas"), crownBuf = document.createElement("canvas");
  trunkBuf.width = crownBuf.width = VW; trunkBuf.height = crownBuf.height = VH;
  var PAL = {
    printemps: { o: "#2c4a22", d: "#4f8a3a", m: "#79b850", l: "#a9dc72", g1: "#5b9a3e", g2: "#7fbf52" },
    ete:       { o: "#1c3519", d: "#3a6a2c", m: "#5a983b", l: "#8cc45a", g1: "#4d8a34", g2: "#6aa845" },
    automne:   { o: "#4f2410", d: "#b04e1e", m: "#e2803a", l: "#f6c453", g1: "#8a8a3a", g2: "#a6a24a" },
    hiver:     { o: "#26362f", d: "#45644f", m: "#678a72", l: "#93b29b", g1: "#dfe8ee", g2: "#f4f8fb" }
  };
  var BLOBS = [[0, -10, 24], [-22, 0, 17], [22, 0, 17], [-12, -24, 16], [13, -23, 16], [0, 6, 18], [-32, -10, 11], [32, -10, 11], [-26, 12, 11], [26, 12, 11], [0, -32, 13]];
  var treeGeo = null;
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function disc(c, x, y, r, col) {
    c.fillStyle = col;
    for (var dy = -r; dy <= r; dy++) { var w = Math.floor(Math.sqrt(r * r - dy * dy) + 0.35); c.fillRect(Math.round(x - w), Math.round(y + dy), w * 2 + 1, 1); }
  }
  function stage() { var r = S.runTotal; return r < 200 ? 0 : r < 2e4 ? 1 : r < 2e6 ? 2 : r < 2e8 ? 3 : r < 2e10 ? 4 : 5; }
  var builtFor = "";
  function buildTree() {
    var stg = stage(), se = season(), key = stg + se;
    if (!treeDirty && key === builtFor) return;
    treeDirty = false; builtFor = key;
    var P = PAL[se], s = 0.6 + 0.08 * stg;
    var t = trunkBuf.getContext("2d"), c = crownBuf.getContext("2d");
    t.clearRect(0, 0, VW, VH); c.clearRect(0, 0, VW, VH);
    var tw = Math.round(7 + 7 * s), th = Math.round(38 * s) + 8, tx = Math.round(VW / 2 - tw / 2), top = GROUND - th;
    // racines
    t.fillStyle = "#4a2e1c";
    t.fillRect(tx - 4, GROUND - 4, tw + 8, 5); t.fillRect(tx - 2, GROUND - 7, tw + 4, 4);
    t.fillStyle = "#7a4a2a";
    t.fillRect(tx - 3, GROUND - 3, tw + 6, 3); t.fillRect(tx - 1, GROUND - 6, tw + 2, 3);
    // tronc
    t.fillStyle = "#4a2e1c"; t.fillRect(tx - 1, top, tw + 2, th);
    t.fillStyle = "#7a4a2a"; t.fillRect(tx, top, tw, th - 1);
    t.fillStyle = "#9a6438"; t.fillRect(tx + 1, top, 2, th - 4);
    t.fillStyle = "#5c3720"; t.fillRect(tx + tw - 3, top, 2, th - 2);
    t.fillRect(tx + Math.round(tw / 2), top + Math.round(th * 0.55), 2, 3);
    t.fillRect(tx + 3, top + Math.round(th * 0.3), 1, 4);
    // branches
    t.fillStyle = "#5c3720";
    for (var b = 0; b < 8; b++) { t.fillRect(tx - b * 2, top + 4 - b, 3, 2); t.fillRect(tx + tw - 3 + b * 2, top + 3 - b, 3, 2); }
    // couronne
    var ccx = VW / 2, ccy = top - Math.round(12 * s);
    var bl = BLOBS.map(function (q) { return [ccx + q[0] * s, ccy + q[1] * s, Math.max(3, Math.round(q[2] * s))]; });
    bl.forEach(function (q) { disc(c, q[0], q[1], q[2] + 1, P.o); });
    bl.forEach(function (q) { disc(c, q[0], q[1], q[2], P.d); });
    bl.forEach(function (q) { disc(c, q[0] - 1, q[1] - 2, Math.max(2, q[2] - 3), P.m); });
    if (se === "hiver") bl.forEach(function (q) {
      c.fillStyle = "#f4f8fb";
      for (var dy = -q[2]; dy < -q[2] * 0.45; dy++) { var w = Math.floor(Math.sqrt(q[2] * q[2] - dy * dy)); c.fillRect(Math.round(q[0] - w), Math.round(q[1] + dy), w * 2 + 1, 1); }
    });
    bl.forEach(function (q) { disc(c, q[0] - 3, q[1] - 5, Math.max(1, Math.round(q[2] * 0.4)), P.l); });
    var r = rng(7 + stg);
    var deco = 8 + stg * 5;
    for (var k = 0; k < deco; k++) {
      var q = bl[Math.floor(r() * bl.length)], a = r() * 6.283, d = r() * q[2] * 0.85;
      var x = Math.round(q[0] + Math.cos(a) * d), y = Math.round(q[1] + Math.sin(a) * d);
      if (se === "printemps") { c.fillStyle = "#f6a9c8"; c.fillRect(x, y, 2, 2); c.fillStyle = "#fff0f6"; c.fillRect(x, y, 1, 1); }
      else if (se === "automne" && r() < 0.5) { c.fillStyle = "#c8553d"; c.fillRect(x, y, 2, 2); }
    }
    // glands accrochés
    var nAc = 3 + stg * 2;
    for (k = 0; k < nAc; k++) {
      var qq = bl[1 + Math.floor(r() * (bl.length - 1))];
      var ax = Math.round(qq[0] + (r() - 0.5) * qq[2] * 1.4), ay = Math.round(qq[1] + qq[2] * (0.25 + r() * 0.5));
      c.fillStyle = "#4a2e1c"; c.fillRect(ax + 1, ay - 1, 1, 1);
      c.fillStyle = "#6b4426"; c.fillRect(ax, ay, 3, 1);
      c.fillStyle = "#d39445"; c.fillRect(ax, ay + 1, 3, 1); c.fillRect(ax + 1, ay + 2, 1, 1);
      c.fillStyle = "#a8682c"; c.fillRect(ax + 2, ay + 1, 1, 1);
    }
    // perchoirs pour les écureuils (bords des blobs)
    treeGeo = { s: s, tx: tx, tw: tw, top: top, perches: [bl[1], bl[2], bl[3], bl[4], bl[8], bl[9], bl[6], bl[7]].map(function (q) { return [Math.round(q[0]), Math.round(q[1] - q[2] + 1)]; }) };
  }
  var SQ = [".ooo....o...", "oTTTo..oBo..", "oTtTTo.oBBo.", "oTttTooBBeBo", ".oTtToBBBBBn", "..oTToBLBBo.", "..oToBBLLBo.", "...ooBBLLBo.", "....oBBBBBo.", ".....oo.oo.."];
  var PECK = [".rr...", "rkkr..", "kkwkyy", ".kkk..", ".kwk..", ".kkk..", "..k..."];
  var SQC = { o: "#3a2618", T: "#c46b2a", t: "#e8a35a", B: "#c96f2c", L: "#f2d0a0", e: "#1a0f08", n: "#3a2618" }, PKC = { r: "#d8443a", k: "#2b2b3a", w: "#f4f1e8", y: "#f6c453" };
  function sprite(c, rows, pal, x, y, sc, flip) {
    for (var j = 0; j < rows.length; j++) for (var i = 0; i < rows[j].length; i++) {
      var ch = rows[j][flip ? rows[j].length - 1 - i : i];
      if (ch === "." || !pal[ch]) continue;
      c.fillStyle = pal[ch]; c.fillRect(x + i * sc, y + j * sc, sc, sc);
    }
  }
  var parts = [];
  var dpr = 1, cw = 0, ch = 0;
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    var r = treeBox.getBoundingClientRect();
    cw = Math.max(1, Math.round(r.width * dpr)); ch = Math.max(1, Math.round(r.height * dpr));
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
  }
  function view() {
    var sc = Math.min(cw / VW, ch / VH);
    var ox = Math.round((cw - VW * sc) / 2), oy = Math.round(ch - VH * sc);
    return { sc: sc, ox: ox, oy: oy };
  }
  function toCanvas(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr]; }
  function leaf(x, y, n) {
    if (parts.length > 220) return;
    var v = view(), P = PAL[season()];
    for (var i = 0; i < n; i++) {
      var lx = x != null ? x : v.ox + (VW / 2 + (Math.random() - 0.5) * 70 * (treeGeo ? treeGeo.s : 1)) * v.sc;
      var ly = y != null ? y : v.oy + (treeGeo ? treeGeo.top - 20 : 50) * v.sc;
      parts.push({ t: "leaf", x: lx, y: ly, vx: (Math.random() - 0.5) * 120 * dpr, vy: -Math.random() * 120 * dpr, life: 1.6 + Math.random(), age: 0,
        col: [P.m, P.l, P.d][i % 3], sz: Math.max(2, Math.round(v.sc * 1.5)), ph: Math.random() * 6 });
    }
  }
  function acornPop(x, y) {
    if (parts.length > 220) return;
    parts.push({ t: "acorn", x: x, y: y, vx: (Math.random() - 0.5) * 160 * dpr, vy: -(220 + Math.random() * 120) * dpr, life: 0.9, age: 0, sz: Math.max(2, Math.round(view().sc)) });
  }
  function floatText(x, y, txt, crit) {
    var n = 0; for (var i = 0; i < parts.length; i++) if (parts[i].t === "text") n++;
    if (n > 30) return;
    parts.push({ t: "text", x: x + (Math.random() - 0.5) * 20 * dpr, y: y - 10 * dpr, vx: 0, vy: -70 * dpr, life: crit ? 1.3 : 0.9, age: 0, txt: crit ? txt + " CRIT !" : txt, crit: crit });
  }
  var FLOWER_COL = { paquerette: "#fdf3de", tulipe: "#e0544b", tournesol: "#f6c453", rose: "#c8303a", lotus: "#f2a7c8", lune: "#b9c8ff" };
  function drawPots(v, t) {
    if (!S.unl.garden) return;
    var sc = v.sc, n = Math.min(4, C.pots);
    for (var i = 0; i < n; i++) {
      var pot = S.pots[i], x = 14 + i * 9, y = GROUND - 5;
      if (x > treeGeo.tx - 12) break;
      var X = function (q) { return v.ox + q * sc; }, Y = function (q) { return v.oy + q * sc; };
      cx.fillStyle = "#4a2e1c"; cx.fillRect(X(x - 1), Y(y - 1), 7 * sc, 6 * sc);
      cx.fillStyle = "#c8653a"; cx.fillRect(X(x), Y(y), 5 * sc, 4 * sc);
      cx.fillStyle = "#e08a5a"; cx.fillRect(X(x), Y(y), 5 * sc, sc);
      if (!pot || !pot.f) continue;
      var p = pot.g / pot.need, h = 1 + Math.floor(p * 5);
      cx.fillStyle = "#3f7a2e"; cx.fillRect(X(x + 2), Y(y - h), sc, h * sc);
      if (p > 0.4) { cx.fillRect(X(x + 1), Y(y - Math.ceil(h / 2)), sc, sc); cx.fillRect(X(x + 3), Y(y - Math.ceil(h / 2) - 1), sc, sc); }
      if (p >= 1) {
        var bob = Math.round(Math.sin(t * 3 + i) * 0.5);
        cx.fillStyle = FLOWER_COL[pot.f] || "#f6a9c8";
        cx.fillRect(X(x + 1), Y(y - h - 2 + bob), 3 * sc, 3 * sc);
        cx.fillStyle = "#f6c453"; cx.fillRect(X(x + 2), Y(y - h - 1 + bob), sc, sc);
      }
    }
  }
  var ACORN = ["oooo", "oddo", "obbo", "obbo", ".oo."], ACC = { o: "#3a2618", d: "#6b4426", b: "#d39445" };
  var lastT = performance.now(), simAcc = 0;
  function frame(now) {
    var dt = Math.min(0.25, (now - lastT) / 1000); lastT = now;
    draw(dt, now / 1000);
    requestAnimationFrame(frame);
  }
  function draw(dt, t) {
    resize();
    buildTree();
    var v = view(), sc = v.sc, P = PAL[season()];
    cx.imageSmoothingEnabled = false;
    cx.clearRect(0, 0, cw, ch);
    // sol
    var gy = v.oy + GROUND * sc;
    cx.fillStyle = P.g1; cx.fillRect(0, gy - sc * 2, cw, ch - gy + sc * 2);
    cx.fillStyle = P.g2; cx.fillRect(0, gy - sc * 2, cw, sc * 2);
    cx.fillStyle = "rgba(0,0,0,.18)";
    cx.fillRect(v.ox + (VW / 2 - 30) * sc, gy, 60 * sc, sc * 2);
    // arbre
    shake = Math.max(0, shake - dt * 3);
    var sx = Math.round(Math.sin(t * 46) * shake * 1.6) * sc;
    var sway = Math.round(Math.sin(t * 0.9) * 0.6) * sc;
    cx.drawImage(trunkBuf, v.ox, v.oy, VW * sc, VH * sc);
    cx.drawImage(crownBuf, v.ox + sx + sway, v.oy + Math.round(shake) * sc, VW * sc, VH * sc);
    // écureuils perchés
    if (treeGeo) {
      var nSq = Math.min(treeGeo.perches.length, S.prod[0] > 0 ? Math.ceil(Math.sqrt(S.prod[0])) : 0);
      for (var i = 0; i < nSq; i++) {
        var pp = treeGeo.perches[i], bob = Math.round(Math.sin(t * 3 + i * 1.7) * 0.6);
        sprite(cx, SQ, SQC, v.ox + sx + sway + (pp[0] - 6) * sc, v.oy + (pp[1] - 9 + bob) * sc, sc, i % 2 === 1);
      }
      drawPots(v, t);
      if (L("auto") > 0) {
        peckT = Math.max(0, peckT - dt);
        var px = treeGeo.tx - 6 + (peckT > 0 ? 1 : 0), py = GROUND - 26;
        sprite(cx, PECK, PKC, v.ox + px * sc, v.oy + py * sc, sc, false);
      }
    }
    // particules
    for (var k = parts.length - 1; k >= 0; k--) {
      var p = parts[k];
      p.age += dt;
      if (p.age >= p.life) { parts.splice(k, 1); continue; }
      var a = 1 - p.age / p.life;
      if (p.t === "leaf") {
        p.vy += 160 * dpr * dt; p.vy = Math.min(p.vy, 60 * dpr); p.vx *= 0.97;
        p.x += (p.vx + Math.sin(t * 4 + p.ph) * 30 * dpr) * dt; p.y += p.vy * dt;
        cx.globalAlpha = Math.min(1, a * 2); cx.fillStyle = p.col; cx.fillRect(Math.round(p.x), Math.round(p.y), p.sz, p.sz);
      } else if (p.t === "acorn") {
        p.vy += 700 * dpr * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        cx.globalAlpha = Math.min(1, a * 3);
        sprite(cx, ACORN, ACC, Math.round(p.x), Math.round(p.y), p.sz, false);
      } else {
        p.y += p.vy * dt; p.vy *= 0.96;
        cx.globalAlpha = Math.min(1, a * 2.5);
        cx.font = "900 " + Math.round((p.crit ? 22 : 16) * dpr) + "px Nunito, system-ui, sans-serif";
        cx.textAlign = "center"; cx.lineJoin = "round";
        cx.lineWidth = 4 * dpr; cx.strokeStyle = "#2b1709"; cx.strokeText(p.txt, p.x, p.y);
        cx.fillStyle = p.crit ? "#f6d36b" : "#fdf3de"; cx.fillText(p.txt, p.x, p.y);
      }
    }
    cx.globalAlpha = 1;
    // gland doré
    if (golden) {
      golden.t += dt;
      var gr = treeBox.getBoundingClientRect();
      var gxp = (golden.x + Math.sin(golden.t * 1.6 + golden.ph) * 0.05) * gr.width;
      var gyp = (0.05 + 0.8 * golden.t / golden.life) * gr.height;
      golden.el.style.transform = "translate(" + Math.round(gxp) + "px," + Math.round(gyp) + "px) rotate(" + Math.round(Math.sin(golden.t * 3) * 15) + "deg)";
      if (golden.t >= golden.life) endGolden();
    }
  }

  // clic sur l'arbre (multi-touch : chaque doigt compte)
  treeBox.addEventListener("pointerdown", function (e) {
    if (e.button !== undefined && e.button > 0) return;
    if (e.target.closest(".idle-golden")) return;
    e.preventDefault();
    var p = toCanvas(e);
    playerClick(p[0], p[1]);
  });
  treeBox.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  treeBox.addEventListener("keydown", function (e) {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (e.repeat) return;
      var v = view();
      playerClick(v.ox + VW / 2 * v.sc, v.oy + 45 * v.sc);
    }
  });

  /* =====================================================================
     démarrage
     ===================================================================== */
  var loaded = load();
  calc();
  if (loaded) offline((Date.now() - S.last) / 1000);
  checkUnlocks();
  tabsDirty = true;
  render();
  var last = performance.now();
  setInterval(function () {
    var now = performance.now(), dt = (now - last) / 1000; last = now;
    if (dt > 60) { offline(dt); return; }
    // onglet en arrière-plan : on simule par petits pas
    while (dt > 0) { var st2 = Math.min(dt, 1); tick(st2); dt -= st2; }
  }, 100);
  setInterval(function () { if (!document.hidden) render(); }, 200);
  requestAnimationFrame(frame);
  document.addEventListener("visibilitychange", function () { if (document.hidden) save(); });
  window.addEventListener("pagehide", save);
  window.addEventListener("beforeunload", save);
  if (!loaded) toast("🌳 Le Grand Chêne", "Tape sur l'arbre pour récolter tes premiers glands !");

  if (/[?&]debug\b/.test(location.search)) {
    window.IDLE_DEBUG = { get S() { return S; }, C: C, act: act, UPG: UPG, seedGain: seedGain, essenceGain: essenceGain, click: function () { playerClick(10, 10); }, calc: calc, earn: function (x) { earn(x); render(); }, tick: tick, offline: offline, save: save,
      skip: function (sec) { var n = Math.ceil(sec); for (var i = 0; i < n; i++) tick(1); render(); } };
  }
})();
