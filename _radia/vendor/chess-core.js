/* =========================================================================
   Échecs — moteur sans DOM (règles complètes + bot)
   -------------------------------------------------------------------------
   Plateau 0x88 (case = rang * 16 + colonne, a1 = 0, h8 = 119).
   Pièces : +1..+6 blanches, -1..-6 noires (P C F T D R → 1 2 3 4 5 6).
   Coups codés en entier : départ | arrivée << 7 | promo << 14 | drapeaux << 17.

   Utilisable :
   - dans la page (window.CHESS),
   - dans un Web Worker (même fichier : new Worker("js/chess-core.js")),
   - dans Node : const C = require("./js/chess-core.js"); C.perft(C.fromFEN(C.START), 4)
   Niveaux du bot : LEVELS (profondeur, temps, bruit, coups au hasard).
   ========================================================================= */
(function (root) {
  "use strict";

  var START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  var P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
  var WK = 1, WQ = 2, BK = 4, BQ = 8;
  var CAP = 1, EP = 2, CASTLE = 4, DOUBLE = 8;
  var N_OFF = [33, 31, 18, 14, -33, -31, -18, -14];
  var K_OFF = [1, -1, 16, -16, 17, 15, -17, -15];
  var B_OFF = [17, 15, -17, -15];
  var R_OFF = [1, -1, 16, -16];
  var LETTER = ".PNBRQK";

  /* ------------------------------------------------------------------
     Niveaux du bot (du plus facile au plus fort)
     depth : profondeur fixe · time : réflexion en ms (approfondissement)
     noise : bruit ajouté au score de chaque coup (centipions)
     random : chance de jouer un coup complètement au hasard
     q : recherche de calme (évite de laisser des pièces en prise)
     ------------------------------------------------------------------ */
  var LEVELS = [
    { id: 1, name: "Gland",      tag: "Débutant",  elo: "≈ 400",  depth: 1, noise: 320, random: 0.30, q: false },
    { id: 2, name: "Noisette",   tag: "Facile",    elo: "≈ 800",  depth: 2, noise: 130, random: 0.08, q: true },
    { id: 3, name: "Écureuil",   tag: "Moyen",     elo: "≈ 1200", depth: 3, noise: 55,  random: 0.02, q: true },
    { id: 4, name: "Hibou",      tag: "Confirmé",  elo: "≈ 1500", depth: 4, noise: 22,  random: 0,    q: true },
    { id: 5, name: "Renard",     tag: "Fort",      elo: "≈ 1800", time: 900, maxDepth: 5,  noise: 0, random: 0, q: true, book: true },
    { id: 6, name: "Grand Chêne", tag: "Maître",   elo: "≈ 2100", time: 2500, maxDepth: 40, noise: 0, random: 0, q: true, book: true }
  ];

  /* ---------- hachage de Zobrist (graine fixe) ---------- */
  var seed = 0x2545f491;
  function rnd32() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; }
  var Z = []; for (var zi = 0; zi < 13; zi++) { Z.push(new Int32Array(128)); for (var zj = 0; zj < 128; zj++) Z[zi][zj] = rnd32(); }
  var ZSIDE = rnd32(), ZC = new Int32Array(16), ZEP = new Int32Array(8);
  for (var zc = 0; zc < 16; zc++) ZC[zc] = rnd32();
  for (var ze = 0; ze < 8; ze++) ZEP[ze] = rnd32();
  function zp(p) { return p + 6; }

  var CMASK = new Int8Array(128); for (var cm = 0; cm < 128; cm++) CMASK[cm] = 15;
  CMASK[0] = 15 & ~WQ; CMASK[4] = 15 & ~(WK | WQ); CMASK[7] = 15 & ~WK;
  CMASK[112] = 15 & ~BQ; CMASK[116] = 15 & ~(BK | BQ); CMASK[119] = 15 & ~BK;

  function sqName(s) { return "abcdefgh".charAt(s & 7) + ((s >> 4) + 1); }
  function sqOf(n) { return (n.charCodeAt(0) - 97) + (n.charCodeAt(1) - 49) * 16; }
  function enc(f, t, pr, fl) { return f | (t << 7) | (pr << 14) | (fl << 17); }
  function mFrom(m) { return m & 127; }
  function mTo(m) { return (m >> 7) & 127; }
  function mPromo(m) { return (m >> 14) & 7; }
  function mFlag(m) { return m >> 17; }
  function toUCI(m) { var p = mPromo(m); return sqName(mFrom(m)) + sqName(mTo(m)) + (p ? " nbrq".charAt(p - 1) : ""); }

  /* ---------- position ---------- */
  function Pos() {
    this.b = new Int8Array(128); this.side = 1; this.castle = 0; this.ep = -1;
    this.half = 0; this.full = 1; this.kings = [4, 116]; this.hash = 0;
    this.hist = []; this.stack = [];
  }
  function computeHash(p) {
    var h = 0;
    for (var s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } if (p.b[s]) h ^= Z[zp(p.b[s])][s]; }
    if (p.side < 0) h ^= ZSIDE;
    h ^= ZC[p.castle];
    if (p.ep >= 0) h ^= ZEP[p.ep & 7];
    return h;
  }
  function fromFEN(fen) {
    var p = new Pos(), parts = String(fen || START).trim().split(/\s+/), rows = parts[0].split("/");
    for (var r = 0; r < 8; r++) {
      var f = 0, row = rows[r] || "";
      for (var i = 0; i < row.length; i++) {
        var c = row.charAt(i);
        if (c >= "1" && c <= "8") { f += +c; continue; }
        var t = LETTER.indexOf(c.toUpperCase()); if (t < 1) continue;
        var sq = (7 - r) * 16 + f, pc = c === c.toUpperCase() ? t : -t;
        p.b[sq] = pc; if (t === K) p.kings[pc > 0 ? 0 : 1] = sq; f++;
      }
    }
    p.side = parts[1] === "b" ? -1 : 1;
    var cs = parts[2] || "-";
    p.castle = (cs.indexOf("K") >= 0 ? WK : 0) | (cs.indexOf("Q") >= 0 ? WQ : 0) | (cs.indexOf("k") >= 0 ? BK : 0) | (cs.indexOf("q") >= 0 ? BQ : 0);
    p.ep = parts[3] && parts[3] !== "-" ? sqOf(parts[3]) : -1;
    p.half = +(parts[4] || 0); p.full = +(parts[5] || 1);
    p.hash = computeHash(p);
    return p;
  }
  function toFEN(p) {
    var out = [];
    for (var r = 7; r >= 0; r--) {
      var row = "", e = 0;
      for (var f = 0; f < 8; f++) {
        var pc = p.b[r * 16 + f];
        if (!pc) { e++; continue; }
        if (e) { row += e; e = 0; }
        var l = LETTER.charAt(Math.abs(pc)); row += pc > 0 ? l : l.toLowerCase();
      }
      if (e) row += e; out.push(row);
    }
    var cs = (p.castle & WK ? "K" : "") + (p.castle & WQ ? "Q" : "") + (p.castle & BK ? "k" : "") + (p.castle & BQ ? "q" : "");
    return out.join("/") + " " + (p.side > 0 ? "w" : "b") + " " + (cs || "-") + " " + (p.ep >= 0 ? sqName(p.ep) : "-") + " " + p.half + " " + p.full;
  }

  /* ---------- attaques ---------- */
  function attacked(b, sq, by) {
    var t, o, i, pc;
    if (by > 0) { t = sq - 15; if (!(t & 0x88) && b[t] === 1) return true; t = sq - 17; if (!(t & 0x88) && b[t] === 1) return true; }
    else { t = sq + 15; if (!(t & 0x88) && b[t] === -1) return true; t = sq + 17; if (!(t & 0x88) && b[t] === -1) return true; }
    var kn = 2 * by, kg = 6 * by, bi = 3 * by, ro = 4 * by, qu = 5 * by;
    for (i = 0; i < 8; i++) { t = sq + N_OFF[i]; if (!(t & 0x88) && b[t] === kn) return true; }
    for (i = 0; i < 8; i++) { t = sq + K_OFF[i]; if (!(t & 0x88) && b[t] === kg) return true; }
    for (i = 0; i < 4; i++) {
      o = B_OFF[i]; t = sq + o;
      while (!(t & 0x88)) { pc = b[t]; if (pc) { if (pc === bi || pc === qu) return true; break; } t += o; }
    }
    for (i = 0; i < 4; i++) {
      o = R_OFF[i]; t = sq + o;
      while (!(t & 0x88)) { pc = b[t]; if (pc) { if (pc === ro || pc === qu) return true; break; } t += o; }
    }
    return false;
  }
  function inCheck(p) { return attacked(p.b, p.kings[p.side > 0 ? 0 : 1], -p.side); }

  /* ---------- génération (pseudo-légale) ---------- */
  function addPawn(out, f, t, fl, promoRank, capsOnly) {
    if ((t >> 4) === promoRank) {
      out.push(enc(f, t, Q, fl));
      if (!capsOnly) { out.push(enc(f, t, N, fl)); out.push(enc(f, t, R, fl)); out.push(enc(f, t, B, fl)); }
    } else out.push(enc(f, t, 0, fl));
  }
  function gen(p, out, capsOnly) {
    var b = p.b, s = p.side, sq, pc, t, o, i, q;
    for (sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      pc = b[sq]; if (!pc || (pc > 0) !== (s > 0)) continue;
      var ty = pc * s;
      if (ty === P) {
        var dir = 16 * s, promoRank = s > 0 ? 7 : 0, startRank = s > 0 ? 1 : 6;
        t = sq + dir;
        if (!(t & 0x88) && !b[t]) {
          if ((t >> 4) === promoRank) addPawn(out, sq, t, 0, promoRank, capsOnly);
          else if (!capsOnly) {
            out.push(enc(sq, t, 0, 0));
            if ((sq >> 4) === startRank && !b[t + dir]) out.push(enc(sq, t + dir, 0, DOUBLE));
          }
        }
        for (i = -1; i <= 1; i += 2) {
          t = sq + dir + i; if (t & 0x88) continue;
          q = b[t];
          if (q && (q > 0) !== (s > 0)) addPawn(out, sq, t, CAP, promoRank, capsOnly);
          else if (t === p.ep && !q) out.push(enc(sq, t, 0, CAP | EP));
        }
      } else if (ty === N || ty === K) {
        var offs = ty === N ? N_OFF : K_OFF;
        for (i = 0; i < 8; i++) {
          t = sq + offs[i]; if (t & 0x88) continue;
          q = b[t];
          if (!q) { if (!capsOnly) out.push(enc(sq, t, 0, 0)); }
          else if ((q > 0) !== (s > 0)) out.push(enc(sq, t, 0, CAP));
        }
        if (ty === K && !capsOnly) {
          if (s > 0) {
            if ((p.castle & WK) && !b[5] && !b[6] && b[7] === R && !attacked(b, 4, -1) && !attacked(b, 5, -1) && !attacked(b, 6, -1)) out.push(enc(4, 6, 0, CASTLE));
            if ((p.castle & WQ) && !b[3] && !b[2] && !b[1] && b[0] === R && !attacked(b, 4, -1) && !attacked(b, 3, -1) && !attacked(b, 2, -1)) out.push(enc(4, 2, 0, CASTLE));
          } else {
            if ((p.castle & BK) && !b[117] && !b[118] && b[119] === -R && !attacked(b, 116, 1) && !attacked(b, 117, 1) && !attacked(b, 118, 1)) out.push(enc(116, 118, 0, CASTLE));
            if ((p.castle & BQ) && !b[115] && !b[114] && !b[113] && b[112] === -R && !attacked(b, 116, 1) && !attacked(b, 115, 1) && !attacked(b, 114, 1)) out.push(enc(116, 114, 0, CASTLE));
          }
        }
      } else {
        var dirs = ty === B ? B_OFF : ty === R ? R_OFF : K_OFF;
        for (i = 0; i < dirs.length; i++) {
          o = dirs[i]; t = sq + o;
          while (!(t & 0x88)) {
            q = b[t];
            if (!q) { if (!capsOnly) out.push(enc(sq, t, 0, 0)); }
            else { if ((q > 0) !== (s > 0)) out.push(enc(sq, t, 0, CAP)); break; }
            t += o;
          }
        }
      }
    }
    return out;
  }

  /* ---------- jouer / annuler ---------- */
  function make(p, m) {
    var b = p.b, f = m & 127, t = (m >> 7) & 127, pr = (m >> 14) & 7, fl = m >> 17, s = p.side;
    var pc = b[f], cap = b[t], h = p.hash;
    p.hist.push(h);
    if (fl & EP) { var cs = t - 16 * s; cap = b[cs]; b[cs] = 0; h ^= Z[zp(cap)][cs]; }
    else if (cap) h ^= Z[zp(cap)][t];
    p.stack.push(m, cap, p.castle, p.ep, p.half);
    h ^= Z[zp(pc)][f];
    var np = pr ? pr * s : pc;
    b[t] = np; b[f] = 0; h ^= Z[zp(np)][t];
    if (fl & CASTLE) {
      var rf = t > f ? f + 3 : f - 4, rt = t > f ? f + 1 : f - 1, rk = b[rf];
      b[rt] = rk; b[rf] = 0; h ^= Z[zp(rk)][rf] ^ Z[zp(rk)][rt];
    }
    if (pc === 6 * s) p.kings[s > 0 ? 0 : 1] = t;
    if (p.ep >= 0) h ^= ZEP[p.ep & 7];
    p.ep = -1;
    if (fl & DOUBLE) {
      var a = t + 1, c = t - 1;
      if ((!(a & 0x88) && b[a] === -s) || (!(c & 0x88) && b[c] === -s)) { p.ep = f + 16 * s; h ^= ZEP[p.ep & 7]; }
    }
    h ^= ZC[p.castle]; p.castle &= CMASK[f] & CMASK[t]; h ^= ZC[p.castle];
    p.half = (pc === s || cap) ? 0 : p.half + 1;
    if (s < 0) p.full++;
    p.side = -s; h ^= ZSIDE;
    p.hash = h;
  }
  function unmake(p) {
    var st = p.stack, half = st.pop(), ep = st.pop(), castle = st.pop(), cap = st.pop(), m = st.pop();
    var b = p.b, f = m & 127, t = (m >> 7) & 127, pr = (m >> 14) & 7, fl = m >> 17;
    p.side = -p.side; var s = p.side;
    var pc = pr ? s : b[t];
    b[f] = pc;
    if (fl & EP) { b[t] = 0; b[t - 16 * s] = cap; }
    else b[t] = cap;
    if (fl & CASTLE) {
      var rf = t > f ? f + 3 : f - 4, rt = t > f ? f + 1 : f - 1;
      b[rf] = b[rt]; b[rt] = 0;
    }
    if (pc === 6 * s) p.kings[s > 0 ? 0 : 1] = f;
    p.castle = castle; p.ep = ep; p.half = half;
    if (s < 0) p.full--;
    p.hash = p.hist.pop();
  }
  function makeNull(p) {
    p.hist.push(p.hash); p.stack.push(p.ep, p.half);
    var h = p.hash; if (p.ep >= 0) h ^= ZEP[p.ep & 7];
    p.ep = -1; p.half = 0; p.side = -p.side; p.hash = h ^ ZSIDE;
  }
  function unmakeNull(p) { p.half = p.stack.pop(); p.ep = p.stack.pop(); p.side = -p.side; p.hash = p.hist.pop(); }

  function legalMoves(p) {
    var all = gen(p, [], false), out = [], me = p.side;
    for (var i = 0; i < all.length; i++) {
      make(p, all[i]);
      if (!attacked(p.b, p.kings[me > 0 ? 0 : 1], -me)) out.push(all[i]);
      unmake(p);
    }
    return out;
  }
  function clone(p) {
    var c = new Pos(); c.b.set(p.b); c.side = p.side; c.castle = p.castle; c.ep = p.ep; c.half = p.half; c.full = p.full;
    c.kings = p.kings.slice(); c.hash = p.hash; c.hist = p.hist.slice(); c.stack = p.stack.slice();
    return c;
  }

  /* ---------- fins de partie ---------- */
  function repetitions(p) {
    var n = 0, h = p.hash, L = p.hist.length;
    for (var i = L - 2; i >= 0 && i >= L - p.half; i -= 2) if (p.hist[i] === h) n++;
    return n;
  }
  function insufficient(p) {
    var minors = 0, bishops = [0, 0], knights = 0;
    for (var s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      var t = Math.abs(p.b[s]);
      if (!t || t === K) continue;
      if (t === P || t === R || t === Q) return false;
      minors++;
      if (t === B) bishops[((s >> 4) + (s & 7)) & 1]++; else knights++;
    }
    if (minors <= 1) return true;
    return knights === 0 && (bishops[0] === 0 || bishops[1] === 0);
  }
  // le camp `side` a-t-il encore de quoi mater ? (pour la perte au temps)
  function canMate(p, side) {
    var n = 0;
    for (var s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      var pc = p.b[s]; if (!pc || (pc > 0) !== (side > 0)) continue;
      var t = Math.abs(pc);
      if (t === P || t === R || t === Q) return true;
      if (t === N || t === B) n++;
    }
    return n >= 2;
  }
  // { over, winner (1 blancs, -1 noirs, 0 nulle), reason }
  function status(p) {
    var moves = legalMoves(p);
    if (!moves.length) return inCheck(p) ? { over: true, winner: -p.side, reason: "mat" } : { over: true, winner: 0, reason: "pat" };
    if (insufficient(p)) return { over: true, winner: 0, reason: "matériel" };
    if (p.half >= 100) return { over: true, winner: 0, reason: "50 coups" };
    if (repetitions(p) >= 2) return { over: true, winner: 0, reason: "répétition" };
    return { over: false, check: inCheck(p), moves: moves };
  }

  /* ---------- notation ---------- */
  function san(p, m, legal) {
    legal = legal || legalMoves(p);
    var f = mFrom(m), t = mTo(m), fl = mFlag(m), pc = Math.abs(p.b[f]), s;
    if (fl & CASTLE) s = t > f ? "O-O" : "O-O-O";
    else {
      var capture = !!(fl & CAP);
      if (pc === P) s = (capture ? "abcdefgh".charAt(f & 7) + "x" : "") + sqName(t) + (mPromo(m) ? "=" + LETTER.charAt(mPromo(m)) : "");
      else {
        var amb = false, sameFile = false, sameRank = false;
        for (var i = 0; i < legal.length; i++) {
          var o = legal[i], of = mFrom(o);
          if (o !== m && mTo(o) === t && of !== f && Math.abs(p.b[of]) === pc) {
            amb = true; if ((of & 7) === (f & 7)) sameFile = true; if ((of >> 4) === (f >> 4)) sameRank = true;
          }
        }
        var dis = "";
        if (amb) dis = !sameFile ? "abcdefgh".charAt(f & 7) : !sameRank ? String((f >> 4) + 1) : sqName(f);
        s = LETTER.charAt(pc) + dis + (capture ? "x" : "") + sqName(t);
      }
    }
    make(p, m);
    if (inCheck(p)) s += legalMoves(p).length ? "+" : "#";
    unmake(p);
    return s;
  }
  function findUCI(p, uci, legal) {
    legal = legal || legalMoves(p);
    for (var i = 0; i < legal.length; i++) if (toUCI(legal[i]) === uci) return legal[i];
    // promotion sans lettre → dame
    for (var j = 0; j < legal.length; j++) if (toUCI(legal[j]) === uci + "q") return legal[j];
    return 0;
  }
  function perft(p, d) {
    if (d === 0) return 1;
    var ms = gen(p, [], false), n = 0, me = p.side;
    for (var i = 0; i < ms.length; i++) {
      make(p, ms[i]);
      if (!attacked(p.b, p.kings[me > 0 ? 0 : 1], -me)) n += perft(p, d - 1);
      unmake(p);
    }
    return n;
  }

  /* =====================================================================
     ÉVALUATION — matériel + tables de position (vue des blancs, 8e rangée en haut)
     ===================================================================== */
  var VAL = [0, 100, 320, 330, 500, 900, 0];
  var PST = [null,
    [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20]
  ];
  var KING_EG = [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50];
  var PAWN_EG = [0, 0, 0, 0, 0, 0, 0, 0, 90, 90, 90, 90, 90, 90, 90, 90, 50, 50, 50, 50, 50, 50, 50, 50, 30, 30, 30, 30, 30, 30, 30, 30, 15, 15, 15, 15, 15, 15, 15, 15, 5, 5, 5, 5, 5, 5, 5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  var PHASE = [0, 0, 1, 1, 2, 4, 0];

  // score du point de vue des blancs
  function evaluate(p) {
    var b = p.b, mg = 0, eg = 0, phase = 0, bish = [0, 0];
    for (var s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      var pc = b[s]; if (!pc) continue;
      var t = pc > 0 ? pc : -pc, r = s >> 4, f = s & 7;
      var idx = pc > 0 ? (7 - r) * 8 + f : r * 8 + f, sg = pc > 0 ? 1 : -1;
      phase += PHASE[t];
      if (t === K) { mg += sg * PST[K][idx]; eg += sg * KING_EG[idx]; continue; }
      var v = VAL[t] + PST[t][idx];
      mg += sg * v; eg += sg * (t === P ? v + PAWN_EG[idx] : v);
      if (t === B) bish[pc > 0 ? 0 : 1]++;
    }
    if (bish[0] >= 2) { mg += 30; eg += 40; }
    if (bish[1] >= 2) { mg -= 30; eg -= 40; }
    if (phase > 24) phase = 24;
    var sc = (mg * phase + eg * (24 - phase)) / 24;
    // finale : pousser le roi adverse dans un coin quand on mène largement
    if (phase <= 6 && Math.abs(sc) > 300) {
      var win = sc > 0 ? 1 : -1, ek = p.kings[win > 0 ? 1 : 0], mk = p.kings[win > 0 ? 0 : 1];
      var cd = Math.max(3 - (ek >> 4), (ek >> 4) - 4) + Math.max(3 - (ek & 7), (ek & 7) - 4);
      var kd = Math.abs((ek >> 4) - (mk >> 4)) + Math.abs((ek & 7) - (mk & 7));
      sc += win * (cd * 10 + (14 - kd) * 4);
    }
    return sc | 0;
  }

  /* =====================================================================
     RECHERCHE — alpha-bêta, approfondissement, table de transposition,
     coups tueurs, historique, coup nul, réductions tardives, recherche de calme
     ===================================================================== */
  var MATE = 30000, INF = 32000;
  var TT_BITS = 19, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
  var ttKey = new Int32Array(TT_SIZE), ttMove = new Int32Array(TT_SIZE), ttScore = new Int32Array(TT_SIZE);
  var ttDepth = new Int8Array(TT_SIZE), ttFlag = new Int8Array(TT_SIZE);
  var EXACT = 1, LOWER = 2, UPPER = 3;
  var S = { nodes: 0, stop: false, deadline: 0, killers: [], hist: new Int32Array(64 * 128), useQ: true };

  function timeUp() { if ((S.nodes & 1023) === 0 && S.deadline && Date.now() > S.deadline) S.stop = true; return S.stop; }
  function orderScore(p, m, ttm, ply) {
    if (m === ttm) return 2000000;
    var fl = m >> 17, pr = (m >> 14) & 7;
    if (fl & CAP) { var vic = fl & EP ? 1 : Math.abs(p.b[(m >> 7) & 127]); return 1000000 + vic * 100 - Math.abs(p.b[m & 127]) + (pr ? 500 : 0); }
    if (pr) return 900000 + pr;
    var k = S.killers[ply];
    if (k) { if (k[0] === m) return 800000; if (k[1] === m) return 790000; }
    return S.hist[(Math.abs(p.b[m & 127]) * 128 + ((m >> 7) & 127)) & 8191];
  }
  function pickNext(ms, sc, i) {
    var best = i;
    for (var j = i + 1; j < ms.length; j++) if (sc[j] > sc[best]) best = j;
    if (best !== i) { var t = ms[i]; ms[i] = ms[best]; ms[best] = t; var u = sc[i]; sc[i] = sc[best]; sc[best] = u; }
    return ms[i];
  }
  function quiesce(p, alpha, beta, ply) {
    S.nodes++;
    if (timeUp()) return 0;
    var stand = evaluate(p) * p.side;
    if (!S.useQ || ply > 60) return stand;
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    var ms = gen(p, [], true), sc = [], me = p.side, i;
    for (i = 0; i < ms.length; i++) sc.push(orderScore(p, ms[i], 0, ply));
    for (i = 0; i < ms.length; i++) {
      var m = pickNext(ms, sc, i);
      // élagage delta : même en gagnant la pièce, on reste trop loin
      if (!((m >> 14) & 7)) { var vic = (m >> 17) & EP ? 100 : VAL[Math.abs(p.b[(m >> 7) & 127])]; if (stand + vic + 200 < alpha) continue; }
      make(p, m);
      if (attacked(p.b, p.kings[me > 0 ? 0 : 1], -me)) { unmake(p); continue; }
      var v = -quiesce(p, -beta, -alpha, ply + 1);
      unmake(p);
      if (S.stop) return 0;
      if (v >= beta) return v;
      if (v > alpha) alpha = v;
    }
    return alpha;
  }
  function hasPieces(p, s) {
    for (var q = 0; q < 128; q++) { if (q & 0x88) { q += 7; continue; } var pc = p.b[q] * s; if (pc > 1 && pc < 6) return true; }
    return false;
  }
  function isRep(p) {
    var h = p.hash, L = p.hist.length;
    for (var i = L - 2; i >= 0 && i >= L - p.half; i -= 2) if (p.hist[i] === h) return true;
    return false;
  }
  function search(p, depth, alpha, beta, ply, allowNull) {
    if (ply > 0) {
      if (p.half >= 100 || isRep(p)) return 0;
      // distance au mat
      var ma = -MATE + ply; if (alpha < ma) alpha = ma;
      var mb = MATE - ply - 1; if (beta > mb) beta = mb;
      if (alpha >= beta) return alpha;
    }
    var me = p.side, chk = attacked(p.b, p.kings[me > 0 ? 0 : 1], -me);
    if (chk && ply < 40) depth++;
    if (depth <= 0) return quiesce(p, alpha, beta, ply);
    S.nodes++;
    if (timeUp()) return 0;
    var pv = beta - alpha > 1;
    var slot = p.hash & TT_MASK, ttm = 0;
    if (ttKey[slot] === p.hash) {
      ttm = ttMove[slot];
      if (ply > 0 && !pv && ttDepth[slot] >= depth) {
        var ts = ttScore[slot]; if (ts > MATE - 200) ts -= ply; else if (ts < -MATE + 200) ts += ply;
        var tf = ttFlag[slot];
        if (tf === EXACT || (tf === LOWER && ts >= beta) || (tf === UPPER && ts <= alpha)) return ts;
      }
    }
    // coup nul
    if (allowNull && !chk && !pv && depth >= 3 && ply > 0 && hasPieces(p, me) && evaluate(p) * me >= beta) {
      makeNull(p);
      var nv = -search(p, depth - 3, -beta, -beta + 1, ply + 1, false);
      unmakeNull(p);
      if (S.stop) return 0;
      if (nv >= beta && nv < MATE - 200) return beta;
    }
    var ms = gen(p, [], false), sc = [], i;
    for (i = 0; i < ms.length; i++) sc.push(orderScore(p, ms[i], ttm, ply));
    var best = -INF, bestM = 0, legal = 0, a0 = alpha;
    for (i = 0; i < ms.length; i++) {
      var m = pickNext(ms, sc, i);
      make(p, m);
      if (attacked(p.b, p.kings[me > 0 ? 0 : 1], -me)) { unmake(p); continue; }
      legal++;
      var quiet = !((m >> 17) & CAP) && !((m >> 14) & 7), v;
      if (legal === 1) v = -search(p, depth - 1, -beta, -alpha, ply + 1, true);
      else {
        var red = 0;
        if (quiet && !chk && depth >= 3 && legal > 4 && !attacked(p.b, p.kings[me > 0 ? 1 : 0], me)) red = legal > 10 ? 2 : 1;
        v = -search(p, depth - 1 - red, -alpha - 1, -alpha, ply + 1, true);
        if (v > alpha && red) v = -search(p, depth - 1, -alpha - 1, -alpha, ply + 1, true);
        if (v > alpha && v < beta) v = -search(p, depth - 1, -beta, -alpha, ply + 1, true);
      }
      unmake(p);
      if (S.stop) return 0;
      if (v > best) { best = v; bestM = m; }
      if (v > alpha) alpha = v;
      if (alpha >= beta) {
        if (quiet) {
          var k = S.killers[ply] || (S.killers[ply] = [0, 0]);
          if (k[0] !== m) { k[1] = k[0]; k[0] = m; }
          var hi = (Math.abs(p.b[m & 127]) * 128 + ((m >> 7) & 127)) & 8191;
          S.hist[hi] += depth * depth; if (S.hist[hi] > 700000) for (var hh = 0; hh < S.hist.length; hh++) S.hist[hh] >>= 1;
        }
        break;
      }
    }
    if (!legal) return chk ? -MATE + ply : 0;
    var st = best; if (st > MATE - 200) st += ply; else if (st < -MATE + 200) st -= ply;
    ttKey[slot] = p.hash; ttMove[slot] = bestM; ttScore[slot] = st; ttDepth[slot] = depth;
    ttFlag[slot] = best >= beta ? LOWER : best > a0 ? EXACT : UPPER;
    return best;
  }

  /* ---------- petite bibliothèque d'ouvertures (variété pour les bots forts) ---------- */
  var BOOK = {
    "": ["e2e4", "e2e4", "d2d4", "d2d4", "c2c4", "g1f3"],
    "e2e4": ["e7e5", "e7e5", "c7c5", "c7c5", "e7e6", "c7c6"],
    "d2d4": ["d7d5", "g8f6", "g8f6", "e7e6"],
    "c2c4": ["e7e5", "g8f6", "c7c5"],
    "g1f3": ["d7d5", "g8f6", "c7c5"],
    "e2e4 e7e5": ["g1f3", "g1f3", "b1c3", "f1c4"],
    "e2e4 c7c5": ["g1f3", "b1c3", "c2c3"],
    "e2e4 e7e6": ["d2d4"],
    "e2e4 c7c6": ["d2d4"],
    "d2d4 d7d5": ["c2c4", "g1f3", "c1f4"],
    "d2d4 g8f6": ["c2c4", "g1f3"],
    "d2d4 e7e6": ["c2c4", "e2e4"],
    "e2e4 e7e5 g1f3": ["b8c6", "b8c6", "g8f6"],
    "e2e4 c7c5 g1f3": ["d7d6", "b8c6", "e7e6"],
    "e2e4 e7e6 d2d4": ["d7d5"],
    "e2e4 c7c6 d2d4": ["d7d5"],
    "d2d4 d7d5 c2c4": ["e7e6", "c7c6", "d5c4"],
    "d2d4 g8f6 c2c4": ["e7e6", "g7g6"],
    "e2e4 e7e5 g1f3 b8c6": ["f1b5", "f1c4", "d2d4"],
    "e2e4 e7e5 g1f3 b8c6 f1c4": ["f8c5", "g8f6"],
    "e2e4 e7e5 g1f3 b8c6 f1b5": ["a7a6", "g8f6"]
  };

  // trouve un coup. opts : { level (1..6) ou réglages, moves (historique UCI) }
  function think(p, lvl, history) {
    var L = typeof lvl === "object" ? lvl : LEVELS[Math.max(0, Math.min(LEVELS.length - 1, (lvl | 0) - 1))];
    var legal = legalMoves(p);
    if (!legal.length) return { move: 0, uci: null, score: 0, depth: 0 };
    if (legal.length === 1) return { move: legal[0], uci: toUCI(legal[0]), score: 0, depth: 0 };
    S.nodes = 0; S.stop = false; S.killers = []; S.useQ = L.q !== false;
    for (var hh = 0; hh < S.hist.length; hh++) S.hist[hh] >>= 2;

    if (L.book && history && history.length < 6) {
      var opts = BOOK[history.join(" ")];
      if (opts) { var bm = findUCI(p, opts[(Math.random() * opts.length) | 0], legal); if (bm) return { move: bm, uci: toUCI(bm), score: 0, depth: 0, book: true }; }
    }
    if (L.random && Math.random() < L.random) { var rm = legal[(Math.random() * legal.length) | 0]; return { move: rm, uci: toUCI(rm), score: 0, depth: 0, random: true }; }

    var best = legal[0], bestScore = -INF, depthDone = 0;
    if (L.time) {
      // approfondissement itératif avec limite de temps
      S.deadline = Date.now() + L.time;
      var maxD = L.maxDepth || 40;
      for (var d = 1; d <= maxD; d++) {
        var sc = search(p, d, -INF, INF, 0, false);
        if (S.stop && d > 1) break;
        var slot = p.hash & TT_MASK;
        if (ttKey[slot] === p.hash && ttMove[slot]) {
          var tm = ttMove[slot];
          if (legal.indexOf(tm) >= 0) { best = tm; bestScore = sc; depthDone = d; }
        }
        if (Math.abs(sc) > MATE - 200) break;
        if (Date.now() > S.deadline - L.time * 0.45) break;   // pas le temps de finir une itération de plus
      }
      S.deadline = 0;
    } else {
      // profondeur fixe : on note chaque coup puis on ajoute un peu de hasard
      S.deadline = 0;
      var D = L.depth || 1, scored = [];
      for (var i = 0; i < legal.length; i++) {
        make(p, legal[i]);
        var v = D <= 1 ? (S.useQ ? -quiesce(p, -INF, INF, 1) : -evaluate(p) * p.side) : -search(p, D - 1, -INF, INF, 1, true);
        unmake(p);
        scored.push(v);
      }
      for (var j = 0; j < legal.length; j++) {
        var n = scored[j] + (L.noise ? (Math.random() * 2 - 1) * L.noise : Math.random() * 4);
        if (n > bestScore) { bestScore = n; best = legal[j]; }
      }
      depthDone = D;
      bestScore = scored[legal.indexOf(best)];
    }
    return { move: best, uci: toUCI(best), score: bestScore, depth: depthDone, nodes: S.nodes };
  }

  // rejoue une partie depuis une liste de coups UCI
  function replay(moves, fen) {
    var p = fromFEN(fen || START);
    for (var i = 0; i < (moves || []).length; i++) {
      var m = findUCI(p, moves[i]);
      if (!m) break;
      make(p, m);
    }
    return p;
  }

  var API = {
    START: START, LEVELS: LEVELS, P: P, N: N, B: B, R: R, Q: Q, K: K,
    CAP: CAP, EP: EP, CASTLE: CASTLE,
    fromFEN: fromFEN, toFEN: toFEN, legalMoves: legalMoves, make: make, unmake: unmake, clone: clone,
    inCheck: inCheck, attacked: attacked, status: status, san: san, findUCI: findUCI, toUCI: toUCI,
    sqName: sqName, sqOf: sqOf, from: mFrom, to: mTo, promo: mPromo, flag: mFlag,
    evaluate: evaluate, think: think, replay: replay, perft: perft, canMate: canMate, insufficient: insufficient
  };

  // Web Worker : { id, moves, fen, level } → { id, uci, score, depth }
  var isWorker = typeof importScripts === "function" && typeof window === "undefined";
  if (isWorker) {
    root.onmessage = function (e) {
      var d = e.data || {};
      try {
        var p = replay(d.moves, d.fen), r = think(p, d.level, d.moves);
        root.postMessage({ id: d.id, uci: r.uci, score: r.score, depth: r.depth, nodes: r.nodes, book: !!r.book });
      } catch (err) { root.postMessage({ id: d.id, error: String(err) }); }
    };
  }
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.CHESS = API;
})(typeof self !== "undefined" ? self : this);
