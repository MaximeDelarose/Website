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
    // rien d'éphémère (étiquettes, particules, cartes volantes) ne survit à un changement d'écran
    Array.prototype.forEach.call(document.querySelectorAll(".ctr-float, .qv-part, .qv-flymini, .qv-ghost, .qv-flycard"), function (e) { e.parentNode.removeChild(e); });
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
    var R = function (ic, t, txt) { return '<section class="rl"><div class="rl-i">' + IC.get(ic) + '</div><div><h3>' + t + '</h3><p>' + txt + '</p></div></section>'; };
    show("rules", '<div class="qv-page qv-rules2">' + logo(true) + '<h2>Comment on joue</h2>' +
      R("b", "Le but", "Avoir la plus belle vie à la fin : on additionne " + IC.get("b", "qv-ri") + " bonheur, " + IC.get("f", "qv-ri") + " fortune et " + IC.get("r", "qv-ri") + " réputation, plus tes 2 objectifs secrets et quelques trophées.") +
      R("ticket", "Ton tour", "Tu touches ton salaire, tu <em>pioches</em> une carte, puis tu en <em>joues</em> une ou tu en <em>défausses</em> une. Tu gardes 3 cartes en main.") +
      R("gradcap", "Études et métiers", "Les cartes Études font monter ta <em>Formation</em> (0 à 6). Chaque métier demande un niveau : bureau 1, commercial·e 2, ingénieur·e 3, avocat·e 4, chirurgien·ne 5. Un seul métier à la fois.") +
      R("heart", "Ta vie perso", "Rencontre, fiançailles, mariage, enfants, adoption, ou célibat heureux : à toi de choisir. Le logement va du canapé de tes parents à la villa.") +
      R("lightning", "Les coups bas", "Les cartes noires visent un adversaire. Quand on t'attaque : contre avec une carte de réaction, paie pour limiter les dégâts, ou encaisse et rebondis (2 cartes au tour suivant).") +
      R("moneyup", "Les combos", "Chômage + formation continue, burn-out + voyage, gros salaire + maison = villa, faux diplôme + contrôle = scandale, fiançailles + mariage.") +
      R("chart", "La défausse", "Si un autre joueur vient de défausser une carte que tu peux jouer, tu peux la reprendre au lieu de piocher : elle se joue tout de suite.") +
      R("star", "Le salon", "Mode Classique ou Trash &amp; Adulte 18+ (tout le monde doit accepter), Découverte ou Expert, et durée : Rapide (12 tours), Classique (20) ou Long (26).") +
      '<button class="qv-btn big" data-back>Retour</button></div>');
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
    var step = "choose", consent = !!store("qv-consent"), result = null, failMsg = "", crTab = "skin";
    var stopLive = null, goodSince = 0, counting = null;
    function stopCam() {
      if (stopLive) { stopLive(); stopLive = null; }
      if (counting) { clearInterval(counting); counting = null; }
      if (camStream) { camStream.getTracks().forEach(function (t) { t.stop(); }); camStream = null; }
    }
    // guidage en direct : conseils + déclenchement automatique quand la pose est bonne
    function startGuide() {
      if (!window.QV_FACE || stopLive) return;
      goodSince = 0;
      stopLive = window.QV_FACE.live($("#vid"), function (q) {
        var tip = $("#tip"), guide = $("#guide"); if (!tip || step !== "cam") return;
        if (q.off) { tip.textContent = "Place ton visage dans l'ovale, de face, bien éclairé."; return; }
        if (q.tip) tip.textContent = q.tip;
        guide.classList.toggle("ok", !!q.ok);
        if (q.ok) {
          if (!goodSince) goodSince = Date.now();
          if (!counting && Date.now() - goodSince > 700) countdown();
        } else {
          goodSince = 0;
          if (counting) { clearInterval(counting); counting = null; $("#count").textContent = ""; }
        }
      });
    }
    function countdown() {
      var n = 3, el = $("#count");
      el.textContent = n; SND.play("tick");
      counting = setInterval(function () {
        n--;
        if (!$("#count")) { clearInterval(counting); counting = null; return; }
        if (n <= 0) { clearInterval(counting); counting = null; el.textContent = ""; snap(); return; }
        el.textContent = n; SND.play("tick");
      }, 550);
    }
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
        o += '<h2>Souris !</h2><div class="cr-cam"><video id="vid" playsinline autoplay muted></video><div class="cr-guide" id="guide"></div><div class="cr-count" id="count"></div></div>' +
          '<p class="cr-tip" id="tip">Place ton visage dans l\'ovale, de face, bien éclairé.</p>' +
          '<button class="qv-btn big" data-c="snap">Prendre la photo</button><button class="qv-btn ghost" data-c="choose">Annuler</button>';
      } else if (step === "busy") {
        o += '<h2>Création de ton personnage…</h2><div class="cr-pair"><img class="cr-photo scanning" src="' + photo + '" alt="Ta photo"><div class="cr-spin"></div></div>' +
          '<p class="qv-wait" id="busy">Analyse de ton visage…</p><p class="ed-hint">Tout se passe sur ton appareil.</p>';
      } else if (step === "result") {
        var ra = result.avatar, sw = function (key, list, base) {
          var all = (base ? [base] : []).concat(list.filter(function (c) { return c !== base; }));
          return all.map(function (c, i) { return '<button class="sw' + (ra[key] === c ? " on" : "") + (i === 0 && base ? " ph" : "") + '" style="background:' + c + '" data-r="' + key + '" data-v="' + c + '" aria-label="' + (i === 0 && base ? "comme la photo" : c) + '"></button>'; }).join("");
        };
        o += '<h2>Est-ce que ton portrait te ressemble ?</h2>' +
          (ra.trace ? '<p class="cr-how">Dessiné à partir des formes de ton visage et des couleurs mesurées sur ta photo. Corrige ce qui ne va pas.</p>' : '<p class="cr-how">Je n\'ai pas pu tracer ton visage en détail : voici un portrait approximatif. Corrige-le avant de valider.</p>') +
          '<div class="cr-pair"><img class="cr-photo pick" id="crph" src="' + photo + '" alt="Ta photo (touche ta joue pour prendre la couleur)"><span class="cr-arrow">→</span><div class="cr-av big" id="crav">' + A.standalone(ra, { mood: "neutral", pose: "wave" }) + '</div></div>' +
          (result.skin && result.skin.conf === "low" ? '<p class="cr-tip warn">La lumière de la photo rend la couleur de peau incertaine (' + esc(result.skin.why.join(", ")) + ') : je l\'ai gardée proche de la photo. Vérifie-la ci-dessous.</p>' : '') +
          // une seule catégorie à la fois : peau, cheveux, yeux, visage
          '<div class="cr-tabs" role="tablist">' + [["skin", "Peau"], ["hair", "Cheveux"], ["eyes", "Yeux"], ["face", "Visage"]].map(function (t) { return '<button class="cr-tab' + (crTab === t[0] ? " on" : "") + '" role="tab" aria-selected="' + (crTab === t[0]) + '" data-c="tab" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join("") + '</div>' +
          '<div class="cr-fix">' +
          (crTab === "skin" ? '<div class="cr-row"><span class="cr-sw" id="crskin" style="background:' + ra.skin + '"></span><div class="cr-range"><small>plus claire</small><input type="range" id="skinr" min="-40" max="40" step="1" value="' + (result.adj || 0) + '" aria-label="Carnation : plus claire ou plus foncée"><small>plus foncée</small></div></div>' +
            '<div class="cr-3"><button class="chip sm" data-c="lighter">Plus claire</button><button class="chip sm" data-c="same">Comme la photo</button><button class="chip sm" data-c="darker">Plus foncée</button></div>' +
            '<p class="ed-hint">Ou touche ta joue sur la photo pour reprendre sa couleur exacte.</p>' : '') +
          (crTab === "hair" ? '<div class="ed-sw">' + sw("hairColor", A.COLORS.hairColor.slice(0, 8), result.base.hairColor) + '</div><p class="ed-hint">La première pastille est la couleur mesurée sur ta photo.</p>' : '') +
          (crTab === "eyes" ? '<div class="ed-sw">' + sw("eyeColor", A.COLORS.eyeColor, result.base.eyeColor) + '</div>' : '') +
          (crTab === "face" ? '<div class="ed-chips">' + (ra.trace ? [["photo", "Ma photo"]] : []).concat(A.OPTIONS.face).map(function (f) { return '<button class="chip sm' + (ra.face === f[0] ? " on" : "") + '" data-r="face" data-v="' + f[0] + '">' + esc(f[1]) + '</button>'; }).join("") + '</div>' : '') +
          '</div>' +
          (result.quality && !result.quality.ok ? '<p class="cr-tip warn">Pour un personnage plus ressemblant, reprends une photo : ' + esc(result.quality.tips.slice(0, 2).join(", ").toLowerCase()) + '.</p>' : '') +
          '<div class="cr-foot"><label class="qv-field"><span>Ton prénom</span><input id="nm" maxlength="16" autocomplete="nickname" placeholder="Ex. : Jean-Mich" value="' + esc(me.name) + '"></label>' +
          '<button class="qv-btn big" data-c="ok">C\'est moi !</button>' +
          '<div class="cr-links"><button class="g-link" data-c="tweak">Tout retoucher</button><button class="g-link" data-c="again">Autre photo</button></div></div>';
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
      if (step === "cam" && camStream) { $("#vid").srcObject = camStream; startGuide(); }
      if (step === "result") {
        var rng = $("#skinr") || { value: 0 };
        if (rng.addEventListener) rng.addEventListener("input", function () { result.adj = +rng.value; liveSkin(); });
        $("#crph").addEventListener("click", function (e) {
          var img = e.target, r = img.getBoundingClientRect(), c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
          var g = c.getContext("2d"); g.drawImage(img, 0, 0);
          // la photo est affichée recadrée (object-fit: cover) : on retrouve le pixel touché
          var s0 = Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight), ox = (r.width - img.naturalWidth * s0) / 2, oy = (r.height - img.naturalHeight * s0) / 2;
          var x = Math.round((e.clientX - r.left - ox) / s0), y = Math.round((e.clientY - r.top - oy) / s0);
          var d = g.getImageData(Math.max(0, x - 3), Math.max(0, y - 3), 7, 7).data, R = 0, G2 = 0, B = 0, n = 0;
          for (var i = 0; i < d.length; i += 4) { R += d[i]; G2 += d[i + 1]; B += d[i + 2]; n++; }
          result.base.skin = "#" + [R, G2, B].map(function (v) { return ("0" + Math.round(v / n).toString(16)).slice(-2); }).join("");
          result.adj = 0; rng.value = 0; liveSkin(); SND.play("pop"); toast("Couleur de peau reprise sur la photo");
        });
      }
    }
    function liveSkin() {
      var k = (result.adj || 0) / 100;
      // k > 0 : plus foncée ; k < 0 : plus claire
      result.avatar.skin = k ? A.shade(result.base.skin, -k) : result.base.skin;
      var av = $("#crav"); if (av) av.innerHTML = A.standalone(result.avatar, { mood: "neutral", pose: "wave" });
      var sw = $("#crskin"); if (sw) sw.style.background = result.avatar.skin;
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
          result = r; result.base = JSON.parse(JSON.stringify(r.avatar)); result.adj = 0;
          step = "result"; SND.play("fanfare"); draw();
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
      var rr = e.target.closest("[data-r]");
      if (rr && step === "result") {
        var nmI = $("#nm"); if (nmI) me.name = nmI.value.trim().slice(0, 16);
        result.avatar[rr.dataset.r] = rr.dataset.v; SND.play("tap"); draw(); return;
      }
      var t = e.target.closest("[data-c]"); if (!t) return;
      SND.unlock(); SND.play("tap");
      var c = t.dataset.c;
      if (c === "cam") startCam();
      else if (c === "snap") snap();
      else if (c === "choose" || c === "again") { stopCam(); step = "choose"; draw(); }
      else if (c === "lighter" || c === "darker" || c === "same") {
        result.adj = c === "same" ? 0 : Math.max(-40, Math.min(40, (result.adj || 0) + (c === "lighter" ? -8 : 8)));
        if ($("#skinr")) $("#skinr").value = result.adj; liveSkin();
      }
      else if (c === "tab") { var nmT = $("#nm"); if (nmT) me.name = nmT.value.trim().slice(0, 16); crTab = t.dataset.v; draw(); }
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
      var list = A.OPTIONS[key].slice();
      if (draft.trace && key === "face") list.unshift(["photo", "Mon visage (photo)"]);
      if (draft.trace && (draft.trace.hb || draft.trace.hf) && key === "hair") list.unshift(["photo", "Ma coiffure (photo)"]);
      return '<div class="ed-group"><span>' + label + '</span><div class="ed-chips">' + list.map(function (o) {
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
        case "face": return sw("skin", "Peau") + '<div class="cr-3"><button class="chip sm" data-ed="skinL">Peau plus claire</button><button class="chip sm" data-ed="skinD">Peau plus foncée</button></div>' + opts("face", "Forme du visage") + opts("extra", "Détails");
        case "hair": return opts("hair", "Coiffure") + sw("hairColor", "Couleur");
        case "eyes": return opts("eyes", "Yeux") + sw("eyeColor", "Couleur des yeux") + opts("brows", "Sourcils");
        case "nose": return (draft.face === "photo" ? '<p class="ed-hint">Avec « Mon visage (photo) », les yeux, le nez et la bouche viennent de ta photo. Choisis une autre forme de visage pour les dessiner à la main.</p>' : opts("nose", "Nez")) + '<p class="ed-hint">La bouche change toute seule selon l\'humeur de ton personnage pendant la partie.</p>';
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
      if (ed === "skinL" || ed === "skinD") { draft.skin = A.shade(draft.skin, ed === "skinL" ? 0.08 : -0.08); draw(); return; }
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
    room = { code: code, host: true, hostId: me.id, solo: solo, roster: [], lobby: [{ id: me.id, name: me.name, avatar: me.avatar }], seen: {}, net: null, opts: { mode: "classic", discovery: !store("qv-tuto-done"), format: "classique" } };
    var saved = resumeCode ? store("qv-host-" + code) : null;
    if (saved && saved.lobby) { room.lobby = saved.lobby; G = saved.state ? E.migrate(saved.state) : null; if (saved.opts) room.opts = saved.opts; }
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
      if (location.hash !== "#" + code) window.history.replaceState(null, "", "#" + code);
    }
    room.timer = setInterval(hostTick, 600);
    if (G) { hostBroadcast(); } else renderLobby();
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
    if (location.hash !== "#" + code) window.history.replaceState(null, "", "#" + code);
    show("wait", '<div class="qv-page center">' + logo(true) + '<p class="qv-wait">Connexion au salon <b>' + esc(code) + '</b>…</p><p class="qv-note">Si rien ne se passe, vérifie le code ou demande à l\'hôte d\'ouvrir le salon.</p><button class="qv-btn ghost" data-home>Retour</button></div>');
    app.onclick = function (e) { if (e.target.closest("[data-home]")) { store("qv-last", null); window.history.replaceState(null, "", location.pathname + location.search); home(); } };
    room.timer = setInterval(function () {
      // relance : si on n'a rien reçu depuis un moment, on redemande l'état
      if (!room) return;
      var stale = Date.now() - (room.lastMsg || 0) > 6000;
      if (stale && Date.now() - room.lastSync > 3000) { room.lastSync = Date.now(); sendHello(); }
      renderPresence();
    }, 1000);
  }
  function sendHello() { if (room && room.net) room.net.send("hello", { id: me.id, name: me.name, avatar: me.avatar, adultOk: room.adultOk === undefined ? null : room.adultOk }); }

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
        if (ex) { ex.name = name; ex.avatar = av; ex.adultOk = pl.adultOk === true ? true : pl.adultOk === false ? false : null; }
        else if (room.lobby.length < 6) { room.lobby.push({ id: pl.id, name: name, avatar: av, adultOk: pl.adultOk === true ? true : pl.adultOk === false ? false : null }); SND.play("pop"); }
        else { room.net.send("kick", { to: pl.id, msg: "Le salon est complet (6 joueurs)." }); return; }
        if (G) return;
        renderLobby();
      } else if (G && ev === "hello" && G.players[pl.id]) {
        G.players[pl.id].avatar = A.sanitize(pl.avatar);
      }
      hostBroadcast();
    } else if (ev === "ready") {
      hostReady(pl.id, pl.gate);
    } else if (ev === "intent") {
      if (!G || !pl.a || pl.a.pid !== pl.id) return;
      hostApply(pl.a, pl.id);
    } else if (ev === "bye") {
      if (!G) { room.lobby = room.lobby.filter(function (p) { return p.id !== pl.id; }); renderLobby(); hostBroadcast(); }
    }
  }
  var GATE_MAX = 45000;
  function hostApply(a, from) {
    var before = G.evId;
    var r = E.apply(G, a);
    if (r.ok && G.phase !== "end" && G.events.some(function (e) { return e.id > before && (e.t === "card" || e.t === "block" || e.t === "season" || (e.t === "status" && (e.scene || (e.changes && e.changes.length)))); })) {
      G.gate = { id: G.evId, since: Date.now(), ready: {} };
    }
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
    if (!G) payload = { kind: "lobby", code: room.code, hostId: me.id, lobby: room.lobby, opts: room.opts, now: Date.now() };
    else payload = { kind: "game", code: room.code, hostId: me.id, pub: E.publicState(G), now: Date.now() };
    if (!room.solo) {
      store("qv-host-" + room.code, { lobby: room.lobby, state: G, opts: room.opts, t: Date.now() });
      room.net.send("state", payload);
      if (G) G.order.forEach(function (id) { if (!G.players[id].bot && id !== me.id) room.net.send("priv", { to: id, p: E.privateFor(G, id) }); });
    }
    // l'hôte s'applique son propre état
    receiveState(payload);
    if (G) receivePriv(E.privateFor(G, me.id));
  }
  function adultBlockers() {
    if (!room || !room.opts || room.opts.mode !== "adult") return [];
    return room.lobby.filter(function (p) { return !p.bot && (p.id === me.id ? room.adultOk !== true : p.adultOk !== true); });
  }
  function hostStart() {
    if (room.lobby.length < 2) { toast("Il faut au moins 2 joueurs (ajoute un bot)"); return; }
    var blk = adultBlockers();
    if (blk.length) { toast("Mode 18+ : en attente de l'accord de " + blk.map(function (p) { return p.name; }).join(", ")); return; }
    G = E.create(room.lobby, Math.floor(Math.random() * 4294967295), room.opts);
    SND.play("fanfare");
    hostBroadcast();
  }
  function hostReady(id, gate) {
    if (!G || !G.gate || G.gate.id !== gate) return;
    G.gate.ready[id] = true;
    checkGate();
  }
  function checkGate() {
    if (!G || !G.gate) return;
    var need = G.order.filter(function (id) { var p = G.players[id]; return !p.bot && (id === me.id || present(id)); });
    var all = need.every(function (id) { return G.gate.ready[id]; });
    if (all || Date.now() - G.gate.since > GATE_MAX) { G.gate = null; hostBroadcast(); }
    else if (G.gate && !G.gate.shown) { G.gate.shown = 1; hostBroadcast(); }
  }
  function hostTick() {
    if (!room || !room.host || !G || G.phase === "end") return;
    if (G.gate) { checkGate(); if (G.gate) return; }
    var now = Date.now();
    var who = G.phase === "react" && G.pending ? G.pending.to : G.order[G.turn];
    var p = G.players[who]; if (!p) return;
    var idle = queue.length || playing || introOpen;
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
      if ((awayFor > 15000) || (G.phase === "react" && since > 45000) || ((G.phase === "play" || G.phase === "draw") && since > 150000)) {
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
      var prevMode = room.opts && room.opts.mode;
      if (pl.opts) room.opts = pl.opts;
      if (!room.host && room.opts && room.opts.mode !== prevMode && room.opts.mode === "adult") { room.adultOk = undefined; }
      if (screen !== "editor" && screen !== "rules") renderLobby();
      return;
    }
    var first = !pub || pub.gid !== pl.pub.gid;
    if (first) { logLines = []; hist = []; readySent = 0; }
    var prevTurn = pub ? pub.order[pub.turn] + ":" + pub.round : "";
    pub = pl.pub;
    if (room.host && prevTurn !== pub.order[pub.turn] + ":" + pub.round) room.turnStart = Date.now();
    if (first) {
      // on ne rejoue pas l'historique : seulement les nouveautés
      lastEv = pub.events.length ? pub.events[pub.events.length - 1].id : 0;
      if (pub.phase === "end") lastEv = Math.max(0, lastEv - 1);
      if (!room.host) store("qv-last", { code: room.code, host: false });
    }
    if (first) { shown = {}; dealt = {}; dealing = {}; prevReason = {}; syncShown(true); dealFirst = true; } else syncShown(false);
    pub.events.forEach(function (ev) { if (ev.id > lastEv) { lastEv = ev.id; onGameEvent(ev); } });
    if (priv) { handleDeal(dealFirst); dealFirst = false; }
    if (!queue.length && !playing) sendReady();
    if (screen === "editor" || screen === "rules") return;
    if (pub.phase === "end" && !queue.length && !playing) return renderEnd();
    renderGame();
  }
  var dealFirst = true;
  function receivePriv(p) {
    if (!p) return;
    priv = p;
    if (pub) { handleDeal(dealFirst); dealFirst = false; }
    if (screen === "game") { renderHand(); coachHand(); }
  }

  // ======================================================================
  //  ÉVÉNEMENTS → file de scènes
  // ======================================================================
  function card(k) { return D.byKey[k]; }
  function nameOf(id) { return pub && pub.players[id] ? pub.players[id].name : "?"; }

  // conséquences en une ligne (« Alice : −2 ★  +3 € ») pour ne pas multiplier les fenêtres
  // ---------- conséquences en toutes lettres ----------
  var RES_WORD = { b: "Bonheur", f: "Fortune", r: "Réputation" };
  function notesLine(notes) {
    if (!notes || !notes.length || !pub) return "";
    var by = {};
    notes.forEach(function (n) { (by[n.p] = by[n.p] || []).push(n); });
    return '<div class="qv-conseq">' + Object.keys(by).map(function (id) {
      return '<span class="cq"><b>' + esc(id === me.id ? "Toi" : nameOf(id)) + '</b> ' + by[id].map(function (n) {
        return '<i class="' + (n.v > 0 ? "up" : "down") + '">' + IC.get(n.k, "qv-ri") + (n.v > 0 ? "+" : "−") + Math.abs(n.v) + '</i>';
      }).join("") + '</span>';
    }).join("") + '</div>';
  }
  // bloc par personne touchée : portrait, prénom, ce qui change dans sa vie, ressources en mots
  function impactHTML(ev) {
    var by = {}, order = [];
    var add = function (id) { if (!by[id]) { by[id] = { t: [], n: [] }; order.push(id); } return by[id]; };
    if (ev.to) add(ev.to);
    (ev.changes || []).forEach(function (c) { add(c.p).t = add(c.p).t.concat(c.t); });
    (ev.notes || []).forEach(function (n) { add(n.p).n.push(n); });
    order = order.filter(function (id) { return by[id].t.length || by[id].n.length; });
    if (!order.length) return '<p class="rs-none">' + (ev.t === "block" ? "Attaque annulée : aucune conséquence !" : "Pas de changement visible.") + '</p>';
    return '<div class="rs-people">' + order.map(function (id) {
      var p = pub.players[id]; if (!p) return "";
      var bad = by[id].n.some(function (n) { return n.v < 0; }) && !by[id].n.some(function (n) { return n.v > 0; });
      return '<div class="rs-p">' + A.standalone(p.avatar, { mood: p.mood || (bad ? "sad" : "happy"), outfit: W.outfit(p) }, "rs-av", true) +
        '<div class="rs-body"><b class="rs-name">' + esc(id === me.id ? "Toi" : p.name) + '</b>' +
        by[id].t.map(function (t) { return '<span class="rs-life">' + esc(t) + '</span>'; }).join("") +
        '<span class="rs-res">' + sumNotes(by[id].n).map(function (n) { var from = sv(id, n.k), to = Math.max(0, from + n.v); return '<i class="' + (n.v > 0 ? "up" : "down") + '">' + IC.get(n.k, "qv-ri") + RES_WORD[n.k] + ' <span class="rs-from">' + from + '</span> → <b class="rs-num" data-from="' + from + '" data-to="' + to + '">' + from + '</b> <small>(' + (n.v > 0 ? "+" : "−") + Math.abs(n.v) + ')</small></i>'; }).join("") + '</span></div></div>';
    }).join("") + '</div>';
  }
  function sumNotes(ns) { var o = {}, order = []; ns.forEach(function (n) { if (!(n.k in o)) { o[n.k] = 0; order.push(n.k); } o[n.k] += n.v; }); return order.filter(function (k) { return o[k]; }).map(function (k) { return { k: k, v: o[k] }; }); }
  function headline(ev) {
    var c = card(ev.k) || {}, P = function (id) { return id === me.id ? "Tu" : nameOf(id); };
    if (ev.t === "season") { var e = D.EVENTS.filter(function (x) { return x.key === ev.k; })[0]; return "Événement pour tout le monde : " + (e ? e.name : ""); }
    if (ev.t === "status") return ev.text;
    if (ev.t === "block") return (ev.p === me.id ? "Tu contres" : nameOf(ev.p) + " contre") + " avec « " + (c.name || "") + " » !";
    if (ev.outcome === "soft") return (ev.to === me.id ? "Tu limites" : nameOf(ev.to) + " limite") + " les dégâts de « " + (c.name || "") + " ».";
    if (ev.to) return nameOf(ev.p) + " utilise « " + (c.name || "") + " » contre " + (ev.to === me.id ? "toi" : nameOf(ev.to)) + (ev.outcome === "reflected" ? " (retour à l'envoyeur)" : "") + " !";
    return (ev.p === me.id ? "Tu joues" : nameOf(ev.p) + " joue") + " « " + (c.name || "") + " »" + (ev.data && ev.data.lucky === true ? " : coup de chance !" : ev.data && ev.data.lucky === false ? " : raté…" : "");
  }
  var hist = [];
  function addHistory(ev) {
    if (["card", "block", "season", "status", "attack"].indexOf(ev.t) < 0) return;
    if (ev.t === "card" && ev.k === "garde") return;
    hist.unshift(ev); if (hist.length > 200) hist.pop();
  }
  // ----------------------------------------------------------------------
  //  TROIS NIVEAUX DE PRÉSENTATION
  //  · mineur : petite notification + compteurs qui bougent (aucune fenêtre)
  //  · important : une scène animée avec les personnages, puis ses conséquences dans la même vue
  //  · attaque contre moi : panneau d'interaction prioritaire (réagir)
  // ----------------------------------------------------------------------
  var MAJOR_TXT = /Nouveau métier|Perd son métier|Change de métier|Promotion|En couple|Nouveau couple|Marié|Divorcé|Rupture|Bébé|Emménage|Logement perdu|retraite|Fiancé|Gagne :|Garde alternée/;
  var MAJOR_SCENES = { lotoWin: 1, heritageWin: 1, investWin: 1, investFail: 1, startupWin: 1, startupFail: 1, demasque: 1, doubleVieBust: 1, garde: 1, renvoi: 1 };
  function importance(ev) {
    if (ev.t === "season") return "major";
    if (ev.t === "status") return ev.scene ? "major" : "minor";
    if (ev.t === "block") return ev.p === me.id || ev.to === me.id || ev.reflect ? "major" : "minor";
    if (ev.t !== "card") return "minor";
    var c = card(ev.k) || {};
    if (ev.k === "garde" || ev.combo || (ev.data && ev.data.busted)) return "major";
    if (ev.outcome === "soft") return ev.to === me.id ? "minor" : "minor";
    if (ev.to) return "major";
    if (c.target === "all") return "major";
    if (ev.scene && MAJOR_SCENES[ev.scene]) return "major";
    if ((ev.changes || []).some(function (x) { return x.t.some(function (t) { return MAJOR_TXT.test(t); }); })) return "major";
    return "minor";
  }
  // une ligne courte pour les actions mineures : qui, quoi, ce que ça change
  function shortLine(ev) {
    var c = card(ev.k) || {}, who = ev.p === me.id ? "Tu" : nameOf(ev.p);
    var res = sumNotes((ev.notes || []).filter(function (n) { return n.p === ev.p || (ev.to && n.p === ev.to); })).map(function (n) { return (n.v > 0 ? "+" : "−") + Math.abs(n.v) + " " + RES_WORD[n.k]; }).join(", ");
    var ch = (ev.changes || []).filter(function (x) { return x.p === ev.p; }).map(function (x) { return x.t[0]; })[0];
    if (ev.t === "block") return '<b>' + esc(nameOf(ev.p)) + '</b> contre « ' + esc(c.name || "") + ' »';
    if (ev.t === "status") return esc(ev.text || "");
    if (ev.outcome === "soft") return '<b>' + esc(ev.to === me.id ? "Tu limites" : nameOf(ev.to) + " limite") + '</b> les dégâts de « ' + esc(c.name || "") + ' »' + (res ? ' · ' + esc(res) : '');
    return '<i class="tk-card fam-' + c.fam + '">' + IC.get(c.icon) + '</i><span><b>' + esc(who) + '</b> ' + (ev.p === me.id ? "joues" : "joue") + ' « ' + esc(c.name || "") + ' »' + (ch ? ' · ' + esc(ch) : res ? ' · ' + esc(res) : '') + '</span>';
  }
  function onGameEvent(ev) {
    addHistory(ev);
    if (ev.t === "turn") {
      if (ev.skip) enqueue({ kind: "tick", text: ev.p === me.id ? "Arrêt maladie : tu passes ton tour" : nameOf(ev.p) + " est en arrêt maladie : tour passé", hold: 1600 });
      else if (ev.p === me.id) {
        enqueue({ kind: "tick", html: '<b>' + esc(ev.phase === "draw" ? "À toi : pioche !" : "À toi de jouer") + '</b>' + ((ev.info || []).length ? ' · ' + esc(ev.info.join(" · ")) : ''), k: "turn", sfx: "turn" });
        var mp = pub.players[me.id];
        if (mp && mp.job && (ev.notes || []).some(function (n) { return n.p === me.id && n.k === "f" && n.v > 0; })) coachMech("salary", "Salaire", "Ton métier te paie au début de chacun de tes tours.");
      }
      enqueue({ kind: "notes", notes: ev.notes });
    } else if (ev.t === "stage") {
      if (pub && pub.discovery && ev.stage > 1) enqueue({ kind: "stage", stage: ev.stage, title: ev.title, text: ev.text, dur: 6, sfx: "fanfare" });
    } else if (ev.t === "attack") {
      var ac = card(ev.k) || {};
      if (ev.to === me.id) enqueue({ kind: "tick", html: '<b>Attaque !</b> ' + esc(nameOf(ev.p)) + ' te joue « ' + esc(ac.name) + ' »', k: "alert", sfx: "alarm" });
      else if (ev.p !== me.id) enqueue({ kind: "tick", html: '<i class="tk-card fam-' + ac.fam + '">' + IC.get(ac.icon) + '</i><span><b>' + esc(nameOf(ev.p)) + '</b> vise ' + esc(nameOf(ev.to)) + ' avec « ' + esc(ac.name) + ' »…</span>', sfx: "card", hold: 1200 });
      enqueue({ kind: "notes", notes: ev.notes });
    } else if (ev.t === "card" || ev.t === "block" || ev.t === "status" || ev.t === "season") {
      var selfCard = ev.t === "card" && ev.outcome === "self";
      if (selfCard && !ev.scene && (ev.changes || []).some(function (c) { return c.p === ev.p; })) ev = Object.assign({}, ev, { scene: "vie" });
      if (importance(ev) === "major") {
        enqueue({ kind: "scene", ev: ev, extra: ev.bounce && ev.to ? (ev.to === me.id ? "Tu rebondis : " : nameOf(ev.to) + " rebondit : ") + ev.bounce.toLowerCase() + ", et 2 cartes à jouer au prochain tour." : (ev.spite ? "Dossier balancé : " + nameOf(ev.p) + " perd aussi 3 de réputation !" : "") });
      } else {
        enqueue({ kind: "tick", html: shortLine(ev), hold: ev.p === me.id ? 600 : 1500, sfx: ev.p === me.id ? null : "pop" });
      }
      enqueue({ kind: "notes", notes: ev.notes, hit: affected(ev), ev: ev });
      if (ev.t === "season") coachMech("season", "Événements de saison", "De temps en temps, un événement touche toute la table.");
    } else if (ev.t === "rest") {
      enqueue({ kind: "notes", notes: ev.notes });
      if (ev.p !== me.id && pub.phase !== "end") enqueue({ kind: "tick", text: nameOf(ev.p) + " défausse « " + (card(ev.k) || {}).name + " »", hold: 900 });
    } else if (ev.t === "took") {
      if (ev.p !== me.id) enqueue({ kind: "tick", text: nameOf(ev.p) + " reprend « " + (card(ev.k) || {}).name + " » dans la défausse", hold: 1200 });
    } else if (ev.t === "end") {
      enqueue({ kind: "banner", text: "Fin de partie !", sub: "Le moment de faire les comptes…", dur: 2.5, sfx: "win" });
      if (pub && pub.discovery) store("qv-tuto-done", true);
    }
    if (ev.text) addLog(ev);
  }
  function affected(ev) {
    var ids = {}; if (ev.p) ids[ev.p] = 1; if (ev.to) ids[ev.to] = 1;
    (ev.changes || []).forEach(function (c) { ids[c.p] = 1; });
    (ev.notes || []).forEach(function (n) { ids[n.p] = 1; });
    return Object.keys(ids);
  }

  // ---------- présentations « Nouveau ! » (mode découverte, non bloquantes, mémorisées) ----------
  var seen = store("qv-seen") || {}, coachQ = [], coachOn = false;
  function markSeen(k) { seen[k] = 1; store("qv-seen", seen); }
  function coach(key, title, text, icon) {
    if (!pub || !pub.discovery || seen[key]) return;
    if (coachQ.some(function (c) { return c.key === key; })) return;
    coachQ.push({ key: key, title: title, text: text, icon: icon });
    if (!coachOn) nextCoach();
  }
  function coachMech(key, title, text) { coach("m:" + key, title, text, null); }
  function nextCoach() {
    var c = coachQ.shift();
    if (!c) { coachOn = false; return; }
    coachOn = true; markSeen(c.key);
    notify('<b>Nouveau : ' + esc(c.title) + '</b> ' + esc(c.text), "new", 6500, true);
    setTimeout(nextCoach, 6600);
  }
  // messages : ils remplacent un instant la ligne d'état en haut, sans rien recouvrir
  var tickQ = [], tickOn = false, tickPin = "";
  function notify(html, kind, ms, isHtml) {
    if (screen !== "game" || !$("#ticker")) { var tmp = document.createElement("div"); tmp.innerHTML = html; floatToast(isHtml ? tmp.textContent : html); return; }
    var m = { h: isHtml ? html : esc(html), k: kind || "", ms: ms || 2800 };
    // un message remplace le précédent (jamais deux messages l'un sur l'autre) ; le journal garde tout
    if (tickQ.length >= 2) tickQ.splice(0, tickQ.length - 1);
    tickQ.push(m);
    if (!tickOn) nextTick();
  }
  var tickT = null;
  function nextTick() {
    var el = $("#ticker");
    var m = tickQ.shift();
    clearTimeout(tickT);
    if (!m || !el) { tickOn = false; if (el) { if (tickPin) { el.innerHTML = tickPin; el.className = "g-toast on pin"; } else el.className = "g-toast"; } return; }
    tickOn = true;
    el.innerHTML = /^<i class="(tk-card|tk-ico)/.test(m.h) ? m.h : '<span class="tk-t">' + m.h + '</span>'; el.className = "g-toast " + m.k; void el.offsetWidth; el.classList.add("on");
    tickT = setTimeout(nextTick, tickQ.length ? Math.min(m.ms, 1600) : m.ms);
  }
  function pinTick(html) {
    tickPin = html || "";
    var el = $("#ticker"); if (!el || tickOn) return;
    if (tickPin) { el.innerHTML = tickPin; el.className = "g-toast on pin"; } else el.className = "g-toast";
  }
  function coachHand() {
    if (!priv || !pub || !pub.discovery) return;
    var p = pub.players[me.id]; if (!p) return;
    if (isMyTurn() && priv.hand.some(function (h) { return E.canPlay(pub, me.id, h.k) && !(card(h.k).reaction && !card(h.k).alsoPlay); })) coachMech("lock", "Cartes grisées", "Une carte grisée ne peut pas être jouée pour l'instant : la raison est écrite dessus.");
    Object.keys(p.st || {}).forEach(function (k) { var d = D.STATUSES[k]; if (d) coachMech("st:" + k, d.label, "Un état durable : il s'affiche sur ton personnage et agit à chacun de tes tours tant qu'il dure."); });
    if (pub.stage >= 3) coachMech("obj", "Objectifs secrets", "Tu as 2 objectifs secrets (bouton « Mes objectifs »). Remplis-les avant la fin : ils rapportent beaucoup de points.");
    if (p.rebound) coachMech("rebound", "Rebond", "Après une catastrophe encaissée, tu joues 2 cartes au prochain tour. On se relève toujours !");
  }
  var pillT = null;
  function turnPill(t, sub) { notify('<b>' + esc(t) + '</b>' + (sub ? ' ' + esc(sub) : ''), "turn", 2400, true); }
  var logLines = [];
  function addLog(ev) { logLines.unshift({ id: ev.id, text: ev.text, t: ev.t }); if (logLines.length > 30) logLines.pop(); }

  function enqueue(item) {
    if (item.kind === "notes" && (!item.notes || !item.notes.length) && !item.hit) return;
    queue.push(item);
    if (!playing) next();
  }
  var sceneTimers = [], countT = null;
  var nextRetry = null, readySent = 0;
  // fin de la séquence : on signale qu'on est prêt (synchronisation des joueurs)
  function sendReady() {
    if (!pub || !pub.gate || readySent === pub.gate.id || queue.length || playing) return;
    readySent = pub.gate.id;
    if (room.host) hostReady(me.id, pub.gate.id);
    else if (room.net) room.net.send("ready", { id: me.id, gate: pub.gate.id });
  }
  // ======================================================================
  //  DIRECTEUR D'AFFICHAGE : machine à états, phases exclusives
  //  idle → drawing → cardPreview → (targetSelection) → resolving → animation → results → returningToBoard → idle
  //  Une seule fenêtre importante à la fois ; une fenêtre fermée disparaît vraiment avant la suivante.
  // ======================================================================
  var UI = { phase: "idle", since: Date.now() };
  var PHASE_OF = { tick: "returningToBoard", deal: "drawing", newcard: "drawing", announce: "cardPreview", scene: "animation", result: "results", banner: "results", stage: "results", notes: "returningToBoard" };
  function setPhase(ph) {
    if (UI.phase === ph) return;
    UI.phase = ph; UI.since = Date.now();
    document.body.setAttribute("data-qv-phase", ph);
    if (ph !== "idle") hideHint();
  }
  function busy() { return UI.phase !== "idle" || queue.length || playing; }
  // la fenêtre active (une seule) : on la ferme en douceur, puis seulement on continue
  function closeLayer(cb) {
    var ov = $("#ov");
    if (!ov) { cb && cb(); return; }
    ov.removeAttribute("id"); ov.classList.add("out"); ov.onclick = null;
    var done = false, fin = function () { if (done) return; done = true; if (ov.parentNode) ov.remove(); cb && cb(); };
    if (reduce) fin(); else setTimeout(fin, 170);
  }
  function openLayer(kind) {
    var ov = document.createElement("div"); ov.id = "ov"; ov.className = "qv-ov k-" + kind;
    ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true");
    document.body.appendChild(ov);
    return ov;
  }
  // la carte qui vole depuis la main ne doit jamais rester par-dessus une fenêtre
  function clearGhost() { $$(".qv-ghost").forEach(function (g) { g.remove(); }); }
  var sheetWait = 0;
  function next() {
    sceneTimers.forEach(clearTimeout); sceneTimers = []; clearInterval(countT);
    clearTimeout(nextRetry);
    if (introOpen) { playing = null; closeLayer(); nextRetry = setTimeout(next, 500); return; }
    // une fiche ouverte par le joueur (menu, journal, détails) : on attend qu'il la ferme (au plus 6 s)
    var sh = $("#sheet");
    if (queue.length && sh && !sh.hidden && PHASE_OF[queue[0].kind] !== "returningToBoard" && queue[0].kind !== "deal") {
      if (!sheetWait) sheetWait = Date.now();
      if (Date.now() - sheetWait < 6000) { playing = null; setPhase("idle"); notify("<b>Nouvel événement</b> : ferme la fiche pour le voir", "", 1500, true); nextRetry = setTimeout(next, 600); return; }
      closeSheet();
    }
    sheetWait = 0;
    var it = queue.shift() || null;
    // la fenêtre précédente disparaît d'abord, sauf si la suivante n'en utilise pas
    if ($("#ov")) {
      playing = it || { kind: "closing" };
      if (it) queue.unshift(it);
      closeLayer(function () { playing = null; next(); });
      return;
    }
    playing = it;
    if (!playing) {
      // rattrapage : une carte dont la distribution a été interrompue apparaît quand même
      Object.keys(dealing).forEach(function (u) { dealt[u] = 1; delete dealing[u]; });
      if (priv && pub && !dealFirst) priv.hand.forEach(function (c) { if (!dealt[c.u]) dealt[c.u] = 1; });
      clearGhost(); setPhase("idle"); queueEmptyAt = Date.now();
      if (pub) { reconcile(); if (pub.phase === "end") renderEnd(); else renderGame(); }
      sendReady(); return;
    }
    setPhase(PHASE_OF[it.kind] || "results");
    if (it.kind === "tick") {
      // message court dans la barre du haut, à son tour dans la séquence (jamais en avance sur l'écran)
      if (it.html) notify(it.html, it.k || "", it.ms || 2800, true); else notify(it.text, "", 2800);
      if (it.sfx) SND.play(it.sfx);
      // les actions mineures restent lisibles un instant, sans fenêtre ni bouton
      if (it.hold && !reduce) { sceneTimers.push(setTimeout(function () { if (playing === it) { playing = null; next(); } }, it.hold)); return; }
      playing = null; next(); return;
    }
    if (it.kind === "notes") {
      clearGhost();
      if (it.hit) flashTiles(it.hit);
      flyToZone(it.ev);
      careerFeel(it.ev);
      animateNotes(it.notes, null, function () { if (playing === it) { playing = null; setTimeout(next, reduce ? 0 : 120); } });
      return;
    }
    if (it.kind === "deal") {
      var cards = it.cards.slice();
      (function nextCard() {
        if (playing !== it) return;
        var c0 = cards.shift(); if (!c0) { playing = null; next(); return; }
        if (!priv || !priv.hand.some(function (h) { return h.u === c0.u; })) { delete dealing[c0.u]; nextCard(); return; }
        dealOne(c0, function () {
          // première découverte : chaque nouvelle carte est présentée, on avance avec « Suivante »
          if (pub && pub.discovery && pub.stage <= 2 && !seen[c0.k]) { queue.unshift({ kind: "newcard", k: c0.k, more: cards.length }); if (cards.length) queue.splice(1, 0, { kind: "deal", cards: cards }); playing = null; next(); return; }
          nextCard();
        });
      })();
      return;
    }
    clearGhost();
    var ov = openLayer(it.kind);
    ov.dataset.kind = it.kind;
    var dur = it.dur || 2, html = "", manual = false, label = "Continuer ›", auto = 0;
    var ev = it.ev, c = ev ? (card(ev.k) || {}) : {};
    if (it.kind === "banner") {
      html = '<div class="qv-banner"><b>' + esc(it.text) + '</b>' + (it.sub ? '<span>' + esc(it.sub) + '</span>' : '') + notesLine(it.notes) + '</div>';
    } else if (it.kind === "newcard") {
      markSeen(it.k);
      html = '<div class="nc-box"><p class="nc-h">Nouvelle carte !</p><div class="nc-card">' + cardHTML(it.k, { big: true, mine: true }) + '</div></div>';
      manual = true; auto = 25; label = it.more ? "Suivante ›" : "Compris !";
      SND.play("pop");
    } else if (it.kind === "stage") {
      html = '<div class="qv-banner stage"><small>Découverte · étape ' + it.stage + '/5</small><b>' + esc(it.title) + '</b><span>' + esc(it.text) + '</span></div>';
      manual = true; auto = 12;
    } else if (it.kind === "announce") {
      // 1. PRÉSENTATION : l'auteur, la carte, la cible, ce qui va se passer
      var actor = pub.players[ev.p], tgt = ev.to ? pub.players[ev.to] : null;
      var eff = (window.QV_CARDS.EFF[ev.k] || c.text || "");
      var tgtAll = c.target === "all";
      html = '<div class="an-box"><p class="an-h">' + esc(headline(ev)) + '</p><div class="an-stage">' +
        '<div class="an-who">' + A.standalone(actor.avatar, { mood: "smug", outfit: W.outfit(actor), pose: tgt ? "hips" : "wave" }) + '<b>' + esc(ev.p === me.id ? "Toi" : actor.name) + '</b></div>' +
        '<div class="an-card">' + cardHTML(ev.k, { mine: ev.p === me.id }) + '</div>' +
        (tgt ? '<div class="an-who tgt">' + A.standalone(tgt.avatar, { mood: "worried", outfit: W.outfit(tgt) }) + '<b>' + esc(ev.to === me.id ? "Toi" : tgt.name) + '</b></div>' : '') +
        '</div><p class="an-what"><b>' + (tgtAll ? "Pour toute la table" : tgt ? "Sur " + esc(ev.to === me.id ? "toi" : tgt.name) : "Pour " + esc(ev.p === me.id ? "toi" : actor.name)) + ' :</b> ' + esc(eff) + '</p>' +
        (tgt ? '<p class="an-next">' + (ev.to === me.id ? "À toi de réagir !" : esc(tgt.name) + " peut encore se défendre…") + '</p>' : '') + '</div>';
      manual = true; auto = it.short ? 3 : 6; label = ev.to === me.id ? "Réagir ›" : "Continuer ›";
    } else if (it.kind === "result") {
      // 4. CONSÉQUENCES : restent affichées jusqu'à « Continuer »
      var head = ev.t === "season" ? (D.EVENTS.filter(function (x) { return x.key === ev.k; })[0] || {}) : null;
      html = '<div class="rs-box"><p class="rs-h">' + esc(headline(ev)) + '</p>' +
        (ev.combo ? '<p class="rs-combo"><b>Combo !</b> ' + esc(ev.combo) + '</p>' : '') +
        (head ? '<div class="rs-season">' + IC.get(head.icon) + '<div><b>' + esc(head.name) + '</b><span>' + esc(head.text) + '</span></div></div>' : '') +
        '<p class="rs-sub">Ce qui a changé</p>' + impactHTML(ev) +
        (it.extra ? '<p class="rs-extra">' + esc(it.extra) + '</p>' : '') + '</div>';
      manual = true; auto = ev.p === me.id && !ev.to ? 10 : 20;
    } else if (it.kind === "scene") {
      // SCÈNE : les personnages en action, puis les conséquences dans la même vue (pas de fenêtre en plus)
      var sc = ev.scene ? W.scene(ev, pub) : null, panel = "";
      var TITLES = { garde: "Garde alternée", block: "Paré !", renvoi: "Retour à l'envoyeur", startupWin: "Levée de fonds !", startupFail: "Faillite", demasque: "Démasqué·e !", doubleVieBust: "La double vie éclate", burnout: "Burn-out", vie: "" };
      var title = ev.t === "season" ? "Événement pour tout le monde" : (TITLES[ev.scene] !== undefined && TITLES[ev.scene] !== "" ? TITLES[ev.scene] : (ev.t === "status" ? (D.STATUSES[ev.s] || {}).label : "") || c.name || "");
      if (!sc) {
        var head = ev.t === "season" ? (D.EVENTS.filter(function (x) { return x.key === ev.k; })[0] || {}) : null;
        panel = head ? '<div class="cin-panel">' + IC.get(head.icon) + '<div><b>' + esc(head.name) + '</b><span>' + esc(head.text) + '</span></div></div>'
          : '<div class="cin-panel">' + (c.icon ? IC.get(c.icon) : "") + '<div><b>' + esc(headline(ev)) + '</b></div></div>';
      }
      var times = (seen["sc:" + ev.scene] || 0); if (ev.scene && !it.replay) { seen["sc:" + ev.scene] = times + 1; store("qv-seen", seen); }
      var animDur = sc ? (times >= 2 ? Math.min(sc.dur, 2.2) : sc.dur) : 0.6;
      var cons = impactHTML(ev, true);
      html = '<div class="cin' + (pub && pub.mode === "adult" ? " adult" : "") + '"><div class="cin-top"><b>' + esc(title) + '</b>' + (times >= 1 && sc && !it.replay ? '<button class="cin-skip" type="button" data-ov="skip">Passer ›</button>' : '') + '</div>' +
        (sc ? '<div class="cin-view">' + sc.svg + '</div><p class="cin-cap">' + sc.caption + '</p>' : panel) +
        '<div class="cin-cons" id="cincons">' + cons + (it.extra ? '<p class="rs-extra">' + esc(it.extra) + '</p>' : '') + (ev.combo ? '<p class="rs-combo"><b>Combo !</b> ' + esc(ev.combo) + '</p>' : '') + '</div></div>';
      if (sc) (sc.sfx || []).forEach(function (f) { sceneTimers.push(setTimeout(function () { SND.play(f[1]); }, f[0] * 1000)); });
      // durée : la scène, puis assez de temps pour lire les conséquences
      dur = animDur + 0.4 + Math.min(6, 2.6 + (cons.replace(/<[^>]+>/g, "").length + (it.extra || "").length) / 45);
      it.consAt = animDur;
      label = it.replay ? "Fermer" : "Continuer ›";
    }
    ov.innerHTML = '<div class="ov-body">' + html + '</div><div class="ov-foot"><button class="qv-skip' + (manual ? " go" : "") + '" type="button" data-ov="next">' + label + '</button>' +
      (manual ? '<span class="ov-auto" id="ovauto"></span>' : '<div class="qv-prog"><i style="animation-duration:' + dur + 's"></i></div>') + '</div>';
    if (it.sfx) SND.play(it.sfx);
    if (it.kind === "scene") {
      var cc = $("#cincons", ov);
      if (cc) { cc.style.animationDelay = it.consAt + "s"; sceneTimers.push(setTimeout(function () { if (playing === it) { countUp(ov); var me_ = (ev.notes || []).filter(function (n) { return n.p === me.id; }); if (me_.length) SND.play(me_.some(function (n) { return n.v < 0; }) ? "sad" : "coin"); } }, it.consAt * 1000)); }
    }
    if (it.kind === "result") { var good = (ev.notes || []).some(function (n) { return n.p === me.id && n.v > 0; }), badm = (ev.notes || []).some(function (n) { return n.p === me.id && n.v < 0; }); SND.play(badm ? "sad" : good ? "coin" : "ding"); countUp(ov); }
    // un clic sur le fond ne fait plus défiler par erreur : seulement le bouton
    var once = false;
    ov.onclick = function (e) {
      if (once) return;
      var sk = e.target.closest("[data-ov=skip]");
      // une scène se passe d'un toucher n'importe où (une fois la scène jouée), ou avec « Passer »
      if (!sk && !e.target.closest("[data-ov=next]") && !(it.kind === "scene" && Date.now() - UI.since > (it.consAt || 0) * 1000)) return;
      once = true; SND.play("tap"); if (playing === it) { playing = null; next(); }
    };
    if (manual) {
      var left = auto, el = $("#ovauto");
      var tick = function () { if (el) el.textContent = "suite automatique dans " + left + " s"; };
      tick();
      countT = setInterval(function () { left--; if (left <= 0) { clearInterval(countT); if (playing === it) { playing = null; next(); } } else tick(); }, 1000);
    } else sceneTimers.push(setTimeout(function () { if (playing === it) { playing = null; next(); } }, dur * 1000));
  }
  // progression : la Formation monte, des métiers s'illuminent, le salaire apparaît
  function careerFeel(ev) {
    if (!ev || !ev.data || !pub) return;
    var mine = ev.p === me.id && !ev.to;
    if (mine && ev.data.edu && ev.data.edu.to > ev.data.edu.from) {
      var a = ev.data.edu.from, b = ev.data.edu.to, pill = $("#mb-edu");
      if (pill) { pill.classList.remove("pop"); void pill.offsetWidth; pill.classList.add("pop"); }
      var unl = Object.keys(D.JOBS).filter(function (k) { var J = D.JOBS[k]; return J.card && !J.study && J.edu > a && J.edu <= b; }).map(function (k) { return D.JOBS[k].titles[0]; });
      SND.play("unlock");
      notify('<i class="tk-ico">' + IC.get("gradcap") + '</i><b>Formation ' + b + ' !</b> ' + (unl.length ? "Nouveaux métiers : " + esc(unl.join(", ")) : "Ton parcours avance."), "unlock", 3800, true);
    }
    if (mine && ev.data.hired) {
      var J = D.JOBS[ev.data.hired], p = pub.players[me.id];
      notify('<i class="tk-ico">' + IC.get("tie") + '</i><b>Embauché·e !</b> ' + esc(p.title) + ' · +' + p.salary + ' € à chaque tour', "unlock", 3400, true);
    }
  }
  // résultats : les variations défilent dans la fenêtre (valeur avant → après)
  function countUp(ov) {
    $$(".rs-num", ov).forEach(function (el, i) {
      var a = +el.dataset.from, b = +el.dataset.to, n = 0, steps = Math.min(8, Math.abs(b - a));
      if (!steps || reduce) { el.textContent = b; return; }
      setTimeout(function step() { n++; el.textContent = Math.round(a + (b - a) * n / steps); el.classList.add("tick"); if (n < steps) setTimeout(step, 90); }, 350 + i * 220);
    });
  }
  // la carte jouée rejoint la bonne zone : parcours / vie (carte permanente) ou défausse (usage unique)
  function flyToZone(ev) {
    if (!ev || ev.t !== "card" || !card(ev.k) || reduce || ev.k === "garde") return;
    var mine = ev.p === me.id, dest;
    if (ev.zone) dest = mine ? $(".g-id") : $('.g-opp[data-pid="' + ev.p + '"]');
    else dest = $(".pile.disc");
    if (!dest) return;
    var c = card(ev.k), el = document.createElement("div");
    el.className = "qv-flymini fam-" + c.fam; el.innerHTML = IC.get(c.icon);
    document.body.appendChild(el);
    var b = center(dest), a = { x: innerWidth / 2, y: innerHeight * 0.42 };
    var an = el.animate([{ transform: "translate(" + (a.x - 22) + "px," + (a.y - 30) + "px) scale(1.4)", opacity: 1 }, { transform: "translate(" + (b.x - 22) + "px," + (b.y - 30) + "px) scale(.5)", opacity: 0.85 }], { duration: 560, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" });
    an.onfinish = function () { el.remove(); dest.classList.remove("got"); void dest.offsetWidth; dest.classList.add("got"); };
  }
  function flashTiles(ids) {
    setTimeout(function () {
      ids.forEach(function (id) {
        var el = id === me.id ? $(".qv-mytile") : $('.g-opp[data-pid="' + id + '"]');
        if (el) { el.classList.remove("changed"); void el.offsetWidth; el.classList.add("changed"); }
      });
    }, 250);
  }
  function closeScene() { closeLayer(); }

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
  function cardHTML(k, o) { return window.QV_CARDS.html(k, o); }

  // ======================================================================
  //  SALON
  // ======================================================================
  function renderLobby() {
    if (!room) return;
    var host = room.host, list = room.lobby || [];
    var link = location.origin + location.pathname + "#" + room.code;
    show("lobby", '<div class="qv-page">' + logo(true) +
      (room.solo ? '<h2>Partie d\'essai contre des bots</h2>' : '<div class="qv-code"><span>Code du salon</span><b>' + esc(room.code) + '</b><button class="qv-btn alt sm" data-l="share">Inviter des amis</button></div>') +
      '<h2>Joueurs (' + list.length + '/6)</h2>' +
      '<div class="qv-lobby">' + list.map(function (p) {
        var on = p.bot || p.id === me.id || present(p.id) || (!host && p.id === room.hostId);
        var ok18 = room.opts && room.opts.mode === "adult" && !p.bot ? (p.id === me.id ? room.adultOk : p.adultOk) : undefined;
        return '<div class="qv-lp' + (on ? "" : " off") + '">' + A.standalone(p.avatar, { mood: "happy" }, "lp-av", true) + '<span>' + esc(p.name) + (p.id === (room.hostId || me.id) && !p.bot ? ' <i>hôte</i>' : '') + (p.bot ? ' <i>bot</i>' : '') + (p.id === me.id ? ' <i>toi</i>' : '') +
          (ok18 === true ? ' <i class="ok">18+ OK</i>' : ok18 === false ? ' <i class="no">refuse le 18+</i>' : ok18 === null || (ok18 === undefined && room.opts && room.opts.mode === "adult" && !p.bot) ? ' <i class="wait">18+ ?</i>' : '') + '</span>' +
          (host && p.bot ? '<button class="x" data-l="rm" data-id="' + p.id + '" aria-label="Retirer">×</button>' : '') + '</div>';
      }).join("") + '</div>' +
      optsPanel(host) +
      (host ? '<div class="qv-actions">' +
        (list.length < 6 ? '<button class="qv-btn ghost" data-l="bot">+ Ajouter un bot</button>' : '') +
        '<button class="qv-btn big" data-l="start"' + (list.length < 2 || adultBlockers().length ? " disabled" : "") + '>Lancer la partie</button>' +
        (adultBlockers().length ? '<p class="qv-note warn">Mode 18+ : en attente de l\'accord de ' + esc(adultBlockers().map(function (p) { return p.id === me.id ? "toi" : p.name; }).join(", ")) + '.</p>' : '') +
        '<p class="qv-note">Partage le code ou le lien : tes amis l\'ouvrent sur leur téléphone. 2 à 6 joueurs, les bots complètent la table.</p></div>'
        : '<p class="qv-wait">En attente que l\'hôte lance la partie…</p>') +
      '<div class="qv-row2"><button class="qv-btn ghost" data-l="avatar">Modifier mon personnage</button><button class="qv-btn ghost" data-l="leave">Quitter</button></div>' +
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
      else if (l === "fmt") { room.opts.format = b.dataset.v; hostBroadcast(); renderLobby(); }
      else if (l === "mode") { room.opts.mode = b.dataset.v; if (b.dataset.v === "adult") { room.adultOk = undefined; room.lobby.forEach(function (p) { p.adultOk = null; }); } hostBroadcast(); renderLobby(); }
      else if (l === "disc") { room.opts.discovery = b.dataset.v === "1"; hostBroadcast(); renderLobby(); }
      else if (l === "ok18") { room.adultOk = b.dataset.v === "1"; if (host) { var mine = room.lobby.filter(function (p) { return p.id === me.id; })[0]; if (mine) mine.adultOk = room.adultOk; hostBroadcast(); } else sendHello(); renderLobby(); }
      else if (l === "avatar") { if (me.made) editor(null, {}); else creator(); }
      else if (l === "leave") { if (!host && room.net) room.net.send("bye", { id: me.id }); store("qv-last", null); window.history.replaceState(null, "", location.pathname + location.search); home(); }
    };
  }

  // options de partie (l'hôte choisit, tout le monde voit ; accord 18+ individuel)
  function optsPanel(host) {
    var o = room.opts || { mode: "classic", discovery: true }, adultOn = o.mode === "adult";
    var h = '<div class="qv-opts">';
    h += '<div class="qv-opt-row"><span>Mode de jeu</span><div class="qv-seg">' +
      '<button class="seg' + (!adultOn ? " on" : "") + '" data-l="mode" data-v="classic"' + (host ? "" : " disabled") + '><b>Classique</b><small>Humour absurde, carrière, famille, coups bas</small></button>' +
      '<button class="seg adult' + (adultOn ? " on" : "") + '" data-l="mode" data-v="adult"' + (host ? "" : " disabled") + '><b>Trash &amp; Adulte 18+</b><small>Infidélités, afters ratés, vengeances, humour noir</small></button></div></div>';
    h += '<div class="qv-opt-row"><span>Règles</span><div class="qv-seg">' +
      '<button class="seg' + (o.discovery ? " on" : "") + '" data-l="disc" data-v="1"' + (host ? "" : " disabled") + '><b>Découverte</b><small>Les cartes arrivent petit à petit</small></button>' +
      '<button class="seg' + (!o.discovery ? " on" : "") + '" data-l="disc" data-v="0"' + (host ? "" : " disabled") + '><b>Expert</b><small>Tout le jeu dès le début</small></button></div></div>';
    var fm = o.format || "classique";
    h += '<div class="qv-opt-row"><span>Durée</span><div class="qv-seg three">' + Object.keys(D.FORMATS).map(function (k) { var F = D.FORMATS[k]; return '<button class="seg' + (fm === k ? " on" : "") + '" data-l="fmt" data-v="' + k + '"' + (host ? "" : " disabled") + '><b>' + F.name + '</b><small>' + F.hint + '</small></button>'; }).join("") + '</div></div>';
    if (adultOn) {
      h += '<div class="qv-18"><p><b>Mode réservé aux adultes.</b> Humour osé, noir et irrévérencieux (infidélités, soirées qui tournent mal, scandales), sans contenu sexuel explicite. Chaque joueur doit être majeur et accepter.</p>' +
        (room.adultOk === true ? '<p class="ok">Tu as accepté. <button class="link" data-l="ok18" data-v="0">Retirer mon accord</button></p>'
          : '<div class="qv-row2"><button class="qv-btn good sm" data-l="ok18" data-v="1">J\'ai 18 ans ou plus, j\'accepte</button><button class="qv-btn ghost sm" data-l="ok18" data-v="0">Je refuse</button></div>') +
        (room.adultOk === false && !host ? '<p class="qv-note">Tu as refusé : la partie ne peut pas commencer en 18+. L\'hôte peut repasser en mode classique.</p>' : '') + '</div>';
    }
    return h + '</div>';
  }

  // ======================================================================
  //  ÉCRAN DE JEU
  // ======================================================================
  function isMyTurn() { return pub && pub.phase === "play" && pub.order[pub.turn] === me.id; }
  function myDraw() { return pub && pub.phase === "draw" && pub.order[pub.turn] === me.id && !pub.gate; }

  function resRow(p, big) {
    return ["b", "f", "r"].map(function (k) {
      return '<span class="qv-res r-' + k + (big ? " big" : "") + '" data-r="' + k + '" title="' + RES[k].name + '">' + IC.get(k, "qv-ri") + '<b>' + (p.id ? sv(p.id, k) : p[k]) + '</b></span>';
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
    Object.keys(p.st || {}).forEach(function (k) {
      var d = D.STATUSES[k]; if (!d) return;
      o.push('<span class="st ' + (d.bad ? "bad" : "good") + '">' + esc(d.label) + (p.st[k] < 50 ? " (" + p.st[k] + ")" : "") + '</span>');
    });
    (p.items || []).forEach(function (k) { if (k === "dog" || k === "tattoo") o.push('<span class="st">' + esc(D.ITEMS[k].name) + '</span>'); });
    return o.join("");
  }

  // ---------- icônes de vie : la situation d'un joueur en un coup d'œil ----------
  function lifeIcons(p) {
    var o = [], mini = function (k, t, n) { return '<span class="li" title="' + esc(t) + '">' + IC.get(k, "li-i") + (n ? '<b>' + n + '</b>' : '') + '</span>'; };
    if (p.edu) o.push(mini("gradcap", "Formation " + p.edu, p.edu));
    if (p.job) o.push(mini("tie", p.title)); else if (p.retired) o.push(mini("hammock", "Retraité·e"));
    if (p.partner) o.push(mini(p.married ? "rings" : "heart", (p.married ? "Marié·e à " : "En couple avec ") + p.partner.name));
    if (p.kids.length) o.push(mini("baby", p.kids.length + " enfant(s)", p.kids.length > 1 ? p.kids.length : ""));
    if (p.housing) o.push(mini(p.housing === 3 ? "villa" : p.housing === 2 ? "house" : "flat", D.HOUSING[p.housing]));
    (p.items || []).forEach(function (k) { var ic = { car: "car", hamster: "hamster", dog: "dog", toaster: "toaster", tattoo: "heart" }[k]; if (ic && k !== "tattoo") o.push(mini(ic, D.ITEMS[k].name)); });
    if (p.scandal || Object.keys(p.st || {}).some(function (k) { return D.STATUSES[k] && D.STATUSES[k].bad; })) o.push('<span class="li bad" title="Ennuis en cours">!</span>');
    return '<span class="lifes">' + o.join("") + '</span>';
  }

  // ---------- plateau personnel : la vie de chacun, rangée par catégories ----------
  function boardSheet(id) {
    var q = pub.players[id]; if (!q) return;
    var mine = id === me.id, st = q.st || {};
    var stLabel = function (k) { var d = D.STATUSES[k]; return d ? d.label + (st[k] < 50 ? " (" + st[k] + " tour" + (st[k] > 1 ? "s" : "") + ")" : "") : ""; };
    var slot = function (icon, title, items, empty) {
      return '<div class="bd-slot"><div class="bd-h">' + IC.get(icon, "bd-i") + '<b>' + title + '</b></div>' +
        (items.length ? items.map(function (t) { return '<div class="bd-c">' + t + '</div>'; }).join("") : '<div class="bd-c empty">' + empty + '</div>') + '</div>';
    };
    var work = [], rel = [], fam = [], home_ = [], poss = [], trouble = [];
    if (q.job) work.push('<b>' + esc(q.title) + '</b><small>+' + q.salary + ' € à chaque tour</small>');
    if (q.retired) work.push('<b>Retraité·e</b><small>pension ' + (q.pension || 0) + ' € par tour</small>');
    if (st.fakeDip) work.push('<em class="bad">Diplôme douteux</em>');
    ["burnout", "chomage", "chompartiel"].forEach(function (k) { if (st[k]) work.push('<em class="' + (D.STATUSES[k].bad ? "bad" : "") + '">' + esc(stLabel(k)) + '</em>'); });
    if (q.startup) work.push('Start-up : verdict dans ' + q.startup + ' tour(s)');
    if (st.liar) work.push('<em class="bad">' + esc(stLabel("liar")) + '</em>');
    if (q.partner) rel.push(A.standalone(A.random(q.partner.seed), { mood: "happy", outfit: q.partner.look || "casual" }, "bd-av", true) + '<b>' + esc(q.partner.name) + '</b><small>' + (q.married ? "Marié·e" : "En couple") + '</small>');
    ["ex", "doublevie", "sugar"].forEach(function (k) { if (st[k]) rel.push('<em class="bad">' + esc(stLabel(k)) + '</em>'); });
    q.kids.forEach(function (k) { fam.push(A.standalone(A.random(k.seed, q.avatar), { kid: true, mood: "happy" }, "bd-av", true) + '<b>' + esc(k.name) + '</b>'); });
    if (q.garde) fam.push('<small>Garde alternée' + (q.kidsAway ? " : chez l'autre parent cette semaine" : "") + '</small>');
    if (st.babyinf) fam.push('<em>' + esc(stLabel("babyinf")) + '</em>');
    home_.push('<b>' + esc(D.HOUSING[q.housing]) + '</b>');
    ["squat", "proces"].forEach(function (k) { if (st[k]) home_.push('<em class="bad">' + esc(stLabel(k)) + '</em>'); });
    (q.items || []).forEach(function (k) { poss.push(esc(D.ITEMS[k].name) + (D.ITEMS[k].income ? ' <small>+1 € par tour</small>' : '')); });
    if (q.scandal) trouble.push('<em class="bad">Scandale (' + q.scandal + ' tour' + (q.scandal > 1 ? "s" : "") + ')</em>');
    if (st.fame) trouble.push('<em>' + esc(stLabel("fame")) + '</em>');
    if (q.strike) trouble.push('<em class="bad">Pas de salaire au prochain tour</em>');
    if (q.rebound) trouble.push('<em class="good">Rebond : 2 cartes au prochain tour</em>');
    var perm = function (k) { var c = card(k); return c && (c.fx || []).some(function (f) { return ["job", "diploma", "partner", "marry", "kid", "housing", "item", "status", "vegas", "startup"].indexOf(f.op) >= 0; }); };
    var played = (q.log || []).slice().reverse().map(function (l) {
      var c = card(l.k); if (!c) return "";
      var tag = l.out === "defend" ? "parade" : l.out === "blocked" ? "contré" : l.to ? "contre " + (l.to === me.id ? "toi" : nameOf(l.to)) : perm(l.k) ? "effet durable" : "effet terminé";
      return '<span class="bd-pl fam-' + c.fam + '"><i>T' + l.r + '</i>' + esc(c.name) + '<small>' + esc(tag) + '</small></span>';
    }).join("");
    var got = (q.got || []).slice().reverse().map(function (l) {
      var c = card(l.k); if (!c) return "";
      return '<span class="bd-pl fam-' + c.fam + '"><i>T' + l.r + '</i>' + esc(c.name) + '<small>de ' + esc(l.from === me.id ? "toi" : nameOf(l.from)) + (l.out === "soft" ? " (limité)" : "") + '</small></span>';
    }).join("");
    sheet('<div class="qv-board">' +
      '<div class="bd-top">' + W.tile(q) + '</div>' +
      '<h3>' + esc(mine ? "Mon plateau" : "Le plateau de " + q.name) + '</h3><div class="qv-res-line">' + resRow(q, true) + '</div>' +
      careerHTML(q, mine) +
      '<div class="bd-grid">' + slot("tie", "Travail", work, "Sans emploi") + slot("heart", "Relations", rel, "Célibataire") + slot("baby", "Famille", fam, "Pas d'enfant") + slot("house", "Logement", home_, "") + slot("car", "Possessions", poss, "Rien pour l'instant") + (trouble.length ? slot("lightning", "En cours", trouble, "") : "") + '</div>' +
      (!mine ? '<p class="bd-hand">' + q.handCount + ' carte(s) en main — secrètes</p>' : '') +
      '<h4>Cartes jouées (publiques)</h4><div class="bd-played">' + (played || '<small>Aucune pour l\'instant</small>') + '</div>' +
      (got ? '<h4>Coups reçus</h4><div class="bd-played">' + got + '</div>' : '') +
      '<details><summary>Sa vie, âge par âge</summary><ol class="qv-life">' + q.life.slice().reverse().map(function (l) { return '<li class="t-' + l.tone + '"><b>' + l.age + ' ans</b> ' + esc(l.text) + '</li>'; }).join("") + '</ol></details>' +
      '</div><button class="qv-btn ghost sm" data-g="close">Fermer</button>');
  }

  // ---------- carrière : Formation, parcours d'études, métiers accessibles ----------
  function careerHTML(q, mine) {
    var edu = q.edu || 0, max = D.EDU_MAX, zone = q.zone || [];
    var studies = zone.filter(function (z) { return z.z === "studies"; }), jobC = zone.filter(function (z) { return z.z === "job"; })[0];
    var jobs = Object.keys(D.JOBS).filter(function (k) { return D.JOBS[k].card && D.byKey[D.JOBS[k].card] && (!D.byKey[D.JOBS[k].card].adult || pub.mode === "adult"); })
      .sort(function (a, b) { return (D.JOBS[a].edu || 0) - (D.JOBS[b].edu || 0) || D.JOBS[a].salary - D.JOBS[b].salary; });
    var nextT = jobs.map(function (k) { return D.JOBS[k]; }).filter(function (J) { return !J.study && (J.edu || 0) > edu; })[0];
    var o = '<div class="cr-sec"><div class="cr-edu"><b>' + IC.get("gradcap", "qv-ri") + 'Formation ' + edu + '<small>/' + max + '</small></b><span class="cr-pips">';
    for (var i = 1; i <= max; i++) o += '<i class="' + (i <= edu ? "on" : "") + '">' + i + '</i>';
    o += '</span>' + (nextT ? '<small class="cr-next">Prochain palier : Formation ' + nextT.edu + ' → ' + esc(nextT.titles[0]) + '</small>' : '<small class="cr-next">Tous les métiers te sont ouverts</small>') + '</div>';
    o += '<div class="cr-studies"><small>Parcours</small>' + (studies.length ? studies.map(function (z) { var c = card(z.k); return '<span class="cr-st">' + IC.get(c.icon, "qv-ri") + esc(c.name) + '</span>'; }).join("") : '<em>Aucune étude pour l\'instant</em>') + '</div>';
    if (mine) o += '<div class="cr-jobs"><small>Métiers</small>' + jobs.map(function (k) {
      var J = D.JOBS[k], why = E.qualifies(q, k, pub), cur = q.job && q.job.k === k;
      return '<span class="cr-j' + (cur ? " cur" : why ? " lock" : " ok") + '"><b>' + esc(J.titles[0]) + '</b><small>' + esc(window.QV_CARDS.jobCond(k)) + ' · ' + J.salary + ' €/tour</small>' + (cur ? '<em>Ton métier</em>' : why ? '' : '<em>Accessible</em>') + '</span>';
    }).join("") + '</div>';
    else o += '<p class="cr-next">' + esc(q.job ? q.title + " · " + q.salary + " € par tour" : q.retired ? "Retraité·e" : "Sans emploi") + '</p>';
    if (mine && q.secours) o += '<p class="qv-tip new">Pas de carte Études depuis longtemps ? Touche une carte de ta main puis « Étudier » : tu sacrifies ton action pour +1 Formation (jusqu\'au niveau 2).</p>';
    return o + '</div>';
  }
  // ---------- journal des événements ----------
  function journalLine(ev) {
    var c = card(ev.k) || {}, who = function (id) { return id === me.id ? "Toi" : nameOf(id); };
    if (ev.t === "season") { var e = D.EVENTS.filter(function (x) { return x.key === ev.k; })[0]; return "Événement : " + (e ? e.name : ""); }
    if (ev.t === "status") return ev.text;
    if (ev.t === "attack") return who(ev.p) + " attaque " + who(ev.to) + " avec « " + c.name + " »";
    if (ev.t === "block") return who(ev.p) + " contre avec « " + c.name + " »";
    if (ev.outcome === "soft") return who(ev.to) + " limite les dégâts de « " + c.name + " »";
    if (ev.to) return who(ev.p) + " → " + who(ev.to) + " : « " + c.name + " »";
    return who(ev.p) + " joue « " + c.name + " »";
  }
  // détail court d'une entrée : ce qui a changé, ressources comprises
  function journalSub(ev) {
    var who = function (id) { return id === me.id ? "Toi" : nameOf(id); }, parts = [];
    (ev.changes || []).forEach(function (x) { parts.push(who(x.p) + " : " + x.t.join(", ")); });
    var by = {}; (ev.notes || []).forEach(function (n) { (by[n.p] = by[n.p] || []).push(n); });
    Object.keys(by).forEach(function (id) { var r = sumNotes(by[id]).map(function (n) { return (n.v > 0 ? "+" : "−") + Math.abs(n.v) + " " + RES_WORD[n.k]; }).join(", "); if (r) parts.push(who(id) + " " + r); });
    return parts.join(" · ");
  }
  function journalSheet() {
    var rows = "", lastR = null;
    hist.filter(function (e) { return e.t !== "attack"; }).forEach(function (ev) {
      if (ev.round !== lastR) { rows += '<h4 class="jr-r">Tour ' + ev.round + '</h4>'; lastR = ev.round; }
      var c = card(ev.k);
      var sub = journalSub(ev), ic = c ? c.icon : ((D.EVENTS.filter(function (x) { return x.key === ev.k; })[0] || {}).icon || "chart");
      rows += '<button class="jr-e fam-' + (c ? c.fam : "world") + '" data-g="jev" data-id="' + ev.id + '"><i class="tk-card">' + IC.get(ic) + '</i><span><b>' + esc(journalLine(ev)) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span><i class="jr-go">›</i></button>';
    });
    sheet('<h3>Journal de la partie</h3><p class="qv-tip">Tout ce qui s\'est passé, du plus récent au plus ancien. Touche une ligne pour voir la carte et revoir la scène.</p>' + (rows || '<p class="qv-tip">Rien pour l\'instant.</p>') + '<button class="qv-btn ghost sm" data-g="close">Fermer</button>');
  }
  function journalDetail(id) {
    var ev = hist.filter(function (x) { return x.id === id; })[0]; if (!ev) return;
    sheet('<p class="rs-h">' + esc(headline(ev)) + '</p>' + (card(ev.k) ? cardHTML(ev.k, { big: true, mine: ev.p === me.id }) : '') +
      '<p class="rs-sub">Ce qui a changé</p>' + impactHTML(ev) +
      (ev.scene ? '<button class="qv-btn alt" data-g="replay" data-id="' + ev.id + '">Revoir la scène</button>' : '') +
      '<button class="qv-btn ghost sm" data-g="journal">Retour au journal</button>');
  }

  // ---------- plateau mobile : le personnage d'abord ----------
  var stageTall = 200;
  function stageTile(p, extra) { return W.tile(p, Object.assign({ tall: stageTall, stage: true, world: true }, extra || {})); }
  function ctrHTML() {
    return '<div class="stg-ctrs">' + ["b", "f", "r"].map(function (k) {
      return '<button class="g-ctr ctr-' + k + '" data-g="res" data-k="' + k + '" id="ctr-' + k + '" aria-label="' + RES[k].name + ' : ' + sv(me.id, k) + '">' + IC.get(k, "ctr-i") + '<span class="ctr-txt"><b class="ctr-v" id="ctrv-' + k + '">' + sv(me.id, k) + '</b><span class="ctr-n">' + RES[k].name + '</span></span></button>';
    }).join("") + '</div>';
  }
  // adversaire : portrait compact, prénom, trois chiffres. Le détail s'ouvre au toucher.
  function oppChip(id) {
    var q = pub.players[id], turn = pub.order[pub.turn] === id, tgt = pub.pending && pub.pending.to === id;
    var bad = q.scandal || Object.keys(q.st || {}).some(function (k) { return D.STATUSES[k] && D.STATUSES[k].bad; });
    return '<button class="g-opp' + (turn ? " turn" : "") + (tgt ? " tgt" : "") + (q.bot || present(id) ? "" : " off") + '" data-pid="' + id + '" data-g="who" aria-label="Plateau de ' + esc(q.name) + '">' +
      '<span class="g-opp-face">' + A.standalone(q.avatar, { mood: q.mood || "neutral", outfit: W.outfit(q) }, "g-opp-av", true) + (bad ? '<i class="g-opp-bad" title="Ennuis en cours">!</i>' : '') + '</span>' +
      '<span class="g-opp-txt"><b class="nm">' + esc(q.name) + '</b><span class="g-opp-res">' + ["b", "f", "r"].map(function (k) { return '<i data-r="' + k + '">' + IC.get(k, "qv-ri") + '<b>' + sv(id, k) + '</b></i>'; }).join("") + '</span></span></button>';
  }
  // ÉCRAN DE JEU : barre discrète · adversaires · le petit monde du joueur · sa barre · la main
  // couches : plateau < interface persistante < notifications légères < interaction prioritaire < scènes
  function renderGame() {
    if (!pub || !room) return;
    if (screen !== "game") {
      show("game", '<div class="g-app">' +
        '<header class="g-top"><span class="g-logo" aria-label="Quelle vie !">QV<b>!</b></span><span class="g-age" id="g-age"></span><span class="g-status" id="status"></span>' +
        '<button class="g-ib" data-g="journal" aria-label="Journal de la partie"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 3 h10 a2 2 0 0 1 2 2 v12 H6 a2 2 0 0 1 -2 -2z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 7 h6 M7 10 h6 M7 13 h4" stroke="currentColor" stroke-width="1.8"/></svg></button>' +
        '<button class="g-ib" data-g="menu" aria-label="Menu"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5 h14 M3 10 h14 M3 15 h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button></header>' +
        '<section class="g-opps" id="opps"></section>' +
        '<section class="g-stage"><div class="g-world" id="mezone"></div><div class="g-toast" id="ticker" aria-live="polite"></div></section>' +
        '<section class="g-me" id="mebar"></section>' +
        '<section class="g-hand" id="hand"></section>' +
        '<aside class="g-log" id="log"></aside>' +
        '<div id="sheet" class="qv-sheet" hidden></div>' +
        '</div>');
      app.onclick = gameClick;
    }
    var p = pub.players[me.id];
    $("#g-age").innerHTML = (pub.mode === "adult" ? '<i class="b18">18+</i>' : '') + pub.age + ' ans · ' + pub.round + '/' + pub.maxRounds;
    $("#opps").innerHTML = pub.order.filter(function (id) { return id !== me.id; }).map(oppChip).join("");
    var mz = $("#mezone");
    if (p) {
      var w = mz.clientWidth || innerWidth, h = mz.clientHeight;
      if (!h || h < 100) { h = Math.max(200, innerHeight - 330); requestAnimationFrame(function () { if (screen === "game" && $("#mezone") && $("#mezone").clientHeight >= 100) fitStage(); }); }
      stageTall = Math.round(Math.max(200, Math.min(700, 320 * h / Math.max(1, w))));
      var react = Date.now() < reactUntil;
      mz.innerHTML = '<div class="qv-mytile' + (react ? " react-" + reactMood : "") + '" data-pid="' + me.id + '">' + stageTile(p, react ? { mood: reactMood } : {}) + '</div>';
      $("#mebar").innerHTML = '<button class="g-id" data-g="life" aria-label="Mon plateau">' + A.standalone(p.avatar, { mood: p.mood || "neutral", outfit: W.outfit(p) }, "g-id-av", true) +
        '<span class="g-id-txt"><b>' + esc(p.name) + '</b><small><i class="mb-edu" id="mb-edu" title="Formation">' + IC.get("gradcap", "mb-ei") + (p.edu || 0) + '</i>' + esc(p.job ? p.title : p.retired ? "Retraité·e" : "Sans emploi") + '</small></span></button>' +
        ctrHTML() +
        (!pub.discovery || pub.stage >= 3 ? '<button class="g-ib g-obj" data-g="obj" aria-label="Mes objectifs secrets">' + IC.get("star", "mb-i") + '</button>' : '');
    } else {
      mz.innerHTML = '<p class="qv-note">Tu regardes la partie en spectateur.</p>'; $("#mebar").innerHTML = "";
    }
    renderStatus();
    renderHand();
    $("#log").innerHTML = '<h3>Journal</h3>' + hist.filter(function (e) { return e.t !== "attack"; }).slice(0, 14).map(function (ev) { return '<button class="jr-e mini" data-g="jev" data-id="' + ev.id + '"><span><i>T' + ev.round + '</i> ' + esc(journalLine(ev)) + '</span></button>'; }).join("");
    maybeReact();
    coachHand();
    if (pub.discovery && !seen.intro && !introOpen && pub.phase !== "end") intro(false);
    updateHint();
    lookCheck();
  }
  // la scène suit la taille réelle de l'écran (barre Safari qui apparaît, rotation…)
  function fitStage() {
    var mz = $("#mezone"), p = pub && pub.players[me.id]; if (!mz || !p) return;
    var t = Math.round(Math.max(200, Math.min(700, 320 * mz.clientHeight / Math.max(1, mz.clientWidth))));
    if (Math.abs(t - stageTall) < 4) return;
    stageTall = t;
    var svg = mz.querySelector(".qv-tile"); if (svg) svg.outerHTML = stageTile(p, Date.now() < reactUntil ? { mood: reactMood } : {});
  }
  var fitT = null;
  window.addEventListener("resize", function () { clearTimeout(fitT); fitT = setTimeout(function () { if (screen === "game") { fitStage(); renderHand(); } }, 120); });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", function () { clearTimeout(fitT); fitT = setTimeout(function () { if (screen === "game") fitStage(); }, 120); });
  // petite vie au repos : de temps en temps, le personnage fait signe ou prend la pose
  setInterval(function () {
    if (screen !== "game" || !pub || queue.length || playing || reduce || Date.now() < reactUntil) return;
    var p = pub.players[me.id], t = $(".qv-mytile .qv-tile"); if (!p || !t) return;
    var poses = ["wave", "hips", "up"], pose = poses[Math.floor(Math.random() * poses.length)];
    t.outerHTML = stageTile(p, { pose: pose, mood: pose === "up" ? "happy" : p.mood });
    setTimeout(function () { var t2 = $(".qv-mytile .qv-tile"); if (t2 && !(Date.now() < reactUntil)) t2.outerHTML = stageTile(p); }, 1600);
  }, 9000);

  // ---------- premier tour guidé ----------
  function guideFirst() { return !!(pub && pub.discovery && pub.round === 1 && isMyTurn() && !seen.guide1 && priv && priv.hand.length && !introOpen); }
  function updateHint() { hideHint(); }
  function hideHint() { if (tickPin) pinTick(""); }
  // ---------- le personnage change : on le montre ----------
  var lastLook = null;
  function lookCheck() {
    var p = pub && pub.players[me.id]; if (!p) return;
    var look = [W.outfit(p), p.housing, !!p.partner, p.married, p.kids.length, (p.items || []).join(","), Object.keys(p.st || {}).join(",")].join("|");
    if (lastLook !== null && look !== lastLook) {
      var t = $(".qv-mytile"); if (t) { t.classList.remove("changed"); void t.offsetWidth; t.classList.add("changed"); }
      if (!seen["m:look"]) { markSeen("m:look"); setTimeout(function () { turnPill("Ton personnage a changé !", "Ta vie se voit : tenue, maison, famille…"); }, 400); }
    }
    lastLook = look;
  }

  // ---------- introduction (≈ 15 s, interactive, passable) ----------
  var introOpen = false, introT = [];
  function intro(force) {
    if (introOpen) return;
    introOpen = true; markSeen("intro"); hideHint();
    var me_ = (pub && pub.players[me.id]) || { avatar: me.avatar, housing: 0, items: [], kids: [], st: {}, life: [] };
    var base = JSON.parse(JSON.stringify(me_)); base.partner = null; base.married = false; base.kids = []; base.items = []; base.st = {}; base.mood = "happy"; base.job = null; base.housing = 0; base.scandal = 0; base.strike = 0;
    var foeAv = A.random(4711);
    var el = document.createElement("div"); el.id = "intro"; el.className = "qv-intro"; document.body.appendChild(el);
    var step = 0;
    function clear() { introT.forEach(clearTimeout); introT = []; }
    function later(f, ms) { introT.push(setTimeout(f, ms)); }
    function close() { clear(); el.remove(); introOpen = false; renderGame(); next(); }
    function frame(inner, caption, btn) {
      el.innerHTML = '<div class="qi-box"><button class="qi-skip" data-i="skip">Passer</button>' + inner +
        '<p class="qi-cap">' + caption + '</p><div class="qi-dots">' + [0, 1, 2].map(function (i) { return '<i class="' + (i === step ? "on" : "") + '"></i>'; }).join("") + '</div>' +
        '<button class="qv-btn big" data-i="next">' + btn + '</button></div>';
    }
    function s1() {
      step = 0;
      var looks = [base, Object.assign({}, base, { job: { k: "livreur", lv: 1 }, housing: 1, mood: "smug" }), Object.assign({}, base, { job: { k: "bureau", lv: 2 }, housing: 2, partner: { name: "Lou", seed: 9 }, married: true, mood: "happy" })];
      frame('<h2 class="qi-h">Voici ta vie</h2><div class="qi-tile" id="qi-tile">' + W.tile(looks[0]) + '</div>', "Tu commences à 18 ans sur le canapé de tes parents. Études, métier, amour, maison : à toi de construire ta vie…", "Suivant");
      [1, 2].forEach(function (n) { later(function () { var t = $("#qi-tile"); if (t) { t.innerHTML = W.tile(looks[n]); t.classList.remove("pop"); void t.offsetWidth; t.classList.add("pop"); SND.play("pop"); } }, n * 1500); });
      later(s2, 5200);
    }
    function s2() {
      clear(); step = 1;
      frame('<h2 class="qi-h">Une carte par tour</h2><div class="qi-play"><div class="qi-me">' + A.standalone(base.avatar, { mood: "neutral" }) + '</div>' +
        '<button class="qi-card" data-i="card">' + cardHTML("petitboulot", {}) + '<span class="qi-tap">Touche-moi !</span></button>' +
        '<div class="qi-foe">' + A.standalone(foeAv, { mood: "neutral" }) + '</div></div>', "Joue tes cartes pour progresser… ou pour embêter les autres.", "Suivant");
      later(playIt, 3200);
    }
    function playIt() {
      var cardEl = el.querySelector(".qi-card"); if (!cardEl || cardEl.classList.contains("go")) return;
      cardEl.classList.add("go"); SND.play("card");
      later(function () {
        var m = el.querySelector(".qi-me"); if (m) { m.innerHTML = A.standalone(base.avatar, { mood: "happy", outfit: "delivery", pose: "wave" }) + '<span class="qi-float up">+1 € par tour</span>'; SND.play("coin"); }
      }, 700);
      later(function () {
        var b = el.querySelector(".qi-play"); if (!b) return;
        b.insertAdjacentHTML("beforeend", '<div class="qi-bad">' + cardHTML("licenciement", {}) + '</div>');
        SND.play("whoosh");
        later(function () { var f = el.querySelector(".qi-foe"); if (f) { f.innerHTML = A.standalone(foeAv, { mood: "sad", hold: "box" }) + '<span class="qi-float down">−2 ★</span>'; SND.play("sad"); } }, 800);
      }, 1700);
      later(s3, 5200);
    }
    function s3() {
      clear(); step = 2;
      frame('<h2 class="qi-h">La plus belle vie gagne</h2><div class="qi-score"><div class="qi-me">' + A.standalone(base.avatar, { mood: "happy", pose: "up", hat: "crown", outfit: "ceo" }) + '</div>' +
        '<div class="qi-sum"><span>' + IC.get("b", "qv-ri") + '<b>12</b></span>+<span>' + IC.get("f", "qv-ri") + '<b>9</b></span>+<span>' + IC.get("r", "qv-ri") + '<b>6</b></span>=<span class="tot"><b>27</b> pts</span></div></div>',
        "À la fin, on additionne ♥ bonheur, € fortune et ★ réputation (plus quelques bonus secrets). Le plus gros score gagne !", "C'est parti !");
      SND.play("fanfare");
      later(close, 6500);
    }
    el.onclick = function (e) {
      var b = e.target.closest("[data-i]"); if (!b) return;
      SND.unlock(); SND.play("tap");
      var a = b.dataset.i;
      if (a === "skip") close();
      else if (a === "card") playIt();
      else if (a === "next") { if (step === 0) { clear(); s2(); } else if (step === 1) { clear(); s3(); } else close(); }
    };
    s1();
  }
  function renderStatus() {
    var st = $("#status"); if (!st || !pub) return;
    var cur = pub.players[pub.order[pub.turn]], o = "";
    if (pub.phase === "react" && pub.pending) {
      var left = Math.max(0, 45 - Math.floor((Date.now() - clockSkew - pub.pending.since) / 1000));
      o = pub.pending.to === me.id ? "On t'attaque !" : esc(nameOf(pub.pending.to)) + " réagit… " + left + " s";
    } else if (pub.gate) {
      var waitFor = pub.order.filter(function (id) { var q = pub.players[id]; return !q.bot && !pub.gate.ready[id] && (id === me.id || present(id)); }).map(function (id) { return id === me.id ? "toi" : nameOf(id); });
      o = waitFor.length ? "On attend " + esc(waitFor.join(", ")) + "…" : "On continue…";
    } else if (myDraw()) {
      o = "<b>À toi : pioche !</b>";
    } else if (isMyTurn()) {
      var pl = pub.players[me.id].plays;
      o = "<b>À toi !</b>" + (pl > 1 ? " · " + pl + " cartes" : "");
    } else if (cur) {
      o = esc(cur.name) + (pub.phase === "draw" ? " pioche…" : cur.bot ? " réfléchit…" : " joue…") + (!cur.bot && !present(cur.id) ? " (déconnecté·e)" : "");
    }
    if (room && !room.host && room.hostId && !present(room.hostId) && room.roster.length) o = "Hôte déconnecté·e…";
    st.innerHTML = o;
    st.className = "g-status" + (isMyTurn() || myDraw() ? " mine" : "");
  }
  function renderPresence() { if (screen === "game") { renderStatus(); $$(".g-opp").forEach(function (b) { var id = b.dataset.pid, q = pub && pub.players[id]; if (q) b.classList.toggle("off", !(q.bot || present(id))); }); } else if (screen === "lobby") { /* rafraîchi par onRoster */ } }
  setInterval(function () { if (screen === "game" && pub && pub.phase === "react") renderStatus(); }, 1000);

  // ======================================================================
  //  GAME FEEL : compteurs, gains et pertes, distribution, main en éventail
  //  Règle d'or : les chiffres affichés suivent la VRAIE valeur du moteur,
  //  mais ne changent jamais en silence (ils la rattrapent en s'animant).
  // ======================================================================
  var RES = {
    b: { name: "Bonheur", what: "La qualité de vie de ton personnage.", win: "Chaque point compte pour la victoire. La personne la plus heureuse gagne aussi « La plus belle vie » (+4)." },
    f: { name: "Fortune", what: "Ton argent : il paie les achats (logement, voiture, voyages…) et certains coups durs.", win: "Chaque point compte pour la victoire. La personne la plus riche gagne aussi « Le compte en banque » (+4)." },
    r: { name: "Réputation", what: "Ta notoriété, ton prestige, la reconnaissance des autres.", win: "Chaque point compte pour la victoire. La personne la plus célèbre gagne aussi « La célébrité » (+4)." },
  };
  var reduce = store("qv-reduce");
  if (reduce === null) reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  document.body.classList.toggle("reduce", !!reduce);
  var shown = {};          // valeurs affichées par joueur
  function syncShown(force) { if (!pub) return; pub.order.forEach(function (id) { var p = pub.players[id]; if (!shown[id] || force) shown[id] = { b: p.b, f: p.f, r: p.r }; }); }
  function sv(id, k) { return shown[id] && shown[id][k] !== undefined ? shown[id][k] : (pub && pub.players[id] ? pub.players[id][k] : 0); }
  // vue « affichée » de l'état, pour calculer les verrous au même rythme que les compteurs
  function viewPub() {
    if (!pub || !pub.players[me.id]) return pub;
    var v = Object.assign({}, pub), pl = Object.assign({}, pub.players);
    pl[me.id] = Object.assign({}, pub.players[me.id], { b: sv(me.id, "b"), f: sv(me.id, "f"), r: sv(me.id, "r") });
    v.players = pl; return v;
  }
  function hudHTML(p) {
    return '<div class="hud-me" data-g="life">' + A.standalone(p.avatar, { mood: p.mood || "neutral", outfit: W.outfit(p) }, "hud-av", true) + '<div class="hud-id"><b>' + esc(p.name) + '</b><small>' + esc(p.title) + '</small></div></div>' +
      '<div class="hud-ctrs">' + ["b", "f", "r"].map(function (k) {
        return '<button class="ctr ctr-' + k + '" data-g="res" data-k="' + k + '" id="ctr-' + k + '" aria-label="' + RES[k].name + ' : ' + sv(me.id, k) + '">' + IC.get(k, "ctr-i") + '<span class="ctr-txt"><b class="ctr-v" id="ctrv-' + k + '">' + sv(me.id, k) + '</b><span class="ctr-n">' + RES[k].name + '</span></span></button>';
      }).join("") + '</div>';
  }
  function setNum(id, k, v) {
    if (!shown[id]) shown[id] = {};
    shown[id][k] = v;
    if (id === me.id) { var el = $("#ctrv-" + k); if (el) el.textContent = v; }
    var o = $('.g-opp[data-pid="' + id + '"] [data-r=' + k + '] b'); if (o) o.textContent = v;
  }
  function center(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function pulse(el, cls) { if (!el) return; el.classList.remove("pulse-up", "pulse-down"); void el.offsetWidth; el.classList.add(cls); }
  function label(el, text, up) {
    if (!el) return;
    var f = document.createElement("span"); f.className = "ctr-float " + (up ? "up" : "down"); f.textContent = text;
    var c = center(el); f.style.left = c.x + "px"; f.style.top = (c.y - 24) + "px";
    document.body.appendChild(f); setTimeout(function () { f.remove(); }, 1500);
  }
  // particules (cœurs, pièces, étoiles) qui volent d'un point à un autre
  function particles(k, from, to, n, onArrive, done) {
    var left = n, step = reduce ? 0 : 90;
    if (!n) { done && done(); return; }
    for (var i = 0; i < n; i++) (function (i) {
      var el = document.createElement("div"); el.className = "qv-part p-" + k; el.innerHTML = IC.get(k, "qv-ri");
      document.body.appendChild(el);
      var dx = (Math.random() - 0.5) * 60, dy = (Math.random() - 0.5) * 30;
      var mid = { x: (from.x + to.x) / 2 + dx, y: Math.min(from.y, to.y) - 60 + dy };
      var a = el.animate([
        { transform: "translate(" + (from.x + dx * 0.4) + "px," + (from.y + dy * 0.4) + "px) scale(.4)", opacity: 0 },
        { transform: "translate(" + (from.x + dx) + "px," + (from.y + dy - 20) + "px) scale(1.25)", opacity: 1, offset: 0.25 },
        { transform: "translate(" + mid.x + "px," + mid.y + "px) scale(1)", opacity: 1, offset: 0.6 },
        { transform: "translate(" + to.x + "px," + to.y + "px) scale(.55)", opacity: 0.9 },
      ], { duration: reduce ? 10 : 720, delay: i * step, easing: "cubic-bezier(.4,0,.2,1)", fill: "both" });
      a.onfinish = function () { el.remove(); onArrive && onArrive(i); if (--left === 0) done && done(); };
    })(i);
  }
  var GAIN_SND = { b: "gainB", f: "coin", r: "gainR" };
  // anime les variations (notes du moteur) : la valeur affichée rejoint exactement la vraie valeur
  function animateNotes(notes, src, done) {
    notes = (notes || []).slice();
    var mineN = notes.filter(function (n) { return n.p === me.id; }), others = notes.filter(function (n) { return n.p !== me.id; });
    // adversaires : petit compteur qui défile + étiquette
    others.forEach(function (n) {
      var el = $('.g-opp[data-pid="' + n.p + '"] [data-r=' + n.k + ']'), from = sv(n.p, n.k), to = from + n.v;
      if (el) { pulse(el, n.v > 0 ? "pulse-up" : "pulse-down"); label(el, (n.v > 0 ? "+" : "−") + Math.abs(n.v), n.v > 0); }
      setNum(n.p, n.k, Math.max(0, to));
    });
    if (!mineN.length) { done(); return; }
    var tile = $(".qv-mytile");
    var srcPt = src && document.body.contains(src) ? center(src) : (tile ? center(tile) : { x: innerWidth / 2, y: innerHeight / 2 });
    var gain = mineN.some(function (n) { return n.v > 0; }), loss = mineN.some(function (n) { return n.v < 0; });
    reactAvatar(gain && !loss ? "happy" : loss && !gain ? "sad" : "shocked");
    var i = 0;
    (function one() {
      if (i >= mineN.length) { setTimeout(done, reduce ? 50 : 250); return; }
      var n = mineN[i++], ctr = $("#ctr-" + n.k); if (!ctr) { setNum(me.id, n.k, sv(me.id, n.k) + n.v); one(); return; }
      var start = sv(me.id, n.k), target = Math.max(0, start + n.v), cnt = Math.min(Math.abs(n.v), 6), got = 0;
      var stepTo = function (j) { return Math.round(start + (target - start) * (j / cnt)); };
      if (n.v > 0) {
        particles(n.k, srcPt, center(ctr), cnt, function (j) {
          got++; setNum(me.id, n.k, stepTo(got)); pulse(ctr, "pulse-up"); SND.play(GAIN_SND[n.k]);
        }, function () { setNum(me.id, n.k, target); label(ctr, "+" + n.v + " " + RES[n.k].name, true); setTimeout(one, reduce ? 0 : 120); });
      } else {
        pulse(ctr, "pulse-down"); SND.play("lose");
        var down = { x: center(ctr).x + (Math.random() - 0.5) * 40, y: center(ctr).y - 80 };
        particles(n.k, center(ctr), down, cnt, function () { got++; setNum(me.id, n.k, stepTo(got)); }, function () {
          setNum(me.id, n.k, target); label(ctr, "−" + Math.abs(n.v) + " " + RES[n.k].name, false); setTimeout(one, reduce ? 0 : 120);
        });
      }
    })();
  }
  // le personnage réagit (joie, déception, surprise)
  var reactT = null, reactMood = null, reactUntil = 0;
  function reactAvatar(mood) {
    reactMood = mood; reactUntil = Date.now() + 1600;
    var t = $(".qv-mytile"), p = pub && pub.players[me.id]; if (!t || !p) return;
    var svg = t.querySelector(".qv-tile"); if (svg) svg.outerHTML = stageTile(p, { mood: mood, pose: mood === "happy" ? "up" : mood === "angry" ? "hips" : undefined });
    t.classList.remove("react-happy", "react-sad", "react-shocked"); void t.offsetWidth; t.classList.add("react-" + mood);
    var hav = $(".hud-av"); if (hav) hav.outerHTML = A.standalone(p.avatar, { mood: mood, outfit: W.outfit(p) }, "hud-av", true);
    clearTimeout(reactT); reactT = setTimeout(function () { t.classList.remove("react-" + mood); }, 1400);
  }
  // rattrapage : si une animation a été interrompue ou après une reconnexion, on rejoint la vraie valeur en douceur
  function reconcile() {
    if (!pub) return;
    pub.order.forEach(function (id) {
      ["b", "f", "r"].forEach(function (k) {
        var real = pub.players[id][k], cur = sv(id, k);
        if (real === cur) return;
        if (id === me.id) { var ctr = $("#ctr-" + k); pulse(ctr, real > cur ? "pulse-up" : "pulse-down"); label(ctr, (real > cur ? "+" : "−") + Math.abs(real - cur) + " " + RES[k].name, real > cur); }
        setNum(id, k, real);
      });
    });
  }

  // ---------- fiche d'une ressource (on touche un compteur) ----------
  function resSheet(k) {
    var R = RES[k], mode = pub ? pub.mode : "classic";
    var pool = D.CARDS.filter(function (c) { return !c.adult || mode === "adult"; });
    var gains = pool.map(function (c) { var g = 0; (c.fx || []).forEach(function (f) { if (f.op === "res" && !f.who && c.target !== "opponent" && f[k] > 0) g += f[k]; }); return { c: c, g: g }; })
      .filter(function (x) { return x.g > 0; }).sort(function (a, b) { return b.g - a.g; }).slice(0, 4);
    var unlocks = pool.filter(function (c) { return c.req && c.req[{ b: "minB", f: "minF", r: "minR" }[k]]; });
    var costs = k === "f" ? pool.filter(function (c) { return c.cost && c.cost.f; }).slice(0, 5) : [];
    var v = sv(me.id, k);
    var o = '<div class="res-sheet res-' + k + '"><div class="res-top">' + IC.get(k, "res-big") + '<div><b>' + R.name + '</b><span>Tu en as <strong>' + v + '</strong></span></div></div>' +
      '<p><b>À quoi ça sert :</b> ' + esc(R.what) + '</p>' +
      '<p><b>Comment en gagner :</b> ' + esc(gains.map(function (x) { return "« " + x.c.name + " » (+" + x.g + ")"; }).join(", ") || "certaines cartes et événements") + (k === "f" ? ", et ton salaire à chaque tour." : ".") + '</p>' +
      (unlocks.length ? '<p><b>Ce que ça débloque :</b> ' + unlocks.map(function (c) { var need = c.req[{ b: "minB", f: "minF", r: "minR" }[k]]; return '<span class="ul ' + (v >= need ? "ok" : "") + '">« ' + esc(c.name) + ' » dès ' + need + '</span>'; }).join(" ") + '</p>' : '') +
      (costs.length ? '<p><b>Ce que ça paie :</b> ' + costs.map(function (c) { return '<span class="ul ' + (v >= c.cost.f ? "ok" : "") + '">« ' + esc(c.name) + ' » (' + c.cost.f + ')</span>'; }).join(" ") + '</p>' : '') +
      '<p><b>Pour gagner :</b> ' + esc(R.win) + '</p></div>';
    sheet(o + '<button class="qv-btn ghost sm" data-g="close">Fermer</button>');
  }

  // ---------- distribution des cartes, une par une ----------
  var dealt = {}, dealing = {}, prevReason = {};
  function handleDeal(first) {
    if (!priv || !pub) return;
    var fresh = priv.hand.filter(function (c) { return !dealt[c.u] && !dealing[c.u]; });
    if (!fresh.length) return;
    if (first && !(pub.round === 1)) { fresh.forEach(function (c) { dealt[c.u] = 1; }); return; }
    fresh.forEach(function (c) { dealing[c.u] = 1; });
    enqueue({ kind: "deal", cards: fresh });
  }
  function dealOne(c, cb) {
    dealt[c.u] = 1; delete dealing[c.u];
    renderHand(c.u);
    var slot = $('#hand [data-u="' + c.u + '"]'), deck = $("#deckpile");
    if (!slot || !deck || reduce) { if (slot) slot.classList.remove("incoming"); cb(); return; }
    deck.classList.remove("shuffle"); void deck.offsetWidth; deck.classList.add("shuffle");
    var a = center(deck), b = center(slot), el = document.createElement("div");
    el.className = "qv-flycard"; document.body.appendChild(el);
    SND.play("card");
    var an = el.animate([
      { transform: "translate(" + (a.x - 30) + "px," + (a.y - 42) + "px) rotate(-8deg) scale(.6)" },
      { transform: "translate(" + ((a.x + b.x) / 2 - 30) + "px," + (Math.min(a.y, b.y) - 90) + "px) rotate(6deg) scale(.9)", offset: 0.5 },
      { transform: "translate(" + (b.x - 30) + "px," + (b.y - 42) + "px) rotate(0deg) scale(1)" },
    ], { duration: 460, easing: "cubic-bezier(.3,.7,.3,1)", fill: "both" });
    an.onfinish = function () {
      el.remove();
      slot = $('#hand [data-u="' + c.u + '"]');
      if (slot) { slot.classList.remove("incoming"); slot.classList.add("flip-in"); }
      setTimeout(cb, 260);
    };
  }

  // ---------- LA MAIN : compacte au repos, elle se déploie dans sa propre zone ----------
  // repos : dos colorés (catégories) + nombre de cartes · ouverte : cartes lisibles en rangée défilante
  // détail : la carte agrandie, son effet, UNE action principale · cible : choix de l'adversaire
  var handOpen = false, handMode = "row";
  function setHand(open, mode) {
    handOpen = !!open; handMode = mode || "row";
    if (!handOpen || handMode === "row") sel = handOpen ? sel : null;
    if (handMode === "targets" || handMode === "take") setPhase("targetSelection");
    else if (UI.phase === "targetSelection" && !playing && !queue.length) setPhase("idle");
    renderHand();
  }
  function renderHand(incoming) {
    var h = $("#hand"); if (!h || !pub) return;
    if (!priv || !pub.players[me.id]) { h.innerHTML = ""; return; }
    var vp = viewPub(), mine = isMyTurn();
    var hand = priv.hand.filter(function (c) { return dealt[c.u]; });
    if (sel && !hand.some(function (c) { return c.u === sel; })) { sel = null; if (handMode === "detail" || handMode === "targets") handMode = "row"; }
    if (handMode === "take" && !(myDraw() && pub.canTake)) { handMode = "row"; handOpen = false; }
    if (myDraw() && handMode !== "take") handOpen = false;
    var unlocked = [];
    var info = hand.map(function (c) {
      var why = E.canPlay(vp, me.id, c.k), def = card(c.k), react = def.reaction && !def.alsoPlay;
      if (prevReason[c.u] && !why && !react) unlocked.push(c);
      prevReason[c.u] = react ? "" : why;
      return { c: c, why: why, def: def, react: react };
    });
    var n = info.length, idle = !busy() || UI.phase === "targetSelection";
    var playable = mine && !pub.gate && info.some(function (x) { return !x.why && !x.react; });
    var drawNow = myDraw() && !busy(), takeNow = drawNow && pub.canTake;
    var deck = '<button class="g-pile' + (drawNow ? " go" : "") + '" id="deckpile" data-g="' + (drawNow ? "draw" : "deckinfo") + '" aria-label="Pioche : ' + pub.deck + ' cartes face cachée' + (drawNow ? ', touche pour piocher' : '') + '"><i class="back"></i><b>' + (drawNow ? "Piocher" : pub.deck) + '</b></button>';
    var dtop = pub.discardTop && card(pub.discardTop);
    var disc = '<button class="g-pile disc' + (takeNow ? " go2" : "") + '" data-g="' + (takeNow ? "take" : "discard") + '" aria-label="Défausse' + (dtop ? " : « " + esc(dtop.name) + " » visible" : " vide") + (takeNow ? ", touche pour la reprendre et la jouer" : "") + '">' + (dtop ? '<i class="face fam-' + dtop.fam + '">' + IC.get(dtop.icon) + '</i>' : '<i class="empty"></i>') + '<b>' + (takeNow ? "Reprendre" : pub.discard) + '</b></button>';
    h.classList.toggle("open", handOpen);
    h.dataset.mode = handOpen ? handMode : "rest";
    if (!handOpen) {
      var lbl = playable && idle ? "Choisis une carte" : drawNow ? "Pioche d'abord" : "Ma main";
      h.innerHTML = deck + '<button class="g-handbtn' + (playable && idle ? " go" : "") + '" data-g="hand" aria-label="Ouvrir ma main : ' + n + ' carte' + (n > 1 ? "s" : "") + '"><span class="g-spines">' +
        info.slice(0, 5).map(function (x) { return '<i class="sp fam-' + x.def.fam + (x.why && !x.react ? " off" : "") + (incoming === x.c.u ? " incoming" : "") + '" data-u="' + x.c.u + '">' + IC.get(x.def.icon) + '</i>'; }).join("") + (n > 5 ? '<i class="sp more">+' + (n - 5) + '</i>' : '') +
        '</span><span class="g-hand-l"><b>' + lbl + '</b><small>' + n + ' carte' + (n > 1 ? "s" : "") + ' en main</small></span></button>' + disc;
    } else {
      var head = '<div class="dr-h"><b>' + (handMode === "targets" || handMode === "take" ? "Sur qui ?" : handMode === "detail" ? "Ta carte" : "Ma main") + '</b><small>' + (handMode === "row" ? n + " carte" + (n > 1 ? "s" : "") + (mine ? " · touche une carte" : "") : "") + '</small>' +
        '<button class="dr-x" data-g="' + (handMode === "row" ? "hand" : "back") + '">' + (handMode === "row" ? "Fermer" : "‹ Retour") + '</button></div>';
      var body = "";
      if (handMode === "row") {
        body = '<div class="dr-row">' + info.map(function (x) {
          return '<button class="g-hc' + (incoming === x.c.u ? " incoming" : "") + '" data-g="card" data-u="' + x.c.u + '" aria-label="' + esc(x.def.name) + (x.why && !x.react ? " (verrouillée : " + esc(x.why) + ")" : "") + '">' +
            cardHTML(x.c.k, { dim: !!x.why && !x.react, reason: x.why && !x.react ? x.why : "", pulse: guideFirst() }) + (!seen[x.c.k] && pub.discovery ? '<i class="hc-new">Nouveau</i>' : '') + '</button>';
        }).join("") + '</div>';
      } else if (handMode === "take") {
        body = '<div class="dr-detail"><div class="dr-card">' + cardHTML(pub.discardTop, {}) + '</div><div class="dr-side"><p class="dr-txt">Reprise dans la défausse : elle se joue tout de suite.</p><div class="dr-tg">' + targetsHTML(pub.discardTop, null, true) + '</div></div></div>';
      } else {
        var x = info.filter(function (y) { return y.c.u === sel; })[0];
        if (!x) { handMode = "row"; return renderHand(incoming); }
        var why2 = mine ? (pub.gate ? "Attends que tout le monde ait vu la scène" : x.why) : myDraw() ? "Pioche d'abord ta carte du tour" : "Ce n'est pas ton tour";
        var side = "";
        if (handMode === "targets" && !why2) side = '<div class="dr-tg">' + targetsHTML(x.c.k, x.c.u) + '</div>';
        else {
          side = '<p class="dr-txt">' + esc(x.def.text) + '</p>';
          if (x.def.target === "opponent" && x.def.counters) side += '<p class="dr-note">Parade possible : ' + esc(x.def.counters.map(function (k) { return card(k).name; }).join(", ")) + '</p>';
          if (x.react) side += '<p class="dr-note">Carte de réaction : elle servira quand on t\'attaquera.</p>';
          else if (why2) side += '<p class="dr-why">' + esc(why2) + '</p>';
          else side += '<button class="qv-btn g-primary" data-g="' + (x.def.target === "opponent" ? "pick" : "play") + '" data-u="' + x.c.u + '">' + (x.def.target === "opponent" ? "Choisir une cible" : "Jouer") + '</button>';
          if (mine && !pub.gate) side += '<div class="dr-sec"><button class="g-link" data-g="rest" data-u="' + x.c.u + '">Défausser</button>' +
            (pub.players[me.id].secours ? '<button class="g-link" data-g="study" data-u="' + x.c.u + '">Étudier à la place (+1 Formation)</button>' : '') + '</div>';
        }
        body = '<div class="dr-detail"><div class="dr-card">' + cardHTML(x.c.k, { reason: why2 && !x.react && mine ? why2 : "" }) + '</div><div class="dr-side">' + side + '</div></div>';
      }
      h.innerHTML = head + body;
    }
    unlocked.forEach(function (c) {
      var el = $('[data-u="' + c.u + '"]', h); if (el) el.classList.add("unlocked");
      unlockToast(c.k);
    });
    requestAnimationFrame(fitStage);
  }
  function targetsHTML(k, u, take) {
    var c = card(k), TQ = { hasJob: function (q) { return q.title; }, partner: function (q) { return q.married ? "Marié·e" : "En couple"; }, kids: function (q) { return q.kids.length + " enfant(s)"; }, housing: function (q) { return D.HOUSING[q.housing]; } };
    return E.validTargets(pub, me.id, k).map(function (id) {
      var q = pub.players[id], info = Object.keys(c.treq || {}).map(function (t) { return TQ[t] ? TQ[t](q) : ""; }).filter(Boolean)[0] || "";
      return '<button class="g-tg" data-g="target" ' + (take ? 'data-take="1"' : 'data-u="' + u + '"') + ' data-t="' + id + '">' + A.standalone(q.avatar, { mood: "worried", outfit: W.outfit(q) }, "tg-av", true) + '<span><b>' + esc(q.name) + '</b><small>' + esc(info) + '</small></span></button>';
    }).join("");
  }
  function unlockToast(k) {
    var c = card(k), r = c.req || {}, p = pub.players[me.id], txt;
    if (r.minR) txt = "Grâce à tes " + sv(me.id, "r") + " Réputation, « " + c.name + " » est débloquée !";
    else if (r.minB) txt = "Grâce à tes " + sv(me.id, "b") + " Bonheur, « " + c.name + " » est débloquée !";
    else if (c.cost && c.cost.f) txt = "Avec " + sv(me.id, "f") + " Fortune, tu peux t'offrir « " + c.name + " » !";
    else if (r.qualify) txt = "Grâce à ta Formation " + (p.edu || 0) + ", « " + c.name + " » est accessible !";
    else if (r.minEdu) txt = "Avec ta Formation " + (p.edu || 0) + ", « " + c.name + " » est jouable !";
    else if (r.partner) txt = "Maintenant que tu es en couple, « " + c.name + " » est jouable !";
    else txt = "« " + c.name + " » est maintenant jouable !";
    var html = '<i class="tk-ico">' + LOCK_OPEN + '</i><span>' + esc(txt) + '</span>';
    // pendant une scène, la nouvelle attend son tour dans la file (elle ne s'affiche pas sous la fenêtre)
    if (busy() && UI.phase !== "targetSelection") { enqueue({ kind: "tick", html: html, k: "unlock", ms: 3200, sfx: "unlock" }); return; }
    SND.play("unlock");
    notify(html, "unlock", 3600, true);
  }
  var LOCK_OPEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="11" width="16" height="11" rx="3" fill="#ffd23f" stroke="#2b2140" stroke-width="2"/><path d="M8 11 V7 a4 4 0 0 1 8 -1" fill="none" stroke="#2b2140" stroke-width="2.4" stroke-linecap="round"/></svg>';
  // la carte jouée quitte la main et file au centre (puis vers sa destination)
  function flyOut(u, toDiscard) {
    var el = $("#hand .dr-card") || $('#hand [data-u="' + u + '"]'); if (!el || reduce) return;
    var r = el.getBoundingClientRect(), ghost = el.cloneNode(true);
    ghost.className = "qv-ghost"; ghost.style.left = r.left + "px"; ghost.style.top = r.top + "px"; ghost.style.width = r.width + "px";
    document.body.appendChild(ghost); el.style.visibility = "hidden";
    var dest = toDiscard ? $(".pile.disc") || $("#hand") : null, c = dest ? center(dest) : { x: innerWidth / 2, y: innerHeight * 0.42 };
    var an = ghost.animate([{ transform: "translate(0,0) scale(1)" }, { transform: "translate(" + (c.x - r.left - r.width / 2) + "px," + (c.y - r.top - r.height / 2) + "px) scale(" + (toDiscard ? 0.3 : 1.25) + ")" }], { duration: 420, easing: "cubic-bezier(.3,.7,.3,1)", fill: "forwards" });
    ghost.id = toDiscard ? "" : "playzone";
    an.onfinish = function () { if (toDiscard) ghost.remove(); else setTimeout(function () { if (ghost.parentNode && !queue.length && !playing) settle(); }, 2500); };
  }
  // la carte jouée rejoint ma vie (tuile) ou la défausse
  function settle(cb) {
    var g = $("#playzone"); if (!g) { cb && cb(); return; }
    var t = $(".qv-mytile"), c = t ? center(t) : { x: innerWidth / 2, y: 100 }, r = g.getBoundingClientRect();
    var an = g.animate([{ transform: getComputedStyle(g).transform === "none" ? "none" : getComputedStyle(g).transform, opacity: 1 }, { transform: "translate(" + (c.x - r.left - r.width / 2) + "px," + (c.y - r.top - r.height / 2) + "px) scale(.15)", opacity: 0.2 }], { duration: 380, easing: "ease-in", fill: "forwards" });
    an.onfinish = function () { g.remove(); cb && cb(); };
  }

  function sheet(html, phase) {
    var s = $("#sheet"); if (!s) return;
    if ($("#ov")) return; // jamais une fiche par-dessus une fenêtre d'événement
    if (phase) setPhase(phase);
    s.classList.remove("is-prio");
    s.innerHTML = '<div class="qv-sheet-bg"' + (phase === "targetSelection" ? '' : ' data-g="close"') + '></div><div class="qv-sheet-box">' + html + '</div>';
    s.hidden = false; hideHint();
  }
  function closeSheet() { var s = $("#sheet"); if (s) { s.hidden = true; s.innerHTML = ""; } sel = null; if (UI.phase === "targetSelection" && !playing && !queue.length) setPhase("idle"); updateHint(); }
  // l'intention est partie chez l'hôte : on attend sa réponse (la main est verrouillée)
  var resolvT = null;
  function resolving() {
    setPhase("resolving"); clearTimeout(resolvT);
    resolvT = setTimeout(function () { if (UI.phase === "resolving" && !queue.length && !playing) { clearGhost(); setPhase("idle"); renderHand(); } }, 4000);
  }

  function openCard(u) { sel = u; setHand(true, "detail"); }
  function takeTargets() { setHand(true, "take"); }
  function flyFromDiscard() {
    var d = $(".pile.disc"); if (!d || reduce) return;
    var r = d.getBoundingClientRect(), g = document.createElement("div");
    g.className = "qv-ghost"; g.style.left = r.left + "px"; g.style.top = r.top + "px"; g.style.width = "116px";
    g.innerHTML = cardHTML(pub.discardTop, {}); document.body.appendChild(g);
    g.animate([{ transform: "scale(.4)" }, { transform: "translate(" + (innerWidth / 2 - r.left - 58) + "px," + (innerHeight * 0.42 - r.top - 80) + "px) scale(1.2)" }], { duration: 420, easing: "cubic-bezier(.3,.7,.3,1)", fill: "forwards" });
  }
  // historique de la défausse (face visible, consultable à tout moment)
  function discardSheet() {
    var list = pub.discardList || [];
    var HOW = { rest: "défaussée par", used: "jouée par", lost: "perdue par" };
    sheet('<h3>Défausse</h3><p class="qv-tip">Les cartes jouées une fois ou défaussées. Au début de ton tour, tu peux reprendre la dernière <b>si un autre joueur l\'a défaussée</b> et si tu peux la jouer : elle se joue alors tout de suite, à la place de ta pioche.</p>' +
      (list.length ? '<div class="ds-list">' + list.map(function (d, i) { var c = card(d.k); return '<div class="ds-c' + (i === 0 ? " top" : "") + '"><i class="face fam-' + c.fam + '">' + IC.get(c.icon) + '</i><b>' + esc(c.name) + '</b><small>' + (i === 0 ? "Dessus · " : "") + (HOW[d.how] || "") + " " + esc(d.by ? (d.by === me.id ? "toi" : nameOf(d.by)) : "") + '</small></div>'; }).join("") + '</div>' : '<p>La défausse est vide.</p>') +
      '<button class="qv-btn ghost sm" data-g="close">Fermer</button>');
  }
  // ---------- ATTAQUE CONTRE MOI : panneau d'interaction prioritaire ----------
  // qui m'attaque, avec quoi, ce que ça fait, et mes choix (une seule action mise en avant)
  function maybeReact() {
    if (!pub || pub.phase !== "react" || !pub.pending || pub.pending.to !== me.id || queue.length || playing || !priv || $("#ov")) return;
    if ($("#sheet") && !$("#sheet").hidden && $("#sheet .prio")) return;
    var pd = pub.pending, ac = card(pd.k), p = pub.players[me.id], att = pub.players[pd.from];
    var counters = priv.hand.filter(function (h) { return (ac.counters || []).indexOf(h.k) >= 0; });
    var o = '<div class="prio"><div class="prio-h">' + A.standalone(att.avatar, { mood: "smug", outfit: W.outfit(att) }, "prio-av", true) + '<div><b>' + esc(att.name) + ' t\'attaque !</b><span>« ' + esc(ac.name) + ' » : ' + esc(window.QV_CARDS.EFF[pd.k] || ac.text) + '</span></div></div>' +
      '<div class="prio-card">' + cardHTML(pd.k, {}) + '</div><div class="prio-opts">';
    counters.forEach(function (h, i) {
      o += '<button class="qv-btn ' + (i === 0 ? "g-primary" : "g-second") + '" data-g="react" data-c="defend" data-u="' + h.u + '">Contrer avec « ' + esc(card(h.k).name) + ' »</button>';
    });
    o += '<button class="qv-btn ' + (counters.length ? "g-second" : "g-primary") + '" data-g="react" data-c="accept">Encaisser<small>' + esc(ac.bounce ? ac.bounce.label : "") + ' · 2 cartes au prochain tour</small></button>';
    if (ac.soft) {
      var ok = E.affordable(p, ac.soft.cost);
      o += '<button class="qv-btn g-second" data-g="react" data-c="soft"' + (ok ? "" : " disabled") + '>' + esc(ac.soft.label) + '<small>Coûte ' + esc(E.costText(ac.soft.cost)) + (ok ? "" : " — pas assez") + '</small></button>';
    }
    if (pub.mode === "adult") o += '<button class="qv-btn g-second" data-g="react" data-c="spite">Balancer un dossier<small>Tu encaisses sans rebond, ' + esc(att.name) + ' perd 3 réputation</small></button>';
    if (!counters.length) o += '<p class="prio-tip">Aucune parade en main' + ((ac.counters || []).length ? ' (il aurait fallu ' + esc(ac.counters.map(function (k) { return "« " + card(k).name + " »"; }).join(" ou ")) + ')' : '') + '.</p>';
    o += '</div></div>';
    sheet(o, "targetSelection");
    var sh = $("#sheet"); if (sh) sh.classList.add("is-prio");
  }

  function gameClick(e) {
    var b = e.target.closest("[data-g]");
    if (!b) { if (handOpen && !e.target.closest("#hand, #sheet")) setHand(false); return; }
    SND.unlock();
    var g = b.dataset.g;
    if (g === "close") { closeSheet(); renderHand(); maybeReact(); return; }
    SND.play("tap");
    if (g === "card") { SND.play("card"); return openCard(+b.dataset.u); }
    if (g === "hand") { setHand(!handOpen, "row"); return; }
    if (g === "back") { if (handMode === "targets") setHand(true, "detail"); else if (handMode === "take") setHand(false); else { sel = null; setHand(true, "row"); } return; }
    if (g === "pick") { sel = +b.dataset.u; setHand(true, "targets"); return; }
    if (g === "res") { resSheet(b.dataset.k); return; }
    if (g === "reduce") { reduce = !reduce; store("qv-reduce", reduce); document.body.classList.toggle("reduce", reduce); closeSheet(); toast(reduce ? "Animations réduites" : "Animations complètes"); return; }
    if (g === "play") { if (busy()) return; if (guideFirst()) { markSeen("guide1"); hideHint(); } flyOut(+b.dataset.u, false); sel = null; handOpen = false; handMode = "row"; resolving(); sendIntent({ t: "play", u: +b.dataset.u }); renderHand(); return; }
    if (g === "intro") { closeSheet(); intro(true); return; }
    if (g === "target") { closeSheet(); if (b.dataset.u) flyOut(+b.dataset.u, false); sel = null; handOpen = false; handMode = "row"; resolving(); renderHand(); sendIntent(b.dataset.take ? { t: "take", target: b.dataset.t } : { t: "play", u: +b.dataset.u, target: b.dataset.t }); return; }
    if (g === "rest") { if (busy() && UI.phase !== "targetSelection") return; closeSheet(); flyOut(+b.dataset.u, true); sel = null; handOpen = false; handMode = "row"; resolving(); sendIntent({ t: "rest", u: +b.dataset.u }); renderHand(); return; }
    if (g === "study") { if (busy()) return; closeSheet(); flyOut(+b.dataset.u, true); sel = null; handOpen = false; handMode = "row"; resolving(); sendIntent({ t: "study", u: +b.dataset.u }); renderHand(); return; }
    if (g === "draw") { if (busy()) return; SND.play("card"); resolving(); sendIntent({ t: "draw" }); return; }
    if (g === "take") { if (busy()) return; var tk = card(pub.discardTop); if (tk.target === "opponent") return takeTargets(); resolving(); flyFromDiscard(); sendIntent({ t: "take" }); return; }
    if (g === "discard") { discardSheet(); return; }
    if (g === "deckinfo") { toast("Pioche : " + pub.deck + " cartes face cachée. Tu pioches une carte au début de ton tour."); return; }
    if (g === "react") { closeSheet(); resolving(); sendIntent({ t: "react", choice: b.dataset.c, u: b.dataset.u ? +b.dataset.u : undefined }); return; }
    if (g === "sound") { SND.toggle(); b.textContent = SND.muted() ? "🔇" : "🔊"; return; }
    if (g === "obj") {
      sheet('<h3>Objectifs secrets</h3><p class="qv-tip">Personne d\'autre ne les voit. Ils rapportent des points à la fin s\'ils sont remplis.</p>' +
        (priv && priv.obj ? priv.obj.map(function (o) { return '<div class="qv-obj' + (o.done ? " done" : "") + '"><b>' + esc(o.name) + ' <i>+' + o.pts + '</i></b><span>' + esc(o.text) + '</span><em>' + (o.done ? "Rempli pour l'instant" : "Pas encore") + '</em></div>'; }).join("") : "") +
        '<button class="qv-btn ghost sm" data-g="close">Fermer</button>');
      return;
    }
    if (g === "life" || g === "who") { boardSheet(g === "life" ? me.id : b.dataset.pid); return; }
    if (g === "journal") { journalSheet(); return; }
    if (g === "jev") { journalDetail(+b.dataset.id); return; }
    if (g === "replay") {
      var rev = hist.filter(function (x) { return x.id === +b.dataset.id; })[0];
      closeSheet();
      if (rev && rev.scene) { queue.push({ kind: "scene", ev: rev, replay: true }); if (!playing) next(); }
      return;
    }
    if (g === "menu") {
      sheet('<h3>Menu</h3>' + (room && !room.solo ? '<p class="qv-tip">Salon <b>' + esc(room.code) + '</b>. Si tu quittes, tu peux revenir avec ce code tant que la partie tourne' + (room.host ? " (tu es l'hôte : la partie s'arrête sans toi)." : ".") + '</p>' : '') +
        '<button class="qv-btn ghost" data-g="intro">Revoir l\'introduction</button><button class="qv-btn ghost" data-g="rules">Règles</button>' +
        (room && !room.solo ? '<button class="qv-btn ghost" data-g="invite">Copier le lien d\'invitation</button>' : '') +
        '<button class="qv-btn ghost" data-g="reduce">' + (reduce ? "Animations réduites : oui" : "Animations réduites : non") + '</button>' +
        '<button class="qv-btn danger" data-g="quit">Quitter la partie</button><button class="qv-btn ghost sm" data-g="close">Fermer</button>');
      return;
    }
    if (g === "rules") { closeSheet(); rules(); return; }
    if (g === "invite") { var link = location.origin + location.pathname + "#" + room.code; if (navigator.clipboard) navigator.clipboard.writeText(link).then(function () { toast("Lien copié"); }); closeSheet(); return; }
    if (g === "quit") { closeSheet(); if (room && room.solo) store("qv-last", null); window.history.replaceState(null, "", location.pathname + location.search); home(); return; }
  }

  // ======================================================================
  //  FIN DE PARTIE
  // ======================================================================
  // FIN DE PARTIE : un podium, le décompte des points sans calcul mental, la vie de chacun en résumé
  function renderEnd() {
    if (!pub) return;
    var ranked = pub.order.slice().sort(function (a, b) { return pub.players[b].final.total - pub.players[a].final.total; });
    var w = pub.winners || [pub.winner], iWin = w.indexOf(me.id) >= 0;
    var podium = [ranked[1], ranked[0], ranked[2]].filter(Boolean).map(function (id) {
      var p = pub.players[id], rank = ranked.indexOf(id), win = w.indexOf(id) >= 0;
      return '<div class="pd pd-' + (rank + 1) + '">' + A.standalone(p.avatar, { mood: win ? "happy" : rank === ranked.length - 1 ? "sad" : "neutral", outfit: W.outfit(p), hat: win ? "crown" : null, pose: win ? "up" : "down" }, "pd-av") +
        '<b>' + esc(id === me.id ? "Toi" : p.name) + '</b><span>' + p.final.total + ' pts</span><i>' + (rank + 1) + '</i></div>';
    }).join("");
    var line = function (label, v, cls) { return '<div class="sc-l' + (cls ? " " + cls : "") + '"><span>' + label + '</span><b>' + v + '</b></div>'; };
    var cards = ranked.map(function (id, i) {
      var p = pub.players[id], f = p.final, win = w.indexOf(id) >= 0;
      var objPts = f.obj.reduce(function (a, o) { return a + (o.done ? o.pts : 0); }, 0);
      var summary = [p.title !== "Sans emploi" ? p.title : (p.retired ? "Retraité·e" : "Sans emploi"), "Formation " + (p.edu || 0), (p.housing ? D.HOUSING[p.housing] : "Chez ses parents"), p.married ? "Marié·e" : p.partner ? "En couple" : "Célibataire", p.kids.length ? p.kids.length + " enfant" + (p.kids.length > 1 ? "s" : "") : ""].filter(Boolean);
      return '<article class="ec' + (win ? " win" : "") + (id === me.id ? " me" : "") + '"><div class="ec-h"><span class="ec-n">' + (i + 1) + '</span><div><h3>' + esc(id === me.id ? p.name + " (toi)" : p.name) + '</h3><p>' + esc(summary.join(" · ")) + '</p></div><b class="ec-t">' + f.total + '<small>pts</small></b></div>' +
        '<div class="ec-w">' + W.tile(p) + '</div>' +
        '<div class="sc">' + line(IC.get("b", "qv-ri") + "Bonheur", f.b) + line(IC.get("f", "qv-ri") + "Fortune", f.f) + line(IC.get("r", "qv-ri") + "Réputation", f.r) +
        f.obj.map(function (o) { return line((o.done ? "✓ " : "✗ ") + "Objectif : " + esc(o.name), o.done ? "+" + o.pts : "0", o.done ? "ok" : "off"); }).join("") +
        f.trophies.map(function (t) { return line("Trophée : " + esc(t.name), "+" + t.pts, "gold"); }).join("") +
        line("Total", f.total, "tot") + '</div>' +
        '<details><summary>Sa vie en ' + p.life.length + ' moments</summary><ol class="qv-life">' + p.life.map(function (l) { return '<li class="t-' + l.tone + '"><b>' + l.age + ' ans</b> ' + esc(l.text) + '</li>'; }).join("") + '</ol></details></article>';
    }).join("");
    show("end", '<div class="qv-page qv-end2">' +
      '<div class="end-hero"><p class="end-k">Fin de partie · ' + pub.age + ' ans</p><h2>' + (iWin ? "Tu as eu la plus belle vie !" : esc(w.map(nameOf).join(" et ")) + (w.length > 1 ? " ont" : " a") + " eu la plus belle vie !") + '</h2>' +
      '<div class="podium">' + podium + '</div></div>' +
      '<div class="end-list">' + cards + '</div>' +
      '<div class="end-act">' + (room && room.host ? '<button class="qv-btn big" data-e="again">Revanche !</button>' : '<p class="qv-wait">L\'hôte peut relancer une revanche.</p>') +
      '<button class="g-link" data-e="home">Retour à l\'accueil</button></div></div>');
    if (!reduce) { var cf = document.createElement("div"); cf.className = "end-confetti"; for (var c = 0; c < 26; c++) cf.innerHTML += '<i style="left:' + (c * 3.9 % 100) + '%;animation-delay:' + (c % 9) * 0.18 + 's;background:' + ["#ff6b4a", "#ffd23f", "#3d7dd8", "#38b58a", "#e5487a"][c % 5] + '"></i>'; $(".end-hero").appendChild(cf); }
    app.onclick = function (e) {
      var b = e.target.closest("[data-e]"); if (!b) return;
      SND.play("tap");
      if (b.dataset.e === "again") { logLines = []; lastEv = 0; G = null; pub = null; screen = ""; hostStart(); }
      else { store("qv-last", null); window.history.replaceState(null, "", location.pathname + location.search); home(); }
    };
  }

  // ---------------- divers ----------------
  var toastT = null;
  function toast(t) { notify(t, "", 2600); }
  function floatToast(t) {
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

  if (/[?&]debug=1/.test(location.search)) window.QV_DEBUG = {
    give: function (k, pid) { if (!G) return false; var p = G.players[pid || me.id], i = G.deck.findIndex(function (c) { return c.k === k; }); var c = i >= 0 ? G.deck.splice(i, 1)[0] : { u: G.nextU++, k: k }; p.hand.push(c); hostBroadcast(); return c.u; },
    act: function (a) { return hostApply(a, a.pid); },
    state: function () { return G; },
  };
  // accès pour les tests automatiques
  window.QV_APP = { me: me, deal: function () { return { dealt: Object.keys(dealt), dealing: Object.keys(dealing), hand: priv && priv.hand.map(function (c) { return c.u; }), playing: playing && playing.kind, q: queue.map(function (i) { return i.kind; }) }; }, state: function () { return { screen: screen, pub: pub, priv: priv, room: room && { code: room.code, host: room.host }, queue: queue.length + (playing ? 1 : 0) }; }, skip: function () { var io = document.querySelector("#intro [data-i=skip]"); if (io) io.click(); queue = []; next(); } };
})();
