/* =========================================================================
   Scène pixel art 2.5D — forêt en parallaxe, dessinée en code.
   Rendu en basse résolution (180 px de haut) puis agrandi sans lissage.
   Jour / nuit selon le thème du site.
   ========================================================================= */
(function () {
  "use strict";

  function mount(canvas) {
    var ctx = canvas.getContext("2d");
    var H = 180;            // hauteur interne en pixels « art »
    var M = 36;             // marge horizontale pour la parallaxe
    var W = 320;
    var seed = Number(canvas.dataset.seed || 7);
    var compact = canvas.dataset.compact === "true";
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var layers = [];
    var mushrooms = [];     // pour la lueur de nuit
    var groundAt = null;    // fonction hauteur du sol (couche squirrel)
    var particles = [];
    var leaves = [];
    var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    var scroll = 0;
    var t = 0;
    var running = false;
    var visible = true;

    /* ---------- palettes ---------- */
    var PAL = {
      day: {
        sky: ["#f5bf80", "#f8d29c", "#fae0b6", "#fcebcc", "#fdf3de"],
        sun: "#fff6dc", sunHalo: "#fde9bf",
        hill: "#bfd395", hillHi: "#cddca4",
        pine: "#86ab66", pineHi: "#9cbe78",
        tree: "#55854a", treeHi: "#6e9d5a", treeDk: "#44703d",
        trunk: "#6b4430", trunkDk: "#553423",
        ground: "#456f3c", groundHi: "#5b8a4a", groundDk: "#33582f",
        fg: "#24432c", fgHi: "#33583a",
        capBrown: "#8a5a3b", capBrownHi: "#b07a4f", capBrownDk: "#6b4430",
        capOrange: "#e8873a", capOrangeHi: "#f6b468", capOrangeDk: "#c0622a",
        stem: "#f3e1c0", stemDk: "#d8bf98", spot: "#fdf3de",
        rock: "#9a8f7a", rockHi: "#b9ae96",
        mote: "#fff3c4", leafA: "#e8873a", leafB: "#f2b05e",
        ray: "rgba(255,244,210,0.16)",
      },
      night: {
        sky: ["#0e1822", "#13212d", "#182a37", "#1d3341", "#233c49"],
        sun: "#f3e9c6", sunHalo: "#2c4552",
        hill: "#22403e", hillHi: "#2a4a46",
        pine: "#1c3a33", pineHi: "#24463c",
        tree: "#173027", treeHi: "#1f3c30", treeDk: "#12271f",
        trunk: "#2b241f", trunkDk: "#1f1a16",
        ground: "#152a20", groundHi: "#1d3628", groundDk: "#0f2018",
        fg: "#0a1510", fgHi: "#102018",
        capBrown: "#5a3b2a", capBrownHi: "#7a5238", capBrownDk: "#3e2a1e",
        capOrange: "#d9773a", capOrangeHi: "#ffb15e", capOrangeDk: "#9a4a22",
        stem: "#c9bca0", stemDk: "#9c917a", spot: "#ffe6b0",
        rock: "#3d4a46", rockHi: "#4d5a55",
        mote: "#e6ff9a", leafA: "#d9773a", leafB: "#ffb15e",
        ray: "rgba(0,0,0,0)",
      },
    };
    function isNight() { return document.documentElement.dataset.theme === "dark"; }
    function P() { return isNight() ? PAL.night : PAL.day; }

    /* ---------- utilitaires ---------- */
    function rng(s) {
      return function () {
        s |= 0; s = (s + 0x6d2b79f5) | 0;
        var r = Math.imul(s ^ (s >>> 15), 1 | s);
        r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
      };
    }
    function mk(w, h) {
      var c = document.createElement("canvas");
      c.width = w; c.height = h;
      var g = c.getContext("2d");
      g.imageSmoothingEnabled = false;
      return { c: c, g: g };
    }
    function px(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(x | 0, y | 0, w | 0, h | 0); }
    function disc(g, cx, cy, r, col) {
      g.fillStyle = col;
      for (var y = -r; y <= r; y++) {
        var hw = Math.floor(Math.sqrt(r * r - y * y) + 0.35);
        g.fillRect((cx - hw) | 0, (cy + y) | 0, hw * 2 + 1, 1);
      }
    }
    function wave(r, n) {
      var ph = [], fr = [], am = [];
      for (var i = 0; i < n; i++) { ph.push(r() * 6.28); fr.push(0.01 + r() * 0.04 * (i + 1)); am.push(1 / (i + 1)); }
      return function (x) {
        var v = 0;
        for (var i = 0; i < n; i++) v += Math.sin(x * fr[i] + ph[i]) * am[i];
        return v;
      };
    }

    /* ---------- éléments dessinés ---------- */
    function pine(g, x, base, h, col, hi, trunk) {
      px(g, x - 1, base - 3, 2, 4, trunk);
      for (var r = 0; r < h; r++) {
        var y = base - 3 - h + r;
        var tier = r % 6;
        var hw = Math.max(0, Math.floor(tier * 0.7 + r * 0.22));
        px(g, x - hw, y, hw * 2 + 1, 1, col);
        if (hw > 1) px(g, x - hw, y, Math.max(1, Math.floor(hw * 0.6)), 1, hi);
      }
    }
    function roundTree(g, x, base, s, p, r) {
      px(g, x - 1, base - s, 3, s, p.trunk);
      px(g, x + 1, base - s, 1, s, p.trunkDk);
      var cy = base - s - Math.floor(s * 0.4);
      var blobs = [];
      var n = 4 + Math.floor(r() * 3);
      for (var i = 0; i < n; i++) {
        blobs.push([
          x + Math.floor((r() - 0.5) * s * 1.1),
          cy + Math.floor((r() - 0.5) * s * 0.6),
          Math.floor(s * (0.35 + r() * 0.25)),
        ]);
      }
      // ombre (décalée vers le bas), puis feuillage, puis reflets
      blobs.forEach(function (b) { disc(g, b[0] + 1, b[1] + 2, b[2], p.treeDk); });
      blobs.forEach(function (b) { disc(g, b[0], b[1], b[2], p.tree); });
      for (var j = 0; j < n; j++) {
        var hx = x - Math.floor(s * 0.25) + Math.floor((r() - 0.5) * s * 0.5);
        var hy = cy - Math.floor(s * 0.25) + Math.floor((r() - 0.5) * s * 0.3);
        disc(g, hx, hy, Math.max(2, Math.floor(s * 0.18)), p.treeHi);
      }
    }
    function mushroom(g, x, base, s, kind, p) {
      var cap = kind === "orange" ? [p.capOrange, p.capOrangeHi, p.capOrangeDk] : [p.capBrown, p.capBrownHi, p.capBrownDk];
      var sw = Math.max(2, Math.round(s * 0.34));
      var sh = Math.max(3, Math.round(s * 0.62));
      px(g, x - Math.floor(sw / 2), base - sh, sw, sh, p.stem);
      px(g, x + Math.ceil(sw / 2) - 1, base - sh, 1, sh, p.stemDk);
      px(g, x - Math.floor(sw / 2) - 1, base - 1, sw + 2, 1, p.stemDk);
      var cw = Math.max(3, Math.round(s * 0.62));
      var ch = Math.max(2, Math.round(s * 0.42));
      var cyb = base - sh;
      for (var r = 0; r < ch; r++) {
        var k = r / ch;
        var hw = Math.round(cw * Math.sqrt(1 - (1 - k) * (1 - k)));
        px(g, x - hw, cyb - ch + r, hw * 2 + 1, 1, cap[0]);
        if (r > 0 && hw > 2) px(g, x - hw + 1, cyb - ch + r, Math.max(1, Math.floor(hw * 0.5)), 1, cap[1]);
      }
      px(g, x - cw, cyb, cw * 2 + 1, 1, cap[2]);
      if (kind === "orange" && s >= 8) {
        px(g, x - Math.floor(cw * 0.4), cyb - ch + 2, 2, 1, p.spot);
        px(g, x + Math.floor(cw * 0.3), cyb - ch + 1, 1, 1, p.spot);
        px(g, x + Math.floor(cw * 0.55), cyb - 2, 2, 1, p.spot);
      }
      return { x: x, y: cyb - Math.floor(ch / 2), r: cw + 4 };
    }

    /* ---------- écureuil ---------- */
    var SQ = [
      "...ooooo.............",
      "..oLLLLLoo...........",
      ".oLLOOOOLLo..........",
      "oLLOOOOOOLo..........",
      "oLOOODDOOOo..o..o....",
      "oOOODddDOOo.oLooLo...",
      "oOOdo..dOOo.oOOOOo...",
      ".odo...dOOo.oOOOOOo..",
      "......oDOOooOOOOeOo..",
      ".....oDOOOOOOOOOOcco.",
      "....oDOOOOOOOOOcccco.",
      "....oDDOOOOOOOcccoo..",
      "...oDDOOOOOOOccoknno.",
      "...oDDOOOOOOcccoknnno",
      "...oDDOOOOOOcccoonno.",
      "....oDDOOOOOOccoooo..",
      "....oDDDOOOOOOOo.....",
      ".....ooDDOOOOoOOo....",
      "......oooooooooooo...",
    ];
    var SQPAL = { o: "#4a2313", d: "#8a3f20", D: "#bd5c25", O: "#e47f31", L: "#efab5c", c: "#e0c9a3", e: "#1e0e08", n: "#b37744", k: "#632e17" };
    var squirrelSprite = (function () {
      var w = Math.max.apply(null, SQ.map(function (r) { return r.length; })), h = SQ.length, a = mk(w, h), b = mk(w, h);
      for (var y = 0; y < h; y++)
        for (var x = 0; x < w; x++) {
          var ch = SQ[y][x];
          if (SQPAL[ch]) { px(a.g, x, y, 1, 1, SQPAL[ch]); px(b.g, w - 1 - x, y, 1, 1, SQPAL[ch]); }
        }
      return { right: a.c, left: b.c, w: w, h: h };
    })();
    var sq = { x: 0, dir: 1, hop: 0, wait: 60, speed: 0.6 };

    /* ---------- construction des couches ---------- */
    function build() {
      var p = P();
      var r = rng(seed);
      var LW = W + M * 2, LH = H + M;
      layers = [];
      mushrooms = [];

      // 0 — ciel (pas de parallaxe horizontale)
      var sky = mk(W, H);
      var bands = p.sky.length, bandH = Math.ceil(H * 0.72 / bands);
      for (var b = 0; b < bands; b++) {
        px(sky.g, 0, b * bandH, W, bandH + 1, p.sky[b]);
        if (b > 0) for (var x = 0; x < W; x++) {   // dither entre bandes
          if (x % 2 === 0) px(sky.g, x, b * bandH - 1, 1, 1, p.sky[b]);
          if (x % 4 === 1) px(sky.g, x, b * bandH - 2, 1, 1, p.sky[b]);
          if (x % 2 === 1) px(sky.g, x, b * bandH, 1, 1, p.sky[b - 1]);
        }
      }
      px(sky.g, 0, bands * bandH, W, H, p.sky[bands - 1]);
      var sunX = Math.floor(W * 0.72), sunY = Math.floor(H * 0.26);
      if (isNight()) {
        for (var s = 0; s < W * 0.35; s++) {
          var c = r() > 0.85 ? "#fdf3de" : "#9fb3b8";
          px(sky.g, Math.floor(r() * W), Math.floor(r() * H * 0.6), 1, 1, c);
        }
        disc(sky.g, sunX, sunY, 11, p.sunHalo);
        disc(sky.g, sunX, sunY, 8, p.sun);
        disc(sky.g, sunX + 3, sunY - 2, 7, p.sky[1]);       // croissant
      } else {
        disc(sky.g, sunX, sunY, 16, p.sunHalo);
        disc(sky.g, sunX, sunY, 10, p.sun);
        // petits nuages
        for (var k = 0; k < 4; k++) {
          var cx = Math.floor(r() * W), cy = 18 + Math.floor(r() * 40), cw = 10 + Math.floor(r() * 18);
          px(sky.g, cx, cy, cw, 3, p.sky[4]);
          px(sky.g, cx + 3, cy - 2, cw - 8, 2, p.sky[4]);
        }
      }
      layers.push({ c: sky.c, d: 0.04, sky: true });

      // 1 — collines lointaines
      var hl = mk(LW, LH), hw = wave(r, 3);
      for (var x1 = 0; x1 < LW; x1++) {
        var y1 = Math.floor(H * 0.55 + hw(x1) * 9);
        px(hl.g, x1, y1, 1, LH - y1, p.hill);
        if (hw(x1 + 1) > hw(x1)) px(hl.g, x1, y1, 1, 2, p.hillHi);
      }
      layers.push({ c: hl.c, d: 0.12 });

      // 2 — sapins lointains
      var pf = mk(LW, LH), pw = wave(r, 3);
      for (var x2 = -4; x2 < LW + 4; x2 += 5 + Math.floor(r() * 5)) {
        var base2 = Math.floor(H * 0.66 + pw(x2) * 5);
        pine(pf.g, x2, base2, 16 + Math.floor(r() * 16), p.pine, p.pineHi, p.trunkDk);
      }
      for (var x2b = 0; x2b < LW; x2b++) {
        var y2 = Math.floor(H * 0.66 + pw(x2b) * 5) - 2;
        px(pf.g, x2b, y2, 1, LH - y2, p.pine);
      }
      layers.push({ c: pf.c, d: 0.25 });

      // 3 — arbres du milieu
      var tm = mk(LW, LH), tw = wave(r, 2);
      var treeCount = Math.max(4, Math.floor(LW / 52));
      for (var i3 = 0; i3 < treeCount; i3++) {
        var x3 = Math.floor((i3 + 0.2 + r() * 0.6) * LW / treeCount);
        var base3 = Math.floor(H * 0.78 + tw(x3) * 4);
        if (r() < 0.45) pine(tm.g, x3, base3, 40 + Math.floor(r() * 20), p.tree, p.treeHi, p.trunk);
        else roundTree(tm.g, x3, base3, 18 + Math.floor(r() * 10), p, r);
      }
      for (var x3b = 0; x3b < LW; x3b++) {
        var y3 = Math.floor(H * 0.78 + tw(x3b) * 4) - 1;
        px(tm.g, x3b, y3, 1, LH - y3, p.treeDk);
      }
      layers.push({ c: tm.c, d: 0.45, rays: true });

      // 4 — sol + champignons (couche de l'écureuil)
      var gr = mk(LW, LH), gw = wave(r, 3);
      groundAt = function (x) { return Math.floor(H * 0.86 + gw(x) * 3); };
      for (var x4 = 0; x4 < LW; x4++) {
        var y4 = groundAt(x4);
        px(gr.g, x4, y4, 1, LH - y4, p.ground);
        px(gr.g, x4, y4, 1, 1, p.groundHi);
        if ((x4 * 7 + y4) % 5 === 0) px(gr.g, x4, y4 - 1, 1, 1, p.groundHi);   // brins d'herbe
        if ((x4 * 13) % 9 === 0) px(gr.g, x4, y4 - 2, 1, 2, p.groundHi);
        for (var dy = 6; dy < LH - y4; dy += 3) if ((x4 + dy) % 4 === 0) px(gr.g, x4, y4 + dy, 1, 1, p.groundDk);
      }
      // rochers
      for (var k4 = 0; k4 < 3; k4++) {
        var rx = Math.floor(r() * LW), ry = groundAt(rx);
        disc(gr.g, rx, ry, 3 + Math.floor(r() * 2), p.rock);
        px(gr.g, rx - 2, ry - 3, 3, 1, p.rockHi);
      }
      // champignons en groupes
      var groups = compact ? 3 : Math.max(3, Math.floor(LW / 90));
      for (var gi = 0; gi < groups; gi++) {
        var gx = Math.floor((gi + 0.15 + r() * 0.7) * LW / groups);
        var big = 10 + Math.floor(r() * 9);
        var kinds = r() < 0.5 ? ["brown", "orange"] : ["orange", "brown"];
        mushrooms.push(mushroom(gr.g, gx, groundAt(gx) + 1, big, kinds[0], p));
        var n = 1 + Math.floor(r() * 3);
        for (var m = 0; m < n; m++) {
          var mx = gx + (m % 2 ? 1 : -1) * (5 + Math.floor(r() * 8));
          mushrooms.push(mushroom(gr.g, mx, groundAt(mx) + 1, 5 + Math.floor(r() * 5), r() < 0.6 ? kinds[1] : kinds[0], p));
        }
      }
      layers.push({ c: gr.c, d: 0.7, ground: true });

      // 5 — premier plan (herbes hautes + feuillage qui encadre)
      var fg = mk(LW, LH);
      for (var x5 = 0; x5 < LW; x5++) {
        var edge = Math.min(x5, LW - x5) / LW;            // plus haut sur les bords
        var hgt = Math.floor(4 + (0.5 - edge) * 16 + Math.sin(x5 * 0.7) * 2 + r() * 3);
        var y5 = H - hgt;
        px(fg.g, x5, y5, 1, LH - y5, (x5 % 3 === 0) ? p.fgHi : p.fg);
      }
      // fougères / feuilles aux coins hauts
      [[M - 6, 1], [LW - M + 6, -1]].forEach(function (corner) {
        var cx0 = corner[0], dir = corner[1];
        for (var f = 0; f < 5; f++) {
          var len = 26 + Math.floor(r() * 26), yy0 = Math.floor(r() * 14) - 4, slope = 0.25 + r() * 0.5;
          for (var l = 0; l < len; l++) {
            var lx = cx0 + dir * l, ly = Math.floor(yy0 + l * slope + Math.sin(l * 0.15) * 2);
            px(fg.g, lx, ly, 1, 2, p.fg);
            if (l % 3 === 0 && l > 3) {
              var leafL = Math.floor((len - l) / 5) + 2;
              for (var q = 1; q < leafL; q++) px(fg.g, lx + dir * q, ly + q, 1, 1, q % 2 ? p.fg : p.fgHi);
            }
          }
        }
      });
      layers.push({ c: fg.c, d: 1.1, fg: true });

      // particules
      particles = [];
      var pc = compact ? 14 : 34;
      for (var pi = 0; pi < pc; pi++) particles.push(newMote(r, true));
      leaves = [];
      sq.x = Math.floor(LW * 0.62);
    }

    function newMote(r, anywhere) {
      r = r || Math.random;
      return {
        x: r() * (W + M * 2),
        y: anywhere ? r() * H : H * (0.6 + r() * 0.4),
        vx: (r() - 0.5) * 0.15,
        vy: -0.05 - r() * 0.12,
        ph: r() * 6.28,
      };
    }

    /* ---------- dimensionnement ---------- */
    function resize() {
      var rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var ratio = rect.width / rect.height;
      W = Math.max(200, Math.min(640, Math.round(H * ratio)));
      canvas.width = W;
      canvas.height = H;
      ctx.imageSmoothingEnabled = false;
      build();
      draw();
    }

    /* ---------- rendu ---------- */
    function layerOffset(L) {
      var ox = -M + Math.round(-pointer.x * L.d * (M * 0.8));
      var oy = Math.round(-pointer.y * L.d * 6 - scroll * L.d * 40);
      return [ox, oy];
    }

    function draw() {
      var p = P();
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < layers.length; i++) {
        var L = layers[i];
        if (L.sky) {
          ctx.drawImage(L.c, Math.round(-pointer.x * 2), 0);
          continue;
        }
        var o = layerOffset(L);
        ctx.drawImage(L.c, o[0], o[1]);

        if (L.rays && !isNight()) drawRays(p);
        if (L.ground) {
          if (isNight()) drawGlow(o, p);
          drawSquirrel(o);
        }
        if (L.fg) continue;
        if (i === layers.length - 2) drawMotes(p);
      }
      drawLeaves(p);
    }

    function drawRays(p) {
      ctx.fillStyle = p.ray;
      var shift = Math.round(-pointer.x * 4);
      for (var k = 0; k < 4; k++) {
        var x0 = Math.floor(W * 0.5 + k * 26) + shift;
        for (var y = 0; y < H; y += 1) {
          var w = 6 + k * 2;
          ctx.fillRect(x0 - Math.floor(y * 0.55), y, w, 1);
        }
      }
    }
    function drawGlow(o, p) {
      for (var i = 0; i < mushrooms.length; i++) {
        var m = mushrooms[i];
        var a = 0.12 + 0.08 * Math.sin(t * 0.04 + i);
        ctx.fillStyle = "rgba(255,190,110," + a.toFixed(3) + ")";
        var x = m.x + o[0], y = m.y + o[1];
        for (var yy = -m.r; yy <= m.r; yy++) {
          var hw = Math.floor(Math.sqrt(m.r * m.r - yy * yy));
          if ((yy & 1) === 0) ctx.fillRect(x - hw, y + yy, hw * 2 + 1, 1);
        }
      }
    }
    function drawSquirrel(o) {
      if (!groundAt) return;
      var spr = sq.dir > 0 ? squirrelSprite.right : squirrelSprite.left;
      var gx = Math.round(sq.x);
      var y = groundAt(gx) - squirrelSprite.h + 1 - Math.round(sq.hop);
      ctx.drawImage(spr, gx - (squirrelSprite.w >> 1) + o[0], y + o[1]);
    }
    function drawMotes(p) {
      ctx.fillStyle = p.mote;
      for (var i = 0; i < particles.length; i++) {
        var m = particles[i];
        var tw = Math.sin(t * 0.05 + m.ph);
        if (tw < -0.6) continue;
        var x = Math.round(m.x - M - pointer.x * 0.85 * M * 0.8), y = Math.round(m.y);
        ctx.fillRect(x, y, 1, 1);
        if (isNight() && tw > 0.5) {
          ctx.globalAlpha = 0.35;
          ctx.fillRect(x - 1, y, 3, 1);
          ctx.fillRect(x, y - 1, 1, 3);
          ctx.globalAlpha = 1;
        }
      }
    }
    function drawLeaves(p) {
      for (var i = 0; i < leaves.length; i++) {
        var l = leaves[i];
        ctx.fillStyle = l.c;
        var x = Math.round(l.x), y = Math.round(l.y);
        ctx.fillRect(x, y, 2, 1);
        ctx.fillRect(x + (Math.sin(l.ph) > 0 ? 1 : 0), y + 1, 1, 1);
      }
    }

    /* ---------- animation ---------- */
    function update() {
      t++;
      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;

      for (var i = 0; i < particles.length; i++) {
        var m = particles[i];
        m.x += m.vx + Math.sin(t * 0.02 + m.ph) * 0.08;
        m.y += m.vy;
        if (m.y < -2 || m.x < -2 || m.x > W + M * 2) particles[i] = newMote(null, false);
      }

      var p = P();
      if (!isNight() && leaves.length < (compact ? 2 : 5) && Math.random() < 0.012) {
        leaves.push({ x: Math.random() * W, y: -2, vy: 0.25 + Math.random() * 0.2, ph: Math.random() * 6, c: Math.random() < 0.5 ? p.leafA : p.leafB });
      }
      for (var j = leaves.length - 1; j >= 0; j--) {
        var l = leaves[j];
        l.ph += 0.06; l.y += l.vy; l.x += Math.sin(l.ph) * 0.4;
        if (l.y > H) leaves.splice(j, 1);
      }

      // écureuil : attend, puis fait quelques bonds
      if (sq.wait > 0) {
        sq.wait--;
        sq.hop = 0;
        if (sq.wait === 0) { sq.hops = 2 + Math.floor(Math.random() * 4); sq.phase = 0; }
      } else {
        sq.phase += 0.12;
        sq.hop = Math.abs(Math.sin(sq.phase)) * 5;
        sq.x += sq.dir * sq.speed;
        var lo = M + 30, hi = W + M - 30;
        if (sq.x < lo) { sq.x = lo; sq.dir = 1; }
        if (sq.x > hi) { sq.x = hi; sq.dir = -1; }
        if (sq.phase >= Math.PI) {
          sq.phase = 0; sq.hops--;
          if (sq.hops <= 0) {
            sq.wait = 80 + Math.floor(Math.random() * 200);
            if (Math.random() < 0.4) sq.dir *= -1;
          }
        }
      }
    }

    function loop() {
      if (!running) return;
      if (visible) { update(); draw(); }
      requestAnimationFrame(loop);
    }

    /* ---------- événements ---------- */
    window.addEventListener("pointermove", function (e) {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
    window.addEventListener("scroll", function () {
      var rect = canvas.getBoundingClientRect();
      scroll = Math.max(0, Math.min(1, -rect.top / (rect.height || 1)));
      if (reduceMotion) draw();
    }, { passive: true });
    canvas.addEventListener("click", function (e) {
      // petite pluie de pollen / lucioles à l'endroit du clic
      var rect = canvas.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width * W + M;
      var y = (e.clientY - rect.top) / rect.height * H;
      for (var i = 0; i < 12; i++) {
        particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 0.8, vy: -0.2 - Math.random() * 0.5, ph: Math.random() * 6 });
      }
      if (particles.length > 90) particles.splice(0, particles.length - 90);
      if (sq.wait > 0) { sq.wait = 1; sq.dir = x > sq.x ? 1 : -1; }
    });
    document.addEventListener("themechange", function () { build(); draw(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(canvas);
    }
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener("resize", resize);

    resize();
    if (!reduceMotion) { running = true; requestAnimationFrame(loop); }
  }

  document.querySelectorAll("canvas.pixel-scene").forEach(mount);
})();
