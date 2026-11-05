/* Écureuil Survivor : service worker minimal.
   Réseau d'abord (le jeu est toujours à jour), cache en secours hors ligne. Supabase, Google et les autres domaines ne passent pas par ici. */
var CACHE = "es-pwa-2";
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(fetch(req).then(function (res) {
    if (res && res.ok && res.type === "basic") { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); }
    return res;
  }).catch(function () {
    return caches.match(req).then(function (m) { return m || caches.match(req, { ignoreSearch: true }); }).then(function (m) { return m || (req.mode === "navigate" ? caches.match("jeu.html", { ignoreSearch: true }) : Response.error()); });
  }));
});
