/* Service worker : jeu utilisable hors ligne après la première ouverture.
   Les fichiers du coffre sont chiffrés et nommés d'après leur contenu : on peut les garder en cache. */
const CACHE = "radia-__BUILD__";
const FRESH = /\/(index\.html|loader\.js|manifest\.webmanifest|vault\/meta\.json)?(\?.*)?$/;
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("radia-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  const scope = new URL(self.registration.scope).pathname;
  if (!url.pathname.startsWith(scope)) return;
  const rel = url.pathname.slice(scope.length - 1);
  if (FRESH.test(rel)) {
    // réseau d'abord (mises à jour), cache en secours (hors ligne)
    e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
    if (r.ok) { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); }
    return r;
  })));
});
