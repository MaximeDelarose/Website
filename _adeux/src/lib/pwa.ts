import { create } from 'zustand'

declare const __BUILD_ID__: string
declare const __APP_VERSION__: string
export const BUILD_ID = __BUILD_ID__
export const APP_VERSION = __APP_VERSION__

interface PWA {
  updateReady: boolean
  reason: 'sw' | 'version' | null
  latest: string | null
  applying: boolean
  lastCheck: number
}
export const usePWA = create<PWA>(() => ({ updateReady: false, reason: null, latest: null, applying: false, lastCheck: 0 }))

let reg: ServiceWorkerRegistration | undefined
let reloading = false

const markReady = (reason: 'sw' | 'version', latest?: string) => usePWA.setState((s) => ({ updateReady: true, reason: s.reason === 'sw' ? 'sw' : reason, latest: latest ?? s.latest }))

/** Compare l'identifiant de build embarqué à celui publié (version.json, jamais mis en cache). */
export async function fetchLatestBuild(): Promise<{ build: string; version: string } | null> {
  try {
    const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store', credentials: 'same-origin' })
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return null
    const j = await r.json()
    return j && j.app === 'adeux' ? { build: String(j.build), version: String(j.version) } : null
  } catch { return null }
}

export async function checkForUpdate(): Promise<boolean> {
  usePWA.setState({ lastCheck: Date.now() })
  try { await reg?.update() } catch { /* hors ligne */ }
  const latest = await fetchLatestBuild()
  if (latest && latest.build !== BUILD_ID) markReady('version', latest.build)
  return usePWA.getState().updateReady
}

function watch(r: ServiceWorkerRegistration) {
  const onInstalled = (sw: ServiceWorker) => {
    sw.addEventListener('statechange', () => {
      // Une version est prête (téléchargée) et attend : on ne l'active pas sans l'accord de la personne.
      if (sw.state === 'installed' && navigator.serviceWorker.controller) markReady('sw')
    })
  }
  if (r.waiting && navigator.serviceWorker.controller) markReady('sw')
  if (r.installing) onInstalled(r.installing)
  r.addEventListener('updatefound', () => r.installing && onInstalled(r.installing))
}

export function registerSW() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return
  navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' }).then((r) => {
    reg = r
    watch(r)
    void checkForUpdate()
  }).catch(() => { /* échec silencieux : l'app fonctionne sans SW */ })

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !usePWA.getState().applying) return
    reloading = true
    location.reload()
  })
  // Vérification au retour dans l'application, au retour du réseau, puis toutes les 30 min.
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void checkForUpdate() })
  window.addEventListener('online', () => void checkForUpdate())
  setInterval(() => void checkForUpdate(), 30 * 60 * 1000)
}

/** Applique la mise à jour (rechargement propre). Retourne false si l'app est occupée. */
export async function applyUpdate(busy: number): Promise<boolean> {
  if (busy > 0) return false
  usePWA.setState({ applying: true })
  const waiting = reg?.waiting
  if (waiting) {
    waiting.postMessage({ type: 'SKIP_WAITING' })
    // Filet de sécurité si controllerchange n'arrive pas.
    setTimeout(() => { if (!reloading) { reloading = true; location.reload() } }, 2500)
    return true
  }
  try { await reg?.update() } catch { /* ignoré */ }
  if (reg?.waiting) { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); setTimeout(() => { if (!reloading) { reloading = true; location.reload() } }, 2500); return true }
  reloading = true
  location.reload()
  return true
}
