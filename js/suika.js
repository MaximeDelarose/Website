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
  var RADII = [14, 20, 26, 33, 41, 50, 60, 72, 86, 101, 118];   // rapport des tailles du vrai jeu (cerise → pastèque)
  var SKIN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];       // niveau → écureuil de MergerArt
  var DROP_MAX = 4;                                       // on ne lâche que les niveaux 0 à 4
  var W = 400, H = 560;                                   // le bac
  var TOP = 100;                                          // ligne de danger
  var DROP_Y = 46;                                        // hauteur de l'écureuil qui attend
  var G = 1900, REST = 0.18, MU = 0.45, MU_WALL = 0.35, SLOP = 0.3, ITERS = 10;   // gravité, rebond, frottements
  var SUB = 4, STEP = 1 / 240;                            // sous-pas de physique
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
    return { id: nextId++, l: level, r: RADII[level], x: x, y: y, px: x, py: y, vx: 0, vy: 0, age: 0, grow: 0, a: rnd() * 6.283, w: 0, m: RADII[level] * RADII[level], dead: false, over: 0, blink: 1 + rnd() * 3, look: 0 };
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
    b.vy = 0;
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
    var pts = (l + 1) * (l + 2) / 2;
    if (l >= LEVELS - 1) {
      pts = 66;
      burst(x, y, 40, a.r, "#fff2b0");
      beep(520, 0.3, "square", 0.07); beep(780, 0.3, "square", 0.06, 0.1); beep(1040, 0.4, "square", 0.06, 0.2);
    } else {
      var n = newBall(l + 1, x, y);
      n.vx = (a.vx + b.vx) / 2; n.vy = (a.vy + b.vy) / 2;
      n.w = (a.w + b.w) / 2;
      n.grow = 0.0001; n.age = 1;
      balls.push(n);
      if (l + 1 > maxLevel) maxLevel = l + 1;
      burst(x, y, 8 + l, RADII[l], ART.SQUIRRELS[SKIN[l]].body);
      beep(220 + l * 55, 0.14, "triangle", 0.07);
      if (combo > 1) beep(330 + l * 55 + combo * 40, 0.12, "sine", 0.05, 0.08);
      shake = Math.max(shake, Math.min(6, 1 + l * 0.5));
    }
    addScore(pts);
    pops.push({ x: x, y: y - a.r, t: 0, text: "+" + pts + (combo > 1 ? " ×" + combo : "") });
  }

  function burst(x, y, n, r, col) {
    for (var i = 0; i < n; i++) {
      var an = rnd() * 6.283, sp = 60 + rnd() * 160;
      fx.push({ x: x + Math.cos(an) * r * 0.4, y: y + Math.sin(an) * r * 0.4, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 60, t: 0, life: 0.45 + rnd() * 0.3, s: 2 + rnd() * 3.5, c: col });
    }
  }

  // Physique de corps rigides (cercles) : impulsions séquentielles avec rebond, frottement et rotation,
  // comme Box2D dans le vrai jeu. Masse ∝ r², moment d'inertie d'un disque.
  function contact(a, b, nx, ny, pen, wall) {
    // a peut être null (mur = masse infinie) ; n va de a vers b
    var ima = a ? 1 / a.m : 0, imb = 1 / b.m, tx = -ny, ty = nx;
    var rva = a ? a.r : 0;
    var vax = a ? a.vx : 0, vay = a ? a.vy : 0, wa = a ? a.w : 0;
    var vn = (b.vx - vax) * nx + (b.vy - vay) * ny;
    var jn = 0;
    if (vn < 0) {
      var e = vn < -60 ? REST : 0;
      jn = -(1 + e) * vn / (ima + imb);
      if (a) { a.vx -= jn * ima * nx; a.vy -= jn * ima * ny; }
      b.vx += jn * imb * nx; b.vy += jn * imb * ny;
    }
    var vt = (b.vx - (a ? a.vx : 0)) * tx + (b.vy - (a ? a.vy : 0)) * ty - b.w * b.r - (a ? a.w * rva : 0);
    var jt = -vt / (3 * (ima + imb));
    // cap de Coulomb, avec une impulsion normale « de support » pour que la pile reste stable
    var support = Math.max(jn, (a ? Math.min(a.m, b.m) : b.m) * G * STEP * 1.2);
    var lim = (wall ? MU_WALL : MU) * support;
    if (jt > lim) jt = lim; else if (jt < -lim) jt = -lim;
    if (a) { a.vx -= jt * ima * tx; a.vy -= jt * ima * ty; a.w -= jt * ima * 2 / a.r; }
    b.vx += jt * imb * tx; b.vy += jt * imb * ty; b.w -= jt * imb * 2 / b.r;
    // correction de position
    var corr = Math.max(pen - SLOP, 0) * 0.45 / (ima + imb);
    if (a) { a.x -= corr * ima * nx; a.y -= corr * ima * ny; }
    b.x += corr * imb * nx; b.y += corr * imb * ny;
  }

  function substep(dt) {
    var i, j, a, b;
    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      if (b.grow > 0) { b.grow += dt * 7 * 4; if (b.grow >= 1) b.grow = 0; }
      b.vy += G * dt;
      b.vx *= 0.9997; b.vy *= 0.9997; b.w *= 0.998;
      b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt;
    }
    for (var it = 0; it < ITERS; it++) {
      for (i = 0; i < balls.length; i++) {
        b = balls[i];
        if (b.x < b.r) { contact(null, b, 1, 0, b.r - b.x, true); }
        else if (b.x > W - b.r) contact(null, b, -1, 0, b.x - (W - b.r), true);
        if (b.y > H - b.r) contact(null, b, 0, -1, b.y - (H - b.r), true);
        // sécurité : jamais hors du bac
        if (b.x < b.r) b.x = b.r; else if (b.x > W - b.r) b.x = W - b.r;
        if (b.y > H - b.r) b.y = H - b.r;
      }
      for (i = 0; i < balls.length; i++) {
        a = balls[i];
        for (j = i + 1; j < balls.length; j++) {
          b = balls[j];
          var dx = b.x - a.x, dy = b.y - a.y, min = a.r + b.r;
          if (dx > min || dx < -min || dy > min || dy < -min) continue;
          var d2 = dx * dx + dy * dy;
          if (d2 >= min * min) continue;
          if (a.dead || b.dead) continue;
          if (a.l === b.l && a.grow === 0 && b.grow === 0) { mergePair(a, b); continue; }
          var d = Math.sqrt(d2) || 0.0001;
          contact(a, b, dx / d, dy / d, min - d, false);
        }
      }
      if (it === 0) cleanup();
    }
    // petites vitesses : on les éteint pour que la pile s'endorme
    for (i = 0; i < balls.length; i++) {
      b = balls[i];
      if (b.vx * b.vx + b.vy * b.vy < 36) { b.vx *= 0.96; b.vy *= 0.96; b.w *= 0.9; }
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
      var speed = Math.abs(b.vy);
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
      var lbOk = window.Leaderboard && Leaderboard.configured() && score > 0;
      var account = lbOk ? Leaderboard.accountName() : "";
      var name = String(load("suika-name", ""));
      show('<h2>' + (maxLevel >= LEVELS - 1 ? "Grand Chêne atteint !" : "Partie terminée") + '</h2>' +
        '<p class="game-score">Score : <strong>' + score + '</strong>' + (record ? " · 🏆 nouveau record !" : "") + '</p>' +
        '<p>Meilleur écureuil : <strong>' + NAMES[maxLevel] + '</strong> · Record : <strong>' + best + '</strong></p>' +
        (lbOk && !account ? '<form class="submit-score" data-submit><label for="sk-name">Ton pseudo pour le classement</label><div class="submit-row">' +
          '<input id="sk-name" type="text" maxlength="20" minlength="2" required autocomplete="nickname" value="' + name.replace(/"/g, "&quot;") + '">' +
          '<button class="btn btn-alt btn-small" type="submit">Envoyer</button></div><p class="game-small" data-submit-msg aria-live="polite"></p></form>' : "") +
        '<div class="btn-row"><button class="btn" type="button" data-again>↻ Rejouer</button></div>');
      var ag = card.querySelector("[data-again]"); if (ag) { ag.addEventListener("click", start); ag.focus(); }
      function sendScore(n, msg, btn) {
        if (msg) msg.textContent = "Envoi…";
        if (btn) btn.disabled = true;
        Leaderboard.submit("suika", n, score, { level: maxLevel }).then(function (res) {
          if (msg) msg.textContent = "Envoyé ! " + (res && res.rank ? "Tu es " + res.rank + (res.rank === 1 ? "er" : "e") + "." : "");
          document.querySelectorAll('[data-leaderboard="suika"]').forEach(function (el) { el.removeAttribute("data-lb-rendered"); Leaderboard.render(el); });
        }).catch(function (err) { if (msg) msg.textContent = Leaderboard.message(err); if (btn) btn.disabled = false; });
      }
      if (lbOk && account) {
        // connecté : le score part tout seul, avec le pseudo du compte
        var note = document.createElement("p");
        note.className = "game-small"; note.setAttribute("aria-live", "polite");
        note.textContent = "Classement : " + account + " · envoi…";
        var ms = card.querySelector(".game-score"); if (ms) ms.insertAdjacentElement("afterend", note);
        sendScore(account, note, null);
      }
      var form = card.querySelector("[data-submit]");
      if (form) form.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = form.querySelector("input"), btn = form.querySelector("button"), msg = form.querySelector("[data-submit-msg]");
        var n = input.value.trim();
        store("suika-name", n);
        sendScore(n, msg, btn);
      });
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
    // comme les fruits du vrai jeu : un disque net (la collision) avec le visage de l'écureuil dedans
    var t = o.lvl != null ? o.lvl : b ? b.l : cur, c = ART.SQUIRRELS[SKIN[t]], al = o.alpha == null ? 1 : o.alpha;
    ctx.save(); ctx.globalAlpha = al; ctx.translate(x, y);
    var rad = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
    rad.addColorStop(0, ART.lighten(c.body)); rad.addColorStop(0.55, c.body); rad.addColorStop(1, c.dark);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fillStyle = rad; ctx.fill();
    ctx.lineWidth = Math.max(2, r * 0.07); ctx.strokeStyle = "#2b1709"; ctx.stroke();
    if (o.rot) ctx.rotate(o.rot);
    o.part = "body"; o.alpha = 1;
    ART.draw(ctx, 0, r * 0.06, SKIN[t], r * 0.74, o);
    ctx.restore();
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
      sq(b, b.x, b.y, b.r * k, { rot: b.a });
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
      sq(null, nx, ny, nr * 0.9 + 4, { lvl: next });
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
  if (fsBtn) fsBtn.addEventListener("click", function () { if (stage.hidden) return; if (isFull()) exitFull(); else enterFull(); });
  var fsExit = stage.querySelector("[data-fs-exit]");
  if (fsExit) fsExit.addEventListener("click", exitFull);

  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();

  /* ---------- boucle ---------- */
  var last = performance.now(), acc = 0;
  function loop(now) {
    if (stage.hidden) { last = now; requestAnimationFrame(loop); return; }   // mode Suika non choisi : rien à faire
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

  // utilisé par js/merger-coop.js quand on change de mode (Solo / Coop / Suika)
  window.SuikaMode = { leave: function () { if (state === "play") pause(); } };

  // pour les tests automatisés
  window.__suika = { balls: function () { return balls; }, state: function () { return state; }, score: function () { return score; }, setAim: function (x) { aimX = x; }, drop: drop, gameOver: gameOver, addScore: addScore };
})();
