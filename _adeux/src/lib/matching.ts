import { QUESTIONS } from './content'
import type { Answers, DemoPartner, Gender, Profile } from './types'

export function ageFrom(birthdate: string, now = new Date()): number {
  const b = new Date(birthdate + 'T00:00:00')
  if (Number.isNaN(b.getTime())) return -1
  let a = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--
  return a
}
export const isAdult = (birthdate: string, now = new Date()) => ageFrom(birthdate, now) >= 18

export interface Candidate {
  id: string
  age: number
  gender: Gender
  seeks: Gender[]
  ageMin: number
  ageMax: number
  region: string
  scope: 'region' | 'country'
  answers: Answers
}

export function toCandidate(p: Profile, answers: Answers, id = 'me', now = new Date()): Candidate {
  return { id, age: ageFrom(p.birthdate, now), gender: p.gender, seeks: p.seeks, ageMin: p.ageMin, ageMax: p.ageMax, region: p.region, scope: p.scope, answers }
}
export const partnerToCandidate = (d: DemoPartner): Candidate => ({
  id: d.id, age: d.age, gender: d.gender, seeks: d.seeks, ageMin: d.ageMin, ageMax: d.ageMax, region: d.region, scope: d.scope, answers: d.answers,
})

const val = (a: Answers, k: string) => a[k]?.v

/** Critères essentiels et mutuels. Retourne la liste des raisons de refus. */
export function hardFilter(a: Candidate, b: Candidate): string[] {
  const why: string[] = []
  if (a.age < 18 || b.age < 18) why.push('majorité')
  if (!a.seeks.includes(b.gender) || !b.seeks.includes(a.gender)) why.push('préférences de rencontre')
  if (b.age < a.ageMin || b.age > a.ageMax || a.age < b.ageMin || a.age > b.ageMax) why.push('tranche d’âge')
  if ((a.scope === 'region' || b.scope === 'region') && a.region !== b.region) why.push('distance')
  const ia = val(a.answers, 'intent'), ib = val(b.answers, 'intent')
  const mustA = a.answers.intent?.must, mustB = b.answers.intent?.must
  if (ia && ib && ia !== ib) {
    const heavy = (v: unknown) => v === 'serious' || v === 'marriage'
    const far = (heavy(ia) && ib === 'discover') || (ia === 'discover' && heavy(ib))
    if (far && (mustA || mustB)) why.push('intentions')
    else if (far && !(mustA || mustB)) { /* différence : acceptée mais signalée */ }
  }
  const ka = val(a.answers, 'kids'), kb = val(b.answers, 'kids')
  if (ka && kb && ((ka === 'yes' && kb === 'no') || (ka === 'no' && kb === 'yes')) && (a.answers.kids?.must || b.answers.kids?.must)) why.push('enfants')
  // Convictions : critère strictement optionnel, appliqué UNIQUEMENT si la personne l'a marqué « indispensable ».
  const fa = val(a.answers, 'faith'), fb = val(b.answers, 'faith')
  const mustFaith = a.answers.faithpref?.must || b.answers.faithpref?.must
  if (mustFaith) {
    const known = (x: unknown) => typeof x === 'string' && x !== 'private'
    if (!(known(fa) && known(fb) && fa === fb)) why.push('convictions')
  }
  return why
}

export interface Insight { kind: 'shared' | 'different'; text: string; qid: string }

const asArr = (v: Answers[string]['v'] | undefined): string[] => (Array.isArray(v) ? v : v == null ? [] : [String(v)])

/** Éléments compréhensibles — AUCUN score de compatibilité. */
export function insights(a: Answers, b: Answers): { shared: Insight[]; different: Insight[] } {
  const shared: Insight[] = []
  const different: Insight[] = []
  for (const q of QUESTIONS) {
    const x = a[q.id], y = b[q.id]
    if (!x || !y || x.skipped || y.skipped || x.v == null || y.v == null) continue
    if (q.type === 'open') continue
    if (q.type === 'scale') {
      const d = Math.abs(Number(x.v) - Number(y.v))
      if (d <= 1 && q.sharedScale) shared.push({ kind: 'shared', text: q.sharedScale, qid: q.id })
      else if (d >= 3 && q.diff) different.push({ kind: 'different', text: q.diff, qid: q.id })
      continue
    }
    const xa = asArr(x.v), ya = asArr(y.v)
    const common = xa.filter((i) => ya.includes(i))
    if (common.length) {
      const opt = q.options?.find((o) => o.id === common[0])
      if (opt?.shared) shared.push({ kind: 'shared', text: opt.shared, qid: q.id })
    } else if (q.diff) different.push({ kind: 'different', text: q.diff, qid: q.id })
  }
  return { shared, different }
}

/** Trois points communs et, si possible, une différence intéressante. */
export function summary(a: Answers, b: Answers) {
  const { shared, different } = insights(a, b)
  const order = ['communication', 'spontaneity', 'intent', 'conflict', 'affection', 'evening']
  shared.sort((x, y) => (order.indexOf(x.qid) + 1 || 99) - (order.indexOf(y.qid) + 1 || 99))
  return { shared: shared.slice(0, 3), different: different.slice(0, 1) }
}

export const OWN_CONTENT_NOTE = 'Aucun score : seulement quelques éléments à découvrir ensemble.'

/** Propose au plus un partenaire compatible. Les personnes bloquées ou déjà rencontrées sont exclues. */
export function pickCandidate(me: Candidate, pool: DemoPartner[], exclude: string[]): DemoPartner | null {
  for (const p of pool) {
    if (exclude.includes(p.id)) continue
    if (hardFilter(me, partnerToCandidate(p)).length === 0) return p
  }
  return null
}
