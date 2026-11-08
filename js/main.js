/* =========================================================================
   Comportements communs : thème jour/nuit, menu, bibliothèque, jeu à la
   une, formulaire de contact, liens.
   ========================================================================= */
(function () {
  "use strict";
  var SITE = window.SITE || {};
  var PROJECTS = window.PROJECTS || [];
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function safeStore(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }

  /* ---------- thème jour / nuit ---------- */
  var root = document.documentElement;
  $$("[data-theme-toggle]").forEach(function (btn) {
    function label() {
      var night = root.dataset.theme === "dark";
      btn.setAttribute("aria-label", night ? "Passer en mode jour" : "Passer en mode nuit");
      btn.setAttribute("title", night ? "Mode jour" : "Mode nuit");
      btn.dataset.state = night ? "night" : "day";
    }
    label();
    btn.addEventListener("click", function () {
      root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
      safeStore("theme", root.dataset.theme);
      label();
      document.dispatchEvent(new Event("themechange"));
    });
  });

  /* ---------- menu mobile + page active ---------- */
  var navBtn = $("[data-nav-toggle]");
  var nav = $("#site-nav");
  if (navBtn && nav) {
    navBtn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      navBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  var page = document.body.dataset.page;
  // les pages des jeux web sont regroupées sous l'onglet « Jeux »
  var GAME_PAGES = ["games", "game", "merger", "suika", "dice", "kingdice", "ages", "arcane", "chess", "pool", "golf", "golfaventure", "defense", "idle", "bagbound", "flippers", "ultimate", "grimpe"];
  var navPage = GAME_PAGES.indexOf(page) >= 0 ? "games" : page;
  $$("#site-nav a").forEach(function (a) {
    if (a.dataset.page === navPage) a.setAttribute("aria-current", "page");
  });

  /* ---------- textes depuis data.js ---------- */
  $$("[data-site]").forEach(function (el) {
    var v = SITE[el.dataset.site];
    if (v) el.textContent = v;
  });
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- liens / réseaux ---------- */
  var LINK_LABELS = {
    itch: "itch.io", github: "GitHub", linkedin: "LinkedIn", bluesky: "Bluesky",
    twitter: "X / Twitter", youtube: "YouTube", discord: "Discord",
  };
  $$("[data-links]").forEach(function (ul) {
    var links = SITE.links || {};
    var html = "";
    Object.keys(LINK_LABELS).forEach(function (k) {
      if (!links[k]) return;
      html += '<li><a class="link-chip link-' + k + '" href="' + esc(links[k]) + '" target="_blank" rel="noopener">' +
        '<span class="link-dot" aria-hidden="true"></span>' + LINK_LABELS[k] + '<span aria-hidden="true"> ↗</span></a></li>';
    });
    if (SITE.email && ul.dataset.links === "with-mail") {
      html = '<li><a class="link-chip link-mail" href="mailto:' + esc(SITE.email) + '"><span class="link-dot" aria-hidden="true"></span>' + esc(SITE.email) + '</a></li>' + html;
    }
    ul.innerHTML = html;
  });

  /* ---------- jaquettes pixel générées ---------- */
  var ICONS = {
    cat: ["x.......x", "xx.....xx", "xxxxxxxxx", "xexxxxxex", "xxxxwxxxx", "xxxxxxxxx", ".xxxxxxx."],
    cube: ["....w....", "..wwwww..", "wwwwwwwww", "xwwwwwwwe", "xxxwwweee", "xxxxxeeee", "xxxxxeeee", "..xxxee..", "....x...."],
    granny: ["...ww...", "..wwww..", ".wwwwww.", ".xxxxxx.", "xeexxeex", ".xxxxxx.", ".xxeexx.", "..xxxx.."],
    plug: ["..e..e..", "..e..e..", ".xxxxxx.", ".xwxxxx.", ".xxxxxx.", "..xxxx..", "...xx...", "...ee..."],
    star: ["...x...", "...x...", "xxxwxxx", ".xxwxx.", "..xxx..", ".xx.xx.", "x.....x"],
    dog: ["e.......e.", "ex.....xe.", "exxxxxxxe.", ".xexxxex..", ".xxxxxxx..", ".xxxeexx..", "..xxxxx...", "...xwx...."],
    fish: ["....xx.....", "..xxxxxx.x.", ".xwxxxxxxx.", "xxexxxxxxx.", ".xxxxxxxxx.", "..xxxxxx.x.", "....xx....."],
    eye: ["...xxxxx...", ".xx.....xx.", "x...eee...x", "x..eewe...x", "x...eee...x", ".xx.....xx.", "...xxxxx..."],
    wand: ["....x....", "...xwx...", "...xxx...", "..xxxxx..", "..xxwxx..", ".xxxxxxx.", "xxxxxxxxx", "...e.e..."],
    drop: ["...x...", "..xxx..", ".xxwxx.", ".xwxxx.", "xxxxxxx", "xxxxxxx", ".xxxxx.", "..xxx.."],
    gun: ["...........", "xxxxxxxxxw.", "xxxxxxxxxxx", "xxxxeexx...", "xxx..ex....", "xxx........", "xx........."],
    paw: ["..x...x..", ".xxx.xxx.", "..x...x..", "x.......x", "xx.xxx.xx", "..xxxxx..", ".xxxxxxx.", ".xxx.xxx."],
    bolt: ["...xxx.", "..xxx..", ".xxx...", "xxxxxxx", "...xxx.", "..xxx..", ".xxx...", ".xx....", ".x....."],
    mask: [".xxxxxxx.", "xxxxxxxxx", "xeexxxeex", "xxxxxxxxx", "xxxxxxxxx", "xxeeeeexx", ".xxeeexx.", "..xxxxx.."],
    dice: ["xxxxxxxxx", "xwxxxxxwx", "xxxxxxxxx", "xxxxwxxxx", "xxxxxxxxx", "xwxxxxxwx", "xxxxxxxxx", "eeeeeeeee"],
    acorn: ["....e....", "..eeeee..", ".eeeeeee.", "eeeeeeeee", ".xxxxxxx.", ".xwxxxxx.", "..xxxxx..", "...xxx...", "....x...."],
    tower: ["x.x.x.x", "xxxxxxx", ".xxxxx.", ".xewex.", ".xxxxx.", ".xxxxx.", ".xxexx.", "xxxexxx"],
    crown: ["x..x..x", "xx.x.xx", "xxxxxxx", "xwxexwx", "xxxxxxx", ".eeeee.", ".xxxxx.", "xxxxxxx"],
    ball: ["..xxxx..", ".xxxxxx.", "xxwwwxxx", "xxwexwxx", "xxwwwxxx", "xxwexwxx", ".xxwwxx.", "..xxxx.."],
    knight: ["..xx.x..", ".xxxxx..", "xxwxxxx.", "xxxxxxxx", "....xxxx", "...xxxxx", "..xxxxxx", "eeeeeeee"],
    bag: ["...xxx...", "..x...x..", ".xxxxxxx.", "xxwwwwwxx", "xxxxxxxxx", "xxxeeexxx", "xxxewexxx", "xxxxxxxxx", ".xxxxxxx."],
    flag: ["xxxxxx...", "xxxxxxxx.", "xwxxxxxxx", "xxxxxxxx.", "xxxxxx...", "e........", "e........", "e........", "eeeee...."],
    tree: ["....xx....", "...xxxx...", "..xxxxxx..", ".xxxxxxxx.", "..xxxxxx..", ".xxxxxxxx.", "xxxxxxxxxx", "....ee....", "....ee....", "...eeee..."],
    pinball: ["...xxx...", "..xwxxx..", "..xxxxx..", "...xxx...", ".........", "xx.....xx", ".xxx.xxx.", "..xxxxx.."],
    golf: ["...xxx...", "...xxxx..", "...xxx...", "...x.....", "...x.....", "...x.....", "...x..w..", "eeeeeeeee"],
    box: ["..xxxxxx..", ".xwwwwwwx.", "xwwwwwwwwx", "xxxxeexxxx", "xxxxeexxxx", "xxxxxxxxxx", "xxxxxxxxxx", "eeeeeeeeee"],
  };
  function hashStr(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function drawCover(canvas, p) {
    var W = 64, H = 40, g = canvas.getContext("2d");
    canvas.width = W; canvas.height = H;
    var pal = p.palette || ["#f2b05e", "#e8873a", "#3d2a1e"];
    var h = hashStr(p.id || p.title);
    // ciel en bandes
    g.fillStyle = pal[0]; g.fillRect(0, 0, W, H);
    g.fillStyle = pal[1];
    for (var x = 0; x < W; x++) {
      var y = Math.floor(24 + Math.sin((x + h % 50) * 0.18) * 3 + Math.sin(x * 0.07 + h) * 2);
      g.fillRect(x, y, 1, H - y);
      if (x % 2 === 0) g.fillRect(x, y - 1, 1, 1);
    }
    g.fillStyle = pal[2];
    for (var x2 = 0; x2 < W; x2++) {
      var y2 = Math.floor(33 + Math.sin(x2 * 0.25 + h) * 1.5);
      g.fillRect(x2, y2, 1, H - y2);
    }
    // petites étoiles / pollen
    g.fillStyle = "rgba(255,248,230,.85)";
    for (var i = 0; i < 6; i++) g.fillRect((h >> i) % W, ((h >> (i + 3)) % 16) + 2, 1, 1);
    // icône
    var ic = ICONS[p.icon] || ICONS.star;
    var s = 2, iw = ic[0].length * s, ih = ic.length * s;
    var ox = Math.floor((W - iw) / 2), oy = Math.floor((H - ih) / 2) - 3;
    var col = { x: "#fdf3de", w: "#ffffff", e: pal[2] };
    // ombre portée
    g.fillStyle = "rgba(0,0,0,.22)";
    for (var r = 0; r < ic.length; r++) for (var c = 0; c < ic[r].length; c++)
      if (ic[r][c] !== ".") g.fillRect(ox + c * s + 2, oy + r * s + 2, s, s);
    for (var r2 = 0; r2 < ic.length; r2++) for (var c2 = 0; c2 < ic[r2].length; c2++) {
      var ch = ic[r2][c2];
      if (ch === ".") continue;
      g.fillStyle = col[ch]; g.fillRect(ox + c2 * s, oy + r2 * s, s, s);
    }
  }

  /* ---------- cartes projet ---------- */
  function byId(id) { return PROJECTS.filter(function (x) { return x.id === id; })[0]; }
  function projectUrl(p) { return "projet.html?id=" + encodeURIComponent(p.id); }
  // Catégorie d'un projet de js/data.js pour les filtres de la page Jeux
  function catOf(p) { return p.steam ? "steam" : p.type === "plugin" ? "plugin" : p.type === "asset" ? "asset" : p.embed ? "webgl" : "itch"; }
  var TYPE_LABEL = { game: "Jeu", plugin: "Plugin Unity", asset: "Asset graphique" };
  function card(p) {
    var typeLabel = TYPE_LABEL[p.type] || "Jeu";
    var cta = p.type === "plugin" ? "Voir le plugin" : p.type === "asset" ? "Voir l'asset" : "Voir la fiche";
    var media = p.cover
      ? '<img src="' + esc(p.cover) + '" alt="" loading="lazy">'
      : '<canvas data-cover="' + esc(p.id) + '" aria-hidden="true"></canvas>';
    var meta = [p.status, p.year].filter(Boolean).join(" · ");
    var tags = (p.tags || []).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
    var page = projectUrl(p);
    var actions;
    if (p.steam) {
      actions = '<div class="card-actions"><a class="btn btn-small btn-steam" href="' + esc(p.steam) + '" target="_blank" rel="noopener">Voir sur Steam ↗</a>' +
        '<a class="text-link" href="' + page + '">Voir la fiche</a></div>';
    } else if (p.embed) {
      actions = '<div class="card-actions"><button class="btn btn-small" type="button" data-play-id="' + esc(p.id) + '">▶ Jouer ici</button>' +
        '<a class="text-link" href="' + page + '">Voir la fiche</a></div>';
    } else if (p.url || p.type === "game" || p.type === "asset") {
      actions = '<a class="btn btn-small" href="' + page + '">' + cta + " →</a>";
    } else {
      actions = '<div class="card-actions"><span class="soon">Bientôt disponible</span><a class="text-link" href="' + page + '">Voir la fiche</a></div>';
    }
    return '<article class="card" data-type="' + esc(p.type) + '" data-cat="' + catOf(p) + '">' +
      '<div class="card-media">' + media +
      '<span class="badge badge-' + esc(p.type) + '">' + typeLabel + "</span>" +
      (p.embed ? '<span class="badge badge-play">Jouable ici</span>' : "") + "</div>" +
      '<div class="card-body">' +
      '<h3 class="card-title"><a href="' + page + '">' + esc(p.title) + "</a></h3>" +
      (meta ? '<p class="card-meta">' + esc(meta) + "</p>" : "") +
      (p.with ? '<p class="card-meta">avec ' + esc(p.with) + "</p>" : "") +
      (p.role ? '<p class="card-meta card-role">Mon rôle : ' + esc(p.role) + "</p>" : "") +
      '<p class="card-text">' + esc(p.short || "") + "</p>" +
      '<ul class="tags">' + tags + "</ul>" +
      actions +
      "</div></article>";
  }
  function paintCovers(scope) {
    $$("canvas[data-cover]", scope).forEach(function (c) {
      var p = byId(c.dataset.cover);
      if (p) drawCover(c, p);
    });
  }

  // Page Jeux : jaquettes des jeux web (palette + icône en attributs)
  $$("canvas[data-game-cover]").forEach(function (c) {
    drawCover(c, { id: c.dataset.gameCover, icon: c.dataset.icon, palette: (c.dataset.palette || "").split(",").filter(Boolean) });
  });

  // Accueil : derniers projets
  var latest = $("[data-latest]");
  if (latest) {
    var n = Number(latest.dataset.latest) || 3;
    latest.innerHTML = PROJECTS.slice(0, n).map(card).join("");
    paintCovers(latest);
  }

  // Page Jeux : cartes des projets de js/data.js (Steam tout en haut, puis Unity / itch.io)
  var steamGrid = $("[data-steam]");
  if (steamGrid) {
    var steamGames = PROJECTS.filter(function (p) { return p.steam; });
    if (steamGames.length) {
      steamGrid.innerHTML = steamGames.map(card).join("");
      paintCovers(steamGrid);
      $$("[data-steam-only]").forEach(function (el) { el.hidden = false; });
    }
  }
  var lib = $("[data-library]");
  if (lib) {
    lib.innerHTML = PROJECTS.filter(function (p) { return !p.steam; }).map(card).join("");
    paintCovers(lib);
  }

  // Page Jeux : une seule barre de filtres pour tout (jeux web, itch WebGL, itch, Steam, plugins)
  var filtersEl = $("[data-filters]");
  if (filtersEl) {
    var searchEl = $("[data-search]");
    var tagSel = $("[data-tag-select]");
    var countEl = $("[data-count]");
    var resetEl = $("[data-reset]");
    var emptyEl = $("[data-hub-empty]");
    var CATS = [
      ["all", "Tout", ""],
      ["web", "Jeux web", "Mes jeux maison, jouables dans le navigateur"],
      ["webgl", "itch WebGL", "Jeux itch.io jouables ici (WebGL)"],
      ["itch", "itch", "Jeux itch.io à télécharger"],
      ["steam", "Steam", "Jeux sur Steam"],
      ["plugin", "Plugins", "Plugins Unity"],
      ["asset", "Assets graphiques", "Packs graphiques : pixel art, sprites, tilesets…"],
    ];

    // Toutes les cartes de la page, qu'elles viennent de data.js ou du HTML (jeux web)
    var items = [];
    $$("[data-filter-grid]").forEach(function (grid) {
      $$(".card", grid).forEach(function (el) {
        var tags = $$(".tags li", el).map(function (li) { return li.textContent.trim(); }).filter(Boolean);
        items.push({
          el: el,
          grid: grid,
          cat: el.getAttribute("data-cat") || grid.getAttribute("data-filter-cat") || "itch",
          tags: tags,
          q: el.textContent.replace(/\s+/g, " ").toLowerCase(),
        });
      });
    });
    var tagCount = {};
    items.forEach(function (it) { it.tags.forEach(function (t) { tagCount[t] = (tagCount[t] || 0) + 1; }); });
    var allTags = Object.keys(tagCount).sort(function (a, b) { return tagCount[b] - tagCount[a] || a.localeCompare(b, "fr"); });
    var catCount = { all: items.length };
    items.forEach(function (it) { catCount[it.cat] = (catCount[it.cat] || 0) + 1; });

    var state = { cat: "all", tag: null, q: "" };
    var PRESETS = { web: "web", webgl: "webgl", jouer: "webgl", itch: "itch", steam: "steam", plugins: "plugin", jeux: "all" };
    var preset = PRESETS[(location.hash || "").replace("#", "")];
    if (preset && (preset === "all" || catCount[preset])) state.cat = preset;

    var renderFilters = function () {
      filtersEl.innerHTML = CATS.map(function (c) {
        var n = catCount[c[0]] || 0;
        var off = c[0] !== "all" && !n;
        return '<button class="seg-btn" type="button" data-type="' + c[0] + '" aria-pressed="' + (state.cat === c[0]) + '"' +
          (c[2] ? ' title="' + esc(off ? c[2] + " : bientôt" : c[2]) + '"' : "") + (off ? " disabled" : "") + ">" +
          esc(c[1]) + ' <span class="seg-n">' + (off ? "bientôt" : n) + "</span></button>";
      }).join("");
      if (tagSel) {
        tagSel.innerHTML = '<option value="">Tous les tags</option>' + allTags.map(function (t) {
          return '<option value="' + esc(t) + '"' + (state.tag === t ? " selected" : "") + ">" + esc(t) + " (" + tagCount[t] + ")</option>";
        }).join("");
        tagSel.classList.toggle("is-on", !!state.tag);
      }
    };
    var render = function () {
      var q = state.q.toLowerCase(), shown = 0, perGrid = [];
      items.forEach(function (it) {
        var ok = (state.cat === "all" || it.cat === state.cat) &&
          (!state.tag || it.tags.indexOf(state.tag) >= 0) &&
          (!q || it.q.indexOf(q) >= 0);
        it.el.hidden = !ok;
        if (ok) { shown++; if (perGrid.indexOf(it.grid) < 0) perGrid.push(it.grid); }
      });
      // une section sans carte visible disparaît (le Versus, lui, reste toujours en bas)
      $$("[data-filter-grid]").forEach(function (grid) {
        var sec = grid.closest(".hub-section");
        if (!sec) return;
        if (sec.hasAttribute("data-steam-only") && !catCount.steam) { sec.hidden = true; return; }
        sec.hidden = perGrid.indexOf(grid) < 0;
      });
      if (emptyEl) emptyEl.hidden = shown > 0;
      if (countEl) countEl.textContent = shown + (shown > 1 ? " projets" : " projet");
      if (resetEl) resetEl.hidden = state.cat === "all" && !state.tag && !state.q;
    };
    filtersEl.addEventListener("click", function (e) {
      var b = e.target.closest("[data-type]");
      if (!b || b.disabled) return;
      state.cat = b.dataset.type;
      renderFilters(); render();
    });
    if (tagSel) tagSel.addEventListener("change", function () { state.tag = tagSel.value || null; renderFilters(); render(); });
    if (searchEl) searchEl.addEventListener("input", function () { state.q = searchEl.value.trim(); render(); });
    if (resetEl) resetEl.addEventListener("click", function () {
      state = { cat: "all", tag: null, q: "" };
      if (searchEl) searchEl.value = "";
      renderFilters(); render();
    });
    renderFilters(); render();
  }

  /* ---------- lecteur de jeu (fenêtre) ---------- */
  var dialog = null;
  function openPlayer(p) {
    if (!p || !p.embed) return;
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.className = "player";
      dialog.innerHTML =
        '<div class="cabinet">' +
        '<div class="cabinet-top"><p class="pixel" data-player-title></p>' +
        '<button class="icon-btn player-close" type="button" data-player-close aria-label="Fermer le jeu">' +
        '<svg viewBox="0 0 12 12" aria-hidden="true"><g fill="currentColor"><rect x="2" y="2" width="2" height="2"/><rect x="4" y="4" width="2" height="2"/><rect x="6" y="6" width="2" height="2"/><rect x="8" y="8" width="2" height="2"/><rect x="8" y="2" width="2" height="2"/><rect x="6" y="4" width="2" height="2"/><rect x="4" y="6" width="2" height="2"/><rect x="2" y="8" width="2" height="2"/></g></svg></button></div>' +
        '<div class="screen" data-player-screen></div>' +
        '<div class="cabinet-bottom"><a class="cabinet-help" data-player-link target="_blank" rel="noopener">Ça ne s\'affiche pas ? Jouer sur itch.io ↗</a>' +
        '<button class="btn btn-ghost btn-small" type="button" data-player-fs>⛶ Plein écran</button></div>' +
        "</div>";
      document.body.appendChild(dialog);
      $("[data-player-close]", dialog).addEventListener("click", function () { dialog.close(); });
      dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
      dialog.addEventListener("close", function () {
        $("[data-player-screen]", dialog).innerHTML = "";   // coupe le jeu et le son
        if (location.hash.indexOf("#jouer=") === 0) history.replaceState(null, "", location.pathname + location.search);
      });
      $("[data-player-fs]", dialog).addEventListener("click", function () { fullscreen($("[data-player-screen]", dialog)); });
    }
    $("[data-player-title]", dialog).textContent = p.title;
    var link = $("[data-player-link]", dialog);
    if (p.url) { link.href = p.url; link.hidden = false; } else link.hidden = true;
    var scr = $("[data-player-screen]", dialog);
    var size = p.size || [960, 600];
    sizeScreen(scr, p);
    dialog.style.setProperty("--ratio", size[0] / size[1]);
    scr.innerHTML = "";
    scr.appendChild(makeFrame(p));
    if (dialog.showModal) dialog.showModal(); else dialog.setAttribute("open", "");
    history.replaceState(null, "", "#jouer=" + p.id);
  }
  // Taille de l'écran : proportions du jeu + la barre itch.io (≈24 px) en bas.
  var ITCH_BAR = 24;
  function sizeScreen(el, p) {
    var s = p.size || [960, 600];
    el.style.aspectRatio = "auto";
    el.style.height = "0";
    el.style.paddingBottom = "calc(" + (s[1] / s[0] * 100).toFixed(3) + "% + " + (p.embed ? ITCH_BAR : 0) + "px)";
  }
  function makeFrame(p) {
    var iframe = document.createElement("iframe");
    iframe.src = p.embed;
    iframe.title = p.title || "Jeu";
    iframe.allow = "autoplay; fullscreen; gamepad; xr-spatial-tracking";
    iframe.setAttribute("allowfullscreen", "");
    return iframe;
  }
  function fullscreen(el) {
    (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el);
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-play-id]");
    if (b) openPlayer(byId(b.dataset.playId));
  });
  function playFromHash() {
    var jm = /^#jouer=(.+)$/.exec(location.hash);
    if (jm && !(dialog && dialog.open)) openPlayer(byId(decodeURIComponent(jm[1])));
  }
  window.addEventListener("hashchange", playFromHash);
  playFromHash();

  /* ---------- fiche projet (projet.html?id=…) ---------- */
  var pageEl = $("[data-project-page]");
  if (pageEl) {
    var pid = new URLSearchParams(location.search).get("id") || "";
    var proj = byId(pid);
    var STATUS = { "Released": "Sorti", "In development": "En développement", "Prototype": "Prototype", "On hold": "En pause", "Canceled": "Abandonné" };
    var INFO_KEYS = [
      ["Status", "Statut"], ["Platforms", "Plateformes"], ["Authors", "Auteurs"], ["Author", "Auteur"],
      ["Genre", "Genre"], ["Made with", "Fait avec"], ["Tags", "Tags"], ["Average session", "Durée d'une partie"],
      ["Languages", "Langues"], ["Inputs", "Contrôles"], ["Accessibility", "Accessibilité"], ["Multiplayer", "Multijoueur"],
      ["Release date", "Sortie"], ["Published", "Publié"], ["Updated", "Mis à jour"],
    ];
    var SESSION = { "A few seconds": "Quelques secondes", "A few minutes": "Quelques minutes", "About a half-hour": "Environ 30 minutes",
      "About an hour": "Environ une heure", "A few hours": "Quelques heures", "Days or more": "Plusieurs jours" };

    var hide = function (sel) { var e = $(sel); if (e) e.hidden = true; };
    if (!proj) {
      hide("[data-project-loading]");
      $("[data-project-missing]").hidden = false;
      document.title = "Projet introuvable · AkarisuMD";
    } else {
      document.title = proj.title + " · AkarisuMD";
      var metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", proj.short || proj.title);

      var renderProject = function (d) {
        d = d || {};
        hide("[data-project-loading]");
        $("[data-project]").hidden = false;

        // en-tête
        var coverBox = $("[data-project-cover]");
        coverBox.innerHTML = proj.cover
          ? '<img src="' + esc(proj.cover) + '" alt="Jaquette de ' + esc(proj.title) + '">'
          : '<canvas data-cover="' + esc(proj.id) + '" aria-hidden="true"></canvas>';
        paintCovers(coverBox);
        $("[data-project-kicker]").textContent = [TYPE_LABEL[proj.type] || "Jeu", proj.status, proj.year].filter(Boolean).join(" · ");
        $("[data-project-title]").textContent = proj.title;
        $("[data-project-short]").textContent = proj.short || "";
        if (proj.with) { var w = $("[data-project-with]"); w.textContent = "Avec " + proj.with; w.hidden = false; }
        if (proj.role) { var r = $("[data-project-role]"); r.textContent = "Mon rôle : " + proj.role; r.hidden = false; }
        $("[data-project-tags]").innerHTML = (proj.tags || []).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");

        var dl = d.download && d.source ? d.source.replace(/#.*$/, "") + "#download" : "";
        var acts = "";
        if (proj.embed) acts += '<button class="btn" type="button" data-play-id="' + esc(proj.id) + '">▶ Jouer ici</button>';
        if (dl) acts += '<a class="btn' + (proj.embed ? " btn-alt" : "") + '" href="' + esc(dl) + '" target="_blank" rel="noopener">⬇ Télécharger</a>';
        if (proj.url) acts += '<a class="btn btn-ghost" href="' + esc(proj.url) + '" target="_blank" rel="noopener">Page itch.io ↗</a>';
        if (!acts) acts = '<span class="soon">Bientôt disponible</span>';
        $("[data-project-actions]").innerHTML = acts;

        // galerie
        var shots = d.screenshots || [];
        if (shots.length) {
          $("[data-project-gallery]").hidden = false;
          $("[data-gallery]").innerHTML = shots.map(function (s, i) {
            return '<button class="shot" type="button" data-shot="' + i + '" aria-label="Agrandir l\'image ' + (i + 1) + '">' +
              '<img src="' + esc(s.src) + '" alt="" loading="lazy" width="' + esc(s.w) + '" height="' + esc(s.h) + '"></button>';
          }).join("");
          setupLightbox(shots);
        }

        // vidéos (+ celles trouvées dans la description)
        var vids = (d.videos || []).slice();
        var descHtml = d.description || "<p>" + esc(proj.short || "") + "</p>";
        var descEl = $("[data-project-desc]");
        descEl.innerHTML = descHtml;
        if (vids.length) {
          $("[data-project-videos]").hidden = false;
          $("[data-videos]").innerHTML = vids.map(function (v) { return '<div class="video" data-yt="' + esc(v) + '"></div>'; }).join("");
        }
        $$(".video[data-yt]", pageEl).forEach(setupVideo);

        // téléchargement
        if (dl) {
          $("[data-project-download]").hidden = false;
          $("[data-project-files]").innerHTML = (d.uploads || []).map(function (u) {
            return '<li><span class="file-name">' + esc(u.name) + '</span><span class="file-meta">' +
              esc([u.size].concat(u.platforms || []).filter(Boolean).join(" · ")) + "</span></li>";
          }).join("");
          $("[data-project-download-btn]").innerHTML = '<a class="btn" href="' + esc(dl) + '" target="_blank" rel="noopener">⬇ Télécharger sur itch.io</a>';
        }

        // infos
        var info = d.info || {};
        var rows = "";
        INFO_KEYS.forEach(function (k) {
          var v = info[k[0]];
          if (!v) return;
          if (k[0] === "Status") v = STATUS[v] || v;
          if (k[0] === "Average session") v = SESSION[v] || v;
          rows += "<dt>" + esc(k[1]) + "</dt><dd>" + esc(v) + "</dd>";
        });
        if (rows) { $("[data-project-info]").innerHTML = rows; $("[data-project-info-block]").hidden = false; }

        // classement
        var lb = $("[data-project-leaderboard]");
        if (lb && proj.leaderboard && window.Leaderboard) {
          lb.setAttribute("data-leaderboard", proj.id);
          lb.setAttribute("data-title", "Classement");
          window.Leaderboard.render(lb);
        }

        // projets précédent / suivant
        var idx = PROJECTS.indexOf(proj);
        var prev = PROJECTS[(idx - 1 + PROJECTS.length) % PROJECTS.length];
        var next = PROJECTS[(idx + 1) % PROJECTS.length];
        $("[data-project-nav]").innerHTML =
          '<a class="nav-prev" href="' + projectUrl(prev) + '"><span>← Précédent</span><strong>' + esc(prev.title) + "</strong></a>" +
          '<a class="nav-next" href="' + projectUrl(next) + '"><span>Suivant →</span><strong>' + esc(next.title) + "</strong></a>";
      };

      // Fiche détaillée (description, images…) seulement pour les projets publiés.
      (proj.url ? fetch("data/projects/" + encodeURIComponent(proj.id) + ".json") : Promise.resolve({ ok: false }))
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; })
        .then(renderProject);
    }
  }

  // Vidéo YouTube : vignette, la vidéo ne se charge qu'au clic (plus léger, pas de pistage avant).
  function setupVideo(el) {
    var id = el.getAttribute("data-yt");
    if (!/^[\w-]{6,20}$/.test(id)) { el.remove(); return; }
    el.innerHTML = '<button type="button" class="video-play" aria-label="Lire la vidéo">' +
      '<img src="https://i.ytimg.com/vi/' + id + '/hqdefault.jpg" alt="" loading="lazy"><span aria-hidden="true">▶</span></button>';
    el.querySelector("button").addEventListener("click", function () {
      el.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1" title="Vidéo YouTube" ' +
        'allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    });
  }

  // Visionneuse d'images
  function setupLightbox(shots) {
    var box = $("[data-lightbox]");
    if (!box) return;
    var img = $("[data-lightbox-img]", box), count = $("[data-lightbox-count]", box), cur = 0;
    function show(i) {
      cur = (i + shots.length) % shots.length;
      img.src = shots[cur].src;
      count.textContent = shots.length > 1 ? (cur + 1) + " / " + shots.length : "";
    }
    $("[data-gallery]").addEventListener("click", function (e) {
      var b = e.target.closest("[data-shot]");
      if (!b) return;
      show(Number(b.getAttribute("data-shot")));
      if (box.showModal) box.showModal(); else box.setAttribute("open", "");
    });
    $("[data-lightbox-close]", box).addEventListener("click", function () { box.close(); });
    $("[data-lightbox-prev]", box).addEventListener("click", function () { show(cur - 1); });
    $("[data-lightbox-next]", box).addEventListener("click", function () { show(cur + 1); });
    box.addEventListener("click", function (e) { if (e.target === box) box.close(); });
    box.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") show(cur - 1);
      if (e.key === "ArrowRight") show(cur + 1);
    });
    var single = shots.length < 2;
    $("[data-lightbox-prev]", box).hidden = single;
    $("[data-lightbox-next]", box).hidden = single;
  }

  /* ---------- jeu à la une (borne de l'accueil) ---------- */
  var feat = $("[data-featured]");
  if (feat) {
    var game = byId((SITE.featured || {}).id) || {};
    $$("[data-featured-title]").forEach(function (el) { el.textContent = game.title || "Mon jeu"; });
    $$("[data-featured-text]").forEach(function (el) { el.textContent = game.short || ""; });
    $$("[data-featured-link]").forEach(function (el) { if (game.url) el.href = game.url; else el.hidden = true; });

    var lbEl = $("[data-featured-leaderboard]");
    if (lbEl && game.leaderboard && window.Leaderboard) {
      lbEl.setAttribute("data-leaderboard", game.id);
      lbEl.setAttribute("data-title", "Classement " + game.title);
      window.Leaderboard.render(lbEl);
    }

    var screen = $(".screen", feat);
    sizeScreen(screen, game);
    var cover = $(".screen-cover canvas", feat);
    if (cover && game.cover) {
      var img = document.createElement("img");
      img.src = game.cover; img.alt = ""; img.className = "screen-img";
      cover.replaceWith(img);
    } else if (cover && game.id) drawCover(cover, game);

    var play = $("[data-play]", feat);
    var note = $("[data-featured-note]", feat);
    if (!game.embed) {
      play.textContent = game.url ? "Jouer sur itch.io ↗" : "Bientôt jouable ici";
      if (note) note.hidden = false;
    }
    play.addEventListener("click", function () {
      if (!game.embed) { if (game.url) window.open(game.url, "_blank", "noopener"); return; }
      var iframe = makeFrame(game);
      var help = $("[data-featured-help]", feat);
      if (help && game.url) { help.href = game.url; help.hidden = false; }
      screen.innerHTML = "";
      screen.appendChild(iframe);
      screen.classList.add("playing");
      iframe.focus();
    });
    var fs = $("[data-fullscreen]", feat);
    if (fs) fs.addEventListener("click", function () { fullscreen(screen); });
  }

  /* ---------- formulaire de contact ---------- */
  var form = $("[data-contact-form]");
  if (form) {
    var status = $("[data-form-status]", form);
    function say(msg, kind) { status.textContent = msg; status.dataset.kind = kind || ""; }
    // Envoi direct : endpoint perso (Formspree…) sinon FormSubmit vers l'email du site.
    var endpoint = SITE.formEndpoint || (SITE.email ? "https://formsubmit.co/ajax/" + SITE.email : "");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form._honey && form._honey.value) return; // anti-spam (champ caché)
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var data = new FormData(form);
      if (!endpoint) { say("Le formulaire n'est pas encore branché. Passe par un des liens à côté en attendant !", "err"); return; }
      data.append("_subject", "[mdelarose.fr] " + data.get("topic") + " — " + data.get("name"));
      data.append("_replyto", data.get("email"));
      data.append("_template", "table");
      data.append("_captcha", "false");
      var btn = $("button[type=submit]", form);
      btn.disabled = true; say("Envoi en cours…");
      fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) {
            var msg = String(j.message || "");
            // 1er envoi : FormSubmit demande d'activer le formulaire par mail.
            if (/activat/i.test(msg)) {
              say("Formulaire en attente d'activation : le propriétaire du site doit cliquer sur le lien reçu par mail. Réessaie un peu plus tard, ou écris directement à " + SITE.email + ".", "err");
              return "pending";
            }
            if (!r.ok || j.success === false || j.success === "false") throw new Error(msg || "HTTP " + r.status);
            return "ok";
          });
        })
        .then(function (res) {
          if (res !== "ok") return;
          form.reset();
          say("Message envoyé ! Je te réponds vite 🍄", "ok");
        })
        .catch(function (err) {
          if (window.console) console.warn("Formulaire de contact :", err);
          say("Oups, l'envoi a échoué (" + (err && err.message ? err.message : "réseau") + "). Réessaie, ou écris-moi directement à " + (SITE.email || "mon adresse mail") + ".", "err");
        })
        .then(function () { btn.disabled = false; });
    });
  }
})();
