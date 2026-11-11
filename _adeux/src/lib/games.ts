import { BRIDGE_SEGMENTS, COMPASS, MIRROR } from './content'
import { seeded } from './util'

export interface MirrorState { qid: string; mine: { opt: string; note: string } | null; theirs: { opt: string; note: string } | null; dueAt: number | null; flipped: boolean; commented: boolean }
export interface CompassState { ids: string[]; mine: Record<string, string>; theirs: Record<string, string>; dueAt: number | null; done: boolean; reactions: Record<string, string> }
export interface BridgeState { startedAt: number; mine: number; theirs: number; stone: { me: boolean; partner: boolean }; done: boolean }
export interface GameLogEntry { kind: 'mirror' | 'compass' | 'bridge' | 'moment'; at: number }

export const newMirror = (round: number, now: number): MirrorState => ({ qid: MIRROR[round % MIRROR.length].id, mine: null, theirs: null, dueAt: null, flipped: false, commented: false })
export const newCompass = (round: number): CompassState => ({ ids: [0, 1, 2].map((i) => COMPASS[(round * 3 + i) % COMPASS.length].id), mine: {}, theirs: {}, dueAt: null, done: false, reactions: {} })
export const newBridge = (now: number): BridgeState => ({ startedAt: now, mine: 0, theirs: 0, stone: { me: false, partner: false }, done: false })

/** Réponse déterministe du partenaire fictif. */
export function demoMirrorAnswer(partnerId: string, qid: string) {
  const q = MIRROR.find((m) => m.id === qid)!
  const r = seeded(partnerId + qid)
  const opt = q.options[Math.floor(r() * q.options.length)]
  const notes = ['Ça me parle vraiment.', 'C’est tout bête, mais c’est ça.', 'Je n’y avais jamais pensé comme ça avant.', 'Et pour toi ?']
  return { opt: opt.id, note: notes[Math.floor(r() * notes.length)] }
}
export function demoCompassAnswer(partnerId: string, sid: string) {
  const s = COMPASS.find((c) => c.id === sid)!
  const r = seeded(partnerId + sid)
  return s.ways[Math.floor(r() * s.ways.length)].id
}

/** Les deux joueurs avancent chacun de leur côté ; une section se verrouille quand les deux ont posé leur pièce. */
export const bridgeLocked = (b: BridgeState) => Math.min(b.mine, b.theirs)

/** Le partenaire fictif pose une pièce toutes les ~3,5 s, sans jamais dépasser d'une pièce le joueur. */
export function demoBridgeProgress(b: BridgeState, now: number, intervalMs = 3500): number {
  const byTime = Math.floor((now - b.startedAt) / intervalMs)
  return Math.max(b.theirs, Math.min(BRIDGE_SEGMENTS, byTime, b.mine + 1))
}
