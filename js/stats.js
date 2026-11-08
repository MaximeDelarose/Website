/* =========================================================================
   Page Stats (stats.html) : statistiques globales du site et les 3 clans.
   Les chiffres viennent de site_stats() (Supabase, lisible sans compte) ;
   rejoindre un clan demande d'être connecté (clan_me / clan_join).
   ========================================================================= */
(function () {
  "use strict";
  var root = document.querySelector("[data-stats]");
  if (!root) return;
  var A = window.SiteAuth;
  var cfg = (window.SITE || {}).supabase || {};
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var fmt = function (n) { return Number(n || 0).toLocaleString("fr-FR"); };
  var ERR = {
    clan_cooldown: "Tu as changé de clan il y a moins de 7 jours.",
    unknown_clan: "Ce clan n'existe pas.",
    not_logged_in: "Connecte-toi d'abord.",
  };
  var msg = function (e) { var m = e && (e.message || e); return ERR[m] || (A && A.message ? A.message(e) : "Erreur, réessaie."); };

  var stats = null, mine = null, busy = false, note = "";

  function loadStats() {
    if (!cfg.url || !cfg.key) return Promise.reject(new Error("config"));
    var h = { "Content-Type": "application/json", apikey: cfg.key };
    if (!/^sb_/.test(cfg.key)) h.Authorization = "Bearer " + cfg.key;
    return fetch(cfg.url.replace(/\/+$/, "") + "/rest/v1/rpc/site_stats", { method: "POST", headers: h, body: "{}" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
  }
  function loadMine() {
    if (!A || !A.user) { mine = null; return Promise.resolve(); }
    return A.rpc("clan_me").then(function (m) { mine = m; }).catch(function () { mine = null; });
  }

  function tile(icon, value, label, sub) {
    return '<div class="panel st-tile"><span class="st-ico" aria-hidden="true">' + icon + '</span><strong>' + value + "</strong><span>" + esc(label) + "</span>" + (sub ? "<small>" + esc(sub) + "</small>" : "") + "</div>";
  }

  function render() {
    if (!stats) { root.innerHTML = '<p class="lead">Chargement des statistiques…</p>'; return; }
    var s = stats, user = A && A.user, admin = A && A.profile && A.profile.admin;
    var totalMembers = s.clans.reduce(function (a, c) { return a + Number(c.members || 0); }, 0);
    var h = "";
    if (admin) h += '<p class="st-admin"><a class="btn btn-small btn-ghost" href="admin.html">🛠 Page admin</a></p>';

    h += '<section class="st-section"><h2>Le site en chiffres</h2><div class="st-tiles">' +
      tile("🌰", fmt(s.acorns_earned), "glands récoltés dans tous les jeux", s.acorns_live ? "" : "Le compteur démarre quand les jeux donneront des glands") +
      tile("🐿️", fmt(s.accounts), "joueurs inscrits") +
      tile("🎮", fmt(s.runs), "parties enregistrées en ligne") +
      tile("🏆", fmt(s.scores), "scores dans les classements") +
      "</div></section>";

    h += '<section class="st-section"><h2>Les clans</h2><p class="lead st-clan-intro">Trois clans se partagent la forêt. Choisis le tien : tes glands compteront pour lui. ' +
      "À quoi serviront les clans ? Surprise… 🌰</p>";
    if (!user) h += '<p class="st-login"><button class="btn btn-small" type="button" data-st="login">Se connecter pour rejoindre un clan</button></p>';
    else if (mine && mine.clan && mine.next_change && new Date(mine.next_change) > new Date())
      h += '<p class="st-note">Tu pourras changer de clan à partir du ' + esc(new Date(mine.next_change).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })) + ".</p>";
    if (note) h += '<p class="st-note st-err" role="status">' + esc(note) + "</p>";

    h += '<div class="st-clans">' + s.clans.map(function (c) {
      var isMine = mine && mine.clan === c.id, share = totalMembers ? Math.round(100 * c.members / totalMembers) : 0;
      var locked = mine && mine.clan && !isMine && mine.next_change && new Date(mine.next_change) > new Date();
      var btn = !user ? "" : isMine ? '<span class="st-mine">✓ Ton clan</span>' :
        '<button class="btn btn-small" type="button" data-st-join="' + esc(c.id) + '"' + (locked || busy ? " disabled" : "") + ">" + (mine && mine.clan ? "Changer pour ce clan" : "Rejoindre") + "</button>";
      return '<article class="panel st-clan' + (isMine ? " is-mine" : "") + '" style="--cc:' + esc(c.color) + '">' +
        '<p class="st-emblem" aria-hidden="true">' + esc(c.emblem) + "</p><h3>" + esc(c.name) + '</h3><p class="st-motto">' + esc(c.motto) + "</p>" +
        '<dl class="st-clan-stats"><div><dt>Membres</dt><dd>' + fmt(c.members) + "</dd></div><div><dt>Glands</dt><dd>" + fmt(c.acorns) + "</dd></div></dl>" +
        '<div class="st-bar" aria-label="' + share + ' % des membres"><span style="width:' + share + '%"></span></div>' + btn + "</article>";
    }).join("") + "</div></section>";

    h += '<p class="st-updated">Mis à jour ' + esc(new Date(s.updated_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })) + "</p>";
    root.innerHTML = h;
  }

  root.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b || b.disabled) return;
    if (b.dataset.st === "login" && A) { A.signIn(); return; }
    var id = b.dataset.stJoin; if (!id || !A) return;
    var clan = stats.clans.filter(function (c) { return c.id === id; })[0];
    if (!confirm("Rejoindre le " + clan.name + " ? Tu ne pourras pas en changer pendant 7 jours.")) return;
    busy = true; note = ""; render();
    A.rpc("clan_join", { p_clan: id }).then(function (m) { mine = m; return loadStats().then(function (s) { stats = s; }); })
      .catch(function (err) { note = msg(err); })
      .then(function () { busy = false; render(); });
  });

  render();
  loadStats().then(function (s) { stats = s; render(); }).catch(function () { root.innerHTML = '<p class="lead">Statistiques indisponibles pour le moment.</p>'; });
  if (A) {
    A.ready.then(loadMine).then(render);
    A.on(function () { loadMine().then(render); });
  }
})();
