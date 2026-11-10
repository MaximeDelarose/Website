/* =========================================================================
   Ronceclair — interface façon Dofus / Wakfu (js/ronceclair-ui.js)
   Écran titre animé · choix du personnage (5 emplacements) · création (classe, pelage, nom)
   · barre de jeu : portrait, PV, XP, et en combat PA / PM, barre de sorts, frise des tours, « Fin du tour »
   · fenêtres : inventaire (poupée), caractéristiques élémentaires, sorts, quêtes, menu, boutique, résultat de combat.
   Le moteur (js/ronceclair.js) expose window.RC ; ce fichier lui fournit RC.ui.
   ========================================================================= */
(function () {
  "use strict";
  var RC = window.RC, stage = document.querySelector("[data-ronceclair]");
  var root = stage && stage.querySelector("[data-ui]");
  if (!RC || !stage || !root) return;
  var D = RC.D, ART = RC.ART, TACT = RC.T;

  /* ---------- outils ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(s, el) { return (el || root).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || root).querySelectorAll(s)); }
  function ico(name, cls) { return '<img class="rcu-ico ' + (cls || "") + '" src="' + ART.icon(name) + '" alt="">'; }
  function itemImg(it, cls) { return '<img class="rcu-ico ' + (cls || "") + '" src="' + ART.itemIconURL(it.slot, it.look) + '" alt="">'; }
  function elIco(e, cls) { return ico(D.ELEMENTS[e].icon, cls || "sm"); }
  function elCol(e) { return D.ELEMENTS[e].col; }
  function rar(it) { return D.RARITIES[it.rar]; }
  function fmt(n) { return Math.round(n).toLocaleString("fr-FR"); }
  function r1(n) { return Math.round(n * 10) / 10; }
  var NAMES = ["Noisette", "Glandine", "Brindille", "Pistache", "Châtaigne", "Ronce", "Samare", "Faîne", "Cupule", "Mousse", "Bourgeon", "Épi"];
  function randName() { return NAMES[Math.floor(Math.random() * NAMES.length)]; }
  function click() { try { RC.sfx.coin(); } catch (e) {} }
  function elChips(vals, suffix, extra) { return D.EL_ORDER.map(function (e) { return '<span class="rcu-el ' + (extra || "") + '" style="--c:' + elCol(e) + '" title="' + D.ELEMENTS[e].name + '">' + elIco(e) + '<b>' + Math.round(vals[e]) + (suffix || "") + '</b></span>'; }).join(""); }

  var U = { screen: "", sel: 0, cls: "gardien", fur: "roux", name: "", tab: "inventaire", selItem: null, pending: null, locked: false, scene: null, hudTimer: 0, msg: "" };
  var hm = /#rc=([A-Z]{4})/i.exec(location.hash);
  if (hm) U.pending = hm[1].toUpperCase();

  /* ---------- squelette ---------- */
  root.innerHTML =
    '<div class="rcu-screen" data-screen hidden></div>' +
    '<div class="rcu-hud" data-hud hidden>' +
      '<div class="rcu-timeline" data-z="timeline"></div>' +
      '<div class="rcu-topleft"><div class="rcu-zone" data-z="zone"></div><div class="rcu-mate" data-z="mate" hidden></div></div>' +
      '<div class="rcu-quest" data-z="quest"></div>' +
      '<div class="rcu-menus">' +
        '<button type="button" data-open="inventaire" title="Inventaire (I)">' + ico("bag") + '</button>' +
        '<button type="button" data-open="stats" title="Caractéristiques (C)">' + ico("star") + '<em data-z="pts" hidden>0</em></button>' +
        '<button type="button" data-open="sorts" title="Sorts (K)">' + ico("nova") + '</button>' +
        '<button type="button" data-open="quetes" title="Quêtes (J)">' + ico("scroll") + '</button>' +
        '<button type="button" data-open="menu" title="Menu (Échap)">' + ico("gear") + '</button>' +
      '</div>' +
      '<div class="rcu-bar" data-z="bar">' +
        '<div class="rcu-portrait"><img data-z="face" alt=""><b data-z="lvl">1</b></div>' +
        '<div class="rcu-vitals">' +
          '<div class="rcu-hp"><i data-z="hpbar"></i><u data-z="shield"></u><span data-z="hptxt"></span></div>' +
          '<div class="rcu-xp"><i data-z="xpbar"></i></div>' +
          '<div class="rcu-res"><span>' + ico("nut", "sm") + '<b data-z="gold">0</b></span><span>' + ico("potion", "sm") + '<b data-z="pots">0</b></span></div>' +
        '</div>' +
        '<div class="rcu-orbs" data-z="orbs"><div class="rcu-orb pa" title="Points d\'action : coûtent aux sorts"><b data-z="pa">6</b><small>PA</small></div><div class="rcu-orb pm" title="Points de mouvement : 1 par case"><b data-z="pm">3</b><small>PM</small></div></div>' +
        '<div class="rcu-spells" data-z="spells"></div>' +
        '<button type="button" class="rcu-endturn" data-z="end" data-act="endturn">Fin du tour</button>' +
      '</div>' +
    '</div>' +
    '<div class="rcu-win" data-win hidden></div>' +
    '<div class="rcu-banner" data-banner hidden></div>';
  var elScreen = $("[data-screen]"), elHud = $("[data-hud]"), elWin = $("[data-win]"), elBanner = $("[data-banner]");

  /* =============================================================
     DÉCOR ANIMÉ (écran titre, sélection, création) — pixel-art, forêt et écureuils
     ============================================================= */
  function sceneMap() {
    var w = 26, h = 15, t = [], deco = [], x, y, Z = { col: { g1: "#92d06c", g2: "#86c561", path: "#dcc592", tree: "#2f7a45", tree2: "#3d9556", water: "#62b8dc" } };
    for (y = 0; y < h; y++) { t.push([]); for (x = 0; x < w; x++) {
      var k = 0, hv = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
      if (y < 3 || x < 1 || x >= w - 1 || (y < 5 && hv < 0.6)) k = 3;
      if (y === 9 || y === 10) k = 1;
      if (y >= 12 && x >= 17 && x <= 21) k = 2;
      if (k === 0 && hv > 0.96) k = 4;
      t[y].push(k);
      if (k === 0 && hv < 0.16) deco.push({ x: x * 48 + hv * 300, y: y * 48 + 20, k: hv < 0.06 ? "fleur" : hv < 0.11 ? "touffe" : "fleur", c: Math.floor(hv * 40) % 4 });
    } }
    return { Z: Z, w: w, h: h, t: t, deco: deco, zi: 0 };
  }
  function Scene(canvas, withActors) {
    var c2 = canvas.getContext("2d"), map = sceneMap(), pre = ART.terrain(map), t0 = performance.now(), raf = 0, leaves = [], actors = [];
    var specs = [{ fur: "roux", tete: "noix", main: "bouclier" }, { fur: "cendre", tete: "sorcier", dos: "nuit", main: "baton" }, { fur: "chocolat", tete: "feuille", dos: "mousse", main: "fleur" }, { fur: "roux", tete: "bandeau", main: "gland" }];
    if (withActors) actors = [{ spec: specs[0], x: 3.6, flip: false }, { spec: specs[1], x: 6.6, flip: false }, { spec: specs[2], x: 19.4, flip: true }, { spec: specs[3], x: 22.4, flip: true }];
    function size() { var r = canvas.getBoundingClientRect(); canvas.width = Math.max(200, Math.round(r.width)); canvas.height = Math.max(200, Math.round(r.height)); }
    function frame(now) {
      if (!canvas.isConnected) return;
      var t = (now - t0) / 1000, W = canvas.width, H = canvas.height;
      c2.imageSmoothingEnabled = false;
      var S = Math.max(2, Math.ceil(Math.max(W / (map.w * 16), H / (map.h * 16)))), mw = map.w * 16 * S, mh = map.h * 16 * S;
      var ox = -Math.round((mw - W) / 2 + Math.sin(t * 0.15) * Math.max(0, (mw - W) / 2)), oy = -Math.round((mh - H) / 2 + 14 * S);
      c2.fillStyle = "#1f3a2b"; c2.fillRect(0, 0, W, H);
      c2.drawImage(pre, ox, oy, mw, mh);
      actors.forEach(function (a, i) {
        var spr = ART.hero(a.spec, Math.floor(t * 1.4 + i) % 2), px = ox + a.x * 16 * S, py = oy + 10.2 * 16 * S + Math.round(Math.sin(t * 2 + i) * 0.5) * S;
        c2.fillStyle = "rgba(0,0,0,.3)"; c2.fillRect(px - 9 * S, py - S, 18 * S, S); c2.fillRect(px - 6 * S, py, 12 * S, S);
        c2.save(); c2.translate(Math.round(px), Math.round(py)); if (a.flip) c2.scale(-1, 1);
        c2.drawImage(spr.c, -spr.ax * S, -spr.ay * S, spr.w * S, spr.h * S); c2.restore();
      });
      if (leaves.length < 26 && Math.random() < 0.25) leaves.push({ x: Math.random() * W, y: -10, vx: 20 + Math.random() * 30, vy: 25 + Math.random() * 30, c: ["#9be8a8", "#58b36a", "#e0a82a", "#d97a3a"][Math.floor(Math.random() * 4)], p: Math.random() * 6 });
      for (var i = leaves.length - 1; i >= 0; i--) {
        var l = leaves[i]; l.x += (l.vx + Math.sin(t * 2 + l.p) * 20) / 60; l.y += l.vy / 60;
        c2.fillStyle = l.c; c2.fillRect(Math.round(l.x / 3) * 3, Math.round(l.y / 3) * 3, 3 * (S > 3 ? 2 : 1), 3);
        if (l.y > H + 10) leaves.splice(i, 1);
      }
      raf = requestAnimationFrame(frame);
    }
    size(); window.addEventListener("resize", size);
    raf = requestAnimationFrame(frame);
    return { stop: function () { cancelAnimationFrame(raf); window.removeEventListener("resize", size); } };
  }
  function startScene() { stopScene(); var c = $("[data-scene]"); if (c) U.scene = Scene(c, U.screen === "title"); }
  function stopScene() { if (U.scene) { U.scene.stop(); U.scene = null; } }

  // écureuil de prévisualisation (animé) sur un canvas
  var previews = [];
  function drawPreview(c) {
    var spec = c.__spec(); if (!spec) return;
    var g = c.getContext("2d"), S = +c.getAttribute("data-s") || 8, t = performance.now() / 1000;
    g.imageSmoothingEnabled = false; g.clearRect(0, 0, c.width, c.height);
    var spr = ART.hero(spec, Math.floor(t * 1.4) % 2), x = c.width / 2, y = c.height - 4 * S;
    g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(x - 10 * S, y - S, 20 * S, S); g.fillRect(x - 7 * S, y, 14 * S, S);
    g.drawImage(spr.c, Math.round(x - spr.ax * S), Math.round(y - spr.ay * S + Math.sin(t * 2) * S * 0.4), spr.w * S, spr.h * S);
  }
  function bindPreviews() { previews = $$("canvas[data-preview]").filter(function (c) { return c.isConnected; }); }
  setInterval(function () { previews = previews.filter(function (c) { return c.isConnected; }); previews.forEach(drawPreview); }, 120);
  function previewCanvas(w, h, s, specFn) { var id = "pv" + Math.floor(Math.random() * 1e6); return { html: '<canvas class="rcu-preview" id="' + id + '" data-preview data-s="' + s + '" width="' + w + '" height="' + h + '"></canvas>', bind: function () { var c = document.getElementById(id); if (c) { c.__spec = specFn; drawPreview(c); } } }; }

  /* =============================================================
     ÉCRANS : titre · sélection · création
     ============================================================= */
  function showScreen(name, html) {
    U.screen = name; elScreen.hidden = false; elHud.hidden = true; elScreen.className = "rcu-screen rcu-s-" + name;
    elScreen.innerHTML = '<canvas class="rcu-scene" data-scene></canvas><div class="rcu-shade"></div>' + html;
    startScene();
  }
  function hideScreen() { elScreen.hidden = true; elScreen.innerHTML = ""; stopScene(); U.screen = ""; }

  function screenTitle(msg) {
    closeWin(true);
    showScreen("title",
      '<div class="rcu-logo"><img class="rcu-logo-sq" src="' + ART.heroURL({ fur: "roux", tete: "noix", main: "bouclier" }, 0) + '" alt=""><h1>Ronceclair</h1><p>RPG tactique · la guilde des écureuils</p></div>' +
      (msg ? '<p class="rcu-notice">' + esc(msg) + '</p>' : '') +
      (U.pending ? '<p class="rcu-notice ok">Invitation au salon <b>' + U.pending + '</b> : choisis ton personnage pour rejoindre ton ami.</p>' : '') +
      '<nav class="rcu-menu">' +
        '<button class="rcu-btn big" type="button" data-act="play">Jouer</button>' +
        '<button class="rcu-btn big alt" type="button" data-act="coop">Coop en ligne</button>' +
        '<button class="rcu-btn" type="button" data-act="options">Options</button>' +
        '<button class="rcu-btn" type="button" data-act="credits">Crédits</button>' +
      '</nav>' +
      '<div class="rcu-foot">v' + esc(RC.version) + ' · AkarisuMD</div>');
  }

  function slotRow(p, i) {
    var C = D.CLASSES[p.cls];
    return '<button type="button" class="rcu-slot' + (i === U.sel ? " on" : "") + '" data-act="sel" data-i="' + i + '"><img src="' + ART.headURL(RC.lookSpec(p)) + '" alt=""><span><b>' + esc(p.name) + '</b><small>' + C.name + ' · niv. ' + p.lvl + '</small></span></button>';
  }
  function screenSelect(coopMode) {
    var slots = RC.slots(); if (U.sel >= slots.length) U.sel = Math.max(0, slots.length - 1);
    if (!slots.length) { screenCreate(true); return; }
    var p = slots[U.sel], C = D.CLASSES[p.cls], st = D.computeStats(p), h = '';
    h += '<div class="rcu-head"><h2>Choix du personnage</h2></div><div class="rcu-sel">';
    h += '<aside class="rcu-list">';
    slots.forEach(function (q, i) { h += slotRow(q, i); });
    for (var i = slots.length; i < D.MAX_SLOTS; i++) h += '<button type="button" class="rcu-slot blank" data-act="new"><span class="plus">+</span><span><b>Nouveau personnage</b><small>Choisis ta classe et ton pelage</small></span></button>';
    h += '</aside>';
    var pv = previewCanvas(260, 250, 8, function () { var q = RC.slots()[U.sel]; return q && RC.lookSpec(q); });
    h += '<section class="rcu-center"><div class="rcu-pedestal">' + pv.html + '</div><h3 class="rcu-name">' + esc(p.name) + '</h3><p class="rcu-sub">' + C.title + ' · niveau ' + p.lvl + '</p>';
    h += '<div class="rcu-eqrow">';
    D.SLOT_ORDER.forEach(function (s) { var it = p.eq[s]; h += '<div class="rcu-eqslot" title="' + (it ? esc(it.name) : D.SLOTS[s].name) + '"' + (it ? ' style="border-color:' + rar(it).col + '"' : '') + '>' + (it ? itemImg(it) : '<small>' + D.SLOTS[s].name + '</small>') + '</div>'; });
    h += '</div></section>';
    h += '<aside class="rcu-info"><div class="rcu-card"><h4>' + C.role + '</h4><p>' + esc(C.desc) + '</p></div>';
    h += '<div class="rcu-card"><h4>Statistiques</h4><ul class="rcu-stats">' +
      '<li><span>PV</span><b>' + st.maxHp + '</b></li><li><span>PA / PM</span><b>' + st.pa + ' / ' + st.pm + '</b></li><li><span>Initiative</span><b>' + st.init + '</b></li></ul>' +
      '<div class="rcu-elrow" title="Bonus de dégâts par élément">' + elChips(st.el, " %") + '</div></div>';
    h += '<div class="rcu-card"><h4>Sorts</h4><div class="rcu-spellrow">';
    C.spells.forEach(function (sid) { var sp = D.SPELLS[sid], ok = p.lvl >= sp.lvl; h += '<div class="rcu-sk' + (ok ? "" : " lock") + '" style="border-color:' + elCol(sp.el) + '" title="' + esc(sp.name + (ok ? "" : " (niveau " + sp.lvl + ")")) + '">' + ico(sp.icon) + '</div>'; });
    h += '</div></div></aside></div>';
    h += '<div class="rcu-actions"><button class="rcu-btn" type="button" data-act="back">← Retour</button><button class="rcu-btn danger" type="button" data-act="del">Supprimer</button><span class="grow"></span>';
    if (U.pending) h += '<button class="rcu-btn big alt" type="button" data-act="joinpending">Rejoindre le salon ' + U.pending + '</button>';
    else h += '<button class="rcu-btn alt" type="button" data-act="coopmenu">Coop en ligne</button><button class="rcu-btn big" type="button" data-act="start">Jouer</button>';
    h += '</div>';
    showScreen("select", h); pv.bind();
    if (coopMode) coopMenu();
  }

  function spellLine(sp, lvl) {
    var rg = sp.min === sp.max ? (sp.max === 0 ? "soi" : sp.max) : sp.min + "–" + sp.max;
    return 'niv. ' + lvl + ' · ' + sp.pa + ' PA · portée ' + rg + (sp.line ? " (ligne)" : "") + (sp.los ? " · vue" : "") + (sp.cd ? " · recharge " + sp.cd : "") + (sp.perTurn ? " · " + sp.perTurn + "/tour" : "");
  }
  function screenCreate(first) {
    var C = D.CLASSES[U.cls], h = '';
    if (!U.name) U.name = randName();
    h += '<div class="rcu-head"><h2>Création du personnage</h2></div><div class="rcu-sel create">';
    h += '<aside class="rcu-list">';
    D.CLASS_ORDER.forEach(function (k) { var c = D.CLASSES[k]; h += '<button type="button" class="rcu-slot' + (k === U.cls ? " on" : "") + '" data-act="cls" data-k="' + k + '">' + ico(c.icon, "big") + '<span><b>' + c.name + '</b><small>' + c.role + '</small></span></button>'; });
    h += '</aside>';
    var pv = previewCanvas(260, 250, 8, function () { return { fur: U.fur, tete: D.CLASSES[U.cls].starter.tete, dos: null, main: D.CLASSES[U.cls].starter.main }; });
    h += '<section class="rcu-center"><div class="rcu-pedestal">' + pv.html + '</div>';
    h += '<label class="rcu-field">Nom <input data-name type="text" maxlength="14" value="' + esc(U.name) + '" autocomplete="off" spellcheck="false"><button type="button" class="rcu-dice" data-act="dice" title="Nom au hasard">🎲</button></label>';
    h += '<div class="rcu-furs"><span>Pelage</span>';
    D.FUR_ORDER.forEach(function (f) { h += '<button type="button" class="rcu-fur' + (f === U.fur ? " on" : "") + '" data-act="fur" data-f="' + f + '" title="' + D.FURS[f].name + ' : ' + esc(D.FURS[f].desc) + '"><img src="' + ART.headURL({ fur: f, tete: null }) + '" alt=""><small>' + D.FURS[f].name + '</small></button>'; });
    h += '</div></section>';
    h += '<aside class="rcu-info"><div class="rcu-card"><h4>' + C.title + '</h4><div class="rcu-elrow">' + C.el.map(function (e) { return '<span class="rcu-el" style="--c:' + elCol(e) + '">' + elIco(e) + '<b>' + D.ELEMENTS[e].name + '</b></span>'; }).join("") + '</div><p>' + esc(C.desc) + '</p>';
    h += '<ul class="rcu-bars">'; Object.keys(C.stars).forEach(function (k) { h += '<li><span>' + k + '</span><i>' + [0, 1, 2, 3, 4].map(function (n) { return '<b class="' + (n < C.stars[k] ? "on" : "") + '"></b>'; }).join("") + '</i></li>'; }); h += '</ul></div>';
    h += '<div class="rcu-card"><h4>Sorts</h4><ul class="rcu-skills"><li>' + ico("star") + '<div><b>Passif · ' + esc(C.passive.name) + '</b><small>' + esc(C.passive.text) + '</small></div></li>';
    C.spells.forEach(function (sid) { var sp = D.SPELLS[sid]; h += '<li>' + ico(sp.icon) + '<div><b style="color:' + elCol(sp.el) + '">' + esc(sp.name) + '</b><small>' + spellLine(sp, sp.lvl) + '</small><small>' + esc(sp.text) + '</small></div></li>'; });
    h += '</ul></div></aside></div>';
    h += '<div class="rcu-actions">' + (first && !RC.slots().length ? '<button class="rcu-btn" type="button" data-act="back">← Titre</button>' : '<button class="rcu-btn" type="button" data-act="cancelcreate">← Retour</button>') + '<span class="grow"></span><button class="rcu-btn big" type="button" data-act="create">Créer le personnage</button></div>';
    showScreen("create", h); pv.bind();
  }

  /* ---------- actions des écrans ---------- */
  function startSel(coop) {
    var p = RC.slots()[U.sel]; if (!p) return;
    RC.select(p);
    hideScreen();
    if (coop === "host") {
      var code = RC.host();
      if (!code) { screenSelect(); showMsg(RC.net.err || "Coop indisponible"); return; }
      RC.start(p); setTimeout(function () { openInvite(); }, 250);
    } else RC.start(p);
  }
  function joinCode(code) {
    var p = RC.slots()[U.sel]; if (!p) return;
    RC.select(p);
    elWin.hidden = true;
    showScreen("joining", '<div class="rcu-joining"><h2>Salon ' + esc(code) + '</h2><p>Connexion à ton ami…</p><button class="rcu-btn" type="button" data-act="canceljoin">Annuler</button></div>');
    U.pending = null;
    if (!RC.join(code)) { screenSelect(); showMsg(RC.net.err || "Connexion impossible"); }
  }
  function coopMenu() {
    var h = '<div class="rcu-dlg"><h3>Coop en ligne (2 joueurs)</h3><p class="rcu-sub">Combattez ensemble, chacun avec son personnage, son niveau et ses quêtes.</p>' +
      '<button class="rcu-btn big" type="button" data-act="host">Créer un salon</button>' +
      '<p class="rcu-or">ou rejoins le salon d\'un ami</p>' +
      '<div class="rcu-join"><input data-code type="text" maxlength="4" placeholder="CODE" autocapitalize="characters" autocomplete="off" spellcheck="false"><button class="rcu-btn" type="button" data-act="join">Rejoindre</button></div>' +
      (RC.net.err ? '<p class="rcu-notice">' + esc(RC.net.err) + '</p>' : '') +
      '<button class="rcu-btn" type="button" data-act="closewin">Fermer</button></div>';
    openWin(h, { small: true });
  }
  function showMsg(msg) { U.msg = msg; var n = document.createElement("p"); n.className = "rcu-notice"; n.textContent = msg; if (elScreen.firstChild) elScreen.appendChild(n); setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 4000); }

  /* =============================================================
     FENÊTRES
     ============================================================= */
  function openWin(html, o) {
    o = o || {}; elWin.hidden = false; elWin.className = "rcu-win" + (o.small ? " small" : "");
    elWin.innerHTML = '<div class="rcu-dim" data-act="dim"></div>' + html;
    U.locked = !!o.locked; if (elScreen.hidden) RC.setBlock(true);
  }
  function closeWin(silent) {
    elWin.hidden = true; elWin.innerHTML = ""; U.locked = false;
    if (!silent || elScreen.hidden) RC.setBlock(false);
  }
  function closeAll() { if (U.locked) return; closeWin(); }

  var TABS = [["inventaire", "Inventaire", "bag"], ["stats", "Caractéristiques", "star"], ["sorts", "Sorts", "nova"], ["quetes", "Quêtes", "scroll"], ["menu", "Menu", "gear"]];
  function openPanel(tab) { U.tab = tab || "inventaire"; RC.setBlock(true); renderPanel(); }
  function renderPanel() {
    var p = RC.profile(); if (!p) return;
    var h = '<div class="rcu-frame"><div class="rcu-titlebar"><span>' + esc(p.name) + ' · ' + D.CLASSES[p.cls].name + ' niv. ' + p.lvl + '</span><button type="button" class="rcu-x" data-act="closewin" aria-label="Fermer">✕</button></div><div class="rcu-body">';
    h += '<nav class="rcu-tabs">';
    TABS.forEach(function (t) { h += '<button type="button" class="' + (t[0] === U.tab ? "on" : "") + '" data-open="' + t[0] + '">' + ico(t[2]) + '<span>' + t[1] + '</span>' + (t[0] === "stats" && p.pts > 0 ? '<em>' + p.pts + '</em>' : '') + '</button>'; });
    h += '</nav><div class="rcu-pane">';
    h += U.tab === "inventaire" ? paneInv(p) : U.tab === "stats" ? paneStats(p) : U.tab === "sorts" ? paneSpells(p) : U.tab === "quetes" ? paneQuests(p) : paneMenu(p);
    h += '</div></div></div>';
    elWin.hidden = false; elWin.className = "rcu-win"; elWin.innerHTML = '<div class="rcu-dim" data-act="dim"></div>' + h;
    if (U.tab === "inventaire") bindDoll();
  }

  /* ---- inventaire ---- */
  function statLine(it, cmp) {
    var out = [], keys = Object.keys(it.st);
    if (cmp) Object.keys(cmp.st).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
    keys.forEach(function (k) {
      var v = it.st[k] || 0, d = cmp ? v - (cmp.st[k] || 0) : 0;
      out.push('<li><span>' + D.STAT_NAMES[k] + '</span><b>' + (v ? "+" + v : "0") + '</b>' + (cmp && d ? '<i class="' + (d > 0 ? "up" : "down") + '">' + (d > 0 ? "▲ +" : "▼ ") + r1(d) + '</i>' : '') + '</li>');
    });
    return '<ul class="rcu-itemstats">' + out.join("") + '</ul>';
  }
  var dollBind = null;
  function paneInv(p) {
    var st = D.computeStats(p), h = '<div class="rcu-inv"><div class="rcu-left"><div class="rcu-doll">';
    var pv = previewCanvas(220, 220, 7, function () { var q = RC.profile(); return q && RC.lookSpec(q); });
    dollBind = pv.bind;
    function slotBtn(s, cls) { var it = p.eq[s]; return '<button type="button" class="rcu-dslot ' + cls + '" data-act="eqslot" data-s="' + s + '"' + (it ? ' style="border-color:' + rar(it).col + '"' : '') + ' title="' + (it ? esc(it.name) : D.SLOTS[s].name) + '">' + (it ? itemImg(it) : '<small>' + D.SLOTS[s].name + '</small>') + '</button>'; }
    h += slotBtn("tete", "top") + slotBtn("dos", "left") + slotBtn("main", "right") + slotBtn("amulette", "bottom");
    h += '<div class="rcu-pedestal sm">' + pv.html + '</div></div>';
    h += '<ul class="rcu-stats tight"><li><span>PV max</span><b>' + st.maxHp + '</b></li><li><span>PA / PM / Portée</span><b>' + st.pa + ' / ' + st.pm + ' / +' + st.po + '</b></li><li><span>Initiative</span><b>' + st.init + '</b></li><li><span>Dommages</span><b>+' + st.dom + '</b></li><li><span>Critique</span><b>' + Math.round(st.crit * 100) + ' %</b></li><li><span>Prospection</span><b>' + st.pros + '</b></li></ul>';
    h += '<div class="rcu-elrow tight" title="Bonus de dégâts par élément">' + elChips(st.el, " %") + '</div><div class="rcu-elrow tight" title="Résistances par élément">' + elChips(st.res, " %", "res") + '</div>';
    h += '</div><div class="rcu-bagwrap"><div class="rcu-bagtop"><b>Sac</b> <span>' + p.bag.length + ' / ' + RC.BAG_MAX + '</span><span class="grow"></span><span>' + ico("nut", "sm") + ' ' + fmt(p.gold) + '</span></div><div class="rcu-bag">';
    for (var i = 0; i < RC.BAG_MAX; i++) {
      var it = p.bag[i];
      h += it ? '<button type="button" class="rcu-cell' + (it.id === U.selItem ? " on" : "") + '" data-act="item" data-id="' + it.id + '" style="border-color:' + rar(it).col + '" title="' + esc(it.name) + '">' + itemImg(it) + '</button>' : '<div class="rcu-cell blank"></div>';
    }
    h += '</div>';
    var sel = null; p.bag.forEach(function (x) { if (x.id === U.selItem) sel = x; });
    if (sel) {
      var cur = p.eq[sel.slot];
      h += '<div class="rcu-detail" style="border-color:' + rar(sel).col + '"><div class="rcu-dhead">' + itemImg(sel, "big") + '<div><b style="color:' + rar(sel).col + '">' + esc(sel.name) + '</b><small>' + rar(sel).name + ' · ' + D.SLOTS[sel.slot].name + ' · niv. ' + sel.lvl + '</small></div></div>' + statLine(sel, cur) +
        (cur ? '<small class="rcu-cmp">Comparé à : ' + esc(cur.name) + '</small>' : '<small class="rcu-cmp">Emplacement libre</small>') +
        '<div class="rcu-dbtn"><button class="rcu-btn" type="button" data-act="equip" data-id="' + sel.id + '">Équiper</button><button class="rcu-btn danger" type="button" data-act="sell" data-id="' + sel.id + '">Vendre · ' + D.sellValue(sel) + '</button></div></div>';
    } else h += '<p class="rcu-hint">Clique sur un objet du sac pour le comparer et l\'équiper. Ce que tu portes est <b>visible sur ton écureuil</b>.</p>';
    return h + '</div></div>';
  }
  function bindDoll() { if (dollBind) dollBind(); bindPreviews(); }

  /* ---- caractéristiques (façon Dofus) ---- */
  function paneStats(p) {
    var st = D.computeStats(p), C = D.CLASSES[p.cls], h = '<div class="rcu-pstats">';
    h += '<div class="rcu-card"><h4>Capital : <b class="gold">' + p.pts + '</b> point' + (p.pts > 1 ? "s" : "") + ' à répartir <small>(' + D.PTS_PER_LEVEL + ' par niveau)</small></h4><ul class="rcu-statrows">';
    D.CHAR_ORDER.forEach(function (k) {
      var ch = D.CHARS[k], tot = st.tot[k], base = p.chars[k];
      h += '<li><div class="rcu-chname">' + (ch.el ? elIco(ch.el) : ico(k === "vit" ? "potion" : "star", "sm")) + '<div><b>' + ch.name + ' · ' + tot + '</b><small>' + ch.desc + (tot !== base ? ' (dont ' + (tot - base) + ' d\'équipement)' : '') + '</small></div></div>' +
        '<button class="rcu-btn small" type="button" data-act="spend" data-k="' + k + '" data-n="1"' + (p.pts <= 0 ? " disabled" : "") + '>+1</button><button class="rcu-btn small" type="button" data-act="spend" data-k="' + k + '" data-n="5"' + (p.pts <= 0 ? " disabled" : "") + '>+5</button></li>';
    });
    h += '</ul></div><div class="rcu-card"><h4>Éléments</h4><table class="rcu-eltab"><tr><th></th><th>Dégâts et soins</th><th>Résistance</th></tr>';
    D.EL_ORDER.forEach(function (e) { h += '<tr><td style="color:' + elCol(e) + '">' + elIco(e) + ' ' + D.ELEMENTS[e].name + '</td><td>+' + st.el[e] + ' %</td><td>' + st.res[e] + ' %</td></tr>'; });
    h += '</table></div><div class="rcu-card"><h4>Combat</h4><ul class="rcu-stats"><li><span>Points de vie</span><b>' + st.maxHp + '</b></li><li><span>PA / PM</span><b>' + st.pa + ' / ' + st.pm + '</b></li><li><span>Portée</span><b>+' + st.po + '</b></li><li><span>Initiative</span><b>' + st.init + '</b></li><li><span>Dommages</span><b>+' + st.dom + '</b></li><li><span>Critique</span><b>' + Math.round(st.crit * 100) + ' %</b></li><li><span>Prospection</span><b>' + st.pros + '</b></li><li><span>Sagesse (XP)</span><b>+' + st.xpPct + ' %</b></li></ul>';
    h += '<p class="rcu-sub">Passif · <b>' + esc(C.passive.name) + '</b> : ' + esc(C.passive.text) + '</p>';
    h += '<div class="rcu-xpline"><span>Niveau ' + p.lvl + '</span><div class="rcu-xp"><i style="width:' + (p.lvl >= D.MAX_LVL ? 100 : Math.min(100, p.xp / D.xpFor(p.lvl) * 100)) + '%"></i></div><span>' + (p.lvl >= D.MAX_LVL ? "max" : p.xp + " / " + D.xpFor(p.lvl)) + '</span></div>';
    h += '<p class="rcu-sub">' + p.kills + ' monstres vaincus</p></div></div>';
    return h;
  }
  /* ---- sorts ---- */
  function paneSpells(p) {
    var C = D.CLASSES[p.cls], u = TACT.heroUnit(p, "ui", 0), h = '<div class="rcu-spellbook">';
    C.spells.forEach(function (sid) {
      var sp = D.SPELLS[sid], ok = p.lvl >= sp.lvl, fx = sp.eff.map(function (e) {
        if (e.t === "dmg" || e.t === "heal") { var pr = TACT.preview(u, sp, e); return (e.t === "dmg" ? "Dégâts " : "Soin ") + D.ELEMENTS[sp.el].name + " : <b style=\"color:" + elCol(sp.el) + "\">" + pr[0] + " à " + pr[1] + "</b>"; }
        if (e.t === "push") return "Repousse de " + e.n; if (e.t === "pull") return "Attire de " + e.n; if (e.t === "shield") return "Bouclier " + e.a + "–" + e.b;
        if (e.t === "tp") return "Téléportation"; if (e.t === "dash") return "Charge"; if (e.t === "buff") return (e.v > 0 ? "+" : "") + e.v + " " + e.st.toUpperCase() + " (" + e.turns + " tour" + (e.turns > 1 ? "s" : "") + ")"; return "";
      }).filter(Boolean).join(" · ");
      h += '<div class="rcu-spell' + (ok ? "" : " lock") + '" style="border-color:' + (ok ? elCol(sp.el) : "") + '"><div class="rcu-spico">' + ico(sp.icon, "big") + '</div><div><b>' + esc(sp.name) + ' <span class="rcu-el" style="--c:' + elCol(sp.el) + '">' + elIco(sp.el) + '</span></b><small>' + (ok ? spellLine(sp, sp.lvl) : "Se débloque au niveau " + sp.lvl) + '</small><small>' + esc(sp.text) + '</small>' + (ok ? '<small class="rcu-fx">' + fx + '</small>' : '') + '</div></div>';
    });
    return h + '</div>';
  }
  /* ---- quêtes ---- */
  function paneQuests(p) {
    var Q = RC.quests(), h = '<div class="rcu-quests">';
    Q.list.forEach(function (q, i) {
      var st = i < Q.cur ? "done" : i === Q.cur ? "cur" : "todo", n = q.kill === "roi" ? (Q.bossDead ? 1 : 0) : (i === Q.cur ? Q.n : i < Q.cur ? q.n : 0);
      h += '<div class="rcu-quest-card ' + st + '"><b>' + (st === "todo" ? "???" : esc(q.name)) + '</b>' + (st === "todo" ? '<small>Termine la quête précédente.</small>' : '<small>' + esc(q.text) + '</small><div class="rcu-xp"><i style="width:' + Math.min(100, n / q.n * 100) + '%"></i></div><small>' + n + ' / ' + q.n + ' · Récompense : ' + q.gold + ' noisettes, ' + q.xp + ' XP</small>') + (st === "done" ? '<em>Terminée ✔</em>' : '') + '</div>';
    });
    return h + '</div>';
  }
  /* ---- menu ---- */
  function paneMenu(p) {
    var net = RC.net, h = '<div class="rcu-menu-pane"><button class="rcu-btn big" type="button" data-act="closewin">Reprendre</button>';
    h += '<div class="rcu-card"><h4>Coop en ligne</h4>';
    if (!RC.coop()) h += '<p class="rcu-sub">Invite un ami : il rejoint ta partie avec son propre personnage et vous combattez ensemble.</p><button class="rcu-btn" type="button" data-act="invite">Créer un salon et inviter</button>';
    else if (net.role === "host") h += '<p class="rcu-sub">Salon <b class="rcu-code">' + esc(net.code) + '</b> ' + (RC.mate() ? '· avec ' + esc(RC.mate().name || "un ami") : '· en attente d\'un ami') + '</p><button class="rcu-btn" type="button" data-act="showinvite">Afficher le lien</button> <button class="rcu-btn danger" type="button" data-act="closeroom">Fermer le salon</button>';
    else h += '<p class="rcu-sub">Tu joues chez ' + esc((RC.mate() && RC.mate().name) || "ton ami") + '.</p><button class="rcu-btn danger" type="button" data-act="leave">Quitter le salon</button>';
    h += '</div><button class="rcu-btn" type="button" data-act="fullscreen">Plein écran</button> <button class="rcu-btn" type="button" data-act="totitle">Changer de personnage / titre</button></div>';
    return h;
  }

  /* ---- invitation ---- */
  function openInvite() {
    var net = RC.net; if (!net.code) return;
    RC.setBlock(true);
    openWin('<div class="rcu-dlg"><h3>Salon ouvert</h3><p>Code : <b class="rcu-code">' + esc(net.code) + '</b></p><p class="rcu-sub">Envoie ce lien à ton ami, il rejoindra ta partie :</p><input class="rcu-link" readonly data-link value="' + esc(RC.inviteLink()) + '"><button class="rcu-btn" type="button" data-act="copy">Copier le lien</button> <button class="rcu-btn alt" type="button" data-act="closewin">Continuer à jouer</button><p class="rcu-sub">' + (RC.mate() ? esc(RC.mate().name || "Un ami") + ' est connecté.' : "En attente d'un ami… tu peux jouer en l'attendant.") + '</p></div>', { small: true });
  }

  /* ---- dialogues PNJ ---- */
  function dialog(kind) {
    RC.setBlock(true);
    if (kind === "elder") {
      var Q = RC.quests(), q = Q.list[Q.cur], face = ART.squirrel("elder", 0).c.toDataURL();
      var txt = q ? '<p><b>' + esc(q.name) + '</b></p><p>' + esc(q.text) + '</p><p class="rcu-sub">Progression : ' + (q.kill === "roi" ? (Q.bossDead ? 1 : 0) : Q.n) + ' / ' + q.n + ' · Récompense : ' + q.gold + ' noisettes, ' + q.xp + ' XP</p><p class="rcu-sub">Clique sur un groupe de monstres pour engager le combat.</p>'
        : '<p>Tu as tout accompli, jeune écureuil. Ronceclair est en paix… pour l\'instant. D\'autres zones et classes arriveront bientôt !</p>';
      openWin('<div class="rcu-frame small"><div class="rcu-titlebar"><span>Maître Noisetier</span><button type="button" class="rcu-x" data-act="closewin">✕</button></div><div class="rcu-body dlg"><img class="rcu-npc" src="' + face + '" alt=""><div>' + txt + '<button class="rcu-btn alt" type="button" data-act="closewin">D\'accord</button></div></div></div>', { small: true });
    } else renderShop();
  }
  function renderShop() {
    var p = RC.profile(), stock = RC.shop.stock(), face = ART.squirrel("glandine", 0).c.toDataURL();
    var h = '<div class="rcu-frame"><div class="rcu-titlebar"><span>Dame Glandine · ' + ico("nut", "sm") + ' ' + fmt(p.gold) + '</span><button type="button" class="rcu-x" data-act="closewin">✕</button></div><div class="rcu-body dlg"><div class="rcu-npcbox"><img class="rcu-npc" src="' + face + '" alt=""><p class="rcu-sub">« Du neuf, du solide, du joli ! »</p></div><div class="rcu-shop">';
    h += '<div class="rcu-card"><h4>Équipements</h4>';
    stock.forEach(function (it, i) {
      var c = D.buyValue(it);
      h += '<div class="rcu-shoprow"><span class="rcu-cell static" style="border-color:' + rar(it).col + '">' + itemImg(it) + '</span><div><b style="color:' + rar(it).col + '">' + esc(it.name) + '</b><small>' + rar(it).name + ' · ' + D.SLOTS[it.slot].name + ' · ' + Object.keys(it.st).map(function (k) { return "+" + it.st[k] + " " + D.STAT_NAMES[k]; }).join(", ") + '</small></div><button class="rcu-btn small" type="button" data-act="buyitem" data-i="' + i + '"' + (p.gold < c || p.bag.length >= RC.BAG_MAX ? " disabled" : "") + '>' + c + ' ' + ico("nut", "sm") + '</button></div>';
    });
    h += '</div><div class="rcu-card"><h4>Soins</h4><div class="rcu-shoprow"><span class="rcu-cell static">' + ico("potion") + '</span><div><b>Baie de soin</b><small>Rend 40 % des PV hors combat · tu en as ' + p.potions + '</small></div><button class="rcu-btn small" type="button" data-act="buypot"' + (p.gold < 6 ? " disabled" : "") + '>6 ' + ico("nut", "sm") + '</button></div></div>';
    h += '<button class="rcu-btn" type="button" data-act="opensell">Vendre mes objets (sac)</button></div></div></div>';
    openWin(h);
  }

  /* ---- résultat de combat ---- */
  function fightEnd(out) {
    var h = '<div class="rcu-dlg wide"><h3 class="' + (out.win ? "win" : "lose") + '">' + (out.win ? "Victoire !" : "Défaite…") + '</h3>';
    if (out.win) {
      h += '<ul class="rcu-stats"><li><span>Expérience</span><b>+' + fmt(out.xp) + ' XP</b></li><li><span>Noisettes</span><b>+' + fmt(out.gold) + '</b></li></ul>';
      if (out.levels) h += '<p class="rcu-lvlup">Niveau supérieur ! +' + (out.levels * D.PTS_PER_LEVEL) + ' points de caractéristique (touche C) — tes PV sont restaurés.</p>';
      if (out.quest) h += '<p class="rcu-lvlup">Quête accomplie : ' + esc(out.quest) + '</p>';
      if (out.items.length) { h += '<div class="rcu-loot">'; out.items.forEach(function (it) { h += '<div class="rcu-lootitem" style="border-color:' + D.RARITIES[it.rar].col + '"><img class="rcu-ico" src="' + ART.itemIconURL(it.slot, it.look) + '" alt=""><span style="color:' + D.RARITIES[it.rar].col + '">' + esc(it.name) + (it.sold ? " (sac plein : vendu)" : "") + '</span></div>'; }); h += '</div>'; }
    } else h += '<p>Tes alliés te ramènent à l\'abri. Tu perds ' + out.lost + ' noisette' + (out.lost > 1 ? "s" : "") + '.</p>';
    h += '<button class="rcu-btn big" type="button" data-act="endfight">Continuer</button></div>';
    openWin(h, { small: true, locked: true });
  }

  /* =============================================================
     BARRE DE JEU (HUD)
     ============================================================= */
  var lastLook = "", spellSig = "", tlSig = "";
  function spellTip(s) {
    var rg = s.min === s.max ? (s.max === 0 ? "soi" : s.max) : s.min + "–" + s.max;
    return s.name + " · " + D.ELEMENTS[s.el].name + "\n" + s.pa + " PA · portée " + rg + (s.line ? " (ligne)" : "") + (s.los ? " · vue" : "") + (s.cdMax ? " · recharge " + s.cdMax : "") + "\n" +
      s.eff.map(function (e) { return e.t === "dmg" ? "Dégâts " + e.r[0] + "–" + e.r[1] : e.t === "heal" ? "Soin " + e.r[0] + "–" + e.r[1] : ""; }).filter(Boolean).join(" · ") + "\n" + s.text;
  }
  function buildSpells(info) {
    var me = info.me, sig = me.spells.map(function (s) { return s.sid; }).join(",") + "|" + me.id;
    if (sig === spellSig) return; spellSig = sig;
    $("[data-z=spells]").innerHTML = me.spells.map(function (s, i) {
      return '<button type="button" class="rcu-sp" data-sp="' + s.sid + '" style="--el:' + elCol(s.el) + '" title="' + esc(spellTip(s)) + '">' + ico(s.icon) + '<span class="key">' + (i + 1) + '</span><span class="pa">' + s.pa + '</span><i class="cd"></i><em class="cdt"></em><u class="uses"></u></button>';
    }).join("") + '<button type="button" class="rcu-sp pot" data-pot title="Baie de soin : 3 PA, 1 fois par tour, rend 25 % des PV (touche R)">' + ico("potion") + '<span class="key">R</span><span class="pa">3</span><u class="uses"></u></button>';
  }
  function updateTimeline(info) {
    var sig = info.round + "|" + info.order.map(function (o) { return o.id + ":" + Math.ceil(o.hp) + (o.cur ? "*" : ""); }).join(",");
    if (sig === tlSig) return; tlSig = sig;
    var h = '<div class="rcu-round">' + (info.phase === "placement" ? "Placement" : "Round " + info.round) + '</div>';
    info.order.forEach(function (o) {
      var img = o.kind === "hero" ? ART.headURL(o.look) : ART.mobURL(o.type);
      h += '<div class="rcu-tl side' + o.side + (o.cur ? " cur" : "") + '" title="' + esc(o.name) + (o.lvl ? " niv. " + o.lvl : "") + '"><img src="' + img + '" alt=""><i style="width:' + Math.max(0, Math.min(100, o.hp / o.max * 100)) + '%"></i></div>';
    });
    $("[data-z=timeline]").innerHTML = h;
  }
  function hud() {
    var p = RC.profile(); if (!p || elHud.hidden) return;
    var st = RC.stats(), mh = st.maxHp, fight = RC.inFight(), info = fight ? RC.fightInfo() : null, look = JSON.stringify(RC.lookSpec(p));
    elHud.classList.toggle("fight", !!info);
    if (look !== lastLook) { lastLook = look; $("[data-z=face]").src = ART.headURL(RC.lookSpec(p)); }
    var hp = p.hp, max = mh, shield = 0;
    if (info && info.me) { hp = info.me.hp; max = info.me.max; shield = info.me.shield; }
    $("[data-z=hpbar]").style.width = Math.max(0, Math.min(100, hp / max * 100)) + "%";
    $("[data-z=shield]").style.width = Math.max(0, Math.min(100, shield / max * 100)) + "%";
    $("[data-z=hptxt]").textContent = Math.ceil(hp) + " / " + max + (shield ? " (+" + shield + ")" : "");
    $("[data-z=xpbar]").style.width = (p.lvl >= D.MAX_LVL ? 100 : Math.min(100, p.xp / D.xpFor(p.lvl) * 100)) + "%";
    $("[data-z=lvl]").textContent = p.lvl;
    $("[data-z=gold]").textContent = fmt(p.gold); $("[data-z=pots]").textContent = p.potions;
    var pts = $("[data-z=pts]"); pts.hidden = p.pts <= 0; pts.textContent = p.pts;
    var mate = RC.mate(), mt = $("[data-z=mate]");
    $("[data-z=zone]").textContent = RC.zoneName();
    if (mate) { mt.hidden = false; mt.innerHTML = '<b>' + esc(mate.name || "Ami") + '</b> niv. ' + (mate.lvl || 1); } else mt.hidden = true;
    var Q = RC.quests(), q = Q.list[Q.cur];
    $("[data-z=quest]").innerHTML = q ? '<b>' + esc(q.name) + '</b><br>' + (q.kill === "roi" ? (Q.bossDead ? "Fait" : "Vaincre le Roi-corbeau") : esc(Q.mobs[q.kill].name) + " " + Q.n + "/" + q.n) : '<b>Toutes les quêtes sont accomplies</b>';
    if (!info) { spellSig = ""; tlSig = ""; return; }
    updateTimeline(info);
    var me = info.me; if (!me) return;
    var plc = info.phase === "placement";
    $("[data-z=pa]").textContent = plc ? me.bpa : me.pa; $("[data-z=pm]").textContent = plc ? me.bpm : me.pm;
    var pb = $("[data-pot]"); if (pb) { pb.classList.toggle("off", !me.potOk); $(".uses", pb).textContent = "×" + me.potions; }
    buildSpells(info);
    me.spells.forEach(function (s) {
      var b = $('[data-sp="' + s.sid + '"]'); if (!b) return;
      b.classList.toggle("off", !s.ok); b.classList.toggle("sel", me.sel === s.sid); b.classList.toggle("nopa", s.err === "pa");
      $(".cdt", b).textContent = s.cd > 0 ? s.cd : "";
      $(".uses", b).textContent = s.uses != null && s.ok ? "×" + s.uses : "";
    });
    var eb = $("[data-z=end]"), cur = info.order.filter(function (o) { return o.cur; })[0];
    if (info.phase === "placement") { eb.textContent = me.ready ? "En attente…" : "Prêt !"; eb.disabled = me.ready; eb.classList.toggle("go", !me.ready); }
    else if (info.phase === "fight") { eb.textContent = info.myTurn ? "Fin du tour" : "Tour : " + (cur ? cur.name : "…"); eb.disabled = !info.myTurn || info.busy; eb.classList.toggle("go", info.myTurn && !info.busy); }
    else { eb.textContent = "…"; eb.disabled = true; eb.classList.remove("go"); }
  }

  var bannerTimer = 0;
  function banner(t, sub) {
    elBanner.innerHTML = "<strong>" + esc(t) + "</strong><span>" + esc(sub || "") + "</span>"; elBanner.hidden = false;
    elBanner.classList.remove("pop"); void elBanner.offsetWidth; elBanner.classList.add("pop");
    clearTimeout(bannerTimer); bannerTimer = setTimeout(function () { elBanner.hidden = true; }, 2600);
  }

  /* =============================================================
     CLICS ET CLAVIER
     ============================================================= */
  root.addEventListener("click", function (e) {
    var o = e.target.closest("[data-open]");
    if (o) { click(); openPanel(o.getAttribute("data-open")); return; }
    var pt = e.target.closest("[data-pot]");
    if (pt) { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); RC.usePotionFight(); return; }
    var sp = e.target.closest("[data-sp]");
    if (sp) { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); RC.selectSpell(sp.getAttribute("data-sp")); return; }
    var b = e.target.closest("[data-act]"); if (!b) return;
    var a = b.getAttribute("data-act"), p = RC.profile();
    if (a === "dim") { if (!U.locked) { if (elScreen.hidden) closeAll(); else closeWin(true); } return; }
    click();
    if (b.closest(".rcu-hud") && document.activeElement && document.activeElement.blur) document.activeElement.blur();
    switch (a) {
      /* titre */
      case "play": screenSelect(); break;
      case "coop": screenSelect(true); break;
      case "options": openWin('<div class="rcu-dlg"><h3>Options</h3><p class="rcu-sub">Les réglages de son se trouvent dans le bouton Réglages du site.</p><button class="rcu-btn" type="button" data-act="fullscreen">Plein écran</button> <button class="rcu-btn danger" type="button" data-act="wipe">Effacer toutes les sauvegardes</button> <button class="rcu-btn" type="button" data-act="closewin">Fermer</button></div>', { small: true }); break;
      case "credits": openWin('<div class="rcu-dlg"><h3>Crédits</h3><p>Ronceclair est un jeu AkarisuMD. L\'écureuil du logo est le héros, le pixel-art (dithering) est dessiné par code.</p><button class="rcu-btn" type="button" data-act="closewin">Fermer</button></div>', { small: true }); break;
      case "wipe": if (window.confirm("Effacer tous tes personnages ?")) { while (RC.slots().length) RC.deleteSlot(0); closeWin(true); screenTitle(); } break;
      case "fullscreen": var fs = document.querySelector("[data-game-fullscreen]"); if (fs) fs.click(); break;
      /* sélection */
      case "back": screenTitle(); break;
      case "sel": U.sel = +b.getAttribute("data-i"); screenSelect(); break;
      case "new": U.cls = "gardien"; U.fur = "roux"; U.name = randName(); screenCreate(); break;
      case "del": if (p = RC.slots()[U.sel]) { if (window.confirm("Supprimer " + p.name + " ? Cette action est définitive.")) { RC.deleteSlot(U.sel); U.sel = 0; screenSelect(); } } break;
      case "start": startSel(); break;
      case "coopmenu": coopMenu(); break;
      case "host": closeWin(true); startSel("host"); break;
      case "join": var code = String(($("[data-code]") || {}).value || "").toUpperCase().replace(/[^A-Z]/g, ""); if (code.length !== 4) { RC.net.err = "Le code du salon fait 4 lettres."; coopMenu(); } else joinCode(code); break;
      case "joinpending": joinCode(U.pending); break;
      case "canceljoin": RC.leave(); screenSelect(); break;
      /* création */
      case "cls": U.cls = b.getAttribute("data-k"); U.name = ($("[data-name]") || {}).value || U.name; screenCreate(); break;
      case "fur": U.fur = b.getAttribute("data-f"); U.name = ($("[data-name]") || {}).value || U.name; screenCreate(); break;
      case "dice": U.name = randName(); screenCreate(); break;
      case "cancelcreate": screenSelect(); break;
      case "create":
        var nm = (($("[data-name]") || {}).value || "").trim() || randName(), np = RC.createProfile(U.cls, nm, U.fur);
        if (np) { U.sel = RC.slots().length - 1; screenSelect(); } break;
      /* fenêtres */
      case "closewin": closeWin(); break;
      case "item": U.selItem = b.getAttribute("data-id"); renderPanel(); break;
      case "equip": RC.equip(b.getAttribute("data-id")); U.selItem = null; renderPanel(); break;
      case "sell": RC.sell(b.getAttribute("data-id")); U.selItem = null; renderPanel(); break;
      case "eqslot": var s = b.getAttribute("data-s"); if (p.eq[s]) { RC.unequip(s); renderPanel(); } break;
      case "spend": RC.spend(b.getAttribute("data-k"), +b.getAttribute("data-n") || 1); renderPanel(); break;
      case "buyitem": RC.shop.buyItem(+b.getAttribute("data-i")); renderShop(); break;
      case "buypot": RC.shop.buyPotion(); renderShop(); break;
      case "opensell": openPanel("inventaire"); break;
      case "invite": if (RC.host()) openInvite(); else banner("Coop indisponible", RC.net.err || ""); break;
      case "showinvite": openInvite(); break;
      case "closeroom": RC.leave(); renderPanel(); break;
      case "leave": RC.leave(); break;
      case "copy":
        var inp = $("[data-link]"), done = function () { b.textContent = "Lien copié ✔"; };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(RC.inviteLink()).then(done, function () { inp.select(); });
        else { inp.select(); try { document.execCommand("copy"); done(); } catch (er) {} }
        break;
      case "totitle": RC.quitToTitle(); break;
      /* combat */
      case "endturn": var fi = RC.fightInfo(); if (fi && fi.phase === "placement") RC.readyUp(); else RC.endTurn(); break;
      case "endfight": closeWin(true); RC.setBlock(false); RC.closeFight(); break;
    }
  });
  root.addEventListener("input", function (e) { if (e.target.matches("[data-name]")) U.name = e.target.value; });
  root.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.matches("[data-name]")) { e.preventDefault(); var c = $("[data-act=create]"); if (c) c.click(); }
    if (e.key === "Enter" && e.target.matches("[data-code]")) { e.preventDefault(); var j = $("[data-act=join]"); if (j) j.click(); }
  });

  /* =============================================================
     INTERFACE FOURNIE AU MOTEUR
     ============================================================= */
  RC.ui = {
    boot: function () {
      if (U.booted) return; U.booted = true;
      screenTitle();
      U.hudTimer = setInterval(function () { if (!elHud.hidden) hud(); }, 100);
    },
    title: function (msg) { closeWin(true); elHud.hidden = true; screenTitle(msg); },
    gameStarted: function () { closeWin(true); hideScreen(); RC.setBlock(false); elHud.hidden = false; lastLook = ""; spellSig = ""; tlSig = ""; hud(); },
    hud: hud,
    banner: banner,
    panel: function (tab) { openPanel(tab); },
    closeAll: closeAll,
    dialog: dialog,
    fightStart: function () { spellSig = ""; tlSig = ""; hud(); },
    fightEnd: fightEnd,
    netFail: function (msg) { if (U.screen === "joining") { screenSelect(); showMsg(msg); } else banner("Coop", msg); }
  };
  if (RC.ready) RC.ui.boot();
})();
