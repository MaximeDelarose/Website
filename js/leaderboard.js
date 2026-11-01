/* =========================================================================
   AkaBox Leaderboard — client JavaScript (site web ou jeu web)
   Config : SITE.supabase = { url, key } dans js/data.js
   (key = clé PUBLIQUE « publishable » / « anon », jamais la clé secrète)

   API :
     Leaderboard.configured()                       → true/false
     Leaderboard.top("chaaat", 10)                  → Promise<[{rank, player, score, meta, created_at}]>
     Leaderboard.submit("chaaat", "Maxime", 1234, {level: 3})
                                                    → Promise<{ok, player, score, rank}>
     Leaderboard.render(element)                    → affiche un classement dans l'élément

   Widget HTML automatique :
     <div data-leaderboard="chaaat" data-limit="10"></div>
   ========================================================================= */
(function () {
  "use strict";

  var ERRORS = {
    unknown_game: "Ce jeu n'a pas de classement.",
    invalid_player: "Pseudo invalide (2 à 20 caractères : lettres, chiffres, espace, _ - .).",
    invalid_score: "Score invalide.",
    rate_limited: "Trop d'envois d'un coup, réessaie dans un moment.",
    not_configured: "Classement pas encore configuré.",
  };

  function config() {
    var s = (window.SITE || {}).supabase || {};
    return s.url && s.key ? s : null;
  }

  function call(fn, body) {
    var c = config();
    if (!c) return Promise.reject(new Error("not_configured"));
    var headers = { "Content-Type": "application/json", apikey: c.key };
    // Ancienne clé « anon » (JWT) : il faut aussi l'en-tête Authorization.
    if (!/^sb_/.test(c.key)) headers.Authorization = "Bearer " + c.key;
    return fetch(c.url.replace(/\/+$/, "") + "/rest/v1/rpc/" + fn, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (j) {
        if (!r.ok) throw new Error((j && j.message) || "HTTP " + r.status);
        return j;
      });
    });
  }

  function message(err) {
    var code = err && err.message;
    return ERRORS[code] || "Classement indisponible pour le moment.";
  }

  function top(game, limit) {
    return call("lb_top", { p_game: game, p_limit: limit || 10 });
  }

  function submit(game, player, score, meta) {
    return call("lb_submit", { p_game: game, p_player: player, p_score: score, p_meta: meta || {} });
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function formatScore(n) {
    var x = Number(n);
    return isFinite(x) ? x.toLocaleString("fr-FR") : esc(n);
  }

  function render(el) {
    var game = el.getAttribute("data-leaderboard");
    var limit = Number(el.getAttribute("data-limit")) || 10;
    if (!game || !config()) { el.hidden = true; return Promise.resolve(); }
    el.setAttribute("data-lb-rendered", "");
    el.hidden = false;
    el.classList.add("leaderboard");
    var title = el.getAttribute("data-title") || "Classement";
    el.innerHTML = '<h3 class="lb-title">🏆 ' + esc(title) + '</h3><p class="lb-state">Chargement…</p>';
    return top(game, limit).then(function (rows) {
      if (!rows || !rows.length) {
        el.innerHTML = '<h3 class="lb-title">🏆 ' + esc(title) + '</h3><p class="lb-state">Aucun score pour l\'instant. À toi de jouer !</p>';
        return;
      }
      var html = '<h3 class="lb-title">🏆 ' + esc(title) + '</h3><ol class="lb-list">';
      rows.forEach(function (r) {
        html += '<li class="lb-row' + (r.rank <= 3 ? " lb-top" + r.rank : "") + '">' +
          '<span class="lb-rank">' + esc(r.rank) + "</span>" +
          '<span class="lb-player">' + esc(r.player) + "</span>" +
          '<span class="lb-score">' + formatScore(r.score) + "</span></li>";
      });
      el.innerHTML = html + "</ol>";
    }).catch(function (err) {
      el.innerHTML = '<h3 class="lb-title">🏆 ' + esc(title) + '</h3><p class="lb-state">' + esc(message(err)) + "</p>";
    });
  }

  function renderAll(scope) {
    Array.prototype.forEach.call((scope || document).querySelectorAll("[data-leaderboard]"), function (el) {
      if (el.getAttribute("data-leaderboard") && !el.hasAttribute("data-lb-rendered")) render(el);
    });
  }

  window.Leaderboard = {
    configured: function () { return !!config(); },
    top: top,
    submit: submit,
    render: render,
    renderAll: renderAll,
    message: message,
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { renderAll(); });
  else renderAll();
})();
