/* QUELLE VIE ! — icônes vectorielles des cartes et des ressources (repère 48×48) */
(function (root) {
  "use strict";
  var K = "#2b2140", s = ' stroke="' + K + '" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"';
  var I = {
    // ressources
    b: '<path d="M24 41 L8 25 a8.5 8.5 0 0 1 16 -11 a8.5 8.5 0 0 1 16 11 Z" fill="#ff5c8a"' + s + '/><path d="M14 20 a4 4 0 0 1 5 -4" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>',
    f: '<circle cx="24" cy="24" r="16" fill="#ffd23f"' + s + '/><circle cx="24" cy="24" r="10" fill="none" stroke="#e0a800" stroke-width="2.6"/><path d="M24 17 v14 M20 20 h6 a3 3 0 0 1 0 6 h-5" stroke="' + K + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
    r: '<path d="M24 6 l5.5 11.5 12.5 1.6 -9.2 8.7 2.4 12.4 -11.2 -6.1 -11.2 6.1 2.4 -12.4 -9.2 -8.7 12.5 -1.6z" fill="#5aa9ff"' + s + '/>',
    // cartes
    bike: '<circle cx="12" cy="32" r="8" fill="none"' + s + '/><circle cx="36" cy="32" r="8" fill="none"' + s + '/><path d="M12 32 L20 18 H32 L36 32 M20 18 L26 32 H12 M30 12 h5" fill="none"' + s + '/><rect x="16" y="6" width="14" height="10" rx="2" fill="#ff6b4a"' + s + '/>',
    cap: '<path d="M4 18 L24 10 L44 18 L24 26Z" fill="#2b2140"' + s + '/><path d="M12 22 V32 Q24 38 36 32 V22" fill="#3d7dd8"' + s + '/><path d="M40 19 V30" stroke="#ffd23f" stroke-width="3" stroke-linecap="round"/>',
    tie: '<path d="M16 6 H32 L28 14 H20Z" fill="#fff"' + s + '/><path d="M20 14 H28 L32 36 L24 44 L16 36Z" fill="#3d7dd8"' + s + '/>',
    arrow: '<path d="M24 4 L40 22 H30 V44 H18 V22 H8Z" fill="#38b58a"' + s + '/>',
    phone: '<rect x="13" y="4" width="22" height="40" rx="5" fill="#2b2140"' + s + '/><rect x="16" y="9" width="16" height="26" rx="2" fill="#ff7eb6"/><path d="M24 15 l2 4 4 .5 -3 3 .8 4 -3.8 -2 -3.8 2 .8 -4 -3 -3 4 -.5z" fill="#ffd23f"/>',
    rocket: '<path d="M24 4 Q36 14 32 32 H16 Q12 14 24 4Z" fill="#f4f6fb"' + s + '/><circle cx="24" cy="18" r="4" fill="#5aa9ff"' + s + '/><path d="M16 26 L8 34 L16 34 M32 26 L40 34 L32 34" fill="#ff6b4a"' + s + '/><path d="M20 34 L24 44 L28 34" fill="#ffd23f"' + s + '/>',
    heart: '<path d="M24 42 L7 25 a9 9 0 0 1 17 -12 a9 9 0 0 1 17 12 Z" fill="#e5487a"' + s + '/><path d="M30 10 l4 -4 M36 14 l5 -2" stroke="' + K + '" stroke-width="2.4" stroke-linecap="round"/>',
    rings: '<circle cx="18" cy="28" r="11" fill="none" stroke="#ffd23f" stroke-width="5"/><circle cx="18" cy="28" r="11" fill="none" stroke="' + K + '" stroke-width="1.6"/><circle cx="30" cy="28" r="11" fill="none" stroke="#ffd23f" stroke-width="5"/><circle cx="30" cy="28" r="11" fill="none" stroke="' + K + '" stroke-width="1.6"/><path d="M26 10 l4 -5 l4 5 l-4 4z" fill="#9fe6ff"' + s + '/>',
    candle: '<rect x="18" y="20" width="12" height="22" rx="2" fill="#fff4dc"' + s + '/><path d="M24 4 Q30 12 24 18 Q18 12 24 4Z" fill="#ff9a3a"' + s + '/><path d="M24 18 V20" stroke="' + K + '" stroke-width="2"/>',
    baby: '<circle cx="24" cy="18" r="11" fill="#f8cfa8"' + s + '/><path d="M20 18 h0 M28 18 h0" stroke="' + K + '" stroke-width="3.4" stroke-linecap="round"/><path d="M12 30 Q24 24 36 30 V40 Q24 46 12 40Z" fill="#9fe6ff"' + s + '/><path d="M22 10 q2 -4 4 0" fill="none"' + s + '/>',
    hamster: '<ellipse cx="24" cy="28" rx="16" ry="12" fill="#e3a35e"' + s + '/><circle cx="12" cy="18" r="5" fill="#e3a35e"' + s + '/><circle cx="34" cy="18" r="5" fill="#e3a35e"' + s + '/><circle cx="19" cy="26" r="2" fill="' + K + '"/><circle cx="29" cy="26" r="2" fill="' + K + '"/><path d="M22 32 q2 2 4 0" fill="none"' + s + '/><ellipse cx="24" cy="34" rx="7" ry="4" fill="#fff4dc" opacity=".7"/>',
    chest: '<rect x="6" y="20" width="36" height="22" rx="3" fill="#b56b3a"' + s + '/><path d="M6 20 Q6 8 24 8 Q42 8 42 20Z" fill="#c98c5a"' + s + '/><rect x="20" y="18" width="8" height="10" rx="2" fill="#ffd23f"' + s + '/><circle cx="14" cy="14" r="3" fill="#ffd23f"/><circle cx="36" cy="15" r="2.4" fill="#ffd23f"/>',
    flat: '<rect x="8" y="6" width="32" height="38" fill="#e8a87c"' + s + '/><rect x="13" y="11" width="8" height="8" fill="#9fd6ff"' + s + '/><rect x="27" y="11" width="8" height="8" fill="#9fd6ff"' + s + '/><rect x="13" y="23" width="8" height="8" fill="#9fd6ff"' + s + '/><rect x="27" y="23" width="8" height="8" fill="#9fd6ff"' + s + '/><rect x="20" y="34" width="8" height="10" fill="#3d7dd8"' + s + '/>',
    house: '<path d="M4 22 L24 6 L44 22Z" fill="#e5487a"' + s + '/><rect x="9" y="22" width="30" height="20" fill="#fff4dc"' + s + '/><rect x="21" y="30" width="7" height="12" fill="#b56b3a"' + s + '/><rect x="12" y="26" width="6" height="6" fill="#9fd6ff"' + s + '/><path d="M2 44 H46" stroke="#4caf6a" stroke-width="4" stroke-linecap="round"/>',
    car: '<path d="M4 34 V26 Q6 20 14 19 L20 12 H32 L40 19 Q46 20 46 28 V34Z" fill="#ff3b3b"' + s + '/><path d="M22 15 H31 L36 20 H18Z" fill="#9fd6ff"/><circle cx="14" cy="36" r="5" fill="' + K + '"/><circle cx="36" cy="36" r="5" fill="' + K + '"/>',
    plane: '<path d="M6 26 L42 10 Q46 10 44 14 L28 30 L24 44 L20 32 L6 26Z" fill="#f4f6fb"' + s + '/><path d="M20 32 L44 14" stroke="' + K + '" stroke-width="2"/><path d="M6 26 L14 22 L20 32" fill="#5aa9ff"' + s + '/>',
    ticket: '<path d="M4 14 H44 V20 a4 4 0 0 0 0 8 V34 H4 V28 a4 4 0 0 0 0 -8Z" fill="#ffd23f"' + s + '/><path d="M16 14 V34" stroke="' + K + '" stroke-width="2" stroke-dasharray="3 3"/><rect x="21" y="19" width="17" height="10" rx="2" fill="#c9ced8"/><path d="M24 24 h4 M31 24 h4" stroke="' + K + '" stroke-width="2"/>',
    hands: '<path d="M6 30 Q14 22 22 28 L26 30 Q30 32 26 34 L18 33" fill="#f8cfa8"' + s + '/><path d="M42 30 Q34 22 26 26 L22 28" fill="none"' + s + '/><path d="M6 30 L14 40 H34 L42 30" fill="#3d7dd8"' + s + '/><path d="M24 6 L20 14 L24 22 L28 14Z" fill="#e5487a"' + s + '/>',
    box: '<path d="M6 18 H42 V42 H6Z" fill="#d9a066"' + s + '/><path d="M6 18 L12 8 H36 L42 18" fill="#c98c5a"' + s + '/><path d="M28 18 q2 -12 10 -14 q-2 10 -8 14" fill="#38b58a"' + s + '/><rect x="12" y="8" width="10" height="12" fill="#fff"' + s + '/>',
    broken: '<path d="M24 42 L7 25 a9 9 0 0 1 17 -12 L20 22 L27 27 L22 34Z" fill="#e5487a"' + s + '/><path d="M26 14 a9 9 0 0 1 15 11 L27 40 L30 30 L24 25 L29 18Z" fill="#e5487a"' + s + ' transform="translate(3 0)"/>',
    viral: '<rect x="14" y="6" width="20" height="36" rx="4" fill="#2b2140"' + s + '/><rect x="17" y="10" width="14" height="24" fill="#ffe8f0"/><path d="M6 10 L12 14 M4 22 H11 M6 34 L12 30 M42 10 L36 14 M44 22 H37 M42 34 L36 30" stroke="#e5487a" stroke-width="3" stroke-linecap="round"/><path d="M20 22 q4 -6 8 0" fill="none"' + s + '/>',
    drop: '<path d="M24 4 Q40 24 36 32 A12 12 0 0 1 12 32 Q8 24 24 4Z" fill="#5aa9ff"' + s + '/><path d="M18 30 a6 6 0 0 0 6 6" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>',
    magnifier: '<circle cx="20" cy="20" r="13" fill="#bfe8ff"' + s + '/><path d="M30 30 L42 42" stroke="' + K + '" stroke-width="6" stroke-linecap="round"/><path d="M14 16 a7 7 0 0 1 6 -5" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>',
    shark: '<path d="M4 30 Q20 12 40 22 L46 16 L44 28 L46 38 L40 32 Q20 44 4 30Z" fill="#8a92a6"' + s + '/><path d="M22 18 L26 6 L30 20" fill="#8a92a6"' + s + '/><circle cx="12" cy="27" r="2" fill="' + K + '"/><path d="M8 33 l3 -2 l2 2 l2 -2 l2 2" fill="none" stroke="#fff" stroke-width="1.6"/><rect x="18" y="26" width="8" height="10" fill="#2b2140" opacity=".6"/>',
    megaphone: '<path d="M8 20 H16 L36 8 V40 L16 28 H8Z" fill="#ff6b4a"' + s + '/><path d="M12 28 L16 40 H22 L19 28" fill="#f4f6fb"' + s + '/><path d="M40 18 q4 6 0 12" fill="none"' + s + '/>',
    shield: '<path d="M24 4 L40 10 V24 Q40 38 24 44 Q8 38 8 24 V10Z" fill="#5aa9ff"' + s + '/><path d="M16 24 l6 6 l10 -12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>',
    umbrella: '<path d="M4 24 Q24 0 44 24 Q38 20 34 24 Q29 20 24 24 Q19 20 14 24 Q10 20 4 24Z" fill="#38b58a"' + s + '/><path d="M24 24 V40 a4 4 0 0 1 -8 0" fill="none"' + s + '/>',
    boomerang: '<path d="M8 40 L22 10 Q26 4 30 10 L18 30 L42 34 Q46 40 40 42Z" fill="#ffd23f"' + s + '/><path d="M36 6 a8 8 0 0 1 6 8 M40 4 l2 6 l-6 0" fill="none"' + s + '/>',
    chart: '<path d="M6 6 V42 H44" fill="none"' + s + '/><path d="M10 12 L20 18 L26 14 L34 30 L42 36" fill="none" stroke="#e5487a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M42 36 l-8 1 l5 -6z" fill="#e5487a"/>',
    mic: '<rect x="18" y="4" width="12" height="22" rx="6" fill="#c9ced8"' + s + '/><path d="M12 20 a12 12 0 0 0 24 0 M24 32 V42 M16 42 H32" fill="none"' + s + '/><path d="M38 8 q4 -2 4 2 v8 M38 18 a2 2 0 1 1 0 -1" fill="none" stroke="#9b5de5" stroke-width="2.4"/>',
    sign: '<rect x="6" y="6" width="36" height="22" rx="2" fill="#fff"' + s + '/><path d="M24 28 V44" stroke="' + K + '" stroke-width="3.4"/><path d="M14 13 l6 8 M20 13 l-6 8 M26 13 h8 M26 21 h8" stroke="#e5487a" stroke-width="3" stroke-linecap="round"/>',
    sun: '<circle cx="24" cy="24" r="10" fill="#ffd23f"' + s + '/><path d="M24 4 v6 M24 38 v6 M4 24 h6 M38 24 h6 M10 10 l4 4 M34 34 l4 4 M10 38 l4 -4 M34 14 l4 -4" stroke="#ff9a3a" stroke-width="3" stroke-linecap="round"/>',
    toaster: '<rect x="6" y="16" width="36" height="24" rx="8" fill="#c9ced8"' + s + '/><path d="M14 16 V8 h8 v8 M26 16 V8 h8 v8" fill="#f2c27a"' + s + '/><path d="M42 26 h4" stroke="' + K + '" stroke-width="3" stroke-linecap="round"/>',
  };
  root.QV_ICONS = {
    get: function (k, cls) { return '<svg class="' + (cls || "qv-ico") + '" viewBox="0 0 48 48" aria-hidden="true">' + (I[k] || I.r) + '</svg>'; },
    has: function (k) { return !!I[k]; },
  };
})(window);
