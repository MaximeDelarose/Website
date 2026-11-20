/* Les petites créatures du jardin : 7 espèces, 3 couleurs chacune, accessoires et humeurs. */
(function () {
  'use strict';
  var INK = Art.INK, ST = Art.ST, uid = Art.uid;
  var Pets = Art.pets = {};

  Pets.types = ['chat', 'lapin', 'chiot', 'panda', 'licorne', 'dragon', 'fluff'];
  Pets.names = { chat: 'Chaton', lapin: 'Lapin', chiot: 'Chiot', panda: 'Panda', licorne: 'Bébé licorne', dragon: 'Bébé dragon', fluff: 'Boule de poils magique' };
  Pets.defaultName = { chat: 'Minou', lapin: 'Câline', chiot: 'Biscotte', panda: 'Bambou', licorne: 'Étoilette', dragon: 'Flammèche', fluff: 'Pompon' };
  Pets.starters = ['chat', 'lapin', 'chiot', 'panda'];
  Pets.pal = {
    chat: [['#ffb273', '#fff0dc', '#e48a3c'], ['#b9c2d6', '#f2f5fb', '#8c97b3'], ['#ffe3b8', '#fffaf0', '#e8b878']],
    lapin: [['#ffffff', '#ffd0e0', '#e8d8f0'], ['#e5d6ff', '#fff0ff', '#b79cf0'], ['#ffd9c2', '#fff4ec', '#f0a984']],
    chiot: [['#d9a06a', '#fff0dc', '#a8683a'], ['#f2c46d', '#fff6d8', '#d49a2e'], ['#e9e3f2', '#ffffff', '#8c7ca8']],
    panda: [['#ffffff', '#fff', '#4a3a52'], ['#ffe0ee', '#fff', '#b06a8c'], ['#fff1dc', '#fff', '#8a5a3c']],
    licorne: [['#fff5ff', '#ffe0f5', '#e5c8ff'], ['#ffd0e8', '#fff0f8', '#ff9ac8'], ['#d0fff0', '#f0fffa', '#8de8c8']],
    dragon: [['#8de8b5', '#fff3b8', '#58c88f'], ['#c4a8ff', '#ffe0f0', '#9470e8'], ['#8fd3ff', '#fff6c8', '#5aa8e8']],
    fluff: [['#ffb3e6', '#fff0fa', '#ff7fd0'], ['#9ff0e6', '#f0fffd', '#4fd8c8'], ['#ffe27a', '#fffbe0', '#ffc42a']]
  };

  function m(inner, w) { w = w || 240; return '<g transform="translate(' + w + ' 0) scale(-1 1)">' + inner + '</g>'; }
  function both(inner) { return inner + m(inner); }
  var O = function (w) { return ST(w || 3.500); };

  function eyes(x1, x2, y, r) {
    return '<g data-e="open" class="peyes">' + Art.eye(x1, y, r) + Art.eye(x2, y, r) + '</g>' +
      '<g data-e="happy" style="display:none"><path d="M' + (x1 - r) + ' ' + (y + 3) + 'q' + r + ' ' + (-r * 1.7) + ' ' + (2 * r) + ' 0M' + (x2 - r) + ' ' + (y + 3) + 'q' + r + ' ' + (-r * 1.7) + ' ' + (2 * r) + ' 0" fill="none" stroke="#4a2a55" stroke-width="4.500" stroke-linecap="round"/></g>';
  }
  function cheeks(c) { return '<ellipse cx="74" cy="128" rx="11" ry="7" fill="#ff6fa5" opacity=".38"/><ellipse cx="166" cy="128" rx="11" ry="7" fill="#ff6fa5" opacity=".38"/>'; }
  function mouth(y, tongue) {
    return '<g data-m="smile"><path d="M107 ' + y + 'q6.500 8 13 0q6.500 8 13 0" fill="none" stroke="#a8325a" stroke-width="3.500" stroke-linecap="round"/></g>' +
      '<g data-m="open" style="display:none"><path d="M106 ' + y + 'q14 26 28 0z" fill="#a8325a" ' + ST(3) + '/><path d="M112 ' + (y + 12) + 'q8-8 16 0q-8 7-16 0z" fill="#ff8fb8"/></g>';
  }

  function body(pal, o) {
    o = o || {};
    return '<g class="pbody"><ellipse cx="120" cy="176" rx="56" ry="46" fill="' + pal[0] + '" ' + O() + '/>' +
      '<ellipse cx="120" cy="188" rx="34" ry="32" fill="' + pal[1] + '" opacity="' + (o.belly == null ? 1 : o.belly) + '"/>' +
      '<ellipse cx="88" cy="216" rx="24" ry="13" fill="' + (o.foot || pal[0]) + '" ' + O() + '/><ellipse cx="152" cy="216" rx="24" ry="13" fill="' + (o.foot || pal[0]) + '" ' + O() + '/>' +
      both('<ellipse cx="82" cy="190" rx="13" ry="22" fill="' + (o.arm || pal[0]) + '" ' + O() + ' transform="rotate(14 82 190)"/>') + '</g>';
  }

  Pets.render = function (type, v, o) {
    o = o || {};
    v = ((v || 0) % 3 + 3) % 3;
    var pal = Pets.pal[type][v], s = '', back = '', tail = '', head = '', front = '', bodyS = '';
    var id = uid('pt');
    switch (type) {
      case 'chat':
        tail = '<g class="ptail" style="transform-origin:170px 200px"><path d="M168 204q54-6 44-62" fill="none" stroke="' + INK + '" stroke-width="24" stroke-linecap="round"/><path d="M168 204q54-6 44-62" fill="none" stroke="' + pal[0] + '" stroke-width="17" stroke-linecap="round"/><path d="M212 150q-2-8-6-12" stroke="' + pal[2] + '" stroke-width="17" stroke-linecap="round" fill="none" opacity=".0"/><path d="M200 190q10-6 14-18" stroke="' + pal[2] + '" stroke-width="5" fill="none" stroke-linecap="round"/></g>';
        bodyS = body(pal);
        head = both('<g class="pear' + '"><path d="M64 78L56 24l50 30z" fill="' + pal[0] + '" ' + O() + '/><path d="M68 66L64 40l24 14z" fill="#ff9ac8"/></g>') +
          '<ellipse cx="120" cy="100" rx="66" ry="58" fill="' + pal[0] + '" ' + O() + '/>' +
          '<path d="M108 48l2 14M120 46v16M132 48l-2 14" stroke="' + pal[2] + '" stroke-width="5" stroke-linecap="round"/>' +
          '<ellipse cx="120" cy="128" rx="30" ry="20" fill="' + pal[1] + '"/>' + eyes(92, 148, 104, 9) + cheeks() +
          '<path d="M113 118l7 7 7-7z" fill="#ff6fa5" ' + ST(2.500) + '/>' + mouth(127) +
          both('<path d="M92 124l-34-6M92 130l-34 6" stroke="' + INK + '" stroke-width="2.500" stroke-linecap="round" opacity=".6"/>');
        break;
      case 'lapin':
        tail = '<g class="ptail" style="transform-origin:170px 200px"><circle cx="174" cy="200" r="16" fill="#fff" ' + O() + '/></g>';
        bodyS = body(pal);
        head = both('<g class="pear" style="transform-origin:92px 70px"><ellipse cx="90" cy="30" rx="19" ry="50" fill="' + pal[0] + '" ' + O() + ' transform="rotate(-8 90 30)"/><ellipse cx="90" cy="32" rx="9" ry="36" fill="' + pal[1] + '" transform="rotate(-8 90 32)"/></g>') +
          '<ellipse cx="120" cy="104" rx="64" ry="56" fill="' + pal[0] + '" ' + O() + '/>' +
          '<ellipse cx="120" cy="130" rx="26" ry="17" fill="' + pal[1] + '" opacity=".9"/>' + eyes(92, 148, 106, 9) + cheeks() +
          '<path d="M114 120h12l-6 7z" fill="#ff6fa5" ' + ST(2.500) + '/>' + mouth(129) + '<g data-m="smile"><rect x="113" y="134" width="14" height="13" rx="3" fill="#fff" ' + ST(2.500) + '/><path d="M120 135v12" stroke="' + INK + '" stroke-width="2"/></g>';
        break;
      case 'chiot':
        tail = '<g class="ptail" style="transform-origin:170px 202px"><path d="M170 204q24-4 28-28" fill="none" stroke="' + INK + '" stroke-width="22" stroke-linecap="round"/><path d="M170 204q24-4 28-28" fill="none" stroke="' + pal[0] + '" stroke-width="15" stroke-linecap="round"/></g>';
        bodyS = body(pal);
        head = both('<g class="pear" style="transform-origin:70px 70px"><path d="M64 64C32 60 26 110 40 140c18 6 30-22 32-60z" fill="' + pal[2] + '" ' + O() + '/></g>') +
          '<ellipse cx="120" cy="100" rx="64" ry="56" fill="' + pal[0] + '" ' + O() + '/>' +
          '<path d="M120 46c-22 2-34 20-30 40 8-4 22-10 30-8z" fill="' + pal[2] + '" opacity=".85"/>' +
          '<ellipse cx="120" cy="128" rx="32" ry="22" fill="' + pal[1] + '" ' + ST(2.500) + '/>' + eyes(92, 148, 100, 9) + cheeks() +
          '<ellipse cx="120" cy="116" rx="12" ry="8.500" fill="#4a2a55"/><ellipse cx="116" cy="113" rx="4" ry="2.500" fill="#fff" opacity=".7"/>' + mouth(131) + '<g data-m="open" style="display:none"></g>';
        break;
      case 'panda':
        tail = '<g class="ptail" style="transform-origin:170px 202px"><circle cx="174" cy="204" r="12" fill="#fff" ' + O() + '/></g>';
        bodyS = '<g class="pbody"><ellipse cx="120" cy="176" rx="56" ry="46" fill="#fff" ' + O() + '/><ellipse cx="120" cy="186" rx="32" ry="30" fill="#f6f6fb"/>' +
          '<ellipse cx="88" cy="216" rx="24" ry="13" fill="' + pal[2] + '" ' + O() + '/><ellipse cx="152" cy="216" rx="24" ry="13" fill="' + pal[2] + '" ' + O() + '/>' +
          both('<ellipse cx="82" cy="190" rx="13" ry="22" fill="' + pal[2] + '" ' + O() + ' transform="rotate(14 82 190)"/>') + '</g>';
        head = both('<circle cx="68" cy="60" r="21" fill="' + pal[2] + '" ' + O() + '/><circle cx="68" cy="60" r="9" fill="#ff9ac8" opacity=".5"/>') +
          '<ellipse cx="120" cy="102" rx="66" ry="58" fill="' + pal[0] + '" ' + O() + '/>' +
          both('<ellipse cx="90" cy="106" rx="19" ry="23" fill="' + pal[2] + '" transform="rotate(20 90 106)"/>') + eyes(90, 150, 106, 8) +
          '<ellipse cx="120" cy="128" rx="24" ry="16" fill="#fff"/><ellipse cx="120" cy="118" rx="9" ry="6" fill="#4a2a55"/>' + cheeks() + mouth(130);
        break;
      case 'licorne':
        tail = '<g class="ptail" style="transform-origin:170px 202px"><path d="M170 204q40 4 36-30" fill="none" stroke="' + INK + '" stroke-width="26" stroke-linecap="round"/><path d="M170 204q40 4 36-30" fill="none" stroke="#ff8fb8" stroke-width="19" stroke-linecap="round"/><path d="M174 198q30 6 28-18" fill="none" stroke="#8fd3ff" stroke-width="8" stroke-linecap="round"/><path d="M178 200q22 2 20-12" fill="none" stroke="#ffe066" stroke-width="5" stroke-linecap="round"/></g>';
        bodyS = body(pal);
        head = both('<g class="pear"><path d="M72 66L66 24l34 24z" fill="' + pal[0] + '" ' + O() + '/><path d="M74 56l-2-18 14 10z" fill="#ff9ac8"/></g>') +
          '<g class="pmane"><circle cx="58" cy="82" r="17" fill="#ff8fb8" ' + ST(3) + '/><circle cx="48" cy="104" r="15" fill="#ffe066" ' + ST(3) + '/><circle cx="52" cy="126" r="14" fill="#8de8b5" ' + ST(3) + '/><circle cx="56" cy="146" r="12" fill="#8fd3ff" ' + ST(3) + '/></g>' +
          '<ellipse cx="120" cy="102" rx="64" ry="56" fill="' + pal[0] + '" ' + O() + '/>' +
          '<path d="M94 52q-26 8-34 36 12-18 38-22z" fill="#ff8fb8" ' + ST(3) + '/><path d="M110 46q-14 2-20 10 12 0 22 8z" fill="#c4a8ff" ' + ST(3) + '/>' +
          '<ellipse cx="120" cy="130" rx="28" ry="19" fill="' + pal[1] + '"/>' + eyes(92, 148, 106, 9) + cheeks() +
          '<circle cx="111" cy="124" r="2.500" fill="' + pal[2] + '"/><circle cx="129" cy="124" r="2.500" fill="' + pal[2] + '"/>' + mouth(135) +
          '<path d="M120 12L108 52h24z" fill="#ffd84d" ' + O() + '/><path d="M112 40l14-6M110 30l16-6M115 21l10-4" stroke="#ffb02a" stroke-width="3" stroke-linecap="round"/>';
        break;
      case 'dragon':
        back = both('<g class="pwing" style="transform-origin:76px 150px"><path d="M78 150C30 110 6 130 12 168c14-6 26-2 34 8 8-10 22-12 32-6z" fill="' + pal[2] + '" ' + O() + ' opacity=".95"/></g>');
        tail = '<g class="ptail" style="transform-origin:170px 202px"><path d="M170 204q44 8 38-34" fill="none" stroke="' + INK + '" stroke-width="24" stroke-linecap="round"/><path d="M170 204q44 8 38-34" fill="none" stroke="' + pal[0] + '" stroke-width="17" stroke-linecap="round"/><path d="M214 172l16-8-4 16-12 6z" fill="' + pal[2] + '" ' + ST(3) + '/></g>';
        bodyS = body(pal, { belly: 1 }) + '<g fill="none" stroke="' + pal[2] + '" stroke-width="4" stroke-linecap="round" opacity=".7"><path d="M98 168h44M100 182h40M104 196h32"/></g>';
        head = both('<g class="pear"><path d="M76 70L62 22l42 30z" fill="#fff3d8" ' + O() + '/></g>') +
          '<path d="M104 48l6-18 10 14 10-14 6 18z" fill="' + pal[2] + '" ' + ST(3) + '/>' +
          '<ellipse cx="120" cy="102" rx="64" ry="56" fill="' + pal[0] + '" ' + O() + '/>' +
          '<ellipse cx="120" cy="130" rx="32" ry="21" fill="' + pal[1] + '" ' + ST(2.500) + '/>' + eyes(92, 148, 102, 9) + cheeks() +
          '<circle cx="109" cy="124" r="3" fill="' + pal[2] + '"/><circle cx="131" cy="124" r="3" fill="' + pal[2] + '"/>' + mouth(135);
        break;
      default: /* fluff */
        var pts = '', n = 22, cx = 120, cy = 128;
        for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2, a2 = (i + 0.5) / n * Math.PI * 2; pts += (i ? 'L' : 'M') + (cx + Math.cos(a) * 82).toFixed(1) + ' ' + (cy + Math.sin(a) * 76).toFixed(1) + 'L' + (cx + Math.cos(a2) * 68).toFixed(1) + ' ' + (cy + Math.sin(a2) * 64).toFixed(1); }
        pts += 'Z';
        tail = '';
        bodyS = '<g class="pbody"><ellipse cx="96" cy="214" rx="20" ry="11" fill="' + pal[2] + '" ' + O() + '/><ellipse cx="144" cy="214" rx="20" ry="11" fill="' + pal[2] + '" ' + O() + '/></g>';
        head = both('<g class="pear" style="transform-origin:96px 50px"><path d="M100 54Q88 30 84 14" fill="none" stroke="' + INK + '" stroke-width="3.500" stroke-linecap="round"/><path d="' + Art.P.star + '" transform="translate(70 -2) scale(1.200)" fill="#ffd84d" ' + ST(1.800) + '/></g>') +
          '<path d="' + pts + '" fill="' + pal[0] + '" ' + O() + ' stroke-linejoin="round"/>' +
          '<ellipse cx="120" cy="146" rx="46" ry="38" fill="' + pal[1] + '" opacity=".75"/>' + eyes(92, 148, 118, 10) +
          '<ellipse cx="70" cy="142" rx="11" ry="7" fill="#ff6fa5" opacity=".4"/><ellipse cx="170" cy="142" rx="11" ry="7" fill="#ff6fa5" opacity=".4"/>' + mouth(142) +
          '<circle cx="60" cy="86" r="3" fill="#fff" opacity=".8"/><circle cx="182" cy="96" r="3.500" fill="#fff" opacity=".8"/>';
    }
    s += '<ellipse cx="120" cy="226" rx="74" ry="10" fill="#000" opacity=".1"/>';
    s += back + '<g class="ptailg">' + tail + '</g>' + bodyS + '<g class="phead">' + head + '</g>';
    var accSvg = o.acc ? Pets.acc[o.acc] : '';
    s += '<g class="pacc">' + accSvg + '</g>';
    var svg = Art.svg('0 0 240 240', s, 'pet pet-' + type);
    return svg;
  };
  Pets.setMood = function (svg, mood) {
    if (!svg) return;
    var e = mood === 'happy' ? 'happy' : 'open', mo = mood === 'smile' ? 'smile' : 'open';
    Array.prototype.forEach.call(svg.querySelectorAll('[data-e]'), function (n) { n.style.display = n.getAttribute('data-e') === e ? '' : 'none'; });
    Array.prototype.forEach.call(svg.querySelectorAll('[data-m]'), function (n) { n.style.display = n.getAttribute('data-m') === mo ? '' : 'none'; });
  };

  /* accessoires (têtes à environ y=40..60, centre x=120) */
  Pets.accIds = ['bow', 'party', 'glasses', 'scarf', 'crown', 'flower'];
  Pets.acc = {
    bow: '<g transform="translate(168 58) rotate(18)"><path d="M0 0L-26-16v32zM0 0l26-16v32z" fill="#ff5d8f" ' + ST(3) + '/><circle r="7" fill="#ff3d7f" ' + ST(2.500) + '/></g>',
    party: '<g transform="translate(96 52) rotate(-16)"><path d="M-24 6L0-52 24 6z" fill="#8fd3ff" ' + ST(3.500) + '/><path d="M-17-12h34M-21 -2h42" stroke="#fff" stroke-width="4" opacity=".9"/><circle cx="0" cy="-54" r="7" fill="#ff6fa5" ' + ST(2.500) + '/><circle cx="-8" cy="-26" r="3" fill="#ffd84d"/><circle cx="8" cy="-10" r="3" fill="#ffd84d"/></g>',
    glasses: '<g ' + ST(3.500) + '><path d="' + Art.P.star + '" transform="translate(68 84) scale(2.200)" fill="#ffd84d" fill-opacity=".85"/><path d="' + Art.P.star + '" transform="translate(120 84) scale(2.200)" fill="#ffd84d" fill-opacity=".85"/><path d="M118 108h4" stroke="' + INK + '" stroke-width="3.500"/></g>',
    scarf: '<g ' + ST(3.500) + '><path d="M70 150q50 30 100 0l4 20q-54 30-108 0z" fill="#ff8fb8"/><path d="M150 168l8 40 20-6-8-36z" fill="#ff6fa5"/><path d="M84 160l-2 4M104 166l-2 4M124 168l-2 4M144 166l-2 4" stroke="#fff" stroke-width="3.500" stroke-linecap="round"/></g>',
    crown: '<g transform="translate(120 42)"><path d="M-26 6L-30-14-14-2 0-20 14-2 30-14 26 6z" fill="#ffd84d" ' + ST(3) + '/><rect x="-26" y="4" width="52" height="9" rx="4" fill="#ffc42a" ' + ST(3) + '/><circle cy="9" r="3.500" fill="#ff6fa5"/></g>',
    flower: '<g transform="translate(76 54)"><g fill="#fff" ' + ST(2.500) + '><circle cx="0" cy="-10" r="8"/><circle cx="10" cy="-3" r="8"/><circle cx="-10" cy="-3" r="8"/><circle cx="6" cy="9" r="8"/><circle cx="-6" cy="9" r="8"/></g><circle r="6.500" fill="#ffd84d" ' + ST(2) + '/></g>'
  };

  /* œuf magique (viewBox 0 0 160 200) */
  Pets.egg = function (n) {
    var cols = [['#c4a8ff', '#ffe066'], ['#8fd3ff', '#ff8fb8'], ['#8de8b5', '#ffd84d'], ['#ffb3d1', '#8fd3ff']];
    var c = cols[(n || 0) % cols.length];
    return Art.svg('0 0 160 200',
      '<ellipse cx="80" cy="186" rx="52" ry="9" fill="#000" opacity=".1"/>' +
      '<g class="egg-top"><path d="M80 8C42 8 20 66 20 118c0 38 26 66 60 66s60-28 60-66C140 66 118 8 80 8z" fill="#fff6ff" ' + ST(4.500) + '/>' +
      '<path d="M22 112q14-18 29 0t29 0 29 0 29 0" fill="none" stroke="' + c[0] + '" stroke-width="12" stroke-linecap="round"/>' +
      '<path d="M26 140q27-16 54 0t54 0" fill="none" stroke="' + c[1] + '" stroke-width="9" stroke-linecap="round"/>' +
      '<circle cx="62" cy="52" r="8" fill="' + c[1] + '"/><circle cx="102" cy="64" r="6" fill="' + c[0] + '"/><circle cx="84" cy="86" r="5" fill="#ff8fb8"/>' +
      '<path d="M50 44q8-14 22-18" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none" opacity=".8"/>' +
      '<path class="crack" d="M58 84l12 12-10 10 14 12" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="display:none"/></g>', 'egg');
  };
})();
