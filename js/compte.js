/* =========================================================================
   Page « Mon compte » : connexion Google, pseudo, données des jeux,
   export et suppression du compte.
   ========================================================================= */
(function () {
  "use strict";
  var box = document.querySelector("[data-account]");
  if (!box || !window.SiteAuth) return;
  var A = window.SiteAuth;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var msg = "", game = null;

  function render() {
    if (!A.user) {
      box.innerHTML =
        "<h2>Se connecter</h2>" +
        "<p>Le compte est <strong>facultatif</strong> : tu peux jouer à tout sans lui. Il sert à garder ta progression sur le serveur (à l'abri de la triche), à la retrouver sur tous tes appareils et à jouer en ligne. Un seul compte pour tous les jeux du site.</p>" +
        '<p><button class="btn" type="button" data-act="login">' + googleIcon() + " Se connecter avec Google</button></p>" +
        (msg ? '<p class="account-msg">' + esc(msg) + "</p>" : "") +
        '<p class="footer-small">Seuls ton identifiant, ton email et ta progression sont gardés : rien de vendu, aucune publicité, aucun traceur. Détails : <a href="confidentialite.html">confidentialité</a>.</p>';
      return;
    }
    var p = A.profile || {}, email = A.user.email || "";
    box.innerHTML =
      '<div class="account-head"><span class="account-avatar">' + esc((p.pseudo || "?").charAt(0).toUpperCase()) + "</span><div><strong>" + esc(p.pseudo || "Pas encore de pseudo") + "</strong>" +
      "<small>Connecté" + (((A.user.app_metadata || {}).provider || "google") === "google" ? " avec Google" : "") + (email ? " · " + esc(email) : "") + "</small></div></div>" +
      '<form class="account-form" data-pseudo><label for="acc-pseudo">Pseudo (visible par les autres joueurs)</label><div class="submit-row">' +
      '<input id="acc-pseudo" type="text" maxlength="20" required value="' + esc(p.pseudo || "") + '"><button class="btn btn-alt btn-small" type="submit">Enregistrer</button></div></form>' +
      (msg ? '<p class="account-msg">' + esc(msg) + "</p>" : "") +
      "<h2>Tes jeux</h2>" + gamesHtml() +
      "<h2>Tes données</h2>" +
      "<p>Gardé sur le serveur : ton identifiant de compte, ton email (seulement pour la connexion), ton pseudo et ta progression. <a href=\"confidentialite.html\">En savoir plus</a>.</p>" +
      '<div class="btn-row"><button class="btn btn-ghost btn-small" type="button" data-act="export">⬇ Télécharger mes données</button>' +
      '<button class="btn btn-ghost btn-small" type="button" data-act="logout">Se déconnecter</button></div>' +
      '<details class="account-danger"><summary>Supprimer mon compte</summary>' +
      "<p>Ton compte, ton pseudo et toute ta progression dans tous les jeux seront effacés <strong>immédiatement et définitivement</strong>.</p>" +
      '<button class="btn btn-small account-delete" type="button" data-act="delete">Supprimer définitivement</button></details>';
  }
  function gamesHtml() {
    if (game === null) return '<p class="footer-small">Chargement…</p>';
    if (!game) return '<p class="footer-small">Pas encore de progression enregistrée. Lance <a href="dice.html">Écureuil Dice</a> connecté pour commencer.</p>';
    var have = 0; Object.keys(game.have || {}).forEach(function () { have++; });
    return '<ul class="account-games"><li><a href="dice.html"><strong>Écureuil Dice</strong></a><span>' + game.gold + " glands d'or · " + game.games + " parties · record solo : vague " + game.best_solo + " · " + game.chests + " coffres ouverts</span></li></ul>" +
      '<p class="footer-small">Les autres jeux du site garderont aussi leur progression sur ce compte au fur et à mesure de leurs mises à jour.</p>';
  }
  function googleIcon() {
    return '<svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true" style="vertical-align:-3px"><path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.7H9v3.3h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z"/><path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.7H.9v2.3A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.9 10.8a5.4 5.4 0 0 1 0-3.5V5H.9a9 9 0 0 0 0 8.1l3-2.3z"/><path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.5 1.4l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z"/></svg>';
  }
  function loadGame() {
    if (!A.user) { game = null; render(); return; }
    A.client().then(function (c) { return c.from("rd_profiles").select("*").maybeSingle(); }).then(function (res) {
      game = res && res.data ? res.data : false; render();
    }).catch(function () { game = false; render(); });
  }
  box.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    var act = b.getAttribute("data-act");
    if (act === "login") { b.disabled = true; A.signIn().catch(function (err) { msg = A.message(err); b.disabled = false; render(); }); }
    if (act === "logout") A.signOut();
    if (act === "export") exportData();
    if (act === "delete") {
      if (!window.confirm("Supprimer ton compte et toute ta progression ? C'est définitif.")) return;
      b.disabled = true;
      A.deleteAccount().then(function () { msg = "Ton compte et toutes ses données ont été supprimés."; game = null; render(); })
        .catch(function (err) { msg = A.message(err); b.disabled = false; render(); });
    }
  });
  box.addEventListener("submit", function (e) {
    var f = e.target.closest("[data-pseudo]"); if (!f) return;
    e.preventDefault();
    A.setPseudo(f.querySelector("input").value).then(function () { msg = "Pseudo enregistré."; render(); })
      .catch(function (err) { msg = A.message(err); render(); });
  });
  function exportData() {
    A.client().then(function (c) {
      return Promise.all([c.from("profiles").select("*").maybeSingle(), c.from("rd_profiles").select("*").maybeSingle()]);
    }).then(function (r) {
      var data = { compte: { id: A.user.id, email: A.user.email, fournisseur: "google", cree_le: A.user.created_at }, profil: r[0].data, ecureuil_dice: r[1].data, exporte_le: new Date().toISOString() };
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "mes-donnees-akarisumd.json";
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }).catch(function (err) { msg = A.message(err); render(); });
  }
  A.on(function () { loadGame(); });
  A.ready.then(function () { render(); loadGame(); });
})();
