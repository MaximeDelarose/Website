/* =========================================================================
   Grimpe-Chêne : cœur physique (sans DOM), partagé par le jeu et par
   tools/grimpe-check.js qui prouve par simulation que la tour est franchissable.
   Unités : pixels, tuiles de 16 px, écran de 20 × 15 tuiles (320 × 240).
   Le joueur (AABB 10 × 13) est repéré par x = centre, y = pieds.
   Tuiles : '#' solide · 'I' glace · '=' plateforme traversable par le bas ·
   'G' but (gland doré) · '.' vide.
   ========================================================================= */
(function (root) {
  "use strict";
  var TS = 16, COLS = 20, SROWS = 15, PW = 10, PH = 13;
  var P = {
    g: 900, vmax: 720,
    walk: 46,                    // vitesse de marche (px/s)
    jmin: 175, jmax: 400,        // vitesse verticale d'un saut (min, max)
    jx: 82,                      // vitesse horizontale d'un saut incliné
    chargeMax: 0.85,             // secondes pour armer à fond (le saut part tout seul ensuite)
    chargeMin: 0.06,
    bounce: 0.55,                // rebond sur un mur en l'air
    crashV: 520,                 // vitesse d'impact qui fait s'écraser
    stun: 0.9,
    iceAccel: 130, iceFric: 38,
  };

  function tile(L, tx, ty) {
    if (tx < 0 || tx >= COLS) return "#";
    if (ty >= L.h) return "#";
    if (ty < 0) return ".";
    return L.rows[ty].charAt(tx);
  }
  function isSolid(c) { return c === "#" || c === "I"; }

  function createLevel(data) {
    var rows = data.rows, L = { rows: rows, h: rows.length, wind: data.wind || {}, name: data.name || "" };
    L.screens = Math.ceil(L.h / SROWS);
    L.startX = data.startX != null ? data.startX : COLS * TS / 2;
    L.startY = data.startY != null ? data.startY : (L.h - 2) * TS;
    L.goal = null;
    for (var y = 0; y < rows.length; y++) { var x = rows[y].indexOf("G"); if (x >= 0) { L.goal = { x: x, y: y }; break; } }
    return L;
  }
  function screenOf(L, y) { return Math.max(0, Math.min(L.screens - 1, Math.floor((y - 0.01) / (TS * SROWS)))); }

  function newPlayer(L) {
    return { x: L.startX, y: L.startY, vx: 0, vy: 0, ground: true, charge: 0, stun: 0, facing: 1, won: false, ev: [], minY: L.startY, ice: false };
  }

  function overlapsSolid(L, l, t, r, b) {
    var x0 = Math.floor(l / TS), x1 = Math.floor((r - 0.001) / TS), y0 = Math.floor(t / TS), y1 = Math.floor((b - 0.001) / TS);
    for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) if (isSolid(tile(L, tx, ty))) return true;
    return false;
  }
  // tuile sous les pieds (solide ou traversable posée) ; renvoie le caractère ou ""
  function groundTile(L, p) {
    var yy = p.y + 0.6, ty = Math.floor(yy / TS);
    var x0 = Math.floor((p.x - PW / 2 + 0.5) / TS), x1 = Math.floor((p.x + PW / 2 - 0.5) / TS), found = "";
    for (var tx = x0; tx <= x1; tx++) {
      var c = tile(L, tx, ty);
      if (isSolid(c)) { if (c === "I") return "I"; found = "#"; }
      else if (c === "=" && Math.abs(p.y - ty * TS) < 0.7 && !found) found = "=";
    }
    return found;
  }

  function doJump(p, dir) {
    var c = Math.min(1, Math.max(P.chargeMin, p.charge) / P.chargeMax);
    p.vy = -(P.jmin + (P.jmax - P.jmin) * c);
    p.vx = dir * P.jx;
    if (dir) p.facing = dir;
    p.ground = false; p.charge = 0; p.ev.push("jump:" + c.toFixed(2));
  }

  function sub(L, p, inp, h) {
    var dir = inp.dir | 0, jump = !!inp.jump;
    if (p.stun > 0) { p.stun -= h; dir = 0; jump = false; }
    var scr = screenOf(L, p.y - 1), wind = L.wind[scr] || 0;

    if (p.ground) {
      var gt = groundTile(L, p);
      if (!gt) { p.ground = false; }
      else {
        p.ice = gt === "I";
        if (jump && p.stun <= 0) {
          p.charge += h; if (dir) p.facing = dir;
          if (p.charge >= P.chargeMax) doJump(p, dir);
        } else if (p.charge > 0 && p.stun <= 0) {
          doJump(p, dir);
        } else {
          p.charge = 0;
          if (dir) p.facing = dir;
        }
        if (p.ground) {
          var target = (p.charge > 0 || p.stun > 0) ? 0 : dir * P.walk;
          if (p.ice) {
            if (p.vx < target) p.vx = Math.min(target, p.vx + (target === 0 ? P.iceFric : P.iceAccel) * h);
            else if (p.vx > target) p.vx = Math.max(target, p.vx - (target === 0 ? P.iceFric : P.iceAccel) * h);
          } else p.vx = target;
          p.vy = 0;
        }
      }
    }
    if (!p.ground) {
      p.vy = Math.min(P.vmax, p.vy + P.g * h);
      p.vx += wind * h;
    }

    // déplacement horizontal
    var nx = p.x + p.vx * h;
    if (overlapsSolid(L, nx - PW / 2, p.y - PH, nx + PW / 2, p.y - 0.01)) {
      if (p.vx > 0) { var tx = Math.floor((nx + PW / 2 - 0.001) / TS); nx = tx * TS - PW / 2 - 0.001; }
      else { var tx2 = Math.floor((nx - PW / 2) / TS); nx = (tx2 + 1) * TS + PW / 2 + 0.001; }
      if (!p.ground && Math.abs(p.vx) > 15) { p.vx = -p.vx * P.bounce; p.ev.push("bump"); } else p.vx = 0;
    }
    p.x = nx;

    // déplacement vertical
    if (!p.ground) {
      var ny = p.y + p.vy * h, landed = false;
      if (p.vy > 0) {
        var lo = Math.floor((p.x - PW / 2 + 0.5) / TS), hi = Math.floor((p.x + PW / 2 - 0.5) / TS);
        var row = Math.floor(ny / TS), best = null;
        // solides : on cherche la plus haute surface croisée par les pieds
        for (var ty = Math.floor(p.y / TS); ty <= row; ty++) {
          for (var tx3 = lo; tx3 <= hi; tx3++) {
            var c = tile(L, tx3, ty), top = ty * TS;
            if ((isSolid(c) || c === "=") && ny > top && p.y <= top + 0.01) {
              if (best === null || top < best) best = top;
            }
          }
          if (best !== null) break;
        }
        if (best !== null) { ny = best; landed = true; }
      } else if (p.vy < 0) {
        if (overlapsSolid(L, p.x - PW / 2, ny - PH, p.x + PW / 2, ny - 0.01)) {
          var tyt = Math.floor((ny - PH) / TS);
          ny = (tyt + 1) * TS + PH + 0.001; p.vy = 40; p.ev.push("bonk");
        }
      }
      p.y = ny;
      if (landed) {
        var impact = p.vy;
        p.ground = true; p.vy = 0;
        var gt2 = groundTile(L, p);
        p.ice = gt2 === "I";
        if (impact > P.crashV) { p.stun = P.stun; p.vx = 0; p.ev.push("crash"); }
        else { if (!p.ice) p.vx = 0; p.ev.push("land"); }
        p.charge = 0;
      }
    }
    if (p.y - PH < p.minY - PH) p.minY = p.y;
    if (L.goal && !p.won) {
      var gx = L.goal.x * TS, gy = L.goal.y * TS;
      if (p.x + PW / 2 > gx && p.x - PW / 2 < gx + TS && p.y > gy && p.y - PH < gy + TS) { p.won = true; p.ev.push("win"); }
    }
  }

  function step(L, p, inp, dt) {
    if (p.won) return;
    var n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
    for (var i = 0; i < n; i++) sub(L, p, inp, h);
  }

  var api = { TS: TS, COLS: COLS, SROWS: SROWS, PW: PW, PH: PH, P: P, tile: tile, isSolid: isSolid, createLevel: createLevel, newPlayer: newPlayer, step: step, screenOf: screenOf, groundTile: groundTile };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.GrimpeCore = api;
})(typeof window !== "undefined" ? window : this);
