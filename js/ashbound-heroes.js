/* Ashbound Tower — kits des héros jouables (navigateur).
   Chaque kit : attaque auto + 3 compétences (s1, s2, ult). `A` est l'API fournie par le moteur (ashbound.js).
   Noctis : compétences du Google Doc. Églantyne : Graines de ronce, Calice de l'Effroi, Terrain Sacrificiel, Éclat de la Grande Serre, Essaim (Doc).
   Épéiste : combo, Frappe d'Attraction, Foudre Ancrée, Tempête de Foudre, passif charge (Doc).
   Phelto : AUCUN kit défini dans les documents → kit PROVISOIRE inventé (voir `provisional`). */
(function () {
  "use strict";
  window.AshHeroes = function (A) {
    var kits = {}, D2R = Math.PI / 180;
    function dir(a) { return { x: Math.cos(a), z: Math.sin(a) }; }
    function dist(ax, az, bx, bz) { return Math.hypot(ax - bx, az - bz); }
    function angDiff(a, b) { var d = a - b; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283; return Math.abs(d); }
    function inCone(x, z, a, len, arc, e) { var p = A.pos(e), d = dist(x, z, p.x, p.z); return d <= len + .45 && (d < .6 || angDiff(Math.atan2(p.z - z, p.x - x), a) <= arc / 2); }
    function targetPoint(h, a, d, sk) { var r = sk.aim.range || 6, dd = Math.max(1, Math.min(r, d)); return { x: A.clampX(h.x + Math.cos(a) * dd), z: A.clampZ(h.z + Math.sin(a) * dd) }; }
    function sx(x) { return A.sx(x); }
    function sy(z) { return A.sy(z); }
    var ctx = A.ctx;
    function rnd(a, b) { return a + Math.random() * (b - a); }
    // petit arc de foudre autour d'un point (effets de déplacement / d'attaque de l'Épéiste)
    function miniArc(x, z, len, up) {
      A.addActor({ x: x, z: z + .01, sorted: true, life: .13, t: 0, seed: Math.random() * 9,
        draw: function () {
          var X = sx(this.x), Y = sy(this.z) - (up || 8), pts = [{ x: X, y: Y }], n = 5, ex = X + rnd(-len, len), ey = Y - rnd(len * .2, len * 1.1);
          for (var i = 1; i < n; i++) pts.push({ x: X + (ex - X) * i / n + rnd(-5, 5), y: Y + (ey - Y) * i / n + rnd(-5, 5) }); pts.push({ x: ex, y: ey });
          ctx.save(); ctx.globalAlpha = Math.min(1, this.life * 12); ctx.lineJoin = "round";
          [["rgba(60,200,255,.45)", 6], ["#eaffff", 2]].forEach(function (o) { ctx.strokeStyle = o[0]; ctx.lineWidth = o[1]; ctx.beginPath(); pts.forEach(function (p, j) { if (j) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke(); }); ctx.restore();
        } });
    }
    // ronce qui jaillit du sol puis se fane (traînée d'Églantyne)
    function vine(x, z, lean, seed, hgt) {
      A.addActor({ x: x, z: z + .02, sorted: true, life: 1.5, t: 0,
        draw: function () {
          var g = Math.min(1, this.t / .35), fade = Math.min(1, this.life / .5), X = sx(this.x), Y = sy(this.z), N = 14, n = Math.floor(N * g) + 1;
          function pt(i) { var u = i / N; return { x: X + Math.sin(u * 4 + seed) * 7 * u + lean * u * 14, y: Y - u * hgt + Math.sin(u * 9 + seed) * 2 }; }
          ctx.save(); ctx.globalAlpha = fade; ctx.lineCap = "round"; ctx.lineJoin = "round";
          [["#1a2410", 6], ["#4d7a2a", 3]].forEach(function (o) { ctx.strokeStyle = o[0]; ctx.lineWidth = o[1]; ctx.beginPath(); for (var i = 0; i <= n; i++) { var p = pt(i); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); } ctx.stroke(); });
          ctx.strokeStyle = "#e0eaa8"; ctx.lineWidth = 2;
          for (var i = 2; i <= n; i += 3) { var q = pt(i); ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + (i % 2 ? 5 : -5), q.y - 5); ctx.stroke(); }
          if (g >= 1) { var t = pt(N); ctx.fillStyle = "#c070ff"; ctx.shadowColor = "#c070ff"; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(t.x, t.y, 3, 0, 6.283); ctx.fill(); }
          ctx.restore();
        } });
    }
    function groundEllipse(x, z, r, fill, stroke, lw) {
      ctx.beginPath(); ctx.ellipse(sx(x), sy(z), r * A.PPU, r * A.PPU * A.SY, 0, 0, 6.283);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
    }
    function note(x, y, col, s) { ctx.save(); ctx.fillStyle = col; ctx.font = "bold " + (s || 18) + "px sans-serif"; ctx.textAlign = "center"; ctx.fillText("♪", x, y); ctx.restore(); }

    /* ======================================================== NOCTIS */
    function triple(x, z, a, sc) {
      var d = dir(a), pr = { x: -d.z, z: d.x }, ctr = A.addProj({ x: x + d.x * .6, z: z + d.z * .6, vx: d.x * 15, vz: d.z * 15, life: .5, r: .55, dmg: 9 * sc, col: "#b46cff", kind: "shard" });
      [-1, 1].forEach(function (s) {
        A.addProj({ x: x + d.x * .5 + pr.x * s * .9, z: z + d.z * .5 + pr.z * s * .9, vx: d.x * 9 + pr.x * s * 6, vz: d.z * 9 + pr.z * s * 6, life: .7, r: .45, dmg: 5 * sc, col: "#6af0ff", kind: "shard", aoe: 1.5, aoeDmg: 12 * sc,
          acc: function (p, dt) {
            var tx = ctr.alive ? ctr.x : null; if (tx === null) return;
            var dx = ctr.x - p.x, dz = ctr.z - p.z, l = Math.hypot(dx, dz) || 1;
            p.vx += dx / l * 70 * dt; p.vz += dz / l * 70 * dt; if (l < .6) p.life = 0;
          } });
      });
    }
    kits.noctis = {
      id: "noctis", name: "Noctis", short: "NOCTIS", role: "Maître des ombres", speed: 7.2, scale: .95, tower: "faille", provisional: false,
      spr: { idle: ["hero_noctis_idle0", "hero_noctis_idle1"], move: ["hero_noctis_move0", "hero_noctis_move1"], atk: "hero_noctis_atk", cast: "hero_noctis_cast" },
      lines: ["Éclats convergents · dash fantôme", "Clones, failles et ombres spectrales"],
      skills: {
        s1: { name: "Traversée Fantôme", cd: 6, aim: { type: "dir", len: 5.5, w: 1.3 } },
        s2: { name: "Reflet Abyssal", cd: 10, aim: { type: "point", range: 6, r: .9 } },
        ult: { name: "Nuit Fractionnée", cd: 55, aim: { type: "self", r: 6 } }
      },
      init: function (h) { h.k = { clones: [], shades: 0, ultT: 0, nodeT: 0, nodes: [] }; },
      attack: function (h, a) { var k = h.k; triple(h.x, h.z, a, 1); A.play("zap", .45, 1.4); return k.ultT > 0 ? .3 : .45; },
      cast: function (key, h, a, d) {
        var k = h.k;
        if (key === "s1") {
          var len = 5.5, dx = Math.cos(a), dz = Math.sin(a), hitSet = [], trail = [], tt = 0;
          A.play("zap", .8, .6);
          h.dash = { dx: dx, dz: dz, speed: len / .2, t: .2, tick: function (hh, dt) {
            tt += dt; if (tt > .035) { tt = 0; trail.push({ x: hh.x, z: hh.z }); }
            A.enemies().forEach(function (e) { if (hitSet.indexOf(e) < 0) { var p = A.pos(e); if (dist(hh.x, hh.z, p.x, p.z) < 1.1) { hitSet.push(e); A.dmg(e, 12); } } });
          }, end: function (hh) { A.addActor(faille(trail, 1.0, 22, 2.4)); } };
        } else if (key === "s2") {
          var pt = targetPoint(h, a, d, this.skills.s2);
          if (k.clones.length >= 2 + (h.mod.clone || 0)) k.clones.shift().life = 0;
          var cl = { x: pt.x, z: pt.z, life: 8, t: 0, cdA: .3, sorted: true, z: pt.z,
            update: function (dt) { this.t += dt; this.cdA -= dt; if (this.cdA <= 0) { var e = A.nearest(this.x, this.z, 8); if (e) { var p = A.pos(e); triple(this.x, this.z, Math.atan2(p.z - this.z, p.x - this.x), .8); this.cdA = .7; } else this.cdA = .15; } },
            draw: function () { var X = sx(this.x), Y = sy(this.z); groundEllipse(this.x, this.z, 1.1, "rgba(80,220,255,.15)", "rgba(120,230,255,.7)", 2);
              ctx.save(); ctx.globalAlpha = .55 + .1 * Math.sin(this.t * 6); ctx.filter = "hue-rotate(40deg) brightness(1.3)"; A.spr("hero_noctis_idle" + (Math.floor(this.t * 2) & 1), X, Y - 4 * Math.sin(this.t * 3), .95, false); ctx.restore(); } };
          k.clones.push(cl); A.addActor(cl); A.fx({ k: "ring", x: pt.x, z: pt.z, r: 1.6, dur: .4, col: "#6af0ff" }); A.play("click", .8, .6);
        } else {
          k.ultT = 8; k.nodes = []; k.nodeT = 0; A.tint(.35, 8); A.fx({ k: "ring", x: h.x, z: h.z, r: 6, dur: .6, col: "#b46cff" }); A.play("boss", .8, 1.1); A.toast("Nuit Fractionnée !", "#c48bff");
        }
      },
      update: function (h, dt) {
        var k = h.k; h.speedMul = k.ultT > 0 ? 1.35 : 1;
        if (k.ultT > 0) {
          k.ultT -= dt; k.nodeT -= dt;
          if (k.nodeT <= 0 && h.moving) { k.nodeT = .2; k.nodes.push({ x: h.x, z: h.z }); if (k.nodes.length > 60) k.nodes.shift(); }
          if (k.ultT <= 0) {   // fin : toutes les traînées explosent
            k.nodes.forEach(function (n) { A.fx({ k: "ring", x: n.x, z: n.z, r: 1.7, dur: .5, col: "#c48bff" }); A.inRadius(n.x, n.z, 1.7).forEach(function (e) { A.dmg(e, 30); A.slow(e, .5, 1); }); });
            if (k.nodes.length) { A.shake(.3); A.play("zap", 1, .5); } k.nodes = [];
          }
        }
      },
      moveFx: function (h, dt) {
        var k = h.k; k.fxT = (k.fxT || 0) - dt; if (k.fxT > 0) return; k.fxT = .07;
        A.burstW(h.x + rnd(-.4, .4), h.z + rnd(-.2, .3), Math.random() < .5 ? "#7a3cff" : "#241446", 2, 55, .6, 4);
      },
      onKill: function (h, e) {
        var k = h.k, p = A.pos(e); if (dist(h.x, h.z, p.x, p.z) > 10 || k.shades >= 15) return;
        if (Math.random() > (k.ultT > 0 ? .2 : .1) + (h.mod.shade || 0)) return;
        k.shades++;
        A.addActor({ x: p.x, z: p.z, z: p.z, life: 8, t: 0, sorted: true, ac: 0,
          update: function (dt) { this.t += dt; var e2 = A.nearest(this.x, this.z, 8); if (e2) { var q = A.pos(e2), dd = dist(this.x, this.z, q.x, q.z); if (dd > 1) { this.x += (q.x - this.x) / dd * 5.2 * dt; this.z += (q.z - this.z) / dd * 5.2 * dt; } else { this.ac -= dt; if (this.ac <= 0) { A.dmg(e2, 6); this.ac = .5; } } } if (this.life - dt <= 0) k.shades--; },
          draw: function () { ctx.save(); ctx.globalAlpha = .6; ctx.filter = "brightness(.35) saturate(1.8)"; A.spr("hero_noctis_idle0", sx(this.x), sy(this.z), .6, false); ctx.restore(); } });
      },
      drawExtra: function (h) {
        var k = h.k; if (k.ultT > 0) k.nodes.forEach(function (n) { ctx.save(); ctx.globalAlpha = .6; groundEllipse(n.x, n.z, .8, "rgba(150,80,255,.35)", "rgba(200,140,255,.8)", 2); ctx.restore(); });
      }
    };
    function faille(nodes, boomAt, dmg, r) {   // longue faille spectrale : ralentit puis explose
      return { life: 2.2, t: 0, exploded: false, ground: true,
        update: function (dt) {
          this.t += dt; var self = this;
          nodes.forEach(function (n) { A.inRadius(n.x, n.z, 1.2).forEach(function (e) { A.slow(e, .6, .3); }); });
          if (!this.exploded && this.t >= boomAt) { this.exploded = true; nodes.forEach(function (n, i) { if (i % 2) return; A.inRadius(n.x, n.z, 1.4).forEach(function (e) { A.dmg(e, dmg * .6); }); }); A.fx({ k: "pulse", pts: nodes, dur: .35 }); A.shake(.12); A.play("zap", .8, .6); this.life = this.t + .35; }
        },
        draw: function () {
          if (this.exploded) return; var a = Math.min(1, (this.life - this.t) * 2);
          nodes.forEach(function (n) { ctx.save(); ctx.globalAlpha = .5 * a; groundEllipse(n.x, n.z, 1.0, "rgba(110,50,200,.4)", null); ctx.restore(); });
          ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = "#9b5cff"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); nodes.forEach(function (n, i) { var X = sx(n.x), Y = sy(n.z) - 6; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.stroke();
          ctx.strokeStyle = "#e0d0ff"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
        } };
    }

    /* ======================================================== ÉGLANTYNE */
    kits.eglantyne = {
      id: "eglantyne", name: "Églantyne", short: "ÉGLANTYNE", role: "Invocation · Nature", speed: 5.7, scale: 1, tower: "ronce", provisional: false,
      spr: { idle: ["hero_eglantyne_idle0", "hero_eglantyne_idle1"], move: ["hero_eglantyne_move0", "hero_eglantyne_move1"], atk: "hero_eglantyne_atk", cast: "hero_eglantyne_cast" },
      lines: ["Graines de ronce, poison, poupées", "Calice de l'Effroi · Terrain Sacrificiel"],
      skills: {
        s1: { name: "Calice de l'Effroi", cd: 9, aim: { type: "point", range: 7, r: 2.8 } },
        s2: { name: "Terrain Sacrificiel", cd: 14, aim: { type: "point", range: 7, r: 3 } },
        ult: { name: "Éclat de la Grande Serre", cd: 60, aim: { type: "self", r: 4 } }
      },
      init: function (h) { h.k = { dolls: [], kills: 0, curses: [], rush: 0 }; },
      attack: function (h, a) {
        var d = dir(a); A.addProj({ x: h.x + d.x * .6, z: h.z + d.z * .6, vx: d.x * 13, vz: d.z * 13, life: .7, r: .5, dmg: 9, col: "#6fe08a", kind: "seed", aoe: .9, aoeDmg: 5, onHit: function (e) { A.poison(e, 2 * (1 + (h.mod.venom || 0)), 3); } });
        A.play("hit", .4, 1.5); return .38;
      },
      cast: function (key, h, a, d) {
        var k = h.k;
        if (key === "s1") {
          var pt = targetPoint(h, a, d, this.skills.s1); sendDolls(h, pt, 6);
          A.addActor({ x: pt.x, z: pt.z, life: 1.7, t: 0, closed: false, ground: true,
            update: function (dt) {
              this.t += dt;
              if (this.t < 1) A.inRadius(this.x, this.z, 3.2 * (1 + (h.mod.rngS1 || 0))).forEach(function (e) { var p = A.pos(e); A.pull(e, (pt.x - p.x) * Math.min(1, dt * 4), (pt.z - p.z) * Math.min(1, dt * 4)); });
              else if (!this.closed) { this.closed = true; A.inRadius(this.x, this.z, 2.7 * (1 + (h.mod.rngS1 || 0))).forEach(function (e) { A.dmg(e, 25); A.poison(e, 6 * (1 + (h.mod.venom || 0)), 4); A.stun(e, .3); }); A.fx({ k: "ring", x: pt.x, z: pt.z, r: 2.7, dur: .5, col: "#7aff9a" }); A.shake(.15); A.play("hit", .9, .6); }
            },
            draw: function () {
              var X = sx(this.x), Y = sy(this.z), open = this.t < 1 ? Math.min(1, this.t * 4) : Math.max(0, 1 - (this.t - 1) * 8);
              groundEllipse(this.x, this.z, 2.8 * (this.t < 1 ? 1 : 0), "rgba(130,60,200,.12)", "rgba(190,110,255,.6)", 2);
              ctx.save(); ctx.translate(X, Y - 6);
              ctx.fillStyle = "#2f6a3c"; ctx.fillRect(-4, -28, 8, 28);
              ctx.fillStyle = "#7a3cc0"; for (var i = -2; i <= 2; i++) { ctx.save(); ctx.rotate(i * .45 * open); ctx.beginPath(); ctx.ellipse(i * 5, -38, 7, 22, i * .3 * open, 0, 6.283); ctx.fill(); ctx.restore(); }
              ctx.fillStyle = "#c48bff"; ctx.beginPath(); ctx.ellipse(0, -30, 11, 7 * open + 1, 0, 0, 6.283); ctx.fill(); ctx.restore();
            } });
          A.play("click", .7, .7);
        } else if (key === "s2") {
          var pt2 = targetPoint(h, a, d, this.skills.s2), zone = { x: pt2.x, z: pt2.z, r: 3, t: 6 };
          k.curses.push(zone); sendDolls(h, pt2, 6);
          A.addActor({ life: 6, t: 0, ground: true, update: function (dt) { this.t += dt; zone.t = this.life - this.t; }, draw: function () { groundEllipse(zone.x, zone.z, zone.r, "rgba(20,8,30,.5)", "rgba(110,255,140,.5)", 3); for (var i = 0; i < 8; i++) { var ang = i * .785 + this.t * .3; ctx.fillStyle = "#3a8a4a"; ctx.fillRect(sx(zone.x + Math.cos(ang) * zone.r * .7) - 2, sy(zone.z + Math.sin(ang) * zone.r * .7) - 10, 4, 10); } } });
          A.fx({ k: "ring", x: pt2.x, z: pt2.z, r: 3, dur: .4, col: "#6fe08a" }); A.play("click", .7, .6);
        } else {
          var n = Math.min(50, k.dolls.length) + 5, healed = Math.min(.4, n * .05);
          var spots = k.dolls.map(function (dl) { return { x: dl.x, z: dl.z }; });
          for (var i = 0; i < 5; i++) spots.push({ x: h.x + Math.cos(i * 1.256) * 2.2, z: h.z + Math.sin(i * 1.256) * 2.2 });
          k.dolls = [];
          spots.forEach(function (s, i) { A.after(.05 + (i % 10) * .03, function () { A.fx({ k: "ring", x: s.x, z: s.z, r: 2.6, dur: .5, col: "#fff3a0", flash: true }); A.inRadius(s.x, s.z, 2.6).forEach(function (e) { A.dmg(e, 55); }); }); });
          A.fx({ k: "beams", x: h.x, z: h.z, dur: 1.1 }); A.healHeart(healed); A.healHeroes(.3); A.shake(.35); A.play("boss", .9, 1.3); A.toast("Éclat de la Grande Serre ! Cœur +" + Math.round(healed * 100) + " %", "#fff3a0");
        }
      },
      update: function (h, dt) {
        var k = h.k, list = k.dolls, near = A.nearest(h.x, h.z, 3.6);
        k.rush -= dt;
        list.forEach(function (dl, i) {
          if (dl.go) { var tg = dl.go; var dx = tg.x - dl.x, dz = tg.z - dl.z, l = Math.hypot(dx, dz) || 1; if (l < .6) { dl.boom = true; if (dl.prot && !tg.trap) { dl.boom = false; dl.go = null; dl.prot = false; } if (tg.trap) { A.reactivateTrap(tg.trap, "doll"); return; } A.inRadius(dl.x, dl.z, 1.7).forEach(function (e) { A.dmg(e, tg.dmg || 28); }); A.fx({ k: "ring", x: dl.x, z: dl.z, r: 1.7, dur: .35, col: "#8fff9a" }); A.shake(.05); return; } dl.x += dx / l * 9 * dt; dl.z += dz / l * 9 * dt; return; }
          var ang = i * 2.399 + A.time() * .6, rr = 1.4 + (i % 7) * .35, tx = h.x + Math.cos(ang) * rr, tz = h.z + Math.sin(ang) * rr, dx2 = tx - dl.x, dz2 = tz - dl.z, l2 = Math.hypot(dx2, dz2);
          if (l2 > .05) { var s = Math.min(l2, (l2 > 3 ? 11 : 5) * dt); dl.x += dx2 / l2 * s; dl.z += dz2 / l2 * s; }
        });
        k.dolls = list.filter(function (dl) { return !dl.boom; });
        var wt = A.wiltedTrap ? A.wiltedTrap(h.x, h.z, 3.4) : null;   // sacrifice : une poupée libre rouvre un piège desséché proche
        if (wt) { var fd = k.dolls.filter(function (d) { return !d.go; }); if (fd.length) fd[0].go = { x: wt.x, z: wt.z, dmg: 0, trap: wt }; else wt.claim = 0; }
        if (near && k.rush <= 0) { var free = k.dolls.filter(function (d) { return !d.go; }); if (free.length) { free[0].go = { x: A.pos(near).x, z: A.pos(near).z, dmg: 28 }; free[0].prot = A.sanc ? Math.random() < A.sanc(free[0].x, free[0].z) : false; k.rush = .22; } }
        k.curses = k.curses.filter(function (c) { return c.t > 0; });
      },
      netOut: function (h) { return h.k.dolls.slice(0, 30).map(function (d) { return [Math.round(d.x * 10) / 10, Math.round(d.z * 10) / 10]; }); },
      netIn: function (h, list) { h.k.dolls = list.map(function (p, i) { var o = h.k.dolls[i] || { x: p[0], z: p[1] }; o.x = p[0]; o.z = p[1]; return o; }); },
      moveFx: function (h, dt) {
        var k = h.k; k.vineT = (k.vineT || 0) - dt; if (k.vineT > 0) return; k.vineT = .2;
        var bx = h.x - Math.cos(h.face) * .5, bz = h.z - Math.sin(h.face) * .35;
        for (var i = 0; i < 2; i++) vine(bx + rnd(-.45, .45), bz + rnd(-.2, .25), rnd(-1, 1), rnd(0, 9), rnd(16, 30));
      },
      onKill: function (h, e) {
        var k = h.k, p = A.pos(e);
        if (e.poison && ++k.kills % Math.max(3, 5 - (h.mod.swarm || 0)) === 0 && k.dolls.length < 50) k.dolls.push({ x: p.x, z: p.z });
        k.curses.forEach(function (c) {
          if (dist(c.x, c.z, p.x, p.z) <= c.r) A.addActor({ x: p.x, z: p.z, life: 2, t: 0, ground: true, done: false,
            update: function (dt) { this.t += dt; if (this.t >= 1.9 && !this.done) { this.done = true; var self = this; for (var i = 0; i < 8; i++) { (function (ang) { A.enemies().forEach(function (e2) { var q = A.pos(e2), dd = dist(self.x, self.z, q.x, q.z); if (dd < 3.4 && dd > .2 && angDiff(Math.atan2(q.z - self.z, q.x - self.x), ang) < .22) A.dmg(e2, 20); }); })(i * .785); } A.fx({ k: "star8", x: self.x, z: self.z, dur: .35 }); A.play("hit", .7, .8); } },
            draw: function () { if (this.done) return; var X = sx(this.x), Y = sy(this.z); ctx.fillStyle = "#3a8a4a"; ctx.fillRect(X - 2, Y - 14 - this.t * 6, 4, 14 + this.t * 6); ctx.fillStyle = "#ff6ac0"; ctx.beginPath(); ctx.arc(X, Y - 16 - this.t * 6, 4 + this.t * 2, 0, 6.283); ctx.fill(); } });
        });
      },
      drawExtra: function (h) {
        h.k.dolls.forEach(function (dl) { A.addSorted(dl.z, function () { A.spr("doll", sx(dl.x), sy(dl.z), 1.2, false); }); });
      }
    };
    function sendDolls(h, pt, n) { var free = h.k.dolls.filter(function (d) { return !d.go; }); for (var i = 0; i < Math.min(n, free.length); i++) { free[i].go = { x: pt.x + (Math.random() - .5) * 1.6, z: pt.z + (Math.random() - .5) * 1.6, dmg: 20 }; free[i].prot = A.sanc ? Math.random() < A.sanc(free[i].x, free[i].z) : false; } }

    /* ======================================================== PHELTO (kit provisoire) */
    kits.phelto = {
      id: "phelto", name: "Phelto", short: "PHELTO", role: "Soutien · Musique", speed: 6.2, scale: 1, tower: "ampli", provisional: true,
      spr: { idle: ["hero_phelto_idle0", "hero_phelto_idle1"], move: ["hero_phelto_move0", "hero_phelto_move1"], atk: "hero_phelto_atk", cast: "hero_phelto_cast" },
      lines: ["Notes perçantes, onde de choc", "Zone qui accélère les tourelles (provisoire)"],
      skills: {
        s1: { name: "Accord de choc", cd: 7, aim: { type: "cone", len: 5, arc: 80 } },
        s2: { name: "Riff d'accélération", cd: 11, aim: { type: "point", range: 6, r: 3.2 } },
        ult: { name: "Concert", cd: 60, aim: { type: "self", r: 5.5 } }
      },
      init: function (h) { h.k = { n: 0, concert: 0 }; },
      attack: function (h, a) {
        var k = h.k; k.n++;
        function noteShot(aa) { var d = dir(aa); A.addProj({ x: h.x + d.x * .6, z: h.z + d.z * .6, vx: d.x * 14, vz: d.z * 14, life: .65, r: .5, dmg: 9, col: "#ff6ac0", kind: "note", pierce: (h.mod.pierce || 0) > 0 }); }
        if (k.n % 3 === 0) { noteShot(a - .18); noteShot(a + .18); } else noteShot(a);
        A.play("click", .5, 1.8 + (k.n % 3) * .25); return .36;
      },
      cast: function (key, h, a, d) {
        var k = h.k;
        if (key === "s1") {
          var arc = 80 * D2R;
          A.enemies().forEach(function (e) { if (inCone(h.x, h.z, a, 5, arc, e)) { A.dmg(e, 24); A.stun(e, .6 + (h.mod.stun || 0)); var dd = dir(a); A.pull(e, dd.x * .9, dd.z * .9); } });
          A.addActor({ life: .5, t: 0, update: function (dt) { this.t += dt; }, draw: function () { var p = this.t / .5; ctx.save(); ctx.globalAlpha = 1 - p; ctx.translate(sx(h.x), sy(h.z) - 26); ctx.scale(1, A.SY); for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, (1.4 + i * 1.2 + p * 2) * A.PPU, -a - arc / 2, -a + arc / 2); ctx.strokeStyle = i === 0 ? "#fff" : "rgba(255,90,190,.8)"; ctx.lineWidth = 6 - i; ctx.stroke(); } ctx.restore(); } });
          A.shake(.12); A.play("zap", .8, .8);
        } else if (key === "s2") {
          var pt = targetPoint(h, a, d, this.skills.s2), zr = 3.2 * (1 + (h.mod.rngS2 || 0)), zt = 6 + (h.mod.rngS2 ? 2 : 0); A.buff({ x: pt.x, z: pt.z, r: zr, rate: .6, t: zt });
          A.addActor({ life: zt, t: 0, ground: true, update: function (dt) { this.t += dt; A.inRadius(pt.x, pt.z, zr).forEach(function (e) { A.slow(e, .75, .3); }); },
            draw: function () { var pulse = (this.t * 1.5) % 1; groundEllipse(pt.x, pt.z, zr, "rgba(255,70,170,.12)", "rgba(255,120,200,.7)", 3); groundEllipse(pt.x, pt.z, zr * pulse, null, "rgba(255,180,230," + (1 - pulse) + ")", 2); for (var i = 0; i < 4; i++) note(sx(pt.x) + Math.cos(this.t + i * 1.6) * 60, sy(pt.z) - 20 - ((this.t * 30 + i * 18) % 60), "#ff9bd2", 20); } });
          A.fx({ k: "ring", x: pt.x, z: pt.z, r: zr, dur: .4, col: "#ff6ac0" }); A.play("upgrade", .7, 1);
        } else {
          k.concert = 7; A.buff({ r: 5.5, rate: .4, t: 7, follow: h }); A.toast("Concert !", "#ff9bd2"); A.play("boss", .8, 1.4); A.shake(.25);
        }
      },
      update: function (h, dt) {
        var k = h.k;
        if (k.concert > 0) { k.concert -= dt; k.tick = (k.tick || 0) - dt; A.inRadius(h.x, h.z, 5.5).forEach(function (e) { A.slow(e, .5, .3); }); if (k.tick <= 0) { k.tick = .5; A.inRadius(h.x, h.z, 5.5).forEach(function (e) { A.dmg(e, 7); }); } }
      },
      moveFx: function (h, dt) {
        var k = h.k; k.noteT = (k.noteT || 0) - dt; if (k.noteT > 0) return; k.noteT = .22;
        A.addActor({ x: h.x + rnd(-.5, .5), z: h.z + rnd(-.1, .3) + .01, sorted: true, life: .9, t: 0, dx: rnd(-14, 14), c: Math.random() < .5 ? "#ff9bd2" : "#ffd0ee",
          draw: function () { var u = this.t / .9; ctx.save(); ctx.globalAlpha = 1 - u; note(sx(this.x) + this.dx * u, sy(this.z) - 24 - u * 44, this.c, 18 + 6 * (1 - u)); ctx.restore(); } });
      },
      onKill: function () {},
      drawExtra: function (h) {
        var k = h.k; if (k.concert <= 0) return; var t = A.time();
        groundEllipse(h.x, h.z, 5.5, "rgba(255,70,170,.10)", "rgba(255,130,210,.8)", 3);
        for (var i = 0; i < 16; i++) { var ang = i / 16 * 6.283 + t, hgt = 10 + 14 * Math.abs(Math.sin(t * 4 + i)); ctx.fillStyle = "rgba(255,140,210,.8)"; ctx.fillRect(sx(h.x + Math.cos(ang) * 5.5) - 2, sy(h.z + Math.sin(ang) * 5.5) - hgt, 4, hgt); }
        for (var j = 0; j < 4; j++) note(sx(h.x) + Math.cos(t * 2 + j * 1.6) * 70, sy(h.z) - 60 - ((t * 40 + j * 20) % 60), "#ffd0ee", 22);
      }
    };

    /* ======================================================== ÉPÉISTE ÉLECTRIQUE */
    var COMBO = [{ rng: 2.2, arc: 100, dmg: 14, dur: .30, lunge: .55, kb: .25 }, { rng: 2.6, arc: 150, dmg: 20, dur: .34, lunge: .6, kb: .35 }, { rng: 3.5, arc: 215, dmg: 42, dur: .46, lunge: 1.0, kb: .9 }];
    kits.epeiste = {
      id: "epeiste", name: "L'Épéiste électrique", short: "ÉPÉISTE", role: "Mêlée · Foudre", speed: 6.2, scale: 1, tower: "orb", provisional: false, atkRange: 3.6,
      spr: { idle: ["hero_epeiste_idle0", "hero_epeiste_idle1"], move: ["hero_epeiste_move0", "hero_epeiste_move1"], atk: "hero_epeiste_atk", cast: "hero_epeiste_cast" },
      lines: ["Combo en 3 coups, charge électrique", "Attraction · Foudre Ancrée · Tempête"],
      skills: {
        s1: { name: "Frappe d'Attraction", cd: 7, aim: { type: "dir", len: 6.5, w: 3.4 } },
        s2: { name: "Foudre Ancrée", cd: 12, aim: { type: "dir", len: 3.2, w: 1 } },
        ult: { name: "Tempête de Foudre", cd: 60, aim: { type: "self", r: 5.5 } }
      },
      init: function (h) { h.k = { combo: 0, comboT: 0, charge: 0, storm: 0, tick: 0 }; h.cd.s2 = 8; h.cd.ult = 25; },
      attack: function (h, a) {
        var k = h.k, c = k.comboT > 0 ? k.combo % 3 : 0, st = COMBO[c], spd = 1 + .6 * k.charge / 100;
        k.pose = c === 0 ? "atk" : "cast"; k.combo = c + 1; k.comboT = st.dur + .9; h.lunge = { dx: Math.cos(a) * st.lunge, dz: Math.sin(a) * st.lunge, t: .12 };
        var hit = false;
        A.enemies().forEach(function (e) { if (inCone(h.x, h.z, a, st.rng * (1 + (h.mod.rngAtk || 0)), st.arc * D2R, e)) { hit = true; A.dmg(e, st.dmg); A.push(e, Math.cos(a) * st.kb, Math.sin(a) * st.kb); if (c === 2) A.stun(e, .25); } });
        A.fx({ k: "slash", x: h.x, z: h.z, a: a, rng: st.rng, arc: st.arc * D2R, dur: st.dur + .08, big: c === 2 });
        A.play(c === 2 ? "zap" : "hit", c === 2 ? .8 : .45, c === 2 ? .8 : 1.15 + c * .1); if (c === 2) A.shake(.12);
        var was = k.charge >= 100; k.charge = Math.min(100, k.charge + (hit ? 12 : 6) * (1 + (h.mod.charge || 0)));
        if (was) { k.charge = 0; A.fx({ k: "ring", x: h.x, z: h.z, r: 3.6, dur: .45, col: "#7ff0ff" }); A.inRadius(h.x, h.z, 3.6).forEach(function (e) { A.dmg(e, 40); A.stun(e, .5); }); A.play("zap", 1, .6); A.shake(.2); A.toast("Décharge !", "#7ff0ff"); }
        for (var q = 0; q < 3 + c * 2; q++) miniArc(h.x + Math.cos(a) * rnd(.8, st.rng * .9), h.z + Math.sin(a) * rnd(.8, st.rng * .9), 16 + c * 6, 26);
        h.swing = st.dur; return st.dur / spd;
      },
      cast: function (key, h, a, d) {
        var k = h.k; k.pose = "cast";
        if (key === "s1") {
          var dx = Math.cos(a), dz = Math.sin(a), len = 6.5, hw = 1.7;
          A.fx({ k: "pull", x: h.x, z: h.z, a: a, len: len, hw: hw, dur: .6 });
          A.enemies().forEach(function (e) { var p = A.pos(e), rx = p.x - h.x, rz = p.z - h.z, al = rx * dx + rz * dz, pe = -rx * dz + rz * dx; if (al < -.5 || al > len || Math.abs(pe) > hw) return; A.pull(e, h.x + dx * Math.max(1, al) - p.x, h.z + dz * Math.max(1, al) - p.z, .9); A.stun(e, .5); A.dmg(e, 14); });
          A.play("zap", .9, .7); A.shake(.1); k.charge = Math.min(100, k.charge + 10);
        } else if (key === "s2") {
          var dx2 = Math.cos(a), dz2 = Math.sin(a), px = A.clampX(h.x + dx2 * 3.2), pz = A.clampZ(h.z + dz2 * 3.2);
          A.fx({ k: "anchor", x: px, z: pz, dur: .8 }); h.dash = { dx: -dx2, dz: -dz2, speed: 11, t: .22 };
          A.after(.55, function () {
            var top = { x: sx(px) + 14, y: sy(pz) - 560 }, bot = { x: sx(px), y: sy(pz) - 18 }; A.bolt(top, bot, true);
            A.fx({ k: "ring", x: px, z: pz, r: 3.3, dur: .5, col: "#e9ffff", flash: true });
            A.inRadius(px, pz, 3.3).forEach(function (e) { A.dmg(e, 60 * (1 + (h.mod.s2 || 0))); A.stun(e, 1.2 + (h.mod.s2 || 0)); }); A.play("zap", 1, .55); A.shake(.25); k.charge = Math.min(100, k.charge + 20);
          }); A.play("click", .8, .8);
        } else {
          k.storm = 8; k.tick = 0; A.buff({ r: 5.5, rate: .6, t: 8, follow: h }); A.play("boss", .7, 1.2); A.toast("Tempête de Foudre !", "#ffd25e"); A.shake(.3);
        }
      },
      update: function (h, dt) {
        var k = h.k; if (k.comboT > 0) k.comboT -= dt;
        if (k.charge > 0 && Math.random() < dt * k.charge / 25) miniArc(h.x + rnd(-.4, .4), h.z, 8 + k.charge / 10, 30);   // étincelles de charge, même à l'arrêt
        if (k.storm > 0) { k.storm -= dt; k.tick -= dt; if (k.tick <= 0) { k.tick = .32; var inR = A.inRadius(h.x, h.z, 6.5); if (inR.length) { var e = inR[Math.floor(Math.random() * inR.length)], p = A.aimPt(e), top = { x: p.x + (Math.random() - .5) * 60, y: p.y - 520 }; A.bolt(top, p, true); A.dmg(e, 24); A.play("zap", .5, 1.3); } } }
      },
      swingPose: function (h) { return h.k.pose || "atk"; },
      moveFx: function (h, dt) {
        var k = h.k; k.fxT = (k.fxT || 0) - dt; if (k.fxT > 0) return; var c = k.charge / 100; k.fxT = .1 - .06 * c;
        miniArc(h.x + rnd(-.5, .5), h.z + rnd(-.15, .3), 10 + 14 * c, 8);
        if (c >= .99) miniArc(h.x + rnd(-.3, .3), h.z, 18, 36);
      },
      onKill: function () {},
      drawExtra: function (h) {
        if (h.k.storm > 0) groundEllipse(h.x, h.z, 5.5, "rgba(80,200,255,.08)", "rgba(127,240,255,.8)", 2.5);
      },
      meter: function (h) { return { label: "CHARGE ÉLECTRIQUE", v: h.k.charge / 100, col: "#43d0ff", full: h.k.charge >= 100 }; }
    };
    kits.eglantyne.meter = function (h) { return { label: "POUPÉES", v: Math.min(1, h.k.dolls.length / 50), col: "#8fff9a", text: h.k.dolls.length + "" }; };
    kits.noctis.meter = function (h) { return { label: "OMBRES", v: h.k.shades / 15, col: "#b46cff", text: h.k.shades + "" }; };
    return kits;
  };
})();
