/* Dessins à colorier : 10 images originales (viewBox 0 0 600 600), formes toutes fermées pour que le remplissage ne déborde jamais.
   Chaque forme est dessinée de l'arrière vers l'avant avec un fond blanc : les traits cachés disparaissent. */
(function () {
  'use strict';
  var LINE = '#5b3a6b', LW = 7;
  var Col = Art.color = { LINE: LINE };

  function sh(d, fill) { return '<path d="' + d + '" fill="' + (fill || '#fff') + '" stroke="' + LINE + '" stroke-width="' + LW + '" stroke-linejoin="round" stroke-linecap="round"/>'; }
  function el(cx, cy, rx, ry, rot) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="#fff" stroke="' + LINE + '" stroke-width="' + LW + '"' + (rot ? ' transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')"' : '') + '/>'; }
  function ci(cx, cy, r) { return el(cx, cy, r, r); }
  function ln(d) { return '<path d="' + d + '" fill="none" stroke="' + LINE + '" stroke-width="' + LW + '" stroke-linecap="round" stroke-linejoin="round"/>'; }
  function dotf(cx, cy, r) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + LINE + '"/>'; }
  function rc(x, y, w, h, r) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (r || 0) + '" fill="#fff" stroke="' + LINE + '" stroke-width="' + LW + '" stroke-linejoin="round"/>'; }
  var STAR = 'M0-26l7.500 17 18 2-13.500 12 4 18L0 12-16 23l4-18L-25.500-7l18-2z';
  function star(x, y, s) { return '<path transform="translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')" d="' + STAR + '" fill="#fff" stroke="' + LINE + '" stroke-width="' + LW / (s || 1) + '" stroke-linejoin="round"/>'; }
  function heart(x, y, s) { return '<path transform="translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')" d="M0 24C-34 2-30-24-12-24-4-24 0-18 0-14 0-18 4-24 12-24 30-24 34 2 0 24z" fill="#fff" stroke="' + LINE + '" stroke-width="' + LW / (s || 1) + '" stroke-linejoin="round"/>'; }
  function eyeD(cx, cy, r) { return dotf(cx, cy, r) + '<circle cx="' + (cx + r * 0.35) + '" cy="' + (cy - r * 0.35) + '" r="' + (r * 0.32) + '" fill="#fff"/>'; }
  function flower(x, y, r) {
    var p = '';
    for (var i = 0; i < 6; i++) { var a = i / 6 * Math.PI * 2; p += ci(x + Math.cos(a) * r * 1.25, y + Math.sin(a) * r * 1.25, r * 0.85); }
    return p + ci(x, y, r * 0.8);
  }

  Col.pages = [
    { id: 'princesse', name: 'Princesse', draw: function () {
      return sh('M300 250C170 250 150 380 170 520 190 560 250 560 300 540 350 560 410 560 430 520 450 380 430 250 300 250z') + // cheveux arrière
        sh('M230 395L190 570Q300 600 410 570L370 395Q300 420 230 395z') + // robe
        sh('M222 395Q300 430 378 395L370 355Q300 385 230 355z') + // corsage
        ln('M214 535q20 14 40 0t40 0t40 0t40 0') + star(300, 480, 0.8) + heart(255, 540, 0.45) + heart(345, 540, 0.45) +
        sh('M230 360L190 420Q180 440 195 448 215 450 238 400z') + sh('M370 360L410 420Q420 440 405 448 385 450 362 400z') + // bras
        ci(194, 450, 14) + ci(406, 450, 14) +
        rc(260, 330, 80, 50, 18) + // cou
        el(300, 250, 98, 92) + // visage
        sh('M202 235Q205 140 300 135 395 140 398 235 380 190 340 175 320 205 270 205 255 175 220 190 202 235z') + // frange
        ln('M270 270Q300 292 330 270') + eyeD(262, 245, 11) + eyeD(338, 245, 11) + el(246, 280, 16, 10) + el(354, 280, 16, 10) + // joues
        sh('M214 135L224 85 262 110 300 70 338 110 376 85 386 135Q300 150 214 135z') + ci(300, 100, 9) + ci(250, 118, 7) + ci(350, 118, 7) +
        star(130, 190, 0.7) + star(480, 160, 0.9) + star(500, 300, 0.6);
    } },
    { id: 'chaton', name: 'Chaton', draw: function () {
      return sh('M410 470Q520 480 520 380 520 310 470 300 505 340 480 400 450 430 400 420z') + // queue
        el(300, 450, 130, 110) + el(300, 480, 70, 80) +
        el(215, 548, 52, 30) + el(385, 548, 52, 30) + ln('M205 548v14M225 548v14M375 548v14M395 548v14') +
        sh('M165 235L150 100 270 170z') + sh('M435 235L450 100 330 170z') + sh('M180 200L170 135 232 175z') + sh('M420 200L430 135 368 175z') +
        el(300, 270, 150, 125) +
        ln('M290 160v30M310 160v30M270 168l5 24M330 168l-5 24') +
        el(300, 318, 52, 36) + eyeD(235, 268, 17) + eyeD(365, 268, 17) +
        sh('M284 298h32l-16 18z') + ln('M300 316v12M300 328q-14 14-26 4M300 328q14 14 26 4') +
        ln('M250 328l-82-14M250 342l-84 16M350 328l82-14M350 342l84 16') + el(205, 322, 0.1, 0.1) +
        sh('M300 392l-44-24v48zM300 392l44-24v48z') + ci(300, 392, 11) +
        sh('M470 520a30 30 0 1 0 0.1 0z') + ln('M455 505q20 14 35 0M450 525q25 16 45 0');
    } },
    { id: 'lapin', name: 'Lapin', draw: function () {
      return el(300, 470, 130, 105) + el(300, 490, 78, 74) +
        el(205, 556, 54, 30) + el(395, 556, 54, 30) + ci(445, 520, 30) +
        el(212, 120, 44, 130, -10) + el(212, 130, 22, 96, -10) + el(388, 120, 44, 130, 10) + el(388, 130, 22, 96, 10) +
        el(300, 300, 140, 120) +
        eyeD(240, 285, 16) + eyeD(360, 285, 16) + sh('M286 318h28l-14 16z') + ln('M300 334v10M300 344q-12 14-24 6M300 344q12 14 24 6') +
        rc(286, 358, 28, 30, 6) + ln('M300 358v30') + el(218, 330, 20, 12) + el(382, 330, 20, 12) +
        el(190, 446, 24, 54, 18) + el(410, 446, 24, 54, -18) +
        sh('M70 440h60l-30 120z') + ln('M86 470l14 4M104 496l12 4') + sh('M100 440q-30-20-36-56 26 10 36 56z') + sh('M100 440q30-20 36-56-26 10-36 56z');
    } },
    { id: 'licorne', name: 'Licorne', draw: function () {
      return sh('M404 450C500 430 540 490 508 548 494 510 460 500 410 512z') + sh('M410 410C490 380 520 420 496 470 484 440 454 436 416 446z') +
        el(228, 566, 56, 28) + el(372, 566, 56, 28) + ln('M212 566v14M232 566v14M356 566v14M376 566v14') +
        el(300, 470, 135, 108) + heart(300, 490, 1.15) +
        sh('M268 160L300 22 332 160z') + ln('M283 108l36-10M277 132l48-12M290 82l22-6') +
        ci(150, 260, 38) + ci(138, 322, 34) + ci(152, 380, 30) + ci(450, 260, 38) + ci(462, 322, 34) + ci(448, 380, 30) +
        sh('M196 214L168 96 266 160z') + sh('M404 214L432 96 334 160z') + sh('M198 180L186 124 236 158z') + sh('M402 180L414 124 364 158z') +
        el(300, 262, 152, 126) +
        sh('M170 214Q220 134 300 168 380 134 430 214 400 196 372 206 340 176 300 210 260 176 228 206 200 196 170 214z') + 
        eyeD(238, 272, 19) + eyeD(362, 272, 19) + el(202, 318, 22, 13) + el(398, 318, 22, 13) +
        el(300, 338, 50, 31) + dotf(280, 336, 6) + dotf(320, 336, 6) + ln('M278 358q22 16 44 0') +
        star(80, 100, 0.8) + star(530, 120, 0.9) + star(90, 520, 0.6) + heart(540, 300, 0.6);
    } },
    { id: 'dragon', name: 'Petit dragon', draw: function () {
      return sh('M226 340L86 226Q54 300 104 342 76 384 150 410z') + sh('M374 340L514 226Q546 300 496 342 524 384 450 410z') +
        sh('M410 470C500 462 548 514 520 566 500 534 456 538 410 542z') + sh('M520 566l34 8-18-30z') +
        el(300, 450, 142, 122) + el(300, 482, 82, 90) + ln('M240 440h120M244 474h112M254 508h92') +
        el(214, 566, 54, 28) + el(386, 566, 54, 28) + ln('M200 566v14M218 566v14M370 566v14M388 566v14') +
        sh('M204 170L168 72 262 126z') + sh('M396 170L432 72 338 126z') +
        sh('M250 118L270 60 300 108 330 60 350 118z') +
        el(300, 240, 150, 124) +
        el(300, 304, 70, 44) + dotf(278, 300, 8) + dotf(322, 300, 8) +
        eyeD(236, 226, 19) + eyeD(364, 226, 19) + el(196, 282, 18, 11) + el(404, 282, 18, 11) + ln('M270 334q30 20 60 0') +
        star(84, 130, 0.8) + star(520, 140, 0.8) + heart(70, 470, 0.5);
    } },
    { id: 'papillon', name: 'Papillon', draw: function () {
      return sh('M300 290C230 120 70 90 70 230 70 330 190 340 300 310z') + sh('M300 330C190 330 90 400 130 490 170 560 290 480 300 360z') +
        sh('M300 290C370 120 530 90 530 230 530 330 410 340 300 310z') + sh('M300 330C410 330 510 400 470 490 430 560 310 480 300 360z') +
        ci(160, 230, 46) + ci(160, 230, 20) + ci(440, 230, 46) + ci(440, 230, 20) + ci(200, 460, 30) + ci(400, 460, 30) +
        sh('M300 215c-18 0-22 40-22 100s14 130 22 130 22-70 22-130-4-100-22-100z') + ci(300, 190, 26) +
        ln('M290 168Q260 110 220 100') + ln('M310 168Q340 110 380 100') + ci(218, 98, 9) + ci(382, 98, 9) +
        eyeD(291, 188, 5) + eyeD(309, 188, 5) + ln('M292 202q8 6 16 0') +
        flower(80, 530, 20) + flower(530, 530, 20) + star(300, 560, 0.6) + star(60, 90, 0.6) + star(540, 100, 0.6);
    } },
    { id: 'chateau', name: 'Château', draw: function () {
      var f = function (x, y) { return ln('M' + x + ' ' + y + 'v-60') + sh('M' + x + ' ' + (y - 60) + 'l44 14-44 14z'); };
      return sh('M0 540h600v60H0z') +
        f(110, 190) + f(490, 190) + f(300, 80) +
        rc(60, 280, 100, 260) + sh('M42 280L110 160 178 280z') + rc(440, 280, 100, 260) + sh('M422 280L490 160 558 280z') +
        rc(190, 340, 220, 200) + ln('M190 340h30v-24h30v24h30v-24h30v24h30v-24h30v24h30v-24h30v24') +
        rc(250, 200, 100, 340) + sh('M232 200L300 70 368 200z') +
        sh('M255 540v-70a45 45 0 0 1 90 0v70z') + ln('M300 428v112') + ci(284, 500, 5) + ci(316, 500, 5) +
        sh('M90 360a20 26 0 0 1 40 0v40H90z') + sh('M470 360a20 26 0 0 1 40 0v40H470z') + sh('M205 420a18 24 0 0 1 36 0v36h-36z') + sh('M359 420a18 24 0 0 1 36 0v36h-36z') +
        ci(300, 270, 26) + ln('M300 252v18l12 8') +
        el(80, 100, 56, 28) + el(130, 90, 46, 30) + el(500, 70, 60, 30) + el(548, 90, 40, 24) + ci(440, 60, 0.1) + star(250, 40, 0.6) + star(350, 40, 0.6);
    } },
    { id: 'gateau', name: 'Gâteau', draw: function () {
      return sh('M60 540Q300 590 540 540L520 580Q300 630 80 580z') +
        sh('M100 370h400v150Q300 570 100 520z') +
        sh('M100 400Q140 440 180 400 220 440 260 400 300 440 340 400 380 440 420 400 460 440 500 400V370H100z') +
        sh('M170 240h260v130H170z') +
        sh('M170 270Q210 310 250 270 290 310 330 270 370 310 410 270 430 290 430 270V240H170z') +
        ci(215, 450, 14) + ci(300, 470, 14) + ci(385, 450, 14) + ci(250, 330, 10) + ci(350, 335, 10) +
        sh('M270 240v-70h22v70z') + sh('M308 240v-70h22v70z') + sh('M346 240v-70h22v70z') +
        sh('M281 170c-24-20-4-46 0-66 6 20 24 44 0 66z') + sh('M319 170c-24-20-4-46 0-66 6 20 24 44 0 66z') + sh('M357 170c-24-20-4-46 0-66 6 20 24 44 0 66z') +
        ci(160, 540, 22) + ci(440, 540, 22) + ln('M160 518q6-24 24-30') + ln('M440 518q6-24 24-30') + star(80, 140, 0.8) + star(520, 140, 0.8) + heart(90, 280, 0.6) + heart(510, 280, 0.6);
    } },
    { id: 'fleur', name: 'Fleur', draw: function () {
      var p = '';
      for (var i = 0; i < 8; i++) { var a = i / 8 * Math.PI * 2 - Math.PI / 2, cx = 300 + Math.cos(a) * 110, cy = 220 + Math.sin(a) * 110; p += el(cx, cy, 52, 80, i * 45); }
      return sh('M0 520Q150 470 300 520T600 520V600H0z') + sh('M293 380h14v170h-14z') +
        sh('M300 470C230 420 160 440 140 500 210 520 270 510 300 470z') + sh('M300 500C370 450 440 470 460 530 390 550 330 540 300 500z') +
        p + ci(300, 220, 68) + ci(280, 200, 8) + ci(320, 200, 8) + ci(300, 245, 8) + ci(272, 238, 8) + ci(328, 238, 8) +
        el(110, 450, 38, 28) + ci(84, 436, 14) + ci(110, 428, 0.1) + dotf(120, 440, 6) + dotf(98, 458, 6) + ln('M100 422l-12-16M118 424l12-14') +
        flower(500, 520, 16) + flower(80, 560, 14) + star(520, 70, 0.7) + star(70, 90, 0.7);
    } },
    { id: 'creature', name: 'Petite créature', draw: function () {
      return sh('M150 300L50 220Q30 280 90 330z') + sh('M450 300L550 220Q570 280 510 330z') + // ailes
        sh('M300 130C170 130 120 250 120 360 120 490 200 560 300 560 400 560 480 490 480 360 480 250 430 130 300 130z') +
        ln('M300 130V80') + ln('M250 140Q220 90 190 80') + ln('M350 140Q380 90 410 80') + star(300, 56, 0.75) + ci(188, 78, 12) + ci(412, 78, 12) +
        el(300, 440, 120, 90) +
        ci(200, 300, 40) + ci(400, 300, 40) + ci(300, 270, 52) + eyeD(300, 270, 24) + eyeD(200, 300, 15) + eyeD(400, 300, 15) +
        ci(190, 190, 24) + ci(410, 190, 24) + ci(300, 190, 18) +
        sh('M240 380Q300 450 360 380Q300 410 240 380z') +
        sh('M200 560a45 25 0 0 1 90 0z') + sh('M310 560a45 25 0 0 1 90 0z') +
        sh('M110 380q-40 10-48 50 30 0 56-20z') + sh('M490 380q40 10 48 50-30 0-56-20z') + heart(300, 510, 0.9) + heart(180, 450, 0.5) + heart(420, 450, 0.5);
    } }
  ];

  /* SVG complet d'une page : fond blanc, traits sombres */
  Col.svg = function (id) {
    var pg = Col.pages.filter(function (p) { return p.id === id; })[0] || Col.pages[0];
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600"><rect width="600" height="600" fill="#fff"/>' + pg.draw() + '</svg>';
  };
  /* miniature à lignes fines pour la galerie */
  Col.thumb = function (id) {
    var pg = Col.pages.filter(function (p) { return p.id === id; })[0];
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="#fff"/>' + pg.draw() + '</svg>';
  };

  /* ---------- autocollants et tampons (tracés Path2D, 0,0 au centre, rayon ~ 30) ---------- */
  Col.stickers = [
    { id: 'etoile', parts: [['M0-30l9 20 22 2-16 15 5 22L0 15-20 29l5-22-16-15 22-2z', '#ffd84d']] },
    { id: 'coeur', parts: [['M0 28C-40 4-36-28-14-28-5-28 0-21 0-16 0-21 5-28 14-28 36-28 40 4 0 28z', '#ff5d9e']] },
    { id: 'fleur', parts: [['M0-30a14 14 0 0 1 14 14 14 14 0 0 1 14 14A14 14 0 0 1 22 20 14 14 0 0 1 0 28 14 14 0 0 1-22 20 14 14 0 0 1-28-2 14 14 0 0 1-14-16 14 14 0 0 1 0-30z', '#ff9ac8'], ['M0-8a8 8 0 1 0 0.1 0z', '#ffd84d']] },
    { id: 'papillon', parts: [['M0 0C-10-30-40-34-36-8-34 8-10 8 0 0z', '#c4a8ff'], ['M0 0C10-30 40-34 36-8 34 8 10 8 0 0z', '#c4a8ff'], ['M0 2C-8 10-32 12-26 28-20 38-4 26 0 2z', '#ff9ac8'], ['M0 2C8 10 32 12 26 28 20 38 4 26 0 2z', '#ff9ac8'], ['M-2-14h4v34h-4z', '#5b3a6b']] },
    { id: 'arc', parts: [['M-32 20a32 32 0 0 1 64 0h-12a20 20 0 0 0-40 0z', '#ff6f91'], ['M-24 20a24 24 0 0 1 48 0h-10a14 14 0 0 0-28 0z', '#ffe066'], ['M-16 20a16 16 0 0 1 32 0h-9a7 7 0 0 0-14 0z', '#6ec6ff']] },
    { id: 'lune', parts: [['M8-30a30 30 0 1 0 22 44A24 24 0 0 1 8-30z', '#ffe066']] },
    { id: 'chat', parts: [['M-28-4L-30-32-10-16Q0-18 10-16L30-32 28-4Q34 20 0 28-34 20-28-4z', '#ffb273'], ['M-12 0a3 3 0 1 0 0.1 0zM12 0a3 3 0 1 0 0.1 0z', '#5b3a6b'], ['M-4 10h8l-4 5z', '#ff5d9e']] },
    { id: 'couronne', parts: [['M-30 18L-34-18-16-2 0-26 16-2 34-18 30 18z', '#ffd84d'], ['M-4 6a4 4 0 1 0 0.1 0z', '#ff5d9e']] }
  ];
  Col.stampSvg = function (id) {
    var s = Col.stickers.filter(function (x) { return x.id === id; })[0];
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-40 -40 80 80">' + s.parts.map(function (p) { return '<path d="' + p[0] + '" fill="' + p[1] + '" stroke="#fff" stroke-width="3" stroke-linejoin="round" paint-order="stroke"/>'; }).join('') + '</svg>';
  };
  Col.paintSticker = function (ctx, id, x, y, size) {
    var s = Col.stickers.filter(function (v) { return v.id === id; })[0];
    if (!s) return;
    ctx.save(); ctx.translate(x, y); var k = size / 60; ctx.scale(k, k);
    s.parts.forEach(function (p) {
      var path = new Path2D(p[0]);
      ctx.lineJoin = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.stroke(path);
      ctx.fillStyle = p[1]; ctx.fill(path);
    });
    ctx.restore();
  };
  Col.palette = ['#ff4d6d', '#ff9a3c', '#ffd84d', '#8de05a', '#4fd8d0', '#4da6ff', '#a47cff', '#ff8fd0', '#b9784a', '#ffffff', '#6b4a7a', '#ffc9a8'];
})();
