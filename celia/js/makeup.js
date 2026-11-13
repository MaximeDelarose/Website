/* Le salon de maquillage : rouge à lèvres, blush, fard, tampons, coiffures, couronnes et maquillages surprise. */
(function () {
  'use strict';
  var F = Art.face, G = Art.dress;
  var INK = Art.INK;
  var ST = Art.ST;
  var LIPS = ['#ff6f91', '#ff3d7f', '#ff9ac8', '#e0213f', '#ff8a5c', '#c4a8ff', '#6ec6ff'];
  var BLUSH = ['#ff9ac8', '#ffb3d1', '#ff8a8a', '#ffc09a', '#d9b3ff'];
  var SHADOW = ['#c4a8ff', '#8fd3ff', '#ff9ac8', '#8de8b5', '#ffd84d', '#ff9a5c'];
  var STAMPS = ['heart', 'star', 'butterfly', 'flower', 'rainbow', 'glitter'];
  var CROWNS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
  var ICON = {
    lips: Art.svg('0 0 64 64', '<path d="M6 34q12-18 26-8 14-10 26 8-12 22-26 22T6 34z" fill="#ff4d7d" ' + ST(3.500) + '/><path d="M8 34q24 8 48 0" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/><path d="M16 30q6-6 12-2" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".7"/>'),
    blush: Art.svg('0 0 64 64', '<ellipse cx="32" cy="38" rx="24" ry="16" fill="#ff9ac8" opacity=".8"/><rect x="26" y="6" width="12" height="24" rx="5" fill="#ffd84d" ' + ST(3) + '/><path d="M22 30h20l-3 14a7 7 0 0 1-14 0z" fill="#ff7fb0" ' + ST(3) + '/>'),
    shadow: Art.svg('0 0 64 64', '<path d="M6 36q26-34 52 0-26 20-52 0z" fill="#fff" ' + ST(3.500) + '/><path d="M8 34q24-26 48 0-24-8-48 0z" fill="#b794ff"/><circle cx="32" cy="38" r="7" fill="#4a2a55"/><circle cx="34" cy="35" r="2.500" fill="#fff"/>'),
    stamps: Art.svg('0 0 64 64', '<path d="' + Art.P.heart + '" transform="translate(2 8) scale(1.800)" fill="#ff4d8d" ' + ST(1.600) + '/><path d="' + Art.P.star + '" transform="translate(28 26) scale(1.500)" fill="#ffd84d" ' + ST(1.600) + '/>'),
    crown: Art.svg('0 0 64 64', Art.items.crown),
    hair: G.preview('hair', 'long', { hairColor: 0 }),
    me: Art.svg('30 40 240 240', F.render(F.base, { collar: false }), null)
  };
  var PRESETS = [{ skin: 1, eyes: 0, hairColor: 0, hairStyle: 'long' }, { skin: 4, eyes: 0, hairColor: 1, hairStyle: 'curls' }, { skin: 0, eyes: 2, hairColor: 2, hairStyle: 'braids' }, { skin: 2, eyes: 3, hairColor: 3, hairStyle: 'bun' }];
  var TOOLS = ['lips', 'blush', 'shadow', 'stamps', 'hair', 'crown', 'me'];
  var LOOKS = [
    { name: 'chaton', lips: '#ff6f91', blush: '#ffb3d1', shadow: null, crown: 'c5', extras: '<g stroke="' + INK + '" stroke-width="3.500" stroke-linecap="round" fill="none"><path d="M118 238l-62 6M118 250l-62 18M182 238l62 6M182 250l62 18"/></g><path d="M141 224l9 9 9-9z" fill="#ff4d7d" ' + ST(2.500) + '/>', stamps: [] },
    { name: 'papillon', lips: '#ff9ac8', blush: '#ffd0f0', shadow: '#c4a8ff', crown: 'c3', stamps: [{ k: 'butterfly', x: 100, y: 124, s: 1.1 }, { k: 'butterfly', x: 200, y: 124, s: 1.1 }, { k: 'glitter', x: 84, y: 244, s: 1 }, { k: 'glitter', x: 216, y: 244, s: 1 }] },
    { name: 'etoiles', lips: '#e0213f', blush: '#ffc09a', shadow: '#ffd84d', crown: 'c4', stamps: [{ k: 'star', x: 150, y: 118, s: 1.1 }, { k: 'star', x: 78, y: 244, s: 1 }, { k: 'star', x: 222, y: 244, s: 1 }, { k: 'glitter', x: 150, y: 150, s: .9 }] },
    { name: 'licorne', lips: '#ff9ac8', blush: '#ffb3d1', shadow: '#8fd3ff', crown: 'c6', stamps: [{ k: 'rainbow', x: 82, y: 244, s: 1.2 }, { k: 'rainbow', x: 218, y: 244, s: 1.2 }, { k: 'glitter', x: 150, y: 110, s: 1 }] },
    { name: 'clown', lips: '#e0213f', blush: '#ff8a8a', shadow: '#6ec6ff', crown: 'c5', extras: '<circle cx="150" cy="224" r="18" fill="#ff3d5d" ' + ST(3) + '/><circle cx="144" cy="218" r="5" fill="#fff" opacity=".7"/>', stamps: [{ k: 'star', x: 82, y: 244, s: .9 }, { k: 'star', x: 218, y: 244, s: .9 }, { k: 'heart', x: 150, y: 120, s: .8 }] },
    { name: 'fleurs', lips: '#ff9ac8', blush: '#ffc0de', shadow: '#8de8b5', crown: 'c3', stamps: [{ k: 'flower', x: 84, y: 244, s: 1.1 }, { k: 'flower', x: 216, y: 244, s: 1.1 }, { k: 'flower', x: 150, y: 124, s: .9 }] }
  ];

  C.register('makeup', {
    enter: function (el) {
      var cfg = C.profile; cfg.hairStyle = G.fixStyle(cfg.hairStyle); if (cfg.eyes == null) cfg.eyes = 0;
      var S = { lips: null, blush: null, shadow: null, custom: false, crown: null, stamps: [], extras: '' };
      var saved = true, touched = function () { };
      var tool = 'lips', cur = { lips: LIPS[0], blush: BLUSH[0], shadow: SHADOW[0], stamp: 'heart' }, busy = false;
      el.innerHTML = '<div class="dbg">' + Art.svg('0 0 390 700', '<defs><radialGradient id="mkg" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#fff8fc"/><stop offset="1" stop-color="#e5d6ff"/></radialGradient></defs><rect width="390" height="700" fill="url(#mkg)"/><g fill="#fff" opacity=".7">' + [30, 90, 160, 230, 300, 360].map(function (x, i) { return '<path d="' + Art.P.spark + '" transform="translate(' + x + ' ' + (40 + (i * 53) % 300) + ') scale(.9)"/>'; }).join('') + '</g>', null, ' preserveAspectRatio="xMidYMid slice"') + '</div>' +
        '<div class="act mk"><div class="stage"><div class="mkface"></div>' +
        '<div class="actbar left"></div>' +
        '<div class="actbar"><button class="btn yellow" data-do="dice" aria-label="surprise">' + Art.ui.dice + '</button><button class="btn red small" data-do="clear" aria-label="effacer">' + Art.ui.again + '</button></div></div>' +
        '<div class="tray"><div class="tabs"></div><div class="swrow scrollable"></div></div></div><div class="flash"></div>';
      var face = C.$('.mkface', el), left = C.$('.actbar.left', el), tabs = C.$('.tabs', el), sw = C.$('.swrow', el);
      C.fit(C.$('.stage', el), face, 300 / 340);

      function look(extra) { return Object.assign({ skin: cfg.skin, eyes: cfg.eyes, hairColor: cfg.hairColor, hairStyle: cfg.hairStyle }, G.outfitLook(cfg.outfit), extra || {}); }
      function crownSvg() {
        if (!S.crown) return '';
        return '<g transform="translate(150 70) scale(1.55) translate(-120 -36)">' + G.maps.crown[S.crown].svg() + '</g>';
      }
      function stampsSvg() {
        return S.stamps.map(function (p) { return '<g transform="translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ') rotate(' + (p.r || 0) + ') scale(' + (p.s || 1) + ')"><g class="' + (p.fresh ? 'drop' : '') + '">' + F.stamps[p.k] + '</g></g>'; }).join('');
      }
      function mark() { saved = false; touched(); }
      function render() {
        face.innerHTML = Art.svg('0 0 300 340', F.render(F.base, look({ lips: S.lips, blush: S.blush, shadow: S.shadow })) + S.extras + stampsSvg() + crownSvg(), 'mkface-svg');
        S.stamps.forEach(function (p) { p.fresh = false; });
      }
      render();
      function pt(e) {
        var svg = C.$('svg', face), p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
        var m = svg.getScreenCTM(); return m ? p.matrixTransform(m.inverse()) : { x: 150, y: 170 };
      }
      function inFace(p, pad) { var dx = (p.x - 150) / (100 + pad), dy = (p.y - 184) / (106 + pad); return dx * dx + dy * dy <= 1; }
      function clampFace(p) {
        var dx = (p.x - 150) / 92, dy = (p.y - 184) / 98, d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1) { p.x = 150 + dx / d * 92; p.y = 184 + dy / d * 98; }
        return p;
      }
      function screenOf(x, y) { var svg = C.$('svg', face), p = svg.createSVGPoint(); p.x = x; p.y = y; var q = p.matrixTransform(svg.getScreenCTM()); return q; }
      function pop(x, y, col) { var q = screenOf(x, y); C.fx.burst(q.x, q.y, { n: 14, dist: 90, colors: col ? [col, '#fff', '#ffd84d'] : null }); C.sfx.sparkle(); C.sfx.pop(); }
      function wrong(x, y) { var q = screenOf(x, y); C.sfx.oops(); var h = C.hint({ getBoundingClientRect: function () { return { left: q.x - 10, top: q.y - 10, width: 20, height: 20 }; }, isConnected: true }); setTimeout(function () { h.stop(); }, 1600); C.say(tool === 'lips' ? 'Touche les lèvres !' : tool === 'blush' ? 'Touche les joues !' : 'Touche les paupières !'); }

      var spray = null;
      face.addEventListener('pointerdown', function (e) {
        if (busy) return;
        var p = pt(e);
        if (tool === 'lips') { if (inFace(p, 6) && p.y > 218) { mark(); S.lips = cur.lips; render(); pop(150, 250, cur.lips); } else wrong(150, 250); }
        else if (tool === 'blush') { if (inFace(p, 6) && p.y > 170 && p.y < 290) { mark(); S.blush = cur.blush; render(); pop(84, 238, cur.blush); pop(216, 238, cur.blush); } else wrong(84, 238); }
        else if (tool === 'shadow') { if (inFace(p, 6) && p.y > 110 && p.y < 222) { mark(); S.shadow = cur.shadow; render(); pop(113, 182, cur.shadow); pop(187, 182, cur.shadow); } else wrong(113, 182); }
        else if (tool === 'stamps') {
          var q = clampFace(p); addStamp(q, e);
          spray = { id: e.pointerId, last: q, d: 0 };
          try { face.setPointerCapture(e.pointerId); } catch (x) { }
        }
        face.classList.remove('hop'); void face.offsetWidth; face.classList.add('hop');
      });
      function addStamp(q, e) {
        mark(); if (S.stamps.length >= 40) S.stamps.shift();
        S.stamps.push({ k: cur.stamp, x: q.x, y: q.y, s: cur.stamp === 'glitter' ? 1 : (0.9 + Math.random() * 0.4), r: C.rint(-20, 20), fresh: true });
        render(); C.sfx.tap(C.rint(0, 8)); C.fx.burst(e.clientX, e.clientY, { n: 6, dist: 60, size: 16 });
      }
      face.addEventListener('pointermove', function (e) {
        if (!spray || spray.id !== e.pointerId || cur.stamp !== 'glitter') return;
        var q = clampFace(pt(e)); spray.d += Math.hypot(q.x - spray.last.x, q.y - spray.last.y); spray.last = q;
        if (spray.d > 18) { spray.d = 0; addStamp(q, e); }
      });
      ['pointerup', 'pointercancel'].forEach(function (ev) { face.addEventListener(ev, function () { spray = null; }); });

      /* personnages prêts à jouer : même visage, autres couleurs et coiffures (tout reste modifiable dans l'onglet de droite) */
      PRESETS.forEach(function (pr, i) {
        var b = C.el('<button class="charb" aria-label="personnage">' + Art.svg('0 0 300 340', F.render(F.base, Object.assign({}, pr, { top: '#8fd0ff' })), null) + '</button>');
        b.onclick = function () { Object.assign(cfg, pr); C.saveProfile(); mark(); S.custom = true; C.select(left, '.charb', b); C.sfx.pop(); render(); face.classList.remove('hop'); void face.offsetWidth; face.classList.add('hop'); fill(); };
        left.appendChild(b);
      });
      C.$$('.charb', left).forEach(function (b) { b.style.width = '50px'; b.style.height = '50px'; });
      left.style.top = 'calc(6px)';

      /* outils */
      function fill() {
        sw.innerHTML = '';
        function swatch(c, key, i) { var b = C.el('<button class="it round' + (cur[key] === c ? ' on' : '') + '" style="--c:' + c + '" aria-label="couleur"></button>'); b.onclick = function () { cur[key] = c; C.select(sw, '.it', b); C.sfx.tap(i); C.bounce(b); C.say(key === 'lips' ? 'Touche les lèvres !' : key === 'blush' ? 'Touche les joues !' : 'Touche les paupières !'); }; sw.appendChild(b); }
        if (tool === 'lips') LIPS.forEach(function (c, i) { swatch(c, 'lips', i); });
        else if (tool === 'blush') BLUSH.forEach(function (c, i) { swatch(c, 'blush', i); });
        else if (tool === 'shadow') SHADOW.forEach(function (c, i) { swatch(c, 'shadow', i); });
        else if (tool === 'stamps') STAMPS.forEach(function (k) { var b = C.el('<button class="it' + (cur.stamp === k ? ' on' : '') + '" aria-label="tampon"><svg viewBox="-24 -24 48 48">' + F.stamps[k] + '</svg></button>'); b.onclick = function () { cur.stamp = k; C.select(sw, '.it', b); C.sfx.pop(); C.bounce(b); }; sw.appendChild(b); });
        else if (tool === 'hair') {
          G.hairStyles.forEach(function (s) { var b = C.el('<button class="it' + (cfg.hairStyle === s ? ' on' : '') + '" aria-label="coiffure">' + Art.svg('0 0 300 340', F.render(F.base, look({ hairStyle: s, collar: false })), null) + '</button>'); b.onclick = function () { mark(); S.custom = true; cfg.hairStyle = s; C.saveProfile(); render(); C.select(sw, '.it', b); C.sfx.sparkle(); C.sfx.boing(); face.classList.remove('hop'); void face.offsetWidth; face.classList.add('hop'); }; sw.appendChild(b); });
        } else if (tool === 'me') {
          var round = function (key, i, col) { var b = C.el('<button class="it round' + (cfg[key] === i ? ' on' : '') + '" style="--c:' + col + '" aria-label="couleur"></button>'); b.onclick = function () { mark(); S.custom = true; cfg[key] = i; C.saveProfile(); render(); C.select(sw, '.it', b); C.sfx.sparkle(); C.bounce(b); face.classList.remove('hop'); void face.offsetWidth; face.classList.add('hop'); }; sw.appendChild(b); };
          G.skins.forEach(function (c, i) { round('skin', i, c); });
          sw.appendChild(C.el('<span class="gap"></span>'));
          G.eyeColors.forEach(function (c, i) { round('eyes', i, c); });
          sw.appendChild(C.el('<span class="gap"></span>'));
          G.hairColors.forEach(function (h, i) { round('hairColor', i, h.c); });
        } else if (tool === 'crown') {
          var none = C.el('<button class="it none' + (!S.crown ? ' on' : '') + '" aria-label="aucun"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="16" fill="none" stroke="#c4a8ff" stroke-width="5"/><path d="M13 35L35 13" stroke="#c4a8ff" stroke-width="5" stroke-linecap="round"/></svg></button>');
          none.onclick = function () { S.crown = null; render(); C.select(sw, '.it', none); C.sfx.whoosh(); }; sw.appendChild(none);
          CROWNS.forEach(function (id) { var b = C.el('<button class="it' + (S.crown === id ? ' on' : '') + '" aria-label="couronne">' + G.preview('crown', id) + '</button>'); b.onclick = function () { mark(); S.crown = id; render(); C.select(sw, '.it', b); C.sfx.sparkle(); C.sfx.boing(); pop(150, 60); }; sw.appendChild(b); });
        }
      }
      TOOLS.forEach(function (t) {
        var b = C.el('<button class="tab' + (t === tool ? ' on' : '') + '" aria-label="' + t + '">' + ICON[t] + '</button>');
        b.onclick = function () { tool = t; C.select(tabs, '.tab', b); C.sfx.pop(); fill(); };
        tabs.appendChild(b);
      });
      fill();

      /* maquillage surprise : le look s'applique étape par étape */
      C.$('[data-do=dice]', el).onclick = function () {
        if (busy) return; busy = true;
        var L = C.rnd(LOOKS); C.sfx.magic(); C.say('Maquillage surprise !');
        S.lips = S.blush = S.shadow = S.crown = null; S.stamps = []; S.extras = ''; render();
        var steps = [
          function () { S.lips = L.lips; },
          function () { S.blush = L.blush; },
          function () { S.shadow = L.shadow; },
          function () { S.extras = L.extras || ''; },
          function () { S.crown = L.crown; }
        ].concat((L.stamps || []).map(function (s) { return function () { S.stamps.push({ k: s.k, x: s.x, y: s.y, s: s.s, r: C.rint(-10, 10), fresh: true }); }; }));
        var i = 0;
        (function next() {
          if (i >= steps.length) { busy = false; C.sfx.yay(); fill(); return; }
          steps[i++](); render(); C.sfx.tap(i); var q = screenOf(150, 170); C.fx.burst(q.x + (Math.random() * 120 - 60), q.y + (Math.random() * 100 - 50), { n: 8, dist: 80 });
          setTimeout(next, 360);
        })();
      };
      C.$('[data-do=clear]', el).onclick = function () {
        C.confirm(Art.ui.again.replace(/#fff/g, '#c4a8ff')).then(function (yes) {
          if (!yes) return; S.lips = S.blush = S.shadow = S.crown = null; S.stamps = []; S.extras = ''; render(); fill(); C.sfx.whoosh();
        });
      };
      var finishMk = function () {
        if (!(S.lips || S.blush || S.shadow || S.crown || S.stamps.length || S.extras || S.custom)) { C.nudge(face); C.say('Maquille d\u2019abord !'); return false; }
        var fl = C.$('.flash', el); C.sfx.shutter(); fl.classList.add('go'); setTimeout(function () { fl.classList.remove('go'); }, 700);
        var svg = C.$('svg', face);
        C.rasterSvg(svg, 480, 544, function (cx, w, h) { var g = cx.createRadialGradient(w / 2, h * 0.4, 20, w / 2, h * 0.45, h * 0.8); g.addColorStop(0, '#fff8fc'); g.addColorStop(1, '#d9c5ff'); cx.fillStyle = g; cx.fillRect(0, 0, w, h); })
          .then(function (url) { return C.saveCreation('makeup', url).then(function () { saved = true; C.finish({ kind: 'makeup', tile: 'makeup', img: url, say: 'Bravo ' + C.NAME + ' ! Tu es magnifique !', again: function () { S.lips = S.blush = S.shadow = S.crown = null; S.stamps = []; S.extras = ''; render(); fill(); saved = true; } }); }); })
          .catch(function () { C.say('Oups !'); });
      };
      var doneB = C.doneBar(C.$('.tray', el), 'C\u2019est terminé !', finishMk);
      touched = C.armDoneHint('makeup', doneB);
      /* sauvegarde automatique si elle quitte sans avoir appuyé sur « J'ai fini » */
      el._autosave = function () {
        if (saved || !(S.lips || S.blush || S.shadow || S.crown || S.stamps.length || S.extras)) return; saved = true;
        var svg = C.$('svg', face); if (!svg) return;
        C.rasterSvg(svg, 480, 544, function (cx, w, h) { cx.fillStyle = '#efe5ff'; cx.fillRect(0, 0, w, h); }).then(function (url) { return C.saveCreation('makeup', url); }).catch(function () { });
      };
      C.say('Choisis un rouge à lèvres !');
    },
    leave: function () { }
  });
})();
