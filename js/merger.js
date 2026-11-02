/* =========================================================================
   Merger — mini jeu maison
   Lâche des écureuils dans le bocal : deux écureuils de la même couleur
   qui se touchent fusionnent en un plus gros. Ne dépasse pas la ligne !
   Tout est dessiné dans le canvas (aucune image). Meilleur score :
   localStorage « merger-best ». Classement en ligne : id « merger ».
   ========================================================================= */
(function () {
  "use strict";

  var GAME_ID = "merger";
  var stage = document.querySelector("[data-merger]");
  if (!stage) return;
  var canvas = stage.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var overlay = stage.querySelector("[data-overlay]");
  var card = stage.querySelector("[data-card]");
  var muteBtn = stage.querySelector("[data-mute]");
  var pauseBtn = stage.querySelector("[data-pause]");
  var hud = stage.querySelector("[data-hud]");

  /* ---------- les écureuils (du plus petit au plus gros) ----------
     r = rayon (unités du bocal, largeur 400), pts = points gagnés en le créant */
  var SQUIRRELS = [
    { name: "Bébé",          r: 15, body: "#f2a7a0", dark: "#c46f68", pts: 1 },
    { name: "Noisette",      r: 21, body: "#f6c453", dark: "#c99520", pts: 3 },
    { name: "Mousse",        r: 28, body: "#9fcf6e", dark: "#6a9a3e", pts: 6 },
    { name: "Myrtille",      r: 36, body: "#7fb0e8", dark: "#4f7fbb", pts: 10 },
    { name: "Grisou",        r: 45, body: "#b6b3cc", dark: "#7f7b99", pts: 15 },
    { name: "Roux",          r: 55, body: "#e8873a", dark: "#b0581a", pts: 21 },
    { name: "Châtaigne",     r: 66, body: "#a8673f", dark: "#6f3c20", pts: 28 },
    { name: "Ancien",        r: 78, body: "#fdf3de", dark: "#cdb58a", pts: 36 },
    { name: "Roi Écureuil",  r: 92, body: "#3d3a4f", dark: "#1f1d2b", pts: 50 },
  ];
  var MAX = SQUIRRELS.length - 1;
  var SPAWN_MAX = 4;                  // on ne lâche que les 5 plus petits

  /* ---------- le bocal ---------- */
  var JW = 400, JH = 600;             // intérieur du bocal
  var TOP = 110;                      // ligne rouge (depuis le haut)
  var DROP_Y = 50;                    // hauteur où l'écureuil attend
  var G = 1500, DAMP = 0.995, ITER = 6;

  var best = 0;
  try { best = Number(localStorage.getItem("merger-best")) || 0; } catch (e) {}
  var sound = true;
  try { sound = localStorage.getItem("merger-sound") !== "0"; } catch (e) {}

  var state = "menu";                 // menu | play | pause | over
  var balls, cur, next, aimX, cooldown, score, combo, comboT, overT, pops, merges, maxLvl, shake, t0;

  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick() {
    // les petits écureuils sortent plus souvent
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
    return { lvl: lvl, x: x, y: y, px: x, py: y, r: SQUIRRELS[lvl].r, born: 0, spin: Math.random() * 6.28, dead: false, age: 0, blink: Math.random() * 4, flip: Math.random() < 0.5 ? -1 : 1 };
  }

  function drop() {
    if (state !== "play" || cooldown > 0) return;
    var r = SQUIRRELS[cur].r;
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
      // deux Rois Écureuils : ils s'envolent, gros bonus
      gain = 200 * mult;
      burst(x, y, SQUIRRELS[lvl].body, 40);
      shake = 0.5;
      beep(660, 0.25, "square", 0.06); beep(990, 0.3, "square", 0.05, 0.12);
    } else {
      var nb = newBall(lvl + 1, x, y);
      nb.px = x; nb.py = y; nb.born = 1;
      balls.push(nb);
      gain = SQUIRRELS[lvl + 1].pts * mult;
      if (lvl + 1 > maxLvl) { maxLvl = lvl + 1; if (maxLvl >= 5) banner("Nouvel écureuil : " + SQUIRRELS[maxLvl].name + " !"); }
      burst(x, y, SQUIRRELS[lvl + 1].body, 10 + lvl * 2);
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
      // perdu si un écureuil posé reste au-dessus de la ligne
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

  function drawSquirrel(x, y, lvl, scale, blink, alpha, flip) {
    var c = SQUIRRELS[lvl], r = c.r * scale, f = flip || 1;
    var A = alpha == null ? 1 : alpha;
    ctx.save();
    ctx.globalAlpha = A;
    ctx.translate(x, y);
    var king = lvl === MAX;
    var line = king ? "#0d0c14" : "#2b1709";
    var lw = Math.max(1.5, r * 0.08);
    ctx.strokeStyle = line; ctx.lineWidth = lw; ctx.lineJoin = "round"; ctx.lineCap = "round";
    // grosse queue touffue, derrière le corps
    ctx.save();
    ctx.translate(f * r * 0.78, -r * 0.3); ctx.rotate(f * 0.35);
    ctx.fillStyle = c.dark;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.42, r * 0.8, 0, 0, 6.2832); ctx.fill(); ctx.stroke();
    ctx.fillStyle = lighten(c.dark);
    ctx.beginPath(); ctx.ellipse(f * r * 0.06, -r * 0.1, r * 0.2, r * 0.55, 0, 0, 6.2832); ctx.fill();
    ctx.restore();
    ctx.fillStyle = c.dark;
    ctx.beginPath(); ctx.arc(f * r * 0.5, -r * 1.02, r * 0.3, 0, 6.2832); ctx.fill(); ctx.stroke();
    ctx.fillStyle = lighten(c.dark);
    ctx.beginPath(); ctx.arc(f * r * 0.46, -r * 1.06, r * 0.14, 0, 6.2832); ctx.fill();
    // oreilles arrondies avec une petite touffe
    [-1, 1].forEach(function (s) {
      ctx.fillStyle = c.body;
      ctx.beginPath(); ctx.ellipse(s * r * 0.45, -r * 0.82, r * 0.17, r * 0.26, s * 0.25, 0, 6.2832); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#f7b6a4";
      ctx.beginPath(); ctx.ellipse(s * r * 0.45, -r * 0.8, r * 0.08, r * 0.15, s * 0.25, 0, 6.2832); ctx.fill();
      ctx.fillStyle = c.dark;
      ctx.beginPath();
      ctx.moveTo(s * r * 0.4, -r * 1.04); ctx.lineTo(s * r * 0.5, -r * 1.24); ctx.lineTo(s * r * 0.56, -r * 1.02);
      ctx.closePath(); ctx.fill();
    });
    // corps (boule)
    var gr = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    gr.addColorStop(0, lighten(c.body)); gr.addColorStop(0.7, c.body); gr.addColorStop(1, c.dark);
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.2832); ctx.fill(); ctx.stroke();
    // museau / ventre clair
    ctx.fillStyle = king ? "#5a566e" : "rgba(253,243,222,.85)";
    ctx.beginPath(); ctx.ellipse(0, r * 0.3, r * 0.48, r * 0.4, 0, 0, 6.2832); ctx.fill();
    // couronne du roi
    if (king) {
      ctx.fillStyle = "#f6d36b"; ctx.strokeStyle = "#8a5a10"; ctx.lineWidth = lw * 0.7;
      ctx.beginPath();
      ctx.moveTo(-r * 0.25, -r * 0.88); ctx.lineTo(-r * 0.28, -r * 1.16); ctx.lineTo(-r * 0.13, -r * 1.02);
      ctx.lineTo(0, -r * 1.24); ctx.lineTo(r * 0.13, -r * 1.02); ctx.lineTo(r * 0.28, -r * 1.16); ctx.lineTo(r * 0.25, -r * 0.88);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = line; ctx.lineWidth = lw;
    }
    // yeux
    var eyeC = king ? "#f6d36b" : "#2b1709";
    var ey = -r * 0.14, ex = r * 0.3;
    if (blink < 0) {
      ctx.strokeStyle = eyeC;
      [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.arc(s * ex, ey - r * 0.04, r * 0.1, 0.3, Math.PI - 0.3); ctx.stroke(); });
    } else {
      [-1, 1].forEach(function (s) {
        ctx.fillStyle = eyeC; ctx.beginPath(); ctx.ellipse(s * ex, ey, r * 0.12, r * 0.15, 0, 0, 6.2832); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s * ex - r * 0.035, ey - r * 0.06, r * 0.05, 0, 6.2832); ctx.fill();
      });
    }
    // joues gonflées (pleines de noisettes)
    ctx.fillStyle = "rgba(240,110,110,.42)";
    [-1, 1].forEach(function (s) { ctx.beginPath(); ctx.ellipse(s * r * 0.5, r * 0.16, r * 0.14, r * 0.09, 0, 0, 6.2832); ctx.fill(); });
    // nez
    ctx.fillStyle = king ? "#f6d36b" : "#5a2f1c";
    ctx.beginPath(); ctx.ellipse(0, r * 0.1, r * 0.08, r * 0.055, 0, 0, 6.2832); ctx.fill();
    // bouche + dents de rongeur
    ctx.strokeStyle = king ? "#f6d36b" : line; ctx.lineWidth = Math.max(1, lw * 0.7);
    ctx.beginPath(); ctx.moveTo(0, r * 0.15); ctx.lineTo(0, r * 0.22);
    ctx.moveTo(-r * 0.13, r * 0.2); ctx.quadraticCurveTo(0, r * 0.28, r * 0.13, r * 0.2); ctx.stroke();
    ctx.fillStyle = "#ffffff"; ctx.lineWidth = Math.max(1, lw * 0.5);
    ctx.beginPath(); rect(-r * 0.075, r * 0.235, r * 0.15, r * 0.12); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, r * 0.235); ctx.lineTo(0, r * 0.355); ctx.stroke();
    ctx.restore();
  }

  function rect(x, y, w, h) { ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); }

  function lighten(hex) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    r = Math.min(255, r + 50); g = Math.min(255, g + 50); b = Math.min(255, b + 50);
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function render(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // fond
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#3f6b3a"); bg.addColorStop(1, "#1f3a2b");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // pattes en fond
    ctx.fillStyle = "rgba(255,255,255,.05)";
    for (var py = 0; py < H + 60; py += 70) for (var px = (py / 70 % 2) * 35; px < W + 60; px += 70) acorn(px, py, 9);

    if (!balls) return;
    var sx = shake > 0 ? (Math.random() - 0.5) * shake * 16 : 0, sy = shake > 0 ? (Math.random() - 0.5) * shake * 16 : 0;
    ctx.save();
    ctx.translate(OX + sx, OY + sy); ctx.scale(S, S);

    // bocal
    ctx.fillStyle = "rgba(255,255,255,.10)";
    rr(-10, -10, JW + 20, JH + 20, 24); ctx.fill();
    ctx.fillStyle = "rgba(12,26,16,.55)";
    rr(0, 0, JW, JH, 16); ctx.fill();
    // ligne de danger
    var pulse = overT > 0 ? 0.5 + 0.5 * Math.sin(now / 80) : 0;
    ctx.strokeStyle = overT > 0 ? "rgba(255," + Math.round(80 + 100 * pulse) + ",90,1)" : "rgba(255,120,120,.45)";
    ctx.lineWidth = 3; ctx.setLineDash([12, 10]);
    ctx.beginPath(); ctx.moveTo(0, TOP); ctx.lineTo(JW, TOP); ctx.stroke();
    ctx.setLineDash([]);

    // viseur + écureuil qui attend
    if (state === "play" || state === "pause") {
      var r0 = SQUIRRELS[cur].r, ax = Math.max(r0, Math.min(JW - r0, aimX));
      ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax, DROP_Y + r0); ctx.lineTo(ax, JH); ctx.stroke();
      if (cooldown <= 0.15) drawSquirrel(ax, DROP_Y, cur, 1, 1, 1);
      else drawSquirrel(ax, DROP_Y, cur, 0.6, 1, 0.4);
    }

    // écureuils
    ctx.save();
    rr(0, -200, JW, JH + 200, 16); ctx.clip();
    balls.forEach(function (b) {
      var sc = 1 - b.born * 0.35 + Math.sin(b.born * 9) * b.born * 0.1;
      drawSquirrel(b.x, b.y, b.lvl, sc, b.blink, 1, b.flip);
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

  function acorn(x, y, s) {
    ctx.beginPath(); ctx.ellipse(x, y + s * 0.3, s * 0.7, s * 0.85, 0, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y - s * 0.35, s * 0.9, s * 0.45, 0, 0, 6.2832); ctx.fill();
    ctx.fillRect(x - s * 0.1, y - s * 1.05, s * 0.2, s * 0.4);
  }

  function drawSide() {
    var side = W > H * 1.05;
    var x, y;
    ctx.textAlign = "left";
    if (side) { x = OX + JW * S + 28; y = OY + 6; }
    else { x = 14; y = 10; }
    function label(t, yy) { ctx.font = "800 13px Nunito, sans-serif"; ctx.fillStyle = "#cfe3b8"; ctx.fillText(t, x, yy); }
    function big(t, yy, col) { ctx.font = "900 28px Nunito, sans-serif"; ctx.lineWidth = 5; ctx.strokeStyle = "#2b1709"; ctx.strokeText(t, x, yy); ctx.fillStyle = col || "#fdf3de"; ctx.fillText(t, x, yy); }
    ctx.textBaseline = "top";
    if (side) {
      label("SCORE", y); big(score.toLocaleString("fr-FR"), y + 16);
      label("MEILLEUR", y + 56); big(Math.max(best, score).toLocaleString("fr-FR"), y + 72, "#f6d36b");
      label("SUIVANT", y + 116);
      drawSquirrel(x + 40, y + 176, next, 34 / SQUIRRELS[next].r, 1, 1);
      if (combo > 1) { label("COMBO", y + 228); big("x" + Math.min(combo, 5), y + 244, "#7cc9a0"); }
      // échelle des écureuils
      label("FUSIONS", y + 290);
      var cx = x + 12, cy = y + 322;
      for (var i = 0; i <= MAX; i++) {
        var col = i % 3, row = Math.floor(i / 3);
        drawSquirrel(cx + col * 44, cy + row * 46, i, 15 / SQUIRRELS[i].r, 1, i <= maxLvl ? 1 : 0.25);
      }
    } else {
      label("SCORE", y); big(score.toLocaleString("fr-FR"), y + 16);
      ctx.textAlign = "center";
      var mx = W / 2;
      ctx.font = "800 13px Nunito, sans-serif"; ctx.fillStyle = "#cfe3b8"; ctx.fillText("MEILLEUR", mx, y);
      ctx.font = "900 22px Nunito, sans-serif"; ctx.fillStyle = "#f6d36b"; ctx.fillText(Math.max(best, score).toLocaleString("fr-FR"), mx, y + 18);
      if (combo > 1) { ctx.fillStyle = "#7cc9a0"; ctx.fillText("combo x" + Math.min(combo, 5), mx, y + 44); }
      ctx.textAlign = "right";
      ctx.font = "800 13px Nunito, sans-serif"; ctx.fillStyle = "#cfe3b8"; ctx.fillText("SUIVANT", W - 60, y);
      drawSquirrel(W - 34, y + 34, next, 20 / SQUIRRELS[next].r, 1, 1);
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
    show('<h2>Merger</h2>' +
      '<p>Lâche des écureuils dans le bocal. Deux écureuils <strong>de la même couleur</strong> qui se touchent fusionnent en un écureuil plus gros.</p>' +
      '<p>Ne laisse pas les écureuils dépasser la <strong>ligne rouge</strong> !</p>' +
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
    if (rec) { best = score; try { localStorage.setItem("merger-best", String(best)); } catch (e) {} }
    beep(300, 0.3, "sawtooth", 0.05); beep(200, 0.4, "sawtooth", 0.05, 0.2);
    var lbOk = window.Leaderboard && Leaderboard.configured() && score > 0;
    var name = "";
    try { name = localStorage.getItem("merger-name") || ""; } catch (e) {}
    show('<h2>' + (rec ? "Nouveau record !" : "Le bocal déborde !") + '</h2>' +
      '<p>Score : <strong>' + score.toLocaleString("fr-FR") + '</strong></p>' +
      '<p class="game-small">Plus gros écureuil : ' + esc(SQUIRRELS[maxLvl].name) + ' · ' + merges + ' fusions</p>' +
      (lbOk ? '<form class="submit-score" data-submit><label for="ch-name">Ton pseudo pour le classement</label><div class="submit-row">' +
        '<input id="ch-name" type="text" maxlength="20" minlength="2" required autocomplete="nickname" value="' + esc(name) + '">' +
        '<button class="btn btn-alt btn-small" type="submit">Envoyer</button></div><p class="game-small" data-submit-msg aria-live="polite"></p></form>' : "") +
      '<p><button class="btn" type="button" data-act="start">↻ Rejouer</button></p>');
    var form = card.querySelector("[data-submit]");
    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = form.querySelector("input"), btn = form.querySelector("button"), msg = form.querySelector("[data-submit-msg]");
      var n = input.value.trim();
      try { localStorage.setItem("merger-name", n); } catch (er) {}
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
  muteBtn.addEventListener("click", function () { sound = !sound; try { localStorage.setItem("merger-sound", sound ? "1" : "0"); } catch (e) {} muteLabel(); });
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
  window.MERGER_DEBUG = {
    state: function () { return { state: state, score: score, balls: balls && balls.length, maxLvl: maxLvl, merges: merges }; },
    add: function (lvl, x) { if (balls) balls.push(newBall(lvl, x == null ? JW / 2 : x, DROP_Y)); },
    over: function () { gameOver(); },
  };

  menu();
  requestAnimationFrame(loop);
})();
