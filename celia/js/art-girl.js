/* La poupée de Celia : avatar habillable, et visage à maquiller. Tout est dessiné en SVG, pièce par pièce. */
(function () {
  'use strict';
  var INK = Art.INK, ST = Art.ST, uid = Art.uid;
  var G = Art.dress = {};

  G.skins = ['#ffe3cf', '#f8cba3', '#e4a977', '#b9784a', '#7d4a2e'];
  G.skinShade = ['#ffc9ad', '#eaa77c', '#c98954', '#9a5f36', '#5e3520'];
  G.hairColors = [
    { id: 0, c: '#9b5a3a', d: '#6f3b24' }, { id: 1, c: '#3b2a35', d: '#251a22' }, { id: 2, c: '#f6cf6a', d: '#e0b04a' },
    { id: 3, c: '#e0743a', d: '#c15a24' }, { id: 4, c: '#ff8fb8', d: '#ee6a9c' }, { id: 5, c: '#7fb8ff', d: '#5a97ea' }, { id: 6, c: '#b794ff', d: '#9470e8' }
  ];
  G.eyeColors = ['#7a4a2e', '#b07a32', '#4b9be8', '#4fae78', '#8a63d8', '#ff7fb0'];
  G.hairStyles = ['long', 'bun', 'flower', 'braids', 'pigtails', 'curls'];
  G.fixStyle = function (s) { return G.hairStyles.indexOf(s) >= 0 ? s : 'long'; };
  G.defaults = function () { return { skin: 1, eyes: 0, hairStyle: 'long', hairColor: 0, outfit: 'd0', shoes: 's0', crown: null, jewel: null, bag: null, wings: null, wand: null, mood: 'smile' }; };

  function mirror(inner) { return '<g transform="translate(240 0) scale(-1 1)">' + inner + '</g>'; }
  function both(inner) { return inner + mirror(inner); }
  function st(x, y, r, fill) { return '<path d="' + Art.P.star + '" fill="' + fill + '" transform="translate(' + (x - r) + ' ' + (y - r) + ') scale(' + (r / 12) + ')"/>'; }
  function ht(x, y, r, fill) { return '<path d="' + Art.P.heart + '" fill="' + fill + '" transform="translate(' + (x - r) + ' ' + (y - r) + ') scale(' + (r / 12) + ')"/>'; }
  function dot(x, y, r, fill) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + fill + '"/>'; }

  /* ---------- cheveux ---------- */
  var CAP = 'M63 109C56 55 87 30 120 30s64 25 57 79C174 92 163 74 143 57C132 54 118 54 108 55C92 62 78 82 63 109z';
  function bow(x, y, sc, c) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + sc + ')"><path d="M0 0L-16-10c-4 6-4 14 0 20zM0 0l16-10c4 6 4 14 0 20z" fill="' + c + '" ' + ST(2.600) + '/><circle r="4" fill="' + c + '" ' + ST(2.200) + '/></g>'; }
  function flower(x, y, sc) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + sc + ')"><g fill="#ff9ac8" ' + ST(2.200) + '><circle cx="0" cy="-8" r="6.500"/><circle cx="8" cy="-2" r="6.500"/><circle cx="-8" cy="-2" r="6.500"/><circle cx="5" cy="7" r="6.500"/><circle cx="-5" cy="7" r="6.500"/></g><circle r="5" fill="#ffd84d" ' + ST(2) + '/></g>'; }
  function hairBack(style, h) {
    var f = h.c, s = ST(3.200);
    switch (style) {
      case 'long': case 'flower': return '<path d="M56 84C30 124 28 190 44 244c20 12 46 8 60-4l32 0c14 12 40 16 60 4 16-54 14-120-10-160z" fill="' + f + '" ' + s + '/><path d="M64 150c-4 30 0 56 8 84M176 150c4 30 0 56-8 84M52 130c-6 30-4 60 0 84" stroke="' + h.d + '" stroke-width="4" fill="none" stroke-linecap="round"/>';
      case 'pigtails': return both('<path d="M62 78C26 82 8 132 20 192c26-6 46-44 50-88z" fill="' + f + '" ' + s + '/><path d="M32 130c-2 20 0 34 4 46" stroke="' + h.d + '" stroke-width="4" fill="none" stroke-linecap="round"/>');
      case 'bun': return '<circle cx="120" cy="28" r="26" fill="' + f + '" ' + s + '/><path d="M106 20q10-8 22-2" stroke="' + h.d + '" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>' + both('<circle cx="50" cy="132" r="14" fill="' + f + '" ' + s + '/><circle cx="46" cy="156" r="11" fill="' + f + '" ' + s + '/>');
      case 'braids': return both([0, 1, 2, 3, 4].map(function (i) { return '<ellipse cx="' + (50 + (i % 2 ? 5 : -3)) + '" cy="' + (126 + i * 22) + '" rx="13" ry="14" fill="' + f + '" ' + s + '/>'; }).join(''));
      default: return '<g fill="' + f + '" ' + s + '><circle cx="46" cy="96" r="28"/><circle cx="194" cy="96" r="28"/><circle cx="38" cy="136" r="22"/><circle cx="202" cy="136" r="22"/><circle cx="66" cy="52" r="28"/><circle cx="174" cy="52" r="28"/><circle cx="120" cy="38" r="32"/></g>';
    }
  }
  function hairFront(style, h) {
    var f = h.c, s = ST(3.200), cap = '<path d="' + CAP + '" fill="' + f + '" ' + s + '/><path d="M108 55v-14" stroke="' + h.d + '" stroke-width="3.500" stroke-linecap="round" opacity=".6"/><path d="M82 50c-10 8-16 20-20 34M156 44c12 6 20 18 22 30" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".3"/>';
    switch (style) {
      case 'long': return cap + both('<path d="M58 100c-5 22-8 44-4 70 10-8 18-32 15-62z" fill="' + f + '" ' + s + '/>');
      case 'flower': return cap + both('<path d="M58 100c-5 22-8 44-4 70 10-8 18-32 15-62z" fill="' + f + '" ' + s + '/>') + '<path d="M60 62Q120 6 180 62" fill="none" stroke="#ffb3d1" stroke-width="6" stroke-linecap="round"/>' + flower(80, 60, 1);
      case 'pigtails': return cap + both('<rect x="40" y="86" width="26" height="14" rx="7" fill="#ff6fa5" ' + s + ' transform="rotate(-18 53 93)"/>');
      case 'bun': return cap + bow(120, 46, 1.150, '#b794ff');
      case 'braids': return cap + both(bow(48, 242, 1, '#b794ff'));
      default: return '<g fill="' + f + '" ' + s + '><circle cx="76" cy="58" r="17"/><circle cx="100" cy="48" r="17"/><circle cx="124" cy="46" r="17"/><circle cx="148" cy="50" r="17"/><circle cx="168" cy="62" r="16"/><circle cx="64" cy="78" r="14"/><circle cx="178" cy="80" r="14"/></g><path d="M80 52c8-6 18-6 24-2M130 40c8-2 14 0 18 6" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".35"/>';
    }
  }

  /* ---------- visage ---------- */
  function bigEye(cx, cy, col) {
    return '<g transform="translate(' + cx + ' ' + cy + ') scale(.86) translate(' + (-cx) + ' ' + (-cy) + ')"><ellipse cx="' + cx + '" cy="' + cy + '" rx="12" ry="13.500" fill="#fff"/><ellipse cx="' + cx + '" cy="' + (cy + 1) + '" rx="11" ry="12.500" fill="' + col + '"/><ellipse cx="' + cx + '" cy="' + (cy + 2) + '" rx="5.800" ry="6.600" fill="#1b1018"/><circle cx="' + (cx + 4.500) + '" cy="' + (cy - 4.500) + '" r="3.800" fill="#fff"/><circle cx="' + (cx - 4) + '" cy="' + (cy + 6) + '" r="1.800" fill="#fff" opacity=".9"/>' +
      '<path d="M' + (cx - 12.500) + ' ' + (cy + 1) + 'C' + (cx - 12.500) + ' ' + (cy - 9) + ' ' + (cx - 7) + ' ' + (cy - 13.500) + ' ' + cx + ' ' + (cy - 13.500) + 'S' + (cx + 12.500) + ' ' + (cy - 9) + ' ' + (cx + 12.500) + ' ' + (cy + 1) + '" fill="none" stroke="#2b1a22" stroke-width="3" stroke-linecap="round"/></g>';
  }
  function face(o, skin, shade) {
    var ec = G.eyeColors[o.eyes] || G.eyeColors[0];
    return '<g class="head">' +
      both('<ellipse cx="62" cy="108" rx="9" ry="12" fill="' + skin + '" ' + ST(3) + '/><ellipse cx="62" cy="109" rx="4" ry="6" fill="' + shade + '" opacity=".35"/>') +
      '<ellipse cx="120" cy="98" rx="60" ry="56" fill="' + skin + '" ' + ST(3.500) + '/>' +
      '<path d="M74 136q46 26 92 0" fill="' + shade + '" opacity=".22"/>' +
      '<ellipse cx="80" cy="120" rx="14" ry="9" fill="#ff7fa5" opacity=".42"/><ellipse cx="160" cy="120" rx="14" ry="9" fill="#ff7fa5" opacity=".42"/>' +
      '<g data-e="open" class="eyes">' + bigEye(100, 106, ec) + bigEye(140, 106, ec) + '<path d="M90 102q-5-1-8-7M92 97q-4-3-5-9M150 102q5-1 8-7M148 97q4-3 5-9" stroke="#2b1a22" stroke-width="2.400" fill="none" stroke-linecap="round"/></g>' +
      '<path d="M90 86q10-7 20-2M150 86q-10-7-20-2" fill="none" stroke="#6f3b24" stroke-width="2.800" stroke-linecap="round" opacity=".7"/>' +
      '<g data-e="happy" style="display:none"><path d="M90 109q10-13 20 0M130 109q10-13 20 0" fill="none" stroke="#2b1a22" stroke-width="4.500" stroke-linecap="round"/></g>' +
      '<ellipse cx="120" cy="116" rx="3.500" ry="2.600" fill="' + shade + '" opacity=".7"/>' +
      '<g data-m="smile"><path d="M107 127q13 10 26 0" fill="none" stroke="#e0607f" stroke-width="3.600" stroke-linecap="round"/></g>' +
      '<g data-m="open" style="display:none"><path d="M104 124q16 26 32 0z" fill="#c0305a" ' + ST(3) + '/><path d="M111 136q9-7 18 0q-9 6-18 0z" fill="#ff8fb8"/></g>' +
      '</g>';
  }
  G.setMood = function (svg, mood) {
    if (!svg) return;
    var e = mood === 'happy' ? 'happy' : 'open', m = mood === 'smile' ? 'smile' : 'open';
    Array.prototype.forEach.call(svg.querySelectorAll('[data-e]'), function (n) { n.style.display = n.getAttribute('data-e') === e ? '' : 'none'; });
    Array.prototype.forEach.call(svg.querySelectorAll('[data-m]'), function (n) { n.style.display = n.getAttribute('data-m') === m ? '' : 'none'; });
  };

  /* ---------- vêtements ---------- */
  function scallop(L, R, y, n, dip) {
    var d = '', step = (R - L) / n, x = L;
    for (var i = 0; i < n; i++) { d += 'Q' + (x + step / 2) + ' ' + (y + dip) + ' ' + (x + step) + ' ' + y; x += step; }
    return d;
  }
  function skirtPath(w, top, hem, n) {
    var L = 120 - w, R = 120 + w;
    return 'M94 ' + top + 'Q' + (L + 6) + ' ' + ((top + hem) / 2 - 8) + ' ' + L + ' ' + hem + scallop(L, R, hem, n || 6, 13) + 'Q' + (R - 6) + ' ' + ((top + hem) / 2 - 8) + ' 146 ' + top + 'Z';
  }
  var bodice = function (c, sleeve) { return '<path d="M94 160Q120 168 146 160L149 212Q120 222 91 212Z" fill="' + c + '" ' + ST(3.200) + '/>'; };
  var puff = function (c) { return both('<circle cx="94" cy="172" r="13" fill="' + c + '" ' + ST(3.200) + '/>'); };

  function gown(c1, c2, o) {
    var w = o.w, hem = o.hem, id = uid('gw'), deco = '', sk = skirtPath(w, 206, hem, o.n || 6);
    var rows = [[120, hem - 24], [92, hem - 46], [148, hem - 46], [70, hem - 22], [170, hem - 22], [120, hem - 64], [100, hem - 82]];
    rows.forEach(function (p, i) {
      if (Math.abs(p[0] - 120) > w - 8 || p[1] < 220) return;
      deco += o.deco === 'stars' ? st(p[0], p[1], 7, o.dc || c2) : o.deco === 'hearts' ? ht(p[0], p[1], 7, c2) : o.deco === 'dots' ? dot(p[0], p[1], 4.500, c2) : '';
    });
    var inner;
    if (o.deco === 'rainbow') {
      var cols = ['#ff6f91', '#ffb347', '#ffe066', '#8de8b5', '#6ec6ff', '#b794ff'], bands = '';
      var bh = (hem + 20 - 206) / 6;
      cols.forEach(function (c, i) { bands += '<rect x="0" y="' + (206 + i * bh) + '" width="240" height="' + (bh + 1) + '" fill="' + c + '"/>'; });
      inner = '<clipPath id="' + id + '"><path d="' + sk + '"/></clipPath><g clip-path="url(#' + id + ')">' + bands + '</g><path d="' + sk + '" fill="none" ' + ST(3.200) + '/>';
    } else if (o.tulle) {
      inner = '<path d="' + skirtPath(w + 8, 206, hem + 4, 7) + '" fill="' + c2 + '" ' + ST(3.200) + '/><path d="' + skirtPath(w, 206, hem - 8, 6) + '" fill="' + c1 + '" ' + ST(3.200) + '/><path d="' + skirtPath(w - 12, 206, hem - 24, 5) + '" fill="' + c2 + '" opacity=".75" ' + ST(2.500) + '/>';
    } else {
      inner = '<path d="' + sk + '" fill="' + c1 + '" ' + ST(3.200) + '/>' + deco +
        (o.trim ? '<path d="' + 'M' + (120 - w + 2) + ' ' + (hem - 4) + scallop(120 - w + 2, 120 + w - 2, hem - 4, o.n || 6, 12) + '" fill="none" stroke="' + o.trim + '" stroke-width="4" stroke-linecap="round" opacity=".9"/>' : '');
    }
    var top = o.rainbow ? bodice('#fff') : bodice(o.bod || c1);
    var sash = '<path d="M91 204Q120 214 149 204L150 216Q120 226 90 216Z" fill="' + c2 + '" ' + ST(3) + '/>';
    var bow = o.bow ? '<g transform="translate(120 214)"><path d="M0 0L-16-9v18zM0 0l16-9v18z" fill="' + c2 + '" ' + ST(2.500) + '/><circle r="4" fill="' + c2 + '" ' + ST(2) + '/></g>' : '';
    var strap = o.strap ? both('<path d="M100 160l-2 20" stroke="' + c1 + '" stroke-width="7" stroke-linecap="round"/>') : '';
    return { under: inner + top + sash + bow + (o.neck ? '<path d="M104 160q16 14 32 0" fill="none" stroke="' + c2 + '" stroke-width="4" stroke-linecap="round"/>' : ''), over: o.strap ? '' : (o.sleeves === false ? '' : puff(o.rainbow ? '#fff' : (o.bod || c1))) };
  }
  function skirtTop(topc, skc, band, deco) {
    var sk = skirtPath(54, 208, 262, 6);
    var motif = deco === 'star' ? st(120, 186, 10, '#fff') : deco === 'heart' ? ht(120, 186, 10, '#fff') : deco === 'rainbow' ? '<path d="M104 196a16 16 0 0 1 32 0" fill="none" stroke="#fff" stroke-width="4"/>' : dot(120, 186, 6, '#fff');
    return {
      under: '<path d="' + sk + '" fill="' + skc + '" ' + ST(3.200) + '/>' + (deco === 'rainbow' ? '<g clip-path="none"></g>' : '') + '<path d="M90 208q30 10 60 0l2 10q-32 10-64 0z" fill="' + band + '" ' + ST(3) + '/>' +
        '<path d="M92 160h56l4 52q-32 10-64 0z" fill="' + topc + '" ' + ST(3.200) + '/>' + motif,
      over: both('<path d="M92 160l-12 6 -4 18 18 4 4-24z" fill="' + topc + '" ' + ST(3.200) + '/>')
    };
  }
  function pyjama(c1, c2, motif) {
    var m = '';
    for (var i = 0; i < 4; i++) m += (motif === 'moon' ? '<path d="M' + (112 + i * 10) + ' 288a6 6 0 1 0 5 8a5 5 0 0 1-5-8z" fill="#ffd84d"/>' : st(106 + (i % 2) * 28, 250 + i * 22, 5, motif === 'star' ? '#ffd84d' : '#fff'));
    var top = '<path d="M92 160Q120 168 148 160L152 226Q120 234 88 226Z" fill="' + c1 + '" ' + ST(3.200) + '/>' +
      (motif === 'heart' ? ht(120, 192, 10, '#fff') : motif === 'moon' ? '<path d="M126 180a12 12 0 1 0 6 18a10 10 0 0 1-6-18z" fill="#ffd84d"/>' : st(120, 192, 10, '#ffd84d')) + '<path d="M90 222Q120 232 150 222" stroke="' + c2 + '" stroke-width="5" fill="none" stroke-linecap="round"/>';
    var pants = both('<path d="M92 220L90 334h30V220z" fill="' + c2 + '" ' + ST(3.200) + '/><path d="M90 322h30" stroke="' + c1 + '" stroke-width="7"/>');
    var deco = '';
    if (motif) deco = (motif === 'moon' ? st(100, 270, 5, '#ffd84d') + st(138, 292, 5, '#ffd84d') + st(104, 306, 4, '#fff') : motif === 'heart' ? ht(104, 270, 6, '#fff') + ht(138, 296, 6, '#fff') + ht(106, 312, 5, '#fff') : st(104, 270, 6, '#ffd84d') + st(138, 296, 6, '#fff') + st(106, 312, 5, '#ffd84d'));
    var sleeves = both('<path d="M96 172Q74 194 70 222" fill="none" stroke="' + INK + '" stroke-width="21" stroke-linecap="round"/><path d="M96 172Q74 194 70 222" fill="none" stroke="' + c1 + '" stroke-width="15" stroke-linecap="round"/><path d="M70 216l1 8" stroke="' + c2 + '" stroke-width="15" stroke-linecap="round"/>');
    return { under: pants + deco + top, over: sleeves };
  }

  var COLLAR = function () { return '<path d="M97 160Q120 186 143 160Q151 166 146 173Q120 194 94 173Q89 166 97 160z" fill="#fff" ' + ST(3) + '/>' + ht(120, 182, 6.500, '#7ec8ff'); };
  var OUT = [
    { id: 'd0', cat: 'dress', top: '#8fd0ff', collar: true, fn: function () { var g = gown('#8fd0ff', '#c9a8ff', { w: 86, hem: 322, deco: 'stars', dc: '#ffe36e', trim: '#fff', bow: true, n: 7 }); g.under += COLLAR(); return g; } },
    { id: 'd1', top: '#ff9cc7', cat: 'dress', fn: function () { return gown('#ff9cc7', '#ffe36e', { w: 86, hem: 322, deco: 'stars', trim: '#fff', bow: true, n: 7 }); } },
    { id: 'd2', top: '#7fc8ff', cat: 'dress', fn: function () { return gown('#7fc8ff', '#ffe36e', { w: 90, hem: 330, deco: 'stars', trim: '#fff', n: 7 }); } },
    { id: 'd3', top: '#c9a8ff', cat: 'dress', fn: function () { return gown('#c9a8ff', '#ff8fb8', { w: 66, hem: 282, deco: 'hearts', trim: '#fff', n: 6 }); } },
    { id: 'd4', top: '#ffe066', cat: 'dress', fn: function () { return gown('#ffe066', '#ff9a5c', { w: 62, hem: 276, deco: 'dots', n: 6, strap: true }); } },
    { id: 'd5', top: '#ffffff', cat: 'dress', fn: function () { return gown('#ff6f91', '#ffe066', { w: 70, hem: 290, deco: 'rainbow', rainbow: true, n: 6 }); } },
    { id: 'd6', top: '#9ff0c6', cat: 'dress', fn: function () { return gown('#9ff0c6', '#d9fff0', { w: 74, hem: 268, tulle: true, bod: '#9ff0c6', n: 6 }); } },
    { id: 'k1', top: '#ffffff', cat: 'skirt', fn: function () { return skirtTop('#fff', '#ff9cc7', '#ff6fa5', 'heart'); } },
    { id: 'k2', top: '#4fd8d0', cat: 'skirt', fn: function () { return skirtTop('#4fd8d0', '#ffe066', '#ff9a5c', 'star'); } },
    { id: 'k3', top: '#ffffff', cat: 'skirt', fn: function () { return skirtTop('#fff', '#8fd3ff', '#4fa8e8', 'rainbow'); } },
    { id: 'k4', top: '#ffb3d1', cat: 'skirt', fn: function () { return skirtTop('#ffb3d1', '#8de8b5', '#58c88f', 'dot'); } },
    { id: 'p1', top: '#5b6bd6', cat: 'pj', fn: function () { return pyjama('#5b6bd6', '#7f8ff0', 'moon'); } },
    { id: 'p2', top: '#ff9cc7', cat: 'pj', fn: function () { return pyjama('#ff9cc7', '#ffd0e6', 'heart'); } },
    { id: 'p3', top: '#c9a8ff', cat: 'pj', fn: function () { return pyjama('#c9a8ff', '#e5d6ff', 'star'); } },
    { id: 'p4', top: '#8de8b5', cat: 'pj', fn: function () { return pyjama('#8de8b5', '#c9f6de', 'star'); } }
  ];
  var OUTMAP = {}; OUT.forEach(function (o) { OUTMAP[o.id] = o; });
  G.outfitLook = function (id) { var o = OUTMAP[id] || OUTMAP.d0; return { top: o.top || '#8fd0ff', collar: !!o.collar }; };

  /* chaussures : fn(x, dir) ; dir = -1 pied gauche, +1 pied droit */
  function shoeBase(x, d, fill, extra, h) {
    var y = 346;
    return '<g><path d="M' + (x - 12) + ' ' + (y - 10) + 'h24v8q' + (d * 14) + ' 2 ' + (d * 16) + ' 10h-' + (d * 4) + 'q-' + (d * 0) + ' 4-8 4h-20q-8 0-8-6z" fill="' + fill + '" ' + ST(3) + '/>' + (extra || '') + '</g>';
  }
  function shoeFn(fill, extra, tall) {
    return function (x, d) {
      var y = 348;
      var s = '<g>' + (tall ? '<rect x="' + (x - 11) + '" y="' + (y - 28) + '" width="22" height="26" rx="6" fill="' + fill + '" ' + ST(3) + '/>' : '') +
        '<path d="M' + (x - 12) + ' ' + (y - 10) + 'h24v6q' + (d * 12) + ' 1 ' + (d * 15) + ' 9v3q0 4-5 4h-24q-8 0-8-6z" fill="' + fill + '" ' + ST(3) + '/>' + (extra ? extra(x, d, y) : '') + '</g>';
      return s;
    };
  }
  var SHOES = [
    { id: 's0', fn: shoeFn('#8fd0ff', function (x, d, y) { return '<path d="M' + (x - 10) + ' ' + (y - 10) + 'q10 6 20 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>' + '<circle cx="' + x + '" cy="' + (y - 9) + '" r="3.500" fill="#fff"/>'; }) },
    { id: 's1', fn: shoeFn('#ff9cc7', function (x, d, y) { return '<path d="M' + (x - 10) + ' ' + (y - 10) + 'q10 6 20 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>' + '<circle cx="' + x + '" cy="' + (y - 9) + '" r="3.500" fill="#ff6fa5"/>'; }) },
    { id: 's2', fn: shoeFn('#ffd84d', function (x, d, y) { return '<rect x="' + (x - 11) + '" y="' + (y - 28) + '" width="22" height="6" rx="3" fill="#ff9a5c"/>'; }, true) },
    { id: 's3', fn: shoeFn('#fff', function (x, d, y) { return '<path d="M' + (x - 10) + ' ' + (y - 9) + 'h20" stroke="#ff6fa5" stroke-width="3"/><path d="M' + (x - 8) + ' ' + (y - 3) + 'h16" stroke="#4fd8d0" stroke-width="3"/><path d="M' + (x - 10) + ' ' + (y + 5) + 'h20" stroke="#ffd84d" stroke-width="3"/>'; }) },
    { id: 's4', fn: shoeFn('#c9a8ff', function (x, d, y) { return st(x, y - 3, 5, '#fff') + dot(x + d * 8, y + 1, 2, '#fff'); }) },
    { id: 's5', fn: shoeFn('#ff5d7a', function (x, d, y) { return '<path d="M' + (x - 11) + ' ' + (y - 7) + 'h22" stroke="#fff" stroke-width="3.500"/><circle cx="' + x + '" cy="' + (y - 7) + '" r="3" fill="#ffd84d"/>'; }) },
    { id: 's6', fn: shoeFn('#4fd8d0', function (x, d, y) { return '<path d="M' + (x - 11) + ' ' + (y - 8) + 'q11 -8 22 0" fill="none" stroke="#fff" stroke-width="3"/>'; }) }
  ];
  var SHOEMAP = {}; SHOES.forEach(function (o) { SHOEMAP[o.id] = o; });

  /* couronnes et accessoires de tête */
  var CROWNS = [
    { id: 'c1', svg: function () { return '<g transform="translate(120 38)"><path d="M-34 6L-40-22-20-6-0-30 20-6 40-22 34 6z" fill="#ffd84d" ' + ST(3.200) + '/><rect x="-34" y="4" width="68" height="12" rx="5" fill="#ffc42a" ' + ST(3.200) + '/><circle cx="0" cy="10" r="4.500" fill="#ff6fa5"/><circle cx="-20" cy="10" r="3.500" fill="#4fd8d0"/><circle cx="20" cy="10" r="3.500" fill="#8fd3ff"/><circle cx="-40" cy="-23" r="4" fill="#ff6fa5"/><circle cx="40" cy="-23" r="4" fill="#ff6fa5"/><circle cx="0" cy="-31" r="4.500" fill="#ff6fa5"/></g>'; } },
    { id: 'c2', svg: function () { return '<g transform="translate(120 34)"><path d="M-56 18Q0-14 56 18" fill="none" stroke="#e8e8ff" stroke-width="9" stroke-linecap="round"/><path d="M-56 18Q0-14 56 18" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round" opacity=".5"/><path d="M0-14l9 12-9 12-9-12z" fill="#ff8fb8" ' + ST(3) + '/><circle cx="-30" cy="-2" r="4.500" fill="#c4a8ff"/><circle cx="30" cy="-2" r="4.500" fill="#c4a8ff"/></g>'; } },
    { id: 'c3', svg: function () { var s = ''; [-56, -38, -18, 0, 18, 38, 56].forEach(function (x, i) { var y = 22 - Math.sqrt(Math.max(0, 3136 - x * x)) * 0.3; s += '<g transform="translate(' + x + ' ' + (y - 16) + ')"><g fill="' + ['#ff8fb8', '#fff', '#c4a8ff', '#ffd84d'][i % 4] + '" ' + ST(2) + '><circle cx="0" cy="-5" r="5"/><circle cx="5" cy="-1" r="5"/><circle cx="-5" cy="-1" r="5"/><circle cx="3" cy="4" r="5"/><circle cx="-3" cy="4" r="5"/></g><circle r="3" fill="#ffd84d"/></g>'; }); return '<g transform="translate(120 52)">' + s + '</g>'; } },
    { id: 'c4', svg: function () { return '<g transform="translate(120 34)"><path d="M-56 22Q0-18 56 22" fill="none" stroke="#c4a8ff" stroke-width="7" stroke-linecap="round"/><path d="M-40 4l-8-24M40 4l8-24" stroke="#c4a8ff" stroke-width="3" fill="none"/><path d="' + Art.P.star + '" transform="translate(-62 -44) scale(1.700)" fill="#ffd84d" ' + ST(1.600) + '/><path d="' + Art.P.star + '" transform="translate(30 -44) scale(1.700)" fill="#ffd84d" ' + ST(1.600) + '/></g>'; } },
    { id: 'c5', svg: function () { return '<g transform="translate(84 40) rotate(-18)"><path d="M0 0L-26-18c-6 8-6 22 0 28zM0 0l26-18c6 8 6 22 0 28z" fill="#ff5d8f" ' + ST(3.200) + '/><circle r="6" fill="#ff3d7f" ' + ST(3) + '/></g>'; } },
    { id: 'c6', svg: function () { return '<g transform="translate(120 34)"><path d="M-56 22Q0-18 56 22" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/><path d="M-12 -2L0-46 12-2z" fill="#ffd84d" ' + ST(3.200) + '/><path d="M-9-12l17 5M-10-24l20 5" stroke="#ff9a5c" stroke-width="3" stroke-linecap="round"/><g transform="translate(-34 4)"><circle r="7" fill="#ff8fb8"/><circle r="3" fill="#ffd84d"/></g><g transform="translate(34 4)"><circle r="7" fill="#8fd3ff"/><circle r="3" fill="#ffd84d"/></g></g>'; } }
  ];
  var CROWNMAP = {}; CROWNS.forEach(function (o) { CROWNMAP[o.id] = o; });

  var JEWELS = [
    { id: 'j1', svg: function () { var s = ''; for (var i = 0; i <= 8; i++) { var t = i / 8, x = 98 + t * 44, y = 156 + Math.sin(t * Math.PI) * 24; s += '<circle cx="' + x + '" cy="' + y + '" r="4.500" fill="#fff" ' + ST(1.800) + '/>'; } return s + both('<circle cx="60" cy="126" r="5" fill="#fff" ' + ST(2) + '/>'); } },
    { id: 'j2', svg: function () { return '<path d="M98 156Q120 186 142 156" fill="none" stroke="#ffd84d" stroke-width="3.500"/>' + ht(120, 184, 11, '#ff6fa5') + both('<g>' + ht(60, 128, 6, '#ff6fa5') + '</g>'); } },
    { id: 'j3', svg: function () { return '<path d="M98 156Q120 186 142 156" fill="none" stroke="#ffd84d" stroke-width="3.500"/>' + st(120, 186, 12, '#ffd84d') + both(st(60, 128, 6, '#ffd84d')); } },
    { id: 'j4', svg: function () { var s = '', cols = ['#ff6f91', '#ffb347', '#ffe066', '#8de8b5', '#6ec6ff', '#b794ff']; for (var i = 0; i <= 10; i++) { var t = i / 10, x = 97 + t * 46, y = 157 + Math.sin(t * Math.PI) * 26; s += '<circle cx="' + x + '" cy="' + y + '" r="5.500" fill="' + cols[i % 6] + '" ' + ST(1.800) + '/>'; } return s + both('<circle cx="62" cy="230" r="0"/>'); } },
    { id: 'j5', svg: function () { return '<path d="M98 156Q120 186 142 156" fill="none" stroke="#c4a8ff" stroke-width="3.500"/><g transform="translate(120 188)"><g fill="#fff" ' + ST(1.800) + '><circle cx="0" cy="-6" r="5"/><circle cx="6" cy="-2" r="5"/><circle cx="-6" cy="-2" r="5"/><circle cx="4" cy="5" r="5"/><circle cx="-4" cy="5" r="5"/></g><circle r="3.500" fill="#ffd84d"/></g>' + both('<circle cx="62" cy="230" r="0"/>'); } }
  ];
  var JEWELMAP = {}; JEWELS.forEach(function (o) { JEWELMAP[o.id] = o; });
  var BRACELET = { j1: '#fff', j2: '#ff6fa5', j3: '#ffd84d', j4: '#8de8b5', j5: '#c4a8ff' };

  /* sacs tenus dans la main gauche (à gauche sur l'image) */
  var BAGS = [
    { id: 'b1', svg: function () { return '<g transform="translate(58 246)"><path d="M-10-4q10-26 20 0" fill="none" stroke="#ff6fa5" stroke-width="4" stroke-linecap="round"/><path d="M-24-2h48l-4 34h-40z" fill="#ff8fb8" ' + ST(3.200) + '/><path d="' + Art.P.heart + '" transform="translate(-9 6) scale(1.500)" fill="#fff"/></g>'; } },
    { id: 'b2', svg: function () { return '<g transform="translate(58 246)"><path d="M-10-4q10-26 20 0" fill="none" stroke="#e8a62a" stroke-width="4" stroke-linecap="round"/><circle cx="0" cy="18" r="22" fill="#ffe066" ' + ST(3.200) + '/>' + '<path d="' + Art.P.star + '" transform="translate(-9 9) scale(1.500)" fill="#ff9a5c"/></g>'; } },
    { id: 'b3', svg: function () { return '<g transform="translate(58 246)"><path d="M-22-2q22-30 44 0" fill="none" stroke="#b98258" stroke-width="4" stroke-linecap="round"/><path d="M-26-2h52l-6 32h-40z" fill="#e8b878" ' + ST(3.200) + '/><path d="M-20 10h40M-18 20h36" stroke="#b98258" stroke-width="2.500"/><circle cx="-8" cy="-4" r="6" fill="#ff8fb8"/><circle cx="6" cy="-6" r="6" fill="#fff"/><circle cx="-1" cy="-9" r="5" fill="#ffd84d"/></g>'; } },
    { id: 'b4', svg: function () { return '<g transform="translate(58 246)"><path d="M-8-4q8-24 16 0" fill="none" stroke="#c4a8ff" stroke-width="4" stroke-linecap="round"/><rect x="-22" y="-2" width="44" height="34" rx="10" fill="#fff" ' + ST(3.200) + '/><path d="M0-2l-4-14 8 0z" fill="#ffd84d" ' + ST(2) + '/><circle cx="-8" cy="12" r="3" fill="#4a2a55"/><circle cx="8" cy="12" r="3" fill="#4a2a55"/><path d="M-6 20q6 5 12 0" fill="none" stroke="#4a2a55" stroke-width="2.500" stroke-linecap="round"/></g>'; } }
  ];
  var BAGMAP = {}; BAGS.forEach(function (o) { BAGMAP[o.id] = o; });

  var WINGS = [
    { id: 'w1', svg: function () { return both('<path d="M92 170C40 120-4 128 14 176c8 22 52 24 80 8z" fill="#ffd0ea" ' + ST(3) + ' opacity=".95"/><path d="M92 190C50 190 20 226 44 240c20 8 44-20 48-40z" fill="#e5d6ff" ' + ST(3) + ' opacity=".95"/><path d="M80 170C56 150 36 150 26 166" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/>'); } },
    { id: 'w2', svg: function () { return both('<path d="M92 176C44 110 0 130 14 178c10 28 56 18 78 4z" fill="#ffb347" ' + ST(3) + '/><path d="M92 192C54 190 30 232 54 246c18 8 38-22 38-44z" fill="#ff8fb8" ' + ST(3) + '/><circle cx="40" cy="156" r="10" fill="#fff" opacity=".8"/><circle cx="60" cy="226" r="7" fill="#fff" opacity=".8"/><circle cx="34" cy="180" r="5" fill="#6b3f72" opacity=".5"/>'); } },
    { id: 'w3', svg: function () { return both('<path d="M92 166C54 110 6 108 6 168c0 40 40 46 86 22z" fill="#fff" ' + ST(3) + '/><path d="M30 134q-8 24 2 52M52 130q-6 28 6 56M74 140q-2 20 10 40" fill="none" stroke="#d6e4ff" stroke-width="4" stroke-linecap="round"/>'); } },
    { id: 'w4', svg: function () { var cols = ['#ff6f91', '#ffb347', '#ffe066', '#8de8b5', '#6ec6ff']; return both(cols.map(function (c, i) { return '<path d="M92 ' + (176 + i) + 'C' + (62 - i * 10) + ' ' + (130 - i * 8) + ' ' + (14 - i * 2) + ' ' + (142 - i * 4) + ' ' + (22 + i * 4) + ' ' + (184 + i * 8) + 'C' + (40 + i * 6) + ' ' + (226) + ' ' + (80) + ' ' + (210 - i * 4) + ' 92 ' + (196) + 'z" fill="' + c + '" opacity="' + (0.9 - i * 0.04) + '" ' + ST(1.600) + '/>'; }).join('')); } }
  ];
  var WINGMAP = {}; WINGS.forEach(function (o) { WINGMAP[o.id] = o; });

  /* baguettes dans la main droite (droite sur l'image) */
  var WANDS = [
    { id: 'm1', svg: function () { return '<g transform="translate(182 238) rotate(24)"><rect x="-3.500" y="-62" width="7" height="68" rx="3.500" fill="#fff" ' + ST(2.500) + '/><path d="' + Art.P.star + '" transform="translate(-20 -96) scale(1.700)" fill="#ffd84d" ' + ST(1.700) + '/></g>'; } },
    { id: 'm2', svg: function () { return '<g transform="translate(182 238) rotate(24)"><rect x="-3.500" y="-60" width="7" height="66" rx="3.500" fill="#ffd0ea" ' + ST(2.500) + '/><path d="' + Art.P.heart + '" transform="translate(-20 -92) scale(1.700)" fill="#ff6fa5" ' + ST(1.700) + '/></g>'; } },
    { id: 'm3', svg: function () { return '<g transform="translate(182 238) rotate(24)"><rect x="-3.500" y="-48" width="7" height="54" rx="3.500" fill="#58b98a" ' + ST(2.500) + '/><g transform="translate(0 -60)"><g fill="#ffb3d1" ' + ST(2.200) + '><circle cx="0" cy="-12" r="9"/><circle cx="11" cy="-4" r="9"/><circle cx="-11" cy="-4" r="9"/><circle cx="7" cy="9" r="9"/><circle cx="-7" cy="9" r="9"/></g><circle r="7" fill="#ffd84d" ' + ST(2) + '/></g></g>'; } },
    { id: 'm4', svg: function () { return '<g transform="translate(182 238) rotate(24)"><rect x="-3.500" y="-60" width="7" height="66" rx="3.500" fill="#c4a8ff" ' + ST(2.500) + '/><g transform="translate(0 -70)"><path d="M-22 6a22 22 0 0 1 44 0" fill="none" stroke="#ff6f91" stroke-width="5"/><path d="M-16 6a16 16 0 0 1 32 0" fill="none" stroke="#ffe066" stroke-width="5"/><path d="M-10 6a10 10 0 0 1 20 0" fill="none" stroke="#6ec6ff" stroke-width="5"/></g></g>'; } }
  ];
  var WANDMAP = {}; WANDS.forEach(function (o) { WANDMAP[o.id] = o; });

  G.cats = {
    dress: OUT.filter(function (o) { return o.cat === 'dress'; }),
    skirt: OUT.filter(function (o) { return o.cat === 'skirt'; }),
    pj: OUT.filter(function (o) { return o.cat === 'pj'; }),
    shoes: SHOES, crown: CROWNS, jewel: JEWELS, bag: BAGS, wings: WINGS, wand: WANDS
  };
  G.maps = { outfit: OUTMAP, shoes: SHOEMAP, crown: CROWNMAP, jewel: JEWELMAP, bag: BAGMAP, wings: WINGMAP, wand: WANDMAP };

  /* ---------- la poupée complète ---------- */
  var arm = function (side, skin) {
    var d = side < 0 ? 'M96 170Q70 196 64 234' : 'M144 170Q170 196 176 234', hx = side < 0 ? 64 : 176;
    return '<g class="arm ' + (side < 0 ? 'l' : 'r') + '" style="transform-origin:' + (side < 0 ? 96 : 144) + 'px 170px">' +
      '<path d="' + d + '" fill="none" stroke="' + INK + '" stroke-width="19" stroke-linecap="round"/><path d="' + d + '" fill="none" stroke="' + skin + '" stroke-width="13" stroke-linecap="round"/>' +
      '<circle cx="' + hx + '" cy="238" r="9.500" fill="' + skin + '" ' + ST(3) + '/></g>';
  };
  G.girl = function (c) {
    c = Object.assign(G.defaults(), c || {}); c.hairStyle = G.fixStyle(c.hairStyle);
    var skin = G.skins[c.skin] || G.skins[1], shade = G.skinShade[c.skin] || G.skinShade[1];
    var hair = G.hairColors[c.hairColor] || G.hairColors[0];
    var out = OUTMAP[c.outfit] || OUTMAP.d0; var o = out.fn();
    var sh = SHOEMAP[c.shoes] || SHOEMAP.s0;
    var leg = function (x) { return '<path d="M' + x + ' 222L' + (x < 120 ? x - 2 : x + 2) + ' 338" fill="none" stroke="' + INK + '" stroke-width="19" stroke-linecap="round"/><path d="M' + x + ' 222L' + (x < 120 ? x - 2 : x + 2) + ' 338" fill="none" stroke="' + skin + '" stroke-width="13" stroke-linecap="round"/>'; };
    var s = '';
    s += '<ellipse cx="120" cy="368" rx="64" ry="9" fill="#000" opacity=".1"/>';
    if (c.wings) s += '<g class="wings">' + WINGMAP[c.wings].svg() + '</g>';
    s += '<g class="hairb">' + hairBack(c.hairStyle, hair) + '</g>';
    s += '<g class="body">';
    s += '<g class="legs">' + leg(108) + leg(132) + '</g>';
    s += '<g class="shoes">' + sh.fn(106, -1) + sh.fn(134, 1) + '</g>';
    s += '<rect x="107" y="144" width="26" height="24" rx="8" fill="' + skin + '" ' + ST(3) + '/>';
    s += '<g class="outfit">' + o.under + '</g>';
    if (c.jewel) s += '<g class="jewel">' + JEWELMAP[c.jewel].svg() + '</g>';
    s += arm(-1, skin) + arm(1, skin);
    s += '<g class="sleeves">' + (o.over || '') + '</g>';
    if (c.jewel) { var bc = BRACELET[c.jewel]; s += '<path d="M58 228q6 4 12 0M170 228q6 4 12 0" fill="none" stroke="' + bc + '" stroke-width="4" stroke-linecap="round"/>'; }
    if (c.bag) s += '<g class="bag">' + BAGMAP[c.bag].svg() + '</g>';
    if (c.wand) s += '<g class="wand">' + WANDMAP[c.wand].svg() + '</g>';
    s += '</g>';
    s += '<g class="headg">' + face(c, skin, shade) + '</g>';
    s += '<g class="hairf">' + hairFront(c.hairStyle, hair) + '</g>';
    if (c.crown) s += '<g class="crown">' + CROWNMAP[c.crown].svg() + '</g>';
    var svg = Art.svg('0 0 240 390', s, 'girl');
    return svg;
  };
  /* après insertion dans le DOM : applique l'humeur */
  G.mount = function (host, c) {
    host.innerHTML = G.girl(c);
    var svg = host.querySelector('svg');
    G.setMood(svg, (c && c.mood) || 'smile');
    return svg;
  };

  /* aperçu d'une pièce seule, pour les tuiles du dressing */
  G.preview = function (cat, id, c) {
    c = Object.assign(G.defaults(), c || {});
    var full = function (vb, over) { return Art.svg(vb, over, 'prev'); };
    var skin = G.skins[c.skin], hair = G.hairColors[c.hairColor];
    if (cat === 'dress' || cat === 'skirt' || cat === 'pj') {
      var o = OUTMAP[id].fn();
      var arms = '';
      return full('24 150 192 205', o.under + (o.over || ''));
    }
    if (cat === 'shoes') { var sh = SHOEMAP[id]; return full('68 308 104 62', sh.fn(96, -1) + sh.fn(144, 1)); }
    if (cat === 'crown') return full('50 -10 140 90', CROWNMAP[id].svg());
    if (cat === 'jewel') return full('46 112 148 140', JEWELMAP[id].svg());
    if (cat === 'bag') return full('20 214 90 86', BAGMAP[id].svg());
    if (cat === 'wings') return full('0 100 240 170', WINGMAP[id].svg());
    if (cat === 'wand') return full('150 118 70 140', WANDMAP[id].svg());
    if (cat === 'hair') {
      var hh = G.hairColors[c.hairColor];
      return full('20 0 200 190', '<g>' + hairBack(id, hh) + '</g>' + face(c, skin, G.skinShade[c.skin]) + hairFront(id, hh));
    }
    return '';
  };

  /* ====== VISAGE À MAQUILLER (viewBox 0 0 300 340) ====== */
  var F = Art.face = {};
  F.base = { skin: 1, hairColor: 0, hairStyle: 'long', eyes: 0, lip: '#f27f95' };
  /* Visage « poupée de dessin animé » personnalisable : peau, yeux, cheveux (couleur + coiffure), tenue.
     st : { skin, eyes, hairColor, hairStyle, top, collar, lips, blush, shadow } */
  F.render = function (ch, st) {
    st = Object.assign({}, ch || F.base, st || {});
    var u = uid('fc'), si = st.skin == null ? 1 : st.skin, skin = G.skins[si], shade = G.skinShade[si];
    var hc = G.hairColors[st.hairColor] || G.hairColors[0], hairc = hc.c, hd = hc.d, style = G.fixStyle(st.hairStyle), lipc = st.lips || F.base.lip;
    var eyec = G.eyeColors[st.eyes] || G.eyeColors[0], topc = st.top || '#8fd0ff';
    var mir = function (inner) { return inner + '<g transform="translate(300 0) scale(-1 1)">' + inner + '</g>'; };
    var s = '<defs>' +
      '<radialGradient id="' + u + 's" cx="50%" cy="38%" r="72%"><stop offset="0" stop-color="' + skin + '"/><stop offset="1" stop-color="' + shade + '"/></radialGradient>' +
      '<linearGradient id="' + u + 'h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + hairc + '"/><stop offset="1" stop-color="' + hd + '"/></linearGradient>' +
      '<radialGradient id="' + u + 'i" cx="50%" cy="40%" r="65%"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>' +
      '<radialGradient id="' + u + 'b" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="' + (st.blush || '#ff7fa5') + '" stop-opacity="' + (st.blush ? '.85' : '.5') + '"/><stop offset="1" stop-color="' + (st.blush || '#ff7fa5') + '" stop-opacity="0"/></radialGradient>' +
      '<clipPath id="' + u + 'c"><ellipse cx="104" cy="198" rx="24" ry="26"/></clipPath></defs>';
    var H = 'url(#' + u + 'h)', SK = 'url(#' + u + 's)';
    var strands = function (n) { return '<g fill="none" stroke="#fff" stroke-width="3.200" stroke-linecap="round" opacity=".2">' + n + '</g>'; };
    var bowS = function (x, y, sc, c) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + sc + ')"><path d="M0 0L-34-20c-8 14-8 30 0 40zM0 0l34-20c8 14 8 30 0 40z" fill="' + c + '" stroke="#6b3f72" stroke-width="3" stroke-linejoin="round"/><circle r="8" fill="' + c + '" stroke="#6b3f72" stroke-width="3"/></g>'; };
    /* cheveux arrière */
    var hb = '';
    if (style === 'long') hb = '<path d="M44 172C12 222 34 262 18 300C14 320 26 334 38 340h224c12-6 24-20 20-40-16-38 4-80-22-128C240 44 60 44 44 172z" fill="' + H + '"/>' + strands('<path d="M46 214C40 260 46 300 50 336M254 214C260 260 254 300 250 336"/>');
    else if (style === 'flower') hb = '<path d="M50 170C26 220 38 262 30 300c-2 16 6 30 14 40h212c8-10 16-24 14-40-8-38 4-80-20-130C238 46 62 46 50 170z" fill="' + H + '"/>' + strands('<path d="M54 214C48 260 52 300 56 336M246 214C252 260 248 300 244 336"/>');
    else if (style === 'bun') hb = '<circle cx="150" cy="46" r="46" fill="' + H + '"/>' + strands('<path d="M120 30Q150 8 182 30"/>') + mir('<circle cx="52" cy="226" r="17" fill="' + H + '"/><circle cx="44" cy="258" r="14" fill="' + H + '"/>');
    else if (style === 'braids') hb = mir([0, 1, 2, 3, 4, 5].map(function (i) { return '<ellipse cx="' + (56 + (i % 2 ? 6 : -4)) + '" cy="' + (214 + i * 20) + '" rx="17" ry="15" fill="' + H + '"/>'; }).join('') + '<path d="M50 214q8 40 4 100" fill="none" stroke="' + hd + '" stroke-width="3" opacity=".4"/>');
    else if (style === 'curls') hb = '<g fill="' + H + '"><circle cx="58" cy="150" r="48"/><circle cx="242" cy="150" r="48"/><circle cx="92" cy="72" r="46"/><circle cx="208" cy="72" r="46"/><circle cx="150" cy="54" r="52"/></g>';
    else hb = mir('<path d="M70 120C16 130-6 210 14 296c40-8 70-70 70-156z" fill="' + H + '"/>' + strands('<path d="M40 160C30 200 30 250 36 284"/>'));
    s += '<g class="mk-hairb">' + hb + '</g>';
    /* cou et tenue : haut à manches bouffantes, col blanc et petit cœur */
    s += '<rect x="118" y="256" width="64" height="50" rx="22" fill="' + SK + '"/><path d="M118 262v22q32 16 64 0v-22z" fill="#000" opacity=".07"/>';
    s += '<path d="M20 340C30 306 80 296 118 296q32 28 64 0c38 0 88 10 98 44z" fill="' + topc + '"/><path d="M16 340C14 306 40 292 70 296C92 300 98 318 98 340z" fill="' + topc + '"/><path d="M284 340C286 306 260 292 230 296C208 300 202 318 202 340z" fill="' + topc + '"/><path d="M16 340C14 306 40 292 70 296C92 300 98 318 98 340zM284 340C286 306 260 292 230 296C208 300 202 318 202 340z" fill="#fff" opacity=".16"/>';
    if (st.collar !== false) s += '<path d="M108 292Q116 322 150 330Q184 322 192 292Q150 316 108 292z" fill="#fff"/><path d="M108 292Q116 322 150 330Q184 322 192 292" fill="none" stroke="#000" stroke-opacity=".1" stroke-width="3" stroke-linecap="round"/><path transform="translate(150 321) scale(.5) translate(-17 -15)" d="M17 30C4 20-2 15-2 8a9 9 0 0 1 19-3 9 9 0 0 1 19 3c0 7-6 12-19 22z" fill="#7ec8ff" stroke="#f5c542" stroke-width="4"/>';
    else s += '<path d="M118 296q32 30 64 0" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="5" stroke-linecap="round"/>';
    /* oreilles */
    s += mir('<ellipse cx="50" cy="206" rx="12" ry="16" fill="' + SK + '"/><ellipse cx="51" cy="207" rx="5" ry="8" fill="' + shade + '" opacity=".35"/>');
    /* visage */
    s += '<path d="M48 182C48 108 94 70 150 70s102 38 102 112c0 64-44 104-102 104S48 246 48 182z" fill="' + SK + '"/>';
    s += '<path d="M70 242Q150 312 230 242Q216 284 150 286Q84 284 70 242z" fill="#000" opacity=".05"/><ellipse cx="150" cy="112" rx="44" ry="12" fill="#fff" opacity=".18"/>';
    s += '<g id="mk-blush">' + mir('<ellipse cx="84" cy="240" rx="30" ry="20" fill="url(#' + u + 'b)"/>') + '</g>';
    /* fard à paupières */
    s += '<g id="mk-shadow">' + (st.shadow ? mir('<g transform="translate(112 202) scale(.88) translate(-104 -198)"><path d="M80 190Q82 160 104 158Q128 160 128 188Q104 172 80 190z" fill="' + st.shadow + '" opacity=".9"/><ellipse cx="104" cy="172" rx="26" ry="12" fill="' + st.shadow + '" opacity=".5"/></g>') : '') + '</g>';
    /* yeux : grands, ronds, reflets ; petits cils ; sourcils fins et hauts */
    s += mir('<g transform="translate(112 202) scale(.88) translate(-104 -198)"><ellipse cx="104" cy="198" rx="24" ry="26" fill="#fff"/>' +
      '<g clip-path="url(#' + u + 'c)"><circle cx="104" cy="199" r="25" fill="' + eyec + '"/><circle cx="104" cy="206" r="18" fill="#fff" opacity=".10"/><circle cx="104" cy="199" r="25" fill="url(#' + u + 'i)" opacity=".7"/><circle cx="104" cy="200" r="9.500" fill="#1b1018"/><circle cx="114" cy="188" r="7.500" fill="#fff"/><circle cx="94" cy="210" r="3.400" fill="#fff" opacity=".9"/></g>' +
      '<path d="M80 196C80 176 90 170 104 170s24 6 24 26" fill="none" stroke="#2b1a22" stroke-width="4.600" stroke-linecap="round"/><path d="M81 188q-7-2-11-10M84 180q-6-5-7-13" fill="none" stroke="#2b1a22" stroke-width="3.200" stroke-linecap="round"/>' +
      '<path d="M82 160Q104 146 128 156" fill="none" stroke="' + hd + '" stroke-width="4.200" stroke-linecap="round" opacity=".75"/></g>');
    /* nez */
    s += '<ellipse cx="150" cy="228" rx="6.500" ry="4.800" fill="' + shade + '" opacity=".55"/><ellipse cx="148" cy="226" rx="2.600" ry="1.800" fill="#fff" opacity=".45"/>';
    /* bouche : petit sourire (plus pulpeux une fois le rouge à lèvres posé) */
    s += '<g id="mk-lips">' + (st.lips ?
      '<path d="M126 244Q150 274 174 244Q150 256 126 244z" fill="' + lipc + '" stroke="' + lipc + '" stroke-width="4" stroke-linejoin="round"/><path d="M138 254Q150 261 162 254" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>' :
      '<path d="M130 246Q150 262 170 246Q150 254 130 246z" fill="' + lipc + '" stroke="' + lipc + '" stroke-width="3" stroke-linejoin="round"/>') + '</g>';
    /* cheveux avant : raie, frange balayée */
    var hf = '<path d="M50 198C36 96 96 52 150 54s114 42 100 144C246 150 226 120 190 104C170 96 146 96 128 100C104 112 76 140 50 198z" fill="' + H + '"/><path d="M128 62v38" stroke="#000" stroke-opacity=".16" stroke-width="3" stroke-linecap="round"/>' + strands('<path d="M96 84C84 104 72 134 62 170M204 80C220 96 236 124 242 160M150 60C176 62 200 76 214 92M150 60C120 62 98 70 86 84"/>');
    if (style === 'long' || style === 'flower') hf += mir('<path d="M58 172C40 226 58 262 38 302C34 318 40 332 44 340h38c-10-42 6-88-8-134-4-14-10-26-16-34z" fill="' + H + '"/><path d="M52 230C46 262 52 296 50 330" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".18"/>');
    if (style === 'pigtails') hf += mir('<rect x="40" y="150" width="34" height="18" rx="9" fill="#ff6fa5" transform="rotate(-20 57 159)"/>');
    if (style === 'braids') hf += mir(bowS(58, 322, .55, '#b794ff'));
    if (style === 'bun') hf += bowS(150, 84, .85, '#b794ff') + mir('<path d="M56 190C46 232 54 258 70 262C60 240 62 214 66 192z" fill="' + H + '"/>');
    if (style === 'flower') hf += '<path d="M66 132Q150 28 234 132" fill="none" stroke="#ffb3d1" stroke-width="8" stroke-linecap="round"/><g transform="translate(92 100) scale(1.500)"><g fill="#ff9ac8" stroke="#6b3f72" stroke-width="1.800"><circle cx="0" cy="-9" r="7.500"/><circle cx="9" cy="-3" r="7.500"/><circle cx="-9" cy="-3" r="7.500"/><circle cx="6" cy="8" r="7.500"/><circle cx="-6" cy="8" r="7.500"/></g><circle r="6" fill="#ffd84d" stroke="#6b3f72" stroke-width="1.800"/></g>';
    s += '<g class="mk-hairf">' + hf + '</g>';
    return s;
  };
  function both2(inner, w) { w = w || 300; return inner + '<g transform="translate(' + w + ' 0) scale(-1 1)">' + inner + '</g>'; }
  F.both2 = both2;

  /* éléments décoratifs posables (tampons) pour le visage, centrés en 0,0, ~ 40px */
  F.stamps = {
    heart: '<path d="' + Art.P.heart + '" transform="translate(-15 -15) scale(1.250)" fill="#ff4d8d" ' + ST(1.600) + '/>',
    star: '<path d="' + Art.P.star + '" transform="translate(-15 -15) scale(1.250)" fill="#ffd84d" ' + ST(1.600) + '/>',
    butterfly: '<g transform="scale(.6) translate(-32 -32)">' + Art.items.butterfly + '</g>',
    glitter: '<g><path d="' + Art.P.spark + '" transform="translate(-8 -22) scale(.7)" fill="#fff" ' + ST(1.200) + '/><path d="' + Art.P.spark + '" transform="translate(8 -4) scale(.5)" fill="#ffd84d"/><circle cx="-12" cy="8" r="3" fill="#8fd3ff"/><circle cx="2" cy="16" r="2.500" fill="#ff8fb8"/><circle cx="16" cy="-16" r="2.500" fill="#c4a8ff"/></g>',
    flower: '<g transform="scale(.55) translate(-32 -32)">' + Art.items.flower + '</g>',
    rainbow: '<g transform="scale(.6) translate(-32 -40)">' + Art.items.rainbow + '</g>'
  };
})();
