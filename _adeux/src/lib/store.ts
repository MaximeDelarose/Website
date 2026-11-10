import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Answer, Answers, DemoPartner, Encounter, Profile } from './types'
import { dayKey, uid } from './util'
import { DEMO_PARTNERS, getDemoPartner } from './demoPartners'
import { pickCandidate, toCandidate } from './matching'
import * as J from './journey'
import { type BridgeState, type CompassState, type GameLogEntry, type MirrorState, demoCompassAnswer, demoMirrorAnswer, newBridge, newCompass, newMirror, demoBridgeProgress } from './games'
import { MOMENTS, QUESTIONS } from './content'
import { seeded } from './util'
import { sfx } from './audio'

export const STORE_KEY = 'adeux:store'
export const STORE_VERSION = 3

export interface Message { id: string; from: 'me' | 'partner' | 'system'; kind: 'text' | 'voice'; text?: string; voiceKey?: string; at: number }
export interface Memory { id: string; text: string; at: number }
export interface Plan { id: string; idea: string; when: string; state: 'proposed' | 'accepted' | 'declined'; at: number }
export interface MomentEntry { mine?: string; theirs?: string; skipped?: boolean }
export interface Privacy { showExactAge: boolean; shareMemories: boolean; sound: boolean }

export interface Persisted {
  mode: 'demo' | 'real'
  introSeen: boolean
  profile: Profile | null
  answers: Answers
  qIndex: number
  basicsDone: boolean
  onboarded: boolean
  encounter: Encounter | null
  introAnswer: string | null
  excluded: string[]
  blocked: string[]
  reports: { partnerId: string; reason: string; at: number }[]
  dayOffset: number
  lastProposalDay: string | null
  partnerWillAccept: boolean
  games: { mirror: MirrorState | null; compass: CompassState | null; bridge: BridgeState | null; rounds: { mirror: number; compass: number } }
  gameLog: GameLogEntry[]
  moments: Record<string, MomentEntry>
  chat: Message[]
  memories: Memory[]
  plans: Plan[]
  privacy: Privacy
  hasPhoto: boolean
  history: { id: string; partnerId: string; how: 'closed' | 'blocked' | 'declined' | 'revealed'; at: number }[]
}

const initial: Persisted = {
  mode: 'demo', introSeen: false, profile: null, answers: {}, qIndex: 0, basicsDone: false, onboarded: false,
  encounter: null, introAnswer: null, excluded: [], blocked: [], reports: [], dayOffset: 0, lastProposalDay: null,
  partnerWillAccept: true,
  games: { mirror: null, compass: null, bridge: null, rounds: { mirror: 0, compass: 0 } },
  gameLog: [], moments: {}, chat: [], memories: [], plans: [],
  privacy: { showExactAge: false, shareMemories: true, sound: true }, hasPhoto: false, history: [],
}

/** Migrations de données : chaque version fait évoluer la structure sans rien perdre. */
export function migrate(state: unknown, from: number): Persisted {
  const s = { ...(state as Record<string, unknown>) } as Record<string, any>
  if (from < 1) { // v0 : réponses stockées en simple valeur
    if (s.answers) for (const k of Object.keys(s.answers)) if (s.answers[k] === null || typeof s.answers[k] !== 'object') s.answers[k] = { v: s.answers[k] }
  }
  if (from < 2) { // v1 : ajout des mini-jeux et du journal
    s.games = s.games ?? { mirror: null, compass: null, bridge: null, rounds: { mirror: 0, compass: 0 } }
    s.gameLog = s.gameLog ?? []
    s.moments = s.moments ?? {}
  }
  if (from < 3) { // v2 : ajout de l'espace commun
    s.memories = s.memories ?? []; s.plans = s.plans ?? []
    s.privacy = s.privacy ?? { showExactAge: false, shareMemories: true, sound: true }
    s.history = s.history ?? []
  }
  return { ...initial, ...s } as Persisted
}

