import { describe, it, expect } from 'vitest';
import { defaultSnap, sanitizeSnap, addSnapPhoto, publishStory, addPending, expirePending, closeSnapOffer, closeClipsOffer, snapBadge, clipsBadge, camForMoment, genReactions, visibleReactions, makeSticker, sanitizeSticker, removeSnapPhoto, MAX_PHOTOS, MAX_STORIES, MAX_PENDING, MAX_STICKERS, PENDING_TTL, SNAP_PLACES, TEXT_STICKERS, SHAPE_STICKERS, type SnapState } from '../src/apps/snap/model';
import { POSES, FRAMES, FILTERS } from '../src/events/photo/data';
import { defaultFun, sanitizeFun } from '../src/save/fun';
import { defaultClips } from '../src/apps/clips/model';
import { mentionsChild } from '../src/apps/util';

const T0 = 1_780_000_000_000;
const withPhotos = (n: number): SnapState => { const s = defaultSnap(); for (let i = 0; i < n; i++) addSnapPhoto(s, { id: `ph${i}`, at: T0 + i, stickers: [], cat: false, cap: '' }); return s; };

describe('Snap : photos et autocollants', () => {
  it('élagage à 40 photos et liste des identifiants retirés', () => {
    const s = withPhotos(MAX_PHOTOS);
    const out = addSnapPhoto(s, { id: 'new', at: T0, stickers: [], cat: false, cap: '' });
    expect(out).toEqual(['ph0']);
    expect(s.photos.length).toBe(MAX_PHOTOS);
    expect(s.shots).toBe(MAX_PHOTOS + 1);
  });
  it('autocollants : valeurs bornées, types connus, texte nettoyé, maximum 14', () => {
    expect(sanitizeSticker({ k: 'inconnu' })).toBeNull();
    const a = sanitizeSticker({ k: 'heart', x: 9, y: -3, s: 99, r: 50, a: 12 })!;
    expect(a.x).toBe(1); expect(a.y).toBe(0); expect(a.s).toBe(3); expect(a.a).toBe(3); expect(Math.abs(a.r)).toBeLessThanOrEqual(3.2);
    expect(sanitizeSticker({ k: 'text', t: '   ' })).toBeNull();
    expect(sanitizeSticker({ k: 'text', t: '<b>Coucou ♡</b> et beaucoup trop de texte ici' })!.t!.length).toBeLessThanOrEqual(18);
    expect(sanitizeSticker({ k: 'text', t: 'ma petite fille' })).toBeNull();
    const s = defaultSnap();
    addSnapPhoto(s, { id: 'a', at: 1, cap: '', cat: false, stickers: Array.from({ length: 30 }, () => makeSticker('star')) });
    expect(s.photos[0].stickers.length).toBe(MAX_STICKERS);
    for (const t of TEXT_STICKERS) expect(mentionsChild(t)).toBe(false);
    expect(SHAPE_STICKERS.length).toBeGreaterThanOrEqual(8);
  });
});

describe('Snap : stories', () => {
  it('1 à 5 images existantes, jamais plus, légende nettoyée', () => {
    const s = withPhotos(8);
    expect(publishStory(s, [], 'x', T0)).toBeNull();
    expect(publishStory(s, ['nope'], 'x', T0)).toBeNull();
    const st = publishStory(s, ['ph0', 'ph1', 'ph2', 'ph3', 'ph4', 'ph5', 'ph6'], '  <i>Un   beau soir</i> ', T0)!;
    expect(st.frames.length).toBe(5);
    expect(st.caption).toBe('iUn beau soir/i');
    expect(s.published).toBe(1);
  });
  it('élagage à 60 stories', () => {
    const s = withPhotos(2);
    for (let i = 0; i < MAX_STORIES + 5; i++) publishStory(s, ['ph0'], `s${i}`, T0 + i);
    expect(s.stories.length).toBe(MAX_STORIES);
    expect(s.stories[s.stories.length - 1].caption).toBe(`s${MAX_STORIES + 4}`);
  });
  it('réactions fictives : déterministes, positives, apparaissent progressivement', () => {
    const a = genReactions('st1'), b = genReactions('st1');
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(3);
    for (const r of a) { expect(r.txt.length).toBeGreaterThan(3); expect(mentionsChild(r.txt)).toBe(false); }
    const s = withPhotos(1);
    const st = publishStory(s, ['ph0'], 'x', T0)!;
    expect(visibleReactions(st, T0).length).toBe(0);
    expect(visibleReactions(st, T0 + 60_000).length).toBe(st.reactions.length);
    expect(visibleReactions(st, T0 + 5000).length).toBeLessThanOrEqual(st.reactions.length);
  });
  it('supprimer une photo retire ses images de story (et les stories vides)', () => {
    const s = withPhotos(2);
    publishStory(s, ['ph0'], 'a', T0); publishStory(s, ['ph0', 'ph1'], 'b', T0 + 1);
    removeSnapPhoto(s, 'ph0');
    expect(s.stories.length).toBe(1);
    expect(s.stories[0].frames.map((f) => f.photo)).toEqual(['ph1']);
  });
});

