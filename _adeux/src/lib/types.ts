export type Gender = 'woman' | 'man' | 'nonbinary'
export type Scope = 'region' | 'country'

export interface Profile {
  pseudo: string
  birthdate: string // AAAA-MM-JJ — sert uniquement à calculer l'âge
  gender: Gender
  seeks: Gender[]
  ageMin: number
  ageMax: number
  region: string
  scope: Scope
  showExactAge: boolean
  /** Déclaration d'âge : ce n'est PAS une vérification d'identité. */
  adultDeclared: boolean
}

export interface Answer {
  v: string | string[] | number | null
  must?: boolean
  skipped?: boolean
}
export type Answers = Record<string, Answer>

export interface PortraitSpec { skin: string; hair: string; hairStyle: 0 | 1 | 2 | 3; accent: string; glasses?: boolean }

export interface PartnerPublic {
  id: string
  pseudo: string
  age: number
  gender: Gender
  region: string
  showExactAge: boolean
  interests: string[]
  intriguing: string
  /** Ne figure jamais dans l'état tant que la révélation n'est pas validée. */
  fictional: true
}
export interface DemoPartner extends PartnerPublic {
  seeks: Gender[]
  ageMin: number
  ageMax: number
  scope: Scope
  answers: Answers
  portrait: PortraitSpec
  voice: string[] // petites phrases pour le chat
}

export type Stage = 0 | 1 | 2 | 3
export type EncStatus = 'proposed' | 'active' | 'paused' | 'declined' | 'closed' | 'revealed' | 'blocked'

export interface Encounter {
  id: string
  partnerId: string
  status: EncStatus
  stage: Stage
  accepted: { me: boolean; partner: boolean }
  done: { intro: boolean; activity: boolean; voice: boolean }
  /** null = pas encore répondu. Jamais exposé individuellement à l'autre personne. */
  consent: { me: boolean | null; partner: boolean | null }
  startedAt: number
}