interface Actions {
  set: (p: Partial<Persisted>) => void
  finishIntro: () => void
  saveProfile: (p: Profile) => void
  answer: (qid: string, a: Answer) => void
  setQIndex: (i: number) => void
  finishOnboarding: () => void
  resetAll: () => void
  now: () => number
  today: () => string
  canProposeToday: () => boolean
  proposeEncounter: () => 'ok' | 'none' | 'limit' | 'busy'
  respondProposal: (accept: boolean) => void
  answerIntro: (text: string) => void
  completeStep: (s: 'intro' | 'activity' | 'voice') => void
  pauseEnc: () => void
  resumeEnc: () => void
  leaveEnc: () => void
  blockEnc: () => void
  reportEnc: (reason: string) => void
  consent: (yes: boolean) => void
  // jeux
  startMirror: () => void
  mirrorAnswer: (opt: string, note: string) => void
  mirrorTick: () => void
  mirrorFlip: () => void
  startCompass: () => void
  compassAnswer: (sid: string, way: string) => void
  compassTick: () => void
  compassFinish: () => void
  startBridge: () => void
  bridgePlace: () => void
  bridgeTick: () => void
  bridgeStone: () => void
  logGame: (kind: GameLogEntry['kind']) => void
  // moment
  answerMoment: (text: string) => void
  skipMoment: () => void
  // chat
  send: (text: string) => void
  sendVoice: (key: string) => void
  addMemory: (t: string) => void
  proposePlan: (idea: string, when: string) => void
  setPrivacy: (p: Partial<Privacy>) => void
  deleteAllData: () => void
}