describe('Snap : moments proposés (stories automatiques)', () => {
  it('doublon récent ignoré, bornes, expiration, badges', () => {
    const s = defaultSnap();
    const p = addPending(s, { kind: 'restaurant', title: 'Dîner' }, T0)!;
    expect(p.snap).toBe(true); expect(p.clips).toBe(false);
    expect(addPending(s, { kind: 'restaurant', title: 'Dîner' }, T0 + 5000)).toBeNull();
    expect(addPending(s, { kind: 'restaurant', title: 'Dîner' }, T0 + 25_000)).not.toBeNull();
    const c = addPending(s, { kind: 'runway', title: 'Défilé' }, T0, true)!;
    expect(snapBadge(s)).toBe(3); expect(clipsBadge(s)).toBe(1);
    closeSnapOffer(s, c.id);
    expect(snapBadge(s)).toBe(2); expect(clipsBadge(s)).toBe(1);
    closeClipsOffer(s, c.id);
    expect(s.pending.some((x) => x.id === c.id)).toBe(false);
    for (let i = 0; i < 30; i++) addPending(s, { kind: 'garden', title: 'Jardin' }, T0 + 100_000 * (i + 1));
    expect(s.pending.length).toBeLessThanOrEqual(MAX_PENDING);
    expirePending(s, T0 + 100_000 * 40 + PENDING_TTL);
    expect(s.pending.length).toBe(0);
  });
  it('jamais d’enfant dans un moment', () => {
    const s = defaultSnap();
    expect(addPending(s, { kind: 'cat', title: 'Avec ma petite fille' }, T0)).toBeNull();
    expect(addPending(s, { kind: 'cat', title: 'Le chat', caption: 'un des enfants' }, T0)).toBeNull();
    expect(addPending(s, { kind: 'cat', title: 'Le chat', data: { place: 'home', kid1: 'x', furniture: 'sofa' } as never }, T0)!.data).toEqual({ place: 'home', furniture: 'sofa' });
  });
  it('réglages d’appareil par moment : décor, pose, cadre, filtre valides ; chat seulement s’il est adopté', () => {
    for (const k of ['shooting', 'runway', 'scene', 'concert', 'restaurant', 'fireworks', 'castle', 'outfit', 'garden', 'chocolate', 'cat', 'casino', 'necklace', 'inconnu']) {
      const c = camForMoment({ kind: k, title: 'T' }, true);
      expect(SNAP_PLACES as readonly string[]).toContain(c.place);
      expect(c.pose).toBeGreaterThanOrEqual(0); expect(c.pose).toBeLessThan(POSES.length);
      expect(FRAMES.some((f) => f.id === c.frame)).toBe(true); expect(FILTERS.some((f) => f.id === c.filter)).toBe(true);
    }
    expect(camForMoment({ kind: 'cat', title: 'x' }, true).cat).toBe(true);
    expect(camForMoment({ kind: 'cat', title: 'x' }, false).cat).toBe(false);
  });
});

describe('Snap : sauvegarde', () => {
  it('sanitisation tolérante', () => {
    for (const raw of [null, 3, 'a', [], { photos: 'x', stories: [1, null, { id: 'z' }], pending: {}, cam: 7, storyDraft: { photos: [1, 2] } }]) {
      const s = sanitizeSnap(raw);
      expect(s.v).toBe(1); expect(s.photos).toEqual([]); expect(s.stories).toEqual([]); expect(s.storyDraft).toBeNull();
    }
  });
  it('aller-retour via fun.apps.snap / fun.apps.clips (sanitizeFun) conserve brouillon, photos et stories', () => {
    const s = withPhotos(3);
    publishStory(s, ['ph0', 'ph2'], 'Un soir', T0);
    addPending(s, { kind: 'castle', title: 'Château' }, T0);
    s.cam = { place: 'garden', pose: 3, aug: false, cat: false, frame: 'or', filter: 'rose', title: 'Brouillon', stickers: [makeSticker('heart'), makeSticker('text', 'Coucou ♡')] };
    s.storyDraft = { photos: ['ph1'], caption: 'à finir' };
    const f = defaultFun();
    f.apps.snap = JSON.parse(JSON.stringify(s)); f.apps.clips = JSON.parse(JSON.stringify(defaultClips(T0)));
    const back = sanitizeFun(JSON.parse(JSON.stringify(f)));
    const r = sanitizeSnap(back.apps.snap);
    expect(r.photos.length).toBe(3); expect(r.stories[0].frames.length).toBe(2);
    expect(r.cam?.title).toBe('Brouillon'); expect(r.cam?.stickers.length).toBe(2); expect(r.storyDraft?.photos).toEqual(['ph1']);
    expect(r.pending.length).toBe(1);
    expect(sanitizeSnap(JSON.parse(JSON.stringify(r)))).toEqual(r);
  });
  it('taille maximale bien sous 400 Ko', () => {
    const s = defaultSnap();
    for (let i = 0; i < MAX_PHOTOS; i++) addSnapPhoto(s, { id: `ph${i}`, at: T0 + i, stickers: Array.from({ length: MAX_STICKERS }, () => makeSticker('text', 'Rooftop vibes')), cat: true, cap: 'légende de la photo' });
    for (let i = 0; i < MAX_STORIES; i++) publishStory(s, ['ph0', 'ph1', 'ph2', 'ph3', 'ph4'], 'Une légende de story assez longue pour mesurer', T0 + i);
    expect(JSON.stringify(sanitizeSnap(JSON.parse(JSON.stringify(s)))).length).toBeLessThan(300_000);
  });
});
