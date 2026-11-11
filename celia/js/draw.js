/* Atelier de dessin : coloriage (remplissage réel par zones fermées) et dessin libre au doigt. */
(function () {
  'use strict';
  var N = 600; /* résolution interne du coloriage */

  function hubCard(cls, art, label) { return '<button class="hubcard ' + cls + '" aria-label="' + label + '">' + art + '<span>' + label + '</span></button>'; }
  var ART_COLOR = Art.svg('0 0 120 120', '<rect x="12" y="10" width="96" height="96" rx="12" fill="#fff" ' + Art.ST(4) + '/><path d="M40 90c-6-14 0-30 12-30-4-14 6-26 18-22 14-2 24 10 20 26 6 8 2 22-10 26z" fill="#ff9ac8" ' + Art.ST(3.500) + '/><path d="M52 60c8-8 14-4 20-10" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><g transform="translate(70 70) rotate(30)"><rect x="-4" y="-6" width="9" height="40" rx="4.500" fill="#ffb93c" ' + Art.ST(3) + '/><path d="M-6 34h14l-4 12h-6z" fill="#4fd8d0" ' + Art.ST(3) + '/></g><circle cx="30" cy="30" r="8" fill="#ffd84d"/>');
  var ART_FREE = Art.svg('0 0 120 120', '<path d="M14 84C30 40 44 100 62 60s30-40 44-10" fill="none" stroke="#ff6f91" stroke-width="10" stroke-linecap="round"/><path d="M14 94C30 54 44 108 62 72s30-36 44-8" fill="none" stroke="#4fd8d0" stroke-width="10" stroke-linecap="round" opacity=".9"/><g transform="translate(84 6) rotate(32)"><path d="M0 0h18v54L9 70l-9-16z" fill="#ffd84d" ' + Art.ST(3.500) + '/><path d="M0 12h18" stroke="#ff8fb8" stroke-width="6"/><path d="M0 54L9 70l9-16z" fill="#f4d9b0" ' + Art.ST(3) + '/><path d="M6 66l3 4 3-4z" fill="#6b3f72"/></g>');

  /* ---------- Coloriage ---------- */
  function Coloring(host, pageId, goBack) {
    var wrap = C.$('.cv-wrap', host), cvC = C.$('.cv-color', host), cvL = C.$('.cv-line', host), cvS = C.$('.cv-stk', host);
    var cC = cvC.getContext('2d', { willReadFrequently: true }), cL = cvL.getContext('2d', { willReadFrequently: true }), cS = cvS.getContext('2d', { willReadFrequently: true });
    [cvC, cvL, cvS].forEach(function (c) { c.width = N; c.height = N; });
    var wall = new Uint8Array(N * N), ready = false;
    var color = '#ff8fd0', tool = 'bucket', sticker = 'etoile';
    var undoStack = [];
    var busy = false, dirty = false, fills = 0, touched = function () { };

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
    function snap() {
      try { undoStack.push([cC.getImageData(0, 0, N, N), cS.getImageData(0, 0, N, N)]); if (undoStack.length > 12) undoStack.shift(); } catch (e) { }
      dirty = true; touched(); updUndo();
    }
    function updUndo() { var u = C.$('[data-do=undo]', host); if (u) u.classList.toggle('dim', !undoStack.length); }
    function undo() {
      var s = undoStack.pop(); if (!s) { C.sfx.oops(); return; }
      cC.putImageData(s[0], 0, 0); cS.putImageData(s[1], 0, 0); updUndo(); C.sfx.boing();
    }
    /* zone fermée contenant (x,y) ; cherche le pixel libre le plus proche si on touche un trait */
    function region(x, y) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= N || y >= N) return null;
      if (wall[y * N + x]) {
        var found = false;
        for (var r = 1; r <= 10 && !found; r++) for (var dy = -r; dy <= r && !found; dy++) for (var dx = -r; dx <= r; dx++) {
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
      /* dilatation sous les traits (2 px) pour que la couleur passe sous le contour */
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
    function maskCanvas(reg) {
      var m = document.createElement('canvas'); m.width = N; m.height = N;
      var mc = m.getContext('2d'), id = mc.createImageData(N, N), d = id.data, mk = reg.mask;
      for (var i = 0, p = 3; i < mk.length; i++, p += 4) if (mk[i]) d[p] = 255;
      mc.putImageData(id, 0, 0); return m;
    }

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
    function clearRegion(reg) {
      var id = cC.getImageData(0, 0, N, N), d = id.data, mk = reg.mask;
      for (var i = 0, p = 3; i < mk.length; i++, p += 4) if (mk[i]) d[p] = 0;
      cC.putImageData(id, 0, 0);
    }

    /* pinceau / paillettes limités à la zone de départ */
    var stroke = null;
    function begin(e) {
      var p = pos(e);
      if (!ready || busy) return;
      var screenX = e.clientX, screenY = e.clientY;
      if (tool === 'bucket') {
        var r = region(p.x, p.y); if (!r) { C.sfx.oops(); return; }
        snap(); fillRegion(r, color);
        C.sfx.tap(C.rint(0, 6)); C.sfx.pop(); C.fx.burst(screenX, screenY, { n: 12, dist: 90 });
        fills++; if (fills % 6 === 1) C.say('Oh, quelle jolie couleur !', { keep: false });
      } else if (tool === 'eraser') {
        var r2 = region(p.x, p.y); if (!r2) return; snap(); clearRegion(r2); C.sfx.whoosh(); C.fx.burst(screenX, screenY, { n: 8, shapes: ['dot'], colors: ['#fff', '#e5d6ff'], dist: 60 });
      } else if (tool === 'sticker') {
        snap(); Art.color.paintSticker(cS, sticker, p.x, p.y, 110); C.sfx.boing(); C.sfx.sparkle(); C.fx.burst(screenX, screenY, { n: 12, dist: 90 });
      } else {
        var r3 = region(p.x, p.y); if (!r3) return;
        snap();
        stroke = { reg: r3, mc: maskCanvas(r3), last: p, tmp: document.createElement('canvas'), n: 0 };
        stroke.tmp.width = N; stroke.tmp.height = N;
        paintTo(p, p);
      }
    }
    function paintTo(a, b) {
      var s = stroke, t = s.tmp.getContext('2d');
      t.clearRect(0, 0, N, N);
      if (tool === 'brush') {
        t.lineCap = 'round'; t.lineJoin = 'round'; t.strokeStyle = color; t.lineWidth = 34;
        t.beginPath(); t.moveTo(a.x, a.y); t.lineTo(b.x, b.y); t.stroke();
      } else { /* paillettes */
        var cols = ['#fff', '#ffe066', '#ffb3d9', '#bfe6ff', '#d9c5ff'];
        for (var i = 0; i < 5; i++) {
          var px = b.x + (Math.random() - .5) * 60, py = b.y + (Math.random() - .5) * 60, r = 3 + Math.random() * 6;
          t.fillStyle = cols[(Math.random() * cols.length) | 0];
          t.beginPath(); t.moveTo(px, py - r * 1.6); t.quadraticCurveTo(px, py, px + r * 1.6, py); t.quadraticCurveTo(px, py, px, py + r * 1.6); t.quadraticCurveTo(px, py, px - r * 1.6, py); t.quadraticCurveTo(px, py, px, py - r * 1.6); t.fill();
        }
      }
      t.globalCompositeOperation = 'destination-in'; t.drawImage(s.mc, 0, 0); t.globalCompositeOperation = 'source-over';
      cC.drawImage(s.tmp, 0, 0);
    }
    function move(e) {
      if (!stroke) return;
      var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; if (!evs.length) evs = [e];
      evs.forEach(function (ev) {
        var p = pos(ev), dx = p.x - stroke.last.x, dy = p.y - stroke.last.y;
        if (tool === 'glitter' && dx * dx + dy * dy < 140) return;
        paintTo(stroke.last, p); stroke.last = p; stroke.n++;
      });
      if (stroke.n % 3 === 0) { C.fx.burst(e.clientX, e.clientY, { n: 1, dist: 26, size: 14, dur: 600 }); if (stroke.n % 9 === 0) C.sfx.tap(C.rint(0, 8)); }
    }
    function end() { stroke = null; }

    var down = false;
    cvS.style.touchAction = 'none'; wrap.style.touchAction = 'none';
    wrap.addEventListener('pointerdown', function (e) { if (down) return; down = e.pointerId; try { wrap.setPointerCapture(e.pointerId); } catch (x) { } begin(e); e.preventDefault(); });
    wrap.addEventListener('pointermove', function (e) { if (down === e.pointerId) move(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { wrap.addEventListener(ev, function (e) { if (down === e.pointerId) { down = false; end(); } }); });

    /* barre d'outils */
    var tools = C.$('.tools', host), pal = C.$('.palette', host), stk = C.$('.stickers', host);
    function setTool(t, node) {
      tool = t; C.select(tools, '[data-tool]', node);
      pal.hidden = t === 'sticker' || t === 'eraser' || t === 'glitter';
      stk.hidden = t !== 'sticker';
      C.sfx.pop();
    }
    C.$$('[data-tool]', tools).forEach(function (b) { b.addEventListener('click', function () { setTool(b.dataset.tool, b); }); });
    Art.color.palette.forEach(function (c) {
      var s = C.el('<button class="sw" style="--c:' + c + '" aria-label="couleur"></button>');
      s.addEventListener('click', function () { color = c; C.select(pal, '.sw', s); C.sfx.tap(C.rint(0, 6)); C.bounce(s); if (tool === 'eraser' || tool === 'sticker') setTool('bucket', C.$('[data-tool=bucket]', tools)); });
      pal.appendChild(s);
    });
    C.$('.sw', pal).classList.add('on'); C.select(pal, '.sw', C.$$('.sw', pal)[7]);
    Art.color.stickers.forEach(function (s) {
      var b = C.el('<button class="stk" aria-label="autocollant">' + Art.color.stampSvg(s.id) + '</button>');
      b.addEventListener('click', function () { sticker = s.id; C.select(stk, '.stk', b); C.sfx.pop(); C.bounce(b); });
      stk.appendChild(b);
    });
    C.select(stk, '.stk', C.$('.stk', stk));
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
    var doneB = C.doneBar(C.$('.tray', host), 'J\u2019ai fini mon dessin !', function () {
      if (blank()) { C.nudge(C.$('.pslot', host)); C.say('Colorie d\u2019abord !'); return false; }   /* rien n'est colorié : pas de validation */
      saveNow().then(function (url) { C.finish({ kind: 'color', tile: 'draw', img: url, say: 'Wouah, ton dessin est magnifique !', again: function () { goBack(); } }); });
    });
    touched = C.armDoneHint('color', doneB);
    updUndo();
    return { autosave: function () { if (dirty && !blank()) saveNow(); } };
  }

  /* ---------- Dessin libre ---------- */
  function FreeDraw(host) {
    var W = 720, H = 960;
    var wrap = C.$('.cv-wrap', host), cv = C.$('.cv-free', host), cx = cv.getContext('2d', { willReadFrequently: true });
    cv.width = W; cv.height = H;
    var color = '#ff5d9e', size = 14, tool = 'pen', stamp = 'etoile', paper = '#fffdf8', hue = 0;
    var undoStack = [], dirty = false, touched = function () { };
    function snap() { try { undoStack.push(cx.getImageData(0, 0, W, H)); if (undoStack.length > 10) undoStack.shift(); } catch (e) { } dirty = true; touched(); upd(); }
    function upd() { C.$('[data-do=undo]', host).classList.toggle('dim', !undoStack.length); }
    function pos(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
    var last = null, mid = null, down = false, dist = 0, sparkAcc = 0;
    function dot(p) {
      cx.save(); cx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      cx.fillStyle = tool === 'rainbow' ? 'hsl(' + hue + ',90%,60%)' : color;
      cx.beginPath(); cx.arc(p.x, p.y, (tool === 'eraser' ? size * 1.6 : size) / 2, 0, Math.PI * 2); cx.fill(); cx.restore();
    }
    function putStamp(p) {
      var k = size * 4.2 + 30;
      Art.color.paintSticker(cx, stamp, p.x, p.y, k);
      C.sfx.tap(C.rint(0, 8));
    }
    function begin(e) {
      var p = pos(e); snap(); down = e.pointerId; last = p; mid = p; dist = 0;
      if (tool === 'stamp') { putStamp(p); C.sfx.boing(); C.fx.burst(e.clientX, e.clientY, { n: 8, dist: 70 }); return; }
      dot(p);
      if (tool === 'glitter') glit(p);
    }
    function glit(p) {
      var cols = ['#fff', '#ffe066', '#ffb3d9', '#bfe6ff', '#d9c5ff'];
      for (var i = 0; i < 3; i++) {
        var px = p.x + (Math.random() - .5) * size * 3, py = p.y + (Math.random() - .5) * size * 3, r = 3 + Math.random() * (4 + size / 4);
        cx.fillStyle = cols[(Math.random() * cols.length) | 0];
        cx.beginPath(); cx.moveTo(px, py - r * 1.6); cx.quadraticCurveTo(px, py, px + r * 1.6, py); cx.quadraticCurveTo(px, py, px, py + r * 1.6); cx.quadraticCurveTo(px, py, px - r * 1.6, py); cx.quadraticCurveTo(px, py, px, py - r * 1.6); cx.fill();
      }
    }
    function move(e) {
      if (down !== e.pointerId) return;
      var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; if (!evs.length) evs = [e];
      evs.forEach(function (ev) {
        var p = pos(ev);
        var dx = p.x - last.x, dy = p.y - last.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 1.5) return;
        dist += d;
        if (tool === 'stamp') { if (dist > size * 4.2 + 50) { dist = 0; putStamp(p); C.fx.burst(ev.clientX, ev.clientY, { n: 4, dist: 50 }); } last = p; return; }
        var m = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 };
        cx.save();
        cx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
        cx.lineCap = 'round'; cx.lineJoin = 'round';
        cx.lineWidth = tool === 'eraser' ? size * 1.6 : (tool === 'glitter' ? Math.max(3, size * 0.6) : size);
        if (tool === 'rainbow') { hue = (hue + d * 0.9) % 360; cx.strokeStyle = 'hsl(' + hue + ',92%,60%)'; } else cx.strokeStyle = tool === 'glitter' ? color : color;
        cx.beginPath(); cx.moveTo(mid.x, mid.y); cx.quadraticCurveTo(last.x, last.y, m.x, m.y); cx.stroke(); cx.restore();
        if (tool === 'glitter') glit(p);
        mid = m; last = p;
        sparkAcc += d;
        if (sparkAcc > 160 && tool !== 'eraser') { sparkAcc = 0; C.fx.burst(ev.clientX, ev.clientY, { n: 1, dist: 24, size: 14, dur: 600 }); }
      });
    }
    function end(e) {
      if (down !== e.pointerId) return;
      if (tool !== 'stamp' && last) { cx.save(); cx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'; cx.lineCap = 'round'; cx.lineWidth = tool === 'eraser' ? size * 1.6 : size; cx.strokeStyle = tool === 'rainbow' ? 'hsl(' + hue + ',92%,60%)' : color; cx.beginPath(); cx.moveTo(mid.x, mid.y); cx.lineTo(last.x, last.y); cx.stroke(); cx.restore(); }
      down = false; last = null;
    }
    wrap.style.touchAction = 'none'; cv.style.touchAction = 'none';
    wrap.addEventListener('pointerdown', function (e) { if (down) return; try { wrap.setPointerCapture(e.pointerId); } catch (x) { } begin(e); e.preventDefault(); });
    wrap.addEventListener('pointermove', move);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { wrap.addEventListener(ev, end); });

    var tools = C.$('.tools', host), pal = C.$('.palette', host), stk = C.$('.stickers', host), sizes = C.$('.sizes', host), papers = C.$('.papers', host);
    function setTool(t, node) {
      tool = t; C.select(tools, '[data-tool]', node);
      pal.hidden = t === 'eraser' || t === 'rainbow' || t === 'stamp';
      stk.hidden = t !== 'stamp';
      C.sfx.pop();
    }
    C.$$('[data-tool]', tools).forEach(function (b) { b.addEventListener('click', function () { setTool(b.dataset.tool, b); }); });
    Art.color.palette.forEach(function (c) {
      var s = C.el('<button class="sw" style="--c:' + c + '" aria-label="couleur"></button>');
      s.addEventListener('click', function () { color = c; C.select(pal, '.sw', s); C.sfx.tap(C.rint(0, 6)); C.bounce(s); if (tool === 'eraser' || tool === 'rainbow') setTool('pen', C.$('[data-tool=pen]', tools)); });
      pal.appendChild(s);
    });
    C.select(pal, '.sw', C.$$('.sw', pal)[7]);
    Art.color.stickers.forEach(function (s) {
      var b = C.el('<button class="stk" aria-label="tampon">' + Art.color.stampSvg(s.id) + '</button>');
      b.addEventListener('click', function () { stamp = s.id; C.select(stk, '.stk', b); C.sfx.pop(); C.bounce(b); });
      stk.appendChild(b);
    });
    C.select(stk, '.stk', C.$('.stk', stk));
    [[6, 14], [14, 22], [30, 34]].forEach(function (s, i) {
      var b = C.el('<button class="szb" aria-label="taille"><i style="width:' + s[1] + 'px;height:' + s[1] + 'px"></i></button>');
      b.addEventListener('click', function () { size = s[0]; C.select(sizes, '.szb', b); C.sfx.pop(); });
      sizes.appendChild(b);
    });
    C.select(sizes, '.szb', C.$$('.szb', sizes)[1]);
    ['#fffdf8', '#ffe3f1', '#d9f1ff', '#2a2250'].forEach(function (pc) {
      var b = C.el('<button class="paper" style="--c:' + pc + '" aria-label="papier"></button>');
      b.addEventListener('click', function () { paper = pc; wrap.style.background = pc; C.select(papers, '.paper', b); C.sfx.pop(); });
      papers.appendChild(b);
    });
    C.select(papers, '.paper', C.$('.paper', papers));
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
    var doneB = C.doneBar(C.$('.tray', host), 'J\u2019ai fini mon dessin !', function () {
      if (blank()) { C.nudge(C.$('.cv-wrap', host)); C.say('Dessine d\u2019abord !'); return false; }   /* page vide : pas de validation */
      saveNow().then(function (url) { C.finish({ kind: 'draw', tile: 'draw', img: url, say: 'Wouah, ton dessin est magnifique !', again: function () { cx.clearRect(0, 0, W, H); undoStack = []; upd(); dirty = false; } }); });
    });
    touched = C.armDoneHint('draw', doneB);
    upd();
    return { autosave: function () { if (dirty && !blank()) saveNow(); } };
  }

  function toolbar(isFree) {
    var t = isFree
      ? [['pen', 'brush', 'pink'], ['rainbow', 'rainbow', 'purple'], ['glitter', 'sparkles', 'yellow'], ['stamp', 'sticker', 'turq'], ['eraser', 'eraser', 'blue']]
      : [['bucket', 'bucket', 'pink'], ['brush', 'brush', 'purple'], ['glitter', 'sparkles', 'yellow'], ['sticker', 'sticker', 'turq'], ['eraser', 'eraser', 'blue']];
    return '<div class="tools">' + t.map(function (x, i) { return '<button class="btn ' + x[2] + (i === 0 ? ' on' : '') + '" data-tool="' + x[0] + '" aria-label="' + x[0] + '">' + Art.ui[x[1]] + '</button>'; }).join('') +
      '<span class="sep"></span><button class="btn green small" data-do="undo" aria-label="annuler">' + Art.ui.undo + '</button><button class="btn red small" data-do="restart" aria-label="recommencer">' + Art.ui.again + '</button></div>';
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
        root.innerHTML = '<div class="act color"><div class="stage"><div class="cv-wrap"><canvas class="cv-color"></canvas><canvas class="cv-line"></canvas><canvas class="cv-stk"></canvas></div></div>' +
          '<div class="tray">' + toolbar(false) + '<div class="pslot"><div class="palette"></div><div class="stickers" hidden></div></div></div></div>';
        C.fit(C.$('.stage', root), C.$('.cv-wrap', root), 1);
        root._cur = Coloring(root, id, pick);
        C.say('Choisis une couleur, puis touche le dessin !');
      }
      function free() {
        C.setBack(hub);
        root.innerHTML = '<div class="act free"><div class="stage"><div class="cv-wrap"><canvas class="cv-free"></canvas></div></div>' +
          '<div class="tray">' + toolbar(true) + '<div class="pslot"><div class="palette"></div><div class="stickers" hidden></div></div><div class="sizes"></div><div class="papers"></div></div></div>';
        C.fit(C.$('.stage', root), C.$('.cv-wrap', root), 3 / 4);
        root._cur = FreeDraw(root);
        C.say('Dessine avec ton doigt !');
      }
      hub();
    },
    leave: function () { }
  });
})();
