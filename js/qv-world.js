/* =========================================================================
   QUELLE VIE ! — décors des joueurs et scènes animées (séparés du moteur)
   QV_WORLD.outfit(p)          → tenue selon la situation (métier, chômage…)
   QV_WORLD.tile(p)            → <svg> de l'environnement du joueur (320×200)
   QV_WORLD.scene(ev, state)   → { svg, caption, dur, sfx:[[t, nom]] } ou null
   Les animations sont en CSS (keyframes « qv-mv », « qv-y »… dans quelle-vie.css).
   ========================================================================= */
(function (root) {
  "use strict";
  var A = root.QV_AVATAR, D = root.QV_DATA, INK = A.INK;
  var S = ' stroke="' + INK + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function outfit(p) {
    if (!p) return "casual";
    if (p.job) {
      if (p.job.k === "livreur") return "delivery";
      if (p.job.k === "bureau") return ["office", "manager", "director"][Math.min(2, p.job.lv - 1)];
      if (p.job.k === "influence") return "influencer";
      if (p.job.k === "startup") return "hoodie";
      if (p.job.k === "pdg") return "ceo";
    }
    var fired = (p.life || []).some(function (l) { return /Licencié|Faillite/.test(l.text); });
    return fired ? "unemployed" : "casual";
  }
  function partnerAv(p) { return p.partner ? A.random(p.partner.seed) : null; }
  function kidAv(p, k) { return A.random(k.seed, p.avatar); }

  // personnage posé par les pieds en (x, y), échelle s
  function ch(av, opts, x, y, s) {
    return '<g transform="translate(' + (x - 60 * s).toFixed(1) + ' ' + (y - 196 * s).toFixed(1) + ') scale(' + s + ')">' + A.svg(av, opts) + '</g>';
  }
  // animation : déplacement (x0,y0) → (x1,y1)
  function mv(x0, y0, x1, y1, dur, delay, ease, extra) {
    return ' style="--x0:' + x0 + 'px;--y0:' + y0 + 'px;--x1:' + x1 + 'px;--y1:' + y1 + 'px;animation:qv-mv ' + dur + 's ' + (ease || "ease-in-out") + ' ' + (delay || 0) + 's both' + (extra ? "," + extra : "") + '"';
  }
  function anim(name, dur, delay, ease, iter) {
    return ' style="animation:' + name + ' ' + dur + 's ' + (ease || "ease-in-out") + ' ' + (delay || 0) + 's ' + (iter || 1) + ' both"';
  }

  // ---------------- décors ----------------
  function bgRoom(w, h) {
    var o = '<rect width="' + w + '" height="' + h + '" fill="#f6e3c3"/>';
    for (var x = 10; x < w; x += 26) o += '<rect x="' + x + '" y="0" width="9" height="' + (h - 30) + '" fill="#efd4a8"/>';
    o += '<rect y="' + (h - 30) + '" width="' + w + '" height="30" fill="#c9925e"/><rect y="' + (h - 31) + '" width="' + w + '" height="4" fill="#a8743f"/>';
    return o;
  }
  function bgOffice(w, h) {
    var o = '<rect width="' + w + '" height="' + h + '" fill="#e6ecf5"/><rect y="' + (h - 30) + '" width="' + w + '" height="30" fill="#9aa6bb"/>';
    o += '<rect x="20" y="24" width="110" height="80" rx="4" fill="#9fd6ff"' + S + '/><path d="M30 104 V70 h14 v34 M50 104 V56 h18 v48 M74 104 V78 h14 v26 M94 104 V62 h16 v42" fill="#6f8fb8"/><path d="M75 24 V104 M20 64 H130" stroke="' + INK + '" stroke-width="3"/>';
    return o;
  }
  function bgStreet(w, h) {
    return '<rect width="' + w + '" height="' + h + '" fill="#9fd6ff"/><circle cx="' + (w - 50) + '" cy="40" r="20" fill="#ffd23f"/><rect y="' + (h - 30) + '" width="' + w + '" height="30" fill="#8fd16a"/><rect y="' + (h - 31) + '" width="' + w + '" height="4" fill="#6fb04a"/>';
  }

  function tile(p, opts) {
    opts = opts || {};
    var W = 320, H = 200, o = "";
    if (p.housing >= 2) {
      o += '<rect width="320" height="200" fill="#a8dcff"/><circle cx="290" cy="34" r="16" fill="#ffd23f"/>';
      o += '<rect y="168" width="320" height="32" fill="#8fd16a"/><rect y="166" width="320" height="4" fill="#6fb04a"/>';
      o += '<path d="M8 86 L80 30 L152 86 Z" fill="#e5487a"' + S + '/><rect x="20" y="84" width="122" height="84" fill="#fff4dc"' + S + '/><rect x="36" y="100" width="28" height="24" fill="#9fd6ff"' + S + '/><rect x="96" y="112" width="28" height="56" fill="#b56b3a"' + S + '/>';
      for (var fx = 150; fx < 320; fx += 16) o += '<path d="M' + fx + ' 168 v-26 l6 -6 l6 6 v26" fill="#fff"' + S.replace('3"', '2"') + '/>';
      o += '<circle cx="300" cy="96" r="30" fill="#4caf6a"' + S + '/><rect x="294" y="120" width="12" height="48" fill="#8a5a3b"' + S + '/>';
    } else if (p.housing === 1) {
      o += '<rect width="320" height="200" fill="#ffd9b8"/>';
      o += '<rect x="0" y="10" width="320" height="160" fill="#e8a87c"/>';
      for (var y = 22; y < 150; y += 44) for (var x = 14; x < 320; x += 62) o += '<rect x="' + x + '" y="' + y + '" width="34" height="28" rx="3" fill="#9fd6ff"' + S.replace('3"', '2.4"') + '/>';
      o += '<rect y="168" width="320" height="32" fill="#b9b4ae"/><rect y="166" width="320" height="4" fill="#8a92a6"/>';
      o += '<rect x="236" y="120" width="30" height="48" fill="#3d7dd8"' + S + '/><circle cx="18" cy="150" r="14" fill="#4caf6a"' + S + '/><rect x="10" y="156" width="16" height="12" fill="#b56b3a"' + S + '/>';
    } else {
      o += bgRoom(320, 200);
      o += '<rect x="22" y="26" width="58" height="44" fill="#fff"' + S + '/><text x="51" y="45" font-size="10" font-weight="900" text-anchor="middle" fill="' + INK + '" font-family="Nunito,sans-serif">MAMAN</text><text x="51" y="60" font-size="10" font-weight="900" text-anchor="middle" fill="#e5487a" font-family="Nunito,sans-serif">PAPA</text>';
      o += '<path d="M92 128 Q92 110 110 110 H230 Q248 110 248 128 V170 H92Z" fill="#e07a3a"' + S + '/><rect x="86" y="136" width="20" height="36" rx="8" fill="#c8612a"' + S + '/><rect x="234" y="136" width="20" height="36" rx="8" fill="#c8612a"' + S + '/>';
      o += '<path d="M282 60 h22 l-6 -22 h-10z" fill="#ffd23f"' + S + '/><path d="M293 60 V166 M282 168 h22" stroke="' + INK + '" stroke-width="3"/>';
    }
    // objets en fond
    if (p.items && p.items.indexOf("car") >= 0) {
      o += '<g transform="translate(196 132)"><path d="M6 36 V24 Q8 14 22 12 L40 2 H76 L96 14 Q118 16 120 28 V36Z" fill="#ff3b3b"' + S + '/><path d="M44 6 H72 L84 15 H38Z" fill="#9fd6ff"' + S.replace('3"', '2"') + '/><circle cx="30" cy="38" r="9" fill="#2b2140"/><circle cx="96" cy="38" r="9" fill="#2b2140"/><circle cx="30" cy="38" r="3.5" fill="#ccc"/><circle cx="96" cy="38" r="3.5" fill="#ccc"/></g>';
    }
    if (p.scandal > 0) {
      o += '<g class="qv-flash"><path d="M20 20 l6 14 14 2 -10 9 3 14 -13 -7 -13 7 3 -14 -10 -9 14 -2z" fill="#fff59a"/><path d="M290 40 l5 11 11 2 -8 7 2 11 -10 -6 -10 6 2 -11 -8 -7 11 -2z" fill="#fff59a"/></g>';
      o += '<rect x="112" y="6" width="96" height="22" rx="11" fill="#e5487a"' + S.replace('3"', '2"') + '/><text x="160" y="22" font-size="12" font-weight="900" text-anchor="middle" fill="#fff" font-family="Nunito,sans-serif">#SCANDALE</text>';
    }
    if (p.strike > 0) {
      o += '<g transform="translate(12 84)"><rect x="0" y="0" width="58" height="30" fill="#fff"' + S + '/><text x="29" y="20" font-size="11" font-weight="900" text-anchor="middle" fill="#e5487a" font-family="Nunito,sans-serif">GRÈVE</text></g>';
    }
    // personnages
    var mood = opts.mood || p.mood || "neutral";
    if (p.partner) {
      o += ch(partnerAv(p), { mood: p.married ? "love" : "happy", outfit: "casual" }, 248, 194, 0.66);
    }
    var kids = (p.kids || []);
    if (kids.length && !p.kidsAway) {
      kids.slice(0, 2).forEach(function (k, i) { o += ch(kidAv(p, k), { kid: true, mood: "happy" }, i ? 96 : 54, 196, 0.4); });
      if (kids.length > 2) o += '<g transform="translate(14 120)"><circle r="14" cx="14" cy="14" fill="#ffd23f"' + S + '/><text x="14" y="19" font-size="13" font-weight="900" text-anchor="middle" fill="' + INK + '" font-family="Nunito,sans-serif">+' + (kids.length - 2) + '</text></g>';
    } else if (kids.length && p.kidsAway) {
      o += '<g transform="translate(18 118)"><rect width="70" height="38" rx="6" fill="#fff"' + S + '/><text x="35" y="16" font-size="9" font-weight="900" text-anchor="middle" fill="' + INK + '" font-family="Nunito,sans-serif">Enfants chez</text><text x="35" y="29" font-size="9" font-weight="900" text-anchor="middle" fill="' + INK + '" font-family="Nunito,sans-serif">l\'autre parent</text></g>';
    }
    o += ch(p.avatar, { outfit: outfit(p), mood: mood, pose: mood === "happy" ? "wave" : mood === "smug" ? "hips" : "down" }, 164, 196, 0.74);
    if (p.married) o += '<path d="M206 38 l-8 -8 a5 5 0 0 1 8 -6 a5 5 0 0 1 8 6z" fill="#e5487a"' + S.replace('3"', '2"') + ' class="qv-beat"/>';
    if (p.items && p.items.indexOf("hamster") >= 0) {
      o += '<g transform="translate(2 160)"><rect width="34" height="32" rx="4" fill="rgba(255,255,255,.6)"' + S.replace('3"', '2"') + '/><path d="M2 8 H32 M2 16 H32 M2 24 H32" stroke="' + INK + '" stroke-width="1" opacity=".4"/><ellipse cx="17" cy="24" rx="10" ry="7" fill="#e3a35e"' + S.replace('3"', '2"') + '/><circle cx="21" cy="22" r="1.6" fill="' + INK + '"/><circle cx="11" cy="17" r="3" fill="#e3a35e"' + S.replace('3"', '1.6"') + '/></g>';
    }
    if (p.items && p.items.indexOf("toaster") >= 0) {
      o += '<g transform="translate(286 166)"><rect x="0" y="6" width="30" height="22" rx="6" fill="#c9ced8"' + S.replace('3"', '2.4"') + '/><path d="M8 6 v-5 h5 v5 M17 6 v-5 h5 v5" fill="#f2c27a"' + S.replace('3"', '1.6"') + '/></g>';
    }
    return '<svg class="qv-tile" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + o + '</svg>';
  }

  // ---------------- scènes ----------------
  function P(state, id) { return state && state.players ? state.players[id] : null; }
  function nm(p) { return p ? esc(p.name) : "?"; }
  function txt(x, y, t, size, fill, extra) {
    return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 14) + '" font-weight="900" text-anchor="middle" fill="' + (fill || INK) + '" font-family="Nunito,sans-serif"' + (extra || "") + '>' + esc(t) + '</text>';
  }
  function bubble(x, y, t, delay, fill) {
    var w = Math.max(44, t.length * 7.4 + 18);
    x = Math.max(w / 2 + 4, Math.min(356 - w / 2, x));
    return '<g class="qv-pop" style="animation-delay:' + delay + 's;transform-origin:' + x + 'px ' + y + 'px"><rect x="' + (x - w / 2) + '" y="' + (y - 14) + '" width="' + w + '" height="26" rx="13" fill="' + (fill || "#fff") + '"' + S.replace('3"', '2.4"') + '/>' + txt(x, y + 4, t, 12) + '</g>';
  }
  function confetti(n, x0, x1, delay, dur, seed) {
    var o = "", cols = ["#ff6b4a", "#ffd23f", "#3d7dd8", "#e5487a", "#38b58a", "#9b5de5"], s = seed || 3;
    for (var i = 0; i < n; i++) {
      s = (s * 9301 + 49297) % 233280; var r = s / 233280;
      var x = x0 + r * (x1 - x0), d = delay + (i % 7) * 0.12;
      o += '<g' + mv(x, -20, x + (r - 0.5) * 60, 250, dur, d, "ease-in") + '><rect class="qv-spin" width="7" height="11" fill="' + cols[i % cols.length] + '" style="animation-duration:' + (0.6 + r) + 's"/></g>';
    }
    return o;
  }
  // objet lancé en arc : x linéaire, y en cloche
  function thrown(inner, x0, y0, x1, y1, dur, delay) {
    return '<g' + mv(x0, 0, x1, 0, dur, delay, "linear") + '><g style="--y0:' + y0 + 'px;--y1:' + y1 + 'px;animation:qv-arc ' + dur + 's linear ' + delay + 's both">' + inner + '</g></g>';
  }
  var SOCK = '<path class="qv-spin" d="M-4 -10 h8 v12 l6 4 v6 h-12 z" fill="#ff7eb6"' + S.replace('3"', '2"') + '/>';
  var SHIRT = '<path class="qv-spin" d="M-12 -8 l6 -4 h12 l6 4 l-4 6 h-2 v14 h-12 v-14 h-2z" fill="#3d7dd8"' + S.replace('3"', '2"') + '/>';
  var TOASTER = '<g class="qv-spin"><rect x="-15" y="-11" width="30" height="22" rx="6" fill="#c9ced8"' + S.replace('3"', '2.4"') + '/><path d="M-7 -11 v-4 h5 v4 M2 -11 v-4 h5 v4" fill="#f2c27a"' + S.replace('3"', '1.6"') + '/></g>';
  var BILL = '<rect class="qv-spin" x="-10" y="-6" width="20" height="12" rx="2" fill="#7fd67a"' + S.replace('3"', '1.6"') + '/>';

  function wrap(o) { return '<svg class="qv-scene-svg" viewBox="0 0 360 240" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' + o + '</svg>'; }

  var SCENES = {
    divorce: function (ev, st) {
      var T = P(st, ev.to), E = A.random(ev.data.exSeed || 5), o = bgStreet(360, 240);
      o += '<rect x="10" y="40" width="170" height="170" fill="#fff4dc"' + S + '/><path d="M0 46 L95 0 L190 46Z" fill="#e5487a"' + S + '/>';
      o += '<rect x="28" y="70" width="50" height="40" fill="#9fd6ff"' + S + '/><rect x="110" y="120" width="44" height="90" fill="#4a2c1d"' + S + '/>';
      o += '<g' + anim("qv-fadeout", 0.3, 3.4) + '>' + ch(E, { mood: "smug", pose: "hips" }, 132, 210, 0.52) + '</g>';
      o += '<g' + mv(0, 0, 0, 0, 0.2, 0) + '><rect x="110" y="120" width="44" height="90" fill="#b56b3a"' + S + ' class="qv-door" style="transform-origin:110px 165px;animation-delay:3.3s"/></g>';
      o += '<g' + mv(-130, 0, 0, 0, 0.6, 0.2, "cubic-bezier(.2,1.4,.5,1)") + '>' + ch(T.avatar, { mood: "shocked", outfit: outfit(T), hold: "suitcase", pose: "down" }, 262, 212, 0.62) + '</g>';
      o += thrown(SOCK, 52, 90, 220, 205, 1, 0.9) + thrown(SHIRT, 52, 90, 300, 205, 1.1, 1.3) + thrown(SOCK, 52, 90, 330, 205, 0.9, 1.7);
      o += thrown(TOASTER, 52, 90, 222, 200, 1.1, 2.3);
      o += '<g class="qv-pop" style="animation-delay:3.4s;transform-origin:222px 180px"><rect x="214" y="170" width="16" height="14" rx="3" fill="#e0a85c"' + S.replace('3"', '2"') + '/></g>';
      o += bubble(262, 70, "Mais… et moi ?", 1.0) + bubble(110, 26, "Tiens, garde le grille-pain !", 2.2, "#ffd23f");
      return { svg: wrap(o), dur: 5.2, caption: nm(T) + " se retrouve dehors avec une valise. " + esc(ev.data.partner || "L'ex") + " garde la maison. Il reste le grille-pain.", sfx: [[0.2, "whoosh"], [0.8, "boing"], [2.3, "whoosh"], [3.3, "slam"], [3.5, "ding"], [3.9, "sad"]] };
    },
    licenciement: function (ev, st) {
      var T = P(st, ev.to), R = A.random((ev.id || 1) * 31 + 7), o = bgOffice(360, 240);
      o += '<rect x="200" y="150" width="150" height="14" fill="#c98c5a"' + S + '/><rect x="210" y="164" width="10" height="46" fill="#8a5a3b"/><rect x="330" y="164" width="10" height="46" fill="#8a5a3b"/>';
      o += '<rect x="290" y="112" width="40" height="30" rx="3" fill="#2b2140"' + S + '/><rect x="306" y="142" width="8" height="8" fill="' + INK + '"/>';
      o += '<g' + mv(160, 0, 0, 0, 1.0, 0.9, "cubic-bezier(.2,1.3,.4,1)") + '><g class="qv-wiggle" style="animation-delay:2.2s;transform-origin:262px 160px">' + '<rect x="240" y="150" width="44" height="12" rx="4" fill="#2b2140"/><path d="M262 162 V196 M246 200 h32" stroke="' + INK + '" stroke-width="5"/>' + ch(R, { mood: "smug", outfit: "office", pose: "hips" }, 262, 186, 0.5) + '</g></g>';
      o += bubble(262, 30, "Il est où le Wi-Fi ?", 2.4, "#fff");
      o += '<g' + mv(0, 0, -250, 0, 3.0, 0.3, "linear") + '><g class="qv-walk">' + ch(T.avatar, { mood: "sad", outfit: outfit(T) === "unemployed" ? "office" : outfit(T), hold: "box" }, 250, 214, 0.6) + '</g></g>';
      o += txt(90, 228, "Sortie →", 11, "#5a6478");
      return { svg: wrap(o), dur: 4.6, caption: nm(T) + " quitte son bureau avec un carton. Son remplaçant est déjà assis et a renommé le Wi-Fi.", sfx: [[0.2, "sad"], [1.0, "whoosh"], [2.2, "squeak"], [3.2, "squeak"]] };
    },
    badbuzz: function (ev, st) {
      var T = P(st, ev.to), At = P(st, ev.p), o = '<rect width="360" height="240" fill="#2b2140"/>';
      o += '<rect x="112" y="6" width="136" height="228" rx="20" fill="#111"' + S + '/><rect x="120" y="20" width="120" height="196" rx="8" fill="#ffe8f0"/>';
      o += '<g class="qv-dance" style="transform-origin:180px 190px">' + ch(T.avatar, { mood: "happy", outfit: outfit(T), pose: "up", hat: "party" }, 180, 196, 0.6) + '</g>';
      var counts = ["12 vues", "4 300 vues", "1,2 M de vues", "38 M de vues"];
      counts.forEach(function (c, i) { o += '<g' + anim(i === 3 ? "qv-in" : "qv-blink", 1, 0.3 + i * 0.9) + '><rect x="124" y="196" width="112" height="18" rx="9" fill="#e5487a"/>' + txt(180, 209, c, 11, "#fff") + '</g>'; });
      ["MDR", "le malaise", "c'est qui ??", "#Gênance", "ptdr", "RIP"].forEach(function (t, i) {
        o += bubble(i % 2 ? 300 : 58, 36 + i * 30, t, 0.6 + i * 0.45, i % 3 === 0 ? "#ffd23f" : "#fff");
      });
      o += '<g' + mv(90, 0, 0, 0, 0.6, 2.6, "ease-out") + '>' + ch(At.avatar, { mood: "smug", outfit: outfit(At), pose: "phone", hold: "phone" }, 318, 238, 0.42) + '</g>';
      return { svg: wrap(o), dur: 4.8, caption: nm(T) + " devient viral·e : une vidéo de danse filmée par " + nm(At) + ". 38 millions de vues. Personne n'en parle à table.", sfx: [[0.6, "ping"], [1.05, "ping"], [1.5, "ping"], [1.95, "ping"], [2.4, "ping"], [2.85, "ping"], [3.2, "sad"]] };
    },
    promotion: function (ev, st) {
      var T = P(st, ev.p), c1 = A.random((ev.id || 3) * 13), c2 = A.random((ev.id || 3) * 17 + 2), o = bgOffice(360, 240);
      o += '<path d="M190 0 L120 210 H260Z" fill="#fff59a" opacity=".55" class="qv-glow"/>';
      o += '<g' + anim("qv-in", 0.4, 0.2) + '><rect x="150" y="14" width="160" height="34" rx="6" fill="#ffd23f"' + S + '/>' + txt(222, 39, "BRAV", 22) + '</g>';
      o += thrown(txt(0, 8, "O", 22), 268, 30, 300, 205, 1.0, 2.0);
      [[290, c1], [340, c2]].forEach(function (c, i) {
        o += '<g class="qv-clapA" style="animation-delay:' + (i * 0.3) + 's">' + ch(c[1], { mood: "neutral", outfit: "office", pose: "clap" }, c[0], 214, 0.48) + '</g>';
        o += '<g class="qv-clapB" style="animation-delay:' + (i * 0.3) + 's">' + ch(c[1], { mood: "neutral", outfit: "office", pose: "down" }, c[0], 214, 0.48) + '</g>';
      });
      o += '<g' + mv(-200, 0, 0, 0, 1.6, 0.1, "ease-out") + '><g class="qv-strut">' + ch(T.avatar, { mood: "smug", outfit: outfit(T), pose: "hips", shades: true }, 180, 214, 0.66) + '</g></g>';
      o += confetti(4, 150, 220, 1.4, 3.2, 9);
      return { svg: wrap(o), dur: 4.6, caption: nm(T) + " est promu·e " + esc(T.title || "") + ". Les collègues applaudissent. Lentement. Très lentement.", sfx: [[0.2, "fanfare"], [1.6, "clap"], [2.4, "clap"], [3.2, "clap"], [2.6, "boing"]] };
    },
    garde: function (ev, st) {
      var T = P(st, ev.p), E = A.random(ev.data.exSeed || 5), o = bgRoom(360, 240);
      o += '<g transform="translate(250 30)"><rect width="76" height="62" fill="#fff"' + S + '/><rect width="76" height="16" fill="#e5487a"' + S + '/>' + txt(38, 34, "1 semaine", 10) + txt(38, 48, "sur 2", 10) + '</g>';
      o += '<path d="M20 150 Q20 132 40 132 H150 Q170 132 170 150 V210 H20Z" fill="#7a8fb8"' + S + '/>';
      o += ch(T.avatar, { mood: "sad", outfit: outfit(T), hold: "toys" }, 96, 216, 0.56);
      o += '<g transform="translate(176 172)"><circle cx="20" cy="20" r="20" fill="none"' + S + '/><g class="qv-spin" style="animation-duration:.5s;transform-origin:20px 20px"><path d="M20 0 V40 M0 20 H40" stroke="' + INK + '" stroke-width="2"/></g><ellipse cx="20" cy="30" rx="9" ry="6" fill="#e3a35e"' + S.replace('3"', '2"') + '/></g>';
      var kids = (ev.data.kids || []).slice(0, 3);
      var grp = ch(E, { mood: "happy", pose: "wave" }, 250, 214, 0.5);
      kids.forEach(function (k, i) { grp += ch(A.random(k, T.avatar), { kid: true, mood: "happy", pose: "wave" }, 290 + i * 28, 216, 0.34); });
      o += '<g' + mv(0, 0, 220, 0, 2.6, 0.6, "ease-in") + '><g class="qv-walk">' + grp + '</g></g>';
      o += '<g' + mv(-60, 0, 420, 0, 3.0, 2.2, "linear") + '><g class="qv-spin" style="animation-duration:1s"><circle cx="0" cy="200" r="13" fill="none" stroke="#a8743f" stroke-width="3" stroke-dasharray="6 4"/><circle cx="0" cy="200" r="7" fill="none" stroke="#a8743f" stroke-width="2"/></g></g>';
      o += bubble(96, 60, "Bon… on se fait un film, Croquette ?", 3.0);
      return { svg: wrap(o), dur: 5.2, caption: "Garde alternée : les enfants partent chez " + esc(ev.data.partner || "l'autre parent") + ". " + nm(T) + " reste avec les jouets et le hamster.", sfx: [[0.6, "door"], [2.4, "whistle"]] };
    },
    mariage: function (ev, st) {
      var T = P(st, ev.p), Pa = T && T.partner ? A.random(T.partner.seed) : A.random(9), o = bgStreet(360, 240);
      o += '<path d="M110 210 V90 Q180 20 250 90 V210" fill="none" stroke="#fff" stroke-width="12"/><path d="M110 210 V90 Q180 20 250 90 V210" fill="none"' + S + '/>';
      [[110, 120], [130, 66], [180, 46], [230, 66], [250, 120]].forEach(function (f) { o += '<circle cx="' + f[0] + '" cy="' + f[1] + '" r="9" fill="#e5487a"' + S.replace('3"', '2"') + '/>'; });
      o += '<g' + mv(-60, 0, 0, 0, 1, 0.1) + '>' + ch(T.avatar, { mood: "love", outfit: "wedding" }, 152, 214, 0.6) + '</g>';
      o += '<g' + mv(60, 0, 0, 0, 1, 0.1) + '>' + ch(Pa, { mood: "love", outfit: "wedding", hat: "veil" }, 210, 214, 0.6) + '</g>';
      o += confetti(28, 60, 300, 1.2, 2.4, 4) + bubble(180, 24, "Oui !", 1.1, "#ffd23f");
      return { svg: wrap(o), dur: 4.2, caption: "Mariage de " + nm(T) + " et " + esc(T.partner ? T.partner.name : "") + ". Le DJ a passé la Danse des canards trois fois.", sfx: [[0.2, "fanfare"], [1.2, "pop"], [1.5, "pop"]] };
    },
    bebe: function (ev, st) {
      var T = P(st, ev.p), o = bgRoom(360, 240);
      o += ch(T.avatar, { mood: "shocked", outfit: outfit(T), pose: "up" }, 180, 216, 0.62);
      o += '<g' + mv(0, -120, 0, 0, 1.6, 0.2, "ease-out") + '><path d="M180 30 Q150 0 120 30 Q150 20 180 30Z M180 30 Q210 0 240 30 Q210 20 180 30Z" fill="#fff"' + S.replace('3"', '2"') + '/><path d="M126 30 L176 78 M234 30 L184 78" stroke="' + INK + '" stroke-width="1.6"/><ellipse cx="180" cy="86" rx="16" ry="12" fill="#fff4dc"' + S + '/><circle cx="180" cy="80" r="8" fill="' + T.avatar.skin + '"' + S.replace('3"', '2"') + '/></g>';
      o += bubble(80, 60, "Déjà ?!", 1.2) + bubble(286, 90, "Bienvenue " + (ev.data.kid || "bébé") + " !", 1.8, "#ffd23f");
      return { svg: wrap(o), dur: 3.6, caption: "Bienvenue à " + esc(ev.data.kid || "bébé") + " ! Prochaine nuit complète pour " + nm(T) + " : dans trois ans.", sfx: [[0.3, "whoosh"], [1.6, "pop"], [1.8, "ding"]] };
    },
    startupWin: function (ev, st) {
      var T = P(st, ev.p), o = bgOffice(360, 240), b = "";
      for (var i = 0; i < 18; i++) b += '<g' + mv(20 + (i * 53) % 330, -20, 30 + (i * 53) % 330, 250, 1.8, 0.2 + i * 0.1, "ease-in") + '>' + BILL + '</g>';
      o += '<rect x="130" y="190" width="100" height="24" fill="#ffd23f"' + S + '/>' + txt(180, 207, "LICORNE", 12);
      o += ch(T.avatar, { mood: "happy", outfit: "ceo", pose: "up" }, 180, 192, 0.6) + b;
      return { svg: wrap(o), dur: 3.6, caption: "La start-up de " + nm(T) + " lève 40 millions. Personne ne comprend ce qu'elle fait, mais tout le monde applaudit.", sfx: [[0.2, "fanfare"], [0.8, "coin"], [1.2, "coin"], [1.6, "coin"]] };
    },
    startupFail: function (ev, st) {
      var T = P(st, ev.p), o = bgOffice(360, 240), b = "";
      o += ch(T.avatar, { mood: "shocked", outfit: "hoodie", pose: "up" }, 180, 214, 0.6);
      for (var i = 0; i < 6; i++) b += '<g' + mv(130 + (i % 3) * 32, -60, 130 + (i % 3) * 32, 156 - Math.floor(i / 3) * 30, 0.6, 0.4 + i * 0.25, "cubic-bezier(.5,0,1,.6)") + '><rect width="32" height="30" fill="#d9a066"' + S + '/>' + txt(16, 19, "CHAUSS.", 6) + '</g>';
      return { svg: wrap(o + b), dur: 3.8, caption: "Faillite ! " + nm(T) + " repart avec 2 000 paires de chaussettes connectées.", sfx: [[0.4, "thud"], [0.9, "thud"], [1.4, "thud"], [2.2, "sad"]] };
    },
    renvoi: function (ev, st) {
      var Dd = P(st, ev.p), At = P(st, ev.to), o = bgStreet(360, 240);
      o += ch(Dd.avatar, { mood: "smug", outfit: outfit(Dd), pose: "up" }, 80, 214, 0.58);
      o += ch(At.avatar, { mood: "shocked", outfit: outfit(At) }, 290, 214, 0.58);
      o += thrown('<g class="qv-spin"><rect x="-14" y="-20" width="28" height="40" rx="4" fill="#2b2140"' + S + '/><path d="M-6 -6 l12 12 M6 -6 l-12 12" stroke="#ffd23f" stroke-width="3"/></g>', 100, 100, 280, 110, 1.1, 0.4);
      o += bubble(80, 30, "Retour à l'envoyeur !", 0.2, "#ffd23f") + bubble(290, 40, "Aïe.", 1.5);
      return { svg: wrap(o), dur: 3.0, caption: nm(Dd) + " renvoie la carte à " + nm(At) + ".", sfx: [[0.4, "whoosh"], [1.5, "boing"]] };
    },
    block: function (ev, st) {
      var Dd = P(st, ev.p), At = P(st, ev.to), c = D.byKey[ev.k], o = bgStreet(360, 240);
      o += ch(Dd.avatar, { mood: "smug", outfit: outfit(Dd), pose: "hips" }, 110, 214, 0.6);
      o += '<g class="qv-pop" style="transform-origin:190px 120px;animation-delay:.3s"><path d="M160 70 H220 V120 Q220 160 190 176 Q160 160 160 120Z" fill="#3d7dd8"' + S + '/><path d="M178 120 l10 10 l18 -22" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/></g>';
      o += '<g' + mv(0, 0, 30, 0, 0.4, 0.8, "ease-out") + '>' + ch(At.avatar, { mood: "worried", outfit: outfit(At) }, 300, 214, 0.5) + '</g>';
      o += bubble(110, 30, c ? c.name + " !" : "Paré !", 0.3, "#ffd23f");
      return { svg: wrap(o), dur: 2.6, caption: nm(Dd) + " contre avec « " + esc(c ? c.name : "") + " ».", sfx: [[0.3, "shield"]] };
    },
    fisc: function (ev, st) {
      var T = P(st, ev.to), I = A.random((ev.id || 2) * 7 + 1), o = bgOffice(360, 240), c = "";
      o += ch(T.avatar, { mood: "worried", outfit: outfit(T) }, 110, 214, 0.6);
      o += '<g' + mv(120, 0, 0, 0, 0.8, 0.1, "ease-out") + '>' + ch(I, { mood: "smug", outfit: "director", hold: "magnifier" }, 260, 214, 0.6) + '</g>';
      for (var i = 0; i < 6; i++) c += thrown('<circle r="8" fill="#ffd23f"' + S.replace('3"', '2"') + '/>', 120, 130, 252, 150, 0.7, 1.0 + i * 0.22);
      o += c + bubble(260, 30, "Et ces tickets à gratter ?", 0.9);
      return { svg: wrap(o), dur: 3.6, caption: "Contrôle fiscal chez " + nm(T) + ". Le contrôleur repart avec le sourire. Et la fortune.", sfx: [[1.0, "coin"], [1.4, "coin"], [1.8, "coin"], [2.4, "sad"]] };
    },
    degat: function (ev, st) {
      var T = P(st, ev.to), o = bgRoom(360, 240), d = "";
      o += '<path d="M150 0 q10 10 0 20 q-10 10 0 20" stroke="#5aaeff" stroke-width="6" fill="none"/>';
      for (var i = 0; i < 10; i++) d += '<g' + mv(120 + (i * 37) % 120, 10, 120 + (i * 37) % 120, 205, 0.7, i * 0.25, "ease-in") + '><path d="M0 0 q6 10 0 14 q-6 -4 0 -14z" fill="#5aaeff"' + S.replace('3"', '1.6"') + '/></g>';
      o += '<ellipse cx="180" cy="214" rx="20" ry="5" fill="#5aaeff" opacity=".8" class="qv-grow" style="transform-origin:180px 214px"/>';
      o += ch(T.avatar, { mood: "shocked", outfit: outfit(T), pose: "up" }, 180, 214, 0.6) + d;
      o += bubble(290, 50, "Désolé, j'ai oublié mon bain !", 1.2);
      return { svg: wrap(o), dur: 3.6, caption: "Dégât des eaux chez " + nm(T) + ". Le voisin du dessus envoie un gâteau. Mouillé.", sfx: [[0.2, "drip"], [0.8, "drip"], [1.4, "drip"], [2.2, "sad"]] };
    },
    crise: function (ev, st) {
      var o = bgOffice(360, 240);
      o += '<path d="M40 40 L110 70 L150 50 L210 120 L250 100 L320 200" fill="none" stroke="#e5487a" stroke-width="8" stroke-linecap="round" stroke-dasharray="500" class="qv-draw"/>';
      o += row(st, 0.36, "shocked", function (p) { return (ev.data.poor || []).indexOf(p.id) >= 0 ? "happy" : "shocked"; });
      return { svg: wrap(o), dur: 3.4, caption: "Crise économique ! Tout le monde perd 3 fortune. Les plus fauché·es découvrent la sobriété heureuse.", sfx: [[0.2, "sad"], [1.4, "thud"]] };
    },
    karaoke: function (ev, st) {
      var Sg = P(st, ev.data.singer), o = '<rect width="360" height="240" fill="#3b2a6a"/>';
      o += '<path d="M180 0 L120 214 H240Z" fill="#ff7eb6" opacity=".3"/>';
      o += row(st, 0.3, "worried", null, ev.data.singer);
      o += '<g class="qv-dance" style="transform-origin:180px 214px">' + ch(Sg.avatar, { mood: "happy", outfit: outfit(Sg), hold: "mic", pose: "wave" }, 180, 214, 0.58) + '</g>';
      for (var i = 0; i < 6; i++) o += '<g' + mv(200, 100, 200 + (i % 2 ? 80 : -120), -10, 1.6, 0.3 + i * 0.35, "ease-out") + '>' + txt(0, 0, i % 2 ? "♪" : "♫", 26, "#ffd23f") + '</g>';
      return { svg: wrap(o), dur: 3.8, caption: nm(Sg) + " chante « Je te survivrai ». Faux. Très faux. −2 réputation.", sfx: [[0.3, "kazoo"]] };
    },
    greve: function (ev, st) {
      var o = bgStreet(360, 240);
      o += '<g' + mv(-120, 0, 40, 0, 3, 0.1, "linear") + '><g class="qv-walk">' + row(st, 0.34, "angry", null, null, true) + '</g></g>';
      return { svg: wrap(o), dur: 3.6, caption: "Grève générale ! Au prochain tour, personne ne touche de salaire. Les sans-emploi, eux, sont ravis.", sfx: [[0.2, "kazoo"], [1.2, "whistle"]] };
    },
  };
  // ligne de tous les joueurs (événements collectifs)
  function row(st, s, mood, moodFn, skip, signs) {
    var ids = (st.order || []).filter(function (id) { return id !== skip; }), o = "", n = ids.length;
    ids.forEach(function (id, i) {
      var p = st.players[id], x = 40 + (n === 1 ? 140 : i * (280 / Math.max(1, n - 1)));
      if (signs) o += '<g transform="translate(' + (x - 16) + ' 96)"><rect width="34" height="22" fill="#fff"' + S.replace('3"', '2"') + '/>' + txt(17, 15, "NON", 9, "#e5487a") + '<path d="M17 22 V52" stroke="' + INK + '" stroke-width="3"/></g>';
      o += ch(p.avatar, { mood: moodFn ? moodFn(p) : mood, outfit: outfit(p), pose: signs ? "up" : (mood === "worried" ? "up" : "down") }, x, 214, s);
    });
    return o;
  }

  function scene(ev, state) {
    if (!ev || !ev.scene || !SCENES[ev.scene]) return null;
    try { return SCENES[ev.scene](ev, state); } catch (e) { if (root.console) console.warn("scène", ev.scene, e); return null; }
  }

  root.QV_WORLD = { outfit: outfit, tile: tile, scene: scene, ch: ch, SCENES: SCENES };
})(window);
