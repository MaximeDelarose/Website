/* Ashbound Tower — prototype navigateur : arène + 4 héros jouables (Noctis, Églantyne, Phelto, Épéiste).
   Moteur : rendu 3/4 (sol écrasé, sprites debout triés), ennemis sur chemin, tourelles par héros, UI minimale, commandes façon Mobile Legends.
   Les kits des héros sont dans js/ashbound-heroes.js. */
(function () {
  "use strict";
  var cv = document.getElementById("ash");
  if (!cv) return;
  var ctx = cv.getContext("2d");
  var RS = 1, CW = 1152, SL = 0, SR = 0, W = 1152, H = 720, OX = 0, PPU = 32, SY = Math.sin(55 * Math.PI / 180), TOP = 0, GW = 36, GH = 20, MAPW = 1152, MAPH = GH * PPU * SY;
  var params = new URLSearchParams(location.search);
  var SPEED = Math.min(30, Math.max(1, parseFloat(params.get("speed")) || 1));
  var BASE = "ashbound/";
  var wrap = document.getElementById("ashwrap");
  var PINK = "#ff4fa8", PINKL = "#ff9bd2";

  // ---------- données (valeurs provisoires, identiques au projet Unity pour les ennemis) ----------
  var ENEMY = {
    orb:   { name: "Spectre corrompu", kind: "std", hp: 55, speed: 2.3, dmg: 4, gold: 4, spr: "enemy_orb", fps: 4, scale: 1, shadow: 1.2, bar: 1.0 },
    scout: { name: "Fureteur d'ombre", kind: "std", hp: 30, speed: 4.2, dmg: 3, gold: 3, spr: "enemy_scout", fps: 8, scale: 1, shadow: 1.5, bar: 1.0 },
    elite: { name: "Gardien de cendre", kind: "elite", hp: 240, speed: 1.5, dmg: 15, gold: 30, spr: "enemy_elite", fps: 2.5, scale: .9, shadow: 2.2, bar: 1.6, always: true },
    mini:  { name: "Broyeur de ruines", kind: "mini", hp: 1000, speed: 1.2, dmg: 35, gold: 90, spr: "enemy_miniboss", fps: 2, scale: .85, shadow: 3.4, bar: 2.4, always: true },
    boss:  { name: "Seigneur de Cendre", kind: "boss", hp: 3600, speed: .9, dmg: 100, gold: 250, spr: "enemy_boss", fps: 2, scale: .8, shadow: 4.2, bar: 3.2, always: true }
  };
  var BASE_STATS = { damage: 8, rate: 1.6, range: 5.5, zaps: 1, jumps: 0, radius: 2.8, falloff: .7, splash: 0, splashDmg: 0, slowF: 1, slowT: 0, stunEvery: 0, aura: 0 };
  // 1 famille de tourelles par héros (3 améliorations chacune ; valeurs provisoires)
  var TOWERS = {
    orb: { name: "Orbe foudroyant", cost: 50, col: "#7ff0ff", spr: "tower_orb_", my: 48, tag: "Éclairs précis",
      base: {}, ups: [
        { name: "Décharges multiples", desc: "3 éclairs par salve, sur des cibles différentes.", cost: 60, m: { zaps: 2, dmg: .85 } },
        { name: "Éclairs en chaîne", desc: "Chaque éclair rebondit sur 2 ennemis proches.", cost: 110, m: { jumps: 2, radius: .5 } },
        { name: "Surtension", desc: "Dégâts, cadence, portée et rebonds accrus.", cost: 180, m: { dmg: 1.5, rate: 1.25, range: 1, jumps: 2 } }] },
    faille: { name: "Totem d'ombre", cost: 50, col: "#c48bff", spr: "tower_faille_", my: 56, tag: "Éclats spectraux",
      base: { damage: 10, rate: 1.2, range: 5.8, radius: 2.4 }, ups: [
        { name: "Double projectile", desc: "2 éclats par salve.", cost: 60, m: { zaps: 1 } },
        { name: "Explosion en croix", desc: "L'impact explose autour de la cible.", cost: 110, m: { splash: 1.6, splashDmg: .6 } },
        { name: "Réactions en chaîne", desc: "Les éclats rebondissent sur 2 ennemis.", cost: 180, m: { jumps: 2, dmg: 1.2 } }] },
    ronce: { name: "Piège de ronce", cost: 50, col: "#b6f04a", spr: "tower_ronce_", my: 36, tag: "Ralentit",
      base: { damage: 11, rate: 2.3, range: 5.1, slowF: .75, slowT: 1.2 }, ups: [
        { name: "Lianes épaisses", desc: "Ralentissement 40 %.", cost: 60, m: { slowF: .6 } },
        { name: "Griffes terrestres", desc: "Dégâts accrus, 2 épines par salve.", cost: 110, m: { dmg: 1.6, zaps: 1 } },
        { name: "Entrelacs de fer", desc: "Une salve sur 4 immobilise 1,2 s.", cost: 180, m: { stunEvery: 4, slowF: .5 } }] },
    ampli: { name: "Totem mélodique", cost: 60, col: "#ff9bd2", spr: "tower_ampli_", my: 40, tag: "Aura de cadence",
      base: { damage: 9, rate: 2.4, range: 5.3, aura: .15 }, ups: [
        { name: "Basses profondes", desc: "Aura de cadence +25 %, dégâts accrus.", cost: 60, m: { aura: .25, dmg: 1.3 } },
        { name: "Écho", desc: "2 notes par salve.", cost: 110, m: { zaps: 1, dmg: 1.2 } },
        { name: "Concert", desc: "Aura +45 %, dégâts accrus.", cost: 180, m: { aura: .45, dmg: 1.6, range: .5 } }] }
  };
  var START_GOLD = 150, HEART_MAX = 100;
  var WAVES = [
    ["Vague 1 — Premiers murmures", [["orb", 5, .5, 0]]],
    ["Vague 2 — La corruption s'étend", [["orb", 7, .45, 0]]],
    ["Vague 3 — Des ombres rapides", [["orb", 5, .5, 0], ["scout", 4, .4, 1.5]]],
    ["Vague 4 — Le flot grossit", [["orb", 9, .4, 0], ["scout", 5, .35, 2]]],
    ["Vague 5 — Le Broyeur de ruines approche !", [["mini", 1, 1, 0], ["orb", 8, .45, 2]]],
    ["Vague 6 — Meute d'ombres", [["orb", 8, .4, 0], ["scout", 8, .3, 1.5]]],
    ["Vague 7 — Gardiens de cendre", [["elite", 2, 2, 0], ["orb", 10, .4, 1]]],
    ["Vague 8 — Tempête d'ombres", [["scout", 12, .25, 0], ["orb", 8, .4, 2]]],
    ["Vague 9 — Bataillon de cendre", [["elite", 3, 1.8, 0], ["orb", 12, .35, 1]]],
    ["Vague 10 — LE SEIGNEUR DE CENDRE !", [["boss", 1, 1, 0], ["elite", 3, 2, 3], ["orb", 10, .4, 2]]]
  ];
  var TRICKLE = [["orb", 2, 270, 6, 1, 3, .45], ["scout", 60, 270, 11, 1, 2, .35]];
  var HERO_ORDER = ["noctis", "eglantyne", "phelto", "epeiste"], HCOL = { noctis: "#b88cff", eglantyne: "#8dffa8", phelto: "#ff7ac8", epeiste: "#8ff0ff" };
  var KITS = null;

  // ---------- ressources ----------
  var imgs = {}, snd = {}, L = null, loaded = false, muted = false;
  var IMGS = ["ground", "fx_shadow", "heart_0", "heart_1", "doll", "gate", "sparkle", "pine_s", "pine_m", "pine_d", "ruin_a", "ruin_b", "rock", "rock_small", "crystal"];
  Object.keys(ENEMY).forEach(function (k) { IMGS.push(ENEMY[k].spr + "_0", ENEMY[k].spr + "_1"); });
  Object.keys(TOWERS).forEach(function (k) { for (var i = 0; i < 4; i++) IMGS.push(TOWERS[k].spr + i); });
  ["epeiste", "eglantyne", "phelto", "noctis"].forEach(function (h) { ["idle0", "idle1", "move0", "move1", "atk", "cast"].forEach(function (n) { IMGS.push("hero_" + h + "_" + n); }); IMGS.push("icon_" + h, "big_" + h); });
  IMGS.push("fx_phelto_notes", "fx_eglantyne_seed", "skill_epeiste_s1", "skill_epeiste_s2", "skill_epeiste_ult", "skill_epeiste_passive");
  var SNDS = ["zap", "hit", "death", "build", "upgrade", "heart_hit", "win", "lose", "click", "error", "wave", "boss", "ambient"];
  function boot() {
    var pending = IMGS.length + 1;
    function done() { if (--pending === 0) { loaded = true; init(); } }
    IMGS.forEach(function (n) { var im = new Image(); im.onload = done; im.onerror = done; im.src = BASE + "img/" + n + ".png"; imgs[n] = im; });
    fetch(BASE + "layout.json").then(function (r) { return r.json(); }).then(function (j) { L = j; done(); }).catch(function () { L = null; done(); });
    SNDS.forEach(function (n) { var a = new Audio(BASE + "snd/" + n + ".wav"); a.preload = "auto"; snd[n] = a; });
  }
  var lastPlay = {};
  function play(n, vol, rate) {
    if (muted || !snd[n]) return;
    var now = performance.now(); if (lastPlay[n] && now - lastPlay[n] < 45) return; lastPlay[n] = now;
    try { var a = snd[n].cloneNode(); a.volume = Math.min(1, (vol || 1) * .7); a.playbackRate = Math.max(.25, Math.min(4, (rate || 1) * (1 + (Math.random() - .5) * .12))); a.play().catch(function () {}); } catch (e) {}
  }
  var ambient = null;
  function startAmbient() { if (ambient || !snd.ambient) return; ambient = snd.ambient; ambient.loop = true; ambient.volume = muted ? 0 : .2; ambient.play().catch(function () { ambient = null; }); }

  // ---------- état ----------
  var path, cum, LEN, slots, decor, G, hover = null, mouse = { x: -1, y: -1 }, buttons = [], ctl = [], time = 0;
  var keys = {}, ptrs = {}, joy = { on: false, id: -1, bx: 0, by: 0, dx: 0, dy: 0 }, touchUI = false, full = false, mouseIn = false, aimSt = null;
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function init() {
    if (!L) { ctx.fillStyle = "#09060f"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#fff"; ctx.font = "20px sans-serif"; ctx.fillText("Impossible de charger le jeu.", 40, 60); return; }
    path = L.path.map(function (p) { return [p.x, p.z]; });
    cum = [0]; for (var i = 1; i < path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
    LEN = cum[cum.length - 1];
    slots = L.slots.map(function (s) { return { x: s.x, z: s.z, tower: null }; });
    decor = L.decor;
    KITS = window.AshHeroes(API);
    touchUI = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    var app = (window.navigator && window.navigator.standalone === true) || (window.matchMedia && (window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches)) || params.get("app");
    reset(false); resize(); requestAnimationFrame(frame);
    if (app) { touchUI = touchUI || !!params.get("app"); setFull(true); }
    try { if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {}); } catch (e) {}
    var q = params.get("hero"); if (q && KITS[q]) pickHero(q);
  }
  function newHero(id) {
    var kit = KITS[id], h = { id: id, kit: kit, x: L.heart.x - 5, z: L.heart.z + 3.5, face: Math.PI, moving: false, atkCd: 0, swing: 0, cd: { s1: 0, s2: 0, ult: 0 }, dash: null, lunge: null, speedMul: 1, k: {} };
    kit.init(h); return h;
  }
  function reset(keepHero) {
    var ev = [], r = mulberry(1234), t0 = 10, dt = 27;
    WAVES.forEach(function (w, i) { w[1].forEach(function (g) { for (var k = 0; k < g[1]; k++) ev.push({ t: t0 + dt * i + g[3] + k * g[2], e: g[0], lat: lat(r, g[0]) }); }); });
    TRICKLE.forEach(function (tr) { for (var t = tr[1]; t <= tr[2]; t += tr[3]) { var n = tr[4] + Math.floor(r() * (tr[5] - tr[4] + 1)); for (var k = 0; k < n; k++) ev.push({ t: t + k * tr[6], e: tr[0], lat: lat(r, tr[0]) }); } });
    ev.sort(function (a, b) { return a.t - b.t; });
    slots.forEach(function (s) { s.tower = null; });
    var hid = keepHero && G && G.hero ? G.hero.id : null;
    G = { state: "select", paused: false, t: 0, events: ev, next: 0, wave: 0, gold: START_GOLD, heart: HEART_MAX, enemies: [], towers: [], parts: [], bolts: [], fx: [], pending: [], projs: [], actors: [], buffs: [], sortedNow: [],
      toast: "", toastT: 0, toastC: "#fff", build: false, sel: null, shake: 0, flashHeart: 0, kills: 0, anim: 0, hero: null, tint: 0, tintT: 0 };
    hover = null; ptrs = {}; joy.on = false; aimSt = null;
    if (hid) { G.hero = newHero(hid); G.state = "prep"; }
  }
  function lat(r, e) { return ENEMY[e].kind === "std" ? (r() * 2 - 1) * .45 : 0; }
  function pos(d) {
    d = Math.max(0, Math.min(LEN, d));
    var lo = 1, hi = path.length - 1;
    while (lo < hi) { var m = (lo + hi) >> 1; if (cum[m] < d) lo = m + 1; else hi = m; }
    var seg = cum[lo] - cum[lo - 1] || 1, t = (d - cum[lo - 1]) / seg, a = path[lo - 1], b = path[lo];
    var dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    return { x: a[0] + dx * t, z: a[1] + dz * t, dx: dx / l, dz: dz / l };
  }
  function toast(s, c) { G.toast = s; G.toastC = c || "#f2e8d0"; G.toastT = 2.2; }
  function ep(e) { var p = pos(e.d); return { x: p.x - p.dz * e.lat + e.ox, z: p.z + p.dx * e.lat + e.oz, dx: p.dx }; }
  function sh(name) { var im = imgs[name]; return im && im.naturalHeight ? im.naturalHeight : 48; }
  function clampX(x) { return Math.max(-17.4, Math.min(17.4, x)); }
  function clampZ(z) { return Math.max(-9.4, Math.min(9.4, z)); }
  function tstats(def, tier) {
    var s = {}, k; for (k in BASE_STATS) s[k] = BASE_STATS[k]; for (k in def.base) s[k] = def.base[k];
    for (var i = 0; i < tier; i++) {
      var m = def.ups[i].m; s.damage *= m.dmg || 1; s.rate *= m.rate || 1; s.range += m.range || 0; s.zaps += m.zaps || 0; s.jumps += m.jumps || 0; s.radius += m.radius || 0;
      if (m.splash != null) { s.splash = m.splash; s.splashDmg = m.splashDmg; } if (m.slowF != null) s.slowF = m.slowF; if (m.stunEvery != null) s.stunEvery = m.stunEvery; if (m.aura != null) s.aura = m.aura;
    }
    return s;
  }

  // ---------- projection / taille d'écran ----------
  function sx(x) { return OX + (x + GW / 2) * PPU; }
  function sy(z) { return TOP + (GH / 2 - z) * PPU * SY; }
  function toWorld(px, py) { return { x: (px - OX) / PPU - GW / 2, z: GH / 2 - (py - TOP) / (PPU * SY) }; }
  var probe = null;
  function safeInsets() {
    try {
      if (!probe) { probe = document.createElement("div"); probe.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)"; document.body.appendChild(probe); }
      var cs = getComputedStyle(probe); return { l: parseFloat(cs.paddingLeft) || 0, r: parseFloat(cs.paddingRight) || 0 };
    } catch (e) { return { l: 0, r: 0 }; }
  }
  // largeur logique = ratio réel de l'écran ; zones sûres (encoche) retirées de la zone de jeu ; résolution interne adaptée à l'écran
  function resize() {
    var r0 = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    CW = 1152; SL = SR = 0;
    if (full) {
      var asp = r0.width > 10 && r0.height > 10 ? r0.width / r0.height : window.innerWidth / Math.max(1, window.innerHeight);
      CW = Math.max(960, Math.min(1700, Math.round(H * asp)));
      var sc0 = Math.min(r0.width / CW, r0.height / H) || 1, ins = safeInsets(); SL = Math.round(ins.l / sc0); SR = Math.round(ins.r / sc0);
    }
    W = CW - SL - SR; OX = Math.round((W - MAPW) / 2); TOP = Math.round((H - MAPH) / 2);
    RS = Math.max(1, Math.min(2, Math.ceil((r0.width || CW) * dpr / CW - 0.05)));
    if (cv.width !== CW * RS || cv.height !== H * RS) { cv.width = CW * RS; cv.height = H * RS; }
  }
  var nativeFS = false;
  function setFull(on) {
    if (full === on || !wrap) return; full = on;
    if (on) {
      wrap.style.cssText = "position:fixed;inset:0;z-index:99999;background:#000;padding:0;border:0;border-radius:0;display:flex;align-items:center;justify-content:center";
      cv.style.cssText = "display:block;width:100%;height:100%;object-fit:contain;image-rendering:pixelated;touch-action:none;user-select:none;-webkit-user-select:none";
      document.body.style.overflow = "hidden";
      try { var el = document.documentElement; if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().then(function () { nativeFS = true; if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(function () {}); }).catch(function () {}); } catch (e) {}
    } else {
      wrap.style.cssText = "padding:8px;background:#09060f";
      cv.style.cssText = "display:block;width:100%;height:auto;image-rendering:pixelated;touch-action:none;border-radius:8px";
      document.body.style.overflow = "";
      try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); } catch (e) {}
    }
    resize();
  }
  function relayout() { if (loaded) resize(); }
  window.addEventListener("resize", relayout); window.addEventListener("orientationchange", function () { [50, 300, 800].forEach(function (d) { setTimeout(relayout, d); }); });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", relayout);
  if (window.ResizeObserver && wrap) new ResizeObserver(relayout).observe(wrap);
  document.addEventListener("fullscreenchange", function () { if (!document.fullscreenElement && full && nativeFS) { nativeFS = false; setFull(false); } [60, 300, 800].forEach(function (d) { setTimeout(relayout, d); }); });
  function toggleFull() { setFull(!full); }

  // ---------- jeu : ennemis, dégâts ----------
  function startSeq() { if (G.state !== "prep") return; G.state = "play"; G.t = 0; play("wave", .8); startAmbient(); }
  function endState(s) { if (G.state !== "play") return; G.state = s; play(s === "win" ? "win" : "lose"); }
  function burst(x, y, col, n, spd, life, size) {
    for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, v = spd * (.3 + Math.random() * .7); G.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * .4, life: life * (.6 + Math.random() * .6), max: life, s: size * (.6 + Math.random() * .6), c: col }); }
  }
  function spawn(ev) { var d = ENEMY[ev.e]; G.enemies.push({ k: ev.e, def: d, d: 0, hp: d.hp, lat: ev.lat, flash: 0, age: 0, dead: false, ph: Math.random() * 4, ox: 0, oz: 0, stun: 0, slowF: 1, slowT: 0, poison: null, barT: 99 }); if (ev.e === "boss") play("boss"); }
  function aimPt(e) { var p = ep(e); return { x: sx(p.x), y: sy(p.z) - sh(e.def.spr + "_0") * e.def.scale * .5 }; }
  function dmgEnemy(e, a, silent) {
    if (e.dead || a <= 0) return;
    e.hp -= a; e.flash = .1; e.barT = 0; e.spark = .16; e.sx = (Math.random() - .5) * 14; e.sy = (Math.random() - .5) * 12; if (!silent) play("hit", .4);
    var p = aimPt(e); burst(p.x, p.y, PINKL, 2, 80, .25, 3);
    if (e.hp <= 0) {
      e.dead = true; G.gold += e.def.gold; G.kills++; play("death", .6);
      burst(p.x, p.y, "#b278ff", 10 + (e.def.kind === "boss" ? 40 : e.def.kind === "mini" ? 24 : e.def.kind === "elite" ? 12 : 0), 140, .7, 5);
      if (G.hero && G.hero.kit.onKill) G.hero.kit.onKill(G.hero, e);
    }
  }
  function inRadius(x, z, r) { var out = []; G.enemies.forEach(function (e) { if (e.dead) return; var p = ep(e); if (Math.hypot(p.x - x, p.z - z) <= r) out.push(e); }); return out; }
  function nearestEnemy(x, z, r, ex) {
    var best = null, bd = r;
    G.enemies.forEach(function (e) { if (e.dead || (ex && ex.indexOf(e) >= 0)) return; var p = ep(e), d = Math.hypot(p.x - x, p.z - z); if (d <= bd) { bd = d; best = e; } });
    return best;
  }
  function bolt(a, b, big) { G.bolts.push({ a: a, b: b, life: big ? .3 : .14, pts: jag(a, b, big ? 30 : 18), flick: false, big: !!big }); if (!big) burst(b.x, b.y, "#9ff4ff", 3, 100, .25, 3); }
  function jag(a, b, amp) {
    var pts = [a], n = 7, dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    for (var i = 1; i < n; i++) { var t = i / n, o = (Math.random() - .5) * amp; pts.push({ x: a.x + dx * t + nx * o, y: a.y + dy * t + ny * o }); }
    pts.push(b); return pts;
  }
  function muzzle(t) { return { x: sx(t.s.x), y: sy(t.s.z) - TOWERS[t.type].my }; }

  // ---------- tourelles ----------
  function inRangeT(t, st) {
    var out = []; G.enemies.forEach(function (e) { if (e.dead) return; var p = ep(e); if (Math.hypot(p.x - t.s.x, p.z - t.s.z) <= st.range) out.push(e); });
    out.sort(function (a, b) { return b.d - a.d; }); return out;
  }
  function fire(t) {
    var def = TOWERS[t.type], st = t.st, tg = inRangeT(t, st);
    if (!tg.length) return false;
    var m = muzzle(t), distinct = Math.min(st.zaps, tg.length); t.salvo++;
    for (var z = 0; z < st.zaps; z++) {
      var cur = tg[z % distinct]; if (cur.dead) continue;
      var hit = [], dmg = st.damage, origin = m;
      for (var j = 0; j <= st.jumps; j++) {
        hit.push(cur); var a = aimPt(cur), p = ep(cur);
        G.bolts.push({ a: origin, b: a, life: .14, pts: jag(origin, a, 16), flick: false, col: def.col });
        dmgEnemy(cur, dmg, true);
        if (st.slowF < 1) { cur.slowF = Math.min(cur.slowF, st.slowF); cur.slowT = Math.max(cur.slowT, st.slowT); }
        if (st.stunEvery && t.salvo % st.stunEvery === 0) cur.stun = Math.max(cur.stun, 1.2);
        if (st.splash) inRadius(p.x, p.z, st.splash).forEach(function (o) { if (o !== cur) dmgEnemy(o, dmg * st.splashDmg, true); });
        if (j === st.jumps) break;
        var nx = nearestEnemy(p.x, p.z, st.radius, hit); if (!nx) break;
        dmg *= st.falloff; origin = a; cur = nx;
      }
    }
    t.punch = .6; play(t.type === "ampli" ? "click" : "zap", .4, t.type === "ampli" ? 1.6 : 1); return true;
  }

  // ---------- héros : entrées, visée, attaque, compétences ----------
  function moveVec() {
    var x = 0, z = 0;
    if (keys.KeyW || keys.KeyZ || keys.ArrowUp) z += 1;
    if (keys.KeyS || keys.ArrowDown) z -= 1;
    if (keys.KeyA || keys.KeyQ || keys.ArrowLeft) x -= 1;
    if (keys.KeyD || keys.ArrowRight) x += 1;
    if (joy.on) { x += joy.dx; z -= joy.dy; }
    var l = Math.hypot(x, z); if (l > 1) { x /= l; z /= l; }
    return { x: x, z: z };
  }
  function mouseWorld() { return toWorld(mouse.x, mouse.y); }
  function skillRange(key) { var k = G.hero.kit; if (key === "atk") return k.atkRange || 9; var a = k.skills[key].aim; return a.range || a.len || a.r || 5; }
  // retourne {a, d} : angle monde et distance visée (souris, glisser tactile, ou ciblage auto)
  function aimFor(key, touchAim) {
    var h = G.hero, range = skillRange(key);
    if (touchAim) { var wx = touchAim.dx / PPU, wz = -touchAim.dy / (PPU * SY); return { a: Math.atan2(wz, wx), d: Math.max(1, Math.min(range, touchAim.len / 100 * range)) }; }
    if (!touchUI && mouseIn) { var m = mouseWorld(); return { a: Math.atan2(m.z - h.z, m.x - h.x), d: Math.min(range, Math.hypot(m.x - h.x, m.z - h.z)) }; }
    var e = nearestEnemy(h.x, h.z, key === "atk" ? Math.max(range, 7) : 9);
    if (e) { var p = ep(e); return { a: Math.atan2(p.z - h.z, p.x - h.x), d: Math.min(range, Math.hypot(p.x - h.x, p.z - h.z)) }; }
    return { a: h.face, d: range * .6 };
  }
  function heroAttack() {
    var h = G.hero; if (h.atkCd > 0 || h.dash) return;
    var aim = aimFor("atk"); h.face = aim.a;
    h.atkCd = h.kit.attack(h, aim.a, aim.d); h.swing = Math.max(h.swing, .18);
  }
  function castWithAim(key, aim) {
    var h = G.hero; if (!h || G.paused || (G.state !== "play" && G.state !== "prep")) return;
    if (h.cd[key] > 0 || h.dash) { if (h.cd[key] > 0) play("error", .3); return; }
    h.face = aim.a; if (h.kit.cast(key, h, aim.a, aim.d) === false) return;
    h.cd[key] = h.kit.skills[key].cd; h.swing = .3;
  }
  function castSkill(key) { if (G.hero) castWithAim(key, aimFor(key, null)); }
  function updateHero(dt) {
    var h = G.hero; if (!h) return;
    ["s1", "s2", "ult"].forEach(function (k) { if (h.cd[k] > 0) h.cd[k] = Math.max(0, h.cd[k] - dt); });
    if (h.atkCd > 0) h.atkCd -= dt; if (h.swing > 0) h.swing -= dt;
    var mv = moveVec(), l = Math.hypot(mv.x, mv.z); h.moving = l > .05;
    if (h.dash) { var d = h.dash; h.x = clampX(h.x + d.dx * d.speed * dt); h.z = clampZ(h.z + d.dz * d.speed * dt); d.t -= dt; if (d.tick) d.tick(h, dt); if (d.t <= 0) { if (d.end) d.end(h); h.dash = null; } }
    else {
      var sp = h.kit.speed * h.speedMul * (h.swing > 0 ? .7 : 1);
      if (h.moving) { h.x = clampX(h.x + mv.x * sp * dt); h.z = clampZ(h.z + mv.z * sp * dt); if (h.swing <= 0) h.face = Math.atan2(mv.z, mv.x); }
      if (h.lunge && h.lunge.t > 0) { var k = Math.min(dt, h.lunge.t) / .12; h.x = clampX(h.x + h.lunge.dx * k); h.z = clampZ(h.z + h.lunge.dz * k); h.lunge.t -= dt; }
    }
    if ((keys.Space || attackHeld()) && G.state !== "select") heroAttack();
    if ((h.moving || h.swing > 0) && h.kit.moveFx) h.kit.moveFx(h, dt);
    h.kit.update(h, dt);
  }
  function attackHeld() { for (var id in ptrs) if (ptrs[id].k === "atk" || ptrs[id].k === "matk") return true; return false; }

  // ---------- projectiles, acteurs, zones ----------
  function addProj(p) { p.alive = true; p.hit = []; p.age = 0; G.projs.push(p); return p; }
  function aoeAt(x, z, r, dmg) { inRadius(x, z, r).forEach(function (e) { dmgEnemy(e, dmg, true); }); G.fx.push({ k: "ring", x: x, z: z, r: r, t: 0, dur: .3, col: "#c8a0ff" }); }
  function updateProjs(dt) {
    G.projs = G.projs.filter(function (p) {
      p.age += dt; if (p.acc) p.acc(p, dt);
      p.x += p.vx * dt; p.z += p.vz * dt; p.life -= dt;
      var dead = false;
      if (p.life > 0) {
        for (var i = 0; i < G.enemies.length; i++) {
          var e = G.enemies[i]; if (e.dead || p.hit.indexOf(e) >= 0) continue; var q = ep(e);
          if (Math.hypot(q.x - p.x, q.z - p.z) <= p.r + .55) { p.hit.push(e); dmgEnemy(e, p.dmg); if (p.onHit) p.onHit(e, p); if (p.aoe) aoeAt(p.x, p.z, p.aoe, p.aoeDmg || 0); if (!p.pierce) { dead = true; break; } }
        }
      } else { if (p.aoe) aoeAt(p.x, p.z, p.aoe, p.aoeDmg || 0); dead = true; }
      if (dead) p.alive = false; return !dead;
    });
  }
  function projSprite(name, X, Y, ang, w) {
    var im = imgs[name]; if (!im || !im.naturalWidth) return false;
    var sc = w / im.naturalWidth, iw = im.naturalWidth * sc, ih = im.naturalHeight * sc;
    ctx.save(); ctx.translate(X, Y); ctx.rotate(ang); ctx.drawImage(im, -iw * .78, -ih / 2, iw, ih); ctx.restore(); return true;
  }
  function drawProj(p) {
    var X = sx(p.x), Y = sy(p.z) - 22;
    ctx.save();
    var ang = Math.atan2(-p.vz * SY, p.vx);
    if (p.kind === "note" && projSprite("fx_phelto_notes", X, Y, ang, 74)) { }
    else if (p.kind === "seed" && projSprite("fx_eglantyne_seed", X, Y, ang, 64)) { }
    else if (p.kind === "note") { ctx.shadowColor = p.col; ctx.shadowBlur = 12; ctx.fillStyle = p.col; ctx.font = "bold 26px sans-serif"; ctx.textAlign = "center"; ctx.fillText("♪", X, Y + 8); }
    else if (p.kind === "seed") { ctx.shadowColor = p.col; ctx.shadowBlur = 10; ctx.fillStyle = "#9aff9a"; ctx.beginPath(); ctx.arc(X, Y, 6, 0, 6.283); ctx.fill(); ctx.strokeStyle = "rgba(110,255,140,.5)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X - p.vx * .02 * PPU, Y + p.vz * .02 * PPU * SY); ctx.lineTo(X, Y); ctx.stroke(); }
    else { ctx.shadowColor = p.col; ctx.shadowBlur = 14; ctx.strokeStyle = p.col; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(X - p.vx * .035 * PPU, Y + p.vz * .035 * PPU * SY); ctx.lineTo(X, Y); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(X, Y, 4, 0, 6.283); ctx.fill(); }
    ctx.restore();
  }
  function addActor(a) { a.t = a.t || 0; a.life = a.life || 1; G.actors.push(a); return a; }
  function updateActors(dt) {
    G.actors = G.actors.filter(function (a) { a.life -= dt; if (a.update) a.update(dt); return a.life > 0; });
    G.buffs = G.buffs.filter(function (b) { b.t -= dt; return b.t > 0; });
    G.pending = G.pending.filter(function (p) { p.t -= dt; if (p.t <= 0) { p.f(); return false; } return true; });
  }

  // ---------- boucle logique ----------
  function update(dt) {
    G.anim += dt; time += dt;
    if (G.toastT > 0) G.toastT -= dt;
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt);
    if (G.flashHeart > 0) G.flashHeart -= dt;
    if (G.tintT > 0) G.tintT -= dt;
    if (G.paused || G.state === "select") return;
    G.parts = G.parts.filter(function (p) { p.life -= dt; p.vy += 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt; return p.life > 0; });
    G.bolts = G.bolts.filter(function (b) { b.life -= dt; if (!b.flick && b.life < .07) { b.flick = true; b.pts = jag(b.a, b.b, b.big ? 30 : 16); } return b.life > 0; });
    G.fx = G.fx.filter(function (f) { f.t = (f.t || 0) + dt; return f.t < f.dur; });
    G.towers.forEach(function (t) { if (t.punch > 0) t.punch = Math.max(0, t.punch - dt * 6); });
    if (G.state === "win" || G.state === "lose") return;
    updateHero(dt); updateProjs(dt); updateActors(dt);
    if (G.state !== "play") return;
    G.t += dt;
    while (G.next < G.events.length && G.events[G.next].t <= G.t) spawn(G.events[G.next++]);
    var w = 0; WAVES.forEach(function (_, i) { if (10 + 27 * i <= G.t) w = i + 1; });
    if (w !== G.wave) { G.wave = w; if (w) { toast(WAVES[w - 1][0], PINKL); play("wave", .7); } }
    G.buffs.forEach(function (b) { if (b.follow) { b.x = b.follow.x; b.z = b.follow.z; } });
    G.towers.forEach(function (t) {
      var boost = 1;
      G.towers.forEach(function (u) { if (u !== t && u.st.aura > 0 && Math.hypot(u.s.x - t.s.x, u.s.z - t.s.z) <= 4.5) boost += u.st.aura; });
      G.buffs.forEach(function (b) { if (Math.hypot(b.x - t.s.x, b.z - t.s.z) <= b.r) boost += b.rate; });
      t.boost = boost; t.cd -= dt * boost; if (t.cd <= 0) t.cd = fire(t) ? 1 / t.st.rate : .08;
    });
    G.enemies.forEach(function (e) {
      if (e.dead) return;
      e.age += dt; if (e.flash > 0) e.flash -= dt; if (e.spark > 0) e.spark -= dt; e.barT += dt;
      if (e.poison) { e.poison.t -= dt; dmgEnemy(e, e.poison.dps * dt, true); if (e.poison && e.poison.t <= 0) e.poison = null; if (e.dead) return; }
      if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowF = 1; }
      if (e.stun > 0) e.stun -= dt; else { e.d += e.def.speed * e.slowF * dt; var k = Math.exp(-2.5 * dt); e.ox *= k; e.oz *= k; }
      if (e.age > 4 * LEN / e.def.speed + 12) { e.dead = true; return; }
      if (e.d >= LEN) { e.dead = true; hurtHeart(e.def.dmg); }
    });
    G.enemies = G.enemies.filter(function (e) { return !e.dead; });
    if (G.heart > 0 && G.next >= G.events.length && !G.enemies.length) endState("win");
  }
  function hurtHeart(a) {
    if (G.state !== "play" || G.heart <= 0) return;
    G.heart = Math.max(0, G.heart - a); G.shake = .3; G.flashHeart = .35; play("heart_hit");
    burst(sx(L.heart.x), sy(L.heart.z) - 50, PINK, 14, 150, .6, 5);
    if (G.heart <= 0) endState("lose");
  }

  // ---------- API pour les kits ----------
  var API = {
    get ctx() { return ctx; }, PPU: PPU, SY: SY, sx: sx, sy: sy, clampX: clampX, clampZ: clampZ, time: function () { return time; },
    pos: function (e) { return ep(e); }, aimPt: aimPt, enemies: function () { return G.enemies.filter(function (e) { return !e.dead; }); },
    nearest: function (x, z, r, ex) { return nearestEnemy(x, z, r, ex); }, inRadius: inRadius,
    dmg: function (e, n) { dmgEnemy(e, n); }, stun: function (e, t) { e.stun = Math.max(e.stun, t); },
    slow: function (e, f, t) { e.slowF = Math.min(e.slowF, f); e.slowT = Math.max(e.slowT, t); },
    poison: function (e, dps, t) { e.poison = { dps: Math.max(dps, e.poison ? e.poison.dps : 0), t: Math.max(t, e.poison ? e.poison.t : 0) }; },
    pull: function (e, dx, dz, k) { k = k == null ? 1 : k; e.ox += dx * k; e.oz += dz * k; }, push: function (e, dx, dz) { e.ox += dx; e.oz += dz; },
    addProj: addProj, addActor: addActor, burstW: function (x, z, col, n, spd, life, size) { burst(sx(x), sy(z) - 6, col, n, spd, life, size); }, after: function (t, f) { G.pending.push({ t: t, f: f }); }, fx: function (f) { f.t = 0; G.fx.push(f); },
    bolt: bolt, tint: function (a, t) { G.tint = a; G.tintT = t; }, shake: function (s) { G.shake = Math.max(G.shake, s); }, play: play, toast: toast,
    healHeart: function (frac) { G.heart = Math.min(HEART_MAX, G.heart + HEART_MAX * frac); }, buff: function (b) { G.buffs.push(b); },
    spr: function (n, x, y, s, f, a) { spr(n, x, y, s, f, a); }, addSorted: function (z, fn) { G.sortedNow.push({ z: z, f: fn }); }
  };

  // ---------- actions joueur : construction ----------
  function slotAt(w) {
    var best = null, bd = 1.5;
    slots.forEach(function (s) { var d = Math.hypot(s.x - w.x, s.z - w.z); if (d <= bd) { bd = d; best = s; } });
    return best;
  }
  function heroTowerType() { return G.hero ? G.hero.kit.tower : "orb"; }
  function tryBuild(s) {
    var type = heroTowerType(), def = TOWERS[type];
    if (G.gold < def.cost) { play("error", .6); toast("Pas assez de cristaux (" + def.cost + " requis)", "#ff8a8a"); return; }
    G.gold -= def.cost; var t = { s: s, tier: 0, cd: 0, punch: 0, type: type, st: tstats(def, 0), salvo: 0, boost: 1 }; s.tower = t; G.towers.push(t);
    play("build", .9); burst(sx(s.x), sy(s.z), "#8c85bf", 16, 110, .7, 5); toast(def.name + " construite", "#9bffd0");
    G.sel = t; G.build = false;
  }
  function tryUpgrade(t) {
    if (!t) return; var def = TOWERS[t.type]; if (t.tier >= def.ups.length) return;
    var u = def.ups[t.tier];
    if (G.gold < u.cost) { play("error", .6); toast("Pas assez de cristaux", "#ff8a8a"); return; }
    G.gold -= u.cost; t.tier++; t.st = tstats(def, t.tier); t.punch = 1; play("upgrade", .9);
    var m = muzzle(t); burst(m.x, m.y, def.col, 24, 160, .8, 5); toast(u.name + " !", def.col);
  }
  function toggleBuild() { if (G.state === "play" || G.state === "prep") { G.build = !G.build; if (G.build) G.sel = null; } }
  function cancel() { if (G.build) { G.build = false; return true; } if (G.sel) { G.sel = null; return true; } return false; }
  function togglePause() { if (G.state === "play" || G.state === "prep") { G.paused = !G.paused; ptrs = {}; joy.on = false; aimSt = null; } }
  function worldClick(px, py) {
    if (G.paused || (G.state !== "play" && G.state !== "prep")) return false;
    var w = toWorld(px, py), s = slotAt(w);
    if (G.build) { if (!s) return true; if (s.tower) { G.sel = s.tower; G.build = false; } else tryBuild(s); return true; }
    if (s && s.tower) { G.sel = s.tower; return true; }
    if (G.sel) { G.sel = null; return true; }
    return false;
  }
  function pickHero(id) {
    if (!KITS[id]) { play("error", .5); return; }
    G.hero = newHero(id); G.state = "prep"; play("click", .6); startAmbient();
    if (touchUI) setFull(true);
  }

  // ---------- rendu : primitives ----------
  function rr(x, y, w, h, r, fill, stroke, lw) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }
  function panel(x, y, w, h) { rr(x, y, w, h, 10, "rgba(14,12,24,.82)", "rgba(255,255,255,.08)", 2); }
  function text(s, x, y, size, col, al, bold) {
    ctx.font = (bold === false ? "" : "bold ") + size + "px Nunito, system-ui, sans-serif"; ctx.textAlign = al || "left"; ctx.textBaseline = "middle";
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(8,4,18,.85)"; ctx.lineJoin = "round"; ctx.strokeText(s, x, y); ctx.fillStyle = col || "#f2ecf6"; ctx.fillText(s, x, y);
  }
  function button(x, y, w, h, label, f, hot, col, fs, dis) {
    var h2 = !dis && mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;
    rr(x, y, w, h, 10, dis ? "#1b1826" : hot ? "#6a1f4a" : h2 ? "#4a2a60" : "#2a1f3e", dis ? "#34304a" : h2 ? PINKL : "#7a5aa8", 2);
    if (label) text(label, x + w / 2, y + h / 2 + 1, fs || 22, dis ? "#6c6688" : col || "#fff", "center");
    buttons.push({ x: x, y: y, w: w, h: h, f: f });
  }
  function spr(name, x, y, scale, flip, alpha) {
    var im = imgs[name]; if (!im || !im.naturalWidth) return;
    var w = im.naturalWidth * scale, h = im.naturalHeight * scale;
    ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1); if (alpha != null) ctx.globalAlpha = alpha;
    ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore();
  }
  function shadow(x, y, sz) { var im = imgs.fx_shadow; if (im && im.naturalWidth) { var w = sz * PPU, h = w * .5 * SY * 1.15; ctx.drawImage(im, x - w / 2, y - h / 2, w, h); } }
  function ring(x, y, r, col, fillA) {
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, y, r * PPU, r * PPU * SY, 0, 0, 6.283); ctx.stroke();
    ctx.globalAlpha = fillA == null ? .08 : fillA; ctx.fillStyle = col; ctx.fill(); ctx.restore();
  }
  function slotMark(s, col) {   // losange « + » comme sur le sol
    var x = sx(s.x), y = sy(s.z), rx = 1.15 * PPU, ry = rx * SY; ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath();
    ctx.moveTo(x, y - ry); ctx.lineTo(x + rx, y); ctx.lineTo(x, y + ry); ctx.lineTo(x - rx, y); ctx.closePath(); ctx.stroke(); ctx.restore();
  }
  function frameOf(e, f) { return (Math.floor(G.anim * f + (e.ph || 0)) & 1); }

  // effets partagés (kits + moteur)
  function drawFx(f) {
    var p = f.t / f.dur, a = 1 - p;
    if (f.k === "slash") {
      ctx.save(); ctx.translate(sx(f.x), sy(f.z) - 26); ctx.scale(1, SY); ctx.globalAlpha = a;
      var r = f.rng * PPU * (.75 + .25 * Math.min(1, p * 3)), a0 = -f.a - f.arc / 2, a1 = -f.a + f.arc / 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, a0, a1); ctx.closePath(); ctx.fillStyle = "rgba(90,220,255,.16)"; ctx.fill();
      ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(0, 0, r, a0, a1); ctx.strokeStyle = "rgba(60,190,255,.6)"; ctx.lineWidth = f.big ? 16 : 11; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r - 2, a0, a1); ctx.strokeStyle = "#f2ffff"; ctx.lineWidth = f.big ? 6 : 4; ctx.stroke(); ctx.restore();
    } else if (f.k === "ring") {
      ctx.save(); ctx.globalAlpha = a * .9; ctx.strokeStyle = f.col; ctx.lineWidth = 5 * a + 1; var s = Math.min(1, p * 2.2 + .1);
      ctx.beginPath(); ctx.ellipse(sx(f.x), sy(f.z), f.r * PPU * s, f.r * PPU * SY * s, 0, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = a * .25; ctx.fillStyle = f.flash ? "#ffffff" : f.col; ctx.fill(); ctx.restore();
    } else if (f.k === "pull") {
      var dx = Math.cos(f.a), dz = Math.sin(f.a); ctx.save(); ctx.globalAlpha = a; ctx.lineCap = "round";
      for (var i = 0; i < 6; i++) {
        var al = (i + 1) * f.len / 6 * Math.min(1, p * 3 + .3);
        [-1, 1].forEach(function (sd) {
          var x0 = f.x + dx * al + (-dz) * f.hw * sd * (1 - p * .8), z0 = f.z + dz * al + dx * f.hw * sd * (1 - p * .8), x1 = f.x + dx * al, z1 = f.z + dz * al;
          ctx.strokeStyle = "rgba(120,230,255,.8)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx(x0), sy(z0) - 20); ctx.lineTo(sx(x1), sy(z1) - 20); ctx.stroke();
        });
      }
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx(f.x), sy(f.z) - 20); ctx.lineTo(sx(f.x + dx * f.len), sy(f.z + dz * f.len) - 20); ctx.stroke(); ctx.restore();
    } else if (f.k === "anchor") {
      var x = sx(f.x), y = sy(f.z); ctx.save(); ctx.globalAlpha = Math.min(1, a * 3);
      ctx.strokeStyle = "rgba(60,200,255,.5)"; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 46); ctx.stroke();
      ctx.strokeStyle = "#e9ffff"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 46); ctx.stroke();
      ctx.fillStyle = "#ffd25e"; ctx.fillRect(x - 12, y - 40, 24, 5); ctx.restore();
    } else if (f.k === "pulse") {
      ctx.save(); ctx.globalAlpha = a; f.pts.forEach(function (n, i) { if (i % 2) return; ctx.strokeStyle = "#e0c8ff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(sx(n.x), sy(n.z), 1.4 * PPU * (.4 + p), 1.4 * PPU * SY * (.4 + p), 0, 0, 6.283); ctx.stroke(); }); ctx.restore();
    } else if (f.k === "star8") {
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = "#7aff9a"; ctx.lineWidth = 4; for (var i2 = 0; i2 < 8; i2++) { var an = i2 * .785; ctx.beginPath(); ctx.moveTo(sx(f.x), sy(f.z) - 6); ctx.lineTo(sx(f.x + Math.cos(an) * 3.4 * Math.min(1, p * 3)), sy(f.z + Math.sin(an) * 3.4 * Math.min(1, p * 3)) - 6); ctx.stroke(); } ctx.restore();
    } else if (f.k === "beams") {
      ctx.save(); ctx.globalAlpha = a; for (var i3 = 0; i3 < 9; i3++) { var bx = sx(f.x) + (i3 - 4) * 70 + Math.sin(i3 * 7) * 20; var g = ctx.createLinearGradient(bx, 0, bx, H); g.addColorStop(0, "rgba(255,243,160,0)"); g.addColorStop(.5, "rgba(255,243,160,.7)"); g.addColorStop(1, "rgba(255,243,160,0)"); ctx.fillStyle = g; ctx.fillRect(bx - 10, 0, 20, H); } ctx.restore();
    }
  }

  function drawHero(h) {
    var x = sx(h.x), y = sy(h.z), k = h.kit, fr = h.moving ? (Math.floor(G.anim * 9) & 1) : (Math.floor(G.anim * 2) & 1);
    shadow(x, y, 1.9);
    ctx.save(); ctx.globalAlpha = .6; ctx.strokeStyle = PINKL; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, 20, 20 * SY, 0, 0, 6.283); ctx.stroke(); ctx.restore();
    var pose = h.swing > 0 ? (k.swingPose ? k.swingPose(h) : (h.swing > .18 ? "cast" : "atk")) : null;
    var name = pose ? k.spr[pose] : (h.moving ? k.spr.move[fr] : k.spr.idle[fr]);
    var bob = h.moving ? Math.abs(Math.sin(G.anim * 14)) * -2 : Math.sin(G.anim * 3) * -1;
    ctx.save(); if (h.dash) ctx.globalAlpha = .75;
    spr(name, x, y + bob, k.scale, Math.cos(h.face) < -.1); ctx.restore();
    // plaque de nom façon maquette : nom coloré + fine barre de la ressource du héros
    var top = y - sh(k.spr.idle[0]) * k.scale - 20, col = HCOL[h.id] || PINKL, w = 74;
    rr(x - w / 2, top - 11, w, 22, 5, "rgba(10,8,20,.85)", "rgba(255,255,255,.12)", 1);
    text(k.short || k.name, x, top - 3, 12, col, "center");
    var m = k.meter ? k.meter(h) : null, mv = m ? Math.min(1, m.v) : 1;
    ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(x - w / 2 + 5, top + 4, w - 10, 3); ctx.fillStyle = col; ctx.fillRect(x - w / 2 + 5, top + 4, (w - 10) * mv, 3);
  }

  function drawIndicator(h, key, aim) {
    var t = h.kit.skills[key].aim, x = sx(h.x), y = sy(h.z);
    ctx.save(); ctx.fillStyle = "rgba(255,90,190,.22)"; ctx.strokeStyle = "rgba(255,160,220,.9)"; ctx.lineWidth = 2;
    if (t.type === "dir") {
      var len = t.len * PPU, w = (t.w || 1.2) * PPU * .5; ctx.translate(x, y); ctx.scale(1, SY); ctx.rotate(-aim.a); ctx.beginPath(); ctx.rect(0, -w, len, w * 2); ctx.fill(); ctx.stroke();
    } else if (t.type === "cone") {
      ctx.translate(x, y); ctx.scale(1, SY); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, t.len * PPU, -aim.a - t.arc * Math.PI / 360, -aim.a + t.arc * Math.PI / 360); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (t.type === "point") {
      ring(x, y, t.range, "rgba(255,160,220,.7)", .03);
      var px = clampX(h.x + Math.cos(aim.a) * aim.d), pz = clampZ(h.z + Math.sin(aim.a) * aim.d); ctx.beginPath(); ctx.ellipse(sx(px), sy(pz), t.r * PPU, t.r * PPU * SY, 0, 0, 6.283); ctx.fill(); ctx.stroke();
    } else { ctx.beginPath(); ctx.ellipse(x, y, t.r * PPU, t.r * PPU * SY, 0, 0, 6.283); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }

  // ---------- rendu : scène ----------
  function draw() {
    buttons.length = 0; ctl.length = 0;
    ctx.setTransform(RS, 0, 0, RS, SL * RS, 0); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#0c0814"; ctx.fillRect(-SL, 0, CW, H);
    ctx.save();
    if (G.shake > 0) ctx.translate((Math.random() - .5) * 10 * G.shake / .3, (Math.random() - .5) * 8 * G.shake / .3);
    ctx.drawImage(imgs.ground, OX, TOP, GW * PPU, MAPH);

    var sel = G.sel, hv = hover, hero = G.hero, tdef = TOWERS[heroTowerType()];
    if (G.build) slots.forEach(function (s) { if (!s.tower) slotMark(s, s === hv ? (G.gold >= tdef.cost ? "#8dffb0" : "#ff6a72") : "rgba(255,160,220,.55)"); });
    else if (hv && hv.tower) slotMark(hv, "#8dffb0");
    if (G.build && hv && !hv.tower) ring(sx(hv.x), sy(hv.z), tstats(tdef, 0).range, G.gold >= tdef.cost ? "#ffa0dc" : "#ff5a64");
    if (sel) ring(sx(sel.s.x), sy(sel.s.z), sel.st.range, "#ffe680");
    G.buffs.forEach(function (b) { if (!b.follow) ring(sx(b.x), sy(b.z), b.r, "#ffc878", .04); });
    G.actors.forEach(function (a) { if (a.ground && a.draw) a.draw(); });
    if (aimSt && aimSt.key && hero) drawIndicator(hero, aimSt.key, aimSt.aim);

    G.sortedNow.length = 0;
    var items = [];
    decor.forEach(function (d) {
      var n = d.kind; if (n === "sparkle") { items.push({ z: d.z + 3, f: function () { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = .5 + .4 * Math.sin(time * 2 + d.x * 3); spr("sparkle", sx(d.x), sy(d.z) + 6, 1); ctx.restore(); } }); return; }
      var big = n === "gate" ? 0 : n.indexOf("pine") === 0 ? .9 : n.indexOf("ruin") === 0 ? 1.5 : n === "rock" ? 1.6 : 1.0;
      items.push({ z: d.z, f: function () { var x = sx(d.x), y = sy(d.z); if (big) shadow(x, y, big); spr(n, x, y, 1, d.flip); } });
    });
    slots.forEach(function (s) { if (s.tower) items.push({ z: s.z - .001, f: function () { var t = s.tower, x = sx(s.x), y = sy(s.z); shadow(x, y, 2.2); ctx.save(); if (t.boost > 1.01) { ctx.shadowColor = "#ffe680"; ctx.shadowBlur = 18; } spr(TOWERS[t.type].spr + t.tier, x, y, 1 + .1 * t.punch); ctx.restore(); } }); });
    items.push({ z: L.heart.z + .5, f: function () { var x = sx(L.heart.x), y = sy(L.heart.z), low = 1 - G.heart / HEART_MAX; ctx.save(); if (G.flashHeart > 0) ctx.globalAlpha = .75 + .25 * Math.sin(G.anim * 60); spr("heart_" + (Math.floor(G.anim * (1.5 + 3 * low)) & 1), x, y, 1); ctx.restore(); } });
    G.enemies.forEach(function (e) {
      var p = ep(e);
      items.push({ z: p.z, f: function () {
        var x = sx(p.x), y = sy(p.z), name = e.def.spr + "_" + (e.stun > 0 ? 0 : frameOf(e, e.def.fps)), bob = e.k === "orb" ? Math.sin(G.anim * 4 + e.ph) * 2 : 0;
        shadow(x, y, e.def.shadow);
        if (e.flash > 0) { ctx.save(); ctx.filter = "brightness(2.4) saturate(.3)"; spr(name, x, y + bob, e.def.scale, p.dx < -.2); ctx.restore(); }
        else if (e.stun > 0) { ctx.save(); ctx.filter = "brightness(1.4) hue-rotate(150deg)"; spr(name, x, y + bob, e.def.scale, p.dx < -.2); ctx.restore(); }
        else if (e.slowF < 1) { ctx.save(); ctx.filter = "hue-rotate(-30deg) brightness(1.1)"; spr(name, x, y + bob, e.def.scale, p.dx < -.2); ctx.restore(); }
        else spr(name, x, y + bob, e.def.scale, p.dx < -.2);
        if (e.spark > 0) { var q = aimPt(e), sp = e.spark / .16, ll = 5 + 9 * sp; ctx.save(); ctx.strokeStyle = "#f4dcff"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.shadowColor = "#d58cff"; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(q.x + e.sx - ll, q.y + e.sy); ctx.lineTo(q.x + e.sx + ll, q.y + e.sy); ctx.moveTo(q.x + e.sx, q.y + e.sy - ll); ctx.lineTo(q.x + e.sx, q.y + e.sy + ll); ctx.stroke(); ctx.restore(); }
        if (e.poison) { ctx.fillStyle = "rgba(120,255,140,.8)"; ctx.fillRect(x - 3 + Math.sin(G.anim * 8 + e.ph) * 6, y - 26 - ((G.anim * 30 + e.ph * 10) % 20), 3, 3); }
      } });
    });
    if (hero) items.push({ z: hero.z, f: function () { drawHero(hero); } });
    G.actors.forEach(function (a) { if (a.sorted && a.draw) items.push({ z: a.z, f: function () { a.draw(); } }); });
    if (hero && hero.kit.drawExtra) hero.kit.drawExtra(hero);
    G.sortedNow.forEach(function (i) { items.push(i); });
    G.projs.forEach(function (p) { items.push({ z: p.z - 3, f: function () { drawProj(p); } }); });
    items.sort(function (a, b) { return b.z - a.z; }).forEach(function (i) { i.f(); });
    G.fx.forEach(drawFx);

    // barres de vie : élites/boss en permanence ; les autres au hit puis disparition après 2,5 s ; vert / jaune / rouge
    G.enemies.forEach(function (e) {
      if (!(e.def.always || e.barT < 2.5)) return;
      var p = ep(e), w = e.def.bar * PPU * .75, x = sx(p.x) - w / 2, y = sy(p.z) - sh(e.def.spr + "_0") * e.def.scale - 8, r = Math.max(0, e.hp / e.def.hp);
      ctx.globalAlpha = e.def.always ? 1 : Math.min(1, (2.5 - e.barT) * 2);
      rr(x - 2, y - 3, w + 4, 9, 3, "rgba(10,6,20,.92)", "rgba(255,255,255,.28)", 1);
      ctx.fillStyle = r > .6 ? "#59e07a" : r > .3 ? "#f2c038" : "#ec3b4a"; ctx.fillRect(x, y - 1, w * r, 5); ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.fillRect(x, y - 1, w * r, 1.5); ctx.globalAlpha = 1;
    });
    G.bolts.forEach(function (b) {
      var c = b.col || "#7ff0ff";
      [[b.big ? 16 : 9, c, .35], [b.big ? 6 : 3, "#ffffff", 1]].forEach(function (o) { ctx.globalAlpha = o[2]; ctx.strokeStyle = o[1]; ctx.lineWidth = o[0]; ctx.lineJoin = "round"; ctx.beginPath(); b.pts.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke(); });
      ctx.globalAlpha = 1;
    });
    G.parts.forEach(function (p) { ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.5)); ctx.fillStyle = p.c; var s = p.s * (.4 + p.life / p.max); ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s); });
    ctx.globalAlpha = 1;
    for (var i = 0; i < 24; i++) { var fx = OX + (i * 197 + Math.sin(time * .3 + i) * 40) % (GW * PPU), fy = TOP + ((i * 331 + time * 8 * (1 + i % 3)) % MAPH); ctx.globalAlpha = .3 + .3 * Math.sin(time * 2 + i); ctx.fillStyle = i % 2 ? "#ffb0e0" : "#c48bff"; ctx.fillRect(fx, fy, 3, 3); }
    ctx.globalAlpha = 1;
    if (G.build && hv && !hv.tower) spr(tdef.spr + "0", sx(hv.x), sy(hv.z), 1, false, G.gold >= tdef.cost ? .6 : .35);
    text("SPAWN", sx(L.spawn.x) + 12, sy(L.spawn.z) + 34, 15, PINK, "center");
    var hx = sx(L.heart.x), hy = sy(L.heart.z) - 132, hr = Math.max(0, G.heart / HEART_MAX);
    text("CŒUR", hx, hy, 18, "#fff", "center"); text(Math.ceil(G.heart) + " / " + HEART_MAX, hx, hy + 20, 15, hr > .35 ? "#f2ecf6" : "#ff8a96", "center");
    rr(hx - 46, hy + 33, 92, 8, 3, "rgba(10,6,20,.92)", "rgba(255,255,255,.28)", 1); ctx.fillStyle = hr > .35 ? PINK : "#ff4058"; ctx.fillRect(hx - 44, hy + 35, 88 * hr, 4);
    ctx.restore();
    if (G.tintT > 0) { ctx.fillStyle = "rgba(14,8,48," + (G.tint * Math.min(1, G.tintT)) + ")"; ctx.fillRect(0, 0, W, H); }
    var g = ctx.createRadialGradient(W / 2, H / 2, 280, W / 2, H / 2, 760); g.addColorStop(0, "rgba(6,3,18,0)"); g.addColorStop(1, "rgba(6,3,18,.5)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    drawHud();
  }

  function clock(s) { s = Math.max(0, Math.floor(s)); return ("0" + (s / 60 | 0)).slice(-2) + ":" + ("0" + s % 60).slice(-2); }
  function gem(x, y, s, col) { ctx.fillStyle = col || PINK; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * .8, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s * .8, y); ctx.closePath(); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x - s * .8, y); ctx.lineTo(x, y); ctx.closePath(); ctx.fill(); }

  // bouton de commande : rond (tactile) ou carré arrondi (clavier/souris, comme la barre de la maquette)
  function circle(id, cx, cy, r, glyph, cdLeft, cdMax, keyHint, big) {
    ctl.push({ id: id, x: cx, y: cy, r: r });
    var pressed = (id === "atk" && attackHeld()) || (aimSt && aimSt.key === id), sq = !touchUI;
    ctx.save();
    if (sq) rr(cx - r, cy - r, r * 2, r * 2, 12, pressed ? "rgba(255,90,190,.55)" : "rgba(14,10,30,.85)", cdLeft > 0 ? "#5a4f86" : PINKL, 3);
    else { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.fillStyle = pressed ? "rgba(255,90,190,.55)" : "rgba(14,10,30,.78)"; ctx.fill(); ctx.lineWidth = big ? 5 : 4; ctx.strokeStyle = cdLeft > 0 ? "#5a4f86" : PINKL; ctx.stroke(); }
    var skIm = G.hero ? imgs["skill_" + G.hero.id + "_" + id] : null;
    if (skIm && skIm.naturalWidth) {   // icône officielle de la compétence (planche du héros)
      ctx.save(); if (sq) rr(cx - r + 3, cy - r + 3, r * 2 - 6, r * 2 - 6, 9, null, null); else { ctx.beginPath(); ctx.arc(cx, cy, r - 3, 0, 6.283); } ctx.clip();
      ctx.imageSmoothingEnabled = false; ctx.globalAlpha = cdLeft > 0 ? .55 : 1; ctx.drawImage(skIm, cx - r, cy - r, r * 2, r * 2); ctx.restore(); glyph = "";
    }
    ctx.translate(cx, cy); ctx.strokeStyle = cdLeft > 0 ? "#8d86b4" : "#ffd0ee"; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round";
    var s = r / 40;
    if (glyph === "atk") { ctx.beginPath(); ctx.moveTo(-14 * s, 16 * s); ctx.lineTo(16 * s, -16 * s); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-18 * s, 8 * s); ctx.lineTo(-8 * s, 18 * s); ctx.stroke(); ctx.beginPath(); ctx.moveTo(8 * s, -22 * s); ctx.lineTo(22 * s, -22 * s); ctx.lineTo(22 * s, -8 * s); ctx.stroke(); }
    else if (glyph === "s1") { ctx.beginPath(); ctx.moveTo(-16 * s, 12 * s); ctx.lineTo(16 * s, -12 * s); ctx.stroke(); ctx.beginPath(); ctx.moveTo(4 * s, -16 * s); ctx.lineTo(18 * s, -12 * s); ctx.lineTo(12 * s, 2 * s); ctx.stroke(); }
    else if (glyph === "s2") { ctx.beginPath(); ctx.moveTo(6 * s, -20 * s); ctx.lineTo(-8 * s, 2 * s); ctx.lineTo(2 * s, 2 * s); ctx.lineTo(-6 * s, 20 * s); ctx.lineTo(10 * s, -4 * s); ctx.lineTo(0, -4 * s); ctx.closePath(); ctx.fill(); }
    else if (glyph === "ult") { ctx.beginPath(); ctx.arc(0, 0, 16 * s, 0, 5.2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(2 * s, -6 * s); ctx.lineTo(-4 * s, 4 * s); ctx.lineTo(3 * s, 4 * s); ctx.lineTo(-2 * s, 14 * s); ctx.stroke(); }
    ctx.restore();
    if (cdLeft > 0) {
      ctx.save();
      if (sq) { rr(cx - r, cy - r, r * 2, r * 2, 12, null, null); ctx.beginPath(); ctx.rect(cx - r, cy - r, r * 2, r * 2 * (cdLeft / cdMax)); ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r - 2, -Math.PI / 2, -Math.PI / 2 + 6.283 * (cdLeft / cdMax)); ctx.closePath(); ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fill(); }
      ctx.restore(); text(String(Math.ceil(cdLeft)), cx, cy, Math.round(r * .62), "#fff", "center");
    }
    if (keyHint && sq) text(keyHint, cx, cy + r - 8, 12, "#ffd0ee", "center");
  }

  function drawControls() {
    var h = G.hero; if (!h) return;
    var k = h.kit;
    if (touchUI) {
      var ax = W - 112, ay = H - 118, bigR = 58, sr = 42;
      circle("atk", ax, ay, bigR, "atk", 0, 1, "", true);
      circle("s1", ax - (bigR + sr * .9), ay + 22, sr, "s1", h.cd.s1, k.skills.s1.cd, "");
      circle("s2", ax - (bigR * .75 + sr * .7), ay - (bigR + sr * .5), sr, "s2", h.cd.s2, k.skills.s2.cd, "");
      circle("ult", ax + 6, ay - (bigR + sr * 2.1), sr, "ult", h.cd.ult, k.skills.ult.cd, "");
      var bx = joy.on ? joy.bx : 150, by = joy.on ? joy.by : H - 140, kx = bx + (joy.on ? joy.dx : 0) * 60, ky = by + (joy.on ? joy.dy : 0) * 60;
      ctx.save(); ctx.globalAlpha = joy.on ? .95 : .35; ctx.beginPath(); ctx.arc(bx, by, 78, 0, 6.283); ctx.fillStyle = "rgba(14,10,34,.55)"; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = PINKL; ctx.stroke();
      ctx.beginPath(); ctx.arc(kx, ky, 36, 0, 6.283); ctx.fillStyle = "rgba(255,110,200,.5)"; ctx.fill(); ctx.strokeStyle = "#ffd0ee"; ctx.stroke(); ctx.restore();
    } else {   // clavier/souris : portrait + rangée de compétences en bas à droite (composition de la maquette)
      var px = W - 112, py = H - 112, r = 31, cy = H - 58, c3 = px - 18 - r;
      panel(px - 4, py - 4, 106, 112);
      var im = imgs["icon_" + h.id]; ctx.save(); rr(px, py, 98, 104, 8, "#1c1630", PINKL, 2); ctx.clip();
      if (im && im.naturalWidth) ctx.drawImage(im, px + 2, py + 2, 94, 100); ctx.restore();
      circle("ult", c3, cy, r, "ult", h.cd.ult, k.skills.ult.cd, "F"); circle("s2", c3 - 70, cy, r, "s2", h.cd.s2, k.skills.s2.cd, "R");
      circle("s1", c3 - 140, cy, r, "s1", h.cd.s1, k.skills.s1.cd, "E"); circle("atk", c3 - 210, cy, r, "atk", 0, 1, "Clic", true);
      if (k.meter) { var m = k.meter(h), mx = c3 - 210 - r, my = cy - r - 14; text(m.label + (m.text ? " " + m.text : ""), mx, my - 10, 12, "#d8d0ee"); rr(mx, my - 2, 4 * 70 - 8, 8, 4, "rgba(10,6,24,.85)", "#46386e", 1); if (m.v > 0) rr(mx + 1, my - 1, (4 * 70 - 10) * Math.min(1, m.v), 6, 3, m.full ? "#fff3a0" : m.col); }
    }
    if (touchUI && k.meter) {
      var m2 = k.meter(h), mx2 = W - 112 - 310, my2 = H - 118 + 58;
      text(m2.label + (m2.text ? " " + m2.text : ""), mx2, my2 - 12, 12, "#d8d0ee"); rr(mx2, my2 - 4, 150, 9, 4, "rgba(10,6,24,.85)", "#46386e", 1);
      if (m2.v > 0) rr(mx2 + 1, my2 - 3, 148 * Math.min(1, m2.v), 7, 3, m2.full ? "#fff3a0" : m2.col);
    }
  }

  function drawHud() {
    if (G.state === "select") { drawSelect(); return; }
    var hero = G.hero, def = TOWERS[heroTowerType()];
    var alive = G.enemies.length + (G.events.length - G.next);
    // haut gauche : vague + ennemis restants
    panel(0, 0, 196, 84);
    text("VAGUE " + Math.max(1, G.wave) + "/10", 18, 28, 26, "#fff");
    ctx.fillStyle = "#e8e0f0"; ctx.beginPath(); ctx.arc(26, 62, 9, 0, 6.283); ctx.fill(); ctx.fillRect(20, 62, 12, 8); ctx.fillStyle = "#14101e"; ctx.fillRect(21, 59, 4, 5); ctx.fillRect(28, 59, 4, 5);
    text(String(alive), 46, 62, 24, "#fff");
    // haut centre : séquence + 10 vagues
    var cx = W / 2; text("SÉQUENCE 1", cx, 24, 22, PINKL, "center");
    for (var i = 0; i < 10; i++) { var dx = cx - 108 + i * 24, done = i < G.wave, cur = i === G.wave - 1; ctx.fillStyle = done ? PINK : "rgba(10,8,18,.85)"; ctx.beginPath(); ctx.arc(dx, 52, 9, 0, 6.283); ctx.fill(); ctx.strokeStyle = cur ? "#fff" : "rgba(255,255,255,.18)"; ctx.lineWidth = cur ? 3 : 1.5; ctx.stroke(); }
    text("1", cx - 108, 76, 13, "#cfc6dc", "center"); text("10", cx + 108, 76, 13, "#cfc6dc", "center");
    // haut droite : cristaux + pause
    panel(W - 178, 0, 178, 64); gem(W - 150, 32, 11); text(String(G.gold), W - 126, 32, 30, "#fff");
    button(W - 56, 74, 44, 44, "", togglePause, G.paused); ctx.fillStyle = "#fff"; ctx.fillRect(W - 43, 86, 7, 20); ctx.fillRect(W - 30, 86, 7, 20);
    button(W - 108, 74, 44, 44, "", toggleFull, full);   // icône grand écran : quatre coins
    ctx.save(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.lineCap = "round"; var fx0 = W - 98, fy0 = 84, d = 8;
    [[0, 0, 1, 1], [24, 0, -1, 1], [0, 24, 1, -1], [24, 24, -1, -1]].forEach(function (c) { ctx.beginPath(); ctx.moveTo(fx0 + c[0] + c[2] * d, fy0 + c[1]); ctx.lineTo(fx0 + c[0], fy0 + c[1]); ctx.lineTo(fx0 + c[0], fy0 + c[1] + c[3] * d); ctx.stroke(); }); ctx.restore();
    drawControls();
    // barre de tourelles (bas centre) : tourelle du héros + verrous
    var bw = 372, bx0 = W / 2 - bw / 2 - (touchUI ? 0 : 60), by0 = H - 128;
    panel(bx0, by0, bw, 118); text("TOURELLES", bx0 + 14, by0 + 16, 14, "#cfc6dc");
    for (var s = 0; s < 3; s++) {
      var x = bx0 + 12 + s * 118, y = by0 + 28, w = 108, h = 82;
      if (s === 0) {
        button(x, y, w, h, "", toggleBuild, G.build); spr(def.spr + "0", x + w / 2, y + 52, .7);
        gem(x + w / 2 - 22, y + h - 10, 7); text(String(def.cost), x + w / 2 - 10, y + h - 9, 18, G.gold >= def.cost ? "#fff" : "#ff8a96");
      } else { rr(x, y, w, h, 10, "rgba(10,8,18,.7)", "rgba(255,255,255,.08)", 2); ctx.fillStyle = "#7b7592"; ctx.fillRect(x + w / 2 - 9, y + 28, 18, 14); ctx.strokeStyle = "#7b7592"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + w / 2, y + 28, 6, Math.PI, 0); ctx.stroke(); text("NIV. " + (s + 1), x + w / 2, y + h - 12, 14, "#7b7592", "center"); }
    }
    if (!touchUI && hero) {   // bas gauche : rappel des touches
      panel(0, H - 112, 250, 102);
      text("ZQSD / flèches : bouger", 14, H - 92, 13, "#cfc6dc", "left", false); text("Clic : attaquer · E R F : sorts", 14, H - 72, 13, "#cfc6dc", "left", false); text("B / Tab : construire", 14, H - 52, 13, "#cfc6dc", "left", false); text("G : grand écran · Échap : pause", 14, H - 32, 13, "#cfc6dc", "left", false);
    }
    if (G.sel) {
      var t = G.sel, st = t.st, td = TOWERS[t.type], px = 12, py = 100;
      panel(px, py, 268, 226);
      text(td.name + " · niv. " + (t.tier + 1), px + 14, py + 22, 18, "#fff");
      text("Dégâts " + +st.damage.toFixed(1) + " · " + +st.rate.toFixed(1) + "/s · portée " + +st.range.toFixed(1), px + 14, py + 48, 14, "#cfc6dc", "left", false);
      text(td.tag + (st.zaps > 1 ? " ×" + st.zaps : "") + (st.jumps ? " · chaîne " + st.jumps : ""), px + 14, py + 68, 14, "#cfc6dc", "left", false);
      if (t.tier < td.ups.length) {
        var u = td.ups[t.tier], ok = G.gold >= u.cost;
        button(px + 12, py + 86, 244, 128, "", function () { tryUpgrade(t); });
        text(u.name, px + 134, py + 110, 17, ok ? "#fff" : "#ff8a96", "center"); gem(px + 112, py + 136, 8); text(String(u.cost), px + 126, py + 136, 20, ok ? "#fff" : "#ff8a96");
        wrapText(u.desc, px + 134, py + 164, 220, 14, "#d8d0ee");
      } else text("NIVEAU MAXIMAL", px + 134, py + 150, 20, PINKL, "center");
    }
    if (G.toastT > 0) { ctx.globalAlpha = Math.min(1, G.toastT / .5); text(G.toast, W / 2, 132, 26, G.toastC, "center"); ctx.globalAlpha = 1; }
    if (G.paused) {
      ctx.fillStyle = "rgba(4,2,12,.6)"; ctx.fillRect(0, 0, W, H);
      var py2 = 110; panel(W / 2 - 230, py2, 460, 420); text("PAUSE", W / 2, py2 + 48, 44, PINKL, "center");
      button(W / 2 - 160, py2 + 90, 320, 52, "Reprendre", togglePause);
      button(W / 2 - 160, py2 + 152, 320, 52, "Changer de héros", function () { reset(false); });
      button(W / 2 - 160, py2 + 214, 320, 52, "Recommencer", function () { reset(true); });
      button(W / 2 - 160, py2 + 276, 320, 52, full ? "Quitter le grand écran" : "Grand écran", function () { setFull(!full); G.paused = false; });
      button(W / 2 - 160, py2 + 338, 320, 52, muted ? "Son : coupé" : "Son : activé", toggleSound);
    } else if (G.state === "prep") {
      text("Prépare ta défense : déplace-toi et construis.", W / 2, 112, 18, "#f2ecf6", "center", false);
      button(W / 2 - 150, 128, 300, 46, "LANCER LA SÉQUENCE", startSeq, false, null, 20);
      if (hero && hero.kit.provisional) text("Kit provisoire : ce héros n'est pas encore défini dans les documents.", W / 2, 196, 14, "#ffb0dc", "center", false);
    } else if (G.state === "win") endScreen("VICTOIRE", "Le Cœur tient bon : la séquence est vaincue.", "#ffd25e");
    else if (G.state === "lose") endScreen("DÉFAITE", "Le Cœur s'est effondré sous la corruption.", "#ff6a76");
    if (full && window.innerHeight > window.innerWidth) { ctx.fillStyle = "rgba(4,2,12,.9)"; ctx.fillRect(0, 0, W, H); text("Tourne ton téléphone en paysage", W / 2, H / 2, 34, "#ffd25e", "center"); }
  }
  function endScreen(title, body, col) {
    ctx.fillStyle = "rgba(4,2,12,.55)"; ctx.fillRect(0, 0, W, H);
    var w = 640, h = 300, x = (W - w) / 2, y = 150;
    panel(x, y, w, h); text(title, W / 2, y + 52, 52, col, "center");
    text(body, W / 2, y + 108, 19, "#f2ecf6", "center", false); text("Ennemis vaincus : " + G.kills + "  ·  Temps : " + clock(G.t), W / 2, y + 138, 19, "#f2ecf6", "center", false);
    button(W / 2 - 220, y + h - 124, 440, 50, "REJOUER", function () { reset(true); });
    button(W / 2 - 220, y + h - 66, 440, 46, "Changer de héros", function () { reset(false); }, false, "#ffd0ee", 18);
  }
  function wrapText(s, x, y, maxw, size, col) {
    ctx.font = "bold " + size + "px Nunito, system-ui, sans-serif"; var words = s.split(" "), line = "", ly = y;
    words.forEach(function (w) { var tt = line ? line + " " + w : w; if (ctx.measureText(tt).width > maxw && line) { text(line, x, ly, size, col, "center"); line = w; ly += size + 4; } else line = tt; });
    text(line, x, ly, size, col, "center");
  }
  function drawSelect() {
    ctx.fillStyle = "rgba(8,5,18,.86)"; ctx.fillRect(0, 0, W, H);
    text("CHOISIS TON HÉROS", W / 2, 54, 44, PINKL, "center");
    text("Tu le déplaces en temps réel pendant que tes tourelles défendent le Cœur.", W / 2, 92, 17, "#d8d0ee", "center", false);
    var n = HERO_ORDER.length, gap = 14, cw = Math.min(268, (W - 60 - gap * (n - 1)) / n), ch = 520, x0 = (W - (cw * n + gap * (n - 1))) / 2, y0 = 116;
    HERO_ORDER.forEach(function (id, i) {
      var k = KITS[id], x = x0 + i * (cw + gap), hot = mouse.x >= x && mouse.x <= x + cw && mouse.y >= y0 && mouse.y <= y0 + ch;
      rr(x, y0, cw, ch, 14, hot ? "rgba(46,30,70,.97)" : "rgba(26,20,44,.95)", hot ? PINKL : "rgba(255,255,255,.12)", 2);
      var im = imgs["big_" + id], sz = Math.min(cw - 16, 300), bob = Math.sin(time * 2 + i) * 3;
      if (im && im.naturalWidth) { ctx.drawImage(im, x + cw / 2 - sz / 2, y0 + 14 + bob, sz, sz); }
      text(k.name, x + cw / 2, y0 + sz + 34, 22, HCOL[id] || "#fff", "center"); text(k.role, x + cw / 2, y0 + sz + 60, 15, PINKL, "center", false);
      k.lines.forEach(function (l, j) { text(l, x + cw / 2, y0 + sz + 90 + j * 20, 13, "#cfc6dc", "center", false); });
      if (k.provisional) text("kit provisoire", x + cw / 2, y0 + ch - 82, 12, "#ffb0dc", "center", false);
      button(x + 16, y0 + ch - 62, cw - 32, 46, "JOUER", function () { pickHero(id); }, false, null, 22);
      buttons.push({ x: x, y: y0, w: cw, h: ch - 66, f: function () { pickHero(id); } });
    });
  }

  // ---------- boucle & entrées ----------
  var last = 0;
  function frame(ts) {
    if (!last) last = ts; var dt = Math.min(.1, (ts - last) / 1000); last = ts;
    for (var i = 0; i < SPEED; i++) update(dt);
    draw(); requestAnimationFrame(frame);
  }
  // position dans le repère logique du jeu : tient compte de la zone réellement affichée (bandes noires du plein écran) et des zones sûres
  function cpos(ev) {
    var r = cv.getBoundingClientRect(), sc = Math.min(r.width / CW, r.height / H) || 1, ox = (r.width - CW * sc) / 2, oy = (r.height - H * sc) / 2;
    return { x: (ev.clientX - r.left - ox) / sc - SL, y: (ev.clientY - r.top - oy) / sc };
  }
  function hitRect(p) { for (var i = buttons.length - 1; i >= 0; i--) { var b = buttons[i]; if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b; } return null; }
  function hitCircle(p) { var pad = touchUI ? 16 : 8; for (var i = ctl.length - 1; i >= 0; i--) { var c = ctl[i]; if (Math.hypot(p.x - c.x, p.y - c.y) <= c.r + pad) return c; } return null; }
  cv.addEventListener("pointermove", function (e) {
    var p = cpos(e); mouse = p; mouseIn = true; if (e.pointerType === "mouse") touchUI = false;
    if (e.pointerType === "mouse") hover = slotAt(toWorld(p.x, p.y));
    var pt = ptrs[e.pointerId]; if (!pt) return;
    if (pt.k === "joy") { var dx = p.x - joy.bx, dy = p.y - joy.by, l = Math.hypot(dx, dy), m = Math.min(1, l / 70); if (l > 0) { dx /= l; dy /= l; } joy.dx = l < 10 ? 0 : dx * m; joy.dy = l < 10 ? 0 : dy * m; pt.moved = pt.moved || Math.hypot(p.x - pt.x0, p.y - pt.y0) > 14; }
    else if (pt.k === "skill" && !pt.self) {
      var vx = p.x - pt.cx, vy = p.y - pt.cy, vl = Math.hypot(vx, vy);
      if (vl > 16) { pt.drag = true; aimSt = { key: pt.key, aim: aimFor(pt.key, { dx: vx, dy: vy, len: vl }) }; }
    }
  });
  cv.addEventListener("pointerleave", function () { mouseIn = false; });
  ["touchstart", "touchmove"].forEach(function (n) { cv.addEventListener(n, function (e) { e.preventDefault(); }, { passive: false }); });   // pas de défilement / zoom pendant le jeu
  cv.addEventListener("pointerdown", function (e) {
    var p = cpos(e); mouse = p; startAmbient(); touchUI = e.pointerType !== "mouse";
    if (e.button === 2) { cancel(); return; }
    try { cv.setPointerCapture(e.pointerId); } catch (x) {}
    var b = hitRect(p); if (b) { play("click", .5); b.f(); return; }
    if (!G.hero || G.paused || (G.state !== "play" && G.state !== "prep")) return;
    var c = hitCircle(p);
    if (c) {
      if (c.id === "atk") ptrs[e.pointerId] = { k: "atk" };
      else ptrs[e.pointerId] = { k: "skill", key: c.id, cx: c.x, cy: c.y, drag: false, self: G.hero.kit.skills[c.id].aim.type === "self" };
      return;
    }
    if (e.pointerType !== "mouse") {
      if (p.x < W * .5) { joy.on = true; joy.id = e.pointerId; joy.bx = Math.max(90, Math.min(W * .5 - 20, p.x)); joy.by = Math.max(110, Math.min(H - 90, p.y)); joy.dx = joy.dy = 0; ptrs[e.pointerId] = { k: "joy", x0: p.x, y0: p.y, t0: performance.now(), moved: false }; }
      else worldClick(p.x, p.y);
      return;
    }
    hover = slotAt(toWorld(p.x, p.y));
    if (!worldClick(p.x, p.y)) ptrs[e.pointerId] = { k: "matk" };
  });
  function release(e) {
    var pt = ptrs[e.pointerId]; if (!pt) return;
    if (pt.k === "joy") { joy.on = false; joy.dx = joy.dy = 0; if (!pt.moved && performance.now() - pt.t0 < 300) { var p = cpos(e); worldClick(p.x, p.y); } }
    else if (pt.k === "skill") { var tA = null; if (pt.drag && aimSt && aimSt.key === pt.key) tA = aimSt.aim; aimSt = null; if (tA) castWithAim(pt.key, tA); else castSkill(pt.key); }
    delete ptrs[e.pointerId];
  }
  cv.addEventListener("pointerup", release); cv.addEventListener("pointercancel", release);
  cv.addEventListener("contextmenu", function (e) { e.preventDefault(); cancel(); });
  window.addEventListener("keydown", function (e) {
    if (!loaded || !L) return; var k = e.code; keys[k] = true; touchUI = false;
    if (k === "Escape") { if (!cancel()) togglePause(); }
    else if (k === "KeyP") togglePause();
    else if (k === "Enter") { if (G.state === "select") pickHero("noctis"); else if (G.state === "prep" && !G.paused) startSeq(); }
    else if (k === "KeyB" || k === "Tab" || k === "Digit1") { toggleBuild(); e.preventDefault(); }
    else if (k === "KeyE") castSkill("s1");
    else if (k === "KeyR") castSkill("s2");
    else if (k === "KeyF") castSkill("ult");
    else if (k === "KeyM") toggleSound();
    else if (k === "KeyG") toggleFull();
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(k) >= 0 && (G.state === "play" || G.state === "prep" || G.state === "select")) e.preventDefault();
    startAmbient();
  });
  window.addEventListener("keyup", function (e) { keys[e.code] = false; });
  window.addEventListener("blur", function () { keys = {}; ptrs = {}; joy.on = false; aimSt = null; });
  function toggleSound() { muted = !muted; if (ambient) ambient.volume = muted ? 0 : .2; var b = document.querySelector("[data-ash-sound]"); if (b) { b.setAttribute("aria-pressed", String(!muted)); b.textContent = muted ? "🔇 Son coupé" : "🔊 Son"; } }
  var sb = document.querySelector("[data-ash-sound]"); if (sb) sb.addEventListener("click", toggleSound);
  var fb = document.querySelector("[data-ash-full]"); if (fb) fb.addEventListener("click", function () { setFull(!full); });

  window.__ash = { get G() { return G; }, slots: function () { return slots; }, build: function (i) { tryBuild(slots[i]); }, upgrade: function (i) { tryUpgrade(slots[i].tower); }, start: startSeq, reset: reset, pick: pickHero, setFull: setFull, joy: joy, W: function () { return W; }, cast: castSkill, attack: heroAttack, ctl: function () { return ctl; }, view: function () { return { CW: CW, SL: SL, SR: SR, H: H, RS: RS, W: W }; }, RS: function () { return RS; }, toggleFull: toggleFull, tstats: tstats, TOWERS: TOWERS };
  boot();
})();
