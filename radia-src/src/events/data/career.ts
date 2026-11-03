/** Invitations de carrière : elles respectent les carrières déjà pratiquées (voir `needs.career`). */
import type { EventDef } from '../types';

export const CAREER_EVENTS: EventDef[] = [
  {
    id: 'c-shooting', title: 'Shooting surprise', sender: 'agency', category: 'career', big: true, repeatable: true, weight: 7, minPlayMin: 8, needs: { career: 'photo' },
    teaser: 'Studio Lumière : une photographe vous attend !',
    invite: 'Studio Lumière : une photographe a eu un désistement et pense à vous. Shooting surprise cet après-midi, tenue au choix.',
    steps: [
      { t: 'dress', hint: 'Une tenue pour le shooting', style: 'chic' },
      { t: 'travel', place: 'studio', label: 'Direction le studio' },
      { t: 'activity', id: 'careerGame', params: { career: 'photo' } },
      { t: 'photo', place: 'studio', title: 'Shooting surprise' },
    ],
    reward: { coins: 160, fans: 40 }, replayReward: { coins: 50, fans: 10 }, memoryTitle: 'Shooting surprise',
  },
  {
    id: 'c-casting', title: 'Casting', sender: 'agency', category: 'career', big: true, repeatable: true, weight: 6, minPlayMin: 10, needs: { career: 'actress' },
    teaser: 'Un casting pour un joli rôle vous attend.',
    invite: 'Un réalisateur cherche une actrice pour une comédie romantique. Un casting vous attend, quand vous voulez.',
    steps: [
      { t: 'dress', hint: 'Une tenue pour le casting', style: 'casual' },
      { t: 'travel', place: 'studio', label: 'Direction le casting' },
      { t: 'activity', id: 'careerGame', params: { career: 'actress' } },
      { t: 'photo', place: 'studio', title: 'Le casting' },
    ],
    reward: { coins: 160, fans: 50 }, replayReward: { coins: 50, fans: 12 }, memoryTitle: 'Le casting',
  },
  {
    id: 'c-runway', title: 'Un défilé', sender: 'agency', category: 'career', big: true, repeatable: true, weight: 6, minPlayMin: 10, needs: { career: 'model' },
    teaser: 'On vous attend sur un podium !',
    invite: 'Une maison de couture fictive vous invite à ouvrir son défilé. Le podium est à vous.',
    steps: [
      { t: 'dress', hint: 'Une tenue de défilé', style: 'stage' },
      { t: 'travel', place: 'stage', label: 'En coulisses' },
      { t: 'activity', id: 'careerGame', params: { career: 'model' } },
      { t: 'photo', place: 'stage', title: 'Sur le podium' },
    ],
    reward: { coins: 170, fans: 60 }, replayReward: { coins: 55, fans: 12 }, memoryTitle: 'Sur le podium',
  },
  {
    id: 'c-concert', title: 'Un concert', sender: 'agency', category: 'career', big: true, repeatable: true, weight: 6, minPlayMin: 10, needs: { career: 'singer' },
    teaser: 'La scène vous attend ce soir.',
    invite: 'Une petite salle comble et un micro : vous chantez ce soir. Les lumières sont prêtes.',
    steps: [
      { t: 'dress', hint: 'Une tenue de scène', style: 'stage' },
      { t: 'travel', place: 'stage', label: 'Vers la scène' },
      { t: 'activity', id: 'careerGame', params: { career: 'singer' } },
      { t: 'photo', place: 'stage', title: 'Le concert' },
    ],
    reward: { coins: 170, fans: 60 }, replayReward: { coins: 55, fans: 12 }, memoryTitle: 'Le concert',
  },
  {
    id: 'c-premiere', title: 'La première du film', sender: 'agency', category: 'career', big: true, repeatable: true, weight: 4, minPlayMin: 20, needs: { career: 'actress' },
    teaser: 'Tapis rouge : la première de votre film !',
    invite: 'La première du film approche. Tapis rouge, flashs, et une salle qui vous attend.',
    steps: [
      { t: 'dress', hint: 'Une tenue de tapis rouge', style: 'royal' },
      { t: 'travel', place: 'stage', label: 'Sur le tapis rouge' },
      { t: 'activity', id: 'careerGame', params: { career: 'actress' } },
      { t: 'photo', place: 'stage', title: 'La première' },
    ],
    reward: { coins: 220, fans: 100, diamonds: 6 }, replayReward: { coins: 60, fans: 20 }, memoryTitle: 'La première',
  },
  {
    id: 'c-cover', title: 'Une couverture de magazine', sender: 'agency', category: 'career', big: true, repeatable: true, weight: 4, minPlayMin: 20, needs: { career: 'photo' },
    teaser: 'Un magazine pense à vous pour sa couverture.',
    invite: 'Un magazine fictif pense à vous pour sa prochaine couverture. Séance dans la foulée.',
    steps: [
      { t: 'dress', hint: 'Une tenue pour la couverture', style: 'chic' },
      { t: 'travel', place: 'studio', label: 'Au studio' },
      { t: 'activity', id: 'careerGame', params: { career: 'photo' } },
      { t: 'photo', place: 'studio', title: 'La couverture' },
    ],
    reward: { coins: 220, fans: 90, diamonds: 6 }, replayReward: { coins: 60, fans: 18 }, memoryTitle: 'La couverture',
  },
  {
    id: 'c-fans', title: 'Rencontre avec des fans', sender: 'agency', category: 'career', big: true, repeatable: true, weight: 5, minPlayMin: 12, needs: { career: 'any' },
    teaser: 'Des fans vous attendent pour une rencontre !',
    invite: 'Des admirateurs fictifs vous attendent pour une rencontre et un petit spectacle.',
    steps: [
      { t: 'dress', hint: 'Une tenue pour rencontrer vos fans', style: 'stage' },
      { t: 'travel', place: 'stage', label: 'Vers la rencontre' },
      { t: 'scene', lines: [{ who: 'narrator', text: 'Des pancartes, des sourires, des cœurs. On crie votre prénom.' }] },
      { t: 'activity', id: 'rhythmDance', params: { song: 'concert' } },
      { t: 'photo', place: 'stage', title: 'Rencontre avec les fans' },
    ],
    reward: { coins: 150, fans: 80 }, replayReward: { coins: 45, fans: 15 }, memoryTitle: 'Rencontre avec les fans',
  },
];
