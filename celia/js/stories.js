/* Les histoires animées : petites scènes vivantes, interactions simples, fin toujours heureuse (≈ 2 à 3 minutes). */
(function () {
  'use strict';
  var P = Art.pets, F = Art.food;

  function bg(t) {
    var s = '', defs = '';
    var grass = '<path d="M0 470Q120 430 240 462T390 450V700H0z" fill="#9fe8bd"/><path d="M0 520Q140 490 260 516T390 506V700H0z" fill="#7fdba5"/>';
    var flowers = '';
    for (var i = 0; i < 16; i++) flowers += Art.flowerSmall((i * 71) % 380 + 8, 540 + (i * 37) % 150, ['#ff8fb8', '#fff', '#ffd84d', '#c4a8ff'][i % 4], 0.9);
    switch (t) {
      case 'night':
        defs = Art.sky('sg', '#2a2a6e', '#7a5cc0'); s = '<rect width="390" height="700" fill="url(#sg)"/><circle cx="310" cy="90" r="38" fill="#fff6b0"/><circle cx="324" cy="80" r="34" fill="#2e2d73" opacity=".35"/>' + [30, 100, 170, 240, 60, 200, 340].map(function (x, i) { return '<path d="' + Art.P.star + '" transform="translate(' + x + ' ' + (40 + i * 38) + ') scale(.8)" fill="#fff6b0" opacity=".9"/>'; }).join('') + '<path d="M0 470Q120 430 240 462T390 450V700H0z" fill="#3b7a68"/><path d="M0 520Q140 490 260 516T390 506V700H0z" fill="#2f6a5a"/>'; break;
      case 'forest':
        defs = Art.sky('sg', '#bfeccf', '#e8fff0'); s = '<rect width="390" height="700" fill="url(#sg)"/>' + Art.tree(40, 400, 1.7, '#59c99a') + Art.tree(340, 410, 1.8, '#6fd6a8') + Art.tree(190, 380, 1.3, '#8de8b5') + grass + flowers; break;
      case 'hall':
        defs = Art.sky('sg', '#ffe9f4', '#ffc7e2'); s = '<rect width="390" height="700" fill="url(#sg)"/><g fill="#fff" stroke="#6b3f72" stroke-width="3"><rect x="20" y="60" width="70" height="200" rx="35"/><rect x="300" y="60" width="70" height="200" rx="35"/></g><g fill="#bfe8ff"><rect x="28" y="68" width="54" height="184" rx="27"/><rect x="308" y="68" width="54" height="184" rx="27"/></g><path d="M170 30l-12 70M220 30l12 70" stroke="#ffd84d" stroke-width="4"/><g fill="#ffd84d" stroke="#6b3f72" stroke-width="3"><circle cx="156" cy="108" r="14"/><circle cx="234" cy="108" r="14"/></g><rect y="480" width="390" height="220" fill="#f6d9ff"/><path d="M0 480h390" stroke="#6b3f72" stroke-width="3"/>' + [0, 1, 2, 3, 4, 5].map(function (i) { return '<path d="M' + (i * 70) + ' 700L' + (i * 70 + 40) + ' 480" stroke="#fff" stroke-width="5" opacity=".5"/>'; }).join(''); break;
      case 'cave':
        defs = Art.sky('sg', '#cdb8ff', '#ffd9f0'); s = '<rect width="390" height="700" fill="url(#sg)"/><path d="M-20 520L90 250 180 420 270 200 420 520z" fill="#a98ce8" stroke="#6b3f72" stroke-width="3"/><path d="M270 200l-30 50 30-10 30 14z" fill="#fff"/><path d="M90 250l-24 40 24-8 22 12z" fill="#fff"/><path d="M0 500Q120 470 240 496T390 484V700H0z" fill="#c4b0f4"/><path d="M0 548Q140 520 260 544T390 534V700H0z" fill="#b39cf0"/>'; break;
      default:
        defs = Art.sky('sg', '#a8defa', '#f0fcff'); s = '<rect width="390" height="700" fill="url(#sg)"/><circle cx="320" cy="70" r="30" fill="#fff6b0"/>' + Art.cloudShape(30, 80, 1.3, .95) + Art.cloudShape(200, 140, 1, .9) + '<path d="M0 330Q100 290 200 320T390 300V700H0z" fill="#d2f7de"/>' + grass + Art.tree(60, 420, 1.2) + flowers;
    }
    return Art.svg('0 0 390 700', '<defs>' + defs + '</defs>' + s, null, ' preserveAspectRatio="xMidYMid slice"');
  }

  /* acteurs : g=fille, p:type=créature, i:nom=objet, castle */
  function actor(a) {
    if (a.k === 'g') return Art.dress.girl(Object.assign({}, C.profile, a.o || {}));
    if (a.k.indexOf('p:') === 0) return P.render(a.k.slice(2), a.v || 0, { acc: a.acc });
    if (a.k === 'castle') return Art.castle();
    if (a.k === 'cake') return F.cake('birthday', '#ff9ac8');
    return Art.item(a.k.slice(2));
  }
  var G = function (x, y, w, o) { return { k: 'g', x: x, y: y, w: w, o: o, cls: 'bob' }; };
  var Pt = function (t, x, y, w, v) { return { k: 'p:' + t, x: x, y: y, w: w, v: v || 0, cls: 'bob' }; };
  var It = function (n, x, y, w) { return { k: 'i:' + n, x: x, y: y, w: w || 16, cls: 'bob' }; };

  var STORIES = [
    { id: 'licorne', title: 'Celia et la licorne perdue', cover: function () { return P.render('licorne', 0, {}); }, col: ['#f1e5ff', '#cdb0ff'], scenes: [
      { bg: 'meadow', say: C.NAME + ' rencontre une licorne. Elle cherche sa maison !', actors: [G(26, 66, 34), Pt('licorne', 72, 70, 44)], act: { t: 'tap', fx: 'hello', target: 1, say: 'Dis bonjour à la licorne !', ok: 'Bonjour !' } },
      { bg: 'meadow', say: 'Quel chemin ? Suis l’arc-en-ciel !', actors: [G(20, 70, 26), Pt('licorne', 42, 72, 28)], act: { t: 'choose', opts: [It('cloud', 66, 48, 22), It('rainbow', 82, 74, 26), It('mushroom', 70, 90, 18)], good: 1, hint: 'Cherche l’arc-en-ciel !', ok: 'Oui, par là !' } },
      { bg: 'forest', say: 'Il fait sombre. Touche les trois étoiles !', actors: [G(22, 72, 28), Pt('licorne', 50, 74, 30)], act: { t: 'collect', items: [It('star', 20, 28, 16), It('star', 62, 20, 16), It('star', 82, 46, 16)], ok: 'Bravo, ça brille !' } },
      { bg: 'night', say: 'Où est la clé de la maison ? La clé dorée !', actors: [G(22, 72, 28), Pt('licorne', 50, 74, 30)], act: { t: 'choose', opts: [It('ball', 20, 44, 18), It('key', 50, 36, 18), It('cookie', 80, 44, 18)], good: 1, hint: 'Cherche la petite clé dorée !', ok: 'Tu as la clé !' } },
      { bg: 'meadow', say: 'Voici la maison de la licorne ! Touche le château !', actors: [{ k: 'castle', x: 52, y: 44, w: 80 }, G(18, 82, 26), Pt('licorne', 80, 84, 26)], act: { t: 'tap', fx: 'castle', target: 0, ok: 'Hourra !' } },
      { bg: 'meadow', say: 'La licorne est chez elle. Merci ' + C.NAME + ' ! Fin.', actors: [G(30, 70, 34), Pt('licorne', 70, 72, 40)], act: { t: 'end' } }
    ] },
    { id: 'gateau', title: 'Le gâteau d’anniversaire', cover: function () { return F.cake('birthday', '#ff9ac8'); }, col: ['#fff4c9', '#ffd98a'], scenes: [
      { bg: 'kitchen', say: C.NAME + ' prépare un gâteau avec ses amis !', actors: [G(24, 72, 30), Pt('chat', 52, 78, 24), Pt('lapin', 78, 78, 24)], act: { t: 'tap', fx: 'hello', target: 1, say: 'Dis bonjour au chaton !', ok: 'Miaou !' } },
      { bg: 'kitchen', say: 'Il faut un œuf. Touche l’œuf !', actors: [G(20, 72, 28), Pt('lapin', 80, 80, 24)], act: { t: 'choose', opts: [It('ball', 36, 52, 16), It('egg', 56, 50, 16), It('mushroom', 76, 52, 16)], good: 1, hint: 'Cherche l’œuf !', ok: 'Un œuf !' } },
      { bg: 'kitchen', say: 'Touche trois pommes pour la compote !', actors: [G(20, 72, 28), Pt('chat', 78, 80, 24)], act: { t: 'collect', items: [It('apple', 40, 50, 15), It('apple', 58, 56, 15), It('apple', 76, 48, 15)], ok: 'Miam !' } },
      { bg: 'kitchen', say: 'Le gâteau est prêt ! Touche-le pour mettre les bougies.', actors: [{ k: 'cake', x: 52, y: 66, w: 60 }, G(16, 76, 24), Pt('lapin', 86, 82, 20)], act: { t: 'tap', fx: 'candles', target: 0, ok: 'Que c’est joli !' } },
      { bg: 'kitchen', say: 'Touche les ballons pour faire la fête !', actors: [G(22, 74, 28), Pt('chat', 78, 82, 22)], act: { t: 'collect', items: [It('balloon', 30, 26, 16), It('balloon', 52, 20, 16), It('balloon', 74, 28, 16)], ok: 'Joyeux anniversaire !' } },
      { bg: 'kitchen', say: 'Tout le monde mange du gâteau. Fin !', actors: [G(30, 72, 32), Pt('chat', 60, 78, 24), Pt('lapin', 82, 78, 24)], act: { t: 'end' } }
    ] },
    { id: 'bal', title: 'Le grand bal des princesses', cover: function () { return Art.dress.girl({ outfit: 'd1', crown: 'c1' }); }, col: ['#ffe3f1', '#ffb0d6'], scenes: [
      { bg: 'hall', say: 'Ce soir, c’est le grand bal ! Choisis ta robe.', actors: [G(50, 60, 40)], act: { t: 'dress', ok: 'Quelle belle robe !' } },
      { bg: 'hall', say: 'Touche la couronne pour la mettre !', actors: [G(30, 70, 34), It('crown', 72, 40, 24)], act: { t: 'crown', ok: 'Tu es une princesse !' } },
      { bg: 'hall', say: 'Les papillons arrivent ! Touche-les !', actors: [G(24, 74, 30)], act: { t: 'collect', items: [It('butterfly', 50, 28, 14), It('butterfly', 70, 50, 14), It('butterfly', 84, 24, 14)], ok: 'Ils sont tes invités !' } },
      { bg: 'hall', say: 'La musique commence ! Touche une étoile pour danser.', actors: [G(36, 72, 36, { wings: 'w1' }), It('star', 78, 40, 18)], act: { t: 'dance', ok: 'On danse !' } },
      { bg: 'hall', say: 'Quel beau bal ! Touche le gâteau pour mettre les bougies.', actors: [G(26, 72, 30), { k: 'cake', x: 72, y: 74, w: 40 }], act: { t: 'tap', fx: 'candles', target: 1, ok: 'Que c’est joli !' } },
      { bg: 'hall', say: 'Tout le monde est content. Fin !', actors: [G(50, 66, 38, { wings: 'w1', wand: 'm1' })], act: { t: 'end' } }
    ] },
    { id: 'dragon', title: 'Le petit dragon timide', cover: function () { return P.render('dragon', 0, {}); }, col: ['#dcfbe8', '#9fe8bf'], scenes: [
      { bg: 'cave', say: 'Un petit dragon se cache derrière la montagne. Il est timide.', actors: [G(24, 72, 30), Pt('dragon', 74, 74, 34)], act: { t: 'tap', fx: 'hello', target: 1, say: 'Dis bonjour doucement !', ok: 'Coucou petit dragon !' } },
      { bg: 'cave', say: 'Offre-lui un câlin. Touche le cœur !', actors: [G(22, 72, 28), Pt('dragon', 74, 74, 30)], act: { t: 'choose', opts: [It('heart', 46, 46, 18), It('ball', 66, 30, 16), It('mushroom', 84, 52, 16)], good: 0, hint: 'Cherche le cœur rose !', ok: 'Il sourit un peu !' } },
      { bg: 'cave', say: 'Dis-lui des mots doux. Touche trois cœurs !', actors: [G(22, 72, 28), Pt('dragon', 74, 74, 30)], act: { t: 'collect', items: [It('heart', 34, 26, 15), It('heart', 54, 18, 15), It('heart', 72, 30, 15)], ok: 'Il est plus confiant !' } },
      { bg: 'cave', say: 'Le dragon crache des étoiles ! Touche-le.', actors: [G(22, 74, 28), Pt('dragon', 70, 70, 40)], act: { t: 'tap', fx: 'spit', target: 1, ok: 'Wouah, des étoiles !' } },
      { bg: 'night', say: 'La nuit tombe. Attrape les étoiles du dragon !', actors: [G(22, 74, 28), Pt('dragon', 74, 76, 32)], act: { t: 'collect', items: [It('star', 30, 22, 15), It('star', 52, 14, 15), It('star', 72, 24, 15)], ok: 'C’est magique !' } },
      { bg: 'meadow', say: 'Le dragon n’a plus peur. Il a un nouvel ami. Fin !', actors: [G(30, 72, 32), Pt('dragon', 70, 72, 40)], act: { t: 'end' } }
    ] }
  ];

  C.STORIES = STORIES;
  C.register('stories', {
    enter: function (el) {
      var root = el, live = true, timers = [];
      el._stop = function () { live = false; timers.forEach(clearTimeout); C.say.stop(); };
      function later(fn, ms) { var t = setTimeout(function () { if (live) fn(); }, ms); timers.push(t); return t; }
      function lib() {
        C.setBack(null);
        root.innerHTML = '<div class="sbgl">' + bg('meadow') + '</div><div class="act"><div class="stage"><div class="storygrid">' + STORIES.map(function (s, i) {
          return '<button class="scard" data-i="' + i + '" style="--a:' + s.col[0] + ';--b:' + s.col[1] + ';animation-delay:' + (i * 0.08) + 's"><span class="sart">' + s.cover() + '</span><em>' + s.title + '</em></button>';
        }).join('') + '</div></div></div>';
        C.$$('.scard', root).forEach(function (b) { b.onclick = function () { C.sfx.page(); C.sfx.sparkle(); play(STORIES[+b.dataset.i]); }; });
        C.say('Quelle histoire veux-tu ?');
      }
      function play(story) {
        var idx = 0, outfit = null;
        C.setBack(lib);
        root.innerHTML = '<div class="sbgl"></div><div class="act"><div class="stage story"><div class="sdots"></div><div class="sc"></div>' +
          '<button class="btn blue small snarr" aria-label="réécouter">' + Art.ui.replay + '</button><button class="btn green big snext" aria-label="suite" hidden>' + Art.ui.next + '</button></div></div>';
        var sc = C.$('.sc', root), next = C.$('.snext', root), narr = C.$('.snarr', root), dots = C.$('.sdots', root), bgl = C.$('.sbgl', root);
        var st = C.$('.stage', root), hint = null;
        dots.innerHTML = story.scenes.map(function () { return '<i></i>'; }).join('');
        var lastSay = '';
        narr.onclick = function () { C.say(lastSay, { must: true }); };
        function say(t) { lastSay = t; C.say(t, { must: true }); }
        function done() { next.hidden = false; C.bounce(next, 1.2); C.sfx.chime(); if (hint) { hint.stop(); hint = null; } }
        next.onclick = function () { next.hidden = true; C.sfx.page(); idx++; scene(); };
        function scene() {
          if (idx >= story.scenes.length) { return finish(); }
          var S = story.scenes[idx];
          C.$$('i', dots).forEach(function (d, i) { d.className = i < idx ? 'done' : i === idx ? 'cur' : ''; });
          bgl.innerHTML = bg(S.bg === 'kitchen' ? 'meadow' : S.bg);
          if (S.bg === 'kitchen') bgl.innerHTML = F.kitchenBg();
          sc.classList.remove('in'); sc.innerHTML = ''; void sc.offsetWidth; sc.classList.add('in');
          var nodes = S.actors.map(function (a, i) {
            var cfg = a;
            if (a.k === 'g' && outfit) { cfg = Object.assign({}, a, { o: Object.assign({}, a.o || {}, outfit) }); }
            var n = C.el('<div class="act1 ' + (a.cls || '') + '" style="left:' + a.x + '%;top:' + a.y + '%;width:' + a.w + '%">' + actor(cfg) + '</div>');
            if (a.k.indexOf('p:') === 0 || a.k === 'g') { var sv = C.$('svg', n); (a.k === 'g' ? Art.dress.setMood : P.setMood)(sv, 'smile'); }
            sc.appendChild(n); return n;
          });
          say(S.say);
          var A = S.act;
          function ok() { C.sfx.yay(); C.say(A.ok || 'Bravo !'); var r = sc.getBoundingClientRect(); C.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 24, dist: 170 }); nodes.forEach(function (n) { var sv = C.$('svg', n); if (n.firstChild && sv) { if (sv.classList.contains('girl')) Art.dress.setMood(sv, 'happy'); else if (sv.classList.contains('pet')) P.setMood(sv, 'happy'); } }); later(done, 900); }
          function wrongTap(n) { C.sfx.oops(); C.wiggle(n); if (A.hint) C.say(A.hint); }
          /* RÈGLE : toucher → l'effet apparaît réellement à l'écran → on VÉRIFIE qu'il existe → alors seulement on valide.
             Si la vérification échoue, aucune félicitation : on le signale doucement et on laisse réessayer. */
          var settled = false, busy = false, SVGNS = 'http://www.w3.org/2000/svg';
          function complete(good) { busy = false; if (good) { settled = true; ok(); } else { C.sfx.oops(); try { console.warn('histoire : effet non vérifié, étape non validée'); } catch (e) { } } }
          function seen(n) { if (!n || !n.isConnected) return false; var r = n.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.right > 0 && r.bottom > 0 && r.left < window.innerWidth && r.top < window.innerHeight; }
          function mood(n, m) { var sv = C.$('svg', n); if (!sv) return; if (sv.classList.contains('girl')) Art.dress.setMood(sv, m); else if (sv.classList.contains('pet')) P.setMood(sv, m); }
          function wait(ms) { return new Promise(function (r) { later(r, ms); }); }
          function hearts(node) {
            var r = node.getBoundingClientRect(), s = sc.getBoundingClientRect(), made = [];
            for (var i = 0; i < 3; i++) {
              var h = C.el('<div class="sheart">' + Art.item('heart') + '</div>');
              h.style.left = (r.left - s.left + r.width * (0.25 + 0.25 * i)) + 'px'; h.style.top = (r.top - s.top + r.height * 0.1) + 'px'; sc.appendChild(h); made.push(h);
              h.animate([{ transform: 'translateY(0) scale(.4)', opacity: 0 }, { transform: 'translateY(-26px) scale(1)', opacity: 1, offset: .3 }, { transform: 'translateY(-90px) scale(.9)', opacity: 0 }], { duration: 1500, delay: i * 160, easing: 'ease-out', fill: 'both' });
            }
            return made;
          }
          var EFF = {
            /* dire bonjour : la créature saute, sourit, des cœurs montent */
            hello: function (node, ai) {
              mood(node, 'happy'); node.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-30px) scale(1.07)' }, { transform: 'translateY(0)' }], { duration: 650, easing: 'ease-out' });
              var k = S.actors[ai].k; C.sfx.animal(k.indexOf('p:') === 0 ? k.slice(2) : 'pop'); C.sfx.giggle();
              var made = hearts(node);
              return wait(500).then(function () { return made.length === 3 && made.every(seen); });
            },
            /* mettre les bougies sur le gâteau : 3 bougies apparaissent, posées sur le glaçage, avec flamme */
            candles: function (node) {
              var svg = C.$('svg', node), g = svg && C.$('.tops', svg); if (!g) return false;
              var spots = [[110, 98], [150, 90], [190, 98]], made = [];
              spots.forEach(function (p, i) {
                var el = document.createElementNS(SVGNS, 'g'); el.setAttribute('class', 'scandle'); el.setAttribute('transform', 'translate(' + p[0] + ' ' + p[1] + ') scale(1.25)');
                el.innerHTML = '<g class="drop" style="animation-delay:' + (i * 0.28) + 's;animation-fill-mode:both">' + F.tops.bougie + '</g>'; g.appendChild(el); made.push(el);
                later(function () { C.sfx.tap(i + 2); C.sfx.pop(); var r = el.getBoundingClientRect(); C.fx.burst(r.left + r.width / 2, r.top + 8, { n: 6, dist: 50, size: 14 }); }, i * 280 + 120);
              });
              return wait(1100).then(function () {
                var sr = svg.getBoundingClientRect();
                return made.length === 3 && made.every(function (m) { var r = m.getBoundingClientRect(); return seen(m) && r.left >= sr.left && r.right <= sr.right && r.top >= sr.top - 2 && r.bottom <= sr.bottom; });
              });
            },
            /* le château : la licorne entre par la porte */
            castle: function (node) {
              var uni = nodes[2]; if (!uni) return false;
              var c = node.getBoundingClientRect(), u = uni.getBoundingClientRect();
              var dx = c.left + c.width * 0.5 - (u.left + u.width / 2), dy = c.top + c.height * 0.82 - (u.top + u.height * 0.7);
              C.sfx.whoosh(); uni.classList.remove('bob');
              var an = uni.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.35)', opacity: 1, offset: .85 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.3)', opacity: 0 }], { duration: 1600, easing: 'ease-in-out', fill: 'forwards' });
              return new Promise(function (res) {
                an.onfinish = function () {
                  var ur = uni.getBoundingClientRect(), cr = node.getBoundingClientRect();
                  var inside = ur.left + ur.width / 2 > cr.left && ur.left + ur.width / 2 < cr.right && ur.top + ur.height / 2 > cr.top && ur.top + ur.height / 2 < cr.bottom;
                  C.sfx.magic(); C.fx.burst(cr.left + cr.width / 2, cr.top + cr.height * 0.8, { n: 22, dist: 150, up: 40 }); mood(nodes[0], 'happy'); res(inside);
                };
              });
            },
            /* le dragon crache de petites étoiles */
            spit: function (node) {
              var r = node.getBoundingClientRect(), s = sc.getBoundingClientRect(), made = [];
              mood(node, 'open'); C.sfx.animal('dragon'); C.sfx.sparkle();
              for (var i = 0; i < 5; i++) {
                var st = C.el('<div class="sstar">' + Art.item('star') + '</div>'); st.style.left = (r.left - s.left + r.width * 0.4) + 'px'; st.style.top = (r.top - s.top + r.height * 0.45) + 'px'; sc.appendChild(st); made.push(st);
                var ang = -Math.PI / 2 + (i - 2) * 0.5, dist = 90 + i * 14;
                st.animate([{ transform: 'translate(0,0) scale(.3) rotate(0)', opacity: 0 }, { transform: 'translate(' + Math.cos(ang) * dist * .6 + 'px,' + Math.sin(ang) * dist * .6 + 'px) scale(1) rotate(120deg)', opacity: 1, offset: .4 }, { transform: 'translate(' + Math.cos(ang) * dist + 'px,' + (Math.sin(ang) * dist + 30) + 'px) scale(.8) rotate(240deg)', opacity: 0 }], { duration: 1700, delay: i * 90, easing: 'ease-out', fill: 'both' });
              }
              later(function () { mood(node, 'smile'); }, 1400);
              return wait(700).then(function () { return made.length === 5 && made.every(seen); });
            }
          };
          if (A.t === 'tap') {
            var tg = nodes[A.target], fxn = EFF[A.fx]; tg.classList.add('hot');
            later(function () { if (!settled) hint = C.hint(tg, 0, 10); }, 2500);
            tg.onclick = function () {
              if (busy || settled) return; busy = true; if (hint) { hint.stop(); hint = null; } tg.classList.remove('hot'); C.sfx.pop();
              Promise.resolve(fxn ? fxn(tg, A.target) : false).then(function (good) { if (!good) tg.classList.add('hot'); else tg.onclick = null; complete(!!good); });
            };
          } else if (A.t === 'choose') {
            A.opts.forEach(function (o, i) {
              var n = C.el('<button class="act1 pick bob" style="left:' + o.x + '%;top:' + o.y + '%;width:' + o.w + '%">' + actor(o) + '</button>'); sc.appendChild(n);
              n.onclick = function () {
                if (busy || settled) return;
                if (i !== A.good) { wrongTap(n); return; }
                busy = true; if (hint) { hint.stop(); hint = null; }
                /* le bon objet voyage jusqu'à la créature, qui réagit */
                var tgt = nodes[1] || nodes[0], a = n.getBoundingClientRect(), b = tgt.getBoundingClientRect();
                var dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height * 0.55 - (a.top + a.height / 2);
                n.classList.remove('bob'); C.sfx.whoosh();
                var an = n.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(' + dx * .5 + 'px,' + (dy * .5 - 60) + 'px) scale(1.2)', offset: .5 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.8)' }], { duration: 900, easing: 'ease-in-out', fill: 'forwards' });
                an.onfinish = function () {
                  var r = n.getBoundingClientRect(), ok2 = Math.hypot(r.left + r.width / 2 - (b.left + b.width / 2), r.top + r.height / 2 - (b.top + b.height * 0.55)) < Math.max(b.width, b.height) * 0.5;
                  if (ok2) { C.sfx.sparkle(); C.bounce(tgt, 1.15); mood(tgt, 'happy'); hearts(tgt); }
                  complete(ok2);
                };
              };
            });
            later(function () { if (!settled && !busy) { var b = C.$$('.pick', sc)[A.good]; if (b) hint = C.hint(b, 0, 10); } }, 6000);
          } else if (A.t === 'collect') {
            var N = A.items.length, filled = 0;
            var slots = C.el('<div class="sslots">' + A.items.map(function (o) { return '<i>' + Art.item(o.k.slice(2)) + '</i>'; }).join('') + '</div>'); sc.appendChild(slots);
            A.items.forEach(function (o, idx2) {
              var n = C.el('<button class="act1 pick bob" style="left:' + o.x + '%;top:' + o.y + '%;width:' + o.w + '%">' + actor(o) + '</button>'); sc.appendChild(n);
              n.onclick = function () {
                n.onclick = null; n.classList.remove('bob'); C.sfx.tap(idx2 + 2);
                var slot = C.$$('i', slots)[filled], a = n.getBoundingClientRect(), b = slot.getBoundingClientRect(); filled++;
                var an = n.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(' + (b.left + b.width / 2 - a.left - a.width / 2) + 'px,' + (b.top + b.height / 2 - a.top - a.height / 2) + 'px) scale(.35)' }], { duration: 700, easing: 'ease-in-out', fill: 'forwards' });
                an.onfinish = function () {
                  slot.classList.add('on'); C.fx.burst(b.left + b.width / 2, b.top + b.height / 2, { n: 8, dist: 50, size: 14 }); n.style.visibility = 'hidden';
                  if (C.$$('i.on', slots).length === N && !settled) complete(true);   /* validé seulement quand TOUTES les cases sont remplies */
                };
              };
            });
          } else if (A.t === 'dress') {
            [{ id: 'd2' }, { id: 'd3' }, { id: 'd5' }].forEach(function (it, i) {
              var n = C.el('<button class="act1 pick" style="left:' + (22 + i * 28) + '%;top:92%;width:22%">' + Art.dress.preview('dress', it.id) + '</button>'); sc.appendChild(n);
              n.onclick = function () {
                if (outfit || busy) return; busy = true;
                var g = nodes[0], before = (C.$('.outfit', g) || {}).innerHTML;
                outfit = { outfit: it.id }; g.innerHTML = Art.dress.girl(Object.assign({}, C.profile, outfit)); mood(g, 'happy');
                C.$$('.pick', sc).forEach(function (b) { b.classList.add('gone'); });
                var after = (C.$('.outfit', g) || {}).innerHTML;
                C.sfx.sparkle(); C.fx.burstEl(g, { n: 16 });
                var good = !!after && after !== before && seen(C.$('.outfit', g)); if (!good) outfit = null;
                wait(400).then(function () { complete(good); });
              };
            });
          } else if (A.t === 'crown') {
            var cn = nodes[1]; cn.classList.add('pick');
            cn.onclick = function () {
              if (busy || settled) return; busy = true; cn.onclick = null;
              var prev = outfit; outfit = Object.assign({}, outfit || {}, { crown: 'c1' }); nodes[0].innerHTML = Art.dress.girl(Object.assign({}, C.profile, outfit));
              var cr = C.$('.crown', nodes[0]); cn.classList.add('gone'); C.sfx.sparkle(); C.fx.burstEl(nodes[0], { n: 16 });
              var good = !!cr && cr.innerHTML.length > 10; if (!good) { outfit = prev; }
              wait(400).then(function () { complete(good && seen(C.$('.crown', nodes[0]))); });
            };
          } else if (A.t === 'dance') {
            var st2 = nodes[1]; st2.classList.add('pick');
            st2.onclick = function () {
              if (busy || settled) return; busy = true; st2.onclick = null; st2.classList.add('gone'); nodes[0].classList.add('dancing'); var n = 0;
              var iv = setInterval(function () { if (!live || n > 14) { clearInterval(iv); return; } C.sfx.tap([0, 2, 4, 2, 5, 4, 2, 0][n % 8]); n++; }, 300);
              wait(500).then(function () { var arm = C.$('.arm.l', nodes[0]); complete(!!arm && getComputedStyle(arm).animationName !== 'none'); });
            };
          } else if (A.t === 'end') {
            /* la dernière scène ne se termine pas toute seule : on laisse la narration finir, puis la flèche verte apparaît */
            later(function () { C.fx.confetti(30); done(); }, 2600);
          }
        }
        function finish() {
          C.setBack(lib);
          var gift = C.rewards.grant();
          C.celebrate({ svg: story.cover(), say: 'Bravo ' + C.NAME + ' ! C’est la fin de l’histoire !', gift: gift, cards: C.endCards('story', function () { idx = 0; scene(); }) });
        }
        scene();
      }
      lib();
    },
    leave: function (el) { if (el && el._stop) el._stop(); }
  });
})();
