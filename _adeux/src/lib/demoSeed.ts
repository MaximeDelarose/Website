import type { Answers, Profile } from './types'

// Profil de la personne qui essaie la démo (fictif, local à l'appareil).
export const DEMO_PROFILE: Profile = {
  pseudo: 'Camille', birthdate: '1995-06-15', gender: 'woman', seeks: ['man', 'nonbinary'], ageMin: 26, ageMax: 40,
  region: 'Île-de-France', scope: 'country', showExactAge: false, adultDeclared: true,
}
const a = (v: string | string[] | number, must = false) => ({ v, must })
export const DEMO_ANSWERS: Answers = {
  intent: a('slow'), place: a(3), pace: a('waves'), projects: a(['travel', 'home']), kids: a('maybe'), differences: a(['rhythm', 'tastes']),
  affection: a(['words', 'time']), conflict: a('talk'), communication: a(5), talkorthink: a('later'), considered: a(['listen', 'remember']),
  attentions: a('playlist'), evening: a('cosy'), spontaneity: a(4), humor: a(['absurd', 'tender']), passions: a(['music', 'cook', 'books']),
  habits: a('night'), rhythm: a(2), pleasures: a('market'), discovery: { v: 'Un petit village de pêcheurs au Portugal', skipped: false },
}
