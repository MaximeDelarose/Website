import { describe, expect, it } from 'vitest'
import { acceptProposal, block, canInteract, canSeePhotos, complete, leave, newEncounter, outcome, submitConsent } from '../../src/lib/journey'
import type { Encounter } from '../../src/lib/types'

const active = () => { let e = acceptProposal(acceptProposal(newEncounter('e', 'p'), 'me'), 'partner'); return e }
const ready = () => ['intro', 'activity', 'voice'].reduce((e, s) => complete(e, s as any), active())

describe('parcours en 4 étapes', () => {
  it('une proposition exige l’accord des deux avant de commencer', () => {
    const e = acceptProposal(newEncounter('e', 'p'), 'me')
    expect(e.status).toBe('proposed')
    expect(acceptProposal(e, 'partner').status).toBe('active')
  })
  it('les étapes se débloquent par actions, dans n’importe quel ordre', () => {
    let e = active(); expect(e.stage).toBe(0)
    e = complete(e, 'voice'); expect(e.stage).toBe(0)
    e = complete(e, 'intro'); expect(e.stage).toBe(1)
    e = complete(e, 'activity'); expect(e.stage).toBe(3)
  })
  it('on ne peut pas consentir avant la fin du parcours', () => {
    const e = submitConsent(active(), 'me', true)
    expect(e.consent.me).toBeNull()
  })
})

describe('double consentement', () => {
  it('oui + oui → révélation, photos visibles', () => {
    const e = submitConsent(submitConsent(ready(), 'me', true), 'partner', true)
    expect(e.status).toBe('revealed'); expect(canSeePhotos(e)).toBe(true); expect(outcome(e)).toBe('revealed')
  })
  it('oui + non → fin bienveillante, AUCUNE photo', () => {
    const e = submitConsent(submitConsent(ready(), 'me', true), 'partner', false)
    expect(e.status).toBe('closed'); expect(canSeePhotos(e)).toBe(false); expect(outcome(e)).toBe('kind-end')
  })
  it('non + oui → même issue, quel que soit l’auteur du refus', () => {
    const a = submitConsent(submitConsent(ready(), 'me', false), 'partner', true)
    const b = submitConsent(submitConsent(ready(), 'me', true), 'partner', false)
    expect(a.status).toBe(b.status); expect(outcome(a)).toBe(outcome(b))
  })
  it('simultanéité : l’ordre d’arrivée ne change rien (toutes combinaisons)', () => {
    for (const x of [true, false]) for (const y of [true, false]) {
      const ab = submitConsent(submitConsent(ready(), 'me', x), 'partner', y)
      const ba = submitConsent(submitConsent(ready(), 'partner', y), 'me', x)
      expect(ab.status).toBe(ba.status)
      expect(canSeePhotos(ab)).toBe(x && y)
      expect(canSeePhotos(ba)).toBe(x && y)
    }
  })
  it('une réponse donnée ne se change pas (pas de pression, pas de contournement)', () => {
    let e = submitConsent(ready(), 'me', false)
    e = submitConsent(e, 'me', true)
    expect(e.consent.me).toBe(false)
  })
  it('tant qu’un seul a répondu : aucune photo', () => {
    const e = submitConsent(ready(), 'me', true)
    expect(canSeePhotos(e)).toBe(false); expect(outcome(e)).toBe('waiting')
  })
  it('on ne peut pas fabriquer un état révélé sans consentements', () => {
    const forged: Encounter = { ...ready(), status: 'revealed' }
    expect(canSeePhotos(forged)).toBe(false)
  })
})

describe('blocage et sortie', () => {
  it('bloquer coupe toute interaction et les photos, même après révélation', () => {
    const revealed = submitConsent(submitConsent(ready(), 'me', true), 'partner', true)
    const b = block(revealed)
    expect(canInteract(b)).toBe(false); expect(canSeePhotos(b)).toBe(false)
  })
  it('quitter ferme la rencontre ; après blocage rien ne la rouvre', () => {
    expect(canInteract(leave(active()))).toBe(false)
    expect(complete(block(active()), 'intro').done.intro).toBe(false)
    expect(submitConsent(block(ready()), 'me', true).consent.me).toBeNull()
  })
})
