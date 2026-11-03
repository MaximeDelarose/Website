import { describe, it, expect } from 'vitest';
import { EVENT_CONFIG, canOfferBig, canSendSmall, claimOnce, eligible, offerInvite, pickEvent, pendingInvites, pushMessage, recordDone, settleStale, setInviteState, type Progress } from '../src/events/manager';
import { defaultEvents, sanitizeEvents } from '../src/events/state';
import { EVENTS, eventById, SMALL_MESSAGES } from '../src/events/data';
import { rewardFor } from '../src/events/rewardRules';
import { ACTIVITY_IDS, PLACE_IDS } from '../src/events/types';
import { defaultSave, migrate, sanitize, SAVE_VERSION } from '../src/save/schema';
import { mulberry32 } from '../src/game/world/careerGames/rng';

const PR: Progress = { chapter: 2, chessUnlocked: true, careerCurrent: null, careersTried: [] };
const MIN = 60_000;

describe('données des événements', () => {
  it('identifiants uniques, activités et lieux valides, étapes cohérentes', () => {
    const ids = EVENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of EVENTS) {
      expect(e.steps.length).toBeGreaterThan(1);
      for (const s of e.steps) {
        if (s.t === 'activity') expect((ACTIVITY_IDS as readonly string[]).includes(s.id)).toBe(true);
        if (s.t === 'travel' || s.t === 'photo') expect((PLACE_IDS as readonly string[]).includes(s.place)).toBe(true);
      }
      expect(e.invite.length).toBeGreaterThan(10);
      expect(e.reward).toBeTruthy();
    }
    expect(EVENTS.length).toBeGreaterThanOrEqual(20);
  });
  it('aucun prénom d\'enfant en clair dans les textes (locuteurs neutres seulement)', () => {
    const all = JSON.stringify(EVENTS) + JSON.stringify(SMALL_MESSAGES);
    // vérification par empreintes : aucun mot du texte ne doit correspondre à un prénom protégé
    const fnv = (w: string): number => { let x = 2166136261; for (let i = 0; i < w.length; i++) { x ^= w.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; } return x >>> 0; };
    const banned = new Set<number>([3946716181, 2134510645, 4286642214, 2941064473]);
    const words = all.toLowerCase().match(/[a-zà-ÿ]+/g) ?? [];
    for (const w of new Set(words)) expect(banned.has(fnv(w))).toBe(false);
  });
  it('le restaurant : invitation exacte, menu choisi AVANT la devinette', () => {
    const r = eventById('r-restaurant')!;
    expect(r.invite).toContain('deviner ce que je vais commander');
    const acts = r.steps.filter((s) => s.t === 'activity').map((s) => (s as { id: string }).id);
    expect(acts.indexOf('menuPick')).toBeGreaterThanOrEqual(0);
    expect(acts.indexOf('menuPick')).toBeLessThan(acts.indexOf('guessMenu'));
    expect(r.memoryTitle).toBe('Le même menu ♡');
  });
  it('la journée dorée enchaîne shopping, restaurant et palace', () => {
    const g = eventById('g-day')!;
    expect(g.golden).toBe(true);
    const places = g.steps.filter((s) => s.t === 'travel').map((s) => (s as { place: string }).place);
    expect(places).toEqual(['boutique', 'restaurant', 'palace']);
    expect(g.repeatable).toBe(false);
  });
});