export const useStore = create<Persisted & Actions>()(
  persist(
    (set, get) => ({
      ...initial,
      set: (p) => set(p),
      now: () => Date.now() + get().dayOffset * 86400000,
      today: () => dayKey(get().dayOffset),
      finishIntro: () => set({ introSeen: true }),
      saveProfile: (p) => set({ profile: p, basicsDone: true, privacy: { ...get().privacy, showExactAge: p.showExactAge } }),
      answer: (qid, a) => set({ answers: { ...get().answers, [qid]: a } }),
      setQIndex: (i) => set({ qIndex: i }),
      finishOnboarding: () => set({ onboarded: true }),
      resetAll: () => set({ ...initial, introSeen: true }),

      canProposeToday: () => get().lastProposalDay !== dayKey(get().dayOffset),
      proposeEncounter: () => {
        const s = get()
        if (!s.profile) return 'none'
        const cur = s.encounter
        if (cur && ['proposed', 'active', 'paused', 'revealed'].includes(cur.status)) return 'busy'
        if (!s.canProposeToday()) return 'limit'
        const me = toCandidate(s.profile, s.answers, 'me', new Date(s.now()))
        const p = pickCandidate(me, DEMO_PARTNERS, [...s.excluded, ...s.blocked])
        set({ lastProposalDay: dayKey(s.dayOffset) })
        if (!p) return 'none'
        set({ encounter: J.newEncounter(uid(), p.id, s.now()), introAnswer: null, chat: [], games: { ...initial.games }, gameLog: [] })
        return 'ok'
      },
      respondProposal: (accept) => {
        const e = get().encounter
        if (!e || e.status !== 'proposed') return
        if (!accept) {
          set({ encounter: { ...e, status: 'declined' as const }, excluded: [...get().excluded, e.partnerId], history: [...get().history, { id: e.id, partnerId: e.partnerId, how: 'declined', at: get().now() }] })
          return
        }
        // Le partenaire fictif accepte aussi (en démo).
        let n = J.acceptProposal(e, 'me'); n = J.acceptProposal(n, 'partner')
        set({ encounter: n })
        if (n.status === 'active') pushSystem(get, set, 'Votre rencontre commence. Prenez votre temps.')
      },
      answerIntro: (text) => {
        const e = get().encounter; if (!e || !J.canInteract(e)) return
        set({ introAnswer: text, encounter: J.complete(e, 'intro') })
      },
      completeStep: (step) => {
        const e = get().encounter; if (!e) return
        set({ encounter: J.complete(e, step) })
      },
      pauseEnc: () => set({ encounter: get().encounter ? J.pause(get().encounter!) : null }),
      resumeEnc: () => set({ encounter: get().encounter ? J.resume(get().encounter!) : null }),
      leaveEnc: () => {
        const e = get().encounter; if (!e) return
        const n = J.leave(e)
        set({ encounter: n, excluded: [...get().excluded, e.partnerId], history: [...get().history, { id: e.id, partnerId: e.partnerId, how: 'closed', at: get().now() }] })
      },
      blockEnc: () => {
        const e = get().encounter; if (!e) return
        set({ encounter: J.block(e), blocked: [...get().blocked, e.partnerId], history: [...get().history, { id: e.id, partnerId: e.partnerId, how: 'blocked', at: get().now() }] })
      },
      reportEnc: (reason) => {
        const e = get().encounter; if (!e) return
        set({ reports: [...get().reports, { partnerId: e.partnerId, reason, at: get().now() }] })
      },
      consent: (yes) => {
        const e = get().encounter; if (!e) return
        // En démo, le partenaire fictif répond selon le réglage de test (par défaut : oui).
        let n = J.submitConsent(e, 'me', yes)
        n = J.submitConsent(n, 'partner', get().partnerWillAccept)
        set({ encounter: n })
        if (n.status === 'revealed') set({ history: [...get().history, { id: n.id, partnerId: n.partnerId, how: 'revealed', at: get().now() }] })
      },

      // ----- Le Miroir -----
      startMirror: () => {
        if (!J.canInteract(get().encounter)) return
        const cur = get().games.mirror
        if (cur && !(cur.flipped)) return
        const g = get().games
        set({ games: { ...g, mirror: newMirror(g.rounds.mirror, get().now()), rounds: { ...g.rounds, mirror: g.rounds.mirror + 1 } } })
      },
      mirrorAnswer: (opt, note) => {
        const s = get(); const m = s.games.mirror; if (!m || !J.canInteract(s.encounter) || m.mine) return
        set({ games: { ...s.games, mirror: { ...m, mine: { opt, note }, dueAt: Date.now() + 2600 } } })
      },
      mirrorTick: () => {
        const s = get(); const m = s.games.mirror; if (!m || !m.mine || m.theirs || !m.dueAt || Date.now() < m.dueAt) return
        if (!J.canInteract(s.encounter)) return
        set({ games: { ...s.games, mirror: { ...m, theirs: demoMirrorAnswer(s.encounter!.partnerId, m.qid) } } })
      },
      mirrorFlip: () => {
        const s = get(); const m = s.games.mirror; if (!m || !m.mine || !m.theirs || m.flipped) return
        set({ games: { ...s.games, mirror: { ...m, flipped: true } } })
        s.logGame('mirror'); s.completeStep('activity')
      },

      // ----- La Boussole -----
      startCompass: () => {
        if (!J.canInteract(get().encounter)) return
        const cur = get().games.compass; if (cur && !cur.done) return
        const g = get().games
        set({ games: { ...g, compass: newCompass(g.rounds.compass), rounds: { ...g.rounds, compass: g.rounds.compass + 1 } } })
      },
      compassAnswer: (sid, way) => {
        const s = get(); const c = s.games.compass; if (!c || !J.canInteract(s.encounter) || c.mine[sid]) return
        set({ games: { ...s.games, compass: { ...c, mine: { ...c.mine, [sid]: way }, theirs: { ...c.theirs, [sid]: demoCompassAnswer(s.encounter!.partnerId, sid) }, dueAt: Date.now() + 1400 } } })
      },
      compassTick: () => { /* les réponses fictives sont déjà calculées ; l'animation se base sur dueAt */ },
      compassFinish: () => {
        const s = get(); const c = s.games.compass; if (!c || c.done) return
        set({ games: { ...s.games, compass: { ...c, done: true } } })
        s.logGame('compass'); s.completeStep('activity')
      },

      // ----- Le Pont -----
      startBridge: () => {
        if (!J.canInteract(get().encounter)) return
        const cur = get().games.bridge; if (cur && !cur.done) return
        set({ games: { ...get().games, bridge: newBridge(Date.now()) } })
      },
      bridgePlace: () => {
        const s = get(); const b = s.games.bridge; if (!b || b.done || !J.canInteract(s.encounter)) return
        if (b.mine >= 4) return
        set({ games: { ...s.games, bridge: { ...b, mine: b.mine + 1 } } })
      },
      bridgeTick: () => {
        const s = get(); const b = s.games.bridge; if (!b || b.done || !J.canInteract(s.encounter)) return
        const t = demoBridgeProgress(b, Date.now())
        let n = b
        if (t !== b.theirs) n = { ...n, theirs: t }
        if (n.theirs >= 4 && n.mine >= 4 && !n.stone.partner) n = { ...n, stone: { ...n.stone, partner: true } }
        if (n !== b) set({ games: { ...s.games, bridge: n } })
      },
      bridgeStone: () => {
        const s = get(); const b = s.games.bridge; if (!b || b.done || b.mine < 4) return
        const n = { ...b, stone: { ...b.stone, me: true } }
        const done = n.stone.me && n.stone.partner
        set({ games: { ...s.games, bridge: { ...n, done } } })
        if (done) { s.logGame('bridge'); s.completeStep('activity') }
      },
      logGame: (kind) => set({ gameLog: [...get().gameLog, { kind, at: get().now() }] }),

      // ----- Notre moment -----
      answerMoment: (text) => {
        const s = get(); if (!J.canInteract(s.encounter)) return
        const k = s.today(); const mo = MOMENTS[hashDay(k) % MOMENTS.length]
        const r = seeded(s.encounter!.partnerId + k)
        const p = getDemoPartner(s.encounter!.partnerId)!
        const theirs = mo.options ? mo.options[Math.floor(r() * mo.options.length)] : p.voice[Math.floor(r() * p.voice.length)]
        set({ moments: { ...s.moments, [k]: { mine: text, theirs } }, gameLog: [...s.gameLog, { kind: 'moment', at: s.now() }] })
        s.completeStep('activity')
      },
      skipMoment: () => set({ moments: { ...get().moments, [get().today()]: { ...get().moments[get().today()], skipped: true } } }),

      // ----- Messages & espace commun -----
      send: (text) => {
        const s = get(); if (!J.canInteract(s.encounter) || !text.trim()) return
        const m: Message = { id: uid(), from: 'me', kind: 'text', text: text.trim().slice(0, 1000), at: s.now() }
        set({ chat: [...s.chat, m] })
        scheduleReply(get, set)
      },
      sendVoice: (key) => {
        const s = get(); if (!J.canInteract(s.encounter)) return
        set({ chat: [...s.chat, { id: uid(), from: 'me', kind: 'voice', voiceKey: key, at: s.now() }] })
        if (!s.encounter!.done.voice) s.completeStep('voice')
        scheduleReply(get, set)
      },
      addMemory: (t) => { if (t.trim()) set({ memories: [{ id: uid(), text: t.trim().slice(0, 400), at: get().now() }, ...get().memories] }) },
      proposePlan: (idea, when) => {
        const s = get(); if (s.encounter?.status !== 'revealed') return
        const id = uid()
        set({ plans: [{ id, idea, when, state: 'proposed', at: s.now() }, ...s.plans] })
        setTimeout(() => set({ plans: get().plans.map((p) => (p.id === id ? { ...p, state: 'accepted' } : p)) }), 2500)
      },
      setPrivacy: (p) => set({ privacy: { ...get().privacy, ...p } }),
      deleteAllData: () => { set({ ...initial, introSeen: false }); void import('idb-keyval').then((m) => m.clear()) },
    }),
    {
      name: STORE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: (s, v) => migrate(s, v),
      partialize: (s) => {
        const o: Record<string, unknown> = {}
        for (const k of Object.keys(initial)) o[k] = (s as any)[k]
        return o as unknown as Persisted
      },
    },
  ),
)

