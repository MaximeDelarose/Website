/* =========================================================================
   Merger — mini jeu maison
   On lâche les écureuils deux par deux dans le bac (on peut les permuter
   avant de les lâcher). Dès que 3 écureuils (ou plus) de la même couleur
   se touchent, ils disparaissent. Ne dépasse pas la ligne !
   Difficulté = nombre d'écureuils différents sélectionnés (ex. 6/12).
   Tout est dessiné dans le canvas (aucune image).
   Sauvegarde (localStorage) : « merger-pick » (sélection), « merger-best-<n> »
   (meilleur score par difficulté). Classement en ligne : id « merger ».
   ========================================================================= */
(function () {
  "use strict";

  var VERSION = "1.1.0";              // version affichée dans le menu (tag git : merger-v<VERSION>)
  var GAME_ID = "merger";
  var stage = document.querySelector("[data-merger]");
  if (!stage) return;
  var canvas = stage.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var overlay = stage.querySelector("[data-overlay]");
  var card = stage.querySelector("[data-card]");
  var muteBtn = stage.querySelector("[data-mute]");
  var pauseBtn = stage.querySelector("[data-pause]");
  var swapBtn = stage.querySelector("[data-swap]");
  var hud = stage.querySelector("[data-hud]");

  /* ---------- les 12 écureuils ----------
     body / dark = couleurs ; fur = motif de fourrure ; eyes / mouth / brow = expression ;
     acc = accessoire ; face / eyeC / nose / blush = retouches (voir drawSquirrel) */
  var SQUIRRELS = [
    { name: "Rosette",   body: "#f2a7a0", dark: "#c46f68", fur: "belly",      eyes: "sparkle",   mouth: "smile", acc: "bow", blush: 1.4 },
    { name: "Noisette",  body: "#f6c453", dark: "#c99520", fur: "stripes",    eyes: "happy",     mouth: "open" },
    { name: "Mousse",    body: "#9fcf6e", dark: "#6a9a3e", fur: "freckles",   eyes: "sleepy",    mouth: "smile", acc: "leaf" },
    { name: "Myrtille",  body: "#7fb0e8", dark: "#4f7fbb", fur: "cheekfluff", eyes: "glasses",   mouth: "smug" },
    { name: "Grisou",    body: "#b6b3cc", dark: "#7f7b99", fur: "spiky",      eyes: "normal",    mouth: "flat",  brow: "angry" },
    { name: "Roux",      body: "#e8873a", dark: "#b0581a", fur: "chest",      eyes: "wink",      mouth: "grin" },
    { name: "Châtaigne", body: "#a8673f", dark: "#6f3c20", fur: "mask",       eyes: "puppy",     mouth: "teeth" },
    { name: "Flocon",    body: "#fdf3de", dark: "#cdb58a", fur: "curls",      eyes: "surprised", mouth: "o",     nose: "#e86a8a" },
    { name: "Corbeau",   body: "#45415a", dark: "#24212f", fur: "star",       eyes: "slit",      mouth: "fang",  face: "#5f5a77", eyeC: "#f6d36b", nose: "#f6d36b" },
    { name: "Cerise",    body: "#e0544b", dark: "#a3302a", fur: "tiger",      eyes: "normal",    mouth: "open",  brow: "angry" },
    { name: "Lagon",     body: "#5cc6c0", dark: "#2f8f8a", fur: "swirl",      eyes: "starry",    mouth: "smile" },
    { name: "Lilas",     body: "#a982dc", dark: "#7652a8", fur: "bangs",      eyes: "dreamy",    mouth: "w",     blush: 1.5 },
  ];
  var N = SQUIRRELS.length;
  var R = 26.4;                       // rayon de tous les écureuils
  var GROUP = 3;                      // combien doivent se toucher pour disparaître

  /* ---------- le bac ---------- */
  var JW = 400, JH = 600;             // intérieur du bac
  var TOP = 110;                      // ligne de danger (depuis le haut)
  var DROP_Y = 52;                    // hauteur où la paire attend
  var BOWL = 330;                     // rayon de l'arrondi du fond
  var BX = JW / 2, BY = JH - BOWL;    // centre de l'arrondi
  var G = 1500, DAMP = 0.995, ITER = 6;

  function load(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var picked = (function () {
    var s = String(load("merger-pick", ""));
    var a = s === "" ? [] : s.split(",").map(Number).filter(function (i) { return i >= 0 && i < N; });
    a = a.filter(function (v, i) { return a.indexOf(v) === i; });
    return a.length >= 2 ? a.sort(function (x, y) { return x - y; }) : [0, 1, 2, 3, 4, 5];
  })();
  var sound = load("merger-sound", "1") !== "0";

  var state = "menu";                 // menu | play | pause | over
  var balls = [], pops = [], pair = null, next = [0, 0], aimX = JW / 2, cooldown = 0, score = 0, combo = 0, comboT = 0, overT = 0;
  var cleared = 0, swapT = 0, shake = 0, diff = picked.length, best = 0, clock = 0;

  function bestFor(n) { return Number(load("merger-best-" + n, 0)) || 0; }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pickType() { return picked[rnd(picked.length)]; }
  function newPair() { return [pickType(), pickType()]; }

  function reset() {
    balls = []; pops = []; score = 0; combo = 0; comboT = 0; overT = 0; cleared = 0; shake = 0; swapT = 0;
    diff = picked.length; best = bestFor(diff);
    pair = newPair(); next = newPair(); aimX = JW / 2; cooldown = 0;
  }

  function newBall(type, x, y) {
    return { type: type, x: x, y: y, px: x, py: y, r: R, born: 1, dead: false, age: 0,
      blink: Math.random() * 4, sq: 0, lastV: 0, pal: false, flip: Math.random() < 0.5 ? -1 : 1, breath: Math.random() * 6.28, rate: 1.6 + Math.random() * 0.8 };
  }

  function clampAim(x) { return Math.max(R * 2, Math.min(JW - R * 2, x)); }

  function drop() {
    if (state !== "play" || cooldown > 0) return;
    var x = clampAim(aimX);
    balls.push(newBall(pair[0], x - R, DROP_Y), newBall(pair[1], x + R, DROP_Y));
    pair = next; next = newPair();
    cooldown = 0.5;
    beep(320, 0.06, "triangle", 0.05);
  }

  function swap() {
    if (state !== "play") return;
    pair = [pair[1], pair[0]];
    swapT = 1;
    beep(520, 0.05, "sine", 0.04);
  }

  /* ---------- physique (Verlet + corrections de position) ---------- */
  function bounce(a, nx, ny, vx, vy) {
    // retire la vitesse qui rentre dans la paroi (petit rebond + frottement)
    var vn = vx * nx + vy * ny;
    if (vn > 0) { vx -= vn * 1.25 * nx; vy -= vn * 1.25 * ny; vx *= 0.97; vy *= 0.97; }
    a.px = a.x - vx; a.py = a.y - vy;
  }

  function step(dt) {
    var i, j, a, b, n = balls.length;
    for (i = 0; i < n; i++) {
      a = balls[i];
      var vx = (a.x - a.px) * DAMP, vy = (a.y - a.py) * DAMP;
      a.px = a.x; a.py = a.y;
      a.x += vx; a.y += vy + G * dt * dt;
      a.age += dt;
    }
    for (var k = 0; k < ITER; k++) {
      for (i = 0; i < n; i++) {
        a = balls[i];
        for (j = i + 1; j < n; j++) {
          b = balls[j];
          var dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r, d2 = dx * dx + dy * dy;
          if (d2 >= rr * rr || d2 === 0) continue;
          var d = Math.sqrt(d2), o = (rr - d) / d * 0.5;
          a.x -= dx * o; a.y -= dy * o;
          b.x += dx * o; b.y += dy * o;
        }
        var wvx = a.x - a.px, wvy = a.y - a.py;
        // murs
        if (a.x < a.r) { a.x = a.r; bounce(a, -1, 0, wvx, wvy); }
        else if (a.x > JW - a.r) { a.x = JW - a.r; bounce(a, 1, 0, wvx, wvy); }
        // fond arrondi vers le centre
        if (a.y > BY) {
          var ex = a.x - BX, ey = a.y - BY, ed = Math.sqrt(ex * ex + ey * ey), lim = BOWL - a.r;
          if (ed > lim) {
            var nx = ex / ed, ny = ey / ed;
            var ovx = a.x - a.px, ovy = a.y - a.py;
            a.x = BX + nx * lim; a.y = BY + ny * lim;
            bounce(a, nx, ny, ovx, ovy);
          }
        }
      }
    }
  }

  /* ---------- groupes de 3 ---------- */
  function findGroups() {
    var n = balls.length, seen = new Array(n), groups = [], i, j;
    var touch = (R * 2 + 3) * (R * 2 + 3);
    for (i = 0; i < n; i++) {
      if (seen[i] || balls[i].age < 0.08) continue;
      var stack = [i], grp = [];
      seen[i] = true;
      while (stack.length) {
        var A = balls[stack.pop()];
        grp.push(A);
        for (j = 0; j < n; j++) {
          if (seen[j]) continue;
          var B = balls[j];
          if (B.type !== A.type || B.age < 0.08) continue;
          var dx = B.x - A.x, dy = B.y - A.y;
          if (dx * dx + dy * dy <= touch) { seen[j] = true; stack.push(j); }
        }
      }
      grp.forEach(function (q) { q.pal = grp.length >= 2; });   // il sourit s'il touche un copain de sa couleur
      if (grp.length >= GROUP) groups.push(grp);
    }
    return groups;
  }

  function clearGroups() {
    var groups = findGroups();
    if (!groups.length) return;
    groups.forEach(function (g) {
      combo = comboT > 0 ? combo + 1 : 1; comboT = 1.2;
      var mult = Math.min(combo, 5);
      // 10 pts par écureuil (+10 par écureuil au-delà de 3) × difficulté × combo
      var gain = (g.length * 10 + (g.length - GROUP) * 10) * diff * mult;
      var cx = 0, cy = 0;
      g.forEach(function (b) { b.dead = true; cx += b.x; cy += b.y; burst(b.x, b.y, SQUIRRELS[b.type].body, 7); });
      cx /= g.length; cy /= g.length;
      score += gain; cleared += g.length;
      pops.push({ x: cx, y: cy, t: 0, txt: "+" + gain.toLocaleString("fr-FR") + (mult > 1 ? " x" + mult : "") });
      beep(330 + Math.min(combo, 6) * 90, 0.14, "sine", 0.08);
      if (g.length >= 5 || combo >= 3) shake = 0.25;
    });
    balls = balls.filter(function (b) { return !b.dead; });
  }

  function burst(x, y, col, n) {
    for (var i = 0; i < n; i++) {
      var an = Math.random() * 6.28, sp = 60 + Math.random() * 160;
      pops.push({ x: x, y: y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 60, t: 0, col: col, part: true, life: 0.45 + Math.random() * 0.4 });
    }
  }

  function update(dt) {
    clock += dt;
    if (state === "play") {
      var sub = 3, h = dt / sub;
      for (var s = 0; s < sub; s++) step(h);
      clearGroups();
      if (cooldown > 0) cooldown -= dt;
      if (comboT > 0) comboT -= dt; else combo = 0;
      // perdu si un écureuil posé reste au-dessus de la ligne
      var danger = balls.some(function (b) { return b.age > 1.2 && b.y - b.r < TOP && Math.abs(b.y - b.py) < 2; });
      overT = danger ? overT + dt : Math.max(0, overT - dt * 2);
      if (overT > 2.2) gameOver();
    }
    if (swapT > 0) swapT = Math.max(0, swapT - dt * 8);
    if (shake > 0) shake = Math.max(0, shake - dt);
    pops.forEach(function (p) {
      p.t += dt;
      if (p.part) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; }
      else p.y -= 30 * dt;
    });
    pops = pops.filter(function (p) { return p.part ? p.t < p.life : p.t < 1; });
    balls.forEach(function (b) {
      if (b.born > 0) b.born = Math.max(0, b.born - dt * 5);
      b.blink -= dt; if (b.blink < -0.15) b.blink = 2 + Math.random() * 4;
      // petit écrasement quand il atterrit
      var v = b.y - b.py;
      if (b.lastV > 2.5 && v < 0.8) b.sq = Math.min(1, b.lastV / 6);
      b.lastV = v;
      if (b.sq > 0) b.sq = Math.max(0, b.sq - dt * 5);
    });
  }

  /* ---------- dessin ---------- */
  var W = 0, H = 0, dpr = 1, S = 1, OX = 0, OY = 0, SIDE = true;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);   // au-delà de 2, on ne voit pas la différence mais ça rame
    var cw = Math.max(200, stage.clientWidth), ch = Math.max(200, stage.clientHeight);
    W = cw; H = ch;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
    // score et difficulté à gauche (ou en haut sur mobile)
    SIDE = cw > ch * 1.05;
    var availW = SIDE ? cw - 230 : cw - 24, availH = SIDE ? ch - 30 : ch - 100;
    S = Math.min(availW / (JW + 24), availH / (JH + 24));
    OX = SIDE ? 210 + (cw - 210 - JW * S) / 2 : (cw - JW * S) / 2;
    OY = SIDE ? (ch - JH * S) / 2 : 88 + (availH - JH * S) / 2;
    sprites.clear();
    paintBackground();
  }

  /* ---------- performances : tout ce qui ne bouge pas est dessiné une seule fois ----------
     - le fond (dégradé + glands) dans une image hors écran, refaite au redimensionnement ;
     - chaque écureuil en 2 « sprites » (queue / corps + visage) par type, côté, humeur,
       clignement et direction du regard (8 directions), à la taille exacte en pixels.
     Ensuite chaque image n'est plus que des drawImage. */
  var bgCanvas = document.createElement("canvas");
  function paintBackground() {
    bgCanvas.width = canvas.width; bgCanvas.height = canvas.height;
    var g = bgCanvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#3f6b3a"); bg.addColorStop(1, "#1f3a2b");
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = "rgba(255,255,255,.05)";
    for (var py = 0; py < H + 60; py += 70) for (var px = (py / 70 % 2) * 35; px < W + 60; px += 70) acorn(g, px, py, 9);
  }

  var sprites = new Map();
  function sprite(type, pr, flip, part, blink, mood, look) {
    var key = type + "|" + pr + "|" + flip + "|" + part + "|" + blink + "|" + mood + "|" + look;
    var sp = sprites.get(key);
    if (sp) return sp;
    if (sprites.size > 1500) sprites.clear();
    var size = Math.ceil(pr * 3.1) + 4, c = document.createElement("canvas");
    c.width = c.height = size;
    var cx = size / 2, cy = size * 0.56;
    var a = look < 0 ? 0 : look * Math.PI / 4;
    drawSquirrel(c.getContext("2d"), cx, cy, type, pr, { part: part, flip: flip, blink: blink ? -1 : 1, mood: mood,
      lx: look < 0 ? 0 : Math.cos(a), ly: look < 0 ? 0 : Math.sin(a) });
    sp = { c: c, cx: cx, cy: cy };
    sprites.set(key, sp);
    return sp;
  }
  function lookIndex(lx, ly) { return lx || ly ? (Math.round(Math.atan2(ly, lx) / (Math.PI / 4)) + 8) % 8 : -1; }

  // dessine un écureuil depuis le cache. r = rayon (unités courantes), px = pixels par unité,
  // o = { k (échelle respiration/apparition), alpha, flip, blink, mood, lx, ly, sq, wag }
  function blit(x, y, type, r, px, o) {
    o = o || {};
    var f = o.flip || 1, pr = Math.max(4, Math.round(r * px)), u = r / pr;
    var look = lookIndex(o.lx || 0, o.ly || 0), blink = (o.blink != null && o.blink < 0) ? 1 : 0, mood = o.mood || "";
    var tail = sprite(type, pr, f, "tail", 0, "", -1), body = sprite(type, pr, f, "body", blink, mood, look);
    var k = o.k || 1, sq = o.sq || 0;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.translate(x, y);
    if (sq) { ctx.translate(0, r * 0.14 * sq); ctx.scale(1 + 0.14 * sq, 1 - 0.14 * sq); }
    ctx.scale(k * u, k * u);
    // la queue remue autour de sa base
    ctx.save();
    ctx.translate(f * pr * 0.6, pr * 0.3); ctx.rotate(f * (o.wag || 0) * 0.16); ctx.translate(-f * pr * 0.6, -pr * 0.3);
    ctx.drawImage(tail.c, -tail.cx, -tail.cy);
    ctx.restore();
    ctx.drawImage(body.c, -body.cx, -body.cy);
    ctx.restore();
  }

  function lighten(hex) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return "rgb(" + Math.min(255, r + 50) + "," + Math.min(255, g + 50) + "," + Math.min(255, b + 50) + ")";
  }

  /* ---------- dessin d'un écureuil ----------
     o = { blink, alpha, flip, lx, ly (regard -1..1), mood ("happy" | "worried"),
           sq (écrasement 0..1), wag (queue -1..1), part ("tail" | "body" | tout) } — tout est optionnel.
     En jeu on passe par blit() (cache de sprites) ; drawSquirrel sert à remplir le cache. */
  var TAU = 6.2832;
  function drawSquirrel(g, x, y, type, r, o) {
    o = o || {};
    var c = SQUIRRELS[type], f = o.flip || 1, blink = o.blink == null ? 1 : o.blink;
    var lx = o.lx || 0, ly = o.ly || 0, mood = o.mood || "", sq = o.sq || 0, wag = o.wag || 0;
    var line = "#2b1709", lw = Math.max(1.2, r * 0.08), lite = lighten(c.body), dk = c.dark;
    g.save();
    g.globalAlpha = o.alpha == null ? 1 : o.alpha;
    g.translate(x, y);
    if (sq) { g.translate(0, r * 0.14 * sq); g.scale(1 + 0.14 * sq, 1 - 0.14 * sq); }
    g.strokeStyle = line; g.lineWidth = lw; g.lineJoin = "round"; g.lineCap = "round";
    function ell(cx, cy, rx, ry, rot, fill, stroke) { g.beginPath(); g.ellipse(cx, cy, rx, ry, rot || 0, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) g.stroke(); }
    function poly(pts, fill, stroke) { g.beginPath(); g.moveTo(pts[0] * r, pts[1] * r); for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i] * r, pts[i + 1] * r); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) g.stroke(); }

    /* --- derrière le corps : queue (qui remue), touffes, oreilles --- */
    if (o.part !== "body") {
    g.save();
    g.translate(f * r * 0.6, r * 0.3); g.rotate(f * wag * 0.16); g.translate(-f * r * 0.6, -r * 0.3);
    g.save();
    g.translate(f * r * 0.78, -r * 0.3); g.rotate(f * 0.35);
    ell(0, 0, r * 0.42, r * 0.8, 0, dk, true);
    ell(f * r * 0.06, -r * 0.1, r * 0.2, r * 0.55, 0, lighten(dk));
    g.restore();
    ell(f * r * 0.5, -r * 1.02, r * 0.3, r * 0.3, 0, dk, true);
    ell(f * r * 0.46, -r * 1.06, r * 0.14, r * 0.14, 0, lighten(dk));
    g.restore();
    }
    if (o.part === "tail") { g.restore(); return; }
    if (c.fur === "cheekfluff") [-1, 1].forEach(function (s) {
      poly([s * 0.88, -0.2, s * 1.2, -0.06, s * 0.98, 0.04, s * 1.22, 0.18, s * 0.96, 0.26, s * 1.12, 0.4, s * 0.85, 0.45], c.body, true);
    });
    [-1, 1].forEach(function (s) {
      ell(s * r * 0.45, -r * 0.82, r * 0.17, r * 0.26, s * 0.25, c.body, true);
      ell(s * r * 0.45, -r * 0.8, r * 0.08, r * 0.15, s * 0.25, "#f7b6a4");
      poly([s * 0.4, -1.04, s * 0.5, -1.24, s * 0.56, -1.02], dk);
    });

    /* --- corps + motifs de fourrure (découpés dans la boule) --- */
    var gr = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    gr.addColorStop(0, lite); gr.addColorStop(0.7, c.body); gr.addColorStop(1, dk);
    g.fillStyle = gr;
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.save();
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.clip();
    var face = c.face || "rgba(253,243,222,.88)";
    switch (c.fur) {
      case "belly": ell(0, r * 0.42, r * 0.62, r * 0.5, 0, face); break;
      case "stripes":
        g.strokeStyle = dk; g.lineWidth = r * 0.1;
        g.beginPath(); g.moveTo(0, -r); g.lineTo(0, -r * 0.42); g.moveTo(-r * 0.2, -r); g.lineTo(-r * 0.14, -r * 0.5); g.moveTo(r * 0.2, -r); g.lineTo(r * 0.14, -r * 0.5); g.stroke();
        break;
      case "freckles":
        ell(-r * 0.42, -r * 0.6, r * 0.13, r * 0.1, 0.4, lite); ell(r * 0.38, -r * 0.7, r * 0.08, r * 0.07, 0, lite); ell(r * 0.62, -r * 0.42, r * 0.06, r * 0.05, 0, lite);
        break;
      case "chest": ell(0, -r * 0.62, r * 0.13, r * 0.42, 0, face); break;
      case "mask": [-1, 1].forEach(function (s) { ell(s * r * 0.3, -r * 0.13, r * 0.23, r * 0.2, s * 0.3, "rgba(60,30,15,.45)"); }); break;
      case "tiger":
        g.strokeStyle = dk; g.lineWidth = r * 0.09;
        [-1, 1].forEach(function (s) { for (var i = 0; i < 3; i++) { g.beginPath(); g.moveTo(s * r, -r * 0.45 + i * r * 0.28); g.quadraticCurveTo(s * r * 0.8, -r * 0.38 + i * r * 0.28, s * r * 0.68, -r * 0.5 + i * r * 0.28); g.stroke(); } });
        g.beginPath(); g.moveTo(0, -r); g.lineTo(0, -r * 0.6); g.stroke();
        break;
      case "swirl":
        g.strokeStyle = lite; g.lineWidth = r * 0.07;
        g.beginPath(); g.arc(0, -r * 0.6, r * 0.14, 0.5, TAU - 0.3); g.stroke();
        g.beginPath(); g.arc(r * 0.02, -r * 0.6, r * 0.06, 0, Math.PI * 1.4); g.stroke();
        break;
      case "bangs":
        [-0.34, 0, 0.34].forEach(function (cx, i) { ell(cx * r, -r * (0.8 - (i === 1 ? 0.06 : 0)), r * 0.25, r * 0.23, 0, dk); });
        break;
    }
    ell(0, r * 0.3, r * 0.48, r * 0.4, 0, face);       // museau
    if (c.fur === "freckles") [-1, 1].forEach(function (s) { [[0.5, 0.06], [0.42, 0.13], [0.58, 0.15]].forEach(function (p) { ell(s * p[0] * r, p[1] * r, r * 0.03, r * 0.03, 0, dk); }); });
    g.restore();
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();

    /* --- devant : boucles, étoile, feuille, nœud --- */
    if (c.fur === "spiky") poly([-0.3, -0.9, -0.3, -1.2, -0.13, -1.0, 0.02, -1.3, 0.14, -0.99, 0.32, -1.16, 0.3, -0.88, 0, -0.96], dk, true);
    if (c.fur === "curls") [[-0.3, -0.86], [0.3, -0.86], [-0.12, -0.98], [0.14, -0.98]].forEach(function (p) { ell(p[0] * r, p[1] * r, r * 0.17, r * 0.17, 0, lite, true); });
    if (c.fur === "star") {
      g.beginPath();
      for (var k = 0; k < 10; k++) { var a = -Math.PI / 2 + k * Math.PI / 5, rad = (k % 2 ? 0.07 : 0.16) * r; g.lineTo(Math.cos(a) * rad, -r * 0.6 + Math.sin(a) * rad); }
      g.closePath(); g.fillStyle = "#8f88b8"; g.fill();
    }
    if (c.acc === "leaf") {
      g.save(); g.translate(-f * r * 0.12, -r * 0.98); g.rotate(-f * 0.5);
      ell(0, -r * 0.14, r * 0.1, r * 0.2, 0, "#3f8a3a", true);
      g.strokeStyle = "#9fd77e"; g.lineWidth = Math.max(1, r * 0.03); g.beginPath(); g.moveTo(0, -r * 0.3); g.lineTo(0, r * 0.04); g.stroke();
      g.restore(); g.strokeStyle = line; g.lineWidth = lw;
    }
    if (c.acc === "bow") {
      g.save(); g.translate(-f * r * 0.45, -r * 1.02); g.lineWidth = Math.max(1, lw * 0.7);
      poly([0, 0, -0.2, -0.13, -0.2, 0.13], "#e8506e", true); poly([0, 0, 0.2, -0.13, 0.2, 0.13], "#e8506e", true);
      ell(0, 0, r * 0.06, r * 0.06, 0, "#ff8fa8", true);
      g.restore(); g.lineWidth = lw;
    }

    /* --- yeux (qui regardent) --- */
    var ex = r * 0.3, ey = -r * 0.14, px = lx * r * 0.045, py = ly * r * 0.045;
    var eyeC = c.eyeC || "#2b1709";
    function closed(s, up) { g.strokeStyle = eyeC; g.lineWidth = lw; g.beginPath(); if (up) g.arc(s * ex, ey + r * 0.04, r * 0.1, Math.PI + 0.35, TAU - 0.35); else g.arc(s * ex, ey - r * 0.04, r * 0.1, 0.35, Math.PI - 0.35); g.stroke(); }
    function dot(s, w, h, col) { ell(s * ex + px, ey + py, w, h, 0, col || eyeC); }
    function shine(s, sz, dx, dy) { ell(s * ex + px - r * (dx == null ? 0.035 : dx), ey + py - r * (dy == null ? 0.06 : dy), r * sz, r * sz, 0, "#fff"); }
    function lashes(s) { g.strokeStyle = eyeC; g.lineWidth = Math.max(1, lw * 0.6); g.beginPath(); g.moveTo(s * (ex + r * 0.1), ey - r * 0.1); g.lineTo(s * (ex + r * 0.19), ey - r * 0.17); g.moveTo(s * (ex + r * 0.04), ey - r * 0.15); g.lineTo(s * (ex + r * 0.09), ey - r * 0.24); g.stroke(); }
    var eyes = c.eyes;
    if (mood === "happy" && eyes !== "slit" && eyes !== "glasses") eyes = "happy";
    [-1, 1].forEach(function (s) {
      if (blink < 0 && eyes !== "happy") { closed(s); return; }
      switch (eyes) {
        case "sparkle": dot(s, r * 0.14, r * 0.17); shine(s, 0.06); shine(s, 0.03, -0.04, -0.06); lashes(s); break;
        case "happy": closed(s, true); break;
        case "sleepy":
          // paupières mi-closes : demi-œil sous un trait
          g.beginPath(); g.ellipse(s * ex, ey - r * 0.02, r * 0.12, r * 0.12, 0, 0, Math.PI); g.fillStyle = eyeC; g.fill();
          g.strokeStyle = eyeC; g.lineWidth = lw; g.beginPath(); g.moveTo(s * ex - r * 0.14, ey - r * 0.02); g.lineTo(s * ex + r * 0.14, ey - r * 0.02); g.stroke();
          ell(s * ex - r * 0.04, ey + r * 0.03, r * 0.025, r * 0.025, 0, "#fff");
          break;
        case "glasses": dot(s, r * 0.08, r * 0.1); shine(s, 0.03, 0.02, 0.04); break;
        case "wink": if (s === 1) { g.strokeStyle = eyeC; g.lineWidth = lw; g.beginPath(); g.moveTo(s * ex - r * 0.1, ey - r * 0.08); g.lineTo(s * ex + r * 0.06, ey); g.lineTo(s * ex - r * 0.1, ey + r * 0.08); g.stroke(); } else { dot(s, r * 0.12, r * 0.15); shine(s, 0.05); } break;
        case "puppy": dot(s, r * 0.16, r * 0.19); shine(s, 0.075, 0.05, 0.07); shine(s, 0.035, -0.06, -0.06); break;
        case "surprised": ell(s * ex, ey, r * 0.14, r * 0.15, 0, "#fff", true); dot(s, r * 0.05, r * 0.05); break;
        case "slit": ell(s * ex + px, ey + py, r * 0.13, r * 0.15, 0, eyeC); ell(s * ex + px, ey + py, r * 0.035, r * 0.12, 0, "#1a1622"); shine(s, 0.03, 0.05, 0.07); break;
        case "starry":
          dot(s, r * 0.14, r * 0.16);
          g.beginPath();
          for (var k = 0; k < 10; k++) { var a = -Math.PI / 2 + k * Math.PI / 5, rad = (k % 2 ? 0.035 : 0.085) * r; g.lineTo(s * ex + px + Math.cos(a) * rad, ey + py - r * 0.02 + Math.sin(a) * rad); }
          g.closePath(); g.fillStyle = "#fff"; g.fill();
          break;
        case "dreamy": dot(s, r * 0.12, r * 0.15); shine(s, 0.045, 0.02, 0.08); shine(s, 0.025, -0.05, 0.02); lashes(s); break;
        default: dot(s, r * 0.12, r * 0.15); shine(s, 0.05);
      }
    });
    if (c.eyes === "glasses") {
      g.strokeStyle = "#2b1709"; g.lineWidth = Math.max(1, lw * 0.8);
      [-1, 1].forEach(function (s) { g.beginPath(); g.arc(s * ex, ey, r * 0.17, 0, TAU); g.stroke(); });
      g.beginPath(); g.moveTo(-ex + r * 0.17, ey); g.quadraticCurveTo(0, ey - r * 0.06, ex - r * 0.17, ey); g.stroke();
      g.fillStyle = "rgba(255,255,255,.35)"; [-1, 1].forEach(function (s) { g.beginPath(); g.arc(s * ex, ey, r * 0.16, 3.6, 4.6); g.lineTo(s * ex, ey); g.fill(); });
    }
    // sourcils
    var brow = mood === "worried" ? "worried" : c.brow;
    if (brow) {
      var k2 = brow === "angry" ? 0.07 : -0.07;
      g.strokeStyle = line; g.lineWidth = Math.max(1.2, r * 0.07);
      [-1, 1].forEach(function (s) { g.beginPath(); g.moveTo(s * r * 0.14, ey - r * 0.24 + k2 * r); g.lineTo(s * r * 0.44, ey - r * 0.24 - k2 * r); g.stroke(); });
    }

    /* --- joues, nez, bouche --- */
    g.fillStyle = "rgba(240,110,110," + (0.42 * (c.blush || 1)) + ")";
    [-1, 1].forEach(function (s) { g.beginPath(); g.ellipse(s * r * 0.5, r * 0.16, r * 0.14 * (c.blush || 1), r * 0.09, 0, 0, TAU); g.fill(); });
    ell(0, r * 0.1, r * 0.08, r * 0.055, 0, c.nose || "#5a2f1c");
    var mouth = c.mouth;
    if (mood === "happy" && mouth !== "grin" && mouth !== "fang") mouth = "open";
    if (mood === "worried") mouth = "wobble";
    g.strokeStyle = line; g.lineWidth = Math.max(1, lw * 0.7);
    function teeth(w, h) { g.fillStyle = "#fff"; g.lineWidth = Math.max(1, lw * 0.5); g.beginPath(); g.rect(-r * w / 2, r * 0.235, r * w, r * h); g.fill(); g.stroke(); g.beginPath(); g.moveTo(0, r * 0.235); g.lineTo(0, r * (0.235 + h)); g.stroke(); }
    function smile() { g.beginPath(); g.moveTo(0, r * 0.15); g.lineTo(0, r * 0.22); g.moveTo(-r * 0.13, r * 0.2); g.quadraticCurveTo(0, r * 0.28, r * 0.13, r * 0.2); g.stroke(); }
    switch (mouth) {
      case "open":
        g.beginPath(); g.moveTo(-r * 0.16, r * 0.19); g.quadraticCurveTo(0, r * 0.46, r * 0.16, r * 0.19); g.closePath(); g.fillStyle = "#7a2a2a"; g.fill(); g.stroke();
        ell(0, r * 0.32, r * 0.07, r * 0.04, 0, "#e86a7a");
        g.fillStyle = "#fff"; g.fillRect(-r * 0.065, r * 0.2, r * 0.13, r * 0.06);
        break;
      case "o": ell(0, r * 0.27, r * 0.05, r * 0.065, 0, "#7a2a2a", true); break;
      case "smug": g.beginPath(); g.moveTo(-r * 0.12, r * 0.23); g.quadraticCurveTo(r * 0.04, r * 0.28, r * 0.16, r * 0.16); g.stroke(); break;
      case "flat": g.beginPath(); g.moveTo(-r * 0.11, r * 0.23); g.lineTo(r * 0.11, r * 0.23); g.stroke(); break;
      case "grin":
        g.beginPath(); g.moveTo(-r * 0.24, r * 0.17); g.quadraticCurveTo(0, r * 0.44, r * 0.24, r * 0.17); g.closePath(); g.fillStyle = "#fff"; g.fill(); g.stroke();
        g.lineWidth = Math.max(1, lw * 0.4); g.beginPath(); g.moveTo(-r * 0.2, r * 0.23); g.lineTo(r * 0.2, r * 0.23); g.moveTo(-r * 0.08, r * 0.18); g.lineTo(-r * 0.08, r * 0.32); g.moveTo(r * 0.08, r * 0.18); g.lineTo(r * 0.08, r * 0.32); g.stroke();
        break;
      case "teeth": smile(); teeth(0.2, 0.17); break;
      case "fang":
        g.beginPath(); g.moveTo(-r * 0.14, r * 0.2); g.quadraticCurveTo(0, r * 0.27, r * 0.15, r * 0.17); g.stroke();
        poly([0.04, 0.225, 0.11, 0.21, 0.08, 0.31], "#fff", true);
        break;
      case "w": g.beginPath(); g.arc(-r * 0.07, r * 0.19, r * 0.07, 0.2, Math.PI - 0.2); g.arc(r * 0.07, r * 0.19, r * 0.07, 0.2, Math.PI - 0.2); g.stroke(); break;
      case "wobble": g.beginPath(); g.moveTo(-r * 0.14, r * 0.25); for (var i = 1; i <= 4; i++) g.lineTo(-r * 0.14 + i * r * 0.07, r * (i % 2 ? 0.21 : 0.25)); g.stroke(); break;
      default: smile(); teeth(0.15, 0.12);
    }
    // goutte de sueur quand ça déborde
    if (mood === "worried") {
      g.beginPath(); g.moveTo(-f * r * 0.72, -r * 0.62); g.quadraticCurveTo(-f * r * 0.86, -r * 0.4, -f * r * 0.72, -r * 0.36); g.quadraticCurveTo(-f * r * 0.58, -r * 0.4, -f * r * 0.72, -r * 0.62);
      g.fillStyle = "#9fdcff"; g.fill(); g.lineWidth = Math.max(1, lw * 0.5); g.strokeStyle = "#2b6a8a"; g.stroke();
    }
    g.restore();
  }

  // forme du bac : murs droits + fond arrondi vers le centre
  function jarPath(pad) {
    var a0 = Math.asin(Math.min(1, (BX + pad) / (BOWL + pad)));
    ctx.beginPath();
    ctx.moveTo(-pad, -pad);
    ctx.lineTo(-pad, BY + Math.cos(a0) * (BOWL + pad));
    ctx.arc(BX, BY, BOWL + pad, Math.PI / 2 + a0, Math.PI / 2 - a0, true);
    ctx.lineTo(JW + pad, -pad);
    ctx.closePath();
  }

  function acorn(g, x, y, s) {
    g.beginPath(); g.ellipse(x, y + s * 0.3, s * 0.7, s * 0.85, 0, 0, 6.2832); g.fill();
    g.beginPath(); g.ellipse(x, y - s * 0.35, s * 0.9, s * 0.45, 0, 0, 6.2832); g.fill();
    g.fillRect(x - s * 0.1, y - s * 1.05, s * 0.2, s * 0.4);
  }

  // respiration : chaque écureuil gonfle et dégonfle doucement, à son rythme
  function breathe(b) { return 1 + 0.045 * Math.sin(clock * b.rate + b.breath); }

  function render(now) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bgCanvas, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var PX = S * dpr;   // pixels par unité du bac

    var sx = shake > 0 ? (Math.random() - 0.5) * shake * 16 : 0, sy = shake > 0 ? (Math.random() - 0.5) * shake * 16 : 0;
    ctx.save();
    ctx.translate(OX + sx, OY + sy); ctx.scale(S, S);

    // bac
    ctx.fillStyle = "rgba(255,255,255,.10)"; jarPath(10); ctx.fill();
    ctx.fillStyle = "rgba(12,26,16,.55)"; jarPath(0); ctx.fill();
    // ligne de danger
    var pulse = overT > 0 ? 0.5 + 0.5 * Math.sin(now / 80) : 0;
    ctx.strokeStyle = overT > 0 ? "rgba(255," + Math.round(80 + 100 * pulse) + ",90,1)" : "rgba(255,140,90,.5)";
    ctx.lineWidth = 3; ctx.setLineDash([12, 10]);
    ctx.beginPath(); ctx.moveTo(0, TOP); ctx.lineTo(JW, TOP); ctx.stroke();
    ctx.setLineDash([]);

    // la paire qui attend (avec l'animation de permutation)
    if (pair && (state === "play" || state === "pause")) {
      var ax = clampAim(aimX), k = swapT, al = cooldown > 0.15 ? 0.35 : 1;
      ctx.strokeStyle = "rgba(255,255,255,.15)"; ctx.lineWidth = 2;
      [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.moveTo(ax + s * R, DROP_Y + R); ctx.lineTo(ax + s * R, JH); ctx.stroke(); });
      var x0 = ax - R + 2 * R * k, x1 = ax + R - 2 * R * k, lift = Math.sin(k * Math.PI) * 14;
      var bz = 1 + 0.04 * Math.sin(clock * 2);
      var wg = Math.sin(clock * 6);
      blit(x0, DROP_Y - lift, pair[0], R, PX, { k: bz, alpha: al, flip: -1, ly: 1, lx: 0.4, wag: wg });
      blit(x1, DROP_Y + lift, pair[1], R, PX, { k: bz, alpha: al, flip: 1, ly: 1, lx: -0.4, wag: -wg });
    }

    // écureuils (ils respirent)
    var ax = pair ? clampAim(aimX) : JW / 2 + Math.sin(clock * 0.7) * 150;
    balls.forEach(function (b) {
      var sc = (1 - b.born * 0.35 + Math.sin(b.born * 9) * b.born * 0.1) * breathe(b);
      // il suit la paire du regard, remue la queue, sourit près d'un copain, panique près de la ligne
      var dx = ax - b.x, dy = DROP_Y - b.y, dl = Math.sqrt(dx * dx + dy * dy) || 1;
      var mood = b.y - b.r < TOP + 24 && b.age > 0.8 ? "worried" : b.pal ? "happy" : "";
      blit(b.x, b.y, b.type, R, PX, { k: sc, blink: b.blink, flip: b.flip, lx: dx / dl, ly: dy / dl, mood: mood, sq: b.sq,
        wag: Math.sin(clock * b.rate * (mood ? 3 : 1.4) + b.breath) });
    });

    // contour + reflet
    ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(14, 40); ctx.lineTo(14, JH * 0.45); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 4;
    jarPath(10); ctx.stroke();

    // particules et points
    pops.forEach(function (p) {
      if (p.part) {
        ctx.globalAlpha = Math.max(0, 1 - p.t / p.life); ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 6.28); ctx.fill();
      } else {
        ctx.globalAlpha = Math.max(0, 1 - p.t);
        ctx.font = "900 22px Nunito, sans-serif"; ctx.textAlign = "center";
        ctx.lineWidth = 5; ctx.strokeStyle = "#2b1709"; ctx.strokeText(p.txt, p.x, p.y);
        ctx.fillStyle = "#f6d36b"; ctx.fillText(p.txt, p.x, p.y);
      }
      ctx.globalAlpha = 1;
    });
    ctx.restore();

    drawPanel();
  }

  function drawPanel() {
    var x, y;
    function label(t, xx, yy, al) { ctx.textAlign = al || "left"; ctx.font = "800 13px Nunito, sans-serif"; ctx.fillStyle = "#cfe3b8"; ctx.fillText(t, xx, yy); }
    function big(t, xx, yy, col, size, al) {
      ctx.textAlign = al || "left";
      ctx.font = "900 " + (size || 28) + "px Nunito, sans-serif"; ctx.lineWidth = 5; ctx.strokeStyle = "#2b1709"; ctx.strokeText(t, xx, yy);
      ctx.fillStyle = col || "#fdf3de"; ctx.fillText(t, xx, yy);
    }
    var d = state === "menu" ? picked.length : diff;
    var hi = Math.max(state === "menu" ? bestFor(d) : best, score).toLocaleString("fr-FR");
    ctx.textBaseline = "top";
    if (SIDE) {
      x = 24; y = Math.max(16, OY + 6);
      label("SCORE", x, y); big(score.toLocaleString("fr-FR"), x, y + 16);
      label("MEILLEUR (" + d + "/" + N + ")", x, y + 56); big(hi, x, y + 72, "#f6d36b", 22);
      label("DIFFICULTÉ", x, y + 110); big(d + "/" + N, x, y + 126, "#fdf3de", 28);
      // les 12 écureuils, ceux de la partie en couleur
      for (var i = 0; i < N; i++) {
        var on = picked.indexOf(i) >= 0;
        blit(x + 16 + (i % 4) * 40, y + 190 + Math.floor(i / 4) * 40, i, 13, dpr, { alpha: on ? 1 : 0.18 });
      }
      if (pair) {
        label("SUIVANT", x, y + 320);
        blit(x + 26, y + 368, next[0], 22, dpr, { flip: -1, wag: Math.sin(clock * 3) });
        blit(x + 72, y + 368, next[1], 22, dpr, { wag: Math.sin(clock * 3 + 1) });
      }
      if (combo > 1) { label("COMBO", x, y + 412); big("x" + Math.min(combo, 5), x, y + 428, "#9fcf6e"); }
    } else {
      x = 14; y = 10;
      label("SCORE", x, y); big(score.toLocaleString("fr-FR"), x, y + 16, null, 26);
      label("MEILLEUR " + hi, x, y + 50);
      label("DIFFICULTÉ", W / 2 + 10, y, "center"); big(d + "/" + N, W / 2 + 10, y + 16, "#fdf3de", 26, "center");
      if (combo > 1) { ctx.textAlign = "center"; ctx.font = "900 15px Nunito, sans-serif"; ctx.fillStyle = "#9fcf6e"; ctx.fillText("combo x" + Math.min(combo, 5), W / 2 + 10, y + 50); }
      if (pair) {
        label("SUIVANT", W - 14, y, "right");
        blit(W - 64, y + 42, next[0], 17, dpr, { flip: -1 });
        blit(W - 30, y + 42, next[1], 17, dpr);
      }
    }
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  /* ---------- son (WebAudio, aucun fichier) ---------- */
  var AC = null;
  function beep(f, d, type, vol, delay) {
    if (!sound) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      var t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
      o.type = type || "sine"; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.6, t + d);
      g.gain.setValueAtTime(vol || 0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
    } catch (e) {}
  }

  /* ---------- écrans ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function show(html) { card.innerHTML = html; overlay.hidden = false; }
  function hide() { overlay.hidden = true; }

  // petites images des écureuils pour l'écran de sélection
  var ICONS = SQUIRRELS.map(function (s, i) {
    var c = document.createElement("canvas"); c.width = c.height = 96;
    drawSquirrel(c.getContext("2d"), 44, 58, i, 28);
    return c.toDataURL();
  });

  function pickerHtml() {
    var h = '<div class="mg-picker" role="group" aria-label="Écureuils de la partie">';
    SQUIRRELS.forEach(function (s, i) {
      var on = picked.indexOf(i) >= 0;
      h += '<button type="button" class="mg-pick" data-pick="' + i + '" aria-pressed="' + on + '" title="' + esc(s.name) + '">' +
        '<img src="' + ICONS[i] + '" alt="' + esc(s.name) + '" width="48" height="48"></button>';
    });
    return h + "</div>";
  }

  function menu() {
    state = "menu"; hud.hidden = true;
    var d = picked.length;
    show('<h2>Merger</h2>' +
      '<p>Lâche les écureuils <strong>deux par deux</strong>. Dès que <strong>3 écureuils de la même couleur</strong> se touchent, ils disparaissent.</p>' +
      '<p class="game-small">Appuie sur la paire en haut pour inverser les deux écureuils.</p>' +
      '<p class="game-small">Choisis les écureuils de la partie : plus il y en a, plus c\'est dur (et plus ça rapporte).</p>' +
      pickerHtml() +
      '<p class="mg-diff">Difficulté : <strong>' + d + '/' + N + '</strong> · meilleur score : <strong>' + bestFor(d).toLocaleString("fr-FR") + '</strong></p>' +
      '<p class="mg-quick"><button class="btn btn-ghost btn-small" type="button" data-act="easy">Facile 4/12</button> ' +
      '<button class="btn btn-ghost btn-small" type="button" data-act="mid">Moyen 6/12</button> ' +
      '<button class="btn btn-ghost btn-small" type="button" data-act="all">Tout 12/12</button></p>' +
      '<p><button class="btn" type="button" data-act="start">▶ Jouer</button></p>' +
      '<p class="game-small"><span class="ctrl-desk">Souris ou ← → pour viser · clic / Espace pour lâcher · clic sur la paire, clic droit ou ↑ pour permuter · P pour la pause</span></p>' +
      '<p class="game-version">Merger v' + VERSION + '</p>');
  }

  function setPicked(a) { picked = a.slice().sort(function (x, y) { return x - y; }); store("merger-pick", picked.join(",")); menu(); }

  function start() {
    reset(); state = "play"; hide(); hud.hidden = false;
    canvas.focus({ preventScroll: true });
  }

  function pause() {
    if (state !== "play") return;
    state = "pause";
    show('<h2>Pause</h2><p>Score : <strong>' + score.toLocaleString("fr-FR") + '</strong> · difficulté ' + diff + '/' + N + '</p>' +
      '<p><button class="btn" type="button" data-act="resume">▶ Reprendre</button> ' +
      '<button class="btn btn-ghost" type="button" data-act="start">↻ Recommencer</button> ' +
      '<button class="btn btn-ghost" type="button" data-act="menu">Menu</button></p>');
  }
  function resume() { if (state === "pause") { state = "play"; hide(); canvas.focus({ preventScroll: true }); } }

  function gameOver() {
    state = "over"; hud.hidden = true;
    var rec = score > best;
    if (rec) { best = score; store("merger-best-" + diff, String(best)); }
    beep(300, 0.3, "sawtooth", 0.05); beep(200, 0.4, "sawtooth", 0.05, 0.2);
    var lbOk = window.Leaderboard && Leaderboard.configured() && score > 0;
    var name = String(load("merger-name", ""));
    show('<h2>' + (rec ? "Nouveau record !" : "Le bac déborde !") + '</h2>' +
      '<p>Score : <strong>' + score.toLocaleString("fr-FR") + '</strong> · difficulté ' + diff + '/' + N + '</p>' +
      '<p class="game-small">' + cleared + ' écureuils envoyés gambader</p>' +
      (lbOk ? '<form class="submit-score" data-submit><label for="mg-name">Ton pseudo pour le classement</label><div class="submit-row">' +
        '<input id="mg-name" type="text" maxlength="20" minlength="2" required autocomplete="nickname" value="' + esc(name) + '">' +
        '<button class="btn btn-alt btn-small" type="submit">Envoyer</button></div><p class="game-small" data-submit-msg aria-live="polite"></p></form>' : "") +
      '<p><button class="btn" type="button" data-act="start">↻ Rejouer</button> <button class="btn btn-ghost" type="button" data-act="menu">Menu</button></p>');
    var form = card.querySelector("[data-submit]");
    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = form.querySelector("input"), btn = form.querySelector("button"), msg = form.querySelector("[data-submit-msg]");
      var n = input.value.trim();
      store("merger-name", n);
      btn.disabled = true; msg.textContent = "Envoi…";
      Leaderboard.submit(GAME_ID, n, score, { diff: diff, cleared: cleared }).then(function (res) {
        msg.textContent = "Envoyé ! " + (res && res.rank ? "Tu es " + res.rank + (res.rank === 1 ? "er" : "e") + "." : "");
        document.querySelectorAll('[data-leaderboard="' + GAME_ID + '"]').forEach(function (el) { el.removeAttribute("data-lb-rendered"); Leaderboard.render(el); });
      }).catch(function (err) { msg.textContent = Leaderboard.message(err); btn.disabled = false; });
    });
  }

  card.addEventListener("click", function (e) {
    var p = e.target.closest("[data-pick]");
    if (p) {
      var i = Number(p.getAttribute("data-pick")), at = picked.indexOf(i);
      if (at >= 0) { if (picked.length > 2) { var c = picked.slice(); c.splice(at, 1); setPicked(c); } }
      else setPicked(picked.concat(i));
      var again = card.querySelector('[data-pick="' + i + '"]'); if (again) again.focus();
      return;
    }
    var b = e.target.closest("[data-act]");
    if (!b) return;
    var a = b.getAttribute("data-act");
    if (a === "start") start();
    else if (a === "resume") resume();
    else if (a === "menu") { pair = null; balls = []; score = 0; combo = 0; menu(); }
    else if (a === "easy") setPicked([0, 1, 2, 3]);
    else if (a === "mid") setPicked([0, 1, 2, 3, 4, 5]);
    else if (a === "all") setPicked(SQUIRRELS.map(function (s, i) { return i; }));
  });

  /* ---------- contrôles ---------- */
  function toJar(clientX) { var rc = canvas.getBoundingClientRect(); return (clientX - rc.left - OX) / S; }
  function toJarY(clientY) { var rc = canvas.getBoundingClientRect(); return (clientY - rc.top - OY) / S; }
  // appuyer sur la paire en haut du bac l'inverse
  function onPair(e) {
    var jx = toJar(e.clientX), jy = toJarY(e.clientY), ax = clampAim(aimX);
    return Math.abs(jx - ax) <= R * 2 + 6 && jy >= DROP_Y - R * 1.4 - 6 && jy <= DROP_Y + R + 6;
  }
  var pointerDown = false;
  canvas.addEventListener("pointermove", function (e) { if (state === "play" && (e.pointerType === "mouse" || pointerDown)) aimX = toJar(e.clientX); });
  canvas.addEventListener("pointerdown", function (e) {
    if (state !== "play") return;
    if (e.pointerType === "mouse" && e.button === 2) { swap(); return; }
    if (onPair(e)) { swap(); pointerDown = false; return; }
    pointerDown = true; aimX = toJar(e.clientX);
    if (e.pointerType === "mouse") drop();
  });
  canvas.addEventListener("pointerup", function (e) {
    // au doigt : on vise en glissant, on lâche en relevant le doigt
    if (pointerDown && e.pointerType !== "mouse" && state === "play") { aimX = toJar(e.clientX); drop(); }
    pointerDown = false;
  });
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  var keys = {};
  document.addEventListener("keydown", function (e) {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    var k = e.key;
    if (state === "play" && (k === " " || k === "ArrowDown" || k === "Enter" || k === "s" || k === "S")) { e.preventDefault(); drop(); }
    else if (state === "play" && (k === "ArrowUp" || /^[zwxZWX]$/.test(k) || k === "Shift")) { e.preventDefault(); if (!e.repeat) swap(); }
    else if (k === "ArrowLeft" || k === "ArrowRight" || /^[qadQAD]$/.test(k)) { if (state === "play") { keys[k.toLowerCase()] = true; e.preventDefault(); } }
    else if (k === "p" || k === "P" || k === "Escape") { if (state === "play") pause(); else if (state === "pause") resume(); }
  });
  document.addEventListener("keyup", function (e) { keys[e.key.toLowerCase()] = false; });

  swapBtn.addEventListener("click", swap);
  pauseBtn.addEventListener("click", function () { if (state === "play") pause(); else resume(); });
  function muteLabel() { muteBtn.textContent = sound ? "🔊" : "🔇"; muteBtn.setAttribute("aria-label", sound ? "Couper le son" : "Activer le son"); }
  muteLabel();
  muteBtn.addEventListener("click", function () { sound = !sound; store("merger-sound", sound ? "1" : "0"); muteLabel(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden) pause(); });

  /* ---------- plein écran ---------- */
  function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement) || stage.classList.contains("is-max"); }
  function syncFull() { stage.classList.toggle("is-full", isFull()); }
  function enterFull() {
    var req = stage.requestFullscreen || stage.webkitRequestFullscreen;
    var fallback = function () { stage.classList.add("is-max"); syncFull(); };
    if (req) { try { var pr = req.call(stage); if (pr && pr.catch) pr.catch(fallback); } catch (e) { fallback(); } } else fallback();
  }
  function exitFull() {
    stage.classList.remove("is-max");
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
    syncFull();
  }
  document.addEventListener("fullscreenchange", syncFull);
  document.addEventListener("webkitfullscreenchange", syncFull);
  var fsBtn = document.querySelector("[data-game-fullscreen]");
  if (fsBtn) fsBtn.addEventListener("click", function () { if (isFull()) exitFull(); else enterFull(); });
  var fsExit = stage.querySelector("[data-fs-exit]");
  if (fsExit) fsExit.addEventListener("click", exitFull);

  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();

  /* ---------- boucle ---------- */
  var last = performance.now();
  function loop(now) {
    var dt = Math.min(0.033, (now - last) / 1000); last = now;
    if (state === "play") {
      var mv = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.q || keys.a ? 1 : 0);
      if (mv) aimX = clampAim(clampAim(aimX) + mv * 360 * dt);
    }
    if (state !== "pause") update(dt);
    render(now);
    requestAnimationFrame(loop);
  }

  // outils de test (console)
  window.MERGER_DEBUG = {
    version: VERSION,
    state: function () { return { state: state, score: score, balls: balls.length, diff: diff, cleared: cleared, pair: pair && pair.slice() }; },
    add: function (type, x) { balls.push(newBall(type, x == null ? JW / 2 : x, DROP_Y)); },
    swap: swap,
    geo: function () { return { ox: OX, oy: OY, s: S, ax: clampAim(aimX), dropY: DROP_Y, sprites: sprites.size }; },
    draw: function (g, x, y, type, r, o) { drawSquirrel(g, x, y, type, r, o); },
    over: function () { gameOver(); },
  };

  menu();
  requestAnimationFrame(loop);
})();
