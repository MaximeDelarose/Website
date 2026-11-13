/* Ashbound Tower — prototype navigateur (étapes 1-2 : arène + héros jouable).
   Portage HTML5 du prototype Unity (ashbound-tower/) : mêmes données, même tracé, mêmes sprites.
   Vue 3/4 : sol écrasé (sin 55°), sprites debout triés par profondeur. Tout est dessiné dans un seul canvas.
   Commandes : clavier ZQSD/WASD + souris, ou tactile façon Mobile Legends (joystick à gauche, attaque et compétences à droite). */
(function () {
  "use strict";
  var cv = document.getElementById("ash");
  if (!cv) return;
  var ctx = cv.getContext("2d");
  var W = 1152, H = 720, OX = 0, PPU = 32, SY = Math.sin(55 * Math.PI / 180), TOP = 104, GW = 36, GH = 20, MAPW = 1152;
  var params = new URLSearchParams(location.search);
  var SPEED = Math.min(30, Math.max(1, parseFloat(params.get("speed")) || 1));
  var BASE = "ashbound/";
  var wrap = document.getElementById("ashwrap");

  // ---------- données (valeurs provisoires identiques au projet Unity) ----------
  var ENEMY = {
    orb:   { name: "Spectre corrompu", kind: "std", hp: 55, speed: 2.3, dmg: 4, gold: 4, spr: "enemy_orb", fps: 4, scale: 1, shadow: 1.3, bar: 1.0 },
    scout: { name: "Fureteur d'ombre", kind: "std", hp: 30, speed: 4.2, dmg: 3, gold: 3, spr: "enemy_scout", fps: 8, scale: 1, shadow: 1.5, bar: 1.0 },
    elite: { name: "Gardien de cendre", kind: "elite", hp: 240, speed: 1.5, dmg: 15, gold: 30, spr: "enemy_elite", fps: 2.5, scale: .9, shadow: 2.2, bar: 1.6, always: true },
    mini:  { name: "Broyeur de ruines", kind: "mini", hp: 1000, speed: 1.2, dmg: 35, gold: 90, spr: "enemy_miniboss", fps: 2, scale: .85, shadow: 3.4, bar: 2.4, always: true },
    boss:  { name: "Seigneur de Cendre", kind: "boss", hp: 3600, speed: .9, dmg: 100, gold: 250, spr: "enemy_boss", fps: 2, scale: .8, shadow: 4.2, bar: 3.2, always: true }
  };
  var BASE_STATS = { damage: 8, rate: 1.6, range: 5.5, zaps: 1, jumps: 0, radius: 2.8, falloff: .7 };
  var UPS = [
    { name: "Décharges multiples", desc: "3 éclairs par salve, sur des cibles différentes.", cost: 60, m: { zaps: 2, dmg: .85 } },
    { name: "Éclairs en chaîne", desc: "Chaque éclair rebondit sur 2 ennemis proches.", cost: 110, m: { jumps: 2, radius: .5 } },
    { name: "Surtension", desc: "Dégâts, cadence, portée et rebonds accrus.", cost: 180, m: { dmg: 1.5, rate: 1.25, range: 1, jumps: 2 } }
  ];
  var TOWER_COST = 50, START_GOLD = 150, HEART_MAX = 100;
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
  var NOMINAL = 300;

  // Héros (Google Doc). Seul l'Épéiste est jouable pour l'instant ; les autres apparaissent verrouillés.
  var HEROES = [
    { id: "epeiste", name: "L'Épéiste électrique", role: "Mêlée · Foudre", spr: "hero_epeiste", playable: true,
      lines: ["Combo d'épée en 3 coups", "Frappe d'Attraction, Foudre Ancrée", "Tempête de Foudre : booste les tourelles"] },
    { id: "noctis", name: "Noctis", role: "Distance · Spectre", spr: "hero_noctis", playable: false,
      lines: ["Éclats convergents, Traversée Fantôme", "Failles spectrales, clones, ombres"] },
    { id: "eglantyne", name: "Églantyne", role: "Invocation · Nature", spr: "hero_eglantyne", playable: false,
      lines: ["Graines de ronce, Calice de l'Effroi", "Poupées vaudou, Arbre Monde"] }
  ];
  var HSPEED = 6.2, STORM_R = 5.5, STORM_DUR = 8;
  var COMBO = [
    { rng: 2.2, arc: 100, dmg: 14, dur: .30, lunge: .55, kb: .25 },
    { rng: 2.6, arc: 150, dmg: 20, dur: .34, lunge: .6, kb: .35 },
    { rng: 3.5, arc: 215, dmg: 42, dur: .46, lunge: 1.0, kb: .9 }
  ];

  // ---------- ressources ----------
  var imgs = {}, snd = {}, L = null, loaded = false, muted = false;
  var IMGS = ["ground", "fx_shadow", "heart_0", "heart_1", "brazier_0", "brazier_1", "tower_orb_0", "tower_orb_1", "tower_orb_2", "tower_orb_3",
    "bones", "crystal", "mushroom", "rock", "rock_small", "ruin_arch", "ruin_pillar", "tree_dead", "tree_teal"];
  Object.keys(ENEMY).forEach(function (k) { IMGS.push(ENEMY[k].spr + "_0", ENEMY[k].spr + "_1"); });
  HEROES.forEach(function (h) { IMGS.push(h.spr + "_0", h.spr + "_1"); });
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
    try { var a = snd[n].cloneNode(); a.volume = Math.min(1, (vol || 1) * .7); a.playbackRate = (rate || 1) * (1 + (Math.random() - .5) * .12); a.play().catch(function () {}); } catch (e) {}
  }
  var ambient = null;
  function startAmbient() {
    if (ambient || !snd.ambient) return;
    ambient = snd.ambient; ambient.loop = true; ambient.volume = muted ? 0 : .2; ambient.play().catch(function () { ambient = null; });
  }

  // ---------- état ----------
  var path, cum, LEN, slots, decor, G, hover = null, mouse = { x: -1, y: -1 }, buttons = [], time = 0, ctl = [];
  var keys = {}, ptrs = {}, joy = { on: false, id: -1, bx: 0, by: 0, dx: 0, dy: 0 }, touchUI = false, full = false, mouseIn = false;
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function init() {
    if (!L) { ctx.fillStyle = "#09060f"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#fff"; ctx.font = "20px sans-serif"; ctx.fillText("Impossible de charger le jeu.", 40, 60); return; }
    path = L.path.map(function (p) { return [p.x, p.z]; });
    cum = [0]; for (var i = 1; i < path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
    LEN = cum[cum.length - 1];
    slots = L.slots.map(function (s) { return { x: s.x, z: s.z, tower: null }; });
    decor = L.decor;
    touchUI = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    reset(false); resize(); requestAnimationFrame(frame);
  }

  function newHero(def) {
    var s = path[Math.floor(path.length * .5)];
    return { def: def, x: L.heart.x - 4.5, z: L.heart.z + 4, face: Math.PI, moving: false, combo: 0, comboT: 0, atkCd: 0, swing: 0, charge: 0, cd: { s1: 0, s2: 8, ult: 25 }, dash: null, storm: 0, stormTick: 0, lunge: null };
  }
  function reset(keepHero) {
    var ev = [], r = mulberry(1234), t0 = 10, dt = 27;
    WAVES.forEach(function (w, i) { w[1].forEach(function (g) { for (var k = 0; k < g[1]; k++) ev.push({ t: t0 + dt * i + g[3] + k * g[2], e: g[0], lat: lat(r, g[0]) }); }); });
    TRICKLE.forEach(function (tr) { for (var t = tr[1]; t <= tr[2]; t += tr[3]) { var n = tr[4] + Math.floor(r() * (tr[5] - tr[4] + 1)); for (var k = 0; k < n; k++) ev.push({ t: t + k * tr[6], e: tr[0], lat: lat(r, tr[0]) }); } });
    ev.sort(function (a, b) { return a.t - b.t; });
    slots.forEach(function (s) { s.tower = null; });
    var hero = keepHero && G && G.hero ? newHero(G.hero.def) : null;
    G = { state: hero ? "prep" : "select", paused: false, t: 0, events: ev, next: 0, wave: 0, gold: START_GOLD, heart: HEART_MAX, enemies: [], towers: [], parts: [], bolts: [], fx: [], pending: [],
      toast: "", toastT: 0, toastC: "#fff", build: false, sel: null, shake: 0, flashHeart: 0, kills: 0, anim: 0, hero: hero, pick: 0 };
    hover = null; ptrs = {}; joy.on = false;
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
  function stats(tier) {
    var s = {}; for (var k in BASE_STATS) s[k] = BASE_STATS[k];
    for (var i = 0; i < tier; i++) { var m = UPS[i].m; s.damage *= m.dmg || 1; s.rate *= m.rate || 1; s.range += m.range || 0; s.zaps += m.zaps || 0; s.jumps += m.jumps || 0; s.radius += m.radius || 0; }
    return s;
  }
  function ep(e) { var p = pos(e.d); return { x: p.x - p.dz * e.lat + e.ox, z: p.z + p.dx * e.lat + e.oz, dx: p.dx }; }
  function sh(name) { var im = imgs[name]; return im && im.naturalHeight ? im.naturalHeight : 48; }

  // ---------- projection / taille d'écran ----------
  function sx(x) { return OX + (x + GW / 2) * PPU; }
  function sy(z) { return TOP + (GH / 2 - z) * PPU * SY; }
  function toWorld(px, py) { return { x: (px - OX) / PPU - GW / 2, z: GH / 2 - (py - TOP) / (PPU * SY) }; }
  function resize() {
    var nw = 1152;
    if (full) { var asp = window.innerWidth / Math.max(1, window.innerHeight); nw = Math.max(960, Math.min(1700, Math.round(H * asp))); }
    W = nw; OX = Math.round((W - MAPW) / 2); cv.width = W; cv.height = H;
  }
  function setFull(on) {
    if (full === on || !wrap) return; full = on;
    if (on) {
      wrap.style.cssText = "position:fixed;inset:0;z-index:99999;background:#000;padding:0;border:0;border-radius:0;display:flex;align-items:center;justify-content:center";
      cv.style.cssText = "display:block;width:100%;height:100%;object-fit:contain;image-rendering:pixelated;touch-action:none;user-select:none;-webkit-user-select:none";
      document.body.style.overflow = "hidden";
      try { var el = document.documentElement; if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().then(function () { if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(function () {}); }).catch(function () {}); } catch (e) {}
    } else {
      wrap.style.cssText = "padding:8px;background:#09060f";
      cv.style.cssText = "display:block;width:100%;height:auto;image-rendering:pixelated;touch-action:none;border-radius:8px";
      document.body.style.overflow = "";
      try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); } catch (e) {}
    }
    resize();
  }
  window.addEventListener("resize", function () { if (loaded) resize(); });

  // ---------- logique générale ----------
  function startSeq() { if (G.state !== "prep") return; G.state = "play"; G.t = 0; play("wave", .8); startAmbient(); }
  function endState(s) { if (G.state !== "play") return; G.state = s; play(s === "win" ? "win" : "lose"); }
  function burst(x, y, col, n, spd, life, size) {
    for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, v = spd * (.3 + Math.random() * .7); G.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * .4, life: life * (.6 + Math.random() * .6), max: life, s: size * (.6 + Math.random() * .6), c: col }); }
  }
  function spawn(ev) { var d = ENEMY[ev.e]; G.enemies.push({ k: ev.e, def: d, d: 0, hp: d.hp, lat: ev.lat, flash: 0, age: 0, dead: false, ph: Math.random() * 4, ox: 0, oz: 0, stun: 0 }); if (ev.e === "boss") play("boss"); }
  function aim(e) { var p = ep(e); return { x: sx(p.x), y: sy(p.z) - sh(e.def.spr + "_0") * e.def.scale * .5 }; }
  function dmgEnemy(e, a) {
    if (e.dead || a <= 0) return;
    e.hp -= a; e.flash = .12; play("hit", .5);
    var p = aim(e); burst(p.x, p.y, "#7fe8ff", 3, 90, .3, 3);
    if (e.hp <= 0) {
      e.dead = true; G.gold += e.def.gold; G.kills++; play("death", .7);
      burst(p.x, p.y, "#b278ff", 12 + (e.def.kind === "boss" ? 40 : e.def.kind === "mini" ? 24 : e.def.kind === "elite" ? 12 : 0), 140, .7, 5);
    }
  }
  function muzzle(t) { return { x: sx(t.s.x), y: sy(t.s.z) - 48 }; }
  function bolt(a, b) { G.bolts.push({ a: a, b: b, life: .14, pts: jag(a, b, 18), flick: false }); burst(b.x, b.y, "#9ff4ff", 4, 110, .25, 3); }
  function jag(a, b, amp) {
    var pts = [a], n = 7, dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    for (var i = 1; i < n; i++) { var t = i / n, o = (Math.random() - .5) * amp; pts.push({ x: a.x + dx * t + nx * o, y: a.y + dy * t + ny * o }); }
    pts.push(b); return pts;
  }
  function inRange(t, st) {
    var out = [];
    G.enemies.forEach(function (e) { if (e.dead) return; var p = ep(e); if (Math.hypot(p.x - t.s.x, p.z - t.s.z) <= st.range) out.push(e); });
    out.sort(function (a, b) { return b.d - a.d; }); return out;
  }
  function nearest(x, z, r, ex) {
    var best = null, bd = r;
    G.enemies.forEach(function (e) { if (e.dead || ex.indexOf(e) >= 0) return; var p = ep(e), d = Math.hypot(p.x - x, p.z - z); if (d <= bd) { bd = d; best = e; } });
    return best;
  }
  function fire(t) {
    var st = stats(t.tier), tg = inRange(t, st);
    if (!tg.length) return false;
    var m = muzzle(t), distinct = Math.min(st.zaps, tg.length);
    for (var z = 0; z < st.zaps; z++) {
      var cur = tg[z % distinct]; if (cur.dead) continue;
      var hit = [], dmg = st.damage, origin = m;
      for (var j = 0; j <= st.jumps; j++) {
        hit.push(cur); var a = aim(cur), p = ep(cur);
        bolt(origin, a); dmgEnemy(cur, dmg);
        if (j === st.jumps) break;
        var nx = nearest(p.x, p.z, st.radius, hit); if (!nx) break;
        dmg *= st.falloff; origin = a; cur = nx;
      }
    }
    t.punch = .6; play("zap", .55); return true;
  }

  // ---------- héros ----------
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
  function aimAngle() {
    var h = G.hero;
    if (!touchUI && mouseIn && mouse.y > TOP) { var m = mouseWorld(); return Math.atan2(m.z - h.z, m.x - h.x); }
    var best = null, bd = 6;
    G.enemies.forEach(function (e) { var p = ep(e), d = Math.hypot(p.x - h.x, p.z - h.z); if (d < bd) { bd = d; best = p; } });
    return best ? Math.atan2(best.z - h.z, best.x - h.x) : h.face;
  }
  function angDiff(a, b) { var d = a - b; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283; return Math.abs(d); }
  function atkSpeed() { return 1 + .6 * G.hero.charge / 100; }
  function heroAttack() {
    var h = G.hero; if (h.atkCd > 0 || h.dash) return;
    var a = aimAngle(); h.face = a;
    var c = h.comboT > 0 ? h.combo % 3 : 0, st = COMBO[c];
    h.combo = c + 1; h.comboT = st.dur + .9; h.atkCd = st.dur / atkSpeed(); h.swing = st.dur;
    h.lunge = { dx: Math.cos(a) * st.lunge, dz: Math.sin(a) * st.lunge, t: .12 };
    var ahead = false;
    G.enemies.forEach(function (e) {
      if (e.dead) return; var p = ep(e), d = Math.hypot(p.x - h.x, p.z - h.z);
      if (d > st.rng + .45) return;
      if (d > .6 && angDiff(Math.atan2(p.z - h.z, p.x - h.x), a) > st.arc * Math.PI / 360) return;
      ahead = true; dmgEnemy(e, st.dmg);
      if (!e.dead) { e.ox += Math.cos(a) * st.kb; e.oz += Math.sin(a) * st.kb; if (c === 2) e.stun = Math.max(e.stun, .25); }
    });
    G.fx.push({ k: "slash", x: h.x, z: h.z, a: a, rng: st.rng, arc: st.arc * Math.PI / 180, t: 0, dur: st.dur + .08, big: c === 2 });
    play(c === 2 ? "zap" : "hit", c === 2 ? .8 : .45, c === 2 ? .8 : 1.15 + c * .1);
    if (c === 2) G.shake = Math.max(G.shake, .12);
    // passif : charge électrique
    var wasFull = h.charge >= 100; h.charge = Math.min(100, h.charge + (ahead ? 12 : 6));
    if (wasFull) { h.charge = 0; discharge(); }
  }
  function discharge() {
    var h = G.hero;
    G.fx.push({ k: "ring", x: h.x, z: h.z, r: 3.6, t: 0, dur: .45, col: "#7ff0ff" }); play("zap", 1, .6); G.shake = Math.max(G.shake, .2);
    G.enemies.forEach(function (e) { if (e.dead) return; var p = ep(e); if (Math.hypot(p.x - h.x, p.z - h.z) <= 3.6) { dmgEnemy(e, 40); if (!e.dead) e.stun = Math.max(e.stun, .5); } });
    toast("Décharge !", "#7ff0ff");
  }
  function skill1() {
    var h = G.hero; if (h.cd.s1 > 0) return false;
    var a = aimAngle(), dx = Math.cos(a), dz = Math.sin(a); h.face = a; h.cd.s1 = 7; h.swing = .3; h.combo = 0; h.comboT = 0;
    var len = 6.5, hw = 1.7;
    G.fx.push({ k: "pull", x: h.x, z: h.z, a: a, len: len, hw: hw, t: 0, dur: .6 });
    G.enemies.forEach(function (e) {
      if (e.dead) return; var p = ep(e), rx = p.x - h.x, rz = p.z - h.z, along = rx * dx + rz * dz, perp = -rx * dz + rz * dx;
      if (along < -.5 || along > len || Math.abs(perp) > hw) return;
      var tx = h.x + dx * Math.max(1, along), tz = h.z + dz * Math.max(1, along);
      e.ox += (tx - p.x) * .9; e.oz += (tz - p.z) * .9; e.stun = Math.max(e.stun, .5); dmgEnemy(e, 14);
    });
    play("zap", .9, .7); G.shake = Math.max(G.shake, .1); gainCharge(10); return true;
  }
  function gainCharge(n) { var h = G.hero; h.charge = Math.min(100, h.charge + n); }
  function skill2() {
    var h = G.hero; if (h.cd.s2 > 0) return false;
    var a = aimAngle(), dx = Math.cos(a), dz = Math.sin(a); h.face = a; h.cd.s2 = 12; h.swing = .3; h.combo = 0; h.comboT = 0;
    var sx0 = clampX(h.x + dx * 3.2), sz0 = clampZ(h.z + dz * 3.2), f = { k: "anchor", x: sx0, z: sz0, t: 0, dur: .8 };
    G.fx.push(f); h.dash = { dx: -dx, dz: -dz, t: .22 };
    G.pending.push({ t: .55, f: function () {
      var top = { x: sx(sx0) + 14, y: sy(sz0) - 560 }, bot = { x: sx(sx0), y: sy(sz0) - 18 };
      G.bolts.push({ a: top, b: bot, life: .3, pts: jag(top, bot, 30), flick: false, big: true });
      G.fx.push({ k: "ring", x: sx0, z: sz0, r: 3.3, t: 0, dur: .5, col: "#e9ffff", flash: true });
      G.enemies.forEach(function (e) { if (e.dead) return; var p = ep(e); if (Math.hypot(p.x - sx0, p.z - sz0) <= 3.3) { dmgEnemy(e, 60); if (!e.dead) e.stun = Math.max(e.stun, 1.2); } });
      play("zap", 1, .55); G.shake = Math.max(G.shake, .25); gainCharge(20);
    } });
    play("click", .8, .8); return true;
  }
  function skillUlt() {
    var h = G.hero; if (h.cd.ult > 0 || h.storm > 0) return false;
    h.cd.ult = 60; h.storm = STORM_DUR; h.stormTick = 0; play("boss", .7, 1.2); toast("Tempête de Foudre !", "#ffd25e"); G.shake = Math.max(G.shake, .3); return true;
  }
  function clampX(x) { return Math.max(-17.4, Math.min(17.4, x)); }
  function clampZ(z) { return Math.max(-9.4, Math.min(9.4, z)); }
  function updateHero(dt) {
    var h = G.hero; if (!h) return;
    ["s1", "s2", "ult"].forEach(function (k) { if (h.cd[k] > 0) h.cd[k] = Math.max(0, h.cd[k] - dt); });
    if (h.atkCd > 0) h.atkCd -= dt; if (h.comboT > 0) h.comboT -= dt; if (h.swing > 0) h.swing -= dt;
    var mv = moveVec(), l = Math.hypot(mv.x, mv.z);
    h.moving = l > .05;
    if (h.dash) { h.x = clampX(h.x + h.dash.dx * 11 * dt); h.z = clampZ(h.z + h.dash.dz * 11 * dt); h.dash.t -= dt; if (h.dash.t <= 0) h.dash = null; }
    else {
      var sp = HSPEED * (h.swing > 0 ? .55 : 1);
      if (h.moving) { h.x = clampX(h.x + mv.x * sp * dt); h.z = clampZ(h.z + mv.z * sp * dt); if (h.swing <= 0) h.face = Math.atan2(mv.z, mv.x); }
      if (h.lunge && h.lunge.t > 0) { var k = Math.min(dt, h.lunge.t) / .12; h.x = clampX(h.x + h.lunge.dx * k); h.z = clampZ(h.z + h.lunge.dz * k); h.lunge.t -= dt; }
    }
    if ((keys.Space || attackHeld()) && G.state !== "select") heroAttack();
    if (h.storm > 0) {
      h.storm -= dt; h.stormTick -= dt;
      if (h.stormTick <= 0) {
        h.stormTick = .32;
        var inR = G.enemies.filter(function (e) { var p = ep(e); return !e.dead && Math.hypot(p.x - h.x, p.z - h.z) <= STORM_R + 1; });
        if (inR.length) {
          var e = inR[Math.floor(Math.random() * inR.length)], p = aim(e), top = { x: p.x + (Math.random() - .5) * 60, y: p.y - 520 };
          G.bolts.push({ a: top, b: p, life: .2, pts: jag(top, p, 26), flick: false, big: true }); dmgEnemy(e, 24); play("zap", .5, 1.3);
        }
      }
    }
  }
  function attackHeld() { for (var id in ptrs) if (ptrs[id].k === "atk" || ptrs[id].k === "matk") return true; return false; }

  function update(dt) {
    G.anim += dt; time += dt;
    if (G.toastT > 0) G.toastT -= dt;
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt);
    if (G.flashHeart > 0) G.flashHeart -= dt;
    if (G.paused || G.state === "select") return;
    G.parts = G.parts.filter(function (p) { p.life -= dt; p.vy += 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt; return p.life > 0; });
    G.bolts = G.bolts.filter(function (b) { b.life -= dt; if (!b.flick && b.life < .07) { b.flick = true; b.pts = jag(b.a, b.b, b.big ? 30 : 18); } return b.life > 0; });
    G.fx = G.fx.filter(function (f) { f.t += dt; return f.t < f.dur; });
    G.pending = G.pending.filter(function (p) { p.t -= dt; if (p.t <= 0) { p.f(); return false; } return true; });
    G.towers.forEach(function (t) { if (t.punch > 0) t.punch = Math.max(0, t.punch - dt * 6); });
    if (G.state === "win" || G.state === "lose") return;
    updateHero(dt);
    if (G.state !== "play") return;
    G.t += dt;
    while (G.next < G.events.length && G.events[G.next].t <= G.t) spawn(G.events[G.next++]);
    var w = 0; WAVES.forEach(function (_, i) { if (10 + 27 * i <= G.t) w = i + 1; });
    if (w !== G.wave) { G.wave = w; if (w) { toast(WAVES[w - 1][0], "#ffd25e"); play("wave", .7); } }
    var h = G.hero;
    G.towers.forEach(function (t) {
      var boost = h && h.storm > 0 && Math.hypot(h.x - t.s.x, h.z - t.s.z) <= STORM_R ? 1.6 : 1;
      t.cd -= dt * boost; if (t.cd <= 0) t.cd = fire(t) ? 1 / stats(t.tier).rate : .08;
    });
    G.enemies.forEach(function (e) {
      if (e.dead) return;
      e.age += dt; if (e.flash > 0) e.flash -= dt;
      if (e.stun > 0) e.stun -= dt; else { e.d += e.def.speed * dt; var k = Math.exp(-2.5 * dt); e.ox *= k; e.oz *= k; }
      if (e.age > 4 * LEN / e.def.speed + 12) { e.dead = true; return; }
      if (e.d >= LEN) { e.dead = true; hurtHeart(e.def.dmg); }
    });
    G.enemies = G.enemies.filter(function (e) { return !e.dead; });
    if (G.heart > 0 && G.next >= G.events.length && !G.enemies.length) endState("win");
  }
  function hurtHeart(a) {
    if (G.state !== "play" || G.heart <= 0) return;
    G.heart = Math.max(0, G.heart - a); G.shake = .3; G.flashHeart = .35; play("heart_hit");
    burst(sx(L.heart.x), sy(L.heart.z) - 50, "#b278ff", 14, 150, .6, 5);
    if (G.heart <= 0) endState("lose");
  }

  // ---------- actions joueur (construction) ----------
  function slotAt(w) {
    var best = null, bd = 1.4;
    slots.forEach(function (s) { var d = Math.hypot(s.x - w.x, s.z - w.z); if (d <= bd) { bd = d; best = s; } });
    return best;
  }
  function tryBuild(s) {
    if (G.gold < TOWER_COST) { play("error", .6); toast("Pas assez d'or (" + TOWER_COST + " requis)", "#ff8a8a"); return; }
    G.gold -= TOWER_COST; var t = { s: s, tier: 0, cd: 0, punch: 0 }; s.tower = t; G.towers.push(t);
    play("build", .9); burst(sx(s.x), sy(s.z), "#8c85bf", 16, 110, .7, 5); toast("Orbe foudroyant construit", "#9bffd0");
    G.sel = t; G.build = false;
  }
  function tryUpgrade(t) {
    if (!t || t.tier >= UPS.length) return;
    var u = UPS[t.tier];
    if (G.gold < u.cost) { play("error", .6); toast("Pas assez d'or", "#ff8a8a"); return; }
    G.gold -= u.cost; t.tier++; t.punch = 1; play("upgrade", .9);
    var m = muzzle(t); burst(m.x, m.y, "#6af0ff", 24, 160, .8, 5); toast(u.name + " !", "#7ff0ff");
  }
  function toggleBuild() { if (G.state === "play" || G.state === "prep") { G.build = !G.build; if (G.build) G.sel = null; } }
  function cancel() { if (G.build) { G.build = false; return true; } if (G.sel) { G.sel = null; return true; } return false; }
  function togglePause() { if (G.state === "play" || G.state === "prep") { G.paused = !G.paused; ptrs = {}; joy.on = false; } }
  function worldClick(px, py) {
    if (G.paused || (G.state !== "play" && G.state !== "prep") || py < TOP - 8) return false;
    var w = toWorld(px, py), s = slotAt(w);
    if (G.build) { if (!s) return true; if (s.tower) { G.sel = s.tower; G.build = false; } else tryBuild(s); return true; }
    if (s && s.tower) { G.sel = s.tower; return true; }
    if (G.sel) { G.sel = null; return true; }
    return false;
  }
  function pickHero(i) {
    var d = HEROES[i]; if (!d || !d.playable) { play("error", .5); toast("Ce héros arrive bientôt", "#ff8a8a"); return; }
    G.hero = newHero(d); G.state = "prep"; play("click", .6); startAmbient();
    if (touchUI) setFull(true);
  }

  // ---------- rendu ----------
  function rr(x, y, w, h, r, fill, stroke) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }
  function panel(x, y, w, h) { rr(x, y, w, h, 8, "rgba(20,14,40,.94)", "#9a7a2a"); rr(x + 4, y + 4, w - 8, h - 8, 5, null, "rgba(255,255,255,.07)"); }
  function text(s, x, y, size, col, al, bold) {
    ctx.font = (bold === false ? "" : "bold ") + size + "px Nunito, system-ui, sans-serif"; ctx.textAlign = al || "left"; ctx.textBaseline = "middle";
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(8,4,18,.9)"; ctx.strokeText(s, x, y); ctx.fillStyle = col || "#f2e8d0"; ctx.fillText(s, x, y);
  }
  function button(x, y, w, h, label, f, hot, col, fs, dis) {
    var h2 = !dis && mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;
    rr(x, y, w, h, 8, dis ? "#1d1a2a" : hot ? "#2f5a52" : h2 ? "#3d3070" : "#2c2150", dis ? "#3a3550" : h2 ? "#6af0ff" : "#8a6ee0");
    if (label) text(label, x + w / 2, y + h / 2 + 1, fs || 22, dis ? "#6c6688" : col || "#ffd25e", "center");
    buttons.push({ x: x, y: y, w: w, h: h, f: f });
  }
  function spr(name, x, y, scale, flip, alpha) {
    var im = imgs[name]; if (!im || !im.naturalWidth) return;
    var w = im.naturalWidth * scale, h = im.naturalHeight * scale;
    ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1); if (alpha != null) ctx.globalAlpha = alpha;
    ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore();
  }
  function shadow(x, y, sz) { var im = imgs.fx_shadow; if (im && im.naturalWidth) { var w = sz * PPU, h = w * .5 * SY * 1.15; ctx.drawImage(im, x - w / 2, y - h / 2, w, h); } }
  function ring(x, y, r, col) {
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, y, r * PPU, r * PPU * SY, 0, 0, 6.283); ctx.stroke();
    ctx.globalAlpha = .08; ctx.fillStyle = col; ctx.fill(); ctx.restore();
  }
  function slotMark(s, col) {
    var x = sx(s.x), y = sy(s.z), r = 1.12 * PPU; ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath();
    for (var k = 0; k < 8; k++) { var a = Math.PI / 8 + k * Math.PI / 4, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * SY; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.closePath(); ctx.stroke(); ctx.restore();
  }
  function frameOf(e, f) { return (Math.floor(G.anim * f + (e.ph || 0)) & 1); }

  function drawFx(f) {
    var p = f.t / f.dur, a = 1 - p;
    if (f.k === "slash") {
      ctx.save(); ctx.translate(sx(f.x), sy(f.z) - 26); ctx.scale(1, SY); ctx.globalAlpha = a;
      var r = f.rng * PPU * (.75 + .25 * Math.min(1, p * 3)), a0 = -f.a - f.arc / 2, a1 = -f.a + f.arc / 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, a0, a1); ctx.closePath(); ctx.fillStyle = "rgba(90,220,255,.16)"; ctx.fill();
      ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(0, 0, r, a0, a1); ctx.strokeStyle = "rgba(60,190,255,.6)"; ctx.lineWidth = f.big ? 16 : 11; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r - 2, a0, a1); ctx.strokeStyle = "#f2ffff"; ctx.lineWidth = f.big ? 6 : 4; ctx.stroke(); ctx.restore();
    } else if (f.k === "ring") {
      ctx.save(); ctx.globalAlpha = a * .9; ctx.strokeStyle = f.col; ctx.lineWidth = 5 * a + 1; ctx.beginPath(); ctx.ellipse(sx(f.x), sy(f.z), f.r * PPU * Math.min(1, p * 2.2 + .1), f.r * PPU * SY * Math.min(1, p * 2.2 + .1), 0, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = a * .25; ctx.fillStyle = f.flash ? "#ffffff" : "#5adcff"; ctx.fill(); ctx.restore();
    } else if (f.k === "pull") {
      var dx = Math.cos(f.a), dz = Math.sin(f.a); ctx.save(); ctx.globalAlpha = a; ctx.lineCap = "round";
      for (var i = 0; i < 6; i++) {
        var al = (i + 1) * f.len / 6 * Math.min(1, p * 3 + .3);
        [[-1, 1], [1, 1]].forEach(function (sd) {
          var x0 = f.x + dx * al + (-dz) * f.hw * sd[0] * (1 - p * .8), z0 = f.z + dz * al + dx * f.hw * sd[0] * (1 - p * .8), x1 = f.x + dx * al, z1 = f.z + dz * al;
          ctx.strokeStyle = "rgba(120,230,255,.8)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx(x0), sy(z0) - 20); ctx.lineTo(sx(x1), sy(z1) - 20); ctx.stroke();
        });
      }
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx(f.x), sy(f.z) - 20); ctx.lineTo(sx(f.x + dx * f.len), sy(f.z + dz * f.len) - 20); ctx.stroke(); ctx.restore();
    } else if (f.k === "anchor") {
      var x = sx(f.x), y = sy(f.z); ctx.save(); ctx.globalAlpha = Math.min(1, a * 3);
      ctx.strokeStyle = "rgba(60,200,255,.5)"; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 46); ctx.stroke();
      ctx.strokeStyle = "#e9ffff"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 46); ctx.stroke();
      ctx.fillStyle = "#ffd25e"; ctx.fillRect(x - 12, y - 40, 24, 5); ctx.restore();
    }
  }

  function drawHero() {
    var h = G.hero, x = sx(h.x), y = sy(h.z), fr = h.moving ? (Math.floor(G.anim * 9) & 1) : 0;
    shadow(x, y, 1.9);
    ctx.save(); ctx.globalAlpha = .55; ctx.strokeStyle = "#6af0ff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, 20, 20 * SY, 0, 0, 6.283); ctx.stroke(); ctx.restore();
    var bob = h.moving ? 0 : Math.sin(G.anim * 3) * 1.2, lean = h.swing > 0 ? 1.06 : 1;
    ctx.save(); if (h.storm > 0) { ctx.shadowColor = "#7ff0ff"; ctx.shadowBlur = 18; }
    spr(h.def.spr + "_" + fr, x, y + bob, lean, Math.cos(h.face) < -.1); ctx.restore();
  }

  function draw() {
    buttons.length = 0; ctl.length = 0;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#09060f"; ctx.fillRect(0, 0, W, H);
    ctx.save();
    if (G.shake > 0) ctx.translate((Math.random() - .5) * 10 * G.shake / .3, (Math.random() - .5) * 8 * G.shake / .3);
    ctx.drawImage(imgs.ground, OX, TOP, GW * PPU, GH * PPU * SY);
    if (OX > 0) { var gl = ctx.createLinearGradient(OX - 40, 0, OX + 20, 0); ctx.fillStyle = "#09060f"; }

    var sel = G.sel, hv = hover, hero = G.hero;
    if (G.build) slots.forEach(function (s) { if (!s.tower) slotMark(s, s === hv ? (G.gold >= TOWER_COST ? "#6dffa0" : "#ff6a72") : "rgba(106,240,255,.4)"); });
    else if (hv && hv.tower) slotMark(hv, "#6dffa0");
    if (G.build && hv && !hv.tower) ring(sx(hv.x), sy(hv.z), BASE_STATS.range, G.gold >= TOWER_COST ? "#6af0ff" : "#ff5a64");
    if (sel) ring(sx(sel.s.x), sy(sel.s.z), stats(sel.tier).range, "#ffe680");
    if (hero && hero.storm > 0) { ring(sx(hero.x), sy(hero.z), STORM_R, "#7ff0ff"); }

    var items = [];
    decor.forEach(function (d) { items.push({ z: d.z, f: function () { var x = sx(d.x), y = sy(d.z), n = d.kind; var big = n.indexOf("tree") === 0 ? 2.4 : n === "ruin_arch" ? 3.4 : n === "rock" ? 1.7 : n === "brazier" ? .9 : 1.2; shadow(x, y, big); spr(n === "brazier" ? "brazier_" + (Math.floor(G.anim * 6 + d.x) & 1) : n, x, y, 1, d.flip); } }); });
    slots.forEach(function (s) { if (s.tower) items.push({ z: s.z - .001, f: function () { var t = s.tower, x = sx(s.x), y = sy(s.z); shadow(x, y, 2.2); ctx.save(); if (hero && hero.storm > 0 && Math.hypot(hero.x - s.x, hero.z - s.z) <= STORM_R) { ctx.shadowColor = "#ffe680"; ctx.shadowBlur = 20; } spr("tower_orb_" + t.tier, x, y, 1 + .1 * t.punch); ctx.restore(); } }); });
    items.push({ z: L.heart.z + .5, f: function () { var x = sx(L.heart.x), y = sy(L.heart.z), low = 1 - G.heart / HEART_MAX; ctx.save(); if (G.flashHeart > 0) ctx.globalAlpha = .75 + .25 * Math.sin(G.anim * 60); spr("heart_" + (Math.floor(G.anim * (1.5 + 3 * low)) & 1), x, y, 1); ctx.restore(); if (G.flashHeart > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = G.flashHeart; spr("heart_0", x, y, 1); ctx.restore(); } } });
    G.enemies.forEach(function (e) {
      var p = ep(e);
      items.push({ z: p.z, f: function () {
        var x = sx(p.x), y = sy(p.z), name = e.def.spr + "_" + (e.stun > 0 ? 0 : frameOf(e, e.def.fps));
        shadow(x, y, e.def.shadow);
        if (e.flash > 0) { ctx.save(); ctx.filter = "brightness(2.2) saturate(.4)"; spr(name, x, y, e.def.scale, p.dx < -.2); ctx.restore(); }
        else if (e.stun > 0) { ctx.save(); ctx.filter = "brightness(1.5) hue-rotate(150deg)"; spr(name, x, y, e.def.scale, p.dx < -.2); ctx.restore(); }
        else spr(name, x, y, e.def.scale, p.dx < -.2);
      } });
    });
    if (hero) items.push({ z: hero.z, f: drawHero });
    items.sort(function (a, b) { return b.z - a.z; }).forEach(function (i) { i.f(); });
    G.fx.forEach(drawFx);

    G.enemies.forEach(function (e) {
      if (!(e.def.always || e.hp < e.def.hp)) return;
      var p = ep(e), w = e.def.bar * PPU, x = sx(p.x) - w / 2, y = sy(p.z) - sh(e.def.spr + "_0") * e.def.scale - 12;
      ctx.fillStyle = "rgba(10,4,24,.9)"; ctx.fillRect(x - 2, y - 2, w + 4, 9);
      ctx.fillStyle = e.def.kind === "boss" || e.def.kind === "mini" ? "#e04bf0" : "#4dff8c"; ctx.fillRect(x, y, w * Math.max(0, e.hp / e.def.hp), 5);
    });
    G.bolts.forEach(function (b) {
      [[b.big ? 16 : 9, "rgba(50,190,255,.35)"], [b.big ? 6 : 3, "#e9ffff"]].forEach(function (o) { ctx.strokeStyle = o[1]; ctx.lineWidth = o[0]; ctx.lineJoin = "round"; ctx.beginPath(); b.pts.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke(); });
    });
    G.parts.forEach(function (p) { ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.5)); ctx.fillStyle = p.c; var s = p.s * (.4 + p.life / p.max); ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s); });
    ctx.globalAlpha = 1;
    for (var i = 0; i < 26; i++) { var fx = OX + (i * 197 + Math.sin(time * .3 + i) * 40) % (GW * PPU), fy = TOP + ((i * 331 + time * 8 * (1 + i % 3)) % (GH * PPU * SY)); ctx.globalAlpha = .35 + .3 * Math.sin(time * 2 + i); ctx.fillStyle = i % 2 ? "#8fe3ff" : "#c48bff"; ctx.fillRect(fx, fy, 3, 3); }
    ctx.globalAlpha = 1;
    if (G.build && hv && !hv.tower) spr("tower_orb_0", sx(hv.x), sy(hv.z), 1, false, G.gold >= TOWER_COST ? .6 : .35);
    ctx.restore();
    if (hero && hero.storm > 0) { ctx.fillStyle = "rgba(10,20,60," + (.18 + .06 * Math.sin(time * 12)) + ")"; ctx.fillRect(0, TOP, W, H - TOP); }
    var g = ctx.createRadialGradient(W / 2, TOP + 262, 260, W / 2, TOP + 262, 720); g.addColorStop(0, "rgba(6,3,18,0)"); g.addColorStop(1, "rgba(6,3,18,.55)");
    ctx.fillStyle = g; ctx.fillRect(0, TOP, W, H - TOP);
    drawHud();
  }

  function clock(s) { s = Math.max(0, Math.floor(s)); return ("0" + (s / 60 | 0)).slice(-2) + ":" + ("0" + s % 60).slice(-2); }

  // cercle de commande (attaque / compétences) : dessiné ET enregistré pour le tactile/souris
  function circle(id, cx, cy, r, glyph, cdLeft, cdMax, keyHint, ready, big) {
    ctl.push({ id: id, x: cx, y: cy, r: r });
    var pressed = (id === "atk" && attackHeld()) || (id === "build" && G.build);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283);
    ctx.fillStyle = pressed ? "rgba(80,200,255,.55)" : "rgba(14,10,34,.78)"; ctx.fill();
    ctx.lineWidth = big ? 5 : 4; ctx.strokeStyle = cdLeft > 0 ? "#5a4f86" : ready === false ? "#6c5a3a" : "#ffd25e"; ctx.stroke();
    ctx.translate(cx, cy); ctx.strokeStyle = cdLeft > 0 ? "#8d86b4" : "#9ff4ff"; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round";
    var s = r / 40;
    if (glyph === "sword") { ctx.beginPath(); ctx.moveTo(-14 * s, 16 * s); ctx.lineTo(16 * s, -16 * s); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-18 * s, 8 * s); ctx.lineTo(-8 * s, 18 * s); ctx.stroke(); ctx.beginPath(); ctx.moveTo(8 * s, -22 * s); ctx.lineTo(22 * s, -22 * s); ctx.lineTo(22 * s, -8 * s); ctx.stroke(); }
    else if (glyph === "pull") { [[-16, -10, -4, -2], [16, -10, 4, -2], [-16, 12, -4, 4], [16, 12, 4, 4]].forEach(function (a) { ctx.beginPath(); ctx.moveTo(a[0] * s, a[1] * s); ctx.lineTo(a[2] * s, a[3] * s); ctx.stroke(); }); ctx.beginPath(); ctx.moveTo(0, -18 * s); ctx.lineTo(0, 18 * s); ctx.stroke(); }
    else if (glyph === "bolt") { ctx.beginPath(); ctx.moveTo(6 * s, -20 * s); ctx.lineTo(-8 * s, 2 * s); ctx.lineTo(2 * s, 2 * s); ctx.lineTo(-6 * s, 20 * s); ctx.lineTo(10 * s, -4 * s); ctx.lineTo(0, -4 * s); ctx.closePath(); ctx.fill(); }
    else if (glyph === "storm") { ctx.beginPath(); ctx.arc(0, 0, 16 * s, 0, 5.2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(2 * s, -6 * s); ctx.lineTo(-4 * s, 4 * s); ctx.lineTo(3 * s, 4 * s); ctx.lineTo(-2 * s, 14 * s); ctx.stroke(); }
    else if (glyph === "build") { ctx.beginPath(); ctx.moveTo(-14 * s, 14 * s); ctx.lineTo(-14 * s, -2 * s); ctx.lineTo(0, -16 * s); ctx.lineTo(14 * s, -2 * s); ctx.lineTo(14 * s, 14 * s); ctx.closePath(); ctx.stroke(); }
    ctx.restore();
    if (cdLeft > 0) {
      ctx.save(); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r - 2, -Math.PI / 2, -Math.PI / 2 + 6.283 * (cdLeft / cdMax)); ctx.closePath(); ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fill(); ctx.restore();
      text(String(Math.ceil(cdLeft)), cx, cy, Math.round(r * .62), "#fff", "center");
    }
    if (keyHint && !touchUI) text(keyHint, cx + r * .62, cy - r * .74, 15, "#ffd25e", "center");
  }

  function drawControls() {
    var h = G.hero; if (!h) return;
    var ax = W - 112, ay = H - 118, bigR = touchUI ? 58 : 46, sr = touchUI ? 42 : 36;
    circle("atk", ax, ay, bigR, "sword", 0, 1, "Clic", true, true);
    circle("s1", ax - (bigR + sr * .9), ay + 22, sr, "pull", h.cd.s1, 7, "E");
    circle("s2", ax - (bigR * .75 + sr * .7), ay - (bigR + sr * .5), sr, "bolt", h.cd.s2, 12, "R");
    circle("ult", ax + 6, ay - (bigR + sr * 2.1), sr, "storm", h.cd.ult, 60, "F");
    if (h.storm > 0) text(Math.ceil(h.storm) + " s", ax + 6, ay - (bigR + sr * 2.1) - sr - 12, 17, "#7ff0ff", "center");
    if (touchUI) circle("build", ax - (bigR + sr * 2.5), ay + 40, 30, "build", 0, 1, "", true);
    // jauge de charge électrique
    var cx0 = 24, cy0 = TOP + 10; text("CHARGE ÉLECTRIQUE", cx0, cy0 + 8, 14, "#7ff0ff");
    rr(cx0, cy0 + 20, 200, 14, 4, "rgba(10,6,24,.85)", "#46386e");
    var cg = h.charge / 100; if (cg > 0) { ctx.save(); rr(cx0 + 2, cy0 + 22, 196 * cg, 10, 3, h.charge >= 100 ? "#fff3a0" : "#43d0ff"); ctx.restore(); }
    if (h.charge >= 100) text("Prochaine attaque : décharge !", cx0, cy0 + 48, 14, "#fff3a0");
    // joystick
    if (touchUI) {
      var bx = joy.on ? joy.bx : 150, by = joy.on ? joy.by : H - 140, kx = bx + (joy.on ? joy.dx : 0) * 60, ky = by + (joy.on ? joy.dy : 0) * 60;
      ctx.save(); ctx.globalAlpha = joy.on ? .95 : .35; ctx.beginPath(); ctx.arc(bx, by, 78, 0, 6.283); ctx.fillStyle = "rgba(14,10,34,.55)"; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = "#8a6ee0"; ctx.stroke();
      ctx.beginPath(); ctx.arc(kx, ky, 36, 0, 6.283); ctx.fillStyle = "rgba(110,200,255,.55)"; ctx.fill(); ctx.strokeStyle = "#9ff4ff"; ctx.stroke(); ctx.restore();
    }
  }

  function drawHud() {
    if (G.state === "select") { drawSelect(); return; }
    var rx = W - 156;
    panel(10, 8, 360, 84); text("STABILITÉ DU CŒUR", 24, 28, 17, "#6af0ff");
    rr(24, 44, 330, 28, 5, "#0a0614", "#46386e"); var k = G.heart / HEART_MAX;
    rr(27, 47, Math.max(0, 324 * k), 22, 3, k > .35 ? "#9b5bff" : "#ff4058");
    text(Math.ceil(G.heart) + " / " + HEART_MAX, 190, 59, 18, "#fff", "center");
    var mx = Math.max(392, Math.min(W / 2 - 184, rx - 20 - 368 - 210));
    panel(mx, 8, 368, 84);
    text("SÉQUENCE 1  ·  " + (G.state === "prep" ? "PRÉPARATION" : "VAGUE " + Math.max(1, G.wave) + " / 10"), mx + 16, 32, 21);
    text(clock(G.t) + " / " + clock(NOMINAL), mx + 16, 66, 28, "#ffd25e");
    panel(mx + 382, 8, 190, 84); text(String(G.gold), mx + 398, 50, 38, "#ffd25e"); text("or", mx + 560, 52, 20, "#d39a2a", "right");
    button(rx, 8, 146, 40, G.paused ? "Reprendre" : "Pause", togglePause, false, null, 17);
    button(rx, 52, 146, 40, "Recommencer", function () { reset(true); }, false, null, 17);
    drawControls();
    if (!touchUI) {
      panel(10, H - 84, 470, 76);
      button(22, H - 76, 446, 60, "", toggleBuild, G.build);
      text("Orbe foudroyant  [B]", 40, H - 56, 22, "#f2e8d0"); text(TOWER_COST + " or", 40, H - 30, 22, "#ffd25e");
      text("Éclairs précis · améliorable 3 fois", 224, H - 30, 15, "#b9b0d6", "left", false);
    }
    if (G.sel) {
      var t = G.sel, st = stats(t.tier), px = W - 332, py = TOP + 14;
      panel(px, py, 322, 290);
      text("Orbe foudroyant · niv. " + (t.tier + 1), px + 16, py + 28, 20, "#6af0ff");
      text("Dégâts : " + +st.damage.toFixed(1), px + 16, py + 60, 17); text("Cadence : " + +st.rate.toFixed(2) + " / s", px + 16, py + 82, 17);
      text("Portée : " + +st.range.toFixed(1), px + 16, py + 104, 17); text("Éclairs par salve : " + st.zaps, px + 16, py + 126, 17);
      text("Chaîne : " + (st.jumps ? st.jumps + " rebonds" : "aucune"), px + 16, py + 148, 17);
      if (t.tier < UPS.length) {
        var u = UPS[t.tier], ok = G.gold >= u.cost;
        button(px + 14, py + 168, 294, 108, "", function () { tryUpgrade(t); });
        text("AMÉLIORER : " + u.name, px + 161, py + 190, 16, ok ? "#ffd25e" : "#ff8a8a", "center"); text(u.cost + " or", px + 161, py + 212, 20, ok ? "#ffd25e" : "#ff8a8a", "center");
        wrapText(u.desc + " (valeurs provisoires)", px + 161, py + 238, 270, 15, "#d8d0ee");
      } else text("NIVEAU MAXIMAL", px + 161, py + 220, 22, "#6af0ff", "center");
    }
    if (G.toastT > 0) { ctx.globalAlpha = Math.min(1, G.toastT / .5); text(G.toast, W / 2, TOP + 24, 28, G.toastC, "center"); ctx.globalAlpha = 1; }
    if (G.paused) {
      ctx.fillStyle = "rgba(4,2,12,.55)"; ctx.fillRect(0, TOP, W, H - TOP);
      var py2 = TOP + 70; panel(W / 2 - 250, py2, 500, 380); text("PAUSE", W / 2, py2 + 52, 48, "#6af0ff", "center");
      button(W / 2 - 170, py2 + 100, 340, 54, "Reprendre", togglePause);
      button(W / 2 - 170, py2 + 166, 340, 54, "Changer de héros", function () { reset(false); });
      button(W / 2 - 170, py2 + 232, 340, 54, full ? "Quitter le plein écran" : "Plein écran", function () { setFull(!full); G.paused = false; });
      button(W / 2 - 170, py2 + 298, 340, 54, muted ? "Son : coupé" : "Son : activé", toggleSound);
    } else if (G.state === "prep") {
      panel(W / 2 - 330, TOP + 6, 660, 96);
      text("Temps de préparation libre : déplace-toi, bâtis, puis lance la séquence.", W / 2, TOP + 32, 18, "#f2e8d0", "center", false);
      button(W / 2 - 200, TOP + 48, 400, 44, "LANCER LA SÉQUENCE  [Entrée]", startSeq, false, null, 20);
    } else if (G.state === "win") endScreen("VICTOIRE", "Le Cœur tient bon : la séquence est vaincue.", "#ffd25e");
    else if (G.state === "lose") endScreen("DÉFAITE", "Le Cœur s'est effondré sous la corruption.", "#ff6a76");
    if (full && window.innerHeight > window.innerWidth) {
      ctx.fillStyle = "rgba(4,2,12,.88)"; ctx.fillRect(0, 0, W, H); text("Tourne ton téléphone en paysage", W / 2, H / 2, 34, "#ffd25e", "center");
    }
  }
  function endScreen(title, body, col) {
    ctx.fillStyle = "rgba(4,2,12,.5)"; ctx.fillRect(0, TOP, W, H - TOP);
    var w = 700, h = 300, x = (W - w) / 2, y = TOP + 120;
    panel(x, y, w, h); text(title, W / 2, y + 52, 52, col, "center");
    text(body, W / 2, y + 112, 20, "#f2e8d0", "center", false); text("Ennemis vaincus : " + G.kills + "  ·  Temps : " + clock(G.t), W / 2, y + 144, 20, "#f2e8d0", "center", false);
    button(W / 2 - 230, y + h - 124, 460, 50, "REJOUER", function () { reset(true); });
    button(W / 2 - 230, y + h - 66, 460, 46, "Changer de héros", function () { reset(false); }, false, "#9ff4ff", 18);
  }
  function wrapText(s, x, y, maxw, size, col) {
    ctx.font = "bold " + size + "px Nunito, system-ui, sans-serif"; var words = s.split(" "), line = "", ly = y;
    words.forEach(function (w) { var tt = line ? line + " " + w : w; if (ctx.measureText(tt).width > maxw && line) { text(line, x, ly, size, col, "center"); line = w; ly += size + 4; } else line = tt; });
    text(line, x, ly, size, col, "center");
  }
  function drawSelect() {
    ctx.fillStyle = "rgba(6,3,16,.82)"; ctx.fillRect(0, 0, W, H);
    text("CHOISIS TON HÉROS", W / 2, 58, 46, "#6af0ff", "center");
    text("Tu le déplaces en temps réel pendant que tes tourelles défendent le Cœur.", W / 2, 100, 18, "#d8d0ee", "center", false);
    var cw = Math.min(330, (W - 80) / 3 - 14), ch = 480, gap = 18, x0 = (W - (cw * 3 + gap * 2)) / 2, y0 = 130;
    HEROES.forEach(function (d, i) {
      var x = x0 + i * (cw + gap), hot = mouse.x >= x && mouse.x <= x + cw && mouse.y >= y0 && mouse.y <= y0 + ch && d.playable;
      rr(x, y0, cw, ch, 12, d.playable ? (hot ? "rgba(40,32,90,.97)" : "rgba(26,20,58,.95)") : "rgba(16,13,30,.92)", d.playable ? (hot ? "#6af0ff" : "#9a7a2a") : "#3a3550");
      var im = imgs[d.spr + "_" + (Math.floor(time * 2) & 1)];
      if (im && im.naturalWidth) { ctx.save(); if (!d.playable) ctx.globalAlpha = .45; var sc = 2.9; ctx.drawImage(im, x + cw / 2 - im.naturalWidth * sc / 2, y0 + 30, im.naturalWidth * sc, im.naturalHeight * sc); ctx.restore(); }
      text(d.name, x + cw / 2, y0 + 30 + 80 * 2.9 + 18, 24, d.playable ? "#ffd25e" : "#8d86b4", "center");
      text(d.role, x + cw / 2, y0 + 30 + 80 * 2.9 + 46, 17, "#6af0ff", "center", false);
      d.lines.forEach(function (l, j) { text(l, x + cw / 2, y0 + 30 + 80 * 2.9 + 76 + j * 20, 14, d.playable ? "#d8d0ee" : "#6c6688", "center", false); });
      button(x + 20, y0 + ch - 62, cw - 40, 46, d.playable ? "JOUER" : "Bientôt", function () { pickHero(i); }, false, null, 22, !d.playable);
      if (d.playable) buttons[buttons.length - 1].f = function () { pickHero(i); }; else buttons[buttons.length - 1].f = function () { pickHero(i); };
      buttons.push({ x: x, y: y0, w: cw, h: ch - 66, f: function () { pickHero(i); } });
    });
  }

  // ---------- boucle & entrées ----------
  var last = 0;
  function frame(ts) {
    if (!last) last = ts; var dt = Math.min(.1, (ts - last) / 1000); last = ts;
    for (var i = 0; i < SPEED; i++) update(dt);
    draw(); requestAnimationFrame(frame);
  }
  function cpos(ev) { var r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height }; }
  function hitRect(p) {
    for (var i = buttons.length - 1; i >= 0; i--) { var b = buttons[i]; if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b; }
    return null;
  }
  function hitCircle(p) { for (var i = ctl.length - 1; i >= 0; i--) { var c = ctl[i]; if (Math.hypot(p.x - c.x, p.y - c.y) <= c.r + 8) return c; } return null; }
  function doControl(id) {
    if (!G.hero || G.paused || (G.state !== "play" && G.state !== "prep")) return;
    if (id === "s1") skill1(); else if (id === "s2") skill2(); else if (id === "ult") skillUlt(); else if (id === "build") toggleBuild();
  }
  cv.addEventListener("pointermove", function (e) {
    var p = cpos(e); mouse = p; mouseIn = true; if (e.pointerType === "mouse") touchUI = false;
    hover = e.pointerType === "mouse" && p.y > TOP ? slotAt(toWorld(p.x, p.y)) : hover;
    var pt = ptrs[e.pointerId];
    if (pt && pt.k === "joy") { var dx = p.x - joy.bx, dy = p.y - joy.by, l = Math.hypot(dx, dy), m = Math.min(1, l / 70); if (l > 0) { dx /= l; dy /= l; } joy.dx = l < 10 ? 0 : dx * m; joy.dy = l < 10 ? 0 : dy * m; pt.moved = pt.moved || Math.hypot(p.x - pt.x0, p.y - pt.y0) > 14; }
  });
  cv.addEventListener("pointerleave", function () { mouseIn = false; });
  cv.addEventListener("pointerdown", function (e) {
    var p = cpos(e); mouse = p; startAmbient();
    if (e.pointerType !== "mouse") touchUI = true; else touchUI = false;
    if (e.button === 2) { cancel(); return; }
    try { cv.setPointerCapture(e.pointerId); } catch (x) {}
    var b = hitRect(p); if (b) { play("click", .5); b.f(); return; }
    if (!G.hero || G.paused || (G.state !== "play" && G.state !== "prep")) return;
    var c = hitCircle(p);
    if (c) { if (c.id === "atk") ptrs[e.pointerId] = { k: "atk" }; else { ptrs[e.pointerId] = { k: "btn" }; doControl(c.id); } return; }
    if (e.pointerType !== "mouse") {
      if (p.x < W * .5 && p.y > TOP) { joy.on = true; joy.id = e.pointerId; joy.bx = Math.max(90, Math.min(W * .5 - 20, p.x)); joy.by = Math.max(TOP + 90, Math.min(H - 90, p.y)); joy.dx = joy.dy = 0; ptrs[e.pointerId] = { k: "joy", x0: p.x, y0: p.y, t0: performance.now(), moved: false }; }
      else worldClick(p.x, p.y);
      return;
    }
    hover = p.y > TOP ? slotAt(toWorld(p.x, p.y)) : null;
    if (!worldClick(p.x, p.y)) ptrs[e.pointerId] = { k: "matk" };
  });
  function release(e) {
    var pt = ptrs[e.pointerId]; if (!pt) return;
    if (pt.k === "joy") { joy.on = false; joy.dx = joy.dy = 0; if (!pt.moved && performance.now() - pt.t0 < 300) { var p = cpos(e); worldClick(p.x, p.y); } }
    delete ptrs[e.pointerId];
  }
  cv.addEventListener("pointerup", release); cv.addEventListener("pointercancel", release);
  cv.addEventListener("contextmenu", function (e) { e.preventDefault(); cancel(); });
  window.addEventListener("keydown", function (e) {
    if (!loaded || !L) return; var k = e.code; keys[k] = true; touchUI = false;
    if (k === "Escape") { if (!cancel()) togglePause(); }
    else if (k === "KeyP") togglePause();
    else if (k === "Enter") { if (G.state === "select") pickHero(0); else if (G.state === "prep" && !G.paused) startSeq(); }
    else if (k === "KeyB" || k === "Digit1") toggleBuild();
    else if (k === "KeyE") doControl("s1");
    else if (k === "KeyR") doControl("s2");
    else if (k === "KeyF") doControl("ult");
    else if (k === "KeyM") toggleSound();
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(k) >= 0 && (G.state === "play" || G.state === "prep" || G.state === "select")) e.preventDefault();
    startAmbient();
  });
  window.addEventListener("keyup", function (e) { keys[e.code] = false; });
  window.addEventListener("blur", function () { keys = {}; ptrs = {}; joy.on = false; });
  function toggleSound() { muted = !muted; if (ambient) ambient.volume = muted ? 0 : .2; var b = document.querySelector("[data-ash-sound]"); if (b) { b.setAttribute("aria-pressed", String(!muted)); b.textContent = muted ? "🔇 Son coupé" : "🔊 Son"; } }
  var sb = document.querySelector("[data-ash-sound]"); if (sb) sb.addEventListener("click", toggleSound);
  var fb = document.querySelector("[data-ash-full]"); if (fb) fb.addEventListener("click", function () { setFull(!full); });
  document.addEventListener("fullscreenchange", function () { if (!document.fullscreenElement && full && touchUI === false) { /* l'utilisateur a quitté le plein écran natif : on reste en mode plein cadre */ } });

  window.__ash = { get G() { return G; }, slots: function () { return slots; }, build: function (i) { tryBuild(slots[i]); }, upgrade: function (i) { tryUpgrade(slots[i].tower); }, start: startSeq, reset: reset, pick: pickHero, setFull: setFull, joy: joy, W: function () { return W; } };
  boot();
})();
