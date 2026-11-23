/* Personnages du « petit univers » : la sorcière fâchée (mais drôle), les grandes sœurs Aliya et Tania, Lumi qui bâille / qui envoie un bisou.
   Tout est dessiné en SVG, même style que le reste du jeu (contours violets, aplats doux). */
(function () {
  'use strict';
  var INK = Art.INK, ST = Art.ST, uid = Art.uid;

  /* ================= Lumi : humeurs (bouche, yeux) ================= */
  var MOUTH = { smile: 'M52 84q8 9 16 0', open: 'M50 81q10 18 20 0z', yawn: 'M52 78q8 26 16 0z', o: 'M56 82q4 10 8 0z' };
  Art.lumiMood = function (svg, mood) {
    if (!svg) return;
    var m = svg.querySelector('.lu-mouth'), eyes = svg.querySelector('.lu-eyes'), shut = svg.querySelector('.lu-shut');
    if (m) { m.setAttribute('d', MOUTH[mood] || MOUTH.smile); m.setAttribute('fill', (mood === 'open' || mood === 'yawn' || mood === 'o') ? '#a8325a' : '#fff'); }
    var closed = mood === 'yawn' || mood === 'sleep';
    if (eyes) eyes.style.display = closed ? 'none' : '';
    if (shut) shut.style.display = closed ? '' : 'none';
  };

  /* ================= La sorcière fâchée ================= */
  var HAT = '#5a2a8a', HAT2 = '#8e5fd6', HAIR = '#4a2b2b', SKIN = '#ffd5b5', DRESS = '#7b3fbc', DRESS2 = '#b085ee', CAPE = '#ff5fb0';
  var BR = '#3a1f1f';

  function arm(path, hand, pose) {   /* bras : manche violette contournée + poignet clair + main */
    return '<g data-arm="' + pose + '" style="display:none"><path d="' + path + '" fill="none" stroke="' + INK + '" stroke-width="27" stroke-linecap="round" stroke-linejoin="round"/><path d="' + path + '" fill="none" stroke="' + DRESS + '" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>' + hand + '</g>';
  }
  var HAND = function (x, y, r) { return '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 11) + '" fill="' + SKIN + '" ' + ST(3.500) + '/>'; };
  var CUFF = function (x, y, a) { return '<ellipse cx="' + x + '" cy="' + y + '" rx="13" ry="8" fill="' + DRESS2 + '" ' + ST(3) + ' transform="rotate(' + a + ' ' + x + ' ' + y + ')"/>'; };

  function exprs() {
    var eyeA = function (x, flip) {   /* œil fâché : amande + pupille qui regarde vers la droite */
      return '<g transform="translate(' + x + ' 114)' + (flip ? ' scale(-1 1)' : '') + '"><path d="M-12 -3L12 -9C14 2 6 10 -2 10 -9 9 -13 3 -12 -3z" fill="#fff" ' + ST(3) + '/><circle cx="3" cy="1" r="6" fill="#4a2a2a"/><circle cx="5" cy="-1" r="2.200" fill="#fff"/></g>';
    };
    var cheeks = '<ellipse cx="168" cy="134" rx="9" ry="6" fill="#ff6fa5" opacity=".5"/><ellipse cx="232" cy="134" rx="9" ry="6" fill="#ff6fa5" opacity=".5"/>';
    var ex = {};
    /* en colère : gros sourcils froncés, bouche qui gronde */
    ex.angry = eyeA(180, false) + eyeA(220, true) +
      '<path d="M160 94L192 108M240 94L208 108" stroke="' + BR + '" stroke-width="10" stroke-linecap="round"/><path d="M197 94q3 4 6 0" stroke="' + INK + '" stroke-width="2.500" fill="none" stroke-linecap="round"/>' + cheeks +
      '<g data-mv="a"><path d="M186 140Q200 154 214 140Q200 136 186 140z" fill="#8a2040" ' + ST(3) + '/></g>' +
      '<g data-mv="b" style="display:none"><path d="M182 138Q200 168 218 138Q200 130 182 138z" fill="#8a2040" ' + ST(3) + '/><path d="M187 141Q200 137 213 141" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="200" cy="154" rx="8" ry="5" fill="#ff8fa0"/></g>';
    /* rire malicieux : yeux fermés, grande bouche */
    ex.laugh = '<path d="M168 116q12-14 24 0M208 116q12-14 24 0" fill="none" stroke="' + BR + '" stroke-width="5" stroke-linecap="round"/><path d="M162 98Q176 90 192 100M238 98Q224 90 208 100" stroke="' + BR + '" stroke-width="8" stroke-linecap="round" fill="none"/>' + cheeks +
      '<g data-mv="a"><path d="M182 134Q200 160 218 134Z" fill="#8a2040" ' + ST(3) + '/><path d="M186 136h28" stroke="#fff" stroke-width="5" stroke-linecap="round"/></g>' +
      '<g data-mv="b" style="display:none"><path d="M178 132Q200 172 222 132Z" fill="#8a2040" ' + ST(3) + '/><path d="M184 135h32" stroke="#fff" stroke-width="6" stroke-linecap="round"/><ellipse cx="200" cy="157" rx="11" ry="6" fill="#ff8fa0"/></g>';
    /* boudeuse : regard de côté, joues gonflées */
    ex.grumpy = '<g transform="translate(180 116)"><path d="M-12 -2Q0 -9 12 -2 10 8 0 9 -10 8 -12 -2z" fill="#fff" ' + ST(3) + '/><circle cx="6" cy="2" r="5.500" fill="#4a2a2a"/><path d="M-13 -3Q0 -12 13 -3" fill="none" stroke="' + BR + '" stroke-width="5" stroke-linecap="round"/></g>' +
      '<g transform="translate(220 116)"><path d="M-12 -2Q0 -9 12 -2 10 8 0 9 -10 8 -12 -2z" fill="#fff" ' + ST(3) + '/><circle cx="6" cy="2" r="5.500" fill="#4a2a2a"/><path d="M-13 -3Q0 -12 13 -3" fill="none" stroke="' + BR + '" stroke-width="5" stroke-linecap="round"/></g>' +
      '<path d="M162 96L192 104M238 96L208 104" stroke="' + BR + '" stroke-width="10" stroke-linecap="round"/><circle cx="166" cy="134" r="11" fill="#ff8fb0" opacity=".6"/><circle cx="234" cy="134" r="11" fill="#ff8fb0" opacity=".6"/>' +
      '<g data-mv="a"><path d="M190 142q5-7 10 0q5-7 10 0" fill="none" stroke="#8a2040" stroke-width="4" stroke-linecap="round"/></g>' +
      '<g data-mv="b" style="display:none"><ellipse cx="200" cy="143" rx="9" ry="6" fill="#8a2040" ' + ST(3) + '/></g>';
    /* radoucie : sourcils moins froncés, petit sourire en coin */
    ex.soft = eyeA(180, false) + eyeA(220, true) +
      '<path d="M162 98L190 104M238 98L210 104" stroke="' + BR + '" stroke-width="8" stroke-linecap="round"/>' + cheeks +
      '<g data-mv="a"><path d="M188 141q12 8 24 0" fill="none" stroke="#8a2040" stroke-width="4.500" stroke-linecap="round"/></g>' +
      '<g data-mv="b" style="display:none"><path d="M186 139Q200 156 214 139Q200 135 186 139z" fill="#8a2040" ' + ST(3) + '/></g>';
    /* clin d'œil : petit rire final */
    ex.wink = '<path d="M168 114q12-14 24 0" fill="none" stroke="' + BR + '" stroke-width="5" stroke-linecap="round"/><g transform="translate(220 114)"><path d="M-12 -3L12 -9C14 2 6 10 -2 10 -9 9 -13 3 -12 -3z" fill="#fff" ' + ST(3) + '/><circle cx="2" cy="1" r="6" fill="#4a2a2a"/><circle cx="4" cy="-1" r="2.200" fill="#fff"/></g>' +
      '<path d="M164 96Q178 90 192 100M240 98Q224 92 208 102" stroke="' + BR + '" stroke-width="8" stroke-linecap="round" fill="none"/>' + cheeks +
      '<g data-mv="a"><path d="M184 136Q200 156 216 136Z" fill="#8a2040" ' + ST(3) + '/><path d="M189 138h22" stroke="#fff" stroke-width="4.500" stroke-linecap="round"/></g>' +
      '<g data-mv="b" style="display:none"><path d="M180 134Q200 166 220 134Z" fill="#8a2040" ' + ST(3) + '/><path d="M186 137h28" stroke="#fff" stroke-width="5" stroke-linecap="round"/></g>';
    return ex;
  }

  Art.witch = function () {
    var ex = exprs(), uidc = uid('wc');
    var s = '';
    /* balai (derrière) */
    s += '<g class="w-broom" transform="rotate(-7 210 270)"><path d="M92 262Q40 236 22 288Q60 296 92 282z" fill="#ffd84d" ' + ST(3.500) + '/><path d="M92 258Q52 270 28 300Q66 306 92 290z" fill="#f5b82e" ' + ST(3.500) + '/><path d="M44 268l40 4M40 282l46 2M48 292l38-6" stroke="#c98b1f" stroke-width="3" stroke-linecap="round"/><rect x="86" y="256" width="20" height="38" rx="7" fill="#ff5fb0" ' + ST(3.500) + '/><rect x="104" y="266" width="268" height="15" rx="7.500" fill="#b9733f" ' + ST(3.500) + '/><path d="M118 270h240" stroke="#e0a36c" stroke-width="3" stroke-linecap="round"/></g>';
    /* cape (doublure rose) */
    s += '<path d="M168 172C118 186 80 224 64 262 100 252 130 246 160 250z" fill="' + CAPE + '" ' + ST(3.500) + '/><path d="M172 172C136 190 110 214 96 238 120 226 146 222 170 226z" fill="' + DRESS + '" ' + ST(3) + ' opacity=".9"/>';
    /* jambes rayées + bottes */
    var leg = function (x, rot) {
      var st = '';
      for (var i = 0; i < 4; i++) st += '<rect x="' + (x - 10) + '" y="' + (258 + i * 14) + '" width="20" height="8" fill="' + (i % 2 ? '#e6d3ff' : '#9b6ee8') + '"/>';
      return '<g transform="rotate(' + rot + ' ' + x + ' 256)"><path d="M' + (x - 10) + ' 256h20v58h-20z" fill="#9b6ee8" ' + ST(3.500) + '/>' + st + '<path d="M' + (x - 14) + ' 306h28v12q18 2 22 14-14 6-24 4h-26z" fill="#4a2a7a" ' + ST(3.500) + '/><rect x="' + (x - 14) + '" y="308" width="30" height="8" rx="3" fill="#ffd84d" ' + ST(2.500) + '/><path d="M' + (x + 12) + ' 330q10-6 10-16" stroke="#4a2a7a" stroke-width="5" fill="none" stroke-linecap="round"/></g>';
    };
    s += leg(188, 5) + leg(224, -3);
    /* robe */
    s += '<path d="M156 172h88l14 72q30 4 36 22H110q6-18 34-22z" fill="' + DRESS + '" ' + ST(3.500) + '/>';
    s += '<path d="M118 262q8 14 22 4 8 12 22 2 8 12 22 0 10 12 22 0 10 12 22 0 12 10 22-2 12 12 22-2 8 6 12-4v-8H108z" fill="' + DRESS2 + '" ' + ST(3.500) + '/>';
    s += '<g fill="#ffd84d" ' + ST(2) + '><path d="' + Art.P.star + '" transform="translate(150 224) scale(1.150)"/><path d="' + Art.P.star + '" transform="translate(232 232) scale(.85)"/><path d="' + Art.P.star + '" transform="translate(196 244) scale(.7)"/></g><path d="M196 214q14-12 24 0 8 14-8 18" fill="none" stroke="#d9bdff" stroke-width="4" stroke-linecap="round"/>';
    s += '<path d="M170 172q30 20 60 0l6 14q-36 24-72 0z" fill="' + DRESS2 + '" ' + ST(3.500) + '/><circle cx="200" cy="186" r="9" fill="#ffd84d" ' + ST(3) + '/><circle cx="197" cy="183" r="3" fill="#fff" opacity=".8"/>';
    /* bras (une seule pose visible à la fois) */
    s += arm('M166 180Q128 196 150 232', CUFF(150, 232, 40) + HAND(156, 240), 'hips') + arm('M234 180Q272 196 250 232', CUFF(250, 232, -40) + HAND(244, 240), 'hips');
    s += arm('M234 178Q282 150 318 128', CUFF(304, 136, -30) + '<path d="M312 130L346 100" stroke="' + INK + '" stroke-width="16" stroke-linecap="round"/><path d="M312 130L346 100" stroke="' + SKIN + '" stroke-width="10" stroke-linecap="round"/>' + HAND(318, 130, 13), 'point') + arm('M166 180Q128 196 150 232', CUFF(150, 232, 40) + HAND(156, 240), 'point');
    s += arm('M164 182Q196 214 238 206', CUFF(226, 208, 80) + HAND(244, 206, 12), 'cross') + arm('M236 182Q204 214 162 206', CUFF(174, 208, -80) + HAND(156, 206, 12), 'cross');
    s += arm('M234 178Q288 170 300 116', CUFF(298, 128, -80) + HAND(302, 108, 13), 'wave') + arm('M166 180Q128 196 150 232', CUFF(150, 232, 40) + HAND(156, 240), 'wave');
    /* tête agrandie (style chibi) pour que les expressions se lisent bien */
    s += '<g class="w-head" transform="translate(200 160) scale(1.32) translate(-200 -160)">';
    /* cheveux ébouriffés (derrière le visage) */
    s += '<g class="w-hair"><path d="M138 100C100 112 92 160 112 196c6-10 16-14 26-12-6 18 4 34 18 32-2-14 4-24 14-28z" fill="' + HAIR + '" ' + ST(3.500) + '/><path d="M262 100C300 112 308 160 288 196c-6-10-16-14-26-12 6 18-4 34-18 32 2-14-4-24-14-28z" fill="' + HAIR + '" ' + ST(3.500) + '/><circle cx="116" cy="130" r="17" fill="' + HAIR + '" ' + ST(3.500) + '/><circle cx="104" cy="164" r="15" fill="' + HAIR + '" ' + ST(3.500) + '/><circle cx="284" cy="130" r="17" fill="' + HAIR + '" ' + ST(3.500) + '/><circle cx="296" cy="164" r="15" fill="' + HAIR + '" ' + ST(3.500) + '/><path d="M112 196q-24 14-12 34 10-8 16-14zM288 196q24 14 12 34-10-8-16-14z" fill="' + HAIR + '" ' + ST(3) + '/></g>';
    /* visage */
    s += '<ellipse cx="200" cy="118" rx="50" ry="47" fill="' + SKIN + '" ' + ST(3.500) + '/><ellipse cx="153" cy="120" rx="7" ry="10" fill="' + SKIN + '" ' + ST(3) + '/><ellipse cx="247" cy="120" rx="7" ry="10" fill="' + SKIN + '" ' + ST(3) + '/>';
    s += '<g class="w-face">' + Object.keys(ex).map(function (k, i) { return '<g data-ex="' + k + '"' + (i ? ' style="display:none"' : '') + '>' + ex[k] + '</g>'; }).join('') + '</g>';
    s += '<ellipse cx="200" cy="130" rx="4" ry="3" fill="#e8a888"/>';
    /* mèches de devant + chapeau */
    s += '<path d="M152 92C160 70 190 64 200 78 208 66 238 72 250 92 238 84 226 86 214 92 206 80 194 82 186 92 174 84 162 86 152 92z" fill="' + HAIR + '" ' + ST(3) + '/>';
    s += '<g class="w-hat" transform="translate(20 -22) scale(.9)"><path d="M92 86Q96 62 140 56C160 54 240 54 260 56 304 62 308 86 308 86 308 106 252 112 200 112S92 106 92 86z" fill="' + HAT + '" ' + ST(4) + '/><path d="M104 82Q150 70 200 72 252 70 296 82" fill="none" stroke="' + HAT2 + '" stroke-width="5" stroke-linecap="round" opacity=".7"/>' +
      '<path d="M140 66C144 30 128 4 96 -14C84 -20 78 -30 86 -36C94 -42 106 -34 100 -26C112 -26 150 -20 178 4C214 30 244 50 262 66z" fill="' + HAT + '" ' + ST(4) + '/><path d="M146 54C148 30 132 8 110 -4" stroke="' + HAT2 + '" stroke-width="5" stroke-linecap="round" fill="none" opacity=".6"/>' +
      '<path d="M136 66Q200 80 264 66l4 16Q200 98 132 82z" fill="' + HAT2 + '" ' + ST(3.500) + '/><path d="' + Art.P.star + '" transform="translate(172 54) scale(1.700)" fill="#ffd84d" ' + ST(2) + '/></g>';
    s += '</g>';
    return Art.svg('0 -110 400 470', s, 'witch');
  };
  /* expression + pose des bras */
  Art.witchSet = function (svg, o) {
    if (!svg) return; o = o || {};
    if (o.ex) Array.prototype.forEach.call(svg.querySelectorAll('[data-ex]'), function (n) { n.style.display = n.getAttribute('data-ex') === o.ex ? '' : 'none'; });
    if (o.arm) Array.prototype.forEach.call(svg.querySelectorAll('[data-arm]'), function (n) { n.style.display = n.getAttribute('data-arm') === o.arm ? '' : 'none'; });
  };
  /* mouvement de bouche (parler) : variante A (repos) / B (grande ouverte) */
  Art.witchMouth = function (svg, open) {
    if (!svg) return;
    var ex = svg.querySelector('[data-ex]:not([style*="none"])'); if (!ex) return;
    Array.prototype.forEach.call(ex.querySelectorAll('[data-mv]'), function (n) { n.style.display = (n.getAttribute('data-mv') === (open ? 'b' : 'a')) ? '' : 'none'; });
  };

  /* ================= Aliya et Tania, les grandes sœurs ================= */
  /* Apparences par défaut (modifiables dans custom/custom.js, rubrique « sisters », ou remplaçables par une image). */
  Art.sisterDefaults = {
    aliya: { skin: 1, eyes: 0, hairStyle: 'long', hairColor: 1, outfit: 'd3', shoes: 's4', crown: 'c2', accent: '#c9a8ff' },
    tania: { skin: 1, eyes: 1, hairStyle: 'braids', hairColor: 0, outfit: 'd1', shoes: 's1', crown: null, accent: '#ff9cc7' }
  };
  Art.sisterCfg = function (who) {
    var base = Art.sisterDefaults[who] || Art.sisterDefaults.aliya, over = (window.CELIA_CUSTOM && window.CELIA_CUSTOM.sisters && window.CELIA_CUSTOM.sisters[who]) || {};
    return Object.assign({}, base, over);
  };
  Art.sister = function (who) {
    var cfg = Art.sisterCfg(who);
    if (cfg.img) return '<div class="sis-img"><img alt="" src="' + cfg.img + '"></div>';
    return Art.dress.girl(Object.assign({ mood: 'smile' }, cfg));
  };
})();
