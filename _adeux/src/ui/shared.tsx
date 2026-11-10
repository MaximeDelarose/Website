import { useStore, partnerOf } from '../lib/store'
import { summary } from '../lib/matching'
import { ageBand } from '../lib/util'
import { canSeePhotos, outcome } from '../lib/journey'
import type { DemoPartner } from '../lib/types'

export function useEnc() {
  const enc = useStore((s) => s.encounter)
  const partner = partnerOf(enc)
  const answers = useStore((s) => s.answers)
  const sum = partner ? summary(answers, partner.answers) : null
  return { enc, partner, sum, photos: canSeePhotos(enc), out: enc ? outcome(enc) : null }
}
export const partnerAge = (p: DemoPartner) => (p.showExactAge ? `${p.age} ans` : ageBand(p.age))
export const KIND_END = 'Toutes les rencontres ne deviennent pas des histoires. Merci d’avoir pris le temps de découvrir quelqu’un.'
