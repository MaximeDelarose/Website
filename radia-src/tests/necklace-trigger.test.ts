import { describe, it, expect } from 'vitest';
import {
  addActive, addRemind, applyGrant, canGrant, countLaunch, defaultNecklace, inviteDue, markInvited, markSceneDone, sanitizeNecklace,
} from '../src/events/necklace/state';
import { ACTIVE_DELAY_MS, LAUNCH_DEBOUNCE_MS, LAUNCH_TARGET, REMIND_EVERY_MS, INVITE_TEXT, SPOILER_WORDS } from '../src/events/necklace/data';
import { defaultFun, sanitizeFun } from '../src/save/fun';
import { NECKLACE_EVENT, NECKLACE_PREVIEW, NECKLACE_REPLAY } from '../src/events/necklace/event';
import { EVENTS, eventById } from '../src/events/data';

const MIN = 60_000;
/** N ouvertures espacées de plus de 30 min. */
const launches = (n: ReturnType<typeof defaultNecklace>, k: number, t0 = 1_000_000): number => { let t = t0; for (let i = 0; i < k; i++) { countLaunch(n, t); t += LAUNCH_DEBOUNCE_MS + MIN; } return t; };

describe('compteur d\'ouvertures', () => {
  it('démarre à 0 (non rétroactif) et la première ouverture compte pour 1', () => {
    const n = defaultNecklace();
    expect(n.launches).toBe(0);
    expect(countLaunch(n, 5_000_000)).toBe(true);
    expect(n.launches).toBe(1);
    expect(n.lastLaunchAt).toBe(5_000_000);
  });
  it('les rechargements rapides (< 30 min) ne gonflent pas le compteur', () => {
    const n = defaultNecklace();
    countLaunch(n, 1_000_000);
    for (const dt of [1000, 60_000, 10 * MIN, 29 * MIN, LAUNCH_DEBOUNCE_MS - 1]) expect(countLaunch(n, 1_000_000 + dt)).toBe(false);
    expect(n.launches).toBe(1);
    expect(countLaunch(n, 1_000_000 + LAUNCH_DEBOUNCE_MS)).toBe(true);
    expect(n.launches).toBe(2);
  });
  it('la tranche de 30 minutes part de la dernière ouverture COMPTÉE (les rechargements ne la repoussent pas)', () => {
    const n = defaultNecklace();
    countLaunch(n, 0 + 1);
    countLaunch(n, 20 * MIN); // ignorée
    expect(n.lastLaunchAt).toBe(1);
    expect(countLaunch(n, 31 * MIN)).toBe(true);
  });
  it('l\'horloge reculée ne bloque pas le compteur : on se recale sans compter', () => {
    const n = defaultNecklace();
    countLaunch(n, 10_000_000);
    expect(countLaunch(n, 5_000_000)).toBe(false);
    expect(n.lastLaunchAt).toBe(5_000_000);
    expect(countLaunch(n, 5_000_000 + LAUNCH_DEBOUNCE_MS)).toBe(true);
  });
  it('la 7ᵉ ouverture comptée arme le minuteur ; la 6ᵉ non', () => {
    const n = defaultNecklace();
    launches(n, LAUNCH_TARGET - 1);
    expect(n.launches).toBe(6);
    expect(n.armed).toBe(false);
    launches(n, 1, 900_000_000);
    expect(n.launches).toBe(7);
    expect(n.armed).toBe(true);
    expect(n.activeMs).toBe(0);
  });
  it('une fois armé, plus rien n\'est compté', () => {
    const n = defaultNecklace();
    launches(n, 7);
    const before = n.launches;
    launches(n, 3, 9_000_000_000);
    expect(n.launches).toBe(before);
  });
});

