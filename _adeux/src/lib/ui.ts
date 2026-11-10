import { create } from 'zustand'

export type Tab = 'home' | 'encounter' | 'activities' | 'messages' | 'profile'
export type Overlay =
  | { name: 'intro' }
  | { name: 'onboarding' }
  | { name: 'proposal' }
  | { name: 'game'; kind: 'mirror' | 'compass' | 'bridge' }
  | { name: 'moment' }
  | { name: 'call' }
  | { name: 'consent' }
  | { name: 'reveal' }
  | { name: 'recap' }
  | { name: 'world' }

export interface ToastMsg { id: number; text: string; tone?: 'ok' | 'info' }

interface UI {
  tab: Tab
  overlays: Overlay[]
  /** Nombre d'actions importantes en cours (jeu, appel, enregistrement, révélation). */
  busy: number
  toasts: ToastMsg[]
  setTab: (t: Tab) => void
  open: (o: Overlay) => void
  close: () => void
  replace: (o: Overlay | null) => void
  toast: (text: string, tone?: ToastMsg['tone']) => void
  dismissToast: (id: number) => void
  addBusy: () => void
  subBusy: () => void
}
let tid = 1
let skipPop = 0
export const useUI = create<UI>((set, get) => ({
  tab: 'home',
  overlays: [],
  busy: 0,
  toasts: [],
  setTab: (tab) => set({ tab }),
  open: (o) => {
    try { history.pushState({ adeux: get().overlays.length + 1 }, '') } catch { /* ignoré */ }
    set({ overlays: [...get().overlays, o] })
  },
  close: () => {
    if (!get().overlays.length) return
    set({ overlays: get().overlays.slice(0, -1) })
    try { if (history.state?.adeux) { skipPop++; history.back() } } catch { /* ignoré */ }
  },
  replace: (o) => {
    if (!o) return get().close()
    set({ overlays: [...get().overlays.slice(0, -1), o] })
  },
  toast: (text, tone = 'info') => {
    const id = tid++
    set({ toasts: [...get().toasts, { id, text, tone }] })
    setTimeout(() => get().dismissToast(id), 3800)
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  addBusy: () => set({ busy: get().busy + 1 }),
  subBusy: () => set({ busy: Math.max(0, get().busy - 1) }),
}))

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (skipPop > 0) { skipPop--; return }
    const { overlays } = useUI.getState()
    if (overlays.length) useUI.setState({ overlays: overlays.slice(0, -1) })
  })
}
