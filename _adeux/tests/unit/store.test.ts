import { describe, expect, it } from 'vitest'
import { migrate, STORE_VERSION } from '../../src/lib/store'
import { bridgeLocked, demoBridgeProgress, newBridge, demoMirrorAnswer } from '../../src/lib/games'

describe('migrations de données locales', () => {
  it('v0 → courante : conserve profil et réponses, ajoute les nouvelles structures', () => {
    const old = { profile: { pseudo: 'Alex' }, answers: { intent: 'serious', place: 4 }, onboarded: true }
    const m = migrate(old, 0)
    expect(m.profile?.pseudo).toBe('Alex'); expect(m.onboarded).toBe(true)
    expect(m.answers.intent).toEqual({ v: 'serious' }); expect(m.answers.place).toEqual({ v: 4 })
    expect(m.memories).toEqual([]); expect(m.games.rounds).toEqual({ mirror: 0, compass: 0 }); expect(m.privacy.sound).toBe(true)
  })
  it('v1 et v2 conservent aussi les conversations et souvenirs existants', () => {
    const chat = [{ id: '1', from: 'me', kind: 'text', text: 'salut', at: 1 }]
    expect(migrate({ chat, profile: null }, 1).chat).toEqual(chat)
    expect(migrate({ chat, memories: [{ id: 'm', text: 'x', at: 1 }] }, 2).memories).toHaveLength(1)
  })
  it('version courante : identité', () => {
    expect(STORE_VERSION).toBeGreaterThanOrEqual(3)
    expect(migrate({ introSeen: true }, STORE_VERSION).introSeen).toBe(true)
  })
})

describe('Le Pont — coopération', () => {
  it('une section ne se verrouille que si les DEUX ont posé leur pièce', () => {
    const b = { ...newBridge(0), mine: 3, theirs: 1 }
    expect(bridgeLocked(b)).toBe(1)
  })
  it('le partenaire fictif ne dépasse jamais le joueur de plus d’une pièce', () => {
    const b = { ...newBridge(0), mine: 1 }
    expect(demoBridgeProgress(b, 60_000)).toBe(2)
    expect(demoBridgeProgress({ ...b, mine: 4 }, 60_000)).toBe(4)
    expect(demoBridgeProgress({ ...b, mine: 0 }, 0)).toBe(0)
  })
})
describe('Le Miroir — réponses du partenaire fictif', () => {
  it('déterministes (reproductibles)', () => {
    expect(demoMirrorAnswer('p', 'm1')).toEqual(demoMirrorAnswer('p', 'm1'))
  })
})
