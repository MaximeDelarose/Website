/* =========================================================================
   QUELLE VIE ! — génération d'avatar à partir d'une photo
   Tout se passe dans le navigateur : la photo n'est envoyée nulle part.
   Deux modèles MediaPipe hébergés sur le site (chargés à la première photo) :
     - Face Landmarker : 478 points du visage (forme, yeux, iris, nez, sourcils…)
     - Hair Segmenter  : masque des cheveux (couleur, longueur, volume, calvitie)
   On mesure le visage puis on choisit les pièces de l'avatar les plus proches
   (QV_AVATAR) : c'est une caricature fidèle aux traits, pas un filtre.
   QV_FACE.analyze(image|canvas, onProgress) → Promise<{ found, avatar, traits[] }>
   ========================================================================= */
(function (root) {
  "use strict";
  var A = root.QV_AVATAR;
  var VENDOR = "js/vendor/mediapipe/";
  var loading = null;

  function abs(p) { return new URL(p, location.href).href; }
  function load(onProgress) {
    if (loading) return loading;
    onProgress && onProgress("load");
    loading = import(abs(VENDOR + "vision_bundle.mjs")).then(function (V) {
      var fileset = { wasmLoaderPath: abs(VENDOR + "wasm/vision_wasm_internal.js"), wasmBinaryPath: abs(VENDOR + "wasm/vision_wasm_internal.wasm") };
      return Promise.all([
        V.FaceLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath: abs("assets/models/face_landmarker.task"), delegate: "CPU" }, runningMode: "IMAGE", numFaces: 1 }),
        V.ImageSegmenter.createFromOptions(fileset, { baseOptions: { modelAssetPath: abs("assets/models/hair_segmenter.tflite"), delegate: "CPU" }, runningMode: "IMAGE", outputCategoryMask: true, outputConfidenceMasks: false }),
      ]);
    }).catch(function (e) { loading = null; throw e; });
    return loading;
  }

  // ---------- couleurs ----------
  function luma(c) { return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]; }
  function hex(c) { return "#" + c.map(function (v) { return ("0" + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2); }).join(""); }
  function median(list) {
    if (!list.length) return null;
    var out = [0, 1, 2].map(function (k) { var a = list.map(function (c) { return c[k]; }).sort(function (x, y) { return x - y; }); return a[a.length >> 1]; });
    return out;
  }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function analyze(src, onProgress) {
    return load(onProgress).then(function (m) {
      onProgress && onProgress("scan");
      var face = m[0], seg = m[1];
      // image de travail (640 px max)
      var sw = src.naturalWidth || src.videoWidth || src.width, sh = src.naturalHeight || src.videoHeight || src.height;
      var k = Math.min(1, 640 / Math.max(sw, sh)), W = Math.round(sw * k), H = Math.round(sh * k);
      var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      var g = cv.getContext("2d", { willReadFrequently: true }); g.drawImage(src, 0, 0, W, H);
      var data = g.getImageData(0, 0, W, H).data;
      var res = face.detect(cv);
      if (!res.faceLandmarks || !res.faceLandmarks.length) return { found: false };
      var L = res.faceLandmarks[0].map(function (p) { return { x: p.x * W, y: p.y * H }; });

      var hairMask = null, mw = W, mh = H;
      try {
        var sr = seg.segment(cv);
        var cm = sr.categoryMask;
        mw = cm.width; mh = cm.height; hairMask = cm.getAsUint8Array().slice();
        sr.close && sr.close();
      } catch (e) { hairMask = null; }
      function isHair(x, y) {
        if (!hairMask) return false;
        var mx = Math.floor(x / W * mw), my = Math.floor(y / H * mh);
        if (mx < 0 || my < 0 || mx >= mw || my >= mh) return false;
        return hairMask[my * mw + mx] > 0;
      }
      function px(x, y) { x = Math.max(0, Math.min(W - 1, Math.round(x))); y = Math.max(0, Math.min(H - 1, Math.round(y))); var i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; }
      function patch(p, r, dx, dy) {
        var out = [], cx = p.x + (dx || 0), cy = p.y + (dy || 0);
        for (var y = -r; y <= r; y++) for (var x = -r; x <= r; x++) out.push(px(cx + x, cy + y));
        return out;
      }
      function med(points, r, dx, dy) { var all = []; points.forEach(function (i) { all = all.concat(patch(L[i], r, dx, dy)); }); return median(all); }

      var fw = dist(L[234], L[454]), fh = dist(L[10], L[152]), unit = Math.max(2, Math.round(fw * 0.025));
      var traits = [], av = A.defaults();

      // ---- peau ----
      var skin = med([50, 280, 205, 425, 151, 9], unit);
      var skinL = luma(skin);
      av.skin = A.shade(hex(skin), -0.07); // la photo est souvent plus claire que le rendu à plat

      // ---- forme du visage ----
      var ratio = fh / fw, jaw = dist(L[172], L[397]) / fw;
      if (jaw > 0.86) av.face = "square";
      else if (ratio > 1.42) av.face = "long";
      else if (jaw < 0.74) av.face = "heart";
      else if (ratio > 1.3) av.face = "oval";
      else av.face = "round";
      traits.push({ round: "Visage rond", oval: "Visage ovale", square: "Mâchoire carrée", long: "Visage allongé", heart: "Menton pointu" }[av.face]);

      // ---- yeux ----
      var ear = (dist(L[159], L[145]) / dist(L[33], L[133]) + dist(L[386], L[374]) / dist(L[362], L[263])) / 2;
      var eyeW = (dist(L[33], L[133]) + dist(L[362], L[263])) / 2 / fw;
      av.eyes = ear > 0.36 ? "wide" : ear < 0.17 ? "sleepy" : ear < 0.27 ? "almond" : (eyeW < 0.17 ? "dots" : "round");
      if (L.length >= 478) {
        var ir = Math.max(1, Math.round(dist(L[468], L[469]) * 0.45));
        var iris = median(patch(L[468], ir).concat(patch(L[473], ir)));
        var il = luma(iris), eyeCol;
        if (iris[2] > iris[0] + 6 && iris[2] >= iris[1] - 4 && il > 55) eyeCol = { c: "#5a87c9", n: "bleus" };
        else if (iris[1] > iris[0] + 4 && iris[1] > iris[2] && il > 50) eyeCol = { c: "#4f8a4a", n: "verts" };
        else if (il < 48) eyeCol = { c: "#3b2a20", n: "foncés" };
        else if (iris[0] - iris[2] > 30 && il > 80) eyeCol = { c: "#8a6a3a", n: "noisette" };
        else eyeCol = { c: "#3b2a20", n: "marron" };
        av.eyeColor = eyeCol.c;
        traits.push("Yeux " + eyeCol.n);
      }

      // ---- sourcils ----
      var browUp = [70, 63, 105, 66, 107, 336, 296, 334, 293, 300], browLo = [46, 53, 52, 65, 55, 276, 283, 282, 295, 285];
      var brow = median(browUp.map(function (i, n) { var a = L[i], b = L[browLo[n]]; return px((a.x + b.x) / 2, (a.y + b.y) / 2); }));
      var browC = skinL - luma(brow);
      var browT = browUp.reduce(function (s, i, n) { return s + dist(L[i], L[browLo[n]]); }, 0) / browUp.length / fh;
      var arch = ((L[70].y + L[107].y) / 2 - L[105].y) / fh;
      var between = luma(median(patch({ x: (L[107].x + L[336].x) / 2, y: (L[107].y + L[336].y) / 2 }, unit)));
      if (skinL - between > 38 && browC > 45) av.brows = "uni";
      else if (browC > 55 || browT > 0.075) av.brows = "thick";
      else if (arch > 0.035) av.brows = "arched";
      else av.brows = browC < 28 ? "thin" : "arched";

      // ---- nez ----
      var wing = dist(L[98], L[327]) / fw, nlen = dist(L[168], L[2]) / fh;
      av.nose = wing > 0.3 ? (nlen > 0.3 ? "big" : "wide") : nlen > 0.31 ? "long" : wing < 0.23 ? "pointy" : "button";
      traits.push({ button: "Petit nez", long: "Nez long", wide: "Nez large", pointy: "Nez fin", big: "Grand nez" }[av.nose]);

      // ---- cheveux (masque) ----
      var hairPx = [], top = 0, topN = 0, side = 0, sideN = 0, below = 0, low = 0, lowN = 0, minY = 1e9, minX = 1e9, maxX = -1e9, left = 0, right = 0;
      var cx = (L[234].x + L[454].x) / 2, yTop = L[10].y, yChin = L[152].y, yEye = (L[33].y + L[263].y) / 2;
      var step = Math.max(1, Math.round(fw / 60));
      for (var y = Math.max(0, yTop - fh * 1.0); y < Math.min(H, yChin + fh * 1.6); y += step) {
        for (var x = Math.max(0, cx - fw * 1.4); x < Math.min(W, cx + fw * 1.4); x += step) {
          var h = isHair(x, y);
          var inCols = x > L[234].x + fw * 0.1 && x < L[454].x - fw * 0.1;
          if (y < yTop && y > yTop - fh * 0.45 && inCols) { topN++; if (h) { top++; if (x < cx) left++; else right++; } }
          var outside = (x < L[234].x - fw * 0.04 && x > L[234].x - fw * 0.5) || (x > L[454].x + fw * 0.04 && x < L[454].x + fw * 0.5);
          if (outside && y > yEye && y < yChin) { sideN++; if (h) side++; }
          var lowCols = (x > L[234].x - fw * 0.6 && x < L[234].x + fw * 0.1) || (x > L[454].x - fw * 0.1 && x < L[454].x + fw * 0.6);
          if (lowCols && y > yChin && y < yChin + fh * 0.6) { lowN++; if (h) low++; }
          if (!h) continue;
          if (y > yChin + fh * 0.08) below++;
          hairPx.push(px(x, y));
          if (y < minY) minY = y;
          if (x < minX) minX = x; if (x > maxX) maxX = x;
        }
      }
      var cell = (fw / step) * (fh / step);
      var fLow = lowN ? low / lowN : 0;
      var fTop = topN ? top / topN : 0, fSide = sideN ? side / sideN : 0, fBelow = below / cell;
      var hTop = minY < 1e9 ? (yTop - minY) / fh : 0, wExt = maxX > minX ? (maxX - minX) / fw : 0;
      var asym = top ? Math.abs(left - right) / top : 0;
      var hairName = "";
      if (!hairMask) { av.hair = "short"; }
      else if (fTop < 0.15 && fSide < 0.08) { av.hair = "bald"; hairName = "Crâne rasé ou dégarni"; }
      else if (fLow > 0.22 || fBelow > 0.22 || fSide > 0.6) { av.hair = "long"; hairName = "Cheveux longs"; }
      else if (wExt > 1.85 && hTop > 0.42) { av.hair = "afro"; hairName = "Cheveux volumineux"; }
      else if (fSide > 0.35) { av.hair = "bob"; hairName = "Coupe carrée"; }
      else if (hTop < 0.16 && fSide < 0.1) { av.hair = "buzz"; hairName = "Cheveux très courts"; }
      else if (asym > 0.35) { av.hair = "side"; hairName = "Mèche sur le côté"; }
      else if (hTop > 0.4 && wExt > 1.45) { av.hair = "curly"; hairName = "Cheveux bouclés"; }
      else { av.hair = "short"; hairName = "Cheveux courts"; }
      var hc = median(hairPx.length > 20 ? hairPx : [brow]);
      av.hairColor = hex(hc);
      if (hairName) {
        var hl = luma(hc), warm = hc[0] - hc[2];
        var cn = hl < 55 ? "noirs" : warm > 60 && hc[0] > 120 && hl < 150 ? "roux" : hl > 125 && warm >= 18 ? "blonds" : hl > 165 ? "blancs" : hl > 110 && warm < 18 ? "gris" : hl > 95 ? "châtain clair" : "bruns";
        traits.unshift(av.hair === "bald" ? hairName : hairName + " " + cn);
      }

      // ---- barbe, moustache ----
      function lerp(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
      function dropAt(pts) { var all = []; pts.forEach(function (q) { all = all.concat(patch(q, unit)); }); return (skinL - luma(median(all))) / Math.max(40, skinL); }
      var chinD = dropAt([lerp(L[17], L[152], 0.55), lerp(L[84], L[148], 0.5), lerp(L[314], L[377], 0.5)]);
      var jawD = dropAt([lerp(L[136], L[61], 0.35), lerp(L[365], L[291], 0.35)]);
      var mustD = dropAt([lerp(L[2], L[0], 0.5), lerp(L[98], L[61], 0.5), lerp(L[327], L[291], 0.5)]);
      if (chinD > 0.3 && jawD > 0.26) av.beard = "beard";
      else if (chinD > 0.3 && mustD > 0.26) av.beard = "goatee";
      else if (mustD > 0.34 && chinD < 0.2) av.beard = "moustache";
      else if (chinD > 0.17 && jawD > 0.15) av.beard = "stubble";
      else av.beard = "none";
      if (av.beard !== "none") traits.push({ beard: "Barbe", goatee: "Bouc", moustache: "Moustache", stubble: "Barbe de 3 jours" }[av.beard]);

      // ---- lunettes ----
      var bridge = skinL - luma(median(patch(L[6], Math.max(1, Math.round(unit / 2)))));
      var sr2 = Math.max(1, Math.round(unit / 2));
      var sclera = L.length >= 478 ? luma(median(patch(lerp(L[468], L[33], 0.55), sr2).concat(patch(lerp(L[473], L[263], 0.55), sr2)))) : 255;
      var lens = luma(median(patch(lerp(L[159], L[145], 0.5), unit).concat(patch(lerp(L[386], L[374], 0.5), unit))));
      if (sclera < skinL * 0.33 && lens < skinL * 0.33 && sclera < 55) { av.glasses = "sun"; traits.push("Lunettes de soleil"); }
      else if (bridge > Math.max(40, skinL * 0.35)) { av.glasses = Math.abs(L[33].y - L[159].y) / fh > 0.05 ? "round" : "square"; traits.push("Lunettes"); }
      else av.glasses = "none";

      // ---- vêtement (couleur préférée) ----
      var shirtY = yChin + fh * 0.75;
      if (shirtY < H - 4) {
        var shirt = [];
        for (var sx = cx - fw * 0.6; sx <= cx + fw * 0.6; sx += step) {
          var c = px(sx, shirtY);
          if (Math.abs(luma(c) - skinL) > 25 && !isHair(sx, shirtY)) shirt.push(c);
        }
        if (shirt.length > 6) av.fav = hex(median(shirt));
      }
      // corpulence : largeur de la mâchoire par rapport à la hauteur
      av.body = jaw > 0.9 && ratio < 1.25 ? "round" : ratio > 1.42 ? "slim" : "regular";

      // ---- réglages fins (caricature : on amplifie l'écart à la moyenne) ----
      var amp = function (v, mean, k) { return 1 + (v / mean - 1) * k; };
      var eyeGapM = dist(L[133], L[362]) / fw, eyeWM = (dist(L[33], L[133]) + dist(L[362], L[263])) / 2 / fw;
      var mouthM = dist(L[61], L[291]) / fw, smile = dist(L[13], L[14]) / fh;
      var browGapM = ((L[159].y - L[105].y) + (L[386].y - L[334].y)) / 2 / fh;
      av.faceW = amp(1.25 / ratio, 1, 1.2);
      av.eyeGap = amp(eyeGapM, 0.24, 1.6);
      av.eyeSize = amp(eyeWM, 0.19, 1.6);
      av.noseSize = amp(wing, 0.26, 1.5);
      av.mouthW = amp(smile > 0.04 ? mouthM / 1.18 : mouthM, 0.4, 1.3);
      av.browY = (0.11 - browGapM) * 60;

      // ---- portrait tracé : les vraies formes du visage, en vectoriel ----
      try {
        av.trace = buildTrace(L, W, H, isHair, hairMask, px, patch, hairPx.length, fw, fh, brow);
        if (av.trace) { av.face = "photo"; if (av.trace.hb || av.trace.hf) av.hair = "photo"; }
      } catch (e) { if (root.console) console.warn("tracé", e); }
      return { found: true, avatar: A.sanitize(av), traits: traits.filter(Boolean), quality: quality(L, W, H, skinL), debug: { eyeGapM: eyeGapM, eyeWM: eyeWM, mouthM: mouthM, browGapM: browGapM, ratio: ratio, jaw: jaw, ear: ear, wing: wing, nlen: nlen, fTop: fTop, fSide: fSide, fBelow: fBelow, fLow: fLow, hTop: hTop, wExt: wExt, chinD: chinD, jawD: jawD, mustD: mustD, bridge: bridge, sclera: sclera, browC: browC, browT: browT } };
    });
  }

  /* ---------------------------------------------------------------------
     PORTRAIT TRACÉ
     On reprend les contours réels (points du visage) et la silhouette réelle
     des cheveux (masque), ramenés dans le repère de l'avatar (tête ≈ 74 de large,
     menton en y = 98). Les expressions restent animables : yeux, sourcils et
     bouche sont redessinés selon l'humeur, à partir des formes mesurées.
     --------------------------------------------------------------------- */
  var OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
  var EYE_A = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7];
  var EYE_B = [263, 466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249];
  var LIPS = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];
  var BROW_A = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
  var BROW_B = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276];
  function inPoly(x, y, poly) {
    var c = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      if (((poly[i].y > y) !== (poly[j].y > y)) && (x < (poly[j].x - poly[i].x) * (y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x)) c = !c;
    }
    return c;
  }
  // plus grande composante connexe d'une grille binaire
  function largest(grid, cols, rows) {
    var lab = new Int32Array(cols * rows), best = 0, bestN = 0, id = 0;
    for (var i = 0; i < grid.length; i++) {
      if (!grid[i] || lab[i]) continue;
      id++; var n = 0, st = [i]; lab[i] = id;
      while (st.length) {
        var k = st.pop(), x = k % cols, y = (k / cols) | 0; n++;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          var nx = x + d[0], ny = y + d[1]; if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return;
          var q = ny * cols + nx; if (grid[q] && !lab[q]) { lab[q] = id; st.push(q); }
        });
      }
      if (n > bestN) { bestN = n; best = id; }
    }
    var out = new Uint8Array(cols * rows);
    for (var j = 0; j < out.length; j++) out[j] = lab[j] === best ? 1 : 0;
    return { grid: out, n: bestN };
  }
  // contour extérieur (suivi de Moore) d'une forme binaire
  function contour(g, cols, rows) {
    var at = function (x, y) { return x >= 0 && y >= 0 && x < cols && y < rows && g[y * cols + x]; };
    var sx = -1, sy = -1;
    for (var y = 0; y < rows && sx < 0; y++) for (var x = 0; x < cols; x++) if (at(x, y)) { sx = x; sy = y; break; }
    if (sx < 0) return [];
    var dirs = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]];
    var pts = [[sx, sy]], cx = sx, cy = sy, back = 0, guard = 0;
    do {
      var found = false;
      for (var i = 0; i < 8; i++) {
        var d = (back + 1 + i) % 8, nx = cx + dirs[d][0], ny = cy + dirs[d][1];
        if (at(nx, ny)) { back = (d + 4) % 8; cx = nx; cy = ny; pts.push([cx, cy]); found = true; break; }
      }
      if (!found) break;
    } while ((cx !== sx || cy !== sy) && guard++ < 6000);
    return pts;
  }
  function rdp(pts, eps) {
    if (pts.length < 3) return pts;
    var a = pts[0], b = pts[pts.length - 1], dmax = 0, idx = 0;
    for (var i = 1; i < pts.length - 1; i++) {
      var p = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      var d = Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
      if (d > dmax) { dmax = d; idx = i; }
    }
    if (dmax > eps) { var l = rdp(pts.slice(0, idx + 1), eps), r = rdp(pts.slice(idx), eps); return l.slice(0, -1).concat(r); }
    return [a, b];
  }
  function buildTrace(L, W, H, isHair, hairMask, px, patch, hairN, fw, fh, browRGB) {
    var cx = (L[234].x + L[454].x) / 2, chin = L[152].y, s = 74 / fw, sy = s * 0.9;
    var X = function (x) { return Math.round((60 + (x - cx) * s) * 10) / 10; };
    var Y = function (y) { return Math.round((98 + (y - chin) * sy) * 10) / 10; };
    var flat = function (ids) { var o = []; ids.forEach(function (i) { o.push(X(L[i].x), Y(L[i].y)); }); return o; };
    var t = { v: 1 };
    // le contour du visage s'arrête au milieu du front : on le prolonge jusqu'à la naissance des cheveux
    var eyeY = (L[159].y + L[386].y) / 2;
    var ext = OVAL.map(function (i) { var q = L[i]; return q.y < eyeY ? { x: q.x, y: eyeY - (eyeY - q.y) * 1.7 } : q; });
    t.face = []; ext.forEach(function (q) { t.face.push(X(q.x), Y(q.y)); });
    t.mo = Math.round(Math.hypot(L[13].x - L[14].x, L[13].y - L[14].y) / Math.max(1, Math.hypot(L[61].x - L[291].x, L[61].y - L[291].y)) * 100) / 100;
    t.eA = flat(EYE_A); t.eB = flat(EYE_B);
    t.bA = flat(BROW_A); t.bB = flat(BROW_B);
    t.lips = flat(LIPS);
    // nez : arête (un côté) + base des narines
    t.ns = flat([168, 6, 197, 195, 5, 4]);
    t.nb = flat([129, 98, 97, 2, 326, 327, 358]);
    if (L.length >= 478) {
      var ir = Math.hypot(L[468].x - L[469].x, L[468].y - L[469].y) * s;
      t.iA = [X(L[468].x), Y(L[468].y), Math.round(ir * 10) / 10];
      t.iB = [X(L[473].x), Y(L[473].y), Math.round(ir * 10) / 10];
    }
    t.ears = [X(L[234].x), Y(L[234].y), X(L[454].x), Y(L[454].y)];
    // couleur des lèvres et des sourcils
    var lip = []; [[0, 13], [14, 17]].forEach(function (pr) { var a = L[pr[0]], b = L[pr[1]]; lip = lip.concat(patch({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, 1)); });
    var lc = median(lip); t.lc = hex([lc[0] * 1.05, lc[1] * 0.85, lc[2] * 0.9]);
    t.bc = hex(browRGB);
    // cheveux : silhouette réelle (derrière) + mèches sur le front (devant)
    if (hairMask && hairN > 30) {
      var g = fw / 26, x0 = cx - fw * 1.7, y0 = L[10].y - fh * 1.0, cols = Math.round(fw * 3.4 / g), rows = Math.round((chin + fh * 1.5 - y0) / g);
      var oval = ext;
      var back = new Uint8Array(cols * rows), front = new Uint8Array(cols * rows);
      for (var yy = 0; yy < rows; yy++) for (var xx = 0; xx < cols; xx++) {
        var ix = x0 + (xx + 0.5) * g, iy = y0 + (yy + 0.5) * g;
        if (ix < 0 || iy < 0 || ix >= W || iy >= H) continue;
        if (isHair(ix, iy)) { back[yy * cols + xx] = 1; if (inPoly(ix, iy, oval)) front[yy * cols + xx] = 1; }
      }
      var toAv = function (pts) {
        var o = [];
        // contour fermé : on le coupe au point le plus éloigné du départ, puis on simplifie chaque moitié
        var far = 0, fd = -1;
        pts.forEach(function (q, i) { var d = Math.hypot(q[0] - pts[0][0], q[1] - pts[0][1]); if (d > fd) { fd = d; far = i; } });
        var simp = function (e) { return rdp(pts.slice(0, far + 1), e).slice(0, -1).concat(rdp(pts.slice(far), e).slice(0, -1)); };
        var eps = 0.9, sim = simp(eps);
        while (sim.length > 120 && eps < 6) { eps += 0.6; sim = simp(eps); }
        sim.forEach(function (q) { o.push(X(x0 + (q[0] + 0.5) * g), Math.min(170, Y(y0 + (q[1] + 0.5) * g))); });
        return o.length >= 6 && o.length <= 300 ? o : null;
      };
      var B = largest(back, cols, rows);
      if (B.n > 25) t.hb = toAv(contour(B.grid, cols, rows));
      var F = largest(front, cols, rows);
      if (F.n > 6) t.hf = toAv(contour(F.grid, cols, rows));
    }
    return t;
  }

  /* Qualité d'une prise de vue (sert au guidage en direct et aux conseils après import).
     Renvoie { ok, tip } : tip = conseil prioritaire à afficher. */
  function quality(L, W, H, skinL) {
    var fw = dist(L[234], L[454]) / W, cx = (L[234].x + L[454].x) / 2 / W, cy = (L[10].y + L[152].y) / 2 / H;
    var yaw = (L[1].x - (L[234].x + L[454].x) / 2) / dist(L[234], L[454]);
    var roll = Math.atan2(L[263].y - L[33].y, L[263].x - L[33].x) * 180 / Math.PI;
    var pitch = (L[1].y - (L[10].y + L[152].y) / 2) / dist(L[10], L[152]);
    var ear = (dist(L[159], L[145]) / dist(L[33], L[133]) + dist(L[386], L[374]) / dist(L[362], L[263])) / 2;
    var mouth = dist(L[13], L[14]) / dist(L[10], L[152]);
    var top = L[10].y / H - 0.2 * (L[152].y - L[10].y) / H;
    var tips = [];
    if (fw < 0.2) tips.push("Rapproche-toi un peu");
    else if (fw > 0.62) tips.push("Recule un peu");
    if (Math.abs(cx - 0.5) > 0.14 || Math.abs(cy - 0.47) > 0.16) tips.push("Centre ton visage dans l'ovale");
    if (top < 0.02) tips.push("Laisse voir le haut de ta tête (tes cheveux)");
    if (Math.abs(yaw) > 0.09) tips.push("Regarde bien en face");
    if (Math.abs(roll) > 9) tips.push("Garde la tête droite");
    if (pitch > 0.12) tips.push("Relève un peu le menton");
    else if (pitch < -0.04) tips.push("Baisse un peu le menton");
    if (skinL !== undefined && skinL < 60) tips.push("Il fait trop sombre : va vers la lumière");
    else if (skinL !== undefined && skinL > 225) tips.push("Trop de lumière : évite le contre-jour");
    if (ear < 0.17) tips.push("Ouvre bien les yeux");
    if (mouth > 0.09) tips.push("Ferme la bouche (un sourire, ça va)");
    return { ok: !tips.length, tip: tips[0] || "Parfait, ne bouge plus !", tips: tips };
  }

  // ---- guidage caméra en direct ----
  var videoLm = null;
  function live(video, cb) {
    var stop = false, last = 0, sc = document.createElement("canvas"), sg = sc.getContext("2d", { willReadFrequently: true });
    load().then(function () {
      return videoLm || import(abs(VENDOR + "vision_bundle.mjs")).then(function (V) {
        var fileset = { wasmLoaderPath: abs(VENDOR + "wasm/vision_wasm_internal.js"), wasmBinaryPath: abs(VENDOR + "wasm/vision_wasm_internal.wasm") };
        return V.FaceLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath: abs("assets/models/face_landmarker.task"), delegate: "CPU" }, runningMode: "VIDEO", numFaces: 2 });
      }).then(function (lm) { videoLm = lm; return lm; });
    }).then(function (lm) {
      function tick() {
        if (stop) return;
        var now = performance.now();
        if (video.readyState >= 2 && now - last > 160) {
          last = now;
          try {
            var r = lm.detectForVideo(video, now), W = video.videoWidth, H = video.videoHeight;
            if (!r.faceLandmarks || !r.faceLandmarks.length) cb({ ok: false, tip: "Je ne vois pas ton visage" });
            else if (r.faceLandmarks.length > 1) cb({ ok: false, tip: "Une seule personne sur la photo" });
            else {
              // miroir : la vidéo est affichée retournée, on raisonne sur l'image réelle
              var L = r.faceLandmarks[0].map(function (p) { return { x: p.x * W, y: p.y * H }; });
              sc.width = 24; sc.height = 24;
              var b = { x: L[234].x, y: L[10].y, w: L[454].x - L[234].x, h: L[152].y - L[10].y };
              sg.drawImage(video, b.x + b.w * 0.25, b.y + b.h * 0.35, b.w * 0.5, b.h * 0.4, 0, 0, 24, 24);
              var d = sg.getImageData(0, 0, 24, 24).data, sum = 0;
              for (var i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
              cb(quality(L, W, H, sum / (d.length / 4)));
            }
          } catch (e) { cb({ ok: false, tip: "" }); }
        }
        requestAnimationFrame(tick);
      }
      tick();
    }).catch(function () { cb({ ok: false, tip: "", off: true }); });
    return function () { stop = true; };
  }

  root.QV_FACE = { analyze: analyze, live: live, quality: quality, preload: function () { return load(); } };
})(window);