describe('minuteur de jeu actif (5 minutes)', () => {
  const armed = () => { const n = defaultNecklace(); launches(n, 7); return n; };
  it('ne tourne pas avant la 7ᵉ ouverture', () => {
    const n = defaultNecklace();
    launches(n, 6);
    expect(addActive(n, 10 * MIN, true)).toBe(false);
    expect(n.activeMs).toBe(0);
  });
  it('seul le temps ACTIF compte (onglet caché / inactif : rien)', () => {
    const n = armed();
    for (let i = 0; i < 200; i++) addActive(n, 4000, false);
    expect(n.activeMs).toBe(0);
    expect(inviteDue(n)).toBe(false);
  });
  it('l\'invitation est due après 5 minutes actives, pas avant', () => {
    const n = armed();
    let due = false;
    for (let t = 0; t < ACTIVE_DELAY_MS - 4000; t += 4000) due = addActive(n, 4000, true);
    expect(due).toBe(false);
    expect(n.activeMs).toBeLessThan(ACTIVE_DELAY_MS);
    due = addActive(n, 8000, true);
    expect(due).toBe(true);
  });
  it('reprise après rechargement : la progression du minuteur est conservée', () => {
    const n = armed();
    addActive(n, 3 * MIN, true);
    const reloaded = sanitizeNecklace(JSON.parse(JSON.stringify(n)));
    expect(reloaded.armed).toBe(true);
    expect(reloaded.activeMs).toBe(3 * MIN);
    expect(inviteDue(reloaded)).toBe(false);
    addActive(reloaded, 2 * MIN, true);
    expect(inviteDue(reloaded)).toBe(true);
  });
  it('une seule invitation automatique', () => {
    const n = armed();
    addActive(n, 6 * MIN, true);
    expect(inviteDue(n)).toBe(true);
    markInvited(n, 'run1', 123);
    expect(n.invited).toBe(true);
    expect(inviteDue(n)).toBe(false);
    expect(addActive(n, 60 * MIN, true)).toBe(false);
  });
});

describe('« Plus tard » : conservée à vie, rappelée discrètement', () => {
  it('le rappel revient après un long temps de jeu actif, jamais avant, jamais une fois la scène terminée', () => {
    const n = defaultNecklace(); launches(n, 7); addActive(n, 6 * MIN, true); markInvited(n, 'r', 1);
    expect(addRemind(n, REMIND_EVERY_MS - 1, true)).toBe(false);
    expect(addRemind(n, 5, true)).toBe(true);
    n.remindMs = 0;
    expect(addRemind(n, 10 * MIN, false)).toBe(false); // inactif : rien
    markSceneDone(n);
    expect(addRemind(n, REMIND_EVERY_MS * 3, true)).toBe(false);
  });
  it('l\'état « invité » survit à la sauvegarde (jamais perdue même si Safari est fermé)', () => {
    const n = defaultNecklace(); launches(n, 7); addActive(n, 6 * MIN, true); markInvited(n, 'abc', 99);
    const back = sanitizeNecklace(JSON.parse(JSON.stringify(n)));
    expect(back.invited).toBe(true);
    expect(back.inviteRunId).toBe('abc');
    expect(back.sceneDone).toBe(false);
  });
});

describe('invitation : contenu exact, aucun spoiler', () => {
  it('message exact, expéditeur « A ♡ », étapes dress → travel → scene → activités', () => {
    expect(INVITE_TEXT).toBe('J’ai quelque chose à te montrer ce soir. Mets une jolie tenue, je t’emmène voir un spectacle que j’ai préparé rien que pour toi.');
    expect(NECKLACE_EVENT.invite).toBe(INVITE_TEXT);
    expect(NECKLACE_EVENT.teaser).toBe(INVITE_TEXT);
    expect(NECKLACE_EVENT.senderLabel).toBe('A ♡');
    expect(NECKLACE_EVENT.steps.map((s) => s.t)).toEqual(['dress', 'travel', 'scene', 'activity', 'activity']);
    expect(NECKLACE_EVENT.steps[0]).toMatchObject({ t: 'dress', mood: 'gala' });
    expect(NECKLACE_EVENT.steps[1]).toMatchObject({ t: 'travel', place: 'fireworks' });
  });
  it('aucune fuite (collier, bijou, diamant, écrin, cadeau…) dans titre, notification, invitation ni aide au dressing', () => {
    const shown = [NECKLACE_EVENT.title, NECKLACE_EVENT.teaser, NECKLACE_EVENT.invite, NECKLACE_EVENT.senderLabel ?? '', ...NECKLACE_EVENT.steps.flatMap((s) => (s.t === 'dress' ? [s.hint] : s.t === 'travel' ? [s.label] : s.t === 'scene' ? s.lines.map((l) => l.text) : []))];
    for (const text of shown) for (const w of SPOILER_WORDS) expect(text.toLowerCase(), `« ${text} » contient « ${w} »`).not.toContain(w);
  });
  it('dialogues d\'arrivée exacts', () => {
    const scene = NECKLACE_EVENT.steps[2];
    expect(scene.t === 'scene' && scene.lines.map((l) => l.text)).toEqual(['Ah ouais… t’es vraiment magnifique comme ça.', 'Allez, viens. J’ai quelque chose à te montrer.']);
    expect(scene.t === 'scene' && scene.lines.every((l) => l.who === 'auguste')).toBe(true);
  });
  it('enregistrée dans les événements, jamais tirée au hasard, aucune récompense chiffrée', () => {
    expect(eventById(NECKLACE_EVENT.id)).toBe(NECKLACE_EVENT);
    expect(NECKLACE_EVENT.big).toBe(false);
    expect(NECKLACE_EVENT.weight).toBe(0);
    expect(NECKLACE_EVENT.repeatable).toBe(false);
    expect(NECKLACE_EVENT.reward).toEqual({});
    expect(NECKLACE_EVENT.ephemeral).toBeFalsy();
  });
  it('replay et prévisualisation : scènes éphémères (ni récompense, ni historique), hors liste des événements', () => {
    for (const d of [NECKLACE_REPLAY, NECKLACE_PREVIEW]) { expect(d.ephemeral).toBe(true); expect(d.reward).toEqual({}); expect(EVENTS.includes(d)).toBe(false); }
    const params = (d: typeof NECKLACE_REPLAY) => d.steps.filter((s) => s.t === 'activity').map((s) => (s.t === 'activity' ? s.params : {}));
    expect(params(NECKLACE_REPLAY).every((p) => p?.replay === true)).toBe(true);
    expect(params(NECKLACE_PREVIEW).every((p) => p?.preview === true)).toBe(true);
  });
});

