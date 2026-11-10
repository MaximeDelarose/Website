import { describe, expect, it } from 'vitest'
import { ageFrom, hardFilter, insights, isAdult, pickCandidate, summary, toCandidate } from '../../src/lib/matching'
import { DEMO_PARTNERS } from '../../src/lib/demoPartners'
import { DEMO_ANSWERS, DEMO_PROFILE } from '../../src/lib/demoSeed'
import { QUESTIONS } from '../../src/lib/content'

const NOW = new Date('2026-11-10T12:00:00')
const me = toCandidate(DEMO_PROFILE, DEMO_ANSWERS, 'me', NOW)

describe('majorité', () => {
  it('calcule l’âge et refuse les mineurs', () => {
    expect(ageFrom('2008-11-11', NOW)).toBe(17)
    expect(isAdult('2008-11-11', NOW)).toBe(false)
    expect(isAdult('2008-11-10', NOW)).toBe(true)
    expect(isAdult('pas-une-date', NOW)).toBe(false)
  })
  it('un mineur n’est jamais compatible', () => {
    expect(hardFilter({ ...me, age: 17 }, { ...me, id: 'x' })).toContain('majorité')
  })
})

describe('critères essentiels', () => {
  const p = (id: string) => DEMO_PARTNERS.find((d) => d.id === id)!
  const cand = (id: string) => ({ id, age: p(id).age, gender: p(id).gender, seeks: p(id).seeks, ageMin: p(id).ageMin, ageMax: p(id).ageMax, region: p(id).region, scope: p(id).scope, answers: p(id).answers })
  it('préférences mutuelles : Léa (femme) ne cherche pas de femme', () => {
    expect(hardFilter(me, cand('demo-lea'))).toContain('préférences de rencontre')
  })
  it('tranches d’âge mutuelles', () => {
    expect(hardFilter({ ...me, ageMax: 30 }, cand('demo-sacha'))).toContain('tranche d’âge')
    expect(hardFilter({ ...me, age: 45 }, cand('demo-sacha'))).toContain('tranche d’âge')
  })
  it('distance : une région exigée par l’un des deux suffit à exclure', () => {
    expect(hardFilter({ ...me, region: 'Bretagne', scope: 'region' }, cand('demo-noa'))).toContain('distance')
    expect(hardFilter({ ...me, region: 'Bretagne' }, cand('demo-sacha'))).toEqual([])
  })
  it('intentions : seulement si « indispensable »', () => {
    const a = { ...me, answers: { ...me.answers, intent: { v: 'serious', must: false } } }
    const b = { ...cand('demo-maya'), age: 28, scope: 'country' as const, seeks: ['woman', 'man', 'nonbinary'] as any, gender: 'man' as const }
    expect(hardFilter(a, b)).toEqual([])
    expect(hardFilter({ ...a, answers: { ...a.answers, intent: { v: 'serious', must: true } } }, b)).toContain('intentions')
  })
  it('enfants : oui/non incompatibles uniquement si indispensable', () => {
    const a = { ...me, answers: { ...me.answers, kids: { v: 'no', must: true } } }
    expect(hardFilter(a, cand('demo-sacha'))).toContain('enfants')
    expect(hardFilter({ ...a, answers: { ...a.answers, kids: { v: 'no', must: false } } }, cand('demo-sacha'))).not.toContain('enfants')
  })
  it('propose au plus une personne, exclut bloqués/déjà vus, et rend null sans faux match', () => {
    expect(pickCandidate(me, DEMO_PARTNERS, [])?.id).toBe('demo-noa')
    expect(pickCandidate(me, DEMO_PARTNERS, ['demo-noa'])?.id).toBe('demo-sacha')
    expect(pickCandidate(me, DEMO_PARTNERS, ['demo-noa', 'demo-sacha', 'demo-maya', 'demo-lea'])).toBeNull()
  })
})

describe('points communs (jamais de score)', () => {
  it('fournit des phrases compréhensibles, max 3 + 1 différence', () => {
    const s = summary(DEMO_ANSWERS, DEMO_PARTNERS[0].answers)
    expect(s.shared.length).toBeGreaterThan(0); expect(s.shared.length).toBeLessThanOrEqual(3); expect(s.different.length).toBeLessThanOrEqual(1)
    expect(s.shared.map((x) => x.text).join(' ')).toMatch(/communication|spontan/i)
  })
  it('deux profils très différents restent compatibles : on signale juste les différences', () => {
    const r = insights(DEMO_ANSWERS, DEMO_PARTNERS[3].answers)
    expect(r.different.length).toBeGreaterThan(0)
  })
  it('aucun champ « score » nulle part', () => {
    expect(JSON.stringify(summary(DEMO_ANSWERS, DEMO_PARTNERS[0].answers))).not.toMatch(/score|percent|%/i)
  })
})

describe('questionnaire', () => {
  it('contient ~20 questions réparties en A/B/C avec les 5 mécaniques', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(18)
    for (const c of ['A', 'B', 'C']) expect(QUESTIONS.filter((q) => q.cat === c).length).toBeGreaterThan(4)
    for (const t of ['cards', 'multi', 'dilemma', 'scale', 'open']) expect(QUESTIONS.some((q) => q.type === t)).toBe(true)
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length)
  })
})
