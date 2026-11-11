/* Illustrations SVG originales : icônes d'interface, objets, décors, Lumi (la petite fée), tuiles de l'accueil. */
(function () {
  'use strict';
  var INK = '#6b3f72';
  var Art = window.Art = { INK: INK };
  var uid = C.uid;
  Art.uid = uid;
  var ST = function (w) { return 'stroke="' + INK + '" stroke-width="' + (w || 3) + '" stroke-linecap="round" stroke-linejoin="round"'; };
  Art.ST = ST;

  /* oeil kawaii */
  Art.eye = function (cx, cy, r, col) {
    return '<g><ellipse cx="' + cx + '" cy="' + cy + '" rx="' + r + '" ry="' + (r * 1.22) + '" fill="' + (col || '#4a2a55') + '"/>' +
      '<circle cx="' + (cx + r * 0.32) + '" cy="' + (cy - r * 0.45) + '" r="' + (r * 0.42) + '" fill="#fff"/>' +
      '<circle cx="' + (cx - r * 0.35) + '" cy="' + (cy + r * 0.4) + '" r="' + (r * 0.2) + '" fill="#fff"/></g>';
  };
  Art.svg = function (vb, inner, cls, extra) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '"' + (cls ? ' class="' + cls + '"' : '') + (extra || '') + '>' + inner + '</svg>';
  };
  var P_STAR = 'M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7L2 9.2l7.1-.6z';
  var P_HEART = 'M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z';
  var P_SPARK = 'M12 1c.8 6 3 9.2 11 11-8 1.8-10.2 5-11 11-.8-6-3-9.2-11-11 8-1.8 10.2-5 11-11z';
  Art.P = { star: P_STAR, heart: P_HEART, spark: P_SPARK };

  /* ---------- icônes d'interface (bonbons illustrés, blanc cassé sur fond coloré) ---------- */
  var W = 'fill="#fff" stroke="rgba(0,0,0,.12)" stroke-width="1"';
  Art.ui = {
    home: Art.svg('0 0 48 48', '<path d="M6 24L24 8l18 16v17a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z" fill="#fff"/><path d="M3 25L24 6l21 19" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><rect x="19" y="27" width="10" height="17" rx="3" fill="#ff8fb8"/><circle cx="26.5" cy="36" r="1.3" fill="#fff"/><path d="M33 10v6" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M24 4l1.6 3.2 3.4.4-2.5 2.3.7 3.4-3.2-1.8-3.2 1.8.7-3.4L19 7.6l3.4-.4z" fill="#ffd84d" stroke="#fff" stroke-width="1"/>'),
    back: Art.svg('0 0 48 48', '<path d="M30 8L14 24l16 16" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'),
    soundOn: Art.svg('0 0 48 48', '<path d="M6 18h8l10-9v30l-10-9H6z" fill="#fff"/><path d="M31 16c4 4 4 12 0 16M36 10c7 7 7 21 0 28" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/>'),
    soundOff: Art.svg('0 0 48 48', '<path d="M6 18h8l10-9v30l-10-9H6z" fill="#fff"/><path d="M32 17l12 14M44 17L32 31" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>'),
    check: Art.svg('0 0 48 48', '<path d="M9 25l11 11L40 12" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>'),
    cross: Art.svg('0 0 48 48', '<path d="M11 11l26 26M37 11L11 37" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round"/>'),
    undo: Art.svg('0 0 48 48', '<path d="M16 14L8 22l8 8" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 22h20a10 10 0 0 1 0 20H20" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>'),
    redo: Art.svg('0 0 48 48', '<path d="M32 14l8 8-8 8" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M38 22H18a10 10 0 0 0 0 20h10" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>'),
    trash: Art.svg('0 0 48 48', '<path d="M10 14h28l-2.5 27a3 3 0 0 1-3 2.5h-17a3 3 0 0 1-3-2.5z" fill="#fff"/><path d="M7 14h34M18 14V9h12v5" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 22v14M29 22v14" stroke="#ff8fb8" stroke-width="3.5" stroke-linecap="round"/>'),
    save: Art.svg('0 0 48 48', '<rect x="6" y="9" width="36" height="32" rx="5" fill="#fff"/><path d="M24 38s-9-5.5-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.500-9 12-9 12z" fill="#ff6fa5"/><path d="M14 9V4h20v5" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>'),
    gallery: Art.svg('0 0 48 48', '<rect x="5" y="9" width="38" height="30" rx="5" fill="#fff"/><rect x="9" y="13" width="30" height="22" rx="3" fill="#8fd3ff"/><circle cx="17" cy="21" r="4" fill="#ffd84d"/><path d="M9 35l10-10 7 7 5-5 8 8z" fill="#8de8b5"/>'),
    camera: Art.svg('0 0 48 48', '<path d="M5 17a4 4 0 0 1 4-4h6l3-5h12l3 5h6a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" fill="#fff"/><circle cx="24" cy="26" r="9" fill="#8fd3ff" stroke="#c4a8ff" stroke-width="3.5"/><circle cx="21" cy="23" r="2.6" fill="#fff"/><circle cx="38" cy="18" r="2" fill="#ff8fb8"/>'),
    dice: Art.svg('0 0 48 48', '<rect x="6" y="6" width="36" height="36" rx="9" fill="#fff"/><circle cx="16" cy="16" r="4" fill="#ff6fa5"/><circle cx="32" cy="16" r="4" fill="#4fd8d0"/><circle cx="24" cy="24" r="4" fill="#ffd84d"/><circle cx="16" cy="32" r="4" fill="#c4a8ff"/><circle cx="32" cy="32" r="4" fill="#8de8b5"/>'),
    plus: Art.svg('0 0 48 48', '<path d="M24 9v30M9 24h30" stroke="#fff" stroke-width="9" stroke-linecap="round"/>'),
    minus: Art.svg('0 0 48 48', '<path d="M9 24h30" stroke="#fff" stroke-width="9" stroke-linecap="round"/>'),
    flip: Art.svg('0 0 48 48', '<path d="M24 5v38" stroke="#fff" stroke-width="4" stroke-dasharray="4 5" stroke-linecap="round"/><path d="M19 12L5 36h14z" fill="#fff"/><path d="M29 12l14 24H29z" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>'),
    star: Art.svg('0 0 24 24', '<path d="' + P_STAR + '" fill="#ffd84d" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>'),
    starW: Art.svg('0 0 24 24', '<path d="' + P_STAR + '" fill="#fff"/>'),
    heart: Art.svg('0 0 24 24', '<path d="' + P_HEART + '" fill="#ff6fa5" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>'),
    again: Art.svg('0 0 48 48', '<path d="M38 24a14 14 0 1 1-5-10.700" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/><path d="M37 5v11H26z" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>'),
    next: Art.svg('0 0 48 48', '<path d="M17 8l16 16-16 16" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>'),
    replay: Art.svg('0 0 48 48', '<path d="M6 18h8l10-9v30l-10-9H6z" fill="#fff"/><path d="M31 16c4 4 4 12 0 16" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/>'),
    gift: Art.svg('0 0 48 48', '<rect x="7" y="20" width="34" height="23" rx="3" fill="#ff6fa5"/><rect x="5" y="14" width="38" height="9" rx="3" fill="#ff8fb8"/><rect x="21" y="14" width="6" height="29" fill="#ffd84d"/><path d="M24 14c-6-9-14-4-9 0zM24 14c6-9 14-4 9 0z" fill="none" stroke="#ffd84d" stroke-width="3.500" stroke-linejoin="round"/>'),
    brush: Art.svg('0 0 48 48', '<path d="M38 5l5 5-18 21-6-6z" fill="#fff"/><path d="M19 25l6 6c-1 8-8 12-16 11 3-3 1-6 3-9 1-4 4-8 7-8z" fill="#ffd84d"/>'),
    eraser: Art.svg('0 0 48 48', '<path d="M8 30L26 8l14 12-16 22H14z" fill="#fff"/><path d="M8 30l14 12" stroke="#ff8fb8" stroke-width="6" stroke-linecap="round"/><path d="M26 8l14 12-5 6-14-12z" fill="#ff8fb8"/>'),
    bucket: Art.svg('0 0 48 48', '<path d="M7 22L22 7l17 17-15 15z" fill="#fff"/><path d="M12 24l12-12" stroke="#8fd3ff" stroke-width="5" stroke-linecap="round"/><path d="M39 30c3 4 5 7 5 10a5 5 0 0 1-10 0c0-3 2-6 5-10z" fill="#8fd3ff" stroke="#fff" stroke-width="2"/>'),
    sparkles: Art.svg('0 0 48 48', '<path d="M20 5c1 9 4 13 14 15-10 2-13 6-14 15-1-9-4-13-14-15 10-2 13-6 14-15z" fill="#fff"/><path d="M37 26c.6 4 2 6 6 7-4 1-5.500 3-6 7-.6-4-2-6-6-7 4-1 5.400-3 6-7z" fill="#ffd84d"/>'),
    sticker: Art.svg('0 0 48 48', '<path d="M8 8h32v22L30 40H8z" fill="#fff"/><path d="M30 40V30h10z" fill="#c4a8ff"/><path d="' + P_STAR + '" transform="translate(12 12) scale(1)" fill="#ffd84d"/>'),
    pencil: Art.svg('0 0 48 48', '<path d="M34 5l9 9-26 26-12 3 3-12z" fill="#fff"/><path d="M34 5l9 9-5 5-9-9z" fill="#ff8fb8"/><path d="M8 31l9 9-12 3z" fill="#ffd84d"/>'),
    rainbow: Art.svg('0 0 48 48', '<path d="M4 38a20 20 0 0 1 40 0" fill="none" stroke="#ff6fa5" stroke-width="5"/><path d="M10 38a14 14 0 0 1 28 0" fill="none" stroke="#ffd84d" stroke-width="5"/><path d="M16 38a8 8 0 0 1 16 0" fill="none" stroke="#4fd8d0" stroke-width="5"/>'),
    spin: Art.svg('0 0 48 48', '<path d="M8 24a16 16 0 0 1 28-10.500" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M40 24a16 16 0 0 1-28 10.500" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M38 4v12H26z" fill="#fff"/><path d="M10 44V32h12z" fill="#fff"/>'),
    left: Art.svg('0 0 48 48', '<path d="M30 8L14 24l16 16" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'),
    right: Art.svg('0 0 48 48', '<path d="M18 8l16 16-16 16" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>'),
    music: Art.svg('0 0 48 48', '<path d="M18 36V10l22-5v26" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><ellipse cx="13" cy="37" rx="7" ry="5.500" fill="#fff"/><ellipse cx="35" cy="32" rx="7" ry="5.500" fill="#fff"/>'),
    voice: Art.svg('0 0 48 48', '<rect x="17" y="5" width="14" height="25" rx="7" fill="#fff"/><path d="M10 24a14 14 0 0 0 28 0M24 38v6" fill="none" stroke="#fff" stroke-width="4.500" stroke-linecap="round"/>'),
    hand: Art.svg('0 0 48 48', '<path d="M17 26V10a3 3 0 0 1 6 0v12V7a3 3 0 0 1 6 0v15V9a3 3 0 0 1 6 0v22c0 8-5 13-12 13-6 0-9-4-12-9l-4-8a3 3 0 0 1 5-3z" fill="#fff"/>'),
    soap: Art.svg('0 0 48 48', '<rect x="6" y="20" width="36" height="22" rx="9" fill="#fff"/><circle cx="14" cy="12" r="6" fill="#8fd3ff" stroke="#fff" stroke-width="2"/><circle cx="28" cy="8" r="4.500" fill="#c4a8ff" stroke="#fff" stroke-width="2"/><circle cx="37" cy="15" r="3.500" fill="#8de8b5" stroke="#fff" stroke-width="2"/>')
  };

  /* ---------- objets illustrés (carré 64x64, centrés) ---------- */
  var I = {};
  Art.items = I;
  I.star = '<path d="M32 5l7.800 17.500 19 1.800-14.300 12.500 4.300 18.700L32 45.400 15.200 55.500l4.300-18.700L5.200 24.300l19-1.800z" fill="#ffd84d" ' + ST(3) + '/><circle cx="26" cy="27" r="2.200" fill="#fff" opacity=".8"/>';
  I.heart = '<path d="M32 56S8 41 8 25a13 13 0 0 1 24-6 13 13 0 0 1 24 6c0 16-24 31-24 31z" fill="#ff6fa5" ' + ST(3) + '/><path d="M16 22a7 7 0 0 1 7-6" fill="none" stroke="#fff" stroke-width="3.500" stroke-linecap="round" opacity=".8"/>';
  I.flower = '<g ' + ST(2.500) + '><circle cx="32" cy="14" r="10" fill="#ff8fb8"/><circle cx="50" cy="28" r="10" fill="#ff8fb8"/><circle cx="43" cy="49" r="10" fill="#ff8fb8"/><circle cx="21" cy="49" r="10" fill="#ff8fb8"/><circle cx="14" cy="28" r="10" fill="#ff8fb8"/><circle cx="32" cy="34" r="11" fill="#ffd84d"/></g><circle cx="29" cy="31" r="3" fill="#fff" opacity=".7"/>';
  I.apple = '<path d="M32 18c-8-6-22-2-22 14 0 14 9 24 16 24 3 0 4-1 6-1s3 1 6 1c7 0 16-10 16-24 0-16-14-20-22-14z" fill="#ff5d6c" ' + ST(3) + '/><path d="M32 18c0-6 2-10 7-12" fill="none" stroke="#7a4a2a" stroke-width="4" stroke-linecap="round"/><path d="M36 12c4-5 10-4 12-3-1 5-7 8-12 3z" fill="#8de8b5" ' + ST(2.500) + '/><path d="M18 30a8 8 0 0 1 6-8" fill="none" stroke="#fff" stroke-width="3.500" stroke-linecap="round" opacity=".7"/>';
  I.carrot = '<path d="M26 20L40 14 52 22 34 56c-2 3-5 3-6 0z" fill="#ffa24d" ' + ST(3) + ' transform="rotate(-30 32 32)"/><path d="M20 26l5 4M25 36l6 3" stroke="#e5792a" stroke-width="2.500" stroke-linecap="round"/><path d="M42 18c-2-8 0-12 4-14 2 6 0 10-4 14zM46 22c6-5 10-4 14-2-3 5-8 6-14 2z" fill="#8de8b5" ' + ST(2.500) + '/>';
  I.fish = '<path d="M8 32c8-12 24-14 36-4l12-8v24l-12-8C32 46 16 44 8 32z" fill="#8fd3ff" ' + ST(3) + '/><circle cx="20" cy="29" r="3" fill="#4a2a55"/><path d="M28 22c4 6 4 14 0 20" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>';
  I.cookie = '<circle cx="32" cy="32" r="24" fill="#e8b878" ' + ST(3) + '/><circle cx="22" cy="24" r="4" fill="#7a4a2a"/><circle cx="38" cy="22" r="3.500" fill="#7a4a2a"/><circle cx="42" cy="38" r="4" fill="#7a4a2a"/><circle cx="26" cy="40" r="3.500" fill="#7a4a2a"/><circle cx="33" cy="32" r="3" fill="#7a4a2a"/>';
  I.ball = '<circle cx="32" cy="32" r="24" fill="#ff6fa5" ' + ST(3) + '/><path d="M12 26c14 4 26 4 40 0M12 40c14-4 26-4 40 0" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="22" cy="20" r="3" fill="#fff" opacity=".7"/>';
  I.butterfly = '<g ' + ST(2.500) + '><path d="M32 30C20 8 4 14 8 30c2 8 14 8 24 2z" fill="#ff8fb8"/><path d="M32 34C16 34 10 52 22 54c6 1 10-8 10-14z" fill="#ffb98a"/><path d="M32 30C44 8 60 14 56 30c-2 8-14 8-24 2z" fill="#ff8fb8"/><path d="M32 34c16 0 22 18 10 20-6 1-10-8-10-14z" fill="#ffb98a"/></g><ellipse cx="32" cy="34" rx="3.500" ry="14" fill="#6b3f72"/><path d="M30 21c-2-6-5-8-8-8M34 21c2-6 5-8 8-8" fill="none" stroke="#6b3f72" stroke-width="2.500" stroke-linecap="round"/><circle cx="19" cy="25" r="4" fill="#fff" opacity=".7"/><circle cx="45" cy="25" r="4" fill="#fff" opacity=".7"/>';
  I.cloud = '<path d="M16 46a12 12 0 0 1-1-24 16 16 0 0 1 30-3 13 13 0 0 1 4 27z" fill="#fff" ' + ST(3) + '/><circle cx="24" cy="30" r="2" fill="#fff"/>';
  I.moon = '<path d="M44 8a24 24 0 1 0 12 34A20 20 0 0 1 44 8z" fill="#ffd84d" ' + ST(3) + '/><circle cx="22" cy="30" r="3" fill="#f3b93c"/><circle cx="30" cy="46" r="2.500" fill="#f3b93c"/>';
  I.sun = '<g stroke="#ffb93c" stroke-width="5" stroke-linecap="round"><path d="M32 4v8M32 52v8M4 32h8M52 32h8M12 12l6 6M46 46l6 6M12 52l6-6M46 18l6-6"/></g><circle cx="32" cy="32" r="14" fill="#ffd84d" ' + ST(3) + '/>';
  I.key = '<circle cx="20" cy="22" r="13" fill="#ffd84d" ' + ST(3) + '/><circle cx="20" cy="22" r="5" fill="#fff4c8"/><path d="M29 31l24 24M44 46l7-7M38 40l6-6" fill="none" stroke="#e8a62a" stroke-width="6" stroke-linecap="round"/><path d="M29 31l24 24" fill="none" stroke="' + INK + '" stroke-width="1.500" opacity=".4"/>';
  I.crown = '<path d="M8 46L4 18l15 14 13-22 13 22 15-14-4 28z" fill="#ffd84d" ' + ST(3) + '/><rect x="8" y="44" width="48" height="9" rx="3" fill="#ffc42a" ' + ST(3) + '/><circle cx="32" cy="38" r="4" fill="#ff6fa5"/><circle cx="18" cy="40" r="3" fill="#4fd8d0"/><circle cx="46" cy="40" r="3" fill="#8fd3ff"/>';
  I.gift = '<rect x="9" y="28" width="46" height="28" rx="4" fill="#c4a8ff" ' + ST(3) + '/><rect x="6" y="20" width="52" height="12" rx="4" fill="#d9c5ff" ' + ST(3) + '/><rect x="28" y="20" width="8" height="36" fill="#ff8fb8"/><path d="M32 20c-10-14-22-6-12 0zM32 20c10-14 22-6 12 0z" fill="#ff8fb8" ' + ST(2.500) + '/>';
  I.cake = '<path d="M8 38h48v16a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z" fill="#f6d19a" ' + ST(3) + '/><path d="M8 38c0-8 8-10 12-10h24c4 0 12 2 12 10-4 6-8 0-12 6s-8 0-12 6-8 0-12-6-8 2-12-6z" fill="#ff8fb8" ' + ST(3) + '/><rect x="29" y="14" width="6" height="14" rx="2" fill="#8fd3ff" ' + ST(2) + '/><path d="M32 4c5 5 4 9 0 9s-5-4 0-9z" fill="#ffb93c"/>';
  I.mushroom = '<path d="M14 34a18 18 0 0 1 36 0z" fill="#ff6fa5" ' + ST(3) + '/><circle cx="24" cy="28" r="3.500" fill="#fff"/><circle cx="38" cy="24" r="3" fill="#fff"/><path d="M24 34h16v14a8 8 0 0 1-16 0z" fill="#fff4e8" ' + ST(3) + '/>';
  I.balloon = '<ellipse cx="32" cy="24" rx="17" ry="20" fill="#ff6fa5" ' + ST(3) + '/><path d="M30 44l2 4 2-4z" fill="#ff6fa5" ' + ST(2) + '/><path d="M32 48c-4 6 4 8 0 14" fill="none" stroke="' + INK + '" stroke-width="2.500" stroke-linecap="round"/><path d="M22 16a10 10 0 0 1 6-6" fill="none" stroke="#fff" stroke-width="3.500" stroke-linecap="round" opacity=".7"/>';
  I.drop = '<path d="M32 6c10 14 18 22 18 32a18 18 0 0 1-36 0c0-10 8-18 18-32z" fill="#8fd3ff" ' + ST(3) + '/><path d="M22 38a10 10 0 0 0 7 8" fill="none" stroke="#fff" stroke-width="3.500" stroke-linecap="round"/>';
  I.rainbow = '<path d="M4 50a28 28 0 0 1 56 0" fill="none" stroke="#ff6fa5" stroke-width="7"/><path d="M11 50a21 21 0 0 1 42 0" fill="none" stroke="#ffd84d" stroke-width="7"/><path d="M18 50a14 14 0 0 1 28 0" fill="none" stroke="#4fd8d0" stroke-width="7"/><path d="M25 50a7 7 0 0 1 14 0" fill="none" stroke="#c4a8ff" stroke-width="7"/>';
  I.egg = '<path d="M32 4C18 4 10 24 10 38a22 22 0 0 0 44 0C54 24 46 4 32 4z" fill="#fff4e8" ' + ST(3) + '/><path d="M12 36c8-6 14 6 20 0s12 6 20 0" fill="none" stroke="#ff8fb8" stroke-width="5" stroke-linecap="round"/><circle cx="24" cy="22" r="3.500" fill="#8fd3ff"/><circle cx="40" cy="20" r="3" fill="#ffd84d"/>';
  I.pear = '<path d="M32 14c-8 0-8 10-12 18-6 12 2 24 12 24s18-12 12-24c-4-8-4-18-12-18z" fill="#c8e86a" ' + ST(3) + '/><path d="M32 14c0-5 2-8 5-9" stroke="#7a4a2a" stroke-width="4" stroke-linecap="round" fill="none"/>';
  I.teddy = '<circle cx="14" cy="16" r="9" fill="#c98a5a" ' + ST(3) + '/><circle cx="50" cy="16" r="9" fill="#c98a5a" ' + ST(3) + '/><circle cx="32" cy="30" r="20" fill="#d9a06a" ' + ST(3) + '/><ellipse cx="32" cy="38" rx="9" ry="7" fill="#f6dcb4" ' + ST(2) + '/><circle cx="24" cy="26" r="2.800" fill="#4a2a55"/><circle cx="40" cy="26" r="2.800" fill="#4a2a55"/><ellipse cx="32" cy="35" rx="3" ry="2.200" fill="#4a2a55"/>';
  Art.item = function (name, size) {
    var body = I[name] || I.star;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"' + (size ? ' width="' + size + '" height="' + size + '"' : '') + '>' + body + '</svg>';
  };

  /* ---------- Lumi, la petite fée-boule qui accompagne Celia ---------- */
  Art.lumi = function (o) {
    o = o || {};
    var g = uid('lu'), c = o.color || '#ffd0e8';
    return Art.svg('0 0 120 130',
      '<defs><radialGradient id="' + g + '" cx="40%" cy="30%"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="' + c + '"/><stop offset="1" stop-color="#ff9ac8"/></radialGradient></defs>' +
      '<g class="lu-wing l" ><path d="M50 62C26 28 4 38 10 60c4 14 28 12 40 4z" fill="#d6f3ff" ' + ST(3) + ' opacity=".95"/></g>' +
      '<g class="lu-wing r"><path d="M70 62c24-34 46-24 40-2-4 14-28 12-40 4z" fill="#d6f3ff" ' + ST(3) + ' opacity=".95"/></g>' +
      '<g class="lu-body"><path d="M60 14l-4 12M60 14l4 12" stroke="' + INK + '" stroke-width="3" stroke-linecap="round" fill="none"/>' +
      '<path d="M60 0l3 6.500 7 .8-5.200 4.700 1.500 7-6.300-3.700-6.300 3.700 1.500-7L50 7.300l7-.8z" fill="#ffd84d" ' + ST(2.500) + '/>' +
      '<circle cx="60" cy="74" r="38" fill="url(#' + g + ')" ' + ST(3.500) + '/>' +
      Art.eye(46, 70, 6.500) + Art.eye(74, 70, 6.500) +
      '<ellipse cx="36" cy="86" rx="7" ry="4.500" fill="#ff6fa5" opacity=".45"/><ellipse cx="84" cy="86" rx="7" ry="4.500" fill="#ff6fa5" opacity=".45"/>' +
      '<path d="M52 84q8 9 16 0" fill="#fff" stroke="' + INK + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</g>', 'lumi');
  };

  /* ---------- décors ---------- */
  /* ciel dégradé + nuages : utilitaire pour les scènes */
  Art.sky = function (id, top, bot) { return '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + top + '"/><stop offset="1" stop-color="' + bot + '"/></linearGradient>'; };
  Art.cloudShape = function (x, y, s, o) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')" opacity="' + (o || 1) + '"><path d="M0 30a14 14 0 0 1 4-27 18 18 0 0 1 34-3 15 15 0 0 1 10 30z" fill="#fff"/></g>';
  };
  Art.tree = function (x, y, s, col) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')"><rect x="-6" y="-8" width="12" height="40" rx="5" fill="#b98258" ' + ST(3) + '/><circle cx="0" cy="-26" r="30" fill="' + (col || '#8de8b5') + '" ' + ST(3) + '/><circle cx="-14" cy="-34" r="5" fill="#fff" opacity=".35"/></g>';
  };
  Art.bush = function (x, y, s, col) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')"><path d="M-30 0a16 16 0 0 1 8-26 18 18 0 0 1 34-4 15 15 0 0 1 18 30z" fill="' + (col || '#7ddba6') + '" ' + ST(2.500) + '/></g>';
  };
  Art.flowerSmall = function (x, y, col, s) {
    s = s || 1;
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><g class="sway" style="transform-box:fill-box;transform-origin:50% 100%"><path d="M0 0V-18" stroke="#58b98a" stroke-width="3" stroke-linecap="round"/><g transform="translate(0 -22)"><circle cx="0" cy="-6" r="5" fill="' + col + '"/><circle cx="6" cy="-1" r="5" fill="' + col + '"/><circle cx="-6" cy="-1" r="5" fill="' + col + '"/><circle cx="3.5" cy="5" r="5" fill="' + col + '"/><circle cx="-3.5" cy="5" r="5" fill="' + col + '"/><circle r="4" fill="#ffd84d"/></g></g></g>';
  };
  /* Château de conte de fées, vue de face, viewBox 400x260 */
  Art.castle = function (o) {
    o = o || {};
    var f = function (x, y, c) { return '<g class="flag" style="transform-origin:' + x + 'px ' + y + 'px"><path d="M' + x + ' ' + y + 'v-30" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/><path d="M' + x + ' ' + (y - 30) + 'l22 7-22 7z" fill="' + c + '" ' + ST(2) + '/></g>'; };
    var tower = function (x, w, h, roof, rc) {
      return '<rect x="' + (x - w / 2) + '" y="' + (250 - h) + '" width="' + w + '" height="' + h + '" fill="#fff0f6" ' + ST(3.500) + '/>' +
        '<path d="M' + (x - w / 2 - 8) + ' ' + (250 - h) + ' L' + x + ' ' + (250 - h - roof) + ' L' + (x + w / 2 + 8) + ' ' + (250 - h) + 'z" fill="' + rc + '" ' + ST(3.500) + '/>' +
        '<path d="M' + x + ' ' + (250 - h - roof + 4) + 'v-3" />' +
        '<path d="M' + (x - 6) + ' ' + (250 - h + 28) + 'a6 8 0 0 1 12 0v14h-12z" fill="#8fd3ff" ' + ST(2.500) + '/>' +
        '<circle cx="' + (x - w / 4) + '" cy="' + (250 - h - roof / 3) + '" r="3" fill="#fff" opacity=".6"/>';
    };
    return Art.svg('0 0 400 260',
      '<ellipse cx="200" cy="252" rx="190" ry="10" fill="#000" opacity=".06"/>' +
      tower(70, 50, 120, 62, '#c4a8ff') + tower(330, 50, 120, 62, '#c4a8ff') +
      tower(130, 44, 150, 56, '#ff8fb8') + tower(270, 44, 150, 56, '#ff8fb8') +
      f(130, 250 - 150 - 56 + 2, '#ffd84d') + f(270, 250 - 150 - 56 + 2, '#ffd84d') + f(70, 250 - 120 - 62 + 2, '#ff8fb8') + f(330, 250 - 120 - 62 + 2, '#ff8fb8') +
      '<rect x="120" y="150" width="160" height="100" fill="#fff6fa" ' + ST(3.500) + '/>' +
      '<path d="M120 150h16v-12h16v12h16v-12h16v12h16v-12h16v12h16v-12h16v12h16v-12h16v12" fill="#fff6fa" ' + ST(3.500) + '/>' +
      tower(200, 70, 190, 78, '#4fd8d0') + f(200, 250 - 190 - 78 + 2, '#ff6fa5') +
      '<path d="M170 250v-46a30 30 0 0 1 60 0v46z" fill="#ffb98a" ' + ST(3.500) + '/><path d="M200 204v46" stroke="' + INK + '" stroke-width="2.500"/><circle cx="192" cy="232" r="3" fill="#ffd84d"/><circle cx="208" cy="232" r="3" fill="#ffd84d"/>' +
      '<circle cx="200" cy="96" r="14" fill="#ffd84d" ' + ST(3) + '/><path d="M200 86v10l6 4" stroke="' + INK + '" stroke-width="2.500" fill="none" stroke-linecap="round"/>' +
      '<path d="M150 190a8 10 0 0 1 16 0v12h-16zM234 190a8 10 0 0 1 16 0v12h-16z" fill="#8fd3ff" ' + ST(2.500) + '/>' +
      '<path d="M0 252h400" stroke="none"/>', 'castle-svg');
  };
  /* herbe douce avec collines */
  Art.hills = function (w, h) {
    return '<path d="M0 ' + (h * 0.35) + 'C' + (w * 0.2) + ' ' + (h * 0.1) + ' ' + (w * 0.4) + ' ' + (h * 0.3) + ' ' + (w * 0.6) + ' ' + (h * 0.2) + 'S' + (w * 0.9) + ' ' + (h * 0.1) + ' ' + w + ' ' + (h * 0.3) + 'V' + h + 'H0z" fill="#b5efc9"/>';
  };

  /* ---------- tuiles de l'accueil (viewBox 160x140) ---------- */
  var T = Art.tiles = {};
  T.draw = Art.svg('0 0 160 140',
    '<g transform="translate(18 8)"><path d="M10 124L36 22M104 124L78 22M57 124V36" stroke="#b98258" stroke-width="7" stroke-linecap="round"/><rect x="16" y="8" width="84" height="76" rx="8" fill="#fff" ' + ST(4) + '/>' +
    '<path d="M16 84l-4 12h92l-4-12" fill="none"/><path d="M28 60q14-34 30-6t30-20" fill="none" stroke="#ff6fa5" stroke-width="7" stroke-linecap="round"/><path d="M28 70q14-30 30-4t30-16" fill="none" stroke="#4fd8d0" stroke-width="7" stroke-linecap="round" opacity=".9"/><circle cx="32" cy="26" r="9" fill="#ffd84d"/></g>' +
    '<g transform="translate(106 74) rotate(25)"><rect x="-4" y="-34" width="9" height="46" rx="4.500" fill="#ffb93c" ' + ST(3) + '/><path d="M-8 12h17l-4 14h-9z" fill="#ff6fa5" ' + ST(3) + '/></g>' +
    '<g transform="translate(18 108)"><ellipse cx="22" cy="14" rx="26" ry="16" fill="#ffe9b8" ' + ST(3.500) + '/><circle cx="12" cy="8" r="5" fill="#ff6fa5"/><circle cx="26" cy="5" r="5" fill="#4fd8d0"/><circle cx="34" cy="16" r="5" fill="#8de8b5"/></g>');
  T.cook = Art.svg('0 0 160 140',
    '<ellipse cx="80" cy="128" rx="58" ry="8" fill="#000" opacity=".08"/>' +
    '<path d="M38 70l8 52h68l8-52z" fill="#8fd3ff" ' + ST(4) + '/><path d="M52 70l5 52M72 70l2 52M92 70l-2 52M108 70l-5 52" stroke="#fff" stroke-width="4" opacity=".7" stroke-linecap="round"/>' +
    '<path d="M30 72c-8-14 2-26 16-24 2-18 26-28 42-16 10-12 32-4 34 14 14-2 22 10 14 24 4 6-2 12-14 12H44c-12 0-18-4-14-10z" fill="#ff9ac8" ' + ST(4) + '/>' +
    '<path d="M44 52c10-10 18-2 26-10M96 44c8 0 12 6 22 4" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>' +
    '<circle cx="82" cy="20" r="11" fill="#ff4d6d" ' + ST(3) + '/><path d="M82 10c2-6 8-8 12-6" stroke="#58b98a" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="78" cy="17" r="3" fill="#fff" opacity=".8"/>' +
    '<g fill="#ffd84d"><path d="M22 36l3 6 6 1-4.500 4 1.200 6-5.700-3.200-5.700 3.200 1.200-6L13 43l6-1z" transform="scale(.8) translate(10 6)"/><path d="M138 30l3 6 6 1-4.500 4 1.200 6-5.700-3.200-5.700 3.200 1.200-6-4.500-4 6-1z" transform="scale(.8) translate(46 -4)"/></g>');
  T.dress = Art.svg('0 0 160 140',
    '<path d="M80 14v10" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/><path d="M80 24c-14-2-16-16-6-18 8-1 12 6 6 12" fill="none" stroke="#b98258" stroke-width="4" stroke-linecap="round"/><path d="M20 38L80 24l60 14" stroke="#b98258" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<path d="M62 42h36l6 24-8 6 22 56a76 24 0 0 1-76 0l22-56-8-6z" fill="#ff9ac8" ' + ST(4) + '/>' +
    '<path d="M62 42q18 12 36 0" fill="#fff" ' + ST(3) + '/><path d="M44 118q36 18 72 0" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 9"/>' +
    '<g transform="translate(112 66) rotate(15) scale(.55)">' + '<g>' + I.crown + '</g></g><circle cx="80" cy="76" r="5" fill="#ffd84d"/><circle cx="68" cy="100" r="4" fill="#fff" opacity=".8"/><circle cx="94" cy="94" r="4" fill="#ffd84d"/>');
  T.makeup = Art.svg('0 0 160 140',
    '<ellipse cx="80" cy="66" rx="52" ry="58" fill="#ffd84d" ' + ST(4) + '/><ellipse cx="80" cy="66" rx="42" ry="48" fill="#e8f7ff" ' + ST(3) + '/><path d="M58 40q8-14 22-12" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M58 124h44l-6-18H64z" fill="#ffd84d" ' + ST(4) + '/><rect x="52" y="124" width="56" height="10" rx="5" fill="#ff8fb8" ' + ST(3) + '/>' +
    '<g transform="translate(102 28) scale(.7)"><path d="' + P_STAR + '" fill="#ffd84d" ' + ST(3) + '/></g>' +
    '<g transform="translate(6 78) rotate(-20)"><rect x="0" y="18" width="14" height="38" rx="3" fill="#ff6fa5" ' + ST(3) + '/><path d="M1 18c0-14 4-20 6-22 2 2 6 8 6 22z" fill="#ff3d7f" ' + ST(3) + '/></g>' +
    '<g transform="translate(120 70) rotate(18)"><rect x="0" y="18" width="14" height="38" rx="3" fill="#c4a8ff" ' + ST(3) + '/><path d="M1 18c0-14 4-20 6-22 2 2 6 8 6 22z" fill="#a47cff" ' + ST(3) + '/></g>' +
    '<path d="M70 70q10 10 20 0" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' + Art.eye(66, 58, 4.500) + Art.eye(94, 58, 4.500) + '<ellipse cx="58" cy="72" rx="6" ry="4" fill="#ff6fa5" opacity=".45"/><ellipse cx="102" cy="72" rx="6" ry="4" fill="#ff6fa5" opacity=".45"/>');
  T.pets = Art.svg('0 0 160 140',
    '<ellipse cx="80" cy="132" rx="64" ry="6" fill="#000" opacity=".08"/>' +
    '<g transform="translate(34 8)"><path d="M8 40L2 4 30 22z" fill="#ffb98a" ' + ST(3.500) + '/><path d="M80 40l6-36-28 18z" fill="#ffb98a" ' + ST(3.500) + '/><ellipse cx="44" cy="58" rx="44" ry="40" fill="#ffd0a8" ' + ST(4) + '/><path d="M10 22l3 12 10-8zM78 22l-3 12-10-8z" fill="#ff8fb8"/>' + Art.eye(28, 52, 7) + Art.eye(60, 52, 7) + '<path d="M40 66l4 4 4-4z" fill="#ff6fa5" ' + ST(2) + '/><path d="M44 70q-6 8-12 4M44 70q6 8 12 4" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/><ellipse cx="18" cy="66" rx="7" ry="4" fill="#ff6fa5" opacity=".4"/><ellipse cx="70" cy="66" rx="7" ry="4" fill="#ff6fa5" opacity=".4"/></g>' +
    '<g ' + ST(3.500) + ' fill="#fff"><path d="M6 128V84q8-8 16 0v44z"/><path d="M34 128V80q8-8 16 0v48z"/><path d="M62 128V84q8-8 16 0v44z"/><path d="M90 128V80q8-8 16 0v48z"/><path d="M118 128V84q8-8 16 0v44z"/><rect x="0" y="96" width="140" height="10" rx="5" fill="#ffe3f1"/><rect x="0" y="114" width="140" height="10" rx="5" fill="#ffe3f1"/></g>' +
    '<g transform="translate(126 26)"><circle cx="10" cy="6" r="6" fill="#ff6fa5"/><circle cx="16" cy="0" r="6" fill="#ffd84d"/><circle cx="4" cy="0" r="6" fill="#c4a8ff"/><circle cx="10" cy="1" r="3.500" fill="#fff"/></g>');
  T.story = Art.svg('0 0 160 140',
    '<path d="M80 126C56 112 28 112 10 120V34c18-8 46-8 70 6 24-14 52-14 70-6v86c-18-8-46-8-70 6z" fill="#fff" ' + ST(4) + '/><path d="M80 40v86" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M22 108V46c14-3 34-1 52 8v60c-18-8-36-9-52-6z" fill="#e5d8ff"/><path d="M138 108V46c-14-3-34-1-52 8v60c18-8 36-9 52-6z" fill="#ffe0ef"/>' +
    '<path d="M36 100q12-34 30-16" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>' +
    '<g transform="translate(88 6) scale(.9)"><path d="M10 38c-4-4-2-12 4-12 2-6 12-6 14 0 6 0 8 8 4 12z" fill="#fff" ' + ST(3) + '/></g>' +
    '<g transform="translate(62 0) scale(1.1)"><path d="' + P_STAR + '" fill="#ffd84d" ' + ST(2) + '/></g><g transform="translate(112 10) scale(.8)"><path d="' + P_SPARK + '" fill="#4fd8d0" ' + ST(2) + '/></g>' +
    '<g transform="translate(94 56) scale(.9)"><path d="M0 40L-2 20c0-6 6-12 14-12h14l6-6v10l5 2-5 3v10c0 8-4 12-10 12v10h-6v-10h-8v10h-6V40z" fill="#fff" ' + ST(3) + '/><path d="M32 2l5-12 3 12z" fill="#ffd84d" ' + ST(2) + '/><circle cx="30" cy="16" r="2" fill="#4a2a55"/></g>');
  T.learn = Art.svg('0 0 160 140',
    '<ellipse cx="80" cy="130" rx="60" ry="7" fill="#000" opacity=".08"/>' +
    '<g ' + ST(4) + '><rect x="14" y="76" width="50" height="50" rx="8" fill="#4fd8d0"/><circle cx="110" cy="100" r="26" fill="#ff6fa5"/><path d="M62 18L96 74H28z" fill="#ffd84d"/></g>' +
    '<g transform="translate(70 66) rotate(14)"><path d="M0 0h28v8a10 10 0 1 1 0 20v10h-14a10 10 0 1 0-14-0z" fill="#c4a8ff" ' + ST(3.500) + '/></g>' +
    '<circle cx="104" cy="94" r="5" fill="#fff" opacity=".7"/><circle cx="26" cy="90" r="5" fill="#fff" opacity=".7"/><circle cx="64" cy="48" r="5" fill="#fff" opacity=".8"/>' +
    '<g transform="translate(116 14) scale(.9)"><path d="' + P_STAR + '" fill="#ffd84d" ' + ST(2) + '/></g>');
  T.room = Art.svg('0 0 160 140',
    '<ellipse cx="80" cy="130" rx="64" ry="7" fill="#000" opacity=".08"/>' +
    '<rect x="14" y="52" width="132" height="62" rx="12" fill="#c4a8ff" ' + ST(4) + '/><rect x="14" y="30" width="26" height="84" rx="10" fill="#a47cff" ' + ST(4) + '/>' +
    '<rect x="44" y="40" width="92" height="38" rx="14" fill="#fff4f9" ' + ST(4) + '/><rect x="40" y="60" width="106" height="26" rx="12" fill="#ffd0e8" ' + ST(4) + '/>' +
    '<path d="M60 74h70" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/>' +
    '<g transform="translate(112 6)"><path d="M14 4a16 16 0 1 0 10 28A13 13 0 0 1 14 4z" fill="#ffd84d" ' + ST(3) + '/></g>' +
    '<rect x="24" y="114" width="9" height="12" rx="4" fill="#a47cff" ' + ST(3) + '/><rect x="126" y="114" width="9" height="12" rx="4" fill="#a47cff" ' + ST(3) + '/>' +
    '<g transform="translate(60 18) scale(.5)"><path d="' + P_STAR + '" fill="#ffd84d" ' + ST(3) + '/></g><g transform="translate(76 30) scale(.4)"><path d="' + P_HEART + '" fill="#ff6fa5" ' + ST(3) + '/></g>');
})();
