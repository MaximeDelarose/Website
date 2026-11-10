/* =========================================================================
   Page Golf : onglets « Mini-golf » / « Golfaventure ».
   Une seule page (golf.html) ; le jeu non choisi reste caché et ne calcule rien
   (ses boucles s'arrêtent quand sa zone est masquée). Le choix est mémorisé.
   ========================================================================= */
(function () {
  "use strict";
  var KEY = "golf-mode";
  var tabs = document.querySelectorAll("[data-gmode]");
  var golf = document.querySelector("[data-golf]");
  var ga = document.querySelector("[data-ga]");
  if (!tabs.length || !golf || !ga) return;

  function set(m) {
    if (m !== "ga") m = "golf";
    golf.hidden = m !== "golf";
    ga.hidden = m !== "ga";
    tabs.forEach(function (t) {
      var on = t.getAttribute("data-gmode") === m;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.classList.toggle("is-on", on);
    });
    document.querySelectorAll("[data-help]").forEach(function (h) { h.hidden = h.getAttribute("data-help") !== m; });
    document.querySelectorAll("[data-golf-menu]").forEach(function (b) { b.hidden = m !== "golf"; });
    document.querySelectorAll("[data-ga-menu]").forEach(function (b) { b.hidden = m !== "ga"; });
    try { localStorage.setItem(KEY, m); } catch (e) {}
    // les deux jeux se dimensionnent sur la fenêtre : on les prévient
    window.dispatchEvent(new Event("resize"));
  }

  tabs.forEach(function (t) {
    t.addEventListener("click", function () { set(t.getAttribute("data-gmode")); });
  });

  var saved = "golf";
  try { saved = localStorage.getItem(KEY) || "golf"; } catch (e) {}
  set(saved);
})();
