/** Définitions d'événement de « L'Éclat Éternel ♡ » : l'invitation réelle, la scène à revoir et la prévisualisation développeur. */
import type { EventDef } from '../types';
import {
  ACHIEVEMENT_ID, DRESS_HINT, INVITE_SENDER, INVITE_TEXT, INVITE_TITLE, MEMORY_TITLE, NECKLACE_EVENT_ID, NECKLACE_REPLAY_ID, TRAVEL_LABEL, WOW_LINES,
} from './data';

const WOW = { t: 'scene', lines: WOW_LINES.map((text) => ({ who: 'auguste' as const, text, expr: 'love' as const })) } as const;

/**
 * L'invitation automatique. Aucune récompense chiffrée : le collier est attribué uniquement par la fin de la scène
 * (src/events/necklace/grant.ts), jamais par `reward` (voir le test de garde-fou).
 */
export const NECKLACE_EVENT: EventDef = {
  id: NECKLACE_EVENT_ID, title: INVITE_TITLE, sender: 'auguste', senderLabel: INVITE_SENDER, category: 'romantic',
  big: false, repeatable: false, weight: 0,
  teaser: INVITE_TEXT, invite: INVITE_TEXT,
  steps: [
    { t: 'dress', hint: DRESS_HINT, style: 'romantic', mood: 'gala' },
    { t: 'travel', place: 'fireworks', label: TRAVEL_LABEL },
    WOW,
    { t: 'activity', id: 'necklaceNight', params: { part: 'show' } },
    { t: 'activity', id: 'necklaceNight', params: { part: 'gift' } },
  ],
  reward: {}, replayReward: {},
  memoryTitle: MEMORY_TITLE,
  conclusionNote: 'Ce souvenir restera dans ton album ♡',
  achievements: [ACHIEVEMENT_ID],
};

/** « Revoir l'événement » depuis l'album : même scène, aucune récompense, aucune attribution, aucune question. */
export const NECKLACE_REPLAY: EventDef = {
  id: NECKLACE_REPLAY_ID, title: MEMORY_TITLE, sender: 'auguste', category: 'romantic', big: false, repeatable: false, weight: 0, ephemeral: true,
  teaser: '', invite: '',
  steps: [
    { t: 'travel', place: 'fireworks', label: TRAVEL_LABEL },
    { t: 'activity', id: 'necklaceNight', params: { part: 'show', replay: true } },
    { t: 'activity', id: 'necklaceNight', params: { part: 'gift', replay: true } },
  ],
  reward: {}, memoryTitle: MEMORY_TITLE,
};

/** Prévisualisation développeur (`?debug`) : toute la scène, rien n'est attribué ni sauvegardé. */
export const NECKLACE_PREVIEW: EventDef = {
  id: 'n-eclat-preview', title: INVITE_TITLE, sender: 'auguste', category: 'romantic', big: false, repeatable: false, weight: 0, ephemeral: true,
  teaser: '', invite: '',
  steps: [
    { t: 'travel', place: 'fireworks', label: TRAVEL_LABEL },
    WOW,
    { t: 'activity', id: 'necklaceNight', params: { part: 'show', preview: true } },
    { t: 'activity', id: 'necklaceNight', params: { part: 'gift', preview: true } },
  ],
  reward: {}, memoryTitle: MEMORY_TITLE,
};
