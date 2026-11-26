/* =========================================================================
   QUELLE VIE ! — avatars vectoriels (SVG) en calques séparés
   visage · cheveux · corps · tenue · accessoires · expression
   La tenue et l'expression sont des paramètres de rendu : changer de métier
   ne régénère jamais le personnage.
   QV_AVATAR.svg(av, { outfit, mood, pose, hold, kid }) → <g>…</g> (repère 120×200)
   QV_AVATAR.random(seed) → avatar aléatoire reproductible (partenaires, enfants, collègues)
   ========================================================================= */
(function (root) {
  "use strict";
  var INK = "#2b2140";

  var SKINS = ["#ffe3cc", "#f8cfa8", "#eab48c", "#cf9165", "#a96d45", "#7c4c2f", "#55331f"];
  var HAIR_COLORS = ["#2a1d1a", "#5b3a29", "#8a4b2a", "#e3bc5e", "#c8552d", "#b9b4ae", "#f2efe9", "#ff7eb6", "#4f7cff", "#38b58a"];
  var EYE_COLORS = ["#3b2a20", "#5a87c9", "#4f8a4a", "#8a6a3a", "#2b2140"];
  var FAV = ["#ff6b4a", "#3d7dd8", "#2fa37a", "#9b5de5", "#ffd23f", "#e5487a", "#1f2a44", "#f08a24"];

  var OPTIONS = {
    face: [["round", "Rond"], ["oval", "Ovale"], ["square", "Carré"], ["long", "Allongé"], ["heart", "Menton pointu"]],
    hair: [["short", "Court"], ["buzz", "Rasé"], ["curly", "Bouclé"], ["long", "Long"], ["bun", "Chignon"], ["bald", "Chauve"], ["mohawk", "Crête"], ["afro", "Afro"], ["bob", "Carré plongeant"], ["ponytail", "Queue de cheval"], ["spiky", "En pétard"], ["side", "Mèche"]],
    eyes: [["round", "Ronds"], ["almond", "En amande"], ["sleepy", "Endormis"], ["wide", "Grands"], ["dots", "Petits points"]],
    brows: [["thin", "Fins"], ["thick", "Épais"], ["arched", "Arqués"], ["uni", "Monosourcil"]],
    nose: [["button", "Bouton"], ["long", "Long"], ["wide", "Large"], ["pointy", "Pointu"], ["big", "Patate"]],
    beard: [["none", "Aucune"], ["stubble", "Barbe de 3 jours"], ["beard", "Barbe"], ["moustache", "Moustache"], ["goatee", "Bouc"]],
    glasses: [["none", "Aucune"], ["round", "Rondes"], ["square", "Carrées"], ["sun", "Soleil"]],
    body: [["slim", "Fin"], ["regular", "Moyen"], ["round", "Généreux"]],
    extra: [["none", "Rien"], ["freckles", "Taches de rousseur"], ["blush", "Joues roses"], ["earrings", "Boucles d'oreilles"], ["mole", "Grain de beauté"]],
  };
  var COLORS = { skin: SKINS, hairColor: HAIR_COLORS, eyeColor: EYE_COLORS, fav: FAV };
  // Réglages fins mesurés sur la photo (1 = moyenne) : [min, max, défaut]
  var MORPHS = { faceW: [0.86, 1.16, 1], eyeGap: [0.8, 1.22, 1], eyeSize: [0.8, 1.28, 1], noseSize: [0.78, 1.4, 1], mouthW: [0.8, 1.3, 1], browY: [-4, 4, 0] };

  function defaults() {
    return { sx: "", skin: SKINS[2], face: "round", hair: "short", hairColor: HAIR_COLORS[1], eyes: "round", eyeColor: EYE_COLORS[0], brows: "thick", nose: "button", beard: "none", glasses: "none", body: "regular", extra: "none", fav: FAV[0] };
  }
  function sanitize(av) {
    var d = defaults(), o = {};
    av = av || {};
    var tr = sanitizeTrace(av.trace);
    if (tr) o.trace = tr;
    Object.keys(d).forEach(function (k) {
      var v = av[k];
      if (k === "sx") { o.sx = v === "m" || v === "f" || v === "x" ? v : ""; return; }
      if ((k === "face" || k === "hair") && v === "photo" && tr && (k === "face" || tr.hb || tr.hf)) { o[k] = "photo"; return; }
      if (OPTIONS[k]) o[k] = OPTIONS[k].some(function (x) { return x[0] === v; }) ? v : d[k];
      else o[k] = (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v)) ? v : d[k];
    });
    Object.keys(MORPHS).forEach(function (k) {
      var m = MORPHS[k], v = +av[k];
      o[k] = isFinite(v) && av[k] !== undefined && av[k] !== null ? Math.round(Math.max(m[0], Math.min(m[1], v)) * 100) / 100 : m[2];
    });
    return o;
  }
  // ---------- portrait tracé depuis la photo (voir qv-face.js) ----------
  var TR_KEYS = { face: [20, 80], eA: [16, 40], eB: [16, 40], bA: [8, 24], bB: [8, 24], lips: [16, 48], ns: [4, 16], nb: [6, 20], hb: [6, 320], hf: [6, 320], iA: [3, 3], iB: [3, 3], ears: [4, 4] };
  function sanitizeTrace(t) {
    if (!t || typeof t !== "object" || !Array.isArray(t.face)) return null;
    var o = { v: 1 };
    for (var k in TR_KEYS) {
      var a = t[k]; if (!Array.isArray(a)) continue;
      if (a.length < TR_KEYS[k][0] || a.length > TR_KEYS[k][1] || a.length % 2 && k !== "iA" && k !== "iB") continue;
      var ok = a.every(function (v) { return typeof v === "number" && isFinite(v) && v > -220 && v < 320; });
      if (ok) o[k] = a.map(function (v) { return Math.round(v * 10) / 10; });
    }
    if (typeof t.mo === "number" && isFinite(t.mo)) o.mo = Math.max(0, Math.min(1, t.mo));
    ["lc", "bc"].forEach(function (k) { if (typeof t[k] === "string" && /^#[0-9a-f]{6}$/i.test(t[k])) o[k] = t[k]; });
    if (!o.face || !o.eA || !o.eB || !o.lips) return null;
    return o;
  }
  function pairs(a) { var o = []; for (var i = 0; i + 1 < a.length; i += 2) o.push([a[i], a[i + 1]]); return o; }
  // courbe lissée (Catmull-Rom → Bézier)
  function smooth(pts, closed) {
    if (pts.length < 3) return "";
    var n = pts.length, d = "M" + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
    var get = function (i) { return closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]; };
    for (var i = 0; i < (closed ? n : n - 1); i++) {
      var p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      d += " C" + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + " " + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + " " + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + " " + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + " " + p2[0].toFixed(1) + " " + p2[1].toFixed(1);
    }
    return d + (closed ? "Z" : "");
  }
  function centroid(pts) { var x = 0, y = 0; pts.forEach(function (p) { x += p[0]; y += p[1]; }); return [x / pts.length, y / pts.length]; }
  function scaleAround(pts, c, kx, ky) { return pts.map(function (p) { return [c[0] + (p[0] - c[0]) * kx, c[1] + (p[1] - c[1]) * ky]; }); }
  var clipN = 0;
  function traceHairBack(av) {
    var t = av.trace; if (!t || av.hair !== "photo" || !t.hb) return "";
    return '<path d="' + smooth(pairs(t.hb), true) + '" fill="' + av.hairColor + '"' + S + '/>';
  }
  function traceHead(av, mood, opts) {
    var t = av.trace, o = "", skin = av.skin, sd = shade(skin, -0.18);
    var face = pairs(t.face);
    // oreilles
    if (t.ears) {
      var e = t.ears, er = Math.max(6, (e[2] - e[0]) * 0.09);
      o += '<ellipse cx="' + (e[0] + 1) + '" cy="' + (e[1] + 4) + '" rx="' + (er * 0.8).toFixed(1) + '" ry="' + (er * 1.2).toFixed(1) + '" fill="' + skin + '"' + S + '/><ellipse cx="' + (e[2] - 1) + '" cy="' + (e[3] + 4) + '" rx="' + (er * 0.8).toFixed(1) + '" ry="' + (er * 1.2).toFixed(1) + '" fill="' + skin + '"' + S + '/>';
    }
    o += '<path d="' + smooth(face, true) + '" fill="' + skin + '"' + S + '/>';
    // barbe : construite sur la vraie mâchoire
    var lips = pairs(t.lips), mc = centroid(lips), mw = Math.abs(lips[10][0] - lips[0][0]);
    var hc = av.hairColor === "#f2efe9" ? "#d9d5cf" : av.hairColor;
    if (av.beard === "beard" || av.beard === "stubble") {
      var low = face.filter(function (p) { return p[1] > mc[1] - 10; });
      low.sort(function (a, b) { return Math.atan2(a[1] - mc[1], a[0] - mc[0]) - Math.atan2(b[1] - mc[1], b[0] - mc[0]); });
      var top = [[mc[0] + mw * 0.9, mc[1] - 6], [mc[0], mc[1] - 9], [mc[0] - mw * 0.9, mc[1] - 6]];
      var poly = low.reverse().concat(top);
      o += '<path d="' + smooth(poly, true) + '" fill="' + hc + '"' + (av.beard === "stubble" ? ' opacity=".35"' : S) + '/>';
    }
    // nez
    if (t.ns) o += '<path d="' + smooth(pairs(t.ns).slice(2), false) + '" fill="none" stroke="' + sd + '" stroke-width="2.6" stroke-linecap="round"/>';
    if (t.nb) o += '<path d="' + smooth(pairs(t.nb), false) + '" fill="none"' + S.replace('3"', '2.6"') + '/>';
    if (av.beard === "moustache" || av.beard === "goatee" || av.beard === "beard") {
      var ny = t.nb ? pairs(t.nb)[3][1] : mc[1] - 10;
      o += '<path d="M' + (mc[0] - mw * 0.7).toFixed(1) + ' ' + (mc[1] - 1).toFixed(1) + ' Q' + mc[0].toFixed(1) + ' ' + (ny - 1).toFixed(1) + ' ' + (mc[0] + mw * 0.7).toFixed(1) + ' ' + (mc[1] - 1).toFixed(1) + ' Q' + mc[0].toFixed(1) + ' ' + (mc[1] - 3).toFixed(1) + ' ' + (mc[0] - mw * 0.7).toFixed(1) + ' ' + (mc[1] - 1).toFixed(1) + 'Z" fill="' + hc + '"' + S.replace('3"', '2"') + '/>';
    }
    if (av.beard === "goatee") o += '<path d="M' + (mc[0] - mw * 0.25).toFixed(1) + ' ' + (mc[1] + 7).toFixed(1) + ' Q' + mc[0].toFixed(1) + ' ' + (mc[1] + 20).toFixed(1) + ' ' + (mc[0] + mw * 0.25).toFixed(1) + ' ' + (mc[1] + 7).toFixed(1) + 'Z" fill="' + hc + '"' + S.replace('3"', '2"') + '/>';
    // bouche : vraies lèvres au repos, expressions redessinées à la bonne taille
    var w2 = mw / 2;
    if (mood === "neutral" || mood === "smug" || mood === "worried") {
      var lipsRest = (t.mo || 0) > 0.18 ? scaleAround(lips, mc, 0.9, 0.42) : lips; // photo bouche ouverte : on la referme au repos
      o += '<path d="' + smooth(lipsRest, true) + '" fill="' + (t.lc || "#c96a6a") + '"' + S.replace('3"', '2.2"') + '/>';
      o += '<path d="M' + (mc[0] - w2 * 0.9).toFixed(1) + ' ' + mc[1].toFixed(1) + ' Q' + mc[0].toFixed(1) + ' ' + (mc[1] + (mood === "worried" ? -2 : 1.5)).toFixed(1) + ' ' + (mc[0] + w2 * 0.9).toFixed(1) + ' ' + (mc[1] - (mood === "smug" ? 3 : 0)).toFixed(1) + '" fill="none" stroke="' + INK + '" stroke-width="1.8"/>';
    } else if (mood === "happy" || mood === "love") {
      o += '<path d="M' + (mc[0] - w2 * 1.1).toFixed(1) + ' ' + (mc[1] - 2).toFixed(1) + ' Q' + mc[0].toFixed(1) + ' ' + (mc[1] + w2 * 1.3).toFixed(1) + ' ' + (mc[0] + w2 * 1.1).toFixed(1) + ' ' + (mc[1] - 2).toFixed(1) + 'Z" fill="#8a2a3a"' + S.replace('3"', '2.6"') + '/>';
      o += '<path d="M' + (mc[0] - w2 * 0.5).toFixed(1) + ' ' + (mc[1] + w2 * 0.45).toFixed(1) + ' Q' + mc[0].toFixed(1) + ' ' + (mc[1] + w2 * 0.85).toFixed(1) + ' ' + (mc[0] + w2 * 0.5).toFixed(1) + ' ' + (mc[1] + w2 * 0.45).toFixed(1) + '" fill="#ff8a9a"/>';
    } else if (mood === "sad") {
      o += '<path d="M' + (mc[0] - w2 * 0.9).toFixed(1) + ' ' + (mc[1] + 4).toFixed(1) + ' Q' + mc[0].toFixed(1) + ' ' + (mc[1] - 5).toFixed(1) + ' ' + (mc[0] + w2 * 0.9).toFixed(1) + ' ' + (mc[1] + 4).toFixed(1) + '" fill="none"' + S + '/>';
    } else if (mood === "shocked") {
      o += '<ellipse cx="' + mc[0].toFixed(1) + '" cy="' + (mc[1] + 2).toFixed(1) + '" rx="' + (w2 * 0.45).toFixed(1) + '" ry="' + (w2 * 0.65).toFixed(1) + '" fill="#8a2a3a"' + S.replace('3"', '2.6"') + '/>';
    } else if (mood === "angry") {
      o += '<rect x="' + (mc[0] - w2 * 0.85).toFixed(1) + '" y="' + (mc[1] - 4).toFixed(1) + '" width="' + (w2 * 1.7).toFixed(1) + '" height="9" rx="3" fill="#fff"' + S.replace('3"', '2.4"') + '/><path d="M' + (mc[0] - w2 * 0.85).toFixed(1) + ' ' + (mc[1] + 0.5).toFixed(1) + ' h' + (w2 * 1.7).toFixed(1) + '" stroke="' + INK + '" stroke-width="1.6"/>';
    }
    // yeux : vraie forme, agrandie façon cartoon, animée selon l'humeur
    var eyeK = 1.55;
    [[t.eA, t.iA], [t.eB, t.iB]].forEach(function (pair, idx) {
      var pts = pairs(pair[0]), c = centroid(pts);
      var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
      var ew = Math.max.apply(null, xs) - Math.min.apply(null, xs), eh = Math.max.apply(null, ys) - Math.min.apply(null, ys);
      // proportions cartoon : on garde la forme mais on ouvre l'œil (hauteur ≥ 60 % de la largeur)
      var open = Math.max(1, Math.min(2.8, 0.6 / Math.max(0.15, eh / Math.max(1, ew))));
      var ir = Math.min(ew * eyeK * 0.3, eh * eyeK * open * 0.45);
      var ic = pair[1] ? [c[0] + (pair[1][0] - c[0]) * 0.8, c[1] + (pair[1][1] - c[1]) * 0.8] : c;
      if (mood === "love") { o += '<path d="M' + c[0].toFixed(1) + ' ' + (c[1] + 5).toFixed(1) + ' l-7 -7 a4 4 0 0 1 7 -4 a4 4 0 0 1 7 4 z" fill="#e5487a" stroke="' + INK + '" stroke-width="2"/>'; return; }
      if (mood === "happy") {
        var hw = ew / 2 * eyeK;
        o += '<path d="M' + (c[0] - hw).toFixed(1) + ' ' + (c[1] + 2).toFixed(1) + ' Q' + c[0].toFixed(1) + ' ' + (c[1] - hw * 0.9).toFixed(1) + ' ' + (c[0] + hw).toFixed(1) + ' ' + (c[1] + 2).toFixed(1) + '" fill="none"' + S + '/>';
        return;
      }
      var ky = eyeK * open * (mood === "shocked" ? 1.35 : 1);
      var shape = scaleAround(pts, c, eyeK * (mood === "shocked" ? 1.1 : 1), ky), id = "qvc" + (++clipN);
      o += '<clipPath id="' + id + '"><path d="' + smooth(shape, true) + '"/></clipPath>';
      o += '<path d="' + smooth(shape, true) + '" fill="#fff"/>';
      o += '<g clip-path="url(#' + id + ')"><circle cx="' + ic[0].toFixed(1) + '" cy="' + ic[1].toFixed(1) + '" r="' + (ir * (mood === "shocked" ? 0.7 : 1)).toFixed(1) + '" fill="' + av.eyeColor + '"/><circle cx="' + ic[0].toFixed(1) + '" cy="' + ic[1].toFixed(1) + '" r="' + (ir * 0.5).toFixed(1) + '" fill="' + INK + '"/><circle cx="' + (ic[0] + ir * 0.35).toFixed(1) + '" cy="' + (ic[1] - ir * 0.35).toFixed(1) + '" r="' + (ir * 0.25).toFixed(1) + '" fill="#fff"/>';
      if (mood === "smug" || mood === "angry") o += '<rect x="' + (c[0] - 20) + '" y="' + (c[1] - 20) + '" width="40" height="' + (20 - 1) + '" fill="' + skin + '"/>';
      o += '</g><path d="' + smooth(shape, true) + '" fill="none" stroke="' + INK + '" stroke-width="2.4"/>';
      if (mood === "sad" && idx === 1) o += '<path d="M' + (c[0] + 4).toFixed(1) + ' ' + (c[1] + 7).toFixed(1) + ' q3 6 0 9 q-3 -3 0 -9z" fill="#7cc4ff" stroke="' + INK + '" stroke-width="1.6"/>';
    });
    // sourcils : vraie forme, inclinés selon l'humeur
    var bc = t.bc || shade(av.hairColor, -0.1);
    [t.bA, t.bB].forEach(function (b, idx) {
      if (!b) return;
      var pts = pairs(b), c = centroid(pts), inner = idx === 0 ? 1 : -1; // côté nez
      var rot = mood === "sad" || mood === "worried" ? -14 * inner : mood === "angry" ? 16 * inner : 0;
      var dy = mood === "shocked" ? -5 : mood === "smug" && idx === 1 ? -3 : 0;
      o += '<path transform="translate(0 ' + dy + ') rotate(' + rot + ' ' + c[0].toFixed(1) + ' ' + c[1].toFixed(1) + ')" d="' + smooth(scaleAround(pts, c, 1.05, 1.5), true) + '" fill="' + bc + '" stroke="' + INK + '" stroke-width="1.4"/>';
    });
    // lunettes centrées sur les vrais yeux
    var gl = opts.shades ? "sun" : (opts.forceShades ? "sun" : av.glasses);
    if (gl && gl !== "none" && t.iA && t.iB) {
      var a = pairs(t.eA), b2 = pairs(t.eB), ca = centroid(a), cb = centroid(b2);
      var rr = Math.max(8, Math.abs(cb[0] - ca[0]) * 0.36), fill = gl === "sun" ? "#1f1b2e" : "rgba(255,255,255,.15)";
      o += '<g fill="' + fill + '" stroke="' + INK + '" stroke-width="3">' + (gl === "square"
        ? '<rect x="' + (ca[0] - rr).toFixed(1) + '" y="' + (ca[1] - rr * 0.75).toFixed(1) + '" width="' + (rr * 2).toFixed(1) + '" height="' + (rr * 1.5).toFixed(1) + '" rx="4"/><rect x="' + (cb[0] - rr).toFixed(1) + '" y="' + (cb[1] - rr * 0.75).toFixed(1) + '" width="' + (rr * 2).toFixed(1) + '" height="' + (rr * 1.5).toFixed(1) + '" rx="4"/>'
        : '<circle cx="' + ca[0].toFixed(1) + '" cy="' + ca[1].toFixed(1) + '" r="' + rr.toFixed(1) + '"/><circle cx="' + cb[0].toFixed(1) + '" cy="' + cb[1].toFixed(1) + '" r="' + rr.toFixed(1) + '"/>') +
        '<path d="M' + (Math.min(ca[0], cb[0]) + rr).toFixed(1) + ' ' + ((ca[1] + cb[1]) / 2).toFixed(1) + ' H' + (Math.max(ca[0], cb[0]) - rr).toFixed(1) + '"/></g>';
    }
    if (opts.disguise) o += '<path d="M' + (mc[0] - mw * 0.7).toFixed(1) + ' ' + (mc[1] - 4).toFixed(1) + ' Q' + mc[0].toFixed(1) + ' ' + (mc[1] - 12).toFixed(1) + ' ' + (mc[0] + mw * 0.7).toFixed(1) + ' ' + (mc[1] - 4).toFixed(1) + ' Q' + mc[0].toFixed(1) + ' ' + (mc[1] - 1).toFixed(1) + ' ' + (mc[0] - mw * 0.7).toFixed(1) + ' ' + (mc[1] - 4).toFixed(1) + 'Z" fill="#2a1d1a"/>';
    if (opts.liar && t.nb) { var tip = pairs(t.nb)[3]; o += '<path d="M' + tip[0] + ' ' + (tip[1] - 6) + ' L' + (tip[0] + 22) + ' ' + (tip[1] - 3) + ' L' + tip[0] + ' ' + tip[1] + 'Z" fill="' + sd + '"' + S.replace('3"', '2.2"') + '/>'; }
    // mèches sur le front (devant le visage)
    if (av.hair === "photo" && t.hf) o += '<path d="' + smooth(pairs(t.hf), true) + '" fill="' + av.hairColor + '"' + S + '/>';
    return o;
  }

  function rng(seed) {
    var s = (seed >>> 0) || 7;
    return function () { s = (s + 0x6d2b79f5) | 0; var t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // genre de présentation d'un personnage : choix du joueur, sinon déduit de l'apparence (barbe, coiffure, boucles d'oreilles)
  function sexOf(av) {
    av = av || {};
    if (av.sx === "m" || av.sx === "f" || av.sx === "x") return av.sx;
    if (av.beard && av.beard !== "none") return "m";
    if (["long", "bun", "bob", "ponytail"].indexOf(av.hair) >= 0 || av.extra === "earrings") return "f";
    return "x";
  }
  var HAIR_BY_SEX = {
    m: ["short", "short", "short", "buzz", "buzz", "curly", "side", "side", "afro", "spiky", "bald", "mohawk"],
    f: ["long", "long", "long", "bob", "bob", "bun", "ponytail", "ponytail", "curly", "afro", "side", "short"],
  };
  function random(seed, base, sx) {
    var r = rng(seed), pick = function (a) { return a[Math.floor(r() * a.length)]; };
    if (sx !== "m" && sx !== "f") sx = "";
    var av = {
      sx: sx, skin: pick(SKINS), face: pick(OPTIONS.face)[0], hair: sx ? pick(HAIR_BY_SEX[sx]) : pick(OPTIONS.hair)[0], hairColor: pick(HAIR_COLORS.slice(0, 7)),
      eyes: pick(OPTIONS.eyes)[0], eyeColor: pick(EYE_COLORS), brows: pick(OPTIONS.brows)[0], nose: pick(OPTIONS.nose)[0],
      beard: sx === "f" ? "none" : r() < (sx === "m" ? 0.4 : 0.3) ? pick(OPTIONS.beard)[0] : "none", glasses: r() < 0.25 ? pick(["round", "square"]) : "none",
      body: sx === "f" ? pick(["slim", "regular", "regular", "round"]) : pick(OPTIONS.body)[0],
      extra: sx === "m" ? (r() < 0.3 ? pick(["freckles", "mole"]) : "none") : sx === "f" ? (r() < 0.5 ? pick(["freckles", "blush", "earrings", "earrings", "mole"]) : "none") : (r() < 0.4 ? pick(OPTIONS.extra)[0] : "none"), fav: pick(FAV),
    };
    if (base) { // enfant : hérite de la peau et parfois des cheveux d'un parent
      av.skin = r() < 0.5 ? base.skin : av.skin;
      if (r() < 0.6) av.hairColor = base.hairColor;
      av.beard = "none"; av.glasses = "none";
    }
    return av;
  }

  // ---------- pièces ----------
  function headShape(f) {
    switch (f) {
      case "oval": return { d: "M60 18 C83 18 93 38 93 60 C93 86 79 100 60 100 C41 100 27 86 27 60 C27 38 37 18 60 18Z", w: 33, jaw: 92 };
      case "square": return { d: "M38 22 H82 Q96 22 96 38 V78 Q96 98 76 99 H44 Q24 98 24 78 V38 Q24 22 38 22Z", w: 36, jaw: 96 };
      case "long": return { d: "M60 14 C80 14 89 34 89 58 C89 88 77 102 60 102 C43 102 31 88 31 58 C31 34 40 14 60 14Z", w: 29, jaw: 96 };
      case "heart": return { d: "M60 20 C86 20 96 38 95 58 C94 80 74 100 60 101 C46 100 26 80 25 58 C24 38 34 20 60 20Z", w: 35, jaw: 94 };
      default: return { d: "M60 20 C84 20 96 37 96 60 C96 84 82 98 60 98 C38 98 24 84 24 60 C24 37 36 20 60 20Z", w: 36, jaw: 92 };
    }
  }
  function shade(hex, k) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    var f = function (c) { return Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k))); };
    return "#" + ((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1);
  }
  var S = ' stroke="' + INK + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';

  function hairBack(av) {
    var c = av.hairColor;
    switch (av.hair) {
      case "long": return '<path d="M24 52 C20 90 22 118 30 132 H90 C98 118 100 90 96 52 Z" fill="' + c + '"' + S + '/>';
      case "afro": return '<circle cx="60" cy="50" r="46" fill="' + c + '"' + S + '/>';
      case "bob": return '<path d="M22 56 C20 82 24 96 34 100 H86 C96 96 100 82 98 56 Z" fill="' + c + '"' + S + '/>';
      case "ponytail": return '<path d="M90 40 C112 44 112 84 100 104 C96 86 96 64 88 52 Z" fill="' + c + '"' + S + '/>';
      case "bun": return '<circle cx="60" cy="14" r="13" fill="' + c + '"' + S + '/>';
      default: return "";
    }
  }
  function hairFront(av) {
    var c = av.hairColor, hi = shade(c, 0.25);
    switch (av.hair) {
      case "short": return '<path d="M26 54 C24 30 40 16 60 16 C82 16 97 30 94 54 C86 40 74 34 60 36 C46 34 34 42 26 54Z" fill="' + c + '"' + S + '/>';
      case "buzz": return '<path d="M28 48 C30 28 44 20 60 20 C76 20 90 28 92 48 C80 38 40 38 28 48Z" fill="' + c + '" opacity=".85"' + S + '/>';
      case "curly": return '<g fill="' + c + '"' + S + '><circle cx="34" cy="40" r="11"/><circle cx="48" cy="27" r="12"/><circle cx="64" cy="23" r="12"/><circle cx="80" cy="30" r="12"/><circle cx="89" cy="44" r="10"/><circle cx="27" cy="54" r="8"/><circle cx="93" cy="57" r="7"/></g>';
      case "long": return '<path d="M25 64 C20 30 40 15 60 15 C82 15 100 30 95 64 C90 46 80 34 62 32 C56 44 40 50 25 64Z" fill="' + c + '"' + S + '/>';
      case "bun": return '<path d="M27 52 C26 30 42 20 60 20 C78 20 94 30 93 52 C84 38 36 38 27 52Z" fill="' + c + '"' + S + '/>';
      case "bald": return '<path d="M44 28 Q52 24 58 26" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".6"/>';
      case "mohawk": return '<path d="M52 36 L48 6 L58 18 L62 2 L68 18 L76 8 L70 38 Z" fill="' + c + '"' + S + '/>';
      case "afro": return '<path d="M30 50 C34 34 46 30 60 30 C74 30 86 34 90 50" fill="none" stroke="' + shade(c, -0.25) + '" stroke-width="4"/>';
      case "bob": return '<path d="M23 62 C20 30 40 16 60 16 C82 16 100 30 97 62 C90 52 84 40 74 34 C60 44 40 46 23 62Z" fill="' + c + '"' + S + '/>';
      case "ponytail": return '<path d="M26 52 C25 30 42 18 60 18 C80 18 95 30 94 52 C86 38 76 32 60 33 C46 33 34 40 26 52Z" fill="' + c + '"' + S + '/><circle cx="92" cy="44" r="5" fill="' + FAV[3] + '"' + S + '/>';
      case "spiky": return '<path d="M26 54 L22 36 L34 38 L32 20 L46 28 L52 10 L62 26 L74 12 L78 30 L92 22 L90 40 L98 46 L94 54 C80 40 40 40 26 54Z" fill="' + c + '"' + S + '/>';
      case "side": return '<path d="M26 56 C22 30 40 16 62 16 C84 16 98 30 94 52 C80 46 62 40 46 30 C42 42 34 50 26 56Z" fill="' + c + '"' + S + '/><path d="M50 26 Q60 32 72 30" stroke="' + hi + '" stroke-width="3" fill="none"/>';
      default: return "";
    }
  }
  function eyes(av, mood) {
    var gp = av.eyeGap || 1, es = av.eyeSize || 1;
    var L = 60 - 13 * gp, R = 60 + 13 * gp, y = 58, c = av.eyeColor, o = "";
    var t = av.eyes;
    if (mood === "shocked") t = "wide";
    if (mood === "love") {
      var h = function (x) { return '<path d="M' + x.toFixed(1) + ' ' + (y + 5) + ' l-7 -7 a4 4 0 0 1 7 -4 a4 4 0 0 1 7 4 z" fill="#e5487a" stroke="' + INK + '" stroke-width="2"/>'; };
      return h(L) + h(R);
    }
    if (mood === "happy" && t !== "wide") {
      return '<path d="M' + (L - 7) + ' ' + (y + 2) + ' Q' + L + ' ' + (y - 7) + ' ' + (L + 7) + ' ' + (y + 2) + '" fill="none"' + S + '/><path d="M' + (R - 7) + ' ' + (y + 2) + ' Q' + R + ' ' + (y - 7) + ' ' + (R + 7) + ' ' + (y + 2) + '" fill="none"' + S + '/>';
    }
    [L, R].forEach(function (x) {
      if (t === "dots") { o += '<circle cx="' + x + '" cy="' + y + '" r="3.6" fill="' + INK + '"/>'; return; }
      var rx = (t === "wide" ? 8.5 : t === "almond" ? 7.5 : 6.8) * es, ry = (t === "wide" ? 9 : t === "almond" ? 4.8 : t === "sleepy" ? 5 : 6.8) * es;
      var pr = (mood === "shocked" ? 2 : 3.3) * Math.sqrt(es);
      o += '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="#fff" stroke="' + INK + '" stroke-width="2.4"/>';
      o += '<circle cx="' + (x + (mood === "smug" ? 2 : 0)) + '" cy="' + (y + 0.5) + '" r="' + pr + '" fill="' + c + '"/><circle cx="' + (x + (mood === "smug" ? 2 : 0)) + '" cy="' + (y + 0.5) + '" r="' + (pr * 0.5) + '" fill="' + INK + '"/>';
      o += '<circle cx="' + (x + 1.6) + '" cy="' + (y - 1.6) + '" r="1.2" fill="#fff"/>';
      if (t === "sleepy" || mood === "smug" || mood === "angry") o += '<path d="M' + (x - rx - 1) + ' ' + (y - 1) + ' Q' + x + ' ' + (y - ry - 3) + ' ' + (x + rx + 1) + ' ' + (y - 1) + ' Z" fill="' + av.skin + '" stroke="' + INK + '" stroke-width="2.4"/>';
    });
    if (mood === "sad") o += '<path d="M' + (R + 4) + ' ' + (y + 7) + ' q3 6 0 9 q-3 -3 0 -9z" fill="#7cc4ff" stroke="' + INK + '" stroke-width="1.6"/>';
    return o;
  }
  function brows(av, mood) {
    var dx = ((av.eyeGap || 1) - 1) * 13, dy = av.browY || 0;
    var c = av.hair === "bald" || av.hair === "buzz" ? shade(av.hairColor, -0.2) : av.hairColor;
    if (av.hairColor === "#f2efe9") c = "#b9b4ae";
    var w = av.brows === "thick" ? 5 : av.brows === "thin" ? 2.6 : 3.6;
    var y = 45, l = "", r = "";
    if (mood === "sad" || mood === "worried") { l = "M39 " + (y + 2) + " L54 " + (y - 3); r = "M66 " + (y - 3) + " L81 " + (y + 2); }
    else if (mood === "angry") { l = "M39 " + (y - 3) + " L55 " + (y + 3); r = "M65 " + (y + 3) + " L81 " + (y - 3); }
    else if (mood === "shocked") { l = "M39 " + (y - 5) + " Q47 " + (y - 11) + " 55 " + (y - 5); r = "M65 " + (y - 5) + " Q73 " + (y - 11) + " 81 " + (y - 5); }
    else if (mood === "smug") { l = "M39 " + (y) + " Q47 " + (y - 3) + " 55 " + (y); r = "M65 " + (y - 4) + " Q73 " + (y - 9) + " 81 " + (y - 3); }
    else if (av.brows === "arched") { l = "M39 " + (y + 1) + " Q47 " + (y - 7) + " 55 " + (y); r = "M65 " + (y) + " Q73 " + (y - 7) + " 81 " + (y + 1); }
    else { l = "M39 " + y + " Q47 " + (y - 4) + " 55 " + y; r = "M65 " + y + " Q73 " + (y - 4) + " 81 " + y; }
    var o = '<path transform="translate(' + (-dx).toFixed(1) + ' ' + dy + ')" d="' + l + '" stroke="' + c + '" stroke-width="' + w + '" stroke-linecap="round" fill="none"/><path transform="translate(' + dx.toFixed(1) + ' ' + dy + ')" d="' + r + '" stroke="' + c + '" stroke-width="' + w + '" stroke-linecap="round" fill="none"/>';
    if (av.brows === "uni" && mood !== "shocked") o += '<path d="M' + (54 - dx).toFixed(1) + ' ' + (y - 1 + dy) + ' L' + (66 + dx).toFixed(1) + ' ' + (y - 1 + dy) + '" stroke="' + c + '" stroke-width="' + w + '" stroke-linecap="round"/>';
    return o;
  }
  function nose(av) {
    var s = shade(av.skin, -0.18);
    switch (av.nose) {
      case "long": return '<path d="M60 58 Q66 72 64 76 Q60 78 56 75" fill="' + s + '"' + S.replace('3"', '2.4"') + '/>';
      case "wide": return '<path d="M52 72 Q53 64 60 63 Q67 64 68 72 Q60 76 52 72Z" fill="' + s + '"' + S.replace('3"', '2.4"') + '/>';
      case "pointy": return '<path d="M60 60 L67 74 L57 74" fill="' + s + '"' + S.replace('3"', '2.4"') + '/>';
      case "big": return '<ellipse cx="60" cy="70" rx="9" ry="8" fill="' + s + '"' + S.replace('3"', '2.4"') + '/>';
      default: return '<ellipse cx="60" cy="70" rx="5" ry="4" fill="' + s + '"' + S.replace('3"', '2.4"') + '/>';
    }
  }
  function mouth(av, mood) {
    var y = 83;
    switch (mood) {
      case "happy": case "love": return '<path d="M47 ' + (y - 2) + ' Q60 ' + (y + 13) + ' 73 ' + (y - 2) + ' Z" fill="#8a2a3a"' + S.replace('3"', '2.6"') + '/><path d="M53 ' + (y + 4) + ' Q60 ' + (y + 9) + ' 67 ' + (y + 4) + '" fill="#ff8a9a"/>';
      case "sad": return '<path d="M49 ' + (y + 5) + ' Q60 ' + (y - 4) + ' 71 ' + (y + 5) + '" fill="none"' + S + '/>';
      case "shocked": return '<ellipse cx="60" cy="' + (y + 2) + '" rx="6" ry="8" fill="#8a2a3a"' + S.replace('3"', '2.6"') + '/>';
      case "smug": return '<path d="M50 ' + (y + 1) + ' Q62 ' + (y + 6) + ' 72 ' + (y - 4) + '" fill="none"' + S + '/>';
      case "worried": return '<path d="M48 ' + (y + 2) + ' q4 -4 8 0 t8 0 t8 0" fill="none"' + S + '/>';
      case "angry": return '<rect x="49" y="' + (y - 3) + '" width="22" height="9" rx="3" fill="#fff"' + S.replace('3"', '2.4"') + '/><path d="M49 ' + (y + 1.5) + ' H71" stroke="' + INK + '" stroke-width="1.6"/>';
      default: return '<path d="M50 ' + y + ' Q60 ' + (y + 5) + ' 70 ' + y + '" fill="none"' + S + '/>';
    }
  }
  function beard(av, shape) {
    var c = av.hairColor === "#f2efe9" ? "#d9d5cf" : av.hairColor;
    switch (av.beard) {
      case "stubble": return '<path d="M30 70 C34 92 48 ' + (shape.jaw + 2) + ' 60 ' + (shape.jaw + 2) + ' C72 ' + (shape.jaw + 2) + ' 86 92 90 70 C84 86 74 92 60 92 C46 92 36 86 30 70Z" fill="' + c + '" opacity=".35"/>';
      case "beard": return '<path d="M28 66 C30 96 46 ' + (shape.jaw + 10) + ' 60 ' + (shape.jaw + 10) + ' C74 ' + (shape.jaw + 10) + ' 90 96 92 66 C86 80 76 76 60 76 C44 76 34 80 28 66Z" fill="' + c + '"' + S + '/><path d="M50 82 Q60 88 70 82" fill="none"' + S + '/>';
      case "moustache": return '<path d="M44 78 Q52 71 60 76 Q68 71 76 78 Q68 80 60 78 Q52 80 44 78Z" fill="' + c + '"' + S.replace('3"', '2.4"') + '/>';
      case "goatee": return '<path d="M52 90 Q60 104 68 90 Q60 94 52 90Z" fill="' + c + '"' + S.replace('3"', '2.4"') + '/><path d="M47 78 Q60 72 73 78" stroke="' + c + '" stroke-width="4" fill="none" stroke-linecap="round"/>';
      default: return "";
    }
  }
  function glasses(av, force) {
    var g = force || av.glasses;
    if (g === "none") return "";
    var fill = g === "sun" ? '#1f1b2e' : 'rgba(255,255,255,.15)';
    if (g === "square") return '<g fill="' + fill + '" stroke="' + INK + '" stroke-width="3"><rect x="36" y="50" width="22" height="16" rx="4"/><rect x="62" y="50" width="22" height="16" rx="4"/><path d="M58 57 H62"/></g>';
    var o = '<g fill="' + fill + '" stroke="' + INK + '" stroke-width="3"><circle cx="47" cy="58" r="11"/><circle cx="73" cy="58" r="11"/><path d="M58 57 H62"/></g>';
    if (g === "sun") o += '<path d="M40 53 L46 51" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".7"/><path d="M66 53 L72 51" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>';
    return o;
  }
  function extra(av, shape) {
    switch (av.extra) {
      case "freckles": return '<g fill="' + shade(av.skin, -0.3) + '"><circle cx="40" cy="70" r="1.5"/><circle cx="45" cy="73" r="1.5"/><circle cx="37" cy="74" r="1.3"/><circle cx="80" cy="70" r="1.5"/><circle cx="75" cy="73" r="1.5"/><circle cx="83" cy="74" r="1.3"/></g>';
      case "blush": return '<ellipse cx="38" cy="74" rx="7" ry="4" fill="#ff7a8a" opacity=".45"/><ellipse cx="82" cy="74" rx="7" ry="4" fill="#ff7a8a" opacity=".45"/>';
      case "earrings": return '<circle cx="' + (60 - shape.w - 1) + '" cy="76" r="4" fill="#ffd23f"' + S.replace('3"', '2"') + '/><circle cx="' + (60 + shape.w + 1) + '" cy="76" r="4" fill="#ffd23f"' + S.replace('3"', '2"') + '/>';
      case "mole": return '<circle cx="76" cy="80" r="2" fill="' + INK + '"/>';
      default: return "";
    }
  }

  // ---------- tenues ----------
  var OUTFITS = {
    casual:     function (av) { return { top: av.fav, legs: "#3e5c8a", shoes: "#2b2140" }; },
    kid:        function (av) { return { top: av.fav, legs: "#ffd23f", shoes: "#2b2140", stripe: "#fff" }; },
    delivery:   function () { return { top: "#3ad1a0", legs: "#2b2140", shoes: "#ff6b4a", cap: "#3ad1a0", bag: "#2fa37a" }; },
    office:     function () { return { top: "#f4f6fb", legs: "#6b7488", shoes: "#2b2140", tie: "#3d7dd8", collar: true }; },
    manager:    function () { return { top: "#2c3e66", legs: "#2c3e66", shoes: "#1b1b1b", tie: "#e5487a", collar: true, jacket: true }; },
    director:   function () { return { top: "#1b1f2e", legs: "#1b1f2e", shoes: "#111", tie: "#ffd23f", collar: true, jacket: true, pocket: true }; },
    influencer: function () { return { top: "#ff7eb6", legs: "#f4f6fb", shoes: "#ffd23f", star: true, shades: true }; },
    hoodie:     function () { return { top: "#8a92a6", legs: "#2b2140", shoes: "#f4f6fb", logo: true, hood: true }; },
    ceo:        function () { return { top: "#15151c", legs: "#3a3a48", shoes: "#f4f6fb", turtle: true, watch: true }; },
    wedding:    function () { return { top: "#ffffff", legs: "#ffffff", shoes: "#c9c9d6", flower: true, jacket: true }; },
    mystic:     function () { return { top: "#7b3fc4", legs: "#7b3fc4", shoes: "#d9a066", pendant: true, robe: true }; },
    retired:    function () { return { top: "#ff7eb6", legs: "#f2e6c9", shoes: "#5b3a29", flowers: true }; },
    pajama:     function () { return { top: "#9fd6ff", legs: "#9fd6ff", shoes: "#ffd23f", dots: true }; },
    artist:     function () { return { top: "#f4f6fb", legs: "#2b2140", shoes: "#e5487a", stripe: "#2b2140", beret: "#e5487a", scarf: "#ffd23f" }; },
    plumber:    function () { return { top: "#3d7dd8", legs: "#3d7dd8", shoes: "#2b2140", bib: "#2c5fae", cap: "#ff6b4a" }; },
    nurse:      function () { return { top: "#7fd1c7", legs: "#7fd1c7", shoes: "#f4f6fb", cross: "#e5487a", collar: true }; },
    teacher:    function () { return { top: "#c97b4a", legs: "#6b4a3a", shoes: "#2b2140", collar: true, jacket: true, pocket: true }; },
    engineer:   function () { return { top: "#ff9a3a", legs: "#3e5c8a", shoes: "#2b2140", helmet: "#ffd23f", vest: true }; },
    lawyer:     function () { return { top: "#15151c", legs: "#15151c", shoes: "#111", robe: true, jabot: true }; },
    surgeon:    function () { return { top: "#5aa9ff", legs: "#5aa9ff", shoes: "#f4f6fb", cap: "#5aa9ff", cross: "#f4f6fb" }; },
    waiter:     function () { return { top: "#f4f6fb", legs: "#1b1b1b", shoes: "#111", collar: true, tie: "#2b2140", apron: "#2b2140" }; },
    shopkeeper: function () { return { top: "#e5487a", legs: "#2c3e66", shoes: "#fff", collar: true, pendant: true }; },
    gardener:   function () { return { top: "#38b58a", legs: "#8a5a3b", shoes: "#5b3a29", bib: "#2fa37a", cap: "#e3bc5e" }; },
    chef:       function () { return { top: "#ffffff", legs: "#3a3a48", shoes: "#111", collar: true, toque: "#ffffff", apron: "#f4f6fb" }; },
    hairdresser: function () { return { top: "#2b2140", legs: "#2b2140", shoes: "#e5487a", apron: "#ff7eb6", scarf: "#ff7eb6" }; },
    electrician: function () { return { top: "#3d7dd8", legs: "#3d7dd8", shoes: "#2b2140", bib: "#2c5fae", helmet: "#ffffff" }; },
    mechanic:   function () { return { top: "#8a92a6", legs: "#3e5c8a", shoes: "#2b2140", bib: "#3e5c8a", cap: "#e5487a", stain: true }; },
    baker:      function () { return { top: "#fff4dc", legs: "#c9a066", shoes: "#5b3a29", collar: true, toque: "#ffffff", apron: "#fff4dc" }; },
    police:     function () { return { top: "#2c3e66", legs: "#1b1f2e", shoes: "#111", collar: true, tie: "#111", cap: "#2c3e66", star: true }; },
    firefighter: function () { return { top: "#2b2140", legs: "#2b2140", shoes: "#ff6b4a", vest: true, helmet: "#e5282a" }; },
    realtor:    function () { return { top: "#f4f6fb", legs: "#6b7488", shoes: "#2b2140", collar: true, tie: "#ffd23f", jacket: true, pocket: true }; },
    developer:  function () { return { top: "#2b2140", legs: "#3a3a48", shoes: "#f4f6fb", hood: true, logo: true }; },
    designer:   function () { return { top: "#ff7eb6", legs: "#2b2140", shoes: "#ffd23f", beret: "#9b5de5", scarf: "#3ad1a0" }; },
    accountant: function () { return { top: "#c9ced8", legs: "#3a3a48", shoes: "#1b1b1b", collar: true, tie: "#3d7dd8", pocket: true }; },
    reporter:   function () { return { top: "#d9a066", legs: "#3a3a48", shoes: "#5b3a29", vest: true, scarf: "#e5487a" }; },
    architect:  function () { return { top: "#f4f6fb", legs: "#3a3a48", shoes: "#111", collar: true, tie: "#2b2140", helmet: "#ffd23f" }; },
    pharmacist: function () { return { top: "#ffffff", legs: "#3a3a48", shoes: "#fff", collar: true, cross: "#38b58a" }; },
    psychologist: function () { return { top: "#7a9e9f", legs: "#6b4a3a", shoes: "#2b2140", collar: true, jacket: true }; },
    vet:        function () { return { top: "#38b58a", legs: "#38b58a", shoes: "#fff", cross: "#ffffff", cap: "#38b58a" }; },
    data:       function () { return { top: "#4f7cff", legs: "#2b2140", shoes: "#fff", hood: true }; },
    pilot:      function () { return { top: "#1f2a44", legs: "#1f2a44", shoes: "#111", collar: true, tie: "#ffd23f", jacket: true, cap: "#1f2a44", star: true }; },
    judge:      function () { return { top: "#7a1f2e", legs: "#7a1f2e", shoes: "#111", robe: true, jabot: true }; },
    scientist:  function () { return { top: "#ffffff", legs: "#6b7488", shoes: "#fff", collar: true, pocket: true }; },
    astronaut:  function () { return { top: "#f4f6fb", legs: "#f4f6fb", shoes: "#c9ced8", helmet: "#c9ced8", star: true }; },
    unemployed: function () { return { top: "#efeee8", legs: "#8a92a6", shoes: "#5b3a29", stain: true, tank: true }; },
  };

  function body(av, o, pose, hold) {
    var w = av.body === "slim" ? 19 : av.body === "round" ? 29 : 24, cx = 60;
    var top = 100, bot = 160;
    var g = "", ink = S;
    // jambes
    g += '<path d="M' + (cx - 12) + ' ' + bot + ' V187" stroke="' + o.legs + '" stroke-width="13" stroke-linecap="round"/><path d="M' + (cx + 12) + ' ' + bot + ' V187" stroke="' + o.legs + '" stroke-width="13" stroke-linecap="round"/>';
    g += '<path d="M' + (cx - 12) + ' ' + bot + ' V187 M' + (cx + 12) + ' ' + bot + ' V187" stroke="' + INK + '" stroke-width="3" fill="none" opacity=".0"/>';
    g += '<ellipse cx="' + (cx - 14) + '" cy="191" rx="11" ry="6" fill="' + o.shoes + '"' + ink + '/><ellipse cx="' + (cx + 14) + '" cy="191" rx="11" ry="6" fill="' + o.shoes + '"' + ink + '/>';
    if (o.bag) g += '<rect x="' + (cx - 30) + '" y="96" width="60" height="50" rx="6" fill="' + o.bag + '"' + ink + '/><path d="M' + (cx - 30) + ' 112 H' + (cx + 30) + '" stroke="' + INK + '" stroke-width="2.4"/>';
    // torse
    var torso = 'M' + (cx - w) + ' ' + (top + 6) + ' Q' + (cx - w) + ' ' + top + ' ' + (cx - w + 8) + ' ' + top + ' H' + (cx + w - 8) + ' Q' + (cx + w) + ' ' + top + ' ' + (cx + w) + ' ' + (top + 6) + ' L' + (cx + w + 2) + ' ' + (bot + 2) + ' Q' + cx + ' ' + (bot + 8) + ' ' + (cx - w - 2) + ' ' + (bot + 2) + ' Z';
    g += '<path d="' + torso + '" fill="' + o.top + '"' + ink + '/>';
    if (o.stripe) g += '<path d="M' + (cx - w + 1) + ' 128 H' + (cx + w - 1) + '" stroke="' + o.stripe + '" stroke-width="6"/>';
    if (o.tank) g += '<path d="M' + (cx - 10) + ' ' + top + ' Q' + cx + ' 116 ' + (cx + 10) + ' ' + top + '" fill="' + av.skin + '"' + ink + '/>';
    if (o.stain) g += '<path d="M' + (cx + 4) + ' 128 q8 -4 10 4 q2 8 -6 8 q-8 2 -6 -6z" fill="#c9a24a" opacity=".8"/><circle cx="' + (cx - 8) + '" cy="142" r="3" fill="#c9a24a" opacity=".7"/>';
    if (o.jacket) g += '<path d="M' + (cx - 6) + ' ' + top + ' L' + cx + ' 140 L' + (cx + 6) + ' ' + top + '" fill="' + (o.tie && o.top !== "#ffffff" ? "#f4f6fb" : "#f4f6fb") + '"' + ink + '/>';
    if (o.collar) g += '<path d="M' + (cx - 9) + ' ' + (top - 1) + ' L' + cx + ' ' + (top + 8) + ' L' + (cx + 9) + ' ' + (top - 1) + '" fill="#fff"' + ink + '/>';
    if (o.tie) g += '<path d="M' + cx + ' ' + (top + 7) + ' L' + (cx - 5) + ' ' + (top + 12) + ' L' + cx + ' ' + (top + 34) + ' L' + (cx + 5) + ' ' + (top + 12) + ' Z" fill="' + o.tie + '"' + S.replace('3"', '2.2"') + '/>';
    if (o.pocket) g += '<path d="M' + (cx + w - 14) + ' ' + (top + 14) + ' l4 -5 l4 5" fill="#ffd23f"' + S.replace('3"', '2"') + '/>';
    if (o.turtle) g += '<rect x="' + (cx - 12) + '" y="' + (top - 6) + '" width="24" height="12" rx="5" fill="' + o.top + '"' + ink + '/>';
    if (o.logo) g += '<g transform="translate(' + (cx - 7) + ' 122)"><path d="M7 0 Q13 6 10 16 H4 Q1 6 7 0Z" fill="#ff6b4a" stroke="' + INK + '" stroke-width="2"/></g><path d="M' + (cx - w + 4) + ' 150 H' + (cx + w - 4) + '" stroke="' + INK + '" stroke-width="2.4" opacity=".5"/>';
    if (o.star) g += '<path d="M' + cx + ' 116 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1z" fill="#ffd23f"' + S.replace('3"', '2"') + '/>';
    if (o.pendant) g += '<path d="M' + (cx - 10) + ' ' + top + ' L' + cx + ' 122 L' + (cx + 10) + ' ' + top + '" fill="none" stroke="#ffd23f" stroke-width="2"/><circle cx="' + cx + '" cy="126" r="6" fill="#c7b3ff"' + S.replace('3"', '2"') + '/>';
    if (o.robe) g += '<path d="M' + (cx - w - 2) + ' 150 L' + (cx - w - 8) + ' 186 H' + (cx + w + 8) + ' L' + (cx + w + 2) + ' 150Z" fill="' + o.top + '"' + ink + '/>';
    if (o.flowers) g += '<g fill="#ffd23f"><circle cx="' + (cx - 10) + '" cy="116" r="4"/><circle cx="' + (cx + 9) + '" cy="132" r="4"/><circle cx="' + (cx - 6) + '" cy="148" r="4"/></g><g fill="#38b58a"><circle cx="' + (cx + 12) + '" cy="112" r="3"/><circle cx="' + (cx - 12) + '" cy="136" r="3"/></g>';
    if (o.dots) g += '<g fill="#fff"><circle cx="' + (cx - 8) + '" cy="118" r="2.5"/><circle cx="' + (cx + 9) + '" cy="128" r="2.5"/><circle cx="' + (cx - 4) + '" cy="144" r="2.5"/><circle cx="' + (cx + 6) + '" cy="152" r="2.5"/></g>';
    if (o.apron) g += '<path d="M' + (cx - w + 3) + ' 120 H' + (cx + w - 3) + ' L' + (cx + w - 1) + ' 160 Q' + cx + ' 166 ' + (cx - w + 1) + ' 160 Z" fill="' + o.apron + '"' + S.replace('3"', '2.2"') + '/><path d="M' + (cx - 10) + ' ' + top + ' L' + (cx - 6) + ' 120 M' + (cx + 10) + ' ' + top + ' L' + (cx + 6) + ' 120" stroke="' + o.apron + '" stroke-width="4"/>';
    if (o.bib) g += '<path d="M' + (cx - 12) + ' ' + (top + 14) + ' h24 v30 h-24z" fill="' + o.bib + '"' + S.replace('3"', '2.2"') + '/><path d="M' + (cx - 12) + ' ' + (top + 14) + ' L' + (cx - w + 4) + ' ' + top + ' M' + (cx + 12) + ' ' + (top + 14) + ' L' + (cx + w - 4) + ' ' + top + '" stroke="' + o.bib + '" stroke-width="5"/>';
    if (o.cross) g += '<path d="M' + (cx + 4) + ' 124 h12 M' + (cx + 10) + ' 118 v12" stroke="' + o.cross + '" stroke-width="5"/>';
    if (o.vest) g += '<path d="M' + (cx - w + 2) + ' 122 H' + (cx + w - 2) + ' M' + (cx - w + 2) + ' 140 H' + (cx + w - 2) + '" stroke="#f4f6fb" stroke-width="5"/>';
    if (o.jabot) g += '<path d="M' + (cx - 7) + ' ' + top + ' L' + cx + ' ' + (top + 20) + ' L' + (cx + 7) + ' ' + top + 'z" fill="#fff"' + S.replace('3"', '2"') + '/><path d="M' + (cx - 5) + ' ' + (top + 20) + ' h10 v8 h-10z" fill="#fff"' + S.replace('3"', '2"') + '/>';
    if (o.scarf) g += '<path d="M' + (cx - 14) + ' ' + (top - 2) + ' Q' + cx + ' ' + (top + 8) + ' ' + (cx + 14) + ' ' + (top - 2) + ' L' + (cx + 10) + ' ' + (top + 26) + ' L' + (cx + 4) + ' ' + (top + 6) + 'z" fill="' + o.scarf + '"' + S.replace('3"', '2"') + '/>';
    if (o.flower) g += '<circle cx="' + (cx - w + 9) + '" cy="' + (top + 12) + '" r="5" fill="#e5487a"' + S.replace('3"', '2"') + '/>';
    // bras
    var sk = av.skin, sl = o.tank ? sk : o.top;
    var arms = armPaths(cx, w, top, pose, hold);
    arms.forEach(function (a) {
      g += '<path d="' + a.d + '" stroke="' + INK + '" stroke-width="15" stroke-linecap="round" fill="none"/>';
      g += '<path d="' + a.d + '" stroke="' + sl + '" stroke-width="9" stroke-linecap="round" fill="none"/>';
      g += '<circle cx="' + a.hx + '" cy="' + a.hy + '" r="7" fill="' + sk + '"' + S.replace('3"', '2.6"') + '/>';
    });
    if (o.watch) g += '<rect x="' + (arms[0].hx - 6) + '" y="' + (arms[0].hy - 11) + '" width="12" height="6" rx="2" fill="#ffd23f"' + S.replace('3"', '1.6"') + '/>';
    if (hold) g += holdItem(hold, cx, arms);
    return g;
  }
  function armPaths(cx, w, top, pose, hold) {
    var lx = cx - w - 2, rx = cx + w + 2, sy = top + 10;
    if (hold === "box" || hold === "toys") return [{ d: "M" + lx + " " + sy + " Q" + (lx - 2) + " 136 " + (cx - 16) + " 140", hx: cx - 16, hy: 140 }, { d: "M" + rx + " " + sy + " Q" + (rx + 2) + " 136 " + (cx + 16) + " 140", hx: cx + 16, hy: 140 }];
    switch (pose) {
      case "up": return [{ d: "M" + lx + " " + sy + " Q" + (lx - 14) + " 92 " + (lx - 10) + " 70", hx: lx - 10, hy: 70 }, { d: "M" + rx + " " + sy + " Q" + (rx + 14) + " 92 " + (rx + 10) + " 70", hx: rx + 10, hy: 70 }];
      case "wave": return [{ d: "M" + lx + " " + sy + " Q" + (lx - 8) + " 140 " + (lx - 4) + " 152", hx: lx - 4, hy: 152 }, { d: "M" + rx + " " + sy + " Q" + (rx + 16) + " 96 " + (rx + 14) + " 76", hx: rx + 14, hy: 76 }];
      case "clap": return [{ d: "M" + lx + " " + sy + " Q" + (lx - 6) + " 130 " + (cx - 5) + " 124", hx: cx - 5, hy: 124 }, { d: "M" + rx + " " + sy + " Q" + (rx + 6) + " 130 " + (cx + 5) + " 124", hx: cx + 5, hy: 124 }];
      case "hips": return [{ d: "M" + lx + " " + sy + " Q" + (lx - 16) + " 128 " + (lx + 2) + " 142", hx: lx + 2, hy: 142 }, { d: "M" + rx + " " + sy + " Q" + (rx + 16) + " 128 " + (rx - 2) + " 142", hx: rx - 2, hy: 142 }];
      case "phone": return [{ d: "M" + lx + " " + sy + " Q" + (lx - 8) + " 140 " + (lx - 4) + " 152", hx: lx - 4, hy: 152 }, { d: "M" + rx + " " + sy + " Q" + (rx + 10) + " 120 " + (rx - 4) + " 104", hx: rx - 4, hy: 104 }];
      default: return [{ d: "M" + lx + " " + sy + " Q" + (lx - 8) + " 140 " + (lx - 4) + " 152", hx: lx - 4, hy: 152 }, { d: "M" + rx + " " + sy + " Q" + (rx + 8) + " 140 " + (rx + 4) + " 152", hx: rx + 4, hy: 152 }];
    }
  }
  function holdItem(h, cx, arms) {
    if (h === "box") return '<g><rect x="' + (cx - 26) + '" y="126" width="52" height="36" rx="3" fill="#d9a066"' + S + '/><path d="M' + (cx - 26) + ' 136 H' + (cx + 26) + '" stroke="' + INK + '" stroke-width="2"/><path d="M' + (cx + 8) + ' 126 q2 -18 12 -22 q-2 14 -10 22" fill="#38b58a"' + S.replace('3"', '2"') + '/><rect x="' + (cx - 18) + '" y="116" width="14" height="12" fill="#fff"' + S.replace('3"', '2"') + '/></g>';
    if (h === "toys") return '<g><circle cx="' + (cx - 10) + '" cy="140" r="10" fill="#ff6b4a"' + S + '/><rect x="' + (cx + 2) + '" y="130" width="18" height="18" rx="3" fill="#3d7dd8"' + S + '/><text x="' + (cx + 11) + '" y="144" font-size="12" font-weight="900" text-anchor="middle" fill="#fff" font-family="Nunito,sans-serif">A</text></g>';
    if (h === "suitcase") return '<g><rect x="' + (arms[1].hx - 14) + '" y="' + (arms[1].hy + 4) + '" width="30" height="26" rx="4" fill="#9b5de5"' + S + '/><path d="M' + (arms[1].hx - 4) + ' ' + (arms[1].hy + 4) + ' v-5 h10 v5" fill="none"' + S + '/></g>';
    if (h === "phone") return '<rect x="' + (arms[1].hx - 6) + '" y="' + (arms[1].hy - 18) + '" width="13" height="22" rx="3" fill="#1f1b2e"' + S.replace('3"', '2"') + '/>';
    if (h === "glass") return '<path d="M' + (arms[1].hx - 7) + ' ' + (arms[1].hy - 20) + ' h14 l-3 14 h-8z" fill="#ffd23f"' + S.replace('3"', '2"') + '/>';
    if (h === "mic") return '<g><rect x="' + (arms[1].hx - 3) + '" y="' + (arms[1].hy - 4) + '" width="6" height="16" fill="#2b2140"/><circle cx="' + arms[1].hx + '" cy="' + (arms[1].hy - 8) + '" r="7" fill="#b9b4ae"' + S.replace('3"', '2"') + '/></g>';
    if (h === "magnifier") return '<g><circle cx="' + (arms[1].hx + 6) + '" cy="' + (arms[1].hy - 14) + '" r="11" fill="rgba(160,220,255,.5)"' + S + '/><path d="M' + arms[1].hx + ' ' + (arms[1].hy - 4) + ' l-5 8" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/></g>';
    return "";
  }

  /* Rendu complet d'un personnage. opts : outfit, mood, pose, hold, kid, hat, shades */
  function svg(av, opts) {
    opts = opts || {};
    av = sanitize(av);
    var outfit = OUTFITS[opts.outfit] ? opts.outfit : (opts.kid ? "kid" : "casual");
    var o = OUTFITS[outfit](av), mood = opts.mood || "neutral";
    var shape = headShape(av.face);
    var g = "";
    g += '<ellipse cx="60" cy="194" rx="34" ry="6" fill="rgba(43,33,64,.18)"/>';
    var fw = av.faceW || 1, sx = function (cx, cy, kx, ky, inner) { return '<g transform="translate(' + cx + ' ' + cy + ') scale(' + kx + ' ' + ky + ') translate(' + (-cx) + ' ' + (-cy) + ')">' + inner + '</g>'; };
    var traced = av.face === "photo" && av.trace;
    if (!traced && av.hair === "photo") av = Object.assign({}, av, { hair: "short" });
    g += traced ? (av.hair === "photo" ? traceHairBack(av) : hairBack(av)) : sx(60, 0, fw, 1, hairBack(av));
    if (o.hood) g += '<path d="M22 70 C18 30 40 10 60 10 C80 10 102 30 98 70 L94 104 H26 Z" fill="' + o.top + '"' + S + '/>';
    g += body(av, o, opts.pose || "down", opts.hold);
    // cou + tête
    g += '<rect x="52" y="90" width="16" height="14" fill="' + shade(av.skin, -0.12) + '"/>';
    if (traced) {
      g += traceHead(av, mood, { shades: opts.shades || (o.shades && mood !== "sad"), disguise: opts.disguise, liar: opts.liar });
      if (av.hair !== "photo") g += hairFront(av);
    } else {
    var head = '<ellipse cx="' + (60 - shape.w) + '" cy="64" rx="7" ry="9" fill="' + av.skin + '"' + S + '/><ellipse cx="' + (60 + shape.w) + '" cy="64" rx="7" ry="9" fill="' + av.skin + '"' + S + '/>';
    head += '<path d="' + shape.d + '" fill="' + av.skin + '"' + S + '/>';
    head += '<path d="M34 84 Q60 104 86 84" fill="none" stroke="' + shade(av.skin, -0.1) + '" stroke-width="6" opacity=".5"/>';
    head += extra(av, shape);
    head += beard(av, shape);
    g += sx(60, 0, fw, 1, head);
    var nz = (av.noseSize || 1) * (opts.liar ? 1 : 1);
    g += sx(60, 66, nz, nz, nose(opts.liar ? Object.assign({}, av, { nose: "long" }) : av));
    if (opts.liar) g += '<path d="M64 74 L' + (82 + 6 * (opts.liar - 1)) + ' 72 L64 70Z" fill="' + shade(av.skin, -0.18) + '"' + S.replace('3"', '2.4"') + '/>';
    g += sx(60, 83, av.mouthW || 1, 1, mouth(av, mood));
    g += eyes(av, mood);
    g += brows(av, mood);
    var gl = opts.shades ? "sun" : (o.shades && mood !== "sad" ? "sun" : null);
    g += sx(60, 58, av.eyeGap || 1, av.eyeSize || 1, glasses(av, gl));
    if (opts.disguise) g += '<g><circle cx="47" cy="58" r="9" fill="none" stroke="' + INK + '" stroke-width="3"/><circle cx="73" cy="58" r="9" fill="none" stroke="' + INK + '" stroke-width="3"/><path d="M56 58 H64" stroke="' + INK + '" stroke-width="3"/><path d="M46 78 Q53 70 60 75 Q67 70 74 78 Q60 81 46 78Z" fill="#2a1d1a"/></g>';
    g += sx(60, 0, fw, 1, hairFront(av));
    }
    if (o.cap) g += '<path d="M28 40 C30 18 90 18 92 40 Z" fill="' + o.cap + '"' + S + '/><path d="M88 38 L110 42 L90 46Z" fill="' + o.cap + '"' + S + '/>';
    if (o.toque) g += '<path d="M33 36 C24 14 44 4 60 12 C76 4 96 14 87 36 Z" fill="' + o.toque + '"' + S + '/><rect x="33" y="32" width="54" height="9" rx="3" fill="' + o.toque + '"' + S.replace('3"', '2.4"') + '/>';
    if (o.beret) g += '<ellipse cx="54" cy="26" rx="32" ry="11" fill="' + o.beret + '"' + S + '/><path d="M54 15 v-6" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>';
    if (o.helmet) g += '<path d="M24 40 C24 8 96 8 96 40 Z" fill="' + o.helmet + '"' + S + '/><path d="M18 40 H102" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/><path d="M60 12 V38" stroke="' + INK + '" stroke-width="2.4"/>';
    if (o.mask && mood !== "shocked") g += '<path d="M36 76 Q60 70 84 76 L80 94 Q60 102 40 94Z" fill="#dff0ff"' + S.replace('3"', '2.4"') + '/>';
    if (opts.hat === "party") g += '<path d="M44 26 L60 -10 L76 26Z" fill="#ffd23f"' + S + '/><circle cx="60" cy="-10" r="5" fill="#e5487a"' + S.replace('3"', '2"') + '/>';
    if (opts.hat === "crown") g += '<path d="M36 26 L40 2 L52 16 L60 -2 L68 16 L80 2 L84 26Z" fill="#ffd23f"' + S + '/>';
    if (opts.hat === "veil") g += '<path d="M34 30 C40 10 80 10 86 30 L96 110 L24 110Z" fill="rgba(255,255,255,.55)" stroke="#d9d9e6" stroke-width="2"/>';
    return '<g class="qv-av">' + g + '</g>';
  }
  /* <svg> autonome (aperçus, éditeur, cartes de joueur) */
  function standalone(av, opts, cls, headOnly) {
    var vb = headOnly ? "8 -8 104 116" : "-8 -16 136 216";
    return '<svg class="' + (cls || "") + '" viewBox="' + vb + '" aria-hidden="true">' + svg(av, opts) + '</svg>';
  }

  root.QV_AVATAR = { OPTIONS: OPTIONS, COLORS: COLORS, MORPHS: MORPHS, defaults: defaults, sanitize: sanitize, random: random, sexOf: sexOf, svg: svg, standalone: standalone, shade: shade, INK: INK };
})(window);