describe('attribution : une seule fois, uniquement après la scène', () => {
  it('refusée tant que la scène n\'est pas terminée', () => {
    const n = defaultNecklace();
    expect(canGrant(n)).toBe(false);
    expect(applyGrant(n, 1)).toBe(false);
    expect(n.owned).toBe(false);
  });
  it('acceptée une seule fois après la scène (anti-doublon strict)', () => {
    const n = defaultNecklace();
    markSceneDone(n);
    expect(canGrant(n)).toBe(true);
    expect(applyGrant(n, 5)).toBe(true);
    expect(n.owned).toBe(true);
    expect(n.grantedAt).toBe(5);
    expect(n.memory).toBe(true);
    expect(applyGrant(n, 9)).toBe(false);
    expect(n.grantedAt).toBe(5);
  });
});

describe('sauvegarde tolérante', () => {
  it('valeurs par défaut sur n\'importe quelle donnée invalide', () => {
    for (const bad of [null, undefined, 5, 'x', [], { launches: 'a', activeMs: NaN, stage: 99, armed: 'oui' }]) {
      const n = sanitizeNecklace(bad);
      expect(n.launches).toBe(0);
      expect(Number.isFinite(n.activeMs)).toBe(true);
      expect(n.stage).toBeLessThanOrEqual(4);
      expect(n.armed).toBe(false);
    }
  });
  it('aller-retour complet (lancements, minuteur, invitation, scène, collier, choix, souvenir, photo, succès)', () => {
    const n = defaultNecklace();
    Object.assign(n, { launches: 7, lastLaunchAt: 123456, armed: true, armedAt: 1, activeMs: 4 * MIN, invited: true, invitedAt: 2, inviteRunId: 'r1', remindMs: 5, started: true, stage: 3, chose: false, replays: 2 });
    const back = sanitizeNecklace(JSON.parse(JSON.stringify(n)));
    expect(back).toEqual(n);
    markSceneDone(n); applyGrant(n, 77); n.chose = true; n.photo = true; n.achievement = true;
    expect(sanitizeNecklace(JSON.parse(JSON.stringify(n)))).toEqual(n);
  });
  it('incohérence réparée : un collier obtenu implique une scène terminée', () => {
    const n = sanitizeNecklace({ owned: true });
    expect(n.sceneDone).toBe(true); expect(n.invited).toBe(true); expect(n.stage).toBe(4);
  });
  it('une sauvegarde sans `necklace` (ancienne) reçoit les valeurs par défaut, sans toucher au reste', () => {
    const f = sanitizeFun({ ...defaultFun(), necklace: undefined, notifs: ['a'] });
    expect(f.necklace).toEqual(defaultNecklace());
    expect(f.notifs).toEqual(['a']);
    const f2 = sanitizeFun(JSON.parse(JSON.stringify({ ...defaultFun(), necklace: { ...defaultNecklace(), launches: 4 } })));
    expect(f2.necklace.launches).toBe(4);
  });
  it('la tenue de la soirée est nettoyée', () => {
    const n = sanitizeNecklace({ look: { hair: 'hair-bun', top: 'pas-un-id', dress: 'dr-romantic-pink', acc: ['ac-pearls', 'inconnu'] } });
    expect(n.look?.dress).toBe('dr-romantic-pink');
    expect(n.look?.top).toBeNull();
    expect(n.look?.acc).toEqual(['ac-pearls']);
  });
});
