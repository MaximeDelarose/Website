/* À DEUX — service worker.  Généré par scripts/postbuild.mjs : ne pas éditer dist/sw.js à la main.
 * Stratégie de mise à jour :
 *  - chaque build a un identifiant (BUILD) ; le cache de ressources porte ce nom : adeux-static-<BUILD>
 *  - un nouveau SW se télécharge puis ATTEND ; il ne s'active que sur demande de l'app (message SKIP_WAITING)
 *    afin de ne jamais recharger brutalement pendant un jeu, un appel ou un enregistrement
 *  - à l'activation, tous les anciens caches « adeux-* » sont supprimés (aucune ancienne version bloquée)
 *  - les navigations passent d'abord par le réseau : un redéploiement est vu dès la prochaine ouverture
 *  - uniquement des ressources de CETTE application (préfixe « adeux- ») : aucun autre cache n'est touché
 */
const BUILD = '__BUILD__'
const PRECACHE = __PRECACHE__
const STATIC = 'adeux-static-' + BUILD
const RUNTIME = 'adeux-runtime-v1'
const SHELL = '/index.html'

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC)
    await Promise.all(PRECACHE.map(async (url) => {
      const res = await fetch(url, { cache: 'reload', credentials: 'same-origin' })
      if (!res.ok) throw new Error('precache ' + url + ' ' + res.status)
      await cache.put(url, res)
    }))
    // Première installation : rien à protéger, on s'active tout de suite.
    if (!self.registration.active) self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('adeux-') && k !== STATIC && k !== RUNTIME) await caches.delete(k)
    await self.clients.claim()
  })())
})

self.addEventListener('message', (event) => {
  const t = event.data && event.data.type
  if (t === 'SKIP_WAITING') self.skipWaiting()
  if (t === 'GET_BUILD' && event.source) event.source.postMessage({ type: 'BUILD', build: BUILD })
})

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))])

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return
  if (url.pathname === '/version.json' || url.pathname === '/sw.js' || url.pathname.startsWith('/__')) return // toujours le réseau

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await withTimeout(fetch(req), 4000)
        if (res.ok && (res.headers.get('content-type') || '').includes('text/html')) {
          const c = await caches.open(STATIC); await c.put(SHELL, res.clone())
        }
        return res // y compris un 401 de la porte d'accès : on l'affiche tel quel
      } catch {
        return (await caches.match(SHELL)) || Response.error()
      }
    })())
    return
  }

  if (url.pathname.startsWith('/assets/')) { // fichiers à empreinte : cache d'abord
    event.respondWith((async () => {
      const hit = await caches.match(req)
      if (hit) return hit
      const res = await fetch(req)
      if (res.ok) (await caches.open(RUNTIME)).put(req, res.clone())
      return res
    })())
    return
  }

  event.respondWith((async () => { // le reste : stale-while-revalidate
    const hit = await caches.match(req)
    const net = fetch(req).then(async (res) => { if (res.ok) (await caches.open(RUNTIME)).put(req, res.clone()); return res }).catch(() => hit)
    return hit || net
  })())
})
