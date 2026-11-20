/* =========================================================================
   QUELLE VIE ! — scènes animées supplémentaires (extension 2)
   - variantes de répliques pour les grandes scènes (et versions 18+ plus mordantes)
   - scènes des 24 nouvelles cartes et des 15 cartes du mode Trash & Adulte
   Tout passe par le petit kit de mise en scène exposé par qv-world.js.
   Rien d'explicite : c'est suggéré, absurde, et ça s'arrête à la porte.
   ========================================================================= */
(function (root) {
  "use strict";
  var W = root.QV_WORLD, K = W.kit, A = root.QV_AVATAR, IC = root.QV_ICONS, INK = A.INK, S = K.S;
  var ch = K.ch, mv = K.mv, anim = K.anim, bubble = K.bubble, txt = K.txt, esc = K.esc, nm = K.nm, P = K.P, outfit = K.outfit;

  // ---------- kit ----------
  function pickV(list, ev) { return list[(ev.id || 0) % list.length]; }
  function adult(st) { return st && st.mode === "adult"; }
  // réplique : variantes classiques et, en mode 18+, variantes plus mordantes
  function say(st, ev, classic, adultList, tokens) {
    var list = adult(st) && adultList && adultList.length ? adultList : classic;
    var t = pickV(list, ev);
    Object.keys(tokens || {}).forEach(function (k) { t = t.split("{" + k + "}").join(tokens[k]); });
    return t;
  }
  function ico(k, x, y, size, delay, cls) {
    size = size || 48;
    return '<g class="' + (cls || "qv-pop") + '" style="animation-delay:' + (delay || 0) + 's;transform-origin:' + (x + size / 2) + 'px ' + (y + size / 2) + 'px"><svg x="' + x + '" y="' + y + '" width="' + size + '" height="' + size + '" viewBox="0 0 48 48">' + IC.inner(k) + '</svg></g>';
  }
  function enter(inner, from, delay, dur) { return '<g' + mv(from, 0, 0, 0, dur || 0.7, delay || 0, "cubic-bezier(.2,1.2,.4,1)") + '>' + inner + '</g>'; }
  function drop(inner, delay) { return '<g' + mv(0, -220, 0, 0, 0.6, delay || 0, "cubic-bezier(.5,0,1,.6)") + '>' + inner + '</g>'; }
  function rain(kind, n, delay, x0, x1) {
    var o = "", inner = kind === "bill" ? K.BILL : kind === "heart" ? '<path class="qv-spin" d="M0 6 l-7 -7 a4 4 0 0 1 7 -4 a4 4 0 0 1 7 4z" fill="#e5487a" stroke="' + INK + '" stroke-width="1.6"/>' : kind === "card" ? '<rect class="qv-spin" x="-7" y="-10" width="14" height="20" rx="2" fill="' + ["#ff3b3b", "#5aa9ff", "#38b58a", "#ffd23f"][0] + '" stroke="' + INK + '" stroke-width="1.6"/>' : '<circle class="qv-spin" r="7" fill="#ffd23f" stroke="' + INK + '" stroke-width="1.6"/>';
    x0 = x0 || 20; x1 = x1 || 340;
    for (var i = 0; i < n; i++) {
      var x = x0 + ((i * 53) % (x1 - x0));
      if (kind === "card") inner = '<rect class="qv-spin" x="-7" y="-10" width="14" height="20" rx="2" fill="' + ["#ff3b3b", "#5aa9ff", "#38b58a", "#ffd23f"][i % 4] + '" stroke="' + INK + '" stroke-width="1.6"/>';
      o += '<g' + mv(x, -20, x + 12, 250, 1.9, delay + i * 0.11, "ease-in") + '>' + inner + '</g>';
    }
    return o;
  }
  function stamp(text, x, y, delay, color) {
    return '<g class="qv-stamp" style="animation-delay:' + delay + 's;transform-origin:' + x + 'px ' + y + 'px"><rect x="' + (x - 70) + '" y="' + (y - 22) + '" width="140" height="44" rx="8" fill="none" stroke="' + (color || "#e5487a") + '" stroke-width="5"/>' + txt(x, y + 10, text, 28, color || "#e5487a") + '</g>';
  }
  function mk(o, dur, caption, sfx) { return { svg: K.wrap(o), dur: dur, caption: caption, sfx: sfx || [] }; }
  function RA(seed) { return A.random(seed); }
  function older(seed) { var a = A.random(seed); a.hairColor = "#b9b4ae"; return a; }
  function partnerOf(p, fallback) { return p && p.partner ? A.random(p.partner.seed) : A.random(fallback || 9); }

  // ---------- décors supplémentaires ----------
  var BG = {
    street: function () { return K.bgStreet(360, 240); },
    office: function () { return K.bgOffice(360, 240); },
    room: function () { return K.bgRoom(360, 240); },
    chapel: function () {
      var o = '<rect width="360" height="240" fill="#fde9f1"/><rect y="210" width="360" height="30" fill="#e7c9a8"/><path d="M60 0 v210 M300 0 v210" stroke="#f6cfe0" stroke-width="30"/>';
      o += '<path d="M110 210 V90 Q180 20 250 90 V210" fill="none" stroke="#fff" stroke-width="12"/><path d="M110 210 V90 Q180 20 250 90 V210" fill="none"' + S + '/>';
      [[110, 120], [130, 66], [180, 46], [230, 66], [250, 120]].forEach(function (f) { o += '<circle cx="' + f[0] + '" cy="' + f[1] + '" r="9" fill="#e5487a"' + S.replace('3"', '2"') + '/>'; });
      return o;
    },
    court: function () {
      var o = '<rect width="360" height="240" fill="#e8d9c4"/><rect y="210" width="360" height="30" fill="#9a6a44"/>';
      o += '<rect x="110" y="96" width="140" height="70" fill="#8a5a3b"' + S + '/><rect x="150" y="20" width="60" height="60" rx="30" fill="#fff4dc"' + S + '/>' + txt(180, 58, "⚖", 26);
      return o;
    },
    studio: function () {
      var o = '<rect width="360" height="240" fill="#1f1640"/><rect y="200" width="360" height="40" fill="#3b2a6a"/>';
      o += '<path d="M40 0 L0 200 H90Z M320 0 L270 200 H360Z" fill="#fff59a" opacity=".18"/>';
      o += '<g class="qv-flash"><rect x="12" y="12" width="78" height="22" rx="6" fill="#e5487a"/>' + txt(51, 28, "EN DIRECT", 12, "#fff") + '</g>';
      return o;
    },
    club: function () {
      var o = '<rect width="360" height="240" fill="#2a1450"/><rect y="206" width="360" height="34" fill="#4a2a80"/>';
      o += '<circle cx="180" cy="34" r="20" fill="#c9ced8"' + S + '/><g class="qv-spin" style="animation-duration:3s"><path d="M168 30 h24 M172 40 h16 M176 22 h8" stroke="#fff" stroke-width="3"/></g>';
      for (var i = 0; i < 6; i++) o += '<circle cx="' + (30 + i * 60) + '" cy="' + (80 + (i % 2) * 40) + '" r="4" fill="' + ["#ff7eb6", "#5aa9ff", "#ffd23f"][i % 3] + '" class="qv-flash" style="animation-delay:' + (i * 0.2) + 's"/>';
      return o;
    },
    restaurant: function () {
      var o = '<rect width="360" height="240" fill="#7a2a3a"/><rect y="206" width="360" height="34" fill="#4a1a24"/>';
      for (var x = 20; x < 360; x += 60) o += '<circle cx="' + x + '" cy="30" r="6" fill="#ffd23f" opacity=".8"/>';
      o += '<rect x="120" y="150" width="120" height="12" fill="#fff"' + S + '/><path d="M180 162 V206" stroke="' + INK + '" stroke-width="6"/><rect x="176" y="128" width="8" height="22" fill="#fff4dc"' + S.replace('3"', '2"') + '/><path d="M180 116 q5 6 0 12 q-5 -6 0 -12z" fill="#ff9a3a"/>';
      return o;
    },
    beach: function () {
      return '<rect width="360" height="240" fill="#ffd7a8"/><circle cx="280" cy="70" r="34" fill="#ffd23f"/><rect y="150" width="360" height="40" fill="#5aa9ff"/><rect y="186" width="360" height="54" fill="#f2d48a"/><path d="M0 156 q30 -8 60 0 t60 0 t60 0 t60 0 t60 0 t60 0" fill="none" stroke="#fff" stroke-width="3"/>';
    },
    night: function () {
      var o = '<rect width="360" height="240" fill="#1b2140"/><circle cx="300" cy="40" r="18" fill="#fff4dc"/><rect y="206" width="360" height="34" fill="#2b2140"/>';
      o += '<rect x="20" y="40" width="150" height="166" fill="#3b4a7a"' + S + '/><rect x="50" y="70" width="60" height="50" fill="#ffd23f"' + S + '/>';
      return o;
    },
    shop: function () {
      var o = '<rect width="360" height="240" fill="#eef7ff"/><rect y="206" width="360" height="34" fill="#c9d3e3"/>';
      for (var x = 10; x < 360; x += 70) o += '<rect x="' + x + '" y="40" width="56" height="120" fill="#fff"' + S + '/><path d="M' + x + ' 80 h56 M' + x + ' 120 h56" stroke="' + INK + '" stroke-width="2"/>';
      o += txt(180, 28, "SURGELÉS", 14, "#3d7dd8");
      return o;
    },
  };

  // ---------- variantes des grandes scènes ----------
  var CAPS = {
    divorce: {
      c: ["{T} se retrouve dehors avec une valise. {X} garde la maison. Il reste le grille-pain.",
          "{X} a changé les serrures, le Wi-Fi et le nom du chat. {T} repart avec le grille-pain.",
          "Divorce express pour {T} : 12 ans de vie commune, une valise, et un grille-pain qui fait des étincelles."],
      a: ["{X} garde la maison, le chien et le prof de pilates. {T} garde le grille-pain. Et ses illusions.",
          "{T} apprend le divorce par un post Instagram de {X} : « Nouveau départ #libre #enfin ».",
          "Les affaires de {T} volent par la fenêtre. Les voisins filment. Le grille-pain atterrit en dernier."] },
    licenciement: {
      c: ["{T} quitte son bureau avec un carton. Son remplaçant a déjà renommé le Wi-Fi.",
          "Licenciement de {T} « dans le cadre d'une réorganisation agile ». Son badge ne marche déjà plus.",
          "{T} est remplacé·e par un stagiaire de 19 ans et une plante verte. La plante a été promue."],
      a: ["{T} est viré·e par visio, pendant qu'on entend le DRH commander des sushis.",
          "Son remplaçant s'assied dans le fauteuil encore chaud de {T}. Il a déjà vu ses mails perso.",
          "{T} sort avec son carton. Le pot de départ, c'était juste une bouteille d'eau tiède."] },
    badbuzz: {
      c: ["{T} devient viral·e : une vidéo de danse filmée par {A}. 38 millions de vues.",
          "{T} découvre sa tête en mème sur tous les réseaux. Légende : « Quand le lundi arrive ».",
          "{A} a posté la vidéo. {T} danse la macarena à un enterrement. Le pays entier a vu."],
      a: ["{T} est en tendance n° 1 : #LeMalaise. Même sa mère a partagé, avec un emoji qui pleure.",
          "La vidéo de {T} en caleçon léopard tourne sur tous les groupes WhatsApp du pays.",
          "{A} a filmé {T} qui pleure devant un kebab à 4 h du matin. 2 millions de partages."] },
    promotion: {
      c: ["{T} est promu·e. Les collègues applaudissent. Lentement. Très lentement.",
          "Promotion pour {T} ! Nouveau titre, même salaire de base, mais une plante en plus sur le bureau.",
          "{T} arrive en lunettes de soleil. Personne ne l'a prévenu·e que c'était une promotion « symbolique »."],
      a: ["{T} est promu·e et devient officiellement « le boss que tout le monde déteste en réunion ».",
          "Promotion de {T}. Dans les toilettes, les collègues refont le classement des pires managers.",
          "{T} est promu·e : premier réflexe, interdire les pauses café. Ambiance."] },
    garde: {
      c: ["Garde alternée : les enfants partent chez {X}. {T} reste avec les jouets et le hamster.",
          "Une semaine sur deux, {T} parle au hamster. Le hamster ne répond pas, mais il écoute.",
          "Les enfants partent avec {X}. {T} mange des céréales devant la télé, seul·e, à 15 h."],
      a: ["Une semaine sur deux, {T} redevient célibataire. Et se rappelle pourquoi c'était nul.",
          "{X} part avec les enfants et le chargeur de téléphone. {T} garde le hamster et la culpabilité.",
          "Garde alternée : {T} a maintenant deux brosses à dents et zéro vie sociale."] },
  };
  Object.keys(CAPS).forEach(function (k) {
    var base = W.SCENES[k];
    W.SCENES[k] = function (ev, st) {
      var r = base(ev, st); if (!r) return r;
      var T = P(st, ev.to || ev.p), At = P(st, ev.p);
      r.caption = say(st, ev, CAPS[k].c, CAPS[k].a, { T: nm(T), A: nm(At), X: esc((ev.data && ev.data.partner) || "l'ex") });
      return r;
    };
  });

  // ---------- nouvelles scènes ----------
  var N = {
    demasque: function (ev, st) {
      var T = P(st, ev.p), o = BG.office();
      o += ch(RA(ev.id * 3 + 1), { mood: "shocked", outfit: "office", pose: "up" }, 300, 214, 0.48);
      o += ch(T.avatar, { mood: "shocked", outfit: "office", liar: 1 }, 150, 214, 0.62);
      o += '<rect x="40" y="40" width="80" height="100" fill="#fff"' + S + '/>' + txt(80, 64, "CV", 16) + '<path d="M54 80 h52 M54 94 h40 M54 108 h46" stroke="' + INK + '" stroke-width="3"/>';
      o += stamp("FAUX", 80, 110, 1.0);
      o += bubble(300, 40, say(st, ev, ["La NASA ?!", "Trois doctorats ?", "Tu parles japonais ?"], ["Ah, « Directeur de la Galaxie » ?"]), 0.6);
      return mk(o, 3.6, say(st, ev, ["{T} est démasqué·e : le CV mentionnait un stage à la NASA et un Nobel de chimie.", "Le CV de {T} citait « bilingue klingon ». Les RH ont vérifié. Fin de l'aventure."], ["{T} est démasqué·e : même la photo du CV était celle de quelqu'un d'autre."], { T: nm(T) }), [[1.0, "slam"], [1.4, "sad"]]);
    },
    mystique: function (ev, st) {
      var T = P(st, ev.p), o = '<rect width="360" height="240" fill="#3b2a6a"/><rect y="206" width="360" height="34" fill="#2a1450"/>';
      for (var i = 0; i < 8; i++) o += '<path d="M' + (30 + i * 44) + ' ' + (30 + (i % 3) * 30) + ' l3 6 6 1 -5 4 1 6 -5 -3 -5 3 1 -6 -5 -4 6 -1z" fill="#ffd23f" class="qv-flash" style="animation-delay:' + i * 0.15 + 's"/>';
      o += ch(T.avatar, { mood: "smug", outfit: "mystic", pose: "up" }, 180, 214, 0.64);
      o += ico("crystal", 150, 140, 60, 0.8);
      o += bubble(290, 60, say(st, ev, ["Je vois… des pâtes.", "Ton aura est beige.", "Mercure est rétrograde."], ["Je vois un ex. Plusieurs, même."]), 1.2);
      return mk(o, 3.6, say(st, ev, ["{T} plaque tout et devient chaman·e. Premier client : le facteur, pour une histoire de colis.", "Reconversion de {T} : lecture de l'avenir dans les coquillettes, 30 € la séance."], ["{T} devient chaman·e. Spécialité : prédire qui va tromper qui au prochain mariage."], { T: nm(T) }), [[0.2, "ding"], [1.2, "whistle"]]);
    },
    retraite: function (ev, st) {
      var T = P(st, ev.p), o = BG.beach();
      o += enter(ch(T.avatar, { mood: "happy", outfit: "retired", hold: "glass", pose: "wave" }, 170, 214, 0.64), -200, 0.1, 1.2);
      o += ico("hammock", 250, 120, 80, 1.2);
      o += bubble(170, 40, say(st, ev, ["Plus jamais de réunion !", "Le lundi, c'est fini.", "J'apprends le ukulélé !"], ["Au revoir, open space de l'enfer !"]), 1.4, "#ffd23f");
      return mk(o, 3.6, say(st, ev, ["Retraite anticipée pour {T} : hamac, chemise à fleurs et sieste de 14 h à 18 h.", "{T} part à la retraite. Le pot de départ était plus long que sa carrière."], ["{T} part en retraite anticipée et envoie un mail « Répondre à tous » à toute la boîte. Avec des photos de plage."], { T: nm(T) }), [[0.3, "whoosh"], [1.4, "fanfare"]]);
    },
    mariageSponso: function (ev, st) {
      var T = P(st, ev.p), o = BG.chapel();
      o += '<g' + mv(-360, 0, 360, 0, 3.5, 0.3, "linear") + '><rect x="0" y="12" width="150" height="24" rx="4" fill="#ff6b4a"' + S.replace('3"', '2"') + '/>' + txt(75, 29, "SODA PÉTILLANT ®", 12, "#fff") + '</g>';
      o += ch(T.avatar, { mood: "love", outfit: "wedding" }, 152, 214, 0.6) + ch(partnerOf(T), { mood: "love", outfit: "wedding", hat: "veil" }, 210, 214, 0.6);
      o += ico("ringlogo", 158, 70, 44, 0.8) + bubble(80, 70, "Ce mariage vous est offert par…", 1.2);
      return mk(o, 4, say(st, ev, ["Mariage sponsorisé pour {T} : les vœux sont entrecoupés de pubs de 30 secondes.", "{T} dit « oui » devant une bannière géante de lessive. Le gâteau avait un QR code."], ["Mariage sponsorisé : {T} a dû embrasser son·sa partenaire en tenant une canette bien en vue. Deux fois."], { T: nm(T) }), [[0.2, "fanfare"], [1.2, "ping"]]);
    },
    mariageRaison: function (ev, st) {
      var T = P(st, ev.p), o = BG.chapel();
      o += ch(T.avatar, { mood: "worried", outfit: "wedding" }, 150, 214, 0.6) + ch(partnerOf(T), { mood: "smug", outfit: "ceo", pose: "hips" }, 214, 214, 0.6);
      o += rain("bill", 14, 1.0) + bubble(150, 40, say(st, ev, ["Oui… je crois.", "C'est quoi ton prénom déjà ?"], ["Le contrat prénuptial fait 300 pages ?"]), 0.8);
      return mk(o, 3.8, say(st, ev, ["{T} épouse {P} pour son yacht. Ils se vouvoient et font chambre à part.", "Mariage de raison : {T} et {P} ont signé chez le notaire avant de se dire bonjour."], ["{T} épouse {P}, 82 ans, « par amour ». Les enfants de {P} ont déjà appelé un avocat."], { T: nm(T), P: esc(T.partner ? T.partner.name : "") }), [[0.2, "fanfare"], [1.0, "coin"], [1.5, "coin"]]);
    },
    ex: function (ev, st) {
      var T = P(st, ev.to), o = BG.room();
      o += ch(T.avatar, { mood: "worried", outfit: outfit(T) }, 140, 214, 0.6) + ch(partnerOf(T), { mood: "neutral" }, 200, 214, 0.56);
      o += '<rect x="270" y="40" width="70" height="80" fill="#9fd6ff"' + S + '/>';
      o += '<g' + mv(0, 80, 0, 0, 0.6, 0.6, "ease-out") + '>' + ch(RA(ev.id * 7 + 3), { mood: "smug", pose: "phone", hold: "phone" }, 305, 168, 0.4) + '</g>';
      ["J'aime ta photo ;)", "Tu te souviens de nous ?", "Je passais par là !"].forEach(function (t, i) { o += bubble(i === 1 ? 110 : 250, 30 + i * 24, t, 1.0 + i * 0.5); });
      return mk(o, 4, say(st, ev, ["L'ex de {T} commente toutes ses photos depuis 2014. Ce soir, il·elle est à la fenêtre.", "« Je passais dans le quartier » : l'ex de {T}, pour la quatrième fois cette semaine."], ["L'ex de {T} envoie « tu dors ? » à 3 h du matin. Sur le téléphone du couple."], { T: nm(T) }), [[0.6, "whoosh"], [1.0, "ping"], [1.5, "ping"], [2.0, "ping"]]);
    },
    heritageWin: function (ev, st) {
      var T = P(st, ev.p), o = BG.office();
      o += ch(RA(ev.id * 5), { mood: "neutral", outfit: "director" }, 280, 214, 0.5);
      o += ch(T.avatar, { mood: "happy", outfit: outfit(T), pose: "up" }, 150, 214, 0.62);
      o += ico("envelope", 230, 80, 50, 0.4) + rain("bill", 14, 1.2);
      return mk(o, 3.6, say(st, ev, ["Un grand-oncle inconnu lègue 6 de fortune à {T}. Et une collection de 400 dés à coudre.", "Héritage surprise : {T} ne savait même pas qu'il·elle avait un oncle en Suisse."], ["L'oncle d'Amérique de {T} lui lègue sa fortune… et une lettre très détaillée sur ses trois maîtresses."], { T: nm(T) }), [[0.4, "pop"], [1.2, "coin"], [1.6, "coin"]]);
    },
    heritageFail: function (ev, st) {
      var T = P(st, ev.p), o = BG.office();
      o += ch(RA(ev.id * 5), { mood: "worried", outfit: "director" }, 280, 214, 0.5);
      o += ch(T.avatar, { mood: "shocked", outfit: outfit(T) }, 150, 214, 0.62);
      o += ico("envelope", 230, 80, 50, 0.4) + stamp("DETTES", 150, 70, 1.2);
      return mk(o, 3.4, say(st, ev, ["L'héritage de {T} : les dettes d'un grand-oncle et un perroquet qui insulte les gens.", "{T} hérite… de la facture du grand-oncle. Le notaire s'excuse à peine."], ["{T} hérite des dettes de jeu de tonton Gérard. Et de son ardoise au bar PMU."], { T: nm(T) }), [[1.2, "slam"], [1.6, "sad"]]);
    },
    chien: function (ev, st) {
      var T = P(st, ev.p), o = BG.street();
      o += ch(T.avatar, { mood: "happy", outfit: outfit(T), pose: "up" }, 150, 214, 0.62);
      o += enter(ico("dog", 210, 140, 70), 200, 0.3, 1.0) + bubble(250, 70, "Ouaf. (en latin)", 1.4);
      return mk(o, 3.4, say(st, ev, ["{T} adopte Lord Biscotte, un chien qui a hérité d'un château. Il touche une rente.", "Lord Biscotte, chien millionnaire, emménage chez {T}. Il a son propre majordome."], ["Lord Biscotte gagne plus que {T}. Il le lui fait sentir à chaque repas."], { T: nm(T) }), [[0.3, "boing"], [1.2, "ding"]]);
    },
    bebeInflu: function (ev, st) {
      var T = P(st, ev.p), kid = T.kids && T.kids[0] ? A.random(T.kids[0].seed, T.avatar) : RA(3), o = BG.studio();
      o += '<circle cx="190" cy="150" r="54" fill="none" stroke="#ffd23f" stroke-width="8" class="qv-glow"/>';
      o += ch(kid, { kid: true, mood: "happy", pose: "phone", hold: "phone" }, 190, 210, 0.5);
      o += ch(T.avatar, { mood: "worried", outfit: outfit(T) }, 70, 214, 0.55) + rain("heart", 12, 0.6, 140, 330);
      o += bubble(280, 40, "1 M d'abonnés !", 1.0, "#ffd23f");
      return mk(o, 3.6, say(st, ev, ["Le bébé de {T} signe avec une marque de compotes. Il a déjà un agent.", "Le bébé de {T} a plus d'abonnés que toute la famille réunie. Il ne dit que « areuh »."], ["Le bébé de {T} gagne plus que ses parents et exige un dressing. À 18 mois."], { T: nm(T) }), [[0.6, "ping"], [1.0, "ping"], [1.4, "ping"]]);
    },
    cousin: function (ev, st) {
      var T = P(st, ev.to), At = P(st, ev.p), o = BG.room(), C = RA(ev.id * 11 + 5);
      o += ch(T.avatar, { mood: "shocked", outfit: outfit(T) }, 120, 214, 0.6);
      o += '<g' + mv(260, 0, 0, 0, 1, 0.1) + '><g' + mv(0, 0, 300, 0, 1, 2.2, "ease-in") + '>' + ch(C, { mood: "smug", pose: "wave" }, 220, 214, 0.58) + ico("grab", 230, 100, 36, 1.4) + '</g></g>';
      o += bubble(220, 40, "Je passais dire bonjour !", 0.6);
      return mk(o, 3.6, say(st, ev, ["Le cousin Jordan « passe dire bonjour » chez {T}. Il repart avec une carte… et le micro-ondes.", "Le cousin de {T} reste 10 minutes, mange tout le frigo et file avec une carte. Envoyé par {A}."], ["Le cousin Jordan repart de chez {T} avec une carte, le micro-ondes et le numéro de sa sœur."], { T: nm(T), A: nm(At) }), [[0.2, "door"], [1.4, "whoosh"], [2.2, "whoosh"]]);
    },
    squat: function (ev, st) {
      var T = P(st, ev.to), o = BG.room();
      o += ch(T.avatar, { mood: "worried", outfit: outfit(T) }, 260, 214, 0.6);
      o += enter(ch(RA(4242), { mood: "happy", outfit: "pajama", pose: "wave" }, 110, 214, 0.58) + ico("mattress", 40, 160, 60, 0), -220, 0.2, 1.1);
      o += bubble(110, 40, "Juste deux semaines !", 1.2) + bubble(260, 70, "…", 2.0);
      return mk(o, 3.8, say(st, ev, ["Un « ami » s'installe chez {T} « pour deux semaines ». C'était il y a 4 mois.", "Le squatteur de {T} a mis son nom sur la boîte aux lettres. Et sur les yaourts."], ["Le squatteur de {T} ramène quelqu'un différent chaque soir. Sur le canapé. Celui des invités."], { T: nm(T) }), [[0.2, "whoosh"], [1.2, "boing"]]);
    },
    voisin: function (ev, st) {
      var T = P(st, ev.to), o = BG.street();
      o += '<rect x="20" y="30" width="140" height="180" fill="#e8a87c"' + S + '/><rect x="70" y="150" width="40" height="60" fill="#3d7dd8"' + S + '/>';
      o += ch(T.avatar, { mood: "shocked", outfit: outfit(T) }, 90, 214, 0.55);
      o += enter(ch(RA(ev.id * 13 + 2), { mood: "angry", outfit: "director", pose: "phone" }, 260, 214, 0.58), 200, 0.2);
      o += ico("letter", 180, 110, 44, 1.0) + bubble(260, 40, say(st, ev, ["Vous marchez trop fort.", "Votre plante fait de l'ombre.", "Votre chat me juge."], ["J'ai entendu des choses, la nuit."]), 0.9);
      return mk(o, 3.6, say(st, ev, ["Le voisin de {T} porte plainte pour « bruit de pas ». {T} marche désormais en chaussettes.", "Lettre recommandée pour {T} : son paillasson dépasse de 2 cm."], ["Le voisin porte plainte pour « bruits nocturnes suspects ». {T} jure que c'était le lave-linge."], { T: nm(T) }), [[0.2, "door"], [1.0, "slam"]]);
    },
    maman: function (ev, st) {
      var T = P(st, ev.to), o = BG.room();
      o += '<rect x="22" y="26" width="58" height="44" fill="#fff"' + S + '/>' + txt(51, 52, "MAMAN", 10);
      o += '<path d="M150 150 Q150 132 170 132 H300 Q320 132 320 150 V200 H150Z" fill="#e07a3a"' + S + '/>';
      o += ch(older(ev.id * 17 + 1), { mood: "happy", pose: "up" }, 280, 214, 0.56);
      o += enter(ch(T.avatar, { mood: "sad", outfit: outfit(T), hold: "box" }, 120, 214, 0.6), -200, 0.2, 1.4);
      o += bubble(280, 40, say(st, ev, ["Ta chambre n'a pas bougé !", "J'ai gardé tes posters !", "Ce soir : gratin !"], ["Et pas de copine après 22 h !"]), 1.4, "#ffd23f");
      return mk(o, 3.8, say(st, ev, ["Retour chez maman pour {T}. Les posters de 2009 sont toujours là, et le couvre-lit Pokémon aussi.", "{T} retourne chez sa mère. Elle a déjà prévenu toute la famille et la boulangère."], ["Retour chez maman : {T} a de nouveau un couvre-feu. À 34 ans."], { T: nm(T) }), [[0.2, "sad"], [1.4, "ding"]]);
    },
    lotoWin: function (ev, st) {
      var T = P(st, ev.p), o = BG.studio();
      o += ico("balls", 230, 60, 80, 0.2, "qv-wiggle");
      o += '<g class="qv-dance" style="transform-origin:140px 210px">' + ch(T.avatar, { mood: "happy", outfit: outfit(T), pose: "up" }, 140, 214, 0.62) + '</g>' + rain("bill", 18, 0.8);
      o += bubble(140, 30, "JACKPOT !", 0.6, "#ffd23f");
      return mk(o, 3.8, say(st, ev, ["{T} gagne le loto du dimanche ! Avec les dates d'anniversaire du chat.", "Jackpot pour {T}. Toute la famille l'a appelé·e en 3 minutes, même l'oncle fâché."], ["{T} gagne au loto. Trois ex l'ont recontacté·e avant la fin du tirage."], { T: nm(T) }), [[0.2, "fanfare"], [0.8, "coin"], [1.1, "coin"], [1.4, "coin"]]);
    },
    investWin: function (ev, st) {
      var T = P(st, ev.p), o = BG.office();
      o += '<path d="M40 200 L110 160 L150 170 L220 90 L320 30" fill="none" stroke="#38b58a" stroke-width="8" stroke-linecap="round" stroke-dasharray="500" class="qv-draw"/>';
      o += ch(T.avatar, { mood: "happy", outfit: outfit(T), pose: "up", shades: true }, 150, 214, 0.6) + rain("bill", 14, 1.4);
      return mk(o, 3.6, say(st, ev, ["Le ChaussetteCoin de {T} décolle de 3 000 %. Personne ne sait pourquoi.", "L'investissement absurde de {T} rapporte gros. Il·elle donne des conseils à tout le monde maintenant."], ["{T} devient riche avec le ChaussetteCoin et s'achète un sweat « Je suis mon propre patron ». Insupportable."], { T: nm(T) }), [[0.3, "fanfare"], [1.4, "coin"], [1.8, "coin"]]);
    },
    investFail: function (ev, st) {
      var T = P(st, ev.p), o = BG.office();
      o += '<path d="M40 40 L110 70 L150 50 L210 120 L250 100 L320 200" fill="none" stroke="#e5487a" stroke-width="8" stroke-linecap="round" stroke-dasharray="500" class="qv-draw"/>';
      o += ch(T.avatar, { mood: "shocked", outfit: outfit(T), pose: "up" }, 150, 214, 0.6) + ico("crash", 260, 120, 60, 1.6);
      return mk(o, 3.4, say(st, ev, ["Le ChaussetteCoin de {T} s'effondre. Il reste un tee-shirt « To the moon » taille XXL.", "{T} a tout misé sur une crypto inventée par un ado de 14 ans. L'ado, lui, va bien."], ["{T} perd tout dans une crypto lancée par un influenceur en slip de bain. Prévisible."], { T: nm(T) }), [[0.4, "sad"], [1.6, "thud"]]);
    },
    star: function (ev, st) {
      var T = P(st, ev.p), o = BG.studio();
      o += '<path d="M180 0 L120 210 H240Z" fill="#fff59a" opacity=".5" class="qv-glow"/>';
      o += ch(T.avatar, { mood: "smug", outfit: outfit(T), pose: "wave", shades: true }, 180, 214, 0.64);
      for (var i = 0; i < 5; i++) o += '<g class="qv-flash" style="animation-delay:' + i * 0.25 + 's"><circle cx="' + (40 + i * 70) + '" cy="' + (60 + (i % 2) * 50) + '" r="14" fill="#fff"/></g>';
      return mk(o, 3.4, say(st, ev, ["{T} passe au JT pour avoir sauvé un chat d'un arbre. C'était une peluche.", "{T} est la star du jour : son gâteau ressemble au président. Demain, tout le monde aura oublié."], ["{T} devient célèbre en finale d'un concours de… mieux vaut ne pas savoir. Demain, oublié·e."], { T: nm(T) }), [[0.2, "fanfare"], [0.6, "ping"], [1.0, "ping"]]);
    },
    nouvelleVie: function (ev, st) {
      var T = P(st, ev.p), o = BG.beach();
      o += ico("sunrise", 250, 40, 70, 0.3);
      o += enter(ch(T.avatar, { mood: "happy", outfit: outfit(T), hold: "suitcase" }, 150, 214, 0.62), -220, 0.3, 1.4);
      o += bubble(150, 40, "Nouveau départ !", 1.6, "#ffd23f");
      return mk(o, 3.6, say(st, ev, ["{T} plaque tout et recommence à la mer, avec un chapeau de paille et zéro notification.", "Nouvelle vie pour {T} : nouvelle ville, nouvelle coupe, nouveau compte Instagram."], ["{T} recommence tout à zéro. Il·elle a bloqué 47 numéros avant de partir."], { T: nm(T) }), [[0.3, "whoosh"], [1.6, "fanfare"]]);
    },
    gourou: function (ev, st) {
      var T = P(st, ev.to), At = P(st, ev.p), o = BG.club(), G = RA(ev.id * 19 + 4), c = "";
      o += ico("pyramid", 150, 30, 70, 0.1);
      o += ch(G, { mood: "smug", outfit: "ceo", pose: "up", shades: true }, 190, 200, 0.6);
      o += ch(T.avatar, { mood: "worried", outfit: outfit(T) }, 60, 220, 0.5);
      for (var i = 0; i < 4; i++) c += K.thrown('<circle r="7" fill="#ffd23f"' + S.replace('3"', '2"') + '/>', 70, 120, 190, 120, 0.7, 1.0 + i * 0.25);
      o += c + bubble(280, 50, "Pense riche !", 0.7, "#ffd23f");
      return mk(o, 3.8, say(st, ev, ["{A} inscrit {T} au séminaire « Millionnaire en 3 jours ». {T} repart avec un mug et moins d'argent.", "{T} assiste à un séminaire où l'on crie « Je suis une licorne ! » pendant 6 heures. Merci {A}."], ["Le gourou de {T} vend un programme « Séduction et richesse ». {T} repart ni l'un ni l'autre. Merci {A}."], { T: nm(T), A: nm(At) }), [[0.2, "kazoo"], [1.0, "coin"], [1.3, "coin"]]);
    },
    proces: function (ev, st) {
      var Tg = P(st, ev.to), At = P(st, ev.p), win = ev.data && ev.data.winner, o = BG.court();
      o += ch(RA(ev.id * 23 + 9), { mood: "neutral", outfit: "director" }, 180, 110, 0.38);
      o += ico("gavel", 230, 60, 44, 0.6, "qv-wiggle");
      o += ch(At.avatar, { mood: win === At.id ? "happy" : "sad", outfit: outfit(At), pose: win === At.id ? "up" : "down" }, 70, 214, 0.55);
      o += ch(Tg.avatar, { mood: win === Tg.id ? "happy" : "sad", outfit: outfit(Tg), pose: win === Tg.id ? "up" : "down" }, 290, 214, 0.55);
      o += bubble(180, 30, "Affaire classée !", 1.2, "#ffd23f");
      var w = P(st, win) || Tg, l = w === Tg ? At : Tg;
      return mk(o, 3.8, say(st, ev, ["Procès du siècle : {W} gagne. {L} paie, et le juge s'est endormi deux fois.", "Verdict : {W} l'emporte. {L} fait appel, puis se souvient que ça coûte cher."], ["Procès du siècle : {W} gagne en montrant des captures d'écran très gênantes de {L}."], { W: nm(w), L: nm(l) }), [[0.6, "slam"], [0.9, "slam"], [1.4, "fanfare"]]);
    },
    reunion: function (ev, st) {
      var T = P(st, ev.to), o = BG.office();
      o += '<rect x="110" y="150" width="160" height="12" fill="#c98c5a"' + S + '/>';
      o += ch(T.avatar, { mood: "sad", outfit: outfit(T) }, 140, 214, 0.56) + ch(RA(ev.id * 29), { mood: "happy", outfit: "manager", pose: "up" }, 250, 214, 0.56);
      o += '<g class="qv-spin" style="animation-duration:.6s"><svg x="160" y="20" width="56" height="56" viewBox="0 0 48 48">' + IC.inner("clock") + '</svg></g>';
      ["Synergie", "On boucle ?", "Next step", "Quick win"].forEach(function (t, i) { o += bubble(280, 40 + i * 26, t, 0.5 + i * 0.5); });
      return mk(o, 3.8, say(st, ev, ["Réunion de 4 heures pour {T} sur « la synergie des synergies ». Elle aurait pu être un mail.", "{T} assiste à une réunion pour préparer la réunion de demain. Pas de salaire ce tour-ci."], ["{T} se fait coincer dans une réunion où le chef parle de son divorce pendant 3 heures."], { T: nm(T) }), [[0.4, "tick"], [1.4, "tick"], [2.4, "sad"]]);
    },
    karma: function (ev, st) {
      var T = P(st, ev.p), vs = (ev.data && ev.data.victims) || [], o = '<rect width="360" height="240" fill="#2b2140"/><rect y="206" width="360" height="34" fill="#3b2a6a"/>';
      o += ch(T.avatar, { mood: "smug", outfit: outfit(T), pose: "up" }, 60, 214, 0.5);
      vs.slice(0, 3).forEach(function (id, i) {
        var q = P(st, id), x = 180 + i * 70;
        o += '<g class="qv-shake2" style="animation-delay:1s">' + ch(q.avatar, { mood: "shocked", outfit: outfit(q) }, x, 214, 0.5) + '</g>';
        o += '<g' + mv(0, -200, 0, 0, 0.3, 0.8 + i * 0.2, "ease-in") + '><path d="M' + (x + 10) + ' 0 L' + (x - 10) + ' 60 H' + (x + 4) + ' L' + (x - 12) + ' 110" fill="none" stroke="#ffd23f" stroke-width="8" stroke-linejoin="round"/></g>';
      });
      return mk(o, 3.4, say(st, ev, ["Le karma express frappe {V}. Livraison en moins de 24 heures, comme promis.", "Le karma s'abat sur {V}. Il y a une justice, finalement."], ["Le karma frappe {V}. Tout le monde fait semblant d'être triste. Personne ne l'est."], { V: vs.map(function (id) { return nm(P(st, id)); }).join(" et ") || "personne" }), [[0.8, "slam"], [1.0, "boing"]]);
    },
    panne: function (ev, st) {
      var o = BG.room();
      o += K.row(st, 0.34, "worried");
      o += '<rect width="360" height="240" fill="#000" style="animation:qv-darken 2.6s ease-in 0.4s both"/>';
      o += ico("plug", 160, 20, 44, 0.2);
      o += '<g style="animation:qv-in .4s ease-out 1.6s both">' + txt(180, 130, "…on se parle, du coup ?", 18, "#ffd23f") + '</g>';
      return mk(o, 3.6, say(st, ev, ["Panne générale ! Plus d'internet. Les gens découvrent qu'ils ont des voisins.", "Black-out total : tout le monde ressort les jeux de société. Personne ne connaît les règles."], ["Panne générale : sans Wi-Fi, trois couples découvrent qu'ils n'ont plus rien à se dire."]), [[0.4, "thud"], [1.6, "ding"]]);
    },
    // ---------------- mode Trash & Adulte ----------------
    paterniteNon: function (ev, st) {
      var T = P(st, ev.to), At = P(st, ev.p), o = BG.studio();
      o += ch(T.avatar, { mood: "shocked", outfit: outfit(T), pose: "up" }, 110, 214, 0.58) + ch(At.avatar, { mood: "smug", outfit: outfit(At), pose: "hips" }, 300, 214, 0.5);
      o += ico("envelope", 180, 60, 50, 0.3) + stamp("NON !", 200, 150, 1.4);
      o += bubble(110, 40, "OOOOOH !", 1.6, "#ffd23f") + bubble(260, 70, "Le public est en délire", 2.0);
      return mk(o, 4, say(st, ev, ["Test de paternité en direct : ce n'est pas le tien, {T}. Le public hurle, la présentatrice pleure de joie.", "{A} a envoyé {T} sur le plateau. Résultat : NON. Le bébé, lui, s'en fiche, il mange un biscuit."], [], { T: nm(T), A: nm(At) }), [[0.3, "drum"], [1.4, "slam"], [1.6, "crowd"]]);
    },
    paterniteOui: function (ev, st) {
      var T = P(st, ev.to), At = P(st, ev.p), o = BG.studio();
      o += ch(T.avatar, { mood: "happy", outfit: outfit(T), pose: "up" }, 110, 214, 0.58) + ch(At.avatar, { mood: "shocked", outfit: outfit(At) }, 300, 214, 0.5);
      o += ico("envelope", 180, 60, 50, 0.3) + stamp("OUI !", 200, 150, 1.4, "#38b58a");
      return mk(o, 3.8, "Test de paternité : c'est bien le tien, " + nm(T) + ". " + nm(At) + " repart sous les huées du public.", [[0.3, "drum"], [1.4, "fanfare"], [1.8, "crowd"]]);
    },
    after: function (ev, st) {
      var T = P(st, ev.p), o = '<rect width="360" height="240" fill="#dff1f5"/><rect y="206" width="360" height="34" fill="#b9d6de"/>';
      for (var x = 0; x < 360; x += 30) o += '<path d="M' + x + ' 0 v200" stroke="#c4e2ea" stroke-width="2"/>';
      o += '<path d="M90 150 H280 Q280 206 240 206 H130 Q90 206 90 150Z" fill="#fff"' + S + '/>';
      o += ch(T.avatar, { mood: "shocked", outfit: outfit(T) }, 185, 196, 0.5);
      o += ico("cone", 160, 40, 50, 0.6) + bubble(290, 60, "Qui est Kevin ?!", 1.4) + bubble(80, 90, "Il est 15 h ?", 2.0);
      return mk(o, 3.8, say(st, ev, ["{T} se réveille dans une baignoire d'hôtel avec un cône de chantier. Et un tatouage « Kevin ».", "L'after de {T} : un cône, un flamant rose gonflable et aucun souvenir après 2 h."], [], { T: nm(T) }), [[0.3, "boing"], [1.4, "sad"]]);
    },
    planColoc: function (ev, st) {
      var T = P(st, ev.p), o = BG.room();
      o += ch(T.avatar, { mood: "worried", outfit: outfit(T) }, 90, 214, 0.58);
      o += enter(ch(partnerOf(T), { mood: "happy", hold: "suitcase" }, 200, 214, 0.56), 200, 0.2);
      o += ico("toothbrush", 250, 60, 40, 1.0) + bubble(260, 30, "J'ai ramené mon chat !", 1.6) + bubble(200, 120, "Et ma mère !", 2.4, "#ffd23f");
      return mk(o, 4, say(st, ev, ["Le plan d'un soir de {T} a apporté sa brosse à dents. Puis son chat. Puis sa mère. Ça fait 8 mois."], [], { T: nm(T) }), [[0.2, "door"], [1.6, "ping"], [2.4, "boing"]]);
    },
    vegas: function (ev, st) {
      var T = P(st, ev.p), o = '<rect width="360" height="240" fill="#2a1450"/><rect y="206" width="360" height="34" fill="#4a2a80"/>';
      o += '<g class="qv-flash"><rect x="110" y="10" width="140" height="34" rx="8" fill="none" stroke="#ff7eb6" stroke-width="4"/>' + txt(180, 34, "VIVA VEGAS", 18, "#ff7eb6") + '</g>';
      var elvis = RA(1956); elvis.hair = "side"; elvis.hairColor = "#1b1414";
      o += ch(elvis, { mood: "smug", outfit: "wedding", pose: "up", shades: true }, 180, 190, 0.48);
      o += ch(T.avatar, { mood: "love", outfit: "wedding" }, 110, 214, 0.58) + ch(partnerOf(T), { mood: "love", outfit: outfit(T) === "wedding" ? "casual" : "wedding" }, 260, 214, 0.58);
      o += K.confetti(20, 60, 300, 1.4, 2.2, 7) + bubble(180, 64, "Thank you very much !", 1.0);
      return mk(o, 4, say(st, ev, ["{T} se marie à Las Vegas à 4 h du matin, devant un sosie d'Elvis. Avec {P}. Enfin, il·elle croit."], [], { T: nm(T), P: esc(T.partner ? T.partner.name : "un·e inconnu·e") }), [[0.2, "kazoo"], [1.4, "pop"], [1.6, "pop"]]);
    },
    groupe: function (ev, st) {
      var T = P(st, ev.to), o = '<rect width="360" height="240" fill="#2b2140"/>';
      o += '<rect x="112" y="6" width="136" height="228" rx="20" fill="#111"' + S + '/><rect x="120" y="20" width="120" height="196" rx="8" fill="#e8f7ef"/>';
      o += '<rect x="120" y="20" width="120" height="26" fill="#38b58a"/>' + txt(180, 38, "Famille ♥ (34)", 11, "#fff");
      o += '<g class="qv-pop" style="animation-delay:.3s;transform-origin:200px 70px"><rect x="150" y="58" width="84" height="40" rx="8" fill="#c8f5c8"/><rect x="158" y="66" width="68" height="8" fill="#2b2140"/><rect x="158" y="80" width="50" height="8" fill="#2b2140"/></g>';
      ["Tante Odile a vu", "Papi : ???", "Maman écrit…", "Le patron a réagi"].forEach(function (t, i) { o += '<g class="qv-pop" style="animation-delay:' + (1 + i * 0.5) + 's;transform-origin:150px ' + (118 + i * 24) + 'px"><rect x="126" y="' + (106 + i * 24) + '" width="100" height="20" rx="6" fill="#fff"/>' + txt(176, 120 + i * 24, t, 9) + '</g>'; });
      o += '<g' + mv(-90, 0, 0, 0, 0.5, 2.6, "ease-out") + '>' + ch(T.avatar, { mood: "shocked", outfit: outfit(T), pose: "up" }, 60, 238, 0.42) + '</g>';
      return mk(o, 4.2, say(st, ev, ["{T} envoie un message très privé sur le groupe « Famille ». Tante Odile a répondu par un pouce."], [], { T: nm(T) }), [[0.3, "ping"], [1.0, "ping"], [1.5, "ping"], [2.0, "ping"], [2.6, "alarm"]]);
    },
    doubleVieBust: function (ev, st) {
      var T = P(st, ev.p), o = BG.shop();
      o += ch(A.random(ev.data && ev.data.exSeed || 5), { mood: "angry", pose: "hips" }, 60, 214, 0.55) + ch(RA(ev.id * 31 + 2), { mood: "angry", pose: "hips" }, 300, 214, 0.55);
      o += '<g class="qv-shake2">' + ch(T.avatar, { mood: "shocked", outfit: outfit(T), disguise: true }, 180, 214, 0.6) + '</g>';
      o += bubble(60, 50, "Chéri·e ?!", 0.5) + bubble(300, 80, "Chéri·e ?!", 0.9) + bubble(180, 30, "C'est… mon jumeau !", 1.6, "#ffd23f");
      return mk(o, 4, "La double vie de " + nm(T) + " éclate au rayon surgelés : ses deux familles font les courses à la même heure.", [[0.5, "alarm"], [1.6, "boing"], [2.4, "sad"]]);
    },
    sextape: function (ev, st) {
      var T = P(st, ev.to), o = '<rect width="360" height="240" fill="#1f1640"/>';
      o += '<rect x="70" y="20" width="220" height="140" rx="10" fill="#d9c7f0"' + S + '/><circle cx="160" cy="90" r="34" fill="#e3a35e" opacity=".6"/><circle cx="196" cy="96" r="22" fill="#e3a35e" opacity=".5"/>';
      o += '<g class="qv-pop" style="animation-delay:.5s;transform-origin:180px 90px"><rect x="90" y="74" width="180" height="32" fill="' + INK + '"/>' + txt(180, 96, "CENSURÉ", 18, "#ffd23f") + '</g>';
      o += bubble(180, 182, "Experts : « c'est un coude »", 1.2) + ch(T.avatar, { mood: "shocked", outfit: outfit(T), pose: "up" }, 320, 238, 0.4);
      return mk(o, 3.8, say(st, ev, ["Une vidéo « compromettante » de {T} fuite. Filmée si mal qu'Internet débat : coude ou genou ?", "La sextape de {T} est floue, en 240p et filmée avec le doigt sur l'objectif. Les fans sont déçus."], [], { T: nm(T) }), [[0.5, "slam"], [1.2, "crowd"]]);
    },
    sugar: function (ev, st) {
      var T = P(st, ev.p), o = BG.street();
      o += '<g transform="translate(220 150)"><path d="M6 36 V24 Q8 14 22 12 L40 2 H76 L96 14 Q118 16 120 28 V36Z" fill="#ffd23f"' + S + '/><circle cx="30" cy="38" r="9" fill="#2b2140"/><circle cx="96" cy="38" r="9" fill="#2b2140"/></g>' + txt(280, 146, "LOCATION", 10, "#e5487a");
      o += ch(T.avatar, { mood: "love", outfit: outfit(T) }, 90, 214, 0.56) + ch(partnerOf(T), { mood: "worried", outfit: "ceo", shades: true }, 170, 214, 0.58);
      for (var i = 0; i < 3; i++) o += '<g' + mv(170, 140, 170 + (i - 1) * 60, 20, 1.6, 1.2 + i * 0.3, "ease-out") + '>' + '<svg x="-14" y="-14" width="28" height="28" viewBox="0 0 48 48">' + IC.inner("moth") + '</svg></g>';
      o += bubble(170, 60, "Tu peux m'avancer l'essence ?", 1.6);
      return mk(o, 3.8, say(st, ev, ["{T} sort avec {P}, « millionnaire ». La Rolex déteint, la décapotable est louée, et c'est {T} qui paie."], [], { T: nm(T), P: esc(T.partner ? T.partner.name : "") }), [[0.4, "ding"], [1.4, "whoosh"], [2.2, "sad"]]);
    },
    date: function (ev, st) {
      var T = P(st, ev.to), o = BG.restaurant();
      o += ch(T.avatar, { mood: "love", outfit: outfit(T) }, 130, 214, 0.52) + ch(partnerOf(T, ev.id), { mood: "happy" }, 230, 214, 0.52);
      var fam = '';
      for (var i = 0; i < 3; i++) fam += ch(i === 0 ? older(ev.id + 5) : RA(ev.id * 37 + i), { mood: "happy", pose: "up" }, 250 + i * 40, 214, 0.48);
      o += '<g' + mv(260, 0, 40, 0, 0.8, 1.2, "cubic-bezier(.2,1.3,.4,1)") + '>' + fam + '</g>';
      o += bubble(300, 40, "SURPRISE !", 1.6, "#ffd23f") + bubble(130, 70, "…ta mère ?", 2.2);
      return mk(o, 4, say(st, ev, ["Premier rendez-vous de {T}. Au dessert, toute la belle-famille débarque « par hasard ». Mamie a apporté l'album photo."], [], { T: nm(T) }), [[1.2, "door"], [1.6, "crowd"], [2.2, "sad"]]);
    },
    secret: function (ev, st) {
      var T = P(st, ev.p), o = BG.night();
      o += '<g class="qv-flash">' + ch(RA(ev.id * 41 + 1), { mood: "happy", pose: "up", hat: "party" }, 80, 124, 0.3) + '</g>';
      o += ch(T.avatar, { mood: "shocked", outfit: outfit(T) }, 260, 214, 0.58) + ico("keyhole", 190, 100, 40, 0.4);
      o += bubble(260, 40, "Je n'ai rien vu…", 1.2) + rain("bill", 8, 1.8, 200, 340);
      return mk(o, 3.8, say(st, ev, ["{T} a vu le voisin, très discret, organiser des soirées à thème « pirates ». Le voisin paie pour qu'on n'en parle pas."], [], { T: nm(T) }), [[0.4, "ping"], [1.8, "coin"], [2.2, "coin"]]);
    },
    fauxCelib: function (ev, st) {
      var T = P(st, ev.to), o = BG.room(), ex = A.random(ev.data && ev.data.exSeed || 5);
      o += ch(T.avatar, { mood: "shocked", outfit: outfit(T) }, 80, 214, 0.58) + ch(ex, { mood: "worried" }, 170, 214, 0.56);
      o += '<g' + mv(200, 0, 0, 0, 0.8, 1.2) + '>' + ch(RA(ev.id * 43), { mood: "angry", pose: "hips" }, 260, 214, 0.55) + ch(RA(ev.id * 47 + 2), { kid: true, mood: "happy", pose: "wave" }, 320, 214, 0.36) + '</g>';
      o += bubble(260, 40, "C'est qui, elle/lui ?", 1.8) + bubble(170, 80, "Je peux expliquer…", 2.4);
      return mk(o, 4, say(st, ev, ["{T} découvre que {X} avait déjà une famille. Et deux chiens. Et un abonnement de salle de sport commun."], [], { T: nm(T), X: esc((ev.data && ev.data.partner) || "son ex") }), [[1.2, "door"], [1.8, "alarm"], [2.6, "sad"]]);
    },
    divorcePremium: function (ev, st) {
      var T = P(st, ev.p), o = BG.office();
      o += ico("shark", 240, 100, 70, 0.3) + ch(T.avatar, { mood: "smug", outfit: outfit(T), pose: "up", shades: true }, 140, 214, 0.6);
      o += ico("goldtoaster", 110, 30, 56, 1.0, "qv-wiggle") + rain("bill", 14, 1.4);
      return mk(o, 3.8, say(st, ev, ["Divorce premium pour {T} : l'avocat à dents d'or récupère la maison de vacances, le jet-ski et le grille-pain doré."], [], { T: nm(T) }), [[0.3, "slam"], [1.0, "ding"], [1.4, "coin"]]);
    },
    libertine: function (ev, st) {
      var T = P(st, ev.p), o = BG.club();
      o += ch(T.avatar, { mood: "worried", outfit: outfit(T) }, 90, 214, 0.52) + ch(partnerOf(T), { mood: "worried" }, 150, 214, 0.5);
      o += ch(RA(ev.id * 53), { mood: "happy", pose: "up" }, 230, 214, 0.5) + ch(RA(ev.id * 59 + 1), { mood: "happy", pose: "up" }, 290, 214, 0.5);
      o += ico("venetian", 150, 40, 60, 0.3) + rain("card", 14, 1.6) + bubble(260, 50, "UNO !", 2.0, "#ffd23f");
      return mk(o, 4, say(st, ev, ["Soirée libertine ratée pour {T} : masques, bougies… et finalement un tournoi de Uno jusqu'à 5 h du matin."], [], { T: nm(T) }), [[0.3, "kazoo"], [1.6, "pop"], [2.0, "fanfare"]]);
    },
    retourEx: function (ev, st) {
      var T = P(st, ev.to), o = BG.chapel();
      o += ch(T.avatar, { mood: "shocked", outfit: "wedding" }, 150, 214, 0.58) + ch(partnerOf(T), { mood: "shocked", outfit: "wedding", hat: "veil" }, 210, 214, 0.58);
      o += '<g' + mv(200, 0, 0, 0, 0.5, 1.0, "cubic-bezier(.2,1.4,.4,1)") + '>' + ch(RA(ev.id * 61 + 3), { mood: "angry", pose: "up" }, 300, 214, 0.56) + '</g>';
      o += bubble(290, 40, "OBJECTION !", 1.2, "#ffd23f") + bubble(110, 80, "Ce n'est pas un tribunal…", 2.2);
      return mk(o, 4, say(st, ev, ["L'ex de {T} débarque en pleine cérémonie en criant « Objection ! ». Les invités sortent le pop-corn."], [], { T: nm(T) }), [[1.0, "door"], [1.2, "alarm"], [1.6, "crowd"]]);
    },
    karmaInf: function (ev, st) {
      var vs = (ev.data && ev.data.victims) || [], o = '<rect width="360" height="240" fill="#2b2140"/><rect y="206" width="360" height="34" fill="#3b2a6a"/>';
      o += K.row(st, 0.34, "happy", function (p) { return vs.indexOf(p.id) >= 0 ? "shocked" : "happy"; });
      vs.forEach(function (id) {
        var i = st.order.indexOf(id), n = st.order.length, x = 40 + (n === 1 ? 140 : i * (280 / Math.max(1, n - 1)));
        o += '<g' + mv(0, -200, 0, 0, 0.3, 0.8, "ease-in") + '><path d="M' + (x + 10) + ' 0 L' + (x - 10) + ' 60 H' + (x + 4) + ' L' + (x - 12) + ' 120" fill="none" stroke="#ffd23f" stroke-width="8" stroke-linejoin="round"/></g>';
      });
      return mk(o, 3.6, vs.length ? "Le karma infidèle foudroie " + vs.map(function (id) { return nm(P(st, id)); }).join(", ") + ". Les autres font semblant d'être surpris." : "Le karma infidèle ne trouve personne à punir. Suspect.", [[0.8, "slam"], [1.0, "crowd"]]);
    },
  };
  Object.keys(N).forEach(function (k) { W.SCENES[k] = N[k]; });
})(window);
