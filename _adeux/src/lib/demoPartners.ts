import type { DemoPartner } from './types'

// Personnages entièrement fictifs, utilisés uniquement en mode démo.
const a = (v: string | string[] | number, must = false) => ({ v, must })

export const DEMO_PARTNERS: DemoPartner[] = [
  {
    id: 'demo-noa', pseudo: 'Noa', age: 29, gender: 'nonbinary', region: 'Île-de-France', showExactAge: false,
    seeks: ['woman', 'man', 'nonbinary'], ageMin: 22, ageMax: 40, scope: 'country', fictional: true,
    interests: ['Cuisine', 'Musique', 'Marchés du dimanche'],
    intriguing: 'Quelle est la dernière chose qui t’a fait rire à voix haute ?',
    portrait: { skin: '#E8B796', hair: '#3A2A4A', hairStyle: 1, accent: '#A88BC7' },
    voice: ['Salut ! Ravi·e qu’on se découvre doucement', 'Haha, bonne réponse. Moi c’était un canard en plastique ce matin.', 'Tu écoutes quoi en ce moment ?', 'J’adore cette idée. On pourrait s’en inspirer pour la suite.'],
    answers: {
      intent: a('slow'), place: a(3), pace: a('waves'), projects: a(['travel', 'creative']), kids: a('maybe'),
      differences: a(['rhythm', 'tastes']), affection: a(['words', 'time']), conflict: a('talk'), communication: a(5),
      talkorthink: a('later'), considered: a(['listen', 'remember']), attentions: a('playlist'), evening: a('cosy'),
      spontaneity: a(4), humor: a(['absurd', 'tender']), passions: a(['music', 'cook', 'cinema']), habits: a('night'), rhythm: a(2), pleasures: a('market'),
    },
  },
  {
    id: 'demo-lea', pseudo: 'Léa', age: 31, gender: 'woman', region: 'Occitanie', showExactAge: true,
    seeks: ['man', 'nonbinary'], ageMin: 28, ageMax: 42, scope: 'country', fictional: true,
    interests: ['Randonnée', 'Lecture', 'Cinéma'],
    intriguing: 'Si on te donnait une journée sans obligations, par quoi commencerais-tu ?',
    portrait: { skin: '#F1CBAA', hair: '#7A4A2A', hairStyle: 2, accent: '#F6B7A0', glasses: true },
    voice: ['Coucou ! Je suis contente qu’on se rencontre ainsi.', 'Ha ! Je note ça précieusement.', 'Et toi, plutôt montagne ou mer ?', 'Avec plaisir. Une chose à la fois'],
    answers: {
      intent: a('serious'), place: a(4), pace: a('slowburn'), projects: a(['home', 'travel', 'family']), kids: a('yes'),
      differences: a(['social', 'tastes']), affection: a(['time', 'acts']), conflict: a('think'), communication: a(4),
      talkorthink: a('later'), considered: a(['listen']), attentions: a('coffee'), evening: a('walk'),
      spontaneity: a(2), humor: a(['dry', 'tender']), passions: a(['nature', 'books', 'cinema']), habits: a('early'), rhythm: a(2), pleasures: a('bakery'),
    },
  },
  {
    id: 'demo-sacha', pseudo: 'Sacha', age: 34, gender: 'man', region: 'Bretagne', showExactAge: true,
    seeks: ['woman', 'nonbinary'], ageMin: 26, ageMax: 40, scope: 'country', fictional: true,
    interests: ['Voile', 'Jeux de société', 'Cuisine'],
    intriguing: 'Quel petit détail du quotidien te rend heureux·se sans que personne ne le sache ?',
    portrait: { skin: '#D9A37E', hair: '#2B2B2B', hairStyle: 0, accent: '#CDE8DA' },
    voice: ['Hello ! Content de faire ta connaissance, sans pression.', 'Ah oui ? Raconte-moi ça.', 'Je cuisine un risotto le dimanche, c’est mon rituel.', 'Excellente idée !'],
    answers: {
      intent: a('serious'), place: a(4), pace: a('daily'), projects: a(['home', 'family']), kids: a('yes'),
      differences: a(['rhythm']), affection: a(['acts', 'gifts']), conflict: a('talk'), communication: a(5),
      talkorthink: a('now'), considered: a(['initiative', 'listen']), attentions: a('surprise'), evening: a('friends'),
      spontaneity: a(3), humor: a(['tease', 'selfmock']), passions: a(['games', 'cook', 'sport']), habits: a('early'), rhythm: a(4), pleasures: a('bakery'),
    },
  },
  {
    id: 'demo-maya', pseudo: 'Maya', age: 26, gender: 'woman', region: 'Île-de-France', showExactAge: false,
    seeks: ['woman', 'man'], ageMin: 24, ageMax: 36, scope: 'region', fictional: true,
    interests: ['Danse', 'Art', 'Voyages'],
    intriguing: 'Quelle est la dernière chose qui t’a fait rire à voix haute ?',
    portrait: { skin: '#B98363', hair: '#1E1A2B', hairStyle: 3, accent: '#F3C1CC' },
    voice: ['Hey ! On y va tranquillement', 'Trop bien.', 'Tu dansais ce matin aussi, avoue.', 'Oui, avec joie.'],
    answers: {
      intent: a('discover'), place: a(2), pace: a('waves'), projects: a(['travel', 'creative']), kids: a('maybe'),
      differences: a(['beliefs', 'rhythm', 'tastes']), affection: a(['touch', 'gifts']), conflict: a('think'), communication: a(3),
      talkorthink: a('later'), considered: a(['space', 'remember']), attentions: a('playlist'), evening: a('out'),
      spontaneity: a(5), humor: a(['absurd', 'tease']), passions: a(['art', 'music', 'sport']), habits: a('night'), rhythm: a(5), pleasures: a('vinyl'),
    },
  },
]

export const getDemoPartner = (id: string) => DEMO_PARTNERS.find((p) => p.id === id)
