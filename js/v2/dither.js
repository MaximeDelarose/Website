/* =========================================================================
   Écureuil Survivor · version « dithering » (jeu-dither.html)
   La direction artistique du logo et de Ronceclair : palette restreinte de teintes chaudes à 3 ou 4 tons,
   contours brun très sombre, et des transitions en damier (dithering de Bayer 2 × 2) à la place des dégradés lisses.

   Principe : à la fin de chaque image, tout le canevas du jeu est ramené à la palette ci-dessous.
   - Une couleur qui est (presque) dans la palette est remplacée telle quelle : les aplats des sprites restent francs.
   - Une couleur intermédiaire (ombres portées, lueurs, nuit, brume, transparences…) devient un damier
     entre les deux tons voisins de la palette : c'est là que le dithering apparaît.
   API : window.ES_DITHER.apply(ctx, largeur, hauteur)
   ========================================================================= */
(function () {
  "use strict";
  var PAL = [
    // l'écureuil du logo (assets/squirrel.png)
    "#4a2313", "#632e17", "#8a3f20", "#aa5324", "#bd5c25", "#e47f31", "#f09b40", "#efab5c",
    // bruns, bois, terre, contour
    "#2a1810", "#2e1a0a", "#3a2412", "#4a2d16", "#5a3a1c", "#6a4426", "#7a5230", "#8a5a2b", "#9a6a3a", "#c98a3a", "#d9a35a", "#f6cf94",
    // verts de la forêt
    "#1a2a10", "#1f5c33", "#2f5a24", "#3d8a4e", "#4fae5f", "#58b36a", "#79ad4c", "#b4dc78", "#9be8a8", "#7df0a0",
    // bleus (eau, glace, nuit)
    "#14141c", "#23212f", "#3a3850", "#4a5064", "#6e7488", "#5aa8ff", "#9ad7ff", "#e0f2ff", "#9aa4bc", "#b6bfd2",
    // violets
    "#3d2a6e", "#5a3d99", "#8f78c8", "#c9a6ff", "#f1e6ff",
    // rouges et roses
    "#7a1e38", "#a83030", "#d94f4f", "#e8584a", "#ff7b4a", "#d94f6f", "#ff9fb8", "#ffa9bd",
    // ors et jaunes
    "#8a5a14", "#c98a1f", "#e8a838", "#ffd257", "#fcd27a", "#fff0a0", "#fff6c8",
    // crèmes et neutres clairs
    "#e8d2b2", "#f3e4bf", "#fff3dd", "#fdf3de", "#cfd3d8", "#d6d6e0", "#ffffff", "#000000"
  ];
  var N = PAL.length, PR = new Uint8Array(N), PG = new Uint8Array(N), PB = new Uint8Array(N);
  PAL.forEach(function (h, i) { PR[i] = parseInt(h.substr(1, 2), 16); PG[i] = parseInt(h.substr(3, 2), 16); PB[i] = parseInt(h.substr(5, 2), 16); });

  // table de correspondance 32 × 32 × 32 : couleur la plus proche, deuxième ton du damier et proportion (0 à 16)
  var P1 = new Uint8Array(32768), P2 = new Uint8Array(32768), TT = new Uint8Array(32768);
  function dist(r, g, b, i) { var dr = r - PR[i], dg = g - PG[i], db = b - PB[i]; return 2 * dr * dr + 4 * dg * dg + 3 * db * db; }   // distance pondérée (l'œil est plus sensible au vert)
  (function build() {
    var near = new Array(N), ds = new Float64Array(N), k, i, j, r, g, b;
    for (r = 0; r < 32; r++) for (g = 0; g < 32; g++) for (b = 0; b < 32; b++) {
      var cr = r * 8 + 4, cg = g * 8 + 4, cb = b * 8 + 4, key = (r << 10) | (g << 5) | b;
      for (i = 0; i < N; i++) { ds[i] = dist(cr, cg, cb, i); near[i] = i; }
      near.sort(function (x, y) { return ds[x] - ds[y]; });
      var a = near[0], best = a, bt = 0, be = ds[a];
      for (j = 1; j < 5; j++) {
        var c2 = near[j], vr = PR[c2] - PR[a], vg = PG[c2] - PG[a], vb = PB[c2] - PB[a], vv = vr * vr + vg * vg + vb * vb;
        var t = ((cr - PR[a]) * vr + (cg - PG[a]) * vg + (cb - PB[a]) * vb) / vv; t = Math.max(0, Math.min(1, t));
        var er = cr - (PR[a] + vr * t), eg = cg - (PG[a] + vg * t), eb = cb - (PB[a] + vb * t), e = 2 * er * er + 4 * eg * eg + 3 * eb * eb;
        if (e < be - 1) { be = e; best = c2; bt = t; }
      }
      var q = Math.round(bt * 16); if (bt < 0.14) q = 0;                // presque dans la palette : aplat franc, pas de damier
      P1[key] = a; P2[key] = best; TT[key] = q;
    }
  })();

  var THR = [0.125 * 16, 0.625 * 16, 0.875 * 16, 0.375 * 16];             // damier de Bayer 2 × 2 : [[0, 2], [3, 1]]
  function apply(ctx, W, H) {
    var im = ctx.getImageData(0, 0, W, H), d = im.data, x, y, i = 0, k, c;
    for (y = 0; y < H; y++) {
      var row = (y & 1) * 2;
      for (x = 0; x < W; x++, i += 4) {
        k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
        c = TT[k] > THR[row + (x & 1)] ? P2[k] : P1[k];
        d[i] = PR[c]; d[i + 1] = PG[c]; d[i + 2] = PB[c];
      }
    }
    ctx.putImageData(im, 0, 0);
  }

  // le canevas du jeu est relu à chaque image : on le crée en mode « lecture fréquente »
  var orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, opts) {
    if (type === "2d" && this.classList && this.classList.contains("game-canvas")) opts = Object.assign({}, opts || {}, { willReadFrequently: true });
    return orig.call(this, type, opts);
  };
  window.ES_DITHER = { apply: apply, palette: PAL };
})();
