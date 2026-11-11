/* Atelier de dessin : coloriage (remplissage réel par zones fermées) et dessin libre au doigt.
   Interface pensée pour une enfant de 3 ans : peu d'outils, très gros, mode actif évident, retour visuel immédiat. */
(function () {
  'use strict';
  var N = 600; /* résolution interne du coloriage */

  function hubCard(cls, art, label) { return '<button class="hubcard ' + cls + '" aria-label="' + label + '">' + art + '<span>' + label + '</span></button>'; }
  var ART_COLOR = Art.svg('0 0 120 120', '<rect x="12" y="10" width="96" height="96" rx="12" fill="#fff" ' + Art.ST(4) + '/><path d="M40 90c-6-14 0-30 12-30-4-14 6-26 18-22 14-2 24 10 20 26 6 8 2 22-10 26z" fill="#ff9ac8" ' + Art.ST(3.500) + '/><path d="M52 60c8-8 14-4 20-10" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><g transform="translate(70 70) rotate(30)"><rect x="-4" y="-6" width="9" height="40" rx="4.500" fill="#ffb93c" ' + Art.ST(3) + '/><path d="M-6 34h14l-4 12h-6z" fill="#4fd8d0" ' + Art.ST(3) + '/></g><circle cx="30" cy="30" r="8" fill="#ffd84d"/>');
  var ART_FREE = Art.svg('0 0 120 120', '<path d="M14 84C30 40 44 100 62 60s30-40 44-10" fill="none" stroke="#ff6f91" stroke-width="10" stroke-linecap="round"/><path d="M14 94C30 54 44 108 62 72s30-36 44-8" fill="none" stroke="#4fd8d0" stroke-width="10" stroke-linecap="round" opacity=".9"/><g transform="translate(84 6) rotate(32)"><path d="M0 0h18v54L9 70l-9-16z" fill="#ffd84d" ' + Art.ST(3.500) + '/><path d="M0 12h18" stroke="#ff8fb8" stroke-width="6"/><path d="M0 54L9 70l9-16z" fill="#f4d9b0" ' + Art.ST(3) + '/><path d="M6 66l3 4 3-4z" fill="#6b3f72"/></g>');

  /* =====================================================================================
     Interface commune de l'atelier.
     - 5 gros outils carrés ; l'outil actif est impossible à rater (anneau, halo, taille, rebond, voix « Mode … ! »)
     - une légende du mode (pour les adultes) avec un aperçu de la couleur / de l'autocollant actif
     - 10 grosses couleurs ; la couleur active a un gros contour, un halo et une coche
     - l'emplacement des options garde toujours la même hauteur : rien ne saute quand on change d'outil
     ===================================================================================== */
  var CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.500l4.500 4.500L19 7" fill="none" stroke="#fff" stroke-width="3.600" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ERASER_ART = Art.ui.eraser.replace(/#fff/g, '#8fd3ff');
  var RAINBOW_ART = Art.svg('0 0 64 40', Art.items.rainbow.replace(/stroke-width="7"/g, 'stroke-width="9"'));
  var COLOR_MODES = [
    { id: 'bucket', icon: 'bucket', cls: 'pink', hex: '#ff5d9e', name: 'Remplir', cap: 'Colorie en touchant une zone', say: 'Mode coloriage !', opts: 'colors', useColor: true },
    { id: 'brush', icon: 'brush', cls: 'purple', hex: '#8b60ee', name: 'Dessiner', cap: 'Dessine avec ton doigt', say: 'Mode dessin !', opts: 'colors', useColor: true },
    { id: 'glitter', icon: 'sparkles', cls: 'yellow', hex: '#ffae22', name: 'Paillettes', cap: 'Ajoute des paillettes', say: 'Mode paillettes !', opts: 'colors', useColor: true },
    { id: 'sticker', icon: 'sticker', cls: 'turq', hex: '#28c2b8', name: 'Autocollants', cap: 'Ajoute un autocollant', say: 'Mode autocollants !', opts: 'stickers' },
    { id: 'eraser', icon: 'eraser', cls: 'blue', hex: '#4aa3f5', name: 'Gomme', cap: 'Efface', say: 'Mode gomme !', opts: 'art', art: ERASER_ART }
  ];
  var FREE_MODES = [
    { id: 'pen', icon: 'brush', cls: 'pink', hex: '#ff5d9e', name: 'Crayon', cap: 'Dessine avec ton doigt', say: 'Mode crayon !', opts: 'colors', useColor: true },
    { id: 'rainbow', icon: 'rainbow', cls: 'purple', hex: '#8b60ee', name: 'Arc-en-ciel', cap: 'Dessine en arc-en-ciel', say: 'Mode arc-en-ciel !', opts: 'art', art: RAINBOW_ART },
    { id: 'glitter', icon: 'sparkles', cls: 'yellow', hex: '#ffae22', name: 'Paillettes', cap: 'Ajoute des paillettes', say: 'Mode paillettes !', opts: 'colors', useColor: true },
    { id: 'stamp', icon: 'sticker', cls: 'turq', hex: '#28c2b8', name: 'Tampons', cap: 'Pose un tampon', say: 'Mode tampons !', opts: 'stickers' },
    { id: 'eraser', icon: 'eraser', cls: 'blue', hex: '#4aa3f5', name: 'Gomme', cap: 'Efface', say: 'Mode gomme !', opts: 'art', art: ERASER_ART }
  ];

  function trayHtml(modes, withSizes) {
    return '<div class="tray atelier">' +
      '<div class="tools big">' + modes.map(function (m) { return '<button class="tool ' + m.cls + '" style="--hex:' + m.hex + '" data-tool="' + m.id + '" aria-label="' + m.name + '"><span class="tico">' + Art.ui[m.icon] + '</span>' + (m.useColor ? '<i class="tdot"></i>' : '') + '</button>'; }).join('') + '</div>' +
      '<div class="modecap"><span class="mcico"></span><b class="mctxt"></b>' + (withSizes ? '<span class="sizes"></span>' : '') + '</div>' +
      '<div class="optslot"><div class="palette"></div><div class="stickers" hidden></div><div class="optart" hidden></div></div>' +
      '<div class="donebar"><button class="btn green side" data-do="undo" aria-label="annuler">' + Art.ui.undo + '</button><span class="donehost"></span><button class="btn red side" data-do="restart" aria-label="recommencer">' + Art.ui.again + '</button></div>' + '</div>';
  }

  /* contrôleur de l'interface : mode actif, couleur active, autocollant actif */
  function Ui(host, modes, cb) {
    var tools = C.$('.tools', host), pal = C.$('.palette', host), stk = C.$('.stickers', host), art = C.$('.optart', host), cap = C.$('.modecap', host), page = C.$('.act', host) || host;
    var api = { mode: modes[0].id, color: Art.color.palette[7], sticker: Art.color.stickers[0].id };
    function cur() { return modes.filter(function (m) { return m.id === api.mode; })[0]; }
    function paintCap() {
      var m = cur(), ico = C.$('.mcico', cap), txt = C.$('.mctxt', cap);
      txt.textContent = m.cap; cap.style.setProperty('--hex', m.hex);
      if (m.useColor) ico.innerHTML = '<i class="cdot" style="background:' + api.color + '"></i>';
      else if (m.opts === 'stickers') ico.innerHTML = Art.color.stampSvg(api.sticker);
      else ico.innerHTML = '<span class="mcm" style="background:' + m.hex + '">' + Art.ui[m.icon] + '</span>';
      cap.classList.remove('pop'); void cap.offsetWidth; cap.classList.add('pop');
    }
    function paintColor() {
      host.style.setProperty('--ac', api.color);
      C.$$('.tdot', tools).forEach(function (d) { d.style.background = api.color; });
      C.$$('.sw', pal).forEach(function (s) { s.classList.toggle('on', s.dataset.c === api.color); });
    }
    api.setMode = function (id, silent) {
      api.mode = id; var m = cur();
      C.$$('.tool', tools).forEach(function (t) { t.classList.toggle('on', t.dataset.tool === id); });
      pal.hidden = m.opts !== 'colors'; stk.hidden = m.opts !== 'stickers'; art.hidden = m.opts !== 'art';
      if (m.opts === 'art') art.innerHTML = m.art;
      page.style.setProperty('--mode', m.hex);
      paintCap();
      if (!silent) {
        var t = C.$('.tool.on', tools); C.sfx.pop(); C.bounce(t, 1.2);
        var r = t.getBoundingClientRect(); C.fx.ripple(r.left + r.width / 2, r.top + r.height / 2, m.hex, 110);
        C.say(m.say, { bubble: false, keep: false });
      }
      if (cb.onMode) cb.onMode(id, silent);
    };
    api.setColor = function (c, silent) {
      api.color = c; paintColor(); if (cur().useColor) paintCap();
      if (!silent) { C.sfx.tap(C.rint(0, 6)); var s = C.$('.sw.on', pal); if (s) { C.bounce(s, 1.25); var r = s.getBoundingClientRect(); C.fx.ripple(r.left + r.width / 2, r.top + r.height / 2, c, 90); } }
      if (cb.onColor) cb.onColor(c, silent);
    };
    api.setSticker = function (id, silent) {
      api.sticker = id; C.$$('.stk', stk).forEach(function (b) { b.classList.toggle('on', b.dataset.id === id); });
      if (cur().opts === 'stickers') paintCap();
      if (!silent) { C.sfx.pop(); var b = C.$('.stk.on', stk); if (b) C.bounce(b, 1.2); }
    };
    C.$$('.tool', tools).forEach(function (t) { t.addEventListener('click', function () { api.setMode(t.dataset.tool); }); });
    Art.color.palette.forEach(function (c) {
      var s = C.el('<button class="sw" data-c="' + c + '" style="--c:' + c + '" aria-label="couleur">' + CHECK + '</button>');
      s.addEventListener('click', function () { api.setColor(c); }); pal.appendChild(s);
    });
    Art.color.stickers.forEach(function (s) {
      var b = C.el('<button class="stk" data-id="' + s.id + '" aria-label="autocollant">' + Art.color.stampSvg(s.id) + '</button>');
      b.addEventListener('click', function () { api.setSticker(s.id); }); stk.appendChild(b);
    });
    api.setColor(api.color, true); api.setSticker(api.sticker, true); api.setMode(modes[0].id, true);
    return api;
  }
  /* couleur mélangée avec du blanc (pour les paillettes) */
  function lighten(hex, t) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    function m(v) { return Math.round(v + (255 - v) * t); }
    return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')';
  }
  /* étincelle à 4 branches */
  function spark(ctx, x, y, r, fill) {
    ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(x, y - r * 1.7);
    ctx.quadraticCurveTo(x, y, x + r * 1.7, y); ctx.quadraticCurveTo(x, y, x, y + r * 1.7); ctx.quadraticCurveTo(x, y, x - r * 1.7, y); ctx.quadraticCurveTo(x, y, x, y - r * 1.7); ctx.fill();
  }

  /* ---------- Coloriage ---------- */
  function Coloring(host, pageId, goBack) {
    var wrap = C.$('.cv-wrap', host), cvC = C.$('.cv-color', host), cvL = C.$('.cv-line', host), cvS = C.$('.cv-stk', host);
    var cC = cvC.getContext('2d', { willReadFrequently: true }), cL = cvL.getContext('2d', { willReadFrequently: true }), cS = cvS.getContext('2d', { willReadFrequently: true });
    [cvC, cvL, cvS].forEach(function (c) { c.width = N; c.height = N; });
    var wall = new Uint8Array(N * N), ready = false;
    var undoStack = [];
    var busy = false, dirty = false, fills = 0, touched = function () { };
    var introStep = 0, introTimer = null, introHand = null, introCount = C.store.get('hint.coloring', 0);

    /* la ligne du dessin : SVG -> canvas -> calque transparent + carte des murs */
    C.svgToImage(Art.color.svg(pageId)).then(function (img) {
      var t = document.createElement('canvas'); t.width = N; t.height = N;
      var tc = t.getContext('2d', { willReadFrequently: true });
      tc.fillStyle = '#fff'; tc.fillRect(0, 0, N, N); tc.drawImage(img, 0, 0, N, N);
      var d = tc.getImageData(0, 0, N, N), px = d.data, out = cL.createImageData(N, N), o = out.data;
      for (var i = 0, p = 0; i < N * N; i++, p += 4) {
        var lum = (px[p] + px[p + 1] + px[p + 2]) / 3, a = Math.max(0, Math.min(1, (255 - lum) / 150));
        o[p] = 91; o[p + 1] = 58; o[p + 2] = 107; o[p + 3] = Math.round(a * 255);
        wall[i] = a > 0.42 ? 1 : 0;
      }
      cL.putImageData(out, 0, 0);
      ready = true;
    }).catch(function () { });

    function pos(e) { var r = cvC.getBoundingClientRect(); return { x: (e.clientX - r.left) * N / r.width, y: (e.clientY - r.top) * N / r.height }; }
    function toScreen(x, y) { var r = cvC.getBoundingClientRect(); return { x: r.left + x / N * r.width, y: r.top + y / N * r.height, k: r.width / N }; }
    function snap() {
      try { undoStack.push([cC.getImageData(0, 0, N, N), cS.getImageData(0, 0, N, N)]); if (undoStack.length > 12) undoStack.shift(); } catch (e) { }
      dirty = true; touched(); updUndo();
    }
    function updUndo() { var u = C.$('[data-do=undo]', host); if (u) u.classList.toggle('dim', !undoStack.length); }
    function undo() {
      var s = undoStack.pop(); if (!s) { C.sfx.oops(); return; }
      cC.putImageData(s[0], 0, 0); cS.putImageData(s[1], 0, 0); updUndo(); C.sfx.boing();
    }
    /* zone fermée contenant (x,y). Tolérant : si on touche un trait ou à côté, on prend la zone libre la plus proche (jusqu'à ~18 px) */
    function region(x, y) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= N || y >= N) return null;
      if (wall[y * N + x]) {
        var found = false;
        for (var r = 1; r <= 18 && !found; r++) for (var dy = -r; dy <= r && !found; dy++) for (var dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          var xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < N && yy < N && !wall[yy * N + xx]) { x = xx; y = yy; found = true; break; }
        }
        if (!found) return null;
      }
      var mask = new Uint8Array(N * N), stack = [x, y];
      while (stack.length) {
        var cy = stack.pop(), cx = stack.pop(), row = cy * N;
        if (mask[row + cx] || wall[row + cx]) continue;
        var l = cx, rr = cx;
        while (l > 0 && !wall[row + l - 1] && !mask[row + l - 1]) l--;
        while (rr < N - 1 && !wall[row + rr + 1] && !mask[row + rr + 1]) rr++;
        for (var i = l; i <= rr; i++) {
          mask[row + i] = 1;
          if (cy > 0 && !wall[row - N + i] && !mask[row - N + i]) { if (i === l || wall[row - N + i - 1] || mask[row - N + i - 1]) stack.push(i, cy - 1); }
          if (cy < N - 1 && !wall[row + N + i] && !mask[row + N + i]) { if (i === l || wall[row + N + i - 1] || mask[row + N + i - 1]) stack.push(i, cy + 1); }
        }
      }
      /* dilatation sous les traits (3 px) pour que la couleur passe sous le contour */
      var ext = new Uint8Array(mask);
      for (var pass = 0; pass < 3; pass++) {
        var add = [];
        for (var yy2 = 1; yy2 < N - 1; yy2++) for (var xx2 = 1; xx2 < N - 1; xx2++) {
          var k = yy2 * N + xx2;
          if (wall[k] && !ext[k] && (ext[k - 1] || ext[k + 1] || ext[k - N] || ext[k + N])) add.push(k);
        }
        for (var q = 0; q < add.length; q++) ext[add[q]] = 1;
      }
      return { mask: ext, x: x, y: y };
    }
    function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }

    function fillRegion(reg, col) {
      var rgb = hex(col), cv = document.createElement('canvas'); cv.width = N; cv.height = N;
      var c2 = cv.getContext('2d'), id = c2.createImageData(N, N), d = id.data, mk = reg.mask;
      for (var i = 0, p = 0; i < mk.length; i++, p += 4) if (mk[i]) { d[p] = rgb[0]; d[p + 1] = rgb[1]; d[p + 2] = rgb[2]; d[p + 3] = 255; }
      c2.putImageData(id, 0, 0);
      /* révélation circulaire douce depuis le doigt */
      var t0 = performance.now(), dur = 320; busy = true;
      (function frame(t) {
        var k = Math.max(0, Math.min(1, (t - t0) / dur));
        if (k < 1) {
          cC.save(); cC.beginPath(); cC.arc(reg.x, reg.y, k * N * 1.45, 0, Math.PI * 2); cC.clip(); cC.drawImage(cv, 0, 0); cC.restore();
          requestAnimationFrame(frame);
        } else { cC.drawImage(cv, 0, 0); busy = false; }
      })(t0);
    }
    /* la gomme efface la couleur ET les autocollants de la zone */
    function grow(mask, times) {   /* élargit une zone de quelques pixels (les autocollants débordent un peu sur les traits) */
      var cur = new Uint8Array(mask);
      for (var t = 0; t < times; t++) {
        var nxt = new Uint8Array(cur);
        for (var y = 1; y < N - 1; y++) for (var x = 1; x < N - 1; x++) { var k = y * N + x; if (!cur[k] && (cur[k - 1] || cur[k + 1] || cur[k - N] || cur[k + N])) nxt[k] = 1; }
        cur = nxt;
      }
      return cur;
    }
    function clearRegion(reg) {
      var wide = grow(reg.mask, 8);
      [[cC, reg.mask], [cS, wide]].forEach(function (pair) {
        var cx = pair[0], mk = pair[1], id = cx.getImageData(0, 0, N, N), d = id.data;
        for (var i = 0, p = 3; i < mk.length; i++, p += 4) if (mk[i]) d[p] = 0;
        cx.putImageData(id, 0, 0);
      });
    }
    function eraseLine(a, b) {
      [cC, cS].forEach(function (cx) {
        cx.save(); cx.globalCompositeOperation = 'destination-out'; cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.lineWidth = 60; cx.strokeStyle = '#000';
        cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke(); cx.restore();
      });
    }
    /* autocollant : posé automatiquement au centre de la zone touchée, à la bonne taille, avec une apparition qui rebondit */
    function placeSticker(p, id) {
      var r = region(p.x, p.y), cx = p.x, cy = p.y, size = 150;
      if (r) {
        var mk = r.mask, minx = N, miny = N, maxx = 0, maxy = 0, area = 0;
        for (var i = 0; i < mk.length; i++) if (mk[i]) { var x = i % N, y = (i / N) | 0; area++; if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
        if (area > 0 && area < N * N * 0.4) { cx = (minx + maxx) / 2; cy = (miny + maxy) / 2; size = C.clamp(Math.min(maxx - minx, maxy - miny) * 0.85, 96, 190); }
      }
      snap(); busy = true;
      var s = toScreen(cx, cy), w = size * s.k * 80 / 60;
      var g = document.createElement('div'); g.className = 'stkpop'; g.style.cssText = 'left:' + (s.x - w / 2) + 'px;top:' + (s.y - w / 2) + 'px;width:' + w + 'px;height:' + w + 'px';
      g.innerHTML = Art.color.stampSvg(id); C.$('#fx').appendChild(g);
      var an = g.animate([{ transform: 'scale(.15) rotate(-25deg)', opacity: 0 }, { transform: 'scale(1.3) rotate(8deg)', opacity: 1, offset: .55 }, { transform: 'scale(1) rotate(0)', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.2,1.2,.4,1)', fill: 'forwards' });
      C.sfx.boing(); C.fx.ripple(s.x, s.y, '#fff', w * 0.9); C.fx.burst(s.x, s.y, { n: 16, dist: 120, size: 24 });
      an.onfinish = function () { Art.color.paintSticker(cS, id, cx, cy, size); g.remove(); busy = false; C.sfx.sparkle(); };
    }

    var stroke = null;
    function begin(e) {
      var p = pos(e), m = ui.mode, sx = e.clientX, sy = e.clientY;
      if (!ready || busy) return;
      if (introTimer) { clearTimeout(introTimer); introTimer = null; }
      if (m === 'bucket') {
        var r = region(p.x, p.y);
        if (!r) { C.sfx.oops(); C.fx.ripple(sx, sy, '#fff', 80); return; }
        snap(); fillRegion(r, ui.color);
        C.sfx.tap(C.rint(0, 6)); C.sfx.pop(); C.sfx.sparkle();
        C.fx.ripple(sx, sy, ui.color, 150); C.fx.burst(sx, sy, { n: 18, dist: 120, size: 26, colors: [ui.color, '#fff', '#ffd84d'] });
        fills++; endIntro(); if (fills % 6 === 1) C.say('Oh, quelle jolie couleur !', { keep: false });
      } else if (m === 'eraser') {
        snap();
        var r2 = region(p.x, p.y); if (r2) clearRegion(r2);
        C.sfx.whoosh(); C.fx.ripple(sx, sy, '#8fd3ff', 140); C.fx.burst(sx, sy, { n: 12, shapes: ['dot'], colors: ['#fff', '#cfe8ff', '#e5d6ff'], dist: 80, size: 20 });
        stroke = { erase: true, last: p, n: 0 };
      } else if (m === 'sticker') {
        placeSticker(p, ui.sticker); endIntro();
      } else {
        snap(); stroke = { last: p, n: 0 };
        C.fx.ripple(sx, sy, ui.color, 90); paintTo(p, p, sx, sy); endIntro();
      }
    }
    function paintTo(a, b, sx, sy) {
      if (ui.mode === 'brush') {
        /* le trait est peint sous les contours : il suit le doigt, bien épais */
        cC.save(); cC.lineCap = 'round'; cC.lineJoin = 'round'; cC.strokeStyle = ui.color; cC.fillStyle = ui.color; cC.lineWidth = 42;
        cC.beginPath(); cC.moveTo(a.x, a.y); cC.lineTo(b.x, b.y); cC.stroke(); cC.beginPath(); cC.arc(b.x, b.y, 21, 0, Math.PI * 2); cC.fill(); cC.restore();
      } else { /* paillettes : grosses, bien visibles, dans la couleur choisie + blanc + or */
        var cols = [ui.color, '#fff', '#ffe066', lighten(ui.color, 0.55), '#fff'];
        for (var i = 0; i < 8; i++) spark(cC, b.x + (Math.random() - .5) * 86, b.y + (Math.random() - .5) * 86, 6 + Math.random() * 9, cols[(Math.random() * cols.length) | 0]);
      }
    }
    function move(e) {
      if (!stroke) return;
      var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; if (!evs.length) evs = [e];
      evs.forEach(function (ev) {
        var p = pos(ev), dx = p.x - stroke.last.x, dy = p.y - stroke.last.y;
        if (ui.mode === 'glitter' && dx * dx + dy * dy < 400) return;
        if (stroke.erase) eraseLine(stroke.last, p); else paintTo(stroke.last, p, ev.clientX, ev.clientY);
        stroke.last = p; stroke.n++;
      });
      if (stroke.n % 3 === 0) { C.fx.burst(e.clientX, e.clientY, { n: 2, dist: 36, size: stroke.erase ? 16 : 20, dur: 650, colors: stroke.erase ? ['#fff', '#cfe8ff'] : null }); if (stroke.n % 9 === 0) C.sfx.tap(C.rint(0, 8)); }
    }
    function end() { stroke = null; }

    var down = false;
    cvS.style.touchAction = 'none'; wrap.style.touchAction = 'none';
    wrap.addEventListener('pointerdown', function (e) { if (down) return; down = e.pointerId; try { wrap.setPointerCapture(e.pointerId); } catch (x) { } begin(e); e.preventDefault(); });
    wrap.addEventListener('pointermove', function (e) { if (down === e.pointerId) move(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { wrap.addEventListener(ev, function (e) { if (down === e.pointerId) { down = false; end(); } }); });

    /* ----- interface ----- */
    var ui = Ui(host, COLOR_MODES, {
      onColor: function (c, silent) { if (!silent && introStep === 1) startStep2(); },
      onMode: function (id, silent) { if (!silent) endIntroHand(); }
    });
    C.$('[data-do=undo]', host).addEventListener('click', function () { undo(); });
    C.$('[data-do=restart]', host).addEventListener('click', function () {
      C.confirm(Art.ui.again.replace(/#fff/g, '#c4a8ff')).then(function (yes) {
        if (!yes) return; snap(); cC.clearRect(0, 0, N, N); cS.clearRect(0, 0, N, N); C.sfx.whoosh();
      });
    });
    function compose() {
      var cv = document.createElement('canvas'); cv.width = 520; cv.height = 520;
      var x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 520, 520);
      x.drawImage(cvC, 0, 0, 520, 520); x.drawImage(cvL, 0, 0, 520, 520); x.drawImage(cvS, 0, 0, 520, 520);
      return cv.toDataURL('image/jpeg', 0.88);
    }
    function blank() { var a = cC.getImageData(0, 0, N, N).data, b = cS.getImageData(0, 0, N, N).data; for (var i = 3; i < a.length; i += 4) if (a[i] || b[i]) return false; return true; }
    function saveNow() { var url = compose(); dirty = false; return C.saveCreation('color', url).then(function () { return url; }); }
    var doneB = C.doneBtn('J’ai fini mon dessin !', function () {
      if (blank()) { C.nudge(C.$('.optslot', host)); C.say('Colorie d’abord !'); return false; }   /* rien n'est colorié : pas de validation */
      saveNow().then(function (url) { C.finish({ kind: 'color', tile: 'draw', img: url, say: 'Wouah, ton dessin est magnifique !', again: function () { goBack(); } }); });
    });
    C.$('.donehost', host).replaceWith(doneB);
    touched = C.armDoneHint('color', doneB);

    /* ----- aide : la main montre d'abord les couleurs, puis le dessin (2 premières fois seulement, jamais en boucle) ----- */
    function endIntroHand() { if (introHand) { introHand.stop(); introHand = null; } }
    function endIntro() { endIntroHand(); introStep = 3; }
    function startStep2() {
      introStep = 2; endIntroHand();
      C.say('Touche le dessin pour colorier !');
      introHand = C.hint(wrap, 0, 0); setTimeout(endIntroHand, 4500);
    }
    if (introCount < 2) {
      C.store.set('hint.coloring', introCount + 1); introStep = 1;
      C.say('Choisis une couleur !');
      introTimer = setTimeout(function () { introTimer = null; if (introStep === 1 && host.isConnected) { var sw = C.$$('.sw', host)[2]; if (sw) { introHand = C.hint(sw, 0, 6); setTimeout(endIntroHand, 4500); } } }, 1400);
    } else C.say('Colorie ton dessin !');
    updUndo();
    return { autosave: function () { if (dirty && !blank()) saveNow(); } };
  }

  /* ---------- Dessin libre ---------- */
  function FreeDraw(host) {
    var W = 720, H = 960;
    var wrap = C.$('.cv-wrap', host), cv = C.$('.cv-free', host), cx = cv.getContext('2d', { willReadFrequently: true });
    cv.width = W; cv.height = H;
    var size = 28, paper = '#fffdf8', hue = 0;
    var undoStack = [], dirty = false, touched = function () { };
    function snap() { try { undoStack.push(cx.getImageData(0, 0, W, H)); if (undoStack.length > 10) undoStack.shift(); } catch (e) { } dirty = true; touched(); upd(); }
    function upd() { C.$('[data-do=undo]', host).classList.toggle('dim', !undoStack.length); }
    function pos(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
    var last = null, mid = null, down = false, dist = 0, sparkAcc = 0;
    function dot(p) {
      var t = ui.mode;
      cx.save(); cx.globalCompositeOperation = t === 'eraser' ? 'destination-out' : 'source-over';
      cx.fillStyle = t === 'rainbow' ? 'hsl(' + hue + ',90%,60%)' : ui.color;
      cx.beginPath(); cx.arc(p.x, p.y, (t === 'eraser' ? size * 1.6 : size) / 2, 0, Math.PI * 2); cx.fill(); cx.restore();
    }
    function putStamp(p) { Art.color.paintSticker(cx, ui.sticker, p.x, p.y, size * 3 + 70); C.sfx.tap(C.rint(0, 8)); }
    function glit(p) {
      var cols = [ui.color, '#fff', '#ffe066', lighten(ui.color, 0.55), '#fff'];
      for (var i = 0; i < 6; i++) spark(cx, p.x + (Math.random() - .5) * (size * 2.4 + 40), p.y + (Math.random() - .5) * (size * 2.4 + 40), 5 + Math.random() * (7 + size / 5), cols[(Math.random() * cols.length) | 0]);
    }
    function begin(e) {
      var p = pos(e); snap(); down = e.pointerId; last = p; mid = p; dist = 0;
      var col = ui.mode === 'eraser' ? '#8fd3ff' : (ui.mode === 'rainbow' ? 'hsl(' + hue + ',90%,60%)' : ui.color);
      C.fx.ripple(e.clientX, e.clientY, col, 90);
      if (ui.mode === 'stamp') { putStamp(p); C.sfx.boing(); C.fx.burst(e.clientX, e.clientY, { n: 12, dist: 90, size: 22 }); return; }
      dot(p);
      if (ui.mode === 'glitter') glit(p);
    }
    function move(e) {
      if (down !== e.pointerId) return;
      var t = ui.mode;
      var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; if (!evs.length) evs = [e];
      evs.forEach(function (ev) {
        var p = pos(ev);
        var dx = p.x - last.x, dy = p.y - last.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 1.5) return;
        dist += d;
        if (t === 'stamp') { if (dist > size * 3 + 110) { dist = 0; putStamp(p); C.fx.burst(ev.clientX, ev.clientY, { n: 6, dist: 60, size: 18 }); } last = p; return; }
        var m = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 };
        cx.save();
        cx.globalCompositeOperation = t === 'eraser' ? 'destination-out' : 'source-over';
        cx.lineCap = 'round'; cx.lineJoin = 'round';
        cx.lineWidth = t === 'eraser' ? size * 1.6 : (t === 'glitter' ? Math.max(4, size * 0.5) : size);
        if (t === 'rainbow') { hue = (hue + d * 0.9) % 360; cx.strokeStyle = 'hsl(' + hue + ',92%,60%)'; } else cx.strokeStyle = ui.color;
        cx.beginPath(); cx.moveTo(mid.x, mid.y); cx.quadraticCurveTo(last.x, last.y, m.x, m.y); cx.stroke(); cx.restore();
        if (t === 'glitter') glit(p);
        mid = m; last = p;
        sparkAcc += d;
        if (sparkAcc > 130) { sparkAcc = 0; C.fx.burst(ev.clientX, ev.clientY, { n: t === 'glitter' ? 3 : 1, dist: 34, size: 18, dur: 650, colors: t === 'eraser' ? ['#fff', '#cfe8ff'] : null }); }
      });
    }
    function end(e) {
      if (down !== e.pointerId) return;
      var t = ui.mode;
      if (t !== 'stamp' && last) { cx.save(); cx.globalCompositeOperation = t === 'eraser' ? 'destination-out' : 'source-over'; cx.lineCap = 'round'; cx.lineWidth = t === 'eraser' ? size * 1.6 : size; cx.strokeStyle = t === 'rainbow' ? 'hsl(' + hue + ',92%,60%)' : ui.color; cx.beginPath(); cx.moveTo(mid.x, mid.y); cx.lineTo(last.x, last.y); cx.stroke(); cx.restore(); }
      down = false; last = null;
    }
    wrap.style.touchAction = 'none'; cv.style.touchAction = 'none';
    wrap.addEventListener('pointerdown', function (e) { if (down) return; try { wrap.setPointerCapture(e.pointerId); } catch (x) { } begin(e); e.preventDefault(); });
    wrap.addEventListener('pointermove', move);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { wrap.addEventListener(ev, end); });

    var ui = Ui(host, FREE_MODES, {});
    var sizes = C.$('.sizes', host);
    [[14, 14], [28, 24], [52, 36]].forEach(function (s, i) {
      var b = C.el('<button class="szb' + (i === 1 ? ' on' : '') + '" aria-label="taille"><i style="width:' + s[1] + 'px;height:' + s[1] + 'px"></i></button>');
      b.addEventListener('click', function () { size = s[0]; C.select(sizes, '.szb', b); C.sfx.pop(); C.bounce(b, 1.2); });
      sizes.appendChild(b);
    });
    wrap.style.background = paper;
    C.$('[data-do=undo]', host).addEventListener('click', function () { var s = undoStack.pop(); if (!s) { C.sfx.oops(); return; } cx.putImageData(s, 0, 0); upd(); C.sfx.boing(); });
    C.$('[data-do=restart]', host).addEventListener('click', function () {
      C.confirm(Art.ui.again.replace(/#fff/g, '#c4a8ff')).then(function (yes) { if (!yes) return; snap(); cx.clearRect(0, 0, W, H); C.sfx.whoosh(); });
    });
    function blank() { var a = cx.getImageData(0, 0, W, H).data; for (var i = 3; i < a.length; i += 4) if (a[i]) return false; return true; }
    function saveNow() {
      var out = document.createElement('canvas'); out.width = 480; out.height = 640;
      var x = out.getContext('2d'); x.fillStyle = paper; x.fillRect(0, 0, 480, 640); x.drawImage(cv, 0, 0, 480, 640);
      var url = out.toDataURL('image/jpeg', 0.88); dirty = false;
      return C.saveCreation('draw', url).then(function () { return url; });
    }
    var doneB = C.doneBtn('J’ai fini mon dessin !', function () {
      if (blank()) { C.nudge(C.$('.cv-wrap', host)); C.say('Dessine d’abord !'); return false; }   /* page vide : pas de validation */
      saveNow().then(function (url) { C.finish({ kind: 'draw', tile: 'draw', img: url, say: 'Wouah, ton dessin est magnifique !', again: function () { cx.clearRect(0, 0, W, H); undoStack = []; upd(); dirty = false; } }); });
    });
    C.$('.donehost', host).replaceWith(doneB);
    touched = C.armDoneHint('draw', doneB);
    upd();
    return { autosave: function () { if (dirty && !blank()) saveNow(); } };
  }

  C.register('draw', {
    enter: function (el) {
      var root = el;
      root._autosave = function () { if (root._cur && root._cur.autosave) root._cur.autosave(); };
      function hub() {
        root._cur = null;
        C.setBack(null);
        root.innerHTML = '<div class="act hub"><div class="hubgrid">' +
          hubCard('hc1', ART_COLOR, 'Coloriage') + hubCard('hc2', ART_FREE, 'Dessin libre') + '</div></div>';
        root.insertAdjacentHTML('beforeend', '<div class="hubalbum"></div>');
        C.$('.hubalbum', root).appendChild(C.gallery.button('draw'));
        C.$('.hc1', root).onclick = function () { C.sfx.sparkle(); pick(); };
        C.$('.hc2', root).onclick = function () { C.sfx.sparkle(); free(); };
        C.say('Qu’est-ce qu’on fait ?');
      }
      function pick() {
        root._cur = null;
        C.setBack(hub);
        root.innerHTML = '<div class="act pick"><div class="pickgrid scrollable">' + Art.color.pages.map(function (p) {
          return '<button class="pg" data-id="' + p.id + '" aria-label="' + p.name + '">' + Art.color.thumb(p.id) + '</button>';
        }).join('') + '</div></div>';
        C.$$('.pg', root).forEach(function (b, i) { b.style.animationDelay = (i * 0.05) + 's'; b.onclick = function () { C.sfx.pop(); color(b.dataset.id); }; });
        C.say('Choisis un dessin !');
      }
      function color(id) {
        C.setBack(pick);
        root.innerHTML = '<div class="act color"><div class="stage"><div class="cv-wrap"><canvas class="cv-color"></canvas><canvas class="cv-line"></canvas><canvas class="cv-stk"></canvas></div></div>' + trayHtml(COLOR_MODES, false) + '</div>';
        C.fit(C.$('.stage', root), C.$('.cv-wrap', root), 1);
        root._cur = Coloring(root, id, pick);
      }
      function free() {
        C.setBack(hub);
        root.innerHTML = '<div class="act free"><div class="stage"><div class="cv-wrap"><canvas class="cv-free"></canvas></div></div>' + trayHtml(FREE_MODES, true) + '</div>';
        C.fit(C.$('.stage', root), C.$('.cv-wrap', root), 3 / 4);
        root._cur = FreeDraw(root);
        C.say('Dessine avec ton doigt !');
      }
      hub();
    },
    leave: function () { }
  });
})();
