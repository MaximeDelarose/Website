/* Cuisine magique : gâteaux, ingrédients, garnitures, saladier, four, décor de cuisine. */
(function () {
  'use strict';
  var INK = Art.INK, ST = Art.ST, uid = Art.uid;
  var F = Art.food = {};

  F.recipes = [
    { id: 'birthday', name: 'Gâteau d’anniversaire', say: 'Un gâteau d’anniversaire !', batter: '#ffe9b0', ings: ['oeuf', 'farine', 'lait', 'sucre'], oven: 'four' },
    { id: 'cupcake', name: 'Cupcake', say: 'Un cupcake !', batter: '#fff0c8', ings: ['oeuf', 'farine', 'beurre', 'sucre'], oven: 'four' },
    { id: 'cookie', name: 'Biscuit', say: 'Un gros biscuit !', batter: '#f0cf9a', ings: ['farine', 'beurre', 'chocolat', 'oeuf'], oven: 'four' },
    { id: 'glace', name: 'Glace', say: 'Une glace !', batter: '#ffd9ec', ings: ['lait', 'creme', 'fraise', 'sucre'], oven: 'glace' },
    { id: 'licorne', name: 'Gâteau licorne', say: 'Un gâteau licorne !', batter: '#e8d4ff', ings: ['oeuf', 'farine', 'lait', 'magie'], oven: 'four' }
  ];
  F.ingNames = { oeuf: 'un œuf', farine: 'de la farine', lait: 'du lait', sucre: 'du sucre', beurre: 'du beurre', chocolat: 'du chocolat', creme: 'de la crème', fraise: 'des fraises', magie: 'de la poudre magique' };

  F.ing = function (name) {
    var b = {
      oeuf: '<ellipse cx="32" cy="58" rx="22" ry="3.500" fill="#000" opacity=".08"/><path d="M32 6C18 6 12 28 12 38a20 20 0 0 0 40 0C52 28 46 6 32 6z" fill="#fff4e0" ' + ST(3) + '/><path d="M20 28q4-10 10-14" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"/><circle cx="26" cy="40" r="2.500" fill="#e8c9a0"/><circle cx="38" cy="34" r="2" fill="#e8c9a0"/>',
      farine: '<path d="M16 14h32l6 42a4 4 0 0 1-4 5H14a4 4 0 0 1-4-5z" fill="#fff" ' + ST(3) + '/><path d="M14 14h36" stroke="#ff8fb8" stroke-width="6" stroke-linecap="round"/><circle cx="32" cy="36" r="10" fill="#ffe9b8"/><path d="M26 36q6-8 12 0" fill="none" stroke="#e8c070" stroke-width="3" stroke-linecap="round"/>',
      lait: '<path d="M20 22h24v34a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4z" fill="#fff" ' + ST(3) + '/><path d="M20 22l4-14h16l4 14z" fill="#8fd3ff" ' + ST(3) + '/><path d="M20 34h24v14H20z" fill="#bfe6ff"/><path d="M32 38c-3 3-2 6 0 6s3-3 0-6z" fill="#fff"/>',
      sucre: '<path d="M16 22h32v32a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6z" fill="#fff0f8" ' + ST(3) + '/><rect x="14" y="12" width="36" height="10" rx="5" fill="#ff8fb8" ' + ST(3) + '/><rect x="24" y="32" width="10" height="10" rx="2" fill="#fff" ' + ST(2) + ' transform="rotate(10 29 37)"/><rect x="35" y="40" width="9" height="9" rx="2" fill="#fff" ' + ST(2) + '/>',
      beurre: '<path d="M8 28l10-12h38l-8 12z" fill="#fff4b0" ' + ST(3) + '/><rect x="8" y="28" width="40" height="24" rx="4" fill="#ffe97a" ' + ST(3) + '/><path d="M48 28l8-12v24l-8 12z" fill="#ffd84d" ' + ST(3) + '/><path d="M14 36h20" stroke="#fff" stroke-width="3.500" stroke-linecap="round" opacity=".7"/>',
      chocolat: '<rect x="12" y="8" width="40" height="48" rx="6" fill="#8a5a3c" ' + ST(3) + '/><path d="M12 24h40M12 40h40M25 8v48M38 8v48" stroke="#6a4029" stroke-width="2.500"/><path d="M12 8h40v12H12z" fill="#ff8fb8" ' + ST(3) + '/><path d="M18 14h12" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
      creme: '<path d="M14 54h36l-4-22H18z" fill="#fff" ' + ST(3) + '/><path d="M18 32q-4-10 6-12-2-8 8-12 10 4 8 12 10 2 6 12z" fill="#fff" ' + ST(3) + '/><circle cx="32" cy="46" r="4" fill="#ff8fb8"/>',
      fraise: '<path d="M32 58C14 46 8 28 14 20c6-6 14-2 18-2s12-4 18 2c6 8 0 26-18 38z" fill="#ff4d6d" ' + ST(3) + '/><path d="M18 18q14-10 28 0-14 8-28 0zM32 8v10" fill="#58c88f" ' + ST(3) + '/><g fill="#ffe0a0"><circle cx="24" cy="32" r="1.800"/><circle cx="34" cy="30" r="1.800"/><circle cx="42" cy="36" r="1.800"/><circle cx="28" cy="42" r="1.800"/><circle cx="37" cy="46" r="1.800"/></g>',
      magie: '<path d="M20 16h24v8l8 10v18a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6V34l8-10z" fill="#e5d6ff" ' + ST(3) + '/><rect x="18" y="8" width="28" height="9" rx="4" fill="#c4a8ff" ' + ST(3) + '/><path d="' + Art.P.star + '" transform="translate(20 28) scale(1.500)" fill="#ffd84d"/><circle cx="46" cy="22" r="2" fill="#ffd84d"/><circle cx="14" cy="22" r="2" fill="#ff8fb8"/>'
    };
    return Art.svg('0 0 64 64', b[name] || b.oeuf);
  };

  /* ---------- garnitures, centrées sur 0,0 dans ~44x44 ---------- */
  var T = F.tops = {
    fraise: '<path d="M0 18C-14 10-18-4-14-10c4-5 10-1 14-1s10-4 14 1c4 6 0 20-14 28z" fill="#ff4d6d" ' + ST(2.500) + '/><path d="M-10-10q10-8 20 0-10 6-20 0z" fill="#58c88f" ' + ST(2.200) + '/><g fill="#ffe0a0"><circle cx="-5" cy="0" r="1.500"/><circle cx="3" cy="-2" r="1.500"/><circle cx="8" cy="4" r="1.500"/><circle cx="-2" cy="8" r="1.500"/></g>',
    cerise: '<path d="M-6 6Q-4-12 8-18M8 8Q8-8 8-18" fill="none" stroke="#58a85a" stroke-width="3" stroke-linecap="round"/><circle cx="-7" cy="10" r="9" fill="#e0213f" ' + ST(2.500) + '/><circle cx="9" cy="12" r="9" fill="#e0213f" ' + ST(2.500) + '/><circle cx="-10" cy="7" r="2.500" fill="#fff" opacity=".7"/><circle cx="6" cy="9" r="2.500" fill="#fff" opacity=".7"/>',
    myrtille: '<circle r="12" fill="#5b6bd6" ' + ST(2.500) + '/><path d="M-5-3l5-4 5 4-2 5h-6z" fill="#3b4aa6"/><circle cx="-5" cy="-6" r="2.500" fill="#fff" opacity=".6"/>',
    kiwi: '<circle r="16" fill="#8fd35a" ' + ST(2.500) + '/><circle r="11" fill="#c8f08a"/><circle r="4" fill="#fff6c8"/><g fill="#3a3a3a"><circle cx="0" cy="-8" r="1.200"/><circle cx="7" cy="-3" r="1.200"/><circle cx="5" cy="6" r="1.200"/><circle cx="-5" cy="6" r="1.200"/><circle cx="-8" cy="-3" r="1.200"/></g>',
    bonbonR: '<circle r="12" fill="#ff6fa5" ' + ST(2.500) + '/><path d="M-8-5q8 4 16-2M-10 3q10 4 20-2" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>',
    bonbonB: '<circle r="12" fill="#6ec6ff" ' + ST(2.500) + '/><path d="M-8-5q8 4 16-2M-10 3q10 4 20-2" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>',
    bonbonJ: '<circle r="12" fill="#ffd84d" ' + ST(2.500) + '/><path d="M-8-5q8 4 16-2M-10 3q10 4 20-2" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>',
    coeur: '<path d="' + Art.P.heart + '" transform="translate(-16 -16) scale(1.350)" fill="#ff4d8d" ' + ST(1.600) + '/><path d="M-8-6q3-4 7-3" stroke="#fff" stroke-width="2.500" fill="none" stroke-linecap="round" opacity=".8"/>',
    etoile: '<path d="' + Art.P.star + '" transform="translate(-16 -16) scale(1.350)" fill="#ffd84d" ' + ST(1.600) + '/>',
    perles: '<circle cx="-9" cy="4" r="6" fill="#f4f4ff" ' + ST(2) + '/><circle cx="8" cy="3" r="6" fill="#f4f4ff" ' + ST(2) + '/><circle cx="0" cy="-8" r="6" fill="#f4f4ff" ' + ST(2) + '/>',
    fleur: '<g fill="#fff" ' + ST(2.200) + '><circle cx="0" cy="-9" r="7"/><circle cx="9" cy="-3" r="7"/><circle cx="-9" cy="-3" r="7"/><circle cx="5" cy="8" r="7"/><circle cx="-5" cy="8" r="7"/></g><circle r="5.500" fill="#ffd84d" ' + ST(2) + '/>',
    vermicelles: '<g stroke-linecap="round" stroke-width="4"><path d="M-14-8l5 3" stroke="#ff6fa5"/><path d="M-2-12l1 6" stroke="#4fd8d0"/><path d="M8-8l5 3" stroke="#ffd84d"/><path d="M-10 4l6-2" stroke="#c4a8ff"/><path d="M4 2l5 4" stroke="#ff6fa5"/><path d="M-4 12l5-2" stroke="#8de8b5"/><path d="M12 12l3-4" stroke="#4fd8d0"/><path d="M-16 12l4 3" stroke="#ffd84d"/></g>',
    macaron: '<ellipse cx="0" cy="-6" rx="15" ry="8" fill="#ffb3d1" ' + ST(2.200) + '/><rect x="-14" y="-3" width="28" height="6" rx="3" fill="#fff"/><ellipse cx="0" cy="6" rx="15" ry="8" fill="#ffb3d1" ' + ST(2.200) + '/>',
    chocolat: '<rect x="-12" y="-12" width="24" height="24" rx="4" fill="#8a5a3c" ' + ST(2.500) + '/><path d="M-12 0h24M0-12v24" stroke="#6a4029" stroke-width="2"/><path d="M-9-8h6" stroke="#b98258" stroke-width="2.500" stroke-linecap="round"/>',
    sucette: '<path d="M0 6v22" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M0 6v22" stroke="' + INK + '" stroke-width="1.800" opacity=".5"/><circle cy="-6" r="14" fill="#ff8fb8" ' + ST(2.500) + '/><path d="M0-6m-3 0a3 3 0 1 1 6 0a6 6 0 1 1-12 0a9 9 0 1 1 18 0" fill="none" stroke="#fff" stroke-width="2.500" stroke-linecap="round"/>',
    bougie: '<rect x="-5" y="-4" width="10" height="26" rx="3" fill="#8fd3ff" ' + ST(2.500) + '/><path d="M-5 4l10 4M-5 12l10 4" stroke="#fff" stroke-width="2.500"/><path d="M0-6" stroke="' + INK + '" stroke-width="2"/><g class="flame"><path d="M0-8C-8-14-4-24 0-30 4-24 8-14 0-8z" fill="#ffb02a" ' + ST(2) + '/><path d="M0-10C-3-14-1-19 0-22 1-19 3-14 0-10z" fill="#fff3a0"/></g>'
  };
  F.topGroups = [
    { id: 'fruits', icon: 'fraise', items: ['fraise', 'cerise', 'myrtille', 'kiwi'] },
    { id: 'bonbons', icon: 'bonbonR', items: ['bonbonR', 'bonbonB', 'bonbonJ', 'coeur', 'sucette', 'macaron', 'chocolat'] },
    { id: 'deco', icon: 'etoile', items: ['etoile', 'perles', 'fleur', 'vermicelles'] },
    { id: 'bougies', icon: 'bougie', items: ['bougie'] }
  ];
  F.top = function (name, size) {
    return Art.svg('-24 -34 48 64', T[name] || T.etoile, null, size ? ' width="' + size + '" height="' + (size * 64 / 48) + '"' : '');
  };

  F.icings = [
    { id: 'rose', c: '#ff9ac8' }, { id: 'blanc', c: '#fffaf5' }, { id: 'choco', c: '#a8683a' }, { id: 'bleu', c: '#8fd3ff' },
    { id: 'jaune', c: '#ffe066' }, { id: 'vert', c: '#9ff0c6' }, { id: 'violet', c: '#c4a8ff' }, { id: 'orange', c: '#ffb98a' }
  ];

  /* ---------- gâteaux (viewBox 0 0 300 300) ---------- */
  function drips(x1, x2, y, color, seed) {
    var s = '', n = Math.round((x2 - x1) / 30);
    for (var i = 0; i < n; i++) {
      var cx = x1 + 14 + i * ((x2 - x1 - 28) / Math.max(1, n - 1)), len = 10 + ((i * 7 + seed) % 5) * 7;
      s += '<rect x="' + (cx - 8) + '" y="' + (y - 2) + '" width="16" height="' + len + '" rx="8" fill="' + color + '" ' + ST(3) + '/>';
    }
    return s;
  }
  function cap(x1, x2, y, h, color) { return '<rect x="' + x1 + '" y="' + y + '" width="' + (x2 - x1) + '" height="' + h + '" rx="' + (h / 2) + '" fill="' + color + '" ' + ST(3.500) + '/>'; }
  var plate = '<ellipse cx="150" cy="268" rx="132" ry="22" fill="#fff" ' + ST(3.500) + '/><ellipse cx="150" cy="264" rx="108" ry="14" fill="#f3e8ff"/>';
  function shine(x, y, w) { return '<path d="M' + x + ' ' + y + 'h' + w + '" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".55"/>'; }

  F.cake = function (type, icing) {
    var sp = '#f4cf8c', sp2 = '#fff1d2', s = '', ic = icing;
    switch (type) {
      case 'cupcake':
        s += '<ellipse cx="150" cy="268" rx="96" ry="14" fill="#000" opacity=".08"/>';
        s += '<path d="M86 200L98 266Q150 280 202 266L214 200z" fill="#8fd3ff" ' + ST(3.500) + '/><path d="M104 204l6 62M126 208l3 66M150 210v68M174 208l-3 66M196 204l-6 62" stroke="#fff" stroke-width="5" opacity=".7" stroke-linecap="round"/>';
        if (!ic) s += '<path d="M80 204Q74 130 150 122Q226 130 220 204z" fill="' + sp + '" ' + ST(3.500) + '/><circle cx="120" cy="158" r="3" fill="#d9a85a"/><circle cx="170" cy="150" r="3" fill="#d9a85a"/><circle cx="148" cy="178" r="3" fill="#d9a85a"/>';
        else s += '<path d="M82 206Q78 168 150 160Q222 168 218 206z" fill="' + sp + '" ' + ST(3.500) + '/><g class="icing"><ellipse cx="150" cy="176" rx="72" ry="28" fill="' + ic + '" ' + ST(3.500) + '/><ellipse cx="150" cy="146" rx="54" ry="24" fill="' + ic + '" ' + ST(3.500) + '/><ellipse cx="150" cy="118" rx="36" ry="19" fill="' + ic + '" ' + ST(3.500) + '/><path d="M138 102q12-26 24 0q-12 8-24 0z" fill="' + ic + '" ' + ST(3.500) + '/>' + shine(110, 172, 24) + shine(128, 142, 20) + '</g>';
        break;
      case 'cookie':
        s += '<ellipse cx="150" cy="268" rx="116" ry="16" fill="#000" opacity=".08"/>';
        s += '<path d="M150 56c18 0 22 10 40 12 16 2 28 14 30 30 14 12 16 28 8 42 8 14 4 30-10 40-2 16-16 28-32 28-12 12-30 12-42 4-14 8-34 4-42-10-16-4-26-20-24-36-12-10-14-28-4-42-4-16 4-30 20-36 4-16 20-26 36-22 6-6 14-10 20-10z" transform="translate(0 6)" fill="#e8b878" ' + ST(3.500) + '/>';
        s += '<g fill="#7a4a2a"><circle cx="110" cy="110" r="9"/><circle cx="188" cy="104" r="8"/><circle cx="150" cy="150" r="10"/><circle cx="104" cy="170" r="8"/><circle cx="196" cy="176" r="9"/><circle cx="150" cy="208" r="8"/><circle cx="214" cy="140" r="6"/><circle cx="84" cy="140" r="6"/></g><path d="M90 96q10-16 26-20M180 84q16 2 24 14" stroke="#f6d19a" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>';
        if (ic) s += '<g class="icing"><path d="M150 84c24 0 34 10 48 22 14 12 16 32 8 48 6 18-4 36-22 42-8 14-26 20-40 12-18 6-38-4-42-22-14-10-14-30-4-44-2-22 12-40 32-44 6-8 14-14 20-14z" fill="' + ic + '" ' + ST(3.500) + '/><g fill="#7a4a2a" opacity=".9"><circle cx="124" cy="124" r="6"/><circle cx="176" cy="124" r="6"/><circle cx="150" cy="166" r="7"/></g>' + shine(118, 98, 26) + '</g>';
        break;
      case 'glace':
        s += '<ellipse cx="150" cy="276" rx="52" ry="8" fill="#000" opacity=".08"/>';
        s += '<path d="M96 168L150 284 204 168z" fill="#f2c27a" ' + ST(3.500) + '/><path d="M110 188l56 74M126 180l56 70M142 174l50 66M186 180l-56 70M170 174l-56 66M154 172l-48 62" stroke="#d99a4a" stroke-width="3" stroke-linecap="round"/>';
        s += '<circle cx="150" cy="138" r="58" fill="#fff5e1" ' + ST(3.500) + '/><path d="M96 158q8 16 18 6t18 8 18-4 18 4 18-8 18 6 12-8" fill="#fff5e1" ' + ST(3.500) + '/>';
        s += '<circle cx="150" cy="88" r="46" fill="' + (ic || '#ffd0e8') + '" ' + ST(3.500) + '/>' + '<path d="M112 98q8 14 16 4t18 6 18-4 16 6 12-10" fill="' + (ic || '#ffd0e8') + '" ' + ST(3.500) + '/>' + shine(122, 66, 26);
        break;
      case 'licorne':
        s += plate;
        s += '<path d="M62 150v90a24 14 0 0 0 24 14h128a24 14 0 0 0 24-14v-90z" fill="' + sp + '" ' + ST(3.500) + '/>';
        s += '<path d="M62 190h176v22H62z" fill="' + sp2 + '"/>';
        s += '<rect x="56" y="136" width="188" height="44" rx="22" fill="' + (ic || '#fff5ff') + '" ' + ST(3.500) + '/>' + drips(60, 240, 164, ic || '#fff5ff', 3) + shine(76, 146, 30);
        // visage
        s += '<g fill="none" stroke="#4a2a55" stroke-width="5" stroke-linecap="round"><path d="M96 214q10 10 20 0M184 214q10 10 20 0"/><path d="M92 208l-6-4M118 208l6-4M180 208l-6-4M208 208l6-4"/></g><path d="M138 228q12 12 24 0" fill="#ff8fb8" ' + ST(3) + '/><ellipse cx="82" cy="230" rx="12" ry="8" fill="#ff6fa5" opacity=".5"/><ellipse cx="218" cy="230" rx="12" ry="8" fill="#ff6fa5" opacity=".5"/>';
        // oreilles, corne, crinière
        s += '<path d="M84 140L74 96l40 30z" fill="#fff5ff" ' + ST(3.500) + '/><path d="M86 130l-4-20 18 13z" fill="#ff9ac8"/><path d="M216 140l10-44-40 30z" fill="#fff5ff" ' + ST(3.500) + '/><path d="M214 130l4-20-18 13z" fill="#ff9ac8"/>';
        s += '<path d="M150 40l-20 100h40z" fill="#ffd84d" ' + ST(3.500) + '/><path d="M140 82l22-8M136 100l30-10M132 120l38-12" stroke="#ff9a5c" stroke-width="4" stroke-linecap="round"/>';
        s += '<g ' + ST(3) + '><circle cx="112" cy="132" r="15" fill="#ff8fb8"/><circle cx="188" cy="132" r="15" fill="#8fd3ff"/><circle cx="96" cy="122" r="12" fill="#ffe066"/><circle cx="204" cy="122" r="12" fill="#8de8b5"/></g>';
        break;
      default: /* birthday */
        s += plate;
        s += '<path d="M48 190v52a22 12 0 0 0 22 12h160a22 12 0 0 0 22-12v-52z" fill="' + sp + '" ' + ST(3.500) + '/><rect x="48" y="212" width="204" height="18" fill="' + sp2 + '"/>';
        s += '<path d="M84 118v64h132v-64z" fill="' + sp + '" ' + ST(3.500) + '/><rect x="84" y="142" width="132" height="14" fill="' + sp2 + '"/>';
        s += '<path d="M48 190h204" stroke="' + INK + '" stroke-width="3.500" stroke-linecap="round"/>';
        if (ic) s += '<g class="icing">' + drips(48, 252, 196, ic, 1) + cap(44, 256, 176, 28, ic) + drips(84, 216, 134, ic, 4) + cap(80, 220, 112, 26, ic) + shine(64, 186, 28) + shine(98, 122, 24) + '</g>';
        else s += '';
    }
    return Art.svg('0 0 300 300', '<g class="cake">' + s + '</g><g class="tops"></g>', 'cakesvg');
  };
  F.cakeAnchors = { birthday: { y: 120 }, cupcake: { y: 110 }, cookie: { y: 120 }, glace: { y: 80 }, licorne: { y: 140 } };

  /* ---------- saladier (viewBox 0 0 300 200) ---------- */
  F.bowl = function () {
    return Art.svg('0 0 300 200',
      '<ellipse cx="150" cy="190" rx="100" ry="9" fill="#000" opacity=".1"/>' +
      '<ellipse cx="150" cy="62" rx="126" ry="34" fill="#e5d6ff" ' + ST(4) + '/>' +
      '<ellipse class="batter" cx="150" cy="70" rx="108" ry="26" fill="#fff2d0"/>' +
      '<path d="M22 66Q30 188 150 188T278 66Q278 100 150 100T22 66z" fill="#c4a8ff" ' + ST(4) + '/>' +
      '<path d="M34 94q4 48 36 68" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".5"/>' +
      '<g fill="#fff" opacity=".85"><circle cx="110" cy="130" r="6"/><circle cx="140" cy="148" r="4.500"/><circle cx="190" cy="136" r="5.500"/><circle cx="230" cy="112" r="4"/></g>' +
      '<path d="M22 66Q30 90 150 100T278 66" fill="none" stroke="#a47cff" stroke-width="3" stroke-linecap="round"/>', 'bowl');
  };
  F.spoon = Art.svg('0 0 60 160', '<path d="M30 54v100" stroke="' + INK + '" stroke-width="14" stroke-linecap="round"/><path d="M30 54v100" stroke="#ffd84d" stroke-width="8" stroke-linecap="round"/><ellipse cx="30" cy="30" rx="20" ry="28" fill="#ffd84d" ' + ST(3.500) + '/><ellipse cx="30" cy="30" rx="12" ry="19" fill="#ffe97a"/><circle cx="24" cy="20" r="4" fill="#fff" opacity=".7"/>', 'spoon');

  /* moule à gâteau avec pâte (viewBox 0 0 220 110) */
  F.tin = function (batter, shape) {
    return Art.svg('0 0 220 110',
      '<ellipse cx="110" cy="100" rx="86" ry="8" fill="#000" opacity=".1"/>' +
      '<path d="M14 40h192l-14 54a8 8 0 0 1-8 6H36a8 8 0 0 1-8-6z" fill="#e8e8f2" ' + ST(3.500) + '/>' +
      '<ellipse cx="110" cy="40" rx="96" ry="16" fill="#f4f4fb" ' + ST(3.500) + '/><ellipse class="tinbat" cx="110" cy="42" rx="84" ry="11" fill="' + batter + '"/>' +
      '<path d="M26 56l6 34" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"/>', 'tin');
  };

  /* ---------- four magique (viewBox 0 0 300 340) ---------- */
  F.oven = function (kind) {
    var ice = kind === 'glace', c1 = ice ? '#8fd3ff' : '#ff9ac8', c2 = ice ? '#bfe6ff' : '#ffc0de', c3 = ice ? '#4fa8e8' : '#ff6fa5';
    return Art.svg('0 0 300 340',
      '<ellipse cx="150" cy="330" rx="120" ry="10" fill="#000" opacity=".1"/>' +
      '<rect x="22" y="40" width="256" height="280" rx="34" fill="' + c1 + '" ' + ST(4.500) + '/>' +
      '<rect x="22" y="40" width="256" height="62" rx="30" fill="' + c2 + '" ' + ST(4.500) + '/>' +
      '<g fill="#fff" ' + ST(3.500) + '><circle cx="64" cy="71" r="14"/><circle cx="108" cy="71" r="14"/><circle cx="236" cy="71" r="14"/></g><path d="M64 62v9M108 62v9M236 62v9" stroke="' + c3 + '" stroke-width="4" stroke-linecap="round"/>' +
      '<rect x="150" y="62" width="58" height="18" rx="9" fill="#fff" ' + ST(3.500) + '/><circle cx="162" cy="71" r="4" fill="#ffd84d"/><circle cx="178" cy="71" r="4" fill="#8de8b5"/><circle cx="194" cy="71" r="4" fill="#c4a8ff"/>' +
      '<rect x="48" y="124" width="204" height="170" rx="26" fill="#fff" ' + ST(4) + '/>' +
      '<rect class="ovenwin" x="62" y="138" width="176" height="142" rx="20" fill="#3b2a55"/>' +
      '<radialGradient id="ovg" cx="50%" cy="60%" r="60%"><stop offset="0" stop-color="#ffcf6e"/><stop offset="1" stop-color="#ff7a45"/></radialGradient>' +
      '<rect class="glow" x="62" y="138" width="176" height="142" rx="20" fill="url(#ovg)" opacity="0"/>' +
      '<ellipse class="mound" cx="150" cy="256" rx="48" ry="6" fill="' + (ice ? '#ffd0e8' : '#fff2d0') + '"/>' +
      '<g class="door"><rect x="62" y="138" width="176" height="142" rx="20" fill="' + c1 + '" opacity=".35" ' + ST(3.500) + '/><path d="M80 154q30-12 60-8" stroke="#fff" stroke-width="8" stroke-linecap="round" fill="none" opacity=".7"/></g>' +
      '<rect x="96" y="288" width="108" height="14" rx="7" fill="' + c3 + '" ' + ST(3.500) + '/>' +
      (ice ? '<g fill="#fff" ' + ST(2.500) + '><path d="M150 164v20M140 174h20M143 167l14 14M157 167l-14 14" stroke="#fff" stroke-width="3.500" stroke-linecap="round"/></g>' : '') +
      '<rect x="40" y="318" width="26" height="16" rx="8" fill="' + c3 + '" ' + ST(3.500) + '/><rect x="234" y="318" width="26" height="16" rx="8" fill="' + c3 + '" ' + ST(3.500) + '/>', 'oven');
  };

  /* ---------- décor : cuisine ---------- */
  F.kitchenBg = function () {
    var tiles = '';
    for (var y = 0; y < 8; y++) for (var x = 0; x < 6; x++) tiles += '<rect x="' + (x * 70 + (y % 2) * 35 - 35) + '" y="' + (y * 40) + '" width="68" height="38" rx="6" fill="#fff" opacity="' + (0.35 + ((x + y) % 3) * 0.08) + '"/>';
    return Art.svg('0 0 390 700',
      '<defs>' + Art.sky('kw', '#ffe0ef', '#ffd0e6') + '<linearGradient id="kc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd6a8"/><stop offset="1" stop-color="#f8b87e"/></linearGradient></defs>' +
      '<rect width="390" height="700" fill="url(#kw)"/>' + tiles +
      '<rect x="230" y="70" width="130" height="150" rx="20" fill="#bfe8ff" ' + ST(4) + '/><path d="M230 145h130M295 70v150" stroke="#fff" stroke-width="5"/>' + Art.cloudShape(246, 100, 0.8, .95) + Art.cloudShape(310, 160, 0.6, .9) +
      '<path d="M222 66q30 40 8 100-14-36-8-100zM368 66q-30 40-8 100 14-36 8-100z" fill="#ff8fb8" ' + ST(3) + '/>' +
      '<rect x="20" y="110" width="170" height="12" rx="6" fill="#d9a06a" ' + ST(3.500) + '/>' +
      '<g ' + ST(3) + '><rect x="34" y="62" width="36" height="48" rx="10" fill="#c4a8ff"/><rect x="40" y="52" width="24" height="12" rx="5" fill="#a47cff"/><rect x="82" y="72" width="40" height="38" rx="10" fill="#8de8b5"/><rect x="88" y="62" width="28" height="12" rx="5" fill="#58c88f"/><rect x="134" y="66" width="38" height="44" rx="10" fill="#ffd84d"/><rect x="140" y="56" width="26" height="12" rx="5" fill="#ffb02a"/></g>' +
      '<circle cx="52" cy="88" r="7" fill="#fff" opacity=".8"/><path d="M98 92q6-8 12 0" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<rect x="0" y="470" width="390" height="230" fill="url(#kc)"/><rect x="0" y="466" width="390" height="14" fill="#ffe3c4" ' + ST(3.500) + '/>' +
      '<path d="M0 560h390M0 640h390" stroke="#e89a60" stroke-width="3" opacity=".5"/>', 'bgsvg', ' preserveAspectRatio="xMidYMid slice"');
  };
})();
