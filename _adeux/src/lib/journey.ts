import type { Encounter, Stage } from './types'

export const STAGES = [
  { id: 0, name: 'La découverte', short: 'Découverte', blurb: 'Vous vous découvrez par petites touches.' },
  { id: 1, name: 'La connexion', short: 'Connexion', blurb: 'Jeux, mots et complicité naissante.' },
  { id: 2, name: 'La voix', short: 'Voix', blurb: 'Vos voix se rencontrent, à votre rythme.' },
  { id: 3, name: 'La révélation', short: 'Révélation', blurb: 'Si vous le souhaitez tous les deux.' },
] as const

export const newEncounter = (id: string, partnerId: string, now = Date.now()): Encounter => ({
  id, partnerId, status: 'proposed', stage: 0, startedAt: now,
  accepted: { me: false, partner: false },
  done: { intro: false, activity: false, voice: false },
  consent: { me: null, partner: null },
})

export const isLive = (e: Encounter | null | undefined): e is Encounter =>
  !!e && (e.status === 'active' || e.status === 'paused' || e.status === 'revealed')

/** Peut-on interagir (messages, jeux, appels) ? Faux après blocage, refus ou fin. */
export const canInteract = (e: Encounter | null | undefined): boolean => !!e && (e.status === 'active' || e.status === 'revealed')

/** Les photos ne sont jamais accessibles avant double consentement ET si la rencontre est restée valide. */
export const canSeePhotos = (e: Encounter | null | undefined): boolean =>
  !!e && e.status === 'revealed' && e.consent.me === true && e.consent.partner === true

function recompute(e: Encounter): Encounter {
  let stage: Stage = 0
  if (e.done.intro) stage = 1
  if (e.done.intro && e.done.activity) stage = 2
  if (e.done.intro && e.done.activity && e.done.voice) stage = 3
  return { ...e, stage }
}

export function acceptProposal(e: Encounter, side: 'me' | 'partner'): Encounter {
  if (e.status !== 'proposed') return e
  const accepted = { ...e.accepted, [side]: true }
  const status = accepted.me && accepted.partner ? 'active' : 'proposed'
  return { ...e, accepted, status }
}
export function complete(e: Encounter, step: 'intro' | 'activity' | 'voice'): Encounter {
  if (!canInteract(e) && e.status !== 'paused') return e
  if (e.done[step]) return e
  return recompute({ ...e, done: { ...e.done, [step]: true } })
}
export function pause(e: Encounter): Encounter { return e.status === 'active' ? { ...e, status: 'paused' } : e }
export function resume(e: Encounter): Encounter { return e.status === 'paused' ? { ...e, status: 'active' } : e }
export function leave(e: Encounter): Encounter { return e.status === 'revealed' || e.status === 'blocked' ? e : { ...e, status: 'closed' } }
export function block(e: Encounter): Encounter { return { ...e, status: 'blocked' } }

/**
 * Double consentement. Idempotent et indépendant de l'ordre :
 * deux appels simultanés produisent le même état final.
 * Un refus ferme la rencontre sans jamais dire QUI a refusé.
 */
export function submitConsent(e: Encounter, side: 'me' | 'partner', yes: boolean): Encounter {
  if (e.stage < 3 || !(e.status === 'active')) return e
  if (e.consent[side] !== null) return e // une réponse déjà donnée ne se change pas
  const consent = { ...e.consent, [side]: yes }
  if (consent.me === null || consent.partner === null) return { ...e, consent }
  return { ...e, consent, status: consent.me && consent.partner ? 'revealed' : 'closed' }
}

export type Outcome = 'waiting' | 'revealed' | 'kind-end'
export const outcome = (e: Encounter): Outcome =>
  e.status === 'revealed' ? 'revealed' : e.consent.me !== null && e.consent.partner !== null ? 'kind-end' : 'waiting'
