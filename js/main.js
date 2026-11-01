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
  $$("#site-nav a").forEach(function (a) {
    if (a.dataset.page === page) a.setAttribute("aria-current", "page");
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
  function card(p) {
    var typeLabel = p.type === "plugin" ? "Plugin Unity" : "Jeu";
    var cta = p.type === "plugin" ? "Voir le plugin" : "Voir le jeu";
    var media = p.cover
      ? '<img src="' + esc(p.cover) + '" alt="" loading="lazy">'
      : '<canvas data-cover="' + esc(p.id) + '" aria-hidden="true"></canvas>';
    var meta = [p.status, p.year].filter(Boolean).join(" · ");
    var tags = (p.tags || []).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
    var actions;
    if (p.embed) {
      actions = '<div class="card-actions"><button class="btn btn-small" type="button" data-play-id="' + esc(p.id) + '">▶ Jouer ici</button>' +
        (p.url ? '<a class="text-link" href="' + esc(p.url) + '" target="_blank" rel="noopener">itch.io ↗</a>' : "") + "</div>";
    } else if (p.url) {
      actions = '<a class="btn btn-small" href="' + esc(p.url) + '" target="_blank" rel="noopener">' + cta + " ↗</a>";
    } else {
      actions = '<span class="soon">Bientôt disponible</span>';
    }
    return '<article class="card" data-type="' + esc(p.type) + '">' +
      '<div class="card-media">' + media +
      '<span class="badge badge-' + esc(p.type) + '">' + typeLabel + "</span>" +
      (p.embed ? '<span class="badge badge-play">Jouable ici</span>' : "") + "</div>" +
      '<div class="card-body">' +
      '<h3 class="card-title">' + esc(p.title) + "</h3>" +
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

  // Accueil : derniers projets
  var latest = $("[data-latest]");
  if (latest) {
    var n = Number(latest.dataset.latest) || 3;
    latest.innerHTML = PROJECTS.slice(0, n).map(card).join("");
    paintCovers(latest);
  }

  // Bibliothèque
  var lib = $("[data-library]");
  if (lib) {
    var filtersEl = $("[data-filters]");
    var searchEl = $("[data-search]");
    var countEl = $("[data-count]");
    var state = { type: "all", tag: null, q: "" };

    var allTags = [];
    PROJECTS.forEach(function (p) { (p.tags || []).forEach(function (t) { if (allTags.indexOf(t) < 0) allTags.push(t); }); });
    allTags.sort();

    var hash = (location.hash || "").replace("#", "");
    if (hash === "jeux") state.type = "game";
    if (hash === "plugins") state.type = "plugin";
    if (hash === "jouer") state.type = "play";

    function matchType(p, t) {
      if (t === "all") return true;
      if (t === "play") return !!p.embed;
      return p.type === t;
    }
    function renderFilters() {
      var types = [["all", "Tout"], ["game", "Jeux"], ["plugin", "Plugins Unity"]];
      if (PROJECTS.some(function (p) { return p.embed; })) types.splice(1, 0, ["play", "▶ Jouable ici"]);
      var html = '<div class="filter-row" role="group" aria-label="Type">';
      types.forEach(function (t) {
        var count = PROJECTS.filter(function (p) { return matchType(p, t[0]); }).length;
        html += '<button class="chip" data-type="' + t[0] + '" aria-pressed="' + (state.type === t[0]) + '">' + t[1] + ' <span class="chip-n">' + count + "</span></button>";
      });
      html += '</div><div class="filter-row tags-row" role="group" aria-label="Étiquettes">';
      allTags.forEach(function (t) {
        html += '<button class="chip chip-tag" data-tag="' + esc(t) + '" aria-pressed="' + (state.tag === t) + '">#' + esc(t) + "</button>";
      });
      html += "</div>";
      filtersEl.innerHTML = html;
    }
    function render() {
      var q = state.q.toLowerCase();
      var list = PROJECTS.filter(function (p) {
        if (!matchType(p, state.type)) return false;
        if (state.tag && (p.tags || []).indexOf(state.tag) < 0) return false;
        if (q && (p.title + " " + p.short + " " + (p.tags || []).join(" ")).toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
      if (!list.length) {
        var msg = state.type === "plugin" && !state.q && !state.tag
          ? "Mes plugins Unity arrivent bientôt ici. Repasse dans quelques temps 🍄"
          : "Rien trouvé dans ce coin de la forêt…";
        lib.innerHTML = '<div class="empty"><img src="assets/squirrel.png" alt="" width="60" height="57"><p>' + msg + "</p></div>";
      } else {
        lib.innerHTML = list.map(card).join("");
        paintCovers(lib);
      }
      if (countEl) countEl.textContent = list.length + (list.length > 1 ? " projets" : " projet");
    }
    filtersEl.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.type) state.type = b.dataset.type;
      if (b.dataset.tag) state.tag = state.tag === b.dataset.tag ? null : b.dataset.tag;
      renderFilters(); render();
    });
    if (searchEl) searchEl.addEventListener("input", function () { state.q = searchEl.value.trim(); render(); });
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
        '<div class="cabinet-bottom"><a class="btn btn-ghost btn-small" data-player-link target="_blank" rel="noopener">Page itch.io ↗</a>' +
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

  /* ---------- jeu à la une (borne de l'accueil) ---------- */
  var feat = $("[data-featured]");
  if (feat) {
    var game = byId((SITE.featured || {}).id) || {};
    $$("[data-featured-title]").forEach(function (el) { el.textContent = game.title || "Mon jeu"; });
    $$("[data-featured-text]").forEach(function (el) { el.textContent = game.short || ""; });
    $$("[data-featured-link]").forEach(function (el) { if (game.url) el.href = game.url; else el.hidden = true; });

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
            if (!r.ok || j.success === false || j.success === "false") throw new Error(j.message || r.status);
          });
        })
        .then(function () {
          form.reset();
          say("Message envoyé ! Je te réponds vite 🍄", "ok");
        })
        .catch(function () {
          say("Oups, l'envoi a échoué. Réessaie, ou écris-moi directement à " + (SITE.email || "mon adresse mail") + ".", "err");
        })
        .then(function () { btn.disabled = false; });
    });
  }
})();
