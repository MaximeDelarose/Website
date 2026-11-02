/* =========================================================================
   Chaaat — version web (mini jeu maison)
   Lâche des chats dans le bocal : deux chats de la même couleur qui se
   touchent fusionnent en un chat plus gros. Ne dépasse pas la ligne !
   Tout est dessiné dans le canvas (aucune image). Meilleur score :
   localStorage « chaaat-best ». Classement en ligne : id « chaaat ».
   ========================================================================= */
(function () {
  "use strict";

  var GAME_ID = "chaaat";
  var stage = document.querySelector("[data-chaaat]");
  if (!stage) return;
  var canvas = stage.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var overlay = stage.querySelector("[data-overlay]");
  var card = stage.querySelector("[data-card]");
  var muteBtn = stage.querySelector("[data-mute]");
  var pauseBtn = stage.querySelector("[data-pause]");
  var hud = stage.querySelector("[data-hud]");

  /* ---------- les chats (du plus petit au plus gros) ----------
     r = rayon (unités du bocal, largeur 400), pts = points gagnés en le créant */
  var CATS = [
    { name: "Chaton",    r: 15,  body: "#f28fa8", dark: "#c9617d", pts: 1 },
    { name: "Minou",     r: 21,  body: "#f6c453", dark: "#c99520", pts: 3 },
    { name: "Matou",     r: 28,  body: "#7cc9a0", dark: "#4b9871", pts: 6 },
    { name: "Félix",     r: 36,  body: "#7fb0e8", dark: "#4f7fbb", pts: 10 },
    { name: "Grisou",    r: 45,  body: "#b49ae0", dark: "#8268b3", pts: 15 },
    { name: "Caramel",   r: 55,  body: "#f0a060", dark: "#c06f2e", pts: 21 },
    { name: "Pacha",     r: 66,  body: "#ef6f6c", dark: "#bb4441", pts: 28 },
    { name: "Duchesse",  r: 78,  body: "#fdf3de", dark: "#d2c19e", pts: 36 },
    { name: "Roi Chaaat", r: 92, body: "#3d3a4f", dark: "#1f1d2b", pts: 50 },
  ];
  var MAX = CATS.length - 1;
  var SPAWN_MAX = 4;                  // on ne lâche que les 5 plus petits

  /* ---------- le bocal ---------- */
  var JW = 400, JH = 600;             // intérieur du bocal
  var TOP = 110;                      // ligne rouge (depuis le haut)
  var DROP_Y = 50;                    // hauteur où le chat attend
  var G = 1500, DAMP = 0.995, ITER = 6;

  var best = 0;
  try { best = Number(localStorage.getItem("chaaat-best")) || 0; } catch (e) {}
  var sound = true;
  try { sound = localStorage.getItem("chaaat-sound") !== "0"; } catch (e) {}

  var state = "menu";                 // menu | play | pause | over
  var balls, cur, next, aimX, cooldown, score, combo, comboT, overT, pops, merges, maxLvl, shake, t0;

  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick() {
    // les petits chats sortent plus souvent
    var w = [5, 4, 3, 2, 1], s = 0, i;
    var lim = Math.min(SPAWN_MAX, Math.max(2, maxLvl));   // au début : seulement les 3 plus petits
    for (i = 0; i <= lim; i++) s += w[i];
    var x = Math.random() * s;
    for (i = 0; i <= lim; i++) { x -= w[i]; if (x < 0) return i; }
    return 0;
  }

  function reset() {
    balls = []; pops = []; score = 0; combo = 0; comboT = 0; overT = 0; merges = 0; maxLvl = 0; shake = 0;
    cur = pick(); next = pick(); aimX = JW / 2; cooldown = 0; t0 = performance.now();
  }

  function newBall(lvl, x, y) {
    return { lvl: lvl, x: x, y: y, px: x, py: y, r: CATS[lvl].r, born: 0, spin: Math.random() * 6.28, dead: false, age: 0, blink: Math.random() * 4 };
  }

  function drop() {
    if (state !== "play" || cooldown > 0) return;
    var r = CATS[cur].r;
    var x = Math.max(r, Math.min(JW - r, aimX));
    var b = newBall(cur, x, DROP_Y);
    b.born = 1;
    balls.push(b);
    cur = next; next = pick();
    cooldown = 0.45;
    beep(320, 0.06, "triangle", 0.05);
  }

  /* ---------- physique (Verlet + corrections de position) ---------- */
  function step(dt) {
    var i, j, a, b, n = balls.length;
    for (i = 0; i < n; i++) {
      a = balls[i];
      var vx = (a.x - a.px) * DAMP, vy = (a.y - a.py) * DAMP;
      a.px = a.x; a.py = a.y;
      a.x += vx; a.y += vy + G * dt * dt;
      a.age += dt;
      if (a.born > 0) a.born = Math.max(0, a.born - dt * 4);
    }
    var merged = [];
    for (var k = 0; k < ITER; k++) {
      for (i = 0; i < n; i++) {
        a = balls[i];
        if (a.dead) continue;
        for (j = i + 1; j < n; j++) {
          b = balls[j];
          if (b.dead) continue;
          var dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r, d2 = dx * dx + dy * dy;
          if (d2 >= rr * rr || d2 === 0) continue;
          if (a.lvl === b.lvl && k === 0) { merged.push([a, b]); a.dead = b.dead = true; break; }
          var d = Math.sqrt(d2), o = (rr - d) / d * 0.5;
          var ma = a.r * a.r, mb = b.r * b.r, ta = mb / (ma + mb), tb = ma / (ma + mb);
          a.x -= dx * o * ta * 2; a.y -= dy * o * ta * 2;
          b.x += dx * o * tb * 2; b.y += dy * o * tb * 2;
        }
        // murs du bocal
        if (a.x < a.r) { a.x = a.r; a.px = a.x + (a.x - a.px) * 0.3; }
        if (a.x > JW - a.r) { a.x = JW - a.r; a.px = a.x + (a.x - a.px) * 0.3; }
        if (a.y > JH - a.r) { a.y = JH - a.r; a.py = a.y + (a.y - a.py) * 0.2; a.px += (a.x - a.px) * 0.05; }
      }
    }
    if (merged.length) {
      merged.forEach(function (p) { fuse(p[0], p[1]); });
      balls = balls.filter(function (x) { return !x.dead; });
    }
  }

  function fuse(a, b) {
    var x = (a.x + b.x) / 2, y = (a.y + b.y) / 2, lvl = a.lvl;
    combo = comboT > 0 ? combo + 1 : 1; comboT = 1.2;
    var mult = Math.min(combo, 5);
    var gain;
    merges++;
    if (lvl === MAX) {
      // deux Rois Chaaat : ils s'envolent, gros bonus
      gain = 200 * mult;
      burst(x, y, CATS[lvl].body, 40);
      shake = 0.5;
      beep(660, 0.25, "square", 0.06); beep(990, 0.3, "square", 0.05, 0.12);
    } else {
      var nb = newBall(lvl + 1, x, y);
      nb.px = x; nb.py = y; nb.born = 1;
      balls.push(nb);
      gain = CATS[lvl + 1].pts * mult;
      if (lvl + 1 > maxLvl) { maxLvl = lvl + 1; if (maxLvl >= 5) banner("Nouveau chat : " + CATS[maxLvl].name + " !"); }
      burst(x, y, CATS[lvl + 1].body, 10 + lvl * 2);
      if (lvl >= 5) shake = 0.25;
      beep(260 + lvl * 70, 0.12, "sine", 0.08);
    }
    score += gain;
    pops.push({ x: x, y: y, t: 0, txt: "+" + gain + (mult > 1 ? " x" + mult : "") , big: true });
  }

  function burst(x, y, col, n) {
    for (var i = 0; i < n; i++) {
      var an = Math.random() * 6.28, sp = 60 + Math.random() * 180;
      pops.push({ x: x, y: y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 60, t: 0, col: col, part: true, life: 0.5 + Math.random() * 0.4 });
    }
  }

  function update(dt) {
    if (state === "play") {
      var sub = 3, h = dt / sub;
      for (var s = 0; s < sub; s++) step(h);
      if (cooldown > 0) cooldown -= dt;
      if (comboT > 0) comboT -= dt; else combo = 0;
      // perdu si un chat posé reste au-dessus de la ligne
      var danger = balls.some(function (b) { return b.age > 1.2 && b.y - b.r < TOP && Math.abs(b.y - b.py) < 2; });
      overT = danger ? overT + dt : Math.max(0, overT - dt * 2);
      if (overT > 2.2) gameOver();
    }
    if (shake > 0) shake = Math.max(0, shake - dt);
    pops.forEach(function (p) {
      p.t += dt;
      if (p.part) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; }
      else p.y -= 30 * dt;
    });
    pops = pops.filter(function (p) { return p.part ? p.t < p.life : p.t < 1; });
    balls && balls.forEach(function (b) { b.blink -= dt; if (b.blink < -0.15) b.blink = 2 + Math.random() * 4; });
  }

  /* ---------- dessin ---------- */
  var W = 0, H = 0, dpr = 1, S = 1, OX = 0, OY = 0;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    var cw = Math.max(200, stage.clientWidth), ch = Math.max(200, stage.clientHeight);
    W = cw; H = ch;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
    // place le bocal : on garde de la place à droite (ou en haut sur mobile) pour le score
    var side = cw > ch * 1.05;
    var availW = side ? cw - 210 : cw - 24, availH = side ? ch - 30 : ch - 96;
    S = Math.min(availW / (JW + 24), availH / (JH + 24));
    OX = side ? (cw - 190 - JW * S) / 2 : (cw - JW * S) / 2;
    OY = side ? (ch - JH * S) / 2 : 84 + (availH - JH * S) / 2;
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  function drawCat(x, y, lvl, scale, blink, alpha) {
    var c = CATS[lvl], r = c.r * scale;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.translate(x, y);
    var line = lvl === MAX ? "#0d0c14" : "#2b1709";
    var lw = Math.max(1.5, r * 0.08);
    // oreilles
    ctx.fillStyle = c.body; ctx.strokeStyle = line; ctx.lineWidth = lw; ctx.lineJoin = "round";
    [-1, 1].forEach(function (s) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.25, -r * 0.82);
      ctx.lineTo(s * r * 0.78, -r * 1.12);
      ctx.lineTo(s * r * 0.86, -r * 0.42);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#f7b6c4";
      ctx.beginPath();
      ctx.moveTo(s * r * 0.4, -r * 0.78); ctx.lineTo(s * r * 0.72, -r * 0.98); ctx.lineTo(s * r * 0.76, -r * 0.6);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = c.body;
    });
    // corps (boule)
    var gr = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    gr.addColorStop(0, lighten(c.body)); gr.addColorStop(0.7, c.body); gr.addColorStop(1, c.dark);
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.2832); ctx.fill(); ctx.stroke();
    // tache
    if (lvl % 3 === 1) { ctx.fillStyle = c.dark; ctx.globalAlpha *= 0.55; ctx.beginPath(); ctx.ellipse(r * 0.45, -r * 0.45, r * 0.22, r * 0.17, 0.5, 0, 6.28); ctx.fill(); ctx.globalAlpha = alpha == null ? 1 : alpha; }
    // couronne du roi
    if (lvl === MAX) {
      ctx.fillStyle = "#f6d36b"; ctx.strokeStyle = "#8a5a10"; ctx.lineWidth = lw * 0.7;
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, -r * 0.82); ctx.lineTo(-r * 0.32, -r * 1.12); ctx.lineTo(-r * 0.15, -r * 0.98);
      ctx.lineTo(0, -r * 1.2); ctx.lineTo(r * 0.15, -r * 0.98); ctx.lineTo(r * 0.32, -r * 1.12); ctx.lineTo(r * 0.3, -r * 0.82);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // yeux
    var eyeC = lvl === MAX ? "#f6d36b" : "#2b1709";
    var ey = -r * 0.1, ex = r * 0.34;
    if (blink < 0) {
      ctx.strokeStyle = eyeC; ctx.lineWidth = lw;
      [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.moveTo(s * ex - r * 0.1, ey); ctx.lineTo(s * ex + r * 0.1, ey); ctx.stroke(); });
    } else {
      [-1, 1].forEach(function (s) {
        ctx.fillStyle = eyeC; ctx.beginPath(); ctx.ellipse(s * ex, ey, r * 0.11, r * 0.15, 0, 0, 6.28); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s * ex - r * 0.03, ey - r * 0.06, r * 0.045, 0, 6.28); ctx.fill();
      });
    }
    // joues
    ctx.fillStyle = "rgba(240,110,140,.45)";
    [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.ellipse(s * r * 0.55, r * 0.15, r * 0.13, r * 0.08, 0, 0, 6.28); ctx.fill(); });
    // nez + bouche « w »
    ctx.fillStyle = "#e86a8a";
    ctx.beginPath(); ctx.moveTo(-r * 0.07, r * 0.06); ctx.lineTo(r * 0.07, r * 0.06); ctx.lineTo(0, r * 0.14); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = lvl === MAX ? "#f6d36b" : line; ctx.lineWidth = Math.max(1, lw * 0.8); ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(-r * 0.08, r * 0.17, r * 0.08, 0.2, Math.PI - 0.2);
    ctx.arc(r * 0.08, r * 0.17, r * 0.08, 0.2, Math.PI - 0.2);
    ctx.stroke();
    // moustaches
    ctx.lineWidth = Math.max(1, lw * 0.5); ctx.globalAlpha *= 0.7;
    [-1, 1].forEach(function (s) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.5, r * 0.02); ctx.lineTo(s * r * 0.92, -r * 0.06);
      ctx.moveTo(s * r * 0.5, r * 0.12); ctx.lineTo(s * r * 0.92, r * 0.16);
      ctx.stroke();
    });
    ctx.restore();
  }

  function lighten(hex) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    r = Math.min(255, r + 50); g = Math.min(255, g + 50); b = Math.min(255, b + 50);
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function render(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // fond
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#5b3f86"); bg.addColorStop(1, "#3a2858");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // pattes en fond
    ctx.fillStyle = "rgba(255,255,255,.05)";
    for (var py = 0; py < H + 60; py += 70) for (var px = (py / 70 % 2) * 35; px < W + 60; px += 70) paw(px, py, 9);

    if (!balls) return;
    var sx = shake > 0 ? (Math.random() - 0.5) * shake * 16 : 0, sy = shake > 0 ? (Math.random() - 0.5) * shake * 16 : 0;
    ctx.save();
    ctx.translate(OX + sx, OY + sy); ctx.scale(S, S);

    // bocal
    ctx.fillStyle = "rgba(255,255,255,.10)";
    rr(-10, -10, JW + 20, JH + 20, 24); ctx.fill();
    ctx.fillStyle = "rgba(20,12,36,.55)";
    rr(0, 0, JW, JH, 16); ctx.fill();
    // ligne de danger
    var pulse = overT > 0 ? 0.5 + 0.5 * Math.sin(now / 80) : 0;
    ctx.strokeStyle = overT > 0 ? "rgba(255," + Math.round(80 + 100 * pulse) + ",90,1)" : "rgba(255,120,120,.45)";
    ctx.lineWidth = 3; ctx.setLineDash([12, 10]);
    ctx.beginPath(); ctx.moveTo(0, TOP); ctx.lineTo(JW, TOP); ctx.stroke();
    ctx.setLineDash([]);

    // viseur + chat qui attend
    if (state === "play" || state === "pause") {
      var r0 = CATS[cur].r, ax = Math.max(r0, Math.min(JW - r0, aimX));
      ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax, DROP_Y + r0); ctx.lineTo(ax, JH); ctx.stroke();
      if (cooldown <= 0.15) drawCat(ax, DROP_Y, cur, 1, 1, 1);
      else drawCat(ax, DROP_Y, cur, 0.6, 1, 0.4);
    }

    // chats
    ctx.save();
    rr(0, -200, JW, JH + 200, 16); ctx.clip();
    balls.forEach(function (b) {
      var sc = 1 - b.born * 0.35 + Math.sin(b.born * 9) * b.born * 0.1;
      drawCat(b.x, b.y, b.lvl, sc, b.blink, 1);
    });
    ctx.restore();

    // reflet du bocal
    ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(14, 40); ctx.lineTo(14, JH * 0.45); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 4;
    rr(-10, -10, JW + 20, JH + 20, 24); ctx.stroke();

    // particules et points
    pops.forEach(function (p) {
      if (p.part) {
        ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 6.28); ctx.fill();
      } else {
        ctx.globalAlpha = 1 - p.t;
        ctx.font = "900 22px Nunito, sans-serif"; ctx.textAlign = "center";
        ctx.lineWidth = 5; ctx.strokeStyle = "#2b1709"; ctx.strokeText(p.txt, p.x, p.y);
        ctx.fillStyle = "#f6d36b"; ctx.fillText(p.txt, p.x, p.y);
      }
      ctx.globalAlpha = 1;
    });
    ctx.restore();

    drawSide();
  }

  function paw(x, y, s) {
    ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.8, 0, 0, 6.28); ctx.fill();
    for (var i = -1.5; i <= 1.5; i++) { ctx.beginPath(); ctx.arc(x + i * s * 0.62, y - s * (1.1 - Math.abs(i) * 0.15), s * 0.32, 0, 6.28); ctx.fill(); }
  }

  function drawSide() {
    var side = W > H * 1.05;
    var x, y;
    ctx.textAlign = "left";
    if (side) { x = OX + JW * S + 28; y = OY + 6; }
    else { x = 14; y = 10; }
    function label(t, yy) { ctx.font = "800 13px Nunito, sans-serif"; ctx.fillStyle = "#d9c8f2"; ctx.fillText(t, x, yy); }
    function big(t, yy, col) { ctx.font = "900 28px Nunito, sans-serif"; ctx.lineWidth = 5; ctx.strokeStyle = "#2b1709"; ctx.strokeText(t, x, yy); ctx.fillStyle = col || "#fdf3de"; ctx.fillText(t, x, yy); }
    ctx.textBaseline = "top";
    if (side) {
      label("SCORE", y); big(score.toLocaleString("fr-FR"), y + 16);
      label("MEILLEUR", y + 56); big(Math.max(best, score).toLocaleString("fr-FR"), y + 72, "#f6d36b");
      label("SUIVANT", y + 116);
      drawCat(x + 40, y + 176, next, 34 / CATS[next].r, 1, 1);
      if (combo > 1) { label("COMBO", y + 228); big("x" + Math.min(combo, 5), y + 244, "#7cc9a0"); }
      // échelle des chats
      label("FUSIONS", y + 290);
      var cx = x + 12, cy = y + 322;
      for (var i = 0; i <= MAX; i++) {
        var col = i % 3, row = Math.floor(i / 3);
        drawCat(cx + col * 44, cy + row * 46, i, 15 / CATS[i].r, 1, i <= maxLvl ? 1 : 0.25);
      }
    } else {
      label("SCORE", y); big(score.toLocaleString("fr-FR"), y + 16);
      ctx.textAlign = "center";
      var mx = W / 2;
      ctx.font = "800 13px Nunito, sans-serif"; ctx.fillStyle = "#d9c8f2"; ctx.fillText("MEILLEUR", mx, y);
      ctx.font = "900 22px Nunito, sans-serif"; ctx.fillStyle = "#f6d36b"; ctx.fillText(Math.max(best, score).toLocaleString("fr-FR"), mx, y + 18);
      if (combo > 1) { ctx.fillStyle = "#7cc9a0"; ctx.fillText("combo x" + Math.min(combo, 5), mx, y + 44); }
      ctx.textAlign = "right";
      ctx.font = "800 13px Nunito, sans-serif"; ctx.fillStyle = "#d9c8f2"; ctx.fillText("SUIVANT", W - 60, y);
      drawCat(W - 34, y + 34, next, 20 / CATS[next].r, 1, 1);
    }
    ctx.textBaseline = "alphabetic";
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

  function menu() {
    state = "menu"; hud.hidden = true;
    if (!balls) reset();
    show('<h2>Chaaat</h2>' +
      '<p>Lâche des chats dans le bocal. Deux chats <strong>de la même couleur</strong> qui se touchent fusionnent en un chat plus gros.</p>' +
      '<p>Ne laisse pas les chats dépasser la <strong>ligne rouge</strong> !</p>' +
      '<p class="game-small">Meilleur score : <strong>' + best.toLocaleString("fr-FR") + '</strong></p>' +
      '<p><button class="btn" type="button" data-act="start">▶ Jouer</button></p>' +
      '<p class="game-small"><span class="ctrl-desk">Souris ou ← → pour viser · clic / Espace pour lâcher · P pour la pause</span></p>');
  }

  function start() {
    reset(); state = "play"; hide(); hud.hidden = false;
    canvas.focus({ preventScroll: true });
  }

  function pause() {
    if (state !== "play") return;
    state = "pause";
    show('<h2>Pause</h2><p>Score : <strong>' + score.toLocaleString("fr-FR") + '</strong></p>' +
      '<p><button class="btn" type="button" data-act="resume">▶ Reprendre</button> ' +
      '<button class="btn btn-ghost" type="button" data-act="start">↻ Recommencer</button></p>');
  }
  function resume() { if (state === "pause") { state = "play"; hide(); canvas.focus({ preventScroll: true }); } }

  function banner(t) { pops.push({ x: JW / 2, y: TOP + 60, t: 0, txt: t }); }

  function gameOver() {
    state = "over"; hud.hidden = true;
    var rec = score > best;
    if (rec) { best = score; try { localStorage.setItem("chaaat-best", String(best)); } catch (e) {} }
    beep(300, 0.3, "sawtooth", 0.05); beep(200, 0.4, "sawtooth", 0.05, 0.2);
    var lbOk = window.Leaderboard && Leaderboard.configured() && score > 0;
    var name = "";
    try { name = localStorage.getItem("chaaat-name") || ""; } catch (e) {}
    show('<h2>' + (rec ? "Nouveau record !" : "Le bocal déborde !") + '</h2>' +
      '<p>Score : <strong>' + score.toLocaleString("fr-FR") + '</strong></p>' +
      '<p class="game-small">Plus gros chat : ' + esc(CATS[maxLvl].name) + ' · ' + merges + ' fusions</p>' +
      (lbOk ? '<form class="submit-score" data-submit><label for="ch-name">Ton pseudo pour le classement</label><div class="submit-row">' +
        '<input id="ch-name" type="text" maxlength="20" minlength="2" required autocomplete="nickname" value="' + esc(name) + '">' +
        '<button class="btn btn-alt btn-small" type="submit">Envoyer</button></div><p class="game-small" data-submit-msg aria-live="polite"></p></form>' : "") +
      '<p><button class="btn" type="button" data-act="start">↻ Rejouer</button></p>');
    var form = card.querySelector("[data-submit]");
    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = form.querySelector("input"), btn = form.querySelector("button"), msg = form.querySelector("[data-submit-msg]");
      var n = input.value.trim();
      try { localStorage.setItem("chaaat-name", n); } catch (er) {}
      btn.disabled = true; msg.textContent = "Envoi…";
      Leaderboard.submit(GAME_ID, n, score, { version: "web", merges: merges, max: maxLvl }).then(function (res) {
        msg.textContent = "Envoyé ! " + (res && res.rank ? "Tu es " + res.rank + (res.rank === 1 ? "er" : "e") + "." : "");
        document.querySelectorAll('[data-leaderboard="' + GAME_ID + '"]').forEach(function (el) { el.removeAttribute("data-lb-rendered"); Leaderboard.render(el); });
      }).catch(function (err) { msg.textContent = Leaderboard.message(err); btn.disabled = false; });
    });
  }

  card.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]");
    if (!b) return;
    var a = b.getAttribute("data-act");
    if (a === "start") start();
    else if (a === "resume") resume();
  });

  /* ---------- contrôles ---------- */
  function toJar(clientX) {
    var rc = canvas.getBoundingClientRect();
    return (clientX - rc.left - OX) / S;
  }
  var pointerDown = false;
  canvas.addEventListener("pointermove", function (e) { if (state === "play") aimX = toJar(e.clientX); });
  canvas.addEventListener("pointerdown", function (e) {
    if (state !== "play") return;
    pointerDown = true; aimX = toJar(e.clientX);
    if (e.pointerType === "mouse") drop();
  });
  canvas.addEventListener("pointerup", function (e) {
    // au doigt : on vise en glissant, on lâche en relevant le doigt
    if (pointerDown && e.pointerType !== "mouse" && state === "play") { aimX = toJar(e.clientX); drop(); }
    pointerDown = false;
  });
  var keys = {};
  document.addEventListener("keydown", function (e) {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    var k = e.key;
    if (state === "play" && (k === " " || k === "ArrowDown" || k === "Enter" || k === "s" || k === "S")) { e.preventDefault(); drop(); }
    else if (k === "ArrowLeft" || k === "ArrowRight" || /^[qadQAD]$/.test(k)) { if (state === "play") { keys[k.toLowerCase()] = true; e.preventDefault(); } }
    else if (k === "p" || k === "P" || k === "Escape") { if (state === "play") pause(); else if (state === "pause") resume(); }
    else if ((k === " " || k === "Enter") && (state === "menu" || state === "over") && !overlay.hidden && document.activeElement === canvas) { e.preventDefault(); start(); }
  });
  document.addEventListener("keyup", function (e) { keys[e.key.toLowerCase()] = false; });

  pauseBtn.addEventListener("click", function () { if (state === "play") pause(); else resume(); });
  function muteLabel() { muteBtn.textContent = sound ? "🔊" : "🔇"; muteBtn.setAttribute("aria-label", sound ? "Couper le son" : "Activer le son"); }
  muteLabel();
  muteBtn.addEventListener("click", function () { sound = !sound; try { localStorage.setItem("chaaat-sound", sound ? "1" : "0"); } catch (e) {} muteLabel(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden) pause(); });

  /* ---------- plein écran ---------- */
  function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement) || stage.classList.contains("is-max"); }
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
  function syncFull() { stage.classList.toggle("is-full", isFull()); }
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
      if (mv) aimX = Math.max(0, Math.min(JW, aimX + mv * 360 * dt));
    }
    if (state !== "pause") update(dt);
    render(now);
    requestAnimationFrame(loop);
  }

  // outils de test (console)
  window.CHAAAT_DEBUG = {
    state: function () { return { state: state, score: score, balls: balls && balls.length, maxLvl: maxLvl, merges: merges }; },
    add: function (lvl, x) { if (balls) balls.push(newBall(lvl, x == null ? JW / 2 : x, DROP_Y)); },
    over: function () { gameOver(); },
  };

  menu();
  requestAnimationFrame(loop);
})();
