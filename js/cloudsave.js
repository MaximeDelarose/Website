/* =========================================================================
   Sauvegarde en ligne des jeux (compte du site, js/auth.js)
   Synchronise la sauvegarde localStorage d'un jeu avec le serveur, sans rien
   changer au code du jeu. À charger AVANT le script du jeu :
     <script src="js/cloudsave.js" data-game="grand-chene" data-key="idle-chene-v1"></script>
     <script src="js/cloudsave.js" data-game="merger" data-prefix="merger-best-"></script>
   - Connecté : la sauvegarde du compte remplace celle du navigateur (la page
     se recharge une fois si besoin), puis chaque progrès est envoyé au serveur
     (toutes les 20 s et quand on quitte la page).
   - Le serveur refuse les sauvegardes impossibles (gs_guard) : on revient alors
     à la dernière sauvegarde valide du compte.
   - Invité : rien ne change, tout reste dans le navigateur.
   ========================================================================= */
(function () {
  "use strict";
  var me = document.currentScript;
  var GAME = me && me.getAttribute("data-game"), KEY = me && me.getAttribute("data-key"), PREFIX = me && me.getAttribute("data-prefix");
  if (!GAME || (!KEY && !PREFIX)) return;
  if (/^#party/.test(location.hash)) return;   // manche de party (js/party.js) : partie temporaire, on ne synchronise rien
  var META = "cs-meta-" + GAME, NOTE = "cs-note-" + GAME, PENDING = "cs-pending-" + GAME;
  var REASONS = {
    conflict: "ta progression a avancé sur un autre appareil : c'est celle-ci qui est reprise.",
    gold_too_fast: "trop de glands gagnés d'un coup.", gold_not_earned: "des glands qui n'ont pas été gagnés en jouant.",
    rank_too_fast: "un rang qui monte trop vite.", ppts_without_prestige: "des points de prestige sans prestige.",
    clock_in_future: "l'horloge de l'appareil est dans le futur.", clock_skip: "un saut dans le temps.",
    acorns_not_earned: "des glands qui n'ont pas été récoltés.", import_too_big: "une progression trop grande pour être reprise.",
  };

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
  function readLocal() {
    if (KEY) { var raw = ls(KEY); if (!raw) return null; try { var o = JSON.parse(raw); return o && typeof o === "object" ? o : null; } catch (e) { return null; } }
    var out = {}, n = 0;
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(PREFIX) === 0) { out[k] = localStorage.getItem(k); n++; } } } catch (e) {}
    return n ? out : null;
  }
  function writeLocal(data) {
    if (KEY) { ls(KEY, data ? JSON.stringify(data) : null); return; }
    var old = readLocal() || {};
    Object.keys(old).forEach(function (k) { if (!data || !(k in data)) ls(k, null); });
    if (data) Object.keys(data).forEach(function (k) { if (k.indexOf(PREFIX) === 0) ls(k, String(data[k])); });
  }
  function hash(o) {
    var s = o ? JSON.stringify(o) : "", h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return s.length + ":" + h;
  }
  function getMeta() { try { return JSON.parse(ls(META) || "null"); } catch (e) { return null; } }
  function setMeta(m) { ls(META, m ? JSON.stringify(m) : null); }
  function toast(text) {
    var el = document.createElement("div");
    el.className = "cs-toast"; el.setAttribute("role", "status"); el.textContent = text;
    document.body.appendChild(el);
    setTimeout(function () { el.classList.add("out"); }, 6000);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 6800);
  }
  // remplace la sauvegarde du navigateur par celle du compte, puis recharge : le jeu a déjà l'ancienne en mémoire
  // (et peut la réécrire en quittant la page), donc la sauvegarde du compte est appliquée au chargement suivant,
  // avant le démarrage du jeu (voir « sauvegarde du compte en attente » plus bas).
  function adopt(server, uid, note) {
    var local = readLocal();
    if (local && hash(local) !== hash(server.data)) ls("cs-backup-" + GAME, JSON.stringify({ at: Date.now(), data: local }));
    stopped = true;
    if (note) ls(NOTE, note);
    var guard = "cs-reloaded-" + GAME;
    try {
      if (sessionStorage.getItem(guard) === String(server.rev)) { writeLocal(server.data); setMeta({ uid: uid, rev: server.rev, hash: hash(server.data) }); return; }
      sessionStorage.setItem(guard, String(server.rev));
      sessionStorage.setItem(PENDING, JSON.stringify({ uid: uid, rev: server.rev, data: server.data }));
    } catch (e) { writeLocal(server.data); setMeta({ uid: uid, rev: server.rev, hash: hash(server.data) }); }
    location.reload();
  }

  // sauvegarde du compte en attente : appliquée maintenant, avant que le script du jeu ne la lise
  try {
    var pend = JSON.parse(sessionStorage.getItem(PENDING) || "null");
    if (pend) { sessionStorage.removeItem(PENDING); writeLocal(pend.data); setMeta({ uid: pend.uid, rev: pend.rev, hash: hash(pend.data) }); }
  } catch (e) {}

  var A = null, uid = null, busy = false, stopped = false, timer = null;
  function push(data, rev, cb) {
    if (busy || stopped) return;
    busy = true;
    A.rpc("gs_save", { p_game: GAME, p_data: data, p_rev: rev }).then(function (res) {
      busy = false;
      if (res.ok) { setMeta({ uid: uid, rev: res.rev, hash: hash(data) }); if (cb) cb(true); return; }
      if (res.reason === "too_fast") return;
      if (res.reason === "import_too_big" && !res.data) { setMeta({ uid: uid, rev: 0, hash: "refus" }); toast("☁ Ta progression de ce navigateur n'a pas pu être liée à ton compte : " + REASONS.import_too_big); stopped = true; return; }
      adopt({ data: res.data, rev: res.rev }, uid, "☁ Sauvegarde refusée par le serveur (" + (REASONS[res.reason] || res.reason) + ") Retour à ta dernière sauvegarde valide.");
    }).catch(function () { busy = false; });
  }
  function tick() {
    if (!uid || stopped) return;
    var m = getMeta(), local = readLocal();
    if (!m || m.uid !== uid || !local) return;
    if (hash(local) !== m.hash) push(local, m.rev);
  }
  function start(st) {
    if (!st || !st.user) { uid = null; return; }
    if (uid === st.user.id) return;
    uid = st.user.id;
    A.rpc("gs_load", { p_game: GAME }).then(function (server) {
      var local = readLocal(), lh = hash(local), m = getMeta();
      if (m && m.uid !== uid) m = null;
      if (!server) {
        // premier passage avec ce compte : la progression du navigateur devient celle du compte
        if (local) push(local, 0, function () { toast("☁ Ta progression est maintenant liée à ton compte."); });
        else setMeta({ uid: uid, rev: 0, hash: "vide" }); // rien encore : la première sauvegarde du jeu partira au prochain passage
      } else if (m && m.rev === server.rev && lh !== m.hash && local) {
        push(local, server.rev); // progrès faits ici depuis la dernière synchro
      } else if (lh !== hash(server.data)) {
        adopt(server, uid, "☁ Progression de ton compte chargée.");
        return;
      } else setMeta({ uid: uid, rev: server.rev, hash: lh });
      if (!timer) {
        timer = setInterval(tick, 20000);
        document.addEventListener("visibilitychange", function () { if (document.hidden) tick(); });
        window.addEventListener("pagehide", tick);
      }
    }).catch(function () {});
  }

  function boot() {
    var note = ls(NOTE);
    if (note) { ls(NOTE, null); setTimeout(function () { toast(note); }, 300); }
    A = window.SiteAuth;
    if (!A) return;
    A.ready.then(start);
    A.on(start);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
