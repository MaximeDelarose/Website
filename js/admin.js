/* =========================================================================
   Page admin (admin.html) : réservée aux comptes de site_admins.
   Toutes les actions passent par des fonctions admin_*() qui revérifient
   côté serveur que l'on est admin (voir supabase/glands-clans-stats.sql).
   ========================================================================= */
(function () {
  "use strict";
  var root = document.querySelector("[data-admin]");
  var A = window.SiteAuth;
  if (!root || !A) return;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var fmt = function (n) { return Number(n || 0).toLocaleString("fr-FR"); };
  var when = function (d) { return d ? new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"; };
  var ERR = {
    not_admin: "Réservé aux admins.", not_enough_acorns: "Pas assez de glands sur ce compte.", invalid_amount: "Montant invalide.",
    unknown_clan: "Clan inconnu.", unknown_source: "Jeu inconnu.",
  };
  var msg = function (e) { var m = e && (e.message || e); return ERR[m] || m || "Erreur"; };

  var data = null, users = [], openHist = {}, status = { text: "", kind: "" };
  function say(text, kind) { status = { text: text, kind: kind || "ok" }; var el = root.querySelector("[data-ad-status]"); if (el) { el.textContent = text; el.dataset.kind = status.kind; } }

  function load() {
    return A.rpc("admin_overview").then(function (d) { data = d; render(); }).catch(function (e) { root.innerHTML = '<div class="panel ad-box"><p>' + esc(msg(e)) + "</p></div>"; });
  }
  function act(fn, args, okText, reload) {
    say("…", "");
    return A.rpc(fn, args).then(function (r) { say(typeof okText === "function" ? okText(r) : okText, "ok"); return reload === false ? r : load().then(function () { return r; }); })
      .catch(function (e) { say(msg(e), "err"); throw e; });
  }

  /* ------------------------------------------------------------- rendu */
  function tile(v, label, sub) { return '<div class="ad-tile"><strong>' + v + "</strong><span>" + esc(label) + "</span>" + (sub ? "<small>" + sub + "</small>" : "") + "</div>"; }
  function clanOptions(sel) {
    return '<option value="">— aucun —</option>' + (data.clans || []).map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === sel ? " selected" : "") + ">" + esc(c.emblem + " " + c.name) + "</option>"; }).join("");
  }

  function render() {
    var d = data, h = "";
    h += '<p class="ad-status" data-ad-status role="status" data-kind="' + esc(status.kind) + '">' + esc(status.text) + "</p>";

    // ---- vue d'ensemble
    var saves = Object.keys(d.saves || {}).map(function (k) { return esc(k) + " : " + fmt(d.saves[k]); }).join(" · ") || "aucune";
    h += '<section class="panel ad-box"><div class="ad-head"><h2>Vue d\'ensemble</h2><button class="btn btn-small btn-ghost" type="button" data-ad="reload">↻ Actualiser</button></div><div class="ad-tiles">' +
      tile(fmt(d.accounts), "comptes", "+" + fmt(d.accounts_7d) + " en 7 jours") +
      tile(fmt(d.admins), "admins") +
      tile(fmt(d.dice_runs), "parties d'Écureuil Dice", "+" + fmt(d.dice_runs_7d) + " en 7 jours") +
      tile(fmt(d.daily_scores), "scores du défi du jour") +
      tile(fmt((d.leaderboards || []).reduce(function (a, g) { return a + Number(g.scores); }, 0)), "scores classés") +
      tile(fmt(d.acorns.balance), "glands en circulation", fmt(d.acorns.earned) + " gagnés · " + fmt(d.acorns.wallets) + " porte-monnaie") +
      tile(fmt(d.acorns.moves_7d), "mouvements de glands", "en 7 jours") +
      tile(fmt(d.rejects_7d), "sauvegardes refusées", "en 7 jours") +
      '</div><p class="ad-note">Sauvegardes en ligne par jeu : ' + saves + "</p></section>";

    // ---- joueurs
    h += '<section class="panel ad-box"><h2>Joueurs</h2><form class="ad-row" data-ad-form="find"><input type="search" name="q" placeholder="Pseudo, début d\'e-mail ou identifiant" minlength="2" required>' +
      '<button class="btn btn-small" type="submit">Chercher</button></form>' +
      (users.length ? users.map(userCard).join("") : '<p class="ad-note">Cherche un joueur pour voir son compte, lui donner des glands, changer son clan ou effacer une sauvegarde bloquée.</p>') + "</section>";

    // ---- classements
    h += '<section class="panel ad-box"><h2>Classements</h2><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Jeu</th><th>Scores</th><th>Sens</th><th>Bornes</th><th>Actif</th><th></th></tr></thead><tbody>' +
      (d.leaderboards || []).map(function (g) {
        return "<tr><td><b>" + esc(g.name) + "</b><br><small>" + esc(g.id) + "</small></td><td>" + fmt(g.scores) + "</td><td>" + (g.higher_is_better ? "plus haut" : "plus bas") + "</td><td>" + fmt(g.min_score) + " – " + fmt(g.max_score) + "</td>" +
          '<td><input type="checkbox" data-ad-lb-toggle="' + esc(g.id) + '"' + (g.enabled ? " checked" : "") + ' aria-label="Classement actif"></td>' +
          '<td><button class="btn btn-small btn-ghost" type="button" data-ad-lb-edit="' + esc(g.id) + '">Modifier</button> <button class="btn btn-small ad-danger" type="button" data-ad-lb-reset="' + esc(g.id) + '"' + (Number(g.scores) ? "" : " disabled") + ">Vider</button></td></tr>";
      }).join("") + "</tbody></table></div>" +
      '<form class="ad-grid-form" data-ad-form="lb"><h3>Ajouter / modifier un classement</h3>' +
      '<label>Id <input name="id" required pattern="[a-z0-9-]{2,40}" placeholder="chaaat-v2"></label><label>Nom <input name="name" required placeholder="Chaaat v2"></label>' +
      '<label>Sens <select name="higher"><option value="1">Plus haut = mieux</option><option value="0">Plus bas = mieux (temps)</option></select></label>' +
      '<label>Score min <input name="min" type="number" value="0"></label><label>Score max <input name="max" type="number" value="10000000"></label>' +
      '<label class="ad-check"><input name="enabled" type="checkbox" checked> Actif</label><button class="btn btn-small" type="submit">Enregistrer</button></form></section>';

    // ---- glands globaux
    h += '<section class="panel ad-box"><h2>Glands globaux</h2><p class="ad-note">🔌 <b>Aucun jeu n\'est branché.</b> Activer un jeu ici l\'autorise à donner des glands (dans la limite des plafonds), mais rien ne se passe tant que le jeu n\'appelle pas <code>acorn_earn</code>.</p>' +
      '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Jeu</th><th>Actif</th><th>Max / partie</th><th>Max / heure</th><th></th></tr></thead><tbody>' +
      (d.sources || []).map(function (s) {
        return '<tr data-ad-src="' + esc(s.game) + '"><td><b>' + esc(s.name) + "</b><br><small>" + esc(s.game) + '</small></td><td><input type="checkbox" name="enabled"' + (s.enabled ? " checked" : "") + ' aria-label="Actif"></td>' +
          '<td><input type="number" name="call" min="1" value="' + esc(s.max_per_call) + '"></td><td><input type="number" name="hour" min="1" value="' + esc(s.max_per_hour) + '"></td>' +
          '<td><button class="btn btn-small btn-ghost" type="button" data-ad-src-save="' + esc(s.game) + '">Enregistrer</button></td></tr>';
      }).join("") + "</tbody></table></div></section>";

    // ---- clans
    h += '<section class="panel ad-box"><h2>Clans</h2><div class="ad-tiles">' + (d.clans || []).map(function (c) {
      return '<div class="ad-tile" style="border-color:' + esc(c.color) + '"><strong>' + esc(c.emblem) + " " + fmt(c.members) + "</strong><span>" + esc(c.name) + "</span><small>" + fmt(c.acorns) + " glands</small></div>";
    }).join("") + "</div></section>";

    // ---- activité récente
    h += '<section class="panel ad-box"><h2>Activité récente</h2><div class="ad-cols">' +
      list("Nouveaux comptes", d.recent_accounts, function (x) { return "<b>" + esc(x.pseudo || "(sans pseudo)") + "</b> <small>" + when(x.created_at) + "</small>"; }) +
      list("Derniers scores", d.recent_scores, function (x) { return "<b>" + esc(x.player) + "</b> · " + fmt(x.score) + " <small>" + esc(x.game_id) + " · " + when(x.created_at) + '</small> <button class="ad-x" type="button" data-ad-score-del="' + esc(x.id) + '" title="Supprimer ce score">✕</button>'; }) +
      list("Glands (mouvements)", d.recent_acorns, function (x) { return '<b class="' + (x.amount > 0 ? "ad-plus" : "ad-minus") + '">' + (x.amount > 0 ? "+" : "") + fmt(x.amount) + "</b> " + esc(x.pseudo || "?") + " <small>" + esc(x.game + (x.reason ? " · " + x.reason : "")) + " · " + when(x.created_at) + "</small>"; }) +
      list("Sauvegardes refusées", d.recent_rejects, function (x) { return "<b>" + esc(x.game_id) + "</b> " + esc(x.reason) + " <small>" + when(x.created_at) + "</small>"; },
        (d.recent_rejects || []).length ? '<button class="btn btn-small btn-ghost" type="button" data-ad="clear-rejects">Vider le journal</button>' : "") +
      "</div></section>";

    root.innerHTML = h;
  }
  function list(title, rows, fn, extra) {
    return '<div><h3>' + esc(title) + "</h3>" + ((rows || []).length ? '<ul class="ad-list">' + rows.map(function (x) { return "<li>" + fn(x) + "</li>"; }).join("") + "</ul>" : '<p class="ad-note">Rien pour l\'instant.</p>') + (extra || "") + "</div>";
  }
  function userCard(u) {
    var saves = (u.saves || []);
    return '<article class="ad-user" data-ad-user="' + esc(u.id) + '"><header><b>' + esc(u.pseudo || "(sans pseudo)") + "</b>" + (u.admin ? ' <span class="account-admin">ADMIN</span>' : "") +
      " <small>" + esc(u.email || "") + "</small></header>" +
      '<p class="ad-note">Inscrit le ' + when(u.created_at) + " · dernière connexion " + when(u.last_sign_in_at) + ' · <code>' + esc(u.id) + "</code></p>" +
      '<div class="ad-user-grid">' +
      '<form class="ad-row" data-ad-form="grant"><span>🌰 <b>' + fmt(u.acorns) + '</b> glands</span><input type="number" name="amount" placeholder="+100 ou -50" required><input name="reason" placeholder="Raison (facultatif)" maxlength="120"><button class="btn btn-small" type="submit">Appliquer</button></form>' +
      '<form class="ad-row" data-ad-form="clan"><span>Clan</span><select name="clan">' + clanOptions(u.clan) + '</select><button class="btn btn-small btn-ghost" type="submit">Changer</button></form>' +
      '<div class="ad-row"><span>Sauvegardes</span>' + (saves.length ? saves.map(function (g) { return '<button class="btn btn-small ad-danger" type="button" data-ad-save-reset="' + esc(g) + '" title="Effacer la sauvegarde en ligne">✕ ' + esc(g) + "</button>"; }).join("") : "<small>aucune</small>") + "</div>" +
      '<div class="ad-row"><button class="ad-link" type="button" data-ad-hist>' + (openHist[u.id] ? "Masquer" : "Voir") + " l'historique des glands</button></div>" +
      (openHist[u.id] ? '<ul class="ad-list">' + (openHist[u.id].length ? openHist[u.id].map(function (x) {
        return '<li><b class="' + (x.amount > 0 ? "ad-plus" : "ad-minus") + '">' + (x.amount > 0 ? "+" : "") + fmt(x.amount) + "</b> " + esc(x.game) + (x.reason ? " · " + esc(x.reason) : "") + (x.by_admin ? " · admin" : "") + " <small>" + when(x.created_at) + "</small></li>";
      }).join("") : "<li>Aucun mouvement.</li>") + "</ul>" : "") +
      "</div></article>";
  }

  /* ----------------------------------------------------------- actions */
  function findUsers(q) {
    return A.rpc("admin_find_user", { p_q: q }).then(function (r) { users = r || []; say(users.length + " joueur(s) trouvé(s)", "ok"); render(); }).catch(function (e) { say(msg(e), "err"); });
  }
  function refreshUser(id) {
    var u = users.filter(function (x) { return x.id === id; })[0];
    return A.rpc("admin_find_user", { p_q: id }).then(function (r) { if (r && r[0] && u) users[users.indexOf(u)] = r[0]; render(); });
  }

  root.addEventListener("submit", function (e) {
    var f = e.target.closest("[data-ad-form]"); if (!f) return;
    e.preventDefault();
    var kind = f.dataset.adForm, card = f.closest("[data-ad-user]"), uid = card && card.dataset.adUser;
    if (kind === "find") findUsers(f.q.value.trim());
    if (kind === "grant") {
      var n = parseInt(f.amount.value, 10);
      if (!n) return say("Montant invalide.", "err");
      if (!confirm((n > 0 ? "Donner " : "Retirer ") + fmt(Math.abs(n)) + " glands ?")) return;
      act("admin_acorn_grant", { p_user: uid, p_amount: n, p_reason: f.reason.value }, function (r) { return "Fait : nouveau solde " + fmt(r.balance) + " glands."; })
        .then(function () { if (openHist[uid]) return A.rpc("admin_acorn_history", { p_user: uid }).then(function (hst) { openHist[uid] = hst; }); })
        .then(function () { return refreshUser(uid); }).catch(function () {});
    }
    if (kind === "clan") act("admin_set_clan", { p_user: uid, p_clan: f.clan.value || null }, "Clan modifié.").then(function () { return refreshUser(uid); }).catch(function () {});
    if (kind === "lb") {
      var el = f.elements;
      act("admin_lb_game", { p_id: el.id.value.trim(), p_name: el.name.value.trim(), p_higher: el.higher.value === "1", p_min: Number(el.min.value), p_max: Number(el.max.value), p_enabled: el.enabled.checked }, "Classement « " + el.id.value.trim() + " » enregistré.").catch(function () {});
    }
  });

  root.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b || b.disabled) return;
    var card = b.closest("[data-ad-user]"), uid = card && card.dataset.adUser;
    if (b.dataset.ad === "reload") { say("Actualisé.", "ok"); load(); }
    if (b.dataset.ad === "clear-rejects" && confirm("Vider tout le journal des sauvegardes refusées ?")) act("admin_clear_rejects", {}, function (n) { return n + " ligne(s) supprimée(s)."; }).catch(function () {});
    if (b.dataset.adLbReset) {
      var id = b.dataset.adLbReset;
      if (prompt("Effacer TOUS les scores du classement « " + id + " » ? Tape son id pour confirmer :") === id)
        act("admin_lb_reset", { p_game: id }, function (n) { return n + " score(s) effacé(s)."; }).catch(function () {});
    }
    if (b.dataset.adLbEdit) {
      var g = (data.leaderboards || []).filter(function (x) { return x.id === b.dataset.adLbEdit; })[0], f = root.querySelector('[data-ad-form="lb"]');
      if (g && f) { var fe = f.elements; fe.id.value = g.id; fe.name.value = g.name; fe.higher.value = g.higher_is_better ? "1" : "0"; fe.min.value = g.min_score; fe.max.value = g.max_score; fe.enabled.checked = g.enabled; f.scrollIntoView({ block: "center" }); fe.name.focus(); }
    }
    if (b.dataset.adScoreDel && confirm("Supprimer ce score ?")) act("admin_lb_delete_score", { p_id: Number(b.dataset.adScoreDel) }, "Score supprimé.").catch(function () {});
    if (b.dataset.adSrcSave) {
      var row = b.closest("[data-ad-src]");
      act("admin_acorn_source", { p_game: b.dataset.adSrcSave, p_enabled: row.querySelector('[name="enabled"]').checked, p_max_call: Number(row.querySelector('[name="call"]').value), p_max_hour: Number(row.querySelector('[name="hour"]').value) }, "Réglages enregistrés.").catch(function () {});
    }
    if (b.dataset.adSaveReset && uid && confirm("Effacer la sauvegarde en ligne « " + b.dataset.adSaveReset + " » de ce joueur ? Il repartira de la sauvegarde de son navigateur.")) {
      act("admin_save_reset", { p_user: uid, p_game: b.dataset.adSaveReset }, "Sauvegarde effacée.").then(function () { return refreshUser(uid); }).catch(function () {});
    }
    if (b.hasAttribute("data-ad-hist") && uid) {
      if (openHist[uid]) { delete openHist[uid]; render(); return; }
      A.rpc("admin_acorn_history", { p_user: uid }).then(function (hst) { openHist[uid] = hst || []; render(); }).catch(function (err) { say(msg(err), "err"); });
    }
  });

  root.addEventListener("change", function (e) {
    var t = e.target;
    if (t.dataset.adLbToggle) {
      var g = (data.leaderboards || []).filter(function (x) { return x.id === t.dataset.adLbToggle; })[0]; if (!g) return;
      act("admin_lb_game", { p_id: g.id, p_name: g.name, p_higher: g.higher_is_better, p_min: g.min_score, p_max: g.max_score, p_enabled: t.checked }, "Classement " + (t.checked ? "activé" : "désactivé") + ".").catch(function () { t.checked = !t.checked; });
    }
  });

  /* ---------------------------------------------------------- démarrage */
  function gate(st) {
    if (!st.user) {
      root.innerHTML = '<div class="panel ad-box"><h2>Connexion requise</h2><p>Cette page est réservée aux admins du site.</p><button class="btn" type="button" data-ad-login>Se connecter</button></div>';
      var b = root.querySelector("[data-ad-login]"); if (b) b.addEventListener("click", function () { A.signIn(); });
      return;
    }
    if (!st.profile || !st.profile.admin) { root.innerHTML = '<div class="panel ad-box"><h2>Accès refusé</h2><p>Ce compte n\'est pas admin.</p></div>'; return; }
    if (!data) load();
  }
  A.ready.then(gate);
  A.on(function (st) { if (!st.user || !st.profile || !st.profile.admin) gate(st); else if (!data) load(); });
})();
