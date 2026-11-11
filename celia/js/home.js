/* L'accueil : le château, le jardin, et huit grandes tuiles illustrées. */
(function () {
  'use strict';
  C.profile = Object.assign(Art.dress.defaults(), C.store.get('profile', {}));
  C.profile.mood = 'smile';
  C.saveProfile = function () { var p = Object.assign({}, C.profile); delete p.mood; C.store.set('profile', p); };

  var TILES = [
    { id: 'draw', label: 'Dessin', art: Art.tiles.draw, a: '#ffe3f1', b: '#ffb8da', say: 'L’atelier de dessin !' },
    { id: 'cook', label: 'Cuisine', art: Art.tiles.cook, a: '#fff4c9', b: '#ffd98a', say: 'La cuisine magique !' },
    { id: 'dress', label: 'Dressing', art: Art.tiles.dress, a: '#efe2ff', b: '#cdb0ff', say: 'Le dressing de princesse !' },
    { id: 'makeup', label: 'Maquillage', art: Art.tiles.makeup, a: '#ffe0ec', b: '#ffadc9', say: 'Le salon de maquillage !' },
    { id: 'pets', label: 'Animaux', art: Art.tiles.pets, a: '#dcfbe8', b: '#9fe8bf', say: 'Le jardin des animaux !' },
    { id: 'stories', label: 'Histoires', art: Art.tiles.story, a: '#dcf2ff', b: '#a2d8ff', say: 'Les histoires !' },
    { id: 'learn', label: 'Jeux', art: Art.tiles.learn, a: '#ffeedb', b: '#ffc79a', say: 'Les petits jeux !' },
    { id: 'room', label: 'Ma chambre', art: Art.tiles.room, a: '#eadfff', b: '#bda0ff', say: 'Ta chambre magique !' }
  ];
  C.TILES = TILES;

  function bgSvg() {
    var s = '<defs>' + Art.sky('hsky', '#a8defa', '#ffe9f6') + '<linearGradient id="hgr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9f5d5"/><stop offset="1" stop-color="#8fe3b3"/></linearGradient></defs>' +
      '<rect width="390" height="844" fill="url(#hsky)"/>' +
      '<circle cx="330" cy="70" r="34" fill="#fff6b0"/><circle cx="330" cy="70" r="46" fill="#fff6b0" opacity=".35"/>' +
      '<path d="M30 250a165 165 0 0 1 330 0" fill="none" stroke="#ffb3c8" stroke-width="12" opacity=".55"/><path d="M42 250a153 153 0 0 1 306 0" fill="none" stroke="#ffe39a" stroke-width="12" opacity=".6"/><path d="M54 250a141 141 0 0 1 282 0" fill="none" stroke="#b6f0cd" stroke-width="12" opacity=".6"/><path d="M66 250a129 129 0 0 1 258 0" fill="none" stroke="#b9defb" stroke-width="12" opacity=".6"/>' +
      '<path d="M0 250Q100 190 200 235T390 215V844H0z" fill="#d2f7de"/><path d="M0 290Q120 240 230 280T390 270V844H0z" fill="url(#hgr)"/>';
    var cols = ['#ff8fb8', '#fff', '#ffd84d', '#c4a8ff', '#ffb98a'];
    for (var i = 0; i < 26; i++) {
      var x = (i * 97) % 380 + 6, y = 300 + ((i * 53) % 520);
      s += Art.flowerSmall(x, y, cols[i % 5], 0.8 + (i % 3) * 0.2);
    }
    return Art.svg('0 0 390 844', s, 'homebgsvg', ' preserveAspectRatio="xMidYMax slice"');
  }

  var phrases = ['Coucou !', 'Tu es trop belle !', 'On joue ensemble ?', 'Touche une image !', 'Youpi !'];

  C.register('home', {
    enter: function (el) {
      var first = !C.homeWelcomed;
      var tiles = TILES.map(function (t) {
        return '<button class="tile t-' + t.id + '" data-t="' + t.id + '" style="--ta:' + t.a + ';--tb:' + t.b + '" aria-label="' + t.label + '"><span class="tart">' + t.art + '</span><span class="tlab">' + t.label + '</span></button>';
      }).join('');
      var walk = ['chat', 'lapin', 'fluff'].map(function (ty, i) {
        return '<div class="walker w' + i + '" data-ty="' + ty + '"><div class="wbob">' + Art.pets.render(ty, i + 1) + '</div></div>';
      }).join('');
      var bf = '';
      for (var i = 0; i < 5; i++) bf += '<div class="bfly b' + i + '">' + Art.item('butterfly') + '</div>';
      var portrait = window.CELIA_CUSTOM && window.CELIA_CUSTOM.portrait ? '<div class="portrait"><img alt="" src="' + window.CELIA_CUSTOM.portrait + '"></div>' : '';
      el.innerHTML = '<div class="home">' +
        '<div class="homebg">' + bgSvg() + '</div>' +
        '<div class="clouds">' + Art.svg('0 0 80 40', Art.cloudShape(8, 4, 1, .9), 'cl c1') + Art.svg('0 0 80 40', Art.cloudShape(8, 4, 1, .8), 'cl c2') + '</div>' +
        '<div class="hero">' +
        '<div class="castle" role="button" aria-label="château">' + Art.castle() + '<div class="sparkles"></div></div>' +
        '<div class="celia-av" role="button" aria-label="' + C.NAME + '"></div>' + portrait +
        '<div class="lumi-w" role="button" aria-label="Lumi">' + Art.lumi() + '</div>' +
        '</div>' +
        '<div class="walkers">' + walk + '</div>' +
        '<div class="tiles">' + tiles + '</div>' + bf +
        (first ? '<div class="start"><button class="startbtn" aria-label="jouer"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#fff" opacity=".9"/><path d="M26 18l22 14-22 14z" fill="#ff5d9e" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg></button></div>' : '') +
        '</div>';

      /* avatar */
      var av = C.$('.celia-av', el);
      var avsvg = Art.dress.mount(av, C.profile);
      C.tap(av, function () {
        Art.dress.setMood(avsvg, 'happy'); C.sfx.giggle();
        av.classList.remove('hop'); void av.offsetWidth; av.classList.add('hop');
        var r = av.getBoundingClientRect(); C.fx.burst(r.left + r.width / 2, r.top + r.height / 3, { n: 10, shapes: ['heart', 'star'] });
        C.sayRnd(['Hihi !', 'Coucou ' + C.NAME + ' !', 'Tu es belle !']);
        setTimeout(function () { Art.dress.setMood(avsvg, 'smile'); }, 1400);
      }, true);

      /* Lumi */
      var lu = C.$('.lumi-w', el), li = 0;
      C.tap(lu, function () {
        lu.classList.remove('spin'); void lu.offsetWidth; lu.classList.add('spin');
        C.sfx.sparkle(); C.say(phrases[li++ % phrases.length]);
        var r = lu.getBoundingClientRect(); C.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 14, dist: 100 });
      }, true);

      /* château */
      var ca = C.$('.castle', el);
      C.tap(ca, function (e) {
        C.sfx.magic(); C.fx.burst(e.clientX, e.clientY, { n: 20, dist: 140, up: 60 });
        ca.classList.remove('jig'); void ca.offsetWidth; ca.classList.add('jig');
        C.say('Bienvenue au château de ' + C.NAME + ' !');
      }, true);

      /* créatures qui se promènent */
      C.$$('.walker', el).forEach(function (w) {
        w.addEventListener('click', function (e) {
          var ty = w.dataset.ty; C.sfx.animal(ty);
          w.classList.remove('hop'); void w.offsetWidth; w.classList.add('hop');
          C.fx.burst(e.clientX, e.clientY, { n: 8, shapes: ['heart'], dist: 60, up: 40 });
        });
      });
      C.$$('.bfly', el).forEach(function (b) {
        b.addEventListener('click', function (e) { C.sfx.sparkle(); C.fx.burst(e.clientX, e.clientY, { n: 8, dist: 60 }); b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); });
      });

      /* tuiles */
      C.$$('.tile', el).forEach(function (t, i) {
        t.style.animationDelay = (i * 0.06) + 's';
        t.addEventListener('click', function (e) {
          C.sfx.pop(); C.sfx.sparkle();
          var r = t.getBoundingClientRect(), p = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          t.classList.add('picked');
          C.go(t.dataset.t, null, p);
        });
      });

      function begin() {
        C.homeWelcomed = true;
        var st = C.$('.start', el);
        if (st) { st.classList.add('out'); setTimeout(function () { st.remove(); }, 400); }
        C.sfx.chime(); C.sfx.sparkle();
        var r = ca.getBoundingClientRect(); C.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 24, dist: 160 });
        lu.classList.add('spin');
        C.say('Coucou ' + C.NAME + ' ! Bienvenue dans ton monde magique !');
        C.music.start();
      }
      var sb = C.$('.startbtn', el);
      if (sb) sb.addEventListener('click', begin);
      else C.music.start();
    },
    leave: function () { C.music.stop(); }
  });
})();