describe('fréquence des invitations', () => {
  it('pas d\'invitation avant quelques minutes de jeu actif, puis oui', () => {
    const st = defaultEvents();
    st.playMs = EVENT_CONFIG.firstAfterMs - 1000;
    expect(canOfferBig(st)).toBe(false);
    st.playMs = EVENT_CONFIG.firstAfterMs + 1000;
    expect(canOfferBig(st)).toBe(true);
  });
  it('au plus deux grandes invitations par 30 minutes, avec un écart minimal', () => {
    const st = defaultEvents();
    st.playMs = 4 * MIN;
    const d1 = EVENTS[0];
    offerInvite(st, d1, 0, 'a1');
    setInviteState(st, 'a1', 'done');
    expect(canOfferBig(st)).toBe(false); // écart minimal
    st.playMs += EVENT_CONFIG.bigGapMs + 1;
    expect(canOfferBig(st)).toBe(true);
    offerInvite(st, EVENTS[1], 0, 'a2');
    setInviteState(st, 'a2', 'done');
    st.playMs += EVENT_CONFIG.bigGapMs + 1;
    expect(st.playMs - st.bigLog[0]).toBeLessThan(EVENT_CONFIG.bigWindowMs);
    expect(canOfferBig(st)).toBe(false); // déjà 2 dans la fenêtre de 30 min
    st.playMs += EVENT_CONFIG.bigWindowMs;
    expect(canOfferBig(st)).toBe(true);
  });
  it('jamais deux notifications simultanées ni une activité en cours', () => {
    const st = defaultEvents();
    st.playMs = 60 * MIN;
    offerInvite(st, EVENTS[0], 0, 'a1');
    expect(canOfferBig(st)).toBe(false); // une « nouvelle » attend déjà
    setInviteState(st, 'a1', 'later');
    st.playMs += 20 * MIN;
    expect(canOfferBig(st)).toBe(true);
    st.current = { runId: 'x', eventId: 'r-restaurant', step: 1, data: {}, origin: { mode: 'merge' }, startedAt: 0 };
    expect(canOfferBig(st)).toBe(false);
  });
  it('au plus 4 invitations en attente', () => {
    const st = defaultEvents();
    st.playMs = 300 * MIN;
    for (let i = 0; i < EVENT_CONFIG.maxPending; i++) st.inbox.push({ runId: `p${i}`, eventId: `e${i}`, at: 0, state: 'later' });
    expect(pendingInvites(st).length).toBe(4);
    expect(canOfferBig(st)).toBe(false);
  });
  it('une notification ignorée passe en « plus tard » sans rien perdre', () => {
    const st = defaultEvents();
    st.playMs = 10 * MIN;
    offerInvite(st, EVENTS[0], 0, 'a1');
    st.playMs += EVENT_CONFIG.staleNewMs + 1;
    settleStale(st);
    expect(st.inbox[0].state).toBe('later');
    expect(pendingInvites(st).length).toBe(1);
  });
  it('petits messages espacés', () => {
    const st = defaultEvents();
    st.playMs = 5 * MIN;
    expect(canSendSmall(st)).toBe(true);
    pushMessage(st, 'auguste', 'coucou', 0);
    expect(canSendSmall(st)).toBe(false);
    expect(st.msgs[0].read).toBe(false);
  });
});

