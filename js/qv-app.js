/* =========================================================================
   QUELLE VIE ! — application (écrans, salon, synchro, interface de jeu)
   Architecture :
     qv-data.js   contenu (cartes, objectifs, événements)
     qv-engine.js règles, exécutées UNIQUEMENT chez l'hôte (il fait autorité)
     qv-net.js    transport (Supabase Realtime ou BroadcastChannel)
     qv-avatar.js / qv-world.js / qv-icons.js  rendu, décors et scènes
     qv-audio.js  sons
   L'hôte reçoit des intentions ({t:"play",…}), les valide avec le moteur et
   renvoie l'état public à tout le monde, plus la main de chaque joueur.
   ========================================================================= */
(function () {
  "use strict";
  var D = window.QV_DATA, E = window.QV_ENGINE, A = window.QV_AVATAR, W = window.QV_WORLD, IC = window.QV_ICONS, SND = window.QV_AUDIO, NET = window.QV_NET;
  var CFG = window.QV_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function uid() { return Math.random().toString(36).slice(2, 10); }

  // ---------------- profil ----------------
  var me = store("qv-profile") || {};
  if (!me.id) me.id = uid();
  // test local (?net=local) : plusieurs onglets du même navigateur = plusieurs joueurs
  if (NET.isLocal()) { try { var tid = sessionStorage.getItem("qv-tab-id") || uid(); sessionStorage.setItem("qv-tab-id", tid); me.id = tid; } catch (e) {} }
  if (!me.avatar) me.avatar = A.random(Math.floor(Math.random() * 1e9));
  me.avatar = A.sanitize(me.avatar);
  if (!me.name) me.name = "";
  var profileId = (store("qv-profile") || {}).id || me.id;
  function saveMe() { store("qv-profile", { id: NET.isLocal() ? profileId : me.id, name: me.name, avatar: me.avatar, made: !!me.made }); }
  saveMe();

  var app = $("#app");
  var room = null;          // { code, host, hostId, net, local, solo, roster:[], lobby:[] }
  var G = null;             // état complet (hôte seulement)
  var pub = null;           // état public reçu
  var priv = null;          // ma main + mes objectifs
  var lastEv = 0, clockSkew = 0, screen = "home";
  var queue = [], playing = null, queueEmptyAt = 0;
  var sel = null;           // carte sélectionnée (u)

  // ======================================================================
  //  ÉCRANS
  // ======================================================================
  function show(name, html) {
    screen = name;
    app.className = "qv-app scr-" + name;
    app.innerHTML = html;
    window.scrollTo(0, 0);
  }

  function logo(small) {
    return '<h1 class="qv-logo' + (small ? " sm" : "") + '"><span>Quelle</span> <span>vie</span><b>!</b></h1>';
  }

  // ---------------- accueil ----------------
  function home(msg) {
    leaveRoom();
    if (!me.made) return creator({ first: true });
    var last = store("qv-last"), hashCode = (location.hash.match(/^#([A-Z0-9]{4})$/i) || [])[1];
    var demo1 = A.random(41), demo2 = A.random(977);
    show("home",
      '<div class="qv-home">' +
      '<div class="qv-hero">' +
        '<div class="qv-hero-cast"><div class="c c1">' + A.standalone(demo1, { mood: "smug", outfit: "ceo", pose: "hips" }) + '</div>' +
        '<div class="c c0">' + A.standalone(me.avatar, { mood: "happy", pose: "wave" }) + '</div>' +
        '<div class="c c2">' + A.standalone(demo2, { mood: "shocked", outfit: "unemployed", hold: "box" }) + '</div></div>' +
        logo() + '<p class="qv-tag">Construis ta vie. Sabote celle de tes amis.</p>' +
      '</div>' +
      (msg ? '<p class="qv-msg">' + esc(msg) + '</p>' : '') +
      '<label class="qv-field"><span>Ton prénom</span><input id="nm" maxlength="16" autocomplete="nickname" placeholder="Ex. : Jean-Mich" value="' + esc(me.name) + '"></label>' +
      '<div class="qv-actions">' +
        '<button class="qv-btn big" data-act="create">Créer un salon entre amis</button>' +
        '<div class="qv-join"><input id="code" maxlength="4" placeholder="CODE" autocapitalize="characters" value="' + esc(hashCode || "") + '"><button class="qv-btn alt" data-act="join">Rejoindre</button></div>' +
        (last && last.code ? '<button class="qv-btn ghost" data-act="resume">Reprendre la partie ' + esc(last.code) + '</button>' : '') +
        '<button class="qv-btn ghost" data-act="solo">Partie d\'essai contre des bots</button>' +
        '<div class="qv-row2"><button class="qv-btn ghost" data-act="avatar">Mon personnage</button><button class="qv-btn ghost" data-act="rules">Règles</button></div>' +
      '</div>' +
      (NET.available() ? '' : '<p class="qv-note">Le jeu en ligne n\'est pas joignable pour l\'instant (réseau). La partie contre des bots reste disponible.</p>') +
      '<p class="qv-foot"><a href="jeux.html">← Tous les jeux du site</a></p>' +
      '</div>');
    var nm = $("#nm");
    nm.addEventListener("input", function () { me.name = nm.value.trim().slice(0, 16); saveMe(); });
    $("#code").addEventListener("input", function (e) { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); });
    app.onclick = function (e) {
      var b = e.target.closest("[data-act]"); if (!b) return;
      SND.unlock(); SND.play("tap");
      var act = b.dataset.act;
      if (act === "avatar") return creator();
      if (act === "rules") return rules();
      if (!needName()) return;
      if (act === "create") createRoom(false);
      else if (act === "solo") createRoom(true);
      else if (act === "join") { var c = $("#code").value.trim().toUpperCase(); if (c.length !== 4) { toast("Le code fait 4 caractères"); return; } joinRoom(c); }
      else if (act === "resume") { if (last.host) createRoom(false, last.code); else joinRoom(last.code); }
    };
    if (hashCode && me.name && !msg) setTimeout(function () { joinRoom(hashCode.toUpperCase()); }, 50);
  }
  function needName() {
    var nm = $("#nm");
    if (nm) me.name = nm.value.trim().slice(0, 16);
    if (!me.name) { toast("Écris ton prénom d'abord"); if (nm) nm.focus(); return false; }
    saveMe(); return true;
  }

  // ---------------- règles ----------------
  function rules() {
    show("rules", '<div class="qv-page">' + logo(true) + '<h2>Comment on joue</h2>' +
      '<div class="qv-rules">' +
      '<div class="r"><b>1</b><p>Chacun commence à 20 ans sur le canapé de ses parents. Une partie dure de 7 à 12 tours de table (5 ans de vie par tour), environ 20 minutes.</p></div>' +
      '<div class="r"><b>2</b><p>À ton tour, tu touches ton salaire, tu pioches, puis tu <em>joues une carte</em> ou tu <em>souffles un coup</em> (tu défausses une carte : +1 bonheur).</p></div>' +
      '<div class="r"><b>3</b><p>Trois ressources : ' + IC.get("b", "qv-ri") + ' bonheur, ' + IC.get("f", "qv-ri") + ' fortune, ' + IC.get("r", "qv-ri") + ' réputation. Ton score final est leur somme, plus tes 2 objectifs secrets et les trophées (le plus heureux, le plus riche, le plus célèbre : +4 chacun).</p></div>' +
      '<div class="r"><b>4</b><p>Les cartes noires sabotent les autres. Quand on t\'attaque, tu choisis : <em>contrer</em> avec une carte de réaction, <em>limiter les dégâts</em> en payant, ou <em>encaisser</em> (tu pioches 1 carte, tu gagnes un petit bonus et tu joueras 2 cartes au prochain tour : de quoi rebondir).</p></div>' +
      '<div class="r"><b>5</b><p>Tous les 2 tours de table, un événement de saison frappe tout le monde. Les cartes jaunes touchent aussi toute la table.</p></div>' +
      '<div class="r"><b>6</b><p>Familles de cartes : carrière, amour, famille, logement, loisirs, sabotages, réactions et événements. ' + D.CARDS.length + ' cartes différentes.</p></div>' +
      '</div><button class="qv-btn big" data-back>Retour</button></div>');
    app.onclick = function (e) { if (e.target.closest("[data-back]")) { if (pub && room) renderGame(); else home(); } };
  }

  // ======================================================================
  //  ÉDITEUR D'AVATAR (+ photo privée, + service de génération optionnel)
  // ======================================================================
  var photo = null; // dataURL, uniquement en mémoire (ou sur l'appareil si demandé)
  try { photo = localStorage.getItem("qv-photo") || null; } catch (e) {}
  var edTab = "face", edMood = "happy", edOutfit = "casual", pickMode = null, camStream = null;

  // ---------- création du personnage : la photo d'abord ----------
  var photoFull = null; // version plus grande, pour l'analyse (mémoire seulement)
  function creator(opt) {
    opt = opt || {};
    var step = "choose", consent = !!store("qv-consent"), result = null, failMsg = "";
    function stopCam() { if (camStream) { camStream.getTracks().forEach(function (t) { t.stop(); }); camStream = null; } }
    function draw() {
      var o = '<div class="qv-page qv-creator">' + logo(true);
      if (step === "choose") {
        o += '<h2>' + (opt.first ? "D'abord, toi !" : "Mon personnage") + '</h2>' +
          '<p class="cr-lead">Prends-toi en photo (ou importe une photo de ton visage) : le jeu crée ton personnage cartoon à partir de tes traits. Tu pourras le retoucher ensuite.</p>' +
          '<div class="cr-demo"><div class="cr-face"><svg class="cr-ico" viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="14" width="38" height="26" rx="6" fill="#fff" stroke="#2b2140" stroke-width="3"/><path d="M16 14 l4 -6 h8 l4 6" fill="#fff" stroke="#2b2140" stroke-width="3" stroke-linejoin="round"/><circle cx="24" cy="27" r="8" fill="#9fd6ff" stroke="#2b2140" stroke-width="3"/></svg></div><span>→</span><div class="cr-av">' + A.standalone(me.avatar, { mood: "happy", pose: "wave" }) + '</div></div>' +
          '<label class="ed-consent"><input type="checkbox" id="consent"' + (consent ? " checked" : "") + '> J\'accepte que ma photo serve à créer mon avatar. L\'analyse se fait sur cet appareil : la photo n\'est envoyée à personne, ni aux autres joueurs, ni au site.</label>' +
          '<button class="qv-btn big" data-c="cam">Me prendre en photo</button>' +
          '<label class="qv-btn big alt">Importer une photo<input type="file" accept="image/*" id="file" hidden></label>' +
          '<div class="qv-row2">' + (opt.first ? '<button class="qv-btn ghost sm" data-c="manual">Créer à la main</button>' : '<button class="qv-btn ghost sm" data-c="edit">Retoucher mon personnage</button>') +
          (opt.first ? '<button class="qv-btn ghost sm" data-c="skip">Plus tard</button>' : '<button class="qv-btn ghost sm" data-c="back">Retour</button>') + '</div>';
      } else if (step === "cam") {
        o += '<h2>Souris !</h2><div class="cr-cam"><video id="vid" playsinline autoplay muted></video><div class="cr-guide"></div></div>' +
          '<p class="ed-hint">Visage de face, bien éclairé, cheveux visibles.</p>' +
          '<button class="qv-btn big" data-c="snap">Prendre la photo</button><button class="qv-btn ghost" data-c="choose">Annuler</button>';
      } else if (step === "busy") {
        o += '<h2>Création de ton personnage…</h2><div class="cr-pair"><img class="cr-photo scanning" src="' + photo + '" alt="Ta photo"><div class="cr-spin"></div></div>' +
          '<p class="qv-wait" id="busy">Analyse de ton visage…</p><p class="ed-hint">Tout se passe sur ton appareil.</p>';
      } else if (step === "result") {
        o += '<h2>Voilà ton personnage !</h2>' +
          '<div class="cr-pair"><img class="cr-photo" src="' + photo + '" alt="Ta photo"><span class="cr-arrow">→</span><div class="cr-av big">' + A.standalone(result.avatar, { mood: "neutral", pose: "wave" }) + '</div></div>' +
          '<div class="qv-chips cr-traits">' + result.traits.map(function (t) { return '<span class="st">' + esc(t) + '</span>'; }).join("") + '</div>' +
          '<label class="qv-field"><span>Ton prénom</span><input id="nm" maxlength="16" autocomplete="nickname" placeholder="Ex. : Jean-Mich" value="' + esc(me.name) + '"></label>' +
          '<button class="qv-btn big" data-c="ok">C\'est moi !</button>' +
          '<div class="qv-row2"><button class="qv-btn ghost sm" data-c="tweak">Retoucher</button><button class="qv-btn ghost sm" data-c="again">Autre photo</button></div>';
      } else if (step === "fail") {
        o += '<h2>Oups</h2>' + (photo ? '<div class="cr-pair"><img class="cr-photo" src="' + photo + '" alt="Ta photo"></div>' : '') + '<p class="qv-msg">' + esc(failMsg) + '</p>' +
          '<button class="qv-btn big" data-c="choose">Réessayer avec une autre photo</button><button class="qv-btn ghost" data-c="manual">Créer à la main</button>';
      }
      show("creator", o + '</div>');
      var f = $("#file");
      if (f) f.addEventListener("change", function () {
        if (!checkConsent()) { f.value = ""; return; }
        var file = f.files && f.files[0]; if (!file) return;
        var rd = new FileReader();
        rd.onload = function () { usePhoto(rd.result); };
        rd.readAsDataURL(file);
      });
      if (step === "cam" && camStream) $("#vid").srcObject = camStream;
    }
    function checkConsent() {
      var c = $("#consent"); consent = !!(c && c.checked);
      if (!consent) { toast("Coche d'abord la case d'accord pour la photo"); return false; }
      store("qv-consent", true); return true;
    }
    function startCam() {
      if (!checkConsent()) return;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast("Caméra indisponible ici : importe une photo"); return; }
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false }).then(function (st) {
        camStream = st; step = "cam"; draw();
      }).catch(function () { toast("Accès à la caméra refusé : tu peux importer une photo"); });
    }
    function snap() {
      var v = $("#vid"); if (!v || !v.videoWidth) return;
      var c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
      var g = c.getContext("2d"); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(v, 0, 0);
      stopCam(); SND.play("ding");
      usePhoto(c.toDataURL("image/jpeg", 0.9));
    }
    function usePhoto(url) {
      var img = new Image();
      img.onload = function () {
        // grande version pour l'analyse, carré pour l'affichage
        var k = Math.min(1, 1024 / Math.max(img.width, img.height)), big = document.createElement("canvas");
        big.width = Math.round(img.width * k); big.height = Math.round(img.height * k);
        big.getContext("2d").drawImage(img, 0, 0, big.width, big.height);
        photoFull = big;
        shrink(url, function (sq) { photo = sq; keepPhoto(); step = "busy"; draw(); run(); });
      };
      img.onerror = function () { toast("Image illisible"); };
      img.src = url;
    }
    function run() {
      var label = function (s) { var b = $("#busy"); if (b) b.textContent = s === "load" ? "Préparation de l'analyse (la première fois seulement)…" : "Analyse de ton visage…"; };
      var local = function () {
        if (!window.QV_FACE) return Promise.reject(new Error("analyse indisponible"));
        return window.QV_FACE.analyze(photoFull, label);
      };
      var p = CFG.avatarService
        ? fetch(CFG.avatarService, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: photo, style: "cartoon-vector" }) })
            .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(function (j) { if (!j || !j.avatar) throw new Error("vide"); return { found: true, avatar: A.sanitize(j.avatar), traits: ["Généré par le service d'avatar"] }; })
            .catch(local)
        : local();
      var t0 = Date.now();
      p.then(function (r) {
        setTimeout(function () {
          if (screen !== "creator") return;
          if (!r.found) { failMsg = "Je ne trouve pas de visage sur cette photo. Essaie une photo de face, bien éclairée, avec le visage assez grand."; step = "fail"; draw(); return; }
          result = r; step = "result"; SND.play("fanfare"); draw();
        }, Math.max(0, 900 - (Date.now() - t0)));
      }).catch(function (e) {
        if (window.console) console.warn("analyse photo", e);
        failMsg = "L'analyse de la photo n'a pas pu se lancer sur cet appareil (" + (e && e.message ? e.message : "erreur") + "). Tu peux créer ton personnage à la main.";
        step = "fail"; draw();
      });
    }
    function done(av) {
      var nm = $("#nm"); if (nm) me.name = nm.value.trim().slice(0, 16) || me.name;
      me.avatar = A.sanitize(av); me.made = true; saveMe();
      if (room && !pub) sendHello();
      if (opt.then) opt.then(); else if (room && !pub) renderLobby(); else home();
    }
    app.onclick = function (e) {
      var t = e.target.closest("[data-c]"); if (!t) return;
      SND.unlock(); SND.play("tap");
      var c = t.dataset.c;
      if (c === "cam") startCam();
      else if (c === "snap") snap();
      else if (c === "choose" || c === "again") { stopCam(); step = "choose"; draw(); }
      else if (c === "ok") { if (!$("#nm").value.trim()) { toast("Écris ton prénom"); $("#nm").focus(); return; } done(result.avatar); }
      else if (c === "tweak") { var nm = $("#nm"); if (nm && nm.value.trim()) { me.name = nm.value.trim().slice(0, 16); saveMe(); } editor(result.avatar, opt); }
      else if (c === "manual" || c === "edit") { stopCam(); editor(null, opt); }
      else if (c === "skip") { me.made = true; saveMe(); home(); }
      else if (c === "back") { stopCam(); if (room && !pub) renderLobby(); else home(); }
    };
    app.onchange = function (e) { if (e.target.id === "consent") { consent = e.target.checked; if (consent) store("qv-consent", true); } };
    draw();
  }
  function keepPhoto() {
    var keep = !!store("qv-photo-keep");
    try { if (keep && photo) localStorage.setItem("qv-photo", photo); else localStorage.removeItem("qv-photo"); } catch (e) {}
  }

  function editor(start, copt) {
    var draft = JSON.parse(JSON.stringify(start || me.avatar));
    var tabs = [["face", "Visage"], ["hair", "Cheveux"], ["eyes", "Yeux"], ["nose", "Nez & bouche"], ["beard", "Pilosité"], ["glasses", "Accessoires"], ["body", "Corps"], ["photo", "Photo"]];
    function opts(key, label) {
      return '<div class="ed-group"><span>' + label + '</span><div class="ed-chips">' + A.OPTIONS[key].map(function (o) {
        return '<button class="chip' + (draft[key] === o[0] ? " on" : "") + '" data-set="' + key + '" data-v="' + o[0] + '">' + esc(o[1]) + '</button>';
      }).join("") + '</div></div>';
    }
    function sw(key, label) {
      return '<div class="ed-group"><span>' + label + '</span><div class="ed-sw">' + A.COLORS[key].map(function (c) {
        return '<button class="sw' + (draft[key] === c ? " on" : "") + '" style="background:' + c + '" data-set="' + key + '" data-v="' + c + '" aria-label="' + c + '"></button>';
      }).join("") + (A.COLORS[key].indexOf(draft[key]) < 0 ? '<button class="sw on" style="background:' + draft[key] + '" aria-label="couleur de la photo"></button>' : '') + '</div></div>';
    }
    function panel() {
      switch (edTab) {
        case "face": return sw("skin", "Peau") + opts("face", "Forme du visage") + opts("extra", "Détails");
        case "hair": return opts("hair", "Coiffure") + sw("hairColor", "Couleur");
        case "eyes": return opts("eyes", "Yeux") + sw("eyeColor", "Couleur des yeux") + opts("brows", "Sourcils");
        case "nose": return opts("nose", "Nez") + '<p class="ed-hint">La bouche change toute seule selon l\'humeur de ton personnage pendant la partie.</p>';
        case "beard": return opts("beard", "Barbe et moustache");
        case "glasses": return opts("glasses", "Lunettes");
        case "body": return opts("body", "Silhouette") + sw("fav", "Couleur préférée (tenue de base)");
        case "photo": return photoPanel();
      }
      return "";
    }
    function photoPanel() {
      if (!photo) return '<div class="ed-photo"><p>Le plus simple : prends-toi en photo et le jeu crée ton personnage à partir de ton visage.</p><button class="qv-btn alt" data-ed="fromphoto">Créer depuis une photo</button></div>';
      return '<div class="ed-photo">' +
        '<div class="ed-photo-view"><canvas id="pc" width="240" height="240"></canvas><p class="ed-hint">' + (pickMode ? "Touche la photo pour prendre la couleur " + (pickMode === "skin" ? "de ta peau" : "de tes cheveux") + "." : "Pipette : reprends une couleur précise sur ta photo.") + '</p></div>' +
        '<div class="ed-row"><button class="chip' + (pickMode === "skin" ? " on" : "") + '" data-pick="skin">Pipette : peau</button><button class="chip' + (pickMode === "hairColor" ? " on" : "") + '" data-pick="hairColor">Pipette : cheveux</button></div>' +
        '<button class="qv-btn alt" data-ed="fromphoto">Refaire depuis une photo</button>' +
        '<label class="ed-consent"><input type="checkbox" id="keep"' + (store("qv-photo-keep") ? " checked" : "") + '> Garder la photo sur cet appareil</label>' +
        '<button class="qv-btn danger" data-photo="del">Supprimer la photo</button></div>';
    }
    function draw() {
      var preview = A.standalone(draft, { mood: edMood, outfit: edOutfit, pose: edMood === "happy" ? "wave" : edMood === "smug" ? "hips" : "down" }, "ed-av");
      show("editor", '<div class="qv-editor">' +
        '<div class="ed-top"><button class="qv-btn ghost sm" data-ed="cancel">Annuler</button><h2>Retouches</h2><button class="qv-btn sm" data-ed="save">Valider</button></div>' +
        '<div class="ed-main"><div class="ed-stage">' + preview +
          '<div class="ed-moods">' + [["happy", "Joie"], ["sad", "Déprime"], ["shocked", "Choc"], ["smug", "Fier"], ["angry", "Colère"], ["love", "Amour"]].map(function (m) { return '<button class="chip' + (edMood === m[0] ? " on" : "") + '" data-mood="' + m[0] + '">' + m[1] + '</button>'; }).join("") + '</div>' +
          '<div class="ed-moods">' + [["casual", "Tenue de base"], ["office", "Bureau"], ["delivery", "Livreur"], ["influencer", "Influence"], ["ceo", "PDG"], ["wedding", "Mariage"], ["unemployed", "Chômage"]].map(function (m) { return '<button class="chip sm' + (edOutfit === m[0] ? " on" : "") + '" data-outfit="' + m[0] + '">' + m[1] + '</button>'; }).join("") + '</div>' +
          '<button class="qv-btn ghost sm" data-ed="random">Au hasard</button>' +
        '</div>' +
        '<div class="ed-side"><div class="ed-tabs">' + tabs.map(function (t) { return '<button class="tab' + (edTab === t[0] ? " on" : "") + '" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join("") + '</div>' +
        '<div class="ed-panel">' + panel() + '</div></div></div></div>');
      if (edTab === "photo" && photo) paintPhoto();
    }
    function paintPhoto() {
      var cv = $("#pc"), img = new Image();
      img.onload = function () {
        var c = cv.getContext("2d"), s = Math.min(img.width, img.height);
        c.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 240, 240);
      };
      img.src = photo;
      cv.addEventListener("click", function (e) {
        if (!pickMode) { toast("Choisis d'abord une pipette"); return; }
        var r = cv.getBoundingClientRect(), x = Math.round((e.clientX - r.left) / r.width * 240), y = Math.round((e.clientY - r.top) / r.height * 240);
        var d = cv.getContext("2d").getImageData(Math.max(0, x - 3), Math.max(0, y - 3), 7, 7).data, R = 0, Gg = 0, B = 0, n = 0;
        for (var i = 0; i < d.length; i += 4) { R += d[i]; Gg += d[i + 1]; B += d[i + 2]; n++; }
        var hex = "#" + [R, Gg, B].map(function (v) { return ("0" + Math.round(v / n).toString(16)).slice(-2); }).join("");
        draft[pickMode] = hex; SND.play("pop");
        toast(pickMode === "skin" ? "Couleur de peau récupérée" : "Couleur de cheveux récupérée");
        pickMode = pickMode === "skin" ? "hairColor" : null; draw();
      });
    }
    app.onclick = function (e) {
      var t = e.target.closest("button"); if (!t) return;
      SND.play("tap");
      if (t.dataset.set) { draft[t.dataset.set] = t.dataset.v; draw(); return; }
      if (t.dataset.tab) { edTab = t.dataset.tab; draw(); return; }
      if (t.dataset.mood) { edMood = t.dataset.mood; draw(); return; }
      if (t.dataset.outfit) { edOutfit = t.dataset.outfit; draw(); return; }
      if (t.dataset.pick) { pickMode = pickMode === t.dataset.pick ? null : t.dataset.pick; draw(); return; }
      if (t.dataset.photo === "del") { photo = null; photoFull = null; pickMode = null; store("qv-photo-keep", null); try { localStorage.removeItem("qv-photo"); } catch (er) {} toast("Photo supprimée de cet appareil"); draw(); return; }
      var ed = t.dataset.ed;
      if (ed === "fromphoto") { app.onchange = null; creator(copt); }
      else if (ed === "random") { var keepSkin = draft.skin; draft = A.random(Math.floor(Math.random() * 1e9)); if (photo) draft.skin = keepSkin; draw(); }
      else if (ed === "cancel") back();
      else if (ed === "save") { me.avatar = A.sanitize(draft); me.made = true; saveMe(); SND.play("ding"); if (room && !pub) sendHello(); back(true); }
    };
    app.onchange = function (e) {
      if (e.target.id === "keep") { store("qv-photo-keep", e.target.checked ? true : null); keepPhoto(); }
    };
    function back(saved) {
      app.onchange = null;
      if (saved && copt && copt.then) return copt.then();
      if (room && !pub) renderLobby(); else if (me.made) home(); else creator(copt);
    }
    draw();
  }
  function shrink(url, cb) {
    var img = new Image();
    img.onload = function () { var c = document.createElement("canvas"), s = Math.min(img.width, img.height); c.width = c.height = 360; c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 360, 360); cb(c.toDataURL("image/jpeg", 0.85)); };
    img.onerror = function () { toast("Image illisible"); };
    img.src = url;
  }

  // ======================================================================
  //  SALON ET RÉSEAU
  // ======================================================================
  function code4() { var a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = ""; for (var i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }

  function leaveRoom() {
    if (room && room.net) room.net.close();
    if (room && room.timer) clearInterval(room.timer);
    room = null; G = null; pub = null; priv = null; lastEv = 0; queue = []; playing = null; sel = null;
    closeScene();
  }

  function createRoom(solo, resumeCode) {
    leaveRoom();
    var code = resumeCode || code4();
    room = { code: code, host: true, hostId: me.id, solo: solo, roster: [], lobby: [{ id: me.id, name: me.name, avatar: me.avatar }], seen: {}, net: null };
    var saved = resumeCode ? store("qv-host-" + code) : null;
    if (saved && saved.lobby) { room.lobby = saved.lobby; G = saved.state || null; }
    if (solo) {
      room.lobby.push(bot(0));
      room.lobby.push(bot(1));
    } else {
      room.net = NET.open({
        code: code, id: me.id,
        meta: function () { return { id: me.id, name: me.name, host: true }; },
        onEvent: hostOnEvent, onRoster: onRoster,
        onStatus: function (s) { if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") toast("Connexion instable… nouvelle tentative"); },
      });
      if (!room.net) { home("Le jeu en ligne n'est pas joignable. Essaie la partie contre des bots."); return; }
      store("qv-last", { code: code, host: true });
      if (location.hash !== "#" + code) history.replaceState(null, "", "#" + code);
    }
    room.timer = setInterval(hostTick, 600);
    if (G) { hostBroadcast(); } else if (solo) { hostStart(); } else renderLobby();
  }
  function bot(i) {
    var used = room.lobby.map(function (p) { return p.name; });
    var name = D.NAMES.bot.filter(function (n) { return used.indexOf(n) < 0; })[0] || ("Bot " + (i + 1));
    return { id: "bot-" + uid(), name: name, avatar: A.random(Math.floor(Math.random() * 1e9)), bot: true };
  }

  function joinRoom(code) {
    leaveRoom();
    room = { code: code, host: false, hostId: null, roster: [], net: null, lastSync: 0 };
    room.net = NET.open({
      code: code, id: me.id,
      meta: function () { return { id: me.id, name: me.name, host: false }; },
      onEvent: clientOnEvent, onRoster: onRoster,
      onStatus: function (s) {
        if (s === "SUBSCRIBED") { sendHello(); }
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") toast("Connexion instable… nouvelle tentative");
      },
    });
    if (!room.net) { home("Le jeu en ligne n'est pas joignable pour l'instant."); return; }
    store("qv-last", { code: code, host: false });
    if (location.hash !== "#" + code) history.replaceState(null, "", "#" + code);
    show("wait", '<div class="qv-page center">' + logo(true) + '<p class="qv-wait">Connexion au salon <b>' + esc(code) + '</b>…</p><p class="qv-note">Si rien ne se passe, vérifie le code ou demande à l\'hôte d\'ouvrir le salon.</p><button class="qv-btn ghost" data-home>Retour</button></div>');
    app.onclick = function (e) { if (e.target.closest("[data-home]")) { store("qv-last", null); history.replaceState(null, "", location.pathname + location.search); home(); } };
    room.timer = setInterval(function () {
      // relance : si on n'a rien reçu depuis un moment, on redemande l'état
      if (!room) return;
      var stale = Date.now() - (room.lastMsg || 0) > 6000;
      if (stale && Date.now() - room.lastSync > 3000) { room.lastSync = Date.now(); sendHello(); }
      renderPresence();
    }, 1000);
  }
  function sendHello() { if (room && room.net) room.net.send("hello", { id: me.id, name: me.name, avatar: me.avatar }); }

  function onRoster(list) {
    if (!room) return;
    room.roster = list;
    var now = Date.now();
    list.forEach(function (m) { if (room.seen) room.seen[m.id] = now; });
    if (room.host && !G && screen === "lobby") renderLobby();
    renderPresence();
  }
  function present(id) {
    if (!room) return false;
    if (id === me.id) return true;
    return room.roster.some(function (m) { return m.id === id; });
  }

  // ---------- hôte ----------
  function hostOnEvent(ev, pl) {
    if (!room || !pl) return;
    if (ev === "hello" || ev === "sync") {
      if (!G && ev === "hello") {
        var ex = room.lobby.filter(function (p) { return p.id === pl.id; })[0];
        var av = A.sanitize(pl.avatar), name = String(pl.name || "Joueur").slice(0, 16);
        if (ex) { ex.name = name; ex.avatar = av; }
        else if (room.lobby.length < 6) { room.lobby.push({ id: pl.id, name: name, avatar: av }); SND.play("pop"); }
        else { room.net.send("kick", { to: pl.id, msg: "Le salon est complet (6 joueurs)." }); return; }
        if (G) return;
        renderLobby();
      } else if (G && ev === "hello" && G.players[pl.id]) {
        G.players[pl.id].avatar = A.sanitize(pl.avatar);
      }
      hostBroadcast();
    } else if (ev === "intent") {
      if (!G || !pl.a || pl.a.pid !== pl.id) return;
      hostApply(pl.a, pl.id);
    } else if (ev === "bye") {
      if (!G) { room.lobby = room.lobby.filter(function (p) { return p.id !== pl.id; }); renderLobby(); hostBroadcast(); }
    }
  }
  function hostApply(a, from) {
    var r = E.apply(G, a);
    if (!r.ok) {
      if (from === me.id) toast(r.err);
      else room.net && room.net.send("priv", { to: from, err: r.err });
      if (from !== me.id) hostBroadcast();
      return false;
    }
    hostBroadcast();
    return true;
  }
  function hostBroadcast() {
    if (!room || !room.host) return;
    var payload;
    if (!G) payload = { kind: "lobby", code: room.code, hostId: me.id, lobby: room.lobby, now: Date.now() };
    else payload = { kind: "game", code: room.code, hostId: me.id, pub: E.publicState(G), now: Date.now() };
    if (!room.solo) {
      store("qv-host-" + room.code, { lobby: room.lobby, state: G, t: Date.now() });
      room.net.send("state", payload);
      if (G) G.order.forEach(function (id) { if (!G.players[id].bot && id !== me.id) room.net.send("priv", { to: id, p: E.privateFor(G, id) }); });
    }
    // l'hôte s'applique son propre état
    receiveState(payload);
    if (G) receivePriv(E.privateFor(G, me.id));
  }
  function hostStart() {
    if (room.lobby.length < 2) { toast("Il faut au moins 2 joueurs (ajoute un bot)"); return; }
    G = E.create(room.lobby, Math.floor(Math.random() * 4294967295));
    SND.play("fanfare");
    hostBroadcast();
  }
  function hostTick() {
    if (!room || !room.host || !G || G.phase === "end") return;
    var now = Date.now();
    var who = G.phase === "react" && G.pending ? G.pending.to : G.order[G.turn];
    var p = G.players[who]; if (!p) return;
    var idle = queue.length || playing;
    if (p.bot) {
      if (idle || now < queueEmptyAt + 900) return;
      act(p.id);
      return;
    }
    // humain absent ou trop long : pilote automatique
    if (!room.solo) {
      if (!present(who)) { room.away = room.away || {}; if (!room.away[who]) room.away[who] = now; }
      else if (room.away) delete room.away[who];
      var awayFor = room.away && room.away[who] ? now - room.away[who] : 0;
      var since = G.phase === "react" && G.pending ? now - G.pending.since : now - (room.turnStart || now);
      if ((awayFor > 15000) || (G.phase === "react" && since > 45000) || (G.phase === "play" && since > 150000)) {
        if (idle && awayFor < 25000 && since < 60000) return;
        toast("Pilote automatique pour " + p.name);
        act(p.id);
      }
    }
    function act(id) {
      var a = E.botAction(G, id);
      if (a) hostApply(a, id);
    }
  }

  // ---------- client ----------
  function clientOnEvent(ev, pl) {
    if (!room || !pl) return;
    room.lastMsg = Date.now();
    if (ev === "state") { room.hostId = pl.hostId; receiveState(pl); }
    else if (ev === "priv") {
      if (pl.to !== me.id) return;
      if (pl.err) { toast(pl.err); return; }
      receivePriv(pl.p);
    }
    else if (ev === "kick") { if (pl.to === me.id) { store("qv-last", null); home(pl.msg); } }
  }
  function sendIntent(a) {
    a.pid = me.id;
    if (room.host) { hostApply(a, me.id); return; }
    room.net.send("intent", { id: me.id, a: a });
    room.lastSync = Date.now();
    setTimeout(function () { if (room && pub && Date.now() - (room.lastMsg || 0) > 4000) sendHello(); }, 4500);
  }

  // ======================================================================
  //  RÉCEPTION DE L'ÉTAT
  // ======================================================================
  function receiveState(pl) {
    clockSkew = Date.now() - (pl.now || Date.now());
    if (pl.kind === "lobby") {
      pub = null; room.lobby = pl.lobby;
      if (screen !== "editor" && screen !== "rules") renderLobby();
      return;
    }
    var first = !pub || pub.gid !== pl.pub.gid;
    if (first) logLines = [];
    var prevTurn = pub ? pub.order[pub.turn] + ":" + pub.round : "";
    pub = pl.pub;
    if (room.host && prevTurn !== pub.order[pub.turn] + ":" + pub.round) room.turnStart = Date.now();
    if (first) {
      // on ne rejoue pas l'historique : seulement les nouveautés
      lastEv = pub.events.length ? pub.events[pub.events.length - 1].id : 0;
      if (pub.phase === "end") lastEv = Math.max(0, lastEv - 1);
      if (!room.host) store("qv-last", { code: room.code, host: false });
    }
    pub.events.forEach(function (ev) { if (ev.id > lastEv) { lastEv = ev.id; onGameEvent(ev); } });
    if (screen === "editor" || screen === "rules") return;
    if (pub.phase === "end" && !queue.length && !playing) return renderEnd();
    renderGame();
  }
  function receivePriv(p) {
    if (!p) return;
    priv = p;
    if (screen === "game") renderHand();
  }

  // ======================================================================
  //  ÉVÉNEMENTS → file de scènes
  // ======================================================================
  function card(k) { return D.byKey[k]; }
  function nameOf(id) { return pub && pub.players[id] ? pub.players[id].name : "?"; }

  function onGameEvent(ev) {
    if (ev.t === "turn") {
      if (ev.p === me.id) { enqueue({ kind: "banner", text: "À toi de jouer !", sub: (ev.info || []).join(" · "), dur: 1.3, sfx: "turn", notes: ev.notes }); }
      else enqueue({ kind: "notes", notes: ev.notes });
    } else if (ev.t === "attack") {
      enqueue({ kind: "reveal", k: ev.k, by: ev.p, to: ev.to, text: nameOf(ev.p) + " vise " + (ev.to === me.id ? "TOI" : nameOf(ev.to)) + " !", dur: 1.8, sfx: ev.to === me.id ? "alarm" : "card" });
    } else if (ev.t === "card") {
      var c = card(ev.k);
      if (ev.outcome === "self" || (ev.k === "startup" && ev.outcome !== "self")) {
        if (ev.outcome === "self") enqueue({ kind: "reveal", k: ev.k, by: ev.p, text: nameOf(ev.p) + (c.target === "all" ? " déclenche un événement !" : " joue :") + (ev.data && ev.data.amount ? " +" + ev.data.amount + " fortune !" : ""), dur: 1.4, sfx: "card" });
      }
      if (ev.scene) enqueue({ kind: "scene", ev: ev });
      else if (ev.outcome === "soft") enqueue({ kind: "banner", text: "Dégâts limités", sub: ev.text, dur: 2.2, sfx: "shield" });
      if (ev.bounce && ev.to) enqueue({ kind: "banner", text: ev.to === me.id ? "Tu rebondis !" : nameOf(ev.to) + " rebondit", sub: ev.bounce + " · +1 carte · 2 cartes au prochain tour", dur: 2.2, sfx: "boing" });
      enqueue({ kind: "notes", notes: ev.notes });
    } else if (ev.t === "block") {
      enqueue({ kind: "scene", ev: ev });
      enqueue({ kind: "notes", notes: ev.notes });
    } else if (ev.t === "season") {
      enqueue({ kind: "season", k: ev.k, dur: 4.2, sfx: "ding" });
      enqueue({ kind: "notes", notes: ev.notes });
    } else if (ev.t === "rest") {
      enqueue({ kind: "notes", notes: ev.notes });
      if (ev.p !== me.id && pub.phase !== "end") toast(nameOf(ev.p) + " souffle un coup (+1 bonheur)");
    } else if (ev.t === "end") {
      enqueue({ kind: "banner", text: "Fin de partie !", sub: "Le moment de faire les comptes…", dur: 1.8, sfx: "win" });
    }
    if (ev.text) addLog(ev);
  }
  var logLines = [];
  function addLog(ev) { logLines.unshift({ id: ev.id, text: ev.text, t: ev.t }); if (logLines.length > 30) logLines.pop(); }

  function enqueue(item) {
    if (item.kind === "notes" && (!item.notes || !item.notes.length)) return;
    queue.push(item);
    if (!playing) next();
  }
  var sceneTimers = [];
  function next() {
    sceneTimers.forEach(clearTimeout); sceneTimers = [];
    playing = queue.shift() || null;
    if (!playing) { closeScene(); queueEmptyAt = Date.now(); if (pub) { if (pub.phase === "end") renderEnd(); else renderGame(); } return; }
    var it = playing;
    if (it.kind === "notes") { floatNotes(it.notes); playing = null; setTimeout(next, 200); return; }
    var ov = $("#ov");
    if (!ov) { ov = document.createElement("div"); ov.id = "ov"; document.body.appendChild(ov); }
    ov.className = "qv-ov k-" + it.kind;
    var dur = it.dur || 2, html = "";
    if (it.kind === "banner") {
      html = '<div class="qv-banner"><b>' + esc(it.text) + '</b>' + (it.sub ? '<span>' + esc(it.sub) + '</span>' : '') + '</div>';
      if (it.notes) floatNotes(it.notes);
    } else if (it.kind === "reveal") {
      html = '<div class="qv-reveal"><p>' + esc(it.text) + '</p>' + cardHTML(it.k, { big: true }) + '</div>';
    } else if (it.kind === "season") {
      var e = D.EVENTS.filter(function (x) { return x.key === it.k; })[0];
      html = '<div class="qv-reveal season"><p>Événement de saison</p><div class="qv-card big fam-world"><div class="qv-card-top"><span>Pour tout le monde</span></div><div class="qv-card-art">' + IC.get(e.icon) + '</div><div class="qv-card-name">' + esc(e.name) + '</div><p class="qv-card-text">' + esc(e.text) + '</p></div></div>';
    } else if (it.kind === "scene") {
      var sc = W.scene(it.ev, pub);
      if (!sc) { playing = null; next(); return; }
      dur = sc.dur;
      var c = card(it.ev.k) || {};
      var title = it.ev.scene === "garde" ? "Garde alternée" : it.ev.scene === "block" ? "Paré !" : it.ev.scene === "renvoi" ? "Retour à l'envoyeur" : it.ev.scene === "startupWin" ? "Levée de fonds !" : it.ev.scene === "startupFail" ? "Faillite" : (c.name || "");
      html = '<div class="qv-scene"><div class="qv-scene-title">' + esc(title) + '</div>' + sc.svg + '<p class="qv-scene-cap">' + sc.caption + '</p></div>';
      (sc.sfx || []).forEach(function (f) { sceneTimers.push(setTimeout(function () { SND.play(f[1]); }, f[0] * 1000)); });
    }
    ov.innerHTML = html + '<button class="qv-skip" type="button">' + (it.kind === "scene" ? "Passer ›" : "OK") + '</button><div class="qv-prog"><i style="animation-duration:' + dur + 's"></i></div>';
    if (it.sfx) SND.play(it.sfx);
    ov.onclick = function () { SND.play("tap"); next(); };
    sceneTimers.push(setTimeout(next, dur * 1000 + 250));
  }
  function closeScene() { var ov = $("#ov"); if (ov) ov.remove(); }

  function floatNotes(notes) {
    (notes || []).forEach(function (n, i) {
      var host = n.p === me.id ? $("#me-res [data-r=" + n.k + "]") : $('[data-pid="' + n.p + '"] [data-r=' + n.k + ']');
      if (!host) return;
      var f = document.createElement("span");
      f.className = "qv-float " + (n.v > 0 ? "up" : "down");
      f.style.animationDelay = (i * 0.12) + "s";
      f.textContent = (n.v > 0 ? "+" : "−") + Math.abs(n.v);
      host.appendChild(f);
      setTimeout(function () { f.remove(); }, 1800);
      if (n.p === me.id && n.k === "f" && n.v > 0) SND.play("coin", i * 0.1);
    });
  }

  // ======================================================================
  //  RENDU DES CARTES
  // ======================================================================
  function chips(c) {
    var o = "";
    if (c.cost) ["f", "b", "r"].forEach(function (k) { if (c.cost[k]) o += '<span class="cp cost">' + IC.get(k, "qv-ri") + '−' + c.cost[k] + '</span>'; });
    (c.fx || []).forEach(function (f) {
      if (f.op !== "res") return;
      ["b", "f", "r"].forEach(function (k) { if (f[k]) o += '<span class="cp ' + (f[k] > 0 ? "gain" : "loss") + (c.target === "opponent" ? " foe" : "") + '">' + IC.get(k, "qv-ri") + (f[k] > 0 ? "+" : "−") + Math.abs(f[k]) + '</span>'; });
    });
    if (c.target === "opponent") o = '<span class="cp tgt">Cible</span>' + o;
    if (c.target === "all") o = '<span class="cp tgt">Tous</span>' + o;
    if (c.reaction) o = '<span class="cp tgt">Réaction</span>';
    return o;
  }
  function cardHTML(k, o) {
    o = o || {};
    var c = card(k), f = D.FAMILIES[c.fam];
    return '<div class="qv-card fam-' + c.fam + (o.big ? " big" : "") + (o.dim ? " dim" : "") + (o.on ? " on" : "") + '"' + (o.u ? ' data-u="' + o.u + '"' : '') + '>' +
      '<div class="qv-card-top"><span>' + esc(f.name) + '</span></div>' +
      '<div class="qv-card-art">' + IC.get(c.icon) + '</div>' +
      '<div class="qv-card-name">' + esc(c.name) + '</div>' +
      '<div class="qv-card-chips">' + chips(c) + '</div>' +
      (o.big ? '<p class="qv-card-text">' + esc(c.text) + '</p>' : '') +
      (o.reason ? '<div class="qv-card-lock">' + esc(o.reason) + '</div>' : '') +
      '</div>';
  }

  // ======================================================================
  //  SALON
  // ======================================================================
  function renderLobby() {
    if (!room) return;
    var host = room.host, list = room.lobby || [];
    var link = location.origin + location.pathname + "#" + room.code;
    show("lobby", '<div class="qv-page">' + logo(true) +
      '<div class="qv-code"><span>Code du salon</span><b>' + esc(room.code) + '</b><button class="qv-btn alt sm" data-l="share">Inviter des amis</button></div>' +
      '<h2>Joueurs (' + list.length + '/6)</h2>' +
      '<div class="qv-lobby">' + list.map(function (p) {
        var on = p.bot || p.id === me.id || present(p.id) || (!host && p.id === room.hostId);
        return '<div class="qv-lp' + (on ? "" : " off") + '">' + A.standalone(p.avatar, { mood: "happy" }, "lp-av", true) + '<span>' + esc(p.name) + (p.id === (room.hostId || me.id) && !p.bot ? ' <i>hôte</i>' : '') + (p.bot ? ' <i>bot</i>' : '') + (p.id === me.id ? ' <i>toi</i>' : '') + '</span>' +
          (host && p.bot ? '<button class="x" data-l="rm" data-id="' + p.id + '" aria-label="Retirer">×</button>' : '') + '</div>';
      }).join("") + '</div>' +
      (host ? '<div class="qv-actions">' +
        (list.length < 6 ? '<button class="qv-btn ghost" data-l="bot">+ Ajouter un bot</button>' : '') +
        '<button class="qv-btn big" data-l="start"' + (list.length < 2 ? " disabled" : "") + '>Lancer la partie</button>' +
        '<p class="qv-note">Partage le code ou le lien : tes amis l\'ouvrent sur leur téléphone. 2 à 6 joueurs, les bots complètent la table.</p></div>'
        : '<p class="qv-wait">En attente que l\'hôte lance la partie…</p>') +
      '<div class="qv-row2"><button class="qv-btn ghost" data-l="avatar">Mon personnage</button><button class="qv-btn ghost" data-l="leave">Quitter</button></div>' +
      '</div>');
    app.onclick = function (e) {
      var b = e.target.closest("[data-l]"); if (!b) return;
      SND.unlock(); SND.play("tap");
      var l = b.dataset.l;
      if (l === "share") {
        if (navigator.share) navigator.share({ title: "Quelle vie !", text: "Rejoins ma partie de Quelle vie ! Code : " + room.code, url: link }).catch(function () {});
        else if (navigator.clipboard) navigator.clipboard.writeText(link).then(function () { toast("Lien copié !"); });
        else toast(link);
      } else if (l === "bot") { room.lobby.push(bot(room.lobby.length)); hostBroadcast(); renderLobby(); }
      else if (l === "rm") { room.lobby = room.lobby.filter(function (p) { return p.id !== b.dataset.id; }); hostBroadcast(); renderLobby(); }
      else if (l === "start") hostStart();
      else if (l === "avatar") creator();
      else if (l === "leave") { if (!host && room.net) room.net.send("bye", { id: me.id }); store("qv-last", null); history.replaceState(null, "", location.pathname + location.search); home(); }
    };
  }

  // ======================================================================
  //  ÉCRAN DE JEU
  // ======================================================================
  function isMyTurn() { return pub && pub.phase === "play" && pub.order[pub.turn] === me.id; }

  function resRow(p, big) {
    return ["b", "f", "r"].map(function (k) {
      return '<span class="qv-res r-' + k + (big ? " big" : "") + '" data-r="' + k + '">' + IC.get(k, "qv-ri") + '<b>' + p[k] + '</b></span>';
    }).join("");
  }
  function statusChips(p) {
    var o = [];
    o.push('<span class="st job">' + esc(p.title) + (p.salary ? " · +" + p.salary + "/tour" : "") + '</span>');
    if (p.diploma) o.push('<span class="st">Diplômé·e</span>');
    if (p.partner) o.push('<span class="st love">' + (p.married ? "Marié·e à " : "En couple avec ") + esc(p.partner.name) + '</span>');
    if (p.kids.length) o.push('<span class="st">' + p.kids.length + ' enfant' + (p.kids.length > 1 ? "s" : "") + (p.garde ? " (garde alternée)" : "") + '</span>');
    o.push('<span class="st">' + esc(D.HOUSING[p.housing]) + '</span>');
    if (p.scandal) o.push('<span class="st bad">Scandale (' + p.scandal + ')</span>');
    if (p.startup) o.push('<span class="st">Start-up : verdict dans ' + p.startup + ' tour' + (p.startup > 1 ? "s" : "") + '</span>');
    if (p.strike) o.push('<span class="st bad">En grève</span>');
    if (p.rebound) o.push('<span class="st good">Rebond : 2 cartes au prochain tour</span>');
    return o.join("");
  }

  function renderGame() {
    if (!pub || !room) return;
    if (screen !== "game") {
      show("game", '<div class="qv-game">' +
        '<header class="qv-top"><div class="qv-top-l">' + logo(true) + '<span id="g-age"></span></div><div class="qv-top-r"><button class="ib" data-g="sound" aria-label="Son"></button><button class="ib" data-g="menu" aria-label="Menu">☰</button></div></header>' +
        '<section class="qv-opps" id="opps"></section>' +
        '<section class="qv-me" id="mezone"></section>' +
        '<div class="qv-status" id="status"></div>' +
        '<section class="qv-hand" id="hand"></section>' +
        '<aside class="qv-log" id="log"></aside>' +
        '<div id="sheet" class="qv-sheet" hidden></div>' +
        '</div>');
      app.onclick = gameClick;
    }
    var p = pub.players[me.id];
    $("#g-age").innerHTML = 'Âge <b>' + pub.age + '</b> · tour ' + pub.round + '/' + pub.maxRounds + ' · pioche ' + pub.deck;
    $("[data-g=sound]").textContent = SND.muted() ? "🔇" : "🔊";
    // adversaires
    $("#opps").innerHTML = pub.order.filter(function (id) { return id !== me.id; }).map(function (id) {
      var q = pub.players[id], turn = pub.order[pub.turn] === id, tgt = pub.pending && pub.pending.to === id;
      return '<button class="qv-opp' + (turn ? " turn" : "") + (tgt ? " tgt" : "") + (q.bot || present(id) ? "" : " off") + '" data-pid="' + id + '" data-g="who">' +
        W.tile(q) +
        '<span class="nm">' + esc(q.name) + (q.bot ? ' <i>bot</i>' : '') + '</span>' +
        '<span class="rs">' + resRow(q) + '<span class="hc">' + q.handCount + '</span></span>' +
        '</button>';
    }).join("");
    // moi
    if (p) {
      $("#mezone").innerHTML =
        '<div class="qv-mytile' + (isMyTurn() ? " turn" : "") + '" data-pid="' + me.id + '">' + W.tile(p) + '<span class="who">' + esc(p.name) + ' · ' + esc(p.title) + '</span></div>' +
        '<div class="qv-mystats"><div class="qv-myres" id="me-res">' + resRow(p, true) + '</div>' +
        '<div class="qv-chips">' + statusChips(p) + '</div>' +
        '<div class="qv-row2"><button class="qv-btn ghost sm" data-g="obj">Mes objectifs secrets</button><button class="qv-btn ghost sm" data-g="life">Ma vie</button></div></div>';
    } else {
      $("#mezone").innerHTML = '<p class="qv-note">Tu regardes la partie en spectateur.</p>';
    }
    renderStatus();
    renderHand();
    $("#log").innerHTML = '<h3>Journal</h3>' + logLines.slice(0, 12).map(function (l) { return '<p class="lg-' + l.t + '">' + esc(l.text) + '</p>'; }).join("");
    maybeReact();
  }
  function renderStatus() {
    var st = $("#status"); if (!st || !pub) return;
    var cur = pub.players[pub.order[pub.turn]], o = "";
    if (pub.phase === "react" && pub.pending) {
      var left = Math.max(0, 45 - Math.floor((Date.now() - clockSkew - pub.pending.since) / 1000));
      o = pub.pending.to === me.id ? "On t'attaque ! Choisis ta réaction." : esc(nameOf(pub.pending.to)) + " choisit sa réaction… <b>" + left + " s</b>";
    } else if (isMyTurn()) {
      var pl = pub.players[me.id].plays;
      o = "<b>À toi !</b> Touche une carte pour la jouer, ou souffle un coup." + (pl > 1 ? " (" + pl + " cartes ce tour-ci)" : "");
    } else if (cur) {
      o = esc(cur.name) + (cur.bot ? " réfléchit…" : " joue…") + (!cur.bot && !present(cur.id) ? " (déconnecté·e : pilote automatique bientôt)" : "");
    }
    if (room && !room.host && room.hostId && !present(room.hostId) && room.roster.length) o = "L'hôte est déconnecté·e. La partie reprendra à son retour.";
    st.innerHTML = o;
    st.className = "qv-status" + (isMyTurn() ? " mine" : "");
  }
  function renderPresence() { if (screen === "game") { renderStatus(); $$(".qv-opp").forEach(function (b) { var id = b.dataset.pid, q = pub && pub.players[id]; if (q) b.classList.toggle("off", !(q.bot || present(id))); }); } else if (screen === "lobby") { /* rafraîchi par onRoster */ } }
  setInterval(function () { if (screen === "game" && pub && pub.phase === "react") renderStatus(); }, 1000);

  function renderHand() {
    var h = $("#hand"); if (!h || !pub) return;
    if (!priv || !pub.players[me.id]) { h.innerHTML = ""; return; }
    var mine = isMyTurn();
    h.innerHTML = '<div class="qv-hand-row">' + priv.hand.map(function (c) {
      var why = mine ? E.canPlay(pub, me.id, c.k) : "";
      return '<button class="qv-hc" data-g="card" data-u="' + c.u + '">' + cardHTML(c.k, { dim: mine && !!why, on: sel === c.u }) + '</button>';
    }).join("") + '</div>';
  }

  function sheet(html) {
    var s = $("#sheet"); if (!s) return;
    s.innerHTML = '<div class="qv-sheet-bg" data-g="close"></div><div class="qv-sheet-box">' + html + '</div>';
    s.hidden = false;
  }
  function closeSheet() { var s = $("#sheet"); if (s) { s.hidden = true; s.innerHTML = ""; } sel = null; }

  function openCard(u) {
    var c = priv.hand.filter(function (x) { return x.u === u; })[0]; if (!c) return;
    sel = u;
    var def = card(c.k), mine = isMyTurn(), why = mine ? E.canPlay(pub, me.id, c.k) : "";
    var o = cardHTML(c.k, { big: true }) + (def.tip && (why || !mine) && !def.reaction ? '<p class="qv-tip">Condition : ' + esc(def.tip) + '</p>' : '');
    if (def.reaction) o += '<p class="qv-tip">Garde-la : elle se joue quand quelqu\'un t\'attaque.</p>';
    if (mine) {
      if (!why && def.target === "opponent") {
        o += '<p class="qv-pick">Sur qui ?</p><div class="qv-targets">' + E.validTargets(pub, me.id, c.k).map(function (id) {
          var q = pub.players[id];
          return '<button class="qv-tg" data-g="target" data-u="' + u + '" data-t="' + id + '">' + A.standalone(q.avatar, { mood: "worried" }, "tg-av", true) + '<span>' + esc(q.name) + '</span></button>';
        }).join("") + '</div>';
      } else if (!why) {
        o += '<button class="qv-btn big" data-g="play" data-u="' + u + '">Jouer cette carte</button>';
      } else if (!def.reaction) {
        o += '<p class="qv-why">' + esc(why) + '</p>';
      }
      o += '<button class="qv-btn ghost" data-g="rest" data-u="' + u + '">Souffler un coup : défausser (+1 bonheur)</button>';
    } else {
      o += '<p class="qv-tip">Ce n\'est pas ton tour.</p>';
    }
    o += '<button class="qv-btn ghost sm" data-g="close">Fermer</button>';
    sheet(o);
    renderHand();
  }

  function maybeReact() {
    if (!pub || pub.phase !== "react" || !pub.pending || pub.pending.to !== me.id || queue.length || playing || !priv) return;
    var pd = pub.pending, ac = card(pd.k), p = pub.players[me.id];
    var counters = priv.hand.filter(function (h) { return (ac.counters || []).indexOf(h.k) >= 0; });
    var o = '<div class="qv-react"><p class="qv-react-h">' + esc(nameOf(pd.from)) + ' te joue</p>' + cardHTML(pd.k, { big: true }) +
      '<div class="qv-react-opts">';
    counters.forEach(function (h) {
      o += '<button class="qv-btn good" data-g="react" data-c="defend" data-u="' + h.u + '">Contrer avec « ' + esc(card(h.k).name) + ' »</button>';
    });
    if (ac.soft) {
      var ok = E.affordable(p, ac.soft.cost);
      o += '<button class="qv-btn alt" data-g="react" data-c="soft"' + (ok ? "" : " disabled") + '>' + esc(ac.soft.label) + ' <small>(payer ' + esc(E.costText(ac.soft.cost)) + ')</small></button>';
    }
    o += '<button class="qv-btn danger" data-g="react" data-c="accept">Encaisser <small>' + esc(ac.bounce ? ac.bounce.label : "") + ' · +1 carte · 2 cartes au prochain tour</small></button>';
    if (!counters.length) o += '<p class="qv-tip">Pas de carte pour contrer. ' + esc((ac.counters || []).filter(function (k) { return k !== "renvoi"; }).map(function (k) { return "« " + card(k).name + " »"; }).join(" ou ")) + ' ou « Retour à l\'envoyeur » auraient marché.</p>';
    o += '</div></div>';
    sheet(o);
  }

  function gameClick(e) {
    var b = e.target.closest("[data-g]"); if (!b) return;
    SND.unlock();
    var g = b.dataset.g;
    if (g === "close") { closeSheet(); renderHand(); maybeReact(); return; }
    SND.play("tap");
    if (g === "card") return openCard(+b.dataset.u);
    if (g === "play") { closeSheet(); sendIntent({ t: "play", u: +b.dataset.u }); return; }
    if (g === "target") { closeSheet(); sendIntent({ t: "play", u: +b.dataset.u, target: b.dataset.t }); return; }
    if (g === "rest") { closeSheet(); sendIntent({ t: "rest", u: +b.dataset.u }); return; }
    if (g === "react") { closeSheet(); sendIntent({ t: "react", choice: b.dataset.c, u: b.dataset.u ? +b.dataset.u : undefined }); return; }
    if (g === "sound") { SND.toggle(); b.textContent = SND.muted() ? "🔇" : "🔊"; return; }
    if (g === "obj") {
      sheet('<h3>Objectifs secrets</h3><p class="qv-tip">Personne d\'autre ne les voit. Ils rapportent des points à la fin s\'ils sont remplis.</p>' +
        (priv && priv.obj ? priv.obj.map(function (o) { return '<div class="qv-obj' + (o.done ? " done" : "") + '"><b>' + esc(o.name) + ' <i>+' + o.pts + '</i></b><span>' + esc(o.text) + '</span><em>' + (o.done ? "Rempli pour l'instant" : "Pas encore") + '</em></div>'; }).join("") : "") +
        '<button class="qv-btn ghost sm" data-g="close">Fermer</button>');
      return;
    }
    if (g === "life" || g === "who") {
      var id = g === "life" ? me.id : b.dataset.pid, q = pub.players[id];
      sheet('<div class="qv-who">' + W.tile(q) + '<h3>' + esc(q.name) + '</h3><div class="qv-res-line">' + resRow(q, true) + '</div><div class="qv-chips">' + statusChips(q) + '</div>' +
        '<h4>Sa vie</h4><ol class="qv-life">' + q.life.slice().reverse().map(function (l) { return '<li class="t-' + l.tone + '"><b>' + l.age + ' ans</b> ' + esc(l.text) + '</li>'; }).join("") + '</ol></div>' +
        '<button class="qv-btn ghost sm" data-g="close">Fermer</button>');
      return;
    }
    if (g === "menu") {
      sheet('<h3>Menu</h3>' + (room && !room.solo ? '<p class="qv-tip">Salon <b>' + esc(room.code) + '</b>. Si tu quittes, tu peux revenir avec ce code tant que la partie tourne' + (room.host ? " (tu es l'hôte : la partie s'arrête sans toi)." : ".") + '</p>' : '') +
        '<button class="qv-btn ghost" data-g="rules">Règles</button>' +
        (room && !room.solo ? '<button class="qv-btn ghost" data-g="invite">Copier le lien d\'invitation</button>' : '') +
        '<button class="qv-btn danger" data-g="quit">Quitter la partie</button><button class="qv-btn ghost sm" data-g="close">Fermer</button>');
      return;
    }
    if (g === "rules") { closeSheet(); rules(); return; }
    if (g === "invite") { var link = location.origin + location.pathname + "#" + room.code; if (navigator.clipboard) navigator.clipboard.writeText(link).then(function () { toast("Lien copié"); }); closeSheet(); return; }
    if (g === "quit") { closeSheet(); if (room && room.solo) store("qv-last", null); history.replaceState(null, "", location.pathname + location.search); home(); return; }
  }

  // ======================================================================
  //  FIN DE PARTIE
  // ======================================================================
  function renderEnd() {
    if (!pub) return;
    var ranked = pub.order.slice().sort(function (a, b) { return pub.players[b].final.total - pub.players[a].final.total; });
    var w = pub.winners || [pub.winner];
    show("end", '<div class="qv-page qv-end">' + logo(true) +
      '<h2>' + (w.indexOf(me.id) >= 0 ? "Tu as eu la plus belle vie !" : esc(w.map(nameOf).join(" et ")) + " " + (w.length > 1 ? "gagnent" : "gagne") + " !") + '</h2>' +
      '<div class="qv-ranks">' + ranked.map(function (id, i) {
        var p = pub.players[id], f = p.final, win = w.indexOf(id) >= 0;
        var mood = win ? "happy" : (i === ranked.length - 1 ? "sad" : "neutral");
        return '<article class="qv-rank' + (win ? " win" : "") + '">' +
          '<div class="rk-head"><span class="rk-n">' + (i + 1) + '</span>' + A.standalone(p.avatar, { mood: mood, outfit: W.outfit(p), hat: win ? "crown" : null, pose: win ? "up" : "down" }, "rk-av") +
          '<div><h3>' + esc(p.name) + '</h3><p class="rk-t">' + esc(p.title) + ' · ' + esc(D.HOUSING[p.housing]) + '</p><p class="rk-score"><b>' + f.total + '</b> points</p></div></div>' +
          '<div class="rk-break">' + resRow(p, true) +
          f.obj.map(function (o) { return '<span class="st ' + (o.done ? "good" : "off") + '">' + esc(o.name) + (o.done ? " +" + o.pts : " ✗") + '</span>'; }).join("") +
          f.trophies.map(function (t) { return '<span class="st gold">' + esc(t.name) + ' +' + t.pts + '</span>'; }).join("") + '</div>' +
          '<details' + (i === 0 ? " open" : "") + '><summary>Sa vie en ' + p.life.length + ' moments</summary><ol class="qv-life">' + p.life.map(function (l) { return '<li class="t-' + l.tone + '"><b>' + l.age + ' ans</b> ' + esc(l.text) + '</li>'; }).join("") + '<li class="t-neutral"><b>' + (pub.age + 5) + ' ans</b> Prend sa retraite. ' + (win ? "Raconte sa vie à qui veut l'entendre." : "Jure qu'il·elle avait la meilleure stratégie.") + '</li></ol></details>' +
          '</article>';
      }).join("") + '</div>' +
      '<div class="qv-actions">' + (room && room.host ? '<button class="qv-btn big" data-e="again">Revanche !</button>' : '<p class="qv-wait">L\'hôte peut relancer une revanche.</p>') +
      '<button class="qv-btn ghost" data-e="home">Accueil</button></div></div>');
    app.onclick = function (e) {
      var b = e.target.closest("[data-e]"); if (!b) return;
      SND.play("tap");
      if (b.dataset.e === "again") { logLines = []; lastEv = 0; G = null; pub = null; screen = ""; hostStart(); }
      else { store("qv-last", null); history.replaceState(null, "", location.pathname + location.search); home(); }
    };
  }

  // ---------------- divers ----------------
  var toastT = null;
  function toast(t) {
    var el = $("#toast");
    if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "qv-toast"; document.body.appendChild(el); }
    el.textContent = t; el.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove("on"); }, 2600);
  }
  window.addEventListener("hashchange", function () {
    var c = (location.hash.match(/^#([A-Z0-9]{4})$/i) || [])[1];
    if (c && (!room || room.code !== c.toUpperCase()) && me.name) joinRoom(c.toUpperCase());
  });
  // retour au premier plan : on redemande l'état
  document.addEventListener("visibilitychange", function () { if (!document.hidden && room && !room.host) sendHello(); });

  // démarrage
  var last = store("qv-last"), hc = (location.hash.match(/^#([A-Z0-9]{4})$/i) || [])[1];
  if (last && last.host && hc && hc.toUpperCase() === last.code && store("qv-host-" + last.code)) createRoom(false, last.code);
  else home();

  // accès pour les tests automatiques
  window.QV_APP = { me: me, state: function () { return { screen: screen, pub: pub, priv: priv, room: room && { code: room.code, host: room.host }, queue: queue.length + (playing ? 1 : 0) }; }, skip: function () { queue = []; next(); } };
})();
