import { describe, it, expect } from 'vitest';
import { shareInviteKind } from '../src/core/statsLogic';
import { isNewsDue } from '../../supabase/functions/radia-push/logic';
import { NEWS_PROGRESS } from '../../supabase/functions/radia-push/messages';

describe('quelle invitation proposer', () => {
  it('nouvelle joueuse : une seule demande pour tout', () => { expect(shareInviteKind({ state: 'none' })).toBe('full'); });
  it('joueuse qui avait accepté le temps de jeu : une invitation « progression » seulement', () => {
    expect(shareInviteKind({ state: 'on', asked: true })).toBe('progress');
    expect(shareInviteKind({ state: 'on', asked: true, prog: 'none' })).toBe('progress');
  });
  it('jamais de répétition : refus, accord, ou refus ancien du temps de jeu', () => {
    expect(shareInviteKind({ state: 'on', asked: true, prog: 'off' })).toBeNull();
    expect(shareInviteKind({ state: 'on', asked: true, progAsked: true })).toBeNull();
    expect(shareInviteKind({ state: 'on', asked: true, prog: 'on' })).toBeNull();
    expect(shareInviteKind({ state: 'none', asked: true })).toBeNull();   // elle avait refusé le temps de jeu
    expect(shareInviteKind({ state: 'off', asked: true })).toBeNull();    // elle l'avait arrêté
    expect(shareInviteKind({ state: 'none', progAsked: true })).toBeNull();
  });
});

describe('notification unique « nouveauté »', () => {
  const sub = (o: object = {}) => ({ tz: 'Europe/Paris', send_hour: 9, enabled: true, last_sent_day: null, deck: [], last_idx: -1, news_sent: false, ...o });
  const at = (h: number) => Date.UTC(2026, 10, 12, h - 1, 0); // heure de Paris en hiver (UTC+1)
  it('une seule fois, jamais la nuit, seulement si les notifications sont actives', () => {
    expect(isNewsDue(sub(), at(10))).toBe(true);
    expect(isNewsDue(sub(), at(3))).toBe(false);
    expect(isNewsDue(sub(), at(22))).toBe(false);
    expect(isNewsDue(sub({ news_sent: true }), at(10))).toBe(false);
    expect(isNewsDue(sub({ enabled: false }), at(10))).toBe(false);
  });
  it('texte exact et ouverture de l\'invitation', () => {
    expect(NEWS_PROGRESS.title).toBe('RADIA ♡');
    expect(NEWS_PROGRESS.body).toBe('Une nouveauté est disponible ! Tu peux maintenant partager ta progression de jeu si tu le souhaites. Découvre-la dans tes réglages.');
    expect(NEWS_PROGRESS.url).toContain('partage=1');
  });
});