describe('éligibilité et tirage', () => {
  it('pas de répétition immédiate ni d\'événement non rejouable déjà terminé', () => {
    const st = defaultEvents();
    st.playMs = 200 * MIN;
    st.lastEventId = 'r-restaurant';
    expect(eligible(eventById('r-restaurant')!, st, PR)).toBe(false);
    st.lastEventId = '';
    recordDone(st, 'g-day', 100, 0);
    expect(eligible(eventById('g-day')!, st, PR)).toBe(false);
  });
  it('les événements rejouables attendent avant de revenir', () => {
    const st = defaultEvents();
    st.playMs = 100 * MIN;
    recordDone(st, 'r-restaurant', 100, 0);
    expect(eligible(eventById('r-restaurant')!, st, PR)).toBe(false);
    st.playMs += EVENT_CONFIG.repeatGapMs + 1;
    expect(eligible(eventById('r-restaurant')!, st, PR)).toBe(true);
  });
  it('les carrières respectent la progression', () => {
    const st = defaultEvents();
    st.playMs = 200 * MIN;
    const c = eventById('c-concert')!;
    expect(eligible(c, st, PR)).toBe(false);
    expect(eligible(c, st, { ...PR, careerCurrent: 'singer' })).toBe(true);
    expect(eligible(c, st, { ...PR, careersTried: ['singer'] })).toBe(true);
    expect(eligible(eventById('c-shooting')!, st, { ...PR, careerCurrent: 'singer' })).toBe(false);
  });
  it('l\'enveloppe dorée reste rare et conditionnée', () => {
    const st = defaultEvents();
    st.playMs = 10 * MIN;
    expect(eligible(eventById('g-day')!, st, PR)).toBe(false);
    st.playMs = 120 * MIN;
    expect(eligible(eventById('g-day')!, st, PR)).toBe(false); // il faut avoir fait le restaurant
    recordDone(st, 'r-restaurant', 100, 0);
    st.playMs += EVENT_CONFIG.repeatGapMs + 1;
    expect(eligible(eventById('g-day')!, st, PR)).toBe(true);
  });
  it('le tirage pondéré est déterministe avec une graine et ne renvoie que des éligibles', () => {
    const st = defaultEvents();
    st.playMs = 100 * MIN;
    const a = pickEvent(EVENTS, st, PR, mulberry32(7));
    const b = pickEvent(EVENTS, st, PR, mulberry32(7));
    expect(a?.id).toBe(b?.id);
    for (let s = 0; s < 80; s++) { const p = pickEvent(EVENTS, st, PR, mulberry32(s)); expect(p && eligible(p, st, PR)).toBe(true); }
  });
});

describe('récompenses et sauvegarde', () => {
  it('une récompense n\'est versée qu\'une fois par run', () => {
    const st = defaultEvents();
    expect(claimOnce(st, 'run1', 1)).toBe(true);
    expect(claimOnce(st, 'run1', 2)).toBe(false);
    expect(claimOnce(st, 'run2', 3)).toBe(true);
  });
  it('les rejeux rapportent moins que la première fois', () => {
    const d = eventById('r-restaurant')!;
    expect((rewardFor(d, 1).coins ?? 0)).toBeLessThan(rewardFor(d, 0).coins ?? 0);
    for (const e of EVENTS) expect((rewardFor(e, 3).coins ?? 0)).toBeLessThanOrEqual(rewardFor(e, 0).coins ?? 0);
  });
  it('la sauvegarde v3 est migrée en v4 sans rien perdre', () => {
    const old = { ...defaultSave(), v: 3 } as Record<string, unknown>;
    delete old.events;
    (old.economy as { diamonds: number }).diamonds = 77;
    const r = migrate(old);
    expect(r.data.v).toBe(SAVE_VERSION);
    expect(r.data.economy.diamonds).toBe(77);
    expect(r.data.events.inbox).toEqual([]);
    expect(r.data.world.res.coins).toBeGreaterThanOrEqual(0);
  });
  it('l\'état des événements survit à un aller-retour et se nettoie', () => {
    const st = defaultEvents();
    st.playMs = 5000;
    offerInvite(st, EVENTS[0], 0, 'r1');
    st.current = { runId: 'r1', eventId: 'r-restaurant', step: 3, data: { menuPick: { starter: 'a', main: 'b', dessert: 'c' } }, origin: { mode: 'merge' }, startedAt: 1 };
    st.photos.push({ id: 'p1', eventId: 'r-restaurant', place: 'restaurant', title: 'Le même menu ♡', ts: 1, look: sanitize(null).world.wardrobe.look, auguste: true, kids: [], pose: 0, frame: 'rose', filter: 'none' });
    const back = sanitizeEvents(JSON.parse(JSON.stringify(st)));
    expect(back.current?.step).toBe(3);
    expect((back.current?.data.menuPick as { main: string }).main).toBe('b');
    expect(back.photos[0].title).toBe('Le même menu ♡');
    expect(sanitizeEvents({ inbox: 'oups', current: 5, photos: [{}], claimed: { a: 'x' } }).photos.length).toBe(0);
  });
});
