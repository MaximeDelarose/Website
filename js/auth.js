/* =========================================================================
   Compte du site : une seule connexion (Google, via Supabase Auth) pour
   tous les jeux. La bibliothèque Supabase n'est chargée que si quelqu'un
   est déjà connecté ou clique sur « Se connecter ».

   API (window.SiteAuth) :
     SiteAuth.ready            → Promise<{ user, profile }> (premier état connu)
     SiteAuth.user / .profile  → état courant (null si déconnecté)
     SiteAuth.on(fn)           → fn({ user, profile }) à chaque changement
     SiteAuth.signIn()         → redirection vers Google puis retour ici
     SiteAuth.signOut()
     SiteAuth.rpc(nom, args)   → appelle une fonction serveur (Promise)
     SiteAuth.client()         → Promise<client Supabase> (Realtime, etc.)
     SiteAuth.setPseudo(p) / SiteAuth.deleteAccount()
   ========================================================================= */
(function () {
  "use strict";
  var cfg = (window.SITE || {}).supabase || {};
  var LIB = "js/vendor/supabase-2.45.4.min.js";
  var ref = (/https:\/\/([a-z0-9]+)\./.exec(cfg.url || "") || [])[1] || "";
  var TOKEN_KEY = "sb-" + ref + "-auth-token";
  var ERRORS = {
    not_logged_in: "Connecte-toi d'abord.",
    invalid_pseudo: "Pseudo invalide : 2 à 20 caractères (lettres, chiffres, espace, _ - .).",
    not_enough_gold: "Pas assez de glands d'or.",
    not_enough_copies: "Pas assez d'exemplaires.",
    rate_limited: "Trop de parties d'un coup, réessaie dans un moment.",
  };

  var listeners = [], client = null, libPromise = null, resolveReady;
  var A = window.SiteAuth = {
    user: null, profile: null,
    ready: new Promise(function (r) { resolveReady = r; }),
    on: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },
    message: function (err) { var m = err && (err.message || err); return ERRORS[m] || "Le serveur ne répond pas, réessaie dans un moment."; },
  };
  function emit() { listeners.slice().forEach(function (fn) { try { fn({ user: A.user, profile: A.profile }); } catch (e) {} }); syncHeader(); }

  function loadLib() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    if (libPromise) return libPromise;
    libPromise = new Promise(function (ok, ko) {
      var s = document.createElement("script"); s.src = LIB; s.onload = ok; s.onerror = function () { libPromise = null; ko(new Error("lib")); };
      document.head.appendChild(s);
    });
    return libPromise;
  }
  A.client = function () {
    if (client) return Promise.resolve(client);
    if (!cfg.url || !cfg.key) return Promise.reject(new Error("not_configured"));
    return loadLib().then(function () {
      if (client) return client;
      client = window.supabase.createClient(cfg.url, cfg.key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
        realtime: { params: { eventsPerSecond: 30 } },
      });
      client.auth.onAuthStateChange(function (ev, session) {
        var u = session ? session.user : null;
        if ((u && u.id) === (A.user && A.user.id)) return;
        A.user = u; A.profile = null;
        if (u) refreshProfile(); else emit();
      });
      return client;
    });
  };
  A.rpc = function (fn, args) {
    return A.client().then(function (c) { return c.rpc(fn, args || {}); }).then(function (res) {
      if (res.error) throw new Error(res.error.message);
      return res.data;
    });
  };
  function refreshProfile() {
    return A.rpc("acct_me").then(function (p) { A.profile = p; emit(); return p; }).catch(function () { emit(); });
  }
  A.signIn = function () {
    return A.client().then(function (c) {
      var back = location.href.replace(/[?&]code=[^&#]*/, "");
      return c.auth.signInWithOAuth({ provider: "google", options: { redirectTo: back } });
    });
  };
  A.signOut = function () {
    return A.client().then(function (c) { return c.auth.signOut(); }).then(function () { A.user = null; A.profile = null; emit(); });
  };
  A.setPseudo = function (p) { return A.rpc("acct_set_pseudo", { p_pseudo: p }).then(function (pr) { A.profile = pr; emit(); return pr; }); };
  A.deleteAccount = function () {
    return A.rpc("acct_delete").then(function () { return A.client(); }).then(function (c) { return c.auth.signOut({ scope: "local" }); })
      .then(function () { A.user = null; A.profile = null; emit(); });
  };

  // ---------- démarrage : connecté ? (sans charger la bibliothèque sinon) ----------
  var hasToken = false;
  try { hasToken = !!localStorage.getItem(TOKEN_KEY); } catch (e) {}
  var returning = /[?&]code=/.test(location.search);
  // au chargement complet de la page : les pages de jeu chargent déjà la bibliothèque, inutile de la charger deux fois
  function start() {
  if (hasToken || returning) {
    A.client().then(function (c) { return c.auth.getSession(); }).then(function (res) {
      var s = res && res.data && res.data.session;
      A.user = s ? s.user : null;
      if (returning) { try { history.replaceState(null, "", location.href.replace(/([?&])code=[^&#]*&?/, "$1").replace(/[?&]$/, "")); } catch (e) {} }
      return A.user ? refreshProfile() : emit();
    }).catch(function () { emit(); }).then(function () { resolveReady({ user: A.user, profile: A.profile }); });
  } else {
    resolveReady({ user: null, profile: null });
    setTimeout(syncHeader, 0);
  }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();

  // ---------- en-tête : bouton « compte » sur toutes les pages ----------
  var ICON = '<svg viewBox="0 0 12 12" aria-hidden="true"><g fill="currentColor"><rect x="4" y="1" width="4" height="1"/><rect x="3" y="2" width="6" height="4"/><rect x="4" y="6" width="4" height="1"/><rect x="2" y="8" width="8" height="1"/><rect x="1" y="9" width="10" height="2"/></g></svg>';
  function syncHeader() {
    var inner = document.querySelector(".header-inner");
    if (!inner) return;
    var btn = inner.querySelector("[data-account-btn]");
    if (!btn) {
      btn = document.createElement("a");
      btn.className = "icon-btn account-btn"; btn.href = "compte.html"; btn.setAttribute("data-account-btn", "");
      var theme = inner.querySelector("[data-theme-toggle]");
      inner.insertBefore(btn, theme || null);
    }
    var name = A.profile && A.profile.pseudo || (A.user && ((A.user.user_metadata || {}).name || "")) || "";
    if (A.user) {
      btn.innerHTML = '<span class="account-initial">' + (name ? name.trim().charAt(0).toUpperCase() : "✓") + "</span>";
      btn.title = "Mon compte" + (name ? " (" + name + ")" : ""); btn.setAttribute("aria-label", btn.title); btn.classList.add("is-on");
    } else {
      btn.innerHTML = ICON; btn.title = "Se connecter"; btn.setAttribute("aria-label", "Se connecter"); btn.classList.remove("is-on");
    }
    if (document.body.dataset.page === "account") btn.setAttribute("aria-current", "page");
    // pied de page : liens compte et confidentialité
    var foot = document.querySelector(".footer-brand > div");
    if (foot && !foot.querySelector("[data-legal]")) {
      var p = document.createElement("p"); p.className = "footer-small"; p.setAttribute("data-legal", "");
      p.innerHTML = '<a href="compte.html">Mon compte</a> · <a href="confidentialite.html">Confidentialité</a>';
      foot.appendChild(p);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", syncHeader); else syncHeader();
})();