export const hashDay = (k: string) => [...k].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
export const todaysMoment = (k: string) => MOMENTS[hashDay(k) % MOMENTS.length]

type Get = () => Persisted & Actions
type Set = (p: Partial<Persisted>) => void
function pushSystem(get: Get, set: Set, text: string) {
  set({ chat: [...get().chat, { id: uid(), from: 'system', kind: 'text', text, at: get().now() }] })
}
let typingTimer: ReturnType<typeof setTimeout> | undefined
export const typingListeners = new Set<(t: boolean) => void>()
function scheduleReply(get: Get, set: Set) {
  clearTimeout(typingTimer)
  const e0 = get().encounter; if (!e0) return
  const p = getDemoPartner(e0.partnerId); if (!p) return
  typingListeners.forEach((f) => f(true))
  typingTimer = setTimeout(() => {
    typingListeners.forEach((f) => f(false))
    const e = get().encounter
    if (!J.canInteract(e)) return // bloqué ou terminé entre-temps : aucune réponse
    const n = get().chat.filter((m) => m.from === 'partner').length
    set({ chat: [...get().chat, { id: uid(), from: 'partner', kind: 'text', text: p.voice[n % p.voice.length], at: get().now() }] })
    sfx.msg()
  }, 1500 + Math.random() * 900)
}
export const partnerOf = (e: Encounter | null): DemoPartner | undefined => (e ? getDemoPartner(e.partnerId) : undefined)
export const answeredCount = (a: Answers) => QUESTIONS.filter((q) => a[q.id] && !a[q.id].skipped && a[q.id].v != null && a[q.id].v !== '').length
