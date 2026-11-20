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

      return { found: true, avatar: A.sanitize(av), traits: traits.filter(Boolean), debug: { ratio: ratio, jaw: jaw, ear: ear, wing: wing, nlen: nlen, fTop: fTop, fSide: fSide, fBelow: fBelow, fLow: fLow, hTop: hTop, wExt: wExt, chinD: chinD, jawD: jawD, mustD: mustD, bridge: bridge, sclera: sclera, browC: browC, browT: browT } };
    });
  }

  root.QV_FACE = { analyze: analyze, preload: function () { return load(); } };
})(window);
