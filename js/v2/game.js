/* =========================================================================
   Écureuil Survivor — moteur, menus et progression.
   Le contenu (écureuils, armes, fusions, objets, cartes, boutique, succès,
   sprites) est dans js/game-data.js. Sauvegarde : localStorage « es-save-v1 ».
   ========================================================================= */
(function () {
  "use strict";

  var stage = document.querySelector("[data-game]");
  var D = window.ES_DATA;
  if (!stage || !D) return;
  var canvas = stage.querySelector(".game-canvas");
  var ctx = canvas.getContext("2d");
  var $ = function (s) { return stage.querySelector(s); };
  var card = $("[data-card]"), overlay = $("[data-overlay]");
  var GAME_ID = "ecureuil-survivor", GAME_ID_ARENA = "ecureuil-arene", GAME_ID_DUNGEON = "ecureuil-donjon";
  var DG = D.DUNGEON, DGT = D.DUNGEONS[0];
  function dungeonById(id) { return D.DUNGEONS.filter(function (d) { return d.id === id; })[0] || D.DUNGEONS[0]; }
  var A = D.ARENA;
  var VERSION = "2.1.5";
  var TAU = Math.PI * 2;
  var MAX_W = 6, MAX_P = 6, MAX_LVL = 5;
  var SAFE_R = 46;   // rayon de la zone sûre autour d'un joueur qui choisit (coop)

  // armes de base + fusions dans un seul catalogue
  var ALLW = {};
  Object.keys(D.WEAPONS).forEach(function (k) { ALLW[k] = D.WEAPONS[k]; });
  Object.keys(D.FUSIONS).forEach(function (k) { ALLW[k] = D.FUSIONS[k]; ALLW[k].fusion = true; ALLW[k].legend = D.FUSIONS[k].tier === 2; });

  /* =====================================================================
     Sauvegarde
     ===================================================================== */
  var SAVE_KEY = "es2-save-v1";
  function defaults() {
    return { gold: 0, shop: {}, ach: {}, quests: {}, owned: { noisette: true }, rank: 1, rankXp: 0, tree: {}, prestige: 0, ppts: 0, pshop: {}, char: "noisette", map: "clairiere", diff: "normal", name: "",
             opts: { sound: true, shake: true, numbers: true },
             mode: "survie", posture: {}, eq: { inv: [], worn: {}, uid: 1 }, res: {}, clvl: {}, tal: {}, mast: {}, contracts: { offers: [], taken: [] }, cauch: {}, cn: 0, mega: {}, secureSlots: 0, eqSlot: "coiffe", v2: 0, news: 0, recipes: {}, chestSize: 0, stats: { kills: 0, goldEarned: 0, goldSince: 0, runs: 0, bestTime: 0, bestScore: 0, bosses: 0, played: {}, maps: {}, bought: 0 } };
  }
  function load() {
    var s = defaults(), raw = null;
    try { raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch (e) {}
    if (raw && typeof raw === "object") {
      Object.keys(s).forEach(function (k) {
        if (raw[k] === undefined || raw[k] === null) return;
        if (s[k] && typeof s[k] === "object" && !Array.isArray(s[k])) s[k] = Object.assign(s[k], raw[k]);
        else s[k] = raw[k];
      });
      s.stats.played = s.stats.played || {}; s.stats.maps = s.stats.maps || {};
      if (!raw.stats || raw.stats.goldSince === undefined) s.stats.goldSince = s.stats.goldEarned || 0;
      s.tree = s.tree || {}; s.pshop = s.pshop || {}; s.ppts = s.ppts || 0;
    }
    return s;
  }
  var S = load();
  /* ---- 2.0 phase 7 : migration d'une sauvegarde de la version 1 (aucune remise à zéro) ---- */
  var MIGRATED = null;
  function migrateV1() {
    if (S.v2) return;
    var src = null;
    if ((S.stats && S.stats.runs) || S.rank > 1 || S.gold > 0) src = S;                       // données de la v1 arrivées par la sauvegarde en ligne
    else { try { var raw = JSON.parse(localStorage.getItem("es-save-v1") || "null"); if (raw && typeof raw === "object") { var keep = S; S = load.call(null); Object.keys(raw).forEach(function (k) { if (k in S) S[k] = raw[k]; }); src = S; } } catch (e) {} }
    S.v2 = 1;
    if (!src) { save(); return; }
    var refund = 0, k, l;
    (D.SHOP || []).forEach(function (it) { for (l = 0; l < ((S.shop || {})[it.id] || 0); l++) refund += Math.round(it.cost * (1 + l) * (1 + l * 0.25)); });
    var pts = 0; Object.keys(S.tree || {}).forEach(function (id) { var sk = (D.SKILLS || []).filter(function (q) { return q.id === id; })[0]; if (sk) pts += (S.tree[id] || 0) * sk.cost; });
    refund += pts * 150 + Math.round((S.ppts || 0) * 2);
    var retired = ["charbon", "flocon", "chevalier", "bucheron"].filter(function (c) { return (S.owned || {})[c]; });
    refund += retired.length * 500;
    var cap = Math.max(0, ((S.stats && S.stats.goldEarned) || 0) + 20000 - S.gold);
    refund = Math.min(refund, cap);
    S.gold += refund;
    S.res = S.res || {}; var pr = S.prestige || 0;
    if (pr) ["herbe", "ecorce", "chapeau"].forEach(function (r0) { S.res[r0] = (S.res[r0] || 0) + 10 * pr; });
    if (pr) S.res.rune = (S.res.rune || 0) + 2 * pr;
    // écureuils déjà débloqués en v1 : leur quête de 2.0 est donnée
    var map = { cendrine: "q2_cendrine", jumeaux: "q2_jumeaux", druide: "q2_fougere", mage: "q2_mage", ninja: "q2_ninja" };
    S.quests = S.quests || {};
    Object.keys(map).forEach(function (c) { if ((S.owned || {})[c] || (S.stats && S.stats.played && S.stats.played[c])) S.quests[map[c]] = Date.now(); });
    // on garde rang, succès, quêtes, records ; les stats achetées, l'arbre et les points de prestige sont remboursés
    S.shop = {}; S.tree = {}; S.pshop = {}; S.ppts = 0;
    if (D.CHARACTERS.every(function (c) { return c.id !== S.char; })) S.char = "noisette";
    MIGRATED = { refund: refund, retired: retired, prestige: pr };
    S.news = 1; save();
  }
  migrateV1();
  var MAX_PLAYERS = 6;
  var ACTIONS_LATE = {};
  var Net = { peers: {}, hostId: null, on: false, role: null, id: Math.random().toString(36).slice(2, 10), code: null, client: null, ch: null, status: "",
              roster: [], ev: [], dmgN: 0, acc: 0, inAcc: 0, cur: null, prev: null, lastLevel: 1, started: false, err: "" };
  function netEv(ev) { if (Net.on && Net.role === "host" && Net.started && Net.ev.length < 120) Net.ev.push(ev); }
  function netSend(ev, payload) { if (Net.ch) { try { Net.ch.send({ type: "broadcast", event: ev, payload: payload }); } catch (e) {} } }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }

  function earnGold(n) { S.gold += n; S.stats.goldEarned += n; S.stats.goldSince = (S.stats.goldSince || 0) + n; }
  function skillById(id) { return D.SKILLS.filter(function (k) { return k.id === id; })[0]; }
  function spentPoints() { var t = 0; Object.keys(S.tree).forEach(function (id) { var k = skillById(id); if (k) t += (S.tree[id] || 0) * k.cost; }); return t; }
  function pu(id) { return (S.pshop || {})[id] || 0; }
  function totalPoints() { return (S.rank - 1) + 2 * pu("points"); }
  function freePoints() { return totalPoints() - spentPoints(); }
  function skillOpen(k) { return (!k.prestige || S.prestige >= k.prestige) && (k.req || []).every(function (id) { return (S.tree[id] || 0) > 0; }); }
  // progression = niveaux de boutique + niveaux de l'arbre (hors compétences d'un prestige pas encore atteint)
  function progressParts() {
    var have = 0, max = 0;
    D.SHOP.forEach(function (it) { have += Math.min(it.max, S.shop[it.id] || 0); max += it.max; });
    D.SKILLS.forEach(function (k) { if (k.prestige && S.prestige < k.prestige) return; have += Math.min(k.max, S.tree[k.id] || 0); max += k.max; });
    return { have: have, max: max, frac: max ? have / max : 0 };
  }
  function prestigeReq() { var P = D.PRESTIGE; return Math.min(P.reqMax, P.reqBase + P.reqStep * S.prestige); }
  function prestigeCost() { var P = D.PRESTIGE; return Math.round(P.costBase * Math.pow(P.costGrowth, S.prestige) / 100) * 100; }
  function prestigeGain() { return Math.floor(D.PRESTIGE.fullPoints * progressParts().frac * (1 + 0.25 * pu("multi"))); }
  function prestigeReady() { return progressParts().frac >= prestigeReq() - 1e-9 && S.gold >= prestigeCost(); }
  function pupCost(it, lvl) { var c = it.costs || D.PRESTIGE.upCosts; return c[Math.min(lvl, c.length - 1)] * (lvl >= c.length ? Math.pow(2, lvl - c.length + 1) : 1); }
  function stars(n) { return n > 0 ? (n > 5 ? "★×" + n : new Array(n + 1).join("★")) : ""; }
  function has(ach) { return !ach || !!S.ach[ach]; }
  function charById(id) { return D.CHARACTERS.filter(function (c) { return c.id === id; })[0] || D.CHARACTERS[0]; }
  function mapById(id) { return D.MAPS.filter(function (m) { return m.id === id; })[0] || D.MAPS[0]; }
  function questOk(def) { return !def || !def.quest || !!(S.quests && S.quests[def.quest]); }
  function charAvailable(c) { return questOk(c) && (!!S.owned[c.id] || !c.unlock || has(c.unlock)); }
  function achById(id) { return D.ACHIEVEMENTS.filter(function (a) { return a.id === id; })[0]; }
  function sanitize() {
    if (!D.CHARACTERS.some(function (c) { return c.id === S.char; }) || !charAvailable(charById(S.char))) S.char = "noisette";
    if (!D.MAPS.some(function (m) { return m.id === S.map; }) || !has(mapById(S.map).unlock)) S.map = "clairiere";
    if (!D.DIFFICULTIES[S.diff] || !has(D.DIFFICULTIES[S.diff].unlock)) S.diff = "normal";
    if (!S.dungeon || !has(dungeonById(S.dungeon).unlock)) S.dungeon = "terriers";
    if (["expedition", "arena", "dungeon"].indexOf(S.mode) < 0) S.mode = "survie"; S.posture = S.posture || {};   // 2.0 bêta : Survie et Expédition
    eqS();
  }
  sanitize();

  /* =====================================================================
     Sprites
     ===================================================================== */
  var OUT = "#2b1709";
  function sprite(rows, pal) {
    var h = rows.length, w = 0, x, y;
    rows.forEach(function (row) { w = Math.max(w, row.length); });
    var W = w + 2, H = h + 2, filled = new Uint8Array(W * H);
    var c = document.createElement("canvas"); c.width = W; c.height = H;
    var g = c.getContext("2d");
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var ch = rows[y][x];
      if (ch && pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x + 1, y + 1, 1, 1); filled[(y + 1) * W + x + 1] = 1; }
    }
    g.fillStyle = OUT;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      if (filled[y * W + x]) continue;
      if ((x > 0 && filled[y * W + x - 1]) || (x < W - 1 && filled[y * W + x + 1]) ||
          (y > 0 && filled[(y - 1) * W + x]) || (y < H - 1 && filled[(y + 1) * W + x])) g.fillRect(x, y, 1, 1);
    }
    function variant(flip, white) {
      var v = document.createElement("canvas"); v.width = W; v.height = H;
      var vg = v.getContext("2d");
      if (flip) { vg.translate(W, 0); vg.scale(-1, 1); }
      vg.drawImage(c, 0, 0);
      if (white) { vg.setTransform(1, 0, 0, 1, 0, 0); vg.globalCompositeOperation = "source-in"; vg.fillStyle = "#fff"; vg.fillRect(0, 0, W, H); }
      return v;
    }
    return { c: c, f: variant(true), wc: variant(false, true), wf: variant(true, true), w: W, h: H };
  }
  var SPR = {};
  Object.keys(D.SPRITES).forEach(function (k) {
    var d = D.SPRITES[k];
    SPR[k] = d.frames.map(function (f) { return sprite(f, d.pal); });
    SPR[k].flying = !!d.flying;
  });
  var urlCache = {};
  function spriteUrl(name) { return urlCache[name] || (urlCache[name] = (SPR[name] || SPR.nut)[0].c.toDataURL()); }
  function goldIc() { return '<img class="gold-ic" src="' + spriteUrl("gold") + '" alt="glands d\'or">'; }

  /* ---------- police pixel 3x5 ---------- */
  var FONT = { "0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111", "4": "101101111001001", "5": "111100111001111", "6": "111100111101111", "7": "111001001001001", "8": "111101111101111", "9": "111101111001111",
    A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111", F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111", M: "101111111101101",
    N: "110101101101101", O: "010101101101010", P: "110101110100100", Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010", U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010", Z: "111001010100111",
    ":": "000010000010000", "/": "001001010100100", ".": "000000000000010", "-": "000000111000000", "+": "000010111010000", "!": "010010010000010", "%": "101001010100101", "'": "010010000000000", " ": "000000000000000" };
  function textWidth(str, sc) { return (String(str).length * 4 - 1) * (sc || 1); }
  function drawText(str, x, y, color, align, sc) {
    str = String(str).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
    sc = sc || 1;
    var w = textWidth(str, sc);
    x = Math.round(align === "l" ? x : align === "r" ? x - w : x - w / 2); y = Math.round(y);
    for (var pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? color : OUT;
      for (var i = 0; i < str.length; i++) {
        var b = FONT[str[i]]; if (!b) continue;
        for (var j = 0; j < 15; j++) if (b[j] === "1") {
          var px = x + (i * 4 + (j % 3)) * sc, py = y + ((j / 3) | 0) * sc;
          if (pass) ctx.fillRect(px, py, sc, sc); else ctx.fillRect(px - 1, py - 1, sc + 2, sc + 2);
        }
      }
    }
  }

  /* =====================================================================
     Son
     ===================================================================== */
  var actx = null, lastBlip = 0;
  function sfx(freq, dur, type, vol, slide) {
    if (!S.opts.sound) return;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      var t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
      g.gain.setValueAtTime(vol || 0.05, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  function arp(notes, step, type, vol) { notes.forEach(function (f, i) { setTimeout(function () { sfx(f, 0.12, type || "square", vol || 0.04); }, i * step); }); }
  var sndLast = {};
  function throttled(key, ms, fn) { var n = performance.now(); if (n - (sndLast[key] || 0) < ms) return; sndLast[key] = n; fn(); }
  var SND = {
    pick: function () { var n = performance.now(); if (n - lastBlip < 45) return; lastBlip = n; sfx(880 + Math.random() * 200, 0.06, "square", 0.022, 1.5); },
    gold: function () { sfx(1320, 0.08, "square", 0.03, 1.3); },
    hurt: function () { sfx(200, 0.18, "sawtooth", 0.06, 0.4); },
    boom: function () { throttled("boom", 80, function () { sfx(120, 0.25, "triangle", 0.08, 0.3); }); },
    zap: function () { throttled("zap", 60, function () { sfx(1400, 0.07, "sawtooth", 0.025, 0.4); }); },
    shot: function () { throttled("shot", 70, function () { sfx(900, 0.03, "square", 0.012, 0.6); }); },
    level: function () { arp([523, 659, 784, 1047], 70); },
    fusion: function () { arp([392, 523, 659, 784, 1047, 1319], 70, "triangle", 0.06); },
    ach: function () { arp([784, 988, 1175, 1568], 90, "triangle", 0.05); },
    whip: function () { throttled("whip", 80, function () { sfx(500, 0.08, "triangle", 0.03, 0.5); }); },
    crack: function () { sfx(300, 0.1, "square", 0.04, 0.5); },
    click: function () { sfx(660, 0.05, "square", 0.03); },
    over: function () { arp([392, 330, 262, 196], 160, "triangle", 0.06); },
  };

  /* =====================================================================
     État de partie
     ===================================================================== */
  var W = 320, H = 200;
  var state = "menu";     // menu | play | levelup | pause | over | error
  var curBoss = null;
  var players = [], me = null, picking = false, netMenuOpen = false;
  var p = null, r = null, CH, DIFF, MAP, enemies, projs, hostile, lobs, gems, fx, texts, grid, warns;
  var spawnAcc, nextSwarm, nextBoss, bossCount, shake, uid, achTick, pending, xp, xpNext, propTimer;

  // l'XP est commune et chaque niveau donne un choix à CHAQUE joueur : en coop il en faut plus par niveau
  function teamXp() { return players && players.length ? 1 + 0.9 * (humans() - 1) : 1; }
  function need(L) { if (r && r.mode === "arena") return D.ARENA.need(L); if (r && r.mode === "dungeon") return Math.round(D.DUNGEON.need(L) * teamXp()); return Math.round((5 + (L - 1) * 3 + Math.max(0, L - 15) * 4 + Math.max(0, L - 30) * 8) * teamXp()); }
  function V(w, k, l) { var v = w[k]; return Array.isArray(v) ? v[Math.min(l, v.length - 1)] : v; }

  function calc(pl) {
    var p = pl || actingPlayer();
    var m = p.char.mods || {}, sh = p.shop || {}, ps = p.passives, tr = p.tree || {}, pg = p.pshop || {}, rl = p.relics || {}, it = p.items || {};
    var oldMax = p.maxHp || 0;
    p.maxHp = Math.max(20, 100 + (p.bonusHp || 0) + (m.hp || 0) + 10 * (sh.vigueur || 0) + 20 * (ps.appetit || 0) + 10 * (tr.s1 || 0) + 15 * (pg.ecorce || 0) + (rl.coeur ? 30 : 0) + 25 * (it.bois_roi || 0) + 50 * (it.coeur_golem || 0) + 10 * (it.graine || 0)) * (1 + 0.25 * (it.coeurchene || 0)) * Math.pow(0.8, p.devil || 0);
    p.speed = 62 * (1 + (m.speed || 0) + 0.05 * (sh.celerite || 0) + 0.1 * (ps.pattes || 0) + (rl.plume ? 0.12 : 0) + 0.08 * (it.plume || 0) + 0.25 * (it.pacte_ailes || 0) + 0.15 * (it.aureole || 0) - 0.05 * (it.coeur_golem || 0));
    p.might = 1 + (m.might || 0) + 0.05 * (sh.force || 0) + 0.1 * (ps.griffes || 0) + 0.04 * (tr.a1 || 0) + 0.08 * (pg.racines || 0) + (rl.croc ? 0.15 : 0) + 0.15 * (it.horloge || 0) + 0.4 * (it.pacte_force || 0) + 0.2 * (it.aureole || 0);
    p.armor = (m.armor || 0) + (sh.ecorce || 0) + (ps.ecorce || 0) + (tr.s3 || 0) + 2 * (it.ecaille || 0) + (it.bois_roi || 0) + 2 * (it.coeur_golem || 0);
    p.magnet = 30 * (1 + (m.magnet || 0) + 0.15 * (sh.aimant || 0) + 0.4 * (ps.joues || 0) + 0.1 * (tr.f1 || 0) + (rl.aimant ? 0.6 : 0));
    p.cdMul = Math.max(0.4, 1 - (m.cd || 0) - 0.03 * (sh.vivacite || 0) - 0.08 * (ps.vivacite || 0) - 0.03 * (tr.a2 || 0) - (rl.sablier ? 0.1 : 0) - 0.06 * (it.sablier || 0) - 0.2 * (it.horloge || 0) - 0.2 * (it.pacte_ailes || 0));
    p.xpMul = 1 + (m.xp || 0) + 0.08 * (sh.sagesse || 0) + 0.12 * (ps.savoir || 0) + 0.06 * (tr.f3 || 0) + 0.1 * (pg.seve || 0) + 0.5 * (it.couronne || 0);
    p.regen = 0.2 * (sh.recup || 0) + 0.4 * (ps.seve || 0) + 0.15 * (tr.s2 || 0) + (rl.mousse ? 0.8 : 0) + (it.coeurchene || 0) + (m.regen || 0) + 2 * (it.eau_benite || 0);
    p.luck = 1 + 0.15 * (sh.chance || 0) + 0.2 * (ps.trefle || 0) + (rl.trefle ? 0.3 : 0);
    p.area = 1 + (m.area || 0) + 0.05 * (sh.zone || 0) + 0.1 * (ps.loupe || 0) + 0.06 * (tr.a3 || 0) + (rl.loupe ? 0.2 : 0);
    p.amount = (m.amount || 0) + Math.ceil((ps.poches || 0) / 2) + (tr.a4 || 0) + (rl.poche ? 1 : 0) + (it.plume_hibou || 0) + 2 * (it.pacte_ombre || 0);
    p.shieldCd = ps.mousse ? 16 - 2 * ps.mousse : 0;
    if (it.plume_ange) { p.shieldCd = p.shieldCd ? Math.min(p.shieldCd, 10) : 10; if (!p.shield && !(p.shieldT > 0)) p.shieldT = 1; }
    p.crit = 0.08 * (tr.a5 || 0) + 0.05 * (ps.crocs || 0) + (rl.oeil ? 0.1 : 0) + 0.07 * (it.griffes || 0) + 0.1 * (it.corne || 0); p.rage = !!tr.a6; p.dodge = 0.04 * (tr.s5 || 0) + 0.04 * (ps.queuetouffue || 0) + (m.dodge || 0); p.taken = tr.s6 ? 0.85 : 1;
    p.goldX = tr.f6 ? 2 : 1; p.extraChoice = tr.f4 ? 1 : 0;
    p.goldMul = (1 + 0.1 * (sh.avarice || 0)) * (1 + 0.08 * (tr.f2 || 0)) * (1 + 0.12 * (pg.tresor || 0)) * DIFF.gold * zoneGold() * (1 + 0.5 * (it.couronne || 0)) * (1 + 0.1 * (ps.sacglands || 0));
    if (players && humans() === 1) {
      p.might += 0.12 * (ps.ermite || 0); p.xpMul += 0.08 * (ps.ermite || 0) + 0.05 * (it.carnet || 0); p.regen += 0.5 * (it.carnet || 0);
    }
    p.lantern = it.lanterne || 0; p.fiole = it.fiole || 0;
    p.luck += 0.4 * (it.trefle4 || 0);
    p.might += 0.1 * (p.devil || 0) * (it.masque || 0);
    p.regen += Math.min(5, (r && r.shrinesUsed) || 0) * 0.5 * (it.halo || 0) + 0.2 * (it.graine || 0);
    p.speed *= 1 + 0.1 * (it.boussole || 0);
    p.maxHp *= 1 + 0.25 * (it.coeur_humus || 0);
    if (p.ring && p.ring.furie) p.goldMul *= 2;
    if (p.ring && p.ring.horde) p.xpMul *= p.ring2x ? 2 : 1.5;
    if (p.ring && p.ring.verre) { p.maxHp *= 0.7; p.goldMul *= p.ring2x ? 1.8 : 1.4; p.luck += p.ring2x ? 0.8 : 0.4; }
    if (p.sizeHp) p.maxHp *= 1 + 0.5 * p.sizeHp;
    if (p.posture === "flambeuse" && !tal(p, "flambeuse_t4")) p.maxHp *= 0.75;
    if (p.twin && p.owner && tal(p.owner, "miroir_t2")) p.maxHp *= 1.3;
    if (r && r.cauch) p.goldMul *= 1 + 0.15 * r.cauch;
    p.mount = it.laie ? "mount_boar" : it.lievre ? "mount_hare" : it.selle ? "mount_scarab" : null;
    if (p.mount) { p.speed *= p.mount === "mount_hare" ? 1.35 : p.mount === "mount_boar" ? 1.25 : 1.2; if (p.mount === "mount_hare") p.dodge += 0.08; if (p.mount === "mount_boar") p.armor += 2; }
    p.xpMul += 0.2 * (it.plume_solo || 0);
    p.area += 0.2 * (it.eclat || 0);
    if (p.char && p.char.twin) p.might *= p.owner && setCount(p.owner, "jumeaux") >= 2 ? 0.75 : p.char.twin.dmg || 0.6;
    // contenu étendu : objets à effets
    p.speed *= 1 + 0.2 * (it.semelles || 0);
    p.might += 0.6 * (it.contrat_cendres || 0) + Math.min(0.5, 0.05 * Object.keys((r && r.shrineTypes) || {}).length) * (it.reliquaire ? 1 : 0) + (r && r.ex ? 0.1 * (r.ex.floor - 1) * (it.trophee_profondeur || 0) : 0);
    p.maxHp *= Math.pow(0.75, it.corne_malin || 0);
    p.maxHp += 40 * (it.patte_ours || 0); p.speed *= 1 + 0.3 * (it.serre_aigle || 0); p.armor += (it.carapace_seg || 0) * ((r && r.bosses) || 0);
    // contenu étendu : objets de niveau des états et des éléments
    if (p.epts0) { var ep = { terre: p.epts0.terre, feu: p.epts0.feu, eau: p.epts0.eau, air: p.epts0.air }; Object.keys(D.PASSIVES).forEach(function (k) { var pv = D.PASSIVES[k]; if (pv.elemPt && ps[k]) ep[pv.elemPt] += Math.ceil(ps[k] / 2); }); ep.feu += it.tison || 0; p.epts = ep; }
    if (p.anchorTh0) p.anchorTh = Math.max(0.1, p.anchorTh0 - 0.06 * (ps.patience || 0));
    if (p.volteBase0) p.volteBase = Math.max(1, p.volteBase0 - 0.3 * (ps.ressort || 0));
    if (oldMax && p.maxHp > oldMax) p.hp += p.maxHp - oldMax;
    p.hp = Math.min(p.hp, p.maxHp);
  }

  function actingPlayer() { return p || me; }
  // « duo » : au moins un partenaire (joueur en ligne ou jumeau) ; « solo » : un seul humain
  function duo() { return !!players && players.length > 1; }
  function humans() { return players ? players.filter(function (o) { return !o.twin; }).length : 1; }
  function allowed(def) { return !def || ((!def.coop || duo()) && (!def.solo || humans() === 1)); }
  function partnerOf(pl) {
    var best = null, bd = 1e9;
    for (var i = 0; i < players.length; i++) { var o = players[i]; if (o === pl || o.down) continue; var d = Math.hypot(o.x - pl.x, o.y - pl.y); if (d < bd) { bd = d; best = o; } }
    return best;
  }
  var party = null;                 // manche de party en cours (voir plus bas)
  function myId() { return Net.on ? Net.id : "solo"; }
  function reset(roster, mapId, diffId, mode, seed, dtype) {
    DGT = dungeonById(dtype || S.dungeon);
    DIFF = D.DIFFICULTIES[diffId || S.diff] || D.DIFFICULTIES.normal; MAP = mapById(mapId || S.map);
    giantCache = {}; giantSeed = 0; for (var gi = 0; gi < MAP.id.length; gi++) giantSeed = (giantSeed * 31 + MAP.id.charCodeAt(gi)) % 9973;
    roster = roster || [{ id: "solo", posture: (S.posture || {})[S.char], name: S.name || "Toi", char: S.char, shop: S.shop, tree: S.tree, prestige: S.prestige, pshop: S.pshop }];
    var n = roster.length;
    players = roster.map(function (it, i) {
      var c = charById(it.char);
      var pl = { id: it.id, name: it.name || "Écureuil", char: c, sprite: c.sprite, shop: it.shop || {}, tree: it.tree || {}, prestige: it.prestige || 0, pshop: it.pshop || {}, x: (i - (n - 1) / 2) * 20, y: 0,
                 hp: 0, face: 1, moving: false, anim: 0, inv: 0, weapons: {}, passives: {}, timers: {}, st: {}, consumed: {},
                 shield: false, shieldT: 0, down: false, reviveT: 0, choosing: false, remote: it.id !== myId() };
      pl.tx = pl.x; pl.ty = pl.y;
      pl.weapons[c.weapon] = 1;
      pl.posture = postureOf(c.id, it.posture).id; pl.vx = 0; pl.vy = 0; pl.idleT = 0; pl.runT = 0; pl.volteCd = 0;
      if (!pl.remote) v2Loadout(pl);
      if (c.id === "capitaine") { pl.crew = []; pl.recruitAcc = 0; pl.trail = []; for (var ci = 0; ci < 2; ci++) pl.crew.push(newMatelot(pl)); }
      p = pl; calc(pl); pl.hp = pl.maxHp;
      pl.revives = (pl.shop.renaissance || 0) + (pl.tree.s4 || 0); pl.rerolls = pl.shop.relance || 0;
      return pl;
    });
    // perso jumeau : un 2e corps sur les mêmes commandes, vie séparée, armes partagées à 60 %
    players.slice().forEach(function (pl) {
      var tw0 = pl.char.twin; if (!tw0) return;
      var tw = { id: pl.id + "~2", name: tw0.name, char: pl.char, sprite: tw0.sprite, shop: pl.shop, tree: pl.tree, prestige: pl.prestige, pshop: pl.pshop,
                 x: pl.x - 16, y: pl.y + 4, hp: 0, face: 1, moving: false, anim: 0.5, inv: 0, weapons: pl.weapons, passives: pl.passives, timers: {}, st: {}, consumed: pl.consumed,
                 shield: false, shieldT: 0, down: false, reviveT: 0, choosing: false, remote: pl.remote, twin: true, owner: pl, revives: 0, rerolls: 0 };
      tw.tx = tw.x; tw.ty = tw.y; pl.twinRef = tw;
      calc(tw); tw.hp = tw.maxHp;
      players.splice(players.indexOf(pl) + 1, 0, tw);
    });
    me = players.filter(function (pl) { return pl.id === myId(); })[0] || players[0];
    me.remote = false; p = me; CH = me.char;
    r = { cauch: (S.cn && (S.cauch || {})[mapId || S.map] >= S.cn) ? S.cn : 0, res: {}, loot: [], voltes: 0, recruits: 0, time: 0, kills: 0, level: 1, bosses: 0, berries: 0, gold: 0, lastHit: 0, maxedWeapon: false, nWeapons: 1, nPassives: 0,
          fusions: 0, legend: 0, biome: -1, props: 0, freeze: 0, flash: 0, hard: (diffId || S.diff) !== "normal", ended: false, committed: false, newAch: [], bonus: 0,
          char: CH.id, map: MAP.id, coop: n > 1, mode: mode || "survie",
          round: 1, roundT: 0, roundLen: A.roundTime(1), roundKills: 0, phase: "fight", mod: null, won: false, ready: {} };
    players.forEach(function (pl) { pl.coins = 0; pl.bonusHp = 0; pl.relics = {}; pl.devil = 0; });
    r.sh = {}; r.trials = {}; r.madness = 0; r.devil = 0; r.tier = undefined; shrineCache = {}; r.duo = players.length > 1;
    if (r.mode === "dungeon") { r.seed = seed || ((Math.random() * 1e9) | 0); buildFloor(1); }
    enemies = []; projs = []; hostile = []; lobs = []; gems = []; fx = []; texts = []; warns = []; zones = [];
    biomeCache = new Map();
    if (chestOpen) chestOpen.t.forEach(clearTimeout);
    chestOpen = null; chestQueue = []; chestHideMini();
    xp = 0; xpNext = need(1); pending = me.tree.f5 ? 1 : 0; picking = false; netMenuOpen = false;
    spawnAcc = 5; nextSwarm = 60; nextBoss = 180; bossCount = 0; shake = 0; uid = 0; achTick = 1; propTimer = 0;
    grid = new Map();
    if (r.mode === "expedition") { r.bag = []; r.secure = []; r.exStats = {}; startExpe(1); }
    if ((!Net.on || Net.role === "host") && r.mode !== "dungeon") for (var i = 0; i < 4; i++) spawnProp(90 + Math.random() * 120);
    if (r.mode === "dungeon") { nextSwarm = 1e9; nextBoss = 1e9; spawnAcc = 0; if (!Net.on || Net.role === "host") populateFloor(); }
    if (r.mode === "arena") { nextSwarm = 1e9; nextBoss = 1e9; spawnAcc = 2; }
  }
  function alive() { return players.filter(function (pl) { return !pl.down; }); }
  function randomAlive() { var a = alive(); return a.length ? a[(Math.random() * a.length) | 0] : me; }
  function targetOf(e) {
    if (e.follow) { if (e.follow.dead) e.follow = e.follow.follow || null; else if (Math.hypot(e.follow.x - e.x, e.follow.y - e.y) > 9) return e.follow; }
    var vig = e.aff && hasA(e, "vigilant");
    if (r && r.decoys && r.decoys.length && !e.d.boss && !vig) for (var di = 0; di < r.decoys.length; di++) { var dc = r.decoys[di]; if (dc.t > r.time && Math.abs(dc.x - e.x) < 140 && Math.abs(dc.y - e.y) < 140) return dc; }
    var best = null, bd = 1e18, any = null, ad = 1e18;
    for (var i = 0; i < players.length; i++) {
      var pl = players[i]; if (pl.down) continue;
      var d2 = (pl.x - e.x) * (pl.x - e.x) + (pl.y - e.y) * (pl.y - e.y);
      if (stealthy(pl) && !vig) { if (pl.invis || pl.ghostT > 0) continue; var sr = 70 * (pl.anchored ? 1 - gv(pl, "shi_c") / 100 : 1); if (d2 < sr * sr) { e.spotted = true; e.spotT = r.time; } else if (e.spotted && gv(pl, "shi_b") && r.time - (e.spotT || 0) > 3) e.spotted = false; if (!e.spotted) continue; }
      if (!pl.choosing && d2 < bd) { bd = d2; best = pl; }
      if (d2 < ad) { ad = d2; any = pl; }
    }
    if (!best && !any && players.some(stealthy)) { e.lost = e.lost || { x: e.x + Math.cos(e.phase || 0) * 60, y: e.y + Math.sin(e.phase || 0) * 60 }; return e.lost; }
    return best || any || me;
  }
  function playerById(id) { return players.filter(function (pl) { return pl.id === id; })[0]; }

  /* =====================================================================
     Entrées
     ===================================================================== */
  var keys = {};
  var mouse = { down: false, x: 0, y: 0 };
  var joy = { id: null, active: false, ox: 0, oy: 0, x: 0, y: 0 };
  var JOY_R = 26;
  var screen = "menu";
  function clearInput() { keys = {}; mouse.down = false; joy.active = false; joy.id = null; }
  function toInternal(cx, cy) {
    var rc = canvas.getBoundingClientRect();
    return { x: (cx - rc.left) / rc.width * W, y: (cy - rc.top) / rc.height * H };
  }
  var KEYMAP = { KeyW: "u", ArrowUp: "u", KeyS: "d", ArrowDown: "d", KeyA: "l", ArrowLeft: "l", KeyD: "r", ArrowRight: "r" };
  window.addEventListener("keydown", function (e) {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if ((state === "play" || (state === "menu" && camp.on)) && KEYMAP[e.code]) { keys[KEYMAP[e.code]] = true; e.preventDefault(); }
    if (state === "menu" && camp.on && (e.code === "Enter" || e.code === "Space") && camp.near) { e.preventDefault(); campOpen(camp.near.id); return; }
    if (state === "play" && e.code === "Space") e.preventDefault();
    if (e.code === "Escape" || e.code === "KeyP") {
      if (state === "play") { pause(); e.preventDefault(); }
      else if (state === "pause") { resume(); e.preventDefault(); }
      else if (state === "menu" && screen !== "menu" && screen !== "camp" && e.code === "Escape") { go("menu"); e.preventDefault(); }
    }
    if (screen === "chest" && chestOpen && (e.code === "Space" || e.code === "Enter") && !(document.activeElement && document.activeElement.tagName === "BUTTON")) { e.preventDefault(); ACTIONS.chestok(); }
    if (state === "levelup" || picking) {
      var n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 }[e.code];
      if (n !== undefined) { var b = card.querySelectorAll("[data-choice], [data-action=parme]")[n]; if (b) b.click(); }
    }
  });
  window.addEventListener("keyup", function (e) { if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
  window.addEventListener("blur", function () { clearInput(); if (state === "play" && !Net.on) pause(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && state === "play" && !Net.on) pause(); });

  canvas.addEventListener("pointerdown", function (e) {
    if (state === "menu" && camp.on) { var cq = toInternal(e.clientX, e.clientY); campTap(cq.x, cq.y); e.preventDefault(); return; }
    if (state !== "play") return;
    var q = toInternal(e.clientX, e.clientY);
    if (e.pointerType === "mouse") {
      if (e.button !== 0) return;
      mouse.down = true; mouse.x = q.x; mouse.y = q.y;
    } else if (joy.id === null) {
      joy.id = e.pointerId; joy.active = true; joy.ox = joy.x = q.x; joy.oy = joy.y = q.y;
    }
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  });
  canvas.addEventListener("pointermove", function (e) {
    var q = toInternal(e.clientX, e.clientY);
    if (e.pointerType === "mouse") { mouse.x = q.x; mouse.y = q.y; }
    else if (e.pointerId === joy.id) { joy.x = q.x; joy.y = q.y; }
  });
  function release(e) {
    if (e.pointerType === "mouse") mouse.down = false;
    else if (e.pointerId === joy.id) { joy.id = null; joy.active = false; }
  }
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  function inputVector() {
    var x = (keys.r ? 1 : 0) - (keys.l ? 1 : 0), y = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
    if (x || y) { var l = Math.hypot(x, y); return { x: x / l, y: y / l }; }
    if (joy.active) {
      var dx = joy.x - joy.ox, dy = joy.y - joy.oy, d = Math.hypot(dx, dy);
      if (d > JOY_R) { joy.ox = joy.x - dx / d * JOY_R; joy.oy = joy.y - dy / d * JOY_R; dx = joy.x - joy.ox; dy = joy.y - joy.oy; d = JOY_R; }
      if (d < 3) return { x: 0, y: 0 };
      return { x: dx / JOY_R, y: dy / JOY_R };
    }
    if (mouse.down) {
      var mx = mouse.x - W / 2, my = mouse.y - H / 2, md = Math.hypot(mx, my);
      if (md < 3) return { x: 0, y: 0 };
      var k = Math.min(1, md / 16);
      return { x: mx / md * k, y: my / md * k };
    }
    return { x: 0, y: 0 };
  }

  /* =====================================================================
     Grille spatiale
     ===================================================================== */
  var CELL = 24;
  function cellKey(cx, cy) { return (cx + 32768) * 65536 + (cy + 32768); }
  function buildGrid() {
    grid = new Map();
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (e.under) continue;
      var k = cellKey(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
      var a = grid.get(k); if (!a) grid.set(k, a = []); a.push(e);
    }
  }
  function near(x, y, rad, fn) {
    var x0 = Math.floor((x - rad) / CELL), x1 = Math.floor((x + rad) / CELL);
    var y0 = Math.floor((y - rad) / CELL), y1 = Math.floor((y + rad) / CELL);
    for (var cx = x0; cx <= x1; cx++) for (var cy = y0; cy <= y1; cy++) {
      var a = grid.get(cellKey(cx, cy));
      if (a) for (var i = 0; i < a.length; i++) if (!a[i].dead && fn(a[i]) === false) return;
    }
  }

  /* =====================================================================
     Biomes : régions de Voronoï (cellules de ~26 tuiles) avec bords irréguliers
     ===================================================================== */
  var biomeCache = new Map(), BC = 26;
  function biomeAtTile(tx, ty, m) {
    m = m || MAP;
    var key = tx * 100003 + ty;
    if (m === MAP && biomeCache.has(key)) return biomeCache.get(key);
    var jx = tx + ((hash(tx, ty * 3) % 5) - 2) * 0.45, jy = ty + ((hash(tx * 7, ty) % 5) - 2) * 0.45;
    var cx = Math.floor(jx / BC), cy = Math.floor(jy / BC), best = 1e18, bi = 0, n = m.biomes.length;
    for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
      var gx = cx + dx, gy = cy + dy, h = hash(gx * 31 + 7, gy * 17 + 3);
      var px = (gx + (h % 1000) / 1000) * BC, py = (gy + ((h >>> 10) % 1000) / 1000) * BC;
      var d = (px - jx) * (px - jx) + (py - jy) * (py - jy);
      if (d < best) { best = d; bi = (gx === 0 && gy === 0) ? 0 : (h >>> 20) % n; }
    }
    if (m === MAP) { if (biomeCache.size > 40000) biomeCache.clear(); biomeCache.set(key, bi); }
    return bi;
  }
  function biomeAt(x, y) { return MAP.biomes[biomeAtTile(Math.floor(x / 16), Math.floor(y / 16))]; }

  /* =====================================================================
     Apparitions : ennemis et objets destructibles
     ===================================================================== */
  function isArena() { return r && r.mode === "arena"; }
  function clampArena(o, pad) {
    if (!isArena()) return;
    pad = pad || 6;
    o.x = Math.max(-A.w + pad, Math.min(A.w - pad, o.x)); o.y = Math.max(-A.h + pad, Math.min(A.h - pad, o.y));
  }
  function arenaEdgePoint() {
    var side = (Math.random() * 4) | 0, t = Math.random() * 2 - 1, m = 10;
    if (side === 0) return { x: t * (A.w - m), y: -A.h + m };
    if (side === 1) return { x: t * (A.w - m), y: A.h - m };
    if (side === 2) return { x: -A.w + m, y: t * (A.h - m) };
    return { x: A.w - m, y: t * (A.h - m) };
  }
  function arenaDirector(dt) {
    var mod = r.mod || {};
    var rate = (0.7 + r.round * 0.5) * DIFF.spawn * (mod.rate || 1) * (1 + 0.6 * (players.length - 1));
    if (r.roundT > r.roundLen - 2) rate = 0;   // la manche se termine : plus de nouvelles apparitions
    spawnAcc += rate * dt;
    while (spawnAcc >= 1) {
      spawnAcc--;
      if (enemies.length >= 220) continue;
      var pt = arenaEdgePoint(), b = biomeAt(pt.x, pt.y);
      var e = spawnAt(pickType(b), pt.x, pt.y);
      if (e) { e.spd *= (mod.spd || 1); e.hp *= (mod.hp || 1); e.maxHp = e.hp; if (r.round >= 3 && Math.random() < 0.01 + r.round * 0.003) giveAffixes(e, r.round >= 12 ? 2 : 1); }
    }
  }
  function spawnAt(type, x, y) {
    var d = D.ENEMIES[type];
    var hp = d.hp * (d.boss && !isDungeon() ? (1 + bossCount * 0.9) * (1 + r.time / 200) * DIFF.hp * (MAP.hp || 1) : hpMul());
    var e = makeEnemy(type, d, x, y, hp);
    if (d.ai === "mole") { e.under = true; e.cd = 1; }
    if (d.ai === "spitter" || d.ai === "spiker") e.cd = 1.5 + Math.random() * 2;
    return e;
  }
  function tierHp() { return 1 + tcfg().hp * tierN(); }
  // réglages de la montée en difficulté : ceux du mode choisi s'il en a (Difficile), sinon ceux de TIER
  function tcfg() { return (DIFF && DIFF.tier) || TIER; }
  function hpMul() { return hpMul0() * tierHp(); }
  function zoneHp() { return isDungeon() ? DGT.hp || 1 : MAP.hp || 1; }
  function zoneGold() { return r && r.mode === "dungeon" ? DGT.gold || 1 : MAP.gold || 1; }
  function hpMul0() { if (isDungeon()) return (1 + 0.9 * (r.dg.floor - 1)) * (1 + r.time / 400) * DIFF.hp * zoneHp() * (1 + 0.25 * (players.length - 1)); return (isArena() ? 1 + 0.07 * (r.round - 1) : 1) * (1 + r.time / 100 + Math.pow(r.time / 300, 2)) * DIFF.hp * (MAP.hp || 1) * (1 + 0.25 * (players.length - 1)); }
  function makeEnemy(type, d, x, y, hp) {
    var e = { id: ++uid, type: type, d: d, spr: SPR[d.sprite], x: x, y: y, hp: hp, maxHp: hp, kx: 0, ky: 0, flash: 0, slowT: 0, slow: 0,
              anim: Math.random() * 2, phase: Math.random() * 6, face: 1, charge: 0, windup: 0, cd: 3, spd: (d.spd || 0) * DIFF.spd, cool: null };
    if (nm(6) && !d.prop) e.spd *= 1.2;
    if (nm(2) && d.boss && !d.mega && !d.giant) e.needAff = true;
    var rm0 = rageMin();
    if (rm0 > 0 && !d.prop) { e.spd *= rageSpd(); if (!d.boss) { e.hp *= 1 + RAGE.hpPerMin * rm0; e.maxHp = e.hp; } e.rage = Math.min(1, rm0 / 5); }
    enemies.push(e);
    giveElement(e);
    if (d.scale && !d.mega) e.scale = d.scale;
    if (e.elem && !d.boss && !d.prop) { if (e.elem === "terre") { e.hp *= 1.3; e.maxHp = e.hp; } else if (e.elem === "air") e.spd *= 1.2; }
    if (e.needAff) { e.needAff = false; giveAffixes(e, 1); }
    if (isExpe() && r.ex && !d.prop && Math.hypot(x, y) < corrR()) { e.corrupt = true; e.hp *= 1.5; e.maxHp = e.hp; e.dmgMul = (e.dmgMul || 1) * 1.3; }
    return e;
  }
  function spawn(type, ang, dist, around) {
    around = around || randomAlive();
    if (ang === undefined) ang = Math.random() * TAU;
    if (dist === undefined) dist = Math.hypot(W, H) / 2 + 6 + Math.random() * 14;
    var x = around.x + Math.cos(ang) * dist, y = around.y + Math.sin(ang) * dist;
    if (!type) type = pickType(biomeAt(x, y));
    var d = D.ENEMIES[type];
    var hp = d.hp * (d.boss ? (1 + bossCount * 0.9) * (1 + r.time / 200) * DIFF.hp * (MAP.hp || 1) : hpMul());
    var e = makeEnemy(type, d, x, y, hp);
    if (d.ai === "mole") { e.under = true; e.cd = 1; }
    if (d.ai === "spitter" || d.ai === "spiker") e.cd = 1.5 + Math.random() * 2;
    // élites en survie : de plus en plus fréquentes ; boss avec pouvoirs à partir du 2e
    if (!isArena() && !isDungeon()) {
      if (d.boss) { if (bossCount >= 1) giveAffixes(e, bossCount >= 3 ? 2 : 1); }
      else if (r.time > 90 && Math.random() < Math.min(0.035, 0.004 + r.time / 18000) + TIER.elite * tierN()) giveAffixes(e, r.time > 480 || tierN() >= 5 ? 2 : 1);
    }
    return e;
  }
  var PROP_D = { prop: true, r: 6, spd: 0, dmg: 0, xp: 0, color: "#a06a3e" };
  function spawnProp(dist) {
    var a = Math.random() * TAU, o = randomAlive();
    var x = o.x + Math.cos(a) * dist, y = o.y + Math.sin(a) * dist;
    if (isArena()) { x = (Math.random() * 2 - 1) * (A.w - 30); y = (Math.random() * 2 - 1) * (A.h - 30); }
    var d = Object.assign({}, PROP_D, { sprite: biomeAt(x, y).prop || "stump" });
    if (strataN() === 3 && Math.random() < 0.4) { d.sprite = "crystal"; d.crystal = true; }
    var e = makeEnemy("prop", d, x, y, 14 * (1 + r.time / 200));
    e.anim = 0;
    return e;
  }
  function pickType(biome) {
    var pool = [], total = 0, list = (biome || MAP.biomes[0]).enemies;
    list.forEach(function (it) {
      if (r.time < it[1]) return;
      var w = it[2] * (1 + Math.min(1.5, (r.time - it[1]) / 120));
      pool.push([it[0], w]); total += w;
    });
    var x = Math.random() * total;
    for (var i = 0; i < pool.length; i++) { x -= pool[i][1]; if (x <= 0) return pool[i][0]; }
    return list[0][0];
  }
  function bannerAll(text) { banner(text); netEv(["bn", text]); }
  function banner(text) {
    var b = $("[data-banner]");
    b.textContent = text; b.hidden = false;
    b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
    clearTimeout(banner.t); banner.t = setTimeout(function () { b.hidden = true; }, 2600);
  }
  function director(dt) {
    var st0 = stageTime(), rate = Math.min(14, 1.7 + st0 / 30 + (r.stage || 0) * 2) * DIFF.spawn * (1 + 0.6 * (humans() - 1)) * (1 + TIER.spawn * tierN());
    if (D.SQUADS) squadDirector(dt, rate);
    else { spawnAcc += rate * dt; while (spawnAcc >= 1) { spawnAcc--; if (enemies.length < 290) spawn(); } }
    if (r.time >= nextSwarm) {
      nextSwarm += 60;
      var n = 18 + Math.floor(r.time / 60) * 6;
      var idx = st0 < 150 ? 0 : (st0 < 300 ? 1 : (st0 < 480 ? 2 : 3));
      var type = MAP.swarm[Math.min(idx, MAP.swarm.length - 1)];
      var R = Math.hypot(W, H) / 2 + 8, around = randomAlive();
      for (var i = 0; i < n; i++) spawn(type, i / n * TAU, R, around);
      bannerAll("Une nuée approche !");
    }
    if (r.time >= nextBoss) {
      nextBoss += 180;
      var bt = MAP.bosses[bossCount % MAP.bosses.length];
      for (var bk = 0; bk < 1 + (r.madness || 0) + (me.ring && me.ring.danger ? 1 : 0) + (anyItem("de_demon") ? 1 : 0); bk++) spawn(bt);
      bossCount++;
      bannerAll(D.ENEMIES[bt].name + (r.madness ? " x" + (1 + r.madness) : "") + " arrive !");
      SND.boom();
    }
    propTimer -= dt;
    if (propTimer <= 0) {
      propTimer = 4.5;
      var nProps = 0;
      for (var j = 0; j < enemies.length; j++) if (enemies[j].d.prop) nProps++;
      if (nProps < 7) spawnProp(Math.hypot(W, H) / 2 + 10 + Math.random() * 60);
    }
  }

  /* =====================================================================
     Dégâts, morts, butin
     ===================================================================== */
  function hurt(e, dmg, kx, ky) {
    if (e.dead) return;
    var crit = Math.random() < (p.crit || 0) + (p.critX || 0) + (p.packN && itn(p, "glandsjumeaux") ? 0.1 * itn(p, "glandsjumeaux") : 0);
    dmg = dmg * p.might * (0.9 + Math.random() * 0.2) * (crit ? (itn(p, "corne") ? 3 : 2) : 1) * (p.rage && p.hp < p.maxHp * 0.3 ? 1.25 : 1);
    if (crit && r) r.crits = (r.crits || 0) + 1;
    dmg *= p.dmgX || 1;
    var hf = HIT_FX, hadMark = e.mark && e.markT > 0 ? e.mark : null;
    if (hf && hf.vsMark && hadMark && hadMark !== atkElem(p)) dmg *= hf.vsMark;
    dmg = elemHit(e, dmg);
    if (stealthy(p) && !e.spotted && !e.d.prop) dmg *= tal(p, "affut_t3") && p.invis ? 4 : setCount(p, "shinobi") >= 2 ? 3.5 : 3;
    if (p.sparkN > 0 && !e.d.prop) { p.sparkN--; if (!(e.burnT > 0)) r.burns = (r.burns || 0) + 1; e.burnT = 3; e.burnD = 3 * gpw(); e.burnBy = p; }
    if (p.anchored && CUR_FAM === "tir" && p.gear && gearHas(p, "u_veilleur")) dmg *= 1.2;
    if (p.critNext && !e.d.prop) { dmg *= tal(p, "affut_t2") ? 3 : 2; p.critNext = false; }
    if (p.items && !e.d.prop) {
      if (p.ppRdy && CUR_FAM) { dmg *= 1 + 0.5 * itn(p, "pierre_patience"); p.ppRdy = false; }
      if (p.frisRdy) { p.frisRdy = false; if (!e.d.boss) { e.stunT = 0.5; e.slowT = 0.5; e.slow = 1; burst(e.x, e.y, "#9ee8ff", 4); } }
      if (p.ccT > 0 && (CUR_FAM === "retour" || CUR_FAM === "zone")) dmg *= 1.3;
      if (e.mudT > r.time && itn(p, "sables_mouvants")) dmg *= 1 + 0.25 * itn(p, "sables_mouvants");
      if (e.aff && !e.blessed && itn(p, "cloche_benie")) { e.blessed = true; e.affOff = r.time + 5; texts.push({ x: e.x, y: e.y - 16, n: "BÉNI", life: 0.8, col: "#fdf3de" }); }
    }
    if (e.mulT > r.time) dmg *= 1.5;
    if (p.items && itn(p, "oeil_brochet") && e.stunT > 0 && e.slow === 1) dmg *= 1.4;
    if (e.rootT > r.time && setCount(p, "racines_m") >= 3) dmg *= 1.4;
    if (p.anchored && p.gear && gearHas(p, "aig_c") && Math.hypot(e.x - p.x, e.y - p.y) > 150) dmg *= 1.25;
    if (setCount(p, "brochet") >= 3 && !e.d.boss && MAP && MAP.mech === "ice" && onIce(e.x, e.y) && Math.random() < 0.15) { e.stunT = 1; e.slowT = 1; e.slow = 1; }
    var sk = p.sigK;
    if (sk && !e.d.prop) {
      if (p.anvilRdy) { p.anvilRdy = false; p.anvilCd = 3; dmg *= 3; if (!e.d.boss) { e.stunT = 1; e.slowT = 1; e.slow = 1; } texts.push({ x: e.x, y: e.y - 14, n: "ENCLUME !", life: 0.7, col: "#c8a060" }); }
      if (sk.rivet && cooled(e, "rivet", 0.25)) { e.rivets = (e.rivets || 0) + 1; if (e.rivets >= 3) { e.rivets = 0; if (!e.d.boss) { e.stunT = 1; e.slowT = 1; e.slow = 1; } burst(e.x, e.y, "#c8c0b0", 4); } }
      if (sk.freeze5 && CUR_FAM === "tir") { p.f5 = (p.f5 || 0) + 1; if (p.f5 % 5 === 0 && !e.d.boss) { e.stunT = 1; e.slowT = 1; e.slow = 1; r.freezes = (r.freezes || 0) + 1; burst(e.x, e.y, "#9ee8ff", 5); } }
      if (sk.aim && p.aimSt > 0 && CUR_FAM === "tir") { dmg *= 1 + 0.3 * p.aimSt; p.aimSt = 0; }
      if (sk.slam && (kx || ky) && !e.d.boss && slamWall(e, kx, ky)) { dmg *= 2; burst(e.x, e.y, "#c8c0b0", 4); }
      if (sk.critFire && crit && !procLock) for (var cf = 0; cf < 3; cf++) pZone({ x: e.x + (p.x - e.x) * cf / 4, y: e.y + (p.y - e.y) * cf / 4, r: 8, dur: 2, kind: "fire", owner: p, pdmg: 3 * gpw(), elem: "feu" });
    }
    if (p.debt > 0 && !e.d.prop) p.debt = Math.max(0, p.debt - (setCount(p, "granit") >= 2 ? 0.5 : 0.4));
    if (p.twin && p.owner && tal(p.owner, "miroir_t4")) { e.slowT = 0.6; e.slow = Math.max(e.slow || 0, 0.3); }
    if (e.d.mega && e.phase3 === 3 && p.anchored) dmg *= 1.5;
    if (p.items) dmg = itemDmg(e, dmg);
    if (p.packN && p.passives.meute) dmg *= 1 + 0.08 * p.passives.meute;
    if (p.rallyT > 0) dmg *= 1.4;
    if (p.corT > 0) dmg *= 1 + 0.15 * itn(p, "cor");
    if (e.d.boss && itn(p, "trophee")) dmg *= 1 + 0.25 * itn(p, "trophee");
    if (itn(p, "dague_ombre") && Math.random() < Math.min(0.5, 0.15 * itn(p, "dague_ombre"))) dmg *= 4;
    if ((e.d.boss || e.aff) && itn(p, "pleinelune") && humans() === 1) dmg *= 1 + 0.25 * itn(p, "pleinelune");
    if (e.aff || e.shellT > 0) dmg = affixDamage(e, dmg);
    if (e.ballT > r.time) dmg *= 0.05;
    if (e.vulnT > r.time) dmg *= p.anchored ? 2 : 1.3;
    if (p.items) {
      if (itn(p, "barbillon") && e.slowT > 0) dmg *= 1 + 0.3 * itn(p, "barbillon");
      if (itn(p, "patte_ours") && p.hp < p.maxHp * 0.5) dmg *= 1.25;
      if (e.d.prop && itn(p, "dent_castor")) dmg *= 3;
    }
    dmg = Math.max(1, Math.round(dmg));
    if (e.eshield > 0) { var ab = Math.min(e.eshield, dmg); e.eshield -= ab; dmg -= ab; if (dmg <= 0) { e.flash = 0.05; return; } }
    e.hp -= dmg; e.flash = 0.1;
    if (!e.d.prop) {
      var kb = e.d.boss ? 0.12 : (e.elem === "terre" || hasA(e, "lourd")) ? 0 : 1;
      e.kx += (kx || 0) * kb; e.ky += (ky || 0) * kb;
    }
    if (S.opts.numbers && texts.length < 60) texts.push({ x: e.x + (Math.random() * 6 - 3), y: e.y - e.d.r - 6, n: dmg, life: 0.6 });
    if (Net.dmgN < 30) { Net.dmgN++; netEv(["d", Math.round(e.x), Math.round(e.y - e.d.r - 6), dmg]); }
    if (p.items) onHitProcs(e);
    if (hf && !e.d.prop) hitFx(e, hf, dmg, hadMark);
    if (crit && itn(p, "dard_reine") && !procLock && !e.d.prop) { procLock = true; explode(e.x, e.y, 18, 15 * itn(p, "dard_reine")); procLock = false; }
    if (e.hp <= 0 && !e.dead) kill(e);
  }
  // un obstacle juste derrière l'ennemi repoussé (arbre, rocher, mur du donjon)
  // contact avec un ennemi : renvoie false si le coup est évité par un objet
  function contactOk(e, pl) {
    if (!pl.items && !pl.gear) return true;
    pl.items = pl.items || {};
    if (e.missT > r.time) return false;
    if (pl.mstate === "mouvement" && pl.gear && gearHas(pl, "u_renard")) { if (cooled(e, "renard", 0.6)) { var kr = p; p = pl; applyMark(e, "air"); p = kr; } return false; }
    if (pl.feinteT > 0 && itn(pl, "feinte")) return false;
    if (itn(pl, "semelles") && pl.mstate === "mouvement" && (pl.runT || 0) > 1 && e.d.role === "nuee" && !e.d.boss) { var kp = p; p = pl; hurt(e, e.hp + 1, 0, 0); p = kp; return false; }
    if (itn(pl, "ancre_pierre") && pl.anchored && e.d.role === "chargeur" && e.dash > 0) { e.stunT = 1; e.slowT = 1; e.slow = 1; e.dash = 0; }
    if (itn(pl, "ecorce_glissante") && pl.mstate === "mouvement" && pl.inv <= 0 && cooled(pl, "glisse", 0.4) && Math.random() < Math.min(0.5, 0.1 * itn(pl, "ecorce_glissante"))) { pl.inv = 0.3; if (S.opts.numbers) texts.push({ x: pl.x, y: pl.y - 14, n: "GLISSE", life: 0.6 }); return false; }
    return true;
  }
  function killItems(e) {
    var n;
    if ((n = itn(p, "filet_papillons")) && e.d.role === "nuee") { p.nk = (p.nk || []).filter(function (t) { return r.time - t < 1; }); p.nk.push(r.time); if (p.nk.length >= 3) { p.nk = []; p.hp = Math.min(p.maxHp, p.hp + 2 * n); } }
    if (itn(p, "pas_ecureuil") && e.aff) p.volteCd = 0;
    if ((n = itn(p, "trousseau")) && e.aff && isExpe() && r.ex && Math.random() < 0.25 * n) { r.ex.keys++; bannerAll("Une clé de sortie !"); }
    if ((n = itn(p, "bouclier_boue")) && e.d.role === "artilleur") for (var i = warns.length - 1; i >= 0; i--) if (warns[i].owner === e) { var w = warns[i]; warns.splice(i, 1); explode(w.x, w.y, w.r + 6, 20 * gpw() * n, 0); }
    if ((n = itn(p, "corne_malin")) && !e.d.boss && Math.random() < 0.1 * n && SPR[e.d.sprite]) { var al = compList("__corne"); if (al.length < 6) al.push({ k: e.d.sprite, x: e.x, y: e.y, life: 10, max: 10, cd: 0.5, face: 1, anim: 0, ally: 1 }); }
  }
  function slamWall(e, kx, ky) {
    var d = Math.hypot(kx, ky) || 1, bx = e.x + kx / d * (e.d.r + 8), by = e.y + ky / d * (e.d.r + 8);
    if (isDungeon()) return !walkable(bx, by);
    if (!useGiants()) return false;
    var g = giantAt(Math.floor(bx / GC), Math.floor(by / GC)); return !!(g && Math.hypot(bx - g.x, by - g.y) < g.r + 4);
  }
  function drop(kind, x, y, v) { gems.push({ x: x, y: y, kind: kind, v: v || 0 }); }
  function kill(e) {
    e.dead = true;
    lootKill(e);
    burst(e.x, e.y, e.d.color, e.d.boss ? 30 : 6);
    if (e.d.prop) {
      r.props++; SND.crack();
      if (itn(p, "dent_castor")) drop("xp", e.x, e.y, 2);
      if (e.d.crystal) { players.forEach(function (o) { if (!o.down && Math.hypot(o.x - e.x, o.y - e.y) < 90) o.hp = Math.min(o.maxHp, o.hp + 12); }); burst(e.x, e.y, "#9ee8ff", 12); }
      if (p.sigK && p.sigK.lumber) { ring(e.x, e.y, 34, false); near(e.x, e.y, 44, function (o) { if (!o.d.prop && !o.dead) { o.burnT = 3; o.burnD = 3 * gpw(); o.burnBy = p; } }); p.hp = Math.min(p.maxHp, p.hp + 2); }
      if (Math.random() < 0.03) dropItem(e.x, e.y, 0); else drop(rollLoot(), e.x, e.y);
      return;
    }
    r.kills++; r.roundKills++;
    if (CUR_FAM === "tir") r.tirKills = (r.tirKills || 0) + 1;
    if (e.d.role) { r.roleK = r.roleK || {}; r.roleK[e.d.role] = (r.roleK[e.d.role] || 0) + 1; }
    if (p.items) killItems(e);
    if (HIT_TREE && setCount(p, "sylve") >= 2) p.hp = Math.min(p.maxHp, p.hp + 1);
    if (stealthy(p) && !e.spotted && setCount(p, "shinobi") >= 3) p.ghostT = Math.max(p.ghostT || 0, 1);
    if (p.sigK && p.sigK.ash && Math.hypot(e.x - p.x, e.y - p.y) < 50) pZone({ x: e.x, y: e.y, r: 14, dur: 3, kind: "thorn", dmg: 1, owner: p });
    onKillProcs(e);
    if (e.elem === "feu" && !e.d.boss && enemies.length < 260) addZone(e.x, e.y, 11, 2, "fire", 4);
    var own = e.d.boss ? D.ITEMS.filter(function (it) { return it.from === e.type; })[0] : null;
    if (own && Math.random() < 0.6) drop("item", e.x + 10, e.y, own.idx);
    else if (e.d.boss) { if (Math.random() < 0.5) drop("item", e.x + 10, e.y, rollItem(0, 1, "boss").idx); else dropItem(e.x + 10, e.y, Math.random() < 0.25 ? 2 : 1); }
    if (e.quest) { trialKill(e); if (itn(p, "lettre_defi")) { dropItem(e.x - 6, e.y, 0); dropItem(e.x + 6, e.y, 0); } }
    else if (e.aff && Math.random() < 0.3) dropItem(e.x, e.y + 4, 0);
    if (e.type === "puffball") addZone(e.x, e.y, 24, 3.5, "spore", 4);
    if (e.d.boss && r.madness) r.madBoss = (r.madBoss || 0) + 1;
    if (e.aff && !e.d.boss && strataN() >= 4) dropItem(e.x + 6, e.y, 2);
    if (e.aff && !e.d.boss && setCount(p, "phenix") >= 3) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.05);
    if (e.aff && !e.d.boss) { r.elites = (r.elites || 0) + 1; if (itn(p, "cor")) p.corT = 5; }
    if (e.aff) {
      if (hasA(e, "explosif") && !anyItem("sceau_purete")) warn(e.x, e.y, 32, 0.7, 16);
      if (!e.d.boss) { drop("xp", e.x + 4, e.y, e.d.xp * 3); drop("gold", e.x - 4, e.y, 2); }
    }
    if (e.d.ai === "bomber") { e.byPlayer = true; explodeEnemy(e.x, e.y, e.d.blastR, 30); }
    if (e.d.boss) {
      r.bosses++; S.stats.bosses++; r.bossT = r.bossT || {}; r.bossT[e.type] = 1; if (e.dgFinal) { r.finalT = r.finalT || {}; r.finalT[e.type] = 1; }
      players.forEach(function (o) { if (o.gear && gearHas(o, "u_cycle")) { o.cycleN = (o.cycleN || 0) + 1; bannerAll("L'Œil du cycle : ton arme devient " + D.ELEMENTS[armElem(o)].name); } if (o.ring && o.ring.avare) r.gold += Math.floor(r.gold * (o.ring2x ? 0.2 : 0.1)); });
      if (e.defiBoss) drop("chest", e.x + 12, e.y, 3);
      drop("chest", e.x, e.y, 2);
      for (var i = 0; i < 6; i++) drop("gold", e.x + Math.random() * 30 - 15, e.y + Math.random() * 30 - 15, 2);
      for (i = 0; i < 10; i++) drop("xp", e.x + Math.random() * 30 - 15, e.y + Math.random() * 30 - 15, 5);
      return;
    }
    var L = p.luck;
    if (Math.random() < 0.01 * L) drop("berry", e.x, e.y);
    else if (Math.random() < 0.025 * L) drop("gold", e.x, e.y, 1);
    if (gems.length > 450) { var g = gems[(Math.random() * gems.length) | 0]; if (g.kind === "xp") { g.v += e.d.xp; return; } }
    drop("xp", e.x, e.y, e.d.xp);
  }
  function rollLoot() {
    var total = 0, list = D.LOOT.map(function (l) { var w = l.weight * (l.id === "chest" || l.id === "bomb" ? p.luck : 1); total += w; return [l.id, w]; });
    var x = Math.random() * total;
    for (var i = 0; i < list.length; i++) { x -= list[i][1]; if (x <= 0) return list[i][0]; }
    return "goldbag";
  }
  function burst(x, y, color, n) {
    if (n >= 5) netEv(["k", Math.round(x), Math.round(y), color, n]);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, s = 20 + Math.random() * 50;
      fx.push({ kind: "dot", x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.3 + Math.random() * 0.3, color: color });
    }
  }
  function damagePlayer(dmg, pl) {
    var p = pl || me;
    if (p.inv > 0 || p.down || p.choosing || p.god) return;
    if (riposteOnHit(p)) { p.inv = 0.3; return; }
    var sgc = hasSig(p, "contre");
    if (sgc && p.anchored && !(p.contreCd > 0)) { p.contreCd = 4; p.inv = 0.4; var ppc = p; riposteBlast(p, { R: [36], dmg: [25 * (1 + 0.25 * (sgc.l - 1))] }, 0); p = ppc; texts.push({ x: p.x, y: p.y - 16, n: "CONTRE !", life: 0.7 }); return; }
    if (p.anchored) dmg *= (1 - (p.gearArm || 0)) * (tal(p, "piedferme") ? 0.8 : 1);
    if (p.shield) {
      p.shield = false; p.shieldT = p.shieldCd; p.inv = 0.5;
      burst(p.x, p.y, "#9cc56b", 10); SND.crack();
      return;
    }
    // Capitaine : le dernier matelot prend le coup à sa place
    if (p.crew && p.crew.length) { var mt = p.crew.pop(); burst(mt.x, mt.y, "#c8553d", 8); p.inv = 0.45; SND.crack(); if (S.opts.numbers) texts.push({ x: mt.x, y: mt.y - 8, n: "MATELOT !", life: 0.7 }); return; }
    if ((p.dodge || p.dodgeX) && Math.random() < (p.dodge || 0) + (p.dodgeX || 0)) { p.inv = 0.3; r.dodges = (r.dodges || 0) + 1; if (S.opts.numbers) texts.push({ x: p.x, y: p.y - 14, n: "ESQUIVE", life: 0.6 }); return; }
    p.calmT = 0;
    if (r && TIER) dmg *= (1 + tcfg().dmg * tierN()) * rageDmg();
    if (p.oshield > 0) { var ab = Math.min(p.oshield, dmg); p.oshield -= ab; dmg -= ab; p.inv = 0.3; burst(p.x, p.y, "#9cc56b", 4); if (dmg <= 0) return; }
    if (p.packN && p.passives && p.passives.meute) dmg -= p.passives.meute;
    p.redSt = 0; if (r && p === me) r.vc = 0;
    var hit = Math.max(1, (dmg - p.armor - (p.armX || 0)) * (p.taken || 1) * (isArena() && r.mod && r.mod.taken ? r.mod.taken : 1)) * (nm(9) ? 1.3 : 1);
    if (p.rmRed > 0) { hit *= 1 - p.rmRed; p.rmRed = 0; }
    if (p.posture === "carapace" && p.anchored) { hit *= tal(p, "carapace_t1") ? 0.35 : 0.5; var rf = nearest(1, 40)[0]; if (rf) { var ppr = p; hurt(rf, hit * 2 * (tal(p, "carapace_t2") ? 2 : 1), 0, 0); p = ppr; } }
    if (p.owner && p.owner.posture === "formation" && tal(p.owner, "formation_t1") && Math.hypot(p.x - p.owner.x, p.y - p.owner.y) < 26) hit *= 0.8;
    if (p.posture === "formation" && tal(p, "formation_t1") && p.twinRef && Math.hypot(p.x - p.twinRef.x, p.y - p.twinRef.y) < 26) hit *= 0.8;
    if (tal(p, "portebonheur_t4") && (p.luckX || 0) > 0.3) hit *= 0.8;
    if (p.char && p.char.id === "ninja" && !(tal(p, "danseuse_t2") && Math.random() < 0.5)) p.dance = 0;
    if (p.char && p.char.id === "cendrine" && !p.twin) { p.debt = (p.debt || 0) + hit; p.debtRate = Math.max(p.debtRate || 0, p.debt / (p.mstate === "mouvement" && gv(p, "gra_b") ? 5 : 4)); }
    else p.hp -= hit;
    p.inv = DIFF.inv || 0.35;
    if (p === me) { r.lastHit = r.time; if (S.opts.shake) shake = 0.25; SND.hurt(); }
    burst(p.x, p.y, "#c8553d", 5);
  }
  function warn(x, y, rad, dur, dmg, owner, follow) {
    warns.push({ x: x, y: y, r: rad, t: 0, dur: dur, dmg: dmg, owner: owner || null, follow: !!follow });
  }
  function hostileShot(x, y, ang, spd, dmg) {
    if (Math.random() < 0.5 && players.some(function (pl) { return pl.sigK && pl.sigK.blind && Math.hypot(pl.x - x, pl.y - y) < 46 * (pl.smokeX || 1); })) { burst(x, y, "#8a8278", 3); return; }
    hostile.push({ x: x, y: y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 4, dmg: dmg });
  }
  function ring(x, y, rad, red) {
    fx.push({ kind: "ring", x: x, y: y, r: rad, life: 0.25, max: 0.25, red: !!red });
    netEv(["x", Math.round(x), Math.round(y), Math.round(rad), red ? 1 : 0]);
  }
  function explodeEnemy(x, y, rad, dmg) {
    ring(x, y, rad, true);
    burst(x, y, "#c8553d", 10);
    near(x, y, rad + 12, function (en) {
      if (en.d.boss || Math.hypot(en.x - x, en.y - y) > rad + en.d.r) return;
      hurt(en, dmg, (en.x - x) * 3, (en.y - y) * 3);
    });
    SND.boom();
  }
  function enemyAI(e, d, dx, dy, dt) {
    var ai = e.d.ai, ang = Math.atan2(dy, dx);
    if (r.freeze <= 0) { var ro = roleAI(e, ai, d, dx, dy, dt); if (ro !== null) return ro; }
    if (ai === "bomber") {
      if (e.fuse > 0) {
        e.fuse -= dt; e.flash = Math.sin(e.fuse * 40) > 0 ? 0.05 : 0;
        if (e.fuse <= 0) { e.dead = true; e.exploded = true; burst(e.x, e.y, "#c8553d", 12); SND.boom(); var am = anyItem("allumette"); if (am) { var kpa = p; p = am; explodeEnemy(e.x, e.y, e.d.blastR || 22, (e.d.blast || 16) * 2); p = kpa; } }
        return 0;
      }
      if (d < 22 && r.freeze <= 0) { e.fuse = e.d.fuse || 0.8; warn(e.x, e.y, e.d.blastR, e.fuse, e.d.blast, e, true); return 0; }
    } else if (ai === "spitter") {
      e.cd -= dt;
      if (e.cd <= 0 && d < 150 && r.freeze <= 0) { e.cd = 2.4 * (players.some(function (pl) { return itn(pl, "miroir_poche") && Math.hypot(pl.x - e.x, pl.y - e.y) < 100; }) ? 1.67 : 1); hostileShot(e.x, e.y - 2, ang, 75, e.d.shot); SND.whip(); }
      if (d < 60) return -0.8;
      if (d < 95) return 0.15;
    } else if (ai === "spiker") {
      e.cd -= dt;
      if (e.cd <= 0 && d < 110 && r.freeze <= 0) {
        e.cd = 4; var off = Math.random();
        for (var k = 0; k < 8; k++) hostileShot(e.x, e.y, off + k / 8 * TAU, 55, e.d.shot);
        SND.whip();
      }
    } else if (ai === "mole") {
      if (e.under) {
        e.cd -= dt;
        if (d < 26 && e.cd <= 0 && !e.digging) { e.digging = 0.9; warn(e.x, e.y, e.d.blastR, 0.9, e.d.blast, e); }
        if (e.digging) {
          e.digging -= dt;
          if (e.digging <= 0) { e.digging = 0; e.under = false; e.upT = 2.2; burst(e.x, e.y, "#8a5a3b", 10); }
          return 0;
        }
        return 1;
      }
      e.upT -= dt;
      if (e.upT <= 0) { e.under = true; e.cd = 1.5; }
      return 0;
    } else if (r.freeze > 0) {
      return 1;
    } else if (ai === "dasher") {
      e.cd -= dt;
      if (e.dash > 0) { e.dash -= dt; e.x += e.cx * 170 * dt; e.y += e.cy * 170 * dt; if (cooled(e, "trail", 0.07)) addZone(e.x, e.y + 2, 7, 2.2, "fire", 5); return 0; }
      if (e.windup > 0) { e.windup -= dt; e.flash = Math.sin(e.windup * 40) > 0 ? 0.05 : 0; if (e.windup <= 0) { e.dash = 0.45; e.cx = dx / d; e.cy = dy / d; } return 0; }
      if (e.cd <= 0 && d < 120) { e.windup = 0.4; e.cd = 2.6; }
    } else if (ai === "webber") {
      e.cd -= dt;
      if (e.cd <= 0 && d < 140) { e.cd = 3.2; hostile.push({ x: e.x, y: e.y, vx: dx / d * 80, vy: dy / d * 80, life: d / 80, dmg: 4, web: 1 }); SND.whip(); }
      if (d < 70) return -0.7;
      if (d < 100) return 0.3;
    } else if (ai === "sporer") {
      e.cd -= dt;
      if (e.cd <= 0 && d < 110) { e.cd = 4.2; addZone(e.x, e.y, 22, 3.2, "spore", 4); ring(e.x, e.y, 22, true); }
    } else if (ai === "shell") {
      if (e.shellT > 0) { e.shellT -= dt; if (e.shellT <= 0) { e.spin = 0.9; e.cx = dx / d; e.cy = dy / d; } return 0; }
      if (e.spin > 0) { e.spin -= dt; e.x += e.cx * 130 * dt; e.y += e.cy * 130 * dt; return 0; }
      e.cd -= dt;
      if (e.cd <= 0 && d < 120) { e.cd = 4.5; e.shellT = 1.6; SND.crack(); return 0; }
    } else if (ai === "lunger") {
      if (e.lunge > 0) { e.lunge -= dt; return 3; }
      e.cd -= dt;
      if (e.cd <= 0 && d < 46) { e.cd = 2; e.lunge = 0.25; }
    } else if (ai === "swoop") {
      if (e.sw > 0) { e.sw -= dt; return 2.2; }
      e.cd -= dt;
      if (e.cd <= 0 && d < 110) { e.sw = 0.55; e.cd = 2.4; }
      if (d < 70) return 0.7;
    }
    return 1;
  }
  /* =====================================================================
     Zones au sol (feu, toile, spores), pouvoirs d'élite, patterns des boss
     ===================================================================== */
  var zones = [], ZONE_K = ["fire", "web", "spore", "thorn"];
  function addZone(x, y, rad, dur, kind, dmg) { if (zones.length < 90) zones.push({ x: x, y: y, r: rad, t: 0, dur: dur, kind: kind, dmg: dmg || 0 }); }
  function zoneAt(x, y, kind) { for (var i = 0; i < zones.length; i++) { var z = zones[i]; if (z.kind === kind && Math.hypot(x - z.x, (y - z.y) * 1.25) < z.r) return z; } return null; }
  function updateZones(dt) {
    for (var i = zones.length - 1; i >= 0; i--) {
      var z = zones[i]; z.t += dt;
      if (z.t >= z.dur) { zones.splice(i, 1); continue; }
      if (z.wild) {
        z.wt = (z.wt || 0) - dt;
        if (z.wt <= 0) { z.wt = 0.5; var kw = p; p = me; near(z.x, z.y, z.r + 10, function (e) { if (!e.d.prop && !e.d.boss && Math.hypot(e.x - z.x, (e.y - z.y) * 1.25) < z.r + e.d.r) hurt2(e, 5 * gpw()); }); p = kw; }
        if (!z.spread && z.t > 1.6) { z.spread = 1; if (zones.length < 110 && Math.random() < 0.6) { var wa = Math.random() * TAU; pZone({ x: z.x + Math.cos(wa) * 22, y: z.y + Math.sin(wa) * 18, r: 13, dur: 6, kind: "fire", dmg: 6, wild: 1, gen: (z.gen || 0) + 1 }); } }
      }
      if (z.kind === "mark") {
        z.tick = (z.tick || 0) - dt;
        if (z.tick <= 0 && z.owner) { z.tick = 0.5; var kp = p; p = z.owner; near(z.x, z.y, z.r + 10, function (e) { if (!e.d.prop && !e.under && Math.hypot(e.x - z.x, (e.y - z.y) * 1.25) <= z.r + e.d.r) applyMark(e, z.elem); }); p = kp; }
        continue;
      }
      if (z.kind === "thorn" || (z.owner && z.pdmg)) {
        if (!z.owner) continue;
        z.tick = (z.tick || 0) - dt;
        if (z.cfg && z.cfg.reactive && !z.rDone && z.elem) {
          var trig = false; near(z.x, z.y, z.r + 10, function (e) { if (!e.d.prop && Math.hypot(e.x - z.x, (e.y - z.y) * 1.25) <= z.r + e.d.r) trig = true; });
          if (trig) { z.rDone = 1; var kr = p; p = z.owner; ring(z.x, z.y, z.cfg.reactive, false); near(z.x, z.y, z.cfg.reactive + 10, function (e) { if (e.mark && e.markT > 0 && e.mark !== z.elem && Math.hypot(e.x - z.x, e.y - z.y) < z.cfg.reactive + e.d.r) react(e, e.mark, z.elem, true); }); p = kr; }
        }
        if (z.tick <= 0) {
          z.tick = 0.4; var keep = p; p = z.owner;
          near(z.x, z.y, z.r + 10, function (e) { if (e.d.prop || e.under || Math.hypot(e.x - z.x, (e.y - z.y) * 1.25) > z.r + e.d.r) return; hurt(e, z.pdmg || z.dmg, 0, 0); e.slowT = Math.max(e.slowT, 0.6); e.slow = Math.max(e.slow || 0, e.d.boss ? 0.25 : 0.55); });
          p = keep;
        }
        continue;
      }
      if (z.kind === "web" || !z.dmg) continue;
      for (var j = 0; j < players.length; j++) {
        var pl = players[j];
        if (z.kind === "fire" && (gv(pl, "bra_b") || itn(pl, "ecaille_sala"))) continue;
        if (!pl.down && Math.hypot(pl.x - z.x, (pl.y - z.y) * 1.25) < z.r && cooled(pl, "z" + z.kind, 0.5)) damagePlayer(z.dmg * footMul(pl), pl);
      }
    }
  }
  var AFX = {};
  D.AFFIXES.forEach(function (a, i) { AFX[a.id] = a; a.bit = 1 << i; a.tag = a.name.toUpperCase().replace(/É/g, "E").replace(/È/g, "E"); });
  function hasA(e, id) { return !!(e.aff && e.aff.indexOf(id) >= 0) && !(e.affOff > r.time); }
  function anyItem(id) { for (var i = 0; i < players.length; i++) if (itn(players[i], id)) return players[i]; return null; }
  function giveAffixes(e, n) {
    if (!e || e.d.prop || n <= 0) return e;
    if (nm(8)) n = Math.max(n, 2);
    e.aff = e.aff || [];
    var pool = D.AFFIXES.filter(function (a) { return e.aff.indexOf(a.id) < 0 && !(e.d.boss && a.id === "rapide"); });
    for (var i = 0; i < n && pool.length; i++) e.aff.push(pool.splice((Math.random() * pool.length) | 0, 1)[0].id);
    e.d = Object.assign({}, e.d, { elite: true });
    if (e.d.boss) { e.hp *= 1.25; } else { e.hp *= 2.6; e.dmgMul = (e.dmgMul || 1) * 1.3; }
    e.maxHp = e.hp;
    if (hasA(e, "rapide")) e.spd *= 1.55;
    return e;
  }
  function affixName(e) { return (e.aff || []).map(function (id) { return AFX[id].name.toLowerCase(); }).join(" ") ; }
  function bossTitle(e) { return e.d.name + (e.aff && e.aff.length ? " (" + affixName(e) + ")" : ""); }
  function affixDamage(e, dmg) {
    if (e.shellT > 0) dmg *= 0.15;
    if (hasA(e, "blinde")) dmg *= 0.5;
    if (hasA(e, "epineux") && !itn(p, "sceau_purete") && cooled(e, "thorn", 1.0)) { var o = Math.random(); for (var k = 0; k < 6; k++) hostileShot(e.x, e.y, o + k / 6 * TAU, 70, 6); }
    return dmg;
  }
  function affixTick(e, dt, d) {
    if (hasA(e, "instable") && cooled(e, "instab", 4)) { var ne = ELEM_K.filter(function (x) { return x !== e.elem; }); e.elem = ne[(Math.random() * ne.length) | 0]; burst(e.x, e.y, D.ELEMENTS[e.elem].color, 6); }
    if (r.freeze > 0) return;
    for (var i = 0; i < e.aff.length; i++) {
      var id = e.aff[i];
      if (id === "ardent") { if (cooled(e, "ardent", 0.22)) addZone(e.x, e.y + 2, 8, 2.4, "fire", 5); }
      else if (id === "electrique") { e.ecd = (e.ecd === undefined ? 2 : e.ecd) - dt; if (e.ecd <= 0 && d < 120) { e.ecd = 4; warn(e.x, e.y, 44, 0.8, 12, e, true); SND.zap(); } }
      else if (id === "vampire") e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.01 * dt);
      else if (id === "elementaire") { if (!e.elem) e.elem = ELEM_K[(Math.random() * 4) | 0]; if (cooled(e, "eaura", 0.6)) players.forEach(function (pl) { if (!pl.down && Math.hypot(pl.x - e.x, pl.y - e.y) < 30) damagePlayer(5, pl); }); }
      else if (id === "meneur") { if (cooled(e, "lead", 0.5)) near(e.x, e.y, 80, function (o) { if (o !== e && !o.d.prop) o.buffT = 0.7; }); }
      else if (id === "invocateur") {
        e.icd = (e.icd === undefined ? 3 : e.icd) - dt;
        if (e.icd <= 0 && d < 200 && enemies.length < 200) {
          e.icd = 6.5;
          for (var k = 0; k < 2; k++) {
            var t = e.d.boss || D.ENEMIES[e.type].hp > 30 ? (isDungeon() ? dgPool()[0] : "rat") : e.type;
            var m = spawnAt(t, e.x + Math.random() * 24 - 12, e.y + Math.random() * 16 - 8);
            if (m) { m.room = e.room; m.wander = e.wander; m.awake = true; }
          }
          burst(e.x, e.y, AFX.invocateur.color, 10);
        }
      }
    }
  }
  function bossAI(e, d, dx, dy, dt, mx, my, sp) {
    var p2 = e.hp < e.maxHp * 0.5, k, ang = Math.atan2(dy, dx), tg;
    if (r.freeze > 0) return [mx, my, sp];
    if (e.d.bossAi === "mega_terre") return megaAI(e, d, dx, dy, dt, mx, my, sp);
    if (BOSS5[e.d.bossAi]) return BOSS5[e.d.bossAi](e, d, dx, dy, dt, mx, my, sp, p2, ang);
    switch (e.d.bossAi) {
      case "queen":
        if (d < 90) { var t = -my, u = mx; mx = t * 0.9 - mx * 0.25; my = u * 0.9 - my * 0.25; }
        e.cd -= dt; e.cd2 = (e.cd2 === undefined ? 3 : e.cd2) - dt;
        if (e.cd <= 0) { e.cd = p2 ? 1.5 : 2.3; var n = p2 ? 7 : 5; for (k = 0; k < n; k++) hostileShot(e.x, e.y, ang + (k - (n - 1) / 2) * 0.22, 85, 10); SND.whip(); }
        if (e.cd2 <= 0 && enemies.length < 200) { e.cd2 = p2 ? 4 : 6; for (k = 0; k < (p2 ? 5 : 3); k++) { var w = spawnAt("wasp", e.x + Math.random() * 30 - 15, e.y + Math.random() * 20 - 10); w.room = e.room; w.awake = true; } }
        break;
      case "stag":
        if (e.charge > 0) { e.charge -= dt; mx = e.cx; my = e.cy; sp = 175; if (e.charge <= 0) { warn(e.x, e.y, 46, 0.45, 20, e); } }
        else if (e.windup > 0) { e.windup -= dt; sp = 0; e.flash = Math.sin(e.windup * 40) > 0 ? 0.05 : 0; if (e.windup <= 0) { e.charge = 1.0; e.cx = dx / d; e.cy = dy / d; SND.boom(); } }
        else {
          e.cd -= dt; if (e.cd <= 0 && d < 200) { e.windup = p2 ? 0.45 : 0.7; e.cd = p2 ? 2.6 : 3.6; }
          e.cd2 = (e.cd2 === undefined ? 5 : e.cd2) - dt;
          if (e.cd2 <= 0) { e.cd2 = p2 ? 4.5 : 6.5; tg = targetOf(e); warn(tg.x, tg.y, 22, 1.0, 16); for (k = 0; k < 3; k++) { var a = k / 3 * TAU + Math.random(); warn(tg.x + Math.cos(a) * 32, tg.y + Math.sin(a) * 26, 20, 1.15, 16); } }
        }
        break;
      case "mushking":
        e.cd -= dt; e.cd2 = (e.cd2 === undefined ? 5 : e.cd2) - dt;
        if (e.cd <= 0) {
          e.cd = p2 ? 3 : 4; var off = Math.random();
          for (k = 0; k < 8; k++) warn(e.x + Math.cos(off + k / 8 * TAU) * 52, e.y + Math.sin(off + k / 8 * TAU) * 42, 16, 0.9, 14);
          if (p2) for (k = 0; k < 12; k++) warn(e.x + Math.cos(k / 12 * TAU) * 92, e.y + Math.sin(k / 12 * TAU) * 74, 16, 1.3, 14);
        }
        if (e.cd2 <= 0) {
          e.cd2 = p2 ? 5 : 7; addZone(e.x, e.y, 32, 4, "spore", 4);
          for (k = 0; k < 3 && enemies.length < 200; k++) { var b = spawnAt(Math.random() < 0.5 ? "bombshroom" : "puffball", e.x + Math.random() * 40 - 20, e.y + Math.random() * 30 - 15); b.room = e.room; b.awake = true; }
        }
        break;
      case "bigmole":
        if (e.st === undefined) { e.st = "up"; e.stT = 2; }
        e.stT -= dt;
        if (e.st === "dig") { e.under = true; sp = 100; if (e.stT <= 0 || d < 8) { e.st = "pop"; e.stT = 0.9; warn(e.x, e.y, 38, 0.9, 22, e); } }
        else if (e.st === "pop") { sp = 0; if (e.stT <= 0) { e.st = "up"; e.stT = p2 ? 2 : 2.8; e.under = false; burst(e.x, e.y, "#8a5a3b", 16); var nn = p2 ? 12 : 8, o2 = Math.random(); for (k = 0; k < nn; k++) hostileShot(e.x, e.y, o2 + k / nn * TAU, 70, 10); SND.boom(); } }
        else { sp *= 0.6; if (e.stT <= 0) { e.st = "dig"; e.stT = 2.4; e.under = true; burst(e.x, e.y, "#8a5a3b", 10); } }
        break;
      case "golem":
        if (p2) sp *= 1.4;
        e.cd -= dt; e.cd2 = (e.cd2 === undefined ? 4 : e.cd2) - dt;
        if (e.cd <= 0 && d < 230) { e.cd = p2 ? 2.2 : 3.2; var ux = dx / d, uy = dy / d; for (k = 1; k <= 6; k++) warn(e.x + ux * k * 22, e.y + uy * k * 22, 15, 0.6 + k * 0.08, 18); e.flash = 0.1; SND.boom(); }
        if (e.cd2 <= 0) {
          e.cd2 = p2 ? 4 : 6;
          players.forEach(function (pl) { if (!pl.down) warn(pl.x, pl.y, 20, 1.0, 16); });
          if (p2) { var o3 = Math.random(); for (k = 0; k < 12; k++) hostileShot(e.x, e.y, o3 + k / 12 * TAU, 60, 10); }
        }
        if (p2 && !e.p2done) {
          e.p2done = true; bannerAll("Le Golem s'enrage !"); if (S.opts.shake) shake = 0.4;
          if (isDungeon()) for (k = 0; k < 4; k++) { var ad = spawnAt(dgPool()[(Math.random() * dgPool().length) | 0], e.x + Math.random() * 60 - 30, e.y + Math.random() * 40 - 20); ad.room = e.room; }
        }
        break;
    }
    return [mx, my, sp];
  }
  // contenu étendu : 9 boss ; chacun une attaque à fuir, une à esquiver en Volte et une fenêtre où rester ancré paie (vulnT)
  function opening(e, t, label) { e.vulnT = r.time + t; texts.push({ x: e.x, y: e.y - 24 * (e.scale || 1), n: label || "FAILLE !", life: 1, col: "#f6d36b" }); }
  function bossLine(e, a, n, step, rad, dmg, delay) { for (var k = 1; k <= n; k++) warn(e.x + Math.cos(a) * k * step, e.y + Math.sin(a) * k * step, rad, delay + k * 0.06, dmg); }
  function bossDash(e, dt, spd) { if (e.charge > 0) { e.charge -= dt; e.x += e.cx * spd * dt; e.y += e.cy * spd * dt; return true; } return false; }
  var BOSS5 = {
    b5_castor: function (e, d, dx, dy, dt, mx, my, sp, p2, ang) {
      if (e.vulnT > r.time) return [mx, my, 0];
      if (bossDash(e, dt, 170)) return [mx, my, 0];
      if (e.windup > 0) { e.windup -= dt; e.flash = Math.sin(e.windup * 40) > 0 ? 0.05 : 0; if (e.windup <= 0) { e.charge = 0.8; e.cx = dx / d; e.cy = dy / d; SND.boom(); } return [mx, my, 0]; }
      e.cd = (e.cd === undefined ? 2 : e.cd) - dt; e.cd2 = (e.cd2 === undefined ? 4 : e.cd2) - dt; e.cd3 = (e.cd3 === undefined ? 9 : e.cd3) - dt;
      if (e.cd <= 0) { e.cd = p2 ? 2.2 : 3; for (var k = -1; k <= 1; k++) hostile.push({ x: e.x, y: e.y, vx: Math.cos(ang + k * 0.35) * 60, vy: Math.sin(ang + k * 0.35) * 60, life: 3, dmg: 14, log: 1 }); SND.crack(); }
      if (e.cd2 <= 0 && d < 200) { e.cd2 = p2 ? 3.5 : 5; e.windup = 0.7; fx.push({ kind: "beam", x: e.x, y: e.y, a: ang, len: 160, w: 3, life: 0.7, max: 0.7, col: "255,90,60" }); }
      if (e.cd3 <= 0) { e.cd3 = 10; opening(e, 3, "BARRAGE : FAILLE !"); }
      return [mx, my, sp];
    },
    b5_heron: function (e, d, dx, dy, dt, mx, my, sp, p2, ang) {
      var tg = targetOf(e);
      if (e.vulnT > r.time) return [mx, my, 0];
      e.calmT = tg.anchored ? (e.calmT || 0) + dt : 0;
      if (e.calmT > 1.5) { e.calmT = -4; opening(e, 3, "IL SE POSE !"); return [mx, my, 0]; }
      if (bossDash(e, dt, 200)) { if (e.charge <= 0) warn(e.x, e.y, 26, 0.3, 18, e); return [mx, my, 0]; }
      e.cd = (e.cd === undefined ? 1.5 : e.cd) - dt; e.cd2 = (e.cd2 === undefined ? 4 : e.cd2) - dt;
      if (e.cd <= 0 && d < 200) { e.cd = p2 ? 1.4 : 2.2; var vx = tg.dir && tg.moving ? tg.dir.x * (tg.speed || 60) : 0, vy = tg.dir && tg.moving ? tg.dir.y * (tg.speed || 60) : 0, t = d / 110; hostileShot(e.x, e.y, Math.atan2(tg.y + vy * t - e.y, tg.x + vx * t - e.x), 110, 14); }
      if (e.cd2 <= 0 && d < 180) { e.cd2 = p2 ? 3 : 4.5; e.charge = 0.6; e.cx = dx / d; e.cy = dy / d; warn(tg.x, tg.y, 22, 0.6, 18); }
      if (d < 70) return [-mx, -my, sp];
      return [mx, my, sp];
    },
    b5_silure: function (e, d, dx, dy, dt, mx, my, sp, p2, ang) {
      var tg = targetOf(e);
      if (e.vulnT > r.time) return [mx, my, 0];
      if (e.suckT > 0) { e.suckT -= dt; players.forEach(function (pl) { if (pl.down || pl.anchored) return; var ex = e.x - pl.x, ey = e.y - pl.y, dd = Math.hypot(ex, ey) || 1; if (dd < 160) { pl.x += ex / dd * 45 * dt; pl.y += ey / dd * 45 * dt; } }); if (e.suckT <= 0) { if (players.some(function (pl) { return pl.anchored && !pl.down; })) opening(e, 3, "EXPOSÉ !"); } return [mx, my, 0]; }
      if (e.dive > 0) { e.dive -= dt; e.under = true; if (e.dive <= 0) { e.under = false; e.x = e.ax; e.y = e.ay; burst(e.x, e.y, "#4aa8ff", 14); } return [mx, my, 0]; }
      e.cd = (e.cd === undefined ? 2 : e.cd) - dt; e.cd2 = (e.cd2 === undefined ? 5 : e.cd2) - dt; e.cd3 = (e.cd3 === undefined ? 9 : e.cd3) - dt;
      if (e.cd <= 0) { e.cd = p2 ? 2.4 : 3.2; var o = Math.random(); for (var k = 0; k < 10; k++) hostileShot(e.x, e.y, o + k / 10 * TAU, 55, 10); }
      if (e.cd2 <= 0) { e.cd2 = p2 ? 4 : 5.5; e.dive = 1; e.ax = tg.x; e.ay = tg.y; warn(tg.x, tg.y, 28, 1, 20); for (var b = 0; b < 4; b++) fx.push({ kind: "ring", x: tg.x + Math.random() * 16 - 8, y: tg.y + Math.random() * 12 - 6, r: 5, life: 0.8, max: 0.8, col: "160,220,255" }); }
      if (e.cd3 <= 0) { e.cd3 = 11; e.suckT = 2.5; bannerAll("Le Silure aspire : reste ancré !"); }
      return [mx, my, sp * 0.8];
    },
    b5_ours: function (e, d, dx, dy, dt, mx, my, sp, p2, ang) {
      if (e.vulnT > r.time) return [mx, my, 0];
      if (bossDash(e, dt, 165)) { if (cooled(e, "fireTrail", 0.08)) addZone(e.x, e.y + 3, 9, 2.4, "fire", 6); if (e.charge <= 0 && p2) opening(e, 4, "ÉPUISÉ !"); return [mx, my, 0]; }
      if (e.windup > 0) { e.windup -= dt; e.flash = Math.sin(e.windup * 40) > 0 ? 0.05 : 0; if (e.windup <= 0) { e.charge = 0.9; e.cx = dx / d; e.cy = dy / d; SND.boom(); } return [mx, my, 0]; }
      e.cd = (e.cd === undefined ? 2 : e.cd) - dt; e.cd2 = (e.cd2 === undefined ? 5 : e.cd2) - dt;
      if (e.cd <= 0 && d < 90) { e.cd = p2 ? 1.8 : 2.6; for (var k = -1; k <= 1; k++) warn(e.x + Math.cos(ang + k * 0.5) * 34, e.y + Math.sin(ang + k * 0.5) * 30, 18, 0.6, 18); }
      if (e.cd2 <= 0 && d < 200) { e.cd2 = p2 ? 4 : 5.5; e.windup = 0.7; fx.push({ kind: "beam", x: e.x, y: e.y, a: ang, len: 150, w: 3, life: 0.7, max: 0.7, col: "255,110,40" }); }
      return [mx, my, sp];
    },
    b5_sala_g: function (e, d, dx, dy, dt, mx, my, sp, p2, ang) {
      var tg = targetOf(e);
      if (e.vulnT > r.time) return [mx, my, 0];
      e.cd = (e.cd === undefined ? 2 : e.cd) - dt; e.cd2 = (e.cd2 === undefined ? 4 : e.cd2) - dt; e.cd3 = (e.cd3 === undefined ? 10 : e.cd3) - dt;
      if (e.cd <= 0) { e.cd = p2 ? 2.5 : 3.5; for (var k = 0; k < (p2 ? 4 : 3); k++) { var px = tg.x + (Math.random() - 0.5) * 70, py = tg.y + (Math.random() - 0.5) * 50; warn(px, py, 16, 1.2, 12); addZone(px, py, 16, 4, "fire", 6); } }
      if (e.cd2 <= 0 && d < 200) { e.cd2 = p2 ? 3 : 4.5; bossLine(e, ang, 7, 20, 13, 18, 0.6); e.flash = 0.1; }
      if (e.cd3 <= 0) { e.cd3 = 11; opening(e, 3, "ELLE MUE !"); burst(e.x, e.y, "#ff9a3a", 16); }
      return [mx, my, sp];
    },
    b5_corbeau: function (e, d, dx, dy, dt, mx, my, sp, p2, ang) {
      var tg = targetOf(e);
      if (e.vulnT > r.time) return [mx, my, 0];
      if (e.dive > 0) { e.dive -= dt; e.under = true; if (e.dive <= 0) { e.under = false; e.x = e.ax; e.y = e.ay; burst(e.x, e.y, "#24243a", 14); } return [mx, my, 0]; }
      e.cd = (e.cd === undefined ? 3 : e.cd) - dt; e.cd2 = (e.cd2 === undefined ? 4 : e.cd2) - dt; e.cd3 = (e.cd3 === undefined ? 9 : e.cd3) - dt;
      if (e.cd <= 0 && enemies.length < 220) { e.cd = p2 ? 4 : 6; for (var k = 0; k < (p2 ? 4 : 3); k++) { var j = spawnAt("jackdaw", e.x + Math.random() * 30 - 15, e.y + Math.random() * 20 - 10); j.awake = true; j.room = e.room; } }
      if (e.cd2 <= 0) { e.cd2 = p2 ? 3 : 4.5; e.dive = 1; e.ax = tg.x; e.ay = tg.y; warn(tg.x, tg.y, 24, 1, 22); }
      if (e.cd3 <= 0) { e.cd3 = 10; opening(e, 3, "IL CROASSE : FAILLE !"); }
      return [mx, my, sp];
    },
    b5_pivert: function (e, d, dx, dy, dt, mx, my, sp, p2, ang) {
      if (e.vulnT > r.time) return [mx, my, 0];
      if (bossDash(e, dt, 190)) { if (cooled(e, "peck", 0.12)) warn(e.x, e.y, 14, 0.25, 14); if (e.charge <= 0) opening(e, 3, "COINCÉ !"); return [mx, my, 0]; }
      e.cd = (e.cd === undefined ? 2 : e.cd) - dt; e.cd2 = (e.cd2 === undefined ? 5 : e.cd2) - dt;
      if (e.cd <= 0) { e.cd = p2 ? 2 : 3; var ox = e.x + (Math.random() - 0.5) * 80, oy = e.y + (Math.random() - 0.5) * 60, o = Math.random(); for (var k = 0; k < 8; k++) hostileShot(ox, oy, o + k / 8 * TAU, 65, 10); burst(ox, oy, "#8a5a3b", 8); }
      if (e.cd2 <= 0 && d < 200) { e.cd2 = p2 ? 4 : 6; e.charge = 0.8; e.cx = dx / d; e.cy = dy / d; fx.push({ kind: "beam", x: e.x, y: e.y, a: ang, len: 150, w: 2, life: 0.4, max: 0.4, col: "255,90,60" }); }
      return [mx, my, sp];
    },
    b5_scolo: function (e, d, dx, dy, dt, mx, my, sp, p2, ang) {
      if (e.vulnT > r.time) return [mx, my, 0];
      var lost = 1 - e.hp / e.maxHp, segN = Math.floor(lost * 5);
      if (segN > (e.segs || 0) && enemies.length < 240) { e.segs = segN; for (var k = 0; k < 3; k++) { var sg = spawnAt("caterpillar", e.x + Math.random() * 24 - 12, e.y + Math.random() * 16 - 8); sg.awake = true; sg.room = e.room; } bannerAll("Un segment se détache !"); }
      if (bossDash(e, dt, 180)) return [mx, my, 0];
      e.cd = (e.cd === undefined ? 2 : e.cd) - dt; e.cd2 = (e.cd2 === undefined ? 4 : e.cd2) - dt; e.cd3 = (e.cd3 === undefined ? 9 : e.cd3) - dt;
      if (e.cd <= 0) { e.cd = p2 ? 2.4 : 3.2; var px = -dy / d, py = dx / d; for (var j = -3; j <= 3; j++) warn(e.x + px * j * 18, e.y + py * j * 18, 12, 0.9, 12); }
      if (e.cd2 <= 0 && d < 110) { e.cd2 = p2 ? 2.5 : 3.5; e.charge = 0.35; e.cx = dx / d; e.cy = dy / d; warn(e.x + e.cx * 50, e.y + e.cy * 50, 20, 0.35, 20); }
      if (e.cd3 <= 0) { e.cd3 = 10; opening(e, 3, "ENROULÉE : FAILLE !"); }
      return [mx, my, sp];
    },
    b5_reine_f: function (e, d, dx, dy, dt, mx, my, sp, p2, ang) {
      var tg = targetOf(e);
      if (e.vulnT > r.time) return [mx, my, 0];
      e.cd = (e.cd === undefined ? 3 : e.cd) - dt; e.cd2 = (e.cd2 === undefined ? 2.5 : e.cd2) - dt; e.cd3 = (e.cd3 === undefined ? 10 : e.cd3) - dt;
      if (e.cd <= 0 && enemies.length < 230) { e.cd = p2 ? 4 : 6; var a = Math.random() * TAU, sx = tg.x + Math.cos(a) * 160, sy = tg.y + Math.sin(a) * 120, prev = null; for (var k = 0; k < 10; k++) { var an = spawnAt("ant", sx + k * 4, sy); an.awake = true; an.room = e.room; if (prev) an.follow = prev; prev = an; } }
      if (e.cd2 <= 0 && d < 180) { e.cd2 = p2 ? 2 : 2.8; for (var j = 0; j < 7; j++) hostileShot(e.x, e.y, ang + (j - 3) * 0.2, 80, 12); }
      if (e.cd3 <= 0) { e.cd3 = 11; opening(e, 3, "ELLE POND : FAILLE !"); for (var o = 0; o < 4 && enemies.length < 240; o++) { var ae = spawnAt("ant", e.x + Math.random() * 30 - 15, e.y + Math.random() * 20); ae.awake = true; } }
      return [mx, my, sp * 0.7];
    },
  };
  // silhouette teintée (contour des élites)
  function tinted(s, col, flip) {
    var key = col + (flip ? "f" : ""); s.tints = s.tints || {};
    if (!s.tints[key]) {
      var c = document.createElement("canvas"); c.width = s.w; c.height = s.h;
      var g = c.getContext("2d"); g.drawImage(flip ? s.f : s.c, 0, 0);
      g.globalCompositeOperation = "source-in"; g.fillStyle = col; g.fillRect(0, 0, s.w, s.h);
      s.tints[key] = c;
    }
    return s.tints[key];
  }
  function drawEliteFx(e, spr, flip) {
    var a0 = AFX[e.aff[0]], col = a0.color, x = Math.round(e.x - spr.w / 2), y = Math.round(e.y - spr.h / 2);
    var pulse = 0.6 + 0.4 * Math.sin(r.time * 7 + e.id);
    if (hasA(e, "glacial")) { ctx.strokeStyle = "rgba(143,216,255,.28)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(Math.round(e.x), Math.round(e.y), 46, 37, 0, 0, TAU); ctx.stroke(); }
    if (hasA(e, "blinde")) { ctx.strokeStyle = "rgba(192,200,208," + (0.4 + 0.3 * pulse) + ")"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(Math.round(e.x), Math.round(e.y), Math.max(spr.w, spr.h) / 2 + 4, r.time * 2, r.time * 2 + 2.2); ctx.stroke(); }
    ctx.globalAlpha = pulse;
    var t = tinted(spr, col, flip);
    ctx.drawImage(t, x - 1, y); ctx.drawImage(t, x + 1, y); ctx.drawImage(t, x, y - 1); ctx.drawImage(t, x, y + 1);
    if (e.aff[1]) { var t2 = tinted(spr, AFX[e.aff[1]].color, flip); ctx.globalAlpha = pulse * 0.8; ctx.drawImage(t2, x - 1, y - 1); ctx.drawImage(t2, x + 1, y + 1); }
    ctx.globalAlpha = 1;
    if (fx.length < 400 && Math.random() < 0.35) {
      var id = e.aff[(Math.random() * e.aff.length) | 0], c2 = AFX[id].color;
      var vy = id === "ardent" ? -22 : id === "glacial" ? 8 : id === "vampire" ? 14 : -10;
      fx.push({ kind: "dot", x: e.x + Math.random() * spr.w - spr.w / 2, y: e.y + Math.random() * spr.h - spr.h / 2, vx: id === "electrique" ? Math.random() * 40 - 20 : 0, vy: vy, life: 0.35 + Math.random() * 0.3, color: c2 });
    }
  }
  function drawEliteTag(e, spr) {
    if (e.d.boss) return;
    e.aff.forEach(function (id, i) { drawText(AFX[id].tag, e.x, e.y - spr.h / 2 - 7 - i * 7, AFX[id].color, "c"); });
  }
  function drawZones() {
    zones.forEach(function (z) {
      var k = 1 - z.t / z.dur, x = Math.round(z.x), y = Math.round(z.y);
      if (z.kind === "fire") {
        ctx.fillStyle = "rgba(255,110,30," + (0.25 * k + 0.1) + ")"; ctx.beginPath(); ctx.ellipse(x, y, z.r, z.r * 0.8, 0, 0, TAU); ctx.fill();
        for (var i = 0; i < 3; i++) { var h = hash(x + i, y + ((r.time * 12) | 0)); ctx.fillStyle = i ? "#ffb040" : "#ff6a20"; ctx.fillRect(x - z.r / 2 + h % Math.max(1, z.r | 0), y - 2 - (h >>> 3) % 4, 2, 2 + (h >>> 5) % 3); }
      } else if (z.kind === "thorn") {
        var gk = Math.min(1, z.t * 6);
        ctx.fillStyle = "rgba(60,90,40," + (0.35 * k) + ")"; ctx.beginPath(); ctx.ellipse(x, y, z.r, z.r * 0.8, 0, 0, TAU); ctx.fill();
        for (var tn = 0; tn < 7; tn++) { var th = hash(x + tn * 7, y), tx = x - z.r * 0.7 + th % Math.max(1, Math.round(z.r * 1.4)), ty2 = y - z.r * 0.4 + (th >>> 4) % Math.max(1, Math.round(z.r * 0.8)), hh = Math.round((4 + (th >>> 8) % 5) * gk);
          ctx.fillStyle = "#3a5a2a"; ctx.fillRect(tx, ty2 - hh, 2, hh); ctx.fillStyle = "#8aba5a"; ctx.fillRect(tx, ty2 - hh, 1, 1); ctx.fillStyle = "#d0281a"; if (tn % 3 === 0) ctx.fillRect(tx + 1, ty2 - hh + 1, 1, 1); }
      } else if (z.kind === "hole") {
        ctx.fillStyle = "rgba(30,70,110,.75)"; ctx.beginPath(); ctx.ellipse(x, y, z.r, z.r * 0.7, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "rgba(232,248,255,.8)"; ctx.stroke();
      } else if (z.kind === "mud") {
        ctx.fillStyle = "rgba(110,80,40," + (0.3 * k + 0.08) + ")"; ctx.beginPath(); ctx.ellipse(x, y, z.r, z.r * 0.8, 0, 0, TAU); ctx.fill();
      } else if (z.kind === "mark") {
        ctx.globalAlpha = 0.2 * k + 0.08; ctx.fillStyle = (D.ELEMENTS[z.elem] || {}).color || "#fdf3de"; ctx.beginPath(); ctx.ellipse(x, y, z.r, z.r * 0.8, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.5 * k; ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;
      } else if (z.kind === "web") {
        ctx.strokeStyle = "rgba(235,230,245," + (0.5 * k + 0.2) + ")"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(x, y, z.r, z.r * 0.8, 0, 0, TAU); ctx.ellipse(x, y, z.r * 0.55, z.r * 0.45, 0, 0, TAU); ctx.stroke();
        ctx.beginPath(); for (var j = 0; j < 4; j++) { var a = j / 4 * Math.PI; ctx.moveTo(x - Math.cos(a) * z.r, y - Math.sin(a) * z.r * 0.8); ctx.lineTo(x + Math.cos(a) * z.r, y + Math.sin(a) * z.r * 0.8); } ctx.stroke();
      } else {
        ctx.fillStyle = "rgba(140,200,70," + (0.28 * k + 0.08) + ")"; ctx.beginPath(); ctx.ellipse(x, y, z.r, z.r * 0.8, 0, 0, TAU); ctx.fill();
        for (var m = 0; m < 3; m++) { var hh = hash(x * 3 + m, y); ctx.fillStyle = "rgba(200,240,140," + k + ")"; ctx.fillRect(x - z.r / 2 + hh % Math.max(1, z.r | 0), y - z.r * 0.3 + (hh >>> 4) % Math.max(1, (z.r * 0.6) | 0) - ((r.time * 6 + m) % 4), 2, 2); }
      }
    });
  }
  // ralentissements au sol pour le joueur local (toiles, aura glaciale)
  function slowMul(pl) {
    var m = 1;
    if (pl.wetT > 0) { pl.wetT -= 1 / 60; m *= 0.8; }
    if (waterAt(pl.x, pl.y + 3)) m *= 0.8;
    if (zones.length && zoneAt(pl.x, pl.y + 3, "hole")) m *= 0.5;
    var wz = zones.length ? zoneAt(pl.x, pl.y + 3, "web") : null;
    if (wz && itn(pl, "ciseaux")) { zones.splice(zones.indexOf(wz), 1); pl.hp = Math.min(pl.maxHp, pl.hp + itn(pl, "ciseaux")); burst(pl.x, pl.y, "#ebe6f5", 5); wz = null; }
    if (wz && !(itn(pl, "patin") && pl.mstate === "mouvement")) m *= 0.5;
    for (var i = 0; i < enemies.length; i++) { var e = enemies[i]; if (e.aff && !e.dead && hasA(e, "glacial") && Math.abs(e.x - pl.x) < 46 && Math.hypot(e.x - pl.x, (e.y - pl.y) * 1.25) < 46) { m *= 0.65; break; } }
    return m;
  }
  /* =====================================================================
     Objets à effets (façon roguelite) : déclencheurs au coup, à la mort, au dégât
     ===================================================================== */
  var ITM = {}, procLock = false;
  D.ITEMS.forEach(function (it, i) { ITM[it.id] = it; it.idx = i; });
  function itn(pl, id) { return (pl.items && pl.items[id]) || 0; }
  function rollItem(minR, luck, pool0) {
    if (pool0) { var pl0 = D.ITEMS.filter(function (it) { return it.pool === pool0 && (!it.from || D.ENEMIES[it.from]); }); return pl0[(Math.random() * pl0.length) | 0]; }
    var L = luck || 1, pool = [], tot = 0;
    var dk = me && me.ring && me.ring.tenebres ? 2 : 1;
    D.RARITIES.forEach(function (ra, i) { if (i < (minR || 0)) return; var w = ra.weight * (i ? L : 1) * (i >= 2 ? dk : 1); pool.push([i, w]); tot += w; });
    var x = Math.random() * tot, ri = pool[pool.length - 1][0];
    for (var k = 0; k < pool.length; k++) { x -= pool[k][1]; if (x <= 0) { ri = pool[k][0]; break; } }
    var list = D.ITEMS.filter(function (it) { return it.r === ri && !it.pool && allowed(it) && (!it.expe || isExpe()) && (!it.quest || (S.quests && S.quests[it.quest])); });
    return list[(Math.random() * list.length) | 0];
  }
  function dropItem(x, y, minR) { var it = rollItem(minR, p ? p.luck : 1); drop("item", x, y, it.idx); }
  function giveItem(pl, id) {
    var it = ITM[id]; if (!it) return;
    if (pl.owner) pl = pl.owner;
    pl.items = pl.items || {}; pl.items[id] = (pl.items[id] || 0) + 1;
    S.stats.seenI = S.stats.seenI || {}; S.stats.seenI[id] = 1;
    players.forEach(function (o) { if (o !== pl && !o.down && itn(o, "echarpe")) o.hp = Math.min(o.maxHp, o.hp + 5 * itn(o, "echarpe")); });
    if (id === "seve_pure" && r.ex) r.seveTo = r.ex.floor + 1;
    if (id === "phenix" || id === "nid") pl.revives = (pl.revives || 0) + 1;
    calc(pl); if (pl.owner) calc(pl.owner);
    if (pl === me || pl.owner === me) itemToast(it, pl.items[id]);
    netEv(["it", pl.id, id]);
  }
  function itemToast(it, n) {
    var ra = D.RARITIES[it.r], box = $("[data-toasts]");
    if (it.r >= 2) SND.fusion(); else SND.level();
    if (!box) return;
    var el = document.createElement("div");
    el.className = "game-toast item-toast r" + it.r; el.style.setProperty("--rc", ra.color);
    el.innerHTML = "<strong>" + it.icon + " " + esc(it.name) + (n > 1 ? " ×" + n : "") + "</strong><span><em>" + ra.name + "</em> · " + esc(it.desc) + "</span>";
    box.appendChild(el);
    setTimeout(function () { el.classList.add("out"); }, 3200);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3800);
  }
  // multiplicateurs de dégâts (attaquant « p »)
  function itemDmg(e, dmg) {
    var n = itn(p, "fourche"); if (n && e.hp >= e.maxHp * 0.9) dmg *= 1 + 0.5 * n;
    if (p.rageMul) dmg *= 1 + p.rageMul;
    return dmg;
  }
  function onHitProcs(e) {
    if (procLock || !p.items || e.d.prop) return;
    procLock = true;
    var n, st = p.anchored && itn(p, "statuette") ? 1 + 0.5 * itn(p, "statuette") : 1, Math = MATH_PROC(st);
    if ((n = itn(p, "bonheur")) && Math.random() < 0.06) { addGold(n); if (S.opts.numbers && texts.length < 60) texts.push({ x: e.x, y: e.y - 10, n: "+" + n, life: 0.6 }); }
    if ((n = itn(p, "gluant")) && Math.random() < 0.1) { e.slowT = Math.max(e.slowT, 2); e.slow = Math.max(e.slow || 0, e.d.boss ? 0.3 : 0.6); }
    if ((n = itn(p, "givre")) && Math.random() < Math.min(0.3, 0.06 * n)) { e.slowT = Math.max(e.slowT, 1.5); e.slow = e.d.boss ? 0.5 : 1; burst(e.x, e.y, "#a8e0ff", 5); }
    if ((n = itn(p, "tique")) && Math.random() < 0.2) p.hp = Math.min(p.maxHp, p.hp + n);
    if ((n = itn(p, "talisman")) && Math.random() < 0.1) { var al = partnerOf(p); if (al) { al.hp = Math.min(al.maxHp, al.hp + 3 * n); burst(al.x, al.y, "#ff9aa0", 4); } }
    if (!e.dead && (n = itn(p, "pile")) && Math.random() < 0.1) zapChain(e, 3, 25 * n, { x: e.x, y: e.y - 10 });
    if ((n = itn(p, "missile")) && Math.random() < 0.1) {
      var a = Math.atan2(e.y - p.y, e.x - p.x);
      projs.push({ owner: p, kind: "bullet", x: p.x, y: p.y - 4, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, dmg: 30 * n, pierce: 1, sprite: "pinecone", life: 2.2, hit: [], r: 4, homing: true });
    }
    if ((n = itn(p, "meteore")) && Math.random() < 0.04) lobs.push({ owner: p, sx: e.x, sy: e.y, tx: e.x, ty: e.y, t: 0, dur: 0.6, dmg: 150 * n, rad: 30 * p.area, frag: 0, sprite: "meteore", sky: true });
    procLock = false;
  }
  function MATH_PROC(st) { if (st === 1) return window.Math; var o = Object.create(window.Math); o.random = function () { return window.Math.random() / st; }; return o; }
  function onKillProcs(e) {
    if (!p || !p.items || e.d.prop) return;
    var n;
    if ((n = itn(p, "baies"))) p.hp = Math.min(p.maxHp, p.hp + n);
    if ((n = itn(p, "pacte_calice"))) p.hp = Math.min(p.maxHp, p.hp + 3 * n);
    if ((n = itn(p, "lune")) && Math.random() < 0.04 * n) drop("berry", e.x, e.y);
    if ((n = itn(p, "follet")) && !procLock) { procLock = true; explode(e.x, e.y, 22 * p.area, 20 * n); procLock = false; }
  }
  // chaque image, pour chaque joueur (hôte) : totem, rage, bouclier
  function itemTick(pl, dt) {
    if (!pl.items) return;
    var n;
    if ((n = itn(pl, "rage"))) { var c = 0; near(pl.x, pl.y, 60, function (e) { if (!e.d.prop && c < 8) c++; }); pl.rageMul = Math.min(0.32 * n, 0.04 * n * c); }
    if ((n = itn(pl, "totem"))) {
      pl.totemT = (pl.totemT === undefined ? 3 : pl.totemT) - dt;
      if (pl.totemT <= 0) { pl.totemT = 3; var t = nearest(4, 140, pl); if (t.length) { var tg = t[(Math.random() * t.length) | 0]; zapChain(tg, 1, 45 * n, { x: tg.x, y: tg.y - 70 }); SND.zap(); } }
    }
    if ((n = itn(pl, "lumiere"))) { pl.lightT = (pl.lightT === undefined ? 4 : pl.lightT) - dt; if (pl.lightT <= 0) { pl.lightT = 4; var kp = p; p = pl; fireNova(60 * pl.area, 60 * n); p = kp; } }
    if ((n = itn(pl, "pomme"))) { pl.calmT = (pl.calmT || 0) + dt; if (pl.calmT >= 4 && !(pl.oshield > 0)) { pl.oshield = pl.maxHp * 0.1 * n; burst(pl.x, pl.y, "#9cc56b", 6); } }
    itemTick2(pl, dt);
  }
  // contenu étendu : objets à effets continus
  function itemTick2(pl, dt) {
    var n, kp = p, mv = pl.mstate === "mouvement", step = pl.ix === undefined ? 0 : Math.min(20, Math.hypot(pl.x - pl.ix, pl.y - pl.iy));
    p = pl;
    pl.tamT = Math.max(0, (pl.tamT || 0) - dt); pl.banT = Math.max(0, (pl.banT || 0) - dt); pl.ccT = Math.max(0, (pl.ccT || 0) - dt); pl.feinteT = Math.max(0, (pl.feinteT || 0) - dt);
    if ((n = itn(pl, "contrat_cendres"))) { if (pl.lastHp !== undefined && pl.hp > pl.lastHp && !pl.down) pl.hp = pl.lastHp; pl.lastHp = pl.hp; }
    if ((n = itn(pl, "cloche_pierre")) && pl.anchored && timer("__cloche", 5, dt)) { ring(pl.x, pl.y, 50, false); near(pl.x, pl.y, 60, function (e) { if (!e.d.prop && !e.d.boss && Math.hypot(e.x - pl.x, e.y - pl.y) < 50 + e.d.r) { e.stunT = 0.5; e.slowT = 0.5; e.slow = 1; } }); SND.click(); }
    if ((n = itn(pl, "fil_ariane"))) {
      pl.trail = pl.trail || []; if (mv && cooled(pl, "trail", 0.1)) pl.trail.push({ x: pl.x, y: pl.y, t: r.time });
      while (pl.trail.length && r.time - pl.trail[0].t > 2) pl.trail.shift();
      if (pl.trail.length && cooled(pl, "trailg", 0.2)) gems.forEach(function (g) { if (g.kind !== "xp" || g.pull) return; for (var i = 0; i < pl.trail.length; i += 2) if (Math.abs(g.x - pl.trail[i].x) < 12 && Math.abs(g.y - pl.trail[i].y) < 12) { g.pull = 150; break; } });
    }
    if (mv && step) {
      pl.distI = (pl.distI || 0) + step;
      if ((n = itn(pl, "gland_roulant")) && (pl.dGl = (pl.dGl || 0) + step) >= 200) { pl.dGl = 0; var t = nearest(1, 150)[0]; if (t) { var a = Math.atan2(t.y - pl.y, t.x - pl.x); projs.push({ owner: pl, kind: "bullet", x: pl.x, y: pl.y + 2, vx: Math.cos(a) * 130, vy: Math.sin(a) * 130, dmg: 20 * n * gpw(), pierce: 2, sprite: "acorn", anim: true, life: 1.4, hit: [], r: 4, explode: 0 }); } }
      if ((n = itn(pl, "dynamo")) && (pl.dDy = (pl.dDy || 0) + step) >= 500) { pl.dDy = 0; var worst = null; techEntries(pl).forEach(function (en) { var tv = pl.timers[en.key]; if (tv > 0 && (!worst || tv > pl.timers[worst])) worst = en.key; }); if (worst) { pl.timers[worst] = 0; burst(pl.x, pl.y, "#f6d36b", 6); } }
    }
    if ((n = itn(pl, "comete_poche")) && mv && timer("__comete", 4, dt) && pl.dir) { explode(pl.x - pl.dir.x * 22, pl.y - pl.dir.y * 18, 26 * pl.area, 40 * n * gpw(), 0); }
    if ((n = itn(pl, "tambour")) && timer("__tambour", 10, dt)) { ring(pl.x, pl.y, 120, false); players.forEach(function (o) { if (!o.down && Math.hypot(o.x - pl.x, o.y - pl.y) < 120) o.tamT = 3; }); }
    if ((n = itn(pl, "banniere")) && pl.anchored) players.forEach(function (o) { if (o !== pl && !o.down && Math.hypot(o.x - pl.x, o.y - pl.y) < 60) o.banT = 0.3; });
    if ((n = itn(pl, "sauna")) && zones.some(function (z) { return z.steam && z.owner === pl && Math.hypot(pl.x - z.x, (pl.y - z.y) * 1.25) < z.r; })) pl.hp = Math.min(pl.maxHp, pl.hp + 2 * n * dt);
    if ((n = itn(pl, "perle_marais"))) { var wz = zoneAt(pl.x, pl.y + 3, "mark"); if ((wz && wz.elem === "eau") || zoneAt(pl.x, pl.y + 3, "mud") || (isDungeon() && puddleAt(pl.x, pl.y + 3))) pl.hp = Math.min(pl.maxHp, pl.hp + 3 * n * dt); }
    if ((n = itn(pl, "colonne_fourmis"))) { pl.antTrail = pl.antTrail || []; if (cooled(pl, "antT", 0.15)) pl.antTrail.push({ x: pl.x, y: pl.y + 3, t: r.time }); while (pl.antTrail.length && r.time - pl.antTrail[0].t > 1.5) pl.antTrail.shift();
      if (cooled(pl, "antB", 0.5)) pl.antTrail.forEach(function (q, qi) { if (qi % 2) return; near(q.x, q.y, 14, function (e) { if (!e.d.prop && Math.hypot(e.x - q.x, e.y - q.y) < 7 + e.d.r && cooled(e, "antbite", 0.5)) hurt(e, 5 * n * gpw(), 0, 0); }); }); }
    if ((n = itn(pl, "racine_ancestrale")) && pl.anchored) pl.hp = Math.min(pl.maxHp, pl.hp + pl.maxHp * 0.02 * n * dt);
    if ((n = itn(pl, "couronne_eclairs")) && timer("__eclairs", 2, dt)) { var big = null; enemies.forEach(function (e) { if (!e.dead && !e.d.prop && !e.under && inView(e, 0) && (!big || e.hp > big.hp)) big = e; }); if (big) { var hk = HIT_ELEM; HIT_ELEM = "air"; zapChain(big, 1, 60 * n * gpw(), { x: big.x, y: big.y - 90 }); HIT_ELEM = hk; SND.zap(); } }
    if ((n = itn(pl, "corde_rappel")) && isExpe() && !r.cordeUsed && !r.ended) { if (pl.anchored) { pl.cordeT = (pl.cordeT || 0) + dt; if (pl.cordeT >= 10) { r.cordeUsed = 1; extract({ k: "x_perm" }); } } else pl.cordeT = 0; }
    var al = pl.comp && pl.comp.__corne;
    if (al) for (var i = al.length - 1; i >= 0; i--) {
      var c = al[i]; c.life -= dt; c.cd -= dt; c.anim += dt * 6; if (c.life <= 0) { burst(c.x, c.y, "#b07cf0", 6); al.splice(i, 1); continue; }
      var tg = nearest(1, 160, c)[0]; if (!tg) continue;
      var dx = tg.x - c.x, dy = tg.y - c.y, dd = Math.hypot(dx, dy) || 1; c.face = dx > 0 ? 1 : -1;
      if (dd > 10) { c.x += dx / dd * 70 * dt; c.y += dy / dd * 70 * dt; } else if (c.cd <= 0) { c.cd = 0.6; hurt(tg, 12 * gpw(), 0, 0); }
    }
    pl.ix = pl.x; pl.iy = pl.y;
    p = kp;
  }
  function syncTwins() {
    for (var i = 0; i < players.length; i++) {
      var t = players[i]; if (!t.twin || !t.owner) continue;
      var o = t.owner, ch = t.weapons !== o.weapons || t.passives !== o.passives || t.items !== o.items || t.relics !== o.relics;
      ch = ch || t.devil !== o.devil;
      t.weapons = o.weapons; t.passives = o.passives; t.items = o.items; t.relics = o.relics; t.consumed = o.consumed; t.bonusHp = o.bonusHp; t.devil = o.devil;
      t.arme = o.arme; t.evo = o.evo; t.tfus = o.tfus; t.cparts = o.cparts; t.amu = o.amu; t.epts = o.epts;
      if (ch || (t.syncT = (t.syncT || 0) - 1) <= 0) { t.syncT = 30; calc(t); }
    }
  }
  // déplacement local du jumeau : formation derrière, ou commandes directes si l'autre est à terre
  function moveTwin(tw, v, dt) {
    tw.choosing = me.choosing;
    if (tw.down) { tw.moving = false; return; }
    var vx, vy;
    if (me.down) { vx = v.x * tw.speed; vy = v.y * tw.speed; }
    else {
      var tx = me.twinBehind && me.dir ? me.x - me.dir.x * 16 : me.x - (me.face || 1) * 16, ty = me.twinBehind && me.dir ? me.y - me.dir.y * 16 : me.y + 5, dx = tx - tw.x, dy = ty - tw.y;
      vx = v.x * me.speed + dx * 4; vy = v.y * me.speed + dy * 4;
      if (me.posture === "miroir" && !me.anchored) { var md = Math.hypot(me.x - tw.x, me.y - tw.y); vx = -v.x * me.speed + (md > 110 ? (me.x - tw.x) * 2 : 0); vy = -v.y * me.speed + (md > 110 ? (me.y - tw.y) * 2 : 0); }
      var sp = Math.hypot(vx, vy), cap = tw.speed * 1.35; if (sp > cap) { vx *= cap / sp; vy *= cap / sp; }
    }
    // rattrapage : coincé derrière un mur ou trop loin
    if (!me.down && Math.hypot(me.x - tw.x, me.y - tw.y) > 90) { tw.x = me.x - (me.face || 1) * 10; tw.y = me.y + 3; burst(tw.x, tw.y, "#fdf3de", 5); }
    var nx = tw.x + vx * dt, ny = tw.y + vy * dt;
    if (isDungeon()) { dungeonMove(tw, nx, ny); dungeonFeet(tw, dt); }
    else { tw.x = nx; tw.y = ny; pushOutGiants(tw, 5); }
    clampArena(tw, 8);
    tw.tx = tw.x; tw.ty = tw.y;
    tw.moving = Math.abs(vx) + Math.abs(vy) > 6;
    if (vx > 4) tw.face = 1; else if (vx < -4) tw.face = -1;
  }
  function teamTick(pl, dt) {
    if (pl.rallyT > 0) pl.rallyT -= dt;
    if (pl.corT > 0) pl.corT -= dt;
    if (players.length < 2) { pl.packN = 0; return; }
    var n = 0, heal = 0.3 * ((pl.passives && pl.passives.entraide) || 0);
    players.forEach(function (o) {
      if (o === pl || o.down || Math.abs(o.x - pl.x) > 80 || Math.hypot(o.x - pl.x, o.y - pl.y) > 80) return;
      n++;
      if (heal) o.hp = Math.min(o.maxHp, o.hp + heal * dt);
    });
    pl.packN = n;
  }
  function drawItemsHud(y0) {
    var it = me.items; if (!it) return;
    var x = 2, per = Math.max(6, Math.floor((W * 0.55) / 11)), cnt = 0;
    ctx.font = "7px sans-serif"; ctx.textBaseline = "top";
    Object.keys(it).forEach(function (id) {
      var d = ITM[id]; if (!d) return;
      if (cnt && cnt % per === 0) { x = 2; y0 += 11; }
      cnt++;
      ctx.fillStyle = "rgba(20,14,10,.55)"; ctx.fillRect(x, y0, 10, 10);
      ctx.fillStyle = D.RARITIES[d.r].color; ctx.fillRect(x, y0 + 9, 10, 1);
      ctx.fillText(d.icon, x + 1, y0 + 1);
      if (it[id] > 1) drawText(String(it[id]), x + 10, y0 + 6, "#fdf3de", "r");
      x += 11;
    });
    ctx.textBaseline = "alphabetic";
  }
  /* =====================================================================
     Grands décors des cartes : arbres, champignons géants, rochers (collision)
     ===================================================================== */
  var GC = 120, giantCache = {}, giantSeed = 0;
  function giantAt(cx, cy) {
    var key = cx + "," + cy;
    if (giantCache[key] !== undefined) return giantCache[key];
    var h = hash(cx * 7 + 13 + giantSeed, cy * 11 - giantSeed) >>> 0, g = null;
    var x = cx * GC + 20 + (h % 80), y = cy * GC + 20 + ((h >>> 8) % 80);
    if (Math.abs(x) > 80 || Math.abs(y) > 70) {
      var b = MAP.biomes[biomeAtTile(Math.floor(x / 16), Math.floor(y / 16))];
      if (b && b.giant && ((h >>> 16) % 1000) / 1000 < b.giantD) g = { x: x, y: y, k: b.giant, r: b.giant === "rock" ? 11 : b.giant === "shroom" ? 7 : b.giant === "roots" ? 11 : 6, v: (h >>> 4) % 3, gr: b.ground, ph: (h >>> 9) % 2 };
      else if (b && strataN() === 2 && ((h >>> 16) % 1000) < 200) g = { x: x, y: y, k: "roots", r: 11, v: (h >>> 4) % 3, gr: b.ground, ph: (h >>> 9) % 2 };
    }
    giantCache[key] = g;
    return g;
  }
  function useGiants() { return !isArena() && !isDungeon() && MAP && MAP.biomes; }
  function rootsOn(g) { var per = MAP.mech === "roots" ? 120 : 90; return (Math.floor(stageTime() / per) + (g.ph || 0)) % 2 === 0; }
  function strataN() { if (!r || !isExpe() || !r.ex) return 0; var f = r.ex.floor, n = 0; (D.STRATA || []).forEach(function (st, i) { if (f >= st.from) n = i; }); return n; }
  function pushOutGiants(o, rad) {
    if (!useGiants()) return;
    var cx = Math.floor(o.x / GC), cy = Math.floor(o.y / GC);
    for (var i = -1; i <= 1; i++) for (var j = -1; j <= 1; j++) {
      var g = giantAt(cx + i, cy + j); if (!g || (g.k === "roots" && !rootsOn(g))) continue;
      var dx = o.x - g.x, dy = (o.y - g.y) * 1.4, d = Math.hypot(dx, dy), lim = g.r + rad;
      if (d < lim) { if (d < 0.01) { dx = 1; d = 1; } o.x = g.x + dx / d * lim; o.y = g.y + dy / d * lim / 1.4; }
    }
  }
  function visibleGiants(cx0, cy0) {
    var out = [];
    for (var cx = Math.floor((cx0 - 60) / GC); cx <= Math.floor((cx0 + W + 60) / GC); cx++)
      for (var cy = Math.floor((cy0 - 40) / GC); cy <= Math.floor((cy0 + H + 90) / GC); cy++) { var g = giantAt(cx, cy); if (g) out.push(g); }
    return out;
  }
  function drawGiantBases(list) {
    list.forEach(function (g) {
      var x = Math.round(g.x), y = Math.round(g.y), gr = g.gr || {};
      ctx.fillStyle = "rgba(10,20,10,.2)";
      ctx.beginPath(); ctx.ellipse(x + 2, y + 2, g.k === "rock" ? 15 : g.k === "shroom" ? 18 : 26, g.k === "rock" ? 6 : 7, 0, 0, TAU); ctx.fill();
      if (g.k === "roots") {
        var on = rootsOn(g), hh = on ? 16 : 4;
        ctx.fillStyle = "#3a2418"; ctx.beginPath(); ctx.ellipse(x, y - 2, 13, 6, 0, 0, TAU); ctx.fill();
        for (var ri = 0; ri < 6; ri++) { var rx = x - 11 + ri * 4 + (hash(x + ri, y) % 3), rh = hh - (ri % 3) * (on ? 3 : 1); ctx.fillStyle = ri % 2 ? "#6b4430" : "#8a5a3b"; ctx.fillRect(rx, y - rh, 3, rh); if (on) { ctx.fillStyle = "#5a8a3a"; ctx.fillRect(rx, y - rh, 2, 1); } }
        if (on) { ctx.strokeStyle = "#4a2e1e"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 12, y - 8); ctx.quadraticCurveTo(x, y - 20, x + 12, y - 8); ctx.stroke(); ctx.lineWidth = 1; }
      } else if (g.k === "tree") {
        ctx.fillStyle = "#4a2e1e"; ctx.fillRect(x - 5, y - 22, 10, 24);
        ctx.fillStyle = "#6b4430"; ctx.fillRect(x - 4, y - 22, 6, 24);
        ctx.fillStyle = "#8a5a3b"; ctx.fillRect(x - 3, y - 20, 1, 18);
        ctx.fillStyle = "#4a2e1e"; ctx.fillRect(x - 8, y, 4, 2); ctx.fillRect(x + 4, y, 4, 2); ctx.fillRect(x - 1, y - 12, 2, 3);
      } else if (g.k === "shroom") {
        ctx.fillStyle = "#c9b88a"; ctx.fillRect(x - 5, y - 18, 10, 20);
        ctx.fillStyle = "#e8dcb4"; ctx.fillRect(x - 4, y - 18, 6, 20);
        ctx.fillStyle = "#c9b88a"; ctx.fillRect(x - 6, y, 12, 2);
      } else {
        var c1 = gr.rock || "#7a7068", c2 = gr.rockHi || "#a89e94";
        ctx.fillStyle = "#3a3430"; ctx.beginPath(); ctx.ellipse(x, y - 4, 14, 10, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(x, y - 5, 13, 9, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = c2; ctx.fillRect(x - 7, y - 11, 6, 2); ctx.fillRect(x - 9, y - 9, 3, 3);
        ctx.fillStyle = "#3a3430"; ctx.fillRect(x + 2, y - 6, 1, 4); ctx.fillRect(x + 3, y - 3, 3, 1);
        if (g.v === 0) { ctx.fillStyle = "#5f8a44"; ctx.fillRect(x - 4, y - 13, 5, 2); }
      }
    });
  }
  function drawGiantTops(list) {
    list.forEach(function (g) {
      if (g.k === "rock" || g.k === "roots") return;
      var x = Math.round(g.x), y = Math.round(g.y), gr = g.gr || {};
      var under = players.some(function (pl) { return Math.abs(pl.x - x) < 26 && pl.y < y + 2 && pl.y > y - (g.k === "tree" ? 56 : 34); });
      ctx.globalAlpha = under ? 0.45 : 1;
      if (g.k === "tree") {
        var dk = gr.bush || gr.tuft || "#3f6b3a", md = gr.bushHi || gr.patch || "#5b8a4a", hi = gr.hi || "#86b56c", R = 22 + g.v * 3, ty = y - 34;
        ctx.fillStyle = dk;
        [[0, 0, R], [-R * 0.7, 6, R * 0.6], [R * 0.7, 5, R * 0.62], [0, -R * 0.55, R * 0.65]].forEach(function (c) { ctx.beginPath(); ctx.arc(x + c[0], ty + c[1], c[2], 0, TAU); ctx.fill(); });
        ctx.fillStyle = md;
        [[-3, -3, R * 0.75], [-R * 0.55, 2, R * 0.45], [R * 0.5, 0, R * 0.45]].forEach(function (c) { ctx.beginPath(); ctx.arc(x + c[0], ty + c[1], c[2], 0, TAU); ctx.fill(); });
        ctx.fillStyle = hi;
        for (var i = 0; i < 14; i++) { var h = hash(x + i * 3, y - i); ctx.fillRect(x - R * 0.7 + h % Math.round(R * 1.2), ty - R * 0.7 + (h >>> 5) % Math.round(R * 0.9), 2, 2); }
        ctx.fillStyle = dk; for (i = 0; i < 10; i++) { var h2 = hash(y + i * 5, x); ctx.fillRect(x - R + h2 % Math.round(R * 2), ty + (h2 >>> 6) % Math.round(R * 0.9), 1, 2); }
      } else {
        var cap = gr.shroom || "#c8553d", glow = MAP.night;
        if (glow) { ctx.fillStyle = "rgba(127,209,199,.18)"; ctx.beginPath(); ctx.ellipse(x, y - 20, 34, 22, 0, 0, TAU); ctx.fill(); }
        ctx.fillStyle = "#2b1709"; ctx.beginPath(); ctx.ellipse(x, y - 21, 23, 13, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(x - 23, y - 22, 46, 4);
        ctx.fillStyle = cap; ctx.beginPath(); ctx.ellipse(x, y - 21, 22, 12, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(x - 22, y - 22, 44, 3);
        ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(x - 22, y - 20, 44, 2);
        ctx.fillStyle = "#fdf3de"; [[-12, -27, 4], [2, -31, 5], [12, -25, 3], [-4, -24, 2]].forEach(function (s) { ctx.fillRect(x + s[0], y + s[1], s[2], s[2] - 1); });
      }
      ctx.globalAlpha = 1;
    });
  }
  function fireNova(R, dmg) {
    near(p.x, p.y, R + 14, function (e) { if (e.d.prop && R < 30) return; var dx = e.x - p.x, dy = e.y - p.y; if (Math.hypot(dx, dy) <= R + e.d.r) hurt(e, dmg, dx * 2, dy * 2); });
    fx.push({ kind: "ring", x: p.x, y: p.y, r: R, life: 0.32, max: 0.32, col: "168,122,232" });
    netEv(["nv", Math.round(p.x), Math.round(p.y), Math.round(R)]);
    SND.zap();
  }
  /* =====================================================================
     Difficulté qui monte (paliers) et sanctuaires à activer
     ===================================================================== */
  var TIERS = D.TIERS, TIER = D.TIER;
  function tierPos() {
    if (!r) return 0;
    if (isArena()) return Math.max(0, (r.round - 1) / 2.4);
    var m = r.time / 60 + (isDungeon() && r.dg ? (r.dg.floor - 1) * 3 : 0);
    return m / tcfg().minutes + (r.ex ? 2 * (r.ex.floor - 1) : 0) + (nm(10) ? 5 : 0) + (r.cauch ? 1 + r.cauch * 0.5 : 0);   // Expédition : +2 paliers par descente
  }
  function tierN() { return Math.floor(tierPos()); }                       // continue de monter après le dernier palier
  function tierName(t) { return TIERS[Math.min(TIERS.length - 1, t)].name + (t >= TIERS.length ? " +" + (t - TIERS.length + 1) : ""); }
  // rage : temps passé sur la carte actuelle (le portail le remet à zéro, pas la difficulté)
  var RAGE = D.RAGE;
  function stageTime() { return r ? r.time - (r.stageT0 || 0) : 0; }
  function rageMin() { return !r || isArena() || isExpe() ? 0 : Math.max(0, stageTime() - RAGE.start + (me && me.ring && me.ring.furie ? 180 : 0) + (nm(3) ? 120 : 0)) / 60; }
  function rageDmg() { var m = rageMin(); return 1 + RAGE.dmgK * Math.pow(m, RAGE.dmgPow); }
  function rageSpd() { return Math.min(RAGE.spdMax, 1 + RAGE.spdPerMin * rageMin()); }
  function tierTick() {
    var t = tierN();
    if (r.tier === undefined) r.tier = t;
    if (t > r.tier) { r.tier = t; bannerAll("Difficulté : " + tierName(t)); SND.boom(); if (me && setCount(me, "apprentie") >= 2) me.rerolls = (me.rerolls || 0) + 1; }
    if (!isArena() && stageTime() >= RAGE.start && !r.rageSaid) { r.rageSaid = true; bannerAll("Les bêtes deviennent ENRAGÉES !"); SND.boom(); }
  }
  var SHR = {}; D.SHRINES.forEach(function (s) { SHR[s.id] = s; });
  var SC = 220, shrineCache = {};          // 3 fois plus de sanctuaires qu'avant (cellules de 380 px)
  function pickShrineKind(h) {
    var pb = me && itn(me, "pain_beni") ? 2 : 1, wt = function (s) { return s.weight * (s.id === "soin" ? pb : 1); };
    var tot = 0; D.SHRINES.forEach(function (s) { tot += wt(s); });
    var x = h % Math.round(tot);
    for (var i = 0; i < D.SHRINES.length; i++) { x -= wt(D.SHRINES[i]); if (x < 0) return D.SHRINES[i].id; }
    return "coffre";
  }
  function shrineCell(cx, cy) {
    var key = cx + "," + cy;
    if (shrineCache[key] !== undefined) return shrineCache[key];
    var h = hash(cx * 13 + 7 + giantSeed * 3, cy * 17 + 91) >>> 0, s = null;
    if ((h % 100) < (me && me.ring && me.ring.pelerin ? 63 : 42)) {
      var x = cx * SC + 60 + ((h >>> 7) % (SC - 120)), y = cy * SC + 60 + ((h >>> 15) % (SC - 120));
      if (Math.abs(x) > 110 || Math.abs(y) > 90) {
        var gc = giantAt(Math.floor(x / GC), Math.floor(y / GC));
        if (!gc || Math.hypot(gc.x - x, gc.y - y) > 40) s = { id: "s" + cx + "_" + cy, x: x, y: y, k: pickShrineKind(h >>> 3) };
      }
    }
    shrineCache[key] = s;
    return s;
  }
  function shrinesNear(x, y, rad) {
    if (isDungeon()) return (r.dg && r.dg.shrines || []).filter(function (s) { return Math.abs(s.x - x) < rad && Math.abs(s.y - y) < rad; });
    if (isArena()) return [];
    var out = [], c0 = Math.floor((x - rad) / SC), c1 = Math.floor((x + rad) / SC), d0 = Math.floor((y - rad) / SC), d1 = Math.floor((y + rad) / SC);
    for (var cx = c0; cx <= c1; cx++) for (var cy = d0; cy <= d1; cy++) { var s = shrineCell(cx, cy); if (s && Math.abs(s.x - x) < rad && Math.abs(s.y - y) < rad) out.push(s); }
    return out;
  }
  function shState(s) { return (r.sh[s.id] = r.sh[s.id] || { p: 0, used: 0 }); }
  function chestCost() { return Math.round((18 + 9 * tierN()) * zoneGold() * (me && me.ring && me.ring.marchand && me.ring2x ? 0.7 : 1) * (me && me.ring && me.ring.marchand ? 0.7 : 1) * (nm(7) ? 2 : 1)); }
  function merchantCost() { return Math.round(chestCost() * 2.2); }
  function betCost() { return Math.round(chestCost() * 1.2); }
  function payGold(cost, st, what) {
    if (r.gold >= cost) { r.gold -= cost; r.goldSpent = (r.goldSpent || 0) + cost; return true; }
    st.p = 0; st.cd = 2; bannerAll("Il faut " + cost + " glands " + what); return false;
  }
  function shrineTick(dt) {
    var seen = {};
    players.forEach(function (pl) {
      if (pl.down) return;
      shrinesNear(pl.x, pl.y, 40).forEach(function (s) {
        var st = shState(s); if (st.used || seen[s.id]) return;
        if (Math.hypot(pl.x - s.x, (pl.y - s.y) * 1.25) > 22) return;
        seen[s.id] = pl;
      });
    });
    Object.keys(r.sh).forEach(function (id) {
      var st = r.sh[id]; if (st.used) return;
      if (!seen[id]) { st.p = Math.max(0, st.p - dt * 0.6); if (st.cd) st.cd -= dt; return; }
    });
    Object.keys(seen).forEach(function (id) {
      var pl = seen[id], s = shrinesNear(pl.x, pl.y, 40).filter(function (q) { return q.id === id; })[0], st = shState(s), def = SHR[s.k];
      if (st.cd > 0) { st.cd -= dt; return; }
      st.p = Math.min(1, st.p + dt / def.time * (1 + 0.3 * itn(pl, "boussole")));
      if (st.p >= 1) activateShrine(s, st, pl);
    });
  }
  function activateShrine(s, st, pl) {
    var def = SHR[s.k], k;
    if (s.k === "coffre") {
      var cost = chestCost(); r.chestN = (r.chestN || 0) + 1;
      if (itn(pl, "cle_rouillee") && r.chestN % 3 === 0) { cost = 0; bannerAll("La clé rouillée tourne : coffre gratuit !"); }
      if (r.gold < cost) { st.p = 0; st.cd = 2; bannerAll("Il faut " + cost + " glands pour l'ouvrir"); return; }
      r.gold -= cost; r.chestsOpened = (r.chestsOpened || 0) + 1; dropItem(s.x, s.y - 14, 0); if (Math.random() < 0.3) dropItem(s.x + 14, s.y - 8, 0); if (anyItem("de_demon")) dropItem(s.x - 14, s.y - 8, 0);
      bannerAll("Coffre ouvert !"); SND.gold();
    } else if (s.k === "defi") {
      var n = 5 + tierN(); r.trials[s.id] = n;
      for (k = 0; k < n; k++) {
        var pool = isDungeon() ? dgPool() : MAP.biomes[biomeAtTile(Math.floor(s.x / 16), Math.floor(s.y / 16))].enemies.map(function (q) { return q[0]; });
        var a = k / n * TAU, e = spawnAt(pool[(Math.random() * pool.length) | 0], s.x + Math.cos(a) * 70, s.y + Math.sin(a) * 55);
        giveAffixes(e, tierN() >= 4 ? 2 : 1); e.quest = s.id; e.wander = true; e.awake = true;
      }
      bannerAll("Défi : élimine les " + n + " élites !"); SND.boom();
      if (pl.ring && pl.ring.defi) { var bl = isDungeon() ? DGT.guards : MAP.bosses, bb = spawnAt(bl[(Math.random() * bl.length) | 0], s.x, s.y - 70); bb.wander = true; bb.awake = true; bb.defiBoss = true; }
    } else if (s.k === "sang") {
      pl.devil = (pl.devil || 0) + 1; r.devil = (r.devil || 0) + 1; calc(pl); if (pl.owner) calc(pl.owner);
      drop("item", s.x, s.y - 14, rollItem(0, 1, "diable").idx);
      if (pl.ring && pl.ring.pacte) drop("item", s.x + 14, s.y - 10, rollItem(0, 1, "diable").idx);
      if (pl.ring && pl.ring.pacte && pl.ring2x) drop("item", s.x - 14, s.y - 10, rollItem(0, 1, "diable").idx);
      burst(s.x, s.y, "#c0283a", 20); bannerAll("Pacte scellé… (-20 % de PV max)"); SND.boom();
    } else if (s.k === "boss") {
      var list = isDungeon() ? DGT.guards : MAP.bosses, bt = list[(Math.random() * list.length) | 0];
      for (k = 0; k < 1 + (r.madness || 0); k++) { var b = spawnAt(bt, s.x + (k - r.madness / 2) * 30, s.y - 60); b.wander = true; b.awake = true; }
      bossCount++; bannerAll(D.ENEMIES[bt].name + (r.madness ? " x" + (1 + r.madness) : "") + " est invoqué !"); SND.boom();
    } else if (s.k === "folie") {
      r.madness = (r.madness || 0) + 1; bannerAll("Folie x" + (1 + r.madness) + " : les prochains boss seront plus nombreux !"); SND.fusion();
    } else if (s.k === "soin") {
      var full = !!anyItem("pain_beni"); players.forEach(function (o) { if (!o.down) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * (full ? 1 : 0.5)); burst(o.x, o.y, "#6ad8ff", 8); } });
      bannerAll("L'eau claire vous soigne"); SND.level();
    } else if (s.k === "marchand") {
      if (!payGold(merchantCost(), st, "pour acheter")) return;
      dropItem(s.x, s.y - 16, 1); bannerAll("Marché conclu !"); SND.gold();
    } else if (s.k === "fortune") {
      var bet = betCost(); if (!payGold(bet, st, "pour miser")) return;
      var roll = Math.random() * (1 + 0.15 * itn(pl, "trefle"));
      if (roll < 0.4 && itn(pl, "de_pipe") && Math.random() < 0.75) { r.gold += bet; bannerAll("Le dé pipé vous rend la mise"); }
      else if (roll < 0.4) { bannerAll("Perdu ! La fortune se moque de vous"); burst(s.x, s.y - 20, "#6a625a", 12); SND.hurt(); }
      else if (roll < 0.8) { r.gold += bet * 2; bannerAll("Mise doublée : +" + bet * 2 + " glands !"); burst(s.x, s.y - 20, "#ffd84a", 16); SND.gold(); }
      else { dropItem(s.x, s.y - 16, 1); bannerAll("Jackpot : un objet !"); burst(s.x, s.y - 20, "#ffd84a", 24); SND.fusion(); }
      // la fortune se recharge : on peut rejouer plusieurs fois (3 mises max)
      st.bets = (st.bets || 0) + 1;
      if (st.bets < 3) { st.p = 0; st.cd = 1.2; ring(s.x, s.y, 26, false); return; }
    } else if (s.k === "sacrifice") {
      var own = pl.owner || pl, ids = Object.keys(own.items || {}).filter(function (id) { return own.items[id] > 0 && ITM[id] && !ITM[id].pool; });
      if (pl.ring && pl.ring.troc && (!ids.length || r.gold >= merchantCost())) {
        if (!payGold(merchantCost(), st, "pour le troc")) return;
        drop("item", s.x, s.y - 16, rollItem(1, own.luck || 1).idx); bannerAll("Troc conclu : un objet contre des glands"); SND.gold();
        st.used = 1; st.p = 1; r.shrinesUsed = (r.shrinesUsed || 0) + 1; ring(s.x, s.y, 26, false); return;
      }
      if (!ids.length) { st.p = 0; st.cd = 2; bannerAll("Il faut un objet à sacrifier"); return; }
      var vic = ids[(Math.random() * ids.length) | 0], vr = ITM[vic].r || 0;
      var keepIt = itn(own, "offrande") && Math.random() < 1 / 3;
      if (!keepIt) { own.items[vic]--; if (!own.items[vic]) delete own.items[vic]; } else bannerAll("L'offrande est acceptée : vous gardez l'objet !");
      calc(own); netEv(["itx", own.id, vic]);
      drop("item", s.x, s.y - 16, rollItem(Math.min(D.RARITIES.length - 1, vr + 1), own.luck || 1).idx);
      burst(s.x, s.y - 10, "#e07a3a", 22); bannerAll(ITM[vic].name + " sacrifié : un objet plus rare apparaît !"); SND.boom();
    } else if (s.k === "sacre") {
      if (r.devil) bannerAll("La statue se détourne de vous… (un pacte a été scellé)");
      else { drop("item", s.x, s.y - 14, rollItem(0, 1, "sacre").idx); bannerAll("Bénédiction !"); SND.fusion(); }
    }
    st.used = 1; st.p = 1; r.shrinesUsed = (r.shrinesUsed || 0) + 1; r.shrineTypes = r.shrineTypes || {}; r.shrineTypes[s.k] = 1;
    players.forEach(function (o) { if (itn(o, "chapelet")) r.gold += 10 * itn(o, "chapelet"); if (itn(o, "reliquaire")) calc(o); });
    players.forEach(function (o) { if (itn(o, "halo")) calc(o); });
    ring(s.x, s.y, 26, false);
  }
  function trialKill(e) {
    if (!e.quest || r.trials[e.quest] === undefined) return;
    if (--r.trials[e.quest] > 0) return;
    delete r.trials[e.quest]; S.stats.trials = (S.stats.trials || 0) + 1;
    var s = shrinesNear(e.x, e.y, 2000).filter(function (q) { return q.id === e.quest; })[0] || e;
    drop("chest", s.x - 8, s.y - 10, 1); dropItem(s.x + 10, s.y - 10, 1);
    bannerAll("Défi réussi !"); SND.fusion();
  }
  function drawShrines(cx, cy) {
    var list = shrinesNear(cx + W / 2, cy + H / 2, Math.max(W, H));
    list.forEach(function (s) {
      var def = SHR[s.k], st = r.sh[s.id] || { p: 0, used: 0 }, x = Math.round(s.x), y = Math.round(s.y);
      var dead = st.used || (s.k === "sacre" && r.devil), col = dead ? "#6a625a" : def.color;
      // zone et jauge au sol
      ctx.fillStyle = dead ? "rgba(40,30,25,.25)" : "rgba(20,14,10,.3)"; ctx.beginPath(); ctx.ellipse(x, y, 22, 17.6, 0, 0, TAU); ctx.fill();
      if (!dead) {
        ctx.strokeStyle = col; ctx.globalAlpha = 0.45; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.lineDashOffset = -r.time * 12;
        ctx.beginPath(); ctx.ellipse(x, y, 22, 17.6, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        if (st.p > 0) { ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, 22, 17.6, 0, -Math.PI / 2, -Math.PI / 2 + st.p * TAU); ctx.stroke(); ctx.fillStyle = col; ctx.globalAlpha = 0.18 * st.p; ctx.beginPath(); ctx.ellipse(x, y, 22 * st.p, 17.6 * st.p, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
      }
      // le totem lui-même
      var bob = dead ? 0 : Math.round(Math.sin(r.time * 3 + x) * 1.5);
      if (s.k === "marchand") {
        ctx.fillStyle = "#2b1709"; ctx.fillRect(x - 12, y - 24, 24, 25);
        for (var aw = 0; aw < 6; aw++) { ctx.fillStyle = dead ? "#6a625a" : aw % 2 ? "#fdf3de" : "#3f9a4a"; ctx.fillRect(x - 11 + aw * 4, y - 23, 4, 5); }
        ctx.fillStyle = dead ? "#5a4a3a" : "#8a5a3b"; ctx.fillRect(x - 11, y - 9, 22, 9); ctx.fillRect(x - 10, y - 18, 2, 9); ctx.fillRect(x + 8, y - 18, 2, 9);
        if (!dead) { ctx.fillStyle = "#f6d36b"; ctx.fillRect(x - 6, y - 12 + bob, 3, 3); ctx.fillStyle = "#b07cf0"; ctx.fillRect(x - 1, y - 13 + bob, 3, 4); ctx.fillStyle = "#6ad8ff"; ctx.fillRect(x + 4, y - 12 + bob, 3, 3); }
      } else if (s.k === "coffre") {
        ctx.fillStyle = "#2b1709"; ctx.fillRect(x - 9, y - 12, 18, 12);
        ctx.fillStyle = dead ? "#5a4a3a" : "#8a5a3b"; ctx.fillRect(x - 8, y - 11, 16, 10);
        ctx.fillStyle = col; ctx.fillRect(x - 8, y - 8, 16, 2); ctx.fillRect(x - 2, y - 9, 4, 5);
      } else {
        ctx.fillStyle = "#2b1709"; ctx.fillRect(x - 5, y - 20, 10, 21);
        ctx.fillStyle = dead ? "#5a524a" : "#8a8278"; ctx.fillRect(x - 4, y - 19, 8, 19);
        ctx.fillStyle = dead ? "#4a443e" : "#6a625a"; ctx.fillRect(x - 4, y - 19, 2, 19); ctx.fillRect(x - 4, y - 8, 8, 1);
        ctx.fillStyle = "#2b1709"; ctx.fillRect(x - 4, y - 28 + bob, 8, 8);
        ctx.fillStyle = col; ctx.fillRect(x - 3, y - 27 + bob, 6, 6);
        ctx.fillStyle = "rgba(255,255,255,.7)"; if (!dead) ctx.fillRect(x - 2, y - 26 + bob, 2, 2);
        if (s.k === "sang" && !dead) { ctx.fillStyle = "#c0283a"; ctx.fillRect(x - 1, y - 18, 2, 6 + ((r.time * 4) | 0) % 6); }
        if (s.k === "folie" && !dead) { ctx.fillStyle = "#ff40c0"; ctx.fillRect(x - 6 + ((r.time * 8) | 0) % 12, y - 30, 1, 1); }
      }
      // nom et coût quand on s'approche
      if (!dead && Math.hypot(me.x - x, me.y - y) < 60) {
        var cst = s.k === "coffre" ? chestCost() : s.k === "marchand" ? merchantCost() : s.k === "fortune" ? betCost() : 0;
        var label = def.name + (cst ? " " + cst : s.k === "sang" ? " -20% PV" : s.k === "sacrifice" ? " -1 objet" : "");
        drawText(label, x, y - 38, col, "c");
        if (cst) icon("gold", x + textWidth(label) / 2 + 2, y - 37);
      }
    });
  }
  // flèches au bord de l'écran vers les sanctuaires proches
  function drawShrineMarkers() {
    if (isArena()) return;
    var cx = me.x - W / 2, cy = me.y - H / 2;
    shrinesNear(me.x, me.y, itn(me, "oeil_corbeau") ? 1120 : 560).forEach(function (s) {
      var st = r.sh[s.id]; if ((st && st.used) || (s.k === "sacre" && r.devil)) return;
      var sx = s.x - cx, sy = s.y - cy;
      if (sx > 4 && sx < W - 4 && sy > 4 && sy < H - 4) return;
      var px = Math.max(8, Math.min(W - 8, sx)), py = Math.max(16, Math.min(H - 8, sy));
      ctx.fillStyle = "rgba(20,14,10,.6)"; ctx.fillRect(Math.round(px) - 4, Math.round(py) - 4, 8, 8);
      ctx.fillStyle = SHR[s.k].color; ctx.fillRect(Math.round(px) - 2, Math.round(py) - 2, 4, 4);
    });
  }
  /* ---------- Portail : un Gardien géant garde le passage vers la carte suivante ---------- */
  var PORTAL = { at: 300, dist: 300, wake: 3, enter: 1.5, rad: 30 };
  function portalTick(dt) {
    if (Net.on && Net.role !== "host") return;
    if (!r.portal) {
      if (stageTime() < PORTAL.at) return;
      var a = Math.random() * TAU, c = randomAlive();
      r.portal = { x: Math.round(c.x + Math.cos(a) * PORTAL.dist), y: Math.round(c.y + Math.sin(a) * PORTAL.dist * 0.8), st: 0, p: 0 };
      bannerAll("Un portail s'est ouvert quelque part…"); SND.fusion();
      return;
    }
    var po = r.portal, inside = alive().filter(function (pl) { return Math.hypot(pl.x - po.x, (pl.y - po.y) * 1.25) < PORTAL.rad; });
    if (po.st === 0) {
      po.p = inside.length ? Math.min(1, po.p + dt / PORTAL.wake) : Math.max(0, po.p - dt * 0.5);
      if (po.p >= 1) { if (MAP.mega && D.ENEMIES[MAP.mega]) wakeMega(po); else wakeGuardian(po); }
    } else if (po.st === 1) {
      if (!po.boss || po.boss.dead) { po.st = 2; po.p = 0; drop("chest", po.x - 14, po.y + 20, 2); dropItem(po.x + 14, po.y + 20, 2); bannerAll("Le Gardien est tombé : le portail est ouvert !"); SND.level(); }
    } else if (po.st === 2) {
      po.p = inside.length ? Math.min(1, po.p + dt / PORTAL.enter) : Math.max(0, po.p - dt);
      if (po.p >= 1) nextMap();
    }
  }
  function wakeGuardian(po) {
    var bt = MAP.bosses[(r.stage || 0) % MAP.bosses.length], base = D.ENEMIES[bt];
    var d = {}; Object.keys(base).forEach(function (k) { d[k] = base[k]; });
    d.r = (base.r || 8) * 2; d.dmg = (base.dmg || 10) * 1.6; d.name = "Gardien : " + base.name; d.boss = true; d.giant = true; d.xp = (base.xp || 10) * 4;
    var hp = base.hp * 9 * (1 + r.time / 200) * DIFF.hp * (MAP.hp || 1) * tierHp() * (1 + 0.5 * (players.length - 1));
    var e = makeEnemy(bt, d, po.x, po.y - 70, hp);
    e.giant = true; e.wander = true; e.awake = true; e.spd *= 0.85; e.title = d.name;
    if (base.ai === "mole") { e.under = false; }
    giveAffixes(e, tierN() >= 6 ? 2 : 1);
    po.st = 1; po.boss = e; po.p = 1;
    r.flash = 0.3; if (S.opts.shake) shake = 0.6;
    bannerAll(d.name + " s'éveille !"); SND.boom();
  }
  function nextMap() {
    var i = D.MAPS.indexOf(MAP), nm = D.MAPS[(i + 1) % D.MAPS.length];
    r.stage = (r.stage || 0) + 1; r.portals = (r.portals || 0) + 1;
    enterMap(nm.id, r.stage, r.time);
    // tout le monde passe : remis au centre de la nouvelle carte
    players.forEach(function (pl, k) { pl.x = pl.tx = (k - (players.length - 1) / 2) * 20; pl.y = pl.ty = 0; if (pl.down && !(party && party.ctx.opts.noRevive)) { pl.down = false; pl.reviveT = 0; pl.hp = pl.maxHp * 0.5; } if (pl.remote) netSend("tp", { id: pl.id, x: Math.round(pl.x), y: 0 }); });
    enemies = []; projs = []; hostile = []; lobs = []; warns = []; gems = []; zones = []; curBoss = null;
    nextSwarm = r.time + 60; spawnAcc = 3; propTimer = 0;
    netEv(["mp", nm.id, r.stage, Math.round(r.time * 10)]);
    bannerAll("Carte " + (r.stage + 1) + " : " + nm.name + " — la difficulté continue de monter !"); SND.fusion();
  }
  // changement de carte (hôte et invités)
  function enterMap(id, stage, t0) {
    if (players) players.forEach(function (o) { o.ameUsed = false; });
    MAP = mapById(id); r.map = MAP.id; r.stage = stage; r.stageT0 = t0; r.portal = null; r.rageSaid = false; r.biome = -1;
    giantCache = {}; giantSeed = 0; for (var gi = 0; gi < MAP.id.length; gi++) giantSeed = (giantSeed * 31 + MAP.id.charCodeAt(gi)) % 9973;
    giantSeed = (giantSeed + stage * 101) % 9973;
    biomeCache = new Map(); shrineCache = {}; r.sh = {}; r.trials = {};
    S.stats.maps[MAP.id] = true;
  }
  function drawPortal() {
    var po = r.portal; if (!po) return;
    var x = Math.round(po.x), y = Math.round(po.y), open = po.st === 2, col = po.st === 1 ? "#ff3a2a" : open ? "#6ad8ff" : "#b07cf0";
    // zone au sol + jauge
    ctx.fillStyle = "rgba(20,10,30,.35)"; ctx.beginPath(); ctx.ellipse(x, y, PORTAL.rad, PORTAL.rad * 0.8, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = col; ctx.globalAlpha = 0.5; ctx.setLineDash([3, 4]); ctx.lineDashOffset = -r.time * 14; ctx.beginPath(); ctx.ellipse(x, y, PORTAL.rad, PORTAL.rad * 0.8, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    if (po.p > 0 && po.st !== 1) { ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, PORTAL.rad, PORTAL.rad * 0.8, 0, -Math.PI / 2, -Math.PI / 2 + po.p * TAU); ctx.stroke(); ctx.lineWidth = 1; }
    // l'arche et le vortex
    ctx.fillStyle = "#2b1709"; ctx.fillRect(x - 15, y - 40, 4, 40); ctx.fillRect(x + 11, y - 40, 4, 40); ctx.fillRect(x - 15, y - 44, 30, 5);
    ctx.fillStyle = "#6a625a"; ctx.fillRect(x - 14, y - 39, 2, 39); ctx.fillRect(x + 12, y - 39, 2, 39); ctx.fillRect(x - 14, y - 43, 28, 3);
    for (var k = 0; k < 6; k++) {
      var rr = 10 - k * 1.5, a0 = r.time * (3 + k) + k;
      ctx.strokeStyle = k % 2 ? col : "#fdf3de"; ctx.globalAlpha = open ? 0.9 : 0.4 + 0.1 * k;
      ctx.beginPath(); ctx.ellipse(x, y - 20, rr, rr * 1.6, 0, a0, a0 + 4); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (Math.hypot(me.x - x, me.y - y) < 90) drawText(po.st === 0 ? "PORTAIL : RESTE DEDANS POUR LE REVEILLER" : po.st === 1 ? "TUE LE GARDIEN" : "ENTREZ : CARTE SUIVANTE", x, y - 54, col, "c");
  }
  function drawPortalMarker() {
    var po = r.portal; if (!po || isArena() || isDungeon()) return;
    var sx = po.x - (me.x - W / 2), sy = po.y - (me.y - H / 2);
    if (sx > 4 && sx < W - 4 && sy > 4 && sy < H - 4) return;
    var px = Math.max(10, Math.min(W - 10, sx)), py = Math.max(20, Math.min(H - 10, sy));
    var c = po.st === 1 ? "#ff3a2a" : po.st === 2 ? "#6ad8ff" : "#b07cf0", pulse = Math.sin(r.time * 6) > 0;
    box(px - 5, py - 5, 10, 10, "#1a120c"); ctx.fillStyle = pulse ? c : "#fdf3de"; ctx.fillRect(px - 3, py - 3, 6, 6);
    ctx.fillStyle = "#1a120c"; ctx.fillRect(px - 1, py - 2, 2, 4);
  }
  // jauge de difficulté, alignée à droite sous l'or ; renvoie la hauteur suivante libre
  // jauge façon Risk of Rain 2 : une longue bande de paliers qui défile lentement derrière une fenêtre fixe
  function drawTierBar(by) {
    var pos = tierPos(), t = Math.floor(pos), SEG = 74, bw = 84, bh = 11, bx = W - 4 - bw, mark = 22;
    box(bx, by, bw, bh, "#1a120c");
    ctx.save(); ctx.beginPath(); ctx.rect(bx + 1, by + 1, bw - 2, bh - 2); ctx.clip();
    for (var k = Math.max(0, t - 1); k <= t + 2; k++) {
      var sx = Math.round(bx + 1 + mark + (k - pos) * SEG), col = TIERS[Math.min(TIERS.length - 1, k)].color;
      ctx.fillStyle = col; ctx.fillRect(sx, by + 1, SEG, bh - 2);
      ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(sx, by + 1, 1, bh - 2);                       // séparation
      ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(sx, by + 1, SEG, 2);                    // reflet
      for (var hx = 6; hx < SEG; hx += 6) { ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.fillRect(sx + hx, by + bh - 4, 1, 2); }   // graduations
      // nom « collant » : reste lisible au bord gauche tant que le palier est visible, poussé par le suivant
      var nm = tierName(k), tw = textWidth(nm), lx = Math.max(sx + 3, bx + 3);
      if (lx + tw > sx + SEG - 3) lx = sx + SEG - 3 - tw;
      drawText(nm, lx, by + 3, k >= 8 && k === t && Math.sin(r.time * 10) > 0 ? "#ff5a3a" : "#fdf3de");
    }
    ctx.restore();
    // curseur fixe : la difficulté défile dessous
    var mx = bx + 1 + mark;
    ctx.fillStyle = "#fdf3de"; ctx.fillRect(mx, by - 1, 1, bh + 2);
    ctx.fillRect(mx - 1, by - 2, 3, 1); ctx.fillRect(mx - 1, by + bh + 1, 3, 1);
    by += bh + 3;
    if (rageMin() > 0) { var rg = rageDmg(); drawText("RAGE X" + (Math.round(rg * 10) / 10), W - 4, by, Math.sin(r.time * 12) > 0 ? "#ff3a2a" : "#ffb02a", "r"); by += 8; }
    if (r.madness) { drawText("FOLIE X" + (1 + r.madness), W - 4, by, "#ff40c0", "r"); by += 8; }
    return by;
  }
  function updateWarns(dt) {
    for (var i = warns.length - 1; i >= 0; i--) {
      var w = warns[i];
      if (w.follow && w.owner && !w.owner.dead) { w.x = w.owner.x; w.y = w.owner.y; }
      w.t += dt;
      if (w.owner && w.owner.dead && w.owner.byPlayer) { warns.splice(i, 1); continue; }
      if (w.t >= w.dur) {
        warns.splice(i, 1);
        ring(w.x, w.y, w.r, true);
        players.forEach(function (pl) { if (w.owner && w.owner.d && w.owner.d.ai === "bomber" && itn(pl, "allumette")) return; if (Math.hypot(pl.x - w.x, (pl.y - w.y) * 1.25) <= w.r + 3) damagePlayer(w.dmg * footMul(pl), pl); });
      }
    }
  }
  function decorAt(x, y) { var tx = Math.floor(x / 16), ty = Math.floor(y / 16), B = MAP.biomes[biomeAtTile(tx, ty, MAP)], h = hash(tx, ty), k = h % 23; if (B && B.decor && (k === 12 || k === 13 || (B.decor === "pond" && k >= 9 && k <= 11))) return B.decor; return null; }
  function waterAt(x, y) { if (isDungeon() || isArena() || MAP.mech !== "water") return false; var dc = decorAt(x, y); return dc === "water" || dc === "pond"; }
  function onIce(x, y) { if (isDungeon() || isArena()) return false; var b = biomeAt(x, y); return !!(b && b.ice); }
  // mécaniques de terrain des cartes et règles des strates d'Expédition
  function mapTick(dt) {
    if (isDungeon() || isArena()) { if (isDungeon()) dungeonMech(dt); return; }
    var m = MAP.mech;
    if (m === "wildfire" && cooledG("wildfire", 24)) { var a = Math.random() * TAU, d = 90 + Math.random() * 70; pZone({ x: me.x + Math.cos(a) * d, y: me.y + Math.sin(a) * d, r: 14, dur: 6, kind: "fire", dmg: 6, wild: 1 }); bannerAll("Un incendie se déclare !"); }
    if (m === "wind") {
      if (!r.wind && cooledG("wind", 16)) { r.wind = { a: Math.random() * TAU, t: r.time + 4 }; bannerAll("Rafale de vent !"); }
      if (r.wind) {
        if (r.time > r.wind.t) r.wind = null;
        else { var wx = Math.cos(r.wind.a), wy = Math.sin(r.wind.a);
          players.forEach(function (pl) { if (pl.down) return; var k = pl.anchored ? 0.25 : 1; pl.x += wx * 34 * k * dt; pl.y += wy * 34 * k * dt; });
          enemies.forEach(function (e) { if (!e.d.prop && !e.d.boss) { e.x += wx * 26 * dt; e.y += wy * 26 * dt; } });
          projs.forEach(function (q) { if (q.kind === "bullet") { q.vx += wx * 50 * dt; q.vy += wy * 50 * dt; } });
          hostile.forEach(function (q) { q.vx += wx * 40 * dt; q.vy += wy * 40 * dt; });
          if (Math.random() < 0.6) fx.push({ kind: "dot", x: me.x + (Math.random() - 0.5) * W, y: me.y + (Math.random() - 0.5) * H, vx: wx * 160, vy: wy * 160, life: 0.4, color: "rgba(230,240,255,.6)" }); }
      }
    }
    if (m === "leaves") enemies.forEach(function (e) { if (e.d.prop && e.d.sprite === "leafpile" && !e.dead) players.forEach(function (pl) { if (!pl.down && pl.mstate === "mouvement" && Math.abs(pl.x - e.x) < 12 && Math.abs(pl.y - e.y) < 12) { var kp = p; p = pl; hurt(e, 999, 0, 0); p = kp; } }); });
    if (isExpe()) {
      var sn = strataN();
      if (sn !== r.lastStrata) { r.lastStrata = sn; var st = D.STRATA[sn]; if (sn) bannerAll("Strate : " + st.name + " — " + st.desc); }
      if (sn === 1 && Math.random() < dt * 0.08) spawnSquad({ rodeur: 2 });
    }
  }
  // donjons : colonnes de fourmis, wagonnets et fours
  function dungeonMech(dt) {
    var dg = r.dg; if (!dg || dg.active < 0) return; var rm = dg.rooms[dg.active], c = rm.core;
    if (DGT.mech === "ants" && cooledG("dgants", 9) && enemies.length < 230) { var sx = c.x + 6, sy = c.y + 8 + Math.random() * (c.h - 16), prev = null; for (var k = 0; k < 6; k++) { var an = spawnAt("ant", sx - k * 6, sy); an.room = rm.idx; an.awake = true; if (prev) an.follow = prev; prev = an; } }
    if (DGT.mech === "mine") {
      if (cooledG("dgcart", 5)) { var y0 = c.y + 10 + Math.random() * (c.h - 20), left = Math.random() < 0.5; hostile.push({ x: left ? c.x : c.x + c.w, y: y0, vx: left ? 130 : -130, vy: 0, life: c.w / 130, dmg: 18, cart: 1 }); }
      if (cooledG("dgoven", 4)) addZone(c.x + 10 + Math.random() * (c.w - 20), c.y + 10 + Math.random() * (c.h - 20), 14, 3, "fire", 6);
    }
  }
  function footMul(pl) { var f = (pl.passives && pl.passives.foulee) || 0; return f && pl.mstate === "mouvement" ? Math.max(0.4, 1 - 0.12 * f) : 1; }
  function inView(e, m) { return Math.abs(e.x - p.x) < W / 2 + (m || 0) && Math.abs(e.y - p.y) < H / 2 + (m || 0); }
  function nearAnyPlayer(e, rad) { return players.some(function (pl) { return Math.abs(e.x - pl.x) < rad && Math.abs(e.y - pl.y) < rad; }); }
  function nuke() {
    r.flash = 0.35; if (S.opts.shake) shake = 0.4; SND.boom();
    enemies.forEach(function (e) {
      if (e.dead || e.d.prop || !inView(e, 20)) return;
      if (e.d.boss) { e.hp -= e.maxHp * 0.08; e.flash = 0.2; if (e.hp <= 0) kill(e); }
      else kill(e);
    });
  }

  /* =====================================================================
     Armes
     ===================================================================== */
  function nearest(n, range, from) {
    range *= (p.rangeMul || 1) * (CUR_FAM === "tir" ? p.vigieX || 1 : 1);
    if (CUR_FAM === "tir" && p.anchored && p.gear && gearHas(p, "u_veilleur") && !from) { var rr = range * range, big = null; enemies.forEach(function (e) { if (!e.dead && !e.d.prop && !e.under && (e.x - p.x) * (e.x - p.x) + (e.y - p.y) * (e.y - p.y) <= rr && (!big || e.hp > big.hp)) big = e; }); if (big && n === 1) return [big]; }
    var best = [], r2 = range * range, ox = from ? from.x : p.x, oy = from ? from.y : p.y;
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i]; if (e.dead || e.d.prop || e.under) continue;
      var d = (e.x - ox) * (e.x - ox) + (e.y - oy) * (e.y - oy);
      if (d > r2) continue;
      if (best.length < n) { best.push([d, e]); best.sort(function (a, b) { return a[0] - b[0]; }); }
      else if (d < best[n - 1][0]) { best[n - 1] = [d, e]; best.sort(function (a, b) { return a[0] - b[0]; }); }
    }
    var out = best.map(function (b) { return b[1]; });
    if (p.items && itn(p, "sifflet_strident")) { var sup = enemies.filter(function (e) { return !e.dead && !e.under && e.d.role === "soutien" && out.indexOf(e) < 0 && (e.x - ox) * (e.x - ox) + (e.y - oy) * (e.y - oy) <= r2; }); if (sup.length) out = sup.concat(out).slice(0, n); }
    return out;
  }
  function timer(id, cd, dt) {
    p.timers[id] = (p.timers[id] === undefined ? 0.3 : p.timers[id]) - dt;
    if (p.timers[id] <= 0) { p.timers[id] = cd * p.cdMul * (p.cadX || 1) * (p.lantern && p.hp > p.maxHp * 0.8 && humans() === 1 ? 0.85 : 1) * (p.fiole && p.hp < p.maxHp * 0.3 ? 0.7 : 1); return true; }
    return false;
  }
  function cooled(e, key, delay) {
    e.cool = e.cool || {};
    if ((e.cool[key] || 0) > r.time) return false;
    e.cool[key] = r.time + delay; return true;
  }
  function explode(x, y, rad, dmg, frag) {
    if (rad >= 26 && MAP && MAP.mech === "ice" && onIce(x, y) && !zoneAt(x, y, "hole") && cooledG("hole", 0.5)) pZone({ x: x, y: y, r: 14, dur: 20, kind: "hole" });
    ring(x, y, rad, false);
    burst(x, y, "#e8873a", 6);
    near(x, y, rad + 12, function (en) {
      var ddx = en.x - x, ddy = en.y - y;
      if (Math.hypot(ddx, ddy) <= rad + en.d.r) hurt(en, dmg, ddx * 3, ddy * 3);
    });
    for (var i = 0; i < (frag || 0); i++) {
      var a = i / frag * TAU + Math.random() * 0.5, dd = rad * (0.9 + Math.random() * 0.5);
      lobs.push({ sx: x, sy: y, tx: x + Math.cos(a) * dd, ty: y + Math.sin(a) * dd * 0.8, t: 0, dur: 0.22, dmg: dmg * 0.35, rad: rad * 0.45, frag: 0, small: true, owner: p });
    }
    SND.boom();
  }
  function zapChain(start, count, dmg, origin, up) {
    if (p && p.gear) { if (gearHas(p, "ora_a")) count += 1; if (setCount(p, "orage") >= 2 && HIT_ELEM !== "air") { var kz = HIT_ELEM; HIT_ELEM = "air"; zapChain(start, count - (gearHas(p, "ora_a") ? 1 : 0), dmg, origin, up); HIT_ELEM = kz; return; } }
    var pts = [[origin ? origin.x : p.x, origin ? origin.y : p.y - 4]], hit = [], cur = start;
    var alt = HIT_FX && HIT_FX.alt, base = HIT_ELEM, last = null;
    for (var c = 0; c < count && cur; c++) {
      pts.push([cur.x, cur.y]); hit.push(cur.id);
      if (alt && base && c > 0) HIT_ELEM = c % 2 ? (last && last !== base ? last : nextElem(base)) : base;
      last = cur.elem || last;
      hurt(cur, dmg, 0, 0);
      if (up) dmg *= 1 + up;
      cur = chainNext(cur, hit);
    }
    if (alt) HIT_ELEM = base;
    fx.push({ kind: "bolt", pts: pts, life: 0.16, max: 0.16 });
    netEv(["bo", pts.map(function (q) { return [Math.round(q[0]), Math.round(q[1])]; })]);
  }
  function chainNext(from, hitIds) {
    var nx = null, nd = 55 * 55;
    near(from.x, from.y, 55, function (e) {
      if (e.d.prop || hitIds.indexOf(e.id) >= 0) return;
      var dd = (e.x - from.x) * (e.x - from.x) + (e.y - from.y) * (e.y - from.y);
      if (dd < nd) { nd = dd; nx = e; }
    });
    return nx;
  }

  var BEHAVIOR = {
    tether: function (id, w, l, dt) {
      if (!timer(id, V(w, "tick", l), dt)) return;
      var rng = V(w, "range", l), wd = V(w, "width", l) * p.area, dmg = V(w, "dmg", l), me2 = p;
      players.forEach(function (o) {
        if (o === me2 || o.down || Math.hypot(o.x - me2.x, o.y - me2.y) > rng) return;
        var ax = me2.x, ay = me2.y - 3, bx = o.x, by = o.y - 3, L = Math.hypot(bx - ax, by - ay) || 1;
        near((ax + bx) / 2, (ay + by) / 2, L / 2 + wd + 10, function (e) {
          if (e.d.prop || e.under) return;
          var t = Math.max(0, Math.min(1, ((e.x - ax) * (bx - ax) + (e.y - ay) * (by - ay)) / (L * L)));
          if (Math.hypot(e.x - (ax + (bx - ax) * t), e.y - (ay + (by - ay) * t)) > wd + e.d.r) return;
          hurt(e, dmg, 0, 0);
          if (w.chain && !e.dead && Math.random() < 0.3) zapChain(e, w.chain, dmg * 0.6, { x: e.x, y: e.y });
        });
      });
    },
    nova: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var R = V(w, "R", l) * p.area, dm = V(w, "dmg", l);
      fireNova(R, dm);
      if (V(w, "twice", l)) fireNova(R * 0.55, dm);
      if (w.puddle) markZone(p.x, p.y, R * 0.6, 4, w.puddle);
      if (w.essor) for (var es = 0; es < 8; es++) { var ea = es / 8 * TAU; projs.push({ owner: p, kind: "bullet", x: p.x, y: p.y - 4, vx: Math.cos(ea) * 150, vy: Math.sin(ea) * 150, dmg: dm * 0.6, pierce: 2, sprite: "spark", anim: true, life: R / 150 * 1.6, hit: [], r: 3, explode: 0 }); }
    },
    thorns: function (id, w, l, dt) {
      if (w.sow) {
        var sx = p.st[id + "#x"], sy = p.st[id + "#y"];
        if (sx !== undefined && p.mstate === "mouvement") p.st[id + "#d"] = (p.st[id + "#d"] || 0) + Math.hypot(p.x - sx, p.y - sy);
        p.st[id + "#x"] = p.x; p.st[id + "#y"] = p.y;
        if ((p.st[id + "#d"] || 0) >= w.sow) { p.st[id + "#d"] = 0; zones.push({ x: p.x, y: p.y + 2, r: V(w, "rad", l) * p.area, t: 0, dur: V(w, "dur", l), kind: "thorn", dmg: V(w, "dmg", l), owner: p }); }
      }
      if (!timer(id, V(w, "cd", l), dt)) return;
      var t = nearest(8, 150), n = V(w, "n", l) + Math.floor(p.amount / 2);
      for (var k = 0; k < n; k++) {
        var tg = t.length ? t[(Math.random() * t.length) | 0] : null;
        var x = tg ? tg.x : p.x + (Math.random() - 0.5) * 80, y = tg ? tg.y : p.y + (Math.random() - 0.5) * 60;
        zones.push({ x: x, y: y, r: V(w, "rad", l) * p.area, t: 0, dur: V(w, "dur", l), kind: "thorn", dmg: V(w, "dmg", l), owner: p });
      }
      SND.crack();
    },
    shooter: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var sk = p.sigK || {}, count = (V(w, "count", l) + p.amount) * (w.lampion && sk.wick && p.anchored ? 2 : 1), range = w.range || 140, spd = (w.spd || 150) * (sk.longBreath && p.anchored ? 2 : 1);
      var t = nearest(count, range);
      for (var i = 0; i < count; i++) {
        var tg = t[i % Math.max(1, t.length)];
        var a = tg ? Math.atan2(tg.y - p.y, tg.x - p.x) : (p.face > 0 ? 0 : Math.PI);
        if (tg && p.items && itn(p, "plume_heron") && tg.mvx !== undefined) { var lt = Math.hypot(tg.x - p.x, tg.y - p.y) / spd; a = Math.atan2(tg.y + tg.mvy * lt - p.y, tg.x + tg.mvx * lt - p.x); }
        if (!tg || i >= t.length) a += (i - (count - 1) / 2) * 0.25;
        a += (Math.random() - 0.5) * (w.spread || 0);
        if (w.spiral) a = (p.st[id + "#sp"] = (p.st[id + "#sp"] || 0) + 0.5);
        projs.push({ owner: p, kind: "bullet", x: p.x, y: p.y - 2, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, dmg: V(w, "dmg", l), pierce: V(w, "pierce", l),
                     sprite: w.sprite, anim: w.anim, life: range / spd * 1.4 * (w.homing ? 1.8 : 1), hit: [], r: 4, explode: w.explodeR ? V(w, "explodeR", l) * p.area : 0, homing: !!w.homing, collect: !!(w.lampion && sk.docile) });
      }
      if (w.spread) SND.shot();
    },
    // 2.0 : Katana, entaille en arc dans la direction du mouvement
    slash: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var R = V(w, "r", l) * p.area, arc = V(w, "arc", l), dmg = V(w, "dmg", l);
      var base = p.dir ? Math.atan2(p.dir.y, p.dir.x) : (p.face > 0 ? 0 : Math.PI);
      var t0 = nearest(1, R + 30)[0]; if (t0 && !p.moving) base = Math.atan2(t0.y - p.y, t0.x - p.x);
      var angs = V(w, "double", l) ? [base, base + Math.PI] : [base];
      angs.forEach(function (ag, n) {
        fx.push({ kind: "slash", a: ag, arc: arc, r: R, life: 0.16, max: 0.16, pl: p, flip: n % 2 });
        near(p.x, p.y, R + 12, function (e) {
          var dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
          if (d > R + e.d.r) return;
          var da = Math.atan2(dy, dx) - ag; da = Math.atan2(Math.sin(da), Math.cos(da));
          if (Math.abs(da) > arc / 2 + 0.2) return;
          hurt(e, dmg, dx / (d || 1) * 80, dy / (d || 1) * 80);
        });
      });
      SND.whip();
    },
    whip: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var dirs = V(w, "both", l) ? [1, -1] : [p.face], R = V(w, "r", l) * p.area, dmg = V(w, "dmg", l);
      dirs.forEach(function (dir) {
        fx.push({ kind: "swipe", dir: dir, r: R, life: 0.18, max: 0.18, pl: p }); netEv(["sw", p.id, dir, Math.round(R)]);
        near(p.x + dir * R / 2, p.y, R + 10, function (e) {
          var dx = e.x - p.x, dy = e.y - p.y;
          if (dx * dir < -4 || Math.hypot(dx, dy) > R + e.d.r || Math.abs(dy) > R * 0.8 + e.d.r) return;
          hurt(e, dmg, dir * 90, dy * 1.5);
        });
      });
      SND.whip();
    },
    spin: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var R = V(w, "r", l) * p.area, dmg = V(w, "dmg", l);
      fx.push({ kind: "spin", r: R, life: 0.25, max: 0.25, pl: p }); netEv(["sp", p.id, Math.round(R)]);
      near(p.x, p.y, R + 10, function (e) {
        var dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
        if (d > R + e.d.r) return;
        hurt(e, dmg, dx / d * 110, dy / d * 110);
      });
      SND.whip();
    },
    orbit: function (id, w, l, dt) {
      var n = V(w, "n", l) + p.amount, R = V(w, "R", l) * p.area, dmg = V(w, "dmg", l);
      var c = w.around === "partner" ? (partnerOf(p) || p) : p;
      p.st[id] = (p.st[id] || 0) + V(w, "spd", l) * dt * (p.orbDir || 1);
      for (var j = 0; j < n; j++) {
        var oa = p.st[id] + j / n * TAU;
        var ox = c.x + Math.cos(oa) * R, oy = c.y + Math.sin(oa) * R * 0.8;
        if (w.block) for (var hb = hostile.length - 1; hb >= 0; hb--) if (Math.abs(hostile[hb].x - ox) < 8 && Math.abs(hostile[hb].y - oy) < 8) { hostile.splice(hb, 1); burst(ox, oy, "#fdf3de", 3); var rt = nearest(1, 90)[0]; if (rt) hurt(rt, dmg * 1.5, 0, 0); }
        near(ox, oy, 14, function (e) {
          if (Math.hypot(e.x - ox, e.y - oy) > 5 + e.d.r || !cooled(e, id, 0.45)) return;
          hurt(e, dmg, (e.x - c.x) * 1.2, (e.y - c.y) * 1.2);
          if (w.heal && !e.d.prop) p.hp = Math.min(p.maxHp, p.hp + w.heal);
          if (w.healAlly && !e.d.prop && c !== p) c.hp = Math.min(c.maxHp, c.hp + w.healAlly);
        });
      }
      if (w.shootCd && timer(id + "#leaf", w.shootCd, dt)) {
        for (var q = 0; q < n; q++) {
          var qa = p.st[id] + q / n * TAU, qx = p.x + Math.cos(qa) * R, qy = p.y + Math.sin(qa) * R * 0.8;
          projs.push({ owner: p, kind: "bullet", x: qx, y: qy, vx: Math.cos(qa) * 90, vy: Math.sin(qa) * 90, dmg: V(w, "leafDmg", l), pierce: 2,
                       sprite: "autumnleaf", anim: true, homing: true, life: 1.6, hit: [], r: 4 });
        }
      }
    },
    radial: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var n = V(w, "n", l) + p.amount, spd = w.spd || 105;
      p.st[id] = (p.st[id] || 0) + 0.45;
      for (var m = 0; m < n; m++) {
        var la = p.st[id] + m / n * TAU;
        projs.push({ owner: p, kind: "bullet", x: p.x, y: p.y, vx: Math.cos(la) * spd, vy: Math.sin(la) * spd, dmg: V(w, "dmg", l), pierce: V(w, "pierce", l),
                     sprite: w.sprite, anim: true, homing: !!w.homing, life: w.homing ? 2 : 1.1, hit: [], r: 4 });
      }
    },
    lob: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var cand = nearest(12, 130), n = V(w, "n", l) + p.amount;
      for (var k = 0; k < n; k++) {
        var tgt = cand.length ? cand[(Math.random() * cand.length) | 0] : null;
        var tx = tgt ? tgt.x : p.x + (Math.random() * 120 - 60), ty = tgt ? tgt.y : p.y + (Math.random() * 80 - 40);
        lobs.push({ owner: p, sx: p.x, sy: p.y, tx: tx, ty: ty, t: 0, dur: 0.55 + k * 0.08, dmg: V(w, "dmg", l), rad: V(w, "rad", l) * p.area,
                    frag: V(w, "frag", l) || 0, sprite: w.frag ? "pinebomb" : "pinecone" });
      }
    },
    aura: function (id, w, l, dt) {
      var R = V(w, "R", l) * p.area * (w.smoke ? p.smokeX || 1 : 1), slow = V(w, "slow", l) || 0, push = V(w, "push", l) || 0, dmg = V(w, "dmg", l);
      p.st[id] = (p.st[id] || 0) - dt;
      var tick = p.st[id] <= 0;
      if (tick) p.st[id] = w.tick || 0.5;
      near(p.x, p.y, R + 12, function (e) {
        var dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy * 1.25) || 1;
        if (d > R + e.d.r) return;
        if (!e.d.prop) {
          if (w.climat && HIT_ELEM) { e.climT = (e.climT || 0) + dt; if (e.climT >= 2 && (!e.mark || e.mark === HIT_ELEM)) { e.mark = HIT_ELEM; e.markT = 999; } }
          if (slow) { e.slowT = 0.3; e.slow = e.d.boss ? slow / 3 : slow; }
          if (push) { var k = (e.d.boss ? 0.15 : 1) * push * dt; e.x += dx / d * k; e.y += dy / d * k; }
        }
        if (tick) hurt(e, dmg, 0, 0);
      });
      if (w.spinCd && timer(id + "#spin", w.spinCd, dt)) {
        var sd = V(w, "spinDmg", l);
        fx.push({ kind: "spin", r: R, life: 0.3, max: 0.3, pl: p }); netEv(["sp", p.id, Math.round(R)]);
        near(p.x, p.y, R + 10, function (e) { if (Math.hypot(e.x - p.x, e.y - p.y) <= R + e.d.r) hurt(e, sd, 0, 0); });
        SND.whip();
      }
    },
    boomerang: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var n = V(w, "n", l) + p.amount, ft = nearest(n, 180);
      for (var i = 0; i < n; i++) {
        var fe = ft[i];
        var fa = fe ? Math.atan2(fe.y - p.y, fe.x - p.x) : (p.face > 0 ? 0 : Math.PI) + (i - (n - 1) / 2) * 0.6;
        projs.push({ owner: p, kind: "boomerang", x: p.x, y: p.y, vx: Math.cos(fa), vy: Math.sin(fa), dmg: V(w, "dmg", l), pierce: 999, sprite: w.sprite,
                     life: 4, range: V(w, "range", l) * p.area, dist: 0, back: false, chain: V(w, "chain", l) || 0, zapT: 0, ar: w.allerRetour || 0, fast: w.fast, yoyo: w.yoyo });
      }
    },
    chain: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var starts = nearest(12, 150), bolts = V(w, "bolts", l) + p.amount;
      for (var b = 0; b < bolts && starts.length; b++) zapChain(starts.splice((Math.random() * starts.length) | 0, 1)[0], V(w, "chain", l), V(w, "dmg", l), null, w.chainUp);
      SND.zap();
    },
    storm: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var vis = enemies.filter(function (e) { return !e.dead && !e.d.prop && !e.under && inView(e, -4); });
      var n = V(w, "strikes", l) + p.amount;
      for (var i = 0; i < n && vis.length; i++) {
        var t = vis.splice((Math.random() * vis.length) | 0, 1)[0];
        zapChain(t, V(w, "chain", l), V(w, "dmg", l), { x: t.x + (Math.random() * 20 - 10), y: t.y - 90 });
      }
      if (S.opts.shake) shake = Math.max(shake, 0.08);
      SND.zap();
    },
    meteor: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var vis = enemies.filter(function (e) { return !e.dead && !e.d.prop && !e.under && inView(e, -4); });
      var n = V(w, "n", l) + p.amount;
      for (var k = 0; k < n; k++) {
        var t = vis.length ? vis[(Math.random() * vis.length) | 0] : null;
        var tx = t ? t.x : p.x + (Math.random() - 0.5) * W * 0.8, ty = t ? t.y : p.y + (Math.random() - 0.5) * H * 0.8;
        lobs.push({ owner: p, sx: tx, sy: ty, tx: tx, ty: ty, t: 0, dur: 0.6 + k * 0.07, dmg: V(w, "dmg", l), rad: V(w, "rad", l) * p.area, frag: w.frag || 0, sprite: w.lob || "meteore", sky: true });
      }
    },
    rocket: function (id, w, l, dt) {
      if (!timer(id, V(w, "cd", l), dt)) return;
      var n = V(w, "n", l) + p.amount, t = nearest(n, 200);
      for (var i = 0; i < n; i++) {
        var a = (p.face > 0 ? 0 : Math.PI) + (i - (n - 1) / 2) * 0.5 - Math.PI / 2 * 0.6;
        projs.push({ owner: p, kind: "rocket", x: p.x, y: p.y - 3, ang: a, spd: 40, max: w.spd || 120, target: t[i % Math.max(1, t.length)] || null,
                     dmg: V(w, "dmg", l), rad: V(w, "rad", l) * p.area, life: 3, pierce: 1 });
      }
      SND.shot();
    },
  };
  function weapons(dt) {
    var wel = p.arme ? armElem(p) : null, foyer = p.gear && gearHas(p, "foyer"), baseId = p.arme ? armeOf(p).base : null;
    p.sigK = {}; for (var sid in p.weapons) { var sgd = SIGDEF[sid]; if (sgd) p.sigK[sgd.kind] = p.weapons[sid]; }
    techEntries(p).forEach(function (e) {
      var fn = BEHAVIOR[e.def.type]; if (!fn) return;
      CUR_FAM = e.def.family || null;
      var rmA = e.def.family === "zone" && p.anchored && itn(p, "racine_mere") ? 1.3 : 1; if (rmA !== 1) p.area *= rmA;
      var el = foyer && e.key === baseId ? "feu" : (p.amu && p.amu[e.def.family]) || wel, n0 = projs.length, l0 = lobs.length, z0 = zones.length, hf = e.def.hfx || null;
      HIT_ELEM = el; HIT_FX = hf; fn(e.key, e.def, e.l, dt); HIT_ELEM = undefined; HIT_FX = null; CUR_FAM = null;
      if (rmA !== 1) p.area /= rmA;
      if (e.def.family === "tir" && itn(p, "bec_pivert")) for (var bp = n0; bp < projs.length; bp++) if (!projs[bp].bec) { projs[bp].bec = 1; projs[bp].pierce = (projs[bp].pierce || 1) + 1; }
      var whis = p.sigK.whistle && e.def.family === "tir", sil = itn(p, "sillon") && p.mstate === "mouvement" && e.def.family === "tir", nEnd = projs.length;
      if (sil) for (var si = n0; si < nEnd; si++) { var sq = projs[si]; if (sq.kind === "bullet" && !sq.back2) projs.push({ owner: p, kind: "bullet", x: sq.x, y: sq.y, vx: -sq.vx, vy: -sq.vy, dmg: sq.dmg * 0.4 * itn(p, "sillon"), pierce: sq.pierce, sprite: sq.sprite, anim: sq.anim, life: sq.life, hit: [], r: sq.r, explode: 0, back2: 1 }); }
      for (var i = n0; i < projs.length; i++) { var pq = projs[i]; if (pq.elem === undefined) pq.elem = el; if (pq.hfx === undefined) pq.hfx = hf; if (pq.fam === undefined) pq.fam = e.def.family; if (whis && !pq.whis) { pq.whis = 1; pq.pierce = (pq.pierce || 1) + 2; var wh = { mark: "air" }; if (pq.hfx) for (var hk0 in pq.hfx) wh[hk0] = pq.hfx[hk0]; pq.hfx = wh; } }
      for (var j = l0; j < lobs.length; j++) { if (lobs[j].elem === undefined) lobs[j].elem = el; if (lobs[j].hfx === undefined) lobs[j].hfx = hf; if (lobs[j].cfg === undefined) lobs[j].cfg = e.def; if (lobs[j].fam === undefined) lobs[j].fam = e.def.family; }
      var mil2 = setCount(p, "racines_m") >= 2 && e.def.type === "thorns";
      for (var z = z0; z < zones.length; z++) if (zones[z].owner === p) { if (mil2 && !zones[z].mil) { zones[z].mil = 1; zones[z].dur *= 2; } if (zones[z].elem === undefined) zones[z].elem = el; if (zones[z].cfg === undefined) zones[z].cfg = e.def; }
    });
    ultTick(p);
    ultFxTick(p, dt);
    itemComps(dt);
    mountTick(dt);
    // compagnons d'une arme perdue (fusionnée) : ils s'en vont
    if (p.comp) { var live = {}; techEntries(p).forEach(function (e) { live[e.key] = 1; }); Object.keys(p.comp).forEach(function (id) { if (!live[id] && !ITEM_COMP[id] && id.indexOf("__") !== 0) delete p.comp[id]; }); }
  }

  /* ---------- Compagnons : familiers, tourelles, drones ---------- */
  function compList(id) { p.comp = p.comp || {}; return (p.comp[id] = p.comp[id] || []); }
  function compDmg(w, l) { return V(w, "dmg", l) * (1 + 0.15 * (p.passives.dresseur || 0)); }
  function compRate(w, l) { return V(w, "rate", l) * (1 - 0.1 * Math.min(1, p.passives.mecano || 0) - 0.02 * (p.passives.mecano || 0)) * p.cdMul; }
  function syncCount(arr, n, make) { while (arr.length < n) arr.push(make(arr.length)); if (arr.length > n) arr.length = n; }
  function compHit(c, t, dmg, splash) {
    var dx = t.x - c.x, dy = t.y - c.y, d = Math.hypot(dx, dy) || 1;
    hurt(t, dmg, dx / d * 30, dy / d * 30);
    if (splash) { enemies.forEach(function (e) { if (e !== t && !e.dead && !e.d.prop && Math.hypot(e.x - t.x, e.y - t.y) < splash * p.area) hurt(e, dmg * 0.6, 0, 0); }); ring(t.x, t.y, splash * p.area, false); }
    burst(t.x, t.y, "#fdf3de", 3);
  }
  var COMP_LOOK = {};
  BEHAVIOR.pet = function (id, w, l, dt) {
    var arr = compList(id), n = V(w, "n", l), spd = V(w, "spd", l) || 110, range = w.range || 150;
    var sk = p.sigK || {};
    if (w.bird && p.merleT > 0) n += 1;
    syncCount(arr, n, function (i) { return { k: w.pet, x: p.x - p.face * 10, y: p.y + 4 + i * 3, cd: 0.5, face: p.face, anim: Math.random() * 2, fly: !!w.fly }; });
    if ((w.crab && sk.nacre) || (w.bird && sk.melody && p.anchored)) arr.forEach(function (c) { for (var hb = hostile.length - 1; hb >= 0; hb--) if (Math.abs(hostile[hb].x - c.x) < 9 && Math.abs(hostile[hb].y - c.y) < 9) { hostile.splice(hb, 1); burst(c.x, c.y, "#fdf3de", 3); } });
    var down = w.medic ? players.filter(function (o) { return o !== p && o.down; })[0] : null;
    arr.forEach(function (c, i) {
      if (down) { c.tgt = null; c.anim += dt * 8; var mx = down.x - c.x, my = down.y - c.y, md = Math.hypot(mx, my); if (md > 8) { c.x += mx / md * Math.min(md, spd * dt); c.y += my / md * Math.min(md, spd * dt); c.face = mx > 0 ? 1 : -1; } else down.medicT = 0.25; return; }
      if (w.crab) { c.age = (c.age || 0) + dt; if (sk.pearl && c.age > 20 && !c.big) { c.big = true; burst(c.x, c.y, "#fdf3de", 10); } }
      if (w.circle || (w.bird && sk.melody && p.anchored) || (sk.rally && p.anchored)) {
        var ca = r.time * 2.4 + i / arr.length * TAU; c.x = p.x + Math.cos(ca) * 26; c.y = p.y + Math.sin(ca) * 18; c.anim += dt * 8; c.face = -Math.sin(ca) >= 0 ? 1 : -1;
        near(c.x, c.y, 16, function (e) { if (!e.d.prop && !e.under && Math.hypot(e.x - c.x, e.y - c.y) < 8 + e.d.r && cooled(e, id + "c" + i, compRate(w, l))) compHit(c, e, compDmg(w, l), V(w, "splash", l) || 0); });
        return;
      }
      var cd0 = c.cd; petMove(c, i, arr.length, spd, range, dt); petBite(c, compDmg(w, l) * (c.big ? 2.5 : 1), compRate(w, l), (V(w, "splash", l) || 0) + (c.big ? 18 : 0), dt, w.roll, w.hop);
      if (w.bird && sk.blackbird && c.cd > cd0) { p.birdN = (p.birdN || 0) + 1; if (p.birdN % 10 === 0) { p.merleT = 10; banner("Un merle de plus !"); } }
    });
  };
  function petMove(c, i, n, spd, range, dt) {
    c.anim += dt * 8; c.cd -= dt;
    if (c.tgt && (c.tgt.dead || c.tgt.under || Math.hypot(c.tgt.x - p.x, c.tgt.y - p.y) > range * 1.4)) c.tgt = null;
    if (!c.tgt) { var near = nearest(n, range); c.tgt = near[i % Math.max(1, near.length)] || null; }
    var tx, ty;
    if (c.tgt) { tx = c.tgt.x; ty = c.tgt.y; }
    else { var a = r.time * 0.9 + i / n * TAU; tx = p.x + Math.cos(a) * 20; ty = p.y + Math.sin(a) * 12 + (c.fly ? -14 : 4); }
    var dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
    if (d > 1) { var sp = Math.min(d, spd * dt * (c.tgt ? 1 : Math.min(2.2, 0.6 + d / 40))); c.x += dx / d * sp; c.y += dy / d * sp; if (Math.abs(dx) > 1) c.face = dx > 0 ? 1 : -1; }
    if (Math.hypot(c.x - p.x, c.y - p.y) > 420) { c.x = p.x; c.y = p.y; c.tgt = null; }
  }
  function petBite(c, dmg, rate, splash, dt, roll, hop) {
    var t = c.tgt; if (!t || c.cd > 0) return;
    if (Math.hypot(t.x - c.x, t.y - c.y) > (t.d.r || 6) + (roll ? 8 : 5)) return;
    compHit(c, t, dmg, splash); c.cd = rate;
    if (hop && !procLock) { var hn = chainNext(t, [t.id]); if (hn) { c.x = hn.x; c.y = hn.y; c.tgt = hn; zapChain(hn, hop, dmg * 0.6, t); } }
    if (roll) { c.x -= (t.x - c.x) * 0.6; c.y -= (t.y - c.y) * 0.6; }   // rebondit après l'impact
  }
  BEHAVIOR.turret = function (id, w, l, dt) {
    var arr = compList(id), mec = 1 + 0.25 * Math.min(1, p.passives.mecano || 0) + 0.05 * (p.passives.mecano || 0);
    for (var i = arr.length - 1; i >= 0; i--) {
      var c = arr[i]; c.life -= dt; c.cd -= dt; c.anim += dt * 4;
      if (c.life <= 0) { burst(c.x, c.y, "#8a5a3b", 6); arr.splice(i, 1); continue; }
      if (c.cd > 0) continue;
      var t = nearest(1, w.range || 160, c)[0]; if (!t) continue;
      var a = Math.atan2(t.y - c.y, t.x - c.x); c.face = Math.cos(a) >= 0 ? 1 : -1; c.cd = compRate(w, l);
      var dmg = compDmg(w, l);
      if (w.totem && HIT_ELEM && cooled(c, "totem", 1)) markZone(c.x, c.y, 30 * p.area, 1.3, HIT_ELEM);
      if (w.lobber) lobs.push({ owner: p, sx: c.x, sy: c.y - 6, tx: t.x, ty: t.y, t: 0, dur: 0.5, dmg: dmg * 1.5, rad: 16 * p.area, frag: 0, sprite: "pinecone" });
      else if (w.rocket) projs.push({ owner: p, kind: "rocket", x: c.x, y: c.y - 6, ang: a, spd: 60, max: 150, target: t, dmg: dmg, rad: V(w, "rad", l) * p.area, life: 3, pierce: 1 });
      else {
        var k = V(w, "spray", l) || 1;
        for (var j = 0; j < k; j++) {
          var aa = k > 1 ? a + (j - (k - 1) / 2) * 0.35 : a, sp = 170;
          projs.push({ owner: p, kind: "bullet", x: c.x, y: c.y - 6, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, dmg: dmg, pierce: V(w, "pierce", l) || 1, sprite: w.sprite || "acorn", life: (w.range || 160) / sp * 1.3, hit: [], r: 4, explode: 0 });
        }
      }
    }
    if (timer(id, V(w, "cd", l), dt)) {
      if (arr.length >= V(w, "n", l)) arr.shift();
      var tx = p.x + p.face * 12, ty = p.y + 6;
      if (isDungeon() && !walkable(tx, ty)) { tx = p.x; ty = p.y; }
      var mil = setCount(p, "racines_m") >= 2 ? 2 : 1;
      arr.push({ k: w.turret, x: tx, y: ty, life: V(w, "dur", l) * mec * mil, max: V(w, "dur", l) * mec * mil, cd: 0.4, face: p.face, anim: 0, ground: true });
      burst(tx, ty + 3, "#c08a52", 6); SND.click();
    }
  };
  BEHAVIOR.drone = function (id, w, l, dt) {
    var arr = compList(id), n = V(w, "n", l);
    syncCount(arr, n, function () { return { k: w.drone, x: p.x, y: p.y - 12, cd: Math.random() * 0.5, face: 1, anim: Math.random() * 2, fly: true }; });
    if (w.charged && timer(id + "#ch", w.charged, dt)) arr.forEach(function (c) { burst(c.x, c.y, (D.ELEMENTS[HIT_ELEM] || {}).color || "#fdf3de", 8); explode(c.x, c.y + 8, 22 * p.area, compDmg(w, l) * 2.5, 0); c.x = p.x; c.y = p.y - 12; });
    arr.forEach(function (c, i) {
      var a = r.time * 1.7 + i / arr.length * TAU, tx = p.x + Math.cos(a) * 22, ty = p.y - 10 + Math.sin(a) * 11;
      c.x += (tx - c.x) * Math.min(1, dt * 7); c.y += (ty - c.y) * Math.min(1, dt * 7); c.anim += dt * 12; c.cd -= dt;
      if (c.cd > 0) return;
      var t = nearest(1, w.range || 140, c)[0]; if (!t) return;
      c.cd = compRate(w, l); c.face = t.x >= c.x ? 1 : -1;
      if (w.zap) zapChain(t, V(w, "chain", l), compDmg(w, l), { x: c.x, y: c.y });
      else { var ag = Math.atan2(t.y - c.y, t.x - c.x), sp = 210; projs.push({ owner: p, kind: "bullet", x: c.x, y: c.y, vx: Math.cos(ag) * sp, vy: Math.sin(ag) * sp, dmg: compDmg(w, l), pierce: V(w, "pierce", l) || 1, sprite: w.sprite || "spark", life: (w.range || 140) / sp * 1.3, hit: [], r: 3, explode: 0 }); }
    });
  };
  // compagnons donnés par des objets (pas besoin de l'arme)
  var ITEM_COMP = {
    i_sifflet: { item: "sifflet", w: { type: "pet", pet: "pethog", n: [1], dmg: [8], rate: [0.6], spd: [100], range: 150 } },
    i_ruche:   { item: "ruche",   w: { type: "drone", drone: "drone", sprite: "spark", n: [1], dmg: [6], rate: [0.7], pierce: [1], range: 140 } },
    i_caisse:  { item: "caisse",  w: { type: "turret", turret: "turret", sprite: "acorn", n: [1], dmg: [8], rate: [0.5], cd: [12], dur: [10], pierce: [1], range: 160 } },
    i_oeuf:    { item: "oeuf",    w: { type: "pet", pet: "petowl", fly: true, n: [1], dmg: [14], rate: [0.85], spd: [145], range: 190, splash: [0] } }
  };
  function itemComps(dt) {
    Object.keys(ITEM_COMP).forEach(function (id) {
      var ic = ITEM_COMP[id], k = itn(p, ic.item);
      if (!k) { if (p.comp) delete p.comp[id]; return; }
      var w = {}; Object.keys(ic.w).forEach(function (q) { w[q] = ic.w[q]; });
      // chaque copie ajoute un compagnon (tourelle : se pose plus souvent) et +20 % de dégâts
      if (w.type === "turret") { w.cd = [ic.w.cd[0] / (1 + 0.5 * (k - 1))]; w.n = [Math.min(3, k)]; } else w.n = [Math.min(6, k)];
      w.dmg = [ic.w.dmg[0] * (1 + 0.2 * (k - 1)) * (1 + 0.04 * (r.level || 1))];
      BEHAVIOR[w.type](id, w, 0, dt);
    });
  }
  // montures : vitesse (dans calc) + piétinement
  function mountTick(dt) {
    if (!p.mount || p.mount === "mount_hare") return;
    if (!timer("_mount", p.mount === "mount_boar" ? 0.3 : 0.45, dt)) return;
    var dmg = (p.mount === "mount_boar" ? 22 : 12) * (1 + 0.05 * (r.level || 1)), R = p.mount === "mount_boar" ? 16 : 12;
    enemies.forEach(function (e) {
      if (e.dead || e.d.prop || e.under || Math.hypot(e.x - p.x, e.y - p.y) > R + (e.d.r || 6)) return;
      var d = Math.hypot(e.x - p.x, e.y - p.y) || 1;
      hurt(e, dmg, (e.x - p.x) / d * (p.mount === "mount_boar" ? 140 : 60), (e.y - p.y) / d * (p.mount === "mount_boar" ? 140 : 60));
    });
  }
  function drawComps() {
    var list = Net.on && Net.role === "guest" ? (Net.cps || []) : allComps();
    list.forEach(function (c) {
      var fr = SPR[c.k]; if (!fr) return;
      var s = fr[((c.anim || 0) | 0) % fr.length];
      if (c.fly) shadow(c.x, c.y + s.h / 2 + 6, s.w * 0.5); else shadow(c.x, c.y + s.h / 2 - 1, s.w * 0.7);
      blit(s, c.x, c.y + (c.fly ? Math.sin((c.anim || 0) * 0.7) : 0), c.face < 0);
      if (c.max && c.life < c.max * 0.3 && Math.sin(r.time * 14) > 0) { ctx.globalAlpha = 0.4; blit(s, c.x, c.y, c.face < 0, true); ctx.globalAlpha = 1; }
    });
  }
  function allComps() {
    var out = [];
    players.forEach(function (pl) { if (pl.crew && !pl.down) pl.crew.forEach(function (c) { out.push(c); }); if (!pl.comp || pl.down) return; Object.keys(pl.comp).forEach(function (id) { pl.comp[id].forEach(function (c) { out.push(c); }); }); });
    return out;
  }

  /* =====================================================================
     Montée de niveau, fusions
     ===================================================================== */
  function weaponAvailable(id) { var w = D.WEAPONS[id]; return w && (!w.unlock || has(w.unlock) || p.weapons[id]); }
  function readyFusions() {
    var out = [];
    Object.keys(D.FUSIONS).forEach(function (id) {
      var f = D.FUSIONS[id], a = f.from[0], b = f.from[1];
      if (p.weapons[id] || (p.weapons[a] || 0) < MAX_LVL || !questOk(f)) return;
      var bOk = ALLW[b] ? (p.weapons[b] || 0) >= MAX_LVL : (p.passives[b] || 0) >= MAX_LVL;
      if (bOk) out.push(id);
    });
    return out;
  }
  function ingredientName(k) { return (ALLW[k] || D.PASSIVES[k] || {}).name || k; }
  function choices(n) {
    if (D.TECH) return v2Choices(n);
    var out = readyFusions().slice(0, 2).map(function (id) { return { type: "f", id: id }; });
    var pool = [];
    var nW = Object.keys(p.weapons).length, nP = Object.keys(p.passives).length;
    Object.keys(p.weapons).forEach(function (k) { if (p.weapons[k] < MAX_LVL) pool.push({ type: "w", id: k, lvl: p.weapons[k] + 1, weight: 3 }); });
    if (nW < MAX_W) Object.keys(D.WEAPONS).forEach(function (k) {
      if (p.weapons[k] || !weaponAvailable(k) || p.consumed[k] || !allowed(D.WEAPONS[k]) || !questOk(D.WEAPONS[k])) return;
      pool.push({ type: "w", id: k, lvl: 1, weight: 2 });
    });
    Object.keys(D.PASSIVES).forEach(function (k) {
      var l = p.passives[k] || 0;
      if (l >= MAX_LVL || (!l && nP >= MAX_P) || (!l && (!allowed(D.PASSIVES[k]) || !questOk(D.PASSIVES[k])))) return;
      pool.push({ type: "p", id: k, lvl: l + 1, weight: l ? 2 : 1.5 });
    });
    while (out.length < n && pool.length) {
      var total = pool.reduce(function (s, c) { return s + c.weight; }, 0), x = Math.random() * total;
      for (var i = 0; i < pool.length; i++) { x -= pool[i].weight; if (x <= 0 || i === pool.length - 1) { out.push(pool.splice(i, 1)[0]); break; } }
    }
    if (!out.length) out = [{ type: "heal" }, { type: "gold" }];
    return out;
  }
  function applyFusion(id) {
    var f = D.FUSIONS[id], a = f.from[0], b = f.from[1], neww = {};
    Object.keys(p.weapons).forEach(function (k) {
      if (k === a) neww[id] = 1;
      else if (k === b && ALLW[b]) return;
      else neww[k] = p.weapons[k];
    });
    p.weapons = neww;
    p.consumed[a] = true; if (ALLW[b]) p.consumed[b] = true;
    delete p.timers[a]; delete p.timers[b];
    burst(p.x, p.y, "#f6d36b", 24);
    if (p === me) {
      r.fusions++; if (f.tier === 2) r.legend++;
      if (!chestSilent) { banner((f.tier === 2 ? "Légendaire : " : "Fusion : ") + f.name + " !"); SND.fusion(); }
    }
  }
  function iconOf(k) { return ALLW[k] ? ALLW[k].icon : (D.PASSIVES[k] ? D.PASSIVES[k].sprite : "nut"); }
  function owns(k) { return ALLW[k] ? !!p.weapons[k] : !!p.passives[k]; }
  function lvlOf(k) { return ALLW[k] ? (p.weapons[k] || 0) : (p.passives[k] || 0); }
  function img(name, cls) { return '<img' + (cls ? ' class="' + cls + '"' : "") + ' src="' + spriteUrl(name) + '" alt="">'; }
  // fusions dont « k » est un ingrédient
  function synergies(k) {
    var out = [];
    Object.keys(D.FUSIONS).forEach(function (id) {
      var f = D.FUSIONS[id], i = f.from.indexOf(k);
      if (i < 0 || p.weapons[id] || p.consumed[id]) return;
      out.push({ id: id, partner: f.from[1 - i] });
    });
    return out;
  }
  function synHtml(k) {
    var list = synergies(k);
    if (!list.length) return "";
    return '<span class="syn">' + list.slice(0, 3).map(function (s) {
      var have = owns(s.partner), f = D.FUSIONS[s.id];
      return '<span class="syn-row' + (have ? " have" : "") + '">🔗 ' + img(iconOf(s.partner)) + esc(ingredientName(s.partner)) +
        (have ? " (niv. " + lvlOf(s.partner) + "/5)" : "") + " → " + img(f.icon) + "<b>" + esc(f.name) + "</b></span>";
    }).join("") + "</span>";
  }
  function recipeHtml(id) {
    var f = D.FUSIONS[id], a = f.from[0], b = f.from[1], bw = !!ALLW[b];
    return '<span class="recipe">' + img(iconOf(a)) + " + " + img(iconOf(b)) + " → " + img(f.icon) + "</span>" +
      '<span class="replace">Remplace <b>' + esc(ingredientName(a)) + "</b>" + (bw ? " et <b>" + esc(ingredientName(b)) + "</b> (libère une case)" : " · <b>" + esc(ingredientName(b)) + "</b> reste") + "</span>";
  }
  var currentChoices = [];
  function openLevelUp() {
    p = me;
    if (r.betPend) {
      r.betPend = false;
      if (betWin(me)) { pending += (tal(me, "flambeuse_t1") ? 2 : 1) + (setCount(me, "vatout") >= 3 ? 1 : 0); banner("Mise gagnée : cartes en plus !"); SND.fusion(); }
      else if (setCount(me, "vatout") >= 2 && Math.random() < 0.25) { banner("Mise perdue… mais le Va-tout te laisse une carte"); }
      else { banner("Mise perdue…"); if (tal(me, "flambeuse_t2")) addGold(20); pending = Math.max(0, pending - 1); SND.hurt(); if (pending <= 0) return; }
    }
    if (humans() > 1 || isArena()) { picking = true; me.choosing = true; sendInput(); } else state = "levelup";
    clearInput();
    currentChoices = choices(3 + (me.char.id === "noisette" ? 1 : 0) + (me.extraChoice || 0) + (p.luck > 1.3 && Math.random() < 0.3 ? 1 : 0));
    var html = '<span class="kicker">Niveau ' + r.level + " !</span><h2>Choisis un pouvoir</h2><div class=\"choices\">";
    currentChoices.forEach(function (c, i) {
      var icon, name, lvl = "", desc, cls = "choice", extra = "", vc = v2Card(c);
      if (vc) { icon = vc.iconTxt ? '<span class="choice-emoji">' + vc.iconTxt + "</span>" : img(vc.icon); name = vc.name; lvl = vc.lvl; desc = vc.desc; cls += vc.cls; }
      else if (c.type === "f") {
        var f = D.FUSIONS[c.id];
        icon = img(f.icon); name = f.name; lvl = f.tier === 2 ? "Fusion légendaire !" : "Fusion !"; cls += f.tier === 2 ? " is-fusion is-legend" : " is-fusion";
        desc = f.desc[0]; extra = recipeHtml(c.id) + synHtml(c.id);
      } else if (c.type === "w") {
        var w = ALLW[c.id];
        icon = img(w.icon); name = w.name;
        lvl = c.lvl === 1 ? "Nouvelle arme" : "Niv. " + c.lvl; desc = w.desc[c.lvl - 1];
        if (w.fusion) cls += w.legend ? " is-fusion is-legend" : " is-fusion";
        extra = synHtml(c.id);
      } else if (c.type === "p") {
        icon = img(D.PASSIVES[c.id].sprite); name = D.PASSIVES[c.id].name;
        lvl = c.lvl === 1 ? "Nouvel objet" : "Niv. " + c.lvl; desc = D.PASSIVES[c.id].desc;
        extra = synHtml(c.id);
      } else if (c.type === "heal") {
        icon = img("berry"); name = "Panier de baies"; desc = "Soigne 40 PV.";
      } else {
        icon = img("goldbag"); name = "Bourse de glands"; desc = "+15 glands d'or.";
      }
      html += '<button type="button" class="' + cls + '" data-choice="' + i + '"><span class="choice-key">' + (i + 1) + "</span>" +
        '<span class="choice-icon">' + icon + "</span>" +
        '<span class="choice-text"><strong>' + esc(name) + "</strong>" + (lvl ? "<em>" + lvl + "</em>" : "") + "<span>" + esc(desc) + "</span>" + extra + "</span></button>";
    });
    html += '</div><div class="btn-row center">';
    if (me.rerolls > 0) html += '<button class="btn btn-alt btn-small" type="button" data-action="reroll">🎲 Relancer (' + me.rerolls + ")</button>";
    if (me.char.id === "trefle") html += '<button class="btn btn-small" type="button" data-action="bet">🍀 Miser (2 cartes au prochain niveau, ou rien)</button>';
    html += '<button class="btn btn-ghost btn-small" type="button" data-action="skip">Passer (+3 ' + goldIc() + ")</button></div>";
    showCard(html, "levelup");
    SND.level();
  }
  function refreshCounts() {
    r.nWeapons = Object.keys(p.weapons).length; r.nPassives = Object.keys(p.passives).length;
    r.maxedWeapon = r.maxedWeapon || Object.keys(p.weapons).some(function (k) { return p.weapons[k] >= MAX_LVL; });
  }
  // applique un choix au joueur actif « p » (moi, ou un invité côté hôte)
  function famTrack() {
    if (!r || p !== me) return;
    var n = { retour: 0, compagnon: 0 };
    Object.keys(p.weapons).forEach(function (k) { var t = D.TECH[k]; if (!t) return; if (n[t.fam] !== undefined) n[t.fam]++; if (t.fam === "retour" && p.weapons[k] >= MAX_LVL) r.retour5 = 1; });
    r.retourMax = Math.max(r.retourMax || 0, n.retour); r.compMax = Math.max(r.compMax || 0, n.compagnon);
  }
  function applyCore(c) {
    if (v2Apply(c)) { calc(p); famTrack(); return; }
    if (c.type === "f") applyFusion(c.id);
    else if (c.type === "w") { p.weapons[c.id] = c.lvl; famTrack(); }
    else if (c.type === "p") { p.passives[c.id] = c.lvl; if (c.id === "appetit") p.hp += 20; if (c.id === "mousse" && c.lvl === 1) p.shield = true; }
    else if (c.type === "heal") p.hp += 40;
    else if (c.type === "fullheal") p.hp = p.maxHp;
    else if (c.type === "maxhp") { p.bonusHp = (p.bonusHp || 0) + 10; calc(p); p.hp += 10; }
    else if (c.type === "skip") addGold(3);
    else if (c.type === "gold") addGold(15);
    calc(p);
  }
  function apply(c) {
    if ((state !== "levelup" && !picking) || !c) return;
    p = me;
    applyCore(c);
    refreshCounts();
    if (Net.on && Net.role === "guest") netSend("pick", { id: me.id, c: { type: c.type, id: c.id, lvl: c.lvl } });
    afterChoice();
  }
  function afterChoice() {
    pending = Math.max(0, pending - 1);
    if (pending > 0) { openLevelUp(); return; }
    if (isArena() && r.phase === "shop") { openShop(); return; }
    if (picking) { picking = false; me.choosing = false; hideCard(); sendInput(); }
    else { state = "play"; hideCard(); last = performance.now(); }
  }
  function addGold(n) { r.gold += n * p.goldMul; }

  /* =====================================================================
     Succès
     ===================================================================== */
  var EMPTY_RUN = { time: 0, kills: 0, level: 0, bosses: 0, berries: 0, lastHit: 0, fusions: 0, props: 0 };
  function totals(run) {
    var s = S.stats;
    return { kills: s.kills + (run && !run.committed ? run.kills : 0), goldEarned: s.goldEarned, played: s.played, maps: s.maps, bought: s.bought,
             rank: S.rank, prestige: S.prestige, spent: spentPoints() };
  }
  function checkQuests(run) {
    if (!run || !r) return;
    S.quests = S.quests || {};
    run.tot = { voltes: (S.stats.voltes || 0) + (run.committed ? 0 : (run.voltes || 0)), extracts: (S.stats.extracts || 0) + (!run.settled && run.extracted ? 1 : 0), trials: S.stats.trials || 0, revives: S.stats.revives || 0, coopMega: S.stats.coopMega || 0, nights: (S.stats.nights || 0) + (!run.settled && run.nightDone ? 1 : 0), evoC: S.stats.evoC || 0, seen: Object.keys(S.stats.seenI || {}).length };
    D.QUESTS.forEach(function (q) {
      if (S.quests[q.id]) return;
      var ok = false; try { ok = q.check(run); } catch (e) {}
      if (!ok) return;
      S.quests[q.id] = Date.now(); save();
      questToast(questReward(q.id));
    });
  }
  function questById(id) { return D.QUESTS.filter(function (q) { return q.id === id; })[0] || { desc: "" }; }
  function questReward(qid) {
    var it = D.ITEMS.filter(function (x) { return x.quest === qid; })[0];
    if (it) { var ra = D.RARITIES[it.r]; return { kind: "l'objet", name: it.name, desc: "(" + ra.name.toLowerCase() + ") " + it.desc, icon: it.icon, color: ra.color }; }
    var k, d;
    for (k in D.ARMES) { d = D.ARMES[k]; if (d.quest === qid) return { kind: "l'arme", name: d.name, desc: d.desc, icon: img(d.icon), color: "#f2b05e" }; }
    for (k in D.WEAPONS) { d = D.WEAPONS[k]; if (d.quest === qid) return { kind: "l'arme", name: d.name, desc: d.desc[0], icon: img(d.icon), color: "#f2b05e" }; }
    for (k in D.PASSIVES) { d = D.PASSIVES[k]; if (d.quest === qid) return { kind: "l'amélioration", name: d.name, desc: d.desc, icon: img(d.sprite), color: "#9cc56b" }; }
    for (k in D.FUSIONS) { d = D.FUSIONS[k]; if (d.quest === qid) return { kind: "la fusion", name: d.name, desc: ingredientName(d.from[0]) + " + " + ingredientName(d.from[1]), icon: img(d.icon), color: "#f6d36b" }; }
    for (k = 0; k < D.CHARACTERS.length; k++) { d = D.CHARACTERS[k]; if (d.quest === qid) return { kind: "le perso", name: d.name + " (" + d.title.toLowerCase() + ")", desc: "", icon: img(d.sprite), color: "#b07cf0" }; }
    return { kind: "", name: "?", desc: "", icon: "❔", color: "#e8e0d0" };
  }
  function questToast(it) {
    var box = $("[data-toasts]"); if (!box) return;
    var el = document.createElement("div");
    el.className = "game-toast item-toast quest-toast"; el.style.setProperty("--rc", it.color);
    el.innerHTML = "<strong>🔓 Quête réussie : " + it.kind + " " + esc(it.name) + "</strong><span>" + esc(it.desc) + "</span>";
    box.appendChild(el); SND.ach();
    setTimeout(function () { el.classList.add("out"); }, 4200);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 4800);
  }
  function checkAchievements(run) {
    checkQuests(run);
    var t = totals(run), got = [];
    D.ACHIEVEMENTS.forEach(function (a) {
      if (S.ach[a.id]) return;
      var ok = false;
      try { ok = a.check(run || EMPTY_RUN, t); } catch (e) {}
      if (!ok) return;
      S.ach[a.id] = Date.now();
      earnGold(a.gold);
      got.push(a);
      if (run) run.newAch.push(a);
      toast(a);
    });
    if (got.length) { save(); SND.ach(); }
    return got;
  }
  function unlocksOf(id) {
    var out = [];
    D.CHARACTERS.forEach(function (c) { if (c.unlock === id) out.push(c.name + " (" + c.title.toLowerCase() + ")"); });
    D.MAPS.forEach(function (m) { if (m.unlock === id) out.push("la carte " + m.name); });
    Object.keys(D.WEAPONS).forEach(function (k) { if (D.WEAPONS[k].unlock === id) out.push("l'arme " + D.WEAPONS[k].name); });
    D.SHOP.forEach(function (s) { if (s.unlock === id) out.push("l'amélioration " + s.name); });
    Object.keys(D.DIFFICULTIES).forEach(function (k) { if (D.DIFFICULTIES[k].unlock === id) out.push("le mode " + D.DIFFICULTIES[k].name); });
    return out;
  }
  function toast(a) {
    var box = $("[data-toasts]");
    var el = document.createElement("div");
    el.className = "game-toast";
    var un = unlocksOf(a.id);
    el.innerHTML = "<strong>🏆 " + esc(a.name) + "</strong><span>+" + a.gold + " " + goldIc() + (un.length ? " · Débloque " + esc(un.join(", ")) : "") + "</span>";
    box.appendChild(el);
    setTimeout(function () { el.classList.add("out"); }, 3600);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 4200);
  }

  /* =====================================================================
     Mise à jour
     ===================================================================== */
  /* =====================================================================
     2.0 : les 3 états du mouvement (Ancré, Mouvement, Volte), les postures
     et les règles uniques des écureuils (Noisette, Capitaine, Planeur)
     ===================================================================== */
  var V2 = D.V2;
  var FAMILY = { shooter: "tir", rocket: "tir", chain: "tir", storm: "tir", slash: "melee", whip: "melee", spin: "melee",
                 aura: "zone", nova: "zone", orbit: "zone", radial: "zone", thorns: "zone", lob: "zone", meteor: "zone", tether: "zone",
                 boomerang: "retour", pet: "compagnon", turret: "compagnon", drone: "compagnon" };
  function familyOf(w) { return w.family || FAMILY[w.type] || "zone"; }
  function posturesOf(cid) { return D.POSTURES[cid] || []; }
  function postureOk(ps) { return !ps.quest || !!(S.quests && S.quests[ps.quest]); }
  function postureOf(cid, want) {
    var list = posturesOf(cid), ps = list.filter(function (x) { return x.id === want && postureOk(x); })[0];
    return ps || list[0] || { id: "", name: "" };
  }
  function postureDef(pl) { return posturesOf(pl.char.id).filter(function (x) { return x.id === pl.posture; })[0] || { id: "", color: "#fdf3de" }; }
  function stateTick(pl, v, dt) {
    var mv = Math.hypot(v.x, v.y) > 0.15;
    var wasCd = pl.volteCd || 0;
    pl.volteCd = Math.max(0, wasCd - dt);
    if (wasCd > 0 && pl.volteCd === 0) { pl.volteFlash = 0.6; if (pl.items && itn(pl, "double_detente") && !(pl.vCh > 0)) { pl.vCh = 1; pl.volteCd = pl.volteBase || V2.volteCd; } }           // l'éclair : la Volte est prête
    pl.volteFlash = Math.max(0, (pl.volteFlash || 0) - dt);
    pl.volteT = Math.max(0, (pl.volteT || 0) - dt);
    if (mv) {
      var d = Math.hypot(v.x, v.y), nx = v.x / d, ny = v.y / d;
      if (pl.runT >= V2.turnRun && pl.dir && nx * pl.dir.x + ny * pl.dir.y < V2.turnDot) volte(pl, nx, ny);
      pl.runT = (pl.runT || 0) + dt; pl.dir = { x: nx, y: ny }; pl.idleT = 0; pl.hooked = false;
    } else {
      if ((pl.runT || 0) >= V2.stopRun && pl.dir) volte(pl, pl.dir.x, pl.dir.y);
      pl.runT = 0; pl.idleT = (pl.idleT || 0) + dt;
    }
    if (pl.char.id === "planeur" && !mv && !pl.hooked) tryHook(pl);
    pl.anchored = !mv && pl.idleT >= (pl.anchorTh || V2.anchorT) && (pl.char.id !== "planeur" || pl.hooked);
    pl.anchorT = pl.anchored ? (pl.anchorT || 0) + dt : 0;
    pl.cpT = Math.max(0, (pl.cpT || 0) - dt);
    if (pl.items) {
      if (itn(pl, "pierre_patience") && pl.anchorT >= 2) pl.ppRdy = true;
      if (itn(pl, "racine_mere") && pl.anchored) pl.rmRed = Math.min(0.6, (pl.rmRed || 0) + 0.1 * dt);
    }
    if (r && pl === me) {                                   // suivi pour les quêtes
      if (pl.anchored) { r.anchorTot = (r.anchorTot || 0) + dt; if (pl.anchorT > (r.anchorMax || 0)) r.anchorMax = pl.anchorT; if (pl.anchorT >= 5 && !pl.a5) { pl.a5 = 1; r.anchor5N = (r.anchor5N || 0) + 1; } } else pl.a5 = 0;
      if (pl.dx0 !== undefined) r.dist = (r.dist || 0) + Math.min(20, Math.hypot(pl.x - pl.dx0, pl.y - pl.dy0)); pl.dx0 = pl.x; pl.dy0 = pl.y;
      if ((pl.runT || 0) > (r.runMax || 0)) r.runMax = pl.runT;
      if (pl.epts) { r.eptMax = r.eptMax || {}; for (var ek in pl.epts) if (pl.epts[ek] > (r.eptMax[ek] || 0)) r.eptMax[ek] = pl.epts[ek]; }
    }
    pl.mstate = pl.volteT > 0 ? "volte" : pl.anchored ? "ancre" : mv ? "mouvement" : "pause";
    postureStats(pl);
  }
  // effets continus des postures (recalculés à chaque image)
  function postureStats(pl) {
    var ps = pl.posture, a = pl.anchored, m = pl.mstate === "mouvement";
    pl.cadX = 1; pl.dmgX = 1; pl.rangeMul = 1; pl.magX = 1; pl.dodgeX = 0; pl.spdX = 1;
    if (ps === "tireuse") {
      var cmax = tal(pl, "gachette") ? 1 : 0.6;
      if (a) { pl.cadX = 1 / (1 + Math.min(cmax, pl.anchorT * 0.3)); pl.cadKeep = pl.cadX; pl.cadKeepT = 2; }
      else if (tal(pl, "tircourse") && pl.cadKeepT > 0) { pl.cadKeepT -= 1 / 60; pl.cadX = pl.cadKeep; }
    }
    if (ps === "acrobate") { if (a) pl.dodgeX = 0.15; if (m) pl.spdX = 1.1; }
    if (ps === "glaneuse") { if (a) pl.magX = 1.5; if (m) pl.magX = tal(pl, "moisson") ? 3 : 2; }
    if (ps === "pique" && a) pl.cadX = 0.5;
    if (ps === "courant") { var sp = Math.hypot(pl.vx || 0, pl.vy || 0) / (pl.speed || 60); pl.dmgX = 1 + (tal(pl, "ouragan_t") ? 1.2 : 0.6) * Math.min(1, sp); }
    if (ps === "perchoir" && a) { pl.rangeMul = tal(pl, "longuevue") ? 2 : 1.6; pl.dmgX = 1.3 * (tal(pl, "sniper") && pl.anchorT > 2 ? 2 : 1); }
    if (hasSig(pl, "anchorDmg") && a && pl.anchorT > 1) pl.dmgX *= 2;
    if (hasSig(pl, "critRange")) pl.rangeMul *= 1.2;
    if (pl.sillT > 0) pl.spdX *= 1.3;
    if (pl.size > 1 && setCount(pl, "glouton") < 2) pl.spdX /= 1 + (tal(pl, "rouleau_t2") ? 0.17 : 0.35) * (pl.size - 1);
    var gv = gearHas(pl, "vitesse"); if (gv && m) pl.spdX *= 1 + gv.v / 100;
    var pz = pl.passives || {}, sk = pl.sigK || {};
    if (sk.longBreath && a) pl.rangeMul *= 2;
    pl.smokeX = sk.incense && a ? 1 + Math.min(1, 0.1 * pl.anchorT) : 1;
    if (sk.puddles && m && zoneAt(pl.x, pl.y + 3, "mark")) pl.spdX *= 1.2;
    if (sk.redBlade && pl.redSt) pl.dmgX *= 1 + 0.1 * pl.redSt;
    pl.armX = (sk.rally && a ? 2 : 0) + (pl.banT > 0 ? 2 : 0);
    if (pl.items) {
      var ni;
      if ((ni = itn(pl, "nid_mousse")) && a && pl.anchorT >= 3) pl.magX *= 2;
      if ((ni = itn(pl, "cadran")) && a) pl.cadX /= 1 + 0.25 * ni;
      if ((ni = itn(pl, "meditation")) && a && pl.anchorT >= 3) pl.dmgX *= 1 + Math.min(0.4, 0.04 * pl.anchorT) * ni;
      if ((ni = itn(pl, "vent_arriere")) && m && (pl.runT || 0) >= 3) { pl.spdX *= 1 + 0.25 * ni; pl.rangeMul *= 1 + 0.25 * ni; }
      if (pl.tamT > 0) pl.cadX /= 1.2;
      if (pl.ccT > 0) pl.ccOn = true; else pl.ccOn = false;
    }
    if (pl.gear && pl.gear.length) gearStats(pl, a, m);
    if (pz.racines && a) pl.dmgX *= 1 + 0.06 * pz.racines;
    if (pz.elan && m && (pl.runT || 0) >= 2) pl.dmgX *= 1 + 0.05 * pz.elan;
    if (pz.contrepied && pl.cpT > 0) pl.dmgX *= 1 + 0.12 * pz.contrepied;
  }
  function volte(pl, dx, dy) {
    if (pl.down) return;
    if (pl.volteCd > 0) { if (!(pl.vCh > 0)) return; pl.vCh--; }
    else pl.volteCd = pl.volteBase || V2.volteCd; pl.volteT = 0.35; r.voltes = (r.voltes || 0) + 1;
    fx.push({ kind: "ring", x: pl.x, y: pl.y, r: 18, life: 0.3, max: 0.3, col: "246,239,122" });
    var ps = pl.posture, pp = p; p = pl;
    if (ps === "tireuse") crown(pl);
    else if (ps === "acrobate") { pl.rollT = tal(pl, "longroulade") ? 0.56 : 0.28; pl.rollX = dx; pl.rollY = dy; pl.inv = Math.max(pl.inv, (tal(pl, "longroulade") ? 0.7 : 0.45) + (tal(pl, "intouchable") ? 1 : 0)); SND.whip(); }
    else if (ps === "glaneuse") { gems.forEach(function (g) { if ((g.kind === "xp" || (tal(pl, "aspiration") && g.kind !== "chest")) && Math.hypot(g.x - pl.x, g.y - pl.y) < 150) g.pull = 160; }); SND.pick(); }
    else if (ps === "bordee") { (pl.crew || []).forEach(function (mt) { crewShoot(pl, mt, 2); }); SND.boom(); }
    else if (ps === "abordage") { (pl.crew || []).forEach(function (mt) { mt.chargeT = tal(pl, "mutinerie") ? 2.8 : 1.4; mt.tgt = null; }); SND.whip(); }
    else if (ps === "convoi") { (pl.crew || []).forEach(function (mt) { fx.push({ kind: "spin", r: 16, life: 0.25, max: 0.25, pl: mt }); near(mt.x, mt.y, 24, function (e) { if (Math.hypot(e.x - mt.x, e.y - mt.y) < 16 + e.d.r) hurt(e, 12, (e.x - mt.x) * 3, (e.y - mt.y) * 3); }); }); SND.whip(); }
    else if (ps === "pique") {
      if (tal(pl, "faucon_t")) { var ft = nearest(1, 120)[0]; if (ft) { var fd = Math.hypot(ft.x - pl.x, ft.y - pl.y) || 1; dx = (ft.x - pl.x) / fd; dy = (ft.y - pl.y) / fd; } }
      pl.diveT = 0.35; pl.inv = Math.max(pl.inv, 0.5); pl.vx = dx * pl.speed * 2.6; pl.vy = dy * pl.speed * 2.6; SND.whip();
    }
    else if (ps === "courant") { ring(pl.x, pl.y, 50, false); near(pl.x, pl.y, 60, function (e) { var d = Math.hypot(e.x - pl.x, e.y - pl.y) || 1; if (d < 50 + e.d.r) hurt(e, 14, (e.x - pl.x) / d * 220, (e.y - pl.y) / d * 220); }); SND.boom(); }
    else if (ps === "perchoir") {
      var base = Math.atan2(dy, dx);
      for (var k = 0; k < 5; k++) { var ag = base + (k - 2) * 0.18; projs.push({ owner: pl, kind: "bullet", x: pl.x, y: pl.y - 3, vx: Math.cos(ag) * 200, vy: Math.sin(ag) * 200, dmg: 14, pierce: 3, sprite: "needle", life: 0.9, hit: [], r: 4, explode: 0 }); }
      SND.shot();
    }
    charVolte(pl, dx, dy);
    gearVolte(pl, dx, dy);
    pl.cpT = 1.5;
    techEntries(pl).forEach(function (en) { if (en.def.recall) pl.timers[en.key] = 0; });
    if (pl.items) volteItems(pl, dx, dy);
    p = pp;
  }
  // déplacements propres à la 2.0 ; renvoie true si le déplacement normal ne doit pas s'appliquer
  function v2Move(pl, v, dt) {
    var slw = slowMul(pl) * (pl.spdX || 1);
    if (pl.rollT > 0) {
      pl.rollT -= dt; pl.x += pl.rollX * 250 * dt; pl.y += pl.rollY * 250 * dt; pushOutGiants(pl, 5); pl.moving = true;
      if (tal(pl, "roulade_lame")) { var pp = p; p = pl; near(pl.x, pl.y, 16, function (e) { if (Math.hypot(e.x - pl.x, e.y - pl.y) < 10 + e.d.r && cooled(e, "roul", 0.3)) hurt(e, 20 * gpw(), pl.rollX * 100, pl.rollY * 100); }); p = pp; }
      return true;
    }
    if (pl.char.id === "planeur") {
      // inertie : on glisse sans cesse ; accroché, on ne bouge plus
      if (pl.hooked) { pl.vx = 0; pl.vy = 0; pl.moving = false; return true; }
      var k = Math.min(1, dt * (pl.diveT > 0 ? 0.4 : 2.2) * (1 + gv(pl, "vol_b") / 100));
      var vmax = pl.speed * 1.15 * (tal(pl, "ventarriere") ? 1.2 : 1);
      pl.vx += (v.x * vmax * slw - pl.vx) * k; pl.vy += (v.y * vmax * slw - pl.vy) * k;
      pl.x += pl.vx * dt; pl.y += pl.vy * dt;
      if (pl.diveT > 0) { pl.diveT -= dt; if (pl.diveT <= 0) diveHit(pl); }
      pl.moving = Math.hypot(pl.vx, pl.vy) > 8;
      if (pl.vx > 4) pl.face = 1; else if (pl.vx < -4) pl.face = -1;
      return true;
    }
    if (slw !== slowMul(pl)) { pl.x += v.x * pl.speed * (slw - slowMul(pl)) * dt; pl.y += v.y * pl.speed * (slw - slowMul(pl)) * dt; }
    return false;
  }
  function diveHit(pl) {
    var pp = p; p = pl;
    ring(pl.x, pl.y, 36, false); if (S.opts.shake) shake = Math.max(shake, 0.15);
    var dk = tal(pl, "grandplongeon") ? 1.6 : 1;
    near(pl.x, pl.y, 46, function (e) { var d = Math.hypot(e.x - pl.x, e.y - pl.y) || 1; if (d < 36 + e.d.r) hurt(e, 30 * dk, (e.x - pl.x) / d * 160, (e.y - pl.y) / d * 160); });
    if (tal(pl, "meteore_t")) zones.push({ x: pl.x, y: pl.y, r: 30, t: 0, dur: 3, kind: "fire", dmg: 0, owner: pl, pdmg: 10 * gpw() });
    if (tal(pl, "remontee")) pl.volteCd *= 0.5;
    SND.boom(); p = pp;
  }
  // le Planeur s'accroche à un grand arbre ou à une souche du décor
  function tryHook(pl) {
    if (Math.hypot(pl.vx || 0, pl.vy || 0) > 45) return;
    var best = null, bd = 1e9;
    if (useGiants()) {
      var cx = Math.floor(pl.x / GC), cy = Math.floor(pl.y / GC);
      for (var i = -1; i <= 1; i++) for (var j = -1; j <= 1; j++) { var g = giantAt(cx + i, cy + j); if (!g) continue; var d = Math.hypot(pl.x - g.x, (pl.y - g.y) * 1.4) - g.r; if (d < 18 && d < bd) { bd = d; best = g; } }
    }
    enemies.forEach(function (e) { if (!e.d.prop || e.dead) return; var d = Math.hypot(pl.x - e.x, pl.y - e.y) - 6; if (d < 16 && d < bd) { bd = d; best = e; } });
    if (!best && setCount(pl, "volplane") >= 2 && (pl.idleT || 0) > 0.3) best = { x: pl.x, y: pl.y };
    if (!best && !(tal(pl, "grappe") && (pl.idleT || 0) > 0.5)) return;
    pl.hooked = true; pl.vx = 0; pl.vy = 0;
    burst(pl.x, pl.y, "#c8a878", 4);
  }
  /* ---- Capitaine : l'équipage ---- */
  function newMatelot(pl) { return { k: "matelot", x: pl.x, y: pl.y, face: 1, anim: Math.random() * 2, cd: 0.5 + Math.random() * 0.5, chargeT: 0, hitCd: 0 }; }
  function crewMax(pl) { return (pl.posture === "convoi" ? 10 : 6) + (setCount(pl, "corsaire") >= 2 ? 2 : 0) + (tal(pl, "canonniers") ? 2 : 0) + (tal(pl, "longuefile") ? 3 : 0); }
  function recruit(pl, v) {
    if (!pl.crew) return;
    pl.recruitAcc += v * (pl.posture === "convoi" && pl.mstate === "mouvement" ? 2 : 1);
    var needN = 7;
    while (pl.recruitAcc >= needN) {
      pl.recruitAcc -= needN;
      if (pl.crew.length < crewMax(pl)) { pl.crew.push(newMatelot(pl)); r.recruits = (r.recruits || 0) + 1; if (tal(pl, "ravitaillement")) pl.hp = Math.min(pl.maxHp, pl.hp + 3); if (pl === me) SND.click(); }
    }
  }
  function crewShoot(pl, mt, mul) {
    var t = nearest(1, 130, mt)[0]; if (!t) return false;
    var a = Math.atan2(t.y - mt.y, t.x - mt.x); mt.face = Math.cos(a) >= 0 ? 1 : -1;
    projs.push({ owner: pl, kind: "bullet", x: mt.x, y: mt.y - 2, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, dmg: 6 * (mul || 1) * (tal(pl, "salvelourde") && pl.anchored ? 1.5 : 1) * gpw() * 1.6, pierce: 1, sprite: "miniacorn", life: 0.95, hit: [], r: 3, explode: setCount(pl, "corsaire") >= 3 ? 14 : 0 });
    return true;
  }
  function crewTick(pl, dt) {
    if (!pl.crew) return;
    // la file suit le chemin du Capitaine
    var tr = pl.trail, last = tr[0];
    if (!last || Math.hypot(last.x - pl.x, last.y - pl.y) > 2) { tr.unshift({ x: pl.x, y: pl.y }); if (tr.length > 200) tr.length = 200; }
    var gap = pl.posture === "convoi" && pl.mstate === "mouvement" ? 7 : 5, circle = pl.posture === "abordage" && pl.anchored;
    if (pl.posture === "convoi" && pl.anchored) { pl.convoiT = (pl.convoiT || 0) + dt; if (pl.convoiT >= 8) { pl.convoiT = 0; if (pl.crew.length < crewMax(pl)) { pl.crew.push(newMatelot(pl)); r.recruits++; } } }
    var salvo = (pl.posture === "bordee" && (pl.anchored || tal(pl, "couverture"))) || tal(pl, "lignetir");
    if (salvo) { pl.salvoT = (pl.salvoT || 0) - dt; if (pl.salvoT <= 0) { pl.salvoT = (tal(pl, "lignetir") ? 1.5 : tal(pl, "batterie") && pl.anchored ? 0.3 : !pl.anchored ? 1.1 : 0.55) * (pl.cdMul || 1); var ppS = p; p = pl; pl.crew.forEach(function (mt) { crewShoot(pl, mt, 1); }); p = ppS; } }
    if (circle && tal(pl, "bouclierh")) for (var hi = hostile.length - 1; hi >= 0; hi--) { var hh = hostile[hi]; if (pl.crew.some(function (mt) { return Math.abs(mt.x - hh.x) < 6 && Math.abs(mt.y - hh.y) < 6; })) hostile.splice(hi, 1); }
    pl.crew.forEach(function (mt, i) {
      mt.anim += dt * 8; mt.cd -= dt; mt.hitCd -= dt;
      var tx, ty;
      if (mt.chargeT > 0) {
        mt.chargeT -= dt;
        if (!mt.tgt || mt.tgt.dead) mt.tgt = nearest(1, 160, mt)[0] || null;
        if (mt.tgt) { tx = mt.tgt.x; ty = mt.tgt.y; if (Math.hypot(tx - mt.x, ty - mt.y) < mt.tgt.d.r + 4 && mt.hitCd <= 0) { var pp = p; p = pl; var tgK = mt.tgt; hurt(tgK, 14 * gpw() * 1.4 * (tal(pl, "sabres") ? 1.5 : 1), (tx - mt.x) * 4, (ty - mt.y) * 4); if (tgK.dead && tal(pl, "recrue") && Math.random() < 0.25 && pl.crew.length < crewMax(pl)) { pl.crew.push(newMatelot(pl)); r.recruits++; } p = pp; mt.hitCd = 0.3; } }
        else { tx = pl.x; ty = pl.y; }
        var dx = tx - mt.x, dy = ty - mt.y, d = Math.hypot(dx, dy) || 1, sp = Math.min(d, 190 * dt); mt.x += dx / d * sp; mt.y += dy / d * sp; if (Math.abs(dx) > 1) mt.face = dx > 0 ? 1 : -1;
        return;
      }
      if (circle) { var a = r.time * 0.8 + i / pl.crew.length * TAU; tx = pl.x + Math.cos(a) * 20; ty = pl.y + Math.sin(a) * 15; }
      else { var pt = tr[Math.min(tr.length - 1, (i + 1) * gap)] || { x: pl.x, y: pl.y }; tx = pt.x; ty = pt.y; }
      var ex = tx - mt.x, ey = ty - mt.y; mt.x += ex * Math.min(1, dt * 10); mt.y += ey * Math.min(1, dt * 10);
      if (Math.abs(ex) > 0.5) mt.face = ex > 0 ? 1 : -1;
      if (tal(pl, "train") && pl.mstate === "mouvement") { var ppT = p; p = pl; near(mt.x, mt.y, 12, function (e) { if (Math.hypot(e.x - mt.x, e.y - mt.y) < 6 + e.d.r && cooled(e, "train", 0.4)) hurt(e, 8 * gpw(), (e.x - mt.x) * 3, (e.y - mt.y) * 3); }); p = ppT; }
      if (!salvo && mt.cd <= 0) { var pp2 = p; p = pl; if (crewShoot(pl, mt, 1)) mt.cd = 1.1 * (pl.cdMul || 1); else mt.cd = 0.3; p = pp2; }
    });
  }
  /* ---- rendu des états ---- */
  function drawStates(pl) {
    if (pl.down) return;
    var ps = postureDef(pl), x = Math.round(pl.x), y = Math.round(pl.y) + 7;
    // anneau d'ancrage au sol
    var k = pl.char.id === "planeur" ? (pl.hooked ? Math.min(1, (pl.idleT || 0) / V2.anchorT) : 0) : (pl.mstate === "mouvement" ? 0 : Math.min(1, (pl.idleT || 0) / V2.anchorT));
    if (k > 0) {
      ctx.strokeStyle = ps.color; ctx.globalAlpha = pl.anchored ? 0.55 + 0.25 * Math.sin(r.time * 6) : 0.6; ctx.lineWidth = pl.anchored ? 2 : 1;
      ctx.beginPath(); ctx.ellipse(x, y, 11, 5, 0, -Math.PI / 2, -Math.PI / 2 + k * TAU); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 1;
    }
    // recharge de la Volte (petit arc) et éclair quand elle est prête
    if (pl.volteCd > 0) { ctx.strokeStyle = "rgba(246,239,122,.5)"; ctx.beginPath(); ctx.arc(x + 9, y - 20, 2.5, -Math.PI / 2, -Math.PI / 2 + (1 - pl.volteCd / V2.volteCd) * TAU); ctx.stroke(); }
    if (pl.volteFlash > 0 && ((pl.volteFlash * 12) | 0) % 2 === 0) { ctx.fillStyle = "#f6ef7a"; ctx.fillRect(x + 8, y - 25, 2, 3); ctx.fillRect(x + 7, y - 23, 2, 2); ctx.fillRect(x + 6, y - 22, 2, 3); }
    if (pl.volteT > 0) { ctx.globalAlpha = pl.volteT / 0.35 * 0.5; blit(SPR[pl.sprite][0], pl.x - (pl.dir ? pl.dir.x * 6 : 0), pl.y - (pl.dir ? pl.dir.y * 6 : 0), pl.face < 0, true); ctx.globalAlpha = 1; }
  }
  /* ---------- 2.0 phase 2 : techniques habillées par l'arme, évolutions, fusions ---------- */
  function mapv(v, f) { return Array.isArray(v) ? v.map(f) : (typeof v === "number" ? f(v) : v); }
  function applyMods(d, m) {
    if (!m) return;
    Object.keys(m.mul || {}).forEach(function (k) { if (d[k] !== undefined) d[k] = mapv(d[k], function (x) { return x * m.mul[k]; }); });
    Object.keys(m.add || {}).forEach(function (k) { d[k] = d[k] === undefined ? m.add[k] : mapv(d[k], function (x) { return x + m.add[k]; }); });
    Object.keys(m.set || {}).forEach(function (k) {
      if (k === "hfx" && d.hfx) { var o = {}; Object.keys(d.hfx).forEach(function (q) { o[q] = d.hfx[q]; }); Object.keys(m.set.hfx).forEach(function (q) { o[q] = m.set.hfx[q]; }); d.hfx = o; }
      else d[k] = m.set[k];
    });
  }
  function armeOf(pl) { return D.ARMES[pl.arme] || D.ARMES.katana; }
  // définition effective d'une technique pour ce joueur (habillage + évolution + fusion d'objet)
  function techDef(pl, id, evo, fus) {
    var base = ALLW[id]; if (!base) return null;
    if (base.type === "combo") return base;
    evo = evo === undefined ? (pl.evo || {})[id] : evo; fus = fus === undefined ? (pl.tfus || {})[id] : fus; fus = fus === true ? 1 : fus || 0;
    var key = id + "|" + (evo || "") + "|" + fus + "|" + (pl.arme || "");
    pl.tdef = pl.tdef || {};
    if (pl.tdef[key]) return pl.tdef[key];
    var d = {}; Object.keys(base).forEach(function (k) { d[k] = base[k]; });
    var sk = D.TECH[id] && armeOf(pl).skin[id];
    if (sk) { d.name = sk[0]; if (sk[1]) { d.icon = sk[1]; if (d.type === "pet") d.pet = sk[1]; else if (d.type === "turret") d.turret = d.turret; else d.sprite = sk[1]; } d.generic = base.name; }
    if (evo && base.evos) { var ev = base.evos.filter(function (e) { return e.id === evo; })[0]; if (ev) { applyMods(d, ev); d.evoName = ev.name; } }
    var tf = fus === 2 ? D.TFUS2[id] : fus ? D.TFUS[id] : null;
    if (tf) { applyMods(d, tf); d.fusName = tf.name; d.fusion = true; }
    pl.tdef[key] = d;
    return d;
  }
  function techName(pl, id) { var d = techDef(pl, id); if (!d) return id; return d.name + (d.evoName ? " · " + d.evoName : "") + (d.fusName ? " · " + d.fusName : ""); }
  function scaleDmg(d, k) { var o = {}; Object.keys(d).forEach(function (q) { o[q] = d[q]; }); o.dmg = mapv(d.dmg, function (x) { return x * k; }); return o; }
  // liste de ce qui agit vraiment : les fusions de techniques font agir leurs composants
  function techEntries(pl) {
    var out = [];
    Object.keys(pl.weapons || {}).forEach(function (id) {
      var d = ALLW[id]; if (!d) return;
      if (d.type === "combo") {
        (pl.cparts && pl.cparts[id] || []).forEach(function (pt, i) {
          var pd = techDef(pl, pt.id, pt.evo, pt.fus); if (!pd) return;
          pd = scaleDmg(pd, d.mul || 1.35); (pt.fx || []).forEach(function (m) { applyMods(pd, m); });
          out.push({ key: id + "/" + i, def: pd, l: 4 });
        });
      } else out.push({ key: id, def: techDef(pl, id), l: pl.weapons[id] - 1 });
    });
    return out;
  }
  function isTech(id) { return !!D.TECH[id]; }
  // composants d'une fusion de techniques : leurs évolutions et fusions d'objet sont gardées
  function partsOf(pl, id) {
    if (pl.cparts && pl.cparts[id]) return pl.cparts[id];
    return [{ id: id, evo: (pl.evo || {})[id], fus: (pl.tfus || {})[id] || 0 }];
  }
  function comboReady(pl, cid) {
    var c = ALLW[cid];
    var fg = pl.ring && pl.ring.forgeron && !c.legend;
    return c.parts.every(function (q) { return pl.weapons[q] && (ALLW[q].type === "combo" || (fg && pl.weapons[q] >= 4) || (pl.weapons[q] >= MAX_LVL && (pl.evo || {})[q])); }) && !pl.weapons[cid];
  }
  // 3e évolution : arme en maîtrise 3 et 6 points de son élément (attirail et objets de niveau compris)
  function elemCOk(pl) { return !!(pl.ring && pl.ring.alchimiste) || ept(pl, armeOf(pl).element, 6); }
  function evoOk(pl, e, ei, ml) { return ei === 0 || (ml >= 3 && (!e.elemC || elemCOk(pl))); }
  function v2Choices(n) {
    var out = [], pool = [], pl = p, ar = armeOf(pl);
    var techs = Object.keys(pl.weapons).filter(function (k) { return ALLW[k]; });
    // évolutions d'abord : on choisit l'une des deux
    var ml = pl.arme ? mastLevel(pl.arme) : 1;
    techs.forEach(function (k) { var d = ALLW[k]; if (d.evos && pl.weapons[k] >= MAX_LVL && !(pl.evo || {})[k]) d.evos.forEach(function (e, ei) { if (evoOk(pl, e, ei, ml)) out.push({ type: "evo", id: k, evo: e.id }); }); });
    // fusions prêtes (technique + objet, technique + technique, légendaires)
    Object.keys(D.COMBOS).concat(Object.keys(D.LEGENDS)).forEach(function (cid) { if (comboReady(pl, cid)) out.push({ type: "cb", id: cid }); });
    techs.forEach(function (k) { if (!(pl.evo || {})[k] || (pl.tfus || {})[k]) return; [[D.TFUS[k], 1], [D.TFUS2[k], 2]].forEach(function (x) { if (x[0] && (pl.passives[x[0].p] || 0) >= MAX_LVL) out.push({ type: "pf", id: k, rec: x[1] }); }); });
    out = out.slice(0, Math.max(2, n - 1));
    techs.forEach(function (k) { if (ALLW[k].type !== "combo" && pl.weapons[k] < MAX_LVL) pool.push({ type: "w", id: k, lvl: pl.weapons[k] + 1, weight: 3 }); });
    if (techs.length < MAX_W) {
      Object.keys(ar.skin).concat(pl.extraTech || []).forEach(function (k) { if (!pl.weapons[k] && !pl.consumed[k]) pool.push({ type: "w", id: k, lvl: 1, weight: 2 * (pl.ring && pl.ring.menagerie && D.TECH[k] && D.TECH[k].fam === "compagnon" ? 2 : 1) }); });
      (D.SIGS[pl.arme] || []).forEach(function (sg, si) { if ((si === 0 ? ml >= 2 : ml >= 4) && !pl.weapons[sg.id]) pool.push({ type: "w", id: sg.id, lvl: 1, weight: 1.6 }); });
    }
    var nP = Object.keys(pl.passives).length;
    Object.keys(D.PASSIVES).forEach(function (k) {
      var l = pl.passives[k] || 0;
      if (l >= MAX_LVL || (!l && nP >= MAX_P) || (!l && (!allowed(D.PASSIVES[k]) || !questOk(D.PASSIVES[k])))) return;
      var w = l ? 2 : 1.4;
      if (!l && Object.keys(D.TFUS).some(function (t) { return pl.weapons[t] && (D.TFUS[t].p === k || (D.TFUS2[t] && D.TFUS2[t].p === k)); })) w += 1;   // l'objet d'une recette en cours
      pool.push({ type: "p", id: k, lvl: l + 1, weight: w });
    });
    while (out.length < n && pool.length) {
      var total = pool.reduce(function (s, c) { return s + c.weight; }, 0), x = Math.random() * total;
      for (var i = 0; i < pool.length; i++) { x -= pool[i].weight; if (x <= 0 || i === pool.length - 1) { out.push(pool.splice(i, 1)[0]); break; } }
    }
    if (setCount(pl, "apprentie") >= 3 && out.length && !out.some(function (c) { return c.type !== "p" && c.type !== "itm" && (c.type !== "w" || pl.weapons[c.id]); })) {
      var up = techs.filter(function (k) { return ALLW[k].type !== "combo" && pl.weapons[k] < MAX_LVL; })[0]; if (up) out[out.length - 1] = { type: "w", id: up, lvl: pl.weapons[up] + 1 };
    }
    if (pl.ring && pl.ring.collection) { var com = D.ITEMS.filter(function (it) { return it.r === 0 && !it.pool && allowed(it) && (!it.expe || isExpe()) && questOk(it); }); if (com.length) out.push({ type: "itm", id: com[(Math.random() * com.length) | 0].id }); }
    if (!out.length) out = [{ type: "heal" }, { type: "gold" }];
    return out;
  }
  function v2Apply(c) {
    var pl = p;
    if (c.type === "itm") { giveItem(pl, c.id); return true; }
    if (c.type === "evo") { pl.evo = pl.evo || {}; pl.evo[c.id] = c.evo; if (pl === me && ALLW[c.id].evos.some(function (e) { return e.id === c.evo && e.elemC; })) S.stats.evoC = (S.stats.evoC || 0) + 1; burst(pl.x, pl.y, "#6ad8ff", 16); if (pl === me) banner("Évolution : " + techName(pl, c.id)); return true; }
    if (c.type === "pf") { pl.tfus = pl.tfus || {}; pl.tfus[c.id] = c.rec || 1; burst(pl.x, pl.y, "#f6d36b", 22); if (pl === me) { r.fusions++; banner("Fusion : " + techName(pl, c.id)); SND.fusion(); } return true; }
    if (c.type === "cb") {
      var cd = ALLW[c.id], parts = [];
      cd.parts.forEach(function (q) { partsOf(pl, q).forEach(function (pt) { parts.push({ id: pt.id, evo: pt.evo, fus: pt.fus, fx: (pt.fx || []).slice() }); }); delete pl.weapons[q]; pl.consumed[q] = true; if (pl.cparts) delete pl.cparts[q]; delete pl.timers[q]; });
      if (cd.fx) parts.forEach(function (pt) { if (cd.fx[pt.id]) pt.fx.push(cd.fx[pt.id]); if (cd.fx["*"]) pt.fx.push(cd.fx["*"]); });
      pl.cparts = pl.cparts || {}; pl.cparts[c.id] = parts; pl.weapons[c.id] = MAX_LVL;
      burst(pl.x, pl.y, cd.legend ? "#ff9a3a" : "#f6d36b", 30);
      if (pl === me) { r.fusions++; if (cd.legend) r.legend++; banner((cd.legend ? "Légendaire : " : "Fusion : ") + cd.name + " !"); SND.fusion(); }
      return true;
    }
    return false;
  }
  function v2Card(c) {
    var pl = me, d;
    if (c.type === "itm") { var it = ITM[c.id]; return { icon: "ITEMICON", iconTxt: it.icon, name: it.name, lvl: "Objet commun (anneau du collectionneur)", desc: it.desc, cls: "" }; }
    if (c.type === "evo") { var ev = ALLW[c.id].evos.filter(function (e) { return e.id === c.evo; })[0]; d = techDef(pl, c.id); var eel = D.ELEMENTS[armeOf(pl).element]; return { icon: d.icon, name: d.name + " → " + ev.name, lvl: ev.elemC ? "Évolution élémentaire · " + (eel ? eel.name : "") : "Évolution", desc: ev.desc, cls: ev.elemC ? " is-fusion is-legend" : " is-fusion" }; }
    if (c.type === "pf") { var tf = c.rec === 2 ? D.TFUS2[c.id] : D.TFUS[c.id]; d = techDef(pl, c.id); return { icon: d.icon, name: d.name + " + " + D.PASSIVES[tf.p].name, lvl: "Fusion : " + tf.name, desc: tf.desc, cls: " is-fusion" }; }
    if (c.type === "cb") { var cb = ALLW[c.id]; return { icon: cb.icon, name: cb.name, lvl: cb.legend ? "Fusion légendaire !" : "Fusion de techniques", desc: cb.desc[0] + " Recette : " + cb.parts.map(function (q) { return ALLW[q].type === "combo" ? ALLW[q].name : techDef(pl, q).name; }).join(" + ") + ". Libère un emplacement.", cls: cb.legend ? " is-fusion is-legend" : " is-fusion" }; }
    if (c.type === "w") {
      d = techDef(pl, c.id);
      var fam = { tir: "Tir", melee: "Mêlée", zone: "Zone", retour: "Retour", compagnon: "Compagnon" }[d.family] || "";
      var hint = d.type === "sig" ? "Signature" + (c.lvl > 1 ? " · niv. " + c.lvl : "") : isTech(c.id) ? (c.lvl === 1 ? "Technique " + fam + " (" + d.generic + ")" : "Niv. " + c.lvl) : "Attaque de base · niv. " + c.lvl;
      var desc = c.lvl === 1 && isTech(c.id) ? "Nouvelle technique. Au niveau 5 : " + ALLW[c.id].evos.filter(function (e, ei) { return evoOk(me, e, ei, me.arme ? mastLevel(me.arme) : 1); }).map(function (e) { return e.name; }).join(" ou ") + "." : (d.desc && d.desc[c.lvl - 1]) || "Amélioration.";
      return { icon: d.icon, name: d.name, lvl: hint, desc: desc, cls: "" };
    }
    return null;
  }
  // arme tirée au début de chaque partie (3 parmi celles débloquées)
  function openDraft() {
    state = "levelup"; clearInput();
    var ids = Object.keys(D.ARMES).filter(function (id) { return questOk(D.ARMES[id]); }).sort(function () { return Math.random() - 0.5; }).slice(0, 3);
    var html = '<span class="kicker">Nouvelle partie</span><h2>Choisis ton arme</h2><div class="choices">';
    ids.forEach(function (id, i) {
      var a = D.ARMES[id], b = ALLW[a.base];
      html += '<button type="button" class="choice" data-action="parme" data-arg="' + id + '"><span class="choice-key">' + (i + 1) + '</span><span class="choice-icon">' + img(a.icon) + '</span>' +
        '<span class="choice-text"><strong>' + esc(a.name) + "</strong><em>" + esc(b.name) + "</em><span>" + esc(a.desc) + "</span></span></button>";
    });
    showCard(html + "</div>", "draft");
  }
  function pickArme(id) {
    var a = D.ARMES[id]; if (!a) return;
    me.arme = id; me.ultG = 0; me.ultK = undefined; me.weapons = {}; me.weapons[a.base] = 1; me.evo = {}; me.tfus = {}; me.cparts = {}; me.tdef = {}; me.timers = {};
    r.arme = id; calc(me); refreshCounts();
    state = "play"; hideCard(); last = performance.now();
  }
  /* ---- nouveaux comportements ---- */
  function lineHit(x0, y0, ang, len, wd, fn) {
    var cx = Math.cos(ang), cy = Math.sin(ang);
    near(x0 + cx * len / 2, y0 + cy * len / 2, len / 2 + wd + 12, function (e) {
      var dx = e.x - x0, dy = e.y - y0, t = dx * cx + dy * cy; if (t < -4 || t > len + e.d.r) return;
      if (Math.abs(-dx * cy + dy * cx) > wd + e.d.r) return; fn(e, cx, cy);
    });
  }
  function aimAngle(range) { var t = nearest(1, range)[0]; return t ? Math.atan2(t.y - p.y, t.x - p.x) : (p.dir ? Math.atan2(p.dir.y, p.dir.x) : (p.face > 0 ? 0 : Math.PI)); }
  BEHAVIOR.beam = function (id, w, l, dt) {
    if (!timer(id, V(w, "cd", l), dt)) return;
    var len = V(w, "len", l) * p.area, wd = V(w, "w", l), dmg = V(w, "dmg", l), k = w.split || 1;
    var a0 = w.sweep ? (p.st[id + "#sw"] = (p.st[id + "#sw"] || 0) + 0.75) : aimAngle(len), angs = [];
    for (var i = 0; i < k; i++) angs.push(a0 + (i - (k - 1) / 2) * (w.sweep && k > 1 ? TAU / k : 0.35));
    if (w.mirror) angs = angs.concat(angs.map(function (a) { return a + Math.PI; }));
    var hk = HIT_ELEM; if (w.elemX) HIT_ELEM = w.elemX;
    angs.forEach(function (ag) {
      fx.push({ kind: "beam", x: p.x, y: p.y - 2, a: ag, len: len, w: wd, life: 0.2, max: 0.2, col: w.elemX ? "200,248,232" : w.color || "246,239,122" });
      lineHit(p.x, p.y, ag, len, wd, function (e, cx, cy) { hurt(e, dmg, w.push ? cx * 160 : 0, w.push ? cy * 160 : 0); });
      if (w.trail && HIT_ELEM) for (var t = 1; t <= 3; t++) markZone(p.x + Math.cos(ag) * len * t / 3.4, p.y + Math.sin(ag) * len * t / 3.4, 11, 2.5, HIT_ELEM);
    });
    HIT_ELEM = hk;
    if (!w.sweep || Math.random() < 0.3) SND.zap();
  };
  BEHAVIOR.lunge = function (id, w, l, dt) {
    if (!timer(id, V(w, "cd", l), dt)) return;
    var len = V(w, "len", l) * p.area, wd = V(w, "w", l), dmg = V(w, "dmg", l), ag0 = aimAngle(len + 20), angs = [ag0];
    if (w.root3 && p.anchored) angs.push(ag0 - 0.55, ag0 + 0.55);
    if (w.mirror) angs = angs.concat(angs.map(function (a) { return a + Math.PI; }));
    angs.forEach(function (ag) {
      fx.push({ kind: "beam", x: p.x, y: p.y, a: ag, len: len, w: wd * 0.6, life: 0.14, max: 0.14, col: w.color || "253,243,222" });
      lineHit(p.x, p.y, ag, len, wd, function (e, cx, cy) { hurt(e, dmg * (w.execute && e.hp < e.maxHp * 0.3 ? 2 : 1), cx * 120, cy * 120); });
    });
    SND.whip();
  };
  BEHAVIOR.wave = function (id, w, l, dt) {
    if (!timer(id, V(w, "cd", l), dt)) return;
    var a0 = aimAngle(V(w, "range", l) + 30), k = w.fan || 1, spd = w.spd || 150, rr = V(w, "r", l) * p.area * (w.runWide ? 1 + Math.min(1, (p.runT || 0) / 3) : 1);
    for (var i = 0; i < k; i++) {
      var ag = a0 + (i - (k - 1) / 2) * 0.6;
      projs.push({ owner: p, kind: "bullet", x: p.x, y: p.y - 2, vx: Math.cos(ag) * spd, vy: Math.sin(ag) * spd, dmg: V(w, "dmg", l), pierce: 99, sprite: w.sprite || "windblade", life: V(w, "range", l) / spd, hit: [], r: rr, explode: 0 });
      if (w.mines) for (var mi = 1; mi <= 3; mi++) pZone({ x: p.x + Math.cos(ag) * V(w, "range", l) * mi / 3, y: p.y + Math.sin(ag) * V(w, "range", l) * mi / 3, r: 12 * p.area, dur: 3, kind: "thorn", dmg: V(w, "dmg", l) * 0.25, owner: p });
    }
    SND.whip();
  };
  BEHAVIOR.riposte = function (id, w, l, dt) {
    p.ripo = p.ripo || {}; var st = p.ripo[id] = p.ripo[id] || { cd: 0 };
    st.cd = Math.max(0, st.cd - dt); st.w = w; st.l = l;
    if (w.auto) { st.autoT = (st.autoT || 0) + dt; if (st.autoT >= w.auto) { st.autoT = 0; riposteBlast(p, w, l); } }
  };
  function riposteBlast(pl, w, l) {
    var pp = p; p = pl; var R = V(w, "R", l) * pl.area, dm = V(w, "dmg", l);
    if (w.patient && pl.anchored && (pl.anchorT || 0) >= 2) { R *= 1.8; dm *= 1.5; }
    if (w.auraPulse) { R *= 1.5; dm *= 2; }
    fx.push({ kind: "ring", x: pl.x, y: pl.y, r: R, life: 0.3, max: 0.3, col: "253,243,222" });
    near(pl.x, pl.y, R + 12, function (e) { var d = Math.hypot(e.x - pl.x, e.y - pl.y) || 1; if (d < R + e.d.r) hurt(e, dm, (e.x - pl.x) / d * 140, (e.y - pl.y) / d * 140); });
    if (w.markRing) { var mel = atkElem(pl); if (mel) near(pl.x, pl.y, R * 1.6 + 12, function (e) { if (!e.d.prop && Math.hypot(e.x - pl.x, e.y - pl.y) < R * 1.6 + e.d.r) applyMark(e, mel); }); }
    SND.crack(); p = pp;
  }
  // appelé quand le joueur prend un coup : renvoie true si le coup est annulé
  function riposteOnHit(pl) {
    if (!pl.ripo) return false;
    var cancel = false;
    Object.keys(pl.ripo).forEach(function (k) { var st = pl.ripo[k]; if (!st.w || st.cd > 0) return; st.cd = V(st.w, "cd", st.l) * (pl.cdMul || 1); riposteBlast(pl, st.w, st.l); if (st.w.parry) cancel = true; });
    return cancel;
  }
  BEHAVIOR.grapple = function (id, w, l, dt) {
    if (!timer(id, V(w, "cd", l), dt)) return;
    var sk = p.sigK || {}, range = V(w, "range", l), all = nearest(12, range), list = all.filter(function (e) { return !e.d.boss && !hasA(e, "lourd"); });
    if (sk.bigFish) all.forEach(function (e) { if ((e.d.boss || e.aff) && !(e.fateT > 0)) { e.fateT = 3; e.fateBy = p; e.fateD = Math.max(3, V(w, "dmg", l) * 0.35); fx.push({ kind: "beam", x: p.x, y: p.y, a: Math.atan2(e.y - p.y, e.x - p.x), len: Math.hypot(e.x - p.x, e.y - p.y), w: 1, life: 0.3, max: 0.3, col: "200,230,255" }); } });
    var reel = sk.reel && p.anchored;
    list.sort(function (a, b) { return Math.hypot(b.x - p.x, b.y - p.y) - Math.hypot(a.x - p.x, a.y - p.y); });
    var grabbed = list.slice(0, V(w, "n", l));
    grabbed.forEach(function (e) {
      var dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
      fx.push({ kind: "beam", x: p.x, y: p.y, a: Math.atan2(-dy, -dx), len: d, w: 1, life: 0.25, max: 0.25, col: "200,190,170" });
      if (!w.dash) { var pk = reel ? 1 : 0.85; e.x += dx / d * Math.max(0, d - 18) * pk; e.y += dy / d * Math.max(0, d - 18) * pk; }
      hurt(e, V(w, "dmg", l) * (reel ? 2 : 1), 0, 0);
      if (sk.catch && !e.d.prop) drop("xp", e.x, e.y, Math.max(1, e.d.xp || 1));
      if (w.boom && !e.dead) explode(e.x, e.y, w.boom, V(w, "dmg", l) * 0.8, 0);
      if (w.grabReact && HIT_ELEM && !e.dead) { if (e.mark && e.markT > 0 && e.mark !== HIT_ELEM) react(e, e.mark, HIT_ELEM, true); else react(e, HIT_ELEM, nextElem(HIT_ELEM), true); }
    });
    if (w.dash && grabbed.length) {
      var g = grabbed[0], gx = g.x - p.x, gy = g.y - p.y, gd = Math.hypot(gx, gy) || 1, st = Math.max(0, Math.min(60, gd - 12));
      if (!isDungeon()) { p.x += gx / gd * st; p.y += gy / gd * st; pushOutGiants(p, 5); }
      p.inv = Math.max(p.inv || 0, 0.3); fx.push({ kind: "ring", x: p.x, y: p.y, r: 26, life: 0.25, max: 0.25, col: "253,243,222" });
      explode(g.x, g.y, 28 * p.area, V(w, "dmg", l) * 1.2, 0);
    }
    SND.whip();
  };
  BEHAVIOR.echo = function (id, w, l, dt) {
    if (!timer(id, V(w, "cd", l), dt)) return;
    var b = armeOf(p).base, bd = techDef(p, b); if (!bd || !BEHAVIOR[bd.type]) return;
    var sides = w.twins ? [-1, 1] : [-(p.face || 1)], ox = p.x, oy = p.y, k = V(w, "mul", l);
    var hk = HIT_ELEM, n0 = projs.length, l0 = lobs.length; if (w.inverse && HIT_ELEM) HIT_ELEM = nextElem(HIT_ELEM);
    sides.forEach(function (sd) {
      p.x = ox + sd * 18; p.y = oy - 4;
      fx.push({ kind: "ghost", x: p.x, y: p.y, life: 0.35, max: 0.35, spr: p.sprite, face: p.face });
      var tk = "__echo" + sd; p.timers[tk] = 0; BEHAVIOR[bd.type](tk, scaleDmg(bd, k), (p.weapons[b] || 1) - 1, 0);
    });
    if (w.pack) { var al = partnerOf(p); if (al && al.arme) { var ab = techDef(al, armeOf(al).base); if (ab && BEHAVIOR[ab.type]) { p.x = al.x; p.y = al.y - 4; fx.push({ kind: "ghost", x: p.x, y: p.y, life: 0.35, max: 0.35, spr: al.sprite, face: al.face }); p.timers.__echoP = 0; BEHAVIOR[ab.type]("__echoP", scaleDmg(ab, k), 0, 0); } } }
    p.x = ox; p.y = oy;
    if (w.inverse) { for (var ii = n0; ii < projs.length; ii++) projs[ii].elem = HIT_ELEM; for (var jj = l0; jj < lobs.length; jj++) lobs[jj].elem = HIT_ELEM; }
    HIT_ELEM = hk;
  };
  BEHAVIOR.combo = function () {};
  // Marteau : un coup lent au sol devant toi, avec une petite onde de choc
  BEHAVIOR.hammer = function (id, w, l, dt) {
    if (!timer(id, V(w, "cd", l), dt)) return;
    var ag = aimAngle(50), rc = w.reach || 18, hx = p.x + Math.cos(ag) * rc, hy = p.y + Math.sin(ag) * rc * 0.8, R = V(w, "R", l) * p.area, dmg = V(w, "dmg", l);
    fx.push({ kind: "ring", x: hx, y: hy, r: R, life: 0.3, max: 0.3, col: "200,160,96" }); burst(hx, hy, "#8a8278", 5);
    near(hx, hy, R + 12, function (e) { var dx = e.x - hx, dy = e.y - hy, d = Math.hypot(dx, dy) || 1; if (d < R + e.d.r) hurt(e, dmg * (d < R * 0.5 ? 1 : 0.6), dx / d * 160, dy / d * 160); });
    if (S.opts.shake) shake = Math.max(shake, 0.05); SND.crack();
  };
  // Bâton de pluie : une petite pluie tombe autour de toi
  BEHAVIOR.drizzle = function (id, w, l, dt) {
    if (!timer(id, V(w, "cd", l), dt)) return;
    var n = V(w, "n", l) + p.amount, R = (w.R || 60) * p.area;
    for (var k = 0; k < n; k++) { var a = Math.random() * TAU, d = Math.sqrt(Math.random()) * R, tx = p.x + Math.cos(a) * d, ty = p.y + Math.sin(a) * d * 0.8;
      lobs.push({ owner: p, sx: tx, sy: ty, tx: tx, ty: ty, t: 0, dur: 0.35 + k * 0.07, dmg: V(w, "dmg", l), rad: V(w, "rad", l) * p.area, frag: 0, sprite: "raindrop", sky: true, drizzle: 1 }); }
  };
  // Carillon : une onde sonore qui s'étend
  BEHAVIOR.sonic = function (id, w, l, dt) {
    p.sonic = p.sonic || []; var sk = p.sigK || {};
    if (timer(id, V(w, "cd", l) * (sk.sustain && p.anchored ? 0.4 : 1), dt)) { p.sonicN = (p.sonicN || 0) + 1; p.sonic.push({ r: 4, max: V(w, "R", l) * p.area, dmg: V(w, "dmg", l), hit: {}, gamme: sk.gamme && p.sonicN % 7 === 0, el: HIT_ELEM }); }
    if (!dt) return;
    var kh = HIT_ELEM;
    for (var i = p.sonic.length - 1; i >= 0; i--) {
      var s = p.sonic[i]; s.r += (w.spd || 140) * dt; HIT_ELEM = s.el;
      fx.push({ kind: "ring", x: p.x, y: p.y, r: s.r, life: 0.04, max: 0.04, col: s.gamme ? "246,211,107" : "200,248,232" });
      near(p.x, p.y, s.r + 12, function (e) {
        if (s.hit[e.id]) return; var d = Math.hypot(e.x - p.x, e.y - p.y); if (d > s.r + e.d.r || d < s.r - 12 - e.d.r) return;
        s.hit[e.id] = 1; var m = sk.resonance && e.sonT && r.time - e.sonT < 1 ? 2 : 1; e.sonT = r.time;
        hurt(e, s.dmg * m, (e.x - p.x) / (d || 1) * (s.gamme ? 240 : 40), (e.y - p.y) / (d || 1) * (s.gamme ? 240 : 40));
        if (s.gamme && !e.d.boss) { e.stunT = 0.8; e.slowT = 0.8; e.slow = 1; }
      });
      if (s.r >= s.max) p.sonic.splice(i, 1);
    }
    HIT_ELEM = kh;
  };
  // Grelot : des musaraignes surgissent sous les ennemis
  BEHAVIOR.burrow = function (id, w, l, dt) {
    if (!timer(id, V(w, "cd", l), dt)) return;
    var sk = p.sigK || {}, n = V(w, "n", l) + p.amount + (sk.colony ? Math.floor((r.level || 1) / 5) : 0), R = (w.rad || 14) * p.area;
    nearest(n, 150).forEach(function (e) {
      fx.push({ kind: "ghost", x: e.x, y: e.y + 2, life: 0.45, max: 0.45, spr: w.pop || "shrew", face: Math.random() < 0.5 ? 1 : -1 }); burst(e.x, e.y + 4, "#8a6a3a", 5);
      near(e.x, e.y, R + 10, function (o) { if (Math.hypot(o.x - e.x, o.y - e.y) < R + o.d.r) { hurt(o, V(w, "dmg", l), 0, -40); if (sk.galleries && !o.d.boss) { o.stunT = 0.6; o.slowT = 0.6; o.slow = 1; } } });
    });
    SND.crack();
  };
  /* ---------- 2.0 phase 3 : éléments, réactions, rôles, escouades, méga boss ---------- */
  var ELEM_K = ["terre", "feu", "eau", "air"];
  function atkElem(pl) { if (HIT_ELEM !== undefined) return HIT_ELEM; return pl && pl.arme ? armElem(pl) : null; }
  function armElem(pl) { var el = armeOf(pl).element; for (var i = 0; i < (pl.cycleN || 0); i++) el = nextElem(el); return el; }
  function giveElement(e) {
    if (e.d.prop || isArena()) return;
    if (e.d.elem) { e.elem = e.d.elem; return; }
    if (!MAP.element) return;
    e.elem = Math.random() < 0.2 ? ELEM_K[(Math.random() * 4) | 0] : MAP.element;
  }
  // résistance à son propre élément (jamais d'immunité : 75 % max), faiblesse à l'élément qui le bat
  function elemMul(e, el) {
    if (!el || !e.elem) return 1;
    if (el === e.elem) return e.d.boss || e.d.elite ? 0.4 : 0.6;
    if (D.ELEMENTS[e.elem].weak === el) return 1.4;
    return 1;
  }
  function elemHit(e, dmg) {
    var el = atkElem(p); dmg *= elemMul(e, el);
    if (e.stunT > 0 && ept(p, "terre", 6)) dmg *= 1.3;
    if (e.d.prop || e.dead) return dmg;
    elemTierHit(e);
    var marks = [], hfx = HIT_FX;
    if (hfx && hfx.ext && e.mark && e.markT > 0) e.markT += hfx.ext;
    if (el) marks.push(el);
    if (hfx && hfx.mark && hfx.mark !== el) marks.push(hfx.mark);
    if (p.items) D.ITEMS.forEach(function (it) { if (it.elem && itn(p, it.id) && Math.random() < 0.2 * itn(p, it.id)) marks.push(it.elem); });
    if (itn(p, "coeur_humus")) marks.push("terre");
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i];
      if (e.mark && e.mark !== m && e.markT > 0) { react(e, e.mark, m, (hfx && hfx.force) || (p.surge > 0 && setCount(p, "sevevive") >= 2)); e.mark = null; e.markT = 0; }
      else if (!e.mark || e.markT <= 0 || e.mark === m) { if (m !== el || !e.mark) { e.mark = m; e.markT = m === "eau" && p.gear && gearHas(p, "larme") ? 6 : 3; } }
    }
    return dmg;
  }
  function react(e, a, b, force) {
    var key = [a, b].sort().join("+"), rc = D.REACTIONS[key]; if (!rc) return;
    if (!force && (e.reactT || 0) > r.time) return;       // une réaction par ennemi toutes les 1,5 s
    e.reactT = r.time + 1.5;
    r.reactions = (r.reactions || 0) + 1; r.reactK = r.reactK || {}; r.reactK[key] = (r.reactK[key] || 0) + 1;
    if (key === "air+eau") r.freezes = (r.freezes || 0) + 1;
    if (p.sigK && p.sigK.rainbow && Math.hypot(e.x - p.x, e.y - p.y) < 80 && !e.d.prop) drop("xp", e.x, e.y, 3);
    if (r.time - (r.reactTxt || 0) > 0.25) { r.reactTxt = r.time; texts.push({ x: e.x, y: e.y - 14, n: rc.name.toUpperCase() + " !", life: 0.9, col: rc.color }); }
    var pw = (1 + 0.04 * (r.level || 1)) * ((HIT_FX && HIT_FX.react) || 1);
    if (p.gear) { var po = gv(p, "pendOrage"); if (po && key.indexOf("air") >= 0) pw *= 1 + po / 100; if (gearHas(p, "u_cycle")) pw *= 1.2;
      if (setCount(p, "brasier") >= 3 && (key === "eau+feu" || key === "feu+terre")) pw *= 1.5;
      if (setCount(p, "tempete") >= 3 && (key === "air+feu" || key === "air+terre")) pw *= 1.5;
      if (setCount(p, "mere") >= 3 && (key === "air+eau" || key === "eau+terre") && !procLock) { var o3 = chainNext(e, [e.id]); if (o3) { procLock = true; o3.reactT = 0; react(o3, a, b, true); procLock = false; } } }
    var it = function (id) { return itn(p, id); };
    if (key === "air+eau") { e.slowT = (1.6 + 0.6 * it("givre_persistant")) * (it("oeil_brochet") ? 2 : 1); e.stunT = Math.max(e.stunT || 0, e.d.boss ? 0 : e.slowT); e.slow = 1; hurt2(e, 10 * pw); burst(e.x, e.y, rc.color, 10); if (e.d.boss) r.bossFrozen = 1; if (it("statue_glace")) { r.statues = (r.statues || []).filter(function (q) { return q.t > r.time; }); r.statues.push({ x: e.x, y: e.y, t: r.time + 2 }); } }
    else if (key === "air+feu") { var er = 30 * (1 + 0.3 * it("soufflet")); explode(e.x, e.y, er, 25 * pw, 0); addZone(e.x, e.y, 18, 2, "thorn", 0); if (it("feu_foret") && Math.random() < 0.3 && !procLock) { var o2 = chainNext(e, [e.id]); if (o2) { procLock = true; explode(o2.x, o2.y, er, 25 * pw, 0); procLock = false; } } }
    else if (key === "eau+terre") { var md = 3 + 2 * it("glaise"); near(e.x, e.y, 46, function (o) { o.slowT = md; o.slow = 0.6; o.mudT = r.time + md; }); ring(e.x, e.y, 40, false); hurt2(e, 8 * pw); pZone({ x: e.x, y: e.y, r: 34, dur: md, kind: "mud" }); }
    else if (key === "eau+feu") { zones.push({ x: e.x, y: e.y, r: 30, t: 0, dur: 2.6 + 2 * it("bouilloire"), kind: "thorn", dmg: 5 * pw, owner: p, steam: true }); ring(e.x, e.y, 30, false); }
    else if (key === "feu+terre") { hurt2(e, 38 * pw); burst(e.x, e.y, rc.color, 16); if (S.opts.shake) shake = Math.max(shake, 0.1); if (it("obsidienne")) pZone({ x: e.x, y: e.y, r: 16, dur: 3, kind: "fire", owner: p, pdmg: 4 * pw, elem: "feu" }); if (it("eruption")) { r.magmaN = (r.magmaN || 0) + 1; if (r.magmaN % 10 === 0) { bannerAll("Éruption !"); if (S.opts.shake) shake = 0.4; onScreen().forEach(function (o) { hurt2(o, 80 * it("eruption") * gpw()); }); } } }
    else if (key === "air+terre") { var pu = 180 * (1 + 0.4 * it("dune")), mi = it("mirage"); near(e.x, e.y, 54, function (o) { var d = Math.hypot(o.x - e.x, o.y - e.y) || 1; if (!o.d.prop) { o.kx += (o.x - e.x) / d * pu; o.ky += (o.y - e.y) / d * pu; hurt2(o, 12 * pw); if (mi) o.missT = r.time + 2; } }); ring(e.x, e.y, 50, false); }
    SND.zap();
  }
  // dégâts de réaction : sans relancer les éléments (pas de chaîne infinie)
  function hurt2(e, dmg) { if (e.dead) return; var keep = p.arme, kh = HIT_ELEM, ke = p.epts, kf = HIT_FX; p.arme = null; HIT_ELEM = null; p.epts = null; HIT_FX = null; hurt(e, dmg, 0, 0); p.arme = keep; HIT_ELEM = kh; p.epts = ke; HIT_FX = kf; }
  // contenu étendu : l'élément suivant dans le cycle (Eau > Feu > Air > Terre > Eau)
  var ELEM_CYCLE = ["eau", "feu", "air", "terre"];
  function nextElem(el) { var i = ELEM_CYCLE.indexOf(el); return i < 0 ? "eau" : ELEM_CYCLE[(i + 1) % 4]; }
  // pose une marque (ou déclenche la réaction si une autre marque est là)
  function applyMark(e, m, force) {
    if (!m || e.d.prop || e.dead) return;
    if (e.mark && e.mark !== m && e.markT > 0) { react(e, e.mark, m, force); e.mark = null; e.markT = 0; }
    else { e.mark = m; e.markT = Math.max(e.markT || 0, 3); }
  }
  function pZone(z) { if (zones.length < 120) { z.t = 0; zones.push(z); } }
  function markZone(x, y, rad, dur, el) { if (el) pZone({ x: x, y: y, r: rad, dur: dur, kind: "mark", elem: el, owner: p }); }
  // règles spéciales d'un coup (évolutions élémentaires, fusions de techniques)
  function hitFx(e, hf, dmg, hadMark) {
    if (hf.pull && !e.d.boss && !e.dead && !hasA(e, "lourd")) { var dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1; if (d > 18) { var k = Math.min(hf.pull, d - 16); e.x += dx / d * k; e.y += dy / d * k; } }
    if (hf.stun && !e.d.boss) { e.stunT = Math.max(e.stunT || 0, hf.stun); e.slowT = Math.max(e.slowT || 0, hf.stun); e.slow = 1; }
    if (hf.markR) { var el = atkElem(p); if (el) near(e.x, e.y, hf.markR + 10, function (o) { if (o !== e && !o.d.prop && Math.hypot(o.x - e.x, o.y - e.y) < hf.markR + o.d.r) applyMark(o, el); }); }
    if (hf.fate && !e.dead) { e.fateT = 6; e.fateBy = p; e.fateD = Math.max(4, dmg * 0.4); }
    if (hf.ignite && !e.dead && Math.random() < hf.ignite) { if (!(e.burnT > 0)) r.burns = (r.burns || 0) + 1; e.burnT = 3; e.burnD = Math.max(e.burnD || 0, 3 * gpw()); e.burnBy = p; }
    if (hf.slow && !e.d.boss) { e.slowT = Math.max(e.slowT || 0, 1.2); e.slow = Math.max(e.slow || 0, hf.slow); }
    if (procLock) return;
    var kf = HIT_FX;
    if (hf.sat) { e.satN = (e.satN || 0) + 1; if (e.satN >= hf.sat) { e.satN = 0; procLock = true; HIT_FX = null; explode(e.x, e.y, 26 * p.area, dmg * 2.5, 0); HIT_FX = kf; procLock = false; } }
    if (hf.killBoom && e.hp <= 0 && hadMark) {
      procLock = true; HIT_FX = null; explode(e.x, e.y, 34 * p.area, Math.max(14, dmg), 0); HIT_FX = kf; procLock = false;
      if (r.time - (r.reactTxt || 0) > 0.25) { r.reactTxt = r.time; texts.push({ x: e.x, y: e.y - 14, n: "LAME CHARGÉE !", life: 0.8, col: D.ELEMENTS[hadMark].color }); }
    }
  }
  function bulletFx(q, en) {
    var hf = q.hfx;
    if (hf.flame) pZone({ x: q.x, y: q.y + 2, r: 8, dur: 1.6, kind: "fire", owner: p, pdmg: Math.max(2, q.dmg * 0.15), elem: "feu" });
    if (hf.bounce && !procLock) { var nx = chainNext(en, [en.id]); if (nx) { procLock = true; zapChain(nx, hf.bounce, q.dmg * 0.5, en); procLock = false; } }
  }
  function lobLand(l) {
    var c = l.cfg, el = l.elem;
    if (l.drizzle && p.sigK && p.sigK.puddles && Math.random() < 0.35) markZone(l.tx, l.ty, 12, 3, "eau");
    if (c && c.crater && el && !l.small) markZone(l.tx, l.ty, l.rad * 0.9, c.crater, el);
    if (c && c.mine && !l.small) pZone({ x: l.tx, y: l.ty, r: l.rad * 0.7, dur: 4, kind: "thorn", dmg: l.dmg * 0.25, owner: p, elem: el });
    if (l.hfx && l.hfx.bounce && !l.small) { var t = nearest(1, 70, { x: l.tx, y: l.ty })[0]; if (t) zapChain(t, l.hfx.bounce, l.dmg * 0.5, { x: l.tx, y: l.ty }); }
  }
  function fateTick(e, dt) {
    e.fateT -= dt; e.fateAcc = (e.fateAcc || 0) + dt; if (e.fateAcc < 0.4) return; e.fateAcc = 0;
    var pp = p; p = e.fateBy || me; fx.push({ kind: "ring", x: e.x, y: e.y, r: 10, life: 0.15, max: 0.15, col: "253,243,222" }); hurt2(e, e.fateD); p = pp;
  }
  /* ---- les rôles ---- */
  function roleAI(e, ai, d, dx, dy, dt) {
    var tg = targetOf(e), ang = Math.atan2(dy, dx);
    if (AI5[ai]) return AI5[ai](e, d, dx, dy, dt, tg, ang);
    if (ai === "charger") {
      if (e.dash > 0) { e.dash -= dt; e.x += e.cx * 175 * dt; e.y += e.cy * 175 * dt; if (e.dash <= 0) { if (!e.hitDash && tg && !tg.decoy && itn(tg, "muleta") && Math.hypot(tg.x - e.x, tg.y - e.y) < 70) { e.stunT = 2; e.slowT = 2; e.slow = 1; e.mulT = r.time + 2; texts.push({ x: e.x, y: e.y - 14, n: "OLÉ !", life: 0.7 }); } e.hitDash = 0; } return 0; }
      if (e.windup > 0) { e.windup -= dt; e.flash = Math.sin(e.windup * 40) > 0 ? 0.05 : 0; if (e.windup <= 0) { e.dash = 0.5; } return 0; }
      e.cd = (e.cd === undefined ? 2 : e.cd) - dt;
      if (e.cd <= 0 && d < 130) { e.windup = 0.6; e.cd = 3; e.cx = dx / d; e.cy = dy / d; fx.push({ kind: "beam", x: e.x, y: e.y, a: ang, len: 90, w: 2, life: 0.6, max: 0.6, col: "255,90,60" }); return 0; }
      return 1;
    }
    if (ai === "artillery") {
      e.cd = (e.cd === undefined ? 2 + Math.random() * 2 : e.cd) - dt;
      if (e.cd <= 0 && d < 170) { e.cd = 3.6; warn(tg.x, tg.y, 20, 1.1, e.d.dmg + 4, e); }
      if (d < 80) return -0.7; if (d < 120) return 0.2; return 1;
    }
    if (ai === "predict") {
      e.cd = (e.cd === undefined ? 1.5 + Math.random() * 2 : e.cd) - dt;
      if (e.cd <= 0 && d < 160) {
        var fm = itn(tg, "feuilles_mortes");
        e.cd = 2.6; var vx = tg.dir && tg.moving && !fm ? tg.dir.x * (tg.speed || 60) : 0, vy = tg.dir && tg.moving && !fm ? tg.dir.y * (tg.speed || 60) : 0, t = d / 95;
        hostileShot(e.x, e.y, Math.atan2(tg.y + vy * t - e.y, tg.x + vx * t - e.x), 95, e.d.dmg); SND.whip();
      }
      if (d < 70) return -0.6; if (d < 110) return 0.3; return 1;
    }
    if (ai === "healer") {
      e.cd = (e.cd === undefined ? 2 : e.cd) - dt;
      if (e.cd <= 0) { e.cd = 3; var any = false; near(e.x, e.y, 60, function (o) { if (o !== e && !o.d.prop && o.hp < o.maxHp) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.15); any = true; } }); if (any) fx.push({ kind: "ring", x: e.x, y: e.y, r: 50, life: 0.4, max: 0.4, col: "110,230,120" }); }
      if (d < 90) return -0.6; return 0.8;
    }
    if (ai === "ambush") {
      if (e.burrowT > 0) { e.burrowT -= dt; if (e.burrowT <= 0) { e.x = e.ax; e.y = e.ay; e.under = false; burst(e.x, e.y, "#8a5a3b", 10); if (players.some(function (pl) { return itn(pl, "antenne") && Math.hypot(pl.x - e.x, pl.y - e.y) < 30; })) { e.stunT = 1.5; e.slowT = 1.5; e.slow = 1; texts.push({ x: e.x, y: e.y - 14, n: "REPÉRÉ !", life: 0.7 }); } } return 0; }
      e.cd = (e.cd === undefined ? 3 : e.cd) - dt;
      if (e.cd <= 0 && tg.anchorT > 1.2 && d < 220) { e.cd = 5; e.burrowT = 0.7; e.ax = tg.x; e.ay = tg.y; e.under = true; warn(tg.x, tg.y, 16, 0.7, e.d.dmg + 6); return 0; }
      return 1;
    }
    return null;
  }
  // contenu étendu : comportements des 18 nouvelles espèces (valeur rendue = vitesse vers la cible, négative = fuite)
  function nearPl(e, rad) { for (var i = 0; i < players.length; i++) { var pl = players[i]; if (!pl.down && Math.hypot(pl.x - e.x, pl.y - e.y) < rad) return pl; } return null; }
  var AI5 = {
    column: function () { return 1; },
    sting: function (e) { if (e.hitDash) { e.hitDash = 0; e.fleeT = r.time + 0.8; } return e.fleeT > r.time ? -1.3 : 1.1; },
    arcCharger: function (e, d, dx, dy, dt) {
      if (e.dash > 0) { e.dash -= dt; var a = Math.atan2(e.cy, e.cx) + e.arc * dt; e.cx = Math.cos(a); e.cy = Math.sin(a); e.x += e.cx * 160 * dt; e.y += e.cy * 160 * dt; return 0; }
      if (e.windup > 0) { e.windup -= dt; e.flash = Math.sin(e.windup * 40) > 0 ? 0.05 : 0; if (e.windup <= 0) e.dash = 0.8; return 0; }
      e.cd = (e.cd === undefined ? 2 : e.cd) - dt;
      if (e.cd <= 0 && d < 120) { e.windup = 0.7; e.cd = 3.4; e.arc = (Math.random() < 0.5 ? -1 : 1) * 2.2; var a0 = Math.atan2(dy, dx) - e.arc * 0.4; e.cx = Math.cos(a0); e.cy = Math.sin(a0); fx.push({ kind: "ring", x: e.x, y: e.y, r: 14, life: 0.7, max: 0.7, red: true }); return 0; }
      return 1;
    },
    packCharger: function (e, d, dx, dy, dt) {
      if (e.dash > 0) { e.dash -= dt; e.x += e.cx * 170 * dt; e.y += e.cy * 170 * dt; return 0; }
      if (e.windup > 0) { e.windup -= dt; e.flash = Math.sin(e.windup * 40) > 0 ? 0.05 : 0; if (e.windup <= 0) e.dash = 0.5; return 0; }
      e.cd = (e.cd === undefined ? 2 + Math.random() : e.cd) - dt;
      if (e.cd <= 0 && d < 130) { var cx = dx / d, cy = dy / d; near(e.x, e.y, 70, function (o) { if (o.type === "boarlet" && !(o.windup > 0) && !(o.dash > 0)) { o.windup = 0.6; o.cd = 3.5; o.cx = cx; o.cy = cy; fx.push({ kind: "beam", x: o.x, y: o.y, a: Math.atan2(cy, cx), len: 80, w: 2, life: 0.6, max: 0.6, col: "255,90,60" }); } }); return 0; }
      return 1;
    },
    pecker: function (e, d, dx, dy, dt, tg, ang) {
      e.cd = (e.cd === undefined ? 2 : e.cd) - dt;
      if (e.burstN > 0) { e.burstT -= dt; if (e.burstT <= 0) { e.burstN--; e.burstT = 0.15; hostileShot(e.x, e.y - 2, ang, 95, e.d.dmg); } return 0; }
      if (e.cd <= 0 && d < 140) { e.cd = 3; e.burstN = 3; e.burstT = 0.2; return 0; }
      return d < 110 ? 0 : 1;
    },
    flamer: function (e, d, dx, dy, dt, tg, ang) {
      e.cd = (e.cd === undefined ? 1.5 : e.cd) - dt;
      if (e.cd <= 0 && d < 60) { e.cd = 2.4; for (var k = 0; k < 5; k++) hostile.push({ x: e.x, y: e.y, vx: Math.cos(ang + (k - 2) * 0.22) * 90, vy: Math.sin(ang + (k - 2) * 0.22) * 90, life: 0.55, dmg: e.d.dmg }); SND.whip(); }
      return d < 40 ? 0 : 1;
    },
    egger: function (e, d, dx, dy, dt, tg) {
      e.cd = (e.cd === undefined ? 1.5 : e.cd) - dt;
      if (e.cd <= 0 && d < 90) { e.cd = 1.3; warn(e.x, e.y + 4, 16, 1, e.d.dmg + 3, e); }
      if (d < 50) { e.orb = (e.orb || 0) + dt; return 0.5; } return 1;
    },
    logger: function (e, d, dx, dy, dt, tg, ang) {
      e.cd = (e.cd === undefined ? 3 : e.cd) - dt;
      if (e.cd <= 0 && d < 170) { e.cd = 4.5; hostile.push({ x: e.x, y: e.y, vx: Math.cos(ang) * 55, vy: Math.sin(ang) * 55, life: Math.min(3, d / 55 + 0.6), dmg: e.d.dmg, log: 1 }); SND.crack(); }
      if (d < 90) return -0.5; return d < 140 ? 0 : 1;
    },
    thief: function (e, d, dx, dy, dt, tg) {
      for (var i = 0; i < gems.length; i++) { var g = gems[i]; if (g.kind === "xp" && Math.abs(g.x - e.x) < 10 && Math.abs(g.y - e.y) < 10) { gems.splice(i, 1); e.stole = (e.stole || 0) + g.v; break; } }
      return AI5.predictShot(e, d, dt, tg);
    },
    ghostowl: function (e, d, dx, dy, dt, tg) { var o = AI5.predictShot(e, d, dt, tg); return o; },
    predictShot: function (e, d, dt, tg) {
      e.cd = (e.cd === undefined ? 1.5 + Math.random() * 2 : e.cd) - dt;
      if (e.cd <= 0 && d < 160 && !tg.decoy) { e.cd = 2.6; e.seenT = r.time + 1; var fm = itn(tg, "feuilles_mortes"), vx = tg.dir && tg.moving && !fm ? tg.dir.x * (tg.speed || 60) : 0, vy = tg.dir && tg.moving && !fm ? tg.dir.y * (tg.speed || 60) : 0, t = d / 95; hostileShot(e.x, e.y, Math.atan2(tg.y + vy * t - e.y, tg.x + vx * t - e.x), 95, e.d.dmg); SND.whip(); }
      if (d < 70) return -0.6; if (d < 110) return 0.3; return 1;
    },
    ball: function (e, d, dx, dy, dt) {
      if (e.ballT > r.time) return 0;
      e.cd = (e.cd === undefined ? 2 : e.cd) - dt;
      if (e.cd <= 0 && d < 90) { e.cd = 4.5; e.ballT = r.time + 2; SND.crack(); return 0; }
      return 1;
    },
    crayfish: function () { return 1; },
    shielder: function (e, d, dx, dy, dt) {
      e.cd = (e.cd === undefined ? 1.5 : e.cd) - dt;
      if (e.cd <= 0) { e.cd = 4; var any = false; near(e.x, e.y, 60, function (o) { if (o !== e && !o.d.prop && !o.d.boss && !(o.eshield > 0)) { o.eshield = 20; any = true; } }); if (any) fx.push({ kind: "ring", x: e.x, y: e.y, r: 50, life: 0.4, max: 0.4, col: "232,58,42" }); }
      return d < 90 ? -0.6 : 0.8;
    },
    singer: function (e, d, dx, dy, dt) {
      e.cd = (e.cd === undefined ? 1 : e.cd) - dt;
      if (e.cd <= 0) { e.cd = 3; near(e.x, e.y, 70, function (o) { if (o !== e && !o.d.prop) o.hasteT = r.time + 3; }); fx.push({ kind: "ring", x: e.x, y: e.y, r: 60, life: 0.4, max: 0.4, col: "156,197,107" }); }
      return d < 90 ? -0.6 : 0.8;
    },
    antlion: function (e, d, dx, dy, dt) {
      players.forEach(function (pl) { if (pl.down || pl.anchored && itn(pl, "ancre_pierre")) return; var ex = e.x - pl.x, ey = e.y - pl.y, dd = Math.hypot(ex, ey); if (dd < 70 && dd > 4) { pl.x += ex / dd * 22 * dt; pl.y += ey / dd * 22 * dt; } });
      return 0;
    },
    procession: function (e, d, dx, dy, dt) { if (cooled(e, "urt", 0.45)) addZone(e.x, e.y + 2, 8, 2.5, "spore", 3); return 1; },
    dungball: function (e, d, dx, dy, dt) {
      e.trav = (e.trav || 0) + e.spd * dt; e.scale = 1 + Math.min(1, e.trav / 300);
      if (d < 16 + 6 * e.scale) { e.dead = true; e.exploded = true; warn(e.x, e.y, 18 + 14 * e.scale, 0.15, e.d.dmg * e.scale, e); burst(e.x, e.y, "#8a6a3a", 10); SND.boom(); return 0; }
      return 1;
    },
    horsefly: function (e, d, dx, dy, dt) {
      if (e.dash > 0) { e.dash -= dt; e.x += e.cx * 230 * dt; e.y += e.cy * 230 * dt; if (d < 14) { e.dead = true; e.exploded = true; warn(e.x, e.y, 18, 0.12, e.d.dmg, e); burst(e.x, e.y, "#c8a040", 8); } return 0; }
      if (e.windup > 0) { e.windup -= dt; if (cooled(e, "buzz", 0.3)) texts.push({ x: e.x, y: e.y - 10, n: "BZZ", life: 0.3, col: "#c8a040" }); if (e.windup <= 0) { e.dash = 1.2; e.cx = dx / d; e.cy = dy / d; } return 0; }
      e.cd = (e.cd === undefined ? 0.5 : e.cd) - dt;
      if (e.cd <= 0 && d < 220) { e.cd = 5; e.windup = 0.8; fx.push({ kind: "beam", x: e.x, y: e.y, a: Math.atan2(dy, dx), len: Math.min(d, 220), w: 1, life: 0.8, max: 0.8, col: "200,160,64" }); return 0; }
      return 0.8;
    },
  };
  // Bouclier : les tirs de face sont bloqués (zones, pluie et boomerangs passent)
  function shieldBlock(e, vx, vy) { if (e.type === "crayfish" && vx * (e.face || 1) > 0) return 2; return e.d.role === "bouclier" && !e.d.boss && (vx * (e.face || 1) < 0) ? (CUR_FAM === "tir" && itn(p, "pince") ? 0.5 : 0.2) : 1; }
  /* ---- directeur à budget : escouades ---- */
  function speciesFor(role, x, y) {
    var b = biomeAt(x, y), list = b.enemies.map(function (q) { return q[0]; }).filter(function (k) { return D.ENEMIES[k] && D.ENEMIES[k].role === role; });
    if (!list.length) MAP.biomes.forEach(function (bb) { bb.enemies.forEach(function (q) { if (D.ENEMIES[q[0]] && D.ENEMIES[q[0]].role === role) list.push(q[0]); }); });
    return list.length ? list[(Math.random() * list.length) | 0] : null;
  }
  function squadCost(sq) { var c = 0; Object.keys(sq).forEach(function (ro) { var rr = D.ROLES[ro] || (D.ENEMIES[ro] && D.ROLES[D.ENEMIES[ro].role]); c += (rr ? rr.cost : 1) * sq[ro]; }); return c; }
  function spawnSquad(sq, around, dist) {
    if (me && me.ring && me.ring.horde) { var sq2 = {}; Object.keys(sq).forEach(function (k) { sq2[k] = Math.ceil(sq[k] * (me.ring2x ? 2 : 1.5)); }); sq = sq2; }
    around = around || randomAlive();
    var a = Math.random() * TAU, R = dist || Math.hypot(W, H) / 2 + 12, cx = around.x + Math.cos(a) * R, cy = around.y + Math.sin(a) * R, out = [];
    var prevOf = {};
    Object.keys(sq).forEach(function (ro) {
      for (var i = 0; i < sq[ro]; i++) {
        if (enemies.length >= 290) return;
        var t = D.ROLES[ro] ? speciesFor(ro, cx, cy) || speciesFor("nuee", cx, cy) || "slug" : D.ENEMIES[ro] ? ro : "slug";
        var e = spawnAt(t, cx + (Math.random() - 0.5) * 40, cy + (Math.random() - 0.5) * 30);
        if (e && (e.d.ai === "column" || e.d.ai === "procession")) { if (prevOf[t]) e.follow = prevOf[t]; prevOf[t] = e; }
        if (e && r.time > 90 && Math.random() < (Math.min(0.035, 0.004 + r.time / 18000) + TIER.elite * tierN()) * (me.ring && me.ring.chasse ? 2 : 1) * (nm(1) ? 2 : 1)) giveAffixes(e, r.time > 480 || tierN() >= 5 ? 2 : 1);
        if (e) out.push(e);
      }
    });
    // le Meneur : un élite qui renforce son escouade
    if (out.length >= 6 && Math.random() < Math.min(0.5, 0.08 + tierN() * 0.04)) { var m = out[(Math.random() * out.length) | 0]; giveAffixes(m, 0); m.aff = m.aff || []; if (m.aff.indexOf("meneur") < 0) { m.aff.push("meneur"); m.d = Object.assign({}, m.d, { elite: true }); m.hp *= 2.2; m.maxHp = m.hp; } }
    return out;
  }
  function squadDirector(dt, rate) {
    r.credit = (r.credit || 0) + rate * dt;
    if (!r.nextSquad) {
      var cap = 6 + tierN() * 4 + stageTime() / 30, mine = (D.SQUADS_MAP[MAP.id] || []).map(function (q) { return q[1]; }), ok = D.SQUADS.concat(mine, mine).filter(function (s) { return squadCost(s) <= cap; });
      r.nextSquad = (ok.length ? ok : [D.SQUADS[0]])[(Math.random() * (ok.length || 1)) | 0];
    }
    var c = squadCost(r.nextSquad);
    if (r.credit >= c && enemies.length < 260) { r.credit -= c; spawnSquad(r.nextSquad); r.nextSquad = null; }
  }
  /* ---- méga boss Terre : le Colosse d'humus ---- */
  function wakeMega(po) {
    var d = D.ENEMIES[MAP.mega];
    var hp = d.hp * (1 + r.time / 300) * DIFF.hp * tierHp() * (1 + 0.5 * (players.length - 1));
    var e = makeEnemy(MAP.mega, d, po.x, po.y - 80, hp);
    e.scale = d.scale || 2.6; e.giant = true; e.wander = true; e.awake = true; e.title = d.name + " · " + D.ELEMENTS[d.elem].name; e.elem = d.elem; e.elem0 = d.elem; e.phase3 = 1; e.cd = 1.5;
    r.mega = { x: po.x, y: po.y - 30, R: 230, boss: e, t: 0 };
    po.st = 1; po.boss = e; po.p = 1;
    r.flash = 0.4; if (S.opts.shake) shake = 0.8;
    bannerAll("Le ciel s'assombrit… " + d.name + " se réveille !"); SND.boom();
    spawnSquad({ rodeur: 3, nuee: 6 }, e, 120);
  }
  function megaAI(e, d, dx, dy, dt, mx, my, sp) {
    var f = e.hp / e.maxHp, ph = f > 0.66 ? 1 : f > 0.33 ? 2 : 3;
    if (ph !== e.phase3) {
      e.phase3 = ph; e.cd = 1.5;
      if (ph === 2) { bannerAll("Phase 2 : il charge ! Esquive sur le côté (Volte)"); spawnSquad({ piegeur: 3, nuee: 6 }, e, 120); }
      if (ph === 3) {
        bannerAll({ terre: "Phase 3 : le sol tremble… ANCRE-TOI pour tenir et frapper !", eau: "Phase 3 : le tourbillon aspire tout… ANCRE-TOI !", feu: "Phase 3 : la tempête de feu… ANCRE-TOI pour la traverser !", air: "Phase 3 : la tornade… ANCRE-TOI pour ne pas être emporté !" }[e.elem0] || "Phase 3 : ANCRE-TOI !");
        spawnSquad({ tireur: 4, bouclier: 1 }, e, 140);
        if (nm(4)) { var oth = ELEM_K.filter(function (x) { return x !== e.elem; }); e.elem = oth[(Math.random() * oth.length) | 0]; bannerAll("Cauchemar : il devient " + D.ELEMENTS[e.elem].name + " !"); }
      }
      SND.boom(); if (S.opts.shake) shake = 0.5;
    }
    megaExtra(e, ph, dt, dx, dy, d);
    if (e.egg > 0) return [mx, my, 0];
    e.cd -= dt;
    if (ph === 1) {
      // le sol s'effondre sous tes pieds : bouge sans arrêt
      if (e.cd <= 0) { e.cd = 1.1; players.forEach(function (pl) { if (pl.down) return; warn(pl.x, pl.y, 22, 1.0, 22); if (e.elem0 === "eau") addZone(pl.x, pl.y, 22, 4, "web", 0); if (e.elem0 === "feu") addZone(pl.x, pl.y, 18, 3, "fire", 6); }); }
      if (e.elem0 === "air") { var wa = r.time * 0.6; players.forEach(function (pl) { if (!pl.anchored) { pl.x += Math.cos(wa) * 26 * dt; pl.y += Math.sin(wa) * 26 * dt; } }); }
      sp *= 0.8;
    } else if (ph === 2) {
      if (e.roll > 0) { e.roll -= dt; mx = e.cx; my = e.cy; sp = e.elem0 === "air" ? 260 : 210; if (e.elem0 === "feu" && cooled(e, "ftrail", 0.08)) addZone(e.x, e.y, 12, 3, "fire", 6); if (e.roll <= 0) { warn(e.x, e.y, 40, 0.4, 22, e); e.cd = 1.4; } }
      else if (e.windup > 0) { e.windup -= dt; sp = 0; e.flash = Math.sin(e.windup * 30) > 0 ? 0.05 : 0; if (e.windup <= 0) { e.roll = 0.9; SND.boom(); } }
      else if (e.cd <= 0) { e.windup = 1.0; e.cx = dx / d; e.cy = dy / d; fx.push({ kind: "beam", x: e.x, y: e.y, a: Math.atan2(dy, dx), len: 220, w: 9, life: 1.0, max: 1.0, col: "255,80,40" }); }
    } else {
      // séisme : ceux qui ne sont pas ancrés prennent le choc ; Eau et Air aspirent en plus
      sp *= 0.5;
      if (e.elem0 === "eau" || e.elem0 === "air") players.forEach(function (pl) { if (pl.down || pl.anchored) return; var pdx = e.x - pl.x, pdy = e.y - pl.y, pd = Math.hypot(pdx, pdy) || 1; if (pd < 320) { pl.x += pdx / pd * 34 * dt; pl.y += pdy / pd * 34 * dt; } });
      if (e.cd <= 0 && !e.quakeT) { e.quakeT = 0.9; fx.push({ kind: "ring", x: e.x, y: e.y, r: 120, life: 0.9, max: 0.9, col: "200,160,96" }); banner("ANCRE-TOI !"); }
      if (e.quakeT) {
        e.quakeT -= dt;
        if (e.quakeT <= 0) {
          e.quakeT = 0; e.cd = 2.4; if (S.opts.shake) shake = 0.35; SND.boom();
          players.forEach(function (pl) { if (pl.down || Math.hypot(pl.x - e.x, pl.y - e.y) > 300) return; if (pl.anchored) { texts.push({ x: pl.x, y: pl.y - 16, n: "TENU !", life: 0.8 }); } else damagePlayer(26, pl); });
        }
      }
    }
    return [mx, my, sp];
  }
  function megaExtra(e, ph, dt, dx, dy, d) {
    var t = e.type;
    if (t === "racines_m") {
      if (ph === 1 && cooled(e, "rtrail", 0.55)) players.forEach(function (pl) { if (!pl.down) { pl.rtr = pl.rtr || []; pl.rtr.push({ x: pl.x, y: pl.y }); if (pl.rtr.length > 3) { var q = pl.rtr.shift(); warn(q.x, q.y, 16, 0.6, 18); } } });
      if (ph === 2 && cooled(e, "whip", 2.2)) { var a = Math.atan2(dy, dx); for (var k = 1; k <= 7; k++) warn(e.x + Math.cos(a) * k * 22, e.y + Math.sin(a) * k * 22, 12, 0.7 + k * 0.05, 18); }
    } else if (t === "brochet") {
      if (ph === 2 && e.windup > 0 && !e.leapW) { e.leapW = 1; var lx = e.x + e.cx * 190, ly = e.y + e.cy * 190; warn(lx, ly, 34, 1.4, 24); }
      if (!(e.windup > 0)) e.leapW = 0;
      if (ph === 3) players.forEach(function (pl) { if (!pl.down && !pl.anchored && !gv(pl, "bro_b")) { pl.x += Math.cos(r.time * 1.3) * 30 * dt; pl.y += Math.sin(r.time * 1.1) * 24 * dt; } });
    } else if (t === "phenix") {
      if (ph === 1 && cooled(e, "plumes", 0.9)) players.forEach(function (pl) { if (!pl.down) for (var k = 0; k < 3; k++) { var px = pl.x + (Math.random() - 0.5) * 80, py = pl.y + (Math.random() - 0.5) * 60; warn(px, py, 14, 1.1, 16); } });
      if (ph === 3 && !e.reborn && e.hp < e.maxHp * 0.15) { e.reborn = true; e.egg = 6; e.vulnT = r.time + 6; bannerAll("Le Phénix renaît d'un œuf : casse-le avant l'éclosion !"); }
      if (e.egg > 0) { e.egg -= dt; if (e.egg <= 0 && !e.dead) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.3); bannerAll("Le Phénix renaît !"); burst(e.x, e.y, "#ff7a2a", 30); } }
    } else if (t === "aigle") {
      if (ph === 2 && e.windup > 0 && !e.edge) { e.edge = 1; var tg = targetOf(e), ea = Math.random() * TAU; e.x = tg.x + Math.cos(ea) * 170; e.y = tg.y + Math.sin(ea) * 120; var ndx = tg.x - e.x, ndy = tg.y - e.y, nd = Math.hypot(ndx, ndy) || 1; e.cx = ndx / nd; e.cy = ndy / nd; warn(tg.x, tg.y, 26, e.windup, 18); }
      if (!(e.windup > 0)) e.edge = 0;
      if (ph === 3 && cooled(e, "grab", 3.2)) players.forEach(function (pl) { if (pl.down || Math.hypot(pl.x - e.x, pl.y - e.y) > 220) return; if (pl.anchored) texts.push({ x: pl.x, y: pl.y - 16, n: "TENU !", life: 0.8 }); else { damagePlayer(18, pl); var gx = e.x - pl.x, gy = e.y - pl.y, gd = Math.hypot(gx, gy) || 1; pl.x += gx / gd * 40; pl.y += gy / gd * 40; } });
    }
  }
  // l'arène du méga boss se ferme : on ne peut pas s'enfuir
  function megaArena(pl) {
    var m = r.mega; if (!m) return;
    if (m.boss.dead) {
      var mel = m.boss.d.elem || "terre"; S.cauch = S.cauch || {}; S.cauch[MAP.id] = Math.min(10, Math.max(S.cauch[MAP.id] || 0, cN() + 1)); S.mega = S.mega || {};
      if (!S.mega[mel]) { S.mega[mel] = Date.now(); bannerAll(m.boss.d.name + " vaincu ! Palier Cauchemar " + S.cauch[MAP.id] + " débloqué sur " + MAP.name); }
      r.mega = null; if (isExpe() && r.ex) { r.ex.megaWon = true; r.ex.st.forEach(function (st) { if (st.k === "x_mega") st.hidden = 0; }); bannerAll("La sortie du méga boss s'ouvre au cœur"); } save(); var mit = m.boss.type === "colosse" ? ITM.coeur_humus : D.ITEMS.filter(function (it) { return it.mega === m.boss.type; })[0]; if (mit) drop("item", m.boss.x, m.boss.y, mit.idx); else dropItem(m.boss.x, m.boss.y, 3); return; }
    var dx = pl.x - m.x, dy = (pl.y - m.y) * 1.25, d = Math.hypot(dx, dy);
    if (d > m.R) { pl.x = m.x + dx / d * m.R; pl.y = m.y + dy / d * m.R / 1.25; }
  }
  function drawMega(cx, cy) {
    var m = r.mega; if (!m) return;
    ctx.fillStyle = "rgba(10,6,20,.28)"; ctx.fillRect(cx, cy, W, H);
    ctx.strokeStyle = "rgba(200,160,96," + (0.55 + 0.25 * Math.sin(r.time * 4)) + ")"; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -r.time * 20;
    ctx.beginPath(); ctx.ellipse(m.x, m.y, m.R, m.R / 1.25, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
  }
  /* ---------- 2.0 phase 4 : attirail, ressources, talents, maîtrise ---------- */
  var HIT_ELEM;                           // élément du coup en cours (amulette)
  var HIT_FX = null;                      // règles spéciales du coup en cours (évolutions C, fusions)
  var CUR_FAM = null;                     // famille de la technique qui frappe (quêtes, signatures)
  var HIT_TREE = false;                   // le coup vient d'un arbre de Fougère
  function eqS() { S.eq = S.eq || { inv: [], worn: {}, uid: 1 }; S.res = S.res || {}; S.clvl = S.clvl || {}; S.tal = S.tal || {}; S.mast = S.mast || {}; return S.eq; }
  function charLevel(cid) { return Math.min(12, 1 + Math.floor(Math.sqrt(((S.clvl || {})[cid] || 0) / 40))); }
  function charXpFor(l) { return (l - 1) * (l - 1) * 40; }
  function mastLevel(aid) { var x = (S.mast || {})[aid] || 0, l = 1; D.MASTERY.forEach(function (t, i) { if (x >= t) l = i + 1; }); return l; }
  function pieceById(id) { return eqS().inv.filter(function (q) { return q.id === id; })[0] || null; }
  function wornBy(cid) { var w = eqS().worn; return (w[cid] = w[cid] || {}); }
  function whoWears(id) { var w = eqS().worn, out = null; Object.keys(w).forEach(function (c) { Object.keys(w[c]).forEach(function (s) { if (w[c][s] === id) out = c; }); }); return out; }
  function gearVal(q) { var g = D.GEAR[q.t]; return g.lo === undefined ? 0 : g.lo + (g.hi - g.lo) * q.roll; }
  function fmtV(v) { return v >= 10 ? String(Math.round(v)) : fr(Math.round(v * 10) / 10); }
  function pieceDesc(q) {
    var g = D.GEAR[q.t];
    return g.desc.replace("{v}", fmtV(gearVal(q))).replace("{t}", (q.tech || []).map(function (t) { return D.TECH[t] ? D.TECH[t].name : t; }).join(", "));
  }
  function genPiece(tier, tpl) {
    var keys = Object.keys(D.GEAR).filter(function (k) { return !D.GEAR[k].unique; }), t = tpl || keys[(Math.random() * keys.length) | 0], g = D.GEAR[t];
    var q = { id: eqS().uid++, t: t, roll: tpl ? 0.5 : Math.random(), tier: tier || 1, pts: 0 };
    if (g.elem) q.pts = Math.min(3, 1 + (Math.random() < 0.4 ? 1 : 0) + (q.tier - 1));
    if (g.ring === "apprenti") { var all = Object.keys(D.TECH).sort(function () { return Math.random() - 0.5; }); q.tech = all.slice(0, 2); }
    return q;
  }
  function randUnique() { var u = Object.keys(D.GEAR).filter(function (k) { return D.GEAR[k].unique; }); return u[(Math.random() * u.length) | 0]; }
  function addPiece(q) { var e = eqS(); if (e.inv.length >= 40 + 10 * (S.chestSize || 0)) { recycle(q, true); return false; } e.inv.push(q); return true; }
  function recycle(q, silent) {
    var g = D.GEAR[q.t]; Object.keys(g.cost).forEach(function (k) { S.res[k] = (S.res[k] || 0) + Math.ceil(g.cost[k] * 0.5); });
    var e = eqS(); e.inv = e.inv.filter(function (x) { return x.id !== q.id; });
    Object.keys(e.worn).forEach(function (c) { Object.keys(e.worn[c]).forEach(function (s) { if (e.worn[c][s] === q.id) delete e.worn[c][s]; }); });
    if (!silent) save();
  }
  function canCraft(t) { var g = D.GEAR[t]; return Object.keys(g.cost).every(function (k) { return (S.res[k] || 0) >= g.cost[k]; }); }
  function craft(t) {
    if (!canCraft(t)) return null; var g = D.GEAR[t];
    Object.keys(g.cost).forEach(function (k) { S.res[k] -= g.cost[k]; });
    var q = genPiece(1, t); addPiece(q); save(); return q;
  }
  // tout ce que l'écureuil emporte en partie : attirail porté, talents de sa posture, maîtrise de l'arme
  function v2Loadout(pl) {
    eqS();
    var cid = pl.char.id, w = wornBy(cid);
    pl.gear = []; pl.ring = {}; pl.amu = {}; pl.epts = { terre: 0, feu: 0, eau: 0, air: 0 }; pl.extraTech = []; pl.set = {};
    var uniq = 0;
    Object.keys(w).forEach(function (s) {
      var q = pieceById(w[s]); if (!q) return; var g = D.GEAR[q.t]; if (!g) return;
      if (g.who && g.who !== cid) return;                 // panoplie d'un autre écureuil
      if (g.unique && uniq++) return;                     // une seule pièce unique à la fois
      pl.gear.push({ q: q, g: g, v: gearVal(q) });
      if (q.extra && D.GEAR[q.extra]) { var gx = D.GEAR[q.extra]; pl.gear.push({ q: q, g: gx, v: gx.lo === undefined ? 0 : (gx.lo + gx.hi) / 2 }); }
      if (g.set) pl.set[g.set] = (pl.set[g.set] || 0) + 1;
      if (g.elem && q.pts) pl.epts[g.elem] += q.pts;
      if (g.ring) pl.ring[g.ring] = true;
      if (g.ring === "apprenti") pl.extraTech = pl.extraTech.concat(q.tech || []);
      if (g.fam) { pl.amu[g.fam] = g.elem; if (g.fam === "compagnon") pl.amu.retour = g.elem; }
      if (g.fx === "ambre") { pl.epts.terre += 2; pl.epts.feu += 1; }
      if (g.fx === "u_vents") ["terre", "feu", "eau", "air"].forEach(function (el) { pl.epts[el] += 3; });
      if (g.fx === "u_sceau") pl.ring2x = true;
    });
    Object.keys(pl.set).forEach(function (sid) { var st = D.SETS[sid]; if (st && st.mega && pl.set[sid] >= 2) pl.epts[st.elem] += 2; });
    pl.rerolls = (pl.rerolls || 0) + (pl.ring.relance ? (pl.ring2x ? 4 : 2) : 0);
    // talents : seulement les paliers ouverts par le niveau de l'écureuil, pour la posture jouée
    var lv = charLevel(cid), pick = ((S.tal[cid] || {})[pl.posture]) || {};
    pl.tal = {};
    for (var t = 0; t < 4; t++) {
      if (lv < D.TAL_LVL[t] || !pick[t + 1]) continue;
      var pair = t < 2 ? D.TAL_COMMON[t] : (D.TAL[pl.posture] || [])[t - 2]; if (!pair) continue;
      var node = pair[pick[t + 1] === "b" ? 1 : 0]; pl.tal[node.id] = true;
    }
    pl.anchorTh = pl.anchorTh0 = pl.tal.racines ? 0.25 : V2.anchorT;
    pl.volteBase = pl.volteBase0 = (pl.tal.voltigeuse ? 1.5 : pl.tal.ressort ? 2.2 : V2.volteCd);
    pl.epts0 = { terre: pl.epts.terre, feu: pl.epts.feu, eau: pl.epts.eau, air: pl.epts.air };
  }
  function tal(pl, id) { return !!(pl.tal && pl.tal[id]); }
  function gearHas(pl, fx) { for (var i = 0; pl.gear && i < pl.gear.length; i++) if (pl.gear[i].g.fx === fx) return pl.gear[i]; return null; }
  function gpw() { return 0.5 + 0.05 * ((r && r.level) || 1); }     // l'attirail grandit avec la puissance de partie
  function ept(pl, el, n) { return (pl.epts && pl.epts[el] || 0) >= n; }
  // effets d'attirail liés aux états (appelé à chaque image pour le joueur local)
  function gearTick(pl, dt) {
    if (!pl.gear || pl.down) return;
    var pp = p; p = pl; var k = gpw();
    pl.gearArm = 0;
    pl.gear.forEach(function (it) {
      var fx = it.g.fx, v = it.v;
      if (pl.anchored) {
        if (fx === "spores" && cooled(pl, "g_sp", 0.8)) zones.push({ x: pl.x, y: pl.y + 2, r: 24, t: 0, dur: 1, kind: "spore", dmg: 0, owner: pl, pdmg: v * k });
        if (fx === "armure") pl.gearArm = v / 100;
        if (fx === "regen") pl.hp = Math.min(pl.maxHp, pl.hp + v * dt);
        if (fx === "epines" && cooled(pl, "g_ep", 0.8)) near(pl.x, pl.y, 30, function (e) { if (Math.hypot(e.x - pl.x, e.y - pl.y) < 26 + e.d.r) hurt(e, v * k, (e.x - pl.x) * 2, (e.y - pl.y) * 2); });
      } else if (pl.mstate === "mouvement") {
        if (fx === "trainee" && cooled(pl, "g_tr", 0.15)) zones.push({ x: pl.x, y: pl.y + 3, r: 9, t: 0, dur: 1.6, kind: "fire", dmg: 0, owner: pl, pdmg: v * k * 0.6 });
        if (fx === "pas") { pl.stepD = (pl.stepD || 0) + Math.hypot(pl.x - (pl.lx || pl.x), pl.y - (pl.ly || pl.y)); if (pl.stepD > 50) { pl.stepD = 0; var hk = HIT_ELEM; HIT_ELEM = "terre"; fireNova(28 * pl.area, v * k); HIT_ELEM = hk; } }
        if (fx === "ralenti") near(pl.x, pl.y, 20, function (e) { if (Math.hypot(e.x - pl.x, e.y - pl.y) < 16 + e.d.r) { e.slowT = 0.6; e.slow = Math.max(e.slow || 0, v / 100); } });
      }
    });
    gearTick2(pl, dt, k);
    pl.lx = pl.x; pl.ly = pl.y;
    // talents continus
    if (tal(pl, "nid_t") && pl.hooked) pl.hp = Math.min(pl.maxHp, pl.hp + 2 * dt);
    if (setCount(pl, "sylve") >= 3 && pl.char.id !== "druide") { if (pl.anchored && cooled(pl, "sylveP", 4)) plant(pl, true); if (pl.trees) druideTick(pl, dt, k); }
    if (tal(pl, "tourelle_v") && pl.anchored && pl.anchorT > 2 && cooled(pl, "t_tour", 3)) crown(pl);
    if (pl.posture === "courant" && pl.char.id === "planeur") {
      var spf = Math.hypot(pl.vx || 0, pl.vy || 0) / ((pl.speed || 60) * 1.15);
      if (tal(pl, "lameair") && spf > 0.8 && cooled(pl, "t_lame", 0.8)) { var ag = Math.atan2(pl.vy, pl.vx); projs.push({ owner: pl, kind: "bullet", x: pl.x, y: pl.y, vx: Math.cos(ag) * 200, vy: Math.sin(ag) * 200, dmg: 14 * k, pierce: 6, sprite: "windblade", life: 0.6, hit: [], r: 6, explode: 0 }); }
      if (tal(pl, "sillagetr") && spf > 0.7) near(pl.x, pl.y, 18, function (e) { if (Math.hypot(e.x - pl.x, e.y - pl.y) < 10 + e.d.r && cooled(e, "sill", 0.4)) hurt(e, 12 * k, pl.vx * 0.5, pl.vy * 0.5); });
    }
    if (pl.sillT > 0) pl.sillT -= dt;
    p = pp;
  }
  function gearStats(pl, a, m) {
    var v, sz = pl.set || {};
    if (a && (v = gv(pl, "jum_c")) && pl.twinRef && Math.hypot(pl.twinRef.x - pl.x, pl.twinRef.y - pl.y) < 26) pl.dmgX *= 1 + v / 100;
    if (pl.hooked && (v = gv(pl, "vol_c"))) pl.rangeMul *= 1 + v / 100;
    if ((sz.volplane || 0) >= 3 && (pl.unhookT || 0) >= 3) pl.dmgX *= 1.25;
    if (m && (v = gv(pl, "vat_b")) && r && r.betPend) pl.spdX *= 1 + v / 100;
    if (a && gv(pl, "bra_c")) pl.dmgX *= 1 + Math.min(0.25, 0.05 * (pl.anchorT || 0));
    if (a && gv(pl, "phe_c")) pl.dmgX *= 1.25;
    if (pl.tourbeT > 0) pl.dmgX *= 1.2;
    if (pl.diaT > 0) pl.spdX *= 1.1;
    if (pl.eclT > 0 && pl.eclT < 1) pl.spdX *= 1.2;
    if (m && gv(pl, "u_patins")) pl.spdX *= 1.3;
    if (pl.armT > 0) pl.armX += pl.armV || 0;
    if (a && (sz.colosse || 0) >= 3 && pl.anchorT >= 3) pl.armX += 4;
  }
  function gv(pl, fx) { var it = gearHas(pl, fx); return it ? (it.v || 1) : 0; }
  // contenu étendu : effets continus des nouvelles pièces, panoplies et pièces uniques
  function gearVolte2(pl, dx, dy, k) {
    var v, hk = HIT_ELEM;
    if ((v = gv(pl, "anneauFeu"))) pZone({ x: pl.x, y: pl.y, r: 26, dur: 2, kind: "fire", owner: pl, pdmg: v * k * 0.4, elem: "feu" });
    if (gv(pl, "etincelles")) pl.sparkN = 3;
    if ((v = gv(pl, "vagueV"))) { HIT_ELEM = "eau"; projs.push({ owner: pl, kind: "bullet", x: pl.x, y: pl.y, vx: dx * 160, vy: dy * 160, dmg: v * k, pierce: 99, sprite: "bubble", life: 0.6, hit: [], r: 10, explode: 0, elem: "eau" }); HIT_ELEM = hk; }
    if ((v = gv(pl, "capePierre"))) { pl.armT = 2; pl.armV = v; }
    if (gv(pl, "app_k")) gems.forEach(function (g) { if (g.kind === "xp" && Math.abs(g.x - pl.x) < W / 2 && Math.abs(g.y - pl.y) < H / 2) g.pull = 200; });
    if (gv(pl, "cor_k") && pl.crew) pl.crew.forEach(function (mt) { crewShoot(pl, mt, 1.5); });
    if (gv(pl, "syl_k")) { var kx = pl.x, ky = pl.y; pl.x -= dx * 10; pl.y -= dy * 10; plant(pl, true); pl.x = kx; pl.y = ky; }
    if (gv(pl, "jum_k") && pl.twinRef && !pl.twinRef.down) { var tw = pl.twinRef, ra = (pl.hp / pl.maxHp + tw.hp / tw.maxHp) / 2; pl.hp = pl.maxHp * ra; tw.hp = tw.maxHp * ra; burst(tw.x, tw.y, "#ff9aa0", 6); }
    if ((v = gv(pl, "gra_k")) && pl.debt > 0) pl.debt *= 1 - v / 100;
    if (gv(pl, "vol_k")) { pl.vx = (pl.vx || 0) * 2; pl.vy = (pl.vy || 0) * 2; }
    if (gv(pl, "glo_k")) pl.spitFire = true;
    if (gv(pl, "sev_k") && pl.surge > 0) pl.surge += 1;
    if (gv(pl, "shi_k")) near(pl.x, pl.y, 90, function (e) { e.spotted = false; });
    if (gv(pl, "vat_k") && r.betPend && pl.vatLvl !== r.level) { pl.vatLvl = r.level; r.gold += 10; texts.push({ x: pl.x, y: pl.y - 16, n: "+10", life: 0.7, col: "#f6d36b" }); }
    if (gv(pl, "clo_k")) { var px = -dy, py = dx; for (var i = -1; i <= 1; i++) pZone({ x: pl.x - dx * 16 + px * i * 12, y: pl.y - dy * 16 + py * i * 12, r: 10, dur: 3, kind: "thorn", dmg: 2 * k, owner: pl, elem: "terre" }); }
    if (gv(pl, "mer_k")) { pl.inv = Math.max(pl.inv, 1); pl.vaseT = 1; burst(pl.x, pl.y, "#4aa8ff", 10); }
    if (gv(pl, "bra_k")) enemies.forEach(function (e) { if (e.burnT > 0 && e.burnBy === pl && !e.dead) { var pp = p; p = pl; hurt2(e, (e.burnD || 3) * 3); p = pp; e.burnT = 0; burst(e.x, e.y, "#ff7a2a", 6); } });
    if (gv(pl, "tem_k") && pl.char.id !== "planeur") { var nx = pl.x + dx * 30, ny = pl.y + dy * 30; if (!isDungeon() || walkable(nx, ny)) { pl.x = nx; pl.y = ny; pushOutGiants(pl, 5); } }
    if (gv(pl, "ora_k")) for (var j = 1; j <= 3; j++) { pZone({ x: pl.x - dx * j * 12, y: pl.y - dy * j * 12, r: 10, dur: 2, kind: "thorn", dmg: 4 * k, owner: pl, elem: "air" }); markZone(pl.x - dx * j * 12, pl.y - dy * j * 12, 10, 2, "air"); }
    if (gv(pl, "brs_k")) near(pl.x, pl.y, 56, function (e) { if (!e.d.prop) e.missT = r.time + 1; });
    if (gv(pl, "u_derniere")) { HIT_ELEM = "feu"; explode(pl.x, pl.y, 34, 30 * k, 0); HIT_ELEM = hk; if (pl.hp < pl.maxHp * 0.25) pl.volteCd = 0; }
    if (gv(pl, "u_eclipse")) { near(pl.x, pl.y, 90, function (e) { if (!e.d.prop) { e.slowT = Math.max(e.slowT, 1); e.slow = Math.max(e.slow || 0, e.d.boss ? 0.25 : 0.5); } }); pl.eclT = 2; ring(pl.x, pl.y, 80, false); }
    if (gv(pl, "u_racines")) { var best = null, bd = 120; allComps().concat(pl.trees || []).forEach(function (c) { var d = Math.hypot(c.x - pl.x, c.y - pl.y); if (d < bd && d > 10) { bd = d; best = c; } }); if (best) { var sx = pl.x, sy = pl.y; pl.x = best.x; pl.y = best.y; best.x = sx; best.y = sy; burst(pl.x, pl.y, "#6b4430", 8); } }
    if (gv(pl, "mil_k")) { var hm = HIT_ELEM; HIT_ELEM = "terre"; for (var mk = 1; mk <= 3; mk++) { var mxp = pl.x + dx * mk * 22, myp = pl.y + dy * mk * 22; explode(mxp, myp, 14, 40 * k / 3, 0); near(mxp, myp, 20, function (e) { if (!e.d.boss && !e.d.prop) { e.stunT = 1; e.slowT = 1; e.slow = 1; e.rootT = r.time + 1; } }); } HIT_ELEM = hm; }
    if (gv(pl, "bro_k")) for (var bk = 1; bk <= 3; bk++) { pZone({ x: pl.x - dx * bk * 12, y: pl.y - dy * bk * 12, r: 10, dur: 3, kind: "thorn", dmg: 2 * k, owner: pl, elem: "eau" }); markZone(pl.x - dx * bk * 12, pl.y - dy * bk * 12, 10, 3, "eau"); }
    if (gv(pl, "phe_k") && pl.hp < pl.maxHp * 0.3 && cooled(pl, "g_phek", 20)) { pl.hp = Math.min(pl.maxHp, pl.hp + pl.maxHp * 0.15); burst(pl.x, pl.y, "#ff7a2a", 14); }
    if (gv(pl, "aig_k")) pl.inv = Math.max(pl.inv || 0, 1);
    if (gv(pl, "u_capuche") && pl.lastReact) { var ce = nearest(1, 80)[0]; if (ce) react(ce, pl.lastReact[0], pl.lastReact[1], true); }
  }
  function gearTick2(pl, dt, k) {
    var a = pl.anchored, m = pl.mstate === "mouvement", v, step = Math.hypot(pl.x - (pl.lx || pl.x), pl.y - (pl.ly || pl.y));
    pl.vigieX = a && (v = gv(pl, "vigie")) ? 1 + v / 100 : 1;
    pl.diaT = Math.max(0, (pl.diaT || 0) - dt); pl.eclT = Math.max(0, (pl.eclT || 0) - dt); pl.tourbeT = Math.max(0, (pl.tourbeT || 0) - dt); pl.armT = Math.max(0, (pl.armT || 0) - dt);
    if (pl.vaseT > 0) { pl.vaseT -= dt; if (pl.vaseT <= 0) { var hv = HIT_ELEM; HIT_ELEM = "eau"; explode(pl.x, pl.y, 30, 20 * k, 0); HIT_ELEM = hv; } }
    if (a) {
      if ((v = gv(pl, "givreA"))) near(pl.x, pl.y, 40, function (e) { if (!e.d.prop && Math.hypot(e.x - pl.x, e.y - pl.y) < 34 + e.d.r) { e.slowT = Math.max(e.slowT, 0.3); e.slow = Math.max(e.slow || 0, (e.d.boss ? 0.3 : 1) * v / 100); } });
      if ((v = gv(pl, "flammeA")) && cooled(pl, "g_fl", 3)) { var t = nearest(1, 150)[0]; if (t) { var ag = Math.atan2(t.y - pl.y, t.x - pl.x); projs.push({ owner: pl, kind: "bullet", x: pl.x, y: pl.y - 4, vx: Math.cos(ag) * 110, vy: Math.sin(ag) * 110, dmg: v * k, pierce: 1, sprite: "wisp", homing: true, life: 2, hit: [], r: 4, explode: 0, elem: "feu" }); } }
      if ((v = gv(pl, "deviA"))) for (var i = hostile.length - 1; i >= 0; i--) { var h = hostile[i]; if (!h.devi && Math.abs(h.x - pl.x) < 26 && Math.abs(h.y - pl.y) < 26) { h.devi = 1; if (Math.random() < v / 100) { hostile.splice(i, 1); burst(h.x, h.y, "#d8e8ff", 3); } } }
      if (gv(pl, "cor_c") && pl.crew) pl.crew.forEach(function (mt) { for (var j = hostile.length - 1; j >= 0; j--) if (Math.abs(hostile[j].x - mt.x) < 7 && Math.abs(hostile[j].y - mt.y) < 7) { hostile.splice(j, 1); burst(mt.x, mt.y, "#fdf3de", 2); } });
      if (gv(pl, "glo_c") && (pl.size || 1) > 1) { pl.size = Math.max(1, pl.size - 0.01 * dt * pl.size); pl.hp = Math.min(pl.maxHp, pl.hp + 2 * dt); }
      if (gv(pl, "clo_c")) near(pl.x, pl.y, 24, function (e) { if (!e.d.prop && Math.hypot(e.x - pl.x, e.y - pl.y) < 16 + e.d.r) { e.slowT = Math.max(e.slowT, 0.3); e.slow = Math.max(e.slow || 0, 0.4); } });
      if (gv(pl, "mer_c") && cooled(pl, "g_mer", 1)) markZone(pl.x, pl.y + 2, Math.min(40, 12 + pl.anchorT * 4), 1.3, "eau");
      if (gv(pl, "tem_c") && cooled(pl, "g_tem", 2)) for (var j2 = 0; j2 < hostile.length; j2++) if (Math.hypot(hostile[j2].x - pl.x, hostile[j2].y - pl.y) < 80) { burst(hostile[j2].x, hostile[j2].y, "#c8f8e8", 4); hostile.splice(j2, 1); break; }
      if (gv(pl, "ora_c")) for (var j3 = hostile.length - 1; j3 >= 0; j3--) if (Math.hypot(hostile[j3].x - pl.x, hostile[j3].y - pl.y) < 40 && cooled(pl, "g_ora", 0.3)) { hostile.splice(j3, 1); var tz = nearest(1, 120)[0]; if (tz) { var ho = HIT_ELEM; HIT_ELEM = "air"; zapChain(tz, 2, 18 * k, { x: pl.x, y: pl.y - 10 }); HIT_ELEM = ho; } }
      if (gv(pl, "brs_c")) near(pl.x, pl.y, 60, function (e) { if (e.burnT > 0 && !e.d.prop) pl.hp = Math.min(pl.maxHp, pl.hp + 0.5 * dt); });
      if (gv(pl, "u_diademe") && cooled(pl, "g_dia", 6)) { var rooted = 0; near(pl.x, pl.y, 30, function (e) { if (!e.d.prop && !e.d.boss && Math.hypot(e.x - pl.x, e.y - pl.y) < 22 + e.d.r) { e.stunT = 1.5; e.slowT = 1.5; e.slow = 1; rooted++; } }); if (rooted) { pl.diaT = 2; burst(pl.x, pl.y, "#6b4430", 8); } }
      if (gv(pl, "u_capuche") && cooled(pl, "g_cap", 4)) { var ce = nearest(1, 70)[0]; if (ce) { var ks = Object.keys(D.REACTIONS), kk = ks[(Math.random() * ks.length) | 0].split("+"); pl.lastReact = kk; react(ce, kk[0], kk[1], true); } }
      if (gv(pl, "mil_c") && cooled(pl, "g_mil", 3)) { var mt0 = nearest(1, 24)[0]; if (mt0 && !mt0.d.boss) { mt0.stunT = 1.5; mt0.slowT = 1.5; mt0.slow = 1; mt0.rootT = r.time + 1.5; burst(mt0.x, mt0.y, "#6b4430", 6); } }
      if (gv(pl, "bro_c") && cooled(pl, "g_bro", 4)) { var bt0 = nearest(1, 130)[0]; if (bt0) { var hb0 = HIT_ELEM; HIT_ELEM = "eau"; explode(bt0.x, bt0.y, 18, 40 * k, 0); HIT_ELEM = hb0; } }
      if (gv(pl, "phe_c")) pl.hp = Math.max(1, pl.hp - dt);
      if (pl.oraCh > 0) { var oz = nearest(pl.oraCh, 140); var ho2 = HIT_ELEM; HIT_ELEM = "air"; oz.forEach(function (e) { zapChain(e, 2, 16 * k, { x: pl.x, y: pl.y - 10 }); }); HIT_ELEM = ho2; pl.oraCh = 0; }
    } else if (m) {
      if ((v = gv(pl, "galoche")) && cooled(pl, "g_ga", 0.35)) markZone(pl.x, pl.y + 3, 10, v, "eau");
      if ((v = gv(pl, "frole"))) near(pl.x, pl.y, 20, function (e) { if (!e.d.prop && Math.hypot(e.x - pl.x, e.y - pl.y) < 14 + e.d.r && cooled(e, "frole", 1) && Math.random() < v / 100) { if (!(e.burnT > 0)) r.burns = (r.burns || 0) + 1; e.burnT = 3; e.burnD = 3 * k; e.burnBy = pl; } });
      if ((v = gv(pl, "pasSoin"))) { pl.soinD = (pl.soinD || 0) + step; if (pl.soinD >= 50) { pl.soinD = 0; pl.hp = Math.min(pl.maxHp, pl.hp + v); } }
      if ((v = gv(pl, "cor_b")) && pl.crew) pl.crew.forEach(function (mt) { near(mt.x, mt.y, 14, function (e) { if (!e.d.prop && Math.hypot(e.x - mt.x, e.y - mt.y) < 6 + e.d.r && cooled(e, "pietine", 0.5)) hurt(e, v * k, 0, 0); }); });
      if (gv(pl, "syl_b") && pl.trees) pl.trees.forEach(function (t) { if (t.age >= t.grow && Math.hypot(t.x - pl.x, t.y - pl.y) < 22 && cooled(t, "sylb", 1)) t.cd = 0; });
      if (gv(pl, "glo_b") && (pl.size || 1) > 1.15) near(pl.x, pl.y, 12 * pl.size + 8, function (e) { if (!e.d.prop && !e.d.boss && Math.hypot(e.x - pl.x, e.y - pl.y) < 6 * pl.size + e.d.r) { var dd = Math.hypot(e.x - pl.x, e.y - pl.y) || 1; e.kx += (e.x - pl.x) / dd * 40; e.ky += (e.y - pl.y) / dd * 40; } });
      if (gv(pl, "clo_b")) near(pl.x, pl.y, 26, function (e) { if (e.d.role === "nuee" && !e.d.boss && Math.hypot(e.x - pl.x, e.y - pl.y) < 20 + e.d.r && cooled(e, "trip", 2)) { e.stunT = 0.5; e.slowT = 0.5; e.slow = 1; } });
      if (gv(pl, "mer_b")) { var wz = zoneAt(pl.x, pl.y + 3, "mark"); if ((wz && wz.elem === "eau") || zoneAt(pl.x, pl.y + 3, "mud")) pl.tourbeT = 3; }
      if (gv(pl, "ora_b")) { pl.oraD = (pl.oraD || 0) + step; if (pl.oraD >= 100) { pl.oraD = 0; pl.oraCh = Math.min(3, (pl.oraCh || 0) + 1); } }
      if (gv(pl, "brs_b")) near(pl.x, pl.y, 20, function (e) { if (e.burnT > 0 && !e.d.prop && Math.hypot(e.x - pl.x, e.y - pl.y) < 14 + e.d.r && cooled(e, "lave", 1)) explode(e.x, e.y, 18, 15 * k, 0); });
      if (gv(pl, "u_ours") && cooled(pl, "g_ours", 0.25)) { pZone({ x: pl.x, y: pl.y + 3, r: 8, dur: 2, kind: "fire", owner: pl, pdmg: 3 * k, elem: "feu" }); markZone(pl.x, pl.y + 3, 8, 2, "feu"); }
      if (gv(pl, "u_patins") && cooled(pl, "g_pat", 0.2)) { pZone({ x: pl.x, y: pl.y + 3, r: 8, dur: 1.5, kind: "thorn", dmg: 2 * k, owner: pl, elem: "eau" }); markZone(pl.x, pl.y + 3, 8, 1.5, "eau"); }
      if (gv(pl, "tem_b") && pl.dir && pl.tdir && pl.dir.x * pl.tdir.x + pl.dir.y * pl.tdir.y < 0.6 && cooled(pl, "g_tb", 0.4)) { var te = nearest(1, 110)[0]; if (te) { var ht = HIT_ELEM; HIT_ELEM = "air"; zapChain(te, 1, 14 * k, { x: pl.x, y: pl.y - 8 }); HIT_ELEM = ht; } }
      if (gv(pl, "jum_b") && pl.twinRef) pl.twinBehind = true; else pl.twinBehind = false;
      if (gv(pl, "mil_b") && cooled(pl, "g_milb", 0.3)) markZone(pl.x, pl.y + 3, 8, 2, "terre");
      if (gv(pl, "phe_b") && cooled(pl, "g_pheb", 0.5)) lobs.push({ owner: pl, sx: pl.x, sy: pl.y + 2, tx: pl.x, ty: pl.y + 2, t: 0, dur: 2, dmg: 15 * k, rad: 18, frag: 0, sprite: "feather", elem: "feu" });
      if (gv(pl, "aig_b")) near(pl.x, pl.y, 18, function (e) { if (!e.d.prop && !e.d.boss && Math.hypot(e.x - pl.x, e.y - pl.y) < 10 + e.d.r && cooled(e, "aigb", 1)) { var ad = Math.hypot(e.x - pl.x, e.y - pl.y) || 1; e.kx += (e.x - pl.x) / ad * 260; e.ky += (e.y - pl.y) / ad * 260; } });
    }
    pl.tdir = pl.dir;
    if (!pl.hooked) pl.unhookT = (pl.unhookT || 0) + dt; else pl.unhookT = 0;
    if (pl.char.id === "trefle" && r.betPend && gv(pl, "vat_c") && a) pl.critX = gv(pl, "vat_c") / 100; else pl.critX = 0;
  }
  // effets d'attirail et de signature à la Volte
  function gearVolte(pl, dx, dy) {
    var k = gpw();
    (pl.gear || []).forEach(function (it) {
      var fx = it.g.fx, v = it.v;
      if (fx === "eclair") { var t = nearest(1, 140)[0]; if (t) { var hk = HIT_ELEM; HIT_ELEM = "air"; zapChain(t, 4, v * k, { x: pl.x, y: pl.y }); HIT_ELEM = hk; } }
      if (fx === "brume") { pl.inv = Math.max(pl.inv, v); fx === "brume" && burst(pl.x, pl.y, "#e8e8f0", 10); }
      if (fx === "ronces") zones.push({ x: pl.x, y: pl.y, r: 30, t: 0, dur: 3, kind: "thorn", dmg: v * k * 0.5, owner: pl });
      if (fx === "souffle") { ring(pl.x, pl.y, 50, false); near(pl.x, pl.y, 60, function (e) { var d = Math.hypot(e.x - pl.x, e.y - pl.y) || 1; if (d < 50 + e.d.r) hurt(e, v * k, (e.x - pl.x) / d * 200, (e.y - pl.y) / d * 200); }); }
    });
    gearVolte2(pl, dx, dy, k);
    var sp0 = hasSig(pl, "voltePath"), sn0 = hasSig(pl, "volteNova");
    if (sp0) for (var i = 1; i <= 3; i++) zones.push({ x: pl.x - dx * i * 12, y: pl.y - dy * i * 12, r: 12, t: 0, dur: 2, kind: "thorn", dmg: 5 * (1 + 0.25 * (sp0.l - 1)), owner: pl });
    if (sn0) { var hk2 = HIT_ELEM; HIT_ELEM = sn0.sg.elem; fireNova(50 * pl.area, 22 * (1 + 0.25 * (sn0.l - 1))); HIT_ELEM = hk2; }
    sigVolte(pl, dx, dy);
    if (setCount(pl, "orage") >= 4) { var tz = nearest(1, 140)[0]; if (tz) { var hk4 = HIT_ELEM; HIT_ELEM = "air"; zapChain(tz, 5, 20 * gpw(), { x: pl.x, y: pl.y }); HIT_ELEM = hk4; } }
    if (tal(pl, "sillage")) pl.sillT = 1.5;
  }
  // signatures déclenchées par la Volte (contenu étendu)
  function volteItems(pl, dx, dy) {
    var n;
    if (r && pl === me) { if (r.time - (pl.lastVt || -9) < 1) r.dblVolte = (r.dblVolte || 0) + 1; pl.lastVt = r.time; r.vc = (r.vc || 0) + 1; r.vcMax = Math.max(r.vcMax || 0, r.vc); }
    if ((n = itn(pl, "pirouette"))) pl.hp = Math.min(pl.maxHp, pl.hp + 3 * n);
    if (itn(pl, "feinte")) pl.feinteT = 1;
    if (itn(pl, "frisson")) pl.frisRdy = true;
    if ((n = itn(pl, "eclats_bois"))) for (var i = 0; i < 4; i++) { var a = i / 4 * TAU; projs.push({ owner: pl, kind: "bullet", x: pl.x, y: pl.y - 2, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, dmg: 12 * n * gpw(), pierce: 2, sprite: "needle", life: 0.6, hit: [], r: 3, explode: 0 }); }
    if (itn(pl, "contre_courant")) { pl.ccT = 2; pl.orbDir = -(pl.orbDir || 1); projs.forEach(function (q) { if (q.owner === pl && q.kind === "boomerang") { q.back = !q.back; q.dist = 0; } }); }
    if (itn(pl, "leurre")) { r.decoys = (r.decoys || []).filter(function (d) { return d.t > r.time; }); r.decoys.push({ x: pl.x, y: pl.y, t: r.time + 2, decoy: true, anchorT: 0 }); fx.push({ kind: "ghost", x: pl.x, y: pl.y, life: 2, max: 2, spr: pl.sprite, face: pl.face }); }
    if (itn(pl, "pivot")) { var best = null; techEntries(pl).forEach(function (en) { var tv = pl.timers[en.key]; if (tv > 0 && (!best || tv < pl.timers[best])) best = en.key; }); if (best) pl.timers[best] = 0; }
    if ((n = itn(pl, "girouette"))) projs.push({ owner: pl, kind: "bullet", x: pl.x, y: pl.y, vx: dx * 70, vy: dy * 70, dmg: 15 * n * gpw(), pierce: 999, sprite: "windblade", anim: true, life: 2, hit: [], r: 9, explode: 0, rehit: 0.5, elem: "air" });
    if (itn(pl, "pas_ecureuil")) { var t = nearest(1, 90)[0]; if (t) onHitProcs(t); }
    if ((n = itn(pl, "serre_aigle"))) { var st = nearest(1, 130)[0]; if (st) { fx.push({ kind: "beam", x: pl.x, y: pl.y, a: Math.atan2(st.y - pl.y, st.x - pl.x), len: Math.hypot(st.x - pl.x, st.y - pl.y), w: 2, life: 0.2, max: 0.2, col: "232,224,208" }); hurt(st, 80 * n * gpw(), 0, 0); } }
    if (itn(pl, "relais_volte")) { var al = partnerOf(pl); if (al) al.volteCd = Math.max(0, (al.volteCd || 0) - 1); }
  }
  function sigVolte(pl, dx, dy) {
    var sk = pl.sigK || {}, kk = function (kind) { return 1 + 0.25 * ((sk[kind] || 1) - 1); }, el = pl.arme ? armeOf(pl).element : null, hk = HIT_ELEM;
    HIT_ELEM = el;
    if (sk.volteDarts) for (var i = 0; i < 8; i++) { var a = i / 8 * TAU; projs.push({ owner: pl, kind: "bullet", x: pl.x, y: pl.y - 2, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, dmg: 12 * gpw() * kk("volteDarts"), pierce: 2, sprite: "dart", life: 0.6, hit: [], r: 3, explode: 0, elem: "air", fam: "tir" }); }
    if (sk.volteSpin) { fx.push({ kind: "spin", r: 40, life: 0.35, max: 0.35, pl: pl }); near(pl.x, pl.y, 50, function (e) { var d = Math.hypot(e.x - pl.x, e.y - pl.y) || 1; if (d < 40 + e.d.r) hurt(e, 20 * gpw() * kk("volteSpin"), (e.x - pl.x) / d * 120, (e.y - pl.y) / d * 120); }); }
    if (sk.volteRing2) { var bd = techDef(pl, armeOf(pl).base); if (bd && bd.type === "boomerang") projs.push({ owner: pl, kind: "boomerang", x: pl.x, y: pl.y, vx: -dx, vy: -dy, dmg: V(bd, "dmg", 4) * kk("volteRing2"), pierce: 999, sprite: bd.sprite, life: 4, range: V(bd, "range", 4) * pl.area, dist: 0, back: false, chain: 0, zapT: 0, fast: bd.fast, elem: el, fam: "retour" }); }
    if (sk.volteLanterns) for (var j = 0; j < 5; j++) { var la = j / 5 * TAU, tx = pl.x + Math.cos(la) * 46, ty = pl.y + Math.sin(la) * 36; lobs.push({ owner: pl, sx: pl.x, sy: pl.y, tx: tx, ty: ty, t: 0, dur: 0.5 + j * 0.05, dmg: 18 * gpw() * kk("volteLanterns"), rad: 18 * pl.area, frag: 0, sprite: "lampion", elem: "feu" }); }
    if (sk.volteCrabs) for (var c = 0; c < 4; c++) { var ca = c / 4 * TAU + 0.4, cx = pl.x + Math.cos(ca) * 30, cy = pl.y + Math.sin(ca) * 24; fx.push({ kind: "ghost", x: cx, y: cy, life: 0.5, max: 0.5, spr: "crab", face: 1 }); near(cx, cy, 24, function (e) { if (Math.hypot(e.x - cx, e.y - cy) < 14 + e.d.r) hurt(e, 18 * gpw() * kk("volteCrabs"), 0, 0); }); }
    if (sk.volteDive) (pl.comp && Object.keys(pl.comp) || []).forEach(function (cid) { pl.comp[cid].forEach(function (c) { if (c.k !== "blackbird") return; var t = nearest(1, 140, c)[0]; if (t) { c.x = t.x; c.y = t.y - 4; compHit(c, t, 22 * gpw() * kk("volteDive"), 0); } }); });
    HIT_ELEM = hk;
  }
  function crown(pl) { var n = tal(pl, "grandecouronne") ? 20 : 12; for (var i = 0; i < n; i++) { var a = i / n * TAU; projs.push({ owner: pl, kind: "bullet", x: pl.x, y: pl.y - 2, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, dmg: 9, pierce: 1, sprite: "acorn", life: 0.7, hit: [], r: 4, explode: 0 }); } SND.shot(); }
  // paliers de passifs des points d'élément (appelé à chaque coup porté)
  function elemTierHit(e) {
    if (!p.epts || e.dead || e.d.prop) return;
    var k = gpw();
    if ((ept(p, "feu", 3) && Math.random() < 0.15) || (setCount(p, "braise") >= 2 && Math.random() < 0.1)) { if (!(e.burnT > 0)) r.burns = (r.burns || 0) + 1; e.burnT = 3; e.burnD = 3 * k; e.burnBy = p; }
    if (ept(p, "terre", 3) && Math.random() < 0.1 && !e.d.boss) { e.stunT = 0.5; e.slowT = 0.5; e.slow = 1; if (ept(p, "terre", 9)) for (var i = 0; i < 4; i++) { var a = i / 4 * TAU + Math.random(); projs.push({ owner: p, kind: "bullet", x: e.x, y: e.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, dmg: 8 * k, pierce: 1, sprite: "stone", life: 0.4, hit: [e], r: 3, explode: 0 }); } }
    if (ept(p, "eau", 3)) { e.slowT = Math.max(e.slowT, 1); e.slow = Math.max(e.slow || 0, 0.2); if (ept(p, "eau", 6) && Math.random() < 0.08 && !e.d.boss) { e.slowT = 1.2; e.slow = 1; if (ept(p, "eau", 9)) { ring(e.x, e.y, 30, false); near(e.x, e.y, 36, function (o) { if (o !== e && !o.d.prop && Math.hypot(o.x - e.x, o.y - e.y) < 30) hurt2(o, 12 * k); }); } } }
    if (ept(p, "air", 3) && Math.random() < (ept(p, "air", 9) ? 0.2 : 0.1)) { var hk = HIT_ELEM; HIT_ELEM = "air"; zapChain(e, ept(p, "air", 6) ? 3 : 1, 8 * k, { x: e.x, y: e.y - 20 }); HIT_ELEM = hk; }
  }
  function burnTick(e, dt) {
    if (!(e.burnT > 0)) return;
    e.burnT -= dt; e.burnAcc = (e.burnAcc || 0) + dt;
    if (e.burnAcc >= 0.5) {
      e.burnAcc = 0; var pp = p; p = e.burnBy || me; hurt2(e, e.burnD * (1 + 0.5 * itn(p, "tison")) * (setCount(p, "braise") >= 4 && (e.aff || e.d.boss) ? 2 : 1)); burst(e.x, e.y - 3, "#ff7a2a", 2);
      if (ept(p, "feu", 6) && Math.random() < 0.2) near(e.x, e.y, 34, function (o) { if (o !== e && !o.d.prop && !(o.burnT > 0)) { o.burnT = 2; o.burnD = e.burnD; o.burnBy = e.burnBy; } });
      p = pp;
    }
  }
  /* ---- signatures et ultime ---- */
  D.SIGS && Object.keys(D.SIGS).forEach(function (aid) {
    D.SIGS[aid].forEach(function (sg) { ALLW[sg.id] = { name: sg.name, icon: sg.icon, type: "sig", sig: sg.id, family: "melee", desc: [sg.desc, "Plus fort.", "Plus fort.", "Plus fort.", "Au max."] }; });
  });
  BEHAVIOR.sig = function (id, w, l, dt) {
    var k = 1 + 0.25 * l, sg = SIGDEF[id] || {}, kind = sg.kind, el = sg.elem;
    if (kind === "contre") { p.contreCd = Math.max(0, (p.contreCd || 0) - dt); }
    else if (kind === "anvil") { p.anvilCd = Math.max(0, (p.anvilCd || 0) - dt); if (p.anchored && p.anchorT >= 1 && !p.anvilCd && !p.anvilRdy) { p.anvilRdy = true; burst(p.x, p.y - 6, "#c8a060", 5); } }
    else if (kind === "aim") { if (p.anchored) { p.aimAcc = (p.aimAcc || 0) + dt; if (p.aimAcc >= 1) { p.aimAcc = 0; p.aimSt = Math.min(3, (p.aimSt || 0) + 1); } } else p.aimAcc = 0; }
    else if (kind === "fissure") { if (timer(id, 5, dt)) { var fa = aimAngle(80); for (var fi = 1; fi <= 5; fi++) pZone({ x: p.x + Math.cos(fa) * fi * 14, y: p.y + Math.sin(fa) * fi * 11, r: 9, dur: 3, kind: "fire", owner: p, pdmg: 4 * k, elem: "feu" }); SND.crack(); } }
    else if (kind === "flood") { if (timer(id, 20, dt)) { var kf = HIT_ELEM; HIT_ELEM = "eau"; ring(p.x, p.y, 70, false); near(p.x, p.y, 80, function (e) { var d = Math.hypot(e.x - p.x, e.y - p.y) || 1; if (d < 70 + e.d.r) hurt(e, 14 * k, (e.x - p.x) / d * 260, (e.y - p.y) / d * 260); }); HIT_ELEM = kf; SND.boom(); } }
    else if (kind === "string") { if (p.mstate === "mouvement" && p.dir && cooled(p, "fil", 0.25)) { var ba = Math.atan2(-p.dir.y, -p.dir.x); fx.push({ kind: "beam", x: p.x, y: p.y, a: ba, len: 34, w: 1, life: 0.25, max: 0.25, col: "253,243,222" }); lineHit(p.x, p.y, ba, 34, 4, function (e) { hurt(e, 6 * k, 0, 0); }); } }
    else if (kind === "blackbird") { p.merleT = Math.max(0, (p.merleT || 0) - dt); }
    else if (kind === "deflect") { for (var i = hostile.length - 1; i >= 0; i--) { var h = hostile[i]; if (Math.abs(h.x - p.x) < 28 && Math.abs(h.y - p.y) < 28 && Math.hypot(h.x - p.x, h.y - p.y) < 26 && cooled(p, "garde", Math.max(0.15, 0.5 - 0.08 * l))) { burst(h.x, h.y, "#d8e8ff", 3); hostile.splice(i, 1); } } }
    else if (kind === "rain") { if (timer(id, 4, dt)) { var hk = HIT_ELEM; HIT_ELEM = el; var vis = nearest(8, 150); for (var j = 0; j < 5; j++) { var t = vis[j % Math.max(1, vis.length)]; var tx = t ? t.x : p.x + (Math.random() - 0.5) * 120, ty = t ? t.y : p.y + (Math.random() - 0.5) * 90; lobs.push({ owner: p, sx: tx, sy: ty, tx: tx, ty: ty, t: 0, dur: 0.5 + j * 0.08, dmg: 18 * k, rad: 16 * p.area, frag: 0, sprite: el === "air" ? "feather" : el === "eau" ? "bubble" : "arrow", sky: true, elem: el }); } HIT_ELEM = hk; } }
    else if (kind === "anchorThorns") { if (p.anchored && cooled(p, "racine", 1.2)) zones.push({ x: p.x, y: p.y, r: 28, t: 0, dur: 1.4, kind: "thorn", dmg: 5 * k, owner: p }); }
    else if (kind === "orbitBlock") {
      p.st[id] = (p.st[id] || 0) + 3 * dt; var ox = p.x + Math.cos(p.st[id]) * 18, oy = p.y + Math.sin(p.st[id]) * 14;
      fx.push({ kind: "dot", x: ox, y: oy, vx: 0, vy: 0, life: 0.05, color: el === "eau" || id === "sig_remous" ? "#4aa8ff" : "#c8c0b0" });
      for (var q = hostile.length - 1; q >= 0; q--) if (Math.hypot(hostile[q].x - ox, hostile[q].y - oy) < 7) hostile.splice(q, 1);
      near(ox, oy, 12, function (e) { if (Math.hypot(e.x - ox, e.y - oy) < 6 + e.d.r && cooled(e, "pierre", 0.5)) hurt(e, 8 * k, (e.x - p.x), (e.y - p.y)); });
    }
  };
  function ultTick(pl) {
    if (!pl.arme || mastLevel(pl.arme) < 5) return;
    var k0 = pl.ultK === undefined ? r.kills : pl.ultK; pl.ultK = r.kills;
    pl.ultG = Math.min(1, (pl.ultG || 0) + (r.kills - k0) / 120);
    if (pl.ultG < 1) return;
    pl.ultG = 0; var pp = p; p = pl; var k = gpw() * 2, U = D.ULTS[pl.arme], hk = HIT_ELEM; HIT_ELEM = U.elem || HIT_ELEM;
    bannerAll("Ultime : " + U.name + " !"); r.flash = 0.3; if (S.opts.shake) shake = 0.4; SND.fusion();
    if (U.kind === "slash") { enemies.forEach(function (e) { if (!e.dead && !e.d.prop && inView(e, 0)) { fx.push({ kind: "slash", a: Math.random() * TAU, arc: 2, r: 16, life: 0.25, max: 0.25, pl: { x: e.x, y: e.y } }); hurt(e, 40 * k, 0, 0); } }); }
    else if (U.kind === "rain") { for (var i = 0; i < 24; i++) { var tx = pl.x + (Math.random() - 0.5) * W * 0.9, ty = pl.y + (Math.random() - 0.5) * H * 0.9; lobs.push({ owner: pl, sx: tx, sy: ty, tx: tx, ty: ty, t: 0, dur: 0.4 + i * 0.04, dmg: 30 * k, rad: 22, frag: 0, sprite: U.elem === "eau" ? "bubble" : "arrow", sky: true, elem: U.elem }); } }
    else if (U.kind === "nova") { [70, 110, 150].forEach(function (R) { fireNova(R, 34 * k); }); }
    else ultStart(pl, U, k);
    HIT_ELEM = hk;
    p = pp;
  }
  function onScreen() { return enemies.filter(function (e) { return !e.dead && !e.d.prop && !e.under && inView(e, 0); }); }
  // ultimes des 14 nouvelles armes : instantanés ou étalés dans le temps (pl.ultFx)
  function ultStart(pl, U, k) {
    var el = U.elem, add = function (kind, dur, step) { pl.ultFx = pl.ultFx || []; pl.ultFx.push({ kind: kind, t: 0, dur: dur, step: step, acc: step, k: k, el: el }); };
    if (U.kind === "cross") [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach(function (a) { fx.push({ kind: "beam", x: pl.x, y: pl.y, a: a, len: W, w: 8, life: 0.5, max: 0.5, col: "200,160,96" }); lineHit(pl.x, pl.y, a, W, 14, function (e) { hurt(e, 60 * k, 0, 0); if (!e.d.boss) { e.stunT = 1; e.slowT = 1; e.slow = 1; } }); });
    else if (U.kind === "oak") { var a0 = Math.random() * Math.PI, sx = pl.x - Math.cos(a0) * W / 2, sy = pl.y - Math.sin(a0) * W / 2; fx.push({ kind: "beam", x: sx, y: sy, a: a0, len: W, w: 14, life: 0.7, max: 0.7, col: "107,68,48" }); lineHit(sx, sy, a0, W, 24, function (e) { hurt(e, 70 * k, 0, 0); e.burnT = 4; e.burnD = 4 * gpw(); e.burnBy = pl; }); }
    else if (U.kind === "freeze") onScreen().forEach(function (e) { e.stunT = 3; e.slowT = 3; e.slow = 1; hurt(e, 20 * k, 0, 0); burst(e.x, e.y, "#9ee8ff", 4); r.freezes = (r.freezes || 0) + 1; });
    else if (U.kind === "sweep") for (var i = 0; i < 3; i++) { var ga = i / 3 * TAU; projs.push({ owner: pl, kind: "boomerang", x: pl.x, y: pl.y, vx: Math.cos(ga), vy: Math.sin(ga), dmg: 40 * k, pierce: 999, sprite: "nut", life: 5, range: W * 0.45, dist: 0, back: false, chain: 0, zapT: 0, fast: 1, elem: el }); }
    else if (U.kind === "net") onScreen().forEach(function (e) { if (e.d.boss) return; var dx = pl.x - e.x, dy = pl.y - e.y, d = Math.hypot(dx, dy) || 1; if (d > 26) { e.x += dx / d * (d - 24); e.y += dy / d * (d - 24); } hurt(e, 20 * k, 0, 0); });
    else add(U.kind, { darts: 5, pyre: 6, monsoon: 6, bell: 1.7, wheel: 6, colony: 5, lanterns: 6, crabking: 1.9, flock: 1.9 }[U.kind] || 3, { darts: 0.2, pyre: 0.3, monsoon: 0.25, bell: 0.55, wheel: 0.15, colony: 0.25, lanterns: 0.2, crabking: 0.6, flock: 0.6 }[U.kind] || 0.3);
  }
  function ultFxTick(pl, dt) {
    if (!pl.ultFx || !pl.ultFx.length) return;
    var hk = HIT_ELEM;
    for (var i = pl.ultFx.length - 1; i >= 0; i--) {
      var u = pl.ultFx[i]; u.t += dt; u.acc += dt; HIT_ELEM = u.el;
      if (u.kind === "wheel") { var R = 20 + 60 * Math.min(1, u.t / u.dur); fx.push({ kind: "ring", x: pl.x, y: pl.y, r: R, life: 0.05, max: 0.05, col: "255,150,60" }); }
      if (u.kind === "pyre") fx.push({ kind: "ring", x: pl.x, y: pl.y, r: 50, life: 0.05, max: 0.05, col: "255,110,40" });
      while (u.acc >= u.step) {
        u.acc -= u.step; var k = u.k, vis = onScreen();
        if (u.kind === "darts") vis.forEach(function (e) { hurt(e, 6 * k, 0, 0); });
        else if (u.kind === "pyre") near(pl.x, pl.y, 60, function (e) { if (!e.d.prop && Math.hypot(e.x - pl.x, e.y - pl.y) < 50 + e.d.r) { hurt(e, 12 * k, 0, 0); e.burnT = 3; e.burnD = 3 * gpw(); e.burnBy = pl; } });
        else if (u.kind === "monsoon") { vis.forEach(function (e) { applyMark(e, "eau"); }); for (var m = 0; m < 6; m++) { var tx = pl.x + (Math.random() - 0.5) * W * 0.9, ty = pl.y + (Math.random() - 0.5) * H * 0.9; lobs.push({ owner: pl, sx: tx, sy: ty, tx: tx, ty: ty, t: 0, dur: 0.3, dmg: 14 * k, rad: 18, frag: 0, sprite: "raindrop", sky: true, elem: "eau" }); } }
        else if (u.kind === "bell") { ring(pl.x, pl.y, Math.max(W, H) * 0.6, false); vis.forEach(function (e) { hurt(e, 25 * k, 0, 0); if (!e.d.boss) { e.stunT = 1; e.slowT = 1; e.slow = 1; } }); SND.boom(); }
        else if (u.kind === "wheel") { var R2 = 20 + 60 * Math.min(1, u.t / u.dur); near(pl.x, pl.y, R2 + 14, function (e) { var d = Math.hypot(e.x - pl.x, e.y - pl.y); if (!e.d.prop && Math.abs(d - R2) < 12 + e.d.r) hurt(e, 10 * k, 0, 0); }); }
        else if (u.kind === "colony") vis.sort(function () { return Math.random() - 0.5; }).slice(0, 4).forEach(function (e) { fx.push({ kind: "ghost", x: e.x, y: e.y + 2, life: 0.4, max: 0.4, spr: "shrew", face: 1 }); hurt(e, 16 * k, 0, -30); });
        else if (u.kind === "lanterns") vis.sort(function () { return Math.random() - 0.5; }).slice(0, 2).forEach(function (e) { lobs.push({ owner: pl, sx: pl.x, sy: pl.y - 10, tx: e.x, ty: e.y, t: 0, dur: 0.4, dmg: 20 * k, rad: 18, frag: 0, sprite: "lampion", elem: "feu" }); });
        else if (u.kind === "crabking") { if (S.opts.shake) shake = 0.3; vis.forEach(function (e) { hurt(e, 35 * k, 0, 0); }); fx.push({ kind: "ghost", x: pl.x, y: pl.y - 30, life: 0.5, max: 0.5, spr: "crab", face: 1 }); SND.boom(); }
        else if (u.kind === "flock") { var fy = pl.y + (Math.random() - 0.5) * H * 0.6; for (var b = 0; b < 6; b++) fx.push({ kind: "ghost", x: pl.x - W / 2 + b * W / 6, y: fy + (b % 2) * 8, life: 0.5, max: 0.5, spr: "blackbird", face: 1 }); vis.forEach(function (e) { hurt(e, 25 * k, 0, 0); }); }
      }
      if (u.t >= u.dur) pl.ultFx.splice(i, 1);
    }
    HIT_ELEM = hk;
  }
  /* ---- butin de partie : ressources et attirail ---- */
  function lootKill(e) {
    if (e.d.prop || !r.res || isArena()) return;
    var bi = biomeAtTile(Math.floor(e.x / 16), Math.floor(e.y / 16)), list = D.MAP_RES[MAP.id] || D.MAP_RES.clairiere, res = list[bi % list.length];
    var add = function (id, n) { if (isExpe()) bagAddRes(id, n); else r.res[id] = (r.res[id] || 0) + n; };
    if (isExpe() && e.aff && e.aff.indexOf("meneur") >= 0) r.exStats.meneur = true;
    if (isExpe() && e.d.elite && Math.random() < 0.08) { r.ex.keys++; texts.push({ x: e.x, y: e.y - 18, n: "+ CLE", life: 1.2, col: "#f6d36b" }); }
    if (e.d.boss) {
      add(res, 3); var tr = "t_" + (e.type === "colosse" ? "colosse" : e.type); if (D.RES[tr]) { add(tr, e.d.mega ? 2 : 1); texts.push({ x: e.x, y: e.y - 24, n: "+ " + D.RES[tr].name.toUpperCase(), life: 1.6, col: "#f6d36b" }); }
      if (e.d.mega || Math.random() < 0.35) { var q = genPiece(1 + (tierN() >= 4 ? 1 : 0) + (e.d.mega ? 1 : 0), e.d.mega && Math.random() < 0.35 ? randUnique() : undefined); if (isExpe()) bagAddGear(q); else r.loot.push(q); texts.push({ x: e.x, y: e.y - 32, n: "ATTIRAIL : " + D.GEAR[q.t].name.toUpperCase(), life: 2, col: "#b07cf0" }); }
      if (me.ring && me.ring.danger) drop("chest", e.x, e.y + 14, 1);
      if (e.d.mega) { runeAdd(3); runeAdd(1, true); } else if (Math.random() < 0.3) runeAdd(1);
      if (isDungeon() && Math.random() < (e.d.bossAi || e.type === "golem" ? 1 : 0.5)) { var locked = Object.keys(D.SETS).filter(function (k2) { return !D.SETS[k2].mega && !(S.recipes || {})[k2]; }); if (locked.length) { var rc = locked[(Math.random() * locked.length) | 0]; S.recipes = S.recipes || {}; S.recipes[rc] = 1; save(); bannerAll("Recette trouvée : " + D.SETS[rc].name + " !"); } }
      if (me.ring && me.ring.source) players.forEach(function (o) { if (!o.down) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * (me.ring2x ? 0.8 : 0.4)); });
    } else if (e.d.elite) { if (Math.random() < 0.4) add(res, 1); if (Math.random() < (isExpe() && ringOf(e.x, e.y) !== "peri" ? 0.08 : 0.03)) { var q2 = genPiece(isExpe() && ringOf(e.x, e.y) === "coeur" ? 2 : 1, isExpe() && ringOf(e.x, e.y) === "coeur" && Math.random() < 0.2 ? randUnique() : undefined); if (isExpe()) bagAddGear(q2); else r.loot.push(q2); } if (me.ring && me.ring.chasse) dropItem(e.x, e.y, 0); }
    else if (Math.random() < 0.06) add(res, 1);
    if (e.burnT > 0 && e.burnBy && ept(e.burnBy, "feu", 9)) { var pp = p; p = e.burnBy; explode(e.x, e.y, 26, 18 * gpw(), 0); p = pp; }
  }
  function grantRun() {
    if (!r || r.granted) return null; r.granted = true; eqS();
    var cid = me.char.id, aid = me.arme || "katana", out = { res: r.res || {}, loot: [], cxp: 0, mxp: 0 };
    Object.keys(out.res).forEach(function (k) { S.res[k] = (S.res[k] || 0) + out.res[k]; });
    (r.loot || []).forEach(function (q) { if (addPiece(q)) out.loot.push(q); });
    var lvMax = 1; D.CHARACTERS.forEach(function (c) { lvMax = Math.max(lvMax, charLevel(c.id)); });
    var bonus = charLevel(cid) < lvMax ? 1.5 : 1;            // les écureuils moins joués rattrapent les autres
    if (isArena()) { out.res.rune = (out.res.rune || 0) + Math.max(0, r.round - 1); S.res.rune = (S.res.rune || 0) + Math.max(0, r.round - 1); out.res.rune_rare = (out.res.rune_rare || 0) + Math.floor(r.round / 5); S.res.rune_rare = (S.res.rune_rare || 0) + Math.floor(r.round / 5); }
    out.cxp = Math.round((r.kills * 0.3 + r.time / 4 + r.bosses * 20) * bonus);
    out.mxp = Math.round((r.kills * 0.25 + r.time / 5 + r.bosses * 15) * (isArena() ? 1.6 : 1));   // l'Arène : spécialité runes et maîtrise
    out.l0 = charLevel(cid); out.m0 = mastLevel(aid);
    S.clvl[cid] = (S.clvl[cid] || 0) + out.cxp; S.mast[aid] = (S.mast[aid] || 0) + out.mxp;
    out.l1 = charLevel(cid); out.m1 = mastLevel(aid); out.aid = aid; out.cid = cid;
    save(); return out;
  }
  function runSummaryHtml(g) {
    if (!g) return "";
    var res = Object.keys(g.res).filter(function (k) { return g.res[k] > 0; });
    var cl = charLevel(g.cid), cx = S.clvl[g.cid] || 0, c0 = charXpFor(cl), c1 = charXpFor(cl + 1);
    var ml = mastLevel(g.aid), mx = S.mast[g.aid] || 0, m0 = D.MASTERY[ml - 1], m1 = D.MASTERY[ml] || mx;
    var bar = function (lab, l, a, b, up) { var k = b > a ? Math.min(100, Math.round((cxOrM(lab) - a) / (b - a) * 100)) : 100; return '<p class="v2-bar"><span>' + lab + " <b>" + l + "</b>" + (up ? " ⬆" : "") + '</span><span class="rank-bar"><i style="width:' + k + '%"></i></span></p>'; };
    function cxOrM(lab) { return lab.indexOf("Maîtrise") === 0 ? mx : cx; }
    return '<div class="v2-run">' + bar(esc(charById(g.cid).name) + " · niveau", cl, c0, c1, g.l1 > g.l0) + bar("Maîtrise " + esc(D.ARMES[g.aid].name), ml, m0, m1, g.m1 > g.m0) +
      (res.length ? '<p class="game-small">Ressources : ' + res.map(function (k) { return D.RES[k].icon + " " + esc(D.RES[k].name) + " x" + g.res[k]; }).join(" · ") + "</p>" : "") +
      (g.loot.length ? '<p class="game-small">Attirail trouvé : ' + g.loot.map(function (q) { return "<b>" + esc(D.GEAR[q.t].name) + "</b>"; }).join(", ") + " (au terrier)</p>" : "") + "</div>";
  }
  /* =====================================================================
     2.0 phase 5 : l'Expédition (carte d'extraction à étages)
     ===================================================================== */
  var EX = { R: 3000, core: 850, mid: 2000, bag: 12, stack: 20, cell: 200 };
  function isExpe() { return r && r.mode === "expedition"; }
  function exF() { return Math.max(0.55, 1 - 0.1 * ((r.ex ? r.ex.floor : 1) - 1)); }   // 20, 18, 16… minutes
  function exT() { return stageTime() / 60 / exF(); }                                    // minutes « étage 1 »
  function ringOf(x, y) { var d = Math.hypot(x, y); return d < EX.core ? "coeur" : d < EX.mid ? "median" : "peri"; }
  function corrR() { var sp = (r.seveTo && r.ex && r.ex.floor <= r.seveTo ? 0.75 : 1) * (strataN() >= 4 ? 2 : 1); return Math.min(EX.R + 200, 250 + (EX.R - 250) * Math.max(0, (exT() * sp + (nm(3) ? 2 : 0)) / 20)); }
  function genExpe(seed, floor) {
    var rnd = mulberry(seed * 13 + floor * 7919 + 3), A = function () { return rnd() * TAU; }, at = function (a, d) { return { x: Math.round(Math.cos(a) * d), y: Math.round(Math.sin(a) * d) }; };
    var a0 = A(), sp = at(a0, EX.R - 160), list = [];
    function add(k, a, d, extra) { var o = at(a, d); o.k = k; o.p = 0; o.done = false; o.id = k + list.length; Object.keys(extra || {}).forEach(function (q) { o[q] = extra[q]; }); list.push(o); return o; }
    // sorties : toujours visibles ; chaque départ mène à au moins 2 sorties
    add("x_perm", a0 + Math.PI + (rnd() - 0.5) * 0.8, EX.R - 220, { exit: 1 });
    add("x_cle", a0 + 0.9 + rnd() * 0.6, 1900 + rnd() * 700, { exit: 1 });
    add("x_endu", a0 - 0.9 - rnd() * 0.6, 1500 + rnd() * 900, { exit: 1, need: 60 });
    add("x_passeur", a0 + Math.PI * (0.5 + rnd()), 2100 + rnd() * 700, { exit: 1 });
    add("x_mega", A(), 260, { exit: 1, hidden: 1 });
    add("repaire", A(), 0, {});
    for (var i = 0; i < 6; i++) add("camp", A(), EX.core + 150 + rnd() * (EX.mid - EX.core - 200), {});
    for (i = 0; i < 9; i++) add("gisement", A(), EX.core + rnd() * (EX.R - EX.core - 200), {});
    for (i = 0; i < 3; i++) add("tour", a0 + (i - 1) * 1.6 + (rnd() - 0.5) * 0.4, 1300 + rnd() * 1300, {});
    for (i = 0; i < 2; i++) add("nid", A(), EX.core + 200 + rnd() * 800, {});
    for (i = 0; i < 2; i++) add("autelcle", A(), 1200 + rnd() * 1500, {});
    for (i = 0; i < 3; i++) add("source", a0 + i * TAU / 3 + rnd(), 600 + rnd() * 2000, {});
    return { seed: seed, floor: floor, spawn: sp, st: list, seen: {}, passages: [], closed: 0, night: false, keys: 0, megaWon: false, camps: 0, gis: 0 };
  }
  var EXDEF = {
    x_perm:    { name: "Sortie permanente", col: "#9cc56b", t: 2 },
    x_cle:     { name: "Sortie à clé", col: "#f6d36b", t: 1.5 },
    x_endu:    { name: "Sortie d'endurance", col: "#ff8a5a", t: 0 },
    x_passeur: { name: "Sortie du passeur", col: "#6ad8ff", t: 1.5 },
    x_mega:    { name: "Sortie du méga boss", col: "#ff40c0", t: 1.5 },
    repaire:   { name: "Repaire du méga boss", col: "#c8a060", t: 3 },
    camp:      { name: "Camp ennemi", col: "#c8553d", t: 0 },
    gisement:  { name: "Gisement (reste ancré)", col: "#b8a888", t: 3 },
    tour:      { name: "Tour de guet", col: "#e8e0d0", t: 2 },
    nid:       { name: "Nid de boss", col: "#b07cf0", t: 2.5 },
    autelcle:  { name: "Autel de clé", col: "#f6d36b", t: 3 },
    source:    { name: "Source de soin", col: "#6ad8ff", t: 1.2 },
    passage:   { name: "Passage vers l'étage suivant", col: "#b07cf0", t: 3 },
  };
  function passeurCost() { return Math.round((60 + 40 * r.ex.floor) * (nm(7) ? 2 : 1) * (anyItem("sceau_passeur") ? 0.5 : 1)); }
  function bagCap() { return EX.bag + 2 * Math.min(1, (me && itn(me, "sacoche")) || 0); }
  /* ---- le sac ---- */
  function bagSlots() { return r.bag.length; }
  function bagAddRes(id, n) {
    var left = n;
    r.bag.forEach(function (b) { if (left > 0 && b.k === "res" && b.id === id && b.n < EX.stack) { var a = Math.min(left, EX.stack - b.n); b.n += a; left -= a; } });
    while (left > 0 && r.bag.length < bagCap()) { var a2 = Math.min(left, EX.stack); r.bag.push({ k: "res", id: id, n: a2 }); left -= a2; }
    if (left > 0 && cooledG("bagfull", 3)) banner("Sac plein !");
    return n - left;
  }
  function bagAddGear(q) { if (r.bag.length >= bagCap()) { if (cooledG("bagfull", 3)) banner("Sac plein !"); return false; } r.bag.push({ k: "gear", q: q }); return true; }
  var gcool = {};
  function cooledG(k, t) { if ((gcool[k] || 0) > r.time) return false; gcool[k] = r.time + t; return true; }
  function bagValue(list) { var v = 0; (list || r.bag).forEach(function (b) { v += b.k === "gear" ? 25 * (b.q.tier || 1) : (D.RES[b.id] && D.RES[b.id].trophy ? 10 : 1) * b.n; }); return v; }
  function entryName(b) { return b.k === "gear" ? D.GEAR[b.q.t].name : D.RES[b.id].name + " x" + b.n; }
  /* ---- début, étages, descente ---- */
  function startExpe(floor, seed) {
    var keys = r.ex ? r.ex.keys : 0;
    r.ex = genExpe(seed || ((Math.random() * 1e9) | 0), floor || 1); r.ex.keys = keys;
    r.stageT0 = r.time; r.portal = null; r.mega = null;
    var sp = r.ex.spawn;
    players.forEach(function (pl, k) { pl.x = pl.tx = sp.x + k * 16; pl.y = pl.ty = sp.y; });
    enemies = []; projs = []; hostile = []; lobs = []; warns = []; gems = []; zones = [];
    shrineCache = {}; r.sh = {};
    bannerAll("Étage " + r.ex.floor + " : explore, remplis ton sac, puis sors ou descends");
  }
  function expeTick(dt) {
    var ex = r.ex, t = exT(), f = exF();
    // brouillard de guerre
    if (cooledG("fog", 0.25)) revealAt(me.x, me.y, 260 * (me.vigieX > 1 ? 1.6 : 1) * (me.ring && me.ring.tenebres ? 0.6 : 1) * (strataN() >= 1 ? 0.8 : 1));
    // nuit à la minute 8
    if (ex.night && t >= 10 && !r.nightDone) r.nightDone = 1;
    if (t >= 18) r.min18 = 1;
    if (!ex.night && t >= 8) { ex.night = true; bannerAll("La nuit tombe : on voit moins loin, les Rôdeurs sortent"); SND.boom(); }
    // les passages apparaissent vers la minute 10 (au repaire, il faut battre le méga boss)
    var lair = ex.floor % 3 === 0;
    if (!ex.passages.length && t >= 10 && (!lair || ex.megaWon)) {
      var keys = D.MAPS.map(function (m) { return m.id; }).sort(function () { return Math.random() - 0.5; });
      for (var i = 0; i < 2; i++) { var a = Math.random() * TAU, d = EX.core + 300 + Math.random() * 600; ex.passages.push({ k: "passage", x: Math.round(Math.cos(a) * d), y: Math.round(Math.sin(a) * d), p: 0, st: 0, region: keys[i], loot: i ? "attirail" : "ressources", id: "pass" + i }); }
      bannerAll("Deux passages vers l'étage " + (ex.floor + 1) + " sont apparus !"); SND.fusion();
    }
    if (lair && !ex.passages.length && t >= 10 && cooledG("lairmsg", 60)) banner("Étage du repaire : bats le méga boss au cœur pour descendre");
    // à partir de la minute 12, une sortie se ferme toutes les 2 minutes
    var shouldClose = t < 12 ? 0 : 1 + Math.floor((t - 12) / 2);
    while (shouldClose > ex.closed) {
      var open = ex.st.filter(function (s) { return s.exit && !s.closedX && s.k !== "x_perm" && !s.hidden; });
      if (open.length) { var c = open[(Math.random() * open.length) | 0]; c.closedX = true; bannerAll(EXDEF[c.k].name + " se ferme !"); SND.crack(); }
      ex.closed++;
    }
    // structures
    ex.st.concat(ex.passages).forEach(function (s) { structTick(s, dt); });
    // limite de la carte
    players.forEach(function (pl) { var d = Math.hypot(pl.x, pl.y); if (d > EX.R) { pl.x *= EX.R / d; pl.y *= EX.R / d; } });
    expeDirector(dt);
  }
  function revealAt(x, y, rad) {
    var c = EX.cell, n = Math.ceil(rad / c);
    for (var i = -n; i <= n; i++) for (var j = -n; j <= n; j++) { var gx = Math.floor(x / c) + i, gy = Math.floor(y / c) + j; if (Math.hypot((gx + 0.5) * c - x, (gy + 0.5) * c - y) < rad + c * 0.5) r.ex.seen[gx + "," + gy] = 1; }
  }
  function seenAt(x, y) { return !!r.ex.seen[Math.floor(x / EX.cell) + "," + Math.floor(y / EX.cell)]; }
  function structTick(s, dt) {
    if (s.done || s.closedX || s.hidden) return;
    var pl = me, d = Math.hypot(pl.x - s.x, (pl.y - s.y) * 1.25), inside = !pl.down && d < 26, def = EXDEF[s.k];
    if (s.k === "camp") {
      if (!s.woke && d < 260) { s.woke = true; s.ids = spawnCamp(s); }
      if (s.woke && s.ids && s.ids.every(function (e) { return e.dead; })) { s.done = true; r.ex.camps++; r.exStats.camps = (r.exStats.camps || 0) + 1; drop("chest", s.x, s.y, 1); dropItem(s.x + 12, s.y, 0); if (Math.random() < 0.6) bagAddGear(genPiece(1 + (ringOf(s.x, s.y) === "coeur" ? 1 : 0))); bannerAll("Camp nettoyé !"); SND.fusion(); }
      return;
    }
    if (s.k === "x_endu") {
      if (inside) { if (!s.run) { s.run = true; bannerAll("Tiens 60 s dans la zone !"); } s.p = Math.min(1, s.p + dt / s.need); if (cooledG("endu", 3.5)) spawnSquad({ nuee: 8, chargeur: 1, tireur: 1 }, me); if (s.p >= 1) extract(s); }
      return;
    }
    if (s.k === "gisement" && !pl.anchored) inside = false;
    if (s.k === "passage" && s.st === 1) { if (!s.boss || s.boss.dead) { s.st = 2; s.p = 0; bannerAll("Le passage est ouvert : entre pour descendre"); } return; }
    s.p = inside ? Math.min(1, s.p + dt * (s.k === "gisement" && itn(pl, "pelle") ? 2 : 1) / (def.t || 1)) : Math.max(0, s.p - dt * 0.6);
    if (s.p < 1) return;
    s.p = 0;
    if (s.k === "x_perm") extract(s);
    else if (s.k === "x_cle") { if (r.ex.keys > 0) { r.ex.keys--; extract(s); } else if (cooledG("nokey", 2)) banner("Il faut une clé (élites, autels de clé)"); }
    else if (s.k === "x_passeur") { var c = passeurCost(); if (r.gold >= c) { r.gold -= c; r.exStats.passeur = true; extract(s); } else if (cooledG("pass", 2)) banner("Le passeur veut " + c + " glands"); }
    else if (s.k === "x_mega") extract(s);
    else if (s.k === "repaire") { s.done = true; var po = { x: s.x, y: s.y + 80 }; wakeMega(po); r.ex.megaBoss = r.mega && r.mega.boss; }
    else if (s.k === "gisement") { s.done = true; var list = D.MAP_RES[MAP.id] || D.MAP_RES.clairiere, n = 3 + ((Math.random() * 3) | 0); bagAddRes(list[(Math.random() * list.length) | 0], n); r.ex.gis++; r.exStats.gis = (r.exStats.gis || 0) + 1; texts.push({ x: s.x, y: s.y - 20, n: "+" + n + " RESSOURCES", life: 1.2, col: "#e8d090" }); SND.gold(); }
    else if (s.k === "tour") { s.done = true; revealAt(s.x, s.y, 1400); bannerAll("Tour de guet : la région se dévoile"); SND.level(); }
    else if (s.k === "nid") { s.done = true; var bt = MAP.bosses[(Math.random() * MAP.bosses.length) | 0], b = spawnAt(bt, s.x, s.y - 50); b.awake = true; bossCount++; bannerAll(D.ENEMIES[bt].name + " sort de son nid !"); SND.boom(); }
    else if (s.k === "autelcle") { s.done = true; r.ex.keys++; spawnSquad({ chargeur: 2, tireur: 2, nuee: 6 }, me); bannerAll("Clé obtenue ! (" + r.ex.keys + ")"); SND.fusion(); }
    else if (s.k === "source") { s.done = true; players.forEach(function (o) { if (!o.down) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.5); }); bannerAll("L'eau claire te soigne"); SND.level(); }
    else if (s.k === "passage") {
      if (s.st === 0) { s.st = 1; var po2 = { x: s.x, y: s.y }; wakeGuardian(po2); s.boss = po2.boss; r.portal = null; }
      else if (s.st === 2) securePrompt(s);
    }
  }
  function spawnCamp(s) {
    var ring = ringOf(s.x, s.y), sq = ring === "coeur" ? { bouclier: 2, tireur: 3, soutien: 1, nuee: 6 } : { chargeur: 2, tireur: 2, nuee: 5 };
    var out = spawnSquad(sq, { x: s.x, y: s.y }, 1);
    out.forEach(function (e) { e.camp = true; e.awake = true; });
    if (out.length) giveAffixes(out[0], ring === "coeur" ? 2 : 1);
    return out;
  }
  function expeDirector(dt) {
    var ring = ringOf(me.x, me.y), base = { peri: 0.9, median: 1.8, coeur: 3 }[ring];
    var corr = Math.hypot(me.x, me.y) < corrR() ? 1.6 : 1;
    var rate = base * corr * (1 + 0.15 * tierN()) * DIFF.spawn;
    squadDirector(dt, rate);
    if (r.ex.night && Math.random() < dt * 0.15) spawnSquad({ rodeur: 2 });
  }
  // un objet mis à l'abri par descente, sur l'autel du passage
  function securePrompt(s) {
    r.ex.pend = s; state = "levelup"; clearInput();
    var cap = 1 + ((S.secureSlots) || 0), free = cap - r.secure.length;
    var html = '<span class="kicker">Autel du passage</span><h2>Mettre un objet à l\'abri ?</h2><p class="game-small">Ce qui est à l\'abri n\'est jamais perdu, même si tu meurs. Emplacements : ' + r.secure.length + " / " + cap + '.</p><div class="choices">';
    if (free > 0) r.bag.forEach(function (b, i) { html += '<button type="button" class="choice" data-action="xsecure" data-arg="' + i + '"><span class="choice-key">' + (i + 1) + '</span><span class="choice-text"><strong>' + esc(entryName(b)) + "</strong><span>" + (b.k === "gear" ? esc(pieceDesc(b.q)) : esc(D.RES[b.id].icon)) + "</span></span></button>"; });
    html += '</div><div class="btn-row center"><button class="btn" type="button" data-action="xsecure" data-arg="-1">Descendre sans rien mettre</button></div>';
    showCard(html, "secure");
  }
  function descend(region) {
    var ex = r.ex;
    r.exStats.depth = ex.floor + 1;
    for (var sb = 0; sb < ((me && itn(me, "sablier_inverse")) || 0) && r.bag.length; sb++) r.secure.push(r.bag.pop());
    enterMap(region, (r.stage || 0) + 1, r.time);
    startExpe(ex.floor + 1);
    players.forEach(function (pl) { if (pl.down) { pl.down = false; pl.hp = pl.maxHp * 0.5; } });
    S.stats.bestDepth = Math.max(S.stats.bestDepth || 1, r.ex.floor); save();
  }
  // extraction : on garde tout le sac
  function extract(s) {
    if (r.ended) return;
    var mul = s.k === "x_mega" ? 1.5 : 1; r.bagFull = r.bag.length >= bagCap();
    r.extracted = { how: EXDEF[s.k].name, mul: mul };
    r.won = true;
    gameOver(false, "Extraction réussie : " + EXDEF[s.k].name + " !");
  }
  // fin d'expédition : le sac passe au camp (extraction) ou est perdu (mort), sauf ce qui est à l'abri
  function expeSettle() {
    if (!isExpe() || r.settled) return null; r.settled = true;
    if (r.extracted) S.stats.extracts = (S.stats.extracts || 0) + 1;
    if (r.nightDone) S.stats.nights = (S.stats.nights || 0) + 1;
    var keep = (r.extracted ? r.bag : []).concat(r.secure), mul = r.extracted ? r.extracted.mul : 1;
    keep.forEach(function (b) { if (b.k === "gear") r.loot.push(b.q); else r.res[b.id] = (r.res[b.id] || 0) + Math.round(b.n * mul); });
    var done = [];
    if (r.extracted) (S.contracts && S.contracts.taken || []).forEach(function (c) { if (contractOk(c)) { done.push(c); Object.keys(c.rew.res || {}).forEach(function (k) { r.res[k] = (r.res[k] || 0) + c.rew.res[k]; }); earnGold(c.rew.gold || 0); } });
    if (S.contracts) { S.contracts.taken = []; S.contracts.offers = []; }
    return { extracted: !!r.extracted, lost: r.extracted ? 0 : r.bag.length, value: bagValue(keep), done: done, depth: r.ex.floor };
  }
  /* ---- contrats (tableau du sentier) ---- */
  function genContracts() {
    S.contracts = S.contracts || { offers: [], taken: [] };
    if (S.contracts.offers.length) return;
    var resK = Object.keys(D.RES).filter(function (k) { return !D.RES[k].trophy; }), out = [];
    var pool = [
      function () { var k = resK[(Math.random() * resK.length) | 0]; return { k: "bring", res: k, n: 6, txt: "Rapporte 6 " + D.RES[k].name + " (" + mapById(D.RES[k].map).name + ")" }; },
      function () { return { k: "camps", n: 2, txt: "Nettoie 2 camps ennemis" }; },
      function () { return { k: "gis", n: 3, txt: "Vide 3 gisements" }; },
      function () { return { k: "passeur", txt: "Sors par le passeur" }; },
      function () { return { k: "depth", n: 2, txt: "Atteins l'étage 2" }; },
      function () { return { k: "meneur", txt: "Tue une élite Meneur" }; },
    ];
    pool.sort(function () { return Math.random() - 0.5; }).slice(0, 4).forEach(function (f, i) {
      var c = f(); c.id = "c" + Date.now() + i; var rk = resK[(Math.random() * resK.length) | 0], rew = {}; rew[rk] = 5;
      c.rew = { res: rew, gold: 150 + 50 * i }; c.from = ["Bûche", "Charbon", "Flocon", "le Marchand"][i % 4]; out.push(c);
    });
    S.contracts.offers = out; save();
  }
  function contractOk(c) {
    var st = r.exStats || {};
    if (c.k === "bring") { var n = 0; r.bag.forEach(function (b) { if (b.k === "res" && b.id === c.res) n += b.n; }); return n >= c.n; }
    if (c.k === "camps") return (st.camps || 0) >= c.n;
    if (c.k === "gis") return (st.gis || 0) >= c.n;
    if (c.k === "passeur") return !!st.passeur;
    if (c.k === "depth") return (r.ex.floor || 1) >= c.n;
    if (c.k === "meneur") return !!st.meneur;
    return false;
  }
  /* ---- rendu ---- */
  function drawExpe(cx, cy) {
    var ex = r.ex; if (!ex) return;
    // corruption : part du cœur et gagne les bords
    var cr = corrR();
    ctx.fillStyle = "rgba(120,30,140,.12)"; ctx.beginPath(); ctx.arc(0, 0, cr, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(180,60,200,.5)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, cr, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(20,10,10,.55)"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, EX.R + 3, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;
    ex.st.concat(ex.passages).forEach(function (s) {
      if (s.hidden || Math.abs(s.x - me.x) > W || Math.abs(s.y - me.y) > H) return;
      var def = EXDEF[s.k], x = s.x, y = s.y, dead = s.done || s.closedX, col = dead ? "#6a625a" : def.col;
      ctx.fillStyle = "rgba(20,14,10,.3)"; ctx.beginPath(); ctx.ellipse(x, y, 26, 21, 0, 0, TAU); ctx.fill();
      if (!dead && s.p > 0) { ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, 26, 21, 0, -Math.PI / 2, -Math.PI / 2 + s.p * TAU); ctx.stroke(); ctx.lineWidth = 1; }
      ctx.fillStyle = "#2b1709"; ctx.fillRect(x - 6, y - 22, 12, 22); ctx.fillStyle = col; ctx.fillRect(x - 5, y - 21, 10, 20);
      if (s.exit || s.k === "passage") { ctx.fillStyle = "#1a120c"; ctx.fillRect(x - 3, y - 16, 6, 15); ctx.fillStyle = col; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(r.time * 5); ctx.fillRect(x - 2, y - 15, 4, 13); ctx.globalAlpha = 1; }
      if (Math.hypot(me.x - x, me.y - y) < 90) {
        var lab = def.name + (s.k === "x_passeur" ? " " + passeurCost() : s.k === "passage" ? " · " + mapById(s.region).name + " · " + s.loot : "") + (s.closedX ? " (fermée)" : s.done ? " (fait)" : "");
        drawText(lab, x, y - 34, col, "c");
      }
    });
  }
  function drawFog(cx, cy) {
    if (!r.ex) return;
    var c = EX.cell;
    ctx.fillStyle = "rgba(8,6,12,.62)";
    for (var gx = Math.floor(cx / c); gx * c < cx + W; gx++) for (var gy = Math.floor(cy / c); gy * c < cy + H; gy++) if (!r.ex.seen[gx + "," + gy]) ctx.fillRect(gx * c - cx, gy * c - cy, c, c);
    if ((r.ex.night && !itn(me, "lampe_huile")) || (me.ring && me.ring.tenebres)) {
      var g = ctx.createRadialGradient(me.x - cx, me.y - cy, 40, me.x - cx, me.y - cy, 150);
      g.addColorStop(0, "rgba(5,5,20,0)"); g.addColorStop(1, "rgba(5,5,20,.6)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
  }
  function drawExpeHud() {
    var ex = r.ex, x0 = 4, y0 = H - 52, S0 = 46, k = S0 / 2 / EX.R, mx = x0 + S0 / 2, my = y0 + S0 / 2;
    ctx.fillStyle = "rgba(20,14,10,.75)"; ctx.beginPath(); ctx.arc(mx, my, S0 / 2 + 1, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(180,60,200,.7)"; ctx.beginPath(); ctx.arc(mx, my, Math.min(S0 / 2, corrR() * k), 0, TAU); ctx.stroke();
    ctx.strokeStyle = "rgba(253,243,222,.25)"; ctx.beginPath(); ctx.arc(mx, my, EX.core * k, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(mx, my, EX.mid * k, 0, TAU); ctx.stroke();
    ex.st.concat(ex.passages).forEach(function (s) {
      if (s.hidden || (!s.exit && s.k !== "passage" && !seenAt(s.x, s.y))) return;
      ctx.fillStyle = s.done || s.closedX ? "#6a625a" : EXDEF[s.k].col; ctx.fillRect(Math.round(mx + s.x * k) - 1, Math.round(my + s.y * k) - 1, s.exit || s.k === "passage" ? 3 : 2, s.exit || s.k === "passage" ? 3 : 2);
    });
    if (((r.time * 4) | 0) % 2) { ctx.fillStyle = "#fdf3de"; ctx.fillRect(Math.round(mx + me.x * k) - 1, Math.round(my + me.y * k) - 1, 3, 3); }
    var t = exT(), nxt = t < 8 ? "NUIT " + fmtTime((8 - t) * 60 * exF()) : t < 10 ? "PASSAGE " + fmtTime((10 - t) * 60 * exF()) : t < 12 ? "SORTIES " + fmtTime((12 - t) * 60 * exF()) : "SORTIES SE FERMENT";
    drawText("ETAGE " + ex.floor + " · SAC " + r.bag.length + "/" + bagCap() + " · VALEUR " + bagValue() + (ex.keys ? " · CLES " + ex.keys : "") + (r.secure.length ? " · ABRI " + r.secure.length : ""), x0, y0 - 17, "#f6d36b", "l");
    drawText(nxt, x0, y0 - 9, t >= 12 ? "#ff5a3a" : "#fdf3de", "l");
  }
  /* ---------- 2.0 phase 6 : règles uniques des 7 nouveaux écureuils, Cauchemar ---------- */
  function cN() { return (r && r.cauch) || 0; }
  function nm(n) { return cN() >= n; }
  function charTick(pl, dt) {
    if (pl.down || pl.twin) return;
    var cid = pl.char.id, ps = pl.posture, k = gpw(), pp = p; p = pl;
    if (cid === "cendrine") cendrineTick(pl, dt, k);
    else if (cid === "druide") druideTick(pl, dt, k);
    else if (cid === "pataud") pataudTick(pl, dt, k);
    else if (cid === "mage") mageTick(pl, dt, k);
    else if (cid === "ninja") ninjaTick(pl, dt, k);
    else if (cid === "trefle") { if (pl.luck0 === undefined) pl.luck0 = pl.luck; pl.luck = pl.luck0 * (1 + (pl.luckX || 0)); if (ps === "portebonheur") pl.luckX = pl.anchored ? Math.min(tal(pl, "portebonheur_t1") ? 2 : 1, (pl.luckX || 0) + dt * 0.2) : Math.max(0, (pl.luckX || 0) - dt * 0.3); }
    else if (cid === "jumeaux") twinsTick(pl, dt, k);
    p = pp;
  }
  /* Cendrine : coups étalés sur 4 s, champ de force */
  function cendrineTick(pl, dt, k) {
    var hadDebt = pl.debt > 0;
    if (pl.debt > 0) { var d = Math.min(pl.debt, pl.debtRate * dt); pl.debt -= d; pl.hp -= d; if (pl.hp <= 0 && !pl.god) { pl.hp = 0.01; damageRaw(pl, 999); } }
    if (hadDebt && !(pl.debt > 0.01) && setCount(pl, "granit") >= 3) { pl.debt = 0; ring(pl.x, pl.y, 60, false); near(pl.x, pl.y, 70, function (e) { var dd = Math.hypot(e.x - pl.x, e.y - pl.y) || 1; if (!e.d.prop && dd < 60 + e.d.r) { e.kx += (e.x - pl.x) / dd * 240; e.ky += (e.y - pl.y) / dd * 240; hurt(e, 10 * k, 0, 0); } }); }
    var ps = pl.posture, R0 = 18;
    if (ps === "rempart") {
      var grow = tal(pl, "rempart_t1") && pl.anchorT > 2 ? 2 : 1;
      if (pl.anchored) pl.field = Math.min(44, (pl.field || R0) + dt * 14 * grow);
      else if (!(tal(pl, "rempart_t2") && pl.runT < 1) && !tal(pl, "rempart_t4")) pl.field = Math.max(14, (pl.field || R0) - dt * 30);
      if (tal(pl, "rempart_t3") && !pl.anchored && pl.field > 30 && !pl.fort) pl.fort = { x: pl.x, y: pl.y, R: pl.field, t: 10 };
    } else pl.field = R0;
    if (pl.fort) { pl.fort.t -= dt; if (pl.fort.t <= 0) pl.fort = null; }
    // le champ repousse les ennemis et, ancré en Rempart, arrête les tirs
    var fields = [{ x: pl.x, y: pl.y, R: (pl.field || R0) * (pl.anchored ? 1 + gv(pl, "gra_c") / 100 : 1) }]; if (pl.fort) fields.push(pl.fort);
    fields.forEach(function (f) {
      near(f.x, f.y, f.R + 10, function (e) { if (e.d.boss || e.d.prop) return; var dx = e.x - f.x, dy = e.y - f.y, dd = Math.hypot(dx, dy) || 1; if (dd < f.R + e.d.r) { e.kx += dx / dd * 60; e.ky += dy / dd * 60; if (cooled(e, "fld", 0.5)) hurt(e, 3 * k, 0, 0); } });
      if (ps === "rempart" && (pl.anchored || f !== fields[0])) for (var i = hostile.length - 1; i >= 0; i--) if (Math.hypot(hostile[i].x - f.x, hostile[i].y - f.y) < f.R) hostile.splice(i, 1);
    });
    if (ps === "belier") {
      var mx = tal(pl, "belier_t3") ? 2 : 1;
      if (pl.mstate === "mouvement" || pl.anchored) pl.elan = Math.min(mx, (pl.elan || 0) + dt * (pl.anchored ? 0.5 : 0.35));
      else pl.elan = Math.max(0, (pl.elan || 0) - dt * (tal(pl, "belier_t1") ? 0.25 : 0.5));
      if (pl.mstate === "mouvement" && pl.elan > 0.3) near(pl.x, pl.y, 18, function (e) { if (Math.hypot(e.x - pl.x, e.y - pl.y) < 10 + e.d.r && cooled(e, "bel", 0.4)) hurt(e, 18 * pl.elan * k * (tal(pl, "belier_t2") ? 1.5 : 1), (e.x - pl.x) * 6, (e.y - pl.y) * 6); });
    }
    if (ps === "carapace" && pl.anchored && tal(pl, "carapace_t3") && cooled(pl, "herisson", 1.5)) needles(pl, 10, 10 * k);
  }
  function needles(pl, n, dmg) { for (var i = 0; i < n; i++) { var a = i / n * TAU; projs.push({ owner: pl, kind: "bullet", x: pl.x, y: pl.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, dmg: dmg, pierce: 2, sprite: "needle", life: 0.5, hit: [], r: 3, explode: 0 }); } }
  // Cendrine : les coups reçus deviennent une dette remboursée sur 4 s
  function damageRaw(pl, n) { pl.hp -= n; }
  /* Fougère : noisettes plantées → pousses → arbres qui attaquent */
  function treeMax(pl) { return (pl.posture === "semeuse" ? 8 : 4) + (tal(pl, "jardiniere_t3") || tal(pl, "ronceraie_t3") ? 3 : 0) + (tal(pl, "semeuse_t3") ? 6 : 0); }
  function plant(pl, weak) {
    pl.trees = pl.trees || [];
    if (pl.trees.length >= treeMax(pl)) pl.trees.shift();
    pl.trees.push({ x: pl.x + (Math.random() - 0.5) * 8, y: pl.y + 6, age: 0, grow: tal(pl, "semeuse_t4") ? 1 : tal(pl, "jardiniere_t1") ? 1.5 : 3, weak: !!weak, cd: 0.5 });
    burst(pl.x, pl.y + 6, "#6b4430", 4);
  }
  function druideTick(pl, dt, k) {
    var ps = pl.posture; pl.trees = pl.trees || [];
    if (pl.anchored && cooled(pl, "plant", ps === "semeuse" ? 1.2 : 2.4)) plant(pl, false);
    if (ps === "semeuse" && pl.mstate === "mouvement") { pl.seedD = (pl.seedD || 0) + Math.hypot(pl.x - (pl.sx0 || pl.x), pl.y - (pl.sy0 || pl.y)); if (pl.seedD > (tal(pl, "semeuse_t1") ? 45 : 70)) { pl.seedD = 0; plant(pl, true); } }
    pl.sx0 = pl.x; pl.sy0 = pl.y;
    var range = tal(pl, "jardiniere_t4") ? 220 : 110;
    pl.trees.forEach(function (t) {
      t.age += dt * (pl.anchored && gv(pl, "syl_c") ? 1 + gv(pl, "syl_c") / 100 : 1); if (t.age < t.grow) return;
      t.cd -= dt;
      if (ps === "jardiniere" && Math.hypot(pl.x - t.x, pl.y - t.y) < 44) pl.hp = Math.min(pl.maxHp, pl.hp + dt * (tal(pl, "jardiniere_t2") ? 2 : 1));
      if (t.cd > 0) return;
      var tg = nearest(1, range, t)[0]; if (!tg) return;
      t.cd = (ps === "ronceraie" ? 1.0 : 1.3) * (tal(pl, "ronceraie_t4") ? 0.5 : 1);
      var a = Math.atan2(tg.y - t.y + 6, tg.x - t.x), dmg = (t.weak ? 6 : 10) * k * (tal(pl, "semeuse_t2") && t.weak ? 1.5 : 1) * (ps === "ronceraie" ? (tal(pl, "ronceraie_t1") ? 1.8 : 1.2) : 1);
      var nS = ps === "ronceraie" ? 3 : 1;
      for (var i = 0; i < nS; i++) projs.push({ owner: pl, tree: 1, kind: "bullet", x: t.x, y: t.y - 8, vx: Math.cos(a + (i - (nS - 1) / 2) * 0.25) * 150, vy: Math.sin(a + (i - (nS - 1) / 2) * 0.25) * 150, dmg: dmg, pierce: 1, sprite: ps === "ronceraie" ? "needle" : "leaf", life: range / 150, hit: [], r: 4, explode: 0, elem: "terre" });
      if (tal(pl, "ronceraie_t2") && Math.random() < 0.3) zones.push({ x: tg.x, y: tg.y, r: 16, t: 0, dur: 2, kind: "thorn", dmg: 4 * k, owner: pl });
    });
  }
  /* Pataud : grossit en mangeant l'XP, la Volte recrache tout */
  function pataudTick(pl, dt, k) {
    var mx = tal(pl, "goinfre_t3") ? 3 : 2.2, sz = Math.min(mx, pl.size || 1);
    pl.size = sz; pl.sizeHp = (sz - 1) * (tal(pl, "goinfre_t1") ? 1.5 : 1);
    if (pl.posture === "goinfre" && pl.anchored) pl.hp = Math.min(pl.maxHp, pl.hp + dt * (tal(pl, "goinfre_t2") ? 2 : 1));
    var cm = (pl.posture === "rouleau" && pl.mstate === "mouvement" ? 2 : 1) * (tal(pl, "rouleau_t1") ? 1.5 : 1);
    if (sz > 1.15) near(pl.x, pl.y, 12 * sz + 8, function (e) { if (Math.hypot(e.x - pl.x, e.y - pl.y) < 6 * sz + e.d.r && cooled(e, "pat", 0.45)) { hurt(e, 8 * sz * k * cm, (e.x - pl.x) * 4, (e.y - pl.y) * 4); if (tal(pl, "rouleau_t3")) { e.stunT = 0.6; e.slowT = 0.6; e.slow = 1; } if (e.dead && (tal(pl, "goinfre_t4") || tal(pl, "rouleau_t4"))) pl.size += 0.02; } });
  }
  function pataudSpit(pl, dx, dy) {
    var sz = pl.size || 1, n = Math.round(4 + (sz - 1) * 22) * (tal(pl, "canon_t1") ? 2 : 1), k = gpw(), dir = pl.posture === "canon";
    for (var i = 0; i < n; i++) {
      var a = dir ? Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.6 : i / n * TAU, sp = 150 + Math.random() * 60;
      projs.push({ owner: pl, kind: "bullet", x: pl.x, y: pl.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: 10 * k * (dir ? 1.5 : 1), pierce: tal(pl, "canon_t2") ? 3 : 1, sprite: "acorn", life: 0.8, hit: [], r: 4, explode: tal(pl, "canon_t3") ? 14 : 0, elem: pl.spitFire ? "feu" : undefined });
    }
    pl.spitFire = false;
    if (setCount(pl, "glouton") >= 3) { pl.hp = Math.min(pl.maxHp, pl.hp + 2 * n); players.forEach(function (o) { if (o !== pl && !o.down && Math.hypot(o.x - pl.x, o.y - pl.y) < 60) o.hp = Math.min(o.maxHp, o.hp + n); }); }
    pl.size = tal(pl, "canon_t4") ? 1 + (sz - 1) / 2 : 1; SND.boom();
  }
  /* Myrtille : la jauge de sève */
  function mageTick(pl, dt, k) {
    var ps = pl.posture, eco = tal(pl, ps + "_t2") && ps !== "instable" ? 0.7 : 1;
    pl.sap = pl.sap === undefined ? 60 : pl.sap;
    if (pl.surge > 0 && pl.surge - dt <= 0 && setCount(pl, "sevevive") >= 3) { explode(pl.x, pl.y, 50, 100 * k, 0); bannerAll("Explosion de sève !"); }
    if (pl.surge > 0) { pl.surge -= dt; if (ps === "instable" && cooled(pl, "inst", tal(pl, "instable_t4") ? 0.35 : 0.7)) { var a = Math.random() * TAU, d = 20 + Math.random() * 50; explode(pl.x + Math.cos(a) * d, pl.y + Math.sin(a) * d, 22, 18 * k * (tal(pl, "instable_t2") ? 1.6 : 1), 0); if (tal(pl, "instable_t3")) pl.sap = Math.min(100, pl.sap + 5); } }
    else if (pl.anchored) pl.sap += dt * 28 * (tal(pl, "canalisatrice_t1") ? 2 : 1) * (1 + gv(pl, "sev_c") / 100);
    else if (ps === "vagabonde" && pl.mstate === "mouvement") pl.sap += dt * 9 * (tal(pl, "vagabonde_t1") ? 2 : 1);
    else pl.sap -= dt * 7 * eco;
    pl.sap = Math.max(0, Math.min(100, pl.sap));
    if (!(pl.surge > 0) && pl.sap >= (tal(pl, "instable_t1") ? 80 : 100)) { pl.surge = ps === "canalisatrice" ? 8 : 4; pl.sap = 50; bannerAll("Surcharge !"); SND.fusion(); }
    var dry = pl.sap <= 0 && !(pl.surge > 0);
    pl.cadX *= pl.surge > 0 ? 0.7 : dry ? (tal(pl, "canalisatrice_t4") || gv(pl, "sev_b") ? 1.3 : 2) : 1;
    pl.dmgX *= pl.surge > 0 ? (tal(pl, "canalisatrice_t3") ? 1.8 : 1.4) : 1;
    if (tal(pl, "vagabonde_t3") && pl.mstate === "mouvement") pl.dmgX *= 1.15;
  }
  /* Ombre : discrétion */
  function ninjaTick(pl, dt, k) {
    var ps = pl.posture;
    pl.invis = ps === "affut" && pl.anchored && pl.anchorT > (tal(pl, "affut_t1") ? 0.6 : 1);
    if (pl.invis) { pl.critNext = true; pl.ghostT = tal(pl, "affut_t4") ? 1 : 0; } else if (pl.ghostT > 0) pl.ghostT -= dt;
    if (ps === "lamevent" && pl.mstate === "mouvement" && cooled(pl, "lv", tal(pl, "lamevent_t1") ? 0.12 : 0.25)) zones.push({ x: pl.x, y: pl.y + 2, r: 9, t: 0, dur: 1.5, kind: "thorn", dmg: 5 * k * (tal(pl, "lamevent_t2") ? 1.5 : 1) * (tal(pl, "lamevent_t3") ? 2 : 1), owner: pl });
    pl.cadX *= 1 / (1 + (pl.dance || 0) * (tal(pl, "danseuse_t1") ? 0.1 : 0.08));
  }
  function stealthy(pl) { return pl && pl.char && pl.char.id === "ninja"; }
  /* Pip & Pop */
  function twinsTick(pl, dt, k) {
    var tw = pl.twinRef; if (!tw || tw.down) return;
    var d = Math.hypot(tw.x - pl.x, tw.y - pl.y), ps = pl.posture;
    if (ps === "formation" && d < (tal(pl, "formation_t2") ? 40 : 26) && pl.anchored) { var b = tal(pl, "formation_t3") ? 1.6 : 1.35; pl.dmgX *= b; tw.dmgX = b; } else tw.dmgX = 1;
    if (ps === "relais" && pl.anchored) { pl.hp = Math.min(pl.maxHp, pl.hp + dt); tw.hp = Math.min(tw.maxHp, tw.hp + dt); }
    if (pl.beamT > 0) { pl.beamT -= dt; if (cooled(pl, "tbeam", 0.2)) { var a = Math.atan2(tw.y - pl.y, tw.x - pl.x); fx.push({ kind: "beam", x: pl.x, y: pl.y, a: a, len: d, w: 3, life: 0.2, max: 0.2, col: "106,216,255" }); lineHit(pl.x, pl.y, a, d, 5, function (e) { hurt(e, 14 * k * (tal(pl, "miroir_t1") ? 1.6 : 1), 0, 0); }); } }
  }
  // Volte des nouveaux écureuils
  function charVolte(pl, dx, dy) {
    var cid = pl.char.id, ps = pl.posture, k = gpw(), tw = pl.twinRef;
    if (cid === "cendrine") {
      if (ps === "rempart" && !tal(pl, "rempart_t4")) { ring(pl.x, pl.y, 56, false); near(pl.x, pl.y, 66, function (e) { var d = Math.hypot(e.x - pl.x, e.y - pl.y) || 1; if (d < 56 + e.d.r) hurt(e, 10 * k, (e.x - pl.x) / d * 260, (e.y - pl.y) / d * 260); }); }
      if (ps === "belier") { var R = tal(pl, "belier_t4") ? 70 : 36; ring(pl.x, pl.y, R, false); near(pl.x, pl.y, R + 10, function (e) { if (Math.hypot(e.x - pl.x, e.y - pl.y) < R + e.d.r) { e.stunT = 1; e.slowT = 1; e.slow = 1; hurt(e, 14 * k * (1 + (pl.elan || 0)), 0, 0); } }); pl.elan = 0; }
      if (ps === "carapace") { needles(pl, 14, 12 * k); if (tal(pl, "carapace_t4")) { pl.rollT = 0.4; pl.rollX = dx; pl.rollY = dy; pl.inv = Math.max(pl.inv, 0.5); } }
    } else if (cid === "druide") {
      (pl.trees || []).forEach(function (t) {
        if (ps === "jardiniere" && t.age >= t.grow) pl.hp = Math.min(pl.maxHp, pl.hp + 5);
        if (ps === "ronceraie" && t.age >= t.grow) for (var i = 0; i < 6; i++) { var a = i / 6 * TAU; projs.push({ owner: pl, kind: "bullet", x: t.x, y: t.y - 6, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, dmg: 9 * k, pierce: 1, sprite: "needle", life: 0.6, hit: [], r: 3, explode: 0, elem: "terre" }); }
        if (ps === "semeuse") t.age = Math.max(t.age, t.grow);
      });
    } else if (cid === "pataud") pataudSpit(pl, dx, dy);
    else if (cid === "mage") { pl.sap = Math.min(100, (pl.sap || 0) + (ps === "canalisatrice" ? 20 : ps === "vagabonde" ? (tal(pl, "vagabonde_t4") ? 40 : 15) : 0)); if (ps === "instable" && pl.sap >= 60 && !(pl.surge > 0)) { pl.surge = 4; pl.sap = 30; bannerAll("Surcharge instable !"); } }
    else if (cid === "ninja") {
      if (ps === "affut") { pl.ghostT = 1; }
      if (ps === "lamevent") { var n = tal(pl, "lamevent_t4") ? 12 : 6; for (var j = 0; j < n; j++) { var b = j / n * TAU; projs.push({ owner: pl, kind: "bullet", x: pl.x, y: pl.y, vx: Math.cos(b) * 170, vy: Math.sin(b) * 170, dmg: 12 * k, pierce: 3, sprite: "shuriken", life: 0.7, hit: [], r: 4, explode: 0 }); } }
      if (ps === "danseuse") { var cap = tal(pl, "danseuse_t3") ? 8 : 5; pl.dance = Math.min(cap, (pl.dance || 0) + 1); if (tal(pl, "danseuse_t4") && pl.dance >= 5) fireNova(50, 20 * k); }
    } else if (cid === "trefle") {
      if (ps === "toutourien") { var win = Math.random() < (tal(pl, "toutourien_t2") ? 0.6 : 0.5); if (win) { var nn = tal(pl, "toutourien_t1") ? 32 : 24; for (var q = 0; q < nn; q++) { var c = q / nn * TAU; projs.push({ owner: pl, kind: "bullet", x: pl.x, y: pl.y, vx: Math.cos(c) * 160, vy: Math.sin(c) * 160, dmg: 11 * k, pierce: 1, sprite: "acorn", life: 0.8, hit: [], r: 4, explode: tal(pl, "toutourien_t3") ? 12 : 0 }); } texts.push({ x: pl.x, y: pl.y - 16, n: "PILE !", life: 0.7, col: "#f6d36b" }); } else { texts.push({ x: pl.x, y: pl.y - 16, n: "FACE...", life: 0.7 }); if (tal(pl, "toutourien_t4")) pl.hp = Math.min(pl.maxHp, pl.hp + 10); } }
      if (ps === "portebonheur" && Math.random() < (tal(pl, "portebonheur_t2") ? 0.33 : 0.25)) dropItem(pl.x + dx * 20, pl.y + dy * 20, tal(pl, "portebonheur_t3") && Math.random() < 0.3 ? 2 : 0);
    } else if (cid === "jumeaux" && tw && !tw.down) {
      if (ps === "formation") { [[pl, tw], [tw, pl]].forEach(function (pr) { var a0 = Math.atan2(pr[1].y - pr[0].y, pr[1].x - pr[0].x); for (var s = -2; s <= 2; s++) projs.push({ owner: pl, kind: "bullet", x: pr[0].x, y: pr[0].y, vx: Math.cos(a0 + s * 0.2) * 170, vy: Math.sin(a0 + s * 0.2) * 170, dmg: 10 * k, pierce: 2, sprite: "acorn", life: 0.7, hit: [], r: 4, explode: 0 }); }); }
      if (ps === "miroir") pl.beamT = tal(pl, "miroir_t3") ? 1 : 0.25;
      if (ps === "relais") { var ox = pl.x, oy = pl.y; pl.x = tw.x; pl.y = tw.y; tw.x = ox; tw.y = oy; var R2 = 40 * (tal(pl, "relais_t2") ? 1.6 : 1); [pl, tw].forEach(function (o) { var pp2 = p; p = pl; fireNova(R2, 14 * k); p = pp2; if (tal(pl, "relais_t3")) o.inv = Math.max(o.inv, 1); if (tal(pl, "relais_t4")) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.1); }); }
    }
  }
  function drawCharFx(pl) {
    if (pl.trees) pl.trees.forEach(function (t) { var big = t.age >= t.grow; blit(SPR[big ? "minitree" : "sapling"][0], t.x, t.y - (big ? 6 : 2)); if (!big) { ctx.fillStyle = "#9cc56b"; ctx.fillRect(Math.round(t.x - 4), Math.round(t.y + 2), Math.round(8 * t.age / t.grow), 1); } });
    if (pl.char && pl.char.id === "cendrine") {
      var fs = [{ x: pl.x, y: pl.y, R: pl.field || 18 }]; if (pl.fort) fs.push(pl.fort);
      fs.forEach(function (f) { ctx.strokeStyle = "rgba(127,209,199," + (pl.anchored ? 0.75 : 0.4) + ")"; ctx.fillStyle = "rgba(127,209,199,.08)"; ctx.beginPath(); ctx.ellipse(f.x, f.y, f.R, f.R * 0.8, 0, 0, TAU); ctx.fill(); ctx.stroke(); });
      if (pl.posture === "carapace" && pl.anchored) { ctx.strokeStyle = "rgba(200,192,176,.9)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pl.x, pl.y, 9, 0, TAU); ctx.stroke(); ctx.lineWidth = 1; }
    }
  }
  function charHud(pl) {
    var c = pl.char.id;
    if (c === "mage") return " · SEVE " + Math.round(pl.sap || 0) + (pl.surge > 0 ? " SURCHARGE" : "");
    if (c === "pataud") return " · TAILLE " + fr(Math.round((pl.size || 1) * 10) / 10);
    if (c === "cendrine") return pl.debt > 0.5 ? " · DETTE " + Math.round(pl.debt) : pl.posture === "belier" ? " · ELAN " + Math.round((pl.elan || 0) * 100) + "%" : "";
    if (c === "ninja") return pl.invis || pl.ghostT > 0 ? " · INVISIBLE" : pl.posture === "danseuse" && pl.dance ? " · DANSE " + pl.dance : "";
    if (c === "druide") return " · ARBRES " + (pl.trees || []).length + "/" + treeMax(pl);
    if (c === "trefle" && r.betPend) return " · MISE EN COURS";
    return "";
  }
  /* ---- Trèfle : miser sa carte ---- */
  function trefleBetOk(pl) { return pl.char.id === "trefle"; }
  function betWin(pl) { var c = pl.posture === "flambeuse" ? (tal(pl, "flambeuse_t3") ? 0.7 : 0.6) : 0.5; return Math.random() < c; }
  /* ---------- 2.0 fin de phase 6 : signatures génériques, panoplies, forge, camp ---------- */
  var SIGDEF = {}; Object.keys(D.SIGS).forEach(function (a) { D.SIGS[a].forEach(function (s) { SIGDEF[s.id] = s; }); });
  function hasSig(pl, kind) { var w = pl.weapons || {}; for (var id in w) { var sg = SIGDEF[id]; if (sg && sg.kind === kind) return { id: id, l: w[id], sg: sg }; } return null; }
  function setCount(pl, sid) { return (pl.set && pl.set[sid]) || 0; }
  function runeAdd(n, rare) { if (!r) return; var id = rare ? "rune_rare" : "rune"; if (isExpe()) bagAddRes(id, n); else r.res[id] = (r.res[id] || 0) + n; }
  /* ---- le camp : un écran-diorama où l'écureuil se déplace jusqu'aux lieux ---- */
  var camp = { x: 160, y: 0, tx: null, ty: null, near: null, on: false, t: 0 };
  // positions prévues pour 320 px de large : en portrait (écran plus étroit), tout se resserre
  function campPos(l) { var nar = W < 300; return { x: Math.round(l.x / 320 * W), y: Math.round((nar ? 0.08 + l.y * 0.84 : l.y) * H) }; }
  function openCamp() {
    if (S.news) { newsCard(); return; }
    state = "menu"; screen = "camp"; overlay.hidden = true; camp.on = true;
    if (!camp.y) { camp.x = Math.round(W / 2); camp.y = Math.round(H * 0.7); }
    var bar = document.querySelector("[data-campbar]");
    if (!bar) { bar = document.createElement("div"); bar.className = "camp-bar"; bar.setAttribute("data-campbar", ""); stage.appendChild(bar); bar.addEventListener("click", function (e) { var b = e.target.closest("[data-camp]"); if (b) campOpen(b.getAttribute("data-camp")); }); }
    bar.hidden = false;
    bar.innerHTML = '<button type="button" class="camp-go" data-camp="sentier">▶ Partir</button>' + D.CAMP.filter(function (l) { return l.id !== "sentier"; }).map(function (l) { return '<button type="button" data-camp="' + l.id + '">' + esc(l.name.replace(/^(Le |La |L')/, "")) + "</button>"; }).join("") +
      '<button type="button" data-camp="codex">📜</button><button type="button" data-camp="help">❓</button><button type="button" data-camp="options">⚙️</button>';
  }
  // « Nouveautés » : ce qui a changé pour un joueur de la version 1
  function newsCard() {
    closeCamp(); state = "menu";
    var m = MIGRATED, html = '<span class="kicker">Mise à jour majeure</span><h2>Bienvenue dans la 2.0</h2>' +
      (m ? '<p>Ta progression est gardée : rang, succès, quêtes et records. Les améliorations achetées, l\'arbre et les points de prestige sont remboursés : <b>+' + m.refund.toLocaleString("fr-FR") + " " + goldIc() + "</b>" + (m.prestige ? " et des ressources pour tes " + m.prestige + " prestiges" : "") + ".</p>" : "") +
      '<ul class="help-list"><li><b>Le mouvement est ta seule commande</b>, lu en 3 états : Ancré, Mouvement, Volte. Ta <b>posture</b> donne une règle à chacun.</li>' +
      "<li><b>Au début de chaque partie, tu choisis ton arme</b> ; tout se construit autour d'elle : techniques, évolutions, fusions.</li>" +
      "<li><b>Le camp</b> remplace le menu : attirail et talents au terrier, craft à l'atelier, runes à la forge.</li>" +
      "<li><b>4 modes</b> : Survie, Arène, Donjon et la nouvelle <b>Expédition</b>. Plus de prestige : les paliers Cauchemar le remplacent.</li>" +
      (m && m.retired.length ? "<li>Bûche, Charbon, Bastien et Flocon ne sont plus jouables : ils tiennent les lieux du camp.</li>" : "") +
      '<li>La coop n\'est pas encore en 2.0 : la <a href="jeu-classique.html">version 1</a> reste jouable pour la coop.</li></ul>' +
      '<div class="btn-row center"><button class="btn" type="button" data-action="newsok" data-autofocus>Au camp !</button></div>';
    showCard(html, "news");
  }
  function closeCamp() { camp.on = false; var bar = document.querySelector("[data-campbar]"); if (bar) bar.hidden = true; }
  function campOpen(id) {
    var l = D.CAMP.filter(function (q) { return q.id === id; })[0];
    closeCamp(); SND.click();
    if (id === "options" || id === "codex" || id === "help") { go(id); return; }
    if (l && l.screen === "play") { inspect.char = S.char; inspect.map = S.map; }
    go(l ? l.screen : "menu");
  }
  function campTick(dt) {
    if (!camp.on) return;
    camp.t += dt;
    var v = inputVector(), sp = 70;
    if (Math.hypot(v.x, v.y) > 0.1) { camp.tx = null; camp.x += v.x * sp * dt; camp.y += v.y * sp * dt; camp.face = v.x < -0.1 ? -1 : v.x > 0.1 ? 1 : camp.face; camp.moving = true; }
    else if (camp.tx !== null) {
      var dx = camp.tx - camp.x, dy = camp.ty - camp.y, d = Math.hypot(dx, dy);
      if (d < 3) { camp.tx = null; if (camp.goal) { var g = camp.goal; camp.goal = null; campOpen(g); return; } }
      else { camp.x += dx / d * Math.min(d, sp * 1.4 * dt); camp.y += dy / d * Math.min(d, sp * 1.4 * dt); camp.face = dx < 0 ? -1 : 1; camp.moving = true; }
    } else camp.moving = false;
    camp.x = Math.max(10, Math.min(W - 10, camp.x)); camp.y = Math.max(20, Math.min(H - 14, camp.y));
    camp.near = null;
    D.CAMP.forEach(function (l) { var q = campPos(l); if (Math.hypot(q.x - camp.x, q.y + 10 - camp.y) < 22) camp.near = l; });
  }
  function drawCamp(now) {
    var t = now / 1000, m = mapById("clairiere");
    drawGround(0, 0, m);
    ctx.fillStyle = "rgba(30,40,20,.15)"; ctx.fillRect(0, 0, W, H);
    // chemins entre les lieux
    ctx.strokeStyle = "rgba(160,120,70,.55)"; ctx.lineWidth = 7; ctx.lineCap = "round";
    var c0 = campPos(D.CAMP[0]);
    D.CAMP.forEach(function (l) { if (l.id === "sentier") return; var q = campPos(l); ctx.beginPath(); ctx.moveTo(c0.x, c0.y); ctx.lineTo(q.x, q.y + 8); ctx.stroke(); });
    ctx.lineWidth = 1; ctx.lineCap = "butt";
    // feu de camp
    var fx0 = Math.round(W / 2), fy0 = Math.round(H * 0.55);
    ctx.fillStyle = "#6b4430"; ctx.fillRect(fx0 - 7, fy0 + 2, 14, 3);
    for (var i = 0; i < 5; i++) { ctx.fillStyle = ["#ff9a3a", "#f6d36b", "#ff5a2a"][i % 3]; var fh = 4 + Math.sin(t * 9 + i) * 2; ctx.fillRect(fx0 - 5 + i * 2, Math.round(fy0 - fh), 2, Math.round(fh) + 2); }
    D.CAMP.forEach(function (l) {
      var q = campPos(l), lv = 1 + Math.min(2, Math.floor((S.rank || 1) / 6)), hot = camp.near === l;
      // bâtiment (3 états visuels selon le rang)
      if (l.id === "chene") { ctx.fillStyle = "#3f6a2a"; ctx.beginPath(); ctx.arc(q.x, q.y - 14, 18 + lv * 2, 0, TAU); ctx.fill(); ctx.fillStyle = "#6b4430"; ctx.fillRect(q.x - 4, q.y - 6, 8, 14); }
      else if (l.id === "sentier") { ctx.fillStyle = "#a07848"; ctx.fillRect(q.x - 2, q.y - 14, 4, 16); ctx.fillStyle = "#f6d36b"; ctx.fillRect(q.x - 12, q.y - 16, 24, 7); drawText("SENTIER", q.x, q.y - 15, "#2b1709", "c"); }
      else {
        var bw = (24 + lv * 4) * Math.min(1, W / 320 + 0.25), bh = 14 + lv * 2, col = { terrier: "#6b4430", atelier: "#8a5a3b", forge: "#5a524a", comptoir: "#8a6a3a", arene: "#9a8a7a" }[l.id] || "#8a5a3b";
        ctx.fillStyle = "#2b1709"; ctx.fillRect(q.x - bw / 2 - 1, q.y - bh - 1, bw + 2, bh + 2);
        ctx.fillStyle = col; ctx.fillRect(q.x - bw / 2, q.y - bh, bw, bh);
        ctx.fillStyle = l.id === "forge" ? "#ff7a2a" : "#2b1709"; ctx.fillRect(q.x - 3, q.y - 8, 6, 8);
        ctx.fillStyle = { terrier: "#3f6a2a", atelier: "#c8553d", forge: "#3a322c", comptoir: "#3f9a4a", arene: "#c8c0b0" }[l.id] || "#c8553d";
        ctx.beginPath(); ctx.moveTo(q.x - bw / 2 - 3, q.y - bh); ctx.lineTo(q.x, q.y - bh - 9 - lv); ctx.lineTo(q.x + bw / 2 + 3, q.y - bh); ctx.fill();
        if (l.id === "forge") for (var s0 = 0; s0 < 3; s0++) { ctx.fillStyle = "rgba(200,200,200," + (0.3 - s0 * 0.08) + ")"; ctx.fillRect(Math.round(q.x + 6 + Math.sin(t * 2 + s0) * 2), Math.round(q.y - bh - 12 - s0 * 5 - (t * 6 % 5)), 3, 3); }
      }
      if (l.npc && SPR[l.npc]) drawHero(l.npc, q.x + (W < 300 ? 11 : 16), q.y + 4, -1, false, t * 4, 0);
      if (hot || camp.near === null && Math.hypot(q.x - camp.x, q.y - camp.y) < 60) drawText(l.name, q.x, q.y - 34, hot ? "#f6d36b" : "#fdf3de", "c");
      if (hot) drawText(isTouch ? "TOUCHE POUR ENTRER" : "ENTREE POUR ENTRER", q.x, q.y - 26, "#fdf3de", "c");
    });
    drawHero(charById(S.char).sprite, camp.x, camp.y, camp.face || 1, camp.moving, t * 8, 0);
  }
  function campTap(x, y) {
    var best = null, bd = 1e9;
    D.CAMP.forEach(function (l) { var q = campPos(l), d = Math.hypot(q.x - x, q.y - 8 - y); if (d < 30 && d < bd) { bd = d; best = l; } });
    camp.tx = best ? campPos(best).x : x; camp.ty = best ? campPos(best).y + 10 : y; camp.goal = best ? best.id : null;
  }
  function moveMe(dt) {
    var v = (me.down || me.choosing || netMenuOpen) ? { x: 0, y: 0 } : inputVector();
    stateTick(me, v, dt);
    if (v2Move(me, v, dt)) return;
    var slw = slowMul(me);
    if (me.lastHp !== undefined && me.hp < me.lastHp - 0.5 && itn(me, "cape")) me.capeT = 2;
    me.lastHp = me.hp;
    if (me.capeT > 0) { me.capeT -= dt; slw *= 1 + 0.35 * itn(me, "cape"); }
    if (isDungeon()) { var spd = me.speed * slw * (me.wet === "water" ? 0.6 : me.wet === "poison" ? 0.8 : 1); dungeonMove(me, me.x + v.x * spd * dt, me.y + v.y * spd * dt); dungeonFeet(me, dt); markVisited(); }
    else if (MAP.mech === "ice" && onIce(me.x, me.y + 3) && !gv(me, "bro_b")) {
      var ik = Math.min(1, dt * 2.6); me.ivx = (me.ivx || 0) + (v.x * me.speed * slw - (me.ivx || 0)) * ik; me.ivy = (me.ivy || 0) + (v.y * me.speed * slw - (me.ivy || 0)) * ik;
      me.x += me.ivx * dt; me.y += me.ivy * dt; pushOutGiants(me, 5);
    }
    else { me.ivx = v.x * me.speed * slw; me.ivy = v.y * me.speed * slw; me.x += v.x * me.speed * slw * dt; me.y += v.y * me.speed * slw * dt; pushOutGiants(me, 5); }
    clampArena(me, 8);
    me.moving = Math.abs(v.x) + Math.abs(v.y) > 0.05;
    if (v.x > 0.1) me.face = 1; else if (v.x < -0.1) me.face = -1;
    if (me.twinRef) {
      var tv = (me.twinRef.down || netMenuOpen || me.choosing) ? { x: 0, y: 0 } : (me.down ? inputVector() : v);
      syncTwins(); moveTwin(me.twinRef, tv, dt);
    }
  }
  function tickPlayers(dt) {
    players.forEach(function (pl) {
      if (pl.remote) {
        var k = Math.min(1, dt * 12);
        pl.x += (pl.tx - pl.x) * k; pl.y += (pl.ty - pl.y) * k;
      }
      pl.anim += dt * (pl.moving || SPR[pl.sprite].flying ? 8 : 0);
      pl.inv -= dt;
      if (pl.down) return;
      if (pl.regen) pl.hp = Math.min(pl.maxHp, pl.hp + pl.regen * dt);
      if (pl.shieldCd && !pl.shield) { pl.shieldT -= dt; if (pl.shieldT <= 0) pl.shield = true; }
    });
  }
  function update(dt) {
    if (isArena() && r.phase === "shop") { tickFx(dt); return; }
    syncTwins();
    r.time += dt;
    if (isArena()) {
      r.roundT += dt;
      if (r.roundT >= r.roundLen) { endRound(); return; }
    }
    var hp0 = me.hp, mh0 = me.maxHp;
    moveMe(dt);
    gearTick(me, dt);
    charTick(me, dt);
    if (r.mega) players.forEach(megaArena);
    tickPlayers(dt);
    r.freeze = Math.max(0, r.freeze - dt); r.flash = Math.max(0, r.flash - dt);

    var bi = biomeAtTile(Math.floor(me.x / 16), Math.floor(me.y / 16));
    if (bi !== r.biome && !isDungeon()) { if (r.biome >= 0) banner(MAP.biomes[bi].name); r.biome = bi; }

    tierTick();
    if (nm(5) && me.hp > hp0 && me.maxHp === mh0) me.hp = hp0 + (me.hp - hp0) * 0.5;   // Cauchemar 5 : soins réduits de moitié
    if (!isArena()) shrineTick(dt);
    if (isArena()) arenaDirector(dt); else if (isDungeon()) { dungeonTick(dt); if (state !== "play") return; } else if (isExpe()) { expeTick(dt); if (state !== "play") return; } else { director(dt); portalTick(dt); }
    buildGrid();
    players.forEach(function (pl) { if (pl.down) return; p = pl; crewTick(pl, dt); teamTick(pl, dt); if (isDungeon() && !inCombat(pl)) return; itemTick(pl, dt); weapons(dt); });
    p = me;

    var zones = players.length > 1 ? players.filter(function (pl) { return pl.choosing && !pl.down; }) : [];
    var i, e, boss = null;
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i]; if (e.dead) continue;
      var tg = targetOf(e);
      var dx = tg.x - e.x, dy = tg.y - e.y, d = Math.hypot(dx, dy) || 1;
      e.flash -= dt;
      if (e.d.prop) { if (!nearAnyPlayer(e, 480)) e.dead = true; continue; }
      var sp = e.spd * (e.slowT > 0 ? 1 - e.slow : 1) * (e.buffT > 0 ? 1.3 : 1) * (e.hasteT > r.time ? 1.3 : 1) * (MAP.mech === "water" && !FLYERS[e.type] && waterAt(e.x, e.y + 2) ? 0.8 : 1) * (MAP.mech === "ice" && !FLYERS[e.type] && onIce(e.x, e.y) ? 0.85 : 1);
      if (e.buffT > 0) e.buffT -= dt; if (e.markT > 0) e.markT -= dt; if (e.stunT > 0) e.stunT -= dt;
      burnTick(e, dt); if (e.fateT > 0 && !e.dead) fateTick(e, dt); if (e.dead) continue;
      if (r.freeze > 0) sp *= e.d.boss ? 0.5 : 0;
      e.slowT -= dt; e.anim += dt * (e.type === "wasp" || e.type === "moth" ? 14 : 5) * (r.freeze > 0 && !e.d.boss ? 0 : 1);
      var mx = dx / d, my = dy / d, ox = e.x, oy = e.y;
      if (isDungeon()) {
        sp *= enemyHazards(e, dt); if (e.dead) continue;
        // les rôdeurs des couloirs dorment tant qu'on ne s'approche pas
        if (e.wander && !e.awake) { if (d < 130) { e.awake = true; e.flash = 0.15; } else { sp = 0; e.anim -= dt * 3; } }
      }
      if (e.d.ai) { var f = enemyAI(e, d, dx, dy, dt); if (e.dead) continue; sp *= Math.abs(f); if (f < 0) { mx = -mx; my = -my; } else if (f > 0 && f < 1) { var t2 = mx; mx = -my; my = t2; } }
      if (e.d.move === "wobble") { var s = Math.sin(r.time * (e.type === "wasp" ? 6 : 3) + e.phase) * 0.7; var px = -my * s, py = mx * s; mx += px; my += py; }
      else if (e.d.move === "hop") sp *= 0.25 + 1.6 * Math.max(0, Math.sin(r.time * 6 + e.phase));
      else if (e.d.move === "zigzag") { var zz = Math.sin(r.time * 5 + e.phase) * 1.1, zx = -my * zz, zy = mx * zz; mx += zx; my += zy; }
      if (e.type === "boar") {
        if (e.charge > 0) { e.charge -= dt; mx = e.cx; my = e.cy; sp = 135 * (r.freeze > 0 ? 0.5 : 1); if (e.charge <= 0) warn(e.x, e.y, 34, 0.5, 18, e); }
        else if (e.windup > 0) { e.windup -= dt; sp = 0; e.flash = Math.sin(e.windup * 40) > 0 ? 0.05 : 0; if (e.windup <= 0) { e.charge = 0.9; e.cx = dx / d; e.cy = dy / d; SND.boom(); } }
        else { e.cd -= dt; if (e.cd <= 0 && d < 170) { e.windup = 0.6; e.cd = 3.5; } }
      } else if (e.type === "owl") {
        if (d < 70) { var tx = -mx * 0.6 - my * 0.8, ty = -my * 0.6 + mx * 0.8; mx = tx; my = ty; }
        e.cd -= dt;
        if (e.cd <= 0) {
          e.cd = 3.2;
          var n = 10 + bossCount * 2, off = Math.random();
          for (var k = 0; k < n; k++) hostileShot(e.x, e.y, off + k / n * TAU, 55, 12);
          SND.whip();
        }
      } else if (e.d.bossAi) { var bo = bossAI(e, d, dx, dy, dt, mx, my, sp); mx = bo[0]; my = bo[1]; sp = bo[2]; }
      if (e.aff) affixTick(e, dt, d);
      if (e.d.boss && (!boss || e.giant)) boss = e;
      e.x += mx * sp * dt + e.kx * dt; e.y += my * sp * dt + e.ky * dt;
      var damp = Math.pow(0.0005, dt); e.kx *= damp; e.ky *= damp;
      // zone sûre : les ennemis restent au bord, sauf s'ils poursuivent un autre joueur qui s'y trouve
      for (var z = 0; z < zones.length; z++) {
        var zp = zones[z], zx = e.x - zp.x, zy = e.y - zp.y, zd = Math.hypot(zx, zy) || 0.01, lim = SAFE_R + e.d.r;
        if (zd >= lim) continue;
        var chasing = tg !== zp && !tg.choosing && Math.hypot(tg.x - zp.x, tg.y - zp.y) < SAFE_R + 4;
        if (chasing) continue;
        e.x = zp.x + zx / zd * lim; e.y = zp.y + zy / zd * lim;
        if (e.charge > 0) e.charge = 0;
      }
      if (dt > 0) { e.mvx = (e.x - ox) / dt; e.mvy = (e.y - oy) / dt; }
      if (Math.abs(mx) > 0.1) e.face = mx > 0 ? 1 : -1;
      if (isArena()) clampArena(e, e.d.r);
      if (isDungeon()) enemyConstrain(e, ox, oy);
      else if (!FLYERS[e.type] && !e.under) pushOutGiants(e, e.d.r - 1);
      if (!e.under) for (var j = 0; j < players.length; j++) {
        var pl = players[j];
        var hbx = 5 * (pl.size || 1);
        if (Math.abs(pl.x - e.x) < e.d.r + hbx && Math.abs(pl.y - e.y) < e.d.r + hbx) {
          if (!contactOk(e, pl)) continue;
          var hb = pl.hp; damagePlayer(e.d.dmg * (e.dmgMul || 1) * (e.buffT > 0 ? 1.3 : 1), pl);
          if (pl.hp < hb && e.elem === "eau" && !e.d.boss) pl.wetT = 1;
          if (pl.hp < hb && e.elem === "air" && !e.d.boss) { var ad = Math.hypot(e.x - pl.x, e.y - pl.y) || 1; e.kx += (e.x - pl.x) / ad * 220; e.ky += (e.y - pl.y) / ad * 220; }
          if (pl.hp < hb && itn(pl, "ecaille_sala") && !e.d.prop) { e.burnT = 3; e.burnD = 3 * gpw(); e.burnBy = pl; }
          if (pl.hp < hb) { e.hitDash = 1; if (itn(pl, "bogue") && pl.anchored) { var kpb = p; p = pl; hurt(e, 15 * itn(pl, "bogue") * gpw(), 0, 0); p = kpb; } }
          if (e.aff && pl.hp < hb && hasA(e, "vampire") && !itn(pl, "sceau_purete")) { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.08); burst(e.x, e.y, AFX.vampire.color, 6); }
        }
      }
      if (isExpe() && d > 900 && !e.camp && !e.d.boss) { e.dead = true; continue; }
      if (d > 420 && !e.d.boss && !isArena() && !isDungeon() && !isExpe()) { var ra = Math.atan2(dy, dx) + (Math.random() - 0.5), R = Math.hypot(W, H) / 2 + 10; e.x = tg.x + Math.cos(ra) * R; e.y = tg.y + Math.sin(ra) * R; }
    }
    // séparation légère (les objets et les boss ne bougent pas)
    grid.forEach(function (cell) {
      for (var a = 0; a < cell.length; a++) for (var b = a + 1; b < cell.length; b++) {
        var A = cell[a], B = cell[b], sx = B.x - A.x, sy = B.y - A.y, dd = Math.hypot(sx, sy), min = A.d.r + B.d.r - 2;
        if (dd > 0 && dd < min) {
          var ha = A.d.boss || A.d.prop, hb = B.d.boss || B.d.prop;
          if (ha && hb) continue;
          var push = (min - dd) / dd, wa = ha ? 0 : (hb ? 1 : 0.5), wb = 1 - wa;
          A.x -= sx * push * wa; A.y -= sy * push * wa; B.x += sx * push * wb; B.y += sy * push * wb;
        }
      }
    });
    mapTick(dt);
    updateWarns(dt);
    updateZones(dt);
    for (i = hostile.length - 1; i >= 0; i--) {
      var hq = hostile[i], hsl = 1;
      for (var hs = 0; hs < players.length; hs++) { var hpl = players[hs]; if (!hpl.items || hpl.down) continue;
        if (itn(hpl, "souche") && hpl.anchored && Math.abs(hq.x - hpl.x) < 60 && Math.hypot(hq.x - hpl.x, hq.y - hpl.y) < 60) hsl = 0.5;
        if (itn(hpl, "vent_dos") && hpl.mstate === "mouvement" && hpl.dir && Math.abs(hq.x - hpl.x) < 14 && Math.abs(hq.y - hpl.y) < 14 && (hq.x - hpl.x) * hpl.dir.x + (hq.y - hpl.y) * hpl.dir.y < 0) hq.life = -1; }
      if (r.statues && r.statues.length) for (var sti = 0; sti < r.statues.length; sti++) { var stt = r.statues[sti]; if (stt.t > r.time && Math.abs(hq.x - stt.x) < 9 && Math.abs(hq.y - stt.y) < 9) { hq.life = -1; burst(hq.x, hq.y, "#9ee8ff", 3); } }
      if (hq.life < 0) { hostile.splice(i, 1); continue; }
      hq.x += hq.vx * dt * hsl; hq.y += hq.vy * dt * hsl; hq.life -= dt;
      if (isDungeon() && (inPillar(hq.x, hq.y, 0) || (!roomAt(hq.x, hq.y, 0) && !inCorridor(hq.x, hq.y, 0)))) { burst(hq.x, hq.y, "#ff5a3a", 3); hostile.splice(i, 1); continue; }
      for (var h2 = 0; h2 < players.length; h2++) {
        var hp = players[h2];
        if (!hp.down && Math.abs(hq.x - hp.x) < 5 && Math.abs(hq.y - hp.y) < 6) { if (!hq.trav && hp.mstate === "mouvement" && gv(hp, "traverse")) { hq.trav = 1; if (Math.random() < gv(hp, "traverse") / 100) continue; } damagePlayer(hq.dmg, hp); hq.life = 0; break; }
      }
      if (hq.life <= 0) { if (hq.web) addZone(hq.x, hq.y, 16, 4, "web", 0); if (hq.log && enemies.length < 280) spawnAt("logprop", hq.x, hq.y); hostile.splice(i, 1); }
    }
    // joueurs à terre, renaissance, relève par un coéquipier
    for (i = 0; i < players.length; i++) {
      var pd = players[i];
      if (pd.down) {
        if (party && party.ctx.opts.noRevive) continue;   // party « Dernier debout » : pas de relève
        var rate = 0;
        if (pd.medicT > 0) { pd.medicT -= dt; rate = 1; }
        var jm = pd.jum3 ? 2 : 1;
        players.forEach(function (o) { if (o !== pd && !o.down && Math.hypot(o.x - pd.x, o.y - pd.y) < 22) rate = Math.max(rate, (1 + 0.25 * ((o.passives && o.passives.entraide) || 0) + 0.5 * itn(o, "ralliement")) * (itn(o, "nid") ? 2 : 1) * (o.twin && o.owner === pd && tal(pd, "formation_t4") ? 2 : 1)); });
        pd.reviveT = rate ? pd.reviveT + dt * rate * jm : Math.max(0, pd.reviveT - dt * 0.5);
        if (pd.reviveT >= 3) { r.revivesDone = (r.revivesDone || 0) + 1; S.stats.revives = (S.stats.revives || 0) + 1; pd.down = false; pd.hp = pd.maxHp * 0.4; pd.inv = 2; pd.reviveT = 0; bannerAll(pd.name + " est relevé !");
          players.forEach(function (o) { if (o !== pd && !o.down && itn(o, "ame_soeur") && !o.ameUsed && Math.hypot(o.x - pd.x, o.y - pd.y) < 30) { o.ameUsed = true; pd.hp = pd.maxHp; } }); }
        continue;
      }
      if (pd.hp > 0) continue;
      if (pd.revives > 0) {
        pd.revives--; pd.hp = pd.maxHp * 0.5; pd.inv = 2;
        if (itn(pd, "coeur_phenix")) { var kpx = p; p = pd; HIT_ELEM = "feu"; explode(pd.x, pd.y, 80, 300 * gpw(), 0); HIT_ELEM = undefined; p = kpx; pd.inv = 5; bannerAll("Le Cœur de phénix s'embrase !"); }
        near(pd.x, pd.y, 70, function (en) { if (en.d.prop) return; var ax = en.x - pd.x, ay = en.y - pd.y, ad = Math.hypot(ax, ay) || 1; en.kx += ax / ad * 260; en.ky += ay / ad * 260; });
        burst(pd.x, pd.y, "#f29a85", 24); if (pd === me) { banner("Renaissance !"); SND.level(); }
      } else if (players.length === 1) { gameOver(); return; }
      else {
        pd.down = true; pd.hp = 0; pd.reviveT = 0;
        var pair = pd.twinRef || pd.owner; if (pair && !pair.down && setCount(pd.owner || pd, "jumeaux") >= 3) { pair.inv = Math.max(pair.inv || 0, 2); pd.jum3 = true; }
        if (humans() === 1 && pd === me) banner("Tu es à terre ! " + (me.twinRef && !me.twinRef.down ? me.twinRef.name + " peut te relever" : ""));
        else bannerAll(pd.name + " est à terre ! Va le relever");
        players.forEach(function (o) { if (o !== pd && !o.down && itn(o, "ralliement")) o.rallyT = 6; });
      }
    }
    // plus personne debout (y compris si le seul coéquipier capable de relever a quitté la partie)
    if (players.length && !alive().length) { gameOver(); return; }

    for (i = projs.length - 1; i >= 0; i--) {
      var q = projs[i];
      p = q.owner || me; HIT_ELEM = q.elem; HIT_FX = q.hfx || null; CUR_FAM = q.fam || null; HIT_TREE = !!q.tree;
      if (q.kind === "boomerang") updateBoomerang(q, dt);
      else if (q.kind === "rocket") updateRocket(q, dt);
      else updateBullet(q, dt);
      if (q.life <= 0 && q.pierce > 0 && q.fam === "tir" && q.kind === "bullet" && p.sigK && p.sigK.stalactite) pZone({ x: q.x, y: q.y, r: 9, dur: 3, kind: "thorn", dmg: 5 * gpw(), owner: p, elem: "eau" });
      if (q.life <= 0 || q.pierce <= 0) projs.splice(i, 1);
    }
    for (i = lobs.length - 1; i >= 0; i--) {
      var l = lobs[i]; l.t += dt;
      if (l.t >= l.dur) { lobs.splice(i, 1); p = l.owner || me; HIT_ELEM = l.elem; HIT_FX = l.hfx || null; CUR_FAM = l.fam || null; explode(l.tx, l.ty, l.rad, l.dmg, l.frag); lobLand(l); }
    }
    HIT_ELEM = undefined; HIT_FX = null; CUR_FAM = null; HIT_TREE = false;
    p = me;
    enemies = enemies.filter(function (en) { return !en.dead; });
    curBoss = boss && !boss.dead ? boss : null;

    // ramassage : chaque objet va vers le joueur debout le plus proche
    for (i = gems.length - 1; i >= 0; i--) {
      var g = gems[i], best = null, bd = 1e9;
      for (var g2 = 0; g2 < players.length; g2++) {
        var gp = players[g2]; if (gp.down) continue;
        var dd2 = Math.hypot(gp.x - g.x, gp.y - g.y);
        if (dd2 < bd) { bd = dd2; best = gp; }
      }
      if (!best) continue;
      var gx = best.x - g.x, gy = best.y - g.y, gd = bd;
      if (gd > 0.5 && (g.pull || gd < best.magnet * (best.magX || 1))) {
        g.pull = (g.pull || 60) + 260 * dt;
        var stp = Math.min(gd, g.pull * dt);
        g.x += gx / gd * stp; g.y += gy / gd * stp;
      }
      if (gd < 7) { gems.splice(i, 1); p = best; collect(g, best); p = me; }
      else if (gd > 600 && (g.kind === "xp" || g.kind === "gold")) gems.splice(i, 1);
    }
    while (xp >= xpNext) { xp -= xpNext; r.level++; pending++; xpNext = need(r.level); }

    tickFx(dt);
    achTick -= dt;
    if (achTick <= 0) { achTick = 1; checkAchievements(r); }
    chestCheck();
    if (pending > 0 && !picking && !me.down && state === "play" && !isArena()) openLevelUp();
    if (Net.on) netHostTick(dt);
  }
  /* =====================================================================
     Donjon : génération procédurale (graine partagée en coop), salles,
     portes, vagues, élites, gardiens, reliques, escalier
     ===================================================================== */
  function isDungeon() { return r && r.mode === "dungeon"; }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function genFloor(seed, floor) {
    var rnd = mulberry(seed * 31 + floor * 977 + 7), n = DG.rooms(floor);
    var R = function (a, b) { return a + rnd() * (b - a); }, RI = function (a, b) { return Math.floor(R(a, b + 1)); };
    var cells = {}, rooms = [], dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]], links = {};
    function add(gx, gy) { cells[gx + "," + gy] = rooms.length; rooms.push({ idx: rooms.length, gx: gx, gy: gy, links: [], state: "new", type: "combat" }); return rooms[rooms.length - 1]; }
    function link(a, b) { var k = Math.min(a.idx, b.idx) + "-" + Math.max(a.idx, b.idx); if (links[k]) return; links[k] = [a.idx, b.idx]; a.links.push(b.idx); b.links.push(a.idx); }
    add(0, 0);
    for (var guard = 0; rooms.length < n && guard < 800; guard++) {
      var a = rooms[(rnd() * rooms.length) | 0], dd = dirs[(rnd() * 4) | 0], gx = a.gx + dd[0], gy = a.gy + dd[1];
      if (cells[gx + "," + gy] !== undefined) continue;
      link(a, add(gx, gy));
    }
    rooms.forEach(function (a) { dirs.forEach(function (dd) { var j = cells[(a.gx + dd[0]) + "," + (a.gy + dd[1])]; if (j !== undefined && rnd() < DG.extraLinks) link(a, rooms[j]); }); });
    var dist = rooms.map(function () { return -1; }), q = [0]; dist[0] = 0;
    while (q.length) { var c = q.shift(); rooms[c].links.forEach(function (j) { if (dist[j] < 0) { dist[j] = dist[c] + 1; q.push(j); } }); }
    var far = 0; rooms.forEach(function (rm, i) { rm.dist = dist[i]; if (dist[i] > dist[far]) far = i; });
    rooms[0].type = "start"; rooms[0].state = "cleared";
    rooms[far].type = floor >= DG.floors ? "boss" : "guard";
    var pool = rooms.filter(function (rm) { return rm.type === "combat" && rm.dist >= 1; });
    pool.sort(function () { return rnd() - 0.5; });
    var leaves = pool.filter(function (rm) { return rm.links.length === 1; });
    for (var t = 0; t < DG.treasures && (leaves.length || pool.length); t++) { var tr = (leaves.length ? leaves : pool).shift(); tr.type = "treasure"; pool = pool.filter(function (x) { return x !== tr; }); leaves = leaves.filter(function (x) { return x !== tr; }); }
    pool.filter(function (rm) { return rm.dist >= 2; }).slice(0, DG.elites(floor)).forEach(function (rm) { rm.type = "elite"; });

    // ---- formes des salles : rectangle, L, T ou croix (un « cœur » + des bras)
    rooms.forEach(function (rm) {
      var big = rm.type === "boss" || rm.type === "guard", small = rm.type === "treasure" || rm.type === "start";
      var ccx = rm.gx * DG.cellW + RI(-18, 18), ccy = rm.gy * DG.cellH + RI(-14, 14);
      var cw = big ? RI(250, 280) : small ? RI(130, 160) : RI(150, 220), ch = big ? RI(180, 200) : small ? RI(100, 120) : RI(110, 160);
      var core = { x: ccx - cw / 2, y: ccy - ch / 2, w: cw, h: ch }, parts = [core];
      var maxW = big ? 175 : 150, maxH = big ? 130 : 115;
      var shape = small ? (rnd() < 0.5 ? "rect" : "L") : ["rect", "L", "L", "T", "T", "plus"][(rnd() * 6) | 0];
      function arm(side, align) {
        var horiz = side < 2, len, wd, ar;
        if (horiz) {
          len = Math.min(RI(40, 80), maxW - cw / 2); wd = RI(60, Math.max(64, Math.min(110, ch - 10)));
          if (len < 24) return;
          var ay = align === "c" ? ccy - wd / 2 : align === "s" ? core.y : core.y + core.h - wd;
          // le bras mord largement dans le cœur : pas de bande infranchissable à la jonction
          ar = { x: side === 0 ? core.x + core.w - 24 : core.x - len, y: ay, w: len + 24, h: wd };
        } else {
          len = Math.min(RI(36, 70), maxH - ch / 2); wd = RI(60, Math.max(64, Math.min(120, cw - 10)));
          if (len < 24) return;
          var ax = align === "c" ? ccx - wd / 2 : align === "s" ? core.x : core.x + core.w - wd;
          ar = { x: ax, y: side === 2 ? core.y + core.h - 24 : core.y - len, w: wd, h: len + 24 };
        }
        parts.push(ar);
        armAnchors.push({ x: ar.x + ar.w / 2, y: ar.y + ar.h / 2, h: horiz });
      }
      var s1 = (rnd() * 4) | 0, armAnchors = [];
      if (shape === "L") arm(s1, rnd() < 0.5 ? "s" : "e");
      else if (shape === "T") arm(s1, "c");
      else if (shape === "plus") { arm(s1, "c"); arm(s1 ^ 1, "c"); }
      rm.core = core; rm.parts = parts; rm.cx = ccx; rm.cy = ccy; rm.shape = shape; rm.armAnchors = armAnchors;
      var bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
      parts.forEach(function (pp) { bx0 = Math.min(bx0, pp.x); by0 = Math.min(by0, pp.y); bx1 = Math.max(bx1, pp.x + pp.w); by1 = Math.max(by1, pp.y + pp.h); });
      rm.rect = { x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0 };
      rm.pits = []; rm.pillars = []; rm.anchors = [];
    });
    function inParts(rm, x, y, m) { for (var i = 0; i < rm.parts.length; i++) if (inRect(x, y, rm.parts[i], m)) return true; return false; }

    // ---- couloirs coudés (3 segments) entre les cœurs des salles
    var CW = 36, corridors = Object.keys(links).map(function (k) {
      var A = rooms[links[k][0]], B = rooms[links[k][1]], segs = [], horiz = A.gy === B.gy;
      if (horiz) {
        var L = A.gx < B.gx ? A : B, Rr = A.gx < B.gx ? B : A;
        var ya = RI(L.core.y + 24, L.core.y + L.core.h - 24), yb = RI(Rr.core.y + 24, Rr.core.y + Rr.core.h - 24);
        var xa = L.core.x + L.core.w - 16, xb = Rr.core.x + 16;
        var g0 = L.rect.x + L.rect.w + 22, g1 = Rr.rect.x - 22, mx = g1 > g0 ? RI(g0, g1) : (g0 + g1) / 2;
        segs.push({ x: xa, y: ya - CW / 2, w: mx + CW / 2 - xa, h: CW, h1: true });
        segs.push({ x: mx - CW / 2, y: Math.min(ya, yb) - CW / 2, w: CW, h: Math.abs(yb - ya) + CW, h1: false });
        segs.push({ x: mx - CW / 2, y: yb - CW / 2, w: xb - mx + CW / 2, h: CW, h1: true });
        L.anchors.push({ x: xa, y: ya, h: true }); Rr.anchors.push({ x: xb, y: yb, h: true });
        return { segs: segs, a: L.idx, b: Rr.idx, ends: [{ room: L.idx, x: xa, y: ya, dx: 1, dy: 0 }, { room: Rr.idx, x: xb, y: yb, dx: -1, dy: 0 }], mid: { x: mx, y: (ya + yb) / 2 } };
      }
      var T = A.gy < B.gy ? A : B, Bt = A.gy < B.gy ? B : A;
      var xa2 = RI(T.core.x + 24, T.core.x + T.core.w - 24), xb2 = RI(Bt.core.x + 24, Bt.core.x + Bt.core.w - 24);
      var ya2 = T.core.y + T.core.h - 16, yb2 = Bt.core.y + 16;
      var h0 = T.rect.y + T.rect.h + 22, h1 = Bt.rect.y - 22, my = h1 > h0 ? RI(h0, h1) : (h0 + h1) / 2;
      segs.push({ x: xa2 - CW / 2, y: ya2, w: CW, h: my + CW / 2 - ya2, h1: false });
      segs.push({ x: Math.min(xa2, xb2) - CW / 2, y: my - CW / 2, w: Math.abs(xb2 - xa2) + CW, h: CW, h1: true });
      segs.push({ x: xb2 - CW / 2, y: my - CW / 2, w: CW, h: yb2 - my + CW / 2, h1: false });
      T.anchors.push({ x: xa2, y: ya2, h: false }); Bt.anchors.push({ x: xb2, y: yb2, h: false });
      return { segs: segs, a: T.idx, b: Bt.idx, ends: [{ room: T.idx, x: xa2, y: ya2, dx: 0, dy: 1 }, { room: Bt.idx, x: xb2, y: yb2, dx: 0, dy: -1 }], mid: { x: (xa2 + xb2) / 2, y: my } };
    });
    // portes : là où le couloir quitte la salle
    corridors.forEach(function (c) {
      c.doors = c.ends.map(function (en) {
        var rm = rooms[en.room], x = en.x, y = en.y;
        for (var s = 0; s < 120 && inParts(rm, x, y, 0); s++) { x += en.dx * 2; y += en.dy * 2; }
        return { room: en.room, x: x - en.dx * 3, y: y - en.dy * 3, horiz: en.dx !== 0 };
      });
    });

    // ---- dangers et décor (déterministes : identiques chez tous les joueurs en coop)
    var spikes = [], pits = [], puddles = [], pillars = [], decor = [], torches = [];
    function clearOf(rm, x, y, w, h, pad) {
      if (!inParts(rm, x - pad, y - pad, 0) || !inParts(rm, x + w + pad, y + h + pad, 0) || !inParts(rm, x + w + pad, y - pad, 0) || !inParts(rm, x - pad, y + h + pad, 0)) return false;
      if (Math.abs(x + w / 2 - rm.cx) < w / 2 + 44 && Math.abs(y + h / 2 - rm.cy) < h / 2 + 40) return false;
      if (Math.abs(x + w / 2 - rm.cx) < w / 2 + 20 && Math.abs(y + h / 2 - (rm.core.y + 30)) < h / 2 + 22) return false;
      var anc = rm.anchors.concat(rm.armAnchors || []);
      for (var i = 0; i < anc.length; i++) {
        var an = anc[i];
        // garde libre le chemin entre chaque porte et le centre
        var lx0 = Math.min(an.x, rm.cx) - 24, lx1 = Math.max(an.x, rm.cx) + 24, ly0 = Math.min(an.y, rm.cy) - 24, ly1 = Math.max(an.y, rm.cy) + 24;
        var horizA = an.h;
        if (horizA ? (x < lx1 && x + w > lx0 && y < an.y + 24 && y + h > an.y - 24) || (x < rm.cx + 24 && x + w > rm.cx - 24 && y < ly1 && y + h > ly0)
                   : (y < ly1 && y + h > ly0 && x < an.x + 24 && x + w > an.x - 24) || (y < rm.cy + 24 && y + h > rm.cy - 24 && x < lx1 && x + w > lx0)) return false;
      }
      // jamais sur le passage d'un couloir qui traverse un bras de la salle
      for (var ci = 0; ci < corridors.length; ci++) for (var sj = 0; sj < 3; sj++) { var sg = corridors[ci].segs[sj]; if (x < sg.x + sg.w + pad + 4 && x + w > sg.x - pad - 4 && y < sg.y + sg.h + pad + 4 && y + h > sg.y - pad - 4) return false; }
      var all = rm.pits.concat(rm.pillars);
      for (i = 0; i < all.length; i++) { var o = all[i]; if (x < o.x + o.w + 14 && x + w > o.x - 14 && y < o.y + o.h + 14 && y + h > o.y - 14) return false; }
      return true;
    }
    function spotIn(rm, w, h, pad, tries, coreOnly) {
      for (var t = 0; t < (tries || 20); t++) {
        var pp = coreOnly ? rm.core : rm.parts[(rnd() * rm.parts.length) | 0];
        var x = R(pp.x + 8, pp.x + pp.w - w - 8), y = R(pp.y + 8, pp.y + pp.h - h - 8);
        if (clearOf(rm, x, y, w, h, pad)) return { x: Math.round(x), y: Math.round(y) };
      }
      return null;
    }
    rooms.forEach(function (rm) {
      var calm = rm.type === "start" || rm.type === "treasure", arena = rm.type === "boss";
      // piliers
      if (!calm && rnd() < 0.55) for (var i = RI(1, rm.type === "guard" ? 2 : 4); i > 0; i--) { var pz = RI(14, 20), sp0 = spotIn(rm, pz, pz, 10, 20, true); if (sp0) rm.pillars.push({ x: sp0.x, y: sp0.y, w: pz, h: pz, room: rm.idx }); }
      // trous
      if (!calm && !arena && rnd() < (0.6 + floor * 0.1) * (DGT.pits === undefined ? 1 : DGT.pits)) for (i = RI(1, 1 + floor); i > 0; i--) { var pw = RI(22, 42), ph = RI(18, 32), sp1 = spotIn(rm, pw, ph, 6); if (sp1) rm.pits.push({ x: sp1.x, y: sp1.y, w: pw, h: ph, room: rm.idx }); }
      // pièges à pointes
      if (!calm && rnd() < 0.7) for (i = RI(1, 2 + floor); i > 0; i--) {
        var cols = RI(1, 3), rows = RI(1, 2), sp2 = spotIn(rm, cols * 16, rows * 16, 2);
        if (!sp2) continue;
        var off = R(0, 2.6);
        for (var cx2 = 0; cx2 < cols; cx2++) for (var cy2 = 0; cy2 < rows; cy2++) spikes.push({ x: sp2.x + cx2 * 16, y: sp2.y + cy2 * 16, off: off, room: rm.idx });
      }
      // flaques (eau qui ralentit, poison qui brûle)
      for (i = RI(calm ? 0 : 1, 3) * (DGT.puddles || 1); i > 0; i--) { var pp2 = rm.parts[(rnd() * rm.parts.length) | 0], fw = DGT.mech === "flood" ? 1 + 0.25 * (floor - 1) : 1, rx = Math.round(RI(8, 18) * fw), ry = Math.round(RI(5, 10) * fw); puddles.push({ x: R(pp2.x + rx + 4, pp2.x + pp2.w - rx - 4), y: R(pp2.y + ry + 4, pp2.y + pp2.h - ry - 4), rx: rx, ry: ry, k: !calm && rnd() < 0.3 + floor * 0.08 + (DGT.poison || 0) ? "poison" : "water" }); }
      // végétation et cailloux
      rm.parts.forEach(function (pp) {
        var area = pp.w * pp.h / 1000;
        for (var k = Math.round(area * R(0.6, 1.2)); k > 0; k--) decor.push({ k: rnd() < 0.7 ? "grass" : "rock", x: R(pp.x + 4, pp.x + pp.w - 4), y: R(pp.y + 4, pp.y + pp.h - 4), v: (rnd() * 4) | 0 });
        for (k = Math.round(area * R(0, 0.25)); k > 0; k--) decor.push({ k: "fern", x: R(pp.x + 8, pp.x + pp.w - 8), y: R(pp.y + 8, pp.y + pp.h - 8), v: (rnd() * 3) | 0 });
        if (rnd() < 0.5) decor.push({ k: "moss", x: R(pp.x + 20, pp.x + pp.w - 20), y: R(pp.y + 14, pp.y + pp.h - 14), rx: RI(14, 30), ry: RI(8, 16) });
        for (var vx = pp.x + R(4, 20); vx < pp.x + pp.w - 6; vx += R(16, 46)) if (rnd() < 0.6) decor.push({ k: "vine", x: Math.round(vx), y: pp.y, len: RI(5, 16) });
      });
      for (i = RI(0, 3); i > 0; i--) { var pp3 = rm.parts[(rnd() * rm.parts.length) | 0]; decor.push({ k: "glow", x: R(pp3.x + 6, pp3.x + pp3.w - 6), y: R(pp3.y + 6, pp3.y + pp3.h - 6), v: (rnd() * 3) | 0 }); }
      // torches accrochées au mur du haut du cœur
      var nt = rm.type === "start" ? 2 : RI(1, 3);
      for (i = 0; i < nt; i++) torches.push({ x: Math.round(rm.core.x + rm.core.w * (i + 1) / (nt + 1) + R(-10, 10)), y: rm.core.y - 3, room: rm.idx });
      pits = pits.concat(rm.pits); pillars = pillars.concat(rm.pillars);
    });
    corridors.forEach(function (c) {
      c.segs.forEach(function (sg) {
        var len = Math.max(sg.w, sg.h);
        for (var k = Math.round(len / 30); k > 0; k--) decor.push({ k: rnd() < 0.6 ? "grass" : "rock", x: R(sg.x + 8, sg.x + sg.w - 8), y: R(sg.y + 8, sg.y + sg.h - 8), v: (rnd() * 4) | 0 });
        if (rnd() < 0.25) puddles.push({ x: sg.x + sg.w / 2 + R(-6, 6), y: sg.y + sg.h / 2 + R(-4, 4), rx: RI(8, 13), ry: RI(5, 8), k: rnd() < 0.3 ? "poison" : "water" });
        if (!sg.h1 && sg.h > 60 && rnd() < 0.5) torches.push({ x: Math.round(sg.x - 1), y: Math.round(sg.y + sg.h / 2), side: true });
      });
      c.monsters = rnd() < DG.corridorMobs ? RI(2, 2 + floor) : 0;
    });
    var shrines = [];
    rooms.forEach(function (rm) {
      if (rm.type === "start" || rm.type === "boss") return;
      var ns = rnd() < 0.8 ? (rnd() < 0.5 ? 2 : 1) : 0;   // jusqu'à 2 sanctuaires par salle
      for (var si = 0; si < ns; si++) {
        var sp = spotIn(rm, 26, 26, 8); if (!sp) continue;
        if (shrines.some(function (o) { return Math.hypot(o.x - sp.x - 13, o.y - sp.y - 16) < 50; })) continue;
        var tot = 0; D.SHRINES.forEach(function (q) { tot += q.weight; }); var x = rnd() * tot, kind = "coffre";
        for (var qi = 0; qi < D.SHRINES.length; qi++) { x -= D.SHRINES[qi].weight; if (x < 0) { kind = D.SHRINES[qi].id; break; } }
        shrines.push({ id: "d" + floor + "_" + rm.idx + "_" + si, x: sp.x + 13, y: sp.y + 16, k: kind });
      }
    });
    return { shrines: shrines, seed: seed, floor: floor, rooms: rooms, corridors: corridors, spikes: spikes, pits: pits, puddles: puddles, pillars: pillars, decor: decor, torches: torches };
  }
  // empreinte de la géométrie d'un étage (salles, bras, couloirs, piliers, trous) : sert à détecter une désynchro en coop
  function dgHash(g) {
    var h = 7, add = function (v) { h = (Math.imul(h, 31) + (Math.round(v) | 0)) | 0; };
    g.rooms.forEach(function (rm) { add(rm.idx); rm.parts.forEach(function (q) { add(q.x); add(q.y); add(q.w); add(q.h); }); });
    g.corridors.forEach(function (c) { c.segs.forEach(function (q) { add(q.x); add(q.y); add(q.w); add(q.h); }); });
    g.pillars.forEach(function (q) { add(q.x); add(q.y); add(q.w); });
    g.pits.forEach(function (q) { add(q.x); add(q.y); add(q.w); add(q.h); });
    return h >>> 0;
  }
  function buildFloor(n) {
    var g = genFloor(r.seed, n);
    var keepCleared = r.dg ? r.dg.clearedTotal : 0;
    r.dg = { hash: dgHash(g), shrines: g.shrines, floor: n, rooms: g.rooms, corridors: g.corridors, spikes: g.spikes, pits: g.pits, puddles: g.puddles, pillars: g.pillars, decor: g.decor, torches: g.torches,
             active: -1, stairs: null, visited: {}, clearedTotal: keepCleared, winT: 0, theme: DGT.themes[(n - 1) % DGT.themes.length] };
    var st = g.rooms[0];
    players.forEach(function (pl, i) { pl.x = pl.tx = st.cx + (i - (players.length - 1) / 2) * 18; pl.y = pl.ty = st.cy; pl.safeX = pl.x; pl.safeY = pl.y; });
    markVisited();
  }
  function inRect(x, y, rc, m) { m = m || 0; return x >= rc.x + m && x <= rc.x + rc.w - m && y >= rc.y + m && y <= rc.y + rc.h - m; }
  function inRoom(rm, x, y, m) { for (var i = 0; i < rm.parts.length; i++) if (inRect(x, y, rm.parts[i], m)) return true; return false; }
  function roomAt(x, y, m) { var rs = r.dg.rooms; for (var i = 0; i < rs.length; i++) if (inRoom(rs[i], x, y, m)) return rs[i]; return null; }
  function inPillar(x, y, m) { var ps = r.dg.pillars; for (var i = 0; i < ps.length; i++) { var o = ps[i]; if (x > o.x - m && x < o.x + o.w + m && y > o.y - m - 2 && y < o.y + o.h + m) return true; } return false; }
  function inCorridor(x, y, m) {
    var cs = r.dg.corridors;
    for (var i = 0; i < cs.length; i++) for (var j = 0; j < 3; j++) {
      var s = cs[i].segs[j];
      if (s.h1 ? (x >= s.x && x <= s.x + s.w && y >= s.y + m && y <= s.y + s.h - m) : (y >= s.y && y <= s.y + s.h && x >= s.x + m && x <= s.x + s.w - m)) return true;
    }
    return false;
  }
  // sol sous un point (salles, bras, couloirs), sans marge
  function onFloor(x, y, only) {
    if (only) return inRoom(only, x, y, 0);
    var dg = r.dg;
    for (var i = 0; i < dg.rooms.length; i++) if (inRoom(dg.rooms[i], x, y, 0)) return true;
    var cs = dg.corridors;
    for (i = 0; i < cs.length; i++) for (var j = 0; j < 3; j++) if (inRect(x, y, cs[i].segs[j], 0)) return true;
    return false;
  }
  // praticable si le point ET ses voisins (à 7 px) sont sur du sol : aucun raccord ne peut faire de mur invisible
  function walkable(x, y) {
    var dg = r.dg, m = 7, only = dg.active >= 0 ? dg.rooms[dg.active] : null;
    if (inPillar(x, y, 4)) return false;
    return onFloor(x, y, only) && onFloor(x - m, y, only) && onFloor(x + m, y, only) && onFloor(x, y - m, only) && onFloor(x, y + m, only) &&
           onFloor(x - 5, y - 5, only) && onFloor(x + 5, y - 5, only) && onFloor(x - 5, y + 5, only) && onFloor(x + 5, y + 5, only);
  }
  function dungeonMove(o, nx, ny) {
    if (r.dg.active >= 0 && !walkable(o.x, o.y)) { var rc = r.dg.rooms[r.dg.active].core; o.x = Math.max(rc.x + 14, Math.min(rc.x + rc.w - 14, o.x)); o.y = Math.max(rc.y + 14, Math.min(rc.y + rc.h - 14, o.y)); return; }
    if (walkable(nx, ny)) { o.x = nx; o.y = ny; return; }
    if (walkable(nx, o.y)) { o.x = nx; return; }
    if (walkable(o.x, ny)) { o.y = ny; }
  }
  // déplacement d'un ennemi : reste dans sa salle (ou dans les couloirs pour les rôdeurs), contourne les piliers
  function enemyOk(e, x, y) {
    var m = Math.min(6, e.d.r);
    if (inPillar(x, y, e.d.r - 2)) return false;
    if (!FLYERS[e.type] && !e.d.boss && Math.abs(e.kx) + Math.abs(e.ky) < 40 && pitAt(x, y + 2)) return false;
    if (e.room !== undefined) return inRoom(r.dg.rooms[e.room], x, y, m);
    for (var i = 0; i < r.dg.rooms.length; i++) if (r.dg.rooms[i].state !== "active" && inRoom(r.dg.rooms[i], x, y, m)) return true;
    return inCorridor(x, y, m);
  }
  function enemyConstrain(e, ox, oy) {
    if (e.d.boss && e.room === undefined) return;
    if (enemyOk(e, e.x, e.y)) return;
    var nx = e.x, ny = e.y;
    if (enemyOk(e, nx, oy)) { e.y = oy; return; }
    if (enemyOk(e, ox, ny)) { e.x = ox; return; }
    e.x = ox; e.y = oy;
    if (!enemyOk(e, ox, oy) && e.room !== undefined) { var rc = r.dg.rooms[e.room].core; e.x = Math.max(rc.x + 12, Math.min(rc.x + rc.w - 12, e.x)); e.y = Math.max(rc.y + 12, Math.min(rc.y + rc.h - 12, e.y)); }
  }
  var FLYERS = { wasp: 1, moth: 1, crow: 1, owl: 1, bat: 1, firefly: 1, queen: 1, mosquito: 1, woodpecker: 1, cockchafer: 1, jackdaw: 1, barnowl: 1, ladybug: 1, horsefly: 1, heron: 1, corbeau: 1, pivert: 1 };
  function pitAt(x, y) { var ps = r.dg.pits; for (var i = 0; i < ps.length; i++) if (inRect(x, y, ps[i], 3)) return ps[i]; return null; }
  function puddleAt(x, y) { var ps = r.dg.puddles; for (var i = 0; i < ps.length; i++) { var u = ps[i], ax = (x - u.x) / u.rx, ay = (y - u.y) / u.ry; if (ax * ax + ay * ay < 1) return u; } return null; }
  function spikeState(s) { var t = (r.time + s.off) % 2.6; return t >= 2.0 ? 2 : t >= 1.5 ? 1 : 0; }
  function spikeUpAt(x, y) { var ss = r.dg.spikes; for (var i = 0; i < ss.length; i++) { var s = ss[i]; if (x >= s.x && x < s.x + 16 && y >= s.y && y < s.y + 16 && spikeState(s) === 2) return true; } return false; }
  // le joueur local : chute dans un trou, flaques (côté hôte et invité)
  function dungeonFeet(pl, dt) {
    var pu = puddleAt(pl.x, pl.y + 3);
    pl.wet = pu ? pu.k : null;
    if (pitAt(pl.x, pl.y + 3)) {
      burst(pl.x, pl.y, "#120d0a", 10);
      pl.x = pl.tx = pl.safeX; pl.y = pl.ty = pl.safeY;
      if (pl === me) { banner("Tu tombes dans un trou !"); SND.hurt(); }
      pl.fell = 0.4;
      return;
    }
    if (!spikeUpAt(pl.x, pl.y + 3) && !pu) { pl.safeX = pl.x; pl.safeY = pl.y; }
  }
  // dégâts des dangers (hôte seulement)
  function dungeonHazards(dt) {
    var fl = r.dg.floor;
    players.forEach(function (pl) {
      if (pl.down) return;
      if (pl.remote && pitAt(pl.x, pl.y + 3)) { if (pl.inv <= 0) damagePlayer(pl.maxHp * 0.12, pl); return; }
      if (pl.fell > 0) { pl.fell = 0; damagePlayer(pl.maxHp * 0.12, pl); }
      if (spikeUpAt(pl.x, pl.y + 3)) damagePlayer(8 + fl * 3, pl);
      var pu = puddleAt(pl.x, pl.y + 3);
      if (pu && pu.k === "poison") { pl.poisonT = (pl.poisonT || 0) + dt; if (pl.poisonT >= 0.5) { pl.poisonT = 0; if (!pl.choosing) { pl.hp -= 2 + fl; burst(pl.x, pl.y, "#8ad24a", 3); } } }
    });
  }
  function enemyHazards(e, dt) {
    if (e.d.prop || e.under) return 1;
    if (!e.d.boss && !FLYERS[e.type] && pitAt(e.x, e.y + 2)) { burst(e.x, e.y, "#120d0a", 8); e.hp = 0; kill(e); return 0; }
    if (spikeUpAt(e.x, e.y + 2) && cooled(e, "spike", 0.6)) hurt(e, 12 + r.dg.floor * 6, 0, 0);
    var pu = puddleAt(e.x, e.y + 2);
    if (pu && !FLYERS[e.type]) { if (pu.k === "poison" && cooled(e, "poison", 0.5)) hurt(e, 3, 0, 0); return 0.6; }
    return 1;
  }
  // tir automatique seulement en combat (un ennemi proche)
  function inCombat(pl) {
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i]; if (e.dead || e.under) continue;
      var lim = e.d.prop ? 34 : 200;
      if (Math.abs(e.x - pl.x) < lim && Math.abs(e.y - pl.y) < lim) return true;
    }
    return false;
  }
  function markVisited() {
    var rm = roomAt(me.x, me.y, 0);
    if (rm && !r.dg.visited[rm.idx]) { r.dg.visited[rm.idx] = true; }
  }
  function roomLabel(rm) { return { elite: "Salle d'élite !", guard: "Le gardien de l'étage !", boss: "Le boss du donjon !" }[rm.type] || ""; }
  function dgPool() { return DGT.pools[Math.min(DGT.pools.length - 1, r.dg.floor - 1)]; }
  function freeSpot(rm, minD) {
    var x = rm.cx, y = rm.cy;
    for (var t = 0; t < 24; t++) {
      var pp = rm.parts[(Math.random() * rm.parts.length) | 0];
      var nx = pp.x + 18 + Math.random() * (pp.w - 36), ny = pp.y + 18 + Math.random() * (pp.h - 36);
      if (!inRoom(rm, nx, ny, 14) || pitAt(nx, ny) || inPillar(nx, ny, 10)) continue;
      x = nx; y = ny;
      if (players.every(function (pl) { return Math.hypot(pl.x - x, pl.y - y) > minD; })) break;
    }
    return { x: x, y: y };
  }
  function spawnInRoom(type, rm, kind) {
    var pt = freeSpot(rm, 70), e = spawnAt(type, pt.x, pt.y);
    e.room = rm.idx;
    var fl = r.dg.floor;
    if (kind === "elite") giveAffixes(e, DG.affixes(fl));
    else if (kind === "guard") { if (fl >= 2) giveAffixes(e, 1); }
    else if (kind === "boss") { e.hp *= DGT.finalHp || 1.3; e.maxHp = e.hp; giveAffixes(e, 1); if (type === DGT.final) e.dgFinal = true; }
    else if (fl >= 2 && Math.random() < 0.06) giveAffixes(e, 1);
    // petite fumée d'apparition
    burst(pt.x, pt.y, "#8a7a6a", 6);
    return e;
  }
  function spawnWave(rm) {
    var w = rm.waves.shift(); if (!w) return;
    w.forEach(function (it) { spawnInRoom(it[0], rm, it[1]); });
  }
  function activateRoom(rm, trigger) {
    var pool = dgPool(), wv = DG.waves(r.dg.floor), pick = function () { return pool[(Math.random() * pool.length) | 0]; };
    var normal = function (n) { var a = []; for (var i = 0; i < n; i++) a.push([pick(), ""]); return a; };
    rm.state = "active"; r.dg.active = rm.idx;
    if (rm.type === "combat") rm.waves = [normal(wv[0]), normal(wv[1])];
    else if (rm.type === "elite") { var el = []; for (var i = 0; i < 1 + (r.dg.floor >= 2 ? 1 : 0); i++) el.push([pick(), "elite"]); rm.waves = [el.concat(normal(3)), normal(wv[1])]; }
    var cop = function (t, k) { var a = []; for (var c = 0; c < 1 + (r.madness || 0); c++) a.push([t, k]); return a; };
    if (rm.type === "guard") rm.waves = [cop(DGT.guards[(r.dg.floor - 1) % DGT.guards.length], "guard").concat(normal(3)), normal(4)];
    else if (rm.type === "boss") rm.waves = [cop(DGT.final, "boss").concat(normal(4)), normal(6)];
    // toute l'équipe rejoint la salle avant la fermeture des portes
    players.forEach(function (pl) {
      if (inRoom(rm, pl.x, pl.y, 10) && !pitAt(pl.x, pl.y + 3)) return;
      var tx = Math.max(rm.core.x + 16, Math.min(rm.core.x + rm.core.w - 16, trigger.x + (Math.random() * 20 - 10)));
      var ty = Math.max(rm.core.y + 16, Math.min(rm.core.y + rm.core.h - 16, trigger.y + (Math.random() * 20 - 10)));
      if (pitAt(tx, ty + 3) || inPillar(tx, ty, 6)) { tx = rm.cx; ty = rm.cy; }
      pl.x = pl.tx = tx; pl.y = pl.ty = ty;
      if (pl.remote) netSend("tp", { id: pl.id, x: Math.round(tx), y: Math.round(ty) });
    });
    spawnWave(rm);
    var lb = roomLabel(rm); bannerAll(lb || "Les portes se ferment !");
    SND.boom();
  }
  function clearRoom(rm) {
    rm.state = "cleared"; r.dg.active = -1; r.dg.clearedTotal++;
    var c = { x: rm.cx, y: rm.cy };
    for (var i = 0; i < 3 + r.dg.floor; i++) drop("gold", c.x + Math.random() * 40 - 20, c.y + Math.random() * 30 - 15, 1);
    if (rm.type === "elite") { drop("chest", c.x - 10, c.y, 1); drop("relic", c.x + 12, c.y); dropItem(c.x, c.y + 14, 1); bannerAll("Salle d'élite vaincue !"); }
    else if (rm.type === "guard") { drop("relic", c.x, c.y + 20); r.dg.stairs = { x: c.x, y: rm.core.y + 30 }; bannerAll("L'escalier s'ouvre !"); }
    else if (rm.type === "boss") { r.dg.winT = 2.5; bannerAll("Le donjon est vaincu !"); }
    else bannerAll("Salle nettoyée");
    SND.level();
  }
  function populateFloor() {
    var pool = dgPool();
    r.dg.corridors.forEach(function (c) {
      if (!c.monsters || c.a === 0 || c.b === 0) return;
      for (var i = 0; i < c.monsters; i++) {
        var sg = c.segs[1], x = sg.x + 10 + Math.random() * (sg.w - 20), y = sg.y + 10 + Math.random() * (sg.h - 20);
        var e = spawnAt(pool[(Math.random() * pool.length) | 0], x, y); e.wander = true;
        if (Math.random() < 0.12) giveAffixes(e, 1);
      }
    });
    r.dg.rooms.forEach(function (rm) {
      if (rm.type === "start") return;
      var n = rm.type === "treasure" ? 2 : 1 + ((Math.random() * 2) | 0);
      for (var i = 0; i < n; i++) {
        var pt = freeSpot(rm, 0), d = Object.assign({}, PROP_D, { sprite: ["stump", "basket", "lantern"][(Math.random() * 3) | 0] });
        makeEnemy("prop", d, pt.x, pt.y, 14 * (1 + r.dg.floor * 0.5));
      }
    });
  }
  function dungeonTick(dt) {
    var dg = r.dg;
    if (dg.winT > 0) { dg.winT -= dt; if (dg.winT <= 0) { r.won = true; gameOver(false, "Victoire : le donjon est vaincu ! 🗝️"); } return; }
    if (dg.active < 0) {
      // entrée dans une salle
      for (var i = 0; i < players.length; i++) {
        var pl = players[i]; if (pl.down) continue;
        var rm = null;
        for (var ri = 0; ri < dg.rooms.length; ri++) if (dg.rooms[ri].state === "new" && inRect(pl.x, pl.y, dg.rooms[ri].core, 22)) { rm = dg.rooms[ri]; break; }
        if (!rm) continue;
        if (rm.type === "treasure") {
          rm.state = "cleared"; dg.clearedTotal++;
          drop("chest", rm.cx, rm.cy, 1); dropItem(rm.cx - 16, rm.cy + 8, 0); for (var k = 0; k < 6; k++) drop("gold", rm.cx + Math.random() * 50 - 25, rm.cy + Math.random() * 30 - 15, 2);
          if (Math.random() < 0.5) drop("relic", rm.cx + 16, rm.cy + 10);
          bannerAll("Salle au trésor !"); SND.level();
        } else activateRoom(rm, pl);
        break;
      }
    } else {
      var arm = dg.rooms[dg.active], left = 0;
      for (var j = 0; j < enemies.length; j++) { var e = enemies[j]; if (!e.dead && !e.d.prop && e.room === arm.idx) left++; }
      if (left <= 2 && arm.waves && arm.waves.length) spawnWave(arm);
      else if (left === 0 && (!arm.waves || !arm.waves.length)) clearRoom(arm);
    }
    dungeonHazards(dt);
    // escalier
    if (dg.stairs && players.some(function (pl) { return !pl.down && Math.hypot(pl.x - dg.stairs.x, pl.y - dg.stairs.y) < 14; })) nextFloor();
  }
  function nextFloor() {
    var n = r.dg.floor + 1;
    enemies = []; projs = []; hostile = []; lobs = []; warns = []; gems = []; zones = []; curBoss = null;
    buildFloor(n);
    players.forEach(function (pl) { if (pl.down) { pl.down = false; pl.reviveT = 0; } pl.hp = Math.min(pl.maxHp, pl.hp + pl.maxHp * DG.healOnStairs); });
    populateFloor();
    bannerAll("Étage " + n + " / " + DG.floors);
    netSend("floor", { n: n });
    SND.fusion();
  }
  function giveRelic(pl) {
    if (pl.owner) pl = pl.owner;
    var own = pl.relics || {}, left = D.RELICS.filter(function (x) { return !own[x.id]; });
    if (!left.length) { addGold(20); return; }
    var rl = left[(Math.random() * left.length) | 0];
    pl.relics[rl.id] = true; calc(pl); if (pl.owner) calc(pl.owner);
    if (pl === me || pl.owner === me) banner("Relique : " + rl.name + " (" + rl.desc + ")");
    netEv(["rl", pl.id, rl.id]);
    SND.fusion();
  }

  /* ---------- Arène : fin de manche, entracte, manche suivante ---------- */
  function roundModFor(n) {
    if (n % A.eliteEvery !== 0) return null;
    return A.mods[(n * 7 + 3) % A.mods.length];
  }
  function clearField() {
    enemies = enemies.filter(function (e) { return e.d.prop; });
    projs = []; hostile = []; lobs = []; warns = []; zones = []; curBoss = null;
  }
  // hôte / solo
  function endRound() {
    // les noisettes et l'or au sol sont ramassés, le reste disparaît
    gems.forEach(function (g) { if (g.kind === "xp") xp += g.v * me.xpMul; else if (g.kind === "gold") addGold(g.v); });
    gems = [];
    while (xp >= xpNext) { xp -= xpNext; r.level++; pending++; xpNext = need(r.level); }
    clearField();
    players.forEach(function (pl) { pl.down = false; pl.reviveT = 0; pl.hp = pl.maxHp; });
    var income = Math.round(A.income(r.round, r.roundKills) * ((r.mod && r.mod.income) || 1));
    r.roundKills = 0;
    if (r.round >= A.rounds) { r.won = true; bannerAll("Victoire !"); gameOver(false, "Victoire ! Les 20 manches sont gagnées 🏆"); return; }
    r.phase = "shop"; r.ready = {};
    netSend("round", { n: r.round, inc: income, lv: r.level });
    beginIntermission(income);
  }
  // commun : chaque joueur choisit ses pouvoirs puis passe à la boutique
  function beginIntermission(income) {
    var interest = Math.min(A.interestMax, Math.floor(me.coins / A.interestPer));
    // au plus « maxPicks » choix de pouvoir ; les niveaux en trop deviennent des noisettes
    var extra = Math.max(0, pending - A.maxPicks);
    pending -= extra;
    me.coins += income + interest + extra * A.extraLevelCoins;
    r.lastIncome = income; r.lastInterest = interest; r.lastExtra = extra;
    r.rerolls = 0; r.offers = null;
    clearInput();
    SND.level();
    if (pending > 0) openLevelUp(); else openShop();
  }
  function nextRound() {
    r.round++; r.roundT = 0; r.roundLen = A.roundTime(r.round); r.mod = roundModFor(r.round); r.phase = "fight"; r.ready = {};
    picking = false; me.choosing = false; hideCard();
    spawnAcc = 2;
    var label = "Manche " + r.round + (r.mod ? " · " + r.mod.name : "");
    if (r.round % A.bossEvery === 0) {
      var abl = D.ARENA_BOSSES || MAP.bosses, bt = abl[(Math.random() * abl.length) | 0];
      var pt = arenaEdgePoint(), be = spawnAt(bt, pt.x, pt.y); if (r.round >= 10) giveAffixes(be, r.round >= 20 ? 2 : 1); bossCount++;
      label += " · " + D.ENEMIES[bt].name + " !";
    }
    bannerAll(label);
    if (Net.on && Net.role === "host") netSend("next", { n: r.round, mod: r.mod ? r.mod.id : "" });
    last = performance.now();
  }
  function hostGoneCheck() {
    if (!Net.on || Net.role !== "guest" || !Net.started || !Net.hostGone || state === "over") return;
    var pr = Net.hostId && Net.peers[Net.hostId], now = Date.now();
    if (pr && pr.open && now - (pr.lastIn || 0) < 3000) return;          // l'hôte envoie encore en direct
    if (Net.cur && performance.now() - Net.cur.at < 3000) return;          // ou par le relais
    if (now - Net.hostGone > 6000) { Net.hostGone = 0; banner("L'hôte a quitté la partie"); gameOver(true, "L'hôte a quitté la partie."); }
  }
  setInterval(function () { try { hostGoneCheck(); } catch (e) { showError(e); } }, 1000);
  function dropMissing() {
    if (!Net.on || Net.role !== "host" || !Net.started || !Net.missing || !players.length) return;
    var now = Date.now(), gone = {};
    Object.keys(Net.missing).forEach(function (id) {
      var pr = Net.peers[id];
      if (pr && pr.open && pr.dc && pr.dc.readyState === "open" && now - (pr.lastIn || now) < 4000) return;   // toujours là en direct
      if (now - Net.missing[id] > 6000) { gone[id] = true; delete Net.missing[id]; }
    });
    if (!Object.keys(gone).length) return;
    players = players.filter(function (pl) { var oid = pl.owner ? pl.owner.id : pl.id; if (!gone[oid]) return true; if (!pl.owner) bannerAll(pl.name + " est parti"); return false; });
    Object.keys(gone).forEach(closePeer);
    playerLeft();
  }
  setInterval(function () { try { dropMissing(); } catch (e) { showError(e); } }, 1000);
  // un joueur a quitté en pleine partie : rien ne doit rester à l'attendre
  function playerLeft() {
    if (isArena() && r.phase === "shop" && players.every(function (pl) { return pl.twin || r.ready[pl.id]; })) nextRound();
    if (!alive().length) gameOver();
  }
  function markReady(id) {
    r.ready[id] = true;
    if (Net.on && Net.role === "host") {
      var all = players.every(function (pl) { return pl.twin || r.ready[pl.id]; });
      if (all) nextRound(); else if (screen === "ashop") openShop();
    }
  }
  function shopPrice(o) {
    var P = A.prices, g = 1 + A.priceGrowth * (r.round - 1), base;
    if (o.type === "f" || o.type === "pf" || o.type === "cb" || o.type === "evo") base = P.fusion;
    else if (o.type === "w") base = o.lvl === 1 ? P.newWeapon : P.upgrade + P.perLevel * o.lvl;
    else if (o.type === "p") base = P.item + P.perLevel * (o.lvl - 1);
    else if (o.type === "fullheal") base = P.heal;
    else base = P.maxhp;
    return Math.round(base * g);
  }
  function rollOffers() {
    p = me;
    var list = choices(4).filter(function (c) { return ["f", "w", "p", "evo", "pf", "cb"].indexOf(c.type) >= 0; });
    list.push(Math.random() < 0.5 ? { type: "fullheal" } : { type: "maxhp" });
    list.forEach(function (o) { o.price = shopPrice(o); o.sold = false; });
    r.offers = list;
  }
  function rerollCost() { return A.rerollBase + r.round + r.rerolls * 2; }
  function openShop() {
    if (!r.offers) rollOffers();
    picking = true; me.choosing = true; netMenuOpen = false;
    var waiting = r.ready[me.id];
    var html = '<span class="kicker">Fin de la manche ' + r.round + " / " + A.rounds + '</span><h2>Marché du terrier</h2>' +
      '<p class="coins-line"><b>' + me.coins + ' 🌰</b> <small>+' + (r.lastIncome || 0) + " revenu · +" + (r.lastInterest || 0) + " intérêts (1 par " + A.interestPer + " gardées, " + A.interestMax + " max)" +
        (r.lastExtra ? " · +" + r.lastExtra * A.extraLevelCoins + " pour " + r.lastExtra + " niveau" + (r.lastExtra > 1 ? "x" : "") + " en trop" : "") + "</small></p>" +
      '<div class="choices ashop">';
    r.offers.forEach(function (o, i) {
      var icon, name, desc, tag = "", cls = "choice offer", vo = v2Card(o);
      if (vo) { icon = img(vo.icon); name = vo.name; tag = vo.lvl; desc = vo.desc; cls += vo.cls; }
      else if (o.type === "f") { var f = D.FUSIONS[o.id]; icon = img(f.icon); name = f.name; tag = f.tier === 2 ? "Fusion légendaire" : "Fusion"; desc = f.desc[0]; cls += " is-fusion"; }
      else if (o.type === "w") { var w = ALLW[o.id]; icon = img(w.icon); name = w.name; tag = o.lvl === 1 ? "Nouvelle arme" : "Niv. " + o.lvl; desc = w.desc[o.lvl - 1]; }
      else if (o.type === "p") { icon = img(D.PASSIVES[o.id].sprite); name = D.PASSIVES[o.id].name; tag = o.lvl === 1 ? "Nouvel objet" : "Niv. " + o.lvl; desc = D.PASSIVES[o.id].desc; }
      else if (o.type === "fullheal") { icon = img("berry"); name = "Grand panier de baies"; desc = "Soigne tous tes PV."; tag = "Soin"; }
      else { icon = img("mushroom"); name = "Champignon fortifiant"; desc = "+10 PV max pour la partie."; tag = "Bonus"; }
      var can = !o.sold && !waiting && me.coins >= o.price;
      html += '<button type="button" class="' + cls + (o.sold ? " is-sold" : "") + '" data-action="abuy" data-arg="' + i + '"' + (can ? "" : " disabled") + ">" +
        '<span class="choice-icon">' + icon + '</span><span class="choice-text"><strong>' + esc(name) + "</strong><em>" + esc(tag) + "</em><span>" + esc(desc) + "</span>" +
        (o.type === "w" || o.type === "p" ? synHtml(o.id) : "") + "</span>" +
        '<span class="price">' + (o.sold ? "Acheté" : o.price + " 🌰") + "</span></button>";
    });
    html += "</div>";
    var nextMod = roundModFor(r.round + 1), nextBoss = (r.round + 1) % A.bossEvery === 0;
    if (nextMod || nextBoss) html += '<p class="next-round">⚠️ Manche ' + (r.round + 1) + " : " + (nextMod ? "<b>" + esc(nextMod.name) + "</b> (" + esc(nextMod.desc) + ")" : "") + (nextMod && nextBoss ? " · " : "") + (nextBoss ? "<b>boss</b>" : "") + "</p>";
    html += '<div class="btn-row center"><button class="btn btn-alt btn-small" type="button" data-action="areroll"' + (waiting || me.coins < rerollCost() ? " disabled" : "") + ">🎲 Relancer (" + rerollCost() + " 🌰)</button>";
    if (waiting) {
      var hs = players.filter(function (pl) { return !pl.twin; }), n = hs.filter(function (pl) { return r.ready[pl.id]; }).length;
      html += '<span class="waiting">En attente des autres… (' + n + "/" + hs.length + " prêts)</span>";
    } else html += '<button class="btn" type="button" data-action="aready" data-autofocus>▶ ' + (humans() > 1 ? "Prêt" : "Manche suivante") + "</button>";
    html += "</div>";
    showCard(html, "ashop");
  }
  ACTIONS_LATE.abuy = function (i) {
    var o = r.offers && r.offers[Number(i)];
    if (!o || o.sold || me.coins < o.price || r.ready[me.id]) return;
    me.coins -= o.price; o.sold = true;
    p = me;
    var c = o.type === "fullheal" ? { type: "fullheal" } : o.type === "maxhp" ? { type: "maxhp" } : { type: o.type, id: o.id, lvl: o.lvl, evo: o.evo, rec: o.rec };
    applyCore(c); refreshCounts();
    if (Net.on && Net.role === "guest") netSend("pick", { id: me.id, c: c });
    // les offres restantes qui ne sont plus valables (déjà au niveau, fusion faite) sont marquées vendues
    r.offers.forEach(function (x) {
      if (x.sold || !x.id) return;
      if (x.type === "w" && ((p.weapons[x.id] || 0) >= x.lvl || p.consumed[x.id])) x.sold = true;
      if (x.type === "p" && (p.passives[x.id] || 0) >= x.lvl) x.sold = true;
      if (x.type === "f" && p.weapons[x.id]) x.sold = true;
      if (x.type === "evo" && (p.evo || {})[x.id]) x.sold = true;
      if (x.type === "pf" && (p.tfus || {})[x.id]) x.sold = true;
      if (x.type === "cb" && (p.weapons[x.id] || !comboReady(p, x.id))) x.sold = true;
    });
    SND.gold(); openShop();
  };
  ACTIONS_LATE.areroll = function () {
    var c = rerollCost(); if (me.coins < c || r.ready[me.id]) return;
    me.coins -= c; r.rerolls++; rollOffers(); SND.click(); openShop();
  };
  ACTIONS_LATE.aready = function () {
    if (humans() === 1) { nextRound(); return; }
    if (Net.role === "guest") { r.ready[me.id] = true; netSend("rdy", { id: me.id }); openShop(); return; }
    markReady(me.id);
  };
  function tickFx(dt) {
    for (var i = fx.length - 1; i >= 0; i--) {
      var f = fx[i]; f.life -= dt;
      if (f.kind === "dot") { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.9; f.vy *= 0.9; }
      if (f.life <= 0) fx.splice(i, 1);
    }
    for (i = texts.length - 1; i >= 0; i--) { texts[i].life -= dt; texts[i].y -= 18 * dt; if (texts[i].life <= 0) texts.splice(i, 1); }
    shake = Math.max(0, shake - dt);
  }
  /* ---------- Coffres : ouverture animée, la rareté se révèle pendant l'animation ---------- */
  var CHEST_TIERS = [{ n: 1, name: "Coffre" }, { n: 3, name: "Coffre rare !" }, { n: 5, name: "Coffre légendaire !!" }];
  var CHEST_ODDS = [[0.20, 0.05], [0.30, 0.10], [0.40, 0.16]]; // [violet, doré] : butin, élite/trésor, boss
  var CHEST_GOLD = [10, 25, 60];
  var chestQueue = [], chestOpen = null, chestSilent = false, ROUL = null;
  function grantChest(src) { chestQueue.push(rollChestTier(src || 0)); }
  function rollChestTier(src) {
    var o = CHEST_ODDS[Math.min(2, src)], L = Math.min(2, me.luck || 1), x = Math.random();
    if (x < o[1] * L) return 2;
    if (x < (o[0] + o[1]) * L) return 1;
    return 0;
  }
  function chestPick() {
    var f = readyFusions(); if (f.length) return { type: "f", id: f[0] };
    var pool = [];
    Object.keys(p.weapons).forEach(function (k) { if (p.weapons[k] < MAX_LVL) pool.push({ type: "w", id: k, lvl: p.weapons[k] + 1 }); });
    Object.keys(p.passives).forEach(function (k) { if (p.passives[k] < MAX_LVL) pool.push({ type: "p", id: k, lvl: p.passives[k] + 1 }); });
    if (pool.length) return pool[(Math.random() * pool.length) | 0];
    var c = choices(1)[0];
    return c.type === "heal" ? (Math.random() < 0.5 ? { type: "heal" } : { type: "gold" }) : c;
  }
  function rewardInfo(c) {
    if (c.type === "f") { var f = D.FUSIONS[c.id]; return { icon: f.icon, name: f.name, sub: f.tier === 2 ? "Légendaire !" : "Fusion !", fx: true }; }
    var vc = v2Card(c); if (vc) return { icon: vc.icon, name: vc.name, sub: vc.lvl, fx: c.type !== "w" };
    if (c.type === "p") { var ps = D.PASSIVES[c.id]; return { icon: ps.sprite, name: ps.name, sub: c.lvl === 1 ? "Nouvel objet" : "Niv. " + c.lvl }; }
    if (c.type === "heal") return { icon: "berry", name: "Baies", sub: "+40 PV" };
    return { icon: "goldbag", name: "Bourse", sub: "+15 glands" };
  }
  function rouletteIcon() {
    if (!ROUL) {
      ROUL = [];
      Object.keys(ALLW).forEach(function (k) { if (SPR[ALLW[k].icon]) ROUL.push(ALLW[k].icon); });
      Object.keys(D.PASSIVES).forEach(function (k) { if (SPR[D.PASSIVES[k].sprite]) ROUL.push(D.PASSIVES[k].sprite); });
    }
    return ROUL[(Math.random() * ROUL.length) | 0];
  }
  var croot = null, chestMini = null;
  function chestMiniEl() {
    if (!chestMini) { chestMini = document.createElement("div"); chestMini.className = "chest-mini"; chestMini.hidden = true; chestMini.setAttribute("aria-hidden", "true"); stage.appendChild(chestMini); }
    return chestMini;
  }
  function chestHideMini() { if (chestMini) { chestMini.hidden = true; chestMini.innerHTML = ""; } }
  function openChest() {
    p = me;
    var tier = chestQueue.shift(), T = CHEST_TIERS[tier], items = [], i;
    // en multijoueur : petit bandeau en haut de l'écran, le jeu continue
    var mini = humans() > 1;
    if (!mini) { if (isArena()) { picking = true; me.choosing = true; sendInput(); } else state = "levelup"; clearInput(); }
    // les gains sont tirés et appliqués tout de suite, l'animation ne fait que les révéler
    chestSilent = true;
    for (i = 0; i < T.n; i++) {
      var c = chestPick(); applyCore(c); refreshCounts(); items.push(c);
      if (Net.on && Net.role === "guest") netSend("pick", { id: me.id, c: { type: c.type, id: c.id, lvl: c.lvl } });
    }
    chestSilent = false;
    var g0 = r.gold; addGold(CHEST_GOLD[tier]);
    var slots = "";
    for (i = 0; i < T.n; i++) slots += '<div class="cslot" data-cslot="' + i + '"><div class="cslot-box"><img alt="" src="' + spriteUrl(rouletteIcon()) + '"></div><b></b><em></em></div>';
    var html = '<div class="chest-stage t0" data-cstage data-action="chestok">' +
      '<div class="chest-rays"></div><div class="chest-flash"></div>' +
      '<div class="chest-title" data-ctitle>? ? ?</div>' +
      '<div class="chest-box drop" data-cbox><img src="' + spriteUrl("chest") + '" alt=""></div>' +
      '<div class="chest-parts" data-cparts></div>' +
      '<div class="chest-items n' + T.n + '">' + slots + "</div>" +
      '<div class="chest-gold" data-cgold>+0 ' + goldIc() + "</div></div>" +
      (mini ? "" : '<div class="btn-row center"><button class="btn btn-ghost btn-small" type="button" data-action="chestok" data-cok>Passer ⏩</button></div>');
    if (mini) { croot = chestMiniEl(); croot.innerHTML = html; croot.hidden = false; }
    else { showCard(html, "chest"); croot = card; }
    var co = chestOpen = { tier: tier, items: items, gold: Math.round(r.gold - g0), shown: 0, t: [], done: false, mini: mini };
    function at(ms, fn) { co.t.push(setTimeout(function () { if (chestOpen !== co) return; if (co.mini ? state !== "play" && state !== "levelup" : screen !== "chest") return; fn(); }, ms)); }
    var st = croot.querySelector("[data-cstage]"), box = croot.querySelector("[data-cbox]");
    SND.boom();
    // 1. le coffre tremble de plus en plus ; il change de couleur s'il est plus rare
    var shakeEnd = 1300 + tier * 900;
    at(450, function () { box.classList.remove("drop"); box.classList.add("shake1"); st.classList.add("rays-on"); });
    for (var k = 0; 450 + k * 95 < shakeEnd; k++) (function (k) { at(450 + k * 95, function () { sfx(100 + k * 8, 0.06, "square", 0.025); }); })(k);
    if (tier >= 1) at(1300, function () { chestTier(st, 1); });
    if (tier >= 2) at(2200, function () { chestTier(st, 2); });
    at(shakeEnd - 380, function () { box.classList.remove("shake1"); box.classList.add("shake2"); });
    // 2. ouverture
    at(shakeEnd, function () { chestBurst(co); });
    // 3. une roulette par objet, la dernière fait durer le suspense
    var t0 = shakeEnd + 600;
    items.forEach(function (c, i) {
      var dur = items.length > 1 && i === items.length - 1 ? 1400 : i === 0 ? 1000 : 560;
      chestRoll(co, i, t0, dur, at);
      t0 += dur + 160;
    });
    at(t0 + 100, function () { chestFinish(co, true); });
  }
  function chestTier(st, n) {
    st.classList.remove("t0", "t1", "t2", "flash"); st.classList.add("t" + n);
    void st.offsetWidth; st.classList.add("flash");
    croot.classList.remove("cshake"); void croot.offsetWidth; croot.classList.add("cshake");
    sfx(n === 2 ? 330 : 220, 0.45, "sawtooth", 0.05, 4);
    arp(n === 2 ? [659, 831, 988, 1319] : [523, 659, 784], 70, "triangle", 0.05);
    var t = croot.querySelector("[data-ctitle]"); if (t) t.textContent = n === 2 ? "! ! !" : "! ? !";
  }
  function chestBurst(co) {
    var st = croot.querySelector("[data-cstage]"), box = croot.querySelector("[data-cbox]"), parts = croot.querySelector("[data-cparts]"), t = croot.querySelector("[data-ctitle]");
    if (!st) return;
    box.classList.remove("shake1", "shake2", "drop"); box.classList.add("open");
    box.querySelector("img").src = spriteUrl("chestopen");
    st.classList.add("open"); st.classList.remove("flash"); void st.offsetWidth; st.classList.add("flash");
    t.textContent = CHEST_TIERS[co.tier].name; t.classList.add("show");
    croot.classList.remove("cshake"); void croot.offsetWidth; croot.classList.add("cshake");
    var cols = [["#4aa3df", "#bfe6ff", "#f6d36b"], ["#b07cf0", "#e6d2ff", "#f6d36b"], ["#f6c445", "#fff3b0", "#ff9a3d"]][co.tier], html = "";
    for (var i = 0; i < 18 + co.tier * 14; i++) {
      var a = Math.random() * Math.PI * 2, d = 60 + Math.random() * (110 + co.tier * 40);
      html += '<i style="--dx:' + Math.round(Math.cos(a) * d) + "px;--dy:" + Math.round(Math.sin(a) * d - 40) + "px;--r:" + Math.round(Math.random() * 720) + "deg;--s:" + (3 + ((Math.random() * 4) | 0)) + "px;--c:" + cols[i % 3] + ";animation-delay:" + Math.round(Math.random() * 120) + 'ms"></i>';
    }
    parts.innerHTML = html;
    SND.boom(); arp([523, 659, 784, 1047, 1319].slice(0, 3 + co.tier), 60, "square", 0.045);
  }
  function chestRoll(co, i, start, dur, at) {
    var el = croot.querySelector('[data-cslot="' + i + '"]'); if (!el) return;
    var im = el.querySelector("img");
    at(start, function () { el.classList.add("spin"); });
    for (var tt = 0, k = 0; tt < dur; k++, tt += 45 + Math.pow(tt / dur, 2) * 230) (function (k, tt) {
      at(start + tt, function () { im.src = spriteUrl(rouletteIcon()); sfx(480 + k * 22, 0.03, "square", 0.018); });
    })(k, tt);
    at(start + dur, function () { chestLand(co, i, true); });
  }
  function chestLand(co, i, loud) {
    var el = croot.querySelector('[data-cslot="' + i + '"]'); if (!el || el.classList.contains("landed")) return;
    var info = rewardInfo(co.items[i]);
    el.querySelector("img").src = spriteUrl(info.icon);
    el.classList.remove("spin"); el.classList.add("landed"); if (info.fx) el.classList.add("fx");
    el.querySelector("b").textContent = info.name; el.querySelector("em").textContent = info.sub;
    co.shown++;
    var g = croot.querySelector("[data-cgold]");
    if (g) { g.innerHTML = "+" + Math.round(co.gold * co.shown / co.items.length) + " " + goldIc(); g.classList.remove("bump"); void g.offsetWidth; g.classList.add("bump"); }
    if (loud) { if (info.fx) SND.fusion(); else { sfx(880 + co.tier * 220, 0.14, "triangle", 0.05); SND.gold(); } }
  }
  function chestFinish(co, natural) {
    if (co.done) return;
    co.done = true;
    if (!natural) {
      co.t.forEach(clearTimeout); co.t = [];
      var st = croot.querySelector("[data-cstage]");
      if (st) { st.classList.add("rays-on"); if (!st.classList.contains("open")) { if (co.tier) chestTier(st, co.tier); chestBurst(co); } }
      co.items.forEach(function (c, i) { chestLand(co, i, false); });
      if (co.items.some(function (c) { return c.type === "f"; })) SND.fusion();
    }
    if (co.mini) { co.t.push(setTimeout(function () { if (chestOpen === co) closeChest(); }, natural ? 1800 : 600)); return; }
    var ok = croot.querySelector("[data-cok]");
    if (ok) { ok.textContent = "Continuer"; ok.className = "btn"; ok.focus({ preventScroll: true }); }
  }
  function closeChest() {
    var co = chestOpen; if (!co) return;
    co.t.forEach(clearTimeout); chestOpen = null;
    if (co.mini) { var el = chestMiniEl(); el.classList.add("out"); setTimeout(function () { if (!chestOpen || !chestOpen.mini) { el.hidden = true; el.innerHTML = ""; } el.classList.remove("out"); }, 250); return; }
    if (chestQueue.length && !me.down && state !== "over") { openChest(); return; }
    if (picking) { picking = false; me.choosing = false; hideCard(); sendInput(); }
    else { state = "play"; hideCard(); last = performance.now(); }
  }
  function chestCheck() {
    if (chestOpen && !chestOpen.mini && screen !== "chest") { chestOpen.t.forEach(clearTimeout); chestOpen = null; }
    if (chestQueue.length && !chestOpen && (humans() > 1 || !picking) && !me.down && state === "play" && !(isArena() && r.phase === "shop")) openChest();
  }
  function collect(g, pl) {
    pl = pl || me;
    switch (g.kind) {
      case "xp": r.nuts = (r.nuts || 0) + 1; if (pl.packN && itn(pl, "bracelet")) g.v *= 1 + 0.1 * itn(pl, "bracelet"); if (pl.char && pl.char.id === "pataud") { pl.size = (pl.size || 1) + 0.006 * (pl.posture === "goinfre" && pl.mstate === "mouvement" ? 2 : 1); if (cooled(pl, "patcalc", 1)) calc(pl); }
        xp += g.v * pl.xpMul * (tal(pl, "pochespleines") && pl.mstate === "mouvement" ? 1.15 : 1); if (pl === me) SND.pick(); recruit(pl, g.v);
        if (tal(pl, "avarice")) { pl.avar = (pl.avar || 0) + 1; if (pl.avar >= 30) { pl.avar = 0; var ppa = p; p = pl; fireNova(55 * pl.area, 30 * gpw()); p = ppa; } }
        break;
      case "gold": addGold(g.v * (pl.goldX || 1)); if (pl === me) SND.gold(); break;
      case "berry": pl.hp = Math.min(pl.maxHp, pl.hp + 25); if (pl === me) { r.berries++; SND.level(); } break;
      case "magnet": gems.forEach(function (o) { if (o.kind === "xp" || o.kind === "gold") o.pull = 120; }); bannerAll("Aspirateur à noisettes !"); SND.level(); break;
      case "xpjar": xp += xpNext * 0.75; bannerAll("Pot d'expérience !"); SND.level(); break;
      case "goldbag": addGold(8 + Math.floor(r.time / 30)); SND.gold(); break;
      case "freeze": r.freeze = 5; bannerAll("Givre !"); SND.zap(); break;
      case "bomb": nuke(); bannerAll("Gland explosif !"); break;
      case "relic": giveRelic(pl); break;
      case "item": giveItem(pl, D.ITEMS[g.v].id); break;
      case "chest":
        addGold(15); burst(pl.x, pl.y, "#f2c230", 16);
        netEv(["ch", g.v || 0]);
        grantChest(g.v || 0); if (itn(pl, "de_demon")) grantChest(g.v || 0);
        break;
    }
  }
  function updateBullet(q, dt) {
    if (q.homing) {
      q.retarget = (q.retarget || 0) - dt;
      if (q.retarget <= 0) { q.retarget = 0.25; q.target = nearest(1, 90, q)[0] || null; }
      if (q.target && !q.target.dead) {
        var spd = Math.hypot(q.vx, q.vy), a = Math.atan2(q.vy, q.vx), want = Math.atan2(q.target.y - q.y, q.target.x - q.x);
        var diff = Math.atan2(Math.sin(want - a), Math.cos(want - a));
        a += Math.max(-5 * dt, Math.min(5 * dt, diff));
        q.vx = Math.cos(a) * spd; q.vy = Math.sin(a) * spd;
      }
    }
    q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt;
    if (q.rehit) { q.rhT = (q.rhT || q.rehit) - dt; if (q.rhT <= 0) { q.rhT = q.rehit; q.hit = []; } }
    if (q.collect) for (var gi = 0; gi < gems.length; gi++) { var gg = gems[gi]; if (gg.kind === "xp" && Math.abs(gg.x - q.x) < 16 && Math.abs(gg.y - q.y) < 16) gg.pull = 200; }
    near(q.x, q.y, 16, function (en) {
      if (q.pierce <= 0 || q.hit.indexOf(en.id) >= 0) return;
      if (Math.abs(en.x - q.x) > en.d.r + q.r || Math.abs(en.y - q.y) > en.d.r + q.r) return;
      q.hit.push(en.id); if (!(q.bec && en.d.prop)) q.pierce--;
      hurt(en, q.dmg * shieldBlock(en, q.vx, q.vy), q.vx * 0.5, q.vy * 0.5);
      if (q.hfx) bulletFx(q, en);
      if (q.explode) { explode(q.x, q.y, q.explode, q.dmg * 0.6, 0); q.pierce = 0; }
      if (q.pierce <= 0) return false;
    });
  }
  function updateBoomerang(q, dt) {
    var spd;
    var sk = p.sigK || {};
    if (q.yoyo) fx.push({ kind: "beam", x: p.x, y: p.y - 2, a: Math.atan2(q.y - p.y + 2, q.x - p.x), len: Math.hypot(q.x - p.x, q.y - p.y + 2), w: 0.5, life: 0.03, max: 0.03, col: "253,243,222" });
    if (sk.fireTrail) { q.trailD = (q.trailD || 0) + 1; if (q.trailD >= 6) { q.trailD = 0; pZone({ x: q.x, y: q.y, r: 7, dur: 1.6, kind: "fire", owner: p, pdmg: 3 * gpw(), elem: "feu" }); } }
    if (!q.back) {
      spd = q.fast ? 200 : Math.max(40, 170 * (1 - q.dist / q.range));
      q.x += q.vx * spd * dt; q.y += q.vy * spd * dt; q.dist += spd * dt;
      if (q.dist >= q.range * 0.95) { q.back = true; q.dist = 0; }
    } else {
      spd = Math.min(220, 60 + q.dist * 1.5);
      var bx = p.x - q.x, by = p.y - q.y, bd = Math.hypot(bx, by) || 1;
      q.x += bx / bd * spd * dt; q.y += by / bd * spd * dt; q.dist += spd * dt;
      if (bd < 6) { q.life = 0; if (sk.redBlade) p.redSt = Math.min(5, (p.redSt || 0) + 1); }
    }
    q.life -= dt; q.zapT -= dt;
    near(q.x, q.y, 16, function (en) {
      if (Math.abs(en.x - q.x) > en.d.r + 4 || Math.abs(en.y - q.y) > en.d.r + 4) return;
      if (!cooled(en, "b" + q.sprite, 0.35)) return;
      if (q.back && setCount(p, "aigle") >= 3) { hurt(en, q.dmg, 0, 0); }
      if (q.ar && q.back && q.elem && en.mark && en.markT > 0 && !en.d.prop) react(en, en.mark, en.mark === q.elem ? nextElem(q.elem) : q.elem, true);
      if (sk.stunOut && !q.back && !en.d.boss && !en.d.prop) { en.stunT = Math.max(en.stunT || 0, 0.5); en.slowT = Math.max(en.slowT || 0, 0.5); en.slow = 1; }
      hurt(en, q.dmg, q.vx * 40, q.vy * 40);
      if (q.chain && q.zapT <= 0 && !en.d.prop) { q.zapT = 0.25; zapChain(chainNext(en, [en.id]), q.chain, q.dmg * 0.5, en); SND.zap(); }
    });
  }
  function updateRocket(q, dt) {
    if (!q.target || q.target.dead) { q.retarget = (q.retarget || 0) - dt; if (q.retarget <= 0) { q.retarget = 0.2; q.target = nearest(1, 220, q)[0] || null; } }
    if (q.target && !q.target.dead) {
      var want = Math.atan2(q.target.y - q.y, q.target.x - q.x), diff = Math.atan2(Math.sin(want - q.ang), Math.cos(want - q.ang));
      q.ang += Math.max(-6 * dt, Math.min(6 * dt, diff));
    }
    q.spd = Math.min(q.max, q.spd + 220 * dt);
    q.x += Math.cos(q.ang) * q.spd * dt; q.y += Math.sin(q.ang) * q.spd * dt;
    q.life -= dt;
    if (Math.random() < 0.6) fx.push({ kind: "dot", x: q.x - Math.cos(q.ang) * 4, y: q.y - Math.sin(q.ang) * 4, vx: 0, vy: -6, life: 0.3, color: "rgba(220,220,220,.7)" });
    var boom = q.life <= 0;
    if (!boom) near(q.x, q.y, 14, function (en) {
      if (Math.abs(en.x - q.x) > en.d.r + 3 || Math.abs(en.y - q.y) > en.d.r + 3) return;
      boom = true; return false;
    });
    if (boom) { q.life = 0; explode(q.x, q.y, q.rad, q.dmg, 0); }
  }

  /* =====================================================================
     Dessin
     ===================================================================== */
  function hash(x, y) {
    var h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  }
  function drawDecor(kind, G, sx, sy, ox, oy, h) {
    if (kind === "bush") {
      ctx.fillStyle = G.bush; ctx.fillRect(sx + ox - 2, sy + oy + 1, 9, 4); ctx.fillRect(sx + ox - 1, sy + oy - 1, 7, 3);
      ctx.fillStyle = G.bushHi; ctx.fillRect(sx + ox, sy + oy - 1, 3, 1); ctx.fillRect(sx + ox + 3, sy + oy + 1, 2, 1);
    } else if (kind === "bigshroom") {
      ctx.fillStyle = (h >>> 5) % 2 ? "#c8553d" : "#9a7fd1"; ctx.fillRect(sx + ox - 1, sy + oy, 7, 2); ctx.fillRect(sx + ox, sy + oy - 1, 5, 1);
      ctx.fillStyle = "#fdf3de"; ctx.fillRect(sx + ox + 1, sy + oy, 1, 1); ctx.fillRect(sx + ox + 4, sy + oy + 1, 1, 1);
      ctx.fillStyle = "#f3e1c0"; ctx.fillRect(sx + ox + 2, sy + oy + 2, 2, 3);
    } else if (kind === "water" || kind === "pond") {
      var big = kind === "pond" ? 2 : 1;
      ctx.fillStyle = G.water; ctx.fillRect(sx + ox - 2 * big, sy + oy + 1, 10 * big, 4 + big); ctx.fillRect(sx + ox, sy + oy, 6 * big, 6 + big);
      ctx.fillStyle = G.waterHi; ctx.fillRect(sx + ox + 1, sy + oy + 1, 3, 1);
    } else if (kind === "reeds") {
      ctx.fillStyle = G.reed; ctx.fillRect(sx + ox, sy + oy - 3, 1, 7); ctx.fillRect(sx + ox + 2, sy + oy - 5, 1, 9); ctx.fillRect(sx + ox + 4, sy + oy - 2, 1, 6);
      ctx.fillStyle = G.reedHi; ctx.fillRect(sx + ox + 2, sy + oy - 6, 1, 2); ctx.fillRect(sx + ox, sy + oy - 4, 1, 2);
    } else if (kind === "rock") {
      ctx.fillStyle = OUT; ctx.fillRect(sx + ox - 1, sy + oy + 3, 8, 1);
      ctx.fillStyle = G.rock; ctx.fillRect(sx + ox - 1, sy + oy, 8, 3); ctx.fillRect(sx + ox, sy + oy - 1, 6, 1);
      ctx.fillStyle = G.rockHi; ctx.fillRect(sx + ox, sy + oy - 1, 3, 1);
    }
  }
  function drawGround(cx, cy, M) {
    var T = 16;
    var tx0 = Math.floor(cx / T) - 1, ty0 = Math.floor(cy / T) - 1, tx1 = tx0 + Math.ceil(W / T) + 2, ty1 = ty0 + Math.ceil(H / T) + 2;
    for (var ty = ty0; ty <= ty1; ty++) for (var tx = tx0; tx <= tx1; tx++) {
      var B = M.biomes[biomeAtTile(tx, ty, M)], G = B.ground;
      var sx = Math.round(tx * T - cx), sy = Math.round(ty * T - cy);
      ctx.fillStyle = hash(tx >> 2, ty >> 2) % 3 === 0 ? G.patch : G.base; ctx.fillRect(sx, sy, T, T);
    }
    for (ty = ty0; ty <= ty1; ty++) for (tx = tx0; tx <= tx1; tx++) {
      B = M.biomes[biomeAtTile(tx, ty, M)]; G = B.ground;
      sx = Math.round(tx * T - cx); sy = Math.round(ty * T - cy);
      var h = hash(tx, ty), k = h % 23, ox = (h >>> 8) % 12, oy = (h >>> 12) % 12;
      if (B.decor && (k === 12 || k === 13 || (B.decor === "pond" && k >= 9 && k <= 11))) { drawDecor(B.decor, G, sx, sy, ox, oy, h); continue; }
      if (k < 5) {
        ctx.fillStyle = G.tuft; ctx.fillRect(sx + ox, sy + oy, 1, 2); ctx.fillRect(sx + ox + 2, sy + oy - 1, 1, 3); ctx.fillRect(sx + ox + 4, sy + oy, 1, 2);
        ctx.fillStyle = G.hi; ctx.fillRect(sx + ox + 2, sy + oy - 1, 1, 1);
      } else if (k < 7) {
        ctx.fillStyle = G.flowers[(h >>> 16) % 4];
        ctx.fillRect(sx + ox + 1, sy + oy, 1, 1); ctx.fillRect(sx + ox, sy + oy + 1, 3, 1); ctx.fillRect(sx + ox + 1, sy + oy + 2, 1, 1);
        ctx.fillStyle = G.tuft; ctx.fillRect(sx + ox + 1, sy + oy + 3, 1, 2);
      } else if (k === 7) {
        ctx.fillStyle = G.pebbleDk; ctx.fillRect(sx + ox, sy + oy + 1, 5, 2);
        ctx.fillStyle = G.pebble; ctx.fillRect(sx + ox + 1, sy + oy, 3, 2);
      } else if (k === 8 && (h >>> 20) % 3 === 0) {
        ctx.fillStyle = G.shroom; ctx.fillRect(sx + ox, sy + oy, 3, 1); ctx.fillRect(sx + ox - 1, sy + oy + 1, 5, 1);
        ctx.fillStyle = "#f3e1c0"; ctx.fillRect(sx + ox + 1, sy + oy + 2, 1, 2);
      } else if (k < 12) {
        ctx.fillStyle = G.hi; ctx.fillRect(sx + ox, sy + oy, 1, 1);
      }
    }
  }
  function blit(s, x, y, flip, white) {
    ctx.drawImage(white ? (flip ? s.wf : s.wc) : (flip ? s.f : s.c), Math.round(x - s.w / 2), Math.round(y - s.h / 2));
  }
  function shadow(x, y, w) {
    ctx.fillStyle = "rgba(20,30,15,.25)";
    ctx.fillRect(Math.round(x - w / 2), Math.round(y), Math.round(w), 2);
    ctx.fillRect(Math.round(x - w / 2 + 1), Math.round(y - 1), Math.max(1, Math.round(w - 2)), 4);
  }
  function drawHero(sprName, x, y, face, moving, anim, inv) {
    var frames = SPR[sprName], fly = frames.flying;
    var frame = (moving || fly) ? ((anim | 0) % frames.length) : 0, s = frames[frame];
    var lift = fly ? 6 + Math.sin(anim * 0.8) * 1.5 : 0;
    shadow(x, y + 6, fly ? 8 : 10);
    if (inv > 0 && ((inv * 20) | 0) % 2) return;
    blit(s, x, y - lift - (moving && !fly && frame ? 1 : 0), face < 0);
  }
  var MATE_COL = ["#f6d36b", "#7fd1c7", "#f29ad8", "#9cc56b", "#f2b05e", "#c9b3ff"];
  function mateColor(pl) { return MATE_COL[Math.max(0, players.indexOf(pl)) % MATE_COL.length]; }
  function drawPlayer(pl) {
    var multi = players.length > 1;
    if (pl.down) {
      shadow(pl.x, pl.y + 6, 10);
      ctx.globalAlpha = 0.55; blit(SPR[pl.sprite][0], pl.x, pl.y + 2, pl.face < 0, true); ctx.globalAlpha = 1;
      var k = Math.min(1, pl.reviveT / 3);
      ctx.strokeStyle = "rgba(255,90,60,.9)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(pl.x, pl.y, 22, 18, 0, 0, TAU); ctx.stroke();
      if (k > 0) { ctx.strokeStyle = "#9cc56b"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pl.x, pl.y - 14, 5, -Math.PI / 2, -Math.PI / 2 + k * TAU); ctx.stroke(); }
      drawText("!", pl.x, pl.y - 18 + Math.sin(r.time * 8), "#ff5a3a", "c");
    } else {
      drawStates(pl);
      drawCharFx(pl);
      var szs = pl.size > 1 ? pl.size : 1, inv0 = pl.invis || pl.ghostT > 0;
      if (szs > 1) { ctx.save(); ctx.translate(pl.x, pl.y + 7); ctx.scale(szs, szs); ctx.translate(-pl.x, -pl.y - 7); }
      if (inv0) ctx.globalAlpha = 0.35;
      if (pl.mount && SPR[pl.mount]) {
        var ms = SPR[pl.mount][pl.moving ? ((pl.anim * 1.5) | 0) % SPR[pl.mount].length : 0];
        shadow(pl.x, pl.y + 9, ms.w * 0.8);
        blit(ms, pl.x, pl.y + 7, pl.face < 0);
        drawHero(pl.sprite, pl.x, pl.y - 3, pl.face, false, pl.anim, pl.inv);
      } else
      drawHero(pl.sprite, pl.x, pl.y, pl.face, pl.moving, pl.anim, pl.inv);
      if (inv0) ctx.globalAlpha = 1;
      if (szs > 1) ctx.restore();
      if (pl.shield) { ctx.strokeStyle = "rgba(156,197,107,.8)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(pl.x, pl.y, 10, 9, 0, 0, TAU); ctx.stroke(); }
      if (pl.oshield > 0) { ctx.strokeStyle = "rgba(220,240,160," + (0.5 + 0.3 * Math.sin(r.time * 6)) + ")"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(pl.x, pl.y, 12, 11, 0, 0, TAU); ctx.stroke(); }
      if (pl.choosing) {
        ctx.fillStyle = "rgba(230,246,250,.18)"; ctx.strokeStyle = "rgba(230,246,250,.8)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(pl.x, pl.y - 2, 13, 12, 0, 0, TAU); ctx.fill(); ctx.stroke();
        if (multi) {
          ctx.fillStyle = "rgba(127,209,199,.10)"; ctx.strokeStyle = "rgba(127,209,199,.85)";
          ctx.setLineDash([4, 3]); ctx.lineDashOffset = -r.time * 15;
          ctx.beginPath(); ctx.arc(pl.x, pl.y, SAFE_R, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.setLineDash([]);
          drawText("ZONE SURE", pl.x, pl.y - SAFE_R - 7, "#7fd1c7", "c");
        }
      }
    }
    // barre de vie sous chaque écureuil
    var hb = 16, hr = Math.max(0, pl.hp / (pl.maxHp || 1));
    ctx.fillStyle = OUT; ctx.fillRect(Math.round(pl.x - hb / 2 - 1), Math.round(pl.y + 9), hb + 2, 4);
    ctx.fillStyle = "#4a2e1c"; ctx.fillRect(Math.round(pl.x - hb / 2), Math.round(pl.y + 10), hb, 2);
    ctx.fillStyle = hr > 0.3 ? "#9cc56b" : "#c8553d"; ctx.fillRect(Math.round(pl.x - hb / 2), Math.round(pl.y + 10), Math.round(hb * hr), 2);
    if (multi && pl !== me) drawText(String(pl.name).slice(0, 10), pl.x, pl.y - 20, mateColor(pl), "c");
  }
  // flèches vers les coéquipiers hors de l'écran
  function drawMates(cx, cy) {
    players.forEach(function (pl) {
      if (pl === me) return;
      var sx = pl.x - cx, sy = pl.y - cy;
      if (sx > 4 && sx < W - 4 && sy > 50 && sy < H - 4) return;
      var mx = W / 2, my = H / 2, ang = Math.atan2(sy - my, sx - mx);
      var ex = Math.max(8, Math.min(W - 8, mx + Math.cos(ang) * W)), ey = Math.max(56, Math.min(H - 8, my + Math.sin(ang) * H));
      ctx.fillStyle = pl.down ? "#ff5a3a" : mateColor(pl);
      ctx.save(); ctx.translate(Math.round(ex), Math.round(ey)); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    });
  }
  var AURA = {
    spore: { fill: "rgba(122,90,190,.13)", dot: "spore" },
    force: { fill: "rgba(127,209,199,.12)", ring: "rgba(127,209,199,.75)" },
    mist: { fill: "rgba(150,120,210,.16)", ring: "rgba(127,209,199,.5)", dot: "spore" },
    hurricane: { fill: "rgba(160,200,230,.14)", ring: "rgba(230,255,248,.7)", dot: "leaf" },
    smoke: { fill: "rgba(110,100,92,.2)", ring: "rgba(255,140,60,.5)", dot: "wisp" },
  };
  function drawAuras(p) {
    techEntries(p).forEach(function (te) {
      var id = te.key, w = te.def; if (!w || w.type !== "aura") return;
      var st = AURA[w.color] || AURA.spore, R = V(w, "R", te.l) * p.area * (w.smoke ? p.smokeX || 1 : 1);
      ctx.fillStyle = st.fill;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, R, R * 0.8, 0, 0, TAU); ctx.fill();
      if (st.ring) {
        ctx.strokeStyle = st.ring; ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]); ctx.lineDashOffset = -r.time * 20;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, R, R * 0.8, 0, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
      }
      if (st.dot) for (var s = 0; s < 10; s++) {
        var a = r.time * 0.8 + s / 10 * TAU, rr = R * (0.55 + 0.4 * Math.sin(r.time * 2 + s));
        blit(SPR[st.dot][0], p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr * 0.8);
      }
    });
  }
  function drawTethers(p) {
    techEntries(p).forEach(function (te) {
      var id = te.key, w = te.def; if (!w || w.type !== "tether") return;
      var l = te.l, rng = V(w, "range", l), big = !!w.chain;
      players.forEach(function (o) {
        if (o === p || o.down || Math.hypot(o.x - p.x, o.y - p.y) > rng) return;
        if (o.weapons && o.weapons[id] && o.id < p.id) return; // un seul arc si les deux l'ont
        var ax = p.x, ay = p.y - 3, bx = o.x, by = o.y - 3, seg = 7;
        for (var pass = 0; pass < 2; pass++) {
          ctx.strokeStyle = pass ? "rgba(232,251,255,.95)" : (big ? "rgba(246,211,107,.55)" : "rgba(106,216,255,.55)"); ctx.lineWidth = pass ? 1 : (big ? 4 : 3);
          ctx.beginPath(); ctx.moveTo(ax, ay);
          for (var k = 1; k < seg; k++) { var t = k / seg; ctx.lineTo(ax + (bx - ax) * t + (Math.random() - 0.5) * 7, ay + (by - ay) * t + (Math.random() - 0.5) * 7); }
          ctx.lineTo(bx, by); ctx.stroke();
        }
      });
    });
  }
  function drawOrbits(p) {
    techEntries(p).forEach(function (te) {
      var id = te.key, w = te.def; if (!w || w.type !== "orbit") return;
      var l = te.l, n = V(w, "n", l) + p.amount, R = V(w, "R", l) * p.area;
      var c = w.around === "partner" ? (partnerOf(p) || p) : p;
      for (var j = 0; j < n; j++) {
        var oa = (p.st[id] || 0) + j / n * TAU;
        blit(SPR[w.sprite || "mushroom"][0], c.x + Math.cos(oa) * R, c.y + Math.sin(oa) * R * 0.8);
      }
    });
  }

  function draw() {
    var sx = shake > 0 ? (Math.random() * 4 - 2) : 0, sy = shake > 0 ? (Math.random() * 4 - 2) : 0;
    var cam = me.down ? (me.twinRef && !me.twinRef.down ? me.twinRef : alive()[0] || me) : me;
    if (isArena()) cam = { x: Math.max(-A.w + W / 2 - 24, Math.min(A.w - W / 2 + 24, cam.x)) || 0, y: Math.max(-A.h + H / 2 - 40, Math.min(A.h - H / 2 + 24, cam.y)) || 0 };
    if (isArena() && W / 2 - 24 > A.w) cam.x = 0;
    if (isArena() && H / 2 - 40 > A.h) cam.y = 0;
    var cx = Math.round(cam.x - W / 2 + sx), cy = Math.round(cam.y - H / 2 + sy);
    if (isDungeon()) { ctx.fillStyle = "#120d0a"; ctx.fillRect(0, 0, W, H); } else drawGround(cx, cy, MAP);
    ctx.save();
    ctx.translate(-cx, -cy);
    if (isArena()) drawArena(cx, cy);
    if (isDungeon()) drawDungeon(cx, cy);
    var giants = useGiants() ? visibleGiants(cx, cy) : null;
    if (giants) drawGiantBases(giants);
    if (!isArena()) drawShrines(cx, cy);
    if (!isArena() && !isDungeon()) drawPortal();
    drawMega(cx, cy);
    if (isExpe()) drawExpe(cx, cy);

    var bob = Math.sin(r.time * 4);
    gems.forEach(function (g) {
      if (g.kind === "item") {
        var di = D.ITEMS[g.v] || D.ITEMS[0], rc = D.RARITIES[di.r].color, gx = Math.round(g.x), gy = Math.round(g.y + bob * 1.5);
        ctx.globalAlpha = 0.25 + 0.1 * Math.sin(r.time * 4); ctx.fillStyle = rc; ctx.fillRect(gx - 2, gy - 40, 4, 40); ctx.globalAlpha = 0.5; ctx.fillRect(gx - 1, gy - 40, 2, 40); ctx.globalAlpha = 1;
        ctx.fillStyle = "rgba(20,14,10,.75)"; ctx.fillRect(gx - 6, gy - 6, 12, 12); ctx.strokeStyle = rc; ctx.lineWidth = 1; ctx.strokeRect(gx - 5.5, gy - 5.5, 11, 11);
        ctx.font = "8px sans-serif"; ctx.textBaseline = "middle"; ctx.textAlign = "center"; ctx.fillText(di.icon, gx, gy + 1); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        return;
      }
      var s = g.kind === "xp" ? (g.v >= 3 ? SPR.bignut[0] : SPR.nut[0]) : (SPR[g.kind === "relic" ? "relic" : g.kind] || SPR.nut)[0];
      var big = g.kind !== "xp" && g.kind !== "gold";
      if (big) { ctx.fillStyle = "rgba(255,240,180,.25)"; ctx.fillRect(Math.round(g.x - 5), Math.round(g.y - 5 + bob), 10, 10); }
      blit(s, g.x, g.y + (big ? bob * 1.5 : 0));
    });
    players.forEach(function (pl) { if (!pl.down) drawAuras(pl); });
    warns.forEach(function (w) {
      if (MAP.mech === "leaves" && !isDungeon() && w.dmg && enemies.some(function (e) { return e.d.prop && e.d.sprite === "leafpile" && !e.dead && Math.abs(e.x - w.x) < 16 && Math.abs(e.y - w.y) < 14; })) return;
      var k = Math.min(1, w.t / w.dur), blink = Math.sin(r.time * 30) > 0 ? 0.08 : 0;
      ctx.fillStyle = "rgba(208,40,26," + (0.12 + blink) + ")";
      ctx.beginPath(); ctx.ellipse(w.x, w.y, w.r, w.r * 0.8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(208,40,26,.35)";
      ctx.beginPath(); ctx.ellipse(w.x, w.y, w.r * k, w.r * 0.8 * k, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#ff5a3a"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(w.x, w.y, w.r, w.r * 0.8, 0, 0, TAU); ctx.stroke();
    });

    drawZones();
    enemies.sort(function (a, b) { return a.y - b.y; });
    var plist = players.slice().sort(function (a, b) { return a.y - b.y; }), pi = 0;
    drawComps();
    var rgA = Math.min(0.7, rageMin() / 6 + (rageMin() > 0 ? 0.2 : 0));
    for (var i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      while (pi < plist.length && plist[pi].y <= e.y) drawPlayer(plist[pi++]);
      if (e.x < cx - 60 || e.x > cx + W + 60 || e.y < cy - 60 || e.y > cy + H + 60) continue;
      if (e.under) { blit(SPR.mound[((r.time * 8) | 0) % 2], e.x, e.y + 2); continue; }
      var spr = (e.shellT > 0 || e.spin > 0 || e.shelled) ? SPR.turtleshell[0] : e.ballT > r.time ? SPR.woodball[0] : e.spr[(e.anim | 0) % e.spr.length];
      if (e.d.ai === "antlion") { ctx.fillStyle = "rgba(200,168,120,.35)"; ctx.beginPath(); ctx.ellipse(e.x, e.y + 3, 30, 22, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "rgba(140,110,70,.5)"; ctx.beginPath(); ctx.ellipse(e.x, e.y + 3, 18 + 6 * Math.sin(r.time * 3), 13, 0, 0, TAU); ctx.stroke(); }
      if (e.d.ai === "ghostowl" && !(e.seenT > r.time) && Math.hypot(e.x - me.x, e.y - me.y) > 70) ctx.globalAlpha = 0.1;
      if (e.vulnT > r.time) { ctx.strokeStyle = "rgba(246,211,107," + (0.5 + 0.5 * Math.sin(r.time * 12)) + ")"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(e.x, e.y + 4, 20 * (e.scale || 1), 12 * (e.scale || 1), 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1; }
      var gs = e.scale || (e.giant ? 2 : 1);
      if (gs > 1) { ctx.save(); var fy = e.y + spr.h / 2; ctx.translate(e.x, fy); ctx.scale(gs, gs); ctx.translate(-e.x, -fy); }
      if (!e.spr.flying) shadow(e.x, e.y + spr.h / 2 - 2, spr.w * 0.7);
      else shadow(e.x, e.y + spr.h / 2 + 3, spr.w * 0.5);
      if (e.aff && e.aff.length) drawEliteFx(e, spr, e.face < 0);
      else if (e.d.elite && !e.d.prop) { ctx.strokeStyle = "rgba(246,211,107," + (0.55 + 0.35 * Math.sin(r.time * 6 + e.id)) + ")"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(Math.round(e.x), Math.round(e.y), Math.max(spr.w, spr.h) / 2 + 3 + Math.sin(r.time * 6 + e.id), 0, TAU); ctx.stroke(); }
      blit(spr, e.x, e.y, !e.d.prop && e.face < 0, e.flash > 0);
      // élément : palette teintée, marque d'élément posée par tes coups
      if (e.elem && !e.d.prop) { ctx.globalAlpha = e.d.mega ? 0.2 : 0.32; ctx.drawImage(tinted(spr, D.ELEMENTS[e.elem].color, e.face < 0), Math.round(e.x - spr.w / 2), Math.round(e.y - spr.h / 2)); ctx.globalAlpha = 1;
        if (e.d.elite || e.d.boss) { ctx.fillStyle = "#1a120c"; ctx.fillRect(Math.round(e.x + spr.w / 2 - 1), Math.round(e.y - spr.h / 2 - 4), 5, 5); ctx.fillStyle = D.ELEMENTS[e.elem].color; ctx.fillRect(Math.round(e.x + spr.w / 2), Math.round(e.y - spr.h / 2 - 3), 3, 3); } }
      if (e.d.tint) { ctx.globalAlpha = 0.45; ctx.drawImage(tinted(spr, e.d.tint, e.face < 0), Math.round(e.x - spr.w / 2), Math.round(e.y - spr.h / 2)); ctx.globalAlpha = 1; }
      if (e.corrupt) { ctx.globalAlpha = 0.3; ctx.drawImage(tinted(spr, "#a030c0", e.face < 0), Math.round(e.x - spr.w / 2), Math.round(e.y - spr.h / 2)); ctx.globalAlpha = 1; }
      if (e.mark && e.markT > 0) { ctx.fillStyle = D.ELEMENTS[e.mark].color; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(r.time * 10); ctx.fillRect(Math.round(e.x - 1), Math.round(e.y + spr.h / 2 + 1), 3, 2); ctx.globalAlpha = 1; }
      // bêtes enragées : voile rouge qui pulse de plus en plus fort
      if (rgA > 0 && !e.d.prop) { ctx.globalAlpha = rgA * (0.55 + 0.45 * Math.sin(r.time * 9 + e.id)); ctx.drawImage(tinted(spr, "#ff1a10", e.face < 0), Math.round(e.x - spr.w / 2), Math.round(e.y - spr.h / 2)); ctx.globalAlpha = 1; }
      if (e.aff && e.aff.length) drawEliteTag(e, spr);
      if (e.slowT > 0 && !e.d.boss && !e.d.prop) { ctx.fillStyle = "rgba(160,130,230,.7)"; ctx.fillRect(Math.round(e.x - 1), Math.round(e.y - spr.h / 2 - 2), 2, 2); }
      if (gs > 1) ctx.restore();
      ctx.globalAlpha = 1;
    }
    while (pi < plist.length) drawPlayer(plist[pi++]);

    players.forEach(function (pl) { if (!pl.down) { drawTethers(pl); drawOrbits(pl); } });
    var flick = ((r.time * 12) | 0) % 2;
    projs.forEach(function (q) {
      if (q.kind === "rocket") {
        var rs = SPR.rocket[0];
        ctx.save(); ctx.translate(Math.round(q.x), Math.round(q.y)); ctx.rotate(q.ang);
        ctx.drawImage(rs.c, -rs.w / 2, -rs.h / 2); ctx.restore();
        return;
      }
      var s = SPR[q.sprite] || SPR.acorn;
      blit(s[(q.anim || q.kind === "boomerang") ? flick % s.length : 0], q.x, q.y, q.vx < 0);
    });
    hostile.forEach(function (q) {
      ctx.fillStyle = "rgba(255,60,30,.35)"; ctx.fillRect(Math.round(q.x) - 4, Math.round(q.y) - 4, 8, 8);
      ctx.fillStyle = "rgba(255,60,30,.25)"; ctx.fillRect(Math.round(q.x - q.vx * 0.06) - 2, Math.round(q.y - q.vy * 0.06) - 2, 4, 4);
      blit(SPR.hshot[0], q.x, q.y);
    });
    lobs.forEach(function (l) {
      var k = l.t / l.dur, x = l.sx + (l.tx - l.sx) * k, y = l.sy + (l.ty - l.sy) * k - (l.sky ? (1 - k) * 110 : Math.sin(k * Math.PI) * (l.small ? 8 : 30));
      if (l.sky) {
        ctx.strokeStyle = "rgba(255,120,40,.5)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(l.tx, l.ty, l.rad * k, l.rad * 0.8 * k, 0, 0, TAU); ctx.stroke();
        fx.push({ kind: "dot", x: x + Math.random() * 4 - 2, y: y - 4, vx: 0, vy: -10, life: 0.2, color: "#f6b468" });
      }
      if (l.small) { ctx.fillStyle = "#f6b468"; ctx.fillRect(Math.round(x), Math.round(y), 2, 2); return; }
      shadow(l.sx + (l.tx - l.sx) * k, l.sy + (l.ty - l.sy) * k + 3, 5);
      blit(SPR[l.sprite || "pinecone"][0], x, y);
    });
    if (giants) drawGiantTops(giants);
    fx.forEach(drawFx);
    texts.forEach(function (t) { ctx.globalAlpha = Math.min(1, t.life * 3); drawText(t.n, t.x, t.y, t.col || "#fdf3de", "c"); });
    ctx.globalAlpha = 1;
    ctx.restore();
    if (isDungeon()) drawDungeonLight(cx, cy);
    if (isExpe()) drawFog(cx, cy);

    var dusk = isDungeon() ? 0 : Math.min(MAP.night ? 0.2 : 0.28, r.time / 1500) + (MAP.night ? 0.12 : 0);
    if (dusk > 0.01) { ctx.fillStyle = "rgba(20,15,50," + dusk + ")"; ctx.fillRect(0, 0, W, H); }
    if (MAP.night && !isDungeon()) drawFireflies(r.time);
    if (!isDungeon() && !isArena()) drawMapOverlay(cx, cy);
    if (r.freeze > 0) { ctx.fillStyle = "rgba(160,215,255," + Math.min(0.22, r.freeze * 0.1) + ")"; ctx.fillRect(0, 0, W, H); }
    if (r.flash > 0) { ctx.fillStyle = "rgba(255,250,230," + r.flash * 2 + ")"; ctx.fillRect(0, 0, W, H); }
    if (players.length > 1) drawMates(cx, cy);
    drawHud();

    if (joy.active) {
      ctx.fillStyle = "rgba(253,243,222,.18)"; ctx.strokeStyle = "rgba(253,243,222,.6)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(joy.ox, joy.oy, JOY_R, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(232,135,58,.85)";
      ctx.beginPath(); ctx.arc(joy.x, joy.y, 9, 0, TAU); ctx.fill();
    }
  }
  function rectVisible(rc, cx, cy) { return rc.x < cx + W + 20 && rc.x + rc.w > cx - 20 && rc.y < cy + H + 20 && rc.y + rc.h > cy - 20; }
  var DG_TINT = { elite: "rgba(150,90,220,.10)", guard: "rgba(220,60,40,.10)", boss: "rgba(220,40,30,.16)", treasure: "rgba(246,211,107,.12)" };
  function drawDungeon(cx, cy) {
    var dg = r.dg; if (!dg) return;
    var th = dg.theme, rects = [];
    dg.rooms.forEach(function (rm) { rm.parts.forEach(function (pp) { rects.push(pp); }); });
    dg.corridors.forEach(function (c) { c.segs.forEach(function (sg) { rects.push(sg); }); });
    var vis = rects.filter(function (rc) { return rectVisible(rc, cx, cy); });
    // murs : bordure épaisse, face du mur au-dessus de chaque zone
    ctx.fillStyle = th.wall;
    vis.forEach(function (rc) { ctx.fillRect(Math.round(rc.x - 7), Math.round(rc.y - 14), Math.round(rc.w + 14), Math.round(rc.h + 21)); });
    vis.forEach(function (rc) {
      ctx.fillStyle = th.top; ctx.fillRect(Math.round(rc.x), Math.round(rc.y - 12), Math.round(rc.w), 12);
      ctx.fillStyle = th.wall;
      for (var bx = Math.ceil(rc.x / 12) * 12; bx < rc.x + rc.w; bx += 12) ctx.fillRect(bx + ((Math.floor((rc.y - 12) / 6) % 2) ? 6 : 0), Math.round(rc.y - 12), 1, 6);
      for (bx = Math.ceil(rc.x / 12) * 12; bx < rc.x + rc.w; bx += 12) ctx.fillRect(bx + 3, Math.round(rc.y - 6), 1, 6);
      ctx.fillRect(Math.round(rc.x), Math.round(rc.y - 6), Math.round(rc.w), 1);
    });
    // sols
    vis.forEach(function (rc) {
      ctx.fillStyle = th.floor; ctx.fillRect(Math.round(rc.x), Math.round(rc.y), Math.round(rc.w), Math.round(rc.h));
      var x0 = Math.max(rc.x, cx - 16), x1 = Math.min(rc.x + rc.w, cx + W + 16), y0 = Math.max(rc.y, cy - 16), y1 = Math.min(rc.y + rc.h, cy + H + 16);
      ctx.fillStyle = th.grid;
      for (var gx = Math.ceil(x0 / 20) * 20; gx < x1; gx += 20) ctx.fillRect(gx, Math.round(y0), 1, Math.round(y1 - y0));
      for (var gy = Math.ceil(y0 / 20) * 20; gy < y1; gy += 20) ctx.fillRect(Math.round(x0), gy, Math.round(x1 - x0), 1);
      // ombre portée du mur sur le sol
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(Math.round(rc.x), Math.round(rc.y), Math.round(rc.w), 4);
    });
    var inV = function (x, y, m) { return x > cx - m && x < cx + W + m && y > cy - m && y < cy + H + m; };
    dg.rooms.forEach(function (rm) { if (DG_TINT[rm.type] && rectVisible(rm.rect, cx, cy)) { ctx.fillStyle = DG_TINT[rm.type]; rm.parts.forEach(function (pp) { ctx.fillRect(pp.x, pp.y, pp.w, pp.h); }); } });
    // mousse, flaques
    dg.decor.forEach(function (o) {
      if (o.k !== "moss" || !inV(o.x, o.y, 40)) return;
      ctx.fillStyle = "rgba(90,140,70,.14)"; ctx.beginPath(); ctx.ellipse(Math.round(o.x), Math.round(o.y), o.rx, o.ry, 0, 0, TAU); ctx.fill();
    });
    dg.puddles.forEach(function (u) {
      if (!inV(u.x, u.y, 30)) return;
      var poison = u.k === "poison";
      ctx.fillStyle = poison ? "rgba(96,170,52,.6)" : "rgba(60,104,140,.6)";
      ctx.beginPath(); ctx.ellipse(Math.round(u.x), Math.round(u.y), u.rx, u.ry, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = poison ? "rgba(170,240,110,.6)" : "rgba(170,210,240,.5)";
      ctx.fillRect(Math.round(u.x - u.rx / 3), Math.round(u.y - u.ry / 2), Math.max(2, (u.rx / 3) | 0), 1);
      if (poison) { var bt = (r.time * 1.5 + u.x) % 1; ctx.fillStyle = "rgba(200,255,140," + (1 - bt) + ")"; ctx.fillRect(Math.round(u.x + Math.sin(u.y) * u.rx * 0.5), Math.round(u.y - bt * 4), 2, 2); }
    });
    // trous
    dg.pits.forEach(function (pt) {
      if (!inV(pt.x, pt.y, 50)) return;
      ctx.fillStyle = th.wall; ctx.fillRect(pt.x - 2, pt.y - 2, pt.w + 4, pt.h + 4);
      ctx.fillStyle = "#050302"; ctx.fillRect(pt.x, pt.y, pt.w, pt.h);
      ctx.fillStyle = th.top; ctx.fillRect(pt.x, pt.y, pt.w, 4);
      ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(pt.x, pt.y + 4, pt.w, 3);
      for (var k = 0; k < pt.w; k += 7) { var hh = hash(pt.x + k, pt.y); ctx.fillStyle = th.wall; ctx.fillRect(pt.x + k, pt.y + pt.h - 2 - hh % 3, 3, 2 + hh % 3); }
    });
    // pièges à pointes
    dg.spikes.forEach(function (sk) {
      if (!inV(sk.x, sk.y, 20)) return;
      var st = spikeState(sk);
      ctx.fillStyle = "#2a2420"; ctx.fillRect(sk.x + 1, sk.y + 1, 14, 14);
      ctx.fillStyle = "#4a423a"; ctx.fillRect(sk.x + 1, sk.y + 1, 14, 1);
      for (var a = 0; a < 4; a++) {
        var hx = sk.x + 3 + (a % 2) * 7, hy = sk.y + 3 + ((a / 2) | 0) * 7;
        if (st === 2) { ctx.fillStyle = "#d8dee2"; ctx.fillRect(hx + 1, hy - 3, 2, 6); ctx.fillStyle = "#8a9298"; ctx.fillRect(hx, hy + 1, 4, 2); }
        else if (st === 1) { ctx.fillStyle = Math.sin(r.time * 30) > 0 ? "#ff5a3a" : "#8a2a1a"; ctx.fillRect(hx, hy, 4, 3); }
        else { ctx.fillStyle = "#0e0b09"; ctx.fillRect(hx, hy, 4, 3); }
      }
    });
    // piliers
    dg.pillars.forEach(function (o) {
      if (!inV(o.x, o.y, 40)) return;
      ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(o.x - 2, o.y + o.h - 2, o.w + 6, 5);
      ctx.fillStyle = th.wall; ctx.fillRect(o.x - 1, o.y - 15, o.w + 2, o.h + 16);
      ctx.fillStyle = th.top; ctx.fillRect(o.x, o.y - 14, o.w, o.h + 6);
      ctx.fillStyle = th.accent; ctx.fillRect(o.x, o.y - 14, o.w, 3);
      ctx.fillStyle = th.wall; ctx.fillRect(o.x, o.y - 4, o.w, 1); ctx.fillRect(o.x + (o.w >> 1), o.y - 10, 1, 6);
    });
    // végétation, cailloux, champignons lumineux, lianes
    dg.decor.forEach(function (o) {
      if (o.k === "moss" || !inV(o.x, o.y, 20)) return;
      var x = Math.round(o.x), y = Math.round(o.y);
      if (o.k === "grass") { ctx.fillStyle = ["#5f7a3a", "#6f8a44", "#4f6a32", "#7a8a3a"][o.v]; ctx.fillRect(x, y - 3, 1, 3); ctx.fillRect(x + 2, y - 4, 1, 4); ctx.fillRect(x + 4, y - 2, 1, 2); }
      else if (o.k === "rock") { ctx.fillStyle = th.accent; ctx.fillRect(x, y, 3 + (o.v & 1), 2); ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fillRect(x, y + 2, 3 + (o.v & 1), 1); }
      else if (o.k === "fern") {
        var sw = Math.sin(r.time * 1.6 + x) * 0.6;
        ctx.fillStyle = ["#3f7a3a", "#4f8a40", "#5a7a2a"][o.v];
        for (var f = -2; f <= 2; f++) { ctx.fillRect(Math.round(x + f * 2 + sw * Math.abs(f)), y - 6 + Math.abs(f) * 2, 1, 6 - Math.abs(f)); }
        ctx.fillRect(x - 1, y - 1, 3, 1);
      }
      else if (o.k === "glow") {
        var cols = ["#7fe0d0", "#c9a0ff", "#a8f070"][o.v];
        ctx.fillStyle = "#d8cbb0"; ctx.fillRect(x, y - 2, 1, 3); ctx.fillRect(x + 3, y - 1, 1, 2);
        ctx.fillStyle = cols; ctx.fillRect(x - 1, y - 4, 3, 2); ctx.fillRect(x + 2, y - 3, 3, 2);
      }
      else if (o.k === "vine") { ctx.fillStyle = "#3f6a32"; ctx.fillRect(x, y - 6, 1, o.len + 6); ctx.fillStyle = "#5f8a44"; for (var v = 2; v < o.len; v += 4) ctx.fillRect(x + ((v >> 2) % 2 ? 1 : -1), y + v, 1, 2); }
    });
    // torches
    dg.torches.forEach(function (tc) {
      if (!inV(tc.x, tc.y, 20)) return;
      var fl = ((r.time * 10 + tc.x) | 0) % 3;
      ctx.fillStyle = "#3a2618"; ctx.fillRect(tc.x - 1, tc.y - 4, 2, 6);
      ctx.fillStyle = "#ff9a3d"; ctx.fillRect(tc.x - 2, tc.y - 8 - fl, 4, 4 + fl);
      ctx.fillStyle = "#ffe08a"; ctx.fillRect(tc.x - 1, tc.y - 7, 2, 2);
    });
    // portes verrouillées de la salle active
    if (dg.active >= 0) {
      var ar = dg.rooms[dg.active];
      dg.corridors.forEach(function (c) {
        c.doors.forEach(function (dr) {
          if (dr.room !== ar.idx) return;
          var bx = dr.horiz ? dr.x - 4 : dr.x - 18, by = dr.horiz ? dr.y - 18 : dr.y - 4, bw = dr.horiz ? 8 : 36, bh = dr.horiz ? 36 : 8;
          ctx.fillStyle = "#2b1709"; ctx.fillRect(Math.round(bx), Math.round(by), bw, bh);
          ctx.fillStyle = "#8a5a3b";
          if (dr.horiz) for (var y = by + 2; y < by + bh; y += 6) ctx.fillRect(Math.round(bx + 1), Math.round(y), 6, 3);
          else for (var x = bx + 2; x < bx + bw; x += 6) ctx.fillRect(Math.round(x), Math.round(by + 1), 3, 6);
        });
      });
    }
    if (dg.stairs) {
      var sx = Math.round(dg.stairs.x), sy = Math.round(dg.stairs.y);
      ctx.fillStyle = "#0a0705"; ctx.fillRect(sx - 12, sy - 9, 24, 18);
      ctx.fillStyle = "#8a5a3b"; for (var s2 = 0; s2 < 4; s2++) ctx.fillRect(sx - 10 + s2 * 2, sy - 7 + s2 * 4, 20 - s2 * 4, 2);
      ctx.strokeStyle = "rgba(246,211,107," + (0.5 + 0.5 * Math.sin(r.time * 5)) + ")"; ctx.lineWidth = 1; ctx.strokeRect(sx - 13.5, sy - 10.5, 27, 21);
    }
  }
  // obscurité : un calque sombre percé autour des sources de lumière
  var lightC = null, lctx = null;
  function drawDungeonLight(cx, cy) {
    var dg = r.dg; if (!dg || S.opts.lowfx) return;
    if (!lightC) { lightC = document.createElement("canvas"); lctx = lightC.getContext("2d"); }
    if (lightC.width !== W || lightC.height !== H) { lightC.width = W; lightC.height = H; }
    lctx.globalCompositeOperation = "source-over";
    lctx.clearRect(0, 0, W, H);
    lctx.fillStyle = "rgba(6,4,3," + dg.theme.dark + ")"; lctx.fillRect(0, 0, W, H);
    lctx.globalCompositeOperation = "destination-out";
    function hole(x, y, rad, a) {
      x -= cx; y -= cy;
      if (x < -rad || y < -rad || x > W + rad || y > H + rad) return;
      var g = lctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, "rgba(0,0,0," + a + ")"); g.addColorStop(0.55, "rgba(0,0,0," + a * 0.7 + ")"); g.addColorStop(1, "rgba(0,0,0,0)");
      lctx.fillStyle = g; lctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    players.forEach(function (pl) { if (!pl.down) hole(pl.x, pl.y, 115 + Math.sin(r.time * 3) * 3, 1); });
    dg.torches.forEach(function (tc) { hole(tc.x, tc.y + 10, 70 + Math.sin(r.time * 9 + tc.x) * 4, 0.95); });
    dg.decor.forEach(function (o) { if (o.k === "glow") hole(o.x, o.y, 26, 0.7); });
    dg.puddles.forEach(function (u) { if (u.k === "poison") hole(u.x, u.y, u.rx + 10, 0.4); });
    if (dg.stairs) hole(dg.stairs.x, dg.stairs.y, 60, 0.9);
    (dg.shrines || []).forEach(function (sq) { var stq = r.sh[sq.id]; if (!stq || !stq.used) hole(sq.x, sq.y - 10, 40, 0.75); });
    hostile.forEach(function (q) { hole(q.x, q.y, 16, 0.9); });
    zones.forEach(function (z) { if (z.kind === "fire") hole(z.x, z.y, z.r + 14, 0.7); });
    warns.forEach(function (w) { hole(w.x, w.y, w.r + 8, 0.6); });
    gems.forEach(function (g) { if (g.kind !== "xp" && g.kind !== "gold") hole(g.x, g.y, g.kind === "item" ? 34 : 22, 0.85); });
    enemies.forEach(function (e) { if (e.d.elite && !e.dead) hole(e.x, e.y, 26, 0.6); });
    ctx.drawImage(lightC, 0, 0);
    // halo chaud des torches
    ctx.globalCompositeOperation = "lighter";
    dg.torches.forEach(function (tc) {
      var x = tc.x - cx, y = tc.y + 6 - cy; if (x < -40 || y < -40 || x > W + 40 || y > H + 40) return;
      var g = ctx.createRadialGradient(x, y, 0, x, y, 40);
      g.addColorStop(0, "rgba(255,140,50,.22)"); g.addColorStop(1, "rgba(255,140,50,0)");
      ctx.fillStyle = g; ctx.fillRect(x - 40, y - 40, 80, 80);
    });
    ctx.globalCompositeOperation = "source-over";
  }
  function drawMinimap(x0, y0) {
    var dg = r.dg; if (!dg) return;
    var minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    dg.rooms.forEach(function (rm) { minx = Math.min(minx, rm.gx); maxx = Math.max(maxx, rm.gx); miny = Math.min(miny, rm.gy); maxy = Math.max(maxy, rm.gy); });
    var cw = 8, chh = 6, cur = roomAt(me.x, me.y, 0);
    var known = {};
    dg.rooms.forEach(function (rm) { if (dg.visited[rm.idx]) { known[rm.idx] = 1; rm.links.forEach(function (j) { known[j] = known[j] || 2; }); } });
    var w = (maxx - minx + 1) * cw + 2, hgt = (maxy - miny + 1) * chh + 2, ox = x0 - w;
    ctx.fillStyle = "rgba(20,14,10,.7)"; ctx.fillRect(ox - 2, y0 - 2, w + 4, hgt + 4);
    dg.rooms.forEach(function (rm) {
      if (!known[rm.idx]) return;
      var x = ox + 1 + (rm.gx - minx) * cw, y = y0 + 1 + (rm.gy - miny) * chh;
      var col = known[rm.idx] === 2 ? "#4a3a30" : rm.state === "cleared" ? "#8a7a68" : "#c9b08a";
      if (rm.type === "boss" || rm.type === "guard") col = known[rm.idx] === 2 ? "#7a2a20" : "#d0281a";
      else if (rm.type === "elite" && known[rm.idx] === 1) col = "#9a6ad8";
      else if (rm.type === "treasure" && known[rm.idx] === 1) col = "#e0a82a";
      ctx.fillStyle = col; ctx.fillRect(x, y, cw - 2, chh - 2);
      if (cur && cur.idx === rm.idx && Math.sin(r.time * 8) > -0.3) { ctx.fillStyle = "#fdf3de"; ctx.fillRect(x + 2, y + 1, cw - 6, chh - 4); }
    });
    if (dg.stairs) { var st = roomAt(dg.stairs.x, dg.stairs.y, 0); if (st) { ctx.fillStyle = "#f6d36b"; ctx.fillRect(ox + 1 + (st.gx - minx) * cw + 2, y0 + 1 + (st.gy - miny) * chh + 1, 2, 2); } }
  }
  function drawArena(cx, cy) {
    var x0 = -A.w, y0 = -A.h, w = A.w * 2, h = A.h * 2;
    // extérieur assombri
    ctx.fillStyle = "rgba(10,18,12,.62)";
    ctx.fillRect(cx - 10, cy - 10, W + 20, y0 - cy + 10);
    ctx.fillRect(cx - 10, y0 + h, W + 20, cy + H + 10 - (y0 + h));
    ctx.fillRect(cx - 10, y0, x0 - cx + 10, h);
    ctx.fillRect(x0 + w, y0, cx + W + 10 - (x0 + w), h);
    // palissade de rondins
    ctx.fillStyle = "#3a2618"; ctx.fillRect(x0 - 5, y0 - 5, w + 10, 5); ctx.fillRect(x0 - 5, y0 + h, w + 10, 5); ctx.fillRect(x0 - 5, y0, 5, h); ctx.fillRect(x0 + w, y0, 5, h);
    ctx.fillStyle = "#8a5a3b"; ctx.fillRect(x0 - 4, y0 - 4, w + 8, 2); ctx.fillRect(x0 - 4, y0 + h + 1, w + 8, 2); ctx.fillRect(x0 - 4, y0, 2, h); ctx.fillRect(x0 + w + 1, y0, 2, h);
    ctx.fillStyle = "#6b4430";
    for (var px = x0; px <= x0 + w; px += 24) { ctx.fillRect(px - 2, y0 - 9, 4, 9); ctx.fillRect(px - 2, y0 + h, 4, 9); }
    for (var py = y0; py <= y0 + h; py += 24) { ctx.fillRect(x0 - 9, py - 2, 9, 4); ctx.fillRect(x0 + w, py - 2, 9, 4); }
  }
  var darkCv = null;
  function fireflyPos(i, t) { var hx = hash(i, 7); return { x: ((hx % 1000) / 1000 * W + t * (6 + i % 5) + Math.sin(t + i) * 10) % W, y: ((hash(i, 3) % 1000) / 1000 * H + Math.cos(t * 0.7 + i) * 12 + H) % H }; }
  function drawMapOverlay(cx, cy) {
    var sn = strataN();
    if (MAP.mech === "water") { ctx.fillStyle = "rgba(215,225,235," + (0.06 + 0.1 * (Math.sin(r.time / 9) + 1) / 2) + ")"; ctx.fillRect(0, 0, W, H); }
    if (sn === 1) { ctx.fillStyle = "rgba(200,210,215,.16)"; ctx.fillRect(0, 0, W, H); }
    var dark = (MAP.mech === "dark" ? 0.5 : 0) + (sn === 3 ? 0.62 : 0);
    if (dark <= 0) return;
    if (!darkCv) darkCv = document.createElement("canvas");
    if (darkCv.width !== W || darkCv.height !== H) { darkCv.width = W; darkCv.height = H; }
    var dc = darkCv.getContext("2d");
    dc.globalCompositeOperation = "source-over"; dc.clearRect(0, 0, W, H); dc.fillStyle = "rgba(4,6,16," + Math.min(0.75, dark) + ")"; dc.fillRect(0, 0, W, H);
    dc.globalCompositeOperation = "destination-out";
    var hole = function (x, y, rad) { var g = dc.createRadialGradient(x, y, rad * 0.25, x, y, rad); g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)"); dc.fillStyle = g; dc.beginPath(); dc.arc(x, y, rad, 0, TAU); dc.fill(); };
    players.forEach(function (pl) { if (!pl.down) hole(pl.x - cx, pl.y - cy, itn(pl, "lampe_huile") ? 130 : 80); });
    if (MAP.mech === "dark") for (var i = 0; i < 14; i++) { if (Math.sin(r.time * 3 + i) > -0.2) { var fp = fireflyPos(i, r.time); hole(fp.x, fp.y, 26); } }
    enemies.forEach(function (e) { if (e.d.crystal && !e.dead) hole(e.x - cx, e.y - cy, 34); if (e.d.ai === "firefly" || e.type === "firefly") hole(e.x - cx, e.y - cy, 18); });
    dc.globalCompositeOperation = "source-over";
    ctx.drawImage(darkCv, 0, 0);
  }
  function drawFireflies(t) {
    for (var i = 0; i < 14; i++) {
      var hx = hash(i, 7), x = ((hx % 1000) / 1000 * W + t * (6 + i % 5) + Math.sin(t + i) * 10) % W, y = ((hash(i, 3) % 1000) / 1000 * H + Math.cos(t * 0.7 + i) * 12 + H) % H;
      var on = Math.sin(t * 3 + i) > -0.2;
      if (!on) continue;
      ctx.fillStyle = "rgba(246,239,122,.25)"; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
      ctx.fillStyle = "#fffbd0"; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }
  function drawFx(f) {
    if (f.kind === "dot") { ctx.fillStyle = f.color; ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 2); }
    else if (f.kind === "ring") {
      var k = 1 - f.life / f.max;
      ctx.strokeStyle = f.col ? "rgba(" + f.col + "," + (1 - k) + ")" : f.red ? "rgba(255,70,40," + (1 - k) + ")" : "rgba(242,176,94," + (1 - k) + ")"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.4 + k * 0.6), f.r * (0.4 + k * 0.6) * 0.8, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = f.col ? "rgba(" + f.col + "," + (0.25 * (1 - k)) + ")" : "rgba(255,226,122," + (0.35 * (1 - k)) + ")"; ctx.fill();
    } else if (f.kind === "beam") {
      var tb = f.life / f.max, bx = Math.cos(f.a) * f.len, by = Math.sin(f.a) * f.len;
      ctx.strokeStyle = "rgba(" + f.col + "," + (0.5 * tb) + ")"; ctx.lineWidth = f.w * 2; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + bx, f.y + by); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255," + tb + ")"; ctx.lineWidth = Math.max(1, f.w * 0.6); ctx.stroke(); ctx.lineWidth = 1;
    } else if (f.kind === "ghost") {
      ctx.globalAlpha = 0.5 * f.life / f.max; blit(SPR[f.spr][0], f.x, f.y, f.face < 0, true); ctx.globalAlpha = 1;
    } else if (f.kind === "slash") {
      var tk = 1 - f.life / f.max, o = f.pl || me, a0 = f.a - f.arc / 2, sw = f.arc * Math.min(1, tk * 2.2);
      var s0 = f.flip ? f.a + f.arc / 2 : a0, s1 = f.flip ? s0 - sw : s0 + sw;
      ctx.strokeStyle = "rgba(216,224,232," + (1 - tk) + ")"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(o.x, o.y, f.r * 0.9, f.r * 0.75, 0, s0, s1, !!f.flip); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255," + (1 - tk) + ")"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.lineWidth = 1;
    } else if (f.kind === "swipe") {
      // arc tracé du haut vers le bas en passant par le côté frappé (droite ou gauche)
      var t = 1 - f.life / f.max, st = -Math.PI / 2, sweep = Math.PI * Math.min(1, t * 2.5);
      var ccw = f.dir < 0;
      ctx.strokeStyle = "rgba(242,176,94," + (1 - t) + ")"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse((f.pl || me).x, (f.pl || me).y, f.r * 0.85, f.r * 0.7, 0, st, ccw ? st - sweep : st + sweep, ccw); ctx.stroke();
      ctx.strokeStyle = "rgba(253,243,222," + (1 - t) + ")"; ctx.lineWidth = 1; ctx.stroke();
    } else if (f.kind === "spin") {
      var ts = 1 - f.life / f.max;
      ctx.strokeStyle = "rgba(242,176,94," + (1 - ts) + ")"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse((f.pl || me).x, (f.pl || me).y, f.r * 0.85, f.r * 0.7, 0, ts * TAU, ts * TAU + TAU * 0.8); ctx.stroke();
      ctx.strokeStyle = "rgba(253,243,222," + (1 - ts) + ")"; ctx.lineWidth = 1; ctx.stroke();
    } else if (f.kind === "bolt") {
      var al = Math.max(0, f.life / f.max);
      [["rgba(246,239,122," + al + ")", 3], ["rgba(255,255,240," + al + ")", 1]].forEach(function (st2) {
        ctx.strokeStyle = st2[0]; ctx.lineWidth = st2[1]; ctx.beginPath();
        f.pts.forEach(function (pt, idx) {
          if (!idx) { ctx.moveTo(pt[0], pt[1]); return; }
          var pr = f.pts[idx - 1];
          ctx.lineTo((pr[0] + pt[0]) / 2 + (hash(idx, pt[0] | 0) % 9 - 4), (pr[1] + pt[1]) / 2 + (hash(pt[1] | 0, idx) % 9 - 4));
          ctx.lineTo(pt[0], pt[1]);
        });
        ctx.stroke();
      });
    }
  }

  /* ---------- HUD dessiné dans le jeu ---------- */
  function box(x, y, w, h, fill, line) {
    ctx.fillStyle = line || OUT; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  }
  function icon(name, cx, cy) { if (SPR[name]) blit(SPR[name][0], cx, cy); }
  function drawSlots(x, y, list, max, sprOf, isFusion, ready) {
    var S2 = 12;
    for (var i = 0; i < max; i++) {
      var bx = x + i * (S2 + 1), it = list[i];
      var gold = it && isFusion && isFusion(it[0]);
      if (it && ready[it[0]] && Math.sin(r.time * 10) > 0) { ctx.fillStyle = "#f6d36b"; ctx.fillRect(bx - 1, y - 1, S2 + 2, S2 + 2); }
      box(bx, y, S2, S2, it ? (gold ? "#4a3a10" : "#1f3a2b") : "rgba(31,58,43,.45)", it ? (gold ? "#f6d36b" : OUT) : "rgba(43,23,9,.6)");
      if (it) {
        icon(sprOf(it[0]), bx + S2 / 2, y + S2 / 2);
        if (it[1] >= MAX_LVL) { ctx.fillStyle = "#f6d36b"; ctx.fillRect(bx + 1, y + S2 - 2, S2 - 2, 1); }
        drawText(String(it[1]), bx + S2 - 1, y + S2 - 4, it[1] >= MAX_LVL ? "#f6d36b" : "#fdf3de", "c");
      } else {
        ctx.fillStyle = "rgba(253,243,222,.35)"; ctx.fillRect(bx + 5, y + 5, 2, 2);
      }
    }
  }
  function drawStateHud() {
    if (!me || !me.posture) return;
    if (isExpe() && r.ex) drawExpeHud();
    var ps = postureDef(me), lab = { ancre: "ANCRE", mouvement: "MOUVEMENT", volte: "VOLTE !", pause: me.char.id === "planeur" ? "GLISSE" : "..." }[me.mstate] || "";
    var t = ps.name.toUpperCase() + " · " + lab + (me.crew ? " · EQUIPAGE " + me.crew.length + "/" + crewMax(me) : "") + (me.arme && mastLevel(me.arme) >= 5 ? " · ULTIME " + Math.round((me.ultG || 0) * 100) + "%" : "") + charHud(me);
    drawText(t, W / 2, H - 9, me.mstate === "volte" ? "#f6ef7a" : me.anchored ? ps.color : "#fdf3de", "c");
  }
  function drawHud() {
    drawStateHud();
    var bw = W - 4, ratio = Math.max(0, Math.min(1, xp / xpNext));
    box(2, 2, bw, 9, "#3a2618");
    ctx.fillStyle = "#e0a82a"; ctx.fillRect(3, 3, Math.round((bw - 2) * ratio), 7);
    ctx.fillStyle = "#ffe27a"; ctx.fillRect(3, 3, Math.round((bw - 2) * ratio), 2);
    drawText("NIV " + r.level, W / 2, 4, "#fdf3de", "c");
    drawShrineMarkers(); drawPortalMarker();
    // cases d'armes (haut) et d'objets (bas), 6 chacune
    var wl2 = Object.keys(p.weapons).map(function (id) { return [id, p.weapons[id]]; });
    var pl2 = Object.keys(p.passives).map(function (id) { return [id, p.passives[id]]; });
    var ready = {};
    readyFusions().forEach(function (id) { D.FUSIONS[id].from.forEach(function (k) { ready[k] = true; }); });
    drawSlots(2, 14, wl2, MAX_W, function (id) { return techDef(me, id).icon; }, function (id) { var d = techDef(me, id); return d.fusion || !!(me.evo || {})[id]; }, ready);
    drawSlots(2, 27, pl2, MAX_P, function (id) { return D.PASSIVES[id].sprite; }, null, ready);
    if (Object.keys(ready).length && Math.sin(r.time * 6) > -0.3) drawText("FUSION PRETE", 2 + MAX_W * 13 + 3, 30, "#f6d36b", "l");
    // PV
    var hpw = MAX_W * 13 - 1, hpr = Math.max(0, me.hp / (me.maxHp || 1));
    box(2, 40, hpw, 6, "#3a2618");
    ctx.fillStyle = hpr > 0.3 ? "#9cc56b" : "#c8553d"; ctx.fillRect(3, 41, Math.round((hpw - 2) * hpr), 4);
    // coéquipiers (sous les cases)
    var yy = 50;
    if (players.length > 1) {
      players.forEach(function (pl) {
        if (pl === me) return;
        drawText(String(pl.name).slice(0, 8), 2, yy, pl.down ? "#ff5a3a" : mateColor(pl), "l");
        box(36, yy, 30, 5, "#3a2618");
        ctx.fillStyle = pl.down ? "#ff5a3a" : "#9cc56b"; ctx.fillRect(37, yy + 1, Math.round(28 * Math.max(0, pl.hp / (pl.maxHp || 1))), 3);
        yy += 8;
      });
    }
    // chrono, ennemis, or (à droite)
    if (isDungeon()) {
      drawText(fmtTime(r.time), W - 4, 15, "#fdf3de", "r", 2);
      var ty = drawTierBar(45);
      drawText("ETAGE " + r.dg.floor + "/" + DG.floors, W - 4, ty, "#f6d36b", "r");
      drawMinimap(W - 4, ty + 9);
    } else if (isArena()) {
      var left = Math.max(0, r.roundLen - r.roundT);
      drawText(fmtTime(Math.ceil(left)), W - 4, 15, left < 5 && r.phase === "fight" ? "#ff5a3a" : "#fdf3de", "r", 2);
      var ta = drawTierBar(45);
      drawText("MANCHE " + r.round + "/" + A.rounds, W - 4, ta, "#f6d36b", "r");
      if (r.mod && r.phase === "fight") drawText(r.mod.name, W - 4, ta + 8, "#ff8a6a", "r");
    } else {
      drawText(fmtTime(stageTime()), W - 4, 15, rageMin() > 0 ? "#ff5a3a" : "#fdf3de", "r", 2);
      var tm = drawTierBar(45);
      if (r.stage && !isExpe()) drawText("CARTE " + (r.stage + 1) + " · " + fmtTime(r.time), W - 4, tm, "#f6d36b", "r");
    }
    // reliques et objets sous les cases
    var rk = Object.keys(me.relics || {});
    rk.forEach(function (id, i) { var rl = D.RELICS.filter(function (x) { return x.id === id; })[0]; if (rl) { ctx.font = "8px sans-serif"; ctx.fillText(rl.icon, 2 + i * 10, yy + 6); } });
    drawItemsHud(yy - 1 + (rk.length ? 10 : 0));
    var k = String(r.kills), g = String(Math.floor(r.gold));
    drawText(k, W - 4, 29, "#fdf3de", "r"); icon("skull", W - 4 - textWidth(k) - 5, 31);
    drawText(g, W - 4, 37, "#ffe27a", "r"); icon("gold", W - 4 - textWidth(g) - 5, 39);
    // boss
    if (curBoss) {
      var bb = Math.min(160, W - 16), bx = Math.round(W / 2 - bb / 2), by = 56;
      drawText(curBoss.title || (curBoss.aff ? bossTitle(curBoss) : curBoss.d.name), W / 2, by - 7, curBoss.aff && curBoss.aff.length ? AFX[curBoss.aff[0]].color : "#f6d36b", "c");
      box(bx, by, bb, 7, "#3a2618");
      ctx.fillStyle = "#c8553d"; ctx.fillRect(bx + 1, by + 1, Math.round((bb - 2) * Math.max(0, curBoss.hp / curBoss.maxHp)), 5);
    }
  }

  // fond des menus
  var parade = [];
  function drawIdle(now) {
    var t = now / 1000, m = mapById(S.map);
    drawGround(Math.round(t * 18), Math.round(Math.sin(t * 0.2) * 20), m);
    if (parade.length < 6 && Math.random() < 0.01) {
      var types = m.biomes[(Math.random() * m.biomes.length) | 0].enemies.map(function (e) { return e[0]; });
      var ty = D.ENEMIES[types[(Math.random() * types.length) | 0]];
      parade.push({ spr: SPR[ty.sprite], x: W + 20, y: H * (0.15 + Math.random() * 0.75), v: 8 + Math.random() * 12, a: Math.random() * 2 });
    }
    parade.forEach(function (q) { q.x -= q.v / 60; q.a += 0.08; blit(q.spr[(q.a | 0) % q.spr.length], q.x, q.y, true); });
    parade = parade.filter(function (q) { return q.x > -30; });
    drawHero(charById(S.char).sprite, W / 2, H * 0.8, 1, true, t * 8, 0);
    ctx.fillStyle = m.night ? "rgba(10,20,15,.4)" : "rgba(30,40,20,.2)";
    ctx.fillRect(0, 0, W, H);
  }

  /* =====================================================================
     Écrans (menus)
     ===================================================================== */
  function fmtTime(s) { s = Math.floor(s); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }
  function score() {
    if (isDungeon()) return Math.round(((r.dg.floor - 1) * 3000 + r.dg.clearedTotal * 250 + r.kills + (r.won ? 10000 : 0)) * DIFF.score);
    if (isArena()) return Math.round(((r.won ? A.rounds : r.round - 1) * 1000 + r.kills + (r.won ? 5000 : 0)) * DIFF.score);
    return Math.round((Math.floor(r.time) * 10 + r.kills + r.bonus) * DIFF.score);
  }
  function runGold() { return Math.floor((r.kills * 0.1 + r.time / 6 + r.bosses * 30 + r.level) * p.goldMul + r.gold); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fr(n) { return String(n).replace(".", ","); }
  function showCard(html, name) {
    var same = screen === name && !overlay.hidden;
    var keep = overlay.scrollTop;
    screen = name;
    card.innerHTML = html;
    card.querySelectorAll(".np-slider").forEach(function (sl) {
      var sel = sl.querySelector(".is-inspected") || sl.querySelector(".is-selected");
      if (sel) sl.scrollLeft = sel.offsetLeft - sl.offsetLeft - (sl.clientWidth - sel.offsetWidth) / 2;
    });
    card.className = "panel game-card game-card-" + name;
    overlay.hidden = false;
    overlay.scrollTop = same ? keep : 0;
    $("[data-hud]").hidden = !(state === "play" || state === "levelup" || state === "pause");
    if (state !== "play" && state !== "levelup") $("[data-toasts]").innerHTML = "";
    if (!same) setTimeout(function () {
      var f = card.querySelector("[data-autofocus]") || card.querySelector("button:not([disabled])");
      if (f && window.matchMedia("(hover: hover)").matches) f.focus({ preventScroll: true });
    }, 30);
  }
  function hideCard() { overlay.hidden = true; $("[data-hud]").hidden = false; }
  function rankBadge() {
    var need = D.rankNeed(S.rank), k = Math.min(100, Math.round(S.rankXp / need * 100));
    return '<div class="rank-badge"><span>Rang <b>' + S.rank + "</b>" + (S.prestige ? ' <span class="stars">' + stars(S.prestige) + "</span>" : "") + '</span><span class="rank-bar"><i style="width:' + k + '%"></i></span><small>' + S.rankXp + " / " + need + " XP</small></div>";
  }
  function goldBadge() { return '<p class="gold-badge">' + goldIc() + " <b>" + S.gold.toLocaleString("fr-FR") + "</b></p>"; }
  function back() { return '<button class="btn btn-ghost btn-small btn-back" type="button" data-action="go" data-arg="menu" aria-label="Retour">←<span class="bk-tx"> Retour</span></button>'; }
  function iconOfAny(k) { return ALLW[k] ? ALLW[k].icon : (D.PASSIVES[k] ? D.PASSIVES[k].sprite : "nut"); }
  function shopCost(it, lvl) { return Math.round(it.cost * (1 + lvl) * (1 + lvl * 0.25)); }
  function lockText(ach) { var a = achById(ach); return a ? "Succès « " + a.name + " » : " + a.desc : "Verrouillé"; }

  var inspect = { char: null, map: null, dun: null };
  /* ---------- arbre de compétences en tentacules (SVG) ---------- */
  var treeSel = "a1";
  function branchOf(k) { return D.SKILL_BRANCHES.filter(function (b) { return b.id === k.branch; })[0]; }
  function tPos(k) {
    var br = branchOf(k), d = k.pos[0], o = k.pos[1], rad = 44 + d * 38;
    var th = (br.angle + d * 9) * Math.PI / 180 + o * 30 / rad;
    return { x: Math.cos(th) * rad, y: Math.sin(th) * rad };
  }
  function f1(n) { return Math.round(n * 10) / 10; }
  function tentaclePath(a, b, depth, seed) {
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    var wig = (seed % 2 ? 1 : -1) * Math.min(18, len * 0.28);
    var cx = mx - dy / len * wig, cy = my + dx / len * wig;
    return { d: "M" + f1(a.x) + " " + f1(a.y) + " Q" + f1(cx) + " " + f1(cy) + " " + f1(b.x) + " " + f1(b.y), cx: cx, cy: cy };
  }
  function qpt(a, c, b, t) { var u = 1 - t; return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }; }
  function nodeSvg(k, sel) {
    var pt = tPos(k), br = branchOf(k), lvl = S.tree[k.id] || 0, open = skillOpen(k), max = lvl >= k.max;
    var can = open && !max && freePoints() >= k.cost;
    var cls = "tnode" + (lvl ? " on" : "") + (max ? " max" : "") + (open ? "" : " off") + (can ? " can" : "") + (sel.id === k.id ? " sel" : "");
    var pips = "";
    for (var i = 0; i < k.max; i++) {
      var a = Math.PI / 2 + (i - (k.max - 1) / 2) * 0.42;
      pips += '<circle class="pip' + (i < lvl ? " on" : "") + '" cx="' + f1(Math.cos(a) * 19) + '" cy="' + f1(Math.sin(a) * 19) + '" r="2.4"/>';
    }
    return '<g class="' + cls + '" data-action="tsel" data-arg="' + k.id + '" transform="translate(' + f1(pt.x) + " " + f1(pt.y) + ')" style="--br:' + br.color + '" role="button" aria-label="' + esc(k.name) + '">' +
      '<circle class="hit" r="20"/><circle class="halo" r="17"/><circle class="disc" r="14"/>' + pips +
      '<text class="ic" y="5">' + (open ? k.icon : "🔒") + "</text></g>";
  }
  function tentacleSvg(sel) {
    var out = "", root = { x: 0, y: 0 }, seed = 0;
    D.SKILL_BRANCHES.forEach(function (br, bi) {
      var g = "", gc = "", gn = "";
      var list = D.SKILLS.filter(function (k) { return k.branch === br.id; });
      list.forEach(function (k) {
        var to = tPos(k), lvl = S.tree[k.id] || 0, open = skillOpen(k);
        var parents = k.req && k.req.length ? k.req.map(function (id) { return tPos(skillById(id)); }) : [root];
        parents.forEach(function (from) {
          seed++;
          var w = Math.max(2.5, 9 - k.pos[0] * 1.6), q = tentaclePath(from, to, k.pos[0], seed);
          var st = lvl ? "on" : (open ? "open" : "off");
          g += '<path class="tent ' + st + '" d="' + q.d + '" stroke-width="' + f1(w) + '"/>';
          [0.3, 0.55, 0.8].forEach(function (t) {
            var c = qpt(from, { x: q.cx, y: q.cy }, to, t);
            gc += '<circle class="cup ' + st + '" cx="' + f1(c.x) + '" cy="' + f1(c.y) + '" r="' + f1(Math.max(1.2, w * 0.28)) + '"/>';
          });
        });
        gn += nodeSvg(k, sel);
      });
      var la = (br.angle + 28) * Math.PI / 180, lp = { x: Math.cos(la) * 50, y: Math.sin(la) * 50 };
      out += '<g class="tentacle" style="--br:' + br.color + ";animation-duration:" + (5 + bi) + "s;animation-delay:-" + (bi * 2) + 's">' + g + gc + gn +
        '<text class="br-label" x="' + f1(lp.x) + '" y="' + f1(lp.y + 3) + '" style="fill:' + br.color + '">' + esc(br.name.toUpperCase()) + "</text></g>";
    });
    var acorn = '<image href="' + spriteUrl("goldacorn") + '" x="-11" y="-12" width="22" height="24" style="image-rendering:pixelated"/>';
    return '<svg class="tentacles" viewBox="-215 -215 430 430" xmlns="http://www.w3.org/2000/svg">' + out +
      '<g class="troot"><circle r="20"/>' + acorn + "</g></svg>";
  }
  function skillPanel(k) {
    var br = branchOf(k), lvl = S.tree[k.id] || 0, open = skillOpen(k), max = lvl >= k.max, can = open && !max && freePoints() >= k.cost;
    var pips = ""; for (var i = 0; i < k.max; i++) pips += '<i class="' + (i < lvl ? "on" : "") + '"></i>';
    var lock = !open ? (k.prestige && S.prestige < k.prestige ? "Prestige " + k.prestige + " requis" : "Nécessite " + (k.req || []).map(function (id) { return skillById(id).name; }).join(" + ")) : "";
    return '<div class="skill-panel" style="--br:' + br.color + '"><span class="skill-ic">' + (open ? k.icon : "🔒") + "</span>" +
      '<div class="skill-text"><small style="color:' + br.color + '">' + esc(br.name) + "</small><strong>" + esc(k.name) + "</strong><span>" + esc(k.desc) + "</span>" +
      '<span class="pips">' + pips + "</span>" + (lock ? '<span class="skill-lock">' + esc(lock) + "</span>" : "") + "</div>" +
      (max ? '<span class="shop-max">MAX</span>' : '<button class="btn btn-small" type="button" data-action="learn" data-arg="' + k.id + '"' + (can ? "" : " disabled") + ">Apprendre · " + k.cost + " pt</button>") + "</div>";
  }
  function modeRow(action) {
    var mo = S.mode || "survie";
    return '<div class="diff-row mode-row"><span>Mode :</span>' +
      '<button type="button" class="chip' + (mo === "survie" ? " is-on" : "") + '" data-action="' + action + '" data-arg="survie">🌲 Survie</button>' +
      '<button type="button" class="chip' + (mo === "arena" ? " is-on" : "") + '" data-action="' + action + '" data-arg="arena">🏟️ Arène</button>' +
      '<button type="button" class="chip' + (mo === "dungeon" ? " is-on" : "") + '" data-action="' + action + '" data-arg="dungeon">🗝️ Donjon</button></div>' +
      '<p class="game-small mode-desc">' + (mo === "dungeon"
        ? DG.floors + " étages générés au hasard : salles à nettoyer, élites, trésors, reliques, un gardien par étage et un boss final."
        : mo === "arena"
        ? "Arène fermée, " + A.rounds + " manches. Boutique entre les manches, manche d'élite toutes les " + A.eliteEvery + ", boss toutes les " + A.bossEvery + "."
        : "Monde ouvert sans fin : survis le plus longtemps possible.") + "</p>";
  }
  function swatch(m, cls) {
    return '<span class="map-swatch ' + (cls || "") + '">' + m.biomes.map(function (b) { return '<i style="background:' + b.ground.base + '"></i>'; }).join("") +
      '<img src="' + spriteUrl(m.biomes[0].prop) + '" alt=""></span>';
  }
  function charInfo(c) {
    var ok = charAvailable(c), m = c.mods || {}, tags = [];
    if (m.hp) tags.push((m.hp > 0 ? "+" : "") + m.hp + " PV");
    if (m.speed) tags.push((m.speed > 0 ? "+" : "") + Math.round(m.speed * 100) + " % vitesse");
    if (m.might) tags.push((m.might > 0 ? "+" : "") + Math.round(m.might * 100) + " % dégâts");
    if (m.armor) tags.push("+" + m.armor + " armure");
    if (m.magnet) tags.push("+" + Math.round(m.magnet * 100) + " % ramassage");
    if (m.cd) tags.push("-" + Math.round(m.cd * 100) + " % recharge");
    if (m.xp) tags.push("+" + Math.round(m.xp * 100) + " % expérience");
    if (m.area) tags.push("+" + Math.round(m.area * 100) + " % zone");
    if (m.amount) tags.push("+" + m.amount + " projectile");
    if (m.dodge) tags.push("+" + Math.round(m.dodge * 100) + " % esquive");
    if (m.regen) tags.push("+" + String(m.regen).replace(".", ",") + " PV/s");
    var w = D.WEAPONS[c.weapon];
    return '<div class="pick-info"><img class="pick-big" src="' + spriteUrl(c.sprite) + '" alt=""><div>' +
      "<strong>" + esc(c.name) + "</strong> <small>" + esc(c.title) + "</small>" +
      "<p>" + esc(c.desc) + "</p>" +
      '<p class="pick-weapon"><img src="' + spriteUrl(w.icon) + '" alt=""> ' + esc(w.name) + "</p>" +
      '<p class="pick-tags">' + esc(tags.length ? tags.join(" · ") : "Aucun bonus ni malus") + "</p>" +
      (ok ? "" : !questOk(c) ? '<p class="pick-lock">🗝️ Quête : ' + esc(questById(c.quest).desc) + "</p>" :
        '<p class="pick-lock">🔒 ' + esc(lockText(c.unlock)) + "</p>" +
        '<button class="btn btn-small" type="button" data-action="buychar" data-arg="' + c.id + '"' + (S.gold < c.price ? " disabled" : "") + ">Acheter " + c.price + " " + goldIc() + "</button>") +
      "</div></div>";
  }
  // fiche du perso sélectionné (écran « Nouvelle partie »)
  function npChar(c) {
    var ok = charAvailable(c), m = c.mods || {}, tags = [], w = D.WEAPONS[c.weapon];
    function t(v, txt) { tags.push('<span class="np-tag ' + (v > 0 ? "up" : "down") + '">' + txt + "</span>"); }
    if (m.hp) t(m.hp, (m.hp > 0 ? "+" : "") + m.hp + " PV");
    if (m.speed) t(m.speed, (m.speed > 0 ? "+" : "") + Math.round(m.speed * 100) + " % vitesse");
    if (m.might) t(m.might, (m.might > 0 ? "+" : "") + Math.round(m.might * 100) + " % dégâts");
    if (m.armor) t(m.armor, "+" + m.armor + " armure");
    if (m.magnet) t(m.magnet, "+" + Math.round(m.magnet * 100) + " % ramassage");
    if (m.cd) t(m.cd, "-" + Math.round(m.cd * 100) + " % recharge");
    if (m.xp) t(m.xp, "+" + Math.round(m.xp * 100) + " % XP");
    if (m.area) t(m.area, "+" + Math.round(m.area * 100) + " % zone");
    if (m.amount) t(m.amount, "+" + m.amount + " projectile");
    if (m.dodge) t(m.dodge, "+" + Math.round(m.dodge * 100) + " % esquive");
    if (m.regen) t(m.regen, "+" + String(m.regen).replace(".", ",") + " PV/s");
    if (c.twin) t(-1, "2 corps · 60 % dégâts");
    return '<div class="np-card"><img class="np-big" src="' + spriteUrl(c.sprite) + '" alt=""><div class="np-body">' +
      '<div class="np-name"><strong>' + esc(c.name) + "</strong> <small>" + esc(c.title) + "</small></div>" +
      '<div class="np-weapon"><img src="' + spriteUrl(w.icon) + '" alt="">' + esc(w.name) + "</div>" +
      '<div class="np-tags">' + (tags.length ? tags.join("") : '<span class="np-tag">Équilibré</span>') + "</div>" +
      '<p class="np-desc">' + esc(c.desc) + "</p>" +
      (ok ? "" : !questOk(c) ? '<p class="np-lock">🗝️ Quête : ' + esc(questById(c.quest).desc) + "</p>" :
        '<p class="np-lock">🔒 ' + esc(lockText(c.unlock)) + "</p>" +
        '<button class="btn btn-small" type="button" data-action="buychar" data-arg="' + c.id + '"' + (S.gold < c.price ? " disabled" : "") + ">Acheter " + c.price + " " + goldIc() + "</button>") +
      "</div></div>";
  }
  function mapInfo(m) {
    var ok = has(m.unlock);
    return '<div class="pick-info">' + swatch(m, "big") + "<div>" +
      "<strong>" + esc(m.name) + "</strong><p>" + esc(m.desc) + "</p>" +
      '<p class="pick-tags">Biomes : ' + esc(m.biomes.map(function (b) { return b.name; }).join(", ")) + "</p>" +
      '<p class="pick-tags">Ennemis ×' + fr(m.hp) + " PV · glands d'or ×" + fr(m.gold) + "</p>" +
      (ok ? "" : '<p class="pick-lock">🔒 ' + esc(lockText(m.unlock)) + "</p>") + "</div></div>";
  }

  var SCREENS = {
    menu: function () {
      var nAch = Object.keys(S.ach).length, nQ = Object.keys(S.quests || {}).length, fp = freePoints();
      var need = D.rankNeed(S.rank), k = Math.min(100, Math.round(S.rankXp / need * 100));
      var mode = { arena: "Arène", dungeon: "Donjon" }[S.mode] || "Survie";
      function tile(arg, ic, label, sub, badge, hot) {
        return '<button type="button" class="mm-tile' + (hot ? " is-hot" : "") + '" data-action="go" data-arg="' + arg + '">' +
          '<span class="mm-ic">' + ic + "</span><span class=\"mm-lb\"><b>" + label + "</b>" + (sub ? "<small>" + sub + "</small>" : "") + "</span>" +
          (badge ? '<span class="pill">' + badge + "</span>" : "") + "</button>";
      }
      return '<div class="mm">' +
        '<header class="mm-head"><img src="' + spriteUrl(charById(S.char).sprite) + '" alt=""><div><span class="kicker">Refonte en bêta</span><h2>Écureuil Survivor 2.0</h2></div></header>' +
        '<div class="mm-stats"><span class="mm-gold">' + goldIc() + " <b>" + S.gold.toLocaleString("fr-FR") + "</b></span>" +
        '<span class="mm-rank"><span>Rang <b>' + S.rank + "</b>" + (S.prestige ? ' <span class="stars">' + stars(S.prestige) + "</span>" : "") + '</span><span class="rank-bar"><i style="width:' + k + '%"></i></span><small>' + S.rankXp + "/" + need + "</small></span></div>" +
        '<div class="mm-main">' +
        '<button class="btn mm-play" type="button" data-action="go" data-arg="play" data-autofocus><span>▶ Le sentier : partir</span><small>' + esc(charById(S.char).name) + " · " + esc(postureOf(S.char, (S.posture || {})[S.char]).name) + " · " + esc(mapById(S.map).name) + "</small></button>" +
        '<a class="btn btn-ghost mm-coop" href="jeu-classique.html"><span>↩ Version 1</span><small>coop</small></a></div>' +
        '<div class="mm-grid">' +
        tile("terrier", "🕳️", "Le terrier", "Attirail, talents, maîtrise") +
        tile("atelier", "🔨", "L'atelier", "Craft et recyclage") +
        tile("succes", "🏆", "Succès", nAch + " / " + D.ACHIEVEMENTS.length) +
        tile("quetes", "🗝️", "Quêtes", nQ + " / " + D.QUESTS.length) +
        tile("codex", "📜", "Techniques", "20 techniques · " + (Object.keys(D.TFUS).length + Object.keys(D.TFUS2).length + Object.keys(D.COMBOS).length + Object.keys(D.LEGENDS).length) + " fusions") +
        tile("help", "❓", "Aide", "Comment jouer") +
        tile("options", "⚙️", "Options", "Son, effets") +
        "</div>" +
        '<footer class="mm-foot">' +
        (S.stats.runs ? "<span>🏁 " + S.stats.bestScore.toLocaleString("fr-FR") + " pts · " + fmtTime(S.stats.bestTime) + " · " + S.stats.runs + " partie" + (S.stats.runs > 1 ? "s" : "") + "</span>" : "<span>Prêt pour ta première partie ?</span>") +
        '<span class="mm-foot-r"><button class="mm-link" type="button" data-action="fullscreen">' + (isFull() ? "✕ Quitter le plein écran" : "⛶ Plein écran") + "</button> · v" + VERSION + "</span></footer>" +
        "</div>";
    },
    play: function () {
      var ic = charById(inspect.char || S.char), im = mapById(inspect.map || S.map);
      S.posture = S.posture || {};
      var html = '<div class="screen-head">' + back() + "<h2>Nouvelle partie</h2>" + goldBadge() + "</div><div class=\"np\">";
      var ex = S.mode === "expedition", mo = S.mode || "survie";
      var MODES2 = [["survie", "🌲", "Survie", "Monde ouvert sans fin, portail et méga boss. Spécialité : ressources en masse."],
                    ["arena", "🏟️", "Arène", A.rounds + " manches avec boutique. Spécialité : runes et maîtrise des armes."],
                    ["dungeon", "🗝️", "Donjon", DG.floors + " étages de salles, gardiens et boss final. Spécialité : trophées et recettes de panoplies."],
                    ["expedition", "🎒", "Expédition", "Carte d'extraction à étages : explore, remplis ton sac, puis sors ou descends. Mourir fait perdre le sac (sauf l'abri)." + (S.stats.bestDepth ? " Record : étage " + S.stats.bestDepth + "." : "")]];
      html += '<section class="np-sec"><h3>Mode</h3><div class="np-seg">' + MODES2.map(function (m) { return '<button type="button" class="np-opt' + (mo === m[0] ? " is-on" : "") + '" data-action="mode2" data-arg="' + m[0] + '"><span class="np-oi">' + m[1] + "</span>" + m[2] + "</button>"; }).join("") +
        '</div><p class="np-hint">' + esc(MODES2.filter(function (m) { return m[0] === mo; })[0][3]) + "</p></section>";
      // 1. écureuil et sa règle unique
      html += '<section class="np-sec"><h3><span class="np-n">1</span>Écureuil</h3><div class="np-chars">';
      D.CHARACTERS.forEach(function (c) {
        var okc = charAvailable(c);
        html += '<button type="button" class="np-char' + (S.char === c.id ? " is-selected" : "") + (okc ? "" : " is-locked") + (ic.id === c.id ? " is-inspected" : "") +
          '" data-action="tchar" data-arg="' + c.id + '" aria-label="' + esc(c.name) + '"><img src="' + spriteUrl(c.sprite) + '" alt="">' + (okc ? "" : "<i>🔒</i>") + "</button>";
      });
      html += '</div><p class="np-hint"><b>' + esc(ic.name) + "</b> · " + esc(ic.title) + "<br>" + esc(ic.rule) + (charAvailable(ic) ? "" : '<br><span class="np-lock">🔒 ' + esc(questById(ic.quest).desc) + "</span>") + "</p></section>";
      // 2. posture : une règle par état
      var cur = postureOf(S.char, S.posture[S.char]);
      html += '<section class="np-sec"><h3><span class="np-n">2</span>Posture <small>' + esc(charById(S.char).name) + '</small></h3><div class="np-seg">';
      posturesOf(S.char).forEach(function (ps) {
        var ok = postureOk(ps);
        html += '<button type="button" class="np-opt' + (cur.id === ps.id ? " is-on" : "") + '" ' + (ok ? 'data-action="tpos" data-arg="' + ps.id + '"' : 'disabled') + ">" + (ok ? "" : "🔒 ") + esc(ps.name) + "</button>";
      });
      html += '</div><div class="v2-states">' +
        '<p><b>⚓ Ancré</b> ' + esc(cur.a) + "</p><p><b>🏃 Mouvement</b> " + esc(cur.m) + "</p><p><b>⚡ Volte</b> " + esc(cur.v) + "</p></div>";
      var locked = posturesOf(S.char).filter(function (ps) { return !postureOk(ps); });
      if (locked.length) html += '<p class="np-hint">' + locked.map(function (ps) { return "🔒 <b>" + esc(ps.name) + "</b> : " + esc(questById(ps.quest).desc); }).join("<br>") + "</p>";
      html += "</section>";
      if (mo === "dungeon") {
        html += '<section class="np-sec"><h3><span class="np-n">3</span>Type de donjon</h3><div class="np-slider">';
        D.DUNGEONS.forEach(function (d) {
          var okd = has(d.unlock), bands = d.themes.map(function (t, k) { return t.floor + " " + Math.round(k / 3 * 100) + "% " + Math.round((k + 1) / 3 * 100) + "%"; }).join(",");
          html += '<button type="button" class="np-map' + ((S.dungeon || "terriers") === d.id ? " is-selected" : "") + (okd ? "" : " is-locked") + '" data-action="tdun" data-arg="' + d.id + '"><span class="np-mapart" style="background:linear-gradient(90deg,' + bands + ')"><img class="np-boss" src="' + spriteUrl(D.ENEMIES[d.final].sprite) + '" alt="">' + (okd ? "" : "<i>🔒</i>") + '</span><span class="np-mapname">' + esc(d.name) + '</span><span class="np-mapdesc">' + esc(d.desc) + "</span></button>";
        });
        html += "</div></section>";
      } else {
      // 3. carte
      html += '<section class="np-sec"><h3><span class="np-n">3</span>' + (ex ? "Région" : "Carte") + ' <small>' + D.MAPS.filter(function (m) { return has(m.unlock); }).length + " / " + D.MAPS.length + '</small></h3><div class="np-slider">';
      D.MAPS.forEach(function (m) {
        var ok = has(m.unlock), bands = m.biomes.map(function (b, k) { var a = Math.round(k / m.biomes.length * 100), z = Math.round((k + 1) / m.biomes.length * 100); return b.ground.base + " " + a + "% " + z + "%"; }).join(",");
        html += '<button type="button" class="np-map' + (S.map === m.id ? " is-selected" : "") + (ok ? "" : " is-locked") + (im.id === m.id ? " is-inspected" : "") + '" data-action="tmap" data-arg="' + m.id + '">' +
          '<span class="np-mapart" style="background:linear-gradient(90deg,' + bands + ')"><img src="' + spriteUrl(m.biomes[0].prop) + '" alt="">' + (ok ? "" : "<i>🔒</i>") + "</span>" +
          '<span class="np-mapname">' + esc(m.name) + "</span>" +
          '<span class="np-mapmeta">' + (m.hp > 1 ? "PV ×" + fr(m.hp) + " · " : "") + "or ×" + fr(m.gold) + "</span>" +
          '<span class="np-mapdesc">' + esc(m.biomes.map(function (b) { return b.name; }).join(" · ")) + "</span></button>";
      });
      html += '</div><p class="np-hint"><b>' + esc(im.name) + "</b> · " + esc(im.desc) + (has(im.unlock) ? "" : ' <span class="np-lock">🔒 ' + esc(lockText(im.unlock)) + "</span>") + "</p></section>";
      }
      if (ex) {
        genContracts();
        var C = S.contracts;
        html += '<section class="np-sec"><h3>Contrats <small>' + C.taken.length + ' / 3</small></h3><div class="shop-list">';
        C.offers.forEach(function (c) {
          var on = C.taken.some(function (x) { return x.id === c.id; }), rw = Object.keys(c.rew.res).map(function (k) { return c.rew.res[k] + " " + D.RES[k].name; }).join(", ");
          html += '<div class="shop-item"><div class="shop-text"><strong>' + esc(c.txt) + "</strong><small>De " + esc(c.from) + " · " + esc(rw) + " + " + c.rew.gold + " glands d'or</small></div>" +
            '<button class="btn btn-small' + (on ? "" : " btn-alt") + '" type="button" data-action="ctake" data-arg="' + c.id + '">' + (on ? "Pris ✓" : "Prendre") + "</button></div>";
        });
        html += '</div><p class="np-hint">Récompensés à l\'extraction. De nouveaux contrats arrivent après chaque expédition.</p></section>';
      }
      // 4. difficulté
      html += '<section class="np-sec"><h3><span class="np-n">4</span>Difficulté</h3><div class="np-seg">';
      Object.keys(D.DIFFICULTIES).forEach(function (k) {
        var df = D.DIFFICULTIES[k], ok = has(df.unlock);
        html += '<button type="button" class="np-opt' + (S.diff === k ? " is-on" : "") + '" ' + (ok ? 'data-action="diff" data-arg="' + k + '"' : 'disabled title="' + esc(lockText(df.unlock)) + '"') + ">" +
          (ok ? "" : "🔒 ") + esc(df.name) + "<small>or ×" + fr(df.gold) + "</small>" + "</button>";
      });
      html += "</div>";
      var cmax = (S.cauch || {})[S.map] || 0, cn0 = Math.min(S.cn || 0, cmax);
      if (cmax) {
        html += '<div class="np-seg"><button type="button" class="np-opt' + (!cn0 ? " is-on" : "") + '" data-action="cn" data-arg="0">Sans Cauchemar</button>';
        for (var cn = 1; cn <= cmax; cn++) html += '<button type="button" class="np-opt' + (cn0 === cn ? " is-on" : "") + '" data-action="cn" data-arg="' + cn + '">C' + cn + "</button>";
        html += "</div>" + (cn0 ? '<p class="np-hint"><b>Cauchemar ' + cn0 + "</b> (glands d'or +" + cn0 * 15 + " %) :<br>" + D.NIGHTMARE.slice(0, cn0).map(function (t, i) { return (i + 1) + ". " + esc(t); }).join("<br>") + "</p>" : "");
      } else html += '<p class="np-hint">Bats le méga boss de cette carte pour débloquer les paliers Cauchemar.</p>';
      html += "</section></div>";
      html += '<div class="play-bar"><button class="btn np-go" type="button" data-action="start" data-autofocus><span>▶ Lancer</span><small>' + esc(charById(S.char).name) + " · " + esc(cur.name) + " · " + esc(mapById(S.map).name) + " · " + MODES2.filter(function (m) { return m[0] === mo; })[0][2] + "</small></button></div>";
      return html;
    },
    coop: function () {
      return '<div class="screen-head">' + back() + "<h2>Coop en ligne</h2></div>" +
        '<p class="game-small">2 à 6 écureuils, chacun sur son téléphone ou son ordi. Niveaux partagés, chacun choisit ses pouvoirs. Un joueur à terre se relève si un coéquipier reste à côté de lui 3 secondes.</p>' +
        (Net.err ? '<p class="net-err">' + esc(Net.err) + "</p>" : "") +
        '<div class="coop-form"><label for="es-coop-name">Ton pseudo</label><input id="es-coop-name" data-coop-name type="text" maxlength="16" autocomplete="nickname" placeholder="Pseudo" value="' + esc(S.name || "") + '">' +
        '<button class="btn" type="button" data-action="coophost">➕ Créer un salon</button>' +
        '<div class="coop-join"><input data-coop-code type="text" maxlength="4" autocapitalize="characters" autocomplete="off" placeholder="CODE" value="' + esc(Net.pendingCode || "") + '">' +
        '<button class="btn btn-alt" type="button" data-action="coopjoin">Rejoindre</button></div></div>';
    },
    lobby: function () {
      if (!Net.on) return SCREENS.coop();
      var host = Net.role === "host", ok = Net.status === "SUBSCRIBED";
      var hp = Net.roster.filter(function (x) { return x.host; })[0];
      var html = '<div class="screen-head"><button class="btn btn-ghost btn-small" type="button" data-action="leave">← Quitter</button><h2>Salon</h2>' + goldBadge() + "</div>" +
        '<div class="room-code"><span>Code du salon</span><b>' + esc(Net.code) + '</b><button class="btn btn-alt btn-small" type="button" data-action="invite">📨 Inviter</button></div>' +
        (Net.err ? '<p class="net-err">' + esc(Net.err) + "</p>" : "") +
        (!ok ? '<p class="game-small">Connexion au salon… (' + esc(Net.status || "") + ")</p>" : "") +
        '<ul class="room-players">';
      var newest = VERSION, mism = false;
      Net.roster.forEach(function (x) { if (x.v !== VERSION) mism = true; if (x.v && verCmp(x.v, newest) > 0) newest = x.v; });
      if (mism) {
        var old = Net.roster.filter(function (x) { return x.id !== Net.id && verCmp(x.v, newest) < 0; }).map(function (x) { return esc(x.name || "Écureuil"); });
        html += verCmp(VERSION, newest) < 0
          ? '<p class="net-err">⚠️ Ta version du jeu (' + VERSION + ") est plus ancienne que celle des autres (" + esc(newest) + ') : la partie ne peut pas se lancer. <button class="btn btn-small" type="button" data-action="reload">Recharger</button></p>'
          : '<p class="net-err">⚠️ ' + (old.join(", ") || "Un joueur") + " n'a pas la même version du jeu : il doit recharger la page (ou rouvrir le lien) avant de lancer.</p>";
      }
      Net.roster.slice(0, MAX_PLAYERS).forEach(function (x) {
        html += "<li>" + img(charById(x.char).sprite) + "<b>" + esc(x.name || "Écureuil") + "</b>" + (x.v !== VERSION ? ' <small class="ver-bad">' + (x.v ? "v" + esc(x.v) : "ancienne version") + "</small>" : "") + (x.prog && x.prog.pr ? ' <span class="stars">' + stars(x.prog.pr) + "</span>" : "") + (x.host ? " 👑" : "") + linkBadge(x.id) + (x.id === Net.id ? " <small>(toi)</small>" : "") + "</li>";
      });
      if (!Net.roster.length) html += "<li><small>En attente…</small></li>";
      html += "</ul><h3 class=\"pick-title\">Ton écureuil</h3><div class=\"tile-row\">";
      D.CHARACTERS.forEach(function (c) {
        if (!charAvailable(c)) return;
        html += '<button type="button" class="tile' + (S.char === c.id ? " is-selected" : "") + '" data-action="lchar" data-arg="' + c.id + '" aria-label="' + esc(c.name) + '">' + img(c.sprite) + "</button>";
      });
      html += "</div>" + charInfo(charById(S.char));
      if (host) {
        html += modeRow("lmode");
        if (S.mode === "dungeon") {
          html += '<h3 class="pick-title">Type de donjon</h3><div class="np-slider">';
          D.DUNGEONS.forEach(function (d) {
            if (!has(d.unlock)) return;
            var bands = d.themes.map(function (t, k) { return t.floor + " " + Math.round(k / 3 * 100) + "% " + Math.round((k + 1) / 3 * 100) + "%"; }).join(",");
            html += '<button type="button" class="np-map' + ((S.dungeon || "terriers") === d.id ? " is-selected" : "") + '" data-action="ldun" data-arg="' + d.id + '"><span class="np-mapart" style="background:linear-gradient(90deg,' + bands + ')"><img class="np-boss" src="' + spriteUrl(D.ENEMIES[d.final].sprite) + '" alt=""></span><span class="np-mapname">' + esc(d.name) + '</span><span class="np-mapmeta">PV ×' + fr(d.hp) + " · or ×" + fr(d.gold) + "</span></button>";
          });
        } else {
          html += '<h3 class="pick-title">Carte</h3><div class="np-slider">';
          D.MAPS.forEach(function (m) {
            if (!has(m.unlock)) return;
            var bands = m.biomes.map(function (b, k) { return b.ground.base + " " + Math.round(k / m.biomes.length * 100) + "% " + Math.round((k + 1) / m.biomes.length * 100) + "%"; }).join(",");
            html += '<button type="button" class="np-map' + (S.map === m.id ? " is-selected" : "") + '" data-action="lmap" data-arg="' + m.id + '"><span class="np-mapart" style="background:linear-gradient(90deg,' + bands + ')"><img src="' + spriteUrl(m.biomes[0].prop) + '" alt=""></span><span class="np-mapname">' + esc(m.name) + '</span><span class="np-mapmeta">or ×' + fr(m.gold) + "</span></button>";
          });
        }
        html += "</div>" + '<div class="diff-row"><span>Difficulté :</span>';
        Object.keys(D.DIFFICULTIES).forEach(function (k) {
          var df = D.DIFFICULTIES[k]; if (!has(df.unlock)) return;
          html += '<button type="button" class="chip' + (S.diff === k ? " is-on" : "") + '" data-action="ldiff" data-arg="' + k + '">' + esc(df.name) + "</button>";
        });
        html += '</div><div class="play-bar"><button class="btn" type="button" data-action="start"' + (ok ? "" : " disabled") + ">▶ Lancer la partie (" + Math.max(1, Math.min(MAX_PLAYERS, Net.roster.length)) + " joueur" + (Net.roster.length > 1 ? "s" : "") + ")</button></div>";
      } else {
        var m = hp ? mapById(hp.map) : null;
        html += '<p class="game-small">' + (hp ? "Mode : <b>" + ({ arena: "Arène", dungeon: "Donjon" }[hp.mode] || "Survie") + "</b> · " : "") + (m ? (hp.mode === "dungeon" ? "Donjon : <b>" + esc(dungeonById(hp.dtype).name) + "</b> · " : "Carte : <b>" + esc(m.name) + "</b> · ") + esc((D.DIFFICULTIES[hp.diff] || {}).name || "") + " (choisies par l'hôte)" : "") + "</p>" +
          '<div class="play-bar"><span class="waiting">' + (hp ? "En attente du lancement par " + esc(hp.name) + "…" : "En attente de l'hôte…") + "</span></div>";
      }
      return html;
    },
    tree: function () {
      var sel = skillById(treeSel) || D.SKILLS[0];
      var html = '<div class="screen-head">' + back() + '<h2>Compétences</h2><p class="gold-badge">🌳 <b>' + freePoints() + "</b> pt" + (freePoints() > 1 ? "s" : "") + "</p></div>" + rankBadge();
      html += '<div class="tentacles-wrap">' + tentacleSvg(sel) + "</div>";
      html += skillPanel(sel);
      html += '<p class="game-small">1 point par rang gagné, +2 par niveau de « Graines de savoir » (prestige). <button class="link-btn" type="button" data-action="respec">Réinitialiser l\'arbre (gratuit)</button></p>';
      return html;
    },
    prestige: function () {
      var n = S.prestige, pp = progressParts(), req = prestigeReq(), cost = prestigeCost();
      var okProg = pp.frac >= req - 1e-9, okGold = S.gold >= cost, needLv = Math.ceil(req * pp.max - 1e-9);
      var html = '<div class="screen-head">' + back() + '<h2>Prestige</h2><p class="gold-badge">✨ <b>' + S.ppts.toLocaleString("fr-FR") + "</b></p></div>" +
        '<div class="prestige-head"><span class="stars big">' + (n ? stars(n) : "☆") + "</span><b>Prestige " + n + "</b></div>" +
        '<h3 class="pick-title">Prochain prestige</h3>' +
        '<div class="prestige-progress' + (okProg ? " is-ok" : "") + '"><span>' + (okProg ? "✅" : "⬜") + " Progression débloquée : " + Math.floor(pp.frac * 100) + " % (requis : " + Math.ceil(req * 100) + " %)</span>" +
          '<span class="rank-bar req-bar" style="--req:' + (req * 100) + '%"><i style="width:' + Math.round(pp.frac * 100) + '%"></i></span>' +
          "<small>" + pp.have + " / " + pp.max + " niveaux (boutique + arbre) · il en faut " + needLv +
          (okProg ? "" : ' · <button class="link-btn" type="button" data-action="go" data-arg="shop">boutique</button> · <button class="link-btn" type="button" data-action="go" data-arg="tree">arbre</button>') + "</small></div>" +
        '<div class="prestige-progress' + (okGold ? " is-ok" : "") + '"><span>' + (okGold ? "✅" : "⬜") + " " + cost.toLocaleString("fr-FR") + " glands d\'or (consommés)</span>" +
          '<span class="rank-bar"><i style="width:' + Math.min(100, Math.round(S.gold / cost * 100)) + '%"></i></span><small>' + S.gold.toLocaleString("fr-FR") + " / " + cost.toLocaleString("fr-FR") + "</small></div>" +
        '<p class="prestige-gain">Gain si tu fais le prestige maintenant : <b>+' + prestigeGain().toLocaleString("fr-FR") + " ✨</b>" +
          '<small>Tout débloqué = ' + D.PRESTIGE.fullPoints.toLocaleString("fr-FR") + " ✨" + (pu("multi") ? " · multiplicateur ×" + fr(1 + 0.25 * pu("multi")) : "") + "</small></p>" +
        '<div class="prestige-rules"><p><b>Tout repart à zéro :</b> glands d\'or, améliorations, rang, arbre de compétences' + (pu("memoire") ? "" : ", succès, écureuils et cartes débloqués") + ", statistiques.</p>" +
        "<p><b>Conservé :</b> niveau de prestige, points ✨ et améliorations de prestige" + (pu("memoire") ? ", succès, écureuils et cartes" : "") + ", records, pseudo et options.</p></div>" +
        '<div class="btn-row center"><button class="btn" type="button" data-action="doprestige"' + (prestigeReady() ? "" : " disabled") + ">✨ Faire un prestige (+" + prestigeGain().toLocaleString("fr-FR") + ")</button></div>" +
        '<h3 class="pick-title">Améliorations de prestige</h3><p class="game-small">Permanentes : elles ne sont jamais remises à zéro.</p><div class="shop-list">';
      D.PRESTIGE_SHOP.forEach(function (it) {
        var lvl = pu(it.id), max = lvl >= it.max, c = pupCost(it, lvl), pips = "";
        for (var i = 0; i < it.max; i++) pips += '<i class="' + (i < lvl ? "on" : "") + '"></i>';
        html += '<div class="shop-item pshop-item"><span class="shop-ic">' + it.icon + '</span><div class="shop-text"><strong>' + esc(it.name) + "</strong><span>" + esc(it.desc) + (it.max > 1 ? " par niveau" : "") + '</span><span class="pips">' + pips + "</span></div>" +
          (max ? '<span class="shop-max">MAX</span>' : '<button class="btn btn-small" type="button" data-action="pbuy" data-arg="' + it.id + '"' + (S.ppts < c ? " disabled" : "") + ">" + c.toLocaleString("fr-FR") + " ✨</button>") + "</div>";
      });
      return html + "</div>";
    },
    shop: function () {
      var html = '<div class="screen-head">' + back() + "<h2>Améliorations</h2>" + goldBadge() + '</div><p class="game-small">Bonus permanents, valables pour toutes tes parties.</p><div class="shop-list">';
      D.SHOP.forEach(function (it) {
        var lvl = S.shop[it.id] || 0, max = lvl >= it.max, ok = has(it.unlock), cost = shopCost(it, lvl);
        var pips = "";
        for (var i = 0; i < it.max; i++) pips += '<i class="' + (i < lvl ? "on" : "") + '"></i>';
        html += '<div class="shop-item' + (ok ? "" : " is-locked") + '"><span class="shop-ic">' + (ok ? it.icon : "🔒") + "</span>" +
          '<div class="shop-text"><strong>' + esc(it.name) + "</strong><span>" + esc(ok ? it.desc : lockText(it.unlock)) + '</span><span class="pips">' + pips + "</span></div>" +
          (max ? '<span class="shop-max">MAX</span>' : '<button class="btn btn-small" type="button" data-action="buy" data-arg="' + it.id + '"' + (!ok || S.gold < cost ? " disabled" : "") + ">" + cost + " " + goldIc() + "</button>") +
          "</div>";
      });
      html += '</div><p class="game-small"><button class="link-btn" type="button" data-action="refund">Rembourser toutes les améliorations</button></p>';
      return html;
    },
    quetes: function () {
      var q = S.quests || {}, n = Object.keys(q).length;
      var html = '<div class="screen-head">' + back() + '<h2>Quêtes</h2><p class="gold-badge">🗝️ <b>' + n + " / " + D.QUESTS.length + '</b></p></div>' +
        '<p class="game-small">Chaque quête réussie ajoute un nouvel objet au butin. Elles se re-verrouillent à chaque prestige.</p><div class="ach-list">';
      D.QUESTS.forEach(function (qq) {
        var ok = !!q[qq.id], rw = questReward(qq.id);
        html += '<div class="ach quest' + (ok ? " is-done" : "") + '" style="--rc:' + rw.color + '"><span class="ach-ic">' + (ok ? rw.icon : "🔒") + "</span>" +
          "<div><strong>" + esc(qq.desc) + "</strong><span>Débloque " + rw.kind + ' <b class="q-item">' + esc(rw.name) + "</b>" + (rw.desc ? " : " + esc(rw.desc) : "") + "</span></div>" +
          '<span class="ach-gold">' + (ok ? "✓" : "") + "</span></div>";
      });
      return html + "</div>";
    },
    succes: function () {
      var n = Object.keys(S.ach).length;
      var html = '<div class="screen-head">' + back() + '<h2>Succès</h2><p class="gold-badge">🏆 <b>' + n + " / " + D.ACHIEVEMENTS.length + '</b></p></div><div class="ach-list">';
      D.ACHIEVEMENTS.forEach(function (a) {
        var ok = !!S.ach[a.id], un = unlocksOf(a.id);
        html += '<div class="ach' + (ok ? " is-done" : "") + '"><span class="ach-ic">' + (ok ? "🏆" : "🔒") + "</span>" +
          "<div><strong>" + esc(a.name) + "</strong><span>" + esc(a.desc) + "</span>" +
          (un.length ? '<span class="ach-unlock">Débloque ' + esc(un.join(", ")) + "</span>" : "") + "</div>" +
          '<span class="ach-gold">+' + a.gold + " " + goldIc() + "</span></div>";
      });
      return html + "</div>";
    },
    // ---- 2.0 : le camp ----
    terrier: function () {
      eqS();
      var c = charById(S.char), lv = charLevel(c.id), cx = S.clvl[c.id] || 0, ps = postureOf(c.id, (S.posture || {})[c.id]);
      var html = '<div class="screen-head">' + back() + "<h2>Le terrier</h2>" + goldBadge() + "</div>";
      html += '<div class="np-chars">';
      D.CHARACTERS.forEach(function (o) { html += '<button type="button" class="np-char' + (S.char === o.id ? " is-selected" : "") + '" data-action="tchar2" data-arg="' + o.id + '" aria-label="' + esc(o.name) + '"><img src="' + spriteUrl(o.sprite) + '" alt=""></button>'; });
      var k = Math.round((cx - charXpFor(lv)) / Math.max(1, charXpFor(lv + 1) - charXpFor(lv)) * 100);
      html += '</div><p class="v2-bar"><span><b>' + esc(c.name) + "</b> · niveau <b>" + lv + '</b></span><span class="rank-bar"><i style="width:' + Math.min(100, k) + '%"></i></span><small>' + cx + " / " + charXpFor(lv + 1) + "</small></p>";
      // attirail porté
      var w = wornBy(c.id), pts = { terre: 0, feu: 0, eau: 0, air: 0 };
      html += '<h3 class="pick-title">Attirail</h3><div class="v2-gear">';
      D.SLOTS.forEach(function (sl) {
        var q = pieceById(w[sl.id]), g = q && D.GEAR[q.t];
        if (g && g.elem) pts[g.elem] += q.pts;
        html += '<button type="button" class="v2-slot' + (q ? " is-full" : "") + '" data-action="eqpick" data-arg="' + sl.id + '"><span class="v2-slot-h">' + esc(sl.name) + " <small>" + esc(sl.state) + "</small></span>" +
          (q ? "<b>" + g.icon + " " + esc(g.name) + "</b><small>" + esc(pieceDesc(q)) + (g.elem ? ' · <span style="color:' + (D.ELEMENTS[g.elem].ui || D.ELEMENTS[g.elem].color) + '">' + "●".repeat(q.pts) + " " + D.ELEMENTS[g.elem].name + "</span>" : "") + "</small>" : "<small>Vide</small>") + "</button>";
      });
      html += "</div>";
      var tiers = []; Object.keys(pts).forEach(function (el) { D.ELEM_TIERS[el].forEach(function (t) { if (pts[el] >= t[0]) tiers.push("<b>" + D.ELEMENTS[el].name + " " + t[0] + "</b> : " + esc(t[1])); }); });
      html += '<p class="np-hint">Points d\'élément : ' + Object.keys(pts).map(function (el) { return '<span style="color:' + (D.ELEMENTS[el].ui || D.ELEMENTS[el].color) + '">' + D.ELEMENTS[el].name + " " + pts[el] + "</span>"; }).join(" · ") + " (paliers à 3, 6 et 9)" + (tiers.length ? "<br>" + tiers.join("<br>") : "") + "</p>";
      var sn = S.secureSlots || 0, scost = [1500, 4000][sn];
      html += '<p class="np-hint">🎒 Emplacements sécurisés d\'expédition : <b>' + (1 + sn) + "</b> / 3" + (scost ? ' <button class="btn btn-small" type="button" data-action="buysecure"' + (S.gold < scost ? " disabled" : "") + ">+1 pour " + scost + " " + goldIc() + "</button>" : "") + "</p>";
      var setsW = {}; D.SLOTS.forEach(function (sl) { var q = pieceById(w[sl.id]); if (q && D.GEAR[q.t].set) setsW[D.GEAR[q.t].set] = (setsW[D.GEAR[q.t].set] || 0) + 1; });
      Object.keys(setsW).forEach(function (sid) { var st = D.SETS[sid], n = setsW[sid], fu = st.full || 4; html += '<p class="np-hint"><b>' + esc(st.name) + " " + n + "/" + fu + "</b>" + (st.who && st.who !== c.id ? " (portable par " + esc(charById(st.who).name) + " seulement)" : "") + " · " + (n >= 2 ? "✅" : "⬜") + " 2 : " + esc(st.b2) + " · " + (n >= fu ? "✅" : "⬜") + " " + fu + " : " + esc(st.b4) + "</p>"; });
      // talents de la posture
      html += '<h3 class="pick-title">Talents · posture ' + esc(ps.name) + ' <small><button class="link-btn" type="button" data-action="go" data-arg="play">changer de posture</button></small></h3><div class="v2-tal">';
      var pick = ((S.tal[c.id] || {})[ps.id]) || {};
      for (var t = 0; t < 4; t++) {
        var pair = t < 2 ? D.TAL_COMMON[t] : (D.TAL[ps.id] || [])[t - 2], open = lv >= D.TAL_LVL[t];
        html += '<div class="v2-tal-row' + (open ? "" : " is-locked") + '"><span class="v2-tal-n">' + (t === 3 ? "Clé" : t + 1) + "<small>niv. " + D.TAL_LVL[t] + "</small></span>";
        (pair || []).forEach(function (nd, i) {
          var on = pick[t + 1] === (i ? "b" : "a");
          html += '<button type="button" class="v2-node' + (on ? " is-on" : "") + '" ' + (open ? 'data-action="tpick" data-arg="' + (t + 1) + ":" + (i ? "b" : "a") + '"' : "disabled") + "><b>" + esc(nd.name) + "</b><small>" + esc(nd.desc) + "</small></button>";
        });
        html += "</div>";
      }
      html += '</div><p class="np-hint">Les talents ne comptent qu\'avec leur posture. Changement gratuit au camp, figé en partie.</p>';
      // maîtrise des armes
      html += '<h3 class="pick-title">Maîtrise des armes</h3><div class="shop-list">';
      Object.keys(D.ARMES).forEach(function (aid) {
        var a = D.ARMES[aid], ml = mastLevel(aid), x = S.mast[aid] || 0, nxt = D.MASTERY[ml];
        var un = ["Techniques et 1re évolution", "1re signature : " + D.SIGS[aid][0].name, "2e et 3e évolutions de chaque technique", "Signatures : " + D.SIGS[aid][1].name + ", " + D.SIGS[aid][2].name, "Éveil : ultime " + D.ULTS[aid].name];
        if (!questOk(a)) { html += '<div class="shop-item is-locked"><span class="shop-ic"><img src="' + spriteUrl(a.icon) + '" alt=""></span><div class="shop-text"><strong>🔒 ' + esc(a.name) + "</strong><span>" + esc(a.desc) + "</span><small>Quête : " + esc(questById(a.quest).desc) + "</small></div></div>"; return; }
        html += '<div class="shop-item"><span class="shop-ic"><img src="' + spriteUrl(a.icon) + '" alt=""></span><div class="shop-text"><strong>' + esc(a.name) + " · maîtrise " + ml + "/5</strong><span>" + un.map(function (u, i) { return (i < ml ? "✅ " : "⬜ ") + esc(u); }).join("<br>") + "</span>" + (nxt ? "<small>" + x + " / " + nxt + " XP</small>" : "") + "</div></div>";
      });
      return html + "</div>";
    },
    eqslot: function () {
      eqS();
      var sl = D.SLOTS.filter(function (x) { return x.id === S.eqSlot; })[0] || D.SLOTS[0], kind = sl.kind || sl.id, w = wornBy(S.char), cur = pieceById(w[sl.id]);
      var html = '<div class="screen-head"><button class="btn btn-ghost btn-small" type="button" data-action="go" data-arg="terrier">← Terrier</button><h2>' + esc(sl.name) + "</h2></div>";
      html += '<p class="game-small">' + esc(charById(S.char).name) + " · " + (cur ? "porte <b>" + esc(D.GEAR[cur.t].name) + "</b>" : "rien") + (cur ? ' <button class="link-btn" type="button" data-action="equnwear">Retirer</button>' : "") + "</p><div class=\"shop-list\">";
      var list = eqS().inv.filter(function (q) { return D.GEAR[q.t].slot === kind; });
      if (!list.length) html += '<p class="game-small">Aucune pièce. Les boss en lâchent, et l\'atelier en fabrique.</p>';
      list.forEach(function (q) {
        var g = D.GEAR[q.t], who = whoWears(q.id);
        html += '<div class="shop-item' + (g.who && g.who !== S.char ? " is-locked" : "") + '"><span class="shop-ic">' + g.icon + '</span><div class="shop-text"><strong>' + esc(g.name) + (q.tier > 1 ? " <small>palier " + q.tier + "</small>" : "") + (g.unique ? ' <small class="set-tag">unique</small>' : "") + (g.set ? ' <small class="set-tag">' + esc(D.SETS[g.set].name) + "</small>" : "") + "</strong><span>" + esc(pieceDesc(q)) + "</span>" + (g.who && g.who !== S.char ? "<small>Seulement pour " + esc(charById(g.who).name) + "</small>" : "") +
          (g.lo !== undefined ? "<small>Jet : " + Math.round(q.roll * 100) + " % de la fourchette (" + fmtV(g.lo) + " à " + fmtV(g.hi) + ")</small>" : "") +
          (g.elem ? '<small style="color:' + (D.ELEMENTS[g.elem].ui || D.ELEMENTS[g.elem].color) + '">' + q.pts + " point" + (q.pts > 1 ? "s" : "") + " de " + D.ELEMENTS[g.elem].name + "</small>" : "") + "</div>" +
          (who === S.char && w[sl.id] === q.id ? '<span class="pill">porté</span>' : '<button class="btn btn-small" type="button" data-action="eqwear" data-arg="' + q.id + '">' + (who ? "Prendre à " + esc(charById(who).name) : "Équiper") + "</button>") + "</div>";
      });
      return html + "</div>";
    },
    atelier: function () {
      eqS();
      var html = '<div class="screen-head">' + back() + "<h2>L'atelier de Bûche</h2></div>";
      var have = Object.keys(D.RES).filter(function (k) { return S.res[k] > 0; });
      html += '<p class="game-small">Ressources : ' + (have.length ? have.map(function (k) { return D.RES[k].icon + " " + esc(D.RES[k].name) + " <b>" + S.res[k] + "</b>"; }).join(" · ") : "aucune pour l'instant (les ennemis en lâchent, chaque région a les siennes)") + "</p>";
      html += '<p class="game-small">Le craft donne un jet moyen garanti ; un objet trouvé couvre toute la fourchette. Coffre : ' + eqS().inv.length + " / 40.</p>";
      D.SLOTS.filter(function (s0, i) { return i < 5; }).forEach(function (sl) {
        var kind = sl.kind || sl.id;
        html += '<h3 class="pick-title">' + esc(sl.kind ? "Anneaux" : sl.name) + '</h3><div class="shop-list">';
        Object.keys(D.GEAR).forEach(function (t) {
          var g = D.GEAR[t]; if (g.slot !== kind || g.unique) return;
          var lockedR = g.set && !D.SETS[g.set].mega && !(S.recipes || {})[g.set];
          var ok = canCraft(t) && !lockedR;
          html += '<div class="shop-item' + (lockedR ? " is-locked" : "") + '"><span class="shop-ic">' + g.icon + '</span><div class="shop-text"><strong>' + esc(g.name) + (g.set ? ' <small class="set-tag">' + esc(D.SETS[g.set].name) + (g.who ? " · " + esc(charById(g.who).name) : "") + (lockedR ? " · recette à trouver en Donjon" : "") + "</small>" : "") + (g.elem ? ' <small style="color:' + (D.ELEMENTS[g.elem].ui || D.ELEMENTS[g.elem].color) + '">' + D.ELEMENTS[g.elem].name + "</small>" : "") + "</strong><span>" + esc(g.desc.replace("{v}", g.lo !== undefined ? fmtV(g.lo) + "-" + fmtV(g.hi) : "").replace("{t}", "au hasard")) + "</span><small>" +
            Object.keys(g.cost).map(function (k) { return D.RES[k].icon + " " + (S.res[k] || 0) + "/" + g.cost[k]; }).join(" · ") + "</small></div>" +
            '<button class="btn btn-small" type="button" data-action="craft" data-arg="' + t + '"' + (ok ? "" : " disabled") + ">Fabriquer</button></div>";
        });
        html += "</div>";
      });
      var spare = eqS().inv.filter(function (q) { return !whoWears(q.id); });
      if (spare.length) {
        html += '<h3 class="pick-title">Recyclage</h3><p class="game-small">Rend la moitié des ressources de la recette.</p><div class="shop-list">';
        spare.forEach(function (q) { var g = D.GEAR[q.t]; html += '<div class="shop-item"><span class="shop-ic">' + g.icon + '</span><div class="shop-text"><strong>' + esc(g.name) + "</strong><span>" + esc(pieceDesc(q)) + '</span></div><button class="btn btn-ghost btn-small" type="button" data-action="recy" data-arg="' + q.id + '">Recycler</button></div>'; });
        html += "</div>";
      }
      return html;
    },
    forge: function () {
      eqS();
      var html = '<div class="screen-head">' + back() + "<h2>La forge de Charbon</h2></div>";
      html += '<p class="game-small">🔹 Runes : <b>' + (S.res.rune || 0) + "</b> · 🔷 Runes rares : <b>" + (S.res.rune_rare || 0) + "</b>. Une rune relance la force d'un effet dans sa fourchette. Une rune rare ajoute un 2e effet (1 fois sur 4, ça rate et l'effet ajouté est perdu). L'Arène en donne beaucoup.</p><div class=\"shop-list\">";
      var list = eqS().inv.filter(function (q) { return D.GEAR[q.t].lo !== undefined; });
      if (!list.length) html += '<p class="game-small">Aucune pièce à forger.</p>';
      list.forEach(function (q) {
        var g = D.GEAR[q.t], who = whoWears(q.id);
        html += '<div class="shop-item"><span class="shop-ic">' + g.icon + '</span><div class="shop-text"><strong>' + esc(g.name) + (who ? " <small>(" + esc(charById(who).name) + ")</small>" : "") + "</strong><span>" + esc(pieceDesc(q)) + (q.extra ? " + " + esc(D.GEAR[q.extra].name) : "") + "</span><small>Jet " + Math.round(q.roll * 100) + " %</small></div>" +
          '<button class="btn btn-small" type="button" data-action="rune" data-arg="' + q.id + '"' + ((S.res.rune || 0) < 1 ? " disabled" : "") + '>Relancer 🔹</button>' +
          (["coiffe", "bottes", "cape"].indexOf(g.slot) >= 0 ? '<button class="btn btn-small btn-alt" type="button" data-action="runer" data-arg="' + q.id + '"' + ((S.res.rune_rare || 0) < 1 ? " disabled" : "") + ">+ effet 🔷</button>" : "") + "</div>";
      });
      return html + "</div>";
    },
    comptoir: function () {
      eqS();
      var html = '<div class="screen-head">' + back() + "<h2>Le comptoir</h2>" + goldBadge() + "</div>";
      var sn = S.secureSlots || 0, scost = [1500, 4000][sn];
      html += '<h3 class="pick-title">Améliorations du camp</h3><div class="shop-list"><div class="shop-item"><span class="shop-ic">🎒</span><div class="shop-text"><strong>Emplacement sécurisé d\'expédition</strong><span>' + (1 + sn) + " / 3</span></div>" + (scost ? '<button class="btn btn-small" type="button" data-action="buysecure"' + (S.gold < scost ? " disabled" : "") + ">" + scost + " " + goldIc() + "</button>" : '<span class="pill">max</span>') + "</div>";
      var cs = S.chestSize || 0, ccost = [800, 2000, 5000][cs];
      html += '<div class="shop-item"><span class="shop-ic">🧰</span><div class="shop-text"><strong>Coffre agrandi</strong><span>' + (40 + 10 * cs) + " places</span></div>" + (ccost ? '<button class="btn btn-small" type="button" data-action="buychest"' + (S.gold < ccost ? " disabled" : "") + ">" + ccost + " " + goldIc() + "</button>" : '<span class="pill">max</span>') + "</div></div>";
      html += '<h3 class="pick-title">Conversion (3 pour 1)</h3><p class="game-small">Échange 3 ressources contre 1 d\'une autre région : un seul mode suffit pour tout obtenir, mais pas efficacement.</p><div class="shop-list">';
      var have = Object.keys(D.RES).filter(function (k) { return !D.RES[k].trophy && !D.RES[k].rune && (S.res[k] || 0) >= 3; });
      Object.keys(D.RES).filter(function (k) { return !D.RES[k].trophy && !D.RES[k].rune; }).forEach(function (k) {
        var src = have.filter(function (x) { return x !== k; }).sort(function (a, b) { return (S.res[b] || 0) - (S.res[a] || 0); })[0];
        html += '<div class="shop-item"><span class="shop-ic">' + D.RES[k].icon + '</span><div class="shop-text"><strong>' + esc(D.RES[k].name) + " <small>x" + (S.res[k] || 0) + "</small></strong>" + (src ? "<small>contre 3 " + esc(D.RES[src].name) + "</small>" : "<small>il te faut 3 d'une autre ressource</small>") + "</div>" + (src ? '<button class="btn btn-small" type="button" data-action="conv" data-arg="' + src + ">" + k + '">Échanger</button>' : "") + "</div>";
      });
      return html + "</div>";
    },
    codex: function () {
      // 2.0 : la chaîne d'une technique (évolution → fusion avec un objet → fusion de techniques → légendaire)
      function nm(id) { return ALLW[id].name; }
      var html = '<div class="screen-head">' + back() + '<h2>Techniques et fusions</h2></div>' +
        '<p class="game-small">Chaque arme donne accès à 12 des 20 techniques, à sa façon. Une technique monte au niveau 5, puis <b>évolue</b> (2 choix). Évoluée + son objet de niveau au max : <b>fusion</b>. Deux techniques évoluées : une <b>technique fusionnée</b> (libère un emplacement). Deux fusions : une <b>légendaire</b>.</p>';
      html += '<h3 class="pick-title">Les ' + Object.keys(D.ARMES).length + ' armes</h3><div class="shop-list">';
      Object.keys(D.ARMES).forEach(function (id) {
        var a = D.ARMES[id];
        html += '<div class="shop-item' + (questOk(a) ? "" : " is-locked") + '"><span class="shop-ic"><img src="' + spriteUrl(a.icon) + '" alt=""></span><div class="shop-text"><strong>' + (questOk(a) ? "" : "🔒 ") + esc(a.name) + "</strong><span>" + esc(a.desc) + (questOk(a) ? "" : " Quête : " + esc(questById(a.quest).desc)) + '</span><span class="fusion-recipe">' + Object.keys(a.skin).map(function (t) { return esc(a.skin[t][0]) + " (" + esc(nm(t)) + ")"; }).join(" · ") + "</span></div></div>";
      });
      html += '</div><h3 class="pick-title">Les 20 techniques et leurs évolutions</h3><div class="shop-list">';
      Object.keys(D.TECH).forEach(function (id) {
        var t = D.TECH[id], tf = D.TFUS[id], tf2 = D.TFUS2[id];
        html += '<div class="shop-item"><span class="shop-ic"><img src="' + spriteUrl(t.icon) + '" alt=""></span><div class="shop-text"><strong>' + esc(t.name) + " <small>" + esc({ tir: "Tir", melee: "Mêlée", zone: "Zone", retour: "Retour", compagnon: "Compagnon" }[t.fam]) + "</small></strong>" +
          "<span>" + t.evos.map(function (e) { return "<b>" + esc(e.name) + "</b>" + (e.elemC ? " (élémentaire)" : "") + " : " + esc(e.desc); }).join("<br>") + "</span>" +
          [tf, tf2].map(function (x) { return x ? '<span class="fusion-recipe">+ ' + esc(D.PASSIVES[x.p].name) + " → " + esc(x.name) + " : " + esc(x.desc) + "</span>" : ""; }).join("") + "</div></div>";
      });
      html += '</div><h3 class="pick-title">Éléments</h3><p class="game-small">Chaque arme a un élément (Katana : Air, Arc : Feu, Bâton : Terre, Marteau : Terre, Arbalète de givre : Eau…). Les ennemis résistent au leur (-40 %, -60 % pour élites et boss) et craignent celui qui le bat (+40 %) : Eau &gt; Feu &gt; Air &gt; Terre &gt; Eau. La Clairière est neutre. Deux éléments sur une même cible déclenchent une réaction : il faut un 2e élément (Braise, Goutte de rosée, Galet, Plume de brise).</p><div class="shop-list">';
      Object.keys(D.REACTIONS).forEach(function (k) { var rc = D.REACTIONS[k]; html += '<div class="shop-item"><span class="shop-ic" style="background:' + rc.color + '"></span><div class="shop-text"><strong>' + esc(rc.name) + "</strong><span>" + k.split("+").map(function (x) { return D.ELEMENTS[x].name; }).join(" + ") + " : " + esc(rc.desc) + "</span></div></div>"; });
      html += '</div><h3 class="pick-title">Rôles des ennemis</h3><div class="shop-list">';
      Object.keys(D.ROLES).forEach(function (k) { var ro = D.ROLES[k], sp = Object.keys(D.ENEMIES).filter(function (e) { return D.ENEMIES[e].role === k; }); html += '<div class="shop-item"><span class="shop-ic">' + (sp[0] ? '<img src="' + spriteUrl(D.ENEMIES[sp[0]].sprite) + '" alt="">' : "") + '</span><div class="shop-text"><strong>' + esc(ro.name) + "</strong><span>" + esc(ro.desc) + "</span></div></div>"; });
      html += '</div><h3 class="pick-title">Fusions de techniques</h3><div class="shop-list">';
      [D.COMBOS, D.LEGENDS].forEach(function (set) {
        Object.keys(set).forEach(function (id) {
          var c = set[id];
          html += '<div class="shop-item fusion-row' + (c.legend ? " is-legend" : "") + '"><span class="shop-ic"><img src="' + spriteUrl(c.icon) + '" alt=""></span><div class="shop-text"><strong>' + esc(c.name) + (c.legend ? ' <em class="legend-tag">Légendaire</em>' : "") + "</strong><span>" + esc(c.desc[0]) + '</span><span class="fusion-recipe">' + c.parts.map(function (q) { return esc(nm(q)); }).join(" + ") + "</span></div></div>";
        });
      });
      return html + "</div>";
    },
    options: function () {
      function tog(k, label) {
        return '<button type="button" class="toggle' + (S.opts[k] ? " is-on" : "") + '" data-action="opt" data-arg="' + k + '" aria-pressed="' + !!S.opts[k] + '"><span>' + label + "</span><b>" + (S.opts[k] ? "Oui" : "Non") + "</b></button>";
      }
      return '<div class="screen-head">' + back() + "<h2>Options</h2></div>" +
        '<div class="opt-list">' + tog("sound", "🔊 Son") + tog("shake", "📳 Tremblement de l'écran") + tog("numbers", "🔢 Chiffres de dégâts") + "</div>" +
        '<p class="game-small"><button class="link-btn danger" type="button" data-action="wipe">Effacer toute ma progression</button></p>';
    },
    help: function () {
      return '<div class="screen-head">' + back() + "<h2>Comment jouer</h2></div><ul class=\"help-list\">" +
        '<li class="ctrl-desk"><kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd>, <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> ou flèches pour courir. Ou clic maintenu : ton écureuil suit la souris.</li>' +
        "<li>📱 Sur mobile, pose le doigt n'importe où sur le jeu : un joystick apparaît.</li>" +
        "<li>Tes <strong>armes tirent toutes seules</strong>. Toi, tu esquives.</li>" +
        "<li>Ramasse les <strong>noisettes</strong> pour monter de niveau : jusqu'à <strong>6 armes et 6 objets</strong>, niveau 5 max.</li>" +
        "<li>Deux ingrédients au niveau 5 = une <strong>fusion</strong> (voir le menu Fusions).</li>" +
        "<li>Casse les <strong>souches, paniers, tas de feuilles</strong>… : aspirateur, pot d'XP, gland explosif, givre, or, baies.</li>" +
        "<li>Chaque minute, une <strong>nuée</strong>. Toutes les 3 minutes, un <strong>boss</strong> qui lâche un coffre.</li>" +
        "<li>Les <strong>succès</strong> débloquent écureuils, cartes, armes et le mode Difficile.</li>" +
        "<li><kbd>Échap</kbd> ou <kbd>P</kbd> : pause.</li></ul>";
    },
  };
  function go(name) { if (name === "menu" && D.CAMP) { openCamp(); return; } closeCamp(); state = "menu"; showCard(SCREENS[name](), name); }
  function readCoopName() {
    var inp = card.querySelector("[data-coop-name]"), name = (inp ? inp.value : S.name || "").trim();
    if (name.length < 2) { Net.err = "Choisis un pseudo d'au moins 2 caractères."; go("coop"); return false; }
    S.name = name.slice(0, 16); save(); return true;
  }

  var ACTIONS = {
    go: function (a) { SND.click(); if (a === "play") { inspect.char = S.char; inspect.map = S.map; } go(a); },
    tchar2: function (id) { if (!charAvailable(charById(id))) return; S.char = id; save(); SND.click(); go("terrier"); },
    eqpick: function (sl) { S.eqSlot = sl; SND.click(); go("eqslot"); },
    eqwear: function (id) {
      var q = pieceById(+id); if (!q) return; var sl = S.eqSlot, e = eqS(), gq = D.GEAR[q.t];
      if (gq.who && gq.who !== S.char) { SND.hurt(); return; }
      if (gq.unique) { var wc = wornBy(S.char); Object.keys(wc).forEach(function (s0) { var o = pieceById(wc[s0]); if (o && o.id !== q.id && D.GEAR[o.t].unique) delete wc[s0]; }); }
      Object.keys(e.worn).forEach(function (c) { Object.keys(e.worn[c]).forEach(function (s0) { if (e.worn[c][s0] === q.id) delete e.worn[c][s0]; }); });
      wornBy(S.char)[sl] = q.id; save(); SND.level(); go("eqslot");
    },
    equnwear: function () { delete wornBy(S.char)[S.eqSlot]; save(); SND.click(); go("eqslot"); },
    tpick: function (a) {
      var ps = postureOf(S.char, (S.posture || {})[S.char]).id, t = a.split(":"); eqS();
      S.tal[S.char] = S.tal[S.char] || {}; S.tal[S.char][ps] = S.tal[S.char][ps] || {}; S.tal[S.char][ps][t[0]] = t[1]; save(); SND.click(); go("terrier");
    },
    craft: function (t) { var q = craft(t); if (q) SND.fusion(); go("atelier"); },
    recy: function (id) { var q = pieceById(+id); if (q && !whoWears(q.id)) { recycle(q); SND.crack(); } go("atelier"); },
    newsok: function () { S.news = 0; save(); SND.level(); openCamp(); },
    rune: function (id) { var q = pieceById(+id); if (!q || (S.res.rune || 0) < 1) return; S.res.rune--; q.roll = Math.random(); save(); SND.fusion(); go("forge"); },
    runer: function (id) {
      var q = pieceById(+id); if (!q || (S.res.rune_rare || 0) < 1) return; S.res.rune_rare--;
      var g = D.GEAR[q.t], pool = Object.keys(D.GEAR).filter(function (k) { return D.GEAR[k].slot === g.slot && D.GEAR[k].fx && D.GEAR[k].fx !== g.fx; });
      if (Math.random() < 0.25) { if (q.extra) { delete q.extra; banner("Raté : l'effet ajouté est perdu"); } else banner("Raté : la rune se brise"); SND.crack(); }
      else { q.extra = pool[(Math.random() * pool.length) | 0]; banner("Nouvel effet : " + D.GEAR[q.extra].name); SND.fusion(); }
      save(); go("forge");
    },
    buychest: function () { var n = S.chestSize || 0, c = [800, 2000, 5000][n]; if (!c || S.gold < c) return; S.gold -= c; S.chestSize = n + 1; save(); SND.gold(); go("comptoir"); },
    conv: function (a) { var t = a.split(">"); if ((S.res[t[0]] || 0) < 3) return; S.res[t[0]] -= 3; S.res[t[1]] = (S.res[t[1]] || 0) + 1; save(); SND.click(); go("comptoir"); },
    xsecure: function (i) {
      if (screen !== "secure" || !r.ex || !r.ex.pend) return;
      i = +i; if (i >= 0 && r.bag[i] && r.secure.length < 1 + (S.secureSlots || 0)) r.secure.push(r.bag.splice(i, 1)[0]);
      var reg = r.ex.pend.region; r.ex.pend = null; state = "play"; hideCard(); last = performance.now(); SND.fusion(); descend(reg);
    },
    mode2: function (k) { S.mode = ["expedition", "arena", "dungeon"].indexOf(k) >= 0 ? k : "survie"; save(); SND.click(); go("play"); },
    ctake: function (id) { genContracts(); var c = S.contracts, o = c.offers.filter(function (x) { return x.id === id; })[0]; if (!o) return; var i = c.taken.map(function (x) { return x.id; }).indexOf(id); if (i >= 0) c.taken.splice(i, 1); else if (c.taken.length < 3) c.taken.push(o); save(); SND.click(); go("play"); },
    buysecure: function () { var n = S.secureSlots || 0, cost = [1500, 4000][n]; if (!cost || S.gold < cost) return; S.gold -= cost; S.secureSlots = n + 1; save(); SND.gold(); go("terrier"); },
    cn: function (n) { S.cn = +n || 0; save(); SND.click(); go("play"); },
    bet: function () { if (state !== "levelup" || me.char.id !== "trefle") return; r.betPend = true; SND.click(); afterChoice(); },
    parme: function (id) { if (screen === "draft") { SND.level(); pickArme(id); } },
    tpos: function (id) { var ps = posturesOf(S.char).filter(function (x) { return x.id === id; })[0]; if (!ps || !postureOk(ps)) return; S.posture = S.posture || {}; S.posture[S.char] = id; save(); SND.click(); go("play"); },
    tchar: function (id) { inspect.char = id; if (charAvailable(charById(id))) S.char = id; save(); SND.click(); go("play"); },
    tdun: function (id) { inspect.dun = id; if (has(dungeonById(id).unlock)) S.dungeon = id; save(); trackMe(); SND.click(); go("play"); },
    ldun: function (id) { if (Net.role !== "host" || !has(dungeonById(id).unlock)) return; S.dungeon = id; save(); trackMe(); SND.click(); go("lobby"); },
    tmap: function (id) { inspect.map = id; if (has(mapById(id).unlock)) S.map = id; save(); SND.click(); go("play"); },
    diff: function (k) { S.diff = k; save(); SND.click(); go("play"); },
    mode: function (k) { S.mode = ["arena", "dungeon"].indexOf(k) >= 0 ? k : "survie"; save(); SND.click(); go("play"); },
    lmode: function (k) { if (Net.role !== "host") return; S.mode = ["arena", "dungeon"].indexOf(k) >= 0 ? k : "survie"; save(); trackMe(); SND.click(); go("lobby"); },
    buychar: function (id) {
      var c = charById(id);
      if (S.gold < c.price || charAvailable(c) || !questOk(c)) return;
      S.gold -= c.price; S.owned[id] = true; S.char = id; save(); SND.ach(); go("play");
    },
    buy: function (id) {
      var it = D.SHOP.filter(function (x) { return x.id === id; })[0];
      if (!it) return;
      var lvl = S.shop[id] || 0, cost = shopCost(it, lvl);
      if (lvl >= it.max || S.gold < cost || !has(it.unlock)) return;
      S.gold -= cost; S.shop[id] = lvl + 1; S.stats.bought++; save(); SND.gold();
      checkAchievements(null);
      go("shop");
    },
    refund: function () {
      var total = 0;
      D.SHOP.forEach(function (it) { for (var l = 0; l < (S.shop[it.id] || 0); l++) total += shopCost(it, l); });
      if (!total || !window.confirm("Rembourser " + total + " glands d'or et remettre toutes les améliorations à zéro ?")) return;
      S.gold += total; S.shop = {}; save(); go("shop");
    },
    opt: function (k) { S.opts[k] = !S.opts[k]; save(); muteLabel(); SND.click(); go("options"); },
    wipe: function () {
      if (!window.confirm("Effacer toute ta progression (or, améliorations, écureuils, succès) ?")) return;
      var keepName = S.name; S = defaults(); S.name = keepName; save(); go("menu");
    },
    start: function () { start(); },
    tsel: function (id) { treeSel = id; SND.click(); go("tree"); },
    pbuy: function (id) {
      var it = D.PRESTIGE_SHOP.filter(function (x) { return x.id === id; })[0]; if (!it) return;
      var lvl = pu(id), c = pupCost(it, lvl);
      if (lvl >= it.max || S.ppts < c) return;
      S.ppts -= c; S.pshop[id] = lvl + 1; save(); SND.fusion(); go("prestige");
    },
    learn: function (id) {
      var k = skillById(id); if (!k) return;
      var lvl = S.tree[id] || 0;
      if (lvl >= k.max || !skillOpen(k) || freePoints() < k.cost) return;
      S.tree[id] = lvl + 1; treeSel = id; save(); SND.gold(); checkAchievements(null); go("tree");
    },
    respec: function () {
      if (!spentPoints() || !window.confirm("Rendre tous tes points de compétence ?")) return;
      S.tree = {}; save(); go("tree");
    },
    doprestige: function () {
      if (!prestigeReady()) return;
      var gain = prestigeGain();
      if (!window.confirm("Faire un prestige et gagner " + gain + " points de prestige ? Tout repart à zéro (or, améliorations, rang, compétences" + (pu("memoire") ? "" : ", succès, écureuils, cartes") + ").")) return;
      var keep = { name: S.name, opts: S.opts, prestige: S.prestige + 1, ppts: S.ppts + gain, pshop: S.pshop, runs: S.stats.runs, bestTime: S.stats.bestTime, bestScore: S.stats.bestScore,
                   ach: S.ach, owned: S.owned, memo: pu("memoire") > 0, heritage: pu("heritage") };
      S = defaults();
      S.name = keep.name; S.opts = keep.opts; S.prestige = keep.prestige; S.ppts = keep.ppts; S.pshop = keep.pshop;
      S.stats.runs = keep.runs; S.stats.bestTime = keep.bestTime; S.stats.bestScore = keep.bestScore;
      if (keep.memo) { S.ach = keep.ach; S.owned = keep.owned; }
      S.gold = 1000 * keep.heritage;
      sanitize(); save();
      SND.fusion(); checkAchievements(null); muteLabel(); go("prestige");
    },
    coophost: function () {
      if (!readCoopName()) return;
      var code = ""; for (var i = 0; i < 4; i++) code += CODE_CH[(Math.random() * CODE_CH.length) | 0];
      Net.joinTs = Date.now(); netJoin(code, true); go("lobby");
    },
    coopjoin: function () {
      if (!readCoopName()) return;
      var inp = card.querySelector("[data-coop-code]"), code = (inp ? inp.value : "").toUpperCase().replace(/[^A-Z]/g, "");
      if (code.length !== 4) { Net.err = "Le code fait 4 lettres."; go("coop"); return; }
      Net.joinTs = Date.now(); netJoin(code, false); go("lobby");
    },
    reload: function () { reloadGame(); },
    leave: function () { netLeave(); Net.err = ""; go("menu"); },
    lchar: function (id) { if (!charAvailable(charById(id))) return; S.char = id; save(); trackMe(); SND.click(); go("lobby"); },
    lmap: function (id) { if (Net.role !== "host") return; S.map = id; save(); trackMe(); SND.click(); go("lobby"); },
    ldiff: function (k) { if (Net.role !== "host") return; S.diff = k; save(); trackMe(); SND.click(); go("lobby"); },
    invite: function () {
      var url = location.origin + location.pathname + "#coop=" + Net.code;
      var text = "Rejoins ma partie d'Écureuil Survivor ! Code : " + Net.code;
      if (navigator.share) { navigator.share({ title: "Écureuil Survivor", text: text, url: url }).catch(function () {}); return; }
      try { navigator.clipboard.writeText(url).then(function () { banner("Lien copié !"); }); } catch (e) { window.prompt("Lien d'invitation :", url); }
    },
    reroll: function () { if ((state !== "levelup" && !picking) || me.rerolls <= 0) return; me.rerolls--; openLevelUp(); },
    skip: function () { if (state !== "levelup" && !picking) return; apply({ type: "skip" }); },
    resume: function () { resume(); },
    restart: function () { start(); },
    chestok: function () { if (!chestOpen) return; if (!chestOpen.done) { chestFinish(chestOpen, false); SND.click(); } else closeChest(); },
    quit: function () {
      if (netMenuOpen) { if (window.confirm("Quitter la partie en ligne ? Tu gardes l'or gagné.")) { netMenuOpen = false; gameOver(true); } return; }
      if (state === "pause" && window.confirm("Abandonner la partie ? Tu gardes l'or gagné.")) gameOver(true);
    },
    "opt-pause": function () { S.opts.sound = !S.opts.sound; save(); muteLabel(); if (netMenuOpen) { netMenu(); return; } state = "play"; pause(); },
    menu: function () { go("menu"); },
  };
  Object.keys(ACTIONS_LATE).forEach(function (k) { ACTIONS[k] = ACTIONS_LATE[k]; });
  card.addEventListener("click", function (e) {
    var ch = e.target.closest("[data-choice]");
    if (ch) { if (state === "levelup" || picking) { try { apply(currentChoices[Number(ch.dataset.choice)]); } catch (err) { showError(err); } } return; }
    var b = e.target.closest("[data-action]");
    if (!b || b.disabled) return;
    var fn = ACTIONS[b.dataset.action];
    try { if (fn) fn(b.dataset.arg); } catch (err) { showError(err); }
  });

  /* =====================================================================
     Coop en ligne (Supabase Realtime : salon + diffusion)
     L'hôte simule la partie et diffuse un instantané ~8 fois/s.
     Les invités bougent leur écureuil en local et envoient leur position ~5 fois/s.
     ===================================================================== */
  var SPRN = Object.keys(D.SPRITES), SPRI = {};
  SPRN.forEach(function (k, i) { SPRI[k] = i; });
  var ETYPES = Object.keys(D.ENEMIES), ETI = {};
  ETYPES.forEach(function (k, i) { ETI[k] = i; });
  var GEMK = ["xp", "gold", "berry", "chest", "magnet", "xpjar", "goldbag", "freeze", "bomb", "xp3", "relic"], GEMI = {};
  GEMK.forEach(function (k, i) { GEMI[k] = i; });
  var CODE_CH = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  function rates() {
    // connexion directe pour tout le monde : plus fluide ; sinon on ménage le quota Supabase
    if (allDirect()) return { snap: 12, inp: 15 };
    var n = Math.max(2, Net.roster.length);
    return n >= 4 ? { snap: 6, inp: 4 } : { snap: 8, inp: 5 };
  }

  /* ---------- connexion directe entre navigateurs (WebRTC) ----------
     Supabase sert uniquement à échanger offre / réponse / candidats ICE.
     Étoile : chaque invité ouvre un canal de données vers l'hôte.
     État du jeu et positions passent par ce canal (non fiable, non ordonné).
     Si la connexion directe échoue, on reste sur le relais Supabase. */
  var RTC_CFG = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun.cloudflare.com:3478"] }] };
  function p2pOk() { return typeof window.RTCPeerConnection === "function"; }
  function closePeer(id) {
    var pr = Net.peers[id]; if (!pr) return;
    try { if (pr.dc) pr.dc.close(); } catch (e) {}
    try { pr.pc.close(); } catch (e) {}
    clearTimeout(pr.timer);
    delete Net.peers[id];
  }
  function hostLinkOpen() { var pr = Net.hostId && Net.peers[Net.hostId]; return !!(pr && pr.open); }
  function linkOf(id) {
    if (id === Net.id) return Net.role === "host" ? "host" : (hostLinkOpen() ? "direct" : "relay");
    if (Net.role === "host") { var pr = Net.peers[id]; return pr && pr.open ? "direct" : (pr && !pr.failed ? "wait" : "relay"); }
    return "";
  }
  function allDirect() {
    if (!Net.on) return false;
    if (Net.role === "guest") return hostLinkOpen();
    var guests = Net.roster.filter(function (x) { return !x.host; });
    return guests.length > 0 && guests.every(function (x) { var pr = Net.peers[x.id]; return pr && pr.open; });
  }
  function newPeer(id) {
    var pc = new RTCPeerConnection(RTC_CFG), pr = { id: id, pc: pc, dc: null, open: false, failed: false, ice: [] };
    Net.peers[id] = pr;
    pc.onicecandidate = function (e) { if (e.candidate) netSend("sig", { from: Net.id, to: id, t: "ice", d: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate }); };
    pc.onconnectionstatechange = function () {
      var st = pc.connectionState;
      if (st === "failed" || st === "closed") { pr.open = false; pr.failed = true; refreshLobby(); }
    };
    // pas de connexion directe au bout de 10 s : on reste sur le relais
    pr.timer = setTimeout(function () { if (!pr.open) { pr.failed = true; try { pc.close(); } catch (e) {} refreshLobby(); } }, 10000);
    return pr;
  }
  function bindChannel(pr, dc) {
    pr.dc = dc;
    dc.onopen = function () { pr.open = true; pr.failed = false; clearTimeout(pr.timer); refreshLobby(); };
    dc.onclose = function () { pr.open = false; refreshLobby(); };
    dc.onmessage = function (e) {
      var m; try { m = JSON.parse(e.data); } catch (err) { return; }
      pr.lastIn = Date.now();
      try { onNet(m.e, m.p, true); } catch (err) { showError(err); }
    };
  }
  function linkBadge(id) {
    var l = linkOf(id);
    return l === "direct" ? ' <span class="link-tag direct" title="Connexion directe">⚡ direct</span>' : l === "relay" ? ' <span class="link-tag relay" title="Passe par Supabase">☁️ relais</span>' : l === "wait" ? ' <span class="link-tag">… connexion</span>' : "";
  }
  function refreshLobby() { if (state === "menu" && screen === "lobby") go("lobby"); }
  function p2pConnectToHost() {
    if (!p2pOk() || Net.role !== "guest" || !Net.hostId || Net.status !== "SUBSCRIBED") return;
    var old = Net.peers[Net.hostId];
    if (old && (old.open || !old.failed)) return;
    if (old && old.failed && old.tries >= 4) return;
    var tries = old ? (old.tries || 0) + 1 : 1;
    closePeer(Net.hostId);
    var pr = newPeer(Net.hostId); pr.tries = tries;
    bindChannel(pr, pr.pc.createDataChannel("es", { ordered: false, maxRetransmits: 0 }));
    pr.pc.createOffer().then(function (o) { return pr.pc.setLocalDescription(o); }).then(function () {
      netSend("sig", { from: Net.id, to: Net.hostId, t: "offer", d: { type: pr.pc.localDescription.type, sdp: pr.pc.localDescription.sdp } });
    }).catch(function () { pr.failed = true; });
  }
  // nouvelle tentative régulière tant que la connexion directe n'est pas établie
  setInterval(function () { if (Net.on && Net.role === "guest" && !hostLinkOpen()) p2pConnectToHost(); }, 4000);
  function onSignal(m) {
    if (!m || m.to !== Net.id || !p2pOk()) return;
    var pr = Net.peers[m.from];
    if (m.t === "offer" && Net.role === "host") {
      closePeer(m.from);
      pr = newPeer(m.from);
      pr.pc.ondatachannel = function (e) { bindChannel(pr, e.channel); };
      pr.pc.setRemoteDescription(m.d).then(function () {
        pr.ice.forEach(function (c) { pr.pc.addIceCandidate(c).catch(function () {}); }); pr.ice = [];
        return pr.pc.createAnswer();
      }).then(function (a) { return pr.pc.setLocalDescription(a); }).then(function () {
        netSend("sig", { from: Net.id, to: m.from, t: "answer", d: { type: pr.pc.localDescription.type, sdp: pr.pc.localDescription.sdp } });
      }).catch(function () { pr.failed = true; });
    } else if (m.t === "answer" && pr) {
      pr.pc.setRemoteDescription(m.d).then(function () {
        pr.ice.forEach(function (c) { pr.pc.addIceCandidate(c).catch(function () {}); }); pr.ice = [];
      }).catch(function () { pr.failed = true; });
    } else if (m.t === "ice" && pr) {
      if (pr.pc.remoteDescription) pr.pc.addIceCandidate(m.d).catch(function () {});
      else pr.ice.push(m.d);
    }
  }
  // envoi rapide : direct si possible, relais Supabase pour ceux qui n'ont pas de lien direct
  function sendFast(ev, payload) {
    var msg = null, relay = false;
    if (Net.role === "host") {
      Net.roster.forEach(function (x) {
        if (x.host || x.id === Net.id) return;
        var pr = Net.peers[x.id];
        if (pr && pr.open && pr.dc && pr.dc.readyState === "open") {
          if (pr.dc.bufferedAmount > 256 * 1024) return;   // canal saturé : on saute cet envoi
          msg = msg || JSON.stringify({ e: ev, p: payload });
          try { pr.dc.send(msg); } catch (e) { relay = true; }
        } else relay = true;
      });
    } else {
      var hp = Net.hostId && Net.peers[Net.hostId];
      if (hp && hp.open && hp.dc && hp.dc.readyState === "open") {
        try { hp.dc.send(JSON.stringify({ e: ev, p: payload })); } catch (e) { relay = true; }
      } else relay = true;
    }
    if (relay) netSend(ev, payload);
  }

  function sbClient() {
    if (Net.client) return Net.client;
    var c = (window.SITE || {}).supabase;
    if (!window.supabase || !window.supabase.createClient || !c) return null;
    Net.client = window.supabase.createClient(c.url, c.key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 40 } } });
    return Net.client;
  }
  function netJoin(code, asHost, soft) {
    var cl = sbClient();
    if (!cl) { Net.err = "Coop indisponible (Supabase non chargé)."; go("coop"); return; }
    if (soft) {
      // reconnexion du salon seulement : on garde les liens directs déjà ouverts et la liste des joueurs
      if (Net.ch) { try { Net.client.removeChannel(Net.ch); } catch (e) {} }
      Net.status = "connexion";
    } else {
      netLeave(true);
      Net.on = true; Net.role = asHost ? "host" : "guest"; Net.code = code; Net.status = "connexion"; Net.err = ""; Net.started = false; Net.roster = [];
    }
    var ch = cl.channel("es-room-" + code, { config: { broadcast: { self: false, ack: false }, presence: { key: Net.id } } });
    ch.on("presence", { event: "sync" }, onPresence);
    ["start", "s", "in", "pick", "end", "round", "next", "rdy", "tp", "floor", "need"].forEach(function (ev) { ch.on("broadcast", { event: ev }, function (msg) { try { onNet(ev, msg.payload, false); } catch (err) { showError(err); } }); });
    ch.on("broadcast", { event: "sig" }, function (msg) { try { onSignal(msg.payload); } catch (err) { try { console.warn(err); } catch (e) {} } });
    if (window.Party && window.Party.emoteChannel) window.Party.emoteChannel(ch, function () { return S.name; });   // émotes (bouton 😀 / touche T)
    ch.subscribe(function (status) {
      Net.status = status;
      if (Net.ch !== ch) return;
      if (status === "SUBSCRIBED") { if (/Connexion/.test(Net.err || "")) Net.err = ""; trackMe(); if (Net.role === "guest" && Net.hostId) p2pConnectToHost(); }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        Net.err = "Connexion au salon perdue, reconnexion…";
        // le salon se reconnecte tout seul (téléphone en veille, changement d'appli pour partager le code…)
        clearTimeout(Net.retryT);
        Net.retryT = setTimeout(function () { if (Net.ch === ch && Net.status !== "SUBSCRIBED") { netJoin(Net.code, Net.role === "host", true); refreshLobby(); } }, 4000);
      }
      if (state === "menu" && screen === "lobby") go("lobby");
    });
    Net.ch = ch;
    checkUpdate();
  }
  function netLeave(silent) {
    clearTimeout(Net.retryT);
    Object.keys(Net.peers || {}).forEach(closePeer);
    Net.hostId = null; Net.seen = {};
    if (window.Party && window.Party.emoteChannelOff) window.Party.emoteChannelOff();
    if (Net.ch) { try { Net.ch.untrack(); } catch (e) {} try { Net.client.removeChannel(Net.ch); } catch (e) {} }
    Net.startInfo = null; Net.dgBad = 0;
    Net.ch = null; Net.on = false; Net.role = null; Net.started = false; Net.roster = []; Net.cur = Net.prev = null;
  }
  // la présence Supabase n'aime pas les mises à jour en rafale (le salon se ferme) : au plus une toutes les 1,5 s
  function trackMe() {
    if (!Net.ch) return;
    var now = Date.now(), wait = (Net.trackAt || 0) + 1500 - now;
    if (wait > 0) { if (!Net.trackT) Net.trackT = setTimeout(function () { Net.trackT = null; trackMe(); }, wait); return; }
    Net.trackAt = now;
    Net.ch.track({ v: VERSION, id: Net.id, name: (S.name || "Écureuil").slice(0, 16), char: S.char, host: Net.role === "host", map: S.map, dtype: S.dungeon || "terriers", diff: S.diff, mode: S.mode || "survie",
                   prog: { shop: S.shop, tree: S.tree, pr: S.prestige, pu: S.pshop }, ingame: Net.started, ts: Net.joinTs || (Net.joinTs = Date.now()) });
  }
  function onPresence() {
    if (!Net.ch) return;
    var st = Net.ch.presenceState(), list = [];
    Object.keys(st).forEach(function (k) { if (st[k] && st[k][0]) list.push(st[k][0]); });
    list.sort(function (a, b) { return (b.host ? 1 : 0) - (a.host ? 1 : 0) || a.ts - b.ts; });
    Net.roster = list;
    var host = list.filter(function (x) { return x.host; })[0];
    if (Net.role === "guest") {
      if (!host && Net.started && state !== "over") { if (!Net.hostGone) Net.hostGone = Date.now(); }
      else Net.hostGone = 0;
      if (host && host.v !== VERSION) { if (/version/.test(Net.err || "")) Net.err = ""; }   // affiché par le salon
      else if (host && host.ingame && !Net.started && state === "menu") {
        // lancement manqué (message perdu) : on redemande les infos de la partie à l'hôte
        Net.err = "Une partie est en cours dans ce salon : connexion à la partie…";
        netSend("need", { id: Net.id });
      }
      var idx = list.map(function (x) { return x.id; }).indexOf(Net.id);
      if (idx >= MAX_PLAYERS && !Net.started) { Net.err = "Salon plein (" + MAX_PLAYERS + " joueurs max)."; netLeave(); go("coop"); return; }
      if (host) { Net.hostId = host.id; p2pConnectToHost(); }
    }
    if (Net.role === "host") {
      // on ne ferme que les liens des joueurs qui étaient dans le salon et l'ont quitté
      var live = list.map(function (x) { return x.id; });
      Net.seen = Net.seen || {};
      Object.keys(Net.seen).forEach(function (id) { if (live.indexOf(id) < 0) { closePeer(id); delete Net.seen[id]; } });
      live.forEach(function (id) { Net.seen[id] = true; });
    }
    if (Net.role === "host" && Net.started && players.length) {
      // un joueur absent de la présence n'est retiré qu'après quelques secondes (micro-coupures, reconnexion du salon)
      var ids = list.map(function (x) { return x.id; }), now = Date.now();
      Net.missing = Net.missing || {};
      players.forEach(function (pl) { if (pl.owner || pl === me) return; if (ids.indexOf(pl.id) >= 0) delete Net.missing[pl.id]; else if (!Net.missing[pl.id]) Net.missing[pl.id] = now; });
    }
    if (state === "menu" && screen === "lobby") go("lobby");
  }
  function onNet(ev, d, direct) {
    if (!d) return;
    if (ev === "s" && !direct && Net.role === "guest" && hostLinkOpen()) return;   // déjà reçu en direct
    if (ev === "start" && Net.role === "guest") {
      if (Net.started) return;
      if (d.v !== VERSION) { Net.err = verMsg(d.v); netSend("need", { id: Net.id, v: VERSION, bad: 1 }); refreshLobby(); checkUpdate(true); return; }
      if (d.roster && !d.roster.some(function (x) { return x.id === Net.id; })) { Net.err = "La partie a été lancée sans toi : attends la fin pour la rejoindre."; refreshLobby(); return; }
      startOnline(d); return;
    }
    if (ev === "need" && Net.role === "host") {
      if (Net.started && Net.startInfo && !d.bad && Net.startInfo.roster.some(function (x) { return x.id === d.id; })) { netSend("start", Net.startInfo); sendFast("start", Net.startInfo); }
      return;
    }
    if (ev === "in" && Net.role === "host") {
      var pl = playerById(d.id); if (!pl) return;
      pl.tx = d.x; pl.ty = d.y; pl.face = d.f; pl.moving = !!d.m; pl.choosing = !!d.c;
      if (d.t && pl.twinRef) { var tw = pl.twinRef; tw.tx = d.t[0]; tw.ty = d.t[1]; tw.face = d.t[2]; tw.moving = !!d.t[3]; tw.choosing = !!d.c; }
      return;
    }
    if (ev === "pick" && Net.role === "host") {
      var pp = playerById(d.id); if (!pp || !d.c) return;
      p = pp; applyCore(d.c); p = me;
      return;
    }
    if (ev === "s" && Net.role === "guest") { if (!(isArena() && r.phase === "shop")) receiveSnap(d); return; }
    if (ev === "round" && Net.role === "guest" && r && state === "play") {
      r.round = d.n; r.phase = "shop"; r.ready = {}; r.roundKills = 0;
      if (d.lv > r.level) { pending += d.lv - r.level; r.level = d.lv; }
      enemies = []; clearField(); gems = []; Net.cur = Net.prev = null;
      beginIntermission(d.inc);
      return;
    }
    if (ev === "next" && Net.role === "guest" && r && state === "play") {
      r.round = d.n; r.roundT = 0; r.roundLen = A.roundTime(d.n); r.phase = "fight"; r.ready = {};
      r.mod = A.mods.filter(function (m) { return m.id === d.mod; })[0] || null;
      picking = false; me.choosing = false; hideCard(); sendInput();
      return;
    }
    if (ev === "rdy" && Net.role === "host" && r && r.phase === "shop") { markReady(d.id); return; }
    if (ev === "tp" && Net.role === "guest" && r && (d.id === me.id || (me.twinRef && d.id === me.twinRef.id))) { var tpo = d.id === me.id ? me : me.twinRef; tpo.x = tpo.tx = d.x; tpo.y = tpo.ty = d.y; sendInput(); return; }
    if (ev === "floor" && Net.role === "guest" && isDungeon() && d.n !== r.dg.floor) { guestFloor(d.n); return; }
    if (ev === "end" && Net.role === "guest" && state !== "over") {
      if (d.won) r.won = true;
      if (d.r) { r.time = d.r[0]; r.kills = d.r[1]; r.level = d.r[2]; r.bosses = d.r[3]; r.gold = d.r[4]; }
      gameOver(!!d.q, d.q ? "L'hôte a mis fin à la partie." : "");
    }
  }
  function guestMap(id, stage, t0) {
    enterMap(id, stage, t0);
    enemies = []; projs = []; gems = []; Net.cur = Net.prev = null;
    banner("Carte " + (stage + 1) + " : " + MAP.name);
    sendInput();
  }
  function guestFloor(n) {
    buildFloor(n);
    enemies = []; projs = []; gems = []; Net.cur = Net.prev = null;
    banner("Étage " + n + " / " + DG.floors);
    sendInput();
  }
  function hostStart() {
    if (Net.role !== "host") return;
    var bad = Net.roster.slice(0, MAX_PLAYERS).filter(function (x) { return x.v !== VERSION; });
    if (bad.length) { Net.err = "Impossible de lancer : " + bad.map(function (x) { return x.name || "un joueur"; }).join(", ") + " n'a pas la même version du jeu (" + bad.map(function (x) { return x.v || "ancienne"; }).join(", ") + " au lieu de " + VERSION + "). Il doit recharger la page."; go("lobby"); return; }
    var info = { v: VERSION, map: S.map, dtype: S.dungeon || "terriers", diff: S.diff, mode: S.mode || "survie", seed: (Math.random() * 1e9) | 0, roster: Net.roster.slice(0, MAX_PLAYERS).map(function (x) { var g = x.prog || {}; return { id: x.id, name: x.name, char: x.char, shop: g.shop || {}, tree: g.tree || {}, prestige: g.pr || 0, pshop: g.pu || {} }; }) };
    if (!info.roster.some(function (x) { return x.id === Net.id; })) info.roster.unshift({ id: Net.id, name: S.name || "Hôte", char: S.char, shop: S.shop, tree: S.tree, prestige: S.prestige, pshop: S.pshop });
    Net.startInfo = info;
    netSend("start", info);
    startOnline(info);
    sendFast("start", info);
  }
  function startOnline(info) {
    Net.started = true; Net.missing = {}; Net.hostGone = 0; Net.ev = []; Net.acc = 0; Net.inAcc = 0; Net.cur = Net.prev = null;
    reset(info.roster, info.map, info.diff, info.mode, info.seed, info.dtype);
    Net.lastLevel = 1;
    S.stats.played[me.char.id] = true; S.stats.maps[MAP.id] = true; save();
    trackMe();
    beginPlay();
  }
  // ---------- hôte : instantané ----------
  function netHostTick(dt) {
    if (Net.role !== "host") return;
    Net.acc += dt;
    var rt = rates();
    if (Net.acc < 1 / rt.snap) return;
    Net.acc = 0;
    var snap = buildSnap(); snap.hz = rt.snap;
    sendFast("s", snap);
    Net.ev = []; Net.dmgN = 0;
  }
  function R1(v) { return Math.round(v); }
  function affMask(e) { var m = 0; if (e.aff) e.aff.forEach(function (id) { m |= AFX[id].bit; }); return m; }
  function buildSnap() {
    var e = [], i, en;
    for (i = 0; i < enemies.length; i++) {
      en = enemies[i]; if (en.dead) continue;
      e.push(en.id, en.d.prop ? ETYPES.length + SPRI[en.d.sprite] : ETI[en.type], R1(en.x), R1(en.y),
        (en.face < 0 ? 1 : 0) | (en.flash > 0 ? 2 : 0) | (en.under ? 4 : 0) | (en.slowT > 0 ? 8 : 0) | (en.d.elite ? 16 : 0) | (en.shellT > 0 || en.spin > 0 ? 32 : 0) | (affMask(en) << 6));
    }
    var pr = [];
    for (i = 0; i < projs.length && pr.length < 160 * 6; i++) {
      var q = projs[i];
      if (!nearAnyPlayer(q, 260)) continue;
      if (q.kind === "rocket") pr.push(-1, R1(q.x), R1(q.y), R1(Math.cos(q.ang) * q.spd), R1(Math.sin(q.ang) * q.spd), 0);
      else pr.push(SPRI[q.sprite] || 0, R1(q.x), R1(q.y), R1(q.kind === "boomerang" ? 0 : q.vx), R1(q.kind === "boomerang" ? 0 : q.vy), (q.anim || q.kind === "boomerang") ? 1 : 0);
    }
    var lb = [];
    lobs.forEach(function (l) { lb.push(R1(l.sx), R1(l.sy), R1(l.tx), R1(l.ty), Math.round(l.t * 100), Math.round(l.dur * 100), SPRI[l.sprite || "pinecone"] || 0, (l.sky ? 1 : 0) | (l.small ? 2 : 0), R1(l.rad || 0)); });
    var g = [];
    for (i = 0; i < gems.length && g.length < 220 * 3; i++) {
      var gm = gems[i];
      if (!nearAnyPlayer(gm, 300)) continue;
      g.push(gm.kind === "item" ? 100 + gm.v : gm.kind === "xp" && gm.v >= 3 ? 9 : GEMI[gm.kind], R1(gm.x), R1(gm.y));
    }
    var h = [];
    hostile.forEach(function (q) { h.push(R1(q.x), R1(q.y), R1(q.vx), R1(q.vy)); });
    var w = [];
    warns.forEach(function (x) { w.push(R1(x.x), R1(x.y), R1(x.r), Math.round(Math.min(1, x.t / x.dur) * 100)); });
    var pl = players.map(function (o) {
      var orb = {};
      Object.keys(o.weapons).forEach(function (k) { if (ALLW[k] && ALLW[k].type === "orbit") orb[k] = Math.round((o.st[k] || 0) * 100) / 100; });
      return [o.id, R1(o.x), R1(o.y), o.face, o.moving ? 1 : 0, Math.ceil(o.hp), R1(o.maxHp), o.down ? 1 : 0, o.choosing ? 1 : 0, o.inv > 0 ? 1 : 0,
              o.name, o.sprite, o.weapons, orb, Math.round(o.area * 100), o.amount, o.shield ? 1 : 0, Math.round(o.reviveT * 10), o.oshield > 0 ? 1 : 0, o.mount || 0];
    });
    return { r: [Math.round(r.time * 10), r.kills, r.level, Math.round(Math.min(1, xp / xpNext) * 1000), Math.floor(r.gold), r.bosses, Math.round(r.freeze * 10), Math.round(r.flash * 100), r.round, Math.round(r.roundT * 10)],
             dg: isDungeon() ? [r.dg.floor, r.dg.active, r.dg.rooms.filter(function (x) { return x.state === "cleared"; }).map(function (x) { return x.idx; }), r.dg.stairs ? [Math.round(r.dg.stairs.x), Math.round(r.dg.stairs.y)] : 0, r.dg.clearedTotal, r.dg.hash] : 0,
             e: e, pr: pr, lb: lb, g: g, h: h, w: w, pl: pl, b: curBoss ? [bossTitle(curBoss), Math.round(curBoss.hp / curBoss.maxHp * 1000), affMask(curBoss)] : 0, ev: Net.ev,
             cp: allComps().slice(0, 60).reduce(function (a, c) { a.push(SPRI[c.k] || 0, R1(c.x), R1(c.y), (c.face < 0 ? 1 : 0) | (c.fly ? 2 : 0) | (c.max && c.life < c.max * 0.3 ? 4 : 0)); return a; }, []),
             po: r.portal ? [r.portal.x, r.portal.y, r.portal.st, Math.round(r.portal.p * 100), r.portal.boss && !r.portal.boss.dead ? r.portal.boss.id : 0] : 0, stg: [r.stage || 0, Math.round((r.stageT0 || 0) * 10), MAP.id],
             sh: [Object.keys(r.sh).filter(function (k) { return r.sh[k].used || r.sh[k].p > 0; }).map(function (k) { return [k, Math.round(r.sh[k].p * 100), r.sh[k].used ? 1 : 0]; }), r.madness || 0, r.devil || 0],
             z: zones.length ? zones.reduce(function (a, z) { a.push(R1(z.x), R1(z.y), R1(z.r), ZONE_K.indexOf(z.kind), Math.round((z.dur - z.t) * 10)); return a; }, []) : 0 };
  }
  // ---------- invité : réception et lissage ----------
  function receiveSnap(d) {
    if (!Net.started || !r) return;
    Net.prev = Net.cur; Net.cur = { s: d, at: performance.now() };
    var rr = d.r;
    if (d.stg && (d.stg[0] !== (r.stage || 0) || d.stg[2] !== MAP.id) && !isDungeon() && !isArena()) guestMap(d.stg[2], d.stg[0], d.stg[1] / 10);
    Net.cps = [];
    if (d.cp) for (var ci = 0; ci < d.cp.length; ci += 4) Net.cps.push({ k: SPRN[d.cp[ci]], x: d.cp[ci + 1], y: d.cp[ci + 2], face: d.cp[ci + 3] & 1 ? -1 : 1, fly: !!(d.cp[ci + 3] & 2), anim: r.time * 8 + ci, max: d.cp[ci + 3] & 4 ? 1 : 0, life: 0 });
    r.portal = d.po ? { x: d.po[0], y: d.po[1], st: d.po[2], p: d.po[3] / 100, gb: d.po[4] } : null;
    r.time = rr[0] / 10; r.kills = rr[1]; r.gold = rr[4]; r.bosses = rr[5]; r.freeze = rr[6] / 10; r.flash = rr[7] / 100;
    if (isDungeon() && d.dg) {
      if (d.dg[0] !== r.dg.floor) guestFloor(d.dg[0]);
      r.dg.active = d.dg[1]; r.dg.clearedTotal = d.dg[4] || 0;
      d.dg[2].forEach(function (i) { if (r.dg.rooms[i]) r.dg.rooms[i].state = "cleared"; });
      r.dg.stairs = d.dg[3] ? { x: d.dg[3][0], y: d.dg[3][1] } : null;
      // plan différent de celui de l'hôte : on le signale (une fois par étage) au lieu de jouer sur deux cartes différentes
      if (d.dg[5] && d.dg[5] !== r.dg.hash && Net.dgBad !== r.dg.floor) { Net.dgBad = r.dg.floor; banner("Plan du donjon différent de l'hôte : rechargez tous les deux le jeu"); try { console.warn("dg hash", d.dg[5], r.dg.hash); } catch (e) {} }
    }
    if (isArena() && rr[8]) { r.round = rr[8]; r.roundT = rr[9] / 10; r.roundLen = A.roundTime(r.round); }
    xp = rr[3]; xpNext = 1000;
    if (rr[2] > r.level) { pending += rr[2] - r.level; r.level = rr[2]; }
    // joueurs
    var seen = {};
    d.pl.forEach(function (a) {
      seen[a[0]] = true;
      var o = playerById(a[0]);
      if (!o) { o = { id: a[0], char: D.CHARACTERS[0], weapons: {}, passives: {}, st: {}, timers: {}, consumed: {}, anim: 0, remote: true, x: a[1], y: a[2] }; players.push(o); }
      if (o === me || o === me.twinRef) { o.hp = a[5]; o.maxHp = a[6]; o.down = !!a[7]; o.reviveT = a[17] / 10; o.shield = !!a[16]; o.oshield = a[18] ? 1 : 0; if (a[9] && o.inv <= 0) o.inv = 0.4; return; }
      o.px = o.x; o.py = o.y; o.nx = a[1]; o.ny = a[2]; o.face = a[3]; o.moving = !!a[4]; o.hp = a[5]; o.maxHp = a[6]; o.down = !!a[7]; o.choosing = !!a[8];
      o.inv = a[9] ? 0.3 : 0; o.name = a[10]; o.sprite = a[11]; o.weapons = a[12] || {}; o.area = a[14] / 100; o.amount = a[15]; o.shield = !!a[16]; o.reviveT = a[17] / 10; o.oshield = a[18] ? 1 : 0; o.mount = a[19] || null;
      Object.keys(a[13] || {}).forEach(function (k) { o.st[k] = a[13][k]; });
    });
    players = players.filter(function (o) { return o === me || o === me.twinRef || seen[o.id]; });
    curBoss = d.b ? { d: { name: d.b[0] }, title: d.b[0], hp: d.b[1], maxHp: 1000, aff: d.b[2] ? D.AFFIXES.filter(function (a) { return d.b[2] & a.bit; }).map(function (a) { return a.id; }) : null } : null;
    if (d.sh) { r.sh = {}; d.sh[0].forEach(function (q) { r.sh[q[0]] = { p: q[1] / 100, used: q[2] }; }); r.madness = d.sh[1]; r.devil = d.sh[2]; }
    zones = [];
    if (d.z) for (var zi = 0; zi < d.z.length; zi += 5) zones.push({ x: d.z[zi], y: d.z[zi + 1], r: d.z[zi + 2], kind: ZONE_K[d.z[zi + 3]], t: 0, dur: Math.max(0.1, d.z[zi + 4] / 10) });
    // événements
    (d.ev || []).forEach(playEvent);
  }
  function playEvent(ev) {
    var t = ev[0];
    if (t === "nv") { fx.push({ kind: "ring", x: ev[1], y: ev[2], r: ev[3], life: 0.32, max: 0.32, col: "168,122,232" }); return; }
    if (t === "x") { fx.push({ kind: "ring", x: ev[1], y: ev[2], r: ev[3], life: 0.25, max: 0.25, red: !!ev[4] }); SND.boom(); }
    else if (t === "bo") { fx.push({ kind: "bolt", pts: ev[1], life: 0.16, max: 0.16 }); SND.zap(); }
    else if (t === "d") { if (S.opts.numbers && texts.length < 60) texts.push({ x: ev[1], y: ev[2], n: ev[3], life: 0.6 }); }
    else if (t === "k") { for (var i = 0; i < Math.min(ev[4], 12); i++) { var a = Math.random() * TAU, sp = 20 + Math.random() * 50; fx.push({ kind: "dot", x: ev[1], y: ev[2], vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.3 + Math.random() * 0.3, color: ev[3] }); } }
    else if (t === "sw") { var o = playerById(ev[1]); if (o) { fx.push({ kind: "swipe", dir: ev[2], r: ev[3], life: 0.18, max: 0.18, pl: o }); if (o === me) SND.whip(); } }
    else if (t === "sp") { var o2 = playerById(ev[1]); if (o2) fx.push({ kind: "spin", r: ev[2], life: 0.25, max: 0.25, pl: o2 }); }
    else if (t === "bn") banner(ev[1]);
    else if (t === "ch") { if (!me.down) grantChest(ev[1] || 0); }
    else if (t === "itx") { var px2 = playerById(ev[1]); if (px2 && px2.items && px2.items[ev[2]]) { px2.items[ev[2]]--; if (!px2.items[ev[2]]) delete px2.items[ev[2]]; if (px2 === me) calc(me); } }
    else if (t === "it") { var pi2 = playerById(ev[1]); if (pi2) { pi2.items = pi2.items || {}; pi2.items[ev[2]] = (pi2.items[ev[2]] || 0) + 1; if (pi2 === me) { calc(me); itemToast(ITM[ev[2]], me.items[ev[2]]); } } }
    else if (t === "rl") { var po = playerById(ev[1]); if (po) { po.relics = po.relics || {}; po.relics[ev[2]] = true; if (po === me) { calc(me); var rd = D.RELICS.filter(function (x) { return x.id === ev[2]; })[0]; if (rd) banner("Relique : " + rd.name + " (" + rd.desc + ")"); } } }
  }
  var PROPS_SPR = ["stump", "basket", "leafpile", "lantern"];
  function sendInput() {
    if (!Net.on || Net.role !== "guest" || !Net.started || !me) return;
    Net.inAcc = 0;
    var tw = me.twinRef;
    sendFast("in", { id: me.id, x: Math.round(me.x), y: Math.round(me.y), f: me.face, m: me.moving ? 1 : 0, c: (me.choosing || netMenuOpen) ? 1 : 0,
                     t: tw ? [Math.round(tw.x), Math.round(tw.y), tw.face, tw.moving ? 1 : 0] : 0 });
  }
  function updateGuest(dt) {
    var now = performance.now();
    if (isArena() && r.phase === "shop") { tickFx(dt); return; }
    if (isArena()) r.roundT = Math.min(r.roundLen, r.roundT + dt);
    moveMe(dt);
    me.anim += dt * (me.moving || SPR[me.sprite].flying ? 8 : 0);
    me.inv -= dt;
    var bi = biomeAtTile(Math.floor(me.x / 16), Math.floor(me.y / 16));
    if (bi !== r.biome && !isDungeon()) { if (r.biome >= 0) banner(MAP.biomes[bi].name); r.biome = bi; }
    Net.inAcc += dt;
    if (Net.inAcc >= 1 / rates().inp) sendInput();
    var cur = Net.cur, prev = Net.prev;
    if (cur) {
      var period = 1000 / (cur.s.hz || rates().snap), k = Math.max(0, Math.min(1, (now - cur.at) / period)), age = (now - cur.at) / 1000;
      var pm = {};
      if (prev) for (var i = 0; i < prev.s.e.length; i += 5) pm[prev.s.e[i]] = i;
      var list = [], E = cur.s.e, P = prev ? prev.s.e : null;
      for (i = 0; i < E.length; i += 5) {
        var id = E[i], ti = E[i + 1], x = E[i + 2], y = E[i + 3], fl = E[i + 4];
        if (P && pm[id] !== undefined) { var j = pm[id]; x = P[j + 2] + (x - P[j + 2]) * k; y = P[j + 3] + (y - P[j + 3]) * k; }
        var d = ti < ETYPES.length ? D.ENEMIES[ETYPES[ti]] : { prop: true, r: 6, sprite: SPRN[ti - ETYPES.length] };
        if (fl & 16) d = Object.assign({}, d, { elite: true });
        var am = fl >> 6, aff = am ? D.AFFIXES.filter(function (a) { return am & a.bit; }).map(function (a) { return a.id; }) : null;
        var anim = (Net.anims[id] = (Net.anims[id] || Math.random() * 2) + dt * 5);
        list.push({ giant: !!(Net.cur && Net.cur.s.po && Net.cur.s.po[4] === id), id: id, x: x, y: y, d: d, spr: SPR[d.sprite] || SPR.stump, anim: anim, face: fl & 1 ? -1 : 1, flash: fl & 2 ? 1 : 0, under: !!(fl & 4), slowT: fl & 8 ? 1 : 0, shelled: !!(fl & 32), aff: aff, type: ti < ETYPES.length ? ETYPES[ti] : "prop" });
      }
      enemies = list;
      players.forEach(function (o) {
        if (o === me || o.nx === undefined) return;
        o.x = o.px + (o.nx - o.px) * k; o.y = o.py + (o.ny - o.py) * k;
        o.anim += dt * (o.moving || (SPR[o.sprite] && SPR[o.sprite].flying) ? 8 : 0);
      });
      var pr = cur.s.pr; projs = [];
      for (i = 0; i < pr.length; i += 6) {
        var vx = pr[i + 3], vy = pr[i + 4];
        if (pr[i] < 0) projs.push({ kind: "rocket", x: pr[i + 1] + vx * age, y: pr[i + 2] + vy * age, ang: Math.atan2(vy, vx) });
        else projs.push({ kind: "bullet", sprite: SPRN[pr[i]], x: pr[i + 1] + vx * age, y: pr[i + 2] + vy * age, vx: vx, vy: vy, anim: !!pr[i + 5] });
      }
      var lb = cur.s.lb; lobs = [];
      for (i = 0; i < lb.length; i += 9) lobs.push({ sx: lb[i], sy: lb[i + 1], tx: lb[i + 2], ty: lb[i + 3], t: Math.min(lb[i + 5], lb[i + 4] + age * 100) / 100, dur: lb[i + 5] / 100, sprite: SPRN[lb[i + 6]], sky: !!(lb[i + 7] & 1), small: !!(lb[i + 7] & 2), rad: lb[i + 8] });
      var g = cur.s.g; gems = [];
      for (i = 0; i < g.length; i += 3) gems.push(g[i] >= 100 ? { kind: "item", v: g[i] - 100, x: g[i + 1], y: g[i + 2] } : g[i] === 9 ? { kind: "xp", v: 3, x: g[i + 1], y: g[i + 2] } : { kind: GEMK[g[i]], v: 1, x: g[i + 1], y: g[i + 2] });
      var h = cur.s.h; hostile = [];
      for (i = 0; i < h.length; i += 4) hostile.push({ x: h[i] + h[i + 2] * age, y: h[i + 1] + h[i + 3] * age, vx: h[i + 2], vy: h[i + 3] });
      var w = cur.s.w; warns = [];
      for (i = 0; i < w.length; i += 4) warns.push({ x: w[i], y: w[i + 1], r: w[i + 2], t: w[i + 3] / 100, dur: 1 });
      if (now - cur.at > 4000 && state === "play") { gameOver(true, "Connexion perdue avec l'hôte."); return; }
    }
    tickFx(dt);
    achTick -= dt;
    if (achTick <= 0) { achTick = 1; checkAchievements(r); }
    chestCheck();
    if (pending > 0 && !picking && !me.down && state === "play" && !isArena()) openLevelUp();
  }
  Net.anims = {};

  /* =====================================================================
     Déroulement d'une partie
     ===================================================================== */
  var last = 0;
  function start() {
    if (Net.on) { if (Net.role === "host") hostStart(); return; }
    sanitize();
    reset(null, null, null, S.mode || "survie");
    S.stats.played[CH.id] = true; S.stats.maps[MAP.id] = true; save();
    beginPlay();
  }
  function beginPlay() {
    Net.anims = {};
    if (isTouch) enterFull();
    state = "play"; hideCard();
    curBoss = null;
    $("[data-toasts]").innerHTML = "";
    last = performance.now();
    canvas.focus({ preventScroll: true });
    var rc = stage.getBoundingClientRect(), head = document.querySelector(".site-header");
    var top = head ? head.getBoundingClientRect().bottom : 0;
    if (!document.fullscreenElement && !stage.classList.contains("is-max") && (rc.top < top || rc.bottom > window.innerHeight))
      window.scrollTo({ top: window.scrollY + rc.top - top - 8, behavior: "smooth" });
    sfx(660, 0.1, "square", 0.04);
    if (D.ARMES && !Net.on) openDraft();
  }
  function netMenu() {
    netMenuOpen = true; me.choosing = true; clearInput(); sendInput();
    showCard('<h2>Partie en ligne</h2><p>Le jeu continue pendant que ce menu est ouvert (tu es protégé par une bulle).</p>' +
      '<p class="game-small">Salon <b>' + esc(Net.code || "") + "</b> · " + players.length + " joueurs</p>" +
      '<div class="btn-row center"><button class="btn" type="button" data-action="resume" data-autofocus>▶ Reprendre</button>' +
      '<button class="btn btn-ghost btn-small" type="button" data-action="opt-pause">' + (S.opts.sound ? "🔊 Son : oui" : "🔇 Son : non") + "</button>" +
      '<button class="btn btn-ghost btn-small" type="button" data-action="quit">🏳️ Quitter la partie</button></div>', "netmenu");
  }
  function pause() {
    if (state !== "play" || picking || party) return;
    if (humans() > 1) { if (netMenuOpen) resume(); else netMenu(); return; }
    state = "pause"; clearInput();
    var html = '<h2>Pause</h2><div class="pause-grid"><div><h3>Armes (' + Object.keys(p.weapons).length + "/" + MAX_W + ')</h3><ul class="build-list">';
    Object.keys(p.weapons).forEach(function (k) { var td = techDef(p, k); html += '<li class="' + (td.fusion ? "is-fusion" : "") + '"><img src="' + spriteUrl(td.icon) + '" alt="">' + esc(techName(p, k)) + " <b>niv. " + p.weapons[k] + "</b></li>"; });
    html += '</ul><h3>Objets (' + Object.keys(p.passives).length + "/" + MAX_P + ')</h3><ul class="build-list">';
    Object.keys(p.passives).forEach(function (k) { html += '<li><img src="' + spriteUrl(D.PASSIVES[k].sprite) + '" alt="">' + esc(D.PASSIVES[k].name) + " <b>niv. " + p.passives[k] + "</b>" + synHtml(k) + "</li>"; });
    html += '</ul></div><div><h3>Statistiques</h3><ul class="stat-list">' +
      "<li>PV <b>" + Math.ceil(p.hp) + " / " + p.maxHp + "</b></li>" +
      "<li>Dégâts <b>" + Math.round(p.might * 100) + " %</b></li>" +
      "<li>Vitesse <b>" + Math.round(p.speed / 62 * 100) + " %</b></li>" +
      "<li>Recharge <b>" + Math.round(p.cdMul * 100) + " %</b></li>" +
      "<li>Zone <b>" + Math.round(p.area * 100) + " %</b></li>" +
      "<li>Projectiles <b>+" + p.amount + "</b></li>" +
      "<li>Armure <b>" + p.armor + "</b></li>" +
      "<li>Renaissances <b>" + me.revives + "</b></li></ul></div></div>" +
      '<div class="btn-row center"><button class="btn" type="button" data-action="resume" data-autofocus>▶ Reprendre</button>' +
      '<button class="btn btn-ghost btn-small" type="button" data-action="opt-pause">' + (S.opts.sound ? "🔊 Son : oui" : "🔇 Son : non") + "</button>" +
      '<button class="btn btn-ghost btn-small" type="button" data-action="restart">↻ Recommencer</button>' +
      '<button class="btn btn-ghost btn-small" type="button" data-action="quit">🏳️ Abandonner</button></div>';
    showCard(html, "pause");
  }
  function resume() {
    if (netMenuOpen) { netMenuOpen = false; me.choosing = picking; hideCard(); sendInput(); return; }
    if (state !== "pause") return; state = "play"; hideCard(); last = performance.now();
  }

  function gameOver(quit, reason) {
    if (chestOpen && chestOpen.mini) { chestOpen.t.forEach(clearTimeout); chestOpen = null; }
    chestHideMini();
    if (state === "over") return;
    var online = Net.on && Net.started;
    if (online && Net.role === "host") netSend("end", { q: quit ? 1 : 0, won: r.won ? 1 : 0, r: [r.time, r.kills, r.level, r.bosses, r.gold] });
    if (online) { Net.started = false; if (Net.role === "guest" && quit && !reason) netLeave(); else trackMe(); }
    picking = false; netMenuOpen = false;
    state = "over"; SND.over();
    curBoss = null;
    r.ended = true;
    var sc = score(), gold = runGold();
    if (party) partyEnded(quit);
    S.stats.kills += r.kills; S.stats.voltes = (S.stats.voltes || 0) + (r.voltes || 0); r.committed = true;
    S.stats.runs++;
    earnGold(gold);
    var rankGain = Math.floor((r.time / 10 + r.kills / 20 + r.bosses * 20 + r.level * 2) * (1 + 0.2 * pu("rang"))), ranksUp = 0;
    S.rankXp += rankGain;
    while (S.rankXp >= D.rankNeed(S.rank)) { S.rankXp -= D.rankNeed(S.rank); S.rank++; ranksUp++; }
    var isBest = sc > S.stats.bestScore;
    S.stats.bestScore = Math.max(S.stats.bestScore, sc);
    S.stats.bestTime = Math.max(S.stats.bestTime, Math.floor(r.time));
    save();
    checkAchievements(r);
    var achHtml = r.newAch.length ? '<div class="over-ach"><h3>Succès débloqués</h3><ul>' + r.newAch.map(function (a) {
      var un = unlocksOf(a.id);
      return "<li>🏆 <strong>" + esc(a.name) + "</strong> +" + a.gold + " " + goldIc() + (un.length ? "<span>Débloque " + esc(un.join(", ")) + "</span>" : "") + "</li>";
    }).join("") + "</ul></div>" : "";
    var exG = expeSettle();
    var runG = grantRun();
    var lbOk = window.Leaderboard && Leaderboard.configured() && !r.coop && !r.cauch && !isExpe();
    var html = '<span class="kicker">' + esc(reason || (quit ? "Partie abandonnée" : "Les bestioles ont gagné…")) + "</span><h2>Fin de partie" + (r.coop ? " (coop)" : "") + "</h2>" +
      '<ul class="over-stats"><li><span>' + (isDungeon() ? "Étage" : isArena() ? "Manche" : "Survie") + "</span><strong>" + (isDungeon() ? r.dg.floor + " / " + DG.floors : isArena() ? (r.won ? A.rounds : r.round) + " / " + A.rounds : fmtTime(r.time)) + "</strong></li><li><span>Ennemis</span><strong>" + r.kills + "</strong></li><li><span>Niveau</span><strong>" + r.level + "</strong></li>" +
      '<li class="total"><span>Score' + (DIFF.score > 1 ? " (×" + fr(DIFF.score) + ")" : "") + "</span><strong>" + sc.toLocaleString("fr-FR") + "</strong></li>" +
      '<li class="gold"><span>Glands d\'or gagnés</span><strong>+' + gold + " " + goldIc() + "</strong></li></ul>" +
      '<p class="rank-line">+' + rankGain + " XP de rang de compte · <b>Rang " + S.rank + "</b>" + (ranksUp ? ' <span class="rank-up">Rang supérieur !</span>' : "") + "</p>" + (exG ? '<p class="v2-run">' + (exG.extracted ? "🎒 Extraction : le sac (valeur " + exG.value + ") est au camp." : "💀 Sac perdu (" + exG.lost + " emplacement" + (exG.lost > 1 ? "s" : "") + ")" + (r.secure.length ? ", sauf ce qui était à l'abri." : ".")) + " Étage atteint : " + exG.depth + (exG.done.length ? "<br>Contrats remplis : " + exG.done.map(function (c) { return esc(c.txt); }).join(", ") : "") + "</p>" : "") + runSummaryHtml(runG) +
      '<p class="game-small">' + (isBest ? "🏆 Nouveau record perso !" : "Ton record : " + S.stats.bestScore.toLocaleString("fr-FR")) + "</p>" + achHtml +
      (lbOk ? '<form class="submit-score" data-submit><label for="es-name">Ton pseudo pour le classement</label><div class="submit-row">' +
        '<input id="es-name" type="text" maxlength="20" autocomplete="nickname" placeholder="Pseudo" value="' + esc(S.name || "") + '">' +
        '<button class="btn btn-alt btn-small" type="submit">Envoyer</button></div><p class="game-small" data-submit-msg aria-live="polite"></p></form>' : "") +
      (Net.on ? '<div class="btn-row center"><button class="btn" type="button" data-action="go" data-arg="lobby" data-autofocus>↻ Retour au salon</button>' +
        '<button class="btn btn-ghost" type="button" data-action="leave">Quitter le salon</button></div>'
      : '<div class="btn-row center"><button class="btn" type="button" data-action="restart" data-autofocus>↻ Rejouer</button>' +
        '<button class="btn btn-ghost" type="button" data-action="menu">Menu</button></div>');
    showCard(html, "over");
    var form = card.querySelector("[data-submit]");
    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = form.querySelector("input"), btn = form.querySelector("button"), msg = form.querySelector("[data-submit-msg]");
      var name = input.value.trim();
      if (name.length < 2) { msg.textContent = "Choisis un pseudo d'au moins 2 caractères."; return; }
      S.name = name; save();
      btn.disabled = true; msg.textContent = "Envoi…";
      Leaderboard.submit(isDungeon() ? GAME_ID_DUNGEON : isArena() ? GAME_ID_ARENA : GAME_ID, name, sc, { time: Math.floor(r.time), kills: r.kills, level: r.level, char: r.char, map: r.map, diff: S.diff }).then(function (res) {
        msg.textContent = res && res.rank ? "Envoyé ! Tu es " + res.rank + (res.rank === 1 ? "er" : "e") + " au classement." : "Envoyé !";
        document.querySelectorAll('[data-leaderboard="' + (isDungeon() ? GAME_ID_DUNGEON : isArena() ? GAME_ID_ARENA : GAME_ID) + '"]').forEach(function (el) { el.removeAttribute("data-lb-rendered"); Leaderboard.render(el); });
      }).catch(function (err) { msg.textContent = Leaderboard.message(err); btn.disabled = false; });
    });
  }

  // nouvelle version en ligne ? (vérifié au lancement, toutes les 2 min et au retour sur l'onglet)
  var updShown = false;
  // versions : "0.26.10" > "0.26.9"
  function verCmp(a, b) {
    var x = String(a || "0").split("."), y = String(b || "0").split(".");
    for (var i = 0; i < Math.max(x.length, y.length); i++) { var d = (parseInt(x[i], 10) || 0) - (parseInt(y[i], 10) || 0); if (d) return d < 0 ? -1 : 1; }
    return 0;
  }
  function verMsg(other) {
    return verCmp(other, VERSION) > 0 ? "Ta version du jeu (" + VERSION + ") est plus ancienne que celle de l'hôte (" + other + ") : recharge la page pour jouer ensemble."
                                      : "L'hôte a une ancienne version du jeu" + (other ? " (" + other + ")" : "") + " : il doit recharger la page.";
  }
  function reloadGame() { location.replace(location.pathname + "?r=" + Date.now() + location.hash); }
  function checkUpdate() {
    if (updShown || !window.fetch) return;
    fetch("js/v2/version.json?t=" + Date.now(), { cache: "no-store" }).then(function (x) { return x.json(); }).then(function (j) {
      if (!j || !j.v || j.v === VERSION || updShown) return;
      updShown = true;
      var bar = document.createElement("div");
      bar.className = "update-bar";
      bar.innerHTML = "<span>🐿️ Nouvelle version <b>" + esc(j.v) + "</b> disponible</span><button type=\"button\" class=\"btn btn-small\">Recharger</button>";
      bar.querySelector("button").addEventListener("click", reloadGame);
      document.body.appendChild(bar);
    }, function () {});
  }
  setTimeout(checkUpdate, 3000);
  setInterval(checkUpdate, 120000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) checkUpdate(); });
  function showError(err) {
    state = "error";
    try { console.error(err); } catch (e) {}
    var msg = (err && (err.message || String(err))) || "inconnue";
    var where = err && err.stack ? String(err.stack).split("\n").slice(0, 3).join(" | ") : "";
    showCard("<h2>Oups, le jeu a planté 🐿️</h2><p>Désolé ! Envoie-moi ce message (" + VERSION + ") :</p>" +
      '<pre class="err">' + esc(msg + (where ? "\n" + where : "")) + "</pre>" +
      '<div class="btn-row center"><button class="btn" type="button" data-action="menu">Retour au menu</button></div>', "error");
  }

  /* =====================================================================
     Boucle
     ===================================================================== */
  function loop(now) {
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    if (state === "error") return;
    try {
      if (state === "play") { if (Net.on && Net.role === "guest") updateGuest(dt); else update(dt); }
      if (state === "menu" && camp.on) { campTick(dt); drawCamp(now); }
      else if (state === "menu" || !p) drawIdle(now); else draw();
    } catch (err) { showError(err); }
  }

  /* =====================================================================
     Boutons, plein écran, taille
     ===================================================================== */
  $("[data-pause]").addEventListener("click", function () { if (state === "play") pause(); else if (state === "pause") resume(); });
  // l'hôte continue de simuler même si son onglet passe en arrière-plan
  var bgLast = 0;
  setInterval(function () {
    var now = performance.now(), el = Math.min(1.5, (now - (bgLast || now)) / 1000); bgLast = now;
    if (!document.hidden || state !== "play" || !Net.on || Net.role !== "host") return;
    try { for (var t = 0; t < el; t += 0.05) update(0.05); last = performance.now(); } catch (e) {}
  }, 100);
  var muteBtn = $("[data-mute]");
  function muteLabel() { muteBtn.textContent = S.opts.sound ? "🔊" : "🔇"; muteBtn.setAttribute("aria-label", S.opts.sound ? "Couper le son" : "Activer le son"); }
  muteLabel();
  muteBtn.addEventListener("click", function () { S.opts.sound = !S.opts.sound; save(); muteLabel(); });

  /* ---------- plein écran ----------
     API Fullscreen quand elle existe (Android, ordi), sinon le jeu occupe tout
     l'écran en CSS (iPhone). Sur téléphone, on y passe tout seul au lancement. */
  var isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  var standalone = window.matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches || navigator.standalone;
  function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement) || stage.classList.contains("is-max"); }
  function syncFull() {
    var on = isFull();
    document.documentElement.classList.toggle("es-max", on);
    stage.classList.toggle("is-full", on);
    if (state === "menu" && screen === "menu") go("menu");
  }
  function enterFull() {
    if (isFull() || standalone) return;
    var req = stage.requestFullscreen || stage.webkitRequestFullscreen;
    var fallback = function () { stage.classList.add("is-max"); syncFull(); };
    if (req) {
      try { var pr = req.call(stage, { navigationUI: "hide" }); if (pr && pr.catch) pr.catch(fallback); } catch (e) { fallback(); }
    } else fallback();
  }
  function exitFull() {
    stage.classList.remove("is-max");
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
    syncFull();
  }
  function toggleFull() { if (isFull()) exitFull(); else enterFull(); }
  document.addEventListener("fullscreenchange", syncFull);
  document.addEventListener("webkitfullscreenchange", syncFull);
  var fsBtn = document.querySelector("[data-game-fullscreen]");
  if (fsBtn) fsBtn.addEventListener("click", toggleFull);
  $("[data-exit-max]").addEventListener("click", exitFull);
  $("[data-fs-exit]").addEventListener("click", exitFull);
  ACTIONS.fullscreen = function () { toggleFull(); };

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    var cw = Math.max(200, stage.clientWidth), ch = Math.max(200, stage.clientHeight);
    var scale = Math.max(2, Math.round(Math.sqrt(cw * ch) * dpr / 250));
    W = Math.max(80, Math.ceil(cw * dpr / scale)); H = Math.max(80, Math.ceil(ch * dpr / scale));
    canvas.width = W; canvas.height = H;
    canvas.style.width = (W * scale / dpr) + "px";
    canvas.style.height = (H * scale / dpr) + "px";
    stage.style.setProperty("--px-game", (scale / dpr) + "px");
    ctx.imageSmoothingEnabled = false;
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();

  // si le navigateur a gardé un vieux style.css, on le recharge
  try {
    if (getComputedStyle(overlay).position !== "absolute") {
      var l = document.createElement("link");
      l.rel = "stylesheet"; l.href = "css/style.css?fresh=" + Date.now();
      document.head.appendChild(l);
    }
  } catch (e) {}
  window.addEventListener("error", function (e) { if (state !== "error" && state !== "menu") showError(e.error || e.message); });

  // outils de test (console) : ES_DEBUG.gold(500), ES_DEBUG.time(170), ES_DEBUG.give("gland", 5)
  window.ES_DEBUG = {
    gold: function (n) { earnGold(n || 500); save(); if (state === "menu") go(screen); },
    rank: function (n) { S.rank += n || 1; save(); if (state === "menu") go(screen); },
    ppts: function (n) { S.ppts += n || 500; save(); if (state === "menu") go(screen); },
    time: function (t) { if (r) { r.time = t; nextSwarm = Math.ceil(t / 60) * 60; nextBoss = Math.max(180, Math.ceil(t / 180) * 180); } },
    give: function (id, lvl) { if (!p) return; if (ALLW[id]) p.weapons[id] = lvl || 5; else if (D.PASSIVES[id]) p.passives[id] = lvl || 5; calc(); refreshCounts(); },
    drop: function (kind) { if (p) drop(kind, p.x + 20, p.y); },
    level: function () { if (p) { pending++; } },
    warns: function () { return warns && warns.length; },
    dungeon: function () { return r && r.dg ? { floor: r.dg.floor, active: r.dg.active, rooms: r.dg.rooms.map(function (x) { return x.type[0] + (x.state === "cleared" ? "*" : ""); }).join(""), stairs: !!r.dg.stairs, cleared: r.dg.clearedTotal } : null; },
    goRoom: function (type) { if (!r || !r.dg) return; var rm = r.dg.rooms.filter(function (x) { return x.type === type && x.state !== "cleared"; })[0]; if (rm) { me.x = rm.cx; me.y = rm.cy; } return !!rm; },
    chest: function (t) { chestQueue.push(t || 0); },
    walkTest: function () {
      var bad = 0, tot = 0, save = r.dg.active; r.dg.active = -1;
      r.dg.corridors.forEach(function (c) {
        var A = r.dg.rooms[c.a], B = r.dg.rooms[c.b], ea = c.ends[0], eb = c.ends[1], sg = c.segs[1], horiz = ea.dx !== 0, pts;
        if (horiz) { var mx = sg.x + 18; pts = [[A.cx, ea.y], [ea.x, ea.y], [mx, ea.y], [mx, eb.y], [eb.x, eb.y], [B.cx, eb.y], [B.cx, B.cy]]; }
        else { var my = sg.y + 18; pts = [[ea.x, A.cy], [ea.x, ea.y], [ea.x, my], [eb.x, my], [eb.x, eb.y], [eb.x, B.cy], [B.cx, B.cy]]; }
        var o = { x: A.cx, y: A.cy }; tot++;
        var stuck = null;
        pts.forEach(function (pt, pi) {
          for (var k = 0; k < 3000; k++) { var dx = pt[0] - o.x, dy = pt[1] - o.y, d = Math.hypot(dx, dy); if (d < 1) break; dungeonMove(o, o.x + dx / d * Math.min(1.5, d), o.y + dy / d * Math.min(1.5, d)); }
          if (!stuck && Math.hypot(pt[0] - o.x, pt[1] - o.y) > 2) stuck = { pi: pi, at: [Math.round(o.x), Math.round(o.y)], pil: inPillar(o.x, o.y, 8), inA: inRoom(A, o.x, o.y, 0), inC: inCorridor(o.x, o.y, 0) };
        });
        if (Math.hypot(o.x - B.cx, o.y - B.cy) > 3) { bad++; (window.__dgBad = window.__dgBad || []).push({ stuck: stuck, a: c.a, b: c.b, horiz: horiz, pts: pts.map(function (q) { return q.map(Math.round); }), pillar: inPillar(o.x, o.y, 8), pit: !!pitAt(o.x, o.y), shapeA: A.shape, shapeB: B.shape }); }
      });
      r.dg.active = save; return bad + "/" + tot;
    },
    route: function () {
      var c = r.dg.corridors.filter(function (x) { return x.a === 0 || x.b === 0; })[0]; if (!c) return null;
      var A = r.dg.rooms[c.a], B = r.dg.rooms[c.b], ea = c.ends[0], eb = c.ends[1], sg = c.segs[1], pts;
      if (ea.dx !== 0) { var mx = sg.x + 18; pts = [[A.cx, ea.y], [ea.x, ea.y], [mx, ea.y], [mx, eb.y], [eb.x, eb.y], [B.cx, eb.y], [B.cx, B.cy]]; }
      else { var my = sg.y + 18; pts = [[ea.x, A.cy], [ea.x, ea.y], [ea.x, my], [eb.x, my], [eb.x, eb.y], [eb.x, B.cy], [B.cx, B.cy]]; }
      if (c.b === 0) pts = pts.reverse().slice(1).concat([[B.cx, B.cy]]).map(function (q, i, arr) { return q; });
      return c.b === 0 ? [[A.cx, eb.y]].concat(pts) : pts;
    },
    armTest: function () {
      var bad = 0, tot = 0, save = r.dg.active; r.dg.active = -1;
      r.dg.rooms.forEach(function (rm) {
        rm.parts.forEach(function (pp, i) {
          if (!i) return; tot++;
          var tx = pp.x + pp.w / 2, ty = pp.y + pp.h / 2, horiz = pp.y >= rm.core.y - 1 && pp.y + pp.h <= rm.core.y + rm.core.h + 1 && (pp.x < rm.core.x || pp.x + pp.w > rm.core.x + rm.core.w);
          var o = { x: rm.cx, y: rm.cy }, pts = horiz ? [[rm.cx, ty], [tx, ty]] : [[tx, rm.cy], [tx, ty]];
          pts.forEach(function (pt) { for (var k = 0; k < 3000; k++) { var dx = pt[0] - o.x, dy = pt[1] - o.y, d = Math.hypot(dx, dy); if (d < 1) break; dungeonMove(o, o.x + dx / d * Math.min(1.5, d), o.y + dy / d * Math.min(1.5, d)); } });
          if (Math.hypot(o.x - tx, o.y - ty) > 20) { bad++; (window.__arm = window.__arm || []).push({ at: [Math.round(o.x), Math.round(o.y)], to: [Math.round(tx), Math.round(ty)], c: [rm.cx, rm.cy], core: rm.core, arm: pp, horiz: horiz, pil: inPillar(o.x, o.y, 8), tgtOk: walkable(tx, ty), shape: rm.shape }); }
        });
      });
      r.dg.active = save; return bad + "/" + tot;
    },
    probe: function (x, y) { var o = []; for (var k = 0; k <= 30; k += 3) o.push([y - k, walkable(x, y - k) ? 1 : 0, inPillar(x, y - k, 4) ? "P" : "", pitAt(x, y - k + 3) ? "T" : "", onFloor(x, y - k - 7) ? "" : "noFloorUp"]); var rm = roomAt(x, y + 5, 0); return { pts: o, parts: rm ? rm.parts.map(function (q) { return [Math.round(q.x), Math.round(q.y), Math.round(q.w), Math.round(q.h)]; }) : null, me: [Math.round(me.x), Math.round(me.y)] }; },
    clearAll: function () { r.dg.active = -1; r.dg.rooms.forEach(function (rm) { rm.state = "cleared"; }); enemies = []; },
    upArms: function () { var out = []; r.dg.rooms.forEach(function (rm) { rm.parts.forEach(function (pp, i) { if (i && pp.y + pp.h <= rm.core.y + 30 && pp.y < rm.core.y) out.push({ x: Math.round(pp.x + pp.w / 2), cy: Math.round(rm.core.y + rm.core.h / 2), top: Math.round(pp.y + 20), coreTop: Math.round(rm.core.y) }); }); }); return out; },
    regen: function (seed) { r.seed = seed; buildFloor(1); },
    vacuum: function () { gems.forEach(function (o) { if (o.kind === "xp") { o.x = me.x; o.y = me.y; } }); return { xp: xp, next: xpNext, level: r.level }; },
    elite: function (type, n, ids) { var e = spawn(type || "beetle", Math.random() * TAU, 50 + Math.random() * 40); e.aff = null; if (ids && !ids.length) return null; if (ids) { e.aff = ids.slice(); e.d = Object.assign({}, e.d, { elite: true }); } else giveAffixes(e, n || 1); if (isDungeon()) { e.room = undefined; e.wander = true; e.awake = true; } return e.aff; },
    boss: function (type) { enemies.forEach(function (o) { if (o.d.boss) o.dead = true; }); var e = spawn(type, 0, 80); if (isDungeon()) { e.wander = true; e.awake = true; } return e.d.name; },
    sheet: function (names) { var c = document.createElement("canvas"); c.width = 1000; c.height = 260; var g = c.getContext("2d"); g.imageSmoothingEnabled = false; g.fillStyle = "#5a7a4a"; g.fillRect(0, 0, 1000, 260); var x = 10; names.forEach(function (n) { SPR[n].forEach(function (f, i) { g.drawImage(f.c, x, 10 + i * 120, f.w * 5, f.h * 5); }); x += SPR[n][0].w * 5 + 12; }); document.body.prepend(c); c.style.cssText = "position:fixed;left:0;top:0;z-index:9999;width:1000px;image-rendering:pixelated"; },
    item: function (id, n) { for (var i = 0; i < (n || 1); i++) giveItem(me, id); return me.items; },
    dropForMates: function (id) { players.forEach(function (pl) { if (pl.remote) drop("item", pl.x + 4, pl.y, ITM[id || "plume"].idx); }); },
    items: function () { return me.items || {}; },
    ens: function () { return enemies.slice(0, 6).map(function (e) { return e.type + ":" + Math.round(Math.hypot(e.x - me.x, e.y - me.y)) + ":" + Math.round(e.hp) + "/" + Math.round(e.maxHp) + (e.d.prop ? ":prop" : ""); }); },
    dropItems: function () { D.ITEMS.forEach(function (it, i) { drop("item", me.x - 60 + (i % 8) * 16, me.y - 40 + ((i / 8) | 0) * 16, i); }); },
    giants: function () { var out = []; for (var i = -3; i <= 3; i++) for (var j = -3; j <= 3; j++) { var g = giantAt(i, j); if (g) out.push([g.k, Math.round(g.x), Math.round(g.y)]); } return { n: out.length, use: useGiants(), list: out.slice(0, 5), seed: giantSeed }; },
    tp: function (x, y) { me.x = x; me.y = y; },
    pool: function () { p = me; var seen = {}; for (var i = 0; i < 300; i++) choices(6).forEach(function (c) { if (c.id) seen[c.id] = 1; }); var its = {}; for (i = 0; i < 400; i++) its[rollItem(0).id] = 1; return { choix: Object.keys(seen), objets: Object.keys(its) }; },
    evo: function (id, e) { p = me; me.evo = me.evo || {}; me.evo[id] = e || "a"; return techName(me, id); },
    tfus: function (id, rec) { me.tfus = me.tfus || {}; me.tfus[id] = rec || 1; me.tdef = {}; return techName(me, id); },
    combo: function (id) { p = me; v2Apply({ type: "cb", id: id }); calc(me); return Object.keys(me.weapons); },
    entries: function () { return techEntries(me).map(function (e) { return e.key + ":" + e.def.type + ":" + Math.round(V(e.def, "dmg", e.l) || 0); }); },
    arme: function (id) { pickArme(id); return me.weapons; },
    choicesNow: function (n) { p = me; return v2Choices(n || 4).map(function (c) { var v = v2Card(c); return c.type + ":" + (v ? v.name : c.id); }); },
    give: function (type, id, lvl) { p = me; if (type === "w") me.weapons[id] = lvl || 5; else me.passives[id] = lvl || 5; calc(me); refreshCounts(); return readyFusions(); },
    twin: function () { var t = me.twinRef; return t ? { x: Math.round(t.x), y: Math.round(t.y), hp: Math.round(t.hp), max: Math.round(t.maxHp), down: t.down, might: Math.round(t.might * 100) / 100, meMight: Math.round(me.might * 100) / 100, w: t.weapons === me.weapons, meDown: me.down, n: players.length } : null; },
    downMe: function (who) { var t = who === "twin" ? me.twinRef : me; t.hp = -1; t.inv = 0; },
    ids: function () { return players.map(function (o) { return [o.id, o.name, Math.round(o.x), Math.round(o.y), o.twin ? "J" : ""]; }); },
    shrines: function (rad) { return shrinesNear(me.x, me.y, rad || 900).map(function (s) { return [s.id, s.k, Math.round(s.x), Math.round(s.y), r.sh[s.id] ? r.sh[s.id].used : 0]; }); },
    portal: function (step) {
      if (step === "spawn") { r.stageT0 = r.time - PORTAL.at - 1; portalTick(0); }
      if (step === "go" && r.portal) { me.x = r.portal.x; me.y = r.portal.y; }
      if (step === "kill" && r.portal && r.portal.boss) { r.portal.boss.hp = 0; kill(r.portal.boss); }
      return r.portal ? { x: r.portal.x, y: r.portal.y, st: r.portal.st, p: r.portal.p, stage: r.stage || 0, map: MAP.id, boss: r.portal.boss ? r.portal.boss.title : null } : { stage: r.stage || 0, map: MAP.id, stageT: stageTime() };
    },
    god: function (on) { me.god = on !== false; return me.god; },
    ex: function () { if (!r || !r.ex) return null; return { floor: r.ex.floor, t: Math.round(exT() * 10) / 10, ring: ringOf(me.x, me.y), corr: Math.round(corrR()), bag: r.bag.map(entryName), secure: r.secure.map(entryName), keys: r.ex.keys, passages: r.ex.passages.map(function (q) { return q.region + ":" + q.st; }), closed: r.ex.st.filter(function (q) { return q.closedX; }).map(function (q) { return q.k; }), night: r.ex.night, x: Math.round(me.x), y: Math.round(me.y), state: state, tier: tierN() }; },
    exGo: function (k, i) { var list = r.ex.st.concat(r.ex.passages).filter(function (q) { return q.k === k; }), q = list[i || 0]; if (!q) return null; me.x = q.x; me.y = q.y + 4; return { x: q.x, y: q.y }; },
    exTime: function (min) { r.stageT0 = r.time - min * 60 * exF(); return exT(); },
    exFloor: function (n) { if (!r || !isExpe()) return null; startExpe(n); return r.ex.floor; },
    exKill: function () { enemies.forEach(function (e) { if (!e.d.prop && !e.dead) { e.hp = 0; p = me; kill(e); } }); },
    res: function (n) { eqS(); Object.keys(D.RES).forEach(function (k) { S.res[k] = (S.res[k] || 0) + (n || 20); }); save(); return S.res; },
    setChar: function (id) { S.char = id; S.owned = S.owned || {}; S.owned[id] = true; save(); return S.char; },
    gear: function (t, roll) { var q = genPiece(2, t); if (roll !== undefined) q.roll = roll; addPiece(q); save(); return q; },
    wear: function (id, slot) { wornBy(S.char)[slot] = id; save(); },
    talent: function (tier, ab) { var ps = postureOf(S.char, (S.posture || {})[S.char]).id; eqS(); S.clvl[S.char] = 5000; S.tal[S.char] = S.tal[S.char] || {}; S.tal[S.char][ps] = S.tal[S.char][ps] || {}; S.tal[S.char][ps][tier] = ab; save(); },
    mast: function (aid, x) { eqS(); S.mast[aid] = x; save(); },
    ultNow: function () { me.ultG = 1; me.ultK = r.kills; p = me; ultTick(me); return me.ultFx && me.ultFx.length; },
    ept: function (el, n) { me.epts0 = me.epts0 || { terre: 0, feu: 0, eau: 0, air: 0 }; me.epts0[el] += n; calc(me); return me.epts; },
    load: function () { return { gear: (me.gear || []).map(function (g) { return g.g.name + ":" + Math.round(g.v); }), epts: me.epts, ring: me.ring, amu: me.amu, tal: me.tal, anchorTh: me.anchorTh, volteBase: me.volteBase, ult: me.ultG }; },
    over: function () { gameOver(true); return document.querySelector(".v2-run") ? document.querySelector(".v2-run").innerText : null; },
    mega: function (step) {
      if (step === "spawn") { if (!r.portal) { r.stageT0 = r.time - PORTAL.at - 1; portalTick(0); } wakeMega(r.portal); }
      if (step === "hp" && r.mega) r.mega.boss.hp = r.mega.boss.maxHp * arguments[1];
      if (step === "kill" && r.mega) { p = me; r.mega.boss.hp = 0; kill(r.mega.boss); }
      return r.mega ? { hp: Math.round(r.mega.boss.hp), max: Math.round(r.mega.boss.maxHp), ph: r.mega.boss.phase3, x: Math.round(r.mega.boss.x), anchored: me.anchored, me: Math.round(me.hp) } : { done: true, won: !!(S.mega && S.mega.terre), portal: r.portal && r.portal.st };
    },
    roles: function () { var c = {}; enemies.forEach(function (e) { var k = (e.d.role || "?") + (e.elem ? "/" + e.elem : ""); c[k] = (c[k] || 0) + 1; }); return c; },
    react: function () { return r.reactions || 0; },
    rage: function (min) { r.stageT0 = r.time - RAGE.start - min * 60; return { rage: rageMin(), dmg: rageDmg(), spd: rageSpd() }; },
    tier: function () { return { pos: Math.round(tierPos() * 100) / 100, n: tierN(), name: tierName(tierN()), rage: rageMin(), madness: r.madness, devil: r.devil, gold: Math.floor(r.gold), maxHp: Math.round(me.maxHp) }; },
    gold: function (n) { r.gold += n; },
    quests: function () { return S.quests; },
    dgHash: function () { return r && r.dg ? dgHash(r.dg) : 0; },
    nextFloor: function () { nextFloor(); },
    goStairs: function () { if (r && r.dg && r.dg.stairs) { me.x = r.dg.stairs.x; me.y = r.dg.stairs.y; return true; } return false; },
    killRoom: function () { enemies.forEach(function (e) { if (!e.d.prop && e.room !== undefined) { e.hp = 0; kill(e); } }); },
    endRound: function () { if (r && isArena() && r.phase === "fight") r.roundT = r.roundLen; },
    choose: function (i, on) { if (players[i]) players[i].choosing = on !== false; },
    place: function (i, x, y) { if (players[i]) { players[i].x = players[i].tx = x; players[i].y = players[i].ty = y; } },
    pl: function (i) { var o = players[i]; return o ? { id: o.id, x: Math.round(o.x), y: Math.round(o.y), choosing: o.choosing, down: o.down, me: o === me } : null; },
    near: function (i, rad) { var pl = players[i]; return pl ? enemies.filter(function (e) { return !e.dead && !e.d.prop && Math.hypot(e.x - pl.x, e.y - pl.y) < rad; }).length : 0; },
    hurtAll: function (n) { players.forEach(function (pl) { pl.hp = Math.min(pl.maxHp, pl.hp - (n || 1000)); }); },
    hurtOne: function (i, n) { if (players[i]) players[i].hp -= n || 1000; },
    links: function () { var o = {}; Object.keys(Net.peers).forEach(function (k) { o[k] = Net.peers[k].open ? "open" : (Net.peers[k].failed ? "failed" : "pending"); }); return o; },
    net: function () { return { direct: allDirect(), on: Net.on, role: Net.role, code: Net.code, status: Net.status, roster: Net.roster.length, started: Net.started, players: players.length, snap: !!Net.cur }; },
    spawn: function (t) { if (p) spawn(t, Math.random() * TAU, 60); },
    projs: function () { return projs.length; },
    cps: function () { return Net.on && Net.role === 'guest' ? (Net.cps || []).length : allComps().length; },
    v2: function () { return { posture: me.posture, mstate: me.mstate, anchored: me.anchored, hooked: !!me.hooked, volteCd: Math.round((me.volteCd || 0) * 10) / 10, voltes: r.voltes, crew: me.crew ? me.crew.length : null, recruits: r.recruits, vx: Math.round(me.vx || 0), cadX: me.cadX, dmgX: me.dmgX, weapons: me.weapons, hp: Math.round(me.hp) }; },
    dmg: function (n) { damagePlayer(n || 20, me); return { hp: Math.round(me.hp), crew: me.crew ? me.crew.length : null }; },
    propHere: function (dx) { var e = spawnProp(0); e.x = me.x + (dx || 12); e.y = me.y; return true; },
    setMap: function (m) { S.map = m; S.char = "noisette"; S.ach.survie_3 = S.ach.boss_1 = S.ach.survie_10 = 1; D.MAPS.concat(D.DUNGEONS).forEach(function (x) { if (x.unlock) S.ach[x.unlock] = 1; }); save(); },
    unlockAll: function () { S.quests = S.quests || {}; D.QUESTS.forEach(function (q) { S.quests[q.id] = 1; }); save(); },
    cauch: function (mapId, n) { S.cauch = S.cauch || {}; S.cauch[mapId] = n; S.cn = n; save(); },
    me2: function () { return { char: me.char.id, posture: me.posture, hp: Math.round(me.hp), sap: me.sap, size: me.size, debt: me.debt, trees: me.trees && me.trees.length, invis: me.invis, dance: me.dance, field: me.field, twin: !!me.twinRef, cauch: r.cauch, tier: tierN() }; },
    unlockPostures: function () { S.quests = S.quests || {}; ["p_noisette2", "p_noisette3", "p_capitaine2", "p_capitaine3", "p_planeur2", "p_planeur3"].forEach(function (q) { S.quests[q] = 1; }); save(); },
    state: function () { return { state: state, screen: screen, level: r && r.level, hp: p && p.hp, kills: r && r.kills, weapons: p && p.weapons, passives: p && p.passives, enemies: enemies && enemies.length, x: me && me.x, y: me && me.y }; },
  };

  /* =====================================================================
     Party : versus multi-jeux (js/party.js, modes dans js/party-modes.js)
     - modes « chacun sa partie » : on lance directement une partie solo
     - modes « room » : salon coop en ligne créé / rejoint tout seul
     ===================================================================== */
  function partyMetric() {
    var o = party.ctx.opts;
    if (o.metric === "kills") return r.kills;
    if (o.metric === "score") return Math.round(score());
    return Math.floor(window.Party.elapsed());
  }
  function partyRestore() {
    if (!party || !party.keep) return;
    Object.keys(party.keep).forEach(function (k) { S[k] = party.keep[k]; });
    party.keep = null; save();
  }
  function partyEnded(quit) {
    if (!party || party.ended) return;
    party.ended = true;
    // quit : fin imposée (chrono, hôte qui arrête la manche) → pas une élimination
    window.Party.over({ score: partyMetric(), dead: !r.won && !quit, done: !!r.won });
    partyRestore();
  }
  var PT = null;   // 2.0 bêta : pas encore dans les party
  if (PT && PT.mode.game !== "survivor") PT = null;
  if (PT) {
    window.Party.register("survivor", {
      start: function (ctx) {
        party = { ctx: ctx, ended: false, keep: null };
        var o = ctx.opts;
        if (ctx.mode.room) {
          party.keep = { mode: S.mode, map: S.map, diff: S.diff, dungeon: S.dungeon, name: S.name };
          S.mode = o.mode || "survie"; S.map = o.map || "clairiere"; S.diff = "normal"; S.dungeon = o.dungeon || "terriers"; S.name = ctx.name;
          Net.joinTs = Date.now(); netJoin(ctx.room, ctx.roomHost); go("lobby");
          if (ctx.roomHost) {
            var t0 = Date.now(), iv = setInterval(function () {
              if (!party || state === "play" || state === "over") { clearInterval(iv); return; }
              var want = ctx.roomIds.filter(ctx.present).length, t = Date.now() - t0;
              if ((Net.status === "SUBSCRIBED" && (Net.roster.length >= want || (t > 15000 && Net.roster.length >= 2))) || t > 30000) { clearInterval(iv); start(); }
            }, 500);
          }
        } else {
          sanitize();
          reset(null, o.map || "clairiere", "normal", o.mode || "survie", ctx.seed, o.dungeon || "terriers");
          beginPlay();
        }
      },
      stop: function (why) {
        if (state !== "over" && r && !r.ended && (state !== "menu" || Net.started)) gameOver(true, why === "time" ? "Temps écoulé !" : "Fin de la manche !");
        if (party && !party.ended) { party.ended = true; partyRestore(); return { score: r ? partyMetric() : 0 }; }
        return null;
      },
    });
    setInterval(function () {
      if (!party || party.ended || !r || r.ended || (state !== "play" && state !== "levelup" && state !== "pause")) return;
      window.Party.score(partyMetric());
      if (party.ctx.opts.noRevive && me && me.down && (!me.twinRef || me.twinRef.down)) {
        party.ended = true;
        window.Party.over({ score: partyMetric(), dead: true });
        banner("Éliminé ! Tu peux regarder la fin de la manche.");
      }
    }, 500);
  }

  checkAchievements(null);
  go("menu");
  if (PT) showCard('<h2>Manche de party</h2><p>' + esc(PT.mode.name) + ' : la partie démarre toute seule dans un instant.</p>', "party");
  function joinFromHash() {
    if (/#(coop=|party)/.test(location.hash || "")) { location.replace("jeu-classique.html" + location.hash); return; }   // la coop reste sur la version 1
    var m = /#coop=([A-Za-z]{4})/.exec(location.hash || "");
    if (!m || (Net.on && Net.code === m[1].toUpperCase())) return;
    if (state === "play") return;
    Net.pendingCode = m[1].toUpperCase();
    if (S.name && S.name.length >= 2) { Net.joinTs = Date.now(); netJoin(Net.pendingCode, false); go("lobby"); }
    else { Net.err = "Choisis ton pseudo puis appuie sur Rejoindre."; go("coop"); }
    var rc = stage.getBoundingClientRect();
    if (rc.top > window.innerHeight * 0.5) stage.scrollIntoView({ block: "start" });
  }
  joinFromHash();
  window.addEventListener("hashchange", joinFromHash);
  last = performance.now();
  requestAnimationFrame(loop);
})();
