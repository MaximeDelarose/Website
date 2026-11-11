/* Petits jeux éducatifs : couleurs, formes, compter, animaux, petit/grand, puzzles. Aucune sanction : un indice visuel et de l'encouragement. */
(function () {
  'use strict';
  var P = Art.pets, ST = Art.ST;
  var COLORS = [{ n: 'rouge', c: '#ff4d6d' }, { n: 'jaune', c: '#ffd84d' }, { n: 'bleu', c: '#4da6ff' }, { n: 'vert', c: '#4fd86a' }, { n: 'rose', c: '#ff8fd0' }, { n: 'violet', c: '#a47cff' }, { n: 'orange', c: '#ff9a3c' }];
  var PRAISE = ['Bravo !', 'Super !', 'Tu es forte !', 'Bien joué !', 'Youpi !', 'Magnifique !'];
  var SHAPES = {
    rond: function (c) { return '<circle cx="50" cy="50" r="38" fill="' + c + '" ' + ST(5) + '/>'; },
    carre: function (c) { return '<rect x="14" y="14" width="72" height="72" rx="8" fill="' + c + '" ' + ST(5) + '/>'; },
    triangle: function (c) { return '<path d="M50 10L92 86H8z" fill="' + c + '" ' + ST(5) + ' stroke-linejoin="round"/>'; }
  };
  var O = Fr.OBJ;
  var ANIMALS = [
    { id: 'chat', type: 'chat', o: O.chat, say: 'Miaou !', snd: 'chat' }, { id: 'chiot', type: 'chiot', o: O.chien, say: 'Ouaf ouaf !', snd: 'chien' },
    { id: 'lapin', type: 'lapin', o: O.lapin, say: 'Il fait de petits bonds !', snd: 'lapin' }, { id: 'panda', type: 'panda', o: O.panda, say: 'Il aime le bambou !', snd: 'panda' },
    { id: 'licorne', type: 'licorne', o: O.licorne, say: 'Hi hi hi !', snd: 'licorne' }, { id: 'dragon', type: 'dragon', o: O.dragon, say: 'Groar !', snd: 'dragon' }
  ];
  var OBJ = [{ k: 'apple', o: O.pomme }, { k: 'star', o: O.etoile }, { k: 'heart', o: O.coeur }, { k: 'flower', o: O.fleur }, { k: 'ball', o: O.balle }];
  function butter(col) { return Art.svg('0 0 64 64', Art.items.butterfly.replace(/#ff8fb8/g, col).replace(/#ffb98a/g, col)); }
  function shapeSvg(k, c) { return Art.svg('0 0 100 100', SHAPES[k](c)); }
  var CARD = {
    colors: butter('#ffd84d'), shapes: Art.svg('0 0 100 100', '<circle cx="28" cy="30" r="20" fill="#ff8fb8" ' + ST(4) + '/><rect x="52" y="12" width="38" height="38" rx="6" fill="#4fd8d0" ' + ST(4) + '/><path d="M50 92L24 54h52z" fill="#ffd84d" ' + ST(4) + ' stroke-linejoin="round"/>'),
    count: Art.svg('0 0 100 100', '<g transform="translate(2 24) scale(.5)">' + Art.items.apple + '</g><g transform="translate(34 4) scale(.5)">' + Art.items.apple + '</g><g transform="translate(60 30) scale(.5)">' + Art.items.apple + '</g>'),
    animals: P.render('chat', 0, {}), size: Art.svg('0 0 100 100', '<g transform="translate(0 6) scale(1.15)">' + Art.items.ball + '</g><g transform="translate(62 54) scale(.5)">' + Art.items.ball + '</g>'),
    puzzle: Art.svg('0 0 100 100', '<path d="M12 12h30a8 8 0 1 1 16 0h30v30a8 8 0 1 0 0 16v30H58a8 8 0 1 0-16 0H12z" fill="#c4a8ff" ' + ST(4) + ' stroke-linejoin="round"/><path d="' + Art.P.star + '" transform="translate(34 34) scale(1.3)" fill="#ffd84d" ' + ST(2) + '/>')
  };
  var GAMES = ['colors', 'shapes', 'count', 'animals', 'size', 'puzzle'];
  var COL = { colors: ['#fff4c9', '#ffd98a'], shapes: ['#dff4ff', '#a0d8ff'], count: ['#ffe3e3', '#ffb3b3'], animals: ['#dcfbe8', '#9fe8bf'], size: ['#efe2ff', '#cdb0ff'], puzzle: ['#ffe3f1', '#ffb0d6'] };

  /* glisser un élément avec le doigt */
  function drag(node, h) {
    var id = null, sx = 0, sy = 0;
    node.style.touchAction = 'none';
    node.addEventListener('pointerdown', function (e) { if (id !== null) return; id = e.pointerId; try { node.setPointerCapture(id); } catch (x) { } sx = e.clientX; sy = e.clientY; node.style.transition = 'none'; h.start && h.start(e); e.preventDefault(); });
    node.addEventListener('pointermove', function (e) { if (id !== e.pointerId) return; h.move(e.clientX - sx, e.clientY - sy, e); });
    ['pointerup', 'pointercancel'].forEach(function (ev) { node.addEventListener(ev, function (e) { if (id !== e.pointerId) return; id = null; h.end(e.clientX - sx, e.clientY - sy, e); }); });
  }

  C.register('learn', {
    enter: function (el) {
      var root = el, live = true, timers = [];
      el._stop = function () { live = false; timers.forEach(clearTimeout); C.say.stop(); };
      function later(fn, ms) { var t = setTimeout(function () { if (live) fn(); }, ms); timers.push(t); return t; }
      root.innerHTML = '<div class="sbgl"></div><div class="act"><div class="stage"></div></div>';
      var stage = C.$('.stage', root);
      C.$('.sbgl', root).innerHTML = Art.svg('0 0 390 700', '<defs>' + Art.sky('lg', '#ffeef8', '#ffe0c9') + '</defs><rect width="390" height="700" fill="url(#lg)"/>' + [30, 120, 220, 320].map(function (x, i) { return Art.cloudShape(x, 60 + i * 150, 0.8, .6); }).join(''), null, ' preserveAspectRatio="xMidYMid slice"');

      function menu() {
        C.setBack(null);
        stage.innerHTML = '<div class="lgmenu">' + GAMES.map(function (g, i) { return '<button class="lcard" data-g="' + g + '" style="--a:' + COL[g][0] + ';--b:' + COL[g][1] + ';animation-delay:' + (i * 0.06) + 's">' + CARD[g] + '</button>'; }).join('') + '</div>';
        C.$$('.lcard', stage).forEach(function (b) { b.onclick = function () { C.sfx.sparkle(); run(b.dataset.g); }; });
        C.say('À quoi veux-tu jouer ?');
      }

      function run(game) {
        C.setBack(menu);
        var wins = 0, level = 0, token = 0, mistakes = 0;
        stage.innerHTML = '<div class="pips">' + [0, 1, 2, 3, 4].map(function () { return '<i></i>'; }).join('') + '</div><div class="lg"></div>';
        var fl = C.el('<div class="donefloat"></div>');
        fl.appendChild(C.doneBtn('J\u2019ai fini !', function () { C.endScreen({ tile: 'learn', svg: CARD[game], say: 'Bravo ' + C.NAME + ' !', again: function () { run(game); } }); }));
        stage.appendChild(fl);
        var lg = C.$('.lg', stage), pips = C.$$('.pips i', stage);
        function win() {
          wins++; pips.forEach(function (p, i) { if (i < wins) p.classList.add('on'); });
          C.sfx.yay(); C.sayRnd(PRAISE); C.fx.confetti(14);
          var r = lg.getBoundingClientRect(); C.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 26, dist: 180 });
          if (wins >= 5) { later(finish, 1500); } else { later(round, 1700); }
        }
        function finish() {
          var gift = C.rewards.grant();
          C.celebrate({ svg: CARD[game], say: 'Bravo ' + C.NAME + ' ! Tu as tout réussi !', gift: gift, cards: C.endCards('learn', function () { run(game); }) });
        }
        function round() { mistakes = 0; token++; level++; lg.innerHTML = ''; G[game](lg, win); }
        var G = {
          colors: function (box, win) {
            var cs = C.shuffle(COLORS).slice(0, 3 + (level > 2 ? 1 : 0)), target = C.rnd(cs);
            C.say(Fr.toucheCouleur(O.papillon, target.n));
            cs.forEach(function (c, i) {
              var b = C.el('<button class="bf" data-color="' + c.n + '" style="left:' + (18 + (i % 2) * 44 + Math.random() * 6) + '%;top:' + (12 + Math.floor(i / 2) * 38 + Math.random() * 6) + '%;animation-delay:' + (-i * 1.3) + 's">' + butter(c.c) + '</button>'); box.appendChild(b);
              b.onclick = function () {
                if (b.classList.contains('got')) return;
                if (c === target) { b.classList.add('got'); C.sfx.sparkle(); C.fx.burstEl(b, { n: 16 }); C.$$('.bf', box).forEach(function (o) { if (o !== b) o.classList.add('fade'); }); win(); }
                else { mistakes++; C.sfx.oops(); C.wiggle(b); C.say('Ça, c’est le papillon ' + c.n + '. ' + Fr.cherche(O.papillon, target.n)); if (mistakes >= 2) { var t = C.$$('.bf', box)[cs.indexOf(target)]; t.classList.add('glow'); } }
              };
            });
          },
          shapes: function (box, win) {
            var ks = C.shuffle(['rond', 'carre', 'triangle']), ps = C.shuffle(ks), cols = C.shuffle(['#ff8fb8', '#4fd8d0', '#ffd84d', '#a47cff']), placed = 0;
            C.say('Mets chaque forme dans son trou !');
            box.innerHTML = '<div class="holes"></div><div class="pieces"></div>';
            var holes = C.$('.holes', box), pcs = C.$('.pieces', box), hn = {};
            ks.forEach(function (k) { var h = C.el('<div class="hole" data-k="' + k + '">' + shapeSvg(k, '#d9cdf0') + '</div>'); holes.appendChild(h); hn[k] = h; });
            ps.forEach(function (k, i) {
              var n = C.el('<div class="piece" data-k="' + k + '">' + shapeSvg(k, cols[i]) + '</div>'); pcs.appendChild(n);
              var wrong = 0;
              function snapTo(hole) { var a = n.getBoundingClientRect(), b = hole.getBoundingClientRect(); var dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2); n.style.transition = 'transform .35s cubic-bezier(.2,1.4,.4,1)'; n.style.transform = 'translate(' + (n._x + dx) + 'px,' + (n._y + dy) + 'px)'; n.style.pointerEvents = 'none'; hole.classList.add('filled'); C.sfx.sparkle(); C.sfx.ding(); C.fx.burstEl(hole, { n: 12 }); placed++; if (placed === 3) later(win, 500); }
              n._x = 0; n._y = 0;
              drag(n, {
                start: function () { n.classList.add('lift'); C.sfx.pop(); },
                move: function (dx, dy) { n.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.12)'; n._x = dx; n._y = dy; },
                end: function () {
                  n.classList.remove('lift'); var a = n.getBoundingClientRect(), cx = a.left + a.width / 2, cy = a.top + a.height / 2, hit = null;
                  ks.forEach(function (kk) { var b = hn[kk].getBoundingClientRect(); if (Math.abs(cx - (b.left + b.width / 2)) < b.width * 0.7 && Math.abs(cy - (b.top + b.height / 2)) < b.height * 0.7) hit = kk; });
                  n._x = 0; n._y = 0;
                  if (hit === k) { n._x = parseFloat(n.style.transform.split('(')[1]) || 0; var m = /translate\(([-\d.]+)px,\s*([-\d.]+)px/.exec(n.style.transform); n._x = m ? +m[1] : 0; n._y = m ? +m[2] : 0; snapTo(hn[k]); }
                  else { n.style.transition = 'transform .4s cubic-bezier(.2,1.4,.4,1)'; n.style.transform = ''; C.sfx.oops(); if (hit) { wrong++; C.say('Essaie encore !'); } if (wrong >= 2) { var m2 = 0; n._x = 0; n._y = 0; later(function () { C.say('Regarde, c’est ici !'); hn[k].classList.add('glow'); }, 300); } }
                }
              });
            });
          },
          count: function (box, win) {
            var o = C.rnd(OBJ), N = C.rint(1, 3), sel = 0, done = false;
            C.say(Fr.toucheN(N, o.o));
            box.innerHTML = '<div class="cnum"></div>';
            var pos = [[18, 20], [56, 14], [34, 52]];
            for (var i = 0; i < 3; i++) {
              var b = C.el('<button class="cit" data-n="' + N + '" style="left:' + pos[i][0] + '%;top:' + pos[i][1] + '%">' + Art.item(o.k) + '<span class="cn"></span></button>'); box.appendChild(b);
              (function (b) {
                b.onclick = function () {
                  if (done) return;
                  if (b.classList.contains('sel')) { b.classList.remove('sel'); sel--; C.C = 0; C.$('.cn', b).textContent = ''; C.sfx.pop(); return; }
                  if (sel >= N) { C.sfx.oops(); C.wiggle(b); C.say('Juste ' + Fr.NUM[N] + ' !'); return; }
                  sel++; b.classList.add('sel'); C.$('.cn', b).textContent = sel; C.say(Fr.NUM[sel] + ' !'); C.sfx.tap(sel); C.bounce(b);
                  if (sel === N) { done = true; var nn = C.$('.cnum', box); nn.innerHTML = '<b>' + N + '</b><span>' + Array(N + 1).join('●') + '</span>'; nn.classList.add('show'); later(function () { C.say(Fr.oui(N, o.o)); win(); }, 500); }
                };
              })(b);
            }
          },
          animals: function (box, win) {
            var as = C.shuffle(ANIMALS).slice(0, 3), t = C.rnd(as), ok = false;
            C.say(Fr.ou(t.o));
            box.innerHTML = '<div class="arow"></div>'; var row = C.$('.arow', box);
            as.forEach(function (a) {
              var b = C.el('<button class="an" data-id="' + a.id + '">' + P.render(a.type, 0, {}) + '</button>'); row.appendChild(b); b.dataset.target = a === t ? '1' : '';
              b.onclick = function () {
                if (ok) return; C.sfx.animal(a.snd); C.bounce(b, 1.2); P.setMood(C.$('svg', b), 'open'); later(function () { P.setMood(C.$('svg', b), 'smile'); }, 900);
                if (a === t) { ok = true; C.say(a.say); C.fx.burstEl(b, { n: 14 }); later(win, 900); }
                else { C.say(Fr.cest(a.o) + ' ' + Fr.cherche(t.o)); mistakes++; if (mistakes >= 2) C.$$('.an', row)[as.indexOf(t)].classList.add('glow'); }
              };
            });
          },
          size: function (box, win) {
            var o = C.rnd(OBJ), big = Math.random() < 0.5, ok = false;
            C.say(Fr.toucheTaille(o.o, big ? 'gros' : 'petit'));
            box.innerHTML = '<div class="szrow"></div>'; var row = C.$('.szrow', box);
            var pair = C.shuffle([true, false]);
            pair.forEach(function (isBig) {
              var b = C.el('<button class="sz ' + (isBig ? 'big' : 'small') + '" data-ok="' + (isBig === big ? '1' : '') + '">' + Art.item(o.k) + '</button>'); row.appendChild(b);
              b.onclick = function () { if (ok) return; if (isBig === big) { ok = true; C.sfx.sparkle(); C.fx.burstEl(b, { n: 16 }); C.bounce(b, 1.2); later(win, 600); } else { C.sfx.oops(); C.wiggle(b); C.say('Non, essaie l’autre !'); mistakes++; if (mistakes >= 2) C.$$('.sz', row).filter(function (x) { return x.classList.contains(big ? 'big' : 'small'); })[0].classList.add('glow'); } };
            });
          },
          puzzle: function (box, win) {
            var grids = [[2, 1], [2, 2], [3, 1], [2, 2]], g = grids[(level - 1) % grids.length], cols = g[0], rows = g[1];
            var pics = [P.render('licorne', 0, {}), P.render('dragon', 1, {}), P.render('chat', 0, {}), P.render('panda', 1, {})], pic = C.rnd(pics);
            var bgc = C.rnd(['#ffe3f1', '#dff4ff', '#e5ffe9', '#fff4c9']);
            C.say('Remets le puzzle en place !');
            box.innerHTML = '<div class="board"></div><div class="tiles2"></div>';
            var board = C.$('.board', box), tiles = C.$('.tiles2', box);
            board.style.aspectRatio = '1'; board.style.setProperty('--cols', cols); board.style.setProperty('--rows', rows);
            var W = 240 / cols, H = 240 / rows, slots = [], placed = 0;
            for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
              var s = C.el('<div class="slot" style="left:' + (c * 100 / cols) + '%;top:' + (r * 100 / rows) + '%;width:' + (100 / cols) + '%;height:' + (100 / rows) + '%"></div>'); board.appendChild(s); slots.push({ el: s, c: c, r: r });
            }
            var order = C.shuffle(slots.slice());
            order.forEach(function (sl, i) {
              var piece = C.el('<div class="ptile" style="background:' + bgc + '">' + pic.replace('viewBox="0 0 240 240"', 'viewBox="' + (sl.c * W) + ' ' + (sl.r * H) + ' ' + W + ' ' + H + '"') + '</div>');
              tiles.appendChild(piece);
              var bw = board.getBoundingClientRect();
              piece.style.width = (board.clientWidth / cols) + 'px'; piece.style.height = (board.clientHeight / rows) + 'px';
              piece._x = 0; piece._y = 0;
              drag(piece, {
                start: function () { C.sfx.pop(); piece.classList.add('lift'); },
                move: function (dx, dy) { piece.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.06)'; piece._x = dx; piece._y = dy; },
                end: function () {
                  piece.classList.remove('lift');
                  var a = piece.getBoundingClientRect(), b = sl.el.getBoundingClientRect();
                  var dx = (b.left + b.width / 2) - (a.left + a.width / 2), dy = (b.top + b.height / 2) - (a.top + a.height / 2);
                  if (Math.hypot(dx, dy) < Math.max(70, b.width * 0.6)) {
                    piece.style.transition = 'transform .3s cubic-bezier(.2,1.4,.4,1)'; piece.style.transform = 'translate(' + (piece._x + dx) + 'px,' + (piece._y + dy) + 'px)'; piece.style.pointerEvents = 'none'; sl.el.classList.add('filled');
                    C.sfx.ding(); C.fx.burstEl(sl.el, { n: 10 }); placed++; if (placed === slots.length) later(win, 500);
                  } else { piece.style.transition = 'transform .4s cubic-bezier(.2,1.4,.4,1)'; piece.style.transform = ''; C.sfx.oops(); }
                }
              });
            });
          }
        };
        round();
      }
      menu();
    },
    leave: function (el) { if (el && el._stop) el._stop(); }
  });
})();
