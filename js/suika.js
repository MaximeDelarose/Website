/* =========================================================================
   Suika — mini jeu maison (jeu de la pastèque, version écureuils)
   On lâche un écureuil dans le bac ; deux écureuils identiques qui se
   touchent fusionnent en un plus gros. 11 niveaux, du Gland au Grand Chêne.
   Si la pile reste au-dessus de la ligne trop longtemps, c'est perdu.
   Dessin : js/merger-art.js (window.MergerArt). Physique : cercles maison.
   Sauvegarde (localStorage) : « suika-best », « suika-sound ».
   ========================================================================= */
(function () {
  "use strict";

  var stage = document.querySelector("[data-suika]");
  if (!stage || !window.MergerArt) return;
  var canvas = stage.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var overlay = stage.querySelector("[data-overlay]");
  var card = stage.querySelector("[data-card]");
  var muteBtn = stage.querySelector("[data-mute]");
  var pauseBtn = stage.querySelector("[data-pause]");
  var hud = stage.querySelector("[data-hud]");
  var ART = window.MergerArt;

  /* ---------- réglages ---------- */
  var LEVELS = 11;
  var RADII = [15, 21, 27, 34, 42, 51, 61, 72, 84, 97, 112];
  var SKIN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];       // niveau → écureuil de MergerArt
  var DROP_MAX = 4;                                       // on ne lâche que les niveaux 0 à 4
  var W = 400, H = 600;                                   // le bac
  var TOP = 110;                                          // ligne de danger
  var DROP_Y = 52;                                        // hauteur de l'écureuil qui attend
  var G = 1300, DAMP = 0.999, BOUNCE = 0.08, FRICTION = 0.12;
  var SUB = 3, STEP = 1 / 180;                            // sous-pas de physique
  var DANGER_TIME = 2.2;                                  // secondes au-dessus de la ligne avant la défaite
  var NAMES = ["Gland", "Noisette", "Mousse", "Myrtille", "Grisou", "Roux", "Châtaigne", "Flocon", "Corbeau", "Cerise", "Grand Chêne"];

  function load(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var sound = load("suika-sound", "1") !== "0";
  var best = Number(load("suika-best", 0)) || 0;

  var state = "menu";                       // menu | play | pause | over
  var balls = [], fx = [], pops = [], nextId = 1;
  var cur = 0, next = 0, aimX = W / 2, cooldown = 0, score = 0, combo = 0, comboT = 0, maxLevel = 0;
  var danger = 0, shake = 0, clock = 0, overT = 0, held = false;

  function rnd() { return Math.random(); }
  function pickLevel() { var r = rnd(); return r < 0.34 ? 0 : r < 0.64 ? 1 : r < 0.84 ? 2 : r < 0.95 ? 3 : 4; }

  /* ---------- son ---------- */
  var AC = null;
  function beep(f, d, type, vol, delay) {
    if (!sound) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      var t = AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
      o.type = type || "sine"; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.5, t + d);
      g.gain.setValueAtTime(vol || 0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
    } catch (e) {}
  }

  /* ---------- partie ---------- */
  function newBall(level, x, y) {
    return { id: nextId++, l: level, r: RADII[level], x: x, y: y, px: x, py: y, vx: 0, vy: 0, age: 0, grow: 0, dead: false, over: 0, blink: 1 + rnd() * 3, look: 0 };
  }

  function start() {
    balls = []; fx = []; pops = []; score = 0; combo = 0; comboT = 0; maxLevel = 0; danger = 0; shake = 0; overT = 0; cooldown = 0; held = false;
    cur = pickLevel(); next = pickLevel(); aimX = W / 2;
    state = "play"; hud.hidden = false; overlay.hidden = true; pauseBtn.textContent = "⏸";
    canvas.focus({ preventScroll: true });
  }

  function drop() {
    if (state !== "play" || cooldown > 0) return;
    var r = RADII[cur], x = Math.max(r, Math.min(W - r, aimX));
    var b = newBall(cur, x, DROP_Y);
    b.vy = 60; b.py = b.y - b.vy * STEP * SUB; // petite vitesse initiale vers le bas
    balls.push(b);
    cur = next; next = pickLevel(); cooldown = 0.55;
    beep(300, 0.08, "triangle", 0.05);
  }

  /* ---------- physique ---------- */
  function addScore(n) { score += n; if (score > best) { best = score; } }

  function mergePair(a, b) {
    if (a.dead || b.dead) return;
    a.dead = b.dead = true;
    var x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
    combo = comboT > 0 ? combo + 1 : 1; comboT = 1.2;
    var l = a.l;
    var pts = (l + 1) * (l + 2) / 2 * Math.min(combo, 6);
    if (l >= LEVELS - 1) {
      pts = 150 * Math.min(combo, 6);
      burst(x, y, 40, a.r, "#fff2b0");
      beep(520, 0.3, "square", 0.07); beep(780, 0.3, "square", 0.06, 0.1); beep(1040, 0.4, "square", 0.06, 0.2);
    } else {
      var n = newBall(l + 1, x, y);
      n.vx = (a.vx + b.vx) / 2; n.vy = (a.vy + b.vy) / 2;
      n.px = x - n.vx * STEP * SUB; n.py = y - n.vy * STEP * SUB;
      n.grow = 0.0001; n.age = 1;
      balls.push(n);
      if (l + 1 > maxLevel) maxLevel = l + 1;
      burst(x, y, 8 + l, RADII[l], ART.SQUIRRELS[SKIN[l]].body);
      beep(220 + l * 55, 0.14, "triangle", 0.07);
      if (combo > 1) beep(330 + l * 55 + combo * 40, 0.12, "sine", 0.05, 0.08);
      shake = Math.max(shake, Math.min(6, 1 + l * 0.5));
    }
    addScore(pts);
    pops.push({ x: x, y: y - a.r, t: 0, text: "+" + pts + (combo > 1 ? " ×" + Math.min(combo, 6) : "") });
  }

  function burst(x, y, n, r, col) {
    for (var i = 0; i < n; i++) {
      var an = rnd() * 6.283, sp = 60 + rnd() * 160;
      fx.push({ x: x + Math.cos(an) * r * 0.4, y: y + Math.sin(an) * r * 0.4, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 60, t: 0, life: 0.45 + rnd() * 0.3, s: 2 + rnd() * 3.5, c: col });
    }
  }

  function substep(dt) {
    var i, j, b, a;
    // intégration (Verlet)
    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      if (b.grow > 0) { b.grow += dt * 7; if (b.grow >= 1) b.grow = 0; }
      var vx = (b.x - b.px) * DAMP, vy = (b.y - b.py) * DAMP;
      b.px = b.x; b.py = b.y;
      b.x += vx; b.y += vy + G * dt * dt;
    }
    // collisions bac + entre écureuils (quelques passes pour stabiliser la pile)
    for (var it = 0; it < 4; it++) {
      for (i = 0; i < balls.length; i++) {
        b = balls[i];
        var r = b.r;
        if (b.x < r) { b.x = r; b.px = b.x + (b.px - b.x) * BOUNCE; }
        else if (b.x > W - r) { b.x = W - r; b.px = b.x + (b.px - b.x) * BOUNCE; }
        if (b.y > H - r) {
          b.y = H - r;
          var vxx = b.x - b.px; b.px += vxx * FRICTION;
          b.py = b.y + (b.py - b.y) * BOUNCE;
        }
      }
      for (i = 0; i < balls.length; i++) {
        a = balls[i];
        for (j = i + 1; j < balls.length; j++) {
          b = balls[j];
          var dx = b.x - a.x, dy = b.y - a.y, min = a.r + b.r;
          if (Math.abs(dx) > min || Math.abs(dy) > min) continue;
          var d2 = dx * dx + dy * dy;
          if (d2 >= min * min) continue;
          if (a.dead || b.dead) continue;
          if (a.l === b.l && !a.dead && !b.dead && a.grow === 0 && b.grow === 0) { mergePair(a, b); continue; }
          var d = Math.sqrt(d2) || 0.0001, nx = dx / d, ny = dy / d, over = min - d;
          var ma = a.r * a.r, mb = b.r * b.r, tot = ma + mb;
          a.x -= nx * over * (mb / tot); a.y -= ny * over * (mb / tot);
          b.x += nx * over * (ma / tot); b.y += ny * over * (ma / tot);
        }
      }
      if (it === 0) cleanup();
    }
  }

  function cleanup() {
    for (var i = balls.length - 1; i >= 0; i--) if (balls[i].dead) balls.splice(i, 1);
  }

  function update(dt) {
    clock += dt;
    if (cooldown > 0) cooldown -= dt;
    if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }
    if (shake > 0) shake = Math.max(0, shake - dt * 14);
    for (var k = 0; k < SUB; k++) substep(STEP);
    cleanup();
    var over = false;
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      b.age += dt;
      b.look += (((aimX - b.x) / W) - b.look) * Math.min(1, dt * 4);
      var speed = Math.abs(b.y - b.py) * 60;
      if (b.age > 1.2 && b.y - b.r < TOP && speed < 40) { b.over += dt; if (b.over > DANGER_TIME) over = true; }
      else b.over = Math.max(0, b.over - dt * 2);
    }
    danger = 0;
    for (i = 0; i < balls.length; i++) danger = Math.max(danger, balls[i].over / DANGER_TIME);
    for (i = fx.length - 1; i >= 0; i--) { var p = fx[i]; p.t += dt; p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.t > p.life) fx.splice(i, 1); }
    for (i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > 1) pops.splice(i, 1); }
    if (over) gameOver();
  }

  /* ---------- fin ---------- */
  function gameOver() {
    state = "over"; hud.hidden = true; overT = 0;
    var record = score >= best && score > 0 && score > (Number(load("suika-best", 0)) || 0);
    if (record) store("suika-best", String(score));
    best = Number(load("suika-best", 0)) || best;
    beep(200, 0.4, "sawtooth", 0.06); beep(140, 0.5, "sawtooth", 0.06, 0.25);
    setTimeout(function () {
      if (state !== "over") return;
      show('<h2>' + (maxLevel >= LEVELS - 1 ? "Grand Chêne atteint !" : "Partie terminée") + '</h2>' +
        '<p class="game-score">Score : <strong>' + score + '</strong>' + (record ? " · 🏆 nouveau record !" : "") + '</p>' +
        '<p>Meilleur écureuil : <strong>' + NAMES[maxLevel] + '</strong> · Record : <strong>' + best + '</strong></p>' +
        '<div class="btn-row"><button class="btn" type="button" data-again>↻ Rejouer</button></div>');
      var ag = card.querySelector("[data-again]"); if (ag) { ag.addEventListener("click", start); ag.focus(); }
    }, 900);
  }

  /* ---------- écrans ---------- */
  function show(html) { card.innerHTML = html; overlay.hidden = false; }
  function evoHtml() {
    var h = '<div class="sk-evo" aria-label="Ordre des fusions">';
    for (var i = 0; i < LEVELS; i++) h += '<img src="' + ICONS[i] + '" alt="' + NAMES[i] + '" title="' + NAMES[i] + '">';
    return h + "</div>";
  }
  var ICONS = [];
  for (var q = 0; q < LEVELS; q++) {
    var ic = document.createElement("canvas"); ic.width = ic.height = 68;
    ART.draw(ic.getContext("2d"), 34, 40, SKIN[q], 20);
    ICONS.push(ic.toDataURL());
  }
  function menu() {
    state = "menu"; hud.hidden = true;
    show('<h2>Suika</h2>' +
      '<p>Lâche les écureuils dans le bac : <strong>deux identiques qui se touchent fusionnent</strong> en un plus gros. Arrive jusqu’au Grand Chêne !</p>' +
      evoHtml() +
      '<p class="game-small">Record : <strong>' + best + '</strong></p>' +
      '<div class="btn-row"><button class="btn" type="button" data-play>▶ Jouer</button></div>');
    var pb = card.querySelector("[data-play]"); pb.addEventListener("click", start); pb.focus({ preventScroll: true });
  }
  function pause() {
    if (state !== "play") return;
    state = "pause"; pauseBtn.textContent = "▶";
    show('<h2>Pause</h2><div class="btn-row"><button class="btn" type="button" data-resume>▶ Reprendre</button> <button class="btn btn-ghost" type="button" data-quit>Abandonner</button></div>');
    card.querySelector("[data-resume]").addEventListener("click", resume);
    card.querySelector("[data-quit]").addEventListener("click", function () { menu(); });
  }
  function resume() { if (state !== "pause") return; state = "play"; overlay.hidden = true; pauseBtn.textContent = "⏸"; canvas.focus({ preventScroll: true }); }
  pauseBtn.addEventListener("click", function () { if (state === "play") pause(); else if (state === "pause") resume(); });
  function muteLabel() { muteBtn.textContent = sound ? "🔊" : "🔇"; muteBtn.setAttribute("aria-label", sound ? "Couper le son" : "Activer le son"); }
  muteLabel();
  muteBtn.addEventListener("click", function () { sound = !sound; store("suika-sound", sound ? "1" : "0"); muteLabel(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden) pause(); });

  /* ---------- entrées ---------- */
  var scale = 1, ox = 0, oy = 0, cw = 0, ch = 0, dpr = 1;
  function toWorld(e) {
    var rc = canvas.getBoundingClientRect();
    return (e.clientX - rc.left - ox) / scale;
  }
  function clampAim() { var r = RADII[cur]; aimX = Math.max(r, Math.min(W - r, aimX)); }
  canvas.addEventListener("pointermove", function (e) { if (state === "play") { aimX = toWorld(e); clampAim(); } });
  canvas.addEventListener("pointerdown", function (e) {
    if (state !== "play") return;
    aimX = toWorld(e); clampAim(); held = true;
    try { canvas.setPointerCapture(e.pointerId); } catch (er) {}
    if (e.pointerType === "mouse") { drop(); held = false; }
    e.preventDefault();
  });
  canvas.addEventListener("pointerup", function (e) {
    if (held && state === "play") { aimX = toWorld(e); clampAim(); drop(); }
    held = false;
  });
  canvas.addEventListener("pointercancel", function () { held = false; });
  var keys = {};
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape" || e.key === "p" || e.key === "P") {
      if (state === "play") { pause(); e.preventDefault(); } else if (state === "pause") { resume(); e.preventDefault(); }
      return;
    }
    if (state !== "play" || /input|textarea|select/i.test((e.target.tagName || ""))) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { keys[e.key] = true; e.preventDefault(); }
    else if (e.key === " " || e.key === "ArrowDown" || e.key === "Enter") { if (document.activeElement && document.activeElement !== canvas && document.activeElement.tagName === "BUTTON") return; drop(); e.preventDefault(); }
  });
  window.addEventListener("keyup", function (e) { keys[e.key] = false; });

  /* ---------- dessin ---------- */
  function resize() {
    var rc = stage.getBoundingClientRect();
    cw = Math.max(1, rc.width); ch = Math.max(1, rc.height); dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
    scale = Math.min(cw / (W + 20), ch / (H + 10));
    ox = (cw - W * scale) / 2; oy = (ch - H * scale) / 2 + 4;
  }

  function sq(b, x, y, r, extra) {
    var o = { lx: b && b.look ? Math.max(-1, Math.min(1, b.look * 3)) : 0, ly: 0.2, blink: 1, mood: "" };
    if (b) { var t = (clock + b.blink * 7) % 4.5; if (t < 0.13) o.blink = -1; if (b.over > 0.3) o.mood = "worried"; }
    if (extra) for (var k in extra) o[k] = extra[k];
    ART.draw(ctx, x, y, SKIN[b ? b.l : cur], r * 0.92, o);
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    // fond
    var bg = ctx.createLinearGradient(0, 0, 0, ch); bg.addColorStop(0, "#27493a"); bg.addColorStop(1, "#1a3125");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch);
    ctx.save();
    var sx = shake ? (rnd() - 0.5) * shake : 0, sy = shake ? (rnd() - 0.5) * shake : 0;
    ctx.translate(ox + sx, oy + sy); ctx.scale(scale, scale);
    // bac
    ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,.04)"; ctx.fillRect(0, TOP, W, H - TOP);
    ctx.strokeStyle = "#f6e3b4"; ctx.lineWidth = 6; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(-3, H + 3); ctx.lineTo(W + 3, H + 3); ctx.lineTo(W + 3, 0); ctx.stroke();
    // ligne de danger
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = danger > 0 ? "rgba(255,90,70," + (0.5 + 0.5 * Math.sin(clock * 12) * danger) + ")" : "rgba(255,255,255,.35)";
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, TOP); ctx.lineTo(W, TOP); ctx.stroke();
    ctx.restore();
    // écureuils
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i], k = b.grow > 0 ? 0.6 + 0.4 * Math.min(1, b.grow) + Math.sin(Math.min(1, b.grow) * 3.14) * 0.15 : 1;
      sq(b, b.x, b.y, b.r * k);
    }
    // écureuil en attente + guide
    if (state === "play") {
      var r = RADII[cur];
      if (cooldown <= 0.15) {
        ctx.save(); ctx.setLineDash([4, 8]); ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(aimX, DROP_Y + r); ctx.lineTo(aimX, H); ctx.stroke(); ctx.restore();
        sq(null, aimX, DROP_Y, r, { alpha: 1 });
      } else {
        sq(null, aimX, DROP_Y, r * (1 - Math.min(1, cooldown / 0.55)) * 0.6 + r * 0.4, { alpha: 0.6 });
      }
    }
    // particules
    for (i = 0; i < fx.length; i++) { var p = fx[i]; ctx.globalAlpha = Math.max(0, 1 - p.t / p.life); ctx.fillStyle = p.c; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
    ctx.globalAlpha = 1;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "900 20px Nunito, system-ui, sans-serif"; ctx.lineWidth = 4; ctx.lineJoin = "round";
    for (i = 0; i < pops.length; i++) {
      var pp = pops[i]; ctx.globalAlpha = Math.max(0, 1 - pp.t);
      ctx.strokeStyle = "#2b1709"; ctx.fillStyle = "#fdf3de";
      ctx.strokeText(pp.text, pp.x, pp.y - pp.t * 40); ctx.fillText(pp.text, pp.x, pp.y - pp.t * 40);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // HUD : score, record, prochain
    ctx.textBaseline = "alphabetic";
    var wide = ox > 110, hx = wide ? Math.max(10, ox - 100) : ox + 10, fs = Math.max(13, Math.min(20, scale * 22));
    ctx.textAlign = "left"; ctx.font = "900 " + fs + "px Nunito, system-ui, sans-serif"; ctx.lineWidth = 4;
    ctx.strokeStyle = "#2b1709"; ctx.fillStyle = "#fdf3de";
    var line1 = "Score " + score;
    ctx.strokeText(line1, hx, oy + fs + 6); ctx.fillText(line1, hx, oy + fs + 6);
    ctx.font = "800 " + (fs * 0.72) + "px Nunito, system-ui, sans-serif";
    var line2 = "Record " + best;
    ctx.strokeText(line2, hx, oy + fs * 2 + 8); ctx.fillText(line2, hx, oy + fs * 2 + 8);
    if (state === "play" || state === "pause") {
      var nr = 26, nx = wide ? ox + W * scale + 56 : ox + W * scale - nr - 6, ny = wide ? oy + 70 : oy + nr + 22;
      ctx.textAlign = "center"; ctx.font = "800 " + (fs * 0.7) + "px Nunito, system-ui, sans-serif";
      var ly = ny - nr - 4; ctx.strokeText("Suivant", nx, ly); ctx.fillText("Suivant", nx, ly);
      ART.draw(ctx, nx, ny, SKIN[next], nr * 0.9, {});
    }
    if (state === "over" && overT < 1) { ctx.fillStyle = "rgba(255,60,40," + (0.25 * (1 - overT)) + ")"; ctx.fillRect(0, 0, cw, ch); }
  }

  /* ---------- plein écran ---------- */
  function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement) || stage.classList.contains("is-max"); }
  function syncFull() { stage.classList.toggle("is-full", isFull()); resize(); }
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
  var last = performance.now(), acc = 0;
  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (state === "play") {
      if (keys.ArrowLeft) { aimX -= 320 * dt; clampAim(); }
      if (keys.ArrowRight) { aimX += 320 * dt; clampAim(); }
      acc += dt; var fixed = 1 / 60;
      while (acc >= fixed && state === "play") { update(fixed); acc -= fixed; }
    } else if (state === "over") { overT += dt; clock += dt; for (var i = fx.length - 1; i >= 0; i--) { var p = fx[i]; p.t += dt; p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.t > p.life) fx.splice(i, 1); } if (shake > 0) shake = Math.max(0, shake - dt * 14); }
    else { clock += dt; }
    render();
    requestAnimationFrame(loop);
  }
  menu();
  requestAnimationFrame(loop);

  // pour les tests automatisés
  window.__suika = { balls: function () { return balls; }, state: function () { return state; }, score: function () { return score; }, setAim: function (x) { aimX = x; }, drop: drop };
})();
