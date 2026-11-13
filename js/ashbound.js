/* Ashbound Tower — prototype navigateur (étape 1).
   Portage HTML5 du prototype Unity (ashbound-tower/) : mêmes données, même tracé, mêmes sprites.
   Vue 3/4 : sol écrasé (sin 55°), sprites debout triés par profondeur. Tout est dessiné dans un seul canvas. */
(function () {
  "use strict";
  var cv = document.getElementById("ash");
  if (!cv) return;
  var ctx = cv.getContext("2d");
  var W = 1152, H = 720, PPU = 32, SY = Math.sin(55 * Math.PI / 180), TOP = 104, GW = 36, GH = 20;
  var params = new URLSearchParams(location.search);
  var SPEED = Math.min(30, Math.max(1, parseFloat(params.get("speed")) || 1));
  var BASE = "ashbound/";

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

  // ---------- ressources ----------
  var imgs = {}, snd = {}, L = null, loaded = false, muted = false;
  var IMGS = ["ground", "fx_shadow", "heart_0", "heart_1", "brazier_0", "brazier_1", "tower_orb_0", "tower_orb_1", "tower_orb_2", "tower_orb_3",
    "bones", "crystal", "mushroom", "rock", "rock_small", "ruin_arch", "ruin_pillar", "tree_dead", "tree_teal"];
  Object.keys(ENEMY).forEach(function (k) { IMGS.push(ENEMY[k].spr + "_0", ENEMY[k].spr + "_1"); });
  var SNDS = ["zap", "hit", "death", "build", "upgrade", "heart_hit", "win", "lose", "click", "error", "wave", "boss", "ambient"];
  function boot() {
    var pending = IMGS.length + 1;
    function done() { if (--pending === 0) { loaded = true; init(); } }
    IMGS.forEach(function (n) { var im = new Image(); im.onload = done; im.onerror = done; im.src = BASE + "img/" + n + ".png"; imgs[n] = im; });
    fetch(BASE + "layout.json").then(function (r) { return r.json(); }).then(function (j) { L = j; done(); }).catch(function () { L = null; done(); });
    SNDS.forEach(function (n) { var a = new Audio(BASE + "snd/" + n + ".wav"); a.preload = "auto"; snd[n] = a; });
  }
  var lastPlay = {};
  function play(n, vol) {
    if (muted || !snd[n]) return;
    var now = performance.now(); if (lastPlay[n] && now - lastPlay[n] < 45) return; lastPlay[n] = now;
    try { var a = snd[n].cloneNode(); a.volume = Math.min(1, (vol || 1) * .7); a.playbackRate = 1 + (Math.random() - .5) * .12; a.play().catch(function () {}); } catch (e) {}
  }
  var ambient = null;
  function startAmbient() {
    if (ambient || !snd.ambient) return;
    ambient = snd.ambient; ambient.loop = true; ambient.volume = muted ? 0 : .2; ambient.play().catch(function () { ambient = null; });
  }

  // ---------- état ----------
  var path, cum, LEN, slots, decor, G, hover = null, mouse = { x: -1, y: -1 }, buttons = [], rng, time = 0;
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function init() {
    if (!L) { ctx.fillStyle = "#09060f"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#fff"; ctx.font = "20px sans-serif"; ctx.fillText("Impossible de charger le jeu.", 40, 60); return; }
    path = L.path.map(function (p) { return [p.x, p.z]; });
    cum = [0]; for (var i = 1; i < path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
    LEN = cum[cum.length - 1];
    slots = L.slots.map(function (s) { return { x: s.x, z: s.z, tower: null }; });
    decor = L.decor;
    reset(); requestAnimationFrame(frame);
  }

  function reset() {
    var ev = [], r = mulberry(1234), t0 = 10, dt = 27;
    WAVES.forEach(function (w, i) { w[1].forEach(function (g) { for (var k = 0; k < g[1]; k++) ev.push({ t: t0 + dt * i + g[3] + k * g[2], e: g[0], lat: lat(r, g[0]) }); }); });
    TRICKLE.forEach(function (tr) { for (var t = tr[1]; t <= tr[2]; t += tr[3]) { var n = tr[4] + Math.floor(r() * (tr[5] - tr[4] + 1)); for (var k = 0; k < n; k++) ev.push({ t: t + k * tr[6], e: tr[0], lat: lat(r, tr[0]) }); } });
    ev.sort(function (a, b) { return a.t - b.t; });
    slots.forEach(function (s) { s.tower = null; });
    G = { state: "prep", paused: false, t: 0, events: ev, next: 0, wave: 0, gold: START_GOLD, heart: HEART_MAX, enemies: [], towers: [], parts: [], bolts: [], toast: "", toastT: 0, toastC: "#fff", build: false, sel: null, shake: 0, flashHeart: 0, kills: 0, anim: 0 };
    hover = null;
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
  function ep(e) { var p = pos(e.d); return { x: p.x - p.dz * e.lat, z: p.z + p.dx * e.lat, dx: p.dx }; }
  var sprH = {};
  function sh(name) { var im = imgs[name]; return im && im.naturalHeight ? im.naturalHeight : 48; }

  // ---------- projection ----------
  function sx(x) { return (x + GW / 2) * PPU; }
  function sy(z) { return TOP + (GH / 2 - z) * PPU * SY; }
  function toWorld(px, py) { return { x: px / PPU - GW / 2, z: GH / 2 - (py - TOP) / (PPU * SY) }; }

  // ---------- logique ----------
  function startSeq() { if (G.state !== "prep") return; G.state = "play"; G.t = 0; play("wave", .8); startAmbient(); }
  function endState(s) { if (G.state !== "play") return; G.state = s; play(s === "win" ? "win" : "lose"); }
  function burst(x, y, col, n, spd, life, size) {
    for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, v = spd * (.3 + Math.random() * .7); G.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * .4, life: life * (.6 + Math.random() * .6), max: life, s: size * (.6 + Math.random() * .6), c: col }); }
  }
  function spawn(ev) { var d = ENEMY[ev.e]; G.enemies.push({ k: ev.e, def: d, d: 0, hp: d.hp, lat: ev.lat, flash: 0, age: 0, dead: false, ph: Math.random() * 4 }); if (ev.e === "boss") play("boss"); }
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
  function bolt(a, b) { G.bolts.push({ a: a, b: b, life: .14, pts: jag(a, b), flick: false }); burst(b.x, b.y, "#9ff4ff", 4, 110, .25, 3); }
  function jag(a, b) {
    var pts = [a], n = 7, dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    for (var i = 1; i < n; i++) { var t = i / n, o = (Math.random() - .5) * 18; pts.push({ x: a.x + dx * t + nx * o, y: a.y + dy * t + ny * o }); }
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

  function update(dt) {
    G.anim += dt; time += dt;
    if (G.toastT > 0) G.toastT -= dt;
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt);
    if (G.flashHeart > 0) G.flashHeart -= dt;
    G.parts = G.parts.filter(function (p) { p.life -= dt; p.vy += 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt; return p.life > 0; });
    G.bolts = G.bolts.filter(function (b) { b.life -= dt; if (!b.flick && b.life < .07) { b.flick = true; b.pts = jag(b.a, b.b); } return b.life > 0; });
    G.towers.forEach(function (t) { if (t.punch > 0) t.punch = Math.max(0, t.punch - dt * 6); });
    if (G.state !== "play" || G.paused) return;
    G.t += dt;
    while (G.next < G.events.length && G.events[G.next].t <= G.t) spawn(G.events[G.next++]);
    var w = 0; WAVES.forEach(function (_, i) { if (10 + 27 * i <= G.t) w = i + 1; });
    if (w !== G.wave) { G.wave = w; if (w) { toast(WAVES[w - 1][0], "#ffd25e"); play("wave", .7); } }
    G.towers.forEach(function (t) { t.cd -= dt; if (t.cd <= 0) t.cd = fire(t) ? 1 / stats(t.tier).rate : .08; });
    G.enemies.forEach(function (e) {
      if (e.dead) return;
      e.age += dt; e.d += e.def.speed * dt; if (e.flash > 0) e.flash -= dt;
      if (e.age > 4 * LEN / e.def.speed + 5) { e.dead = true; return; }
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

  // ---------- actions joueur ----------
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
  function cancel() { if (G.build) { G.build = false; return true; } if (G.sel) { G.sel = null; return true; } return false; }
  function togglePause() { if (G.state === "play" || G.state === "prep") { G.paused = !G.paused; } }
  function onClick(px, py) {
    startAmbient();
    for (var i = buttons.length - 1; i >= 0; i--) { var b = buttons[i]; if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) { play("click", .5); b.f(); return; } }
    if (G.paused || (G.state !== "play" && G.state !== "prep")) return;
    if (py < TOP - 8) return;
    var w = toWorld(px, py), s = slotAt(w);
    if (G.build) { if (!s) return; if (s.tower) { G.sel = s.tower; G.build = false; } else tryBuild(s); return; }
    G.sel = s && s.tower ? s.tower : null;
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
  function button(x, y, w, h, label, f, hot, col, fs) {
    var h2 = mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;
    rr(x, y, w, h, 8, hot ? "#2f5a52" : h2 ? "#3d3070" : "#2c2150", h2 ? "#6af0ff" : "#8a6ee0");
    text(label, x + w / 2, y + h / 2 + 1, fs || 22, col || "#ffd25e", "center");
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

  function draw() {
    buttons.length = 0;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#09060f"; ctx.fillRect(0, 0, W, H);
    ctx.save();
    if (G.shake > 0) ctx.translate((Math.random() - .5) * 10 * G.shake / .3, (Math.random() - .5) * 8 * G.shake / .3);
    ctx.drawImage(imgs.ground, 0, TOP, GW * PPU, GH * PPU * SY);

    var sel = G.sel, hv = hover;
    if (G.build) slots.forEach(function (s) { if (!s.tower) slotMark(s, s === hv ? (G.gold >= TOWER_COST ? "#6dffa0" : "#ff6a72") : "rgba(106,240,255,.4)"); });
    else if (hv && hv.tower) slotMark(hv, "#6dffa0");
    if (G.build && hv && !hv.tower) ring(sx(hv.x), sy(hv.z), BASE_STATS.range, G.gold >= TOWER_COST ? "#6af0ff" : "#ff5a64");
    if (sel) ring(sx(sel.s.x), sy(sel.s.z), stats(sel.tier).range, "#ffe680");

    // éléments debout triés par profondeur (z décroissant = plus loin d'abord)
    var items = [];
    decor.forEach(function (d) { items.push({ z: d.z, f: function () { var x = sx(d.x), y = sy(d.z), n = d.kind; var big = n.indexOf("tree") === 0 ? 2.4 : n === "ruin_arch" ? 3.4 : n === "rock" ? 1.7 : n === "brazier" ? .9 : 1.2; shadow(x, y, big); spr(n === "brazier" ? "brazier_" + (Math.floor(G.anim * 6 + d.x) & 1) : n, x, y, 1, d.flip); } }); });
    slots.forEach(function (s) { if (s.tower) items.push({ z: s.z - .001, f: function () { var t = s.tower, x = sx(s.x), y = sy(s.z); shadow(x, y, 2.2); spr("tower_orb_" + t.tier, x, y, 1 + .1 * t.punch); } }); });
    items.push({ z: L.heart.z + .5, f: function () { var x = sx(L.heart.x), y = sy(L.heart.z), low = 1 - G.heart / HEART_MAX; ctx.save(); if (G.flashHeart > 0) ctx.globalAlpha = .75 + .25 * Math.sin(G.anim * 60); spr("heart_" + (Math.floor(G.anim * (1.5 + 3 * low)) & 1), x, y, 1); ctx.restore(); if (G.flashHeart > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = G.flashHeart; spr("heart_0", x, y, 1); ctx.restore(); } } });
    G.enemies.forEach(function (e) {
      var p = ep(e);
      items.push({ z: p.z, f: function () {
        var x = sx(p.x), y = sy(p.z), name = e.def.spr + "_" + frameOf(e, e.def.fps);
        shadow(x, y, e.def.shadow);
        if (e.flash > 0) { ctx.save(); ctx.filter = "brightness(2.2) saturate(.4)"; spr(name, x, y, e.def.scale, p.dx < -.2); ctx.restore(); } else spr(name, x, y, e.def.scale, p.dx < -.2);
      } });
    });
    items.sort(function (a, b) { return b.z - a.z; }).forEach(function (i) { i.f(); });

    // barres de vie
    G.enemies.forEach(function (e) {
      if (!(e.def.always || e.hp < e.def.hp)) return;
      var p = ep(e), w = e.def.bar * PPU, x = sx(p.x) - w / 2, y = sy(p.z) - sh(e.def.spr + "_0") * e.def.scale - 12;
      ctx.fillStyle = "rgba(10,4,24,.9)"; ctx.fillRect(x - 2, y - 2, w + 4, 9);
      ctx.fillStyle = e.def.kind === "boss" || e.def.kind === "mini" ? "#e04bf0" : "#4dff8c"; ctx.fillRect(x, y, w * Math.max(0, e.hp / e.def.hp), 5);
    });
    // éclairs + particules
    G.bolts.forEach(function (b) {
      [[9, "rgba(50,190,255,.35)"], [3, "#e9ffff"]].forEach(function (o) { ctx.strokeStyle = o[1]; ctx.lineWidth = o[0]; ctx.lineJoin = "round"; ctx.beginPath(); b.pts.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke(); });
    });
    G.parts.forEach(function (p) { ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.5)); ctx.fillStyle = p.c; var s = p.s * (.4 + p.life / p.max); ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s); });
    ctx.globalAlpha = 1;
    // lucioles
    for (var i = 0; i < 26; i++) { var fx = (i * 197 + Math.sin(time * .3 + i) * 40) % (GW * PPU), fy = TOP + ((i * 331 + time * 8 * (1 + i % 3)) % (GH * PPU * SY)); ctx.globalAlpha = .35 + .3 * Math.sin(time * 2 + i); ctx.fillStyle = i % 2 ? "#8fe3ff" : "#c48bff"; ctx.fillRect(fx, fy, 3, 3); }
    ctx.globalAlpha = 1;
    // fantôme de construction
    if (G.build && hv && !hv.tower) spr("tower_orb_0", sx(hv.x), sy(hv.z), 1, false, G.gold >= TOWER_COST ? .6 : .35);
    ctx.restore();
    // vignette
    var g = ctx.createRadialGradient(W / 2, TOP + 262, 260, W / 2, TOP + 262, 720); g.addColorStop(0, "rgba(6,3,18,0)"); g.addColorStop(1, "rgba(6,3,18,.55)");
    ctx.fillStyle = g; ctx.fillRect(0, TOP, W, H - TOP);
    drawHud();
  }

  function clock(s) { s = Math.max(0, Math.floor(s)); return ("0" + (s / 60 | 0)).slice(-2) + ":" + ("0" + s % 60).slice(-2); }
  function drawHud() {
    // haut
    panel(10, 8, 360, 84); text("STABILITÉ DU CŒUR", 24, 28, 17, "#6af0ff");
    rr(24, 44, 330, 28, 5, "#0a0614", "#46386e"); var k = G.heart / HEART_MAX;
    rr(27, 47, Math.max(0, 324 * k), 22, 3, k > .35 ? "#9b5bff" : "#ff4058");
    text(Math.ceil(G.heart) + " / " + HEART_MAX, 190, 59, 18, "#fff", "center");
    panel(392, 8, 368, 84);
    text("SÉQUENCE 1  ·  " + (G.state === "prep" ? "PRÉPARATION" : "VAGUE " + Math.max(1, G.wave) + " / 10"), 408, 32, 21);
    text(clock(G.t) + " / " + clock(NOMINAL), 408, 66, 28, "#ffd25e");
    panel(782, 8, 200, 84); text(String(G.gold), 800, 50, 38, "#ffd25e");
    text("or", 944, 52, 20, "#d39a2a", "right");
    button(996, 8, 146, 40, G.paused ? "Reprendre" : "Pause", togglePause, false, null, 17);
    button(996, 52, 146, 40, "Recommencer", function () { reset(); }, false, null, 17);
    // bas : barre de construction
    panel(10, H - 84, 470, 76);
    var hot = G.build; button(22, H - 76, 446, 60, "", function () { if (G.state === "play" || G.state === "prep") { G.build = !G.build; if (G.build) G.sel = null; } }, hot);
    text("Orbe foudroyant  [1]", 40, H - 56, 22, "#f2e8d0"); text(TOWER_COST + " or", 40, H - 30, 22, "#ffd25e");
    text("Éclairs précis · améliorable 3 fois", 224, H - 30, 15, "#b9b0d6", "left", false);
    // fiche de tourelle
    if (G.sel) {
      var t = G.sel, st = stats(t.tier), px = W - 332, py = TOP + 20;
      panel(px, py, 322, 300);
      text("Orbe foudroyant · niv. " + (t.tier + 1), px + 16, py + 28, 20, "#6af0ff");
      text("Dégâts : " + +st.damage.toFixed(1), px + 16, py + 62, 17); text("Cadence : " + +st.rate.toFixed(2) + " / s", px + 16, py + 86, 17);
      text("Portée : " + +st.range.toFixed(1), px + 16, py + 110, 17); text("Éclairs par salve : " + st.zaps, px + 16, py + 134, 17);
      text("Chaîne : " + (st.jumps ? st.jumps + " rebonds" : "aucune"), px + 16, py + 158, 17);
      if (t.tier < UPS.length) {
        var u = UPS[t.tier], ok = G.gold >= u.cost;
        button(px + 14, py + 180, 294, 106, "", function () { tryUpgrade(t); });
        text("AMÉLIORER : " + u.name, px + 161, py + 202, 16, ok ? "#ffd25e" : "#ff8a8a", "center"); text(u.cost + " or", px + 161, py + 224, 20, ok ? "#ffd25e" : "#ff8a8a", "center");
        wrap(u.desc + " (valeurs provisoires)", px + 161, py + 250, 270, 15, "#d8d0ee");
      } else text("NIVEAU MAXIMAL", px + 161, py + 230, 22, "#6af0ff", "center");
    }
    if (G.toastT > 0) { ctx.globalAlpha = Math.min(1, G.toastT / .5); text(G.toast, W / 2, TOP + 24, 28, G.toastC, "center"); ctx.globalAlpha = 1; }
    // écrans
    if (G.paused) overlay("PAUSE", "", null);
    else if (G.state === "prep") overlay("PRÉPARATION", "Bâtis tes premières défenses sur les plaques runiques.\nLes ennemis jaillissent du portail violet et marchent jusqu'au Cœur.\nLa séquence commence quand tu le décides.", ["LANCER LA SÉQUENCE  [Entrée]", startSeq]);
    else if (G.state === "win") overlay("VICTOIRE", "Le Cœur tient bon : la séquence est vaincue.\nEnnemis vaincus : " + G.kills + "  ·  Temps : " + clock(G.t), ["REJOUER  [R]", reset], "#ffd25e");
    else if (G.state === "lose") overlay("DÉFAITE", "Le Cœur s'est effondré sous la corruption.\nEnnemis vaincus : " + G.kills + "  ·  Temps : " + clock(G.t), ["REJOUER  [R]", reset], "#ff6a76");
  }
  function wrap(s, x, y, maxw, size, col) {
    ctx.font = "bold " + size + "px Nunito, system-ui, sans-serif"; var words = s.split(" "), line = "", ly = y;
    words.forEach(function (w) { var tt = line ? line + " " + w : w; if (ctx.measureText(tt).width > maxw && line) { text(line, x, ly, size, col, "center"); line = w; ly += size + 4; } else line = tt; });
    text(line, x, ly, size, col, "center");
  }
  function overlay(title, body, btn, col) {
    ctx.fillStyle = "rgba(4,2,12,.5)"; ctx.fillRect(0, TOP, W, H - TOP);
    var w = 700, h = btn ? 300 : 180, x = (W - w) / 2, y = TOP + 120;
    panel(x, y, w, h); text(title, W / 2, y + 52, 52, col || "#6af0ff", "center");
    body.split("\n").forEach(function (l, i) { text(l, W / 2, y + 108 + i * 28, 20, "#f2e8d0", "center", false); });
    if (btn) button(W / 2 - 230, y + h - 74, 460, 54, btn[0], btn[1]);
    else button(W / 2 - 150, y + 90, 300, 54, "▶ Reprendre", togglePause);
  }

  // ---------- boucle & entrées ----------
  var last = 0, acc = 0;
  function frame(ts) {
    if (!last) last = ts; var dt = Math.min(.1, (ts - last) / 1000); last = ts;
    var steps = SPEED, step = dt;
    for (var i = 0; i < steps; i++) update(step);
    draw(); requestAnimationFrame(frame);
  }
  function cpos(ev) { var r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * H / r.height }; }
  cv.addEventListener("pointermove", function (e) { var p = cpos(e); mouse = p; var w = toWorld(p.x, p.y); hover = p.y > TOP ? slotAt(w) : null; });
  cv.addEventListener("pointerdown", function (e) { var p = cpos(e); mouse = p; if (e.button === 2) { cancel(); return; } var w = toWorld(p.x, p.y); hover = p.y > TOP ? slotAt(w) : null; onClick(p.x, p.y); });
  cv.addEventListener("contextmenu", function (e) { e.preventDefault(); cancel(); });
  window.addEventListener("keydown", function (e) {
    if (!loaded || !L) return; var k = e.key;
    if (k === "r" || k === "R") reset();
    else if (k === "Escape") { if (!cancel()) togglePause(); }
    else if (k === "p" || k === "P") togglePause();
    else if (k === "Enter" || k === " ") { if (G.state === "prep" && !G.paused) { startSeq(); e.preventDefault(); } }
    else if (k === "1") { if (G.state === "play" || G.state === "prep") { G.build = !G.build; if (G.build) G.sel = null; } }
    else if (k === "m" || k === "M") toggleSound();
    startAmbient();
  });
  function toggleSound() { muted = !muted; if (ambient) ambient.volume = muted ? 0 : .2; var b = document.querySelector("[data-ash-sound]"); if (b) { b.setAttribute("aria-pressed", String(!muted)); b.textContent = muted ? "🔇 Son coupé" : "🔊 Son"; } }
  var sb = document.querySelector("[data-ash-sound]"); if (sb) sb.addEventListener("click", toggleSound);

  window.__ash = { get G() { return G; }, slots: function () { return slots; }, build: function (i) { tryBuild(slots[i]); }, upgrade: function (i) { tryUpgrade(slots[i].tower); }, start: startSeq, reset: reset };
  boot();
})();
