/* =========================================================================
   Merger — dessin des personnages (partagé par le mode Solo et le mode Coop)
   Tout est dessiné au canvas, aucune image.

   window.MergerArt :
     SQUIRRELS              → les 12 écureuils (couleurs, silhouette, expression, accessoire)
     draw(g, x, y, type, r, o)   → dessine un écureuil (o : voir drawSquirrel)
     drawPower(g, kind, x, y, r, o) → dessine un power-up (grenade, rainbow, lightning, bomb)
     cache()                → cache de sprites : { blit(ctx, x, y, type, r, px, o), clear() }
     lighten(hex)

   Chaque écureuil se reconnaît même sans couleur grâce à sa SILHOUETTE :
   forme des oreilles (ears), forme de la queue (tail) et accessoire (acc).
   ========================================================================= */
(function () {
  "use strict";

  var SQUIRRELS = [
    { name: "Rosette",   body: "#f2a7a0", dark: "#c46f68", fur: "belly",      eyes: "sparkle",   mouth: "smile", blush: 1.4,
      ears: "round",  tail: "curl",   acc: "bow" },
    { name: "Noisette",  body: "#f6c453", dark: "#c99520", fur: "stripes",    eyes: "happy",     mouth: "open",
      ears: "pointy", tail: "puff",   acc: "acornhat" },
    { name: "Mousse",    body: "#9fcf6e", dark: "#6a9a3e", fur: "freckles",   eyes: "sleepy",    mouth: "smile",
      ears: "small",  tail: "long",   acc: "leaf" },
    { name: "Myrtille",  body: "#7fb0e8", dark: "#4f7fbb", fur: "cheekfluff", eyes: "glasses",   mouth: "smug",
      ears: "round",  tail: "curl",   acc: "" },
    { name: "Grisou",    body: "#b6b3cc", dark: "#7f7b99", fur: "spiky",      eyes: "normal",    mouth: "flat",  brow: "angry",
      ears: "tufted", tail: "spiky",  acc: "" },
    { name: "Roux",      body: "#e8873a", dark: "#b0581a", fur: "chest",      eyes: "wink",      mouth: "grin",
      ears: "fox",    tail: "curl",   acc: "scarf" },
    { name: "Châtaigne", body: "#a8673f", dark: "#6f3c20", fur: "mask",       eyes: "puppy",     mouth: "teeth",
      ears: "floppy", tail: "puff",   acc: "" },
    { name: "Flocon",    body: "#fdf3de", dark: "#cdb58a", fur: "curls",      eyes: "surprised", mouth: "o",     nose: "#e86a8a",
      ears: "round",  tail: "puff",   acc: "earmuffs" },
    { name: "Corbeau",   body: "#45415a", dark: "#24212f", fur: "star",       eyes: "slit",      mouth: "fang",  face: "#5f5a77", eyeC: "#f6d36b", nose: "#f6d36b",
      ears: "pointy", tail: "long",   acc: "" },
    { name: "Cerise",    body: "#e0544b", dark: "#a3302a", fur: "tiger",      eyes: "normal",    mouth: "open",  brow: "angry",
      ears: "tufted", tail: "spiky",  acc: "headband" },
    { name: "Lagon",     body: "#5cc6c0", dark: "#2f8f8a", fur: "swirl",      eyes: "starry",    mouth: "smile",
      ears: "small",  tail: "curl",   acc: "propeller" },
    { name: "Lilas",     body: "#a982dc", dark: "#7652a8", fur: "bangs",      eyes: "dreamy",    mouth: "w",     blush: 1.5,
      ears: "round",  tail: "long",   acc: "flower" },
  ];

  var TAU = Math.PI * 2;

  function lighten(hex, amt) {
    var a = amt == null ? 50 : amt;
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return "rgb(" + Math.min(255, r + a) + "," + Math.min(255, g + a) + "," + Math.min(255, b + a) + ")";
  }

  /* ---------- un écureuil ----------
     o = { blink (<0 = yeux fermés), alpha, flip (-1|1 : côté de la queue),
           lx, ly (regard -1..1), mood ("happy" | "worried" | "pop"),
           wag (queue -1..1), part ("tail" | "body" | tout) } */
  function drawSquirrel(g, x, y, type, r, o) {
    o = o || {};
    var c = SQUIRRELS[type], f = o.flip || 1, blink = o.blink == null ? 1 : o.blink;
    var lx = o.lx || 0, ly = o.ly || 0, mood = o.mood || "", wag = o.wag || 0;
    var line = "#2b1709", lw = Math.max(1.2, r * 0.08), lite = lighten(c.body), dk = c.dark;
    g.save();
    g.globalAlpha = o.alpha == null ? 1 : o.alpha;
    g.translate(x, y);
    g.strokeStyle = line; g.lineWidth = lw; g.lineJoin = "round"; g.lineCap = "round";
    function ell(cx, cy, rx, ry, rot, fill, stroke) { g.beginPath(); g.ellipse(cx, cy, rx, ry, rot || 0, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) g.stroke(); }
    function poly(pts, fill, stroke) { g.beginPath(); g.moveTo(pts[0] * r, pts[1] * r); for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i] * r, pts[i + 1] * r); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) g.stroke(); }

    /* --- la queue (derrière, elle remue autour de sa base) --- */
    if (o.part !== "body") {
      g.save();
      g.translate(f * r * 0.6, r * 0.3); g.rotate(f * wag * 0.16); g.translate(-f * r * 0.6, -r * 0.3);
      switch (c.tail) {
        case "puff":   // gros nuage rond
          [[0.86, -0.1, 0.42], [0.98, -0.55, 0.36], [0.7, -0.92, 0.32]].forEach(function (p) { ell(f * p[0] * r, p[1] * r, p[2] * r, p[2] * r, 0, dk, true); });
          [[0.86, -0.1, 0.3], [0.98, -0.55, 0.25], [0.7, -0.92, 0.22]].forEach(function (p) { ell(f * p[0] * r, p[1] * r, p[2] * r, p[2] * r, 0, dk); });
          ell(f * 0.66 * r, -0.98 * r, 0.12 * r, 0.12 * r, 0, lighten(dk));
          break;
        case "spiky":  // queue en zigzag
          poly([f * 0.55, 0.45, f * 1.15, 0.2, f * 0.98, 0.0, f * 1.32, -0.25, f * 1.05, -0.42, f * 1.3, -0.75, f * 0.95, -0.82, f * 1.0, -1.2, f * 0.62, -0.95, f * 0.5, -0.3], dk, true);
          poly([f * 0.72, 0.1, f * 1.0, -0.2, f * 0.92, -0.6, f * 0.72, -0.8, f * 0.66, -0.3], lighten(dk));
          break;
        case "long":   // fine et haute, bout recourbé
          g.save(); g.translate(f * r * 0.82, -r * 0.45); g.rotate(f * 0.18);
          ell(0, 0, r * 0.24, r * 0.82, 0, dk, true);
          ell(f * r * 0.04, -r * 0.1, r * 0.1, r * 0.55, 0, lighten(dk));
          g.restore();
          ell(f * r * 0.62, -r * 1.28, r * 0.2, r * 0.17, f * 0.4, dk, true);
          break;
        default:       // "curl" : la queue d'écureuil classique
          g.save(); g.translate(f * r * 0.78, -r * 0.3); g.rotate(f * 0.35);
          ell(0, 0, r * 0.42, r * 0.8, 0, dk, true);
          ell(f * r * 0.06, -r * 0.1, r * 0.2, r * 0.55, 0, lighten(dk));
          g.restore();
          ell(f * r * 0.5, -r * 1.02, r * 0.3, r * 0.3, 0, dk, true);
          ell(f * r * 0.46, -r * 1.06, r * 0.14, r * 0.14, 0, lighten(dk));
      }
      g.restore();
    }
    if (o.part === "tail") { g.restore(); return; }

    /* --- touffes de joues et oreilles (derrière le corps) --- */
    if (c.fur === "cheekfluff") [-1, 1].forEach(function (s) {
      poly([s * 0.88, -0.2, s * 1.2, -0.06, s * 0.98, 0.04, s * 1.22, 0.18, s * 0.96, 0.26, s * 1.12, 0.4, s * 0.85, 0.45], c.body, true);
    });
    [-1, 1].forEach(function (s) {
      switch (c.ears) {
        case "pointy":
          poly([s * 0.22, -0.78, s * 0.46, -1.36, s * 0.74, -0.6], c.body, true);
          poly([s * 0.34, -0.8, s * 0.47, -1.18, s * 0.62, -0.72], "#f7b6a4");
          break;
        case "fox":     // grandes oreilles de renard, bout sombre
          poly([s * 0.16, -0.8, s * 0.58, -1.45, s * 0.86, -0.5], c.body, true);
          poly([s * 0.46, -1.24, s * 0.58, -1.45, s * 0.7, -1.12], "#3a2214");
          poly([s * 0.3, -0.82, s * 0.56, -1.2, s * 0.72, -0.66], "#f7d8c4");
          break;
        case "tufted":  // rondes avec de longues touffes
          ell(s * r * 0.45, -r * 0.82, r * 0.17, r * 0.26, s * 0.25, c.body, true);
          poly([s * 0.34, -1.0, s * 0.42, -1.5, s * 0.5, -1.18, s * 0.62, -1.42, s * 0.6, -0.98], dk, true);
          break;
        case "small":
          ell(s * r * 0.5, -r * 0.8, r * 0.13, r * 0.16, s * 0.3, c.body, true);
          ell(s * r * 0.5, -r * 0.79, r * 0.06, r * 0.09, s * 0.3, "#f7b6a4");
          break;
        case "floppy":  // dessinées devant le corps, plus bas
          break;
        default:        // "round"
          ell(s * r * 0.45, -r * 0.82, r * 0.17, r * 0.26, s * 0.25, c.body, true);
          ell(s * r * 0.45, -r * 0.8, r * 0.08, r * 0.15, s * 0.25, "#f7b6a4");
          poly([s * 0.4, -1.04, s * 0.5, -1.24, s * 0.56, -1.02], dk);
      }
    });

    /* --- corps + motifs de fourrure (découpés dans la boule) --- */
    var gr = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    gr.addColorStop(0, lite); gr.addColorStop(0.7, c.body); gr.addColorStop(1, dk);
    g.fillStyle = gr;
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.save();
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.clip();
    var face = c.face || "rgba(253,243,222,.88)";
    switch (c.fur) {
      case "belly": ell(0, r * 0.42, r * 0.62, r * 0.5, 0, face); break;
      case "stripes":
        g.strokeStyle = dk; g.lineWidth = r * 0.1;
        g.beginPath(); g.moveTo(0, -r); g.lineTo(0, -r * 0.42); g.moveTo(-r * 0.2, -r); g.lineTo(-r * 0.14, -r * 0.5); g.moveTo(r * 0.2, -r); g.lineTo(r * 0.14, -r * 0.5); g.stroke();
        break;
      case "freckles":
        ell(-r * 0.42, -r * 0.6, r * 0.13, r * 0.1, 0.4, lite); ell(r * 0.38, -r * 0.7, r * 0.08, r * 0.07, 0, lite); ell(r * 0.62, -r * 0.42, r * 0.06, r * 0.05, 0, lite);
        break;
      case "chest": ell(0, -r * 0.62, r * 0.13, r * 0.42, 0, face); break;
      case "mask": [-1, 1].forEach(function (s) { ell(s * r * 0.3, -r * 0.13, r * 0.23, r * 0.2, s * 0.3, "rgba(60,30,15,.45)"); }); break;
      case "tiger":
        g.strokeStyle = dk; g.lineWidth = r * 0.09;
        [-1, 1].forEach(function (s) { for (var i = 0; i < 3; i++) { g.beginPath(); g.moveTo(s * r, -r * 0.45 + i * r * 0.28); g.quadraticCurveTo(s * r * 0.8, -r * 0.38 + i * r * 0.28, s * r * 0.68, -r * 0.5 + i * r * 0.28); g.stroke(); } });
        break;
      case "swirl":
        g.strokeStyle = lite; g.lineWidth = r * 0.07;
        g.beginPath(); g.arc(0, -r * 0.6, r * 0.14, 0.5, TAU - 0.3); g.stroke();
        g.beginPath(); g.arc(r * 0.02, -r * 0.6, r * 0.06, 0, Math.PI * 1.4); g.stroke();
        break;
      case "bangs":
        [-0.34, 0, 0.34].forEach(function (cx, i) { ell(cx * r, -r * (0.8 - (i === 1 ? 0.06 : 0)), r * 0.25, r * 0.23, 0, dk); });
        break;
    }
    ell(0, r * 0.3, r * 0.48, r * 0.4, 0, face);       // museau
    if (c.fur === "freckles") [-1, 1].forEach(function (s) { [[0.5, 0.06], [0.42, 0.13], [0.58, 0.15]].forEach(function (p) { ell(s * p[0] * r, p[1] * r, r * 0.03, r * 0.03, 0, dk); }); });
    if (c.acc === "headband") {   // bandeau de sport sur le front
      g.fillStyle = "#fdf3de"; g.fillRect(-r, -r * 0.7, r * 2, r * 0.17);
      g.fillStyle = "#3a7bd5"; g.fillRect(-r, -r * 0.64, r * 2, r * 0.05);
    }
    if (c.acc === "scarf") {      // écharpe autour du cou
      g.fillStyle = "#2f9e8f"; g.fillRect(-r, r * 0.56, r * 2, r * 0.26);
      g.fillStyle = "#e8f6f1"; for (var si = -4; si <= 4; si++) g.fillRect(si * r * 0.24 - r * 0.04, r * 0.56, r * 0.08, r * 0.26);
    }
    g.restore();
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();

    /* --- devant : oreilles tombantes, coiffures, accessoires --- */
    if (c.ears === "floppy") [-1, 1].forEach(function (s) {
      ell(s * r * 0.86, -r * 0.3, r * 0.2, r * 0.44, s * 0.45, dk, true);
      ell(s * r * 0.84, -r * 0.26, r * 0.09, r * 0.28, s * 0.45, lighten(dk, 30));
    });
    if (c.fur === "spiky") poly([-0.3, -0.9, -0.3, -1.2, -0.13, -1.0, 0.02, -1.3, 0.14, -0.99, 0.32, -1.16, 0.3, -0.88, 0, -0.96], dk, true);
    if (c.fur === "curls") [[-0.3, -0.86], [0.3, -0.86], [-0.12, -0.98], [0.14, -0.98]].forEach(function (p) { ell(p[0] * r, p[1] * r, r * 0.17, r * 0.17, 0, lite, true); });
    if (c.fur === "star") {
      g.beginPath();
      for (var k = 0; k < 10; k++) { var a = -Math.PI / 2 + k * Math.PI / 5, rad = (k % 2 ? 0.07 : 0.16) * r; g.lineTo(Math.cos(a) * rad, -r * 0.6 + Math.sin(a) * rad); }
      g.closePath(); g.fillStyle = "#8f88b8"; g.fill();
    }
    if (c.fur === "tiger") { g.strokeStyle = dk; g.lineWidth = r * 0.09; g.beginPath(); g.moveTo(0, -r * 0.98); g.lineTo(0, -r * 0.72); g.stroke(); g.strokeStyle = line; g.lineWidth = lw; }
    switch (c.acc) {
      case "leaf":
        g.save(); g.translate(-f * r * 0.12, -r * 0.98); g.rotate(-f * 0.5);
        ell(0, -r * 0.14, r * 0.1, r * 0.2, 0, "#3f8a3a", true);
        g.strokeStyle = "#9fd77e"; g.lineWidth = Math.max(1, r * 0.03); g.beginPath(); g.moveTo(0, -r * 0.3); g.lineTo(0, r * 0.04); g.stroke();
        g.restore(); g.strokeStyle = line; g.lineWidth = lw;
        break;
      case "bow":
        g.save(); g.translate(-f * r * 0.45, -r * 1.02); g.lineWidth = Math.max(1, lw * 0.7);
        poly([0, 0, -0.26, -0.17, -0.26, 0.17], "#e8506e", true); poly([0, 0, 0.26, -0.17, 0.26, 0.17], "#e8506e", true);
        ell(0, 0, r * 0.07, r * 0.07, 0, "#ff8fa8", true);
        g.restore(); g.lineWidth = lw;
        break;
      case "acornhat":   // chapeau-gland incliné
        g.save(); g.translate(0, -r * 0.9); g.rotate(-f * 0.22);
        g.beginPath(); g.ellipse(0, 0, r * 0.5, r * 0.3, 0, Math.PI, TAU); g.closePath(); g.fillStyle = "#8a5a2b"; g.fill(); g.stroke();
        g.strokeStyle = "#5e3a18"; g.lineWidth = Math.max(1, lw * 0.5);
        for (var hi = -2; hi <= 2; hi++) { g.beginPath(); g.moveTo(hi * r * 0.16 - r * 0.08, -r * 0.02); g.lineTo(hi * r * 0.16 + r * 0.06, -r * 0.24); g.stroke(); }
        g.strokeStyle = line; g.lineWidth = lw;
        g.fillStyle = "#6b4220"; g.fillRect(-r * 0.05, -r * 0.44, r * 0.1, r * 0.16); g.strokeRect(-r * 0.05, -r * 0.44, r * 0.1, r * 0.16);
        g.restore();
        break;
      case "scarf":      // bout de l'écharpe qui pend
        poly([-f * 0.55, 0.62, -f * 0.75, 1.08, -f * 0.5, 1.12, -f * 0.36, 0.7], "#2f9e8f", true);
        break;
      case "earmuffs":
        g.lineWidth = r * 0.1; g.strokeStyle = "#e86a8a"; g.beginPath(); g.arc(0, -r * 0.2, r * 0.82, Math.PI * 1.12, Math.PI * 1.88); g.stroke();
        g.lineWidth = lw; g.strokeStyle = line;
        [-1, 1].forEach(function (s) { ell(s * r * 0.78, -r * 0.5, r * 0.22, r * 0.22, 0, "#ff9fb5", true); ell(s * r * 0.74, -r * 0.55, r * 0.08, r * 0.08, 0, "#ffd1dc"); });
        break;
      case "headband":   // nœud du bandeau
        poly([f * 0.86, -0.62, f * 1.18, -0.78, f * 1.1, -0.44], "#fdf3de", true);
        break;
      case "propeller":  // petite casquette à hélice
        g.beginPath(); g.ellipse(0, -r * 0.84, r * 0.46, r * 0.32, 0, Math.PI, TAU); g.closePath();
        g.fillStyle = "#f6d36b"; g.fill(); g.stroke();
        g.save(); g.beginPath(); g.ellipse(0, -r * 0.84, r * 0.46, r * 0.32, 0, Math.PI, TAU); g.clip();
        g.fillStyle = "#e8506e"; g.fillRect(-r * 0.16, -r * 1.2, r * 0.32, r * 0.4); g.restore();
        g.beginPath(); g.ellipse(0, -r * 0.84, r * 0.46, r * 0.32, 0, Math.PI, TAU); g.stroke();
        g.fillStyle = line; g.fillRect(-r * 0.025, -r * 1.3, r * 0.05, r * 0.16);
        ell(-r * 0.2, -r * 1.3, r * 0.2, r * 0.06, -0.1, "#3a7bd5", true); ell(r * 0.2, -r * 1.3, r * 0.2, r * 0.06, 0.1, "#e8506e", true);
        break;
      case "flower":
        g.save(); g.translate(-f * r * 0.56, -r * 0.82);
        for (var pi = 0; pi < 5; pi++) { var pa = pi * TAU / 5; ell(Math.cos(pa) * r * 0.15, Math.sin(pa) * r * 0.15, r * 0.13, r * 0.13, 0, "#fff3fb", true); }
        ell(0, 0, r * 0.1, r * 0.1, 0, "#f6c453", true);
        g.restore();
        break;
    }

    /* --- yeux (qui regardent) --- */
    var ex = r * 0.3, ey = -r * 0.14, px = lx * r * 0.045, py = ly * r * 0.045;
    var eyeC = c.eyeC || "#2b1709";
    function closed(s, up) { g.strokeStyle = eyeC; g.lineWidth = lw; g.beginPath(); if (up) g.arc(s * ex, ey + r * 0.04, r * 0.1, Math.PI + 0.35, TAU - 0.35); else g.arc(s * ex, ey - r * 0.04, r * 0.1, 0.35, Math.PI - 0.35); g.stroke(); }
    function dot(s, w, h, col) { ell(s * ex + px, ey + py, w, h, 0, col || eyeC); }
    function shine(s, sz, dx, dy) { ell(s * ex + px - r * (dx == null ? 0.035 : dx), ey + py - r * (dy == null ? 0.06 : dy), r * sz, r * sz, 0, "#fff"); }
    function lashes(s) { g.strokeStyle = eyeC; g.lineWidth = Math.max(1, lw * 0.6); g.beginPath(); g.moveTo(s * (ex + r * 0.1), ey - r * 0.1); g.lineTo(s * (ex + r * 0.19), ey - r * 0.17); g.moveTo(s * (ex + r * 0.04), ey - r * 0.15); g.lineTo(s * (ex + r * 0.09), ey - r * 0.24); g.stroke(); }
    var eyes = c.eyes;
    if (mood === "happy" && eyes !== "slit" && eyes !== "glasses") eyes = "happy";
    if (mood === "pop") eyes = "pop";
    [-1, 1].forEach(function (s) {
      if (blink < 0 && eyes !== "happy" && eyes !== "pop") { closed(s); return; }
      switch (eyes) {
        case "pop":   // > < juste avant d'éclater
          g.strokeStyle = eyeC; g.lineWidth = lw; g.beginPath();
          g.moveTo(s * ex - s * r * 0.1, ey - r * 0.09); g.lineTo(s * ex + s * r * 0.06, ey); g.lineTo(s * ex - s * r * 0.1, ey + r * 0.09); g.stroke();
          break;
        case "sparkle": dot(s, r * 0.14, r * 0.17); shine(s, 0.06); shine(s, 0.03, -0.04, -0.06); lashes(s); break;
        case "happy": closed(s, true); break;
        case "sleepy":
          g.beginPath(); g.ellipse(s * ex, ey - r * 0.02, r * 0.12, r * 0.12, 0, 0, Math.PI); g.fillStyle = eyeC; g.fill();
          g.strokeStyle = eyeC; g.lineWidth = lw; g.beginPath(); g.moveTo(s * ex - r * 0.14, ey - r * 0.02); g.lineTo(s * ex + r * 0.14, ey - r * 0.02); g.stroke();
          ell(s * ex - r * 0.04, ey + r * 0.03, r * 0.025, r * 0.025, 0, "#fff");
          break;
        case "glasses": dot(s, r * 0.08, r * 0.1); shine(s, 0.03, 0.02, 0.04); break;
        case "wink": if (s === 1) { g.strokeStyle = eyeC; g.lineWidth = lw; g.beginPath(); g.moveTo(s * ex - r * 0.1, ey - r * 0.08); g.lineTo(s * ex + r * 0.06, ey); g.lineTo(s * ex - r * 0.1, ey + r * 0.08); g.stroke(); } else { dot(s, r * 0.12, r * 0.15); shine(s, 0.05); } break;
        case "puppy": dot(s, r * 0.16, r * 0.19); shine(s, 0.075, 0.05, 0.07); shine(s, 0.035, -0.06, -0.06); break;
        case "surprised": ell(s * ex, ey, r * 0.14, r * 0.15, 0, "#fff", true); dot(s, r * 0.05, r * 0.05); break;
        case "slit": ell(s * ex + px, ey + py, r * 0.13, r * 0.15, 0, eyeC); ell(s * ex + px, ey + py, r * 0.035, r * 0.12, 0, "#1a1622"); shine(s, 0.03, 0.05, 0.07); break;
        case "starry":
          dot(s, r * 0.14, r * 0.16);
          g.beginPath();
          for (var k2 = 0; k2 < 10; k2++) { var a2 = -Math.PI / 2 + k2 * Math.PI / 5, rad2 = (k2 % 2 ? 0.035 : 0.085) * r; g.lineTo(s * ex + px + Math.cos(a2) * rad2, ey + py - r * 0.02 + Math.sin(a2) * rad2); }
          g.closePath(); g.fillStyle = "#fff"; g.fill();
          break;
        case "dreamy": dot(s, r * 0.12, r * 0.15); shine(s, 0.045, 0.02, 0.08); shine(s, 0.025, -0.05, 0.02); lashes(s); break;
        default: dot(s, r * 0.12, r * 0.15); shine(s, 0.05);
      }
    });
    if (c.eyes === "glasses") {
      g.strokeStyle = "#2b1709"; g.lineWidth = Math.max(1, lw * 0.8);
      [-1, 1].forEach(function (s) { g.beginPath(); g.arc(s * ex, ey, r * 0.17, 0, TAU); g.stroke(); });
      g.beginPath(); g.moveTo(-ex + r * 0.17, ey); g.quadraticCurveTo(0, ey - r * 0.06, ex - r * 0.17, ey); g.stroke();
      g.fillStyle = "rgba(255,255,255,.35)"; [-1, 1].forEach(function (s) { g.beginPath(); g.arc(s * ex, ey, r * 0.16, 3.6, 4.6); g.lineTo(s * ex, ey); g.fill(); });
    }
    var brow = mood === "worried" ? "worried" : c.brow;
    if (brow) {
      var k3 = brow === "angry" ? 0.07 : -0.07;
      g.strokeStyle = line; g.lineWidth = Math.max(1.2, r * 0.07);
      [-1, 1].forEach(function (s) { g.beginPath(); g.moveTo(s * r * 0.14, ey - r * 0.24 + k3 * r); g.lineTo(s * r * 0.44, ey - r * 0.24 - k3 * r); g.stroke(); });
    }

    /* --- joues, nez, bouche --- */
    g.fillStyle = "rgba(240,110,110," + (0.42 * (c.blush || 1)) + ")";
    [-1, 1].forEach(function (s) { g.beginPath(); g.ellipse(s * r * 0.5, r * 0.16, r * 0.14 * (c.blush || 1), r * 0.09, 0, 0, TAU); g.fill(); });
    ell(0, r * 0.1, r * 0.08, r * 0.055, 0, c.nose || "#5a2f1c");
    var mouth = c.mouth;
    if (mood === "happy" && mouth !== "grin" && mouth !== "fang") mouth = "open";
    if (mood === "worried") mouth = "wobble";
    if (mood === "pop") mouth = "o";
    g.strokeStyle = line; g.lineWidth = Math.max(1, lw * 0.7);
    function teeth(w, h) { g.fillStyle = "#fff"; g.lineWidth = Math.max(1, lw * 0.5); g.beginPath(); g.rect(-r * w / 2, r * 0.235, r * w, r * h); g.fill(); g.stroke(); g.beginPath(); g.moveTo(0, r * 0.235); g.lineTo(0, r * (0.235 + h)); g.stroke(); }
    function smile() { g.beginPath(); g.moveTo(0, r * 0.15); g.lineTo(0, r * 0.22); g.moveTo(-r * 0.13, r * 0.2); g.quadraticCurveTo(0, r * 0.28, r * 0.13, r * 0.2); g.stroke(); }
    switch (mouth) {
      case "open":
        g.beginPath(); g.moveTo(-r * 0.16, r * 0.19); g.quadraticCurveTo(0, r * 0.46, r * 0.16, r * 0.19); g.closePath(); g.fillStyle = "#7a2a2a"; g.fill(); g.stroke();
        ell(0, r * 0.32, r * 0.07, r * 0.04, 0, "#e86a7a");
        g.fillStyle = "#fff"; g.fillRect(-r * 0.065, r * 0.2, r * 0.13, r * 0.06);
        break;
      case "o": ell(0, r * 0.27, r * 0.05, r * 0.065, 0, "#7a2a2a", true); break;
      case "smug": g.beginPath(); g.moveTo(-r * 0.12, r * 0.23); g.quadraticCurveTo(r * 0.04, r * 0.28, r * 0.16, r * 0.16); g.stroke(); break;
      case "flat": g.beginPath(); g.moveTo(-r * 0.11, r * 0.23); g.lineTo(r * 0.11, r * 0.23); g.stroke(); break;
      case "grin":
        g.beginPath(); g.moveTo(-r * 0.24, r * 0.17); g.quadraticCurveTo(0, r * 0.44, r * 0.24, r * 0.17); g.closePath(); g.fillStyle = "#fff"; g.fill(); g.stroke();
        g.lineWidth = Math.max(1, lw * 0.4); g.beginPath(); g.moveTo(-r * 0.2, r * 0.23); g.lineTo(r * 0.2, r * 0.23); g.moveTo(-r * 0.08, r * 0.18); g.lineTo(-r * 0.08, r * 0.32); g.moveTo(r * 0.08, r * 0.18); g.lineTo(r * 0.08, r * 0.32); g.stroke();
        break;
      case "teeth": smile(); teeth(0.2, 0.17); break;
      case "fang":
        g.beginPath(); g.moveTo(-r * 0.14, r * 0.2); g.quadraticCurveTo(0, r * 0.27, r * 0.15, r * 0.17); g.stroke();
        poly([0.04, 0.225, 0.11, 0.21, 0.08, 0.31], "#fff", true);
        break;
      case "w": g.beginPath(); g.arc(-r * 0.07, r * 0.19, r * 0.07, 0.2, Math.PI - 0.2); g.arc(r * 0.07, r * 0.19, r * 0.07, 0.2, Math.PI - 0.2); g.stroke(); break;
      case "wobble": g.beginPath(); g.moveTo(-r * 0.14, r * 0.25); for (var i = 1; i <= 4; i++) g.lineTo(-r * 0.14 + i * r * 0.07, r * (i % 2 ? 0.21 : 0.25)); g.stroke(); break;
      default: smile(); teeth(0.15, 0.12);
    }
    if (mood === "worried") {
      g.beginPath(); g.moveTo(-f * r * 0.72, -r * 0.62); g.quadraticCurveTo(-f * r * 0.86, -r * 0.4, -f * r * 0.72, -r * 0.36); g.quadraticCurveTo(-f * r * 0.58, -r * 0.4, -f * r * 0.72, -r * 0.62);
      g.fillStyle = "#9fdcff"; g.fill(); g.lineWidth = Math.max(1, lw * 0.5); g.strokeStyle = "#2b6a8a"; g.stroke();
    }
    g.restore();
  }

  /* ---------- les power-ups ----------
     kind : "grenade" | "rainbow" | "lightning" | "bomb" ; o = { t (temps, pour animer), count (bombe) } */
  var POWERS = {
    grenade:   { name: "Grenade",            desc: "Explose en touchant : souffle tout autour." },
    rainbow:   { name: "Arc-en-ciel",        desc: "Joker : prend la couleur qui complète le meilleur groupe." },
    lightning: { name: "Éclair",             desc: "Foudroie toute la colonne qu'il touche." },
    bomb:      { name: "Bombe à retardement", desc: "Se pose, puis explose après 3 tirs." },
  };
  function drawPower(g, kind, x, y, r, o) {
    o = o || {};
    var t = o.t || 0, line = "#2b1709", lw = Math.max(1.2, r * 0.08);
    g.save(); g.translate(x, y); g.lineJoin = "round"; g.lineCap = "round";
    if (o.alpha != null) g.globalAlpha = o.alpha;
    function face(col, happy) {
      g.fillStyle = col || "#2b1709";
      if (happy) { g.strokeStyle = col || line; g.lineWidth = lw; [-1, 1].forEach(function (s) { g.beginPath(); g.arc(s * r * 0.28, -r * 0.02, r * 0.1, Math.PI + 0.4, TAU - 0.4); g.stroke(); }); }
      else [-1, 1].forEach(function (s) { g.beginPath(); g.ellipse(s * r * 0.28, -r * 0.05, r * 0.09, r * 0.12, 0, 0, TAU); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(s * r * 0.28 - r * 0.03, -r * 0.1, r * 0.035, 0, TAU); g.fill(); g.fillStyle = col || "#2b1709"; });
      g.strokeStyle = col || line; g.lineWidth = Math.max(1, lw * 0.7);
      g.beginPath(); g.arc(0, r * 0.14, r * 0.12, 0.3, Math.PI - 0.3); g.stroke();
    }
    g.strokeStyle = line; g.lineWidth = lw;
    if (kind === "grenade") {
      // pomme de pin explosive
      var gg = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      gg.addColorStop(0, "#9bc06a"); gg.addColorStop(1, "#3e6b2b");
      g.fillStyle = gg; g.beginPath(); g.ellipse(0, 0, r * 0.92, r, 0, 0, TAU); g.fill(); g.stroke();
      g.save(); g.beginPath(); g.ellipse(0, 0, r * 0.92, r, 0, 0, TAU); g.clip();
      g.strokeStyle = "rgba(30,60,20,.55)"; g.lineWidth = r * 0.07;
      for (var i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(-r, i * r * 0.36 - r * 0.3); g.lineTo(r, i * r * 0.36 + r * 0.3); g.stroke(); g.beginPath(); g.moveTo(-r, i * r * 0.36 + r * 0.3); g.lineTo(r, i * r * 0.36 - r * 0.3); g.stroke(); }
      g.restore();
      g.strokeStyle = line; g.lineWidth = lw;
      g.fillStyle = "#6f7d86"; g.fillRect(-r * 0.22, -r * 1.18, r * 0.44, r * 0.26); g.strokeRect(-r * 0.22, -r * 1.18, r * 0.44, r * 0.26);
      g.beginPath(); g.arc(r * 0.38, -r * 1.1, r * 0.16, 0, TAU); g.strokeStyle = "#c8cdd1"; g.lineWidth = lw * 0.8; g.stroke();
      // étincelle
      var sp = 0.6 + 0.4 * Math.sin(t * 30);
      g.fillStyle = "rgba(255,210,90," + sp + ")"; g.beginPath(); g.arc(-r * 0.05, -r * 1.3, r * 0.12 * (0.8 + sp * 0.4), 0, TAU); g.fill();
      face("#1d2e14");
    } else if (kind === "rainbow") {
      var cols = ["#ff6b6b", "#ffb347", "#ffe66d", "#7bd389", "#6bb7ff", "#b38cff"];
      g.save(); g.rotate(t * 1.5);
      for (var k = 0; k < 6; k++) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, k * TAU / 6, (k + 1) * TAU / 6); g.closePath(); g.fillStyle = cols[k]; g.fill(); }
      g.restore();
      var rg = g.createRadialGradient(0, 0, 0, 0, 0, r);
      rg.addColorStop(0, "rgba(255,255,255,.95)"); rg.addColorStop(0.55, "rgba(255,255,255,.5)"); rg.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = rg; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
      g.strokeStyle = line; g.lineWidth = lw; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
      for (var s2 = 0; s2 < 3; s2++) {
        var a = t * 2 + s2 * 2.1, sx = Math.cos(a) * r * 1.15, sy = Math.sin(a) * r * 1.15, ss = r * 0.16 * (0.7 + 0.3 * Math.sin(t * 6 + s2));
        g.fillStyle = "#fff8c8"; g.beginPath(); g.moveTo(sx, sy - ss); g.lineTo(sx + ss * 0.3, sy - ss * 0.3); g.lineTo(sx + ss, sy); g.lineTo(sx + ss * 0.3, sy + ss * 0.3); g.lineTo(sx, sy + ss); g.lineTo(sx - ss * 0.3, sy + ss * 0.3); g.lineTo(sx - ss, sy); g.lineTo(sx - ss * 0.3, sy - ss * 0.3); g.closePath(); g.fill();
      }
      face("#4a2b5a", true);
    } else if (kind === "lightning") {
      var glow = g.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 1.5);
      glow.addColorStop(0, "rgba(255,240,120,.5)"); glow.addColorStop(1, "rgba(255,240,120,0)");
      g.fillStyle = glow; g.beginPath(); g.arc(0, 0, r * 1.5, 0, TAU); g.fill();
      var lg = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      lg.addColorStop(0, "#fff7b0"); lg.addColorStop(1, "#f2b31b");
      g.fillStyle = lg; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = "#fff"; g.strokeStyle = "#8a5a00"; g.lineWidth = lw * 0.7;
      g.beginPath(); g.moveTo(r * 0.12, -r * 0.82); g.lineTo(-r * 0.4, r * 0.08); g.lineTo(-r * 0.02, r * 0.08); g.lineTo(-r * 0.18, r * 0.82); g.lineTo(r * 0.42, -r * 0.12); g.lineTo(r * 0.04, -r * 0.12); g.closePath(); g.fill(); g.stroke();
    } else if (kind === "bomb") {
      var bg = g.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
      bg.addColorStop(0, "#5d5a73"); bg.addColorStop(1, "#16141f");
      g.fillStyle = bg; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = "#3b3850"; g.fillRect(-r * 0.2, -r * 1.12, r * 0.4, r * 0.22); g.strokeRect(-r * 0.2, -r * 1.12, r * 0.4, r * 0.22);
      g.strokeStyle = "#a9875b"; g.lineWidth = lw; g.beginPath(); g.moveTo(0, -r * 1.12); g.quadraticCurveTo(r * 0.3, -r * 1.5, r * 0.5, -r * 1.3); g.stroke();
      var fl = 0.6 + 0.4 * Math.sin(t * 25);
      g.fillStyle = "rgba(255,170,60," + fl + ")"; g.beginPath(); g.arc(r * 0.52, -r * 1.32, r * 0.14 * (0.8 + fl * 0.4), 0, TAU); g.fill();
      g.fillStyle = "rgba(255,255,255,.25)"; g.beginPath(); g.ellipse(-r * 0.38, -r * 0.42, r * 0.18, r * 0.1, -0.6, 0, TAU); g.fill();
      if (o.count != null) {
        g.font = "900 " + Math.round(r * 1.05) + "px Nunito, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillStyle = o.count <= 1 ? "#ff6b5a" : "#fdf3de"; g.fillText(String(o.count), 0, r * 0.12);
      } else face("#fdf3de");
    }
    g.restore();
  }

  /* ---------- cache de sprites ----------
     Chaque écureuil est pré-dessiné en 2 morceaux (queue / corps + visage) par type, côté, humeur,
     clignement et regard (8 directions), à la taille exacte en pixels. Ensuite : des drawImage.
     blit(ctx, x, y, type, r, px, o) — r = rayon (unités courantes), px = pixels par unité.
     o = { k (échelle), alpha, flip, blink, mood, lx, ly, wag,
           def: { ang, sx, sy } (déformation : étirement sx/sy le long de l'angle ang) } */
  function cache() {
    var sprites = new Map();
    function sprite(type, pr, flip, part, blink, mood, look) {
      var key = type + "|" + pr + "|" + flip + "|" + part + "|" + blink + "|" + mood + "|" + look;
      var sp = sprites.get(key);
      if (sp) return sp;
      if (sprites.size > 1800) sprites.clear();
      var size = Math.ceil(pr * 3.3) + 4, c = document.createElement("canvas");
      c.width = c.height = size;
      var cx = size / 2, cy = size * 0.58;
      var a = look < 0 ? 0 : look * Math.PI / 4;
      drawSquirrel(c.getContext("2d"), cx, cy, type, pr, { part: part, flip: flip, blink: blink ? -1 : 1, mood: mood,
        lx: look < 0 ? 0 : Math.cos(a), ly: look < 0 ? 0 : Math.sin(a) });
      sp = { c: c, cx: cx, cy: cy };
      sprites.set(key, sp);
      return sp;
    }
    function lookIndex(lx, ly) { return lx || ly ? (Math.round(Math.atan2(ly, lx) / (Math.PI / 4)) + 8) % 8 : -1; }
    function blit(ctx, x, y, type, r, px, o) {
      o = o || {};
      var f = o.flip || 1, pr = Math.max(4, Math.round(r * px)), u = r / pr;
      var look = lookIndex(o.lx || 0, o.ly || 0), blink = (o.blink != null && o.blink < 0) ? 1 : 0, mood = o.mood || "";
      var tail = sprite(type, pr, f, "tail", 0, "", -1), body = sprite(type, pr, f, "body", blink, mood, look);
      var k = o.k || 1;
      ctx.save();
      if (o.alpha != null) ctx.globalAlpha *= o.alpha;
      ctx.translate(x, y);
      if (o.def) { ctx.rotate(o.def.ang); ctx.scale(o.def.sx, o.def.sy); ctx.rotate(-o.def.ang); }
      if (o.rot) ctx.rotate(o.rot);
      ctx.scale(k * u, k * u);
      ctx.save();
      ctx.translate(f * pr * 0.6, pr * 0.3); ctx.rotate(f * (o.wag || 0) * 0.16); ctx.translate(-f * pr * 0.6, -pr * 0.3);
      ctx.drawImage(tail.c, -tail.cx, -tail.cy);
      ctx.restore();
      ctx.drawImage(body.c, -body.cx, -body.cy);
      ctx.restore();
    }
    return { blit: blit, clear: function () { sprites.clear(); }, size: function () { return sprites.size; } };
  }

  window.MergerArt = { SQUIRRELS: SQUIRRELS, POWERS: POWERS, draw: drawSquirrel, drawPower: drawPower, cache: cache, lighten: lighten };
})();
